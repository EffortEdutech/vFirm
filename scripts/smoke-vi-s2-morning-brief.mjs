import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { buildBrief, briefDigest, receivablesAging, unreconciledMonths, klDate, BRIEF_ITEM_LIMIT } from "../packages/core-domain/src/edcs-brief.mjs";

// VI-S2 (ADR-110, 2026-10-11) -- Owner Morning Brief: the firm's state in two minutes, deterministic and linked.
//
// Part 1 is pure: a hand-built fixture with known numbers goes through the engine and every section is checked.
// Part 2 drives the real API with the synthetic Nexa pack. It proves:
//   1. the live brief carries the register numbers, and every linked item points at a record that exists in THAT firm
//   2. the same data gives the same brief (same digest); a second firm sees none of the first firm's data
//   3. the first brief of the day is saved once (first open or the 06:00 tick, whichever comes first); a new day saves a new one
//   4. history lists saved briefs; any saved day can be read back exactly; an unsaved day is 404
//   5. owner-only: staff are refused; a request for another firm's scope is refused
//   6. saving a snapshot is audited
// Local JSON backend by default; set VFIRM_SMOKE_DATABASE_URL for a fresh, fully-migrated Postgres.

const root = process.cwd();
const fixtures = join(root, "scripts/fixtures/bizkick");
const SERVICE_TOKEN = "smoke-service-token-vi-s2";
const tmp = await mkdtemp(join(tmpdir(), "vfirm-vi-s2-"));
const apiPort = 3182;
const apiBase = `http://127.0.0.1:${apiPort}`;
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
let api = null;
let logs = "";

