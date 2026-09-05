import assert from "node:assert/strict";
import {
  canAcceptExecutableTask,
  provisionPilotVirtualStaff,
  provisioningBoundary,
  validateVirtualStaffProvisioningRun
} from "../packages/core-domain/src/awia-virtual-staff-provisioning.mjs";

const run = provisionPilotVirtualStaff();
assert.equal(run.ok, true, JSON.stringify(run.findings, null, 2));
assert.equal(run.boundary, provisioningBoundary);
assert.equal(run.runtime_execution_enabled, false);
assert.equal(run.status, "PROVISIONED_DRAFT");
assert.deepEqual(run.summary, {
  seat_count: 8,
  member_count: 8,
  role_assignment_count: 8,
  package_binding_count: 8,
  lifecycle_event_count: 8,
  runtime_execution_enabled: false
});

for (const member of run.members) {
  assert.equal(member.lifecycle_status, "DRAFT");
  assert.equal(canAcceptExecutableTask(member), false, `${member.agent_code} must not accept executable tasks during S3`);
  assert.equal(member.audit_identity.attribution_required, true);
  assert(member.agent_id.startsWith(`agent-${run.firm_id}-`));
}

for (const seat of run.seats) {
  assert.equal(seat.commercial_boundary, "staff_seat_and_salary_plan_do_not_grant_authority");
}

for (const binding of run.package_bindings) {
  assert.equal(binding.authority_effect, "eligibility_input_only_not_authority");
}

const executionEnabled = validateVirtualStaffProvisioningRun({ ...run, runtime_execution_enabled: true });
assert.equal(executionEnabled.ok, false);
assert(executionEnabled.findings.some((finding) => finding.code === "RUNTIME_EXECUTION_MUST_REMAIN_DISABLED"));

const salaryAuthority = validateVirtualStaffProvisioningRun({
  ...run,
  seats: [{ ...run.seats[0], commercial_boundary: "salary_plan_grants_authority" }, ...run.seats.slice(1)]
});
assert.equal(salaryAuthority.ok, false);
assert(salaryAuthority.findings.some((finding) => finding.code === "SALARY_PLAN_AUTHORITY_BOUNDARY_REQUIRED"));

const activeInitialState = validateVirtualStaffProvisioningRun({
  ...run,
  members: [{ ...run.members[0], lifecycle_status: "ACTIVE" }, ...run.members.slice(1)]
});
assert.equal(activeInitialState.ok, false);
assert(activeInitialState.findings.some((finding) => finding.code === "INITIAL_MEMBER_STATE_MUST_BE_DRAFT"));

const bindingAuthority = validateVirtualStaffProvisioningRun({
  ...run,
  package_bindings: [{ ...run.package_bindings[0], authority_effect: "grants_authority" }, ...run.package_bindings.slice(1)]
});
assert.equal(bindingAuthority.ok, false);
assert(bindingAuthority.findings.some((finding) => finding.code === "PACKAGE_BINDING_MUST_NOT_GRANT_AUTHORITY"));

console.log(JSON.stringify({
  smoke: "awia-vs-s3-staff-provisioning",
  result: "passed",
  summary: run.summary,
  boundary: run.boundary,
  denied_controls: [
    "runtime_execution_enabled",
    "salary_plan_grants_authority",
    "initial_active_state",
    "package_binding_grants_authority"
  ]
}, null, 2));
