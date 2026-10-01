// HM-S6 item 3 -- repository layer scaffolding (Directory & Firm Setup).
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

// --- tenants ---
const TENANTS_COLUMNS = [{ name: "id", jsonb: false }, { name: "name", jsonb: false }, { name: "status", jsonb: false }, { name: "isolation_policy_id", jsonb: false }, { name: "default_region", jsonb: false }, { name: "data_residency_policy", jsonb: false }, { name: "billing_account_ref", jsonb: false }, { name: "created_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listAllTenants() {
  const { rows } = await query(`select * from tenants order by created_at, id`);
  return rows;
}

export async function getTenant(id) {
  const { rows } = await query(`select * from tenants where id = $1`, [id]);
  return rows[0] ?? null;
}

// HM-S7 Phase 4c (2026-09-28): optional trailing `client` (same pattern as
// approvals.repo.mjs, Phase 4b) lets a caller with an existing begin/commit transaction on
// its own pg client (createTenantRecord, createFirmRecord in store.mjs) run these on that
// same connection instead of the shared pool. Omitting it keeps the original standalone-pool
// behavior for any other caller.
export async function createTenant(record, client = null) {
  return insertRow("tenants", TENANTS_COLUMNS, record, client);
}

export async function updateTenant(id, patch, client = null) {
  return updateRowById("tenants", TENANTS_COLUMNS, id, patch, client);
}

// --- firms ---
const FIRMS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "name", jsonb: false }, { name: "brand_id", jsonb: false }, { name: "business_entity_id", jsonb: false }, { name: "primary_principal_assignment_id", jsonb: false }, { name: "lifecycle_state", jsonb: false }, { name: "lifecycle_state_reason", jsonb: false }, { name: "active_practices", jsonb: true }, { name: "configuration_version", jsonb: false }, { name: "status", jsonb: false }, { name: "version", jsonb: false }, { name: "created_at", jsonb: false }, { name: "created_by_actor_id", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "updated_by_actor_id", jsonb: false }, { name: "data_classification", jsonb: false }, { name: "provenance", jsonb: true }, { name: "metadata", jsonb: true }];

export async function listFirmsByTenant(tenantId) {
  const { rows } = await query(
    `select * from firms where tenant_id = $1 order by created_at, id`,
    [tenantId]
  );
  return rows;
}

