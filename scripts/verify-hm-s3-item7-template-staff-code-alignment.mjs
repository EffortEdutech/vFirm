// HM-S3 item 7 -- bulk-template hiring's staff codes now use the same
// per-firm incremental generator as single hiring, instead of the
// template's hardcoded staff_code literals.
//
// Real, disposable end-to-end check: creates a real Supabase Auth test
// user, signs up a brand-new firm, assigns it the HIRE_ME package,
// provisions the "Finance Back-Office Roster" template (the one whose
// template literals -- FAO-AP-001, FAO-REV-001, DATA-001 with role_code
// "FAO" -- didn't fit the ROLE-NNN shape), then single-hires one more FAO
// worker and asserts its generated staff_code is FAO-003 (i.e. the
// generator correctly counted the two FAO-role members the template
// provisioning just created), not FAO-001 (which would mean the old
// blind-spot is back). Cleans up fully afterward via the HM-S3 item 5
// purge capability.

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
await loadLocalEnv(join(root, ".env.local"));

const apiBase = process.env.VFIRM_API_BASE ?? "http://127.0.0.1:3091";
const supabaseUrl = process.env.VFIRM_SUPABASE_URL;
const serviceRoleKey = process.env.VFIRM_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("VFIRM_SUPABASE_URL and VFIRM_SUPABASE_SERVICE_ROLE_KEY must be set (via .env.local) to run this check -- it needs to create and sign in a real, disposable Supabase Auth test user.");
}

const stamp = Date.now();
const testEmail = `hm-s3-item7-smoke-${stamp}@example.invalid`;
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

  const createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, "content-type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: testPassword, email_confirm: true })
  });
  const createdUser = await createUserResponse.json();
  if (!createUserResponse.ok || !createdUser?.id) throw new Error(`Failed to create test Supabase user: ${createUserResponse.status} ${JSON.stringify(createdUser)}`);
  testUserId = createdUser.id;
  steps.push({ step: "create_test_supabase_user", ok: true, user_id: testUserId });

  const signInResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, "content-type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: testPassword })
  });
  const session = await signInResponse.json();
  if (!signInResponse.ok || !session?.access_token) throw new Error(`Failed to sign in as test user: ${signInResponse.status} ${JSON.stringify(session)}`);
  steps.push({ step: "sign_in_test_supabase_user", ok: true });
  const authHeaders = { authorization: `Bearer ${session.access_token}`, "content-type": "application/json" };

  const signupResponse = await fetch(`${apiBase}/auth/signup-firm`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ firm_name: firmName, principal_name: "HM-S3 Smoke Test Owner" })
  });
  const signupJson = await signupResponse.json();
  if (!signupResponse.ok || !signupJson?.ok) throw new Error(`/auth/signup-firm failed: ${signupResponse.status} ${JSON.stringify(signupJson)}`);
  tenantId = signupJson.data.tenant.id;
  firmId = signupJson.data.firm.id;
  steps.push({ step: "signup_firm", ok: true, tenant_id: tenantId, firm_id: firmId });

  const assignPackageResponse = await fetch(`${apiBase}/ops/awia-package-assignment`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ tenant_id: tenantId, firm_id: firmId, package_code: "HIRE_ME" })
  });
  const assignPackageJson = await assignPackageResponse.json();
  steps.push({ step: "assign_firm_package", ok: assignPackageResponse.ok && assignPackageJson?.ok, response: assignPackageJson });

  const templateResponse = await fetch(`${apiBase}/awia/virtual-staff/provision-from-template`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ tenant_id: tenantId, firm_id: firmId, template_id: "finance_back_office_v1" })
  });
  const templateJson = await templateResponse.json();
  const templateOk = templateResponse.ok && templateJson?.ok;
  const memberCodes = (templateJson?.data?.provisioning_run?.members ?? []).map((m) => m.agent_code ?? m.staff_code).filter(Boolean);
  steps.push({ step: "provision_from_template", ok: templateOk, member_codes: memberCodes, response: templateOk ? undefined : templateJson });

  // finance_back_office_v1's staff_set has 3 entries with role_code "FAO"
  // (FAO-AP-001, FAO-REV-001, and DATA-001 -- yes, DATA-001's role_code is
  // "FAO" despite the DATA-looking staff_code literal), so the generator
  // should mint 3 sequential FAO-NNN codes for this template, not 2.
  const faoCodesFromTemplate = memberCodes.filter((code) => /^FAO-\d+$/.test(code));
  const templateCodesFollowGeneratorShape = templateOk && faoCodesFromTemplate.length === 3;
  steps.push({ step: "assert_template_codes_follow_generator_shape", ok: templateCodesFollowGeneratorShape, fao_codes_seen: faoCodesFromTemplate, all_member_codes: memberCodes });

  const hireResponse = await fetch(`${apiBase}/awia/virtual-staff/hire-worker`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ tenant_id: tenantId, firm_id: firmId, role_code: "FAO" })
  });
  const hireJson = await hireResponse.json();
  const generatedCode = hireJson?.data?.staff_code;
  // With 3 FAO-role members already provisioned from the template
  // (FAO-001..FAO-003), the next single-hire of an FAO worker should get
  // FAO-004 -- proving the generator counted the template-provisioned
  // FAO members, not just single-hire-created ones.
  const nextCodeIsCorrect = hireResponse.ok && hireJson?.ok && generatedCode === "FAO-004";
  steps.push({ step: "assert_single_hire_after_template_gets_fao_004", ok: nextCodeIsCorrect, generated_staff_code: generatedCode ?? null, response: nextCodeIsCorrect ? undefined : hireJson });

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

  const overallPass = steps.every((step) => step.ok);
  console.log(JSON.stringify({
    check: "hm-s3-item-7-template-staff-code-alignment",
    checked_at: new Date().toISOString(),
    api_base: apiBase,
    test_firm_name: firmName,
    overall_pass: overallPass,
    steps,
    note: purged
      ? "Test firm and test Supabase user were fully cleaned up."
      : "WARNING: purge_test_firm did not succeed -- a leftover test firm may remain. Requires VFIRM_ALLOW_TEST_FIRM_PURGE=true on the API server for this one run."
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
  console.error(JSON.stringify({ check: "hm-s3-item-7-template-staff-code-alignment", overall_pass: false, fatal_error: error.message, steps, note: testUserId ? `A test Supabase user (id ${testUserId}, email ${testEmail}) and possibly a test firm (tenant_id ${tenantId}, firm_id ${firmId}) may not have been cleaned up -- check manually.` : "Failed before any test data was created." }, null, 2));
  process.exit(1);
});
