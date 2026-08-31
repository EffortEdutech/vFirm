import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();

const requiredDocs = [
  "docs/10_post_freeze_technical_design/R4_ENTRY_SETUP_DECISION_v1.0.md",
  "docs/10_post_freeze_technical_design/VFIRM_RELEASE_4_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md",
  "docs/10_post_freeze_technical_design/VFIRM_RELEASE_4_IMPLEMENTATION_CHECKLIST_v1.0.md",
  "docs/10_post_freeze_technical_design/VFIRM_RELEASE_4_EVIDENCE_PACK_TEMPLATE_v1.0.md",
  "docs/10_post_freeze_technical_design/R3_ACCEPTANCE_AND_R4_SCOPE_AUTHORIZATION_v1.0.md",
  "docs/00_project_control/DECISION_REGISTER.md"
];

const requiredPhrases = [
  "provider-neutral external identity adapter contract",
  "controlled staging/private pilot",
  "Product owner is interim pilot cohort owner",
  "Product owner is interim support owner",
  "Product owner is interim data protection owner",
  "Product owner is interim incident owner",
  "public marketplace",
  "trusted specialist network",
  "VF-24 ecosystem intelligence",
  "autonomous regulated approval",
  "live payment movement",
  "R4-S1 - Staging Identity and Tenant Admin may begin"
];

const failures = [];

async function readRequired(relativePath) {
  try {
    return await readFile(join(root, relativePath), "utf8");
  } catch (error) {
    failures.push(`Missing or unreadable file: ${relativePath}`);
    return "";
  }
}

const entryDecision = await readRequired("docs/10_post_freeze_technical_design/R4_ENTRY_SETUP_DECISION_v1.0.md");
for (const phrase of requiredPhrases) {
  if (!entryDecision.includes(phrase)) failures.push(`R4 entry decision missing phrase: ${phrase}`);
}

for (const doc of requiredDocs) await readRequired(doc);

const r4Plan = await readRequired("docs/10_post_freeze_technical_design/VFIRM_RELEASE_4_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md");
for (const checkedEntry of [
  "- [x] Authentication provider decision recorded.",
  "- [x] Deployment environment selected.",
  "- [x] Pilot cohort owner named.",
  "- [x] Support owner named.",
  "- [x] Data protection owner named.",
  "- [x] Incident owner named."
]) {
  if (!r4Plan.includes(checkedEntry)) failures.push(`R4 plan entry criterion not checked: ${checkedEntry}`);
}

const decisionRegister = await readRequired("docs/00_project_control/DECISION_REGISTER.md");
if (!decisionRegister.includes("ADR-022 - Release 4 entry setup accepted and R4-S1 authorized")) {
  failures.push("Decision register missing ADR-022.");
}

const index = await readRequired("docs/10_post_freeze_technical_design/README.md");
for (const indexedDoc of [
  "R4_ENTRY_SETUP_DECISION_v1.0.md",
  "VFIRM_RELEASE_4_IMPLEMENTATION_CHECKLIST_v1.0.md",
  "VFIRM_RELEASE_4_EVIDENCE_PACK_TEMPLATE_v1.0.md"
]) {
  if (!index.includes(indexedDoc)) failures.push(`Post-freeze index missing ${indexedDoc}.`);
}

if (failures.length > 0) {
  console.error("R4 entry setup smoke failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const mode = process.argv.includes("--postgres")
  ? "postgres-entry"
  : process.argv.includes("--staging")
    ? "staging-entry"
    : "entry";

console.log(JSON.stringify({
  smoke: "r4-entry-setup",
  mode,
  result: "passed",
  r4_s1_status: "ready",
  boundary: "controlled staging/private pilot only"
}, null, 2));
