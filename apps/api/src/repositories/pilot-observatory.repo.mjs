// HM-S6 item 3 -- repository layer scaffolding (Pilot & Observatory).
//
// One targeted, tenant/firm-scoped SQL function per table in this domain -- getX/listXByFirm (or
// ByTenant/All where the table isn't firm-scoped)/createX/updateX -- issued directly against
// Postgres via the shared pool in ./shared/db.mjs. No dependency on loadStore()/saveStore() or the
// whole-store object in ../store.mjs.
//
// Built alongside the existing store.mjs, not replacing anything yet: nothing in the running app
// calls these functions as of this sprint item. HM-S7/HM-S8 migrate real handlers onto this layer,
// table by table, once HM-S6 item 4's contract tests have proven it correct in isolation.
//
// Column lists are generated directly from infra/database/migrations/*.sql (0001, 0024, 0025, 0026,
// 0027) -- see docs/hm-s6-handler-data-contract.md for this domain's collection list and the
// per-handler data contract each of these tables backs.

import { query, insertRow, updateRowById } from "./shared/db.mjs";

// --- pilot_users ---
const PILOT_USERS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "person_id", jsonb: false }, { name: "actor_id", jsonb: false }, { name: "email", jsonb: false }, { name: "display_name", jsonb: false }, { name: "pilot_role", jsonb: false }, { name: "invite_status", jsonb: false }, { name: "auth_provider", jsonb: false }, { name: "external_subject", jsonb: false }, { name: "invited_at", jsonb: false }, { name: "activated_at", jsonb: false }, { name: "revoked_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listPilotUsersByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from pilot_users where tenant_id = $1 and firm_id = $2 order by invited_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getPilotUser(id) {
  const { rows } = await query(`select * from pilot_users where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createPilotUser(record, client = null) {
  return insertRow("pilot_users", PILOT_USERS_COLUMNS, record, client);
}

export async function updatePilotUser(id, patch, client = null) {
  return updateRowById("pilot_users", PILOT_USERS_COLUMNS, id, patch, client);
}

// --- support_cases ---
const SUPPORT_CASES_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "opened_by_actor_id", jsonb: false }, { name: "related_pilot_user_id", jsonb: false }, { name: "case_type", jsonb: false }, { name: "severity", jsonb: false }, { name: "status", jsonb: false }, { name: "subject", jsonb: false }, { name: "description", jsonb: false }, { name: "resolution_summary", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "closed_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listSupportCasesByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from support_cases where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getSupportCase(id) {
  const { rows } = await query(`select * from support_cases where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createSupportCase(record, client = null) {
  return insertRow("support_cases", SUPPORT_CASES_COLUMNS, record, client);
}

export async function updateSupportCase(id, patch, client = null) {
  return updateRowById("support_cases", SUPPORT_CASES_COLUMNS, id, patch, client);
}

// --- pilot_incidents ---
const PILOT_INCIDENTS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "support_case_id", jsonb: false }, { name: "project_id", jsonb: false }, { name: "opened_by_actor_id", jsonb: false }, { name: "incident_type", jsonb: false }, { name: "severity", jsonb: false }, { name: "status", jsonb: false }, { name: "title", jsonb: false }, { name: "description", jsonb: false }, { name: "detection_source", jsonb: false }, { name: "impact_summary", jsonb: false }, { name: "mitigation_summary", jsonb: false }, { name: "root_cause_summary", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "resolved_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listPilotIncidentsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from pilot_incidents where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getPilotIncident(id) {
  const { rows } = await query(`select * from pilot_incidents where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createPilotIncident(record, client = null) {
  return insertRow("pilot_incidents", PILOT_INCIDENTS_COLUMNS, record, client);
}

export async function updatePilotIncident(id, patch, client = null) {
  return updateRowById("pilot_incidents", PILOT_INCIDENTS_COLUMNS, id, patch, client);
}

// --- pilot_feedback ---
const PILOT_FEEDBACK_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "pilot_user_id", jsonb: false }, { name: "project_id", jsonb: false }, { name: "submitted_by_actor_id", jsonb: false }, { name: "feedback_type", jsonb: false }, { name: "sentiment", jsonb: false }, { name: "rating", jsonb: false }, { name: "subject", jsonb: false }, { name: "feedback_text", jsonb: false }, { name: "created_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listPilotFeedbackByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from pilot_feedback where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getPilotFeedback(id) {
  const { rows } = await query(`select * from pilot_feedback where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createPilotFeedback(record, client = null) {
  return insertRow("pilot_feedback", PILOT_FEEDBACK_COLUMNS, record, client);
}

export async function updatePilotFeedback(id, patch, client = null) {
  return updateRowById("pilot_feedback", PILOT_FEEDBACK_COLUMNS, id, patch, client);
}

// --- pilot_acceptance_reviews ---
const PILOT_ACCEPTANCE_REVIEWS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "reviewed_by_actor_id", jsonb: false }, { name: "review_scope", jsonb: false }, { name: "criteria", jsonb: true }, { name: "decision", jsonb: false }, { name: "evidence_refs", jsonb: true }, { name: "notes", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listPilotAcceptanceReviewsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from pilot_acceptance_reviews where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getPilotAcceptanceReview(id) {
  const { rows } = await query(`select * from pilot_acceptance_reviews where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createPilotAcceptanceReview(record, client = null) {
  return insertRow("pilot_acceptance_reviews", PILOT_ACCEPTANCE_REVIEWS_COLUMNS, record, client);
}

export async function updatePilotAcceptanceReview(id, patch, client = null) {
  return updateRowById("pilot_acceptance_reviews", PILOT_ACCEPTANCE_REVIEWS_COLUMNS, id, patch, client);
}

// --- pilot_improvement_items ---
const PILOT_IMPROVEMENT_ITEMS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "feedback_id", jsonb: false }, { name: "acceptance_review_id", jsonb: false }, { name: "owner_actor_id", jsonb: false }, { name: "item_type", jsonb: false }, { name: "priority", jsonb: false }, { name: "status", jsonb: false }, { name: "title", jsonb: false }, { name: "description", jsonb: false }, { name: "target_stage", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "closed_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listPilotImprovementItemsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from pilot_improvement_items where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getPilotImprovementItem(id) {
  const { rows } = await query(`select * from pilot_improvement_items where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createPilotImprovementItem(record, client = null) {
  return insertRow("pilot_improvement_items", PILOT_IMPROVEMENT_ITEMS_COLUMNS, record, client);
}

export async function updatePilotImprovementItem(id, patch, client = null) {
  return updateRowById("pilot_improvement_items", PILOT_IMPROVEMENT_ITEMS_COLUMNS, id, patch, client);
}

// --- pilot_report_packs ---
const PILOT_REPORT_PACKS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "generated_by_actor_id", jsonb: false }, { name: "report_scope", jsonb: false }, { name: "report_status", jsonb: false }, { name: "summary", jsonb: true }, { name: "export_manifest", jsonb: true }, { name: "created_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listPilotReportPacksByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from pilot_report_packs where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getPilotReportPack(id) {
  const { rows } = await query(`select * from pilot_report_packs where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createPilotReportPack(record, client = null) {
  return insertRow("pilot_report_packs", PILOT_REPORT_PACKS_COLUMNS, record, client);
}

export async function updatePilotReportPack(id, patch, client = null) {
  return updateRowById("pilot_report_packs", PILOT_REPORT_PACKS_COLUMNS, id, patch, client);
}

// --- stakeholder_review_boards ---
const STAKEHOLDER_REVIEW_BOARDS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "report_pack_id", jsonb: false }, { name: "chaired_by_actor_id", jsonb: false }, { name: "board_name", jsonb: false }, { name: "review_status", jsonb: false }, { name: "agenda", jsonb: true }, { name: "attendees", jsonb: true }, { name: "scheduled_at", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "closed_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listStakeholderReviewBoardsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from stakeholder_review_boards where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getStakeholderReviewBoard(id) {
  const { rows } = await query(`select * from stakeholder_review_boards where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createStakeholderReviewBoard(record, client = null) {
  return insertRow("stakeholder_review_boards", STAKEHOLDER_REVIEW_BOARDS_COLUMNS, record, client);
}

export async function updateStakeholderReviewBoard(id, patch, client = null) {
  return updateRowById("stakeholder_review_boards", STAKEHOLDER_REVIEW_BOARDS_COLUMNS, id, patch, client);
}

// --- stakeholder_review_decisions ---
const STAKEHOLDER_REVIEW_DECISIONS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "board_id", jsonb: false }, { name: "decided_by_actor_id", jsonb: false }, { name: "decision", jsonb: false }, { name: "decision_summary", jsonb: false }, { name: "conditions", jsonb: true }, { name: "next_stage", jsonb: false }, { name: "decided_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listStakeholderReviewDecisionsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from stakeholder_review_decisions where tenant_id = $1 and firm_id = $2 order by decided_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getStakeholderReviewDecision(id) {
  const { rows } = await query(`select * from stakeholder_review_decisions where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createStakeholderReviewDecision(record, client = null) {
  return insertRow("stakeholder_review_decisions", STAKEHOLDER_REVIEW_DECISIONS_COLUMNS, record, client);
}

export async function updateStakeholderReviewDecision(id, patch, client = null) {
  return updateRowById("stakeholder_review_decisions", STAKEHOLDER_REVIEW_DECISIONS_COLUMNS, id, patch, client);
}

// --- pilot_expansion_cohorts ---
const PILOT_EXPANSION_COHORTS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "stakeholder_decision_id", jsonb: false }, { name: "created_by_actor_id", jsonb: false }, { name: "cohort_name", jsonb: false }, { name: "expansion_status", jsonb: false }, { name: "max_tenants", jsonb: false }, { name: "max_pilot_users", jsonb: false }, { name: "entry_criteria", jsonb: true }, { name: "risk_controls", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listPilotExpansionCohortsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from pilot_expansion_cohorts where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getPilotExpansionCohort(id) {
  const { rows } = await query(`select * from pilot_expansion_cohorts where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createPilotExpansionCohort(record, client = null) {
  return insertRow("pilot_expansion_cohorts", PILOT_EXPANSION_COHORTS_COLUMNS, record, client);
}

export async function updatePilotExpansionCohort(id, patch, client = null) {
  return updateRowById("pilot_expansion_cohorts", PILOT_EXPANSION_COHORTS_COLUMNS, id, patch, client);
}

// --- tenant_onboarding_plans ---
const TENANT_ONBOARDING_PLANS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "expansion_cohort_id", jsonb: false }, { name: "assigned_operator_actor_id", jsonb: false }, { name: "onboarding_status", jsonb: false }, { name: "onboarding_steps", jsonb: true }, { name: "readiness_checks", jsonb: true }, { name: "target_start_at", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "completed_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listTenantOnboardingPlansByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from tenant_onboarding_plans where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getTenantOnboardingPlan(id) {
  const { rows } = await query(`select * from tenant_onboarding_plans where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createTenantOnboardingPlan(record, client = null) {
  return insertRow("tenant_onboarding_plans", TENANT_ONBOARDING_PLANS_COLUMNS, record, client);
}

export async function updateTenantOnboardingPlan(id, patch, client = null) {
  return updateRowById("tenant_onboarding_plans", TENANT_ONBOARDING_PLANS_COLUMNS, id, patch, client);
}

// --- release_candidate_gates ---
const RELEASE_CANDIDATE_GATES_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "expansion_cohort_id", jsonb: false }, { name: "reviewed_by_actor_id", jsonb: false }, { name: "release_candidate", jsonb: false }, { name: "gate_status", jsonb: false }, { name: "required_checks", jsonb: true }, { name: "evidence_refs", jsonb: true }, { name: "decision_summary", jsonb: false }, { name: "created_at", jsonb: false }, { name: "decided_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listReleaseCandidateGatesByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from release_candidate_gates where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getReleaseCandidateGate(id) {
  const { rows } = await query(`select * from release_candidate_gates where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createReleaseCandidateGate(record, client = null) {
  return insertRow("release_candidate_gates", RELEASE_CANDIDATE_GATES_COLUMNS, record, client);
}

export async function updateReleaseCandidateGate(id, patch, client = null) {
  return updateRowById("release_candidate_gates", RELEASE_CANDIDATE_GATES_COLUMNS, id, patch, client);
}

// --- tenant_pilot_controls ---
const TENANT_PILOT_CONTROLS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "created_by_actor_id", jsonb: false }, { name: "control_status", jsonb: false }, { name: "plan_code", jsonb: false }, { name: "limits", jsonb: true }, { name: "billing_readiness", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listTenantPilotControlsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from tenant_pilot_controls where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getTenantPilotControl(id) {
  const { rows } = await query(`select * from tenant_pilot_controls where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createTenantPilotControl(record, client = null) {
  return insertRow("tenant_pilot_controls", TENANT_PILOT_CONTROLS_COLUMNS, record, client);
}

export async function updateTenantPilotControl(id, patch, client = null) {
  return updateRowById("tenant_pilot_controls", TENANT_PILOT_CONTROLS_COLUMNS, id, patch, client);
}
