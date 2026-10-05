import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { RULE_TEMPLATES, validateRuleDefinition } from "../packages/core-domain/src/edcs-rules.mjs";

// CE-S3 (ADR-097, 2026-10-05) -- Connected EDCS: rule engine and register-driven work.
//
// Drives the real API over HTTP with the synthetic Nexa Office Supplies (NEX) pack and proves:
//   1. a disabled rule creates nothing; the dry run shows the would-be requests and is required before enabling
//   2. an enabled rule creates one request per occurrence; re-import / repeated run / tick create no duplicate
//   3. the request carries the transaction reference, the linked files and the BizKick source; the W3 runner
//      slot for the bank statement is filled (BR statement -> FAO-11 "bank_statement")
//   4. a rule with assign-to uses the governed assignment; a wrong-position worker is refused and the
//      request stays in the Inbox
//   5. a Class A request (employee onboarding) still requires the owner's Class A approval
//   6. the tick endpoint refuses calls without the service token; rules never see another firm's transactions
//   7. the "Needs you" signals match the fixture
// Local JSON backend by default; set VFIRM_SMOKE_DATABASE_URL for a fresh, fully-migrated Postgres.

const root = process.cwd();
const fixtures = join(root, "scripts/fixtures/bizkick");
const samples = join(fixtures, "sample_files");
const expected = JSON.parse(await readFile(join(fixtures, "expected_outcomes.json"), "utf8"));
const SERVICE_TOKEN = "smoke-service-token-ce-s3";
const tmp = await mkdtemp(join(tmpdir(), "vfirm-ce-s3-"));
const apiPort = 3173;
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
  const tenant = await post("/tenants", { name: `CE-S3 ${label} Tenant ${stamp}-${firmCounter}` });
  const seed = await post("/firms", { tenant_id: tenant.id, name: `CE-S3 ${label} Firm ${stamp}-${firmCounter}`, principal_name: `${label} Owner` });
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


const AS_OF = expected.as_of;
const auto = (ctx, path) => get(`${path}?${q(ctx)}`, ctx.h);
const tx = (id) => `NEX-${id}`;
const store = async (ctx) => (await get("/mvp/store", ctx.h));
const requestsOf = async (ctx) => (await store(ctx)).work_requests.filter((r) => r.firm_id === ctx.firm.id);
async function makeRule(ctx, templateId, action = {}) {
  const { rule } = await post("/automation/rules", { ...ctx.s, template_id: templateId, action }, ctx.h);
  assert.equal(rule.enabled, false, "every rule is created disabled");
  return rule;
}
const dryRun = (ctx, rule) => post("/automation/rules/dry-run", { ...ctx.s, rule_id: rule.id }, ctx.h);
const enable = (ctx, rule, enabled = true) => post("/automation/rules/enable", { ...ctx.s, rule_id: rule.id, enabled }, ctx.h);
const runNow = (ctx) => post("/automation/evaluate", { ...ctx.s }, ctx.h);
const tickWith = async (token, scope = null) => {
  const query = scope ? `?tenant_id=${scope.tenant_id}&firm_id=${scope.firm_id}` : "";
  const response = await fetch(`${apiBase}/automation/tick${query}`, { method: "POST", headers: { "content-type": "application/json", ...(token ? { "x-vfirm-service-token": token } : {}) }, body: "{}" });
  return { response, json: await response.json() };
};
async function hireStaff(ctx) {
  await post("/ops/awia-package-assignment", { ...ctx.s, package_code: "HIRE_ME" }, ctx.h);
  const hire = (role_code, display_name, position_id) => post("/awia/virtual-staff/hire-worker", { ...ctx.s, role_code, display_name, position_id }, ctx.h);
  const bookkeeper = await hire("FAO", "Bookkeeper", "bookkeeper");
  const hrAdmin = await hire("ARO", "HR Administrator", "hr_administrator");
  const sales = await hire("SAO", "Sales Coordinator", "sales_coordinator");
  for (const worker of [bookkeeper, hrAdmin, sales]) await post("/awia/virtual-staff/lifecycle", { ...ctx.s, staff_code: worker.staff_code, to_state: "ACTIVE" }, ctx.h);
  return { bookkeeper, hrAdmin, sales };
}

