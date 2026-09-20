// HM-S3 item 4 -- verification only. Confirms the legacy provision-pilot
// escape hatch (POST /awia/virtual-staff/provision-pilot) is locked down.
//
// This does NOT provision anything real: it deliberately targets a
// tenant_id/firm_id pair that does not exist, so even in the unlikely case
// the lock somehow failed, there is nothing real for it to write to.

const base = process.env.VFIRM_API_BASE ?? "http://127.0.0.1:3091";

async function main() {
  const health = await fetch(`${base}/health`).then((r) => r.json()).catch(() => null);
  if (!health?.ok) throw new Error(`vFirm API is not healthy at ${base}`);

  const response = await fetch(`${base}/awia/virtual-staff/provision-pilot`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      tenant_id: "hm-s3-item-4-lockdown-check-nonexistent-tenant",
      firm_id: "hm-s3-item-4-lockdown-check-nonexistent-firm"
    })
  });
  const json = await response.json().catch(() => null);

  const isLockedDown = response.status === 403 && json?.error?.code === "LEGACY_PILOT_PROVISIONING_LOCKED";

  console.log(JSON.stringify({
    check: "hm-s3-item-4-provision-pilot-lockdown",
    checked_at: new Date().toISOString(),
    api_base: base,
    http_status: response.status,
    response_body: json,
    is_locked_down: isLockedDown,
    note: isLockedDown
      ? "Confirmed: provision-pilot refuses to run without VFIRM_ALLOW_LEGACY_PILOT_PROVISION=true."
      : "NOT locked down as expected -- make sure the API server was restarted after the server.mjs change, and that VFIRM_ALLOW_LEGACY_PILOT_PROVISION is not set to \"true\" in your environment."
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
