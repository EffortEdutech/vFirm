import assert from "node:assert/strict";
import { once } from "node:events";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { REGISTER_COLUMNS } from "../packages/core-domain/src/edcs-register.mjs";
import { decryptSecret, encryptSecret } from "../apps/api/src/secret-box.mjs";
import { cleanFolderPath } from "../apps/api/src/edcs-graph-service.mjs";

// CE-S7 (ADR-106, 2026-10-08) -- Connected EDCS: the Microsoft 365 (OneDrive / SharePoint) cloud adapter.
//
// Drives the real API over HTTP against a SIMULATED Microsoft (a small fake Graph + sign-in server in this
// script) and proves the sprint's acceptance checks:
//   1. a sync from the (simulated) tenant folder gives the same result as uploading the same register
//   2. revoking consent stops the sync, and the console state says so
//   3. access is limited to the consented folder: nothing outside it is downloaded or filed
// plus: vFirm only ever READS (every call to Microsoft is a GET, except the sign-in), the app secret is stored
// encrypted and never listed or exported, the delta query reads only changes, a lost change token restarts
// safely, a passing Microsoft error does not disconnect, HR files stay metadata-only, the scheduled tick
// polls, disconnect erases the secret, owner-only, firm isolation, audit events.
// Local JSON backend by default; set VFIRM_SMOKE_DATABASE_URL for a fresh, fully-migrated Postgres.

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-ce-s7-"));
const apiPort = 3178;
const fakePort = 3179;
const apiBase = `http://127.0.0.1:${apiPort}`;
const fakeBase = `http://127.0.0.1:${fakePort}`;
const SERVICE_TOKEN = "smoke-service-token-ce-s7-0123456789";
const SECRET_KEY = createHash("sha256").update("ce-s7-smoke-key").digest("base64");
const APP_SECRET = "Sm0ke~App~Secret~Value~123456"; // the (fake) Entra client secret value
const MS_TENANT = "11111111-2222-4333-8444-555555555555";
const CLIENT_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const DRIVE = "b!smokeDriveId0001";
const children = [];
let logs = "";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");

// ---------------- the simulated Microsoft ----------------

const fake = {
  secret: APP_SECRET,
  consentRevoked: false, // the admin removed the app's access to the site: Graph answers 403
  failNext: 0,           // answer this many Graph calls with 503
  expireDelta: false,    // answer the next delta call with 410 Gone
  omitPaths: false,      // delta items come without parentReference.path (as real Graph often does)
  clock: 1,
  items: new Map(),      // id -> { id, name, parent, folder, content, eTag, changed, versions }
  log: [],               // { method, path }
  downloads: [],         // item ids downloaded
  deltaRequests: []      // [item count returned]
};
let nextId = 1;
function addFolder(path) {
  let parent = "root";
  let built = "";
  for (const name of path.split("/")) {
    built = built ? `${built}/${name}` : name;
    const existing = [...fake.items.values()].find((item) => item.folder && item.path === built);
    if (existing) { parent = existing.id; continue; }
    const id = `FOLDER${String(nextId++).padStart(4, "0")}`;
    fake.items.set(id, { id, name, parent, folder: true, path: built, changed: fake.clock });
    parent = id;
  }
  return parent;
}
function putFile(path, content, { sha256Hash = true } = {}) {
  const parts = path.split("/");
  const name = parts.pop();
  const parent = parts.length ? addFolder(parts.join("/")) : "root";
  const existing = [...fake.items.values()].find((item) => !item.folder && item.parent === parent && item.name === name);
  fake.clock += 1;
  if (existing) {
    existing.content = content; existing.changed = fake.clock; existing.versions.unshift(`${existing.versions.length + 1}.0`); existing.eTag = `"${existing.versions.length}"`;
    return existing;
  }
  const id = `ITEM${String(nextId++).padStart(4, "0")}`;
  const item = { id, name, parent, folder: false, content, eTag: '"1"', changed: fake.clock, versions: ["1.0"], sha256Hash, path };
  fake.items.set(id, item);
  return item;
}
const pathOf = (item) => item.path ?? "";
function render(item, withPath = true) {
  const parentPath = item.path.includes("/") ? item.path.slice(0, item.path.lastIndexOf("/")) : "";
  const out = { id: item.id, name: item.name, eTag: item.eTag, lastModifiedDateTime: new Date(1760000000000 + item.changed * 1000).toISOString(), size: item.content?.length ?? 0 };
  if (item.folder) out.folder = { childCount: 1 };
  else out.file = { mimeType: "application/octet-stream", hashes: item.sha256Hash ? { sha256Hash: sha(item.content).toUpperCase() } : {} };
  out.parentReference = { id: item.parent, driveId: DRIVE, ...(withPath ? { path: `/drives/${DRIVE}/root:${parentPath ? `/${parentPath}` : ""}` } : {}) };
  return out;
}
const json = (res, status, body, headers = {}) => { res.writeHead(status, { "content-type": "application/json", ...headers }); res.end(JSON.stringify(body)); };

