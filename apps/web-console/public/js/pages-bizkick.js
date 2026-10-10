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

const WARNING_TEXT = {
  UNRESERVED: "number was not reserved on the Number Desk", VOIDED_NUMBER_USED: "this number was voided on the Number Desk",
  RELATED_NOT_FOUND: "related transaction not in the register", CHAIN_MISSING_PREDECESSOR: "no purchase order linked"
};
function warningText(code) {
  const [key, detail] = String(code).split(/:(.*)/s);
  if (key === "RESERVED_FOR_DIFFERENT_COUNTERPARTY") return `reserved for a different counterparty (${detail})`;
  return `${WARNING_TEXT[key] ?? key}${detail && WARNING_TEXT[key] ? ` (${detail})` : ""}`;
}

function reasonText(row) {
  const parts = [...(row.reasons ?? [])];
  const details = row.reason_details ?? [];
  const text = parts.length ? `${parts.join(", ")}${details.length ? ` (${details.join("; ")})` : ""}` : "";
  const warnings = (row.warnings ?? []).map(warningText);
  return [text, warnings.length ? `Note: ${warnings.join("; ")}` : ""].filter(Boolean).join(" — ");
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
      const attention = (result.rows ?? []).filter((r) => ["REJECTED", "CONFLICT", "ROW_MISSING"].includes(r.outcome) || (r.warnings ?? []).some((w) => /^(UNRESERVED|VOIDED_NUMBER_USED|RESERVED_FOR_DIFFERENT_COUNTERPARTY)/.test(w)));
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
    + (d.chain && d.chain.size > 1 ? panel("Chain", `<div style="padding:.75rem 1rem;line-height:1.9">${d.chain.nodes.map((n) => `<div style="margin-left:${n.depth * 1.5}rem">${n.depth ? "↳ " : ""}${n.transaction_id === id ? `<strong>${escapeHtml(n.transaction_id)}</strong> (this one)` : escapeHtml(n.transaction_id)} ${pill(n.status ?? n.document_type, "default")} ${n.flags.map((f) => pill(FLAG_TEXT[f.flag] ?? f.flag, "amber")).join(" ")}</div>`).join("")}</div>`) : "")
    + panel("Files", !d.documents?.linked ? `<p class="field-note">No file linked yet. Upload it on BizKick → Files.</p>` : `<p class="field-note">Filed in the document register as ${escapeHtml(d.documents.document.document_number)}.</p>` + table([
      { label: "Rev", render: (r) => escapeHtml(r.revision) }, { label: "Status", render: (r) => pill(r.status, r.status === "CURRENT" ? "moss" : "default") },
      { label: "File", render: (r) => escapeHtml(r.filename ?? "") }, { label: "Filed", render: (r) => escapeHtml(dt(r.filed_at)) },
      { label: "SHA-256", render: (r) => `<code>${escapeHtml(String(r.content_hash ?? "").slice(0, 12))}</code>` },
      { label: "", render: (r) => r.downloadable ? `<button class="btn btn-sm bk-dl" data-file="${escapeHtml(r.file_id)}" data-name="${escapeHtml(r.filename ?? "download")}" type="button">Download</button>` : `<span class="field-note">details and fingerprint only</span>` }
    ], d.documents.revisions, (r) => r.revision_id))
    + ((d.documents.attachments ?? []).length ? panel("Supporting documents", table([
      { label: "Label", render: (r) => escapeHtml(r.revision) }, { label: "File", render: (r) => escapeHtml(r.filename ?? "") }, { label: "Filed", render: (r) => escapeHtml(dt(r.filed_at)) },
      { label: "", render: (r) => r.downloadable ? `<button class="btn btn-sm bk-dl" data-file="${escapeHtml(r.file_id)}" data-name="${escapeHtml(r.filename ?? "download")}" type="button">Download</button>` : "" }
    ], d.documents.attachments, (r) => r.revision_id)) : "")
    + panel("Revisions", table([{ label: "#", key: "seq" }, { label: "Revision", key: "revision" }, { label: "Kind", render: (r) => pill(r.kind.replace(/_/g, " "), "default") }, { label: "Recorded", render: (r) => escapeHtml(dt(r.created_at)) }, { label: "Note", render: (r) => escapeHtml(r.resolution_note ?? "") }], d.revisions, (r) => String(r.seq)))
    + panel("History", table([{ label: "Run", key: "run_number" }, { label: "Outcome", render: (e) => outcomePill(e.outcome) }, { label: "Changes", render: (e) => escapeHtml(Object.keys(e.changes ?? {}).join(", ")) }, { label: "When", render: (e) => escapeHtml(dt(e.at)) }], d.events, (e) => e.id));
  for (const button of host.querySelectorAll(".bk-link")) button.addEventListener("click", async () => { await api.linkEdcsCounterparty({ transaction_id: id, link_type: "CLIENT", client_id: button.dataset.client, note: "Confirmed from the transaction page" }); await showDetail(host, id); });
  for (const button of host.querySelectorAll(".bk-dl")) button.addEventListener("click", async () => { try { await api.downloadFile(button.dataset.file, button.dataset.name); } catch (err) { button.textContent = err.message; } });
  host.querySelector("#bkUnlink")?.addEventListener("click", async () => { await api.linkEdcsCounterparty({ transaction_id: id, link_type: "NONE" }); await showDetail(host, id); });
}


// ---------------- files (CE-S2) ----------------

const FILE_OUTCOME_TONE = { ATTACHED: "moss", LINKED: "moss", REVISED: "moss", UNCHANGED: "default", UNMATCHED: "amber", ORPHAN: "amber", WRONG_COMPANY: "rose", UNKNOWN_TYPE: "rose" };
const FILE_OUTCOME_TEXT = {
  ATTACHED: "Attached as supporting document", LINKED: "Filed", REVISED: "New revision filed", UNCHANGED: "Same file, nothing changed",
  UNMATCHED: "No Transaction ID in the name", ORPHAN: "Transaction not in the register", WRONG_COMPANY: "Another company's ID", UNKNOWN_TYPE: "Unknown document type"
};

