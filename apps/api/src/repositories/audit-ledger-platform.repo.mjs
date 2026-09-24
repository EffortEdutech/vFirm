// HM-S6 item 3 -- repository layer scaffolding (Audit / Ledger / Platform & Ops).
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

// --- policy_decisions ---
const POLICY_DECISIONS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "policy_id", jsonb: false }, { name: "policy_version", jsonb: false }, { name: "actor_id", jsonb: false }, { name: "action", jsonb: false }, { name: "resource_type", jsonb: false }, { name: "resource_id", jsonb: false }, { name: "context_ref", jsonb: false }, { name: "result", jsonb: false }, { name: "reasons", jsonb: true }, { name: "created_at", jsonb: false }];

export async function listPolicyDecisionsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from policy_decisions where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getPolicyDecision(id) {
  const { rows } = await query(`select * from policy_decisions where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createPolicyDecision(record) {
  return insertRow("policy_decisions", POLICY_DECISIONS_COLUMNS, record);
}

export async function updatePolicyDecision(id, patch) {
  return updateRowById("policy_decisions", POLICY_DECISIONS_COLUMNS, id, patch);
}

// --- event_log ---
const EVENT_LOG_COLUMNS = [{ name: "id", jsonb: false }, { name: "event_type", jsonb: false }, { name: "event_version", jsonb: false }, { name: "occurred_at", jsonb: false }, { name: "recorded_at", jsonb: false }, { name: "actor_id", jsonb: false }, { name: "actor_type", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "aggregate_type", jsonb: false }, { name: "aggregate_id", jsonb: false }, { name: "aggregate_version", jsonb: false }, { name: "correlation_id", jsonb: false }, { name: "causation_id", jsonb: false }, { name: "idempotency_key", jsonb: false }, { name: "payload", jsonb: true }, { name: "payload_ref", jsonb: false }, { name: "payload_summary", jsonb: false }, { name: "policy_decision_id", jsonb: false }, { name: "audit_event_id", jsonb: false }, { name: "provenance", jsonb: true }];

export async function listEventLogByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from event_log where tenant_id = $1 and firm_id = $2 order by occurred_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getEventLog(id) {
  const { rows } = await query(`select * from event_log where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createEventLog(record) {
  return insertRow("event_log", EVENT_LOG_COLUMNS, record);
}

export async function updateEventLog(id, patch) {
  return updateRowById("event_log", EVENT_LOG_COLUMNS, id, patch);
}

// --- audit_events ---
const AUDIT_EVENTS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "actor_id", jsonb: false }, { name: "action", jsonb: false }, { name: "resource_type", jsonb: false }, { name: "resource_id", jsonb: false }, { name: "resource_version", jsonb: false }, { name: "policy_decision_id", jsonb: false }, { name: "correlation_id", jsonb: false }, { name: "causation_id", jsonb: false }, { name: "occurred_at", jsonb: false }, { name: "summary", jsonb: false }, { name: "evidence_ref", jsonb: false }];

export async function listAuditEventsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from audit_events where tenant_id = $1 and firm_id = $2 order by occurred_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getAuditEvent(id) {
  const { rows } = await query(`select * from audit_events where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createAuditEvent(record) {
  return insertRow("audit_events", AUDIT_EVENTS_COLUMNS, record);
}

export async function updateAuditEvent(id, patch) {
  return updateRowById("audit_events", AUDIT_EVENTS_COLUMNS, id, patch);
}
