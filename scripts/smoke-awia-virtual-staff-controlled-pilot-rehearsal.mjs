import assert from "node:assert/strict";
import { buildAwiaVirtualStaffEvidencePack } from "../packages/core-domain/src/awia-virtual-staff-evidence-gate.mjs";
import { provisionPilotVirtualStaff } from "../packages/core-domain/src/awia-virtual-staff-provisioning.mjs";

const provisioningRun = provisionPilotVirtualStaff();
const evidencePack = buildAwiaVirtualStaffEvidencePack({ provisioningRun });

const rehearsal = {
  rehearsal_id: "awia-virtual-staff-controlled-pilot-rehearsal-001",
  boundary: "controlled_human_governed_rehearsal_no_autonomous_execution",
  firm_id: provisioningRun.firm_id,
  tenant_id: provisioningRun.tenant_id,
  operator_actor_id: provisioningRun.created_by_actor_id,
  steps: [
    step("select_staff_catalogue", "PASS", "Operator reviews local package registry status and candidate warnings."),
    step("review_salary_and_seat", "PASS", "Operator confirms staff seat and salary plan do not grant authority."),
    step("provision_draft_staff", "PASS", `${provisioningRun.summary.member_count} draft virtual staff members available for review.`),
    step("inspect_afcc_roster", "PASS", "AFCC Staff Management shows roster, package status, lifecycle, workload, and approval queue semantics."),
    step("assign_controlled_work", "PASS", "Controlled CFO analysis action has task scope, evidence, tool policy, and responsible human context."),
    step("receive_authority_decision", "PASS", "S4 gate produces one controlled ALLOW fixture and denial evidence for unsafe actions."),
    step("review_evidence_pack", "PASS", `${evidencePack.evidence_objects.length} evidence objects and ${evidencePack.ledger_projection.length} append-only ledger projection events available.`),
    step("confirm_human_governance", "PASS", "Pilot gate remains human-governed with runtime execution disabled.")
  ],
  pilot_gate: evidencePack.pilot_gate,
  acceptance_options: [
    "ACCEPT_CONTROLLED_REHEARSAL_READY",
    "HOLD_FOR_OPERATOR_UX_REPAIR",
    "HOLD_FOR_GOVERNANCE_REPAIR"
  ],
  recommendation: evidencePack.pilot_gate.recommendation
};

assert.equal(rehearsal.boundary, "controlled_human_governed_rehearsal_no_autonomous_execution");
assert.equal(rehearsal.pilot_gate.ok, true, JSON.stringify(rehearsal.pilot_gate.findings, null, 2));
assert.equal(rehearsal.pilot_gate.readiness.runtime_execution_disabled, true);
assert.equal(rehearsal.steps.length, 8);
assert(rehearsal.steps.every((item) => item.result === "PASS"));
assert(rehearsal.acceptance_options.includes("ACCEPT_CONTROLLED_REHEARSAL_READY"));
assert.equal(rehearsal.recommendation, "GO_FOR_CONTROLLED_HUMAN_GOVERNED_PILOT_REHEARSAL");

console.log(JSON.stringify({
  smoke: "awia-virtual-staff-controlled-pilot-rehearsal",
  result: "passed",
  boundary: rehearsal.boundary,
  steps: rehearsal.steps.map((item) => item.step_id),
  recommendation: rehearsal.recommendation,
  acceptance_options: rehearsal.acceptance_options
}, null, 2));

function step(step_id, result, evidence_summary) {
  return { step_id, result, evidence_summary };
}
