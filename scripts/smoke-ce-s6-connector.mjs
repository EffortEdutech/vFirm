import assert from "node:assert/strict";
import { once } from "node:events";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { REGISTER_COLUMNS } from "../packages/core-domain/src/edcs-register.mjs";
import { ConfigError, normalizeConfig } from "../apps/edcs-connector/src/config.mjs";
import { createAgent } from "../apps/edcs-connector/src/agent.mjs";
import { createOutbox, OutboxError } from "../apps/edcs-connector/src/outbox.mjs";
import { connectorHealth } from "../apps/api/src/edcs-connector-service.mjs";

// CE-S6 (ADR-101, 2026-10-06) -- Connected EDCS: the connector agent.
//
// Drives the real API over HTTP and the real connector agent against a temporary BizKick folder and proves
// the sprint's five acceptance checks:
//   1. changing one register row produces exactly one sync event with the right outcome
//   2. network off -> queued -> delivered after reconnect, no duplicates (also: an acknowledgement lost on the
//      way back is retried with the same key and applied once)
//   3. a revoked token is refused, and the console shows the connector as revoked
//   4. the connector never writes outside the outbox (a file-system audit of the BizKick folder after every cycle)
//   5. HR files are metadata only under the default content policy (the bytes never leave the PC)
// plus: token issue/rotate/revoke are owner-only and the token is never listed or exported, deltas catch
// removals once, computed columns do not cause traffic, a changed workbook structure is reported once,
// firm isolation, the CLI. Local JSON backend by default; set VFIRM_SMOKE_DATABASE_URL for a fresh, fully-migrated Postgres.

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-ce-s6-"));
const apiPort = 3177;
const apiBase = `http://127.0.0.1:${apiPort}`;
const children = [];
let logs = "";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    await sleep(100);
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
const headersFor = (actorId, firm, role = "principal") => ({ "x-vfirm-actor-id": actorId, "x-vfirm-tenant-id": firm.tenant_id, "x-vfirm-firm-id": firm.id, "x-vfirm-role": role });
const stamp = Date.now();
let firmCounter = 0;
async function newFirm(label) {
  firmCounter += 1;
  const tenant = await post("/tenants", { name: `CE-S6 ${label} Tenant ${stamp}-${firmCounter}` });
  const seed = await post("/firms", { tenant_id: tenant.id, name: `CE-S6 ${label} Firm ${stamp}-${firmCounter}`, principal_name: `${label} Owner` });
  const firm = seed.firm;
  const as = (role) => headersFor(seed.principal_actor.id, firm, role);
  return { firm, h: as("principal"), staff: as("PILOT_OPERATOR"), s: { tenant_id: firm.tenant_id, firm_id: firm.id }, label };
}
const q = (ctx) => `tenant_id=${ctx.s.tenant_id}&firm_id=${ctx.s.firm_id}`;

// ---------------- the BizKick folder (synthetic Nexa Office Supplies, company NEX) ----------------

const bk = join(tmp, "BizKick");
const stateDir = join(tmp, "connector-state"); // outside the BizKick folder, as the configuration requires
const registerPath = join(bk, "EDCS", "register.csv");
const HEADER = REGISTER_COLUMNS.map((c) => c.header);
// A register row (24 columns A..X). Computed columns Q, R and X are BizKick formulas: `computed` varies them.
function row({ type = "QT", seq, rev = 0, status = "Issued", amount = 1000, owner = "Owner", counterpartyType = "Customer", computed = "" }) {
  const hr = type === "LV";
  return ["NEX", type, 2026, seq, "", `R${rev}`, "2026-09-01", "2026-09-02", hr ? "Employee" : counterpartyType, `${hr ? "Employee" : "Customer"} ${seq}`, `${type} ${seq}`, hr ? "" : amount, hr ? "" : "MYR", status, owner, "2026-12-31", computed, computed, "", "", "", "2026-09-02", "", computed];
}
const toCsv = (rows, header = HEADER) => ["BizKick EDCS", "", "", "", "", header.join(","), ...rows.map((cells) => cells.join(","))].join("\n");
let rows = [row({ seq: 1 }), row({ seq: 2 }), row({ seq: 3 }), row({ seq: 4 }), row({ type: "LV", seq: 1 })];
const writeRegister = async (header = HEADER) => writeFile(registerPath, toCsv(rows, header));

