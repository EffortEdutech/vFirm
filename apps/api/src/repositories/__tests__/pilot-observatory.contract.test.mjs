// HM-S6 item 4 -- repository contract tests (Pilot & Observatory).
//
// For every table in this domain: seeds two independent tenant/firm scopes (via fixtures.mjs's
// generic seedRow()/buildRecord(), which walk schema-metadata.mjs to satisfy any required parent
// rows), creates a row in each scope through this domain's OWN createX function (proving createX
// itself, not just the generic insert helper it's built on), then asserts listXByFirm/ByTenant/All
// returns exactly the row(s) in scope and excludes the other scope's row, getX returns the exact
// row, and updateX persists a patched field. Every row is synthetic (fixtures.mjs's placeholder
// values) written to whatever disposable database DATABASE_URL points at -- never live data.
//
// Run with: DATABASE_URL=<disposable-postgres> node apps/api/src/repositories/__tests__/pilot-observatory.contract.test.mjs
// Exits non-zero (and prints which table/assertion failed) on any failure, so it composes with
// `&&` the same way the rest of this repo's scripts/smoke-*.mjs suite does.

import assert from "node:assert/strict";
import * as repo from "../pilot-observatory.repo.mjs";
import { seedRow, buildRecord } from "./fixtures.mjs";

