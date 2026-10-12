import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { DEFAULTS, WINDOW_SECONDS, classify, clientIp, limitsFrom, rateKey, rateLimitEnabled, retryAfterSeconds, windowStart } from "../apps/api/src/rate-limit-policy.mjs";

// RA rate limiting (ADR-116, 2026-10-12).
//
// Part 1 is pure: which route is normal / expensive / sign-in / exempt, the Balanced limits, who is counted (user or IP),
// when the limiter is on, and how the caller's address is read.
// Part 2 drives the real API with small limits (VFIRM_RATE_NORMAL=15, _EXPENSIVE=3, _AUTH=2): one user hitting the limit gets
// HTTP 429 with a retry time, another user is unaffected, exempt routes are never counted. On Postgres it also proves the counters
// live in the rate_limits table and that a broken counter table never blocks real work.
// Local JSON backend by default; set VFIRM_SMOKE_DATABASE_URL for a fresh, fully-migrated Postgres.

const root = process.cwd();
const SERVICE_TOKEN = "smoke-service-token-rl";
const tmp = await mkdtemp(join(tmpdir(), "vfirm-rl-"));
const apiPort = 3191;
const apiBase = `http://127.0.0.1:${apiPort}`;
const DB = process.env.VFIRM_SMOKE_DATABASE_URL ?? "";
let api = null;
let logs = "";

// ============================ part 1: the policy ============================
assert.deepEqual(DEFAULTS, { NORMAL: 240, EXPENSIVE: 20, AUTH: 10 }, "Balanced limits");
assert.equal(WINDOW_SECONDS, 60);
assert.deepEqual(limitsFrom({}), { NORMAL: 240, EXPENSIVE: 20, AUTH: 10 });
assert.deepEqual(limitsFrom({ VFIRM_RATE_NORMAL: "500", VFIRM_RATE_EXPENSIVE: "abc", VFIRM_RATE_AUTH: "-3" }), { NORMAL: 500, EXPENSIVE: 20, AUTH: 10 }, "bad values fall back");
for (const [method, path, cls] of [
  ["GET", "/health", "EXEMPT"], ["OPTIONS", "/clients", "EXEMPT"], ["POST", "/automation/tick", "EXEMPT"], ["GET", "/mvp/store", "EXEMPT"], ["POST", "/edcs/sync", "EXEMPT"], ["POST", "/edcs/connector/heartbeat", "EXEMPT"],
  ["POST", "/auth/signup-firm", "AUTH"], ["POST", "/auth/invite", "AUTH"], ["POST", "/pilot/users/invite", "AUTH"], ["POST", "/pilot/users/revoke", "AUTH"],
  ["POST", "/awia/virtual-staff/workdesk-item/run-skill", "EXPENSIVE"], ["POST", "/files/upload", "EXPENSIVE"], ["POST", "/edcs/files/upload", "EXPENSIVE"], ["POST", "/edcs/register-imports", "EXPENSIVE"],
  ["POST", "/passports", "EXPENSIVE"], ["POST", "/passports/preview", "EXPENSIVE"], ["GET", "/passports/abc/download", "EXPENSIVE"], ["GET", "/data-protection/export-package", "EXPENSIVE"],
  ["POST", "/standing/instructions/run-now", "EXPENSIVE"], ["POST", "/edcs/graph/sync", "EXPENSIVE"],
  ["GET", "/dashboard/summary", "NORMAL"], ["GET", "/pilot/users", "NORMAL"], ["POST", "/clients", "NORMAL"], ["GET", "/passports", "NORMAL"], ["POST", "/never/heard/of/it", "NORMAL"]
]) assert.equal(classify(method, path), cls, `${method} ${path}`);
assert.equal(rateLimitEnabled({ env: {}, enforced: true }), true, "on in production");
assert.equal(rateLimitEnabled({ env: {}, enforced: false }), false, "off for local development");
assert.equal(rateLimitEnabled({ env: { VFIRM_RATE_LIMIT: "on" }, enforced: false }), true);
assert.equal(rateLimitEnabled({ env: { VFIRM_RATE_LIMIT: "off" }, enforced: true }), false);
// who is counted
const k1 = rateKey({ method: "GET", pathname: "/clients", actorId: "u1", ip: "1.2.3.4", env: {} });
assert.deepEqual(k1, { cls: "NORMAL", limit: 240, key: "u:u1|NORMAL" });
assert.equal(rateKey({ method: "GET", pathname: "/clients", actorId: null, ip: "1.2.3.4", env: {} }).key, "ip:1.2.3.4|NORMAL", "before sign-in: by address");
assert.equal(rateKey({ method: "POST", pathname: "/auth/invite", actorId: "u1", ip: "1.2.3.4", env: {} }).key, "ip:1.2.3.4|AUTH", "invite routes: always by address");
assert.equal(rateKey({ method: "GET", pathname: "/health", actorId: "u1", ip: "1.2.3.4", env: {} }), null);
assert.equal(rateKey({ method: "POST", pathname: "/files/upload", actorId: "u1", ip: "x", env: {} }).limit, 20);
// the address: forwarded headers are believed only behind a trusted proxy
assert.equal(clientIp({ headers: { "x-forwarded-for": "9.9.9.9, 10.0.0.1" }, socketAddress: "127.0.0.1", env: {} }), "127.0.0.1", "not trusted: socket address");
assert.equal(clientIp({ headers: { "x-forwarded-for": "9.9.9.9, 10.0.0.1" }, socketAddress: "127.0.0.1", env: { VERCEL: "1" } }), "9.9.9.9");
assert.equal(clientIp({ headers: { "x-forwarded-for": "8.8.8.8" }, socketAddress: "127.0.0.1", env: { VFIRM_TRUST_PROXY: "true" } }), "8.8.8.8");
assert.equal(clientIp({ headers: {}, socketAddress: "", env: {} }), "unknown");
// windows
assert.equal(windowStart(120_000), 120);
assert.equal(windowStart(179_999), 120);
assert.equal(windowStart(180_000), 180);
assert.equal(retryAfterSeconds(120_000), 60);
assert.equal(retryAfterSeconds(179_000), 1);
console.log("part 1 ok");

