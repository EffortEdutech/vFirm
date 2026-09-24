// HM-S6 item 3 -- repository layer scaffolding (Finance & Commercial).
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

// --- invoices ---
const INVOICES_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "relationship_id", jsonb: false }, { name: "engagement_id", jsonb: false }, { name: "project_id", jsonb: false }, { name: "invoice_number", jsonb: false }, { name: "currency", jsonb: false }, { name: "line_items", jsonb: true }, { name: "tax_summary", jsonb: true }, { name: "status", jsonb: false }, { name: "due_at", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listInvoicesByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from invoices where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getInvoice(id) {
  const { rows } = await query(`select * from invoices where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createInvoice(record) {
  return insertRow("invoices", INVOICES_COLUMNS, record);
}

export async function updateInvoice(id, patch) {
  return updateRowById("invoices", INVOICES_COLUMNS, id, patch);
}

// --- payment_statuses ---
const PAYMENT_STATUSES_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "invoice_id", jsonb: false }, { name: "amount", jsonb: false }, { name: "currency", jsonb: false }, { name: "provider_ref", jsonb: false }, { name: "payment_status", jsonb: false }, { name: "received_at", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }];

export async function listPaymentStatusesByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from payment_statuses where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getPaymentStatus(id) {
  const { rows } = await query(`select * from payment_statuses where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createPaymentStatus(record) {
  return insertRow("payment_statuses", PAYMENT_STATUSES_COLUMNS, record);
}

export async function updatePaymentStatus(id, patch) {
  return updateRowById("payment_statuses", PAYMENT_STATUSES_COLUMNS, id, patch);
}

// --- expense_records ---
const EXPENSE_RECORDS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "project_id", jsonb: false }, { name: "supplier", jsonb: false }, { name: "description", jsonb: false }, { name: "category", jsonb: false }, { name: "amount", jsonb: false }, { name: "currency", jsonb: false }, { name: "expense_date", jsonb: false }, { name: "receipt_ref", jsonb: false }, { name: "status", jsonb: false }, { name: "prepared_by_actor_id", jsonb: false }, { name: "approved_by_actor_id", jsonb: false }, { name: "approved_at", jsonb: false }, { name: "payment_instruction_ref", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listExpenseRecordsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from expense_records where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getExpenseRecord(id) {
  const { rows } = await query(`select * from expense_records where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createExpenseRecord(record) {
  return insertRow("expense_records", EXPENSE_RECORDS_COLUMNS, record);
}

export async function updateExpenseRecord(id, patch) {
  return updateRowById("expense_records", EXPENSE_RECORDS_COLUMNS, id, patch);
}

// --- receivable_follow_ups ---
const RECEIVABLE_FOLLOW_UPS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "invoice_id", jsonb: false }, { name: "channel", jsonb: false }, { name: "subject", jsonb: false }, { name: "message_body", jsonb: false }, { name: "status", jsonb: false }, { name: "requires_human_review", jsonb: false }, { name: "prepared_by_actor_id", jsonb: false }, { name: "approved_by_actor_id", jsonb: false }, { name: "sent_at", jsonb: false }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listReceivableFollowUpsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from receivable_follow_ups where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getReceivableFollowUp(id) {
  const { rows } = await query(`select * from receivable_follow_ups where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createReceivableFollowUp(record) {
  return insertRow("receivable_follow_ups", RECEIVABLE_FOLLOW_UPS_COLUMNS, record);
}

export async function updateReceivableFollowUp(id, patch) {
  return updateRowById("receivable_follow_ups", RECEIVABLE_FOLLOW_UPS_COLUMNS, id, patch);
}

// --- payment_provider_configs ---
const PAYMENT_PROVIDER_CONFIGS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "configured_by_actor_id", jsonb: false }, { name: "provider_name", jsonb: false }, { name: "provider_mode", jsonb: false }, { name: "config_status", jsonb: false }, { name: "capabilities", jsonb: true }, { name: "required_env", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listPaymentProviderConfigsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from payment_provider_configs where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getPaymentProviderConfig(id) {
  const { rows } = await query(`select * from payment_provider_configs where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createPaymentProviderConfig(record) {
  return insertRow("payment_provider_configs", PAYMENT_PROVIDER_CONFIGS_COLUMNS, record);
}

export async function updatePaymentProviderConfig(id, patch) {
  return updateRowById("payment_provider_configs", PAYMENT_PROVIDER_CONFIGS_COLUMNS, id, patch);
}

// --- subscription_packages ---
const SUBSCRIPTION_PACKAGES_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "created_by_actor_id", jsonb: false }, { name: "package_code", jsonb: false }, { name: "package_name", jsonb: false }, { name: "package_status", jsonb: false }, { name: "pricing_model", jsonb: false }, { name: "base_price", jsonb: false }, { name: "currency", jsonb: false }, { name: "usage_limits", jsonb: true }, { name: "features", jsonb: true }, { name: "created_at", jsonb: false }, { name: "updated_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listSubscriptionPackagesByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from subscription_packages where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getSubscriptionPackage(id) {
  const { rows } = await query(`select * from subscription_packages where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createSubscriptionPackage(record) {
  return insertRow("subscription_packages", SUBSCRIPTION_PACKAGES_COLUMNS, record);
}

export async function updateSubscriptionPackage(id, patch) {
  return updateRowById("subscription_packages", SUBSCRIPTION_PACKAGES_COLUMNS, id, patch);
}

// --- commercial_launch_controls ---
const COMMERCIAL_LAUNCH_CONTROLS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "payment_provider_config_id", jsonb: false }, { name: "subscription_package_id", jsonb: false }, { name: "reviewed_by_actor_id", jsonb: false }, { name: "launch_status", jsonb: false }, { name: "required_controls", jsonb: true }, { name: "decision_summary", jsonb: false }, { name: "created_at", jsonb: false }, { name: "decided_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listCommercialLaunchControlsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from commercial_launch_controls where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getCommercialLaunchControl(id) {
  const { rows } = await query(`select * from commercial_launch_controls where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createCommercialLaunchControl(record) {
  return insertRow("commercial_launch_controls", COMMERCIAL_LAUNCH_CONTROLS_COLUMNS, record);
}

export async function updateCommercialLaunchControl(id, patch) {
  return updateRowById("commercial_launch_controls", COMMERCIAL_LAUNCH_CONTROLS_COLUMNS, id, patch);
}

// --- billing_readiness_reviews ---
const BILLING_READINESS_REVIEWS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "reviewed_by_actor_id", jsonb: false }, { name: "readiness_status", jsonb: false }, { name: "pricing_model", jsonb: false }, { name: "decision_summary", jsonb: false }, { name: "created_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listBillingReadinessReviewsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from billing_readiness_reviews where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getBillingReadinessReview(id) {
  const { rows } = await query(`select * from billing_readiness_reviews where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createBillingReadinessReview(record) {
  return insertRow("billing_readiness_reviews", BILLING_READINESS_REVIEWS_COLUMNS, record);
}

export async function updateBillingReadinessReview(id, patch) {
  return updateRowById("billing_readiness_reviews", BILLING_READINESS_REVIEWS_COLUMNS, id, patch);
}

// --- tenant_usage_events ---
const TENANT_USAGE_EVENTS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "actor_id", jsonb: false }, { name: "usage_type", jsonb: false }, { name: "quantity", jsonb: false }, { name: "unit", jsonb: false }, { name: "source_ref", jsonb: false }, { name: "recorded_at", jsonb: false }, { name: "metadata", jsonb: true }];

export async function listTenantUsageEventsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from tenant_usage_events where tenant_id = $1 and firm_id = $2 order by recorded_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getTenantUsageEvent(id) {
  const { rows } = await query(`select * from tenant_usage_events where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createTenantUsageEvent(record) {
  return insertRow("tenant_usage_events", TENANT_USAGE_EVENTS_COLUMNS, record);
}

export async function updateTenantUsageEvent(id, patch) {
  return updateRowById("tenant_usage_events", TENANT_USAGE_EVENTS_COLUMNS, id, patch);
}
