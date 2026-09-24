// HM-S6 item 4 -- repository contract tests (Finance & Commercial).
//
// For every table in this domain: seeds two independent tenant/firm scopes (via fixtures.mjs's
// generic seedRow()/buildRecord(), which walk schema-metadata.mjs to satisfy any required parent
// rows), creates a row in each scope through this domain's OWN createX function (proving createX
// itself, not just the generic insert helper it's built on), then asserts listXByFirm/ByTenant/All
// returns exactly the row(s) in scope and excludes the other scope's row, getX returns the exact
// row, and updateX persists a patched field. Every row is synthetic (fixtures.mjs's placeholder
// values) written to whatever disposable database DATABASE_URL points at -- never live data.
//
// Run with: DATABASE_URL=<disposable-postgres> node apps/api/src/repositories/__tests__/finance-commercial.contract.test.mjs
// Exits non-zero (and prints which table/assertion failed) on any failure, so it composes with
// `&&` the same way the rest of this repo's scripts/smoke-*.mjs suite does.

import assert from "node:assert/strict";
import * as repo from "../finance-commercial.repo.mjs";
import { seedRow, buildRecord } from "./fixtures.mjs";

const tests = [
  // --- invoices ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("invoices", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("invoices", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createInvoice(recordA);
    const createdB = await repo.createInvoice(recordB);
    assert.equal(createdA.id, recordA.id, "invoices: createX must return the row with the id supplied");
    const listA = await repo.listInvoicesByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "invoices: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "invoices: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getInvoice(createdA.id);
    assert.ok(fetched, "invoices: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "invoices: getX must return the exact row requested");
    const updated = await repo.updateInvoice(createdA.id, { line_items: { contractTestUpdated: true } });
    assert.deepEqual(updated.line_items, { contractTestUpdated: true }, "invoices: updateX must persist the patched line_items");
    const untouched = await repo.getInvoice(createdA.id);
    assert.equal(untouched.id, createdA.id, "invoices: row must still exist and be fetchable after update");
    return "invoices";
  },
  // --- payment_statuses ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("payment_statuses", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("payment_statuses", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createPaymentStatus(recordA);
    const createdB = await repo.createPaymentStatus(recordB);
    assert.equal(createdA.id, recordA.id, "payment_statuses: createX must return the row with the id supplied");
    const listA = await repo.listPaymentStatusesByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "payment_statuses: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "payment_statuses: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getPaymentStatus(createdA.id);
    assert.ok(fetched, "payment_statuses: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "payment_statuses: getX must return the exact row requested");
    const newValue = `updated-${Date.now()}`;
    const updated = await repo.updatePaymentStatus(createdA.id, { currency: newValue });
    assert.equal(updated.currency, newValue, "payment_statuses: updateX must persist the patched currency");
    const untouched = await repo.getPaymentStatus(createdA.id);
    assert.equal(untouched.id, createdA.id, "payment_statuses: row must still exist and be fetchable after update");
    return "payment_statuses";
  },
  // --- expense_records ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("expense_records", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("expense_records", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createExpenseRecord(recordA);
    const createdB = await repo.createExpenseRecord(recordB);
    assert.equal(createdA.id, recordA.id, "expense_records: createX must return the row with the id supplied");
    const listA = await repo.listExpenseRecordsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "expense_records: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "expense_records: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getExpenseRecord(createdA.id);
    assert.ok(fetched, "expense_records: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "expense_records: getX must return the exact row requested");
    const updated = await repo.updateExpenseRecord(createdA.id, { metadata: { contractTestUpdated: true } });
    assert.deepEqual(updated.metadata, { contractTestUpdated: true }, "expense_records: updateX must persist the patched metadata");
    const untouched = await repo.getExpenseRecord(createdA.id);
    assert.equal(untouched.id, createdA.id, "expense_records: row must still exist and be fetchable after update");
    return "expense_records";
  },
  // --- receivable_follow_ups ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("receivable_follow_ups", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("receivable_follow_ups", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createReceivableFollowUp(recordA);
    const createdB = await repo.createReceivableFollowUp(recordB);
    assert.equal(createdA.id, recordA.id, "receivable_follow_ups: createX must return the row with the id supplied");
    const listA = await repo.listReceivableFollowUpsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "receivable_follow_ups: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "receivable_follow_ups: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getReceivableFollowUp(createdA.id);
    assert.ok(fetched, "receivable_follow_ups: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "receivable_follow_ups: getX must return the exact row requested");
    const updated = await repo.updateReceivableFollowUp(createdA.id, { metadata: { contractTestUpdated: true } });
    assert.deepEqual(updated.metadata, { contractTestUpdated: true }, "receivable_follow_ups: updateX must persist the patched metadata");
    const untouched = await repo.getReceivableFollowUp(createdA.id);
    assert.equal(untouched.id, createdA.id, "receivable_follow_ups: row must still exist and be fetchable after update");
    return "receivable_follow_ups";
  },
  // --- payment_provider_configs ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("payment_provider_configs", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("payment_provider_configs", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createPaymentProviderConfig(recordA);
    const createdB = await repo.createPaymentProviderConfig(recordB);
    assert.equal(createdA.id, recordA.id, "payment_provider_configs: createX must return the row with the id supplied");
    const listA = await repo.listPaymentProviderConfigsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "payment_provider_configs: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "payment_provider_configs: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getPaymentProviderConfig(createdA.id);
    assert.ok(fetched, "payment_provider_configs: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "payment_provider_configs: getX must return the exact row requested");
    const updated = await repo.updatePaymentProviderConfig(createdA.id, { capabilities: { contractTestUpdated: true } });
    assert.deepEqual(updated.capabilities, { contractTestUpdated: true }, "payment_provider_configs: updateX must persist the patched capabilities");
    const untouched = await repo.getPaymentProviderConfig(createdA.id);
    assert.equal(untouched.id, createdA.id, "payment_provider_configs: row must still exist and be fetchable after update");
    return "payment_provider_configs";
  },
  // --- subscription_packages ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("subscription_packages", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("subscription_packages", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createSubscriptionPackage(recordA);
    const createdB = await repo.createSubscriptionPackage(recordB);
    assert.equal(createdA.id, recordA.id, "subscription_packages: createX must return the row with the id supplied");
    const listA = await repo.listSubscriptionPackagesByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "subscription_packages: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "subscription_packages: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getSubscriptionPackage(createdA.id);
    assert.ok(fetched, "subscription_packages: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "subscription_packages: getX must return the exact row requested");
    const updated = await repo.updateSubscriptionPackage(createdA.id, { usage_limits: { contractTestUpdated: true } });
    assert.deepEqual(updated.usage_limits, { contractTestUpdated: true }, "subscription_packages: updateX must persist the patched usage_limits");
    const untouched = await repo.getSubscriptionPackage(createdA.id);
    assert.equal(untouched.id, createdA.id, "subscription_packages: row must still exist and be fetchable after update");
    return "subscription_packages";
  },
  // --- commercial_launch_controls ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("commercial_launch_controls", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("commercial_launch_controls", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createCommercialLaunchControl(recordA);
    const createdB = await repo.createCommercialLaunchControl(recordB);
    assert.equal(createdA.id, recordA.id, "commercial_launch_controls: createX must return the row with the id supplied");
    const listA = await repo.listCommercialLaunchControlsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "commercial_launch_controls: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "commercial_launch_controls: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getCommercialLaunchControl(createdA.id);
    assert.ok(fetched, "commercial_launch_controls: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "commercial_launch_controls: getX must return the exact row requested");
    const updated = await repo.updateCommercialLaunchControl(createdA.id, { required_controls: { contractTestUpdated: true } });
    assert.deepEqual(updated.required_controls, { contractTestUpdated: true }, "commercial_launch_controls: updateX must persist the patched required_controls");
    const untouched = await repo.getCommercialLaunchControl(createdA.id);
    assert.equal(untouched.id, createdA.id, "commercial_launch_controls: row must still exist and be fetchable after update");
    return "commercial_launch_controls";
  },
  // --- billing_readiness_reviews ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("billing_readiness_reviews", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("billing_readiness_reviews", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createBillingReadinessReview(recordA);
    const createdB = await repo.createBillingReadinessReview(recordB);
    assert.equal(createdA.id, recordA.id, "billing_readiness_reviews: createX must return the row with the id supplied");
    const listA = await repo.listBillingReadinessReviewsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "billing_readiness_reviews: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "billing_readiness_reviews: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getBillingReadinessReview(createdA.id);
    assert.ok(fetched, "billing_readiness_reviews: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "billing_readiness_reviews: getX must return the exact row requested");
    const updated = await repo.updateBillingReadinessReview(createdA.id, { metadata: { contractTestUpdated: true } });
    assert.deepEqual(updated.metadata, { contractTestUpdated: true }, "billing_readiness_reviews: updateX must persist the patched metadata");
    const untouched = await repo.getBillingReadinessReview(createdA.id);
    assert.equal(untouched.id, createdA.id, "billing_readiness_reviews: row must still exist and be fetchable after update");
    return "billing_readiness_reviews";
  },
  // --- tenant_usage_events ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("tenant_usage_events", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("tenant_usage_events", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createTenantUsageEvent(recordA);
    const createdB = await repo.createTenantUsageEvent(recordB);
    assert.equal(createdA.id, recordA.id, "tenant_usage_events: createX must return the row with the id supplied");
    const listA = await repo.listTenantUsageEventsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "tenant_usage_events: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "tenant_usage_events: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getTenantUsageEvent(createdA.id);
    assert.ok(fetched, "tenant_usage_events: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "tenant_usage_events: getX must return the exact row requested");
    const updated = await repo.updateTenantUsageEvent(createdA.id, { metadata: { contractTestUpdated: true } });
    assert.deepEqual(updated.metadata, { contractTestUpdated: true }, "tenant_usage_events: updateX must persist the patched metadata");
    const untouched = await repo.getTenantUsageEvent(createdA.id);
    assert.equal(untouched.id, createdA.id, "tenant_usage_events: row must still exist and be fetchable after update");
    return "tenant_usage_events";
  },
];

const results = [];
for (const test of tests) {
  results.push(await test());
}
console.log(JSON.stringify({ suite: "finance-commercial.contract.test", tables_passed: results.length, tables: results }, null, 2));
