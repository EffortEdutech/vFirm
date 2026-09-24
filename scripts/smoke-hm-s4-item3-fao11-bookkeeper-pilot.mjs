import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { reconcileAccountEntries, validateFao11ReconciliationOutput } from "../packages/core-domain/src/awia-virtual-staff-fao11-account-reconciliation.mjs";

// HM-S4 item 3 (ADR-087 candidate continued): Bookkeeper (FAO) / FAO-11
// Account Reconciliation, end to end and real, not cosmetic -- mirrors the
// bar HM-S2 item 4 set for ARO-01 (scripts/smoke-awia-hm-s2-aro01-triage-pilot.mjs)
// and reuses the HM-S4 item 2 position-scope machinery (position_id at hire,
// skill_id at task assignment) rather than re-deriving it. Proves, against
// the real running pipeline:
//   1. A Bookkeeper hire with position_id "bookkeeper" can be assigned its
//      own in-scope Class B skill, FAO-11, via the position-scope check
//      added in item 2 -- no defaultToolPolicyByRole bypass needed beyond
//      the "accounts.reconciliation.prepare" entry added alongside this item.
//   2. The REAL FAO-11 reconciliation logic (not a stub) runs on a realistic
//      book-vs-bank entry set with a genuine mismatch and a genuine unmatched
//      entry, so the pilot proves the matcher's discrepancy-detection path,
//      not just its happy path.
//   3. That structured result round-trips unchanged through output_payload,
//      output review, and client-delivery-draft, and FAO-11 is Class B, so
//      no Class A approval gate applies here -- ordinary review alone must
//      suffice, and the delivery draft must still never carry final-issue
//      authority.

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-hm-s4-item3-"));
const apiPort = 3153;
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

