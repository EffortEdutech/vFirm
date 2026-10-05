import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { buildTransactionChains, extractTransactionId, revisionLabelFromFilename } from "../packages/core-domain/src/edcs-chains.mjs";

// CE-S2 (ADR-096, 2026-10-05) -- Connected EDCS: file linking and document history.
//
// Drives the real API over HTTP with the synthetic Nexa Office Supplies (NEX) pack
// (scripts/fixtures/bizkick/ and sample_files/) and proves every CE-S2 acceptance check:
//   1. upload a file named with a Transaction ID -> matched to that transaction
//   2. an unmatched or orphan file is listed for manual linking, never auto-created or stored
//   3. a matched file gets a document register entry numbered with the ID, revision R0, real SHA-256
//   4. the same file twice -> no new revision; a changed file (QT-0001 R0 then R1) -> new revision, prior SUPERSEDED
//   5. an HR file keeps metadata + fingerprint only (no storage key, download refused) until the owner opts in
//   6. the chain view shows QT->SO->DO->INV->RC and flags GRN-0002 (no PO) and DO-0003 (related SO not in register)
// plus: download re-verifies SHA-256, another firm cannot link/read/download, audit events, owner-only writes.
//
// Local JSON backend + local-disk file storage by default; set VFIRM_SMOKE_DATABASE_URL for a fresh,
// fully-migrated Postgres.

const root = process.cwd();
const fixtures = join(root, "scripts/fixtures/bizkick");
const samples = join(fixtures, "sample_files");
const expected = JSON.parse(await readFile(join(fixtures, "expected_outcomes.json"), "utf8"));
const tmp = await mkdtemp(join(tmpdir(), "vfirm-ce-s2-"));
const apiPort = 3172;
const apiBase = `http://127.0.0.1:${apiPort}`;
const children = [];
let logs = "";
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

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
    await new Promise((resolve) => setTimeout(resolve, 100));
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
async function upload(firm, headers, filename, contentType, bytes) {
  const response = await fetch(`${apiBase}/files/upload?tenant_id=${firm.tenant_id}&firm_id=${firm.id}&filename=${encodeURIComponent(filename)}`, { method: "POST", headers: { "content-type": contentType, ...headers }, body: bytes });
  const json = await response.json();
  assert.equal(json.ok, true, `upload ${filename}: ${JSON.stringify(json)}`);
  return json.data;
}
const headersFor = (actorId, firm, role = "principal") => ({ "x-vfirm-actor-id": actorId, "x-vfirm-tenant-id": firm.tenant_id, "x-vfirm-firm-id": firm.id, "x-vfirm-role": role });
const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");
const fixture = (name) => readFile(join(fixtures, name));
const sample = (name) => readFile(join(samples, name));
const stamp = Date.now();
let firmCounter = 0;

async function newFirm(label) {
  firmCounter += 1;
  const tenant = await post("/tenants", { name: `CE-S2 ${label} Tenant ${stamp}-${firmCounter}` });
  const seed = await post("/firms", { tenant_id: tenant.id, name: `CE-S2 ${label} Firm ${stamp}-${firmCounter}`, principal_name: `${label} Owner` });
  const firm = seed.firm;
  return { firm, h: headersFor(seed.principal_actor.id, firm), staff: headersFor(seed.principal_actor.id, firm, "PILOT_OPERATOR"), s: { tenant_id: firm.tenant_id, firm_id: firm.id }, label };
}
const q = (ctx, extra = "") => `tenant_id=${ctx.s.tenant_id}&firm_id=${ctx.s.firm_id}${extra}`;
const mimeFor = (name) => name.endsWith(".csv") ? "text/csv" : name.endsWith(".docx") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : XLSX;

async function linkRaw(ctx, headers, filename, bytes, extra = "") {
  const response = await fetch(`${apiBase}/edcs/files/upload?${q(ctx)}&filename=${encodeURIComponent(filename)}${extra}`, { method: "POST", headers: { "content-type": mimeFor(filename), ...headers }, body: bytes });
  const json = await response.json();
  return { response, json };
}
async function link(ctx, filename, { bytes = null, extra = "", from = samples } = {}) {
  const buffer = bytes ?? await readFile(join(from, filename));
  const { response, json } = await linkRaw(ctx, ctx.h, filename, buffer, extra);
  assert.equal(response.status, 201, `link ${filename}: HTTP ${response.status} ${JSON.stringify(json)}`);
  assert.equal(json.ok, true);
  return { ...json.data, buffer };
}
async function importRegister(ctx, name) {
  const buffer = await fixture(name);
  const response = await fetch(`${apiBase}/files/upload?${q(ctx)}&filename=${encodeURIComponent(name)}`, { method: "POST", headers: { "content-type": XLSX, ...ctx.h }, body: buffer });
  const uploaded = (await response.json()).data;
  return post("/edcs/register-imports", { ...ctx.s, file_id: uploaded.id }, ctx.h);
}
const detail = (ctx, id) => get(`/edcs/transactions/${id}?${q(ctx, `&as_of=${expected.as_of}`)}`, ctx.h);
async function download(ctx, headers, fileId) {
  const response = await fetch(`${apiBase}/files/${fileId}/download?${q(ctx)}`, { headers });
  return { response, bytes: Buffer.from(await response.arrayBuffer()) };
}

