export const packageRegistryStatuses = [
  "REFERENCE_PINNED",
  "VALIDATED_CANDIDATE",
  "CANDIDATE",
  "DRAFT",
  "PLANNED",
  "RETIRED",
  "REFERENCE_TOOLING",
  "REFERENCE_ARCHITECTURE",
  "REFERENCE_DOMAIN",
  "LEGACY_REFERENCE",
  "ARCHIVE",
  "SUPPORT"
];

export const runtimeEligibilityByStatus = {
  REFERENCE_PINNED: "controlled_fixtures_after_contract_checks",
  VALIDATED_CANDIDATE: "candidate_warning_and_review_gate_required",
  CANDIDATE: "catalogue_and_controlled_review_only",
  DRAFT: "catalogue_only",
  PLANNED: "catalogue_only",
  RETIRED: "not_eligible",
  REFERENCE_TOOLING: "tooling_only_not_staff_runtime",
  REFERENCE_ARCHITECTURE: "reference_only_not_staff_runtime",
  REFERENCE_DOMAIN: "domain_reference_only_not_staff_runtime",
  LEGACY_REFERENCE: "reference_only_not_staff_runtime",
  ARCHIVE: "not_eligible",
  SUPPORT: "support_workspace_only_not_staff_runtime"
};

export const awiaVirtualStaffPackageRegistry = {
  registry_id: "awia-virtual-staff-local-package-registry-v1",
  version: "1.0",
  source_root: "C:\\Users\\user\\Documents\\00 Agent Skills",
  scope: "local_package_registry_mapping",
  implementation_boundary: "metadata_and_validation_only_no_autonomous_staff_activation",
  entries: [
    {
      package_id: "cfo",
      source_name: "CFO",
      source_path: "C:\\Users\\user\\Documents\\00 Agent Skills\\CFO",
      package_kind: "business_staff_package",
      role_code: "CFO",
      role_name: "Chief Finance Officer",
      default_staff_grade: "Executive",
      runtime_classification: "ORCHESTRATING_AGENT",
      registry_status: "REFERENCE_PINNED",
      review_state: "awia_reference_mapping",
      version_ref: "cfo-v1.7.0",
      default_boundary: "Finance governance recommendation and supervision only; no silent approval or live payment release."
    },
    {
      package_id: "fao",
      source_name: "FAO",
      source_path: "C:\\Users\\user\\Documents\\00 Agent Skills\\FAO",
      package_kind: "business_staff_package",
      role_code: "FAO",
      role_name: "Finance Administration Officer",
      default_staff_grade: "Worker",
      runtime_classification: "TASK_AGENT",
      registry_status: "REFERENCE_PINNED",
      review_state: "awia_reference_mapping",
      version_ref: "fao-v1.2.0",
      default_boundary: "AP and revenue support under review gates; no payment release."
    },
    {
      package_id: "sao",
      source_name: "SAO",
      source_path: "C:\\Users\\user\\Documents\\00 Agent Skills\\SAO",
      package_kind: "business_staff_package",
      role_code: "SAO",
      role_name: "Sales and Customer Operations Officer",
      default_staff_grade: "Worker",
      runtime_classification: "TASK_AGENT",
      registry_status: "VALIDATED_CANDIDATE",
      review_state: "automatable_validation_complete_human_commercial_review_pending",
      version_ref: "sao-candidate",
      default_boundary: "Sales and customer operations with commercial human review gate."
    },
    {
      package_id: "opo",
      source_name: "OPO",
      source_path: "C:\\Users\\user\\Documents\\00 Agent Skills\\OPO",
      package_kind: "business_staff_package",
      role_code: "OPO",
      role_name: "Operations and Project Delivery Officer",
      default_staff_grade: "Manager",
      runtime_classification: "ORCHESTRATING_AGENT",
      registry_status: "CANDIDATE",
      review_state: "authored_candidate_validation_pending",
      version_ref: "opo-candidate",
      default_boundary: "Project delivery coordination with validation and human approval gates."
    },
    {
      package_id: "aro",
      source_name: "ARO",
      source_path: "C:\\Users\\user\\Documents\\00 Agent Skills\\ARO",
      package_kind: "business_staff_package",
      role_code: "ARO",
      role_name: "Administration and Resources Officer",
      default_staff_grade: "Worker",
      runtime_classification: "TASK_AGENT",
      registry_status: "CANDIDATE",
      review_state: "draft_candidate_validation_pending",
      version_ref: "aro-candidate",
      default_boundary: "Administration and resource operations with validation and review gates."
    },
    {
      package_id: "cmo",
      source_name: "CMO",
      source_path: "C:\\Users\\user\\Documents\\00 Agent Skills\\CMO",
      package_kind: "business_staff_package",
      role_code: "CMO",
      role_name: "Chief Marketing Officer",
      default_staff_grade: "Executive",
      runtime_classification: "ORCHESTRATING_AGENT",
      registry_status: "CANDIDATE",
      review_state: "human_marketing_commercial_review_pending",
      version_ref: "cmo-candidate",
      default_boundary: "Marketing governance and campaign support with truth-in-claims and protected-attribute controls."
    },
    {
      package_id: "cto",
      source_name: "CTO",
      source_path: "C:\\Users\\user\\Documents\\00 Agent Skills\\CTO",
      package_kind: "business_staff_package",
      role_code: "CTO",
      role_name: "Chief Technology Officer",
      default_staff_grade: "Executive",
      runtime_classification: "ORCHESTRATING_AGENT",
      registry_status: "DRAFT",
      review_state: "foundation_frozen_roster_only",
      version_ref: "cto-draft",
      default_boundary: "Catalogue only until skills are authored and validated."
    },
    {
      package_id: "cio",
      source_name: "CIO",
      source_path: "C:\\Users\\user\\Documents\\00 Agent Skills\\CIO",
      package_kind: "business_staff_package",
      role_code: "CIO",
      role_name: "Chief Information Officer",
      default_staff_grade: "Executive",
      runtime_classification: "ORCHESTRATING_AGENT",
      registry_status: "DRAFT",
      review_state: "partial_candidate_skill_set",
      version_ref: "cio-draft",
      default_boundary: "Enterprise IT and internal systems governance catalogue until complete validation."
    },
    {
      package_id: "chro",
      source_name: "CHRO",
      source_path: "C:\\Users\\user\\Documents\\00 Agent Skills\\CHRO",
      package_kind: "business_staff_package",
      role_code: "CHRO",
      role_name: "Chief Human Resources Officer",
      default_staff_grade: "Executive",
      runtime_classification: "ORCHESTRATING_AGENT",
      registry_status: "PLANNED",
      review_state: "roster_proposal_only",
      version_ref: "chro-planned",
      default_boundary: "Catalogue only; no HR authority or runtime operation."
    },
    {
      package_id: "coo",
      source_name: "COO",
      source_path: "C:\\Users\\user\\Documents\\00 Agent Skills\\COO",
      package_kind: "business_staff_package",
      role_code: "COO",
      role_name: "Chief Operating Officer",
      default_staff_grade: "Executive",
      runtime_classification: "ORCHESTRATING_AGENT",
      registry_status: "PLANNED",
      review_state: "empty_or_not_yet_authored_source_folder",
      version_ref: "coo-planned",
      default_boundary: "Catalogue only until package exists and is reviewed."
    },
    {
      package_id: "construction",
      source_name: "Construction",
      source_path: "C:\\Users\\user\\Documents\\00 Agent Skills\\Construction",
      package_kind: "domain_reference_package",
      role_code: null,
      role_name: "Construction Intelligence Skills",
      default_staff_grade: "Specialist",
      runtime_classification: "REVIEW_AGENT",
      registry_status: "REFERENCE_DOMAIN",
      review_state: "zip_only_domain_reference",
      version_ref: "construction-intelligence-v1.6",
      default_boundary: "Domain reference only until decomposed into governed staff or practice-pack bindings."
    },
    {
      package_id: "awia",
      source_name: "AWIA",
      source_path: "C:\\Users\\user\\Documents\\00 Agent Skills\\AWIA",
      package_kind: "architecture_reference",
      role_code: null,
      role_name: "AI Worker Identity Architecture",
      default_staff_grade: null,
      runtime_classification: null,
      registry_status: "REFERENCE_ARCHITECTURE",
      review_state: "baseline_reference",
      version_ref: "awia-v1.0",
      default_boundary: "Architecture and contract source, not a virtual staff role package."
    },
    {
      package_id: "ecc-main",
      source_name: "ECC-main",
      source_path: "C:\\Users\\user\\Documents\\00 Agent Skills\\ECC-main",
      package_kind: "engineering_tooling_package",
      role_code: null,
      role_name: "Engineering Context and Command Workflow",
      default_staff_grade: null,
      runtime_classification: null,
      registry_status: "REFERENCE_TOOLING",
      review_state: "engineering_workflow_reference",
      version_ref: "ecc-main-local",
      default_boundary: "Engineering workflow tooling only, not a client-facing business staff package."
    },
    {
      package_id: "vfirm-legacy",
      source_name: "vFirm",
      source_path: "C:\\Users\\user\\Documents\\00 Agent Skills\\vFirm",
      package_kind: "legacy_architecture_reference",
      role_code: null,
      role_name: "Virtual Firm Baseline Archive",
      default_staff_grade: null,
      runtime_classification: null,
      registry_status: "LEGACY_REFERENCE",
      review_state: "zip_only_baseline_reference",
      version_ref: "vf00-vf24-baseline-v1.0",
      default_boundary: "Architecture reference only; not a staff package."
    },
    {
      package_id: "virtual-firm-repo",
      source_name: "virtual-firm",
      source_path: "C:\\Users\\user\\Documents\\00 Agent Skills\\virtual-firm",
      package_kind: "platform_repository",
      role_code: null,
      role_name: "Virtual Firm Platform Repository",
      default_staff_grade: null,
      runtime_classification: null,
      registry_status: "REFERENCE_TOOLING",
      review_state: "active_platform_repository",
      version_ref: "local-working-tree",
      default_boundary: "Platform source repository, not a staff package."
    },
    {
      package_id: "archive",
      source_name: "_archive",
      source_path: "C:\\Users\\user\\Documents\\00 Agent Skills\\_archive",
      package_kind: "archive",
      role_code: null,
      role_name: "Archived Skill Materials",
      default_staff_grade: null,
      runtime_classification: null,
      registry_status: "ARCHIVE",
      review_state: "archive_not_runtime_source",
      version_ref: "local-archive",
      default_boundary: "Not runtime eligible."
    },
    {
      package_id: "cowork-ready",
      source_name: "_cowork-ready",
      source_path: "C:\\Users\\user\\Documents\\00 Agent Skills\\_cowork-ready",
      package_kind: "support_workspace",
      role_code: null,
      role_name: "Cowork Ready Support Workspace",
      default_staff_grade: null,
      runtime_classification: null,
      registry_status: "SUPPORT",
      review_state: "support_workspace_not_runtime_source",
      version_ref: "local-support",
      default_boundary: "Support workspace only, not a staff package."
    }
  ]
};

