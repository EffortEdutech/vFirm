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
  "docs/10_post_freeze_technical_design/PD_H3_PRIVATE_DIRECTORY_PILOT_ACCEPTANCE_GATE_v1.0.md",
  "docs/10_post_freeze_technical_design/PD_H3_PRIVATE_DIRECTORY_PILOT_ACCEPTANCE_DECISION_v1.0.md",
  "docs/10_post_freeze_technical_design/PD_H2_PRIVATE_DIRECTORY_PILOT_REHEARSAL_EVIDENCE_PACK_v1.0.md",
  "docs/10_post_freeze_technical_design/PD_H2_PRIVATE_DIRECTORY_PILOT_REHEARSAL_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/PD_H1_PRIVATE_DIRECTORY_OPERATOR_WALKTHROUGH_RUNBOOK_v1.0.md",
  "docs/10_post_freeze_technical_design/ME_S7_MARKETPLACE_ECOSYSTEM_RELEASE_GATE_COMPLETION_v1.0.md"
];

for (const doc of requiredDocs) {
  assert(await exists(doc), `Required PD-H3 acceptance evidence missing: ${doc}`);
}

const acceptance = await readFile("docs/10_post_freeze_technical_design/PD_H3_PRIVATE_DIRECTORY_PILOT_ACCEPTANCE_DECISION_v1.0.md", "utf8");
const gate = await readFile("docs/10_post_freeze_technical_design/PD_H3_PRIVATE_DIRECTORY_PILOT_ACCEPTANCE_GATE_v1.0.md", "utf8");
const decisions = await readFile("docs/00_project_control/DECISION_REGISTER.md", "utf8");
const readme = await readFile("docs/10_post_freeze_technical_design/README.md", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

const requiredAcceptancePhrases = [
  "status: \"Accepted\"",
  "authorize controlled human pilot operation for the private directory only",
  "PD-H4 - Controlled Private Directory Pilot Operation Runbook and Pilot Log"
];

for (const phrase of requiredAcceptancePhrases) {
  assert(acceptance.includes(phrase), `PD-H3 acceptance decision missing phrase: ${phrase}`);
}

const forbiddenWidening = [
  "public marketplace",
  "live matching",
  "ranking",
  "capacity allocation",
  "VF-24 observatory publication",
  "pricing intelligence",
  "autonomous award",
  "autonomous regulated approval"
];

for (const phrase of forbiddenWidening) {
  assert(acceptance.toLowerCase().includes(phrase.toLowerCase()), `PD-H3 acceptance missing locked boundary: ${phrase}`);
  assert(gate.toLowerCase().includes(phrase.toLowerCase()), `PD-H3 gate missing locked boundary: ${phrase}`);
}

assert(decisions.includes("ADR-039 - PD-H3 private directory pilot readiness accepted"), "ADR-039 missing from decision register.");
assert(readme.includes("PD_H3_PRIVATE_DIRECTORY_PILOT_ACCEPTANCE_DECISION_v1.0.md"), "PD-H3 acceptance decision missing from technical design index.");
assert(packageJson.scripts["check:pd:h3:acceptance"] === "node scripts/smoke-pd-h3-private-directory-pilot-acceptance-decision.mjs", "check:pd:h3:acceptance package script missing.");
assert(packageJson.scripts.check.includes("smoke-pd-h3-private-directory-pilot-acceptance-decision.mjs"), "Full check chain must include PD-H3 acceptance decision smoke.");

console.log(JSON.stringify({
  smoke: "pd-h3-private-directory-pilot-acceptance-decision",
  result: "passed",
  accepted_scope: "controlled human pilot operation for private directory only",
  docs_checked: requiredDocs.length,
  locked_boundaries: forbiddenWidening
}, null, 2));