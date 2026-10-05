// CE-S1 (ADR-095): the BizKick pages -- Connected EDCS.
//
// Golden rule shown to the owner on every page: BizKick is the source, the Bridge is the contract,
// vFirm is the governed record. vFirm reads the register; it never edits BizKick files.
//
// Five pages, each a mount(root) function like the other owner pages:
//   bizkick-connection   company code + what content vFirm may keep (D7)
//   bizkick-import       upload the register -> summary of what the import did
//   bizkick-transactions list + filters; click a row for detail (revisions, events, counterparty link)
//   bizkick-history      every import (sync run) and its per-row outcomes
//   bizkick-conflicts    held conflicts; the owner keeps vFirm's record or accepts BizKick's row

import { api } from "./api.js";
import { pill, escapeHtml, fmtDate, fmtMoney, empty, panel, statRow, table, errorBox } from "./ui.js";

const OUTCOME_TONE = { CREATED: "moss", UPDATED: "amber", REVISED: "amber", UNCHANGED: "default", REJECTED: "rose", CONFLICT: "rose", ROW_MISSING: "amber", CONFLICT_KEPT_CURRENT: "moss", CONFLICT_ACCEPTED_INCOMING: "moss" };
const ALERT_TONE = { OVERDUE: "rose", "DUE SOON": "amber", Open: "default", Closed: "moss", "No due date": "default", "STOP — DUPLICATE": "rose" };
const outcomePill = (outcome) => pill(String(outcome).replace(/_/g, " "), OUTCOME_TONE[outcome] ?? "default");
const alertPill = (alert) => pill(alert, ALERT_TONE[alert] ?? "default");
const GOLDEN_RULE = `<p class="field-note">BizKick is the source, the Bridge is the contract, vFirm is the governed record. vFirm reads the register; it never edits BizKick files.</p>`;
const dt = (value) => (value ? new Date(value).toLocaleString() : "—");

function reasonText(row) {
  const parts = [...(row.reasons ?? [])];
  const details = row.reason_details ?? [];
  return parts.length ? `${parts.join(", ")}${details.length ? ` (${details.join("; ")})` : ""}` : "";
}

function runSummary(run) {
  const c = run.counts ?? {};
  const stats = [{ value: run.rows_total ?? 0, label: "Rows read" }];
  for (const key of ["CREATED", "UPDATED", "REVISED", "UNCHANGED", "CONFLICT", "REJECTED", "ROW_MISSING"]) stats.push({ value: c[key] ?? 0, label: key.replace("_", " ").toLowerCase() });
  return statRow(stats);
}

// ---------------- connection ----------------

async function mountConnection(root) {
  let data;
  try { data = await api.getEdcsConnection(); } catch (err) { root.innerHTML = errorBox(err, "the BizKick connection"); return; }
  const connection = data.connection;
  const policies = data.module_policies ?? [];
  const hr = policies.find((p) => p.module === "HR")?.policy === "CONTENT";
  root.innerHTML = GOLDEN_RULE + panel(connection ? "Connected" : "Connect this firm to BizKick", `
    <form id="bkConnForm" class="form-grid">
      <label>Company code <input id="bkCompany" name="company_code" maxlength="6" value="${escapeHtml(connection?.company_code ?? "")}" placeholder="e.g. NEX" /></label>
      <label>BizKick version <input id="bkVersion" name="bizkick_version" value="${escapeHtml(connection?.bizkick_version ?? "1.0")}" /></label>
      <label class="check"><input id="bkHr" type="checkbox" ${hr ? "checked" : ""} /> Keep HR transaction content in vFirm (default: metadata only)</label>
      <div class="form-actions"><button class="btn btn-primary" id="bkConnSave" type="submit">${connection ? "Save changes" : "Connect"}</button></div>
      <div id="bkConnMsg" style="min-height:1.2em"></div>
    </form>
    <p class="field-note">The company code locks once transactions exist, because every transaction ID carries it.</p>`)
    + panel("What vFirm keeps", table(
      [{ label: "Module", key: "module" }, { label: "Content policy", render: (p) => pill(p.policy === "CONTENT" ? "Full content" : "Metadata only", p.policy === "CONTENT" ? "moss" : "amber") }],
      policies, (p) => p.module));
  root.querySelector("#bkConnForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const msg = root.querySelector("#bkConnMsg");
    msg.textContent = "Saving…";
    try {
      await api.saveEdcsConnection({ company_code: root.querySelector("#bkCompany").value.trim().toUpperCase(), bizkick_version: root.querySelector("#bkVersion").value.trim(), hr_content_opt_in: root.querySelector("#bkHr").checked });
      await mountConnection(root);
      root.querySelector("#bkConnMsg").textContent = "Saved.";
    } catch (err) { msg.textContent = err.message; }
  });
}

