import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import {
  authorizeApproval, buildPolicyContent, formatMoney, isOwnerRole, normalizeRole, parseLimitValue, readDelegationWorkbook, requirementFor, validateConfirmation
} from "../packages/core-domain/src/edcs-delegation.mjs";

// CE-S5 (ADR-099, 2026-10-06) -- Connected EDCS: Delegation of Authority.
//
// Drives the real API over HTTP with the synthetic Nexa Office Supplies (NEX) Master Control Workbook and proves:
//   1. importing the workbook creates approval policy v1; re-importing with changes creates v2 (v1 SUPERSEDED, one ACTIVE)
//   2. an EDCS-linked draft above Tier 1 is refused for a Tier-1-only reviewer (the 409 names the approver) and
//      allowed for the Tier 2 role -- both audited
//   3. work that is not EDCS-linked (or whose document type has no limit) is unaffected
//   4. a Class A draft still needs Class A approval whatever the tier
// plus: the owner confirms the mapping (incomplete = 422), owner-only import, row-level and whole-file rejections,
// foreign currency goes to the top tier, the owner is never blocked, higher approvers cover lower tiers,
// the tier is recorded on the draft, firm isolation, export. Local JSON backend by default; set
// VFIRM_SMOKE_DATABASE_URL for a fresh, fully-migrated Postgres.

const root = process.cwd();
const fixtures = join(root, "scripts/fixtures/bizkick");
const tmp = await mkdtemp(join(tmpdir(), "vfirm-ce-s5-"));
const apiPort = 3175;
const apiBase = `http://127.0.0.1:${apiPort}`;
const children = [];
let logs = "";
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const BASE = "NEX_BK-SYS-003_Master_Control_Workbook.xlsx";
const CHANGED = "NEX_BK-SYS-003_approval_limits_changed.xlsx";
const BAD_ROWS = "NEX_BK-SYS-003_approval_limits_bad_rows.xlsx";
const NO_SHEET = "NEX_BK-SYS-003_no_approval_limits_sheet.xlsx";
const HEADER = "NEX_BK-SYS-003_header_changed.xlsx";

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
const headersFor = (actorId, firm, role = "principal") => ({ "x-vfirm-actor-id": actorId, "x-vfirm-tenant-id": firm.tenant_id, "x-vfirm-firm-id": firm.id, "x-vfirm-role": role });
const stamp = Date.now();
let firmCounter = 0;

async function newFirm(label) {
  firmCounter += 1;
  const tenant = await post("/tenants", { name: `CE-S5 ${label} Tenant ${stamp}-${firmCounter}` });
  const seed = await post("/firms", { tenant_id: tenant.id, name: `CE-S5 ${label} Firm ${stamp}-${firmCounter}`, principal_name: `${label} Owner` });
  const firm = seed.firm;
  const as = (role) => headersFor(seed.principal_actor.id, firm, role);
  return { firm, h: as("principal"), as, staff: as("PILOT_OPERATOR"), s: { tenant_id: firm.tenant_id, firm_id: firm.id }, label };
}
const q = (ctx, extra = "") => `tenant_id=${ctx.s.tenant_id}&firm_id=${ctx.s.firm_id}${extra}`;
async function uploadFixture(ctx, name, { filename = name, contentType = XLSX, bytes = null } = {}) {
  const buffer = bytes ?? await readFile(join(fixtures, name));
  const response = await fetch(`${apiBase}/files/upload?${q(ctx)}&filename=${encodeURIComponent(filename)}`, { method: "POST", headers: { "content-type": contentType, ...ctx.h }, body: buffer });
  const json = await response.json();
  assert.equal(json.ok, true, `upload ${filename}: ${JSON.stringify(json)}`);
  return json.data;
}
async function importRegister(ctx) {
  const uploaded = await uploadFixture(ctx, "register_01_baseline.xlsx");
  return post("/edcs/register-imports", { ...ctx.s, file_id: uploaded.id }, ctx.h);
}
async function hireStaff(ctx) {
  await post("/ops/awia-package-assignment", { ...ctx.s, package_code: "HIRE_ME" }, ctx.h);
  const hire = (role_code, display_name, position_id) => post("/awia/virtual-staff/hire-worker", { ...ctx.s, role_code, display_name, position_id }, ctx.h);
  const bookkeeper = await hire("FAO", "Bookkeeper", "bookkeeper");
  const hrAdmin = await hire("ARO", "HR Administrator", "hr_administrator");
  for (const worker of [bookkeeper, hrAdmin]) await post("/awia/virtual-staff/lifecycle", { ...ctx.s, staff_code: worker.staff_code, to_state: "ACTIVE" }, ctx.h);
  return { bookkeeper, hrAdmin };
}

