// Admin-console pages (platform-operator side). Bespoke layouts built from
// field names confirmed by directly reading each backing handler in
// apps/api/src/server.mjs (and its store.mjs / core-domain delegates):
// readActiveWorkspaceSummary, readTenantUsageBillingSummary, readAuthContext,
// readOpsReadiness, readDailyOperationsSummary, readOperatorMetrics,
// listAwiaStaffTemplates, buildAwiaStaffDepartmentDashboard,
// readPilotReviewBoardSummary, readCashSnapshot, readCommercialLaunchSummary,
// formworkServicePack (packages/service-packs/src/formwork.mjs),
// buildAwiaFirmPayrollSummary, readPilotExpansionSummary,
// readSupportDeskSummary. Several of these share one shape --
// { generated_at, status, counts, ...detail } -- so statusCountsPanel()
// below renders that family consistently; pages add their own extra panels
// for fields outside that common shape.
// Engineering Console keeps the old raw diagnostic buttons (the same
// escape hatch the original AI Workforce panel exposed), now wired to
// confirmed-real POST routes.

import { api } from "./api.js";
import { panel, table, statRow, statusPill, empty, inspector, errorBox, escapeHtml, fmtDate, fmtMoney } from "./ui.js";

function loading() {
  return `<div class="empty">Loading&hellip;</div>`;
}

async function multi(root, sections) {
  root.innerHTML = loading();
  const results = await Promise.allSettled(sections.map((s) => s.loader()));
  root.innerHTML = sections
    .map((s, i) => (results[i].status === "fulfilled" ? s.render(results[i].value) : panel(s.title, errorBox(results[i].reason, s.title))))
    .join("");
}

// Shared shape: { generated_at, status, counts: {...}, ...extra }. Renders a
// status pill + a stat row from counts; `extraHtml` appends anything
// page-specific (a latest-record panel, a queue list, warnings).
function statusCountsPanel(title, data, extraHtml = "") {
  const counts = data?.counts ?? {};
  const stats = Object.entries(counts).map(([key, value]) => ({ value, label: key.replace(/_/g, " ") }));
  return panel(title, `
    <div class="kv-grid"><div class="kv"><span class="kv-key">status</span><span class="kv-value">${statusPill(data?.status ?? "unknown")}</span></div></div>
    ${stats.length ? statRow(stats) : ""}
    ${extraHtml}
  `);
}

function recordList(records, columns) {
  const rows = (records ?? []).filter(Boolean);
  return rows.length ? table(columns, rows, (r) => r.id ?? JSON.stringify(r).slice(0, 40)) : empty("None yet.");
}

// ---------------------------------------------------------------- Firms & Tenants
export async function mountAdminFirms(root) {
  await multi(root, [
    {
      title: "Workspace / tenant summary",
      loader: api.getWorkspaceSummary,
      render: (data) => panel("Workspace / tenant summary", `
        <div class="kv-grid">
          <div class="kv"><span class="kv-key">Tenant</span><span class="kv-value">${escapeHtml(data.tenant?.name ?? "—")} (${statusPill(data.tenant?.status ?? "unknown")})</span></div>
          <div class="kv"><span class="kv-key">Firm</span><span class="kv-value">${escapeHtml(data.firm?.name ?? "—")} (${statusPill(data.firm?.status ?? "unknown")})</span></div>
          <div class="kv"><span class="kv-key">Service pack</span><span class="kv-value">${escapeHtml(data.service_pack?.name ?? "—")} (${statusPill(data.service_pack?.status ?? "unknown")})</span></div>
        </div>
      `),
    },
    {
      title: "Tenant usage",
      loader: api.getTenantUsageSummary,
      render: (data) => statusCountsPanel("Tenant usage", data, `
        ${data.limit_warnings?.length ? `<div class="error-box">${data.limit_warnings.map(escapeHtml).join("<br>")}</div>` : ""}
        ${Object.keys(data.usage_totals ?? {}).length ? `<div class="kv-grid">${Object.entries(data.usage_totals).map(([k, v]) => `<div class="kv"><span class="kv-key">${escapeHtml(k)}</span><span class="kv-value">${escapeHtml(String(v))}</span></div>`).join("")}</div>` : ""}
      `),
    },
  ]);
}

