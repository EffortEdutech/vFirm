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
  "docs/10_post_freeze_technical_design/MT_MULTI_TENANT_RUNTIME_BINDING_ACCEPTANCE_DECISION_GATE_v1.0.md",
  "docs/10_post_freeze_technical_design/MT_MULTI_TENANT_RUNTIME_BINDING_ACCEPTANCE_DECISION_v1.0.md",
  "docs/10_post_freeze_technical_design/MT_MULTI_TENANT_WORKSPACE_RUNTIME_BINDING_SPRINT_PLAN_v1.0.md",
  "docs/10_post_freeze_technical_design/MT_MULTI_TENANT_WORKSPACE_RUNTIME_BINDING_CHECKLIST_v1.0.md",
  "docs/10_post_freeze_technical_design/MT_H6_MULTI_TENANT_PILOT_REHEARSAL_AND_EVIDENCE_PACK_COMPLETION_v1.0.md"
];

for (const doc of requiredDocs) {
  assert(await exists(doc), `Required MT acceptance decision evidence missing: ${doc}`);
}

const acceptance = await readFile("docs/10_post_freeze_technical_design/MT_MULTI_TENANT_RUNTIME_BINDING_ACCEPTANCE_DECISION_v1.0.md", "utf8");
const gate = await readFile("docs/10_post_freeze_technical_design/MT_MULTI_TENANT_RUNTIME_BINDING_ACCEPTANCE_DECISION_GATE_v1.0.md", "utf8");
const h6Evidence = await readFile("docs/10_post_freeze_technical_design/MT_H6_MULTI_TENANT_PILOT_REHEARSAL_AND_EVIDENCE_PACK_COMPLETION_v1.0.md", "utf8");
const decisions = await readFile("docs/00_project_control/DECISION_REGISTER.md", "utf8");
const readme = await readFile("docs/10_post_freeze_technical_design/README.md", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

const requiredAcceptancePhrases = [
  "status: \"Accepted\"",
  "I accept MT-H1 through MT-H6 multi-tenant runtime binding",
  "controlled local/private pilot operation of the Formwork pilot firm and NHL Global Solution",
  "OP-H1 - Controlled Multi-Firm Pilot Operations Foundation"
];

for (const phrase of requiredAcceptancePhrases) {
  assert(acceptance.includes(phrase), `MT acceptance decision missing phrase: ${phrase}`);
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
  "live payment movement"
];

for (const phrase of lockedBoundaries) {
  assert(acceptance.toLowerCase().includes(phrase.toLowerCase()), `MT acceptance missing locked boundary: ${phrase}`);
  assert(gate.toLowerCase().includes(phrase.toLowerCase()), `MT gate missing locked boundary: ${phrase}`);
}

for (const phrase of ["Amanah Formwork Pilot Firm", "NHL Global Solution", "VF-FORMWORK-PILOT", "VF-ORG-SUPPORT-PILOT"]) {
  assert(acceptance.includes(phrase), `MT acceptance missing pilot workspace phrase: ${phrase}`);
  assert(h6Evidence.includes(phrase), `MT-H6 evidence missing pilot workspace phrase: ${phrase}`);
}

assert(decisions.includes("ADR-053 - MT multi-tenant runtime binding accepted"), "ADR-053 missing from decision register.");
assert(readme.includes("MT_MULTI_TENANT_RUNTIME_BINDING_ACCEPTANCE_DECISION_v1.0.md"), "MT acceptance decision missing from technical design index.");
assert(packageJson.scripts["check:mt:acceptance:decision"] === "node scripts/smoke-mt-acceptance-decision.mjs", "check:mt:acceptance:decision package script missing.");
assert(packageJson.scripts.check.includes("smoke-mt-acceptance-decision.mjs"), "Full check chain must include MT acceptance decision smoke.");

console.log(JSON.stringify({
  smoke: "mt-acceptance-decision",
  result: "passed",
  accepted_scope: "controlled local/private pilot operation of Formwork and NHL active firm workspaces",
  next_recommended_scope: "OP-H1 - Controlled Multi-Firm Pilot Operations Foundation",
  docs_checked: requiredDocs.length,
  locked_boundaries: lockedBoundaries
}, null, 2));
