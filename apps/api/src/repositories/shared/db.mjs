// HM-S6 item 3 -- shared Postgres access for the new repository layer.
//
// Deliberately independent of apps/api/src/store.mjs: no import of loadStore()/saveStore() or the
// whole-store object, so a domain repository module can issue exactly the SQL a handler needs
// instead of loading everything. This is the one thing every domain *.repo.mjs file shares: a lazily
// created connection pool (same DATABASE_URL / .env.local pattern store.mjs already uses) and a
// thin `query()` wrapper.
//
// Nothing in the running app calls into this yet -- see the HM-S6 sprint plan (Claude Doc,
// "13. HM-S6 -- Data-access layer foundation") item 3: this layer is built and proven correct in
// isolation (item 4's contract tests) before HM-S7/HM-S8 migrate any real handler onto it.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";

const { Pool } = pg;

let envLoaded = false;
let pool;

async function loadLocalEnvOnce() {
  if (envLoaded) return;
  envLoaded = true;
  try {
    const body = await readFile(join(process.cwd(), ".env.local"), "utf8");
    for (const line of body.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^[`'"]|[`'"]$/g, "");
      if (key && !(key in process.env)) process.env[key] = value;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function getPool() {
  await loadLocalEnvOnce();
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("The HM-S6 repository layer requires DATABASE_URL (Postgres-backed only -- there is no JSON-file fallback for this layer).");
    pool = new Pool({ connectionString: databaseUrl });
  }
  return pool;
}

// HM-S7 Phase 4b (2026-09-28): every function here previously always went through the shared
// pool, opening its own connection -- fine for a standalone read/write, but incompatible with
// a caller (a store.mjs handler, or a future service-layer function) that needs this repo's
// insert/update to participate in a larger multi-table transaction it already has open on its
// own client. The optional trailing `client` parameter lets a caller pass an existing
// `pg` client (from `pool.connect()` + `begin`) in explicitly; when omitted, behavior is
// unchanged -- the call goes through the shared pool exactly as before. This is what makes it
// possible to swap a hand-written insert inside an existing begin/commit block (e.g.
// approveProposalRecord's `insert into approvals ...`) for this repository's createApproval()
// without weakening that operation's atomicity.
export async function query(sql, params = [], client = null) {
  if (client) return client.query(sql, params);
  const currentPool = await getPool();
  return currentPool.query(sql, params);
}

// Dynamic insert/update helpers shared by every domain repository's createX/updateX functions.
//
// Built dynamically (only columns actually present on the caller's `record`/`patch` are sent) rather
// than as a fixed column list, specifically so that columns with a database-side default (created_at,
// updated_at, metadata, record, etc.) fall through to that default when the caller omits them,
// instead of a generated INSERT sending an explicit `null` and tripping their `not null` constraints.
// `columnDefs` is `[{ name, jsonb }, ...]` -- the table's real column list, in schema order, with
// `jsonb: true` marking columns that need a `::jsonb` cast and JSON.stringify() on the way in.
// HM-S7 Phase 4c (2026-09-28): optional `options.onConflictDoNothing` appends
// `on conflict (id) do nothing`, matching the idempotent-upsert semantics several
// hand-written inserts already relied on (e.g. store.mjs's upsertPolicyDecision/
// upsertAuditEvent/upsertEventLog, which are safe to call twice with the same id -- a
// plain insert would throw a duplicate-key error instead of silently no-op'ing). Omitting
// it keeps the original plain-insert behavior for every other caller. When a conflict is
// hit, `rows[0]` comes back undefined (no row to return) -- callers that rely on
// on-conflict-do-nothing already don't use the returned row (see audit-ledger-platform.repo.mjs).
export async function insertRow(table, columnDefs, record, client = null, options = {}) {
  const columns = [];
  const placeholders = [];
  const values = [];
  let i = 1;
  for (const col of columnDefs) {
    if (!(col.name in record)) continue;
    columns.push(col.name);
    if (col.jsonb) {
      placeholders.push(`$${i}::jsonb`);
      values.push(JSON.stringify(record[col.name]));
    } else {
      placeholders.push(`$${i}`);
      values.push(record[col.name]);
    }
    i++;
  }
  if (columns.length === 0) throw new Error(`insertRow(${table}): record has no columns matching this table's schema`);
  const conflictClause = options.onConflictDoNothing ? " on conflict (id) do nothing" : "";
  const { rows } = await query(
    `insert into ${table} (${columns.join(", ")}) values (${placeholders.join(", ")})${conflictClause} returning *`,
    values,
    client
  );
  return rows[0];
}

export async function updateRowById(table, columnDefs, id, patch, client = null) {
  const setClauses = [];
  const values = [id];
  let i = 2;
  for (const col of columnDefs) {
    if (col.name === "id" || !(col.name in patch)) continue;
    if (col.jsonb) {
      setClauses.push(`${col.name} = $${i}::jsonb`);
      values.push(JSON.stringify(patch[col.name]));
    } else {
      setClauses.push(`${col.name} = $${i}`);
      values.push(patch[col.name]);
    }
    i++;
  }
  if (setClauses.length === 0) {
    const { rows } = await query(`select * from ${table} where id = $1`, [id], client);
    return rows[0] ?? null;
  }
  const { rows } = await query(
    `update ${table} set ${setClauses.join(", ")} where id = $1 returning *`,
    values,
    client
  );
  return rows[0] ?? null;
}

// HM-S7 Phase 4d (2026-09-29): sets the per-transaction session GUC that the RLS backstop
// policies (see infra/database/migrations/0034_rls_backstop_directory_sales_intake.sql
// onward) key off of. Must be called on `client` right after `begin`, before any insert/
// update on an RLS-protected table -- `set_config(..., true)` is transaction-local (SET
// LOCAL semantics), so it automatically clears when the transaction ends and can never leak
// onto the next request that borrows this same pooled connection. Call with the tenant_id
// already validated against the requesting actor (by assertActorScope/
// requireHumanOperationalAuthority) before this point -- this does not re-check anything
// itself, it only makes that already-checked value visible to the database for its own
// independent enforcement.
export async function setTenantContext(client, tenantId) {
  await client.query("select set_config('app.current_tenant_id', $1, true)", [tenantId ?? ""]);
}

// Exposed for tests/scripts that need transactional isolation (e.g. HM-S6 item 4's contract tests
// seeding and tearing down synthetic rows); ordinary repository functions above use query() only.
export async function withClient(fn) {
  const currentPool = await getPool();
  const client = await currentPool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
