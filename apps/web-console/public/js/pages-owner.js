// Owner-workspace pages. Each export is `mount(root, ctx)`: renders into
// `root` (the #pageBody element) and wires its own event listeners scoped
// to that root, so main.js just calls mount() once per navigation and
// does not need per-page click routing.
//
// Dashboard and My Team are bespoke, built from field names confirmed by
// directly reading the API source: readDashboardSummary (server.mjs) for
// Dashboard's counts/health/latest_activity shape, appendEventAndAudit
// (store.mjs) for event_log entry fields, and createVirtualStaffMember /
// createStaffRoleAssignment / updateAwiaVirtualStaffLifecycleRecord /
// hireAwiaFirmWorkerRecord (packages/core-domain/src/awia-virtual-staff-
// provisioning.mjs, apps/api/src/store.mjs) for the staff roster, lifecycle
// and hire-worker contracts. Sales / Projects / Finance's sub-lists still
// render through the generic inspector() (see ui.js + README) since those
// collections are empty in the live store and their shapes are unconfirmed.

import { api, HIREABLE_ROLES, AWIA_HIRE_PACKAGE_CODE, scopeStoreToCurrentFirm } from "./api.js";
import { panel, table, statRow, tabBar, statusPill, empty, errorBox, inspector, fmtDate, escapeHtml } from "./ui.js";

function loading() {
  return `<div class="empty">Loading&hellip;</div>`;
}

async function withStore(root, render) {
  root.innerHTML = loading();
  try {
    // Cross-tenant leak fix (2026-09-21): getStore() returns the WHOLE
    // database (see api.js's scopeStoreToCurrentFirm() for why) -- never
    // render it straight into a firm's own page.
    const store = scopeStoreToCurrentFirm(await api.getStore());
    root.innerHTML = render(store);
  } catch (err) {
    root.innerHTML = errorBox(err, "this page");
  }
}

// ---------------------------------------------------------------- Dashboard
// Field names confirmed by reading readDashboardSummary() (server.mjs):
// { counts: {...}, latest_activity: [event_log rows], health: { api,
// persistence, service_pack, audit, workflow, active_workspace }, generated_at }.
// event_log rows (appendEventAndAudit, store.mjs) carry event_type,
// occurred_at, actor_id, aggregate_type, aggregate_id, payload_summary.
export async function mountDashboard(root) {
  root.innerHTML = loading();
  try {
    const dashboard = await api.getDashboardSummary();
    const c = dashboard.counts ?? {};
    const health = dashboard.health ?? {};
    const activity = dashboard.latest_activity ?? [];

    const activityRows = activity.map((e) => ({
      what: (e.payload_summary ?? e.event_type ?? "—").toString(),
      aggregate: e.aggregate_type ? `${e.aggregate_type}${e.aggregate_id ? ` #${e.aggregate_id}` : ""}` : "—",
      actor: e.actor_id ?? "—",
      when: fmtDate(e.occurred_at),
      id: e.id ?? `${e.aggregate_id ?? ""}-${e.occurred_at ?? ""}`,
    }));

    root.innerHTML = `
      ${statRow([
        { value: c.firms ?? 0, label: "Firms" },
        { value: c.clients ?? 0, label: "Clients" },
        { value: c.proposals ?? 0, label: "Proposals" },
        { value: c.projects ?? 0, label: "Projects" },
        { value: c.invoices ?? 0, label: "Invoices" },
        { value: c.open_intake ?? 0, label: "Open intake" },
      ])}
      ${panel("Workflow status", `
        <div class="kv-grid">
          <div class="kv"><span class="kv-key">status</span><span class="kv-value">${statusPill(health.workflow?.status ?? "unknown")}</span></div>
          <div class="kv"><span class="kv-key">next step</span><span class="kv-value">${escapeHtml(health.workflow?.next_gate ?? "—")}</span></div>
        </div>
      `)}
      ${panel("Service pack &amp; API health", `
        <div class="kv-grid">
          <div class="kv"><span class="kv-key">API</span><span class="kv-value">${statusPill(health.api?.status ?? "unknown")}</span></div>
          <div class="kv"><span class="kv-key">Service pack</span><span class="kv-value">${escapeHtml(health.service_pack?.name ?? "—")} (${statusPill(health.service_pack?.status ?? "unknown")})</span></div>
          <div class="kv"><span class="kv-key">Audit</span><span class="kv-value">${statusPill(health.audit?.status ?? "unknown")} — ${escapeHtml(String(health.audit?.events ?? 0))} events</span></div>
          <div class="kv"><span class="kv-key">Active workspace</span><span class="kv-value">${escapeHtml(health.active_workspace?.firm?.name ?? health.active_workspace?.tenant?.name ?? "—")}</span></div>
        </div>
      `)}
      ${panel("Latest activity", activityRows.length ? table(
        [
          { key: "what", label: "Event" },
          { key: "aggregate", label: "On" },
          { key: "actor", label: "Actor" },
          { key: "when", label: "When" },
        ],
        activityRows,
        (r) => r.id
      ) : empty("No activity recorded yet."))}
    `;
  } catch (err) {
    root.innerHTML = errorBox(err, "dashboard");
  }
}

