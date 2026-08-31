import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = 3111;
const tmp = await mkdtemp(join(tmpdir(), "vfirm-r5-s4-"));
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
  for (const path of ["/responsibility-matrices", "/network/r5-responsibility-matrix-summary", "/network/responsibility-matrices"]) assert(contracts.some((contract) => contract.path === path), `${path} contract missing.`);

  const tenant = await post("/tenants", { name: "R5 S4 Responsibility Tenant" });
  const requester = await post("/firms", { tenant_id: tenant.id, name: "Accountable Requesting Virtual Firm", principal_name: "Pn. Accountable Principal" });
  const provider = await post("/firms", { tenant_id: tenant.id, name: "Responsible Specialist Firm", principal_name: "Ir. Responsible Specialist" });
  const headers = authHeaders(requester), actor = requester.principal_actor, providerHeaders = authHeaders(provider), providerActor = provider.principal_actor;

  const firmProfile = await post("/network/firm-profiles", { tenant_id: tenant.id, firm_id: provider.firm.id, display_name: "Responsible Specialist Firm Profile", jurisdiction_refs: ["MY"], actor: providerActor }, providerHeaders);
  const professionalProfile = await post("/network/professional-profiles", { tenant_id: tenant.id, firm_id: provider.firm.id, display_name: "Ir. Responsible Specialist Profile", jurisdiction_refs: ["MY"], actor: providerActor }, providerHeaders);
  const credential = await post("/network/credentials", { tenant_id: tenant.id, firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, credential_type: "PROFESSIONAL_REGISTRATION", credential_name: "Verified R5-S4 credential", jurisdiction_refs: ["MY"], verification_status: "VERIFIED", evidence_refs: ["r5-s4-credential-evidence"], actor: providerActor }, providerHeaders);
  const capability = await post("/network/capabilities", { tenant_id: tenant.id, firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, firm_network_profile_id: firmProfile.id, capability_code: "FORMWORK_RESPONSIBILITY_REVIEW_SUPPORT", jurisdiction_refs: ["MY"], visibility: "TRUSTED_NETWORK_ONLY", qualification_required: true, actor: providerActor }, providerHeaders);
  const conflict = await post("/network/conflict-checks", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, subject_profile_id: professionalProfile.id, check_status: "CLEARED", conflict_summary: "No conflict found.", evidence_refs: ["r5-s4-conflict-cleared"], actor }, headers);
  const passGate = await post("/network/qualification-gates", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, firm_network_profile_id: firmProfile.id, capability_id: capability.id, credential_id: credential.id, conflict_check_id: conflict.id, jurisdiction_ref: "MY", credential_status: "VERIFIED", jurisdiction_status: "VALID", insurance_status: "VALID", conflict_status: "CLEARED", capacity_status: "AVAILABLE", policy_status: "APPROVED", actor }, headers);
  const invitation = await post("/network/specialist-invitations", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, qualification_gate_id: passGate.id, actor }, headers);
  const workspace = await post("/network/collaboration-workspaces", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, specialist_invitation_id: invitation.id, data_room_policy: { minimum_necessary_access: true, client_confidential: true, audit_required: true, revocation_supported: true }, permitted_evidence_refs: ["r5-s4-controlled-data-room"], actor }, headers);
  const requesterParticipant = await post("/network/collaboration-workspaces/participants", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, workspace_id: workspace.id, firm_id: requester.firm.id, participant_actor_id: requester.principal_actor.id, participant_role: "ACCOUNTABLE_PRINCIPAL", permissions: ["evidence.read", "matrix.create", "approval.record"], actor }, headers);
  const specialistParticipant = await post("/network/collaboration-workspaces/participants", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, workspace_id: workspace.id, firm_id: provider.firm.id, participant_actor_id: provider.principal_actor.id, participant_role: "RESPONSIBLE_PROFESSIONAL", permissions: ["evidence.read", "evidence.add", "review.prepare"], actor }, headers);
  assert(requesterParticipant.access_status === "ACTIVE" && specialistParticipant.access_status === "ACTIVE", "R5-S4 participants should be active.");

  const orphanDenied = await postRaw("/network/responsibility-matrices", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, workspace_id: workspace.id, accountable_firm_id: requester.firm.id, responsible_professional_actor_id: "not-an-active-workspace-participant", approver_actor_id: requester.principal_actor.id, permitted_worker_actions: ["draft_review_note"], actor }, headers);
  assert(orphanDenied.response.status === 409, "Matrix without an active responsible professional participant must be denied.");

  const silentApprovalDenied = await postRaw("/network/responsibility-matrices", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, workspace_id: workspace.id, accountable_firm_id: requester.firm.id, responsible_professional_actor_id: provider.principal_actor.id, approver_actor_id: requester.principal_actor.id, approval_required: false, permitted_worker_actions: ["draft_review_note"], actor }, headers);
  assert(silentApprovalDenied.response.status === 409, "Matrix with approval_required=false must be denied.");

  const forbiddenWorkerActionDenied = await postRaw("/network/responsibility-matrices", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, workspace_id: workspace.id, accountable_firm_id: requester.firm.id, responsible_professional_actor_id: provider.principal_actor.id, approver_actor_id: requester.principal_actor.id, permitted_worker_actions: ["approve_regulated_output"], actor }, headers);
  assert(forbiddenWorkerActionDenied.response.status === 409, "Matrix must deny worker approval/certification authority.");

  const sameReviewerApproverDenied = await postRaw("/network/responsibility-matrices", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, workspace_id: workspace.id, accountable_firm_id: requester.firm.id, responsible_professional_actor_id: provider.principal_actor.id, reviewer_actor_id: requester.principal_actor.id, approver_actor_id: requester.principal_actor.id, permitted_worker_actions: ["draft_review_note"], actor }, headers);
  assert(sameReviewerApproverDenied.response.status === 409, "Reviewer and approver must be separately recorded when reviewer is present.");

  const matrix = await post("/network/responsibility-matrices", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, workspace_id: workspace.id, accountable_firm_id: requester.firm.id, responsible_professional_actor_id: provider.principal_actor.id, reviewer_actor_id: provider.principal_actor.id, approver_actor_id: requester.principal_actor.id, permitted_worker_actions: ["read_workspace_evidence", "draft_specialist_review_note", "prepare_exception_summary"], regulated_scope: "FORMWORK_TEMPORARY_WORKS_REVIEW_SUPPORT", actor }, headers);
  assert(matrix.matrix_status === "ACTIVE", "Responsibility matrix should be active.");
  assert(matrix.approval_required === true, "Responsibility matrix must require approval.");

  const matrices = await get(`/responsibility-matrices?tenant_id=${tenant.id}&firm_id=${requester.firm.id}`, headers);
  assert(matrices.some((item) => item.id === matrix.id), "Responsibility matrix read endpoint should include scoped matrix.");
  const summary = await get(`/network/r5-responsibility-matrix-summary?tenant_id=${tenant.id}&firm_id=${requester.firm.id}`, headers);
  assert(summary.status === "R5_S4_RESPONSIBILITY_MATRIX_READY", `Unexpected R5-S4 status: ${summary.status}`);
  assert(summary.checks.every((check) => check.status === "PASS"), `R5-S4 checks failed: ${JSON.stringify(summary.checks)}`);
  for (const boundary of ["no_orphan_regulated_work", "no_silent_approval", "worker_actions_bounded", "trusted_network_only"]) assert(summary.boundaries.includes(boundary), `${boundary} boundary missing.`);

  const auditEvents = await get(`/audit-events?tenant_id=${tenant.id}&firm_id=${requester.firm.id}`, headers);
  assert(auditEvents.some((event) => (event.action ?? event.event_type) === "network.responsibility_matrix_recorded"), "Responsibility matrix audit event missing.");
  console.log("R5-S4 responsibility and approval matrix smoke passed.");
} finally {
  api.kill();
  await rm(tmp, { recursive: true, force: true });
}