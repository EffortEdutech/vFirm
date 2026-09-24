// HM-S6 item 3 -- repository layer scaffolding (Client Engagements & Projects (incl. Technical Delivery)).
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

// --- engagements ---
const ENGAGEMENTS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "relationship_id", jsonb: false }, { name: "proposal_id", jsonb: false }, { name: "contract_ref", jsonb: false }, { name: "scope_ref", jsonb: false }, { name: "commercial_terms_ref", jsonb: false }, { name: "acceptance_criteria_ref", jsonb: false }, { name: "status", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listEngagementsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from engagements where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getEngagement(id) {
  const { rows } = await query(`select * from engagements where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createEngagement(record) {
  return insertRow("engagements", ENGAGEMENTS_COLUMNS, record);
}

export async function updateEngagement(id, patch) {
  return updateRowById("engagements", ENGAGEMENTS_COLUMNS, id, patch);
}

// --- projects ---
const PROJECTS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "relationship_id", jsonb: false }, { name: "engagement_id", jsonb: false }, { name: "service_id", jsonb: false }, { name: "project_name", jsonb: false }, { name: "project_state", jsonb: false }, { name: "risk_class", jsonb: false }, { name: "responsible_professional_id", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listProjectsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from projects where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getProject(id) {
  const { rows } = await query(`select * from projects where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createProject(record) {
  return insertRow("projects", PROJECTS_COLUMNS, record);
}

export async function updateProject(id, patch) {
  return updateRowById("projects", PROJECTS_COLUMNS, id, patch);
}

// --- work_packages ---
const WORK_PACKAGES_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "project_id", jsonb: false }, { name: "service_step", jsonb: false }, { name: "assigned_worker_instance_id", jsonb: false }, { name: "assigned_human_actor_id", jsonb: false }, { name: "state", jsonb: false }, { name: "required_evidence", jsonb: true }, { name: "approval_requirement_id", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listWorkPackagesByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from work_packages where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getWorkPackage(id) {
  const { rows } = await query(`select * from work_packages where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createWorkPackage(record) {
  return insertRow("work_packages", WORK_PACKAGES_COLUMNS, record);
}

export async function updateWorkPackage(id, patch) {
  return updateRowById("work_packages", WORK_PACKAGES_COLUMNS, id, patch);
}

// --- tasks ---
const TASKS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "project_id", jsonb: false }, { name: "work_package_id", jsonb: false }, { name: "task_type", jsonb: false }, { name: "input_ref", jsonb: false }, { name: "output_ref", jsonb: false }, { name: "assigned_actor_or_worker_ref", jsonb: false }, { name: "state", jsonb: false }, { name: "risk_class", jsonb: false }, { name: "due_at", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listTasksByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from tasks where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getTask(id) {
  const { rows } = await query(`select * from tasks where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createTask(record) {
  return insertRow("tasks", TASKS_COLUMNS, record);
}

export async function updateTask(id, patch) {
  return updateRowById("tasks", TASKS_COLUMNS, id, patch);
}

// --- technical_skill_bindings ---
const TECHNICAL_SKILL_BINDINGS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "worker_template_code", jsonb: false }, { name: "role_skill_ref", jsonb: false }, { name: "worker_skill_ref", jsonb: false }, { name: "input_schema_ref", jsonb: false }, { name: "output_schema_ref", jsonb: false }, { name: "supervisor_actor_id", jsonb: false }, { name: "permissions", jsonb: true }, { name: "forbidden_actions", jsonb: true }, { name: "status", jsonb: false }, { name: "version", jsonb: false }, { name: "created_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listTechnicalSkillBindingsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from technical_skill_bindings where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getTechnicalSkillBinding(id) {
  const { rows } = await query(`select * from technical_skill_bindings where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createTechnicalSkillBinding(record) {
  return insertRow("technical_skill_bindings", TECHNICAL_SKILL_BINDINGS_COLUMNS, record);
}

export async function updateTechnicalSkillBinding(id, patch) {
  return updateRowById("technical_skill_bindings", TECHNICAL_SKILL_BINDINGS_COLUMNS, id, patch);
}

// --- drawing_review_records ---
const DRAWING_REVIEW_RECORDS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "project_id", jsonb: false }, { name: "document_register_entry_id", jsonb: false }, { name: "base_revision_id", jsonb: false }, { name: "compared_revision_id", jsonb: false }, { name: "status", jsonb: false }, { name: "prepared_by_actor_id", jsonb: false }, { name: "requires_professional_review", jsonb: false }, { name: "created_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listDrawingReviewRecordsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from drawing_review_records where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getDrawingReviewRecord(id) {
  const { rows } = await query(`select * from drawing_review_records where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createDrawingReviewRecord(record) {
  return insertRow("drawing_review_records", DRAWING_REVIEW_RECORDS_COLUMNS, record);
}

export async function updateDrawingReviewRecord(id, patch) {
  return updateRowById("drawing_review_records", DRAWING_REVIEW_RECORDS_COLUMNS, id, patch);
}

// --- calculation_input_sets ---
const CALCULATION_INPUT_SETS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "project_id", jsonb: false }, { name: "intake_session_id", jsonb: false }, { name: "source_revision_refs", jsonb: true }, { name: "input_values", jsonb: true }, { name: "unit_system", jsonb: false }, { name: "validation_results", jsonb: true }, { name: "validation_status", jsonb: false }, { name: "deterministic_engine_ref", jsonb: false }, { name: "prepared_by_actor_id", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listCalculationInputSetsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from calculation_input_sets where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getCalculationInputSet(id) {
  const { rows } = await query(`select * from calculation_input_sets where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createCalculationInputSet(record) {
  return insertRow("calculation_input_sets", CALCULATION_INPUT_SETS_COLUMNS, record);
}

export async function updateCalculationInputSet(id, patch) {
  return updateRowById("calculation_input_sets", CALCULATION_INPUT_SETS_COLUMNS, id, patch);
}

// --- technical_qa_findings ---
const TECHNICAL_QA_FINDINGS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "project_id", jsonb: false }, { name: "subject_type", jsonb: false }, { name: "subject_id", jsonb: false }, { name: "finding_code", jsonb: false }, { name: "severity", jsonb: false }, { name: "description", jsonb: false }, { name: "status", jsonb: false }, { name: "raised_by_actor_id", jsonb: false }, { name: "resolved_by_actor_id", jsonb: false }, { name: "resolution_summary", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "resolved_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listTechnicalQaFindingsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from technical_qa_findings where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getTechnicalQaFinding(id) {
  const { rows } = await query(`select * from technical_qa_findings where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createTechnicalQaFinding(record) {
  return insertRow("technical_qa_findings", TECHNICAL_QA_FINDINGS_COLUMNS, record);
}

export async function updateTechnicalQaFinding(id, patch) {
  return updateRowById("technical_qa_findings", TECHNICAL_QA_FINDINGS_COLUMNS, id, patch);
}

// --- delivery_package_records ---
const DELIVERY_PACKAGE_RECORDS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "project_id", jsonb: false }, { name: "drawing_revision_refs", jsonb: true }, { name: "calculation_input_set_id", jsonb: false }, { name: "qa_finding_refs", jsonb: true }, { name: "evidence_refs", jsonb: true }, { name: "readiness_checks", jsonb: true }, { name: "package_status", jsonb: false }, { name: "requires_professional_review", jsonb: false }, { name: "prepared_by_actor_id", jsonb: false }, { name: "professional_approval_id", jsonb: false }, { name: "issued_document_version_id", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listDeliveryPackageRecordsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from delivery_package_records where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getDeliveryPackageRecord(id) {
  const { rows } = await query(`select * from delivery_package_records where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createDeliveryPackageRecord(record) {
  return insertRow("delivery_package_records", DELIVERY_PACKAGE_RECORDS_COLUMNS, record);
}

export async function updateDeliveryPackageRecord(id, patch) {
  return updateRowById("delivery_package_records", DELIVERY_PACKAGE_RECORDS_COLUMNS, id, patch);
}

// --- pilot_handoff_records ---
const PILOT_HANDOFF_RECORDS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "accepted_by_actor_id", jsonb: false }, { name: "rehearsal_ref", jsonb: false }, { name: "handoff_status", jsonb: false }, { name: "evidence_refs", jsonb: true }, { name: "decision_summary", jsonb: false }, { name: "accepted_at", jsonb: false }, { name: "created_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listPilotHandoffRecordsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from pilot_handoff_records where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getPilotHandoffRecord(id) {
  const { rows } = await query(`select * from pilot_handoff_records where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createPilotHandoffRecord(record) {
  return insertRow("pilot_handoff_records", PILOT_HANDOFF_RECORDS_COLUMNS, record);
}

export async function updatePilotHandoffRecord(id, patch) {
  return updateRowById("pilot_handoff_records", PILOT_HANDOFF_RECORDS_COLUMNS, id, patch);
}
