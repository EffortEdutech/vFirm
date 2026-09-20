export type PositionSkillAuthorityClass = "A" | "B" | "C";

export interface PositionSkillEntry {
  skill_id: string;
  authority_class: PositionSkillAuthorityClass;
  sod_scoped?: boolean;
  pii_scoped?: boolean;
  note?: string;
}

export interface AwiaVirtualStaffPositionDefinition {
  position_id: string;
  job_title: string;
  package_id: string;
  role_code: string;
  skills: PositionSkillEntry[];
  out_of_scope_note: string;
  maturity_note: string;
  supervision_note?: string;
  why_this_position_exists?: string;
}

export interface AwiaVirtualStaffPositionCatalogue {
  catalogue_id: string;
  version: string;
  scope: "position_to_skill_subset_mapping";
  implementation_boundary: string;
  default_class_a_approver: "firm_owner" | string;
  positions: AwiaVirtualStaffPositionDefinition[];
}

export interface ClassAEscalationPoint {
  skill_id: string;
  position_id: string;
  job_title: string;
  approver: string;
  sod_scoped: boolean;
  pii_scoped: boolean;
}
