import { readFile, access } from "node:fs/promises";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

const requiredDocs = [
  "docs/10_post_freeze_technical_design/ME_S1_MARKETPLACE_GOVERNANCE_LOCK_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/ME_S2_QUALIFIED_DIRECTORY_AND_SERVICE_PUBLICATION_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/ME_S3_PRIVATE_DIRECTORY_GOVERNANCE_ENQUIRY_RENEWAL_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/ME_S4_SQL_PERSISTENCE_HARDENING_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/ME_S5_PRIVATE_DIRECTORY_OPERATOR_UI_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/ME_S6_PRIVATE_DIRECTORY_INTELLIGENCE_READINESS_VIEW_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/ME_S7_MARKETPLACE_ECOSYSTEM_RELEASE_GATE_COMPLETION_v1.0.md"
];
for (const doc of requiredDocs) assert(await exists(doc), `Required ME gate document missing: ${doc}`);

const plan = await readFile("docs/10_post_freeze_technical_design/VFIRM_MARKETPLACE_ECOSYSTEM_INTELLIGENCE_RELEASE_PLAN_v1.0.md", "utf8");
const gate = await readFile("docs/10_post_freeze_technical_design/ME_S7_MARKETPLACE_ECOSYSTEM_RELEASE_GATE_COMPLETION_v1.0.md", "utf8");
const decisions = await readFile("docs/00_project_control/DECISION_REGISTER.md", "utf8");
const readme = await readFile("docs/10_post_freeze_technical_design/README.md", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const webSmoke = await readFile("scripts/smoke-web-navigation-renderers.mjs", "utf8");
const apiContracts = await readFile("packages/core-domain/src/api-contracts.mjs", "utf8");

for (const sprint of ["ME-S1", "ME-S2", "ME-S3", "ME-S4", "ME-S5", "ME-S6", "ME-S7"]) {
  assert(plan.includes(sprint), `${sprint} missing from Marketplace/Ecosystem release plan.`);
}
assert(plan.includes("ME-S7 Complete - Later Marketplace Widening Decision Required"), "ME-S7 completion status missing from release plan.");
assert(plan.includes("## 20. ME-S7 completion record"), "ME-S7 completion record missing from release plan.");
assert(readme.includes("ME_S7_MARKETPLACE_ECOSYSTEM_RELEASE_GATE_COMPLETION_v1.0.md"), "ME-S7 completion doc missing from technical design index.");
assert(decisions.includes("ADR-034 - ME-S7 marketplace ecosystem release gate completed"), "ADR-034 missing from decision register.");

const boundaryPhrases = [
  "no public marketplace",
  "no live matching",
  "no ranking",
  "no capacity allocation",
  "no VF-24 observatory publication",
  "no pricing intelligence",
  "no autonomous award",
  "no autonomous regulated approval"
];
for (const phrase of boundaryPhrases) {
  assert(gate.toLowerCase().includes(phrase.toLowerCase()), `ME-S7 gate missing boundary: ${phrase}`);
}

assert(gate.includes("GO for controlled private directory operation"), "ME-S7 gate must record controlled private directory GO recommendation.");
assert(gate.includes("NO-GO for public marketplace widening"), "ME-S7 gate must record public marketplace widening NO-GO recommendation.");
assert(apiContracts.includes("/marketplace/private-directory-intelligence-summary"), "ME-S6 read-only intelligence endpoint missing from API contracts.");
assert(webSmoke.includes('id="capacityOfferForm"') && webSmoke.includes("must not expose capacity offer creation"), "ME-S5/ME-S6 UI guard against capacity creation missing.");
assert(webSmoke.includes('id="observatorySnapshotForm"') && webSmoke.includes("must not expose observatory snapshot publication"), "ME-S5/ME-S6 UI guard against observatory publication missing.");
assert(packageJson.scripts["check:me:s7"] === "node scripts/smoke-me-s7-marketplace-ecosystem-release-gate.mjs", "check:me:s7 package script missing.");
assert(packageJson.scripts.check.includes("smoke-me-s7-marketplace-ecosystem-release-gate.mjs"), "Full check chain must include ME-S7 gate smoke.");
assert(packageJson.scripts.check.includes("smoke-me-s6-private-directory-intelligence.mjs --postgres"), "Full check chain must retain ME-S6 PostgreSQL evidence.");

console.log(JSON.stringify({
  smoke: "me-s7-marketplace-ecosystem-release-gate",
  result: "passed",
  gate_recommendation: "GO for controlled private directory operation; NO-GO for public marketplace widening without later authorization",
  docs_checked: requiredDocs.length,
  boundaries: boundaryPhrases
}, null, 2));