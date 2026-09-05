export type RuntimeAuthorityDecision = "ALLOW" | "DENY" | "REQUIRE_APPROVAL";

export interface VirtualStaffRuntimeActionRequest {
  request_id: string;
  tenant_id: string;
  firm_id: string;
  staff_code: string;
  action: string;
  tool: string;
  risk_class: "LOW" | "STANDARD" | "CONTROLLED" | "HIGH" | "REGULATED" | "CRITICAL" | "UNDETERMINED";
  client_id: string;
  project_id: string;
  evidence_refs: string[];
  approval: { approved_by_actor_id: string; approval_id: string } | null;
  requested_by_actor_id: string;
  responsible_professional_id: string | null;
  sod: { actor_has_conflicting_role: boolean };
  prompt_authority_claim: string | null;
  salary_authority_claim: string | null;
  package_binding_authority_claim: string | null;
}

export interface VirtualStaffRuntimeAuthorityDecision {
  ok: boolean;
  decision: RuntimeAuthorityDecision;
  boundary: "deterministic_authority_gate_no_autonomous_regulated_approval";
  request: VirtualStaffRuntimeActionRequest;
  staff_context: {
    agent_id: string;
    agent_code: string;
    lifecycle_status: string;
    role_code: string;
    package_id: string;
    registry_status: string;
    authority_effect: string;
  } | null;
  findings: Array<{ code: string; severity: "ERROR" | "WARNING" }>;
}