// ---------------------------------------------------------------- My Team
// Roster fields confirmed by reading createVirtualStaffMember() /
// createStaffRoleAssignment() (packages/core-domain/src/awia-virtual-staff-
// provisioning.mjs) and updateAwiaVirtualStaffLifecycleRecord() (store.mjs):
// members key off agent_code/display_name/organization_id/lifecycle_status/
// staff_grade; role assignments join back to a member via staff_code (===
// member.agent_code). Lifecycle transitions go through
// updateStaffLifecycle({ staff_code, to_state: "PAUSED" | "ACTIVE" }) --
// tenant_id/firm_id are injected automatically by api.js's scopedBody().
// Hiring requires an AWIA_HIRE_PACKAGE_CODE ("HIRE_ME") package assignment
// first (hireAwiaFirmWorkerRecord, store.mjs, throws
// AWIA_STAFF_HIRE_REQUIRES_PACKAGE_ASSIGNMENT without one), so this checks
// getFirmPackageAssignment() before offering role cards.
// HM-S1 checklist item 4: My Team's role-code language, replaced with job
// titles everywhere client-facing. HIREABLE_ROLES (api.js) is the source of
// truth for role_code -> job title, but role_code "ARO" is genuinely
// ambiguous (General Clerk and HR Administrator both hire onto it -- the
// known gap recorded against checklist item 3). Resolve that ambiguity from
// the worker's own display_name where possible (set to the job title at
// hire time by the fix below); fall back to a non-code-bearing generic
// label ("Administration") only for pre-existing ARO hires from before this
// fix, rather than ever showing the raw role_code to the client.
const JOB_TITLES_BY_ROLE_CODE = HIREABLE_ROLES.reduce((byCode, role) => {
  (byCode[role.role_code] ??= []).push(role.role_name);
  return byCode;
}, {});

function jobTitleForRoleAssignment(assignment, worker) {
  const roleCode = assignment?.role_code;
  const candidates = JOB_TITLES_BY_ROLE_CODE[roleCode] ?? [];
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    const matched = candidates.find((title) => worker?.display_name === title);
    if (matched) return matched;
    return "Administration"; // ambiguous ARO seat hired before this fix; never show the raw code
  }
  return assignment?.role_name ?? "—";
}

