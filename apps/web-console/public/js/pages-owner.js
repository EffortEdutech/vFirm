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

import { api, HIREABLE_ROLES, AWIA_HIRE_PACKAGE_CODE, scopeStoreToCurrentFirm, clearCache } from "./api.js";
import { panel, table, statRow, tabBar, statusPill, empty, errorBox, inspector, fmtDate, escapeHtml } from "./ui.js";
// ADR-090 W2 (F1): the owner's "+ New request" drawer and worker-eligibility helper.
import { openNewRequestDrawer, workerFitsType, skillFieldHtml, readSkillFields } from "./request-drawer.js";

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
// ADR-093 W4 (F5): "Needs you" -- what is waiting on the owner right now, each tile one click
// from the Workdesk tab where it can be acted on. Computed from the firm-scoped store.
export function needsYouTiles(store) {
  const items = store?.awia_staff_workdesk_items ?? [];
  const drafts = store?.awia_staff_output_drafts ?? [];
  const requests = store?.work_requests ?? [];
  const draftFor = (item) => drafts.find((d) => d.id === item.output_draft_id);
  const classAPending = (item) => item.workdesk_status === "OUTPUT_DRAFTED" && draftFor(item)?.class_a_approval_required && draftFor(item)?.class_a_approval_status === "PENDING";
  const itemFor = (req) => items.find((i) => i.id === req.workdesk_item_id);
  const closed = new Set(["ARCHIVED_SENT", "ARCHIVED_DISMISSED", "ARCHIVED_COMPLETED"]);
  const nowMs = Date.now();
  const overdue = requests.filter((r) => r.due_at && Date.parse(r.due_at) < nowMs && (r.status === "SUBMITTED" || (r.status === "ASSIGNED" && !closed.has(itemFor(r)?.workdesk_status))));
  return [
    { key: "questions", label: "Questions from your team", count: items.filter((i) => i.workdesk_status === "NEEDS_INFO").length, tab: "inbox", urgent: true },
    { key: "inbox", label: "New requests to assign", count: requests.filter((r) => r.status === "SUBMITTED").length, tab: "inbox" },
    { key: "approval", label: "Drafts to review", count: items.filter((i) => ["OUTPUT_DRAFTED", "REVIEW_ACTION_REQUIRED"].includes(i.workdesk_status) && !classAPending(i)).length, tab: "approval" },
    { key: "classa", label: "Class A approvals", count: items.filter(classAPending).length, tab: "approval", urgent: true },
    { key: "outbox", label: "Ready to send or file", count: items.filter((i) => ["REVIEWED_FOR_CLIENT_DRAFT", "CLIENT_DELIVERY_DRAFT_PREPARED"].includes(i.workdesk_status)).length, tab: "outbox" },
    { key: "overdue", label: "Past due date", count: overdue.length, tab: "pending", urgent: true },
  ];
}

// CE-S3: BizKick signals appended to the tray (kept separate so needsYouTiles stays store-only).
const BIZKICK_SIGNAL_TILES = [
  ["expiring_quotations", "Quotations expiring soon", "bizkick-transactions", true],
  ["overdue_invoices", "Overdue invoices", "bizkick-transactions", true],
  ["conflicts", "BizKick conflicts to decide", "bizkick-conflicts", true],
  ["missing_links", "Transactions with a missing link", "bizkick-chains", false],
  ["duplicates", "Duplicate transactions", "bizkick-transactions", false],
];
export function bizkickSignalTiles(signals) {
  return BIZKICK_SIGNAL_TILES.map(([key, label, page, urgent]) => ({ key: `bk_${key}`, label, count: signals?.signals?.[key]?.count ?? 0, page, urgent }));
}
function bizkickTrayPanel(signals) {
  if (!signals?.connected) return "";
  const tiles = bizkickSignalTiles(signals);
  if (!tiles.some((t) => t.count)) return "";
  return panel("Needs you — BizKick", `<div class="ny-grid">${tiles.map((t) => `<button class="ny-tile${t.count ? (t.urgent ? " ny-urgent" : " ny-active") : ""}" type="button" data-nav-page="${escapeHtml(t.page)}" ${t.count ? "" : "disabled"}><span class="ny-count">${t.count}</span><span class="ny-label">${escapeHtml(t.label)}</span></button>`).join("")}</div>`);
}

function needsYouPanel(tiles) {
  const total = tiles.reduce((sum, t) => sum + t.count, 0);
  const body = total
    ? `<div class="ny-grid">${tiles.map((t) => `<button class="ny-tile${t.count ? (t.urgent ? " ny-urgent" : " ny-active") : ""}" type="button" data-nav-page="workdesk" data-nav-tab="${escapeHtml(t.tab)}" ${t.count ? "" : "disabled"}><span class="ny-count">${t.count}</span><span class="ny-label">${escapeHtml(t.label)}</span></button>`).join("")}</div>`
    : `<div class="empty">Nothing is waiting on you. Use <strong>+ New request</strong> to give your firm work.</div>`;
  return panel("Needs you", body);
}

