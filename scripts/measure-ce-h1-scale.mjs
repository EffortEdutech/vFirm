import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { REGISTER_COLUMNS } from "../packages/core-domain/src/edcs-register.mjs";

// CE-H1 (ADR-100, 2026-10-06) -- scale measurement for the Connected EDCS.
//
// Starts the real API against a SCRATCH Postgres (never production: URLs that look like Supabase or a pooler
// are refused), builds F firms x R register rows x V revisions by importing synthetic CSV registers through
// the API (so the import itself is measured: the "sync a 500-row register" budget), then times the reads the
// console and the connector depend on and compares each with its budget.
//
//   VFIRM_MEASURE_DATABASE_URL=postgres://postgres@127.0.0.1:5544/vfirm_ce_s2 node scripts/measure-ce-h1-scale.mjs
//   Optional: VFIRM_MEASURE_FIRMS (5), VFIRM_MEASURE_ROWS (2000 per firm), VFIRM_MEASURE_REVISIONS (3),
//             VFIRM_MEASURE_OUT (write the JSON result to this path), VFIRM_MEASURE_ENFORCE=1 (exit 1 over budget).
//
// Budgets (ms; reads are the median of the runs, the import budget is the slowest 500-row import):
export const BUDGETS = {
  import_500_rows: 5000,
  edcs_transactions_list: 500,
  edcs_transaction_detail: 300,
  edcs_signals: 500,
  edcs_numbers: 500,
  edcs_chains: 800,
  edcs_sync_runs: 300,
  mvp_store_scoped: 1500,
  work_request_create: 1000
};

const url = process.env.VFIRM_MEASURE_DATABASE_URL;
if (!url) { console.error("Set VFIRM_MEASURE_DATABASE_URL to a SCRATCH Postgres (never production)."); process.exit(2); }
if (/supabase|pooler|amazonaws|neon\.tech/i.test(url)) { console.error("Refusing: that looks like a hosted database. The measurement writes thousands of rows."); process.exit(2); }

const FIRMS = Number(process.env.VFIRM_MEASURE_FIRMS ?? 5);
const ROWS = Number(process.env.VFIRM_MEASURE_ROWS ?? 2000);
const REVISIONS = Number(process.env.VFIRM_MEASURE_REVISIONS ?? 3);
const BATCH = 500;
const RUNS = 5;
const root = process.cwd();
const apiPort = 3176;
const apiBase = `http://127.0.0.1:${apiPort}`;
const tmp = await mkdtemp(join(tmpdir(), "vfirm-ce-h1-"));
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
    try { const r = await fetch(`${apiBase}/health`); if (r.ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`API did not start. Logs:\n${logs}`);
}
async function call(path, { method = "GET", body, headers = {}, raw = null, contentType = "application/json" } = {}) {
  const started = performance.now();
  const response = await fetch(`${apiBase}${path}`, { method, headers: { "content-type": contentType, ...headers }, body: raw ?? (body ? JSON.stringify(body) : undefined) });
  const json = await response.json().catch(() => ({ ok: false }));
  const ms = performance.now() - started;
  assert.equal(response.ok && json.ok !== false, true, `${method} ${path}: HTTP ${response.status} ${JSON.stringify(json).slice(0, 300)}`);
  return { data: json.data, ms };
}
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const round = (n) => Math.round(n);
const headersFor = (actorId, firm) => ({ "x-vfirm-actor-id": actorId, "x-vfirm-tenant-id": firm.tenant_id, "x-vfirm-firm-id": firm.id, "x-vfirm-role": "principal" });

// One register file: rows [from, to] of the firm's sequence, at revision `rev` (0 = R0).
function registerCsv(from, to, rev) {
  const header = REGISTER_COLUMNS.map((c) => c.header).join(",");
  const lines = ["BizKick EDCS", "", "", "", "", header];
  for (let seq = from; seq <= to; seq += 1) {
    const amount = 1000 + seq + rev * 10; // a commercial change forces a new revision
    lines.push(["NEX", "QT", 2026, seq, "", `R${rev}`, "2026-09-01", "2026-09-02", "Customer", `Customer ${seq}`, `Quotation ${seq}`, amount, "MYR", "Issued", "Owner", "2026-12-31", "", "", "", "", "", "2026-09-02", "", ""].join(","));
  }
  return Buffer.from(lines.join("\n"));
}

const result = { measured_at: new Date().toISOString(), volume: { firms: FIRMS, rows_per_firm: ROWS, revisions: REVISIONS }, import_ms: [], reads: {}, budgets: BUDGETS, over_budget: [] };

