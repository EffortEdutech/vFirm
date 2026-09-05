import {
  awiaVirtualStaffPackageRegistry,
  firstPilotStaffSet,
  runtimeEligibilityByStatus
} from "./awia-virtual-staff-registry.mjs";

export const staffLifecycleStates = ["DRAFT", "PROVISIONING", "ACTIVE", "PAUSED", "SUSPENDED", "RETIRED", "ARCHIVED"];
export const executableLifecycleStates = ["ACTIVE"];
export const provisioningBoundary = "provisioning_only_no_autonomous_execution";

const runtimeCandidateStatuses = ["REFERENCE_PINNED", "VALIDATED_CANDIDATE", "CANDIDATE"];

export function createVirtualStaffSeat({ tenant_id, firm_id, salary_plan_id, package_id, staff_code, created_by_actor_id }) {
  return {
    staff_seat_id: `seat-${staff_code.toLowerCase()}`,
    tenant_id,
    firm_id,
    salary_plan_id,
    package_id,
    staff_code,
    seat_status: "DRAFT",
    commercial_boundary: "staff_seat_and_salary_plan_do_not_grant_authority",
    created_by_actor_id
  };
}

export function createVirtualStaffMember({ tenant_id, firm_id, staff_code, packageEntry, pilotStaff, created_by_actor_id }) {
  return {
    agent_id: `agent-${firm_id}-${staff_code.toLowerCase()}`,
    agent_code: staff_code,
    display_name: displayNameForStaff(staff_code, packageEntry.role_name),
    organization_id: tenant_id,
    firm_id,
    staff_seat_id: `seat-${staff_code.toLowerCase()}`,
    staff_grade: pilotStaff.staff_grade,
    role_assignment_ref: `role-assignment-${staff_code.toLowerCase()}`,
    package_binding_refs: [`package-binding-${staff_code.toLowerCase()}`],
    skill_binding_refs: [],
    authority_envelope_ref: `authority-envelope-${staff_code.toLowerCase()}`,
    manager_actor_ref: created_by_actor_id,
    lifecycle_status: "DRAFT",
    current_agent_version_ref: `${staff_code.toLowerCase()}-v1`,
    salary_plan_ref: "virtual-staff-controlled-pilot-plan",
    audit_identity: {
      actor_type: "AI_AGENT",
      actor_ref: `agent-${firm_id}-${staff_code.toLowerCase()}`,
      attribution_required: true
    }
  };
}

export function createStaffPackageBinding({ tenant_id, firm_id, staff_code, packageEntry }) {
  return {
    package_binding_id: `package-binding-${staff_code.toLowerCase()}`,
    tenant_id,
    firm_id,
    staff_code,
    package_id: packageEntry.package_id,
    source_name: packageEntry.source_name,
    package_kind: packageEntry.package_kind,
    registry_status: packageEntry.registry_status,
    version_ref: packageEntry.version_ref,
    binding_mode: "WHOLE_PACKAGE",
    binding_status: "DRAFT",
    authority_effect: "eligibility_input_only_not_authority",
    candidate_review_gate_required: ["VALIDATED_CANDIDATE", "CANDIDATE"].includes(packageEntry.registry_status)
  };
}

export function createStaffRoleAssignment({ tenant_id, firm_id, staff_code, packageEntry, pilotStaff }) {
  return {
    role_assignment_id: `role-assignment-${staff_code.toLowerCase()}`,
    tenant_id,
    firm_id,
    staff_code,
    role_code: pilotStaff.role_code,
    role_name: packageEntry.role_name,
    staff_grade: pilotStaff.staff_grade,
    runtime_classification: packageEntry.runtime_classification,
    assignment_status: "DRAFT",
    default_boundary: packageEntry.default_boundary
  };
}

export function createStaffLifecycleEvent({ tenant_id, firm_id, staff_code, actor_id, from_state = null, to_state = "DRAFT", reason = "initial_provisioning" }) {
  return {
    lifecycle_event_id: `staff-lifecycle-${staff_code.toLowerCase()}-${to_state.toLowerCase()}`,
    tenant_id,
    firm_id,
    staff_code,
    from_state,
    to_state,
    reason,
    actor_id,
    event_boundary: provisioningBoundary
  };
}