export async function mountDashboard(root) {
  root.innerHTML = loading();
  // ADR-093 W4 (F5): tiles navigate through the shell (main.js listens for vfirm:navigate).
  root.addEventListener("click", (event) => {
    const tile = event.target.closest("button[data-nav-page]");
    if (tile) window.dispatchEvent(new CustomEvent("vfirm:navigate", { detail: { page: tile.dataset.navPage, tab: tile.dataset.navTab } }));
  });
  try {
    const [dashboard, rawStore, bkSignals] = await Promise.all([api.getDashboardSummary(), api.getStore().catch(() => null), api.getEdcsSignals().catch(() => null)]);
    const tray = (rawStore ? needsYouPanel(needsYouTiles(scopeStoreToCurrentFirm(rawStore))) : "") + bizkickTrayPanel(bkSignals);
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
      ${tray}
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
    const [rawStore, packageResult, requestTypes] = await Promise.all([api.getStore(), api.getFirmPackageAssignment(), api.getRequestTypes().catch(() => [])]);
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
          ${r.status === "active" ? `<button class="btn-sm btn-give" data-action="give-work" data-staff-code="${escapeHtml(r.staff_code)}" type="button">Give work</button>` : ""}
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

    // ADR-093 W4 (F4): what each active worker can be asked to do (the request types that fit
    // their position), and which of those they work out automatically from your files.
    const capabilityRows = activeWorkers.filter((w) => w.lifecycle_status === "ACTIVE").map((w) => {
      const assignment = roles.find((r) => r.staff_code === w.agent_code);
      const types = requestTypes.filter((t) => workerFitsType(w, assignment, t));
      return `<div class="cap-row"><div class="cap-who"><strong>${escapeHtml(jobTitleForRoleAssignment(assignment, w))}</strong>${w.display_name && w.display_name !== jobTitleForRoleAssignment(assignment, w) ? `<span class="wd-sub">${escapeHtml(w.display_name)}</span>` : ""}</div>
        <ul class="cap-list">${types.length ? types.map((t) => `<li>${escapeHtml(t.label)}${t.runnable ? ` <span class="cap-tag cap-auto" title="Works it out from your files and gives you a draft">runs automatically</span>` : ""}${t.class_a ? ` <span class="cap-tag cap-classa">Class A</span>` : ""}</li>`).join("") : `<li class="wd-sub">No request types for this position yet.</li>`}</ul></div>`;
    }).join("");
    const capabilityPanel = capabilityRows ? panel("What your team can do", capabilityRows) : "";

    root.innerHTML = `
      ${statRow([
        { value: activeWorkers.length, label: "Total hired" },
        { value: activeWorkers.filter((w) => w.lifecycle_status === "ACTIVE").length, label: "Active" },
        { value: activeWorkers.filter((w) => w.lifecycle_status === "PAUSED").length, label: "Paused" },
        { value: retiredCount, label: "Retired" },
      ])}
      ${panel("Your team", rosterBody)}
      ${capabilityPanel}
      ${hirePanel}
    `;
  } catch (err) {
    root.innerHTML = errorBox(err, "your team");
    return;
  }

  // Bind once per mount container: mountTeam() re-renders into the same root after every action,
  // and binding again each time made one click run the action several times (ADR-093 W4 fix).
  if (root.__teamBound) return;
  root.__teamBound = true;
  root.addEventListener("click", async (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    // ADR-093 W4 (F4): "Give work" opens the New Request form for this worker.
    if (action === "give-work") {
      openNewRequestDrawer({ presetWorker: btn.dataset.staffCode, onCreated: (result) => window.dispatchEvent(new CustomEvent("vfirm:navigate", { detail: { page: "workdesk", tab: result?.workdesk_item ? "pending" : "inbox" } })) });
      return;
    }
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
  // ADR-089 W1 (F2, 2026-09-30): the Workdesk is now actionable end to end, wiring the governed
  // endpoints that api.js already exposed but nothing called (assign, get draft, review, Class A
  // approval, client delivery, mark sent, archive) plus real file inputs/outputs (B1). No new
  // decision path or authority: every button calls an existing server-gated route, and the
  // server still enforces the authority gate, human review, Class A approval and draft-only
  // boundaries. Listeners are bound once on `root`; render() only swaps innerHTML.
  // ADR-090 W2: land on the tab the owner's new request went to (set by main.js).
  let activeTab = window.__vfirmWorkdeskTab ?? "inbox";
  delete window.__vfirmWorkdeskTab;
  let ctx = null;
  const openForms = new Set(); // row keys whose inline form is expanded

  async function load() {
    // Cross-tenant leak fix (2026-09-21): see api.js's scopeStoreToCurrentFirm().
    const [rawStore, requestTypes] = await Promise.all([api.getStore(), api.getRequestTypes().catch(() => [])]);
    const store = scopeStoreToCurrentFirm(rawStore);
    const items = store.awia_staff_workdesk_items ?? [];
    // ADR-090 W2 (B2): the owner's work requests -- SUBMITTED ones are the Inbox.
    const workRequests = store.work_requests ?? [];
    const PRIORITY_ORDER = { HIGH: 0, NORMAL: 1, LOW: 2 };
    const inboxRequests = workRequests.filter((r) => r.status === "SUBMITTED").sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1) || String(a.created_at).localeCompare(String(b.created_at)));
    const cancelledRequests = workRequests.filter((r) => r.status === "CANCELLED");
    const tasks = store.tasks ?? [];
    const drafts = store.awia_staff_output_drafts ?? [];
    const deliveries = store.awia_client_delivery_drafts ?? [];
    const members = store.awia_virtual_staff_members ?? [];
    const roles = store.awia_staff_role_assignments ?? [];
    const files = store.file_objects ?? [];
    const projects = store.projects ?? [];
    const relationships = store.firm_client_relationships ?? [];
    const clients = store.clients ?? [];
    // Inbox = real tasks no hired worker has been given yet (same rule as apps/web's Workdesk),
    // plus any workdesk item the server buckets as "inbox".
    const openTasks = tasks.filter((task) => !items.some((item) => item.task_id === task.id) && !["COMPLETED", "CANCELLED"].includes(String(task.state ?? "").toUpperCase()) && !String(task.input_ref ?? "").startsWith("work-request:"));
    const buckets = { inbox: [], pending: [], approval: [], outbox: [], archived: [] };
    for (const item of items) buckets[item.display_status ?? classifyWorkdeskItem(item, drafts, deliveries)].push(item);
    // ADR-093 W4 (B6): each item's conversation, and items where the worker is waiting on the owner.
    const messages = [...(store.awia_staff_conversation_messages ?? [])].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    const questions = buckets.inbox.filter((item) => item.workdesk_status === "NEEDS_INFO");
    buckets.inbox = buckets.inbox.filter((item) => item.workdesk_status !== "NEEDS_INFO");
    const documents = store.document_register_entries ?? [];
    ctx = { store, items, tasks, drafts, deliveries, members, roles, files, projects, relationships, clients, openTasks, buckets, workRequests, inboxRequests, cancelledRequests, requestTypes, messages, questions, documents };
  }

  const memberFor = (staffCode) => ctx.members.find((m) => m.agent_code === staffCode);
  const roleFor = (staffCode) => ctx.roles.find((r) => r.staff_code === staffCode);
  const taskFor = (taskId) => ctx.tasks.find((t) => t.id === taskId);
  const latestDraftFor = (item) => ctx.drafts.find((d) => d.id === item.output_draft_id) ?? [...ctx.drafts].reverse().find((d) => d.workdesk_item_id === item.id);
  const deliveryFor = (item) => [...ctx.deliveries].reverse().find((d) => d.workdesk_item_id === item.id);
  function clientIdForProject(projectId) {
    const project = ctx.projects.find((p) => p.id === projectId);
    const relationship = ctx.relationships.find((r) => r.id === project?.relationship_id);
    return relationship?.client_id ?? null;
  }
  function clientNameForProject(projectId) {
    const clientId = clientIdForProject(projectId);
    const client = ctx.clients.find((c) => c.id === clientId);
    return client?.name ?? client?.display_name ?? client?.legal_name ?? null;
  }
  function workerLabel(staffCode) {
    const member = memberFor(staffCode);
    const title = jobTitleForRoleAssignment(roleFor(staffCode), member);
    return escapeHtml(title) + (member?.display_name && member.display_name !== title ? ` (${escapeHtml(member.display_name)})` : "");
  }
  function taskLabel(task) {
    if (!task) return "—";
    const project = ctx.projects.find((p) => p.id === task.project_id);
    const projectName = project?.project_name ?? project?.name;
    return `${escapeHtml(humanize(task.task_type ?? "task"))}${projectName ? `<div class="wd-sub">${escapeHtml(projectName)}</div>` : ""}`;
  }
  // "file:<id>" refs render as download chips; any other (free-text) ref renders as plain text.
  function refsHtml(refs) {
    const list = (Array.isArray(refs) ? refs : []).map((ref) => {
      if (typeof ref === "string" && ref.startsWith("file:")) {
        const file = ctx.files.find((f) => f.id === ref.slice(5));
        return file ? fileChip(file) : `<span class="wd-sub">file unavailable</span>`;
      }
      // ADR-092 W3: the request link reads as its number, not a raw id.
      if (typeof ref === "string" && ref.startsWith("work-request:")) {
        const req = requestFor(ref.slice("work-request:".length));
        return `<span class="wd-sub">Request ${escapeHtml(req?.request_number ?? "")}</span>`;
      }
      return `<span class="wd-sub">${escapeHtml(ref)}</span>`;
    });
    return list.length ? `<div class="wd-files">${list.join("")}</div>` : `<span class="wd-sub">No inputs attached</span>`;
  }
  function fileChip(file) {
    return `<button class="wd-file" type="button" data-wd="download" data-file-id="${escapeHtml(file.id)}" data-filename="${escapeHtml(file.filename)}" title="SHA-256 ${escapeHtml(file.sha256)}">&#8595; ${escapeHtml(file.filename)} <span class="wd-sub">${formatBytes(file.size_bytes)}</span></button>`;
  }
  function outputHtml(draft) {
    if (!draft) return "—";
    const preview = summarizeOutputPayload(draft.output_payload);
    const file = draft.output_file_id ? ctx.files.find((f) => f.id === draft.output_file_id) : null;
    // ADR-092 W3: say how the draft was made -- by the worker's skill on which inputs, or attached by the owner.
    const gen = draft.generation;
    const how = gen?.method === "DETERMINISTIC_SKILL_MODULE"
      ? `<div class="wd-gen" title="${escapeHtml((gen.input_notes ?? []).join(" "))}">Worked out by ${escapeHtml(gen.skill_id)}${gen.input_files?.length ? ` from ${escapeHtml(gen.input_files.map((f) => f.filename).join(", "))}` : ""}</div>`
      : (draft.output_file_id ? `<div class="wd-gen">Attached by you</div>` : "");
    return `${escapeHtml(draft.output_summary ?? "—")}${draft.revision_number > 1 ? ` <span class="wd-sub">(revision ${draft.revision_number})</span>` : ""}${preview && !gen ? `<br><span class="wd-sub">${escapeHtml(preview)}</span>` : ""}${how}${file ? `<div class="wd-files">${fileChip(file)}</div>` : ""}`;
  }

  // ---- ADR-090 W2: work request rows (Inbox) ----
  const requestFor = (id) => ctx.workRequests.find((r) => r.id === id);
  function scopeLabel(req) {
    if (req.risk_class === "INTERNAL" || !req.project_id) return `<span class="wd-internal">Firm (internal)</span>`;
    const project = ctx.projects.find((p) => p.id === req.project_id);
    return `${escapeHtml(clientNameForProject(req.project_id) ?? "Client")}<span class="wd-sub">${escapeHtml(project?.project_name ?? project?.name ?? "")}</span>`;
  }
  function requestSummary(req) {
    const due = req.due_at ? ` · due ${escapeHtml(fmtDate(req.due_at))}` : "";
    const suggestion = req.triage_suggestion?.suggested_position_id
      ? `<span class="wd-sub" title="${escapeHtml(req.triage_suggestion.rationale ?? "")}">Clerk's suggestion: ${escapeHtml(humanize(req.triage_suggestion.suggested_position_id))}</span>`
      : "";
    return `<div class="wd-req-title"><span class="wd-num">${escapeHtml(req.request_number ?? "")}</span> ${escapeHtml(req.title)}</div>
      ${req.source?.type === "BIZKICK_RULE" ? `<span class="wd-sub" title="${escapeHtml(req.source.reason ?? "")}">From BizKick: ${escapeHtml(req.source.transaction_id)}</span>` : ""}
      <span class="wd-sub">${escapeHtml(req.request_type_label ?? humanize(req.request_type_id))}${req.class_a ? " · Class A" : ""}${due}</span>
      ${req.instructions ? `<div class="wd-instructions">${escapeHtml(req.instructions)}</div>` : ""}
      ${suggestion}
      ${req.last_assignment_error ? `<div class="wd-error">Last assignment refused: ${escapeHtml(req.last_assignment_error)}</div>` : ""}`;
  }
  function requestInputs(req) {
    return refsHtml([...(req.file_ids ?? []).map((id) => `file:${id}`), ...(req.references ?? [])]);
  }
  function requestActions(req) {
    const type = ctx.requestTypes.find((t) => t.id === req.request_type_id);
    const workers = ctx.members.filter((m) => m.lifecycle_status === "ACTIVE" && workerFitsType(m, roleFor(m.agent_code), type));
    const suggested = workers.find((m) => m.position_id && m.position_id === req.triage_suggestion?.suggested_position_id) ?? workers[0];
    const assign = workers.length
      ? `<select data-assign-for="${escapeHtml(req.id)}">${workers.map((m) => `<option value="${escapeHtml(m.agent_code)}" ${m === suggested ? "selected" : ""}>${workerLabel(m.agent_code)}</option>`).join("")}</select>
         <button class="btn btn-primary btn-sm" type="button" data-wd="assign-request" data-request-id="${escapeHtml(req.id)}">Assign</button>`
      : `<span class="wd-sub">No active worker can take this yet — hire one in My Team.</span>`;
    return `<div class="wd-actions">${assign}</div>
      <div class="wd-actions">${addFilesControl("request", req.id)}<button class="btn btn-ghost btn-sm" type="button" data-wd="cancel-request" data-request-id="${escapeHtml(req.id)}">Cancel</button></div>`;
  }
  function addFilesControl(kind, requestId) {
    const key = `addfiles:${requestId}`;
    if (!openForms.has(key)) return `<button class="btn btn-ghost btn-sm" type="button" data-wd="open-form" data-key="${escapeHtml(key)}">Add files&hellip;</button>`;
    // ADR-092 W3: for runnable work, say which input the file is (a new file replaces the old one in that slot).
    const slots = typeForRequest(requestFor(requestId))?.file_slots ?? [];
    const slotSelect = slots.length ? `<label>This file is<select name="file_role"><option value="">Something else</option>${slots.map((slot) => `<option value="${escapeHtml(slot.role)}">${escapeHtml(slot.label)}</option>`).join("")}</select></label>` : "";
    return `<form class="wd-form" data-wd-form="add-files" data-request-id="${escapeHtml(requestId)}">
        <label>Files<input type="file" name="files" multiple required accept="${FILE_ACCEPT}"></label>${slotSelect}
        <label>File sensitivity<select name="classification">${FILE_CLASSIFICATION_OPTIONS}</select></label>
        <div class="wd-actions"><button class="btn btn-primary btn-sm" type="submit">Add</button><button class="btn btn-ghost btn-sm" type="button" data-wd="close-form" data-key="${escapeHtml(key)}">Cancel</button></div>
      </form>`;
  }

  function assignForm(task) {
    const key = `task:${task.id}`;
    if (!openForms.has(key)) return `<button class="btn btn-primary btn-sm" type="button" data-wd="open-form" data-key="${escapeHtml(key)}">Assign&hellip;</button>`;
    const active = ctx.members.filter((m) => m.lifecycle_status === "ACTIVE");
    if (!active.length) return `<span class="wd-sub">Hire and activate a worker in My Team first.</span>`;
    const firstRole = roleFor(active[0].agent_code)?.role_code;
    return `
      <form class="wd-form" data-wd-form="assign" data-task-id="${escapeHtml(task.id)}">
        <label>Worker<select name="staff_code" data-wd="worker-select" required>${active.map((m) => `<option value="${escapeHtml(m.agent_code)}">${workerLabel(m.agent_code)}</option>`).join("")}</select></label>
        <label>What should they do<select name="tool" required>${actionOptions(firstRole)}</select></label>
        <label>Instructions<textarea name="assignment_summary" rows="2" placeholder="e.g. Reconcile the September bank statement against our books"></textarea></label>
        <label>Input files<input type="file" name="files" multiple accept="${FILE_ACCEPT}"></label>
        <label>File sensitivity<select name="classification">${FILE_CLASSIFICATION_OPTIONS}</select></label>
        <label>Other reference (optional)<input type="text" name="reference" placeholder="e.g. client email of 28 Sep"></label>
        <p class="field-note">At least one input file or reference is required — the authority gate refuses work with no evidence.</p>
        <div class="wd-actions"><button class="btn btn-primary btn-sm" type="submit">Assign</button><button class="btn btn-ghost btn-sm" type="button" data-wd="close-form" data-key="${escapeHtml(key)}">Cancel</button></div>
      </form>`;
  }

  const typeForRequest = (req) => (req ? ctx.requestTypes.find((t) => t.id === req.request_type_id) : null);

  const WITH_WORKER = new Set(["ASSIGNED", "REWORK", "NEEDS_INFO"]);
  // ADR-093 W4 (B7): approved output filed in Documents -> one click to the register.
  function filedLink(item) {
    const doc = item.filed_document_id ? ctx.documents.find((d) => d.id === item.filed_document_id) : null;
    return doc ? `<div><button class="wd-link" type="button" data-wd="goto-documents">Filed as ${escapeHtml(doc.document_number)}</button></div>` : "";
  }

  // ADR-093 W4 (B6): the item's conversation -- a timeline of hand-over, questions, your replies
  // and files, drafts and review decisions -- with a reply box. Collapsed to a link by default.
  function threadControl(item) {
    const list = ctx.messages.filter((m) => m.workdesk_item_id === item.id || (item.thread_id && m.thread_id === item.thread_id));
    const key = `thread:${item.id}`;
    if (!openForms.has(key)) {
      return list.length || WITH_WORKER.has(item.workdesk_status)
        ? `<button class="wd-link" type="button" data-wd="open-form" data-key="${escapeHtml(key)}">Conversation${list.length ? ` (${list.length})` : ""}</button>`
        : "";
    }
    const lines = list.map((m) => {
      const mine = m.participant_role === "HUMAN_SUPERVISOR";
      const fileChips = (m.file_ids ?? []).map((id) => ctx.files.find((f) => f.id === id)).filter(Boolean).map(fileChip).join("");
      return `<li class="wd-msg${mine ? " wd-msg-mine" : ""}${m.kind === "NEEDS_INFO" ? " wd-msg-ask" : ""}"><span class="wd-msg-who">${mine ? "You" : workerLabel(item.staff_code)} · ${escapeHtml(fmtDate(m.created_at))}</span><span class="wd-msg-text">${escapeHtml(m.content)}</span>${fileChips ? `<div class="wd-files">${fileChips}</div>` : ""}</li>`;
    }).join("");
    const canAttach = WITH_WORKER.has(item.workdesk_status);
    return `<div class="wd-thread">
        <ol class="wd-msgs">${lines || `<li class="wd-sub">No messages yet.</li>`}</ol>
        <form class="wd-form wd-reply" data-wd-form="reply" data-item-id="${escapeHtml(item.id)}">
          <textarea name="content" rows="2" placeholder="${item.workdesk_status === "NEEDS_INFO" ? "Answer the question, or add what's missing" : "Write a note on this work"}"></textarea>
          ${canAttach ? `<label>Files (optional)<input type="file" name="files" multiple accept="${FILE_ACCEPT}"></label>` : ""}
          <div class="wd-actions"><button class="btn btn-primary btn-sm" type="submit">Send</button><button class="btn btn-ghost btn-sm" type="button" data-wd="close-form" data-key="${escapeHtml(key)}">Close</button></div>
        </form>
      </div>`;
  }

  // Inbox: the worker is waiting on you (NEEDS_INFO). Fix the inputs, add files or reply, then
  // ask them to try again.
  function questionActions(item) {
    const req = item.work_request_id ? requestFor(item.work_request_id) : null;
    const type = typeForRequest(req);
    const retry = req && type?.runnable ? `<button class="btn btn-primary btn-sm" type="button" data-wd="run-skill" data-item-id="${escapeHtml(item.id)}">Try again (${escapeHtml(type.run_label)})</button>` : "";
    return `<div class="wd-actions">${retry}${req ? editInputsForm(item, req, type) : ""}</div>
      <div class="wd-actions">${req ? addFilesControl("item", req.id) : ""}<button class="btn btn-ghost btn-sm" type="button" data-wd="archive" data-item-id="${escapeHtml(item.id)}">Dismiss</button></div>`;
  }

  // ADR-092 W3: inputs the skill will read, shown with the item so the owner can check them.
  function skillInputsSummary(req, type) {
    if (!req || !type?.runnable || !type.input_fields.length) return "";
    const values = req.form_inputs ?? {};
    const parts = type.input_fields.filter((f) => values[f.name] !== undefined && values[f.name] !== "").map((f) => {
      const v = values[f.name];
      const shown = f.type === "boolean" ? (v ? "yes" : "no") : f.type === "multiselect" ? `${v.length} of ${f.options.length}` : f.type === "select" ? (f.options.find((o) => o.value === v)?.label ?? v) : v;
      return `${escapeHtml(f.label.replace(/\s*\(.*\)$/, "").replace(/\?$/, ""))}: ${escapeHtml(String(shown))}`;
    });
    return parts.length ? `<div class="wd-sub">${parts.join(" · ")}</div>` : "";
  }

  function editInputsForm(item, req, type) {
    const key = `inputs:${item.id}`;
    if (!type?.runnable || !type.input_fields.length) return "";
    if (!openForms.has(key)) return `<button class="btn btn-ghost btn-sm" type="button" data-wd="open-form" data-key="${escapeHtml(key)}">Edit inputs&hellip;</button>`;
    return `<form class="wd-form" data-wd-form="edit-inputs" data-request-id="${escapeHtml(req.id)}" data-item-id="${escapeHtml(item.id)}">
        ${type.input_fields.map((field) => skillFieldHtml(field, (req.form_inputs ?? {})[field.name])).join("")}
        <div class="wd-actions"><button class="btn btn-primary btn-sm" type="submit">Save inputs</button><button class="btn btn-ghost btn-sm" type="button" data-wd="close-form" data-key="${escapeHtml(key)}">Cancel</button></div>
      </form>`;
  }

  function pendingActions(item) {
    const key = `attach:${item.id}`;
    const attach = openForms.has(key)
      ? `<form class="wd-form" data-wd-form="attach-output" data-item-id="${escapeHtml(item.id)}">
           <label>Output file<input type="file" name="file" required accept="${FILE_ACCEPT}"></label>
           <label>Summary<input type="text" name="output_summary" placeholder="What this file is"></label>
           <div class="wd-actions"><button class="btn btn-primary btn-sm" type="submit">Submit as draft</button><button class="btn btn-ghost btn-sm" type="button" data-wd="close-form" data-key="${escapeHtml(key)}">Cancel</button></div>
         </form>`
      : `<button class="btn btn-ghost btn-sm" type="button" data-wd="open-form" data-key="${escapeHtml(key)}" title="For work this worker cannot produce automatically yet: attach the finished file yourself; it still goes through review.">Attach output file&hellip;</button>`;
    const req = item.work_request_id ? requestFor(item.work_request_id) : null;
    const type = typeForRequest(req);
    const needs = item.last_run_error ? `<div class="wd-error">Needs input: ${escapeHtml(item.last_run_error)}</div>` : "";
    // Work given through a request: run the worker's skill if it has one; otherwise the owner
    // attaches the finished file (no empty placeholder drafts -- ADR-092 W3).
    if (req && type?.runnable) {
      return `${needs}<div class="wd-actions"><button class="btn btn-primary btn-sm" type="button" data-wd="run-skill" data-item-id="${escapeHtml(item.id)}" title="Your worker processes the request's inputs now and hands you a draft to review.">${escapeHtml(type.run_label)}</button>${editInputsForm(item, req, type)}${attach}</div>`;
    }
    if (req) return `<div class="wd-actions">${attach}</div>`;
    return `<div class="wd-actions"><button class="btn btn-primary btn-sm" type="button" data-wd="produce" data-item-id="${escapeHtml(item.id)}">Get their draft</button>${attach}</div>`;
  }

  function approvalActions(item, draft) {
    if (!draft) return "—";
    if (item.workdesk_status === "REVIEW_ACTION_REQUIRED") {
      return `<div class="wd-actions"><button class="btn btn-ghost btn-sm" type="button" data-wd="archive" data-item-id="${escapeHtml(item.id)}">Dismiss to archive</button></div>`;
    }
    if (draft.class_a_approval_required && draft.class_a_approval_status === "PENDING") {
      return `<p class="field-note">Class A action — your owner approval is required before ordinary review.</p>
        <div class="wd-actions"><button class="btn btn-primary btn-sm" type="button" data-wd="class-a" data-draft-id="${escapeHtml(draft.id)}">Grant Class A approval</button>
        <button class="btn btn-ghost btn-sm" type="button" data-wd="review" data-decision="REVISION_REQUIRED" data-draft-id="${escapeHtml(draft.id)}">Request revision</button>
        <button class="btn btn-ghost btn-sm" type="button" data-wd="review" data-decision="REJECTED" data-draft-id="${escapeHtml(draft.id)}">Reject</button></div>
        <label class="wd-notes">Notes<input type="text" data-notes-for="${escapeHtml(draft.id)}" placeholder="Required when requesting a revision"></label>`;
    }
    return `<div class="wd-actions"><button class="btn btn-primary btn-sm" type="button" data-wd="review" data-decision="APPROVED_FOR_CLIENT_DRAFT" data-draft-id="${escapeHtml(draft.id)}">Approve</button>
      <button class="btn btn-ghost btn-sm" type="button" data-wd="review" data-decision="REVISION_REQUIRED" data-draft-id="${escapeHtml(draft.id)}">Request revision</button>
      <button class="btn btn-ghost btn-sm" type="button" data-wd="review" data-decision="REJECTED" data-draft-id="${escapeHtml(draft.id)}">Reject</button></div>
      <label class="wd-notes">Notes<input type="text" data-notes-for="${escapeHtml(draft.id)}" placeholder="Required when requesting a revision"></label>`;
  }

  function outboxActions(item, draft, delivery) {
    // ADR-090 W2 (D2): approved INTERNAL work is filed, never sent to a client.
    if (item.risk_class === "INTERNAL" && item.workdesk_status === "REVIEWED_FOR_CLIENT_DRAFT") {
      return `<button class="btn btn-primary btn-sm" type="button" data-wd="complete-internal" data-item-id="${escapeHtml(item.id)}">Mark complete</button>`;
    }
    if (item.workdesk_status === "REVIEWED_FOR_CLIENT_DRAFT") {
      const clientId = clientIdForProject(item.project_id);
      return clientId
        ? `<button class="btn btn-primary btn-sm" type="button" data-wd="prepare" data-draft-id="${escapeHtml(draft?.id ?? "")}" data-client-id="${escapeHtml(clientId)}">Prepare for client</button>`
        : `<span class="wd-sub">No client linked to this work.</span>`;
    }
    if (delivery?.status === "CLIENT_DELIVERY_DRAFT_PREPARED") {
      return `<button class="btn btn-primary btn-sm" type="button" data-wd="mark-sent" data-delivery-id="${escapeHtml(delivery.id)}" title="Record that you sent it yourself. vFirm does not transmit to the client.">Mark sent</button>`;
    }
    return "—";
  }

  function tabBody() {
    const { buckets, openTasks } = ctx;
    if (activeTab === "inbox") {
      // ADR-090 W2: the owner's own requests first (priority order), then project tasks that were
      // opened by an accepted proposal and not yet given to anyone.
      const requestTable = ctx.inboxRequests.length
        ? table([
            { key: "req", label: "Request", render: (r) => requestSummary(r) },
            { key: "for", label: "For", render: (r) => scopeLabel(r) },
            { key: "priority", label: "Priority", render: (r) => statusPill(r.priority === "HIGH" ? "high priority" : r.priority.toLowerCase()) },
            { key: "inputs", label: "Inputs", render: (r) => requestInputs(r) },
            { key: "actions", label: "", render: (r) => requestActions(r) },
          ], ctx.inboxRequests, (r) => r.id)
        : `<div class="empty">No requests waiting. Use <strong>+ New request</strong> to give your firm work.</div>`;
      // ADR-093 W4 (B6): the worker's questions come first -- the work is stuck until you answer.
      const questionTable = ctx.questions.length
        ? `<h4 class="wd-subhead wd-subhead-first">Questions from your team</h4>` + table([
            { key: "item", label: "Work", render: (r) => `${r.work_request_id ? `<span class="wd-num">${escapeHtml(requestFor(r.work_request_id)?.request_number ?? "")}</span> ` : ""}${escapeHtml(r.assignment_summary ?? "—")}<div class="wd-sub">${workerLabel(r.staff_code)}</div>${threadControl(r)}` },
            { key: "ask", label: "What they need", render: (r) => `<div class="wd-ask">${escapeHtml(r.last_run_error ?? "They need more information — see the conversation.")}</div>` },
            { key: "inputs", label: "Inputs", render: (r) => refsHtml(r.evidence_refs) },
            { key: "actions", label: "", render: (r) => questionActions(r) },
          ], ctx.questions, (r) => r.id) + `<h4 class="wd-subhead">New requests</h4>`
        : "";
      const rows = [...openTasks.map((task) => ({ kind: "task", task })), ...buckets.inbox.map((item) => ({ kind: "item", item }))];
      if (!rows.length) return questionTable + requestTable;
      return questionTable + requestTable + `<h4 class="wd-subhead">Project tasks from accepted proposals</h4>` + table([
        { key: "task", label: "Work", render: (r) => r.kind === "task" ? taskLabel(r.task) : escapeHtml(r.item.assignment_summary ?? r.item.id) },
        { key: "client", label: "Client", render: (r) => escapeHtml((r.kind === "task" ? clientNameForProject(r.task.project_id) : clientNameForProject(r.item.project_id)) ?? "—") },
        { key: "received", label: "Received", render: (r) => fmtDate(r.kind === "task" ? r.task.created_at : r.item.assigned_at) },
        { key: "action", label: "", render: (r) => r.kind === "task" ? assignForm(r.task) : statusPill(r.item.display_status_label ?? r.item.workdesk_status) },
      ], rows, (r) => r.kind === "task" ? r.task.id : r.item.id);
    }
    if (activeTab === "pending") {
      return table([
        { key: "item", label: "Work", render: (r) => `${r.work_request_id ? `<span class="wd-num">${escapeHtml(requestFor(r.work_request_id)?.request_number ?? "")}</span> ` : ""}${escapeHtml(r.assignment_summary ?? "—")}${r.instructions ? `<div class="wd-instructions">${escapeHtml(r.instructions)}</div>` : ""}${skillInputsSummary(requestFor(r.work_request_id), typeForRequest(requestFor(r.work_request_id)))}${r.workdesk_status === "REWORK" ? `<div class="wd-rework">Revision requested${r.revision_request_notes ? `: ${escapeHtml(r.revision_request_notes)}` : ""}</div>` : ""}${threadControl(r)}` },
        { key: "worker", label: "Assigned to", render: (r) => workerLabel(r.staff_code) },
        { key: "inputs", label: "Inputs", render: (r) => refsHtml(r.evidence_refs) },
        { key: "status", label: "Status", render: (r) => statusPill(r.display_status_label ?? r.workdesk_status) },
        { key: "actions", label: "", render: (r) => pendingActions(r) + (r.work_request_id ? `<div class="wd-actions">${addFilesControl("item", r.work_request_id)}</div>` : "") },
      ], buckets.pending, (r) => r.id);
    }
    if (activeTab === "approval") {
      return table([
        { key: "item", label: "Work", render: (r) => `${r.work_request_id ? `<span class="wd-num">${escapeHtml(requestFor(r.work_request_id)?.request_number ?? "")}</span> ` : ""}${escapeHtml(r.assignment_summary ?? "—")}<div class="wd-sub">${workerLabel(r.staff_code)}</div>${threadControl(r)}` },
        { key: "inputs", label: "Inputs", render: (r) => refsHtml(r.evidence_refs) },
        { key: "output", label: "What they produced", render: (r) => outputHtml(latestDraftFor(r)) },
        { key: "status", label: "Status", render: (r) => statusPill(r.display_status_label ?? workdeskStatusLabel(r, latestDraftFor(r))) },
        { key: "actions", label: "", render: (r) => approvalActions(r, latestDraftFor(r)) },
      ], buckets.approval, (r) => r.id);
    }
    if (activeTab === "outbox") {
      return table([
        { key: "item", label: "Deliverable", render: (r) => `${outputHtml(latestDraftFor(r))}${threadControl(r)}` },
        { key: "client", label: "For", render: (r) => r.risk_class === "INTERNAL" ? `<span class="wd-internal">Firm (internal)</span>` : escapeHtml(clientNameForProject(r.project_id) ?? "—") },
        { key: "worker", label: "Prepared by", render: (r) => workerLabel(r.staff_code) },
        { key: "status", label: "Status", render: (r) => statusPill(r.risk_class === "INTERNAL" && r.workdesk_status === "REVIEWED_FOR_CLIENT_DRAFT" ? "approved" : (r.display_status_label ?? r.workdesk_status)) },
        { key: "actions", label: "", render: (r) => outboxActions(r, latestDraftFor(r), deliveryFor(r)) },
      ], buckets.outbox, (r) => r.id);
    }
    const OUTCOME = { ARCHIVED_SENT: "delivered", ARCHIVED_COMPLETED: "completed (internal)" };
    const archivedRows = [
      ...buckets.archived.map((item) => ({ kind: "item", item })),
      ...ctx.cancelledRequests.map((req) => ({ kind: "request", req })),
    ];
    return table([
      { key: "item", label: "Work", render: (r) => r.kind === "item" ? `${r.item.work_request_id ? `<span class="wd-num">${escapeHtml(requestFor(r.item.work_request_id)?.request_number ?? "")}</span> ` : ""}${escapeHtml(r.item.assignment_summary ?? "—")}` : `<span class="wd-num">${escapeHtml(r.req.request_number)}</span> ${escapeHtml(r.req.title)}` },
      { key: "output", label: "Output", render: (r) => r.kind === "item" ? `${outputHtml(latestDraftFor(r.item))}${filedLink(r.item)}${threadControl(r.item)}` : "—" },
      { key: "worker", label: "Worker", render: (r) => r.kind === "item" ? workerLabel(r.item.staff_code) : "—" },
      { key: "status", label: "Outcome", render: (r) => r.kind === "item" ? statusPill(OUTCOME[r.item.workdesk_status] ?? r.item.archived_reason ?? r.item.workdesk_status) : statusPill("cancelled") },
      { key: "when", label: "Closed", render: (r) => fmtDate(r.kind === "item" ? (r.item.archived_at ?? r.item.updated_at) : r.req.cancelled_at) },
    ], archivedRows, (r) => r.kind === "item" ? r.item.id : r.req.id);
  }

  const TAB_HELP = {
    inbox: "Waiting on you: questions from your team (answer them and the work goes back to the worker), and new work to hand out. Raise new work with + New request.",
    pending: "With your team. Press the worker's button (e.g. Reconcile) to have them process the inputs into a draft — or, for work they can't produce automatically yet, attach the finished file yourself.",
    approval: "Waiting on you. Nothing reaches a client until you approve it.",
    outbox: "Approved and on its way out. Client work: prepare the client version, download it, and mark it sent once you've sent it. Internal work: mark it complete.",
    archived: "Delivered, completed, dismissed or cancelled.",
  };

  function render() {
    const counts = {
      ...Object.fromEntries(Object.entries(ctx.buckets).map(([k, v]) => [k, v.length])),
      inbox: ctx.inboxRequests.length + ctx.openTasks.length + ctx.buckets.inbox.length,
      archived: ctx.buckets.archived.length + ctx.cancelledRequests.length,
    };
    root.innerHTML = `
      ${tabBar(WORKDESK_TABS.map((t) => ({ ...t, count: counts[t.id] })), activeTab, "tab")}
      ${panel(WORKDESK_TABS.find((t) => t.id === activeTab).label, `<p class="field-note">${escapeHtml(TAB_HELP[activeTab])}</p>${tabBody()}`)}
    `;
  }

  async function refresh(nextTab) {
    await load();
    if (nextTab) activeTab = nextTab;
    render();
  }

  // Disables every control while a command is in flight (same guardrail as My Team) and restores
  // them on failure so the page never sticks.
  async function run(button, busyLabel, action) {
    const controls = [...root.querySelectorAll("button, input, select, textarea")];
    const prior = controls.map((c) => [c, c.disabled]);
    controls.forEach((c) => { c.disabled = true; });
    const label = button?.textContent;
    if (button && busyLabel) button.textContent = busyLabel;
    try {
      await action();
    } catch (err) {
      prior.forEach(([c, d]) => { c.disabled = d; });
      if (button && busyLabel) button.textContent = label;
      alert(`Action failed: ${err.message}`);
    }
  }

  root.addEventListener("change", (event) => {
    const select = event.target.closest('select[data-wd="worker-select"]');
    if (!select) return;
    const toolSelect = select.closest("form")?.querySelector('select[name="tool"]');
    if (toolSelect) toolSelect.innerHTML = actionOptions(roleFor(select.value)?.role_code);
  });

  root.addEventListener("submit", async (event) => {
    const form = event.target.closest("form[data-wd-form]");
    if (!form) return;
    event.preventDefault();
    const fd = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    if (form.dataset.wdForm === "assign") {
      const task = taskFor(form.dataset.taskId);
      const pickedFiles = [...(form.querySelector('input[name="files"]')?.files ?? [])];
      const reference = String(fd.get("reference") ?? "").trim();
      if (!pickedFiles.length && !reference) return alert("Attach at least one input file or give a reference.");
      await run(submitBtn, "Uploading & assigning…", async () => {
        const uploaded = [];
        for (const file of pickedFiles) uploaded.push(await api.uploadFile(file, { classification: fd.get("classification"), purpose: "WORK_INPUT" }));
        const tool = String(fd.get("tool"));
        await api.assignTask({
          staff_code: fd.get("staff_code"),
          task_id: task.id,
          project_id: task.project_id,
          client_id: clientIdForProject(task.project_id),
          tool,
          action: tool,
          assignment_summary: String(fd.get("assignment_summary") ?? "").trim() || undefined,
          evidence_refs: [...uploaded.map((f) => `file:${f.id}`), ...(reference ? [reference] : [])],
        });
        openForms.delete(`task:${task.id}`);
        await refresh("pending");
      });
    }
    if (form.dataset.wdForm === "add-files") {
      const picked = [...(form.querySelector('input[name="files"]')?.files ?? [])];
      if (!picked.length) return;
      await run(submitBtn, "Uploading…", async () => {
        const uploaded = [];
        for (const file of picked) uploaded.push(await api.uploadFile(file, { classification: fd.get("classification"), purpose: "WORK_INPUT" }));
        await api.addWorkRequestFiles({ work_request_id: form.dataset.requestId, file_ids: uploaded.map((f) => f.id), file_role: String(fd.get("file_role") ?? "") || undefined });
        openForms.delete(`addfiles:${form.dataset.requestId}`);
        await refresh();
      });
    }
    if (form.dataset.wdForm === "reply") {
      const picked = [...(form.querySelector('input[name="files"]')?.files ?? [])];
      const content = String(fd.get("content") ?? "").trim();
      if (!content && !picked.length) return alert("Write a message or attach a file.");
      await run(submitBtn, "Sending…", async () => {
        const uploaded = [];
        for (const file of picked) uploaded.push(await api.uploadFile(file, { classification: "CLIENT_CONFIDENTIAL", purpose: "WORK_INPUT" }));
        await api.postItemMessage({ workdesk_item_id: form.dataset.itemId, content: content || undefined, file_ids: uploaded.map((f) => f.id) });
        await refresh();
      });
    }
    if (form.dataset.wdForm === "edit-inputs") {
      const req = requestFor(form.dataset.requestId);
      await run(submitBtn, "Saving…", async () => {
        await api.updateWorkRequestInputs({ work_request_id: req.id, form_inputs: readSkillFields(form, typeForRequest(req)) });
        openForms.delete(`inputs:${form.dataset.itemId}`);
        await refresh();
      });
    }
    if (form.dataset.wdForm === "attach-output") {
      const file = form.querySelector('input[name="file"]')?.files?.[0];
      if (!file) return;
      await run(submitBtn, "Uploading…", async () => {
        const uploaded = await api.uploadFile(file, { classification: "CLIENT_CONFIDENTIAL", purpose: "WORK_OUTPUT" });
        await api.produceOutputDraft({ workdesk_item_id: form.dataset.itemId, output_file_id: uploaded.id, output_title: uploaded.filename, output_summary: String(fd.get("output_summary") ?? "").trim() || uploaded.filename });
        openForms.delete(`attach:${form.dataset.itemId}`);
        await refresh("approval");
      });
    }
  });

  root.addEventListener("click", async (event) => {
    const tabBtn = event.target.closest("button[data-tab]");
    if (tabBtn) { activeTab = tabBtn.dataset.tab; render(); return; }
    const btn = event.target.closest("button[data-wd]");
    if (!btn) return;
    const kind = btn.dataset.wd;
    if (kind === "open-form") { openForms.add(btn.dataset.key); render(); return; }
    if (kind === "close-form") { openForms.delete(btn.dataset.key); render(); return; }
    if (kind === "download") {
      try { await api.downloadFile(btn.dataset.fileId, btn.dataset.filename); } catch (err) { alert(`Download failed: ${err.message}`); }
      return;
    }
    if (kind === "goto-documents") return window.dispatchEvent(new CustomEvent("vfirm:navigate", { detail: { page: "documents" } }));
    if (kind === "new-request") return openNewRequestDrawer({ onCreated: (result) => refresh(result?.workdesk_item ? "pending" : "inbox") });
    if (kind === "assign-request") {
      const staffCode = root.querySelector(`select[data-assign-for="${CSS.escape(btn.dataset.requestId)}"]`)?.value;
      if (!staffCode) return;
      return run(btn, "Assigning…", async () => { await api.assignWorkRequest({ work_request_id: btn.dataset.requestId, staff_code: staffCode }); await refresh("pending"); });
    }
    if (kind === "cancel-request") {
      const reason = window.prompt("Cancel this request? Optional reason:", "");
      if (reason === null) return;
      return run(btn, "Cancelling…", async () => { await api.cancelWorkRequest({ work_request_id: btn.dataset.requestId, reason: reason || undefined }); await refresh(); });
    }
    if (kind === "complete-internal") {
      if (!window.confirm("Mark this internal work complete? It will be filed in the archive.")) return;
      return run(btn, "Completing…", async () => { await api.completeInternalWork({ workdesk_item_id: btn.dataset.itemId }); await refresh("archived"); });
    }
    if (kind === "produce") return run(btn, "Working…", async () => { await api.produceOutputDraft({ workdesk_item_id: btn.dataset.itemId }); await refresh("approval"); });
    if (kind === "run-skill") return run(btn, "Working…", async () => {
      try {
        await api.runSkill({ workdesk_item_id: btn.dataset.itemId });
        await refresh("approval");
      } catch (err) {
        // Missing inputs: the reason is recorded on the item and shown in Pending -- no alert needed.
        // (A failed POST does not clear api.js's GET cache, so clear it to see the recorded reason.)
        // ADR-093 W4: the item is now waiting on you -- it moves to the Inbox with the question.
        if (err.code === "SKILL_INPUT_REQUIRED") { clearCache(); openForms.add(`thread:${btn.dataset.itemId}`); await refresh("inbox"); return; }
        throw err;
      }
    });
    if (kind === "class-a") return run(btn, "Approving…", async () => {
      const result = await api.decideClassAApproval({ output_draft_id: btn.dataset.draftId });
      if (result?.decision && result.decision !== "ALLOW") alert(`Class A approval was not granted: ${(result.findings ?? []).map((f) => f.code ?? f).join(", ")}`);
      await refresh("approval");
    });
    if (kind === "review") {
      const decision = btn.dataset.decision;
      const notes = root.querySelector(`[data-notes-for="${CSS.escape(btn.dataset.draftId)}"]`)?.value?.trim() || undefined;
      if (decision === "REVISION_REQUIRED" && !notes) return alert("Tell the worker what to change — add a note before requesting a revision.");
      if (decision === "REJECTED" && !window.confirm("Reject this draft? The item will move to Approval for you to dismiss.")) return;
      const busy = { APPROVED_FOR_CLIENT_DRAFT: "Approving…", REVISION_REQUIRED: "Sending back…", REJECTED: "Rejecting…" }[decision];
      const nextTab = { APPROVED_FOR_CLIENT_DRAFT: "outbox", REVISION_REQUIRED: "pending", REJECTED: "approval" }[decision];
      return run(btn, busy, async () => { await api.reviewOutputDraft({ output_draft_id: btn.dataset.draftId, review_decision: decision, review_notes: notes }); await refresh(nextTab); });
    }
    if (kind === "prepare") return run(btn, "Preparing…", async () => { await api.prepareClientDeliveryDraft({ output_draft_id: btn.dataset.draftId, client_id: btn.dataset.clientId }); await refresh("outbox"); });
    if (kind === "mark-sent") {
      if (!window.confirm("Mark as sent? Confirm you have already sent this to the client yourself.")) return;
      return run(btn, "Recording…", async () => { await api.markClientDeliverySent({ client_delivery_draft_id: btn.dataset.deliveryId }); await refresh("archived"); });
    }
    if (kind === "archive") {
      if (!window.confirm("Dismiss this item to the archive?")) return;
      return run(btn, "Archiving…", async () => { await api.archiveWorkdeskItem({ workdesk_item_id: btn.dataset.itemId }); await refresh("archived"); });
    }
  });

  root.innerHTML = loading();
  try {
    await load();
    render();
  } catch (err) {
    root.innerHTML = errorBox(err, "workdesk");
  }
}

