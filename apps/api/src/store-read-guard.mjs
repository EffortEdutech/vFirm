// CE-H1 follow-up (ADR-102, 2026-10-06): access rule for GET /mvp/store.
//
// GET /mvp/store used to be a deliberate whole-database dump that trusted its caller. That is fine for the
// local JSON dev store and the smoke scripts, and wrong for a shared production database. This module holds
// the rule as a pure function so it can be tested without a server or a real JWT.
//
// When the rule is ENFORCED (production: Postgres backend with real Supabase JWT verification, or forced with
// VFIRM_STORE_AUTH=required):
//   - the whole-database dump (no tenant_id) needs the service token (x-vfirm-service-token);
//   - a tenant-scoped read needs a request whose Bearer token was verified, and the verified actor must belong
//     to that tenant (and to that firm when a firm_id is given). Client-set x-vfirm-* headers are NOT trusted.
// When NOT enforced (local JSON dev, the smoke scripts): behaviour is exactly what it always was.

export function storeAuthEnforced({ env = process.env, backend, supabaseConfigured } = {}) {
  const forced = String(env.VFIRM_STORE_AUTH ?? "").toLowerCase();
  if (forced === "required") return true;
  if (forced === "open") return false;
  return backend === "postgres" && Boolean(supabaseConfigured);
}

// auth: req.vfirmSupabaseAuth ({ ok, actor }) or undefined when the request carried no Bearer token.
export function evaluateStoreReadAccess({ enforced, tenantId, firmId, auth, serviceTokenOk }) {
  if (!enforced) return { allow: true };
  if (!tenantId) {
    if (serviceTokenOk) return { allow: true };
    return {
      allow: false,
      status: 403,
      code: "FULL_STORE_READ_LOCKED",
      message: "GET /mvp/store without tenant_id is the whole-database dump and needs the service token on this server."
    };
  }
  if (!auth?.ok || !auth.actor) {
    return { allow: false, status: 401, code: "AUTH_REQUIRED", message: "A signed-in user is required to read the store." };
  }
  const actor = auth.actor;
  if (!actor.tenant_id || String(actor.tenant_id) !== String(tenantId)) {
    return { allow: false, status: 403, code: "FORBIDDEN", message: "The signed-in user cannot read another tenant's store." };
  }
  if (firmId && actor.firm_id && String(actor.firm_id) !== String(firmId)) {
    return { allow: false, status: 403, code: "FORBIDDEN", message: "The signed-in user cannot read another firm's store." };
  }
  return { allow: true };
}