export async function getFirm(id) {
  const { rows } = await query(`select * from firms where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createFirm(record, client = null) {
  return insertRow("firms", FIRMS_COLUMNS, record, client);
}

export async function updateFirm(id, patch, client = null) {
  return updateRowById("firms", FIRMS_COLUMNS, id, patch, client);
}

// --- firm_memberships ---
const FIRM_MEMBERSHIPS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "actor_id", jsonb: false }, { name: "person_id", jsonb: false }, { name: "role", jsonb: false }, { name: "permissions", jsonb: true }, { name: "status", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listFirmMembershipsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from firm_memberships where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getFirmMembership(id) {
  const { rows } = await query(`select * from firm_memberships where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createFirmMembership(record, client = null) {
  return insertRow("firm_memberships", FIRM_MEMBERSHIPS_COLUMNS, record, client);
}

export async function updateFirmMembership(id, patch, client = null) {
  return updateRowById("firm_memberships", FIRM_MEMBERSHIPS_COLUMNS, id, patch, client);
}

// --- persons ---
const PERSONS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "identity_provider_subject", jsonb: false }, { name: "legal_name", jsonb: false }, { name: "preferred_name", jsonb: false }, { name: "contact_refs", jsonb: true }, { name: "status", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listPersonsByTenant(tenantId) {
  const { rows } = await query(
    `select * from persons where tenant_id = $1 order by created_at, id`,
    [tenantId]
  );
  return rows;
}

export async function getPerson(id) {
  const { rows } = await query(`select * from persons where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createPerson(record, client = null) {
  return insertRow("persons", PERSONS_COLUMNS, record, client);
}

export async function updatePerson(id, patch, client = null) {
  return updateRowById("persons", PERSONS_COLUMNS, id, patch, client);
}

// --- actors ---
const ACTORS_COLUMNS = [{ name: "id", jsonb: false }, { name: "actor_type", jsonb: false }, { name: "person_id", jsonb: false }, { name: "worker_instance_id", jsonb: false }, { name: "system_id", jsonb: false }, { name: "external_service_id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "display_name", jsonb: false }, { name: "status", jsonb: false }, { name: "created_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listActorsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from actors where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getActor(id) {
  const { rows } = await query(`select * from actors where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createActor(record, client = null) {
  return insertRow("actors", ACTORS_COLUMNS, record, client);
}

export async function updateActor(id, patch, client = null) {
  return updateRowById("actors", ACTORS_COLUMNS, id, patch, client);
}

// --- professional_profiles ---
const PROFESSIONAL_PROFILES_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "person_id", jsonb: false }, { name: "disciplines", jsonb: true }, { name: "specializations", jsonb: true }, { name: "jurisdictions", jsonb: true }, { name: "credential_refs", jsonb: true }, { name: "professional_status", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listProfessionalProfilesByTenant(tenantId) {
  const { rows } = await query(
    `select * from professional_profiles where tenant_id = $1 order by created_at, id`,
    [tenantId]
  );
  return rows;
}

export async function getProfessionalProfile(id) {
  const { rows } = await query(`select * from professional_profiles where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createProfessionalProfile(record, client = null) {
  return insertRow("professional_profiles", PROFESSIONAL_PROFILES_COLUMNS, record, client);
}

export async function updateProfessionalProfile(id, patch, client = null) {
  return updateRowById("professional_profiles", PROFESSIONAL_PROFILES_COLUMNS, id, patch, client);
}

// --- professional_authorities ---
const PROFESSIONAL_AUTHORITIES_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "professional_id", jsonb: false }, { name: "practice_id", jsonb: false }, { name: "service_scope", jsonb: true }, { name: "jurisdiction_id", jsonb: false }, { name: "permitted_actions", jsonb: true }, { name: "risk_limits", jsonb: true }, { name: "credential_refs", jsonb: true }, { name: "valid_from", jsonb: false }, { name: "valid_to", jsonb: false }, { name: "status", jsonb: false }, { name: "policy_basis_ref", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listProfessionalAuthoritiesByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from professional_authorities where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getProfessionalAuthority(id) {
  const { rows } = await query(`select * from professional_authorities where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createProfessionalAuthority(record, client = null) {
  return insertRow("professional_authorities", PROFESSIONAL_AUTHORITIES_COLUMNS, record, client);
}

export async function updateProfessionalAuthority(id, patch, client = null) {
  return updateRowById("professional_authorities", PROFESSIONAL_AUTHORITIES_COLUMNS, id, patch, client);
}

// --- service_packs ---
const SERVICE_PACKS_COLUMNS = [{ name: "id", jsonb: false }, { name: "code", jsonb: false }, { name: "name", jsonb: false }, { name: "discipline", jsonb: false }, { name: "status", jsonb: false }, { name: "version", jsonb: false }, { name: "description", jsonb: false }, { name: "configuration", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listAllServicePacks() {
  const { rows } = await query(`select * from service_packs order by created_at, id`);
  return rows;
}

export async function getServicePack(id) {
  const { rows } = await query(`select * from service_packs where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createServicePack(record) {
  return insertRow("service_packs", SERVICE_PACKS_COLUMNS, record);
}

export async function updateServicePack(id, patch) {
  return updateRowById("service_packs", SERVICE_PACKS_COLUMNS, id, patch);
}

// --- service_skus ---
const SERVICE_SKUS_COLUMNS = [{ name: "id", jsonb: false }, { name: "service_pack_id", jsonb: false }, { name: "code", jsonb: false }, { name: "name", jsonb: false }, { name: "status", jsonb: false }, { name: "pricing_model", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listAllServiceSkus() {
  const { rows } = await query(`select * from service_skus order by created_at, id`);
  return rows;
}

export async function getServiceSku(id) {
  const { rows } = await query(`select * from service_skus where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createServiceSku(record) {
  return insertRow("service_skus", SERVICE_SKUS_COLUMNS, record);
}

export async function updateServiceSku(id, patch) {
  return updateRowById("service_skus", SERVICE_SKUS_COLUMNS, id, patch);
}
