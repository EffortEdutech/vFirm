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
  "docs/10_post_freeze_technical_design/PD_H2_PRIVATE_DIRECTORY_PILOT_REHEARSAL_EVIDENCE_PACK_v1.0.md",
  "docs/10_post_freeze_technical_design/PD_H1_PRIVATE_DIRECTORY_OPERATOR_WALKTHROUGH_RUNBOOK_v1.0.md"
];

for (const doc of requiredDocs) {
  assert(await exists(doc), `Required PD-H4 operating evidence missing: ${doc}`);
}

const runbook = await readFile("docs/10_post_freeze_technical_design/PD_H4_CONTROLLED_PRIVATE_DIRECTORY_PILOT_OPERATION_RUNBOOK_AND_LOG_v1.0.md", "utf8");
const acceptance = await readFile("docs/10_post_freeze_technical_design/PD_H3_PRIVATE_DIRECTORY_PILOT_ACCEPTANCE_DECISION_v1.0.md", "utf8");
const decisions = await readFile("docs/00_project_control/DECISION_REGISTER.md", "utf8");
const readme = await readFile("docs/10_post_freeze_technical_design/README.md", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

const requiredSections = [
  "Authorized operating scope",
  "Pilot roles and responsibility boundaries",
  "Daily controlled pilot routine",
  "Pilot operation log template",
  "Issue and incident path",
  "Evidence capture routine",
  "Pilot closeout checklist",
  "Pilot log sample"
];

for (const section of requiredSections) {
  assert(runbook.includes(section), `PD-H4 runbook missing section: ${section}`);
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
  assert(runbook.toLowerCase().includes(phrase.toLowerCase()), `PD-H4 runbook missing locked boundary: ${phrase}`);
  assert(acceptance.toLowerCase().includes(phrase.toLowerCase()), `PD-H3 acceptance missing locked boundary: ${phrase}`);
}

const requiredLogFields = [
  "log_id",
  "tenant_id",
  "operator_name",
  "action_type",
  "object_ref",
  "evidence_refs",
  "boundary_checked",
  "operator_signoff"
];

for (const field of requiredLogFields) {
  assert(runbook.includes(field), `PD-H4 pilot log missing required field: ${field}`);
}

assert(runbook.includes("PD-H5 - Controlled Private Directory Pilot Closeout Review"), "PD-H4 must identify PD-H5 as the recommended next step.");
assert(decisions.includes("ADR-040 - PD-H4 controlled private directory pilot operation runbook completed"), "ADR-040 missing from decision register.");
assert(readme.includes("PD_H4_CONTROLLED_PRIVATE_DIRECTORY_PILOT_OPERATION_RUNBOOK_AND_LOG_v1.0.md"), "PD-H4 runbook missing from technical design index.");
assert(packageJson.scripts["check:pd:h4"] === "node scripts/smoke-pd-h4-controlled-private-directory-pilot-operation.mjs", "check:pd:h4 package script missing.");
assert(packageJson.scripts.check.includes("smoke-pd-h4-controlled-private-directory-pilot-operation.mjs"), "Full check chain must include PD-H4 operation smoke.");

console.log(JSON.stringify({
  smoke: "pd-h4-controlled-private-directory-pilot-operation",
  result: "passed",
  operating_scope: "controlled human pilot operation for private directory only",
  docs_checked: requiredDocs.length,
  required_sections: requiredSections.length,
  log_fields: requiredLogFields.length,
  locked_boundaries: boundaryPhrases
}, null, 2));