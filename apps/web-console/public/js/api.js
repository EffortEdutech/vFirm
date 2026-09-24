// Thin fetch layer for the console. Every path here is a route I confirmed
// by reading apps/api/src/server.mjs's route table directly -- nothing
// invented. Requests go through this app's own /api proxy (see
// src/server.mjs), matching the pattern apps/web already uses.
//
// Several of these GET endpoints call requireFields({tenant_id, firm_id})
// server-side and 400 without them (confirmed by reading their handlers:
// readActiveWorkspaceSummary, readAccountsCashSnapshot, readOperatorMetrics,
// readCommercialLaunchSummary, readTenantUsageBillingSummary,
// readPilotExpansionSummary, readPilotReviewBoardSummary,
// readSupportDeskSummary, readAwiaStaffDepartmentDashboard,
// readAwiaStaffPayrollSummary, readDailyOperations). The dev-header auth
// (devActorFromHeaders) also scopes results when x-vfirm-* headers are
// present. `setIdentity()` + `withScope()`/`authHeaders()` below replicate
// exactly what apps/web/public/app.js's devAuthHeaders()/activeFirmInStore()
// already do -- resolve an active firm/tenant/actor from GET /mvp/store
// once at boot, then attach it to every request.

import { getAccessToken } from "./auth.js";

const API_PREFIX = "/api";

let identity = null; // { tenant_id, firm_id, actor_id, role, firm, tenant, actor } | null

export function setIdentity(value) {
  identity = value;
}

export function getIdentity() {
  return identity;
}

// Real auth (Supabase session) takes over completely when present: the
// server's devActorFromHeaders() ignores x-vfirm-* headers entirely on any
// request that carries an Authorization header, verified or not, so sending
// both would be misleading. Falls back to the old dev-header shape only
// when there's no Supabase session at all (shouldn't happen post-login,
// since main.js redirects to /login.html first -- kept as a safety net).
async function authHeaders() {
  const token = await getAccessToken().catch(() => null);
  if (token) return { authorization: `Bearer ${token}` };
  if (!identity?.actor_id) return {};
  return {
    "x-vfirm-actor-id": identity.actor_id,
    "x-vfirm-tenant-id": identity.tenant_id,
    "x-vfirm-firm-id": identity.firm_id,
    "x-vfirm-role": identity.role ?? "principal",
  };
}

// Appends ?tenant_id=&firm_id= (or &-joins onto an existing query string) for
// the endpoints that require them. A no-op until identity is resolved.
function withScope(path) {
  if (!identity?.tenant_id || !identity?.firm_id) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}tenant_id=${encodeURIComponent(identity.tenant_id)}&firm_id=${encodeURIComponent(identity.firm_id)}`;
}

// Every mutating POST route on the API (confirmed by reading their handlers:
// hireAwiaFirmWorker, updateAwiaVirtualStaffLifecycle, assignAwiaVirtualStaffTask,
// assignAwiaFirmPackage, and the rest of the command handlers in
// apps/api/src/server.mjs) does `requireFields(body, ["tenant_id", "firm_id", ...])`
// checked against the RAW REQUEST BODY -- unlike the GET side, headers alone
// don't satisfy it. So every POST body needs tenant_id/firm_id merged in
// unless the caller already set them explicitly.
function scopedBody(body) {
  if (!identity?.tenant_id || !identity?.firm_id) return body;
  return { tenant_id: identity.tenant_id, firm_id: identity.firm_id, ...(body ?? {}) };
}

async function request(path, options = {}) {
  const method = options.method ?? "GET";
  const body = method === "POST" ? scopedBody(options.body) : options.body;
  const res = await fetch(API_PREFIX + path, {
    method,
    headers: { "content-type": "application/json", ...(await authHeaders()), ...(options.headers ?? {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let payload = null;
  try { payload = await res.json(); } catch { /* non-JSON error body */ }
  if (!res.ok || payload?.ok === false) {
    const message = payload?.error?.message ?? `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.code = payload?.error?.code;
    throw err;
  }
  return payload?.data ?? payload;
}

