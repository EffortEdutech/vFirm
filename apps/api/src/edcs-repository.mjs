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

export const EDCS_COLLECTIONS = ["edcs_connections", "edcs_transactions", "edcs_transaction_revisions", "edcs_sync_runs", "edcs_sync_events"];

// The natural key inside (tenant, firm) of each collection.
const naturalKey = {
  edcs_connections: () => "connection",
  edcs_transactions: (record) => record.transaction_id,
  edcs_transaction_revisions: (record) => `${record.transaction_id}#${record.seq}`,
  edcs_sync_runs: (record) => record.id,
  edcs_sync_events: (record) => record.id
};

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
