import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";

// ADR-093 W4 (2026-10-01) -- collaboration and filing:
//  B6 item conversation + NEEDS_INFO: assignment opens the item's thread; a run that lacks input
//     puts the item in NEEDS_INFO (Inbox) with the worker's question on the thread; the owner's
//     reply with a file answers it (back to ASSIGNED, file added to the request and evidence);
//     during a revision a NEEDS_INFO returns to REWORK; drafts and review decisions land on the
//     thread; notes on ordinary items do not change their status; a NEEDS_INFO item can be
//     dismissed.
//  B7 output filing: completing internal work files the approved output in the document register
//     (WR-xxxx-OUT, WORK_OUTPUT, storage_ref file:<id>, content_hash = SHA-256 of the output);
//     marking client work sent files it against the client's project.
//  F3 documents: register uploaded files (DOC-0001..., custom number unique), revise (R2, previous
//     SUPERSEDED, identical file refused). Guards: cross-firm message/register/revise refused,
//     empty message refused, files on closed work refused.
//
// Local JSON backend + local-disk file storage by default; set VFIRM_SMOKE_DATABASE_URL for Postgres.

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-w4-"));
const apiPort = 3153;
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
  const tenant = await post("/tenants", { name: `W4 Tenant ${stamp}` });
  const seed = await post("/firms", { tenant_id: tenant.id, name: `W4 Firm ${stamp}`, principal_name: "W4 Owner" });
  const firm = seed.firm;
  const h = authHeaders(seed.principal_actor.id, firm);
  const s = { tenant_id: firm.tenant_id, firm_id: firm.id };
  const otherTenant = await post("/tenants", { name: `W4 Other ${stamp}` });
  const otherSeed = await post("/firms", { tenant_id: otherTenant.id, name: `W4 Other Firm ${stamp}`, principal_name: "Other" });
  const otherFirm = otherSeed.firm;
  const oh = authHeaders(otherSeed.principal_actor.id, otherFirm);
  const os = { tenant_id: otherFirm.tenant_id, firm_id: otherFirm.id };

  await post("/ops/awia-package-assignment", { ...s, package_code: "HIRE_ME" }, h);
  const hire = (role_code, display_name, position_id) => post("/awia/virtual-staff/hire-worker", { ...s, role_code, display_name, position_id }, h);
  const bookkeeper = await hire("FAO", "Bookkeeper", "bookkeeper");
  const hrAdmin = await hire("ARO", "HR Administrator", "hr_administrator");
  const sales = await hire("SAO", "Sales Coordinator", "sales_coordinator");
  for (const hired of [bookkeeper, hrAdmin, sales]) await post("/awia/virtual-staff/lifecycle", { ...s, staff_code: hired.staff_code, to_state: "ACTIVE" }, h);

  const storeNow = () => get("/mvp/store", h);
  const threadFor = async (itemId) => {
    const store = await storeNow();
    const item = store.awia_staff_workdesk_items.find((i) => i.id === itemId);
    const messages = store.awia_staff_conversation_messages.filter((m) => m.workdesk_item_id === itemId).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    return { item, messages, store };
  };

  // ---- B6: assignment opens the thread; missing input -> NEEDS_INFO (Inbox) with the question ----
  const bank = await upload(firm, h, "bank-sep.csv", "text/csv", Buffer.from("date,reference,amount\n2026-09-01,INV-1,500\n2026-09-02,INV-2,120.50\n"));
  const wr = await post("/work-requests", { ...s, title: "Reconcile September", request_type_id: "bank_reconciliation", file_ids: [bank.id], file_roles: { [bank.id]: "bank_statement" }, assign_to_staff_code: bookkeeper.staff_code }, h);
  const itemId = wr.workdesk_item.id;
  let t = await threadFor(itemId);
  assert.ok(t.item.thread_id, "assignment opens the item's thread");
  assert.equal(t.messages.length, 1);
  assert.equal(t.messages[0].kind, "ASSIGNED");
  assert.equal(t.messages[0].participant_role, "VIRTUAL_STAFF");
  assert.match(t.messages[0].content, /Received WR-0001/);

  const missing = await postExpectFailure("/awia/virtual-staff/workdesk-item/run-skill", { ...s, workdesk_item_id: itemId }, h);
  assert.equal(missing.status, 422);
  t = await threadFor(itemId);
  assert.equal(t.item.workdesk_status, "NEEDS_INFO");
  assert.equal(t.item.display_status, "inbox");
  assert.equal(t.item.needs_info_return_status, "ASSIGNED");
  assert.equal(t.messages.at(-1).kind, "NEEDS_INFO");
  assert.match(t.messages.at(-1).content, /Book \/ ledger entries/);

  // guards: empty message, other firm, other firm's file
  await postExpectFailure("/awia/virtual-staff/workdesk-item/message", { ...s, workdesk_item_id: itemId, content: "   " }, h);
  await postExpectFailure("/awia/virtual-staff/workdesk-item/message", { ...os, workdesk_item_id: itemId, content: "hi" }, oh);
  const theirFile = await upload(otherFirm, oh, "theirs.csv", "text/csv", Buffer.from("a,b\n1,2\n"));
  await postExpectFailure("/awia/virtual-staff/workdesk-item/message", { ...s, workdesk_item_id: itemId, content: "x", file_ids: [theirFile.id] }, h);

  // the owner answers with the missing file -> back with the worker
  const ledger = await upload(firm, h, "ledger-sep.csv", "text/csv", Buffer.from("date,reference,amount\n2026-09-01,INV-1,500\n2026-09-02,INV-2,120.50\n"));
  const answered = await post("/awia/virtual-staff/workdesk-item/message", { ...s, workdesk_item_id: itemId, content: "Here is the ledger export.", file_ids: [ledger.id] }, h);
  assert.equal(answered.message.kind, "ANSWER");
  assert.equal(answered.message.participant_role, "HUMAN_SUPERVISOR");
  assert.equal(answered.workdesk_item.workdesk_status, "ASSIGNED");
  assert.equal(answered.workdesk_item.last_run_error, null);
  assert.ok(answered.workdesk_item.evidence_refs.includes(`file:${ledger.id}`));
  assert.ok((await storeNow()).work_requests.find((r) => r.id === wr.work_request.id).file_ids.includes(ledger.id));

  const run1 = await post("/awia/virtual-staff/workdesk-item/run-skill", { ...s, workdesk_item_id: itemId }, h);
  assert.equal(run1.output_draft.output_payload.reconciled, true);
  t = await threadFor(itemId);
  assert.equal(t.messages.at(-1).kind, "DRAFT_READY");

  // revision; a NEEDS_INFO during REWORK returns to REWORK
  await post("/awia/virtual-staff/output-review", { ...s, output_draft_id: run1.output_draft.id, review_decision: "REVISION_REQUIRED", review_notes: "Use the bank's own export" }, h);
  t = await threadFor(itemId);
  assert.equal(t.messages.at(-1).kind, "REVIEW");
  assert.match(t.messages.at(-1).content, /Revision requested: Use the bank's own export/);
  const badBank = await upload(firm, h, "bank-sep-export.csv", "text/csv", Buffer.from("date,reference,memo\n2026-09-01,INV-1,x\n"));
  await post("/work-requests/add-files", { ...s, work_request_id: wr.work_request.id, file_ids: [badBank.id], file_role: "bank_statement" }, h);
  await postExpectFailure("/awia/virtual-staff/workdesk-item/run-skill", { ...s, workdesk_item_id: itemId }, h);
  t = await threadFor(itemId);
  assert.equal(t.item.workdesk_status, "NEEDS_INFO");
  assert.equal(t.item.needs_info_return_status, "REWORK");
  const goodBank = await upload(firm, h, "bank-sep-export-v2.csv", "text/csv", Buffer.from("date,reference,amount\n2026-09-01,INV-1,500\n2026-09-02,INV-2,120.50\n"));
  const fixed = await post("/work-requests/add-files", { ...s, work_request_id: wr.work_request.id, file_ids: [goodBank.id], file_role: "bank_statement" }, h);
  assert.equal(fixed.workdesk_item.workdesk_status, "REWORK", "answering during a revision returns the item to REWORK");
  const run2 = await post("/awia/virtual-staff/workdesk-item/run-skill", { ...s, workdesk_item_id: itemId }, h);
  assert.equal(run2.output_draft.revision_number, 2);
  await post("/awia/virtual-staff/output-review", { ...s, output_draft_id: run2.output_draft.id, review_decision: "APPROVED_FOR_CLIENT_DRAFT" }, h);

  // ---- B7: completing internal work files the output ----
  const completed = await post("/awia/virtual-staff/workdesk-item/complete-internal", { ...s, workdesk_item_id: itemId }, h);
  const filed = completed.filed_document;
  assert.ok(filed, "internal output filed");
  assert.equal(filed.document_number, "WR-0001-OUT");
  assert.equal(filed.document_type, "WORK_OUTPUT");
  assert.equal(filed.project_id, null);
  assert.equal(filed.metadata.workdesk_item_id, itemId);
  assert.equal(completed.workdesk_item.filed_document_id, filed.id);
  let store = await storeNow();
  const filedRev = store.document_revision_records.find((r) => r.id === filed.current_revision_id);
  assert.equal(filedRev.storage_ref, `file:${run2.output_draft.output_file_id}`);
  assert.equal(filedRev.content_hash, sha(await download(firm, h, run2.output_draft.output_file_id)));
  assert.equal(filedRev.revision, "R1");
  t = await threadFor(itemId);
  assert.equal(t.messages.at(-1).kind, "CLOSED");
  assert.match(t.messages.at(-1).content, /Filed in Documents as WR-0001-OUT/);
  assert.deepEqual(t.messages.map((m) => m.kind), ["ASSIGNED", "NEEDS_INFO", "ANSWER", "DRAFT_READY", "REVIEW", "FILES_ADDED", "NEEDS_INFO", "FILES_ADDED", "DRAFT_READY", "REVIEW", "CLOSED"]);
  // closed work: no more files through the thread; a note is still fine
  await postExpectFailure("/awia/virtual-staff/workdesk-item/message", { ...s, workdesk_item_id: itemId, content: "late file", file_ids: [ledger.id] }, h);
  const note = await post("/awia/virtual-staff/workdesk-item/message", { ...s, workdesk_item_id: itemId, content: "Thanks, filed." }, h);
  assert.equal(note.message.kind, "NOTE");
  assert.equal(note.workdesk_item.workdesk_status, "ARCHIVED_COMPLETED");

  // ---- B7: client work marked sent is filed against the client's project ----
  const enquiry = await post("/front-desk/enquiries", { ...s, contact_name: "Aisyah", organization_name: "Kedai Maju Sdn Bhd", contact_email: `a-${stamp}@maju.example`, enquiry_summary: "Monthly bookkeeping retainer", requested_service_hint: "Bookkeeping" }, h);
  await post("/front-desk/enquiries/qualify", { ...s, enquiry_id: enquiry.id, decision: "QUALIFIED", consent_or_legal_basis_ref: "C", conflict_check_status: "CLEARED", conflict_check_ref: "CC" }, h);
  const handoff = await post("/front-desk/enquiries/handoff", { ...s, enquiry_id: enquiry.id, provided_inputs: {} }, h);
  const clientId = handoff.relationship.client_id;
  const intake = await post("/intake-sessions", { ...s, relationship_id: handoff.relationship.id, provided_inputs: { engagement_summary: "Retainer" } }, h);
  const proposal = await post("/proposals", { ...s, relationship_id: handoff.relationship.id, intake_session_id: intake.intake.id, scope_summary: "Retainer", final_price: 800 }, h);
  const approvedProposal = await post("/proposals/approve", { ...s, proposal_id: proposal.proposal.id }, h);
  const opened = await post("/proposals/accept", { ...s, proposal_id: approvedProposal.proposal.id, project_name: "Kedai Maju retainer" }, h);
  const letterReq = await post("/work-requests", { ...s, title: "October retainer letter", request_type_id: "client_message_draft", project_id: opened.project.id, assign_to_staff_code: sales.staff_code }, h);
  assert.equal(letterReq.assignment_error, null, JSON.stringify(letterReq));
  const letterItem = letterReq.workdesk_item.id;
  // a note on ordinary pending work does not change its status
  const pendingNote = await post("/awia/virtual-staff/workdesk-item/message", { ...s, workdesk_item_id: letterItem, content: "Keep it to one page." }, h);
  assert.equal(pendingNote.message.kind, "NOTE");
  assert.equal(pendingNote.workdesk_item.workdesk_status, "ASSIGNED");
  const letterFile = await upload(firm, h, "retainer-letter-oct.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", Buffer.from("PK letter v1"));
  const letterDraft = await post("/awia/virtual-staff/output-draft", { ...s, workdesk_item_id: letterItem, output_file_id: letterFile.id, output_title: "October retainer letter" }, h);
  await post("/awia/virtual-staff/output-review", { ...s, output_draft_id: letterDraft.output_draft.id, review_decision: "APPROVED_FOR_CLIENT_DRAFT" }, h);
  const delivery = await post("/awia/virtual-staff/client-delivery-draft", { ...s, output_draft_id: letterDraft.output_draft.id, client_id: clientId }, h);
  const sent = await post("/awia/virtual-staff/client-delivery-draft/mark-sent", { ...s, client_delivery_draft_id: delivery.client_delivery_draft.id }, h);
  assert.equal(sent.filed_document.document_number, "WR-0002-OUT");
  assert.equal(sent.filed_document.project_id, opened.project.id);
  assert.equal(sent.filed_document.relationship_id, handoff.relationship.id);
  t = await threadFor(letterItem);
  assert.deepEqual(t.messages.map((m) => m.kind), ["ASSIGNED", "NOTE", "OUTPUT_ATTACHED", "REVIEW", "CLOSED"]);

  // ---- NEEDS_INFO can be dismissed ----
  const onboard = await post("/work-requests", { ...s, title: "Onboard new clerk", request_type_id: "employee_onboarding", assign_to_staff_code: hrAdmin.staff_code }, h);
  await postExpectFailure("/awia/virtual-staff/workdesk-item/run-skill", { ...s, workdesk_item_id: onboard.workdesk_item.id }, h);
  const dismissed = await post("/awia/virtual-staff/workdesk-item/archive", { ...s, workdesk_item_id: onboard.workdesk_item.id }, h);
  assert.equal(dismissed.workdesk_item.workdesk_status, "ARCHIVED_DISMISSED");

  // ---- F3: documents straight into the register ----
  const contractBytes = Buffer.from("%PDF-1.4 tenancy agreement v1");
  const contract = await upload(firm, h, "tenancy-agreement.pdf", "application/pdf", contractBytes);
  const doc1 = await post("/documents", { ...s, file_id: contract.id, title: "Office tenancy agreement", document_type: "contract" }, h);
  assert.equal(doc1.document.document_number, "DOC-0001");
  assert.equal(doc1.document.document_type, "CONTRACT");
  assert.equal(doc1.revision.revision, "R1");
  assert.equal(doc1.revision.storage_ref, `file:${contract.id}`);
  assert.equal(doc1.revision.content_hash, sha(contractBytes));
  const sop = await upload(firm, h, "sop.txt", "text/plain", Buffer.from("Month-end SOP"));
  const doc2 = await post("/documents", { ...s, file_id: sop.id, project_id: opened.project.id }, h);
  assert.equal(doc2.document.document_number, "DOC-0002");
  assert.equal(doc2.document.title, "sop.txt");
  assert.equal(doc2.document.relationship_id, handoff.relationship.id);
  await postExpectFailure("/documents", { ...s, file_id: sop.id, document_number: "DOC-0001" }, h);
  await postExpectFailure("/documents", { ...s, file_id: theirFile.id }, h);
  await postExpectFailure("/documents", { ...os, file_id: contract.id }, oh);
  await postExpectFailure("/documents/revise", { ...s, document_register_entry_id: doc1.document.id, file_id: contract.id }, h); // identical
  const v2Bytes = Buffer.from("%PDF-1.4 tenancy agreement v2 (renewed)");
  const contractV2 = await upload(firm, h, "tenancy-agreement-2027.pdf", "application/pdf", v2Bytes);
  await postExpectFailure("/documents/revise", { ...os, document_register_entry_id: doc1.document.id, file_id: contractV2.id }, oh);
  const revised = await post("/documents/revise", { ...s, document_register_entry_id: doc1.document.id, file_id: contractV2.id, note: "Renewed to 2027" }, h);
  assert.equal(revised.revision.revision, "R2");
  assert.equal(revised.previous_revision.id, doc1.revision.id);
  store = await storeNow();
  assert.equal(store.document_revision_records.find((r) => r.id === doc1.revision.id).status, "SUPERSEDED");
  assert.equal(store.document_register_entries.find((e) => e.id === doc1.document.id).current_revision_id, revised.revision.id);
  assert.equal(store.document_register_entries.filter((e) => e.firm_id === firm.id).length, 4);

  // ---- audit ----
  const auditText = JSON.stringify(await get(`/audit-events?tenant_id=${firm.tenant_id}&firm_id=${firm.id}`, h));
  for (const event of ["document.work_output_filed", "awia.virtual_staff.workdesk_item_message_posted", "administration.document_registered", "administration.document_revision_registered", "awia.virtual_staff.skill_run_needs_input"]) assert.ok(auditText.includes(event), `missing audit event ${event}`);

  console.log(JSON.stringify({
    smoke: "w4-collaboration-and-filing",
    result: "passed",
    backend: process.env.VFIRM_SMOKE_DATABASE_URL ? "postgres" : "json",
    thread_kinds_client_work: t.messages.map((m) => m.kind),
    filed: ["WR-0001-OUT (internal)", "WR-0002-OUT (client project)"],
    documents: ["DOC-0001 R1->R2", "DOC-0002"],
    guards_confirmed: ["empty_message_refused", "cross_firm_message_refused", "cross_firm_file_on_message_refused", "files_on_closed_work_refused", "duplicate_document_number_refused", "cross_firm_register_and_revise_refused", "identical_revision_refused", "needs_info_returns_to_rework_during_revision", "needs_info_dismissable"]
  }, null, 2));
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  for (const child of children) if (child.exitCode === null && !child.killed) child.kill();
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await rm(tmp, { recursive: true, force: true });
}
