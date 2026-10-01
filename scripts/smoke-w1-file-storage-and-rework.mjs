import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";

// ADR-089 W1 (2026-09-30) -- firm operating workflow foundations:
//
//  B1) File storage: an owner uploads real files (raw-binary POST /files/upload), each gets a
//      SHA-256 and a file_objects record; files are attached to a worker's assignment as
//      "file:<id>" evidence refs and as an owner-attached output file on a draft; downloads
//      return the exact bytes and are audited. Guards: anonymous upload/download refused,
//      another firm cannot download or attach this firm's file, disallowed types and
//      oversize bodies refused.
//  B3) Rework: REVISION_REQUIRED sends the item back to the worker as REWORK (Pending bucket),
//      the worker produces a second draft that supersedes the first, and that draft can then be
//      approved and taken through client delivery -- the old dead end is gone.
//
// Local JSON backend + local-disk file storage (VFIRM_FILE_STORAGE_BACKEND=local), temp dirs.

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-w1-files-"));
const apiPort = 3148;
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
  const { json } = await request(path, { method: "POST", body, headers });
  assert.notEqual(json.ok, true, `${path} unexpectedly succeeded: ${JSON.stringify(json)}`);
  return json;
}
async function upload(firm, headers, filename, contentType, bytes, extra = "") {
  const response = await fetch(`${apiBase}/files/upload?tenant_id=${firm.tenant_id}&firm_id=${firm.id}&filename=${encodeURIComponent(filename)}${extra}`, { method: "POST", headers: { "content-type": contentType, ...headers }, body: bytes });
  const json = await response.json();
  return { response, json };
}
function authHeaders(actorId, firm) {
  return { "x-vfirm-actor-id": actorId, "x-vfirm-tenant-id": firm.tenant_id, "x-vfirm-firm-id": firm.id, "x-vfirm-role": "principal" };
}
async function openRealTask(firm, h, label) {
  const enquiry = await post("/front-desk/enquiries", { tenant_id: firm.tenant_id, firm_id: firm.id, contact_name: `${label} Contact`, organization_name: `${label} Sdn Bhd`, contact_email: `${label.toLowerCase().replace(/\s+/g, "-")}@w1-smoke.example`, enquiry_summary: `Need support: ${label}`, requested_service_hint: "Finance Analysis" }, h);
  await post("/front-desk/enquiries/qualify", { tenant_id: firm.tenant_id, firm_id: firm.id, enquiry_id: enquiry.id, decision: "QUALIFIED", consent_or_legal_basis_ref: `${label}-CONSENT`, conflict_check_status: "CLEARED", conflict_check_ref: `${label}-CONFLICT-CLEARED` }, h);
  const handoff = await post("/front-desk/enquiries/handoff", { tenant_id: firm.tenant_id, firm_id: firm.id, enquiry_id: enquiry.id, provided_inputs: {} }, h);
  const intake = await post("/intake-sessions", { tenant_id: firm.tenant_id, firm_id: firm.id, relationship_id: handoff.relationship.id, provided_inputs: { engagement_summary: label } }, h);
  const proposal = await post("/proposals", { tenant_id: firm.tenant_id, firm_id: firm.id, relationship_id: handoff.relationship.id, intake_session_id: intake.intake.id, scope_summary: label, final_price: 1200 }, h);
  const approved = await post("/proposals/approve", { tenant_id: firm.tenant_id, firm_id: firm.id, proposal_id: proposal.proposal.id }, h);
  const opened = await post("/proposals/accept", { tenant_id: firm.tenant_id, firm_id: firm.id, proposal_id: approved.proposal.id, project_name: label }, h);
  const relationships = await get(`/firm-client-relationships?tenant_id=${firm.tenant_id}&firm_id=${firm.id}`, h);
  const relationship = relationships.find((item) => item.id === opened.project.relationship_id);
  return { task: opened.task, project: opened.project, clientId: relationship.client_id };
}

