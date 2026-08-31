import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = 3113;
const tmp = await mkdtemp(join(tmpdir(), "vfirm-r5-s6-"));
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
  for (const path of ["/network/r5-network-evidence-go-no-go", "/network/r5-profile-summary", "/network/r5-qualification-summary", "/network/r5-collaboration-workspace-summary", "/network/r5-responsibility-matrix-summary", "/network/r5-assignment-delivery-summary"]) assert(contracts.some((contract) => contract.path === path), `${path} contract missing.`);

  const tenant = await post("/tenants", { name: "R5 S6 Evidence Tenant" });
  const requester = await post("/firms", { tenant_id: tenant.id, name: "Evidence Requesting Virtual Firm", principal_name: "Pn. Evidence Principal" });
  const provider = await post("/firms", { tenant_id: tenant.id, name: "Evidence Specialist Firm", principal_name: "Ir. Evidence Specialist" });
  const observer = await post("/firms", { tenant_id: tenant.id, name: "Evidence Observer Firm", principal_name: "Tn. Revoked Observer" });
  const requesterHeaders = authHeaders(requester), requesterActor = requester.principal_actor;
  const providerHeaders = authHeaders(provider), providerActor = provider.principal_actor;
  const observerActor = observer.principal_actor;

  const firmProfile = await post("/network/firm-profiles", { tenant_id: tenant.id, firm_id: provider.firm.id, display_name: "Evidence Specialist Firm Profile", jurisdiction_refs: ["MY"], actor: providerActor }, providerHeaders);
  const professionalProfile = await post("/network/professional-profiles", { tenant_id: tenant.id, firm_id: provider.firm.id, display_name: "Ir. Evidence Specialist Profile", jurisdiction_refs: ["MY"], actor: providerActor }, providerHeaders);
  const credential = await post("/network/credentials", { tenant_id: tenant.id, firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, credential_type: "PROFESSIONAL_REGISTRATION", credential_name: "Verified R5-S6 credential", issuer: "Jurisdiction authority placeholder", jurisdiction_refs: ["MY"], verification_status: "VERIFIED", evidence_refs: ["r5-s6-credential-evidence"], actor: providerActor }, providerHeaders);
  const capability = await post("/network/capabilities", { tenant_id: tenant.id, firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, firm_network_profile_id: firmProfile.id, capability_code: "FORMWORK_NETWORK_EVIDENCE_SUPPORT", service_pack_ref: "FORMWORK_ENGINEERING_PACK", jurisdiction_refs: ["MY"], visibility: "TRUSTED_NETWORK_ONLY", qualification_required: true, actor: providerActor }, providerHeaders);
  await post("/network/trust-signals", { tenant_id: tenant.id, firm_id: provider.firm.id, subject_type: "NETWORK_PROFESSIONAL_PROFILE", subject_id: professionalProfile.id, signal_type: "PAST_COLLABORATION", signal_summary: "Prior collaboration signal only; not a credential substitute.", substitutes_for_credential: false, actor: providerActor }, providerHeaders);

  const conflicted = await post("/network/conflict-checks", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, subject_profile_id: professionalProfile.id, check_status: "CONFLICT_FOUND", conflict_summary: "Deliberate negative gate evidence.", evidence_refs: ["r5-s6-conflict-found"], actor: requesterActor }, requesterHeaders);
  const deniedGate = await post("/network/qualification-gates", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, firm_network_profile_id: firmProfile.id, capability_id: capability.id, credential_id: credential.id, conflict_check_id: conflicted.id, jurisdiction_ref: "MY", credential_status: "MISSING", jurisdiction_status: "INVALID", insurance_status: "EXPIRED", conflict_status: "CONFLICT_FOUND", capacity_status: "UNAVAILABLE", policy_status: "DENIED", actor: requesterActor }, requesterHeaders);
  assert(deniedGate.gate_status === "DENIED", "Negative qualification gate should be denied.");
  const deniedInvitation = await postRaw("/network/specialist-invitations", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, qualification_gate_id: deniedGate.id, actor: requesterActor }, requesterHeaders);
  assert(deniedInvitation.response.status === 403, "Denied gate must block invitation.");

  const cleared = await post("/network/conflict-checks", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, subject_profile_id: professionalProfile.id, check_status: "CLEARED", conflict_summary: "No conflict found for scoped Formwork support.", evidence_refs: ["r5-s6-conflict-cleared"], actor: requesterActor }, requesterHeaders);
  const passGate = await post("/network/qualification-gates", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, firm_network_profile_id: firmProfile.id, capability_id: capability.id, credential_id: credential.id, conflict_check_id: cleared.id, jurisdiction_ref: "MY", credential_status: "VERIFIED", jurisdiction_status: "VALID", insurance_status: "VALID", conflict_status: "CLEARED", capacity_status: "AVAILABLE", policy_status: "APPROVED", actor: requesterActor }, requesterHeaders);
  assert(passGate.gate_status === "PASS", "Positive qualification gate should pass.");
  const invitation = await post("/network/specialist-invitations", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, qualification_gate_id: passGate.id, actor: requesterActor }, requesterHeaders);
  assert(invitation.invitation_status === "READY_TO_SEND", "Invitation should be ready after qualification gate passes.");

  const workspace = await post("/network/collaboration-workspaces", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, specialist_invitation_id: invitation.id, data_room_policy: { minimum_necessary_access: true, client_confidential: true, audit_required: true, revocation_supported: true }, permitted_evidence_refs: ["r5-s6-controlled-data-room"], actor: requesterActor }, requesterHeaders);
  const requesterParticipant = await post("/network/collaboration-workspaces/participants", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, workspace_id: workspace.id, firm_id: requester.firm.id, participant_actor_id: requester.principal_actor.id, participant_role: "ACCOUNTABLE_APPROVER", permissions: ["assignment.request", "assignment.approve", "assignment.close", "participant.revoke"], actor: requesterActor }, requesterHeaders);
  const specialistParticipant = await post("/network/collaboration-workspaces/participants", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, workspace_id: workspace.id, firm_id: provider.firm.id, participant_actor_id: provider.principal_actor.id, participant_role: "RESPONSIBLE_PROFESSIONAL", permissions: ["assignment.accept", "assignment.deliver", "evidence.add"], actor: requesterActor }, requesterHeaders);
  const observerParticipant = await post("/network/collaboration-workspaces/participants", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, workspace_id: workspace.id, firm_id: requester.firm.id, participant_actor_id: requester.principal_actor.id, participant_role: "OBSERVER", permissions: ["evidence.read"], actor: requesterActor }, requesterHeaders);
  await post("/network/collaboration-workspaces/evidence", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, workspace_id: workspace.id, participant_id: specialistParticipant.id, evidence_ref: "r5-s6-formwork-specialist-review-ref", evidence_type: "SPECIALIST_REVIEW_EVIDENCE", access_scope: "WORKSPACE_ONLY", actor: requesterActor }, requesterHeaders);
  const revoked = await post("/network/collaboration-workspaces/participants/revoke", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, participant_id: observerParticipant.id, revocation_reason: "R5-S6 revocation path evidence", actor: requesterActor }, requesterHeaders);
  assert(revoked.access_status === "REVOKED", "Observer access should be revoked for revocation evidence.");

  const matrix = await post("/network/responsibility-matrices", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, workspace_id: workspace.id, accountable_firm_id: requester.firm.id, responsible_professional_actor_id: provider.principal_actor.id, reviewer_actor_id: provider.principal_actor.id, approver_actor_id: requester.principal_actor.id, permitted_worker_actions: ["read_workspace_evidence", "draft_specialist_review_note", "prepare_exception_summary"], regulated_scope: "FORMWORK_NETWORK_EVIDENCE_SUPPORT", actor: requesterActor }, requesterHeaders);
  const assignment = await post("/network/specialist-assignments", { tenant_id: tenant.id, firm_id: requester.firm.id, responsibility_matrix_id: matrix.id, assignment_title: "R5-S6 specialist evidence assignment", assignment_scope: "Specialist review of Formwork delivery evidence for Release 5 closure.", actor: requesterActor }, requesterHeaders);
  await post("/network/specialist-assignments/accept", { tenant_id: tenant.id, firm_id: provider.firm.id, assignment_id: assignment.id, actor: providerActor }, providerHeaders);
  await post("/network/specialist-assignments/start", { tenant_id: tenant.id, firm_id: provider.firm.id, assignment_id: assignment.id, actor: providerActor }, providerHeaders);
  await post("/network/specialist-assignments/deliver", { tenant_id: tenant.id, firm_id: provider.firm.id, assignment_id: assignment.id, evidence_refs: ["r5-s6-specialist-delivery-note", "r5-s6-markup-evidence"], actor: providerActor }, providerHeaders);
  await post("/network/specialist-assignments/review", { tenant_id: tenant.id, firm_id: provider.firm.id, assignment_id: assignment.id, review_summary: "Specialist evidence reviewed against assignment scope.", actor: providerActor }, providerHeaders);
  await post("/network/specialist-assignments/approve", { tenant_id: tenant.id, firm_id: requester.firm.id, assignment_id: assignment.id, approval_summary: "Accountable requester approves specialist contribution for controlled Release 5 evidence.", actor: requesterActor }, requesterHeaders);
  const closed = await post("/network/specialist-assignments/close", { tenant_id: tenant.id, firm_id: requester.firm.id, assignment_id: assignment.id, actor: requesterActor }, requesterHeaders);
  assert(closed.assignment_status === "CLOSED", "Assignment should close before R5-S6 evidence pack." );

  const evidence = await get(`/network/r5-network-evidence-go-no-go?tenant_id=${tenant.id}`, requesterHeaders);
  assert(evidence.status === "EVIDENCE_READY", `Unexpected R5-S6 evidence status: ${evidence.status}`);
  assert(evidence.recommendation === "GO_FOR_RELEASE_5_ACCEPTANCE", `Unexpected R5-S6 recommendation: ${evidence.recommendation}`);
  assert(evidence.checks.every((check) => check.status === "PASS"), `R5-S6 checks failed: ${JSON.stringify(evidence.checks)}`);
  for (const boundary of ["trusted_network_only", "no_public_marketplace", "qualification_gates_outrank_price", "no_silent_approval", "no_autonomous_regulated_approval", "tenant_data_isolation", "no_vf24_ecosystem_intelligence"]) assert(evidence.boundaries.includes(boundary), `${boundary} boundary missing.`);
  assert(evidence.evidence_pack.sprint_statuses.r5_s5 === "R5_S5_ASSIGNMENT_DELIVERY_READY", "R5-S5 status missing from evidence pack.");
  assert(evidence.evidence_pack.counts.closed_assignments === 1, "Evidence pack should count one closed assignment.");

  console.log("R5-S6 network evidence pack and go/no-go smoke passed.");
} finally {
  api.kill();
  await rm(tmp, { recursive: true, force: true });
}