export const api = {
  // ---- confirmed real GET endpoints ----
  getStore: () => request("/mvp/store"),
  getWorkspaceSummary: () => request(withScope("/workspace/active-summary")),
  getAuthContext: () => request("/auth/context"),
  getDashboardSummary: () => request("/dashboard/summary"),
  getOpsReadiness: () => request("/ops/readiness"),
  getOperationsToday: () => request(withScope("/operations/today")),
  getOperatorMetrics: () => request(withScope("/ops/operator-metrics")),
  getCashSnapshot: () => request(withScope("/accounts/cash-snapshot")),
  getCommercialLaunchSummary: () => request(withScope("/commercial-launch/summary")),
  getExpansionSummary: () => request(withScope("/pilot/expansion-summary")),
  getReviewBoardSummary: () => request(withScope("/stakeholder-review/summary")),
  getSupportSummary: () => request(withScope("/support/summary")),
  getTenantUsageSummary: () => request(withScope("/tenant-usage/summary")),
  getServicePackFormwork: () => request("/service-packs/formwork"),
  getAwiaTemplates: () => request("/awia/virtual-staff/templates"),
  getAwiaDepartmentDashboard: () => request(withScope("/awia/virtual-staff/department-dashboard")),
  getAwiaPayrollSummary: () => request(withScope("/awia/virtual-staff/payroll-summary")),
  getFirmPackageAssignment: () => request(withScope("/ops/awia-package-assignment")),

  // ---- confirmed real POST endpoints (mutating actions) ----
  enableHiring: (body) => request("/ops/awia-package-assignment", { method: "POST", body }),
  hireWorker: (body) => request("/awia/virtual-staff/hire-worker", { method: "POST", body }),
  updateStaffLifecycle: (body) => request("/awia/virtual-staff/lifecycle", { method: "POST", body }),
  assignTask: (body) => request("/awia/virtual-staff/assign-task", { method: "POST", body }),
  produceOutputDraft: (body) => request("/awia/virtual-staff/output-draft", { method: "POST", body }),
  reviewOutputDraft: (body) => request("/awia/virtual-staff/output-review", { method: "POST", body }),
  prepareClientDeliveryDraft: (body) => request("/awia/virtual-staff/client-delivery-draft", { method: "POST", body }),
  markClientDeliverySent: (body) => request("/awia/virtual-staff/client-delivery-draft/mark-sent", { method: "POST", body }),
  archiveWorkdeskItem: (body) => request("/awia/virtual-staff/workdesk-item/archive", { method: "POST", body }),
  provisionPilotStaff: (body) => request("/awia/virtual-staff/provision-pilot", { method: "POST", body }),
  evaluateTaskReadiness: (body) => request("/awia/virtual-staff/task-readiness", { method: "POST", body }),
  createClient: (body) => request("/clients", { method: "POST", body }),
  createProposal: (body) => request("/proposals", { method: "POST", body }),
  createInvoice: (body) => request("/invoices", { method: "POST", body }),
  createFrontDeskEnquiry: (body) => request("/front-desk/enquiries", { method: "POST", body }),
  createSalesOpportunity: (body) => request("/sales/opportunities", { method: "POST", body }),

  // ---- real auth (Supabase) ----
  getAuthMe: () => request("/auth/me"),
  signupFirm: (body) => request("/auth/signup-firm", { method: "POST", body }),
  inviteFirmMember: (body) => request("/auth/invite", { method: "POST", body }),
};

// Best-effort actor for POST bodies. In practice this isn't needed: the
// server's actorFromBody() (confirmed by reading it) falls back to
// devActorFromHeaders() when a request has no body.actor, so the headers
// authHeaders() attaches above are enough. Kept as an explicit opt-in for
// any caller that wants to send `actor` in the body directly.
export function fallbackActor(tenantId, firmId) {
  return { id: identity?.actor_id ?? "console-operator", display_name: "Console Operator", tenant_id: tenantId, firm_id: firmId };
}

// Replicates apps/web/public/app.js's activeFirmInStore() / activeTenantInStore()
// / latestPrincipalActor() (read directly from that file): pick the active
// firm (prefer one with an ACTIVE subscription package, skip archived
// PD-H2 pilot firms, else the most recently created firm), its tenant, and
// the most recently created HUMAN actor scoped to that firm. Call once
// after GET /mvp/store at boot and pass the result to setIdentity().
export function resolveIdentityFromStore(store) {
  const firms = store?.firms ?? [];
  const tenants = store?.tenants ?? [];
  const packages = store?.subscription_packages ?? [];
  const actors = store?.actors ?? [];

  const isArchivedPilotFirm = (firm) => {
    const tenant = tenants.find((t) => t.id === firm?.tenant_id);
    return /\bPD[- ]?H2\b/i.test(`${firm?.name ?? ""} ${tenant?.name ?? ""}`);
  };

  const selectable = firms.filter((firm) => !isArchivedPilotFirm(firm));
  const pool = selectable.length ? selectable : firms;
  const subscribedFirm = [...pool].reverse().find((firm) =>
    packages.some((pkg) => pkg.firm_id === firm.id && pkg.package_status === "ACTIVE")
  );
  const firm = subscribedFirm ?? pool[pool.length - 1] ?? firms[firms.length - 1] ?? null;
  const tenant = firm ? tenants.find((t) => t.id === firm.tenant_id) ?? null : tenants[tenants.length - 1] ?? null;
  const actor = firm ? [...actors].reverse().find((a) => a.firm_id === firm.id && a.actor_type === "HUMAN") ?? null : null;

  return {
    tenant_id: actor?.tenant_id ?? firm?.tenant_id ?? tenant?.id ?? null,
    firm_id: actor?.firm_id ?? firm?.id ?? null,
    actor_id: actor?.actor_id ?? actor?.id ?? null,
    role: actor?.role ?? "principal",
    firm,
    tenant,
    actor,
  };
}

