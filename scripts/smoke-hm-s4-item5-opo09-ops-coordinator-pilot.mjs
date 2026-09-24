import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { assignTaskToCapacity, validateOpo09AssignmentOutput } from "../packages/core-domain/src/awia-virtual-staff-opo09-task-capacity-assignment.mjs";

// HM-S4 item 5 (ADR-087 candidate continued): Ops Coordinator (OPO) / OPO-09
// Task & Capacity Assignment, end to end and real, not cosmetic -- same
// pattern as items 3 and 4, but OPO is flagged in its own maturity_note as
// "the position needing the closest early oversight of the four" (fully
// authored, never Phase-7-validated), so this pilot deliberately exercises
// BOTH a clean assignment and a no-coverage failure case, not just the
// happy path, to prove the module fails safe (routes to human triage)
// rather than guessing. Reuses the HM-S4 item 2 position-scope machinery.
// Proves, against the real running pipeline:
//   1. An Ops Coordinator hire with position_id "ops_coordinator" can be
//      assigned its own in-scope Class B skill, OPO-09, via the
//      position-scope check added in item 2.
//   2. The REAL OPO-09 assignment logic (not a stub) correctly picks the
//      least-loaded of two eligible queues for a real task, AND correctly
//      routes an unsupported task type to the unassigned queue for human
//      triage rather than guessing a queue.
//   3. Both structured results round-trip unchanged through output_payload,
//      output review, and client-delivery-draft, and OPO-09 is Class B, so
//      no Class A approval gate applies -- ordinary review alone must
//      suffice, and the delivery draft must still never carry final-issue
//      authority.

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-hm-s4-item5-"));
const apiPort = 3155;
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

async function openRealProject(firm, h, label) {
  const enquiry = await post("/front-desk/enquiries", { tenant_id: firm.tenant_id, firm_id: firm.id, contact_name: `${label} Contact`, organization_name: `${label} Sdn Bhd`, contact_email: `client@${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.example`, enquiry_summary: "Operations task routing support.", requested_service_hint: "Ops Coordination" }, h);
  await post("/front-desk/enquiries/qualify", { tenant_id: firm.tenant_id, firm_id: firm.id, enquiry_id: enquiry.id, decision: "QUALIFIED", consent_or_legal_basis_ref: `${label}-CONSENT`, conflict_check_status: "CLEARED", conflict_check_ref: `${label}-CONFLICT-CLEARED` }, h);
  const handoff = await post("/front-desk/enquiries/handoff", { tenant_id: firm.tenant_id, firm_id: firm.id, enquiry_id: enquiry.id, provided_inputs: {} }, h);
  const intake = await post("/intake-sessions", { tenant_id: firm.tenant_id, firm_id: firm.id, relationship_id: handoff.relationship.id, provided_inputs: { engagement_summary: "Task and capacity routing retainer" } }, h);
  const proposal = await post("/proposals", { tenant_id: firm.tenant_id, firm_id: firm.id, relationship_id: handoff.relationship.id, intake_session_id: intake.intake.id, scope_summary: "Task and capacity routing package", final_price: 300 }, h);
  const approvedProposal = await post("/proposals/approve", { tenant_id: firm.tenant_id, firm_id: firm.id, proposal_id: proposal.proposal.id }, h);
  const projectOpen = await post("/proposals/accept", { tenant_id: firm.tenant_id, firm_id: firm.id, proposal_id: approvedProposal.proposal.id, project_name: `${label} Retainer` }, h);
  assert.equal(projectOpen.project.project_state, "OPEN");
  return projectOpen;
}

