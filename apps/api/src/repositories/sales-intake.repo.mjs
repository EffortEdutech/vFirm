// HM-S6 item 3 -- repository layer scaffolding (Sales & Intake).
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

// --- clients ---
const CLIENTS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "client_type", jsonb: false }, { name: "name", jsonb: false }, { name: "primary_contact_id", jsonb: false }, { name: "confidentiality_class", jsonb: false }, { name: "status", jsonb: false }, { name: "version", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listClientsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from clients where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getClient(id) {
  const { rows } = await query(`select * from clients where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createClient(record) {
  return insertRow("clients", CLIENTS_COLUMNS, record);
}

export async function updateClient(id, patch) {
  return updateRowById("clients", CLIENTS_COLUMNS, id, patch);
}

// --- firm_client_relationships ---
const FIRM_CLIENT_RELATIONSHIPS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "client_id", jsonb: false }, { name: "relationship_type", jsonb: false }, { name: "status", jsonb: false }, { name: "origin", jsonb: false }, { name: "responsible_owner_actor_id", jsonb: false }, { name: "contracting_business_entity_id", jsonb: false }, { name: "consent_or_legal_basis_ref", jsonb: false }, { name: "conflict_check_ref", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listFirmClientRelationshipsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from firm_client_relationships where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getFirmClientRelationship(id) {
  const { rows } = await query(`select * from firm_client_relationships where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createFirmClientRelationship(record) {
  return insertRow("firm_client_relationships", FIRM_CLIENT_RELATIONSHIPS_COLUMNS, record);
}

export async function updateFirmClientRelationship(id, patch) {
  return updateRowById("firm_client_relationships", FIRM_CLIENT_RELATIONSHIPS_COLUMNS, id, patch);
}

// --- front_desk_enquiries ---
const FRONT_DESK_ENQUIRIES_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "source_channel", jsonb: false }, { name: "contact_name", jsonb: false }, { name: "organization_name", jsonb: false }, { name: "contact_email", jsonb: false }, { name: "contact_phone", jsonb: false }, { name: "enquiry_summary", jsonb: false }, { name: "requested_service_hint", jsonb: false }, { name: "urgency", jsonb: false }, { name: "status", jsonb: false }, { name: "qualification_reason", jsonb: false }, { name: "consent_or_legal_basis_ref", jsonb: false }, { name: "conflict_check_status", jsonb: false }, { name: "conflict_check_ref", jsonb: false }, { name: "assigned_actor_id", jsonb: false }, { name: "client_id", jsonb: false }, { name: "relationship_id", jsonb: false }, { name: "lead_id", jsonb: false }, { name: "intake_session_id", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listFrontDeskEnquiriesByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from front_desk_enquiries where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getFrontDeskEnquiry(id) {
  const { rows } = await query(`select * from front_desk_enquiries where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createFrontDeskEnquiry(record) {
  return insertRow("front_desk_enquiries", FRONT_DESK_ENQUIRIES_COLUMNS, record);
}

export async function updateFrontDeskEnquiry(id, patch) {
  return updateRowById("front_desk_enquiries", FRONT_DESK_ENQUIRIES_COLUMNS, id, patch);
}

// --- client_communication_drafts ---
const CLIENT_COMMUNICATION_DRAFTS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "enquiry_id", jsonb: false }, { name: "channel", jsonb: false }, { name: "subject", jsonb: false }, { name: "body", jsonb: false }, { name: "status", jsonb: false }, { name: "requires_human_review", jsonb: false }, { name: "prepared_by_actor_id", jsonb: false }, { name: "approved_by_actor_id", jsonb: false }, { name: "sent_at", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listClientCommunicationDraftsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from client_communication_drafts where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getClientCommunicationDraft(id) {
  const { rows } = await query(`select * from client_communication_drafts where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createClientCommunicationDraft(record) {
  return insertRow("client_communication_drafts", CLIENT_COMMUNICATION_DRAFTS_COLUMNS, record);
}

export async function updateClientCommunicationDraft(id, patch) {
  return updateRowById("client_communication_drafts", CLIENT_COMMUNICATION_DRAFTS_COLUMNS, id, patch);
}

// --- leads ---
const LEADS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "relationship_id", jsonb: false }, { name: "source_channel", jsonb: false }, { name: "requested_service_hint", jsonb: false }, { name: "urgency", jsonb: false }, { name: "qualification_status", jsonb: false }, { name: "assigned_actor_id", jsonb: false }, { name: "created_from_conversation_ref", jsonb: false }, { name: "created_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listLeadsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from leads where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getLead(id) {
  const { rows } = await query(`select * from leads where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createLead(record) {
  return insertRow("leads", LEADS_COLUMNS, record);
}

export async function updateLead(id, patch) {
  return updateRowById("leads", LEADS_COLUMNS, id, patch);
}

// --- intake_sessions ---
const INTAKE_SESSIONS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "lead_id", jsonb: false }, { name: "service_id", jsonb: false }, { name: "required_inputs", jsonb: true }, { name: "provided_inputs", jsonb: true }, { name: "missing_information_items", jsonb: true }, { name: "intake_status", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listIntakeSessionsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from intake_sessions where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getIntakeSession(id) {
  const { rows } = await query(`select * from intake_sessions where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createIntakeSession(record) {
  return insertRow("intake_sessions", INTAKE_SESSIONS_COLUMNS, record);
}

export async function updateIntakeSession(id, patch) {
  return updateRowById("intake_sessions", INTAKE_SESSIONS_COLUMNS, id, patch);
}

// --- sales_pipeline_records ---
const SALES_PIPELINE_RECORDS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "enquiry_id", jsonb: false }, { name: "relationship_id", jsonb: false }, { name: "intake_session_id", jsonb: false }, { name: "proposal_id", jsonb: false }, { name: "opportunity_name", jsonb: false }, { name: "stage", jsonb: false }, { name: "estimated_value", jsonb: false }, { name: "currency", jsonb: false }, { name: "probability_percent", jsonb: false }, { name: "owner_actor_id", jsonb: false }, { name: "next_action", jsonb: false }, { name: "next_action_due_at", jsonb: false }, { name: "lost_reason", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listSalesPipelineRecordsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from sales_pipeline_records where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getSalesPipelineRecord(id) {
  const { rows } = await query(`select * from sales_pipeline_records where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createSalesPipelineRecord(record) {
  return insertRow("sales_pipeline_records", SALES_PIPELINE_RECORDS_COLUMNS, record);
}

export async function updateSalesPipelineRecord(id, patch) {
  return updateRowById("sales_pipeline_records", SALES_PIPELINE_RECORDS_COLUMNS, id, patch);
}

// --- proposal_dispatch_records ---
const PROPOSAL_DISPATCH_RECORDS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "proposal_id", jsonb: false }, { name: "recipient", jsonb: false }, { name: "channel", jsonb: false }, { name: "dispatch_status", jsonb: false }, { name: "dispatched_by_actor_id", jsonb: false }, { name: "commercial_approval_id", jsonb: false }, { name: "document_ref", jsonb: false }, { name: "dispatched_at", jsonb: false }, { name: "created_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listProposalDispatchRecordsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from proposal_dispatch_records where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getProposalDispatchRecord(id) {
  const { rows } = await query(`select * from proposal_dispatch_records where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createProposalDispatchRecord(record) {
  return insertRow("proposal_dispatch_records", PROPOSAL_DISPATCH_RECORDS_COLUMNS, record);
}

export async function updateProposalDispatchRecord(id, patch) {
  return updateRowById("proposal_dispatch_records", PROPOSAL_DISPATCH_RECORDS_COLUMNS, id, patch);
}

// --- proposals ---
const PROPOSALS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "relationship_id", jsonb: false }, { name: "service_id", jsonb: false }, { name: "scope_summary", jsonb: false }, { name: "price_build_up_id", jsonb: false }, { name: "commercial_approval_id", jsonb: false }, { name: "proposal_status", jsonb: false }, { name: "valid_until", jsonb: false }, { name: "issued_document_ref", jsonb: false }, { name: "version", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listProposalsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from proposals where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getProposal(id) {
  const { rows } = await query(`select * from proposals where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createProposal(record) {
  return insertRow("proposals", PROPOSALS_COLUMNS, record);
}

export async function updateProposal(id, patch) {
  return updateRowById("proposals", PROPOSALS_COLUMNS, id, patch);
}

// --- price_build_ups ---
const PRICE_BUILD_UPS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "service_sku_id", jsonb: false }, { name: "scope_inputs", jsonb: true }, { name: "human_effort_estimate", jsonb: false }, { name: "ai_runtime_estimate", jsonb: false }, { name: "specialist_cost_estimate", jsonb: false }, { name: "tool_cost_estimate", jsonb: false }, { name: "risk_contingency", jsonb: false }, { name: "platform_fee", jsonb: false }, { name: "margin_target", jsonb: false }, { name: "final_price", jsonb: false }, { name: "approval_required", jsonb: false }, { name: "created_at", jsonb: false }];

export async function listPriceBuildUpsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from price_build_ups where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getPriceBuildUp(id) {
  const { rows } = await query(`select * from price_build_ups where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createPriceBuildUp(record) {
  return insertRow("price_build_ups", PRICE_BUILD_UPS_COLUMNS, record);
}

export async function updatePriceBuildUp(id, patch) {
  return updateRowById("price_build_ups", PRICE_BUILD_UPS_COLUMNS, id, patch);
}

// --- commercial_skill_bindings ---
const COMMERCIAL_SKILL_BINDINGS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "worker_template_code", jsonb: false }, { name: "role_skill_ref", jsonb: false }, { name: "worker_skill_ref", jsonb: false }, { name: "input_schema_ref", jsonb: false }, { name: "output_schema_ref", jsonb: false }, { name: "supervisor_actor_id", jsonb: false }, { name: "permissions", jsonb: true }, { name: "forbidden_actions", jsonb: true }, { name: "status", jsonb: false }, { name: "version", jsonb: false }, { name: "created_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listCommercialSkillBindingsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from commercial_skill_bindings where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getCommercialSkillBinding(id) {
  const { rows } = await query(`select * from commercial_skill_bindings where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createCommercialSkillBinding(record) {
  return insertRow("commercial_skill_bindings", COMMERCIAL_SKILL_BINDINGS_COLUMNS, record);
}

export async function updateCommercialSkillBinding(id, patch) {
  return updateRowById("commercial_skill_bindings", COMMERCIAL_SKILL_BINDINGS_COLUMNS, id, patch);
}

// --- quotation_cases ---
const QUOTATION_CASES_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listQuotationCasesByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from quotation_cases where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getQuotationCase(id) {
  const { rows } = await query(`select * from quotation_cases where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createQuotationCase(record) {
  return insertRow("quotation_cases", QUOTATION_CASES_COLUMNS, record);
}

export async function updateQuotationCase(id, patch) {
  return updateRowById("quotation_cases", QUOTATION_CASES_COLUMNS, id, patch);
}

// --- boq_extraction_aids ---
const BOQ_EXTRACTION_AIDS_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listBoqExtractionAidsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from boq_extraction_aids where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getBoqExtractionAid(id) {
  const { rows } = await query(`select * from boq_extraction_aids where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createBoqExtractionAid(record) {
  return insertRow("boq_extraction_aids", BOQ_EXTRACTION_AIDS_COLUMNS, record);
}

export async function updateBoqExtractionAid(id, patch) {
  return updateRowById("boq_extraction_aids", BOQ_EXTRACTION_AIDS_COLUMNS, id, patch);
}

// --- quotation_draft_packs ---
const QUOTATION_DRAFT_PACKS_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listQuotationDraftPacksByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from quotation_draft_packs where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getQuotationDraftPack(id) {
  const { rows } = await query(`select * from quotation_draft_packs where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createQuotationDraftPack(record) {
  return insertRow("quotation_draft_packs", QUOTATION_DRAFT_PACKS_COLUMNS, record);
}

export async function updateQuotationDraftPack(id, patch) {
  return updateRowById("quotation_draft_packs", QUOTATION_DRAFT_PACKS_COLUMNS, id, patch);
}

// --- quotation_issue_records ---
const QUOTATION_ISSUE_RECORDS_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listQuotationIssueRecordsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from quotation_issue_records where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getQuotationIssueRecord(id) {
  const { rows } = await query(`select * from quotation_issue_records where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createQuotationIssueRecord(record) {
  return insertRow("quotation_issue_records", QUOTATION_ISSUE_RECORDS_COLUMNS, record);
}

export async function updateQuotationIssueRecord(id, patch) {
  return updateRowById("quotation_issue_records", QUOTATION_ISSUE_RECORDS_COLUMNS, id, patch);
}

// --- quotation_receivable_preparations ---
const QUOTATION_RECEIVABLE_PREPARATIONS_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listQuotationReceivablePreparationsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from quotation_receivable_preparations where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getQuotationReceivablePreparation(id) {
  const { rows } = await query(`select * from quotation_receivable_preparations where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createQuotationReceivablePreparation(record) {
  return insertRow("quotation_receivable_preparations", QUOTATION_RECEIVABLE_PREPARATIONS_COLUMNS, record);
}

export async function updateQuotationReceivablePreparation(id, patch) {
  return updateRowById("quotation_receivable_preparations", QUOTATION_RECEIVABLE_PREPARATIONS_COLUMNS, id, patch);
}
