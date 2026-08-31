import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = 3108;
const tmp = await mkdtemp(join(tmpdir(), "vfirm-r5-s1-"));

const api = spawn(process.execPath, ["apps/api/src/server.mjs"], {
  cwd: root,
  env: {
    ...process.env,
    VFIRM_API_PORT: String(port),
    VFIRM_STORE_PATH: join(tmp, "store.json"),
    DATABASE_URL: "",
    VFIRM_STORE_BACKEND: "json"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let stderr = "";
api.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

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
  return {
    "x-vfirm-actor-id": firm.principal_actor.id,
    "x-vfirm-tenant-id": firm.firm.tenant_id,
    "x-vfirm-firm-id": firm.firm.id,
    "x-vfirm-role": "principal"
  };
}

try {
  await waitForHealth();

  const contracts = await get("/contracts");
  for (const path of [
    "/network/r5-profile-summary",
    "/network/professional-profiles",
    "/network/firm-profiles",
    "/network/capabilities",
    "/network/credentials",
    "/network/trust-signals"
  ]) {
    assert(contracts.some((contract) => contract.path === path), `${path} contract missing.`);
  }

  const tenant = await post("/tenants", { name: "R5 S1 Trusted Network Tenant" });
  const firm = await post("/firms", { tenant_id: tenant.id, name: "R5 S1 Formwork Firm", principal_name: "Ir. Network Principal" });
  const headers = authHeaders(firm);
  const actor = firm.principal_actor;

  const firmProfile = await post("/network/firm-profiles", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    display_name: "Formwork Specialist Practice - Trusted Network Profile",
    jurisdiction_refs: ["MY"],
    actor
  }, headers);

  const professionalProfile = await post("/network/professional-profiles", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    display_name: "Ir. Network Principal - Trusted Specialist Profile",
    jurisdiction_refs: ["MY"],
    actor
  }, headers);

  const credential = await post("/network/credentials", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    professional_network_profile_id: professionalProfile.id,
    credential_type: "PROFESSIONAL_REGISTRATION",
    credential_name: "Responsible professional registration evidence",
    issuer: "Jurisdiction authority placeholder",
    jurisdiction_refs: ["MY"],
    verification_status: "VERIFIED",
    evidence_refs: ["r5-s1-credential-evidence"],
    actor
  }, headers);
  assert(credential.authority_grant === false, "Credential must not grant professional authority.");

  const capability = await post("/network/capabilities", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    professional_network_profile_id: professionalProfile.id,
    firm_network_profile_id: firmProfile.id,
    capability_code: "FORMWORK_TEMPORARY_WORKS_REVIEW_SUPPORT",
    service_pack_ref: "FORMWORK_ENGINEERING_PACK",
    jurisdiction_refs: ["MY"],
    visibility: "TRUSTED_NETWORK_ONLY",
    qualification_required: true,
    actor
  }, headers);
  assert(capability.qualification_required === true, "Capability must require qualification.");

  await post("/network/trust-signals", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    subject_type: "NetworkProfessionalProfile",
    subject_id: professionalProfile.id,
    signal_type: "COMPLETED_PRIVATE_PILOT_REVIEW",
    signal_summary: "Prior controlled private pilot review evidence; not a credential substitute.",
    evidence_refs: ["r5-s1-trust-signal-evidence"],
    actor
  }, headers);

  const aiActor = { actor_id: "worker_r5_s1_ai", actor_type: "AI_AGENT", tenant_id: tenant.id, firm_id: firm.firm.id, display_name: "R5 S1 AI Worker" };
  const aiDenied = await postRaw("/network/professional-profiles", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    display_name: "AI-created network profile should be denied",
    actor: aiActor
  }, headers);
  assert(aiDenied.response.status === 403, "AI actor must not create trusted network profile primitives.");
  assert(aiDenied.json.error?.code === "NETWORK_HUMAN_AUTHORITY_REQUIRED", "AI denial code mismatch.");

  const publicDenied = await postRaw("/network/capabilities", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    capability_code: "PUBLIC_SCOPE_DENIED",
    visibility: "PUBLIC_MARKETPLACE",
    actor
  }, headers);
  assert(publicDenied.response.status === 403, "Public marketplace capability must be denied in R5-S1.");

  const trustSubstituteDenied = await postRaw("/network/trust-signals", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    subject_type: "NetworkProfessionalProfile",
    subject_id: professionalProfile.id,
    signal_type: "RATING",
    signal_summary: "Rating cannot replace credential verification.",
    substitutes_for_credential: true,
    actor
  }, headers);
  assert(trustSubstituteDenied.response.status === 403, "Trust signal credential substitution must be denied.");
  assert(trustSubstituteDenied.json.error?.code === "TRUST_SIGNAL_CANNOT_REPLACE_CREDENTIAL", "Trust substitution denial code mismatch.");

  const summary = await get(`/network/r5-profile-summary?tenant_id=${tenant.id}&firm_id=${firm.firm.id}`, headers);
  assert(summary.status === "R5_S1_PROFILE_FOUNDATION_READY", `Unexpected R5-S1 status: ${summary.status}`);
  assert(summary.checks.every((check) => check.status === "PASS"), `R5-S1 checks failed: ${JSON.stringify(summary.checks)}`);
  assert(summary.boundaries.includes("no_public_marketplace"), "R5-S1 boundary missing no_public_marketplace.");

  const auditEvents = await get(`/audit-events?tenant_id=${tenant.id}&firm_id=${firm.firm.id}`, headers);
  for (const eventType of ["network.professional_profile_created", "network.firm_profile_created", "network.capability_created", "network.credential_recorded", "network.trust_signal_recorded"]) {
    assert(auditEvents.some((event) => (event.action ?? event.event_type) === eventType), `${eventType} audit event missing.`);
  }

  console.log("R5-S1 trusted network profile smoke passed.");
} finally {
  api.kill();
  await rm(tmp, { recursive: true, force: true });
}