// ADR-089 W1 (F2): what each role's worker may be asked to do. Mirrors
// defaultToolPolicyByRole in packages/core-domain/src/awia-virtual-staff-authority-gate.mjs
// (the server re-checks every assignment against it, so this list is a convenience, never the
// authority) with plain-English labels for the owner.
const WORK_ACTIONS_BY_ROLE = {
  CFO: [["finance.analysis.prepare", "Prepare a finance analysis"], ["finance.governance.review", "Review finance governance"], ["evidence.bundle.review", "Review an evidence bundle"]],
  FAO: [["accounts.reconciliation.prepare", "Reconcile accounts"], ["accounts.ap.prepare", "Prepare payables"], ["accounts.receivable.prepare", "Prepare receivables"], ["evidence.bundle.prepare", "Prepare an evidence bundle"]],
  SAO: [["sales.lead.qualify.prepare", "Qualify and score a lead"], ["sales.opportunity.prepare", "Prepare a sales opportunity"], ["proposal.draft.prepare", "Draft a proposal"], ["customer.communication.draft", "Draft a client message"]],
  OPO: [["project.delivery.coordinate", "Coordinate project delivery"], ["workload.assignment.prepare", "Plan task/capacity assignment"], ["workload.summary.prepare", "Summarise workload"], ["evidence.bundle.review", "Review an evidence bundle"]],
  ARO: [["administration.request.triage", "Triage an admin request"], ["administration.document.register", "Register documents"], ["administration.deadline.prepare", "Prepare a deadline"], ["administration.employee.onboarding", "Prepare employee onboarding"], ["evidence.bundle.prepare", "Prepare an evidence bundle"]],
};

