// HM-S6 item 3 -- repository layer scaffolding (Firm Factory / Provisioning).
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

// --- factory_firm_blueprints ---
const FACTORY_FIRM_BLUEPRINTS_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listFactoryFirmBlueprintsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from factory_firm_blueprints where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getFactoryFirmBlueprint(id) {
  const { rows } = await query(`select * from factory_firm_blueprints where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createFactoryFirmBlueprint(record) {
  return insertRow("factory_firm_blueprints", FACTORY_FIRM_BLUEPRINTS_COLUMNS, record);
}

export async function updateFactoryFirmBlueprint(id, patch) {
  return updateRowById("factory_firm_blueprints", FACTORY_FIRM_BLUEPRINTS_COLUMNS, id, patch);
}

// --- factory_provisioning_runs ---
const FACTORY_PROVISIONING_RUNS_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listFactoryProvisioningRunsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from factory_provisioning_runs where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getFactoryProvisioningRun(id) {
  const { rows } = await query(`select * from factory_provisioning_runs where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createFactoryProvisioningRun(record) {
  return insertRow("factory_provisioning_runs", FACTORY_PROVISIONING_RUNS_COLUMNS, record);
}

export async function updateFactoryProvisioningRun(id, patch) {
  return updateRowById("factory_provisioning_runs", FACTORY_PROVISIONING_RUNS_COLUMNS, id, patch);
}

// --- provisioned_firm_instances ---
const PROVISIONED_FIRM_INSTANCES_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listProvisionedFirmInstancesByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from provisioned_firm_instances where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getProvisionedFirmInstance(id) {
  const { rows } = await query(`select * from provisioned_firm_instances where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createProvisionedFirmInstance(record) {
  return insertRow("provisioned_firm_instances", PROVISIONED_FIRM_INSTANCES_COLUMNS, record);
}

export async function updateProvisionedFirmInstance(id, patch) {
  return updateRowById("provisioned_firm_instances", PROVISIONED_FIRM_INSTANCES_COLUMNS, id, patch);
}

// --- factory_worker_bindings ---
const FACTORY_WORKER_BINDINGS_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listFactoryWorkerBindingsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from factory_worker_bindings where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getFactoryWorkerBinding(id) {
  const { rows } = await query(`select * from factory_worker_bindings where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createFactoryWorkerBinding(record) {
  return insertRow("factory_worker_bindings", FACTORY_WORKER_BINDINGS_COLUMNS, record);
}

export async function updateFactoryWorkerBinding(id, patch) {
  return updateRowById("factory_worker_bindings", FACTORY_WORKER_BINDINGS_COLUMNS, id, patch);
}

// --- pack_compatibility_checks ---
const PACK_COMPATIBILITY_CHECKS_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listPackCompatibilityChecksByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from pack_compatibility_checks where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getPackCompatibilityCheck(id) {
  const { rows } = await query(`select * from pack_compatibility_checks where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createPackCompatibilityCheck(record) {
  return insertRow("pack_compatibility_checks", PACK_COMPATIBILITY_CHECKS_COLUMNS, record);
}

export async function updatePackCompatibilityCheck(id, patch) {
  return updateRowById("pack_compatibility_checks", PACK_COMPATIBILITY_CHECKS_COLUMNS, id, patch);
}

// --- pack_binding_certifications ---
const PACK_BINDING_CERTIFICATIONS_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listPackBindingCertificationsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from pack_binding_certifications where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getPackBindingCertification(id) {
  const { rows } = await query(`select * from pack_binding_certifications where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createPackBindingCertification(record) {
  return insertRow("pack_binding_certifications", PACK_BINDING_CERTIFICATIONS_COLUMNS, record);
}

export async function updatePackBindingCertification(id, patch) {
  return updateRowById("pack_binding_certifications", PACK_BINDING_CERTIFICATIONS_COLUMNS, id, patch);
}

// --- service_activation_records ---
const SERVICE_ACTIVATION_RECORDS_COLUMNS = [{ name: "id", jsonb: false }, { name: "natural_key", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "record", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listServiceActivationRecordsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from service_activation_records where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getServiceActivationRecord(id) {
  const { rows } = await query(`select * from service_activation_records where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createServiceActivationRecord(record) {
  return insertRow("service_activation_records", SERVICE_ACTIVATION_RECORDS_COLUMNS, record);
}

export async function updateServiceActivationRecord(id, patch) {
  return updateRowById("service_activation_records", SERVICE_ACTIVATION_RECORDS_COLUMNS, id, patch);
}
