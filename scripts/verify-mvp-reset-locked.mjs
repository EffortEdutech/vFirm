// Verification only. Confirms the previously-unauthenticated, whole-database
// wipe route (POST /mvp/reset) is locked down. This does NOT reset anything:
// if the lock is working, the request is refused before any deletion runs.
// If it is somehow NOT locked, this script deliberately does not retry or
// confirm the reset -- it reports the danger and stops.

const base = process.env.VFIRM_API_BASE ?? "http://127.0.0.1:3091";

async function main() {
  const health = await fetch(`${base}/health`).then((r) => r.json()).catch(() => null);
  if (!health?.ok) throw new Error(`vFirm API is not healthy at ${base}`);

  const response = await fetch(`${base}/mvp/reset`, { method: "POST" });
  const json = await response.json().catch(() => null);

  const isLockedDown = response.status === 403 && json?.error?.code === "FULL_STORE_RESET_LOCKED";

  console.log(JSON.stringify({
    check: "mvp-reset-lockdown",
    checked_at: new Date().toISOString(),
    api_base: base,
    http_status: response.status,
    response_body: json,
    is_locked_down: isLockedDown,
    note: isLockedDown
      ? "Confirmed: /mvp/reset refuses to run without VFIRM_ALLOW_FULL_STORE_RESET=true. Your database was NOT touched by this check."
      : "DANGER: /mvp/reset did NOT refuse the request. If http_status is 200, your database may have just been wiped by running this check -- verify immediately with npm run check:hm-s3:empty-db-wiring and restore/re-signup as needed."
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
