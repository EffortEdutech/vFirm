// VI-S5 (ADR-113): the Trust Ladder service.
//
// Authority per worker-skill pair, earned and never assumed: SHADOW -> SUPERVISED -> PROVEN.
// - Owner-only for every read and write here.
// - Promotion is the owner's click; vFirm only says "eligible" (rules in packages/core-domain/src/edcs-ladder.mjs).
// - Demotion PROVEN -> SUPERVISED is automatic after a review (any rejection, or 2 sent back in the last 10).
// - Shadow runs live in their own rows (trust_ladder, kind SHADOW). They are never workdesk drafts, so they can never
//   reach Approval or the Outbox.
// - Batch approval (PROVEN pairs, Class B only): all-or-nothing check, one attributable batch row, and each draft still
//   gets its OWN review record (through the normal review path, including the CE-S5 delegation gate) that names the batch.

import { appendEventAndAudit, newUuid, now, readStore, withStore } from "./store.mjs";
import { edcsRepository as repo } from "./edcs-repository.mjs";
import { isFirmOwner } from "./edcs-owner.mjs";
import { factsFor } from "../../../packages/core-domain/src/edcs-scorecard.mjs";
import {
  DEFAULT_THRESHOLDS, MAX_BATCH, VERDICTS, canMove, demotionCheck, normaliseThresholds, pairKey, planBatch, promotionEligibility, proofBlock, shadowEligibility
} from "../../../packages/core-domain/src/edcs-ladder.mjs";

function httpError(status, code, message, details) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  if (details) error.details = details;
  return error;
}

function requireOwner(actor, action) {
  if (!isFirmOwner(actor)) throw httpError(403, "EDCS_OWNER_REQUIRED", `${action} requires the firm owner.`);
}

const mineOf = (scope) => (record) => record.tenant_id === scope.tenant_id && record.firm_id === scope.firm_id;
export const skillOfItem = (item) => item?.skill_id ?? item?.action ?? "UNKNOWN";

async function audit(scope, actor, events) {
  await withStore((store) => {
    for (const event of events) appendEventAndAudit(store, { actor, tenant_id: scope.tenant_id, firm_id: scope.firm_id, ...event });
  }, { tenantId: scope.tenant_id, ledger: false });
}

async function firmRecords(scope) {
  const store = await readStore(scope.tenant_id, { ledger: false });
  const mine = mineOf(scope);
  return {
    items: (store.awia_staff_workdesk_items ?? []).filter(mine), drafts: (store.awia_staff_output_drafts ?? []).filter(mine),
    reviews: (store.awia_staff_output_reviews ?? []).filter(mine), messages: (store.awia_staff_conversation_messages ?? []).filter(mine)
  };
}

const newPair = (scope, staff_code, skill_id) => ({
  id: newUuid(), kind: "PAIR", tenant_id: scope.tenant_id, firm_id: scope.firm_id, staff_code, skill_id,
  stage: "SUPERVISED", stage_since: null, thresholds: { ...DEFAULT_THRESHOLDS }, history: [], demotion_notice: null, created_at: now(), updated_at: now()
});

// The stage the pair is in right now. No row = SUPERVISED (today's behaviour).
export async function stageOf(scope, staffCode, skillId) {
  const pair = await repo.getLadderPair(scope, staffCode, skillId);
  return pair?.stage ?? "SUPERVISED";
}

// Why this pair can never be Proven (from the work it has actually been given), or null.
function blockOfPair(items) {
  for (const item of items) {
    const block = proofBlock({ class_a: item.class_a_approval_required === true, risk_class: item.risk_class });
    if (block) return block;
  }
  return null;
}

