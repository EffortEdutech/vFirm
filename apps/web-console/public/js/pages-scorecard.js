// VI-S4 (ADR-112): worker scorecards (on My Team) and client cost-to-serve (on Clients & Sales).
// The page only shows what GET /scorecards returns; it computes nothing. Rates always show their counts, and a
// small sample is flagged "low sample" and never coloured good or bad. Only virtual workers are measured.

import { api } from "./api.js";
import { pill, escapeHtml, fmtMoney, empty, panel } from "./ui.js";

const PERIODS = [["30d", "Last 30 days"], ["90d", "Last 90 days"], ["ytd", "This year"], ["custom", "Custom dates"]];
const state = { period: "90d", from: "", to: "" };

const pct = (rate, part, whole) => (rate === null || rate === undefined ? "–" : `${rate}% <span class="brief-note">(${part} of ${whole})</span>`);
const minutes = (m) => (m === null || m === undefined ? "–" : m >= 120 ? `${Math.round((m / 60) * 10) / 10} h` : `${m} min`);
const hours = (h) => (h === null || h === undefined ? "–" : `${h} h`);
const label = (value) => String(value ?? "").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

function periodBar(id) {
  return `<div class="filters sc-period"><label>Period <select id="${id}Period">${PERIODS.map(([v, text]) => `<option value="${v}" ${v === state.period ? "selected" : ""}>${text}</option>`).join("")}</select></label>
    ${state.period === "custom" ? `<label>From <input type="date" id="${id}From" value="${escapeHtml(state.from)}" /></label><label>To <input type="date" id="${id}To" value="${escapeHtml(state.to)}" /></label><button class="btn btn-sm" id="${id}Apply" type="button">Apply</button>` : ""}</div>`;
}

function query() {
  const params = new URLSearchParams({ period: state.period });
  if (state.period === "custom") { params.set("from", state.from); params.set("to", state.to); }
  return params.toString();
}

async function load(box, id, render) {
  box.innerHTML = panel(id === "scW" ? "Worker scorecards" : "Cost to serve", `<p class="field-note">Loading…</p>`);
  let data;
  try { data = await api.getScorecards(query()); }
  catch (err) {
    box.innerHTML = String(err?.message ?? "").match(/owner/i) ? "" : panel(id === "scW" ? "Worker scorecards" : "Cost to serve", `<p class="field-note">${escapeHtml(err?.message ?? "Could not load scorecards.")}</p>`);
    return;
  }
  const title = id === "scW" ? "Worker scorecards" : "Cost to serve, by client";
  box.innerHTML = panel(title, periodBar(id) + `<p class="field-note">${escapeHtml(data.period.from)} to ${escapeHtml(data.period.to)}, Malaysia time. Built from your own records only. ${escapeHtml(data.notes.scope)}</p>` + render(data));
  const rerun = () => load(box, id, render);
  box.querySelector(`#${id}Period`)?.addEventListener("change", (event) => {
    state.period = event.target.value;
    if (state.period === "custom" && (!state.from || !state.to)) { box.innerHTML = panel(title, periodBar(id)); box.querySelector(`#${id}Period`).addEventListener("change", (e) => { state.period = e.target.value; rerun(); }); box.querySelector(`#${id}Apply`)?.addEventListener("click", () => { state.from = box.querySelector(`#${id}From`).value; state.to = box.querySelector(`#${id}To`).value; rerun(); }); return; }
    rerun();
  });
  box.querySelector(`#${id}Apply`)?.addEventListener("click", () => { state.from = box.querySelector(`#${id}From`).value; state.to = box.querySelector(`#${id}To`).value; rerun(); });
}

