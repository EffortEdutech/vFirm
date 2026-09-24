// HM-S6 item 4 -- repository contract tests (Client Engagements & Projects (incl. Technical Delivery)).
//
// For every table in this domain: seeds two independent tenant/firm scopes (via fixtures.mjs's
// generic seedRow()/buildRecord(), which walk schema-metadata.mjs to satisfy any required parent
// rows), creates a row in each scope through this domain's OWN createX function (proving createX
// itself, not just the generic insert helper it's built on), then asserts listXByFirm/ByTenant/All
// returns exactly the row(s) in scope and excludes the other scope's row, getX returns the exact
// row, and updateX persists a patched field. Every row is synthetic (fixtures.mjs's placeholder
// values) written to whatever disposable database DATABASE_URL points at -- never live data.
//
// Run with: DATABASE_URL=<disposable-postgres> node apps/api/src/repositories/__tests__/client-engagements-projects.contract.test.mjs
// Exits non-zero (and prints which table/assertion failed) on any failure, so it composes with
// `&&` the same way the rest of this repo's scripts/smoke-*.mjs suite does.

import assert from "node:assert/strict";
import * as repo from "../client-engagements-projects.repo.mjs";
import { seedRow, buildRecord } from "./fixtures.mjs";

const tests = [
  // --- engagements ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("engagements", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("engagements", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createEngagement(recordA);
    const createdB = await repo.createEngagement(recordB);
    assert.equal(createdA.id, recordA.id, "engagements: createX must return the row with the id supplied");
    const listA = await repo.listEngagementsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "engagements: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "engagements: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getEngagement(createdA.id);
    assert.ok(fetched, "engagements: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "engagements: getX must return the exact row requested");
    const newValue = `updated-${Date.now()}`;
    const updated = await repo.updateEngagement(createdA.id, { contract_ref: newValue });
    assert.equal(updated.contract_ref, newValue, "engagements: updateX must persist the patched contract_ref");
    const untouched = await repo.getEngagement(createdA.id);
    assert.equal(untouched.id, createdA.id, "engagements: row must still exist and be fetchable after update");
    return "engagements";
  },
  // --- projects ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("projects", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("projects", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createProject(recordA);
    const createdB = await repo.createProject(recordB);
    assert.equal(createdA.id, recordA.id, "projects: createX must return the row with the id supplied");
    const listA = await repo.listProjectsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "projects: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "projects: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getProject(createdA.id);
    assert.ok(fetched, "projects: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "projects: getX must return the exact row requested");
    const newValue = `updated-${Date.now()}`;
    const updated = await repo.updateProject(createdA.id, { project_name: newValue });
    assert.equal(updated.project_name, newValue, "projects: updateX must persist the patched project_name");
    const untouched = await repo.getProject(createdA.id);
    assert.equal(untouched.id, createdA.id, "projects: row must still exist and be fetchable after update");
    return "projects";
  },
  // --- work_packages ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("work_packages", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("work_packages", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createWorkPackage(recordA);
    const createdB = await repo.createWorkPackage(recordB);
    assert.equal(createdA.id, recordA.id, "work_packages: createX must return the row with the id supplied");
    const listA = await repo.listWorkPackagesByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "work_packages: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "work_packages: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getWorkPackage(createdA.id);
    assert.ok(fetched, "work_packages: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "work_packages: getX must return the exact row requested");
    const updated = await repo.updateWorkPackage(createdA.id, { required_evidence: { contractTestUpdated: true } });
    assert.deepEqual(updated.required_evidence, { contractTestUpdated: true }, "work_packages: updateX must persist the patched required_evidence");
    const untouched = await repo.getWorkPackage(createdA.id);
    assert.equal(untouched.id, createdA.id, "work_packages: row must still exist and be fetchable after update");
    return "work_packages";
  },
  // --- tasks ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("tasks", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("tasks", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createTask(recordA);
    const createdB = await repo.createTask(recordB);
    assert.equal(createdA.id, recordA.id, "tasks: createX must return the row with the id supplied");
    const listA = await repo.listTasksByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "tasks: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "tasks: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getTask(createdA.id);
    assert.ok(fetched, "tasks: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "tasks: getX must return the exact row requested");
    const newValue = `updated-${Date.now()}`;
    const updated = await repo.updateTask(createdA.id, { task_type: newValue });
    assert.equal(updated.task_type, newValue, "tasks: updateX must persist the patched task_type");
    const untouched = await repo.getTask(createdA.id);
    assert.equal(untouched.id, createdA.id, "tasks: row must still exist and be fetchable after update");
    return "tasks";
  },
  // --- technical_skill_bindings ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("technical_skill_bindings", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("technical_skill_bindings", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createTechnicalSkillBinding(recordA);
    const createdB = await repo.createTechnicalSkillBinding(recordB);
    assert.equal(createdA.id, recordA.id, "technical_skill_bindings: createX must return the row with the id supplied");
    const listA = await repo.listTechnicalSkillBindingsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "technical_skill_bindings: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "technical_skill_bindings: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getTechnicalSkillBinding(createdA.id);
    assert.ok(fetched, "technical_skill_bindings: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "technical_skill_bindings: getX must return the exact row requested");
    const updated = await repo.updateTechnicalSkillBinding(createdA.id, { permissions: { contractTestUpdated: true } });
    assert.deepEqual(updated.permissions, { contractTestUpdated: true }, "technical_skill_bindings: updateX must persist the patched permissions");
    const untouched = await repo.getTechnicalSkillBinding(createdA.id);
    assert.equal(untouched.id, createdA.id, "technical_skill_bindings: row must still exist and be fetchable after update");
    return "technical_skill_bindings";
  },
  // --- drawing_review_records ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("drawing_review_records", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("drawing_review_records", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createDrawingReviewRecord(recordA);
    const createdB = await repo.createDrawingReviewRecord(recordB);
    assert.equal(createdA.id, recordA.id, "drawing_review_records: createX must return the row with the id supplied");
    const listA = await repo.listDrawingReviewRecordsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "drawing_review_records: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "drawing_review_records: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getDrawingReviewRecord(createdA.id);
    assert.ok(fetched, "drawing_review_records: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "drawing_review_records: getX must return the exact row requested");
    const updated = await repo.updateDrawingReviewRecord(createdA.id, { metadata: { contractTestUpdated: true } });
    assert.deepEqual(updated.metadata, { contractTestUpdated: true }, "drawing_review_records: updateX must persist the patched metadata");
    const untouched = await repo.getDrawingReviewRecord(createdA.id);
    assert.equal(untouched.id, createdA.id, "drawing_review_records: row must still exist and be fetchable after update");
    return "drawing_review_records";
  },
  // --- calculation_input_sets ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("calculation_input_sets", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("calculation_input_sets", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createCalculationInputSet(recordA);
    const createdB = await repo.createCalculationInputSet(recordB);
    assert.equal(createdA.id, recordA.id, "calculation_input_sets: createX must return the row with the id supplied");
    const listA = await repo.listCalculationInputSetsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "calculation_input_sets: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "calculation_input_sets: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getCalculationInputSet(createdA.id);
    assert.ok(fetched, "calculation_input_sets: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "calculation_input_sets: getX must return the exact row requested");
    const updated = await repo.updateCalculationInputSet(createdA.id, { source_revision_refs: { contractTestUpdated: true } });
    assert.deepEqual(updated.source_revision_refs, { contractTestUpdated: true }, "calculation_input_sets: updateX must persist the patched source_revision_refs");
    const untouched = await repo.getCalculationInputSet(createdA.id);
    assert.equal(untouched.id, createdA.id, "calculation_input_sets: row must still exist and be fetchable after update");
    return "calculation_input_sets";
  },
  // --- technical_qa_findings ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("technical_qa_findings", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("technical_qa_findings", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createTechnicalQaFinding(recordA);
    const createdB = await repo.createTechnicalQaFinding(recordB);
    assert.equal(createdA.id, recordA.id, "technical_qa_findings: createX must return the row with the id supplied");
    const listA = await repo.listTechnicalQaFindingsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "technical_qa_findings: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "technical_qa_findings: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getTechnicalQaFinding(createdA.id);
    assert.ok(fetched, "technical_qa_findings: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "technical_qa_findings: getX must return the exact row requested");
    const updated = await repo.updateTechnicalQaFinding(createdA.id, { metadata: { contractTestUpdated: true } });
    assert.deepEqual(updated.metadata, { contractTestUpdated: true }, "technical_qa_findings: updateX must persist the patched metadata");
    const untouched = await repo.getTechnicalQaFinding(createdA.id);
    assert.equal(untouched.id, createdA.id, "technical_qa_findings: row must still exist and be fetchable after update");
    return "technical_qa_findings";
  },
  // --- delivery_package_records ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("delivery_package_records", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("delivery_package_records", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createDeliveryPackageRecord(recordA);
    const createdB = await repo.createDeliveryPackageRecord(recordB);
    assert.equal(createdA.id, recordA.id, "delivery_package_records: createX must return the row with the id supplied");
    const listA = await repo.listDeliveryPackageRecordsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "delivery_package_records: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "delivery_package_records: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getDeliveryPackageRecord(createdA.id);
    assert.ok(fetched, "delivery_package_records: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "delivery_package_records: getX must return the exact row requested");
    const updated = await repo.updateDeliveryPackageRecord(createdA.id, { drawing_revision_refs: { contractTestUpdated: true } });
    assert.deepEqual(updated.drawing_revision_refs, { contractTestUpdated: true }, "delivery_package_records: updateX must persist the patched drawing_revision_refs");
    const untouched = await repo.getDeliveryPackageRecord(createdA.id);
    assert.equal(untouched.id, createdA.id, "delivery_package_records: row must still exist and be fetchable after update");
    return "delivery_package_records";
  },
  // --- pilot_handoff_records ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("pilot_handoff_records", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("pilot_handoff_records", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createPilotHandoffRecord(recordA);
    const createdB = await repo.createPilotHandoffRecord(recordB);
    assert.equal(createdA.id, recordA.id, "pilot_handoff_records: createX must return the row with the id supplied");
    const listA = await repo.listPilotHandoffRecordsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "pilot_handoff_records: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "pilot_handoff_records: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getPilotHandoffRecord(createdA.id);
    assert.ok(fetched, "pilot_handoff_records: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "pilot_handoff_records: getX must return the exact row requested");
    const updated = await repo.updatePilotHandoffRecord(createdA.id, { evidence_refs: { contractTestUpdated: true } });
    assert.deepEqual(updated.evidence_refs, { contractTestUpdated: true }, "pilot_handoff_records: updateX must persist the patched evidence_refs");
    const untouched = await repo.getPilotHandoffRecord(createdA.id);
    assert.equal(untouched.id, createdA.id, "pilot_handoff_records: row must still exist and be fetchable after update");
    return "pilot_handoff_records";
  },
];

const results = [];
for (const test of tests) {
  results.push(await test());
}
console.log(JSON.stringify({ suite: "client-engagements-projects.contract.test", tables_passed: results.length, tables: results }, null, 2));
