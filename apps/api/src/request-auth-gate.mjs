// Production-auth sprint (ADR-103, 2026-10-06): one gate in front of every route.
//
// Before this, each route resolved its own caller, and many fell back to trusting client-set x-vfirm-* headers or
// to a synthetic system actor (see devActorFromHeaders / actorFromBody in server.mjs). On a public address that
// let an anonymous caller act as any user. When ENFORCED (the same switch as ADR-102: Postgres + real Supabase
// verification, or VFIRM_STORE_AUTH=required) this gate refuses a request before any route code runs unless it
// carries a verified Bearer session of an onboarded user, or is one of the few routes with their own credential.
// Because every allowed request then has a verified Bearer actor, devActorFromHeaders can never reach its
// header-trusting branch and actorFromBody can never reach its system-actor fallback on those routes.
// When NOT enforced (local JSON dev, smoke scripts) nothing changes.

const PUBLIC = new Set(["GET /health", "GET /auth/provider/config", "GET /auth/me"]);
// Own credential, checked by the route or its own guard.
const SERVICE_TOKEN_ROUTES = new Set(["POST /automation/tick", "GET /mvp/store"]);
const CONNECTOR_TOKEN_ROUTES = new Set(["POST /edcs/connector/heartbeat", "POST /edcs/sync", "POST /edcs/sync/file", "POST /edcs/connector/outbox", "POST /edcs/connector/outbox/ack"]);
// Development-only routes: never available on an enforced server (sign-up goes through /auth/signup-firm).
const DEV_ONLY = new Set(["POST /tenants", "POST /firms", "POST /mvp/reset"]);

export function evaluateRequestGate({ enforced, method, pathname, auth, hasConnectorToken, query = {} }) {
  if (!enforced) return { allow: true };
  const key = `${method} ${pathname}`;
  if (PUBLIC.has(key) || SERVICE_TOKEN_ROUTES.has(key)) return { allow: true };
  if (CONNECTOR_TOKEN_ROUTES.has(key)) {
    return hasConnectorToken ? { allow: true } : deny(401, "AUTH_REQUIRED", "A connector token is required.");
  }
  if (DEV_ONLY.has(key)) return deny(403, "DEV_ONLY_ROUTE", "This route is for local development and is not available on this server.");
  if (!auth) return deny(401, "AUTH_REQUIRED", "Sign in to use this route.");
  if (!auth.ok) return deny(401, "AUTH_INVALID", "Session token is invalid or expired.");
  if (key === "POST /auth/signup-firm") return { allow: true }; // a verified session that is not onboarded yet
  if (!auth.actor) return deny(403, "NOT_ONBOARDED", "This account is not linked to a firm yet.");
  const actor = auth.actor;
  if (query.tenant_id && String(query.tenant_id) !== String(actor.tenant_id)) return deny(403, "FORBIDDEN", "The signed-in user cannot use another tenant's data.");
  if (query.firm_id && actor.firm_id && String(query.firm_id) !== String(actor.firm_id)) return deny(403, "FORBIDDEN", "The signed-in user cannot use another firm's data.");
  return { allow: true };
}

function deny(status, code, message) {
  return { allow: false, status, code, message };
}