// ---------------------------------------------------------------- Users & Access
export async function mountAdminUsers(root) {
  root.innerHTML = loading();
  try {
    const data = await api.getAuthContext();
    root.innerHTML = panel("Auth context", `
      <div class="kv-grid">
        <div class="kv"><span class="kv-key">Mode</span><span class="kv-value">${escapeHtml(data.mode ?? "—")}</span></div>
        <div class="kv"><span class="kv-key">Actor</span><span class="kv-value">${escapeHtml(data.actor?.display_name ?? data.actor?.actor_id ?? "—")} (${escapeHtml(data.actor?.role ?? "—")})</span></div>
        <div class="kv"><span class="kv-key">Professional authority</span><span class="kv-value">${data.authority_valid ? statusPill("valid") : statusPill("missing")}</span></div>
      </div>
    `);
  } catch (err) {
    root.innerHTML = errorBox(err, "auth context");
  }
}

// ---------------------------------------------------------------- Ops Console
export async function mountAdminOps(root) {
  await multi(root, [
    {
      title: "Ops readiness",
      loader: api.getOpsReadiness,
      render: (data) => panel("Ops readiness", `
        <div class="kv-grid"><div class="kv"><span class="kv-key">Status</span><span class="kv-value">${statusPill(data.status)}</span></div></div>
        ${recordList(data.checks, [
          { key: "key", label: "Check" },
          { key: "status", label: "Status", render: (r) => statusPill(r.status) },
          { key: "detail", label: "Detail" },
        ])}
      `),
    },
    {
      title: "Operations today",
      loader: api.getOperationsToday,
      render: (data) => panel("Operations today", `
        <div class="kv-grid"><div class="kv"><span class="kv-key">Status</span><span class="kv-value">${statusPill(data.status)}</span></div></div>
        ${statRow(Object.entries(data.counts ?? {}).map(([key, value]) => ({ value, label: key.replace(/_/g, " ") })))}
        ${data.exceptions?.length ? panel("Exceptions", recordList(data.exceptions, [
          { key: "severity", label: "Severity", render: (r) => statusPill(r.severity) },
          { key: "detail", label: "Detail" },
        ])) : ""}
        ${panel("Cash", `<div class="kv-grid">${Object.entries(data.cash ?? {}).map(([k, v]) => `<div class="kv"><span class="kv-key">${escapeHtml(k.replace(/_/g, " "))}</span><span class="kv-value">${typeof v === "number" ? fmtMoney(v, data.cash?.currency) : escapeHtml(String(v))}</span></div>`).join("")}</div>`)}
      `),
    },
    {
      title: "Operator metrics",
      loader: api.getOperatorMetrics,
      render: (data) => statusCountsPanel("Operator metrics", data, `
        ${data.warnings?.length ? `<div class="error-box">${data.warnings.map(escapeHtml).join("<br>")}</div>` : ""}
      `),
    },
  ]);
}

