import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import {
  DEFAULT_THRESHOLDS, FLOORS, MAX_BATCH, batchRefusals, canMove, demotionCheck, normaliseThresholds, planBatch, promotionEligibility, proofBlock, shadowEligibility
} from "../packages/core-domain/src/edcs-ladder.mjs";

// VI-S5 (ADR-113, 2026-10-11) -- Trust Ladder.
//
// Part 1 is pure: thresholds and their floors, promotion and shadow eligibility, the demotion rule, legal stage
// moves, Class A / regulated exclusion and batch planning, all with hand-computed answers.
// Part 2 drives the real API: shadow runs never reach Approval or the Outbox; the owner marks them; promotion is the
// owner's click and only when eligible; batch approval is all-or-nothing, refuses non-Proven pairs, writes one
// review per draft naming the batch and audits the batch; a rejection demotes automatically; owner-only; firm isolation.
// Local JSON backend by default; set VFIRM_SMOKE_DATABASE_URL for a fresh, fully-migrated Postgres.

const root = process.cwd();
const SERVICE_TOKEN = "smoke-service-token-vi-s5";
const tmp = await mkdtemp(join(tmpdir(), "vfirm-vi-s5-"));
const apiPort = 3185;
const apiBase = `http://127.0.0.1:${apiPort}`;
let api = null;
let logs = "";