function row(name, sub, s, indent = false) {
  const flag = s.low_sample_reviews ? ` ${pill("low sample", "default")}` : "";
  const missing = s.top_missing_inputs.length ? s.top_missing_inputs.map((m) => `${escapeHtml(m.input)} <span class="brief-note">×${m.count}</span>`).join("<br>") : "–";
  return `<tr class="${indent ? "sc-skill" : "sc-worker"}"><td>${indent ? "&nbsp;&nbsp;↳ " : ""}<strong>${escapeHtml(name)}</strong>${sub ? ` <span class="brief-note">${escapeHtml(sub)}</span>` : ""}${flag}</td>
    <td>${s.jobs}</td><td>${s.drafted}</td>
    <td>${pct(s.first_pass_approval_rate, s.approved_first_pass, s.reviewed)}</td><td>${pct(s.revision_rate, s.revision_required, s.reviewed)}</td><td>${pct(s.rejection_rate, s.rejected, s.reviewed)}</td>
    <td>${pct(s.needs_info_rate, s.needs_info_jobs, s.jobs)}</td><td>${minutes(s.median_minutes_to_draft)}</td><td>${missing}</td></tr>`;
}

function workersHtml(data) {
  if (!data.workers.length) return empty("No worker jobs in this period.");
  const f = data.firm;
  const rows = data.workers.map((w) => row(`${label(w.position_id ?? "Worker")} ${w.staff_code}`, "", w) + w.skills.map((s) => row(s.skill_id, s.action, s, true)).join("")).join("");
  return `<table class="sc-table"><thead><tr><th>Worker and skill</th><th>Jobs</th><th>Drafts</th><th>Approved first time</th><th>Sent back</th><th>Rejected</th><th>Needed info</th><th>Median time to draft</th><th>Most often missing</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="field-note">Firm-wide: ${f.jobs} job(s), ${f.reviewed} reviewed, ${f.first_pass_approval_rate === null ? "no approval rate yet" : `${f.first_pass_approval_rate}% approved first time`}. Drafts waited a median of ${hours(f.median_hours_waiting_for_owner)} for a decision (a firm-wide wait, not per person).
    Rates count only the first draft's first decision, so a revision is never counted as approval. Fewer than ${data.low_sample_below} reviewed jobs is marked low sample: read the counts, not the percentage. Time to draft includes any wait for you to supply missing inputs.</p>`;
}

function money(invoiced) {
  if (!invoiced.length) return "–";
  return invoiced.map((c) => `${escapeHtml(fmtMoney(c.total, c.currency))} <span class="brief-note">${c.invoices} invoice(s)${c.bizkick && c.vfirm ? `: BizKick ${escapeHtml(fmtMoney(c.bizkick, c.currency))} + vFirm ${escapeHtml(fmtMoney(c.vfirm, c.currency))}` : c.vfirm ? ": vFirm" : ": BizKick"}</span>`).join("<br>");
}

function clientsHtml(data) {
  const n = data.notes;
  const rows = data.clients.map((c) => `<tr><td><strong>${escapeHtml(c.name)}</strong></td><td>${c.requests}</td><td>${c.worker_jobs}</td><td>${c.drafts}</td><td>${hours(c.median_hours_waiting_for_owner)}</td><td>${money(c.invoiced)}</td></tr>`).join("");
  return (data.clients.length ? `<table class="sc-table"><thead><tr><th>Client</th><th>Requests</th><th>Worker jobs</th><th>Drafts</th><th>Draft waited for you (median)</th><th>Invoiced</th></tr></thead><tbody>${rows}</tbody></table>` : empty("No client requests or invoices in this period."))
    + `<p class="field-note">${escapeHtml(n.owner_time)} ${escapeHtml(n.revenue)}${n.unlinked_invoices ? ` ${n.unlinked_invoices} invoice(s) in this period are not tied to a client yet (confirm the counterparty on the Transactions page), so they are not in any client's total.` : ""}${n.undated_invoices ? ` ${n.undated_invoices} BizKick invoice(s) have no issue date and are left out.` : ""}</p>`;
}

export const mountWorkerScorecards = (box) => (box ? load(box, "scW", workersHtml) : null);
export const mountClientEconomics = (box) => (box ? load(box, "scC", clientsHtml) : null);
