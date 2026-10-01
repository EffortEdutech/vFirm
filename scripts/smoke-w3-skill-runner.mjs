import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { deflateRawSync } from "node:zlib";

// ADR-092 W3 (2026-10-01) -- the skill runner: hired workers process the owner's real inputs.
//
//  - Request types advertise which are runnable, their form fields and their named file slots.
//  - FAO-11 bank reconciliation over a real XLSX bank statement (title row, withdrawal/deposit
//    columns, Excel dates) + a CSV cash book (debit/credit): run-skill -> draft whose payload is
//    the real reconciliation, plus a downloadable CSV output (FINANCE_RESTRICTED) whose
//    generation record names the input files and their SHA-256. Revision with a replacement
//    bank file -> revision 2 reconciles. Approve -> complete internal.
//  - Missing input: run refused 422 SKILL_INPUT_REQUIRED, item stays Pending with the reason;
//    owner adds the missing file -> run succeeds (unlabelled files matched by name).
//  - SAO-03: missing required field -> "Fill in"; owner updates inputs -> scored.
//  - OPO-09 over a queues file; ARO-01 over a .txt request; ARO-10 (Class A) catches the
//    segregation-of-duties conflict and still needs owner Class A approval.
//  - Non-runnable type: run refused, empty placeholder refused, owner-attached output accepted.
//  - Guards: cross-firm run/update refused; unknown form keys dropped; spreadsheet formula
//    injection in an input cannot become a live formula in the output CSV.
//
// Local JSON backend + local-disk file storage by default; set VFIRM_SMOKE_DATABASE_URL for Postgres.

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-w3-runner-"));
const apiPort = 3151;
const apiBase = `http://127.0.0.1:${apiPort}`;
const children = [];
let logs = "";

