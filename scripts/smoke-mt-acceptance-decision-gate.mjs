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
  "docs/10_post_freeze_technical_design/MT_MULTI_TENANT_WORKSPACE_RUNTIME_BINDING_SPRINT_PLAN_v1.0.md",
  "docs/10_post_freeze_technical_design/MT_MULTI_TENANT_WORKSPACE_RUNTIME_BINDING_CHECKLIST_v1.0.md",
  "docs/10_post_freeze_technical_design/MT_H1_WORKSPACE_PROFILE_AND_SUBSCRIPTION_CONTRACT_LOCK_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/MT_H2_BACKEND_ACTIVE_WORKSPACE_SUMMARY_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/MT_H3_LOCAL_SEED_AND_PILOT_WORKSPACE_DATA_REPAIR_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/MT_H4_FRONTEND_WORKSPACE_SHELL_BINDING_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/MT_H5_MODULE_AND_WORKER_RUNTIME_BINDING_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/MT_H6_MULTI_TENANT_PILOT_REHEARSAL_AND_EVIDENCE_PACK_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/MT_MULTI_TENANT_RUNTIME_BINDING_ACCEPTANCE_DECISION_GATE_v1.0.md"
];

for (const doc of requiredDocs) {
  assert(await exists(doc), `Required MT acceptance gate evidence document missing: ${doc}`);
}

const gate = await readFile("docs/10_post_freeze_technical_design/MT_MULTI_TENANT_RUNTIME_BINDING_ACCEPTANCE_DECISION_GATE_v1.0.md", "utf8");
const checklist = await readFile("docs/10_post_freeze_technical_design/MT_MULTI_TENANT_WORKSPACE_RUNTIME_BINDING_CHECKLIST_v1.0.md", "utf8");
const h6Evidence = await readFile("docs/10_post_freeze_technical_design/MT_H6_MULTI_TENANT_PILOT_REHEARSAL_AND_EVIDENCE_PACK_COMPLETION_v1.0.md", "utf8");
const decisions = await readFile("docs/00_project_control/DECISION_REGISTER.md", "utf8");
const readme = await readFile("docs/10_post_freeze_technical_design/README.md", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

const boundaryPhrases = [
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

const evidencePhrases = [
  "Amanah Formwork Pilot Firm",
  "NHL Global Solution",
  "Nur Hernieliana",
  "VF-FORMWORK-PILOT",
  "VF-ORG-SUPPORT-PILOT",
  "cross_tenant_active_summary_denied",
  "nhl_no_formwork_technical_delivery_subscription"
];

assert(gate.includes("Pending Product-Owner Decision"), "MT acceptance gate must remain pending product-owner decision.");
assert(gate.includes("GO_FOR_CONTROLLED_MULTI_TENANT_PILOT_READINESS_ACCEPTANCE"), "MT acceptance technical recommendation missing.");
assert(gate.includes("Decision option A - Accept multi-tenant pilot readiness"), "MT accept option missing.");
assert(gate.includes("Decision option B - Hold acceptance"), "MT hold option missing.");
assert(gate.includes("Decision option C - Reject acceptance"), "MT reject option missing.");
assert(gate.includes("I do not authorize production multi-tenant onboarding"), "Recommended acceptance wording must preserve production-widening boundary.");

for (const phrase of boundaryPhrases) {
  assert(gate.toLowerCase().includes(phrase.toLowerCase()), `MT acceptance gate missing boundary: ${phrase}`);
}

for (const phrase of evidencePhrases) {
  assert(gate.includes(phrase) || h6Evidence.includes(phrase), `MT acceptance evidence missing phrase: ${phrase}`);
}

assert(!checklist.includes("- [ ]"), "MT checklist must have no unchecked items before acceptance gate.");
assert(decisions.includes("ADR-051 - MT-H6 multi-tenant pilot rehearsal and evidence pack completed"), "ADR-051 missing before acceptance gate.");
assert(decisions.includes("ADR-052 - MT multi-tenant runtime binding acceptance gate prepared"), "ADR-052 missing from decision register.");
assert(readme.includes("MT_MULTI_TENANT_RUNTIME_BINDING_ACCEPTANCE_DECISION_GATE_v1.0.md"), "MT acceptance gate missing from technical design index.");
assert(packageJson.scripts["check:mt:acceptance"] === "node scripts/smoke-mt-acceptance-decision-gate.mjs", "check:mt:acceptance package script missing.");
assert(packageJson.scripts.check.includes("smoke-mt-acceptance-decision-gate.mjs"), "Full check chain must include MT acceptance gate smoke.");

console.log(JSON.stringify({
  smoke: "mt-acceptance-decision-gate",
  result: "passed",
  gate_status: "pending_product_owner_decision",
  technical_recommendation: "GO_FOR_CONTROLLED_MULTI_TENANT_PILOT_READINESS_ACCEPTANCE",
  docs_checked: requiredDocs.length,
  pilot_workspaces: [
    "Amanah Formwork Pilot Firm",
    "NHL Global Solution"
  ],
  boundaries: boundaryPhrases
}, null, 2));
