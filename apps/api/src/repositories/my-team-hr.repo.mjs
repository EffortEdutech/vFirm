// HM-S6 item 3 -- repository layer scaffolding (My Team & HR (AI Workforce)).
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

// --- worker_templates ---
const WORKER_TEMPLATES_COLUMNS = [{ name: "id", jsonb: false }, { name: "code", jsonb: false }, { name: "name", jsonb: false }, { name: "version", jsonb: false }, { name: "default_tools", jsonb: true }, { name: "default_budget", jsonb: true }, { name: "risk_envelope", jsonb: true }, { name: "status", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listAllWorkerTemplates() {
  const { rows } = await query(`select * from worker_templates order by created_at, id`);
  return rows;
}

export async function getWorkerTemplate(id) {
  const { rows } = await query(`select * from worker_templates where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createWorkerTemplate(record) {
  return insertRow("worker_templates", WORKER_TEMPLATES_COLUMNS, record);
}

export async function updateWorkerTemplate(id, patch) {
  return updateRowById("worker_templates", WORKER_TEMPLATES_COLUMNS, id, patch);
}

// --- worker_instances ---
const WORKER_INSTANCES_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "worker_template_id", jsonb: false }, { name: "actor_id", jsonb: false }, { name: "name", jsonb: false }, { name: "assigned_services", jsonb: true }, { name: "tool_allowlist", jsonb: true }, { name: "budget_envelope", jsonb: true }, { name: "risk_limits", jsonb: true }, { name: "runtime_status", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listWorkerInstancesByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from worker_instances where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getWorkerInstance(id) {
  const { rows } = await query(`select * from worker_instances where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createWorkerInstance(record) {
  return insertRow("worker_instances", WORKER_INSTANCES_COLUMNS, record);
}

export async function updateWorkerInstance(id, patch) {
  return updateRowById("worker_instances", WORKER_INSTANCES_COLUMNS, id, patch);
}

// --- task_outputs ---
const TASK_OUTPUTS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "project_id", jsonb: false }, { name: "task_id", jsonb: false }, { name: "worker_instance_id", jsonb: false }, { name: "output_ref", jsonb: false }, { name: "output_schema_ref", jsonb: false }, { name: "evidence_refs", jsonb: true }, { name: "quality_flags", jsonb: true }, { name: "requires_human_review", jsonb: false }, { name: "status", jsonb: false }, { name: "created_at", jsonb: false }];

export async function listTaskOutputsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from task_outputs where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getTaskOutput(id) {
  const { rows } = await query(`select * from task_outputs where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createTaskOutput(record) {
  return insertRow("task_outputs", TASK_OUTPUTS_COLUMNS, record);
}

export async function updateTaskOutput(id, patch) {
  return updateRowById("task_outputs", TASK_OUTPUTS_COLUMNS, id, patch);
}

// --- tool_invocations ---
const TOOL_INVOCATIONS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "worker_instance_id", jsonb: false }, { name: "task_id", jsonb: false }, { name: "tool_name", jsonb: false }, { name: "invocation_status", jsonb: false }, { name: "input_summary", jsonb: false }, { name: "output_ref", jsonb: false }, { name: "cost_estimate", jsonb: false }, { name: "created_at", jsonb: false }, { name: "completed_at", jsonb: false }];

export async function listToolInvocationsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from tool_invocations where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getToolInvocation(id) {
  const { rows } = await query(`select * from tool_invocations where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createToolInvocation(record) {
  return insertRow("tool_invocations", TOOL_INVOCATIONS_COLUMNS, record);
}

export async function updateToolInvocation(id, patch) {
  return updateRowById("tool_invocations", TOOL_INVOCATIONS_COLUMNS, id, patch);
}

// --- awia_firm_package_assignments ---
const AWIA_FIRM_PACKAGE_ASSIGNMENTS_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listAwiaFirmPackageAssignmentsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from awia_firm_package_assignments where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getAwiaFirmPackageAssignment(id) {
  const { rows } = await query(`select * from awia_firm_package_assignments where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createAwiaFirmPackageAssignment(record) {
  return insertRow("awia_firm_package_assignments", AWIA_FIRM_PACKAGE_ASSIGNMENTS_COLUMNS, record);
}

export async function updateAwiaFirmPackageAssignment(id, patch) {
  return updateRowById("awia_firm_package_assignments", AWIA_FIRM_PACKAGE_ASSIGNMENTS_COLUMNS, id, patch);
}

// --- awia_virtual_staff_provisioning_runs ---
const AWIA_VIRTUAL_STAFF_PROVISIONING_RUNS_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listAwiaVirtualStaffProvisioningRunsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from awia_virtual_staff_provisioning_runs where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getAwiaVirtualStaffProvisioningRun(id) {
  const { rows } = await query(`select * from awia_virtual_staff_provisioning_runs where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createAwiaVirtualStaffProvisioningRun(record) {
  return insertRow("awia_virtual_staff_provisioning_runs", AWIA_VIRTUAL_STAFF_PROVISIONING_RUNS_COLUMNS, record);
}

export async function updateAwiaVirtualStaffProvisioningRun(id, patch) {
  return updateRowById("awia_virtual_staff_provisioning_runs", AWIA_VIRTUAL_STAFF_PROVISIONING_RUNS_COLUMNS, id, patch);
}

// --- awia_virtual_staff_seats ---
const AWIA_VIRTUAL_STAFF_SEATS_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listAwiaVirtualStaffSeatsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from awia_virtual_staff_seats where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getAwiaVirtualStaffSeat(id) {
  const { rows } = await query(`select * from awia_virtual_staff_seats where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createAwiaVirtualStaffSeat(record) {
  return insertRow("awia_virtual_staff_seats", AWIA_VIRTUAL_STAFF_SEATS_COLUMNS, record);
}

export async function updateAwiaVirtualStaffSeat(id, patch) {
  return updateRowById("awia_virtual_staff_seats", AWIA_VIRTUAL_STAFF_SEATS_COLUMNS, id, patch);
}

// --- awia_virtual_staff_members ---
const AWIA_VIRTUAL_STAFF_MEMBERS_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listAwiaVirtualStaffMembersByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from awia_virtual_staff_members where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getAwiaVirtualStaffMember(id) {
  const { rows } = await query(`select * from awia_virtual_staff_members where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createAwiaVirtualStaffMember(record) {
  return insertRow("awia_virtual_staff_members", AWIA_VIRTUAL_STAFF_MEMBERS_COLUMNS, record);
}

export async function updateAwiaVirtualStaffMember(id, patch) {
  return updateRowById("awia_virtual_staff_members", AWIA_VIRTUAL_STAFF_MEMBERS_COLUMNS, id, patch);
}

// --- awia_staff_role_assignments ---
const AWIA_STAFF_ROLE_ASSIGNMENTS_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listAwiaStaffRoleAssignmentsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from awia_staff_role_assignments where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getAwiaStaffRoleAssignment(id) {
  const { rows } = await query(`select * from awia_staff_role_assignments where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createAwiaStaffRoleAssignment(record) {
  return insertRow("awia_staff_role_assignments", AWIA_STAFF_ROLE_ASSIGNMENTS_COLUMNS, record);
}

export async function updateAwiaStaffRoleAssignment(id, patch) {
  return updateRowById("awia_staff_role_assignments", AWIA_STAFF_ROLE_ASSIGNMENTS_COLUMNS, id, patch);
}

// --- awia_staff_package_bindings ---
const AWIA_STAFF_PACKAGE_BINDINGS_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listAwiaStaffPackageBindingsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from awia_staff_package_bindings where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getAwiaStaffPackageBinding(id) {
  const { rows } = await query(`select * from awia_staff_package_bindings where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createAwiaStaffPackageBinding(record) {
  return insertRow("awia_staff_package_bindings", AWIA_STAFF_PACKAGE_BINDINGS_COLUMNS, record);
}

export async function updateAwiaStaffPackageBinding(id, patch) {
  return updateRowById("awia_staff_package_bindings", AWIA_STAFF_PACKAGE_BINDINGS_COLUMNS, id, patch);
}

// --- awia_staff_lifecycle_events ---
const AWIA_STAFF_LIFECYCLE_EVENTS_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listAwiaStaffLifecycleEventsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from awia_staff_lifecycle_events where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getAwiaStaffLifecycleEvent(id) {
  const { rows } = await query(`select * from awia_staff_lifecycle_events where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createAwiaStaffLifecycleEvent(record) {
  return insertRow("awia_staff_lifecycle_events", AWIA_STAFF_LIFECYCLE_EVENTS_COLUMNS, record);
}

export async function updateAwiaStaffLifecycleEvent(id, patch) {
  return updateRowById("awia_staff_lifecycle_events", AWIA_STAFF_LIFECYCLE_EVENTS_COLUMNS, id, patch);
}

// --- awia_staff_authority_decisions ---
const AWIA_STAFF_AUTHORITY_DECISIONS_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listAwiaStaffAuthorityDecisionsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from awia_staff_authority_decisions where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getAwiaStaffAuthorityDecision(id) {
  const { rows } = await query(`select * from awia_staff_authority_decisions where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createAwiaStaffAuthorityDecision(record) {
  return insertRow("awia_staff_authority_decisions", AWIA_STAFF_AUTHORITY_DECISIONS_COLUMNS, record);
}

export async function updateAwiaStaffAuthorityDecision(id, patch) {
  return updateRowById("awia_staff_authority_decisions", AWIA_STAFF_AUTHORITY_DECISIONS_COLUMNS, id, patch);
}

// --- awia_staff_evidence_packs ---
const AWIA_STAFF_EVIDENCE_PACKS_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listAwiaStaffEvidencePacksByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from awia_staff_evidence_packs where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getAwiaStaffEvidencePack(id) {
  const { rows } = await query(`select * from awia_staff_evidence_packs where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createAwiaStaffEvidencePack(record) {
  return insertRow("awia_staff_evidence_packs", AWIA_STAFF_EVIDENCE_PACKS_COLUMNS, record);
}

export async function updateAwiaStaffEvidencePack(id, patch) {
  return updateRowById("awia_staff_evidence_packs", AWIA_STAFF_EVIDENCE_PACKS_COLUMNS, id, patch);
}

// --- awia_staff_task_readiness_records ---
const AWIA_STAFF_TASK_READINESS_RECORDS_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listAwiaStaffTaskReadinessRecordsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from awia_staff_task_readiness_records where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getAwiaStaffTaskReadinessRecord(id) {
  const { rows } = await query(`select * from awia_staff_task_readiness_records where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createAwiaStaffTaskReadinessRecord(record) {
  return insertRow("awia_staff_task_readiness_records", AWIA_STAFF_TASK_READINESS_RECORDS_COLUMNS, record);
}

export async function updateAwiaStaffTaskReadinessRecord(id, patch) {
  return updateRowById("awia_staff_task_readiness_records", AWIA_STAFF_TASK_READINESS_RECORDS_COLUMNS, id, patch);
}

// --- awia_staff_workdesk_items ---
const AWIA_STAFF_WORKDESK_ITEMS_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listAwiaStaffWorkdeskItemsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from awia_staff_workdesk_items where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getAwiaStaffWorkdeskItem(id) {
  const { rows } = await query(`select * from awia_staff_workdesk_items where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createAwiaStaffWorkdeskItem(record) {
  return insertRow("awia_staff_workdesk_items", AWIA_STAFF_WORKDESK_ITEMS_COLUMNS, record);
}

export async function updateAwiaStaffWorkdeskItem(id, patch) {
  return updateRowById("awia_staff_workdesk_items", AWIA_STAFF_WORKDESK_ITEMS_COLUMNS, id, patch);
}

// --- awia_staff_output_drafts ---
const AWIA_STAFF_OUTPUT_DRAFTS_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listAwiaStaffOutputDraftsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from awia_staff_output_drafts where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getAwiaStaffOutputDraft(id) {
  const { rows } = await query(`select * from awia_staff_output_drafts where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createAwiaStaffOutputDraft(record) {
  return insertRow("awia_staff_output_drafts", AWIA_STAFF_OUTPUT_DRAFTS_COLUMNS, record);
}

export async function updateAwiaStaffOutputDraft(id, patch) {
  return updateRowById("awia_staff_output_drafts", AWIA_STAFF_OUTPUT_DRAFTS_COLUMNS, id, patch);
}

// --- awia_staff_output_reviews ---
const AWIA_STAFF_OUTPUT_REVIEWS_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listAwiaStaffOutputReviewsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from awia_staff_output_reviews where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getAwiaStaffOutputReview(id) {
  const { rows } = await query(`select * from awia_staff_output_reviews where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createAwiaStaffOutputReview(record) {
  return insertRow("awia_staff_output_reviews", AWIA_STAFF_OUTPUT_REVIEWS_COLUMNS, record);
}

export async function updateAwiaStaffOutputReview(id, patch) {
  return updateRowById("awia_staff_output_reviews", AWIA_STAFF_OUTPUT_REVIEWS_COLUMNS, id, patch);
}

// --- awia_client_delivery_drafts ---
const AWIA_CLIENT_DELIVERY_DRAFTS_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listAwiaClientDeliveryDraftsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from awia_client_delivery_drafts where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getAwiaClientDeliveryDraft(id) {
  const { rows } = await query(`select * from awia_client_delivery_drafts where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createAwiaClientDeliveryDraft(record) {
  return insertRow("awia_client_delivery_drafts", AWIA_CLIENT_DELIVERY_DRAFTS_COLUMNS, record);
}

export async function updateAwiaClientDeliveryDraft(id, patch) {
  return updateRowById("awia_client_delivery_drafts", AWIA_CLIENT_DELIVERY_DRAFTS_COLUMNS, id, patch);
}

// --- awia_staff_memory_entries ---
const AWIA_STAFF_MEMORY_ENTRIES_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listAwiaStaffMemoryEntriesByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from awia_staff_memory_entries where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getAwiaStaffMemoryEntry(id) {
  const { rows } = await query(`select * from awia_staff_memory_entries where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createAwiaStaffMemoryEntry(record) {
  return insertRow("awia_staff_memory_entries", AWIA_STAFF_MEMORY_ENTRIES_COLUMNS, record);
}

export async function updateAwiaStaffMemoryEntry(id, patch) {
  return updateRowById("awia_staff_memory_entries", AWIA_STAFF_MEMORY_ENTRIES_COLUMNS, id, patch);
}

// --- awia_staff_conversation_threads ---
const AWIA_STAFF_CONVERSATION_THREADS_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listAwiaStaffConversationThreadsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from awia_staff_conversation_threads where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getAwiaStaffConversationThread(id) {
  const { rows } = await query(`select * from awia_staff_conversation_threads where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createAwiaStaffConversationThread(record) {
  return insertRow("awia_staff_conversation_threads", AWIA_STAFF_CONVERSATION_THREADS_COLUMNS, record);
}

export async function updateAwiaStaffConversationThread(id, patch) {
  return updateRowById("awia_staff_conversation_threads", AWIA_STAFF_CONVERSATION_THREADS_COLUMNS, id, patch);
}

// --- awia_staff_conversation_messages ---
const AWIA_STAFF_CONVERSATION_MESSAGES_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listAwiaStaffConversationMessagesByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from awia_staff_conversation_messages where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getAwiaStaffConversationMessage(id) {
  const { rows } = await query(`select * from awia_staff_conversation_messages where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createAwiaStaffConversationMessage(record) {
  return insertRow("awia_staff_conversation_messages", AWIA_STAFF_CONVERSATION_MESSAGES_COLUMNS, record);
}

export async function updateAwiaStaffConversationMessage(id, patch) {
  return updateRowById("awia_staff_conversation_messages", AWIA_STAFF_CONVERSATION_MESSAGES_COLUMNS, id, patch);
}

// --- awia_staff_seat_billing_events ---
const AWIA_STAFF_SEAT_BILLING_EVENTS_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listAwiaStaffSeatBillingEventsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from awia_staff_seat_billing_events where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getAwiaStaffSeatBillingEvent(id) {
  const { rows } = await query(`select * from awia_staff_seat_billing_events where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createAwiaStaffSeatBillingEvent(record) {
  return insertRow("awia_staff_seat_billing_events", AWIA_STAFF_SEAT_BILLING_EVENTS_COLUMNS, record);
}

export async function updateAwiaStaffSeatBillingEvent(id, patch) {
  return updateRowById("awia_staff_seat_billing_events", AWIA_STAFF_SEAT_BILLING_EVENTS_COLUMNS, id, patch);
}
