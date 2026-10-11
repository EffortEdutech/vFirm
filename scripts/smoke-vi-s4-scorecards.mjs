import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { buildScorecards, median, missingInputsOf, resolvePeriod } from "../packages/core-domain/src/edcs-scorecard.mjs";

// VI-S4 (ADR-112, 2026-10-11) -- Worker scorecards and cost-to-serve.
//
// Part 1 is pure: a hand-built history with hand-computed answers (first-pass approval, revision, rejection,
// needs-info rates, median time to draft, missing inputs, the owner's wait, per-client effort and invoiced
// amounts in separate currencies), shuffled input, the window, low-sample flags, and "no human is profiled".
// Part 2 drives the real API and proves the same numbers from real work, owner-only access, period checks,
// firm isolation and that reading scorecards changes nothing.
// Local JSON backend by default; set VFIRM_SMOKE_DATABASE_URL for a fresh, fully-migrated Postgres.

const root = process.cwd();
const fixtures = join(root, "scripts/fixtures/bizkick");
const SERVICE_TOKEN = "smoke-service-token-vi-s4";
const tmp = await mkdtemp(join(tmpdir(), "vfirm-vi-s4-"));
const apiPort = 3184;
const apiBase = `http://127.0.0.1:${apiPort}`;
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
let api = null;
let logs = "";

// ============================ part 1: the engine ============================
const at = (day, hhmm = "00:00") => `2026-09-${day}T${hhmm}:00.000Z`;
const plus = (iso, minutes) => new Date(Date.parse(iso) + minutes * 60000).toISOString();
const item = (id, staff, skill, assigned, request = null, position = "bookkeeper") => ({ id, staff_code: staff, skill_id: skill, position_id: position, action: `${skill}.run`, assigned_at: assigned, work_request_id: request });
const draft = (id, itemId, created, revision = 1) => ({ id, workdesk_item_id: itemId, created_at: created, revision_number: revision });
const review = (id, draftId, decision, reviewedAt) => ({ id, output_draft_id: draftId, review_decision: decision, reviewed_at: reviewedAt, reviewed_by_actor_id: "actor-owner-SECRET-1" });
const ask = (itemId, content) => ({ workdesk_item_id: itemId, kind: "NEEDS_INFO", content: `I need more from you before I can do this. ${content}` });

