import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { evaluateStoreReadAccess, storeAuthEnforced } from "../apps/api/src/store-read-guard.mjs";

// CE-H1 follow-up (ADR-102, 2026-10-06) -- the access rule for GET /mvp/store.
//
// This check is JSON-store only and NEVER touches a database (it forces the JSON backend and an empty
// DATABASE_URL whatever your shell has set), so it is safe to run anywhere, including a shell that still has
// VFIRM_SMOKE_DATABASE_URL set.
//
// Proves:
//   1. the pure rule: not enforced = open as before; enforced = scoped read needs a verified actor of that
//      tenant (and firm), the whole-database dump needs the service token; client-set headers never count
//   2. when enforcement switches on: forced by VFIRM_STORE_AUTH, or Postgres + real Supabase verification;
//      "open" overrides; a plain local JSON server stays open
//   3. over HTTP, on a server started with VFIRM_STORE_AUTH=required: no Bearer token = 401, dev headers alone
//      = 401, a bad Bearer token = 401, the dump without the token = 403 (also with a wrong token), the dump
//      with the right token = 200
//   4. over HTTP, on a normal local server: the dump and the scoped read still work with no credentials

// ---- 1. the pure rule ----
const verified = (tenant_id, firm_id) => ({ ok: true, actor: { tenant_id, firm_id } });
assert.deepEqual(evaluateStoreReadAccess({ enforced: false, tenantId: null }), { allow: true }, "not enforced: dump open");
assert.deepEqual(evaluateStoreReadAccess({ enforced: false, tenantId: "t1" }), { allow: true }, "not enforced: scoped open");
assert.equal(evaluateStoreReadAccess({ enforced: true, tenantId: null }).code, "FULL_STORE_READ_LOCKED");
assert.equal(evaluateStoreReadAccess({ enforced: true, tenantId: null }).status, 403);
assert.equal(evaluateStoreReadAccess({ enforced: true, tenantId: null, serviceTokenOk: true }).allow, true, "service token opens the dump");
assert.equal(evaluateStoreReadAccess({ enforced: true, tenantId: "t1" }).code, "AUTH_REQUIRED", "no auth object");
assert.equal(evaluateStoreReadAccess({ enforced: true, tenantId: "t1", auth: { ok: false } }).status, 401, "invalid token");
assert.equal(evaluateStoreReadAccess({ enforced: true, tenantId: "t1", auth: verified("t1", "f1") }).allow, true, "own tenant");
assert.equal(evaluateStoreReadAccess({ enforced: true, tenantId: "t1", firmId: "f1", auth: verified("t1", "f1") }).allow, true, "own tenant and firm");
assert.equal(evaluateStoreReadAccess({ enforced: true, tenantId: "t2", auth: verified("t1", "f1") }).status, 403, "other tenant");
assert.equal(evaluateStoreReadAccess({ enforced: true, tenantId: "t1", firmId: "f2", auth: verified("t1", "f1") }).status, 403, "other firm");
assert.equal(evaluateStoreReadAccess({ enforced: true, tenantId: "t1", auth: { ok: true, actor: {} } }).status, 403, "actor with no tenant");
assert.equal(evaluateStoreReadAccess({ enforced: true, tenantId: "t1", serviceTokenOk: true }).status, 401, "the service token does not stand in for a user on a scoped read");

// ---- 2. when it switches on ----
assert.equal(storeAuthEnforced({ env: {}, backend: "json", supabaseConfigured: false }), false, "plain local server is open");
assert.equal(storeAuthEnforced({ env: {}, backend: "json", supabaseConfigured: true }), false, "JSON store stays open even with Supabase configured");
assert.equal(storeAuthEnforced({ env: {}, backend: "postgres", supabaseConfigured: false }), false, "Postgres without real auth is a test server");
assert.equal(storeAuthEnforced({ env: {}, backend: "postgres", supabaseConfigured: true }), true, "production shape is enforced");
assert.equal(storeAuthEnforced({ env: { VFIRM_STORE_AUTH: "required" }, backend: "json", supabaseConfigured: false }), true, "forced on");
assert.equal(storeAuthEnforced({ env: { VFIRM_STORE_AUTH: "open" }, backend: "postgres", supabaseConfigured: true }), false, "forced open");