const tests = [
  // --- pilot_users ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("pilot_users", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("pilot_users", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createPilotUser(recordA);
    const createdB = await repo.createPilotUser(recordB);
    assert.equal(createdA.id, recordA.id, "pilot_users: createX must return the row with the id supplied");
    const listA = await repo.listPilotUsersByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "pilot_users: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "pilot_users: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getPilotUser(createdA.id);
    assert.ok(fetched, "pilot_users: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "pilot_users: getX must return the exact row requested");
    const updated = await repo.updatePilotUser(createdA.id, { metadata: { contractTestUpdated: true } });
    assert.deepEqual(updated.metadata, { contractTestUpdated: true }, "pilot_users: updateX must persist the patched metadata");
    const untouched = await repo.getPilotUser(createdA.id);
    assert.equal(untouched.id, createdA.id, "pilot_users: row must still exist and be fetchable after update");
    return "pilot_users";
  },
  // --- support_cases ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("support_cases", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("support_cases", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createSupportCase(recordA);
    const createdB = await repo.createSupportCase(recordB);
    assert.equal(createdA.id, recordA.id, "support_cases: createX must return the row with the id supplied");
    const listA = await repo.listSupportCasesByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "support_cases: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "support_cases: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getSupportCase(createdA.id);
    assert.ok(fetched, "support_cases: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "support_cases: getX must return the exact row requested");
    const updated = await repo.updateSupportCase(createdA.id, { metadata: { contractTestUpdated: true } });
    assert.deepEqual(updated.metadata, { contractTestUpdated: true }, "support_cases: updateX must persist the patched metadata");
    const untouched = await repo.getSupportCase(createdA.id);
    assert.equal(untouched.id, createdA.id, "support_cases: row must still exist and be fetchable after update");
    return "support_cases";
  },
  // --- pilot_incidents ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("pilot_incidents", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("pilot_incidents", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createPilotIncident(recordA);
    const createdB = await repo.createPilotIncident(recordB);
    assert.equal(createdA.id, recordA.id, "pilot_incidents: createX must return the row with the id supplied");
    const listA = await repo.listPilotIncidentsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "pilot_incidents: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "pilot_incidents: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getPilotIncident(createdA.id);
    assert.ok(fetched, "pilot_incidents: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "pilot_incidents: getX must return the exact row requested");
    const updated = await repo.updatePilotIncident(createdA.id, { metadata: { contractTestUpdated: true } });
    assert.deepEqual(updated.metadata, { contractTestUpdated: true }, "pilot_incidents: updateX must persist the patched metadata");
    const untouched = await repo.getPilotIncident(createdA.id);
    assert.equal(untouched.id, createdA.id, "pilot_incidents: row must still exist and be fetchable after update");
    return "pilot_incidents";
  },
  // --- pilot_feedback ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("pilot_feedback", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("pilot_feedback", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createPilotFeedback(recordA);
    const createdB = await repo.createPilotFeedback(recordB);
    assert.equal(createdA.id, recordA.id, "pilot_feedback: createX must return the row with the id supplied");
    const listA = await repo.listPilotFeedbackByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "pilot_feedback: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "pilot_feedback: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getPilotFeedback(createdA.id);
    assert.ok(fetched, "pilot_feedback: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "pilot_feedback: getX must return the exact row requested");
    const updated = await repo.updatePilotFeedback(createdA.id, { metadata: { contractTestUpdated: true } });
    assert.deepEqual(updated.metadata, { contractTestUpdated: true }, "pilot_feedback: updateX must persist the patched metadata");
    const untouched = await repo.getPilotFeedback(createdA.id);
    assert.equal(untouched.id, createdA.id, "pilot_feedback: row must still exist and be fetchable after update");
    return "pilot_feedback";
  },
  // --- pilot_acceptance_reviews ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("pilot_acceptance_reviews", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("pilot_acceptance_reviews", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createPilotAcceptanceReview(recordA);
    const createdB = await repo.createPilotAcceptanceReview(recordB);
    assert.equal(createdA.id, recordA.id, "pilot_acceptance_reviews: createX must return the row with the id supplied");
    const listA = await repo.listPilotAcceptanceReviewsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "pilot_acceptance_reviews: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "pilot_acceptance_reviews: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getPilotAcceptanceReview(createdA.id);
    assert.ok(fetched, "pilot_acceptance_reviews: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "pilot_acceptance_reviews: getX must return the exact row requested");
    const updated = await repo.updatePilotAcceptanceReview(createdA.id, { criteria: { contractTestUpdated: true } });
    assert.deepEqual(updated.criteria, { contractTestUpdated: true }, "pilot_acceptance_reviews: updateX must persist the patched criteria");
    const untouched = await repo.getPilotAcceptanceReview(createdA.id);
    assert.equal(untouched.id, createdA.id, "pilot_acceptance_reviews: row must still exist and be fetchable after update");
    return "pilot_acceptance_reviews";
  },
  // --- pilot_improvement_items ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("pilot_improvement_items", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("pilot_improvement_items", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createPilotImprovementItem(recordA);
    const createdB = await repo.createPilotImprovementItem(recordB);
    assert.equal(createdA.id, recordA.id, "pilot_improvement_items: createX must return the row with the id supplied");
    const listA = await repo.listPilotImprovementItemsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "pilot_improvement_items: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "pilot_improvement_items: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getPilotImprovementItem(createdA.id);
    assert.ok(fetched, "pilot_improvement_items: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "pilot_improvement_items: getX must return the exact row requested");
    const updated = await repo.updatePilotImprovementItem(createdA.id, { metadata: { contractTestUpdated: true } });
    assert.deepEqual(updated.metadata, { contractTestUpdated: true }, "pilot_improvement_items: updateX must persist the patched metadata");
    const untouched = await repo.getPilotImprovementItem(createdA.id);
    assert.equal(untouched.id, createdA.id, "pilot_improvement_items: row must still exist and be fetchable after update");
    return "pilot_improvement_items";
  },
  // --- pilot_report_packs ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("pilot_report_packs", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("pilot_report_packs", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createPilotReportPack(recordA);
    const createdB = await repo.createPilotReportPack(recordB);
    assert.equal(createdA.id, recordA.id, "pilot_report_packs: createX must return the row with the id supplied");
    const listA = await repo.listPilotReportPacksByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "pilot_report_packs: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "pilot_report_packs: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getPilotReportPack(createdA.id);
    assert.ok(fetched, "pilot_report_packs: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "pilot_report_packs: getX must return the exact row requested");
    const updated = await repo.updatePilotReportPack(createdA.id, { summary: { contractTestUpdated: true } });
    assert.deepEqual(updated.summary, { contractTestUpdated: true }, "pilot_report_packs: updateX must persist the patched summary");
    const untouched = await repo.getPilotReportPack(createdA.id);
    assert.equal(untouched.id, createdA.id, "pilot_report_packs: row must still exist and be fetchable after update");
    return "pilot_report_packs";
  },
  // --- stakeholder_review_boards ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("stakeholder_review_boards", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("stakeholder_review_boards", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createStakeholderReviewBoard(recordA);
    const createdB = await repo.createStakeholderReviewBoard(recordB);
    assert.equal(createdA.id, recordA.id, "stakeholder_review_boards: createX must return the row with the id supplied");
    const listA = await repo.listStakeholderReviewBoardsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "stakeholder_review_boards: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "stakeholder_review_boards: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getStakeholderReviewBoard(createdA.id);
    assert.ok(fetched, "stakeholder_review_boards: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "stakeholder_review_boards: getX must return the exact row requested");
    const updated = await repo.updateStakeholderReviewBoard(createdA.id, { agenda: { contractTestUpdated: true } });
    assert.deepEqual(updated.agenda, { contractTestUpdated: true }, "stakeholder_review_boards: updateX must persist the patched agenda");
    const untouched = await repo.getStakeholderReviewBoard(createdA.id);
    assert.equal(untouched.id, createdA.id, "stakeholder_review_boards: row must still exist and be fetchable after update");
    return "stakeholder_review_boards";
  },
  // --- stakeholder_review_decisions ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("stakeholder_review_decisions", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("stakeholder_review_decisions", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createStakeholderReviewDecision(recordA);
    const createdB = await repo.createStakeholderReviewDecision(recordB);
    assert.equal(createdA.id, recordA.id, "stakeholder_review_decisions: createX must return the row with the id supplied");
    const listA = await repo.listStakeholderReviewDecisionsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "stakeholder_review_decisions: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "stakeholder_review_decisions: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getStakeholderReviewDecision(createdA.id);
    assert.ok(fetched, "stakeholder_review_decisions: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "stakeholder_review_decisions: getX must return the exact row requested");
    const updated = await repo.updateStakeholderReviewDecision(createdA.id, { conditions: { contractTestUpdated: true } });
    assert.deepEqual(updated.conditions, { contractTestUpdated: true }, "stakeholder_review_decisions: updateX must persist the patched conditions");
    const untouched = await repo.getStakeholderReviewDecision(createdA.id);
    assert.equal(untouched.id, createdA.id, "stakeholder_review_decisions: row must still exist and be fetchable after update");
    return "stakeholder_review_decisions";
  },
  // --- pilot_expansion_cohorts ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("pilot_expansion_cohorts", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("pilot_expansion_cohorts", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createPilotExpansionCohort(recordA);
    const createdB = await repo.createPilotExpansionCohort(recordB);
    assert.equal(createdA.id, recordA.id, "pilot_expansion_cohorts: createX must return the row with the id supplied");
    const listA = await repo.listPilotExpansionCohortsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "pilot_expansion_cohorts: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "pilot_expansion_cohorts: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getPilotExpansionCohort(createdA.id);
    assert.ok(fetched, "pilot_expansion_cohorts: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "pilot_expansion_cohorts: getX must return the exact row requested");
    const updated = await repo.updatePilotExpansionCohort(createdA.id, { entry_criteria: { contractTestUpdated: true } });
    assert.deepEqual(updated.entry_criteria, { contractTestUpdated: true }, "pilot_expansion_cohorts: updateX must persist the patched entry_criteria");
    const untouched = await repo.getPilotExpansionCohort(createdA.id);
    assert.equal(untouched.id, createdA.id, "pilot_expansion_cohorts: row must still exist and be fetchable after update");
    return "pilot_expansion_cohorts";
  },
  // --- tenant_onboarding_plans ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("tenant_onboarding_plans", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("tenant_onboarding_plans", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createTenantOnboardingPlan(recordA);
    const createdB = await repo.createTenantOnboardingPlan(recordB);
    assert.equal(createdA.id, recordA.id, "tenant_onboarding_plans: createX must return the row with the id supplied");
    const listA = await repo.listTenantOnboardingPlansByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "tenant_onboarding_plans: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "tenant_onboarding_plans: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getTenantOnboardingPlan(createdA.id);
    assert.ok(fetched, "tenant_onboarding_plans: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "tenant_onboarding_plans: getX must return the exact row requested");
    const updated = await repo.updateTenantOnboardingPlan(createdA.id, { onboarding_steps: { contractTestUpdated: true } });
    assert.deepEqual(updated.onboarding_steps, { contractTestUpdated: true }, "tenant_onboarding_plans: updateX must persist the patched onboarding_steps");
    const untouched = await repo.getTenantOnboardingPlan(createdA.id);
    assert.equal(untouched.id, createdA.id, "tenant_onboarding_plans: row must still exist and be fetchable after update");
    return "tenant_onboarding_plans";
  },
  // --- release_candidate_gates ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("release_candidate_gates", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("release_candidate_gates", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createReleaseCandidateGate(recordA);
    const createdB = await repo.createReleaseCandidateGate(recordB);
    assert.equal(createdA.id, recordA.id, "release_candidate_gates: createX must return the row with the id supplied");
    const listA = await repo.listReleaseCandidateGatesByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "release_candidate_gates: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "release_candidate_gates: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getReleaseCandidateGate(createdA.id);
    assert.ok(fetched, "release_candidate_gates: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "release_candidate_gates: getX must return the exact row requested");
    const updated = await repo.updateReleaseCandidateGate(createdA.id, { required_checks: { contractTestUpdated: true } });
    assert.deepEqual(updated.required_checks, { contractTestUpdated: true }, "release_candidate_gates: updateX must persist the patched required_checks");
    const untouched = await repo.getReleaseCandidateGate(createdA.id);
    assert.equal(untouched.id, createdA.id, "release_candidate_gates: row must still exist and be fetchable after update");
    return "release_candidate_gates";
  },
  // --- tenant_pilot_controls ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("tenant_pilot_controls", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("tenant_pilot_controls", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createTenantPilotControl(recordA);
    const createdB = await repo.createTenantPilotControl(recordB);
    assert.equal(createdA.id, recordA.id, "tenant_pilot_controls: createX must return the row with the id supplied");
    const listA = await repo.listTenantPilotControlsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "tenant_pilot_controls: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "tenant_pilot_controls: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getTenantPilotControl(createdA.id);
    assert.ok(fetched, "tenant_pilot_controls: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "tenant_pilot_controls: getX must return the exact row requested");
    const updated = await repo.updateTenantPilotControl(createdA.id, { limits: { contractTestUpdated: true } });
    assert.deepEqual(updated.limits, { contractTestUpdated: true }, "tenant_pilot_controls: updateX must persist the patched limits");
    const untouched = await repo.getTenantPilotControl(createdA.id);
    assert.equal(untouched.id, createdA.id, "tenant_pilot_controls: row must still exist and be fetchable after update");
    return "tenant_pilot_controls";
  },
];

const results = [];
for (const test of tests) {
  results.push(await test());
}
console.log(JSON.stringify({ suite: "pilot-observatory.contract.test", tables_passed: results.length, tables: results }, null, 2));
