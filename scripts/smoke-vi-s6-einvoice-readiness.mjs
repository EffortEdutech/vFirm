import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { BANDS, SPEC, STATUS, applicability, checkInvoice, consolidatedDraft } from "../packages/core-domain/src/edcs-einvoice.mjs";

// VI-S6 (ADR-114, 2026-10-11) -- e-Invoice readiness. CHECK ONLY: nothing is built for, or sent to, MyInvois.
//
// Part 1 is pure: fixture invoices give the expected ready / missing / invalid / unknown per field, the turnover bands and
// dates, the consolidated rules, and a static scan proving no submission capability exists in the VI-S6 source files.
// Part 2 drives the real API: owner-only, firm isolation, read-only, profile saves audited, BizKick + vFirm invoices checked,
// the consolidated draft built from buyers marked as the public. Local JSON by default; VFIRM_SMOKE_DATABASE_URL for Postgres.

const root = process.cwd();
const SERVICE_TOKEN = "smoke-service-token-vi-s6";
const tmp = await mkdtemp(join(tmpdir(), "vfirm-vi-s6-"));
const apiPort = 3186;
const apiBase = `http://127.0.0.1:${apiPort}`;
const fixtures = join(root, "scripts/fixtures/bizkick");
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
let api = null;
let logs = "";

// ============================ part 1: the rules ============================
const goodSupplier = { name: "NHL Global Solution", tin: "C1234567890", reg_type: "BRN", reg_no: "202301000001", sst: "NA", ttx: "NA", msic: "62010", activity: "Software", contact: "+60123456789", address: { line0: "1 Jalan Satu", city: "Kuala Lumpur", state: "Wilayah Persekutuan", country: "MYS" } };
const goodBuyer = { name: "Kedai Maju Sdn Bhd", tin: "C9876543210", reg_type: "BRN", reg_no: "201901000002", sst: "NA", contact: "+60198765432", address: { line0: "2 Jalan Dua", city: "Ipoh", state: "Perak", country: "MYS" } };
const goodLine = { classification: "022", description: "Retainer", unit_price: 800, subtotal: 800, tax_type: "06", tax_amount: 0 };
const goodDoc = { number: "VF-1", issue_date: "2026-09-30", currency: "MYR", type_code: "01", supplier: goodSupplier, buyer: goodBuyer, lines: [goodLine], totals: { excl: 800, tax: 0, incl: 800, payable: 800 } };
const AS_OF = "2026-10-12";
const statusOf = (r, key) => r.checks.find((c) => c.key === key)?.status;

