// Canonical identity resolution and firm-scoping, shared by both frontends
// (apps/web/public/app.js and apps/web-console/public/js/api.js).
//
// Phase 6, Slice 6b: before this file existed, each frontend had its own
// hand-copied version of this logic (web-console's api.js said so outright
// in a comment: "Replicates apps/web/public/app.js's activeFirmInStore() /
// activeTenantInStore() / latestPrincipalActor()"). Slice 6a's audit (see
// claude/vfirm-architecture-review.md) found the two copies had quietly
// diverged: app.js's scoping filter checked firm_id, requesting_firm_id,
// provider_firm_id, and accountable_firm_id plus a relationship/client/
// project fallback chain; web-console's checked only firm_id, silently
// leaking every firm's specialist_assignments, collaboration_workspaces,
// collaboration_requests, and responsibility_matrices records into every
// other firm's console. This file is the merged, correct version -- built
// from app.js's richer scoping logic, per that finding.
//
// Pure functions only. No localStorage, no DOM, no module-level state --
// each frontend keeps its own persistence/caching concerns (e.g. app.js's
// localStorage-backed "sticky" firm selection) in its own file and passes
// the result in here as plain data.

export function isArchivedPilotFirm(firm, store) {
  const tenant = (store?.tenants ?? []).find((item) => item.id === firm?.tenant_id);
  return /\bPD[- ]?H2\b/i.test(`${firm?.name ?? ""} ${tenant?.name ?? ""}`);
}

export function selectableFirmsForStore(store) {
  const firms = store?.firms ?? [];
  const currentPilotFirms = firms.filter((firm) => !isArchivedPilotFirm(firm, store));
  return currentPilotFirms.length ? currentPilotFirms : firms;
}

// preferredFirmId is an optional caller-supplied "sticky" pick (app.js
// passes its localStorage-persisted activeFirmId; web-console passes
// nothing and always gets the subscription/latest-fallback pick).
export function resolveActiveFirm(store, preferredFirmId) {
  const firms = store?.firms ?? [];
  const selectableFirms = selectableFirmsForStore(store);
  if (preferredFirmId) {
    const preferred = selectableFirms.find((firm) => firm.id === preferredFirmId);
    if (preferred) return preferred;
  }
  const packages = store?.subscription_packages ?? [];
  const subscribedFirm = [...selectableFirms]
    .reverse()
    .find((firm) =>
      packages.some((item) => item.firm_id === firm.id && item.package_status === "ACTIVE"),
    );
  return (
    subscribedFirm ??
    selectableFirms[selectableFirms.length - 1] ??
    firms[firms.length - 1] ??
    null
  );
}

export function resolveActiveTenant(store, firm) {
  const tenants = store?.tenants ?? [];
  return firm
    ? tenants.find((tenant) => tenant.id === firm.tenant_id) ?? null
    : tenants[tenants.length - 1] ?? null;
}

export function latestPrincipalActor(store, firmId) {
  const actors = store?.actors ?? [];
  return (
    [...actors].reverse().find((actor) => actor.firm_id === firmId && actor.actor_type === "HUMAN") ??
    null
  );
}

// Canonical identity resolver. Returns the full shape both frontends need:
// app.js uses firm/tenant/actor directly; web-console also wants the flat
// tenant_id/firm_id/actor_id/role fields for its request headers.
export function resolveIdentityFromStore(store, preferredFirmId) {
  const firm = resolveActiveFirm(store, preferredFirmId);
  const tenant = resolveActiveTenant(store, firm);
  const actor = firm ? latestPrincipalActor(store, firm.id) : null;
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

export function systemActor(tenantId, firmId) {
  return {
    actor_id: "system",
    actor_type: "SYSTEM",
    tenant_id: tenantId,
    firm_id: firmId,
    display_name: "vFirm System",
  };
}

// The full leak-closing scope filter. firm/tenant must already be resolved
// (e.g. via resolveIdentityFromStore) and belong to the same store.
//
// A record is scoped by, in order: a direct firm reference under firm_id,
// requesting_firm_id, provider_firm_id, or accountable_firm_id; failing
// that, its relationship_id/client_id/project_id chain back to a
// firm-scoped relationship or project; failing that, tenant_id alone.
// Collections with no firm/tenant-identifying field at all (reference
// data such as service_packs, worker_templates) pass through unfiltered.
export function scopeStoreToFirm(store, firm, tenant) {
  if (!firm || !tenant || !store || typeof store !== "object") return store;
  const firmIds = new Set([firm.id]);
  const scopedRelationships = (store.firm_client_relationships ?? []).filter(
    (item) => item.tenant_id === tenant.id && item.firm_id === firm.id,
  );
  const relationshipIds = new Set(scopedRelationships.map((item) => item.id));
  const clientIds = new Set(scopedRelationships.map((item) => item.client_id));
  const projectIds = new Set(
    (store.projects ?? [])
      .filter((item) => item.tenant_id === tenant.id && item.firm_id === firm.id)
      .map((item) => item.id),
  );
  const globalCollections = new Set([
    "service_packs",
    "service_skus",
    "worker_templates",
    "auth_context",
    "ops_readiness",
    "staging_package",
    "data_protection_policy",
    "data_export_manifest",
    "pilot_package",
    "pilot_learning_loop",
    "support_summary",
  ]);
  const scoped = { ...store };
  for (const [key, value] of Object.entries(store)) {
    if (!Array.isArray(value)) continue;
    if (key === "tenants") scoped[key] = [tenant];
    else if (key === "firms") scoped[key] = [firm];
    else if (globalCollections.has(key)) scoped[key] = value;
    else if (key === "firm_client_relationships") scoped[key] = scopedRelationships;
    else if (key === "clients")
      scoped[key] = value.filter(
        (item) =>
          item.tenant_id === tenant.id &&
          (clientIds.has(item.id) ||
            !(store.firm_client_relationships ?? []).some((rel) => rel.client_id === item.id)),
      );
    else if (["leads", "intake_sessions"].includes(key))
      scoped[key] = value.filter(
        (item) =>
          item.tenant_id === tenant.id &&
          (!item.relationship_id || relationshipIds.has(item.relationship_id)),
      );
    else if (["documents", "document_versions", "evidence_bundles"].includes(key))
      scoped[key] = value.filter(
        (item) =>
          item.tenant_id === tenant.id &&
          (!item.project_id || projectIds.has(item.project_id)) &&
          (!item.firm_id || item.firm_id === firm.id),
      );
    else
      scoped[key] = value.filter((item) => {
        if (item.tenant_id && item.tenant_id !== tenant.id) return false;
        const scopedFirmValues = [
          item.firm_id,
          item.requesting_firm_id,
          item.provider_firm_id,
          item.accountable_firm_id,
        ].filter(Boolean);
        if (scopedFirmValues.length) return scopedFirmValues.some((id) => firmIds.has(id));
        if (item.relationship_id) return relationshipIds.has(item.relationship_id);
        if (item.client_id) return clientIds.has(item.client_id);
        if (item.project_id) return projectIds.has(item.project_id);
        return item.tenant_id === tenant.id;
      });
  }
  return scoped;
}