export async function mountTeam(root) {
  root.innerHTML = loading();
  try {
    // Cross-tenant leak fix (2026-09-21): see api.js's scopeStoreToCurrentFirm().
    const [rawStore, packageResult] = await Promise.all([api.getStore(), api.getFirmPackageAssignment()]);
    const store = scopeStoreToCurrentFirm(rawStore);
    const workers = store.awia_virtual_staff_members ?? [];
    const roles = store.awia_staff_role_assignments ?? [];
    const hasPackage = Boolean(packageResult?.assignment);

    // "Remove a worker" (2026-09-21): there is no hard-delete path for a
    // single AWIA staff member anywhere in this codebase, and this fix does
    // not add one -- RETIRED is an existing, already-tested lifecycle state
    // (updateAwiaVirtualStaffLifecycleRecord, store.mjs) that was simply
    // never exposed as a button. A retired worker keeps its full audit
    // history (lifecycle events, past output drafts, etc.) but drops out of
    // the active roster and the "Total hired" count below, same as how the
    // product owner would expect "removed" to look without actually losing
    // any record.
    const activeWorkers = workers.filter((w) => w.lifecycle_status !== "RETIRED");
    const retiredCount = workers.length - activeWorkers.length;

    // Hire-guardrail fix (2026-09-22): mirrors the server-side duplicate-
    // occupancy check added to hireAwiaFirmWorkerRecord (store.mjs) so the
    // Hire button is disabled and labelled BEFORE a request ever goes out,
    // instead of the firm owner only finding out after an error alert. A
    // RETIRED occupant does not count -- retiring frees the seat back up.
    const occupiedPositionIds = new Set(activeWorkers.filter((w) => w.position_id).map((w) => w.position_id));
    const occupiedRoleCodesWithoutPosition = new Set(
      activeWorkers
        .filter((w) => !w.position_id)
        .map((w) => roles.find((r) => r.staff_code === w.agent_code)?.role_code)
        .filter(Boolean)
    );

    const rows = activeWorkers.map((w) => {
      const assignment = roles.find((r) => r.staff_code === w.agent_code);
      return {
        name: w.display_name ?? w.agent_code,
        role: jobTitleForRoleAssignment(assignment, w),
        grade: w.staff_grade ?? "—",
        status: (w.lifecycle_status ?? "unknown").toLowerCase(),
        staff_code: w.agent_code,
      };
    });
    const rosterBody = table(
      [
        { key: "name", label: "Worker" },
        { key: "role", label: "Role" },
        { key: "grade", label: "Grade" },
        { key: "status", label: "Status", render: (r) => statusPill(r.status) },
        { key: "actions", label: "", render: (r) => `
          <button class="btn-sm" data-action="pause" data-staff-code="${escapeHtml(r.staff_code)}" type="button" ${r.status === "paused" ? "disabled" : ""}>Pause</button>
          <button class="btn-sm" data-action="activate" data-staff-code="${escapeHtml(r.staff_code)}" type="button" ${r.status === "active" ? "disabled" : ""}>Reactivate</button>
          <button class="btn-sm" data-action="retire" data-staff-code="${escapeHtml(r.staff_code)}" data-worker-name="${escapeHtml(r.name)}" type="button">Retire</button>
        ` },
      ],
      rows,
      (r) => r.staff_code
    );

    const hirePanel = hasPackage
      ? panel("Hire a worker", `
          <p class="field-note">HireMe package active — choose a position to add to this firm's team.</p>
          <div class="role-cards">
            ${HIREABLE_ROLES.map((role) => {
              const isOccupied = role.position_id ? occupiedPositionIds.has(role.position_id) : occupiedRoleCodesWithoutPosition.has(role.role_code);
              return `
              <div class="role-card">
                <div class="role-card-title">${escapeHtml(role.role_name)}</div>
                <div class="field-note">${escapeHtml(role.default_staff_grade)}</div>
                ${isOccupied ? `<div class="field-note">Already hired — retire the current ${escapeHtml(role.role_name)} first to hire another.</div>` : ""}
                <button class="btn-sm" data-action="hire" data-role-code="${escapeHtml(role.role_code)}" data-job-title="${escapeHtml(role.role_name)}" data-position-id="${escapeHtml(role.position_id ?? "")}" type="button" ${isOccupied ? "disabled" : ""}>Hire</button>
              </div>
            `;
            }).join("")}
          </div>
        `)
      : panel("Hire a worker", `
          ${empty("This firm has no AWIA commercial package assigned yet. Enable hiring to choose from the role catalogue.")}
          <button class="btn-sm" data-action="enable-hiring" type="button">Enable hiring (HireMe)</button>
        `);

    root.innerHTML = `
      ${statRow([
        { value: activeWorkers.length, label: "Total hired" },
        { value: activeWorkers.filter((w) => w.lifecycle_status === "ACTIVE").length, label: "Active" },
        { value: activeWorkers.filter((w) => w.lifecycle_status === "PAUSED").length, label: "Paused" },
        { value: retiredCount, label: "Retired" },
      ])}
      ${panel("Your team", rosterBody)}
      ${hirePanel}
    `;
  } catch (err) {
    root.innerHTML = errorBox(err, "your team");
    return;
  }

  root.addEventListener("click", async (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === "retire") {
      // A retire is one-way from this UI (no "un-retire" button, matching
      // the fact that this is the "remove a worker" action) -- confirm
      // before sending it, the same guardrail this fix was requested
      // alongside (the product owner had no such check before hiring a
      // duplicate General Clerk). Checked before any loading state is
      // applied so a Cancel leaves the page exactly as it was.
      const confirmed = window.confirm(`Retire ${btn.dataset.workerName ?? btn.dataset.staffCode}? This removes them from the active roster and cannot be undone from here.`);
      if (!confirmed) return;
    }

    // Processing indicator (2026-09-22): previously nothing changed on
    // screen between the click and mountTeam()'s re-render completing, so
    // a slow database round trip (see the architectural whole-store
    // load/save performance issue) looked identical to the page being
    // hung -- reported directly by the product owner. Disable every
    // action button on the page (prevents a double-submit mid-flight) and
    // swap the clicked button's own label to an in-progress verb; success
    // re-renders the whole page via mountTeam() anyway, and failure
    // restores every button's original label/disabled state so the page
    // never gets stuck disabled.
    const inProgressLabel = { pause: "Pausing…", activate: "Reactivating…", retire: "Retiring…", hire: "Hiring…", "enable-hiring": "Enabling…" }[action];
    const originalButtonStates = new Map();
    for (const b of root.querySelectorAll("button[data-action]")) {
      originalButtonStates.set(b, { text: b.textContent, disabled: b.disabled });
      b.disabled = true;
    }
    if (inProgressLabel) btn.textContent = inProgressLabel;

    try {
      if (action === "pause") await api.updateStaffLifecycle({ staff_code: btn.dataset.staffCode, to_state: "PAUSED" });
      if (action === "activate") await api.updateStaffLifecycle({ staff_code: btn.dataset.staffCode, to_state: "ACTIVE" });
      if (action === "retire") await api.updateStaffLifecycle({ staff_code: btn.dataset.staffCode, to_state: "RETIRED" });
      if (action === "hire") await api.hireWorker({ role_code: btn.dataset.roleCode, display_name: btn.dataset.jobTitle, position_id: btn.dataset.positionId || undefined });
      if (action === "enable-hiring") await api.enableHiring({ package_code: AWIA_HIRE_PACKAGE_CODE });
      await mountTeam(root);
    } catch (err) {
      for (const [b, original] of originalButtonStates) {
        b.textContent = original.text;
        b.disabled = original.disabled;
      }
      alert(`Action failed: ${err.message}`);
    }
  });
}

