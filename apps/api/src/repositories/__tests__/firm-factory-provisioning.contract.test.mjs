// HM-S6 item 4 -- repository contract tests (Firm Factory / Provisioning).
//
// For every table in this domain: seeds two independent tenant/firm scopes (via fixtures.mjs's
// generic seedRow()/buildRecord(), which walk schema-metadata.mjs to satisfy any required parent
// rows), creates a row in each scope through this domain's OWN createX function (proving createX
// itself, not just the generic insert helper it's built on), then asserts listXByFirm/ByTenant/All
// returns exactly the row(s) in scope and excludes the other scope's row, getX returns the exact
// row, and updateX persists a patched field. Every row is synthetic (fixtures.mjs's placeholder
// values) written to whatever disposable database DATABASE_URL points at -- never live data.
//
// Run with: DATABASE_URL=<disposable-postgres> node apps/api/src/repositories/__tests__/firm-factory-provisioning.contract.test.mjs
// Exits non-zero (and prints which table/assertion failed) on any failure, so it composes with
// `&&` the same way the rest of this repo's scripts/smoke-*.mjs suite does.

import assert from "node:assert/strict";
import * as repo from "../firm-factory-provisioning.repo.mjs";
import { seedRow, buildRecord } from "./fixtures.mjs";

const tests = [
  // --- factory_firm_blueprints ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("factory_firm_blueprints", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("factory_firm_blueprints", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createFactoryFirmBlueprint(recordA);
    const createdB = await repo.createFactoryFirmBlueprint(recordB);
    assert.equal(createdA.id, recordA.id, "factory_firm_blueprints: createX must return the row with the id supplied");
    const listA = await repo.listFactoryFirmBlueprintsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "factory_firm_blueprints: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "factory_firm_blueprints: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getFactoryFirmBlueprint(createdA.id);
    assert.ok(fetched, "factory_firm_blueprints: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "factory_firm_blueprints: getX must return the exact row requested");
    const updated = await repo.updateFactoryFirmBlueprint(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "factory_firm_blueprints: updateX must persist the patched record");
    const untouched = await repo.getFactoryFirmBlueprint(createdA.id);
    assert.equal(untouched.id, createdA.id, "factory_firm_blueprints: row must still exist and be fetchable after update");
    return "factory_firm_blueprints";
  },
  // --- factory_provisioning_runs ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("factory_provisioning_runs", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("factory_provisioning_runs", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createFactoryProvisioningRun(recordA);
    const createdB = await repo.createFactoryProvisioningRun(recordB);
    assert.equal(createdA.id, recordA.id, "factory_provisioning_runs: createX must return the row with the id supplied");
    const listA = await repo.listFactoryProvisioningRunsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "factory_provisioning_runs: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "factory_provisioning_runs: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getFactoryProvisioningRun(createdA.id);
    assert.ok(fetched, "factory_provisioning_runs: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "factory_provisioning_runs: getX must return the exact row requested");
    const updated = await repo.updateFactoryProvisioningRun(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "factory_provisioning_runs: updateX must persist the patched record");
    const untouched = await repo.getFactoryProvisioningRun(createdA.id);
    assert.equal(untouched.id, createdA.id, "factory_provisioning_runs: row must still exist and be fetchable after update");
    return "factory_provisioning_runs";
  },
  // --- provisioned_firm_instances ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("provisioned_firm_instances", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("provisioned_firm_instances", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createProvisionedFirmInstance(recordA);
    const createdB = await repo.createProvisionedFirmInstance(recordB);
    assert.equal(createdA.id, recordA.id, "provisioned_firm_instances: createX must return the row with the id supplied");
    const listA = await repo.listProvisionedFirmInstancesByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "provisioned_firm_instances: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "provisioned_firm_instances: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getProvisionedFirmInstance(createdA.id);
    assert.ok(fetched, "provisioned_firm_instances: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "provisioned_firm_instances: getX must return the exact row requested");
    const updated = await repo.updateProvisionedFirmInstance(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "provisioned_firm_instances: updateX must persist the patched record");
    const untouched = await repo.getProvisionedFirmInstance(createdA.id);
    assert.equal(untouched.id, createdA.id, "provisioned_firm_instances: row must still exist and be fetchable after update");
    return "provisioned_firm_instances";
  },
  // --- factory_worker_bindings ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("factory_worker_bindings", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("factory_worker_bindings", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createFactoryWorkerBinding(recordA);
    const createdB = await repo.createFactoryWorkerBinding(recordB);
    assert.equal(createdA.id, recordA.id, "factory_worker_bindings: createX must return the row with the id supplied");
    const listA = await repo.listFactoryWorkerBindingsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "factory_worker_bindings: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "factory_worker_bindings: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getFactoryWorkerBinding(createdA.id);
    assert.ok(fetched, "factory_worker_bindings: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "factory_worker_bindings: getX must return the exact row requested");
    const updated = await repo.updateFactoryWorkerBinding(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "factory_worker_bindings: updateX must persist the patched record");
    const untouched = await repo.getFactoryWorkerBinding(createdA.id);
    assert.equal(untouched.id, createdA.id, "factory_worker_bindings: row must still exist and be fetchable after update");
    return "factory_worker_bindings";
  },
  // --- pack_compatibility_checks ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("pack_compatibility_checks", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("pack_compatibility_checks", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createPackCompatibilityCheck(recordA);
    const createdB = await repo.createPackCompatibilityCheck(recordB);
    assert.equal(createdA.id, recordA.id, "pack_compatibility_checks: createX must return the row with the id supplied");
    const listA = await repo.listPackCompatibilityChecksByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "pack_compatibility_checks: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "pack_compatibility_checks: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getPackCompatibilityCheck(createdA.id);
    assert.ok(fetched, "pack_compatibility_checks: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "pack_compatibility_checks: getX must return the exact row requested");
    const updated = await repo.updatePackCompatibilityCheck(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "pack_compatibility_checks: updateX must persist the patched record");
    const untouched = await repo.getPackCompatibilityCheck(createdA.id);
    assert.equal(untouched.id, createdA.id, "pack_compatibility_checks: row must still exist and be fetchable after update");
    return "pack_compatibility_checks";
  },
  // --- pack_binding_certifications ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("pack_binding_certifications", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("pack_binding_certifications", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createPackBindingCertification(recordA);
    const createdB = await repo.createPackBindingCertification(recordB);
    assert.equal(createdA.id, recordA.id, "pack_binding_certifications: createX must return the row with the id supplied");
    const listA = await repo.listPackBindingCertificationsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "pack_binding_certifications: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "pack_binding_certifications: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getPackBindingCertification(createdA.id);
    assert.ok(fetched, "pack_binding_certifications: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "pack_binding_certifications: getX must return the exact row requested");
    const updated = await repo.updatePackBindingCertification(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "pack_binding_certifications: updateX must persist the patched record");
    const untouched = await repo.getPackBindingCertification(createdA.id);
    assert.equal(untouched.id, createdA.id, "pack_binding_certifications: row must still exist and be fetchable after update");
    return "pack_binding_certifications";
  },
  // --- service_activation_records ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("service_activation_records", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("service_activation_records", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createServiceActivationRecord(recordA);
    const createdB = await repo.createServiceActivationRecord(recordB);
    assert.equal(createdA.id, recordA.id, "service_activation_records: createX must return the row with the id supplied");
    const listA = await repo.listServiceActivationRecordsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "service_activation_records: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "service_activation_records: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getServiceActivationRecord(createdA.id);
    assert.ok(fetched, "service_activation_records: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "service_activation_records: getX must return the exact row requested");
    const updated = await repo.updateServiceActivationRecord(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "service_activation_records: updateX must persist the patched record");
    const untouched = await repo.getServiceActivationRecord(createdA.id);
    assert.equal(untouched.id, createdA.id, "service_activation_records: row must still exist and be fetchable after update");
    return "service_activation_records";
  },
];

const results = [];
for (const test of tests) {
  results.push(await test());
}
console.log(JSON.stringify({ suite: "firm-factory-provisioning.contract.test", tables_passed: results.length, tables: results }, null, 2));