function pairView({ pair, staff_code, skill_id, items, drafts, reviews, messages, shadows }) {
  const mine = items.filter((i) => i.staff_code === staff_code && skillOfItem(i) === skill_id);
  const thresholds = pair?.thresholds ?? { ...DEFAULT_THRESHOLDS };
  const stage = pair?.stage ?? "SUPERVISED";
  const since = pair?.stage_since ?? null;
  const facts = mine.map((item) => factsFor(item, drafts, reviews, messages));
  const jobs = facts.filter((f) => f.decision && (!since || String(f.decided_at) > String(since))).map((f) => ({ decision: f.decision, reviewed_at: f.decided_at }));
  const myShadows = shadows.filter((s) => s.staff_code === staff_code && s.skill_id === skill_id && (!since || String(s.created_at) >= String(since)));
  const block = blockOfPair(mine);
  const promotion = stage === "SUPERVISED" ? promotionEligibility(jobs, thresholds) : null;
  const shadow = stage === "SHADOW" ? shadowEligibility(myShadows.map((s) => s.verdict), thresholds) : null;
  return {
    staff_code, skill_id, stage, stage_since: since, thresholds, blocked_reason: block,
    promotion: promotion ? { ...promotion, blocked: Boolean(block), can_promote: promotion.eligible && !block } : null,
    shadow: shadow ? { ...shadow, runs: myShadows.length } : null,
    demotion_notice: pair?.demotion_notice ?? null,
    history: (pair?.history ?? []).slice(-10)
  };
}

export async function readLadder({ scope, actor }) {
  requireOwner(actor, "The Trust Ladder");
  const { items, drafts, reviews, messages } = await firmRecords(scope);
  const pairs = await repo.listLadder(scope, "PAIR");
  const shadows = await repo.listLadder(scope, "SHADOW");
  const batches = (await repo.listLadder(scope, "BATCH")).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const keys = new Map();
  for (const item of items) if (item.staff_code) keys.set(pairKey(item.staff_code, skillOfItem(item)), [item.staff_code, skillOfItem(item)]);
  for (const pair of pairs) keys.set(pairKey(pair.staff_code, pair.skill_id), [pair.staff_code, pair.skill_id]);
  const byKey = new Map(pairs.map((p) => [pairKey(p.staff_code, p.skill_id), p]));
  const views = [...keys.values()].map(([staff_code, skill_id]) => pairView({ pair: byKey.get(pairKey(staff_code, skill_id)), staff_code, skill_id, items, drafts, reviews, messages, shadows }))
    .sort((a, b) => a.staff_code.localeCompare(b.staff_code) || a.skill_id.localeCompare(b.skill_id));
  const provenKeys = new Set(views.filter((v) => v.stage === "PROVEN" && !v.blocked_reason).map((v) => pairKey(v.staff_code, v.skill_id)));
  const itemById = new Map(items.map((i) => [i.id, i]));
  const batchable = drafts.filter((d) => d.status === "DRAFT_REVIEW_REQUIRED" && provenKeys.has(pairKey(d.staff_code, d.skill_id ?? skillOfItem(itemById.get(d.workdesk_item_id)))) && !blockOfPair([itemById.get(d.workdesk_item_id) ?? {}]) && d.class_a_approval_required !== true)
    .map((d) => ({ id: d.id, staff_code: d.staff_code, skill_id: d.skill_id ?? skillOfItem(itemById.get(d.workdesk_item_id)), title: d.output_title, summary: d.output_summary, created_at: d.created_at }))
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const openShadows = [...shadows].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).map((s) => ({
    id: s.id, staff_code: s.staff_code, skill_id: s.skill_id, workdesk_item_id: s.workdesk_item_id, title: s.title, summary: s.summary,
    verdict: s.verdict ?? null, note: s.note ?? null, created_at: s.created_at, marked_at: s.marked_at ?? null
  }));
  return {
    defaults: DEFAULT_THRESHOLDS, max_batch: MAX_BATCH, pairs: views, batchable, shadow_runs: openShadows,
    batches: batches.slice(0, 20).map((b) => ({ id: b.id, number: b.number, note: b.note, draft_count: b.draft_ids.length, decided_at: b.decided_at, status: b.status }))
  };
}

// ---------- stage changes ----------

async function savePair(scope, pair) {
  await repo.commit(scope, { trust_ladder: [{ ...pair, updated_at: now() }] });
}

