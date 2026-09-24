import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { prepareOnboardingChecklist, validateAro10OnboardingOutput } from "../packages/core-domain/src/awia-virtual-staff-aro10-employee-onboarding-administration.mjs";

// HM-S4 item 6 (ADR-087 candidate continued): HR Administrator (ARO) /
// ARO-10 Employee Onboarding Administration, end to end and real -- the
// first pilot to route through item 2's live Class-A approval gate with a
// real skill module behind it, not the placeholder output_payload item 2
// used to prove the gate's wiring in isolation. Proves, against the real
// running pipeline:
//   1. An HR Administrator hire with position_id "hr_administrator" can be
//      assigned its own in-scope Class A skill, ARO-10, via the
//      position-scope check added in item 2.
//   2. The REAL ARO-10 onboarding-checklist logic (not a stub) correctly
//      flags a documents-outstanding case AND a fully-ready case -- not
//      just the happy path -- and never carries the new hire's name or
//      any document contents in its output (PII-safe by construction).
//   3. Ordinary human review is DENIED before the Class A approval is
//      granted (CLASS_A_APPROVAL_REQUIRED_BEFORE_CLIENT_DRAFT) -- denial
//      without approval, exactly as item 6 requires.
//   4. Once a real, distinct firm-owner approval is granted via
//      /awia/virtual-staff/output-class-a-approval, ordinary review then
//      SUCCEEDS and a client delivery draft is produced -- success after
//      approval, exactly as item 6 requires -- still with no final-issue
//      authority.

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-hm-s4-item6-"));
const apiPort = 3156;
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
  const enquiry = await post("/front-desk/enquiries", { tenant_id: firm.tenant_id, firm_id: firm.id, contact_name: `${label} Contact`, organization_name: `${label} Sdn Bhd`, contact_email: `client@${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.example`, enquiry_summary: "Employee onboarding administration support.", requested_service_hint: "HR Administration" }, h);
  await post("/front-desk/enquiries/qualify", { tenant_id: firm.tenant_id, firm_id: firm.id, enquiry_id: enquiry.id, decision: "QUALIFIED", consent_or_legal_basis_ref: `${label}-CONSENT`, conflict_check_status: "CLEARED", conflict_check_ref: `${label}-CONFLICT-CLEARED` }, h);
  const handoff = await post("/front-desk/enquiries/handoff", { tenant_id: firm.tenant_id, firm_id: firm.id, enquiry_id: enquiry.id, provided_inputs: {} }, h);
  const intake = await post("/intake-sessions", { tenant_id: firm.tenant_id, firm_id: firm.id, relationship_id: handoff.relationship.id, provided_inputs: { engagement_summary: "Employee onboarding administration retainer" } }, h);
  const proposal = await post("/proposals", { tenant_id: firm.tenant_id, firm_id: firm.id, relationship_id: handoff.relationship.id, intake_session_id: intake.intake.id, scope_summary: "Employee onboarding administration package", final_price: 350 }, h);
  const approvedProposal = await post("/proposals/approve", { tenant_id: firm.tenant_id, firm_id: firm.id, proposal_id: proposal.proposal.id }, h);
  const projectOpen = await post("/proposals/accept", { tenant_id: firm.tenant_id, firm_id: firm.id, proposal_id: approvedProposal.proposal.id, project_name: `${label} Retainer` }, h);
  assert.equal(projectOpen.project.project_state, "OPEN");
  return projectOpen;
}