export const firstPilotStaffSet = [
  { staff_code: "CFO-001", package_id: "cfo", role_code: "CFO", staff_grade: "Executive" },
  { staff_code: "FA-001", package_id: "fao", role_code: "FAO", staff_grade: "Specialist" },
  { staff_code: "FAO-AP-001", package_id: "fao", role_code: "FAO", staff_grade: "Worker" },
  { staff_code: "FAO-REV-001", package_id: "fao", role_code: "FAO", staff_grade: "Worker" },
  { staff_code: "SAO-001", package_id: "sao", role_code: "SAO", staff_grade: "Worker" },
  { staff_code: "OPO-001", package_id: "opo", role_code: "OPO", staff_grade: "Manager" },
  { staff_code: "ARO-001", package_id: "aro", role_code: "ARO", staff_grade: "Worker" },
  { staff_code: "DATA-001", package_id: "fao", role_code: "FAO", staff_grade: "Assistant" }
];

export function validateAwiaPackageRegistry(registry = awiaVirtualStaffPackageRegistry) {
  const findings = [];
  const entries = Array.isArray(registry?.entries) ? registry.entries : [];
  const ids = new Set();
  const names = new Set();

  if (!registry?.registry_id) findings.push({ code: "REGISTRY_ID_REQUIRED", severity: "ERROR" });
  if (registry?.implementation_boundary !== "metadata_and_validation_only_no_autonomous_staff_activation") {
    findings.push({ code: "IMPLEMENTATION_BOUNDARY_REQUIRED", severity: "ERROR" });
  }

  for (const entry of entries) {
    if (!entry.package_id) findings.push({ code: "PACKAGE_ID_REQUIRED", severity: "ERROR", source_name: entry.source_name });
    if (ids.has(entry.package_id)) findings.push({ code: "DUPLICATE_PACKAGE_ID", severity: "ERROR", package_id: entry.package_id });
    ids.add(entry.package_id);

    if (!entry.source_name) findings.push({ code: "SOURCE_NAME_REQUIRED", severity: "ERROR", package_id: entry.package_id });
    if (names.has(entry.source_name)) findings.push({ code: "DUPLICATE_SOURCE_NAME", severity: "ERROR", source_name: entry.source_name });
    names.add(entry.source_name);

    if (!entry.source_path) findings.push({ code: "SOURCE_PATH_REQUIRED", severity: "ERROR", package_id: entry.package_id });
    if (!packageRegistryStatuses.includes(entry.registry_status)) {
      findings.push({ code: "UNKNOWN_REGISTRY_STATUS", severity: "ERROR", package_id: entry.package_id, registry_status: entry.registry_status });
    }
    if (!runtimeEligibilityByStatus[entry.registry_status]) {
      findings.push({ code: "RUNTIME_ELIGIBILITY_UNMAPPED", severity: "ERROR", package_id: entry.package_id, registry_status: entry.registry_status });
    }
    if (!entry.default_boundary) findings.push({ code: "DEFAULT_BOUNDARY_REQUIRED", severity: "ERROR", package_id: entry.package_id });
    if (entry.package_kind === "business_staff_package" && !entry.role_code) {
      findings.push({ code: "BUSINESS_STAFF_ROLE_CODE_REQUIRED", severity: "ERROR", package_id: entry.package_id });
    }
  }

  for (const sourceName of [
    "ARO",
    "AWIA",
    "CFO",
    "CHRO",
    "CIO",
    "CMO",
    "Construction",
    "COO",
    "CTO",
    "ECC-main",
    "FAO",
    "OPO",
    "SAO",
    "vFirm",
    "virtual-firm",
    "_archive",
    "_cowork-ready"
  ]) {
    if (!names.has(sourceName)) findings.push({ code: "SOURCE_FOLDER_UNMAPPED", severity: "ERROR", source_name: sourceName });
  }

  for (const staff of firstPilotStaffSet) {
    const entry = entries.find((item) => item.package_id === staff.package_id);
    if (!entry) findings.push({ code: "PILOT_STAFF_PACKAGE_UNMAPPED", severity: "ERROR", staff_code: staff.staff_code, package_id: staff.package_id });
    if (entry && ["DRAFT", "PLANNED", "ARCHIVE", "SUPPORT", "RETIRED"].includes(entry.registry_status)) {
      findings.push({ code: "PILOT_STAFF_PACKAGE_NOT_RUNTIME_ELIGIBLE", severity: "ERROR", staff_code: staff.staff_code, package_id: staff.package_id, registry_status: entry.registry_status });
    }
  }

  return {
    ok: findings.filter((finding) => finding.severity === "ERROR").length === 0,
    findings,
    summary: {
      entry_count: entries.length,
      business_staff_package_count: entries.filter((entry) => entry.package_kind === "business_staff_package").length,
      runtime_candidate_count: entries.filter((entry) => ["REFERENCE_PINNED", "VALIDATED_CANDIDATE", "CANDIDATE"].includes(entry.registry_status)).length,
      catalogue_only_count: entries.filter((entry) => ["DRAFT", "PLANNED"].includes(entry.registry_status)).length,
      reference_only_count: entries.filter((entry) => ["REFERENCE_TOOLING", "REFERENCE_ARCHITECTURE", "REFERENCE_DOMAIN", "LEGACY_REFERENCE", "ARCHIVE", "SUPPORT"].includes(entry.registry_status)).length
    }
  };
}
