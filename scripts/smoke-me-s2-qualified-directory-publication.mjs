import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = 3115;
const tmp = await mkdtemp(join(tmpdir(), "vfirm-me-s2-"));
const api = spawn(process.execPath, ["apps/api/src/server.mjs"], { cwd: root, env: { ...process.env, VFIRM_API_PORT: String(port), VFIRM_STORE_PATH: join(tmp, "store.json"), DATABASE_URL: "", VFIRM_STORE_BACKEND: "json" }, stdio: ["ignore", "pipe", "pipe"] });
let stderr = "";
api.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
api.on("error", (error) => { stderr += String(error.stack ?? error); });
async function request(path, options = {}) { const response = await fetch(`http://127.0.0.1:${port}${path}`, { method: options.method ?? "GET", headers: { "content-type": "application/json", ...(options.headers ?? {}) }, body: options.body ? JSON.stringify(options.body) : undefined }); const json = await response.json().catch(() => ({})); return { response, json }; }
async function waitForHealth() { const started = Date.now(); while (Date.now() - started < 10000) { try { const { response, json } = await request("/health"); if (response.ok && json.ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error(`API did not start. stderr=${stderr}`); }
async function get(path, headers = {}) { const { response, json } = await request(path, { headers }); if (!response.ok || !json.ok) throw new Error(`${path} failed: ${response.status} ${JSON.stringify(json)}`); return json.data; }
async function post(path, body, headers = {}) { const { response, json } = await request(path, { method: "POST", body, headers }); if (!response.ok || !json.ok) throw new Error(`${path} failed: ${response.status} ${JSON.stringify(json)}`); return json.data; }
async function postRaw(path, body, headers = {}) { return request(path, { method: "POST", body, headers }); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function authHeaders(firm) { return { "x-vfirm-actor-id": firm.principal_actor.id, "x-vfirm-tenant-id": firm.firm.tenant_id, "x-vfirm-firm-id": firm.firm.id, "x-vfirm-role": "principal" }; }

try {
  await waitForHealth();
  const contracts = await get("/contracts");
  for (const path of ["/marketplace/qualified-directory-summary", "/marketplace/directory-publications", "/marketplace/directory-publications/suspend", "/marketplace/directory-publications/revoke"]) assert(contracts.some((contract) => contract.path === path), `${path} contract missing.`);

  const tenant = await post("/tenants", { name: "ME S2 Directory Tenant" });
  const requester = await post("/firms", { tenant_id: tenant.id, name: "Directory Requesting Virtual Firm", principal_name: "Pn. Directory Requester" });
  const provider = await post("/firms", { tenant_id: tenant.id, name: "Directory Specialist Firm", principal_name: "Ir. Directory Specialist" });
  const requesterHeaders = authHeaders(requester), requesterActor = requester.principal_actor;
  const providerHeaders = authHeaders(provider), providerActor = provider.principal_actor;

  const firmProfile = await post("/network/firm-profiles", { tenant_id: tenant.id, firm_id: provider.firm.id, display_name: "Directory Specialist Firm Profile", jurisdiction_refs: ["MY"], actor: providerActor }, providerHeaders);
  const professionalProfile = await post("/network/professional-profiles", { tenant_id: tenant.id, firm_id: provider.firm.id, display_name: "Ir. Directory Specialist Profile", jurisdiction_refs: ["MY"], actor: providerActor }, providerHeaders);
  const credential = await post("/network/credentials", { tenant_id: tenant.id, firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, credential_type: "PROFESSIONAL_REGISTRATION", credential_name: "Verified ME-S2 credential", jurisdiction_refs: ["MY"], verification_status: "VERIFIED", evidence_refs: ["me-s2-credential-evidence"], actor: providerActor }, providerHeaders);
  const capability = await post("/network/capabilities", { tenant_id: tenant.id, firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, firm_network_profile_id: firmProfile.id, capability_code: "FORMWORK_QUALIFIED_DIRECTORY_SUPPORT", jurisdiction_refs: ["MY"], visibility: "TRUSTED_NETWORK_ONLY", qualification_required: true, actor: providerActor }, providerHeaders);
  const conflict = await post("/network/conflict-checks", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, subject_profile_id: professionalProfile.id, check_status: "CLEARED", conflict_summary: "No conflict found.", evidence_refs: ["me-s2-conflict-cleared"], actor: requesterActor }, requesterHeaders);
  const passGate = await post("/network/qualification-gates", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, firm_network_profile_id: firmProfile.id, capability_id: capability.id, credential_id: credential.id, conflict_check_id: conflict.id, jurisdiction_ref: "MY", credential_status: "VERIFIED", jurisdiction_status: "VALID", insurance_status: "VALID", conflict_status: "CLEARED", capacity_status: "AVAILABLE", policy_status: "APPROVED", actor: requesterActor }, requesterHeaders);
  assert(passGate.gate_status === "PASS", "ME-S2 requires a passed qualification gate fixture.");
  const deniedGate = await post("/network/qualification-gates", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, firm_network_profile_id: firmProfile.id, capability_id: capability.id, credential_id: credential.id, conflict_check_id: conflict.id, jurisdiction_ref: "MY", credential_status: "MISSING", jurisdiction_status: "VALID", insurance_status: "VALID", conflict_status: "CLEARED", capacity_status: "AVAILABLE", policy_status: "APPROVED", actor: requesterActor }, requesterHeaders);
  assert(deniedGate.gate_status === "DENIED", "Denied gate fixture should be denied.");

  const missingGateFieldDenied = await postRaw("/marketplace/directory-publications", { tenant_id: tenant.id, firm_id: provider.firm.id, title: "No gate listing", actor: providerActor }, providerHeaders);
  assert(missingGateFieldDenied.response.status === 400 && missingGateFieldDenied.json.error?.code === "VALIDATION_ERROR", "Directory publication without required gate field must be denied.");
  const unknownGateDenied = await postRaw("/marketplace/directory-publications", { tenant_id: tenant.id, firm_id: provider.firm.id, qualification_gate_id: "missing-me-s2-gate", title: "Unknown gate listing", actor: providerActor }, providerHeaders);
  assert(unknownGateDenied.response.status === 403 && unknownGateDenied.json.error?.code === "ME_S2_QUALIFICATION_GATE_REQUIRED", "Directory publication without valid gate evidence must be denied.");
  const failedGateDenied = await postRaw("/marketplace/directory-publications", { tenant_id: tenant.id, firm_id: provider.firm.id, qualification_gate_id: deniedGate.id, title: "Failed gate listing", actor: providerActor }, providerHeaders);
  assert(failedGateDenied.response.status === 403 && failedGateDenied.json.error?.code === "ME_S2_QUALIFICATION_GATE_NOT_PASSED", "Directory publication with denied gate must be denied.");
  const publicDenied = await postRaw("/marketplace/directory-publications", { tenant_id: tenant.id, firm_id: provider.firm.id, qualification_gate_id: passGate.id, title: "Public listing", visibility: "PUBLIC", listing_scope: "OPEN_MARKETPLACE", actor: providerActor }, providerHeaders);
  assert(publicDenied.response.status === 403 && publicDenied.json.error?.code === "ME_S1_PUBLIC_MARKETPLACE_DENIED", "Public directory publication must be denied.");
  const matchingDenied = await postRaw("/marketplace/directory-publications", { tenant_id: tenant.id, firm_id: provider.firm.id, qualification_gate_id: passGate.id, title: "Matching listing", matching_enabled: true, actor: providerActor }, providerHeaders);
  assert(matchingDenied.response.status === 403 && matchingDenied.json.error?.code === "ME_S2_PUBLIC_OR_MATCHING_DENIED", "Live matching must be denied in ME-S2.");
  const aiDenied = await postRaw("/marketplace/directory-publications", { tenant_id: tenant.id, firm_id: provider.firm.id, qualification_gate_id: passGate.id, title: "AI governance listing", actor: { ...providerActor, actor_type: "AI_AGENT" } }, providerHeaders);
  assert(aiDenied.response.status === 403 && aiDenied.json.error?.code === "ME_S1_HUMAN_GOVERNANCE_REQUIRED", "AI directory governance must be denied.");

  const published = await post("/marketplace/directory-publications", { tenant_id: tenant.id, firm_id: provider.firm.id, qualification_gate_id: passGate.id, title: "Qualified private Formwork directory service", description: "Controlled private directory service publication for trusted network discovery only.", actor: providerActor }, providerHeaders);
  const toSuspend = await post("/marketplace/directory-publications", { tenant_id: tenant.id, firm_id: provider.firm.id, qualification_gate_id: passGate.id, title: "Qualified service to suspend", actor: providerActor }, providerHeaders);
  const toRevoke = await post("/marketplace/directory-publications", { tenant_id: tenant.id, firm_id: provider.firm.id, qualification_gate_id: passGate.id, title: "Qualified service to revoke", actor: providerActor }, providerHeaders);
  assert(published.status === "PUBLISHED" && published.visibility === "TRUSTED_NETWORK" && published.listing_scope === "PRIVATE_NETWORK", "Published directory listing must be private trusted-network only.");
  assert(published.commercial_model.directory_type === "CONTROLLED_PRIVATE_QUALIFIED_DIRECTORY" && published.commercial_model.matching_enabled === false && published.commercial_model.tenant_confidential === true, "Directory listing governance metadata missing.");
  const suspended = await post("/marketplace/directory-publications/suspend", { tenant_id: tenant.id, firm_id: provider.firm.id, listing_id: toSuspend.id, reason: "ME-S2 suspension path proof", actor: providerActor }, providerHeaders);
  assert(suspended.status === "SUSPENDED", "Directory publication should suspend.");
  const revoked = await post("/marketplace/directory-publications/revoke", { tenant_id: tenant.id, firm_id: provider.firm.id, listing_id: toRevoke.id, reason: "ME-S2 revocation path proof", actor: providerActor }, providerHeaders);
  assert(revoked.status === "REVOKED", "Directory publication should revoke.");

  const summary = await get(`/marketplace/qualified-directory-summary?tenant_id=${tenant.id}&firm_id=${provider.firm.id}`, providerHeaders);
  assert(summary.status === "ME_S2_QUALIFIED_DIRECTORY_READY", `Unexpected ME-S2 status: ${summary.status}`);
  assert(summary.checks.every((check) => check.status === "PASS"), `ME-S2 checks failed: ${JSON.stringify(summary.checks)}`);
  for (const boundary of ["controlled_private_directory_only", "no_public_marketplace", "no_live_matching_engine", "no_price_first_ranking", "no_capacity_economy_allocation", "no_vf24_observatory_publication", "no_autonomous_regulated_award"]) assert(summary.boundaries.includes(boundary), `${boundary} boundary missing.`);
  const listings = await get(`/marketplace-listings?tenant_id=${tenant.id}&firm_id=${provider.firm.id}`, providerHeaders);
  assert(listings.filter((item) => item.commercial_model?.directory_type === "CONTROLLED_PRIVATE_QUALIFIED_DIRECTORY").length === 3, "Directory publications should be visible through listing read endpoint.");
  const auditEvents = await get(`/audit-events?tenant_id=${tenant.id}&firm_id=${provider.firm.id}`, providerHeaders);
  for (const action of ["marketplace.listing_published", "marketplace.directory_publication_suspended", "marketplace.directory_publication_revoked"]) assert(auditEvents.some((event) => (event.action ?? event.event_type) === action), `${action} audit event missing.`);
  console.log("ME-S2 qualified directory and service publication smoke passed.");
} finally {
  api.kill();
  await rm(tmp, { recursive: true, force: true });
}