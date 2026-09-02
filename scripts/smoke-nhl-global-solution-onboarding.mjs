import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-nhl-onboarding-"));
const port = 3136;
const base = `http://127.0.0.1:${port}`;
const env = {
  ...process.env,
  VFIRM_API_PORT: String(port),
  VFIRM_STORE_BACKEND: "json",
  VFIRM_STORE_PATH: join(tmp, "store.json"),
  DATABASE_URL: ""
};

const api = spawn(process.execPath, ["apps/api/src/server.mjs"], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
let logs = "";
api.stdout.on("data", (chunk) => { logs += chunk.toString(); });
api.stderr.on("data", (chunk) => { logs += chunk.toString(); });

async function waitForHealth() {
  const started = Date.now();
  while (Date.now() - started < 10000) {
    try {
      const response = await fetch(`${base}/health`);
      const json = await response.json();
      if (response.ok && json.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`API did not become healthy. Logs:\n${logs}`);
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await response.json();
  return { response, json };
}

async function post(path, body, headers = {}) {
  const { response, json } = await request(path, { method: "POST", body, headers });
  if (!response.ok || !json.ok) throw new Error(`${path} failed: ${response.status} ${JSON.stringify(json)}`);
  return json.data;
}

function authHeaders(firmResult) {
  return {
    "x-vfirm-actor-id": firmResult.principal_actor.id,
    "x-vfirm-tenant-id": firmResult.firm.tenant_id,
    "x-vfirm-firm-id": firmResult.firm.id,
    "x-vfirm-role": "principal"
  };
}

try {
  await waitForHealth();
  await post("/mvp/reset", {});

  const requiredWorkerTemplates = [
    "front-desk-coordinator",
    "administration-clerk",
    "accounts-clerk",
    "marketing-sales-coordinator",
    "technical-drawing-assistant",
    "project-coordination-assistant"
  ];
  const templates = (await request("/worker-templates")).json.data;
  const templateCodes = new Set(templates.map((template) => template.code));
  for (const code of requiredWorkerTemplates) {
    assert(templateCodes.has(code), `Missing worker template for NHL onboarding: ${code}`);
  }

  const tenant = await post("/tenants", { name: "NHL Global Solution Controlled Onboarding Tenant" });
  const firmResult = await post("/firms", {
    tenant_id: tenant.id,
    name: "NHL Global Solution",
    principal_name: "Nur Hernieliana"
  });
  const headers = authHeaders(firmResult);

  assert.equal(firmResult.firm.name, "NHL Global Solution");
  assert.equal(firmResult.principal_actor.display_name, "Nur Hernieliana");

  const workerPlan = [
    ["front-desk-coordinator", "NHL Front Desk AI Worker"],
    ["administration-clerk", "NHL Admin and Clerical AI Worker"],
    ["accounts-clerk", "NHL Accounts and Receivables AI Worker"],
    ["marketing-sales-coordinator", "NHL Sales and Proposal AI Worker"],
    ["technical-drawing-assistant", "NHL Technical Writing and EDCS Document AI Worker"],
    ["project-coordination-assistant", "NHL Project Reporting AI Worker"]
  ];

  const workers = [];
  for (const [worker_template_code, name] of workerPlan) {
    const provisioned = await post("/worker-instances", {
      tenant_id: tenant.id,
      firm_id: firmResult.firm.id,
      worker_template_code,
      name,
      actor: firmResult.principal_actor
    }, headers);
    const activated = await post("/worker-instances/activate", {
      tenant_id: tenant.id,
      firm_id: firmResult.firm.id,
      worker_instance_id: provisioned.worker_instance.id,
      actor: firmResult.principal_actor
    }, headers);
    assert.equal(activated.runtime_status, "ACTIVE", `${name} did not activate.`);
    workers.push({ ...provisioned, activated });
  }

  const client = await post("/clients", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    name: "BizKick Pilot Client",
    actor: firmResult.principal_actor
  }, headers);

  const enquiry = await post("/front-desk/enquiries", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    contact_name: "Aisyah Project Owner",
    organization_name: "BizKick Pilot Client",
    contact_email: "aisyah@example.com",
    enquiry_summary: "Need virtual service support for project reporting, technical writing, clerical work, and BizKick EDCS documentation/control setup."
  }, headers);
  assert.equal(enquiry.status, "NEW");

  const qualified = await post("/front-desk/enquiries/qualify", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    enquiry_id: enquiry.id,
    decision: "QUALIFIED",
    consent_or_legal_basis_ref: "NHL-CONSENT-001",
    conflict_check_status: "CLEARED",
    conflict_check_ref: "NHL-CONFLICT-001"
  }, headers);
  assert.equal(qualified.status, "QUALIFIED");

  const draft = await post("/front-desk/communication-drafts", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    enquiry_id: enquiry.id,
    subject: "NHL Global Solution enquiry acknowledgement",
    message_body: "Thank you for your enquiry. Nur Hernieliana will review the scope before any commitment is made."
  }, headers);
  assert.equal(draft.status, "DRAFT_REVIEW_REQUIRED");

  const handoff = await post("/front-desk/enquiries/handoff", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    enquiry_id: enquiry.id,
    provided_inputs: {
      service_lines: ["project_reporting", "technical_writing", "clerical_work", "bizkick_edcs"],
      human_owner: "Nur Hernieliana"
    }
  }, headers);

  const intake = await post("/intake-sessions", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    relationship_id: handoff.relationship.id,
    actor: firmResult.principal_actor,
    provided_inputs: {
      project_name: "BizKick EDCS Setup and Monthly Reporting Support",
      client_organization: "BizKick Pilot Client",
      client_contact_name: "Aisyah Project Owner",
      client_contact_email: "aisyah@example.com",
      requested_services: ["project reporting", "technical writing", "clerical work", "BizKick EDCS"],
      deliverables: ["weekly project report", "technical writing draft", "document control register", "clerical task tracker"],
      deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
      authority_note: "AI workers prepare drafts and records only; Nur Hernieliana approves commitments and final outputs."
    }
  }, headers);

  const proposal = await post("/proposals", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    relationship_id: handoff.relationship.id,
    intake_session_id: intake.intake.id,
    scope_summary: "Virtual project reporting, technical writing, clerical support, and BizKick EDCS documentation/control setup.",
    final_price: 3500,
    actor: firmResult.principal_actor
  }, headers);
  assert.equal(proposal.proposal.proposal_status, "APPROVAL_REQUIRED");

  const dispatchDenied = await request("/proposals/dispatch", {
    method: "POST",
    headers,
    body: {
      tenant_id: tenant.id,
      firm_id: firmResult.firm.id,
      proposal_id: proposal.proposal.id,
      recipient: "aisyah@example.com",
      document_ref: "doc://nhl-proposal-draft.pdf"
    }
  });
  assert(dispatchDenied.response.status >= 400, "Draft proposal dispatch should be denied until human approval.");

  const approved = await post("/proposals/approve", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    proposal_id: proposal.proposal.id,
    actor: firmResult.principal_actor
  }, headers);
  assert.equal(approved.proposal.proposal_status, "APPROVED");

  const dispatched = await post("/proposals/dispatch", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    proposal_id: approved.proposal.id,
    recipient: "aisyah@example.com",
    document_ref: "doc://nhl-approved-proposal.pdf",
    actor: firmResult.principal_actor
  }, headers);
  assert.equal(dispatched.proposal.proposal_status, "SENT");

  const accepted = await post("/proposals/accept", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    proposal_id: approved.proposal.id,
    project_name: "BizKick EDCS Setup and Monthly Reporting Support",
    actor: firmResult.principal_actor
  }, headers);
  assert.equal(accepted.project.project_name, "BizKick EDCS Setup and Monthly Reporting Support");

  const correspondence = await post("/administration/correspondence", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    relationship_id: handoff.relationship.id,
    project_id: accepted.project.id,
    subject: "Source documents received for EDCS setup",
    correspondent: "BizKick Pilot Client",
    direction: "INCOMING",
    channel: "EMAIL"
  }, headers);
  assert.equal(correspondence.status, "RECEIVED");

  const document = await post("/administration/documents", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    relationship_id: handoff.relationship.id,
    project_id: accepted.project.id,
    document_number: "NHL-EDCS-REG-001",
    title: "BizKick EDCS Master Document Register",
    document_type: "CONTROLLED_REGISTER",
    discipline: "BUSINESS_DOCUMENTATION",
    classification: "CONFIDENTIAL",
    revision: "P01",
    storage_ref: "doc://nhl/bizkick-edcs-register-p01",
    content_hash: "hash-nhl-edcs-p01"
  }, headers);
  assert.equal(document.document.document_number, "NHL-EDCS-REG-001");

  const deadline = await post("/administration/deadlines", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    project_id: accepted.project.id,
    title: "Prepare first weekly project report draft",
    due_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    priority: "HIGH"
  }, headers);
  assert.equal(deadline.status, "OPEN");

  const projectReporter = workers.find((entry) => entry.worker_instance.name === "NHL Project Reporting AI Worker");
  assert(projectReporter, "Project reporting worker should be provisioned.");
  const assigned = await post("/runtime/tasks/assign-ai", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    task_id: accepted.task.id,
    worker_instance_id: projectReporter.worker_instance.id,
    actor: firmResult.principal_actor
  }, headers);
  assert.equal(assigned.task.assigned_actor_or_worker_ref, projectReporter.worker_instance.id);

  const tool = await post("/runtime/tool-invocations", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    worker_instance_id: projectReporter.worker_instance.id,
    task_id: accepted.task.id,
    tool_name: "project.status.summarize",
    input_summary: "Prepare internal weekly project reporting summary for human review."
  }, headers);
  assert.equal(tool.invocation_status, "REQUESTED");

  const output = await post("/runtime/tasks/output", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    task_id: accepted.task.id,
    worker_instance_id: projectReporter.worker_instance.id,
    output_ref: "ai://outputs/nhl-weekly-project-report-draft",
    evidence_refs: [document.revision.id, correspondence.id, deadline.id],
    quality_flags: ["requires_human_review", "draft_only"],
    requires_human_review: true
  }, headers);
  assert.equal(output.task_output.requires_human_review, true);
  assert.equal(output.task.state, "OUTPUT_PRODUCED");

  const accountsWorker = workers.find((entry) => entry.worker_instance.name === "NHL Accounts and Receivables AI Worker");
  assert(accountsWorker, "Accounts worker should be provisioned.");
  const deniedPaymentTool = await request("/runtime/tool-invocations", {
    method: "POST",
    headers,
    body: {
      tenant_id: tenant.id,
      firm_id: firmResult.firm.id,
      worker_instance_id: accountsWorker.worker_instance.id,
      task_id: accepted.task.id,
      tool_name: "payments.release",
      input_summary: "Attempt to release payment should be blocked."
    }
  });
  assert(deniedPaymentTool.response.status >= 400, "AI worker must not invoke payment release.");

  const aiApproval = await request("/policy/evaluate", {
    method: "POST",
    headers,
    body: {
      actor: {
        actor_id: projectReporter.actor.id,
        actor_type: "AI_AGENT",
        tenant_id: tenant.id,
        firm_id: firmResult.firm.id,
        worker_instance_id: projectReporter.worker_instance.id
      },
      action: "approval.grant",
      resource: {
        resource_type: "Proposal",
        resource_id: proposal.proposal.id,
        tenant_id: tenant.id,
        firm_id: firmResult.firm.id
      },
      context: { professional_authority_valid: true }
    }
  });
  assert.equal(aiApproval.json.data.result, "DENY", "AI worker must not grant approval.");

  const deliverableDraft = await post("/deliverables/draft", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    project_id: accepted.project.id,
    relationship_id: handoff.relationship.id,
    title: "NHL Global Solution EDCS onboarding delivery report"
  }, headers);
  const evidenceBundle = await post("/evidence-bundles", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    project_id: accepted.project.id,
    subject_type: "Project",
    subject_id: accepted.project.id,
    input_refs: [
      document.revision.id,
      correspondence.id,
      deadline.id,
      output.task_output.id,
      "nhl-service-scope-project-reporting",
      "nhl-service-scope-technical-writing",
      "nhl-service-scope-clerical-work",
      "nhl-service-scope-bizkick-edcs",
      "formwork_intake_completeness",
      "document_revision_consistency",
      "unit_consistency",
      "geometry_positive_value_check",
      "risk_classification_completeness",
      "approval_presence_before_issue",
      "manufacturer_source_provenance_presence",
      "calculation_input_schema_validity"
    ]
  }, headers);
  const deliverableReview = await post("/deliverables/review", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    project_id: accepted.project.id,
    document_version_id: deliverableDraft.document_version.id,
    evidence_bundle_id: evidenceBundle.id,
    actor: firmResult.principal_actor
  }, headers);
  const issuedDeliverable = await post("/deliverables/issue", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    project_id: accepted.project.id,
    document_version_id: deliverableDraft.document_version.id,
    evidence_bundle_id: evidenceBundle.id,
    approval_id: deliverableReview.approval.id,
    subject_version_or_hash: deliverableDraft.document_version.hash,
    actor: firmResult.principal_actor
  }, headers);
  assert.equal(issuedDeliverable.project.project_state, "DELIVERABLE_ISSUED");

  const invoice = await post("/invoices", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    relationship_id: handoff.relationship.id,
    engagement_id: accepted.engagement.id,
    project_id: accepted.project.id,
    line_items: [{ description: "NHL Global Solution virtual service onboarding package", amount: 3500 }],
    currency: "MYR",
    actor: firmResult.principal_actor
  }, headers);
  assert.equal(invoice.status, "DRAFT");
  const issuedInvoice = await post("/invoices/issue", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    invoice_id: invoice.id,
    actor: firmResult.principal_actor
  }, headers);
  assert.equal(issuedInvoice.status, "ISSUED");

  const receivableDraft = await post("/accounts/receivable-follow-ups", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    invoice_id: invoice.id,
    subject: "Receivable follow-up draft",
    message_body: "Draft only. Human review required before sending."
  }, headers);
  assert.equal(receivableDraft.status, "DRAFT_REVIEW_REQUIRED");
  assert.equal(receivableDraft.sent_at, null);

  const today = (await request(`/operations/today?tenant_id=${tenant.id}&firm_id=${firmResult.firm.id}`, { headers })).json.data;
  assert(today.counts.pending_approvals >= 1, "NHL onboarding should expose pending human approvals/reviews.");
  assert(today.deadlines && typeof today.deadlines === "object", "Daily operations should expose deadline buckets.");
  assert(Array.isArray(today.approvals), "Daily operations should expose approvals/review queue.");
  assert(Array.isArray(today.exceptions), "Daily operations should expose exceptions.");
  assert(today.pipeline && typeof today.pipeline === "object", "Daily operations should expose pipeline status.");
  assert(Array.isArray(today.recent_activity), "Daily operations should expose recent auditable activity.");
  assert(Array.isArray(today.rehearsal_checks), "Daily operations should expose rehearsal checks without treating Formwork checks as NHL acceptance criteria.");
  assert(today.cash.outstanding >= 3500, "Daily operations should expose deterministic receivables/cash position.");

  const exportPackage = (await request(`/data-protection/export-package?tenant_id=${tenant.id}`, { headers })).json.data;
  assert(exportPackage.counts.firms >= 1, "Export package should include firm record count.");
  assert(exportPackage.counts.clients >= 1, "Export package should include client record count.");
  assert(exportPackage.counts.worker_instances >= 6, "Export package should include six NHL worker instances.");

  const events = (await request(`/event-log?tenant_id=${tenant.id}&firm_id=${firmResult.firm.id}`, { headers })).json.data;
  for (const eventType of ["worker_instance.provisioned", "front_desk.enquiry_captured", "approval.granted", "proposal.dispatched", "proposal.accepted", "task.assigned_to_worker", "task.output_produced", "deliverable.issued", "invoice.issued", "accounts.receivable_follow_up_drafted"]) {
    assert(events.some((event) => event.event_type === eventType), `Missing NHL onboarding event: ${eventType}`);
  }

  const otherTenant = await post("/tenants", { name: "NHL Isolation Other Tenant" });
  const otherFirm = await post("/firms", { tenant_id: otherTenant.id, name: "Other Firm", principal_name: "Other Principal" });
  const otherHeaders = authHeaders(otherFirm);
  const isolated = await request(`/operations/today?tenant_id=${tenant.id}&firm_id=${firmResult.firm.id}`, { headers: otherHeaders });
  assert(isolated.response.status >= 400, "Cross-tenant operations read should be denied.");

  console.log(JSON.stringify({
    smoke: "nhl-global-solution-onboarding",
    result: "passed",
    firm: firmResult.firm.name,
    owner: firmResult.principal_actor.display_name,
    services: ["project reporting", "technical writing", "clerical work", "BizKick EDCS"],
    workers_provisioned: workers.length,
    client_enquiry: qualified.status,
    proposal_status: dispatched.proposal.proposal_status,
    project_status: accepted.project.project_status,
    ai_output_requires_human_review: output.task_output.requires_human_review,
    invoice_status: issuedInvoice.status,
    export_counts: {
      firms: exportPackage.counts.firms,
      clients: exportPackage.counts.clients,
      worker_instances: exportPackage.counts.worker_instances
    },
    denied_controls: ["draft_proposal_dispatch", "ai_payment_release", "ai_approval_grant", "cross_tenant_operations_read"]
  }, null, 2));
} finally {
  if (api.exitCode === null) {
    api.kill();
    await once(api, "exit").catch(() => {});
  }
  await rm(tmp, { recursive: true, force: true });
}