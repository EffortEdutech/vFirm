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
import {
  resolveIdentityFromStore as resolveIdentityFromStoreShared,
  scopeStoreToFirm,
} from "/shared/identity-resolution.mjs";

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

// Phase 6 slice 6d: thin in-memory GET cache, shared across every page mount
// (this module is a singleton -- every page imports the same `api` object).
// Without it, switching Dashboard -> Team -> Dashboard re-fetches the whole
// store from scratch every time, even though nothing changed in between.
//
// Keyed by the exact request path (already includes ?tenant_id=&firm_id=
// from withScope(), so different firms/scopes never collide). Invalidation
// is deliberately blunt: any successful POST clears the entire cache, rather
// than trying to model which GET endpoints each POST route actually affects
// -- request() is the only fetch path in this app (every api.* method goes
// through it), so a full clear on write is guaranteed correct, just
// occasionally fetches a couple of endpoints that a given write didn't
// actually touch. A short TTL is kept as a safety net for anything that
// might mutate state outside this module's own POST calls (there isn't
// anything today, but it costs nothing to have).
const GET_CACHE_TTL_MS = 15000;
const getCache = new Map(); // path -> { data, expiresAt }

// Exposed for tests and for any future explicit "refresh" affordance --
// not called anywhere in the app today since POST already invalidates.
export function clearCache() {
  getCache.clear();
}

async function request(path, options = {}) {
  const method = options.method ?? "GET";
  if (method === "GET" && !options.skipCache) {
    const cached = getCache.get(path);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
  }
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
    err.details = payload?.error?.details;
    throw err;
  }
  const data = payload?.data ?? payload;
  if (method === "GET") {
    getCache.set(path, { data, expiresAt: Date.now() + GET_CACHE_TTL_MS });
  } else if (method === "POST") {
    getCache.clear();
  }
  return data;
}

// ADR-089 W1 (B1): firm file upload/download. The API takes the raw file bytes as the request
// body (POST /files/upload?tenant_id=&firm_id=&filename=...) -- no multipart -- so these bypass
// request()'s JSON serialization. Downloads need the auth headers too (anonymous downloads are
// refused server-side), so a plain <a href> cannot be used: fetch -> Blob -> temporary link.
async function uploadFile(file, { classification = "CLIENT_CONFIDENTIAL", purpose = "WORK_INPUT" } = {}) {
  const query = `filename=${encodeURIComponent(file.name)}&classification=${encodeURIComponent(classification)}&purpose=${encodeURIComponent(purpose)}`;
  const res = await fetch(API_PREFIX + withScope(`/files/upload?${query}`), {
    method: "POST",
    headers: { "content-type": file.type || "application/octet-stream", ...(await authHeaders()) },
    body: file,
  });
  let payload = null;
  try { payload = await res.json(); } catch { /* non-JSON error body */ }
  if (!res.ok || payload?.ok === false) {
    const err = new Error(payload?.error?.message ?? `Upload failed (${res.status})`);
    err.status = res.status;
    err.code = payload?.error?.code;
    throw err;
  }
  getCache.clear();
  return payload.data;
}

// CE-S2: one file linked to a BizKick transaction (raw bytes; the ID in the file name picks the
// transaction, or pass transactionId to link by hand). Returns the per-file outcome.
async function linkEdcsFile(file, { transactionId = "", role = "" } = {}) {
  const query = `filename=${encodeURIComponent(file.name)}${transactionId ? `&transaction_id=${encodeURIComponent(transactionId)}` : ""}${role ? `&role=${encodeURIComponent(role)}` : ""}`;
  const res = await fetch(API_PREFIX + withScope(`/edcs/files/upload?${query}`), {
    method: "POST",
    headers: { "content-type": file.type || "application/octet-stream", ...(await authHeaders()) },
    body: file,
  });
  let payload = null;
  try { payload = await res.json(); } catch { /* non-JSON error body */ }
  if (!res.ok || payload?.ok === false) {
    const err = new Error(payload?.error?.message ?? `Upload failed (${res.status})`);
    err.status = res.status;
    err.code = payload?.error?.code;
    throw err;
  }
  getCache.clear();
  return payload.data;
}