// ============================ part 1: the engine (pure) ============================
{
  const TODAY = "2026-10-12"; // a Monday; yesterday is Sunday the 11th
  const tx = (id, patch) => ({ transaction_id: id, document_type: id.split("-")[1], status: "Open", currency: "MYR", amount: 0, date_issued: "2026-08-01", due_date: null, counterparty_name: "Acme", flags: {}, held_conflict: false, first_seen_at: "2026-08-01T00:00:00.000Z", ...patch });
  const transactions = [
    tx("NEX-INV-2026-0001", { amount: 1000, due_date: "2026-10-20" }),                 // not yet due
    tx("NEX-INV-2026-0002", { amount: 2000, due_date: "2026-10-02" }),                 // 10 days late
    tx("NEX-INV-2026-0003", { amount: 500.5, due_date: "2026-09-01" }),                // 41 days late
    tx("NEX-INV-2026-0004", { amount: 300, due_date: "2026-07-01" }),                  // 103 days late
    tx("NEX-INV-2026-0005", { amount: 9999, due_date: "2026-07-01", status: "Completed" }), // paid -> not receivable
    tx("NEX-INV-2026-0006", { amount: 700, currency: "USD", due_date: "2026-09-30" }),   // 12 days late, USD
    tx("NEX-INV-2026-0007", { amount: 111, status: "Draft", due_date: "2026-01-01" }),    // draft -> not receivable
    tx("NEX-BR-2026-0001", { status: "Completed", date_issued: "2026-08-31" }),          // August reconciled
    tx("NEX-BR-2026-0002", { status: "Open", date_issued: "2026-09-30" }),               // September in progress
    tx("NEX-PO-2026-0001", { first_seen_at: "2026-10-11T03:00:00.000Z", flags: { duplicate: true }, due_date: "2026-10-01" }), // duplicate (and its status Open: alert is STOP)
    tx("NEX-PO-2026-0002", { held_conflict: true })
  ];
  const aging = receivablesAging(transactions, TODAY);
  const myr = aging.currencies.find((c) => c.currency === "MYR");
  const usd = aging.currencies.find((c) => c.currency === "USD");
  assert.equal(aging.currencies[0].currency, "MYR", "MYR first");
  assert.equal(myr.total, 3800.5);
  assert.equal(myr.count, 4);
  const bucket = (c, key) => c.buckets.find((b) => b.key === key);
  assert.deepEqual([bucket(myr, "not_due").count, bucket(myr, "d1_30").count, bucket(myr, "d31_60").count, bucket(myr, "d61_90").count, bucket(myr, "d90_plus").count], [1, 1, 1, 0, 1]);
  assert.equal(bucket(myr, "d31_60").amount, 500.5);
  assert.equal(usd.total, 700);
  assert.deepEqual(bucket(usd, "d1_30").ids, ["NEX-INV-2026-0006"]);
  assert.ok(!JSON.stringify(aging).includes("0005") && !JSON.stringify(aging).includes("0007"), "completed and draft invoices are not receivables");

  // months: window is the last completed months, not before the firm's first record (Aug 2026): Aug, Sep
  const months = unreconciledMonths(transactions, TODAY);
  assert.deepEqual(months.map((m) => [m.month, m.state]), [["2026-09", "IN_PROGRESS"]], "August is reconciled, September is in progress");
  assert.deepEqual(unreconciledMonths([], TODAY), []);
  const noBr = unreconciledMonths(transactions.filter((r) => r.document_type !== "BR"), TODAY);
  assert.deepEqual(noBr.map((m) => [m.month, m.state]), [["2026-08", "MISSING"], ["2026-09", "MISSING"]]);

  // work records (W4 shapes)
  const requests = [
    { id: "r1", request_number: "WR-1", title: "New one", status: "SUBMITTED", created_at: "2026-10-11T02:00:00.000Z", due_at: null },
    { id: "r2", request_number: "WR-2", title: "Overdue assigned", status: "ASSIGNED", workdesk_item_id: "i2", created_at: "2026-10-01T02:00:00.000Z", due_at: "2026-10-05T00:00:00.000Z" },
    { id: "r3", request_number: "WR-3", title: "Question", status: "ASSIGNED", workdesk_item_id: "i3", created_at: "2026-10-02T02:00:00.000Z", due_at: "2026-10-30T00:00:00.000Z" },
    { id: "r4", request_number: "WR-4", title: "Class A", status: "ASSIGNED", workdesk_item_id: "i4", created_at: "2026-10-03T02:00:00.000Z", due_at: null },
    { id: "r5", request_number: "WR-5", title: "Done", status: "ASSIGNED", workdesk_item_id: "i5", created_at: "2026-10-03T02:00:00.000Z", due_at: "2026-10-01T00:00:00.000Z" },
    { id: "r6", request_number: "WR-6", title: "Due today", status: "SUBMITTED", created_at: "2026-10-05T02:00:00.000Z", due_at: "2026-10-12T05:00:00.000Z" }
  ];
  const items = [
    { id: "i2", work_request_id: "r2", staff_code: "FAO-1", workdesk_status: "IN_PROGRESS", assigned_at: "2026-10-02T01:00:00.000Z" },
    { id: "i3", work_request_id: "r3", staff_code: "FAO-1", workdesk_status: "NEEDS_INFO", assigned_at: "2026-10-11T01:00:00.000Z" },
    { id: "i4", work_request_id: "r4", staff_code: "SAO-1", workdesk_status: "OUTPUT_DRAFTED", output_draft_id: "d4", assigned_at: "2026-10-11T04:00:00.000Z" },
    { id: "i5", work_request_id: "r5", staff_code: "FAO-1", workdesk_status: "ARCHIVED_COMPLETED", assigned_at: "2026-10-03T01:00:00.000Z", archived_at: "2026-10-11T08:00:00.000Z" }
  ];
  const drafts = [{ id: "d4", workdesk_item_id: "i4", class_a_approval_required: true, class_a_approval_status: "PENDING", created_at: "2026-10-11T05:00:00.000Z" }];
  const reservations = [{ transaction_id: "NEX-INV-2026-0001", reserved_at: "2026-09-01T00:00:00.000Z" }];
  const standing = {
    instructions: [{ id: "s1", name: "Monthly summary", status: "ACTIVE", schedule: { frequency: "MONTHLY", day_of_month: 12, business_day: "NEXT", covers: "PREVIOUS" }, start_date: null, active_from: "2026-01-01" }, { id: "s2", name: "Paused one", status: "PAUSED", schedule: { frequency: "DAILY" } }],
    settings: { holidays: [], weekend_days: [6, 0] },
    runs: [
      { id: "u1", instruction_id: "s1", instruction_name: "Monthly summary", period_key: "2026-09", run_date: "2026-10-08", status: "CREATED", needs_input: true, input_note: "No bank statement", work_request_id: "r1", covers: "September 2026", at: "2026-10-08T00:00:00.000Z" },
      { id: "u2", instruction_id: "s1", instruction_name: "Monthly summary", period_key: "2026-08", run_date: "2026-09-08", status: "CREATED", needs_input: true, input_note: "old", work_request_id: "gone", covers: "August 2026", at: "2026-09-08T00:00:00.000Z" },
      { id: "u3", instruction_id: "s1", instruction_name: "Monthly summary", period_key: "2026-10", run_date: "2026-10-12", status: "CREATED", needs_input: false, work_request_id: "r6", work_request_number: "WR-6", at: "2026-10-12T00:00:00.000Z" }
    ]
  };
  const input = { as_of: TODAY, requests, items, drafts, transactions, reservations, standing };
  const brief = buildBrief(input);

  // needs you
  const tile = (key) => brief.sections.needs_you.tiles.find((t) => t.key === key);
  assert.equal(tile("questions").total, 1); assert.equal(tile("questions").items[0].link.id, "i3");
  assert.equal(tile("inbox").total, 2, "r1 and r6 are submitted");
  assert.equal(tile("classa").total, 1); assert.equal(tile("approval").total, 0, "a Class A draft is not counted twice");
  assert.equal(tile("overdue").total, 1, "r2 is late; r6 is due today (not late); r5 is finished");
  assert.equal(brief.sections.needs_you.total, 1 + 2 + 1 + 0 + 0 + 1);
  assert.equal(tile("inbox").items[0].link.page, "workdesk");

  // due and overdue
  const due = brief.sections.due;
  assert.deepEqual([due.requests.overdue, due.requests.due_today], [1, 1]);
  assert.equal(due.requests.items[0].id, "r2"); assert.equal(due.requests.items[0].days_late, 7);
  assert.deepEqual([due.bizkick.overdue, due.bizkick.due_soon], [5, 0], "the register's own alert rule (duplicates and closed are not counted)");
  assert.equal(due.bizkick.items[0].id, "NEX-INV-2026-0007", "oldest due date first");
  assert.equal(due.bizkick.items.find((i) => i.id === "NEX-INV-2026-0002").days_late, 10);

  // cash
  assert.equal(brief.sections.cash.receivables.currencies.length, 2);
  assert.equal(brief.sections.cash.unreconciled_months.length, 1);
  assert.equal(brief.sections.cash.unreconciled_months[0].link.id, "NEX-BR-2026-0002");

  // yesterday (Sunday 11 October, Malaysia time)
  const th = brief.sections.throughput;
  assert.equal(th.date, "2026-10-11");
  assert.deepEqual([th.requests_submitted, th.items_assigned, th.drafts_produced, th.items_completed], [1, 2, 1, 1]);
  assert.deepEqual(th.workers.map((w) => [w.staff_code, w.assigned, w.drafts, w.completed]), [["FAO-1", 1, 0, 1], ["SAO-1", 1, 1, 0]]);
  assert.equal(klDate("2026-10-11T17:00:00.000Z"), "2026-10-12", "17:00 UTC is already tomorrow in Malaysia");

  // exceptions
  const ex = brief.sections.exceptions;
  assert.deepEqual([ex.conflicts.total, ex.duplicates.total, ex.unreserved_ids.total], [1, 1, 1]);
  assert.equal(ex.conflicts.items[0].id, "NEX-PO-2026-0002"); assert.equal(ex.conflicts.items[0].link.page, "bizkick-conflicts");
  assert.equal(ex.unreserved_ids.items[0].id, "NEX-PO-2026-0001");

  // standing
  const st = brief.sections.standing;
  assert.equal(st.active, 1);
  assert.deepEqual([st.due_today.total, st.raised_today.total, st.needs_info.total, st.failed.total], [1, 1, 1, 0]);
  assert.equal(st.due_today.items[0].covers, "September 2026");
  assert.equal(st.needs_info.items[0].link.id, "s1", "the old needs-info run whose request is gone is not listed");

  // headline
  const head = Object.fromEntries(brief.headline.map((h) => [h.key, h.count]));
  assert.deepEqual(head, { needs_you: 5, overdue: 6, receivables_late: 4, unreconciled: 1, exceptions: ex.conflicts.total + ex.duplicates.total + ex.missing_links.total + ex.unreserved_ids.total, standing: 1 });

  // deterministic: the same data in any order gives the same brief
  const shuffled = buildBrief({ ...input, requests: [...requests].reverse(), items: [...items].reverse(), transactions: [...transactions].reverse(), reservations: [...reservations], standing: { ...standing, runs: [...standing.runs].reverse() } });
  assert.equal(briefDigest(shuffled), briefDigest(brief));
  assert.equal(JSON.stringify(shuffled), JSON.stringify(brief));
  assert.notEqual(briefDigest(buildBrief({ ...input, as_of: "2026-10-13" })), briefDigest(brief), "a different day is a different brief");
  // lists are capped but the totals are not
  const many = Array.from({ length: 12 }, (_, i) => ({ id: `m${i}`, request_number: `WR-${i}`, title: "x", status: "SUBMITTED", created_at: `2026-10-0${(i % 9) + 1}T00:00:00.000Z`, due_at: null }));
  const capped = buildBrief({ as_of: TODAY, requests: many });
  const inbox = capped.sections.needs_you.tiles.find((t) => t.key === "inbox");
  assert.deepEqual([inbox.total, inbox.items.length, inbox.more], [12, BRIEF_ITEM_LIMIT, 4]);
  // an empty firm is a valid, quiet brief
  const empty = buildBrief({ as_of: TODAY });
  assert.equal(empty.sections.needs_you.total, 0); assert.equal(empty.sections.cash.receivables.currencies.length, 0); assert.equal(empty.headline.every((h) => h.count === 0), true);
  assert.throws(() => buildBrief({ as_of: "tomorrow" }));
}
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
  const tenant = await post("/tenants", { name: `VI-S2 ${label} Tenant ${stamp}-${firmCounter}` });
  const seed = await post("/firms", { tenant_id: tenant.id, name: `VI-S2 ${label} Firm ${stamp}-${firmCounter}`, principal_name: `${label} Owner` });
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

