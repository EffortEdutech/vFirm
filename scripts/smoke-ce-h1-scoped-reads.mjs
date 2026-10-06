import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { REGISTER_COLUMNS } from "../packages/core-domain/src/edcs-register.mjs";

// CE-H1 (ADR-100, 2026-10-06) -- scale hardening: the scoped reads and the ledger opt-out must not change what
// the product does. This is the functional-regression half of CE-H1 (scripts/measure-ce-h1-scale.mjs is the
// timing half). It needs Postgres, because the scoping and the ledger opt-out exist only on that backend (the
// JSON store is a dev/test store that always loads everything); without VFIRM_SMOKE_DATABASE_URL it says so
// and passes.
//
// Proves, against a fresh fully-migrated Postgres:
//   1. GET /mvp/store?tenant_id=A returns tenant A's records only (no firm, work request or client of tenant B),
//      and leaves the three ledgers out; without tenant_id it is still the whole-database dump with the ledgers
//   2. a write that opts out of the ledger load (a work request, a register import, a file link, a connector
//      event) still appends its events and audits, and removes none of the existing ones
//   3. the targeted EDCS lookups (transaction, revisions, events, run) return exactly what the full reads did
//   4. every firm-scoped EDCS read still returns only its own firm's rows

if (!process.env.VFIRM_SMOKE_DATABASE_URL) {
  console.log(JSON.stringify({ status: "skipped", sprint: "CE-H1", reason: "set VFIRM_SMOKE_DATABASE_URL to a fresh, fully-migrated Postgres" }));
  process.exit(0);
}

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-ce-h1-"));
const apiPort = 3178;
const apiBase = `http://127.0.0.1:${apiPort}`;
const children = [];
let logs = "";

