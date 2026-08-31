export type UUID = string;
export type ISODateTime = string;

export type ActorType = "HUMAN" | "AI_AGENT" | "SYSTEM" | "EXTERNAL_SERVICE";
export type PolicyResult = "ALLOW" | "DENY" | "REQUIRE_APPROVAL" | "ESCALATE" | "REQUIRE_MORE_INFORMATION";
export type RiskClass = "LOW" | "STANDARD" | "CONTROLLED" | "HIGH" | "REGULATED" | "CRITICAL" | "UNDETERMINED";
export type DataClassification =
  | "PUBLIC"
  | "INTERNAL"
  | "CLIENT_CONFIDENTIAL"
  | "FIRM_CONFIDENTIAL"
  | "PROFESSIONAL_CONFIDENTIAL"
  | "REGULATED"
  | "LEGAL_PRIVILEGED"
  | "FINANCIAL_SENSITIVE"
  | "PERSONAL_DATA"
  | "SECRET";

export type FirmLifecycleState = "DRAFT" | "SUBMITTED" | "READY_FOR_ACTIVATION" | "ACTIVE" | "SUSPENDED" | "RETIRED";
export type IntakeState = "STARTED" | "NEEDS_INFORMATION" | "COMPLETE" | "CONVERTED_TO_PROPOSAL" | "CLOSED";
export type ProposalState = "DRAFT" | "APPROVAL_REQUIRED" | "APPROVED" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";
export type ProjectState = "OPEN" | "IN_PROGRESS" | "READY_FOR_REVIEW" | "APPROVED_FOR_DELIVERY" | "DELIVERED" | "CLOSED";
export type WorkPackageState = "CREATED" | "ASSIGNED" | "IN_PROGRESS" | "OUTPUT_READY" | "QA_FAILED" | "QA_PASSED" | "APPROVAL_REQUESTED" | "ACCEPTED" | "REWORK_REQUIRED";
export type DocumentVersionState = "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "ISSUED" | "SUPERSEDED" | "RETIRED";

export interface RecordEnvelope {
  id: UUID;
  tenant_id: UUID;
  firm_id?: UUID | null;
  status: string;
  version: number;
  created_at: ISODateTime;
  created_by_actor_id?: UUID | null;
  updated_at: ISODateTime;
  updated_by_actor_id?: UUID | null;
  data_classification: DataClassification;
  provenance: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface Actor {
  actor_id: UUID;
  actor_type: ActorType;
  person_id?: UUID | null;
  worker_instance_id?: UUID | null;
  system_id?: UUID | null;
  external_service_id?: UUID | null;
  tenant_id?: UUID | null;
  firm_id?: UUID | null;
  display_name: string;
  status: string;
}

export interface Tenant extends Omit<RecordEnvelope, "firm_id"> {
  tenant_id: UUID;
  name: string;
  isolation_policy_id: UUID;
  default_region: string;
  data_residency_policy: string;
  billing_account_ref?: string | null;
}

export interface Firm extends RecordEnvelope {
  firm_id: UUID;
  name: string;
  brand_id?: UUID | null;
  business_entity_id?: UUID | null;
  primary_principal_assignment_id?: UUID | null;
  lifecycle_state: FirmLifecycleState;
  lifecycle_state_reason?: string | null;
  active_practices: UUID[];
  configuration_version: number;
}

export interface ProfessionalAuthority extends RecordEnvelope {
  authority_id: UUID;
  professional_id: UUID;
  practice_id: UUID;
  service_scope: UUID[];
  jurisdiction_id?: UUID | null;
  permitted_actions: string[];
  risk_limits: RiskClass[];
  credential_refs: UUID[];
  valid_from: ISODateTime;
  valid_to?: ISODateTime | null;
  policy_basis_ref: string;
}

export interface Client extends RecordEnvelope {
  client_id: UUID;
  client_type: "ORGANIZATION" | "INDIVIDUAL";
  name: string;
  primary_contact_id?: UUID | null;
  confidentiality_class: DataClassification;
}

export interface IntakeSession extends RecordEnvelope {
  intake_session_id: UUID;
  lead_id: UUID;
  service_id?: UUID | null;
  required_inputs: string[];
  provided_inputs: Record<string, unknown>;
  missing_information_items: string[];
  intake_status: IntakeState;
}

export interface Proposal extends RecordEnvelope {
  proposal_id: UUID;
  relationship_id: UUID;
  service_id: UUID;
  scope_summary: string;
  price_build_up_id: UUID;
  commercial_approval_id?: UUID | null;
  proposal_status: ProposalState;
  valid_until: ISODateTime;
  issued_document_ref?: string | null;
}

export interface Project extends RecordEnvelope {
  project_id: UUID;
  relationship_id: UUID;
  engagement_id: UUID;
  service_id: UUID;
  project_name: string;
  project_state: ProjectState;
  risk_class: RiskClass;
  responsible_professional_id?: UUID | null;
}

export interface WorkPackage extends RecordEnvelope {
  work_package_id: UUID;
  project_id: UUID;
  service_step: string;
  assigned_worker_instance_id?: UUID | null;
  assigned_human_actor_id?: UUID | null;
  work_package_state: WorkPackageState;
  required_evidence: string[];
  approval_requirement_id?: UUID | null;
}

export interface PolicyDecision extends RecordEnvelope {
  policy_decision_id: UUID;
  policy_id: string;
  policy_version: string;
  actor_id: UUID;
  action: string;
  resource_type: string;
  resource_id: UUID;
  context_ref?: string | null;
  result: PolicyResult;
  reasons: string[];
}

export interface Approval extends RecordEnvelope {
  approval_id: UUID;
  subject_type: string;
  subject_id: UUID;
  subject_version_or_hash: string;
  requested_by_actor_id: UUID;
  approver_actor_id?: UUID | null;
  approver_professional_id?: UUID | null;
  authority_id?: UUID | null;
  decision?: "APPROVED" | "REJECTED" | "APPROVED_WITH_CONDITIONS" | "NEEDS_MORE_INFORMATION" | null;
  conditions: string[];
  evidence_bundle_id?: UUID | null;
  authentication_strength?: string | null;
  decided_at?: ISODateTime | null;
  audit_event_id?: UUID | null;
}