// ---------------- import ----------------

async function mountImport(root) {
  let data;
  try { data = await api.getEdcsConnection(); } catch (err) { root.innerHTML = errorBox(err, "the BizKick connection"); return; }
  if (!data.connection) {
    root.innerHTML = GOLDEN_RULE + empty("Connect this firm to BizKick first (BizKick → Connection).");
    return;
  }
  root.innerHTML = GOLDEN_RULE + panel(`Import the ${escapeHtml(data.connection.company_code)} register`, `
    <p>Choose the BizKick workbook (.xlsx, sheet “TRANSACTION REGISTER”) or a CSV export of that sheet.</p>
    <input id="bkFile" type="file" accept=".xlsx,.csv" />
    <button class="btn btn-primary" id="bkImportBtn" type="button">Import</button>
    <div id="bkImportMsg" style="min-height:1.2em"></div>`) + `<div id="bkImportResult"></div>`;
  const msg = root.querySelector("#bkImportMsg");
  root.querySelector("#bkImportBtn").addEventListener("click", async () => {
    const file = root.querySelector("#bkFile").files[0];
    if (!file) { msg.textContent = "Choose a file first."; return; }
    msg.textContent = "Uploading and reading the register…";
    try {
      const uploaded = await api.uploadFile(file, { classification: "CLIENT_CONFIDENTIAL", purpose: "WORK_INPUT" });
      const result = await api.importEdcsRegister({ file_id: uploaded.id });
      msg.textContent = "";
      const run = result.run;
      const attention = (result.rows ?? []).filter((r) => ["REJECTED", "CONFLICT", "ROW_MISSING"].includes(r.outcome));
      root.querySelector("#bkImportResult").innerHTML = run.status === "REJECTED"
        ? `<div class="error-box"><strong>The whole file was rejected: ${escapeHtml(run.file_outcome?.reason ?? "")}.</strong><br>${escapeHtml(run.file_outcome?.detail ? `Problem near: ${run.file_outcome.detail}` : "")}<br>Nothing in vFirm was changed. The attempt is recorded in Sync history.</div>`
        : panel(`Import #${run.run_number} — ${escapeHtml(file.name)}`, runSummary(run) + (attention.length ? table(
          [{ label: "Row", key: "row_number" }, { label: "Transaction", render: (r) => escapeHtml(r.transaction_id ?? "—") }, { label: "Outcome", render: (r) => outcomePill(r.outcome) }, { label: "Why", render: (r) => escapeHtml(reasonText(r)) }],
          attention, (r) => `${r.row_number}`) : `<p class="field-note">No rows need attention.</p>`));
    } catch (err) { msg.textContent = err.message; }
  });
}

// ---------------- transactions ----------------