const fakeServer = createServer(async (req, res) => {
  const url = new URL(req.url, fakeBase);
  const path = decodeURIComponent(url.pathname);
  fake.log.push({ method: req.method, path });
  if (req.method === "POST" && /\/oauth2\/v2\.0\/token$/.test(path)) {
    let body = "";
    for await (const chunk of req) body += chunk;
    const form = new URLSearchParams(body);
    if (form.get("client_id") !== CLIENT_ID || form.get("client_secret") !== fake.secret || !path.includes(MS_TENANT)) return json(res, 401, { error: "invalid_client", error_description: "AADSTS7000215: Invalid client secret provided." });
    return json(res, 200, { access_token: "fake-access-token", token_type: "Bearer", expires_in: 3600 });
  }
  if (path.startsWith("/blob/")) { // pre-authenticated download target: must NOT receive the bearer token
    if (req.headers.authorization) return json(res, 400, { error: { message: "token leaked to the blob host" } });
    const item = fake.items.get(path.slice(6));
    res.writeHead(200, { "content-type": "application/octet-stream", "content-length": item.content.length });
    return res.end(item.content);
  }
  if (req.headers.authorization !== "Bearer fake-access-token") return json(res, 401, { error: { message: "no token" } });
  if (req.method !== "GET") return json(res, 405, { error: { message: "read-only app" } });
  if (fake.consentRevoked) return json(res, 403, { error: { code: "accessDenied", message: "Access denied" } });
  if (fake.failNext > 0) { fake.failNext -= 1; return json(res, 503, { error: { message: "Service unavailable" } }); }
  const v = `/v1.0/drives/${DRIVE}`;
  if (path.startsWith(`${v}/root:/`)) {
    const wanted = path.slice(`${v}/root:/`.length);
    const folder = [...fake.items.values()].find((item) => item.folder && item.path.toLowerCase() === wanted.toLowerCase());
    return folder ? json(res, 200, render(folder)) : json(res, 404, { error: { code: "itemNotFound", message: "not found" } });
  }
  if (path === `${v}/root/delta`) {
    if (fake.expireDelta) { fake.expireDelta = false; return json(res, 410, { error: { code: "resyncRequired" } }); }
    const since = Number(url.searchParams.get("token") ?? 0);
    const skip = Number(url.searchParams.get("skip") ?? 0);
    const changed = [...fake.items.values()].filter((item) => item.changed > since);
    const page = changed.slice(skip, skip + 4);
    if (skip + 4 < changed.length) return json(res, 200, { value: page.map((item) => render(item, !fake.omitPaths)), "@odata.nextLink": `${fakeBase}/v1.0/drives/${DRIVE}/root/delta?token=${since}&skip=${skip + 4}` });
    fake.deltaRequests.push(changed.length);
    return json(res, 200, { value: page.map((item) => render(item, !fake.omitPaths)), "@odata.deltaLink": `${fakeBase}/v1.0/drives/${DRIVE}/root/delta?token=${fake.clock}` });
  }
  const match = path.match(new RegExp(`^${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/items/([^/]+)(?:/(versions|content))?$`));
  if (match) {
    const item = fake.items.get(match[1]);
    if (!item) return json(res, 404, { error: { code: "itemNotFound" } });
    if (match[2] === "versions") return json(res, 200, { value: item.versions.map((id) => ({ id, lastModifiedDateTime: "2026-10-08T00:00:00Z" })) });
    if (match[2] === "content") { fake.downloads.push(item.id); res.writeHead(302, { location: `http://localhost:${fakePort}/blob/${item.id}` }); return res.end(); }
    return json(res, 200, render(item, true));
  }
  return json(res, 404, { error: { message: `fake graph: no route ${path}` } });
});
await new Promise((resolve) => fakeServer.listen(fakePort, "127.0.0.1", resolve));

// ---------------- the BizKick library (synthetic Nexa Office Supplies, company NEX) ----------------