const a = { 1: at("01", "09:00"), 2: at("02"), 3: at("03"), 4: at("04"), 5: at("05"), 6: at("06") };
const items = [
  item("a0", "FAO-001", "FAO-11", "2026-06-01T00:00:00.000Z"), // before the window
  item("a1", "FAO-001", "FAO-11", a[1], "r1"), item("a2", "FAO-001", "FAO-11", a[2], "r2"), item("a3", "FAO-001", "FAO-11", a[3], "r3"),
  item("a4", "FAO-001", "FAO-11", a[4], "r4"), item("a5", "FAO-001", "FAO-11", a[5]), item("a6", "FAO-001", "FAO-11", a[6]),
  item("b1", "SAO-001", "SAO-03", at("07"), null, "sales_coordinator"), item("b2", "SAO-001", "SAO-03", at("08"), null, "sales_coordinator")
];
const drafts = [
  draft("d1", "a1", plus(a[1], 30)), draft("d2", "a2", plus(a[2], 90)), draft("d2b", "a2", plus(a[2], 400), 2), draft("d3", "a3", plus(a[3], 60)),
  draft("d4", "a4", plus(a[4], 45)), draft("d5", "a5", plus(a[5], 15)), draft("b1d", "b1", plus(at("07"), 20)), draft("b2d", "b2", plus(at("08"), 40)),
  draft("d0", "a0", "2026-06-01T01:00:00.000Z")
];
const reviews = [
  review("v1", "d1", "APPROVED_FOR_CLIENT_DRAFT", plus(plus(a[1], 30), 120)),
  review("v2", "d2", "REVISION_REQUIRED", plus(plus(a[2], 90), 60)), review("v2b", "d2b", "APPROVED_FOR_CLIENT_DRAFT", plus(plus(a[2], 400), 30)),
  review("v3", "d3", "REJECTED", plus(plus(a[3], 60), 30)), review("v4", "d4", "APPROVED_FOR_CLIENT_DRAFT", plus(plus(a[4], 45), 10)),
  review("vb1", "b1d", "APPROVED_FOR_CLIENT_DRAFT", plus(plus(at("07"), 20), 40)), review("vb2", "b2d", "APPROVED_FOR_CLIENT_DRAFT", plus(plus(at("08"), 40), 50))
];
const messages = [
  ask("a2", "Add the missing file: Book / ledger entries (CSV or Excel)."),
  ask("a4", "Add the missing files: Bank statement (CSV or Excel); Book / ledger entries (CSV or Excel)."),
  ask("a6", "Fill in: Period."),
  { workdesk_item_id: "a1", kind: "ASSIGNED", content: "Received WR-0001" }
];
const requests = [
  { id: "r1", client_id: "C1", created_at: at("01") }, { id: "r2", client_id: "C1", created_at: at("02") }, { id: "r3", client_id: "C2", created_at: at("03") },
  { id: "r4", client_id: null, created_at: at("04") }, { id: "r5", client_id: "C1", created_at: "2026-06-01T00:00:00.000Z" }
];
const inv = (id, client, currency, amount, issued, status = "Issued") => ({ transaction_id: id, document_type: "INV", status, currency, amount, date_issued: issued, counterparty_link: client ? { link_type: "CLIENT", client_id: client } : null });
const transactions = [
  inv("INV-1", "C1", "MYR", 1000, "2026-09-10"), inv("INV-2", "C1", "MYR", 500, "2026-09-20", "Completed"), inv("INV-3", "C1", "USD", 200, "2026-09-15"),
  inv("INV-4", "C2", "MYR", 300, "2026-08-01", "Cancelled"), inv("INV-5", null, "MYR", 700, "2026-09-12"), inv("INV-6", "C1", "MYR", 999, "2026-05-01"),
  inv("INV-7", "C1", "MYR", 50, ""), inv("INV-9", "C3", "EUR", 50, "2026-09-11"), { ...inv("QT-1", "C1", "MYR", 5000, "2026-09-10"), document_type: "QT" }
];
const invoices = [
  { id: "vi1", relationship_id: "rel1", status: "ISSUED", currency: "MYR", created_at: at("25"), line_items: [{ amount: 250 }, { amount: 150 }] },
  { id: "vi2", relationship_id: "rel1", status: "DRAFT", currency: "MYR", created_at: at("25"), line_items: [{ amount: 9999 }] },
  { id: "vi3", relationship_id: "relX", status: "PAID", currency: "MYR", created_at: at("26"), line_items: [{ amount: 80 }] }
];
const base = { as_of: "2026-10-02", window: { period: "custom", from: "2026-07-05", to: "2026-10-02" }, requests, items, drafts, reviews, messages, transactions, invoices,
  clients: [{ id: "C1", name: "Alpha Co" }, { id: "C2", name: "Beta Co" }, { id: "C3", name: "Gamma Co" }], relationships: [{ id: "rel1", client_id: "C1" }] };
const card = buildScorecards(base);

// window and helpers
assert.deepEqual(resolvePeriod({ period: "90d" }, "2026-10-02"), { ok: true, period: "90d", from: "2026-07-05", to: "2026-10-02" });
assert.deepEqual(resolvePeriod({ period: "30d" }, "2026-10-02"), { ok: true, period: "30d", from: "2026-09-03", to: "2026-10-02" });
assert.deepEqual(resolvePeriod({ period: "ytd" }, "2026-10-02"), { ok: true, period: "ytd", from: "2026-01-01", to: "2026-10-02" });
assert.equal(resolvePeriod({ period: "weekly" }, "2026-10-02").ok, false);
assert.equal(resolvePeriod({ period: "custom", from: "2026-01-01" }, "2026-10-02").ok, false);
assert.equal(resolvePeriod({ period: "custom", from: "2026-02-30", to: "2026-03-01" }, "2026-10-02").ok, false);
assert.equal(resolvePeriod({ period: "custom", from: "2026-05-02", to: "2026-05-01" }, "2026-10-02").ok, false);
assert.equal(median([]), null);
assert.equal(median([5]), 5);
assert.equal(median([1, 2, 3, 10]), 2.5);
assert.deepEqual(missingInputsOf("I need more from you before I can do this. Add the missing files: A (CSV); B."), ["File: A (CSV)", "File: B"]);
assert.deepEqual(missingInputsOf("Fill in: Period; Entity."), ["Field: Period", "Field: Entity"]);
assert.deepEqual(missingInputsOf("bank.csv has no amount column."), ["Other: bank.csv has no amount column."]);

