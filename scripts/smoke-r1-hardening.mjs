import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-r1-s3-"));
const port = 3095;
const base = `http://127.0.0.1:${port}`;
const api = spawn(process.execPath, ["apps/api/src/server.mjs"], { cwd: root, env: { ...process.env, VFIRM_API_PORT: String(port), VFIRM_STORE_PATH: join(tmp, "store.json"), DATABASE_URL: "", VFIRM_STORE_BACKEND: "json" }, stdio: ["ignore", "pipe", "pipe"] });
let logs = "";
api.stdout.on("data", (chunk) => { logs += chunk.toString(); });
api.stderr.on("data", (chunk) => { logs += chunk.toString(); });

async function waitForHealth() {
  const started = Date.now();
  while (Date.now() - started < 10000) {
    try { const res = await fetch(`${base}/health`); const json = await res.json(); if (res.ok && json.ok) return json; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`API did not become healthy. Logs:\n${logs}`);
}
async function request(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${base}${path}`, { method, headers: { "content-type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json() };
}
async function post(path, body, headers = {}) {
  const result = await request(path, { method: "POST", body, headers });
  if (result.status < 200 || result.status >= 300 || !result.body.ok) throw new Error(`${path} failed: ${result.status} ${JSON.stringify(result.body)}`);
  return result.body.data;
}
async function get(path, headers = {}) {
  const result = await request(path, { headers });
  if (result.status < 200 || result.status >= 300 || !result.body.ok) throw new Error(`${path} failed: ${result.status} ${JSON.stringify(result.body)}`);
  return result.body.data;
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function authHeaders(firmResult) { return { "x-vfirm-actor-id": firmResult.principal_actor.id, "x-vfirm-tenant-id": firmResult.firm.tenant_id, "x-vfirm-firm-id": firmResult.firm.id, "x-vfirm-role": "principal" }; }
function externalHeaders(email, subject) { return { "x-vfirm-auth-provider": "staging-header", "x-vfirm-user-email": email, "x-vfirm-user-subject": subject, "x-vfirm-auth-verified": "true" }; }
function badActorFor(firmResult, tenantOverride = null) { return { actor_id: "00000000-0000-0000-0000-000000000000", actor_type: "SYSTEM", tenant_id: tenantOverride ?? firmResult.firm.tenant_id, firm_id: firmResult.firm.id, display_name: "Unauthorized System" }; }
const formworkInputs = { project_name: "R1-S3 Boundary Project", site_location: "Kuala Lumpur", structure_type: "basement", formwork_element_type: "wall", height: 3.5, length_or_area: 120, concrete_grade: "C30", available_drawings: ["S-100"] };

try {
  await waitForHealth();
  const tenantA = await post("/tenants", { name: "R1-S3 Tenant A" });
  const firmA = await post("/firms", { tenant_id: tenantA.id, name: "R1-S3 Firm A", principal_name: "Ir. Principal A" });
  const headersA = authHeaders(firmA);
  const tenantB = await post("/tenants", { name: "R1-S3 Tenant B" });
  const firmB = await post("/firms", { tenant_id: tenantB.id, name: "R1-S3 Firm B", principal_name: "Ir. Principal B" });
  const headersB = authHeaders(firmB);

  const clientA = await post("/clients", { tenant_id: tenantA.id, firm_id: firmA.firm.id, name: "Tenant A Client", actor: firmA.principal_actor }, headersA);
  const intakeA = await post("/intake-sessions", { tenant_id: tenantA.id, firm_id: firmA.firm.id, relationship_id: clientA.relationship.id, provided_inputs: formworkInputs, actor: firmA.principal_actor }, headersA);
  const proposalA = await post("/proposals", { tenant_id: tenantA.id, firm_id: firmA.firm.id, relationship_id: clientA.relationship.id, intake_session_id: intakeA.intake.id, scope_summary: "R1-S3 proposal", final_price: 2000, actor: firmA.principal_actor }, headersA);
  const approvalA = await post("/proposals/approve", { tenant_id: tenantA.id, firm_id: firmA.firm.id, proposal_id: proposalA.proposal.id, actor: firmA.principal_actor }, headersA);
  const projectA = await post("/proposals/accept", { tenant_id: tenantA.id, firm_id: firmA.firm.id, proposal_id: approvalA.proposal.id, project_name: "R1-S3 Project", actor: firmA.principal_actor }, headersA);
  const evidenceA = await post("/evidence-bundles", { tenant_id: tenantA.id, firm_id: firmA.firm.id, project_id: projectA.project.id, subject_type: "Project", subject_id: projectA.project.id, input_refs: ["intake_summary"], actor: firmA.principal_actor }, headersA);
  const draftA = await post("/deliverables/draft", { tenant_id: tenantA.id, firm_id: firmA.firm.id, project_id: projectA.project.id, relationship_id: clientA.relationship.id, title: "R1-S3 Draft", actor: firmA.principal_actor }, headersA);

  const crossRead = await request(`/clients?tenant_id=${tenantB.id}`, { headers: headersA });
  assert(crossRead.status === 403 && crossRead.body.error?.code === "TENANT_ACCESS_DENIED", `Cross-tenant read was not denied: ${JSON.stringify(crossRead)}`);
  const crossExport = await request(`/data-protection/export-manifest?tenant_id=${tenantB.id}`, { headers: headersA });
  assert(crossExport.status === 403 && crossExport.body.error?.code === "TENANT_ACCESS_DENIED", `Cross-tenant export manifest was not denied: ${JSON.stringify(crossExport)}`);
  const crossSummary = await request(`/commercial-launch/summary?tenant_id=${tenantB.id}`, { headers: headersA });
  assert(crossSummary.status === 403 && crossSummary.body.error?.code === "TENANT_ACCESS_DENIED", `Cross-tenant commercial summary was not denied: ${JSON.stringify(crossSummary)}`);
  const crossCommand = await request("/clients", { method: "POST", headers: headersA, body: { tenant_id: tenantB.id, firm_id: firmB.firm.id, name: "Illegal Cross Tenant Client", actor: firmA.principal_actor } });
  assert(crossCommand.status === 403 && crossCommand.body.error?.code === "TENANT_ACCESS_DENIED", `Cross-tenant command was not denied: ${JSON.stringify(crossCommand)}`);

  const badHuman = { ...badActorFor(firmA), actor_type: "HUMAN" };
  const deniedReview = await request("/deliverables/review", { method: "POST", headers: headersA, body: { tenant_id: tenantA.id, firm_id: firmA.firm.id, project_id: projectA.project.id, document_version_id: draftA.document_version.id, evidence_bundle_id: evidenceA.id, actor: badHuman } });
  assert(deniedReview.status === 403 && deniedReview.body.error?.code === "POLICY_DENIED", `Unauthorized deliverable review was not denied: ${JSON.stringify(deniedReview)}`);
  const deniedIssue = await request("/deliverables/issue", { method: "POST", headers: headersA, body: { tenant_id: tenantA.id, firm_id: firmA.firm.id, project_id: projectA.project.id, document_version_id: draftA.document_version.id, evidence_bundle_id: evidenceA.id, approval_id: "missing-approval", subject_version_or_hash: draftA.document_version.hash, actor: firmA.principal_actor } });
  assert([400, 409].includes(deniedIssue.status), `Ungated deliverable issue was not denied: ${JSON.stringify(deniedIssue)}`);

  const pilotUser = await post("/pilot/users/invite", { tenant_id: tenantA.id, firm_id: firmA.firm.id, email: "r1s3.operator@example.com", display_name: "R1-S3 Operator", role: "pilot_operator", actor: firmA.principal_actor }, headersA);
  await post("/pilot/users/activate", { tenant_id: tenantA.id, firm_id: firmA.firm.id, pilot_user_id: pilotUser.id, external_subject: "r1s3-subject", actor: firmA.principal_actor }, headersA);
  const activeContext = await get("/auth/staging-context", externalHeaders("r1s3.operator@example.com", "r1s3-subject"));
  assert(activeContext.active === true, "Activated pilot user did not resolve as active.");
  await post("/pilot/users/revoke", { tenant_id: tenantA.id, firm_id: firmA.firm.id, pilot_user_id: pilotUser.id, revocation_reason: "R1-S3 boundary check", actor: firmA.principal_actor }, headersA);
  const revokedContext = await get("/auth/staging-context", externalHeaders("r1s3.operator@example.com", "r1s3-subject"));
  assert(revokedContext.active === false && !revokedContext.actor, "Revoked pilot user still resolved as active.");
  const crossSupport = await request("/support/cases", { method: "POST", headers: headersB, body: { tenant_id: tenantA.id, firm_id: firmA.firm.id, subject: "Illegal support case", actor: firmB.principal_actor } });
  assert(crossSupport.status === 403 && crossSupport.body.error?.code === "TENANT_ACCESS_DENIED", `Cross-tenant support action was not denied: ${JSON.stringify(crossSupport)}`);

  const liveCapture = await request("/commercial-launch/controls", { method: "POST", headers: headersA, body: { tenant_id: tenantA.id, firm_id: firmA.firm.id, launch_status: "APPROVED_LIVE_CAPTURE", decision_summary: "Should be denied", actor: firmA.principal_actor } });
  assert(liveCapture.status === 403 && liveCapture.body.error?.code === "LIVE_CAPTURE_NOT_ALLOWED", `Live capture activation was not denied: ${JSON.stringify(liveCapture)}`);
  const provider = await post("/payments/provider-configs", { tenant_id: tenantA.id, firm_id: firmA.firm.id, provider_name: "stripe", provider_mode: "test", config_status: "READY_FOR_TEST", actor: firmA.principal_actor }, headersA);
  const pack = await post("/subscriptions/packages", { tenant_id: tenantA.id, firm_id: firmA.firm.id, package_code: "VF-R1-S3", package_name: "vFirm R1-S3", base_price: 0, currency: "MYR", actor: firmA.principal_actor }, headersA);
  await post("/commercial-launch/controls", { tenant_id: tenantA.id, firm_id: firmA.firm.id, payment_provider_config_id: provider.id, subscription_package_id: pack.id, launch_status: "APPROVED_TEST_MODE", decision_summary: "Test-mode only; no live capture.", actor: firmA.principal_actor }, headersA);
  const launchSummary = await get(`/commercial-launch/summary?tenant_id=${tenantA.id}`, headersA);
  assert(launchSummary.boundary === "payment_provider_preparation_only_no_live_payment_capture" && launchSummary.status === "TEST_MODE_APPROVED", "Commercial no-live-capture boundary was not preserved.");

  console.log("R1-S3 tenant/auth/policy/data protection hardening smoke test passed.");
} finally {
  if (api.exitCode === null && !api.killed) { api.kill(); await once(api, "exit").catch(() => {}); }
  await rm(tmp, { recursive: true, force: true });
}
