import { readFile } from "node:fs/promises";

const html = await readFile("apps/web/public/index.html", "utf8");
const app = await readFile("apps/web/public/app.js", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const navViews = [...html.matchAll(/data-view="([^"]+)"/g)].map((match) => match[1]);
const sectionViews = [...html.matchAll(/<section id="view-([^"]+)" class="workspace-view/g)].map((match) => match[1]);
for (const view of navViews) {
  assert(sectionViews.includes(view), `Missing workspace section for nav view: ${view}`);
}
assert(new Set(sectionViews).size === sectionViews.length, "Duplicate workspace-view section ids detected.");
assert(html.indexOf('id="view-my-firm"') > html.indexOf('id="view-workflow"'), "My Firm view must be a top-level sibling after Workflow, not nested inside it.");
assert(html.includes('class="app-shell"') && html.includes('id="workspaceSidebar"') && html.includes('id="sidebarToggle"'), "Corporate app shell missing.");
assert(html.includes('class="workspace-command-center"'), "Workspace command center missing from shell.");
const css = await readFile("apps/web/public/styles.css", "utf8");
assert(css.includes("/* UI correction: hamburger-only navigation and compact workspace header. */"), "Hamburger-only UI correction CSS missing.");
assert(css.includes(".workspace-command-center {\n  display: contents;"), "Workspace command center must not consume page height.");
assert(css.includes(".workspace-sidebar {\n  position: fixed;") && css.includes("transform: translateX(-105%)"), "Sidebar must be hidden until hamburger opens it.");

const requiredRenderers = [
  "renderMyFirmModule",
  "renderClientModule",
  "renderFrontDeskModule",
  "renderAdministrationModule",
  "renderSalesAccountsModule",
  "renderTechnicalDeliveryModule",
  "renderIntakeModule",
  "renderProposalModule",
  "renderProjectModule",
  "renderInvoiceModule",
  "renderAiWorkforceModule",
  "renderNetworkModule",
  "renderOpsModule",
  "renderAuditModule",
  "renderServicePackModule",
  "renderPilotModule",
  "renderUsersModule",
  "renderSupportModule",
  "renderReviewBoardModule",
  "renderExpansionModule",
  "renderUsageBillingModule",
  "renderCommercialLaunchModule"
];
for (const renderer of requiredRenderers) {
  assert(new RegExp(`function\\s+${renderer}\\s*\\(`).test(app), `Missing renderer function: ${renderer}`);
}

const requiredHelpers = ["personName", "safeRenderModule", "renderFailureCard"];
for (const helper of requiredHelpers) {
  assert(new RegExp(`function\\s+${helper}\\s*\\(`).test(app), `Missing render helper: ${helper}`);
}

const renderRecordViewsStart = app.indexOf("function renderRecordViews(store) {");
const renderAllStart = app.indexOf("function renderAll() {", renderRecordViewsStart);
assert(renderRecordViewsStart >= 0 && renderAllStart > renderRecordViewsStart, "renderRecordViews function body not found.");
const renderRecordViewsBody = app.slice(renderRecordViewsStart, renderAllStart);
for (const renderer of requiredRenderers) {
  assert(renderRecordViewsBody.includes(`safeRenderModule(`), "renderRecordViews must use safeRenderModule guards.");
  assert(!renderRecordViewsBody.includes(`${renderer}(store);`), `Unsafe direct renderer call found in renderRecordViews: ${renderer}(store);`);
}
assert(renderRecordViewsBody.includes('safeRenderModule("#auditView", "Audit"') && renderRecordViewsBody.includes('renderAuditModule'), "Audit view must be guarded by safeRenderModule.");
assert(!app.includes("renderFrontDeskModule is not defined"), "Debug text leaked into app source.");
assert(!app.includes("personName is not defined"), "Debug text leaked into app source.");

const meS5OperatorUiMarkers = [
  "Private Directory Operator UI",
  "qualifiedDirectoryPublishForm",
  "/marketplace/directory-publications",
  "directoryReviewDecisionForm",
  "/marketplace/directory-review-board/decisions",
  "privateDirectoryEnquiryForm",
  "/marketplace/private-directory/enquiries",
  "directoryEnquiryCollaborationForm",
  "/marketplace/private-directory/enquiries/request-collaboration",
  "qualificationRenewalReviewForm",
  "/marketplace/qualification-renewal-reviews",
  "directory_review_board_decisions",
  "directory_private_enquiries",
  "qualification_renewal_reviews",
  "qualified_directory_summary",
  "private_directory_governance_summary",
  "private_directory_intelligence_summary",
  "/marketplace/private-directory-intelligence-summary",
  "ME-S6 private readiness summary",
  "Operator next actions",
  "Forbidden boundary reminders",
  "renderOperatorActionCards",
  "renderOperatorBoundaryCards"
];
for (const marker of meS5OperatorUiMarkers) {
  assert(app.includes(marker), `ME-S5 private directory operator UI marker missing: ${marker}`);
}
assert(!app.includes('id="capacityOfferForm"'), "ME-S5 Network UI must not expose capacity offer creation.");
assert(!app.includes('id="observatorySnapshotForm"'), "ME-S5 Network UI must not expose observatory snapshot publication.");

console.log(JSON.stringify({
  smoke: "web-navigation-renderers",
  result: "passed",
  nav_views: navViews.length,
  workspace_sections: sectionViews.length,
  renderer_functions: requiredRenderers.length,
  guards: ["safeRenderModule", "renderFailureCard", "personName", "visible_refresh_error"]
}, null, 2));