// ============================ part 2: the real API ============================
function startApi() {
  api = spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: root, stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env, VFIRM_API_PORT: String(apiPort),
      ...(DB ? {} : { VFIRM_STORE_PATH: join(tmp, "store.json") }),
      DATABASE_URL: DB, VFIRM_STORE_BACKEND: DB ? "postgres" : "json",
      VFIRM_FILE_STORAGE_BACKEND: "local", VFIRM_FILE_LOCAL_DIR: join(tmp, "files"), VFIRM_AUTOMATION_AS_OF: "2026-10-12", VFIRM_SERVICE_TOKEN: SERVICE_TOKEN,
      VFIRM_RATE_LIMIT: "on", VFIRM_RATE_NORMAL: "15", VFIRM_RATE_EXPENSIVE: "3", VFIRM_RATE_AUTH: "2"
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
// A fixed window can roll over in the middle of a burst; start each burst early in a window so counts are exact.
async function freshWindow() {
  while (60 - (Math.floor(Date.now() / 1000) % 60) < 12) await new Promise((resolve) => setTimeout(resolve, 500));
}
async function raw(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${apiBase}${path}`, { method, headers: { "content-type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined });
  const json = await response.json().catch(() => ({}));
  return { response, json, status: response.status };
}
async function post(path, body, headers = {}) {
  const r = await raw(path, { method: "POST", body, headers });
  assert.equal(r.response.ok, true, `${path} HTTP ${r.status}: ${JSON.stringify(r.json)}`);
  return r.json.data;
}
const headersFor = (actorId, firm, role = "principal") => ({ "x-vfirm-actor-id": actorId, "x-vfirm-tenant-id": firm.tenant_id, "x-vfirm-firm-id": firm.id, "x-vfirm-role": role });
let pool = null;
try {
  startApi();
  await waitForHealth();
  if (DB) pool = new pg.Pool({ connectionString: DB, max: 2 });

  // set-up calls carry no actor, so they count against this machine's address and stay well under 15
  const tenant = await post("/tenants", { name: `RL Tenant ${Date.now()}` });
  const seed = await post("/firms", { tenant_id: tenant.id, name: `RL Firm ${Date.now()}`, principal_name: "RL Owner" });
  const firm = seed.firm;
  const A = headersFor(seed.principal_actor.id, firm);
  const B = headersFor(randomUUID(), firm);
  const route = `/workspace/active-summary?tenant_id=${firm.tenant_id}&firm_id=${firm.id}`;

  // 1. normal calls: user A is stopped after 15 a minute, with a retry time
  await freshWindow();
  const seen = [];
  let blocked = null;
  for (let i = 0; i < 30 && !blocked; i += 1) {
    const r = await raw(route, { headers: A });
    seen.push(r.status);
    if (r.status === 429) blocked = r;
  }
  assert.ok(blocked, "user A must hit the limit");
  assert.equal(seen.filter((s) => s !== 429).length, 15, `exactly 15 normal calls allowed, got ${JSON.stringify(seen)}`);
  assert.equal(blocked.json.ok, false);
  assert.equal(blocked.json.error.code, "RATE_LIMITED");
  assert.equal(blocked.json.error.limit, 15);
  const retry = Number(blocked.response.headers.get("retry-after"));
  assert.ok(retry >= 1 && retry <= 60, `retry-after ${retry}`);
  assert.equal(blocked.json.error.retry_after_seconds, retry);
  assert.match(blocked.json.error.message, /Try again in/);
  // still blocked on the next call, but another user, and the exempt routes, are not affected
  assert.equal((await raw(route, { headers: A })).status, 429);
  assert.notEqual((await raw(route, { headers: B })).status, 429, "user B has their own count");
  for (let i = 0; i < 20; i += 1) assert.equal((await raw("/health", { headers: A })).status, 200, "health is never counted");
  const tickR = await fetch(`${apiBase}/automation/tick?tenant_id=${firm.tenant_id}&firm_id=${firm.id}`, { method: "POST", headers: { "content-type": "application/json", "x-vfirm-service-token": SERVICE_TOKEN }, body: "{}" });
  assert.notEqual(tickR.status, 429, "the service tick is never counted");

  // 2. expensive actions: 3 uploads a minute
  await freshWindow();
  const upload = async (h, name) => (await fetch(`${apiBase}/files/upload?tenant_id=${firm.tenant_id}&firm_id=${firm.id}&filename=${name}`, { method: "POST", headers: { "content-type": "text/csv", ...h }, body: Buffer.from("date,description,amount\n2026-09-03,Sample,100.00\n") })).status;
  const U = headersFor(randomUUID(), firm);
  const ups = [];
  for (let i = 0; i < 6; i += 1) ups.push(await upload(U, `r${i}.csv`));
  assert.equal(ups.filter((s) => s !== 429).length, 3, `3 expensive calls allowed, got ${JSON.stringify(ups)}`);
  assert.equal(ups.slice(3).every((s) => s === 429), true);
  // the normal count for the same user is separate: they can still read
  assert.notEqual((await raw(route, { headers: U })).status, 429, "expensive and normal counts are separate");

  // 3. invitations / sign-in: 2 a minute per address, even for the owner
  await freshWindow();
  const inv = [];
  for (let i = 0; i < 4; i += 1) inv.push((await raw("/pilot/users/invite", { method: "POST", body: { tenant_id: firm.tenant_id, firm_id: firm.id, email: `rl-${i}-${Date.now()}@example.com`, pilot_role: "MEMBER" }, headers: A })).status);
  assert.equal(inv.filter((s) => s !== 429).length, 2, `2 invite calls allowed, got ${JSON.stringify(inv)}`);
  assert.equal(inv[2], 429);
  const signup = await raw("/auth/signup-firm", { method: "POST", body: {}, headers: {} });
  assert.equal(signup.status, 429, "same address, same sign-in count");

  if (DB) {
    // 4. the counters live in Postgres and are shared
    const rows = (await pool.query("select key, count from rate_limits order by count desc")).rows;
    assert.ok(rows.some((r) => r.key === `u:${seed.principal_actor.id}|NORMAL` && Number(r.count) >= 15), `counter row for user A: ${JSON.stringify(rows.slice(0, 5))}`);
    assert.ok(rows.some((r) => r.key.endsWith("|AUTH")), "an AUTH counter row exists");
    // 5. a broken counter table never blocks real work
    await pool.query("alter table rate_limits rename to rate_limits_parked");
    try {
      const C = headersFor(randomUUID(), firm);
      await freshWindow();
      for (let i = 0; i < 15; i += 1) assert.notEqual((await raw(route, { headers: C })).status, 429, "counter fault must not block real work (falls back to a per-copy memory count)");
      assert.equal((await raw(route, { headers: C })).status, 429, "the memory fallback still holds the same limit on this copy");
    } finally {
      await pool.query("alter table rate_limits_parked rename to rate_limits");
    }
  }

  console.log(JSON.stringify({
    status: "pass", sprint: "RA-rate-limit", backend: DB ? "postgres" : "json",
    checked: [
      "route classes: normal 240, expensive 20, sign-in/invite 10 a minute (Balanced); health, browser pre-flight and token routes are never counted",
      "counted per signed-in user, per address before sign-in; forwarded headers trusted only behind Vercel or VFIRM_TRUST_PROXY",
      "real API: over the limit returns HTTP 429 RATE_LIMITED with Retry-After; another user and the exempt routes are unaffected; expensive and normal counts are separate",
      DB ? "Postgres: counters live in rate_limits; renaming the table away (a counter fault) does not block any request" : "JSON backend: counted in memory"
    ]
  }));
} finally {
  if (pool) await pool.end().catch(() => {});
  await stopApi();
  await rm(tmp, { recursive: true, force: true });
}
