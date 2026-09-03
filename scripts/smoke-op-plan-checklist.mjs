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
  "docs/10_post_freeze_technical_design/OP_H1_TO_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_CHECKLIST_v1.0.md"
];

for (const doc of requiredDocs) {
  assert(await exists(doc), `Required OP planning document missing: ${doc}`);
}

const plan = await readFile("docs/10_post_freeze_technical_design/OP_H1_TO_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_SPRINT_PLAN_v1.0.md", "utf8");
const checklist = await readFile("docs/10_post_freeze_technical_design/OP_H1_TO_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_CHECKLIST_v1.0.md", "utf8");
const mtAcceptance = await readFile("docs/10_post_freeze_technical_design/MT_MULTI_TENANT_RUNTIME_BINDING_ACCEPTANCE_DECISION_v1.0.md", "utf8");
const decisions = await readFile("docs/00_project_control/DECISION_REGISTER.md", "utf8");
const readme = await readFile("docs/10_post_freeze_technical_design/README.md", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

const sprintNames = [
  "OP-H1 — Controlled Multi-Firm Pilot Operations Foundation",
  "OP-H2 — Operator Dashboard and Today View",
  "OP-H3 — Formwork Pilot Day Rehearsal",
  "OP-H4 — NHL Global Solution Pilot Day Rehearsal",
  "OP-H5 — Pilot Evidence, Audit, Export, and Closeout Review",
  "OP-H6 — Controlled Multi-Firm Pilot Operations Acceptance Gate"
];

for (const sprint of sprintNames) {
  assert(plan.includes(sprint), `OP plan missing sprint: ${sprint}`);
  assert(checklist.includes(sprint), `OP checklist missing sprint: ${sprint}`);
}

const requiredPhrases = [
  "Amanah Formwork Pilot Firm",
  "NHL Global Solution",
  "Nur Hernieliana",
  "controlled local/private pilot operation",
  "selected-firm",
  "tenant/firm scoped",
  "human professional approval",
  "AI worker actions are attributable",
  "OP-H1 — Controlled Multi-Firm Pilot Operations Foundation"
];

for (const phrase of requiredPhrases) {
  assert(plan.includes(phrase) || checklist.includes(phrase) || mtAcceptance.includes(phrase), `OP planning evidence missing phrase: ${phrase}`);
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
  assert(plan.toLowerCase().includes(phrase.toLowerCase()), `OP plan missing locked boundary: ${phrase}`);
  assert(checklist.toLowerCase().includes(phrase.toLowerCase()), `OP checklist missing locked boundary: ${phrase}`);
}

assert(decisions.includes("ADR-054 - OP controlled multi-firm pilot operations plan created"), "ADR-054 missing from decision register.");
assert(readme.includes("OP_H1_TO_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_SPRINT_PLAN_v1.0.md"), "OP sprint plan missing from technical design index.");
assert(readme.includes("OP_H1_TO_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_CHECKLIST_v1.0.md"), "OP checklist missing from technical design index.");
assert(packageJson.scripts["check:op:plan"] === "node scripts/smoke-op-plan-checklist.mjs", "check:op:plan package script missing.");
assert(packageJson.scripts.check.includes("smoke-op-plan-checklist.mjs"), "Full check chain must include OP plan smoke.");

console.log(JSON.stringify({
  smoke: "op-plan-checklist",
  result: "passed",
  status: "plan_and_checklist_ready",
  next_active_sprint: "OP-H1 — Controlled Multi-Firm Pilot Operations Foundation",
  docs_checked: requiredDocs.length,
  sprints: sprintNames.length,
  locked_boundaries: lockedBoundaries
}, null, 2));
