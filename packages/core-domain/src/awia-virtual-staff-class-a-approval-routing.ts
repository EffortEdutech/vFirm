export type ClassAApprovalDecision = "ALLOW" | "DENY";

export interface ClassAApprovalRequirement {
  found: boolean;
  requires_approval: boolean;
  findings: string[];
  skill?: { skill_id: string; authority_class: "A" | "B" | "C"; sod_scoped?: boolean; pii_scoped?: boolean; note?: string };
  position_id?: string;
  job_title?: string;
  approver_role?: string;
  sod_scoped?: boolean;
  pii_scoped?: boolean;
}

export interface ClassAApprovalGateRequest {
  position_id: string;
  skill_id: string;
  prepared_by_actor_id: string;
  approver_actor_id?: string | null;
  approver_role_claim?: string | null;
  firm_owner_actor_id?: string | null;
}

export interface ClassAApprovalGateResult {
  decision: ClassAApprovalDecision;
  boundary: string;
  findings: string[];
  requirement: ClassAApprovalRequirement;
}

export interface ClassASelfApprovalVerificationFailure {
  position_id: string;
  skill_id: string;
  code: "SELF_APPROVAL_WAS_ALLOWED" | "VALID_DISTINCT_APPROVAL_WAS_DENIED";
  findings?: string[];
}

export interface ClassASelfApprovalVerificationResult {
  ok: boolean;
  class_a_skills_checked: number;
  failures: ClassASelfApprovalVerificationFailure[];
}