// ============================ part 1: the rules ============================
const A = "APPROVED_FOR_CLIENT_DRAFT", R = "REVISION_REQUIRED", X = "REJECTED";
const jobs = (...decisions) => decisions.map((decision, i) => ({ decision, reviewed_at: `2026-09-${String(i + 1).padStart(2, "0")}T00:00:00.000Z` }));
assert.deepEqual(DEFAULT_THRESHOLDS, { min_jobs: 10, min_first_pass_pct: 90, min_shadow_verdicts: 5, min_shadow_match_pct: 80 });
// thresholds: stricter is fine, looser than the floor is refused
assert.deepEqual(normaliseThresholds({}).thresholds, DEFAULT_THRESHOLDS);
assert.equal(normaliseThresholds({ min_jobs: 20, min_first_pass_pct: 95 }).ok, true);
for (const bad of [{ min_jobs: FLOORS.min_jobs - 1 }, { min_first_pass_pct: 79 }, { min_shadow_verdicts: 2 }, { min_shadow_match_pct: 59 }, { min_first_pass_pct: 101 }, { min_jobs: 7.5 }, { min_jobs: "abc" }]) {
  assert.equal(normaliseThresholds(bad).ok, false, JSON.stringify(bad));
}
// promotion: needs the jobs, the rate and no rejection in the run
const ten = promotionEligibility(jobs(A, A, A, A, A, A, A, A, A, A));
assert.deepEqual([ten.eligible, ten.first_pass_pct, ten.reviewed_jobs], [true, 100, 10]);
assert.equal(promotionEligibility(jobs(A, A, A, A, A, A, A, A, A)).eligible, false, "9 jobs is short of 10");
assert.match(promotionEligibility(jobs(A, A, A, A, A, A, A, A, A)).reasons[0], /Needs 10 reviewed jobs; has 9/);
const nine = promotionEligibility(jobs(A, A, A, A, A, A, A, A, A, R));
assert.deepEqual([nine.eligible, nine.first_pass_pct], [true, 90], "9 of 10 is exactly 90%");
assert.equal(promotionEligibility(jobs(A, A, A, A, A, A, A, A, R, R)).eligible, false, "80% is under 90%");
const rej = promotionEligibility(jobs(A, A, A, A, A, A, A, A, A, X), { ...DEFAULT_THRESHOLDS, min_first_pass_pct: 80 });
assert.deepEqual([rej.eligible, rej.rejected_in_run], [false, 1], "one rejection in the run blocks promotion even at 90%");
assert.equal(promotionEligibility(jobs(X, A, A, A, A, A, A, A, A, A, A)).eligible, true, "only the latest 10 count: the early rejection has aged out");
assert.equal(promotionEligibility(jobs(A, A, A, A, A), { ...DEFAULT_THRESHOLDS, min_jobs: 5 }).eligible, true);
// shadow: marks decide
assert.equal(shadowEligibility(["MATCHES", "MATCHES", "MATCHES", "MATCHES"]).eligible, false, "4 marks is short of 5");
assert.equal(shadowEligibility(["MATCHES", "MATCHES", "MATCHES", "MATCHES", "DIFFERS"]).eligible, true, "80% matches");
assert.equal(shadowEligibility(["MATCHES", "MATCHES", "MATCHES", "DIFFERS", "DIFFERS"]).eligible, false, "60% matches");
assert.equal(shadowEligibility(["MATCHES", "MATCHES", "MATCHES", "MATCHES", "MATCHES", "WORSE"]).eligible, false, "any 'worse' blocks");
assert.equal(shadowEligibility([null, "MATCHES", "MATCHES", "MATCHES", "MATCHES", "MATCHES"]).marked, 5, "unmarked runs are not counted");
// demotion: any rejection, or 2 sent back in the latest 10
assert.equal(demotionCheck([A, A, A]).demote, false);
assert.equal(demotionCheck([A, R, A]).demote, false, "one sent-back draft is tolerated");
assert.equal(demotionCheck([A, R, A, R]).demote, true);
assert.equal(demotionCheck([A, X]).demote, true);
assert.equal(demotionCheck([R, A, A, A, A, A, A, A, A, A, R]).demote, false, "the first sent-back has left the latest 10");
assert.equal(demotionCheck([X, A, A, A, A, A, A, A, A, A, A]).demote, false, "a rejection older than 10 reviews has aged out");
// stage moves
assert.deepEqual([canMove("SHADOW", "SUPERVISED"), canMove("SHADOW", "PROVEN"), canMove("SUPERVISED", "PROVEN"), canMove("SUPERVISED", "SHADOW"), canMove("PROVEN", "SUPERVISED"), canMove("PROVEN", "SHADOW")], [true, false, true, true, true, false]);
// Class A and regulated work can never be proven or batched
assert.ok(proofBlock({ class_a: true }));
for (const risk of ["HIGH", "REGULATED", "CRITICAL", "high"]) assert.ok(proofBlock({ risk_class: risk }), risk);
assert.equal(proofBlock({ risk_class: "CONTROLLED" }), null);
assert.equal(proofBlock({ risk_class: "INTERNAL" }), null);
const good = { id: "d1", found: true, status: "DRAFT_REVIEW_REQUIRED", shadow: false, class_a: false, risk_class: "CONTROLLED", pair_stage: "PROVEN", staff_code: "FAO-001", skill_id: "FAO-11" };
assert.deepEqual(batchRefusals(good), []);
assert.ok(batchRefusals({ ...good, class_a: true }).length);
assert.ok(batchRefusals({ ...good, risk_class: "REGULATED" }).length);
assert.ok(batchRefusals({ ...good, pair_stage: "SUPERVISED" }).length);
assert.ok(batchRefusals({ ...good, pair_stage: "SHADOW" }).length);
assert.ok(batchRefusals({ ...good, shadow: true }).length);
assert.ok(batchRefusals({ ...good, status: "APPROVED_FOR_CLIENT_DRAFT" }).length);
assert.deepEqual(batchRefusals({ id: "x", found: false }), ["Draft not found."]);
assert.equal(planBatch([good]).ok, true);
assert.equal(planBatch([]).ok, false);
assert.equal(planBatch([good, good]).ok, false, "duplicates refused");
assert.equal(planBatch(Array.from({ length: MAX_BATCH + 1 }, (_, i) => ({ ...good, id: `d${i}` }))).ok, false);
const mixed = planBatch([good, { ...good, id: "d2", class_a: true }]);
assert.deepEqual([mixed.ok, mixed.refused.map((r) => r.id)], [false, ["d2"]], "one bad draft refuses the whole batch");
console.log("part 1 ok");

