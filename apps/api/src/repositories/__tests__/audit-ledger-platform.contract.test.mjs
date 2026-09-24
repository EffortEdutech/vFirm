// HM-S6 item 4 -- repository contract tests (Audit / Ledger / Platform & Ops).
//
// For every table in this domain: seeds two independent tenant/firm scopes (via fixtures.mjs's
// generic seedRow()/buildRecord(), which walk schema-metadata.mjs to satisfy any required parent
// rows), creates a row in each scope through this domain's OWN createX function (proving createX
// itself, not just the generic insert helper it's built on), then asserts listXByFirm/ByTenant/All
// returns exactly the row(s) in scope and excludes the other scope's row, getX returns the exact
// row, and updateX persists a patched field. Every row is synthetic (fixtures.mjs's placeholder
// values) written to whatever disposable database DATABASE_URL points at -- never live data.
//
// Run with: DATABASE_URL=<disposable-postgres> node apps/api/src/repositories/__tests__/audit-ledger-platform.contract.test.mjs
// Exits non-zero (and prints which table/assertion failed) on any failure, so it composes with
// `&&` the same way the rest of this repo's scripts/smoke-*.mjs suite does.

import assert from "node:assert/strict";
import * as repo from "../audit-ledger-platform.repo.mjs";
import { seedRow, buildRecord } from "./fixtures.mjs";

const tests = [
  // --- policy_decisions ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("policy_decisions", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("policy_decisions", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createPolicyDecision(recordA);
    const createdB = await repo.createPolicyDecision(recordB);
    assert.equal(createdA.id, recordA.id, "policy_decisions: createX must return the row with the id supplied");
    const listA = await repo.listPolicyDecisionsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "policy_decisions: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "policy_decisions: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getPolicyDecision(createdA.id);
    assert.ok(fetched, "policy_decisions: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "policy_decisions: getX must return the exact row requested");
    const updated = await repo.updatePolicyDecision(createdA.id, { reasons: { contractTestUpdated: true } });
    assert.deepEqual(updated.reasons, { contractTestUpdated: true }, "policy_decisions: updateX must persist the patched reasons");
    const untouched = await repo.getPolicyDecision(createdA.id);
    assert.equal(untouched.id, createdA.id, "policy_decisions: row must still exist and be fetchable after update");
    return "policy_decisions";
  },
  // --- event_log ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("event_log", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("event_log", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createEventLog(recordA);
    const createdB = await repo.createEventLog(recordB);
    assert.equal(createdA.id, recordA.id, "event_log: createX must return the row with the id supplied");
    const listA = await repo.listEventLogByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "event_log: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "event_log: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getEventLog(createdA.id);
    assert.ok(fetched, "event_log: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "event_log: getX must return the exact row requested");
    const updated = await repo.updateEventLog(createdA.id, { payload: { contractTestUpdated: true } });
    assert.deepEqual(updated.payload, { contractTestUpdated: true }, "event_log: updateX must persist the patched payload");
    const untouched = await repo.getEventLog(createdA.id);
    assert.equal(untouched.id, createdA.id, "event_log: row must still exist and be fetchable after update");
    return "event_log";
  },
  // --- audit_events ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("audit_events", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("audit_events", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createAuditEvent(recordA);
    const createdB = await repo.createAuditEvent(recordB);
    assert.equal(createdA.id, recordA.id, "audit_events: createX must return the row with the id supplied");
    const listA = await repo.listAuditEventsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "audit_events: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "audit_events: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getAuditEvent(createdA.id);
    assert.ok(fetched, "audit_events: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "audit_events: getX must return the exact row requested");
    const newValue = `updated-${Date.now()}`;
    const updated = await repo.updateAuditEvent(createdA.id, { action: newValue });
    assert.equal(updated.action, newValue, "audit_events: updateX must persist the patched action");
    const untouched = await repo.getAuditEvent(createdA.id);
    assert.equal(untouched.id, createdA.id, "audit_events: row must still exist and be fetchable after update");
    return "audit_events";
  },
];

const results = [];
for (const test of tests) {
  results.push(await test());
}
console.log(JSON.stringify({ suite: "audit-ledger-platform.contract.test", tables_passed: results.length, tables: results }, null, 2));
