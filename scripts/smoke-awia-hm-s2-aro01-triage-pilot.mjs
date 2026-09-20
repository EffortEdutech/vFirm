import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { triageAdministrativeRequest, validateAro01TriageOutput } from "../packages/core-domain/src/awia-virtual-staff-aro01-request-triage.mjs";

// HM-S2 pilot (ADR-085 candidate): General Clerk (ARO) / ARO-01 Administrative
// Request Triage, end to end and real, not cosmetic -- mirrors the bar
// smoke-awia-work-assignment.mjs already set for the CFO role: hire a named
// worker (ADR-076), turn on hiring (ADR-075), give it a REAL task from the
// ordinary front-desk -> intake -> proposal -> accept pipeline, run the real
// ARO-01 classification logic (awia-virtual-staff-aro01-request-triage.mjs),
// carry that structured result through output-draft -> human review ->
// client-delivery-draft via the new output_payload field, and prove the
// Class-B, no-PII/no-SOD authority path allows it while the runtime gate
// still enforces role-scoped tools.

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-hm-s2-aro01-"));
const apiPort = 3151;
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

  const tenant = await post("/tenants", { name: "HM-S2 ARO-01 Pilot Tenant" });
  const seed = await post("/firms", { tenant_id: tenant.id, name: "HM-S2 ARO-01 Pilot Sdn Bhd", principal_name: "HM-S2 Pilot Owner" });
  const firm = seed.firm;
  const h = authHeaders(seed.principal_actor.id, firm);

  // Turn on hiring (ADR-075) and hire the General Clerk (ARO) pilot worker,
  // named by job title per HM-S1 item 4's display_name mechanism.
  await post("/ops/awia-package-assignment", { tenant_id: firm.tenant_id, firm_id: firm.id, package_code: "HIRE_ME" }, h);
  const hired = await post("/awia/virtual-staff/hire-worker", { tenant_id: firm.tenant_id, firm_id: firm.id, role_code: "ARO", display_name: "General Clerk" }, h);
  assert.equal(hired.role_code, "ARO");
  const staffCode = hired.staff_code;

  // Before activation: a real readiness evaluation must deny the triage
  // action on this still-DRAFT worker -- lifecycle state must be enforced,
  // exactly as HM-S1's hire-a-worker smoke test held CFO/OPO to.
  const beforeActivation = await post("/awia/virtual-staff/task-readiness", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: staffCode, action: "administration.request.triage", tool: "administration.request.triage", client_id: "hm-s2-pilot-client-placeholder", project_id: "hm-s2-pilot-project-placeholder", evidence_refs: ["hm-s2-aro01-pilot-evidence"] }, h);
  if (beforeActivation.decision === "ALLOW") throw new Error("A freshly hired (DRAFT) General Clerk was allowed through the readiness gate before activation.");

  await post("/awia/virtual-staff/lifecycle", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: staffCode, to_state: "ACTIVE" }, h);

  // A REAL task via the ordinary front-desk -> intake -> proposal -> accept
  // pipeline, not a synthetic id -- same bar smoke-awia-work-assignment.mjs
  // set for the CFO role.
  const enquiry = await post("/front-desk/enquiries", { tenant_id: firm.tenant_id, firm_id: firm.id, contact_name: "HM-S2 Pilot Client Contact", organization_name: "HM-S2 Pilot Client Sdn Bhd", contact_email: "client@hm-s2-pilot-client.example", enquiry_summary: "Ongoing administrative support retainer.", requested_service_hint: "Administrative Support" }, h);
  await post("/front-desk/enquiries/qualify", { tenant_id: firm.tenant_id, firm_id: firm.id, enquiry_id: enquiry.id, decision: "QUALIFIED", consent_or_legal_basis_ref: "HM-S2-CONSENT", conflict_check_status: "CLEARED", conflict_check_ref: "HM-S2-CONFLICT-CLEARED" }, h);
  const handoff = await post("/front-desk/enquiries/handoff", { tenant_id: firm.tenant_id, firm_id: firm.id, enquiry_id: enquiry.id, provided_inputs: {} }, h);
  const intake = await post("/intake-sessions", { tenant_id: firm.tenant_id, firm_id: firm.id, relationship_id: handoff.relationship.id, provided_inputs: { engagement_summary: "Administrative support retainer" } }, h);
  const proposal = await post("/proposals", { tenant_id: firm.tenant_id, firm_id: firm.id, relationship_id: handoff.relationship.id, intake_session_id: intake.intake.id, scope_summary: "Administrative support retainer package", final_price: 400 }, h);
  const approvedProposal = await post("/proposals/approve", { tenant_id: firm.tenant_id, firm_id: firm.id, proposal_id: proposal.proposal.id }, h);
  const projectOpen = await post("/proposals/accept", { tenant_id: firm.tenant_id, firm_id: firm.id, proposal_id: approvedProposal.proposal.id, project_name: "HM-S2 Administrative Support Retainer" }, h);
  assert.equal(projectOpen.project.project_state, "OPEN");

  const relationships = await get(`/firm-client-relationships?tenant_id=${firm.tenant_id}&firm_id=${firm.id}`, h);
  const relationship = relationships.find((item) => item.id === projectOpen.project.relationship_id);
  assert(relationship, "Relationship for the opened project must be readable back.");
  const clientId = relationship.client_id;

  // After activation, the same readiness check must now allow the ARO-01
  // action -- proving the item-3 authority-gate edit (adding
  // "administration.request.triage" to the ARO role's allowed tool list)
  // actually took effect, not just DRAFT/ACTIVE lifecycle gating.
  const afterActivation = await post("/awia/virtual-staff/task-readiness", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: staffCode, action: "administration.request.triage", tool: "administration.request.triage", client_id: clientId, project_id: projectOpen.project.id, evidence_refs: ["hm-s2-aro01-pilot-evidence"] }, h);
  if (afterActivation.decision !== "ALLOW") throw new Error(`Expected the activated General Clerk to pass the readiness gate for administration.request.triage, got ${afterActivation.decision} (${JSON.stringify(afterActivation.findings)}).`);

  // An action NOT in ARO's allowed tool list must still be denied -- proves
  // the new entry is additive, not a bypass of the role-scoped gate.
  const outOfScope = await post("/awia/virtual-staff/task-readiness", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: staffCode, action: "payment.release", tool: "payment.release", client_id: clientId, project_id: projectOpen.project.id, evidence_refs: ["hm-s2-aro01-pilot-evidence"] }, h);
  if (outOfScope.decision === "ALLOW") throw new Error("An out-of-role, high-risk action was unexpectedly allowed for the ARO-01 pilot worker.");

  // Assign the real task to the hired worker for the ARO-01 action.
  const assign = await post("/awia/virtual-staff/assign-task", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: staffCode, task_id: projectOpen.task.id, action: "administration.request.triage", tool: "administration.request.triage", client_id: clientId, project_id: projectOpen.project.id, evidence_refs: ["hm-s2-aro01-pilot-evidence"] }, h);
  assert.equal(assign.workdesk_item.workdesk_status, "ASSIGNED");

  // The REAL ARO-01 execution: run the actual deterministic classification
  // logic on a real incoming administrative request -- not a stub.
  const incomingRequest = { request_subject: "VPN login is down, urgent", request_body: "I cannot access the VPN since this morning and need it for a client call.", sender_type: "internal" };
  const triageResult = triageAdministrativeRequest(incomingRequest);
  const triageValidation = validateAro01TriageOutput(triageResult);
  assert.equal(triageValidation.ok, true, `Triage output failed self-validation: ${JSON.stringify(triageValidation.findings)}`);
  assert.equal(triageResult.category, "IT_SUPPORT");
  assert.equal(triageResult.priority, "HIGH");
  assert.equal(triageResult.routed_to, "IT_SUPPORT_QUEUE");

  // Carry the real triage result through the output-draft/review pipeline via
  // the new output_payload field (HM-S2 item 2's identified gap, closed).
  const draft = await post("/awia/virtual-staff/output-draft", { tenant_id: firm.tenant_id, firm_id: firm.id, workdesk_item_id: assign.workdesk_item.id, output_title: "ARO-01 triage result", output_summary: triageResult.rationale, output_payload: triageResult }, h);
  assert.equal(draft.output_draft.status, "DRAFT_REVIEW_REQUIRED");
  assert.equal(draft.output_draft.final_issue_allowed, false, "Draft output must never carry final issue authority.");
  assert.deepEqual(draft.output_draft.output_payload, triageResult, "The real triage result must round-trip through output_payload unchanged.");

  // Human review approves the triage classification (firm owner, per HM-S1
  // item 5's default-to-owner routing decision, even though ARO-01 itself is
  // Class B and does not require a Class A approval gate).
  const approved = await post("/awia/virtual-staff/output-review", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: draft.output_draft.id, review_decision: "APPROVED_FOR_CLIENT_DRAFT", review_notes: "Triage classification confirmed correct." }, h);
  assert.equal(approved.output_review.review_decision, "APPROVED_FOR_CLIENT_DRAFT");
  assert.equal(approved.workdesk_item.workdesk_status, "REVIEWED_FOR_CLIENT_DRAFT");

  const clientDraft = await post("/awia/virtual-staff/client-delivery-draft", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: draft.output_draft.id, client_id: clientId }, h);
  assert.equal(clientDraft.client_delivery_draft.final_issue_allowed, false, "Client delivery draft must never carry final issue authority.");

  console.log(JSON.stringify({
    smoke: "awia-hm-s2-aro01-triage-pilot",
    result: "passed",
    firm: firm.name,
    staff_code: staffCode,
    task_id: projectOpen.task.id,
    triage_category: triageResult.category,
    triage_priority: triageResult.priority,
    triage_routed_to: triageResult.routed_to,
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