export async function setStage({ scope, actor, body }) {
  requireOwner(actor, "Changing a worker's stage");
  const { staff_code, skill_id, to } = body;
  if (!staff_code || !skill_id || !to) throw httpError(400, "VALIDATION_ERROR", "staff_code, skill_id and to are required.");
  const existing = await repo.getLadderPair(scope, staff_code, skill_id);
  const pair = existing ?? newPair(scope, staff_code, skill_id);
  const from = pair.stage;
  if (!canMove(from, to)) throw httpError(409, "INVALID_STAGE_MOVE", `A worker cannot move from ${from} to ${to}.`);
  const { items, drafts, reviews, messages } = await firmRecords(scope);
  const shadows = await repo.listLadder(scope, "SHADOW");
  const view = pairView({ pair, staff_code, skill_id, items, drafts, reviews, messages, shadows });
  if (to === "PROVEN") {
    if (view.blocked_reason) throw httpError(409, "PROOF_BLOCKED", view.blocked_reason);
    if (!view.promotion?.eligible) throw httpError(409, "NOT_ELIGIBLE", `Not eligible yet: ${view.promotion?.reasons.join(" ") ?? ""}`.trim());
  }
  if (from === "SHADOW" && to === "SUPERVISED" && !view.shadow?.eligible) throw httpError(409, "NOT_ELIGIBLE", `Not eligible yet: ${view.shadow?.reasons.join(" ") ?? ""}`.trim());
  const at = now();
  pair.stage = to;
  pair.stage_since = at;
  pair.demotion_notice = null;
  pair.history = [...(pair.history ?? []), { at, from, to, automatic: false, by: actor.actor_id ?? null, note: body.note ? String(body.note).slice(0, 300) : null }];
  await savePair(scope, pair);
  await audit(scope, actor, [{ event_type: "trust_ladder.stage_changed", aggregate_type: "TrustLadderPair", aggregate_id: pair.id, payload: { staff_code, skill_id, from, to, automatic: false, note: body.note ?? null }, summary: `${staff_code} / ${skill_id} moved from ${from} to ${to} by the owner.` }]);
  return { pair: pairView({ pair, staff_code, skill_id, items, drafts, reviews, messages, shadows }) };
}

export async function setThresholds({ scope, actor, body }) {
  requireOwner(actor, "Setting thresholds");
  const { staff_code, skill_id } = body;
  if (!staff_code || !skill_id) throw httpError(400, "VALIDATION_ERROR", "staff_code and skill_id are required.");
  const checked = normaliseThresholds(body.thresholds ?? {});
  if (!checked.ok) throw httpError(400, "VALIDATION_ERROR", checked.errors.join(" "));
  const pair = (await repo.getLadderPair(scope, staff_code, skill_id)) ?? newPair(scope, staff_code, skill_id);
  const before = pair.thresholds;
  pair.thresholds = checked.thresholds;
  await savePair(scope, pair);
  await audit(scope, actor, [{ event_type: "trust_ladder.thresholds_set", aggregate_type: "TrustLadderPair", aggregate_id: pair.id, payload: { staff_code, skill_id, before, after: checked.thresholds }, summary: `Trust Ladder thresholds set for ${staff_code} / ${skill_id}.` }]);
  return { thresholds: checked.thresholds };
}

// ---------- shadow runs ----------

// Called by the run-skill route when the pair is in SHADOW. Nothing touches the workdesk item.
export async function saveShadowRun({ scope, actor, item, result }) {
  const record = {
    id: newUuid(), kind: "SHADOW", tenant_id: scope.tenant_id, firm_id: scope.firm_id, staff_code: item.staff_code, skill_id: skillOfItem(item),
    workdesk_item_id: item.id, title: result.output_title ?? null, summary: result.output_summary ?? null, output_payload: result.output_payload ?? null,
    output_file_id: result.output_file_id ?? null, generation: result.generation ?? null, verdict: null, note: null, created_at: now(), marked_at: null
  };
  await repo.commit(scope, { trust_ladder: [record] });
  await audit(scope, actor, [{ event_type: "trust_ladder.shadow_run", aggregate_type: "TrustLadderShadow", aggregate_id: record.id, payload: { staff_code: record.staff_code, skill_id: record.skill_id, workdesk_item_id: item.id }, summary: `${record.staff_code} / ${record.skill_id} ran in shadow; the output is not delivered.` }]);
  return { shadow: true, shadow_run: { id: record.id, staff_code: record.staff_code, skill_id: record.skill_id, workdesk_item_id: item.id, title: record.title, summary: record.summary }, message: "Shadow run saved. It is not a draft and is not delivered." };
}

