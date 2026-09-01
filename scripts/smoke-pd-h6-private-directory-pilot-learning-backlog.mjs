import { readFile, access } from "node:fs/promises";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const requiredDocs = [
  "docs/10_post_freeze_technical_design/PD_H3_PRIVATE_DIRECTORY_PILOT_ACCEPTANCE_DECISION_v1.0.md",
  "docs/10_post_freeze_technical_design/PD_H4_CONTROLLED_PRIVATE_DIRECTORY_PILOT_OPERATION_RUNBOOK_AND_LOG_v1.0.md",
  "docs/10_post_freeze_technical_design/PD_H5_CONTROLLED_PRIVATE_DIRECTORY_PILOT_CLOSEOUT_REVIEW_v1.0.md",
  "docs/10_post_freeze_technical_design/PD_H6_PRIVATE_DIRECTORY_PILOT_LEARNING_BACKLOG_AND_NEXT_SCOPE_DECISION_v1.0.md",
  "docs/10_post_freeze_technical_design/ME_S7_MARKETPLACE_ECOSYSTEM_RELEASE_GATE_COMPLETION_v1.0.md"
];

for (const doc of requiredDocs) {
  assert(await exists(doc), `Required PD-H6 learning evidence missing: ${doc}`);
}

const pdh6 = await readFile("docs/10_post_freeze_technical_design/PD_H6_PRIVATE_DIRECTORY_PILOT_LEARNING_BACKLOG_AND_NEXT_SCOPE_DECISION_v1.0.md", "utf8");
const pdh5 = await readFile("docs/10_post_freeze_technical_design/PD_H5_CONTROLLED_PRIVATE_DIRECTORY_PILOT_CLOSEOUT_REVIEW_v1.0.md", "utf8");
const decisions = await readFile("docs/00_project_control/DECISION_REGISTER.md", "utf8");
const readme = await readFile("docs/10_post_freeze_technical_design/README.md", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

const backlogClasses = [
  "Operator usability",
  "Evidence quality",
  "Data protection",
  "Governance control",
  "Integration readiness",
  "Scope widening request",
  "Blocker",
  "Accepted limitation"
];

for (const item of backlogClasses) {
  assert(pdh6.includes(item), `PD-H6 missing backlog class: ${item}`);
}

const decisionOptions = [
  "Option A - Continue private directory pilot hardening",
  "Option B - Run a real controlled human pilot day first",
  "Option C - Hold and fix named blockers",
  "Option D - Prepare a new marketplace-widening decision gate"
];

for (const option of decisionOptions) {
  assert(pdh6.includes(option), `PD-H6 missing decision option: ${option}`);
}

const boundaryPhrases = [
  "public marketplace",
  "live matching",
  "ranking",
  "capacity allocation",
  "VF-24 observatory publication",
  "pricing intelligence",
  "autonomous award",
  "autonomous regulated approval"
];

for (const phrase of boundaryPhrases) {
  assert(pdh6.toLowerCase().includes(phrase.toLowerCase()), `PD-H6 missing locked boundary: ${phrase}`);
  assert(pdh5.toLowerCase().includes(phrase.toLowerCase()), `PD-H5 missing inherited boundary: ${phrase}`);
}

const seedItems = [
  "filled human pilot log rows",
  "operator screenshots",
  "enquiry with automatic award",
  "unresolved issue owners",
  "export checklist"
];

for (const item of seedItems) {
  assert(pdh6.toLowerCase().includes(item.toLowerCase()), `PD-H6 missing seed backlog item: ${item}`);
}

assert(pdh6.includes("Product-owner decision required"), "PD-H6 must end with product-owner decision required.");
assert(pdh6.includes("No PD-H7 implementation or marketplace-widening work should begin"), "PD-H6 must block automatic PD-H7 or widening work.");
assert(decisions.includes("ADR-042 - PD-H6 private directory pilot learning backlog and next scope decision prepared"), "ADR-042 missing from decision register.");
assert(readme.includes("PD_H6_PRIVATE_DIRECTORY_PILOT_LEARNING_BACKLOG_AND_NEXT_SCOPE_DECISION_v1.0.md"), "PD-H6 doc missing from technical design index.");
assert(packageJson.scripts["check:pd:h6"] === "node scripts/smoke-pd-h6-private-directory-pilot-learning-backlog.mjs", "check:pd:h6 package script missing.");
assert(packageJson.scripts.check.includes("smoke-pd-h6-private-directory-pilot-learning-backlog.mjs"), "Full check chain must include PD-H6 smoke.");

console.log(JSON.stringify({
  smoke: "pd-h6-private-directory-pilot-learning-backlog",
  result: "passed",
  status: "product_owner_next_scope_decision_required",
  docs_checked: requiredDocs.length,
  backlog_classes: backlogClasses.length,
  decision_options: decisionOptions.length,
  locked_boundaries: boundaryPhrases
}, null, 2));