const HEADER = REGISTER_COLUMNS.map((c) => c.header);
function row({ type = "QT", seq, rev = 0, status = "Issued", amount = 1000, owner = "Owner" }) {
  const hr = type === "LV";
  return ["NEX", type, 2026, seq, "", `R${rev}`, "2026-09-01", "2026-09-02", hr ? "Employee" : "Customer", `${hr ? "Employee" : "Customer"} ${seq}`, `${type} ${seq}`, hr ? "" : amount, hr ? "" : "MYR", status, owner, "2026-12-31", "", "", "", "", "", "2026-09-02", "", ""];
}
const toCsv = (rows) => ["BizKick EDCS", "", "", "", "", HEADER.join(","), ...rows.map((cells) => cells.join(","))].join("\n");
let rows = [row({ seq: 1 }), row({ seq: 2 }), row({ seq: 3 }), row({ seq: 4 }), row({ type: "LV", seq: 1 })];
const quote1 = Buffer.from("%PDF-1.4 quotation one body");
const leave1 = Buffer.from("%PDF-1.4 HR leave form: confidential salary details");
const outsideA = Buffer.from("%PDF-1.4 outside folder A");
const outsideB = Buffer.from("%PDF-1.4 sibling folder with a similar name");
const archive = Buffer.from("%PDF-1.4 inside BizKick but not a controlled folder");
const register = () => putFile("BizKick/EDCS/register.csv", Buffer.from(toCsv(rows)));
register();
putFile("BizKick/Sales/NEX-QT-2026-0001 Quotation.pdf", quote1);
putFile("BizKick/HR/NEX-LV-2026-0001 Leave.pdf", leave1, { sha256Hash: false }); // no hash from Microsoft -> fingerprinted in memory, never stored
putFile("BizKick/Sales/~$NEX-QT-2026-0001 Quotation.pdf", Buffer.from("lock"));
putFile("Other/NEX-QT-2026-0002 Quotation.pdf", outsideA);
putFile("BizKickExtra/Sales/NEX-QT-2026-0003 Quotation.pdf", outsideB);
putFile("BizKick/Archive/NEX-QT-2026-0004 Quotation.pdf", archive);
const outsideIds = () => [...fake.items.values()].filter((item) => !item.folder && !pathOf(item).startsWith("BizKick/")).map((item) => item.id);
const archiveId = () => [...fake.items.values()].find((item) => item.name.includes("0004")).id;

