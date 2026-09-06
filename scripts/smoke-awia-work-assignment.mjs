import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

// Proves the backend path the new "Work" web screen (apps/web/public/app.js:
// renderWorkModule/bindWorkControls) actually calls: a business owner hires a
// worker one-at-a-time (ADR-076), turns hiring on for a firm (ADR-075), then
// gives that worker a REAL task that came from the ordinary
// intake -> proposal -> accept pipeline (not a synthetic id) -- exactly what
// the Work screen's "Give Work To Your Team" form does -- and walks the
// assign -> draft -> human review -> client-ready loop through to a client
// delivery draft. It also proves the exact client_id resolution the Work
// screen performs client-side (task.project_id -> project.relationship_id ->
// firm_client_relationships -> client_id) matches a real relationship
// instead of a guessed/fallback client id.

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-awia-work-"));
const apiPort = 3142;
const apiBase = `http://127.0.0.1:${apiPort}`;
const storePath = join(tmp, "store.json");
const children = [];
let logs = "";

function start(name, args, env) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"]
  });
  children.push(child);
  child.stdout.on("data", (chunk) => { logs += `[${name}] ${chunk}`; });
  child.stderr.on("data", (chunk) => { logs += `[${name}] ${chunk}`; });
  return child;
}

async function waitForJson(url) {
  const started = Date.now();
  while (Date.now() - started < 10000) {
    try {
      const response = await fetch(url);
      const json = await response.json();
      if (response.ok && json.ok !== false) return { response, json };
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}. Logs:\n${logs}`);
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await response.json().catch(() => ({ ok: false, error: { message: "Non-JSON response" } }));
  return { response, json };
}

async function get(path, headers = {}) {
  const { response, json } = await request(path, { headers });
  assert.equal(response.ok, true, `${path} HTTP ${response.status}: ${JSON.stringify(json)}`);
  assert.equal(json.ok, true, `${path} failed: ${JSON.stringify(json)}`);
  return json.data;
}

async function post(path, body, headers = {}) {
  const { response, json } = await request(path, { method: "POST", body, headers });
  assert.equal(response.ok, true, `${path} HTTP ${response.status}: ${JSON.stringify(json)}`);
  assert.equal(json.ok, true, `${path} failed: ${JSON.stringify(json)}`);
  return json.data;
}

function authHeaders(actorId, firm) {
  return {
    "x-vfirm-actor-id": actorId,
    "x-vfirm-tenant-id": firm.tenant_id,
    "x-vfirm-firm-id": firm.id,
    "x-vfirm-role": "principal"
  };
}

try {
  start("api", ["apps/api/src/server.mjs"], { VFIRM_API_PORT: String(apiPort), VFIRM_STORE_PATH: storePath, DATABASE_URL: "", VFIRM_STORE_BACKEND: "json" });
  await waitForJson(`${apiBase}/health`);

  const tenant = await post("/tenants", { name: "AWIA Work Screen Pilot Tenant" });
  const seed = await post("/firms", { tenant_id: tenant.id, name: "AWIA Work Screen Pilot Sdn Bhd", principal_name: "AWIA Work Screen Owner" });
  const firm = seed.firm;
  const h = authHeaders(seed.principal_actor.id, firm);

  // Turn on hiring (ADR-075) and hire one CFO worker one-at-a-time (ADR-076).
  await post("/ops/awia-package-assignment", { tenant_id: firm.tenant_id, firm_id: firm.id, package_code: "HIRE_ME" }, h);
  const hired = await post("/awia/virtual-staff/hire-worker", { tenant_id: firm.tenant_id, firm_id: firm.id, role_code: "CFO" }, h);
  assert.equal(hired.role_code, "CFO");
  const staffCode = hired.staff_code;
  await post("/awia/virtual-staff/lifecycle", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: staffCode, to_state: "ACTIVE" }, h);

  // Real client + project + task via the ordinary front-desk -> intake -> proposal -> accept pipeline.
  const enquiry = await post("/front-desk/enquiries", { tenant_id: firm.tenant_id, firm_id: firm.id, contact_name: "Work Screen Client Contact", organization_name: "Work Screen Client Sdn Bhd", contact_email: "client@work-screen-client.example", enquiry_summary: "Need monthly finance analysis support.", requested_service_hint: "Finance Analysis" }, h);
  await post("/front-desk/enquiries/qualify", { tenant_id: firm.tenant_id, firm_id: firm.id, enquiry_id: enquiry.id, decision: "QUALIFIED", consent_or_legal_basis_ref: "WORK-SCREEN-CONSENT", conflict_check_status: "CLEARED", conflict_check_ref: "WORK-SCREEN-CONFLICT-CLEARED" }, h);
  const handoff = await post("/front-desk/enquiries/handoff", { tenant_id: firm.tenant_id, firm_id: firm.id, enquiry_id: enquiry.id, provided_inputs: {} }, h);
  const intake = await post("/intake-sessions", { tenant_id: firm.tenant_id, firm_id: firm.id, relationship_id: handoff.relationship.id, provided_inputs: { engagement_summary: "Monthly finance analysis" } }, h);
  const proposal = await post("/proposals", { tenant_id: firm.tenant_id, firm_id: firm.id, relationship_id: handoff.relationship.id, intake_session_id: intake.intake.id, scope_summary: "Monthly finance analysis package", final_price: 1500 }, h);
  const approvedProposal = await post("/proposals/approve", { tenant_id: firm.tenant_id, firm_id: firm.id, proposal_id: proposal.proposal.id }, h);
  const projectOpen = await post("/proposals/accept", { tenant_id: firm.tenant_id, firm_id: firm.id, proposal_id: approvedProposal.proposal.id, project_name: "Work Screen Monthly Finance Analysis" }, h);
  assert.equal(projectOpen.project.project_state, "OPEN");
  assert.equal(projectOpen.project.relationship_id, handoff.relationship.id, "Project must carry the real client relationship id.");

  // Resolve the client id the exact way the Work screen's awiaClientIdForTask() does:
  // task.project_id -> projects -> relationship_id -> firm_client_relationships -> client_id.
  const relationships = await get(`/firm-client-relationships?tenant_id=${firm.tenant_id}&firm_id=${firm.id}`, h);
  const relationship = relationships.find((item) => item.id === projectOpen.project.relationship_id);
  assert(relationship, "Relationship for the opened project must be readable back.");
  const clientId = relationship.client_id;
  assert(clientId, "Resolved client id must not be empty.");

  // Assign the real task to the hired worker (Work screen's "Give Work To Your Team").
  const assign = await post("/awia/virtual-staff/assign-task", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: staffCode, task_id: projectOpen.task.id, action: "finance.analysis.prepare", tool: "finance.analysis.prepare", client_id: clientId, project_id: projectOpen.project.id, evidence_refs: ["work-screen-evidence-ref-001"] }, h);
  assert.equal(assign.workdesk_item.workdesk_status, "ASSIGNED");
  assert.equal(assign.workdesk_item.task_id, projectOpen.task.id);

  // "Get their draft".
  const draft = await post("/awia/virtual-staff/output-draft", { tenant_id: firm.tenant_id, firm_id: firm.id, workdesk_item_id: assign.workdesk_item.id }, h);
  assert.equal(draft.output_draft.status, "DRAFT_REVIEW_REQUIRED");
  assert.equal(draft.output_draft.final_issue_allowed, false, "Draft output must never carry final issue authority.");

  // Human "Send back" then "Approve" loop, exactly as the Work screen offers both buttons.
  const revised = await post("/awia/virtual-staff/output-review", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: draft.output_draft.id, review_decision: "REVISION_REQUIRED", review_notes: "Please add last quarter's comparison." }, h);
  assert.equal(revised.workdesk_item.workdesk_status, "REVIEW_ACTION_REQUIRED");
  const approved = await post("/awia/virtual-staff/output-review", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: draft.output_draft.id, review_decision: "APPROVED_FOR_CLIENT_DRAFT", review_notes: "Looks good now." }, h);
  assert.equal(approved.output_review.review_decision, "APPROVED_FOR_CLIENT_DRAFT");
  assert.equal(approved.workdesk_item.workdesk_status, "REVIEWED_FOR_CLIENT_DRAFT");

  // "Prepare for client" -- using the resolved client id, not a guessed one.
  const clientDraft = await post("/awia/virtual-staff/client-delivery-draft", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: draft.output_draft.id, client_id: clientId }, h);
  assert.equal(clientDraft.client_delivery_draft.final_issue_allowed, false, "Client delivery draft must never carry final issue authority.");
  assert.equal(clientDraft.client_delivery_draft.client_id, clientId);

  // The Work screen's "Ready for Clients" table reads GET /awia-client-delivery-drafts.
  const clientDeliveryDrafts = await get(`/awia-client-delivery-drafts?tenant_id=${firm.tenant_id}&firm_id=${firm.id}`, h);
  assert(clientDeliveryDrafts.some((item) => item.id === clientDraft.client_delivery_draft.id), "Client delivery draft must be readable back via the generic list route the Work screen fetches.");

  console.log(JSON.stringify({
    smoke: "awia-work-assignment",
    result: "passed",
    firm: firm.name,
    staff_code: staffCode,
    task_id: projectOpen.task.id,
    resolved_client_id: clientId,
    workdesk_item_id: assign.workdesk_item.id,
    output_draft_id: draft.output_draft.id,
    client_delivery_draft_id: clientDraft.client_delivery_draft.id,
    boundary: "no_final_issue_authority_at_any_step"
  }, null, 2));
} finally {
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill();
  }
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await rm(tmp, { recursive: true, force: true });
}
