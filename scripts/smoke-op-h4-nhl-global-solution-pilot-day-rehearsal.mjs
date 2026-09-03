import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-op-h4-"));
const apiPort = 3127;
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

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
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

function authHeaders(store, firm) {
  const actor = (store.actors ?? []).find((item) => item.firm_id === firm.id && item.actor_type === "HUMAN");
  assert(actor, `No human principal actor found for ${firm.name}`);
  return {
    "x-vfirm-actor-id": actor.id,
    "x-vfirm-tenant-id": firm.tenant_id,
    "x-vfirm-firm-id": firm.id,
    "x-vfirm-role": "principal"
  };
}

async function seedPilotWorkspaces() {
  const seed = spawn(process.execPath, ["scripts/seed-multi-tenant-pilot-workspaces-local.mjs"], {
    cwd: root,
    env: { ...process.env, VFIRM_API_BASE: apiBase },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let seedOut = "";
  let seedErr = "";
  seed.stdout.on("data", (chunk) => { seedOut += chunk.toString(); });
  seed.stderr.on("data", (chunk) => { seedErr += chunk.toString(); });
  const [code] = await once(seed, "exit");
  assert.equal(code, 0, `OP-H4 seed failed.\nstdout:\n${seedOut}\nstderr:\n${seedErr}`);
  return JSON.parse(seedOut);
}

function eventTypes(events) {
  return new Set((events ?? []).map((event) => event.event_type));
}

function findWorker(store, firm, namePart) {
  const worker = (store.worker_instances ?? []).find((item) => item.tenant_id === firm.tenant_id && item.firm_id === firm.id && item.name.includes(namePart) && item.runtime_status === "ACTIVE");
  assert(worker, `Missing active NHL worker matching ${namePart}`);
  return worker;
}

try {
  assert(await exists("docs/10_post_freeze_technical_design/OP_H4_NHL_GLOBAL_SOLUTION_PILOT_DAY_REHEARSAL_COMPLETION_v1.0.md"), "OP-H4 completion document missing.");
  const completion = await readFile("docs/10_post_freeze_technical_design/OP_H4_NHL_GLOBAL_SOLUTION_PILOT_DAY_REHEARSAL_COMPLETION_v1.0.md", "utf8");
  const checklist = await readFile("docs/10_post_freeze_technical_design/OP_H1_TO_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_CHECKLIST_v1.0.md", "utf8");
  const readme = await readFile("docs/10_post_freeze_technical_design/README.md", "utf8");
  const decisions = await readFile("docs/00_project_control/DECISION_REGISTER.md", "utf8");
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));

  for (const item of [
    "- [x] Create NHL pilot-day fixture.",
    "- [x] Rehearse project reporting workflow.",
    "- [x] Rehearse technical writing workflow.",
    "- [x] Rehearse clerical work workflow.",
    "- [x] Rehearse BizKick EDCS workflow.",
    "- [x] Rehearse proposal/task/document/correspondence flow.",
    "- [x] Require human review before client-facing AI output is issued.",
    "- [x] Monitor invoice/receivable without live payment movement.",
    "- [x] Verify audit reconstruction for NHL pilot day.",
    "- [x] Add NHL pilot-day smoke test.",
    "- [x] Update evidence and decision register."
  ]) {
    assert(checklist.includes(item), `OP-H4 checklist item not checked: ${item}`);
  }
  for (const marker of ["NHL pilot-day fixture", "project reporting", "technical writing", "clerical work", "BizKick EDCS", "human review before client-facing AI output", "invoice/receivable monitoring without live payment movement", "audit reconstruction", "OP-H5 - Pilot Evidence, Audit, Export, and Closeout Review"]) {
    assert(completion.includes(marker), `OP-H4 completion missing marker: ${marker}`);
  }
  assert(readme.includes("OP_H4_NHL_GLOBAL_SOLUTION_PILOT_DAY_REHEARSAL_COMPLETION_v1.0.md"), "README missing OP-H4 completion doc.");
  assert(decisions.includes("ADR-058 - OP-H4 NHL Global Solution pilot day rehearsal completed"), "ADR-058 missing from decision register.");
  assert(packageJson.scripts["check:op:h4"] === "node scripts/smoke-op-h4-nhl-global-solution-pilot-day-rehearsal.mjs", "check:op:h4 package script missing.");
  assert(packageJson.scripts.check.includes("smoke-op-h4-nhl-global-solution-pilot-day-rehearsal.mjs"), "Full check chain must include OP-H4 smoke.");

  start("api", ["apps/api/src/server.mjs"], { VFIRM_API_PORT: String(apiPort), VFIRM_STORE_PATH: storePath, DATABASE_URL: "", VFIRM_STORE_BACKEND: "json" });
  await waitForJson(`${apiBase}/health`);
  await seedPilotWorkspaces();

  const initialStore = await get("/mvp/store");
  const formwork = (initialStore.firms ?? []).find((firm) => firm.name === "Amanah Formwork Pilot Firm");
  const nhl = (initialStore.firms ?? []).find((firm) => firm.name === "NHL Global Solution");
  assert(formwork, "Amanah Formwork Pilot Firm missing from seeded pilot workspaces.");
  assert(nhl, "NHL Global Solution missing from seeded pilot workspaces.");
  assert.notEqual(formwork.tenant_id, nhl.tenant_id, "Formwork and NHL must remain separate tenants.");
  const h = authHeaders(initialStore, nhl);

  const summary = await get(`/workspace/active-summary?tenant_id=${nhl.tenant_id}&firm_id=${nhl.id}`, h);
  assert.equal(summary.workspace.firm_type, "ORGANIZATION_SUPPORT");
  assert.equal(summary.firm.name, "NHL Global Solution");
  assert.equal(summary.workspace.subscription.package_code, "VF-ORG-SUPPORT-PILOT");
  for (const code of ["project_reporting", "technical_writing", "clerical_work", "bizkick_edcs"]) {
    assert(summary.workspace.service_lines.some((line) => line.service_code === code), `NHL service line missing: ${code}`);
  }
  assert(!summary.workspace.modules.some((module) => module.module_code === "technical_delivery"), "NHL workspace must not subscribe to Formwork Technical Delivery.");
  assert(summary.workspace.service_lines.every((line) => line.regulated_work === false), "NHL organization-support services should not be classified as regulated work in this pilot.");

  const reportingWorker = findWorker(initialStore, nhl, "Project Reporting");
  const writingWorker = findWorker(initialStore, nhl, "Technical Writing");
  const clericalWorker = findWorker(initialStore, nhl, "Admin and Clerical");
  const accountsWorker = findWorker(initialStore, nhl, "Accounts and Receivables");

  const stamp = Date.now();
  const enquiry = await post("/front-desk/enquiries", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    contact_name: "OP-H4 BizKick Owner",
    organization_name: "OP-H4 BizKick Client",
    contact_email: "oph4-bizkick@example.com",
    enquiry_summary: "Need NHL Global Solution virtual support for project reporting, technical writing, clerical work, and BizKick EDCS documentation/control setup.",
    requested_service_hint: "project_reporting_technical_writing_clerical_bizkick_edcs"
  }, h);
  assert.equal(enquiry.status, "NEW");

  const qualified = await post("/front-desk/enquiries/qualify", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    enquiry_id: enquiry.id,
    decision: "QUALIFIED",
    consent_or_legal_basis_ref: "OP-H4-CONSENT",
    conflict_check_status: "CLEARED",
    conflict_check_ref: "OP-H4-CONFLICT-CLEARED"
  }, h);
  assert.equal(qualified.status, "QUALIFIED");

  const acknowledgement = await post("/front-desk/communication-drafts", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    enquiry_id: enquiry.id,
    subject: "OP-H4 NHL enquiry acknowledgement draft",
    message_body: "Draft only. Nur Hernieliana will review the requested organization-support scope before any client-facing commitment is made."
  }, h);
  assert.equal(acknowledgement.status, "DRAFT_REVIEW_REQUIRED");

  const handoff = await post("/front-desk/enquiries/handoff", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    enquiry_id: enquiry.id,
    provided_inputs: {
      service_lines: ["project_reporting", "technical_writing", "clerical_work", "bizkick_edcs"],
      human_owner: "Nur Hernieliana"
    }
  }, h);

  const intake = await post("/intake-sessions", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    relationship_id: handoff.relationship.id,
    provided_inputs: {
      project_name: "OP-H4 BizKick EDCS and Reporting Pilot Day",
      client_organization: "OP-H4 BizKick Client",
      client_contact_name: "OP-H4 BizKick Owner",
      client_contact_email: "oph4-bizkick@example.com",
      requested_services: ["project reporting", "technical writing", "clerical work", "BizKick EDCS"],
      deliverables: ["weekly project report", "technical writing draft", "clerical task tracker", "EDCS control index"],
      deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
      authority_note: "AI workers prepare drafts and records only; Nur Hernieliana reviews client-facing outputs and commercial commitments.",
      site_location: "Remote organization-support service",
      structure_type: "not_applicable_organization_support",
      formwork_element_type: "not_applicable_organization_support",
      height: 1,
      length_or_area: 1,
      concrete_grade: "not_applicable_organization_support",
      available_drawings: ["not_applicable_organization_support"],
      required_deliverables: ["project_report", "technical_writing_draft", "clerical_task_tracker", "bizkick_edcs_control_index"]
    }
  }, h);
  assert.equal(intake.intake.intake_status, "COMPLETE");

  const proposal = await post("/proposals", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    relationship_id: handoff.relationship.id,
    intake_session_id: intake.intake.id,
    scope_summary: "OP-H4 NHL pilot-day virtual service package: project reporting, technical writing, clerical work, and BizKick EDCS setup.",
    final_price: 3500
  }, h);
  assert.equal(proposal.proposal.proposal_status, "APPROVAL_REQUIRED");

  const dispatchDenied = await request("/proposals/dispatch", {
    method: "POST",
    headers: h,
    body: { tenant_id: nhl.tenant_id, firm_id: nhl.id, proposal_id: proposal.proposal.id, recipient: "oph4-bizkick@example.com", document_ref: "doc://op-h4/nhl-proposal-draft.pdf" }
  });
  assert(dispatchDenied.response.status >= 400, "Draft proposal dispatch should be denied until human approval.");

  const approvedProposal = await post("/proposals/approve", { tenant_id: nhl.tenant_id, firm_id: nhl.id, proposal_id: proposal.proposal.id }, h);
  const dispatched = await post("/proposals/dispatch", { tenant_id: nhl.tenant_id, firm_id: nhl.id, proposal_id: approvedProposal.proposal.id, recipient: "oph4-bizkick@example.com", document_ref: "doc://op-h4/nhl-approved-proposal.pdf" }, h);
  assert.equal(dispatched.proposal.proposal_status, "SENT");
  const accepted = await post("/proposals/accept", { tenant_id: nhl.tenant_id, firm_id: nhl.id, proposal_id: approvedProposal.proposal.id, project_name: "OP-H4 BizKick EDCS and Reporting Pilot Day" }, h);
  assert.equal(accepted.project.project_state, "OPEN");

  const correspondence = await post("/administration/correspondence", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    relationship_id: handoff.relationship.id,
    project_id: accepted.project.id,
    subject: "OP-H4 source material received for report and EDCS setup",
    correspondent: "OP-H4 BizKick Client",
    direction: "INCOMING",
    channel: "EMAIL"
  }, h);
  assert.equal(correspondence.status, "RECEIVED");

  const document = await post("/administration/documents", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    relationship_id: handoff.relationship.id,
    project_id: accepted.project.id,
    document_number: `OP-H4-NHL-EDCS-${stamp}`,
    title: "OP-H4 BizKick EDCS Master Control Index",
    document_type: "CONTROLLED_REGISTER",
    discipline: "BUSINESS_DOCUMENTATION",
    classification: "CONFIDENTIAL",
    revision: "P01",
    storage_ref: "doc://op-h4/nhl-edcs-index-p01",
    content_hash: `op-h4-edcs-index-p01-${stamp}`
  }, h);
  assert.equal(document.document.document_type, "CONTROLLED_REGISTER");

  const deadline = await post("/administration/deadlines", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    project_id: accepted.project.id,
    title: "OP-H4 first project reporting and technical writing draft due",
    due_at: new Date(Date.now() + 5 * 86400000).toISOString(),
    priority: "HIGH"
  }, h);
  assert.equal(deadline.status, "OPEN");

  const assignedReporting = await post("/runtime/tasks/assign-ai", { tenant_id: nhl.tenant_id, firm_id: nhl.id, task_id: accepted.task.id, worker_instance_id: reportingWorker.id }, h);
  assert.equal(assignedReporting.task.assigned_actor_or_worker_ref, reportingWorker.id);
  const reportTool = await post("/runtime/tool-invocations", { tenant_id: nhl.tenant_id, firm_id: nhl.id, worker_instance_id: reportingWorker.id, task_id: accepted.task.id, tool_name: "project.status.summarize", input_summary: "Prepare project reporting summary for human review." }, h);
  assert.equal(reportTool.invocation_status, "REQUESTED");
  const writingTool = await post("/runtime/tool-invocations", { tenant_id: nhl.tenant_id, firm_id: nhl.id, worker_instance_id: writingWorker.id, task_id: accepted.task.id, tool_name: "document.read", input_summary: "Read source material for technical writing and EDCS register draft for human review." }, h);
  assert.equal(writingTool.invocation_status, "REQUESTED");
  const clericalTool = await post("/runtime/tool-invocations", { tenant_id: nhl.tenant_id, firm_id: nhl.id, worker_instance_id: clericalWorker.id, task_id: accepted.task.id, tool_name: "document.register.update", input_summary: "Update clerical document-control register draft." }, h);
  assert.equal(clericalTool.invocation_status, "REQUESTED");

  const output = await post("/runtime/tasks/output", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    task_id: accepted.task.id,
    worker_instance_id: reportingWorker.id,
    output_ref: "ai://outputs/op-h4-nhl-project-report-technical-writing-edcs-draft",
    evidence_refs: [document.revision.id, correspondence.id, deadline.id, reportTool.id, writingTool.id, clericalTool.id],
    quality_flags: ["requires_human_review", "draft_only", "organization_support"],
    requires_human_review: true
  }, h);
  assert.equal(output.task_output.requires_human_review, true);
  assert.equal(output.task.state, "OUTPUT_PRODUCED");

  const aiActor = { actor_id: reportingWorker.actor_id, actor_type: "AI_AGENT", tenant_id: nhl.tenant_id, firm_id: nhl.id, worker_instance_id: reportingWorker.id, role: "project-reporting-assistant" };
  const aiReviewDenied = await request("/deliverables/review", {
    method: "POST",
    headers: h,
    body: { tenant_id: nhl.tenant_id, firm_id: nhl.id, project_id: accepted.project.id, document_version_id: "not-yet-created", evidence_bundle_id: "not-yet-created", actor: aiActor }
  });
  assert(aiReviewDenied.response.status >= 400, "AI worker must not approve client-facing output.");

  const deliverableDraft = await post("/deliverables/draft", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    project_id: accepted.project.id,
    relationship_id: handoff.relationship.id,
    title: "OP-H4 NHL project reporting and BizKick EDCS delivery pack",
    document_type: "ORGANIZATION_SUPPORT_DELIVERY_REPORT",
    hash: `op-h4-nhl-deliverable-hash-${stamp}`
  }, h);
  const coreDeliveryValidators = ["formwork_intake_completeness", "document_revision_consistency", "unit_consistency", "geometry_positive_value_check", "risk_classification_completeness", "approval_presence_before_issue", "manufacturer_source_provenance_presence", "calculation_input_schema_validity"];
  const evidence = await post("/evidence-bundles", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    project_id: accepted.project.id,
    subject_type: "Project",
    subject_id: accepted.project.id,
    input_refs: [
      "nhl_project_reporting_source_pack",
      "nhl_technical_writing_draft",
      "nhl_clerical_task_tracker",
      "nhl_bizkick_edcs_control_index",
      "nhl_human_review_notes_required",
      ...coreDeliveryValidators
    ],
    source_document_refs: [document.document.id, document.revision.id, correspondence.id],
    qa_check_refs: [output.task_output.id],
    review_notes_ref: "op-h4-human-review-notes-pending"
  }, h);

  const issueBeforeApproval = await request("/deliverables/issue", {
    method: "POST",
    headers: h,
    body: { tenant_id: nhl.tenant_id, firm_id: nhl.id, project_id: accepted.project.id, document_version_id: deliverableDraft.document_version.id, evidence_bundle_id: evidence.id, approval_id: "missing-approval", subject_version_or_hash: deliverableDraft.document_version.hash }
  });
  assert(issueBeforeApproval.response.status >= 400, "Client-facing output must not be issued before human review approval.");

  const humanReview = await post("/deliverables/review", { tenant_id: nhl.tenant_id, firm_id: nhl.id, project_id: accepted.project.id, document_version_id: deliverableDraft.document_version.id, evidence_bundle_id: evidence.id }, h);
  assert.equal(humanReview.approval.decision, "APPROVED");
  assert(humanReview.approval.authority_id, "Human review must reference principal authority.");
  const issuedDeliverable = await post("/deliverables/issue", { tenant_id: nhl.tenant_id, firm_id: nhl.id, project_id: accepted.project.id, document_version_id: deliverableDraft.document_version.id, evidence_bundle_id: evidence.id, approval_id: humanReview.approval.id, subject_version_or_hash: deliverableDraft.document_version.hash }, h);
  assert.equal(issuedDeliverable.document_version.status, "ISSUED");

  const invoice = await post("/invoices", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    relationship_id: handoff.relationship.id,
    engagement_id: accepted.engagement.id,
    project_id: accepted.project.id,
    line_items: [{ description: "OP-H4 NHL organization-support pilot-day package", amount: 3500 }],
    currency: "MYR"
  }, h);
  assert.equal(invoice.status, "DRAFT");
  const issuedInvoice = await post("/invoices/issue", { tenant_id: nhl.tenant_id, firm_id: nhl.id, invoice_id: invoice.id }, h);
  assert.equal(issuedInvoice.status, "ISSUED");

  const deniedPaymentTool = await request("/runtime/tool-invocations", {
    method: "POST",
    headers: h,
    body: { tenant_id: nhl.tenant_id, firm_id: nhl.id, worker_instance_id: accountsWorker.id, task_id: accepted.task.id, tool_name: "payments.release", input_summary: "Attempt to release payment should be blocked." }
  });
  assert(deniedPaymentTool.response.status >= 400, "AI worker must not invoke payment release.");

  const receivableDraft = await post("/accounts/receivable-follow-ups", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    invoice_id: invoice.id,
    subject: "OP-H4 receivable follow-up draft",
    message_body: "Draft only. Human review is required before sending. No live payment movement is authorized."
  }, h);
  assert.equal(receivableDraft.status, "DRAFT_REVIEW_REQUIRED");
  assert.equal(receivableDraft.sent_at, null);

  const today = await get(`/operations/today?tenant_id=${nhl.tenant_id}&firm_id=${nhl.id}`, h);
  assert(today.counts.pending_approvals >= 1, "NHL Today view must show pending human review/draft approvals.");
  assert(today.cash.outstanding >= 3500, "NHL Today view must show deterministic receivables/cash position.");
  assert(!summary.workspace.modules.some((module) => module.module_code === "technical_delivery"), "NHL workspace contract must keep Formwork Technical Delivery unsubscribed.");
  assert(Array.isArray(today.recent_activity) && today.recent_activity.length > 0, "NHL Today view must include recent auditable activity.");

  const events = await get(`/event-log?tenant_id=${nhl.tenant_id}&firm_id=${nhl.id}`, h);
  const types = eventTypes(events);
  for (const eventType of ["front_desk.enquiry_captured", "front_desk.communication_drafted", "approval.granted", "proposal.dispatched", "proposal.accepted", "administration.correspondence_registered", "administration.document_registered", "task.assigned_to_worker", "tool.invocation_requested", "task.output_produced", "evidence_bundle.created", "deliverable.review_approved", "deliverable.issued", "invoice.issued", "accounts.receivable_follow_up_drafted"]) {
    assert(types.has(eventType), `Missing NHL pilot-day event: ${eventType}`);
  }
  const audit = await get(`/audit-events?tenant_id=${nhl.tenant_id}&firm_id=${nhl.id}`, h);
  assert(audit.length >= events.length, "Audit records should reconstruct material NHL pilot-day actions.");
  const exported = await get(`/data-protection/export-package?tenant_id=${nhl.tenant_id}&firm_id=${nhl.id}`, h);
  for (const key of ["clients", "projects", "correspondence_records", "document_register_entries", "document_revision_records", "administrative_deadlines", "proposals", "approvals", "documents", "document_versions", "evidence_bundles", "invoices", "receivable_follow_ups", "worker_instances", "task_outputs", "tool_invocations", "event_log", "audit_events"]) {
    assert(exported.counts[key] >= 1, `NHL export missing ${key}.`);
  }
  assert.equal(exported.tenant_id, nhl.tenant_id, "NHL export tenant scope mismatch.");
  assert.equal(exported.firm_id, nhl.id, "NHL export firm scope mismatch.");

  const formworkHeaders = authHeaders(initialStore, formwork);
  const crossTenantToday = await request(`/operations/today?tenant_id=${nhl.tenant_id}&firm_id=${nhl.id}`, { headers: formworkHeaders });
  assert(crossTenantToday.response.status >= 400, "Formwork principal must not read NHL Today view.");
  const crossTenantExport = await request(`/data-protection/export-package?tenant_id=${nhl.tenant_id}&firm_id=${nhl.id}`, { headers: formworkHeaders });
  assert(crossTenantExport.response.status >= 400, "Formwork principal must not export NHL records.");

  console.log(JSON.stringify({
    smoke: "op-h4-nhl-global-solution-pilot-day-rehearsal",
    result: "passed",
    firm: nhl.name,
    tenant: summary.tenant.name,
    owner: summary.workspace.principal_display_name,
    fixture: "NHL pilot-day fixture",
    scenario: ["client_enquiry_intake", "project_reporting", "technical_writing", "clerical_work", "bizkick_edcs", "proposal_task_document_correspondence", "human_review_before_client_facing_issue", "invoice_receivable_monitoring", "audit_reconstruction", "firm_scoped_export"],
    denials: ["draft_proposal_dispatch_denied", "ai_client_facing_review_denied", "issue_before_human_review_denied", "ai_payment_release_denied", "cross_tenant_today_denied", "cross_tenant_export_denied"],
    evidence: { events: events.length, audit_events: audit.length, export_counts: exported.counts },
    known_limitations: ["core delivery review still requires inherited reference-vertical evidence validator keys until service-specific evidence validators are split in a later sprint"],
    next_active_sprint: "OP-H5 - Pilot Evidence, Audit, Export, and Closeout Review"
  }, null, 2));
} finally {
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill();
  }
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await rm(tmp, { recursive: true, force: true });
}