export async function markShadow({ scope, actor, body }) {
  requireOwner(actor, "Marking a shadow draft");
  if (!body.shadow_id) throw httpError(400, "VALIDATION_ERROR", "shadow_id is required.");
  if (!VERDICTS.includes(body.verdict)) throw httpError(400, "VALIDATION_ERROR", `verdict must be one of ${VERDICTS.join(", ")}.`);
  const row = (await repo.listLadder(scope, "SHADOW")).find((s) => s.id === body.shadow_id);
  if (!row) throw httpError(404, "NOT_FOUND", `trust_ladder record not found: ${body.shadow_id}`);
  const next = { ...row, verdict: body.verdict, note: body.note ? String(body.note).slice(0, 500) : null, marked_at: now(), marked_by: actor.actor_id ?? null };
  await repo.commit(scope, { trust_ladder: [next] });
  await audit(scope, actor, [{ event_type: "trust_ladder.shadow_marked", aggregate_type: "TrustLadderShadow", aggregate_id: row.id, payload: { staff_code: row.staff_code, skill_id: row.skill_id, verdict: body.verdict }, summary: `Shadow draft for ${row.staff_code} / ${row.skill_id} marked ${body.verdict}.` }]);
  return { shadow_run: { id: next.id, verdict: next.verdict, note: next.note } };
}

// ---------- automatic demotion ----------

// Called by the review route after a review is saved. Never throws into the review.
export async function afterReview({ scope, actor, output_draft_id }) {
  try {
    const { items, drafts, reviews } = await firmRecords(scope);
    const draft = drafts.find((d) => d.id === output_draft_id);
    if (!draft) return null;
    const skillOf = (d) => d.skill_id ?? skillOfItem(items.find((i) => i.id === d.workdesk_item_id));
    const skill_id = skillOf(draft);
    const pair = await repo.getLadderPair(scope, draft.staff_code, skill_id);
    if (!pair || pair.stage !== "PROVEN") return null;
    const draftIds = new Set(drafts.filter((d) => d.staff_code === draft.staff_code && skillOf(d) === skill_id).map((d) => d.id));
    const decisions = reviews.filter((r) => draftIds.has(r.output_draft_id) && String(r.reviewed_at) > String(pair.stage_since ?? ""))
      .sort((a, b) => String(a.reviewed_at).localeCompare(String(b.reviewed_at))).map((r) => r.review_decision);
    const verdict = demotionCheck(decisions);
    if (!verdict.demote) return null;
    const at = now();
    pair.stage = "SUPERVISED";
    pair.stage_since = at;
    pair.history = [...(pair.history ?? []), { at, from: "PROVEN", to: "SUPERVISED", automatic: true, by: null, note: verdict.reason }];
    pair.demotion_notice = { at, reason: verdict.reason };
    await savePair(scope, pair);
    await audit(scope, actor, [{ event_type: "trust_ladder.stage_changed", aggregate_type: "TrustLadderPair", aggregate_id: pair.id, payload: { staff_code: pair.staff_code, skill_id, from: "PROVEN", to: "SUPERVISED", automatic: true, reason: verdict.reason }, summary: `${pair.staff_code} / ${skill_id} demoted to Supervised automatically: ${verdict.reason}` }]);
    return { demoted: true, staff_code: pair.staff_code, skill_id, reason: verdict.reason };
  } catch {
    return null;
  }
}

// What the Morning Brief should say about the ladder: recent automatic demotions.
export async function ladderNotices(scope, { sinceDays = 7 } = {}) {
  const pairs = await repo.listLadder(scope, "PAIR");
  const cutoff = new Date(Date.now() - sinceDays * 86400000).toISOString();
  const demotions = pairs.filter((p) => p.demotion_notice && String(p.demotion_notice.at) >= cutoff)
    .map((p) => ({ staff_code: p.staff_code, skill_id: p.skill_id, reason: p.demotion_notice.reason, at: p.demotion_notice.at }));
  return { demotions };
}

// ---------- batch approval ----------

