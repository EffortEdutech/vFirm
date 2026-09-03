import { access, readFile } from "node:fs/promises";

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
  "docs/10_post_freeze_technical_design/OP_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE_DECISION_v1.0.md",
  "docs/10_post_freeze_technical_design/OP_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE_GATE_v1.0.md",
  "docs/10_post_freeze_technical_design/OP_EVIDENCE_PACK_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/OP_H5_PILOT_EVIDENCE_AUDIT_EXPORT_CLOSEOUT_REVIEW_v1.0.md",
  "docs/10_post_freeze_technical_design/OP_H4_NHL_GLOBAL_SOLUTION_PILOT_DAY_REHEARSAL_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/OP_H3_FORMWORK_PILOT_DAY_REHEARSAL_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/OP_H1_TO_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_CHECKLIST_v1.0.md"
];

for (const doc of requiredDocs) {
  assert(await exists(doc), `Required OP acceptance decision evidence missing: ${doc}`);
}

const acceptance = await readFile("docs/10_post_freeze_technical_design/OP_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE_DECISION_v1.0.md", "utf8");
const gate = await readFile("docs/10_post_freeze_technical_design/OP_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE_GATE_v1.0.md", "utf8");
const evidencePack = await readFile("docs/10_post_freeze_technical_design/OP_EVIDENCE_PACK_COMPLETION_v1.0.md", "utf8");
const decisions = await readFile("docs/00_project_control/DECISION_REGISTER.md", "utf8");
const readme = await readFile("docs/10_post_freeze_technical_design/README.md", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

const requiredAcceptancePhrases = [
  "status: \"Accepted\"",
  "I accept OP-H1 through OP-H6 controlled multi-firm pilot operations readiness",
  "controlled local/private pilot operation of Amanah Formwork Pilot Firm and NHL Global Solution",
  "Amanah Formwork Pilot Firm",
  "NHL Global Solution",
  "VF-FORMWORK-PILOT",
  "VF-ORG-SUPPORT-PILOT",
  "Next scope decision required"
];

for (const phrase of requiredAcceptancePhrases) {
  assert(acceptance.includes(phrase), `OP acceptance decision missing phrase: ${phrase}`);
}

const lockedBoundaries = [
  "production multi-tenant onboarding",
  "public marketplace",
  "live matching",
  "ranking",
  "capacity allocation",
  "VF-24 observatory publication",
  "pricing intelligence",
  "autonomous award",
  "autonomous regulated approval",
  "live payment movement",
  "uncontrolled tenant/client data sharing"
];

for (const phrase of lockedBoundaries) {
  assert(acceptance.toLowerCase().includes(phrase.toLowerCase()), `OP acceptance missing locked boundary: ${phrase}`);
  assert(gate.toLowerCase().includes(phrase.toLowerCase()), `OP-H6 gate missing locked boundary: ${phrase}`);
}

for (const phrase of [
  "GO_FOR_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE_REVIEW",
  "NO_CROSS_TENANT_LEAKAGE_OBSERVED_IN_CONTROLLED_REHEARSAL",
  "HUMAN_AUTHORITY_BOUNDARY_PRESERVED"
]) {
  assert(evidencePack.includes(phrase), `OP evidence pack missing marker: ${phrase}`);
}

assert(decisions.includes("ADR-061 - OP controlled multi-firm pilot operations accepted"), "ADR-061 missing from decision register.");
assert(readme.includes("OP_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE_DECISION_v1.0.md"), "OP acceptance decision missing from technical design index.");
assert(packageJson.scripts["check:op:acceptance:decision"] === "node scripts/smoke-op-acceptance-decision.mjs", "check:op:acceptance:decision package script missing.");
assert(packageJson.scripts.check.includes("smoke-op-acceptance-decision.mjs"), "Full check chain must include OP acceptance decision smoke.");

console.log(JSON.stringify({
  smoke: "op-acceptance-decision",
  result: "passed",
  accepted_scope: "controlled local/private pilot operation of Amanah Formwork Pilot Firm and NHL Global Solution",
  accepted_workspaces: [
    "Amanah Formwork Pilot Firm",
    "NHL Global Solution"
  ],
  docs_checked: requiredDocs.length,
  next_status: "new_bounded_scope_decision_required",
  locked_boundaries: lockedBoundaries
}, null, 2));