async function mountFiles(root) {
  let data;
  try { data = await api.getEdcsConnection(); } catch (err) { root.innerHTML = errorBox(err, "the BizKick connection"); return; }
  if (!data.connection) { root.innerHTML = GOLDEN_RULE + empty("Connect this firm to BizKick first (BizKick → Connection)."); return; }
  const pending = new Map(); // filename -> File, kept so an unmatched file can be linked by hand without re-choosing it
  const results = [];
  root.innerHTML = GOLDEN_RULE + panel("Upload BizKick documents", `
    <p>Choose the files BizKick produced, for example <code>${escapeHtml(data.connection.company_code)}-QT-2026-0001_R1_Alpha.pdf</code>. vFirm finds the Transaction ID in each name and files it under that transaction.
    A file whose name has no ID is listed below so you can link it yourself. HR and legal documents keep only their details and a fingerprint unless you opted in on the Connection page.</p>
    <input id="bkFiles" type="file" multiple accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg" />
    <label class="check"><input id="bkSupporting" type="checkbox" /> These are supporting documents (for example a bank statement). They are kept with the transaction and never replace its main document.</label>
    <button class="btn btn-primary" id="bkFilesBtn" type="button">Upload and link</button>
    <div id="bkFilesMsg" style="min-height:1.2em"></div>`) + `<div id="bkFilesResult"></div>`;
  const msg = root.querySelector("#bkFilesMsg");
  const draw = () => {
    const host = root.querySelector("#bkFilesResult");
    if (!results.length) { host.innerHTML = ""; return; }
    host.innerHTML = panel("Results", `<div style="overflow-x:auto">` + table([
      { label: "File", render: (r) => escapeHtml(r.filename) },
      { label: "Outcome", render: (r) => pill(FILE_OUTCOME_TEXT[r.outcome] ?? r.outcome, FILE_OUTCOME_TONE[r.outcome] ?? "default") },
      { label: "Transaction", render: (r) => escapeHtml(r.transaction_id ?? "—") },
      { label: "Revision", render: (r) => escapeHtml(r.revision ?? "—") + (r.superseded_revision ? ` <span class="field-note">(${escapeHtml(r.superseded_revision)} superseded)</span>` : "") },
      { label: "Stored", render: (r) => r.content_stored === undefined ? "—" : r.content_stored ? "Content kept" : "Details and fingerprint only" },
      { label: "SHA-256", render: (r) => `<code>${escapeHtml(String(r.sha256 ?? "").slice(0, 12))}</code>` },
      { label: "", render: (r) => (!["LINKED", "REVISED", "UNCHANGED"].includes(r.outcome) && pending.has(r.filename))
        ? `<input class="bk-manual-id" data-name="${escapeHtml(r.filename)}" placeholder="${escapeHtml(data.connection.company_code)}-QT-2026-0001" size="16" style="max-width:11rem" /> <button class="btn btn-sm bk-manual" data-name="${escapeHtml(r.filename)}" type="button">Link</button><div class="field-note">${escapeHtml(r.detail ?? "")}</div>`
        : escapeHtml(r.detail && !["LINKED", "REVISED", "UNCHANGED"].includes(r.outcome) ? r.detail : "") }
    ], results, (r) => `${r.filename}-${r.sha256}`) + `</div>`);
    for (const button of host.querySelectorAll(".bk-manual")) button.addEventListener("click", async () => {
      const name = button.dataset.name;
      const id = host.querySelector(`.bk-manual-id[data-name="${CSS.escape(name)}"]`).value.trim();
      if (!id) return;
      try {
        const outcome = await api.linkEdcsFile(pending.get(name), { transactionId: id });
        const index = results.findIndex((r) => r.filename === name);
        results[index] = outcome;
        if (["LINKED", "REVISED", "UNCHANGED"].includes(outcome.outcome)) pending.delete(name);
      } catch (err) { msg.textContent = err.message; }
      draw();
    });
  };
  root.querySelector("#bkFilesBtn").addEventListener("click", async () => {
    const files = [...root.querySelector("#bkFiles").files];
    if (!files.length) { msg.textContent = "Choose at least one file."; return; }
    msg.textContent = `Uploading ${files.length} file${files.length === 1 ? "" : "s"}…`;
    for (const file of files) {
      try {
        const outcome = await api.linkEdcsFile(file, { role: root.querySelector("#bkSupporting")?.checked ? "SUPPORTING" : "" });
        if (!["LINKED", "REVISED", "UNCHANGED", "ATTACHED"].includes(outcome.outcome)) pending.set(file.name, file);
        results.unshift(outcome);
      } catch (err) {
        results.unshift({ filename: file.name, outcome: "UNMATCHED", detail: err.message, sha256: "" });
      }
    }
    msg.textContent = "";
    draw();
  });
}

// ---------------- chains (CE-S2) ----------------

const FLAG_TEXT = { RELATED_NOT_FOUND: "Related transaction not in the register", MISSING_PREDECESSOR: "Missing predecessor", RELATED_UNEXPECTED_TYPE: "Unexpected predecessor type" };

async function mountChains(root) {
  let data;
  try { data = await api.getEdcsChains(); } catch (err) { root.innerHTML = errorBox(err, "transaction chains"); return; }
  if (!data.chains.length && !data.flags.length) { root.innerHTML = GOLDEN_RULE + empty(data.total_transactions ? "No linked transactions yet. Chains appear when a transaction names a related one." : "Import a register first."); return; }
  root.innerHTML = GOLDEN_RULE
    + statRow([{ value: data.chains.length, label: "Chains" }, { value: data.flags.length, label: "Missing links" }, { value: data.standalone, label: "Standalone" }])
    + (data.flags.length ? panel("Missing links", table([{ label: "Transaction", render: (f) => escapeHtml(f.transaction_id) }, { label: "Flag", render: (f) => pill(FLAG_TEXT[f.flag] ?? f.flag, "amber") }, { label: "Detail", render: (f) => escapeHtml(f.detail) }], data.flags, (f) => `${f.transaction_id}-${f.flag}`)) : "")
    + data.chains.map((chain) => panel(`${chain.family === "SALES" ? "Sales" : chain.family === "PROCUREMENT" ? "Procurement" : "Related"} chain — ${escapeHtml(chain.chain_id)} (${chain.size})`,
      `<div class="bk-chain" style="padding:.75rem 1rem;line-height:1.9">${chain.nodes.map((n) => `<div style="margin-left:${n.depth * 1.5}rem">${n.depth ? "↳ " : ""}<strong>${escapeHtml(n.transaction_id)}</strong> ${pill(n.status ?? n.document_type, "default")} ${n.flags.map((f) => pill(FLAG_TEXT[f.flag] ?? f.flag, "amber")).join(" ")}</div>`).join("")}</div>`)).join("");
}

// ---------------- sync history ----------------

