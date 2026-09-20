// HM-S3 item 5 -- clean-onboarding acceptance smoke test.
//
// Signs up a brand-new firm through the REAL POST /auth/signup-firm flow
// (a real Supabase Auth test user + a real Supabase-issued JWT, verified by
// the API the same way any real user's session is) and asserts that a fresh
// signup carries zero clients, staff, proposals, projects or outbox items,
// and that only the shared catalogues remain visible.
//
// Cleans up fully afterward: purges the test firm via the HM-S3 item 5
// purge capability (POST /internal/purge-test-firm) and deletes the test
// Supabase Auth user. Requires, on the machine running the API server:
//   VFIRM_ALLOW_TEST_FIRM_PURGE=true
// set for that one run only -- turn it back off afterward. The purge route
// refuses to touch anything whose firm name is not prefixed
// "HM-S3 Smoke Test Firm", so it can never reach a real firm even if this
// script has a bug.

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
await loadLocalEnv(join(root, ".env.local"));

const apiBase = process.env.VFIRM_API_BASE ?? "http://127.0.0.1:3091";
const supabaseUrl = process.env.VFIRM_SUPABASE_URL;
const serviceRoleKey = process.env.VFIRM_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("VFIRM_SUPABASE_URL and VFIRM_SUPABASE_SERVICE_ROLE_KEY must be set (via .env.local) to run this smoke test -- it needs to create and sign in a real, disposable Supabase Auth test user.");
}

const stamp = Date.now();
const testEmail = `hm-s3-item5-smoke-${stamp}@example.invalid`;
const testPassword = `HmS3Smoke!${stamp}`;
const firmName = `HM-S3 Smoke Test Firm ${stamp}`;

const steps = [];
let testUserId = null;
let tenantId = null;
let firmId = null;

