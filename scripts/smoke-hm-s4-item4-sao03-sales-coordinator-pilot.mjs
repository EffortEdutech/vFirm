import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { qualifyAndScoreLead, validateSao03QualificationOutput } from "../packages/core-domain/src/awia-virtual-staff-sao03-lead-qualification-scoring.mjs";

// HM-S4 item 4 (ADR-087 candidate continued): Sales Coordinator (SAO) /
// SAO-03 Lead Qualification & Scoring, end to end and real, not cosmetic --
// same pattern as item 3 (scripts/smoke-hm-s4-item3-fao11-bookkeeper-pilot.mjs),
// which itself mirrors HM-S2 item 4's bar for ARO-01. Reuses the HM-S4 item 2
// position-scope machinery rather than re-deriving it. Proves, against the
// real running pipeline:
//   1. A Sales Coordinator hire with position_id "sales_coordinator" can be
//      assigned its own in-scope Class B skill, SAO-03, via the
//      position-scope check added in item 2.
//   2. The REAL SAO-03 scoring logic (not a stub) runs on two different
//      leads that land in two different tiers (HOT and COLD), so the pilot
//      proves the scorer's branching, not just a single fixed case.
//   3. That structured result round-trips unchanged through output_payload,
//      output review, and client-delivery-draft, and SAO-03 is Class B, so
//      no Class A approval gate applies -- ordinary review alone must
//      suffice, and the delivery draft must still never carry final-issue
//      authority.

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-hm-s4-item4-"));
const apiPort = 3154;
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
  const enquiry = await post("/front-desk/enquiries", { tenant_id: firm.tenant_id, firm_id: firm.id, contact_name: `${label} Contact`, organization_name: `${label} Sdn Bhd`, contact_email: `client@${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.example`, enquiry_summary: "Sales pipeline lead-qualification support.", requested_service_hint: "Sales Coordination" }, h);
  await post("/front-desk/enquiries/qualify", { tenant_id: firm.tenant_id, firm_id: firm.id, enquiry_id: enquiry.id, decision: "QUALIFIED", consent_or_legal_basis_ref: `${label}-CONSENT`, conflict_check_status: "CLEARED", conflict_check_ref: `${label}-CONFLICT-CLEARED` }, h);
  const handoff = await post("/front-desk/enquiries/handoff", { tenant_id: firm.tenant_id, firm_id: firm.id, enquiry_id: enquiry.id, provided_inputs: {} }, h);
  const intake = await post("/intake-sessions", { tenant_id: firm.tenant_id, firm_id: firm.id, relationship_id: handoff.relationship.id, provided_inputs: { engagement_summary: "Lead qualification retainer" } }, h);
  const proposal = await post("/proposals", { tenant_id: firm.tenant_id, firm_id: firm.id, relationship_id: handoff.relationship.id, intake_session_id: intake.intake.id, scope_summary: "Lead qualification and scoring package", final_price: 350 }, h);
  const approvedProposal = await post("/proposals/approve", { tenant_id: firm.tenant_id, firm_id: firm.id, proposal_id: proposal.proposal.id }, h);
  const projectOpen = await post("/proposals/accept", { tenant_id: firm.tenant_id, firm_id: firm.id, proposal_id: approvedProposal.proposal.id, project_name: `${label} Retainer` }, h);
  assert.equal(projectOpen.project.project_state, "OPEN");
  return projectOpen;
}

