// CE-S1 (ADR-095, 2026-10-05): the Connected EDCS repository.
//
// One small module with two implementations behind one interface, so a register import never adds to
// the whole-store load/save cost:
//   - JSON  (dev/test): the five collections live inside the local JSON store, read/written through
//     store.mjs's withStore/readStore. Every record is filtered by tenant_id + firm_id.
//   - Postgres (production): direct, firm-scoped SQL against the five tables from migration 0050, via
//     the shared pool in ./repositories/shared/db.mjs. A write batch is ONE transaction, and every
//     write transaction first sets the app.current_tenant_id GUC (the 0050 RLS backstop fails closed
//     without it). Batches are sent as a single jsonb array per table, so a 500-row register costs a
//     handful of statements, not one per row.
//
// Every method takes `scope = { tenant_id, firm_id }` first and can only ever see that firm's rows.
// Records are full JSON objects (they carry their own id/tenant_id/firm_id); the Postgres tables keep
// the same object in `record jsonb` plus generated filter columns.

import { isPostgresStore, readStore, withStore } from "./store.mjs";
import { query, setTenantContext, withClient } from "./repositories/shared/db.mjs";

// CE-S3 (ADR-097, migration 0051) adds the two automation tables to the same repository.
export const EDCS_COLLECTIONS = ["edcs_connections", "edcs_transactions", "edcs_transaction_revisions", "edcs_sync_runs", "edcs_sync_events", "automation_rules", "automation_rule_runs", "edcs_number_reservations"];

// The natural key inside (tenant, firm) of each collection.
const naturalKey = {
  edcs_connections: () => "connection",
  edcs_transactions: (record) => record.transaction_id,
  edcs_transaction_revisions: (record) => `${record.transaction_id}#${record.seq}`,
  edcs_sync_runs: (record) => record.id,
  edcs_sync_events: (record) => record.id,
  automation_rules: (record) => record.id,
  // An occurrence's key is rule | transaction | occurrence key (the dedupe key); an evaluation's is its id.
  automation_rule_runs: (record) => record.key ?? record.id,
  // CE-S4: company | type | year | sequence (the unique index in 0052 mirrors it)
  edcs_number_reservations: (record) => record.key ?? record.id
};

// A claimed occurrence that failed may be claimed again, up to this many attempts in total.
const MAX_OCCURRENCE_ATTEMPTS = 3;

const inScope = (scope) => (record) => record?.tenant_id === scope.tenant_id && record?.firm_id === scope.firm_id;

// ---------------- JSON implementation ----------------

async function jsonRead(scope, collection) {
  const store = await readStore();
  return (store[collection] ?? []).filter(inScope(scope));
}

function jsonUpsert(store, scope, collection, record) {
  store[collection] ??= [];
  const key = naturalKey[collection](record);
  const index = store[collection].findIndex((item) => inScope(scope)(item) && naturalKey[collection](item) === key);
  if (index >= 0) store[collection][index] = record;
  else store[collection].push(record);
}

const jsonImpl = {
  read: jsonRead,
  async commit(scope, batch) {
    await withStore((store) => {
      for (const collection of EDCS_COLLECTIONS) for (const record of batch[collection] ?? []) jsonUpsert(store, scope, collection, record);
    });
  },
  async enabledScopes() {
    const store = await readStore();
    const seen = new Map();
    for (const rule of store.automation_rules ?? []) if (rule.enabled) seen.set(`${rule.tenant_id}|${rule.firm_id}`, { tenant_id: rule.tenant_id, firm_id: rule.firm_id });
    return [...seen.values()];
  },
  // CE-S4: take the next free number inside the store lock. `build({ sequence })` returns the record (or null
  // when the year is used up); the highest sequence comes from reservations (any state) and imported rows.
  async reserveNumber(scope, { company_code, document_type, year }, build) {
    return withStore((store) => {
      store.edcs_number_reservations ??= [];
      let highest = 0;
      for (const item of [...store.edcs_number_reservations, ...(store.edcs_transactions ?? [])]) {
        if (inScope(scope)(item) && item.company_code === company_code && item.document_type === document_type && Number(item.year) === Number(year)) highest = Math.max(highest, Number(item.sequence) || 0);
      }
      const record = build({ sequence: highest + 1 });
      if (record) store.edcs_number_reservations.push(record);
      return record;
    });
  },
  // Atomically take an occurrence (the dedupe record). Returns the stored record when this caller won
  // the claim, or null when the occurrence already exists (CLAIMED/CREATED, or ERROR out of attempts).
  async claim(scope, record) {
    return withStore((store) => {
      store.automation_rule_runs ??= [];
      const index = store.automation_rule_runs.findIndex((item) => inScope(scope)(item) && naturalKey.automation_rule_runs(item) === record.key);
      if (index >= 0) {
        const existing = store.automation_rule_runs[index];
        if (existing.status !== "ERROR" || (existing.attempts ?? 1) >= MAX_OCCURRENCE_ATTEMPTS) return null;
        const retry = { ...record, attempts: (existing.attempts ?? 1) + 1 };
        store.automation_rule_runs[index] = retry;
        return retry;
      }
      store.automation_rule_runs.push(record);
      return record;
    });
  }
};