async function runOpo09Pilot(firm, h, staffCode, label, assignmentInput, expectedStatus, expectedQueue) {
  const project = await openRealProject(firm, h, label);

  const assign = await post("/awia/virtual-staff/assign-task", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: staffCode, task_id: project.task.id, action: "workload.assignment.prepare", tool: "workload.assignment.prepare", skill_id: "OPO-09", client_id: project.project.relationship_id, project_id: project.project.id, evidence_refs: [`hm-s4-item5-evidence-${label}`] }, h);
  assert.equal(assign.workdesk_item.workdesk_status, "ASSIGNED");
  assert.equal(assign.workdesk_item.position_id, "ops_coordinator");
  assert.equal(assign.workdesk_item.skill_id, "OPO-09");
  assert.equal(assign.workdesk_item.class_a_approval_required, false, "OPO-09 is Class B; must not require Class A approval.");

  // The REAL OPO-09 execution: run the actual deterministic assignment logic.
  const assignmentResult = assignTaskToCapacity(assignmentInput);
  const validation = validateOpo09AssignmentOutput(assignmentResult);
  assert.equal(validation.ok, true, `Assignment output failed self-validation: ${JSON.stringify(validation.findings)}`);
  assert.equal(assignmentResult.capacity_status, expectedStatus, `Expected ${label} to resolve to status ${expectedStatus}, got ${assignmentResult.capacity_status}`);
  assert.equal(assignmentResult.assigned_queue_id, expectedQueue, `Expected ${label} to be routed to ${expectedQueue}, got ${assignmentResult.assigned_queue_id}`);

  const draft = await post("/awia/virtual-staff/output-draft", { tenant_id: firm.tenant_id, firm_id: firm.id, workdesk_item_id: assign.workdesk_item.id, output_title: `OPO-09 assignment result -- ${label}`, output_summary: assignmentResult.rationale, output_payload: assignmentResult }, h);
  assert.equal(draft.output_draft.status, "DRAFT_REVIEW_REQUIRED");
  assert.equal(draft.output_draft.final_issue_allowed, false, "Draft output must never carry final issue authority.");
  assert.equal(draft.output_draft.class_a_approval_required, false, "OPO-09 is Class B; the output draft must not require Class A approval.");
  assert.deepEqual(draft.output_draft.output_payload, assignmentResult, "The real assignment result must round-trip through output_payload unchanged.");

  const review = await post("/awia/virtual-staff/output-review", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: draft.output_draft.id, review_decision: "APPROVED_FOR_CLIENT_DRAFT", review_notes: `Assignment reviewed for ${label}; routed to ${assignmentResult.assigned_queue_id}, status ${assignmentResult.capacity_status}.` }, h);
  assert.equal(review.output_review.review_decision, "APPROVED_FOR_CLIENT_DRAFT");

  const clientDraft = await post("/awia/virtual-staff/client-delivery-draft", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: draft.output_draft.id, client_id: project.project.relationship_id }, h);
  assert.equal(clientDraft.client_delivery_draft.final_issue_allowed, false, "Client delivery draft must never carry final issue authority.");

  return { assignmentResult, output_draft_id: draft.output_draft.id, client_delivery_draft_id: clientDraft.client_delivery_draft.id };
}

try {
  start("api", ["apps/api/src/server.mjs"], { VFIRM_API_PORT: String(apiPort), VFIRM_STORE_PATH: storePath, DATABASE_URL: "", VFIRM_STORE_BACKEND: "json" });
  await waitForJson(`${apiBase}/health`);

  const tenant = await post("/tenants", { name: "HM-S4 Item 5 Ops Coordinator Pilot Tenant" });
  const seed = await post("/firms", { tenant_id: tenant.id, name: "HM-S4 Item 5 Pilot Sdn Bhd", principal_name: "HM-S4 Item 5 Pilot Owner" });
  const firm = seed.firm;
  const ownerActorId = seed.principal_actor.id;
  const h = authHeaders(ownerActorId, firm);
  await post("/ops/awia-package-assignment", { tenant_id: firm.tenant_id, firm_id: firm.id, package_code: "HIRE_ME" }, h);

  const opsCoordinatorHired = await post("/awia/virtual-staff/hire-worker", { tenant_id: firm.tenant_id, firm_id: firm.id, role_code: "OPO", display_name: "Ops Coordinator", position_id: "ops_coordinator" }, h);
  const staffCode = opsCoordinatorHired.staff_code;
  await post("/awia/virtual-staff/lifecycle", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: staffCode, to_state: "ACTIVE" }, h);

  // Not a single fixed case: one task that resolves cleanly to the
  // least-loaded of two eligible queues, one that has no matching queue at
  // all and must fail safe to the unassigned queue -- proving OPO's own
  // flagged immaturity is handled by explicit human-triage routing, not by
  // guessing.
  const assigned = await runOpo09Pilot(
    firm, h, staffCode, "DesignReviewProject",
    { task_type: "design_review", urgent: true, queues: [{ queue_id: "design-queue-a", skill_tags: ["design_review"], capacity_remaining: 2 }, { queue_id: "design-queue-b", skill_tags: ["design_review"], capacity_remaining: 5 }] },
    "ASSIGNED", "design-queue-b"
  );
  const unassigned = await runOpo09Pilot(
    firm, h, staffCode, "CustomsClearanceProject",
    { task_type: "customs_clearance", urgent: false, queues: [{ queue_id: "field-queue-a", skill_tags: ["site_inspection"], capacity_remaining: 4 }] },
    "NO_QUEUE_FOR_TASK_TYPE", "UNASSIGNED_QUEUE"
  );

  console.log(JSON.stringify({
    smoke: "hm-s4-item5-opo09-ops-coordinator-pilot",
    result: "passed",
    firm: firm.name,
    staff_code: staffCode,
    position_id: "ops_coordinator",
    skill_id: "OPO-09",
    assigned_case: { capacity_status: assigned.assignmentResult.capacity_status, assigned_queue_id: assigned.assignmentResult.assigned_queue_id, output_draft_id: assigned.output_draft_id, client_delivery_draft_id: assigned.client_delivery_draft_id },
    unassigned_case: { capacity_status: unassigned.assignmentResult.capacity_status, assigned_queue_id: unassigned.assignmentResult.assigned_queue_id, output_draft_id: unassigned.output_draft_id, client_delivery_draft_id: unassigned.client_delivery_draft_id },
    boundary: "deterministic_assignment_only_no_autonomous_dispatch_or_capacity_commitment"
  }, null, 2));
} finally {
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill();
  }
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await rm(tmp, { recursive: true, force: true });
}
