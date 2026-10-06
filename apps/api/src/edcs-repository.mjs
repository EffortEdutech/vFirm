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
export const EDCS_COLLECTIONS = ["edcs_connections", "edcs_transactions", "edcs_transaction_revisions", "edcs_sync_runs", "edcs_sync_events", "automation_rules", "automation_rule_runs", "edcs_number_reservations", "approval_policies", "edcs_connectors"];

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
  edcs_number_reservations: (record) => record.key ?? record.id,
  // CE-S5: one immutable row per policy version (the unique index in 0053 mirrors it)
  approval_policies: (record) => String(record.version),
  // CE-S6: one row per registered connector (the token hash index in 0054 is global and unique)
  edcs_connectors: (record) => record.id
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

// CE-H1: a targeted read -- `key` matches the natural key, `where` matches fields of the record. The JSON
// store filters in memory (it is a dev/test store); Postgres uses the natural-key and *_c indexes.
async function jsonReadWhere(scope, collection, { key = null, where = {} } = {}) {
  return (await jsonRead(scope, collection)).filter((record) =>
    (key === null || naturalKey[collection](record) === key)
    && Object.entries(where).every(([field, value]) => record[field] === value));
}

const jsonImpl = {
  read: jsonRead,
  readWhere: jsonReadWhere,
  // CE-S6: authentication has only the token, so this lookup is across all tenants (dev/test store).
  async findConnectorByTokenHash(hash) {
    const store = await readStore();
    return (store.edcs_connectors ?? []).find((record) => record.token_hash === hash) ?? null;
  },
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
  // CE-S5: add the next policy version and supersede the active one, atomically. `expected` is the active
  // version the caller based its work on (0 for none); `build(previous)` returns { superseded, record }.
  // Returns { conflict: true } when another import got there first.
  async savePolicyVersion(scope, expected, build) {
    return withStore((store) => {
      store.approval_policies ??= [];
      const mine = store.approval_policies.filter(inScope(scope));
      const previous = mine.find((item) => item.status === "ACTIVE") ?? null;
      if ((previous?.version ?? 0) !== expected) return { conflict: true };
      const built = build(previous, Math.max(0, ...mine.map((item) => item.version)) + 1);
      if (built.superseded) jsonUpsert(store, scope, "approval_policies", built.superseded);
      jsonUpsert(store, scope, "approval_policies", built.record);
      return { conflict: false, record: built.record };
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

// Filter columns that have a generated *_c column and an index (migrations 0050-0053).
const INDEXED_FIELDS = { transaction_id: "transaction_id_c", run_id: "run_id_c" };

async function pgReadWhere(scope, collection, { key = null, where = {} } = {}) {
  const params = [scope.tenant_id, scope.firm_id];
  const clauses = ["tenant_id = $1", "firm_id = $2"];
  if (key !== null) { params.push(key); clauses.push(`natural_key = $${params.length}`); }
  for (const [field, value] of Object.entries(where)) {
    params.push(value);
    clauses.push(INDEXED_FIELDS[field] ? `${INDEXED_FIELDS[field]} = $${params.length}` : `record->>'${field.replace(/[^a-z_]/gi, "")}' = $${params.length}`);
  }
  const { rows } = await query(`select record from ${collection} where ${clauses.join(" and ")} order by natural_key`, params);
  return rows.map((row) => row.record);
}

const pgImpl = {
  read: pgRead,
  readWhere: pgReadWhere,
  async findConnectorByTokenHash(hash) {
    const { rows } = await query(`select record from edcs_connectors where token_hash_c = $1`, [hash]);
    return rows[0]?.record ?? null;
  },
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
  // CE-S5: same contract as the JSON impl. A per-firm advisory lock queues concurrent imports; the unique
  // indexes in 0053 (version, one ACTIVE) are the backstop. The superseded row is written before the new one.
  async savePolicyVersion(scope, expected, build) {
    return withClient(async (client) => {
      await client.query("begin");
      try {
        await setTenantContext(client, scope.tenant_id);
        await query(`select pg_advisory_xact_lock(hashtext($1))`, [`${scope.firm_id}|approval_policy`], client);
        const { rows } = await query(
          `select record, (select coalesce(max(version_c), 0) from approval_policies where tenant_id = $1 and firm_id = $2) as highest
           from approval_policies where tenant_id = $1 and firm_id = $2 and status_c = 'ACTIVE'`,
          [scope.tenant_id, scope.firm_id],
          client
        );
        const previous = rows[0]?.record ?? null;
        if ((previous?.version ?? 0) !== expected) { await client.query("rollback"); return { conflict: true }; }
        let highest = Number(rows[0]?.highest ?? 0);
        if (!rows.length) {
          const all = await query(`select coalesce(max(version_c), 0) as highest from approval_policies where tenant_id = $1 and firm_id = $2`, [scope.tenant_id, scope.firm_id], client);
          highest = Number(all.rows[0].highest);
        }
        const built = build(previous, highest + 1);
        if (built.superseded) {
          await query(
            `update approval_policies set record = $3::jsonb, updated_at = now() where tenant_id = $1 and firm_id = $2 and natural_key = $4`,
            [scope.tenant_id, scope.firm_id, JSON.stringify(built.superseded), naturalKey.approval_policies(built.superseded)],
            client
          );
        }
        await query(
          `insert into approval_policies (id, natural_key, tenant_id, firm_id, record, created_at, updated_at)
           values ($1::uuid, $2, $3::uuid, $4::uuid, $5::jsonb, now(), now())`,
          [built.record.id, naturalKey.approval_policies(built.record), scope.tenant_id, scope.firm_id, JSON.stringify(built.record)],
          client
        );
        await client.query("commit");
        return { conflict: false, record: built.record };
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });
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
    return (await impl().readWhere(scope, "edcs_transactions", { key: transactionId }))[0] ?? null;
  },
  async listRevisions(scope, transactionId) {
    return (await impl().readWhere(scope, "edcs_transaction_revisions", { where: transactionId ? { transaction_id: transactionId } : {} }))
      .sort((a, b) => a.seq - b.seq);
  },
  async listRuns(scope) {
    return (await impl().read(scope, "edcs_sync_runs")).sort((a, b) => b.run_number - a.run_number);
  },
  async getRun(scope, runId) {
    return (await impl().readWhere(scope, "edcs_sync_runs", { key: runId }))[0] ?? null;
  },
  async listEvents(scope, { run_id = null, transaction_id = null } = {}) {
    const where = {};
    if (run_id) where.run_id = run_id;
    if (transaction_id) where.transaction_id = transaction_id;
    return (await impl().readWhere(scope, "edcs_sync_events", { where }))
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
  // CE-S5: the Delegation of Authority (immutable versions, one ACTIVE).
  async listPolicies(scope) {
    return (await impl().read(scope, "approval_policies")).sort((a, b) => b.version - a.version);
  },
  async getActivePolicy(scope) {
    return (await impl().read(scope, "approval_policies")).find((record) => record.status === "ACTIVE") ?? null;
  },
  async getPolicy(scope, version) {
    return (await impl().read(scope, "approval_policies")).find((record) => record.version === Number(version)) ?? null;
  },
  async savePolicyVersion(scope, expected, build) {
    return impl().savePolicyVersion(scope, expected, build);
  },
  // One atomic write. `batch` maps a collection name to the records to insert-or-replace.
  async commit(scope, batch) {
    return impl().commit(scope, batch);
  },
  // Every EDCS collection for one firm (tenant export package).
  // CE-S6: connector rows; the token hash never leaves the repository except to the authenticator.
  async listConnectors(scope) {
    return (await impl().read(scope, "edcs_connectors")).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  },
  async getConnector(scope, connectorId) {
    return (await impl().readWhere(scope, "edcs_connectors", { key: connectorId }))[0] ?? null;
  },
  async findConnectorByTokenHash(hash) {
    return impl().findConnectorByTokenHash(hash);
  },
  async exportCollections(scope) {
    const out = {};
    for (const collection of EDCS_COLLECTIONS) out[collection] = await impl().read(scope, collection);
    out.edcs_connectors = out.edcs_connectors.map(({ token_hash, ...rest }) => rest); // never export a token hash
    return out;
  }
};
