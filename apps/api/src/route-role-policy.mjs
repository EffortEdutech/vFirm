// Role audit (ADR-115, 2026-10-12): who may call which route. Pure rules, no I/O.
//
// The sign-in gate (request-auth-gate.mjs, ADR-103) proves WHO is calling and which firm. It does not look at the role,
// so before this a plain invited member could call every route that had no explicit owner check. This module is the one
// central list. Owner decisions (2026-10-12): members do daily work only; a read-only observer exists; any route that is
// not named here is OWNER-only, so a new route is safe until someone opens it on purpose.
//
//   OWNER   firm owner only (isOwnerRole: owner, principal, pilot_principal, firm_principal, admin)
//   MEMBER  any firm member: daily work. Some of these are tiered by a stronger gate inside the route (approval limits,
//           professional authority); that gate still applies.
//   OBSERVER is read-only: refused on every write except the two read-like checks below.
// Reads (GET) are MEMBER unless the path is on the owner list.

import { isOwnerRole, normalizeRole } from "../../../packages/core-domain/src/edcs-delegation.mjs";

export const OBSERVER_ROLES = new Set(["pilot_observer", "observer", "viewer", "read_only", "readonly"]);
// Roles an invitation may carry. Anything else is refused, so nobody can invite a made-up or owner-like role by accident.
export const INVITE_ROLES = ["OWNER", "PILOT_PRINCIPAL", "FIRM_ADMIN", "MEMBER", "PILOT_OPERATOR", "PILOT_OBSERVER"];

// Writes any member may make (daily work).
export const MEMBER_WRITES = new Set([
  "POST /files/upload", "POST /edcs/files/upload",
  "POST /clients", "POST /intake-sessions", "POST /proposals",
  "POST /documents", "POST /documents/revise",
  "POST /work-requests", "POST /work-requests/assign", "POST /work-requests/cancel", "POST /work-requests/add-files", "POST /work-requests/update-inputs",
  "POST /awia/virtual-staff/workdesk-item/run-skill", "POST /awia/virtual-staff/workdesk-item/message",
  "POST /awia/virtual-staff/workdesk-item/archive", "POST /awia/virtual-staff/workdesk-item/complete-internal",
  "POST /awia/virtual-staff/task-readiness", "POST /awia/virtual-staff/assign-task", "POST /awia/virtual-staff/output-draft",
  "POST /awia/virtual-staff/client-delivery-draft", "POST /awia/virtual-staff/memory/append",
  "POST /awia/virtual-staff/conversation/open", "POST /awia/virtual-staff/conversation/message",
  // approvals: the route's own gate (approval tiers, professional authority) still decides
  "POST /awia/virtual-staff/output-review", "POST /awia/virtual-staff/output-class-a-approval",
  "POST /edcs/drafts", "POST /edcs/drafts/check", "POST /edcs/drafts/approve", "POST /edcs/drafts/reject", "POST /edcs/drafts/cancel",
  "POST /edcs/delegation/check", "POST /edcs/numbers/reserve",
  "POST /front-desk/enquiries", "POST /front-desk/enquiries/qualify", "POST /front-desk/communication-drafts", "POST /front-desk/enquiries/handoff",
  "POST /sales/opportunities", "POST /sales/opportunities/update",
  "POST /quotation-cases", "POST /quotation-cases/link-proposal", "POST /boq-extraction-aids", "POST /boq-extraction-aids/review",
  "POST /quotation-draft-packs", "POST /quotation-draft-packs/review", "POST /quotation-draft-packs/client-correspondence",
  "POST /tasks/start", "POST /tasks/complete", "POST /deliverables/draft",
  "POST /accounts/receivable-follow-ups",
  "POST /administration/correspondence", "POST /administration/documents", "POST /administration/document-revisions",
  "POST /administration/deadlines", "POST /administration/deadlines/complete", "POST /administration/transmittal-drafts",
  "POST /technical/drawing-reviews", "POST /technical/calculation-input-sets", "POST /technical/qa-findings", "POST /technical/qa-findings/resolve",
  "POST /pilot/feedback", "POST /support/cases", "POST /support/cases/update"
]);

// Writes with their own credential (checked by the route or the sign-in gate); not a role question.
export const OWN_CREDENTIAL = new Set([
  "POST /automation/tick", "POST /edcs/connector/heartbeat", "POST /edcs/sync", "POST /edcs/sync/file", "POST /edcs/connector/outbox", "POST /edcs/connector/outbox/ack",
  "POST /auth/signup-firm", "POST /tenants", "POST /firms", "POST /mvp/reset"
]);

// Read-like POSTs an observer may still use.
export const OBSERVER_POSTS = new Set(["POST /edcs/drafts/check", "POST /edcs/delegation/check"]);

// Reads only the owner may make (money, people, exports, admin, the owner's own pages).
export const OWNER_READ_PREFIXES = [
  "/accounts/cash-snapshot", "/awia/virtual-staff/payroll-summary", "/data-protection", "/database", "/ops", "/tenant-usage", "/commercial-launch",
  "/pilot", "/stakeholder-review", "/brief", "/passports", "/trust-ladder", "/scorecards", "/einvoice", "/billing", "/payments", "/subscriptions",
  "/audit-events", "/internal", "/factory", "/tenant-admin", "/network", "/marketplace", "/observatory", "/support/summary", "/support/r4-incident-policy",
  "/edcs/connectors", "/edcs/graph", "/automation/rules", "/standing"
];

const underPrefix = (pathname, prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`);

export function roleOf(actor) {
  return normalizeRole(actor?.role ?? "principal");
}

// -> "OWNER" | "MEMBER" | "OPEN"
export function requiredLevel(method, pathname) {
  const key = `${method} ${pathname}`;
  if (OWN_CREDENTIAL.has(key)) return "OPEN";
  if (method === "GET" || method === "HEAD") return OWNER_READ_PREFIXES.some((p) => underPrefix(pathname, p)) ? "OWNER" : "MEMBER";
  return MEMBER_WRITES.has(key) ? "MEMBER" : "OWNER";
}

// actor: { role }. Returns { allow:true } or { allow:false, status, code, message }.
export function evaluateRolePolicy({ method, pathname, actor }) {
  if (!actor) return { allow: true }; // no actor: the route does its own sign-in check
  const level = requiredLevel(method, pathname);
  if (level === "OPEN") return { allow: true };
  const role = roleOf(actor);
  const key = `${method} ${pathname}`;
  const write = !(method === "GET" || method === "HEAD");
  if (write && OBSERVER_ROLES.has(role) && !OBSERVER_POSTS.has(key)) {
    return { allow: false, status: 403, code: "OBSERVER_READ_ONLY", message: "An observer can look but not change anything." };
  }
  if (level === "OWNER" && !isOwnerRole(actor.role ?? "principal")) {
    return { allow: false, status: 403, code: "EDCS_OWNER_REQUIRED", message: "Only the firm owner can do this." };
  }
  return { allow: true };
}

export function inviteRoleError(role) {
  if (role === undefined || role === null || role === "") return null;
  return INVITE_ROLES.includes(String(role).toUpperCase().replace(/[\s-]+/g, "_")) ? null : `role must be one of ${INVITE_ROLES.join(", ")}.`;
}
