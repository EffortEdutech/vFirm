import { readFile, access } from "node:fs/promises";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

const requiredFiles = [
  "docs/10_post_freeze_technical_design/PD_H1_PRIVATE_DIRECTORY_PRODUCT_HARDENING_AND_OPERATOR_WALKTHROUGH_SPRINT_PLAN_v1.0.md",
  "docs/10_post_freeze_technical_design/PD_H1_PRIVATE_DIRECTORY_PRODUCT_HARDENING_AND_OPERATOR_WALKTHROUGH_CHECKLIST_v1.0.md",
  "docs/10_post_freeze_technical_design/PD_H1_PRIVATE_DIRECTORY_OPERATOR_WALKTHROUGH_RUNBOOK_v1.0.md",
  "docs/10_post_freeze_technical_design/PD_H1_PRIVATE_DIRECTORY_PRODUCT_HARDENING_COMPLETION_v1.0.md"
];
for (const file of requiredFiles) assert(await exists(file), `PD-H1 required file missing: ${file}`);

const app = await readFile("apps/web/public/app.js", "utf8");
const styles = await readFile("apps/web/public/styles.css", "utf8");
const webSmoke = await readFile("scripts/smoke-web-navigation-renderers.mjs", "utf8");
const runbook = await readFile("docs/10_post_freeze_technical_design/PD_H1_PRIVATE_DIRECTORY_OPERATOR_WALKTHROUGH_RUNBOOK_v1.0.md", "utf8");
const completion = await readFile("docs/10_post_freeze_technical_design/PD_H1_PRIVATE_DIRECTORY_PRODUCT_HARDENING_COMPLETION_v1.0.md", "utf8");
const checklist = await readFile("docs/10_post_freeze_technical_design/PD_H1_PRIVATE_DIRECTORY_PRODUCT_HARDENING_AND_OPERATOR_WALKTHROUGH_CHECKLIST_v1.0.md", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

for (const marker of [
  "renderOperatorActionCards",
  "renderOperatorBoundaryCards",
  "Operator next actions",
  "Forbidden boundary reminders",
  "ME-S6 private readiness summary"
]) assert(app.includes(marker), `PD-H1 Network UI hardening marker missing: ${marker}`);

for (const marker of [".operator-walkthrough-panel", ".operator-action-grid", ".operator-boundary-grid", ".boundary-chip", ".metric-card.warning"]) {
  assert(styles.includes(marker), `PD-H1 style marker missing: ${marker}`);
}

for (const marker of ["Operator next actions", "Forbidden boundary reminders", "renderOperatorActionCards", "renderOperatorBoundaryCards"]) {
  assert(webSmoke.includes(marker), `PD-H1 web renderer assertion missing: ${marker}`);
}

for (const phrase of [
  "controlled private directory only",
  "Record Private Enquiry",
  "Request Collaboration",
  "Record Renewal Review",
  "No public marketplace",
  "No live matching",
  "No autonomous regulated approval"
]) assert(runbook.includes(phrase), `PD-H1 runbook phrase missing: ${phrase}`);

assert(completion.includes("Completed"), "PD-H1 completion status missing.");
assert(completion.includes("Ad hoc work completed"), "PD-H1 ad hoc section missing.");
assert(completion.includes("Next in plan"), "PD-H1 next-plan section missing.");
assert(checklist.includes("[x] Confirm PD-H1 is product hardening only."), "PD-H1 checklist not updated with completed scope lock.");
assert(checklist.includes("[x] Old capacity-offer creation form is not exposed."), "PD-H1 checklist missing forbidden capacity UI completion.");
assert(checklist.includes("[x] Old observatory-publication form is not exposed."), "PD-H1 checklist missing forbidden observatory UI completion.");
assert(!app.includes('id="capacityOfferForm"'), "PD-H1 active UI must not expose capacity offer creation.");
assert(!app.includes('id="observatorySnapshotForm"'), "PD-H1 active UI must not expose observatory snapshot publication.");
assert(packageJson.scripts["check:pd:h1"] === "node scripts/smoke-pd-h1-private-directory-hardening.mjs", "check:pd:h1 package script missing.");
assert(packageJson.scripts.check.includes("smoke-pd-h1-private-directory-hardening.mjs"), "Full check chain must include PD-H1 smoke.");

console.log(JSON.stringify({
  smoke: "pd-h1-private-directory-product-hardening",
  result: "passed",
  ui_markers: 5,
  docs_checked: requiredFiles.length,
  boundary: "controlled private directory only; no marketplace widening"
}, null, 2));