import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { evaluateRequestGate } from "../apps/api/src/request-auth-gate.mjs";

// Production-auth sprint (ADR-103): the single gate in front of every route.
// JSON store only; forces an empty DATABASE_URL, so it never touches a database.

const actor = (tenant_id, firm_id) => ({ ok: true, actor: { tenant_id, firm_id } });
const gate = (o) => evaluateRequestGate({ enforced: true, method: "GET", pathname: "/dashboard/summary", ...o });

// ---- pure rule ----
assert.equal(evaluateRequestGate({ enforced: false, method: "POST", pathname: "/clients" }).allow, true, "not enforced: open as before");
assert.equal(gate({}).status, 401, "no auth");
assert.equal(gate({ auth: { ok: false } }).code, "AUTH_INVALID");
assert.equal(gate({ auth: { ok: true } }).code, "NOT_ONBOARDED", "verified but not linked to a firm");
assert.equal(gate({ auth: actor("t1", "f1") }).allow, true, "onboarded user");
assert.equal(gate({ auth: actor("t1", "f1"), query: { tenant_id: "t2" } }).status, 403, "other tenant in the query");
assert.equal(gate({ auth: actor("t1", "f1"), query: { tenant_id: "t1", firm_id: "f2" } }).status, 403, "other firm in the query");
assert.equal(gate({ auth: actor("t1", "f1"), query: { tenant_id: "t1", firm_id: "f1" } }).allow, true);
assert.equal(gate({ pathname: "/health" }).allow, true, "health is public");
assert.equal(gate({ pathname: "/auth/provider/config" }).allow, true);
assert.equal(gate({ method: "POST", pathname: "/automation/tick" }).allow, true, "service-token route is checked by its own guard");
assert.equal(gate({ method: "POST", pathname: "/edcs/sync" }).status, 401, "connector route needs a token header");
assert.equal(gate({ method: "POST", pathname: "/edcs/sync", hasConnectorToken: true }).allow, true);
assert.equal(gate({ method: "POST", pathname: "/tenants", auth: actor("t1", "f1") }).code, "DEV_ONLY_ROUTE", "dev-only route, even signed in");
assert.equal(gate({ method: "POST", pathname: "/firms", auth: actor("t1", "f1") }).status, 403);
assert.equal(gate({ method: "POST", pathname: "/auth/signup-firm", auth: { ok: true } }).allow, true, "sign-up needs only a verified session");
assert.equal(gate({ method: "POST", pathname: "/auth/signup-firm" }).status, 401);

// ---- over HTTP ----
const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-pa-gate-"));
const children = [];
let logs = "";
function start(name, port, env) {
  const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: root,
    env: { ...process.env, VFIRM_API_PORT: String(port), VFIRM_STORE_BACKEND: "json", DATABASE_URL: "", VFIRM_DATABASE_URL: "", VFIRM_SMOKE_DATABASE_URL: "", VFIRM_STORE_PATH: join(tmp, `${name}.json`), ...env },
    stdio: ["ignore", "pipe", "pipe"]
  });
  children.push(child);
  child.stdout.on("data", (c) => { logs += `[${name}] ${c}`; });
  child.stderr.on("data", (c) => { logs += `[${name}] ${c}`; });
}
async function waitForHealth(base) {
  const started = Date.now();
  while (Date.now() - started < 20000) {
    try { if ((await fetch(`${base}/health`)).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`API did not start. Logs:\n${logs}`);
}
const call = async (base, method, path, { headers = {}, body } = {}) => {
  const response = await fetch(`${base}${path}`, { method, headers: { "content-type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, json: await response.json().catch(() => ({})) };
};

try {
  const guarded = "http://127.0.0.1:3181";
  const open = "http://127.0.0.1:3182";
  start("guarded", 3181, { VFIRM_STORE_AUTH: "required", VFIRM_SERVICE_TOKEN: "smoke-service-token" });
  start("open", 3182, { VFIRM_STORE_AUTH: "", VFIRM_SERVICE_TOKEN: "" });
  await Promise.all([waitForHealth(guarded), waitForHealth(open)]);

  const devHeaders = { "x-vfirm-actor-id": "someone", "x-vfirm-tenant-id": "t1", "x-vfirm-firm-id": "f1", "x-vfirm-role": "principal" };
  let r = await call(guarded, "GET", "/dashboard/summary?tenant_id=t1&firm_id=f1", { headers: devHeaders });
  assert.equal(r.status, 401, "read with only client-set headers is refused");
  r = await call(guarded, "POST", "/clients", { headers: devHeaders, body: { tenant_id: "t1", firm_id: "f1", name: "X" } });
  assert.equal(r.status, 401, "command with only client-set headers is refused (no system-actor fallback)");
  r = await call(guarded, "POST", "/clients", { body: { tenant_id: "t1", firm_id: "f1", name: "X" } });
  assert.equal(r.status, 401, "command with no credentials is refused");
  r = await call(guarded, "POST", "/clients", { headers: { authorization: "Bearer not-a-real-token" }, body: { tenant_id: "t1", firm_id: "f1", name: "X" } });
  assert.equal(r.status, 401, "bad Bearer token is refused");
  r = await call(guarded, "POST", "/tenants", { headers: devHeaders, body: { name: "Rogue" } });
  assert.equal(r.status, 403, "tenant creation is dev only"); assert.equal(r.json.error.code, "DEV_ONLY_ROUTE");
  r = await call(guarded, "POST", "/firms", { headers: devHeaders, body: { tenant_id: "t1", name: "Rogue" } });
  assert.equal(r.status, 403, "firm creation is dev only");
  r = await call(guarded, "POST", "/auth/signup-firm", { body: { firm_name: "A", principal_name: "B" } });
  assert.equal(r.status, 401, "sign-up needs a session");
  r = await call(guarded, "POST", "/edcs/sync", { body: {} });
  assert.equal(r.status, 401); assert.equal(r.json.error.code, "AUTH_REQUIRED", "connector route without token is stopped at the gate");
  r = await call(guarded, "POST", "/edcs/sync", { headers: { "x-vfirm-connector-token": "vfc_not_real" }, body: {} });
  assert.notEqual(r.json.error?.code, "AUTH_REQUIRED", "with a token header the gate lets it through to the connector's own check");
  r = await call(guarded, "POST", "/automation/tick", { body: {} });
  assert.ok([401, 503].includes(r.status), "tick without the service token is refused by its own check");
  r = await call(guarded, "POST", "/automation/tick", { headers: { "x-vfirm-service-token": "smoke-service-token" }, body: {} });
  assert.equal(r.status, 200, "tick with the service token runs");
  r = await call(guarded, "GET", "/health");
  assert.equal(r.status, 200, "health stays public");

  r = await call(open, "POST", "/tenants", { body: { name: "Local Dev Tenant" } });
  assert.equal(r.status, 201, "local server: dev routes still work");
  r = await call(open, "GET", "/dashboard/summary");
  assert.notEqual(r.status, 401, "local server: no credentials needed");

  console.log(JSON.stringify({ status: "pass", sprint: "production-auth", adr: "ADR-103", backend: "json (no database touched)", checked: ["pure gate rule", "header-only and no-credential reads and commands refused", "bad Bearer refused", "dev-only routes closed", "connector and service-token routes keep their own credential", "local server unchanged"] }, null, 2));
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  for (const child of children) if (child.exitCode === null && !child.killed) child.kill();
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await rm(tmp, { recursive: true, force: true });
}
