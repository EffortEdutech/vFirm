// VI-S5 (ADR-113): the Trust Ladder panel on My Team.
// The page only shows what GET /trust-ladder returns and sends the owner's clicks; every rule is enforced by the API.
// "Eligible" is a flag: nothing is promoted until the owner clicks. Shadow drafts are marked here and are never
// drafts. Batch approval is checked first ("Check batch"), then approved with a note.

import { api } from "./api.js";
import { pill, escapeHtml, panel } from "./ui.js";

const STAGE = {
  SHADOW: { label: "Shadow", tone: "default", hint: "Runs beside you. Its work is compared with yours and never delivered." },
  SUPERVISED: { label: "Supervised", tone: "amber", hint: "Every draft is reviewed one by one." },
  PROVEN: { label: "Proven", tone: "moss", hint: "Earned on the evidence. Routine drafts can be approved as a batch." }
};
const VERDICT_LABEL = { MATCHES: "Matches", DIFFERS: "Differs", WORSE: "Worse" };
const when = (iso) => (iso ? String(iso).slice(0, 16).replace("T", " ") : "");
const stamp = (data) => JSON.stringify(data);

function evidenceHtml(pair) {
  if (pair.stage === "SHADOW") {
    const s = pair.shadow;
    return `${s.marked} of ${s.needed} needed shadow drafts marked${s.match_pct === null ? "" : `, ${s.match_pct}% match`}.${s.reasons.length ? ` <span class="brief-note">${escapeHtml(s.reasons.join(" "))}</span>` : ` ${pill("Eligible", "moss")}`}`;
  }
  if (pair.stage === "SUPERVISED") {
    const p = pair.promotion;
    if (pair.blocked_reason) return `<span class="brief-note">${escapeHtml(pair.blocked_reason)} It cannot be Proven.</span>`;
    return `${p.reviewed_jobs} reviewed jobs${p.first_pass_pct === null ? "" : `, ${p.first_pass_pct}% approved first time`}.${p.reasons.length ? ` <span class="brief-note">${escapeHtml(p.reasons.join(" "))}</span>` : ` ${pill("Eligible", "moss")} <span class="brief-note">Not promoted until you click.</span>`}`;
  }
  return `<span class="brief-note">Moved back to Supervised automatically on any rejection, or 2 sent-back drafts in the last 10 reviews.</span>`;
}

function actionsHtml(pair) {
  const key = `data-staff="${escapeHtml(pair.staff_code)}" data-skill="${escapeHtml(pair.skill_id)}"`;
  const btn = (to, text, enabled = true, cls = "btn-sm") => `<button class="btn ${cls}" type="button" data-tl="stage" data-to="${to}" ${key} ${enabled ? "" : "disabled"}>${text}</button>`;
  if (pair.stage === "SHADOW") return btn("SUPERVISED", "Move to Supervised", pair.shadow?.eligible === true, "btn-primary btn-sm");
  if (pair.stage === "SUPERVISED") return `${btn("PROVEN", "Promote to Proven", pair.promotion?.can_promote === true, "btn-primary btn-sm")} ${btn("SHADOW", "Start shadow")}`;
  return btn("SUPERVISED", "Move back to Supervised");
}

function thresholdsHtml(pair) {
  const t = pair.thresholds;
  const field = (name, text, min) => `<label>${text} <input type="number" min="${min}" data-th="${name}" value="${t[name]}" style="width:5em" /></label>`;
  return `<details class="tl-th"><summary>Thresholds</summary><div class="filters" data-staff="${escapeHtml(pair.staff_code)}" data-skill="${escapeHtml(pair.skill_id)}">
    ${field("min_jobs", "Reviewed jobs needed", 5)}${field("min_first_pass_pct", "Approved first time (%)", 80)}${field("min_shadow_verdicts", "Shadow drafts to mark", 3)}${field("min_shadow_match_pct", "Shadow match (%)", 60)}
    <button class="btn btn-sm" type="button" data-tl="thresholds">Save</button></div><p class="field-note">You can make these stricter. The lowest allowed is 5 jobs, 80%, 3 shadow drafts and 60%.</p></details>`;
}