async function lookupDrafts(scope, ids, enforce, actor) {
  const { items, drafts } = await firmRecords(scope);
  const pairs = new Map((await repo.listLadder(scope, "PAIR")).map((p) => [pairKey(p.staff_code, p.skill_id), p]));
  const out = [];
  for (const id of ids) {
    const draft = drafts.find((d) => d.id === id);
    if (!draft) { out.push({ id, found: false }); continue; }
    const item = items.find((i) => i.id === draft.workdesk_item_id) ?? {};
    const skill_id = draft.skill_id ?? skillOfItem(item);
    out.push({
      id, found: true, status: draft.status, shadow: draft.shadow === true, class_a: draft.class_a_approval_required === true || item.class_a_approval_required === true,
      risk_class: item.risk_class ?? null, staff_code: draft.staff_code, skill_id, pair_stage: pairs.get(pairKey(draft.staff_code, skill_id))?.stage ?? "SUPERVISED", title: draft.output_title
    });
  }
  // The CE-S5 delegation gate is checked per draft up front, so a batch never half-applies on a tier refusal.
  const gate = [];
  for (const info of out) {
    if (!info.found) continue;
    try { await enforce({ scope, actor, output_draft_id: info.id, review_decision: "APPROVED_FOR_CLIENT_DRAFT" }); } catch (error) { gate.push({ id: info.id, reason: error.message }); }
  }
  return { drafts: out, gate };
}

function planOf(drafts, gate) {
  const plan = planBatch(drafts);
  const refused = plan.refused.map((r) => ({ ...r }));
  for (const g of gate) {
    const hit = refused.find((r) => r.id === g.id);
    if (hit) hit.reasons.push(g.reason); else refused.push({ id: g.id, reasons: [g.reason] });
  }
  return { ok: plan.errors.length === 0 && refused.length === 0, errors: plan.errors, refused };
}

export async function previewBatch({ scope, actor, body, deps }) {
  requireOwner(actor, "Batch approval");
  const ids = Array.isArray(body.output_draft_ids) ? body.output_draft_ids : [];
  const { drafts, gate } = await lookupDrafts(scope, ids, deps.enforce, actor);
  const plan = planOf(drafts, gate);
  return { ok: plan.ok, errors: plan.errors, refused: plan.refused, drafts: drafts.map((d) => ({ id: d.id, title: d.title ?? null, staff_code: d.staff_code ?? null, skill_id: d.skill_id ?? null })) };
}

export async function approveBatch({ scope, actor, body, deps }) {
  requireOwner(actor, "Batch approval");
  const ids = Array.isArray(body.output_draft_ids) ? body.output_draft_ids : [];
  const note = String(body.note ?? "").trim();
  if (note.length < 3) throw httpError(400, "VALIDATION_ERROR", "Write a short note (at least 3 characters) saying why you approve this batch.");
  const { drafts, gate } = await lookupDrafts(scope, ids, deps.enforce, actor);
  const plan = planOf(drafts, gate);
  if (!plan.ok) throw httpError(409, "BATCH_REFUSED", "Nothing was approved: the batch has drafts that cannot be batch-approved.", { errors: plan.errors, refused: plan.refused });
  const existing = await repo.listLadder(scope, "BATCH");
  const batch = {
    id: newUuid(), kind: "BATCH", tenant_id: scope.tenant_id, firm_id: scope.firm_id, number: existing.length + 1, note: note.slice(0, 500),
    status: "DECIDING", draft_ids: ids, review_ids: [], failed: [], decided_by: actor.actor_id ?? null, decided_at: now(), created_at: now()
  };
  await repo.commit(scope, { trust_ladder: [batch] });
  for (const id of ids) {
    try {
      const done = await deps.review({ tenant_id: scope.tenant_id, firm_id: scope.firm_id, output_draft_id: id, review_decision: "APPROVED_FOR_CLIENT_DRAFT", review_notes: `Batch approval #${batch.number}: ${note}`, batch_id: batch.id, batch_number: batch.number });
      batch.review_ids.push(done.output_review?.id ?? null);
    } catch (error) {
      batch.failed.push({ id, reason: error.message });
    }
  }
  batch.status = batch.failed.length === 0 ? "DECIDED" : "PARTIAL";
  await repo.commit(scope, { trust_ladder: [batch] });
  await audit(scope, actor, [{ event_type: "trust_ladder.batch_approved", aggregate_type: "TrustLadderBatch", aggregate_id: batch.id, payload: { number: batch.number, draft_count: ids.length, approved: batch.review_ids.length, failed: batch.failed.length, note: batch.note }, summary: `Batch approval #${batch.number}: ${batch.review_ids.length} of ${ids.length} drafts approved.` }]);
  return { batch: { id: batch.id, number: batch.number, status: batch.status, approved: batch.review_ids.length, failed: batch.failed, draft_ids: ids } };
}
