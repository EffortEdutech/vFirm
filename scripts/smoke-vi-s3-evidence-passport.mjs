import assert from "node:assert/strict";
import { once } from "node:events";
import { createHash, randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import {
  MAX_PASSPORT_BYTES, bundlePathFor, buildPassportFiles, canonicalJson, passportVerifierCore, planPassport, sealOf, sha256PureHex, validateSelection, verifierHtml, verifyBundleEntries
} from "../packages/core-domain/src/edcs-passport.mjs";
import { zipRead } from "../apps/api/src/passport-zip.mjs";

// VI-S3 (ADR-111, 2026-10-11) -- Evidence Passport: a dossier a bank, tender board or auditor can verify on their own.
//
// Part 1 is pure: the plan (what is in, what is left out and why), the seal, the verifier. Part 2 drives the real API
// with the synthetic Nexa pack and proves:
//   1. owner-only; preview shows included and excluded items with reasons; nothing is built by a preview
//   2. a build needs the preview's digest; a changed selection or changed data is refused (409), not silently built
//   3. the bundle's files are byte-identical to the stored files; manifest hashes, revisions, BizKick sync events,
//      approvals (who, what, when) and the audit extract are in it; restricted items are NOT in it by default
//   4. a restricted item is included only when ticked; that is audited and printed on the manifest and cover
//   5. HR content that vFirm never stored goes in as a fingerprint only
//   6. the stored bundle is re-verified on download; a changed byte is refused and the verify endpoint says FAIL
//   7. firm isolation, audit events, tenant export
// Local JSON backend by default; set VFIRM_SMOKE_DATABASE_URL for a fresh, fully-migrated Postgres.

const root = process.cwd();
const fixtures = join(root, "scripts/fixtures/bizkick");
const samples = join(fixtures, "sample_files");
const SERVICE_TOKEN = "smoke-service-token-vi-s3";
const tmp = await mkdtemp(join(tmpdir(), "vfirm-vi-s3-"));
const apiPort = 3183;
const apiBase = `http://127.0.0.1:${apiPort}`;
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
let api = null;
let logs = "";
const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");

// ============================ part 1: the engine (pure) ============================
{
  // canonical JSON and the seal do not depend on key order
  assert.equal(canonicalJson({ b: 1, a: [2, { d: 4, c: 3 }] }), '{"a":[2,{"c":3,"d":4}],"b":1}');
  assert.equal(sealOf({ x: 1, y: 2 }), sealOf({ y: 2, x: 1 }));
  assert.notEqual(sealOf({ x: 1 }), sealOf({ x: 2 }));
  // the browser fallback SHA-256 agrees with the real one at every padding boundary
  for (const n of [0, 1, 3, 55, 56, 57, 63, 64, 65, 119, 120, 1000, 4097]) {
    const bytes = randomBytes(n);
    assert.equal(sha256PureHex(new Uint8Array(bytes)), sha(bytes), `fallback sha256 at ${n} bytes`);
  }
  // selection validation
  assert.equal(validateSelection({ purpose: "Bank loan" }).ok, false, "needs something to include");
  assert.equal(validateSelection({ document_ids: ["a"] }).ok, false, "needs a purpose");
  assert.equal(validateSelection({ document_ids: ["a"], purpose: "ab" }).ok, false);
  assert.equal(validateSelection({ document_ids: ["a"], purpose: "Bank loan", revisions: "SOME" }).ok, false);
  assert.equal(validateSelection({ document_ids: ["a"], purpose: "Bank loan", period: { from: "2026-02-30" } }).ok, false);
  assert.equal(validateSelection({ document_ids: ["a"], purpose: "Bank loan", period: { from: "2026-03-01", to: "2026-02-01" } }).ok, false);
  const okSel = validateSelection({ document_ids: ["a", "a", " b "], transaction_ids: [], purpose: " Bank loan ", revisions: "all", include_restricted: ["b"] });
  assert.equal(okSel.ok, true);
  assert.deepEqual(okSel.selection.document_ids, ["a", "b"]);
  assert.equal(okSel.selection.revisions, "ALL");

  // a hand-built firm
  const entry = (id, number, classification, current, extra = {}) => ({ id, document_number: number, title: `Title ${number}`, document_type: "QT", classification, current_revision_id: current, ...extra });
  const rev = (id, entryId, label, at, fileId, extra = {}) => ({ id, document_register_entry_id: entryId, revision: label, status: "CURRENT", created_at: at, content_hash: fileId ? `hash-${fileId}` : null, storage_ref: fileId ? `file:${fileId}` : null, metadata: { file_id: fileId, filename: `${fileId}.txt`, ...extra } });
  const file = (id, status = "STORED", bytes = 10) => ({ id, status, storage_key: status === "STORED" ? `k/${id}` : null, size_bytes: bytes, sha256: `hash-${id}`, filename: `${id}.txt` });
  const entries = [
    entry("e1", "NEX-QT-2026-0001", "CLIENT_CONFIDENTIAL", "r1b"),
    entry("e2", "NEX-DO-2026-0001", "CLIENT_CONFIDENTIAL", "r2"),
    entry("e3", "NEX-EMP-2026-0001", "HR_RESTRICTED", "r3"),
    entry("e4", "FIN-0001", "FINANCE_RESTRICTED", "r4"),
    entry("e5", "WR-0001-OUT", "CLIENT_CONFIDENTIAL", "r5", { document_type: "WORK_OUTPUT" })
  ];
  const revisions = [
    rev("r1a", "e1", "R0", "2026-08-01T02:00:00.000Z", "f1a"), rev("r1b", "e1", "R1", "2026-09-10T02:00:00.000Z", "f1b"),
    rev("r2", "e2", "R0", "2026-09-12T02:00:00.000Z", "f2"), rev("r3", "e3", "R0", "2026-09-01T02:00:00.000Z", "f3"),
    rev("r4", "e4", "R0", "2026-09-02T02:00:00.000Z", "f4"), rev("r5", "e5", "R0", "2026-09-30T17:30:00.000Z", "f5", { output_draft_id: "od1" })
  ];
  const files = [file("f1a", "STORED", 100), file("f1b", "STORED", 200), file("f2", "STORED", 300), file("f3", "METADATA_ONLY", 400), file("f4", "STORED", 500), file("f5", "STORED", 50)];
  const tx = (id, parent = null) => ({ transaction_id: id, document_type: id.split("-")[1], status: "Issued", related_transaction_id: parent, flags: {} });
  const transactions = [tx("NEX-QT-2026-0001"), tx("NEX-DO-2026-0001", "NEX-QT-2026-0001"), tx("NEX-EMP-2026-0001"), tx("NEX-INV-2026-0099")];
  const world = { entries, revisions, files, transactions };
  const sel = (patch = {}) => ({ document_ids: [], transaction_ids: [], include_chain: false, revisions: "CURRENT", period: null, include_restricted: [], ...patch });
  const itemOf = (plan, number) => plan.items.find((i) => i.document_number === number);

  let plan = planPassport({ ...world, selection: sel({ document_ids: ["e1", "e3", "e4"] }) });
  assert.equal(itemOf(plan, "NEX-QT-2026-0001").included, true);
  assert.deepEqual(itemOf(plan, "NEX-QT-2026-0001").revisions.map((r) => r.revision), ["R1"], "CURRENT is the current revision only");
  assert.deepEqual([itemOf(plan, "NEX-EMP-2026-0001").included, itemOf(plan, "NEX-EMP-2026-0001").reason], [false, "RESTRICTED_NOT_INCLUDED"], "HR is left out unless ticked");
  assert.deepEqual([itemOf(plan, "FIN-0001").included, itemOf(plan, "FIN-0001").reason], [false, "RESTRICTED_NOT_INCLUDED"], "finance-restricted is left out unless ticked");
  assert.deepEqual([plan.totals.documents, plan.totals.documents_excluded, plan.totals.restricted_candidates, plan.totals.restricted_included], [1, 2, 2, 0]);
  assert.equal(plan.totals.bytes, 200);
  // ticking includes only the ticked one
  plan = planPassport({ ...world, selection: sel({ document_ids: ["e1", "e3", "e4"], include_restricted: ["e3"] }) });
  assert.equal(itemOf(plan, "NEX-EMP-2026-0001").included, true);
  assert.equal(itemOf(plan, "NEX-EMP-2026-0001").revisions[0].content, "METADATA_ONLY", "content vFirm never stored goes in as a fingerprint only");
  assert.equal(itemOf(plan, "FIN-0001").included, false);
  assert.deepEqual([plan.totals.metadata_only, plan.totals.restricted_included, plan.totals.bytes], [1, 1, 200]);
  // a ticked id that is not part of the selection is reported, not silently ignored
  assert.deepEqual(planPassport({ ...world, selection: sel({ document_ids: ["e1"], include_restricted: ["e4"] }) }).not_candidate_restricted, ["e4"]);
  // all revisions
  plan = planPassport({ ...world, selection: sel({ document_ids: ["e1"], revisions: "ALL" }) });
  assert.deepEqual(itemOf(plan, "NEX-QT-2026-0001").revisions.map((r) => r.revision), ["R0", "R1"]);
  assert.equal(plan.totals.bytes, 300);
  // period (Malaysia date of filing): 2026-09-30T17:30Z is already 1 October there
  plan = planPassport({ ...world, selection: sel({ document_ids: ["e1", "e5"], revisions: "ALL", period: { from: "2026-09-01", to: "2026-09-30" } }) });
  assert.deepEqual(itemOf(plan, "NEX-QT-2026-0001").revisions.map((r) => [r.revision, r.included]), [["R0", false], ["R1", true]]);
  assert.equal(itemOf(plan, "NEX-QT-2026-0001").revisions[0].reason, "OUTSIDE_PERIOD");
  assert.deepEqual([itemOf(plan, "WR-0001-OUT").included, itemOf(plan, "WR-0001-OUT").reason], [false, "NO_REVISION_IN_PERIOD"], "Malaysia time decides the day");
  // transactions and chains
  plan = planPassport({ ...world, selection: sel({ transaction_ids: ["NEX-DO-2026-0001"], include_chain: true }) });
  assert.deepEqual(plan.transactions, ["NEX-DO-2026-0001", "NEX-QT-2026-0001"].sort(), "the whole chain comes with it");
  assert.deepEqual(plan.items.map((i) => i.document_number), ["NEX-DO-2026-0001", "NEX-QT-2026-0001"]);
  plan = planPassport({ ...world, selection: sel({ transaction_ids: ["NEX-DO-2026-0001"] }) });
  assert.deepEqual(plan.transactions, ["NEX-DO-2026-0001"]);
  plan = planPassport({ ...world, selection: sel({ transaction_ids: ["NEX-INV-2026-0099"] }) });
  assert.deepEqual(plan.orphan_transactions, ["NEX-INV-2026-0099"], "a transaction with no filed document is still evidence");
  // unknown ids are reported (the service turns them into 404)
  plan = planPassport({ ...world, selection: sel({ document_ids: ["nope"], transaction_ids: ["NEX-XX-2026-0001"] }) });
  assert.deepEqual([plan.unknown.documents, plan.unknown.transactions], [["nope"], ["NEX-XX-2026-0001"]]);
  // the digest is stable for the same data and changes when anything the owner saw changes
  const base = sel({ document_ids: ["e1", "e2"] });
  const d0 = planPassport({ ...world, selection: base }).digest;
  assert.equal(planPassport({ ...world, entries: [...entries].reverse(), selection: base }).digest, d0);
  assert.notEqual(planPassport({ ...world, selection: sel({ document_ids: ["e1", "e2"], revisions: "ALL" }) }).digest, d0);
  assert.notEqual(planPassport({ ...world, files: files.map((f) => (f.id === "f2" ? { ...f, sha256: "other" } : f)), selection: base }).digest, d0);
  // bundle paths are safe and never collide
  const taken = new Set();
  assert.equal(bundlePathFor("NEX-QT-2026-0001", "R1", "a/b:c.xlsx", taken), "documents/NEX-QT-2026-0001/R1/a_b_c.xlsx");
  assert.equal(bundlePathFor("NEX-QT-2026-0001", "R1", "a/b:c.xlsx", taken), "documents/NEX-QT-2026-0001/R1/a_b_c-2.xlsx");
  assert.equal(bundlePathFor("..", "R1", "..", new Set()), "documents/_/R1/_");

  // build a bundle, verify it, then break it every way a person could
  const contents = new Map([["r1b", Buffer.from("quotation R1 bytes")], ["r2", Buffer.from("delivery order bytes")], ["r3", Buffer.alloc(0)]]);
  const plan3 = planPassport({ ...world, selection: sel({ document_ids: ["e1", "e2", "e3"], include_restricted: ["e3"] }) });
  const contents3 = new Map([["r1b", contents.get("r1b")], ["r2", contents.get("r2")]]);
  const approvals = new Map([["r2", [{ kind: "OUTPUT_REVIEW", decision: "APPROVED_FOR_CLIENT_DRAFT", by_actor_id: "u1", by_name: "Owner", at: "2026-09-12T03:00:00.000Z", notes: null }]]]);
  const passport = { id: "p1", number: "EP-2026-ABC123", issued_at: "2026-10-01T00:00:00.000Z", purpose: "Bank <loan> & \"review\"", recipient: "Maybank", issued_by: { actor_id: "u1", name: "Owner" }, firm: { id: "f", name: "Nexa" }, selection: sel({ document_ids: ["e1", "e2", "e3"] }) };
  const built = buildPassportFiles({ passport, plan: plan3, contents: contents3, approvals, transactions: [{ transaction_id: "NEX-QT-2026-0001", sync_events: [{ outcome: "CREATED" }] }], audit: [{ action: "file.uploaded", resource_id: "f1b" }] });
  const names = [...built.entries.keys()];
  assert.deepEqual(names.slice(0, 5), ["verify.html", "SEAL.txt", "manifest.json", "cover.html", "evidence/audit_extract.json"]);
  assert.ok(names.includes("documents/NEX-QT-2026-0001/R1/f1b.txt") && names.includes("documents/NEX-DO-2026-0001/R0/f2.txt"));
  assert.ok(!names.some((n) => n.includes("EMP")), "fingerprint-only content has no file in the bundle");
  const emp = built.manifest.documents.find((d) => d.document_number === "NEX-EMP-2026-0001").revisions[0];
  assert.deepEqual([emp.content, emp.file.path, emp.file.sha256], ["METADATA_ONLY", null, "hash-f3"]);
  assert.deepEqual(built.manifest.documents.find((d) => d.document_number === "NEX-DO-2026-0001").revisions[0].approvals[0].by_name, "Owner");
  assert.deepEqual(built.manifest.passport.restricted_included.map((d) => d.document_number), ["NEX-EMP-2026-0001"]);
  const cover = built.entries.get("cover.html").toString("utf8");
  assert.ok(cover.includes("Bank &lt;loan&gt; &amp; &quot;review&quot;") && !cover.includes("Bank <loan>"), "cover text is escaped");
  assert.ok(cover.includes("restricted, included by the owner"));
  const unzipped = zipRead(built.zip);
  assert.deepEqual([...unzipped.keys()], names, "the zip holds exactly these files, in this order");
  for (const [name, bytes] of built.entries) assert.equal(Buffer.compare(Buffer.from(unzipped.get(name)), bytes), 0, `${name} round-trips through the zip`);
  assert.equal(sha(built.entries.get("verify.html")), built.verifier_sha256);
  assert.ok(verifierHtml().includes("vfirm.evidence-passport/1") && verifierHtml().includes("DecompressionStream") && verifierHtml().includes("webkitdirectory"));
  assert.ok(!/<script[^>]+src=/i.test(verifierHtml()) && !/https?:\/\//.test(verifierHtml().replace(/<\/?[^>]*>/g, "")), "the verifier loads nothing and talks to nothing");

  const good = await verifyBundleEntries(unzipped);
  assert.equal(good.ok, true, JSON.stringify(good.checks.filter((c) => !c.ok)));
  assert.equal(good.seal, built.seal);
  assert.equal((await verifyBundleEntries(unzipped, built.seal)).ok, true, "the right expected seal passes");
  assert.equal((await verifyBundleEntries(unzipped, "0".repeat(64))).ok, false, "a different expected seal fails");
  const clone = () => new Map([...unzipped].map(([k, v]) => [k, new Uint8Array(v)]));
  let m = clone(); const doc = "documents/NEX-QT-2026-0001/R1/f1b.txt"; m.get(doc)[0] ^= 1;
  let r = await verifyBundleEntries(m);
  assert.deepEqual([r.ok, r.bad], [false, [doc]], "one changed byte in one document");
  m = clone(); m.delete(doc); r = await verifyBundleEntries(m);
  assert.deepEqual([r.ok, r.missing], [false, [doc]], "a removed document");
  m = clone(); m.set("documents/extra.txt", new Uint8Array([1])); r = await verifyBundleEntries(m);
  assert.deepEqual([r.ok, r.unlisted], [false, ["documents/extra.txt"]], "an added document");
  m = clone(); m.set("manifest.json", new TextEncoder().encode(Buffer.from(m.get("manifest.json")).toString("utf8").replace("Maybank", "Another bank"))); r = await verifyBundleEntries(m);
  assert.equal(r.ok, false, "an edited manifest no longer matches SEAL.txt");
  assert.ok(r.checks.find((c) => c.name === "SEAL.txt matches the manifest" && !c.ok));
  m = clone(); m.delete("SEAL.txt"); assert.equal((await verifyBundleEntries(m)).ok, false, "a missing seal file");
  m = clone(); m.delete("manifest.json"); assert.equal((await verifyBundleEntries(m)).ok, false);
  m = clone(); m.set("manifest.json", new Uint8Array([123])); assert.equal((await verifyBundleEntries(m)).ok, false, "unreadable manifest");
  // honest limit: someone who rewrites the files AND the manifest AND the seal passes on its own, and fails against the seal vFirm shows
  m = clone();
  const forgedFile = "documents/NEX-DO-2026-0001/R0/f2.txt";
  m.set(forgedFile, new TextEncoder().encode("forged delivery order"));
  const forged = JSON.parse(Buffer.from(m.get("manifest.json")).toString("utf8"));
  const entryF = forged.files.find((f) => f.path === forgedFile); entryF.sha256 = sha(Buffer.from("forged delivery order")); entryF.size = 21;
  m.set("manifest.json", new TextEncoder().encode(JSON.stringify(forged)));
  m.set("SEAL.txt", new TextEncoder().encode(`seal: ${sealOf(forged)}\n`));
  assert.equal((await verifyBundleEntries(m)).ok, true, "a full rewrite is self-consistent");
  assert.equal((await verifyBundleEntries(m, built.seal)).ok, false, "but not against the seal vFirm issued");
  assert.ok(MAX_PASSPORT_BYTES > 1048576);
}
console.log("part 1 ok");

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
  const tenant = await post("/tenants", { name: `VI-S3 ${label} Tenant ${stamp}-${firmCounter}` });
  const seed = await post("/firms", { tenant_id: tenant.id, name: `VI-S3 ${label} Firm ${stamp}-${firmCounter}`, principal_name: `${label} Owner` });
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
const tick = async (ctx) => { const { response, json } = await tickWith(SERVICE_TOKEN, ctx.s); assert.equal(response.status, 200, JSON.stringify(json)); return json.data.standing; };
async function hireStaff(ctx) {
  await post("/ops/awia-package-assignment", { ...ctx.s, package_code: "HIRE_ME" }, ctx.h);
  const hire = (role_code, display_name, position_id) => post("/awia/virtual-staff/hire-worker", { ...ctx.s, role_code, display_name, position_id }, ctx.h);
  const bookkeeper = await hire("FAO", "Bookkeeper", "bookkeeper");
  const sales = await hire("SAO", "Sales Coordinator", "sales_coordinator");
  for (const worker of [bookkeeper, sales]) await post("/awia/virtual-staff/lifecycle", { ...ctx.s, staff_code: worker.staff_code, to_state: "ACTIVE" }, ctx.h);
  return { bookkeeper, sales };
}
async function importRegister(ctx, name) {
  const buffer = await readFile(join(fixtures, name));
  const response = await fetch(`${apiBase}/files/upload?${q(ctx)}&filename=${encodeURIComponent(name)}`, { method: "POST", headers: { "content-type": XLSX, ...ctx.h }, body: buffer });
  const uploaded = (await response.json()).data;
  return post("/edcs/register-imports", { ...ctx.s, file_id: uploaded.id }, ctx.h);
}
async function uploadAndRegister(ctx, filename, documentType, title) {
  const response = await fetch(`${apiBase}/files/upload?${q(ctx)}&filename=${encodeURIComponent(filename)}`, { method: "POST", headers: { "content-type": "text/csv", ...ctx.h }, body: Buffer.from("date,description,amount\n2026-09-03,Sample,100.00\n") });
  const file = (await response.json()).data;
  assert.ok(file?.id, `upload ${filename}`);
  await post("/documents", { ...ctx.s, file_id: file.id, document_type: documentType, title }, ctx.h);
  return file;
}

const q2 = (ctx) => q(ctx);
const previewP = (ctx, body, headers = ctx.h) => post("/passports/preview", { ...ctx.s, ...body }, headers);
const createP = (ctx, body, headers = ctx.h) => post("/passports", { ...ctx.s, ...body }, headers);
async function linkSample(ctx, filename) {
  const bytes = await readFile(join(samples, filename));
  const response = await fetch(`${apiBase}/edcs/files/upload?${q(ctx)}&filename=${encodeURIComponent(filename)}`, { method: "POST", headers: { "content-type": filename.endsWith(".docx") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : filename.endsWith(".csv") ? "text/csv" : XLSX, ...ctx.h }, body: bytes });
  const json = await response.json();
  assert.equal(response.status, 201, `link ${filename}: ${JSON.stringify(json)}`);
  return { bytes, json: json.data };
}
async function downloadPassport(ctx, id, headers = ctx.h) {
  const response = await fetch(`${apiBase}/passports/${id}/download?${q(ctx)}`, { headers });
  return { response, buffer: Buffer.from(await response.arrayBuffer()) };
}

try {
  startApi("2026-10-02");
  await waitForHealth();

  const A = await newFirm("Alpha");
  const B = await newFirm("Bravo");
  const staff = await hireStaff(A);
  await post("/edcs/connection", { ...A.s, company_code: "NEX", bizkick_version: "1.0" }, A.h);
  await importRegister(A, "register_01_baseline.xlsx");

  // BizKick files: a quotation with two revisions, its delivery order (a chain), and an HR file (content never stored by default)
  const qt0 = await linkSample(A, "NEX-QT-2026-0001_R0_Alpha-Tech-Resources.xlsx");
  const qt1 = await linkSample(A, "NEX-QT-2026-0001_R1_Alpha-Tech-Resources.xlsx");
  const doBytes = await linkSample(A, "NEX-DO-2026-0001_Alpha-Tech-Resources.xlsx");
  const emp = await linkSample(A, "NEX-EMP-2026-0001_Offer_Letter.docx");
  const store0 = await get(`/mvp/store?tenant_id=${A.s.tenant_id}`, A.h);
  const entryOf = (number) => store0.document_register_entries.find((e) => e.firm_id === A.firm.id && e.document_number === number);
  const qtEntry = entryOf("NEX-QT-2026-0001");
  const doEntry = entryOf("NEX-DO-2026-0001");
  const empEntry = entryOf("NEX-EMP-2026-0001");
  assert.ok(qtEntry && doEntry && empEntry, "the BizKick documents are filed");
  assert.equal(empEntry.classification, "HR_RESTRICTED");
  const empFile = store0.file_objects.find((f) => f.linked_to === "edcs:NEX-EMP-2026-0001");
  assert.equal(empFile.status, "METADATA_ONLY", "HR content is not stored by default");

  // a finance-restricted document (uploaded and registered by the owner)
  const finUp = await fetch(`${apiBase}/files/upload?${q(A)}&filename=${encodeURIComponent("bank-facility-letter.csv")}&classification=FINANCE_RESTRICTED`, { method: "POST", headers: { "content-type": "text/csv", ...A.h }, body: Buffer.from("facility,limit\nOD,100000\n") });
  const finFile = (await finUp.json()).data;
  assert.ok(finFile?.id);
  const finReg = await post("/documents", { ...A.s, file_id: finFile.id, document_type: "AGREEMENT", title: "Bank facility letter" }, A.h);
  const finEntryId = (finReg.document ?? finReg.entry ?? finReg.document_register_entry).id;

  // an approved work output (bookkeeper reconciles; the owner approves; it is filed as WR-0001-OUT)
  const bank = await fetch(`${apiBase}/files/upload?${q(A)}&filename=bank-sep.csv`, { method: "POST", headers: { "content-type": "text/csv", ...A.h }, body: Buffer.from("date,reference,amount\n2026-09-01,INV-1,500\n2026-09-02,INV-2,120.50\n") });
  const bankFile = (await bank.json()).data;
  const led = await fetch(`${apiBase}/files/upload?${q(A)}&filename=ledger-sep.csv`, { method: "POST", headers: { "content-type": "text/csv", ...A.h }, body: Buffer.from("date,reference,amount\n2026-09-01,INV-1,500\n2026-09-02,INV-2,120.50\n") });
  const ledFile = (await led.json()).data;
  const wr = await post("/work-requests", { ...A.s, title: "Reconcile September", request_type_id: "bank_reconciliation", file_ids: [bankFile.id, ledFile.id], file_roles: { [bankFile.id]: "bank_statement", [ledFile.id]: "book_entries" }, assign_to_staff_code: staff.bookkeeper.staff_code }, A.h);
  const run = await post("/awia/virtual-staff/workdesk-item/run-skill", { ...A.s, workdesk_item_id: wr.workdesk_item.id }, A.h);
  await post("/awia/virtual-staff/output-review", { ...A.s, output_draft_id: run.output_draft.id, review_decision: "APPROVED_FOR_CLIENT_DRAFT", review_notes: "Matches the statement" }, A.h);
  const completed = await post("/awia/virtual-staff/workdesk-item/complete-internal", { ...A.s, workdesk_item_id: wr.workdesk_item.id }, A.h);
  const outEntry = completed.filed_document;
  assert.equal(outEntry.document_number, "WR-0001-OUT");

  // ---- 1. owner-only; preview ----
  const base = { document_ids: [outEntry.id, finEntryId], transaction_ids: ["NEX-QT-2026-0001"], include_chain: true, revisions: "ALL", include_restricted: [outEntry.id], purpose: "Bank loan application", recipient: "Alpha Bank" };
  for (const [method, path, body] of [["POST", "/passports/preview", { ...A.s, ...base }], ["POST", "/passports", { ...A.s, ...base, plan_digest: "x" }]]) await fails(method, path, 403, "EDCS_OWNER_REQUIRED", body, A.staff);
  await fails("GET", `/passports?${q(A)}`, 403, "EDCS_OWNER_REQUIRED", undefined, A.staff);
  await fails("POST", "/passports/preview", 400, "VALIDATION_ERROR", { ...A.s, purpose: "Bank loan" }, A.h);
  await fails("POST", "/passports/preview", 400, "VALIDATION_ERROR", { ...A.s, document_ids: [outEntry.id] }, A.h);
  await fails("POST", "/passports/preview", 404, "NOT_FOUND", { ...A.s, ...base, document_ids: ["nope"] }, A.h);
  const tx = await get(`/edcs/transactions/NEX-QT-2026-0001?${q(A)}`, A.h);
  const chainIds = tx.chain.nodes.map((n) => n.transaction_id).sort();
  assert.ok(chainIds.length >= 2 && chainIds.includes("NEX-DO-2026-0001"), "the fixture chain has the quotation and its delivery order");

  const plan = await previewP(A, base);
  assert.deepEqual(plan.transactions, chainIds, "the whole chain is in scope");
  const item = (number) => plan.items.find((i) => i.document_number === number);
  assert.deepEqual(item("NEX-QT-2026-0001").revisions.map((r) => r.revision), ["R0", "R1"], "every revision");
  assert.equal(item("WR-0001-OUT").included, true);
  assert.deepEqual([item("Bank facility letter") ? 1 : 0], [0]);
  const finItem = plan.items.find((i) => i.entry_id === finEntryId);
  assert.deepEqual([finItem.included, finItem.reason, finItem.classification], [false, "RESTRICTED_NOT_INCLUDED", "FINANCE_RESTRICTED"]);
  assert.equal(plan.totals.restricted_included, 1);
  assert.equal((await previewP(A, base)).digest, plan.digest, "the same data gives the same digest");
  assert.equal((await get(`/passports?${q(A)}`, A.h)).passports.length, 0, "a preview builds and saves nothing");

  // ---- 2. a build needs the preview's digest ----
  await fails("POST", "/passports", 400, "VALIDATION_ERROR", { ...A.s, ...base }, A.h);
  await fails("POST", "/passports", 409, "PASSPORT_PLAN_CHANGED", { ...A.s, ...base, plan_digest: "0".repeat(32) }, A.h);
  await fails("POST", "/passports", 409, "PASSPORT_PLAN_CHANGED", { ...A.s, ...base, revisions: "CURRENT", plan_digest: plan.digest }, A.h);

  // ---- 3. the bundle ----
  const made = await createP(A, { ...base, plan_digest: plan.digest });
  const passport = made.passport;
  assert.match(passport.number, /^EP-2026-[0-9A-F]{6}$/);
  assert.match(passport.seal, /^[0-9a-f]{64}$/);
  assert.deepEqual(passport.restricted_included.map((d) => d.title.length > 0), [true], "the finance-classed work output was ticked, so it is declared");
  assert.deepEqual(passport.excluded.map((e) => [e.title, e.reason]), [["Bank facility letter", "RESTRICTED_NOT_INCLUDED"]]);
  const dl = await downloadPassport(A, passport.id);
  assert.equal(dl.response.status, 200);
  assert.equal(dl.response.headers.get("x-vfirm-passport-seal"), passport.seal);
  assert.equal(sha(dl.buffer), passport.bundle_sha256);
  const files = zipRead(dl.buffer);
  const text = (name) => Buffer.from(files.get(name)).toString("utf8");
  const manifest = JSON.parse(text("manifest.json"));
  assert.equal((await verifyBundleEntries(files, passport.seal)).ok, true, "the downloaded bundle verifies against the seal vFirm shows");
  assert.equal(text("SEAL.txt").includes(passport.seal), true);
  // the documents are byte-identical to what was uploaded
  const bytesAt = (path) => Buffer.from(files.get(path));
  assert.equal(Buffer.compare(bytesAt("documents/NEX-QT-2026-0001/R0/NEX-QT-2026-0001_R0_Alpha-Tech-Resources.xlsx"), qt0.bytes), 0);
  assert.equal(Buffer.compare(bytesAt("documents/NEX-QT-2026-0001/R1/NEX-QT-2026-0001_R1_Alpha-Tech-Resources.xlsx"), qt1.bytes), 0);
  assert.equal(Buffer.compare(bytesAt("documents/NEX-DO-2026-0001/R0/NEX-DO-2026-0001_Alpha-Tech-Resources.xlsx"), doBytes.bytes), 0);
  const listed = Object.fromEntries(manifest.files.map((f) => [f.path, f.sha256]));
  assert.equal(listed["documents/NEX-QT-2026-0001/R1/NEX-QT-2026-0001_R1_Alpha-Tech-Resources.xlsx"], sha(qt1.bytes));
  // restricted content is not in the bundle at all
  assert.equal([...files.keys()].some((n) => /facility|EMP/i.test(n)), false);
  assert.equal(JSON.stringify(manifest.documents).includes("Bank facility letter"), false, "a left-out document is not described in the documents list");
  assert.equal(JSON.stringify(manifest.excluded).includes("Bank facility letter"), true, "but its exclusion is recorded");
  assert.equal(Buffer.concat([...files.values()].map((v) => Buffer.from(v))).includes(Buffer.from("OD,100000")), false);
  // revisions, sync events, approvals, audit
  const qtDoc = manifest.documents.find((d) => d.document_number === "NEX-QT-2026-0001");
  assert.deepEqual(qtDoc.revisions.map((r) => r.revision), ["R0", "R1"]);
  const qtTx = manifest.transactions.find((t) => t.transaction_id === "NEX-QT-2026-0001");
  assert.ok(qtTx.sync_events.some((e) => e.outcome === "CREATED"), "the BizKick sync event is in the manifest");
  assert.ok(qtTx.revisions.length >= 1);
  const outDoc = manifest.documents.find((d) => d.document_number === "WR-0001-OUT");
  const approval = outDoc.revisions[0].approvals.find((a) => a.kind === "OUTPUT_REVIEW");
  assert.deepEqual([approval.decision, approval.notes], ["APPROVED_FOR_CLIENT_DRAFT", "Matches the statement"]);
  assert.ok(approval.by_actor_id && approval.at, "who and when are recorded");
  const auditExtract = JSON.parse(text("evidence/audit_extract.json"));
  assert.ok(auditExtract.events.length > 0 && auditExtract.events.every((e) => !("payload" in e)), "audit extract has no payloads");
  assert.ok(auditExtract.events.some((e) => e.action === "edcs.file_linked" || e.action === "file.uploaded" || /document/.test(e.action)), "document events are in the extract");
  const cover = text("cover.html");
  assert.ok(cover.includes(passport.number) && cover.includes("Bank loan application") && cover.includes("Alpha Bank"));
  assert.equal(passport.downloads, 0);
  assert.equal((await get(`/passports/${passport.id}?${q(A)}`, A.h)).passport.downloads, 1, "downloads are counted");

  // ---- 4. a restricted item only when ticked; audited ----
  await fails("POST", "/passports/preview", 400, "VALIDATION_ERROR", { ...A.s, ...base, include_restricted: [empEntry.id] }, A.h);
  const tickedBase = { ...base, include_restricted: [outEntry.id, finEntryId] };
  const plan2 = await previewP(A, tickedBase);
  assert.deepEqual([plan2.items.find((i) => i.entry_id === finEntryId).included, plan2.totals.restricted_included], [true, 2]);
  const made2 = await createP(A, { ...tickedBase, plan_digest: plan2.digest });
  assert.ok(made2.passport.restricted_included.some((d) => d.title === "Bank facility letter" && d.classification === "FINANCE_RESTRICTED"));
  const files2 = zipRead((await downloadPassport(A, made2.passport.id)).buffer);
  assert.ok([...files2.keys()].some((n) => n.includes("bank-facility-letter.csv")), "the ticked restricted document is in the bundle");
  assert.ok(Buffer.from(files2.get("cover.html")).toString("utf8").includes("restricted, included by the owner"));
  assert.equal(JSON.parse(Buffer.from(files2.get("manifest.json")).toString("utf8")).passport.restricted_included.length, 2);
  const store1 = await get(`/mvp/store?tenant_id=${A.s.tenant_id}`, A.h);
  assert.equal(store1.file_objects.find((f) => f.id === made2.passport.bundle_file_id).classification, "FINANCE_RESTRICTED", "the bundle carries the strictest classification inside it");
  assert.equal(store1.file_objects.find((f) => f.id === made.passport.bundle_file_id).classification, "FINANCE_RESTRICTED");

  // ---- 5. HR content vFirm never stored: a fingerprint only ----
  const hrSel = { transaction_ids: ["NEX-EMP-2026-0001"], purpose: "Auditor sample", include_restricted: [empEntry.id], document_ids: [empEntry.id] };
  const hrPlan = await previewP(A, hrSel);
  assert.deepEqual([hrPlan.totals.metadata_only, hrPlan.totals.files_with_content, hrPlan.totals.restricted_included], [1, 0, 1]);
  const hr = await createP(A, { ...hrSel, plan_digest: hrPlan.digest });
  const hrFiles = zipRead((await downloadPassport(A, hr.passport.id)).buffer);
  assert.equal([...hrFiles.keys()].some((n) => n.startsWith("documents/")), false, "no HR bytes in the bundle");
  const hrDoc = JSON.parse(Buffer.from(hrFiles.get("manifest.json")).toString("utf8")).documents[0];
  assert.deepEqual([hrDoc.revisions[0].content, hrDoc.revisions[0].file.path, hrDoc.revisions[0].file.sha256], ["METADATA_ONLY", null, sha(emp.bytes)], "the fingerprint is the real file's SHA-256");
  assert.equal((await verifyBundleEntries(hrFiles, hr.passport.seal)).ok, true);

  // ---- period and empty passports ----
  const farPlan = await previewP(A, { document_ids: [qtEntry.id], revisions: "ALL", period: { from: "2030-01-01", to: "2030-12-31" }, purpose: "Future" });
  assert.deepEqual(farPlan.items.map((i) => i.reason), ["NO_REVISION_IN_PERIOD"]);
  await fails("POST", "/passports", 400, "VALIDATION_ERROR", { ...A.s, document_ids: [qtEntry.id], revisions: "ALL", period: { from: "2030-01-01", to: "2030-12-31" }, purpose: "Future", plan_digest: farPlan.digest }, A.h);

  // ---- 6. the stored bundle is re-verified; a changed byte is refused ----
  const fileRec = store1.file_objects.find((f) => f.id === made.passport.bundle_file_id);
  const onDisk = join(tmp, "files", fileRec.storage_key);
  const original = await readFile(onDisk);
  const okVerify = await get(`/passports/${passport.id}/verify?${q(A)}`, A.h);
  assert.equal(okVerify.ok, true);
  assert.equal(okVerify.files_verified, okVerify.files_listed);
  const flipped = Buffer.from(original); flipped[Math.floor(flipped.length / 2)] ^= 0xff;
  await writeFile(onDisk, flipped);
  const bad = await downloadPassport(A, passport.id);
  assert.equal(bad.response.status, 500);
  assert.equal(JSON.parse(bad.buffer.toString("utf8")).error.code, "PASSPORT_INTEGRITY_ERROR", "a tampered bundle is not released");
  const badVerify = await get(`/passports/${passport.id}/verify?${q(A)}`, A.h);
  assert.equal(badVerify.ok, false);
  assert.equal(badVerify.checks[0].ok, false);
  await writeFile(onDisk, original);
  assert.equal((await downloadPassport(A, passport.id)).response.status, 200, "restored bytes download again");

  // ---- 7. isolation, audit, export ----
  assert.deepEqual((await get(`/passports?${q(B)}`, B.h)).passports, [], "another firm sees none");
  await fails("GET", `/passports/${passport.id}?${q(B)}`, 404, "NOT_FOUND", undefined, B.h);
  assert.equal((await downloadPassport(B, passport.id, B.h)).response.status, 404);
  await fails("POST", "/passports/preview", 404, "NOT_FOUND", { ...B.s, document_ids: [qtEntry.id], purpose: "Cross firm" }, B.h);
  await fails("POST", "/passports/preview", 404, "NOT_FOUND", { ...B.s, transaction_ids: ["NEX-QT-2026-0001"], purpose: "Cross firm" }, B.h);
  const cross = await request(`/passports?${q(A)}`, { headers: B.h });
  assert.equal(cross.response.ok, false, "Bravo's owner cannot read Alpha's passports");
  const audit = JSON.stringify(await get(`/audit-events?${q(A)}`, A.h));
  for (const event of ["passport.created", "passport.restricted_included", "passport.downloaded"]) assert.ok(audit.includes(event), `audit has ${event}`);
  assert.ok(audit.includes("Evidence Passport"), "summaries name the passport");
  const exported = JSON.stringify(await get(`/data-protection/export-package?${q(A)}`, A.h));
  assert.ok(exported.includes(passport.number), "the tenant export carries the passports");
  assert.equal(JSON.stringify(await get(`/data-protection/export-package?${q(B)}`, B.h)).includes(passport.number), false);

  console.log(JSON.stringify({
    status: "pass", sprint: "VI-S3", backend: process.env.VFIRM_SMOKE_DATABASE_URL ? "postgres" : "json",
    checked: ["plan: restricted left out unless ticked, fingerprint-only content, period in Malaysia time, chains, unknown ids, stable digest", "seal and verifier: any changed, removed or added file or edited manifest fails; expected seal catches a full rewrite", "owner-only; preview builds nothing; build needs the preview digest", "bundle files byte-identical; manifest has revisions, sync events, approvals and audit extract", "restricted inclusion audited and printed; HR content as fingerprint only", "download re-verifies; a changed byte is refused", "firm isolation, audit, export"]
  }));
} finally {
  await stopApi();
  await rm(tmp, { recursive: true, force: true });
}