// ---------------------------------------------------------------- Technical Delivery
export async function mountAdminTechnical(root) {
  await multi(root, [
    {
      title: "AWIA staff templates",
      loader: api.getAwiaTemplates,
      render: (data) => panel("AWIA staff templates", recordList(Array.isArray(data) ? data : data?.templates, [
        { key: "name", label: "Template" },
        { key: "description", label: "Description" },
        { key: "staff_count", label: "Staff" },
        { key: "version", label: "Version" },
      ])),
    },
    {
      title: "AWIA department dashboard",
      loader: api.getAwiaDepartmentDashboard,
      render: (data) => panel("AWIA department dashboard", `
        ${statRow([
          { value: data.department_count ?? 0, label: "Departments" },
          { value: data.total_staff ?? 0, label: "Total staff" },
          { value: data.total_active_staff ?? 0, label: "Active staff" },
          { value: data.total_output_drafts_pending_review ?? 0, label: "Drafts pending review" },
        ])}
        ${recordList(data.departments, [
          { key: "department", label: "Department" },
          { key: "role_name", label: "Role" },
          { key: "staff_total", label: "Staff" },
          { key: "staff_active", label: "Active" },
          { key: "workdesk_items_open", label: "Open items" },
          { key: "output_drafts_pending_review", label: "Pending review" },
        ])}
      `),
    },
  ]);
}

// ---------------------------------------------------------------- Audit & Compliance
export async function mountAdminAudit(root) {
  root.innerHTML = loading();
  try {
    const data = await api.getReviewBoardSummary();
    root.innerHTML = statusCountsPanel("Stakeholder review summary", data, `
      ${panel("Open review boards", recordList(data.open_boards, [
        { key: "id", label: "Board" },
        { key: "review_status", label: "Status", render: (r) => statusPill(r.review_status) },
      ]))}
      ${panel("Latest decisions", recordList(data.latest_decisions, [
        { key: "decision", label: "Decision" },
        { key: "created_at", label: "When", render: (r) => fmtDate(r.created_at) },
      ]))}
    `);
  } catch (err) {
    root.innerHTML = errorBox(err, "stakeholder review summary");
  }
}

// ---------------------------------------------------------------- Sales & Accounts
export async function mountAdminSalesAccounts(root) {
  await multi(root, [
    {
      title: "Cash snapshot",
      loader: api.getCashSnapshot,
      render: (data) => panel("Cash snapshot", `
        ${statRow([
          { value: fmtMoney(data.invoice_total, data.currency), label: "Invoiced" },
          { value: fmtMoney(data.cash_received, data.currency), label: "Received" },
          { value: fmtMoney(data.receivables_outstanding, data.currency), label: "Outstanding" },
          { value: fmtMoney(data.projected_net_cash, data.currency), label: "Projected net" },
        ])}
      `),
    },
    {
      title: "Commercial launch summary",
      loader: api.getCommercialLaunchSummary,
      render: (data) => statusCountsPanel("Commercial launch summary", data),
    },
  ]);
}

// ---------------------------------------------------------------- Service Packs & Billing
export async function mountAdminBilling(root) {
  await multi(root, [
    {
      title: "Service pack: Formwork",
      loader: api.getServicePackFormwork,
      render: (data) => panel("Service pack: Formwork", `
        <div class="kv-grid">
          <div class="kv"><span class="kv-key">Name</span><span class="kv-value">${escapeHtml(data.name ?? "—")} (v${escapeHtml(data.version ?? "—")})</span></div>
          <div class="kv"><span class="kv-key">MVP service</span><span class="kv-value">${escapeHtml(data.mvp_service ?? "—")}</span></div>
          <div class="kv"><span class="kv-key">Risk profile</span><span class="kv-value">${statusPill(data.risk_profile ?? "unknown")}</span></div>
        </div>
      `),
    },
    {
      title: "AWIA payroll summary",
      loader: api.getAwiaPayrollSummary,
      render: (data) => panel("AWIA payroll summary", `
        ${statRow([
          { value: data.seat_count ?? 0, label: "Seats" },
          { value: data.seats_with_unresolved_grade ?? 0, label: "Unresolved grade" },
        ])}
        ${Object.keys(data.seats_by_billing_status ?? {}).length ? `<div class="kv-grid">${Object.entries(data.seats_by_billing_status).map(([k, v]) => `<div class="kv"><span class="kv-key">${escapeHtml(k)}</span><span class="kv-value">${escapeHtml(String(v))}</span></div>`).join("")}</div>` : ""}
        ${recordList(data.monthly_totals_by_currency, [
          { key: "currency", label: "Currency" },
          { key: "billing_active_seat_count", label: "Active seats" },
          { key: "monthly_total_amount", label: "Monthly total", render: (r) => fmtMoney(r.monthly_total_amount, r.currency) },
        ])}
      `),
    },
  ]);
}

