import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();

const required = [
  "AGENTS.md",
  "README.md",
  "docs/00_project_control/README_FOR_BUILDERS_v1.0.md",
  "docs/00_project_control/VF_IMPLEMENTATION_BLUEPRINT_v1.0.md",
  "docs/01_foundation/VF-01_Virtual_Firm_Foundation_v1.0.md",
  "docs/01_foundation/VF-02_Workforce_Catalogue_and_Provisioning_v1.0.md",
  "docs/01_foundation/VF_PLATFORM_DOCTRINE_v1.0.md",
  "docs/08_shared_assets/ARCHITECTURE_BASELINE_V1_FREEZE_STATUS.md",
  "docs/08_shared_assets/ARCHITECTURE_BASELINE_V1_FREEZE_CHECKLIST.md",
  "docs/08_shared_assets/VF-09_TO_VF-15_DEVELOPMENT_EXPANSION_v1.0.md",
  "docs/08_shared_assets/VF-16_TO_VF-24_DEVELOPMENT_EXPANSION_v1.0.md",
  "docs/08_shared_assets/CANONICAL_SCHEMA_CATALOGUE_v1.0.md",
  "docs/08_shared_assets/CANONICAL_EVENT_CATALOGUE_v1.0.md",
  "docs/08_shared_assets/CANONICAL_POLICY_MODEL_v1.0.md",
  "docs/08_shared_assets/AUTHORITY_AUTONOMY_VOCABULARY_MAP_v1.0.md",
  "docs/08_shared_assets/ARCHITECTURE_CONFORMANCE_REVIEW_v1.0.md",
  "docs/08_shared_assets/PRE_BUILD_READINESS_REPORT_v1.0.md",
  "docs/08_shared_assets/FINAL_DOCUMENT_AUDIT_BEFORE_FREEZE_v1.0.md",
  "docs/09_reference_implementations/VF-SP-001_Formwork_Engineering/VF-SP-001_Formwork_Engineering_Backlog_v1.0.md",
  "docs/10_post_freeze_technical_design/README.md",
  "docs/10_post_freeze_technical_design/TECHNICAL_DESIGN_MVP_v1.0.md",
  "docs/10_post_freeze_technical_design/DATABASE_SCHEMA_PLAN_v1.0.md",
  "docs/10_post_freeze_technical_design/API_CONTRACT_PLAN_v1.0.md",
  "docs/10_post_freeze_technical_design/EVENT_PAYLOAD_SCHEMA_PLAN_v1.0.md",
  "docs/10_post_freeze_technical_design/POLICY_TEST_PLAN_v1.0.md",
  "docs/10_post_freeze_technical_design/FORMWORK_SERVICE_PACK_SPEC_v1.0.md",
  "docs/10_post_freeze_technical_design/STACK_AND_DATABASE_DECISION_v1.0.md",
  "docs/10_post_freeze_technical_design/STAGE_1_MVP_OPERATING_LOOP_COMPLETION_v1.0.md"
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      files.push(...await walk(path));
    } else {
      files.push(path);
    }
  }
  return files;
}

const failures = [];

for (const file of required) {
  try {
    await stat(join(root, file));
  } catch {
    failures.push(`Missing required file: ${file}`);
  }
}

await walk(join(root, "docs"));

if (failures.length > 0) {
  console.error("Baseline validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Baseline validation passed.");


