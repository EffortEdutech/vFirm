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

import { api, HIREABLE_ROLES, AWIA_HIRE_PACKAGE_CODE } from "./api.js";
import { panel, table, statRow, tabBar, statusPill, empty, errorBox, inspector, fmtDate, escapeHtml } from "./ui.js";

function loading() {
  return `<div class="empty">Loading&hellip;</div>`;
}

async function withStore(root, render) {
  root.innerHTML = loading();
  try {
    const store = await api.getStore();
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
    const [store, packageResult] = await Promise.all([api.getStore(), api.getFirmPackageAssignment()]);
    const workers = store.awia_virtual_staff_members ?? [];
    const roles = store.awia_staff_role_assignments ?? [];
    const hasPackage = Boolean(packageResult?.assignment);

    const rows = workers.map((w) => {
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
        ` },
      ],
      rows,
      (r) => r.staff_code
    );

    const hirePanel = hasPackage
      ? panel("Hire a worker", `
          <p class="field-note">HireMe package active — choose a position to add to this firm's team.</p>
          <div class="role-cards">
            ${HIREABLE_ROLES.map((role) => `
              <div class="role-card">
                <div class="role-card-title">${escapeHtml(role.role_name)}</div>
                <div class="field-note">${escapeHtml(role.default_staff_grade)}</div>
                <button class="btn-sm" data-action="hire" data-role-code="${escapeHtml(role.role_code)}" data-job-title="${escapeHtml(role.role_name)}" type="button">Hire</button>
              </div>
            `).join("")}
          </div>
        `)
      : panel("Hire a worker", `
          ${empty("This firm has no AWIA commercial package assigned yet. Enable hiring to choose from the role catalogue.")}
          <button class="btn-sm" data-action="enable-hiring" type="button">Enable hiring (HireMe)</button>
        `);

    root.innerHTML = `
      ${statRow([
        { value: workers.length, label: "Total hired" },
        { value: workers.filter((w) => w.lifecycle_status === "ACTIVE").length, label: "Active" },
        { value: workers.filter((w) => w.lifecycle_status === "PAUSED").length, label: "Paused" },
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
    try {
      if (action === "pause") await api.updateStaffLifecycle({ staff_code: btn.dataset.staffCode, to_state: "PAUSED" });
      if (action === "activate") await api.updateStaffLifecycle({ staff_code: btn.dataset.staffCode, to_state: "ACTIVE" });
      if (action === "hire") await api.hireWorker({ role_code: btn.dataset.roleCode, display_name: btn.dataset.jobTitle });
      if (action === "enable-hiring") await api.enableHiring({ package_code: AWIA_HIRE_PACKAGE_CODE });
      await mountTeam(root);
    } catch (err) {
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

// Compact preview of a real output_payload (e.g. ARO-01's triage result:
// {category, priority, routed_to, ...}) so the firm owner sees the actual
// skill output at a glance, not just a summary string. Generic by design --
// falls back to the first few keys for any future skill's payload shape
// rather than hardcoding ARO-01's fields only.
function summarizeOutputPayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (payload.category && payload.priority && payload.routed_to) {
    return `${payload.category} · ${payload.priority} → ${payload.routed_to}`;
  }
  const keys = Object.keys(payload).slice(0, 3);
  if (!keys.length) return null;
  return keys.map((k) => `${k}: ${payload[k]}`).join(", ");
}

export async function mountWorkdesk(root) {
  let activeTab = "inbox";

  async function render() {
    root.innerHTML = loading();
    try {
      const store = await api.getStore();
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
            { key: "status", label: "Status", render: (r) => statusPill(r.workdesk_status ?? activeTab) },
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
  const [cash, storeResult] = await Promise.allSettled([api.getCashSnapshot(), api.getStore()]);
  const invoices = storeResult.status === "fulfilled" ? storeResult.value.invoices ?? [] : [];
  const expenses = storeResult.status === "fulfilled" ? storeResult.value.expenses ?? [] : [];
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