const todayBrief = (ctx, headers = ctx.h) => get(`/brief/today?${q(ctx)}`, headers);

try {
  startApi("2026-10-02");
  await waitForHealth();

  const A = await newFirm("Alpha");
  const B = await newFirm("Bravo");
  const staffA = await hireStaff(A);
  await post("/edcs/connection", { ...A.s, company_code: "NEX", bizkick_version: "1.0" }, A.h);
  await importRegister(A, "register_01_baseline.xlsx");
  const registerA = await get(`/edcs/transactions?${q(A)}`, A.h);
  const rowsA = registerA.transactions ?? registerA;
  assert.ok(rowsA.length > 0, "the fixture imported");
  const idsA = new Set(rowsA.map((row) => row.transaction_id));

  // a request that waits in the Inbox, and one assigned to a worker (so the tray has content)
  const inboxReq = await post("/work-requests", { ...A.s, title: "Inbox request", request_type_id: "workload_summary" }, A.h);
  const assigned = await post("/work-requests", { ...A.s, title: "Assigned request", request_type_id: "workload_summary", assign_to_staff_code: staffA.bookkeeper.staff_code }, A.h);

  // ---- 1. the live brief: numbers, links ----
  const first = await todayBrief(A);
  assert.equal(first.brief.as_of, "2026-10-02");
  assert.equal(first.snapshot_just_saved, true, "the first open of the day saves the snapshot");
  const tray = first.brief.sections.needs_you.tiles.find((t) => t.key === "inbox");
  assert.ok(tray.items.some((item) => item.id === inboxReq.work_request.id), "the inbox request is in the tray");
  // every link points at a record that exists in this firm
  const store = await get("/mvp/store?tenant_id=" + A.s.tenant_id, A.h);
  const requestIds = new Set(store.work_requests.filter((r) => r.firm_id === A.firm.id).map((r) => r.id));
  const itemIds = new Set((store.awia_staff_workdesk_items ?? []).filter((r) => r.firm_id === A.firm.id).map((r) => r.id));
  const links = [];
  (function walk(node) {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node && typeof node === "object") { if (node.link) links.push({ link: node.link, id: node.id }); Object.values(node).forEach(walk); }
  })(first.brief.sections);
  assert.ok(links.length > 0, "the brief has linked items");
  for (const { link, id } of links) {
    assert.ok(link.page, "every link names a page");
    if (link.page === "workdesk" && id) assert.ok(requestIds.has(id) || itemIds.has(id), `workdesk link ${id} exists`);
    if (String(link.page).startsWith("bizkick-") && link.id && /^[A-Z]{2,5}-[A-Z]+-\d{4}-\d+/.test(link.id)) assert.ok(idsA.has(link.id), `register link ${link.id} exists`);
  }
  // the synthetic Nexa pack gives these exact numbers on 2 October 2026
  const headNumbers = Object.fromEntries(first.brief.headline.map((h) => [h.key, h.count]));
  assert.deepEqual(headNumbers, { needs_you: 2, overdue: 3, receivables_late: 1, unreconciled: 5, exceptions: 2, standing: 0 });
  const nexaMyr = first.brief.sections.cash.receivables.currencies.find((c) => c.currency === "MYR");
  assert.deepEqual([nexaMyr.total, nexaMyr.count], [12850, 2]);
  // register numbers agree with the register itself
  const ex = first.brief.sections.exceptions;
  assert.equal(ex.conflicts.total, rowsA.filter((row) => row.held_conflict).length);
  assert.equal(ex.duplicates.total, rowsA.filter((row) => row.flags?.duplicate).length);

  // ---- 2. deterministic; other firms see none of it ----
  const again = await todayBrief(A);
  assert.equal(again.digest, first.digest, "the same data gives the same brief");
  assert.equal(JSON.stringify(again.brief), JSON.stringify(first.brief));
  assert.equal(again.snapshot_just_saved, false, "only the first open of the day saves");
  assert.equal(again.changed_since_snapshot, false);
  const briefB = await todayBrief(B);
  const textB = JSON.stringify(briefB.brief);
  for (const id of [...idsA].slice(0, 20)) assert.equal(textB.includes(id), false, `Bravo's brief has none of Alpha's ${id}`);
  assert.equal(textB.includes(inboxReq.work_request.id), false);
  assert.equal(briefB.brief.sections.needs_you.total, 0);

  // ---- 3. change shows; the saved snapshot stays; the tick adds nothing for a day already saved ----
  await post("/work-requests/cancel", { ...A.s, work_request_id: inboxReq.work_request.id }, A.h).catch(() => {});
  await post("/work-requests", { ...A.s, title: "Another request", request_type_id: "workload_summary" }, A.h);
  const changed = await todayBrief(A);
  assert.notEqual(changed.digest, first.digest);
  assert.equal(changed.changed_since_snapshot, true, "the live brief moved on from the morning snapshot");
  assert.equal(changed.snapshot.digest, first.snapshot.digest, "the snapshot is the first one of the day");
  const t1 = await tickWith(SERVICE_TOKEN, A.s);
  assert.equal(t1.response.status, 200, JSON.stringify(t1.json));
  assert.equal(t1.json.data.briefs.saved, 0, "today's snapshot already exists, so the tick saves nothing");

  // ---- 4. a new day: the tick saves it before the owner opens ----
  await setToday("2026-10-03");
  const t2 = await tickWith(SERVICE_TOKEN, A.s);
  assert.equal(t2.json.data.briefs.saved, 1, "the 06:00 tick saved the new day's brief");
  const second = await todayBrief(A);
  assert.equal(second.snapshot_just_saved, false);
  assert.equal(second.snapshot.saved_by, "TICK");
  const hist = await get(`/brief/history?${q(A)}`, A.h);
  assert.deepEqual(hist.briefs.map((b) => b.as_of), ["2026-10-03", "2026-10-02"], "newest first");
  assert.equal(hist.briefs[1].saved_by, "FIRST_OPEN");
  assert.ok(hist.briefs[0].headline.length > 0);
  const old = await get(`/brief/2026-10-02?${q(A)}`, A.h);
  assert.deepEqual(old.brief, first.brief, "a saved day reads back exactly as it was shown");
  await fails("GET", `/brief/2026-09-01?${q(A)}`, 404, "NOT_FOUND", undefined, A.h);
  await fails("GET", `/brief/not-a-date?${q(A)}`, 400, "VALIDATION_ERROR", undefined, A.h);
  assert.deepEqual((await get(`/brief/history?${q(B)}`, B.h)).briefs.map((b) => b.as_of), ["2026-10-02"], "Bravo's history is its own");

  // ---- 5. owner-only; wrong scope refused ----
  await fails("GET", `/brief/today?${q(A)}`, 403, "EDCS_OWNER_REQUIRED", undefined, A.staff);
  await fails("GET", `/brief/history?${q(A)}`, 403, "EDCS_OWNER_REQUIRED", undefined, A.staff);
  const cross = await request(`/brief/today?${q(A)}`, { headers: B.h });
  assert.equal(cross.response.ok, false, "Bravo's owner cannot read Alpha's brief");

  // ---- 6. audit and export ----
  const audit = JSON.stringify(await get(`/audit-events?${q(A)}`, A.h));
  assert.ok(audit.includes("brief.saved"), "saving a snapshot is audited");
  const exported = JSON.stringify(await get(`/data-protection/export-package?${q(A)}`, A.h));
  assert.ok(exported.includes('"as_of":"2026-10-02"') || exported.includes("firm_briefs"), "the tenant export carries the saved briefs");

  console.log(JSON.stringify({
    status: "pass", sprint: "VI-S2", backend: process.env.VFIRM_SMOKE_DATABASE_URL ? "postgres" : "json",
    checked: ["engine: needs-you tiles, due/overdue, receivables aging by currency, unreconciled months, yesterday's throughput, exceptions, standing instructions", "same data (any order) gives the same brief; lists capped, totals not", "links point at records that exist in the same firm", "no data from another firm", "first brief of the day saved once; the tick saves a new day; history reads back exactly", "owner-only; audit; export"]
  }));
} finally {
  await stopApi();
  await rm(tmp, { recursive: true, force: true });
}
