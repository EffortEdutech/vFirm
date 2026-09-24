// HM-S6 item 4 -- shared fixture seeder for the repository contract tests.
//
// Every one of the 119 tables can require a chain of parent rows (a firm needs a tenant, an
// engagement needs a firm_client_relationship and a proposal, etc.). Hand-seeding that chain once
// per table across 11 domains would mean re-deriving the same dependency graph 119 times. Instead,
// seedRow() walks schema-metadata.mjs (generated straight from the migration SQL) and recursively
// creates whatever a table's NOT NULL, no-default, foreign-key columns require, synthesizing a
// placeholder value for every other required column. The dependency graph among these tables has no
// cycles (verified while building this) and a max depth of 6, so plain recursion is sufficient.
//
// This never touches production: it writes only to whatever disposable database DATABASE_URL points
// the repository layer's shared db.mjs at, using the same generic insertRow() the real createX
// functions use -- so a fixture row is exactly as valid as one createX itself would produce.

import { randomUUID } from "node:crypto";
import { insertRow, query } from "../shared/db.mjs";
import { SCHEMA } from "./schema-metadata.mjs";

let counter = 0;

export function synthesize(table, column) {
  counter += 1;
  // Two columns (actors.actor_type, clients.client_type) carry an inline CHECK (col in (...))
  // constraint -- an arbitrary placeholder string violates it, so pick a real allowed value instead.
  if (column.enumValues) return column.enumValues[0];
  if (column.type === "uuid") return randomUUID();
  if (column.type === "timestamptz") return new Date().toISOString();
  // text (and anything else required-with-no-default that isn't uuid/timestamptz/jsonb, per the
  // schema audit only "text" occurs here) -- a short, table/column-tagged placeholder so failures
  // are easy to trace back to the column that produced them.
  return `hm-s6-contract-${table}-${column.name}-${counter}`;
}

// Recursively builds and inserts a minimal valid row for `table`, satisfying every NOT NULL /
// no-default column: FK columns get a freshly seeded parent row's id (or reuse the id passed in
// `overrides`, so a test can pin two rows to the same tenant/firm to prove scoping), everything else
// gets a synthetic value. Returns the inserted row (including its real id).
export async function seedRow(table, overrides = {}) {
  const columns = SCHEMA[table];
  if (!columns) throw new Error(`seedRow: unknown table "${table}"`);
  const record = { ...overrides };
  for (const column of columns) {
    if (column.name in record) continue;
    if (column.name === "id") {
      record.id = randomUUID();
      continue;
    }
    if (!column.notNull || column.hasDefault) continue; // let the database default/NULL apply
    if (column.fkTable) {
      const parent = await seedRow(column.fkTable, {});
      record[column.name] = parent.id;
      continue;
    }
    record[column.name] = synthesize(table, column);
  }
  return insertRow(table, columns, record);
}

// Builds (but does not insert) a minimal valid record for `table`, the same way seedRow() does --
// any required FK column is satisfied by actually seeding a parent row (so the id is valid), but the
// table's own row is left for the caller to insert. Contract tests use this to build the record they
// then pass to the domain repository's own createX -- exercising createX itself, not this file's
// generic insertRow().
export async function buildRecord(table, overrides = {}) {
  const columns = SCHEMA[table];
  if (!columns) throw new Error(`buildRecord: unknown table "${table}"`);
  const record = { ...overrides };
  for (const column of columns) {
    if (column.name in record) continue;
    if (column.name === "id") {
      record.id = randomUUID();
      continue;
    }
    if (!column.notNull || column.hasDefault) continue;
    if (column.fkTable) {
      const parent = await seedRow(column.fkTable, {});
      record[column.name] = parent.id;
      continue;
    }
    record[column.name] = synthesize(table, column);
  }
  return record;
}

// Convenience: seed one tenant + one firm under it, the pair almost every contract test needs.
export async function seedTenantAndFirm() {
  const tenant = await seedRow("tenants");
  const firm = await seedRow("firms", { tenant_id: tenant.id });
  return { tenant, firm };
}

// Truncates every table this contract-test run touched, by prefix match on the synthetic values
// this file generates. Not used for now (tests run against a throwaway database that gets dropped
// wholesale), exported for a future test runner that reuses one long-lived database instead.
export async function countRows(table) {
  const { rows } = await query(`select count(*)::int as n from ${table}`);
  return rows[0].n;
}
