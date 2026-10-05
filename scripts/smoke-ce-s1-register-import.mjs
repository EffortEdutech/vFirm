import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readSheetRows } from "../packages/core-domain/src/tabular-file-reader.mjs";

// CE-S1 (ADR-095, 2026-10-05) -- Connected EDCS: register import and sync ledger.
//
// Drives the real API over HTTP with the synthetic Nexa Office Supplies (NEX) fixture pack from
// scripts/fixtures/bizkick/ and proves every CE-S1 acceptance check:
//   - baseline import creates exactly the expected transactions; counts match the register
//   - re-import is idempotent (every valid row UNCHANGED, no duplicates)
//   - status change -> UPDATED; revision bump -> REVISED with history kept
//   - same revision + different commercial content -> CONFLICT, held and not applied; owner
//     resolution (KEEP_CURRENT / ACCEPT_INCOMING) audited; backwards revision and reopened
//     terminal status are conflicts too
//   - duplicate ID in the file -> both rows REJECTED; wrong company code, bad ID, unknown type,
//     bad status/amount/date/currency -> REJECTED with the contract reason
//   - row removed from the register -> ROW_MISSING flag; the record and its history are kept
//   - a register saved without cached formula values imports identically; a changed header
//     rejects the whole file (STRUCTURE_CHANGED); a CSV export of the sheet imports too
//   - another firm cannot import into, read or resolve this firm's EDCS data
//   - audit events and the tenant export package carry every EDCS collection
//
// Local JSON backend + local-disk file storage by default; set VFIRM_SMOKE_DATABASE_URL for a fresh,
// fully-migrated Postgres (the same assertions then run against the direct SQL repository).

const root = process.cwd();
const fixtures = join(root, "scripts/fixtures/bizkick");
const expected = JSON.parse(await readFile(join(fixtures, "expected_outcomes.json"), "utf8"));
const tmp = await mkdtemp(join(tmpdir(), "vfirm-ce-s1-"));
const apiPort = 3171;
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
const stamp = Date.now();
let firmCounter = 0;

async function newFirm(label) {
  firmCounter += 1;
  const tenant = await post("/tenants", { name: `CE-S1 ${label} Tenant ${stamp}-${firmCounter}` });
  const seed = await post("/firms", { tenant_id: tenant.id, name: `CE-S1 ${label} Firm ${stamp}-${firmCounter}`, principal_name: `${label} Owner` });
  const firm = seed.firm;
  return { firm, h: headersFor(seed.principal_actor.id, firm), staff: headersFor(seed.principal_actor.id, firm, "PILOT_OPERATOR"), s: { tenant_id: firm.tenant_id, firm_id: firm.id }, label };
}
async function connect(ctx, extra = {}) {
  return post("/edcs/connection", { ...ctx.s, company_code: "NEX", bizkick_version: "1.0", ...extra }, ctx.h);
}
async function importFile(ctx, name, { bytes = null, filename = name, contentType = XLSX } = {}) {
  const buffer = bytes ?? (await fixture(name));
  const file = await upload(ctx.firm, ctx.h, filename, contentType, buffer);
  const result = await post("/edcs/register-imports", { ...ctx.s, file_id: file.id }, ctx.h);
  return { ...result, file, buffer };
}
const q = (ctx, extra = "") => `tenant_id=${ctx.s.tenant_id}&firm_id=${ctx.s.firm_id}${extra}`;
const listTx = (ctx, extra = "") => get(`/edcs/transactions?${q(ctx, `&as_of=${expected.as_of}${extra}`)}`, ctx.h);
const byRow = (result) => new Map(result.rows.filter((r) => r.row_number !== null).map((r) => [r.row_number, r]));
const FIELD_ALIAS = { expiry_due: "due_date" };