// ---------------------------------------------------------------- Workdesk
const WORKDESK_TABS = [
  { id: "inbox", label: "Inbox" },
  { id: "pending", label: "Pending" },
  { id: "approval", label: "Approval" },
  { id: "outbox", label: "Outbox" },
  { id: "archived", label: "Archived" },
];

// HM-S2 item 5: fixed against the REAL AWIA workdesk_status values
// (confirmed by reading assignAwiaVirtualStaffTaskRecord /
// produceAwiaStaffOutputDraftRecord / reviewAwiaStaffOutputDraftRecord /
// prepareAwiaClientDeliveryDraftRecord / markAwiaClientDeliveryDraftSentRecord
// in store.mjs). The previous version read fields (item.status/title/
// client_name/due_at, draft.status "stuck"/"awaiting_review") that do not
// exist on the real schema, so no real AWIA workdesk item -- including the
// HM-S2 ARO-01 pilot's -- could ever classify or render correctly. A
// non-AWIA/legacy task-shaped item (no workdesk_status field) still falls
// back to the prior generic heuristic unchanged.
function classifyWorkdeskItem(item, drafts, deliveries) {
  if (item.workdesk_status !== undefined) {
    switch (item.workdesk_status) {
      case "ASSIGNED": return "pending";
      case "OUTPUT_DRAFTED": return "approval";
      case "REVIEW_ACTION_REQUIRED": return "approval";
      case "REVIEWED_FOR_CLIENT_DRAFT": return "outbox";
      case "CLIENT_DELIVERY_DRAFT_PREPARED": return "outbox";
      case "ARCHIVED_SENT": return "archived";
      case "ARCHIVED_DISMISSED": return "archived";
      default: return "inbox";
    }
  }
  const draft = drafts.find((d) => d.workdesk_item_id === item.id || d.task_id === item.id);
  const delivery = deliveries.find((d) => d.workdesk_item_id === item.id || d.task_id === item.id);
  if (item.archived || item.status === "archived") return "archived";
  if (delivery) return delivery.status === "sent" ? "archived" : "outbox";
  if (draft) {
    if (draft.status === "stuck" || draft.status === "rejected") return "approval";
    if (draft.status === "awaiting_review" || draft.status === "pending_review") return "approval";
    return "pending";
  }
  if (item.status === "assigned" || item.assignee_id) return "pending";
  return "inbox";
}