function start(name, args, env) {
  const child = spawn(process.execPath, args, { cwd: root, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  child.stdout.on("data", (chunk) => { logs += `[${name}] ${chunk}`; });
  child.stderr.on("data", (chunk) => { logs += `[${name}] ${chunk}`; });
  return child;
}
async function waitForJson(url) {
  const started = Date.now();
  while (Date.now() - started < 10000) {
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
async function postExpectFailure(path, body, headers = {}) {
  const { response, json } = await request(path, { method: "POST", body, headers });
  assert.notEqual(json.ok, true, `${path} unexpectedly succeeded: ${JSON.stringify(json)}`);
  return { status: response.status, ...json };
}
async function upload(firm, headers, filename, contentType, bytes) {
  const response = await fetch(`${apiBase}/files/upload?tenant_id=${firm.tenant_id}&firm_id=${firm.id}&filename=${encodeURIComponent(filename)}`, { method: "POST", headers: { "content-type": contentType, ...headers }, body: bytes });
  const json = await response.json();
  assert.equal(json.ok, true, `upload ${filename}: ${JSON.stringify(json)}`);
  return json.data;
}
async function download(firm, headers, fileId) {
  const response = await fetch(`${apiBase}/files/${fileId}/download?tenant_id=${firm.tenant_id}&firm_id=${firm.id}`, { headers });
  assert.equal(response.status, 200, `download ${fileId}`);
  return Buffer.from(await response.arrayBuffer());
}
function authHeaders(actorId, firm) {
  return { "x-vfirm-actor-id": actorId, "x-vfirm-tenant-id": firm.tenant_id, "x-vfirm-firm-id": firm.id, "x-vfirm-role": "principal" };
}
const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");

// ---- a real .xlsx built from scratch (zip + SpreadsheetML), independent of the reader ----
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(buffer) { let c = 0xffffffff; for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function zip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, text] of entries) {
    const data = Buffer.from(text, "utf8");
    const compressed = deflateRawSync(data);
    const nameBuf = Buffer.from(name, "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc32(data), 14); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nameBuf.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc32(data), 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(nameBuf.length, 28); central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, compressed);
    centrals.push(central, nameBuf);
    offset += local.length + nameBuf.length + compressed.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(centralBuf.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}
function buildXlsx(rows) {
  const strings = [];
  const si = (text) => { let i = strings.indexOf(text); if (i < 0) { strings.push(text); i = strings.length - 1; } return i; };
  const col = (i) => String.fromCharCode(65 + i);
  const sheetRows = rows.map((row, r) => `<row r="${r + 1}">${row.map((cell, c) => {
    if (cell === null || cell === undefined || cell === "") return "";
    const ref = `${col(c)}${r + 1}`;
    return typeof cell === "number" ? `<c r="${ref}"><v>${cell}</v></c>` : `<c r="${ref}" t="s"><v>${si(String(cell))}</v></c>`;
  }).join("")}</row>`).join("");
  const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return zip([
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="September" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`],
    ["xl/worksheets/sheet1.xml", `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`],
    ["xl/sharedStrings.xml", `<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">${strings.map((t) => `<si><t>${esc(t)}</t></si>`).join("")}</sst>`]
  ]);
}
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

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
  const stamp = Date.now();
  const tenant = await post("/tenants", { name: `W3 Tenant ${stamp}` });
  const seed = await post("/firms", { tenant_id: tenant.id, name: `W3 Firm ${stamp}`, principal_name: "W3 Owner" });
  const firm = seed.firm;
  const h = authHeaders(seed.principal_actor.id, firm);
  const s = { tenant_id: firm.tenant_id, firm_id: firm.id };
  const otherTenant = await post("/tenants", { name: `W3 Other ${stamp}` });
  const otherSeed = await post("/firms", { tenant_id: otherTenant.id, name: `W3 Other Firm ${stamp}`, principal_name: "Other" });
  const otherFirm = otherSeed.firm;
  const oh = authHeaders(otherSeed.principal_actor.id, otherFirm);

  await post("/ops/awia-package-assignment", { ...s, package_code: "HIRE_ME" }, h);
  const hire = (role_code, display_name, position_id) => post("/awia/virtual-staff/hire-worker", { ...s, role_code, display_name, position_id }, h);
  const bookkeeper = await hire("FAO", "Bookkeeper", "bookkeeper");
  const hrAdmin = await hire("ARO", "HR Administrator", "hr_administrator");
  const sales = await hire("SAO", "Sales Coordinator", "sales_coordinator");
  const ops = await hire("OPO", "Ops Coordinator", "ops_coordinator");
  const clerk = await hire("ARO", "General Clerk", "general_clerk");
  for (const hired of [bookkeeper, hrAdmin, sales, ops, clerk]) await post("/awia/virtual-staff/lifecycle", { ...s, staff_code: hired.staff_code, to_state: "ACTIVE" }, h);

  // ---- request types advertise runnable skills ----
  const types = await get("/work-requests/request-types", h);
  const recon = types.find((t) => t.id === "bank_reconciliation");
  assert.equal(recon.runnable, true);
  assert.deepEqual(recon.file_slots.map((slot) => slot.role), ["bank_statement", "book_entries"]);
  assert.equal(types.find((t) => t.id === "lead_qualification").input_fields.find((f) => f.name === "industry_fit").required, true);
  assert.equal(types.find((t) => t.id === "client_message_draft").runnable, false);
  assert.deepEqual(types.filter((t) => t.runnable).map((t) => t.skill_id).sort(), ["ARO-01", "ARO-10", "FAO-11", "OPO-09", "SAO-03"]);

  // ---- FAO-11 over a real XLSX bank statement + CSV cash book ----
  // Excel serial 46267 = 2026-09-02. The withdrawal row has no reference -> falls back to its description.
  const bankXlsx = buildXlsx([
    ["Maybank current account - statement September 2026"],
    ["Date", "Description", "Reference", "Withdrawal", "Deposit"],
    [46267, "Payment received", "INV-1001", "", 500],
    [46268, "Payment received", "INV-1002", "", "1,120.50"],
    [46270, "Bank charge", "", 2.5, ""],
    [46271, "Payment received", "INV-2001", "", 290],
    [46272, "Closing balance", "", "", ""]
  ]);
  const cashbookCsv = Buffer.from("Date,Ref,Debit,Credit\r\n2026-09-01,INV-1001,500.00,\r\n2026-09-02,INV-1002,\"1,120.50\",\r\n2026-09-03,INV-2001,300,\r\n2026-09-04,\"=HYPERLINK(\"\"http://x\"\")\",75,\r\n");
  const bankFile = await upload(firm, h, "maybank-sep.xlsx", XLSX, bankXlsx);
  const bookFile = await upload(firm, h, "cash-book-sep.csv", "text/csv", cashbookCsv);
  const reconReq = await post("/work-requests", { ...s, title: "Reconcile September bank vs books", request_type_id: "bank_reconciliation", file_ids: [bankFile.id, bookFile.id], file_roles: { [bankFile.id]: "bank_statement", [bookFile.id]: "book_entries", bogus: "bank_statement" }, form_inputs: { unexpected_key: "dropped" }, assign_to_staff_code: bookkeeper.staff_code }, h);
  assert.equal(reconReq.assignment_error, null, JSON.stringify(reconReq));
  assert.deepEqual(reconReq.work_request.file_roles, { [bankFile.id]: "bank_statement", [bookFile.id]: "book_entries" });
  assert.deepEqual(reconReq.work_request.form_inputs, {});
  const reconItem = reconReq.workdesk_item;

  // other firm cannot run this firm's item; empty placeholder draft refused for request work
  await postExpectFailure("/awia/virtual-staff/workdesk-item/run-skill", { tenant_id: otherFirm.tenant_id, firm_id: otherFirm.id, workdesk_item_id: reconItem.id }, oh);
  await postExpectFailure("/awia/virtual-staff/output-draft", { ...s, workdesk_item_id: reconItem.id }, h);

  const ran = await post("/awia/virtual-staff/workdesk-item/run-skill", { ...s, workdesk_item_id: reconItem.id }, h);
  const draft = ran.output_draft;
  assert.equal(ran.workdesk_item.workdesk_status, "OUTPUT_DRAFTED");
  assert.equal(draft.requires_human_review, true);
  assert.equal(draft.final_issue_allowed, false);
  assert.equal(draft.skill_id, "FAO-11");
  const p = draft.output_payload;
  assert.equal(p.reconciled, false);
  assert.equal(p.book_total, 1995.5);
  assert.equal(p.bank_total, 1908);
  assert.equal(p.variance_total, 87.5);
  assert.deepEqual(p.matched.map((m) => m.reference), ["INV-1001", "INV-1002"]);
  assert.deepEqual(p.mismatches.map((m) => [m.reference, m.variance]), [["INV-2001", 10]]);
  assert.equal(p.unmatched_book_entries.length, 1);
  assert.equal(p.unmatched_bank_entries.length, 1);
  assert.equal(p.inputs.bank_statement.rows_used, 4);
  assert.equal(p.inputs.bank_statement.rows_skipped, 1, "closing-balance row (no amount) is skipped");
  assert.equal(draft.generation.method, "DETERMINISTIC_SKILL_MODULE");
  assert.deepEqual(draft.generation.input_files.map((f) => [f.role, f.sha256]), [["bank_statement", sha(bankXlsx)], ["book_entries", sha(cashbookCsv)]]);
  assert.match(draft.output_summary, /2 matched, 1 amount mismatch/);
  const outputCsv = (await download(firm, h, draft.output_file_id)).toString("utf8");
  assert.ok(outputCsv.includes("AMOUNT MISMATCH,INV-2001,3,2026-09-03,300.00,4,2026-09-06,290.00,10.00"), outputCsv);
  assert.ok(outputCsv.includes("IN BANK, NOT IN BOOKS\",Bank charge"), "blank reference falls back to the description");
  assert.ok(outputCsv.includes("'=HYPERLINK"), "formula in an input must be neutralised in the output");
  assert.ok(!/,"?=HYPERLINK/.test(outputCsv));
  const storeAfterRun = await get("/mvp/store", h);
  const outputRecord = storeAfterRun.file_objects.find((f) => f.id === draft.output_file_id);
  assert.equal(outputRecord.purpose, "WORK_OUTPUT");
  assert.equal(outputRecord.classification, "FINANCE_RESTRICTED");
  assert.equal(outputRecord.mime_type, "text/csv");

  // revision: owner asks for a change, swaps in a corrected bank statement, worker re-runs
  await post("/awia/virtual-staff/output-review", { ...s, output_draft_id: draft.id, review_decision: "REVISION_REQUIRED", review_notes: "Use the corrected bank export" }, h);
  const correctedBank = Buffer.from("Date,Reference,Amount\n2026-09-02,INV-1001,500\n2026-09-03,INV-1002,1120.50\n2026-09-05,INV-2001,300\n2026-09-06,\"=HYPERLINK(\"\"http://x\"\")\",75\n");
  const correctedFile = await upload(firm, h, "maybank-sep-v2.csv", "text/csv", correctedBank);
  const swapped = await post("/work-requests/add-files", { ...s, work_request_id: reconReq.work_request.id, file_ids: [correctedFile.id], file_role: "bank_statement" }, h);
  assert.equal(swapped.work_request.file_roles[correctedFile.id], "bank_statement");
  assert.equal(swapped.work_request.file_roles[bankFile.id], undefined, "the new file replaces the old one in its slot");
  const rerun = await post("/awia/virtual-staff/workdesk-item/run-skill", { ...s, workdesk_item_id: reconItem.id }, h);
  assert.equal(rerun.output_draft.revision_number, 2);
  assert.equal(rerun.output_draft.supersedes_output_draft_id, draft.id);
  assert.equal(rerun.output_draft.output_payload.reconciled, true, JSON.stringify(rerun.output_draft.output_payload));
  await post("/awia/virtual-staff/output-review", { ...s, output_draft_id: rerun.output_draft.id, review_decision: "APPROVED_FOR_CLIENT_DRAFT" }, h);
  const completed = await post("/awia/virtual-staff/workdesk-item/complete-internal", { ...s, workdesk_item_id: reconItem.id }, h);
  assert.equal(completed.workdesk_item.workdesk_status, "ARCHIVED_COMPLETED");

  // ---- missing input -> 422, reason recorded, item stays Pending; add the file -> runs ----
  const octBank = await upload(firm, h, "bank-oct.csv", "text/csv", Buffer.from("date,reference,amount\n2026-10-01,INV-3001,250\n"));
  const partial = await post("/work-requests", { ...s, title: "Reconcile October", request_type_id: "bank_reconciliation", file_ids: [octBank.id], assign_to_staff_code: bookkeeper.staff_code }, h);
  const missing = await postExpectFailure("/awia/virtual-staff/workdesk-item/run-skill", { ...s, workdesk_item_id: partial.workdesk_item.id }, h);
  assert.equal(missing.status, 422);
  assert.equal(missing.error.code, "SKILL_INPUT_REQUIRED");
  assert.match(missing.error.message, /Book \/ ledger entries/);
  const pendingItem = (await get("/mvp/store", h)).awia_staff_workdesk_items.find((i) => i.id === partial.workdesk_item.id);
  // ADR-093 W4: the worker now waits on the owner (NEEDS_INFO, shown in the Inbox).
  assert.equal(pendingItem.workdesk_status, "NEEDS_INFO");
  assert.equal(pendingItem.display_status, "inbox");
  assert.match(pendingItem.last_run_error, /Book \/ ledger entries/);
  // an unlabelled file named "ledger" fills the open slot
  const octLedger = await upload(firm, h, "ledger-oct.csv", "text/csv", Buffer.from("date,reference,amount\n2026-10-01,INV-3001,250\n"));
  await post("/work-requests/add-files", { ...s, work_request_id: partial.work_request.id, file_ids: [octLedger.id] }, h);
  const octRun = await post("/awia/virtual-staff/workdesk-item/run-skill", { ...s, workdesk_item_id: partial.workdesk_item.id }, h);
  assert.equal(octRun.output_draft.output_payload.reconciled, true);
  assert.equal(octRun.workdesk_item.last_run_error, null);
  // a spreadsheet without an amount column gets a precise message
  const badLedger = await upload(firm, h, "ledger-nov.csv", "text/csv", Buffer.from("date,reference,note\n2026-11-01,INV-4001,x\n"));
  const novBank = await upload(firm, h, "bank-nov.csv", "text/csv", Buffer.from("date,reference,amount\n2026-11-01,INV-4001,10\n"));
  const nov = await post("/work-requests", { ...s, title: "Reconcile November", request_type_id: "bank_reconciliation", file_ids: [novBank.id, badLedger.id], assign_to_staff_code: bookkeeper.staff_code }, h);
  const noAmount = await postExpectFailure("/awia/virtual-staff/workdesk-item/run-skill", { ...s, workdesk_item_id: nov.workdesk_item.id }, h);
  assert.match(noAmount.error.message, /no amount column\. Found columns: date, reference, note/);

  // ---- SAO-03: required field missing -> Fill in; owner updates inputs -> scored ----
  const lead = await post("/work-requests", { ...s, title: "Score the Kedai Maju enquiry", request_type_id: "lead_qualification", form_inputs: { budget_confirmed: true, decision_maker_engaged: "true", timeline_days: "20" }, assign_to_staff_code: sales.staff_code }, h);
  assert.deepEqual(lead.work_request.form_inputs, { budget_confirmed: true, decision_maker_engaged: true, timeline_days: 20 });
  const fillIn = await postExpectFailure("/awia/virtual-staff/workdesk-item/run-skill", { ...s, workdesk_item_id: lead.workdesk_item.id }, h);
  assert.match(fillIn.error.message, /Fill in: Fit with your industry focus/);
  await postExpectFailure("/work-requests/update-inputs", { tenant_id: otherFirm.tenant_id, firm_id: otherFirm.id, work_request_id: lead.work_request.id, form_inputs: {} }, oh);
  await post("/work-requests/update-inputs", { ...s, work_request_id: lead.work_request.id, form_inputs: { ...lead.work_request.form_inputs, industry_fit: "HIGH", company_size_employees: 80 } }, h);
  const scored = await post("/awia/virtual-staff/workdesk-item/run-skill", { ...s, workdesk_item_id: lead.workdesk_item.id }, h);
  assert.equal(scored.output_draft.output_payload.score, 100);
  assert.equal(scored.output_draft.output_payload.tier, "HOT");
  // inputs are frozen once the draft is in review
  await postExpectFailure("/work-requests/update-inputs", { ...s, work_request_id: lead.work_request.id, form_inputs: { industry_fit: "LOW" } }, h);

  // ---- OPO-09 over a queues file ----
  const queues = await upload(firm, h, "team-capacity.csv", "text/csv", Buffer.from("queue_id,skill_tags,capacity_remaining\nsite-team-a,site_inspection;boq,2\nsite-team-b,site_inspection,5\noffice,admin,9\n"));
  const plan = await post("/work-requests", { ...s, title: "Who inspects Block C?", request_type_id: "capacity_assignment", file_ids: [queues.id], form_inputs: { task_type: "site_inspection", urgent: true }, assign_to_staff_code: ops.staff_code }, h);
  assert.equal(plan.assignment_error, null, JSON.stringify(plan));
  const planned = await post("/awia/virtual-staff/workdesk-item/run-skill", { ...s, workdesk_item_id: plan.workdesk_item.id }, h);
  assert.equal(planned.output_draft.output_payload.assigned_queue_id, "site-team-b");
  assert.equal(planned.output_draft.output_payload.priority, "HIGH");

  // ---- ARO-01 over a .txt request ----
  const memo = await upload(firm, h, "memo.txt", "text/plain", Buffer.from("Hi, the office printer is jammed again and nobody can print the tender. Please fix ASAP."));
  const triageReq = await post("/work-requests", { ...s, title: "Office issue from Siti", request_type_id: "admin_request_triage", file_ids: [memo.id], assign_to_staff_code: clerk.staff_code }, h);
  assert.equal(triageReq.assignment_error, null, JSON.stringify(triageReq));
  const triaged = await post("/awia/virtual-staff/workdesk-item/run-skill", { ...s, workdesk_item_id: triageReq.workdesk_item.id }, h);
  assert.equal(triaged.output_draft.output_payload.category, "IT_SUPPORT");
  assert.equal(triaged.output_draft.output_payload.priority, "HIGH");

  // ---- ARO-10 (Class A): SoD conflict caught; still needs owner Class A approval ----
  const onboard = await post("/work-requests", { ...s, title: "Onboard new site supervisor", request_type_id: "employee_onboarding", form_inputs: { new_hire_role: "Site supervisor", start_date: "2026-10-15", documents_received: ["employment_contract_signed", "identity_document_verified", "not_a_doc"], responsible_administrator_id: "Aina Rahman", hiring_manager_id: "  aina  rahman " }, assign_to_staff_code: hrAdmin.staff_code }, h);
  assert.deepEqual(onboard.work_request.form_inputs.documents_received, ["employment_contract_signed", "identity_document_verified"]);
  const checklist = await post("/awia/virtual-staff/workdesk-item/run-skill", { ...s, workdesk_item_id: onboard.workdesk_item.id }, h);
  assert.equal(checklist.output_draft.output_payload.status, "SOD_CONFLICT_BLOCKED");
  assert.equal(checklist.output_draft.class_a_approval_required, true);
  assert.equal(checklist.output_draft.class_a_approval_status, "PENDING");
  await postExpectFailure("/awia/virtual-staff/output-review", { ...s, output_draft_id: checklist.output_draft.id, review_decision: "APPROVED_FOR_CLIENT_DRAFT" }, h);
  const checklistCsv = (await download(firm, h, checklist.output_draft.output_file_id)).toString("utf8");
  assert.ok(!/aina/i.test(checklistCsv), "people's names are used for the SoD check only, never printed");
  assert.equal((await get("/mvp/store", h)).file_objects.find((f) => f.id === checklist.output_draft.output_file_id).classification, "HR_RESTRICTED");

  // ---- non-runnable type: owner attaches the finished output ----
  const letter = await post("/work-requests", { ...s, title: "Draft a thank-you letter to our landlord", request_type_id: "client_message_draft", assign_to_staff_code: sales.staff_code }, h);
  const notRunnable = await postExpectFailure("/awia/virtual-staff/workdesk-item/run-skill", { ...s, workdesk_item_id: letter.workdesk_item.id }, h);
  assert.match(notRunnable.error.message, /cannot be run automatically yet/);
  await postExpectFailure("/awia/virtual-staff/output-draft", { ...s, workdesk_item_id: letter.workdesk_item.id }, h);
  const ownerFile = await upload(firm, h, "letter.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", Buffer.from("PK fake docx"));
  const attached = await post("/awia/virtual-staff/output-draft", { ...s, workdesk_item_id: letter.workdesk_item.id, output_file_id: ownerFile.id, output_summary: "Letter v1" }, h);
  assert.equal(attached.output_draft.generation, null);

  // ---- audit ----
  const auditText = JSON.stringify(await get(`/audit-events?tenant_id=${firm.tenant_id}&firm_id=${firm.id}`, h));
  for (const event of ["awia.virtual_staff.skill_run_needs_input", "work_request.inputs_updated", "awia.virtual_staff.output_drafted", "file.uploaded"]) assert.ok(auditText.includes(event), `missing audit event ${event}`);

  console.log(JSON.stringify({
    smoke: "w3-skill-runner",
    result: "passed",
    backend: process.env.VFIRM_SMOKE_DATABASE_URL ? "postgres" : "json",
    fao11: { first_run: draft.output_summary, revision_2_reconciled: true, output_classification: "FINANCE_RESTRICTED" },
    sao03: { score: 100, tier: "HOT" },
    opo09: planned.output_draft.output_payload.assigned_queue_id,
    aro01: triaged.output_draft.output_payload.category,
    aro10: { status: "SOD_CONFLICT_BLOCKED", class_a: "PENDING" },
    guards_confirmed: ["cross_firm_run_refused", "placeholder_draft_refused", "missing_file_422_item_stays_pending", "unlabelled_file_matched_by_name", "missing_amount_column_explained", "missing_field_explained", "inputs_frozen_after_draft", "cross_firm_update_inputs_refused", "unknown_form_keys_dropped", "foreign_file_roles_dropped", "formula_injection_neutralised", "names_not_printed_on_hr_output", "non_runnable_type_refused"]
  }, null, 2));
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  for (const child of children) if (child.exitCode === null && !child.killed) child.kill();
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await rm(tmp, { recursive: true, force: true });
}
