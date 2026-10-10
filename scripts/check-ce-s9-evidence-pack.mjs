// CE-S9 (ADR-108): the evidence pack runner refuses a non-local database, reads check output correctly,
// and writes a readable summary (tried on one fast check, written as a PARTIAL file that is then removed).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CHECKS, localOnly, renderMarkdown, summarize } from "./ce-evidence-pack.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, "scripts", "ce-evidence-pack.mjs");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

// every check the pack runs exists in package.json
for (const check of CHECKS) assert.ok(pkg.scripts[check.script], `${check.script} is not an npm script`);
assert.equal(new Set(CHECKS.map((c) => c.key)).size, CHECKS.length, "duplicate keys");
for (const sprint of ["CE-S0", "CE-S1", "CE-S2", "CE-S3", "CE-S4", "CE-S5", "CE-S6", "CE-S7", "CE-S8"]) assert.ok(CHECKS.some((c) => c.sprint === sprint), `${sprint} missing from the pack`);

// database guard
assert.equal(localOnly("postgres://postgres@127.0.0.1:5544/x"), true);
assert.equal(localOnly("postgres://u:p@localhost/x"), true);
assert.equal(localOnly("postgres://u:p@db.abcdefgh.supabase.co:5432/postgres"), false);
assert.equal(localOnly("not a url"), false);
const refused = spawnSync(process.execPath, [script, "--postgres", "postgres://u:p@db.abcdefgh.supabase.co:5432/postgres", "--only", "dates"], { encoding: "utf8" });
assert.equal(refused.status, 2, "a remote database must be refused");
assert.match(refused.stderr, /Never a production database/);
assert.ok(!/supabase/.test(refused.stdout), "the URL must not be echoed");

// output reading
assert.equal(summarize('noise\n{"status":"pass","checked":["a","b"]}').status, "pass");
assert.equal(summarize('{"status":"fail"}').status, "fail");
assert.equal(summarize("PASS check:x").status, "pass");
assert.equal(summarize("").status, null);

// the summary text
const md = renderMarkdown({ generated_at: "2026-10-12T00:00:00Z", commit: "abc1234", platform: "linux", node: "v22", migrations: ["0001_a.sql", "0056_b.sql"], postgres: false, partial: false,
  results: [{ sprint: "CE-S1", what: "x", backend: "JSON", verdict: "PASS", ms: 1200 }, { sprint: "CE-S2", what: "y", backend: "JSON", verdict: "FAIL", ms: 900, script: "check:ce:s2-file-linking", tail: "boom" }] });
assert.match(md, /did NOT pass: CE-S2 on JSON/);
assert.match(md, /boom/);
assert.match(md, /What these checks do NOT cover/);

// a real, fast run
const run = spawnSync(process.execPath, [script, "--only", "dates"], { cwd: root, encoding: "utf8" });
assert.equal(run.status, 0, run.stdout + run.stderr);
const summary = JSON.parse(run.stdout.trim().split(/\r?\n/).at(-1));
assert.equal(summary.status, "pass");
assert.match(summary.written, /_PARTIAL\.md$/);
const written = join(root, summary.written);
assert.ok(existsSync(written));
assert.match(readFileSync(written, "utf8"), /PARTIAL RUN: not valid for the acceptance gate/);
rmSync(written);
rmSync(written.replace(/\.md$/, ".json"));

console.log(JSON.stringify({ status: "pass", sprint: "CE-S9", checked: ["every pack check exists", "remote database refused", "check output read", "summary text", "a real run writes a PARTIAL file"] }));