// ============================ part 2: the real API ============================
function startApi(asOf) {
  api = spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: root, stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env, VFIRM_API_PORT: String(apiPort),
      ...(process.env.VFIRM_SMOKE_DATABASE_URL ? {} : { VFIRM_STORE_PATH: join(tmp, "store.json") }),
      DATABASE_URL: process.env.VFIRM_SMOKE_DATABASE_URL ?? "", VFIRM_STORE_BACKEND: process.env.VFIRM_SMOKE_DATABASE_URL ? "postgres" : "json",
      VFIRM_FILE_STORAGE_BACKEND: "local", VFIRM_FILE_LOCAL_DIR: join(tmp, "files"), VFIRM_AUTOMATION_AS_OF: asOf, VFIRM_SERVICE_TOKEN: SERVICE_TOKEN
    }
  });
  api.stdout.on("data", (chunk) => { logs += `[api] ${chunk}`; });
  api.stderr.on("data", (chunk) => { logs += `[api] ${chunk}`; });
}
async function stopApi() {
  if (api && api.exitCode === null) { api.kill(); await once(api, "exit").catch(() => {}); }
}
async function waitForHealth() {
  const started = Date.now();
  while (Date.now() - started < 20000) {
    try { const r = await fetch(`${apiBase}/health`); if (r.ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for the API. Logs:\n${logs}`);
}
async function setToday(asOf) { await stopApi(); startApi(asOf); await waitForHealth(); }

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${apiBase}${path}`, { method, headers: { "content-type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined });
  const json = await response.json().catch(() => ({ ok: false, error: { message: "Non-JSON response" } }));
  return { response, json };
}
async function get(path, headers = {}) {
  const { response, json } = await request(path, { headers });
  assert.equal(response.ok, true, `${path} HTTP ${response.status}: ${JSON.stringify(json)}`);
  return json.data;
}
async function post(path, body, headers = {}) {
  const { response, json } = await request(path, { method: "POST", body, headers });
  assert.equal(response.ok, true, `${path} HTTP ${response.status}: ${JSON.stringify(json)}`);
  assert.equal(json.ok, true, `${path} failed: ${JSON.stringify(json)}`);
  return json.data;
}
async function fails(method, path, status, code, body, headers = {}) {
  const { response, json } = await request(path, { method, body, headers });
  assert.notEqual(json.ok, true, `${method} ${path} unexpectedly succeeded: ${JSON.stringify(json)}`);
  assert.equal(response.status, status, `${method} ${path}: expected HTTP ${status}, got ${response.status} ${JSON.stringify(json)}`);
  if (code) assert.equal(json.error?.code, code, `${method} ${path}: expected ${code}, got ${JSON.stringify(json.error)}`);
}
const headersFor = (actorId, firm, role = "principal") => ({ "x-vfirm-actor-id": actorId, "x-vfirm-tenant-id": firm.tenant_id, "x-vfirm-firm-id": firm.id, "x-vfirm-role": role });
const stamp = Date.now();
let firmCounter = 0;
async function newFirm(label) {
  firmCounter += 1;
  const tenant = await post("/tenants", { name: `VI-S5 ${label} Tenant ${stamp}-${firmCounter}` });
  const seed = await post("/firms", { tenant_id: tenant.id, name: `VI-S5 ${label} Firm ${stamp}-${firmCounter}`, principal_name: `${label} Owner` });
  const firm = seed.firm;
  return { firm, h: headersFor(seed.principal_actor.id, firm), staff: headersFor(seed.principal_actor.id, firm, "PILOT_OPERATOR"), s: { tenant_id: firm.tenant_id, firm_id: firm.id }, label };
}
const q = (ctx, extra = "") => `tenant_id=${ctx.s.tenant_id}&firm_id=${ctx.s.firm_id}${extra}`;
const store = async (ctx) => get("/mvp/store", ctx.h);
const requestsOf = async (ctx) => (await store(ctx)).work_requests.filter((r) => r.firm_id === ctx.firm.id);
const tickWith = async (token, scope = null) => {
  const query = scope ? `?tenant_id=${scope.tenant_id}&firm_id=${scope.firm_id}` : "";
  const response = await fetch(`${apiBase}/automation/tick${query}`, { method: "POST", headers: { "content-type": "application/json", ...(token ? { "x-vfirm-service-token": token } : {}) }, body: "{}" });
  return { response, json: await response.json() };
};
const tick = async (ctx) => { const { response, json } = await tickWith(SERVICE_TOKEN, ctx.s); assert.equal(response.ok, true, JSON.stringify(json)); return json.data.standing; };
async function hireStaff(ctx) {
  await post("/ops/awia-package-assignment", { ...ctx.s, package_code: "HIRE_ME" }, ctx.h);
  const hire = (role_code, display_name, position_id) => post("/awia/virtual-staff/hire-worker", { ...ctx.s, role_code, display_name, position_id }, ctx.h);
  const bookkeeper = await hire("FAO", "Bookkeeper", "bookkeeper");
  const sales = await hire("SAO", "Sales Coordinator", "sales_coordinator");
  for (const worker of [bookkeeper, sales]) await post("/awia/virtual-staff/lifecycle", { ...ctx.s, staff_code: worker.staff_code, to_state: "ACTIVE" }, ctx.h);
  return { bookkeeper, sales };
}
async function importRegister(ctx, name) {
  const buffer = await readFile(join(fixtures, name));
  const response = await fetch(`${apiBase}/files/upload?${q(ctx)}&filename=${encodeURIComponent(name)}`, { method: "POST", headers: { "content-type": XLSX, ...ctx.h }, body: buffer });
  const uploaded = (await response.json()).data;
  return post("/edcs/register-imports", { ...ctx.s, file_id: uploaded.id }, ctx.h);
}
async function uploadAndRegister(ctx, filename, documentType, title) {
  const response = await fetch(`${apiBase}/files/upload?${q(ctx)}&filename=${encodeURIComponent(filename)}`, { method: "POST", headers: { "content-type": "text/csv", ...ctx.h }, body: Buffer.from("date,description,amount\n2026-09-03,Sample,100.00\n") });
  const file = (await response.json()).data;
  assert.ok(file?.id, `upload ${filename}`);
  await post("/documents", { ...ctx.s, file_id: file.id, document_type: documentType, title }, ctx.h);
  return file;
}




const TL = (ctx, extra = "") => get(`/trust-ladder?${q(ctx)}${extra}`, ctx.h);
const CSV = "date,reference,amount\n2026-09-01,INV-1,500\n2026-09-02,INV-2,120.50\n";
const upload = async (ctx, name, text, mime = "text/csv") => (await (await fetch(`${apiBase}/files/upload?${q(ctx)}&filename=${encodeURIComponent(name)}`, { method: "POST", headers: { "content-type": mime, ...ctx.h }, body: Buffer.from(text) })).json()).data;
let jobCounter = 0;
// One bank-reconciliation job for a worker; returns the workdesk item id.
async function job(ctx, worker) {
  jobCounter += 1;
  const bank = await upload(ctx, `bank${jobCounter}.csv`, CSV); const ledger = await upload(ctx, `led${jobCounter}.csv`, CSV);
  const wr = await post("/work-requests", { ...ctx.s, title: `Reconcile ${jobCounter}`, request_type_id: "bank_reconciliation", file_ids: [bank.id, ledger.id], file_roles: { [bank.id]: "bank_statement", [ledger.id]: "book_entries" }, assign_to_staff_code: worker.staff_code }, ctx.h);
  return wr.workdesk_item.id;
}
const run = (ctx, itemId) => post("/awia/virtual-staff/workdesk-item/run-skill", { ...ctx.s, workdesk_item_id: itemId }, ctx.h);
const decide = (ctx, draftId, decision, notes) => post("/awia/virtual-staff/output-review", { ...ctx.s, output_draft_id: draftId, review_decision: decision, review_notes: notes }, ctx.h);
const setStage = (ctx, worker, to, headers = ctx.h) => request("/trust-ladder/stage", { method: "POST", body: { ...ctx.s, staff_code: worker.staff_code, skill_id: "FAO-11", to }, headers });
const pairOf = async (ctx, worker) => (await TL(ctx)).pairs.find((p) => p.staff_code === worker.staff_code && p.skill_id === "FAO-11");
const events = async (ctx, type) => (await get(`/audit-events?${q(ctx)}`, ctx.h)).filter((e) => (e.action ?? e.event_type) === type);

try {
  startApi("2026-10-12");
  await waitForHealth();
  const O = await newFirm("Owner");
  const B = await newFirm("Bravo");
  const staff = await hireStaff(O);
  const fao = staff.bookkeeper;

  // ---- owner-only; defaults ----
  await fails("GET", `/trust-ladder?${q(O)}`, 403, "EDCS_OWNER_REQUIRED", undefined, O.staff);
  const empty = await TL(O);
  assert.deepEqual([empty.pairs.length, empty.batchable.length, empty.shadow_runs.length, empty.batches.length], [0, 0, 0, 0]);
  assert.deepEqual(empty.defaults, DEFAULT_THRESHOLDS);

  // ---- thresholds: floors enforced, owner-only, audited ----
  const T = (thresholds, headers = O.h) => request("/trust-ladder/thresholds", { method: "POST", body: { ...O.s, staff_code: fao.staff_code, skill_id: "FAO-11", thresholds }, headers });
  assert.equal((await T({ min_jobs: 2 })).response.status, 400, "looser than the floor is refused");
  assert.equal((await T({ min_jobs: 5 }, O.staff)).response.status, 403);
  const setT = await T({ min_jobs: 5, min_first_pass_pct: 80, min_shadow_verdicts: 3, min_shadow_match_pct: 60 });
  assert.equal(setT.response.ok, true, JSON.stringify(setT.json));

  // ---- SHADOW: run, never delivered ----
  assert.equal((await setStage(O, fao, "PROVEN")).response.status, 409, "Supervised -> Proven needs the evidence");
  assert.equal((await setStage(O, fao, "SHADOW", O.staff)).response.status, 403, "owner-only");
  assert.equal((await setStage(O, fao, "SHADOW")).response.ok, true);
  assert.equal((await pairOf(O, fao)).stage, "SHADOW");
  const items = [];
  for (let i = 0; i < 3; i += 1) items.push(await job(O, fao));
  const shadowRuns = [];
  for (const id of items) {
    const out = await run(O, id);
    assert.equal(out.shadow, true);
    assert.equal(out.output_draft, undefined, "a shadow run returns no draft");
    shadowRuns.push(out.shadow_run.id);
  }
  let st = await store(O);
  const mineDrafts = st.awia_staff_output_drafts.filter((d) => d.firm_id === O.firm.id);
  assert.equal(mineDrafts.length, 0, "shadow output is not a draft: nothing for Approval");
  assert.equal(st.awia_client_delivery_drafts.filter((d) => d.firm_id === O.firm.id).length, 0, "nothing for the Outbox");
  assert.equal(st.awia_staff_workdesk_items.filter((i) => i.firm_id === O.firm.id && items.includes(i.id)).every((i) => i.workdesk_status === "ASSIGNED"), true, "the human's job is untouched");
  assert.equal(st.awia_staff_conversation_messages.filter((m) => m.firm_id === O.firm.id && m.kind === "DRAFT_READY").length, 0, "no 'draft ready' message");
  await fails("POST", "/awia/virtual-staff/output-review", 404, null, { ...O.s, output_draft_id: shadowRuns[0], review_decision: A }, O.h);
  await fails("POST", "/awia/virtual-staff/client-delivery-draft", 404, null, { ...O.s, output_draft_id: shadowRuns[0], client_id: "x" }, O.h);
  const listed = await TL(O);
  assert.equal(listed.shadow_runs.length, 3);
  assert.equal(listed.shadow_runs.every((s) => s.verdict === null), true);
  assert.equal(listed.pairs.find((p) => p.skill_id === "FAO-11").shadow.eligible, false);

  // ---- the owner marks them ----
  const M = (shadow_id, verdict, headers = O.h) => request("/trust-ladder/shadow/mark", { method: "POST", body: { ...O.s, shadow_id, verdict, note: "checked against the human's file" }, headers });
  assert.equal((await M(shadowRuns[0], "GREAT")).response.status, 400);
  assert.equal((await M(shadowRuns[0], "MATCHES", O.staff)).response.status, 403);
  assert.equal((await M("00000000-0000-4000-8000-000000000000", "MATCHES")).response.status, 404);
  assert.equal((await M(shadowRuns[0], "MATCHES", B.h)).response.ok, false, "another firm cannot mark Owner's shadow run");
  assert.equal((await setStage(O, fao, "SUPERVISED")).response.status, 409, "not enough marked shadow drafts yet");
  assert.equal((await M(shadowRuns[0], "MATCHES")).response.ok, true);
  assert.equal((await M(shadowRuns[1], "MATCHES")).response.ok, true);
  assert.equal((await setStage(O, fao, "SUPERVISED")).response.status, 409, "2 of 3 marked");
  assert.equal((await M(shadowRuns[2], "DIFFERS")).response.ok, true);
  const sp = (await pairOf(O, fao)).shadow;
  assert.deepEqual([sp.marked, sp.matches, sp.match_pct, sp.eligible], [3, 2, 67, true], "67% matches clears the owner's 60%");
  assert.equal((await setStage(O, fao, "PROVEN")).response.status, 409, "Shadow -> Proven is not a legal move");
  assert.equal((await setStage(O, fao, "SUPERVISED")).response.ok, true);
  assert.equal((await events(O, "trust_ladder.shadow_marked")).length, 3);
  assert.equal((await events(O, "trust_ladder.stage_changed")).length, 2);

  // ---- SUPERVISED: real drafts, owner reviews; promotion is a click and only when eligible ----
  const draftsOf = [];
  for (const id of items) { const out = await run(O, id); assert.ok(out.output_draft?.id, "supervised runs produce a real draft"); draftsOf.push(out.output_draft.id); }
  for (const d of draftsOf) await decide(O, d, A);
  for (let i = 0; i < 1; i += 1) { const id = await job(O, fao); const out = await run(O, id); await decide(O, out.output_draft.id, A); }
  let pair = await pairOf(O, fao);
  assert.deepEqual([pair.stage, pair.promotion.reviewed_jobs, pair.promotion.eligible], ["SUPERVISED", 4, false], "4 reviewed jobs, owner needs 5");
  assert.equal((await setStage(O, fao, "PROVEN")).response.status, 409);
  { const id = await job(O, fao); const out = await run(O, id); await decide(O, out.output_draft.id, A); }
  pair = await pairOf(O, fao);
  assert.deepEqual([pair.promotion.eligible, pair.promotion.can_promote, pair.promotion.first_pass_pct, pair.stage], [true, true, 100, "SUPERVISED"], "eligible, but still Supervised until the owner clicks");
  assert.equal((await setStage(O, fao, "PROVEN", O.staff)).response.status, 403);
  assert.equal((await setStage(O, fao, "PROVEN")).response.ok, true);
  pair = await pairOf(O, fao);
  assert.equal(pair.stage, "PROVEN");
  assert.deepEqual(pair.history.map((h) => [h.from, h.to, h.automatic]), [["SUPERVISED", "SHADOW", false], ["SHADOW", "SUPERVISED", false], ["SUPERVISED", "PROVEN", false]]);

  // ---- PROVEN: batch approval ----
  const pending = [];
  for (let i = 0; i < 3; i += 1) { const id = await job(O, fao); const out = await run(O, id); pending.push(out.output_draft.id); }
  const batchable = (await TL(O)).batchable;
  assert.deepEqual(batchable.map((d) => d.id).sort(), [...pending].sort(), "only Proven, non-Class-A drafts waiting for review are offered");
  const PV = (ids, headers = O.h) => request("/trust-ladder/batch/preview", { method: "POST", body: { ...O.s, output_draft_ids: ids }, headers });
  const AP = (ids, note, headers = O.h) => request("/trust-ladder/batch/approve", { method: "POST", body: { ...O.s, output_draft_ids: ids, note }, headers });
  assert.equal((await PV(pending, O.staff)).response.status, 403);
  assert.equal((await AP(pending, "ok", O.staff)).response.status, 403, "owner-only");
  const preview = await PV(pending);
  assert.deepEqual([preview.response.ok, preview.json.data.ok], [true, true]);
  assert.equal((await AP(pending, "")).response.status, 400, "a note is required");
  assert.equal((await AP([], "ok go")).response.status, 409, "an empty batch is refused");
  assert.equal((await AP([pending[0], pending[0]], "twice")).response.status, 409, "the same draft twice is refused");
  // all-or-nothing: one draft that is not waiting for review refuses the whole batch
  const stale = (await store(O)).awia_staff_output_drafts.find((d) => d.id === draftsOf[0]);
  assert.equal(stale.status, "APPROVED_FOR_CLIENT_DRAFT");
  const refused = await AP([pending[0], stale.id], "mixed batch");
  assert.equal(refused.response.status, 409);
  assert.equal(refused.json.error.code, "BATCH_REFUSED");
  assert.equal((await store(O)).awia_staff_output_drafts.find((d) => d.id === pending[0]).status, "DRAFT_REVIEW_REQUIRED", "nothing was approved");
  assert.equal((await AP([pending[0], "00000000-0000-4000-8000-000000000000"], "ghost")).response.status, 409);
  assert.equal((await AP(pending, "approve", B.h)).response.ok, false, "another firm's owner cannot approve Owner's drafts");
  assert.equal((await store(O)).awia_staff_output_drafts.find((d) => d.id === pending[1]).status, "DRAFT_REVIEW_REQUIRED");

  const ok = await AP(pending, "Routine monthly reconciliations, spot-checked");
  assert.equal(ok.response.ok, true, JSON.stringify(ok.json));
  assert.deepEqual([ok.json.data.batch.status, ok.json.data.batch.approved, ok.json.data.batch.failed.length], ["DECIDED", 3, 0]);
  const after = await store(O);
  const reviewsOf = after.awia_staff_output_reviews.filter((r) => r.firm_id === O.firm.id && pending.includes(r.output_draft_id));
  assert.equal(reviewsOf.length, 3, "one review record per draft");
  assert.equal(new Set(reviewsOf.map((r) => r.id)).size, 3);
  assert.equal(new Set(reviewsOf.map((r) => r.batch_id)).size, 1, "each review names the same batch");
  assert.equal(reviewsOf.every((r) => r.batch_id === ok.json.data.batch.id && r.batch_number === 1 && r.review_decision === A && /Batch approval #1/.test(r.review_notes)), true);
  assert.equal(pending.every((id) => after.awia_staff_output_drafts.find((d) => d.id === id).status === A), true);
  assert.equal((await events(O, "trust_ladder.batch_approved")).length, 1, "the batch is audited");
  assert.equal((await events(O, "awia.virtual_staff.output_reviewed")).length >= 8, true, "and every draft's own review is audited");
  assert.equal((await TL(O)).batches.length, 1);
  assert.equal((await AP(pending, "again")).response.status, 409, "approved drafts are no longer waiting");

  // ---- a Supervised pair cannot be batched ----
  assert.equal((await pairOf(O, fao)).stage, "PROVEN");
  assert.equal((await request("/trust-ladder/stage", { method: "POST", body: { ...O.s, staff_code: fao.staff_code, skill_id: "FAO-11", to: "PROVEN" }, headers: O.h })).response.status, 409, "already Proven: not a legal move");

  // ---- automatic demotion: a rejection ----
  const bad = await run(O, await job(O, fao));
  const rejected = await decide(O, bad.output_draft.id, X, "wrong period");
  assert.equal(rejected.trust_ladder_demotion?.demoted, true, "the review response says the worker was demoted");
  pair = await pairOf(O, fao);
  assert.equal(pair.stage, "SUPERVISED");
  assert.equal(pair.demotion_notice.reason, "A draft was rejected.");
  assert.deepEqual(pair.history.at(-1) && [pair.history.at(-1).from, pair.history.at(-1).to, pair.history.at(-1).automatic], ["PROVEN", "SUPERVISED", true]);
  assert.equal((await events(O, "trust_ladder.stage_changed")).length, 4, "the automatic demotion is audited (shadow, supervised, proven, then the demotion)");
  // after demotion it is Supervised: its next draft is a normal draft and a batch is refused
  const next = await run(O, await job(O, fao));
  assert.ok(next.output_draft.id);
  const noBatch = await AP([next.output_draft.id], "should not work");
  assert.equal(noBatch.response.status, 409);
  assert.match(JSON.stringify(noBatch.json.error.details), /not Proven/);
  assert.equal((await store(O)).awia_staff_output_drafts.find((d) => d.id === next.output_draft.id).status, "DRAFT_REVIEW_REQUIRED");
  // promotion must be re-earned: the rebuilt record starts again after the demotion
  assert.deepEqual([pair.promotion.reviewed_jobs, pair.promotion.eligible], [0, false]);

  // ---- Class A work can never be Proven or batched (real ARO-10 draft) ----
  const hr = await post("/awia/virtual-staff/hire-worker", { ...O.s, role_code: "ARO", display_name: "HR Administrator", position_id: "hr_administrator" }, O.h);
  await post("/awia/virtual-staff/lifecycle", { ...O.s, staff_code: hr.staff_code, to_state: "ACTIVE" }, O.h);
  const enquiry = await post("/front-desk/enquiries", { ...O.s, contact_name: "Aisyah", organization_name: "Kedai Maju Sdn Bhd", contact_email: `a-${stamp}@maju.example`, enquiry_summary: "Admin support retainer", requested_service_hint: "Administration" }, O.h);
  await post("/front-desk/enquiries/qualify", { ...O.s, enquiry_id: enquiry.id, decision: "QUALIFIED", consent_or_legal_basis_ref: "C", conflict_check_status: "CLEARED", conflict_check_ref: "CC" }, O.h);
  const handoff = await post("/front-desk/enquiries/handoff", { ...O.s, enquiry_id: enquiry.id, provided_inputs: {} }, O.h);
  const intake = await post("/intake-sessions", { ...O.s, relationship_id: handoff.relationship.id, provided_inputs: { engagement_summary: "Retainer" } }, O.h);
  const proposal = await post("/proposals", { ...O.s, relationship_id: handoff.relationship.id, intake_session_id: intake.intake.id, scope_summary: "Retainer", final_price: 400 }, O.h);
  const approvedProposal = await post("/proposals/approve", { ...O.s, proposal_id: proposal.proposal.id }, O.h);
  const opened = await post("/proposals/accept", { ...O.s, proposal_id: approvedProposal.proposal.id, project_name: "Admin retainer" }, O.h);
  const hrAssign = await post("/awia/virtual-staff/assign-task", { ...O.s, staff_code: hr.staff_code, task_id: opened.task.id, action: "administration.employee.onboarding", tool: "administration.employee.onboarding", skill_id: "ARO-10", client_id: opened.project.relationship_id, project_id: opened.project.id, evidence_refs: ["vi5-evidence"] }, O.h);
  assert.equal(hrAssign.workdesk_item.class_a_approval_required, true);
  const hrDraft = await post("/awia/virtual-staff/output-draft", { ...O.s, workdesk_item_id: hrAssign.workdesk_item.id, output_title: "Onboarding prepared", output_summary: "Checklist for sign-off", output_payload: { placeholder: true } }, O.h);
  const promoteA = await request("/trust-ladder/stage", { method: "POST", body: { ...O.s, staff_code: hr.staff_code, skill_id: "ARO-10", to: "PROVEN" }, headers: O.h });
  assert.equal(promoteA.json.error?.code, "PROOF_BLOCKED", "a Class A pair can never be promoted");
  assert.match(promoteA.json.error.message, /Class A/);
  const classA = await AP([hrDraft.output_draft.id], "should be refused");
  assert.equal(classA.response.status, 409);
  assert.match(JSON.stringify(classA.json.error.details), /Class A/, "batch approval is refused for Class A");
  assert.equal((await store(O)).awia_staff_output_drafts.find((d) => d.id === hrDraft.output_draft.id).status, "DRAFT_REVIEW_REQUIRED");
  assert.equal((await TL(O)).batchable.some((d) => d.id === hrDraft.output_draft.id), false, "a Class A draft is never offered for a batch");
  const hrPair = (await TL(O)).pairs.find((p) => p.skill_id === "ARO-10");
  assert.match(hrPair.blocked_reason, /Class A/);

  // ---- the ladder never leaks across firms ----
  const theirs = await TL(B);
  assert.deepEqual([theirs.pairs.length, theirs.shadow_runs.length, theirs.batches.length], [0, 0, 0]);
  assert.equal(JSON.stringify(theirs).includes(fao.staff_code), false);

  console.log(JSON.stringify({
    status: "pass", sprint: "VI-S5", backend: process.env.VFIRM_SMOKE_DATABASE_URL ? "postgres" : "json",
    checked: [
      "thresholds can be stricter but never below the floors; promotion, shadow and demotion rules hand-computed",
      "shadow runs create no draft, no message, no delivery draft and cannot be reviewed; the human's job is untouched",
      "the owner marks shadow drafts; moving on needs enough marks; every stage change is owner-only and audited",
      "eligible is a flag: the worker stays Supervised until the owner promotes; illegal moves refused",
      "batch approval is all-or-nothing, owner-only, needs a note, refuses non-waiting drafts and non-Proven pairs, and each draft keeps its own review naming the batch",
      "a rejection demotes automatically, is audited, and promotion must be re-earned", "Class A work cannot be promoted, is never offered for a batch and is refused if sent", "another firm sees and changes nothing"
    ]
  }));
} finally {
  await stopApi();
  await rm(tmp, { recursive: true, force: true });
}