async function mountTransactions(root) {
  const state = { type: "", status: "", alert: "", flag: "", search: "", selected: null };
  const load = async () => {
    const params = new URLSearchParams();
    for (const key of ["type", "status", "alert", "flag", "search"]) if (state[key]) params.set(key, state[key]);
    const data = await api.listEdcsTransactions(params.toString());
    const typeOptions = ["", ...new Set(data.transactions.map((t) => t.document_type))];
    const statusOptions = ["", ...Object.keys(data.summary?.by_status ?? {})];
    const sel = (id, options, value, label) => `<label>${label} <select id="${id}">${options.map((o) => `<option value="${escapeHtml(o)}" ${o === value ? "selected" : ""}>${o || "All"}</option>`).join("")}</select></label>`;
    root.innerHTML = GOLDEN_RULE
      + statRow([{ value: data.total_all, label: "Transactions" }, { value: data.summary?.by_alert?.OVERDUE ?? 0, label: "Overdue" }, { value: data.summary?.by_alert?.["DUE SOON"] ?? 0, label: "Due soon" }, { value: data.summary?.conflicts ?? 0, label: "Conflicts" }, { value: data.summary?.row_missing ?? 0, label: "Row missing" }])
      + panel("Transactions", `<div class="filters">
          ${sel("bkType", typeOptions, state.type, "Type")}
          ${sel("bkStatus", statusOptions, state.status, "Status")}
          ${sel("bkAlert", ["", "overdue", "due soon", "open", "closed"], state.alert, "Alert")}
          ${sel("bkFlag", ["", "conflict", "row_missing"], state.flag, "Flag")}
          <label>Search <input id="bkSearch" value="${escapeHtml(state.search)}" placeholder="ID, counterparty, subject" /></label>
          <button class="btn btn-sm" id="bkApply" type="button">Apply</button></div>`
        + table([
          { label: "Transaction", render: (t) => `<a href="#" class="bk-open" data-id="${escapeHtml(t.transaction_id)}">${escapeHtml(t.transaction_id)}</a>` },
          { label: "Counterparty", render: (t) => escapeHtml(t.counterparty_name ?? "—") },
          { label: "Subject", render: (t) => escapeHtml(t.subject ?? "—") },
          { label: "Rev", render: (t) => escapeHtml(t.revision ?? "") },
          { label: "Status", render: (t) => pill(t.status, "default") },
          { label: "Amount", render: (t) => escapeHtml(fmtMoney(t.amount, t.currency || "MYR")) },
          { label: "Due", render: (t) => escapeHtml(fmtDate(t.due_date)) },
          { label: "Alert", render: (t) => alertPill(t.alert) + (t.held_conflict ? " " + pill("conflict", "rose") : "") + (t.flags?.row_missing ? " " + pill("row missing", "amber") : "") }
        ], data.transactions, (t) => t.transaction_id))
      + `<div id="bkDetail"></div>`;
    const read = () => {
      state.type = root.querySelector("#bkType").value; state.status = root.querySelector("#bkStatus").value;
      state.alert = root.querySelector("#bkAlert").value; state.flag = root.querySelector("#bkFlag").value; state.search = root.querySelector("#bkSearch").value.trim();
    };
    root.querySelector("#bkApply").addEventListener("click", async () => { read(); await load(); });
    root.querySelector("#bkSearch").addEventListener("keydown", async (event) => { if (event.key === "Enter") { read(); await load(); } });
    for (const link of root.querySelectorAll(".bk-open")) link.addEventListener("click", async (event) => { event.preventDefault(); state.selected = link.dataset.id; await showDetail(root.querySelector("#bkDetail"), link.dataset.id); });
    if (state.selected) await showDetail(root.querySelector("#bkDetail"), state.selected);
  };
  try { await load(); } catch (err) { root.innerHTML = errorBox(err, "BizKick transactions"); }
}

