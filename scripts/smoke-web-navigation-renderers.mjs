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
assert(/safeRenderModule\(\s*"#auditView"\s*,\s*"Audit"/.test(renderRecordViewsBody) && renderRecordViewsBody.includes('renderAuditModule'), "Audit view must be guarded by safeRenderModule.");
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

const nhlQ2Markers = [
  "BOQ Extraction Aid",
  "boqExtractionAidForm",
  "/boq-extraction-aids",
  "boqExtractionReviewForm",
  "Review aid only",
  "boq_extraction_aids"
];
for (const marker of nhlQ2Markers) {
  assert(app.includes(marker), `NHL-Q2 BOQ extraction aid UI marker missing: ${marker}`);
}

const nhlQ3Markers = [
  "Quotation Draft Assembly",
  "quotationDraftPackForm",
  "/quotation-draft-packs",
  "quotationDraftReviewForm",
  "quotationClientCorrespondenceForm",
  "quotation_draft_packs"
];
for (const marker of nhlQ3Markers) {
  assert(app.includes(marker), `NHL-Q3 quotation draft UI marker missing: ${marker}`);
}

const nhlQ4Markers = [
  "Controlled Quotation Issue and Receivables",
  "quotationIssueForm",
  "/quotation-draft-packs/issue",
  "quotationReceivablePreparationForm",
  "/quotation-receivable-preparations",
  "Controlled Quotation Issue Register",
  "Receivables Preparation Register",
  "quotation_issue_records",
  "quotation_receivable_preparations",
  "NO_LIVE_PAYMENT_MOVEMENT"
];
for (const marker of nhlQ4Markers) {
  assert(app.includes(marker), `NHL-Q4 controlled issue UI marker missing: ${marker}`);
}

const nhlQ5Markers = [
  "quotation_operations_summary",
  "/quotation-operations-summary",
  "Quotation Operations Today",
  "NHL-Q5 Quotation Operations",
  "nhl-q5-quotation-operations",
  "Exceptions and next actions",
  "Human review queue",
  "no_live_payment_movement"
];
for (const marker of nhlQ5Markers) {
  assert(app.includes(marker), `NHL-Q5 quotation operations UI marker missing: ${marker}`);
}

const myTeamMarkers = [
  'data-view="my-team"',
  'id="view-my-team"',
  'id="myTeamView"',
  "function renderMyTeamModule(",
  "function bindMyTeamControls(",
  "data-my-team-hire",
  "data-my-team-activate",
  "data-my-team-pause",
  "myTeamEnableHiring",
  "/ops/awia-package-assignment",
  "/awia/virtual-staff/hire-worker",
  "my-team-role-grid"
];
for (const marker of myTeamMarkers) {
  assert(html.includes(marker) || app.includes(marker), `My Team hire-a-worker UI marker missing: ${marker}`);
}
assert(css.includes(".my-team-role-grid"), "My Team role grid CSS missing.");
assert(new RegExp(`safeRenderModule\\(\\s*"#myTeamView"`).test(app), "My Team view must be guarded by safeRenderModule.");

// Phase 3 of the Admin Console / Owner Workspace sprint plan (ADR-082):
// Work and Approvals are retired in favor of one "Workdesk" screen with
// five tabs (Inbox/Pending/Approval/Outbox/Archived), reusing the same
// endpoints Work/Approvals already proved plus the two Phase 1 (ADR-080)
// endpoints for the Outbox -> Archived transitions.
const workdeskMarkers = [
  'data-view="workdesk"',
  'id="view-workdesk"',
  'id="workdeskView"',
  "function renderWorkdeskModule(",
  "function bindWorkdeskControls(",
  "function awiaRoleCodeForStaffCode(",
  "function awiaClientIdForTask(",
  'data-workdesk-tab="inbox"',
  'data-workdesk-tab="pending"',
  'data-workdesk-tab="approval"',
  'data-workdesk-tab="outbox"',
  'data-workdesk-tab="archived"',
  "data-workdesk-produce-draft",
  "data-workdesk-approve",
  "data-workdesk-revise",
  "data-workdesk-reject",
  "data-workdesk-prepare-client",
  "data-workdesk-mark-sent",
  "data-workdesk-archive",
  "data-workdesk-notes-for",
  "workAssignForm",
  "/awia/virtual-staff/assign-task",
  "/awia/virtual-staff/output-draft",
  "/awia/virtual-staff/output-review",
  "/awia/virtual-staff/client-delivery-draft",
  "/awia/virtual-staff/client-delivery-draft/mark-sent",
  "/awia/virtual-staff/workdesk-item/archive"
];
for (const marker of workdeskMarkers) {
  assert(html.includes(marker) || app.includes(marker), `Workdesk screen UI marker missing: ${marker}`);
}
assert(new RegExp(`safeRenderModule\\(\\s*"#workdeskView"`).test(app), "Workdesk view must be guarded by safeRenderModule.");
assert(!app.includes("function renderWorkModule(") && !app.includes("function renderApprovalsModule("), "Work/Approvals renderers must be retired, not left alongside Workdesk.");
assert(!html.includes('data-view="work"') && !html.includes('data-view="approvals"'), "Work/Approvals nav buttons must be retired, not left alongside Workdesk.");

// Phase 2 of the Admin Console / Owner Workspace sprint plan: a UI-only
// toggle between two nav sets. Every nav-button must declare which workspace
// it belongs to, both toggle buttons must exist, and the switch logic must
// be present -- and it must never be described or implemented as a login.
const workspaceModeMarkers = [
  'id="workspaceModeToggle"',
  'id="workspaceModeOwner"',
  'id="workspaceModeAdmin"',
  'data-workspace-mode="owner"',
  'data-workspace-mode="admin"',
  "function applyWorkspaceMode(",
  "WORKSPACE_MODE_STORAGE_KEY",
  "WORKSPACE_MODE_DEFAULT_VIEW"
];
for (const marker of workspaceModeMarkers) {
  assert(html.includes(marker) || app.includes(marker), `Workspace mode toggle marker missing: ${marker}`);
}
assert(!html.includes('type="password"') && !/<form[^>]*id="[^"]*login/i.test(html), "Workspace mode switch must stay UI-only, never implemented as a login form.");
assert(/not a login/i.test(app) || /UI-only/i.test(app), "Workspace mode switch code must document that it is UI-only, not access control.");

