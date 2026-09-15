import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

// Proves the two backend additions the Admin Console / Owner Workspace sprint
// plan's Phase 1 requires for a Workdesk "Archived" tab (see
// docs/10_post_freeze_technical_design/
// VFIRM_ADMIN_CONSOLE_AND_OWNER_WORKSPACE_SPRINT_PLAN_AND_CHECKLIST_v1.0.md,
// section 4.1):
//
//  a) POST /awia/virtual-staff/client-delivery-draft/mark-sent -- an
//     owner-recordkeeping-only action (never a real client transmission,
//     never final-issue authority) that moves a prepared client delivery
//     draft to OWNER_MARKED_SENT and its workdesk item to ARCHIVED_SENT.
//
//  b) POST /awia/virtual-staff/workdesk-item/archive -- lets the owner
//     dismiss a dead-end item (REVISION_REQUIRED with no re-draft path yet,
//     per ADR-078's known gap, or an outright REJECTED output) into
//     ARCHIVED_DISMISSED instead of it sitting forever as if actionable.
//
// Also proves both endpoints refuse to act on items that are not actually in
// an archivable state (no silent success on a bad transition).

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-awia-archive-"));
const apiPort = 3143;
const apiBase = `http://127.0.0.1:${apiPort}`;
const storePath = join(tmp, "store.json");
const children = [];
let logs = "";