try {
  start("api", ["apps/api/src/server.mjs"], {
    VFIRM_API_PORT: String(apiPort), DATABASE_URL: url, VFIRM_STORE_BACKEND: "postgres",
    VFIRM_FILE_STORAGE_BACKEND: "local", VFIRM_FILE_LOCAL_DIR: join(tmp, "files")
  });
  await waitForHealth();

  const stamp = Date.now();
  const firms = [];
  for (let i = 1; i <= FIRMS; i += 1) {
    const tenant = (await call("/tenants", { method: "POST", body: { name: `CE-H1 Tenant ${stamp}-${i}` } })).data;
    const seed = (await call("/firms", { method: "POST", body: { tenant_id: tenant.id, name: `CE-H1 Firm ${stamp}-${i}`, principal_name: `Owner ${i}` } })).data;
    const firm = seed.firm;
    const h = headersFor(seed.principal_actor.id, firm);
    const s = { tenant_id: firm.tenant_id, firm_id: firm.id };
    await call("/edcs/connection", { method: "POST", body: { ...s, company_code: "NEX" }, headers: h });
    // one enabled rule that matches nothing, so every import also pays for rule evaluation
    const rule = (await call("/automation/rules", { method: "POST", body: { ...s, template_id: "employee_onboarding" }, headers: h })).data.rule;
    await call("/automation/rules/dry-run", { method: "POST", body: { ...s, rule_id: rule.id }, headers: h });
    await call("/automation/rules/enable", { method: "POST", body: { ...s, rule_id: rule.id, enabled: true }, headers: h });
    firms.push({ firm, h, s });
  }

  // build the volume: ROWS rows per firm, REVISIONS passes, BATCH rows per file
  for (const { firm, h, s } of firms) {
    for (let rev = 0; rev < REVISIONS; rev += 1) {
      for (let from = 1; from <= ROWS; from += BATCH) {
        const to = Math.min(from + BATCH - 1, ROWS);
        const name = `register_${from}_${to}_r${rev}.csv`;
        const upload = await call(`/files/upload?tenant_id=${s.tenant_id}&firm_id=${s.firm_id}&filename=${encodeURIComponent(name)}`, { method: "POST", raw: registerCsv(from, to, rev), contentType: "text/csv", headers: h });
        const imported = await call("/edcs/register-imports", { method: "POST", body: { ...s, file_id: upload.data.id }, headers: h });
        assert.equal(imported.data.run.status, "COMPLETED", `import ${name}`);
        result.import_ms.push({ firm: firm.name, file: name, rows: to - from + 1, ms: round(imported.ms), counts: imported.data.run.counts });
      }
    }
  }

  // reads, on the first firm (all firms hold the same volume), median of RUNS
  const { h, s } = firms[0];
  const q = `tenant_id=${s.tenant_id}&firm_id=${s.firm_id}`;
  const timeRead = async (key, path, options = {}) => {
    const samples = [];
    for (let i = 0; i < RUNS; i += 1) samples.push((await call(path, { headers: h, ...options })).ms);
    result.reads[key] = { median_ms: round(median(samples)), max_ms: round(Math.max(...samples)) };
  };
  await timeRead("edcs_transactions_list", `/edcs/transactions?${q}`);
  await timeRead("edcs_transaction_detail", `/edcs/transactions/NEX-QT-2026-${String(Math.floor(ROWS / 2)).padStart(4, "0")}?${q}`);
  await timeRead("edcs_signals", `/edcs/signals?${q}`);
  await timeRead("edcs_numbers", `/edcs/numbers?${q}`);
  await timeRead("edcs_chains", `/edcs/chains?${q}`);
  await timeRead("edcs_sync_runs", `/edcs/sync-runs?${q}`);
  await timeRead("mvp_store_unscoped", "/mvp/store");
  await timeRead("mvp_store_scoped", `/mvp/store?${q}`);
  const created = [];
  for (let i = 0; i < RUNS; i += 1) created.push((await call("/work-requests", { method: "POST", body: { ...s, title: `Load check ${i}`, instructions: "CE-H1 measurement", request_type_id: "bank_reconciliation" }, headers: h })).ms);
  result.reads.work_request_create = { median_ms: round(median(created)), max_ms: round(Math.max(...created)) };

  const slowestImport = Math.max(...result.import_ms.filter((x) => x.rows >= Math.min(BATCH, ROWS)).map((x) => x.ms));
  result.import_summary = { files: result.import_ms.length, slowest_500_row_ms: slowestImport, median_ms: round(median(result.import_ms.map((x) => x.ms))) };
  const check = (key, value) => { if (value > BUDGETS[key]) result.over_budget.push({ key, value, budget: BUDGETS[key] }); };
  check("import_500_rows", slowestImport);
  for (const key of Object.keys(BUDGETS)) if (result.reads[key]) check(key, result.reads[key].median_ms);
  result.within_budget = result.over_budget.length === 0;

  const text = JSON.stringify(result, null, 2);
  if (process.env.VFIRM_MEASURE_OUT) await writeFile(process.env.VFIRM_MEASURE_OUT, text);
  console.log(JSON.stringify({ volume: result.volume, import_summary: result.import_summary, reads: result.reads, over_budget: result.over_budget, within_budget: result.within_budget }, null, 2));
  if (!result.within_budget && process.env.VFIRM_MEASURE_ENFORCE === "1") process.exitCode = 1;
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  for (const child of children) if (child.exitCode === null && !child.killed) child.kill();
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await rm(tmp, { recursive: true, force: true });
}