try {
  start("api", ["apps/api/src/server.mjs"], {
    VFIRM_API_PORT: String(apiPort),
    ...(process.env.VFIRM_SMOKE_DATABASE_URL ? {} : { VFIRM_STORE_PATH: join(tmp, "store.json") }),
    DATABASE_URL: process.env.VFIRM_SMOKE_DATABASE_URL ?? "",
    VFIRM_STORE_BACKEND: process.env.VFIRM_SMOKE_DATABASE_URL ? "postgres" : "json",
    VFIRM_FILE_STORAGE_BACKEND: "local",
    VFIRM_FILE_LOCAL_DIR: join(tmp, "files")
  });
  await waitForJson(`${apiBase}/health`);

  // ---------------- connection ----------------
  const A = await newFirm("Alpha");
  const B = await newFirm("Bravo"); // the other firm (isolation)
  const baselineName = "register_01_baseline.xlsx";
  const baseline = expected.files[baselineName];

  const noConnection = await upload(A.firm, A.h, baselineName, XLSX, await fixture(baselineName));
  await fails("POST", "/edcs/register-imports", 409, "EDCS_NOT_CONNECTED", { ...A.s, file_id: noConnection.id }, A.h);
  await fails("POST", "/edcs/connection", 403, "EDCS_OWNER_REQUIRED", { ...A.s, company_code: "NEX" }, A.staff);
  await fails("POST", "/edcs/connection", 400, "VALIDATION_ERROR", { ...A.s, company_code: "n e x!" }, A.h);
  await fails("POST", "/edcs/connection", 403, null, { ...B.s, company_code: "NEX" }, A.h); // A's identity cannot write B's scope
  const emptyConnection = await get(`/edcs/connection?${q(A)}`, A.h);
  assert.equal(emptyConnection.connection, null, "no connection yet");

  const connected = await connect(A);
  assert.equal(connected.connection.company_code, "NEX");
  assert.equal(connected.connection.topology, "UPLOAD");
  const policyOf = (data, module) => data.module_policies.find((p) => p.module === module)?.policy;
  for (const module of ["Sales", "Procurement", "Finance", "Management", "Inventory"]) assert.equal(policyOf(connected, module), "CONTENT", `${module} defaults to content (D7)`);
  for (const module of ["HR", "Legal"]) assert.equal(policyOf(connected, module), "METADATA_ONLY", `${module} defaults to metadata only (D7)`);
  const optedIn = await post("/edcs/connection", { ...A.s, company_code: "NEX", hr_content_opt_in: true }, A.h);
  assert.equal(policyOf(optedIn, "HR"), "CONTENT", "owner opt-in lifts HR to content");
  assert.equal(policyOf(optedIn, "Legal"), "METADATA_ONLY", "Legal untouched by the HR opt-in");
  const optedOut = await post("/edcs/connection", { ...A.s, company_code: "NEX", hr_content_opt_in: false }, A.h);
  assert.equal(policyOf(optedOut, "HR"), "METADATA_ONLY");

  // ---------------- baseline import ----------------
  const first = await importFile(A, baselineName);
  assert.equal(first.run.status, "COMPLETED");
  assert.equal(first.run.run_number, 1);
  assert.equal(first.run.source_sha256, sha(first.buffer), "run records the real SHA-256 of the source file");
  assert.equal(first.run.source_file_id, first.file.id);
  assert.equal(first.run.rows_total, baseline.rows, "every non-empty register row got an outcome");
  assert.equal(first.run.counts.CREATED, baseline.counts.CREATED);
  assert.equal(first.run.counts.REJECTED, baseline.counts.REJECTED);
  for (const outcome of ["UPDATED", "REVISED", "UNCHANGED", "CONFLICT", "ROW_MISSING"]) assert.equal(first.run.counts[outcome], 0, `baseline has no ${outcome}`);
  const firstRows = byRow(first);
  for (const [rowNumber, want] of Object.entries(baseline.per_row)) {
    const got = firstRows.get(Number(rowNumber));
    assert.ok(got, `row ${rowNumber} has an outcome`);
    assert.equal(got.transaction_id, want.transaction_id, `row ${rowNumber} id`);
    assert.equal(got.outcome, want.outcome, `row ${rowNumber} outcome`);
    assert.deepEqual(got.reasons, want.reasons, `row ${rowNumber} reasons`);
    assert.deepEqual(got.warnings, want.warnings ?? [], `row ${rowNumber} warnings`);
  }

  const afterFirst = await listTx(A);
  assert.equal(afterFirst.total_all, baseline.counts.CREATED, "counts match the register");
  assert.equal(new Set(afterFirst.transactions.map((t) => t.transaction_id)).size, baseline.counts.CREATED, "no duplicate transactions");
  assert.ok(!afterFirst.transactions.some((t) => t.transaction_id === "NEX-INV-2026-0003"), "duplicate-ID rows are not stored");
  const qt1 = afterFirst.transactions.find((t) => t.transaction_id === "NEX-QT-2026-0001");
  assert.equal(qt1.revision, "R1");
  assert.equal(qt1.amount, 18400);
  assert.equal(qt1.state, "accepted");
  assert.equal(qt1.module, "Sales");
  assert.equal(qt1.classification, "Confidential");
  assert.equal(afterFirst.transactions.find((t) => t.transaction_id === "NEX-EMP-2026-0001").classification, "Restricted");
  assert.equal(afterFirst.transactions.find((t) => t.transaction_id === "NEX-EMP-2026-0001").content_policy_default, "METADATA_ONLY");
  // Alerts are recomputed by vFirm at the as-of date and match the workbook's own formula.
  for (const [alert, ids] of Object.entries(expected.workbook_alert_values_at_as_of)) {
    const want = ids.filter((id) => id !== "NEX-INV-2026-0003").sort();
    const got = afterFirst.transactions.filter((t) => t.alert === alert).map((t) => t.transaction_id).sort();
    assert.deepEqual(got, want, `alert ${alert}`);
  }
  assert.deepEqual((await listTx(A, "&alert=overdue")).transactions.map((t) => t.transaction_id).sort(), expected.workbook_alert_values_at_as_of.OVERDUE.sort());
  // Filters.
  assert.equal((await listTx(A, "&type=QT")).transactions.every((t) => t.document_type === "QT"), true);
  assert.equal((await listTx(A, "&status=Cancelled")).transactions.length, 1);
  assert.deepEqual((await listTx(A, "&search=beta%20mart")).transactions.every((t) => /beta mart/i.test(t.counterparty_name)), true);
  assert.ok((await listTx(A, "&search=beta%20mart")).transactions.length >= 2);
  const detail = await get(`/edcs/transactions/NEX-QT-2026-0001?${q(A)}`, A.h);
  assert.equal(detail.revisions.length, 1);
  assert.equal(detail.revisions[0].kind, "CREATED");
  assert.equal(detail.events.length, 1);
  assert.equal(detail.events[0].outcome, "CREATED");

  // ---------------- idempotent re-import ----------------
  const again = await importFile(A, baselineName);
  assert.equal(again.run.run_number, 2);
  assert.equal(again.run.counts.UNCHANGED, baseline.counts.CREATED, "every valid row UNCHANGED");
  assert.equal(again.run.counts.REJECTED, baseline.counts.REJECTED, "duplicates REJECTED again, no state change");
  for (const key of ["CREATED", "UPDATED", "REVISED", "CONFLICT", "ROW_MISSING"]) assert.equal(again.run.counts[key], 0);
  const afterAgain = await listTx(A);
  assert.equal(afterAgain.total_all, baseline.counts.CREATED, "re-import adds no duplicates");
  assert.equal((await get(`/edcs/transactions/NEX-QT-2026-0001?${q(A)}`, A.h)).revisions.length, 1, "re-import adds no revision");
  const runs = await get(`/edcs/sync-runs?${q(A)}`, A.h);
  assert.equal(runs.runs.length, 2);
  assert.equal(runs.runs[0].run_number, 2, "newest run first");
  const runDetail = await get(`/edcs/sync-runs/${runs.runs[1].id}?${q(A)}`, A.h);
  assert.equal(runDetail.events.length, baseline.rows, "one event per row per run");
  const dupEvents = runDetail.events.filter((e) => e.reasons.includes("DUPLICATE_ID_IN_FILE"));
  assert.deepEqual(dupEvents.map((e) => e.row_number).sort((a, b) => a - b), [29, 30]);
  assert.ok(dupEvents.every((e) => e.raw && e.raw.counterparty_name), "rejected rows keep their raw content for review");

  // ---------------- per-scenario files (each applied after the baseline, in its own firm) ----------------
  const scenario = async (label, name) => {
    const ctx = await newFirm(label);
    await connect(ctx);
    await importFile(ctx, baselineName);
    const result = await importFile(ctx, name);
    return { ctx, result, rows: byRow(result), want: expected.files[name] };
  };
  const onlyChanged = (result, allowed) => {
    for (const row of result.rows) {
      if (allowed.includes(row.transaction_id) || allowed.includes(`ROW ${row.row_number}`)) continue;
      const isDuplicate = row.reasons.includes("DUPLICATE_ID_IN_FILE");
      assert.equal(row.outcome, isDuplicate ? "REJECTED" : "UNCHANGED", `row ${row.row_number} ${row.transaction_id} should be ${isDuplicate ? "REJECTED (duplicate)" : "UNCHANGED"}`);
    }
  };

  // 02 status change -> UPDATED (tracking fields), same revision, no new revision record
  {
    const { ctx, result, want } = await scenario("Status", "register_02_status_update.xlsx");
    const row = result.rows.find((r) => r.transaction_id === "NEX-QT-2026-0004");
    assert.equal(row.outcome, "UPDATED");
    assert.deepEqual([...row.changed_fields].sort(), want.changed["NEX-QT-2026-0004"].reasons_or_fields.map((f) => FIELD_ALIAS[f] ?? f).sort());
    onlyChanged(result, ["NEX-QT-2026-0004"]);
    const tx = (await get(`/edcs/transactions/NEX-QT-2026-0004?${q(ctx)}`, ctx.h));
    assert.equal(tx.transaction.status, "Accepted");
    assert.equal(tx.transaction.revision, "R0");
    assert.equal(tx.revisions.length, 1, "a tracking change is not a new revision");
    const updated = tx.events.find((e) => e.outcome === "UPDATED");
    assert.equal(updated.changes.status.from, "Issued");
    assert.equal(updated.changes.status.to, "Accepted");
    assert.notEqual(updated.before_fingerprint, updated.after_fingerprint);
  }
  // 03 revision bump -> REVISED with history kept
  {
    const { ctx, result, want } = await scenario("Revision", "register_03_revision.xlsx");
    const row = result.rows.find((r) => r.transaction_id === "NEX-QT-2026-0003");
    assert.equal(row.outcome, "REVISED");
    assert.deepEqual([...row.changed_fields].sort(), want.changed["NEX-QT-2026-0003"].reasons_or_fields.map((f) => FIELD_ALIAS[f] ?? f).sort());
    onlyChanged(result, ["NEX-QT-2026-0003"]);
    const tx = await get(`/edcs/transactions/NEX-QT-2026-0003?${q(ctx)}`, ctx.h);
    assert.equal(tx.transaction.revision, "R1");
    assert.equal(tx.transaction.revision_number, 1);
    assert.deepEqual(tx.revisions.map((r) => [r.seq, r.revision, r.kind]), [[1, "R0", "CREATED"], [2, "R1", "REVISED"]], "the earlier revision is kept in history");
    assert.notEqual(tx.revisions[0].snapshot.amount, tx.revisions[1].snapshot.amount, "each revision keeps its own row snapshot");
    assert.equal(tx.transaction.amount, tx.revisions[1].snapshot.amount);
  }
  // 04 same revision, different commercial content -> CONFLICT held; owner resolution audited
  {
    const { ctx, result, want } = await scenario("Conflict", "register_04_conflict_same_revision.xlsx");
    const row = result.rows.find((r) => r.transaction_id === "NEX-QT-2026-0006");
    assert.equal(row.outcome, "CONFLICT");
    assert.deepEqual(row.reasons, ["SAME_REVISION_COMMERCIAL_CHANGE"]);
    assert.equal(`${row.reasons[0]}:${row.reason_details.join(",")}`, want.changed["NEX-QT-2026-0006"].reasons_or_fields[0]);
    onlyChanged(result, ["NEX-QT-2026-0006"]);
    const held = await get(`/edcs/transactions/NEX-QT-2026-0006?${q(ctx)}`, ctx.h);
    const originalAmount = held.transaction.amount;
    assert.ok(held.transaction.held_conflict, "conflict is held");
    assert.notEqual(held.transaction.held_conflict.incoming.amount, originalAmount);
    assert.equal(held.transaction.status, "Issued", "the governed record is not changed by a held conflict");
    assert.equal((await get(`/edcs/conflicts?${q(ctx)}`, ctx.h)).conflicts.length, 1);
    assert.equal((await listTx(ctx, "&flag=conflict")).transactions.length, 1);
    // owner decisions are guarded
    const resolveBody = { ...ctx.s, transaction_id: "NEX-QT-2026-0006", choose: "KEEP_CURRENT", note: "Customer confirmed the original amount." };
    await fails("POST", "/edcs/conflicts/resolve", 403, "EDCS_OWNER_REQUIRED", resolveBody, ctx.staff);
    await fails("POST", "/edcs/conflicts/resolve", 400, "VALIDATION_ERROR", { ...resolveBody, note: "  " }, ctx.h);
    await fails("POST", "/edcs/conflicts/resolve", 400, "VALIDATION_ERROR", { ...resolveBody, choose: "MAYBE" }, ctx.h);
    await fails("POST", "/edcs/conflicts/resolve", 404, "NOT_FOUND", { ...resolveBody, transaction_id: "NEX-QT-2026-9999" }, ctx.h);
    // KEEP_CURRENT clears the hold and leaves the record as it was
    const kept = await post("/edcs/conflicts/resolve", resolveBody, ctx.h);
    assert.equal(kept.transaction.held_conflict, null);
    assert.equal(kept.transaction.amount, originalAmount);
    await fails("POST", "/edcs/conflicts/resolve", 409, "EDCS_NO_HELD_CONFLICT", resolveBody, ctx.h);
    // the source still contradicts, so the next import holds it again; ACCEPT_INCOMING applies it
    const reheld = await importFile(ctx, "register_04_conflict_same_revision.xlsx");
    assert.equal(reheld.rows.find((r) => r.transaction_id === "NEX-QT-2026-0006").outcome, "CONFLICT");
    const accepted = await post("/edcs/conflicts/resolve", { ...ctx.s, transaction_id: "NEX-QT-2026-0006", choose: "ACCEPT_INCOMING", note: "BizKick is right; quotation was repriced." }, ctx.h);
    assert.equal(accepted.transaction.held_conflict, null);
    assert.notEqual(accepted.transaction.amount, originalAmount);
    assert.equal(accepted.transaction.revision, "R0", "accepting a same-revision correction keeps the revision label");
    const afterAccept = await get(`/edcs/transactions/NEX-QT-2026-0006?${q(ctx)}`, ctx.h);
    assert.deepEqual(afterAccept.revisions.map((r) => r.kind), ["CREATED", "CONFLICT_ACCEPTED"]);
    assert.equal(afterAccept.revisions[1].resolution_note, "BizKick is right; quotation was repriced.");
    assert.ok(afterAccept.transaction.conflict_history.length === 2);
    assert.ok(afterAccept.events.some((e) => e.outcome === "CONFLICT_KEPT_CURRENT"));
    assert.ok(afterAccept.events.some((e) => e.outcome === "CONFLICT_ACCEPTED_INCOMING"));
    // a later import that matches the governed record is simply UNCHANGED
    const settled = await importFile(ctx, "register_04_conflict_same_revision.xlsx");
    assert.equal(settled.rows.find((r) => r.transaction_id === "NEX-QT-2026-0006").outcome, "UNCHANGED");
    // the audit trail carries both decisions
    const audit = JSON.stringify(await get(`/audit-events?tenant_id=${ctx.s.tenant_id}&firm_id=${ctx.s.firm_id}`, ctx.h));
    for (const event of ["edcs.conflict_held", "edcs.conflict_resolved"]) assert.ok(audit.includes(event), `missing audit event ${event}`);
    assert.ok(audit.includes("kept the vFirm record") && audit.includes("accepted the incoming BizKick row"), "both owner decisions are in the audit summaries");
  }
  // a held conflict closed by the register itself (the customer corrected BizKick)
  {
    const { ctx } = await scenario("SelfHeal", "register_04_conflict_same_revision.xlsx");
    assert.equal((await get(`/edcs/conflicts?${q(ctx)}`, ctx.h)).conflicts.length, 1);
    const healed = await importFile(ctx, baselineName);
    assert.equal(healed.rows.find((r) => r.transaction_id === "NEX-QT-2026-0006").outcome, "UNCHANGED");
    assert.equal((await get(`/edcs/conflicts?${q(ctx)}`, ctx.h)).conflicts.length, 0, "the held conflict closes when the source matches again");
  }
  // 05 revision backwards and a reopened terminal status -> CONFLICT
  {
    const { ctx, result } = await scenario("Backwards", "register_05_conflict_backwards_and_reopen.xlsx");
    const back = result.rows.find((r) => r.transaction_id === "NEX-QT-2026-0007");
    const reopen = result.rows.find((r) => r.transaction_id === "NEX-QT-2026-0008");
    assert.deepEqual([back.outcome, back.reasons], ["CONFLICT", ["REVISION_BACKWARDS"]]);
    assert.deepEqual([reopen.outcome, reopen.reasons], ["CONFLICT", ["TERMINAL_STATUS_REOPENED"]]);
    onlyChanged(result, ["NEX-QT-2026-0007", "NEX-QT-2026-0008"]);
    const tx7 = (await get(`/edcs/transactions/NEX-QT-2026-0007?${q(ctx)}`, ctx.h)).transaction;
    assert.equal(tx7.revision, "R1", "revision never goes backwards silently");
    const tx8 = (await get(`/edcs/transactions/NEX-QT-2026-0008?${q(ctx)}`, ctx.h)).transaction;
    assert.equal(tx8.status, "Cancelled", "a cancelled transaction stays cancelled until the owner decides");
    assert.equal((await get(`/edcs/conflicts?${q(ctx)}`, ctx.h)).conflicts.length, 2);
  }
  // 06 row removed from the register -> ROW_MISSING flag; record and history kept
  {
    const { ctx, result } = await scenario("Missing", "register_06_row_missing.xlsx");
    assert.equal(result.run.counts.ROW_MISSING, 1);
    const missing = result.rows.find((r) => r.outcome === "ROW_MISSING");
    assert.equal(missing.transaction_id, "NEX-PO-2026-0002");
    assert.deepEqual(missing.reasons, ["ROW_NOT_IN_SOURCE"]);
    onlyChanged(result, ["NEX-PO-2026-0002"]);
    const tx = await get(`/edcs/transactions/NEX-PO-2026-0002?${q(ctx)}`, ctx.h);
    assert.equal(tx.transaction.flags.row_missing, true);
    assert.equal(tx.revisions.length, 1, "history kept");
    assert.equal((await listTx(ctx, "&flag=row_missing")).transactions.length, 1);
    assert.equal((await listTx(ctx)).total_all, 55, "nothing is deleted");
    const second = await importFile(ctx, "register_06_row_missing.xlsx");
    assert.equal(second.run.counts.ROW_MISSING, 1);
    // the row comes back -> flag cleared
    const back = await importFile(ctx, baselineName);
    assert.equal(back.rows.find((r) => r.transaction_id === "NEX-PO-2026-0002").outcome, "UNCHANGED");
    assert.equal((await get(`/edcs/transactions/NEX-PO-2026-0002?${q(ctx)}`, ctx.h)).transaction.flags.row_missing, false);
  }
  // 07 rejects: contract reasons per row; nothing invalid is stored
  {
    const { ctx, result, want } = await scenario("Rejects", "register_07_rejects.xlsx");
    for (const [key, entry] of Object.entries(want.changed)) {
      const rowNumber = Number(key.replace("ROW ", ""));
      const row = result.rows.find((r) => r.row_number === rowNumber);
      assert.equal(row.outcome, "REJECTED", `${key} rejected`);
      assert.deepEqual(row.reasons, entry.reasons_or_fields, `${key} reason`);
      assert.ok(row.reason_details.length >= 1, `${key} explains itself`);
    }
    assert.equal(result.run.counts.REJECTED, 10, "8 invalid rows + 2 duplicates");
    onlyChanged(result, Object.keys(want.changed));
    assert.equal((await listTx(ctx)).total_all, 55, "rejected rows create nothing");
  }
  // 08 workbook as BizKick ships it (no cached formula values): same outcomes as the baseline
  {
    const { result } = await scenario("NoCache", "register_08_no_cached_values.xlsx");
    assert.equal(result.run.counts.UNCHANGED, 55);
    assert.equal(result.run.counts.REJECTED, 2);
    const fresh = await newFirm("NoCacheAlone");
    await connect(fresh);
    const alone = await importFile(fresh, "register_08_no_cached_values.xlsx");
    assert.equal(alone.run.counts.CREATED, 55, "imported alone it creates exactly the baseline");
    assert.equal(alone.run.counts.REJECTED, 2);
    const aloneRows = byRow(alone);
    for (const [rowNumber, want] of Object.entries(baseline.per_row)) assert.equal(aloneRows.get(Number(rowNumber)).transaction_id, want.transaction_id, `row ${rowNumber} composed id`);
  }
  // 09 changed header -> the whole file is rejected, zero rows processed, nothing changes
  {
    const ctx = await newFirm("Header");
    await connect(ctx);
    await importFile(ctx, baselineName);
    const before = await listTx(ctx);
    const rejected = await importFile(ctx, "register_09_header_changed.xlsx");
    assert.equal(rejected.run.status, "REJECTED");
    assert.equal(rejected.run.file_outcome.reason, "STRUCTURE_CHANGED");
    assert.equal(`${rejected.run.file_outcome.reason}:${rejected.run.file_outcome.detail}`, expected.files["register_09_header_changed.xlsx"].reason);
    assert.equal(rejected.run.rows_total, 0, "no rows processed");
    assert.equal(rejected.rows.length, 0);
    assert.deepEqual(await listTx(ctx), before, "a rejected file changes nothing");
    assert.equal((await get(`/edcs/sync-runs?${q(ctx)}`, ctx.h)).runs.length, 2, "the rejected import is still in the ledger");
    const csv = await importFile(ctx, "not-a-register.csv", { bytes: Buffer.from("a,b\n1,2\n"), filename: "not-a-register.csv", contentType: "text/csv" });
    assert.equal(csv.run.status, "REJECTED");
    assert.equal(csv.run.file_outcome.reason, "STRUCTURE_CHANGED");
  }
  // a CSV export of the register sheet imports too (line N is row N)
  {
    const sheet = readSheetRows({ filename: baselineName, buffer: await fixture(baselineName), sheetName: "TRANSACTION REGISTER" });
    const lines = [];
    for (let rowNumber = 1; rowNumber <= 506; rowNumber += 1) {
      const row = (sheet.rows.get(rowNumber) ?? []).slice(0, 24);
      lines.push(row.map((cell) => (/[",\n]/.test(String(cell)) ? `"${String(cell).replace(/"/g, '""')}"` : String(cell))).join(","));
    }
    const ctx = await newFirm("Csv");
    await connect(ctx);
    const imported = await importFile(ctx, "register.csv", { bytes: Buffer.from(lines.join("\r\n"), "utf8"), filename: "register.csv", contentType: "text/csv" });
    assert.equal(imported.run.counts.CREATED, 55, "CSV export of the register imports");
    assert.equal(imported.run.counts.REJECTED, 2);
  }
  // the company code is locked once transactions exist; a different code rejects the register
  await fails("POST", "/edcs/connection", 409, "EDCS_COMPANY_CODE_LOCKED", { ...A.s, company_code: "ABC" }, A.h);
  {
    const ctx = await newFirm("WrongCode");
    await post("/edcs/connection", { ...ctx.s, company_code: "ABC" }, ctx.h);
    const wrong = await importFile(ctx, baselineName);
    assert.equal(wrong.run.counts.REJECTED, 57, "every row carries NEX, not the firm's ABC");
    assert.ok(wrong.rows.every((r) => r.reasons.includes("COMPANY_CODE_MISMATCH")));
    assert.equal((await listTx(ctx)).total_all, 0);
  }

  // ---------------- counterparty link (owner confirms; suggestions only, never auto-created) ----------------
  const client = await post("/clients", { ...A.s, name: "Alpha Tech Resources" }, A.h);
  const clientId = client.client?.id ?? client.id;
  assert.ok(clientId, "client created");
  const clientsBefore = (await get("/mvp/store", A.h)).clients.filter((c) => c.firm_id === A.firm.id).length;
  const suggested = await get(`/edcs/transactions/NEX-QT-2026-0001?${q(A)}`, A.h);
  assert.equal(suggested.counterparty_suggestions[0].client_id, clientId);
  assert.equal(suggested.counterparty_suggestions[0].match, "EXACT");
  assert.equal(suggested.transaction.counterparty_link, null, "a suggestion is never applied automatically");
  assert.equal((await get("/mvp/store", A.h)).clients.filter((c) => c.firm_id === A.firm.id).length, clientsBefore, "no client is auto-created");
  const linkBody = { ...A.s, transaction_id: "NEX-QT-2026-0001", link_type: "CLIENT", client_id: clientId, note: "Same company" };
  await fails("POST", "/edcs/transactions/link-counterparty", 403, "EDCS_OWNER_REQUIRED", linkBody, A.staff);
  await fails("POST", "/edcs/transactions/link-counterparty", 404, "NOT_FOUND", { ...linkBody, client_id: "client_does_not_exist" }, A.h);
  await fails("POST", "/edcs/transactions/link-counterparty", 400, "VALIDATION_ERROR", { ...linkBody, link_type: "BOGUS" }, A.h);
  const linked = await post("/edcs/transactions/link-counterparty", linkBody, A.h);
  assert.equal(linked.transaction.counterparty_link.client_id, clientId);
  assert.equal(linked.transaction.counterparty_link.confirmed_by_actor_id, A.h["x-vfirm-actor-id"]);
  const supplier = await post("/edcs/transactions/link-counterparty", { ...A.s, transaction_id: "NEX-PO-2026-0001", link_type: "SUPPLIER", supplier_name: "PaperPlus Trading" }, A.h);
  assert.equal(supplier.transaction.counterparty_link.link_type, "SUPPLIER");
  const unlinked = await post("/edcs/transactions/link-counterparty", { ...A.s, transaction_id: "NEX-PO-2026-0001", link_type: "NONE" }, A.h);
  assert.equal(unlinked.transaction.counterparty_link, null);
  // a re-import keeps the confirmed link
  await importFile(A, baselineName);
  assert.equal((await get(`/edcs/transactions/NEX-QT-2026-0001?${q(A)}`, A.h)).transaction.counterparty_link.client_id, clientId);

  // ---------------- isolation: another firm cannot import into, read or resolve this firm's EDCS data ----------------
  await connect(B);
  const bSees = await get(`/edcs/transactions?${q(B)}`, B.h);
  assert.equal(bSees.total_all, 0, "firm B sees none of firm A's transactions");
  assert.equal((await get(`/edcs/sync-runs?${q(B)}`, B.h)).runs.length, 0);
  assert.equal((await get(`/edcs/conflicts?${q(B)}`, B.h)).conflicts.length, 0);
  await fails("GET", `/edcs/transactions?${q(A)}`, 403, null, undefined, B.h); // B's identity, A's scope
  await fails("GET", `/edcs/transactions/NEX-QT-2026-0001?${q(A)}`, 403, null, undefined, B.h);
  await fails("GET", `/edcs/transactions/NEX-QT-2026-0001?${q(B)}`, 404, "NOT_FOUND", undefined, B.h); // B's scope, A's id
  await fails("GET", `/edcs/sync-runs/${runs.runs[0].id}?${q(B)}`, 404, "NOT_FOUND", undefined, B.h);
  await fails("GET", `/edcs/sync-runs?${q(A)}`, 403, null, undefined, B.h);
  await fails("GET", `/edcs/connection?${q(A)}`, 403, null, undefined, B.h);
  await fails("GET", `/edcs/conflicts?${q(A)}`, 403, null, undefined, B.h);
  await fails("POST", "/edcs/register-imports", 403, null, { ...A.s, file_id: first.file.id }, B.h);
  await fails("POST", "/edcs/register-imports", 404, "NOT_FOUND", { ...B.s, file_id: first.file.id }, B.h); // A's file is invisible to B
  await fails("POST", "/edcs/conflicts/resolve", 403, null, { ...A.s, transaction_id: "NEX-QT-2026-0006", choose: "KEEP_CURRENT", note: "x" }, B.h);
  await fails("POST", "/edcs/conflicts/resolve", 404, "NOT_FOUND", { ...B.s, transaction_id: "NEX-QT-2026-0006", choose: "KEEP_CURRENT", note: "x" }, B.h);
  await fails("POST", "/edcs/transactions/link-counterparty", 403, null, { ...A.s, transaction_id: "NEX-QT-2026-0001", link_type: "NONE" }, B.h);
  await fails("POST", "/edcs/transactions/link-counterparty", 404, "NOT_FOUND", { ...B.s, transaction_id: "NEX-QT-2026-0001", link_type: "NONE" }, B.h);
  await fails("POST", "/edcs/connection", 403, null, { ...A.s, company_code: "NEX" }, B.h);
  assert.equal((await listTx(A)).total_all, 55, "firm A's data is untouched by every refused call");

  // ---------------- audit events ----------------
  const auditEvents = await get(`/audit-events?tenant_id=${A.s.tenant_id}&firm_id=${A.s.firm_id}`, A.h);
  const auditList = Array.isArray(auditEvents) ? auditEvents : auditEvents.audit_events ?? [];
  const actions = auditList.map((e) => e.action);
  const auditText = JSON.stringify(auditEvents);
  for (const event of ["edcs.connection_created", "edcs.connection_updated", "edcs.register_imported", "edcs.transaction_created", "edcs.counterparty_linked", "edcs.counterparty_unlinked"]) assert.ok(auditText.includes(event), `missing audit event ${event}`);
  assert.equal(actions.filter((a) => a === "edcs.transaction_created").length, 55, "one audit event per created transaction");
  assert.equal(actions.filter((a) => a === "edcs.register_imported").length, 3, "one audit event per import (baseline, re-import, re-import after linking)");
  // events of the other scenarios (revised / updated / row missing / held) are checked in their own firms
  for (const [label, file, event] of [["AuditUpdated", "register_02_status_update.xlsx", "edcs.transaction_updated"], ["AuditRevised", "register_03_revision.xlsx", "edcs.transaction_revised"], ["AuditMissing", "register_06_row_missing.xlsx", "edcs.transaction_flag_changed"], ["AuditHeld", "register_05_conflict_backwards_and_reopen.xlsx", "edcs.conflict_held"]]) {
    const { ctx } = await scenario(label, file);
    assert.ok(JSON.stringify(await get(`/audit-events?tenant_id=${ctx.s.tenant_id}&firm_id=${ctx.s.firm_id}`, ctx.h)).includes(event), `missing audit event ${event}`);
  }

  // ---------------- export package ----------------
  const exported = await get(`/data-protection/export-package?tenant_id=${A.s.tenant_id}&firm_id=${A.s.firm_id}`, A.h);
  for (const collection of ["edcs_connections", "edcs_transactions", "edcs_transaction_revisions", "edcs_sync_runs", "edcs_sync_events"]) assert.ok(Array.isArray(exported.records[collection]), `export has ${collection}`);
  assert.equal(exported.counts.edcs_connections, 1);
  assert.equal(exported.counts.edcs_transactions, 55);
  assert.equal(exported.counts.edcs_sync_runs, 3);
  assert.ok(exported.counts.edcs_transaction_revisions >= 55);
  assert.ok(exported.counts.edcs_sync_events >= 3 * 57);
  assert.ok(exported.records.edcs_transactions.every((t) => t.firm_id === A.firm.id && t.tenant_id === A.firm.tenant_id), "export is firm-scoped");
  const manifest = await get(`/data-protection/export-manifest?tenant_id=${A.s.tenant_id}&firm_id=${A.s.firm_id}`, A.h);
  assert.equal(manifest.counts.edcs_transactions, 55);
  const bExport = await get(`/data-protection/export-package?tenant_id=${B.s.tenant_id}&firm_id=${B.s.firm_id}`, B.h);
  assert.equal(bExport.counts.edcs_transactions, 0, "firm B's export holds none of firm A's EDCS data");

  console.log(JSON.stringify({
    smoke: "ce-s1-register-import",
    result: "passed",
    backend: process.env.VFIRM_SMOKE_DATABASE_URL ? "postgres" : "json",
    baseline: { rows: baseline.rows, created: baseline.counts.CREATED, rejected: baseline.counts.REJECTED },
    scenarios: ["idempotent_reimport", "status_update", "revision_with_history", "conflict_same_revision", "conflict_backwards", "conflict_terminal_reopened", "owner_resolution_keep_and_accept", "conflict_closed_by_source", "row_missing_and_return", "reject_reasons", "no_cached_values", "structure_changed", "csv_import", "company_code_mismatch", "company_code_locked"],
    guards_confirmed: ["owner_only_writes", "other_firm_cannot_read_import_resolve_link_or_connect", "suggestions_never_auto_create_clients", "rejected_file_still_in_ledger", "export_includes_all_edcs_collections"]
  }, null, 2));
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  for (const child of children) if (child.exitCode === null && !child.killed) child.kill();
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await rm(tmp, { recursive: true, force: true });
}
