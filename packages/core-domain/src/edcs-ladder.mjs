// VI-S5 (ADR-113): the Trust Ladder -- pure rules, no I/O.
//
// Authority is earned per worker-skill pair and never assumed.
//   SHADOW      the worker runs on a request the human also completes; its output is compared and never delivered.
//   SUPERVISED  today's model: every draft is reviewed one by one. This is the default for a pair with no record.
//   PROVEN      the owner has promoted the pair on the evidence. Class B only may then be approved as a batch.
// Promotion is always the owner's click ("eligible" is only a flag). Demotion is automatic.
// Class A and regulated work can never be PROVEN, and can never be in a batch.

export const STAGES = ["SHADOW", "SUPERVISED", "PROVEN"];
export const VERDICTS = ["MATCHES", "DIFFERS", "WORSE"];
export const REGULATED_RISK = new Set(["HIGH", "REGULATED", "CRITICAL"]);
export const MAX_BATCH = 25;
export const DEMOTION_WINDOW = 10;
export const DEMOTION_SENT_BACK = 2;

// Owner-set thresholds. The owner may make them stricter but never looser than the floors.
export const DEFAULT_THRESHOLDS = { min_jobs: 10, min_first_pass_pct: 90, min_shadow_verdicts: 5, min_shadow_match_pct: 80 };
export const FLOORS = { min_jobs: 5, min_first_pass_pct: 80, min_shadow_verdicts: 3, min_shadow_match_pct: 60 };

export const pairKey = (staffCode, skillId) => `${staffCode}|${skillId}`;

export function normaliseThresholds(input = {}) {
  const out = { ...DEFAULT_THRESHOLDS };
  const errors = [];
  for (const field of Object.keys(DEFAULT_THRESHOLDS)) {
    if (input[field] === undefined || input[field] === null || input[field] === "") continue;
    const value = Number(input[field]);
    if (!Number.isFinite(value) || !Number.isInteger(value)) { errors.push(`${field} must be a whole number.`); continue; }
    if (value < FLOORS[field]) { errors.push(`${field} cannot be below ${FLOORS[field]}.`); continue; }
    if (field.endsWith("_pct") && value > 100) { errors.push(`${field} cannot be above 100.`); continue; }
    out[field] = value;
  }
  return { ok: errors.length === 0, thresholds: out, errors };
}

// Why this kind of work can never be PROVEN (null when it can).
export function proofBlock({ class_a = false, risk_class = null, skill_class = null } = {}) {
  if (class_a === true || skill_class === "A") return "Class A work is prepared only; a person must approve it every time.";
  if (REGULATED_RISK.has(String(risk_class ?? "").toUpperCase())) return "Regulated or high-risk work is always reviewed one by one.";
  return null;
}

// Legal stage moves. Owner-driven except PROVEN -> SUPERVISED which can also be automatic.
export function canMove(from, to) {
  const ok = { SHADOW: ["SUPERVISED"], SUPERVISED: ["SHADOW", "PROVEN"], PROVEN: ["SUPERVISED"] };
  return (ok[from] ?? []).includes(to);
}

const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : null);

// Supervised -> Proven. `jobs` are the pair's reviewed jobs since it entered SUPERVISED, each
// { decision, reviewed_at } (the first decision on the job's first draft). The run is the latest `min_jobs`.
export function promotionEligibility(jobs, thresholds = DEFAULT_THRESHOLDS) {
  const need = thresholds.min_jobs;
  const sorted = [...jobs].sort((a, b) => String(a.reviewed_at).localeCompare(String(b.reviewed_at)));
  const run = sorted.slice(-need);
  const approved = run.filter((j) => j.decision === "APPROVED_FOR_CLIENT_DRAFT").length;
  const rejected = run.filter((j) => j.decision === "REJECTED").length;
  const rate = pct(approved, run.length);
  const reasons = [];
  if (sorted.length < need) reasons.push(`Needs ${need} reviewed jobs; has ${sorted.length}.`);
  else {
    if (rate < thresholds.min_first_pass_pct) reasons.push(`Approved first time ${rate}%; needs ${thresholds.min_first_pass_pct}%.`);
    if (rejected > 0) reasons.push(`${rejected} rejected in the latest ${need} jobs.`);
  }
  return { eligible: reasons.length === 0, reviewed_jobs: sorted.length, needed_jobs: need, run_size: run.length, first_pass_pct: rate, rejected_in_run: rejected, reasons };
}

// Shadow -> Supervised. `verdicts` are the owner's marks: MATCHES / DIFFERS / WORSE.
export function shadowEligibility(verdicts, thresholds = DEFAULT_THRESHOLDS) {
  const marked = verdicts.filter((v) => VERDICTS.includes(v));
  const matches = marked.filter((v) => v === "MATCHES").length;
  const worse = marked.filter((v) => v === "WORSE").length;
  const rate = pct(matches, marked.length);
  const reasons = [];
  if (marked.length < thresholds.min_shadow_verdicts) reasons.push(`Needs ${thresholds.min_shadow_verdicts} marked shadow drafts; has ${marked.length}.`);
  else {
    if (rate < thresholds.min_shadow_match_pct) reasons.push(`Matches ${rate}%; needs ${thresholds.min_shadow_match_pct}%.`);
    if (worse > 0) reasons.push(`${worse} marked worse than the human's work.`);
  }
  return { eligible: reasons.length === 0, marked: marked.length, needed: thresholds.min_shadow_verdicts, matches, worse, match_pct: rate, reasons };
}

// Automatic demotion. `reviews` are the pair's review decisions made while PROVEN (oldest first).
// Any rejection, or 2 sent-back drafts among the latest 10, demotes. Returns { demote:false } when nothing is wrong.
export function demotionCheck(reviews) {
  const latest = reviews.slice(-DEMOTION_WINDOW);
  if (latest.some((r) => r === "REJECTED")) return { demote: true, reason: "A draft was rejected." };
  const sentBack = latest.filter((r) => r === "REVISION_REQUIRED").length;
  if (sentBack >= DEMOTION_SENT_BACK) return { demote: true, reason: `${sentBack} drafts were sent back in the last ${DEMOTION_WINDOW} reviews.` };
  return { demote: false, reason: null };
}

// Batch approval: every draft must pass; otherwise nothing is approved. `draft` carries what the service looked up:
// { id, found, status, shadow, class_a, risk_class, pair_stage, staff_code, skill_id }
export function batchRefusals(draft) {
  const out = [];
  if (draft.found === false) return ["Draft not found."];
  if (draft.shadow) out.push("A shadow draft is never approved.");
  if (draft.status !== "DRAFT_REVIEW_REQUIRED") out.push("Draft is not waiting for review.");
  const block = proofBlock({ class_a: draft.class_a, risk_class: draft.risk_class });
  if (block) out.push(block);
  if (draft.pair_stage !== "PROVEN") out.push(`${draft.staff_code} / ${draft.skill_id} is not Proven.`);
  return out;
}

export function planBatch(drafts) {
  const list = Array.isArray(drafts) ? drafts : [];
  const errors = [];
  if (list.length === 0) errors.push("Choose at least one draft.");
  if (list.length > MAX_BATCH) errors.push(`A batch holds at most ${MAX_BATCH} drafts.`);
  if (new Set(list.map((d) => d.id)).size !== list.length) errors.push("The same draft is listed twice.");
  const refused = list.map((d) => ({ id: d.id, reasons: batchRefusals(d) })).filter((r) => r.reasons.length);
  return { ok: errors.length === 0 && refused.length === 0, errors, refused };
}