function start(name, args, env) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"]
  });
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
      if (response.ok && json.ok !== false) return { response, json };
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}. Logs:\n${logs}`);
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await response.json().catch(() => ({ ok: false, error: { message: "Non-JSON response" } }));
  return { response, json };
}

async function get(path, headers = {}) {
  const { response, json } = await request(path, { headers });
  assert.equal(response.ok, true, `${path} HTTP ${response.status}: ${JSON.stringify(json)}`);
  assert.equal(json.ok, true, `${path} failed: ${JSON.stringify(json)}`);
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
  return json;
}

function authHeaders(actorId, firm) {
  return {
    "x-vfirm-actor-id": actorId,
    "x-vfirm-tenant-id": firm.tenant_id,
    "x-vfirm-firm-id": firm.id,
    "x-vfirm-role": "principal"
  };
}

async function openRealTask(firm, h, label) {
  const enquiry = await post("/front-desk/enquiries", { tenant_id: firm.tenant_id, firm_id: firm.id, contact_name: `${label} Contact`, organization_name: `${label} Sdn Bhd`, contact_email: `${label.toLowerCase().replace(/\s+/g, "-")}@archive-smoke.example`, enquiry_summary: `Need support: ${label}`, requested_service_hint: "Finance Analysis" }, h);
  await post("/front-desk/enquiries/qualify", { tenant_id: firm.tenant_id, firm_id: firm.id, enquiry_id: enquiry.id, decision: "QUALIFIED", consent_or_legal_basis_ref: `${label}-CONSENT`, conflict_check_status: "CLEARED", conflict_check_ref: `${label}-CONFLICT-CLEARED` }, h);
  const handoff = await post("/front-desk/enquiries/handoff", { tenant_id: firm.tenant_id, firm_id: firm.id, enquiry_id: enquiry.id, provided_inputs: {} }, h);
  const intake = await post("/intake-sessions", { tenant_id: firm.tenant_id, firm_id: firm.id, relationship_id: handoff.relationship.id, provided_inputs: { engagement_summary: label } }, h);
  const proposal = await post("/proposals", { tenant_id: firm.tenant_id, firm_id: firm.id, relationship_id: handoff.relationship.id, intake_session_id: intake.intake.id, scope_summary: label, final_price: 1200 }, h);
  const approvedProposal = await post("/proposals/approve", { tenant_id: firm.tenant_id, firm_id: firm.id, proposal_id: proposal.proposal.id }, h);
  const projectOpen = await post("/proposals/accept", { tenant_id: firm.tenant_id, firm_id: firm.id, proposal_id: approvedProposal.proposal.id, project_name: label }, h);
  const relationships = await get(`/firm-client-relationships?tenant_id=${firm.tenant_id}&firm_id=${firm.id}`, h);
  const relationship = relationships.find((item) => item.id === projectOpen.project.relationship_id);
  assert(relationship, "Relationship for the opened project must be readable back.");
  return { task: projectOpen.task, project: projectOpen.project, clientId: relationship.client_id };
}

try {
  start("api", ["apps/api/src/server.mjs"], { VFIRM_API_PORT: String(apiPort), VFIRM_STORE_PATH: storePath, DATABASE_URL: "", VFIRM_STORE_BACKEND: "json" });
  await waitForJson(`${apiBase}/health`);

  const tenant = await post("/tenants", { name: "AWIA Archive Smoke Tenant" });
  const seed = await post("/firms", { tenant_id: tenant.id, name: "AWIA Archive Smoke Sdn Bhd", principal_name: "AWIA Archive Smoke Owner" });
  const firm = seed.firm;
  const h = authHeaders(seed.principal_actor.id, firm);

  await post("/ops/awia-package-assignment", { tenant_id: firm.tenant_id, firm_id: firm.id, package_code: "HIRE_ME" }, h);
  const hired = await post("/awia/virtual-staff/hire-worker", { tenant_id: firm.tenant_id, firm_id: firm.id, role_code: "CFO" }, h);
  const staffCode = hired.staff_code;
  await post("/awia/virtual-staff/lifecycle", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: staffCode, to_state: "ACTIVE" }, h);

  // --- Path A: full happy path to Outbox, then owner marks it sent (Outbox -> Archived). ---
  const a = await openRealTask(firm, h, "Archive Path A");
  const assignA = await post("/awia/virtual-staff/assign-task", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: staffCode, task_id: a.task.id, action: "finance.analysis.prepare", tool: "finance.analysis.prepare", client_id: a.clientId, project_id: a.project.id, evidence_refs: ["archive-smoke-evidence-a"] }, h);
  const draftA = await post("/awia/virtual-staff/output-draft", { tenant_id: firm.tenant_id, firm_id: firm.id, workdesk_item_id: assignA.workdesk_item.id }, h);
  await post("/awia/virtual-staff/output-review", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: draftA.output_draft.id, review_decision: "APPROVED_FOR_CLIENT_DRAFT" }, h);
  const clientDraftA = await post("/awia/virtual-staff/client-delivery-draft", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: draftA.output_draft.id, client_id: a.clientId }, h);
  assert.equal(clientDraftA.client_delivery_draft.status, "CLIENT_DELIVERY_DRAFT_PREPARED");

  const sentA = await post("/awia/virtual-staff/client-delivery-draft/mark-sent", { tenant_id: firm.tenant_id, firm_id: firm.id, client_delivery_draft_id: clientDraftA.client_delivery_draft.id }, h);
  assert.equal(sentA.client_delivery_draft.status, "OWNER_MARKED_SENT");
  assert.equal(sentA.client_delivery_draft.marked_sent_by_actor_id, seed.principal_actor.id);
  assert(sentA.client_delivery_draft.marked_sent_at, "marked_sent_at must be stamped.");
  assert.equal(sentA.workdesk_item.workdesk_status, "ARCHIVED_SENT");
  assert(sentA.workdesk_item.archived_at, "archived_at must be stamped on the workdesk item too.");

  // Readback via the generic list route the Workdesk screen will fetch.
  const deliveryDraftsAfter = await get(`/awia-client-delivery-drafts?tenant_id=${firm.tenant_id}&firm_id=${firm.id}`, h);
  const readBackA = deliveryDraftsAfter.find((item) => item.id === clientDraftA.client_delivery_draft.id);
  assert(readBackA, "Marked-sent delivery draft must be readable back.");
  assert.equal(readBackA.status, "OWNER_MARKED_SENT");

  // Guard: cannot mark the same delivery draft sent twice.
  await postExpectFailure("/awia/virtual-staff/client-delivery-draft/mark-sent", { tenant_id: firm.tenant_id, firm_id: firm.id, client_delivery_draft_id: clientDraftA.client_delivery_draft.id }, h);

  // --- Path B: revision-required dead end, owner archives it (Approval/Pending -> Archived). ---
  const b = await openRealTask(firm, h, "Archive Path B");
  const assignB = await post("/awia/virtual-staff/assign-task", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: staffCode, task_id: b.task.id, action: "finance.analysis.prepare", tool: "finance.analysis.prepare", client_id: b.clientId, project_id: b.project.id, evidence_refs: ["archive-smoke-evidence-b"] }, h);
  const draftB = await post("/awia/virtual-staff/output-draft", { tenant_id: firm.tenant_id, firm_id: firm.id, workdesk_item_id: assignB.workdesk_item.id }, h);
  const revisedB = await post("/awia/virtual-staff/output-review", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: draftB.output_draft.id, review_decision: "REVISION_REQUIRED", review_notes: "Needs another pass." }, h);
  assert.equal(revisedB.workdesk_item.workdesk_status, "REVIEW_ACTION_REQUIRED");

  const archivedB = await post("/awia/virtual-staff/workdesk-item/archive", { tenant_id: firm.tenant_id, firm_id: firm.id, workdesk_item_id: assignB.workdesk_item.id }, h);
  assert.equal(archivedB.workdesk_item.workdesk_status, "ARCHIVED_DISMISSED");
  assert.equal(archivedB.workdesk_item.archived_reason, "review_action_dismissed_by_owner");
  assert.equal(archivedB.workdesk_item.archived_by_actor_id, seed.principal_actor.id);

  // --- Path C: rejected output, owner archives it. ---
  const c = await openRealTask(firm, h, "Archive Path C");
  const assignC = await post("/awia/virtual-staff/assign-task", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: staffCode, task_id: c.task.id, action: "finance.analysis.prepare", tool: "finance.analysis.prepare", client_id: c.clientId, project_id: c.project.id, evidence_refs: ["archive-smoke-evidence-c"] }, h);
  const draftC = await post("/awia/virtual-staff/output-draft", { tenant_id: firm.tenant_id, firm_id: firm.id, workdesk_item_id: assignC.workdesk_item.id }, h);
  await post("/awia/virtual-staff/output-review", { tenant_id: firm.tenant_id, firm_id: firm.id, output_draft_id: draftC.output_draft.id, review_decision: "REJECTED", review_notes: "Not usable." }, h);

  const archivedC = await post("/awia/virtual-staff/workdesk-item/archive", { tenant_id: firm.tenant_id, firm_id: firm.id, workdesk_item_id: assignC.workdesk_item.id }, h);
  assert.equal(archivedC.workdesk_item.workdesk_status, "ARCHIVED_DISMISSED");
  assert.equal(archivedC.workdesk_item.archived_reason, "output_rejected");

  // Guard: cannot archive an item still genuinely in progress (ASSIGNED, not a dead end).
  const d = await openRealTask(firm, h, "Archive Path D Guard");
  const assignD = await post("/awia/virtual-staff/assign-task", { tenant_id: firm.tenant_id, firm_id: firm.id, staff_code: staffCode, task_id: d.task.id, action: "finance.analysis.prepare", tool: "finance.analysis.prepare", client_id: d.clientId, project_id: d.project.id, evidence_refs: ["archive-smoke-evidence-d"] }, h);
  await postExpectFailure("/awia/virtual-staff/workdesk-item/archive", { tenant_id: firm.tenant_id, firm_id: firm.id, workdesk_item_id: assignD.workdesk_item.id }, h);

  console.log(JSON.stringify({
    smoke: "awia-workdesk-archive",
    result: "passed",
    firm: firm.name,
    staff_code: staffCode,
    mark_sent: { client_delivery_draft_id: clientDraftA.client_delivery_draft.id, status: "OWNER_MARKED_SENT" },
    archived_revision_dismissed: { workdesk_item_id: assignB.workdesk_item.id, reason: "review_action_dismissed_by_owner" },
    archived_rejected: { workdesk_item_id: assignC.workdesk_item.id, reason: "output_rejected" },
    guards_confirmed: ["mark_sent_not_repeatable", "archive_refused_for_in_progress_item"],
    boundary: "owner_recordkeeping_only_never_a_client_transmission_or_final_issue"
  }, null, 2));
} finally {
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill();
  }
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await rm(tmp, { recursive: true, force: true });
}
