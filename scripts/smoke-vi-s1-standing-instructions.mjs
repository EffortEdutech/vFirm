import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import {
  STANDING_TEMPLATES, addDays, coveredPeriod, dueRuns, occurrenceKey, periodKeyFor, runsBetween, shiftToBusinessDay, todayInKL, upcomingRuns, validateInstruction
} from "../packages/core-domain/src/edcs-standing.mjs";

// VI-S1 (ADR-109, 2026-10-11) -- Standing Instructions: recurring work that raises itself once per period.
//
// Part 1 is pure (the schedule engine). Part 2 drives the real API over HTTP with the synthetic Nexa pack and
// moves "today" by restarting the API with VFIRM_AUTOMATION_AS_OF on the same store. It proves:
//   1. a tick on the due date creates exactly one request per period; repeated ticks never duplicate
//   2. inputs are pre-attached when available, and a missing input still raises the request with a NEEDS INFO note
//   3. a paused instruction creates nothing; resuming needs a preview first and never back-fills the time it was off
//   4. skip-next is recorded as SKIPPED in the history; run-now works, is audited and cannot double-fire in one day
//   5. assignment, review and approval are unchanged (a wrong-position worker is refused; the request stays in the Inbox)
//   6. a missed tick is caught up; holidays move the run to the next business day
//   7. owner-only writes, validation, firm isolation, audit events and the tenant export
// Local JSON backend by default; set VFIRM_SMOKE_DATABASE_URL for a fresh, fully-migrated Postgres.

const root = process.cwd();
const fixtures = join(root, "scripts/fixtures/bizkick");
const SERVICE_TOKEN = "smoke-service-token-vi-s1";
const tmp = await mkdtemp(join(tmpdir(), "vfirm-vi-s1-"));
const apiPort = 3181;
const apiBase = `http://127.0.0.1:${apiPort}`;
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
let api = null;
let logs = "";