// ---------------------------------------------------------------- Growth
export async function mountAdminGrowth(root) {
  await multi(root, [
    {
      title: "Pilot expansion summary",
      loader: api.getExpansionSummary,
      render: (data) => statusCountsPanel("Pilot expansion summary", data),
    },
    {
      title: "Support summary",
      loader: api.getSupportSummary,
      render: (data) => statusCountsPanel("Support summary", data, panel("Queue", recordList(data.queue, [
        { key: "subject", label: "Subject" },
        { key: "severity", label: "Severity", render: (r) => statusPill(r.severity) },
        { key: "status", label: "Status", render: (r) => statusPill(r.status) },
      ]))),
    },
  ]);
}

// ---------------------------------------------------------------- Engineering Console
export async function mountAdminEngineering(root) {
  root.innerHTML = `
    ${panel("AI Workforce (raw diagnostics)", `
      <p class="field-note">Low-level calls straight to the AWIA virtual-staff engine. Same escape hatch the old AI Workforce panel exposed -- kept separate from the governed Owner-facing Workdesk/My Team flow.</p>
      <div class="two-col">
        <div>
          <label>Staff ID<br><input type="text" id="engStaffId" placeholder="staff id"></label><br>
          <button class="btn-sm" id="engProvision" type="button">provision-pilot</button>
        </div>
        <div>
          <label>Task ID<br><input type="text" id="engTaskId" placeholder="task id"></label><br>
          <button class="btn-sm" id="engReadiness" type="button">task-readiness</button>
          <button class="btn-sm" id="engOutputDraft" type="button">output-draft</button>
          <button class="btn-sm" id="engOutputReview" type="button">output-review</button>
        </div>
      </div>
      <div id="engResult" class="kv-grid"></div>
    `)}
  `;

  function showResult(label, promise) {
    const target = root.querySelector("#engResult");
    target.innerHTML = `<div class="empty">Calling ${escapeHtml(label)}&hellip;</div>`;
    promise
      .then((data) => { target.innerHTML = inspector(data, { label }); })
      .catch((err) => { target.innerHTML = errorBox(err, label); });
  }

  root.querySelector("#engProvision").addEventListener("click", () => {
    const staffId = root.querySelector("#engStaffId").value.trim();
    showResult("provision-pilot", api.provisionPilotStaff({ staff_id: staffId }));
  });
  root.querySelector("#engReadiness").addEventListener("click", () => {
    const taskId = root.querySelector("#engTaskId").value.trim();
    showResult("task-readiness", api.evaluateTaskReadiness({ task_id: taskId }));
  });
  root.querySelector("#engOutputDraft").addEventListener("click", () => {
    const taskId = root.querySelector("#engTaskId").value.trim();
    showResult("output-draft", api.produceOutputDraft({ task_id: taskId }));
  });
  root.querySelector("#engOutputReview").addEventListener("click", () => {
    const taskId = root.querySelector("#engTaskId").value.trim();
    showResult("output-review", api.reviewOutputDraft({ task_id: taskId, decision: "approve" }));
  });
}

export const ADMIN_PAGES = {
  "admin-firms": mountAdminFirms,
  "admin-users": mountAdminUsers,
  "admin-ops": mountAdminOps,
  "admin-technical": mountAdminTechnical,
  "admin-audit": mountAdminAudit,
  "admin-sales-accounts": mountAdminSalesAccounts,
  "admin-billing": mountAdminBilling,
  "admin-growth": mountAdminGrowth,
  "admin-engineering": mountAdminEngineering,
};