try {
  start("api", ["apps/api/src/server.mjs"], { VFIRM_API_PORT: String(apiPort), VFIRM_STORE_PATH: storePath, DATABASE_URL: "", VFIRM_STORE_BACKEND: "json" });
  await waitForJson(`${apiBase}/health`);

  const tenant = await post("/tenants", { name: "HM-S4 Item 3 Bookkeeper Pilot Tenant" });
  const seed = await post("/firms", { tenant_id: tenant.id, name: "HM-S4 Item 3 Pilot Sdn Bhd", principal_name: "HM-S4 Item 3 Pilot Owner" });
  const firm = seed.firm;
  const ownerActorId = seed.principal_actor.id;
  const h = authHeaders(ownerActorId, firm);
  await post("/ops/awia-package-assignment", { tenant_id: firm.tenant_id, firm_id: firm.id, package_code: "HIRE_ME" }, h);

  const bookkeeperHired = await post("/awia/virtual-staff/hire-worker", { tenant_id: firm.tenant_id, firm_id: firm.id, role_code: "FAO", display_name: "Bookkeeper", position_id: "bookkeeper" }, h);
  const staffCode = bookkeeperHired.staff_code;
  await post("/awia/virtual-staff/lifecycle", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: staffCode, to_state: "ACTIVE" }, h);

  const enquiry = await post("/front-desk/enquiries", { tenant_id: firm.tenant_id, firm_id: firm.id, contact_name: "Bookkeeping Client Contact", organization_name: "Reconciliation Client Sdn Bhd", contact_email: "client@reconciliation-client.example", enquiry_summary: "Monthly bank reconciliation support.", requested_service_hint: "Bookkeeping" }, h);
  await post("/front-desk/enquiries/qualify", { tenant_id: firm.tenant_id, firm_id: firm.id, enquiry_id: enquiry.id, decision: "QUALIFIED", consent_or_legal_basis_ref: "BOOKKEEPER-CONSENT", conflict_check_status: "CLEARED", conflict_check_ref: "BOOKKEEPER-CONFLICT-CLEARED" }, h);
  const handoff = await post("/front-desk/enquiries/handoff", { tenant_id: firm.tenant_id, firm_id: firm.id, enquiry_id: enquiry.id, provided_inputs: {} }, h);
  const intake = await post("/intake-sessions", { tenant_id: firm.tenant_id, firm_id: firm.id, relationship_id: handoff.relationship.id, provided_inputs: { engagement_summary: "Monthly bank reconciliation" } }, h);
  const proposal = await post("/proposals", { tenant_id: firm.tenant_id, firm_id: firm.id, relationship_id: handoff.relationship.id, intake_session_id: intake.intake.id, scope_summary: "Monthly bank reconciliation package", final_price: 600 }, h);
  const approvedProposal = await post("/proposals/approve", { tenant_id: firm.tenant_id, firm_id: firm.id, proposal_id: proposal.proposal.id }, h);
  const projectOpen = await post("/proposals/accept", { tenant_id: firm.tenant_id, firm_id: firm.id, proposal_id: approvedProposal.proposal.id, project_name: "Bookkeeper Reconciliation Retainer" }, h);
  assert.equal(projectOpen.project.project_state, "OPEN");

  // FAO-11 is Class B: position scope authorizes it (item 2), and no
  // defaultToolPolicyByRole bypass is needed for the coarse gate here beyond
  // the "accounts.reconciliation.prepare" entry added alongside this item.
  const assign = await post("/awia/virtual-staff/assign-task", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: staffCode, task_id: projectOpen.task.id, action: "accounts.reconciliation.prepare", tool: "accounts.reconciliation.prepare", skill_id: "FAO-11", client_id: projectOpen.project.relationship_id, project_id: projectOpen.project.id, evidence_refs: ["hm-s4-item3-evidence"] }, h);
  assert.equal(assign.workdesk_item.workdesk_status, "ASSIGNED");
  assert.equal(assign.workdesk_item.position_id, "bookkeeper");
  assert.equal(assign.workdesk_item.skill_id, "FAO-11");
  assert.equal(assign.workdesk_item.class_a_approval_required, false, "FAO-11 is Class B; must not require Class A approval.");

  // The REAL FAO-11 execution: run the actual deterministic reconciliation
  // logic on a realistic book-vs-bank entry set that deliberately contains
  // one amount mismatch and one entry unmatched on each side -- not a
  // trivially-passing fixture.
  const reconciliationInput = {
    book_entries: [
      { entry_id: "book-101", date: "2026-09-01", amount: 1200, reference: "INV-5001" },
      { entry_id: "book-102", date: "2026-09-03", amount: 340.75, reference: "INV-5002" },
      { entry_id: "book-103", date: "2026-09-05", amount: 89, reference: "INV-5003" }
    ],
    bank_entries: [
      { entry_id: "bank-201", date: "2026-09-02", amount: 1200, reference: "INV-5001" },
      { entry_id: "bank-202", date: "2026-09-04", amount: 330, reference: "INV-5002" },
      { entry_id: "bank-203", date: "2026-09-06", amount: 45, reference: "INV-9999" }
    ]
  };
  const reconciliationResult = reconcileAccountEntries(reconciliationInput);
  const reconciliationValidation = validateFao11ReconciliationOutput(reconciliationResult);
  assert.equal(reconciliationValidation.ok, true, `Reconciliation output failed self-validation: ${JSON.stringify(reconciliationValidation.findings)}`);
  assert.equal(reconciliationResult.matched.length, 1, "Exactly one entry (INV-5001) should match cleanly.");
  assert.equal(reconciliationResult.mismatches.length, 1, "INV-5002 should be flagged as an amount mismatch.");
  assert.equal(reconciliationResult.mismatches[0].reference, "INV-5002");
  assert.equal(reconciliationResult.unmatched_book_entries.length, 1, "INV-5003 has no bank counterpart.");
  assert.equal(reconciliationResult.unmatched_bank_entries.length, 1, "The bank-side INV-9999 has no book counterpart.");
  assert.equal(reconciliationResult.reconciled, false, "A set with a mismatch and unmatched entries on both sides must not be marked reconciled.");

  // Carry the real reconciliation result through the output-draft/review
  // pipeline via the generic output_payload field (same mechanism HM-S2
  // item 2 established for ARO-01).
  const draft = await post("/awia/virtual-staff/output-draft", { tenant_id: firm.tenant_id, firm_id: firm.id, workdesk_item_id: assign.workdesk_item.id, output_title: "FAO-11 reconciliation result", output_summary: reconciliationResult.rationale, output_payload: reconciliationResult }, h);
  assert.equal(draft.output_draft.status, "DRAFT_REVIEW_REQUIRED");
  assert.equal(draft.output_draft.final_issue_allowed, false, "Draft output must never carry final issue authority.");
  assert.equal(draft.output_draft.class_a_approval_required, false, "FAO-11 is Class B; the output draft must not require Class A approval.");
  assert.deepEqual(draft.output_draft.output_payload, reconciliationResult, "The real reconciliation result must round-trip through output_payload unchanged.");

  // Class B: ordinary human review alone must be sufficient -- no Class A
  // approval endpoint involved, unlike the HR Administrator/ARO-10 pilot.
  const review = await post("/awia/virtual-staff/output-review", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: draft.output_draft.id, review_decision: "APPROVED_FOR_CLIENT_DRAFT", review_notes: "Reconciliation discrepancies reviewed; client to be informed of the two open items before month-end close." }, h);
  assert.equal(review.output_review.review_decision, "APPROVED_FOR_CLIENT_DRAFT");

  const clientDraft = await post("/awia/virtual-staff/client-delivery-draft", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: draft.output_draft.id, client_id: projectOpen.project.relationship_id }, h);
  assert.equal(clientDraft.client_delivery_draft.final_issue_allowed, false, "Client delivery draft must never carry final issue authority.");

  console.log(JSON.stringify({
    smoke: "hm-s4-item3-fao11-bookkeeper-pilot",
    result: "passed",
    firm: firm.name,
    staff_code: staffCode,
    position_id: "bookkeeper",
    skill_id: "FAO-11",
    reconciled: reconciliationResult.reconciled,
    matched_count: reconciliationResult.matched.length,
    mismatch_count: reconciliationResult.mismatches.length,
    unmatched_book_count: reconciliationResult.unmatched_book_entries.length,
    unmatched_bank_count: reconciliationResult.unmatched_bank_entries.length,
    output_draft_id: draft.output_draft.id,
    client_delivery_draft_id: clientDraft.client_delivery_draft.id,
    boundary: "deterministic_matching_only_no_autonomous_posting_or_adjustment"
  }, null, 2));
} finally {
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill();
  }
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await rm(tmp, { recursive: true, force: true });
}
