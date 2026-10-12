import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { INVITE_ROLES, MEMBER_WRITES, OBSERVER_POSTS, OWN_CREDENTIAL, OWNER_READ_PREFIXES, evaluateRolePolicy, inviteRoleError, requiredLevel } from "../apps/api/src/route-role-policy.mjs";

// RA (ADR-115, 2026-10-12) -- role audit.
//
// Part 1 is pure: every write route in the server's route table is either on the member list or owner-only (nothing is
// unclassified, nothing on the member list is stale), the role matrix gives the expected answer, and unknown routes default to owner-only.
// Part 2 drives the real API with owner, member and observer callers: members do daily work and are refused on money,
// people, settings and the owner's pages; observers cannot write; invitations only carry known roles.
// Local JSON backend by default; set VFIRM_SMOKE_DATABASE_URL for a fresh, fully-migrated Postgres.

const root = process.cwd();
const SERVICE_TOKEN = "smoke-service-token-ra";
const tmp = await mkdtemp(join(tmpdir(), "vfirm-ra-"));
const apiPort = 3190;
const apiBase = `http://127.0.0.1:${apiPort}`;
let api = null;
let logs = "";

// ============================ part 1: the policy ============================
const server = await readFile(join(root, "apps/api/src/server.mjs"), "utf8");
const tableRoutes = [...server.matchAll(/^\s*\["(POST|PUT|PATCH|DELETE) ([^"]+)"/gm)].map((m) => `${m[1]} ${m[2]}`);
const literalPosts = [...server.matchAll(/req\.method === "POST" && url\.pathname === "([^"]+)"/g)].map((m) => `POST ${m[1]}`);
const allWrites = new Set([...tableRoutes, ...literalPosts]);
assert.ok(allWrites.size >= 200, `found ${allWrites.size} write routes`);
for (const key of MEMBER_WRITES) assert.ok(allWrites.has(key), `member list names a route that does not exist: ${key}`);
for (const key of OWN_CREDENTIAL) assert.ok(allWrites.has(key), `own-credential list names a route that does not exist: ${key}`);
for (const key of OBSERVER_POSTS) assert.ok(MEMBER_WRITES.has(key), `observer-allowed POST must be a member route: ${key}`);
const owner = { role: "OWNER" }, principal = { role: "principal" }, member = { role: "MEMBER" }, operator = { role: "PILOT_OPERATOR" }, observer = { role: "PILOT_OBSERVER" }, firmAdmin = { role: "FIRM_ADMIN" };
const call = (key, actor) => { const [method, pathname] = [key.slice(0, key.indexOf(" ")), key.slice(key.indexOf(" ") + 1)]; return evaluateRolePolicy({ method, pathname, actor }); };
let ownerOnly = 0, memberRoutes = 0, open = 0;
for (const key of allWrites) {
  const [method, pathname] = [key.slice(0, key.indexOf(" ")), key.slice(key.indexOf(" ") + 1)];
  const level = requiredLevel(method, pathname);
  if (level === "OPEN") { open += 1; assert.equal(call(key, member).allow, true, key); continue; }
  assert.equal(call(key, owner).allow, true, `owner must be allowed ${key}`);
  assert.equal(call(key, principal).allow, true, `principal must be allowed ${key}`);
  if (level === "MEMBER") {
    memberRoutes += 1;
    assert.equal(call(key, member).allow, true, `member must be allowed ${key}`);
    assert.equal(call(key, operator).allow, true, `operator must be allowed ${key}`);
    assert.equal(call(key, observer).allow, OBSERVER_POSTS.has(key), `observer on ${key}`);
  } else {
    ownerOnly += 1;
    for (const actor of [member, operator, firmAdmin]) assert.equal(call(key, actor).code, "EDCS_OWNER_REQUIRED", `${actor.role} must be refused ${key}`);
    assert.equal(call(key, observer).allow, false, `observer must be refused ${key}`);
  }
}
assert.equal(ownerOnly + memberRoutes + open, allWrites.size);
assert.ok(ownerOnly > memberRoutes, "most write routes are owner-only; members get a short daily-work list");
// the sensitive ones named in the audit, spelled out so a change to the list is deliberate
for (const key of ["POST /invoices", "POST /invoices/issue", "POST /payments/record", "POST /pilot/users/invite", "POST /pilot/users/activate", "POST /pilot/users/revoke", "POST /auth/invite", "POST /accounts/expenses/approve", "POST /proposals/approve", "POST /proposals/accept", "POST /quotation-cases/approve", "POST /quotation-cases/issue", "POST /deliverables/issue", "POST /subscriptions/packages", "POST /billing/readiness-reviews", "POST /awia/virtual-staff/hire-worker", "POST /awia/virtual-staff/lifecycle", "POST /einvoice/supplier", "POST /trust-ladder/stage", "POST /passports", "POST /standing/instructions", "POST /edcs/connection", "POST /edcs/connectors", "POST /edcs/company", "POST /automation/rules", "POST /internal/purge-test-firm"]) {
  assert.equal(requiredLevel("POST", key.slice(5)), "OWNER", key);
}
for (const key of ["POST /files/upload", "POST /work-requests", "POST /documents", "POST /awia/virtual-staff/workdesk-item/run-skill", "POST /clients"]) assert.equal(requiredLevel("POST", key.slice(5)), "MEMBER", key);
// unknown routes are owner-only (safe by default)
assert.equal(requiredLevel("POST", "/brand-new/route"), "OWNER");
assert.equal(requiredLevel("DELETE", "/anything"), "OWNER");
assert.equal(call("POST /brand-new/route", member).code, "EDCS_OWNER_REQUIRED");
// reads
for (const path of ["/data-protection/export-package", "/audit-events", "/scorecards", "/trust-ladder", "/einvoice/readiness", "/brief/today", "/passports/abc/download", "/accounts/cash-snapshot", "/pilot/users", "/standing/instructions"]) assert.equal(call(`GET ${path}`, member).code, "EDCS_OWNER_REQUIRED", path);
for (const path of ["/work-requests/request-types", "/dashboard/summary", "/workspace/active-summary", "/clients", "/documents"]) { assert.equal(call(`GET ${path}`, member).allow, true, path); assert.equal(call(`GET ${path}`, observer).allow, true, `observer reads ${path}`); }
assert.equal(call("GET /health", observer).allow, true);
// no actor: the route does its own check; observer role is case and dash tolerant
assert.equal(evaluateRolePolicy({ method: "POST", pathname: "/invoices", actor: null }).allow, true);
assert.equal(call("POST /work-requests", { role: "Pilot-Observer" }).code, "OBSERVER_READ_ONLY");
assert.equal(call("POST /invoices", { role: "admin" }).allow, true, "admin counts as owner (existing owner roles)");
// invitations
for (const ok of [undefined, "", "MEMBER", "member", "PILOT_OBSERVER", "OWNER", "Pilot Operator"]) assert.equal(inviteRoleError(ok), null, String(ok));
for (const bad of ["GOD", "root", "super_admin", "OWNER; DROP", "tenant_admin"]) assert.ok(inviteRoleError(bad), bad);
assert.deepEqual(INVITE_ROLES.slice(0, 1), ["OWNER"]);
assert.ok(OWNER_READ_PREFIXES.includes("/audit-events"));
console.log(`part 1 ok (${allWrites.size} write routes: ${ownerOnly} owner-only, ${memberRoutes} member, ${open} own-credential)`);

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
  const tenant = await post("/tenants", { name: `RA ${label} Tenant ${stamp}-${firmCounter}` });
  const seed = await post("/firms", { tenant_id: tenant.id, name: `RA ${label} Firm ${stamp}-${firmCounter}`, principal_name: `${label} Owner` });
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
const tick = async (ctx) => { const { response, json } = await tickWith(SERVICE_TOKEN, ctx.s); assert.equal(response.ok, true, JSON.stringify(json)); return json.data.standing; };
async function hireStaff(ctx) {
  await post("/ops/awia-package-assignment", { ...ctx.s, package_code: "HIRE_ME" }, ctx.h);
  const hire = (role_code, display_name, position_id) => post("/awia/virtual-staff/hire-worker", { ...ctx.s, role_code, display_name, position_id }, ctx.h);
  const bookkeeper = await hire("FAO", "Bookkeeper", "bookkeeper");
  const sales = await hire("SAO", "Sales Coordinator", "sales_coordinator");
  for (const worker of [bookkeeper, sales]) await post("/awia/virtual-staff/lifecycle", { ...ctx.s, staff_code: worker.staff_code, to_state: "ACTIVE" }, ctx.h);
  return { bookkeeper, sales };
}
const roleH = (ctx, role) => ({ ...ctx.h, "x-vfirm-role": role });
const CSVTXT = "date,description,amount\n2026-09-03,Sample,100.00\n";
try {
  startApi("2026-10-12");
  await waitForHealth();
  const A = await newFirm("Alpha");
  const B = await newFirm("Bravo");
  const OWN = A.h, MEM = roleH(A, "MEMBER"), OPS = roleH(A, "PILOT_OPERATOR"), OBS = roleH(A, "PILOT_OBSERVER");
  const upload = async (h, name) => { const r = await fetch(`${apiBase}/files/upload?${q(A)}&filename=${name}`, { method: "POST", headers: { "content-type": "text/csv", ...h }, body: Buffer.from(CSVTXT) }); return { status: r.status, json: await r.json() }; };

  // members do daily work
  const up = await upload(MEM, "m1.csv");
  assert.equal(up.status, 201, JSON.stringify(up.json));
  const wr = await post("/work-requests", { ...A.s, title: "Member request", request_type_id: "bank_reconciliation", file_ids: [up.json.data.id], file_roles: { [up.json.data.id]: "bank_statement" } }, MEM);
  assert.ok(wr.work_request.id);
  await post("/clients", { ...A.s, name: `Member Client ${stamp}`, client_type: "ORGANIZATION" }, OPS);
  assert.ok((await get(`/work-requests/request-types?${q(A)}`, MEM)));

  // members are refused money, people, settings and the owner's pages
  for (const [method, path, body] of [
    ["POST", "/invoices", { ...A.s, relationship_id: "x" }], ["POST", "/payments/record", { ...A.s }], ["POST", "/pilot/users/invite", { ...A.s, email: "x@example.com" }],
    ["POST", "/pilot/users/revoke", { ...A.s }], ["POST", "/einvoice/supplier", { ...A.s, sst: "NA" }], ["POST", "/trust-ladder/stage", { ...A.s, staff_code: "X", skill_id: "Y", to: "SHADOW" }],
    ["POST", "/standing/instructions", { ...A.s }], ["POST", "/edcs/connection", { ...A.s, company_code: "NEX" }], ["POST", "/awia/virtual-staff/hire-worker", { ...A.s, role_code: "FAO" }],
    ["POST", "/accounts/expenses/approve", { ...A.s }], ["POST", "/passports", { ...A.s }], ["POST", "/automation/rules", { ...A.s }],
    ["POST", "/internal/purge-test-firm", { ...A.s }], ["POST", "/brand-new/route", { ...A.s }]
  ]) {
    for (const h of [MEM, OPS]) await fails(method, path, 403, "EDCS_OWNER_REQUIRED", body, h);
  }
  for (const path of ["/audit-events", "/scorecards", "/trust-ladder", "/einvoice/readiness", "/brief/today", "/accounts/cash-snapshot", "/data-protection/export-package"]) {
    await fails("GET", `${path}${path.includes("?") ? "&" : "?"}${q(A)}`, 403, "EDCS_OWNER_REQUIRED", undefined, MEM);
  }
  // the owner still can
  await get(`/audit-events?${q(A)}`, OWN);
  await get(`/trust-ladder?${q(A)}`, OWN);
  await get(`/scorecards?${q(A)}`, OWN);

  // observers read but cannot write
  await get(`/work-requests/request-types?${q(A)}`, OBS);
  assert.equal((await upload(OBS, "o1.csv")).status, 403);
  await fails("POST", "/work-requests", 403, "OBSERVER_READ_ONLY", { ...A.s, title: "x", request_type_id: "bank_reconciliation" }, OBS);
  await fails("POST", "/clients", 403, "OBSERVER_READ_ONLY", { ...A.s, name: "Nope", client_type: "ORGANIZATION" }, OBS);
  await fails("POST", "/invoices", 403, "OBSERVER_READ_ONLY", { ...A.s }, OBS);

  // invitations: owner only, known roles only
  await fails("POST", "/pilot/users/invite", 403, "EDCS_OWNER_REQUIRED", { ...A.s, email: `m-${stamp}@example.com`, pilot_role: "OWNER" }, MEM);
  await fails("POST", "/pilot/users/invite", 400, "VALIDATION_ERROR", { ...A.s, email: `g-${stamp}@example.com`, pilot_role: "GOD" }, OWN);
  const invited = await post("/pilot/users/invite", { ...A.s, email: `ok-${stamp}@example.com`, pilot_role: "MEMBER" }, OWN);
  assert.equal(invited.pilot_role, "MEMBER");
  await fails("POST", "/auth/invite", 403, "EDCS_OWNER_REQUIRED", { ...A.s, email: "z@example.com", role: "OWNER" }, MEM);

  // another firm: a member of Bravo cannot touch Alpha, and Alpha's owner role means nothing in Bravo
  await fails("GET", `/workspace/active-summary?${q(A)}`, 403, null, undefined, roleH(B, "MEMBER"));
  await fails("POST", "/einvoice/supplier", 403, null, { ...A.s, sst: "NA" }, B.h);

  console.log(JSON.stringify({
    status: "pass", sprint: "RA", backend: process.env.VFIRM_SMOKE_DATABASE_URL ? "postgres" : "json",
    checked: [
      "every write route is classified: a short member list, the rest owner-only, nothing stale, unknown routes default to owner-only",
      "role matrix: owner and principal allowed everywhere; members and operators only on daily-work routes; observers read-only",
      "real API: members upload, make requests and clients; refused invoices, payments, invites, settings, approvals, the owner's pages and exports",
      "observers can read and cannot write; invitations are owner-only and carry only known roles; another firm is still isolated"
    ]
  }));
} finally {
  await stopApi();
  await rm(tmp, { recursive: true, force: true });
}
