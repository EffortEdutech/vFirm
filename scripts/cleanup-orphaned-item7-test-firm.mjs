// One-off cleanup: purges the specific orphaned test firm left behind by
// the FIRST (pre-fix) run of the HM-S3 item 7 verification script, whose
// purge_test_firm step failed with a 23503 FK violation before
// purgeTestFirmRecord was fixed to also delete the AWIA staff tables.
//
// Targets exactly this one firm by hardcoded tenant_id/firm_id -- it is
// NOT a general-purpose cleanup tool. Also deletes the matching Supabase
// Auth test user this smoke test run created.
//
// Run once, then delete this script -- it has no further use afterward.

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
await loadLocalEnv(join(root, ".env.local"));

const apiBase = process.env.VFIRM_API_BASE ?? "http://127.0.0.1:3091";
const supabaseUrl = process.env.VFIRM_SUPABASE_URL;
const serviceRoleKey = process.env.VFIRM_SUPABASE_SERVICE_ROLE_KEY;

// From the failed pre-fix item 7 run.
const tenantId = "5ccf4ee0-5a61-470a-afb5-508e9aa8d478";
const firmId = "2de07263-e47b-42da-86b8-ce7c13664b87";
const orphanedTestUserId = "3f3a9e3e-d9a8-48ee-8ee4-421024f0066d";

async function main() {
  const purgeResponse = await fetch(`${apiBase}/internal/purge-test-firm`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tenant_id: tenantId, firm_id: firmId })
  });
  const purgeJson = await purgeResponse.json();
  console.log(JSON.stringify({ step: "purge_orphaned_test_firm", ok: purgeResponse.ok && purgeJson?.ok, response: purgeJson }, null, 2));

  if (supabaseUrl && serviceRoleKey) {
    const deleteUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${orphanedTestUserId}`, {
      method: "DELETE",
      headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` }
    });
    console.log(JSON.stringify({ step: "delete_orphaned_test_supabase_user", ok: deleteUserResponse.ok || deleteUserResponse.status === 404, status: deleteUserResponse.status }, null, 2));
  } else {
    console.log(JSON.stringify({ step: "delete_orphaned_test_supabase_user", ok: false, note: "VFIRM_SUPABASE_URL / VFIRM_SUPABASE_SERVICE_ROLE_KEY not set -- skipped, delete this Supabase Auth user manually if it still exists." }, null, 2));
  }
}

async function loadLocalEnv(path) {
  if (!existsSync(path)) return;
  const body = await readFile(path, "utf8");
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^[ '"]|[ '"]$/g, "");
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, fatal_error: error.message }, null, 2));
  process.exit(1);
});