// ---------------- helpers ----------------

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
    try { const response = await fetch(url); const body = await response.json(); if (response.ok && body.ok !== false) return body; } catch {}
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${url}. Logs:\n${logs}`);
}
async function request(path, { method = "GET", body, headers = {}, raw } = {}) {
  const response = await fetch(`${apiBase}${path}`, { method, headers: { "content-type": "application/json", ...headers }, body: raw ?? (body ? JSON.stringify(body) : undefined) });
  const parsed = await response.json().catch(() => ({ ok: false, error: { message: "Non-JSON response" } }));
  return { response, json: parsed };
}
async function get(path, headers = {}) {
  const { response, json: body } = await request(path, { headers });
  assert.equal(response.ok, true, `${path} HTTP ${response.status}: ${JSON.stringify(body)}`);
  return body.data;
}
async function post(path, body, headers = {}) {
  const { response, json: parsed } = await request(path, { method: "POST", body, headers });
  assert.equal(response.ok, true, `${path} HTTP ${response.status}: ${JSON.stringify(parsed)}`);
  assert.equal(parsed.ok, true, `${path} failed: ${JSON.stringify(parsed)}`);
  return parsed.data;
}
async function fails(method, path, status, code, body, headers = {}) {
  const { response, json: parsed } = await request(path, { method, body, headers });
  assert.notEqual(parsed.ok, true, `${method} ${path} unexpectedly succeeded: ${JSON.stringify(parsed)}`);
  assert.equal(response.status, status, `${method} ${path}: expected HTTP ${status}, got ${response.status} ${JSON.stringify(parsed)}`);
  if (code) assert.equal(parsed.error?.code, code, `${method} ${path}: expected ${code}, got ${JSON.stringify(parsed.error)}`);
  return parsed;
}
const headersFor = (actorId, firm, role = "principal") => ({ "x-vfirm-actor-id": actorId, "x-vfirm-tenant-id": firm.tenant_id, "x-vfirm-firm-id": firm.id, "x-vfirm-role": role });
const stamp = Date.now();
let firmCounter = 0;
async function newFirm(label) {
  firmCounter += 1;
  const tenant = await post("/tenants", { name: `CE-S7 ${label} Tenant ${stamp}-${firmCounter}` });
  const seed = await post("/firms", { tenant_id: tenant.id, name: `CE-S7 ${label} Firm ${stamp}-${firmCounter}`, principal_name: `${label} Owner` });
  const firm = seed.firm;
  return { firm, h: headersFor(seed.principal_actor.id, firm), staff: headersFor(seed.principal_actor.id, firm, "PILOT_OPERATOR"), s: { tenant_id: firm.tenant_id, firm_id: firm.id }, label };
}
const q = (ctx) => `tenant_id=${ctx.s.tenant_id}&firm_id=${ctx.s.firm_id}`;
const volatile = /(_at$|^id$|run_id|run_number|tenant_id|firm_id|documents|fingerprint|actor|source|connector|file_id|updated)/;
const stable = (value) => JSON.parse(JSON.stringify(value, (key, v) => (volatile.test(key) ? undefined : v)));

const goodBody = (ctx, extra = {}) => ({
  ...ctx.s, ms_tenant_id: MS_TENANT, client_id: CLIENT_ID, client_secret: APP_SECRET, drive_id: DRIVE,
  folder_path: "BizKick", register_path: "EDCS/register.csv", controlled_folders: [{ path: "Sales", role: "PRIMARY" }, "HR"], ...extra
});
const nonGet = () => fake.log.filter((call) => call.method !== "GET" && !/\/oauth2\/v2\.0\/token$/.test(call.path));

try {
  // ---- pure checks ----
  assert.equal(decryptSecret(encryptSecret("hello secret", { VFIRM_SECRET_KEY: SECRET_KEY }), { VFIRM_SECRET_KEY: SECRET_KEY }), "hello secret");
  assert.notEqual(encryptSecret("x", { VFIRM_SECRET_KEY: SECRET_KEY }), encryptSecret("x", { VFIRM_SECRET_KEY: SECRET_KEY }), "a fresh IV each time");
  assert.throws(() => decryptSecret(encryptSecret("x", { VFIRM_SECRET_KEY: SECRET_KEY }), { VFIRM_SECRET_KEY: Buffer.alloc(32, 1).toString("base64") }), /could not be decrypted/);
  assert.throws(() => encryptSecret("x", {}), /VFIRM_SECRET_KEY/);
  assert.equal(cleanFolderPath("/BizKick//EDCS/"), "BizKick/EDCS");
  assert.equal(cleanFolderPath("BizKick\\EDCS"), "BizKick/EDCS");
  assert.equal(cleanFolderPath("../Other"), null);
  assert.equal(cleanFolderPath("A/../B"), null);
  assert.equal(cleanFolderPath(""), null);

  start("api", ["apps/api/src/server.mjs"], {
    VFIRM_API_PORT: String(apiPort),
    ...(process.env.VFIRM_SMOKE_DATABASE_URL ? {} : { VFIRM_STORE_PATH: join(tmp, "store.json") }),
    DATABASE_URL: process.env.VFIRM_SMOKE_DATABASE_URL ?? "",
    VFIRM_STORE_BACKEND: process.env.VFIRM_SMOKE_DATABASE_URL ? "postgres" : "json",
    VFIRM_FILE_STORAGE_BACKEND: "local", VFIRM_FILE_LOCAL_DIR: join(tmp, "files"),
    VFIRM_SECRET_KEY: SECRET_KEY, VFIRM_SERVICE_TOKEN: SERVICE_TOKEN,
    VFIRM_GRAPH_BASE_URL: `${fakeBase}/v1.0`, VFIRM_GRAPH_LOGIN_BASE_URL: fakeBase
  });
  await waitForJson(`${apiBase}/health`);

  const A = await newFirm("Alpha");
  const B = await newFirm("Bravo");
  const C = await newFirm("Charlie"); // never connects to Microsoft
  for (const ctx of [A, B, C]) await post("/edcs/connection", { ...ctx.s, company_code: "NEX", bizkick_version: "1.0" }, ctx.h);
  const noConn = await newFirm("Delta");

  // =============== connect: owner-only, validated, proven before it is saved ===============
  assert.equal((await get(`/edcs/graph?${q(A)}`, A.h)).graph, null, "nothing connected yet");
  assert.equal((await get(`/edcs/graph?${q(A)}`, A.h)).secret_key_configured, true);
  await fails("POST", "/edcs/graph/connect", 403, "EDCS_OWNER_REQUIRED", goodBody(A), A.staff);
  await fails("POST", "/edcs/graph/connect", 400, "VALIDATION_ERROR", { ...goodBody(A), client_id: "not-a-guid" }, A.h);
  await fails("POST", "/edcs/graph/connect", 400, "VALIDATION_ERROR", { ...goodBody(A), folder_path: "../Other" }, A.h);
  await fails("POST", "/edcs/graph/connect", 400, "VALIDATION_ERROR", { ...goodBody(A), folder_path: "" }, A.h);
  await fails("POST", "/edcs/graph/connect", 400, "VALIDATION_ERROR", { ...goodBody(A), client_secret: undefined }, A.h);
  await fails("POST", "/edcs/graph/connect", 409, "EDCS_NOT_CONNECTED", goodBody(noConn), noConn.h);
  await fails("POST", "/edcs/graph/connect", 400, "GRAPH_AUTH_FAILED", goodBody(A, { client_secret: "wrong-secret-value" }), A.h);
  await fails("POST", "/edcs/graph/connect", 404, "GRAPH_FOLDER_NOT_FOUND", goodBody(A, { folder_path: "NoSuchFolder" }), A.h);
  assert.equal((await get(`/edcs/graph?${q(A)}`, A.h)).graph, null, "a failed check saves nothing");

  const connected = await post("/edcs/graph/connect", goodBody(A), A.h);
  assert.equal(connected.graph.status, "ACTIVE");
  assert.equal(connected.graph.folder_path, "BizKick");
  assert.equal(connected.graph.secret_enc, undefined, "the encrypted secret is never returned");
  assert.equal(connected.graph.has_secret, true);
  assert.equal(JSON.stringify(connected).includes(APP_SECRET), false, "the plain secret is never returned");
  assert.equal(JSON.stringify(await get(`/edcs/graph?${q(A)}`, A.h)).includes(APP_SECRET), false);
  if (!process.env.VFIRM_SMOKE_DATABASE_URL) {
    const stored = await readFile(join(tmp, "store.json"), "utf8");
    assert.equal(stored.includes(APP_SECRET), false, "the app secret is not in the database in plain text");
    assert.ok(/"secret_enc":\s*"v1\./.test(stored), "it is stored encrypted");
  }

  // =============== first sync: register + files, delta, folder limit ===============
  await fails("POST", "/edcs/graph/sync", 403, "EDCS_OWNER_REQUIRED", { ...A.s }, A.staff);
  const first = await post("/edcs/graph/sync", { ...A.s }, A.h);
  assert.equal(first.skipped, false);
  assert.equal(first.summary.register, "COMPLETED");
  assert.equal(first.summary.register_counts.CREATED, 5);
  assert.deepEqual([first.summary.files.linked, first.summary.files.unmatched], [2, 0], "the Sales quotation and the HR leave form were filed");
  assert.ok(first.summary.files.skipped_outside_folder >= 3, "the outside / sibling / archive files were set aside");
  assert.ok(first.summary.files.skipped_other >= 1, "the Office lock file was skipped");
  for (const id of outsideIds()) assert.equal(fake.downloads.includes(id), false, "ACCEPTANCE 3: nothing outside the consented folder was downloaded");
  assert.equal(fake.downloads.includes(archiveId()), false, "a file in the consented folder but outside the controlled folders was not downloaded");
  const lockId = [...fake.items.values()].find((item) => item.name.startsWith("~$")).id;
  assert.equal(fake.downloads.includes(lockId), false, "the lock file was not downloaded");
  assert.deepEqual(nonGet(), [], "vFirm only ever READS Microsoft 365 (every call was a GET except the sign-in)");
  assert.equal(fake.log.some((call) => call.path.includes("/blob/")), true, "downloads follow Microsoft's redirect without sending the token to the blob host");

  const runsA = (await get(`/edcs/sync-runs?${q(A)}`, A.h)).runs;
  assert.equal(runsA.length, 1);
  assert.equal(runsA[0].source_kind, "CLOUD");
  assert.equal(runsA[0].source_filename, "register.csv");
  assert.equal(runsA[0].source_ref.version_id, "1.0", "the saved version read is recorded as revision evidence");
  assert.equal(runsA[0].source_ref.path, "BizKick/EDCS/register.csv");
  const qtDocs = await get(`/edcs/documents/NEX-QT-2026-0001?${q(A)}`, A.h);
  assert.equal(qtDocs.linked, true);
  assert.equal(qtDocs.current_revision.content_stored, true);
  const lvDocs = await get(`/edcs/documents/NEX-LV-2026-0001?${q(A)}`, A.h);
  assert.equal(lvDocs.linked, true);
  assert.equal(lvDocs.current_revision.content_stored, false, "the HR document is metadata and fingerprint only");
  assert.equal(lvDocs.current_revision.downloadable, false);
  for (const id of ["NEX-QT-2026-0002", "NEX-QT-2026-0003", "NEX-QT-2026-0004"]) assert.equal((await get(`/edcs/documents/${id}?${q(A)}`, A.h)).linked, false, `${id} was not filed`);

  // =============== ACCEPTANCE 1: the same register by upload gives the same result ===============
  const upload = await fetch(`${apiBase}/files/upload?tenant_id=${B.s.tenant_id}&firm_id=${B.s.firm_id}&filename=register.csv`, { method: "POST", headers: { "content-type": "text/csv", ...B.h }, body: Buffer.from(toCsv(rows)) });
  const uploaded = (await upload.json()).data;
  const imported = await post("/edcs/register-imports", { ...B.s, file_id: uploaded.id ?? uploaded.file?.id }, B.h);
  assert.deepEqual(imported.run.counts, first.summary.register_counts, "ACCEPTANCE 1: same outcome counts as the upload");
  assert.equal(imported.run.rows_total, runsA[0].rows_total);
  const txA = (await get(`/edcs/transactions?${q(A)}`, A.h)).transactions.sort((a, b) => a.transaction_id.localeCompare(b.transaction_id));
  const txB = (await get(`/edcs/transactions?${q(B)}`, B.h)).transactions.sort((a, b) => a.transaction_id.localeCompare(b.transaction_id));
  assert.equal(txA.length, 5);
  assert.deepEqual(stable(txA), stable(txB), "ACCEPTANCE 1: the same transactions as the upload");

  // =============== delta: only changes are read ===============
  fake.downloads.length = 0;
  const idle = await post("/edcs/graph/sync", { ...A.s }, A.h);
  assert.equal(idle.summary.register, "NOT_CHANGED");
  assert.equal(idle.summary.deltas, 0, "nothing changed in Microsoft 365 -> no items to read");
  assert.deepEqual(fake.downloads, [], "and nothing downloaded");
  assert.equal((await get(`/edcs/sync-runs?${q(A)}`, A.h)).runs.length, 1, "no change, no sync run");

  rows[2] = row({ seq: 3, status: "Approved", owner: "Owner 2" });
  register();
  const second = await post("/edcs/graph/sync", { ...A.s }, A.h);
  assert.equal(second.summary.register, "COMPLETED");
  assert.equal(second.summary.deltas, 1, "only the changed file came through the delta");
  assert.equal(second.summary.register_counts.UNCHANGED, 4);
  assert.equal(second.summary.register_counts.CREATED, 0);
  assert.equal(fake.downloads.length, 1);
  const runs2 = (await get(`/edcs/sync-runs?${q(A)}`, A.h)).runs.sort((a, b) => a.run_number - b.run_number);
  assert.equal(runs2.length, 2);
  assert.equal(runs2[1].source_ref.version_id, "2.0", "the new saved version is the evidence");
  assert.equal((await get(`/edcs/transactions?${q(A)}`, A.h)).transactions.find((t) => t.transaction_id === "NEX-QT-2026-0003").status, "Approved");

  // a changed file, with delta items that carry no path (the item is asked for its path)
  fake.omitPaths = true;
  const quote1v2 = Buffer.from("%PDF-1.4 quotation one body, revised");
  putFile("BizKick/Sales/NEX-QT-2026-0001 Quotation.pdf", quote1v2);
  putFile("Other/NEX-QT-2026-0002 Quotation.pdf", Buffer.from("%PDF-1.4 outside folder A, edited")); // changed outside the folder
  const third = await post("/edcs/graph/sync", { ...A.s }, A.h);
  fake.omitPaths = false;
  assert.equal(third.summary.files.revised + third.summary.files.linked, 1, "the changed quotation was filed as a revision");
  assert.equal((await get(`/edcs/documents/NEX-QT-2026-0002?${q(A)}`, A.h)).linked, false, "a change outside the folder is still ignored");
  for (const id of outsideIds()) assert.equal(fake.downloads.includes(id), false, "still nothing outside the folder downloaded");

  // =============== a lost change token restarts safely ===============
  fake.expireDelta = true;
  const runsBefore = (await get(`/edcs/sync-runs?${q(A)}`, A.h)).runs.length;
  const restarted = await post("/edcs/graph/sync", { ...A.s }, A.h);
  assert.equal(restarted.failed, undefined);
  assert.equal(restarted.summary.register, "UNCHANGED", "the full listing found the register already read");
  assert.equal((await get(`/edcs/sync-runs?${q(A)}`, A.h)).runs.length, runsBefore, "no duplicate run after a restart");
  assert.equal(restarted.summary.files.linked, 0, "files already filed are not filed again");

  // =============== a passing Microsoft error does not disconnect ===============
  rows[3] = row({ seq: 4, status: "Approved" });
  register();
  fake.failNext = 5;
  const hiccup = await post("/edcs/graph/sync", { ...A.s }, A.h);
  assert.equal(hiccup.failed, true);
  let state = (await get(`/edcs/graph?${q(A)}`, A.h)).graph;
  assert.equal(state.status, "ACTIVE", "a 503 is not a lost connection");
  assert.equal(state.last_sync_status, "ERROR");
  assert.ok(state.error_count >= 1 && state.last_error);
  fake.failNext = 0;
  const recovered = await post("/edcs/graph/sync", { ...A.s }, A.h);
  assert.equal(recovered.summary.register, "COMPLETED", "the change made during the outage is read next time");
  state = (await get(`/edcs/graph?${q(A)}`, A.h)).graph;
  assert.equal(state.last_sync_status, "OK");
  assert.equal(state.last_error, null);

  // =============== the scheduled tick polls Microsoft 365 ===============
  const runsPreTick = (await get(`/edcs/sync-runs?${q(A)}`, A.h)).runs.length;
  rows[0] = row({ seq: 1, status: "Approved" });
  register();
  const tick = await post("/automation/tick", {}, { "x-vfirm-service-token": SERVICE_TOKEN });
  assert.ok(tick.graph.polled >= 1, "the daily tick read the firm's Microsoft 365 folder");
  assert.equal((await get(`/edcs/sync-runs?${q(A)}`, A.h)).runs.length, runsPreTick + 1);
  assert.equal(tick.graph.failed, 0);

  // =============== firm isolation ===============
  assert.equal((await get(`/edcs/graph?${q(B)}`, B.h)).graph, null, "Bravo has no connection");
  await fails("POST", "/edcs/graph/sync", 404, "NOT_FOUND", { ...B.s }, B.h);
  await fails("POST", "/edcs/graph/disconnect", 404, "NOT_FOUND", { ...B.s }, B.h);
  assert.equal((await get(`/edcs/transactions?${q(C)}`, C.h)).transactions.length, 0, "Charlie received nothing");
  assert.equal(JSON.stringify(await get(`/data-protection/export-package?${q(B)}`, B.h)).includes("BizKick/EDCS/register.csv"), false);

  // =============== ACCEPTANCE 2: consent revoked -> sync stops, the console says so ===============
  rows[1] = row({ seq: 2, status: "Approved" });
  register();
  fake.consentRevoked = true;
  const lost = await post("/edcs/graph/sync", { ...A.s }, A.h);
  assert.equal(lost.access_lost, true);
  state = (await get(`/edcs/graph?${q(A)}`, A.h)).graph;
  assert.equal(state.status, "ACCESS_LOST", "ACCEPTANCE 2: the console state shows the access was lost");
  assert.equal(state.status_text, "Microsoft stopped the access");
  assert.ok(state.access_lost_at && state.last_error);
  const runsLost = (await get(`/edcs/sync-runs?${q(A)}`, A.h)).runs.length;
  fake.log.length = 0;
  const skipped = await post("/edcs/graph/sync", { ...A.s }, A.h);
  assert.equal(skipped.skipped, true);
  assert.equal(skipped.reason, "ACCESS_LOST");
  const tick2 = await post("/automation/tick", {}, { "x-vfirm-service-token": SERVICE_TOKEN });
  assert.equal(tick2.graph.polled, 0, "the tick no longer polls a firm whose access was lost");
  assert.equal(fake.log.length, 0, "ACCEPTANCE 2: not a single call went to Microsoft after the access was lost");
  assert.equal((await get(`/edcs/sync-runs?${q(A)}`, A.h)).runs.length, runsLost, "nothing new was read");

  // the admin restores access; the owner presses "Save and check access" without retyping the secret
  fake.consentRevoked = false;
  const again = await post("/edcs/graph/connect", { ...goodBody(A), client_secret: undefined }, A.h);
  assert.equal(again.graph.status, "ACTIVE");
  assert.equal(again.graph.id, state.id, "same connection, not a second one");
  const resumed = await post("/edcs/graph/sync", { ...A.s }, A.h);
  assert.equal(resumed.summary.register, "COMPLETED", "reading resumed and caught up");

  // an expired app secret is also "access lost"
  fake.secret = "A-New-Rotated-Secret-Value";
  rows[3] = row({ seq: 4, status: "Completed" });
  register();
  const expired = await post("/edcs/graph/sync", { ...A.s }, A.h);
  assert.equal(expired.access_lost, true);
  assert.equal((await get(`/edcs/graph?${q(A)}`, A.h)).graph.status, "ACCESS_LOST");
  await fails("POST", "/edcs/graph/connect", 400, "GRAPH_AUTH_FAILED", { ...goodBody(A), client_secret: undefined }, A.h);
  const renewed = await post("/edcs/graph/connect", goodBody(A, { client_secret: fake.secret }), A.h);
  assert.equal(renewed.graph.status, "ACTIVE");

  // =============== disconnect erases the secret ===============
  await fails("POST", "/edcs/graph/disconnect", 403, "EDCS_OWNER_REQUIRED", { ...A.s }, A.staff);
  const off = await post("/edcs/graph/disconnect", { ...A.s }, A.h);
  assert.equal(off.graph.status, "DISCONNECTED");
  assert.equal(off.graph.has_secret, false, "the stored secret is erased");
  assert.equal((await post("/edcs/graph/disconnect", { ...A.s }, A.h)).graph.status, "DISCONNECTED", "disconnecting twice is harmless");
  fake.log.length = 0;
  assert.equal((await post("/edcs/graph/sync", { ...A.s }, A.h)).reason, "DISCONNECTED");
  await post("/automation/tick", {}, { "x-vfirm-service-token": SERVICE_TOKEN });
  assert.equal(fake.log.length, 0, "a disconnected firm is never polled");
  if (!process.env.VFIRM_SMOKE_DATABASE_URL) {
    const stored = await readFile(join(tmp, "store.json"), "utf8");
    assert.equal(stored.includes(APP_SECRET), false);
    assert.equal(stored.includes(fake.secret), false);
    assert.equal(/"secret_enc":\s*"v1\./.test(stored), false, "no encrypted secret remains for the disconnected firm");
  }

  // =============== audit trail and export ===============
  const audit = JSON.stringify(await get(`/audit-events?${q(A)}`, A.h));
  for (const event of ["edcs.graph_connected", "edcs.graph_synced", "edcs.graph_access_lost", "edcs.graph_disconnected"]) assert.ok(audit.includes(event), event);
  const exported = JSON.stringify(await get(`/data-protection/export-package?${q(A)}`, A.h));
  assert.ok(exported.includes("edcs_graph_connections"), "the export carries the Microsoft 365 connection record");
  assert.ok(exported.includes("BizKick"), "with its folder settings");
  for (const secret of [APP_SECRET, "A-New-Rotated-Secret-Value", "secret_enc"]) assert.equal(exported.includes(secret), false, `the export carries no ${secret === "secret_enc" ? "encrypted secret" : "secret"}`);
  assert.deepEqual(nonGet(), [], "vFirm never wrote to Microsoft 365");

  console.log(JSON.stringify({
    status: "pass", sprint: "CE-S7", backend: process.env.VFIRM_SMOKE_DATABASE_URL ? "postgres" : "json",
    checked: ["secret box", "owner-only + validated connect, proven before saved", "secret encrypted, never listed or exported", "same result as upload", "delta reads only changes", "folder limit (outside, sibling, archive, lock files)", "read-only (GET only)", "token not sent to blob host", "HR metadata only", "expired change token restarts", "503 does not disconnect", "tick polls", "consent revoked stops + shows", "re-check without retyping secret", "expired secret = access lost", "disconnect erases secret", "firm isolation", "audit", "export"]
  }, null, 2));
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  for (const child of children) if (child.exitCode === null && !child.killed) child.kill();
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await new Promise((resolve) => fakeServer.close(resolve));
  await rm(tmp, { recursive: true, force: true });
}