async function runSao03Pilot(firm, h, staffCode, label, leadInput, expectedTier) {
  const project = await openRealProject(firm, h, label);

  const assign = await post("/awia/virtual-staff/assign-task", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: staffCode, task_id: project.task.id, action: "sales.lead.qualify.prepare", tool: "sales.lead.qualify.prepare", skill_id: "SAO-03", client_id: project.project.relationship_id, project_id: project.project.id, evidence_refs: [`hm-s4-item4-evidence-${label}`] }, h);
  assert.equal(assign.workdesk_item.workdesk_status, "ASSIGNED");
  assert.equal(assign.workdesk_item.position_id, "sales_coordinator");
  assert.equal(assign.workdesk_item.skill_id, "SAO-03");
  assert.equal(assign.workdesk_item.class_a_approval_required, false, "SAO-03 is Class B; must not require Class A approval.");

  // The REAL SAO-03 execution: run the actual deterministic scoring logic.
  const qualificationResult = qualifyAndScoreLead(leadInput);
  const validation = validateSao03QualificationOutput(qualificationResult);
  assert.equal(validation.ok, true, `Qualification output failed self-validation: ${JSON.stringify(validation.findings)}`);
  assert.equal(qualificationResult.tier, expectedTier, `Expected ${label} to land in tier ${expectedTier}, got ${qualificationResult.tier}`);

  const draft = await post("/awia/virtual-staff/output-draft", { tenant_id: firm.tenant_id, firm_id: firm.id, workdesk_item_id: assign.workdesk_item.id, output_title: `SAO-03 qualification result -- ${label}`, output_summary: qualificationResult.rationale, output_payload: qualificationResult }, h);
  assert.equal(draft.output_draft.status, "DRAFT_REVIEW_REQUIRED");
  assert.equal(draft.output_draft.final_issue_allowed, false, "Draft output must never carry final issue authority.");
  assert.equal(draft.output_draft.class_a_approval_required, false, "SAO-03 is Class B; the output draft must not require Class A approval.");
  assert.deepEqual(draft.output_draft.output_payload, qualificationResult, "The real qualification result must round-trip through output_payload unchanged.");

  const review = await post("/awia/virtual-staff/output-review", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: draft.output_draft.id, review_decision: "APPROVED_FOR_CLIENT_DRAFT", review_notes: `Qualification reviewed for ${label}; tier ${qualificationResult.tier} confirmed.` }, h);
  assert.equal(review.output_review.review_decision, "APPROVED_FOR_CLIENT_DRAFT");

  const clientDraft = await post("/awia/virtual-staff/client-delivery-draft", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: draft.output_draft.id, client_id: project.project.relationship_id }, h);
  assert.equal(clientDraft.client_delivery_draft.final_issue_allowed, false, "Client delivery draft must never carry final issue authority.");

  return { qualificationResult, output_draft_id: draft.output_draft.id, client_delivery_draft_id: clientDraft.client_delivery_draft.id };
}

try {
  start("api", ["apps/api/src/server.mjs"], { VFIRM_API_PORT: String(apiPort), VFIRM_STORE_PATH: storePath, DATABASE_URL: "", VFIRM_STORE_BACKEND: "json" });
  await waitForJson(`${apiBase}/health`);

  const tenant = await post("/tenants", { name: "HM-S4 Item 4 Sales Coordinator Pilot Tenant" });
  const seed = await post("/firms", { tenant_id: tenant.id, name: "HM-S4 Item 4 Pilot Sdn Bhd", principal_name: "HM-S4 Item 4 Pilot Owner" });
  const firm = seed.firm;
  const ownerActorId = seed.principal_actor.id;
  const h = authHeaders(ownerActorId, firm);
  await post("/ops/awia-package-assignment", { tenant_id: firm.tenant_id, firm_id: firm.id, package_code: "HIRE_ME" }, h);

  const salesCoordinatorHired = await post("/awia/virtual-staff/hire-worker", { tenant_id: firm.tenant_id, firm_id: firm.id, role_code: "SAO", display_name: "Sales Coordinator", position_id: "sales_coordinator" }, h);
  const staffCode = salesCoordinatorHired.staff_code;
  await post("/awia/virtual-staff/lifecycle", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: staffCode, to_state: "ACTIVE" }, h);

  // Not a single fixed case: one lead that scores HOT, one that scores COLD,
  // proving the scorer's branching, not just its happy path.
  const hot = await runSao03Pilot(firm, h, staffCode, "HotLeadProject", { budget_confirmed: true, decision_maker_engaged: true, timeline_days: 10, industry_fit: "HIGH", company_size_employees: 200 }, "HOT");
  const cold = await runSao03Pilot(firm, h, staffCode, "ColdLeadProject", { budget_confirmed: false, decision_maker_engaged: false, timeline_days: 365, industry_fit: "LOW", company_size_employees: 3 }, "COLD");

  console.log(JSON.stringify({
    smoke: "hm-s4-item4-sao03-sales-coordinator-pilot",
    result: "passed",
    firm: firm.name,
    staff_code: staffCode,
    position_id: "sales_coordinator",
    skill_id: "SAO-03",
    hot_lead: { score: hot.qualificationResult.score, tier: hot.qualificationResult.tier, output_draft_id: hot.output_draft_id, client_delivery_draft_id: hot.client_delivery_draft_id },
    cold_lead: { score: cold.qualificationResult.score, tier: cold.qualificationResult.tier, output_draft_id: cold.output_draft_id, client_delivery_draft_id: cold.client_delivery_draft_id },
    boundary: "deterministic_scoring_only_no_autonomous_lead_disposition_or_crm_write"
  }, null, 2));
} finally {
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill();
  }
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await rm(tmp, { recursive: true, force: true });
}
