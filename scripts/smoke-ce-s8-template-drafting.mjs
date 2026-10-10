import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { REGISTER_COLUMNS } from "../packages/core-domain/src/edcs-register.mjs";
import { TEMPLATES, computeTotals, draftFilename, fillTemplate, listTemplates, masterBytes, masterSha256, validateCompanyProfile, validateDraftInput } from "../packages/core-domain/src/edcs-templates.mjs";
import { entryBytes, readZip } from "../packages/core-domain/src/xlsx-package.mjs";
import { normalizeConfig } from "../apps/edcs-connector/src/config.mjs";
import { createAgent } from "../apps/edcs-connector/src/agent.mjs";

// CE-S8 (ADR-107, 2026-10-10) -- Connected EDCS: governed drafting into BizKick masters.
//
// Drives the real API over HTTP (and the real connector agent) with the synthetic Nexa Office Supplies (NEX)
// and proves the sprint's acceptance checks:
//   1. a generated Quotation (and Invoice, Purchase Order) has the values in the right cells, every formula,
//      merge, dropdown and the logo of the BizKick master intact, no placeholders left, no formula errors
//      (recalculated with LibreOffice when it is installed)
//   2. the file name and ID follow the numbering standard: the number comes from the Number Authority, the
//      reservation is marked as held by the draft, and turns REGISTERED when BizKick's register carries it
//   3. an unapproved draft cannot be delivered (download or outbox); approval follows the Delegation of
//      Authority and is audited; rejecting or cancelling voids the number, which is never reused
//   4. the connector writes only to _vFirm_Outbox, never overwrites, and only approved drafts
// plus: the master is never changed, owner-only company details, validation, firm isolation, audit events,
// tenant export (without the file bytes). Local JSON backend by default; set VFIRM_SMOKE_DATABASE_URL for a
// fresh, fully-migrated Postgres.