function actionOptions(roleCode) {
  const actions = WORK_ACTIONS_BY_ROLE[roleCode] ?? [];
  if (!actions.length) return `<option value="" disabled selected>No work types for this role yet</option>`;
  return actions.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("");
}

const FILE_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg";
const FILE_CLASSIFICATION_OPTIONS = [
  ["CLIENT_CONFIDENTIAL", "Client confidential"],
  ["FIRM_INTERNAL", "Firm internal"],
  ["FINANCE_RESTRICTED", "Finance — restricted"],
  ["HR_RESTRICTED", "HR — restricted"],
].map(([value, label]) => `<option value="${value}">${label}</option>`).join("");

function humanize(value) {
  return String(value ?? "").replace(/[._]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatBytes(bytes) {
  const n = Number(bytes ?? 0);
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
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
// ADR-093 W4 (F4): projects as a real list, each with "Request work" (the New Request form opens
// with that client project already chosen, so the work is client work from the start).
export async function mountProjects(root) {
  root.innerHTML = loading();
  try {
    const store = scopeStoreToCurrentFirm(await api.getStore());
    const relationships = store.firm_client_relationships ?? [];
    const clients = store.clients ?? [];
    const requests = store.work_requests ?? [];
    const rows = (store.projects ?? []).map((p) => {
      const rel = relationships.find((r) => r.id === p.relationship_id);
      const client = clients.find((c) => c.id === rel?.client_id);
      const projectRequests = requests.filter((r) => r.project_id === p.id);
      return {
        id: p.id,
        name: p.project_name ?? p.name ?? p.id,
        client: client?.name ?? client?.display_name ?? client?.legal_name ?? "—",
        status: String(p.status ?? p.state ?? "active").toLowerCase(),
        opened: p.created_at,
        open_work: projectRequests.filter((r) => r.status !== "CANCELLED").length,
      };
    });
    root.innerHTML = panel("Projects", rows.length ? table([
      { key: "name", label: "Project", render: (r) => `<strong>${escapeHtml(r.name)}</strong>` },
      { key: "client", label: "Client" },
      { key: "status", label: "Status", render: (r) => statusPill(r.status) },
      { key: "opened", label: "Opened", render: (r) => escapeHtml(fmtDate(r.opened)) },
      { key: "open_work", label: "Requests", render: (r) => String(r.open_work) },
      { key: "actions", label: "", render: (r) => `<button class="btn btn-primary btn-sm" type="button" data-request-project="${escapeHtml(r.id)}">Request work</button>` },
    ], rows, (r) => r.id) : empty("No projects yet. A project opens when a client accepts your proposal."));
  } catch (err) {
    root.innerHTML = errorBox(err, "projects");
    return;
  }
  root.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-request-project]");
    if (!btn) return;
    openNewRequestDrawer({ presetProjectId: btn.dataset.requestProject, onCreated: (result) => window.dispatchEvent(new CustomEvent("vfirm:navigate", { detail: { page: "workdesk", tab: result?.workdesk_item ? "pending" : "inbox" } })) });
  });
}

