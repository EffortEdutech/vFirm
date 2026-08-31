import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = 3112;
const tmp = await mkdtemp(join(tmpdir(), "vfirm-r5-s5-"));
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
  for (const path of ["/specialist-assignments", "/network/r5-assignment-delivery-summary", "/network/specialist-assignments", "/network/specialist-assignments/accept", "/network/specialist-assignments/start", "/network/specialist-assignments/deliver", "/network/specialist-assignments/review", "/network/specialist-assignments/approve", "/network/specialist-assignments/close"]) assert(contracts.some((contract) => contract.path === path), `${path} contract missing.`);

  const tenant = await post("/tenants", { name: "R5 S5 Assignment Tenant" });
  const requester = await post("/firms", { tenant_id: tenant.id, name: "Assignment Requesting Virtual Firm", principal_name: "Pn. Assignment Principal" });
  const provider = await post("/firms", { tenant_id: tenant.id, name: "Assignment Specialist Firm", principal_name: "Ir. Assignment Specialist" });
  const requesterHeaders = authHeaders(requester), requesterActor = requester.principal_actor, providerHeaders = authHeaders(provider), providerActor = provider.principal_actor;

  const firmProfile = await post("/network/firm-profiles", { tenant_id: tenant.id, firm_id: provider.firm.id, display_name: "Assignment Specialist Firm Profile", jurisdiction_refs: ["MY"], actor: providerActor }, providerHeaders);
  const professionalProfile = await post("/network/professional-profiles", { tenant_id: tenant.id, firm_id: provider.firm.id, display_name: "Ir. Assignment Specialist Profile", jurisdiction_refs: ["MY"], actor: providerActor }, providerHeaders);
  const credential = await post("/network/credentials", { tenant_id: tenant.id, firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, credential_type: "PROFESSIONAL_REGISTRATION", credential_name: "Verified R5-S5 credential", jurisdiction_refs: ["MY"], verification_status: "VERIFIED", evidence_refs: ["r5-s5-credential-evidence"], actor: providerActor }, providerHeaders);
  const capability = await post("/network/capabilities", { tenant_id: tenant.id, firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, firm_network_profile_id: firmProfile.id, capability_code: "FORMWORK_ASSIGNMENT_DELIVERY_SUPPORT", jurisdiction_refs: ["MY"], visibility: "TRUSTED_NETWORK_ONLY", qualification_required: true, actor: providerActor }, providerHeaders);
  const conflict = await post("/network/conflict-checks", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, subject_profile_id: professionalProfile.id, check_status: "CLEARED", conflict_summary: "No conflict found.", evidence_refs: ["r5-s5-conflict-cleared"], actor: requesterActor }, requesterHeaders);
  const passGate = await post("/network/qualification-gates", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, firm_network_profile_id: firmProfile.id, capability_id: capability.id, credential_id: credential.id, conflict_check_id: conflict.id, jurisdiction_ref: "MY", credential_status: "VERIFIED", jurisdiction_status: "VALID", insurance_status: "VALID", conflict_status: "CLEARED", capacity_status: "AVAILABLE", policy_status: "APPROVED", actor: requesterActor }, requesterHeaders);
  const invitation = await post("/network/specialist-invitations", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, qualification_gate_id: passGate.id, actor: requesterActor }, requesterHeaders);
  const workspace = await post("/network/collaboration-workspaces", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, specialist_invitation_id: invitation.id, data_room_policy: { minimum_necessary_access: true, client_confidential: true, audit_required: true, revocation_supported: true }, permitted_evidence_refs: ["r5-s5-controlled-data-room"], actor: requesterActor }, requesterHeaders);
  await post("/network/collaboration-workspaces/participants", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, workspace_id: workspace.id, firm_id: requester.firm.id, participant_actor_id: requester.principal_actor.id, participant_role: "ACCOUNTABLE_APPROVER", permissions: ["assignment.request", "assignment.approve", "assignment.close"], actor: requesterActor }, requesterHeaders);
  await post("/network/collaboration-workspaces/participants", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, workspace_id: workspace.id, firm_id: provider.firm.id, participant_actor_id: provider.principal_actor.id, participant_role: "RESPONSIBLE_PROFESSIONAL", permissions: ["assignment.accept", "assignment.deliver", "assignment.review"], actor: requesterActor }, requesterHeaders);
  const matrix = await post("/network/responsibility-matrices", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, workspace_id: workspace.id, accountable_firm_id: requester.firm.id, responsible_professional_actor_id: provider.principal_actor.id, reviewer_actor_id: provider.principal_actor.id, approver_actor_id: requester.principal_actor.id, permitted_worker_actions: ["read_workspace_evidence", "draft_specialist_review_note", "prepare_exception_summary"], regulated_scope: "FORMWORK_ASSIGNMENT_DELIVERY_SUPPORT", actor: requesterActor }, requesterHeaders);

  const noMatrixDenied = await postRaw("/network/specialist-assignments", { tenant_id: tenant.id, responsibility_matrix_id: "missing-matrix", assignment_title: "Denied assignment", assignment_scope: "Should not start", actor: requesterActor }, requesterHeaders);
  assert(noMatrixDenied.response.status === 404, "Assignment without active responsibility matrix must be denied.");

  const assignment = await post("/network/specialist-assignments", { tenant_id: tenant.id, firm_id: requester.firm.id, responsibility_matrix_id: matrix.id, assignment_title: "Review temporary works drawing package", assignment_scope: "Specialist review of Formwork drawing revisions and QA evidence.", actor: requesterActor }, requesterHeaders);
  assert(assignment.assignment_status === "REQUESTED", "Assignment should start REQUESTED.");

  const earlyDeliverDenied = await postRaw("/network/specialist-assignments/deliver", { tenant_id: tenant.id, firm_id: provider.firm.id, assignment_id: assignment.id, evidence_refs: ["too-early"], actor: providerActor }, providerHeaders);
  assert(earlyDeliverDenied.response.status === 409, "Delivery before acceptance/start must be denied.");

  const unauthorizedApproveDenied = await postRaw("/network/specialist-assignments/approve", { tenant_id: tenant.id, firm_id: provider.firm.id, assignment_id: assignment.id, actor: providerActor }, providerHeaders);
  assert(unauthorizedApproveDenied.response.status === 409, "Responsible professional must not approve requester approval step.");

  const accepted = await post("/network/specialist-assignments/accept", { tenant_id: tenant.id, firm_id: provider.firm.id, assignment_id: assignment.id, actor: providerActor }, providerHeaders);
  assert(accepted.assignment_status === "ACCEPTED", "Assignment should move to ACCEPTED.");
  const started = await post("/network/specialist-assignments/start", { tenant_id: tenant.id, firm_id: provider.firm.id, assignment_id: assignment.id, actor: providerActor }, providerHeaders);
  assert(started.assignment_status === "IN_PROGRESS", "Assignment should move to IN_PROGRESS.");
  const deliverWithoutEvidenceDenied = await postRaw("/network/specialist-assignments/deliver", { tenant_id: tenant.id, firm_id: provider.firm.id, assignment_id: assignment.id, evidence_refs: [], actor: providerActor }, providerHeaders);
  assert(deliverWithoutEvidenceDenied.response.status === 409, "Delivery without evidence refs must be denied.");
  const delivered = await post("/network/specialist-assignments/deliver", { tenant_id: tenant.id, firm_id: provider.firm.id, assignment_id: assignment.id, evidence_refs: ["r5-s5-specialist-review-note", "r5-s5-markup-evidence"], actor: providerActor }, providerHeaders);
  assert(delivered.assignment_status === "DELIVERED" && delivered.evidence_refs.length === 2, "Assignment should deliver evidence.");
  const reviewed = await post("/network/specialist-assignments/review", { tenant_id: tenant.id, firm_id: provider.firm.id, assignment_id: assignment.id, review_summary: "Specialist delivery reviewed against assigned scope.", actor: providerActor }, providerHeaders);
  assert(reviewed.assignment_status === "REVIEWED" && reviewed.review_summary, "Assignment should move to REVIEWED.");
  const approved = await post("/network/specialist-assignments/approve", { tenant_id: tenant.id, firm_id: requester.firm.id, assignment_id: assignment.id, approval_summary: "Requester approver accepts specialist contribution for controlled use.", actor: requesterActor }, requesterHeaders);
  assert(approved.assignment_status === "APPROVED" && approved.approval_summary, "Assignment should move to APPROVED.");
  const closed = await post("/network/specialist-assignments/close", { tenant_id: tenant.id, firm_id: requester.firm.id, assignment_id: assignment.id, actor: requesterActor }, requesterHeaders);
  assert(closed.assignment_status === "CLOSED", "Assignment should move to CLOSED.");

  const assignments = await get(`/specialist-assignments?tenant_id=${tenant.id}&firm_id=${requester.firm.id}`, requesterHeaders);
  assert(assignments.some((item) => item.id === assignment.id && item.assignment_status === "CLOSED"), "Specialist assignment read endpoint should show closed assignment.");
  const summary = await get(`/network/r5-assignment-delivery-summary?tenant_id=${tenant.id}&firm_id=${requester.firm.id}`, requesterHeaders);
  assert(summary.status === "R5_S5_ASSIGNMENT_DELIVERY_READY", `Unexpected R5-S5 status: ${summary.status}`);
  assert(summary.checks.every((check) => check.status === "PASS"), `R5-S5 checks failed: ${JSON.stringify(summary.checks)}`);
  for (const boundary of ["responsibility_matrix_required", "delivery_evidence_required", "human_review_required", "human_approval_required", "no_autonomous_regulated_approval"]) assert(summary.boundaries.includes(boundary), `${boundary} boundary missing.`);

  const auditEvents = await get(`/audit-events?tenant_id=${tenant.id}&firm_id=${requester.firm.id}`, requesterHeaders);
  for (const action of ["network.specialist_assignment_requested", "network.specialist_assignment_accepted", "network.specialist_assignment_started", "network.specialist_assignment_delivered", "network.specialist_assignment_reviewed", "network.specialist_assignment_approved", "network.specialist_assignment_closed"]) assert(auditEvents.some((event) => (event.action ?? event.event_type) === action), `${action} audit event missing.`);
  console.log("R5-S5 assignment and delivery loop smoke passed.");
} finally {
  api.kill();
  await rm(tmp, { recursive: true, force: true });
}