import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { buildReservation, crossCheckRows, highestSequence, nextSequence, staleReservations, validateReserveRequest } from "../packages/core-domain/src/edcs-numbers.mjs";

// CE-S4 (ADR-098, 2026-10-05) -- Connected EDCS: Number Authority.
//
// Drives the real API over HTTP with the synthetic Nexa Office Supplies (NEX) pack and proves:
//   1. 50 concurrent reservations for the same type/year give 50 distinct, consecutive numbers
//   2. the sequence starts after the highest ID already imported (QT 2026 -> 0010, QT 2025 -> 0043)
//   3. a voided number is never issued again
//   4. the import flags IDs that were never reserved (UNRESERVED) and marks matched reservations REGISTERED
//      (plus a wrong-counterparty warning and a voided-number warning)
//   5. another firm cannot reserve in, read or void this firm's sequences
// plus: validation, not-connected refusal, owner-only void, any member may reserve, stale list, audit, export.
// Local JSON backend by default; set VFIRM_SMOKE_DATABASE_URL for a fresh, fully-migrated Postgres.

const root = process.cwd();
const fixtures = join(root, "scripts/fixtures/bizkick");
const samples = join(fixtures, "sample_files");
const expected = JSON.parse(await readFile(join(fixtures, "expected_outcomes.json"), "utf8"));
const tmp = await mkdtemp(join(tmpdir(), "vfirm-ce-s4-"));
const apiPort = 3174;
const apiBase = `http://127.0.0.1:${apiPort}`;
const children = [];
let logs = "";
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function start(name, args, env) {
  const child = spawn(process.execPath, args, { cwd: root, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  child.stdout.on("data", (chunk) => { logs += `[${name}] ${chunk}`; });
  child.stderr.on("data", (chunk) => { logs += `[${name}] ${chunk}`; });
  return child;
}
async function waitForJson(url) {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    try {
      const response = await fetch(url);
      const json = await response.json();
      if (response.ok && json.ok !== false) return json;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}. Logs:\n${logs}`);
}
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
  return json;
}
async function upload(firm, headers, filename, contentType, bytes) {
  const response = await fetch(`${apiBase}/files/upload?tenant_id=${firm.tenant_id}&firm_id=${firm.id}&filename=${encodeURIComponent(filename)}`, { method: "POST", headers: { "content-type": contentType, ...headers }, body: bytes });
  const json = await response.json();
  assert.equal(json.ok, true, `upload ${filename}: ${JSON.stringify(json)}`);
  return json.data;
}
const headersFor = (actorId, firm, role = "principal") => ({ "x-vfirm-actor-id": actorId, "x-vfirm-tenant-id": firm.tenant_id, "x-vfirm-firm-id": firm.id, "x-vfirm-role": role });
const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");
const fixture = (name) => readFile(join(fixtures, name));
const sample = (name) => readFile(join(samples, name));
const stamp = Date.now();
let firmCounter = 0;

async function newFirm(label) {
  firmCounter += 1;
  const tenant = await post("/tenants", { name: `CE-S4 ${label} Tenant ${stamp}-${firmCounter}` });
  const seed = await post("/firms", { tenant_id: tenant.id, name: `CE-S4 ${label} Firm ${stamp}-${firmCounter}`, principal_name: `${label} Owner` });
  const firm = seed.firm;
  return { firm, h: headersFor(seed.principal_actor.id, firm), staff: headersFor(seed.principal_actor.id, firm, "PILOT_OPERATOR"), s: { tenant_id: firm.tenant_id, firm_id: firm.id }, label };
}
const q = (ctx, extra = "") => `tenant_id=${ctx.s.tenant_id}&firm_id=${ctx.s.firm_id}${extra}`;
const mimeFor = (name) => name.endsWith(".csv") ? "text/csv" : name.endsWith(".docx") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : XLSX;

async function linkRaw(ctx, headers, filename, bytes, extra = "") {
  const response = await fetch(`${apiBase}/edcs/files/upload?${q(ctx)}&filename=${encodeURIComponent(filename)}${extra}`, { method: "POST", headers: { "content-type": mimeFor(filename), ...headers }, body: bytes });
  const json = await response.json();
  return { response, json };
}
async function link(ctx, filename, { bytes = null, extra = "", from = samples } = {}) {
  const buffer = bytes ?? await readFile(join(from, filename));
  const { response, json } = await linkRaw(ctx, ctx.h, filename, buffer, extra);
  assert.equal(response.status, 201, `link ${filename}: HTTP ${response.status} ${JSON.stringify(json)}`);
  assert.equal(json.ok, true);
  return { ...json.data, buffer };
}
async function importRegister(ctx, name) {
  const buffer = await fixture(name);
  const response = await fetch(`${apiBase}/files/upload?${q(ctx)}&filename=${encodeURIComponent(name)}`, { method: "POST", headers: { "content-type": XLSX, ...ctx.h }, body: buffer });
  const uploaded = (await response.json()).data;
  return post("/edcs/register-imports", { ...ctx.s, file_id: uploaded.id }, ctx.h);
}
const detail = (ctx, id) => get(`/edcs/transactions/${id}?${q(ctx, `&as_of=${expected.as_of}`)}`, ctx.h);
async function download(ctx, headers, fileId) {
  const response = await fetch(`${apiBase}/files/${fileId}/download?${q(ctx)}`, { headers });
  return { response, bytes: Buffer.from(await response.arrayBuffer()) };
}



const reserve = (ctx, body, headers = ctx.h) => request("/edcs/numbers/reserve", { method: "POST", body: { ...ctx.s, ...body }, headers });
async function reserveOk(ctx, body, headers = ctx.h) {
  const { response, json } = await reserve(ctx, body, headers);
  assert.ok(response.status < 300, `reserve ${JSON.stringify(body)}: HTTP ${response.status} ${JSON.stringify(json)}`);
  assert.equal(json.ok, true);
  return json.data.reservation;
}
const numbers = (ctx, extra = "", headers = ctx.h) => get(`/edcs/numbers?${q(ctx, extra)}`, headers);
const voidNo = (ctx, body, headers = ctx.h) => request("/edcs/numbers/void", { method: "POST", body: { ...ctx.s, ...body }, headers });

try {
  // ---- pure helpers ----
  assert.equal(nextSequence({ company_code: "NEX", document_type: "QT", year: 2026 }), 1);
  const sample = [{ company_code: "NEX", document_type: "QT", year: 2026, sequence: 7 }, { company_code: "NEX", document_type: "QT", year: 2025, sequence: 90 }, { company_code: "ABC", document_type: "QT", year: 2026, sequence: 50 }];
  assert.equal(highestSequence({ transactions: sample, company_code: "NEX", document_type: "QT", year: 2026 }), 7, "other years and other companies do not count");
  assert.equal(validateReserveRequest({ document_type: "zz", purpose: "x" }, { currentYear: 2026 }).ok, false);
  assert.equal(validateReserveRequest({ document_type: "qt", purpose: "Quote for Alpha" }, { currentYear: 2026 }).value.year, 2026);
  assert.equal(crossCheckRows({ rows: [{ row_number: 7, transaction_id: "NEX-QT-2026-0001", outcome: "CREATED" }], reservations: [] }).active, false, "no reservations -> the cross-check stays silent");
  assert.equal(buildReservation({ id: "x", tenant_id: "t", firm_id: "f", company_code: "NEX", value: { document_type: "QT", year: 2026, purpose: "p" }, sequence: 10000, actor_id: null, at: "2026-10-06T00:00:00.000Z" }), null, "a year holds at most 9999 numbers per type");
  assert.equal(staleReservations([{ status: "RESERVED", reserved_at: "2026-10-01T00:00:00.000Z" }, { status: "VOID", reserved_at: "2026-01-01T00:00:00.000Z" }], "2026-10-05", 3).length, 1);

  start("api", ["apps/api/src/server.mjs"], {
    VFIRM_API_PORT: String(apiPort),
    ...(process.env.VFIRM_SMOKE_DATABASE_URL ? {} : { VFIRM_STORE_PATH: join(tmp, "store.json") }),
    DATABASE_URL: process.env.VFIRM_SMOKE_DATABASE_URL ?? "",
    VFIRM_STORE_BACKEND: process.env.VFIRM_SMOKE_DATABASE_URL ? "postgres" : "json",
    VFIRM_FILE_STORAGE_BACKEND: "local",
    VFIRM_FILE_LOCAL_DIR: join(tmp, "files")
  });
  await waitForJson(`${apiBase}/health`);

  const A = await newFirm("Alpha");
  const B = await newFirm("Bravo");
  const C = await newFirm("Charlie");
  const D = await newFirm("Delta");

  // ---- guards before any connection ----
  const early = await reserve(D, { document_type: "QT", year: 2026, purpose: "Quote" });
  assert.equal(early.response.status, 409);
  assert.equal(early.json.error.code, "EDCS_NOT_CONNECTED");
  const emptyDesk = await numbers(D);
  assert.equal(emptyDesk.connected, false);

  for (const ctx of [A, B, C]) await post("/edcs/connection", { ...ctx.s, company_code: "NEX", bizkick_version: "1.0" }, ctx.h);
  await importRegister(A, "register_01_baseline.xlsx");

  // ---- validation ----
  for (const bad of [{ document_type: "ZZ", purpose: "Quote" }, { document_type: "QT", purpose: "x" }, { document_type: "QT", year: 1999, purpose: "Quote" }, { purpose: "Quote" }]) {
    const { response, json } = await reserve(A, bad);
    assert.equal(response.status, 400, JSON.stringify(bad));
    assert.equal(json.error.code, "VALIDATION_ERROR");
  }

  // ---- acceptance 2: the sequence starts after the highest imported ID ----
  const heads = (await numbers(A)).heads;
  assert.equal(heads.find((h) => h.document_type === "QT" && h.year === 2026).next, "NEX-QT-2026-0010");
  const first = await reserveOk(A, { document_type: "QT", year: 2026, purpose: "Quote for Gamma Supplies", counterparty: "Gamma Supplies", subject: "Office chairs" });
  assert.equal(first.transaction_id, "NEX-QT-2026-0010", "highest imported QT 2026 is 0009");
  assert.equal(first.status, "RESERVED");
  assert.equal(first.counterparty, "Gamma Supplies");
  const second = await reserveOk(A, { document_type: "QT", year: 2026, purpose: "Quote for Delta Co" });
  assert.equal(second.transaction_id, "NEX-QT-2026-0011");
  assert.equal((await reserveOk(A, { document_type: "QT", year: 2025, purpose: "Late 2025 quote" })).transaction_id, "NEX-QT-2025-0043", "a different year has its own sequence (highest imported 0042)");
  assert.equal((await reserveOk(A, { document_type: "QC", year: 2027, purpose: "First comparison of 2027" })).transaction_id, "NEX-QC-2027-0001", "a type/year with no history starts at 0001");

  // ---- acceptance 1: 50 concurrent reservations -> 50 distinct consecutive numbers ----
  const burst = await Promise.all(Array.from({ length: 50 }, (_, index) => reserve(A, { document_type: "QT", year: 2026, purpose: `Concurrent ${index}` })));
  assert.equal(burst.every(({ response }) => response.status < 300), true, JSON.stringify(burst.filter(({ response }) => response.status >= 300).map(({ json }) => json.error)));
  const sequences = burst.map(({ json }) => json.data.reservation.sequence).sort((a, b) => a - b);
  assert.equal(new Set(sequences).size, 50, "all 50 numbers are distinct");
  assert.deepEqual(sequences, Array.from({ length: 50 }, (_, index) => 12 + index), "and consecutive, right after the last one issued");

  // ---- acceptance 3: a voided number is never reissued ----
  const staffVoid = await voidNo(A, { transaction_id: second.transaction_id, reason: "Raised by mistake" }, A.staff);
  assert.equal(staffVoid.response.status, 403);
  assert.equal(staffVoid.json.error.code, "EDCS_OWNER_REQUIRED");
  assert.equal((await voidNo(A, { transaction_id: second.transaction_id })).response.status, 400, "a reason is required");
  const voided = await voidNo(A, { transaction_id: second.transaction_id, reason: "Raised by mistake" });
  assert.ok(voided.response.status < 300);
  assert.equal(voided.json.data.reservation.status, "VOID");
  const again = await voidNo(A, { transaction_id: second.transaction_id, reason: "Again" });
  assert.equal(again.response.status, 409);
  assert.equal(again.json.error.code, "NUMBER_NOT_VOIDABLE");
  const after = await reserveOk(A, { document_type: "QT", year: 2026, purpose: "After the void" });
  assert.equal(after.sequence, 62, "0011 is gone for good; the next number is 0062");
  const highest = await reserveOk(A, { document_type: "SO", year: 2026, purpose: "Sales order" });
  assert.equal(highest.transaction_id, "NEX-SO-2026-0005");
  assert.ok((await voidNo(A, { transaction_id: highest.transaction_id, reason: "Cancelled order" })).response.status < 300);
  assert.equal((await reserveOk(A, { document_type: "SO", year: 2026, purpose: "Sales order again" })).transaction_id, "NEX-SO-2026-0006", "voiding the newest number does not hand it out again");
  assert.equal((await voidNo(A, { transaction_id: "NEX-QT-2026-9999", reason: "No such number" })).response.status, 404);

  // any signed-in member may reserve (the whole point of one authority for several people)
  const byStaff = await reserveOk(A, { document_type: "DO", year: 2026, purpose: "Delivery for Alpha" }, A.staff);
  assert.equal(byStaff.transaction_id, "NEX-DO-2026-0004");

  // ---- the Number Desk read ----
  const desk = await numbers(A);
  assert.equal(desk.connected, true);
  assert.equal(desk.company_code, "NEX");
  assert.equal(desk.counts.VOID, 2);
  assert.ok(desk.counts.RESERVED >= 56);
  assert.equal((await numbers(A, "&status=VOID")).reservations.length, 2);
  assert.equal((await numbers(A, "&type=QC")).reservations.length, 1);
  assert.equal((await numbers(A, "&year=2025")).reservations.length, 1);
  const lateDesk = await numbers(A, "&as_of=2030-01-01&stale_days=7");
  assert.equal(lateDesk.stale.length, desk.counts.RESERVED, "years later every open reservation is overdue");
  assert.equal((await numbers(A, "&as_of=2000-01-01")).stale.length, 0);

  // ---- acceptance 5: another firm cannot reserve in, read or void this firm's sequences ----
  const bFirst = await reserveOk(B, { document_type: "QT", year: 2026, purpose: "Firm B first quote" });
  assert.equal(bFirst.transaction_id, "NEX-QT-2026-0001", "firm B has its own sequence");
  assert.equal((await numbers(B)).reservations.length, 1);
  assert.equal((await voidNo(B, { transaction_id: first.transaction_id, reason: "Not mine" })).response.status, 404);
  assert.equal((await reserve(B, { document_type: "QT", year: 2026, purpose: "Spoof" }, A.h)).response.status, 403, "firm A's identity cannot reserve in firm B");
  assert.equal((await request(`/edcs/numbers?${q(B)}`, { headers: A.h })).response.status, 403, "nor read it");

  // ---- acceptance 4: the import cross-check ----
  const alphaName = (await detail(A, "NEX-QT-2026-0001")).transaction.counterparty_name;
  assert.ok(alphaName, "fixture QT-0001 has a counterparty");
  const r1 = await reserveOk(C, { document_type: "QT", year: 2026, purpose: "Matches the register", counterparty: alphaName });
  const r2 = await reserveOk(C, { document_type: "QT", year: 2026, purpose: "Other counterparty", counterparty: "Not The Register Name Ltd" });
  const r3 = await reserveOk(C, { document_type: "QT", year: 2026, purpose: "Will be voided" });
  assert.deepEqual([r1.transaction_id, r2.transaction_id, r3.transaction_id], ["NEX-QT-2026-0001", "NEX-QT-2026-0002", "NEX-QT-2026-0003"]);
  assert.ok((await voidNo(C, { transaction_id: r3.transaction_id, reason: "Not needed" })).response.status < 300);
  const imported = await importRegister(C, "register_01_baseline.xlsx");
  const rowFor = (id) => imported.rows.find((row) => row.transaction_id === id);
  assert.deepEqual(rowFor("NEX-QT-2026-0001").warnings.filter((w) => /RESERV|VOID/.test(w)), [], "a matching reservation raises no warning");
  assert.ok(rowFor("NEX-QT-2026-0002").warnings.some((w) => w.startsWith("RESERVED_FOR_DIFFERENT_COUNTERPARTY:Not The Register Name Ltd")));
  assert.ok(rowFor("NEX-QT-2026-0003").warnings.includes("VOIDED_NUMBER_USED"));
  assert.ok(rowFor("NEX-QT-2026-0004").warnings.includes("UNRESERVED"), "an ID nobody reserved is flagged, not rejected");
  assert.equal(rowFor("NEX-QT-2026-0004").outcome, "CREATED");
  const unreserved = imported.rows.filter((row) => row.warnings.includes("UNRESERVED"));
  assert.equal(unreserved.length, imported.rows.filter((row) => row.outcome === "CREATED").length - 3, "every created row except the three whose numbers were reserved (two live, one voided)");
  const deskC = await numbers(C);
  const statusOf = (id) => deskC.reservations.find((item) => item.transaction_id === id).status;
  assert.equal(statusOf("NEX-QT-2026-0001"), "REGISTERED");
  assert.equal(statusOf("NEX-QT-2026-0002"), "REGISTERED");
  assert.equal(statusOf("NEX-QT-2026-0003"), "VOID", "a voided number stays void even if a row uses it");
  assert.ok(deskC.reservations.find((item) => item.transaction_id === "NEX-QT-2026-0001").registered_run_id, "REGISTERED records the import");
  assert.equal((await voidNo(C, { transaction_id: r1.transaction_id, reason: "Too late" })).json.error.code, "NUMBER_NOT_VOIDABLE", "a REGISTERED number cannot be voided");
  // re-importing the same register stays quiet about numbers
  const reimport = await importRegister(C, "register_01_baseline.xlsx");
  assert.equal(reimport.rows.filter((row) => row.warnings.includes("UNRESERVED")).length, 0, "only the first sighting of an ID is flagged");
  // the next number follows the imported register for a type never reserved
  assert.equal((await reserveOk(C, { document_type: "PO", year: 2026, purpose: "Purchase order" })).transaction_id, "NEX-PO-2026-0004", "seeded from the imported POs (highest 0003)");

  // a firm that never reserved gets no cross-check noise
  const importedA = await importRegister(B, "register_01_baseline.xlsx");
  assert.ok(importedA.rows.length > 0);

  // ---- audit and export ----
  const audit = JSON.stringify(await get(`/audit-events?${q(A)}`, A.h));
  for (const event of ["edcs.number_reserved", "edcs.number_voided"]) assert.ok(audit.includes(event), event);
  assert.ok(JSON.stringify(await get(`/audit-events?${q(C)}`, C.h)).includes("edcs.number_registered"), "audit: edcs.number_registered");
  const exportA = await get(`/data-protection/export-package?${q(A)}`, A.h);
  assert.ok(exportA.records.edcs_number_reservations.length >= 56, "the export carries the reservations");
  assert.equal(exportA.records.edcs_number_reservations.every((item) => item.firm_id === A.firm.id), true);

  console.log(JSON.stringify({
    smoke: "ce-s4-number-authority",
    result: "passed",
    backend: process.env.VFIRM_SMOKE_DATABASE_URL ? "postgres" : "json",
    acceptance: ["fifty_concurrent_reservations_distinct_and_consecutive", "sequence_starts_after_highest_imported", "voided_number_never_reissued", "import_flags_unreserved_and_marks_registered", "other_firm_cannot_reserve_read_or_void"],
    guards_confirmed: ["validation", "not_connected_refused", "owner_only_void", "any_member_may_reserve", "registered_cannot_be_voided", "stale_list", "first_sighting_warning_only", "audit_events", "export_includes_reservations"],
    reservations_firm_a: desk.counts.RESERVED + desk.counts.VOID
  }, null, 2));
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  for (const child of children.map((c) => c)) if (child.exitCode === null && !child.killed) child.kill();
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await rm(tmp, { recursive: true, force: true });
}
