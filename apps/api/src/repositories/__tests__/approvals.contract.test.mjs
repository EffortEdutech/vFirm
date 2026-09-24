// HM-S6 item 4 -- repository contract tests (Approvals (shared, cross-domain: Sales & Intake, Client Engagements & Projects, Finance & Commercial)).
//
// For every table in this domain: seeds two independent tenant/firm scopes (via fixtures.mjs's
// generic seedRow()/buildRecord(), which walk schema-metadata.mjs to satisfy any required parent
// rows), creates a row in each scope through this domain's OWN createX function (proving createX
// itself, not just the generic insert helper it's built on), then asserts listXByFirm/ByTenant/All
// returns exactly the row(s) in scope and excludes the other scope's row, getX returns the exact
// row, and updateX persists a patched field. Every row is synthetic (fixtures.mjs's placeholder
// values) written to whatever disposable database DATABASE_URL points at -- never live data.
//
// Run with: DATABASE_URL=<disposable-postgres> node apps/api/src/repositories/__tests__/approvals.contract.test.mjs
// Exits non-zero (and prints which table/assertion failed) on any failure, so it composes with
// `&&` the same way the rest of this repo's scripts/smoke-*.mjs suite does.

import assert from "node:assert/strict";
import * as repo from "../approvals.repo.mjs";
import { seedRow, buildRecord } from "./fixtures.mjs";

const tests = [
  // --- approvals ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("approvals", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("approvals", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createApproval(recordA);
    const createdB = await repo.createApproval(recordB);
    assert.equal(createdA.id, recordA.id, "approvals: createX must return the row with the id supplied");
    const listA = await repo.listApprovalsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "approvals: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "approvals: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getApproval(createdA.id);
    assert.ok(fetched, "approvals: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "approvals: getX must return the exact row requested");
    const updated = await repo.updateApproval(createdA.id, { conditions: { contractTestUpdated: true } });
    assert.deepEqual(updated.conditions, { contractTestUpdated: true }, "approvals: updateX must persist the patched conditions");
    const untouched = await repo.getApproval(createdA.id);
    assert.equal(untouched.id, createdA.id, "approvals: row must still exist and be fetchable after update");
    return "approvals";
  },
];

const results = [];
for (const test of tests) {
  results.push(await test());
}
console.log(JSON.stringify({ suite: "approvals.contract.test", tables_passed: results.length, tables: results }, null, 2));
