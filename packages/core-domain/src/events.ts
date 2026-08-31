import type { ActorType, ISODateTime, RiskClass, UUID } from "./types.js";

export interface EventEnvelope<TPayload> {
  event_id: UUID;
  event_type: CanonicalEventType;
  event_version: "1.0";
  occurred_at: ISODateTime;
  recorded_at: ISODateTime;
  actor_id: UUID;
  actor_type: ActorType;
  tenant_id: UUID;
  firm_id?: UUID | null;
  aggregate_type: string;
  aggregate_id: UUID;
  aggregate_version?: number | null;
  correlation_id: UUID;
  causation_id?: UUID | null;
  idempotency_key?: string | null;
  payload: TPayload;
  payload_ref?: string | null;
  payload_summary: string;
  policy_decision_id?: UUID | null;
  audit_event_id?: UUID | null;
  provenance: Record<string, unknown>;
}

export type CanonicalEventType =
  | "tenant.created"
  | "firm.application_submitted"
  | "firm.activated"
  | "professional.authority_granted"
  | "worker_instance.provisioned"
  | "lead.created"
  | "intake.completed"
  | "proposal.created"
  | "approval.requested"
  | "approval.granted"
  | "project.opened"
  | "task.output_produced"
  | "evidence_bundle.created"
  | "deliverable.issued"
  | "invoice.created";

export interface TenantCreatedPayload {
  tenant_id: UUID;
  name: string;
  default_region: string;
  data_residency_policy: string;
}

export interface FirmApplicationSubmittedPayload {
  firm_id: UUID;
  tenant_id: UUID;
  principal_person_id: UUID;
  business_entity_id?: UUID | null;
  requested_practices: UUID[];
  submission_status: "SUBMITTED";
}

export interface FirmActivatedPayload {
  firm_id: UUID;
  previous_state: string;
  new_state: "ACTIVE";
  activated_services: UUID[];
  readiness_evidence_bundle_id?: UUID | null;
}

export interface ProfessionalAuthorityGrantedPayload {
  authority_id: UUID;
  professional_id: UUID;
  firm_id: UUID;
  practice_id: UUID;
  jurisdiction_id?: UUID | null;
  service_scope: UUID[];
  risk_limits: RiskClass[];
  valid_from: ISODateTime;
  valid_to?: ISODateTime | null;
}

export interface WorkerInstanceProvisionedPayload {
  worker_instance_id: UUID;
  worker_template_id: UUID;
  template_version: string;
  firm_id: UUID;
  assigned_services: UUID[];
  authority_envelope_id: UUID;
  runtime_status: "PROVISIONED";
}

export interface LeadCreatedPayload {
  lead_id: UUID;
  firm_id: UUID;
  client_id?: UUID | null;
  relationship_id?: UUID | null;
  source_channel: string;
  requested_service_hint?: string | null;
  urgency?: "LOW" | "STANDARD" | "URGENT" | null;
}

export interface IntakeCompletedPayload {
  intake_session_id: UUID;
  lead_id: UUID;
  service_id: UUID;
  provided_input_refs: string[];
  missing_information_count: number;
  risk_class: RiskClass;
}

export interface ProposalCreatedPayload {
  proposal_id: UUID;
  relationship_id: UUID;
  service_id: UUID;
  scope_draft_id: UUID;
  price_build_up_id: UUID;
  status: "DRAFT";
  approval_required: boolean;
}

export interface ApprovalRequestedPayload {
  approval_id: UUID;
  subject_type: "Proposal" | "DocumentVersion" | "Deliverable" | "ProjectState" | "Invoice" | "ProfessionalAuthority";
  subject_id: UUID;
  subject_version_or_hash: string;
  requested_by_actor_id: UUID;
  required_approver_role: "Principal" | "AuthorizedProfessional" | "CommercialApprover";
  required_evidence_bundle_id?: UUID | null;
}

export interface ApprovalGrantedPayload {
  approval_id: UUID;
  subject_type: string;
  subject_id: UUID;
  subject_version_or_hash: string;
  approver_actor_id: UUID;
  approver_professional_id?: UUID | null;
  authority_id?: UUID | null;
  decision: "APPROVED" | "APPROVED_WITH_CONDITIONS";
  conditions: string[];
  evidence_bundle_id?: UUID | null;
  authentication_strength: string;
}

export interface ProjectOpenedPayload {
  project_id: UUID;
  engagement_id: UUID;
  relationship_id: UUID;
  service_id: UUID;
  project_state: "OPEN";
  risk_class: RiskClass;
  responsible_professional_id?: UUID | null;
}

export interface TaskOutputProducedPayload {
  task_id: UUID;
  work_package_id?: UUID | null;
  worker_instance_id?: UUID | null;
  output_ref: string;
  output_schema_ref: string;
  evidence_refs: string[];
  quality_flags: string[];
  requires_human_review: boolean;
}

export interface EvidenceBundleCreatedPayload {
  evidence_bundle_id: UUID;
  subject_type: string;
  subject_id: UUID;
  source_document_refs: UUID[];
  calculation_refs: string[];
  qa_check_refs: UUID[];
  bundle_hash: string;
  status: "READY_FOR_REVIEW";
}

export interface DeliverableIssuedPayload {
  document_id: UUID;
  document_version_id: UUID;
  project_id: UUID;
  relationship_id: UUID;
  approval_id: UUID;
  evidence_bundle_id: UUID;
  recipient_contact_ids: UUID[];
  issue_channel: "PORTAL" | "EMAIL" | "MANUAL";
  issued_at: ISODateTime;
}

export interface InvoiceCreatedPayload {
  invoice_id: UUID;
  relationship_id: UUID;
  engagement_id?: UUID | null;
  project_id?: UUID | null;
  currency: string;
  total_amount: number;
  due_at: ISODateTime;
  status: "DRAFT";
}

export type EventPayloadByType = {
  "tenant.created": TenantCreatedPayload;
  "firm.application_submitted": FirmApplicationSubmittedPayload;
  "firm.activated": FirmActivatedPayload;
  "professional.authority_granted": ProfessionalAuthorityGrantedPayload;
  "worker_instance.provisioned": WorkerInstanceProvisionedPayload;
  "lead.created": LeadCreatedPayload;
  "intake.completed": IntakeCompletedPayload;
  "proposal.created": ProposalCreatedPayload;
  "approval.requested": ApprovalRequestedPayload;
  "approval.granted": ApprovalGrantedPayload;
  "project.opened": ProjectOpenedPayload;
  "task.output_produced": TaskOutputProducedPayload;
  "evidence_bundle.created": EvidenceBundleCreatedPayload;
  "deliverable.issued": DeliverableIssuedPayload;
  "invoice.created": InvoiceCreatedPayload;
};

export type TypedEvent<T extends CanonicalEventType> = EventEnvelope<EventPayloadByType[T]> & { event_type: T };
