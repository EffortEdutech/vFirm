// VI-S2 (ADR-110): Morning Brief -- the firm's state in two minutes. Read-only; every line opens its record.
// The page only shows what GET /brief/today returns (a deterministic, server-built brief); it computes nothing.

import { api } from "./api.js";
import { pill, escapeHtml, fmtDate, fmtMoney, empty, panel, errorBox } from "./ui.js";

const go = (link) => `data-nav-page="${escapeHtml(link?.page ?? "")}" data-nav-tab="${escapeHtml(link?.tab ?? "")}"`;
const linkBtn = (label, link, extra = "") => `<button class="btn btn-sm btn-link" type="button" ${go(link)}>${escapeHtml(label)}</button>${extra}`;
const list = (group, render) => group.total
  ? `<ul class="brief-list">${group.items.map((item) => `<li>${render(item)}</li>`).join("")}</ul>${group.more ? `<p class="field-note">…and ${group.more} more.</p>` : ""}`
  : "";
const quiet = (text) => `<p class="field-note">${escapeHtml(text)}</p>`;
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function headlineHtml(headline) {
  return `<div class="stat-row">${headline.map((h) =>
    `<div class="stat"><span class="stat-value" style="${h.count && h.urgent ? "color:var(--amber, #b45309)" : ""}">${escapeHtml(String(h.count))}</span><span class="stat-label">${escapeHtml(h.label)}</span></div>`).join("")}</div>`;
}

function needsYouHtml(section) {
  const body = section.tiles.map((tile) => tile.total
    ? `<div class="brief-group"><h4>${escapeHtml(tile.label)} ${pill(String(tile.total), tile.urgent ? "amber" : "default")}</h4>${list(tile, (item) => linkBtn(item.label, item.link))}</div>`
    : "").join("");
  return panel("Needs you", body || empty("Nothing is waiting on you."));
}

function dueHtml(section) {
  const r = section.requests;
  const b = section.bizkick;
  const requests = r.total
    ? `<div class="brief-group"><h4>Requests ${pill(`${r.overdue} late`, r.overdue ? "amber" : "default")} ${pill(`${r.due_today} due today`, "default")}</h4>${list(r, (item) => linkBtn(item.label, item.link, ` <span class="brief-note">${item.days_late > 0 ? `${count(item.days_late, "day", "days")} late` : "due today"}</span>`))}</div>` : "";
  const register = b.total
    ? `<div class="brief-group"><h4>BizKick documents ${pill(`${b.overdue} overdue`, b.overdue ? "amber" : "default")} ${pill(`${b.due_soon} due soon`, "default")}</h4>${list(b, (item) => linkBtn(item.label, item.link, ` <span class="brief-note">${item.days_late > 0 ? `${count(item.days_late, "day", "days")} late` : `due ${escapeHtml(fmtDate(item.due))}`}</span>`))}</div>` : "";
  return panel("Due and overdue", requests + register || empty("Nothing is due or overdue."));
}

function cashHtml(section) {
  const rec = section.receivables;
  const aging = rec.currencies.length ? rec.currencies.map((c) => `<div class="brief-group"><h4>Money owed to you, ${escapeHtml(c.currency)}: ${escapeHtml(fmtMoney(c.total, c.currency))} (${count(c.count, "invoice", "invoices")})</h4>
    <table><thead><tr><th>Age</th><th>Invoices</th><th>Amount</th></tr></thead><tbody>${c.buckets.map((k) =>
      `<tr><td>${escapeHtml(k.label)}</td><td>${k.count}</td><td>${escapeHtml(fmtMoney(k.amount, c.currency))}${k.ids.length ? ` <span class="brief-note">${escapeHtml(k.ids.join(", "))}</span>` : ""}</td></tr>`).join("")}</tbody></table>
    ${linkBtn("Open transactions", rec.link)}</div>`).join("")
    : (section.connected ? quiet("No open invoices in the register.") : quiet("Connect BizKick to see money owed to you."));
  const months = section.unreconciled_months.length
    ? `<div class="brief-group"><h4>Bank reconciliation not finished ${pill(String(section.unreconciled_months.length), "amber")}</h4><ul class="brief-list">${section.unreconciled_months.map((m) =>
      `<li>${linkBtn(m.month, m.link, ` <span class="brief-note">${m.state === "MISSING" ? "no reconciliation yet" : "in progress"}</span>`)}</li>`).join("")}</ul></div>`
    : (section.connected ? quiet("Every recent month has a completed bank reconciliation.") : "");
  const undated = rec.undated?.length ? quiet(`${count(rec.undated.length, "invoice has", "invoices have")} no date, so ${rec.undated.length === 1 ? "it is" : "they are"} not aged: ${rec.undated.join(", ")}`) : "";
  return panel("Cash signals", aging + months + undated);
}

function throughputHtml(section) {
  const line = `${count(section.requests_submitted, "request", "requests")} came in, ${count(section.items_assigned, "item", "items")} assigned, ${count(section.drafts_produced, "draft", "drafts")} produced, ${count(section.items_completed, "item", "items")} finished.`;
  const workers = section.workers.length
    ? `<table><thead><tr><th>Worker</th><th>Assigned</th><th>Drafts</th><th>Finished</th></tr></thead><tbody>${section.workers.map((w) => `<tr><td>${linkBtn(w.staff_code, w.link)}</td><td>${w.assigned}</td><td>${w.drafts}</td><td>${w.completed}</td></tr>`).join("")}</tbody></table>` : "";
  return panel(`Your team yesterday (${fmtDate(section.date)})`, `<p>${escapeHtml(line)}</p>${workers}`);
}

function exceptionsHtml(section) {
  const groups = [
    ["conflicts", "Held conflicts", "BizKick changed a document that vFirm had already approved"],
    ["duplicates", "Duplicate numbers", "the same document number appears twice"],
    ["missing_links", "Missing links", "a document is missing the one it should follow"],
    ["unreserved_ids", "Numbers not reserved here", "documents that did not take their number from the Number Desk"]
  ];
  const body = groups.map(([key, title, hint]) => section[key].total
    ? `<div class="brief-group"><h4>${escapeHtml(title)} ${pill(String(section[key].total), "amber")}</h4><p class="field-note">${escapeHtml(hint)}</p>${list(section[key], (item) => linkBtn(item.label, item.link))}</div>` : "").join("");
  return panel("Exceptions", body || empty("No exceptions in the register."));
}

function standingHtml(section) {
  const parts = [
    ["due_today", "Due today"], ["raised_today", "Raised today"], ["needs_info", "Raised, but an input is missing"], ["failed", "Could not be raised"]
  ].map(([key, title]) => section[key].total
    ? `<div class="brief-group"><h4>${escapeHtml(title)} ${pill(String(section[key].total), key === "failed" || key === "needs_info" ? "amber" : "default")}</h4>${list(section[key], (item) => linkBtn(item.label, item.link, item.covers ? ` <span class="brief-note">covers ${escapeHtml(item.covers)}</span>` : ""))}</div>` : "").join("");
  return panel("Standing instructions", parts || quiet(section.active ? `${count(section.active, "instruction is", "instructions are")} on; nothing is due today.` : "No standing instruction is turned on."));
}

export async function mountMorningBrief(root) {
  let data;
  try { data = await api.getBriefToday(); } catch (err) { root.innerHTML = errorBox(err, "Morning Brief"); return; }
  const brief = data.brief;
  const s = brief.sections;
  const snap = data.snapshot;
  const note = data.changed_since_snapshot
    ? `Things have changed since this morning's saved copy (${escapeHtml(snap.saved_by === "TICK" ? "saved by the daily job" : "saved when first opened")}).`
    : `This matches today's saved copy (${escapeHtml(snap.saved_by === "TICK" ? "saved by the daily job" : "saved when first opened")}).`;
  root.innerHTML = `<p class="field-note">${escapeHtml(fmtDate(brief.as_of))}, Malaysia time. Built from your own records only; nothing here is estimated. Click a line to open it. ${note}</p>`
    + headlineHtml(brief.headline)
    + needsYouHtml(s.needs_you) + dueHtml(s.due) + cashHtml(s.cash) + throughputHtml(s.throughput) + exceptionsHtml(s.exceptions) + standingHtml(s.standing)
    + `<div id="briefHistory"></div><div class="form-actions"><button class="btn btn-sm" id="briefHistoryBtn" type="button">Earlier briefs</button> <button class="btn btn-sm" id="briefRefresh" type="button">Refresh</button></div>`;
  root.onclick = (event) => {
    const target = event.target.closest("button[data-nav-page]");
    if (target && target.dataset.navPage) window.dispatchEvent(new CustomEvent("vfirm:navigate", { detail: { page: target.dataset.navPage, tab: target.dataset.navTab || undefined } }));
  };
  root.querySelector("#briefRefresh").addEventListener("click", () => mountMorningBrief(root));
  root.querySelector("#briefHistoryBtn").addEventListener("click", async () => {
    const box = root.querySelector("#briefHistory");
    try {
      const history = await api.getBriefHistory();
      box.innerHTML = panel("Earlier briefs", history.briefs.length
        ? `<table><thead><tr><th>Date</th><th>Saved</th><th>Waiting on you</th><th>Overdue</th><th>Invoices past due</th><th></th></tr></thead><tbody>${history.briefs.map((b) => {
          const h = Object.fromEntries((b.headline ?? []).map((x) => [x.key, x.count]));
          return `<tr><td>${escapeHtml(fmtDate(b.as_of))}</td><td>${b.saved_by === "TICK" ? "daily job" : "first open"}</td><td>${h.needs_you ?? 0}</td><td>${h.overdue ?? 0}</td><td>${h.receivables_late ?? 0}</td><td><button class="btn btn-sm brief-open" data-date="${escapeHtml(b.as_of)}" type="button">Open</button></td></tr>`;
        }).join("")}</tbody></table>` : empty("No earlier briefs yet."));
      for (const btn of box.querySelectorAll(".brief-open")) btn.addEventListener("click", async () => {
        const saved = await api.getBriefOn(btn.dataset.date);
        const b = saved.brief; const x = b.sections;
        box.insertAdjacentHTML("beforeend", `<div class="brief-saved">${panel(`Saved brief: ${fmtDate(b.as_of)}`, headlineHtml(b.headline) + needsYouHtml(x.needs_you) + dueHtml(x.due) + cashHtml(x.cash) + throughputHtml(x.throughput) + exceptionsHtml(x.exceptions) + standingHtml(x.standing))}</div>`);
      });
    } catch (err) { box.innerHTML = errorBox(err, "Earlier briefs"); }
  });
}