export function provisionPilotVirtualStaff({
  tenant_id = "tenant-amanah-controlled-pilot",
  firm_id = "firm-amanah-formwork-pilot",
  created_by_actor_id = "human-principal-001",
  salary_plan_id = "virtual-staff-controlled-pilot-plan",
  registry = awiaVirtualStaffPackageRegistry,
  pilotStaff = firstPilotStaffSet
} = {}) {
  const entriesById = new Map(registry.entries.map((entry) => [entry.package_id, entry]));
  const seats = [];
  const members = [];
  const role_assignments = [];
  const package_bindings = [];
  const lifecycle_events = [];
  const findings = [];

  for (const staff of pilotStaff) {
    const packageEntry = entriesById.get(staff.package_id);
    if (!packageEntry) {
      findings.push({ code: "PACKAGE_ENTRY_REQUIRED", severity: "ERROR", staff_code: staff.staff_code, package_id: staff.package_id });
      continue;
    }
    if (!runtimeCandidateStatuses.includes(packageEntry.registry_status)) {
      findings.push({ code: "PACKAGE_NOT_PROVISIONING_ELIGIBLE", severity: "ERROR", staff_code: staff.staff_code, package_id: staff.package_id, registry_status: packageEntry.registry_status });
      continue;
    }

    seats.push(createVirtualStaffSeat({ tenant_id, firm_id, salary_plan_id, package_id: packageEntry.package_id, staff_code: staff.staff_code, created_by_actor_id }));
    members.push(createVirtualStaffMember({ tenant_id, firm_id, staff_code: staff.staff_code, packageEntry, pilotStaff: staff, created_by_actor_id }));
    role_assignments.push(createStaffRoleAssignment({ tenant_id, firm_id, staff_code: staff.staff_code, packageEntry, pilotStaff: staff }));
    package_bindings.push(createStaffPackageBinding({ tenant_id, firm_id, staff_code: staff.staff_code, packageEntry }));
    lifecycle_events.push(createStaffLifecycleEvent({ tenant_id, firm_id, staff_code: staff.staff_code, actor_id: created_by_actor_id }));
  }

  const provisioningRun = {
    provisioning_run_id: `awia-vs-s3-${firm_id}`,
    tenant_id,
    firm_id,
    created_by_actor_id,
    boundary: provisioningBoundary,
    status: findings.some((finding) => finding.severity === "ERROR") ? "FAILED" : "PROVISIONED_DRAFT",
    salary_plan_id,
    registry_id: registry.registry_id,
    runtime_execution_enabled: false,
    seats,
    members,
    role_assignments,
    package_bindings,
    lifecycle_events,
    findings
  };

  return validateVirtualStaffProvisioningRun(provisioningRun, registry);
}