// workers: hand-computed
assert.deepEqual(card.workers.map((w) => w.staff_code), ["FAO-001", "SAO-001"]);
const fao = card.workers[0];
assert.deepEqual([fao.jobs, fao.drafted, fao.reviewed, fao.pending_review], [6, 5, 4, 1], "the item before the window is not counted");
assert.deepEqual([fao.approved_first_pass, fao.revision_required, fao.rejected], [2, 1, 1], "only the FIRST draft's first decision counts");
assert.deepEqual([fao.first_pass_approval_rate, fao.revision_rate, fao.rejection_rate], [50, 25, 25]);
assert.deepEqual([fao.needs_info_jobs, fao.needs_info_rate], [3, 50]);
assert.equal(fao.median_minutes_to_draft, 45, "15, 30, 45, 60, 90");
assert.deepEqual(fao.top_missing_inputs, [
  { input: "File: Book / ledger entries (CSV or Excel)", count: 2 }, { input: "Field: Period", count: 1 }, { input: "File: Bank statement (CSV or Excel)", count: 1 }]);
assert.deepEqual([fao.low_sample_jobs, fao.low_sample_reviews], [false, true], "6 jobs is enough; 4 reviews is not");
assert.deepEqual(fao.skills.map((s) => [s.skill_id, s.jobs]), [["FAO-11", 6]]);
const sao = card.workers[1];
assert.deepEqual([sao.jobs, sao.reviewed, sao.first_pass_approval_rate, sao.needs_info_rate, sao.median_minutes_to_draft, sao.low_sample_jobs], [2, 2, 100, 0, 30, true]);
assert.deepEqual(sao.top_missing_inputs, []);
// firm
assert.deepEqual([card.firm.jobs, card.firm.drafted, card.firm.reviewed, card.firm.approved_first_pass, card.firm.first_pass_approval_rate], [8, 7, 6, 4, 66.7]);
assert.equal(card.firm.median_hours_waiting_for_owner, 0.8, "waits 120, 60, 30, 10, 40, 50 minutes: median 45 minutes");
assert.equal(card.firm.client_requests, 3);
// clients
assert.deepEqual(card.clients.map((c) => [c.client_id, c.name, c.requests, c.worker_jobs, c.drafts, c.reviewed]), [["C1", "Alpha Co", 2, 2, 3, 2], ["C2", "Beta Co", 1, 1, 1, 1], ["C3", "Gamma Co", 0, 0, 0, 0]]);
assert.equal(card.clients[0].median_hours_waiting_for_owner, 1.5);
assert.equal(card.clients[1].median_hours_waiting_for_owner, 0.5);
assert.equal(card.clients[2].median_hours_waiting_for_owner, null);
assert.deepEqual(card.clients[0].invoiced, [{ currency: "MYR", bizkick: 1500, vfirm: 400, total: 1900, invoices: 3 }, { currency: "USD", bizkick: 200, vfirm: 0, total: 200, invoices: 1 }], "currencies stay apart; cancelled, draft, out-of-window and non-INV are not counted");
assert.deepEqual(card.clients[1].invoiced, [], "a cancelled invoice is not invoiced");
assert.deepEqual(card.clients[2].invoiced, [{ currency: "EUR", bizkick: 50, vfirm: 0, total: 50, invoices: 1 }]);
assert.deepEqual([card.notes.unlinked_invoices, card.notes.undated_invoices], [2, 1], "an unlinked BizKick invoice and a vFirm invoice with an unknown client are reported, not guessed");
// no human is profiled; deterministic; order-independent
assert.equal(JSON.stringify(card).includes("SECRET"), false, "no reviewer or actor id is in the output");
assert.equal(JSON.stringify(card).includes("actor"), false);
const rev = (list) => [...list].reverse();
assert.deepEqual(buildScorecards({ ...base, requests: rev(requests), items: rev(items), drafts: rev(drafts), reviews: rev(reviews), messages: rev(messages), transactions: rev(transactions), invoices: rev(invoices) }), card, "shuffled input gives the same scorecards");
// an empty window is empty, not an error
const empty = buildScorecards({ ...base, window: { period: "custom", from: "2019-01-01", to: "2019-12-31" } });
assert.deepEqual([empty.workers.length, empty.clients.length, empty.firm.jobs, empty.firm.first_pass_approval_rate], [0, 0, 0, null]);
// a window that stops early drops the later jobs
const early = buildScorecards({ ...base, window: { period: "custom", from: "2026-09-01", to: "2026-09-03" } });
assert.equal(early.workers[0].jobs, 3);
// the window uses Malaysia dates: 17:00 UTC on 3 Sep is 01:00 on 4 Sep in Malaysia
const edge = buildScorecards({ ...base, items: [item("e1", "FAO-001", "FAO-11", "2026-09-03T17:00:00.000Z")], window: { period: "custom", from: "2026-09-04", to: "2026-09-04" } });
assert.equal(edge.workers[0]?.jobs, 1);
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
  const tenant = await post("/tenants", { name: `VI-S4 ${label} Tenant ${stamp}-${firmCounter}` });
  const seed = await post("/firms", { tenant_id: tenant.id, name: `VI-S4 ${label} Firm ${stamp}-${firmCounter}`, principal_name: `${label} Owner` });
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
const tick = async (ctx) => { const { response, json } = await tickWith(SERVICE_TOKEN, ctx.s); assert.equal(response.status, 200, JSON.stringify(json)); return json.data.standing; };
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



