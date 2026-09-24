// HM-S6 item 3 -- repository layer scaffolding (Network & Marketplace).
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

// --- marketplace_listings ---
const MARKETPLACE_LISTINGS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "service_pack_id", jsonb: false }, { name: "listing_scope", jsonb: false }, { name: "title", jsonb: false }, { name: "description", jsonb: false }, { name: "qualification_requirements", jsonb: true }, { name: "commercial_model", jsonb: true }, { name: "visibility", jsonb: false }, { name: "status", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listMarketplaceListingsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from marketplace_listings where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getMarketplaceListing(id) {
  const { rows } = await query(`select * from marketplace_listings where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createMarketplaceListing(record) {
  return insertRow("marketplace_listings", MARKETPLACE_LISTINGS_COLUMNS, record);
}

export async function updateMarketplaceListing(id, patch) {
  return updateRowById("marketplace_listings", MARKETPLACE_LISTINGS_COLUMNS, id, patch);
}

// --- directory_review_board_decisions ---
const DIRECTORY_REVIEW_BOARD_DECISIONS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "provider_firm_id", jsonb: false }, { name: "listing_id", jsonb: false }, { name: "qualification_gate_id", jsonb: false }, { name: "board_ref", jsonb: false }, { name: "decision", jsonb: false }, { name: "decision_summary", jsonb: false }, { name: "evidence_refs", jsonb: true }, { name: "decided_by_actor_id", jsonb: false }, { name: "decided_at", jsonb: false }, { name: "created_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listDirectoryReviewBoardDecisionsByTenant(tenantId) {
  const { rows } = await query(
    `select * from directory_review_board_decisions where tenant_id = $1 order by created_at, id`,
    [tenantId]
  );
  return rows;
}

export async function getDirectoryReviewBoardDecision(id) {
  const { rows } = await query(`select * from directory_review_board_decisions where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createDirectoryReviewBoardDecision(record) {
  return insertRow("directory_review_board_decisions", DIRECTORY_REVIEW_BOARD_DECISIONS_COLUMNS, record);
}

export async function updateDirectoryReviewBoardDecision(id, patch) {
  return updateRowById("directory_review_board_decisions", DIRECTORY_REVIEW_BOARD_DECISIONS_COLUMNS, id, patch);
}

// --- directory_private_enquiries ---
const DIRECTORY_PRIVATE_ENQUIRIES_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "requesting_firm_id", jsonb: false }, { name: "provider_firm_id", jsonb: false }, { name: "listing_id", jsonb: false }, { name: "enquiry_summary", jsonb: false }, { name: "status", jsonb: false }, { name: "matching_mode", jsonb: false }, { name: "no_live_matching", jsonb: false }, { name: "no_ranking", jsonb: false }, { name: "no_award", jsonb: false }, { name: "created_by_actor_id", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listDirectoryPrivateEnquiriesByTenant(tenantId) {
  const { rows } = await query(
    `select * from directory_private_enquiries where tenant_id = $1 order by created_at, id`,
    [tenantId]
  );
  return rows;
}

export async function getDirectoryPrivateEnquiry(id) {
  const { rows } = await query(`select * from directory_private_enquiries where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createDirectoryPrivateEnquiry(record) {
  return insertRow("directory_private_enquiries", DIRECTORY_PRIVATE_ENQUIRIES_COLUMNS, record);
}

export async function updateDirectoryPrivateEnquiry(id, patch) {
  return updateRowById("directory_private_enquiries", DIRECTORY_PRIVATE_ENQUIRIES_COLUMNS, id, patch);
}

// --- qualification_renewal_reviews ---
const QUALIFICATION_RENEWAL_REVIEWS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "provider_firm_id", jsonb: false }, { name: "qualification_gate_id", jsonb: false }, { name: "listing_id", jsonb: false }, { name: "credential_id", jsonb: false }, { name: "jurisdiction_ref", jsonb: false }, { name: "review_status", jsonb: false }, { name: "expires_at", jsonb: false }, { name: "next_review_due_at", jsonb: false }, { name: "evidence_refs", jsonb: true }, { name: "reviewed_by_actor_id", jsonb: false }, { name: "reviewed_at", jsonb: false }, { name: "created_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listQualificationRenewalReviewsByTenant(tenantId) {
  const { rows } = await query(
    `select * from qualification_renewal_reviews where tenant_id = $1 order by created_at, id`,
    [tenantId]
  );
  return rows;
}

export async function getQualificationRenewalReview(id) {
  const { rows } = await query(`select * from qualification_renewal_reviews where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createQualificationRenewalReview(record) {
  return insertRow("qualification_renewal_reviews", QUALIFICATION_RENEWAL_REVIEWS_COLUMNS, record);
}

export async function updateQualificationRenewalReview(id, patch) {
  return updateRowById("qualification_renewal_reviews", QUALIFICATION_RENEWAL_REVIEWS_COLUMNS, id, patch);
}

// --- capacity_offers ---
const CAPACITY_OFFERS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "service_pack_id", jsonb: false }, { name: "capacity_type", jsonb: false }, { name: "pce_units", jsonb: false }, { name: "available_from", jsonb: false }, { name: "available_until", jsonb: false }, { name: "jurisdiction_refs", jsonb: true }, { name: "status", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listCapacityOffersByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from capacity_offers where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getCapacityOffer(id) {
  const { rows } = await query(`select * from capacity_offers where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createCapacityOffer(record) {
  return insertRow("capacity_offers", CAPACITY_OFFERS_COLUMNS, record);
}

export async function updateCapacityOffer(id, patch) {
  return updateRowById("capacity_offers", CAPACITY_OFFERS_COLUMNS, id, patch);
}

// --- collaboration_requests ---
const COLLABORATION_REQUESTS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "requesting_firm_id", jsonb: false }, { name: "provider_firm_id", jsonb: false }, { name: "service_pack_id", jsonb: false }, { name: "project_id", jsonb: false }, { name: "capacity_offer_id", jsonb: false }, { name: "request_summary", jsonb: false }, { name: "data_room_policy", jsonb: true }, { name: "status", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listCollaborationRequestsByTenant(tenantId) {
  const { rows } = await query(
    `select * from collaboration_requests where tenant_id = $1 order by created_at, id`,
    [tenantId]
  );
  return rows;
}

export async function getCollaborationRequest(id) {
  const { rows } = await query(`select * from collaboration_requests where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createCollaborationRequest(record) {
  return insertRow("collaboration_requests", COLLABORATION_REQUESTS_COLUMNS, record);
}

export async function updateCollaborationRequest(id, patch) {
  return updateRowById("collaboration_requests", COLLABORATION_REQUESTS_COLUMNS, id, patch);
}

// --- network_professional_profiles ---
const NETWORK_PROFESSIONAL_PROFILES_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "person_id", jsonb: false }, { name: "professional_profile_id", jsonb: false }, { name: "display_name", jsonb: false }, { name: "profile_scope", jsonb: false }, { name: "network_status", jsonb: false }, { name: "authority_grant", jsonb: false }, { name: "jurisdiction_refs", jsonb: true }, { name: "credential_refs", jsonb: true }, { name: "capability_refs", jsonb: true }, { name: "created_by_actor_id", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listNetworkProfessionalProfilesByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from network_professional_profiles where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getNetworkProfessionalProfile(id) {
  const { rows } = await query(`select * from network_professional_profiles where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createNetworkProfessionalProfile(record) {
  return insertRow("network_professional_profiles", NETWORK_PROFESSIONAL_PROFILES_COLUMNS, record);
}

export async function updateNetworkProfessionalProfile(id, patch) {
  return updateRowById("network_professional_profiles", NETWORK_PROFESSIONAL_PROFILES_COLUMNS, id, patch);
}

// --- network_firm_profiles ---
const NETWORK_FIRM_PROFILES_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "display_name", jsonb: false }, { name: "profile_scope", jsonb: false }, { name: "network_status", jsonb: false }, { name: "jurisdiction_refs", jsonb: true }, { name: "capability_refs", jsonb: true }, { name: "created_by_actor_id", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listNetworkFirmProfilesByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from network_firm_profiles where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getNetworkFirmProfile(id) {
  const { rows } = await query(`select * from network_firm_profiles where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createNetworkFirmProfile(record) {
  return insertRow("network_firm_profiles", NETWORK_FIRM_PROFILES_COLUMNS, record);
}

export async function updateNetworkFirmProfile(id, patch) {
  return updateRowById("network_firm_profiles", NETWORK_FIRM_PROFILES_COLUMNS, id, patch);
}

// --- network_capabilities ---
const NETWORK_CAPABILITIES_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "professional_network_profile_id", jsonb: false }, { name: "firm_network_profile_id", jsonb: false }, { name: "capability_code", jsonb: false }, { name: "service_pack_ref", jsonb: false }, { name: "jurisdiction_refs", jsonb: true }, { name: "visibility", jsonb: false }, { name: "qualification_required", jsonb: false }, { name: "status", jsonb: false }, { name: "created_by_actor_id", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listNetworkCapabilitiesByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from network_capabilities where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getNetworkCapability(id) {
  const { rows } = await query(`select * from network_capabilities where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createNetworkCapability(record) {
  return insertRow("network_capabilities", NETWORK_CAPABILITIES_COLUMNS, record);
}

export async function updateNetworkCapability(id, patch) {
  return updateRowById("network_capabilities", NETWORK_CAPABILITIES_COLUMNS, id, patch);
}

// --- network_credentials ---
const NETWORK_CREDENTIALS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "professional_network_profile_id", jsonb: false }, { name: "credential_type", jsonb: false }, { name: "credential_name", jsonb: false }, { name: "issuer", jsonb: false }, { name: "jurisdiction_refs", jsonb: true }, { name: "verification_status", jsonb: false }, { name: "verified_by_actor_id", jsonb: false }, { name: "verified_at", jsonb: false }, { name: "valid_from", jsonb: false }, { name: "valid_until", jsonb: false }, { name: "evidence_refs", jsonb: true }, { name: "authority_grant", jsonb: false }, { name: "created_by_actor_id", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listNetworkCredentialsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from network_credentials where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getNetworkCredential(id) {
  const { rows } = await query(`select * from network_credentials where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createNetworkCredential(record) {
  return insertRow("network_credentials", NETWORK_CREDENTIALS_COLUMNS, record);
}

export async function updateNetworkCredential(id, patch) {
  return updateRowById("network_credentials", NETWORK_CREDENTIALS_COLUMNS, id, patch);
}

// --- network_trust_signals ---
const NETWORK_TRUST_SIGNALS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "subject_type", jsonb: false }, { name: "subject_id", jsonb: false }, { name: "signal_type", jsonb: false }, { name: "signal_summary", jsonb: false }, { name: "evidence_refs", jsonb: true }, { name: "trust_weight", jsonb: false }, { name: "substitutes_for_credential", jsonb: false }, { name: "status", jsonb: false }, { name: "created_by_actor_id", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listNetworkTrustSignalsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from network_trust_signals where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getNetworkTrustSignal(id) {
  const { rows } = await query(`select * from network_trust_signals where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createNetworkTrustSignal(record) {
  return insertRow("network_trust_signals", NETWORK_TRUST_SIGNALS_COLUMNS, record);
}

export async function updateNetworkTrustSignal(id, patch) {
  return updateRowById("network_trust_signals", NETWORK_TRUST_SIGNALS_COLUMNS, id, patch);
}

// --- network_conflict_checks ---
const NETWORK_CONFLICT_CHECKS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "requesting_firm_id", jsonb: false }, { name: "provider_firm_id", jsonb: false }, { name: "subject_profile_id", jsonb: false }, { name: "conflict_summary", jsonb: false }, { name: "evidence_refs", jsonb: true }, { name: "created_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listNetworkConflictChecksByTenant(tenantId) {
  const { rows } = await query(
    `select * from network_conflict_checks where tenant_id = $1 order by created_at, id`,
    [tenantId]
  );
  return rows;
}

export async function getNetworkConflictCheck(id) {
  const { rows } = await query(`select * from network_conflict_checks where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createNetworkConflictCheck(record) {
  return insertRow("network_conflict_checks", NETWORK_CONFLICT_CHECKS_COLUMNS, record);
}

export async function updateNetworkConflictCheck(id, patch) {
  return updateRowById("network_conflict_checks", NETWORK_CONFLICT_CHECKS_COLUMNS, id, patch);
}

// --- network_qualification_gates ---
const NETWORK_QUALIFICATION_GATES_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "requesting_firm_id", jsonb: false }, { name: "provider_firm_id", jsonb: false }, { name: "professional_network_profile_id", jsonb: false }, { name: "firm_network_profile_id", jsonb: false }, { name: "capability_id", jsonb: false }, { name: "credential_id", jsonb: false }, { name: "conflict_check_id", jsonb: false }, { name: "jurisdiction_ref", jsonb: false }, { name: "credential_status", jsonb: false }, { name: "jurisdiction_status", jsonb: false }, { name: "insurance_status", jsonb: false }, { name: "conflict_status", jsonb: false }, { name: "capacity_status", jsonb: false }, { name: "policy_status", jsonb: false }, { name: "gate_status", jsonb: false }, { name: "denial_reasons", jsonb: true }, { name: "created_by_actor_id", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listNetworkQualificationGatesByTenant(tenantId) {
  const { rows } = await query(
    `select * from network_qualification_gates where tenant_id = $1 order by created_at, id`,
    [tenantId]
  );
  return rows;
}

export async function getNetworkQualificationGate(id) {
  const { rows } = await query(`select * from network_qualification_gates where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createNetworkQualificationGate(record) {
  return insertRow("network_qualification_gates", NETWORK_QUALIFICATION_GATES_COLUMNS, record);
}

export async function updateNetworkQualificationGate(id, patch) {
  return updateRowById("network_qualification_gates", NETWORK_QUALIFICATION_GATES_COLUMNS, id, patch);
}

// --- specialist_invitations ---
const SPECIALIST_INVITATIONS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "requesting_firm_id", jsonb: false }, { name: "provider_firm_id", jsonb: false }, { name: "qualification_gate_id", jsonb: false }, { name: "capability_id", jsonb: false }, { name: "invitation_status", jsonb: false }, { name: "denial_reasons", jsonb: true }, { name: "invited_by_actor_id", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listSpecialistInvitationsByTenant(tenantId) {
  const { rows } = await query(
    `select * from specialist_invitations where tenant_id = $1 order by created_at, id`,
    [tenantId]
  );
  return rows;
}

export async function getSpecialistInvitation(id) {
  const { rows } = await query(`select * from specialist_invitations where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createSpecialistInvitation(record) {
  return insertRow("specialist_invitations", SPECIALIST_INVITATIONS_COLUMNS, record);
}

export async function updateSpecialistInvitation(id, patch) {
  return updateRowById("specialist_invitations", SPECIALIST_INVITATIONS_COLUMNS, id, patch);
}

// --- collaboration_workspaces ---
const COLLABORATION_WORKSPACES_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "requesting_firm_id", jsonb: false }, { name: "provider_firm_id", jsonb: false }, { name: "specialist_invitation_id", jsonb: false }, { name: "qualification_gate_id", jsonb: false }, { name: "workspace_status", jsonb: false }, { name: "data_room_policy", jsonb: true }, { name: "permitted_evidence_refs", jsonb: true }, { name: "created_by_actor_id", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listCollaborationWorkspacesByTenant(tenantId) {
  const { rows } = await query(
    `select * from collaboration_workspaces where tenant_id = $1 order by created_at, id`,
    [tenantId]
  );
  return rows;
}

export async function getCollaborationWorkspace(id) {
  const { rows } = await query(`select * from collaboration_workspaces where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createCollaborationWorkspace(record) {
  return insertRow("collaboration_workspaces", COLLABORATION_WORKSPACES_COLUMNS, record);
}

export async function updateCollaborationWorkspace(id, patch) {
  return updateRowById("collaboration_workspaces", COLLABORATION_WORKSPACES_COLUMNS, id, patch);
}

// --- collaboration_workspace_participants ---
const COLLABORATION_WORKSPACE_PARTICIPANTS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "workspace_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "actor_id", jsonb: false }, { name: "participant_role", jsonb: false }, { name: "access_status", jsonb: false }, { name: "permissions", jsonb: true }, { name: "granted_by_actor_id", jsonb: false }, { name: "granted_at", jsonb: false }, { name: "revoked_by_actor_id", jsonb: false }, { name: "revoked_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listCollaborationWorkspaceParticipantsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from collaboration_workspace_participants where tenant_id = $1 and firm_id = $2 order by granted_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getCollaborationWorkspaceParticipant(id) {
  const { rows } = await query(`select * from collaboration_workspace_participants where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createCollaborationWorkspaceParticipant(record) {
  return insertRow("collaboration_workspace_participants", COLLABORATION_WORKSPACE_PARTICIPANTS_COLUMNS, record);
}

export async function updateCollaborationWorkspaceParticipant(id, patch) {
  return updateRowById("collaboration_workspace_participants", COLLABORATION_WORKSPACE_PARTICIPANTS_COLUMNS, id, patch);
}

// --- collaboration_workspace_evidence ---
const COLLABORATION_WORKSPACE_EVIDENCE_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "workspace_id", jsonb: false }, { name: "participant_id", jsonb: false }, { name: "evidence_ref", jsonb: false }, { name: "evidence_type", jsonb: false }, { name: "access_scope", jsonb: false }, { name: "added_by_actor_id", jsonb: false }, { name: "added_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listCollaborationWorkspaceEvidenceByTenant(tenantId) {
  const { rows } = await query(
    `select * from collaboration_workspace_evidence where tenant_id = $1 order by added_at, id`,
    [tenantId]
  );
  return rows;
}

export async function getCollaborationWorkspaceEvidence(id) {
  const { rows } = await query(`select * from collaboration_workspace_evidence where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createCollaborationWorkspaceEvidence(record) {
  return insertRow("collaboration_workspace_evidence", COLLABORATION_WORKSPACE_EVIDENCE_COLUMNS, record);
}

export async function updateCollaborationWorkspaceEvidence(id, patch) {
  return updateRowById("collaboration_workspace_evidence", COLLABORATION_WORKSPACE_EVIDENCE_COLUMNS, id, patch);
}

// --- responsibility_matrices ---
const RESPONSIBILITY_MATRICES_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "workspace_id", jsonb: false }, { name: "requesting_firm_id", jsonb: false }, { name: "provider_firm_id", jsonb: false }, { name: "accountable_firm_id", jsonb: false }, { name: "responsible_professional_actor_id", jsonb: false }, { name: "reviewer_actor_id", jsonb: false }, { name: "approver_actor_id", jsonb: false }, { name: "permitted_worker_actions", jsonb: true }, { name: "regulated_scope", jsonb: false }, { name: "approval_required", jsonb: false }, { name: "matrix_status", jsonb: false }, { name: "created_by_actor_id", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listResponsibilityMatricesByTenant(tenantId) {
  const { rows } = await query(
    `select * from responsibility_matrices where tenant_id = $1 order by created_at, id`,
    [tenantId]
  );
  return rows;
}

export async function getResponsibilityMatrix(id) {
  const { rows } = await query(`select * from responsibility_matrices where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createResponsibilityMatrix(record) {
  return insertRow("responsibility_matrices", RESPONSIBILITY_MATRICES_COLUMNS, record);
}

export async function updateResponsibilityMatrix(id, patch) {
  return updateRowById("responsibility_matrices", RESPONSIBILITY_MATRICES_COLUMNS, id, patch);
}

// --- specialist_assignments ---
const SPECIALIST_ASSIGNMENTS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "workspace_id", jsonb: false }, { name: "responsibility_matrix_id", jsonb: false }, { name: "requesting_firm_id", jsonb: false }, { name: "provider_firm_id", jsonb: false }, { name: "assignment_title", jsonb: false }, { name: "assignment_scope", jsonb: false }, { name: "assignment_status", jsonb: false }, { name: "requested_by_actor_id", jsonb: false }, { name: "accepted_by_actor_id", jsonb: false }, { name: "started_by_actor_id", jsonb: false }, { name: "delivered_by_actor_id", jsonb: false }, { name: "reviewed_by_actor_id", jsonb: false }, { name: "approved_by_actor_id", jsonb: false }, { name: "closed_by_actor_id", jsonb: false }, { name: "evidence_refs", jsonb: true }, { name: "review_summary", jsonb: false }, { name: "approval_summary", jsonb: false }, { name: "requested_at", jsonb: false }, { name: "accepted_at", jsonb: false }, { name: "started_at", jsonb: false }, { name: "delivered_at", jsonb: false }, { name: "reviewed_at", jsonb: false }, { name: "approved_at", jsonb: false }, { name: "closed_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listSpecialistAssignmentsByTenant(tenantId) {
  const { rows } = await query(
    `select * from specialist_assignments where tenant_id = $1 order by requested_at, id`,
    [tenantId]
  );
  return rows;
}

export async function getSpecialistAssignment(id) {
  const { rows } = await query(`select * from specialist_assignments where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createSpecialistAssignment(record) {
  return insertRow("specialist_assignments", SPECIALIST_ASSIGNMENTS_COLUMNS, record);
}

export async function updateSpecialistAssignment(id, patch) {
  return updateRowById("specialist_assignments", SPECIALIST_ASSIGNMENTS_COLUMNS, id, patch);
}

// --- observatory_snapshots ---
const OBSERVATORY_SNAPSHOTS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "snapshot_scope", jsonb: false }, { name: "metrics", jsonb: true }, { name: "privacy_class", jsonb: false }, { name: "generated_at", jsonb: false }];

export async function listObservatorySnapshotsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from observatory_snapshots where tenant_id = $1 and firm_id = $2 order by generated_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getObservatorySnapshot(id) {
  const { rows } = await query(`select * from observatory_snapshots where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createObservatorySnapshot(record) {
  return insertRow("observatory_snapshots", OBSERVATORY_SNAPSHOTS_COLUMNS, record);
}

export async function updateObservatorySnapshot(id, patch) {
  return updateRowById("observatory_snapshots", OBSERVATORY_SNAPSHOTS_COLUMNS, id, patch);
}