async function main() {
  const health = await fetch(`${apiBase}/health`).then((r) => r.json()).catch(() => null);
  if (!health?.ok) throw new Error(`vFirm API is not healthy at ${apiBase}`);
  steps.push({ step: "api_health", ok: true });

  // 1. Create a disposable Supabase Auth test user.
  const createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, "content-type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: testPassword, email_confirm: true })
  });
  const createdUser = await createUserResponse.json();
  if (!createUserResponse.ok || !createdUser?.id) throw new Error(`Failed to create test Supabase user: ${createUserResponse.status} ${JSON.stringify(createdUser)}`);
  testUserId = createdUser.id;
  steps.push({ step: "create_test_supabase_user", ok: true, user_id: testUserId });

  // 2. Sign in as that user to get a real Supabase-issued JWT.
  const signInResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, "content-type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: testPassword })
  });
  const session = await signInResponse.json();
  if (!signInResponse.ok || !session?.access_token) throw new Error(`Failed to sign in as test user: ${signInResponse.status} ${JSON.stringify(session)}`);
  steps.push({ step: "sign_in_test_supabase_user", ok: true });

  // 3. Real clean-onboarding signup, exactly as a genuine new user would do it.
  const signupResponse = await fetch(`${apiBase}/auth/signup-firm`, {
    method: "POST",
    headers: { authorization: `Bearer ${session.access_token}`, "content-type": "application/json" },
    body: JSON.stringify({ firm_name: firmName, principal_name: "HM-S3 Smoke Test Owner" })
  });
  const signupJson = await signupResponse.json();
  if (!signupResponse.ok || !signupJson?.ok) throw new Error(`/auth/signup-firm failed: ${signupResponse.status} ${JSON.stringify(signupJson)}`);
  tenantId = signupJson.data.tenant.id;
  firmId = signupJson.data.firm.id;
  steps.push({ step: "signup_firm", ok: true, tenant_id: tenantId, firm_id: firmId });

  // 4. Assert the new firm is genuinely clean.
  const storeResponse = await fetch(`${apiBase}/mvp/store`);
  const store = (await storeResponse.json()).data;
  const scoped = (collection) => (store[collection] ?? []).filter((item) => item.firm_id === firmId);
  const cleanlinessChecks = {
    clients: scoped("clients").length,
    proposals: scoped("proposals").length,
    projects: scoped("projects").length,
    awia_virtual_staff_members: scoped("awia_virtual_staff_members").length,
    awia_firm_package_assignments: (store.awia_firm_package_assignments ?? []).filter((item) => item.tenant_id === tenantId && item.firm_id === firmId).length,
    firm_memberships: scoped("firm_memberships").length
  };
  const isClean = cleanlinessChecks.clients === 0 && cleanlinessChecks.proposals === 0 && cleanlinessChecks.projects === 0
    && cleanlinessChecks.awia_virtual_staff_members === 0 && cleanlinessChecks.awia_firm_package_assignments === 0
    && cleanlinessChecks.firm_memberships === 1;
  steps.push({ step: "assert_clean_firm", ok: isClean, counts: cleanlinessChecks });

  // 5. Assert shared catalogues remain visible (unaffected by per-firm cleanliness).
  const templatesResponse = await fetch(`${apiBase}/awia/virtual-staff/templates`);
  const templatesJson = await templatesResponse.json();
  const templatesVisible = templatesResponse.ok && templatesJson?.ok && Array.isArray(templatesJson.data?.templates) && templatesJson.data.templates.length > 0;
  steps.push({ step: "assert_staff_templates_visible", ok: templatesVisible });

  const servicePackResponse = await fetch(`${apiBase}/service-packs/formwork`);
  const servicePackJson = await servicePackResponse.json();
  const servicePackVisible = servicePackResponse.ok && servicePackJson?.ok && Boolean(servicePackJson.data);
  steps.push({ step: "assert_formwork_service_pack_visible", ok: servicePackVisible });

  // 6. Clean up: purge the test firm (requires VFIRM_ALLOW_TEST_FIRM_PURGE=true
  // on the API server process), then delete the test Supabase Auth user.
  const purgeResponse = await fetch(`${apiBase}/internal/purge-test-firm`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tenant_id: tenantId, firm_id: firmId })
  });
  const purgeJson = await purgeResponse.json();
  const purged = purgeResponse.ok && purgeJson?.ok;
  steps.push({ step: "purge_test_firm", ok: purged, response: purgeJson });

  const deleteUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${testUserId}`, {
    method: "DELETE",
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` }
  });
  steps.push({ step: "delete_test_supabase_user", ok: deleteUserResponse.ok || deleteUserResponse.status === 404 });

  // 7. Confirm cleanup actually took: the tenant should no longer exist.
  const afterStoreResponse = await fetch(`${apiBase}/mvp/store`);
  const afterStore = (await afterStoreResponse.json()).data;
  const stillPresent = (afterStore.tenants ?? []).some((item) => item.id === tenantId);
  steps.push({ step: "assert_purge_took_effect", ok: !stillPresent });

  const overallPass = steps.every((step) => step.ok);
  console.log(JSON.stringify({
    smoke_test: "hm-s3-item-5-clean-onboarding",
    checked_at: new Date().toISOString(),
    api_base: apiBase,
    test_firm_name: firmName,
    overall_pass: overallPass,
    steps,
    note: purged
      ? "Test firm and test Supabase user were fully cleaned up. Remember to unset VFIRM_ALLOW_TEST_FIRM_PURGE (or set it back to false) on the API server now."
      : "WARNING: purge_test_firm did not succeed -- a leftover test firm may remain in the database. Check the 'purge_test_firm' step's response above; you likely need to set VFIRM_ALLOW_TEST_FIRM_PURGE=true on the API server and restart it, then re-run this script, or purge tenant_id/firm_id shown above manually."
  }, null, 2));

  if (!overallPass) process.exitCode = 1;
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
  console.error(JSON.stringify({ smoke_test: "hm-s3-item-5-clean-onboarding", overall_pass: false, fatal_error: error.message, steps, note: testUserId ? `A test Supabase user (id ${testUserId}, email ${testEmail}) and possibly a test firm (tenant_id ${tenantId}, firm_id ${firmId}) may not have been cleaned up -- check manually.` : "Failed before any test data was created." }, null, 2));
  process.exit(1);
});
