// HM-S6 item 4 -- repository contract tests (My Team & HR (AI Workforce)).
//
// For every table in this domain: seeds two independent tenant/firm scopes (via fixtures.mjs's
// generic seedRow()/buildRecord(), which walk schema-metadata.mjs to satisfy any required parent
// rows), creates a row in each scope through this domain's OWN createX function (proving createX
// itself, not just the generic insert helper it's built on), then asserts listXByFirm/ByTenant/All
// returns exactly the row(s) in scope and excludes the other scope's row, getX returns the exact
// row, and updateX persists a patched field. Every row is synthetic (fixtures.mjs's placeholder
// values) written to whatever disposable database DATABASE_URL points at -- never live data.
//
// Run with: DATABASE_URL=<disposable-postgres> node apps/api/src/repositories/__tests__/my-team-hr.contract.test.mjs
// Exits non-zero (and prints which table/assertion failed) on any failure, so it composes with
// `&&` the same way the rest of this repo's scripts/smoke-*.mjs suite does.

import assert from "node:assert/strict";
import * as repo from "../my-team-hr.repo.mjs";
import { seedRow, buildRecord } from "./fixtures.mjs";

const tests = [
  // --- worker_templates ---
  async () => {
    const recordA = await buildRecord("worker_templates", {});
    const createdA = await repo.createWorkerTemplate(recordA);
    assert.equal(createdA.id, recordA.id, "worker_templates: createX must return the row with the id supplied");
    const listAll = await repo.listAllWorkerTemplates();
    assert.ok(listAll.some((r) => r.id === createdA.id), "worker_templates: listAllX must include the created row");
    const fetched = await repo.getWorkerTemplate(createdA.id);
    assert.ok(fetched, "worker_templates: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "worker_templates: getX must return the exact row requested");
    const updated = await repo.updateWorkerTemplate(createdA.id, { default_tools: { contractTestUpdated: true } });
    assert.deepEqual(updated.default_tools, { contractTestUpdated: true }, "worker_templates: updateX must persist the patched default_tools");
    const untouched = await repo.getWorkerTemplate(createdA.id);
    assert.equal(untouched.id, createdA.id, "worker_templates: row must still exist and be fetchable after update");
    return "worker_templates";
  },
  // --- worker_instances ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("worker_instances", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("worker_instances", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createWorkerInstance(recordA);
    const createdB = await repo.createWorkerInstance(recordB);
    assert.equal(createdA.id, recordA.id, "worker_instances: createX must return the row with the id supplied");
    const listA = await repo.listWorkerInstancesByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "worker_instances: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "worker_instances: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getWorkerInstance(createdA.id);
    assert.ok(fetched, "worker_instances: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "worker_instances: getX must return the exact row requested");
    const updated = await repo.updateWorkerInstance(createdA.id, { assigned_services: { contractTestUpdated: true } });
    assert.deepEqual(updated.assigned_services, { contractTestUpdated: true }, "worker_instances: updateX must persist the patched assigned_services");
    const untouched = await repo.getWorkerInstance(createdA.id);
    assert.equal(untouched.id, createdA.id, "worker_instances: row must still exist and be fetchable after update");
    return "worker_instances";
  },
  // --- task_outputs ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("task_outputs", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("task_outputs", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createTaskOutput(recordA);
    const createdB = await repo.createTaskOutput(recordB);
    assert.equal(createdA.id, recordA.id, "task_outputs: createX must return the row with the id supplied");
    const listA = await repo.listTaskOutputsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "task_outputs: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "task_outputs: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getTaskOutput(createdA.id);
    assert.ok(fetched, "task_outputs: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "task_outputs: getX must return the exact row requested");
    const updated = await repo.updateTaskOutput(createdA.id, { evidence_refs: { contractTestUpdated: true } });
    assert.deepEqual(updated.evidence_refs, { contractTestUpdated: true }, "task_outputs: updateX must persist the patched evidence_refs");
    const untouched = await repo.getTaskOutput(createdA.id);
    assert.equal(untouched.id, createdA.id, "task_outputs: row must still exist and be fetchable after update");
    return "task_outputs";
  },
  // --- tool_invocations ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("tool_invocations", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("tool_invocations", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createToolInvocation(recordA);
    const createdB = await repo.createToolInvocation(recordB);
    assert.equal(createdA.id, recordA.id, "tool_invocations: createX must return the row with the id supplied");
    const listA = await repo.listToolInvocationsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "tool_invocations: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "tool_invocations: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getToolInvocation(createdA.id);
    assert.ok(fetched, "tool_invocations: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "tool_invocations: getX must return the exact row requested");
    const newValue = `updated-${Date.now()}`;
    const updated = await repo.updateToolInvocation(createdA.id, { tool_name: newValue });
    assert.equal(updated.tool_name, newValue, "tool_invocations: updateX must persist the patched tool_name");
    const untouched = await repo.getToolInvocation(createdA.id);
    assert.equal(untouched.id, createdA.id, "tool_invocations: row must still exist and be fetchable after update");
    return "tool_invocations";
  },
  // --- awia_firm_package_assignments ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("awia_firm_package_assignments", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("awia_firm_package_assignments", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createAwiaFirmPackageAssignment(recordA);
    const createdB = await repo.createAwiaFirmPackageAssignment(recordB);
    assert.equal(createdA.id, recordA.id, "awia_firm_package_assignments: createX must return the row with the id supplied");
    const listA = await repo.listAwiaFirmPackageAssignmentsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "awia_firm_package_assignments: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "awia_firm_package_assignments: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getAwiaFirmPackageAssignment(createdA.id);
    assert.ok(fetched, "awia_firm_package_assignments: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "awia_firm_package_assignments: getX must return the exact row requested");
    const updated = await repo.updateAwiaFirmPackageAssignment(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "awia_firm_package_assignments: updateX must persist the patched record");
    const untouched = await repo.getAwiaFirmPackageAssignment(createdA.id);
    assert.equal(untouched.id, createdA.id, "awia_firm_package_assignments: row must still exist and be fetchable after update");
    return "awia_firm_package_assignments";
  },
  // --- awia_virtual_staff_provisioning_runs ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("awia_virtual_staff_provisioning_runs", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("awia_virtual_staff_provisioning_runs", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createAwiaVirtualStaffProvisioningRun(recordA);
    const createdB = await repo.createAwiaVirtualStaffProvisioningRun(recordB);
    assert.equal(createdA.id, recordA.id, "awia_virtual_staff_provisioning_runs: createX must return the row with the id supplied");
    const listA = await repo.listAwiaVirtualStaffProvisioningRunsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "awia_virtual_staff_provisioning_runs: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "awia_virtual_staff_provisioning_runs: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getAwiaVirtualStaffProvisioningRun(createdA.id);
    assert.ok(fetched, "awia_virtual_staff_provisioning_runs: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "awia_virtual_staff_provisioning_runs: getX must return the exact row requested");
    const updated = await repo.updateAwiaVirtualStaffProvisioningRun(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "awia_virtual_staff_provisioning_runs: updateX must persist the patched record");
    const untouched = await repo.getAwiaVirtualStaffProvisioningRun(createdA.id);
    assert.equal(untouched.id, createdA.id, "awia_virtual_staff_provisioning_runs: row must still exist and be fetchable after update");
    return "awia_virtual_staff_provisioning_runs";
  },
  // --- awia_virtual_staff_seats ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("awia_virtual_staff_seats", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("awia_virtual_staff_seats", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createAwiaVirtualStaffSeat(recordA);
    const createdB = await repo.createAwiaVirtualStaffSeat(recordB);
    assert.equal(createdA.id, recordA.id, "awia_virtual_staff_seats: createX must return the row with the id supplied");
    const listA = await repo.listAwiaVirtualStaffSeatsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "awia_virtual_staff_seats: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "awia_virtual_staff_seats: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getAwiaVirtualStaffSeat(createdA.id);
    assert.ok(fetched, "awia_virtual_staff_seats: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "awia_virtual_staff_seats: getX must return the exact row requested");
    const updated = await repo.updateAwiaVirtualStaffSeat(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "awia_virtual_staff_seats: updateX must persist the patched record");
    const untouched = await repo.getAwiaVirtualStaffSeat(createdA.id);
    assert.equal(untouched.id, createdA.id, "awia_virtual_staff_seats: row must still exist and be fetchable after update");
    return "awia_virtual_staff_seats";
  },
  // --- awia_virtual_staff_members ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("awia_virtual_staff_members", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("awia_virtual_staff_members", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createAwiaVirtualStaffMember(recordA);
    const createdB = await repo.createAwiaVirtualStaffMember(recordB);
    assert.equal(createdA.id, recordA.id, "awia_virtual_staff_members: createX must return the row with the id supplied");
    const listA = await repo.listAwiaVirtualStaffMembersByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "awia_virtual_staff_members: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "awia_virtual_staff_members: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getAwiaVirtualStaffMember(createdA.id);
    assert.ok(fetched, "awia_virtual_staff_members: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "awia_virtual_staff_members: getX must return the exact row requested");
    const updated = await repo.updateAwiaVirtualStaffMember(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "awia_virtual_staff_members: updateX must persist the patched record");
    const untouched = await repo.getAwiaVirtualStaffMember(createdA.id);
    assert.equal(untouched.id, createdA.id, "awia_virtual_staff_members: row must still exist and be fetchable after update");
    return "awia_virtual_staff_members";
  },
  // --- awia_staff_role_assignments ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("awia_staff_role_assignments", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("awia_staff_role_assignments", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createAwiaStaffRoleAssignment(recordA);
    const createdB = await repo.createAwiaStaffRoleAssignment(recordB);
    assert.equal(createdA.id, recordA.id, "awia_staff_role_assignments: createX must return the row with the id supplied");
    const listA = await repo.listAwiaStaffRoleAssignmentsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "awia_staff_role_assignments: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "awia_staff_role_assignments: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getAwiaStaffRoleAssignment(createdA.id);
    assert.ok(fetched, "awia_staff_role_assignments: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "awia_staff_role_assignments: getX must return the exact row requested");
    const updated = await repo.updateAwiaStaffRoleAssignment(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "awia_staff_role_assignments: updateX must persist the patched record");
    const untouched = await repo.getAwiaStaffRoleAssignment(createdA.id);
    assert.equal(untouched.id, createdA.id, "awia_staff_role_assignments: row must still exist and be fetchable after update");
    return "awia_staff_role_assignments";
  },
  // --- awia_staff_package_bindings ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("awia_staff_package_bindings", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("awia_staff_package_bindings", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createAwiaStaffPackageBinding(recordA);
    const createdB = await repo.createAwiaStaffPackageBinding(recordB);
    assert.equal(createdA.id, recordA.id, "awia_staff_package_bindings: createX must return the row with the id supplied");
    const listA = await repo.listAwiaStaffPackageBindingsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "awia_staff_package_bindings: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "awia_staff_package_bindings: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getAwiaStaffPackageBinding(createdA.id);
    assert.ok(fetched, "awia_staff_package_bindings: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "awia_staff_package_bindings: getX must return the exact row requested");
    const updated = await repo.updateAwiaStaffPackageBinding(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "awia_staff_package_bindings: updateX must persist the patched record");
    const untouched = await repo.getAwiaStaffPackageBinding(createdA.id);
    assert.equal(untouched.id, createdA.id, "awia_staff_package_bindings: row must still exist and be fetchable after update");
    return "awia_staff_package_bindings";
  },
  // --- awia_staff_lifecycle_events ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("awia_staff_lifecycle_events", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("awia_staff_lifecycle_events", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createAwiaStaffLifecycleEvent(recordA);
    const createdB = await repo.createAwiaStaffLifecycleEvent(recordB);
    assert.equal(createdA.id, recordA.id, "awia_staff_lifecycle_events: createX must return the row with the id supplied");
    const listA = await repo.listAwiaStaffLifecycleEventsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "awia_staff_lifecycle_events: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "awia_staff_lifecycle_events: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getAwiaStaffLifecycleEvent(createdA.id);
    assert.ok(fetched, "awia_staff_lifecycle_events: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "awia_staff_lifecycle_events: getX must return the exact row requested");
    const updated = await repo.updateAwiaStaffLifecycleEvent(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "awia_staff_lifecycle_events: updateX must persist the patched record");
    const untouched = await repo.getAwiaStaffLifecycleEvent(createdA.id);
    assert.equal(untouched.id, createdA.id, "awia_staff_lifecycle_events: row must still exist and be fetchable after update");
    return "awia_staff_lifecycle_events";
  },
  // --- awia_staff_authority_decisions ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("awia_staff_authority_decisions", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("awia_staff_authority_decisions", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createAwiaStaffAuthorityDecision(recordA);
    const createdB = await repo.createAwiaStaffAuthorityDecision(recordB);
    assert.equal(createdA.id, recordA.id, "awia_staff_authority_decisions: createX must return the row with the id supplied");
    const listA = await repo.listAwiaStaffAuthorityDecisionsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "awia_staff_authority_decisions: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "awia_staff_authority_decisions: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getAwiaStaffAuthorityDecision(createdA.id);
    assert.ok(fetched, "awia_staff_authority_decisions: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "awia_staff_authority_decisions: getX must return the exact row requested");
    const updated = await repo.updateAwiaStaffAuthorityDecision(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "awia_staff_authority_decisions: updateX must persist the patched record");
    const untouched = await repo.getAwiaStaffAuthorityDecision(createdA.id);
    assert.equal(untouched.id, createdA.id, "awia_staff_authority_decisions: row must still exist and be fetchable after update");
    return "awia_staff_authority_decisions";
  },
  // --- awia_staff_evidence_packs ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("awia_staff_evidence_packs", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("awia_staff_evidence_packs", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createAwiaStaffEvidencePack(recordA);
    const createdB = await repo.createAwiaStaffEvidencePack(recordB);
    assert.equal(createdA.id, recordA.id, "awia_staff_evidence_packs: createX must return the row with the id supplied");
    const listA = await repo.listAwiaStaffEvidencePacksByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "awia_staff_evidence_packs: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "awia_staff_evidence_packs: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getAwiaStaffEvidencePack(createdA.id);
    assert.ok(fetched, "awia_staff_evidence_packs: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "awia_staff_evidence_packs: getX must return the exact row requested");
    const updated = await repo.updateAwiaStaffEvidencePack(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "awia_staff_evidence_packs: updateX must persist the patched record");
    const untouched = await repo.getAwiaStaffEvidencePack(createdA.id);
    assert.equal(untouched.id, createdA.id, "awia_staff_evidence_packs: row must still exist and be fetchable after update");
    return "awia_staff_evidence_packs";
  },
  // --- awia_staff_task_readiness_records ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("awia_staff_task_readiness_records", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("awia_staff_task_readiness_records", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createAwiaStaffTaskReadinessRecord(recordA);
    const createdB = await repo.createAwiaStaffTaskReadinessRecord(recordB);
    assert.equal(createdA.id, recordA.id, "awia_staff_task_readiness_records: createX must return the row with the id supplied");
    const listA = await repo.listAwiaStaffTaskReadinessRecordsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "awia_staff_task_readiness_records: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "awia_staff_task_readiness_records: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getAwiaStaffTaskReadinessRecord(createdA.id);
    assert.ok(fetched, "awia_staff_task_readiness_records: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "awia_staff_task_readiness_records: getX must return the exact row requested");
    const updated = await repo.updateAwiaStaffTaskReadinessRecord(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "awia_staff_task_readiness_records: updateX must persist the patched record");
    const untouched = await repo.getAwiaStaffTaskReadinessRecord(createdA.id);
    assert.equal(untouched.id, createdA.id, "awia_staff_task_readiness_records: row must still exist and be fetchable after update");
    return "awia_staff_task_readiness_records";
  },
  // --- awia_staff_workdesk_items ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("awia_staff_workdesk_items", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("awia_staff_workdesk_items", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createAwiaStaffWorkdeskItem(recordA);
    const createdB = await repo.createAwiaStaffWorkdeskItem(recordB);
    assert.equal(createdA.id, recordA.id, "awia_staff_workdesk_items: createX must return the row with the id supplied");
    const listA = await repo.listAwiaStaffWorkdeskItemsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "awia_staff_workdesk_items: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "awia_staff_workdesk_items: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getAwiaStaffWorkdeskItem(createdA.id);
    assert.ok(fetched, "awia_staff_workdesk_items: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "awia_staff_workdesk_items: getX must return the exact row requested");
    const updated = await repo.updateAwiaStaffWorkdeskItem(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "awia_staff_workdesk_items: updateX must persist the patched record");
    const untouched = await repo.getAwiaStaffWorkdeskItem(createdA.id);
    assert.equal(untouched.id, createdA.id, "awia_staff_workdesk_items: row must still exist and be fetchable after update");
    return "awia_staff_workdesk_items";
  },
  // --- awia_staff_output_drafts ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("awia_staff_output_drafts", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("awia_staff_output_drafts", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createAwiaStaffOutputDraft(recordA);
    const createdB = await repo.createAwiaStaffOutputDraft(recordB);
    assert.equal(createdA.id, recordA.id, "awia_staff_output_drafts: createX must return the row with the id supplied");
    const listA = await repo.listAwiaStaffOutputDraftsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "awia_staff_output_drafts: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "awia_staff_output_drafts: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getAwiaStaffOutputDraft(createdA.id);
    assert.ok(fetched, "awia_staff_output_drafts: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "awia_staff_output_drafts: getX must return the exact row requested");
    const updated = await repo.updateAwiaStaffOutputDraft(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "awia_staff_output_drafts: updateX must persist the patched record");
    const untouched = await repo.getAwiaStaffOutputDraft(createdA.id);
    assert.equal(untouched.id, createdA.id, "awia_staff_output_drafts: row must still exist and be fetchable after update");
    return "awia_staff_output_drafts";
  },
  // --- awia_staff_output_reviews ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("awia_staff_output_reviews", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("awia_staff_output_reviews", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createAwiaStaffOutputReview(recordA);
    const createdB = await repo.createAwiaStaffOutputReview(recordB);
    assert.equal(createdA.id, recordA.id, "awia_staff_output_reviews: createX must return the row with the id supplied");
    const listA = await repo.listAwiaStaffOutputReviewsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "awia_staff_output_reviews: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "awia_staff_output_reviews: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getAwiaStaffOutputReview(createdA.id);
    assert.ok(fetched, "awia_staff_output_reviews: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "awia_staff_output_reviews: getX must return the exact row requested");
    const updated = await repo.updateAwiaStaffOutputReview(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "awia_staff_output_reviews: updateX must persist the patched record");
    const untouched = await repo.getAwiaStaffOutputReview(createdA.id);
    assert.equal(untouched.id, createdA.id, "awia_staff_output_reviews: row must still exist and be fetchable after update");
    return "awia_staff_output_reviews";
  },
  // --- awia_client_delivery_drafts ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("awia_client_delivery_drafts", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("awia_client_delivery_drafts", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createAwiaClientDeliveryDraft(recordA);
    const createdB = await repo.createAwiaClientDeliveryDraft(recordB);
    assert.equal(createdA.id, recordA.id, "awia_client_delivery_drafts: createX must return the row with the id supplied");
    const listA = await repo.listAwiaClientDeliveryDraftsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "awia_client_delivery_drafts: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "awia_client_delivery_drafts: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getAwiaClientDeliveryDraft(createdA.id);
    assert.ok(fetched, "awia_client_delivery_drafts: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "awia_client_delivery_drafts: getX must return the exact row requested");
    const updated = await repo.updateAwiaClientDeliveryDraft(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "awia_client_delivery_drafts: updateX must persist the patched record");
    const untouched = await repo.getAwiaClientDeliveryDraft(createdA.id);
    assert.equal(untouched.id, createdA.id, "awia_client_delivery_drafts: row must still exist and be fetchable after update");
    return "awia_client_delivery_drafts";
  },
  // --- awia_staff_memory_entries ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("awia_staff_memory_entries", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("awia_staff_memory_entries", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createAwiaStaffMemoryEntry(recordA);
    const createdB = await repo.createAwiaStaffMemoryEntry(recordB);
    assert.equal(createdA.id, recordA.id, "awia_staff_memory_entries: createX must return the row with the id supplied");
    const listA = await repo.listAwiaStaffMemoryEntriesByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "awia_staff_memory_entries: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "awia_staff_memory_entries: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getAwiaStaffMemoryEntry(createdA.id);
    assert.ok(fetched, "awia_staff_memory_entries: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "awia_staff_memory_entries: getX must return the exact row requested");
    const updated = await repo.updateAwiaStaffMemoryEntry(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "awia_staff_memory_entries: updateX must persist the patched record");
    const untouched = await repo.getAwiaStaffMemoryEntry(createdA.id);
    assert.equal(untouched.id, createdA.id, "awia_staff_memory_entries: row must still exist and be fetchable after update");
    return "awia_staff_memory_entries";
  },
  // --- awia_staff_conversation_threads ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("awia_staff_conversation_threads", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("awia_staff_conversation_threads", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createAwiaStaffConversationThread(recordA);
    const createdB = await repo.createAwiaStaffConversationThread(recordB);
    assert.equal(createdA.id, recordA.id, "awia_staff_conversation_threads: createX must return the row with the id supplied");
    const listA = await repo.listAwiaStaffConversationThreadsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "awia_staff_conversation_threads: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "awia_staff_conversation_threads: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getAwiaStaffConversationThread(createdA.id);
    assert.ok(fetched, "awia_staff_conversation_threads: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "awia_staff_conversation_threads: getX must return the exact row requested");
    const updated = await repo.updateAwiaStaffConversationThread(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "awia_staff_conversation_threads: updateX must persist the patched record");
    const untouched = await repo.getAwiaStaffConversationThread(createdA.id);
    assert.equal(untouched.id, createdA.id, "awia_staff_conversation_threads: row must still exist and be fetchable after update");
    return "awia_staff_conversation_threads";
  },
  // --- awia_staff_conversation_messages ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("awia_staff_conversation_messages", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("awia_staff_conversation_messages", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createAwiaStaffConversationMessage(recordA);
    const createdB = await repo.createAwiaStaffConversationMessage(recordB);
    assert.equal(createdA.id, recordA.id, "awia_staff_conversation_messages: createX must return the row with the id supplied");
    const listA = await repo.listAwiaStaffConversationMessagesByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "awia_staff_conversation_messages: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "awia_staff_conversation_messages: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getAwiaStaffConversationMessage(createdA.id);
    assert.ok(fetched, "awia_staff_conversation_messages: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "awia_staff_conversation_messages: getX must return the exact row requested");
    const updated = await repo.updateAwiaStaffConversationMessage(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "awia_staff_conversation_messages: updateX must persist the patched record");
    const untouched = await repo.getAwiaStaffConversationMessage(createdA.id);
    assert.equal(untouched.id, createdA.id, "awia_staff_conversation_messages: row must still exist and be fetchable after update");
    return "awia_staff_conversation_messages";
  },
  // --- awia_staff_seat_billing_events ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("awia_staff_seat_billing_events", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("awia_staff_seat_billing_events", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createAwiaStaffSeatBillingEvent(recordA);
    const createdB = await repo.createAwiaStaffSeatBillingEvent(recordB);
    assert.equal(createdA.id, recordA.id, "awia_staff_seat_billing_events: createX must return the row with the id supplied");
    const listA = await repo.listAwiaStaffSeatBillingEventsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "awia_staff_seat_billing_events: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "awia_staff_seat_billing_events: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getAwiaStaffSeatBillingEvent(createdA.id);
    assert.ok(fetched, "awia_staff_seat_billing_events: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "awia_staff_seat_billing_events: getX must return the exact row requested");
    const updated = await repo.updateAwiaStaffSeatBillingEvent(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "awia_staff_seat_billing_events: updateX must persist the patched record");
    const untouched = await repo.getAwiaStaffSeatBillingEvent(createdA.id);
    assert.equal(untouched.id, createdA.id, "awia_staff_seat_billing_events: row must still exist and be fetchable after update");
    return "awia_staff_seat_billing_events";
  },
];

const results = [];
for (const test of tests) {
  results.push(await test());
}
console.log(JSON.stringify({ suite: "my-team-hr.contract.test", tables_passed: results.length, tables: results }, null, 2));
