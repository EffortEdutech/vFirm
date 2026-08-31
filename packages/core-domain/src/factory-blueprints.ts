export type FactoryFindingSeverity = "ERROR" | "WARNING";

export interface FactoryValidationFinding {
  code: string;
  message: string;
  path: string;
  severity: FactoryFindingSeverity;
}

export interface AuthorityEnvelopeContract {
  permitted_actions: string[];
  forbidden_actions: string[];
  risk_class: string;
  approval_requirements: string[];
}

export interface FirmBlueprintContract {
  firm_blueprint_id: string;
  firm_name: string;
  virtual_principal: {
    actor_id: string;
    professional_id: string;
    display_name: string;
  };
  modules: Array<{ code: string; enabled: boolean }>;
  services: Array<{
    service_id: string;
    name: string;
    risk_class: string;
    jurisdiction: string;
    responsible_professional_id?: string;
  }>;
}

export interface WorkforceBlueprintContract {
  workforce_blueprint_id: string;
  workers: Array<{
    worker_code: string;
    actor_type: "AI_AGENT" | "HUMAN" | "SYSTEM" | "EXTERNAL_SERVICE";
    role_skill_ref: string;
    worker_skill_ref: string;
    authority_envelope: AuthorityEnvelopeContract;
    supervisor_actor_id: string;
    escalation_route: string;
    memory_boundary: Record<string, unknown>;
    budget_boundary: Record<string, unknown>;
  }>;
}

export interface PracticePackManifestContract {
  practice_pack_id: string;
  name: string;
  version: string;
}

export interface ServiceDeliveryPackManifestContract {
  service_delivery_pack_id: string;
  practice_pack_ref: string;
  delivery_states: Array<{
    code: string;
    allows_external_issue?: boolean;
    requires_human_professional_approval?: boolean;
  }>;
}

export interface GovernancePackManifestContract {
  governance_pack_id: string;
  approval_rules: Array<{
    service_id: string;
    approver_type: string;
    silent_approval_allowed: boolean;
  }>;
}

export interface JurisdictionPackManifestContract {
  jurisdiction_pack_id: string;
  jurisdictions: Array<{ code: string; status: "ACTIVE" | "INACTIVE" }>;
  credential_rules: Array<{ jurisdiction: string; credential_type: string }>;
}

export interface FactoryBlueprintBundleContract {
  firm_blueprint: FirmBlueprintContract;
  workforce_blueprint: WorkforceBlueprintContract;
  practice_pack_manifest: PracticePackManifestContract;
  service_delivery_pack_manifest: ServiceDeliveryPackManifestContract;
  governance_pack_manifest: GovernancePackManifestContract;
  jurisdiction_pack_manifest: JurisdictionPackManifestContract;
}

export declare const requiredStarterModules: string[];
export declare const forbiddenAiAuthorityActions: string[];
export declare function validateFactoryBlueprintBundle(bundle: unknown): { ok: boolean; findings: FactoryValidationFinding[] };