// ---------------------------------------------------------------- Documents
// ADR-093 W4 (F3): the firm's document register. Two sources: files the owner registers here
// (POST /documents -> DOC-0001...), and approved work outputs filed automatically when work is
// marked sent or complete (WR-0003-OUT ...). Every revision points at a stored file with its real
// SHA-256 (storage_ref "file:<id>"); older register entries that point elsewhere are listed with
// their reference only. New revision -> POST /documents/revise (the old one is kept, SUPERSEDED).
const DOCUMENT_TYPES = [
  ["GENERAL", "General"], ["CONTRACT", "Contract / agreement"], ["INVOICE", "Invoice / bill"], ["STATEMENT", "Statement"],
  ["CORRESPONDENCE", "Letter / correspondence"], ["REPORT", "Report"], ["DRAWING", "Drawing"], ["HR", "HR record"], ["OTHER", "Other"],
];

export async function mountDocuments(root) {
  let ctx = null;
  let filter = { q: "", source: "all", scope: "all" };
  const openForms = new Set();

  async function load() {
    const store = scopeStoreToCurrentFirm(await api.getStore());
    const relationships = store.firm_client_relationships ?? [];
    const clients = store.clients ?? [];
    const projects = (store.projects ?? []).map((p) => {
      const rel = relationships.find((r) => r.id === p.relationship_id);
      const client = clients.find((c) => c.id === rel?.client_id);
      return { id: p.id, name: p.project_name ?? p.name ?? p.id, client: client?.name ?? client?.display_name ?? "Client" };
    });
    ctx = {
      entries: [...(store.document_register_entries ?? [])].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at))),
      revisions: store.document_revision_records ?? [],
      files: store.file_objects ?? [],
      requests: store.work_requests ?? [],
      projects,
    };
  }

  const fileForRevision = (rev) => {
    const ref = String(rev?.storage_ref ?? "");
    return ref.startsWith("file:") ? ctx.files.find((f) => f.id === ref.slice(5)) : null;
  };
  const revisionsFor = (entry) => ctx.revisions.filter((r) => r.document_register_entry_id === entry.id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const currentRevision = (entry) => ctx.revisions.find((r) => r.id === entry.current_revision_id);
  const projectLabel = (id) => { const p = ctx.projects.find((x) => x.id === id); return p ? `${p.client} — ${p.name}` : null; };
  const isWorkOutput = (entry) => entry.metadata?.source === "workdesk" || entry.document_type === "WORK_OUTPUT";

  function downloadChip(rev) {
    const file = fileForRevision(rev);
    if (!file) return `<span class="wd-sub" title="${escapeHtml(rev?.storage_ref ?? "")}">Stored outside vFirm</span>`;
    return `<button class="wd-file" type="button" data-doc="download" data-file-id="${escapeHtml(file.id)}" data-filename="${escapeHtml(file.filename)}" title="SHA-256 ${escapeHtml(file.sha256)}">&#8595; ${escapeHtml(file.filename)}</button>`;
  }

  function sourceLabel(entry) {
    if (!isWorkOutput(entry)) return entry.metadata?.source === "owner_upload" ? "Uploaded by you" : "Registered";
    const req = ctx.requests.find((r) => r.id === entry.metadata?.work_request_id);
    return `Approved work${req ? ` · ${escapeHtml(req.request_number)}` : ""}`;
  }

  function addForm() {
    if (!openForms.has("add")) return `<button class="btn btn-primary btn-sm" type="button" data-doc="open" data-key="add">+ Add a document</button>`;
    return `<form class="wd-form doc-add" data-doc-form="add">
        <label>File *<input type="file" name="file" required accept="${FILE_ACCEPT}"></label>
        <label>Title<input type="text" name="title" maxlength="200" placeholder="Defaults to the file name"></label>
        <label>Type<select name="document_type">${DOCUMENT_TYPES.map(([v, l]) => `<option value="${v}">${escapeHtml(l)}</option>`).join("")}</select></label>
        <label>For<select name="project_id"><option value="">The firm (internal)</option>${ctx.projects.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.client)} — ${escapeHtml(p.name)}</option>`).join("")}</select></label>
        <label>Document number (optional)<input type="text" name="document_number" maxlength="60" placeholder="Auto: DOC-0001…"></label>
        <label>Sensitivity<select name="classification">${FILE_CLASSIFICATION_OPTIONS}</select></label>
        <div class="wd-actions"><button class="btn btn-primary btn-sm" type="submit">Register</button><button class="btn btn-ghost btn-sm" type="button" data-doc="close" data-key="add">Cancel</button></div>
      </form>`;
  }

  function entryActions(entry) {
    const reviseKey = `revise:${entry.id}`;
    const historyKey = `history:${entry.id}`;
    const revs = revisionsFor(entry);
    const revise = openForms.has(reviseKey)
      ? `<form class="wd-form" data-doc-form="revise" data-entry-id="${escapeHtml(entry.id)}">
          <label>New revision file<input type="file" name="file" required accept="${FILE_ACCEPT}"></label>
          <label>What changed (optional)<input type="text" name="note" maxlength="500"></label>
          <div class="wd-actions"><button class="btn btn-primary btn-sm" type="submit">Add revision</button><button class="btn btn-ghost btn-sm" type="button" data-doc="close" data-key="${escapeHtml(reviseKey)}">Cancel</button></div>
        </form>`
      : `<button class="btn btn-ghost btn-sm" type="button" data-doc="open" data-key="${escapeHtml(reviseKey)}">New revision&hellip;</button>`;
    const history = revs.length > 1
      ? (openForms.has(historyKey)
        ? `<ol class="doc-history">${revs.map((r) => `<li>${escapeHtml(r.revision)} · ${escapeHtml(fmtDate(r.created_at))} ${statusPill(r.status)} ${downloadChip(r)}${r.metadata?.note ? `<div class="wd-sub">${escapeHtml(r.metadata.note)}</div>` : ""}</li>`).join("")}</ol><button class="wd-link" type="button" data-doc="close" data-key="${escapeHtml(historyKey)}">Hide history</button>`
        : `<button class="wd-link" type="button" data-doc="open" data-key="${escapeHtml(historyKey)}">History (${revs.length})</button>`)
      : "";
    return `<div class="wd-actions">${revise}</div>${history}`;
  }

  function visibleEntries() {
    const q = filter.q.trim().toLowerCase();
    return ctx.entries.filter((e) => {
      if (filter.source === "work" && !isWorkOutput(e)) return false;
      if (filter.source === "uploaded" && isWorkOutput(e)) return false;
      if (filter.scope === "internal" && e.project_id) return false;
      if (filter.scope !== "all" && filter.scope !== "internal" && e.project_id !== filter.scope) return false;
      if (q && !`${e.document_number} ${e.title} ${e.document_type}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function render() {
    const rows = visibleEntries();
    const filters = `<div class="doc-filters">
        <input type="search" data-doc-filter="q" placeholder="Search number, title or type" value="${escapeHtml(filter.q)}">
        <select data-doc-filter="source"><option value="all">All sources</option><option value="work" ${filter.source === "work" ? "selected" : ""}>Approved work</option><option value="uploaded" ${filter.source === "uploaded" ? "selected" : ""}>Uploaded</option></select>
        <select data-doc-filter="scope"><option value="all">Everything</option><option value="internal" ${filter.scope === "internal" ? "selected" : ""}>Firm (internal)</option>${ctx.projects.map((p) => `<option value="${escapeHtml(p.id)}" ${filter.scope === p.id ? "selected" : ""}>${escapeHtml(p.client)} — ${escapeHtml(p.name)}</option>`).join("")}</select>
      </div>`;
    const list = rows.length ? table([
      { key: "number", label: "No.", render: (e) => `<span class="wd-num">${escapeHtml(e.document_number)}</span>` },
      { key: "title", label: "Document", render: (e) => `<strong>${escapeHtml(e.title)}</strong><div class="wd-sub">${escapeHtml(humanize(e.document_type))} · ${sourceLabel(e)}</div>` },
      { key: "for", label: "For", render: (e) => e.project_id ? escapeHtml(projectLabel(e.project_id) ?? "Client project") : `<span class="wd-internal">Firm (internal)</span>` },
      { key: "current", label: "Current", render: (e) => { const r = currentRevision(e); return r ? `${escapeHtml(r.revision)} · ${escapeHtml(fmtDate(r.created_at))}<div class="wd-files">${downloadChip(r)}</div>` : "—"; } },
      { key: "sensitivity", label: "Sensitivity", render: (e) => `<span class="wd-sub">${escapeHtml(humanize(e.classification))}</span>` },
      { key: "actions", label: "", render: (e) => entryActions(e) },
    ], rows, (e) => e.id) : empty(ctx.entries.length ? "No documents match these filters." : "No documents yet. Approved work is filed here automatically when you mark it sent or complete — or add a document yourself.");
    root.innerHTML = `
      ${statRow([
        { value: ctx.entries.length, label: "Documents" },
        { value: ctx.entries.filter(isWorkOutput).length, label: "Approved work" },
        { value: ctx.entries.filter((e) => !isWorkOutput(e)).length, label: "Uploaded" },
      ])}
      ${panel("Document register", `<div class="doc-toolbar">${addForm()}</div>${filters}${list}`)}`;
  }

  async function refresh() { await load(); render(); }

  async function busy(button, label, action) {
    const controls = [...root.querySelectorAll("button, input, select, textarea")];
    const prior = controls.map((c) => [c, c.disabled]);
    controls.forEach((c) => { c.disabled = true; });
    const text = button?.textContent;
    if (button) button.textContent = label;
    try { await action(); } catch (err) {
      prior.forEach(([c, d]) => { c.disabled = d; });
      if (button) button.textContent = text;
      alert(`Action failed: ${err.message}`);
    }
  }

  root.addEventListener("click", async (event) => {
    const btn = event.target.closest("button[data-doc]");
    if (!btn) return;
    const kind = btn.dataset.doc;
    if (kind === "open") { openForms.add(btn.dataset.key); render(); return; }
    if (kind === "close") { openForms.delete(btn.dataset.key); render(); return; }
    if (kind === "download") {
      try { await api.downloadFile(btn.dataset.fileId, btn.dataset.filename); } catch (err) { alert(`Download failed: ${err.message}`); }
    }
  });
  root.addEventListener("input", (event) => {
    const el = event.target.closest("[data-doc-filter]");
    if (!el || el.tagName !== "INPUT") return;
    filter = { ...filter, q: el.value };
    const pos = el.selectionStart;
    render();
    const again = root.querySelector('[data-doc-filter="q"]');
    again?.focus();
    again?.setSelectionRange(pos, pos);
  });
  root.addEventListener("change", (event) => {
    const el = event.target.closest("select[data-doc-filter]");
    if (!el) return;
    filter = { ...filter, [el.dataset.docFilter]: el.value };
    render();
  });
  root.addEventListener("submit", async (event) => {
    const form = event.target.closest("form[data-doc-form]");
    if (!form) return;
    event.preventDefault();
    const fd = new FormData(form);
    const file = form.querySelector('input[name="file"]')?.files?.[0];
    if (!file) return;
    const submit = form.querySelector('button[type="submit"]');
    if (form.dataset.docForm === "add") {
      await busy(submit, "Uploading…", async () => {
        const stored = await api.uploadFile(file, { classification: fd.get("classification"), purpose: "DOCUMENT" });
        await api.registerDocument({ file_id: stored.id, title: String(fd.get("title") ?? "").trim() || undefined, document_type: fd.get("document_type"), project_id: fd.get("project_id") || undefined, document_number: String(fd.get("document_number") ?? "").trim() || undefined });
        openForms.delete("add");
        await refresh();
      });
    }
    if (form.dataset.docForm === "revise") {
      const entry = ctx.entries.find((e) => e.id === form.dataset.entryId);
      await busy(submit, "Uploading…", async () => {
        const stored = await api.uploadFile(file, { classification: entry?.classification ?? "CLIENT_CONFIDENTIAL", purpose: "DOCUMENT" });
        await api.reviseDocument({ document_register_entry_id: form.dataset.entryId, file_id: stored.id, note: String(fd.get("note") ?? "").trim() || undefined });
        openForms.delete(`revise:${form.dataset.entryId}`);
        await refresh();
      });
    }
  });

  root.innerHTML = loading();
  try { await refresh(); } catch (err) { root.innerHTML = errorBox(err, "documents"); }
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
  documents: mountDocuments,
  "firm-settings": mountFirmSettings,
};