try {
  start("api", ["apps/api/src/server.mjs"], {
    VFIRM_API_PORT: String(apiPort),
    // (VFIRM_STORE_PATH forces the JSON backend, so it is only set in JSON mode.)
    ...(process.env.VFIRM_SMOKE_DATABASE_URL ? {} : { VFIRM_STORE_PATH: join(tmp, "store.json") }),
    // Set VFIRM_SMOKE_DATABASE_URL to a disposable, fully-migrated Postgres (incl. 0048) to run
    // this same smoke against the relational backend; defaults to the local JSON store.
    DATABASE_URL: process.env.VFIRM_SMOKE_DATABASE_URL ?? "",
    VFIRM_STORE_BACKEND: process.env.VFIRM_SMOKE_DATABASE_URL ? "postgres" : "json",
    VFIRM_FILE_STORAGE_BACKEND: "local",
    VFIRM_FILE_LOCAL_DIR: join(tmp, "files"),
    VFIRM_FILE_MAX_BYTES: String(64 * 1024)
  });
  await waitForJson(`${apiBase}/health`);

  const tenant = await post("/tenants", { name: "W1 Files Smoke Tenant" });
  const seed = await post("/firms", { tenant_id: tenant.id, name: "W1 Files Smoke Sdn Bhd", principal_name: "W1 Owner" });
  const firm = seed.firm;
  const h = authHeaders(seed.principal_actor.id, firm);
  const otherTenant = await post("/tenants", { name: "W1 Other Tenant" });
  const otherSeed = await post("/firms", { tenant_id: otherTenant.id, name: "W1 Other Firm", principal_name: "Other Owner" });
  const otherFirm = otherSeed.firm;
  const oh = authHeaders(otherSeed.principal_actor.id, otherFirm);

  // ---- B1: upload ----
  const csv = Buffer.from("date,description,amount\n2026-09-01,Opening balance,1000.00\n2026-09-15,Supplier payment,-250.00\n", "utf8");
  const up = await upload(firm, h, "bank-statement-sep.csv", "text/csv", csv, "&classification=FINANCE_RESTRICTED");
  assert.equal(up.response.status, 201, JSON.stringify(up.json));
  const inputFile = up.json.data;
  assert.equal(inputFile.sha256, createHash("sha256").update(csv).digest("hex"));
  assert.equal(inputFile.size_bytes, csv.length);
  assert.equal(inputFile.mime_type, "text/csv");
  assert.equal(inputFile.classification, "FINANCE_RESTRICTED");
  assert.equal(inputFile.storage_backend, "local");
  assert.equal(inputFile.storage_key, `tenant/${firm.tenant_id}/firm/${firm.id}/${inputFile.id}`);

  // guards
  const anon = await upload(firm, {}, "x.csv", "text/csv", csv);
  assert.equal(anon.response.status, 401, "anonymous upload must be refused");
  const crossScope = await upload(firm, oh, "x.csv", "text/csv", csv);
  assert.equal(crossScope.response.status, 403, "another firm's actor must not upload into this firm");
  const badType = await upload(firm, h, "payload.exe", "application/octet-stream", Buffer.from("MZ"));
  assert.equal(badType.response.status, 415, "disallowed file type must be refused");
  const tooBig = await upload(firm, h, "big.txt", "text/plain", Buffer.alloc(65 * 1024, 65));
  assert.equal(tooBig.response.status, 413, "oversize upload must be refused");
  const empty = await upload(firm, h, "empty.txt", "text/plain", Buffer.alloc(0));
  assert.equal(empty.response.status, 400, "empty upload must be refused");

  // download: exact bytes back, audited; anon + cross-firm refused
  const dl = await fetch(`${apiBase}/files/${inputFile.id}/download?tenant_id=${firm.tenant_id}&firm_id=${firm.id}`, { headers: h });
  assert.equal(dl.status, 200);
  assert.equal(Buffer.from(await dl.arrayBuffer()).equals(csv), true, "downloaded bytes must equal uploaded bytes");
  assert.equal(dl.headers.get("x-vfirm-file-sha256"), inputFile.sha256);
  assert.match(dl.headers.get("content-disposition") ?? "", /bank-statement-sep\.csv/);
  const anonDl = await fetch(`${apiBase}/files/${inputFile.id}/download?tenant_id=${firm.tenant_id}&firm_id=${firm.id}`);
  assert.equal(anonDl.status, 401);
  const crossDl = await fetch(`${apiBase}/files/${inputFile.id}/download?tenant_id=${otherFirm.tenant_id}&firm_id=${otherFirm.id}`, { headers: oh });
  assert.equal(crossDl.status, 404, "another firm must not be able to fetch this firm's file by id");

  const fileList = await get(`/file-objects?tenant_id=${firm.tenant_id}&firm_id=${firm.id}`, h);
  assert.equal(fileList.length, 1, "only the one successful upload is recorded");
  const anonList = await fetch(`${apiBase}/file-objects?tenant_id=${firm.tenant_id}&firm_id=${firm.id}`);
  assert.equal(anonList.status, 401, "file metadata must not be listed anonymously");

  // non-Latin filenames upload and download without breaking the response header
  const unicodeName = "Penyata Bank — ميزانية.pdf";
  const uni = await upload(firm, h, unicodeName, "application/pdf", Buffer.from("%PDF-1.4 unicode"));
  assert.equal(uni.response.status, 201, JSON.stringify(uni.json));
  const uniDl = await fetch(`${apiBase}/files/${uni.json.data.id}/download?tenant_id=${firm.tenant_id}&firm_id=${firm.id}`, { headers: h });
  assert.equal(uniDl.status, 200);
  assert.ok((uniDl.headers.get("content-disposition") ?? "").includes(encodeURIComponent(unicodeName)));

  // ---- hire + assign with file evidence ----
  await post("/ops/awia-package-assignment", { tenant_id: firm.tenant_id, firm_id: firm.id, package_code: "HIRE_ME" }, h);
  const hired = await post("/awia/virtual-staff/hire-worker", { tenant_id: firm.tenant_id, firm_id: firm.id, role_code: "CFO" }, h);
  const staffCode = hired.staff_code;
  await post("/awia/virtual-staff/lifecycle", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: staffCode, to_state: "ACTIVE" }, h);
  const t = await openRealTask(firm, h, "W1 Reconcile");

  // cross-firm file ref refused at assignment
  const otherUp = await upload(otherFirm, oh, "their-file.pdf", "application/pdf", Buffer.from("%PDF-1.4 other"));
  assert.equal(otherUp.response.status, 201);
  await postExpectFailure("/awia/virtual-staff/assign-task", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: staffCode, task_id: t.task.id, action: "finance.analysis.prepare", tool: "finance.analysis.prepare", client_id: t.clientId, project_id: t.project.id, evidence_refs: [`file:${otherUp.json.data.id}`] }, h);

  const assigned = await post("/awia/virtual-staff/assign-task", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: staffCode, task_id: t.task.id, action: "finance.analysis.prepare", tool: "finance.analysis.prepare", client_id: t.clientId, project_id: t.project.id, evidence_refs: [`file:${inputFile.id}`] }, h);
  assert.deepEqual(assigned.workdesk_item.evidence_refs, [`file:${inputFile.id}`]);

  // ---- B3: draft -> revision -> REWORK -> second draft with owner-attached output file ----
  const draft1 = await post("/awia/virtual-staff/output-draft", { tenant_id: firm.tenant_id, firm_id: firm.id, workdesk_item_id: assigned.workdesk_item.id }, h);
  assert.equal(draft1.output_draft.revision_number, 1);
  const revised = await post("/awia/virtual-staff/output-review", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: draft1.output_draft.id, review_decision: "REVISION_REQUIRED", review_notes: "Include the Sept supplier payment." }, h);
  assert.equal(revised.workdesk_item.workdesk_status, "REWORK");
  assert.equal(revised.workdesk_item.revision_request_notes, "Include the Sept supplier payment.");
  const storeAfterRevision = await get("/mvp/store", h);
  const itemAfterRevision = storeAfterRevision.awia_staff_workdesk_items.find((item) => item.id === assigned.workdesk_item.id);
  assert.equal(itemAfterRevision.display_status, "pending", "REWORK item must show under Pending, back with the worker");

  const outUp = await upload(firm, h, "reconciliation-v2.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", Buffer.from("PK fake xlsx bytes"), "&purpose=WORK_OUTPUT");
  assert.equal(outUp.response.status, 201);
  const outputFile = outUp.json.data;
  await postExpectFailure("/awia/virtual-staff/output-draft", { tenant_id: firm.tenant_id, firm_id: firm.id, workdesk_item_id: assigned.workdesk_item.id, output_file_id: otherUp.json.data.id }, h);
  const draft2 = await post("/awia/virtual-staff/output-draft", { tenant_id: firm.tenant_id, firm_id: firm.id, workdesk_item_id: assigned.workdesk_item.id, output_file_id: outputFile.id, output_summary: "Reconciliation v2" }, h);
  assert.equal(draft2.output_draft.revision_number, 2);
  assert.equal(draft2.output_draft.supersedes_output_draft_id, draft1.output_draft.id);
  assert.equal(draft2.output_draft.output_ref, `file:${outputFile.id}`);
  assert.equal(draft2.output_draft.revision_request_notes, "Include the Sept supplier payment.");
  assert.equal(draft2.output_draft.final_issue_allowed, false);
  assert.equal(draft2.workdesk_item.workdesk_status, "OUTPUT_DRAFTED");

  await post("/awia/virtual-staff/output-review", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: draft2.output_draft.id, review_decision: "APPROVED_FOR_CLIENT_DRAFT" }, h);
  const delivery = await post("/awia/virtual-staff/client-delivery-draft", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: draft2.output_draft.id, client_id: t.clientId }, h);
  assert.equal(delivery.client_delivery_draft.status, "CLIENT_DELIVERY_DRAFT_PREPARED");
  assert.equal(delivery.client_delivery_draft.delivery_file_id, outputFile.id, "the approved output file must carry into the client delivery draft");
  assert.equal(delivery.client_delivery_draft.delivery_ref, `file:${outputFile.id}`);
  const sent = await post("/awia/virtual-staff/client-delivery-draft/mark-sent", { tenant_id: firm.tenant_id, firm_id: firm.id, client_delivery_draft_id: delivery.client_delivery_draft.id }, h);
  assert.equal(sent.workdesk_item.workdesk_status, "ARCHIVED_SENT");

  // REWORK is archivable too (owner may dismiss instead of waiting for a redo)
  const t2 = await openRealTask(firm, h, "W1 Dismiss Rework");
  const a2 = await post("/awia/virtual-staff/assign-task", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: staffCode, task_id: t2.task.id, action: "finance.analysis.prepare", tool: "finance.analysis.prepare", client_id: t2.clientId, project_id: t2.project.id, evidence_refs: ["free-text-ref-still-allowed"] }, h);
  const d2 = await post("/awia/virtual-staff/output-draft", { tenant_id: firm.tenant_id, firm_id: firm.id, workdesk_item_id: a2.workdesk_item.id }, h);
  await post("/awia/virtual-staff/output-review", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: d2.output_draft.id, review_decision: "REVISION_REQUIRED" }, h);
  const dismissed = await post("/awia/virtual-staff/workdesk-item/archive", { tenant_id: firm.tenant_id, firm_id: firm.id, workdesk_item_id: a2.workdesk_item.id }, h);
  assert.equal(dismissed.workdesk_item.workdesk_status, "ARCHIVED_DISMISSED");

  // audit trail
  const audits = await get(`/audit-events?tenant_id=${firm.tenant_id}&firm_id=${firm.id}`, h);
  const auditText = JSON.stringify(audits);
  assert.ok(auditText.includes("file.uploaded"), "uploads must be audited");
  assert.ok(auditText.includes("file.downloaded"), "downloads must be audited");

  // export package includes file metadata (data portability)
  const exportPackage = await get(`/data-protection/export-package?tenant_id=${firm.tenant_id}&firm_id=${firm.id}`, h);
  assert.equal(exportPackage.counts.file_objects, 3, "export includes this firm's three file records only");

  console.log(JSON.stringify({
    smoke: "w1-file-storage-and-rework",
    result: "passed",
    files: { input: inputFile.id, output: outputFile.id, sha256_verified_on_download: true },
    guards_confirmed: ["anonymous_upload_401", "cross_firm_upload_403", "type_not_allowed_415", "too_large_413", "empty_400", "anonymous_download_401", "cross_firm_download_404", "cross_firm_evidence_ref_refused", "cross_firm_output_file_refused", "anonymous_list_401", "unicode_filename_ok"],
    rework: { first_draft: draft1.output_draft.id, second_draft: draft2.output_draft.id, final_status: "ARCHIVED_SENT" },
    audit_event_count: audits.length
  }, null, 2));
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  for (const child of children) if (child.exitCode === null && !child.killed) child.kill();
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await rm(tmp, { recursive: true, force: true });
}
