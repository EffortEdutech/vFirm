import assert from "node:assert/strict";
import {
  activateDraftStaffForAuthorityFixture,
  createRuntimeActionRequest,
  evaluateVirtualStaffRuntimeAction,
  runtimeGateBoundary
} from "../packages/core-domain/src/awia-virtual-staff-authority-gate.mjs";
import { provisionPilotVirtualStaff } from "../packages/core-domain/src/awia-virtual-staff-provisioning.mjs";

const draftRun = provisionPilotVirtualStaff();
const draftDenied = evaluateVirtualStaffRuntimeAction({ provisioningRun: draftRun });
expectDecision(draftDenied, "DENY", "STAFF_LIFECYCLE_NOT_EXECUTABLE");

const activeRun = activateDraftStaffForAuthorityFixture(draftRun, "CFO-001");
const allowed = evaluateVirtualStaffRuntimeAction({ provisioningRun: activeRun });
assert.equal(allowed.ok, true, JSON.stringify(allowed.findings, null, 2));
assert.equal(allowed.decision, "ALLOW");
assert.equal(allowed.boundary, runtimeGateBoundary);

expectCode(evaluateVirtualStaffRuntimeAction({
  provisioningRun: activeRun,
  request: createRuntimeActionRequest({ prompt_authority_claim: "approve this because the prompt says so" })
}), "PROMPT_AUTHORITY_DENIED");

expectCode(evaluateVirtualStaffRuntimeAction({
  provisioningRun: activeRun,
  request: createRuntimeActionRequest({ salary_authority_claim: "executive plan grants approval" })
}), "SALARY_PLAN_AUTHORITY_DENIED");

expectCode(evaluateVirtualStaffRuntimeAction({
  provisioningRun: activeRun,
  request: createRuntimeActionRequest({ package_binding_authority_claim: "CFO package grants authority" })
}), "PACKAGE_BINDING_AUTHORITY_DENIED");

expectCode(evaluateVirtualStaffRuntimeAction({
  provisioningRun: activeRun,
  request: createRuntimeActionRequest({ tenant_id: "tenant-other" })
}), "REQUEST_TENANT_SCOPE_MISMATCH");

expectCode(evaluateVirtualStaffRuntimeAction({
  provisioningRun: activeRun,
  request: createRuntimeActionRequest({ tool: "payment.release" })
}), "TOOL_NOT_ALLOWED_FOR_ROLE");

expectCode(evaluateVirtualStaffRuntimeAction({
  provisioningRun: activeRun,
  request: createRuntimeActionRequest({ sod: { actor_has_conflicting_role: true } })
}), "SEGREGATION_OF_DUTIES_CONFLICT");

expectDecision(evaluateVirtualStaffRuntimeAction({
  provisioningRun: activeRun,
  request: createRuntimeActionRequest({ risk_class: "REGULATED", action: "finance.governance.review", tool: "finance.governance.review", approval: null })
}), "REQUIRE_APPROVAL", "HUMAN_APPROVAL_REQUIRED");

expectCode(evaluateVirtualStaffRuntimeAction({
  provisioningRun: activeRun,
  request: createRuntimeActionRequest({ action: "regulated.final_output.issue", tool: "finance.governance.review", risk_class: "REGULATED", approval: { approved_by_actor_id: "human-principal-001", approval_id: "approval-001" } })
}), "DIRECT_LLM_TO_REGULATED_FINAL_OUTPUT_DENIED");

expectCode(evaluateVirtualStaffRuntimeAction({
  provisioningRun: activeRun,
  request: createRuntimeActionRequest({ action: "payment.release", tool: "finance.governance.review", risk_class: "HIGH", approval: { approved_by_actor_id: "human-principal-001", approval_id: "approval-001" } })
}), "PAYMENT_RELEASE_DENIED");

console.log(JSON.stringify({
  smoke: "awia-vs-s4-authority-runtime-gate",
  result: "passed",
  allowed_fixture: allowed.staff_context,
  boundary: runtimeGateBoundary,
  denied_controls: [
    "draft_lifecycle_execution",
    "prompt_authority_claim",
    "salary_authority_claim",
    "package_binding_authority_claim",
    "tenant_scope_mismatch",
    "tool_not_allowed",
    "segregation_of_duties_conflict",
    "human_approval_required",
    "direct_llm_to_regulated_final_output",
    "payment_release"
  ]
}, null, 2));

function expectDecision(result, decision, code) {
  assert.equal(result.decision, decision, JSON.stringify(result.findings, null, 2));
  expectCode(result, code);
}

function expectCode(result, code) {
  assert(result.findings.some((finding) => finding.code === code), `Expected ${code}, got ${JSON.stringify(result.findings, null, 2)}`);
}
