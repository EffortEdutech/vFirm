import { readFile } from "node:fs/promises";

const app = await readFile("apps/web/public/app.js", "utf8");
const css = await readFile("apps/web/public/styles.css", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const markers = [
  "AFCC Staff Management",
  "awiaAfccStaff",
  "renderAfccStaffManagementExperience",
  "bindAfccStaffProfileButtons",
  "Hire staff",
  "Assign work",
  "Supervise execution",
  "Approve with evidence",
  "Manage lifecycle",
  "Assignment Readiness",
  "Approval Queue Semantics",
  "Skill available is not action authorized",
  "Monthly salary, package binding, chat, and model capability do not grant authority",
  "No direct LLM final issue",
  "CFO-001",
  "SAO-001",
  "OPO-001",
  "ARO-001",
  "DATA-001"
];

for (const marker of markers) {
  assert(app.includes(marker), `AWIA-VS-S5 AFCC UI marker missing: ${marker}`);
}

for (const marker of [".afcc-staff-experience", ".afcc-metric-grid", ".afcc-journey-grid"]) {
  assert(css.includes(marker), `AWIA-VS-S5 CSS marker missing: ${marker}`);
}

assert(app.includes('insertAdjacentHTML("afterbegin", renderAfccStaffManagementExperience(store))'), "AFCC staff experience must render before legacy AI Workforce forms.");
assert(app.includes("pause") && app.includes("suspend") && app.includes("retire") && app.includes("replace"), "Lifecycle control language missing.");
assert(!app.includes("autonomous regulated approval enabled"), "Forbidden autonomous approval language present.");

console.log(JSON.stringify({
  smoke: "awia-vs-s5-afcc-staff-management",
  result: "passed",
  markers: markers.length,
  boundary: "ui_preview_only_deterministic_authority_gate_retained"
}, null, 2));
