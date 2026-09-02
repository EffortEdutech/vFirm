import { readFile } from "node:fs/promises";

const app = await readFile("apps/web/public/app.js", "utf8");
const css = await readFile("apps/web/public/styles.css", "utf8");
const seed = await readFile("scripts/seed-multi-tenant-pilot-workspaces-local.mjs", "utf8");
const checklist = await readFile("docs/10_post_freeze_technical_design/MT_MULTI_TENANT_WORKSPACE_RUNTIME_BINDING_CHECKLIST_v1.0.md", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(app.includes("const viewModuleCodes"), "View-to-module binding map missing.");
assert(app.includes("function renderWorkspaceNavigation(store)"), "Subscribed/not-subscribed navigation renderer missing.");
assert(app.includes("classList.toggle(\"not-subscribed\"") || app.includes("classList.toggle(\"not-subscribed\","), "Unsubscribed navigation marker missing from JS contract.");
assert(css.includes(".nav-button.not-subscribed"), "Unsubscribed navigation CSS missing.");
assert(app.includes("function renderModuleBoundary"), "Subscription boundary page renderer missing.");
assert(app.includes("function renderIfSubscribed"), "Module subscription gate helper missing.");
assert(app.includes("renderIfSubscribed(\"#technicalDeliveryView\", \"Technical Delivery\", \"technical_delivery\""), "Technical Delivery page must be gated by subscription.");
assert(app.includes("workerTemplateCodesForContract(contract)"), "Worker template binding must derive from active contract.");
assert(app.includes("defaultWorkerNameForTemplate"), "Firm-specific worker default name helper missing.");
assert(app.includes("defaultServiceHint(contract)"), "Front Desk must use active service-line hint.");
assert(!app.includes("requested_service_hint:\"Formwork Engineering support\"") && !app.includes('requested_service_hint:"Formwork Engineering support"'), "Front Desk must not hard-code Formwork requested service hint.");
assert(app.includes("document.register.prepare") && app.includes("formwork.input.extract"), "Firm-specific default tool hints missing.");
assert(app.includes("defaultOutputRef(contract)"), "AI output ref must be selected by workspace contract.");
assert(seed.includes('modules: ["front_desk", "administration", "sales_accounts", "projects", "invoices", "ai_workforce", "ops", "audit"]'), "NHL seed must exclude technical_delivery module.");
assert(seed.includes('modules: ["front_desk", "administration", "sales_accounts", "technical_delivery", "projects", "approvals", "invoices", "ai_workforce", "ops", "audit"]'), "Formwork seed must include technical_delivery and approvals modules.");
assert(checklist.includes("MT-H5") && checklist.includes("Module and Worker Runtime Binding"), "MT-H5 checklist section missing.");

console.log(JSON.stringify({
  smoke: "mt-h5-module-worker-binding",
  result: "passed",
  checks: [
    "view_to_module_binding",
    "subscribed_not_subscribed_nav_state",
    "subscription_boundary_pages",
    "technical_delivery_gated_for_non_formwork",
    "worker_templates_from_active_contract",
    "firm_specific_worker_defaults",
    "frontdesk_service_hint_from_active_services",
    "firm_specific_ai_tool_and_output_defaults"
  ]
}, null, 2));