function start(name, args, env) {
  const child = spawn(process.execPath, args, { cwd: root, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  child.stdout.on("data", (chunk) => { logs += `[${name}] ${chunk}`; });
  child.stderr.on("data", (chunk) => { logs += `[${name}] ${chunk}`; });
}
async function waitForHealth() {
  const started = Date.now();
  while (Date.now() - started < 20000) {
    try { if ((await fetch(`${apiBase}/health`)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`API did not start. Logs:\n${logs}`);
}
async function call(path, { method = "GET", body, headers = {}, raw = null, contentType = "application/json" } = {}) {
  const response = await fetch(`${apiBase}${path}`, { method, headers: { "content-type": contentType, ...headers }, body: raw ?? (body ? JSON.stringify(body) : undefined) });
  const json = await response.json().catch(() => ({ ok: false }));
  assert.equal(response.ok && json.ok !== false, true, `${method} ${path}: HTTP ${response.status} ${JSON.stringify(json).slice(0, 300)}`);
  return json.data;
}
const stamp = Date.now();
async function newFirm(label) {
  const tenant = await call("/tenants", { method: "POST", body: { name: `CE-H1 ${label} Tenant ${stamp}` } });
  const seed = await call("/firms", { method: "POST", body: { tenant_id: tenant.id, name: `CE-H1 ${label} Firm ${stamp}`, principal_name: `${label} Owner` } });
  const firm = seed.firm;
  return { firm, h: { "x-vfirm-actor-id": seed.principal_actor.id, "x-vfirm-tenant-id": firm.tenant_id, "x-vfirm-firm-id": firm.id, "x-vfirm-role": "principal" }, s: { tenant_id: firm.tenant_id, firm_id: firm.id } };
}
const q = (ctx) => `tenant_id=${ctx.s.tenant_id}&firm_id=${ctx.s.firm_id}`;
const csv = (rows) => Buffer.from(["BizKick EDCS", "", "", "", "", REGISTER_COLUMNS.map((c) => c.header).join(","), ...rows].join("\n"));
const registerRow = (seq, rev, amount) => ["NEX", "QT", 2026, seq, "", `R${rev}`, "2026-09-01", "2026-09-02", "Customer", `Customer ${seq}`, `Quotation ${seq}`, amount, "MYR", "Issued", "Owner", "2026-12-31", "", "", "", "", "", "2026-09-02", "", ""].join(",");
async function importCsv(ctx, name, rows) {
  const upload = await call(`/files/upload?${q(ctx)}&filename=${encodeURIComponent(name)}`, { method: "POST", raw: csv(rows), contentType: "text/csv", headers: ctx.h });
  return call("/edcs/register-imports", { method: "POST", body: { ...ctx.s, file_id: upload.id }, headers: ctx.h });
}
const ledger = async () => {
  const store = await call("/mvp/store");
  return { events: store.event_log.length, audits: store.audit_events.length, ids: new Set(store.audit_events.map((a) => a.id)) };
};

try {
  start("api", ["apps/api/src/server.mjs"], {
    VFIRM_API_PORT: String(apiPort), DATABASE_URL: process.env.VFIRM_SMOKE_DATABASE_URL, VFIRM_STORE_BACKEND: "postgres",
    VFIRM_FILE_STORAGE_BACKEND: "local", VFIRM_FILE_LOCAL_DIR: join(tmp, "files")
  });
  await waitForHealth();
  const A = await newFirm("Alpha");
  const B = await newFirm("Bravo");
  for (const ctx of [A, B]) await call("/edcs/connection", { method: "POST", body: { ...ctx.s, company_code: "NEX" }, headers: ctx.h });

  // ---- a work request in each firm (the opt-out write), ledger preserved ----
  const before = await ledger();
  const requestA = (await call("/work-requests", { method: "POST", body: { ...A.s, title: "Alpha reconciliation", instructions: "CE-H1", request_type_id: "bank_reconciliation" }, headers: A.h })).work_request;
  const requestB = (await call("/work-requests", { method: "POST", body: { ...B.s, title: "Bravo reconciliation", instructions: "CE-H1", request_type_id: "bank_reconciliation" }, headers: B.h })).work_request;
  assert.equal(requestA.request_number, "WR-0001");
  assert.equal(requestB.request_number, "WR-0001", "numbering is per firm");
  const afterRequests = await ledger();
  assert.equal(afterRequests.audits, before.audits + 2, "each work request appended its audit event");
  assert.equal(afterRequests.events, before.events + 2, "...and its event");
  for (const id of before.ids) assert.equal(afterRequests.ids.has(id), true, "no existing audit event was lost");

  // ---- 1. scoped vs unscoped /mvp/store ----
  const scoped = await call(`/mvp/store?tenant_id=${A.s.tenant_id}&firm_id=${A.s.firm_id}`);
  assert.ok(scoped.work_requests.some((r) => r.id === requestA.id), "tenant A's own request is there");
  assert.equal(scoped.work_requests.some((r) => r.id === requestB.id), false, "tenant B's request is not");
  assert.equal(scoped.firms.some((f) => f.id === B.firm.id), false, "tenant B's firm is not");
  assert.ok(scoped.firms.some((f) => f.id === A.firm.id));
  assert.equal(scoped.event_log.length, 0, "the ledgers are left out of a scoped read");
  assert.equal(scoped.audit_events.length, 0);
  const whole = await call("/mvp/store");
  assert.ok(whole.firms.some((f) => f.id === A.firm.id) && whole.firms.some((f) => f.id === B.firm.id), "without tenant_id it is still the whole dump");
  assert.ok(whole.event_log.length > 0 && whole.audit_events.length > 0, "...with its ledgers");

  // ---- 2 and 3. imports, revisions, files, events: the targeted lookups agree with the data ----
  const first = await importCsv(A, "r0.csv", [registerRow(1, 0, 1000), registerRow(2, 0, 2000), registerRow(3, 0, 3000)]);
  assert.equal(first.run.counts.CREATED, 3);
  const second = await importCsv(A, "r1.csv", [registerRow(1, 1, 1100), registerRow(2, 0, 2000), registerRow(3, 0, 3000)]);
  assert.equal(second.run.counts.REVISED, 1);
  assert.equal(second.run.counts.UNCHANGED, 2);
  await importCsv(B, "b0.csv", [registerRow(1, 0, 5000)]);
  const afterImports = await ledger();
  assert.ok(afterImports.audits >= afterRequests.audits + 4, "imports appended their audits");
  for (const id of afterRequests.ids) assert.equal(afterImports.ids.has(id), true, "no existing audit event was lost");

  const detail = await call(`/edcs/transactions/NEX-QT-2026-0001?${q(A)}`, { headers: A.h });
  assert.equal(detail.transaction.revision, "R1");
  assert.equal(detail.revisions.length, 2, "both revisions of the transaction");
  assert.deepEqual(detail.revisions.map((r) => r.seq), [1, 2]);
  assert.ok(detail.events.every((e) => e.transaction_id === "NEX-QT-2026-0001"), "events are this transaction's only");
  assert.equal(detail.events.length, 2);
  const untouched = await call(`/edcs/transactions/NEX-QT-2026-0002?${q(A)}`, { headers: A.h });
  assert.equal(untouched.revisions.length, 1);
  const run = await call(`/edcs/sync-runs/${second.run.id}?${q(A)}`, { headers: A.h });
  assert.equal(run.run.id, second.run.id);
  assert.equal(run.events.length, 3, "the run's events");
  assert.ok(run.events.every((e) => e.run_id === second.run.id));
  const response = await fetch(`${apiBase}/edcs/transactions/NEX-QT-2026-9999?${q(A)}`, { headers: A.h });
  assert.equal(response.status, 404, "an unknown transaction is still a 404");

  // ---- 4. isolation of the targeted reads ----
  const bDetail = await call(`/edcs/transactions/NEX-QT-2026-0001?${q(B)}`, { headers: B.h });
  assert.equal(bDetail.transaction.revision, "R0", "Bravo's NEX-QT-2026-0001 is its own record");
  assert.equal(bDetail.revisions.length, 1);
  assert.equal(bDetail.events.length, 1);
  const bRun = await fetch(`${apiBase}/edcs/sync-runs/${second.run.id}?${q(B)}`, { headers: B.h });
  assert.equal(bRun.status, 404, "Bravo cannot read Alpha's run by id");
  assert.equal((await call(`/edcs/transactions?${q(A)}`, { headers: A.h })).transactions.length, 3);
  assert.equal((await call(`/edcs/transactions?${q(B)}`, { headers: B.h })).transactions.length, 1);

  console.log(JSON.stringify({ status: "pass", sprint: "CE-H1", backend: "postgres", checked: ["scoped store read", "ledgers left out only of scoped reads", "ledger preserved by opt-out writes", "targeted lookups agree", "firm isolation"] }, null, 2));
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  for (const child of children) if (child.exitCode === null && !child.killed) child.kill();
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await rm(tmp, { recursive: true, force: true });
}