// ---------------- Postgres implementation ----------------

async function pgRead(scope, collection) {
  const { rows } = await query(
    `select record from ${collection} where tenant_id = $1 and firm_id = $2 order by natural_key`,
    [scope.tenant_id, scope.firm_id]
  );
  return rows.map((row) => row.record);
}

const pgImpl = {
  read: pgRead,
  async commit(scope, batch) {
    await withClient(async (client) => {
      await client.query("begin");
      try {
        await setTenantContext(client, scope.tenant_id);
        for (const collection of EDCS_COLLECTIONS) {
          const records = batch[collection] ?? [];
          if (!records.length) continue;
          const payload = records.map((record) => ({ id: record.id, natural_key: naturalKey[collection](record), record }));
          // `id` of an existing row is preserved (the conflict branch only replaces `record`).
          await query(
            `insert into ${collection} (id, natural_key, tenant_id, firm_id, record, created_at, updated_at)
             select (item->>'id')::uuid, item->>'natural_key', $2::uuid, $3::uuid, item->'record', now(), now()
             from jsonb_array_elements($1::jsonb) as item
             on conflict (tenant_id, firm_id, natural_key) do update set record = excluded.record, updated_at = now()`,
            [JSON.stringify(payload), scope.tenant_id, scope.firm_id],
            client
          );
        }
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });
  },
  async enabledScopes() {
    const { rows } = await query(`select distinct tenant_id, firm_id from automation_rules where enabled_c is true`, []);
    return rows.map((row) => ({ tenant_id: row.tenant_id, firm_id: row.firm_id }));
  },
  // CE-S4: per (firm, company, type, year) advisory lock so concurrent reservations queue; the unique index in
  // 0052 is the backstop (a unique violation retries with a fresh read).
  async reserveNumber(scope, { company_code, document_type, year }, build) {
    for (let attempt = 1; attempt <= 8; attempt += 1) {
      try {
        return await withClient(async (client) => {
          await client.query("begin");
          try {
            await setTenantContext(client, scope.tenant_id);
            await query(`select pg_advisory_xact_lock(hashtext($1))`, [`${scope.firm_id}|${company_code}|${document_type}|${year}`], client);
            const { rows } = await query(
              `select greatest(
                 coalesce((select max(sequence_c) from edcs_number_reservations where tenant_id = $1 and firm_id = $2 and company_code_c = $3 and document_type_c = $4 and year_c = $5), 0),
                 coalesce((select max((record->>'sequence')::int) from edcs_transactions where tenant_id = $1 and firm_id = $2 and document_type_c = $4 and record->>'company_code' = $3 and (record->>'year')::int = $5), 0)
               ) as highest`,
              [scope.tenant_id, scope.firm_id, company_code, document_type, Number(year)],
              client
            );
            const record = build({ sequence: Number(rows[0].highest) + 1 });
            if (record) {
              await query(
                `insert into edcs_number_reservations (id, natural_key, tenant_id, firm_id, record, created_at, updated_at)
                 values ($1::uuid, $2, $3::uuid, $4::uuid, $5::jsonb, now(), now())`,
                [record.id, record.key, scope.tenant_id, scope.firm_id, JSON.stringify(record)],
                client
              );
            }
            await client.query("commit");
            return record;
          } catch (error) {
            await client.query("rollback");
            throw error;
          }
        });
      } catch (error) {
        if (error?.code !== "23505" || attempt === 8) throw error;
      }
    }
    return null;
  },
  // Atomic claim in one statement pair: insert-if-absent, else retake an ERROR row that has attempts
  // left (the where clause makes the retake atomic too). Returns the record or null.
  async claim(scope, record) {
    return withClient(async (client) => {
      await client.query("begin");
      try {
        await setTenantContext(client, scope.tenant_id);
        const inserted = await query(
          `insert into automation_rule_runs (id, natural_key, tenant_id, firm_id, record, created_at, updated_at)
           values ($1::uuid, $2, $3::uuid, $4::uuid, $5::jsonb, now(), now())
           on conflict (tenant_id, firm_id, natural_key) do nothing returning id`,
          [record.id, record.key, scope.tenant_id, scope.firm_id, JSON.stringify(record)],
          client
        );
        let result = inserted.rows.length ? record : null;
        if (!result) {
          const retried = await query(
            `update automation_rule_runs set record = jsonb_set($5::jsonb, '{attempts}', to_jsonb(coalesce((record->>'attempts')::int, 1) + 1)), updated_at = now()
             where tenant_id = $1 and firm_id = $2 and natural_key = $3 and record->>'status' = 'ERROR' and coalesce((record->>'attempts')::int, 1) < $4
             returning record`,
            [scope.tenant_id, scope.firm_id, record.key, MAX_OCCURRENCE_ATTEMPTS, JSON.stringify(record)],
            client
          );
          result = retried.rows[0]?.record ?? null;
        }
        await client.query("commit");
        return result;
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });
  }
};

const impl = () => (isPostgresStore() ? pgImpl : jsonImpl);

// ---------------- the interface ----------------

export const edcsRepository = {
  async getConnection(scope) {
    return (await impl().read(scope, "edcs_connections"))[0] ?? null;
  },
  async listTransactions(scope) {
    return impl().read(scope, "edcs_transactions");
  },
  async getTransaction(scope, transactionId) {
    return (await impl().read(scope, "edcs_transactions")).find((record) => record.transaction_id === transactionId) ?? null;
  },
  async listRevisions(scope, transactionId) {
    return (await impl().read(scope, "edcs_transaction_revisions"))
      .filter((record) => !transactionId || record.transaction_id === transactionId)
      .sort((a, b) => a.seq - b.seq);
  },
  async listRuns(scope) {
    return (await impl().read(scope, "edcs_sync_runs")).sort((a, b) => b.run_number - a.run_number);
  },
  async getRun(scope, runId) {
    return (await impl().read(scope, "edcs_sync_runs")).find((record) => record.id === runId) ?? null;
  },
  async listEvents(scope, { run_id = null, transaction_id = null } = {}) {
    return (await impl().read(scope, "edcs_sync_events"))
      .filter((record) => (!run_id || record.run_id === run_id) && (!transaction_id || record.transaction_id === transaction_id))
      .sort((a, b) => (a.run_number - b.run_number) || ((a.row_number ?? 0) - (b.row_number ?? 0)) || String(a.at).localeCompare(String(b.at)));
  },
  // CE-S3: automation rules, their occurrences (dedupe) and evaluations.
  async listRules(scope) {
    return (await impl().read(scope, "automation_rules")).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  },
  async getRule(scope, ruleId) {
    return (await impl().read(scope, "automation_rules")).find((record) => record.id === ruleId) ?? null;
  },
  async listRuleRuns(scope, { kind = null, rule_id = null, transaction_id = null } = {}) {
    return (await impl().read(scope, "automation_rule_runs"))
      .filter((record) => (!kind || record.kind === kind) && (!rule_id || record.rule_id === rule_id) && (!transaction_id || record.transaction_id === transaction_id))
      .sort((a, b) => String(b.at ?? b.created_at).localeCompare(String(a.at ?? a.created_at)));
  },
  // Every firm that has at least one enabled rule (the scheduled tick visits each on its own).
  async listEnabledRuleScopes() {
    return impl().enabledScopes();
  },
  async claimOccurrence(scope, record) {
    return impl().claim(scope, record);
  },
  // CE-S4: the Number Desk's reservations and the atomic "next number".
  async listReservations(scope) {
    return (await impl().read(scope, "edcs_number_reservations")).sort((a, b) => String(b.reserved_at).localeCompare(String(a.reserved_at)) || b.sequence - a.sequence);
  },
  async reserveNumber(scope, key, build) {
    return impl().reserveNumber(scope, key, build);
  },
  // One atomic write. `batch` maps a collection name to the records to insert-or-replace.
  async commit(scope, batch) {
    return impl().commit(scope, batch);
  },
  // Every EDCS collection for one firm (tenant export package).
  async exportCollections(scope) {
    const out = {};
    for (const collection of EDCS_COLLECTIONS) out[collection] = await impl().read(scope, collection);
    return out;
  }
};