async function showDetail(host, id) {
  let d;
  try { d = await api.getEdcsTransaction(id); } catch (err) { host.innerHTML = errorBox(err, id); return; }
  const t = d.transaction;
  const kv = (rows) => `<div class="kv-grid">${rows.map(([k, v]) => `<div class="kv"><span class="kv-key">${escapeHtml(k)}</span><span class="kv-value">${v}</span></div>`).join("")}</div>`;
  const link = t.counterparty_link;
  const suggestions = d.counterparty_suggestions ?? [];
  host.innerHTML = panel(`${t.transaction_id} — ${t.document_type}`, kv([
    ["Counterparty", escapeHtml(t.counterparty_name ?? "—")], ["Subject", escapeHtml(t.subject ?? "—")], ["Revision", escapeHtml(t.revision ?? "")], ["Status", escapeHtml(t.status ?? "")],
    ["Amount", escapeHtml(fmtMoney(t.amount, t.currency || "MYR"))], ["Due", escapeHtml(fmtDate(t.due_date))], ["Module", escapeHtml(t.module ?? "")], ["Classification", escapeHtml(t.classification ?? "")], ["Alert", alertPill(t.alert)]
  ]))
    + panel("Counterparty link", link
      ? `<p>Linked to ${escapeHtml(link.link_type === "CLIENT" ? `client ${link.name ?? link.client_id}` : `supplier ${link.name}`)} — confirmed ${escapeHtml(dt(link.confirmed_at))}. <button class="btn btn-sm" id="bkUnlink" type="button">Unlink</button></p>`
      : suggestions.length
        ? `<p class="field-note">vFirm suggests, you confirm. Nothing is linked or created automatically.</p>${suggestions.map((s) => `<div>${escapeHtml(s.name ?? s.client_id)} ${pill(s.match, "default")} <button class="btn btn-sm bk-link" data-client="${escapeHtml(s.client_id)}" type="button">Link this client</button></div>`).join("")}`
        : `<p class="field-note">No matching client found. The counterparty stays as BizKick named it.</p>`)
    + panel("Revisions", table([{ label: "#", key: "seq" }, { label: "Revision", key: "revision" }, { label: "Kind", render: (r) => pill(r.kind.replace(/_/g, " "), "default") }, { label: "Recorded", render: (r) => escapeHtml(dt(r.created_at)) }, { label: "Note", render: (r) => escapeHtml(r.resolution_note ?? "") }], d.revisions, (r) => String(r.seq)))
    + panel("History", table([{ label: "Run", key: "run_number" }, { label: "Outcome", render: (e) => outcomePill(e.outcome) }, { label: "Changes", render: (e) => escapeHtml(Object.keys(e.changes ?? {}).join(", ")) }, { label: "When", render: (e) => escapeHtml(dt(e.at)) }], d.events, (e) => e.id));
  for (const button of host.querySelectorAll(".bk-link")) button.addEventListener("click", async () => { await api.linkEdcsCounterparty({ transaction_id: id, link_type: "CLIENT", client_id: button.dataset.client, note: "Confirmed from the transaction page" }); await showDetail(host, id); });
  host.querySelector("#bkUnlink")?.addEventListener("click", async () => { await api.linkEdcsCounterparty({ transaction_id: id, link_type: "NONE" }); await showDetail(host, id); });
}

// ---------------- sync history ----------------

async function mountHistory(root) {
  let data;
  try { data = await api.listEdcsSyncRuns(); } catch (err) { root.innerHTML = errorBox(err, "sync history"); return; }
  root.innerHTML = GOLDEN_RULE + panel("Imports", table([
    { label: "#", key: "run_number" },
    { label: "When", render: (r) => escapeHtml(dt(r.started_at)) },
    { label: "Status", render: (r) => pill(r.status, r.status === "COMPLETED" ? "moss" : "rose") },
    { label: "Rows", render: (r) => String(r.rows_total ?? 0) },
    { label: "Created / Updated / Revised", render: (r) => `${r.counts?.CREATED ?? 0} / ${r.counts?.UPDATED ?? 0} / ${r.counts?.REVISED ?? 0}` },
    { label: "Conflicts / Rejected / Missing", render: (r) => `${r.counts?.CONFLICT ?? 0} / ${r.counts?.REJECTED ?? 0} / ${r.counts?.ROW_MISSING ?? 0}` },
    { label: "Source SHA-256", render: (r) => `<code>${escapeHtml(String(r.source_sha256 ?? "").slice(0, 12))}</code>` },
    { label: "", render: (r) => `<button class="btn btn-sm bk-run" data-id="${escapeHtml(r.id)}" type="button">Rows</button>` }
  ], data.runs, (r) => r.id)) + `<div id="bkRun"></div>`;
  for (const button of root.querySelectorAll(".bk-run")) button.addEventListener("click", async () => {
    const host = root.querySelector("#bkRun");
    try {
      const d = await api.getEdcsSyncRun(button.dataset.id);
      host.innerHTML = panel(`Import #${d.run.run_number} — row outcomes`, runSummary(d.run) + table([
        { label: "Row", render: (e) => String(e.row_number ?? "—") }, { label: "Transaction", render: (e) => escapeHtml(e.transaction_id ?? "—") },
        { label: "Outcome", render: (e) => outcomePill(e.outcome) }, { label: "Why", render: (e) => escapeHtml(reasonText(e)) }
      ], d.events, (e) => e.id));
    } catch (err) { host.innerHTML = errorBox(err, "that import"); }
  });
}

