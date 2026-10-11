// VI-S3 (ADR-111): Evidence Passport -- a verifiable dossier for a bank, tender board or auditor.
// The page only collects the owner's choices and shows what the server plans and builds; it computes no hashes
// and decides nothing about restricted content (the server does, and says why).

import { api, scopeStoreToCurrentFirm } from "./api.js";
import { pill, escapeHtml, fmtDate, empty, panel, errorBox } from "./ui.js";

const RESTRICTED = new Set(["HR_RESTRICTED", "FINANCE_RESTRICTED"]);
const REASONS = {
  RESTRICTED_NOT_INCLUDED: "Restricted. Left out unless you tick it.",
  NO_REVISION_IN_PERIOD: "No revision falls inside the period.",
  NO_REVISION: "Has no revision on file."
};
const fmtBytes = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`);
const fmtWhen = (iso) => (iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" }) : "");

export async function mountEvidencePassport(root) {
  let store, passports;
  try {
    [store, passports] = await Promise.all([api.getStore().then(scopeStoreToCurrentFirm), api.listPassports()]);
  } catch (err) { root.innerHTML = errorBox(err, "Evidence Passport"); return; }
  const docs = (store.document_register_entries ?? []).slice().sort((a, b) => String(a.document_number).localeCompare(String(b.document_number)));
  let transactions = [];
  try { transactions = (await api.listEdcsTransactions("")).transactions ?? []; } catch { /* BizKick not connected: documents only */ }

  const state = { plan: null, planKey: "" };
  const docRows = docs.map((d) => `<label class="pp-row"><input type="checkbox" class="pp-doc" value="${escapeHtml(d.id)}" /> <strong>${escapeHtml(d.document_number)}</strong> ${escapeHtml(d.title ?? "")} ${RESTRICTED.has(d.classification) ? pill("Restricted", "amber") : ""}</label>`).join("");
  const txRows = transactions.map((t) => `<label class="pp-row"><input type="checkbox" class="pp-tx" value="${escapeHtml(t.transaction_id)}" /> <strong>${escapeHtml(t.transaction_id)}</strong> ${escapeHtml(t.counterparty ?? t.subject ?? "")}</label>`).join("");

  root.innerHTML = `<p class="field-note">Build a sealed bundle a bank, tender board or auditor can check on their own computer, with no account. Restricted documents stay out unless you tick them, and that choice is recorded. Only the firm owner can do this.</p>`
    + panel("1. What goes in", `
      <div class="pp-cols"><div><h4>Documents ${pill(String(docs.length))}</h4><div class="pp-box">${docRows || empty("No documents filed yet.")}</div></div>
      <div><h4>BizKick transactions ${pill(String(transactions.length))}</h4><div class="pp-box">${txRows || empty("No BizKick transactions.")}</div>
      <label class="pp-row"><input type="checkbox" id="ppChain" checked /> Include the whole chain (for example the quotation, its delivery order and invoice)</label></div></div>
      <div class="filters">
        <label>Revisions <select id="ppRev"><option value="CURRENT">Current only</option><option value="ALL">All revisions</option></select></label>
        <label>From <input type="date" id="ppFrom" /></label>
        <label>To <input type="date" id="ppTo" /></label>
      </div>
      <div class="filters">
        <label>Purpose <input id="ppPurpose" size="40" placeholder="e.g. Bank loan application" /></label>
        <label>For (optional) <input id="ppRecipient" size="30" placeholder="e.g. Alpha Bank" /></label>
      </div>`)
    + `<div class="form-actions"><button class="btn" id="ppPreview" type="button">Preview</button> <button class="btn btn-primary" id="ppCreate" type="button" disabled>Create passport</button></div><div id="ppPlan"></div><div id="ppMsg"></div>`
    + `<div id="ppList"></div>`;

  const selection = () => {
    const body = {
      document_ids: [...root.querySelectorAll(".pp-doc:checked")].map((x) => x.value),
      transaction_ids: [...root.querySelectorAll(".pp-tx:checked")].map((x) => x.value),
      include_chain: root.querySelector("#ppChain").checked,
      revisions: root.querySelector("#ppRev").value,
      purpose: root.querySelector("#ppPurpose").value.trim(),
      recipient: root.querySelector("#ppRecipient").value.trim() || undefined,
      include_restricted: [...root.querySelectorAll(".pp-restricted:checked")].map((x) => x.value)
    };
    const from = root.querySelector("#ppFrom").value; const to = root.querySelector("#ppTo").value;
    if (from || to) body.period = { from: from || undefined, to: to || undefined };
    return body;
  };
  const keyOf = (body) => JSON.stringify(body);
  const sync = () => { root.querySelector("#ppCreate").disabled = !(state.plan && state.planKey === keyOf(selection())); };
  root.addEventListener("change", (event) => { if (!event.target.closest("#ppPlan")) { state.plan = null; root.querySelector("#ppPlan").innerHTML = ""; } sync(); });
  root.addEventListener("input", () => sync());

  const planHtml = (plan) => {
    const rows = plan.items.map((i) => {
      const restricted = RESTRICTED.has(i.classification);
      const tick = restricted ? `<label><input type="checkbox" class="pp-restricted" value="${escapeHtml(i.entry_id)}" ${i.included ? "checked" : ""} /> include</label>` : "";
      const state_ = i.included ? pill("In", "green") : pill("Left out", "amber");
      const why = i.included ? `${i.revisions.filter((r) => r.included !== false).length} revision(s)${i.revisions.some((r) => r.content === "METADATA_ONLY") ? " (fingerprint only; vFirm never stored this content)" : ""}` : escapeHtml(REASONS[i.reason] ?? i.reason ?? "");
      return `<tr><td>${escapeHtml(i.document_number)}</td><td>${escapeHtml(i.title ?? "")}</td><td>${escapeHtml(i.classification ?? "")}</td><td>${state_}</td><td>${why}</td><td>${tick}</td></tr>`;
    }).join("");
    const t = plan.totals;
    return panel("2. What the bundle will hold", `<p>${t.documents} document(s), ${t.revisions} revision(s), ${t.files_with_content} file(s) with content, ${t.metadata_only} fingerprint-only, ${t.transactions} BizKick transaction(s). About ${fmtBytes(t.bytes)}.${t.restricted_included ? ` <strong>${t.restricted_included} restricted item(s) included. This is recorded and printed on the cover.</strong>` : ""}</p>
      ${plan.too_large ? `<p class="error-text">Too large for one passport. Take fewer documents or only the current revisions.</p>` : ""}
      <table><thead><tr><th>Number</th><th>Title</th><th>Class</th><th></th><th>Detail</th><th>Restricted</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="field-note">Tick or untick a restricted row, then press Preview again.</p>`);
  };

  root.querySelector("#ppPreview").addEventListener("click", async () => {
    const msg = root.querySelector("#ppMsg"); msg.innerHTML = "";
    const body = selection();
    // keep ticks the owner just made in the previous plan table
    try {
      const plan = await api.previewPassport(body);
      state.plan = plan; state.planKey = keyOf(selection());
      root.querySelector("#ppPlan").innerHTML = planHtml(plan);
      sync();
    } catch (err) { msg.innerHTML = errorBox(err, "Preview"); }
  });
  root.querySelector("#ppCreate").addEventListener("click", async () => {
    const msg = root.querySelector("#ppMsg");
    const button = root.querySelector("#ppCreate"); button.disabled = true;
    try {
      const made = await api.createPassport({ ...selection(), plan_digest: state.plan.digest });
      msg.innerHTML = `<p class="notice">Created ${escapeHtml(made.passport.number)}. Download it below.</p>`;
      state.plan = null; root.querySelector("#ppPlan").innerHTML = "";
      await renderList();
    } catch (err) { msg.innerHTML = errorBox(err, "Create"); sync(); }
  });

  async function renderList() {
    const box = root.querySelector("#ppList");
    const data = await api.listPassports();
    box.innerHTML = panel("Issued passports", data.passports.length ? `<table><thead><tr><th>Number</th><th>Purpose</th><th>Created</th><th>Contents</th><th>Seal</th><th></th></tr></thead><tbody>${data.passports.map((p) => `<tr>
      <td>${escapeHtml(p.number)}</td><td>${escapeHtml(p.purpose)}${p.recipient ? `<br><span class="brief-note">for ${escapeHtml(p.recipient)}</span>` : ""}</td>
      <td>${escapeHtml(fmtWhen(p.created_at))}<br><span class="brief-note">${escapeHtml(p.created_by_name ?? "")}</span></td>
      <td>${p.totals.documents} doc(s), ${fmtBytes(p.bundle_size)}${p.restricted_included.length ? ` ${pill(`${p.restricted_included.length} restricted`, "amber")}` : ""}<br><span class="brief-note">downloaded ${p.downloads}x</span></td>
      <td><code class="pp-seal" title="${escapeHtml(p.seal)}">${escapeHtml(p.seal.slice(0, 16))}…</code></td>
      <td><button class="btn btn-sm pp-dl" data-id="${escapeHtml(p.id)}" data-name="${escapeHtml(p.bundle_filename)}" type="button">Download</button> <button class="btn btn-sm pp-verify" data-id="${escapeHtml(p.id)}" type="button">Verify now</button><div class="pp-result" data-for="${escapeHtml(p.id)}"></div></td></tr>`).join("")}</tbody></table>
      <p class="field-note">Give the recipient the .zip and tell them the seal through a different route (a call or a separate message). They open verify.html inside it, paste the seal, and see PASS or FAIL.</p>` : empty("None yet."));
    for (const btn of box.querySelectorAll(".pp-dl")) btn.addEventListener("click", async () => {
      const out = box.querySelector(`.pp-result[data-for="${btn.dataset.id}"]`);
      try { await api.downloadPassport(btn.dataset.id, btn.dataset.name); out.innerHTML = ""; } catch (err) { out.innerHTML = `<span class="error-text">${escapeHtml(err.message)}</span>`; }
    });
    for (const btn of box.querySelectorAll(".pp-verify")) btn.addEventListener("click", async () => {
      const out = box.querySelector(`.pp-result[data-for="${btn.dataset.id}"]`);
      try {
        const r = await api.verifyPassport(btn.dataset.id);
        out.innerHTML = r.ok ? `<span class="brief-note">PASS: ${r.files_verified} of ${r.files_listed} files match.</span>` : `<span class="error-text">FAIL: ${escapeHtml((r.checks ?? []).filter((c) => !c.ok).map((c) => c.detail || c.name).join("; ") || "bundle does not verify")}</span>`;
      } catch (err) { out.innerHTML = `<span class="error-text">${escapeHtml(err.message)}</span>`; }
    });
  }
  await renderList();
}
