import assert from "node:assert/strict";

const base = process.env.VFIRM_API_BASE ?? "http://127.0.0.1:3091";

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await response.json().catch(() => ({ ok: false, error: { message: "Non-JSON response" } }));
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

async function readStore() {
  const { response, json } = await request("/mvp/store");
  if (!response.ok || !json.ok) throw new Error(`/mvp/store failed: ${response.status} ${JSON.stringify(json)}`);
  return json.data;
}

async function main() {
  const health = await request("/health");
  if (!health.response.ok || !health.json.ok) throw new Error(`vFirm API is not healthy at ${base}`);

  const existingStore = await readStore();
  const existingFirm = existingStore.firms?.find((firm) => firm.name === "NHL Global Solution");
  if (existingFirm) {
    console.log(JSON.stringify({
      seed: "nhl-global-solution-local",
      result: "already_present",
      firm: existingFirm.name,
      firm_id: existingFirm.id,
      tenant_id: existingFirm.tenant_id,
      access: "Open http://localhost:3090/ and use My Firm, AI Workforce, Front Desk, Clients, Proposals, Projects, Invoices, Ops, and Audit."
    }, null, 2));
    return;
  }

  const templates = (await request("/worker-templates")).json.data ?? [];
  const requiredTemplateCodes = [
    "front-desk-coordinator",
    "administration-clerk",
    "accounts-clerk",
    "marketing-sales-coordinator",
    "technical-drawing-assistant",
    "project-coordination-assistant"
  ];
  const templateCodes = new Set(templates.map((template) => template.code));
  for (const code of requiredTemplateCodes) assert(templateCodes.has(code), `Missing worker template: ${code}`);

  const tenant = await post("/tenants", { name: "NHL Global Solution Tenant" });
  const firmResult = await post("/firms", {
    tenant_id: tenant.id,
    name: "NHL Global Solution",
    principal_name: "Nur Hernieliana"
  });
  const headers = authHeaders(firmResult);

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
    assert.equal(activated.runtime_status, "ACTIVE");
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
    enquiry_summary: "Need virtual service support for project reporting, technical writing, clerical work, and BizKick EDCS documentation/control setup.",
    requested_service_hint: "project_reporting_technical_writing_clerical_bizkick_edcs",
    urgency: "STANDARD",
    actor: firmResult.principal_actor
  }, headers);

  await post("/front-desk/enquiries/qualify", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    enquiry_id: enquiry.id,
    decision: "QUALIFIED",
    qualification_reason: "NHL local seed: controlled virtual-service support request for project reporting, technical writing, clerical work, and BizKick EDCS.",
    consent_or_legal_basis_ref: "NHL-SEED-CONSENT-LOCAL-ONLY",
    conflict_check_status: "CLEARED",
    conflict_check_ref: "NHL-SEED-CONFLICT-CLEARED",
    actor: firmResult.principal_actor
  }, headers);

  await post("/front-desk/communication-drafts", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    enquiry_id: enquiry.id,
    subject: "NHL Global Solution acknowledgement draft",
    message_body: "Thank you for your enquiry. NHL Global Solution can prepare project reporting, technical writing, clerical support, and BizKick EDCS setup drafts for human review.",
    actor: firmResult.principal_actor
  }, headers);

  const handoff = await post("/front-desk/enquiries/handoff", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    enquiry_id: enquiry.id,
    provided_inputs: {
      service_profile: ["project reporting", "technical writing", "clerical work", "BizKick EDCS"],
      owner: "Nur Hernieliana",
      delivery_mode: "controlled local seed"
    },
    actor: firmResult.principal_actor
  }, headers);

  const intake = await post("/intake-sessions", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    relationship_id: handoff.relationship.id,
    provided_inputs: {
      project_name: "BizKick EDCS Starter Setup",
      client_organization: "BizKick Pilot Client",
      client_contact_name: "Aisyah Project Owner",
      client_contact_email: "aisyah@example.com",
      site_location: "Remote",
      structure_type: "business_documentation",
      formwork_element_type: "documentation_control",
      height: 1,
      length_or_area: 1,
      concrete_grade: "N/A",
      available_drawings: ["BIZKICK-EDCS-SCOPE-001"],
      deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
      required_deliverables: ["project_report", "technical_writing_pack", "clerical_register", "edcs_control_index"]
    },
    actor: firmResult.principal_actor
  }, headers);

  const proposal = await post("/proposals", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    relationship_id: handoff.relationship.id,
    intake_session_id: intake.intake.id,
    scope_summary: "NHL Global Solution virtual support package: project reporting, technical writing, clerical work, and BizKick EDCS setup.",
    final_price: 3500,
    currency: "MYR",
    actor: firmResult.principal_actor
  }, headers);
  const approved = await post("/proposals/approve", { tenant_id: tenant.id, firm_id: firmResult.firm.id, proposal_id: proposal.proposal.id, actor: firmResult.principal_actor }, headers);
  const dispatched = await post("/proposals/dispatch", { tenant_id: tenant.id, firm_id: firmResult.firm.id, proposal_id: approved.proposal.id, recipient: "aisyah@example.com", document_ref: "doc://nhl-approved-proposal-local-seed", actor: firmResult.principal_actor }, headers);
  const accepted = await post("/proposals/accept", { tenant_id: tenant.id, firm_id: firmResult.firm.id, proposal_id: dispatched.proposal.id, project_name: "BizKick EDCS Starter Setup", actor: firmResult.principal_actor }, headers);

  const correspondence = await post("/administration/correspondence", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    relationship_id: handoff.relationship.id,
    project_id: accepted.project.id,
    subject: "EDCS starter information received",
    correspondent: "BizKick Pilot Client",
    direction: "INCOMING",
    channel: "EMAIL",
    actor: firmResult.principal_actor
  }, headers);
  const document = await post("/administration/documents", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    relationship_id: handoff.relationship.id,
    project_id: accepted.project.id,
    document_number: "NHL-BIZKICK-EDCS-001",
    title: "BizKick EDCS Starter Control Index",
    document_type: "TECHNICAL_REPORT",
    discipline: "DOCUMENT_CONTROL",
    classification: "CONFIDENTIAL",
    revision: "P01",
    storage_ref: "doc://nhl-bizkick-edcs-starter-control-index-p01",
    content_hash: "hash-nhl-bizkick-edcs-p01",
    actor: firmResult.principal_actor
  }, headers);
  const deadline = await post("/administration/deadlines", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    project_id: accepted.project.id,
    relationship_id: handoff.relationship.id,
    title: "Prepare first NHL project reporting and EDCS draft",
    due_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    priority: "HIGH",
    actor: firmResult.principal_actor
  }, headers);

  const projectReporter = workers.find((entry) => entry.worker_instance.name === "NHL Project Reporting AI Worker");
  await post("/runtime/tasks/assign-ai", { tenant_id: tenant.id, firm_id: firmResult.firm.id, task_id: accepted.task.id, worker_instance_id: projectReporter.worker_instance.id, actor: firmResult.principal_actor }, headers);
  const output = await post("/runtime/tasks/output", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    task_id: accepted.task.id,
    worker_instance_id: projectReporter.worker_instance.id,
    output_ref: "ai://outputs/nhl-local-project-report-draft",
    evidence_refs: [document.revision.id, correspondence.id, deadline.id],
    quality_flags: ["requires_human_review", "draft_only"],
    requires_human_review: true,
    actor: firmResult.principal_actor
  }, headers);

  const deliverableDraft = await post("/deliverables/draft", { tenant_id: tenant.id, firm_id: firmResult.firm.id, project_id: accepted.project.id, relationship_id: handoff.relationship.id, title: "NHL Global Solution EDCS local delivery report", actor: firmResult.principal_actor }, headers);
  const evidenceBundle = await post("/evidence-bundles", {
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    project_id: accepted.project.id,
    subject_type: "Project",
    subject_id: accepted.project.id,
    input_refs: [document.revision.id, correspondence.id, deadline.id, output.task_output.id, "formwork_intake_completeness", "document_revision_consistency", "unit_consistency", "geometry_positive_value_check", "risk_classification_completeness", "approval_presence_before_issue", "manufacturer_source_provenance_presence", "calculation_input_schema_validity"],
    actor: firmResult.principal_actor
  }, headers);
  const review = await post("/deliverables/review", { tenant_id: tenant.id, firm_id: firmResult.firm.id, project_id: accepted.project.id, document_version_id: deliverableDraft.document_version.id, evidence_bundle_id: evidenceBundle.id, actor: firmResult.principal_actor }, headers);
  await post("/deliverables/issue", { tenant_id: tenant.id, firm_id: firmResult.firm.id, project_id: accepted.project.id, document_version_id: deliverableDraft.document_version.id, evidence_bundle_id: evidenceBundle.id, approval_id: review.approval.id, subject_version_or_hash: deliverableDraft.document_version.hash, actor: firmResult.principal_actor }, headers);

  const invoice = await post("/invoices", { tenant_id: tenant.id, firm_id: firmResult.firm.id, relationship_id: handoff.relationship.id, engagement_id: accepted.engagement.id, project_id: accepted.project.id, line_items: [{ description: "NHL Global Solution virtual service starter package", amount: 3500 }], currency: "MYR", actor: firmResult.principal_actor }, headers);
  await post("/invoices/issue", { tenant_id: tenant.id, firm_id: firmResult.firm.id, invoice_id: invoice.id, actor: firmResult.principal_actor }, headers);
  await post("/accounts/receivable-follow-ups", { tenant_id: tenant.id, firm_id: firmResult.firm.id, invoice_id: invoice.id, subject: "NHL receivable follow-up draft", message_body: "Draft only. Human review required before sending.", actor: firmResult.principal_actor }, headers);

  console.log(JSON.stringify({
    seed: "nhl-global-solution-local",
    result: "created",
    firm: firmResult.firm.name,
    owner: firmResult.principal_actor.display_name,
    tenant_id: tenant.id,
    firm_id: firmResult.firm.id,
    workers_created: workers.length,
    access: "Open http://localhost:3090/ and use My Firm, AI Workforce, Front Desk, Clients, Proposals, Projects, Invoices, Ops, and Audit."
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});