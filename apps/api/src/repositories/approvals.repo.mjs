// HM-S6 item 3 -- repository layer scaffolding (Approvals (shared, cross-domain: Sales & Intake, Client Engagements & Projects, Finance & Commercial)).
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

// --- approvals ---
const APPROVALS_COLUMNS = [{ name: "id", jsonb: false }, { name: "tenant_id", jsonb: false }, { name: "firm_id", jsonb: false }, { name: "subject_type", jsonb: false }, { name: "subject_id", jsonb: false }, { name: "subject_version_or_hash", jsonb: false }, { name: "requested_by_actor_id", jsonb: false }, { name: "approver_actor_id", jsonb: false }, { name: "approver_professional_id", jsonb: false }, { name: "authority_id", jsonb: false }, { name: "decision", jsonb: false }, { name: "conditions", jsonb: true }, { name: "evidence_bundle_id", jsonb: false }, { name: "authentication_strength", jsonb: false }, { name: "decided_at", jsonb: false }, { name: "audit_event_id", jsonb: false }, { name: "created_at", jsonb: false }];

export async function listApprovalsByFirm(tenantId, firmId) {
  const { rows } = await query(
    `select * from approvals where tenant_id = $1 and firm_id = $2 order by created_at, id`,
    [tenantId, firmId]
  );
  return rows;
}

export async function getApproval(id) {
  const { rows } = await query(`select * from approvals where id = $1`, [id]);
  return rows[0] ?? null;
}

// HM-S7 Phase 4b (2026-09-28): optional trailing `client` lets a caller that already has a
// transaction open on its own pg client (e.g. store.mjs's approveProposalRecord /
// reviewDeliverableRecord, which insert an approval alongside other table writes in one
// begin/commit) run this insert on that same connection instead of the shared pool -- so
// wiring a handler onto this repository layer doesn't weaken a transaction it already had.
// Omitting it keeps the original standalone-pool behavior for any other caller.
export async function createApproval(record, client = null) {
  return insertRow("approvals", APPROVALS_COLUMNS, record, client);
}

export async function updateApproval(id, patch, client = null) {
  return updateRowById("approvals", APPROVALS_COLUMNS, id, patch, client);
}