// SECURITY FIX (post-HM-S4, 2026-09-21): GET /mvp/store is deliberately a
// full, unscoped whole-database dump (see packages/core-domain/src/
// api-contracts.mjs: "Compatibility full-store read for local development
// fallback", policyRequired: false). That's legitimate for
// resolveIdentityFromStore() below (called once at boot, before any firm is
// known) and for the dev/test scripts that read it directly. It is NOT
// legitimate for a logged-in firm's own console pages to render straight off
// -- doing so was a real cross-tenant data leak: My Team, Workdesk, Sales,
// Projects and Finance all called api.getStore() and rendered its collections
// as if they belonged to the current firm, when in fact every other firm's
// AWIA staff, clients, projects, invoices etc. were mixed in too (invisible
// while only one real firm existed in the store; became visible once HM-S3
// put multiple real firms in one shared live database). Every content page
// must filter through this before rendering.
//
// A record is "firm-scoped" if it carries a firm_id field at all; only those
// records are filtered down to the current firm. Arrays whose records don't
// carry firm_id (firms, tenants themselves) are left untouched -- they are
// reference/identity data, not a specific firm's own data, and filtering
// them would break nothing that reads them today but is deliberately not
// the mission of this function.
export function scopeStoreToCurrentFirm(store) {
  if (!identity?.firm_id || !store || typeof store !== "object") return store;
  const scoped = {};
  for (const [key, value] of Object.entries(store)) {
    if (!Array.isArray(value)) { scoped[key] = value; continue; }
    const isFirmScoped = value.some((item) => item && typeof item === "object" && "firm_id" in item);
    scoped[key] = isFirmScoped ? value.filter((item) => item?.firm_id === identity.firm_id) : value;
  }
  return scoped;
}

// Reference data for the "Hire a worker" panel (My Team).
//
// HM-S1 checklist item 3 (owner-accepted, "vFirm Position-to-Skill Mapping
// v1.0" doc, ADR-084 candidate): this list is now keyed by client-facing
// POSITION (job title), transcribed from
// packages/core-domain/src/awia-virtual-staff-position-catalogue.mjs, not by
// raw role code. `role_code` is kept on every entry as the underlying
// capability reference only -- it is what actually gets sent to
// POST /awia/virtual-staff/hire-worker (apps/api/src/server.mjs's
// AWIA_HIREABLE_ROLE_PACKAGE_IDS map still only recognizes CFO/FAO/SAO/OPO/ARO;
// CMO/CTO/CIO/CHRO/COO still reject with role_not_hireable_yet) -- it is not
// meant to be shown to the client as the label anymore. `position_id` is set
// for the 5 starter positions from the mapping doc; CFO has no position_id
// because it isn't part of that 5-position mapping and is kept hireable
// as-is per the checklist item's own instruction to keep existing role codes
// as the underlying capability reference. Update this list if the position
// catalogue file changes.
//
// HM-S1 gap CLOSED in HM-S4 item 2 (2026-09-20): the hire-worker API now
// accepts and persists a real body.position_id (hireAwiaFirmWorkerRecord,
// apps/api/src/store.mjs), validated against the position catalogue and
// stored on the staff member record. The "Hire" button below now sends
// position_id from this table, so General Clerk and HR Administrator --
// both role_code "ARO" -- are finally distinguishable server-side, not just
// in this display list. display_name is still sent as before (cosmetic
// only); position_id is the real field authority checks now key off.
export const HIREABLE_ROLES = [
  { role_code: "CFO", role_name: "Chief Finance Officer", default_staff_grade: "Executive" },
  { position_id: "general_clerk", role_code: "ARO", role_name: "General Clerk", default_staff_grade: "Worker" },
  { position_id: "bookkeeper", role_code: "FAO", role_name: "Bookkeeper", default_staff_grade: "Worker" },
  { position_id: "sales_coordinator", role_code: "SAO", role_name: "Sales Coordinator", default_staff_grade: "Worker" },
  { position_id: "ops_coordinator", role_code: "OPO", role_name: "Ops Coordinator", default_staff_grade: "Manager" },
  { position_id: "hr_administrator", role_code: "ARO", role_name: "HR Administrator", default_staff_grade: "Worker" },
];

// The only commercial package right now (packages/core-domain/src/awia-firm-package-catalogue.mjs,
// ADR-075): a firm must have this assigned before hire-worker will accept
// any role.
export const AWIA_HIRE_PACKAGE_CODE = "HIRE_ME";

export { request };
