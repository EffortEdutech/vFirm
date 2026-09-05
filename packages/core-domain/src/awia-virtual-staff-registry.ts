export type StaffPackageRegistryStatus =
  | "REFERENCE_PINNED"
  | "VALIDATED_CANDIDATE"
  | "CANDIDATE"
  | "DRAFT"
  | "PLANNED"
  | "RETIRED"
  | "REFERENCE_TOOLING"
  | "REFERENCE_ARCHITECTURE"
  | "REFERENCE_DOMAIN"
  | "LEGACY_REFERENCE"
  | "ARCHIVE"
  | "SUPPORT";

export type StaffPackageKind =
  | "business_staff_package"
  | "domain_reference_package"
  | "architecture_reference"
  | "engineering_tooling_package"
  | "legacy_architecture_reference"
  | "platform_repository"
  | "archive"
  | "support_workspace";

export interface StaffPackageRegistryEntry {
  package_id: string;
  source_name: string;
  source_path: string;
  package_kind: StaffPackageKind;
  role_code: string | null;
  role_name: string;
  default_staff_grade: "Assistant" | "Worker" | "Specialist" | "Manager" | "Executive" | "Service" | null;
  runtime_classification: "ORCHESTRATING_AGENT" | "TASK_AGENT" | "REVIEW_AGENT" | "BACKGROUND_AGENT" | "SYSTEM_AGENT" | null;
  registry_status: StaffPackageRegistryStatus;
  review_state: string;
  version_ref: string;
  default_boundary: string;
}

export interface AwiaVirtualStaffPackageRegistry {
  registry_id: string;
  version: string;
  source_root: string;
  scope: "local_package_registry_mapping";
  implementation_boundary: "metadata_and_validation_only_no_autonomous_staff_activation";
  entries: StaffPackageRegistryEntry[];
}

export interface FirstPilotStaffRegistryRef {
  staff_code: string;
  package_id: string;
  role_code: string;
  staff_grade: "Assistant" | "Worker" | "Specialist" | "Manager" | "Executive" | "Service";
}
