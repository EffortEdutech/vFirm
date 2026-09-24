import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

// HM-S4 item 2 (ADR-087 candidate): live wiring of evaluateClassAApprovalGate()
// (built HM-S1 item 5, deferred untested in HM-S2 item 3 because ARO-01 was
// Class B). This is the FIRST real end-to-end exercise of that gate, plus the
// prerequisite it exposed: a real position_id must exist at hire time, since
// role_code "ARO" alone cannot distinguish General Clerk (Class B only) from
// HR Administrator (Class A / PII). Proves, against the real pipeline, not a
// unit test in isolation:
//   1. Hiring with position_id is persisted and enforced -- a General Clerk
//      hire cannot be assigned an HR Administrator-only skill (ARO-10), even
//      though both share role_code ARO.
//   2. A General Clerk CAN still be assigned its own in-scope skill
//      (ARO-01) -- the new position-scope check is additive, not a
//      regression on HM-S2's already-working path.
//   3. An HR Administrator hire CAN be assigned ARO-10, and the resulting
//      output draft is correctly marked class_a_approval_required.
//   4. Ordinary human review cannot push a Class A output to
//      APPROVED_FOR_CLIENT_DRAFT before the Class A approval gate fires.
//   5. The new POST /awia/virtual-staff/output-class-a-approval endpoint
//      grants approval for a real, distinct preparer/approver pair, and only
//      then does the ordinary review's APPROVED_FOR_CLIENT_DRAFT succeed.

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-hm-s4-item2-"));
const apiPort = 3152;
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

async function postExpectFail(path, body, headers = {}) {
  const { response, json } = await request(path, { method: "POST", body, headers });
  if (response.ok && json.ok !== false) {
    throw new Error(`${path} was expected to fail but succeeded: ${JSON.stringify(json)}`);
  }
  return json;
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
  const enquiry = await post("/front-desk/enquiries", { tenant_id: firm.tenant_id, firm_id: firm.id, contact_name: `${label} Contact`, organization_name: `${label} Sdn Bhd`, contact_email: `client@${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.example`, enquiry_summary: "Ongoing administrative support retainer.", requested_service_hint: "Administrative Support" }, h);
  await post("/front-desk/enquiries/qualify", { tenant_id: firm.tenant_id, firm_id: firm.id, enquiry_id: enquiry.id, decision: "QUALIFIED", consent_or_legal_basis_ref: `${label}-CONSENT`, conflict_check_status: "CLEARED", conflict_check_ref: `${label}-CONFLICT-CLEARED` }, h);
  const handoff = await post("/front-desk/enquiries/handoff", { tenant_id: firm.tenant_id, firm_id: firm.id, enquiry_id: enquiry.id, provided_inputs: {} }, h);
  const intake = await post("/intake-sessions", { tenant_id: firm.tenant_id, firm_id: firm.id, relationship_id: handoff.relationship.id, provided_inputs: { engagement_summary: "Administrative support retainer" } }, h);
  const proposal = await post("/proposals", { tenant_id: firm.tenant_id, firm_id: firm.id, relationship_id: handoff.relationship.id, intake_session_id: intake.intake.id, scope_summary: "Administrative support retainer package", final_price: 400 }, h);
  const approvedProposal = await post("/proposals/approve", { tenant_id: firm.tenant_id, firm_id: firm.id, proposal_id: proposal.proposal.id }, h);
  const projectOpen = await post("/proposals/accept", { tenant_id: firm.tenant_id, firm_id: firm.id, proposal_id: approvedProposal.proposal.id, project_name: `${label} Retainer` }, h);
  assert.equal(projectOpen.project.project_state, "OPEN");
  return projectOpen;
}