async function mountHistory(root) {
  let data;
  try { data = await api.listEdcsSyncRuns(); } catch (err) { root.innerHTML = errorBox(err, "sync history"); return; }
  root.innerHTML = GOLDEN_RULE + panel("Imports", table([
    { label: "#", key: "run_number" },
    { label: "When", render: (r) => escapeHtml(dt(r.started_at)) },
    { label: "Status", render: (r) => pill(r.status, r.status === "COMPLETED" ? "moss" : "rose") },
    { label: "Source", render: (r) => r.source_kind === "CONNECTOR" ? `Connector <strong>${escapeHtml(r.connector_name ?? "")}</strong>` : r.source_kind === "CLOUD" ? "Microsoft 365" : "Upload" },
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

// ---------------- number desk (CE-S4) ----------------

const NUMBER_TONE = { RESERVED: "amber", REGISTERED: "moss", VOID: "default" };

async function mountNumbers(root) {
  let data;
  const draw = async (extra = "") => {
    try { data = await api.listEdcsNumbers(extra); } catch (err) { root.innerHTML = errorBox(err, "the Number Desk"); return false; }
    return true;
  };
  if (!(await draw())) return;
  if (!data.connected) { root.innerHTML = GOLDEN_RULE + empty("Connect this firm to BizKick first (BizKick → Connection)."); return; }
  const render = () => {
    const year = new Date().getFullYear();
    root.innerHTML = GOLDEN_RULE
      + panel("Reserve a number", `
        <form id="bkNumForm" class="form-grid" style="display:grid;gap:.75rem;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));padding:1rem">
          <label style="display:grid;gap:.25rem">Document type <select id="bkNumType" style="width:100%">${data.types.map((t) => `<option value="${escapeHtml(t.code)}">${escapeHtml(t.code)} — ${escapeHtml(t.name)}</option>`).join("")}</select></label>
          <label style="display:grid;gap:.25rem">Year <input id="bkNumYear" type="number" min="2000" max="2100" value="${year}" style="width:100%" /></label>
          <label style="display:grid;gap:.25rem">Purpose <input id="bkNumPurpose" maxlength="200" placeholder="e.g. Quotation for Alpha Tech" style="width:100%" /></label>
          <label style="display:grid;gap:.25rem">Counterparty (optional) <input id="bkNumCounterparty" maxlength="200" style="width:100%" /></label>
          <label style="display:grid;gap:.25rem">Subject (optional) <input id="bkNumSubject" maxlength="300" style="width:100%" /></label>
          <div class="form-actions"><button class="btn btn-primary" id="bkNumReserve" type="submit">Reserve next number</button></div>
          <div id="bkNumMsg" style="min-height:1.2em"></div>
        </form>
        <p class="field-note">Numbers come from vFirm, one at a time, for everyone in the firm. A number that is cancelled is never given out again. Use the number as the document's ID in BizKick.</p>`)
      + statRow([{ value: data.counts.RESERVED, label: "Reserved" }, { value: data.counts.REGISTERED, label: "In the register" }, { value: data.counts.VOID, label: "Voided" }])
      + (data.stale.length ? panel(`Reserved, not in the register after ${data.stale_days} days`, `<div style="overflow-x:auto">` + table([
        { label: "Number", render: (r) => `<code>${escapeHtml(r.transaction_id)}</code>` }, { label: "Purpose", render: (r) => escapeHtml(r.purpose) }, { label: "Reserved", render: (r) => escapeHtml(dt(r.reserved_at)) },
        { label: "", render: (r) => `<button class="btn btn-sm bk-num-void" data-id="${escapeHtml(r.transaction_id)}" type="button">Void</button>` }
      ], data.stale, (r) => r.id) + `</div>`) : "")
      + panel("Reservations", data.reservations.length ? `<div style="overflow-x:auto">` + table([
        { label: "Number", render: (r) => `<code>${escapeHtml(r.transaction_id)}</code> <button class="btn btn-sm bk-num-copy" data-id="${escapeHtml(r.transaction_id)}" type="button">Copy</button>` },
        { label: "Status", render: (r) => pill(r.status === "REGISTERED" ? "In the register" : r.status === "VOID" ? "Voided" : "Reserved", NUMBER_TONE[r.status] ?? "default") },
        { label: "Purpose", render: (r) => escapeHtml(r.purpose) + (r.status === "VOID" && r.void_reason ? ` <span class="field-note">(${escapeHtml(r.void_reason)})</span>` : "") },
        { label: "Counterparty", render: (r) => escapeHtml(r.counterparty ?? "—") },
        { label: "Reserved", render: (r) => escapeHtml(dt(r.reserved_at)) },
        { label: "", render: (r) => r.status === "RESERVED" ? `<button class="btn btn-sm bk-num-void" data-id="${escapeHtml(r.transaction_id)}" type="button">Void</button>` : "" }
      ], data.reservations, (r) => r.id) + `</div>` : `<p class="field-note">No numbers reserved yet.</p>`)
      + (data.heads.length ? panel("Next numbers", table([{ label: "Type", key: "document_type" }, { label: "Year", key: "year" }, { label: "Last used", render: (h) => String(h.last) }, { label: "Next", render: (h) => h.next ? `<code>${escapeHtml(h.next)}</code>` : "Used up" }], data.heads, (h) => `${h.document_type}-${h.year}`)) : "");
    const msg = root.querySelector("#bkNumMsg");
    root.querySelector("#bkNumForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      msg.textContent = "Reserving…";
      try {
        const result = await api.reserveEdcsNumber({ document_type: root.querySelector("#bkNumType").value, year: Number(root.querySelector("#bkNumYear").value), purpose: root.querySelector("#bkNumPurpose").value, counterparty: root.querySelector("#bkNumCounterparty").value, subject: root.querySelector("#bkNumSubject").value });
        await draw(); render();
        root.querySelector("#bkNumMsg").textContent = `Reserved ${result.reservation.transaction_id}.`;
      } catch (err) { msg.textContent = err.message; }
    });
    for (const button of root.querySelectorAll(".bk-num-copy")) button.addEventListener("click", async () => { try { await navigator.clipboard.writeText(button.dataset.id); button.textContent = "Copied"; } catch { button.textContent = "Select and copy"; } });
    for (const button of root.querySelectorAll(".bk-num-void")) button.addEventListener("click", async () => {
      const reason = window.prompt(`Why void ${button.dataset.id}? It will never be given out again.`);
      if (!reason) return;
      try { await api.voidEdcsNumber({ transaction_id: button.dataset.id, reason }); await draw(); render(); } catch (err) { msg.textContent = err.message; }
    });
  };
  render();
}

// ---------------- rules (CE-S3) ----------------

const RULE_STATUS_TEXT = { CREATED: "Request raised", ERROR: "Failed", CLAIMED: "In progress" };

async function mountRules(root) {
  let data;
  try { data = await api.listAutomationRules(); } catch (err) { root.innerHTML = errorBox(err, "BizKick rules"); return; }
  const msgBox = `<div id="bkRuleMsg" style="min-height:1.2em"></div><div id="bkRulePreview"></div><div id="bkRuleActivity"></div>`;
  const rules = data.rules ?? [];
  root.innerHTML = GOLDEN_RULE
    + panel("Your rules", rules.length ? table([
      { label: "Rule", render: (r) => `<strong>${escapeHtml(r.name)}</strong><div class="field-note">${escapeHtml(r.description ?? "")}</div>` },
      { label: "State", render: (r) => pill(r.enabled ? "On" : "Off", r.enabled ? "moss" : "default") },
      { label: "Raised", render: (r) => String(r.activity?.created ?? 0) + (r.activity?.errors ? ` <span class="field-note">(${r.activity.errors} failed)</span>` : "") },
      { label: "", render: (r) => `<div style="white-space:nowrap"><button class="btn btn-sm bk-rule-dry" data-id="${escapeHtml(r.id)}" type="button">Preview</button> `
        + `<button class="btn btn-sm bk-rule-toggle" data-id="${escapeHtml(r.id)}" data-on="${r.enabled ? "1" : ""}" type="button">${r.enabled ? "Turn off" : "Turn on"}</button> `
        + `<button class="btn btn-sm bk-rule-log" data-id="${escapeHtml(r.id)}" type="button">Activity</button></div>` }
    ], rules, (r) => r.id) + `<div class="form-actions"><button class="btn btn-primary" id="bkRunNow" type="button">Run rules now</button></div>` : `<p class="field-note">No rules yet. Add one from the templates below.</p>`)
    + msgBox
    + panel("Templates", table([
      { label: "Template", render: (t) => `<strong>${escapeHtml(t.name)}</strong><div class="field-note">${escapeHtml(t.description ?? "")}</div>` },
      { label: "Raises", render: (t) => escapeHtml(t.request_type ?? "") },
      { label: "", render: (t) => t.installed ? pill("Added", "default") : `<button class="btn btn-sm bk-rule-add" data-id="${escapeHtml(t.template_id)}" type="button">Add (starts off)</button>` }
    ], data.templates ?? [], (t) => t.template_id));
  const msg = root.querySelector("#bkRuleMsg");
  const reload = async () => { await mountRules(root); };
  const guard = (fn) => async (event) => { msg.textContent = "Working…"; try { await fn(event); } catch (err) { msg.textContent = err.message; } };
  for (const b of root.querySelectorAll(".bk-rule-add")) b.addEventListener("click", guard(async () => { await api.createAutomationRule({ template_id: b.dataset.id }); await reload(); }));
  for (const b of root.querySelectorAll(".bk-rule-dry")) b.addEventListener("click", guard(async () => {
    const d = await api.dryRunAutomationRule({ rule_id: b.dataset.id });
    msg.textContent = d.summary ?? "";
    root.querySelector("#bkRulePreview").innerHTML = panel(`Preview — as of ${escapeHtml(fmtDate(d.as_of))}`, (d.would_create ?? []).length ? table([
      { label: "Transaction", render: (m) => escapeHtml(m.transaction_id) }, { label: "Request", render: (m) => escapeHtml(m.title) },
      { label: "Why", render: (m) => escapeHtml(m.reason ?? "") }, { label: "Files", render: (m) => String(m.file_count ?? 0) }
    ], d.would_create, (m) => `${m.transaction_id}-${m.occurrence_key}`) : `<p class="field-note">Nothing would be created right now.${d.older_than_rule ? ` ${d.older_than_rule} older transaction(s) are ignored because this rule only acts on new events.` : ""}</p>`);
  }));
  for (const b of root.querySelectorAll(".bk-rule-toggle")) b.addEventListener("click", guard(async () => { await api.setAutomationRuleEnabled({ rule_id: b.dataset.id, enabled: !b.dataset.on }); await reload(); }));
  for (const b of root.querySelectorAll(".bk-rule-log")) b.addEventListener("click", guard(async () => {
    const a = await api.getAutomationActivity(b.dataset.id);
    msg.textContent = "";
    root.querySelector("#bkRuleActivity").innerHTML = panel(`Activity — ${escapeHtml(a.rule?.name ?? "")}`, (a.occurrences ?? []).length ? table([
      { label: "Transaction", render: (o) => escapeHtml(o.transaction_id) }, { label: "Result", render: (o) => pill(RULE_STATUS_TEXT[o.status] ?? o.status, o.status === "CREATED" ? "moss" : o.status === "ERROR" ? "rose" : "default") },
      { label: "Request", render: (o) => escapeHtml(o.work_request_number ?? "—") },
      { label: "Assignment", render: (o) => escapeHtml(o.assignment ? (o.assignment.outcome === "REFUSED" ? `Refused — in Inbox (${o.assignment.message ?? ""})` : o.assignment.outcome === "ASSIGNED" ? `Assigned to ${o.assignment.staff_code}` : "Waiting in Inbox") : "") },
      { label: "When", render: (o) => escapeHtml(dt(o.at)) }
    ], a.occurrences, (o) => o.id) : `<p class="field-note">This rule has not raised anything yet.</p>`);
  }));
  root.querySelector("#bkRunNow")?.addEventListener("click", guard(async () => {
    const r = await api.runAutomationNow({});
    msg.textContent = r.created.length ? `Raised ${r.created.length} request(s): ${r.created.map((c) => c.request_number).join(", ")}.` : "Nothing new to raise.";
  }));
}

// ---------------- approval limits / delegation of authority (CE-S5) ----------------

const LIMIT_FIELD_TEXT = { MONEY: (n) => `RM ${Number(n).toLocaleString("en-US")}`, PERCENT: (n) => `${n}%` };
const limitText = (row, tier) => LIMIT_FIELD_TEXT[row.kind](row[tier].limit);
const mappingText = (entry) => [entry.owner ? "the firm owner" : null, ...(entry.roles ?? [])].filter(Boolean).join(", ") || "—";

function policyView(policy) {
  const labels = Object.values(policy.label_map ?? {});
  return panel(`Approval policy v${policy.version} — ${escapeHtml(policy.status === "ACTIVE" ? "in force" : "replaced")}`, `
    <p class="field-note">From ${escapeHtml(policy.source_filename ?? "a workbook")}, imported ${escapeHtml(dt(policy.imported_at))}.${policy.superseded_by_version ? ` Replaced by v${policy.superseded_by_version}.` : ""}</p>
    <div style="overflow-x:auto">${table([
      { label: "Transaction type", render: (r) => escapeHtml(r.transaction_type) },
      { label: "Tier 1 up to", render: (r) => escapeHtml(limitText(r, "tier1")) },
      { label: "Tier 1 approver", render: (r) => escapeHtml(r.tier1.approver) },
      { label: "Tier 2 up to", render: (r) => escapeHtml(limitText(r, "tier2")) },
      { label: "Tier 2 approver", render: (r) => escapeHtml(r.tier2.approver) },
      { label: "Above", render: (r) => escapeHtml(r.above_approver) },
      { label: "Enforced", render: (r) => (r.kind === "PERCENT" ? pill("recorded only", "default") : pill("yes", "moss")) }
    ], policy.limits, (r) => r.key)}</div>`)
    + panel("Who holds each approver label", table([{ label: "BizKick label", render: (e) => escapeHtml(e.label) }, { label: "In vFirm", render: (e) => escapeHtml(mappingText(e)) }], labels, (e) => e.label))
    + panel("Document types under a limit", Object.keys(policy.document_types ?? {}).length
      ? table([{ label: "Document", render: (r) => `<code>${escapeHtml(r[0])}</code>` }, { label: "Limit row", render: (r) => escapeHtml(r[1]) }], Object.entries(policy.document_types), (r) => r[0])
      : `<p class="field-note">No document type is mapped to a limit, so nothing is enforced yet.</p>`)
    + ((policy.rejected_limits?.length ?? 0) + (policy.rejected_matrix?.length ?? 0) ? panel("Rows that were not used", table([{ label: "Row", key: "row_number" }, { label: "Name", render: (r) => escapeHtml(r.name ?? "—") }, { label: "Why", render: (r) => escapeHtml((r.reason_details ?? []).join("; ")) }], [...(policy.rejected_limits ?? []), ...(policy.rejected_matrix ?? [])], (r) => `${r.row_number}-${r.name}`)) : "");
}

async function mountDelegation(root) {
  let data;
  const load = async (version = "") => {
    try { data = await api.getEdcsDelegation(version); } catch (err) { root.innerHTML = errorBox(err, "the approval limits"); return false; }
    return true;
  };
  if (!(await load())) return;
  let shown = data.selected;
  const render = () => {
    root.innerHTML = GOLDEN_RULE
      + panel("How this works", `<p>Upload your BizKick Master Control Workbook (BK-SYS-003). vFirm reads the <strong>Approval Limits</strong> and <strong>Responsibility Matrix</strong> sheets, you say who holds each approver label and which documents the limits cover, and from then on a draft raised from a transaction can only be approved by someone with the right level. You are never blocked: the firm owner can always approve. Work that did not come from BizKick is not affected.</p>`)
      + (shown ? policyView(shown) : empty("No approval limits imported yet."))
      + panel(data.active ? "Update from a new workbook" : "Import your approval limits", `
        <input id="bkDelFile" type="file" accept=".xlsx" />
        <button class="btn btn-primary" id="bkDelPreview" type="button">Read workbook</button>
        <div id="bkDelMsg" style="min-height:1.2em"></div><div id="bkDelPreviewBox"></div>`)
      + (data.versions.length ? panel("Versions", table([
        { label: "Version", render: (v) => `v${v.version}` }, { label: "Status", render: (v) => pill(v.status === "ACTIVE" ? "In force" : "Replaced", v.status === "ACTIVE" ? "moss" : "default") },
        { label: "From", render: (v) => escapeHtml(v.source_filename ?? "—") }, { label: "Imported", render: (v) => escapeHtml(dt(v.imported_at)) },
        { label: "Changes", render: (v) => escapeHtml(v.change_summary ? `${v.change_summary.counts.added} added, ${v.change_summary.counts.changed} changed, ${v.change_summary.counts.removed} removed` : "—") },
        { label: "", render: (v) => `<button class="btn btn-sm bk-del-view" data-version="${v.version}" type="button">View</button>` }
      ], data.versions, (v) => String(v.version))) : "");
    for (const button of root.querySelectorAll(".bk-del-view")) button.addEventListener("click", async () => {
      if (await load(button.dataset.version)) { shown = data.selected; render(); }
    });
    const msg = root.querySelector("#bkDelMsg");
    root.querySelector("#bkDelPreview").addEventListener("click", async () => {
      const file = root.querySelector("#bkDelFile").files[0];
      if (!file) { msg.textContent = "Choose the workbook first."; return; }
      msg.textContent = "Uploading and reading the workbook…";
      try {
        const uploaded = await api.uploadFile(file, { classification: "CLIENT_CONFIDENTIAL", purpose: "WORK_INPUT" });
        const preview = await api.previewEdcsDelegation({ file_id: uploaded.id });
        msg.textContent = "";
        drawPreview(uploaded.id, preview);
      } catch (err) { msg.textContent = err.message; }
    });
  };
  const drawPreview = (fileId, preview) => {
    const box = root.querySelector("#bkDelPreviewBox");
    const typeOptions = (current) => ["", ...preview.mappable_transaction_types].map((name) => `<option value="${escapeHtml(name)}" ${name === (current ?? "") ? "selected" : ""}>${name ? escapeHtml(name) : "(no limit)"}</option>`).join("");
    box.innerHTML = `<h4>Step 1 — who holds each approver label?</h4>
      <p class="field-note">Type the role codes your people have in vFirm, separated by commas (for example FINANCE_MANAGER). Tick “firm owner” where the label means you.</p>
      <div style="overflow-x:auto">${table([
        { label: "BizKick label", render: (e) => escapeHtml(e.label) },
        { label: "Used for", render: (e) => escapeHtml(e.used_in.map((u) => `${u.transaction_type} T${u.tier}`).join(", ")) },
        { label: "Firm owner", render: (e) => `<input type="checkbox" class="bk-del-owner" data-label="${escapeHtml(e.label)}" ${e.suggested.owner ? "checked" : ""} />` },
        { label: "Roles", render: (e) => `<input class="bk-del-roles" data-label="${escapeHtml(e.label)}" value="${escapeHtml((e.suggested.roles ?? []).join(", "))}" placeholder="e.g. FINANCE_MANAGER" style="width:100%" />` }
      ], preview.approver_labels, (e) => e.key)}</div>
      <h4>Step 2 — which documents does each limit cover?</h4>
      <p class="field-note">Only amounts in RM can be checked. A document in another currency always needs the top level. Percentage limits are recorded but not enforced.</p>
      ${preview.mappable_transaction_types.length ? `<div style="overflow-x:auto">${table([
        { label: "Document", render: (r) => `<code>${escapeHtml(r.document_type)}</code>` },
        { label: "Limit row", render: (r) => `<select class="bk-del-type" data-type="${escapeHtml(r.document_type)}">${typeOptions(r.suggested)}</select>` }
      ], preview.document_types, (r) => r.document_type)}</div>` : `<p class="field-note">This workbook has no amount limits to apply.</p>`}
      ${(preview.limits.rejected.length + preview.responsibilities.rejected.length) ? `<div class="error-box"><strong>${preview.limits.rejected.length + preview.responsibilities.rejected.length} row(s) cannot be used and will be left out:</strong><br>${[...preview.limits.rejected, ...preview.responsibilities.rejected].map((r) => `Row ${r.row_number} (${escapeHtml(r.name ?? "blank")}): ${escapeHtml((r.reason_details ?? []).join("; "))}`).join("<br>")}</div>` : ""}
      <p><button class="btn btn-primary" id="bkDelImport" type="button">Confirm and import</button> <span id="bkDelImportMsg"></span></p>`;
    box.querySelector("#bkDelImport").addEventListener("click", async () => {
      const out = box.querySelector("#bkDelImportMsg");
      const label_map = {};
      for (const entry of preview.approver_labels) {
        const owner = box.querySelector(`.bk-del-owner[data-label="${CSS.escape(entry.label)}"]`)?.checked === true;
        const roles = (box.querySelector(`.bk-del-roles[data-label="${CSS.escape(entry.label)}"]`)?.value ?? "").split(",").map((r) => r.trim()).filter(Boolean);
        label_map[entry.label] = { owner, roles };
      }
      const document_types = {};
      for (const select of box.querySelectorAll(".bk-del-type")) if (select.value) document_types[select.dataset.type] = select.value;
      out.textContent = "Importing…";
      try {
        const result = await api.importEdcsDelegation({ file_id: fileId, label_map, document_types });
        if (result.outcome === "NO_CHANGE") { out.textContent = result.message; return; }
        await load();
        shown = data.selected;
        render();
        root.querySelector("#bkDelMsg").textContent = `Imported as version ${result.policy.version}: ${result.counts.added} added, ${result.counts.changed} changed, ${result.counts.removed} removed.`;
      } catch (err) {
        const details = err.details?.errors ?? err.payload?.error?.details?.errors;
        out.textContent = details ? `${err.message} ${details.map((d) => d.detail).join(" ")}` : err.message;
      }
    });
  };
  render();
}

// ---------------- connector (CE-S6) ----------------

const HEALTH_TEXT = { OK: ["Healthy", "moss"], ERRORS: ["Has errors", "amber"], STALE: ["Not heard from", "rose"], NEVER_SEEN: ["Never connected", "default"], REVOKED: ["Revoked", "rose"] };
const healthPill = (health) => { const [text, tone] = HEALTH_TEXT[health] ?? [health, "default"]; return pill(text, tone); };

async function mountConnector(root) {
  let data;
  try { data = await api.listEdcsConnectors(); } catch (err) { root.innerHTML = errorBox(err, "BizKick connectors"); return; }
  const connectors = data.connectors ?? [];
  root.innerHTML = GOLDEN_RULE
    + panel("Connectors", connectors.length ? table([
      { label: "Connector", render: (c) => `<strong>${escapeHtml(c.name)}</strong><div class="field-note">Topology ${escapeHtml(c.topology)} · token ${escapeHtml(c.token_prefix ?? "")}…${c.host ? ` · ${escapeHtml(c.host)}` : ""}${c.agent_version ? ` · v${escapeHtml(c.agent_version)}` : ""}</div>` },
      { label: "Health", render: (c) => healthPill(c.health) + (c.status === "REVOKED" && c.refused_count ? `<div class="field-note">${c.refused_count} refused attempt(s)</div>` : "") },
      { label: "Last seen", render: (c) => escapeHtml(dt(c.last_seen_at)) },
      { label: "Last sync", render: (c) => c.last_run_number ? `#${c.last_run_number} ${escapeHtml(c.last_run_status ?? "")}<div class="field-note">${escapeHtml(dt(c.last_sync_at))}</div>` : "—" },
      { label: "Waiting to send", render: (c) => String(c.queue_length ?? 0) },
      { label: "Errors", render: (c) => c.last_error ? `<span class="field-note">${escapeHtml(c.last_error)}</span>` : (c.error_count ? `${c.error_count} earlier` : "None") },
      { label: "", render: (c) => c.status === "REVOKED" ? "" : `<div style="white-space:nowrap"><button class="btn btn-sm bk-con-rotate" data-id="${escapeHtml(c.id)}" type="button">New token</button> <button class="btn btn-sm bk-con-revoke" data-id="${escapeHtml(c.id)}" type="button">Revoke</button></div>` }
    ], connectors, (c) => c.id) : `<p class="field-note">No connector yet. Register one, then install the program on the PC that holds BizKick.</p>`)
    + `<div id="bkConMsg" style="min-height:1.2em"></div><div id="bkConToken"></div>`
    + panel("Register a connector", `<div class="form-grid">
        <label class="field"><span>Name</span><input id="bkConName" type="text" maxlength="80" placeholder="Office PC" /></label>
        <label class="field"><span>Where is BizKick?</span><select id="bkConTopology"><option value="A">On the PC the connector runs on</option><option value="C">On a shared folder (network path)</option></select></label>
      </div><div class="form-actions"><button class="btn btn-primary" id="bkConIssue" type="button">Register connector</button></div>`);
  const msg = root.querySelector("#bkConMsg");
  const guard = (fn) => async (event) => { msg.textContent = "Working…"; try { await fn(event); msg.textContent = ""; } catch (err) { msg.textContent = err.message; } };
  const tokenPanel = (heading, result) => panel(heading, `<p class="field-note">${escapeHtml(result.token_notice ?? "")}</p><p><code id="bkConTokenValue" style="user-select:all">${escapeHtml(result.token)}</code></p>`);
  // Two clicks, no pop-up: the first arms the button, the second does it.
  const confirmed = (button, text) => {
    if (button.dataset.armed) return true;
    button.dataset.armed = "1";
    button.textContent = text;
    msg.textContent = "Click the button again to confirm.";
    return false;
  };
  root.querySelector("#bkConIssue").addEventListener("click", guard(async () => {
    const result = await api.issueEdcsConnector({ name: root.querySelector("#bkConName").value, topology: root.querySelector("#bkConTopology").value });
    await mountConnector(root);
    root.querySelector("#bkConToken").innerHTML = tokenPanel("Connector registered — copy its token now", result);
  }));
  for (const b of root.querySelectorAll(".bk-con-rotate")) b.addEventListener("click", guard(async () => {
    if (!confirmed(b, "Confirm: new token (the old one stops working now)")) return;
    const result = await api.rotateEdcsConnector({ connector_id: b.dataset.id });
    await mountConnector(root);
    root.querySelector("#bkConToken").innerHTML = tokenPanel("New token — copy it now", result);
  }));
  for (const b of root.querySelectorAll(".bk-con-revoke")) b.addEventListener("click", guard(async () => {
    if (!confirmed(b, "Confirm: revoke (cannot be undone)")) return;
    await api.revokeEdcsConnector({ connector_id: b.dataset.id });
    await mountConnector(root);
  }));
}

// ---------------- Microsoft 365 (CE-S7) ----------------

const GRAPH_TONE = { ACTIVE: "moss", ACCESS_LOST: "rose", DISCONNECTED: "default" };

async function mountMicrosoft(root) {
  let data;
  try { data = await api.getEdcsGraph(); } catch (err) { root.innerHTML = errorBox(err, "the Microsoft 365 connection"); return; }
  const g = data.graph;
  const live = g && g.status !== "DISCONNECTED";
  const f = (id, label, value, extra = "") => `<label class="field"><span>${label}</span><input id="${id}" type="text" value="${escapeHtml(value ?? "")}" ${extra} /></label>`;
  const status = g ? `<p>${pill(g.status_text ?? g.status, GRAPH_TONE[g.status] ?? "default")}
      ${g.status === "ACCESS_LOST" ? `<span class="field-note"> Microsoft no longer accepts vFirm's access. Syncing has stopped. Ask your IT admin to check the app, then press "Save and check access".</span>` : ""}</p>
    ${statRow([
      { value: g.last_run_number ? `#${g.last_run_number}` : "—", label: "Last register run" },
      { value: g.error_count ?? 0, label: "Errors so far" }
    ])}
    <p class="field-note">Library folder: <strong>${escapeHtml(g.folder_path ?? "")}</strong> · register: <strong>${escapeHtml(g.register_path ?? "")}</strong> · app secret ${g.has_secret ? `stored encrypted (${escapeHtml(g.secret_hint ?? "")})` : "erased"}</p>
    <p class="field-note">Last read: ${escapeHtml(dt(g.last_sync_at))}${g.last_sync_status ? ` — ${escapeHtml(g.last_sync_status)}` : ""}</p>
    ${g.last_error ? `<p class="field-note">Last problem: ${escapeHtml(g.last_error)} (${escapeHtml(dt(g.last_error_at))})</p>` : ""}` : `<p class="field-note">Not connected. vFirm reads nothing from Microsoft 365 until the owner connects it.</p>`;
  const folders = (g?.controlled_folders ?? []).map((c) => c.path + (c.role === "SUPPORTING" ? " (supporting)" : "")).join("\n");
  root.innerHTML = GOLDEN_RULE
    + (data.secret_key_configured ? "" : `<div class="notice">This server has no VFIRM_SECRET_KEY yet, so it cannot store a Microsoft 365 secret. Add it in the hosting settings first.</div>`)
    + panel("Status", status + (live ? `<div class="form-actions"><button class="btn" id="msSync" type="button">Read now</button> <button class="btn btn-sm" id="msDisconnect" type="button">Disconnect</button></div>` : ""))
    + `<div id="msMsg" style="min-height:1.2em"></div>`
    + panel(live ? "Change the connection / check access again" : "Connect Microsoft 365", `
      <p class="field-note">Your IT admin creates an app in Microsoft Entra with only the <strong>Sites.Selected</strong> permission and grants it read access to the one site. See the Entra guide for the steps. Never send the secret by email or chat; type it here only.</p>
      <div class="form-grid">
        ${f("msTenant", "Directory (tenant) ID", g?.ms_tenant_id)}
        ${f("msClient", "Application (client) ID", g?.client_id)}
        <label class="field"><span>Client secret value ${g?.has_secret ? "(leave empty to keep the stored one)" : ""}</span><input id="msSecret" type="password" autocomplete="new-password" value="" /></label>
        ${f("msDrive", "Document library (drive) ID", g?.drive_id)}
        ${f("msFolder", "The one folder vFirm may read", g?.folder_path, 'placeholder="BizKick"')}
        ${f("msRegister", "Register file inside that folder", g?.register_path, 'placeholder="EDCS/register.xlsx"')}
        <label class="field"><span>Controlled folders inside it (one per line)</span><textarea id="msControlled" rows="3" placeholder="Sales\nPurchases">${escapeHtml(folders)}</textarea></label>
      </div>
      <div class="form-actions"><button class="btn btn-primary" id="msSave" type="button">Save and check access</button></div>`);
  const msg = root.querySelector("#msMsg");
  const guard = (fn) => async () => { msg.textContent = "Working…"; try { await fn(); msg.textContent = ""; } catch (err) { msg.textContent = err.message; } };
  root.querySelector("#msSave").addEventListener("click", guard(async () => {
    const body = {
      ms_tenant_id: root.querySelector("#msTenant").value, client_id: root.querySelector("#msClient").value, drive_id: root.querySelector("#msDrive").value,
      folder_path: root.querySelector("#msFolder").value, register_path: root.querySelector("#msRegister").value,
      controlled_folders: root.querySelector("#msControlled").value.split("\n").map((line) => line.trim()).filter(Boolean)
    };
    const secret = root.querySelector("#msSecret").value;
    if (secret) body.client_secret = secret;
    await api.connectEdcsGraph(body);
    await mountMicrosoft(root);
    const m = root.querySelector("#msMsg"); if (m) m.textContent = "Connected. Microsoft accepted the app and the folder opened.";
  }));
  root.querySelector("#msSync")?.addEventListener("click", guard(async () => {
    const result = await api.syncEdcsGraph({});
    await mountMicrosoft(root);
    const s = result.summary;
    const m = root.querySelector("#msMsg");
    if (m) m.textContent = result.skipped ? `Skipped (${result.reason}).` : result.access_lost ? "Microsoft stopped the access." : result.failed ? `Problem: ${result.error}` : `Read done: register ${String(s.register).toLowerCase().replace(/_/g, " ")}, ${s.files.linked + s.files.revised} file(s) filed, ${s.files.unchanged} unchanged.`;
  }));
  const dis = root.querySelector("#msDisconnect");
  dis?.addEventListener("click", guard(async () => {
    if (!dis.dataset.armed) { dis.dataset.armed = "1"; dis.textContent = "Confirm: disconnect and erase the stored secret"; msg.textContent = "Click again to confirm."; return; }
    await api.disconnectEdcsGraph({});
    await mountMicrosoft(root);
  }));
}

// ---------------- drafting (CE-S8) ----------------

const DRAFT_TONE = { PENDING_APPROVAL: "amber", APPROVED: "moss", DELIVERED: "moss", REJECTED: "rose", CANCELLED: "default" };
const DRAFT_TEXT = { PENDING_APPROVAL: "Waiting for approval", APPROVED: "Approved", DELIVERED: "Delivered", REJECTED: "Rejected", CANCELLED: "Cancelled" };

async function mountDrafting(root) {
  let company;
  let drafts;
  try { [company, drafts] = await Promise.all([api.getEdcsCompany(), api.listEdcsDrafts()]); } catch (err) { root.innerHTML = errorBox(err, "drafting"); return; }
  const profile = company.company ?? {};
  const templates = company.templates ?? [];
  const num = (value) => (value === "" || value === undefined ? 0 : Number(value));
  const today = new Date().toISOString().slice(0, 10);
  let lines = [{ description: "", qty: 1, unit: "unit", unit_price: "", discount_percent: "" }];
  const state = { templateId: templates[0]?.id ?? "" };
  const field = (id, label, value, extra = "") => `<label class="field"><span>${label}</span><input id="${id}" type="text" value="${escapeHtml(value ?? "")}" ${extra} /></label>`;

  const companyPanel = panel(profile.legal_name ? "Company details" : "Company details — fill these in once", `
    <p class="field-note">These go on the Setup sheet of every document vFirm prepares. Only the firm owner can change them.</p>
    <div class="form-grid">
      ${company.fields.map((f) => field(`dfc_${f.key}`, `${escapeHtml(f.label)}${f.required ? " *" : ""}`, profile[f.key], `maxlength="${f.max}"`)).join("")}
      ${field("dfc_default_tax_rate", "Default tax rate (%)", profile.default_tax_rate ?? 0)}
      ${field("dfc_default_payment_days", "Default payment terms (days)", profile.default_payment_days ?? 30)}
      ${field("dfc_default_validity_days", "Default quotation validity (days)", profile.default_validity_days ?? 30)}
      ${field("dfc_default_delivery_days", "Default PO delivery period (days)", profile.default_delivery_days ?? 14)}
    </div>
    <div class="form-actions"><button class="btn" id="dfCompanySave" type="button">Save company details</button></div>`);

  const draftsPanel = panel("Drafts", drafts.drafts.length ? `<div style="overflow-x:auto">` + table([
    { label: "Number", render: (d) => `<code>${escapeHtml(d.transaction_id)}</code><div class="field-note">${escapeHtml(d.template_name)} · ${escapeHtml(d.filename)}</div>` },
    { label: "For", render: (d) => escapeHtml(d.counterparty ?? "—") },
    { label: "Total", render: (d) => escapeHtml(fmtMoney(d.totals?.grand, d.totals?.currency)) },
    { label: "Status", render: (d) => pill(DRAFT_TEXT[d.status] ?? d.status, DRAFT_TONE[d.status] ?? "default") + (d.registered ? ` ${pill("In the register", "moss")}` : "") + (d.status === "PENDING_APPROVAL" && d.approval_summary ? `<div class="field-note">${escapeHtml(d.approval_summary)}</div>` : "") + (d.decision_reason && ["REJECTED", "CANCELLED"].includes(d.status) ? `<div class="field-note">${escapeHtml(d.decision_reason)}</div>` : "") + ((d.warnings ?? []).length ? `<div class="field-note">Note: ${d.warnings.map(escapeHtml).join(" ")}</div>` : "") },
    { label: "", render: (d) => d.status === "PENDING_APPROVAL"
      ? `<div style="white-space:nowrap"><button class="btn btn-sm btn-primary df-approve" data-id="${escapeHtml(d.id)}" type="button">Approve</button> <button class="btn btn-sm df-reject" data-id="${escapeHtml(d.id)}" type="button">Reject</button> <button class="btn btn-sm df-cancel" data-id="${escapeHtml(d.id)}" type="button">Cancel</button></div>`
      : (d.status === "APPROVED" || d.status === "DELIVERED") ? `<button class="btn btn-sm btn-primary df-download" data-id="${escapeHtml(d.id)}" data-name="${escapeHtml(d.filename)}" type="button">Download</button>` : "" }
  ], drafts.drafts, (d) => d.id) + `</div>
    <label class="field"><span>Reason (needed to reject or cancel)</span><input id="dfReason" type="text" maxlength="300" /></label>
    <p class="field-note">After you download the file, move it into your BizKick folder, add its row to the register, and the next sync links it. If a connector with the outbox switched on is installed, approved files also appear in its _vFirm_Outbox folder.</p>` : `<p class="field-note">No drafts yet.</p>`);

  root.innerHTML = GOLDEN_RULE + companyPanel
    + panel("Prepare a document", templates.length ? `
      <label class="field"><span>Which document?</span><select id="dfTemplate">${templates.map((t) => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)} (${escapeHtml(t.id)})</option>`).join("")}</select></label>
      <div class="form-grid" id="dfFields"></div>
      <div class="form-grid">${field("dfDate", "Issue date (YYYY-MM-DD)", today)}${field("dfOther", "Other charges (RM)", "0")}${field("dfDiscount", "Additional discount (RM)", "0")}</div>
      <label class="field"><span>Notes</span><textarea id="dfNotes" rows="2" maxlength="600"></textarea></label>
      <div id="dfLines"></div>
      <div class="form-actions"><button class="btn" id="dfAddLine" type="button">Add a line</button> <button class="btn btn-primary" id="dfCreate" type="button">Prepare draft</button></div>
      <p class="field-note" id="dfTotal"></p>` : `<p class="field-note">No templates are available.</p>`)
    + `<div id="dfMsg" style="min-height:1.2em"></div>` + draftsPanel;

  const msg = root.querySelector("#dfMsg");
  const guard = (fn) => async (event) => { msg.textContent = "Working…"; try { await fn(event); } catch (err) { msg.textContent = err.message; } };
  const template = () => templates.find((t) => t.id === state.templateId) ?? templates[0];

  // ---- company details ----
  root.querySelector("#dfCompanySave").addEventListener("click", guard(async () => {
    const body = {};
    for (const f of company.fields) body[f.key] = root.querySelector(`#dfc_${f.key}`).value;
    for (const key of ["default_tax_rate", "default_payment_days", "default_validity_days", "default_delivery_days"]) body[key] = root.querySelector(`#dfc_${key}`).value;
    await api.saveEdcsCompany(body);
    await mountDrafting(root);
    root.querySelector("#dfMsg").textContent = "Company details saved.";
  }));

  // ---- the form ----
  const renderFields = () => {
    root.querySelector("#dfFields").innerHTML = template().fields.map((f) => field(`dff_${f.key}`, `${escapeHtml(f.label)}${f.required ? " *" : ""}`, "", `maxlength="${f.max}"`)).join("");
  };
  const renderTotal = () => {
    const rate = num(profile.default_tax_rate ?? 0) / 100;
    const sub = lines.reduce((sum, l) => sum + num(l.qty) * num(l.unit_price) * (1 - num(l.discount_percent) / 100), 0);
    const el = root.querySelector("#dfTotal");
    if (el) el.textContent = `Estimate: subtotal ${fmtMoney(sub)}; with the default ${(rate * 100).toFixed(2)}% tax and your other charges the total is ${fmtMoney(sub * (1 + rate) + num(root.querySelector("#dfOther")?.value) - num(root.querySelector("#dfDiscount")?.value))}. The document's own formulas give the final figure.`;
  };
  const renderLines = () => {
    const units = template().units;
    root.querySelector("#dfLines").innerHTML = `<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>#</th><th>Item / description</th><th>Qty</th><th>Unit</th><th>Unit price (RM)</th><th>Disc. %</th><th></th></tr></thead><tbody>${lines.map((l, i) => `<tr>
      <td>${i + 1}</td>
      <td><input class="df-line" data-i="${i}" data-k="description" type="text" maxlength="300" value="${escapeHtml(l.description)}" style="width:100%;min-width:14rem" /></td>
      <td><input class="df-line" data-i="${i}" data-k="qty" type="text" inputmode="decimal" value="${escapeHtml(l.qty)}" style="width:5rem" /></td>
      <td><select class="df-line" data-i="${i}" data-k="unit">${units.map((u) => `<option ${u === l.unit ? "selected" : ""}>${escapeHtml(u)}</option>`).join("")}</select></td>
      <td><input class="df-line" data-i="${i}" data-k="unit_price" type="text" inputmode="decimal" value="${escapeHtml(l.unit_price)}" style="width:7rem" /></td>
      <td><input class="df-line" data-i="${i}" data-k="discount_percent" type="text" inputmode="decimal" value="${escapeHtml(l.discount_percent)}" style="width:4rem" /></td>
      <td>${lines.length > 1 ? `<button class="btn btn-sm df-remove" data-i="${i}" type="button">Remove</button>` : ""}</td></tr>`).join("")}</tbody></table></div>`;
    for (const input of root.querySelectorAll(".df-line")) input.addEventListener("input", () => { lines[Number(input.dataset.i)][input.dataset.k] = input.value; renderTotal(); });
    for (const button of root.querySelectorAll(".df-remove")) button.addEventListener("click", () => { lines.splice(Number(button.dataset.i), 1); renderLines(); renderTotal(); });
    renderTotal();
  };
  if (templates.length) {
    renderFields();
    renderLines();
    root.querySelector("#dfTemplate").addEventListener("change", (event) => { state.templateId = event.target.value; lines = lines.slice(0, template().max_items); renderFields(); renderLines(); });
    root.querySelector("#dfAddLine").addEventListener("click", () => { if (lines.length >= template().max_items) { msg.textContent = `This template holds ${template().max_items} lines at most.`; return; } lines.push({ description: "", qty: 1, unit: "unit", unit_price: "", discount_percent: "" }); renderLines(); });
    for (const id of ["#dfOther", "#dfDiscount"]) root.querySelector(id).addEventListener("input", renderTotal);
    root.querySelector("#dfCreate").addEventListener("click", guard(async () => {
      const fields = {};
      for (const f of template().fields) fields[f.key] = root.querySelector(`#dff_${f.key}`).value;
      const result = await api.createEdcsDraft({
        template_id: template().id, issue_date: root.querySelector("#dfDate").value, fields, notes: root.querySelector("#dfNotes").value,
        other_charges: root.querySelector("#dfOther").value, additional_discount: root.querySelector("#dfDiscount").value,
        items: lines.map((l) => ({ description: l.description, qty: l.qty, unit: l.unit, unit_price: l.unit_price, discount_percent: l.discount_percent }))
      });
      await mountDrafting(root);
      root.querySelector("#dfMsg").textContent = `Draft ${result.draft.transaction_id} prepared. ${result.draft.approval_summary ?? ""} It cannot be downloaded until it is approved.`;
    }));
  }

  // ---- the drafts ----
  const decide = (call, needReason) => guard(async (event) => {
    const reason = root.querySelector("#dfReason")?.value ?? "";
    if (needReason && reason.trim().length < 3) throw new Error("Type the reason first (at least 3 letters).");
    await call({ draft_id: event.currentTarget.dataset.id, reason });
    await mountDrafting(root);
  });
  for (const b of root.querySelectorAll(".df-approve")) b.addEventListener("click", decide((body) => api.approveEdcsDraft(body), false));
  for (const b of root.querySelectorAll(".df-reject")) b.addEventListener("click", decide((body) => api.rejectEdcsDraft(body), true));
  for (const b of root.querySelectorAll(".df-cancel")) b.addEventListener("click", decide((body) => api.cancelEdcsDraft(body), true));
  for (const b of root.querySelectorAll(".df-download")) b.addEventListener("click", guard(async (event) => {
    const button = event.currentTarget;
    await api.downloadEdcsDraft(button.dataset.id, button.dataset.name);
    await mountDrafting(root);
    root.querySelector("#dfMsg").textContent = "Downloaded. Move the file into your BizKick folder and add its row to the register.";
  }));
}

export const BIZKICK_PAGES = {
  "bizkick-drafting": mountDrafting,
  "bizkick-connector": mountConnector,
  "bizkick-microsoft": mountMicrosoft,
  "bizkick-delegation": mountDelegation,
  "bizkick-numbers": mountNumbers,
  "bizkick-rules": mountRules,
  "bizkick-connection": mountConnection,
  "bizkick-import": mountImport,
  "bizkick-transactions": mountTransactions,
  "bizkick-files": mountFiles,
  "bizkick-chains": mountChains,
  "bizkick-history": mountHistory,
  "bizkick-conflicts": mountConflicts,
};