async function snapshot(dir) {
  const out = {};
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) await walk(path);
      else {
        const info = await stat(path);
        out[relative(dir, path)] = `${info.size}|${info.mtimeMs}|${createHash("sha256").update(await readFile(path)).digest("hex")}`;
      }
    }
  }
  await walk(dir);
  return out;
}

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

  const A = await newFirm("Alpha");
  const B = await newFirm("Bravo");
  await post("/edcs/connection", { ...A.s, company_code: "NEX", bizkick_version: "1.0" }, A.h);
  await post("/edcs/connection", { ...B.s, company_code: "NEX", bizkick_version: "1.0" }, B.h);

  // =============== identity: issue, list, rotate, revoke ===============
  await fails("POST", "/edcs/connectors", 403, "EDCS_OWNER_REQUIRED", { ...A.s, name: "Staff attempt" }, A.staff);
  await fails("POST", "/edcs/connectors", 400, "VALIDATION_ERROR", { ...A.s, name: "   " }, A.h);
  await fails("POST", "/edcs/connectors", 400, "VALIDATION_ERROR", { ...A.s, name: "Bad topology", topology: "Z" }, A.h);
  const issued = await post("/edcs/connectors", { ...A.s, name: "Office PC", topology: "A" }, A.h);
  assert.ok(issued.token.startsWith("vfc_") && issued.token.length >= 30, "a token is returned once");
  assert.equal(issued.connector.status, "ACTIVE");
  assert.equal(issued.connector.health, "NEVER_SEEN");
  assert.equal(issued.connector.token_hash, undefined, "the hash is never returned");
  const token = issued.token;
  const connectorId = issued.connector.id;

  const listed = await get(`/edcs/connectors?${q(A)}`, A.h);
  assert.equal(listed.connectors.length, 1);
  assert.equal(JSON.stringify(listed).includes(token), false, "the token is not listed");
  assert.equal(JSON.stringify(listed).includes("token_hash"), false, "the token hash is not listed");
  assert.equal((await get(`/edcs/connectors?${q(B)}`, B.h)).connectors.length, 0, "firm isolation: Bravo sees no connectors");
  await fails("POST", "/edcs/connectors/revoke", 404, "NOT_FOUND", { ...B.s, connector_id: connectorId }, B.h);
  await fails("POST", "/edcs/connectors/revoke", 403, "EDCS_OWNER_REQUIRED", { ...A.s, connector_id: connectorId }, A.staff);

  // the connector's own routes need a valid token
  await fails("POST", "/edcs/connector/heartbeat", 401, "CONNECTOR_TOKEN_INVALID", {}, {});
  await fails("POST", "/edcs/sync", 401, "CONNECTOR_TOKEN_INVALID", {}, { "x-vfirm-connector-token": "vfc_notarealtokennotarealtoken12" });
  await fails("POST", "/edcs/sync", 401, "CONNECTOR_TOKEN_INVALID", {}, { "x-vfirm-connector-token": "not-a-connector-token" });

  // =============== the connector: configuration ===============
  await mkdir(join(bk, "EDCS"), { recursive: true });
  await mkdir(join(bk, "Sales"), { recursive: true });
  await mkdir(join(bk, "HR"), { recursive: true });
  await writeRegister();
  const rawConfig = {
    vfirm_url: apiBase, connector_token: token, bizkick_root: bk, register_path: "EDCS/register.csv", state_dir: stateDir,
    controlled_folders: ["Sales", "HR"], watch: false, retry: { base_ms: 50, max_ms: 400 }
  };
  assert.throws(() => normalizeConfig({ ...rawConfig, state_dir: join(bk, "state") }, { env: {} }), ConfigError, "a state_dir inside BizKick is refused");
  assert.throws(() => normalizeConfig({ ...rawConfig, connector_token: "nope" }, { env: {} }), ConfigError);
  assert.throws(() => normalizeConfig({ ...rawConfig, vfirm_url: "" }, { env: {} }), ConfigError);
  const config = normalizeConfig(rawConfig, { env: {} });

  // network control and a record of what the connector sent
  const sent = [];
  let offline = false;
  let loseAck = false;
  const fetchImpl = async (url, options) => {
    if (offline) throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } });
    const path = new URL(url).pathname;
    if (options?.body) sent.push({ path, body: JSON.parse(options.body) });
    const response = await fetch(url, options);
    if (loseAck && path === "/edcs/sync") { loseAck = false; await response.arrayBuffer(); throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET" } }); }
    return response;
  };
  const agent = createAgent({ config, fetchImpl });

  const bkBefore = await snapshot(bk);
  async function cycle() {
    const before = await snapshot(bk);
    const summary = await agent.runCycle();
    assert.deepEqual(await snapshot(bk), before, "ACCEPTANCE 4: the connector wrote nothing inside the BizKick folder during a cycle");
    return summary;
  }
  const runs = async () => (await get(`/edcs/sync-runs?${q(A)}`, A.h)).runs.sort((a, b) => a.run_number - b.run_number);
  const eventsOf = async (run) => (await get(`/edcs/sync-runs/${run.id}?${q(A)}`, A.h)).events;
  const txs = async () => (await get(`/edcs/transactions?${q(A)}`, A.h)).transactions;

  // =============== first cycle: heartbeat + first delivery ===============
  const first = await cycle();
  assert.equal(first.register.status, "QUEUED");
  assert.equal(first.flush.delivered, 1);
  let all = await runs();
  assert.equal(all.length, 1);
  assert.equal(all[0].source_kind, "CONNECTOR");
  assert.equal(all[0].connector_id, connectorId, "every sync is attributed to the connector");
  assert.equal(all[0].connector_name, "Office PC");
  assert.equal(all[0].sync_mode, "DELTA");
  assert.equal(all[0].counts.CREATED, 5);
  assert.equal((await txs()).length, 5);
  assert.equal(all[0].status, "COMPLETED");

  let connector = (await get(`/edcs/connectors?${q(A)}`, A.h)).connectors[0];
  assert.equal(connector.health, "OK");
  assert.ok(connector.last_seen_at && connector.last_sync_at);
  assert.equal(connector.last_run_number, 1);
  assert.equal(connector.queue_length, 0);
  assert.equal(connector.last_counts.CREATED, 5);
  assert.ok(connector.agent_version && connector.host, "the console shows the agent version and host");

  // nothing changed -> nothing sent
  const idle = await cycle();
  assert.equal(idle.register.status, "UNCHANGED");
  assert.equal((await runs()).length, 1, "no change, no sync run");

  // =============== ACCEPTANCE 1: one row changed = exactly one sync event ===============
  rows[2] = row({ seq: 3, status: "Approved" });
  await writeRegister();
  await cycle();
  all = await runs();
  assert.equal(all.length, 2);
  let events = await eventsOf(all[1]);
  assert.equal(events.length, 1, "exactly one sync event");
  assert.equal(events[0].outcome, "UPDATED");
  assert.equal(events[0].transaction_id, "NEX-QT-2026-0003");
  assert.deepEqual(events[0].changed_fields, ["status"]);
  assert.equal((await txs()).find((t) => t.transaction_id === "NEX-QT-2026-0003").status, "Approved");

  rows[0] = row({ seq: 1, rev: 1, amount: 1250 });
  await writeRegister();
  await cycle();
  all = await runs();
  assert.equal(all.length, 3);
  events = await eventsOf(all[2]);
  assert.equal(events.length, 1);
  assert.equal(events[0].outcome, "REVISED");
  assert.equal(events[0].transaction_id, "NEX-QT-2026-0001");

  // a same-revision commercial change is a CONFLICT, held for the owner, exactly as for an uploaded register
  rows[1] = row({ seq: 2, amount: 9999 });
  await writeRegister();
  await cycle();
  all = await runs();
  events = await eventsOf(all[3]);
  assert.equal(events.length, 1);
  assert.equal(events[0].outcome, "CONFLICT");
  assert.ok(events[0].reasons.includes("SAME_REVISION_COMMERCIAL_CHANGE"));

  // BizKick's computed columns (days to expiry, alert, duplicate check) change every day: they cause no traffic
  rows = rows.map((cells) => cells.map((value, index) => (["Q", "R", "X"].includes(REGISTER_COLUMNS[index].col) ? "7" : value)));
  await writeRegister();
  const calendar = await cycle();
  assert.equal(calendar.register.status, "NO_DELTA");
  assert.equal((await runs()).length, 4, "computed columns send nothing");

  // a row that vanishes is reported once, and not again by later deliveries
  const rowsBeforeRemoval = rows;
  rows = rows.filter((cells) => cells[3] !== 4);
  await writeRegister();
  await cycle();
  all = await runs();
  assert.equal(all.length, 5);
  events = await eventsOf(all[4]);
  assert.equal(events.length, 1);
  assert.equal(events[0].outcome, "ROW_MISSING");
  assert.equal(events[0].transaction_id, "NEX-QT-2026-0004");
  assert.equal((await txs()).find((t) => t.transaction_id === "NEX-QT-2026-0004").flags.row_missing, true);
  rows[2] = row({ seq: 3, status: "Completed" });
  await writeRegister();
  await cycle();
  all = await runs();
  events = await eventsOf(all[5]);
  assert.equal(events.length, 1, "the already-missing row is not reported again");
  assert.equal(events[0].transaction_id, "NEX-QT-2026-0003");

  // =============== ACCEPTANCE 2: offline -> queued -> delivered after reconnect, no duplicates ===============
  const runsBeforeOffline = (await runs()).length;
  offline = true;
  rows[0] = row({ seq: 1, rev: 1, amount: 1250, status: "Approved" });
  await writeRegister();
  const down = await cycle();
  assert.equal(down.flush.delivered, 0);
  assert.equal(await agent.queue.length(), 1, "the change is queued on disk");
  assert.ok(agent.health.last_error && /reach vFirm/.test(agent.health.last_error));
  rows[4] = row({ type: "LV", seq: 1, status: "Completed" });
  await writeRegister();
  await sleep(120);
  await cycle();
  assert.equal(await agent.queue.length(), 2, "a second change queues behind the first");
  assert.equal((await runs()).length, runsBeforeOffline, "nothing reached vFirm while the network was off");

  // an acknowledgement lost on the way back: the server applied it, the connector retries with the same key
  offline = false;
  loseAck = true;
  await sleep(450);
  const lost = await cycle();
  assert.equal(lost.flush.delivered, 0, "the first attempt looks failed to the connector");
  assert.equal((await runs()).length, runsBeforeOffline + 1, "...but vFirm did apply it");
  await sleep(450);
  const back = await cycle();
  assert.equal(back.flush.duplicates, 1, "the retry was recognised as the same delivery");
  assert.equal(back.flush.delivered, 2);
  assert.equal(await agent.queue.length(), 0);
  all = await runs();
  assert.equal(all.length, runsBeforeOffline + 2, "two changes, two runs: no duplicates");
  const keys = all.map((run) => run.idempotency_key).filter(Boolean);
  assert.equal(new Set(keys).size, keys.length, "every delivery key is unique");
  assert.equal((await eventsOf(all[all.length - 2])).length, 1);
  assert.equal((await eventsOf(all[all.length - 1])).length, 1);
  connector = (await get(`/edcs/connectors?${q(A)}`, A.h)).connectors[0];
  assert.equal(connector.queue_length, 0);
  assert.equal(connector.health, "OK", "a clean round clears the error");

  // =============== a changed workbook structure is reported once ===============
  const runsBeforeStructure = (await runs()).length;
  const txBefore = JSON.stringify((await txs()).map((t) => [t.transaction_id, t.revision, t.status]).sort());
  await writeRegister(HEADER.map((name) => (name === "Amount" ? "Value" : name)));
  const structure = await cycle();
  assert.equal(structure.register.status, "STRUCTURE");
  all = await runs();
  assert.equal(all.length, runsBeforeStructure + 1);
  assert.equal(all[all.length - 1].status, "REJECTED");
  assert.equal(all[all.length - 1].file_outcome.reason, "STRUCTURE_CHANGED");
  assert.equal(all[all.length - 1].rows_total, 0, "zero rows processed");
  assert.equal(JSON.stringify((await txs()).map((t) => [t.transaction_id, t.revision, t.status]).sort()), txBefore, "a rejected file changes nothing");
  await cycle();
  assert.equal((await runs()).length, runsBeforeStructure + 1, "the same broken file is reported once");
  await writeRegister(); // restored
  const restored = await cycle();
  assert.equal(restored.register.status, "NO_DELTA");
  assert.equal((await runs()).length, runsBeforeStructure + 1);

  // =============== ACCEPTANCE 5: HR files are metadata only; the bytes never leave the PC ===============
  const qtFile = Buffer.from("%PDF-1.4 synthetic quotation NEX-QT-2026-0001");
  const lvFile = Buffer.from("%PDF-1.4 synthetic leave application, personal data");
  await writeFile(join(bk, "Sales", "NEX-QT-2026-0001_R1.pdf"), qtFile);
  await writeFile(join(bk, "HR", "NEX-LV-2026-0001.pdf"), lvFile);
  await writeFile(join(bk, "HR", "unrelated-notes.pdf"), Buffer.from("no transaction id in this name"));
  sent.length = 0;
  const files = await cycle();
  assert.equal(files.files.queued, 3);
  assert.equal(files.files.with_content, 1);
  assert.equal(files.files.metadata_only, 2);
  const fileCalls = sent.filter((call) => call.path === "/edcs/sync/file");
  const qtCall = fileCalls.find((call) => call.body.filename.startsWith("NEX-QT"));
  const lvCall = fileCalls.find((call) => call.body.filename.startsWith("NEX-LV"));
  assert.equal(typeof qtCall.body.content_base64, "string", "a Sales document's content may be sent");
  assert.equal(lvCall.body.content_base64, undefined, "ACCEPTANCE 5: the HR file's bytes were NOT sent");
  assert.equal(lvCall.body.sha256, createHash("sha256").update(lvFile).digest("hex"), "only its fingerprint, name and size were");
  assert.equal(JSON.stringify(sent).includes(lvFile.toString("base64")), false, "the HR bytes appear nowhere in what the connector sent");
  const qtDocs = await get(`/edcs/documents/NEX-QT-2026-0001?${q(A)}`, A.h);
  assert.equal(qtDocs.linked, true);
  assert.equal(qtDocs.current_revision.content_stored, true);
  const lvDocs = await get(`/edcs/documents/NEX-LV-2026-0001?${q(A)}`, A.h);
  assert.equal(lvDocs.linked, true);
  assert.equal(lvDocs.current_revision.content_stored, false, "the HR document is recorded as metadata and fingerprint only");
  assert.equal(lvDocs.current_revision.downloadable, false);
  assert.equal((await cycle()).files.queued, 0, "an unchanged file is not sent again");

  // the server enforces the policy too, whatever a connector sends
  const asConnector = { "x-vfirm-connector-token": token };
  const forced = await post("/edcs/sync/file", { filename: "NEX-LV-2026-0001_v2.pdf", mime_type: "application/pdf", content_base64: lvFile.toString("base64") }, asConnector);
  assert.equal(forced.content_policy, "METADATA_ONLY");
  assert.equal(forced.content_stored, false, "bytes sent under a metadata-only policy are still never stored");
  await fails("POST", "/edcs/sync/file", 409, "CONTENT_REQUIRED", { filename: "NEX-QT-2026-0002_R0.pdf", sha256: "a".repeat(64), size_bytes: 10 }, asConnector);
  await fails("POST", "/edcs/sync/file", 400, "VALIDATION_ERROR", { filename: "NEX-QT-2026-0002_R0.pdf" }, asConnector);
  await fails("POST", "/edcs/sync", 400, "VALIDATION_ERROR", { filename: "x.csv", sha256: "nope", size_bytes: 1, idempotency_key: "k" }, asConnector);

  // =============== ACCEPTANCE 4: the file-system audit, and the outbox ===============
  const bkAfter = await snapshot(bk);
  const touched = Object.keys({ ...bkBefore, ...bkAfter }).filter((name) => bkBefore[name] !== bkAfter[name]);
  const testWrites = new Set(["EDCS/register.csv".replaceAll("/", process.platform === "win32" ? "\\" : "/"), ...["Sales/NEX-QT-2026-0001_R1.pdf", "HR/NEX-LV-2026-0001.pdf", "HR/unrelated-notes.pdf"].map((name) => name.replaceAll("/", process.platform === "win32" ? "\\" : "/"))]);
  assert.deepEqual(touched.filter((name) => !testWrites.has(name)), [], "the only files that changed in BizKick are the ones this test wrote");
  assert.equal((await readdir(bk)).includes("_vFirm_Outbox"), false, "no outbox was created: it is off by default");
  assert.equal((await readdir(stateDir)).includes("queue"), true, "the connector's own files live in its state folder");
  assert.deepEqual((await snapshot(bk)), bkAfter);

  const outboxOff = createOutbox(config);
  await assert.rejects(() => outboxOff.write("note.txt", "x"), OutboxError, "the outbox does nothing unless it is enabled");
  const outboxOn = createOutbox({ ...config, outbox_enabled: true });
  await outboxOn.write("hello/note.txt", "ok");
  assert.equal(await readFile(join(bk, "_vFirm_Outbox", "hello", "note.txt"), "utf8"), "ok");
  for (const escape of ["../register.csv", "..\\..\\x", "/etc/passwd", "C:\\Windows\\x", "a/../../b", ""]) {
    await assert.rejects(() => outboxOn.write(escape, "x"), OutboxError, `refused: ${JSON.stringify(escape)}`);
  }
  assert.equal(await readFile(registerPath, "utf8"), toCsv(rows), "the register itself is untouched");
  await rm(join(bk, "_vFirm_Outbox"), { recursive: true, force: true });

  // =============== the CLI ===============
  const configFile = join(tmp, "connector.config.json");
  await writeFile(configFile, JSON.stringify({ ...rawConfig, connector_token: "vfc_placeholder", state_dir: join(tmp, "cli-state") }));
  const cli = spawnSync(process.execPath, ["apps/edcs-connector/bin/edcs-connector.mjs", "once", "--config", configFile], { cwd: root, env: { ...process.env, VFIRM_CONNECTOR_TOKEN: token }, encoding: "utf8" });
  assert.equal(cli.status, 0, `CLI once failed: ${cli.stdout}${cli.stderr}`);
  assert.equal(JSON.parse(cli.stdout).fatal, null);
  const cliStatus = spawnSync(process.execPath, ["apps/edcs-connector/bin/edcs-connector.mjs", "status", "--config", configFile], { cwd: root, env: { ...process.env, VFIRM_CONNECTOR_TOKEN: token }, encoding: "utf8" });
  assert.equal(JSON.parse(cliStatus.stdout).queue_length, 0);
  const cliBad = spawnSync(process.execPath, ["apps/edcs-connector/bin/edcs-connector.mjs", "once", "--config", join(tmp, "missing.json")], { cwd: root, encoding: "utf8" });
  assert.equal(cliBad.status, 1);

  // =============== rotation ===============
  const rotated = await post("/edcs/connectors/rotate", { ...A.s, connector_id: connectorId }, A.h);
  assert.notEqual(rotated.token, token);
  assert.equal(rotated.connector.token_hash, undefined);
  await fails("POST", "/edcs/connector/heartbeat", 401, "CONNECTOR_TOKEN_INVALID", {}, asConnector);
  const heartbeat = await post("/edcs/connector/heartbeat", { agent_version: "1.0.0", host: "TEST-PC", queue_length: 0 }, { "x-vfirm-connector-token": rotated.token });
  assert.equal(heartbeat.status, "ACTIVE");
  assert.equal(heartbeat.connection.company_code, "NEX");
  assert.equal(heartbeat.connection.content_policy.LV, "METADATA_ONLY");
  assert.equal(heartbeat.connection.content_policy.QT, "CONTENT");
  await fails("POST", "/edcs/connectors/rotate", 403, "EDCS_OWNER_REQUIRED", { ...A.s, connector_id: connectorId }, A.staff);

  // the install package is self-contained: build it, run it from its own folder, and it still delivers
  const pkg = join(tmp, "package", "vfirm-edcs-connector");
  const built = spawnSync(process.execPath, ["apps/edcs-connector/scripts/package.mjs", pkg], { cwd: root, encoding: "utf8" });
  assert.equal(built.status, 0, `package build failed: ${built.stdout}${built.stderr}`);
  assert.equal(JSON.parse(built.stdout).sources_rewritten, 2, "the shared imports were rewritten (register-sync and file-sync)");
  for (const name of ["register-sync.mjs", "file-sync.mjs"]) assert.equal(/from "[^"]*packages\/core-domain/.test(await readFile(join(pkg, "src", name), "utf8")), false, `no import in ${name} reaches back into the repository`);
  const pkgConfig = join(tmp, "package.config.json");
  await writeFile(pkgConfig, JSON.stringify({ ...rawConfig, connector_token: "vfc_placeholder", state_dir: join(tmp, "package-state") }));
  const runsBeforePackage = (await runs()).length;
  const packaged = spawnSync(process.execPath, [join(pkg, "bin", "edcs-connector.mjs"), "once", "--config", pkgConfig], { cwd: tmp, env: { ...process.env, VFIRM_CONNECTOR_TOKEN: rotated.token }, encoding: "utf8" });
  assert.equal(packaged.status, 0, `the packaged connector failed: ${packaged.stdout}${packaged.stderr}`);
  assert.equal(JSON.parse(packaged.stdout).register.status, "QUEUED");
  assert.ok((await runs()).length > runsBeforePackage, "the packaged connector delivered");

  // =============== firm isolation ===============
  assert.equal((await get(`/edcs/transactions?${q(B)}`, B.h)).transactions.length, 0, "Bravo received nothing from Alpha's connector");
  assert.equal((await get(`/edcs/sync-runs?${q(B)}`, B.h)).runs.length, 0);

  // =============== ACCEPTANCE 3: revoked -> refused, and the console shows it ===============
  rows[3 - 1] = row({ seq: 3, status: "Completed", owner: "Owner 2" });
  await writeRegister();
  const runsBeforeRevoke = (await runs()).length;
  const revoked = await post("/edcs/connectors/revoke", { ...A.s, connector_id: connectorId }, A.h);
  assert.equal(revoked.connector.status, "REVOKED");
  assert.equal(revoked.connector.health, "REVOKED");
  await fails("POST", "/edcs/sync", 401, "CONNECTOR_REVOKED", {}, { "x-vfirm-connector-token": rotated.token });
  await fails("POST", "/edcs/connector/heartbeat", 401, "CONNECTOR_REVOKED", {}, { "x-vfirm-connector-token": rotated.token });
  // the running agent still holds the OLD token (it was rotated away): refused as invalid, and it stops
  const refusedAgent = createAgent({ config: normalizeConfig({ ...rawConfig, connector_token: rotated.token, state_dir: join(tmp, "revoked-state") }, { env: {} }), fetchImpl });
  const refused = await refusedAgent.runCycle();
  assert.equal(refused.fatal, "CONNECTOR_REVOKED");
  assert.equal(refusedAgent.health.fatal, "CONNECTOR_REVOKED");
  const after = await refusedAgent.runCycle();
  assert.equal(after.fatal, "CONNECTOR_REVOKED", "a revoked connector stops sending");
  assert.equal((await runs()).length, runsBeforeRevoke, "nothing from a revoked connector reached vFirm");
  connector = (await get(`/edcs/connectors?${q(A)}`, A.h)).connectors[0];
  assert.equal(connector.status, "REVOKED");
  assert.equal(connector.health, "REVOKED", "the console shows the connector as revoked");
  assert.ok(connector.refused_count >= 3, "refused attempts are counted");
  assert.ok(connector.revoked_at);
  await fails("POST", "/edcs/connectors/rotate", 409, "EDCS_CONNECTOR_REVOKED", { ...A.s, connector_id: connectorId }, A.h);
  assert.equal((await post("/edcs/connectors/revoke", { ...A.s, connector_id: connectorId }, A.h)).connector.status, "REVOKED", "revoking twice is harmless");

  // staleness is judged by the console from the last heartbeat
  const hour = 3600 * 1000;
  assert.equal(connectorHealth({ status: "ACTIVE", last_seen_at: new Date(Date.now() - hour).toISOString(), heartbeat_interval_seconds: 60 }), "STALE");
  assert.equal(connectorHealth({ status: "ACTIVE", last_seen_at: new Date().toISOString(), last_error: "x" }), "ERRORS");
  assert.equal(connectorHealth({ status: "ACTIVE", last_seen_at: null }), "NEVER_SEEN");
  assert.equal(connectorHealth({ status: "REVOKED", last_seen_at: new Date().toISOString() }), "REVOKED");

  // =============== audit trail and export ===============
  const exported = await get(`/data-protection/export-package?${q(A)}`, A.h);
  const exportText = JSON.stringify(exported);
  assert.ok(exportText.includes("Office PC"), "the export carries the connector record");
  assert.equal(exportText.includes("token_hash"), false, "a firm export never carries a token hash");
  assert.equal(exportText.includes(token) || exportText.includes(rotated.token), false, "nor a token");

  console.log(JSON.stringify({
    status: "pass", sprint: "CE-S6", backend: process.env.VFIRM_SMOKE_DATABASE_URL ? "postgres" : "json",
    checked: ["issue/rotate/revoke owner-only", "token never listed", "one row = one event", "offline queue + lost ack, no duplicates", "revoked refused + shown", "file-system audit", "HR metadata only", "structure change once", "computed columns silent", "removal once", "firm isolation", "cli"]
  }, null, 2));
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  for (const child of children) if (child.exitCode === null && !child.killed) child.kill();
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await rm(tmp, { recursive: true, force: true });
}
