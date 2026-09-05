const API_BASE = window.VFIRM_API_BASE ?? "/api";
const apiStatus = document.querySelector("#apiStatus");
const navButtons = [...document.querySelectorAll(".nav-button")];
const views = [...document.querySelectorAll(".workspace-view")];
const demoForm = document.querySelector("#demoForm");
const resultBox = document.querySelector("#resultBox");
const workflowStateBox = document.querySelector("#workflowStateBox");
const storeSummary = document.querySelector("#storeSummary");
const refreshStore = document.querySelector("#refreshStore");
const workflowSteps = document.querySelector("#workflowSteps");
const resetWorkflow = document.querySelector("#resetWorkflow");
const latestActivity = document.querySelector("#latestActivity");
const healthCards = document.querySelector("#healthCards");
const operatorStrip = document.querySelector("#operatorStrip");
const nextActions = document.querySelector("#nextActions");
const commandFeedback = document.querySelector("#commandFeedback");
const releaseBanner = document.querySelector("#releaseBanner");
const activeWorkspace = document.querySelector("#activeWorkspace");
const sidebarToggle = document.querySelector("#sidebarToggle");
const sidebarScrim = document.querySelector("#sidebarScrim");
let currentView = "dashboard";
let lastStore = null;
let state = defaultState();
const ACTIVE_FIRM_STORAGE_KEY = "vfirm.activeFirmId";
let activeFirmId = localStorage.getItem(ACTIVE_FIRM_STORAGE_KEY) ?? null;
function defaultState() {
  return {
    tenantName: "Demo Tenant",
    firmName: "Amanah Temporary Works",
    principalName: "Ir. Demo Principal",
    clientName: "Demo Contractor Sdn Bhd",
    projectName: "Basement Wall Formwork Package",
    finalPrice: 2500,
    currency: "MYR",
  };
}
const workspaceCollections = [
  ["tenants", "/tenants"],
  ["service_packs", "/service-packs"],
  ["service_skus", "/service-skus"],
  ["worker_templates", "/worker-templates"],
  ["worker_instances", "/worker-instances"],
  [
    "awia_virtual_staff_provisioning_runs",
    "/awia-virtual-staff-provisioning-runs",
  ],
  ["awia_virtual_staff_seats", "/awia-virtual-staff-seats"],
  ["awia_virtual_staff_members", "/awia-virtual-staff-members"],
  ["awia_staff_role_assignments", "/awia-staff-role-assignments"],
  ["awia_staff_package_bindings", "/awia-staff-package-bindings"],
  ["awia_staff_lifecycle_events", "/awia-staff-lifecycle-events"],
  ["awia_staff_authority_decisions", "/awia-staff-authority-decisions"],
  ["awia_staff_evidence_packs", "/awia-staff-evidence-packs"],
  ["awia_staff_task_readiness_records", "/awia-staff-task-readiness-records"],
  ["awia_staff_workdesk_items", "/awia-staff-workdesk-items"],
  ["awia_staff_output_drafts", "/awia-staff-output-drafts"],
  ["awia_staff_output_reviews", "/awia-staff-output-reviews"],
  ["awia_client_delivery_drafts", "/awia-client-delivery-drafts"],
  ["task_outputs", "/task-outputs"],
  ["tool_invocations", "/tool-invocations"],
  ["marketplace_listings", "/marketplace-listings"],
  ["directory_review_board_decisions", "/directory-review-board-decisions"],
  ["directory_private_enquiries", "/directory-private-enquiries"],
  ["qualification_renewal_reviews", "/qualification-renewal-reviews"],
  ["network_qualification_gates", "/network-qualification-gates"],
  ["capacity_offers", "/capacity-offers"],
  ["collaboration_requests", "/collaboration-requests"],
  ["observatory_snapshots", "/observatory-snapshots"],
  ["qualified_directory_summary", "/marketplace/qualified-directory-summary"],
  [
    "private_directory_governance_summary",
    "/marketplace/private-directory-governance-summary",
  ],
  [
    "private_directory_intelligence_summary",
    "/marketplace/private-directory-intelligence-summary",
  ],
  ["persons", "/persons"],
  ["actors", "/actors"],
  ["front_desk_enquiries", "/front-desk-enquiries"],
  ["client_communication_drafts", "/client-communication-drafts"],
  ["firms", "/firms"],
  ["administration_skill_bindings", "/administration-skill-bindings"],
  ["correspondence_records", "/correspondence-records"],
  ["document_register_entries", "/document-register-entries"],
  ["document_revision_records", "/document-revision-records"],
  ["administrative_deadlines", "/administrative-deadlines"],
  ["transmittal_drafts", "/transmittal-drafts"],
  ["commercial_skill_bindings", "/commercial-skill-bindings"],
  ["sales_pipeline_records", "/sales-pipeline-records"],
  ["proposal_dispatch_records", "/proposal-dispatch-records"],
  ["expense_records", "/expense-records"],
  ["technical_skill_bindings", "/technical-skill-bindings"],
  ["drawing_review_records", "/drawing-review-records"],
  ["calculation_input_sets", "/calculation-input-sets"],
  ["technical_qa_findings", "/technical-qa-findings"],
  ["delivery_package_records", "/delivery-package-records"],
  ["receivable_follow_ups", "/receivable-follow-ups"],
  ["firm_memberships", "/firm-memberships"],
  ["professional_profiles", "/professional-profiles"],
  ["professional_authorities", "/professional-authorities"],
  ["clients", "/clients"],
  ["firm_client_relationships", "/firm-client-relationships"],
  ["leads", "/leads"],
  ["intake_sessions", "/intake-sessions"],
  ["price_build_ups", "/price-build-ups"],
  ["proposals", "/proposals"],
  ["approvals", "/approvals"],
  ["engagements", "/engagements"],
  ["projects", "/projects"],
  ["work_packages", "/work-packages"],
  ["tasks", "/tasks"],
  ["documents", "/documents"],
  ["document_versions", "/document-versions"],
  ["evidence_bundles", "/evidence-bundles"],
  ["invoices", "/invoices"],
  ["payment_statuses", "/payment-statuses"],
  ["policy_decisions", "/policy-decisions"],
  ["event_log", "/event-log"],
  ["audit_events", "/audit-events"],
  ["auth_context", "/auth/context"],
  ["ops_readiness", "/ops/readiness"],
  ["staging_package", "/ops/staging-package"],
  ["data_protection_policy", "/data-protection/policy"],
  ["data_export_manifest", "/data-protection/export-manifest"],
  ["pilot_package", "/pilot/formwork"],
  ["pilot_users", "/pilot-users"],
  ["auth_provider_config", "/auth/provider/config"],
  ["tenant_admin_policy", "/tenant-admin/policy"],
  ["support_summary", "/support/summary"],
  ["support_cases", "/support-cases"],
  ["operator_metrics", "/ops/operator-metrics"],
  ["daily_operations", "/operations/today"],
  ["pilot_incidents", "/pilot-incidents"],
  ["pilot_learning_loop", "/pilot/learning-loop"],
  ["pilot_feedback", "/pilot-feedback"],
  ["pilot_acceptance_reviews", "/pilot-acceptance-reviews"],
  ["pilot_improvement_items", "/pilot-improvement-items"],
  ["review_board_summary", "/stakeholder-review/summary"],
  ["pilot_report_packs", "/pilot-report-packs"],
  ["stakeholder_review_boards", "/stakeholder-review-boards"],
  ["stakeholder_review_decisions", "/stakeholder-review-decisions"],
  ["expansion_summary", "/pilot/expansion-summary"],
  ["pilot_expansion_cohorts", "/pilot-expansion-cohorts"],
  ["tenant_onboarding_plans", "/tenant-onboarding-plans"],
  ["release_candidate_gates", "/release-candidate-gates"],
  ["usage_summary", "/tenant-usage/summary"],
  ["tenant_pilot_controls", "/tenant-pilot-controls"],
  ["tenant_usage_events", "/tenant-usage-events"],
  ["billing_readiness_reviews", "/billing-readiness-reviews"],
  ["commercial_launch_summary", "/commercial-launch/summary"],
  ["payment_provider_configs", "/payment-provider-configs"],
  ["subscription_packages", "/subscription-packages"],
  ["commercial_launch_controls", "/commercial-launch-controls"],
  ["pilot_handoff_records", "/pilot-handoff-records"],
  ["quotation_cases", "/quotation-cases"],
  ["boq_extraction_aids", "/boq-extraction-aids"],
  ["quotation_draft_packs", "/quotation-draft-packs"],
  ["quotation_issue_records", "/quotation-issue-records"],
  ["quotation_receivable_preparations", "/quotation-receivable-preparations"],
  ["quotation_operations_summary", "/quotation-operations-summary"],
];
const steps = [
  {
    key: "tenant",
    title: "1. Create Tenant",
    endpoint: "POST /tenants",
    needs: [],
    run: () =>
      request("/tenants", {
        method: "POST",
        body: JSON.stringify({ name: state.tenantName, default_region: "MY" }),
      }),
    apply: (data) => {
      state.tenant = data;
    },
  },
  {
    key: "firm",
    title: "2. Create Firm",
    endpoint: "POST /firms",
    needs: ["tenant"],
    run: () =>
      request("/firms", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: state.tenant.id,
          name: state.firmName,
          principal_name: state.principalName,
        }),
      }),
    apply: (data) => {
      state.firm = data.firm;
      state.principal_actor = data.principal_actor;
      state.principal_person = data.principal_person;
      activeFirmId = data.firm.id;
      localStorage.setItem(ACTIVE_FIRM_STORAGE_KEY, activeFirmId);
    },
  },
  {
    key: "client",
    title: "3. Create Client",
    endpoint: "POST /clients",
    needs: ["tenant", "firm"],
    run: () =>
      request("/clients", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: state.tenant.id,
          firm_id: state.firm.id,
          name: state.clientName,
          actor: state.principal_actor,
        }),
      }),
    apply: (data) => {
      state.client = data.client;
      state.relationship = data.relationship;
    },
  },
  {
    key: "intake",
    title: "4. Create Intake",
    endpoint: "POST /intake-sessions",
    needs: ["tenant", "firm", "relationship"],
    run: () =>
      request("/intake-sessions", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: state.tenant.id,
          firm_id: state.firm.id,
          relationship_id: state.relationship.id,
          actor: state.principal_actor,
          provided_inputs: formworkInputs(),
        }),
      }),
    apply: (data) => {
      state.lead = data.lead;
      state.intake = data.intake;
    },
  },
  {
    key: "proposal",
    title: "5. Create Proposal",
    endpoint: "POST /proposals",
    needs: ["tenant", "firm", "relationship", "intake"],
    run: () =>
      request("/proposals", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: state.tenant.id,
          firm_id: state.firm.id,
          relationship_id: state.relationship.id,
          intake_session_id: state.intake.id,
          scope_summary: "Preliminary formwork design support package",
          final_price: Number(state.finalPrice),
          actor: state.principal_actor,
        }),
      }),
    apply: (data) => {
      state.price = data.price;
      state.proposal = data.proposal;
    },
  },
  {
    key: "approval",
    title: "6. Approve Proposal",
    endpoint: "POST /proposals/approve",
    needs: ["tenant", "firm", "proposal"],
    run: () =>
      request("/proposals/approve", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: state.tenant.id,
          firm_id: state.firm.id,
          proposal_id: state.proposal.id,
          actor: state.principal_actor,
        }),
      }),
    apply: (data) => {
      state.approval = data.approval;
      state.proposal = data.proposal;
    },
  },
  {
    key: "project",
    title: "7. Accept Proposal / Open Project",
    endpoint: "POST /proposals/accept",
    needs: ["tenant", "firm", "proposal"],
    run: () =>
      request("/proposals/accept", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: state.tenant.id,
          firm_id: state.firm.id,
          proposal_id: state.proposal.id,
          project_name: state.projectName,
          actor: state.principal_actor,
        }),
      }),
    apply: (data) => {
      state.proposal = data.proposal;
      state.engagement = data.engagement;
      state.project = data.project;
      state.workPackage = data.workPackage;
      state.task = data.task;
    },
  },
  {
    key: "evidence",
    title: "8. Create Evidence Bundle",
    endpoint: "POST /evidence-bundles",
    needs: ["tenant", "firm", "project", "intake"],
    run: () =>
      request("/evidence-bundles", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: state.tenant.id,
          firm_id: state.firm.id,
          project_id: state.project.id,
          subject_type: "Project",
          subject_id: state.project.id,
          input_refs: [state.intake.id],
          actor: state.principal_actor,
        }),
      }),
    apply: (data) => {
      state.evidence = data;
    },
  },
  {
    key: "invoice",
    title: "9. Create Invoice",
    endpoint: "POST /invoices",
    needs: ["tenant", "firm", "relationship", "engagement", "project"],
    run: () =>
      request("/invoices", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: state.tenant.id,
          firm_id: state.firm.id,
          relationship_id: state.relationship.id,
          engagement_id: state.engagement.id,
          project_id: state.project.id,
          currency: state.currency,
          line_items: [
            {
              description:
                "Formwork Design Support - Preliminary Wall/Slab Package",
              amount: Number(state.finalPrice),
            },
          ],
          actor: state.principal_actor,
        }),
      }),
    apply: (data) => {
      state.invoice = data;
    },
  },
];
function devAuthHeaders() {
  const firm =
    activeFirmInStore(lastStore) ??
    state.firm ??
    latestRecord(lastStore, "firms");
  const actor =
    (firm ? latestPrincipalActor(lastStore, firm.id) : null) ??
    state.principal_actor;
  if (!actor?.id && !actor?.actor_id) return {};
  return {
    "x-vfirm-actor-id": actor.actor_id ?? actor.id,
    "x-vfirm-tenant-id": actor.tenant_id ?? firm?.tenant_id ?? state.tenant?.id,
    "x-vfirm-firm-id": actor.firm_id ?? firm?.id,
    "x-vfirm-role": actor.role ?? "principal",
  };
}
async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...devAuthHeaders(),
      ...(options.headers ?? {}),
    },
  });
  const json = await res.json();
  if (!res.ok || !json.ok)
    throw new Error(json.error?.message ?? `Request failed: ${path}`);
  return json.data;
}
function formworkInputs() {
  return {
    project_name: state.projectName,
    site_location: "Kuala Lumpur",
    client_organization: state.clientName,
    client_contact_name: "Demo Contact",
    client_contact_email: "client@example.com",
    structure_type: "basement",
    formwork_element_type: "wall",
    height: 3.5,
    length_or_area: 120,
    concrete_grade: "C30",
    available_drawings: ["S-100"],
    deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
    required_deliverables: ["preliminary_support_report"],
  };
}
function pickSummary(data = state) {
  return {
    tenant: data.tenant?.id,
    firm: data.firm?.id,
    principal_actor: data.principal_actor?.id,
    client: data.client?.id,
    relationship: data.relationship?.id,
    intake: data.intake?.id,
    proposal: data.proposal?.id,
    approval: data.approval?.id,
    engagement: data.engagement?.id,
    project: data.project?.id,
    work_package: data.workPackage?.id,
    task: data.task?.id,
    evidence: data.evidence?.id,
    invoice: data.invoice?.id,
  };
}
function switchView(view) {
  currentView = view;
  navButtons.forEach((button) =>
    button.classList.toggle("active", button.dataset.view === view),
  );
  views.forEach((section) =>
    section.classList.toggle("active", section.id === `view-${view}`),
  );
  renderAll();
}
function stepReady(step) {
  return step.needs.every((key) => state[key]?.id);
}
function stepDone(step) {
  return Boolean(state[step.key]?.id);
}
function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>'"]/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        char
      ],
  );
}
function shortId(id) {
  return id
    ? String(id)
        .replace(/^([a-z]+_)?/, "")
        .slice(0, 8)
    : "-";
}
function money(value, currency = "MYR") {
  return `${currency} ${Number(value ?? 0).toLocaleString()}`;
}
function setOperatorMessage(message, tone = "neutral") {
  if (!operatorStrip) return;
  operatorStrip.className = `operator-strip ${tone}`;
  operatorStrip.innerHTML = `<span>${escapeHtml(message)}</span>`;
}
function setCommandFeedback(type, title, message = "") {
  if (!commandFeedback) return;
  commandFeedback.className = `command-feedback ${type}`;
  commandFeedback.innerHTML = `<strong>${escapeHtml(title)}</strong>${message ? `<span>${escapeHtml(message)}</span>` : ""}`;
}
function clearCommandFeedback() {
  if (!commandFeedback) return;
  commandFeedback.className = "command-feedback";
  commandFeedback.innerHTML = "";
}
function commandErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/fetch|Failed to fetch|NetworkError/i.test(message))
    return "The API is not reachable. Check that npm run dev is running and the API is listening on 3091.";
  return message;
}
async function runUiCommand({
  label,
  button = null,
  form = null,
  success = "Done",
  action,
}) {
  const submitButton = button ?? form?.querySelector('button[type="submit"]');
  const originalText = submitButton?.textContent;
  try {
    clearCommandFeedback();
    setOperatorMessage(`${label}...`, "loading");
    setCommandFeedback("loading", label, "Command is running. Please wait.");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Working...";
    }
    const result = await action();
    setCommandFeedback("success", success, "Workspace data refreshed.");
    setOperatorMessage(success, "ready");
    return result;
  } catch (error) {
    const message = commandErrorMessage(error);
    setCommandFeedback("error", `${label} failed`, message);
    setOperatorMessage(`${label} failed`, "danger");
    resultBox.textContent = message;
    workflowStateBox.textContent = message;
    return null;
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }
}
function disabledHint(enabled, message) {
  return enabled ? "" : `<p class="disabled-hint">${escapeHtml(message)}</p>`;
}
function workflowStage(store) {
  if ((store.invoices ?? []).length) return "Invoice issued";
  if ((store.evidence_bundles ?? []).length) return "Evidence captured";
  if ((store.projects ?? []).length) return "Project delivery open";
  if (
    (store.proposals ?? []).some(
      (proposal) => proposal.proposal_status === "APPROVED",
    )
  )
    return "Proposal approved";
  if ((store.proposals ?? []).length) return "Proposal drafted";
  if ((store.intake_sessions ?? []).length) return "Intake completed";
  if ((store.clients ?? []).length) return "Client onboarded";
  if ((store.firms ?? []).length) return "Firm created";
  if ((store.tenants ?? []).length) return "Tenant created";
  return "Ready to start";
}
function nextActionCards(store) {
  const actions = [];
  const contract = activeWorkspaceContract(store);
  const firmName = contract.firm?.name ?? "the selected firm";
  const serviceSummary = workspaceServiceSummary(contract);
  if (!(store.tenants ?? []).length)
    actions.push([
      "Start",
      "Create a tenant from Workflow to establish the workspace boundary.",
      "workflow",
    ]);
  else if (!(store.firms ?? []).length)
    actions.push([
      "Create Firm",
      "Create the Virtual Firm and principal actor.",
      "workflow",
    ]);
  else if (!(store.clients ?? []).length)
    actions.push([
      "Add Client",
      `Open the Clients tab and add the first client relationship for ${firmName}.`,
      "clients",
    ]);
  else if (!(store.intake_sessions ?? []).length)
    actions.push([
      "Run Intake",
      `Capture the first front-door intake for ${serviceSummary}.`,
      "intake",
    ]);
  else if (!(store.proposals ?? []).length)
    actions.push([
      "Create Proposal",
      "Convert completed intake into a priced proposal.",
      "proposals",
    ]);
  else if (
    !(store.proposals ?? []).some(
      (proposal) => proposal.proposal_status === "APPROVED",
    )
  )
    actions.push([
      "Approve Proposal",
      "Record explicit approval before acceptance.",
      "proposals",
    ]);
  else if (!(store.projects ?? []).length)
    actions.push([
      "Open Project",
      "Accept the proposal and open delivery.",
      "proposals",
    ]);
  else if (!(store.evidence_bundles ?? []).length)
    actions.push([
      "Capture Evidence",
      "Create the first evidence bundle from the project screen.",
      "projects",
    ]);
  else if (!(store.invoices ?? []).length)
    actions.push([
      "Create Invoice",
      "Draft the first invoice against the opened project.",
      "projects",
    ]);
  else
    actions.push([
      "Review Audit",
      "Review events, approvals, and audit records for traceability.",
      "audit",
    ]);
  actions.push([
    "Service Subscription",
    `${contract.subscription?.package_code ?? "No package"}: ${serviceSummary}.`,
    "service-pack",
  ]);
  return actions;
}
function humanStatus(value) {
  return String(value ?? "Unknown")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
function healthTone(status) {
  if (
    [
      "ONLINE",
      "ACTIVE",
      "INVOICE_READY",
      "DELIVERY_OPEN",
      "COMMERCIAL_ACTIVE",
      "FRONT_DOOR_ACTIVE",
      "FIRM_READY",
      "ACTIVE",
    ].includes(status)
  )
    return "good";
  if (["WAITING_FOR_ACTIVITY", "SETUP_REQUIRED"].includes(status))
    return "warn";
  return "bad";
}
function renderReleaseBanner(store) {
  if (!releaseBanner) return;
  const contract = activeWorkspaceContract(store);
  const backend =
    store._dashboard_summary?.health?.persistence?.backend ?? "unknown";
  const boundary =
    store.commercial_launch_summary?.boundary ??
    contract.subscription?.metadata?.commercial_boundary ??
    "no_live_payment_capture";
  releaseBanner.innerHTML = `<strong>${escapeHtml(contract.profile.workspace_classification ?? "PILOT")} workspace</strong><span>${escapeHtml(contract.subscription?.package_code ?? "No package")} - ${escapeHtml(humanStatus(boundary))} - ${escapeHtml(backend)}</span>`;
}
function renderHealthCards(store) {
  if (!healthCards) return;
  const health = store._dashboard_summary?.health ?? {};
  const contract = activeWorkspaceContract(store);
  const activeServices = workspaceServiceSummary(contract);
  const cards = [
    [
      "API",
      health.api?.status ?? "UNKNOWN",
      health.api
        ? `${health.api.phase} on ${health.api.api_port}`
        : "Waiting for health check",
    ],
    [
      "Database",
      health.persistence?.backend === "postgres" ? "ONLINE" : "DEV_FALLBACK",
      health.persistence?.backend === "postgres"
        ? "PostgreSQL relational mode"
        : "Local JSON fallback/dev mode",
    ],
    [
      "Subscription",
      contract.subscription?.package_status ?? "UNBOUND",
      `${contract.subscription?.package_code ?? "No package"} / ${contract.subscription?.pricing_model ?? "No pricing model"}`,
    ],
    [
      "Services",
      contract.serviceLines.length ? "ACTIVE" : "SETUP_REQUIRED",
      activeServices,
    ],
    [
      "Audit",
      health.audit?.status ?? "WAITING_FOR_ACTIVITY",
      `${health.audit?.events ?? 0} events / ${health.audit?.audit_events ?? 0} audit records`,
    ],
    [
      "Workflow",
      health.workflow?.status ?? workflowStage(store),
      `Next gate: ${health.workflow?.next_gate ?? nextActionCards(store)[0]?.[0] ?? "Review"}`,
    ],
  ];
  healthCards.innerHTML = `<div class="section-kicker">${escapeHtml(contract.firm?.name ?? "Workspace")} health</div><div class="health-card-grid">${cards.map(([title, status, detail]) => `<article class="health-card ${healthTone(status)}"><span>${escapeHtml(title)}</span><strong>${escapeHtml(humanStatus(status))}</strong><small>${escapeHtml(detail)}</small></article>`).join("")}</div>`;
}
function renderNextActions(store) {
  if (!nextActions) return;
  const actions = nextActionCards(store);
  nextActions.innerHTML = `<div class="section-kicker">Recommended next actions</div><div class="action-grid">${actions.map(([title, body, view]) => `<button class="action-card" type="button" data-action-view="${escapeHtml(view)}"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span></button>`).join("")}</div>`;
  nextActions
    .querySelectorAll("button[data-action-view]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        switchView(button.dataset.actionView),
      ),
    );
}
function renderKeyValueList(entries) {
  return `<dl class="kv-list">${entries.map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value ?? "-")}</dd></div>`).join("")}</dl>`;
}
function renderHumanDetail(title, entries, raw) {
  return `<article class="detail-card"><h3>${escapeHtml(title)}</h3>${renderKeyValueList(entries)}<details><summary>Raw record</summary><pre class="output detail-output">${escapeHtml(JSON.stringify(raw, null, 2))}</pre></details></article>`;
}
function countBy(records, predicate) {
  return (records ?? []).filter(predicate).length;
}
function renderRelatedContext(title, items) {
  return `<section class="context-panel"><h4>${escapeHtml(title)}</h4><div class="context-grid">${items.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? "-")}</strong></div>`).join("")}</div></section>`;
}
function eventTone(type = "") {
  if (
    type.includes("approved") ||
    type.includes("created") ||
    type.includes("opened")
  )
    return "good";
  if (type.includes("denied") || type.includes("failed")) return "bad";
  return "neutral";
}
function renderTimeline(events) {
  return events.length
    ? `<ol class="timeline">${events.map((event) => `<li class="${eventTone(event.event_type)}"><span>${escapeHtml(event.event_type)}</span><p>${escapeHtml(event.payload_summary ?? event.aggregate_type ?? "Event recorded")}</p><code>${escapeHtml(event.occurred_at)}</code></li>`).join("")}</ol>`
    : `<p class="empty">No events yet. Run the workflow to create an audit trail.</p>`;
}
function formworkPack(store) {
  return (
    (store.service_packs ?? []).find((pack) => pack.code === "VF-SP-001") ??
    null
  );
}
function formworkSku(store) {
  return (
    (store.service_skus ?? []).find(
      (sku) => sku.code === "formwork_preliminary_wall_slab",
    ) ?? null
  );
}
function formworkEvidenceRequirements(store) {
  return (
    formworkPack(store)?.configuration?.required_evidence ?? [
      "intake_summary",
      "basis_of_design",
      "preliminary_calculation_note",
      "qa_review_note",
    ]
  );
}
function intakeCompleteness(record) {
  const required = formworkPack(lastStore)?.configuration?.required_inputs ?? [
    "project_name",
    "site_location",
    "structure_type",
    "formwork_element_type",
    "height",
    "length_or_area",
    "concrete_grade",
    "available_drawings",
  ];
  const provided = record?.provided_inputs ?? {};
  return required.map((key) => [
    key,
    Array.isArray(provided[key])
      ? provided[key].length > 0
      : Boolean(provided[key]),
  ]);
}
function renderWorkflow() {
  workflowSteps.innerHTML = steps
    .map((step) => {
      const done = stepDone(step);
      const ready = stepReady(step);
      const disabled = done || !ready;
      const status = done
        ? "Done"
        : ready
          ? "Ready"
          : `Needs ${step.needs.filter((key) => !state[key]?.id).join(", ")}`;
      return `<article class="step-card ${done ? "done" : ""}"><div><span class="step-status">${escapeHtml(status)}</span><h3>${step.title}</h3><p>${step.endpoint}</p>${done ? `<code>${escapeHtml(state[step.key].id)}</code>` : ""}</div><button data-step="${step.key}" ${disabled ? "disabled" : ""}>${done ? "Completed" : "Run Step"}</button></article>`;
    })
    .join("");
}
function renderState() {
  const text = JSON.stringify(pickSummary(), null, 2);
  resultBox.textContent = text;
  workflowStateBox.textContent = text;
  renderWorkflow();
}
function renderSummary(store) {
  setOperatorMessage(
    `${workflowStage(store)} - ${store._dashboard_summary?.counts?.events ?? store.event_log?.length ?? 0} events recorded`,
    "ready",
  );
  renderNextActions(store);
  renderReleaseBanner(store);
  renderHealthCards(store);
  const cards = [
    [
      "Clients",
      store._dashboard_summary?.counts?.clients ?? store.clients?.length,
    ],
    [
      "Open Intake",
      store._dashboard_summary?.counts?.open_intake ??
        store.intake_sessions?.filter((x) => x.intake_status !== "COMPLETE")
          .length,
    ],
    [
      "Proposals",
      store._dashboard_summary?.counts?.proposals ?? store.proposals?.length,
    ],
    [
      "Projects",
      store._dashboard_summary?.counts?.projects ?? store.projects?.length,
    ],
    [
      "Approvals",
      store._dashboard_summary?.counts?.approvals ?? store.approvals?.length,
    ],
    [
      "Invoices",
      store._dashboard_summary?.counts?.invoices ?? store.invoices?.length,
    ],
    [
      "Events",
      store._dashboard_summary?.counts?.events ?? store.event_log?.length,
    ],
    [
      "Audit",
      store._dashboard_summary?.counts?.audit_events ??
        store.audit_events?.length,
    ],
  ];
  storeSummary.innerHTML = `${cards.map(([name, count]) => `<div class="summary-card"><span>${name}</span><strong>${count ?? 0}</strong></div>`).join("")}${renderOperatorTodayView(store)}${renderQuotationOperationsSummary(store, { title: "Quotation Operations Today" })}`;
}
function buildClientDailyOperationsFallback(store) {
  const open = (value) =>
    ![
      "COMPLETE",
      "COMPLETED",
      "DONE",
      "CLOSED",
      "RESOLVED",
      "ISSUED",
      "PAID",
      "HANDED_OFF",
      "ACCEPTED",
    ].includes(String(value ?? "").toUpperCase());
  const invoices = store.invoices ?? [];
  const payments = store.payment_statuses ?? [];
  const invoiceTotal = invoices.reduce(
    (sum, invoice) =>
      sum +
      (invoice.line_items ?? []).reduce(
        (lineSum, item) => lineSum + Number(item.amount ?? 0),
        0,
      ),
    0,
  );
  const received = payments
    .filter((item) =>
      ["PAID", "RECEIVED", "CAPTURED"].includes(item.payment_status),
    )
    .reduce(
      (sum, item) => sum + Number(item.amount_received ?? item.amount ?? 0),
      0,
    );
  const approvals = [
    ...(store.proposals ?? [])
      .filter((item) =>
        ["DRAFT", "PREPARED", "PENDING_APPROVAL", "APPROVAL_REQUIRED"].includes(
          item.proposal_status,
        ),
      )
      .map((item) => ({
        type: "proposal",
        id: item.id,
        status: item.proposal_status,
      })),
    ...(store.delivery_package_records ?? [])
      .filter((item) => item.package_status === "READY_FOR_PRINCIPAL_REVIEW")
      .map((item) => ({
        type: "technical_delivery_package",
        id: item.id,
        status: item.package_status,
      })),
    ...(store.client_communication_drafts ?? [])
      .filter((item) => item.requires_human_review && open(item.status))
      .map((item) => ({
        type: "client_communication_draft",
        id: item.id,
        status: item.status,
      })),
    ...(store.transmittal_drafts ?? [])
      .filter((item) => item.requires_principal_approval && open(item.status))
      .map((item) => ({
        type: "transmittal_draft",
        id: item.id,
        status: item.status,
      })),
    ...(store.receivable_follow_ups ?? [])
      .filter((item) => item.requires_human_review && open(item.status))
      .map((item) => ({
        type: "receivable_follow_up",
        id: item.id,
        status: item.status,
      })),
  ];
  const blockedPackages = (store.delivery_package_records ?? []).filter(
    (item) => item.package_status === "BLOCKED",
  ).length;
  const exceptions = blockedPackages
    ? [
        {
          key: "blocked_delivery_packages",
          severity: "HIGH",
          detail: `${blockedPackages} delivery package(s) blocked.`,
        },
      ]
    : [];
  return {
    status: exceptions.length
      ? "OPERATOR_ATTENTION_REQUIRED"
      : "REHEARSAL_IN_PROGRESS",
    counts: {
      open_enquiries: (store.front_desk_enquiries ?? []).filter((item) =>
        open(item.status),
      ).length,
      open_deadlines: (store.administrative_deadlines ?? []).filter(
        (item) => item.status === "OPEN",
      ).length,
      pending_approvals: approvals.length,
      open_projects: (store.projects ?? []).filter((item) =>
        open(item.project_state),
      ).length,
      open_tasks: (store.tasks ?? []).filter((item) => open(item.state)).length,
      blocked_delivery_packages: blockedPackages,
      audit_events: store.audit_events?.length ?? 0,
    },
    deadlines: { overdue: 0, due_soon: 0 },
    approvals,
    exceptions,
    pipeline: {
      open_opportunities: (store.sales_pipeline_records ?? []).filter(
        (item) => !["WON", "LOST", "CLOSED"].includes(item.stage),
      ).length,
      proposals_draft: (store.proposals ?? []).filter((item) =>
        ["DRAFT", "PREPARED", "PENDING_APPROVAL", "APPROVAL_REQUIRED"].includes(
          item.proposal_status,
        ),
      ).length,
    },
    cash: {
      currency: invoices[0]?.currency ?? "MYR",
      invoiced: invoiceTotal,
      received,
      outstanding: invoiceTotal - received,
    },
  };
}
function buildQuotationOperationsSummaryFallback(store) {
  const cases = store.quotation_cases ?? [];
  const aids = store.boq_extraction_aids ?? [];
  const drafts = store.quotation_draft_packs ?? [];
  const issues = store.quotation_issue_records ?? [];
  const receivables = store.quotation_receivable_preparations ?? [];
  const correspondence = store.correspondence_records ?? [];
  const issueDraftIds = new Set(
    issues.map((item) => item.quotation_draft_pack_id),
  );
  const receivableIssueIds = new Set(
    receivables.map((item) => item.quotation_issue_record_id),
  );
  const issueReady = drafts.filter(
    (item) =>
      item.draft_status === "HUMAN_REVIEWED" &&
      item.correspondence_record_id &&
      !issueDraftIds.has(item.id),
  );
  const extractionReview = aids.filter(
    (item) => item.extraction_status === "DRAFT_REVIEW_REQUIRED",
  );
  const draftReview = drafts.filter(
    (item) => item.draft_status === "DRAFT_REVIEW_REQUIRED",
  );
  const receivableReview = receivables.filter(
    (item) => item.receivable_status === "RECEIVABLE_PREPARED_REVIEW_REQUIRED",
  );
  const issuedWithoutReceivable = issues.filter(
    (item) => !receivableIssueIds.has(item.id),
  );
  const missingSourceDocuments = cases.filter(
    (item) => !(item.document_register_entry_ids ?? []).length,
  );
  const correspondenceReview = correspondence.filter(
    (item) =>
      item.source_ref?.startsWith("quotation_draft_pack://") &&
      item.status === "DRAFT_REVIEW_REQUIRED",
  );
  const exceptions = [];
  if (missingSourceDocuments.length)
    exceptions.push({
      key: "source_documents_missing",
      severity: "HIGH",
      count: missingSourceDocuments.length,
      detail: "Quotation case has no controlled source document records.",
    });
  if (extractionReview.length)
    exceptions.push({
      key: "boq_extraction_review_pending",
      severity: "MEDIUM",
      count: extractionReview.length,
      detail: "BOQ extraction aid needs human review.",
    });
  if (draftReview.length)
    exceptions.push({
      key: "quotation_draft_review_pending",
      severity: "MEDIUM",
      count: draftReview.length,
      detail: "Quotation draft pack needs human review.",
    });
  if (issueReady.length)
    exceptions.push({
      key: "quotation_issue_ready",
      severity: "LOW",
      count: issueReady.length,
      detail:
        "Reviewed draft and correspondence are ready for controlled human issue.",
    });
  if (issuedWithoutReceivable.length)
    exceptions.push({
      key: "issued_without_receivable_preparation",
      severity: "MEDIUM",
      count: issuedWithoutReceivable.length,
      detail: "Human-issued quotation has no receivable preparation.",
    });
  if (receivableReview.length)
    exceptions.push({
      key: "receivable_review_required",
      severity: "LOW",
      count: receivableReview.length,
      detail:
        "Receivable preparation is ready for review; no payment action exists.",
    });
  return {
    status: exceptions.some((item) => item.severity === "HIGH")
      ? "OPERATOR_ATTENTION_REQUIRED"
      : exceptions.length
        ? "REVIEW_QUEUE_ACTIVE"
        : cases.length
          ? "QUOTATION_PIPELINE_CLEAR"
          : "NO_QUOTATION_ACTIVITY",
    counts: {
      quotation_cases: cases.length,
      boq_extraction_aids: aids.length,
      quotation_draft_packs: drafts.length,
      quotation_issue_records: issues.length,
      receivable_preparations: receivables.length,
      pending_human_reviews:
        extractionReview.length +
        draftReview.length +
        issueReady.length +
        receivableReview.length,
      issue_ready: issueReady.length,
      issued_without_receivable: issuedWithoutReceivable.length,
      correspondence_review: correspondenceReview.length,
    },
    exceptions,
    approvals: [].concat(
      extractionReview.map((item) => ({
        type: "boq_extraction_aid_review",
        id: item.id,
        status: item.extraction_status,
      })),
      draftReview.map((item) => ({
        type: "quotation_draft_pack_review",
        id: item.id,
        status: item.draft_status,
      })),
      issueReady.map((item) => ({
        type: "controlled_quotation_issue",
        id: item.id,
        status: item.draft_status,
      })),
      receivableReview.map((item) => ({
        type: "receivable_preparation_review",
        id: item.id,
        status: item.receivable_status,
      })),
    ),
    boundaries: [
      "advisory_boq_extraction_only",
      "human_controlled_quotation_issue",
      "no_live_payment_movement",
      "tenant_scoped_audit_export",
    ],
  };
}
function renderQuotationOperationsSummary(store, options = {}) {
  const summary =
    store.quotation_operations_summary ??
    buildQuotationOperationsSummaryFallback(store);
  const counts = summary.counts ?? {};
  const exceptions = summary.exceptions ?? [];
  const approvals = summary.approvals ?? [];
  const exceptionList = exceptions
    .slice(0, 6)
    .map(
      (item) =>
        "<li><strong>" +
        escapeHtml(item.severity ?? "REVIEW") +
        "</strong><span>" +
        escapeHtml(item.detail ?? item.key) +
        (item.count ? " (" + escapeHtml(item.count) + ")" : "") +
        "</span></li>",
    )
    .join("");
  const approvalList = approvals
    .slice(0, 6)
    .map(
      (item) =>
        "<li><strong>" +
        escapeHtml(humanStatus(item.type)) +
        "</strong><span>" +
        escapeHtml(item.status ?? shortId(item.id)) +
        "</span></li>",
    )
    .join("");
  const boundaryList = (summary.boundaries ?? [])
    .map((item) => "<span>" + escapeHtml(humanStatus(item)) + "</span>")
    .join("");
  return (
    '<section class="panel nhl-q5-quotation-operations"><div class="panel-heading"><h2>' +
    escapeHtml(options.title ?? "NHL-Q5 Quotation Operations") +
    "</h2><p>Active workspace quotation pipeline, exception handling, review queue, receivable readiness, and audit posture.</p></div>" +
    renderRelatedContext("Quotation readiness", [
      ["Status", humanStatus(summary.status)],
      ["Cases", counts.quotation_cases ?? 0],
      ["BOQ aids", counts.boq_extraction_aids ?? 0],
      ["Draft packs", counts.quotation_draft_packs ?? 0],
      ["Issue ready", counts.issue_ready ?? 0],
      ["Issued", counts.quotation_issue_records ?? 0],
      ["Receivable prep", counts.receivable_preparations ?? 0],
      ["Pending human reviews", counts.pending_human_reviews ?? 0],
    ]) +
    '<div class="grid two"><div><h3>Exceptions and next actions</h3><ul class="plain-list">' +
    (exceptionList ||
      "<li><strong>Clear</strong><span>No quotation exception surfaced.</span></li>") +
    '</ul></div><div><h3>Human review queue</h3><ul class="plain-list">' +
    (approvalList ||
      "<li><strong>Clear</strong><span>No quotation review item waiting.</span></li>") +
    '</ul></div></div><div class="checklist warning">' +
    boundaryList +
    "</div></section>"
  );
}
function renderOperatorTodayView(store) {
  const contract = activeWorkspaceContract(store);
  const daily =
    store.daily_operations ?? buildClientDailyOperationsFallback(store);
  const counts = daily.counts ?? {};
  const cash = daily.cash ?? {};
  const modules = new Set(contract.modules.map((module) => module.module_code));
  const serviceExposure =
    contract.profile.firm_type === "ORGANIZATION_SUPPORT"
      ? "NHL organization-support service exposure: project reporting, technical writing, clerical work, and BizKick EDCS/document-control support."
      : "Formwork technical approval exposure: drawing, QA, evidence, and delivery packages stay blocked until valid human professional approval exists.";
  const technicalBoundary = modules.has("technical_delivery")
    ? "Technical Delivery subscribed; regulated issue remains human-approved only."
    : "Technical Delivery not subscribed for this workspace; no Formwork technical delivery work is active.";
  const priorityItems = [
    ["Front desk", `${counts.open_enquiries ?? 0} open enquiries`],
    [
      "Approvals",
      `${counts.pending_approvals ?? daily.approvals?.length ?? 0} human review item(s)`,
    ],
    ["Exceptions", `${daily.exceptions?.length ?? 0} active exception(s)`],
    [
      "Deadlines",
      `${daily.deadlines?.overdue ?? 0} overdue / ${daily.deadlines?.due_soon ?? 0} due soon`,
    ],
    [
      "Projects",
      `${counts.open_projects ?? 0} open projects / ${counts.open_tasks ?? 0} open tasks`,
    ],
    [
      "Pipeline",
      `${daily.pipeline?.open_opportunities ?? 0} open opportunities / ${daily.pipeline?.proposals_draft ?? 0} draft proposals`,
    ],
    [
      "Receivables",
      `${money(cash.outstanding ?? 0, cash.currency ?? "MYR")} outstanding`,
    ],
  ];
  const exceptionList = (daily.exceptions ?? [])
    .slice(0, 4)
    .map(
      (item) =>
        `<li><strong>${escapeHtml(item.severity ?? "REVIEW")}</strong><span>${escapeHtml(item.detail ?? item.key)}</span></li>`,
    )
    .join("");
  const approvalList = (daily.approvals ?? [])
    .slice(0, 4)
    .map(
      (item) =>
        `<li><strong>${escapeHtml(humanStatus(item.type))}</strong><span>${escapeHtml(item.status ?? shortId(item.id))}</span></li>`,
    )
    .join("");
  return `<section class="summary-card op-h2-today-view selected-firm-today-view"> <span>Selected-firm readiness</span> <strong>${escapeHtml(humanStatus(daily.status ?? "rehearsal_in_progress"))}</strong> <p>${escapeHtml(contract.firm?.name ?? "No active firm")} - ${escapeHtml(contract.profile.firm_type ?? "UNCLASSIFIED")} - ${escapeHtml(workspaceServiceSummary(contract))}</p> <div class="today-priority-grid">${priorityItems.map(([label, value]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join("")}</div> <div class="today-ops-grid"> <div><h4>Today priorities</h4><p>${escapeHtml(serviceExposure)}</p><p>${escapeHtml(technicalBoundary)}</p></div> <div><h4>Approvals</h4>${approvalList ? `<ul>${approvalList}</ul>` : `<p>No pending approval records for the selected firm.</p>`}</div> <div><h4>Exceptions</h4>${exceptionList ? `<ul>${exceptionList}</ul>` : `<p>No active exceptions for the selected firm.</p>`}</div> <div><h4>Locked boundaries</h4><p>No live payment movement. No autonomous regulated approval. No cross-firm dashboard leakage.</p></div> </div> </section>`;
}
function renderLatestActivity(store) {
  const events =
    store._dashboard_summary?.latest_activity ??
    [...(store.event_log ?? [])].slice(-6).reverse();
  latestActivity.innerHTML = events.length
    ? events
        .map(
          (event) =>
            `<article class="activity-item"><strong>${escapeHtml(event.event_type)}</strong><span>${escapeHtml(event.payload_summary)}</span><code>${escapeHtml(event.occurred_at)}</code></article>`,
        )
        .join("")
    : `<p class="empty">No events yet. Run the workflow to create activity.</p>`;
}
function relationName(store, relationshipId) {
  const rel = store.firm_client_relationships?.find(
    (item) => item.id === relationshipId,
  );
  const client = store.clients?.find((item) => item.id === rel?.client_id);
  return client?.name ?? shortId(relationshipId);
}
function personName(store, personId) {
  const person = store.persons?.find((item) => item.id === personId);
  const composed = [person?.given_name, person?.family_name]
    .filter(Boolean)
    .join(" ");
  return (
    person?.display_name ??
    person?.full_name ??
    person?.name ??
    (composed || shortId(personId))
  );
}
function renderRecordView({
  target,
  title,
  description,
  records,
  columns,
  empty,
}) {
  const host = document.querySelector(target);
  host.innerHTML = `<section class="panel"><div class="panel-heading"><h2>${title}</h2><p>${description}</p></div>${records.length ? `<div class="record-table-wrap"><table class="record-table"><thead><tr>${columns.map((column) => `<th>${column.label}</th>`).join("")}<th>Detail</th></tr></thead><tbody>${records.map((record, index) => `<tr>${columns.map((column) => `<td>${escapeHtml(column.value(record))}</td>`).join("")}<td><button class="secondary small" data-detail-target="${target}" data-detail-index="${index}">View</button></td></tr>`).join("")}</tbody></table></div><pre class="output detail-output" id="detail-${target.slice(1)}">Select a record.</pre>` : `<p class="empty">${empty}</p>`}</section>`;
  host.querySelectorAll("button[data-detail-index]").forEach((button) =>
    button.addEventListener("click", () => {
      const record = records[Number(button.dataset.detailIndex)];
      host.querySelector(`#detail-${target.slice(1)}`).innerHTML =
        renderHumanDetail(
          title,
          [
            [
              "Status",
              record.status ??
                record.decision ??
                record.proposal_status ??
                record.project_state,
            ],
            ["Tenant", shortId(record.tenant_id)],
            ["Firm", shortId(record.firm_id)],
            ["Record ID", shortId(record.id)],
          ],
          record,
        );
    }),
  );
}
function latestRecord(store, collection) {
  const records = store?.[collection] ?? [];
  return records[records.length - 1] ?? null;
}
function latestPrincipalActor(store, firmId) {
  const actors = store?.actors ?? [];
  return (
    [...actors]
      .reverse()
      .find(
        (actor) => actor.firm_id === firmId && actor.actor_type === "HUMAN",
      ) ?? null
  );
}
function isArchivedPilotFirm(firm, store) {
  const tenant = (store?.tenants ?? []).find(
    (item) => item.id === firm?.tenant_id,
  );
  return /\bPD[- ]?H2\b/i.test(`${firm?.name ?? ""} ${tenant?.name ?? ""}`);
}
function selectableFirmsForStore(store) {
  const firms = store?.firms ?? [];
  const currentPilotFirms = firms.filter(
    (firm) => !isArchivedPilotFirm(firm, store),
  );
  return currentPilotFirms.length ? currentPilotFirms : firms;
}
function activeFirmInStore(store) {
  const firms = store?.firms ?? [];
  const selectableFirms = selectableFirmsForStore(store);
  const selectedFirm = selectableFirms.find((firm) => firm.id === activeFirmId);
  if (selectedFirm) return selectedFirm;
  const packages = store?.subscription_packages ?? [];
  const subscribedFirm = [...selectableFirms]
    .reverse()
    .find((firm) =>
      packages.some(
        (item) => item.firm_id === firm.id && item.package_status === "ACTIVE",
      ),
    );
  return (
    subscribedFirm ??
    selectableFirms[selectableFirms.length - 1] ??
    firms[firms.length - 1] ??
    null
  );
}
function activeTenantInStore(store) {
  const firm = activeFirmInStore(store);
  return firm
    ? ((store?.tenants ?? []).find((tenant) => tenant.id === firm.tenant_id) ??
        null)
    : latestRecord(store, "tenants");
}
function ensureActiveFirm(store) {
  const firm = activeFirmInStore(store);
  if (firm?.id && firm.id !== activeFirmId) {
    activeFirmId = firm.id;
    localStorage.setItem(ACTIVE_FIRM_STORAGE_KEY, activeFirmId);
  }
  return firm;
}
function activePrincipalActor(store) {
  const firm = activeFirmInStore(store);
  return firm ? latestPrincipalActor(store, firm.id) : null;
}
const workspaceModuleDefinitions = {
  front_desk: {
    module_code: "front_desk",
    module_name: "Front Desk",
    default_view: "front-desk",
    worker_template_code: "front-desk-coordinator",
    outcome:
      "Capture and route enquiries without technical or commercial commitment.",
  },
  administration: {
    module_code: "administration",
    module_name: "Administration",
    default_view: "administration",
    worker_template_code: "administration-clerk",
    outcome: "Control records, correspondence, documents, and follow-ups.",
  },
  sales_accounts: {
    module_code: "sales_accounts",
    module_name: "Sales & Accounts",
    default_view: "sales-accounts",
    worker_template_code: "marketing-sales-coordinator",
    outcome:
      "Qualify leads, draft proposals, and support accounts without autonomous commitment.",
  },
  accounts: {
    module_code: "accounts",
    module_name: "Accounts",
    default_view: "sales-accounts",
    worker_template_code: "accounts-clerk",
    outcome:
      "Prepare invoices, receivables, and expense records for principal control.",
  },
  technical_delivery: {
    module_code: "technical_delivery",
    module_name: "Technical Delivery",
    default_view: "technical-delivery",
    worker_template_code: "technical-drawing-assistant",
    outcome:
      "Prepare drawing and delivery support; regulated approvals remain human.",
  },
  projects: {
    module_code: "projects",
    module_name: "Projects",
    default_view: "projects",
    worker_template_code: "project-coordination-assistant",
    outcome:
      "Coordinate tasks, evidence, and delivery status for the Virtual Principal.",
  },
  approvals: {
    module_code: "approvals",
    module_name: "Approvals",
    default_view: "approvals",
    worker_template_code: null,
    outcome: "Track explicit human approval gates and prevent silent approval.",
  },
  invoices: {
    module_code: "invoices",
    module_name: "Invoices",
    default_view: "invoices",
    worker_template_code: "accounts-clerk",
    outcome:
      "Prepare and monitor receivables without autonomous payment action.",
  },
  ai_workforce: {
    module_code: "ai_workforce",
    module_name: "AI Workforce",
    default_view: "ai-workforce",
    worker_template_code: null,
    outcome: "Show workers, authority envelopes, tools, and review boundaries.",
  },
  network: {
    module_code: "network",
    module_name: "Network",
    default_view: "network",
    worker_template_code: null,
    outcome:
      "Private trusted-network controls only; no public marketplace or live matching.",
  },
  ops: {
    module_code: "ops",
    module_name: "Ops",
    default_view: "ops",
    worker_template_code: "project-coordination-assistant",
    outcome:
      "Monitor daily priorities, exceptions, pilot readiness, and handoff actions.",
  },
  audit: {
    module_code: "audit",
    module_name: "Audit",
    default_view: "audit",
    worker_template_code: null,
    outcome:
      "Reconstruct material business and AI-worker actions from audit records.",
  },
};
function activeSubscriptionPackage(store) {
  const firm = store?._active_firm ?? activeFirmInStore(store);
  if (!firm) return null;
  const packages = (store?.subscription_packages ?? []).filter(
    (item) => item.tenant_id === firm.tenant_id && item.firm_id === firm.id,
  );
  return (
    packages.find((item) => item.package_status === "ACTIVE") ??
    packages[packages.length - 1] ??
    null
  );
}
function inferWorkspaceProfile(firm, subscription) {
  const practices = firm?.active_practices ?? [];
  if (
    practices.includes("organization_support") ||
    practices.includes("bizkick_edcs") ||
    subscription?.package_code === "VF-ORG-SUPPORT-PILOT"
  ) {
    return {
      firm_type: "ORGANIZATION_SUPPORT",
      workspace_title: `${firm?.name ?? "Organization Support Firm"} Workspace`,
      workspace_description:
        "Operate a virtual organization-support firm for project reporting, technical writing, clerical work, and BizKick EDCS documentation/control support.",
      workspace_classification: "PILOT",
      modules: [
        "front_desk",
        "administration",
        "sales_accounts",
        "projects",
        "invoices",
        "ai_workforce",
        "ops",
        "audit",
      ],
      worker_templates: [
        "front-desk-coordinator",
        "administration-clerk",
        "accounts-clerk",
        "marketing-sales-coordinator",
        "technical-drawing-assistant",
        "project-coordination-assistant",
      ],
      authority_boundaries: [
        "AI may prepare drafts, registers, reports, and document-control support only.",
        "Human principal approval is required before external sending or client commitment.",
        "No autonomous payment action.",
      ],
    };
  }
  return {
    firm_type: "FORMWORK_ENGINEERING",
    workspace_title: firm?.name
      ? `${firm.name} Workspace`
      : "Formwork Engineering Virtual Firm Workspace",
    workspace_description:
      "Operate controlled formwork engineering intake, proposals, delivery support, QA evidence, approvals, invoicing, and audit.",
    workspace_classification: "PILOT",
    modules: [
      "front_desk",
      "administration",
      "sales_accounts",
      "technical_delivery",
      "projects",
      "approvals",
      "invoices",
      "ai_workforce",
      "ops",
      "audit",
    ],
    worker_templates: [
      "front-desk-coordinator",
      "administration-clerk",
      "accounts-clerk",
      "marketing-sales-coordinator",
      "technical-drawing-assistant",
      "project-coordination-assistant",
    ],
    authority_boundaries: [
      "AI may prepare drafts and checks only.",
      "Regulated deliverables require valid human professional approval.",
      "No silent approval.",
    ],
  };
}
function activeWorkspaceContract(store) {
  const firm = store?._active_firm ?? activeFirmInStore(store);
  const tenant =
    store?._active_tenant ??
    (firm
      ? (store?.tenants ?? []).find((item) => item.id === firm.tenant_id)
      : latestRecord(store, "tenants"));
  const principal =
    store?._active_actor ??
    (firm ? latestPrincipalActor(store, firm.id) : null);
  const subscription = activeSubscriptionPackage(store);
  const profile = {
    ...inferWorkspaceProfile(firm, subscription),
    ...(firm?.metadata?.workspace_profile ?? {}),
    ...(subscription?.metadata?.workspace_profile ?? {}),
  };
  const serviceLines =
    subscription?.metadata?.service_lines ?? profile.service_lines ?? [];
  const modules = (
    subscription?.metadata?.modules ??
    profile.modules ??
    []
  ).map(
    (code) =>
      workspaceModuleDefinitions[code] ?? {
        module_code: code,
        module_name: humanStatus(code),
        default_view: "dashboard",
        worker_template_code: null,
        outcome: "Workspace module enabled by subscription profile.",
      },
  );
  return {
    firm,
    tenant,
    principal,
    subscription,
    profile,
    serviceLines,
    modules,
  };
}
function serviceLineLabel(line) {
  return line?.service_name ?? humanStatus(line?.service_code ?? "service");
}
function renderWorkspaceShell(store) {
  const shellTitle = document.querySelector("#workspaceShellTitle");
  const shellLede = document.querySelector("#workspaceShellLede");
  const contract = activeWorkspaceContract(store);
  const title =
    contract.profile.workspace_title ??
    (contract.firm
      ? `${contract.firm.name} Workspace`
      : "Virtual Firm Workspace");
  const description =
    contract.profile.workspace_description ??
    "Operate modular Virtual Firm Business Infrastructure for the selected firm.";
  if (shellTitle) shellTitle.textContent = title;
  if (shellLede) shellLede.textContent = description;
  document.title = `${title} | vFirm`;
}
function workspaceServiceSummary(contract) {
  const lines = contract.serviceLines.map(serviceLineLabel);
  return lines.length ? lines.join(", ") : "No service lines bound yet";
}
const viewModuleCodes = {
  "front-desk": "front_desk",
  administration: "administration",
  "sales-accounts": "sales_accounts",
  "technical-delivery": "technical_delivery",
  projects: "projects",
  approvals: "approvals",
  invoices: "invoices",
  "ai-workforce": "ai_workforce",
  network: "network",
  ops: "ops",
  audit: "audit",
};
function subscribedModuleCodes(store) {
  return new Set(
    activeWorkspaceContract(store).modules.map((module) => module.module_code),
  );
}
function isWorkspaceModuleSubscribed(store, moduleCode) {
  if (!moduleCode) return true;
  return subscribedModuleCodes(store).has(moduleCode);
}
function renderWorkspaceNavigation(store) {
  const codes = subscribedModuleCodes(store);
  navButtons.forEach((button) => {
    const moduleCode = viewModuleCodes[button.dataset.view];
    const subscribed = !moduleCode || codes.has(moduleCode);
    button.classList.toggle("not-subscribed", false);
    button.dataset.subscription = subscribed
      ? "subscribed"
      : "development-visible";
    button.title = subscribed
      ? "Subscribed workspace area"
      : "Development-mode visible area; this module is not in the selected firm's current subscription profile.";
    button.setAttribute("aria-disabled", "false");
  });
}
function renderModuleBoundary(target, title, store, moduleCode) {
  const host = document.querySelector(target);
  if (!host) return;
  const contract = activeWorkspaceContract(store);
  const subscribed =
    contract.modules.map((module) => module.module_name).join(", ") ||
    "No subscribed modules";
  host.innerHTML = `<section class="panel"><div class="panel-heading"><h2>${escapeHtml(title)} not subscribed</h2><p>${escapeHtml(contract.firm?.name ?? "The active firm")} is currently bound to ${escapeHtml(contract.subscription?.package_code ?? "no active subscription package")}.</p></div><div class="boundary-note"><strong>Subscription boundary</strong><span>This page is visible for platform transparency, but actions are blocked because ${escapeHtml(title)} is not in the selected firm's workspace profile.</span></div>${renderRelatedContext(
    "Selected workspace",
    [
      ["Firm", contract.firm?.name ?? "-"],
      ["Firm type", contract.profile.firm_type ?? "UNCLASSIFIED"],
      ["Subscribed modules", subscribed],
      ["Services", workspaceServiceSummary(contract)],
      [
        "Authority",
        "No worker gains authority outside the selected firm's subscription/profile.",
      ],
    ],
  )}</section>`;
}
function renderIfSubscribed(target, title, moduleCode, renderer, store) {
  renderer(store);
}
function workerTemplateCodesForContract(contract) {
  return new Set(
    (contract.profile.worker_templates ?? []).concat(
      contract.modules
        .map((module) => module.worker_template_code)
        .filter(Boolean),
    ),
  );
}
function defaultWorkerNameForTemplate(templateCode, contract) {
  const prefix =
    contract.profile.firm_type === "ORGANIZATION_SUPPORT"
      ? "Organization Support"
      : contract.profile.firm_type === "FORMWORK_ENGINEERING"
        ? "Formwork"
        : "Virtual Firm";
  const names = {
    "front-desk-coordinator": `${prefix} Front Desk AI Worker`,
    "administration-clerk": `${prefix} Administration AI Worker`,
    "accounts-clerk": `${prefix} Accounts AI Worker`,
    "marketing-sales-coordinator": `${prefix} Sales and Proposal AI Worker`,
    "technical-drawing-assistant":
      contract.profile.firm_type === "ORGANIZATION_SUPPORT"
        ? "NHL Technical Writing and EDCS Document AI Worker"
        : `${prefix} Technical Drawing AI Worker`,
    "project-coordination-assistant": `${prefix} Project Coordination AI Worker`,
  };
  return names[templateCode] ?? `${prefix} AI Worker`;
}
function defaultServiceHint(contract) {
  return (
    contract.serviceLines[0]?.service_name ?? workspaceServiceSummary(contract)
  );
}
function defaultOutputRef(contract) {
  return contract.profile.firm_type === "ORGANIZATION_SUPPORT"
    ? "ai://outputs/organization-support-draft"
    : "ai://outputs/formwork-intake-summary";
}
function scopedStoreForActiveFirm(store) {
  const firm = ensureActiveFirm(store);
  const tenant = firm
    ? (store.tenants ?? []).find((item) => item.id === firm.tenant_id)
    : latestRecord(store, "tenants");
  if (!firm || !tenant) return store;
  const firmIds = new Set([firm.id]);
  const scopedRelationships = (store.firm_client_relationships ?? []).filter(
    (item) => item.tenant_id === tenant.id && item.firm_id === firm.id,
  );
  const relationshipIds = new Set(scopedRelationships.map((item) => item.id));
  const clientIds = new Set(scopedRelationships.map((item) => item.client_id));
  const projectIds = new Set(
    (store.projects ?? [])
      .filter(
        (item) => item.tenant_id === tenant.id && item.firm_id === firm.id,
      )
      .map((item) => item.id),
  );
  const globalCollections = new Set([
    "service_packs",
    "service_skus",
    "worker_templates",
    "auth_context",
    "ops_readiness",
    "staging_package",
    "data_protection_policy",
    "data_export_manifest",
    "pilot_package",
    "pilot_learning_loop",
    "support_summary",
  ]);
  const scoped = {
    ...store,
    _active_tenant: tenant,
    _active_firm: firm,
    _active_actor: activePrincipalActor(store),
  };
  for (const [key, value] of Object.entries(store)) {
    if (!Array.isArray(value)) continue;
    if (key === "tenants") scoped[key] = [tenant];
    else if (key === "firms") scoped[key] = [firm];
    else if (globalCollections.has(key)) scoped[key] = value;
    else if (key === "firm_client_relationships")
      scoped[key] = scopedRelationships;
    else if (key === "clients")
      scoped[key] = value.filter(
        (item) =>
          item.tenant_id === tenant.id &&
          (clientIds.has(item.id) ||
            !(store.firm_client_relationships ?? []).some(
              (rel) => rel.client_id === item.id,
            )),
      );
    else if (["leads", "intake_sessions"].includes(key))
      scoped[key] = value.filter(
        (item) =>
          item.tenant_id === tenant.id &&
          (!item.relationship_id || relationshipIds.has(item.relationship_id)),
      );
    else if (
      ["documents", "document_versions", "evidence_bundles"].includes(key)
    )
      scoped[key] = value.filter(
        (item) =>
          item.tenant_id === tenant.id &&
          (!item.project_id || projectIds.has(item.project_id)) &&
          (!item.firm_id || item.firm_id === firm.id),
      );
    else
      scoped[key] = value.filter((item) => {
        if (item.tenant_id && item.tenant_id !== tenant.id) return false;
        const scopedFirmValues = [
          item.firm_id,
          item.requesting_firm_id,
          item.provider_firm_id,
          item.accountable_firm_id,
        ].filter(Boolean);
        if (scopedFirmValues.length)
          return scopedFirmValues.some((id) => firmIds.has(id));
        if (item.relationship_id)
          return relationshipIds.has(item.relationship_id);
        if (item.client_id) return clientIds.has(item.client_id);
        if (item.project_id) return projectIds.has(item.project_id);
        return item.tenant_id === tenant.id;
      });
  }
  scoped._dashboard_summary = {
    ...(store._dashboard_summary ?? {}),
    counts: {
      clients: scoped.clients?.length ?? 0,
      open_intake: (scoped.intake_sessions ?? []).filter(
        (item) => item.intake_status !== "COMPLETE",
      ).length,
      proposals: scoped.proposals?.length ?? 0,
      projects: scoped.projects?.length ?? 0,
      approvals: scoped.approvals?.length ?? 0,
      invoices: scoped.invoices?.length ?? 0,
      events: scoped.event_log?.length ?? 0,
      audit_events: scoped.audit_events?.length ?? 0,
    },
    latest_activity: [...(scoped.event_log ?? [])].slice(-6).reverse(),
  };
  if (
    scoped.daily_operations?.firm_id &&
    scoped.daily_operations.firm_id !== firm.id
  )
    scoped.daily_operations = null;
  return scoped;
}
function renderActiveWorkspaceSelector(rawStore, scopedStore) {
  if (!activeWorkspace) return;
  const firms = selectableFirmsForStore(rawStore);
  const tenants = rawStore?.tenants ?? [];
  const contract = activeWorkspaceContract(scopedStore ?? rawStore);
  const activeFirm = contract.firm;
  const activeTenant = contract.tenant;
  if (!firms.length) {
    activeWorkspace.innerHTML = `<div class="active-workspace-card"><span>No firm workspace yet</span><strong>Create a tenant and firm from Workflow.</strong></div>`;
    return;
  }
  const options = firms
    .map((firm) => {
      const tenant = tenants.find((item) => item.id === firm.tenant_id);
      return `<option value="${escapeHtml(firm.id)}" ${firm.id === activeFirm?.id ? "selected" : ""}>${escapeHtml(firm.name)} - ${escapeHtml(tenant?.name ?? shortId(firm.tenant_id))}</option>`;
    })
    .join("");
  activeWorkspace.innerHTML = `<form id="activeFirmForm" class="active-workspace-form"><label class="active-workspace-picker"><span>Active workspace</span><select id="activeFirmSelect" name="firm_id">${options}</select></label><div class="active-workspace-card compact-context"><strong>${escapeHtml(activeTenant?.name ?? "-")}</strong><small>${escapeHtml(contract.principal?.display_name ?? contract.profile.principal_display_name ?? "Not resolved")} - ${escapeHtml(contract.profile.firm_type ?? "UNCLASSIFIED")} - ${escapeHtml(contract.subscription?.package_code ?? "Not bound")}</small><small>${escapeHtml(workspaceServiceSummary(contract))}</small></div></form>`;
  activeWorkspace
    .querySelector("#activeFirmSelect")
    ?.addEventListener("change", (event) => {
      activeFirmId = event.currentTarget.value;
      localStorage.setItem(ACTIVE_FIRM_STORAGE_KEY, activeFirmId);
      clearCommandFeedback();
      setCommandFeedback(
        "success",
        "Active firm switched",
        "Workspace shell, dashboard, modules, records, and service summary are now scoped to the selected firm.",
      );
      renderAll();
    });
}
function quotationCaseRows(store) {
  const cases = store.quotation_cases ?? [];
  if (!cases.length)
    return `<p class="empty">No quotation cases yet for ${escapeHtml(activeWorkspaceContract(store).firm?.name ?? "the active firm")}.</p>`;
  return `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Case</th><th>Type</th><th>Status</th><th>Evidence</th><th>Proposal</th></tr></thead><tbody>${cases.map((item) => `<tr><td>${escapeHtml(item.case_number)}<br/><small>${escapeHtml(item.title)}</small></td><td>${escapeHtml(humanStatus(item.quotation_type))}</td><td><span class="pill">${escapeHtml(item.status)}</span></td><td>${escapeHtml((item.intake_evidence_refs ?? []).length)} in / ${escapeHtml(item.submitted_evidence_ref ? "submitted" : "pending")}</td><td>${escapeHtml(shortId(item.proposal_id))}</td></tr>`).join("")}</tbody></table></div>`;
}
function boqExtractionAidRows(store) {
  const aids = store.boq_extraction_aids ?? [];
  if (!aids.length)
    return `<p class="empty">No BOQ extraction aids prepared yet.</p>`;
  return `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Aid</th><th>Status</th><th>Items</th><th>Confidence</th><th>Authority</th></tr></thead><tbody>${aids.map((item) => `<tr><td>${escapeHtml(shortId(item.id))}<br/><small>${escapeHtml(shortId(item.quotation_case_id))}</small></td><td><span class="pill">${escapeHtml(item.extraction_status)}</span></td><td>${escapeHtml((item.extracted_items ?? []).length)}</td><td>${escapeHtml(item.confidence_level)}</td><td>${item.authoritative ? "Authoritative" : "Review aid only"}</td></tr>`).join("")}</tbody></table></div>`;
}
function quotationDraftPackRows(store) {
  const packs = store.quotation_draft_packs ?? [];
  if (!packs.length)
    return `<p class="empty">No quotation draft packs assembled yet.</p>`;
  return `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Draft</th><th>Status</th><th>Correspondence</th><th>Items</th><th>Authority</th></tr></thead><tbody>${packs.map((item) => `<tr><td>${escapeHtml(item.draft_number ?? shortId(item.id))}<br/><small>${escapeHtml(shortId(item.quotation_case_id))}</small></td><td><span class="pill">${escapeHtml(item.draft_status)}</span></td><td>${escapeHtml(item.client_correspondence_status ?? "NOT_PREPARED")}</td><td>${escapeHtml((item.line_items ?? []).length)}</td><td>${item.client_facing ? "Client-facing" : "Draft only"}</td></tr>`).join("")}</tbody></table></div>`;
}
function quotationIssueRows(store) {
  const records = store.quotation_issue_records ?? [];
  if (!records.length)
    return '<p class="empty">No controlled quotation issues recorded yet.</p>';
  return (
    '<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Issue</th><th>Status</th><th>Issued to</th><th>Evidence</th><th>Payment</th></tr></thead><tbody>' +
    records
      .map(
        (item) =>
          "<tr><td>" +
          escapeHtml(shortId(item.id)) +
          "<br/><small>" +
          escapeHtml(shortId(item.quotation_draft_pack_id)) +
          '</small></td><td><span class="pill">' +
          escapeHtml(item.issue_status) +
          "</span></td><td>" +
          escapeHtml(item.issued_to ?? "Client") +
          "</td><td>" +
          escapeHtml(item.submitted_evidence_ref ?? "Not recorded") +
          "</td><td>" +
          (item.payment_action_taken ? "Payment action" : "No payment action") +
          "</td></tr>",
      )
      .join("") +
    "</tbody></table></div>"
  );
}
function quotationReceivablePreparationRows(store) {
  const records = store.quotation_receivable_preparations ?? [];
  if (!records.length)
    return '<p class="empty">No receivable preparations recorded yet.</p>';
  return (
    '<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Receivable prep</th><th>Status</th><th>Amount summary</th><th>Invoice draft</th><th>Boundary</th></tr></thead><tbody>' +
    records
      .map(
        (item) =>
          "<tr><td>" +
          escapeHtml(shortId(item.id)) +
          "<br/><small>" +
          escapeHtml(shortId(item.quotation_issue_record_id)) +
          '</small></td><td><span class="pill">' +
          escapeHtml(item.receivable_status) +
          "</span></td><td>" +
          escapeHtml(item.amount_summary ?? "Review required") +
          "</td><td>" +
          escapeHtml(item.invoice_draft_ref ?? "Not prepared") +
          "</td><td>" +
          escapeHtml(item.payment_boundary ?? "NO_LIVE_PAYMENT_MOVEMENT") +
          "</td></tr>",
      )
      .join("") +
    "</tbody></table></div>"
  );
}
function renderFrontDeskModule(store) {
  const enquiries = store.front_desk_enquiries ?? [],
    drafts = store.client_communication_drafts ?? [];
  const contract = activeWorkspaceContract(store);
  const tenant = contract.tenant,
    firm = contract.firm,
    actor = contract.principal;
  const serviceOptions = contract.serviceLines
    .map(
      (line) =>
        `<option value="${escapeHtml(serviceLineLabel(line))}">${escapeHtml(serviceLineLabel(line))}</option>`,
    )
    .join("");
  const defaultSummary =
    contract.profile.firm_type === "ORGANIZATION_SUPPORT"
      ? "Needs project reporting, technical writing, clerical, or EDCS support."
      : "Needs preliminary formwork design support.";
  const defaultOrg =
    contract.profile.firm_type === "ORGANIZATION_SUPPORT"
      ? "New Organization Client"
      : "New Contractor Sdn Bhd";
  const options = enquiries
    .map(
      (item) =>
        `<option value="${escapeHtml(item.id)}">${escapeHtml(item.contact_name)} - ${escapeHtml(item.status)}</option>`,
    )
    .join("");
  const rows = enquiries.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Enquiry</th><th>Service</th><th>Consent/conflict</th><th>Status</th></tr></thead><tbody>${enquiries.map((item) => `<tr><td>${escapeHtml(item.contact_name)}<br/><small>${escapeHtml(item.organization_name ?? item.source_channel)}</small></td><td>${escapeHtml(item.requested_service_hint ?? "-")}</td><td>${escapeHtml(item.consent_or_legal_basis_ref ? "Recorded" : "Missing")} / ${escapeHtml(item.conflict_check_status)}</td><td><span class="pill">${escapeHtml(item.status)}</span></td></tr>`).join("")}</tbody></table></div>`
    : `<p class="empty">No enquiries captured yet for ${escapeHtml(firm?.name ?? "the active firm")}.</p>`;
  document.querySelector("#frontDeskView").innerHTML =
    `<section class="grid two"><form id="enquiryForm" class="panel compact-form"><div class="panel-heading"><h2>Capture Enquiry</h2><p>Creates a pre-client Front Desk record for ${escapeHtml(firm?.name ?? "the active firm")}; it does not create an engagement.</p></div><label>Contact<input name="contact_name" required value="Demo Contact" /></label><label>Organization<input name="organization_name" value="${escapeHtml(defaultOrg)}" /></label><label>Email<input name="contact_email" type="email" value="client@example.com" /></label><label>Requested service<select name="requested_service_hint">${serviceOptions || `<option>${escapeHtml(defaultServiceHint(contract))}</option>`}</select></label><label>Summary<input name="enquiry_summary" required value="${escapeHtml(defaultSummary)}" /></label><button type="submit" ${tenant && firm ? "" : "disabled"}>Capture Enquiry</button></form><section class="panel compact-form"><div class="panel-heading"><h2>Controlled Progression</h2><p>Qualification requires consent/legal basis and a cleared conflict prompt.</p></div><form id="qualifyEnquiryForm"><label>Enquiry<select name="enquiry_id">${options}</select></label><label>Consent/legal basis ref<input name="consent_or_legal_basis_ref" value="CONSENT-DEMO-001" /></label><label>Conflict check ref<input name="conflict_check_ref" value="CONFLICT-DEMO-001" /></label><button type="submit" ${enquiries.length ? "" : "disabled"}>Qualify</button></form><form id="draftCommunicationForm"><label>Enquiry<select name="enquiry_id">${options}</select></label><label>Draft message<input name="message_body" value="Thank you for your enquiry. We will review the information and respond after the principal's review." /></label><button type="submit" ${enquiries.length ? "" : "disabled"}>Draft Acknowledgement</button></form><form id="handoffEnquiryForm"><label>Qualified enquiry<select name="enquiry_id">${options}</select></label><button type="submit" ${enquiries.some((item) => item.status === "QUALIFIED") ? "" : "disabled"}>Handoff to Intake</button></form><p class="form-note">Drafts require human review. No external sending is autonomous.</p></section></section><section class="panel"><div class="panel-heading"><h2>Enquiry Inbox</h2><p>${drafts.length} review-only communication draft(s) for ${escapeHtml(firm?.name ?? "the active firm")}.</p></div>${rows}</section>`;
  const act = actor ?? systemActorForBrowser(tenant?.id, firm?.id);
  document
    .querySelector("#enquiryForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Capture enquiry",
        form: event.currentTarget,
        success: "Enquiry captured",
        action: async () => {
          const data = await request("/front-desk/enquiries", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: tenant.id,
              firm_id: firm.id,
              contact_name: fd.get("contact_name"),
              organization_name: fd.get("organization_name"),
              contact_email: fd.get("contact_email"),
              enquiry_summary: fd.get("enquiry_summary"),
              requested_service_hint:
                fd.get("requested_service_hint") ||
                defaultServiceHint(contract),
              actor: act,
            }),
          });
          await refresh();
          switchView("front-desk");
          return data;
        },
      });
    });
  document
    .querySelector("#qualifyEnquiryForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Qualify enquiry",
        form: event.currentTarget,
        success: "Enquiry qualified",
        action: async () => {
          const data = await request("/front-desk/enquiries/qualify", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: tenant.id,
              firm_id: firm.id,
              enquiry_id: fd.get("enquiry_id"),
              decision: "QUALIFIED",
              consent_or_legal_basis_ref: fd.get("consent_or_legal_basis_ref"),
              conflict_check_status: "CLEARED",
              conflict_check_ref: fd.get("conflict_check_ref"),
              actor: act,
            }),
          });
          await refresh();
          switchView("front-desk");
          return data;
        },
      });
    });
  document
    .querySelector("#draftCommunicationForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Draft acknowledgement",
        form: event.currentTarget,
        success: "Draft saved for review",
        action: async () => {
          const data = await request("/front-desk/communication-drafts", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: tenant.id,
              firm_id: firm.id,
              enquiry_id: fd.get("enquiry_id"),
              message_body: fd.get("message_body"),
              actor: act,
            }),
          });
          await refresh();
          switchView("front-desk");
          return data;
        },
      });
    });
  document
    .querySelector("#handoffEnquiryForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Handoff to intake",
        form: event.currentTarget,
        success: "Enquiry handed off with intake controls",
        action: async () => {
          const data = await request("/front-desk/enquiries/handoff", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: tenant.id,
              firm_id: firm.id,
              enquiry_id: fd.get("enquiry_id"),
              provided_inputs: {},
              actor: act,
            }),
          });
          await refresh();
          switchView("front-desk");
          return data;
        },
      });
    });
}
function renderAdministrationModule(store) {
  const tenant = latestRecord(store, "tenants"),
    firm = latestRecord(store, "firms"),
    actor = firm ? latestPrincipalActor(store, firm.id) : null,
    auth = actor ?? systemActorForBrowser(tenant?.id, firm?.id);
  const docs = store.document_register_entries ?? [],
    revisions = store.document_revision_records ?? [],
    deadlines = store.administrative_deadlines ?? [],
    correspondence = store.correspondence_records ?? [],
    transmittals = store.transmittal_drafts ?? [],
    bindings = store.administration_skill_bindings ?? [];
  const docOptions = docs
    .map(
      (x) =>
        `<option value="${escapeHtml(x.id)}">${escapeHtml(x.document_number)} - ${escapeHtml(x.title)}</option>`,
    )
    .join("");
  const revOptions = revisions
    .filter((x) => x.status === "CURRENT")
    .map(
      (x) =>
        `<option value="${escapeHtml(x.id)}">${escapeHtml(docs.find((d) => d.id === x.document_register_entry_id)?.document_number ?? "-")} Rev ${escapeHtml(x.revision)}</option>`,
    )
    .join("");
  const deadlineOptions = deadlines
    .filter((x) => x.status === "OPEN")
    .map(
      (x) =>
        `<option value="${escapeHtml(x.id)}">${escapeHtml(x.title)}</option>`,
    )
    .join("");
  document.querySelector("#administrationView").innerHTML =
    `<section class="grid two"><section class="panel compact-form"><div class="panel-heading"><h2>Administration Clerk</h2><p>Bounded skills, schemas, permissions, supervisor, and prohibited actions.</p></div><form id="adminBindingForm"><label>Role skill ref<input name="role_skill_ref" value="skills://roles/administration-clerk/v1" /></label><label>Worker skill ref<input name="worker_skill_ref" value="skills://workers/document-controller/v1" /></label><button type="submit" ${tenant && firm && !bindings.length ? "" : "disabled"}>Activate Binding</button></form><form id="correspondenceForm"><label>Correspondent<input name="correspondent" value="Client Project Manager" /></label><label>Subject<input name="subject" value="Incoming drawing package" /></label><button type="submit" ${tenant && firm ? "" : "disabled"}>Register Correspondence</button></form></section><section class="panel compact-form"><div class="panel-heading"><h2>Document Register</h2><p>Document numbers and revisions are deterministic and immutable.</p></div><form id="documentRegisterForm"><label>Document no.<input name="document_number" value="FW-DWG-001" /></label><label>Title<input name="title" value="Wall Formwork General Arrangement" /></label><label>Revision<input name="revision" value="A" /></label><label>Storage ref<input name="storage_ref" value="local://documents/FW-DWG-001-A.pdf" /></label><button type="submit" ${tenant && firm ? "" : "disabled"}>Register Document</button></form><form id="documentRevisionForm"><label>Document<select name="document_register_entry_id">${docOptions}</select></label><label>New revision<input name="revision" value="B" /></label><label>Storage ref<input name="storage_ref" value="local://documents/FW-DWG-001-B.pdf" /></label><button type="submit" ${docs.length ? "" : "disabled"}>Add Revision</button></form></section></section><section class="grid two"><section class="panel compact-form"><div class="panel-heading"><h2>Deadlines</h2><p>Open follow-ups remain visible until explicitly completed.</p></div><form id="deadlineForm"><label>Title<input name="title" value="Review incoming drawing package" /></label><label>Due<input name="due_at" type="datetime-local" /></label><button type="submit" ${tenant && firm ? "" : "disabled"}>Create Deadline</button></form><form id="deadlineCompleteForm"><label>Open deadline<select name="deadline_id">${deadlineOptions}</select></label><button type="submit" ${deadlineOptions ? "" : "disabled"}>Complete Deadline</button></form></section><section class="panel compact-form"><div class="panel-heading"><h2>Transmittal Preparation</h2><p>Draft only. Principal approval and issue are intentionally unavailable.</p></div><form id="transmittalForm"><label>Recipient<input name="recipient" value="Client Project Manager" /></label><label>Subject<input name="subject" value="Drawing package for review" /></label><label>Current revision<select name="document_revision_ref">${revOptions}</select></label><label>Message<input name="message_body" value="Please find the listed document prepared for review." /></label><button type="submit" ${revOptions ? "" : "disabled"}>Prepare Review Draft</button></form></section></section><section class="panel"><div class="panel-heading"><h2>Administration Register</h2><p>${correspondence.length} correspondence - ${docs.length} documents - ${deadlines.filter((x) => x.status === "OPEN").length} open deadlines - ${transmittals.length} review drafts.</p></div>${
      docs.length
        ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Document</th><th>Current revision</th><th>Status</th></tr></thead><tbody>${docs
            .map((d) => {
              const r = revisions.find((x) => x.id === d.current_revision_id);
              return `<tr><td>${escapeHtml(d.document_number)}<br/><small>${escapeHtml(d.title)}</small></td><td>${escapeHtml(r?.revision ?? "-")}</td><td><span class="pill">${escapeHtml(d.status)}</span></td></tr>`;
            })
            .join("")}</tbody></table></div>`
        : '<p class="empty">No documents registered.</p>'
    }</section>`;
  const run = (selector, label, path, build, success) =>
    document.querySelector(selector)?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      await runUiCommand({
        label,
        form: e.currentTarget,
        success,
        action: async () => {
          const data = await request(path, {
            method: "POST",
            body: JSON.stringify({
              ...build(fd),
              tenant_id: tenant.id,
              firm_id: firm.id,
              actor: auth,
            }),
          });
          await refresh();
          switchView("administration");
          return data;
        },
      });
    });
  run(
    "#adminBindingForm",
    "Activate Administration binding",
    "/administration/skill-bindings",
    (fd) => ({
      role_skill_ref: fd.get("role_skill_ref"),
      worker_skill_ref: fd.get("worker_skill_ref"),
    }),
    "Administration Clerk binding activated",
  );
  run(
    "#correspondenceForm",
    "Register correspondence",
    "/administration/correspondence",
    (fd) => ({
      correspondent: fd.get("correspondent"),
      subject: fd.get("subject"),
      direction: "INCOMING",
      channel: "EMAIL",
    }),
    "Correspondence registered",
  );
  run(
    "#documentRegisterForm",
    "Register document",
    "/administration/documents",
    (fd) => ({
      document_number: fd.get("document_number"),
      title: fd.get("title"),
      document_type: "DRAWING",
      revision: fd.get("revision"),
      storage_ref: fd.get("storage_ref"),
      content_hash: `manual:${fd.get("document_number")}:${fd.get("revision")}`,
    }),
    "Document registered",
  );
  run(
    "#documentRevisionForm",
    "Add revision",
    "/administration/document-revisions",
    (fd) => ({
      document_register_entry_id: fd.get("document_register_entry_id"),
      revision: fd.get("revision"),
      storage_ref: fd.get("storage_ref"),
      content_hash: `manual:${fd.get("document_register_entry_id")}:${fd.get("revision")}`,
    }),
    "Revision registered",
  );
  run(
    "#deadlineForm",
    "Create deadline",
    "/administration/deadlines",
    (fd) => ({
      title: fd.get("title"),
      due_at: fd.get("due_at") || new Date(Date.now() + 86400000).toISOString(),
    }),
    "Deadline created",
  );
  run(
    "#deadlineCompleteForm",
    "Complete deadline",
    "/administration/deadlines/complete",
    (fd) => ({ deadline_id: fd.get("deadline_id") }),
    "Deadline completed",
  );
  run(
    "#transmittalForm",
    "Prepare transmittal",
    "/administration/transmittal-drafts",
    (fd) => ({
      recipient: fd.get("recipient"),
      subject: fd.get("subject"),
      document_revision_refs: [fd.get("document_revision_ref")],
      message_body: fd.get("message_body"),
    }),
    "Transmittal draft saved for principal review",
  );
}
function renderClientModule(store) {
  const latestFirm = latestRecord(store, "firms");
  const latestTenant = latestFirm
    ? store.tenants?.find((tenant) => tenant.id === latestFirm.tenant_id)
    : latestRecord(store, "tenants");
  const principalActor = latestFirm
    ? latestPrincipalActor(store, latestFirm.id)
    : null;
  const records = store.clients ?? [];
  const canCreateClient = Boolean(latestTenant && latestFirm);
  const rows = records.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Relationship</th><th>Detail</th></tr></thead><tbody>${records
        .map((record, index) => {
          const relationship = store.firm_client_relationships?.find(
            (item) => item.client_id === record.id,
          );
          return `<tr><td>${escapeHtml(record.name)}</td><td>${escapeHtml(record.client_type)}</td><td>${escapeHtml(record.status)}</td><td>${escapeHtml(shortId(relationship?.id))}</td><td><button class="secondary small" data-client-detail="${index}">View</button></td></tr>`;
        })
        .join(
          "",
        )}</tbody></table></div><pre class="output detail-output" id="clientDetailBox">Select a client.</pre>`
    : `<p class="empty">No clients yet. Create a tenant and firm first, then add a client here.</p>`;
  document.querySelector("#clientsView").innerHTML =
    `<section class="grid two"><form id="clientCreateForm" class="panel compact-form"><div class="panel-heading"><h2>Create Client</h2><p>Add a client to the latest active Firm.</p></div><label>Tenant<input value="${escapeHtml(latestTenant?.name ?? "Create tenant first")}" disabled /></label><label>Firm<input value="${escapeHtml(latestFirm?.name ?? "Create firm first")}" disabled /></label><label>Client name<input name="name" value="New Contractor Sdn Bhd" required /></label><label>Client type<select name="client_type"><option value="ORGANIZATION">Organization</option><option value="INDIVIDUAL">Individual</option></select></label><button type="submit" ${canCreateClient ? "" : "disabled"}>Create Client</button>${disabledHint(canCreateClient, "Create a tenant and firm first from the Workflow tab.")}<p class="form-note">Endpoint: POST /clients</p></form><section class="panel"><div class="panel-heading"><h2>Clients</h2><p>Client and firm relationship records.</p></div>${rows}</section></section>`;
  document
    .querySelector("#clientCreateForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Create client",
        form: event.currentTarget,
        success: "Client created",
        action: async () => {
          const data = await request("/clients", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              name: formData.get("name"),
              client_type: formData.get("client_type"),
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm.id),
            }),
          });
          state.client = data.client;
          state.relationship = data.relationship;
          await refresh();
          switchView("clients");
          return data;
        },
      });
    });
  document.querySelectorAll("button[data-client-detail]").forEach((button) =>
    button.addEventListener("click", () => {
      const record = records[Number(button.dataset.clientDetail)];
      const relationship = store.firm_client_relationships?.find(
        (item) => item.client_id === record.id,
      );
      document.querySelector("#clientDetailBox").innerHTML =
        renderHumanDetail(
          record.name,
          [
            ["Client type", record.client_type],
            ["Status", record.status],
            ["Relationship", shortId(relationship?.id)],
            ["Tenant", shortId(record.tenant_id)],
            ["Firm", shortId(record.firm_id)],
            ["Created", record.created_at],
          ],
          { client: record, relationship },
        ) +
        renderRelatedContext("Related workflow", [
          [
            "Intake sessions",
            countBy(
              store.leads,
              (lead) => lead.relationship_id === relationship?.id,
            ),
          ],
          [
            "Proposals",
            countBy(
              store.proposals,
              (proposal) => proposal.relationship_id === relationship?.id,
            ),
          ],
          [
            "Projects",
            countBy(
              store.projects,
              (project) => project.relationship_id === relationship?.id,
            ),
          ],
          [
            "Invoices",
            countBy(
              store.invoices,
              (invoice) => invoice.relationship_id === relationship?.id,
            ),
          ],
        ]);
    }),
  );
}
function renderIntakeModule(store) {
  const relationships = store.firm_client_relationships ?? [];
  const latestFirm = latestRecord(store, "firms");
  const latestTenant = latestFirm
    ? store.tenants?.find((tenant) => tenant.id === latestFirm.tenant_id)
    : latestRecord(store, "tenants");
  const principalActor = latestFirm
    ? latestPrincipalActor(store, latestFirm.id)
    : null;
  const records = store.intake_sessions ?? [];
  const canCreateIntake = Boolean(
    relationships.length && latestTenant && latestFirm,
  );
  const relationshipOptions = relationships
    .map(
      (relationship) =>
        `<option value="${escapeHtml(relationship.id)}">${escapeHtml(relationName(store, relationship.id))} - ${escapeHtml(shortId(relationship.id))}</option>`,
    )
    .join("");
  const rows = records.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Status</th><th>Missing</th><th>Service</th><th>Lead</th><th>Detail</th></tr></thead><tbody>${records.map((record, index) => `<tr><td>${escapeHtml(record.intake_status)}</td><td>${escapeHtml(record.missing_information_items?.length ?? 0)}</td><td>${escapeHtml(record.service_id)}</td><td>${escapeHtml(shortId(record.lead_id))}</td><td><button class="secondary small" data-intake-detail="${index}">View</button></td></tr>`).join("")}</tbody></table></div><pre class="output detail-output" id="intakeDetailBox">Select an intake.</pre>`
    : `<p class="empty">No intake sessions yet. Create a client first, then create intake here.</p>`;
  document.querySelector("#intakeView").innerHTML =
    `<section class="grid two"><form id="intakeCreateForm" class="panel compact-form"><div class="panel-heading"><h2>Create Formwork Intake</h2><p>Start the front-door intake for an existing client relationship.</p></div><label>Client relationship<select name="relationship_id" required>${relationshipOptions}</select></label><label>Project name<input name="project_name" value="Basement Wall Formwork Package" required /></label><label>Site location<input name="site_location" value="Kuala Lumpur" required /></label><label>Element type<select name="formwork_element_type"><option value="wall">Wall</option><option value="slab">Slab</option><option value="column">Column</option><option value="beam">Beam</option></select></label><label>Height<input name="height" type="number" step="0.1" value="3.5" required /></label><label>Length / Area<input name="length_or_area" type="number" step="0.1" value="120" required /></label><label>Concrete grade<input name="concrete_grade" value="C30" required /></label><label>Available drawing ref<input name="drawing_ref" value="S-100" /></label><button type="submit" ${canCreateIntake ? "" : "disabled"}>Create Intake</button>${disabledHint(canCreateIntake, "Create at least one client relationship before starting intake.")}<p class="form-note">Endpoint: POST /intake-sessions</p></form><section class="panel"><div class="panel-heading"><h2>Intake Sessions</h2><p>Lead and intake records with missing information status.</p></div>${rows}</section></section>`;
  document
    .querySelector("#intakeCreateForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const relationship = relationships.find(
        (item) => item.id === formData.get("relationship_id"),
      );
      const client = store.clients?.find(
        (item) => item.id === relationship?.client_id,
      );
      const provided_inputs = {
        project_name: formData.get("project_name"),
        site_location: formData.get("site_location"),
        client_organization: client?.name ?? "Unknown Client",
        client_contact_name: "Demo Contact",
        client_contact_email: "client@example.com",
        structure_type: "basement",
        formwork_element_type: formData.get("formwork_element_type"),
        height: Number(formData.get("height")),
        length_or_area: Number(formData.get("length_or_area")),
        concrete_grade: formData.get("concrete_grade"),
        available_drawings: [formData.get("drawing_ref")].filter(Boolean),
        deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
        required_deliverables: ["preliminary_support_report"],
      };
      await runUiCommand({
        label: "Create intake",
        form: event.currentTarget,
        success: "Intake session created",
        action: async () => {
          const data = await request("/intake-sessions", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              relationship_id: relationship.id,
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm.id),
              provided_inputs,
            }),
          });
          state.lead = data.lead;
          state.intake = data.intake;
          state.relationship = relationship;
          state.client = client;
          await refresh();
          switchView("intake");
          return data;
        },
      });
    });
  document.querySelectorAll("button[data-intake-detail]").forEach((button) =>
    button.addEventListener("click", () => {
      const record = records[Number(button.dataset.intakeDetail)];
      const lead = store.leads?.find((item) => item.id === record.lead_id);
      const completeness = intakeCompleteness(record);
      document.querySelector("#intakeDetailBox").innerHTML =
        renderHumanDetail(
          record.provided_inputs?.project_name ?? "Formwork intake",
          [
            ["Status", record.intake_status],
            ["Missing items", record.missing_information_items?.length ?? 0],
            ["Service", shortId(record.service_id)],
            ["Lead", shortId(record.lead_id)],
            ["Site", record.provided_inputs?.site_location],
            ["Element", record.provided_inputs?.formwork_element_type],
          ],
          { intake: record, lead },
        ) +
        renderRelatedContext(
          "Intake completeness",
          completeness.map(([key, ok]) => [key, ok ? "Complete" : "Missing"]),
        );
    }),
  );
}
function systemActorForBrowser(tenant_id, firm_id) {
  return {
    actor_id: "system",
    actor_type: "SYSTEM",
    tenant_id,
    firm_id,
    display_name: "vFirm System",
  };
}
function renderProposalModule(store) {
  const latestFirm = latestRecord(store, "firms");
  const latestTenant = latestFirm
    ? store.tenants?.find((tenant) => tenant.id === latestFirm.tenant_id)
    : latestRecord(store, "tenants");
  const principalActor = latestFirm
    ? latestPrincipalActor(store, latestFirm.id)
    : null;
  const completeIntakes = (store.intake_sessions ?? []).filter(
    (item) => item.intake_status === "COMPLETE",
  );
  const proposals = store.proposals ?? [];
  const intakeOptions = completeIntakes
    .map(
      (intake) =>
        `<option value="${escapeHtml(intake.id)}">${escapeHtml(shortId(intake.id))} - ${escapeHtml(intake.provided_inputs?.project_name ?? "Formwork intake")}</option>`,
    )
    .join("");
  const proposalOptions = proposals
    .map(
      (proposal) =>
        `<option value="${escapeHtml(proposal.id)}">${escapeHtml(shortId(proposal.id))} - ${escapeHtml(proposal.proposal_status)} - ${escapeHtml(relationName(store, proposal.relationship_id))}</option>`,
    )
    .join("");
  const approvedOptions = proposals
    .filter((proposal) =>
      ["APPROVED", "SENT"].includes(proposal.proposal_status),
    )
    .map(
      (proposal) =>
        `<option value="${escapeHtml(proposal.id)}">${escapeHtml(shortId(proposal.id))} - ${escapeHtml(relationName(store, proposal.relationship_id))}</option>`,
    )
    .join("");
  const canCreateProposal = Boolean(
    completeIntakes.length && latestTenant && latestFirm,
  );
  const canApproveProposal = Boolean(proposalOptions);
  const canAcceptProposal = Boolean(approvedOptions);
  const rows = proposals.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Client</th><th>Status</th><th>Scope</th><th>Price Ref</th><th>Detail</th></tr></thead><tbody>${proposals.map((record, index) => `<tr><td>${escapeHtml(relationName(store, record.relationship_id))}</td><td><span class="pill">${escapeHtml(record.proposal_status)}</span></td><td>${escapeHtml(record.scope_summary)}</td><td>${escapeHtml(shortId(record.price_build_up_id))}</td><td><button class="secondary small" data-proposal-detail="${index}">View</button></td></tr>`).join("")}</tbody></table></div><pre class="output detail-output" id="proposalDetailBox">Select a proposal.</pre>`
    : `<p class="empty">No proposals yet. Complete an intake first, then create a proposal here.</p>`;
  document.querySelector("#proposalsView").innerHTML =
    `<section class="grid two"><form id="proposalCreateForm" class="panel compact-form"><div class="panel-heading"><h2>Create Proposal</h2><p>Create a scope and price build-up from a completed intake.</p></div><label>Completed intake<select name="intake_session_id" required>${intakeOptions}</select></label><label>Scope summary<input name="scope_summary" value="Preliminary formwork design support package" required /></label><label>Final price<input name="final_price" type="number" value="2500" min="0" /></label><button type="submit" ${canCreateProposal ? "" : "disabled"}>Create Proposal</button>${disabledHint(canCreateProposal, "Complete an intake before creating a proposal.")}<p class="form-note">Endpoint: POST /proposals</p></form><section class="panel compact-form"><div class="panel-heading"><h2>Proposal Actions</h2><p>Approve proposal, then accept it to open a project.</p></div><form id="proposalApproveForm"><label>Proposal<select name="proposal_id" required>${proposalOptions}</select></label><button type="submit" ${canApproveProposal ? "" : "disabled"}>Approve Proposal</button>${disabledHint(canApproveProposal, "Create a proposal before approval.")}<p class="form-note">Endpoint: POST /proposals/approve</p></form><hr class="soft-divider" /><form id="proposalAcceptForm"><label>Approved proposal<select name="proposal_id" required>${approvedOptions}</select></label><label>Project name<input name="project_name" value="Basement Wall Formwork Package" required /></label><button type="submit" ${canAcceptProposal ? "" : "disabled"}>Accept / Open Project</button>${disabledHint(canAcceptProposal, "Approve a proposal before accepting it.")}<p class="form-note">Endpoint: POST /proposals/accept</p></form></section></section><section class="panel"><div class="panel-heading"><h2>Proposals</h2><p>Proposal and price records.</p></div>${rows}</section>`;
  document
    .querySelector("#proposalCreateForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const intake = completeIntakes.find(
        (item) => item.id === formData.get("intake_session_id"),
      );
      const lead = store.leads?.find((item) => item.id === intake?.lead_id);
      await runUiCommand({
        label: "Create proposal",
        form: event.currentTarget,
        success: "Proposal created",
        action: async () => {
          const data = await request("/proposals", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              relationship_id: lead.relationship_id,
              intake_session_id: intake.id,
              scope_summary: formData.get("scope_summary"),
              final_price: Number(formData.get("final_price") || 0),
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm.id),
            }),
          });
          state.price = data.price;
          state.proposal = data.proposal;
          state.intake = intake;
          await refresh();
          switchView("proposals");
          return data;
        },
      });
    });
  document
    .querySelector("#proposalApproveForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const proposal_id = new FormData(event.currentTarget).get("proposal_id");
      await runUiCommand({
        label: "Approve proposal",
        form: event.currentTarget,
        success: "Proposal approved",
        action: async () => {
          const data = await request("/proposals/approve", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              proposal_id,
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm.id),
            }),
          });
          state.approval = data.approval;
          state.proposal = data.proposal;
          await refresh();
          switchView("proposals");
          return data;
        },
      });
    });
  document
    .querySelector("#proposalAcceptForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Accept proposal",
        form: event.currentTarget,
        success: "Project opened",
        action: async () => {
          const data = await request("/proposals/accept", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              proposal_id: formData.get("proposal_id"),
              project_name: formData.get("project_name"),
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm.id),
            }),
          });
          state.proposal = data.proposal;
          state.engagement = data.engagement;
          state.project = data.project;
          state.workPackage = data.workPackage;
          state.task = data.task;
          await refresh();
          switchView("projects");
          return data;
        },
      });
    });
  document.querySelectorAll("button[data-proposal-detail]").forEach((button) =>
    button.addEventListener("click", () => {
      const proposal = proposals[Number(button.dataset.proposalDetail)];
      const price = store.price_build_ups?.find(
        (item) => item.id === proposal.price_build_up_id,
      );
      const approvals =
        store.approvals?.filter(
          (item) =>
            item.subject_type === "Proposal" && item.subject_id === proposal.id,
        ) ?? [];
      document.querySelector("#proposalDetailBox").innerHTML =
        renderHumanDetail(
          proposal.scope_summary,
          [
            ["Status", proposal.proposal_status],
            ["Client", relationName(store, proposal.relationship_id)],
            ["Price", money(price?.final_price, "MYR")],
            ["Approval ref", shortId(proposal.commercial_approval_id)],
            ["Valid until", proposal.valid_until],
            ["Version", proposal.version],
          ],
          { proposal, price, approvals },
        ) +
        renderRelatedContext("Commercial context", [
          ["Approval decisions", approvals.length],
          [
            "Engagement",
            shortId(
              (store.engagements ?? []).find(
                (engagement) => engagement.proposal_id === proposal.id,
              )?.id,
            ),
          ],
          [
            "Project",
            shortId(
              (store.projects ?? []).find(
                (project) =>
                  project.relationship_id === proposal.relationship_id,
              )?.id,
            ),
          ],
          [
            "Policy decisions",
            countBy(
              store.policy_decisions,
              (decision) => decision.resource_id === proposal.id,
            ),
          ],
        ]);
    }),
  );
}
function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
function renderProjectModule(store) {
  const projects = store.projects ?? [];
  const latestFirm = latestRecord(store, "firms");
  const latestTenant = latestFirm
    ? store.tenants?.find((tenant) => tenant.id === latestFirm.tenant_id)
    : latestRecord(store, "tenants");
  const principalActor = latestFirm
    ? latestPrincipalActor(store, latestFirm.id)
    : null;
  const projectOptions = projects
    .map(
      (project) =>
        `<option value="${escapeHtml(project.id)}">${escapeHtml(project.project_name)} - ${escapeHtml(shortId(project.id))}</option>`,
    )
    .join("");
  const latestProject = latestRecord(store, "projects");
  const latestTask = latestProject
    ? [...(store.tasks ?? [])]
        .reverse()
        .find((task) => task.project_id === latestProject.id)
    : null;
  const latestEvidence = latestProject
    ? [...(store.evidence_bundles ?? [])]
        .reverse()
        .find((evidence) => evidence.project_id === latestProject.id)
    : null;
  const latestVersion = latestProject
    ? [...(store.document_versions ?? [])]
        .reverse()
        .find((version) =>
          (store.documents ?? []).some(
            (doc) =>
              doc.id === version.document_id &&
              doc.project_id === latestProject.id,
          ),
        )
    : null;
  const latestDeliverableApproval = latestVersion
    ? [...(store.approvals ?? [])]
        .reverse()
        .find(
          (approval) =>
            approval.subject_type === "DocumentVersion" &&
            approval.subject_id === latestVersion.id,
        )
    : null;
  const canRunProjectActions = Boolean(projects.length);
  const latestWorkPackage = latestProject
    ? [...(store.work_packages ?? [])]
        .reverse()
        .find((item) => item.project_id === latestProject.id)
    : null;
  const requiredEvidence =
    latestWorkPackage?.required_evidence ?? formworkEvidenceRequirements(store);
  const rows = projects.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Project</th><th>State</th><th>Risk</th><th>Tasks</th><th>Evidence</th><th>Docs</th><th>Detail</th></tr></thead><tbody>${projects.map((project, index) => `<tr><td>${escapeHtml(project.project_name)}</td><td><span class="pill">${escapeHtml(project.project_state)}</span></td><td>${escapeHtml(project.risk_class)}</td><td>${(store.tasks ?? []).filter((item) => item.project_id === project.id).length}</td><td>${(store.evidence_bundles ?? []).filter((item) => item.project_id === project.id).length}</td><td>${(store.documents ?? []).filter((item) => item.project_id === project.id).length}</td><td><button class="secondary small" data-project-detail="${index}">View</button></td></tr>`).join("")}</tbody></table></div><pre class="output detail-output" id="projectDetailBox">Select a project.</pre>`
    : `<p class="empty">No projects yet. Accept an approved proposal first.</p>`;
  document.querySelector("#projectsView").innerHTML =
    `<section class="grid two"><section class="panel compact-form"><div class="panel-heading"><h2>Delivery Engine Actions</h2><p>Move the project through task, evidence, review, issue, and invoice gates.</p></div><form id="taskStartForm"><label>Project<select name="project_id" required>${projectOptions}</select></label><button type="submit" ${latestTask && ["CREATED", "READY"].includes(latestTask.state) ? "" : "disabled"}>Start Current Task</button>${disabledHint(Boolean(latestTask && ["CREATED", "READY"].includes(latestTask.state)), "Open a project with a created task before starting.")}<p class="form-note">Endpoint: POST /tasks/start</p></form><form id="taskCompleteForm"><button type="submit" ${latestTask && latestTask.state !== "COMPLETE" ? "" : "disabled"}>Complete Current Task</button>${disabledHint(Boolean(latestTask && latestTask.state !== "COMPLETE"), "Start or create a task before completion.")}<p class="form-note">Endpoint: POST /tasks/complete</p></form><hr class="soft-divider" /><form id="projectEvidenceForm"><label>Project<select name="project_id" required>${projectOptions}</select></label><button type="submit" ${canRunProjectActions ? "" : "disabled"}>Create Complete Evidence Bundle</button>${disabledHint(canRunProjectActions, "Open a project before creating evidence.")}<p class="form-note">Endpoint: POST /evidence-bundles</p></form><form id="deliverableDraftForm"><button type="submit" ${canRunProjectActions ? "" : "disabled"}>Create Deliverable Draft</button><p class="form-note">Endpoint: POST /deliverables/draft</p></form><form id="deliverableReviewForm"><button type="submit" ${latestEvidence && latestVersion ? "" : "disabled"}>Review / Approve Deliverable</button>${disabledHint(Boolean(latestEvidence && latestVersion), "Create evidence and a deliverable draft first.")}<p class="form-note">Endpoint: POST /deliverables/review</p></form><form id="deliverableIssueForm"><button type="submit" ${latestDeliverableApproval && latestVersion ? "" : "disabled"}>Issue Deliverable</button>${disabledHint(Boolean(latestDeliverableApproval && latestVersion), "Professional review approval is required before issue.")}<p class="form-note">Endpoint: POST /deliverables/issue</p></form><hr class="soft-divider" /><form id="projectInvoiceForm"><label>Amount<input name="amount" type="number" value="2500" min="0" /></label><button type="submit" ${canRunProjectActions ? "" : "disabled"}>Create Invoice</button>${disabledHint(canRunProjectActions, "Open a project before creating an invoice.")}<p class="form-note">Endpoint: POST /invoices</p></form></section><section class="panel"><div class="panel-heading"><h2>Project Detail</h2><p>Project, task, evidence, deliverable version, approval, and invoice context.</p></div><pre class="output detail-output" id="projectContextBox">Select a project or run an action.</pre></section></section><section class="panel"><div class="panel-heading"><h2>Projects</h2><p>Projects opened from accepted proposals.</p></div>${rows}</section>`;
  function context(project) {
    const docs = (store.documents ?? []).filter(
      (x) => x.project_id === project.id,
    );
    const versions = (store.document_versions ?? []).filter((x) =>
      docs.some((doc) => doc.id === x.document_id),
    );
    return {
      project,
      engagement: (store.engagements ?? []).find(
        (x) => x.id === project.engagement_id,
      ),
      work_packages: (store.work_packages ?? []).filter(
        (x) => x.project_id === project.id,
      ),
      tasks: (store.tasks ?? []).filter((x) => x.project_id === project.id),
      evidence_bundles: (store.evidence_bundles ?? []).filter(
        (x) => x.project_id === project.id,
      ),
      documents: docs,
      document_versions: versions,
      invoices: (store.invoices ?? []).filter(
        (x) => x.project_id === project.id,
      ),
    };
  }
  function renderProjectContext(project) {
    const ctx = context(project);
    return (
      renderHumanDetail(
        project.project_name,
        [
          ["State", project.project_state],
          ["Risk", project.risk_class],
          ["Engagement", shortId(project.engagement_id)],
          ["Tasks", ctx.tasks.length],
          ["Evidence", ctx.evidence_bundles.length],
          ["Documents", ctx.documents.length],
          ["Invoices", ctx.invoices.length],
        ],
        ctx,
      ) +
      renderRelatedContext("Stage 5 delivery gates", [
        ["Task state", ctx.tasks[0]?.state ?? "No task"],
        [
          "Evidence status",
          ctx.evidence_bundles.at(-1)?.status ?? "No evidence",
        ],
        [
          "Document version",
          ctx.document_versions.at(-1)?.status ?? "No draft",
        ],
        [
          "Review approval",
          (store.approvals ?? []).find(
            (approval) =>
              approval.subject_id === ctx.document_versions.at(-1)?.id,
          )?.decision ?? "Not approved",
        ],
        ["Required evidence", requiredEvidence.join(", ")],
        ["Invoice status", ctx.invoices[0]?.status ?? "Not created"],
      ])
    );
  }
  document.querySelectorAll("button[data-project-detail]").forEach((button) =>
    button.addEventListener("click", () => {
      const project = projects[Number(button.dataset.projectDetail)];
      const html = renderProjectContext(project);
      document.querySelector("#projectDetailBox").innerHTML = html;
      document.querySelector("#projectContextBox").innerHTML = html;
    }),
  );
  document
    .querySelector("#taskStartForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await runUiCommand({
        label: "Start task",
        form: event.currentTarget,
        success: "Task started",
        action: async () => {
          const data = await request("/tasks/start", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              task_id: latestTask.id,
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm.id),
            }),
          });
          await refresh();
          switchView("projects");
          return data;
        },
      });
    });
  document
    .querySelector("#taskCompleteForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await runUiCommand({
        label: "Complete task",
        form: event.currentTarget,
        success: "Task completed",
        action: async () => {
          const data = await request("/tasks/complete", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              task_id: latestTask.id,
              output_ref: "formwork_intake_completeness",
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm.id),
            }),
          });
          await refresh();
          switchView("projects");
          return data;
        },
      });
    });
  document
    .querySelector("#projectEvidenceForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const project = projects.find(
        (x) => x.id === new FormData(event.currentTarget).get("project_id"),
      );
      await runUiCommand({
        label: "Create complete evidence bundle",
        form: event.currentTarget,
        success: "Evidence bundle created",
        action: async () => {
          const data = await request("/evidence-bundles", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              project_id: project.id,
              subject_type: "Project",
              subject_id: project.id,
              input_refs: requiredEvidence,
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm.id),
            }),
          });
          state.evidence = data;
          await refresh();
          switchView("projects");
          return data;
        },
      });
    });
  document
    .querySelector("#deliverableDraftForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await runUiCommand({
        label: "Create deliverable draft",
        form: event.currentTarget,
        success: "Deliverable draft created",
        action: async () => {
          const data = await request("/deliverables/draft", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              project_id: latestProject.id,
              relationship_id: latestProject.relationship_id,
              title: `${latestProject.project_name} Preliminary Report`,
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm.id),
            }),
          });
          await refresh();
          switchView("projects");
          return data;
        },
      });
    });
  document
    .querySelector("#deliverableReviewForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await runUiCommand({
        label: "Review deliverable",
        form: event.currentTarget,
        success: "Deliverable approved",
        action: async () => {
          const data = await request("/deliverables/review", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              project_id: latestProject.id,
              document_version_id: latestVersion.id,
              evidence_bundle_id: latestEvidence.id,
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm.id),
            }),
          });
          await refresh();
          switchView("projects");
          return data;
        },
      });
    });
  document
    .querySelector("#deliverableIssueForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await runUiCommand({
        label: "Issue deliverable",
        form: event.currentTarget,
        success: "Deliverable issued",
        action: async () => {
          const data = await request("/deliverables/issue", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              project_id: latestProject.id,
              document_version_id: latestVersion.id,
              evidence_bundle_id: latestEvidence.id,
              approval_id: latestDeliverableApproval.id,
              subject_version_or_hash: latestVersion.hash,
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm.id),
            }),
          });
          await refresh();
          switchView("projects");
          return data;
        },
      });
    });
  document
    .querySelector("#projectInvoiceForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Create invoice",
        form: event.currentTarget,
        success: "Invoice created",
        action: async () => {
          const data = await request("/invoices", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              relationship_id: latestProject.relationship_id,
              engagement_id: latestProject.engagement_id,
              project_id: latestProject.id,
              currency: "MYR",
              line_items: [
                {
                  description:
                    "Formwork Design Support - Preliminary Wall/Slab Package",
                  amount: Number(fd.get("amount") || 0),
                },
              ],
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm.id),
            }),
          });
          state.invoice = data;
          await refresh();
          switchView("invoices");
          return data;
        },
      });
    });
}
function renderAuditModule(store) {
  const events = [...(store.event_log ?? [])].reverse();
  const audits = [...(store.audit_events ?? [])].reverse();
  const policies = [...(store.policy_decisions ?? [])].reverse();
  const deniedPolicies = policies.filter(
    (decision) => decision.result !== "ALLOW",
  );
  const approvals = [...(store.approvals ?? [])].reverse();
  const memberships = [...(store.firm_memberships ?? [])].reverse();
  const authorities = [...(store.professional_authorities ?? [])].reverse();
  const authContext = store.auth_context ?? {};
  const approvalTrace = approvals.length
    ? approvals
        .map(
          (approval) =>
            `<article class="trace-card"><strong>${escapeHtml(approval.decision)}</strong><span>${escapeHtml(approval.subject_type)} ${escapeHtml(shortId(approval.subject_id))}</span><small>Actor ${escapeHtml(shortId(approval.approver_actor_id))} - Authority ${escapeHtml(shortId(approval.authority_id))} - ${escapeHtml(approval.authentication_strength)}</small></article>`,
        )
        .join("")
    : `<p class="empty">No approvals yet. Approve a proposal to create a governance trace.</p>`;
  const policyTrace = policies.length
    ? policies
        .slice(0, 12)
        .map(
          (decision) =>
            `<article class="trace-card ${decision.result === "ALLOW" ? "" : "danger"}"><strong>${escapeHtml(decision.result)}</strong><span>${escapeHtml(decision.action)} on ${escapeHtml(decision.resource_type)}</span><small>${escapeHtml((decision.reasons ?? []).join("; ") || decision.created_at)}</small></article>`,
        )
        .join("")
    : `<p class="empty">No policy decisions yet.</p>`;
  const membershipTrace = memberships.length
    ? memberships
        .slice(0, 12)
        .map(
          (membership) =>
            `<article class="trace-card"><strong>${escapeHtml(membership.role)}</strong><span>${escapeHtml(personName(store, membership.person_id))}</span><small>${escapeHtml(membership.status)} - Actor ${escapeHtml(shortId(membership.actor_id))}</small></article>`,
        )
        .join("")
    : `<p class="empty">No firm memberships yet.</p>`;
  const authorityTrace = authorities.length
    ? authorities
        .slice(0, 12)
        .map(
          (authority) =>
            `<article class="trace-card"><strong>${escapeHtml(authority.authority_type)}</strong><span>${escapeHtml(authority.authority_scope)}</span><small>${escapeHtml(authority.status)} - ${escapeHtml((authority.permitted_actions ?? []).join(", "))}</small></article>`,
        )
        .join("")
    : `<p class="empty">No professional authorities yet.</p>`;
  document.querySelector("#auditView").innerHTML =
    `<section class="grid two"><section class="panel"><div class="panel-heading row"><div><h2>Audit Tools</h2><p>Export or reset the local MVP development store.</p></div></div><button id="exportStore" type="button">Export Store JSON</button><button id="resetStore" type="button" class="secondary danger-soft">Reset Local Store</button><p class="form-note">Reset only clears local development JSON data.</p></section><section class="panel"><div class="panel-heading"><h2>Governance Summary</h2><p>Traceability across identity, authority, events, audit, policies, and approvals.</p></div>${renderRelatedContext(
      "Governance counts",
      [
        ["Events", events.length],
        ["Audit records", audits.length],
        ["Policy decisions", policies.length],
        ["Denied policies", deniedPolicies.length],
        ["Approvals", approvals.length],
        ["Memberships", memberships.length],
        [
          "Authorities",
          authorities.filter((authority) => authority.status === "ACTIVE")
            .length,
        ],
      ],
    )}${renderRelatedContext("Current actor context", [
      ["Mode", authContext.mode ?? "dev"],
      ["Actor", shortId(authContext.actor?.actor_id)],
      ["Authority valid", authContext.authority_valid ? "Yes" : "No"],
      ["Membership", authContext.membership?.role ?? "Not resolved"],
    ])}</section></section><section class="grid two"><section class="panel"><div class="panel-heading"><h2>Identity & Authority</h2><p>Firm memberships and professional authorities used by Stage 4 trust controls.</p></div><div class="trace-list">${membershipTrace}</div><hr class="soft-divider" /><div class="trace-list">${authorityTrace}</div></section><section class="panel"><div class="panel-heading"><h2>Approval & Policy Trace</h2><p>Explicit approval decisions, allowed policy decisions, and denied attempts.</p></div><div class="trace-list">${approvalTrace}</div><hr class="soft-divider" /><div class="trace-list">${policyTrace}</div></section></section><section class="grid two"><section class="panel"><div class="panel-heading"><h2>Event Timeline</h2><p>Canonical event sequence, newest first.</p></div>${renderTimeline(events.slice(0, 30))}</section><section class="panel"><div class="panel-heading"><h2>Audit Records</h2><p>Material audit records retained for diagnostics.</p></div><details open><summary>Show audit JSON</summary><pre class="output tall">${escapeHtml(JSON.stringify(audits.slice(0, 50), null, 2))}</pre></details></section></section>`;
  document
    .querySelector("#exportStore")
    ?.addEventListener("click", () =>
      downloadJson(
        `vfirm-store-${new Date().toISOString().slice(0, 10)}.json`,
        store,
      ),
    );
  document.querySelector("#resetStore")?.addEventListener("click", async () => {
    if (!confirm("Reset local vFirm store?")) return;
    await runUiCommand({
      label: "Reset local store",
      button: document.querySelector("#resetStore"),
      success: "Local store reset",
      action: async () => {
        await request("/mvp/reset", {
          method: "POST",
          body: JSON.stringify({}),
        });
        state = defaultState();
        await refresh();
        switchView("dashboard");
      },
    });
  });
}
function renderServicePackModule(store) {
  const contract = activeWorkspaceContract(store);
  const pack = formworkPack(store);
  const sku = formworkSku(store);
  const serviceRows = contract.serviceLines.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Service</th><th>Type</th><th>Status</th><th>Human approval</th><th>Regulated</th></tr></thead><tbody>${contract.serviceLines.map((line) => `<tr><td>${escapeHtml(serviceLineLabel(line))}<br/><small>${escapeHtml(line.service_code ?? "-")}</small></td><td>${escapeHtml(line.service_type ?? "-")}</td><td><span class="pill">${escapeHtml(line.status ?? "UNKNOWN")}</span></td><td>${escapeHtml(line.requires_human_approval ? "Required" : "Not marked")}</td><td>${escapeHtml(line.regulated_work ? "Yes" : "No")}</td></tr>`).join("")}</tbody></table></div>`
    : `<p class="empty">No service lines are bound to ${escapeHtml(contract.firm?.name ?? "this firm")} yet.</p>`;
  const moduleList = contract.modules.map((module) => module.module_name);
  const authority = contract.profile.authority_boundaries ?? [
    "Workers assist and prepare only.",
    "Human authority remains explicit.",
  ];
  const formworkDetail =
    contract.profile.firm_type === "FORMWORK_ENGINEERING"
      ? `<hr class="soft-divider" /><div class="panel-heading"><h2>Formwork Practice Pack Detail</h2><p>Technical Formwork context remains available for Formwork Engineering workspaces only.</p></div>${renderHumanDetail(
          pack?.name ?? "Formwork Engineering Preliminary Package",
          [
            ["Code", pack?.code ?? "VF-SP-001"],
            ["Status", pack?.status ?? "Missing"],
            ["Discipline", pack?.discipline ?? "temporary_works_engineering"],
            ["SKU", sku?.code ?? "formwork_preliminary_wall_slab"],
            ["SKU status", sku?.status ?? "Missing"],
            [
              "Default price",
              money(
                sku?.pricing_model?.default_price ?? 2500,
                sku?.pricing_model?.currency ?? "MYR",
              ),
            ],
          ],
          { service_pack: pack, service_sku: sku },
        )}`
      : "";
  document.querySelector("#servicePackView").innerHTML =
    `<section class="grid two"><section class="panel"><div class="panel-heading"><h2>Service Subscription / Delivery Pack</h2><p>${escapeHtml(contract.profile.workspace_description ?? "Selected firm service subscription.")}</p></div>${renderRelatedContext(
      "Active subscription",
      [
        ["Firm", contract.firm?.name ?? "No firm selected"],
        ["Package", contract.subscription?.package_name ?? "Not bound"],
        ["Code", contract.subscription?.package_code ?? "Not bound"],
        ["Status", contract.subscription?.package_status ?? "UNBOUND"],
        [
          "Pricing model",
          contract.subscription?.pricing_model ?? "Not configured",
        ],
        ["Services", workspaceServiceSummary(contract)],
      ],
    )}${formworkDetail}</section><section class="panel"><div class="panel-heading"><h2>Subscribed Modules and Boundaries</h2><p>Modules are enabled by the selected firm's workspace profile; workers do not gain professional authority from capability alone.</p></div><div class="checklist">${moduleList.map((item) => `<span>${escapeHtml(item)}</span>`).join("") || `<span>No modules bound.</span>`}</div><hr class="soft-divider" /><div class="panel-heading"><h2>Authority Boundaries</h2><p>Runtime controls shown to operators before service delivery.</p></div><div class="checklist warning">${authority.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></section></section><section class="panel"><div class="panel-heading"><h2>Subscribed Service Lines</h2><p>These are the services currently visible for ${escapeHtml(contract.firm?.name ?? "the active firm")}.</p></div>${serviceRows}</section>`;
}
function renderInvoiceModule(store) {
  const invoices = store.invoices ?? [];
  const latestFirm = latestRecord(store, "firms");
  const latestTenant = latestFirm
    ? store.tenants?.find((tenant) => tenant.id === latestFirm.tenant_id)
    : latestRecord(store, "tenants");
  const principalActor = latestFirm
    ? latestPrincipalActor(store, latestFirm.id)
    : null;
  const invoiceOptions = invoices
    .map(
      (invoice) =>
        `<option value="${escapeHtml(invoice.id)}">${escapeHtml(invoice.invoice_number)} - ${escapeHtml(invoice.status)} - ${escapeHtml(
          money(
            (invoice.line_items ?? []).reduce(
              (sum, item) => sum + Number(item.amount ?? 0),
              0,
            ),
            invoice.currency,
          ),
        )}</option>`,
    )
    .join("");
  const issuable = invoices.filter((invoice) => invoice.status === "DRAFT");
  const payable = invoices.filter((invoice) => invoice.status === "ISSUED");
  const rows = invoices.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Invoice</th><th>Status</th><th>Amount</th><th>Project</th><th>Payments</th><th>Detail</th></tr></thead><tbody>${invoices
        .map(
          (invoice, index) =>
            `<tr><td>${escapeHtml(invoice.invoice_number)}</td><td><span class="pill">${escapeHtml(invoice.status)}</span></td><td>${escapeHtml(
              money(
                (invoice.line_items ?? []).reduce(
                  (sum, item) => sum + Number(item.amount ?? 0),
                  0,
                ),
                invoice.currency,
              ),
            )}</td><td>${escapeHtml(shortId(invoice.project_id))}</td><td>${countBy(store.payment_statuses, (payment) => payment.invoice_id === invoice.id)}</td><td><button class="secondary small" data-invoice-detail="${index}">View</button></td></tr>`,
        )
        .join(
          "",
        )}</tbody></table></div><pre class="output detail-output" id="invoiceDetailBox">Select an invoice.</pre>`
    : `<p class="empty">No invoices yet. Create one from the Projects tab.</p>`;
  document.querySelector("#invoicesView").innerHTML =
    `<section class="grid two"><section class="panel compact-form"><div class="panel-heading"><h2>Commercial Actions</h2><p>Issue invoices after delivery, then record payment status.</p></div><form id="invoiceIssueForm"><label>Draft invoice<select name="invoice_id" required>${issuable.map((invoice) => `<option value="${escapeHtml(invoice.id)}">${escapeHtml(invoice.invoice_number)}</option>`).join("")}</select></label><button type="submit" ${issuable.length ? "" : "disabled"}>Issue Invoice</button>${disabledHint(Boolean(issuable.length), "Create a draft invoice first. It can issue only after deliverable issue.")}<p class="form-note">Endpoint: POST /invoices/issue</p></form><hr class="soft-divider" /><form id="paymentRecordForm"><label>Issued invoice<select name="invoice_id" required>${payable.map((invoice) => `<option value="${escapeHtml(invoice.id)}">${escapeHtml(invoice.invoice_number)}</option>`).join("")}</select></label><label>Amount<input name="amount" type="number" value="2500" min="0" /></label><button type="submit" ${payable.length ? "" : "disabled"}>Record Payment</button>${disabledHint(Boolean(payable.length), "Issue an invoice before recording payment.")}<p class="form-note">Endpoint: POST /payments/record</p></form></section><section class="panel"><div class="panel-heading"><h2>Commercial Summary</h2><p>Invoice and payment status for pilot transaction control.</p></div>${renderRelatedContext(
      "Billing controls",
      [
        ["Invoices", invoices.length],
        ["Draft", countBy(invoices, (invoice) => invoice.status === "DRAFT")],
        ["Issued", countBy(invoices, (invoice) => invoice.status === "ISSUED")],
        ["Paid", countBy(invoices, (invoice) => invoice.status === "PAID")],
        ["Payment records", (store.payment_statuses ?? []).length],
      ],
    )}</section></section><section class="panel"><div class="panel-heading"><h2>Invoices</h2><p>Invoice draft, issue, and payment records.</p></div>${rows}</section>`;
  document
    .querySelector("#invoiceIssueForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const invoice_id = new FormData(event.currentTarget).get("invoice_id");
      await runUiCommand({
        label: "Issue invoice",
        form: event.currentTarget,
        success: "Invoice issued",
        action: async () => {
          const data = await request("/invoices/issue", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              invoice_id,
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm.id),
            }),
          });
          await refresh();
          switchView("invoices");
          return data;
        },
      });
    });
  document
    .querySelector("#paymentRecordForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Record payment",
        form: event.currentTarget,
        success: "Payment recorded",
        action: async () => {
          const data = await request("/payments/record", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              invoice_id: fd.get("invoice_id"),
              amount: Number(fd.get("amount") || 0),
              currency: "MYR",
              payment_status: "PAID",
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm.id),
            }),
          });
          await refresh();
          switchView("invoices");
          return data;
        },
      });
    });
  document.querySelectorAll("button[data-invoice-detail]").forEach((button) =>
    button.addEventListener("click", () => {
      const invoice = invoices[Number(button.dataset.invoiceDetail)];
      const payments = (store.payment_statuses ?? []).filter(
        (payment) => payment.invoice_id === invoice.id,
      );
      document.querySelector("#invoiceDetailBox").innerHTML = renderHumanDetail(
        invoice.invoice_number,
        [
          ["Status", invoice.status],
          [
            "Amount",
            money(
              (invoice.line_items ?? []).reduce(
                (sum, item) => sum + Number(item.amount ?? 0),
                0,
              ),
              invoice.currency,
            ),
          ],
          ["Project", shortId(invoice.project_id)],
          ["Due", invoice.due_at],
          ["Payments", payments.length],
        ],
        { invoice, payments },
      );
    }),
  );
}
const awiaAfccStaff = [
  {
    staff_code: "CFO-001",
    name: "Amina CFO",
    role: "Chief Finance Officer",
    grade: "Executive",
    package_id: "cfo",
    package_status: "REFERENCE_PINNED",
    lifecycle_status: "ACTIVE",
    monthly_salary: "MYR 3,800",
    workload: 4,
    approvals_waiting: 1,
    denied_actions: 0,
    authority: "Finance governance recommendation and supervision only",
    tools: [
      "finance.analysis.prepare",
      "finance.governance.review",
      "evidence.bundle.review",
    ],
  },
  {
    staff_code: "FA-001",
    name: "Farid Finance Analyst",
    role: "Finance Analyst",
    grade: "Specialist",
    package_id: "fao",
    package_status: "REFERENCE_PINNED",
    lifecycle_status: "DRAFT",
    monthly_salary: "MYR 2,400",
    workload: 0,
    approvals_waiting: 0,
    denied_actions: 0,
    authority: "Evidence and analysis preparation only",
    tools: [
      "accounts.ap.prepare",
      "accounts.receivable.prepare",
      "evidence.bundle.prepare",
    ],
  },
  {
    staff_code: "FAO-AP-001",
    name: "Nadia AP Operator",
    role: "FAO AP Operator",
    grade: "Worker",
    package_id: "fao",
    package_status: "REFERENCE_PINNED",
    lifecycle_status: "DRAFT",
    monthly_salary: "MYR 1,800",
    workload: 0,
    approvals_waiting: 0,
    denied_actions: 1,
    authority: "AP preparation and review support; no payment release",
    tools: ["accounts.ap.prepare", "evidence.bundle.prepare"],
  },
  {
    staff_code: "FAO-REV-001",
    name: "Irfan Revenue Operator",
    role: "FAO Revenue Operator",
    grade: "Worker",
    package_id: "fao",
    package_status: "REFERENCE_PINNED",
    lifecycle_status: "DRAFT",
    monthly_salary: "MYR 1,800",
    workload: 0,
    approvals_waiting: 0,
    denied_actions: 0,
    authority: "Receivables support; no external send without approval",
    tools: ["accounts.receivable.prepare", "evidence.bundle.prepare"],
  },
  {
    staff_code: "SAO-001",
    name: "Sara Sales Operations",
    role: "Sales and Customer Operations Officer",
    grade: "Worker",
    package_id: "sao",
    package_status: "VALIDATED_CANDIDATE",
    lifecycle_status: "DRAFT",
    monthly_salary: "MYR 2,200",
    workload: 0,
    approvals_waiting: 0,
    denied_actions: 0,
    authority: "Sales and customer operations with commercial review gate",
    tools: [
      "sales.opportunity.prepare",
      "proposal.draft.prepare",
      "customer.communication.draft",
    ],
  },
  {
    staff_code: "OPO-001",
    name: "Omar Project Operations",
    role: "Operations and Project Delivery Officer",
    grade: "Manager",
    package_id: "opo",
    package_status: "CANDIDATE",
    lifecycle_status: "DRAFT",
    monthly_salary: "MYR 2,900",
    workload: 0,
    approvals_waiting: 0,
    denied_actions: 0,
    authority: "Project delivery coordination with validation gate",
    tools: [
      "project.delivery.coordinate",
      "workload.summary.prepare",
      "evidence.bundle.review",
    ],
  },
  {
    staff_code: "ARO-001",
    name: "Alya Admin Resources",
    role: "Administration and Resources Officer",
    grade: "Worker",
    package_id: "aro",
    package_status: "CANDIDATE",
    lifecycle_status: "DRAFT",
    monthly_salary: "MYR 1,900",
    workload: 0,
    approvals_waiting: 0,
    denied_actions: 0,
    authority: "Administration and resources support with validation gate",
    tools: [
      "administration.document.register",
      "administration.deadline.prepare",
      "evidence.bundle.prepare",
    ],
  },
  {
    staff_code: "DATA-001",
    name: "Dani Data Support",
    role: "Data Support",
    grade: "Assistant",
    package_id: "fao",
    package_status: "REFERENCE_PINNED",
    lifecycle_status: "DRAFT",
    monthly_salary: "MYR 1,200",
    workload: 0,
    approvals_waiting: 0,
    denied_actions: 0,
    authority: "Evidence and data preparation only",
    tools: ["evidence.bundle.prepare"],
  },
];
function awiaStaffForStore(store) {
  const members = store.awia_virtual_staff_members ?? [];
  if (!members.length) return awiaAfccStaff;
  const bindings = store.awia_staff_package_bindings ?? [];
  const assignments = store.awia_staff_role_assignments ?? [];
  const seats = store.awia_virtual_staff_seats ?? [];
  const readiness = store.awia_staff_task_readiness_records ?? [];
  return members.map((member) => {
    const staffCode = member.agent_code;
    const binding = bindings.find((item) => item.staff_code === staffCode);
    const assignment = assignments.find(
      (item) => item.staff_code === staffCode,
    );
    const seat = seats.find((item) => item.staff_code === staffCode);
    const decisions = readiness.filter((item) => item.staff_code === staffCode);
    return {
      staff_code: staffCode,
      name: member.display_name ?? staffCode,
      role: assignment?.role_name ?? member.role_code ?? "Virtual Staff",
      grade: assignment?.staff_grade ?? "Worker",
      package_id: binding?.package_id ?? member.source_package_id ?? "-",
      package_status: binding?.registry_status ?? "PERSISTED",
      lifecycle_status: member.lifecycle_status ?? "DRAFT",
      monthly_salary: seat?.monthly_salary
        ? `${seat.salary_currency ?? "MYR"} ${Number(seat.monthly_salary).toLocaleString("en-MY")}`
        : "Salary plan",
      workload: decisions.filter((item) => item.decision === "ALLOW").length,
      approvals_waiting: decisions.filter((item) => item.decision !== "ALLOW")
        .length,
      denied_actions: decisions.filter((item) => item.decision === "DENY")
        .length,
      authority:
        member.authority_envelope?.summary ??
        assignment?.default_boundary ??
        "Bounded virtual staff support only",
      tools: member.tool_allowlist ?? [],
    };
  });
}
function renderAfccStaffManagementExperience(store) {
  const staff = awiaStaffForStore(store);
  const active = staff.filter((member) => member.lifecycle_status === "ACTIVE");
  const waiting = staff.reduce(
    (sum, member) => sum + member.approvals_waiting,
    0,
  );
  const denied = staff.reduce((sum, member) => sum + member.denied_actions, 0);
  const candidate = staff.filter((member) =>
    ["VALIDATED_CANDIDATE", "CANDIDATE"].includes(member.package_status),
  ).length;
  const tasks = store.tasks ?? [];
  const workdesk = store.awia_staff_workdesk_items ?? [];
  const outputDrafts = store.awia_staff_output_drafts ?? [];
  const outputReviews = store.awia_staff_output_reviews ?? [];
  const clientDeliveryDrafts = store.awia_client_delivery_drafts ?? [];
  const staffOptions = staff
    .map(
      (member) =>
        `<option value="${escapeHtml(member.staff_code)}">${escapeHtml(member.name)} - ${escapeHtml(member.lifecycle_status)}</option>`,
    )
    .join("");
  const activeStaffOptions = active
    .map(
      (member) =>
        `<option value="${escapeHtml(member.staff_code)}">${escapeHtml(member.name)} - ${escapeHtml(member.role)}</option>`,
    )
    .join("");
  const taskOptions = tasks
    .map(
      (task) =>
        `<option value="${escapeHtml(task.id)}">${escapeHtml(task.task_type)} - ${escapeHtml(task.state)} - ${escapeHtml(shortId(task.id))}</option>`,
    )
    .join("");
  const rows = staff
    .map(
      (member, index) =>
        `<tr><td><strong>${escapeHtml(member.name)}</strong><br><small>${escapeHtml(member.staff_code)} - ${escapeHtml(member.role)}</small></td><td><span class="pill">${escapeHtml(member.lifecycle_status)}</span></td><td>${escapeHtml(member.grade)}</td><td>${escapeHtml(member.package_id)}<br><small>${escapeHtml(member.package_status)}</small></td><td>${escapeHtml(member.monthly_salary)}</td><td>${escapeHtml(member.workload)} ready / ${escapeHtml(member.approvals_waiting)} blocked</td><td><button class="secondary small" data-afcc-staff-detail="${index}">Profile</button></td></tr>`,
    )
    .join("");
  const workdeskRows = workdesk.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Staff</th><th>Task</th><th>Status</th><th>Tool</th><th>Evidence</th></tr></thead><tbody>${workdesk.map((item) => `<tr><td>${escapeHtml(item.staff_code)}</td><td>${escapeHtml(shortId(item.task_id))}<br><small>${escapeHtml(item.assignment_summary)}</small></td><td><span class="pill">${escapeHtml(item.workdesk_status)}</span></td><td>${escapeHtml(item.tool)}</td><td>${escapeHtml((item.evidence_refs ?? []).join(", ") || "-")}</td></tr>`).join("")}</tbody></table></div>`
    : `<p class="empty">No AWIA staff workdesk items yet.</p>`;
  return `<section class="panel afcc-staff-experience"><div class="panel-heading"><h2>AFCC Staff Management</h2><p>Hire, assign, supervise, approve, pause, suspend, retire, replace, and inspect named virtual staff through governed staff records.</p></div><div class="boundary-note"><strong>AWIA controlled operation</strong><span>Monthly salary, package binding, chat, and model capability do not grant authority. Runtime decisions remain deterministic and human approval remains explicit.</span></div><div class="afcc-metric-grid"><article class="metric-card"><span>Virtual staff</span><strong>${staff.length}</strong><small>Draft and active staff seats</small></article><article class="metric-card"><span>Active now</span><strong>${active.length}</strong><small>Only active staff may pass runtime gates</small></article><article class="metric-card warning"><span>Human queue</span><strong>${waiting}</strong><small>Approval required before controlled outputs</small></article><article class="metric-card warning"><span>Workdesk</span><strong>${workdesk.length}</strong><small>Assigned staff tasks</small></article><article class="metric-card"><span>Drafts</span><strong>${outputDrafts.length}</strong><small>${clientDeliveryDrafts.length} client draft ready</small></article></div><div class="afcc-journey-grid"><span>Hire staff</span><span>Assign work</span><span>Supervise execution</span><span>Approve with evidence</span><span>Manage lifecycle</span></div><div class="grid two"><section class="detail-card compact-form"><h3>Operate Staff</h3><div class="staff-command-row"><button class="secondary" id="awiaProvisionPilotStaff">Provision Pilot Staff</button><button class="secondary" id="awiaReadinessCheck" ${active.length ? "" : "disabled"}>Run Readiness Check</button></div><form id="awiaLifecycleForm"><label>Staff<select name="staff_code" required>${staffOptions}</select></label><label>Lifecycle<select name="to_state" required><option>ACTIVE</option><option>PAUSED</option><option>SUSPENDED</option><option>RETIRED</option><option>DRAFT</option></select></label><button type="submit" ${staff.length ? "" : "disabled"}>Update Lifecycle</button></form></section><section class="detail-card compact-form"><h3>Assign Work</h3><form id="awiaAssignTaskForm"><label>Active staff<select name="staff_code" required>${activeStaffOptions}</select></label><label>Task<select name="task_id" required>${taskOptions}</select></label><label>Tool<input name="tool" value="finance.analysis.prepare" /></label><button type="submit" ${active.length && tasks.length ? "" : "disabled"}>Assign to Workdesk</button>${disabledHint(Boolean(active.length && tasks.length), "Provision and activate staff, then open a project task.")}</form><div class="staff-command-row"><button class="secondary" id="awiaProduceOutputDraft" ${workdesk.some((item) => item.workdesk_status === "ASSIGNED") ? "" : "disabled"}>Produce Draft</button><button class="secondary" id="awiaReviewOutputDraft" ${outputDrafts.some((item) => item.status === "DRAFT_REVIEW_REQUIRED") ? "" : "disabled"}>Human Review</button><button class="secondary" id="awiaPrepareClientDraft" ${outputReviews.some((item) => item.review_decision === "APPROVED_FOR_CLIENT_DRAFT") ? "" : "disabled"}>Prepare Client Draft</button></div></section></div><div class="record-table-wrap"><table class="record-table"><thead><tr><th>Staff</th><th>Lifecycle</th><th>Grade</th><th>Package</th><th>Salary plan</th><th>Readiness</th><th>Profile</th></tr></thead><tbody>${rows}</tbody></table></div><div class="grid two"><section class="detail-card"><h3>Staff Workdesk</h3>${workdeskRows}</section><section class="detail-card"><h3>Draft Review Loop</h3>${renderRelatedContext(
    "Client draft controls",
    [
      ["Staff outputs", outputDrafts.length],
      ["Human reviews", outputReviews.length],
      ["Client drafts", clientDeliveryDrafts.length],
      ["Final issue", "Still blocked"],
    ],
  )}</section></div><pre class="output detail-output" id="afccStaffDetailBox">Select a virtual staff profile.</pre></section>`;
}
function bindAfccStaffControls(
  store,
  latestTenant,
  latestFirm,
  principalActor,
) {
  if (!latestTenant?.id || !latestFirm?.id) return;
  const actor =
    principalActor ?? systemActorForBrowser(latestTenant.id, latestFirm.id);
  const staff = awiaStaffForStore(store);
  const activeStaff = staff.filter(
    (member) => member.lifecycle_status === "ACTIVE",
  );
  const workdesk = store.awia_staff_workdesk_items ?? [];
  const outputDrafts = store.awia_staff_output_drafts ?? [];
  const outputReviews = store.awia_staff_output_reviews ?? [];
  const latestClient = latestRecord(store, "clients");
  const latestProject = latestRecord(store, "projects");
  const latestTask = latestRecord(store, "tasks");
  const firstActiveStaff = () => activeStaff[0] ?? staff[0] ?? null;
  const run = (label, control, success, action) =>
    runUiCommand({
      label,
      button: control?.tagName === "FORM" ? null : control,
      form: control?.tagName === "FORM" ? control : null,
      success,
      action,
    });
  document
    .querySelector("#awiaProvisionPilotStaff")
    ?.addEventListener("click", async (event) => {
      await run(
        "Provision AWIA pilot staff",
        event.currentTarget,
        "AWIA pilot staff provisioned",
        async () => {
          const data = await request("/awia/virtual-staff/provision-pilot", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              actor,
            }),
          });
          await refresh();
          switchView("ai-workforce");
          return data;
        },
      );
    });
  document
    .querySelector("#awiaReadinessCheck")
    ?.addEventListener("click", async (event) => {
      const member = firstActiveStaff();
      await run(
        "Run AWIA staff readiness",
        event.currentTarget,
        "AWIA readiness decision recorded",
        async () => {
          const data = await request("/awia/virtual-staff/task-readiness", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              staff_code: member?.staff_code,
              task_id: latestTask?.id ?? "controlled-pilot-task",
              client_id: latestClient?.id ?? "controlled-pilot-client",
              project_id: latestProject?.id,
              actor,
            }),
          });
          await refresh();
          switchView("ai-workforce");
          return data;
        },
      );
    });
  document
    .querySelector("#awiaLifecycleForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await run(
        "Update AWIA staff lifecycle",
        event.currentTarget,
        "AWIA staff lifecycle updated",
        async () => {
          const data = await request("/awia/virtual-staff/lifecycle", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              staff_code: fd.get("staff_code"),
              to_state: fd.get("to_state"),
              actor,
            }),
          });
          await refresh();
          switchView("ai-workforce");
          return data;
        },
      );
    });
  document
    .querySelector("#awiaAssignTaskForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      const task =
        (store.tasks ?? []).find((item) => item.id === fd.get("task_id")) ??
        latestTask;
      await run(
        "Assign AWIA staff task",
        event.currentTarget,
        "AWIA staff workdesk item assigned",
        async () => {
          const data = await request("/awia/virtual-staff/assign-task", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              staff_code: fd.get("staff_code"),
              task_id: fd.get("task_id"),
              client_id: latestClient?.id ?? "controlled-pilot-client",
              project_id: task?.project_id ?? latestProject?.id,
              tool: fd.get("tool"),
              actor,
            }),
          });
          await refresh();
          switchView("ai-workforce");
          return data;
        },
      );
    });
  document
    .querySelector("#awiaProduceOutputDraft")
    ?.addEventListener("click", async (event) => {
      const item =
        workdesk.find((record) => record.workdesk_status === "ASSIGNED") ??
        workdesk[0];
      await run(
        "Produce AWIA staff output draft",
        event.currentTarget,
        "AWIA output draft prepared for review",
        async () => {
          const data = await request("/awia/virtual-staff/output-draft", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              workdesk_item_id: item?.id,
              actor,
            }),
          });
          await refresh();
          switchView("ai-workforce");
          return data;
        },
      );
    });
  document
    .querySelector("#awiaReviewOutputDraft")
    ?.addEventListener("click", async (event) => {
      const draft =
        outputDrafts.find((item) => item.status === "DRAFT_REVIEW_REQUIRED") ??
        outputDrafts[0];
      await run(
        "Review AWIA staff output draft",
        event.currentTarget,
        "AWIA output approved for client draft",
        async () => {
          const data = await request("/awia/virtual-staff/output-review", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              output_draft_id: draft?.id,
              review_decision: "APPROVED_FOR_CLIENT_DRAFT",
              actor,
            }),
          });
          await refresh();
          switchView("ai-workforce");
          return data;
        },
      );
    });
  document
    .querySelector("#awiaPrepareClientDraft")
    ?.addEventListener("click", async (event) => {
      const review =
        outputReviews.find(
          (item) => item.review_decision === "APPROVED_FOR_CLIENT_DRAFT",
        ) ?? outputReviews[0];
      await run(
        "Prepare AWIA client delivery draft",
        event.currentTarget,
        "AWIA client delivery draft prepared",
        async () => {
          const data = await request(
            "/awia/virtual-staff/client-delivery-draft",
            {
              method: "POST",
              body: JSON.stringify({
                tenant_id: latestTenant.id,
                firm_id: latestFirm.id,
                output_review_id: review?.id,
                client_id: latestClient?.id ?? "controlled-pilot-client",
                actor,
              }),
            },
          );
          await refresh();
          switchView("ai-workforce");
          return data;
        },
      );
    });
  document
    .querySelectorAll("button[data-afcc-staff-detail]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        const member = staff[Number(button.dataset.afccStaffDetail)];
        if (!member) return;
        document.querySelector("#afccStaffDetailBox").innerHTML =
          renderHumanDetail(
            member.name,
            [
              ["Staff code", member.staff_code],
              ["Role", member.role],
              ["Lifecycle", member.lifecycle_status],
              ["Package", member.package_id],
              ["Salary", member.monthly_salary],
              ["Authority", member.authority],
              ["Tools", (member.tools ?? []).join(", ")],
            ],
            member,
          );
      }),
    );
}
function renderAiWorkforceModule(store) {
  const contract = activeWorkspaceContract(store);
  const allowedTemplateCodes = workerTemplateCodesForContract(contract);
  const templates = (store.worker_templates ?? []).filter((template) =>
    allowedTemplateCodes.has(template.code),
  );
  const allTemplates = store.worker_templates ?? [];
  const workers = store.worker_instances ?? [];
  const tasks = store.tasks ?? [];
  const activeWorkers = workers.filter(
    (worker) => worker.runtime_status === "ACTIVE",
  );
  const latestFirm = contract.firm;
  const latestTenant = contract.tenant;
  const principalActor = contract.principal;
  const firstTemplate = templates[0];
  const defaultName = defaultWorkerNameForTemplate(
    firstTemplate?.code,
    contract,
  );
  const taskOptions = tasks
    .map(
      (task) =>
        `<option value="${escapeHtml(task.id)}">${escapeHtml(task.task_type)} - ${escapeHtml(task.state)} - ${escapeHtml(shortId(task.id))}</option>`,
    )
    .join("");
  const workerOptions = activeWorkers
    .map(
      (worker) =>
        `<option value="${escapeHtml(worker.id)}">${escapeHtml(worker.name)} - ${escapeHtml(shortId(worker.id))}</option>`,
    )
    .join("");
  const templateOptions = templates
    .map(
      (template) =>
        `<option value="${escapeHtml(template.code)}">${escapeHtml(template.name)} ${escapeHtml(template.version)}</option>`,
    )
    .join("");
  const rows = workers.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Worker</th><th>Status</th><th>Template</th><th>Tools</th><th>Budget</th><th>Detail</th></tr></thead><tbody>${workers
        .map((worker, index) => {
          const template = allTemplates.find(
            (item) => item.id === worker.worker_template_id,
          );
          return `<tr><td>${escapeHtml(worker.name)}</td><td><span class="pill">${escapeHtml(worker.runtime_status)}</span></td><td>${escapeHtml(template?.code ?? shortId(worker.worker_template_id))}</td><td>${escapeHtml((worker.tool_allowlist ?? []).join(", "))}</td><td>${escapeHtml(worker.budget_envelope?.max_cost ?? "-")} ${escapeHtml(worker.budget_envelope?.currency ?? "")}</td><td><button class="secondary small" data-worker-detail="${index}">View</button></td></tr>`;
        })
        .join(
          "",
        )}</tbody></table></div><pre class="output detail-output" id="workerDetailBox">Select a worker.</pre>`
    : `<p class="empty">No AI workers provisioned yet for ${escapeHtml(latestFirm?.name ?? "the active firm")}.</p>`;
  document.querySelector("#aiWorkforceView").innerHTML =
    `<section class="grid two"><section class="panel compact-form"><div class="panel-heading"><h2>AI Workforce Actions</h2><p>Provision only workers allowed by ${escapeHtml(contract.subscription?.package_code ?? "the selected workspace profile")}. Workers remain bounded, attributable, and reviewable.</p></div><form id="workerProvisionForm"><label>Template<select name="worker_template_code" required>${templateOptions}</select></label><label>Worker name<input name="name" value="${escapeHtml(defaultName)}" required /></label><button type="submit" ${latestFirm && templates.length ? "" : "disabled"}>Provision Worker</button>${disabledHint(Boolean(latestFirm && templates.length), "No allowed worker templates are bound to this firm workspace.")}<p class="form-note">Endpoint: POST /worker-instances</p></form><form id="workerActivateForm"><label>Worker<select name="worker_instance_id" required>${workers.map((worker) => `<option value="${escapeHtml(worker.id)}">${escapeHtml(worker.name)} - ${escapeHtml(worker.runtime_status)}</option>`).join("")}</select></label><button type="submit" ${workers.length ? "" : "disabled"}>Activate Worker</button><p class="form-note">Endpoint: POST /worker-instances/activate</p></form><hr class="soft-divider" /><form id="workerAssignForm"><label>Active worker<select name="worker_instance_id" required>${workerOptions}</select></label><label>Task<select name="task_id" required>${taskOptions}</select></label><button type="submit" ${activeWorkers.length && tasks.length ? "" : "disabled"}>Assign Task</button>${disabledHint(Boolean(activeWorkers.length && tasks.length), "Activate a worker and open a project task first.")}<p class="form-note">Endpoint: POST /runtime/tasks/assign-ai</p></form><form id="toolInvokeForm"><label>Allowed tool<input name="tool_name" value="${escapeHtml(contract.profile.firm_type === "ORGANIZATION_SUPPORT" ? "document.register.prepare" : "formwork.input.extract")}" /></label><button type="submit" ${activeWorkers.length && tasks.length ? "" : "disabled"}>Request Tool Invocation</button><p class="form-note">Endpoint: POST /runtime/tool-invocations</p></form><form id="workerOutputForm"><button type="submit" ${activeWorkers.length && tasks.length ? "" : "disabled"}>Produce Reviewable Output</button><p class="form-note">Endpoint: POST /runtime/tasks/output</p></form></section><section class="panel"><div class="panel-heading"><h2>AI Runtime Summary</h2><p>${escapeHtml(latestFirm?.name ?? "Active firm")} workers are filtered by the selected tenant and firm boundary.</p></div>${renderRelatedContext(
      "Runtime controls",
      [
        ["Allowed templates", templates.length],
        ["Workers", workers.length],
        ["Active workers", activeWorkers.length],
        ["Task outputs", (store.task_outputs ?? []).length],
        ["Tool invocations", (store.tool_invocations ?? []).length],
        [
          "Human review required",
          countBy(store.task_outputs, (output) => output.requires_human_review),
        ],
        ["Authority boundary", "No autonomous regulated approval"],
      ],
    )}</section></section><section class="panel"><div class="panel-heading"><h2>Worker Instances</h2><p>Provisioned AI actors and their envelopes for ${escapeHtml(latestFirm?.name ?? "the selected firm")}.</p></div>${rows}</section>`;
  document
    .querySelector("#aiWorkforceView")
    ?.insertAdjacentHTML(
      "afterbegin",
      renderAfccStaffManagementExperience(store),
    );
  bindAfccStaffControls(store, latestTenant, latestFirm, principalActor);
  document
    .querySelector("#workerProvisionForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Provision AI worker",
        form: event.currentTarget,
        success: "AI worker provisioned",
        action: async () => {
          const data = await request("/worker-instances", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              worker_template_code: fd.get("worker_template_code"),
              name: fd.get("name"),
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm.id),
            }),
          });
          await refresh();
          switchView("ai-workforce");
          return data;
        },
      });
    });
  document
    .querySelector("#workerActivateForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const worker_instance_id = new FormData(event.currentTarget).get(
        "worker_instance_id",
      );
      await runUiCommand({
        label: "Activate AI worker",
        form: event.currentTarget,
        success: "AI worker activated",
        action: async () => {
          const data = await request("/worker-instances/activate", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              worker_instance_id,
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm.id),
            }),
          });
          await refresh();
          switchView("ai-workforce");
          return data;
        },
      });
    });
  document
    .querySelector("#workerAssignForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Assign AI task",
        form: event.currentTarget,
        success: "Task assigned to AI worker",
        action: async () => {
          const data = await request("/runtime/tasks/assign-ai", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              worker_instance_id: fd.get("worker_instance_id"),
              task_id: fd.get("task_id"),
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm.id),
            }),
          });
          await refresh();
          switchView("ai-workforce");
          return data;
        },
      });
    });
  document
    .querySelector("#toolInvokeForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const worker = activeWorkers[0];
      const task =
        tasks.find(
          (item) => item.assigned_actor_or_worker_ref === worker?.id,
        ) ?? tasks[0];
      const tool_name = new FormData(event.currentTarget).get("tool_name");
      await runUiCommand({
        label: "Request AI tool",
        form: event.currentTarget,
        success: "Tool invocation requested",
        action: async () => {
          const data = await request("/runtime/tool-invocations", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              worker_instance_id: worker.id,
              task_id: task.id,
              tool_name,
              input_summary: "Workspace operator requested bounded tool.",
            }),
          });
          await refresh();
          switchView("ai-workforce");
          return data;
        },
      });
    });
  document
    .querySelector("#workerOutputForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const worker = activeWorkers[0];
      const task =
        tasks.find(
          (item) => item.assigned_actor_or_worker_ref === worker?.id,
        ) ?? tasks[0];
      await runUiCommand({
        label: "Produce AI output",
        form: event.currentTarget,
        success: "Reviewable AI output produced",
        action: async () => {
          const data = await request("/runtime/tasks/output", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              worker_instance_id: worker.id,
              task_id: task.id,
              output_ref: defaultOutputRef(contract),
              evidence_refs: [
                contract.serviceLines[0]?.service_code ??
                  "workspace_service_evidence",
              ],
              quality_flags: ["requires_human_review"],
              requires_human_review: true,
            }),
          });
          await refresh();
          switchView("ai-workforce");
          return data;
        },
      });
    });
  document.querySelectorAll("button[data-worker-detail]").forEach((button) =>
    button.addEventListener("click", () => {
      const worker = workers[Number(button.dataset.workerDetail)];
      const outputs = (store.task_outputs ?? []).filter(
        (output) => output.worker_instance_id === worker.id,
      );
      const tools = (store.tool_invocations ?? []).filter(
        (tool) => tool.worker_instance_id === worker.id,
      );
      document.querySelector("#workerDetailBox").innerHTML = renderHumanDetail(
        worker.name,
        [
          ["Status", worker.runtime_status],
          ["Tools", (worker.tool_allowlist ?? []).join(", ")],
          ["Outputs", outputs.length],
          ["Tool calls", tools.length],
          ["Requires human review", "Yes"],
        ],
        { worker, outputs, tools },
      );
    }),
  );
}
function renderOperatorActionCards(actions = []) {
  if (!actions.length)
    return `<div class="callout success"><strong>No urgent private directory actions.</strong><span>Keep monitoring review board, enquiry, renewal, and audit readiness.</span></div>`;
  const label = (type) =>
    ({
      REVIEW_BOARD_DECISION_DUE: "Review Board",
      PRIVATE_ENQUIRY_FOLLOW_UP: "Private Enquiry",
      QUALIFICATION_RENEWAL_RISK: "Renewal Risk",
    })[type] ?? type;
  return `<div class="operator-action-grid">${actions
    .slice(0, 6)
    .map(
      (action) =>
        `<article class="metric-card warning"><span>${escapeHtml(label(action.type))}</span><strong>${escapeHtml(action.severity ?? "MEDIUM")}</strong><small>${escapeHtml(action.summary ?? "Operator follow-up required.")}</small><code>${escapeHtml(action.listing_id ? `Listing ${shortId(action.listing_id)}` : action.enquiry_id ? `Enquiry ${shortId(action.enquiry_id)}` : action.renewal_review_id ? `Renewal ${shortId(action.renewal_review_id)}` : "Private directory")}</code></article>`,
    )
    .join("")}</div>`;
}
function renderOperatorBoundaryCards() {
  const boundaries = [
    "No public marketplace",
    "No live matching",
    "No ranking",
    "No capacity allocation",
    "No VF-24 publication",
    "No pricing intelligence",
    "No autonomous award",
    "No autonomous regulated approval",
  ];
  return `<div class="operator-boundary-grid">${boundaries.map((boundary) => `<span class="boundary-chip">${escapeHtml(boundary)}</span>`).join("")}</div>`;
}
function renderNetworkModule(store) {
  const listings = store.marketplace_listings ?? [];
  const qualifiedListings = listings.filter(
    (listing) =>
      listing.commercial_model?.directory_type ===
      "CONTROLLED_PRIVATE_QUALIFIED_DIRECTORY",
  );
  const reviewDecisions = store.directory_review_board_decisions ?? [];
  const privateEnquiries = store.directory_private_enquiries ?? [];
  const collaborationRequests = (store.collaboration_requests ?? []).filter(
    (request) => request.metadata?.source_directory_enquiry_id,
  );
  const renewalReviews = store.qualification_renewal_reviews ?? [];
  const qualificationGates = store.network_qualification_gates ?? [];
  const latestFirm = latestRecord(store, "firms");
  const latestTenant = latestFirm
    ? store.tenants?.find((tenant) => tenant.id === latestFirm.tenant_id)
    : latestRecord(store, "tenants");
  const firms = (store.firms ?? []).filter(
    (firm) => !latestTenant || firm.tenant_id === latestTenant.id,
  );
  const passGates = qualificationGates.filter(
    (gate) =>
      (!latestTenant || gate.tenant_id === latestTenant.id) &&
      gate.gate_status === "PASS",
  );
  const qualifiedSummary = store.qualified_directory_summary ?? {};
  const governanceSummary = store.private_directory_governance_summary ?? {};
  const intelligenceSummary =
    store.private_directory_intelligence_summary ?? {};
  const actorForFirm = (firm) =>
    latestPrincipalActor(store, firm?.id) ??
    systemActorForBrowser(firm?.tenant_id ?? latestTenant?.id, firm?.id);
  const authHeadersFor = (actor, firm) => ({
    "x-vfirm-actor-id": actor?.actor_id ?? actor?.id,
    "x-vfirm-tenant-id":
      actor?.tenant_id ?? firm?.tenant_id ?? latestTenant?.id,
    "x-vfirm-firm-id": actor?.firm_id ?? firm?.id,
    "x-vfirm-role": actor?.role ?? "principal",
  });
  const firmOptions = firms
    .map(
      (firm) =>
        `<option value="${escapeHtml(firm.id)}">${escapeHtml(firm.name)} - ${escapeHtml(shortId(firm.id))}</option>`,
    )
    .join("");
  const gateOptions = passGates
    .map((gate) => {
      const firm = firms.find((item) => item.id === gate.provider_firm_id);
      return `<option value="${escapeHtml(gate.id)}">${escapeHtml(firm?.name ?? "Provider firm")} / ${escapeHtml(gate.jurisdiction_ref ?? "jurisdiction")} / ${escapeHtml(shortId(gate.id))}</option>`;
    })
    .join("");
  const listingOptions = qualifiedListings
    .map(
      (listing) =>
        `<option value="${escapeHtml(listing.id)}">${escapeHtml(listing.title)} - ${escapeHtml(listing.status)} - ${escapeHtml(shortId(listing.id))}</option>`,
    )
    .join("");
  const enquiryOptions = privateEnquiries
    .filter((enquiry) => enquiry.status === "ENQUIRY_RECORDED")
    .map(
      (enquiry) =>
        `<option value="${escapeHtml(enquiry.id)}">${escapeHtml(shortId(enquiry.id))} - ${escapeHtml(enquiry.enquiry_summary ?? "Private enquiry")}</option>`,
    )
    .join("");
  const listingRows = qualifiedListings.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Listing</th><th>Provider</th><th>Jurisdiction</th><th>Status</th><th>Detail</th></tr></thead><tbody>${qualifiedListings
        .map((listing, index) => {
          const firm = firms.find((item) => item.id === listing.firm_id);
          const gate = qualificationGates.find(
            (item) =>
              item.id === listing.commercial_model?.qualification_gate_id,
          );
          return `<tr><td>${escapeHtml(listing.title)}</td><td>${escapeHtml(firm?.name ?? shortId(listing.firm_id))}</td><td>${escapeHtml(gate?.jurisdiction_ref ?? "-")}</td><td><span class="pill">${escapeHtml(listing.status)}</span></td><td><button class="secondary small" data-directory-listing-detail="${index}">View</button></td></tr>`;
        })
        .join(
          "",
        )}</tbody></table></div><pre class="output detail-output" id="directoryListingDetailBox">Select a private directory listing.</pre>`
    : `<p class="empty">No qualified private directory listings yet. Create a PASS qualification gate before publication.</p>`;
  const reviewRows = reviewDecisions.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Decision</th><th>Listing</th><th>Evidence</th><th>Detail</th></tr></thead><tbody>${reviewDecisions
        .slice(-10)
        .map(
          (decision, index) =>
            `<tr><td><span class="pill">${escapeHtml(decision.decision)}</span></td><td>${escapeHtml(shortId(decision.listing_id))}</td><td>${escapeHtml((decision.evidence_refs ?? []).join(", "))}</td><td><button class="secondary small" data-directory-review-detail="${index}">View</button></td></tr>`,
        )
        .join(
          "",
        )}</tbody></table></div><pre class="output detail-output" id="directoryReviewDetailBox">Select a review decision.</pre>`
    : `<p class="empty">No Directory Review Board decisions recorded yet.</p>`;
  const enquiryRows = privateEnquiries.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Enquiry</th><th>Requester</th><th>Provider</th><th>Status</th><th>Detail</th></tr></thead><tbody>${privateEnquiries
        .slice(-10)
        .map((enquiry, index) => {
          const requester = firms.find(
            (firm) => firm.id === enquiry.requesting_firm_id,
          );
          const provider = firms.find(
            (firm) => firm.id === enquiry.provider_firm_id,
          );
          return `<tr><td>${escapeHtml(shortId(enquiry.id))}</td><td>${escapeHtml(requester?.name ?? shortId(enquiry.requesting_firm_id))}</td><td>${escapeHtml(provider?.name ?? shortId(enquiry.provider_firm_id))}</td><td><span class="pill">${escapeHtml(enquiry.status)}</span></td><td><button class="secondary small" data-directory-enquiry-detail="${index}">View</button></td></tr>`;
        })
        .join(
          "",
        )}</tbody></table></div><pre class="output detail-output" id="directoryEnquiryDetailBox">Select a private enquiry.</pre>`
    : `<p class="empty">No private directory enquiries recorded yet.</p>`;
  const renewalRows = renewalReviews.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Review</th><th>Listing</th><th>Expiry</th><th>Evidence</th><th>Detail</th></tr></thead><tbody>${renewalReviews
        .slice(-10)
        .map(
          (review, index) =>
            `<tr><td><span class="pill">${escapeHtml(review.review_status)}</span></td><td>${escapeHtml(shortId(review.listing_id))}</td><td>${escapeHtml(review.expires_at ?? "-")}</td><td>${escapeHtml((review.evidence_refs ?? []).join(", "))}</td><td><button class="secondary small" data-directory-renewal-detail="${index}">View</button></td></tr>`,
        )
        .join(
          "",
        )}</tbody></table></div><pre class="output detail-output" id="directoryRenewalDetailBox">Select a renewal review.</pre>`
    : `<p class="empty">No qualification renewal or expiry reviews recorded yet.</p>`;
  const pendingActionCards = renderOperatorActionCards(
    intelligenceSummary.pending_actions ?? [],
  );
  const boundaryCards = renderOperatorBoundaryCards();
  document.querySelector("#networkView").innerHTML =
    `<section class="grid two"><section class="panel compact-form"><div class="panel-heading"><h2>Private Directory Operator UI</h2><p>ME-S5 exposes controlled directory publication, review board decisions, manual enquiries, collaboration requests, and renewal monitoring.</p></div><form id="qualifiedDirectoryPublishForm"><label>PASS qualification gate<select name="qualification_gate_id">${gateOptions || '<option value="">No PASS qualification gate available</option>'}</select></label><label>Listing title<input name="title" value="Qualified private Formwork directory service" required /></label><label>Description<input name="description" value="Controlled private directory service publication for trusted network discovery only." required /></label><button type="submit" ${latestTenant && passGates.length ? "" : "disabled"}>Publish Qualified Directory Listing</button>${disabledHint(Boolean(latestTenant && passGates.length), "Create a PASS qualification gate before directory publication.")}<p class="form-note">Endpoint: POST /marketplace/directory-publications</p></form><form id="directoryReviewDecisionForm"><label>Listing<select name="listing_id">${listingOptions || '<option value="">No qualified listing available</option>'}</select></label><label>Decision<select name="decision"><option value="REVIEW_CONTINUE">Review continue</option><option value="SUSPEND">Suspend</option><option value="REVOKE">Revoke</option></select></label><label>Decision summary<input name="decision_summary" value="Listing remains qualified for private directory publication only." required /></label><label>Evidence ref<input name="evidence_ref" value="me-s5-review-board-evidence" required /></label><button type="submit" ${qualifiedListings.length ? "" : "disabled"}>Record Review Board Decision</button><p class="form-note">Endpoint: POST /marketplace/directory-review-board/decisions</p></form></section><section class="panel compact-form"><div class="panel-heading"><h2>Manual Enquiry and Renewal Controls</h2><p>Requests stay private and operator-led. No live matching, ranking, allocation, or autonomous award is available here.</p></div><form id="privateDirectoryEnquiryForm"><label>Listing<select name="listing_id">${listingOptions || '<option value="">No qualified listing available</option>'}</select></label><label>Requesting firm<select name="requesting_firm_id">${firmOptions || '<option value="">No firm available</option>'}</select></label><label>Enquiry summary<input name="enquiry_summary" value="Manual enquiry about qualified Formwork support." required /></label><button type="submit" ${qualifiedListings.length && firms.length > 1 ? "" : "disabled"}>Record Private Enquiry</button>${disabledHint(Boolean(qualifiedListings.length && firms.length > 1), "A private enquiry needs a qualified listing and a separate requesting firm.")}<p class="form-note">Endpoint: POST /marketplace/private-directory/enquiries</p></form><form id="directoryEnquiryCollaborationForm"><label>Recorded enquiry<select name="enquiry_id">${enquiryOptions || '<option value="">No open enquiry available</option>'}</select></label><label>Request summary<input name="request_summary" value="Manual collaboration request after private directory enquiry." required /></label><button type="submit" ${enquiryOptions ? "" : "disabled"}>Request Collaboration</button><p class="form-note">Endpoint: POST /marketplace/private-directory/enquiries/request-collaboration</p></form><form id="qualificationRenewalReviewForm"><label>Listing<select name="listing_id">${listingOptions || '<option value="">No qualified listing available</option>'}</select></label><label>Review status<select name="review_status"><option value="VALID">Valid</option><option value="EXPIRING">Expiring</option><option value="RENEWAL_REQUIRED">Renewal required</option><option value="SUSPEND_PUBLICATION">Suspend publication</option></select></label><label>Expires at<input name="expires_at" type="date" value="2026-12-31" /></label><label>Next review due<input name="next_review_due_at" type="date" value="2026-11-30" /></label><label>Evidence ref<input name="evidence_ref" value="me-s5-renewal-evidence" required /></label><button type="submit" ${qualifiedListings.length ? "" : "disabled"}>Record Renewal Review</button><p class="form-note">Endpoint: POST /marketplace/qualification-renewal-reviews</p></form></section></section><section class="panel"><div class="panel-heading"><h2>Controlled Directory Summary</h2><p>Operator view for private qualified directory governance. Public marketplace behaviors remain out of scope.</p></div>${renderRelatedContext(
      "ME-S5 operator evidence",
      [
        ["Qualified listings", qualifiedListings.length],
        ["PASS qualification gates", passGates.length],
        ["Review board decisions", reviewDecisions.length],
        ["Private enquiries", privateEnquiries.length],
        ["Manual collaboration requests", collaborationRequests.length],
        ["Renewal reviews", renewalReviews.length],
        ["ME-S2 status", qualifiedSummary.status ?? "Not yet ready"],
        ["ME-S3 status", governanceSummary.status ?? "Not yet ready"],
        ["ME-S6 status", intelligenceSummary.status ?? "Not yet ready"],
        ["Pending actions", intelligenceSummary.counts?.pending_actions ?? 0],
        ["Renewal risks", intelligenceSummary.counts?.renewal_risks ?? 0],
        ["Audit readiness", intelligenceSummary.readiness?.audit_events ?? 0],
      ],
    )}${renderRelatedContext("Boundary lock", [
      ["Directory type", "Controlled private qualified directory"],
      ["Listing approval", "Human governance required"],
      ["Discovery", "Manual enquiry only"],
      [
        "Forbidden",
        "public marketplace / live matching / ranking / allocation / VF-24 publication / pricing intelligence / autonomous award",
      ],
    ])}<div class="operator-walkthrough-panel"><h3>Operator next actions</h3><p>Use these cards for rehearsal: review pending board items, follow up enquiries manually, and resolve renewal risk before private directory operation.</p>${pendingActionCards}</div><div class="operator-walkthrough-panel"><h3>Forbidden boundary reminders</h3>${boundaryCards}</div><details open><summary>ME-S6 private readiness summary</summary><pre class="output">${escapeHtml(JSON.stringify(intelligenceSummary.pending_actions ? { status: intelligenceSummary.status, readiness: intelligenceSummary.readiness, pending_actions: intelligenceSummary.pending_actions, boundaries: intelligenceSummary.boundaries } : { message: "No ME-S6 readiness summary yet." }, null, 2))}</pre></details></section><section class="grid two"><section class="panel"><div class="panel-heading"><h2>Qualified Directory Listings</h2><p>Human-approved, tenant-confidential service publications only.</p></div>${listingRows}</section><section class="panel"><div class="panel-heading"><h2>Directory Review Board Decisions</h2><p>Review, suspension, and revocation decisions are auditable and evidence-backed.</p></div>${reviewRows}</section></section><section class="grid two"><section class="panel"><div class="panel-heading"><h2>Private Directory Enquiries</h2><p>Manual enquiry records; no automated matching or price-first ranking.</p></div>${enquiryRows}</section><section class="panel"><div class="panel-heading"><h2>Qualification Renewal Monitoring</h2><p>Expiry and renewal reviews keep listings under controlled governance.</p></div>${renewalRows}</section></section>`;
  document
    .querySelector("#qualifiedDirectoryPublishForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Publish qualified directory listing",
        form: event.currentTarget,
        success: "Qualified directory listing published",
        action: async () => {
          const gate = passGates.find(
            (item) => item.id === fd.get("qualification_gate_id"),
          );
          const firm = firms.find((item) => item.id === gate?.provider_firm_id);
          const actor = actorForFirm(firm);
          const data = await request("/marketplace/directory-publications", {
            method: "POST",
            headers: authHeadersFor(actor, firm),
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: firm.id,
              qualification_gate_id: gate.id,
              title: fd.get("title"),
              description: fd.get("description"),
              actor,
            }),
          });
          await refresh();
          switchView("network");
          return data;
        },
      });
    });
  document
    .querySelector("#directoryReviewDecisionForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Record directory review board decision",
        form: event.currentTarget,
        success: "Review board decision recorded",
        action: async () => {
          const listing = qualifiedListings.find(
            (item) => item.id === fd.get("listing_id"),
          );
          const firm = firms.find((item) => item.id === listing?.firm_id);
          const actor = actorForFirm(firm);
          const data = await request(
            "/marketplace/directory-review-board/decisions",
            {
              method: "POST",
              headers: authHeadersFor(actor, firm),
              body: JSON.stringify({
                tenant_id: latestTenant.id,
                provider_firm_id: firm.id,
                listing_id: listing.id,
                decision: fd.get("decision"),
                decision_summary: fd.get("decision_summary"),
                evidence_refs: [fd.get("evidence_ref")],
                actor,
              }),
            },
          );
          await refresh();
          switchView("network");
          return data;
        },
      });
    });
  document
    .querySelector("#privateDirectoryEnquiryForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Record private directory enquiry",
        form: event.currentTarget,
        success: "Private directory enquiry recorded",
        action: async () => {
          const listing = qualifiedListings.find(
            (item) => item.id === fd.get("listing_id"),
          );
          const requester = firms.find(
            (item) => item.id === fd.get("requesting_firm_id"),
          );
          if (requester?.id === listing?.firm_id)
            throw new Error(
              "Choose a requesting firm separate from the provider firm.",
            );
          const actor = actorForFirm(requester);
          const data = await request(
            "/marketplace/private-directory/enquiries",
            {
              method: "POST",
              headers: authHeadersFor(actor, requester),
              body: JSON.stringify({
                tenant_id: latestTenant.id,
                requesting_firm_id: requester.id,
                provider_firm_id: listing.firm_id,
                listing_id: listing.id,
                enquiry_summary: fd.get("enquiry_summary"),
                actor,
              }),
            },
          );
          await refresh();
          switchView("network");
          return data;
        },
      });
    });
  document
    .querySelector("#directoryEnquiryCollaborationForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Request collaboration from private enquiry",
        form: event.currentTarget,
        success: "Manual collaboration request recorded",
        action: async () => {
          const enquiry = privateEnquiries.find(
            (item) => item.id === fd.get("enquiry_id"),
          );
          const firm = firms.find(
            (item) => item.id === enquiry?.requesting_firm_id,
          );
          const actor = actorForFirm(firm);
          const data = await request(
            "/marketplace/private-directory/enquiries/request-collaboration",
            {
              method: "POST",
              headers: authHeadersFor(actor, firm),
              body: JSON.stringify({
                tenant_id: latestTenant.id,
                requesting_firm_id: firm.id,
                enquiry_id: enquiry.id,
                request_summary: fd.get("request_summary"),
                actor,
              }),
            },
          );
          await refresh();
          switchView("network");
          return data;
        },
      });
    });
  document
    .querySelector("#qualificationRenewalReviewForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Record qualification renewal review",
        form: event.currentTarget,
        success: "Qualification renewal review recorded",
        action: async () => {
          const listing = qualifiedListings.find(
            (item) => item.id === fd.get("listing_id"),
          );
          const gate = qualificationGates.find(
            (item) =>
              item.id === listing?.commercial_model?.qualification_gate_id,
          );
          const firm = firms.find((item) => item.id === listing?.firm_id);
          const actor = actorForFirm(firm);
          const data = await request(
            "/marketplace/qualification-renewal-reviews",
            {
              method: "POST",
              headers: authHeadersFor(actor, firm),
              body: JSON.stringify({
                tenant_id: latestTenant.id,
                provider_firm_id: firm.id,
                qualification_gate_id: gate.id,
                listing_id: listing.id,
                review_status: fd.get("review_status"),
                expires_at: fd.get("expires_at") || null,
                next_review_due_at: fd.get("next_review_due_at") || null,
                evidence_refs: [fd.get("evidence_ref")],
                actor,
              }),
            },
          );
          await refresh();
          switchView("network");
          return data;
        },
      });
    });
  document
    .querySelectorAll("button[data-directory-listing-detail]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        const listing =
          qualifiedListings[Number(button.dataset.directoryListingDetail)];
        document.querySelector("#directoryListingDetailBox").innerHTML =
          renderHumanDetail(
            listing.title,
            [
              ["Status", listing.status],
              ["Scope", listing.listing_scope],
              ["Visibility", listing.visibility],
              [
                "Gate",
                shortId(listing.commercial_model?.qualification_gate_id),
              ],
              ["Provider", shortId(listing.firm_id)],
            ],
            { listing },
          );
      }),
    );
  document
    .querySelectorAll("button[data-directory-review-detail]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        const decision =
          reviewDecisions.slice(-10)[
            Number(button.dataset.directoryReviewDetail)
          ];
        document.querySelector("#directoryReviewDetailBox").innerHTML =
          renderHumanDetail(
            "Review board decision",
            [
              ["Decision", decision.decision],
              ["Listing", shortId(decision.listing_id)],
              ["Provider", shortId(decision.provider_firm_id)],
              ["Evidence", (decision.evidence_refs ?? []).join(", ")],
            ],
            { decision },
          );
      }),
    );
  document
    .querySelectorAll("button[data-directory-enquiry-detail]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        const enquiry =
          privateEnquiries.slice(-10)[
            Number(button.dataset.directoryEnquiryDetail)
          ];
        document.querySelector("#directoryEnquiryDetailBox").innerHTML =
          renderHumanDetail(
            "Private directory enquiry",
            [
              ["Status", enquiry.status],
              ["Requester", shortId(enquiry.requesting_firm_id)],
              ["Provider", shortId(enquiry.provider_firm_id)],
              ["Listing", shortId(enquiry.listing_id)],
            ],
            { enquiry },
          );
      }),
    );
  document
    .querySelectorAll("button[data-directory-renewal-detail]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        const review =
          renewalReviews.slice(-10)[
            Number(button.dataset.directoryRenewalDetail)
          ];
        document.querySelector("#directoryRenewalDetailBox").innerHTML =
          renderHumanDetail(
            "Qualification renewal review",
            [
              ["Status", review.review_status],
              ["Listing", shortId(review.listing_id)],
              ["Gate", shortId(review.qualification_gate_id)],
              ["Next review", review.next_review_due_at ?? "-"],
            ],
            { review },
          );
      }),
    );
}
function renderOpsModule(store) {
  const readiness = store.ops_readiness ?? {};
  const stagingPackage = store.staging_package ?? {};
  const dataPolicy = store.data_protection_policy ?? {};
  const exportManifest = store.data_export_manifest ?? {};
  const metrics = store.operator_metrics ?? {};
  const daily =
    store.daily_operations ?? buildClientDailyOperationsFallback(store);
  const handoffs = store.pilot_handoff_records ?? [];
  const incidents = store.pilot_incidents ?? [];
  const latestFirm = latestRecord(store, "firms");
  const latestTenant = latestFirm
    ? store.tenants?.find((tenant) => tenant.id === latestFirm.tenant_id)
    : latestRecord(store, "tenants");
  const principalActor = latestFirm
    ? latestPrincipalActor(store, latestFirm.id)
    : null;
  const checks = readiness.checks ?? [];
  const statusClass =
    readiness.status === "PRODUCTION_READY_CANDIDATE"
      ? "ok"
      : readiness.status === "NOT_READY"
        ? "danger"
        : "warn";
  const checklist = checks.length
    ? checks
        .map(
          (check) =>
            `<article class="trace-card ${check.status === "PASS" ? "" : "danger"}"><strong>${escapeHtml(check.key)}: ${escapeHtml(check.status)}</strong><span>${escapeHtml(check.detail)}</span></article>`,
        )
        .join("")
    : `<p class="empty">No readiness checks returned yet.</p>`;
  const incidentOptions = incidents
    .map(
      (item) =>
        `<option value="${escapeHtml(item.id)}">${escapeHtml(item.title)} - ${escapeHtml(item.status)}</option>`,
    )
    .join("");
  const incidentRows = incidents.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Incident</th><th>Severity</th><th>Status</th><th>Source</th><th>Updated</th></tr></thead><tbody>${incidents.map((item) => `<tr><td>${escapeHtml(item.title)}<br/><small>${escapeHtml(item.impact_summary ?? item.description ?? "")}</small></td><td>${escapeHtml(item.severity)}</td><td><span class="pill">${escapeHtml(item.status)}</span></td><td>${escapeHtml(item.detection_source)}</td><td>${escapeHtml(item.updated_at ?? item.created_at)}</td></tr>`).join("")}</tbody></table></div>`
    : `<p class="empty">No pilot incidents recorded yet.</p>`;
  document.querySelector("#opsView").innerHTML =
    `<section class="grid two"><section class="panel"><div class="panel-heading"><h2>Pilot Control Tower</h2><p>Stage 15 pilot observability, incident response, support health, and operator metrics.</p></div>${renderRelatedContext(
      "Operator metrics",
      [
        ["Status", metrics.status ?? "PILOT_STABLE"],
        [
          "Active incidents",
          metrics.counts?.active_incidents ??
            countBy(
              incidents,
              (item) => !["RESOLVED", "CLOSED"].includes(item.status),
            ),
        ],
        [
          "Critical incidents",
          metrics.counts?.critical_incidents ??
            countBy(
              incidents,
              (item) =>
                ["SEV1", "SEV2"].includes(item.severity) &&
                !["RESOLVED", "CLOSED"].includes(item.status),
            ),
        ],
        [
          "Open support cases",
          metrics.counts?.open_support_cases ??
            countBy(store.support_cases, (item) => item.status !== "CLOSED"),
        ],
        ["Events", metrics.counts?.events ?? (store.event_log ?? []).length],
        [
          "Open tasks",
          metrics.counts?.open_tasks ??
            countBy(
              store.tasks,
              (item) => !["COMPLETED", "DONE"].includes(item.state),
            ),
        ],
      ],
    )}<div class="checklist warning">${(metrics.warnings ?? []).map((item) => `<span>${escapeHtml(item)}</span>`).join("") || "<span>No active operator warnings.</span>"}</div></section><section class="panel compact-form"><div class="panel-heading"><h2>Incident Response</h2><p>Open and resolve tenant-scoped pilot incidents.</p></div><form id="incidentOpenForm"><label>Title<input name="title" value="Pilot workflow observation" required /></label><label>Severity<select name="severity"><option value="SEV3">SEV3</option><option value="SEV2">SEV2</option><option value="SEV1">SEV1</option></select></label><label>Impact<input name="impact_summary" value="Operator noticed a pilot workflow issue requiring review." /></label><button type="submit" ${latestTenant ? "" : "disabled"}>Open Incident</button>${disabledHint(Boolean(latestTenant), "Create a tenant before opening incidents.")}<p class="form-note">Endpoint: POST /ops/incidents</p></form><form id="incidentResolveForm"><label>Incident<select name="incident_id">${incidentOptions}</select></label><label>Mitigation<input name="mitigation_summary" value="Mitigation recorded by pilot operator." /></label><label>Root cause<input name="root_cause_summary" value="Root cause reviewed during pilot operations." /></label><button type="submit" ${incidents.length ? "" : "disabled"}>Resolve Incident</button><p class="form-note">Endpoint: POST /ops/incidents/update</p></form></section></section><section class="panel"><div class="panel-heading"><h2>Incident Queue</h2><p>Operational incidents for the controlled pilot.</p></div>${incidentRows}</section><section class="grid two"><section class="panel"><div class="panel-heading"><h2>Production Readiness</h2><p>Stage 9 release, environment, persistence, and operations guardrails.</p></div>${renderRelatedContext(
      "Readiness status",
      [
        ["Status", readiness.status ?? "Unknown"],
        ["Stage", readiness.stage ?? "Stage 9"],
        ["API port", readiness.environment?.api_port ?? "-"],
        ["Port family", readiness.environment?.port_family ?? "309#"],
        ["Store backend", readiness.persistence?.store_backend ?? "unknown"],
        [
          "Release command",
          readiness.release_gate?.command ??
            "npm run check:production-readiness",
        ],
      ],
    )}<p class="form-note ${statusClass}">Local MVP may show warnings until external auth, production database URL, explicit allowed origins, backup policy, and release channel are configured.</p></section><section class="panel"><div class="panel-heading"><h2>Release Gate</h2><p>What must be true before a real production launch.</p></div><div class="checklist evidence">${(readiness.release_gate?.required_before_real_production ?? []).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div><hr class="soft-divider" /><pre class="output">${escapeHtml(JSON.stringify(readiness.environment ?? {}, null, 2))}</pre></section></section><section class="panel"><div class="panel-heading"><h2>Readiness Checks</h2><p>PASS/WARN/FAIL signals from the running API.</p></div><div class="trace-list">${checklist}</div></section><section class="grid two"><section class="panel"><div class="panel-heading"><h2>Staging Deployment Package</h2><p>Provider-neutral package for staging release preparation.</p></div>${renderRelatedContext(
      "Staging package",
      [
        ["Code", stagingPackage.code ?? "-"],
        ["Release channel", stagingPackage.release_channel ?? "-"],
        ["Services", (stagingPackage.recommended_services ?? []).join(", ")],
        ["Web port", stagingPackage.local_ports?.web ?? 3090],
        ["API port", stagingPackage.local_ports?.api ?? "-"],
      ],
    )}<div class="checklist evidence">${(stagingPackage.preflight_commands ?? []).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></section><section class="panel"><div class="panel-heading"><h2>Data Protection</h2><p>Staging/pilot data classification, export, backup, and retention posture.</p></div>${renderRelatedContext(
      "Data policy",
      [
        ["Status", dataPolicy.status ?? "-"],
        ["Default", dataPolicy.default_classification ?? "CONFIDENTIAL"],
        ["Tenant isolation", dataPolicy.tenant_isolation ?? "required"],
        ["Backup", dataPolicy.backup_policy ?? "-"],
        ["Export format", dataPolicy.export_policy?.format ?? "json"],
        [
          "Secrets excluded",
          exportManifest.integrity?.secrets_excluded ? "Yes" : "Required",
        ],
      ],
    )}<details><summary>Export manifest</summary><pre class="output">${escapeHtml(JSON.stringify(exportManifest, null, 2))}</pre></details></section></section>`;
  const opsHost = document.querySelector("#opsView");
  const exceptionRows = (daily.exceptions ?? []).length
    ? `<div class="trace-list">${daily.exceptions.map((item) => `<article class="trace-card danger"><strong>${escapeHtml(item.key)}: ${escapeHtml(item.severity)}</strong><span>${escapeHtml(item.detail)}</span></article>`).join("")}</div>`
    : `<p class="empty">No high-priority daily exceptions.</p>`;
  const handoffRows = handoffs.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Handoff</th><th>Status</th><th>Accepted</th></tr></thead><tbody>${handoffs.map((item) => `<tr><td>${escapeHtml(item.rehearsal_ref)}</td><td><span class="pill">${escapeHtml(item.handoff_status)}</span></td><td>${escapeHtml(item.accepted_at)}</td></tr>`).join("")}</tbody></table></div>`
    : `<p class="empty">No pilot handoff acceptance recorded yet.</p>`;
  opsHost.innerHTML =
    `<section class="grid two"><section class="panel"><div class="panel-heading"><h2>Today</h2><p>SF-S6 daily priorities across front desk, admin, sales, technical delivery, projects, and cash.</p></div>${renderRelatedContext(
      "Daily operations",
      [
        ["Status", daily.status ?? "Waiting for firm data"],
        ["Open enquiries", daily.counts?.open_enquiries ?? 0],
        ["Open deadlines", daily.counts?.open_deadlines ?? 0],
        ["Pending approvals", daily.counts?.pending_approvals ?? 0],
        ["Open projects", daily.counts?.open_projects ?? 0],
        ["Blocked packages", daily.counts?.blocked_delivery_packages ?? 0],
        [
          "Outstanding",
          money(daily.cash?.outstanding ?? 0, daily.cash?.currency ?? "MYR"),
        ],
      ],
    )}</section><section class="panel"><div class="panel-heading"><h2>Exceptions</h2><p>Items that need principal attention before or during the pilot week.</p></div>${exceptionRows}</section></section>` +
    opsHost.innerHTML +
    `<section class="grid two"><section class="panel compact-form"><div class="panel-heading"><h2>Pilot Handoff</h2><p>Record human acceptance after representative working-week rehearsal.</p></div><form id="pilotHandoffForm"><label>Rehearsal ref<input name="rehearsal_ref" value="SF-S6-WORKING-WEEK-LOCAL" /></label><label>Decision summary<input name="decision_summary" value="SF-S6 daily operations and pilot handoff accepted for controlled local pilot use." /></label><button type="submit" ${latestTenant && latestFirm ? "" : "disabled"}>Accept Handoff</button>${disabledHint(Boolean(latestTenant && latestFirm), "Create a firm before accepting pilot handoff.")}<p class="form-note">Endpoint: POST /pilot/handoff</p></form></section><section class="panel"><div class="panel-heading"><h2>Handoff Register</h2><p>Attributable pilot acceptance records.</p></div>${handoffRows}</section></section>`;
  document
    .querySelector("#incidentOpenForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Open pilot incident",
        form: event.currentTarget,
        success: "Pilot incident opened",
        action: async () => {
          const data = await request("/ops/incidents", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm?.id,
              title: fd.get("title"),
              severity: fd.get("severity"),
              impact_summary: fd.get("impact_summary"),
              description: fd.get("impact_summary"),
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm?.id),
            }),
          });
          await refresh();
          switchView("ops");
          return data;
        },
      });
    });
  document
    .querySelector("#incidentResolveForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Resolve pilot incident",
        form: event.currentTarget,
        success: "Pilot incident resolved",
        action: async () => {
          const data = await request("/ops/incidents/update", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm?.id,
              incident_id: fd.get("incident_id"),
              status: "RESOLVED",
              mitigation_summary: fd.get("mitigation_summary"),
              root_cause_summary: fd.get("root_cause_summary"),
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm?.id),
            }),
          });
          await refresh();
          switchView("ops");
          return data;
        },
      });
    });
  document
    .querySelector("#pilotHandoffForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Accept pilot handoff",
        form: event.currentTarget,
        success: "Pilot handoff accepted",
        action: async () => {
          const data = await request("/pilot/handoff", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              rehearsal_ref: fd.get("rehearsal_ref"),
              decision_summary: fd.get("decision_summary"),
              evidence_refs: [
                "docs/10_post_freeze_technical_design/SF_S6_DAILY_OPERATIONS_AND_PILOT_HANDOFF_TECHNICAL_DESIGN_v1.0.md",
              ],
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm.id),
            }),
          });
          await refresh();
          switchView("ops");
          return data;
        },
      });
    });
}
function renderPilotModule(store) {
  const pilot = store.pilot_package ?? {};
  const loop = store.pilot_learning_loop ?? {};
  const feedback = store.pilot_feedback ?? [];
  const reviews = store.pilot_acceptance_reviews ?? [];
  const improvements = store.pilot_improvement_items ?? [];
  const scope = pilot.scope ?? {};
  const included = scope.included ?? [];
  const excluded = scope.excluded ?? [];
  const criteria = pilot.acceptance_criteria ?? [];
  const checklist = pilot.onboarding_checklist ?? [];
  const latestFirm = latestRecord(store, "firms");
  const latestTenant = latestFirm
    ? store.tenants?.find((tenant) => tenant.id === latestFirm.tenant_id)
    : latestRecord(store, "tenants");
  const principalActor = latestFirm
    ? latestPrincipalActor(store, latestFirm.id)
    : null;
  const feedbackOptions = feedback
    .map(
      (item) =>
        `<option value="${escapeHtml(item.id)}">${escapeHtml(item.subject)} - ${escapeHtml(item.sentiment)}</option>`,
    )
    .join("");
  const improvementOptions = improvements
    .map(
      (item) =>
        `<option value="${escapeHtml(item.id)}">${escapeHtml(item.title)} - ${escapeHtml(item.status)}</option>`,
    )
    .join("");
  const feedbackRows = feedback.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Feedback</th><th>Type</th><th>Sentiment</th><th>Rating</th></tr></thead><tbody>${feedback.map((item) => `<tr><td>${escapeHtml(item.subject)}<br/><small>${escapeHtml(item.feedback_text ?? "")}</small></td><td>${escapeHtml(item.feedback_type)}</td><td>${escapeHtml(item.sentiment)}</td><td>${escapeHtml(item.rating ?? "-")}</td></tr>`).join("")}</tbody></table></div>`
    : `<p class="empty">No pilot feedback captured yet.</p>`;
  const improvementRows = improvements.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Improvement</th><th>Priority</th><th>Status</th><th>Target</th></tr></thead><tbody>${improvements.map((item) => `<tr><td>${escapeHtml(item.title)}<br/><small>${escapeHtml(item.description ?? "")}</small></td><td>${escapeHtml(item.priority)}</td><td><span class="pill">${escapeHtml(item.status)}</span></td><td>${escapeHtml(item.target_stage ?? "-")}</td></tr>`).join("")}</tbody></table></div>`
    : `<p class="empty">No improvement items created yet.</p>`;
  document.querySelector("#pilotView").innerHTML =
    `<section class="grid two"><section class="panel"><div class="panel-heading"><h2>${escapeHtml(pilot.name ?? "Formwork Pilot Package")}</h2><p>Controlled private pilot package plus Stage 16 learning loop.</p></div>${renderRelatedContext(
      "Pilot package",
      [
        ["Code", pilot.code ?? "VF-PILOT-001"],
        ["Service pack", pilot.service_pack_code ?? "VF-SP-001"],
        ["Mode", pilot.pilot_mode ?? "controlled_private_pilot"],
        ["Readiness", pilot.readiness_status ?? "Unknown"],
        ["Clients", (store.clients ?? []).length],
        ["Projects", (store.projects ?? []).length],
      ],
    )}</section><section class="panel"><div class="panel-heading"><h2>Learning Loop</h2><p>Feedback, acceptance criteria, and improvement backlog.</p></div>${renderRelatedContext(
      "Pilot learning",
      [
        ["Status", loop.status ?? "FEEDBACK_COLLECTION_ACTIVE"],
        ["Feedback", loop.counts?.feedback ?? feedback.length],
        ["Avg rating", loop.rating_average ?? "-"],
        [
          "Acceptance reviews",
          loop.counts?.acceptance_reviews ?? reviews.length,
        ],
        [
          "Open improvements",
          loop.counts?.open_improvements ??
            countBy(
              improvements,
              (item) => !["DONE", "CLOSED"].includes(item.status),
            ),
        ],
        [
          "High priority",
          loop.counts?.high_priority_improvements ??
            countBy(improvements, (item) =>
              ["P0", "P1"].includes(item.priority),
            ),
        ],
      ],
    )}</section></section><section class="grid two"><section class="panel compact-form"><div class="panel-heading"><h2>Capture Pilot Feedback</h2><p>Turn pilot experience into structured product learning.</p></div><form id="pilotFeedbackForm"><label>Subject<input name="subject" value="Pilot workflow feedback" required /></label><label>Sentiment<select name="sentiment"><option value="POSITIVE">Positive</option><option value="NEUTRAL">Neutral</option><option value="NEGATIVE">Negative</option></select></label><label>Rating<input name="rating" type="number" min="1" max="5" value="4" /></label><label>Feedback<input name="feedback_text" value="The pilot workflow is usable, with one improvement needed." /></label><button type="submit" ${latestTenant ? "" : "disabled"}>Submit Feedback</button>${disabledHint(Boolean(latestTenant), "Create a tenant before capturing pilot feedback.")}<p class="form-note">Endpoint: POST /pilot/feedback</p></form><form id="pilotAcceptanceForm"><label>Decision<select name="decision"><option value="PASS">Pass</option><option value="CONDITIONAL_PASS">Conditional Pass</option><option value="FAIL">Fail</option><option value="PENDING">Pending</option></select></label><label>Notes<input name="notes" value="Acceptance reviewed against Formwork pilot criteria." /></label><button type="submit" ${latestTenant ? "" : "disabled"}>Record Acceptance Review</button><p class="form-note">Endpoint: POST /pilot/acceptance-reviews</p></form></section><section class="panel compact-form"><div class="panel-heading"><h2>Product Improvement Loop</h2><p>Create and close backlog items from pilot evidence.</p></div><form id="pilotImprovementForm"><label>Source feedback<select name="feedback_id"><option value="">None</option>${feedbackOptions}</select></label><label>Title<input name="title" value="Improve pilot workflow guidance" required /></label><label>Priority<select name="priority"><option value="P2">P2</option><option value="P1">P1</option><option value="P0">P0</option><option value="P3">P3</option></select></label><label>Description<input name="description" value="Clarify next action guidance for pilot operators." /></label><button type="submit" ${latestTenant ? "" : "disabled"}>Create Improvement</button><p class="form-note">Endpoint: POST /pilot/improvement-items</p></form><form id="pilotImprovementCloseForm"><label>Improvement<select name="improvement_item_id">${improvementOptions}</select></label><button type="submit" ${improvements.length ? "" : "disabled"}>Mark Done</button><p class="form-note">Endpoint: POST /pilot/improvement-items/update</p></form></section></section><section class="grid two"><section class="panel"><div class="panel-heading"><h2>Feedback Records</h2><p>Pilot voice captured as development input.</p></div>${feedbackRows}</section><section class="panel"><div class="panel-heading"><h2>Improvement Backlog</h2><p>Product work produced by the pilot learning loop.</p></div>${improvementRows}</section></section><section class="grid two"><section class="panel"><div class="panel-heading"><h2>Onboarding Checklist</h2><p>Operator sequence for the first Formwork pilot.</p></div><div class="checklist status">${checklist.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></section><section class="panel"><div class="panel-heading"><h2>Acceptance Criteria</h2><p>What the pilot must prove before expansion.</p></div><div class="checklist evidence">${criteria.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div><hr class="soft-divider" /><h3>Excluded</h3><div class="checklist">${excluded.map((item) => `<span class="missing">${escapeHtml(item)}</span>`).join("")}</div></section></section>`;
  document
    .querySelector("#pilotFeedbackForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Submit pilot feedback",
        form: event.currentTarget,
        success: "Pilot feedback submitted",
        action: async () => {
          const data = await request("/pilot/feedback", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm?.id,
              subject: fd.get("subject"),
              sentiment: fd.get("sentiment"),
              rating: Number(fd.get("rating")),
              feedback_text: fd.get("feedback_text"),
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm?.id),
            }),
          });
          await refresh();
          switchView("pilot");
          return data;
        },
      });
    });
  document
    .querySelector("#pilotAcceptanceForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Record acceptance review",
        form: event.currentTarget,
        success: "Acceptance review recorded",
        action: async () => {
          const data = await request("/pilot/acceptance-reviews", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm?.id,
              decision: fd.get("decision"),
              criteria: criteria.map((item) => ({
                criterion: item,
                result: fd.get("decision"),
              })),
              notes: fd.get("notes"),
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm?.id),
            }),
          });
          await refresh();
          switchView("pilot");
          return data;
        },
      });
    });
  document
    .querySelector("#pilotImprovementForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Create improvement",
        form: event.currentTarget,
        success: "Improvement item created",
        action: async () => {
          const data = await request("/pilot/improvement-items", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm?.id,
              feedback_id: fd.get("feedback_id") || null,
              title: fd.get("title"),
              priority: fd.get("priority"),
              description: fd.get("description"),
              target_stage: "Pilot improvement backlog",
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm?.id),
            }),
          });
          await refresh();
          switchView("pilot");
          return data;
        },
      });
    });
  document
    .querySelector("#pilotImprovementCloseForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Close improvement",
        form: event.currentTarget,
        success: "Improvement marked done",
        action: async () => {
          const data = await request("/pilot/improvement-items/update", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm?.id,
              improvement_item_id: fd.get("improvement_item_id"),
              status: "DONE",
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm?.id),
            }),
          });
          await refresh();
          switchView("pilot");
          return data;
        },
      });
    });
}
function renderUsersModule(store) {
  const users = store.pilot_users ?? [];
  const authProvider = store.auth_provider_config ?? {};
  const adminPolicy = store.tenant_admin_policy ?? {};
  const latestFirm = latestRecord(store, "firms");
  const latestTenant = latestFirm
    ? store.tenants?.find((tenant) => tenant.id === latestFirm.tenant_id)
    : latestRecord(store, "tenants");
  const principalActor = latestFirm
    ? latestPrincipalActor(store, latestFirm.id)
    : null;
  const inviteOptions = users
    .map(
      (user) =>
        `<option value="${escapeHtml(user.id)}">${escapeHtml(user.email)} - ${escapeHtml(user.invite_status)}</option>`,
    )
    .join("");
  const rows = users.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Provider</th><th>Subject</th></tr></thead><tbody>${users.map((user) => `<tr><td>${escapeHtml(user.display_name)}<br/><small>${escapeHtml(user.email)}</small></td><td>${escapeHtml(user.pilot_role)}</td><td><span class="pill">${escapeHtml(user.invite_status)}</span></td><td>${escapeHtml(user.auth_provider ?? "-")}</td><td>${escapeHtml(user.external_subject ?? "-")}</td></tr>`).join("")}</tbody></table></div>`
    : `<p class="empty">No pilot users invited yet.</p>`;
  document.querySelector("#usersView").innerHTML =
    `<section class="grid two"><section class="panel compact-form"><div class="panel-heading"><h2>Pilot User Management</h2><p>Invite and activate users for the controlled staging pilot.</p></div><form id="pilotInviteForm"><label>Email<input name="email" type="email" value="pilot.operator@example.com" required /></label><label>Display name<input name="display_name" value="Pilot Operator" required /></label><label>Role<select name="pilot_role"><option value="PILOT_OPERATOR">Pilot Operator</option><option value="PILOT_PRINCIPAL">Pilot Principal</option><option value="PILOT_OBSERVER">Pilot Observer</option></select></label><button type="submit" ${latestTenant ? "" : "disabled"}>Invite Pilot User</button>${disabledHint(Boolean(latestTenant), "Create a tenant before inviting pilot users.")}<p class="form-note">Endpoint: POST /pilot/users/invite</p></form><form id="pilotActivateForm"><label>Pilot user<select name="pilot_user_id" required>${inviteOptions}</select></label><label>External subject<input name="external_subject" value="staging-user-001" /></label><button type="submit" ${users.length ? "" : "disabled"}>Activate Pilot User</button><p class="form-note">Endpoint: POST /pilot/users/activate</p></form></section><section class="panel"><div class="panel-heading"><h2>Staging Auth Bridge</h2><p>Stage 11 resolves external identity shape without binding to a final provider yet.</p></div>${renderRelatedContext(
      "Pilot access",
      [
        ["Invited users", users.length],
        [
          "Active users",
          countBy(users, (user) => user.invite_status === "ACTIVE"),
        ],
        ["Provider mode", "staging-header"],
        ["Tenant", shortId(latestTenant?.id)],
        ["Firm", shortId(latestFirm?.id)],
      ],
    )}<p class="form-note">Use headers: x-vfirm-user-email, x-vfirm-user-subject, x-vfirm-auth-provider.</p></section></section><section class="grid two"><section class="panel"><div class="panel-heading"><h2>Auth Provider Adapter</h2><p>Provider-neutral seam for Clerk/Auth0/Supabase/Entra integration.</p></div>${renderRelatedContext(
      "Provider config",
      [
        ["Provider", authProvider.provider ?? "dev-header"],
        ["Mode", authProvider.mode ?? "development"],
        ["Adapter", authProvider.adapter_status ?? "DEV_HEADER_ONLY"],
        ["Issuer", authProvider.issuer_configured ? "Configured" : "Missing"],
        ["JWKS", authProvider.jwks_configured ? "Configured" : "Missing"],
        [
          "Audience",
          authProvider.audience_configured ? "Configured" : "Missing",
        ],
      ],
    )}</section><section class="panel"><div class="panel-heading"><h2>Tenant Admin Policy</h2><p>Role/action surface for pilot user administration.</p></div><pre class="output">${escapeHtml(JSON.stringify(adminPolicy.roles ?? {}, null, 2))}</pre></section></section><section class="panel"><div class="panel-heading"><h2>Pilot Users</h2><p>Controlled users registered for staging/pilot access.</p></div>${rows}</section>`;
  document
    .querySelector("#pilotInviteForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Invite pilot user",
        form: event.currentTarget,
        success: "Pilot user invited",
        action: async () => {
          const data = await request("/pilot/users/invite", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm?.id,
              email: fd.get("email"),
              display_name: fd.get("display_name"),
              pilot_role: fd.get("pilot_role"),
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm?.id),
            }),
          });
          await refresh();
          switchView("users");
          return data;
        },
      });
    });
  document
    .querySelector("#pilotActivateForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Activate pilot user",
        form: event.currentTarget,
        success: "Pilot user activated",
        action: async () => {
          const data = await request("/pilot/users/activate", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm?.id,
              pilot_user_id: fd.get("pilot_user_id"),
              external_subject: fd.get("external_subject"),
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm?.id),
            }),
          });
          await refresh();
          switchView("users");
          return data;
        },
      });
    });
}
function renderSupportModule(store) {
  const summary = store.support_summary ?? {};
  const cases = store.support_cases ?? [];
  const users = store.pilot_users ?? [];
  const latestFirm = latestRecord(store, "firms");
  const latestTenant = latestFirm
    ? store.tenants?.find((tenant) => tenant.id === latestFirm.tenant_id)
    : latestRecord(store, "tenants");
  const principalActor = latestFirm
    ? latestPrincipalActor(store, latestFirm.id)
    : null;
  const userOptions = users
    .map(
      (user) =>
        `<option value="${escapeHtml(user.id)}">${escapeHtml(user.email)} - ${escapeHtml(user.invite_status)}</option>`,
    )
    .join("");
  const caseOptions = cases
    .map(
      (item) =>
        `<option value="${escapeHtml(item.id)}">${escapeHtml(item.subject)} - ${escapeHtml(item.status)}</option>`,
    )
    .join("");
  const rows = cases.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Case</th><th>Type</th><th>Severity</th><th>Status</th><th>User</th></tr></thead><tbody>${cases.map((item) => `<tr><td>${escapeHtml(item.subject)}<br/><small>${escapeHtml(item.description ?? "")}</small></td><td>${escapeHtml(item.case_type)}</td><td>${escapeHtml(item.severity)}</td><td><span class="pill">${escapeHtml(item.status)}</span></td><td>${escapeHtml(shortId(item.related_pilot_user_id))}</td></tr>`).join("")}</tbody></table></div>`
    : `<p class="empty">No support cases yet.</p>`;
  document.querySelector("#supportView").innerHTML =
    `<section class="grid two"><section class="panel compact-form"><div class="panel-heading"><h2>Support Desk Controls</h2><p>Open/close pilot support cases and revoke pilot access when needed.</p></div><form id="supportCaseForm"><label>Related pilot user<select name="related_pilot_user_id"><option value="">None</option>${userOptions}</select></label><label>Subject<input name="subject" value="Pilot access support request" required /></label><label>Severity<select name="severity"><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></label><label>Description<input name="description" value="Operator needs help during pilot workflow." /></label><button type="submit" ${latestTenant ? "" : "disabled"}>Open Support Case</button><p class="form-note">Endpoint: POST /support/cases</p></form><form id="supportCloseForm"><label>Open case<select name="support_case_id">${caseOptions}</select></label><label>Resolution<input name="resolution_summary" value="Resolved during pilot support review." /></label><button type="submit" ${cases.length ? "" : "disabled"}>Close Support Case</button><p class="form-note">Endpoint: POST /support/cases/update</p></form><form id="pilotRevokeForm"><label>Pilot user<select name="pilot_user_id">${userOptions}</select></label><label>Reason<input name="revocation_reason" value="pilot_access_revoked_by_support" /></label><button type="submit" ${users.length ? "" : "disabled"}>Revoke Pilot User</button><p class="form-note">Endpoint: POST /pilot/users/revoke</p></form></section><section class="panel"><div class="panel-heading"><h2>Support Queue Summary</h2><p>Tenant-scoped support and access control status.</p></div>${renderRelatedContext(
      "Support controls",
      [
        ["Pilot users", summary.counts?.pilot_users ?? users.length],
        [
          "Active users",
          summary.counts?.active_pilot_users ??
            countBy(users, (user) => user.invite_status === "ACTIVE"),
        ],
        [
          "Revoked users",
          summary.counts?.revoked_pilot_users ??
            countBy(users, (user) => user.invite_status === "REVOKED"),
        ],
        ["Support cases", summary.counts?.support_cases ?? cases.length],
        [
          "Open cases",
          summary.counts?.open_cases ??
            countBy(cases, (item) => item.status !== "CLOSED"),
        ],
        [
          "Critical cases",
          summary.counts?.critical_cases ??
            countBy(cases, (item) => item.severity === "CRITICAL"),
        ],
      ],
    )}</section></section><section class="panel"><div class="panel-heading"><h2>Support Cases</h2><p>Support desk queue for pilot operations.</p></div>${rows}</section>`;
  document
    .querySelector("#supportCaseForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Open support case",
        form: event.currentTarget,
        success: "Support case opened",
        action: async () => {
          const data = await request("/support/cases", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm?.id,
              related_pilot_user_id: fd.get("related_pilot_user_id") || null,
              subject: fd.get("subject"),
              severity: fd.get("severity"),
              description: fd.get("description"),
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm?.id),
            }),
          });
          await refresh();
          switchView("support");
          return data;
        },
      });
    });
  document
    .querySelector("#supportCloseForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Close support case",
        form: event.currentTarget,
        success: "Support case closed",
        action: async () => {
          const data = await request("/support/cases/update", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm?.id,
              support_case_id: fd.get("support_case_id"),
              status: "CLOSED",
              resolution_summary: fd.get("resolution_summary"),
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm?.id),
            }),
          });
          await refresh();
          switchView("support");
          return data;
        },
      });
    });
  document
    .querySelector("#pilotRevokeForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Revoke pilot user",
        form: event.currentTarget,
        success: "Pilot user revoked",
        action: async () => {
          const data = await request("/pilot/users/revoke", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm?.id,
              pilot_user_id: fd.get("pilot_user_id"),
              revocation_reason: fd.get("revocation_reason"),
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm?.id),
            }),
          });
          await refresh();
          switchView("support");
          return data;
        },
      });
    });
}
function renderReviewBoardModule(store) {
  const summary = store.review_board_summary ?? {};
  const reports = store.pilot_report_packs ?? [];
  const boards = store.stakeholder_review_boards ?? [];
  const decisions = store.stakeholder_review_decisions ?? [];
  const latestFirm = latestRecord(store, "firms");
  const latestTenant = latestFirm
    ? store.tenants?.find((tenant) => tenant.id === latestFirm.tenant_id)
    : latestRecord(store, "tenants");
  const principalActor = latestFirm
    ? latestPrincipalActor(store, latestFirm.id)
    : null;
  const reportOptions = reports
    .map(
      (item) =>
        `<option value="${escapeHtml(item.id)}">${escapeHtml(item.report_scope)} - ${escapeHtml(item.report_status)}</option>`,
    )
    .join("");
  const boardOptions = boards
    .filter((item) => item.review_status === "OPEN")
    .map(
      (item) =>
        `<option value="${escapeHtml(item.id)}">${escapeHtml(item.board_name)} - ${escapeHtml(item.review_status)}</option>`,
    )
    .join("");
  const reportRows = reports.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Report</th><th>Status</th><th>Readiness</th><th>Created</th></tr></thead><tbody>${reports.map((item) => `<tr><td>${escapeHtml(item.report_scope)}<br/><small>${escapeHtml(shortId(item.id))}</small></td><td><span class="pill">${escapeHtml(item.report_status)}</span></td><td>${escapeHtml(item.summary?.readiness ?? "-")}</td><td>${escapeHtml(item.created_at)}</td></tr>`).join("")}</tbody></table></div>`
    : `<p class="empty">No pilot report packs generated yet.</p>`;
  const decisionRows = decisions.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Decision</th><th>Summary</th><th>Next stage</th><th>Date</th></tr></thead><tbody>${decisions.map((item) => `<tr><td><span class="pill">${escapeHtml(item.decision)}</span></td><td>${escapeHtml(item.decision_summary ?? "-")}</td><td>${escapeHtml(item.next_stage ?? "-")}</td><td>${escapeHtml(item.decided_at)}</td></tr>`).join("")}</tbody></table></div>`
    : `<p class="empty">No stakeholder decisions recorded yet.</p>`;
  document.querySelector("#reviewBoardView").innerHTML =
    `<section class="grid two"><section class="panel"><div class="panel-heading"><h2>Stakeholder Review Board</h2><p>Stage 17 pilot reporting, export pack, and board decision controls.</p></div>${renderRelatedContext(
      "Board summary",
      [
        ["Status", summary.status ?? "REPORT_REQUIRED"],
        ["Report packs", summary.counts?.report_packs ?? reports.length],
        [
          "Open boards",
          summary.counts?.open_boards ??
            countBy(boards, (item) => item.review_status === "OPEN"),
        ],
        ["Decisions", summary.counts?.decisions ?? decisions.length],
        [
          "Open improvements",
          summary.counts?.open_improvements ??
            countBy(
              store.pilot_improvement_items,
              (item) => !["DONE", "CLOSED"].includes(item.status),
            ),
        ],
        [
          "Active incidents",
          summary.counts?.active_incidents ??
            countBy(
              store.pilot_incidents,
              (item) => !["RESOLVED", "CLOSED"].includes(item.status),
            ),
        ],
      ],
    )}</section><section class="panel compact-form"><div class="panel-heading"><h2>Report Pack</h2><p>Generate tenant-scoped pilot report/export manifest.</p></div><form id="reportPackForm"><label>Scope<input name="report_scope" value="FORMWORK_PILOT" /></label><button type="submit" ${latestTenant ? "" : "disabled"}>Generate Report Pack</button>${disabledHint(Boolean(latestTenant), "Create a tenant before generating a pilot report pack.")}<p class="form-note">Endpoint: POST /pilot/report-packs</p></form><form id="reviewBoardForm"><label>Report pack<select name="report_pack_id"><option value="">Latest / none</option>${reportOptions}</select></label><label>Board name<input name="board_name" value="Pilot Stakeholder Review Board" /></label><button type="submit" ${latestTenant ? "" : "disabled"}>Open Review Board</button><p class="form-note">Endpoint: POST /stakeholder-review/boards</p></form></section></section><section class="grid two"><section class="panel compact-form"><div class="panel-heading"><h2>Board Decision</h2><p>Record explicit pilot continuation or expansion decision.</p></div><form id="reviewDecisionForm"><label>Open board<select name="board_id">${boardOptions}</select></label><label>Decision<select name="decision"><option value="APPROVE_EXPANSION">Approve Expansion</option><option value="CONDITIONAL_CONTINUE">Conditional Continue</option><option value="HOLD">Hold</option><option value="STOP">Stop</option></select></label><label>Summary<input name="decision_summary" value="Pilot reviewed and approved for next controlled stage." /></label><button type="submit" ${boards.some((item) => item.review_status === "OPEN") ? "" : "disabled"}>Record Decision</button><p class="form-note">Endpoint: POST /stakeholder-review/decisions</p></form></section><section class="panel"><div class="panel-heading"><h2>Latest Export Manifest</h2><p>What the report pack includes for stakeholder review.</p></div><pre class="output">${escapeHtml(JSON.stringify(summary.latest_report?.export_manifest ?? reports.at(-1)?.export_manifest ?? {}, null, 2))}</pre></section></section><section class="grid two"><section class="panel"><div class="panel-heading"><h2>Report Packs</h2><p>Generated pilot reporting packs.</p></div>${reportRows}</section><section class="panel"><div class="panel-heading"><h2>Board Decisions</h2><p>Explicit stakeholder review outcomes.</p></div>${decisionRows}</section></section>`;
  document
    .querySelector("#reportPackForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Generate report pack",
        form: event.currentTarget,
        success: "Pilot report pack generated",
        action: async () => {
          const data = await request("/pilot/report-packs", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm?.id,
              report_scope: fd.get("report_scope"),
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm?.id),
            }),
          });
          await refresh();
          switchView("review-board");
          return data;
        },
      });
    });
  document
    .querySelector("#reviewBoardForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Open review board",
        form: event.currentTarget,
        success: "Stakeholder review board opened",
        action: async () => {
          const data = await request("/stakeholder-review/boards", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm?.id,
              report_pack_id:
                fd.get("report_pack_id") || reports.at(-1)?.id || null,
              board_name: fd.get("board_name"),
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm?.id),
            }),
          });
          await refresh();
          switchView("review-board");
          return data;
        },
      });
    });
  document
    .querySelector("#reviewDecisionForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Record board decision",
        form: event.currentTarget,
        success: "Board decision recorded",
        action: async () => {
          const data = await request("/stakeholder-review/decisions", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm?.id,
              board_id: fd.get("board_id"),
              decision: fd.get("decision"),
              decision_summary: fd.get("decision_summary"),
              next_stage: "Stage 18",
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm?.id),
            }),
          });
          await refresh();
          switchView("review-board");
          return data;
        },
      });
    });
}
function renderExpansionModule(store) {
  const summary = store.expansion_summary ?? {};
  const cohorts = store.pilot_expansion_cohorts ?? [];
  const plans = store.tenant_onboarding_plans ?? [];
  const gates = store.release_candidate_gates ?? [];
  const decisions = store.stakeholder_review_decisions ?? [];
  const latestFirm = latestRecord(store, "firms");
  const latestTenant = latestFirm
    ? store.tenants?.find((tenant) => tenant.id === latestFirm.tenant_id)
    : latestRecord(store, "tenants");
  const principalActor = latestFirm
    ? latestPrincipalActor(store, latestFirm.id)
    : null;
  const expansionDecisionOptions = decisions
    .filter((item) => item.decision === "APPROVE_EXPANSION")
    .map(
      (item) =>
        `<option value="${escapeHtml(item.id)}">${escapeHtml(item.decision)} - ${escapeHtml(shortId(item.id))}</option>`,
    )
    .join("");
  const cohortOptions = cohorts
    .map(
      (item) =>
        `<option value="${escapeHtml(item.id)}">${escapeHtml(item.cohort_name)} - ${escapeHtml(item.expansion_status)}</option>`,
    )
    .join("");
  const planOptions = plans
    .map(
      (item) =>
        `<option value="${escapeHtml(item.id)}">${escapeHtml(shortId(item.id))} - ${escapeHtml(item.onboarding_status)}</option>`,
    )
    .join("");
  const cohortRows = cohorts.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Cohort</th><th>Status</th><th>Tenants</th><th>Users</th></tr></thead><tbody>${cohorts.map((item) => `<tr><td>${escapeHtml(item.cohort_name)}<br/><small>${escapeHtml(shortId(item.id))}</small></td><td><span class="pill">${escapeHtml(item.expansion_status)}</span></td><td>${escapeHtml(item.max_tenants)}</td><td>${escapeHtml(item.max_pilot_users)}</td></tr>`).join("")}</tbody></table></div>`
    : `<p class="empty">No expansion cohorts yet.</p>`;
  const gateRows = gates.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>RC</th><th>Status</th><th>Summary</th><th>Date</th></tr></thead><tbody>${gates.map((item) => `<tr><td>${escapeHtml(item.release_candidate)}</td><td><span class="pill">${escapeHtml(item.gate_status)}</span></td><td>${escapeHtml(item.decision_summary ?? "-")}</td><td>${escapeHtml(item.decided_at ?? item.created_at)}</td></tr>`).join("")}</tbody></table></div>`
    : `<p class="empty">No release candidate gates recorded yet.</p>`;
  document.querySelector("#expansionView").innerHTML =
    `<section class="grid two"><section class="panel"><div class="panel-heading"><h2>Controlled Pilot Expansion</h2><p>Stage 18 tenant onboarding and release-candidate governance.</p></div>${renderRelatedContext(
      "Expansion summary",
      [
        ["Status", summary.status ?? "STAKEHOLDER_APPROVAL_REQUIRED"],
        ["Cohorts", summary.counts?.expansion_cohorts ?? cohorts.length],
        [
          "Approved cohorts",
          summary.counts?.approved_cohorts ??
            countBy(cohorts, (item) => item.expansion_status === "APPROVED"),
        ],
        ["Onboarding plans", summary.counts?.onboarding_plans ?? plans.length],
        [
          "Completed plans",
          summary.counts?.completed_onboarding_plans ??
            countBy(plans, (item) => item.onboarding_status === "COMPLETE"),
        ],
        [
          "Approved RC gates",
          summary.counts?.approved_release_gates ??
            countBy(gates, (item) => item.gate_status === "APPROVED"),
        ],
      ],
    )}</section><section class="panel compact-form"><div class="panel-heading"><h2>Expansion Cohort</h2><p>Create and approve a limited pilot cohort.</p></div><form id="expansionCohortForm"><label>Stakeholder decision<select name="stakeholder_decision_id"><option value="">None</option>${expansionDecisionOptions}</select></label><label>Cohort name<input name="cohort_name" value="Controlled Expansion Cohort 01" required /></label><label>Max tenants<input name="max_tenants" type="number" min="1" value="1" /></label><label>Max users<input name="max_pilot_users" type="number" min="1" value="5" /></label><button type="submit" ${latestTenant ? "" : "disabled"}>Create Cohort</button>${disabledHint(Boolean(latestTenant), "Create a tenant before expansion.")}<p class="form-note">Endpoint: POST /pilot/expansion-cohorts</p></form><form id="expansionApproveForm"><label>Cohort<select name="expansion_cohort_id">${cohortOptions}</select></label><button type="submit" ${cohorts.length ? "" : "disabled"}>Approve Cohort</button><p class="form-note">Endpoint: POST /pilot/expansion-cohorts/update</p></form></section></section><section class="grid two"><section class="panel compact-form"><div class="panel-heading"><h2>Tenant Onboarding</h2><p>Create and complete onboarding plan for the cohort.</p></div><form id="onboardingPlanForm"><label>Cohort<select name="expansion_cohort_id"><option value="">None</option>${cohortOptions}</select></label><button type="submit" ${latestTenant ? "" : "disabled"}>Create Onboarding Plan</button><p class="form-note">Endpoint: POST /tenant-onboarding/plans</p></form><form id="onboardingCompleteForm"><label>Plan<select name="onboarding_plan_id">${planOptions}</select></label><button type="submit" ${plans.length ? "" : "disabled"}>Complete Onboarding</button><p class="form-note">Endpoint: POST /tenant-onboarding/plans/update</p></form></section><section class="panel compact-form"><div class="panel-heading"><h2>Release Candidate Gate</h2><p>Record explicit RC governance decision.</p></div><form id="rcGateForm"><label>Cohort<select name="expansion_cohort_id"><option value="">None</option>${cohortOptions}</select></label><label>Release candidate<input name="release_candidate" value="RC-STAGE-18-PILOT" /></label><label>Status<select name="gate_status"><option value="APPROVED">Approved</option><option value="HOLD">Hold</option><option value="REJECTED">Rejected</option><option value="PENDING">Pending</option></select></label><label>Summary<input name="decision_summary" value="Release candidate approved for controlled pilot expansion." /></label><button type="submit" ${latestTenant ? "" : "disabled"}>Record RC Gate</button><p class="form-note">Endpoint: POST /release-candidate/gates</p></form></section></section><section class="grid two"><section class="panel"><div class="panel-heading"><h2>Expansion Cohorts</h2><p>Controlled cohort limits and status.</p></div>${cohortRows}</section><section class="panel"><div class="panel-heading"><h2>Release Candidate Gates</h2><p>RC governance decisions.</p></div>${gateRows}</section></section>`;
  document
    .querySelector("#expansionCohortForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Create expansion cohort",
        form: event.currentTarget,
        success: "Expansion cohort created",
        action: async () => {
          const data = await request("/pilot/expansion-cohorts", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm?.id,
              stakeholder_decision_id:
                fd.get("stakeholder_decision_id") || null,
              cohort_name: fd.get("cohort_name"),
              max_tenants: Number(fd.get("max_tenants")),
              max_pilot_users: Number(fd.get("max_pilot_users")),
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm?.id),
            }),
          });
          await refresh();
          switchView("expansion");
          return data;
        },
      });
    });
  document
    .querySelector("#expansionApproveForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Approve expansion cohort",
        form: event.currentTarget,
        success: "Expansion cohort approved",
        action: async () => {
          const data = await request("/pilot/expansion-cohorts/update", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm?.id,
              expansion_cohort_id: fd.get("expansion_cohort_id"),
              expansion_status: "APPROVED",
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm?.id),
            }),
          });
          await refresh();
          switchView("expansion");
          return data;
        },
      });
    });
  document
    .querySelector("#onboardingPlanForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Create onboarding plan",
        form: event.currentTarget,
        success: "Onboarding plan created",
        action: async () => {
          const data = await request("/tenant-onboarding/plans", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm?.id,
              expansion_cohort_id: fd.get("expansion_cohort_id") || null,
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm?.id),
            }),
          });
          await refresh();
          switchView("expansion");
          return data;
        },
      });
    });
  document
    .querySelector("#onboardingCompleteForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Complete onboarding",
        form: event.currentTarget,
        success: "Onboarding completed",
        action: async () => {
          const data = await request("/tenant-onboarding/plans/update", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm?.id,
              onboarding_plan_id: fd.get("onboarding_plan_id"),
              onboarding_status: "COMPLETE",
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm?.id),
            }),
          });
          await refresh();
          switchView("expansion");
          return data;
        },
      });
    });
  document
    .querySelector("#rcGateForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Record RC gate",
        form: event.currentTarget,
        success: "Release candidate gate recorded",
        action: async () => {
          const data = await request("/release-candidate/gates", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm?.id,
              expansion_cohort_id: fd.get("expansion_cohort_id") || null,
              release_candidate: fd.get("release_candidate"),
              gate_status: fd.get("gate_status"),
              decision_summary: fd.get("decision_summary"),
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm?.id),
            }),
          });
          await refresh();
          switchView("expansion");
          return data;
        },
      });
    });
}
function renderUsageBillingModule(store) {
  const summary = store.usage_summary ?? {};
  const controls = store.tenant_pilot_controls ?? [];
  const usage = store.tenant_usage_events ?? [];
  const reviews = store.billing_readiness_reviews ?? [];
  const latestFirm = latestRecord(store, "firms");
  const latestTenant = latestFirm
    ? store.tenants?.find((tenant) => tenant.id === latestFirm.tenant_id)
    : latestRecord(store, "tenants");
  const principalActor = latestFirm
    ? latestPrincipalActor(store, latestFirm.id)
    : null;
  const usageRows = usage.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Usage</th><th>Qty</th><th>Unit</th><th>Recorded</th></tr></thead><tbody>${usage.map((item) => `<tr><td>${escapeHtml(item.usage_type)}<br/><small>${escapeHtml(item.source_ref ?? "")}</small></td><td>${escapeHtml(item.quantity)}</td><td>${escapeHtml(item.unit)}</td><td>${escapeHtml(item.recorded_at)}</td></tr>`).join("")}</tbody></table></div>`
    : `<p class="empty">No usage events recorded yet.</p>`;
  const reviewRows = reviews.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Status</th><th>Pricing model</th><th>Summary</th></tr></thead><tbody>${reviews.map((item) => `<tr><td><span class="pill">${escapeHtml(item.readiness_status)}</span></td><td>${escapeHtml(item.pricing_model)}</td><td>${escapeHtml(item.decision_summary ?? "-")}</td></tr>`).join("")}</tbody></table></div>`
    : `<p class="empty">No billing readiness reviews yet.</p>`;
  document.querySelector("#usageBillingView").innerHTML =
    `<section class="grid two"><section class="panel"><div class="panel-heading"><h2>Usage Limits & Billing Readiness</h2><p>Stage 19 multi-tenant pilot controls without live payment capture.</p></div>${renderRelatedContext(
      "Usage summary",
      [
        ["Status", summary.status ?? "PILOT_CONTROLS_REQUIRED"],
        ["Controls", summary.counts?.controls ?? controls.length],
        ["Usage events", summary.counts?.usage_events ?? usage.length],
        ["Billing reviews", summary.counts?.billing_reviews ?? reviews.length],
        [
          "Ready reviews",
          summary.counts?.ready_reviews ??
            countBy(reviews, (item) => item.readiness_status === "READY"),
        ],
        ["Billing mode", summary.billing_mode ?? "readiness_only"],
      ],
    )}<div class="checklist warning">${(summary.limit_warnings ?? []).map((item) => `<span>${escapeHtml(item)}</span>`).join("") || "<span>No limit warnings.</span>"}</div></section><section class="panel compact-form"><div class="panel-heading"><h2>Tenant Pilot Control</h2><p>Set controlled pilot limits for tenant usage.</p></div><form id="tenantControlForm"><label>Plan code<input name="plan_code" value="PILOT_FREE_CONTROLLED" /></label><label>Pilot users limit<input name="pilot_users" type="number" min="1" value="5" /></label><label>Projects limit<input name="projects" type="number" min="1" value="3" /></label><label>AI tool invocations limit<input name="ai_tool_invocations" type="number" min="1" value="50" /></label><button type="submit" ${latestTenant ? "" : "disabled"}>Create Controls</button>${disabledHint(Boolean(latestTenant), "Create a tenant before setting controls.")}<p class="form-note">Endpoint: POST /tenant-pilot/controls</p></form></section></section><section class="grid two"><section class="panel compact-form"><div class="panel-heading"><h2>Record Usage</h2><p>Capture pilot usage events for limit/billing readiness.</p></div><form id="usageEventForm"><label>Usage type<select name="usage_type"><option value="projects">Projects</option><option value="pilot_users">Pilot Users</option><option value="ai_tool_invocations">AI Tool Invocations</option><option value="storage_mb">Storage MB</option></select></label><label>Quantity<input name="quantity" type="number" min="1" value="1" /></label><label>Unit<input name="unit" value="event" /></label><button type="submit" ${latestTenant ? "" : "disabled"}>Record Usage</button><p class="form-note">Endpoint: POST /tenant-usage/events</p></form></section><section class="panel compact-form"><div class="panel-heading"><h2>Billing Readiness</h2><p>Review readiness without enabling real payments.</p></div><form id="billingReviewForm"><label>Status<select name="readiness_status"><option value="READY">Ready</option><option value="CONDITIONAL">Conditional</option><option value="NOT_READY">Not Ready</option></select></label><label>Pricing model<input name="pricing_model" value="PILOT_USAGE_REVIEW" /></label><label>Summary<input name="decision_summary" value="Usage controls are ready for billing design; no live payment capture enabled." /></label><button type="submit" ${latestTenant ? "" : "disabled"}>Record Billing Review</button><p class="form-note">Endpoint: POST /billing/readiness-reviews</p></form></section></section><section class="grid two"><section class="panel"><div class="panel-heading"><h2>Usage Events</h2><p>Tenant usage ledger for pilot limits.</p></div>${usageRows}</section><section class="panel"><div class="panel-heading"><h2>Billing Reviews</h2><p>Readiness decisions before commercial billing.</p></div>${reviewRows}</section></section>`;
  document
    .querySelector("#tenantControlForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Create tenant controls",
        form: event.currentTarget,
        success: "Tenant pilot controls created",
        action: async () => {
          const data = await request("/tenant-pilot/controls", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm?.id,
              plan_code: fd.get("plan_code"),
              limits: {
                pilot_users: Number(fd.get("pilot_users")),
                projects: Number(fd.get("projects")),
                ai_tool_invocations: Number(fd.get("ai_tool_invocations")),
                storage_mb: 500,
              },
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm?.id),
            }),
          });
          await refresh();
          switchView("usage-billing");
          return data;
        },
      });
    });
  document
    .querySelector("#usageEventForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Record usage",
        form: event.currentTarget,
        success: "Usage event recorded",
        action: async () => {
          const data = await request("/tenant-usage/events", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm?.id,
              usage_type: fd.get("usage_type"),
              quantity: Number(fd.get("quantity")),
              unit: fd.get("unit"),
              source_ref: "operator-ui",
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm?.id),
            }),
          });
          await refresh();
          switchView("usage-billing");
          return data;
        },
      });
    });
  document
    .querySelector("#billingReviewForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Record billing review",
        form: event.currentTarget,
        success: "Billing readiness reviewed",
        action: async () => {
          const data = await request("/billing/readiness-reviews", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm?.id,
              readiness_status: fd.get("readiness_status"),
              pricing_model: fd.get("pricing_model"),
              decision_summary: fd.get("decision_summary"),
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm?.id),
            }),
          });
          await refresh();
          switchView("usage-billing");
          return data;
        },
      });
    });
}
function renderCommercialLaunchModule(store) {
  const summary = store.commercial_launch_summary ?? {};
  const providers = store.payment_provider_configs ?? [];
  const packages = store.subscription_packages ?? [];
  const controls = store.commercial_launch_controls ?? [];
  const latestFirm = latestRecord(store, "firms");
  const latestTenant = latestFirm
    ? store.tenants?.find((tenant) => tenant.id === latestFirm.tenant_id)
    : latestRecord(store, "tenants");
  const principalActor = latestFirm
    ? latestPrincipalActor(store, latestFirm.id)
    : null;
  const providerOptions = providers
    .map(
      (item) =>
        `<option value="${escapeHtml(item.id)}">${escapeHtml(item.provider_name)} - ${escapeHtml(item.config_status)}</option>`,
    )
    .join("");
  const packageOptions = packages
    .map(
      (item) =>
        `<option value="${escapeHtml(item.id)}">${escapeHtml(item.package_code)} - ${escapeHtml(item.package_status)}</option>`,
    )
    .join("");
  const providerRows = providers.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Provider</th><th>Mode</th><th>Status</th><th>Capabilities</th></tr></thead><tbody>${providers.map((item) => `<tr><td>${escapeHtml(item.provider_name)}</td><td>${escapeHtml(item.provider_mode)}</td><td><span class="pill">${escapeHtml(item.config_status)}</span></td><td>${escapeHtml((item.capabilities ?? []).join(", "))}</td></tr>`).join("")}</tbody></table></div>`
    : `<p class="empty">No payment provider config prepared yet.</p>`;
  const packageRows = packages.length
    ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Package</th><th>Status</th><th>Base</th><th>Model</th></tr></thead><tbody>${packages.map((item) => `<tr><td>${escapeHtml(item.package_name)}<br/><small>${escapeHtml(item.package_code)}</small></td><td><span class="pill">${escapeHtml(item.package_status)}</span></td><td>${escapeHtml(item.currency)} ${escapeHtml(item.base_price)}</td><td>${escapeHtml(item.pricing_model)}</td></tr>`).join("")}</tbody></table></div>`
    : `<p class="empty">No subscription packages created yet.</p>`;
  document.querySelector("#commercialLaunchView").innerHTML =
    `<section class="grid two"><section class="panel"><div class="panel-heading"><h2>Commercial Launch Controls</h2><p>Stage 20 payment preparation and subscription packaging. No live capture.</p></div><div class="boundary-note"><strong>No live payment capture</strong><span>Release 1 allows provider metadata, subscription package definitions, and explicit test-mode launch controls only.</span></div>${renderRelatedContext(
      "Commercial summary",
      [
        ["Status", summary.status ?? "COMMERCIAL_PREP_REQUIRED"],
        [
          "Provider configs",
          summary.counts?.payment_provider_configs ?? providers.length,
        ],
        ["Packages", summary.counts?.subscription_packages ?? packages.length],
        [
          "Launch controls",
          summary.counts?.commercial_launch_controls ?? controls.length,
        ],
        [
          "Billing ready",
          summary.counts?.billing_ready_reviews ??
            countBy(
              store.billing_readiness_reviews,
              (item) => item.readiness_status === "READY",
            ),
        ],
        ["Boundary", summary.boundary ?? "no_live_payment_capture"],
      ],
    )}</section><section class="panel compact-form"><div class="panel-heading"><h2>Payment Provider Prep</h2><p>Prepare provider configuration metadata only.</p></div><form id="paymentProviderForm"><label>Provider<input name="provider_name" value="stripe" /></label><label>Mode<select name="provider_mode"><option value="test">Test</option><option value="live-prep">Live Prep</option></select></label><label>Status<select name="config_status"><option value="DRAFT">Draft</option><option value="READY_FOR_TEST">Ready for Test</option><option value="BLOCKED">Blocked</option></select></label><button type="submit" ${latestTenant ? "" : "disabled"}>Prepare Provider</button>${disabledHint(Boolean(latestTenant), "Create a tenant before commercial launch prep.")}<p class="form-note">Endpoint: POST /payments/provider-configs</p></form></section></section><section class="grid two"><section class="panel compact-form"><div class="panel-heading"><h2>Subscription Package</h2><p>Create subscription package definition.</p></div><form id="subscriptionPackageForm"><label>Code<input name="package_code" value="VF-PILOT-PRO" required /></label><label>Name<input name="package_name" value="vFirm Pilot Pro" required /></label><label>Base price<input name="base_price" type="number" min="0" value="0" /></label><label>Currency<input name="currency" value="MYR" /></label><button type="submit" ${latestTenant ? "" : "disabled"}>Create Package</button><p class="form-note">Endpoint: POST /subscriptions/packages</p></form></section><section class="panel compact-form"><div class="panel-heading"><h2>Launch Control</h2><p>Approve test-mode only unless live controls are later implemented.</p></div><form id="commercialLaunchControlForm"><label>Provider<select name="payment_provider_config_id"><option value="">None</option>${providerOptions}</select></label><label>Package<select name="subscription_package_id"><option value="">None</option>${packageOptions}</select></label><label>Status<select name="launch_status"><option value="APPROVED_TEST_MODE">Approved Test Mode</option><option value="BLOCKED">Blocked</option><option value="APPROVED_LIVE_PREP">Approved Live Prep</option></select></label><label>Summary<input name="decision_summary" value="Commercial launch approved for test-mode preparation only; no live capture." /></label><button type="submit" ${latestTenant ? "" : "disabled"}>Record Launch Control</button><p class="form-note">Endpoint: POST /commercial-launch/controls</p></form></section></section><section class="grid two"><section class="panel"><div class="panel-heading"><h2>Provider Configs</h2><p>Payment provider preparation records.</p></div>${providerRows}</section><section class="panel"><div class="panel-heading"><h2>Subscription Packages</h2><p>Commercial package definitions.</p></div>${packageRows}</section></section>`;
  document
    .querySelector("#paymentProviderForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Prepare provider",
        form: event.currentTarget,
        success: "Payment provider prepared",
        action: async () => {
          const data = await request("/payments/provider-configs", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm?.id,
              provider_name: fd.get("provider_name"),
              provider_mode: fd.get("provider_mode"),
              config_status: fd.get("config_status"),
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm?.id),
            }),
          });
          await refresh();
          switchView("commercial-launch");
          return data;
        },
      });
    });
  document
    .querySelector("#subscriptionPackageForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Create subscription package",
        form: event.currentTarget,
        success: "Subscription package created",
        action: async () => {
          const data = await request("/subscriptions/packages", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm?.id,
              package_code: fd.get("package_code"),
              package_name: fd.get("package_name"),
              base_price: Number(fd.get("base_price")),
              currency: fd.get("currency"),
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm?.id),
            }),
          });
          await refresh();
          switchView("commercial-launch");
          return data;
        },
      });
    });
  document
    .querySelector("#commercialLaunchControlForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      await runUiCommand({
        label: "Record launch control",
        form: event.currentTarget,
        success: "Commercial launch control recorded",
        action: async () => {
          const data = await request("/commercial-launch/controls", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm?.id,
              payment_provider_config_id:
                fd.get("payment_provider_config_id") || null,
              subscription_package_id:
                fd.get("subscription_package_id") || null,
              launch_status: fd.get("launch_status"),
              decision_summary: fd.get("decision_summary"),
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm?.id),
            }),
          });
          await refresh();
          switchView("commercial-launch");
          return data;
        },
      });
    });
}
function renderMyFirmModule(store) {
  const host = document.querySelector("#myFirmView");
  if (!host) return;
  const contract = activeWorkspaceContract(store);
  const latestFirm = contract.firm;
  const latestTenant = contract.tenant;
  const principalActor = contract.principal;
  const templates = store.worker_templates ?? [];
  const workers = (store.worker_instances ?? []).filter(
    (worker) => worker.firm_id === latestFirm?.id,
  );
  const modules = contract.modules.length
    ? contract.modules
    : Object.values(workspaceModuleDefinitions);
  const cards = modules
    .map((module) => {
      const template = module.worker_template_code
        ? templates.find((item) => item.code === module.worker_template_code)
        : null;
      const worker = template
        ? workers.find((item) => item.worker_template_id === template.id)
        : null;
      const status =
        worker?.runtime_status ?? (template ? "AVAILABLE" : "ENABLED");
      return `<article class="detail-card"><span class="pill">${escapeHtml(humanStatus(status))}</span><h3>${escapeHtml(module.module_name)}</h3><p>${escapeHtml(module.outcome)}</p><small>${worker ? escapeHtml(worker.name) : template ? "No worker provisioned" : "Governance/module view"}</small><div class="button-row">${!worker && template && latestFirm ? `<button type="button" data-provision-module="${escapeHtml(template.code)}">Add worker</button>` : ""}<button type="button" class="secondary" data-action-view="${escapeHtml(module.default_view)}">Open work area</button></div></article>`;
    })
    .join("");
  const activeTemplateCodes = new Set(
    modules.map((module) => module.worker_template_code).filter(Boolean),
  );
  const ready = workers.filter((worker) => {
    const template = templates.find(
      (item) => item.id === worker.worker_template_id,
    );
    return (
      worker.runtime_status === "ACTIVE" &&
      activeTemplateCodes.has(template?.code)
    );
  }).length;
  host.innerHTML = `<section class="panel"><div class="panel-heading"><h2>${escapeHtml(latestFirm?.name ?? "Your first Virtual Firm")}</h2><p>${escapeHtml(contract.profile.workspace_description ?? "Selected firm workspace profile.")}</p></div>${renderRelatedContext(
    "Workspace contract",
    [
      [
        "Virtual Principal",
        principalActor?.display_name ??
          contract.profile.principal_display_name ??
          "Create firm first",
      ],
      ["Firm type", contract.profile.firm_type ?? "UNCLASSIFIED"],
      ["Subscription", contract.subscription?.package_code ?? "Not bound"],
      ["Services", workspaceServiceSummary(contract)],
      ["Modules", modules.length],
      ["Active workers", ready],
      [
        "Authority",
        (
          contract.profile.authority_boundaries ?? [
            "Human authority remains explicit.",
          ]
        ).join(" | "),
      ],
    ],
  )}</section><section class="panel"><div class="panel-heading"><h2>Modular Virtual Workforce</h2><p>Modules and workers are driven by the selected firm's subscription/profile.</p></div><div class="action-grid">${cards}</div></section>`;
  host
    .querySelectorAll("button[data-action-view]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        switchView(button.dataset.actionView),
      ),
    );
  host.querySelectorAll("button[data-provision-module]").forEach((button) =>
    button.addEventListener("click", async () => {
      const code = button.dataset.provisionModule;
      const template = templates.find((item) => item.code === code);
      await runUiCommand({
        label: `Add ${template.name}`,
        button,
        success: `${template.name} provisioned`,
        action: async () => {
          const data = await request("/worker-instances", {
            method: "POST",
            body: JSON.stringify({
              tenant_id: latestTenant.id,
              firm_id: latestFirm.id,
              worker_template_code: code,
              name: template.name,
              actor:
                principalActor ??
                systemActorForBrowser(latestTenant.id, latestFirm.id),
            }),
          });
          await refresh();
          switchView("my-firm");
          return data;
        },
      });
    }),
  );
}
function renderSalesAccountsModule(store) {
  const contract = activeWorkspaceContract(store),
    tenant = contract.tenant,
    firm = contract.firm,
    actor = contract.principal,
    auth = actor ?? systemActorForBrowser(tenant?.id, firm?.id);
  const opportunities = store.sales_pipeline_records ?? [],
    proposals = store.proposals ?? [],
    expenses = store.expense_records ?? [],
    invoices = store.invoices ?? [],
    followUps = store.receivable_follow_ups ?? [],
    bindings = store.commercial_skill_bindings ?? [],
    quotationCases = store.quotation_cases ?? [],
    boqAids = store.boq_extraction_aids ?? [],
    quotationDraftPacks = store.quotation_draft_packs ?? [],
    quotationIssues = store.quotation_issue_records ?? [],
    quotationReceivablePreparations =
      store.quotation_receivable_preparations ?? [],
    relationships = store.firm_client_relationships ?? [],
    documents = store.document_register_entries ?? [];
  const openOpp = opportunities.filter(
      (x) => !["WON", "LOST"].includes(x.stage),
    ),
    approvedProposals = proposals.filter(
      (x) => x.proposal_status === "APPROVED",
    ),
    draftExpenses = expenses.filter(
      (x) => x.status === "DRAFT_REVIEW_REQUIRED",
    ),
    issuedInvoices = invoices.filter((x) =>
      ["ISSUED", "OVERDUE"].includes(x.status),
    );
  const invoiceTotal = invoices
      .filter((x) => ["ISSUED", "PAID", "OVERDUE"].includes(x.status))
      .reduce(
        (s, x) =>
          s +
          (x.line_items ?? []).reduce((a, l) => a + Number(l.amount ?? 0), 0),
        0,
      ),
    received = (store.payment_statuses ?? [])
      .filter((x) =>
        ["PAID", "RECEIVED", "CAPTURED"].includes(x.payment_status),
      )
      .reduce((s, x) => s + Number(x.amount ?? 0), 0),
    approvedExpense = expenses
      .filter((x) => x.status === "APPROVED")
      .reduce((s, x) => s + Number(x.amount ?? 0), 0);
  const opts = (items, label) =>
    items
      .map(
        (x) =>
          `<option value="${escapeHtml(x.id)}">${escapeHtml(label(x))}</option>`,
      )
      .join("");
  const quotationCaseOptions = opts(
      quotationCases,
      (x) => `${x.case_number} - ${x.status}`,
    ),
    relationshipOptions = opts(
      relationships,
      (x) => `${relationName(store, x.id)} - ${shortId(x.id)}`,
    ),
    proposalOptions = opts(
      proposals,
      (x) => `${shortId(x.id)} - ${x.proposal_status}`,
    ),
    documentOptions = opts(
      documents,
      (x) => `${x.document_number} - ${x.title}`,
    ),
    boqAidOptions = opts(
      boqAids,
      (x) => `${shortId(x.id)} - ${x.extraction_status}`,
    ),
    reviewedBoqAidOptions = opts(
      boqAids.filter((x) => x.extraction_status === "HUMAN_REVIEWED"),
      (x) => `${shortId(x.id)} - reviewed`,
    ),
    draftPackOptions = opts(
      quotationDraftPacks,
      (x) => `${x.draft_number ?? shortId(x.id)} - ${x.draft_status}`,
    ),
    reviewedDraftPackOptions = opts(
      quotationDraftPacks.filter(
        (x) =>
          x.draft_status === "HUMAN_REVIEWED" && !x.correspondence_record_id,
      ),
      (x) => `${x.draft_number ?? shortId(x.id)} - ready for correspondence`,
    ),
    issuableDraftPackOptions = opts(
      quotationDraftPacks.filter(
        (x) =>
          x.draft_status === "HUMAN_REVIEWED" &&
          x.correspondence_record_id &&
          !quotationIssues.some(
            (issue) => issue.quotation_draft_pack_id === x.id,
          ),
      ),
      (x) => `${x.draft_number ?? shortId(x.id)} - ready to issue`,
    ),
    quotationIssueOptions = opts(
      quotationIssues.filter(
        (x) =>
          !quotationReceivablePreparations.some(
            (prep) => prep.quotation_issue_record_id === x.id,
          ),
      ),
      (x) => `${shortId(x.id)} - ${x.issue_status}`,
    );
  document.querySelector("#salesAccountsView").innerHTML =
    `<section class="grid two"><section class="panel compact-form"><div class="panel-heading"><h2>NHL BOQ Quotation Case</h2><p>Register BOQ images/PDFs, link proposal approval, then register submitted quotation evidence.</p></div><form id="quotationCaseForm"><label>Relationship<select name="relationship_id">${relationshipOptions}</select></label><label>Case number<input name="case_number" value="NHL-QT-2026-0001" /></label><label>Title<input name="title" value="BOQ image quotation request" /></label><label>Client request summary<input name="client_request_summary" value="Client supplied BOQ images and requested NHL Global Solution to quote pricing." /></label><label>Incoming evidence refs<input name="intake_evidence_refs" value="local://nhl/quotation/in/IMG-20260819-WA0007.jpg, local://nhl/quotation/in/IMG-20260819-WA0008.jpg, local://nhl/quotation/in/IMG-20260819-WA0009.jpg, local://nhl/quotation/in/IMG-20260819-WA0010.jpg" /></label><label>Document records<select name="document_register_entry_ids" multiple>${documentOptions}</select></label><button type="submit" ${tenant && firm && relationships.length ? "" : "disabled"}>Register Quotation Case</button></form><form id="quotationCaseLinkForm"><label>Quotation case<select name="quotation_case_id">${quotationCaseOptions}</select></label><label>Proposal<select name="proposal_id">${proposalOptions}</select></label><button type="submit" ${quotationCases.length && proposals.length ? "" : "disabled"}>Link Proposal</button></form><form id="quotationCaseApproveForm"><label>Quotation case<select name="quotation_case_id">${quotationCaseOptions}</select></label><button type="submit" ${quotationCases.some((item) => item.proposal_id) ? "" : "disabled"}>Record Case Approval</button></form><form id="quotationCaseIssueForm"><label>Quotation case<select name="quotation_case_id">${quotationCaseOptions}</select></label><label>Issued document ref<input name="issued_document_ref" value="local://nhl/quotation/Submit/NHL-QT-2026-0001.pdf" /></label><label>Submitted evidence ref<input name="submitted_evidence_ref" value="evidence://nhl/NHL-QT-2026-0001/submitted-pdf" /></label><button type="submit" ${quotationCases.some((item) => item.status === "APPROVAL_RECORDED") ? "" : "disabled"}>Register Issued Quotation</button></form><p class="form-note">NHL-Q1/Q2 boundary: extraction aids are not authoritative and cannot approve price, measure, or issue.</p></section><section class="panel compact-form"><div class="panel-heading"><h2>BOQ Extraction Aid</h2><p>Prepare a review worksheet from registered BOQ evidence. Human review is required before quotation support use.</p></div><form id="boqExtractionAidForm"><label>Quotation case<select name="quotation_case_id">${quotationCaseOptions}</select></label><label>Draft extracted items JSON<textarea name="extracted_items">[{"item_ref":"BOQ-1","description":"Client BOQ line to verify","quantity":"TBC","unit":"TBC","review_flag":"VERIFY_AGAINST_SOURCE"}]</textarea></label><button type="submit" ${quotationCases.some((item) => item.document_register_entry_ids?.length) ? "" : "disabled"}>Prepare Extraction Aid</button></form><form id="boqExtractionReviewForm"><label>Extraction aid<select name="boq_extraction_aid_id">${boqAidOptions}</select></label><label>Review notes<input name="review_notes" value="Reviewed for quotation support only; not authoritative measurement or pricing." /></label><button type="submit" ${boqAids.some((item) => item.extraction_status === "DRAFT_REVIEW_REQUIRED") ? "" : "disabled"}>Record Human Review</button></form></section><section class="panel compact-form"><div class="panel-heading"><h2>Quotation Draft Assembly</h2><p>Assemble a controlled draft pack from a human-reviewed BOQ extraction aid, then prepare client correspondence as draft-only.</p></div><form id="quotationDraftPackForm"><label>Quotation case<select name="quotation_case_id">${quotationCaseOptions}</select></label><label>Reviewed BOQ aid<select name="boq_extraction_aid_id">${reviewedBoqAidOptions}</select></label><label>Line items JSON<textarea name="line_items">[{"item_ref":"BOQ-1","description":"Reviewed BOQ line for quotation draft","quantity":"TBC","unit":"TBC","rate":"TBC","amount":"TBC"}]</textarea></label><label>Commercial summary<input name="commercial_summary" value="Draft quotation package prepared from reviewed BOQ evidence." /></label><button type="submit" ${boqAids.some((item) => item.extraction_status === "HUMAN_REVIEWED") ? "" : "disabled"}>Assemble Draft Pack</button></form><form id="quotationDraftReviewForm"><label>Draft pack<select name="quotation_draft_pack_id">${draftPackOptions}</select></label><label>Review notes<input name="review_notes" value="Human principal reviewed quotation draft pack for client correspondence preparation." /></label><button type="submit" ${quotationDraftPacks.some((item) => item.draft_status === "DRAFT_REVIEW_REQUIRED") ? "" : "disabled"}>Record Draft Review</button></form><form id="quotationClientCorrespondenceForm"><label>Reviewed draft pack<select name="quotation_draft_pack_id">${reviewedDraftPackOptions}</select></label><label>Correspondent<input name="correspondent" value="Client Representative" /></label><label>Subject<input name="subject" value="Draft quotation prepared for review" /></label><button type="submit" ${quotationDraftPacks.some((item) => item.draft_status === "HUMAN_REVIEWED" && !item.correspondence_record_id) ? "" : "disabled"}>Prepare Client Correspondence Draft</button></form><p class="form-note">NHL-Q3 boundary: correspondence is draft-only; final send/issue remains a separate explicit human-controlled step.</p></section><section class="panel compact-form"><div class="panel-heading"><h2>Controlled Quotation Issue and Receivables</h2><p>Record human issue evidence, then prepare receivables for review without live payment movement.</p></div><form id="quotationIssueForm"><label>Human-reviewed draft pack<select name="quotation_draft_pack_id">${issuableDraftPackOptions}</select></label><label>Issued document ref<input name="issued_document_ref" value="local://nhl/quotation/Submit/NHL-QT-2026-0001.pdf" /></label><label>Submitted evidence ref<input name="submitted_evidence_ref" value="evidence://nhl/NHL-QT-2026-0001/issued-pdf" /></label><label>Issued to<input name="issued_to" value="Client Representative" /></label><label>Amount summary<input name="amount_summary" value="Quotation amount pending human commercial confirmation" /></label><button type="submit" ${quotationDraftPacks.some((item) => item.draft_status === "HUMAN_REVIEWED" && item.correspondence_record_id) ? "" : "disabled"}>Record Human-Controlled Issue</button></form><form id="quotationReceivablePreparationForm"><label>Issued quotation<select name="quotation_issue_record_id">${quotationIssueOptions}</select></label><label>Amount summary<input name="amount_summary" value="Prepare receivable/invoice readiness after client acknowledgement or acceptance." /></label><label>Invoice draft ref<input name="invoice_draft_ref" value="draft://nhl/invoice/NHL-INV-TBC" /></label><button type="submit" ${quotationIssues.length ? "" : "disabled"}>Prepare Receivable Record</button></form><p class="form-note">NHL-Q4 boundary: this records issue evidence and receivable readiness only. It cannot send payment links, move funds, or create bank instructions.</p></section><section class="panel"><div class="panel-heading"><h2>Controlled Quotation Issue Register</h2><p>Human-issued quotation evidence for the selected firm.</p></div>${quotationIssueRows(store)}</section><section class="panel"><div class="panel-heading"><h2>Receivables Preparation Register</h2><p>Invoice-readiness records only; no live payment movement.</p></div>${quotationReceivablePreparationRows(store)}</section><section class="panel"><div class="panel-heading"><h2>BOQ Extraction Aid Register</h2><p>Non-authoritative review worksheets for the selected firm.</p></div>${boqExtractionAidRows(store)}</section><section class="panel"><div class="panel-heading"><h2>Quotation Draft Pack Register</h2><p>Controlled draft packs and correspondence-preparation state.</p></div>${quotationDraftPackRows(store)}</section><section class="panel"><div class="panel-heading"><h2>Quotation Case Register</h2><p>Controlled quotation records for ${escapeHtml(firm?.name ?? "the active firm")}.</p></div>${quotationCaseRows(store)}</section></section>${renderQuotationOperationsSummary(store)}<section class="grid two"><section class="panel compact-form"><div class="panel-heading"><h2>Commercial Workforce</h2><p>Bind bounded Sales and Accounts skills. Authority remains with the Virtual Principal.</p></div><form id="commercialBindingForm"><label>Worker<select name="worker_template_code"><option value="marketing-sales-coordinator">Marketing & Sales Coordinator</option><option value="accounts-clerk">Accounts Clerk</option></select></label><label>Role skill ref<input name="role_skill_ref" value="skills://roles/commercial-support/v1"/></label><label>Worker skill ref<input name="worker_skill_ref" value="skills://workers/commercial-operations/v1"/></label><button type="submit" ${tenant && firm ? "" : "disabled"}>Activate Binding</button></form><form id="opportunityForm"><label>Opportunity<input name="opportunity_name" value="New Formwork Package"/></label><label>Estimated value<input name="estimated_value" type="number" value="5000"/></label><button type="submit" ${tenant && firm ? "" : "disabled"}>Create Opportunity</button></form><form id="opportunityStageForm"><label>Opportunity<select name="opportunity_id">${opts(openOpp, (x) => `${x.opportunity_name} - ${x.stage}`)}</select></label><label>Next stage<select name="stage"><option>QUALIFIED</option><option>PROPOSAL_DRAFT</option><option>PROPOSAL_APPROVED</option><option>PROPOSAL_SENT</option><option>WON</option><option>LOST</option></select></label><button type="submit" ${openOpp.length ? "" : "disabled"}>Progress Stage</button></form></section><section class="panel compact-form"><div class="panel-heading"><h2>Controlled Commercial Actions</h2><p>Dispatch and approval require the human principal.</p></div><form id="proposalDispatchForm"><label>Approved proposal<select name="proposal_id">${opts(approvedProposals, (x) => `${shortId(x.id)} - ${x.scope_summary}`)}</select></label><label>Recipient<input name="recipient" value="client@example.com"/></label><label>Approved document ref<input name="document_ref" value="document://approved-proposal.pdf"/></label><button type="submit" ${approvedProposals.length ? "" : "disabled"}>Dispatch Approved Proposal</button></form><form id="expenseForm"><label>Supplier<input name="supplier" value="Project Supplier"/></label><label>Description<input name="description" value="Drawing and printing expense"/></label><label>Amount<input name="amount" type="number" value="200"/></label><button type="submit" ${tenant && firm ? "" : "disabled"}>Prepare Expense</button></form><form id="expenseApproveForm"><label>Expense<select name="expense_id">${opts(draftExpenses, (x) => `${x.supplier} - ${money(x.amount, x.currency)}`)}</select></label><button type="submit" ${draftExpenses.length ? "" : "disabled"}>Principal Approve Expense</button></form><form id="receivableFollowUpForm"><label>Issued invoice<select name="invoice_id">${opts(issuedInvoices, (x) => x.invoice_number)}</select></label><label>Draft message<input name="message_body" value="Please review the outstanding invoice."/></label><button type="submit" ${issuedInvoices.length ? "" : "disabled"}>Draft Receivable Follow-up</button></form><p class="form-note">No bank instruction or autonomous external sending is available.</p></section></section><section class="grid two"><section class="panel"><div class="panel-heading"><h2>Pipeline</h2><p>Deterministic opportunity stages.</p></div>${opportunities.length ? `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Opportunity</th><th>Stage</th><th>Value</th><th>Probability</th></tr></thead><tbody>${opportunities.map((x) => `<tr><td>${escapeHtml(x.opportunity_name)}</td><td><span class="pill">${escapeHtml(x.stage)}</span></td><td>${escapeHtml(money(x.estimated_value, x.currency))}</td><td>${escapeHtml(x.probability_percent)}%</td></tr>`).join("")}</tbody></table></div>` : '<p class="empty">No opportunities.</p>'}</section><section class="panel"><div class="panel-heading"><h2>Cash Snapshot</h2><p>Record projection - not a bank balance.</p></div>${renderRelatedContext(
      "Client-to-cash",
      [
        ["Invoice total", money(invoiceTotal)],
        ["Cash received", money(received)],
        ["Outstanding", money(Math.max(0, invoiceTotal - received))],
        ["Approved expenses", money(approvedExpense)],
        ["Projected net cash", money(received - approvedExpense)],
        ["Receivable drafts", followUps.length],
      ],
    )}</section></section>`;
  const run = (sel, label, path, build, success) =>
    document.querySelector(sel)?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      await runUiCommand({
        label,
        form: e.currentTarget,
        success,
        action: async () => {
          const data = await request(path, {
            method: "POST",
            body: JSON.stringify({
              tenant_id: tenant.id,
              firm_id: firm.id,
              ...build(fd),
              actor: auth,
            }),
          });
          await refresh();
          switchView("sales-accounts");
          return data;
        },
      });
    });
  run(
    "#commercialBindingForm",
    "Activate commercial binding",
    "/commercial/skill-bindings",
    (fd) => ({
      worker_template_code: fd.get("worker_template_code"),
      role_skill_ref: fd.get("role_skill_ref"),
      worker_skill_ref: fd.get("worker_skill_ref"),
    }),
    "Commercial binding activated",
  );
  run(
    "#opportunityForm",
    "Create opportunity",
    "/sales/opportunities",
    (fd) => ({
      opportunity_name: fd.get("opportunity_name"),
      estimated_value: Number(fd.get("estimated_value")),
      probability_percent: 10,
    }),
    "Opportunity created",
  );
  run(
    "#opportunityStageForm",
    "Progress opportunity",
    "/sales/opportunities/update",
    (fd) => ({
      opportunity_id: fd.get("opportunity_id"),
      stage: fd.get("stage"),
      lost_reason:
        fd.get("stage") === "LOST" ? "Not selected by client" : undefined,
    }),
    "Opportunity progressed",
  );
  run(
    "#proposalDispatchForm",
    "Dispatch proposal",
    "/proposals/dispatch",
    (fd) => ({
      proposal_id: fd.get("proposal_id"),
      recipient: fd.get("recipient"),
      document_ref: fd.get("document_ref"),
    }),
    "Approved proposal dispatched",
  );
  run(
    "#expenseForm",
    "Prepare expense",
    "/accounts/expenses",
    (fd) => ({
      supplier: fd.get("supplier"),
      description: fd.get("description"),
      amount: Number(fd.get("amount")),
      category: "GENERAL",
      currency: "MYR",
    }),
    "Expense prepared for review",
  );
  run(
    "#expenseApproveForm",
    "Approve expense",
    "/accounts/expenses/approve",
    (fd) => ({ expense_id: fd.get("expense_id") }),
    "Expense approved without payment instruction",
  );
  run(
    "#receivableFollowUpForm",
    "Draft receivable follow-up",
    "/accounts/receivable-follow-ups",
    (fd) => ({
      invoice_id: fd.get("invoice_id"),
      subject: "Outstanding invoice follow-up",
      message_body: fd.get("message_body"),
    }),
    "Follow-up saved for human review",
  );
  run(
    "#quotationCaseForm",
    "Register quotation case",
    "/quotation-cases",
    (fd) => ({
      relationship_id: fd.get("relationship_id"),
      case_number: fd.get("case_number"),
      title: fd.get("title"),
      quotation_type: "BOQ_IMAGE_QUOTATION",
      service_lines: [
        "project_reporting",
        "technical_writing",
        "clerical_work",
        "bizkick_edcs",
      ],
      client_request_summary: fd.get("client_request_summary"),
      intake_evidence_refs: String(fd.get("intake_evidence_refs") || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      document_register_entry_ids: [
        ...document.querySelectorAll(
          '#quotationCaseForm select[name="document_register_entry_ids"] option:checked',
        ),
      ].map((option) => option.value),
      metadata: { sprint: "NHL-Q1", source: "operator-ui" },
    }),
    "Quotation case registered",
  );
  run(
    "#quotationCaseLinkForm",
    "Link quotation proposal",
    "/quotation-cases/link-proposal",
    (fd) => ({
      quotation_case_id: fd.get("quotation_case_id"),
      proposal_id: fd.get("proposal_id"),
    }),
    "Proposal linked to quotation case",
  );
  run(
    "#quotationCaseApproveForm",
    "Approve quotation case",
    "/quotation-cases/approve",
    (fd) => ({ quotation_case_id: fd.get("quotation_case_id") }),
    "Quotation approval recorded",
  );
  run(
    "#quotationCaseIssueForm",
    "Register issued quotation",
    "/quotation-cases/issue",
    (fd) => ({
      quotation_case_id: fd.get("quotation_case_id"),
      issued_document_ref: fd.get("issued_document_ref"),
      submitted_evidence_ref: fd.get("submitted_evidence_ref"),
    }),
    "Issued quotation evidence registered",
  );
  run(
    "#boqExtractionAidForm",
    "Prepare BOQ extraction aid",
    "/boq-extraction-aids",
    (fd) => ({
      quotation_case_id: fd.get("quotation_case_id"),
      extracted_items: JSON.parse(fd.get("extracted_items") || "[]"),
      metadata: { sprint: "NHL-Q2", source: "operator-ui" },
    }),
    "BOQ extraction aid prepared for review",
  );
  run(
    "#boqExtractionReviewForm",
    "Review BOQ extraction aid",
    "/boq-extraction-aids/review",
    (fd) => ({
      boq_extraction_aid_id: fd.get("boq_extraction_aid_id"),
      review_decision: "ACCEPT_FOR_QUOTATION_SUPPORT",
      review_notes: fd.get("review_notes"),
    }),
    "BOQ extraction aid reviewed by human principal",
  );
  run(
    "#quotationDraftPackForm",
    "Assemble quotation draft pack",
    "/quotation-draft-packs",
    (fd) => ({
      quotation_case_id: fd.get("quotation_case_id"),
      boq_extraction_aid_id: fd.get("boq_extraction_aid_id"),
      line_items: JSON.parse(fd.get("line_items") || "[]"),
      commercial_summary: fd.get("commercial_summary"),
      metadata: { sprint: "NHL-Q3", source: "operator-ui" },
    }),
    "Quotation draft pack assembled for review",
  );
  run(
    "#quotationDraftReviewForm",
    "Review quotation draft pack",
    "/quotation-draft-packs/review",
    (fd) => ({
      quotation_draft_pack_id: fd.get("quotation_draft_pack_id"),
      review_decision: "ACCEPT_FOR_CLIENT_CORRESPONDENCE_DRAFT",
      review_notes: fd.get("review_notes"),
    }),
    "Quotation draft pack reviewed by human principal",
  );
  run(
    "#quotationClientCorrespondenceForm",
    "Prepare quotation correspondence",
    "/quotation-draft-packs/client-correspondence",
    (fd) => ({
      quotation_draft_pack_id: fd.get("quotation_draft_pack_id"),
      correspondent: fd.get("correspondent"),
      subject: fd.get("subject"),
      channel: "EMAIL",
      metadata: { sprint: "NHL-Q3", source: "operator-ui" },
    }),
    "Client correspondence draft prepared; no external send occurred",
  );
  run(
    "#quotationIssueForm",
    "Record controlled quotation issue",
    "/quotation-draft-packs/issue",
    (fd) => ({
      quotation_draft_pack_id: fd.get("quotation_draft_pack_id"),
      issued_document_ref: fd.get("issued_document_ref"),
      submitted_evidence_ref: fd.get("submitted_evidence_ref"),
      issued_to: fd.get("issued_to"),
      amount_summary: fd.get("amount_summary"),
      metadata: { sprint: "NHL-Q4", source: "operator-ui" },
    }),
    "Quotation issue recorded by human principal",
  );
  run(
    "#quotationReceivablePreparationForm",
    "Prepare quotation receivable",
    "/quotation-receivable-preparations",
    (fd) => ({
      quotation_issue_record_id: fd.get("quotation_issue_record_id"),
      amount_summary: fd.get("amount_summary"),
      invoice_draft_ref: fd.get("invoice_draft_ref"),
      metadata: { sprint: "NHL-Q4", source: "operator-ui" },
    }),
    "Receivable preparation recorded; no payment action taken",
  );
}
function renderTechnicalDeliveryModule(store) {
  if (!isWorkspaceModuleSubscribed(store, "technical_delivery"))
    return renderModuleBoundary(
      "#technicalDeliveryView",
      "Technical Delivery",
      store,
      "technical_delivery",
    );
  const host = document.querySelector("#technicalDeliveryView"),
    tenant = latestRecord(store, "tenants"),
    firm = latestRecord(store, "firms"),
    actor = firm ? latestPrincipalActor(store, firm.id) : null,
    auth = actor ?? systemActorForBrowser(tenant?.id, firm?.id),
    projects = store.projects ?? [],
    docs = store.document_register_entries ?? [],
    revisions = store.document_revision_records ?? [],
    intakes = store.intake_sessions ?? [],
    inputs = store.calculation_input_sets ?? [],
    findings = store.technical_qa_findings ?? [],
    packages = store.delivery_package_records ?? [],
    bindings = store.technical_skill_bindings ?? [];
  if (!host) return;
  const opts = (items, label) =>
      items
        .map(
          (x) =>
            `<option value="${escapeHtml(x.id)}">${escapeHtml(label(x))}</option>`,
        )
        .join(""),
    projectOptions = opts(projects, (x) => x.project_name),
    revisionOptions = opts(
      revisions,
      (x) => `${x.revision} ? ${shortId(x.document_register_entry_id)}`,
    ),
    openFindings = findings.filter((x) => x.status === "OPEN"),
    validInputs = inputs.filter((x) => x.validation_status === "VALID");
  host.innerHTML = `<section class="grid two"><section class="panel compact-form"><div class="panel-heading"><h2>Technical Support Workforce</h2><p>Bounded drawing and Formwork QA skills. No engineering approval, certification, or issue authority.</p></div><form id="technicalBindingForm"><label>Worker<select name="worker_template_code"><option>technical-drawing-assistant</option><option>formwork-qa-agent</option></select></label><button type="submit" ${tenant && firm ? "" : "disabled"}>Activate Binding</button></form><form id="drawingReviewForm"><label>Project<select name="project_id">${projectOptions}</select></label><label>Document<select name="document_register_entry_id">${opts(docs, (x) => `${x.document_number} ? ${x.title}`)}</select></label><label>Base revision<select name="base_revision_id">${revisionOptions}</select></label><label>Compared revision<select name="compared_revision_id">${revisionOptions}</select></label><button type="submit" ${projects.length && revisions.length > 1 ? "" : "disabled"}>Check Revisions</button></form></section><section class="panel compact-form"><div class="panel-heading"><h2>Formwork Inputs & QA</h2><p>Deterministic input validation prepares evidence; it does not calculate or conclude engineering adequacy.</p></div><form id="calculationInputForm"><label>Project<select name="project_id">${projectOptions}</select></label><label>Intake<select name="intake_session_id">${opts(intakes, (x) => shortId(x.id))}</select></label><label>Source revision<select name="source_revision_id">${revisionOptions}</select></label><button type="submit" ${projects.length && intakes.length && revisions.length ? "" : "disabled"}>Validate Intake Inputs</button></form><form id="qaFindingForm"><label>Project<select name="project_id">${projectOptions}</select></label><label>Subject revision<select name="subject_id">${revisionOptions}</select></label><label>Severity<select name="severity"><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select></label><label>Finding<input name="description" value="Technical condition requires principal review."/></label><button type="submit" ${projects.length && revisions.length ? "" : "disabled"}>Raise QA Finding</button></form><form id="qaResolveForm"><label>Open finding<select name="finding_id">${opts(openFindings, (x) => `${x.severity} ? ${x.finding_code}`)}</select></label><label>Resolution<input name="resolution_summary" value="Principal reviewed supporting evidence."/></label><button type="submit" ${openFindings.length ? "" : "disabled"}>Principal Resolve</button></form></section></section><section class="panel compact-form"><div class="panel-heading"><h2>Delivery Package Readiness</h2><p>Assembly can only reach READY_FOR_PRINCIPAL_REVIEW. Approval and issue remain in the governed deliverable workflow.</p></div><form id="deliveryPackageForm"><label>Project<select name="project_id">${projectOptions}</select></label><label>Current drawing revision<select name="drawing_revision_id">${revisionOptions}</select></label><label>Valid input set<select name="calculation_input_set_id">${opts(validInputs, (x) => shortId(x.id))}</select></label><label>Evidence ref<input name="evidence_ref" value="evidence://drawing-check"/></label><button type="submit" ${projects.length && revisions.length && validInputs.length ? "" : "disabled"}>Assemble Review Package</button></form>${renderRelatedContext(
    "Technical delivery status",
    [
      ["Active bindings", bindings.length],
      ["Drawing checks", (store.drawing_review_records ?? []).length],
      ["Valid input sets", validInputs.length],
      ["Open QA findings", openFindings.length],
      [
        "Blocked packages",
        packages.filter((x) => x.package_status === "BLOCKED").length,
      ],
      [
        "Ready for principal",
        packages.filter(
          (x) => x.package_status === "READY_FOR_PRINCIPAL_REVIEW",
        ).length,
      ],
    ],
  )}</section>`;
  const run = (sel, label, path, build, success) =>
    host.querySelector(sel)?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      await runUiCommand({
        label,
        form: e.currentTarget,
        success,
        action: async () => {
          const data = await request(path, {
            method: "POST",
            body: JSON.stringify({
              tenant_id: tenant.id,
              firm_id: firm.id,
              ...build(fd),
              actor: auth,
            }),
          });
          await refresh();
          switchView("technical-delivery");
          return data;
        },
      });
    });
  run(
    "#technicalBindingForm",
    "Activate technical binding",
    "/technical/skill-bindings",
    (fd) => ({
      worker_template_code: fd.get("worker_template_code"),
      role_skill_ref: "skills://roles/technical-support/v1",
      worker_skill_ref: `skills://workers/${fd.get("worker_template_code")}/v1`,
    }),
    "Technical binding activated",
  );
  run(
    "#drawingReviewForm",
    "Check drawing revisions",
    "/technical/drawing-reviews",
    (fd) =>
      Object.fromEntries(
        [
          "project_id",
          "document_register_entry_id",
          "base_revision_id",
          "compared_revision_id",
        ].map((k) => [k, fd.get(k)]),
      ),
    "Revision check prepared for professional review",
  );
  run(
    "#calculationInputForm",
    "Validate calculation inputs",
    "/technical/calculation-input-sets",
    (fd) => {
      const intake = intakes.find((x) => x.id === fd.get("intake_session_id"));
      return {
        project_id: fd.get("project_id"),
        intake_session_id: fd.get("intake_session_id"),
        source_revision_refs: [fd.get("source_revision_id")],
        input_values: intake?.provided_inputs ?? {},
        unit_system: "SI",
      };
    },
    "Inputs validated without producing engineering results",
  );
  run(
    "#qaFindingForm",
    "Raise QA finding",
    "/technical/qa-findings",
    (fd) => ({
      project_id: fd.get("project_id"),
      subject_type: "DrawingRevision",
      subject_id: fd.get("subject_id"),
      finding_code: "TECHNICAL_REVIEW_REQUIRED",
      severity: fd.get("severity"),
      description: fd.get("description"),
    }),
    "QA finding raised",
  );
  run(
    "#qaResolveForm",
    "Resolve QA finding",
    "/technical/qa-findings/resolve",
    (fd) => ({
      finding_id: fd.get("finding_id"),
      resolution_summary: fd.get("resolution_summary"),
    }),
    "QA finding resolved by principal",
  );
  run(
    "#deliveryPackageForm",
    "Assemble delivery package",
    "/technical/delivery-packages",
    (fd) => ({
      project_id: fd.get("project_id"),
      drawing_revision_refs: [fd.get("drawing_revision_id")],
      calculation_input_set_id: fd.get("calculation_input_set_id"),
      evidence_refs: [fd.get("evidence_ref")],
    }),
    "Package assembled for principal review",
  );
}
function renderFailureCard(target, title, error) {
  const host = document.querySelector(target);
  if (!host) return;
  const message = error instanceof Error ? error.message : String(error);
  host.innerHTML = `<section class="panel danger-soft"><div class="panel-heading"><h2>${escapeHtml(title)} needs attention</h2><p>The page renderer failed, so the workspace is showing this diagnostic instead of a blank page.</p></div><pre class="output">${escapeHtml(message)}</pre></section>`;
}
function safeRenderModule(target, title, renderer, store) {
  try {
    renderer(store);
  } catch (error) {
    console.error(`${title} render failed`, error);
    renderFailureCard(target, title, error);
  }
}
function renderRecordViews(store) {
  safeRenderModule("#myFirmView", "My Firm", renderMyFirmModule, store);
  safeRenderModule("#clientsView", "Clients", renderClientModule, store);
  safeRenderModule("#intakeView", "Intake", renderIntakeModule, store);
  safeRenderModule(
    "#frontDeskView",
    "Front Desk",
    () =>
      renderIfSubscribed(
        "#frontDeskView",
        "Front Desk",
        "front_desk",
        renderFrontDeskModule,
        store,
      ),
    store,
  );
  safeRenderModule(
    "#administrationView",
    "Administration",
    () =>
      renderIfSubscribed(
        "#administrationView",
        "Administration",
        "administration",
        renderAdministrationModule,
        store,
      ),
    store,
  );
  safeRenderModule(
    "#salesAccountsView",
    "Sales & Accounts",
    () =>
      renderIfSubscribed(
        "#salesAccountsView",
        "Sales & Accounts",
        "sales_accounts",
        renderSalesAccountsModule,
        store,
      ),
    store,
  );
  safeRenderModule(
    "#technicalDeliveryView",
    "Technical Delivery",
    () =>
      renderIfSubscribed(
        "#technicalDeliveryView",
        "Technical Delivery",
        "technical_delivery",
        renderTechnicalDeliveryModule,
        store,
      ),
    store,
  );
  safeRenderModule("#proposalsView", "Proposals", renderProposalModule, store);
  safeRenderModule(
    "#projectsView",
    "Projects",
    () =>
      renderIfSubscribed(
        "#projectsView",
        "Projects",
        "projects",
        renderProjectModule,
        store,
      ),
    store,
  );
  safeRenderModule(
    "#approvalsView",
    "Approvals",
    () =>
      renderIfSubscribed(
        "#approvalsView",
        "Approvals",
        "approvals",
        () =>
          renderRecordView({
            target: "#approvalsView",
            title: "Approvals",
            description: "Explicit approval decisions.",
            records: store.approvals ?? [],
            empty: "No approvals yet.",
            columns: [
              { label: "Subject", value: (r) => r.subject_type },
              { label: "Decision", value: (r) => r.decision },
              { label: "Auth", value: (r) => r.authentication_strength },
              { label: "ID", value: (r) => shortId(r.id) },
            ],
          }),
        store,
      ),
    store,
  );
  safeRenderModule(
    "#invoicesView",
    "Invoices",
    () =>
      renderIfSubscribed(
        "#invoicesView",
        "Invoices",
        "invoices",
        renderInvoiceModule,
        store,
      ),
    store,
  );
  safeRenderModule(
    "#aiWorkforceView",
    "AI Workforce",
    () =>
      renderIfSubscribed(
        "#aiWorkforceView",
        "AI Workforce",
        "ai_workforce",
        renderAiWorkforceModule,
        store,
      ),
    store,
  );
  safeRenderModule(
    "#networkView",
    "Network",
    () =>
      renderIfSubscribed(
        "#networkView",
        "Network",
        "network",
        renderNetworkModule,
        store,
      ),
    store,
  );
  safeRenderModule(
    "#opsView",
    "Ops",
    () => renderIfSubscribed("#opsView", "Ops", "ops", renderOpsModule, store),
    store,
  );
  safeRenderModule(
    "#auditView",
    "Audit",
    () =>
      renderIfSubscribed(
        "#auditView",
        "Audit",
        "audit",
        renderAuditModule,
        store,
      ),
    store,
  );
  safeRenderModule(
    "#servicePackView",
    "Service Pack",
    renderServicePackModule,
    store,
  );
  safeRenderModule("#pilotView", "Pilot", renderPilotModule, store);
  safeRenderModule("#usersView", "Users", renderUsersModule, store);
  safeRenderModule("#supportView", "Support", renderSupportModule, store);
  safeRenderModule(
    "#reviewBoardView",
    "Review Board",
    renderReviewBoardModule,
    store,
  );
  safeRenderModule("#expansionView", "Expansion", renderExpansionModule, store);
  safeRenderModule(
    "#usageBillingView",
    "Usage/Billing",
    renderUsageBillingModule,
    store,
  );
  safeRenderModule(
    "#commercialLaunchView",
    "Commercial Launch",
    renderCommercialLaunchModule,
    store,
  );
}
function renderAll() {
  renderState();
  if (lastStore) {
    const scopedStore = scopedStoreForActiveFirm(lastStore);
    renderWorkspaceShell(scopedStore);
    renderWorkspaceNavigation(scopedStore);
    renderActiveWorkspaceSelector(lastStore, scopedStore);
    renderSummary(scopedStore);
    renderLatestActivity(scopedStore);
    renderRecordViews(scopedStore);
  }
}
function optionalWorkspaceFallback(key) {
  return key.endsWith("_summary") ? {} : [];
}
async function loadWorkspaceCollection(key, path) {
  try {
    return [key, await request(path)];
  } catch (error) {
    console.warn(`Workspace collection ${key} unavailable`, error);
    return [key, optionalWorkspaceFallback(key)];
  }
}
async function loadWorkspaceData() {
  try {
    const [summary, pairs] = await Promise.all([
      request("/dashboard/summary"),
      Promise.all(
        workspaceCollections.map(([key, path]) =>
          loadWorkspaceCollection(key, path),
        ),
      ),
    ]);
    return { ...Object.fromEntries(pairs), _dashboard_summary: summary };
  } catch (error) {
    console.warn("Falling back to /mvp/store", error);
    return request("/mvp/store");
  }
}
async function refresh() {
  setOperatorMessage("Refreshing workspace data...", "loading");
  lastStore = await loadWorkspaceData();
  renderAll();
}
async function checkApi() {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    const health = await res.json();
    if (!res.ok || !health.ok)
      throw new Error(health.error?.message ?? "Health check failed");
    apiStatus.textContent = `${health.phase} on ${health.api_port ?? 3091}`;
    apiStatus.style.color = "var(--accent-dark)";
  } catch (error) {
    apiStatus.textContent = `Offline (${API_BASE}: ${error instanceof Error ? error.message : String(error)})`;
    apiStatus.style.color = "var(--danger)";
    setOperatorMessage(
      "API offline. Start npm run dev from the project root or apps/web folder.",
      "danger",
    );
  }
}
function setSidebarOpen(open) {
  document.body.classList.toggle("sidebar-open", open);
  sidebarToggle?.setAttribute("aria-expanded", open ? "true" : "false");
}
sidebarToggle?.addEventListener("click", () =>
  setSidebarOpen(!document.body.classList.contains("sidebar-open")),
);
sidebarScrim?.addEventListener("click", () => setSidebarOpen(false));
navButtons.forEach((button) =>
  button.addEventListener("click", () => {
    switchView(button.dataset.view);
    setSidebarOpen(false);
  }),
);
workflowSteps.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-step]");
  if (!button) return;
  const step = steps.find((item) => item.key === button.dataset.step);
  if (!step) return;
  await runUiCommand({
    label: step.title,
    button,
    success: `${step.title} completed`,
    action: async () => {
      const data = await step.run();
      step.apply(data);
      await refresh();
      switchView(currentView);
      return data;
    },
  });
});
demoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await runUiCommand({
    label: "Run full demo loop",
    form: demoForm,
    success: "Full demo loop completed",
    action: async () => {
      const formData = new FormData(demoForm);
      const body = Object.fromEntries(formData.entries());
      body.final_price = Number(body.final_price || 0);
      body.formwork_inputs = formworkInputs();
      const data = await request("/mvp/demo-loop", {
        method: "POST",
        body: JSON.stringify(body),
      });
      state = { ...state, ...data, finalPrice: body.final_price };
      await refresh();
      return data;
    },
  });
});
resetWorkflow.addEventListener("click", () => {
  state = defaultState();
  clearCommandFeedback();
  setCommandFeedback(
    "success",
    "Page workflow state reset",
    "Server data was not changed.",
  );
  renderAll();
});
refreshStore.addEventListener("click", () =>
  runUiCommand({
    label: "Refresh workspace",
    button: refreshStore,
    success: "Workspace refreshed",
    action: () => refresh(),
  }),
);
renderAll();
await checkApi();
await refresh().catch((error) => {
  setCommandFeedback(
    "error",
    "Workspace render failed",
    commandErrorMessage(error),
  );
  setOperatorMessage(
    "Workspace render failed. See diagnostic banner.",
    "danger",
  );
});
