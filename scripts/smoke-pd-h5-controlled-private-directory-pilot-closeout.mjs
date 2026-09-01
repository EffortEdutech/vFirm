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
  "docs/10_post_freeze_technical_design/PD_H2_PRIVATE_DIRECTORY_PILOT_REHEARSAL_EVIDENCE_PACK_v1.0.md"
];

for (const doc of requiredDocs) {
  assert(await exists(doc), `Required PD-H5 closeout evidence missing: ${doc}`);
}

const closeout = await readFile("docs/10_post_freeze_technical_design/PD_H5_CONTROLLED_PRIVATE_DIRECTORY_PILOT_CLOSEOUT_REVIEW_v1.0.md", "utf8");
const operation = await readFile("docs/10_post_freeze_technical_design/PD_H4_CONTROLLED_PRIVATE_DIRECTORY_PILOT_OPERATION_RUNBOOK_AND_LOG_v1.0.md", "utf8");
const acceptance = await readFile("docs/10_post_freeze_technical_design/PD_H3_PRIVATE_DIRECTORY_PILOT_ACCEPTANCE_DECISION_v1.0.md", "utf8");
const decisions = await readFile("docs/00_project_control/DECISION_REGISTER.md", "utf8");
const readme = await readFile("docs/10_post_freeze_technical_design/README.md", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

const evidenceItems = [
  "Pilot operation log",
  "Readiness summary evidence",
  "Listing evidence",
  "Review Board evidence",
  "Enquiry evidence",
  "Collaboration request evidence",
  "Renewal/expiry evidence",
  "Issue/incident register",
  "Boundary confirmation",
  "Export readiness note",
  "Human closeout sign-off"
];

for (const item of evidenceItems) {
  assert(closeout.includes(item), `PD-H5 closeout missing evidence item: ${item}`);
}

const classifications = ["Accepted limitation", "Improvement", "Blocker", "Incident", "Scope breach"];
for (const classification of classifications) {
  assert(closeout.includes(classification), `PD-H5 closeout missing issue classification: ${classification}`);
}

const decisionOptions = ["Option A - Accept closeout", "Option B - Hold closeout", "Option C - Reject closeout"];
for (const option of decisionOptions) {
  assert(closeout.includes(option), `PD-H5 closeout missing decision option: ${option}`);
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
  assert(closeout.toLowerCase().includes(phrase.toLowerCase()), `PD-H5 closeout missing locked boundary: ${phrase}`);
  assert(operation.toLowerCase().includes(phrase.toLowerCase()), `PD-H4 operation runbook missing inherited boundary: ${phrase}`);
  assert(acceptance.toLowerCase().includes(phrase.toLowerCase()), `PD-H3 acceptance missing inherited boundary: ${phrase}`);
}

assert(closeout.includes("SIMULATED_CLOSEOUT_READY_FOR_HUMAN_PILOT_USE"), "PD-H5 simulated closeout result missing.");
assert(closeout.includes("actual production pilot closeout still requires a filled pilot operation log"), "PD-H5 must not pretend a real production pilot closeout already happened.");
assert(closeout.includes("PD-H6 - Private Directory Pilot Learning Backlog and Next Scope Decision"), "PD-H5 must identify PD-H6 as the recommended next step.");
assert(decisions.includes("ADR-041 - PD-H5 controlled private directory pilot closeout review completed"), "ADR-041 missing from decision register.");
assert(readme.includes("PD_H5_CONTROLLED_PRIVATE_DIRECTORY_PILOT_CLOSEOUT_REVIEW_v1.0.md"), "PD-H5 closeout doc missing from technical design index.");
assert(packageJson.scripts["check:pd:h5"] === "node scripts/smoke-pd-h5-controlled-private-directory-pilot-closeout.mjs", "check:pd:h5 package script missing.");
assert(packageJson.scripts.check.includes("smoke-pd-h5-controlled-private-directory-pilot-closeout.mjs"), "Full check chain must include PD-H5 closeout smoke.");

console.log(JSON.stringify({
  smoke: "pd-h5-controlled-private-directory-pilot-closeout",
  result: "passed",
  closeout_result: "SIMULATED_CLOSEOUT_READY_FOR_HUMAN_PILOT_USE",
  docs_checked: requiredDocs.length,
  evidence_items: evidenceItems.length,
  classifications: classifications.length,
  locked_boundaries: boundaryPhrases
}, null, 2));