const navButtonBlocks = [...html.matchAll(/<button class="nav-button[^>]*data-view="([^"]+)"[^>]*>/g)];
assert(navButtonBlocks.length === navViews.length, "Every nav button must be matched by the workspace-attribute scan.");
const OWNER_VIEWS = ["dashboard", "my-team", "workdesk", "my-firm", "clients", "front-desk", "intake", "proposals", "projects", "invoices"];
const ADMIN_VIEWS = ["workflow", "administration", "sales-accounts", "technical-delivery", "ai-workforce", "network", "ops", "audit", "approval-records", "service-pack", "pilot", "users", "support", "review-board", "expansion", "usage-billing", "commercial-launch"];
for (const match of navButtonBlocks) {
  const tag = match[0];
  const view = match[1];
  const expectedMode = OWNER_VIEWS.includes(view) ? "owner" : ADMIN_VIEWS.includes(view) ? "admin" : null;
  assert(expectedMode, `Nav view "${view}" is not classified into either OWNER_VIEWS or ADMIN_VIEWS in this smoke test -- update the sprint plan's screen inventory and this test together.`);
  assert(tag.includes(`data-workspace="${expectedMode}"`), `Nav view "${view}" must be tagged data-workspace="${expectedMode}".`);
}
assert(OWNER_VIEWS.length + ADMIN_VIEWS.length === navViews.length, "OWNER_VIEWS + ADMIN_VIEWS must account for every nav view exactly once.");

const approvalRecordsMarkers = [
  'data-view="approval-records"',
  'data-workspace="admin"',
  'id="view-approval-records"',
  'id="approvalRecordsView"',
  "Approval Records"
];
for (const marker of approvalRecordsMarkers) {
  assert(html.includes(marker) || app.includes(marker), `Approval Records (re-wired old operator audit table) marker missing: ${marker}`);
}
assert(new RegExp(`safeRenderModule\\(\\s*"#approvalRecordsView"`).test(app), "Approval Records view must be guarded by safeRenderModule.");
assert(html.indexOf('data-view="approval-records"') !== html.indexOf('data-view="workdesk"'), "Approval Records and Workdesk must remain distinct nav entries.");

console.log(JSON.stringify({
  smoke: "web-navigation-renderers",
  result: "passed",
  nav_views: navViews.length,
  workspace_sections: sectionViews.length,
  renderer_functions: requiredRenderers.length,
  guards: ["safeRenderModule", "renderFailureCard", "personName", "visible_refresh_error"]
}, null, 2));