// Compact preview of a real output_payload so the firm owner sees the actual
// skill output at a glance, not just a summary string. HM-S4 item 7: extended
// to recognize each of the four new pilots' real output_payload shapes
// (confirmed by reading their core-domain modules directly), alongside the
// original HM-S2 ARO-01 shape. Still generic by design -- falls back to the
// first few keys for any future skill's payload shape rather than
// hardcoding only the shapes known today.
function summarizeOutputPayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  // ARO-01 (HM-S2): {category, priority, routed_to, ...}
  if (payload.category && payload.priority && payload.routed_to) {
    return `${payload.category} · ${payload.priority} → ${payload.routed_to}`;
  }
  // FAO-11 Account Reconciliation (HM-S4 item 3): {reconciled, variance_total, matched, mismatches, ...}
  if (typeof payload.reconciled === "boolean" && payload.variance_total !== undefined) {
    const matchedCount = Array.isArray(payload.matched) ? payload.matched.length : 0;
    const mismatchCount = Array.isArray(payload.mismatches) ? payload.mismatches.length : 0;
    return `${payload.reconciled ? "Reconciled" : "Not reconciled"} · variance ${payload.variance_total} · ${matchedCount} matched, ${mismatchCount} mismatched`;
  }
  // SAO-03 Lead Qualification & Scoring (HM-S4 item 4): {score, tier, ...}
  if (typeof payload.score === "number" && payload.tier) {
    return `${payload.tier} · score ${payload.score}/100`;
  }
  // OPO-09 Task & Capacity Assignment (HM-S4 item 5): {capacity_status, assigned_queue_id, ...}
  if (payload.capacity_status && payload.assigned_queue_id) {
    return `${payload.capacity_status} → ${payload.assigned_queue_id}`;
  }
  // ARO-10 Employee Onboarding Administration (HM-S4 item 6, Class A): {status, missing_documents, sod_conflict, ...}
  // Never renders the new hire's name -- the payload itself never carries one.
  if (payload.status && Array.isArray(payload.missing_documents)) {
    return payload.sod_conflict
      ? `${payload.status} · SOD conflict flagged`
      : `${payload.status} · ${payload.missing_documents.length} document(s) outstanding`;
  }
  const keys = Object.keys(payload).slice(0, 3);
  if (!keys.length) return null;
  return keys.map((k) => `${k}: ${payload[k]}`).join(", ");
}

// HM-S4 item 7: a Class A skill (e.g. ARO-10) blocks on a distinct
// firm-owner approval decision (HM-S4 item 2's evaluateClassAApprovalGate(),
// via output_draft.class_a_approval_required / class_a_approval_status)
// before an ordinary output review can even be attempted -- a materially
// different wait than "needs review". Surface that as its own status label
// rather than folding it into the ordinary OUTPUT_DRAFTED /
// REVIEW_ACTION_REQUIRED pill, so the firm owner can tell at a glance which
// action is actually required.
function workdeskStatusLabel(item, draft) {
  if (draft?.class_a_approval_required && draft.class_a_approval_status === "PENDING") {
    return "CLASS_A_APPROVAL_PENDING";
  }
  return item.workdesk_status ?? "unknown";
}