try {
  start("api", ["apps/api/src/server.mjs"], { VFIRM_API_PORT: String(apiPort), VFIRM_STORE_PATH: storePath, DATABASE_URL: "", VFIRM_STORE_BACKEND: "json" });
  await waitForJson(`${apiBase}/health`);

  const tenant = await post("/tenants", { name: "HM-S4 Item 6 HR Administrator Pilot Tenant" });
  const seed = await post("/firms", { tenant_id: tenant.id, name: "HM-S4 Item 6 Pilot Sdn Bhd", principal_name: "HM-S4 Item 6 Pilot Owner" });
  const firm = seed.firm;
  const ownerActorId = seed.principal_actor.id;
  const h = authHeaders(ownerActorId, firm);
  await post("/ops/awia-package-assignment", { tenant_id: firm.tenant_id, firm_id: firm.id, package_code: "HIRE_ME" }, h);

  const hrHired = await post("/awia/virtual-staff/hire-worker", { tenant_id: firm.tenant_id, firm_id: firm.id, role_code: "ARO", display_name: "HR Administrator", position_id: "hr_administrator" }, h);
  const staffCode = hrHired.staff_code;
  await post("/awia/virtual-staff/lifecycle", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: staffCode, to_state: "ACTIVE" }, h);

  // --- Case A: documents outstanding, denial before approval, success after ---
  const projectA = await openRealProject(firm, h, "NewHireDocsOutstanding");
  const assignA = await post("/awia/virtual-staff/assign-task", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: staffCode, task_id: projectA.task.id, action: "administration.employee.onboarding", tool: "administration.employee.onboarding", skill_id: "ARO-10", client_id: projectA.project.relationship_id, project_id: projectA.project.id, evidence_refs: ["hm-s4-item6-evidence-docs-outstanding"] }, h);
  assert.equal(assignA.workdesk_item.workdesk_status, "ASSIGNED");
  assert.equal(assignA.workdesk_item.position_id, "hr_administrator");
  assert.equal(assignA.workdesk_item.skill_id, "ARO-10");
  assert.equal(assignA.workdesk_item.class_a_approval_required, true, "ARO-10 is Class A; must require Class A approval.");

  // The REAL ARO-10 execution: no name, no document contents -- only which
  // named checklist items are present.
  const checklistA = prepareOnboardingChecklist({ new_hire_role: "Bookkeeper", start_date: "2026-10-01", documents_received: ["employment_contract_signed", "identity_document_verified"], responsible_administrator_id: "admin-001", hiring_manager_id: "owner-001" });
  const validationA = validateAro10OnboardingOutput(checklistA);
  assert.equal(validationA.ok, true, `Checklist output failed self-validation: ${JSON.stringify(validationA.findings)}`);
  assert.equal(checklistA.status, "DOCUMENTS_OUTSTANDING", `Expected documents-outstanding case to resolve to DOCUMENTS_OUTSTANDING, got ${checklistA.status}`);
  assert.equal(checklistA.missing_documents.length, 3);
  assert.equal(checklistA.sod_conflict, false);
  assert.equal("new_hire_name" in checklistA, false, "The onboarding checklist output must never carry the new hire's name.");

  const draftA = await post("/awia/virtual-staff/output-draft", { tenant_id: firm.tenant_id, firm_id: firm.id, workdesk_item_id: assignA.workdesk_item.id, output_title: "ARO-10 onboarding checklist -- documents outstanding", output_summary: checklistA.rationale, output_payload: checklistA }, h);
  assert.equal(draftA.output_draft.class_a_approval_required, true);
  assert.equal(draftA.output_draft.class_a_approval_status, "PENDING");
  assert.deepEqual(draftA.output_draft.output_payload, checklistA, "The real onboarding checklist must round-trip through output_payload unchanged.");

  // Denial without approval.
  const blockedReviewA = await postExpectFail("/awia/virtual-staff/output-review", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: draftA.output_draft.id, review_decision: "APPROVED_FOR_CLIENT_DRAFT", review_notes: "Checklist looks correct." }, h);
  assert.match(JSON.stringify(blockedReviewA), /CLASS_A_APPROVAL_REQUIRED_BEFORE_CLIENT_DRAFT/, "Ordinary review must be denied before Class A approval is granted.");

  // Success after approval.
  const decidedA = await post("/awia/virtual-staff/output-class-a-approval", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: draftA.output_draft.id }, h);
  assert.equal(decidedA.decision, "ALLOW", `Expected a real, distinct firm-owner approval to be granted: ${JSON.stringify(decidedA.findings)}`);
  assert.equal(decidedA.output_draft.class_a_approval_status, "APPROVED");

  const reviewA = await post("/awia/virtual-staff/output-review", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: draftA.output_draft.id, review_decision: "APPROVED_FOR_CLIENT_DRAFT", review_notes: "Class A approval confirmed; documents-outstanding checklist correct." }, h);
  assert.equal(reviewA.output_review.review_decision, "APPROVED_FOR_CLIENT_DRAFT", "Ordinary review must succeed once Class A approval is granted.");

  const clientDraftA = await post("/awia/virtual-staff/client-delivery-draft", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: draftA.output_draft.id, client_id: projectA.project.relationship_id }, h);
  assert.equal(clientDraftA.client_delivery_draft.final_issue_allowed, false, "Client delivery draft must never carry final issue authority, Class A or otherwise.");

  // --- Case B: fully ready to onboard -- proves branching, not one fixed case ---
  const projectB = await openRealProject(firm, h, "NewHireReadyToOnboard");
  const assignB = await post("/awia/virtual-staff/assign-task", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: staffCode, task_id: projectB.task.id, action: "administration.employee.onboarding", tool: "administration.employee.onboarding", skill_id: "ARO-10", client_id: projectB.project.relationship_id, project_id: projectB.project.id, evidence_refs: ["hm-s4-item6-evidence-ready"] }, h);
  assert.equal(assignB.workdesk_item.class_a_approval_required, true);

  const checklistB = prepareOnboardingChecklist({ new_hire_role: "Sales Coordinator", start_date: "2026-10-20", documents_received: ["employment_contract_signed", "identity_document_verified", "bank_details_provided", "tax_form_submitted", "emergency_contact_provided"], responsible_administrator_id: "admin-001", hiring_manager_id: "owner-001" });
  const validationB = validateAro10OnboardingOutput(checklistB);
  assert.equal(validationB.ok, true, `Checklist output failed self-validation: ${JSON.stringify(validationB.findings)}`);
  assert.equal(checklistB.status, "READY_TO_ONBOARD", `Expected the fully-documented case to resolve to READY_TO_ONBOARD, got ${checklistB.status}`);
  assert.equal(checklistB.missing_documents.length, 0);

  const draftB = await post("/awia/virtual-staff/output-draft", { tenant_id: firm.tenant_id, firm_id: firm.id, workdesk_item_id: assignB.workdesk_item.id, output_title: "ARO-10 onboarding checklist -- ready to onboard", output_summary: checklistB.rationale, output_payload: checklistB }, h);
  assert.equal(draftB.output_draft.class_a_approval_status, "PENDING");

  const blockedReviewB = await postExpectFail("/awia/virtual-staff/output-review", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: draftB.output_draft.id, review_decision: "APPROVED_FOR_CLIENT_DRAFT", review_notes: "Looks ready." }, h);
  assert.match(JSON.stringify(blockedReviewB), /CLASS_A_APPROVAL_REQUIRED_BEFORE_CLIENT_DRAFT/, "Ordinary review must be denied before Class A approval is granted, even for a fully-ready checklist.");

  const decidedB = await post("/awia/virtual-staff/output-class-a-approval", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: draftB.output_draft.id }, h);
  assert.equal(decidedB.decision, "ALLOW");

  const reviewB = await post("/awia/virtual-staff/output-review", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: draftB.output_draft.id, review_decision: "APPROVED_FOR_CLIENT_DRAFT", review_notes: "Class A approval confirmed; ready-to-onboard checklist correct." }, h);
  assert.equal(reviewB.output_review.review_decision, "APPROVED_FOR_CLIENT_DRAFT");

  const clientDraftB = await post("/awia/virtual-staff/client-delivery-draft", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: draftB.output_draft.id, client_id: projectB.project.relationship_id }, h);
  assert.equal(clientDraftB.client_delivery_draft.final_issue_allowed, false, "Client delivery draft must never carry final issue authority.");

  console.log(JSON.stringify({
    smoke: "hm-s4-item6-aro10-hr-administrator-pilot",
    result: "passed",
    firm: firm.name,
    staff_code: staffCode,
    position_id: "hr_administrator",
    skill_id: "ARO-10",
    docs_outstanding_case: { status: checklistA.status, missing_documents_count: checklistA.missing_documents.length, denied_before_approval: "CLASS_A_APPROVAL_REQUIRED_BEFORE_CLIENT_DRAFT", approved_after: decidedA.decision, output_draft_id: draftA.output_draft.id, client_delivery_draft_id: clientDraftA.client_delivery_draft.id },
    ready_to_onboard_case: { status: checklistB.status, missing_documents_count: checklistB.missing_documents.length, denied_before_approval: "CLASS_A_APPROVAL_REQUIRED_BEFORE_CLIENT_DRAFT", approved_after: decidedB.decision, output_draft_id: draftB.output_draft.id, client_delivery_draft_id: clientDraftB.client_delivery_draft.id },
    boundary: "deterministic_checklist_preparation_only_no_autonomous_hr_action_no_pii_disclosure"
  }, null, 2));
} finally {
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill();
  }
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await rm(tmp, { recursive: true, force: true });
}