try {
  // ---- pure helpers ----
  assert.deepEqual(extractTransactionId("NEX-QT-2026-0001_R1_Alpha.xlsx", "NEX"), { status: "FOUND", transaction_id: "NEX-QT-2026-0001", company_code: "NEX", document_type: "QT", remainder: "_R1_Alpha.xlsx" });
  assert.equal(extractTransactionId("Supplier_price_list_misc.xlsx", "NEX").status, "NONE");
  assert.equal(extractTransactionId("ABC-QT-2026-0001.pdf", "NEX").status, "WRONG_COMPANY");
  assert.equal(extractTransactionId("NEX-ZZ-2026-0001.pdf", "NEX").status, "UNKNOWN_TYPE");
  assert.equal(revisionLabelFromFilename("_R1_Alpha.xlsx"), "R1");
  assert.equal(revisionLabelFromFilename("_RC_notes.xlsx"), null, "an R inside a word is not a revision");

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

  // ---- guards before any connection ----
  const early = await linkRaw(A, A.h, "NEX-QT-2026-0001_R0_Alpha-Tech-Resources.xlsx", await sample("NEX-QT-2026-0001_R0_Alpha-Tech-Resources.xlsx"));
  assert.equal(early.response.status, 409);
  assert.equal(early.json.error.code, "EDCS_NOT_CONNECTED");
  await post("/edcs/connection", { ...A.s, company_code: "NEX", bizkick_version: "1.0" }, A.h);
  await post("/edcs/connection", { ...B.s, company_code: "NEX", bizkick_version: "1.0" }, B.h);
  const staffTry = await linkRaw(A, A.staff, "NEX-QT-2026-0001_R0_Alpha-Tech-Resources.xlsx", await sample("NEX-QT-2026-0001_R0_Alpha-Tech-Resources.xlsx"));
  assert.equal(staffTry.response.status, 403);
  assert.equal(staffTry.json.error.code, "EDCS_OWNER_REQUIRED");
  const crossWrite = await linkRaw({ s: B.s }, A.h, "NEX-QT-2026-0001_R0_Alpha-Tech-Resources.xlsx", await sample("NEX-QT-2026-0001_R0_Alpha-Tech-Resources.xlsx"));
  assert.equal(crossWrite.response.status, 403, "firm A's identity cannot link files into firm B");

  // ---- orphan/unmatched before the register is imported: nothing stored ----
  const beforeImport = await link(A, "NEX-QT-2026-0001_R0_Alpha-Tech-Resources.xlsx");
  assert.equal(beforeImport.outcome, "ORPHAN", "a valid ID whose transaction is not imported yet is an orphan");
  assert.equal(beforeImport.file_id, undefined);

  await importRegister(A, "register_01_baseline.xlsx");
  await importRegister(B, "register_01_baseline.xlsx");

  // ---- acceptance 1 + 3: match by ID, register entry, R0, real SHA-256 ----
  const r0Bytes = await sample("NEX-QT-2026-0001_R0_Alpha-Tech-Resources.xlsx");
  const r0 = await link(A, "NEX-QT-2026-0001_R0_Alpha-Tech-Resources.xlsx");
  assert.equal(r0.outcome, "LINKED");
  assert.equal(r0.transaction_id, "NEX-QT-2026-0001");
  assert.equal(r0.revision, "R0");
  assert.equal(r0.method, "FILENAME");
  assert.equal(r0.sha256, sha(r0Bytes), "the real SHA-256 of the uploaded bytes");
  assert.equal(r0.content_stored, true);
  let docs = (await detail(A, "NEX-QT-2026-0001")).documents;
  assert.equal(docs.linked, true);
  assert.equal(docs.document.document_number, "NEX-QT-2026-0001", "register entry numbered with the Transaction ID");
  assert.equal(docs.current_revision.revision, "R0");
  assert.equal(docs.current_revision.content_hash, sha(r0Bytes));
  assert.equal(docs.revisions.length, 1);
  const register = await get(`/document-register?${q(A)}`, A.h).catch(() => null);
  if (register) assert.ok(JSON.stringify(register).includes("NEX-QT-2026-0001"), "the entry is in the firm's document register");

  // ---- acceptance 4: same file twice -> no new revision ----
  const again = await link(A, "NEX-QT-2026-0001_R0_Alpha-Tech-Resources.xlsx");
  assert.equal(again.outcome, "UNCHANGED");
  docs = (await detail(A, "NEX-QT-2026-0001")).documents;
  assert.equal(docs.revisions.length, 1, "no new revision for identical bytes");

  // ---- acceptance 4: changed file -> new revision, prior SUPERSEDED ----
  const r1 = await link(A, "NEX-QT-2026-0001_R1_Alpha-Tech-Resources.xlsx");
  assert.equal(r1.outcome, "REVISED");
  assert.equal(r1.revision, "R1");
  assert.equal(r1.superseded_revision, "R0");
  docs = (await detail(A, "NEX-QT-2026-0001")).documents;
  assert.equal(docs.revisions.length, 2);
  assert.equal(docs.current_revision.revision, "R1");
  assert.equal(docs.revisions.find((r) => r.revision === "R0").status, "SUPERSEDED");
  assert.equal(docs.revisions.find((r) => r.revision === "R1").status, "CURRENT");
  assert.equal(docs.revisions.find((r) => r.revision === "R1").content_hash, sha(r1.buffer));
  // the older revision's bytes are still retrievable and still verify
  const oldDownload = await download(A, A.h, docs.revisions.find((r) => r.revision === "R0").file_id);
  assert.equal(oldDownload.response.status, 200);
  assert.equal(sha(oldDownload.bytes), sha(r0Bytes), "superseded revision is kept and intact");

  // ---- download re-verifies SHA-256 ----
  const current = await download(A, A.h, docs.current_revision.file_id);
  assert.equal(current.response.status, 200);
  assert.equal(current.response.headers.get("x-vfirm-file-sha256"), sha(r1.buffer));
  assert.equal(sha(current.bytes), sha(r1.buffer));

  // ---- the rest of the sample pack ----
  const results = {};
  for (const name of ["NEX-SO-2026-0001_Alpha-Tech-Resources.xlsx", "NEX-DO-2026-0001_Alpha-Tech-Resources.xlsx", "NEX-INV-2026-0001_Alpha-Tech-Resources.xlsx", "NEX-INV-2026-0002_Beta-Mart.xlsx", "NEX-RC-2026-0001_Alpha-Tech-Resources.xlsx", "NEX-PO-2026-0001_PaperPlus-Trading.xlsx", "NEX-GRN-2026-0001_PaperPlus-Trading.xlsx", "NEX-BR-2026-0002_Bank_Reconciliation.xlsx"]) {
    results[name] = await link(A, name);
    assert.equal(results[name].outcome, "LINKED", name);
    assert.equal(results[name].revision, "R0", `${name} first filing is R0`);
  }
  // identical bytes under two different transactions are two separate, correct filings
  assert.equal(results["NEX-INV-2026-0001_Alpha-Tech-Resources.xlsx"].sha256, results["NEX-INV-2026-0002_Beta-Mart.xlsx"].sha256);
  assert.notEqual(results["NEX-INV-2026-0001_Alpha-Tech-Resources.xlsx"].document_entry_id, results["NEX-INV-2026-0002_Beta-Mart.xlsx"].document_entry_id);
  const csv = await link(A, "NEX-BR-2026-0002_bank_statement_2026-09.csv");
  assert.ok(["REVISED", "LINKED"].includes(csv.outcome) && csv.transaction_id === "NEX-BR-2026-0002", "a second, different file for the same transaction is filed as its next revision");

  // ---- acceptance 2: unmatched / orphan / wrong company -> outcome only ----
  const unmatched = await link(A, "Supplier_price_list_misc.xlsx");
  assert.equal(unmatched.outcome, "UNMATCHED");
  assert.equal(unmatched.transaction_id, undefined);
  const orphan = await link(A, "NEX-QT-2026-0099_R0_Orphan.xlsx");
  assert.equal(orphan.outcome, "ORPHAN");
  assert.equal(orphan.transaction_id, "NEX-QT-2026-0099");
  assert.equal((await get(`/edcs/transactions?${q(A)}`, A.h)).transactions.some((t) => t.transaction_id === "NEX-QT-2026-0099"), false, "an orphan never creates a transaction");
  const wrong = await link(A, "ABC-QT-2026-0001_R0.xlsx", { bytes: Buffer.from("x") });
  assert.equal(wrong.outcome, "WRONG_COMPANY");
  assert.equal((await link(A, "NEX-ZZ-2026-0001.xlsx", { bytes: Buffer.from("x") })).outcome, "UNKNOWN_TYPE");
  // manual link of the unmatched file
  const manualBad = await link(A, "Supplier_price_list_misc.xlsx", { extra: "&transaction_id=NOT-AN-ID" });
  assert.equal(manualBad.outcome, "UNMATCHED");
  const manualOrphan = await link(A, "Supplier_price_list_misc.xlsx", { extra: "&transaction_id=NEX-PO-2026-0777" });
  assert.equal(manualOrphan.outcome, "ORPHAN");
  const manual = await link(A, "Supplier_price_list_misc.xlsx", { extra: "&transaction_id=NEX-PO-2026-0001" });
  assert.equal(manual.outcome, "REVISED", "the owner links the unmatched file by hand to PO-0001 (next revision there)");
  assert.equal(manual.method, "MANUAL");
  assert.equal((await detail(A, "NEX-PO-2026-0001")).documents.revisions.length, 2);

  // ---- acceptance 5: HR file keeps metadata + fingerprint only ----
  const empBytes = await sample("NEX-EMP-2026-0001_Offer_Letter.docx");
  const emp = await link(A, "NEX-EMP-2026-0001_Offer_Letter.docx");
  assert.equal(emp.outcome, "LINKED");
  assert.equal(emp.content_policy, "METADATA_ONLY");
  assert.equal(emp.content_stored, false);
  assert.equal(emp.sha256, sha(empBytes), "fingerprint kept");
  const empDocs = (await detail(A, "NEX-EMP-2026-0001")).documents;
  assert.equal(empDocs.current_revision.content_stored, false);
  assert.equal(empDocs.current_revision.downloadable, false);
  assert.equal(empDocs.current_revision.content_hash, sha(empBytes));
  const exportA = await get(`/data-protection/export-package?${q(A)}`, A.h);
  const empFile = exportA.records.file_objects.find((f) => f.id === emp.file_id);
  assert.ok(empFile, "the file record exists");
  assert.equal(empFile.storage_key ?? null, null, "no storage key for a metadata-only file");
  assert.equal(empFile.status, "METADATA_ONLY");
  assert.equal(empFile.classification, "HR_RESTRICTED");
  const empDownload = await download(A, A.h, emp.file_id);
  assert.equal(empDownload.response.status, 409, "download of a metadata-only record is refused");
  assert.equal(JSON.parse(empDownload.bytes.toString()).error.code, "FILE_METADATA_ONLY");
  const empAgain = await link(A, "NEX-EMP-2026-0001_Offer_Letter.docx");
  assert.equal(empAgain.outcome, "UNCHANGED");

  // owner opts in -> a later HR file is stored
  await post("/edcs/connection", { ...A.s, company_code: "NEX", hr_content_opt_in: true }, A.h);
  const empChanged = await link(A, "NEX-EMP-2026-0001_Offer_Letter.docx", { bytes: Buffer.concat([empBytes, Buffer.from("changed")]) });
  assert.equal(empChanged.outcome, "REVISED");
  assert.equal(empChanged.content_stored, true, "opt-in lifts the HR policy for new filings");
  const optedDownload = await download(A, A.h, empChanged.file_id);
  assert.equal(optedDownload.response.status, 200);

  // ---- acceptance 6: chain view ----
  const chains = await get(`/edcs/chains?${q(A)}`, A.h);
  const sales = chains.chains.find((c) => c.nodes.some((n) => n.transaction_id === "NEX-QT-2026-0001"));
  // The fixture lists the main line of each chain; a credit note also follows INV-0001, so the chain may hold more.
  const inOrder = (chain, ids, label) => {
    const got = chain.nodes.map((n) => n.transaction_id);
    assert.ok(ids.every((id) => got.includes(id)), `${label}: every expected transaction is in the chain (${got.join(", ")})`);
    assert.deepEqual(got.filter((id) => ids.includes(id)), ids, `${label}: expected order`);
  };
  inOrder(sales, expected.transaction_chains.sales_complete, "QT -> SO -> DO -> INV -> RC");
  assert.deepEqual(sales.nodes.filter((n) => expected.transaction_chains.sales_complete.includes(n.transaction_id)).map((n) => n.depth), [0, 1, 2, 3, 4]);
  assert.equal(sales.nodes.find((n) => n.transaction_id === "NEX-CN-2026-0001").parent_id, "NEX-INV-2026-0001", "the credit note hangs under its invoice");
  const open = chains.chains.find((c) => c.nodes.some((n) => n.transaction_id === "NEX-INV-2026-0002"));
  inOrder(open, expected.transaction_chains.sales_open_invoice, "open invoice chain");
  const proc = chains.chains.find((c) => c.nodes.some((n) => n.transaction_id === "NEX-PO-2026-0001"));
  inOrder(proc, expected.transaction_chains.procurement_complete, "procurement chain");
  const flagFor = (id) => chains.flags.filter((f) => f.transaction_id === id).map((f) => f.flag);
  assert.deepEqual(flagFor("NEX-GRN-2026-0002"), ["MISSING_PREDECESSOR"], "GRN-0002 has no PO");
  assert.deepEqual(flagFor("NEX-DO-2026-0003"), ["RELATED_NOT_FOUND"], "DO-0003's related SO is not in the register");
  assert.equal(chains.flags.filter((f) => ["NEX-QT-2026-0001", "NEX-PO-2026-0001"].includes(f.transaction_id)).length, 0, "complete chains carry no flags");
  const viaDetail = (await detail(A, "NEX-DO-2026-0001")).chain;
  assert.deepEqual(viaDetail.path_to_transaction, ["NEX-QT-2026-0001", "NEX-SO-2026-0001", "NEX-DO-2026-0001"]);
  const pure = buildTransactionChains((await get(`/edcs/transactions?${q(A)}`, A.h)).transactions);
  assert.equal(pure.chains.filter((c) => !c.trivial).length, chains.chains.length, "API and pure builder agree");

  // ---- transaction summary reflects the filing ----
  const qt = (await detail(A, "NEX-QT-2026-0001")).transaction;
  assert.equal(qt.documents.current_revision, "R1");
  assert.equal(qt.documents.revision_count, 2);
  assert.equal(qt.documents.sha256, sha(r1.buffer));

  // ---- isolation ----
  const bDocs = (await detail(B, "NEX-QT-2026-0001")).documents;
  assert.equal(bDocs.linked, false, "firm B sees none of firm A's files");
  const crossDownload = await download(B, B.h, docs.current_revision.file_id);
  assert.equal(crossDownload.response.status, 404, "firm B cannot download firm A's file by id");
  const crossRead = await fetch(`${apiBase}/edcs/transactions/NEX-QT-2026-0001?${q(A)}`, { headers: B.h });
  assert.equal(crossRead.status, 403, "firm B's identity cannot read firm A's scope");
  const bLink = await link(B, "NEX-QT-2026-0001_R0_Alpha-Tech-Resources.xlsx");
  assert.equal(bLink.outcome, "LINKED", "same ID in another firm is its own register entry");
  assert.equal((await detail(A, "NEX-QT-2026-0001")).documents.revisions.length, 2, "firm A's history untouched by firm B");

  // ---- audit ----
  const audit = JSON.stringify(await get(`/audit-events?${q(A)}`, A.h));
  assert.ok(audit.includes("edcs.file_linked"), "audit: edcs.file_linked");
  assert.ok(audit.includes("edcs.file_revised"), "audit: edcs.file_revised");
  assert.ok(audit.includes("file.downloaded"), "audit: file.downloaded");
  assert.equal((audit.match(/edcs\.file_linked/g) ?? []).length >= 10, true);

  // ---- export carries the register entries and file records ----
  assert.ok(exportA.records.document_register_entries.some((e) => e.document_number === "NEX-QT-2026-0001"));
  assert.ok(exportA.records.document_revision_records.filter((r) => r.metadata?.transaction_id === "NEX-QT-2026-0001").length === 2);

  console.log(JSON.stringify({
    smoke: "ce-s2-file-linking",
    result: "passed",
    backend: process.env.VFIRM_SMOKE_DATABASE_URL ? "postgres" : "json",
    acceptance: ["match_by_id", "unmatched_and_orphan_listed_not_stored", "register_entry_r0_real_sha256", "same_file_no_new_revision", "changed_file_supersedes_prior", "hr_metadata_only_no_storage_key_download_refused", "chain_view_and_missing_link_flags"],
    guards_confirmed: ["owner_only", "not_connected_refused", "other_firm_cannot_link_read_or_download", "download_reverifies_sha256", "hr_opt_in_stores_later_filings", "manual_link_by_owner", "audit_events"]
  }, null, 2));
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  for (const child of children) if (child.exitCode === null && !child.killed) child.kill();
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await rm(tmp, { recursive: true, force: true });
}
