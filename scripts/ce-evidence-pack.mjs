// CE-S9 (ADR-108): the Connected EDCS evidence pack.
//
// Runs every Connected EDCS check one after another and writes one dated summary the owner can read and sign:
//   docs/10_post_freeze_technical_design/evidence/CE_EVIDENCE_PACK_<date>.md  (and .json)
//
// Safety: by default every check runs on the JSON store, so nothing touches a database. A Postgres run is
// opt-in (--postgres <url>) and the URL must be a local scratch database (localhost / 127.0.0.1 / [::1]).
// A production URL is refused. (CE-H1 once ran against production by mistake; this is the guard.)
//
// Usage:
//   node scripts/ce-evidence-pack.mjs                      JSON store, all checks
//   node scripts/ce-evidence-pack.mjs --postgres postgres://postgres@127.0.0.1:5544/scratch
//   node scripts/ce-evidence-pack.mjs --only s4,s8         a subset (for trying it out)

import { spawn } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export const CHECKS = [
  { key: "s0", script: "check:ce:s0-contract-and-fixtures", sprint: "CE-S0", what: "Integration contract and the Nexa fixture pack", postgres: false },
  { key: "dates", script: "check:ce:register-date-formats", sprint: "ADR-105", what: "Day-month-year register dates", postgres: false },
  { key: "s1", script: "check:ce:s1-register-import", sprint: "CE-S1", what: "Register import and sync ledger", postgres: true },
  { key: "s2", script: "check:ce:s2-file-linking", sprint: "CE-S2", what: "File linking and document history", postgres: true },
  { key: "s3", script: "check:ce:s3-register-rules", sprint: "CE-S3", what: "Rule engine and register-driven work", postgres: true },
  { key: "s4", script: "check:ce:s4-number-authority", sprint: "CE-S4", what: "Number Authority (no duplicate numbers)", postgres: true },
  { key: "s5", script: "check:ce:s5-delegation-of-authority", sprint: "CE-S5", what: "Delegation of Authority (who may approve)", postgres: true },
  { key: "s6", script: "check:ce:s6-connector", sprint: "CE-S6", what: "Connector agent (offline, retry, revoke, outbox guard)", postgres: true },
  { key: "s7", script: "check:ce:s7-cloud-adapter", sprint: "CE-S7", what: "Microsoft 365 read-only adapter (simulated Microsoft)", postgres: true },
  { key: "s8", script: "check:ce:s8-template-drafting", sprint: "CE-S8", what: "Governed drafting into BizKick masters", postgres: true },
  { key: "vi1", script: "check:vi:s1-standing-instructions", sprint: "VI-S1", what: "Standing instructions (recurring work, once per period)", postgres: true },
  { key: "vi2", script: "check:vi:s2-morning-brief", sprint: "VI-S2", what: "Owner Morning Brief (deterministic, linked, saved daily)", postgres: true },
  { key: "h1gu", script: "check:ce:h1-store-read-guard", sprint: "CE-H1", what: "Store read guard", postgres: false },
  { key: "pa", script: "check:pa:request-gate", sprint: "Production auth", what: "Request gate: no anonymous or fake-header calls", postgres: false },
  { key: "vercel", script: "check:vercel:adapter", sprint: "ADR-104", what: "Vercel adapter", postgres: false }
];

export function localOnly(url) {
  try {
    const host = new URL(url).hostname;
    return ["localhost", "127.0.0.1", "[::1]", "::1"].includes(host);
  } catch {
    return false;
  }
}

function runScript(script, env) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "-s", script], { cwd: root, env: { ...process.env, ...env }, shell: process.platform === "win32" });
    let out = "";
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { out += d; });
    child.on("error", (error) => resolve({ exit: -1, ms: Date.now() - started, output: String(error.message) }));
    child.on("close", (code) => resolve({ exit: code, ms: Date.now() - started, output: out }));
  });
}

// The checks print a JSON summary (most do) or a PASS line; keep what helps a reader.
export function summarize(output) {
  const lines = String(output ?? "").trim().split(/\r?\n/).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const json = JSON.parse(lines[i]);
      if (json && typeof json === "object") return { status: json.status ?? null, detail: json.checked?.length ?? null };
    } catch { /* not JSON */ }
  }
  return { status: lines.some((line) => /^PASS\b/i.test(line)) ? "pass" : null, detail: null };
}

async function gitCommit() {
  try {
    const head = (await readFile(join(root, ".git", "HEAD"), "utf8")).trim();
    if (!head.startsWith("ref:")) return head.slice(0, 7);
    const ref = head.slice(5);
    try { return (await readFile(join(root, ".git", ref), "utf8")).trim().slice(0, 7); } catch { /* packed refs */ }
    const packed = await readFile(join(root, ".git", "packed-refs"), "utf8");
    const line = packed.split(/\r?\n/).find((l) => l.endsWith(` ${ref}`));
    return line ? line.slice(0, 7) : "unknown";
  } catch {
    return "not a git checkout";
  }
}

async function migrationList() {
  try {
    return (await readdir(join(root, "infra", "database", "migrations"))).filter((name) => /^\d{4}_.*\.sql$/.test(name)).sort();
  } catch {
    return [];
  }
}