try {
  // ---- pure: every template is a valid definition ----
  assert.equal(RULE_TEMPLATES.length, 6);
  for (const template of RULE_TEMPLATES) assert.equal(validateRuleDefinition(template).ok, true, `template ${template.template_id}`);

  start("api", ["apps/api/src/server.mjs"], {
    VFIRM_API_PORT: String(apiPort),
    ...(process.env.VFIRM_SMOKE_DATABASE_URL ? {} : { VFIRM_STORE_PATH: join(tmp, "store.json") }),
    DATABASE_URL: process.env.VFIRM_SMOKE_DATABASE_URL ?? "",
    VFIRM_STORE_BACKEND: process.env.VFIRM_SMOKE_DATABASE_URL ? "postgres" : "json",
    VFIRM_FILE_STORAGE_BACKEND: "local",
    VFIRM_FILE_LOCAL_DIR: join(tmp, "files"),
    VFIRM_AUTOMATION_AS_OF: AS_OF,
    VFIRM_SERVICE_TOKEN: SERVICE_TOKEN
  });
  await waitForJson(`${apiBase}/health`);

  // =============== Firm A: state rules on an already-imported register ===============
  const A = await newFirm("Alpha");
  const B = await newFirm("Bravo");
  const staffA = await hireStaff(A);
  await post("/edcs/connection", { ...A.s, company_code: "NEX", bizkick_version: "1.0" }, A.h);
  await post("/edcs/connection", { ...B.s, company_code: "NEX", bizkick_version: "1.0" }, B.h);
  await importRegister(A, "register_01_baseline.xlsx");

  // guards
  await fails("POST", "/automation/rules", 403, null, { ...A.s, template_id: "quotation_expiring" }, A.staff);
  await fails("POST", "/automation/rules", 400, "VALIDATION_ERROR", { ...A.s, name: "Bad", condition: { document_type: "ZZ" }, action: { request_type_id: "bank_reconciliation" } }, A.h);
  await fails("POST", "/automation/rules", 404, null, { ...A.s, template_id: "no_such_template" }, A.h);

  const qtRule = await makeRule(A, "quotation_expiring");
  const invRule = await makeRule(A, "invoice_overdue");
  const grnRule = await makeRule(A, "grn_without_po");
  const empRule = await makeRule(A, "employee_onboarding", { assign_to_staff_code: staffA.hrAdmin.staff_code });
  const cmpRule = await makeRule(A, "complaint_triage", { assign_to_staff_code: staffA.sales.staff_code }); // wrong position on purpose

  // acceptance 1: enabling needs a dry run first
  await fails("POST", "/automation/rules/enable", 409, "AUTOMATION_DRY_RUN_REQUIRED", { ...A.s, rule_id: qtRule.id, enabled: true }, A.h);
  // a disabled rule creates nothing
  const idle = await runNow(A);
  assert.equal(idle.rules_evaluated, 0);
  assert.equal(idle.created.length, 0);
  assert.equal((await requestsOf(A)).length, 0, "a disabled rule creates nothing");

  // dry runs show the would-be requests and create nothing
  const dQt = await dryRun(A, qtRule);
  assert.deepEqual(dQt.would_create.map((m) => m.transaction_id), [tx("QT-2026-0003")], "only the quotation inside 3 days (QT-0007 is 7 days out; QT-0001/0002 are accepted)");
  const dInv = await dryRun(A, invRule);
  assert.deepEqual(dInv.would_create.map((m) => m.transaction_id), [tx("INV-2026-0002")]);
  const dGrn = await dryRun(A, grnRule);
  assert.deepEqual(dGrn.would_create.map((m) => m.transaction_id), [tx("GRN-2026-0002")]);
  const dEmp = await dryRun(A, empRule);
  assert.equal(dEmp.would_create.length, 0, "a new-transaction rule does not act on rows imported before it existed");
  assert.ok(dEmp.older_than_rule >= 1, "the dry run reports how many were older than the rule");
  assert.equal((await requestsOf(A)).length, 0, "a dry run creates nothing");

  // editing needs the rule off and clears the dry run
  const edited = await post("/automation/rules/update", { ...A.s, rule_id: qtRule.id, action: { priority: "HIGH" } }, A.h);
  assert.equal(edited.rule.last_dry_run_at, null);
  await fails("POST", "/automation/rules/enable", 409, "AUTOMATION_DRY_RUN_REQUIRED", { ...A.s, rule_id: qtRule.id, enabled: true }, A.h);
  await dryRun(A, qtRule);

  for (const rule of [qtRule, invRule, grnRule]) assert.equal((await enable(A, rule)).rule.enabled, true);
  await fails("POST", "/automation/rules/update", 409, "AUTOMATION_RULE_ENABLED", { ...A.s, rule_id: qtRule.id, name: "x" }, A.h);

  // acceptance 2: one request per occurrence, then no duplicates
  const first = await runNow(A);
  assert.equal(first.created.length, 3, JSON.stringify(first));
  assert.deepEqual(first.created.map((c) => c.transaction_id).sort(), [tx("GRN-2026-0002"), tx("INV-2026-0002"), tx("QT-2026-0003")]);
  let requests = await requestsOf(A);
  assert.equal(requests.length, 3);
  const again = await runNow(A);
  assert.equal(again.created.length, 0, "a second run creates nothing");
  assert.ok(again.skipped_existing >= 3);
  const ticked = await tickWith(SERVICE_TOKEN, A.s);
  assert.equal(ticked.response.status, 200, JSON.stringify(ticked.json));
  assert.equal(ticked.json.data.created, 0, "a tick creates no duplicate");
  await importRegister(A, "register_01_baseline.xlsx"); // re-import of the same register
  assert.equal((await requestsOf(A)).length, 3, "a re-import creates no duplicate");

  // acceptance 3: the request carries the transaction reference, source and rule
  const qtRequest = requests.find((r) => r.source?.transaction_id === tx("QT-2026-0003"));
  assert.ok(qtRequest, "request found by source");
  assert.equal(qtRequest.source.type, "BIZKICK_RULE");
  assert.equal(qtRequest.source.rule_id, qtRule.id);
  assert.ok(qtRequest.references.includes(tx("QT-2026-0003")), "reference carries the Transaction ID");
  assert.equal(qtRequest.risk_class, "INTERNAL");
  assert.equal(qtRequest.status, "SUBMITTED", "no assign-to: it waits in the Inbox");
  assert.equal(qtRequest.priority, "HIGH");

  // activity + audit
  const activity = await get(`/automation/rules/${qtRule.id}/activity?${q(A)}`, A.h);
  assert.equal(activity.occurrences.filter((o) => o.status === "CREATED").length, 1);
  const listed = await auto(A, "/automation/rules");
  assert.equal(listed.rules.length, 5);
  assert.equal(listed.templates.length, 6);
  assert.equal(listed.rules.find((r) => r.id === qtRule.id).activity.created, 1);
  const auditA = JSON.stringify(await get(`/audit-events?${q(A)}`, A.h));
  for (const event of ["automation.rule_created", "automation.rule_enabled", "automation.request_created"]) assert.ok(auditA.includes(event), event);

  // =============== Firm C: event rules, assignment, Class A, supporting statement ===============
  const C = await newFirm("Charlie");
  const staffC = await hireStaff(C);
  await post("/edcs/connection", { ...C.s, company_code: "NEX", bizkick_version: "1.0" }, C.h);
  const brRule = await makeRule(C, "bank_reconciliation_statement", { assign_to_staff_code: staffC.bookkeeper.staff_code });
  const empC = await makeRule(C, "employee_onboarding", { assign_to_staff_code: staffC.hrAdmin.staff_code });
  const cmpC = await makeRule(C, "complaint_triage", { assign_to_staff_code: staffC.sales.staff_code }); // wrong position
  for (const rule of [brRule, empC, cmpC]) { await dryRun(C, rule); await enable(C, rule); }
  const baselineC = await importRegister(C, "register_01_baseline.xlsx");
  assert.ok(baselineC.automation, "the import evaluated the rules");
  let reqC = await requestsOf(C);
  const byTx = (id) => reqC.find((r) => r.source?.transaction_id === tx(id));
  assert.ok(byTx("EMP-2026-0001"), "new open employee -> onboarding request");
  assert.ok(byTx("CMP-2026-0001"), "new open complaint -> triage request");
  assert.equal(byTx("CMP-2026-0002"), undefined, "a completed complaint is not acted on");
  assert.equal(byTx("BR-2026-0002"), undefined, "no statement attached yet");

  // acceptance 5: Class A still needs owner approval
  const emp = byTx("EMP-2026-0001");
  assert.equal(emp.class_a, true);
  assert.equal(emp.status, "ASSIGNED", "assignment went through the governed path to the HR administrator");
  assert.equal(emp.assigned_staff_code, staffC.hrAdmin.staff_code);
  const draft = await post("/awia/virtual-staff/output-draft", { ...C.s, workdesk_item_id: emp.workdesk_item_id, output_payload: { note: "smoke-supplied payload" } }, C.h);
  assert.equal(draft.output_draft.class_a_approval_required, true);
  assert.equal(draft.output_draft.class_a_approval_status, "PENDING");
  await fails("POST", "/awia/virtual-staff/output-review", 409, null, { ...C.s, output_draft_id: draft.output_draft.id, review_decision: "APPROVED_FOR_CLIENT_DRAFT" }, C.h);

  // acceptance 4: wrong-position worker refused, request stays in the Inbox
  const cmp = byTx("CMP-2026-0001");
  assert.equal(cmp.status, "SUBMITTED");
  assert.equal(cmp.assigned_staff_code, null);
  const cmpOcc = (await get(`/automation/rules/${cmpC.id}/activity?${q(C)}`, C.h)).occurrences.find((o) => o.transaction_id === tx("CMP-2026-0001"));
  assert.equal(cmpOcc.assignment.outcome, "REFUSED");
  assert.equal(cmpOcc.status, "CREATED", "the request exists even though the assignment was refused");

  // acceptance 3: statement attached as a SUPPORTING file -> BR request with the file in the bank_statement slot
  const brPrimary = await link(C, "NEX-BR-2026-0002_Bank_Reconciliation.xlsx");
  assert.equal(brPrimary.outcome, "LINKED");
  reqC = await requestsOf(C);
  assert.equal(byTx("BR-2026-0002"), undefined, "the primary file alone does not satisfy the rule");
  const stmt = await link(C, "NEX-BR-2026-0002_bank_statement_2026-09.csv", { extra: "&role=SUPPORTING" });
  assert.equal(stmt.outcome, "ATTACHED");
  assert.equal(stmt.role, "SUPPORTING");
  const brDocs = (await detail(C, "NEX-BR-2026-0002")).documents;
  assert.equal(brDocs.current_revision.revision, "R0", "the supporting file did not replace the primary");
  assert.equal(brDocs.attachments.length, 1);
  reqC = await requestsOf(C);
  const br = byTx("BR-2026-0002");
  assert.ok(br, "the statement upload raised the reconciliation request");
  assert.ok(br.file_ids.includes(stmt.file_id), "the statement is attached to the request");
  assert.equal(br.file_roles[stmt.file_id], "bank_statement", "BR statement -> FAO-11 bank_statement slot");
  assert.equal(br.assigned_staff_code, staffC.bookkeeper.staff_code);
  const brAgain = await runNow(C);
  assert.equal(brAgain.created.length, 0);

  // =============== acceptance 6: tick auth and firm isolation ===============
  assert.equal((await tickWith(null)).response.status, 401);
  assert.equal((await tickWith(null)).json.error.code, "SERVICE_TOKEN_REQUIRED");
  assert.equal((await tickWith("wrong-token")).response.status, 401);
  const humanTick = await request("/automation/tick", { method: "POST", body: {}, headers: A.h });
  assert.equal(humanTick.response.status, 401, "an owner session is not a service token");
  const countA = (await requestsOf(A)).length;
  const countC = (await requestsOf(C)).length;
  const qtB = await makeRule(B, "quotation_expiring");
  await dryRun(B, qtB);
  await enable(B, qtB);
  const fullTick = await tickWith(SERVICE_TOKEN);
  assert.equal(fullTick.response.status, 200);
  assert.ok(fullTick.json.data.firms_visited >= 3, "every firm with an enabled rule is visited");
  assert.equal(fullTick.json.data.created, 0, "nothing new anywhere: A and C are already satisfied, B has an empty register");
  assert.equal((await requestsOf(B)).length, 0, "firm B never sees firm A's transactions");
  assert.equal((await requestsOf(A)).length, countA);
  assert.equal((await requestsOf(C)).length, countC);
  assert.equal((await auto(B, "/automation/rules")).rules.length, 1, "rules are firm-scoped");
  await fails("POST", "/automation/rules/dry-run", 404, null, { ...B.s, rule_id: qtRule.id }, B.h);
  await fails("POST", "/automation/rules/enable", 404, null, { ...B.s, rule_id: qtRule.id, enabled: false }, B.h);
  await fails("POST", "/automation/rules/dry-run", 403, null, { ...A.s, rule_id: qtRule.id }, B.h);

  // turning a rule off stops it
  await enable(A, qtRule, false);
  assert.equal((await auto(A, "/automation/rules")).rules.find((r) => r.id === qtRule.id).enabled, false);

  // =============== acceptance 7: the tray ===============
  const sig = await get(`/edcs/signals?${q(A)}`, A.h);
  assert.equal(sig.as_of, AS_OF);
  assert.deepEqual(sig.signals.expiring_quotations.ids, [tx("QT-2026-0003")]);
  assert.deepEqual(sig.signals.overdue_invoices.ids, [tx("INV-2026-0002")]);
  assert.ok(sig.signals.missing_links.ids.includes(tx("GRN-2026-0002")) && sig.signals.missing_links.ids.includes(tx("DO-2026-0003")));
  assert.equal(sig.signals.conflicts.count, 0);
  for (const key of Object.keys(sig.signals)) assert.equal(sig.signals[key].count, sig.signals[key].ids.length, key);
  const sigB = await get(`/edcs/signals?${q(B)}`, B.h);
  assert.equal(sigB.signals.expiring_quotations.count, 0, "firm B has no transactions");

  console.log(JSON.stringify({
    smoke: "ce-s3-register-rules",
    result: "passed",
    backend: process.env.VFIRM_SMOKE_DATABASE_URL ? "postgres" : "json",
    acceptance: ["disabled_rule_creates_nothing", "dry_run_previews_and_is_required", "one_request_per_occurrence_no_duplicates", "request_carries_reference_files_source", "br_statement_fills_bank_statement_slot", "assign_to_uses_governed_assignment_wrong_position_refused", "class_a_still_needs_owner_approval", "tick_needs_service_token", "firm_isolation", "tray_counts_match_fixture"],
    requests_firm_a: countA,
    requests_firm_c: countC
  }, null, 2));
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  for (const child of children) if (child.exitCode === null && !child.killed) child.kill();
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await rm(tmp, { recursive: true, force: true });
}
