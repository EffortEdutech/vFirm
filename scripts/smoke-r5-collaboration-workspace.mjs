import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = 3110;
const tmp = await mkdtemp(join(tmpdir(), "vfirm-r5-s3-"));
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
  for (const path of ["/network/r5-collaboration-workspace-summary", "/network/collaboration-workspaces", "/network/collaboration-workspaces/participants", "/network/collaboration-workspaces/participants/revoke", "/network/collaboration-workspaces/evidence"]) assert(contracts.some((contract) => contract.path === path), `${path} contract missing.`);

  const tenant = await post("/tenants", { name: "R5 S3 Collaboration Tenant" });
  const requester = await post("/firms", { tenant_id: tenant.id, name: "Requesting Virtual Firm", principal_name: "Pn. Requesting Principal" });
  const provider = await post("/firms", { tenant_id: tenant.id, name: "Trusted Specialist Firm", principal_name: "Ir. Specialist Principal" });
  const headers = authHeaders(requester), actor = requester.principal_actor, providerHeaders = authHeaders(provider), providerActor = provider.principal_actor;

  const firmProfile = await post("/network/firm-profiles", { tenant_id: tenant.id, firm_id: provider.firm.id, display_name: "Trusted Specialist Firm Profile", jurisdiction_refs: ["MY"], actor: providerActor }, providerHeaders);
  const professionalProfile = await post("/network/professional-profiles", { tenant_id: tenant.id, firm_id: provider.firm.id, display_name: "Ir. Specialist Profile", jurisdiction_refs: ["MY"], actor: providerActor }, providerHeaders);
  const credential = await post("/network/credentials", { tenant_id: tenant.id, firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, credential_type: "PROFESSIONAL_REGISTRATION", credential_name: "Verified specialist credential", jurisdiction_refs: ["MY"], verification_status: "VERIFIED", evidence_refs: ["r5-s3-credential-evidence"], actor: providerActor }, providerHeaders);
  const capability = await post("/network/capabilities", { tenant_id: tenant.id, firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, firm_network_profile_id: firmProfile.id, capability_code: "FORMWORK_TEMPORARY_WORKS_REVIEW_SUPPORT", jurisdiction_refs: ["MY"], visibility: "TRUSTED_NETWORK_ONLY", qualification_required: true, actor: providerActor }, providerHeaders);
  const conflict = await post("/network/conflict-checks", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, subject_profile_id: professionalProfile.id, check_status: "CLEARED", conflict_summary: "No conflict found.", evidence_refs: ["r5-s3-conflict-cleared"], actor }, headers);
  const passGate = await post("/network/qualification-gates", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, firm_network_profile_id: firmProfile.id, capability_id: capability.id, credential_id: credential.id, conflict_check_id: conflict.id, jurisdiction_ref: "MY", credential_status: "VERIFIED", jurisdiction_status: "VALID", insurance_status: "VALID", conflict_status: "CLEARED", capacity_status: "AVAILABLE", policy_status: "APPROVED", actor }, headers);
  const invitation = await post("/network/specialist-invitations", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, qualification_gate_id: passGate.id, actor }, headers);

  const policyDenied = await postRaw("/network/collaboration-workspaces", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, specialist_invitation_id: invitation.id, data_room_policy: { minimum_necessary_access: true, client_confidential: false, audit_required: true }, actor }, headers);
  assert(policyDenied.response.status === 403, "Workspace must deny incomplete data-room policy.");
  const workspace = await post("/network/collaboration-workspaces", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, specialist_invitation_id: invitation.id, data_room_policy: { minimum_necessary_access: true, client_confidential: true, audit_required: true, revocation_supported: true }, permitted_evidence_refs: ["r5-s3-controlled-data-room"], actor }, headers);
  assert(workspace.workspace_status === "ACTIVE", "Workspace should be active.");
  const requesterParticipant = await post("/network/collaboration-workspaces/participants", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, workspace_id: workspace.id, firm_id: requester.firm.id, participant_actor_id: requester.principal_actor.id, participant_role: "REQUESTING_PRINCIPAL", permissions: ["evidence.read", "evidence.add", "participant.revoke"], actor }, headers);
  const specialistParticipant = await post("/network/collaboration-workspaces/participants", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, workspace_id: workspace.id, firm_id: provider.firm.id, participant_actor_id: provider.principal_actor.id, participant_role: "SPECIALIST", permissions: ["evidence.read", "evidence.add", "comment.add"], actor }, headers);
  assert(requesterParticipant.access_status === "ACTIVE" && specialistParticipant.access_status === "ACTIVE", "Participant grants should be active.");
  const evidence = await post("/network/collaboration-workspaces/evidence", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, workspace_id: workspace.id, participant_id: specialistParticipant.id, evidence_ref: "r5-s3-formwork-review-note-ref", evidence_type: "SPECIALIST_REVIEW_EVIDENCE", access_scope: "WORKSPACE_ONLY", actor }, headers);
  assert(evidence.access_scope === "WORKSPACE_ONLY", "Evidence must be workspace-scoped.");
  const revoked = await post("/network/collaboration-workspaces/participants/revoke", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, participant_id: specialistParticipant.id, revocation_reason: "R5-S3 revocation proof", actor }, headers);
  assert(revoked.access_status === "REVOKED", "Participant should be revoked.");
  const afterRevocationDenied = await postRaw("/network/collaboration-workspaces/evidence", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, workspace_id: workspace.id, participant_id: specialistParticipant.id, evidence_ref: "r5-s3-after-revocation", evidence_type: "SPECIALIST_REVIEW_EVIDENCE", access_scope: "WORKSPACE_ONLY", actor }, headers);
  assert(afterRevocationDenied.response.status === 403, "Revoked participant must not add evidence.");
  assert(afterRevocationDenied.json.error?.code === "COLLABORATION_WORKSPACE_ACCESS_REVOKED", "Revocation denial code mismatch.");

  const summary = await get(`/network/r5-collaboration-workspace-summary?tenant_id=${tenant.id}&firm_id=${requester.firm.id}`, headers);
  assert(summary.status === "R5_S3_COLLABORATION_WORKSPACE_READY", `Unexpected R5-S3 status: ${summary.status}`);
  assert(summary.checks.every((check) => check.status === "PASS"), `R5-S3 checks failed: ${JSON.stringify(summary.checks)}`);
  assert(summary.boundaries.includes("revocation_supported"), "R5-S3 must preserve revocation_supported boundary.");
  const auditEvents = await get(`/audit-events?tenant_id=${tenant.id}&firm_id=${requester.firm.id}`, headers);
  for (const action of ["network.collaboration_workspace_opened", "network.collaboration_participant_granted", "network.collaboration_evidence_added", "network.collaboration_participant_revoked"]) assert(auditEvents.some((event) => (event.action ?? event.event_type) === action), `${action} audit event missing.`);
  console.log("R5-S3 collaboration workspace smoke passed.");
} finally {
  api.kill();
  await rm(tmp, { recursive: true, force: true });
}