// ============================ part 1: the schedule engine (pure) ============================
{
  for (const template of STANDING_TEMPLATES) assert.equal(validateInstruction(template).ok, true, `template ${template.template_id}`);
  assert.equal(STANDING_TEMPLATES.length, 4);
  const sched = (patch) => validateInstruction({ name: "t", schedule: patch, input: { mode: "NONE" }, action: { request_type_id: "workload_summary", title_template: "x" } }).instruction.schedule;
  const none = { holidays: [], weekend_days: [6, 0] };
  // monthly day 5: 2026-12-05 is a Saturday -> Monday the 7th (NEXT), Friday the 4th (PREVIOUS), the 5th itself (ON_DATE)
  const m = (mode) => runsBetween(sched({ frequency: "MONTHLY", day_of_month: 5, business_day: mode }), none, "2026-12-01", "2026-12-31").map((r) => r.run_date);
  assert.deepEqual(m("NEXT"), ["2026-12-07"]);
  assert.deepEqual(m("PREVIOUS"), ["2026-12-04"]);
  assert.deepEqual(m("ON_DATE"), ["2026-12-05"]);
  // the period key follows the nominal date, so a shifted run keeps its own period
  const feb = runsBetween(sched({ frequency: "MONTHLY", day_of_month: 31, business_day: "NEXT" }), none, "2027-02-01", "2027-03-05").find((r) => r.period_key === "2027-02");
  assert.equal(feb.nominal, "2027-02-28", "day 31 in February runs on the last day, in February's period");
  assert.equal(feb.run_date, "2027-03-01", "the 28th is a Sunday: the run moves to Monday but keeps February's period");
  // a holiday moves the run
  assert.equal(shiftToBusinessDay("2026-11-05", "NEXT", { holidays: ["2026-11-05"], weekend_days: [6, 0] }), "2026-11-06");
  assert.equal(shiftToBusinessDay("2026-11-05", "NEXT", { holidays: ["2026-11-05", "2026-11-06"], weekend_days: [6, 0] }), "2026-11-09", "holiday + weekend");
  // a different weekend (Friday/Saturday) is a setting
  assert.equal(shiftToBusinessDay("2026-10-09", "NEXT", { holidays: [], weekend_days: [5, 6] }), "2026-10-11");
  // weekly Monday; daily skips weekends (not carried to Monday); quarterly runs in Jan/Apr/Jul/Oct
  assert.deepEqual(runsBetween(sched({ frequency: "WEEKLY", weekday: 1 }), none, "2026-10-01", "2026-10-31").map((r) => r.run_date), ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"]);
  assert.equal(runsBetween(sched({ frequency: "DAILY" }), none, "2026-10-05", "2026-10-11").length, 5, "Mon-Fri only");
  assert.deepEqual(runsBetween(sched({ frequency: "QUARTERLY", day_of_month: 10 }), none, "2026-01-01", "2026-12-31").map((r) => r.period_key), ["2026-Q1", "2026-Q2", "2026-Q3", "2026-Q4"]);
  // what a run covers
  assert.equal(coveredPeriod(sched({ frequency: "MONTHLY", day_of_month: 5 }), "2026-01-05").label, "December 2025", "January run covers last December");
  assert.equal(coveredPeriod(sched({ frequency: "QUARTERLY", day_of_month: 10 }), "2026-01-10").label, "Q4 2025");
  assert.deepEqual(coveredPeriod(sched({ frequency: "WEEKLY", weekday: 1 }), "2026-10-12"), { start: "2026-10-05", end: "2026-10-11", label: "week of 2026-10-05" });
  assert.equal(periodKeyFor("WEEKLY", "2026-10-14"), "2026-10-12");
  // catch-up window and no back-fill
  const inst = { ...validateInstruction({ name: "t", schedule: { frequency: "MONTHLY", day_of_month: 5 }, input: { mode: "NONE" }, action: { request_type_id: "workload_summary", title_template: "x" } }).instruction, status: "ACTIVE", active_from: "2026-01-01" };
  assert.equal(dueRuns(inst, none, "2026-10-07").length, 1, "caught up 2 days late");
  assert.equal(dueRuns(inst, none, "2026-10-13").length, 0, "8 days late is outside the catch-up window");
  assert.equal(dueRuns({ ...inst, active_from: "2026-10-06" }, none, "2026-10-07").length, 0, "no back-fill of the time it was off");
  assert.equal(dueRuns({ ...inst, status: "PAUSED" }, none, "2026-10-05").length, 0, "paused is never due");
  assert.equal(upcomingRuns(inst, none, "2026-10-06", 3).length, 3);
  assert.equal(todayInKL(new Date("2026-10-04T17:00:00Z")), "2026-10-05", "Malaysia time is UTC+8");
  // validation
  for (const bad of [{}, { name: "x", schedule: { frequency: "HOURLY" } }, { name: "x", schedule: { frequency: "MONTHLY", day_of_month: 40 }, action: { request_type_id: "a", title_template: "t" } }, { name: "x", schedule: { frequency: "WEEKLY", weekday: 9 }, action: { request_type_id: "a", title_template: "t" } }, { name: "x", schedule: { frequency: "MONTHLY", day_of_month: 5 }, action: { request_type_id: "a", title_template: "t" }, input: { mode: "TRANSACTIONS" } }]) {
    assert.equal(validateInstruction(bad).ok, false);
  }
  assert.equal(occurrenceKey("i1", "2026-10"), "si|i1|2026-10");
}

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
  const tenant = await post("/tenants", { name: `VI-S1 ${label} Tenant ${stamp}-${firmCounter}` });
  const seed = await post("/firms", { tenant_id: tenant.id, name: `VI-S1 ${label} Firm ${stamp}-${firmCounter}`, principal_name: `${label} Owner` });
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
const create = (ctx, body) => post("/standing/instructions", { ...ctx.s, ...body }, ctx.h);
const list = (ctx) => get(`/standing/instructions?${q(ctx)}`, ctx.h);
const history = async (ctx, id) => (await get(`/standing/instructions/${id}/history?${q(ctx)}`, ctx.h)).occurrences;
const preview = (ctx, i) => post("/standing/instructions/preview", { ...ctx.s, instruction_id: i.id }, ctx.h);
const resume = (ctx, i) => post("/standing/instructions/resume", { ...ctx.s, instruction_id: i.id }, ctx.h);
const pause = (ctx, i) => post("/standing/instructions/pause", { ...ctx.s, instruction_id: i.id }, ctx.h);
async function turnOn(ctx, i) { await preview(ctx, i); return (await resume(ctx, i)).instruction; }
const byId = async (ctx, id) => (await list(ctx)).instructions.find((item) => item.id === id);
const monthly = (name, extra = {}) => ({ name, schedule: { frequency: "MONTHLY", day_of_month: 5, business_day: "NEXT", covers: "PREVIOUS" }, input: { mode: "NONE" }, action: { request_type_id: "workload_summary", title_template: `${name}: {period_label}`, instructions_template: "Summarise {period_label}.", priority: "NORMAL", due_in_days: 5 }, ...extra });

try {
  startApi("2026-10-02");
  await waitForHealth();

  const A = await newFirm("Alpha");
  const B = await newFirm("Bravo");
  const staffA = await hireStaff(A);
  await post("/edcs/connection", { ...A.s, company_code: "NEX", bizkick_version: "1.0" }, A.h);
  await importRegister(A, "register_01_baseline.xlsx");
  const transactions = await get(`/edcs/transactions?${q(A)}`, A.h);
  const rows = transactions.transactions ?? transactions;
  const invoices = rows.filter((row) => row.document_type === "INV" && /^\d{4}-\d{2}-\d{2}/.test(String(row.date_issued ?? "")));
  assert.ok(invoices.length > 0, "the fixture has dated invoices");
  const invMonth = invoices.map((row) => String(row.date_issued).slice(0, 7)).sort()[0];
  const invInMonth = invoices.filter((row) => String(row.date_issued).startsWith(invMonth)).map((row) => row.transaction_id).sort();
  const [iy, im] = invMonth.split("-").map(Number);
  const dueMonth = im === 12 ? `${iy + 1}-01` : `${iy}-${String(im + 1).padStart(2, "0")}`;
  const DUE = `${dueMonth}-05`;
  const DUE_RUN = shiftToBusinessDay(DUE, "NEXT", { holidays: [], weekend_days: [6, 0] });
  const BEFORE = addDays(DUE_RUN, -3);
  await setToday(BEFORE); // "today" is three days before the first due run

  // ---- guards ----
  await fails("POST", "/standing/instructions", 403, null, { ...A.s, ...monthly("Staff cannot") }, A.staff);
  await fails("POST", "/standing/instructions", 400, "VALIDATION_ERROR", { ...A.s, name: "Bad", schedule: { frequency: "MONTHLY", day_of_month: 99 }, action: { request_type_id: "workload_summary", title_template: "x" } }, A.h);
  await fails("POST", "/standing/instructions", 400, "VALIDATION_ERROR", { ...A.s, ...monthly("No type"), action: { request_type_id: "no_such_type", title_template: "x" } }, A.h);
  await fails("POST", "/standing/instructions", 404, null, { ...A.s, template_id: "no_such_template" }, A.h);
  await fails("POST", "/standing/settings", 403, null, { ...A.s, holidays: [] }, A.staff);
  await fails("POST", "/standing/settings", 400, "VALIDATION_ERROR", { ...A.s, holidays: ["not-a-date"] }, A.h);

  // ---- created paused; preview is required; nothing is raised while paused ----
  const reportInv = await create(A, { ...monthly("Invoices report"), input: { mode: "TRANSACTIONS", transaction_type: "INV", max_files: 5 } });
  assert.equal(reportInv.instruction.status, "PAUSED", "every standing instruction starts paused");
  await fails("POST", "/standing/instructions/resume", 409, "STANDING_PREVIEW_REQUIRED", { ...A.s, instruction_id: reportInv.instruction.id }, A.h);
  await fails("POST", "/standing/instructions/resume", 403, null, { ...A.s, instruction_id: reportInv.instruction.id }, A.staff);
  const pv = await preview(A, reportInv.instruction);
  assert.equal(pv.next_runs.length, 5);
  assert.equal(pv.next_runs[0].run_date, DUE_RUN, "the preview shows the next run");
  assert.equal((await requestsOf(A)).length, 0, "a preview creates nothing");
  const edited = await post("/standing/instructions/update", { ...A.s, instruction_id: reportInv.instruction.id, name: "Invoices report (monthly)" }, A.h);
  assert.equal(edited.instruction.last_preview_at, null, "an edit needs a new preview");
  await turnOn(A, edited.instruction);
  await fails("POST", "/standing/instructions/update", 409, "STANDING_ACTIVE", { ...A.s, instruction_id: edited.instruction.id, name: "x" }, A.h);

  // ---- a firm calendar: a holiday moves the run to the next business day ----
  const settings = await post("/standing/settings", { ...A.s, holidays: ["2026-12-25", "2026-12-25", "2026-11-09"] }, A.h);
  assert.deepEqual(settings.settings.holidays, ["2026-11-09", "2026-12-25"], "sorted and de-duplicated");

  const monthlySchedule = validateInstruction(monthly("x")).instruction.schedule;
  const runAfter = (day) => upcomingRuns({ schedule: monthlySchedule, start_date: null }, settings.settings, day, 1)[0].run_date;
  // ---- before the due date: nothing ----
  await setToday(BEFORE);
  let t = await tick(A);
  assert.equal(t.created, 0, "nothing on the day before");
  assert.equal((await requestsOf(A)).length, 0);

  // ---- missing input still raises the request, with NEEDS INFO ----
  const bank = await create(A, { template_id: "monthly_bank_reconciliation", name: "Bank rec (no statement yet)" });
  await turnOn(A, bank.instruction);
  // ---- a wrong-position worker is refused and the request stays in the Inbox ----
  const sales = await create(A, { ...monthly("Assigned to the wrong position"), action: { ...monthly("x").action, request_type_id: "bank_reconciliation", assign_to_staff_code: staffA.sales.staff_code } });
  await turnOn(A, sales.instruction);
  const goodAssign = await create(A, { ...monthly("Assigned to the bookkeeper"), action: { ...monthly("x").action, request_type_id: "bank_reconciliation", assign_to_staff_code: staffA.bookkeeper.staff_code } });
  await turnOn(A, goodAssign.instruction);
  // ---- paused creates nothing; skip-next is recorded ----
  const paused = await create(A, monthly("Stays paused"));
  await preview(A, paused.instruction);
  const skipper = await create(A, monthly("Skipped this month"));
  await turnOn(A, skipper.instruction);
  const skipRes = await post("/standing/instructions/skip-next", { ...A.s, instruction_id: skipper.instruction.id }, A.h);
  assert.equal(skipRes.skipped.run_date, DUE_RUN, "skip-next picks the next run");
  await fails("POST", "/standing/instructions/skip-next", 403, null, { ...A.s, instruction_id: skipper.instruction.id }, A.staff);

  await setToday(DUE_RUN);
  t = await tick(A);
  // reportInv + bank + sales + goodAssign are due; paused and skipper are not created
  assert.equal(t.created, 4, `4 requests on the due date, got ${JSON.stringify(t)}`);
  assert.equal(t.skipped_by_owner, 1);
  const requests = await requestsOf(A);
  assert.equal(requests.length, 4);
  const again = await tick(A);
  assert.equal(again.created, 0, "a repeated tick creates nothing");
  assert.equal((await tick(A)).created, 0);
  assert.equal((await requestsOf(A)).length, 4, "still 4 after repeated ticks");

  const inv = requests.find((r) => String(r.title).startsWith("Invoices report"));
  assert.ok(inv, "the invoices request exists");
  assert.equal(inv.source?.type, "STANDING_INSTRUCTION");
  assert.deepEqual([...inv.references].sort(), invInMonth, "the invoices of the covered month are referenced");
  assert.match(inv.title, /(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}/);
  const bankRequest = requests.find((r) => String(r.title).startsWith("Bank reconciliation"));
  assert.deepEqual(bankRequest.file_ids ?? [], [], "no statement yet, nothing attached");
  assert.match(bankRequest.instructions, /NEEDS INFO/, "the request asks for the missing statement");
  const bankHistory = await history(A, bank.instruction.id);
  assert.equal(bankHistory[0].status, "CREATED");
  assert.equal(bankHistory[0].needs_input, true);

  const wrong = await byId(A, sales.instruction.id);
  assert.equal(wrong.activity.created, 1);
  const wrongRun = (await history(A, sales.instruction.id))[0];
  assert.equal(wrongRun.assignment.outcome, "REFUSED", "the wrong position is refused by the unchanged assignment path");
  const wrongRequest = requests.find((r) => r.id === wrongRun.work_request_id);
  assert.ok(["OPEN", "NEW", "SUBMITTED", "RECEIVED"].includes(String(wrongRequest.status)) || !wrongRequest.assigned_staff_code, "the refused request stays in the Inbox");
  assert.equal((await history(A, goodAssign.instruction.id))[0].assignment.outcome, "ASSIGNED");

  const skippedHistory = await history(A, skipper.instruction.id);
  assert.equal(skippedHistory[0].status, "SKIPPED");
  assert.equal(skippedHistory[0].work_request_id, null);
  assert.equal((await history(A, paused.instruction.id)).length, 0, "paused creates nothing");

  // ---- the document is there next time: LATEST_DOCUMENT attaches it ----
  const statement = await uploadAndRegister(A, "bank_statement.csv", "BANK", "Bank statement September");
  const bank2 = await create(A, { template_id: "monthly_bank_reconciliation", name: "Bank rec (statement filed)" });
  await turnOn(A, bank2.instruction); // turned on on the due day itself
  await setToday(addDays(DUE_RUN, 1));
  t = await tick(A);
  assert.equal(t.created, 1, "turned on on the due day: that day's run is caught up one day later");
  const filed = (await requestsOf(A)).find((r) => String(r.title).startsWith("Bank reconciliation") && (r.file_ids ?? []).includes(statement.id));
  assert.ok(filed, "the latest BANK document is attached as input");
  assert.doesNotMatch(filed.instructions, /NEEDS INFO/);
  assert.match(filed.instructions, /Attached the latest matching document/);
  // an instruction turned on AFTER its run date does not back-fill that run
  const bank3 = await create(A, { template_id: "monthly_bank_reconciliation", name: "Bank rec (turned on late)" });
  await setToday(addDays(DUE_RUN, 2));
  await turnOn(A, bank3.instruction);
  t = await tick(A);
  assert.equal(t.created, 0, "turned on after the run date: no back-fill");
  const NEXT_RUN = runAfter(addDays(DUE_RUN, 1));
  await setToday(NEXT_RUN);
  t = await tick(A);
  assert.ok(t.created >= 1, "the next month's runs are raised");
  assert.equal((await history(A, bank3.instruction.id)).filter((o) => o.status === "CREATED").length, 1, "bank3 raised only next month's run");

  // ---- run now: creates, audited, cannot double-fire in one day ----
  const runNow = await post("/standing/instructions/run-now", { ...A.s, instruction_id: paused.instruction.id }, A.h);
  assert.ok(runNow.request_number, "run-now works even for a paused instruction");
  await fails("POST", "/standing/instructions/run-now", 409, "STANDING_ALREADY_RAN_TODAY", { ...A.s, instruction_id: paused.instruction.id }, A.h);
  await fails("POST", "/standing/instructions/run-now", 403, null, { ...A.s, instruction_id: paused.instruction.id }, A.staff);
  assert.equal((await history(A, paused.instruction.id)).length, 1);

  // ---- a missed tick is caught up (3 days late) ----
  const lateStart = await create(A, monthly("Caught up late"));
  const lateRun = runAfter(addDays(NEXT_RUN, 1));
  await setToday(addDays(lateRun, -2));
  await turnOn(A, lateStart.instruction);
  await setToday(addDays(lateRun, 3));
  const late = await tick(A);
  assert.ok(late.created >= 1);
  assert.equal((await history(A, lateStart.instruction.id)).filter((o) => o.status === "CREATED").length, 1, "caught up exactly once");
  assert.equal((await tick(A)).created, 0);

  // ---- pause stops further runs; resume does not back-fill ----
  await pause(A, lateStart.instruction);
  assert.equal((await byId(A, lateStart.instruction.id)).status, "PAUSED");
  await setToday(addDays(lateRun, 40));
  const quiet = await tick(A);
  assert.equal((await history(A, lateStart.instruction.id)).length, 1, "paused: nothing more");
  await turnOn(A, lateStart.instruction);
  assert.equal((await history(A, lateStart.instruction.id)).length, 1, "resume does not back-fill the paused months");
  void quiet;

  // ---- three ticks at the same moment create one request ----
  const raceRun = runAfter(addDays(lateRun, 41));
  await setToday(addDays(raceRun, -1));
  const racer = await create(A, monthly("Race"));
  await turnOn(A, racer.instruction);
  await setToday(raceRun);
  await Promise.all([tick(A), tick(A), tick(A)]);
  assert.equal((await history(A, racer.instruction.id)).filter((o) => o.status === "CREATED").length, 1, "racing ticks create one request");
  assert.equal((await requestsOf(A)).filter((r) => String(r.title).startsWith("Race:")).length, 1);

  // ---- archive ----
  const archived = await post("/standing/instructions/archive", { ...A.s, instruction_id: paused.instruction.id }, A.h);
  assert.equal(archived.instruction.status, "ARCHIVED");
  await fails("POST", "/standing/instructions/update", 409, "STANDING_ARCHIVED", { ...A.s, instruction_id: paused.instruction.id, name: "x" }, A.h);

  // ---- isolation ----
  const listedB = await list(B);
  assert.equal(listedB.instructions.length, 0, "Bravo sees none of Alpha's instructions");
  await fails("POST", "/standing/instructions/pause", 404, "NOT_FOUND", { ...B.s, instruction_id: bank.instruction.id }, B.h);
  await fails("GET", `/standing/instructions/${bank.instruction.id}/history?${q(B)}`, 404, "NOT_FOUND", undefined, B.h);
  assert.equal((await requestsOf(B)).length, 0);
  const tickAll = await tickWith(SERVICE_TOKEN);
  assert.equal(tickAll.response.status, 200);
  assert.ok(tickAll.json.data.standing, "the scheduled tick also raises standing instructions");
  const noToken = await tickWith(null);
  assert.equal(noToken.response.status === 401 || noToken.response.status === 503, true, "the tick still needs the service token");

  // ---- audit and export ----
  const audit = JSON.stringify(await get(`/audit-events?${q(A)}`, A.h));
  for (const event of ["standing.instruction_created", "standing.instruction_resumed", "standing.instruction_paused", "standing.instruction_archived", "standing.request_created", "standing.run_skipped", "standing.run_now", "standing.settings_updated"]) assert.ok(audit.includes(event), `audit has ${event}`);
  const exported = JSON.stringify(await get(`/data-protection/export-package?${q(A)}`, A.h));
  assert.ok(exported.includes("Invoices report (monthly)"), "the tenant export carries the standing instructions");
  assert.equal(JSON.stringify(await get(`/data-protection/export-package?${q(B)}`, B.h)).includes("Invoices report (monthly)"), false, "Bravo's export carries none of it");

  console.log(JSON.stringify({
    status: "pass", sprint: "VI-S1", backend: process.env.VFIRM_SMOKE_DATABASE_URL ? "postgres" : "json",
    checked: ["schedule engine: monthly/weekly/daily/quarterly, month-end, holidays, weekend setting, business-day modes", "one request per period; repeated ticks never duplicate", "inputs attached when found; NEEDS INFO when not", "paused creates nothing; preview required; no back-fill", "skip-next recorded; run-now audited and once a day", "assignment path unchanged (refused stays in the Inbox)", "catch-up of a missed tick", "owner-only, validation, isolation, audit, export"]
  }));
} finally {
  await stopApi();
  await rm(tmp, { recursive: true, force: true });
}