const WIDE = "period=custom&from=2020-01-01&to=2030-12-31";
const cards = (ctx, extra = WIDE, headers = ctx.h) => get(`/scorecards?${q(ctx)}${extra ? `&${extra}` : ""}`, headers);
const upload = async (ctx, name, text, mime = "text/csv") => (await (await fetch(`${apiBase}/files/upload?${q(ctx)}&filename=${encodeURIComponent(name)}`, { method: "POST", headers: { "content-type": mime, ...ctx.h }, body: Buffer.from(text) })).json()).data;
const CSV = "date,reference,amount\n2026-09-01,INV-1,500\n2026-09-02,INV-2,120.50\n";
const runSkill = (ctx, itemId) => request("/awia/virtual-staff/workdesk-item/run-skill", { method: "POST", body: { ...ctx.s, workdesk_item_id: itemId }, headers: ctx.h });
const decide = (ctx, draftId, decision) => post("/awia/virtual-staff/output-review", { ...ctx.s, output_draft_id: draftId, review_decision: decision }, ctx.h);

// Work is stamped with the real clock, so the API is pinned to today in Malaysia (UTC+8) for the default window.
const TODAY = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
try {
  startApi(TODAY);
  await waitForHealth();
  const A = await newFirm("Alpha");
  const B = await newFirm("Bravo");
  const staff = await hireStaff(A);
  await post("/edcs/connection", { ...A.s, company_code: "NEX", bizkick_version: "1.0" }, A.h);
  await importRegister(A, "register_01_baseline.xlsx");

  // ---- nothing yet ----
  const none = await cards(A);
  assert.deepEqual([none.workers.length, none.clients.length, none.firm.jobs], [0, 0, 0]);
  assert.equal(none.schema, "vfirm.scorecards/1");

  // ---- real work ----
  // R1: asks for the ledger first (NEEDS INFO), then runs and is approved at first review
  const bank1 = await upload(A, "bank1.csv", CSV);
  const wr1 = await post("/work-requests", { ...A.s, title: "Reconcile Aug", request_type_id: "bank_reconciliation", file_ids: [bank1.id], file_roles: { [bank1.id]: "bank_statement" }, assign_to_staff_code: staff.bookkeeper.staff_code }, A.h);
  const first = await runSkill(A, wr1.workdesk_item.id);
  assert.equal(first.response.status, 422, "the missing ledger stops the run");
  const led1 = await upload(A, "led1.csv", CSV);
  await post("/work-requests/add-files", { ...A.s, work_request_id: wr1.work_request.id, file_ids: [led1.id], file_role: "book_entries" }, A.h);
  const run1 = await post("/awia/virtual-staff/workdesk-item/run-skill", { ...A.s, workdesk_item_id: wr1.workdesk_item.id }, A.h);
  await decide(A, run1.output_draft.id, "APPROVED_FOR_CLIENT_DRAFT");
  // R2: both files; sent back for revision at first review, then re-drafted and approved
  const bank2 = await upload(A, "bank2.csv", CSV); const led2 = await upload(A, "led2.csv", CSV);
  const wr2 = await post("/work-requests", { ...A.s, title: "Reconcile Sep", request_type_id: "bank_reconciliation", file_ids: [bank2.id, led2.id], file_roles: { [bank2.id]: "bank_statement", [led2.id]: "book_entries" }, assign_to_staff_code: staff.bookkeeper.staff_code }, A.h);
  const run2 = await post("/awia/virtual-staff/workdesk-item/run-skill", { ...A.s, workdesk_item_id: wr2.workdesk_item.id }, A.h);
  await decide(A, run2.output_draft.id, "REVISION_REQUIRED");
  const run2b = await post("/awia/virtual-staff/workdesk-item/run-skill", { ...A.s, workdesk_item_id: wr2.workdesk_item.id }, A.h);
  assert.equal(run2b.output_draft.revision_number, 2);
  await decide(A, run2b.output_draft.id, "APPROVED_FOR_CLIENT_DRAFT");
  // R3: assigned and left alone
  await post("/work-requests", { ...A.s, title: "Reconcile Oct", request_type_id: "bank_reconciliation", file_ids: [], assign_to_staff_code: staff.bookkeeper.staff_code }, A.h);
  // R4: client work (sales coordinator), approved first time
  const enquiry = await post("/front-desk/enquiries", { ...A.s, contact_name: "Aisyah", organization_name: "Kedai Maju Sdn Bhd", contact_email: `a-${stamp}@maju.example`, enquiry_summary: "Monthly bookkeeping retainer", requested_service_hint: "Bookkeeping" }, A.h);
  await post("/front-desk/enquiries/qualify", { ...A.s, enquiry_id: enquiry.id, decision: "QUALIFIED", consent_or_legal_basis_ref: "C", conflict_check_status: "CLEARED", conflict_check_ref: "CC" }, A.h);
  const handoff = await post("/front-desk/enquiries/handoff", { ...A.s, enquiry_id: enquiry.id, provided_inputs: {} }, A.h);
  const clientId = handoff.relationship.client_id;
  const intake = await post("/intake-sessions", { ...A.s, relationship_id: handoff.relationship.id, provided_inputs: { engagement_summary: "Retainer" } }, A.h);
  const proposal = await post("/proposals", { ...A.s, relationship_id: handoff.relationship.id, intake_session_id: intake.intake.id, scope_summary: "Retainer", final_price: 800 }, A.h);
  const approvedProposal = await post("/proposals/approve", { ...A.s, proposal_id: proposal.proposal.id }, A.h);
  const opened = await post("/proposals/accept", { ...A.s, proposal_id: approvedProposal.proposal.id, project_name: "Kedai Maju retainer" }, A.h);
  const letter = await post("/work-requests", { ...A.s, title: "October retainer letter", request_type_id: "client_message_draft", project_id: opened.project.id, assign_to_staff_code: staff.sales.staff_code }, A.h);
  const letterFile = await upload(A, "letter.docx", "PK letter", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  const letterDraft = await post("/awia/virtual-staff/output-draft", { ...A.s, workdesk_item_id: letter.workdesk_item.id, output_file_id: letterFile.id, output_title: "October retainer letter" }, A.h);
  await decide(A, letterDraft.output_draft.id, "APPROVED_FOR_CLIENT_DRAFT");

  // BizKick invoice for that client (the owner confirms the counterparty), plus one vFirm invoice
  const txs = (await get(`/edcs/transactions?${q(A)}`, A.h)).transactions;
  const counted = (t) => t.document_type === "INV" && !["Cancelled", "Rejected", "Superseded", "Draft", "Reserved", "Under Review"].includes(t.status) && /^\d{4}-\d{2}-\d{2}/.test(String(t.date_issued ?? ""));
  const invs = txs.filter(counted);
  assert.ok(invs.length >= 2, "the fixture register has invoices to count");
  const mine = invs[0];
  await post("/edcs/transactions/link-counterparty", { ...A.s, transaction_id: mine.transaction_id, link_type: "CLIENT", client_id: clientId }, A.h);
  await post("/invoices", { ...A.s, relationship_id: handoff.relationship.id, project_id: opened.project.id, invoice_number: "VF-1", currency: "MYR", status: "ISSUED", line_items: [{ description: "Retainer", amount: 800 }] }, A.h);

  // ---- the numbers over the real API ----
  const c = await cards(A);
  const bk = c.workers.find((w) => w.staff_code === staff.bookkeeper.staff_code);
  assert.deepEqual([bk.jobs, bk.drafted, bk.reviewed, bk.pending_review], [3, 2, 2, 0]);
  assert.deepEqual([bk.approved_first_pass, bk.revision_required, bk.rejected], [1, 1, 0]);
  assert.deepEqual([bk.first_pass_approval_rate, bk.revision_rate, bk.rejection_rate], [50, 50, 0]);
  assert.deepEqual([bk.needs_info_jobs, bk.needs_info_rate], [1, 33.3]);
  assert.deepEqual(bk.top_missing_inputs, [{ input: "File: Book / ledger entries (CSV or Excel)", count: 1 }]);
  assert.deepEqual(bk.skills.map((s) => [s.skill_id, s.jobs]), [["FAO-11", 3]]);
  assert.equal(typeof bk.median_minutes_to_draft, "number");
  assert.ok([bk.low_sample_jobs, bk.low_sample_reviews].every(Boolean), "small samples are flagged");
  const sales = c.workers.find((w) => w.staff_code === staff.sales.staff_code);
  assert.deepEqual([sales.jobs, sales.reviewed, sales.approved_first_pass, sales.first_pass_approval_rate], [1, 1, 1, 100]);
  assert.deepEqual([c.firm.jobs, c.firm.drafted, c.firm.reviewed, c.firm.approved_first_pass, c.firm.first_pass_approval_rate], [4, 3, 3, 2, 66.7]);
  assert.equal(c.clients.length, 1);
  const client = c.clients[0];
  assert.deepEqual([client.client_id, client.requests, client.worker_jobs, client.drafts, client.reviewed], [clientId, 1, 1, 1, 1]);
  assert.deepEqual(client.invoiced.find((row) => row.currency === (mine.currency || "MYR")).bizkick, Number(mine.amount));
  assert.equal(client.invoiced.find((row) => row.currency === "MYR").vfirm, 800);
  assert.equal(c.notes.unlinked_invoices, invs.length - 1, "every other counted BizKick invoice has no confirmed client and is reported");
  assert.equal(JSON.stringify(c).includes(A.h["x-vfirm-actor-id"]), false, "no actor id in the scorecards");
  assert.deepEqual(await cards(A), c, "reading twice gives the same answer");

  // ---- the period ----
  const past = await cards(A, "period=custom&from=2019-01-01&to=2019-12-31");
  assert.deepEqual([past.workers.length, past.clients.length, past.firm.jobs], [0, 0, 0]);
  const d90 = await cards(A, "");
  const want90 = resolvePeriod({ period: "90d" }, TODAY);
  assert.deepEqual([d90.period.kind, d90.period.from, d90.period.to, d90.firm.jobs], ["90d", want90.from, TODAY, 4], "the default is the last 90 days, ending on the pinned Malaysia date");
  assert.equal((await cards(A, "period=30d")).period.from, resolvePeriod({ period: "30d" }, TODAY).from);
  for (const bad of ["period=weekly", "period=custom", "period=custom&from=2026-02-30&to=2026-03-01", "period=custom&from=2026-05-02&to=2026-05-01"]) {
    const { response, json } = await request(`/scorecards?${q(A)}&${bad}`, { headers: A.h });
    assert.equal(response.status, 400, bad);
    assert.equal(json.error?.code, "VALIDATION_ERROR", bad);
  }

  // ---- owner-only; firm isolation; read-only ----
  await fails("GET", `/scorecards?${q(A)}&${WIDE}`, 403, "EDCS_OWNER_REQUIRED", undefined, A.staff);
  const other = await cards(B);
  assert.deepEqual([other.workers.length, other.clients.length, other.firm.jobs, other.notes.unlinked_invoices], [0, 0, 0, 0], "another firm sees none of Alpha's work or invoices");
  const cross = await request(`/scorecards?${q(A)}&${WIDE}`, { headers: B.h });
  assert.equal(cross.response.ok, false, "Bravo's owner cannot read Alpha's scorecards");
  const auditBefore = JSON.stringify((await get(`/audit-events?${q(A)}`, A.h)).length ?? (await get(`/audit-events?${q(A)}`, A.h)));
  await cards(A); await cards(A, "period=30d");
  assert.equal(JSON.stringify((await get(`/audit-events?${q(A)}`, A.h)).length ?? (await get(`/audit-events?${q(A)}`, A.h))), auditBefore, "reading scorecards writes nothing");

  console.log(JSON.stringify({
    status: "pass", sprint: "VI-S4", backend: process.env.VFIRM_SMOKE_DATABASE_URL ? "postgres" : "json",
    checked: ["hand-computed rates, medians, missing inputs, waits, per-client effort and invoiced amounts", "only the first draft's first decision counts; pending reviews are excluded from rates", "currencies never added; unlinked and undated invoices reported, not guessed", "Malaysia-date windows, presets and bad periods", "low-sample flags; no human or actor id in the output; shuffled input gives the same result", "real work over the API: needs-info, revision, approval, client work, BizKick and vFirm invoices", "owner-only, firm isolation, read-only"]
  }));
} finally {
  await stopApi();
  await rm(tmp, { recursive: true, force: true });
}