const perfect = checkInvoice(goodDoc, { as_of: AS_OF });
assert.deepEqual([perfect.verdict, perfect.counts.missing, perfect.counts.invalid, perfect.counts.unknown, perfect.fix_list.length], ["READY", 0, 0, 0, 0], "a complete invoice is ready");
// each required field, removed one at a time, is reported MISSING with a place to fix it
const drop = (path) => { const d = JSON.parse(JSON.stringify(goodDoc)); const parts = path.split("."); let o = d; for (const p of parts.slice(0, -1)) o = o[p]; delete o[parts.at(-1)]; return d; };
for (const [path, key] of [["number", "invoice.number"], ["issue_date", "invoice.date"], ["currency", "invoice.currency"], ["supplier.name", "supplier.name"], ["supplier.tin", "supplier.tin"], ["supplier.sst", "supplier.sst"], ["supplier.ttx", "supplier.ttx"], ["supplier.msic", "supplier.msic"], ["supplier.activity", "supplier.activity"], ["supplier.contact", "supplier.contact"], ["supplier.address.city", "supplier.address.city"], ["buyer.name", "buyer.name"], ["buyer.tin", "buyer.tin"], ["buyer.sst", "buyer.sst"], ["buyer.contact", "buyer.contact"], ["buyer.address.line0", "buyer.address.line0"], ["buyer.address.state", "buyer.address.state"], ["buyer.address.country", "buyer.address.country"], ["buyer.reg_no", "buyer.reg"]]) {
  const r = checkInvoice(drop(path), { as_of: AS_OF });
  assert.equal(statusOf(r, key), STATUS.MISSING, `${path} removed -> ${key} MISSING`);
  assert.equal(r.verdict, "NEEDS_FIXES", path);
  const fix = r.fix_list.find((f) => f.key === key);
  assert.ok(fix?.fix && fix?.where, `${path}: the fix list says what to do and where`);
}
// invalid values
const invalid = (patch, key) => { const d = { ...JSON.parse(JSON.stringify(goodDoc)), ...patch }; const r = checkInvoice(d, { as_of: AS_OF }); assert.equal(statusOf(r, key), STATUS.INVALID, key); assert.equal(r.verdict, "NEEDS_FIXES"); };
invalid({ issue_date: "30/09/2026" }, "invoice.date");
invalid({ issue_date: "2026-12-01" }, "invoice.date");
invalid({ currency: "RM" }, "invoice.currency");
invalid({ supplier: { ...goodSupplier, msic: "6201" } }, "supplier.msic");
invalid({ supplier: { ...goodSupplier, contact: "0123456789" } }, "supplier.contact");
invalid({ buyer: { ...goodBuyer, reg_type: "NRIC", reg_no: "900101-01-1234" } }, "buyer.reg");
invalid({ buyer: { ...goodBuyer, reg_type: "XYZ" } }, "buyer.reg");
invalid({ buyer: { ...goodBuyer, address: { ...goodBuyer.address, country: "Malaysia" } } }, "buyer.address.country");
invalid({ lines: [{ ...goodLine, classification: "22" }] }, "line1.classification");
invalid({ lines: [{ ...goodLine, tax_type: "6" }] }, "line1.tax_type");
invalid({ lines: [{ ...goodLine, unit_price: -5 }] }, "line1.unit_price");
invalid({ totals: { excl: 800, tax: 48, incl: 800, payable: 800 } }, "total.arithmetic");
invalid({ totals: { excl: 700, tax: 0, incl: 700, payable: 700 } }, "total.lines");
assert.equal(statusOf(checkInvoice({ ...goodDoc, buyer: { ...goodBuyer, contact: "NA" } }), "buyer.contact"), STATUS.INVALID, "NA contact is not allowed on an individual e-Invoice");
assert.equal(statusOf(checkInvoice({ ...goodDoc, consolidated: true, buyer: { ...goodBuyer, contact: "NA" } }), "buyer.contact"), STATUS.READY, "NA contact is allowed on a consolidated e-Invoice");
// values vFirm does not hold are UNKNOWN, never guessed
const bare = checkInvoice({ number: "INV-9", issue_date: "2026-09-01", currency: "MYR", supplier: goodSupplier, buyer: { name: "Someone" }, lines: null, totals: {} }, { as_of: AS_OF });
assert.equal(statusOf(bare, "lines"), STATUS.UNKNOWN);
assert.equal(statusOf(bare, "total.excl"), STATUS.UNKNOWN);
assert.equal(bare.verdict, "NEEDS_FIXES", "missing buyer details dominate");
const onlyUnknown = checkInvoice({ ...goodDoc, lines: null, totals: {} }, { as_of: AS_OF });
assert.deepEqual([onlyUnknown.verdict, onlyUnknown.counts.missing, onlyUnknown.counts.invalid], ["CANNOT_CONFIRM", 0, 0], "everything else fine but lines and totals not held -> cannot confirm, not pass");
assert.equal(checkInvoice(goodDoc, { as_of: AS_OF }).verdict, "READY");
assert.deepEqual(checkInvoice(goodDoc, { as_of: AS_OF }), checkInvoice(JSON.parse(JSON.stringify(goodDoc)), { as_of: AS_OF }), "deterministic");
// bands and dates
assert.deepEqual(Object.keys(BANDS), ["UNDER_3M", "3M_5M", "5M_25M", "25M_100M", "OVER_100M"]);
const ex = applicability({ band: "UNDER_3M", as_of: "2026-10-12" });
assert.deepEqual([ex.applies, ex.exempt], [false, true], "below RM3 million is exempt");
assert.deepEqual([applicability({ band: "UNDER_3M", related_over_3m: true, as_of: "2026-10-12" }).applies], [true], "a related party with RM3m+ removes the exemption");
const mid = applicability({ band: "3M_5M", as_of: "2026-10-12" });
assert.deepEqual([mid.applies, mid.since, mid.in_relaxation, mid.relaxation_until], [true, "2026-01-01", true, "2027-12-31"]);
assert.equal(applicability({ band: "3M_5M", as_of: "2025-12-31" }).started, false);
assert.equal(applicability({ band: "5M_25M", as_of: "2026-10-12" }).in_relaxation, false, "that band's relaxation ended");
assert.equal(applicability({ band: "OVER_100M", as_of: "2026-10-12" }).since, "2024-08-01");
assert.equal(applicability({ band: "NOPE", as_of: AS_OF }).ok, false);
assert.equal(applicability({ band: "3M_5M", as_of: "bad" }).ok, false);
// consolidated draft
const pub = (number, date, total, extra = {}) => ({ number, issue_date: date, currency: "MYR", total, candidate: true, ...extra });
const cd = consolidatedDraft({ month: "2026-09", supplier: goodSupplier, docs: [pub("R3", "2026-09-20", 10000), pub("R1", "2026-09-02", 50.5), pub("R2", "2026-09-10", 10000.01), pub("R4", "2026-09-11", 20, { currency: "USD" }), pub("R5", "2026-10-01", 30), { number: "B1", issue_date: "2026-09-05", currency: "MYR", total: 5, candidate: false }, pub("R6", "2026-09-12", undefined)] });
assert.equal(cd.ok && cd.draft_only, true);
assert.deepEqual(cd.lines.map((l) => l.receipt_ref), ["R1", "R3"], "exactly RM10,000 is allowed, one sen more is not; other months, other currencies and non-public buyers stay out");
assert.deepEqual(cd.excluded.map((x) => x.number).sort(), ["R2", "R4", "R6"]);
assert.equal(cd.total_myr, 10050.5);
assert.deepEqual([cd.header.due_by, cd.header.period_end, cd.header.buyer.tin, cd.header.buyer.name], ["2026-10-07", "2026-09-30", "EI00000000010", "General Public"], "due 7 days after month end; General Public placeholder TIN");
assert.equal(cd.csv.split("\n")[0], "receipt_ref,date,description,amount_myr");
const many = consolidatedDraft({ month: "2026-02", supplier: goodSupplier, docs: Array.from({ length: 201 }, (_, i) => pub(`M${i}`, "2026-02-03", 1)) });
assert.equal(many.submissions_needed, 3, "100 lines per submission: 201 lines = 3");
assert.equal(consolidatedDraft({ month: "2026-13", docs: [] }).ok, false);
assert.equal(SPEC.consolidated_single_limit, 10000);
// no submission capability anywhere in the VI-S6 source
const forbidden = [/\bfetch\s*\(/, /https?\.request/, /node:https?/, /documentsubmissions/i, /\/connect\/token/i, /api\.myinvois/i, /preprod-api/i, /XMLHttpRequest/, /sendBeacon/];
for (const file of ["packages/core-domain/src/edcs-einvoice.mjs", "apps/api/src/einvoice-service.mjs", "apps/web-console/public/js/pages-einvoice.js"]) {
  const text = (await readFile(join(root, file), "utf8")).split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  for (const re of forbidden) assert.equal(re.test(text), false, `${file} must not contain ${re}`);
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
  const tenant = await post("/tenants", { name: `VI-S6 ${label} Tenant ${stamp}-${firmCounter}` });
  const seed = await post("/firms", { tenant_id: tenant.id, name: `VI-S6 ${label} Firm ${stamp}-${firmCounter}`, principal_name: `${label} Owner` });
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




const E = (ctx, extra = "") => get(`/einvoice/readiness?${q(ctx)}${extra}`, ctx.h);
const events = async (ctx, type) => (await get(`/audit-events?${q(ctx)}`, ctx.h)).filter((e) => (e.action ?? e.event_type) === type);

try {
  startApi("2026-10-12");
  await waitForHealth();
  const A = await newFirm("Alpha");
  const B = await newFirm("Bravo");
  await post("/edcs/connection", { ...A.s, company_code: "NEX", bizkick_version: "1.0" }, A.h);
  await importRegister(A, "register_01_baseline.xlsx");
  const txs = (await get(`/edcs/transactions?${q(A)}`, A.h)).transactions;
  const counted = (t) => t.document_type === "INV" && !["Cancelled", "Rejected", "Superseded", "Draft", "Reserved", "Under Review"].includes(t.status) && /^\d{4}-\d{2}-\d{2}/.test(String(t.date_issued ?? ""));
  const invs = txs.filter(counted);
  assert.ok(invs.length >= 2, "the fixture register has invoices to check");
  // a vFirm invoice for a client
  const enquiry = await post("/front-desk/enquiries", { ...A.s, contact_name: "Aisyah", organization_name: "Kedai Maju Sdn Bhd", contact_email: `a-${stamp}@maju.example`, enquiry_summary: "Retainer", requested_service_hint: "Bookkeeping" }, A.h);
  await post("/front-desk/enquiries/qualify", { ...A.s, enquiry_id: enquiry.id, decision: "QUALIFIED", consent_or_legal_basis_ref: "C", conflict_check_status: "CLEARED", conflict_check_ref: "CC" }, A.h);
  const handoff = await post("/front-desk/enquiries/handoff", { ...A.s, enquiry_id: enquiry.id, provided_inputs: {} }, A.h);
  const clientId = handoff.relationship.client_id;
  const intake = await post("/intake-sessions", { ...A.s, relationship_id: handoff.relationship.id, provided_inputs: { engagement_summary: "Retainer" } }, A.h);
  const proposal = await post("/proposals", { ...A.s, relationship_id: handoff.relationship.id, intake_session_id: intake.intake.id, scope_summary: "Retainer", final_price: 800 }, A.h);
  const approved = await post("/proposals/approve", { ...A.s, proposal_id: proposal.proposal.id }, A.h);
  const opened = await post("/proposals/accept", { ...A.s, proposal_id: approved.proposal.id, project_name: "Retainer" }, A.h);
  await post("/invoices", { ...A.s, relationship_id: handoff.relationship.id, project_id: opened.project.id, invoice_number: "VF-1", currency: "MYR", status: "ISSUED", line_items: [{ description: "Retainer", amount: 800 }] }, A.h);

  // ---- access ----
  await fails("GET", `/einvoice/readiness?${q(A, "&band=3M_5M")}`, 403, "EDCS_OWNER_REQUIRED", undefined, A.staff);
  await fails("POST", "/einvoice/supplier", 403, "EDCS_OWNER_REQUIRED", { ...A.s, sst: "NA" }, A.staff);
  await fails("POST", "/einvoice/buyer", 403, "EDCS_OWNER_REQUIRED", { ...A.s, buyer_key: `client:${clientId}` }, A.staff);
  await fails("GET", `/einvoice/readiness?${q(A)}`, 400, "VALIDATION_ERROR", undefined, A.h);
  await fails("GET", `/einvoice/readiness?${q(A, "&band=NOPE")}`, 400, "VALIDATION_ERROR", undefined, A.h);
  await fails("POST", "/einvoice/buyer", 400, "VALIDATION_ERROR", { ...A.s, buyer_key: "bad key" }, A.h);

  // ---- the first look: honest about what is missing ----
  const before = JSON.stringify(await store(A));
  const first = await E(A, "&band=3M_5M");
  assert.equal(first.draft_only, true);
  assert.match(first.submission, /never submits/);
  assert.equal(first.applicability.applies, true);
  assert.equal(first.spec.checked_on, "2026-10-11");
  assert.ok(first.results.length >= invs.length + 1, "BizKick invoices and the vFirm invoice are all listed");
  assert.ok(first.results.some((r) => r.source === "VFIRM" && r.number === "VF-1"));
  assert.ok(first.results.every((r) => r.verdict !== "READY"), "nothing is ready before the owner adds the details");
  const bk = first.results.find((r) => r.source === "BIZKICK");
  assert.ok(bk.fix_list.some((f) => f.key === "lines" && f.status === "UNKNOWN"), "BizKick line items are 'cannot tell', not invented");
  assert.ok(bk.fix_list.some((f) => f.key === "buyer.tin"), "the buyer TIN is on the fix list");
  assert.equal(JSON.stringify(await store(A)), before, "reading changes nothing");
  assert.equal(first.consolidated.lines.length, 0);

  // ---- supplier and buyer details ----
  await post("/einvoice/supplier", { ...A.s, ...{ name: goodSupplier.name, tin: goodSupplier.tin, reg_type: "BRN", reg_no: goodSupplier.reg_no, sst: "NA", ttx: "NA", msic: "62010", activity: "Software", contact: "+60123456789", address: goodSupplier.address } }, A.h);
  const afterSupplier = await E(A, "&band=3M_5M");
  const vf1 = afterSupplier.results.find((r) => r.number === "VF-1");
  assert.equal(vf1.fix_list.some((f) => f.key.startsWith("supplier.")), false, "the supplier's own gaps are closed");
  assert.equal(vf1.fix_list.some((f) => f.key === "buyer.tin"), true);
  const buyerKey = `client:${clientId}`;
  assert.ok(afterSupplier.buyers.some((b) => b.buyer_key === buyerKey), "the client appears as a buyer to fill in");
  await post("/einvoice/buyer", { ...A.s, buyer_key: buyerKey, ...goodBuyer }, A.h);
  const afterBuyer = await E(A, "&band=3M_5M");
  const vf1b = afterBuyer.results.find((r) => r.number === "VF-1");
  assert.equal(vf1b.fix_list.some((f) => f.key.startsWith("buyer.")), false, "the buyer's gaps are closed");
  assert.equal(vf1b.fix_list.some((f) => f.key.startsWith("line1.") && f.key !== "line1.classification" && f.key !== "line1.tax_type" && f.key !== "line1.tax_amount"), false);
  assert.ok(vf1b.fix_list.some((f) => f.key === "line1.classification"), "vFirm invoice lines have no classification code until it is added");
  assert.equal(vf1b.verdict, "NEEDS_FIXES");
  assert.equal((await events(A, "einvoice.supplier_saved")).length >= 1, true);
  assert.equal((await events(A, "einvoice.buyer_saved")).length >= 1, true);

  // ---- consolidated draft: a buyer marked as the public ----
  const walkIn = invs[0];
  const walkKey = afterBuyer.results.find((r) => r.ref === walkIn.transaction_id).buyer_key;
  await post("/einvoice/buyer", { ...A.s, buyer_key: walkKey, public_buyer: true }, A.h);
  const month = String(walkIn.date_issued).slice(0, 7);
  const cons = await E(A, `&band=3M_5M&month=${month}`);
  assert.equal(cons.consolidated.draft_only, true);
  assert.equal(cons.consolidated.header.buyer.tin, "EI00000000010");
  const included = cons.consolidated.lines.length + cons.consolidated.excluded.length;
  assert.ok(included >= 1, "the public-buyer invoice appears in the draft or is explained as left out");
  assert.match(cons.consolidated.csv, /^receipt_ref,date,description,amount_myr/);
  // exempt band
  const exempt = await E(A, "&band=UNDER_3M");
  assert.deepEqual([exempt.applicability.applies, exempt.applicability.exempt], [false, true]);

  // ---- firm isolation ----
  const theirs = await E(B, "&band=3M_5M");
  assert.equal(theirs.results.length, 0);
  assert.equal(theirs.supplier.saved, null);
  assert.equal(JSON.stringify(theirs).includes(goodSupplier.tin), false, "another firm sees none of this firm's details");
  await fails("GET", `/einvoice/readiness?${q(B, "&band=3M_5M")}`, 403, null, undefined, A.h);

  console.log(JSON.stringify({
    status: "pass", sprint: "VI-S6", backend: process.env.VFIRM_SMOKE_DATABASE_URL ? "postgres" : "json",
    checked: [
      "every required supplier, buyer, invoice and line field is reported Missing with where to fix it; wrong formats are Not valid; values vFirm does not hold are Cannot tell, never guessed",
      "turnover bands: below RM3m exempt unless a related party has RM3m+; start dates and relaxation windows",
      "consolidated draft: RM10,000 limit, MYR only, public buyers only, 100 lines per submission, due 7 days after month end, General Public TIN",
      "no submission capability in the engine, service or page (static scan)",
      "owner-only, read-only, audited profile saves, BizKick and vFirm invoices checked, another firm sees nothing"
    ]
  }));
} finally {
  await stopApi();
  await rm(tmp, { recursive: true, force: true });
}