export function renderMarkdown(report) {
  const rows = report.results.map((r) => `| ${r.sprint} | ${r.what} | ${r.backend} | ${r.verdict} | ${(r.ms / 1000).toFixed(1)} s |`).join("\n");
  const failed = report.results.filter((r) => r.verdict !== "PASS");
  const failedText = failed.length === 0
    ? `**All ${report.results.length} check runs passed.**`
    : `**${failed.length} of ${report.results.length} check runs did NOT pass: ${failed.map((r) => `${r.sprint} on ${r.backend}`).join(", ")}.** The acceptance gate cannot be passed until these are explained or fixed.`;
  const detail = failed.length
    ? `## Output of the checks that did not pass\n\n${failed.map((r) => `### ${r.sprint}: ${r.script}\n\n\`\`\`\n${String(r.tail ?? "").slice(-1800)}\n\`\`\``).join("\n\n")}\n\n`
    : "";
  return `# Connected EDCS: evidence pack

- Generated: ${report.generated_at}${report.partial ? " (PARTIAL RUN: not valid for the acceptance gate)" : ""}
- Commit: ${report.commit}
- Machine: ${report.platform}, Node ${report.node}
- Migrations in the repo: ${report.migrations.length} (last: ${report.migrations.at(-1) ?? "none"})
- Database used by the checks: ${report.postgres ? "a local scratch Postgres (checks that support it ran on it as well)" : "none (JSON store only; nothing touched a database)"}

## Result

${failedText}

| Sprint | What it proves | Store | Result | Time |
|---|---|---|---|---|
${rows}

## What these checks cover

- Import and re-import of the BizKick register give one row per transaction, with changes, conflicts and warnings recorded (S1, dates).
- Files match their transaction by ID, keep every revision, and HR/Legal files keep metadata only (S2).
- Rules start off, need a dry run, and never raise the same work twice (S3).
- Two people can never get the same transaction number; voided numbers are never reused (S4).
- A person can approve only what the approval limits allow, and every refusal is audited (S5).
- The connector sends only what changed, survives offline, stops when revoked, writes only to the outbox (S6).
- The Microsoft 365 adapter reads one folder, read-only, and keeps no secret in the clear (S7).
- A drafted document is a new numbered copy of the master, cannot be released before approval, and never overwrites a file (S8).
- A standing instruction raises one work request per period, never twice, and a paused one raises nothing (VI-S1).
- Another firm can never see this firm's data, and the tenant export holds no file bytes (isolation and export tests inside S1 to S8, the request gate and the store guard).

## What these checks do NOT cover

- A real Microsoft 365 tenant (the adapter is tested against a simulated Microsoft).
- A real client's BizKick data, or two weeks of real use: that is the pilot (see the pilot log).
- Opening a generated document in Excel on a person's own PC (the pilot log has the step).
- Per-route role audit and rate limiting (open since the production-auth sprint).

${detail}Signed off by the product owner on the acceptance gate document, not here.
`;
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  const postgresUrl = flag("--postgres");
  const only = flag("--only")?.split(",").map((s) => s.trim());
  if (postgresUrl && !localOnly(postgresUrl)) {
    console.error("Refused: --postgres must point at a local scratch database (localhost or 127.0.0.1). Never a production database.");
    process.exit(2);
  }
  const selected = CHECKS.filter((check) => !only || only.includes(check.key));
  if (selected.length === 0) { console.error("No checks selected."); process.exit(2); }
  const results = [];
  for (const check of selected) {
    const runs = [{ backend: "JSON", env: {} }];
    if (postgresUrl && check.postgres) runs.push({ backend: "Postgres", env: { VFIRM_ALLOW_LEGACY_PILOT_PROVISION: "true", VFIRM_SMOKE_DATABASE_URL: postgresUrl } });
    for (const run of runs) {
      process.stdout.write(`${check.sprint} ${run.backend} ... `);
      const result = await runScript(check.script, run.env);
      const summary = summarize(result.output);
      const verdict = result.exit === 0 && summary.status !== "fail" ? "PASS" : "FAIL";
      console.log(`${verdict} (${(result.ms / 1000).toFixed(1)} s)`);
      results.push({ key: check.key, script: check.script, sprint: check.sprint, what: check.what, backend: run.backend, exit: result.exit, ms: result.ms, verdict, tail: result.output.trim().split(/\r?\n/).slice(-12).join("\n") });
    }
  }
  const report = {
    generated_at: new Date().toISOString(), commit: await gitCommit(), platform: process.platform, node: process.version,
    migrations: await migrationList(), postgres: Boolean(postgresUrl), partial: Boolean(only), results
  };
  const dir = join(root, "docs", "10_post_freeze_technical_design", "evidence");
  await mkdir(dir, { recursive: true });
  const base = `CE_EVIDENCE_PACK_${report.generated_at.slice(0, 10)}${only ? "_PARTIAL" : ""}`;
  await writeFile(join(dir, `${base}.md`), renderMarkdown(report), "utf8");
  await writeFile(join(dir, `${base}.json`), JSON.stringify({ ...report, results: results.map(({ tail, ...rest }) => rest) }, null, 2), "utf8");
  const failed = results.filter((r) => r.verdict !== "PASS");
  console.log(JSON.stringify({ status: failed.length ? "fail" : "pass", sprint: "CE-S9", checks: results.length, failed: failed.map((r) => `${r.sprint}/${r.backend}`), written: `docs/10_post_freeze_technical_design/evidence/${base}.md` }));
  process.exit(failed.length ? 1 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
