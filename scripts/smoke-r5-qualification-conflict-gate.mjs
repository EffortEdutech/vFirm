import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = 3109;
const tmp = await mkdtemp(join(tmpdir(), "vfirm-r5-s2-"));

const api = spawn(process.execPath, ["apps/api/src/server.mjs"], {
  cwd: root,
  env: { ...process.env, VFIRM_API_PORT: String(port), VFIRM_STORE_PATH: join(tmp, "store.json"), DATABASE_URL: "", VFIRM_STORE_BACKEND: "json" },
  stdio: ["ignore", "pipe", "pipe"]
});

let stderr = "";
api.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
api.on("error", (error) => { stderr += String(error.stack ?? error); });

async function request(path, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...(options.headers ?? {}) },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const json = await response.json().catch(() => ({}));
  return { response, json };
}

async function waitForHealth() {
  const started = Date.now();
  while (Date.now() - started < 10000) {
    try {
      const { response, json } = await request("/health");
      if (response.ok && json.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`API did not start. stderr=${stderr}`);
}

async function get(path, headers = {}) {
  const { response, json } = await request(path, { headers });
  if (!response.ok || !json.ok) throw new Error(`${path} failed: ${response.status} ${JSON.stringify(json)}`);
  return json.data;
}

async function post(path, body, headers = {}) {
  const { response, json } = await request(path, { method: "POST", body, headers });
  if (!response.ok || !json.ok) throw new Error(`${path} failed: ${response.status} ${JSON.stringify(json)}`);
  return json.data;
}

async function postRaw(path, body, headers = {}) {
  return request(path, { method: "POST", body, headers });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function authHeaders(firm) {
  return { "x-vfirm-actor-id": firm.principal_actor.id, "x-vfirm-tenant-id": firm.firm.tenant_id, "x-vfirm-firm-id": firm.firm.id, "x-vfirm-role": "principal" };
}

try {
  await waitForHealth();
  const contracts = await get("/contracts");
  for (const path of ["/network/r5-qualification-summary", "/network/conflict-checks", "/network/qualification-gates", "/network/specialist-invitations"]) {
    assert(contracts.some((contract) => contract.path === path), `${path} contract missing.`);
  }

  const tenant = await post("/tenants", { name: "R5 S2 Qualification Tenant" });
  const requester = await post("/firms", { tenant_id: tenant.id, name: "Requesting Virtual Firm", principal_name: "Pn. Requesting Principal" });
  const provider = await post("/firms", { tenant_id: tenant.id, name: "Trusted Specialist Firm", principal_name: "Ir. Specialist Principal" });
  const headers = authHeaders(requester);
  const actor = requester.principal_actor;
  const providerHeaders = authHeaders(provider);
  const providerActor = provider.principal_actor;

  const firmProfile = await post("/network/firm-profiles", { tenant_id: tenant.id, firm_id: provider.firm.id, display_name: "Trusted Specialist Firm Profile", jurisdiction_refs: ["MY"], actor: providerActor }, providerHeaders);
  const professionalProfile = await post("/network/professional-profiles", { tenant_id: tenant.id, firm_id: provider.firm.id, display_name: "Ir. Specialist Profile", jurisdiction_refs: ["MY"], actor: providerActor }, providerHeaders);
  const credential = await post("/network/credentials", { tenant_id: tenant.id, firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, credential_type: "PROFESSIONAL_REGISTRATION", credential_name: "Verified specialist credential", issuer: "Jurisdiction authority placeholder", jurisdiction_refs: ["MY"], verification_status: "VERIFIED", evidence_refs: ["r5-s2-credential-evidence"], actor: providerActor }, providerHeaders);
  const capability = await post("/network/capabilities", { tenant_id: tenant.id, firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, firm_network_profile_id: firmProfile.id, capability_code: "FORMWORK_TEMPORARY_WORKS_REVIEW_SUPPORT", service_pack_ref: "FORMWORK_ENGINEERING_PACK", jurisdiction_refs: ["MY"], visibility: "TRUSTED_NETWORK_ONLY", qualification_required: true, actor: providerActor }, providerHeaders);

  const conflicted = await post("/network/conflict-checks", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, subject_profile_id: professionalProfile.id, check_status: "CONFLICT_FOUND", conflict_summary: "Deliberate negative gate evidence.", evidence_refs: ["r5-s2-conflict-found"], actor }, headers);
  const deniedGate = await post("/network/qualification-gates", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, firm_network_profile_id: firmProfile.id, capability_id: capability.id, credential_id: credential.id, conflict_check_id: conflicted.id, jurisdiction_ref: "MY", credential_status: "MISSING", jurisdiction_status: "INVALID", insurance_status: "EXPIRED", conflict_status: "CONFLICT_FOUND", capacity_status: "UNAVAILABLE", policy_status: "DENIED", actor }, headers);
  assert(deniedGate.gate_status === "DENIED", "Negative qualification gate should be denied.");
  for (const reason of ["credential_not_verified", "jurisdiction_not_valid", "insurance_not_valid", "conflict_not_cleared", "capacity_not_available", "policy_not_approved"]) {
    assert(deniedGate.denial_reasons.includes(reason), `Denied gate missing reason ${reason}.`);
  }

  const deniedInvitation = await postRaw("/network/specialist-invitations", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, qualification_gate_id: deniedGate.id, actor }, headers);
  assert(deniedInvitation.response.status === 403, "Invitation must be denied when qualification gate fails.");
  assert(deniedInvitation.json.error?.code === "SPECIALIST_INVITATION_GATE_DENIED", "Denied invitation code mismatch.");

  const cleared = await post("/network/conflict-checks", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, subject_profile_id: professionalProfile.id, check_status: "CLEARED", conflict_summary: "No conflict found for scoped Formwork support.", evidence_refs: ["r5-s2-conflict-cleared"], actor }, headers);
  const passGate = await post("/network/qualification-gates", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, firm_network_profile_id: firmProfile.id, capability_id: capability.id, credential_id: credential.id, conflict_check_id: cleared.id, jurisdiction_ref: "MY", credential_status: "VERIFIED", jurisdiction_status: "VALID", insurance_status: "VALID", conflict_status: "CLEARED", capacity_status: "AVAILABLE", policy_status: "APPROVED", actor }, headers);
  assert(passGate.gate_status === "PASS", "Positive qualification gate should pass.");

  const invitation = await post("/network/specialist-invitations", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, qualification_gate_id: passGate.id, actor }, headers);
  assert(invitation.invitation_status === "READY_TO_SEND", "Invitation should be ready only after passing qualification gate.");

  const summary = await get(`/network/r5-qualification-summary?tenant_id=${tenant.id}&firm_id=${requester.firm.id}`, headers);
  assert(summary.status === "R5_S2_QUALIFICATION_CONFLICT_GATE_READY", `Unexpected R5-S2 status: ${summary.status}`);
  assert(summary.checks.every((check) => check.status === "PASS"), `R5-S2 checks failed: ${JSON.stringify(summary.checks)}`);
  assert(summary.boundaries.includes("no_price_first_allocation"), "R5-S2 must preserve no_price_first_allocation boundary.");

  const invitations = await get(`/specialist-invitations?tenant_id=${tenant.id}`, headers);
  assert(invitations.some((item) => item.invitation_status === "DENIED"), "Denied invitation evidence missing.");
  assert(invitations.some((item) => item.invitation_status === "READY_TO_SEND"), "Ready invitation evidence missing.");

  const auditEvents = await get(`/audit-events?tenant_id=${tenant.id}&firm_id=${requester.firm.id}`, headers);
  for (const action of ["network.conflict_check_recorded", "network.qualification_gate_denied", "network.qualification_gate_passed", "network.specialist_invitation_denied", "network.specialist_invitation_ready"]) {
    assert(auditEvents.some((event) => (event.action ?? event.event_type) === action), `${action} audit event missing.`);
  }

  console.log("R5-S2 qualification and conflict gate smoke passed.");
} finally {
  api.kill();
  await rm(tmp, { recursive: true, force: true });
}