function pairsHtml(data) {
  if (!data.pairs.length) return `<p class="field-note">No worker has done any work yet. Each worker starts Supervised for every skill.</p>`;
  const rows = data.pairs.map((pair) => {
    const stage = STAGE[pair.stage];
    const notice = pair.demotion_notice ? `<div class="brief-note">Moved back automatically ${escapeHtml(when(pair.demotion_notice.at))}: ${escapeHtml(pair.demotion_notice.reason)}</div>` : "";
    return `<tr><td><strong>${escapeHtml(pair.staff_code)}</strong><div class="brief-note">${escapeHtml(pair.skill_id)}</div></td>
      <td>${pill(stage.label, stage.tone)}<div class="brief-note">${escapeHtml(stage.hint)}</div></td>
      <td>${evidenceHtml(pair)}${notice}${thresholdsHtml(pair)}</td><td>${actionsHtml(pair)}</td></tr>`;
  }).join("");
  return `<table class="sc-table"><thead><tr><th>Worker and skill</th><th>Stage</th><th>Evidence</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}

function shadowHtml(data) {
  if (!data.shadow_runs.length) return "";
  const rows = data.shadow_runs.map((s) => `<tr><td>${escapeHtml(s.staff_code)}<div class="brief-note">${escapeHtml(s.skill_id)} · ${escapeHtml(when(s.created_at))}</div></td>
    <td>${escapeHtml(s.title ?? "Shadow output")}<div class="brief-note">${escapeHtml(s.summary ?? "")}</div></td>
    <td>${s.verdict ? pill(VERDICT_LABEL[s.verdict], s.verdict === "MATCHES" ? "moss" : s.verdict === "WORSE" ? "red" : "amber") + (s.note ? ` <span class="brief-note">${escapeHtml(s.note)}</span>` : "") : ""}
      <div class="filters" data-shadow="${escapeHtml(s.id)}"><input type="text" maxlength="500" placeholder="Note (optional)" data-note />
      ${["MATCHES", "DIFFERS", "WORSE"].map((v) => `<button class="btn btn-sm" type="button" data-tl="mark" data-verdict="${v}">${VERDICT_LABEL[v]}</button>`).join(" ")}</div></td></tr>`).join("");
  return `<h4>Shadow drafts to mark</h4><p class="field-note">These were made beside your own work. They are not drafts, never reach Approval or the Outbox, and are never delivered. Compare each with what you did, then mark it.</p>
    <table class="sc-table"><thead><tr><th>Worker</th><th>Shadow output</th><th>Your mark</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function batchHtml(data) {
  const history = data.batches.length ? `<p class="field-note">Recent batches: ${data.batches.map((b) => `#${b.number} (${b.draft_count} drafts, ${escapeHtml(when(b.decided_at))})`).join("; ")}</p>` : "";
  if (!data.batchable.length) return `<h4>Batch approval</h4><p class="field-note">Nothing to approve in a batch. Only Proven workers' routine drafts appear here. Class A and regulated work never does.</p>${history}`;
  const rows = data.batchable.map((d) => `<label class="tl-draft"><input type="checkbox" data-draft="${escapeHtml(d.id)}" /> <strong>${escapeHtml(d.staff_code)}</strong> / ${escapeHtml(d.skill_id)}: ${escapeHtml(d.title ?? "Draft")} <span class="brief-note">${escapeHtml(d.summary ?? "")}</span></label>`).join("");
  return `<h4>Batch approval</h4><p class="field-note">One decision from you for the drafts you tick. Each draft still gets its own review record naming the batch. If any draft fails the checks, nothing is approved. Up to ${data.max_batch} drafts.</p>
    <div class="tl-drafts">${rows}</div>
    <div class="filters"><input type="text" id="tlBatchNote" maxlength="500" placeholder="Why you approve this batch (required)" style="min-width:20em" /> <button class="btn btn-sm" type="button" data-tl="batch-check">Check batch</button> <button class="btn btn-primary btn-sm" type="button" data-tl="batch-approve" disabled>Approve batch</button></div>
    <div id="tlBatchResult" class="field-note"></div>${history}`;
}

function render(box, data) {
  box.innerHTML = panel("Trust Ladder", `<p class="field-note">Authority is earned for each worker and skill, never assumed. <strong>Shadow</strong>: runs beside you, never delivered. <strong>Supervised</strong>: you review every draft. <strong>Proven</strong>: you promoted it on the evidence. Promotion is always your click. A rejection, or 2 sent-back drafts in the last 10, moves a Proven worker back automatically. Class A and regulated work can never be Proven.</p>
    <div id="tlMsg" class="field-note" role="status"></div>${pairsHtml(data)}${shadowHtml(data)}${batchHtml(data)}`);
}

function say(box, text, bad = false) {
  const el = box.querySelector("#tlMsg");
  if (el) { el.textContent = text; el.style.color = bad ? "var(--danger, #b3261e)" : ""; }
}

export async function mountTrustLadder(box) {
  if (!box) return;
  let data;
  const load = async () => {
    try { data = await api.getTrustLadder(); } catch (err) {
      box.innerHTML = String(err?.message ?? "").match(/owner/i) ? "" : panel("Trust Ladder", `<p class="field-note">${escapeHtml(err?.message ?? "Could not load the Trust Ladder.")}</p>`);
      return false;
    }
    render(box, data);
    return true;
  };
  if (!(await load())) return;
  let checked = null;
  const ticked = () => [...box.querySelectorAll("input[data-draft]:checked")].map((el) => el.dataset.draft);
  if (box.dataset.tlBound) return;
  box.dataset.tlBound = "1";
  box.addEventListener("change", (event) => {
    if (event.target.matches("input[data-draft]")) { checked = null; const approve = box.querySelector('[data-tl="batch-approve"]'); if (approve) approve.disabled = true; }
  });
  box.addEventListener("click", async (event) => {
    const btn = event.target.closest("button[data-tl]");
    if (!btn || btn.disabled) return;
    const kind = btn.dataset.tl;
    try {
      if (kind === "stage") {
        await api.setLadderStage({ staff_code: btn.dataset.staff, skill_id: btn.dataset.skill, to: btn.dataset.to });
        await load(); say(box, `Moved to ${STAGE[btn.dataset.to].label}.`);
      } else if (kind === "thresholds") {
        const wrap = btn.closest("[data-staff]");
        const thresholds = Object.fromEntries([...wrap.querySelectorAll("input[data-th]")].map((el) => [el.dataset.th, Number(el.value)]));
        await api.setLadderThresholds({ staff_code: wrap.dataset.staff, skill_id: wrap.dataset.skill, thresholds });
        await load(); say(box, "Thresholds saved.");
      } else if (kind === "mark") {
        const wrap = btn.closest("[data-shadow]");
        await api.markShadow({ shadow_id: wrap.dataset.shadow, verdict: btn.dataset.verdict, note: wrap.querySelector("[data-note]").value || undefined });
        await load(); say(box, `Marked ${VERDICT_LABEL[btn.dataset.verdict].toLowerCase()}.`);
      } else if (kind === "batch-check") {
        const ids = ticked();
        const out = box.querySelector("#tlBatchResult");
        const result = await api.previewLadderBatch({ output_draft_ids: ids });
        checked = result.ok ? stamp(ids) : null;
        out.innerHTML = result.ok ? `${pill("All clear", "moss")} ${ids.length} draft${ids.length === 1 ? "" : "s"} can be approved together.`
          : `${pill("Refused", "red")} Nothing would be approved. ${escapeHtml(result.errors.join(" "))} ${result.refused.map((r) => escapeHtml(`${r.id}: ${r.reasons.join(" ")}`)).join(" ")}`;
        box.querySelector('[data-tl="batch-approve"]').disabled = !result.ok;
      } else if (kind === "batch-approve") {
        const ids = ticked();
        if (checked !== stamp(ids)) { say(box, "Check the batch again first; the selection changed.", true); return; }
        const note = box.querySelector("#tlBatchNote").value.trim();
        const result = await api.approveLadderBatch({ output_draft_ids: ids, note });
        await load();
        say(box, `Batch #${result.batch.number}: ${result.batch.approved} of ${ids.length} drafts approved${result.batch.failed.length ? `, ${result.batch.failed.length} failed` : ""}.`);
      }
    } catch (err) {
      const extra = err.details?.refused?.length ? ` ${err.details.refused.map((r) => r.reasons.join(" ")).join(" ")}` : "";
      say(box, `${err.message}${extra}`, true);
    }
  });
}