export function validateVirtualStaffProvisioningRun(provisioningRun, registry = awiaVirtualStaffPackageRegistry) {
  const findings = [...(Array.isArray(provisioningRun?.findings) ? provisioningRun.findings : [])];
  const packageEntries = new Map(registry.entries.map((entry) => [entry.package_id, entry]));

  if (provisioningRun?.boundary !== provisioningBoundary) findings.push({ code: "PROVISIONING_BOUNDARY_REQUIRED", severity: "ERROR" });
  if (provisioningRun?.runtime_execution_enabled !== false) findings.push({ code: "RUNTIME_EXECUTION_MUST_REMAIN_DISABLED", severity: "ERROR" });
  if (!provisioningRun?.tenant_id) findings.push({ code: "TENANT_ID_REQUIRED", severity: "ERROR" });
  if (!provisioningRun?.firm_id) findings.push({ code: "FIRM_ID_REQUIRED", severity: "ERROR" });

  const staffCodes = new Set();
  for (const member of provisioningRun?.members ?? []) {
    if (staffCodes.has(member.agent_code)) findings.push({ code: "DUPLICATE_STAFF_CODE", severity: "ERROR", staff_code: member.agent_code });
    staffCodes.add(member.agent_code);

    if (member.organization_id !== provisioningRun.tenant_id) findings.push({ code: "MEMBER_TENANT_SCOPE_MISMATCH", severity: "ERROR", staff_code: member.agent_code });
    if (member.firm_id !== provisioningRun.firm_id) findings.push({ code: "MEMBER_FIRM_SCOPE_MISMATCH", severity: "ERROR", staff_code: member.agent_code });
    if (member.lifecycle_status !== "DRAFT") findings.push({ code: "INITIAL_MEMBER_STATE_MUST_BE_DRAFT", severity: "ERROR", staff_code: member.agent_code, lifecycle_status: member.lifecycle_status });
    if (!member.audit_identity?.attribution_required) findings.push({ code: "AUDIT_ATTRIBUTION_REQUIRED", severity: "ERROR", staff_code: member.agent_code });
  }

  for (const seat of provisioningRun?.seats ?? []) {
    if (seat.tenant_id !== provisioningRun.tenant_id) findings.push({ code: "SEAT_TENANT_SCOPE_MISMATCH", severity: "ERROR", staff_code: seat.staff_code });
    if (seat.firm_id !== provisioningRun.firm_id) findings.push({ code: "SEAT_FIRM_SCOPE_MISMATCH", severity: "ERROR", staff_code: seat.staff_code });
    if (seat.commercial_boundary !== "staff_seat_and_salary_plan_do_not_grant_authority") findings.push({ code: "SALARY_PLAN_AUTHORITY_BOUNDARY_REQUIRED", severity: "ERROR", staff_code: seat.staff_code });
  }

  for (const binding of provisioningRun?.package_bindings ?? []) {
    const entry = packageEntries.get(binding.package_id);
    if (!entry) findings.push({ code: "BINDING_PACKAGE_UNKNOWN", severity: "ERROR", staff_code: binding.staff_code, package_id: binding.package_id });
    if (binding.authority_effect !== "eligibility_input_only_not_authority") findings.push({ code: "PACKAGE_BINDING_MUST_NOT_GRANT_AUTHORITY", severity: "ERROR", staff_code: binding.staff_code });
    if (entry && !runtimeEligibilityByStatus[entry.registry_status]) findings.push({ code: "BINDING_STATUS_ELIGIBILITY_UNKNOWN", severity: "ERROR", staff_code: binding.staff_code });
    if (entry && !runtimeCandidateStatuses.includes(entry.registry_status)) findings.push({ code: "BINDING_PACKAGE_NOT_PROVISIONING_ELIGIBLE", severity: "ERROR", staff_code: binding.staff_code, registry_status: entry.registry_status });
  }

  for (const event of provisioningRun?.lifecycle_events ?? []) {
    if (!staffLifecycleStates.includes(event.to_state)) findings.push({ code: "UNKNOWN_LIFECYCLE_STATE", severity: "ERROR", staff_code: event.staff_code, to_state: event.to_state });
    if (event.to_state !== "DRAFT") findings.push({ code: "INITIAL_LIFECYCLE_EVENT_MUST_BE_DRAFT", severity: "ERROR", staff_code: event.staff_code, to_state: event.to_state });
    if (!event.actor_id) findings.push({ code: "LIFECYCLE_ACTOR_REQUIRED", severity: "ERROR", staff_code: event.staff_code });
  }

  return {
    ...provisioningRun,
    ok: findings.filter((finding) => finding.severity === "ERROR").length === 0,
    findings,
    summary: {
      seat_count: provisioningRun?.seats?.length ?? 0,
      member_count: provisioningRun?.members?.length ?? 0,
      role_assignment_count: provisioningRun?.role_assignments?.length ?? 0,
      package_binding_count: provisioningRun?.package_bindings?.length ?? 0,
      lifecycle_event_count: provisioningRun?.lifecycle_events?.length ?? 0,
      runtime_execution_enabled: provisioningRun?.runtime_execution_enabled === true
    }
  };
}

export function canAcceptExecutableTask(member) {
  return executableLifecycleStates.includes(member?.lifecycle_status);
}

function displayNameForStaff(staffCode, roleName) {
  return `${staffCode} ${roleName}`;
}
