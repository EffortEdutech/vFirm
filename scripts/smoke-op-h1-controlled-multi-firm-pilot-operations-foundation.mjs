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
  "docs/10_post_freeze_technical_design/MT_MULTI_TENANT_RUNTIME_BINDING_ACCEPTANCE_DECISION_v1.0.md",
  "docs/10_post_freeze_technical_design/OP_H1_TO_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_SPRINT_PLAN_v1.0.md",
  "docs/10_post_freeze_technical_design/OP_H1_TO_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_CHECKLIST_v1.0.md",
  "docs/10_post_freeze_technical_design/OP_H1_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_FOUNDATION_v1.0.md",
  "docs/10_post_freeze_technical_design/OP_H1_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_FOUNDATION_COMPLETION_v1.0.md"
];

for (const doc of requiredDocs) {
  assert(await exists(doc), `Required OP-H1 document missing: ${doc}`);
}

const plan = await readFile("docs/10_post_freeze_technical_design/OP_H1_TO_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_SPRINT_PLAN_v1.0.md", "utf8");
const checklist = await readFile("docs/10_post_freeze_technical_design/OP_H1_TO_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_CHECKLIST_v1.0.md", "utf8");
const foundation = await readFile("docs/10_post_freeze_technical_design/OP_H1_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_FOUNDATION_v1.0.md", "utf8");
const completion = await readFile("docs/10_post_freeze_technical_design/OP_H1_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_FOUNDATION_COMPLETION_v1.0.md", "utf8");
const mtAcceptance = await readFile("docs/10_post_freeze_technical_design/MT_MULTI_TENANT_RUNTIME_BINDING_ACCEPTANCE_DECISION_v1.0.md", "utf8");
const decisions = await readFile("docs/00_project_control/DECISION_REGISTER.md", "utf8");
const readme = await readFile("docs/10_post_freeze_technical_design/README.md", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

const requiredFoundationPhrases = [
  "pilot operation scope contract",
  "Pilot Operator",
  "Virtual Principal",
  "Responsible Professional",
  "AI Worker",
  "active-firm readiness model",
  "pilot-day checklist model",
  "firm-scoped pilot activity log model",
  "Issue, incident, and support log model",
  "Manual approval categories",
  "Exception categories",
  "OP-H2 - Operator Dashboard and Today View"
];

for (const phrase of requiredFoundationPhrases) {
  assert(foundation.toLowerCase().includes(phrase.toLowerCase()) || completion.toLowerCase().includes(phrase.toLowerCase()), `OP-H1 foundation missing phrase: ${phrase}`);
}

const requiredFields = [
  "tenant_id",
  "firm_id",
  "pilot_day_id",
  "actor_id",
  "actor_type",
  "evidence_summary",
  "readiness_status",
  "issue_type",
  "severity",
  "status"
];

for (const field of requiredFields) {
  assert(foundation.includes(field), `OP-H1 foundation missing required field: ${field}`);
}

const pilotFirmPhrases = [
  "Amanah Formwork Pilot Firm",
  "NHL Global Solution",
  "Nur Hernieliana",
  "FORMWORK_ENGINEERING",
  "ORGANIZATION_SUPPORT",
  "VF-FORMWORK-PILOT",
  "VF-ORG-SUPPORT-PILOT",
  "BizKick EDCS"
];

for (const phrase of pilotFirmPhrases) {
  assert(foundation.includes(phrase) || mtAcceptance.includes(phrase), `OP-H1 missing pilot firm phrase: ${phrase}`);
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
  "uncontrolled tenant or client data sharing"
];

for (const phrase of lockedBoundaries) {
  assert(foundation.toLowerCase().includes(phrase.toLowerCase()), `OP-H1 foundation missing locked boundary: ${phrase}`);
  assert(completion.toLowerCase().includes(phrase.toLowerCase()), `OP-H1 completion missing locked boundary: ${phrase}`);
}

const checkedH1Items = [
  "- [x] Define pilot operation scope contract.",
  "- [x] Define pilot operator roles and responsibilities.",
  "- [x] Define active-firm readiness model.",
  "- [x] Define pilot-day checklist model.",
  "- [x] Define firm-scoped pilot activity log model.",
  "- [x] Define issue, incident, and support log model.",
  "- [x] Define manual approval and exception categories.",
  "- [x] Verify all OP records are tenant/firm scoped.",
  "- [x] Add OP-H1 smoke/static validation.",
  "- [x] Update decision register."
];

for (const item of checkedH1Items) {
  assert(checklist.includes(item), `OP-H1 checklist item not checked: ${item}`);
}

assert(plan.includes("OP-H1 - Controlled Multi-Firm Pilot Operations Foundation"), "OP plan missing normalized OP-H1 heading.");
assert(decisions.includes("ADR-055 - OP-H1 controlled multi-firm pilot operations foundation completed"), "ADR-055 missing from decision register.");
assert(readme.includes("OP_H1_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_FOUNDATION_v1.0.md"), "OP-H1 foundation missing from technical design index.");
assert(readme.includes("OP_H1_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_FOUNDATION_COMPLETION_v1.0.md"), "OP-H1 completion missing from technical design index.");
assert(packageJson.scripts["check:op:h1"] === "node scripts/smoke-op-h1-controlled-multi-firm-pilot-operations-foundation.mjs", "check:op:h1 package script missing.");
assert(packageJson.scripts.check.includes("smoke-op-h1-controlled-multi-firm-pilot-operations-foundation.mjs"), "Full check chain must include OP-H1 smoke.");

console.log(JSON.stringify({
  smoke: "op-h1-controlled-multi-firm-pilot-operations-foundation",
  result: "passed",
  status: "foundation_locked",
  docs_checked: requiredDocs.length,
  records_scoped_by: ["tenant_id", "firm_id", "pilot_day_id", "actor_id", "actor_type"],
  pilot_workspaces: ["Amanah Formwork Pilot Firm", "NHL Global Solution"],
  next_active_sprint: "OP-H2 - Operator Dashboard and Today View",
  locked_boundaries: lockedBoundaries
}, null, 2));