// ---- 3 and 4. over HTTP ----
const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-ce-h1-guard-"));
const children = [];
let logs = "";
function start(name, port, env) {
  const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: root,
    env: { ...process.env, VFIRM_API_PORT: String(port), VFIRM_STORE_BACKEND: "json", DATABASE_URL: "", VFIRM_DATABASE_URL: "", VFIRM_SMOKE_DATABASE_URL: "", VFIRM_STORE_PATH: join(tmp, `${name}.json`), ...env },
    stdio: ["ignore", "pipe", "pipe"]
  });
  children.push(child);
  child.stdout.on("data", (chunk) => { logs += `[${name}] ${chunk}`; });
  child.stderr.on("data", (chunk) => { logs += `[${name}] ${chunk}`; });
}
async function waitForHealth(base) {
  const started = Date.now();
  while (Date.now() - started < 20000) {
    try { if ((await fetch(`${base}/health`)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`API did not start. Logs:\n${logs}`);
}
const get = async (base, path, headers = {}) => {
  const response = await fetch(`${base}${path}`, { headers });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, json };
};

try {
  const guarded = "http://127.0.0.1:3179";
  const open = "http://127.0.0.1:3180";
  start("guarded", 3179, { VFIRM_STORE_AUTH: "required", VFIRM_SERVICE_TOKEN: "smoke-service-token" });
  start("open", 3180, { VFIRM_STORE_AUTH: "", VFIRM_SERVICE_TOKEN: "" });
  await Promise.all([waitForHealth(guarded), waitForHealth(open)]);

  const devHeaders = { "x-vfirm-actor-id": "someone", "x-vfirm-tenant-id": "t1", "x-vfirm-firm-id": "f1", "x-vfirm-role": "principal" };
  let r = await get(guarded, "/mvp/store?tenant_id=t1");
  assert.equal(r.status, 401); assert.equal(r.json.error.code, "AUTH_REQUIRED");
  r = await get(guarded, "/mvp/store?tenant_id=t1&firm_id=f1", devHeaders);
  assert.equal(r.status, 401, "client-set headers are not trusted when enforced");
  r = await get(guarded, "/mvp/store?tenant_id=t1", { authorization: "Bearer not-a-real-token" });
  assert.equal(r.status, 401, "a bad Bearer token is refused");
  r = await get(guarded, "/mvp/store");
  assert.equal(r.status, 403); assert.equal(r.json.error.code, "FULL_STORE_READ_LOCKED");
  r = await get(guarded, "/mvp/store", { "x-vfirm-service-token": "wrong" });
  assert.equal(r.status, 403, "a wrong service token does not open the dump");
  r = await get(guarded, "/mvp/store", { "x-vfirm-service-token": "smoke-service-token" });
  assert.equal(r.status, 200, "the right service token opens the dump");
  assert.ok(Array.isArray(r.json.data.firms), "and returns the store");
  r = await get(guarded, "/health");
  assert.equal(r.status, 200, "other routes are untouched");

  r = await get(open, "/mvp/store");
  assert.equal(r.status, 200, "local server: dump still open");
  r = await get(open, "/mvp/store?tenant_id=t1");
  assert.equal(r.status, 200, "local server: scoped read still open");

  console.log(JSON.stringify({ status: "pass", sprint: "CE-H1", follow_up: "ADR-102 store read guard", backend: "json (no database touched)", checked: ["pure rule", "when enforcement switches on", "enforced server refuses no-token, header-only, bad-token and un-tokened dump", "service token opens the dump", "local server unchanged"] }, null, 2));
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  for (const child of children) if (child.exitCode === null && !child.killed) child.kill();
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await rm(tmp, { recursive: true, force: true });
}
