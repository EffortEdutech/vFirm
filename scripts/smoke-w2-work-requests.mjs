import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";

// (harness copied from smoke-w1) ADR-089 W1 (2026-09-30) -- firm operating workflow foundations:
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
const tmp = await mkdtemp(join(tmpdir(), "vfirm-w2-requests-"));
const apiPort = 3149;
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


// ADR-090 W2 (2026-10-01) -- owner work requests (the firm's front door):
//  - request-type menu; INTERNAL request (no client) with input files -> Inbox (SUBMITTED) with a
//    deterministic ARO-01 triage suggestion; wrong-position worker refused; assign -> ad-hoc task +
//    workdesk item through the governed path (skill scope FAO-11, evidence = files + request);
//    add files after assignment; approve; client delivery REFUSED for internal work;
//    complete-internal -> ARCHIVED_COMPLETED.
//  - client request with "assign now" (D3) -> straight to Pending; client delivery allowed.
//  - Class A request (ARO-10) -> draft requires owner Class A approval.
//  - cancel; cross-firm isolation; non-INTERNAL work without a client still refused by the gate.
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
  const tenant = await post("/tenants", { name: `W2 Tenant ${stamp}` });
  const seed = await post("/firms", { tenant_id: tenant.id, name: `W2 Firm ${stamp}`, principal_name: "W2 Owner" });
  const firm = seed.firm;
  const h = authHeaders(seed.principal_actor.id, firm);
  const s = { tenant_id: firm.tenant_id, firm_id: firm.id };
  const otherTenant = await post("/tenants", { name: `W2 Other ${stamp}` });
  const otherSeed = await post("/firms", { tenant_id: otherTenant.id, name: `W2 Other Firm ${stamp}`, principal_name: "Other" });
  const otherFirm = otherSeed.firm;
  const oh = authHeaders(otherSeed.principal_actor.id, otherFirm);

  await post("/ops/awia-package-assignment", { ...s, package_code: "HIRE_ME" }, h);
  const bookkeeper = await post("/awia/virtual-staff/hire-worker", { ...s, role_code: "FAO", display_name: "Bookkeeper", position_id: "bookkeeper" }, h);
  const hrAdmin = await post("/awia/virtual-staff/hire-worker", { ...s, role_code: "ARO", display_name: "HR Administrator", position_id: "hr_administrator" }, h);
  const sales = await post("/awia/virtual-staff/hire-worker", { ...s, role_code: "SAO", display_name: "Sales Coordinator", position_id: "sales_coordinator" }, h);
  for (const hired of [bookkeeper, hrAdmin, sales]) await post("/awia/virtual-staff/lifecycle", { ...s, staff_code: hired.staff_code, to_state: "ACTIVE" }, h);

  // request types
  const types = await get("/work-requests/request-types", h);
  const recon = types.find((t) => t.id === "bank_reconciliation");
  assert.ok(recon && recon.skill_id === "FAO-11" && recon.class_a === false);
  assert.equal(types.find((t) => t.id === "employee_onboarding").class_a, true);

  // ---- INTERNAL request with files -> Inbox ----
  const bank = (await upload(firm, h, "bank-sept.csv", "text/csv", Buffer.from("date,amount\n2026-09-01,100\n"))).json.data;
  const ledger = (await upload(firm, h, "ledger-sept.csv", "text/csv", Buffer.from("date,amount\n2026-09-01,100\n"))).json.data;
  const created = await post("/work-requests", { ...s, title: "Reconcile September bank vs books", instructions: "Bank statement vs ledger, flag the payment receipt differences.", request_type_id: "bank_reconciliation", priority: "HIGH", file_ids: [bank.id, ledger.id], references: ["Owner call 30 Sep"] }, h);
  const wr = created.work_request;
  assert.equal(wr.status, "SUBMITTED");
  assert.equal(wr.risk_class, "INTERNAL");
  assert.equal(wr.client_id, null);
  assert.equal(wr.request_number, "WR-0001");
  assert.equal(wr.triage_suggestion.category, "FINANCE_GENERAL", "ARO-01 triage should read 'payment/receipt' as finance");
  assert.equal(wr.triage_suggestion.suggested_position_id, "bookkeeper");
  assert.equal(created.workdesk_item, null);
  const inbox = (await get("/mvp/store", h)).work_requests.filter((r) => r.firm_id === firm.id && r.status === "SUBMITTED");
  assert.equal(inbox.length, 1);

  // cross-firm file on create refused; unknown type refused
  const otherFile = (await upload(otherFirm, oh, "theirs.pdf", "application/pdf", Buffer.from("%PDF other"))).json.data;
  await postExpectFailure("/work-requests", { ...s, title: "x", request_type_id: "bank_reconciliation", file_ids: [otherFile.id] }, h);
  await postExpectFailure("/work-requests", { ...s, title: "x", request_type_id: "not_a_type" }, h);

  // wrong-position worker refused; request stays SUBMITTED
  await postExpectFailure("/work-requests/assign", { ...s, work_request_id: wr.id, staff_code: hrAdmin.staff_code }, h);
  // other firm cannot touch this firm's request
  await postExpectFailure("/work-requests/assign", { tenant_id: otherFirm.tenant_id, firm_id: otherFirm.id, work_request_id: wr.id, staff_code: bookkeeper.staff_code }, oh);
  await postExpectFailure("/work-requests/cancel", { tenant_id: otherFirm.tenant_id, firm_id: otherFirm.id, work_request_id: wr.id }, oh);

  const assigned = await post("/work-requests/assign", { ...s, work_request_id: wr.id, staff_code: bookkeeper.staff_code }, h);
  assert.equal(assigned.work_request.status, "ASSIGNED");
  const item = assigned.workdesk_item;
  assert.equal(item.risk_class, "INTERNAL");
  assert.equal(item.skill_id, "FAO-11");
  assert.equal(item.work_request_id, wr.id);
  assert.equal(item.project_id, null);
  assert.deepEqual(item.evidence_refs, [`file:${bank.id}`, `file:${ledger.id}`, "Owner call 30 Sep", `work-request:${wr.id}`]);
  await postExpectFailure("/work-requests/assign", { ...s, work_request_id: wr.id, staff_code: bookkeeper.staff_code }, h); // not twice
  const task = (await get("/mvp/store", h)).tasks.find((t) => t.id === assigned.work_request.task_id);
  assert.ok(task, "ad-hoc task must exist");
  assert.equal(task.input_ref, `work-request:${wr.id}`);

  // add a file after assignment -> lands on the item too
  const extra = (await upload(firm, h, "sept-receipts.pdf", "application/pdf", Buffer.from("%PDF receipts"))).json.data;
  const added = await post("/work-requests/add-files", { ...s, work_request_id: wr.id, file_ids: [extra.id] }, h);
  assert.ok(added.workdesk_item.evidence_refs.includes(`file:${extra.id}`));

  // ADR-092 W3: work given through a request never gets an empty placeholder draft.
  await postExpectFailure("/awia/virtual-staff/output-draft", { ...s, workdesk_item_id: item.id }, h);
  const draft = await post("/awia/virtual-staff/output-draft", { ...s, workdesk_item_id: item.id, output_payload: { note: "smoke-supplied payload" } }, h);
  await post("/awia/virtual-staff/output-review", { ...s, output_draft_id: draft.output_draft.id, review_decision: "APPROVED_FOR_CLIENT_DRAFT" }, h);
  await postExpectFailure("/awia/virtual-staff/client-delivery-draft", { ...s, output_draft_id: draft.output_draft.id, client_id: "anything" }, h);
  const completed = await post("/awia/virtual-staff/workdesk-item/complete-internal", { ...s, workdesk_item_id: item.id }, h);
  assert.equal(completed.workdesk_item.workdesk_status, "ARCHIVED_COMPLETED");
  const bucket = (await get("/mvp/store", h)).awia_staff_workdesk_items.find((i) => i.id === item.id).display_status;
  assert.equal(bucket, "archived");

  // ---- client request (needs the client's project), assign now (D3) ----
  const enquiry = await post("/front-desk/enquiries", { ...s, contact_name: "Aisyah", organization_name: "Kedai Maju Sdn Bhd", contact_email: `a-${stamp}@maju.example`, enquiry_summary: "Monthly bookkeeping retainer", requested_service_hint: "Bookkeeping" }, h);
  await post("/front-desk/enquiries/qualify", { ...s, enquiry_id: enquiry.id, decision: "QUALIFIED", consent_or_legal_basis_ref: "C", conflict_check_status: "CLEARED", conflict_check_ref: "CC" }, h);
  const handoff = await post("/front-desk/enquiries/handoff", { ...s, enquiry_id: enquiry.id, provided_inputs: {} }, h);
  const clientId = handoff.relationship.client_id;
  const intake = await post("/intake-sessions", { ...s, relationship_id: handoff.relationship.id, provided_inputs: { engagement_summary: "Retainer" } }, h);
  const proposal = await post("/proposals", { ...s, relationship_id: handoff.relationship.id, intake_session_id: intake.intake.id, scope_summary: "Retainer", final_price: 800 }, h);
  const approvedProposal = await post("/proposals/approve", { ...s, proposal_id: proposal.proposal.id }, h);
  const opened = await post("/proposals/accept", { ...s, proposal_id: approvedProposal.proposal.id, project_name: "Kedai Maju retainer" }, h);
  // client without a project is refused up front with a clear message
  await postExpectFailure("/work-requests", { ...s, title: "No project", request_type_id: "client_message_draft", client_id: clientId }, h);
  // project implies its client
  const clientReq = await post("/work-requests", { ...s, title: "Draft the October retainer letter", request_type_id: "client_message_draft", project_id: opened.project.id, assign_to_staff_code: sales.staff_code }, h);
  assert.equal(clientReq.assignment_error, null, JSON.stringify(clientReq));
  assert.equal(clientReq.work_request.client_id, clientId);
  assert.equal(clientReq.work_request.status, "ASSIGNED");
  assert.equal(clientReq.work_request.risk_class, "CONTROLLED");
  assert.equal(clientReq.workdesk_item.risk_class, "CONTROLLED");
  // pre-sales on a prospect is the firm's own work (INTERNAL) -- lead scoring with no client
  const leadReq = await post("/work-requests", { ...s, title: "Score the Kedai Maju enquiry", request_type_id: "lead_qualification", assign_to_staff_code: sales.staff_code }, h);
  assert.equal(leadReq.assignment_error, null, JSON.stringify(leadReq));
  assert.equal(leadReq.work_request.risk_class, "INTERNAL");
  const cDraft = await post("/awia/virtual-staff/output-draft", { ...s, workdesk_item_id: clientReq.workdesk_item.id, output_payload: { note: "smoke-supplied payload" } }, h);
  await post("/awia/virtual-staff/output-review", { ...s, output_draft_id: cDraft.output_draft.id, review_decision: "APPROVED_FOR_CLIENT_DRAFT" }, h);
  const cDelivery = await post("/awia/virtual-staff/client-delivery-draft", { ...s, output_draft_id: cDraft.output_draft.id, client_id: clientId }, h);
  assert.equal(cDelivery.client_delivery_draft.status, "CLIENT_DELIVERY_DRAFT_PREPARED");
  await postExpectFailure("/awia/virtual-staff/workdesk-item/complete-internal", { ...s, workdesk_item_id: clientReq.workdesk_item.id }, h);

  // assign-now to the wrong worker: request is created, stays in Inbox, error surfaced
  const refused = await post("/work-requests", { ...s, title: "Wrong person", request_type_id: "lead_qualification", assign_to_staff_code: bookkeeper.staff_code }, h);
  assert.equal(refused.work_request.status, "SUBMITTED");
  assert.ok(refused.assignment_error);

  // ---- Class A request ----
  const onboarding = await post("/work-requests", { ...s, title: "Onboard new site clerk", request_type_id: "employee_onboarding", assign_to_staff_code: hrAdmin.staff_code }, h);
  assert.equal(onboarding.assignment_error, null, JSON.stringify(onboarding));
  const oDraft = await post("/awia/virtual-staff/output-draft", { ...s, workdesk_item_id: onboarding.workdesk_item.id, output_payload: { note: "smoke-supplied payload" } }, h);
  assert.equal(oDraft.output_draft.class_a_approval_required, true);
  assert.equal(oDraft.output_draft.class_a_approval_status, "PENDING");
  await postExpectFailure("/awia/virtual-staff/output-review", { ...s, output_draft_id: oDraft.output_draft.id, review_decision: "APPROVED_FOR_CLIENT_DRAFT" }, h);

  // ---- cancel ----
  const cancelled = await post("/work-requests/cancel", { ...s, work_request_id: refused.work_request.id, reason: "raised by mistake" }, h);
  assert.equal(cancelled.status, "CANCELLED");
  await postExpectFailure("/work-requests/cancel", { ...s, work_request_id: refused.work_request.id }, h);
  await postExpectFailure("/work-requests/assign", { ...s, work_request_id: refused.work_request.id, staff_code: sales.staff_code }, h);

  // ---- gate still demands client+project for non-INTERNAL work ----
  const rawTask = (await get("/mvp/store", h)).tasks.find((t) => t.id === clientReq.work_request.task_id);
  const scopeRefusal = await request("/awia/virtual-staff/assign-task", { method: "POST", headers: h, body: { ...s, staff_code: sales.staff_code, task_id: rawTask.id, tool: "sales.lead.qualify.prepare", risk_class: "CONTROLLED", evidence_refs: ["x"] } });
  assert.notEqual(scopeRefusal.json.ok, true, "CONTROLLED work without a client must still be refused");

  // ---- audit + export ----
  const auditText = JSON.stringify(await get(`/audit-events?tenant_id=${firm.tenant_id}&firm_id=${firm.id}`, h));
  for (const event of ["work_request.submitted", "work_request.assigned", "work_request.files_added", "work_request.cancelled", "awia.virtual_staff.internal_work_completed"]) assert.ok(auditText.includes(event), `missing audit event ${event}`);
  const exported = await get(`/data-protection/export-package?tenant_id=${firm.tenant_id}&firm_id=${firm.id}`, h);
  assert.equal(exported.counts.work_requests, 5);

  console.log(JSON.stringify({
    smoke: "w2-work-requests",
    result: "passed",
    internal_request: { id: wr.id, number: wr.request_number, final: "ARCHIVED_COMPLETED", skill: item.skill_id },
    client_request_assign_now: { status: clientReq.work_request.status, delivery: "CLIENT_DELIVERY_DRAFT_PREPARED" },
    class_a_request: { class_a_approval_status: oDraft.output_draft.class_a_approval_status },
    guards_confirmed: ["wrong_position_refused", "cross_firm_assign_cancel_refused", "cross_firm_file_refused", "unknown_type_refused", "double_assign_refused", "internal_client_delivery_refused", "complete_internal_refused_for_client_work", "assign_now_refusal_keeps_request_in_inbox", "cancel_only_from_inbox", "controlled_without_client_still_refused"]
  }, null, 2));
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  for (const child of children) if (child.exitCode === null && !child.killed) child.kill();
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await rm(tmp, { recursive: true, force: true });
}