// The mapping the owner confirms for the Nexa workbook.
const LABELS = {
  "Procurement Manager": { roles: ["PROCUREMENT_MANAGER"] },
  "Finance Manager": { roles: ["FINANCE_MANAGER"] },
  "Authorised Manager": { roles: ["AUTHORISED_MANAGER"] },
  "Sales Manager": { roles: ["SALES_MANAGER"] },
  "Operations Manager": { roles: ["OPERATIONS_MANAGER"] },
  "Owner / Board": { owner: true }
};
const TYPES = { PO: "Purchases", PV: "Payments", PCV: "Payments", SA: "Stock adjustments" };
const tx = (id) => `NEX-${id}`;

try {
  // =============== pure engine ===============
  assert.deepEqual(parseLimitValue("5000"), { ok: true, kind: "MONEY", value: 5000 });
  assert.deepEqual(parseLimitValue("RM 10,000"), { ok: true, kind: "MONEY", value: 10000 });
  assert.deepEqual(parseLimitValue("5%"), { ok: true, kind: "PERCENT", value: 5 });
  assert.equal(parseLimitValue("0.05").code, "AMBIGUOUS_LIMIT", "a bare fraction could be a percent cell");
  assert.equal(parseLimitValue("abc").code, "UNREADABLE_LIMIT");
  assert.equal(parseLimitValue("0").code, "INVALID_LIMIT");
  assert.equal(parseLimitValue("").code, "MISSING_LIMIT");
  assert.equal(normalizeRole("Finance Manager"), "finance_manager");
  assert.equal(isOwnerRole("OWNER"), true, "the production owner role is recognised");
  assert.equal(isOwnerRole("principal"), true);
  assert.equal(isOwnerRole("FINANCE_MANAGER"), false);
  assert.equal(formatMoney(5000), "RM 5,000");

  const workbook = readDelegationWorkbook({ filename: BASE, buffer: await readFile(join(fixtures, BASE)) });
  assert.equal(workbook.ok, true);
  assert.equal(workbook.limits.accepted.length, 5);
  assert.equal(workbook.matrix.accepted.length, 7);
  assert.equal(workbook.limits.accepted.find((row) => row.key === "discounts").kind, "PERCENT");
  const confirmation = validateConfirmation({ limits: workbook.limits.accepted, label_map: LABELS, document_types: TYPES });
  assert.equal(confirmation.ok, true, JSON.stringify(confirmation.errors));
  assert.equal(validateConfirmation({ limits: workbook.limits.accepted, label_map: LABELS, document_types: { PO: "Discounts" } }).errors[0].code, "PERCENT_NOT_ENFORCEABLE");
  const policy = { version: 1, ...buildPolicyContent({ limits: workbook.limits.accepted, matrix: workbook.matrix.accepted, label_map: confirmation.label_map, document_types: confirmation.document_types }) };
  const need = (document_type, amount, currency = "MYR") => requirementFor({ policy, transaction: { transaction_id: "X", document_type, amount, currency } });
  // boundaries: a limit is inclusive (RM 5,000 is still Tier 1)
  assert.equal(need("PO", 5000).tier, 1);
  assert.equal(need("PO", 5000.01).tier, 2);
  assert.equal(need("PO", 25000).tier, 2);
  assert.equal(need("PO", 25000.01).tier, 3);
  assert.equal(need("PO", 1800, "USD").tier, 3, "foreign currency cannot be compared: top tier");
  assert.equal(need("PO", null).governed, false);
  assert.equal(need("EC", 380.5).reason, "DOCUMENT_TYPE_NOT_GOVERNED");
  assert.equal(requirementFor({ policy: null, transaction: { document_type: "PO", amount: 1 } }).reason, "NO_POLICY");
  const decide = (requirement, actor_role, is_owner = false) => authorizeApproval({ requirement, policy, actor_role, is_owner }).decision;
  assert.equal(decide(need("PO", 100), "PROCUREMENT_MANAGER"), "ALLOW");
  assert.equal(decide(need("PO", 6000), "PROCUREMENT_MANAGER"), "DENY");
  assert.equal(decide(need("PO", 6000), "finance-manager"), "ALLOW", "role matching ignores case and dashes");
  assert.equal(decide(need("PO", 100), "FINANCE_MANAGER"), "ALLOW", "a higher approver covers a lower tier");
  assert.equal(decide(need("PO", 30000), "FINANCE_MANAGER"), "DENY");
  assert.equal(decide(need("PO", 30000), "anything", true), "ALLOW", "the owner is never blocked");

  start("api", ["apps/api/src/server.mjs"], {
    VFIRM_API_PORT: String(apiPort),
    ...(process.env.VFIRM_SMOKE_DATABASE_URL ? {} : { VFIRM_STORE_PATH: join(tmp, "store.json") }),
    DATABASE_URL: process.env.VFIRM_SMOKE_DATABASE_URL ?? "",
    VFIRM_STORE_BACKEND: process.env.VFIRM_SMOKE_DATABASE_URL ? "postgres" : "json",
    VFIRM_FILE_STORAGE_BACKEND: "local",
    VFIRM_FILE_LOCAL_DIR: join(tmp, "files")
  });
  await waitForJson(`${apiBase}/health`);

  // =============== Firm A: the policy lifecycle ===============
  const A = await newFirm("Alpha");
  const B = await newFirm("Bravo");
  const staffA = await hireStaff(A);
  await post("/edcs/connection", { ...A.s, company_code: "NEX", bizkick_version: "1.0" }, A.h);
  await importRegister(A);
  const delegation = (ctx, extra = "") => get(`/edcs/delegation?${q(ctx, extra)}`, ctx.h);
  assert.equal((await delegation(A)).active, null, "no policy yet");

  const base = await uploadFixture(A, BASE);
  const preview = await post("/edcs/delegation/preview", { ...A.s, file_id: base.id }, A.h);
  assert.equal(preview.limits.accepted.length, 5);
  assert.equal(preview.approver_labels.length, 6);
  assert.equal(preview.approver_labels.find((entry) => entry.label === "Owner / Board").suggested.owner, true, "Owner / Board is suggested as the owner");
  assert.deepEqual(preview.document_types.map((entry) => `${entry.document_type}=${entry.suggested}`), ["PCV=Payments", "PO=Purchases", "PV=Payments", "SA=Stock adjustments"]);
  assert.equal((await delegation(A)).active, null, "a preview saves nothing");

  // the owner confirms; staff cannot import; an incomplete mapping is refused
  await fails("POST", "/edcs/delegation/import", 403, "EDCS_OWNER_REQUIRED", { ...A.s, file_id: base.id, label_map: LABELS, document_types: TYPES }, A.staff);
  await fails("POST", "/edcs/delegation/preview", 403, "EDCS_OWNER_REQUIRED", { ...A.s, file_id: base.id }, A.staff);
  const partial = await fails("POST", "/edcs/delegation/import", 422, "DELEGATION_MAPPING_INVALID", { ...A.s, file_id: base.id, label_map: { "Owner / Board": { owner: true } }, document_types: TYPES }, A.h);
  assert.ok(partial.error.details.errors.some((e) => e.code === "MAPPING_INCOMPLETE" && e.label === "Finance Manager"));
  await fails("POST", "/edcs/delegation/import", 422, "DELEGATION_MAPPING_INVALID", { ...A.s, file_id: base.id, label_map: LABELS, document_types: { PO: "Discounts" } }, A.h);
  await fails("POST", "/edcs/delegation/import", 422, "DELEGATION_MAPPING_INVALID", { ...A.s, file_id: base.id, label_map: LABELS, document_types: { ZZ: "Purchases" } }, A.h);
  assert.equal((await delegation(A)).active, null, "refused imports saved nothing");

  // acceptance 1: first import = v1
  const first = await post("/edcs/delegation/import", { ...A.s, file_id: base.id, label_map: LABELS, document_types: TYPES }, A.h);
  assert.equal(first.outcome, "FIRST_VERSION");
  assert.equal(first.policy.version, 1);
  assert.equal(first.policy.counts.limits, 5);
  assert.equal(first.policy.counts.document_types, 4);
  const again = await post("/edcs/delegation/import", { ...A.s, file_id: base.id, label_map: LABELS, document_types: TYPES }, A.h);
  assert.equal(again.outcome, "NO_CHANGE", "the same workbook and mapping adds no version");
  assert.equal((await delegation(A)).versions.length, 1);

  // whole-file rejections (nothing is saved by a rejected file)
  const noSheet = await uploadFixture(A, NO_SHEET);
  const noSheetResult = await fails("POST", "/edcs/delegation/import", 422, "DELEGATION_FILE_REJECTED", { ...A.s, file_id: noSheet.id, label_map: LABELS, document_types: TYPES }, A.h);
  assert.equal(noSheetResult.error.details.reason, "SHEET_MISSING");
  const headerFile = await uploadFixture(A, HEADER);
  const headerResult = await fails("POST", "/edcs/delegation/import", 422, "DELEGATION_FILE_REJECTED", { ...A.s, file_id: headerFile.id, label_map: LABELS, document_types: TYPES }, A.h);
  assert.equal(headerResult.error.details.reason, "STRUCTURE_CHANGED");
  assert.equal(headerResult.error.details.column, "B");
  const csv = await uploadFixture(A, "limits.csv", { filename: "limits.csv", contentType: "text/csv", bytes: Buffer.from("a,b\n1,2\n") });
  assert.equal((await fails("POST", "/edcs/delegation/import", 422, "DELEGATION_FILE_REJECTED", { ...A.s, file_id: csv.id, label_map: LABELS, document_types: TYPES }, A.h)).error.details.reason, "WORKBOOK_REQUIRED");
  assert.equal((await delegation(A)).versions.length, 1, "rejected files saved nothing");

  // =============== enforcement under v1 ===============
  const requestFor = async (transactionId, requestType = "bank_reconciliation", staffCode = staffA.bookkeeper.staff_code) => {
    const source = transactionId ? { type: "BIZKICK_RULE", transaction_id: transactionId, rule_id: "smoke", rule_name: "CE-S5 smoke", reason: "SMOKE" } : undefined;
    const created = await post("/work-requests", { ...A.s, title: `Review ${transactionId ?? "plain work"}`, instructions: "CE-S5 smoke", request_type_id: requestType, ...(source ? { source } : {}) }, A.h);
    const wr = created.work_request ?? created;
    const assigned = await post("/work-requests/assign", { ...A.s, work_request_id: wr.id, staff_code: staffCode }, A.h);
    const itemId = assigned.workdesk_item?.id ?? assigned.workdesk_item_id ?? assigned.work_request?.workdesk_item_id;
    assert.ok(itemId, `assignment returned the item: ${JSON.stringify(assigned).slice(0, 300)}`);
    const draft = await post("/awia/virtual-staff/output-draft", { ...A.s, workdesk_item_id: itemId, output_payload: { note: "smoke-supplied payload" } }, A.h);
    return draft.output_draft;
  };
  const review = (draft, role, decision = "APPROVED_FOR_CLIENT_DRAFT") => request("/awia/virtual-staff/output-review", { method: "POST", body: { ...A.s, output_draft_id: draft.id, review_decision: decision }, headers: A.as(role) });
  const auditText = async () => JSON.stringify(await get(`/audit-events?${q(A)}`, A.h));
  const eventCount = (text, name) => text.split(`"${name}"`).length - 1;

  // PO-0001 RM 2,850 -> Tier 1 (Procurement Manager)
  const po1 = await requestFor(tx("PO-2026-0001"));
  assert.equal(po1.delegation_requirement?.tier, 1, "the tier is recorded on the draft");
  assert.equal(po1.delegation_requirement.approver_label, "Procurement Manager");
  assert.equal(po1.delegation_requirement.policy_version, 1);
  const check1 = await post("/edcs/delegation/check", { ...A.s, output_draft_id: po1.id }, A.as("FINANCE_MANAGER"));
  assert.equal(check1.would_allow, true, "a Tier 2 approver also covers Tier 1");
  assert.equal(check1.via, "ROLE");
  const okPo1 = await review(po1, "PROCUREMENT_MANAGER");
  assert.equal(okPo1.response.status, 201, JSON.stringify(okPo1.json));
  assert.equal(okPo1.json.data.output_draft.status, "APPROVED_FOR_CLIENT_DRAFT");

  // acceptance 2: PO-0002 RM 5,400 -> Tier 2 (Finance Manager)
  const po2 = await requestFor(tx("PO-2026-0002"));
  assert.equal(po2.delegation_requirement.tier, 2);
  assert.equal(po2.delegation_requirement.approver_label, "Finance Manager");
  const checkNo = await post("/edcs/delegation/check", { ...A.s, output_draft_id: po2.id }, A.as("PROCUREMENT_MANAGER"));
  assert.equal(checkNo.would_allow, false);
  const denied = await review(po2, "PROCUREMENT_MANAGER");
  assert.equal(denied.response.status, 409);
  assert.equal(denied.json.error.code, "DELEGATION_APPROVER_REQUIRED");
  assert.match(denied.json.error.message, /Finance Manager/, "the refusal names the required approver");
  assert.match(denied.json.error.message, /Tier 2/);
  assert.match(denied.json.error.message, /PO/);
  const stillDraft = (await get("/mvp/store", A.h)).awia_staff_output_drafts.find((d) => d.id === po2.id);
  assert.notEqual(stillDraft.status, "APPROVED_FOR_CLIENT_DRAFT", "a refused approval changes nothing");
  assert.equal((await review(po2, "PROCUREMENT_MANAGER", "REVISION_REQUIRED")).response.status, 201, "sending it back needs no tier");
  const po2b = await requestFor(tx("PO-2026-0002"));
  const okPo2 = await review(po2b, "finance-manager");
  assert.equal(okPo2.response.status, 201, JSON.stringify(okPo2.json));

  // foreign currency -> top tier: Finance Manager refused, the owner passes
  const po3 = await requestFor(tx("PO-2026-0003"));
  assert.equal(po3.delegation_requirement.tier, 3);
  assert.equal(po3.delegation_requirement.foreign_currency, true);
  assert.equal(po3.delegation_requirement.approver_label, "Owner / Board");
  assert.equal((await review(po3, "FINANCE_MANAGER")).response.status, 409);
  assert.equal((await review(po3, "AUTHORISED_MANAGER")).response.status, 409, "Owner / Board is the owner, not a manager role");
  const okPo3 = await review(po3, "OWNER");
  assert.equal(okPo3.response.status, 201, "the production owner role passes: a single-owner firm is never blocked");

  // stock adjustment RM 2,300 -> Tier 2 (Authorised Manager)
  const sa1 = await requestFor(tx("SA-2026-0001"));
  assert.equal(sa1.delegation_requirement.approver_label, "Authorised Manager");
  assert.equal((await review(sa1, "FINANCE_MANAGER")).response.status, 409);
  assert.equal((await review(sa1, "AUTHORISED_MANAGER")).response.status, 201);

  // acceptance 3: not EDCS-linked, or no limit for the document type: unaffected
  const plain = await requestFor(null);
  assert.equal(plain.delegation_requirement, undefined);
  assert.equal((await review(plain, "PROCUREMENT_MANAGER")).response.status, 201, "non-EDCS work is unaffected");
  const ec1 = await requestFor(tx("EC-2026-0001"));
  assert.equal(ec1.delegation_requirement, undefined, "an expense claim has no mapped limit");
  assert.equal((await review(ec1, "SALES_MANAGER")).response.status, 201);

  // acceptance 4: Class A still needs Class A approval whatever the tier
  const onboarding = await requestFor(tx("PO-2026-0001"), "employee_onboarding", staffA.hrAdmin.staff_code);
  assert.equal(onboarding.class_a_approval_required, true);
  for (const role of ["PROCUREMENT_MANAGER", "principal"]) {
    const classA = await review(onboarding, role);
    assert.equal(classA.response.status, 409, `${role}: Class A is refused even within tier`);
    assert.match(classA.json.error.message, /CLASS_A_APPROVAL_REQUIRED_BEFORE_CLIENT_DRAFT/);
  }

  // audit: both outcomes are recorded
  const audit = await auditText();
  assert.ok(eventCount(audit, "edcs.delegation_denied") >= 4, "refusals audited");
  assert.ok(eventCount(audit, "edcs.delegation_allowed") >= 5, "approvals within authority audited");
  for (const event of ["edcs.delegation_imported", "edcs.delegation_requirement_recorded"]) assert.ok(audit.includes(event), event);

  // =============== a changed workbook is a new version ===============
  const changedFile = await uploadFixture(A, CHANGED);
  const second = await post("/edcs/delegation/import", { ...A.s, file_id: changedFile.id, label_map: LABELS, document_types: TYPES }, A.h);
  assert.equal(second.outcome, "NEW_VERSION");
  assert.equal(second.policy.version, 2);
  const limitChange = second.changes.find((change) => change.area === "LIMIT" && change.name === "Purchases");
  assert.equal(limitChange.change, "CHANGED");
  assert.match(limitChange.before, /RM 5,000/);
  assert.match(limitChange.after, /RM 8,000/);
  const versions = await delegation(A);
  assert.equal(versions.versions.length, 2);
  assert.deepEqual(versions.versions.map((v) => `${v.version}:${v.status}`), ["2:ACTIVE", "1:SUPERSEDED"]);
  assert.equal(versions.versions.find((v) => v.version === 1).superseded_by_version, 2);
  assert.equal((await delegation(A, "&version=1")).selected.status, "SUPERSEDED", "an old version stays readable");
  await fails("GET", `/edcs/delegation?${q(A, "&version=9")}`, 404, "NOT_FOUND", undefined, A.h);
  // the new limits apply to new decisions: RM 5,400 is now Tier 1
  const po2c = await requestFor(tx("PO-2026-0002"));
  assert.equal(po2c.delegation_requirement.tier, 1);
  assert.equal(po2c.delegation_requirement.policy_version, 2);
  assert.equal((await review(po2c, "PROCUREMENT_MANAGER")).response.status, 201);
  assert.ok(eventCount(await auditText(), "edcs.delegation_imported") >= 2);

  // =============== Firm B: bad rows and isolation ===============
  const badFile = await uploadFixture(B, BAD_ROWS);
  const badPreview = await post("/edcs/delegation/preview", { ...B.s, file_id: badFile.id }, B.h);
  assert.equal(badPreview.limits.accepted.length, 5);
  assert.deepEqual(badPreview.limits.rejected.map((row) => row.reasons[0]), ["UNREADABLE_LIMIT", "LIMITS_NOT_ASCENDING", "DUPLICATE_TRANSACTION_TYPE", "AMBIGUOUS_LIMIT"]);
  assert.ok(badPreview.limits.rejected.every((row) => row.row_number >= 9 && row.reason_details.length >= 1));
  const badImport = await post("/edcs/delegation/import", { ...B.s, file_id: badFile.id, label_map: LABELS, document_types: TYPES }, B.h);
  assert.equal(badImport.outcome, "FIRST_VERSION");
  assert.equal(badImport.policy.counts.rejected_rows, 4, "the usable rows imported; the bad rows are recorded, not enforced");
  assert.equal((await delegation(B)).versions.length, 1, "firm B has its own versions");
  assert.equal((await delegation(A)).versions.length, 2, "firm A is untouched by firm B");
  await fails("POST", "/edcs/delegation/preview", 404, null, { ...B.s, file_id: base.id }, B.h); // A's file is not B's
  await fails("POST", "/edcs/delegation/check", 404, "NOT_FOUND", { ...B.s, output_draft_id: po1.id }, B.h);

  // export carries the versions
  const exportA = await get(`/data-protection/export-package?${q(A)}`, A.h);
  assert.equal(exportA.records.approval_policies.length, 2, "the export carries the policy versions");
  assert.equal(exportA.records.approval_policies.every((item) => item.firm_id === A.firm.id), true);

  console.log(JSON.stringify({
    smoke: "ce-s5-delegation-of-authority",
    result: "passed",
    backend: process.env.VFIRM_SMOKE_DATABASE_URL ? "postgres" : "json",
    acceptance: ["import_creates_policy_and_reimport_with_changes_creates_new_version", "draft_above_tier_refused_for_lower_reviewer_allowed_for_higher_role_both_audited", "non_edcs_work_unaffected", "class_a_still_requires_class_a_approval"],
    guards_confirmed: ["owner_confirms_mapping", "owner_only_import", "row_level_rejections", "whole_file_rejections", "foreign_currency_top_tier", "owner_never_blocked", "higher_approver_covers_lower", "tier_recorded_on_draft", "firm_isolation", "export_includes_versions"],
    versions_firm_a: versions.versions.length
  }, null, 2));
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  for (const child of children.map((c) => c)) if (child.exitCode === null && !child.killed) child.kill();
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await rm(tmp, { recursive: true, force: true });
}