// ---------------- conflicts ----------------

async function mountConflicts(root) {
  let data;
  try { data = await api.listEdcsConflicts(); } catch (err) { root.innerHTML = errorBox(err, "conflicts"); return; }
  if (!data.conflicts.length) { root.innerHTML = GOLDEN_RULE + empty("No conflicts. BizKick and vFirm agree."); return; }
  root.innerHTML = GOLDEN_RULE + data.conflicts.map((t) => {
    const held = t.held_conflict;
    const changed = Object.keys(held.incoming ?? {}).filter((k) => String(held.incoming[k] ?? "") !== String(t[k] ?? "") && ["amount", "currency", "counterparty_name", "subject", "due_date", "status", "document_date", "revision"].includes(k));
    return panel(`${t.transaction_id} — ${(held.reasons ?? []).join(", ")}`, `
      ${table([{ label: "Field", key: "field" }, { label: "vFirm record", key: "current" }, { label: "BizKick row (not applied)", key: "incoming" }],
        changed.map((k) => ({ field: k.replace(/_/g, " "), current: String(t[k] ?? "—"), incoming: String(held.incoming[k] ?? "—") })), (r) => r.field)}
      <label>Your note (required) <input class="bk-note" data-id="${escapeHtml(t.transaction_id)}" placeholder="Why this one stands" /></label>
      <button class="btn btn-sm bk-keep" data-id="${escapeHtml(t.transaction_id)}" type="button">Keep vFirm’s record</button>
      <button class="btn btn-primary btn-sm bk-accept" data-id="${escapeHtml(t.transaction_id)}" type="button">Accept BizKick’s row</button>
      <div class="bk-msg" style="min-height:1.2em" data-id="${escapeHtml(t.transaction_id)}"></div>
      <p class="field-note">If you keep vFirm’s record, the next import will hold this row again while BizKick still differs.</p>`);
  }).join("");
  const decide = (choose) => async (event) => {
    const id = event.currentTarget.dataset.id;
    const note = root.querySelector(`.bk-note[data-id="${id}"]`).value.trim();
    const msg = root.querySelector(`.bk-msg[data-id="${id}"]`);
    if (!note) { msg.textContent = "Add a note first."; return; }
    try { await api.resolveEdcsConflict({ transaction_id: id, choose, note }); await mountConflicts(root); } catch (err) { msg.textContent = err.message; }
  };
  for (const b of root.querySelectorAll(".bk-keep")) b.addEventListener("click", decide("KEEP_CURRENT"));
  for (const b of root.querySelectorAll(".bk-accept")) b.addEventListener("click", decide("ACCEPT_INCOMING"));
}

export const BIZKICK_PAGES = {
  "bizkick-connection": mountConnection,
  "bizkick-import": mountImport,
  "bizkick-transactions": mountTransactions,
  "bizkick-history": mountHistory,
  "bizkick-conflicts": mountConflicts,
};
