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
  "docs/10_post_freeze_technical_design/PD_H1_PRIVATE_DIRECTORY_OPERATOR_WALKTHROUGH_RUNBOOK_v1.0.md",
  "docs/10_post_freeze_technical_design/PD_H1_PRIVATE_DIRECTORY_PRODUCT_HARDENING_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/PD_H2_PRIVATE_DIRECTORY_PILOT_REHEARSAL_EVIDENCE_PACK_v1.0.md",
  "docs/10_post_freeze_technical_design/PD_H2_PRIVATE_DIRECTORY_PILOT_REHEARSAL_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/PD_H3_PRIVATE_DIRECTORY_PILOT_ACCEPTANCE_GATE_v1.0.md",
  "docs/10_post_freeze_technical_design/ME_S7_MARKETPLACE_ECOSYSTEM_RELEASE_GATE_COMPLETION_v1.0.md"
];

for (const doc of requiredDocs) {
  assert(await exists(doc), `Required PD-H3 gate document missing: ${doc}`);
}

const gate = await readFile("docs/10_post_freeze_technical_design/PD_H3_PRIVATE_DIRECTORY_PILOT_ACCEPTANCE_GATE_v1.0.md", "utf8");
const pdH2Evidence = await readFile("docs/10_post_freeze_technical_design/PD_H2_PRIVATE_DIRECTORY_PILOT_REHEARSAL_EVIDENCE_PACK_v1.0.md", "utf8");
const pdH2Completion = await readFile("docs/10_post_freeze_technical_design/PD_H2_PRIVATE_DIRECTORY_PILOT_REHEARSAL_COMPLETION_v1.0.md", "utf8");
const pdH1Completion = await readFile("docs/10_post_freeze_technical_design/PD_H1_PRIVATE_DIRECTORY_PRODUCT_HARDENING_COMPLETION_v1.0.md", "utf8");
const decisions = await readFile("docs/00_project_control/DECISION_REGISTER.md", "utf8");
const readme = await readFile("docs/10_post_freeze_technical_design/README.md", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

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

assert(gate.includes("Pending Product-Owner Decision"), "PD-H3 gate must remain pending product-owner decision.");
assert(gate.includes("GO_FOR_CONTROLLED_PRIVATE_DIRECTORY_PILOT_ACCEPTANCE"), "PD-H3 technical recommendation missing.");
assert(gate.includes("Decision option A - Accept private directory pilot readiness"), "PD-H3 accept option missing.");
assert(gate.includes("Decision option B - Hold private directory pilot readiness"), "PD-H3 hold option missing.");
assert(gate.includes("Decision option C - Reject private directory pilot readiness"), "PD-H3 reject option missing.");

for (const phrase of boundaryPhrases) {
  assert(gate.toLowerCase().includes(phrase.toLowerCase()), `PD-H3 gate missing boundary: ${phrase}`);
  assert(pdH2Evidence.toLowerCase().includes(phrase.toLowerCase()), `PD-H2 evidence missing boundary inherited by PD-H3: ${phrase}`);
}

assert(pdH1Completion.includes("Private Directory Product Hardening"), "PD-H1 completion evidence missing expected hardening statement.");
assert(pdH2Completion.includes("Private Directory Pilot Rehearsal"), "PD-H2 completion evidence missing expected rehearsal statement.");
assert(pdH2Completion.includes("npm run check:pd:h2:postgres"), "PD-H2 PostgreSQL evidence missing from completion document.");
assert(readme.includes("PD_H3_PRIVATE_DIRECTORY_PILOT_ACCEPTANCE_GATE_v1.0.md"), "PD-H3 gate missing from technical design index.");
assert(decisions.includes("ADR-038 - PD-H3 private directory pilot acceptance gate prepared"), "ADR-038 missing from decision register.");
assert(packageJson.scripts["check:pd:h3"] === "node scripts/smoke-pd-h3-private-directory-pilot-acceptance-gate.mjs", "check:pd:h3 package script missing.");
assert(packageJson.scripts.check.includes("smoke-pd-h3-private-directory-pilot-acceptance-gate.mjs"), "Full check chain must include PD-H3 acceptance gate smoke.");
assert(packageJson.scripts.check.includes("smoke-pd-h2-private-directory-pilot-rehearsal.mjs --postgres"), "Full check chain must retain PD-H2 PostgreSQL evidence.");

console.log(JSON.stringify({
  smoke: "pd-h3-private-directory-pilot-acceptance-gate",
  result: "passed",
  gate_status: "pending_product_owner_decision",
  technical_recommendation: "GO_FOR_CONTROLLED_PRIVATE_DIRECTORY_PILOT_ACCEPTANCE",
  docs_checked: requiredDocs.length,
  boundaries: boundaryPhrases
}, null, 2));
