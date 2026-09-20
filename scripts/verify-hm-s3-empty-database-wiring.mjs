// HM-S3 item 0 -- read-only verification.
//
// Purpose: after DATABASE_URL has been repointed at the real Supabase
// project's Postgres and migrations applied, confirm the app is actually
// reading from that database and that it starts genuinely empty (no
// pilot-firm data carried over from the old local Postgres).
//
// This script makes NO writes. It reads /health and /mvp/store only.

const base = process.env.VFIRM_API_BASE ?? "http://127.0.0.1:3091";

async function main() {
  const health = await fetch(`${base}/health`).then((r) => r.json()).catch(() => null);
  if (!health?.ok) throw new Error(`vFirm API is not healthy at ${base}`);

  const storeResponse = await fetch(`${base}/mvp/store`);
  const storeJson = await storeResponse.json().catch(() => ({ ok: false, error: { message: "Non-JSON response" } }));
  if (!storeResponse.ok || !storeJson.ok) throw new Error(`/mvp/store failed: ${storeResponse.status} ${JSON.stringify(storeJson)}`);
  const store = storeJson.data;

  const counts = {
    tenants: (store.tenants ?? []).length,
    firms: (store.firms ?? []).length,
    clients: (store.clients ?? []).length,
    proposals: (store.proposals ?? []).length,
    projects: (store.projects ?? []).length,
    awia_virtual_staff_members: (store.awia_virtual_staff_members ?? []).length,
    awia_firm_package_assignments: (store.awia_firm_package_assignments ?? []).length
  };
  const totalRecords = Object.values(counts).reduce((sum, n) => sum + n, 0);

  console.log(JSON.stringify({
    audit: "hm-s3-item-0-empty-database-wiring-check",
    boundary: "read_only_no_writes",
    checked_at: new Date().toISOString(),
    api_base: base,
    persistence_backend: health.persistence ?? "unknown (check /health response shape)",
    counts,
    is_empty_start: totalRecords === 0,
    note: totalRecords === 0
      ? "Confirmed: the app is reporting zero business records. If this now points at Supabase, empty start is verified."
      : "Not empty -- either DATABASE_URL still points at the old database, or some records already exist. Compare persistence_backend and these counts against what you expect."
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
