// HM-S6 item 3 -- repository layer scaffolding (Documents & Correspondence (Administration)).
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

// --- documents ---
const DOCUMENTS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "project_id", jsonb: false }, { name: "relationship_id", jsonb: false }, { name: "document_type", jsonb: false }, { name: "title", jsonb: false }, { name: "current_version_id", jsonb: false }, { name: "status", jsonb: false }, { name: "classification", jsonb: false }, { name: "created_at", jsonb: false }];

export async function listDocumentsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from documents where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getDocument(id) {
  const { rows } = await query(`select * from documents where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createDocument(record) {
  return insertRow("documents", DOCUMENTS_COLUMNS, record);
}

export async function updateDocument(id, patch) {
  return updateRowById("documents", DOCUMENTS_COLUMNS, id, patch);
}

// --- document_versions ---
const DOCUMENT_VERSIONS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "document_id", jsonb: false }, { name: "version_label", jsonb: false }, { name: "revision", jsonb: false }, { name: "storage_ref", jsonb: false }, { name: "hash", jsonb: false }, { name: "created_by_actor_id", jsonb: false }, { name: "approved_by_approval_id", jsonb: false }, { name: "supersedes_version_id", jsonb: false }, { name: "status", jsonb: false }, { name: "created_at", jsonb: false }];

export async function listDocumentVersionsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from document_versions where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getDocumentVersion(id) {
  const { rows } = await query(`select * from document_versions where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createDocumentVersion(record) {
  return insertRow("document_versions", DOCUMENT_VERSIONS_COLUMNS, record);
}

export async function updateDocumentVersion(id, patch) {
  return updateRowById("document_versions", DOCUMENT_VERSIONS_COLUMNS, id, patch);
}

// --- document_register_entries ---
const DOCUMENT_REGISTER_ENTRIES_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "relationship_id", jsonb: false }, { name: "project_id", jsonb: false }, { name: "document_number", jsonb: false }, { name: "title", jsonb: false }, { name: "document_type", jsonb: false }, { name: "discipline", jsonb: false }, { name: "classification", jsonb: false }, { name: "status", jsonb: false }, { name: "current_revision_id", jsonb: false }, { name: "owner_actor_id", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listDocumentRegisterEntriesByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from document_register_entries where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getDocumentRegisterEntry(id) {
  const { rows } = await query(`select * from document_register_entries where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createDocumentRegisterEntry(record) {
  return insertRow("document_register_entries", DOCUMENT_REGISTER_ENTRIES_COLUMNS, record);
}

export async function updateDocumentRegisterEntry(id, patch) {
  return updateRowById("document_register_entries", DOCUMENT_REGISTER_ENTRIES_COLUMNS, id, patch);
}

// --- document_revision_records ---
const DOCUMENT_REVISION_RECORDS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "document_register_entry_id", jsonb: false }, { name: "revision", jsonb: false }, { name: "version_label", jsonb: false }, { name: "storage_ref", jsonb: false }, { name: "content_hash", jsonb: false }, { name: "status", jsonb: false }, { name: "supersedes_revision_id", jsonb: false }, { name: "created_by_actor_id", jsonb: false }, { name: "created_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listDocumentRevisionRecordsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from document_revision_records where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getDocumentRevisionRecord(id) {
  const { rows } = await query(`select * from document_revision_records where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createDocumentRevisionRecord(record) {
  return insertRow("document_revision_records", DOCUMENT_REVISION_RECORDS_COLUMNS, record);
}

export async function updateDocumentRevisionRecord(id, patch) {
  return updateRowById("document_revision_records", DOCUMENT_REVISION_RECORDS_COLUMNS, id, patch);
}

// --- correspondence_records ---
const CORRESPONDENCE_RECORDS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "relationship_id", jsonb: false }, { name: "project_id", jsonb: false }, { name: "direction", jsonb: false }, { name: "channel", jsonb: false }, { name: "subject", jsonb: false }, { name: "correspondent", jsonb: false }, { name: "received_or_drafted_at", jsonb: false }, { name: "status", jsonb: false }, { name: "owner_actor_id", jsonb: false }, { name: "response_due_at", jsonb: false }, { name: "source_ref", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listCorrespondenceRecordsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from correspondence_records where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getCorrespondenceRecord(id) {
  const { rows } = await query(`select * from correspondence_records where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createCorrespondenceRecord(record) {
  return insertRow("correspondence_records", CORRESPONDENCE_RECORDS_COLUMNS, record);
}

export async function updateCorrespondenceRecord(id, patch) {
  return updateRowById("correspondence_records", CORRESPONDENCE_RECORDS_COLUMNS, id, patch);
}

// --- administrative_deadlines ---
const ADMINISTRATIVE_DEADLINES_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "project_id", jsonb: false }, { name: "relationship_id", jsonb: false }, { name: "title", jsonb: false }, { name: "due_at", jsonb: false }, { name: "priority", jsonb: false }, { name: "status", jsonb: false }, { name: "assigned_actor_or_worker_ref", jsonb: false }, { name: "source_ref", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "completed_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listAdministrativeDeadlinesByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from administrative_deadlines where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getAdministrativeDeadline(id) {
  const { rows } = await query(`select * from administrative_deadlines where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createAdministrativeDeadline(record) {
  return insertRow("administrative_deadlines", ADMINISTRATIVE_DEADLINES_COLUMNS, record);
}

export async function updateAdministrativeDeadline(id, patch) {
  return updateRowById("administrative_deadlines", ADMINISTRATIVE_DEADLINES_COLUMNS, id, patch);
}

// --- transmittal_drafts ---
const TRANSMITTAL_DRAFTS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "project_id", jsonb: false }, { name: "relationship_id", jsonb: false }, { name: "recipient", jsonb: false }, { name: "subject", jsonb: false }, { name: "document_revision_refs", jsonb: true }, { name: "message_body", jsonb: false }, { name: "status", jsonb: false }, { name: "requires_principal_approval", jsonb: false }, { name: "prepared_by_actor_id", jsonb: false }, { name: "approved_by_actor_id", jsonb: false }, { name: "issued_at", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listTransmittalDraftsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from transmittal_drafts where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getTransmittalDraft(id) {
  const { rows } = await query(`select * from transmittal_drafts where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createTransmittalDraft(record) {
  return insertRow("transmittal_drafts", TRANSMITTAL_DRAFTS_COLUMNS, record);
}

export async function updateTransmittalDraft(id, patch) {
  return updateRowById("transmittal_drafts", TRANSMITTAL_DRAFTS_COLUMNS, id, patch);
}

// --- evidence_bundles ---
const EVIDENCE_BUNDLES_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "project_id", jsonb: false }, { name: "subject_type", jsonb: false }, { name: "subject_id", jsonb: false }, { name: "source_document_refs", jsonb: true }, { name: "input_refs", jsonb: true }, { name: "calculation_refs", jsonb: true }, { name: "qa_check_refs", jsonb: true }, { name: "policy_check_refs", jsonb: true }, { name: "review_notes_ref", jsonb: false }, { name: "final_output_ref", jsonb: false }, { name: "bundle_hash", jsonb: false }, { name: "status", jsonb: false }, { name: "created_at", jsonb: false }];

export async function listEvidenceBundlesByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from evidence_bundles where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getEvidenceBundle(id) {
  const { rows } = await query(`select * from evidence_bundles where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createEvidenceBundle(record) {
  return insertRow("evidence_bundles", EVIDENCE_BUNDLES_COLUMNS, record);
}

export async function updateEvidenceBundle(id, patch) {
  return updateRowById("evidence_bundles", EVIDENCE_BUNDLES_COLUMNS, id, patch);
}

// --- administration_skill_bindings ---
const ADMINISTRATION_SKILL_BINDINGS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "worker_template_code", jsonb: false }, { name: "role_skill_ref", jsonb: false }, { name: "worker_skill_ref", jsonb: false }, { name: "input_schema_ref", jsonb: false }, { name: "output_schema_ref", jsonb: false }, { name: "supervisor_actor_id", jsonb: false }, { name: "permissions", jsonb: true }, { name: "forbidden_actions", jsonb: true }, { name: "status", jsonb: false }, { name: "version", jsonb: false }, { name: "created_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listAdministrationSkillBindingsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from administration_skill_bindings where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getAdministrationSkillBinding(id) {
  const { rows } = await query(`select * from administration_skill_bindings where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createAdministrationSkillBinding(record) {
  return insertRow("administration_skill_bindings", ADMINISTRATION_SKILL_BINDINGS_COLUMNS, record);
}

export async function updateAdministrationSkillBinding(id, patch) {
  return updateRowById("administration_skill_bindings", ADMINISTRATION_SKILL_BINDINGS_COLUMNS, id, patch);
}