async function downloadFile(fileId, filename = "download") {
  const res = await fetch(API_PREFIX + withScope(`/files/${encodeURIComponent(fileId)}/download`), { headers: { ...(await authHeaders()) } });
  if (!res.ok) {
    let message = `Download failed (${res.status})`;
    try { message = (await res.json())?.error?.message ?? message; } catch { /* binary or empty */ }
    throw new Error(message);
  }
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export const api = {
  // ---- confirmed real GET endpoints ----
  // CE-H1 (ADR-100): once the signed-in identity is known the store read is scoped to that tenant on the
  // server (withScope adds tenant_id + firm_id; the server uses the tenant). Before identity is resolved
  // (boot) it stays the unscoped read it always was.
  getStore: () => request(withScope("/mvp/store")),
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
  decideClassAApproval: (body) => request("/awia/virtual-staff/output-class-a-approval", { method: "POST", body }),
  uploadFile,
  linkEdcsFile,
  downloadFile,
  // ADR-090 W2: owner work requests (the firm's front door) + internal work completion.
  getRequestTypes: () => request("/work-requests/request-types"),
  createWorkRequest: (body) => request("/work-requests", { method: "POST", body }),
  assignWorkRequest: (body) => request("/work-requests/assign", { method: "POST", body }),
  cancelWorkRequest: (body) => request("/work-requests/cancel", { method: "POST", body }),
  addWorkRequestFiles: (body) => request("/work-requests/add-files", { method: "POST", body }),
  completeInternalWork: (body) => request("/awia/virtual-staff/workdesk-item/complete-internal", { method: "POST", body }),
  // ADR-092 W3: the worker runs its skill over the request's inputs; the owner corrects inputs.
  runSkill: (body) => request("/awia/virtual-staff/workdesk-item/run-skill", { method: "POST", body }),
  updateWorkRequestInputs: (body) => request("/work-requests/update-inputs", { method: "POST", body }),
  // ADR-093 W4: item conversation (owner notes/answers) and the document register.
  postItemMessage: (body) => request("/awia/virtual-staff/workdesk-item/message", { method: "POST", body }),
  registerDocument: (body) => request("/documents", { method: "POST", body }),
  reviseDocument: (body) => request("/documents/revise", { method: "POST", body }),
  // CE-S1 (ADR-095): Connected EDCS (BizKick register import and sync ledger).
  getEdcsConnection: () => request(withScope("/edcs/connection"), { skipCache: true }),
  saveEdcsConnection: (body) => request("/edcs/connection", { method: "POST", body }),
  importEdcsRegister: (body) => request("/edcs/register-imports", { method: "POST", body }),
  listEdcsTransactions: (params = "") => request(withScope(`/edcs/transactions${params ? `?${params}` : ""}`), { skipCache: true }),
  getEdcsTransaction: (id) => request(withScope(`/edcs/transactions/${encodeURIComponent(id)}`), { skipCache: true }),
  listEdcsSyncRuns: () => request(withScope("/edcs/sync-runs"), { skipCache: true }),
  getEdcsSyncRun: (id) => request(withScope(`/edcs/sync-runs/${encodeURIComponent(id)}`), { skipCache: true }),
  getEdcsChains: () => request(withScope("/edcs/chains"), { skipCache: true }),
  // CE-S6: connector agent (register, rotate, revoke, health).
  listEdcsConnectors: () => request(withScope("/edcs/connectors"), { skipCache: true }),
  issueEdcsConnector: (body) => request("/edcs/connectors", { method: "POST", body }),
  rotateEdcsConnector: (body) => request("/edcs/connectors/rotate", { method: "POST", body }),
  revokeEdcsConnector: (body) => request("/edcs/connectors/revoke", { method: "POST", body }),
  // CE-S5: Delegation of Authority.
  getEdcsDelegation: (version = "") => request(withScope(`/edcs/delegation${version ? `?version=${encodeURIComponent(version)}` : ""}`), { skipCache: true }),
  previewEdcsDelegation: (body) => request("/edcs/delegation/preview", { method: "POST", body }),
  importEdcsDelegation: (body) => request("/edcs/delegation/import", { method: "POST", body }),
  // CE-S4: Number Authority.
  listEdcsNumbers: (params = "") => request(withScope(`/edcs/numbers${params ? `?${params}` : ""}`), { skipCache: true }),
  reserveEdcsNumber: (body) => request("/edcs/numbers/reserve", { method: "POST", body }),
  voidEdcsNumber: (body) => request("/edcs/numbers/void", { method: "POST", body }),
  // CE-S3: register-driven work rules.
  getEdcsSignals: () => request(withScope("/edcs/signals"), { skipCache: true }),
  listAutomationRules: () => request(withScope("/automation/rules"), { skipCache: true }),
  getAutomationActivity: (ruleId = "") => request(withScope(ruleId ? `/automation/rules/${encodeURIComponent(ruleId)}/activity` : "/automation/activity"), { skipCache: true }),
  createAutomationRule: (body) => request("/automation/rules", { method: "POST", body }),
  updateAutomationRule: (body) => request("/automation/rules/update", { method: "POST", body }),
  setAutomationRuleEnabled: (body) => request("/automation/rules/enable", { method: "POST", body }),
  dryRunAutomationRule: (body) => request("/automation/rules/dry-run", { method: "POST", body }),
  runAutomationNow: (body = {}) => request("/automation/evaluate", { method: "POST", body }),
  listEdcsConflicts: () => request(withScope("/edcs/conflicts"), { skipCache: true }),
  resolveEdcsConflict: (body) => request("/edcs/conflicts/resolve", { method: "POST", body }),
  linkEdcsCounterparty: (body) => request("/edcs/transactions/link-counterparty", { method: "POST", body }),
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

// Phase 6 slice 6b: this used to be a hand-copy of apps/web/public/app.js's
// activeFirmInStore()/activeTenantInStore()/latestPrincipalActor() (see
// claude/vfirm-architecture-review.md, Slice 6a). Both frontends now import
// the one canonical implementation from packages/core-domain, served at
// /shared/identity-resolution.mjs. Call once after GET /mvp/store at boot
// and pass the result to setIdentity().
export function resolveIdentityFromStore(store) {
  return resolveIdentityFromStoreShared(store);
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
// UPDATE (Phase 6 slice 6b, 2026-09-30): this used to only check a literal
// firm_id field, which missed specialist_assignments, collaboration_workspaces,
// collaboration_requests, and responsibility_matrices -- those key firm
// ownership by requesting_firm_id/provider_firm_id/accountable_firm_id
// instead, so every other firm's rows were still leaking through here (see
// claude/vfirm-architecture-review.md, Slice 6a finding #4). Now delegates
// to the shared scopeStoreToFirm(), which checks all four firm-id fields
// plus a relationship/client/project fallback chain, same as apps/web.
export function scopeStoreToCurrentFirm(store) {
  if (!identity?.firm || !identity?.tenant || !store || typeof store !== "object") return store;
  return scopeStoreToFirm(store, identity.firm, identity.tenant);
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
