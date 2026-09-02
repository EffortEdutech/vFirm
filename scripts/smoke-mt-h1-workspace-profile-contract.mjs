import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const contractPath = "docs/10_post_freeze_technical_design/MT_H1_WORKSPACE_PROFILE_AND_SUBSCRIPTION_CONTRACT_LOCK_v1.0.md";
const completionPath = "docs/10_post_freeze_technical_design/MT_H1_WORKSPACE_PROFILE_AND_SUBSCRIPTION_CONTRACT_LOCK_COMPLETION_v1.0.md";
const planPath = "docs/10_post_freeze_technical_design/MT_MULTI_TENANT_WORKSPACE_RUNTIME_BINDING_SPRINT_PLAN_v1.0.md";
const checklistPath = "docs/10_post_freeze_technical_design/MT_MULTI_TENANT_WORKSPACE_RUNTIME_BINDING_CHECKLIST_v1.0.md";

const [contract, completion, plan, checklist] = await Promise.all([
  readFile(contractPath, "utf8"),
  readFile(completionPath, "utf8"),
  readFile(planPath, "utf8"),
  readFile(checklistPath, "utf8")
]);

const requiredContractMarkers = [
  "Workspace profile contract",
  "Subscription package binding rules",
  "Module contract",
  "Service line contract",
  "Worker binding contract",
  "FORMWORK_ENGINEERING",
  "ORGANIZATION_SUPPORT",
  "DIRECTORY_REHEARSAL",
  "NHL Global Solution",
  "Nur Hernieliana",
  "project_reporting",
  "technical_writing",
  "clerical_work",
  "bizkick_edcs",
  "VF-FORMWORK-PILOT",
  "VF-ORG-SUPPORT-PILOT",
  "NO_LIVE_PAYMENT_CAPTURE"
];

for (const marker of requiredContractMarkers) {
  assert(contract.includes(marker), `MT-H1 contract missing marker: ${marker}`);
}

const forbiddenWidening = [
  "public marketplace enabled",
  "live matching enabled",
  "autonomous regulated approval enabled",
  "live payment movement enabled"
];

for (const marker of forbiddenWidening) {
  assert(!contract.toLowerCase().includes(marker), `MT-H1 contract contains forbidden widening marker: ${marker}`);
}

for (const marker of ["MT-H1", "MT-H2", "MT-H3", "MT-H4", "MT-H5", "MT-H6"]) {
  assert(plan.includes(marker), `MT sprint plan missing ${marker}`);
}

for (const marker of [
  "[x] Define firm workspace profile fields.",
  "[x] Define firm type vocabulary.",
  "[x] Define subscription package to workspace behavior mapping.",
  "[x] Define service-line mapping.",
  "[x] Define module catalogue mapping.",
  "[x] Define worker-template mapping.",
  "[x] Define rehearsal/test workspace classification.",
  "[x] Define selected-firm active workspace summary response.",
  "[x] Add documentation evidence.",
  "[x] Add H1 smoke/static checks."
]) {
  assert(checklist.includes(marker), `MT checklist does not mark H1 item complete: ${marker}`);
}

assert(completion.includes("MT-H1 is complete."), "MT-H1 completion document must record completion.");
assert(completion.includes("MT-H2 - Backend Active Workspace Summary"), "MT-H1 completion must identify MT-H2 as next sprint.");

console.log(JSON.stringify({
  smoke: "mt-h1-workspace-profile-contract",
  result: "passed",
  contract: "locked",
  reference_profiles: ["FORMWORK_ENGINEERING", "ORGANIZATION_SUPPORT"],
  next: "MT-H2 Backend Active Workspace Summary",
  boundaries: [
    "no_public_marketplace",
    "no_live_matching",
    "no_ranking",
    "no_capacity_allocation",
    "no_vf24_publication",
    "no_pricing_intelligence",
    "no_autonomous_award",
    "no_autonomous_regulated_approval",
    "no_live_payment_movement"
  ]
}, null, 2));