try {
  start("api", ["apps/api/src/server.mjs"], { VFIRM_API_PORT: String(apiPort), VFIRM_STORE_PATH: storePath, DATABASE_URL: "", VFIRM_STORE_BACKEND: "json" });
  await waitForJson(`${apiBase}/health`);

  const tenant = await post("/tenants", { name: "HM-S4 Item 2 Class-A Gate Pilot Tenant" });
  const seed = await post("/firms", { tenant_id: tenant.id, name: "HM-S4 Item 2 Pilot Sdn Bhd", principal_name: "HM-S4 Pilot Owner" });
  const firm = seed.firm;
  const ownerActorId = seed.principal_actor.id;
  const h = authHeaders(ownerActorId, firm);
  await post("/ops/awia-package-assignment", { tenant_id: firm.tenant_id, firm_id: firm.id, package_code: "HIRE_ME" }, h);

  // --- 1 & 2: General Clerk hire, position_id persisted and enforced ---
  const clerkHired = await post("/awia/virtual-staff/hire-worker", { tenant_id: firm.tenant_id, firm_id: firm.id, role_code: "ARO", display_name: "General Clerk", position_id: "general_clerk" }, h);
  const clerkStaffCode = clerkHired.staff_code;
  await post("/awia/virtual-staff/lifecycle", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: clerkStaffCode, to_state: "ACTIVE" }, h);
  const clerkProject = await openRealProject(firm, h, "GeneralClerkProject");

  // General Clerk assigned its OWN in-scope Class B skill: must still work
  // (no regression on HM-S2's already-proven path).
  const clerkOwnSkillAssign = await post("/awia/virtual-staff/assign-task", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: clerkStaffCode, task_id: clerkProject.task.id, action: "administration.request.triage", tool: "administration.request.triage", skill_id: "ARO-01", client_id: clerkProject.project.relationship_id, project_id: clerkProject.project.id, evidence_refs: ["hm-s4-item2-evidence"] }, h);
  assert.equal(clerkOwnSkillAssign.workdesk_item.workdesk_status, "ASSIGNED");
  assert.equal(clerkOwnSkillAssign.workdesk_item.class_a_approval_required, false, "ARO-01 is Class B; must not require Class A approval.");

  // General Clerk assigned an HR-Administrator-only Class A skill: must be
  // DENIED by position scope, even though both hires share role_code ARO.
  const clerkOutOfScopeProject = await openRealProject(firm, h, "GeneralClerkOutOfScopeProject");
  const clerkOutOfScope = await postExpectFail("/awia/virtual-staff/assign-task", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: clerkStaffCode, task_id: clerkOutOfScopeProject.task.id, action: "administration.employee.onboarding", tool: "administration.employee.onboarding", skill_id: "ARO-10", client_id: clerkOutOfScopeProject.project.relationship_id, project_id: clerkOutOfScopeProject.project.id, evidence_refs: ["hm-s4-item2-evidence"] }, h);
  assert.match(JSON.stringify(clerkOutOfScope), /SKILL_NOT_IN_POSITION_SCOPE/, "A General Clerk must be denied an HR Administrator-only skill by position scope.");

  // --- 3: HR Administrator hire, ARO-10 assignment, Class A flag set ---
  const hrHired = await post("/awia/virtual-staff/hire-worker", { tenant_id: firm.tenant_id, firm_id: firm.id, role_code: "ARO", display_name: "HR Administrator", position_id: "hr_administrator" }, h);
  const hrStaffCode = hrHired.staff_code;
  await post("/awia/virtual-staff/lifecycle", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: hrStaffCode, to_state: "ACTIVE" }, h);
  const hrProject = await openRealProject(firm, h, "HrAdministratorProject");

  const hrAssign = await post("/awia/virtual-staff/assign-task", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: hrStaffCode, task_id: hrProject.task.id, action: "administration.employee.onboarding", tool: "administration.employee.onboarding", skill_id: "ARO-10", client_id: hrProject.project.relationship_id, project_id: hrProject.project.id, evidence_refs: ["hm-s4-item2-evidence"] }, h);
  assert.equal(hrAssign.workdesk_item.workdesk_status, "ASSIGNED");
  assert.equal(hrAssign.workdesk_item.position_id, "hr_administrator");
  assert.equal(hrAssign.workdesk_item.skill_id, "ARO-10");
  assert.equal(hrAssign.workdesk_item.class_a_approval_required, true, "ARO-10 is Class A; must require Class A approval.");

  const hrDraft = await post("/awia/virtual-staff/output-draft", { tenant_id: firm.tenant_id, firm_id: firm.id, workdesk_item_id: hrAssign.workdesk_item.id, output_title: "ARO-10 onboarding prepared", output_summary: "New-hire onboarding checklist prepared for firm-owner sign-off.", output_payload: { placeholder: "real ARO-10 execution logic is HM-S4 item 6, not this item" } }, h);
  assert.equal(hrDraft.output_draft.class_a_approval_required, true);
  assert.equal(hrDraft.output_draft.class_a_approval_status, "PENDING");

  // --- 4: ordinary review cannot approve-for-client-draft while pending ---
  const blockedReview = await postExpectFail("/awia/virtual-staff/output-review", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: hrDraft.output_draft.id, review_decision: "APPROVED_FOR_CLIENT_DRAFT", review_notes: "Looks fine." }, h);
  assert.match(JSON.stringify(blockedReview), /CLASS_A_APPROVAL_REQUIRED_BEFORE_CLIENT_DRAFT/, "Ordinary review must not bypass the pending Class A approval gate.");

  // --- 5: the Class A approval gate itself, live, real distinct actors ---
  const decided = await post("/awia/virtual-staff/output-class-a-approval", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: hrDraft.output_draft.id }, h);
  assert.equal(decided.decision, "ALLOW", `Expected a real, distinct firm-owner approval to be granted: ${JSON.stringify(decided.findings)}`);
  assert.equal(decided.output_draft.class_a_approval_status, "APPROVED");

  // A second approval attempt on an already-approved output must be refused.
  const doubleApprove = await postExpectFail("/awia/virtual-staff/output-class-a-approval", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: hrDraft.output_draft.id }, h);
  assert.match(JSON.stringify(doubleApprove), /already been granted/, "Re-approving an already-approved Class A output must be refused.");

  // --- 6: ordinary review now succeeds, delivery draft still not final ---
  const approvedReview = await post("/awia/virtual-staff/output-review", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: hrDraft.output_draft.id, review_decision: "APPROVED_FOR_CLIENT_DRAFT", review_notes: "Class A approval confirmed; onboarding checklist correct." }, h);
  assert.equal(approvedReview.output_review.review_decision, "APPROVED_FOR_CLIENT_DRAFT");

  const clientDraft = await post("/awia/virtual-staff/client-delivery-draft", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: hrDraft.output_draft.id, client_id: hrProject.project.relationship_id }, h);
  assert.equal(clientDraft.client_delivery_draft.final_issue_allowed, false, "Client delivery draft must never carry final issue authority, Class A or otherwise.");

  console.log(JSON.stringify({
    smoke: "hm-s4-item2-class-a-gate-wiring",
    result: "passed",
    firm: firm.name,
    general_clerk_staff_code: clerkStaffCode,
    general_clerk_own_skill_assign: "ALLOWED",
    general_clerk_out_of_scope_class_a_skill: "DENIED:SKILL_NOT_IN_POSITION_SCOPE",
    hr_administrator_staff_code: hrStaffCode,
    hr_administrator_skill: "ARO-10",
    class_a_approval_decision: decided.decision,
    output_draft_id: hrDraft.output_draft.id,
    client_delivery_draft_id: clientDraft.client_delivery_draft.id,
    boundary: "class_a_approval_routing_gate_only_no_execution_no_runtime_authority"
  }, null, 2));
} finally {
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill();
  }
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await rm(tmp, { recursive: true, force: true });
}
