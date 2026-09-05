export type StaffLifecycleState = "DRAFT" | "PROVISIONING" | "ACTIVE" | "PAUSED" | "SUSPENDED" | "RETIRED" | "ARCHIVED";

export interface VirtualStaffSeat {
  staff_seat_id: string;
  tenant_id: string;
  firm_id: string;
  salary_plan_id: string;
  package_id: string;
  staff_code: string;
  seat_status: "DRAFT";
  commercial_boundary: "staff_seat_and_salary_plan_do_not_grant_authority";
  created_by_actor_id: string;
}

export interface VirtualStaffMember {
  agent_id: string;
  agent_code: string;
  display_name: string;
  organization_id: string;
  firm_id: string;
  staff_seat_id: string;
  staff_grade: "Assistant" | "Worker" | "Specialist" | "Manager" | "Executive" | "Service";
  role_assignment_ref: string;
  package_binding_refs: string[];
  skill_binding_refs: string[];
  authority_envelope_ref: string;
  manager_actor_ref: string;
  lifecycle_status: StaffLifecycleState;
  current_agent_version_ref: string;
  salary_plan_ref: string;
  audit_identity: {
    actor_type: "AI_AGENT";
    actor_ref: string;
    attribution_required: boolean;
  };
}

export interface StaffPackageBinding {
  package_binding_id: string;
  tenant_id: string;
  firm_id: string;
  staff_code: string;
  package_id: string;
  source_name: string;
  package_kind: string;
  registry_status: string;
  version_ref: string;
  binding_mode: "WHOLE_PACKAGE" | "PACKAGE_PROFILE" | "EXPLICIT_SKILL_SET" | "COMPOSITE";
  binding_status: "DRAFT";
  authority_effect: "eligibility_input_only_not_authority";
  candidate_review_gate_required: boolean;
}

export interface StaffRoleAssignment {
  role_assignment_id: string;
  tenant_id: string;
  firm_id: string;
  staff_code: string;
  role_code: string;
  role_name: string;
  staff_grade: string;
  runtime_classification: string | null;
  assignment_status: "DRAFT";
  default_boundary: string;
}

export interface StaffLifecycleEvent {
  lifecycle_event_id: string;
  tenant_id: string;
  firm_id: string;
  staff_code: string;
  from_state: StaffLifecycleState | null;
  to_state: StaffLifecycleState;
  reason: string;
  actor_id: string;
  event_boundary: "provisioning_only_no_autonomous_execution";
}

export interface VirtualStaffProvisioningRun {
  provisioning_run_id: string;
  tenant_id: string;
  firm_id: string;
  created_by_actor_id: string;
  boundary: "provisioning_only_no_autonomous_execution";
  status: "PROVISIONED_DRAFT" | "FAILED";
  salary_plan_id: string;
  registry_id: string;
  runtime_execution_enabled: false;
  seats: VirtualStaffSeat[];
  members: VirtualStaffMember[];
  role_assignments: StaffRoleAssignment[];
  package_bindings: StaffPackageBinding[];
  lifecycle_events: StaffLifecycleEvent[];
  findings: Array<Record<string, unknown>>;
}
