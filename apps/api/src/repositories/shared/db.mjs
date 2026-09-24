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

export async function query(sql, params = []) {
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
export async function insertRow(table, columnDefs, record) {
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
  const { rows } = await query(
    `insert into ${table} (${columns.join(", ")}) values (${placeholders.join(", ")}) returning *`,
    values
  );
  return rows[0];
}

export async function updateRowById(table, columnDefs, id, patch) {
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
    const { rows } = await query(`select * from ${table} where id = $1`, [id]);
    return rows[0] ?? null;
  }
  const { rows } = await query(
    `update ${table} set ${setClauses.join(", ")} where id = $1 returning *`,
    values
  );
  return rows[0] ?? null;
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
