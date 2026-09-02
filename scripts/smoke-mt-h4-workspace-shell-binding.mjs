import { readFile } from "node:fs/promises";

const html = await readFile("apps/web/public/index.html", "utf8");
const app = await readFile("apps/web/public/app.js", "utf8");
const checklist = await readFile("docs/10_post_freeze_technical_design/MT_MULTI_TENANT_WORKSPACE_RUNTIME_BINDING_CHECKLIST_v1.0.md", "utf8");
const seed = await readFile("scripts/seed-multi-tenant-pilot-workspaces-local.mjs", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(html.includes('id="workspaceShellTitle"'), "Dynamic workspace shell title element is missing.");
assert(html.includes('id="workspaceShellLede"'), "Dynamic workspace shell lede element is missing.");
assert(!html.includes("Operate a Formwork Engineering Virtual Firm with modular front desk"), "Hard-coded Formwork lede must not remain in the HTML shell.");
assert(app.includes("function activeWorkspaceContract(store)"), "Active workspace contract resolver missing.");
assert(app.includes("function renderWorkspaceShell(store)"), "Workspace shell renderer missing.");
assert(app.includes("renderWorkspaceShell(scopedStore);"), "renderAll must bind the selected firm to the shell.");
assert(app.includes("activeSubscriptionPackage(store)"), "Active subscription package resolver missing.");
assert(app.includes("workspaceServiceSummary(contract)"), "Workspace service summary binding missing.");
assert(app.includes("metadata?.workspace_profile") && seed.includes("NHL Global Solution Workspace"), "NHL workspace title must be supplied by workspace profile metadata.");
assert(app.includes("organization-support firm for project reporting, technical writing, clerical work"), "NHL organization-support lede missing.");
assert(seed.includes("VF-ORG-SUPPORT-PILOT") && app.includes("subscription?.package_code"), "NHL subscription code must bind through active subscription data.");
assert(app.includes("Service Subscription / Delivery Pack"), "Service Pack page was not generalized.");
assert(app.includes("Formwork Practice Pack Detail"), "Formwork-only practice-pack detail should remain bounded to Formwork workspaces.");
assert(checklist.includes("MT-H4") && checklist.includes("Frontend Workspace Shell Binding"), "MT-H4 checklist section missing.");

console.log(JSON.stringify({
  smoke: "mt-h4-workspace-shell-binding",
  result: "passed",
  checks: [
    "dynamic_shell_title_and_lede",
    "no_static_formwork_lede",
    "active_workspace_contract_resolver",
    "active_subscription_summary",
    "nhl_organization_support_copy",
    "generalized_service_subscription_page"
  ]
}, null, 2));