export async function mountWorkdesk(root) {
  let activeTab = "inbox";

  async function render() {
    root.innerHTML = loading();
    try {
      // Cross-tenant leak fix (2026-09-21): see api.js's scopeStoreToCurrentFirm().
      const store = scopeStoreToCurrentFirm(await api.getStore());
      const isAwia = Array.isArray(store.awia_staff_workdesk_items);
      const items = store.awia_staff_workdesk_items ?? store.tasks ?? [];
      const drafts = store.awia_staff_output_drafts ?? [];
      const deliveries = store.awia_client_delivery_drafts ?? [];
      const members = store.awia_virtual_staff_members ?? [];
      const roles = store.awia_staff_role_assignments ?? [];
      const buckets = { inbox: [], pending: [], approval: [], outbox: [], archived: [] };
      for (const item of items) buckets[classifyWorkdeskItem(item, drafts, deliveries)].push(item);

      const rows = buckets[activeTab] ?? [];
      const columns = isAwia
        ? [
            { key: "item", label: "Item", render: (r) => r.assignment_summary ?? r.id },
            { key: "assigned_to", label: "Assigned To", render: (r) => {
                const member = members.find((m) => m.agent_code === r.staff_code);
                const assignment = roles.find((role) => role.staff_code === r.staff_code);
                return jobTitleForRoleAssignment(assignment, member) + (member?.display_name ? ` (${escapeHtml(member.display_name)})` : "");
              } },
            { key: "output", label: "Output", render: (r) => {
                const draft = drafts.find((d) => d.workdesk_item_id === r.id);
                if (!draft) return "—";
                const payloadPreview = summarizeOutputPayload(draft.output_payload);
                const summary = escapeHtml(draft.output_summary ?? "—");
                return payloadPreview ? `${summary}<br><span class="field-note">${escapeHtml(payloadPreview)}</span>` : summary;
              } },
            { key: "status", label: "Status", render: (r) => {
                const draft = drafts.find((d) => d.workdesk_item_id === r.id);
                return statusPill(workdeskStatusLabel(r, draft));
              } },
            { key: "assigned_at", label: "Assigned", render: (r) => fmtDate(r.assigned_at) },
          ]
        : [
            { key: "title", label: "Item", render: (r) => r.title ?? r.description ?? r.id },
            { key: "client", label: "Client", render: (r) => r.client_name ?? r.client_id ?? "—" },
            { key: "status", label: "Status", render: (r) => statusPill(r.status ?? activeTab) },
            { key: "due", label: "Due", render: (r) => fmtDate(r.due_at ?? r.due_date) },
          ];
      const body = table(columns, rows, (r) => r.id);

      root.innerHTML = `
        ${tabBar(WORKDESK_TABS.map((t) => ({ ...t, count: buckets[t.id].length })), activeTab, "tab")}
        ${panel(WORKDESK_TABS.find((t) => t.id === activeTab).label, body)}
      `;
    } catch (err) {
      root.innerHTML = errorBox(err, "workdesk");
    }
  }

  root.addEventListener("click", (event) => {
    const tabBtn = event.target.closest("button[data-tab]");
    if (tabBtn) {
      activeTab = tabBtn.dataset.tab;
      render();
    }
  });

  await render();
}

// ---------------------------------------------------------------- Sales
export async function mountSales(root) {
  await withStore(root, (store) => `
    ${panel("Clients", inspector(store.clients ?? []))}
    ${panel("Proposals", inspector(store.proposals ?? []))}
    ${panel("Front desk enquiries", inspector(store.front_desk_enquiries ?? []))}
  `);
}

// ---------------------------------------------------------------- Projects
export async function mountProjects(root) {
  await withStore(root, (store) => panel("Projects", inspector(store.projects ?? [])));
}

// ---------------------------------------------------------------- Finance
export async function mountFinance(root) {
  root.innerHTML = loading();
  // Cross-tenant leak fix (2026-09-21): see api.js's scopeStoreToCurrentFirm().
  const [cash, storeResult] = await Promise.allSettled([api.getCashSnapshot(), api.getStore()]);
  const scopedStore = storeResult.status === "fulfilled" ? scopeStoreToCurrentFirm(storeResult.value) : null;
  const invoices = scopedStore?.invoices ?? [];
  const expenses = scopedStore?.expenses ?? [];
  root.innerHTML = `
    ${panel("Cash snapshot", cash.status === "fulfilled" ? inspector(cash.value) : errorBox(cash.reason, "cash snapshot"))}
    ${panel("Invoices", inspector(invoices))}
    ${panel("Expenses", inspector(expenses))}
  `;
}

// ---------------------------------------------------------------- Firm Settings
export async function mountFirmSettings(root) {
  root.innerHTML = loading();
  const [auth, workspace] = await Promise.allSettled([api.getAuthContext(), api.getWorkspaceSummary()]);
  root.innerHTML = `
    ${panel("Auth context", auth.status === "fulfilled" ? inspector(auth.value) : errorBox(auth.reason, "auth context"))}
    ${panel("Workspace", workspace.status === "fulfilled" ? inspector(workspace.value) : errorBox(workspace.reason, "workspace summary"))}
  `;
}

export const OWNER_PAGES = {
  dashboard: mountDashboard,
  team: mountTeam,
  workdesk: mountWorkdesk,
  sales: mountSales,
  projects: mountProjects,
  finance: mountFinance,
  "firm-settings": mountFirmSettings,
};
