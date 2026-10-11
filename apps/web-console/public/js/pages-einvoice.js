// VI-S6 (ADR-114): e-Invoice readiness. The page shows what the server found and collects the details vFirm does not hold.
// It decides nothing and submits nothing: there is no way from here (or anywhere in vFirm) to send an invoice to MyInvois.

import { api } from "./api.js";
import { pill, escapeHtml, fmtDate, empty, panel, errorBox } from "./ui.js";

const VERDICT = { READY: ["Ready", "green"], NEEDS_FIXES: ["Needs fixes", "red"], CANNOT_CONFIRM: ["Cannot confirm", "amber"] };
const STATUS = { MISSING: "Missing", INVALID: "Not valid", UNKNOWN: "Cannot tell" };
const field = (id, label, value = "", ph = "") => `<label class="ei-f">${escapeHtml(label)}<input id="${id}" value="${escapeHtml(value ?? "")}" placeholder="${escapeHtml(ph)}" /></label>`;
const val = (root, id) => root.querySelector(`#${id}`)?.value ?? "";

export async function mountEinvoice(root) {
  const state = { band: "", related: false, month: new Date().toISOString().slice(0, 7), data: null };
  const say = (msg, bad = false) => { const n = root.querySelector("#eiMsg"); if (n) { n.textContent = msg; n.className = bad ? "error-box" : "field-note"; } };

  async function load() {
    if (!state.band) { state.data = null; return draw(); }
    state.data = await api.getEinvoiceReadiness({ band: state.band, month: state.month, related_over_3m: state.related ? "1" : "" });
    draw();
  }

  function draw() {
    const d = state.data;
    const bandOpts = `<option value="">Choose your band...</option>` + Object.entries(d?.bands ?? BANDS_FALLBACK).map(([k, l]) => `<option value="${k}" ${k === state.band ? "selected" : ""}>${escapeHtml(l)}</option>`).join("");
    const top = `<p class="field-note">Checks your invoices against what a MyInvois e-Invoice needs and tells you what to add. <strong>Draft only: vFirm never submits anything to MyInvois.</strong> Where vFirm does not hold a value it says so; it never makes one up.</p>
      <div class="filters"><label>Annual turnover <select id="eiBand">${bandOpts}</select></label>
      <label><input type="checkbox" id="eiRel" ${state.related ? "checked" : ""}/> A related company, shareholder or joint venture has RM3 million or more</label>
      <label>Month <input type="month" id="eiMonth" value="${escapeHtml(state.month)}" /></label></div><div id="eiMsg" class="field-note"></div>`;
    if (!d) { root.innerHTML = top + empty("Choose your turnover band to see whether e-Invoice applies to you."); return wire(); }
    const a = d.applicability;
    const banner = `<div class="ei-banner ${a.applies ? "ei-on" : "ei-off"}"><strong>${a.applies ? "e-Invoice applies" : "Likely exempt"}</strong>${a.since ? ` from ${escapeHtml(fmtDate(a.since))}` : ""}. ${escapeHtml(a.note)}
      <div class="field-note">Rules checked on ${escapeHtml(d.spec.checked_on)}: ${d.spec.sources.map((s) => `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.name)}</a>`).join("; ")}</div></div>`;
    const s = d.summary;
    const counts = `<div class="ei-counts">${pill(`${s.invoices} invoices`)} ${pill(`${s.ready} ready`, "green")} ${pill(`${s.needs_fixes} need fixes`, "red")} ${pill(`${s.cannot_confirm} cannot confirm`, "amber")}</div>`;
    const sup = d.supplier.effective, sa = sup.address ?? {};
    const supplierForm = panel("Your details (supplier)", `<div class="ei-grid">
      ${field("sName", "Registered name", sup.name)}${field("sTin", "TIN", sup.tin)}${field("sRegType", "ID type (BRN / NRIC / PASSPORT / ARMY)", sup.reg_type)}${field("sRegNo", "Registration / ID number", sup.reg_no)}
      ${field("sSst", "SST number (or NA)", sup.sst)}${field("sTtx", "Tourism tax number (or NA)", sup.ttx)}${field("sMsic", "MSIC code (5 digits)", sup.msic)}${field("sAct", "Business activity", sup.activity)}
      ${field("sLine0", "Address line", sa.line0)}${field("sCity", "City", sa.city)}${field("sState", "State", sa.state)}${field("sCountry", "Country code (MYS)", sa.country)}${field("sContact", "Contact number (+60...)", sup.contact)}
      </div><button class="btn" id="eiSaveSupplier">Save my details</button>`);
    const rows = d.results.map((r, i) => {
      const [label, tone] = VERDICT[r.verdict];
      const fixes = r.fix_list.length ? `<ul class="ei-fix">${r.fix_list.map((f) => `<li><strong>${escapeHtml(f.label)}</strong> <span class="field-note">${escapeHtml(STATUS[f.status])}.</span> ${escapeHtml(f.fix ?? "")} <em>Where: ${escapeHtml(f.where ?? "")}</em></li>`).join("")}</ul>` : "<p>Nothing to fix.</p>";
      return `<details class="ei-inv"><summary><strong>${escapeHtml(r.number ?? "(no number)")}</strong> ${pill(r.source === "BIZKICK" ? "BizKick" : "vFirm")} ${escapeHtml(r.buyer_name || "(no buyer)")} · ${escapeHtml(fmtDate(r.issue_date))} ${pill(label, tone)} ${r.fix_list.length ? `<span class="field-note">${r.fix_list.length} to fix</span>` : ""}</summary>${fixes}</details>`;
    }).join("");
    const buyerRows = d.buyers.map((b, i) => {
      const x = b.saved ?? {}, ad = x.address ?? {};
      return `<details class="ei-inv" data-key="${escapeHtml(b.buyer_key)}"><summary><strong>${escapeHtml(b.name || b.buyer_key)}</strong> ${x.public_buyer ? pill("Public buyer", "amber") : x.tin ? pill("Details saved", "green") : pill("No details yet")}</summary>
        <div class="ei-grid">${field(`b${i}name`, "Name", x.name ?? b.name)}${field(`b${i}tin`, "TIN", x.tin)}${field(`b${i}rt`, "ID type", x.reg_type)}${field(`b${i}rn`, "Registration / ID number", x.reg_no)}${field(`b${i}sst`, "SST number (or NA)", x.sst)}
        ${field(`b${i}l0`, "Address line", ad.line0)}${field(`b${i}city`, "City", ad.city)}${field(`b${i}state`, "State", ad.state)}${field(`b${i}cty`, "Country code", ad.country)}${field(`b${i}ct`, "Contact number", x.contact)}</div>
        <label><input type="checkbox" id="b${i}pub" ${x.public_buyer ? "checked" : ""}/> This buyer is the general public (no e-Invoice requested; goes into the monthly consolidated draft)</label>
        <button class="btn ei-save-buyer" data-i="${i}">Save buyer</button></details>`;
    }).join("");
    const c = d.consolidated;
    const cons = c.ok ? `<p class="field-note">Sales under RM10,000 to the general public can be consolidated monthly, by 7 days after month end. Buyer: ${escapeHtml(c.header.buyer.name)}, TIN ${escapeHtml(c.header.buyer.tin)}. Period ${escapeHtml(c.header.period)}, due by ${escapeHtml(fmtDate(c.header.due_by))}.</p>
      <p>${pill(`${c.lines.length} receipts`)} ${pill(`RM ${c.total_myr.toFixed(2)}`)} ${pill(`${c.submissions_needed} submission(s) of up to 100 lines`)} ${c.excluded.length ? pill(`${c.excluded.length} left out`, "amber") : ""}</p>
      ${c.excluded.map((x) => `<p class="field-note">${escapeHtml(x.number ?? "")}: ${escapeHtml(x.reason)}</p>`).join("")}
      <button class="btn" id="eiCsv" ${c.lines.length ? "" : "disabled"}>Download draft (CSV)</button> <span class="field-note">A file for your records. vFirm does not send it anywhere.</span>` : `<p class="error-box">${escapeHtml(c.error)}</p>`;
    root.innerHTML = top + banner + counts + supplierForm + panel("Invoices", rows || empty("No counted invoices yet.")) + panel("Buyer details", buyerRows || empty("No buyers yet.")) + panel("Monthly consolidated draft", cons);
    wire();
  }

  function wire() {
    root.querySelector("#eiBand")?.addEventListener("change", (e) => { state.band = e.target.value; load().catch((err) => say(err.message, true)); });
    root.querySelector("#eiRel")?.addEventListener("change", (e) => { state.related = e.target.checked; load().catch((err) => say(err.message, true)); });
    root.querySelector("#eiMonth")?.addEventListener("change", (e) => { state.month = e.target.value || state.month; load().catch((err) => say(err.message, true)); });
    root.querySelector("#eiSaveSupplier")?.addEventListener("click", async () => {
      try {
        await api.saveEinvoiceSupplier({ name: val(root, "sName"), tin: val(root, "sTin"), reg_type: val(root, "sRegType"), reg_no: val(root, "sRegNo"), sst: val(root, "sSst"), ttx: val(root, "sTtx"), msic: val(root, "sMsic"), activity: val(root, "sAct"), contact: val(root, "sContact"), address: { line0: val(root, "sLine0"), city: val(root, "sCity"), state: val(root, "sState"), country: val(root, "sCountry") } });
        await load(); say("Your details are saved.");
      } catch (err) { say(err.message, true); }
    });
    root.querySelectorAll(".ei-save-buyer").forEach((btn) => btn.addEventListener("click", async () => {
      const i = btn.dataset.i, key = btn.closest("[data-key]").dataset.key;
      try {
        await api.saveEinvoiceBuyer({ buyer_key: key, name: val(root, `b${i}name`), tin: val(root, `b${i}tin`), reg_type: val(root, `b${i}rt`), reg_no: val(root, `b${i}rn`), sst: val(root, `b${i}sst`), contact: val(root, `b${i}ct`), public_buyer: root.querySelector(`#b${i}pub`).checked, address: { line0: val(root, `b${i}l0`), city: val(root, `b${i}city`), state: val(root, `b${i}state`), country: val(root, `b${i}cty`) } });
        await load(); say("Buyer details are saved.");
      } catch (err) { say(err.message, true); }
    }));
    root.querySelector("#eiCsv")?.addEventListener("click", () => {
      const url = URL.createObjectURL(new Blob([state.data.consolidated.csv], { type: "text/csv" }));
      const a = document.createElement("a"); a.href = url; a.download = `consolidated-draft-${state.data.consolidated.header.period}.csv`; a.click(); URL.revokeObjectURL(url);
    });
  }

  draw();
}
const BANDS_FALLBACK = { UNDER_3M: "Below RM3 million", "3M_5M": "RM3 million up to RM5 million", "5M_25M": "Above RM5 million up to RM25 million", "25M_100M": "Above RM25 million up to RM100 million", OVER_100M: "Above RM100 million" };
