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

// Reference data for the "Hire a worker" panel (My Team). Not fetched live --
// no GET endpoint exposes it -- so this is transcribed directly from the two
// source files that define it: only these 5 roles are actually hireable
// (packages/core-domain/src/awia-firm-package-catalogue.mjs's ALL_ROLES,
// used by hireAwiaFirmWorker's AWIA_HIREABLE_ROLE_PACKAGE_IDS map in
// apps/api/src/server.mjs -- CMO/CTO/CIO/CHRO/COO exist in the broader
// registry but hire-worker rejects them with role_not_hireable_yet). Update
// this list if those source files change.
export const HIREABLE_ROLES = [
  { role_code: "CFO", role_name: "Chief Finance Officer", default_staff_grade: "Executive" },
  { role_code: "FAO", role_name: "Finance Administration Officer", default_staff_grade: "Worker" },
  { role_code: "SAO", role_name: "Sales and Customer Operations Officer", default_staff_grade: "Worker" },
  { role_code: "OPO", role_name: "Operations and Project Delivery Officer", default_staff_grade: "Manager" },
  { role_code: "ARO", role_name: "Administration and Resources Officer", default_staff_grade: "Worker" },
];

// The only commercial package right now (packages/core-domain/src/awia-firm-package-catalogue.mjs,
// ADR-075): a firm must have this assigned before hire-worker will accept
// any role.
export const AWIA_HIRE_PACKAGE_CODE = "HIRE_ME";

export { request };