const root = process.cwd();
const fixtures = join(root, "scripts/fixtures/bizkick");
const tmp = await mkdtemp(join(tmpdir(), "vfirm-ce-s8-"));
const apiPort = 3180;
const apiBase = `http://127.0.0.1:${apiPort}`;
const children = [];
let logs = "";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const POLICY_BOOK = "NEX_BK-SYS-003_Master_Control_Workbook.xlsx";
const ACME = "Acme & Sons <Trading> Sdn Bhd";

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
async function request(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${apiBase}${path}`, { method, headers: { "content-type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined });
  const parsed = await response.json().catch(() => ({ ok: false, error: { message: "Non-JSON response" } }));
  return { response, json: parsed };
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
const OTHER_ACTOR = "00000000-0000-4000-8000-0000000000a1";
const APPROVER_ACTOR = "00000000-0000-4000-8000-0000000000b2";
const stamp = Date.now();
let firmCounter = 0;
async function newFirm(label) {
  firmCounter += 1;
  const tenant = await post("/tenants", { name: `CE-S8 ${label} Tenant ${stamp}-${firmCounter}` });
  const seed = await post("/firms", { tenant_id: tenant.id, name: `CE-S8 ${label} Firm ${stamp}-${firmCounter}`, principal_name: `${label} Owner` });
  const firm = seed.firm;
  const as = (role, actorId = seed.principal_actor.id) => headersFor(actorId, firm, role);
  return { firm, h: as("principal"), as, staff: as("PILOT_OPERATOR"), s: { tenant_id: firm.tenant_id, firm_id: firm.id }, label };
}
const q = (ctx) => `tenant_id=${ctx.s.tenant_id}&firm_id=${ctx.s.firm_id}`;

// ---------------- reading a generated workbook (the test's own, independent of the filler) ----------------

const SHEET_PART = { "BK-SAL-001": "xl/worksheets/sheet2.xml", "BK-SAL-004": "xl/worksheets/sheet2.xml", "BK-PRO-004": "xl/worksheets/sheet3.xml" };
const SETUP_PART = "xl/worksheets/sheet1.xml";
const partText = (zip, name) => entryBytes(zip.find((entry) => entry.name === name)).toString("utf8");
function cell(xml, ref) {
  const match = new RegExp(`<(?:[A-Za-z0-9]+:)?c r="${ref}"([^>]*?)(?:/>|>([\\s\\S]*?)</(?:[A-Za-z0-9]+:)?c>)`).exec(xml);
  if (!match) return undefined;
  const inner = match[2] ?? "";
  const value = /<(?:[A-Za-z0-9]+:)?v>([\s\S]*?)<\/(?:[A-Za-z0-9]+:)?v>/.exec(inner)?.[1];
  return { text: value === undefined ? null : value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&"), formula: /<(?:[A-Za-z0-9]+:)?f[ >/]/.test(inner), attrs: match[1] };
}
const countOf = (text, pattern) => (text.match(pattern) ?? []).length;
const fingerprint = (zip) => Object.fromEntries(zip.map((entry) => [entry.name, `${entry.crc}|${entry.size}`]));

// ---------------- the register (to prove the number turns REGISTERED on import) ----------------

const HEADER = REGISTER_COLUMNS.map((c) => c.header);
function registerRow({ type, seq, counterparty, amount }) {
  return ["NEX", type, 2026, seq, "", "R0", "2026-10-12", "2026-10-12", "Customer", counterparty, `${type} ${seq}`, amount, "MYR", "Issued", "Owner", "2026-12-31", "", "", "", "", "", "2026-10-12", "", ""];
}
const toCsv = (rows) => ["BizKick EDCS", "", "", "", "", HEADER.join(","), ...rows.map((cells) => cells.join(","))].join("\n");

async function snapshot(dir) {
  const out = {};
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) await walk(path);
      else { const info = await stat(path); out[relative(dir, path)] = `${info.size}|${sha(await readFile(path))}`; }
    }
  }
  await walk(dir);
  return out;
}

const company = { legal_name: "Nexa Office Supplies Sdn Bhd", registration_no: "202101012345 (1234567-A)", tax_id: "C20123456789", address: "12 Jalan Contoh\n50450 Kuala Lumpur", telephone: "03-2000 1234", email: "accounts@nexa.example", bank_name: "Maybank", bank_account_name: "Nexa Office Supplies Sdn Bhd", bank_account_no: "514012345678", default_tax_rate: 6, default_payment_days: 30, default_validity_days: 30, default_delivery_days: 14 };
const quotation = (extra = {}) => ({
  template_id: "BK-SAL-001", issue_date: "2026-10-12",
  fields: { counterparty_name: ACME, attention: "Mr Lee", address: "9 Jalan Pelanggan\n47300 Petaling Jaya", counterparty_tin: "C99887766", counterparty_reg_no: "198801001111", counterparty_email: "lee@acme.example", counterparty_phone: "03-7777 8888", reference: "RFQ-0042", prepared_by: "Aina" },
  items: [{ description: "A4 paper \"Premium\" 80gsm (5 reams)", qty: 4, unit: "box", unit_price: 125, discount_percent: 10 }, { description: "Installation & set-up", qty: 1, unit: "service", unit_price: 250.5 }],
  notes: "Delivery within 7 days of order.", other_charges: 10, additional_discount: 5, ...extra
});
const purchase = (amount, extra = {}) => ({
  template_id: "BK-PRO-004", issue_date: "2026-10-12",
  fields: { counterparty_name: "Supplier Teknik Sdn Bhd", attention: "Puan Sara", delivery_location: "Nexa warehouse, Shah Alam" },
  items: [{ description: "Laser printer toner", qty: 1, unit: "lot", unit_price: amount }], overrides: { tax_rate: 0 }, ...extra
});

try {
  // =============== the pure engine ===============
  const templates = listTemplates();
  assert.deepEqual(templates.map((t) => t.id).sort(), ["BK-PRO-004", "BK-SAL-001", "BK-SAL-004"]);
  assert.deepEqual(templates.map((t) => t.document_type).sort(), ["INV", "PO", "QT"]);
  assert.equal(validateCompanyProfile({}).ok, false, "the legal name is required");
  assert.equal(validateCompanyProfile({ legal_name: "X", default_tax_rate: 120 }).ok, false);
  assert.equal(validateCompanyProfile({ legal_name: "X", default_payment_days: 1.5 }).ok, false);
  const bad = validateDraftInput("BK-SAL-001", { fields: {}, items: [{ description: "", qty: 0, unit_price: -1, discount_percent: 120, unit: "bag" }], issue_date: "12-10-2026" }, { today: "2026-10-10" });
  assert.equal(bad.ok, false);
  for (const text of ["Customer / company is required", "Issue date", "description is required", "quantity must be more than 0", "unit price", "discount", "unit must be one of"]) assert.ok(bad.errors.join(" ").includes(text), `validation says: ${text}`);
  assert.equal(validateDraftInput("BK-SAL-001", { fields: { counterparty_name: "A" }, items: [] }, { today: "2026-10-10" }).ok, false, "at least one line");
  assert.equal(validateDraftInput("BK-SAL-001", { fields: { counterparty_name: "A" }, items: Array.from({ length: 13 }, () => ({ description: "x", qty: 1, unit_price: 1 })) }, { today: "2026-10-10" }).ok, false, "the template holds 12 lines");
  assert.equal(validateDraftInput("NOPE", {}, { today: "2026-10-10" }).ok, false);
  const good = validateDraftInput("BK-SAL-001", quotation(), { today: "2026-10-10" });
  assert.equal(good.ok, true, JSON.stringify(good));
  const totals = computeTotals(good.value, 6);
  assert.ok(Math.abs(totals.subtotal - 700.5) < 1e-9 && Math.abs(totals.tax - 42.03) < 1e-9 && Math.abs(totals.grand - 747.53) < 1e-9, `totals ${JSON.stringify(totals)}`);
  assert.equal(draftFilename({ transaction_id: "NEX-QT-2026-0001", counterparty: ACME, templateName: "Quotation" }), "NEX-QT-2026-0001_Acme-Sons-Trading-Sdn-Bhd_Quotation.xlsx");
  assert.ok(draftFilename({ transaction_id: "NEX-QT-2026-0001", counterparty: "../../etc/passwd", templateName: "Quotation" }).startsWith("NEX-QT-2026-0001_etc-passwd"), "a counterparty name can never make a path");

  // ---- ACCEPTANCE 1: values in the right cells, everything else of the master intact ----
  const libreOffice = spawnSync("soffice", ["--version"], { encoding: "utf8" }).status === 0;
  for (const [id, template] of Object.entries(TEMPLATES)) {
    const isPo = id === "BK-PRO-004";
    const input = isPo ? purchase(1000) : quotation({ template_id: id });
    const checked = validateDraftInput(id, input, { today: "2026-10-10" });
    assert.equal(checked.ok, true, `${id}: ${JSON.stringify(checked)}`);
    const filled = fillTemplate({ templateId: id, company, value: checked.value, transaction_id: `NEX-${template.document_type}-2026-0007`, company_code: "NEX" });
    assert.deepEqual(filled.warnings, [], `${id}: nothing left unfilled: ${JSON.stringify(filled.warnings)}`);
    const master = readZip(masterBytes(id));
    const out = readZip(filled.bytes);
    assert.deepEqual(out.map((e) => e.name), master.map((e) => e.name), `${id}: same parts in the same order`);
    const fpMaster = fingerprint(master);
    const fpOut = fingerprint(out);
    const changed = Object.keys(fpOut).filter((name) => fpOut[name] !== fpMaster[name]).sort();
    assert.deepEqual(changed, ["xl/workbook.xml", SETUP_PART, SHEET_PART[id]].sort(), `${id}: only the Setup sheet, the document sheet and the recalculation flag changed`);
    for (const name of ["xl/styles.xml", "xl/theme/theme1.xml", "xl/media/image.png", "xl/drawings/drawing1.xml"]) if (fpMaster[name]) assert.equal(fpOut[name], fpMaster[name], `${id}: ${name} is byte-identical (styles, theme and logo)`);
    const docMaster = partText(master, SHEET_PART[id]);
    const doc = partText(out, SHEET_PART[id]);
    // The only formula that goes is the date cell's TODAY(): a drafted document carries its own fixed issue date.
    assert.equal(cell(docMaster, template.date_cell).formula, true, `${id}: the master's date is TODAY()`);
    assert.equal(cell(doc, template.date_cell).formula, false, `${id}: the working copy's date is fixed`);
    assert.equal(countOf(doc, /<(?:[A-Za-z0-9]+:)?f[ >/]/g), countOf(docMaster, /<(?:[A-Za-z0-9]+:)?f[ >/]/g) - 1, `${id}: every other formula is still there`);
    assert.equal(countOf(doc, /<(?:[A-Za-z0-9]+:)?mergeCell /g), countOf(docMaster, /<(?:[A-Za-z0-9]+:)?mergeCell /g), `${id}: merged cells kept`);
    assert.equal(countOf(doc, /<(?:[A-Za-z0-9]+:)?dataValidation /g), countOf(docMaster, /<(?:[A-Za-z0-9]+:)?dataValidation /g), `${id}: dropdowns kept`);
    assert.ok(/fullCalcOnLoad="1"/.test(partText(out, "xl/workbook.xml")), `${id}: recalculates when opened`);
    assert.equal(/\{\{[A-Z_]+\}\}/.test(doc + partText(out, SETUP_PART)), false, `${id}: no placeholder left`);
    assert.equal(cell(doc, template.number_cell).text, `NEX-${template.document_type}-2026-0007`, `${id}: the number is in ${template.number_cell}`);
    assert.equal(cell(doc, template.date_cell).text, "46307", `${id}: 12 Oct 2026`);
    assert.equal(cell(doc, "B9").text, isPo ? "Supplier Teknik Sdn Bhd" : ACME, `${id}: the party name (special characters survive)`);
    const first = template.items.first;
    assert.equal(cell(doc, `B${first}`).text, isPo ? "Laser printer toner" : "A4 paper \"Premium\" 80gsm (5 reams)");
    assert.equal(cell(doc, `G${first}`).formula, true, `${id}: the line subtotal is still a formula`);
    assert.equal(cell(doc, template.totals.grand).formula, true, `${id}: the grand total is still a formula`);
    assert.equal(cell(doc, `A${first}`).text, "1", `${id}: line numbers untouched`);
    const setup = partText(out, SETUP_PART);
    assert.equal(cell(setup, "B4").text, company.legal_name);
    assert.equal(cell(setup, template.prefix_cell).text, `NEX-${template.document_type}`);
    assert.equal(sha(masterBytes(id)), masterSha256(id), `${id}: filling a copy never changes the master`);

    // recalculated by LibreOffice (when installed): no formula errors, the grand total agrees
    if (libreOffice) {
      const dir = join(tmp, `lo-${id}`);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, "in.xlsx"), filled.bytes);
      const convert = spawnSync("soffice", ["--headless", "--convert-to", "csv:Text - txt - csv (StarCalc):44,34,76,1,,0,false,true,false,false,false,-1", "--outdir", dir, join(dir, "in.xlsx")], { encoding: "utf8", timeout: 120000 });
      const files = (await readdir(dir)).filter((name) => name.endsWith(".csv"));
      assert.ok(files.length >= 2, `${id}: LibreOffice opened the file (${convert.stderr})`);
      const csv = (await Promise.all(files.map((name) => readFile(join(dir, name), "utf8")))).join("\n");
      assert.equal(/#(REF!|NAME\?|VALUE!|DIV\/0!|N\/A|NUM!)|Err:\d+/.test(csv), false, `${id}: no formula errors after recalculation`);
      const expected = computeTotals(checked.value, isPo ? 0 : company.default_tax_rate).grand.toFixed(2).replace(/\.00$/, "");
      assert.ok(csv.includes(expected), `${id}: the recalculated total ${expected} appears`);
    }
  }

  // =============== the API ===============
  start("api", ["apps/api/src/server.mjs"], {
    VFIRM_API_PORT: String(apiPort),
    ...(process.env.VFIRM_SMOKE_DATABASE_URL ? {} : { VFIRM_STORE_PATH: join(tmp, "store.json") }),
    DATABASE_URL: process.env.VFIRM_SMOKE_DATABASE_URL ?? "",
    VFIRM_STORE_BACKEND: process.env.VFIRM_SMOKE_DATABASE_URL ? "postgres" : "json",
    VFIRM_FILE_STORAGE_BACKEND: "local", VFIRM_FILE_LOCAL_DIR: join(tmp, "files")
  });
  await waitForJson(`${apiBase}/health`);

  const A = await newFirm("Alpha");
  const B = await newFirm("Bravo");
  const C = await newFirm("Charlie"); // no BizKick connection
  const D = await newFirm("Delta");   // connected, but no company details
  for (const ctx of [A, B, D]) await post("/edcs/connection", { ...ctx.s, company_code: "NEX", bizkick_version: "1.0" }, ctx.h);
  // The audit trail points at real people. On Postgres the second and third members of Alpha (a maker and an
  // approver) must exist as actors; on the JSON store the identity headers are enough.
  if (process.env.VFIRM_SMOKE_DATABASE_URL) {
    const { default: pg } = await import("pg");
    const client = new pg.Client({ connectionString: process.env.VFIRM_SMOKE_DATABASE_URL });
    await client.connect();
    for (const [id, name] of [[OTHER_ACTOR, "Maker"], [APPROVER_ACTOR, "Approver"]]) {
      await client.query(`insert into actors (id, actor_type, tenant_id, firm_id, display_name, status) values ($1, 'HUMAN', $2, $3, $4, 'ACTIVE') on conflict (id) do nothing`, [id, A.s.tenant_id, A.s.firm_id, `CE-S8 ${name}`]);
    }
    await client.end();
  }

  // ---- company details: typed once, owner only ----
  const before = await get(`/edcs/company?${q(A)}`, A.h);
  assert.equal(before.company, null);
  assert.equal(before.templates.length, 3);
  await fails("POST", "/edcs/company", 403, "EDCS_OWNER_REQUIRED", { ...A.s, ...company }, A.staff);
  await fails("POST", "/edcs/company", 400, "VALIDATION_ERROR", { ...A.s, legal_name: "" }, A.h);
  const saved = await post("/edcs/company", { ...A.s, ...company }, A.h);
  assert.equal(saved.company.legal_name, company.legal_name);
  const again = await post("/edcs/company", { ...A.s, ...company, bank_name: "CIMB" }, A.h);
  assert.equal(again.company.id, saved.company.id, "one company record per firm");
  await post("/edcs/company", { ...A.s, ...company }, A.h);
  assert.equal((await get(`/edcs/company?${q(A)}`, A.h)).company.bank_name, "Maybank");
  assert.equal((await get(`/edcs/company?${q(B)}`, B.h)).company, null, "Bravo has typed nothing");

  // ---- drafting guards ----
  await fails("POST", "/edcs/drafts", 409, "EDCS_NOT_CONNECTED", { ...C.s, ...quotation() }, C.h);
  await fails("POST", "/edcs/drafts", 409, "COMPANY_DETAILS_REQUIRED", { ...D.s, ...quotation() }, D.h);
  await fails("POST", "/edcs/drafts", 400, "VALIDATION_ERROR", { ...A.s, ...quotation({ items: [] }) }, A.h);
  await fails("POST", "/edcs/drafts", 400, "VALIDATION_ERROR", { ...A.s, ...quotation({ template_id: "BK-NOPE-001" }) }, A.h);
  assert.equal((await get(`/edcs/numbers?${q(A)}`, A.h)).reservations.length, 0, "a refused draft reserves no number");

  // ---- ACCEPTANCE 2: the number comes from the Number Authority ----
  const made = await post("/edcs/drafts", { ...A.s, ...quotation() }, A.staff); // any signed-in member may prepare
  const d1 = made.draft;
  assert.equal(d1.transaction_id, "NEX-QT-2026-0001");
  assert.equal(d1.status, "PENDING_APPROVAL");
  assert.equal(d1.filename, "NEX-QT-2026-0001_Acme-Sons-Trading-Sdn-Bhd_Quotation.xlsx", "BK-SYS-006: the Transaction ID is in the file name");
  assert.equal(d1.file_b64, undefined, "the file bytes are never in a JSON response");
  assert.equal(d1.has_file, true);
  assert.ok(Math.abs(d1.totals.grand - 747.53) < 1e-9);
  assert.equal(d1.master_sha256, masterSha256("BK-SAL-001"));
  assert.notEqual(d1.file_sha256, d1.master_sha256);
  const numbers = await get(`/edcs/numbers?${q(A)}`, A.h);
  const held = numbers.reservations.find((r) => r.transaction_id === "NEX-QT-2026-0001");
  assert.equal(held.status, "RESERVED");
  assert.equal(held.draft_id, d1.id, "the reservation is marked as held by the draft");
  await fails("POST", "/edcs/numbers/void", 409, "NUMBER_HAS_DRAFT", { ...A.s, transaction_id: "NEX-QT-2026-0001", reason: "try to bypass" }, A.h);
  const next = await post("/edcs/numbers/reserve", { ...A.s, document_type: "QT", year: 2026, purpose: "Manual number" }, A.h);
  assert.equal(next.reservation.transaction_id, "NEX-QT-2026-0002", "the Number Desk continues after a drafted number");

  // ---- ACCEPTANCE 3: an unapproved draft cannot be delivered ----
  const url = (draft, tail = "") => `/edcs/drafts/${draft.id}${tail}?${q(A)}`;
  await fails("GET", url(d1, "/download"), 409, "DRAFT_NOT_APPROVED", undefined, A.h);
  const listed = await get(`/edcs/drafts?${q(A)}`, A.h);
  assert.equal(listed.drafts.length, 1);
  assert.equal(JSON.stringify(listed).includes("file_b64"), false);
  const read = await get(url(d1), A.h);
  assert.equal(read.draft.input.items.length, 2);
  const check = await post("/edcs/drafts/check", { ...A.s, draft_id: d1.id }, A.staff);
  assert.equal(check.would_allow, false, "a member without authority cannot release it");
  await fails("POST", "/edcs/drafts/approve", 409, "DELEGATION_APPROVER_REQUIRED", { ...A.s, draft_id: d1.id }, A.staff);
  assert.equal((await get(url(d1), A.h)).draft.status, "PENDING_APPROVAL", "a refused approval changes nothing");
  assert.equal((await post("/edcs/drafts/check", { ...A.s, draft_id: d1.id }, A.h)).would_allow, true, "the owner may approve");
  await fails("POST", "/edcs/drafts/approve", 404, "NOT_FOUND", { ...A.s, draft_id: "00000000-0000-4000-8000-00000000dead" }, A.h);

  // connector: set up now so the outbox can be shown to ignore pending drafts
  const issued = await post("/edcs/connectors", { ...A.s, name: "Office PC", topology: "A" }, A.h);
  const asConnector = { "x-vfirm-connector-token": issued.token };
  await fails("POST", "/edcs/connector/outbox", 401, "CONNECTOR_TOKEN_INVALID", {}, { "x-vfirm-connector-token": "vfc_notarealtokennotarealtoken12" });
  await fails("POST", "/edcs/connector/outbox", 401, null, {}, {});
  assert.deepEqual((await post("/edcs/connector/outbox", {}, asConnector)).items, [], "the outbox holds no unapproved draft");
  await fails("POST", "/edcs/connector/outbox/ack", 409, "DRAFT_NOT_APPROVED", { draft_id: d1.id, sha256: d1.file_sha256 }, asConnector);

  // approve -> download
  const approved = await post("/edcs/drafts/approve", { ...A.s, draft_id: d1.id }, A.h);
  assert.equal(approved.draft.status, "APPROVED");
  assert.ok(approved.draft.approved_at && approved.draft.approved_by);
  await fails("POST", "/edcs/drafts/approve", 409, "DRAFT_NOT_PENDING", { ...A.s, draft_id: d1.id }, A.h);
  const download = await fetch(`${apiBase}${url(d1, "/download")}`, { headers: A.staff });
  assert.equal(download.status, 200);
  assert.equal(download.headers.get("content-type"), XLSX);
  assert.ok((download.headers.get("content-disposition") ?? "").includes("NEX-QT-2026-0001"));
  const bytes = Buffer.from(await download.arrayBuffer());
  assert.equal(sha(bytes), d1.file_sha256, "the download is exactly the approved file");
  assert.equal(download.headers.get("x-vfirm-file-sha256"), d1.file_sha256);
  const dz = readZip(bytes);
  assert.equal(cell(partText(dz, SHEET_PART["BK-SAL-001"]), "J3").text, "NEX-QT-2026-0001");
  assert.equal(cell(partText(dz, SHEET_PART["BK-SAL-001"]), "B9").text, ACME);
  assert.equal((await get(url(d1), A.h)).draft.status, "DELIVERED");

  // ---- the next sync links it: the reservation turns REGISTERED when BizKick's register carries the row ----
  const csv = toCsv([registerRow({ type: "QT", seq: 1, counterparty: ACME, amount: "747.53" })]);
  const upload = await fetch(`${apiBase}/files/upload?${q(A)}&filename=register.csv`, { method: "POST", headers: { "content-type": "text/csv", ...A.h }, body: Buffer.from(csv) });
  const uploaded = (await upload.json()).data;
  const imported = await post("/edcs/register-imports", { ...A.s, file_id: uploaded.id }, A.h);
  assert.equal(imported.run.counts.CREATED, 1);
  assert.equal((await get(url(d1), A.h)).draft.registered, true, "the draft shows REGISTERED once the register carries its number");
  const afterRegister = (await get(`/edcs/numbers?${q(A)}`, A.h)).reservations.find((r) => r.transaction_id === "NEX-QT-2026-0001");
  assert.equal(afterRegister.status, "REGISTERED");

  // ---- reject / cancel: the number is voided and never reused ----
  const d2 = (await post("/edcs/drafts", { ...A.s, ...quotation() }, A.staff)).draft;
  assert.equal(d2.transaction_id, "NEX-QT-2026-0003", "0002 was reserved by hand, so the draft takes the next free number");
  await fails("POST", "/edcs/drafts/reject", 400, "VALIDATION_ERROR", { ...A.s, draft_id: d2.id, reason: "" }, A.h);
  await fails("POST", "/edcs/drafts/reject", 409, "DELEGATION_APPROVER_REQUIRED", { ...A.s, draft_id: d2.id, reason: "not my call" }, A.as("PILOT_OPERATOR", OTHER_ACTOR));
  const rejected = await post("/edcs/drafts/reject", { ...A.s, draft_id: d2.id, reason: "Wrong customer address" }, A.h);
  assert.equal(rejected.draft.status, "REJECTED");
  assert.equal((await get(`/edcs/numbers?${q(A)}`, A.h)).reservations.find((r) => r.transaction_id === "NEX-QT-2026-0003").status, "VOID", "the number is released as VOID");
  await fails("GET", url(d2, "/download"), 409, "DRAFT_NOT_APPROVED", undefined, A.h);
  await fails("POST", "/edcs/drafts/approve", 409, "DRAFT_NOT_PENDING", { ...A.s, draft_id: d2.id }, A.h);
  const d3 = (await post("/edcs/drafts", { ...A.s, ...quotation() }, A.staff)).draft;
  assert.equal(d3.transaction_id, "NEX-QT-2026-0004", "a voided number is never issued again");
  await fails("POST", "/edcs/drafts/cancel", 403, "EDCS_OWNER_REQUIRED", { ...A.s, draft_id: d3.id, reason: "changed my mind" }, A.as("PILOT_OPERATOR", OTHER_ACTOR));
  const cancelled = await post("/edcs/drafts/cancel", { ...A.s, draft_id: d3.id, reason: "Customer withdrew" }, A.staff);
  assert.equal(cancelled.draft.status, "CANCELLED", "the person who prepared it may cancel it");

  // ---- Delegation of Authority (CE-S5): the amount is the grand total ----
  const policyFile = await readFile(join(fixtures, POLICY_BOOK));
  const policyUpload = await fetch(`${apiBase}/files/upload?${q(A)}&filename=${POLICY_BOOK}`, { method: "POST", headers: { "content-type": XLSX, ...A.h }, body: policyFile });
  const policyFileRecord = (await policyUpload.json()).data;
  await post("/edcs/delegation/import", { ...A.s, file_id: policyFileRecord.id, label_map: {
    "Procurement Manager": { roles: ["PROCUREMENT_MANAGER"] }, "Finance Manager": { roles: ["FINANCE_MANAGER"] }, "Authorised Manager": { roles: ["AUTHORISED_MANAGER"] },
    "Sales Manager": { roles: ["SALES_MANAGER"] }, "Operations Manager": { roles: ["OPERATIONS_MANAGER"] }, "Owner / Board": { owner: true }
  }, document_types: { PO: "Purchases", PV: "Payments", PCV: "Payments", SA: "Stock adjustments" } }, A.h);
  const maker = A.as("PILOT_OPERATOR", OTHER_ACTOR);
  const po1 = (await post("/edcs/drafts", { ...A.s, ...purchase(3000) }, maker)).draft;
  assert.equal(po1.approval_requirement.tier, 1);
  assert.equal(po1.approval_requirement.approver_label, "Procurement Manager");
  const po2 = (await post("/edcs/drafts", { ...A.s, ...purchase(6000) }, maker)).draft;
  assert.equal(po2.approval_requirement.tier, 2);
  const po3 = (await post("/edcs/drafts", { ...A.s, ...purchase(30000) }, maker)).draft;
  assert.equal(po3.approval_requirement.tier, 3);
  const approver = (role) => A.as(role, APPROVER_ACTOR);
  assert.equal((await post("/edcs/drafts/check", { ...A.s, draft_id: po1.id }, approver("PROCUREMENT_MANAGER"))).would_allow, true);
  assert.equal((await post("/edcs/drafts/check", { ...A.s, draft_id: po2.id }, approver("PROCUREMENT_MANAGER"))).would_allow, false);
  const refused = await fails("POST", "/edcs/drafts/approve", 409, "DELEGATION_APPROVER_REQUIRED", { ...A.s, draft_id: po2.id }, approver("PROCUREMENT_MANAGER"));
  assert.match(refused.error.message, /Finance Manager/);
  assert.match(refused.error.message, /Tier 2/);
  assert.equal((await post("/edcs/drafts/approve", { ...A.s, draft_id: po1.id }, approver("PROCUREMENT_MANAGER"))).draft.status, "APPROVED", "Tier 1 is within a Procurement Manager's authority");
  assert.equal((await post("/edcs/drafts/approve", { ...A.s, draft_id: po2.id }, approver("FINANCE_MANAGER"))).draft.status, "APPROVED");
  await fails("POST", "/edcs/drafts/approve", 409, "DELEGATION_APPROVER_REQUIRED", { ...A.s, draft_id: po3.id }, approver("FINANCE_MANAGER"));
  assert.equal((await post("/edcs/drafts/approve", { ...A.s, draft_id: po3.id }, A.h)).draft.status, "APPROVED", "the owner covers every tier");
  const ownMaker = A.as("FINANCE_MANAGER", OTHER_ACTOR);
  const own = (await post("/edcs/drafts", { ...A.s, ...purchase(6000) }, ownMaker)).draft;
  await fails("POST", "/edcs/drafts/approve", 409, "SELF_APPROVAL_REFUSED", { ...A.s, draft_id: own.id }, ownMaker);
  const noLimit = (await post("/edcs/drafts", { ...A.s, ...quotation() }, A.staff)).draft;
  assert.equal(noLimit.approval_requirement.governed, false, "a quotation has no mapped limit");
  await fails("POST", "/edcs/drafts/approve", 409, "DELEGATION_APPROVER_REQUIRED", { ...A.s, draft_id: noLimit.id }, approver("FINANCE_MANAGER"));
  await post("/edcs/drafts/approve", { ...A.s, draft_id: noLimit.id }, A.h);

  // ---- ACCEPTANCE 4: the connector writes only to _vFirm_Outbox ----
  const bk = join(tmp, "BizKick");
  await mkdir(join(bk, "EDCS"), { recursive: true });
  await mkdir(join(bk, "Sales"), { recursive: true });
  await writeFile(join(bk, "EDCS", "register.csv"), toCsv([registerRow({ type: "QT", seq: 1, counterparty: ACME, amount: "747.53" })]));
  await writeFile(join(bk, "Sales", "BK-SAL-001_Quotation.xlsx"), masterBytes("BK-SAL-001"));
  const raw = { vfirm_url: apiBase, connector_token: issued.token, bizkick_root: bk, register_path: "EDCS/register.csv", state_dir: join(tmp, "state"), controlled_folders: ["Sales"], watch: false, retry: { base_ms: 50, max_ms: 400 } };
  // outbox off (the default): nothing is written and nothing is acknowledged
  const off = createAgent({ config: normalizeConfig(raw, { env: {} }) });
  const beforeOff = await snapshot(bk);
  await off.runCycle();
  assert.deepEqual(await snapshot(bk), beforeOff, "with the outbox off the connector wrote nothing in BizKick");
  assert.equal((await readdir(bk)).includes("_vFirm_Outbox"), false);
  const pendingNow = (await post("/edcs/connector/outbox", {}, asConnector)).items;
  assert.ok(pendingNow.length >= 3, "approved drafts wait for the outbox");
  for (const item of pendingNow) {
    assert.equal(sha(Buffer.from(item.content_base64, "base64")), item.sha256, "each item carries its own hash");
    assert.ok(item.filename.startsWith("NEX-"), "named by Transaction ID");
  }
  assert.equal(JSON.stringify(pendingNow).includes(d2.id), false, "a rejected draft is never offered");

  const on = createAgent({ config: normalizeConfig({ ...raw, outbox_enabled: true, state_dir: join(tmp, "state-on") }, { env: {} }) });
  // an existing file with the same name but other bytes must never be overwritten
  const clashName = pendingNow[0].filename;
  await mkdir(join(bk, "_vFirm_Outbox"), { recursive: true });
  await writeFile(join(bk, "_vFirm_Outbox", clashName), "someone else's file");
  const outer = await snapshot(bk);
  const cycleOne = await on.runCycle();
  assert.ok(cycleOne.outbox.placed >= 2, `placed ${JSON.stringify(cycleOne.outbox)}`);
  assert.equal(cycleOne.outbox.conflicts, 1, "the clashing file was left alone");
  assert.equal(await readFile(join(bk, "_vFirm_Outbox", clashName), "utf8"), "someone else's file", "an existing file is never overwritten");
  const after = await snapshot(bk);
  const touched = Object.keys(after).filter((name) => after[name] !== outer[name]);
  assert.ok(touched.length >= 2 && touched.every((name) => name.startsWith("_vFirm_Outbox")), `the connector wrote only inside _vFirm_Outbox: ${touched.join(", ")}`);
  for (const [name, hash] of Object.entries(after)) if (!name.startsWith("_vFirm_Outbox")) assert.equal(hash, outer[name], `${name} untouched`);
  const delivered = (await get(`/edcs/drafts?${q(A)}`, A.h)).drafts;
  assert.ok(delivered.filter((draft) => draft.outbox_written_at).length >= 2, "written drafts are marked");
  assert.equal(delivered.find((draft) => draft.id === po1.id).status, "DELIVERED");
  const written = await readFile(join(bk, "_vFirm_Outbox", po1.filename)).catch(() => null);
  if (po1.filename !== clashName) assert.equal(sha(written), po1.file_sha256, "the outbox file is exactly the approved file");
  const cycleTwo = await on.runCycle();
  assert.equal(cycleTwo.outbox.placed, 0, "nothing is written twice");
  assert.equal(cycleTwo.outbox.conflicts, 1, "the clash is still reported, and still not overwritten");
  assert.deepEqual(await snapshot(bk), after, "the second cycle changed nothing");

  // ---- firm isolation ----
  await fails("GET", `/edcs/drafts/${d1.id}?${q(B)}`, 404, "NOT_FOUND", undefined, B.h);
  assert.equal((await get(`/edcs/drafts?${q(B)}`, B.h)).drafts.length, 0, "Bravo sees none of Alpha's drafts");
  await fails("GET", `/edcs/drafts/${d1.id}/download?${q(B)}`, 404, "NOT_FOUND", undefined, B.h);
  await fails("POST", "/edcs/drafts/approve", 404, "NOT_FOUND", { ...B.s, draft_id: noLimit.id }, B.h);
  await fails("POST", "/edcs/drafts/cancel", 404, "NOT_FOUND", { ...B.s, draft_id: noLimit.id, reason: "not yours" }, B.h);
  assert.equal((await request(`/edcs/drafts?${q(B)}`, { headers: A.h })).response.status, 403, "Alpha's identity cannot read Bravo's drafts");
  assert.equal((await request("/edcs/drafts", { method: "POST", body: { ...B.s, ...quotation() }, headers: A.h })).response.status, 403, "nor draft in Bravo");
  assert.equal((await request("/edcs/company", { method: "POST", body: { ...B.s, ...company }, headers: A.h })).response.status, 403, "nor save Bravo's company details");
  assert.equal((await get(`/edcs/numbers?${q(B)}`, B.h)).reservations.length, 0);
  const bConnector = await post("/edcs/connectors", { ...B.s, name: "Bravo PC", topology: "A" }, B.h);
  assert.deepEqual((await post("/edcs/connector/outbox", {}, { "x-vfirm-connector-token": bConnector.token })).items, [], "Bravo's connector is offered none of Alpha's files");
  await fails("POST", "/edcs/connector/outbox/ack", 404, "NOT_FOUND", { draft_id: d1.id, sha256: d1.file_sha256 }, { "x-vfirm-connector-token": bConnector.token });

  // ---- audit and export ----
  const audit = JSON.stringify(await get(`/audit-events?${q(A)}`, A.h));
  for (const event of ["edcs.company_profile_saved", "edcs.draft_created", "edcs.draft_approved", "edcs.draft_rejected", "edcs.draft_cancelled", "edcs.draft_delivered", "edcs.number_reserved", "edcs.number_voided", "edcs.delegation_denied"]) assert.ok(audit.includes(event), `audit has ${event}`);
  assert.ok(audit.includes("written to the BizKick outbox") && audit.includes("downloaded (first delivery)"), "both delivery channels are audited");
  const exported = JSON.stringify(await get(`/data-protection/export-package?${q(A)}`, A.h));
  assert.ok(exported.includes("edcs_template_drafts") && exported.includes("edcs_company_profiles"), "the export carries the new collections");
  assert.ok(exported.includes(d1.transaction_id) && exported.includes(d1.file_sha256), "with the draft's number and hash");
  assert.equal(exported.includes("file_b64"), false, "but not the file bytes");
  assert.equal(JSON.stringify(await get(`/data-protection/export-package?${q(B)}`, B.h)).includes(d1.transaction_id), false, "Bravo's export carries none of it");

  console.log(JSON.stringify({
    status: "pass", sprint: "CE-S8", backend: process.env.VFIRM_SMOKE_DATABASE_URL ? "postgres" : "json", libreoffice_recalculation: libreOffice,
    checked: ["values in the right cells (Quotation, Invoice, Purchase Order)", "master intact: formulas, merges, dropdowns, styles, logo", "no formula errors (LibreOffice when installed)", "special characters", "number from the Number Authority, held by the draft, REGISTERED on import", "file name carries the Transaction ID", "unapproved draft cannot be delivered (download, outbox)", "approval by Delegation of Authority + self-approval refused", "reject / cancel void the number, never reused", "connector writes only _vFirm_Outbox, never overwrites", "owner-only company details", "validation", "firm isolation", "audit", "export without file bytes"]
  }));
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  for (const child of children) child.kill();
  await sleep(200);
  await rm(tmp, { recursive: true, force: true });
}
