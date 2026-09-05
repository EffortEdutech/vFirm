export interface VirtualStaffEvidenceObject {
  evidence_id: string;
  evidence_type: "PACKAGE_REGISTRY" | "PROVISIONING_RUN" | "AUTHORITY_DECISION" | "DENIAL_DECISION";
  subject_ref: string;
  summary: string;
  evidence_boundary: "first_class_reference_not_generated_narrative_only";
}

export interface VirtualStaffLedgerProjectionEvent {
  ledger_event_id: string;
  event_type: string;
  actor_type: "SYSTEM" | "HUMAN" | "AI_AGENT" | "EXTERNAL_SERVICE";
  subject_ref: string;
  evidence_refs: string[];
  denial_codes: string[];
  mutation_mode: "APPEND_ONLY_PROJECTION";
}

export interface VirtualStaffPilotGateReadiness {
  registry_mapped: boolean;
  draft_staff_provisioned: boolean;
  runtime_execution_disabled: boolean;
  controlled_allowed_decision_present: boolean;
  denial_evidence_count: number;
  evidence_object_count: number;
  ledger_projection_count: number;
  human_governed_boundary: boolean;
}

export interface VirtualStaffPilotGate {
  ok: boolean;
  recommendation: "GO_FOR_CONTROLLED_HUMAN_GOVERNED_PILOT_REHEARSAL" | "HOLD_FOR_EVIDENCE_REPAIR";
  findings: Array<Record<string, unknown>>;
  readiness: VirtualStaffPilotGateReadiness;
}

export interface VirtualStaffEvidencePack {
  evidence_pack_id: string;
  boundary: "evidence_projection_and_pilot_gate_only_no_autonomous_execution";
  registry_id: string;
  provisioning_run_id: string;
  allowed_decision: Record<string, unknown>;
  denial_decisions: Array<Record<string, unknown>>;
  evidence_objects: VirtualStaffEvidenceObject[];
  ledger_projection: VirtualStaffLedgerProjectionEvent[];
  pilot_gate: VirtualStaffPilotGate;
}
