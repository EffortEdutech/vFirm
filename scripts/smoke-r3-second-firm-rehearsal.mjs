import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const postgres = process.argv.includes("--postgres");
const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-r3-s4-"));
const port = postgres ? 3134 : 3133;
const base = `http://127.0.0.1:${port}`;
const env = { ...process.env, VFIRM_API_PORT: String(port) };
if (!postgres) {
  env.VFIRM_STORE_BACKEND = "json";
  env.VFIRM_STORE_PATH = join(tmp, "store.json");
  env.DATABASE_URL = "";
} else {
  env.VFIRM_STORE_BACKEND = "postgres";
  delete env.VFIRM_STORE_PATH;
}

const child = spawn(process.execPath, ["apps/api/src/server.mjs"], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
let logs = "";
child.stdout.on("data", (x) => logs += x);
child.stderr.on("data", (x) => logs += x);

async function wait() {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(base + "/health")).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(logs);
}
async function req(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(base + path, { method, headers: { "content-type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined });
  return { response, json: await response.json() };
}
async function post(path, body, headers = {}) {
  const { response, json } = await req(path, { method: "POST", body, headers });
  if (!response.ok || !json.ok) throw new Error(`${path}: ${response.status} ${JSON.stringify(json)}`);
  return json.data;
}
async function fixture(name) {
  return JSON.parse(await readFile(join(root, "tests", "factory-blueprints", name), "utf8"));
}
async function getData(path, headers) {
  const { response, json } = await req(path, { headers });
  assert.equal(response.status, 200, `${path} returned ${response.status}`);
  assert.equal(json.ok, true, `${path} returned non-ok`);
  return json.data;
}

async function createFactoryFirm({ tenant, controlHeaders, stamp }) {
  const bundle = await fixture("second-formwork-firm.fixture.json");
  const draft = await post("/factory/blueprints/firms", { tenant_id: tenant.id, blueprint_code: `r3-s4-second-firm-${stamp}`, bundle }, controlHeaders);
  const validated = await post("/factory/blueprints/firms/validate", { tenant_id: tenant.id, firm_blueprint_id: draft.id }, controlHeaders);
  assert.equal(validated.blueprint_state, "VALIDATED");
  const approved = await post("/factory/blueprints/firms/approve", { tenant_id: tenant.id, firm_blueprint_id: draft.id }, controlHeaders);
  assert.equal(approved.blueprint_state, "APPROVED_FOR_PROVISIONING");
  const provisioned = await post("/factory/provisioning-runs", { tenant_id: tenant.id, firm_blueprint_id: draft.id }, controlHeaders);
  assert.equal(provisioned.provisioning_run.provisioning_state, "PROVISIONED");
  const firmHeaders = { "x-vfirm-actor-id": provisioned.principal_actor.id, "x-vfirm-tenant-id": tenant.id, "x-vfirm-firm-id": provisioned.firm.id, "x-vfirm-role": "principal" };
  const certified = await post("/factory/provisioning-runs/certify-pack-binding", { tenant_id: tenant.id, firm_id: provisioned.firm.id, provisioning_run_id: provisioned.provisioning_run.id }, firmHeaders);
  assert.equal(certified.pack_binding_certification.certification_state, "CERTIFIED");
  assert(certified.service_activation_records.some((record) => record.service_id === "svc-formwork-delivery-support" && record.activation_state === "ACTIVE"));
  return { ...provisioned, firmHeaders, certified };
}

async function runFirstFirmRegression({ tenant, stamp }) {
  const firm = await post("/firms", { tenant_id: tenant.id, name: `R3-S4 First Regression Firm ${stamp}`, principal_name: "Ir. First Principal" });
  const h = { "x-vfirm-actor-id": firm.principal_actor.id, "x-vfirm-tenant-id": tenant.id, "x-vfirm-firm-id": firm.firm.id, "x-vfirm-role": "principal" };
  const client = await post("/clients", { tenant_id: tenant.id, firm_id: firm.firm.id, name: "First Regression Contractor" }, h);
  const input = { project_name: "R3-S4 First Regression Project", site_location: "Kuala Lumpur", client_organization: "First Regression Contractor", client_contact_name: "QS", client_contact_email: "first@example.com", structure_type: "podium", formwork_element_type: "wall", height: 3.1, length_or_area: 100, concrete_grade: "C30", available_drawings: ["FR-001"], deadline: new Date(Date.now() + 10 * 86400000).toISOString(), required_deliverables: ["drawing_support_pack"] };
  const intake = await post("/intake-sessions", { tenant_id: tenant.id, firm_id: firm.firm.id, relationship_id: client.relationship.id, provided_inputs: input }, h);
  const proposal = await post("/proposals", { tenant_id: tenant.id, firm_id: firm.firm.id, relationship_id: client.relationship.id, intake_session_id: intake.intake.id, scope_summary: "First firm regression proposal", final_price: 1800 }, h);
  const approved = await post("/proposals/approve", { tenant_id: tenant.id, firm_id: firm.firm.id, proposal_id: proposal.proposal.id }, h);
  const accepted = await post("/proposals/accept", { tenant_id: tenant.id, firm_id: firm.firm.id, proposal_id: approved.proposal.id, project_name: "R3-S4 First Regression Project" }, h);
  assert.equal(accepted.project.project_state, "OPEN");
  const projects = await getData(`/projects?tenant_id=${tenant.id}&firm_id=${firm.firm.id}`, h);
  assert(projects.some((project) => project.id === accepted.project.id));
  return { firm, headers: h, accepted };
}

async function runSecondFirmOperationalRehearsal({ tenant, factoryFirm, stamp }) {
  const firm = factoryFirm.firm;
  const h = factoryFirm.firmHeaders;
  await post("/administration/skill-bindings", { tenant_id: tenant.id, firm_id: firm.id, worker_template_code: "administration-clerk", role_skill_ref: "skills://roles/administration-clerk/v1", worker_skill_ref: "skills://workers/document-control/v1" }, h);
  await post("/commercial/skill-bindings", { tenant_id: tenant.id, firm_id: firm.id, worker_template_code: "marketing-sales-coordinator", role_skill_ref: "skills://roles/marketing-sales/v1", worker_skill_ref: "skills://workers/pipeline/v1" }, h);
  await post("/commercial/skill-bindings", { tenant_id: tenant.id, firm_id: firm.id, worker_template_code: "accounts-clerk", role_skill_ref: "skills://roles/accounts-clerk/v1", worker_skill_ref: "skills://workers/receivables/v1" }, h);
  await post("/technical/skill-bindings", { tenant_id: tenant.id, firm_id: firm.id, worker_template_code: "technical-drawing-assistant", role_skill_ref: "skills://roles/technical-support/v1", worker_skill_ref: "skills://workers/technical-drawing-assistant/v1" }, h);

  const enquiry = await post("/front-desk/enquiries", { tenant_id: tenant.id, firm_id: firm.id, contact_name: "Second Firm Client", organization_name: "Factory Pilot Contractor", contact_email: "second@example.com", enquiry_summary: "Need controlled Formwork delivery support for podium slab package." }, h);
  await post("/front-desk/enquiries/qualify", { tenant_id: tenant.id, firm_id: firm.id, enquiry_id: enquiry.id, decision: "QUALIFIED", consent_or_legal_basis_ref: "CONSENT-R3-S4", conflict_check_status: "CLEARED", conflict_check_ref: "CONFLICT-R3-S4" }, h);
  const ack = await post("/front-desk/communication-drafts", { tenant_id: tenant.id, firm_id: firm.id, enquiry_id: enquiry.id, subject: "Acknowledgement", message_body: "Thank you. The Virtual Principal will review scope before any commitment." }, h);
  assert.equal(ack.status, "DRAFT_REVIEW_REQUIRED");
  const handoff = await post("/front-desk/enquiries/handoff", { tenant_id: tenant.id, firm_id: firm.id, enquiry_id: enquiry.id, provided_inputs: {} }, h);
  assert(handoff.client.id && handoff.relationship.id);

  const input = { project_name: "R3-S4 Second Firm Formwork Package", site_location: "Kuala Lumpur", client_organization: "Factory Pilot Contractor", client_contact_name: "Second Firm Client", client_contact_email: "second@example.com", structure_type: "podium", formwork_element_type: "slab", height: 3.2, length_or_area: 275, concrete_grade: "C35", available_drawings: ["R3S4-S-001"], deadline: new Date(Date.now() + 14 * 86400000).toISOString(), required_deliverables: ["drawing_support_pack"] };
  const intake = await post("/intake-sessions", { tenant_id: tenant.id, firm_id: firm.id, relationship_id: handoff.relationship.id, provided_inputs: input }, h);
  assert.equal(intake.intake.intake_status, "COMPLETE");
  let opportunity = await post("/sales/opportunities", { tenant_id: tenant.id, firm_id: firm.id, relationship_id: handoff.relationship.id, intake_session_id: intake.intake.id, opportunity_name: "Second firm Formwork support", estimated_value: 4700, probability_percent: 30 }, h);
  opportunity = await post("/sales/opportunities/update", { tenant_id: tenant.id, firm_id: firm.id, opportunity_id: opportunity.id, stage: "QUALIFIED" }, h);
  assert.equal(opportunity.stage, "QUALIFIED");

  const proposal = await post("/proposals", { tenant_id: tenant.id, firm_id: firm.id, relationship_id: handoff.relationship.id, intake_session_id: intake.intake.id, scope_summary: "R3-S4 second firm proposal", final_price: 4700 }, h);
  const dispatchDenied = await req("/proposals/dispatch", { method: "POST", headers: h, body: { tenant_id: tenant.id, firm_id: firm.id, proposal_id: proposal.proposal.id, recipient: "second@example.com", document_ref: "doc://unapproved-proposal.pdf" } });
  assert(dispatchDenied.response.status >= 400);
  const proposalApproved = await post("/proposals/approve", { tenant_id: tenant.id, firm_id: firm.id, proposal_id: proposal.proposal.id }, h);
  const dispatched = await post("/proposals/dispatch", { tenant_id: tenant.id, firm_id: firm.id, proposal_id: proposalApproved.proposal.id, recipient: "second@example.com", document_ref: "doc://approved-proposal-r3-s4.pdf" }, h);
  assert.equal(dispatched.proposal.proposal_status, "SENT");
  const accepted = await post("/proposals/accept", { tenant_id: tenant.id, firm_id: firm.id, proposal_id: dispatched.proposal.id, project_name: "R3-S4 Second Firm Formwork Package" }, h);
  assert.equal(accepted.project.project_state, "OPEN");

  await post("/administration/correspondence", { tenant_id: tenant.id, firm_id: firm.id, relationship_id: handoff.relationship.id, project_id: accepted.project.id, subject: "Drawing package received", correspondent: "Factory Pilot Contractor", direction: "INCOMING", channel: "EMAIL" }, h);
  const deadline = await post("/administration/deadlines", { tenant_id: tenant.id, firm_id: firm.id, project_id: accepted.project.id, title: "Principal review of R3-S4 technical package", due_at: new Date(Date.now() + 3 * 86400000).toISOString(), priority: "HIGH" }, h);
  assert.equal(deadline.status, "OPEN");
  const doc = await post("/administration/documents", { tenant_id: tenant.id, firm_id: firm.id, relationship_id: handoff.relationship.id, project_id: accepted.project.id, document_number: `R3-S4-${stamp}`, title: "Second firm controlled drawing", document_type: "TECHNICAL_DRAWING", discipline: "TEMPORARY_WORKS", classification: "CONFIDENTIAL", revision: "P01", storage_ref: "doc://r3-s4-p01", content_hash: "hash-r3-s4-p01" }, h);
  const rev = await post("/administration/document-revisions", { tenant_id: tenant.id, firm_id: firm.id, document_register_entry_id: doc.document.id, revision: "P02", storage_ref: "doc://r3-s4-p02", content_hash: "hash-r3-s4-p02" }, h);
  const tasks = await getData(`/tasks?tenant_id=${tenant.id}&firm_id=${firm.id}`, h);
  assert(tasks.length >= 1);

  const review = await post("/technical/drawing-reviews", { tenant_id: tenant.id, firm_id: firm.id, project_id: accepted.project.id, document_register_entry_id: doc.document.id, base_revision_id: doc.revision.id, compared_revision_id: rev.revision.id }, h);
  const calcInvalid = await post("/technical/calculation-input-sets", { tenant_id: tenant.id, firm_id: firm.id, project_id: accepted.project.id, intake_session_id: intake.intake.id, source_revision_refs: [rev.revision.id], input_values: { ...input, height: -1 } }, h);
  assert.equal(calcInvalid.validation_status, "INVALID");
  const calc = await post("/technical/calculation-input-sets", { tenant_id: tenant.id, firm_id: firm.id, project_id: accepted.project.id, intake_session_id: intake.intake.id, source_revision_refs: [rev.revision.id], input_values: input, unit_system: "SI" }, h);
  assert.equal(calc.validation_status, "VALID");
  const finding = await post("/technical/qa-findings", { tenant_id: tenant.id, firm_id: firm.id, project_id: accepted.project.id, subject_type: "DrawingRevision", subject_id: rev.revision.id, finding_code: "R3S4_EDGE_REVIEW", severity: "HIGH", description: "Edge condition requires professional check." }, h);
  const blockedPackage = await post("/technical/delivery-packages", { tenant_id: tenant.id, firm_id: firm.id, project_id: accepted.project.id, drawing_revision_refs: [rev.revision.id], calculation_input_set_id: calc.id, evidence_refs: [review.id] }, h);
  assert.equal(blockedPackage.package_status, "BLOCKED");
  assert.equal(blockedPackage.professional_approval_id, null);
  const systemActor = { actor_id: "00000000-0000-0000-0000-000000000000", actor_type: "SYSTEM", tenant_id: tenant.id, firm_id: firm.id, role: "system" };
  const silentResolveDenied = await req("/technical/qa-findings/resolve", { method: "POST", headers: h, body: { tenant_id: tenant.id, firm_id: firm.id, finding_id: finding.id, resolution_summary: "Silent AI close", actor: systemActor } });
  assert(silentResolveDenied.response.status >= 400);
  const resolved = await post("/technical/qa-findings/resolve", { tenant_id: tenant.id, firm_id: firm.id, finding_id: finding.id, resolution_summary: "Virtual Principal reviewed and accepted mitigation." }, h);
  const readyPackage = await post("/technical/delivery-packages", { tenant_id: tenant.id, firm_id: firm.id, project_id: accepted.project.id, drawing_revision_refs: [rev.revision.id], calculation_input_set_id: calc.id, evidence_refs: [review.id, resolved.id] }, h);
  assert.equal(readyPackage.package_status, "READY_FOR_PRINCIPAL_REVIEW");
  assert.equal(readyPackage.professional_approval_id, null);

  const requiredEvidence = ["formwork_intake_completeness", "document_revision_consistency", "unit_consistency", "geometry_positive_value_check", "risk_classification_completeness", "approval_presence_before_issue", "manufacturer_source_provenance_presence", "calculation_input_schema_validity"];
  const draft = await post("/deliverables/draft", { tenant_id: tenant.id, firm_id: firm.id, project_id: accepted.project.id, relationship_id: handoff.relationship.id, title: "R3-S4 Second Firm Delivery Report" }, h);
  const evidence = await post("/evidence-bundles", { tenant_id: tenant.id, firm_id: firm.id, project_id: accepted.project.id, subject_type: "Project", subject_id: accepted.project.id, input_refs: requiredEvidence }, h);
  const deliverableReview = await post("/deliverables/review", { tenant_id: tenant.id, firm_id: firm.id, project_id: accepted.project.id, document_version_id: draft.document_version.id, evidence_bundle_id: evidence.id }, h);
  const issued = await post("/deliverables/issue", { tenant_id: tenant.id, firm_id: firm.id, project_id: accepted.project.id, document_version_id: draft.document_version.id, evidence_bundle_id: evidence.id, approval_id: deliverableReview.approval.id, subject_version_or_hash: draft.document_version.hash }, h);
  assert.equal(issued.project.project_state, "DELIVERABLE_ISSUED");

  const expense = await post("/accounts/expenses", { tenant_id: tenant.id, firm_id: firm.id, project_id: accepted.project.id, supplier: "R3-S4 Printing Supplier", description: "Controlled drawing print package", category: "PRINTING", amount: 150, currency: "MYR" }, h);
  assert.equal(expense.status, "DRAFT_REVIEW_REQUIRED");
  const invoice = await post("/invoices", { tenant_id: tenant.id, firm_id: firm.id, relationship_id: handoff.relationship.id, engagement_id: accepted.engagement.id, project_id: accepted.project.id, line_items: [{ description: "R3-S4 Formwork delivery support", amount: 4700 }], currency: "MYR" }, h);
  const issuedInvoice = await post("/invoices/issue", { tenant_id: tenant.id, firm_id: firm.id, invoice_id: invoice.id }, h);
  assert.equal(issuedInvoice.status, "ISSUED");
  const followUp = await post("/accounts/receivable-follow-ups", { tenant_id: tenant.id, firm_id: firm.id, invoice_id: invoice.id, subject: "Receivable follow-up draft", message_body: "Please review the issued invoice when convenient." }, h);
  assert.equal(followUp.status, "DRAFT_REVIEW_REQUIRED");
  assert.equal(followUp.sent_at, null);

  const today = await getData(`/operations/today?tenant_id=${tenant.id}&firm_id=${firm.id}`, h);
  assert(today.counts.open_projects >= 1);
  assert(today.counts.ready_delivery_packages >= 1);
  assert(today.counts.pending_approvals >= 1);
  assert.equal(today.counts.blocked_delivery_packages, 1);
  assert(today.exceptions.some((item) => item.key === "blocked_delivery_packages"));
  assert(today.cash.outstanding >= 4700);
  const cash = await getData(`/accounts/cash-snapshot?tenant_id=${tenant.id}&firm_id=${firm.id}`, h);
  assert.equal(Number(cash.invoice_total), 4700);
  assert.equal(Number(cash.cash_received), 0);
  assert.equal(cash.calculation_basis, "deterministic_record_projection_no_bank_balance");

  const events = await getData(`/event-log?tenant_id=${tenant.id}&firm_id=${firm.id}`, h);
  for (const eventType of ["pack.binding_certified", "front_desk.enquiry_captured", "approval.granted", "proposal.dispatched", "proposal.accepted", "technical.delivery_package_blocked", "technical.delivery_package_ready_for_principal_review", "deliverable.issued", "invoice.issued", "accounts.receivable_follow_up_drafted"]) {
    assert(events.some((event) => event.event_type === eventType), `Missing event ${eventType}`);
  }
  const audit = await getData(`/audit-events?tenant_id=${tenant.id}&firm_id=${firm.id}`, h);
  assert(audit.length >= events.length);
  const exported = await getData(`/data-protection/export-package?tenant_id=${tenant.id}&firm_id=${firm.id}`, h);
  for (const key of ["clients", "projects", "tasks", "documents", "document_versions", "correspondence_records", "proposals", "invoices", "receivable_follow_ups", "drawing_review_records", "technical_qa_findings", "delivery_package_records", "pack_binding_certifications", "service_activation_records", "event_log", "audit_events"]) {
    assert(exported.counts[key] >= 1, `Export missing ${key}`);
  }

  return { accepted, invoice: issuedInvoice, today, cash, events, audit, exported };
}

try {
  await wait();
  await post("/mvp/reset", {});
  const stamp = Date.now();
  const tenant = await post("/tenants", { name: `R3-S4 Tenant ${stamp}` });
  const controlFirm = await post("/firms", { tenant_id: tenant.id, name: `R3-S4 Factory Control Firm ${stamp}`, principal_name: "Factory Product Owner" });
  const controlHeaders = { "x-vfirm-actor-id": controlFirm.principal_actor.id, "x-vfirm-tenant-id": tenant.id, "x-vfirm-role": "principal" };

  const first = await runFirstFirmRegression({ tenant, stamp });
  const factoryFirm = await createFactoryFirm({ tenant, controlHeaders, stamp });
  assert.notEqual(first.firm.firm.id, factoryFirm.firm.id);
  const rehearsal = await runSecondFirmOperationalRehearsal({ tenant, factoryFirm, stamp });

  const otherTenant = await post("/tenants", { name: `R3-S4 Other Tenant ${stamp}` });
  const otherFirm = await post("/firms", { tenant_id: otherTenant.id, name: `R3-S4 Other Firm ${stamp}`, principal_name: "Other Principal" });
  const otherHeaders = { "x-vfirm-actor-id": otherFirm.principal_actor.id, "x-vfirm-tenant-id": otherTenant.id, "x-vfirm-firm-id": otherFirm.firm.id, "x-vfirm-role": "principal" };
  const isolated = await req(`/data-protection/export-package?tenant_id=${tenant.id}&firm_id=${factoryFirm.firm.id}`, { headers: otherHeaders });
  assert(isolated.response.status >= 400);

  assert(rehearsal.exported.counts.factory_firm_blueprints >= 1);
  assert(rehearsal.exported.counts.provisioned_firm_instances >= 1);
  console.log(`R3-S4 Second-Firm Rehearsal smoke passed (${postgres ? "postgres" : "json"}).`);
} finally {
  if (child.exitCode === null) {
    child.kill();
    await once(child, "exit").catch(() => {});
  }
  await rm(tmp, { recursive: true, force: true });
}