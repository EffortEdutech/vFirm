import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-op-h3-"));
const apiPort = 3126;
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
  assert.equal(code, 0, `OP-H3 seed failed.\nstdout:\n${seedOut}\nstderr:\n${seedErr}`);
  return JSON.parse(seedOut);
}

function eventTypes(events) {
  return new Set((events ?? []).map((event) => event.event_type));
}

try {
  assert(await exists("docs/10_post_freeze_technical_design/OP_H3_FORMWORK_PILOT_DAY_REHEARSAL_COMPLETION_v1.0.md"), "OP-H3 completion document missing.");
  const completion = await readFile("docs/10_post_freeze_technical_design/OP_H3_FORMWORK_PILOT_DAY_REHEARSAL_COMPLETION_v1.0.md", "utf8");
  const checklist = await readFile("docs/10_post_freeze_technical_design/OP_H1_TO_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_CHECKLIST_v1.0.md", "utf8");
  const readme = await readFile("docs/10_post_freeze_technical_design/README.md", "utf8");
  const decisions = await readFile("docs/00_project_control/DECISION_REGISTER.md", "utf8");
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));

  for (const item of [
    "- [x] Create Formwork pilot-day fixture.",
    "- [x] Rehearse client enquiry intake.",
    "- [x] Rehearse project/drawing/QA activity.",
    "- [x] Rehearse technical issue creation.",
    "- [x] Block regulated technical issue until valid human professional approval exists.",
    "- [x] Capture Formwork evidence trail.",
    "- [x] Verify audit reconstruction for Formwork pilot day.",
    "- [x] Verify export sample is Formwork tenant/firm scoped.",
    "- [x] Add Formwork pilot-day smoke test.",
    "- [x] Update evidence and decision register."
  ]) {
    assert(checklist.includes(item), `OP-H3 checklist item not checked: ${item}`);
  }
  for (const marker of ["Formwork pilot-day fixture", "technical issue blocked", "valid human professional approval", "audit reconstruction", "export sample", "OP-H4 - NHL Global Solution Pilot Day Rehearsal"]) {
    assert(completion.includes(marker), `OP-H3 completion missing marker: ${marker}`);
  }
  assert(readme.includes("OP_H3_FORMWORK_PILOT_DAY_REHEARSAL_COMPLETION_v1.0.md"), "README missing OP-H3 completion doc.");
  assert(decisions.includes("ADR-057 - OP-H3 Formwork pilot day rehearsal completed"), "ADR-057 missing from decision register.");
  assert(packageJson.scripts["check:op:h3"] === "node scripts/smoke-op-h3-formwork-pilot-day-rehearsal.mjs", "check:op:h3 package script missing.");
  assert(packageJson.scripts.check.includes("smoke-op-h3-formwork-pilot-day-rehearsal.mjs"), "Full check chain must include OP-H3 smoke.");

  start("api", ["apps/api/src/server.mjs"], { VFIRM_API_PORT: String(apiPort), VFIRM_STORE_PATH: storePath, DATABASE_URL: "", VFIRM_STORE_BACKEND: "json" });
  await waitForJson(`${apiBase}/health`);
  await seedPilotWorkspaces();

  const initialStore = await get("/mvp/store");
  const formwork = (initialStore.firms ?? []).find((firm) => firm.name === "Amanah Formwork Pilot Firm");
  const nhl = (initialStore.firms ?? []).find((firm) => firm.name === "NHL Global Solution");
  assert(formwork, "Amanah Formwork Pilot Firm missing from seeded pilot workspaces.");
  assert(nhl, "NHL Global Solution missing from seeded pilot workspaces.");
  assert.notEqual(formwork.tenant_id, nhl.tenant_id, "Formwork and NHL must remain separate tenants.");
  const h = authHeaders(initialStore, formwork);

  const formworkSummary = await get(`/workspace/active-summary?tenant_id=${formwork.tenant_id}&firm_id=${formwork.id}`, h);
  assert.equal(formworkSummary.workspace.firm_type, "FORMWORK_ENGINEERING");
  assert(formworkSummary.workspace.modules.some((module) => module.module_code === "technical_delivery"), "Formwork workspace must include Technical Delivery.");

  const stamp = Date.now();
  await post("/technical/skill-bindings", { tenant_id: formwork.tenant_id, firm_id: formwork.id, worker_template_code: "technical-drawing-assistant", role_skill_ref: "skills://roles/formwork-technical-delivery/v1", worker_skill_ref: "skills://workers/technical-drawing-assistant/v1" }, h);
  await post("/technical/skill-bindings", { tenant_id: formwork.tenant_id, firm_id: formwork.id, worker_template_code: "formwork-qa-agent", role_skill_ref: "skills://roles/formwork-qa/v1", worker_skill_ref: "skills://workers/formwork-qa-agent/v1" }, h);

  const enquiry = await post("/front-desk/enquiries", { tenant_id: formwork.tenant_id, firm_id: formwork.id, contact_name: "OP-H3 Site Manager", organization_name: "OP-H3 Contractor Sdn Bhd", contact_email: "oph3@example.com", enquiry_summary: "Need controlled Formwork delivery support for basement wall and slab drawings.", requested_service_hint: "Preliminary Wall/Slab Formwork Support" }, h);
  await post("/front-desk/enquiries/qualify", { tenant_id: formwork.tenant_id, firm_id: formwork.id, enquiry_id: enquiry.id, decision: "QUALIFIED", consent_or_legal_basis_ref: "OP-H3-CONSENT", conflict_check_status: "CLEARED", conflict_check_ref: "OP-H3-CONFLICT-CLEARED" }, h);
  const handoff = await post("/front-desk/enquiries/handoff", { tenant_id: formwork.tenant_id, firm_id: formwork.id, enquiry_id: enquiry.id, provided_inputs: {} }, h);

  const input = {
    project_name: "OP-H3 Controlled Formwork Pilot Day",
    site_location: "Kuala Lumpur",
    client_organization: "OP-H3 Contractor Sdn Bhd",
    client_contact_name: "OP-H3 Site Manager",
    client_contact_email: "oph3@example.com",
    structure_type: "basement",
    formwork_element_type: "wall",
    height: 3.6,
    length_or_area: 180,
    concrete_grade: "C35",
    available_drawings: ["OPH3-S-100"],
    deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
    required_deliverables: ["controlled_drawing_review", "qa_evidence_bundle", "delivery_report"]
  };
  const intake = await post("/intake-sessions", { tenant_id: formwork.tenant_id, firm_id: formwork.id, relationship_id: handoff.relationship.id, provided_inputs: input }, h);
  assert.equal(intake.intake.intake_status, "COMPLETE");
  const proposal = await post("/proposals", { tenant_id: formwork.tenant_id, firm_id: formwork.id, relationship_id: handoff.relationship.id, intake_session_id: intake.intake.id, scope_summary: "OP-H3 controlled Formwork pilot-day package", final_price: 6200 }, h);
  const approvedProposal = await post("/proposals/approve", { tenant_id: formwork.tenant_id, firm_id: formwork.id, proposal_id: proposal.proposal.id }, h);
  const projectOpen = await post("/proposals/accept", { tenant_id: formwork.tenant_id, firm_id: formwork.id, proposal_id: approvedProposal.proposal.id, project_name: "OP-H3 Controlled Formwork Pilot Day" }, h);
  assert.equal(projectOpen.project.project_state, "OPEN");

  const register = await post("/administration/documents", { tenant_id: formwork.tenant_id, firm_id: formwork.id, relationship_id: handoff.relationship.id, project_id: projectOpen.project.id, document_number: `OP-H3-S-${stamp}`, title: "OP-H3 controlled Formwork drawing", document_type: "TECHNICAL_DRAWING", discipline: "TEMPORARY_WORKS", classification: "CONFIDENTIAL", revision: "P01", storage_ref: "doc://op-h3/drawing-p01", content_hash: `op-h3-hash-p01-${stamp}` }, h);
  const revision = await post("/administration/document-revisions", { tenant_id: formwork.tenant_id, firm_id: formwork.id, document_register_entry_id: register.document.id, revision: "P02", storage_ref: "doc://op-h3/drawing-p02", content_hash: `op-h3-hash-p02-${stamp}` }, h);
  const drawingReview = await post("/technical/drawing-reviews", { tenant_id: formwork.tenant_id, firm_id: formwork.id, project_id: projectOpen.project.id, document_register_entry_id: register.document.id, base_revision_id: register.revision.id, compared_revision_id: revision.revision.id }, h);
  assert.equal(drawingReview.status, "CHECKED_REVIEW_REQUIRED");
  assert.equal(drawingReview.requires_professional_review, true);

  const validCalc = await post("/technical/calculation-input-sets", { tenant_id: formwork.tenant_id, firm_id: formwork.id, project_id: projectOpen.project.id, intake_session_id: intake.intake.id, source_revision_refs: [revision.revision.id], input_values: input, unit_system: "SI" }, h);
  assert.equal(validCalc.validation_status, "VALID");
  const qaFinding = await post("/technical/qa-findings", { tenant_id: formwork.tenant_id, firm_id: formwork.id, project_id: projectOpen.project.id, subject_type: "DrawingRevision", subject_id: revision.revision.id, finding_code: "OP_H3_TEMPORARY_WORKS_EDGE_CASE", severity: "HIGH", description: "Formwork edge condition requires human professional review before issue." }, h);

  const blockedPackage = await post("/technical/delivery-packages", { tenant_id: formwork.tenant_id, firm_id: formwork.id, project_id: projectOpen.project.id, drawing_revision_refs: [revision.revision.id], calculation_input_set_id: validCalc.id, evidence_refs: [drawingReview.id] }, h);
  assert.equal(blockedPackage.package_status, "BLOCKED");
  assert.equal(blockedPackage.professional_approval_id, null);
  assert.equal(blockedPackage.issued_document_version_id, null);

  const aiActor = { actor_id: "op-h3-ai-worker", actor_type: "AI_AGENT", tenant_id: formwork.tenant_id, firm_id: formwork.id, worker_instance_id: "op-h3-ai-worker", role: "technical-drawing-assistant" };
  const aiResolveDenied = await request("/technical/qa-findings/resolve", { method: "POST", headers: h, body: { tenant_id: formwork.tenant_id, firm_id: formwork.id, finding_id: qaFinding.id, resolution_summary: "AI attempted to close regulated QA issue.", actor: aiActor } });
  assert(aiResolveDenied.response.status >= 400, "AI worker must not silently resolve regulated technical issue.");

  const resolvedFinding = await post("/technical/qa-findings/resolve", { tenant_id: formwork.tenant_id, firm_id: formwork.id, finding_id: qaFinding.id, resolution_summary: "Virtual Principal reviewed the edge condition and recorded mitigation evidence." }, h);
  assert.equal(resolvedFinding.status, "RESOLVED");
  const readyPackage = await post("/technical/delivery-packages", { tenant_id: formwork.tenant_id, firm_id: formwork.id, project_id: projectOpen.project.id, drawing_revision_refs: [revision.revision.id], calculation_input_set_id: validCalc.id, evidence_refs: [drawingReview.id, resolvedFinding.id] }, h);
  assert.equal(readyPackage.package_status, "READY_FOR_PRINCIPAL_REVIEW");
  assert.equal(readyPackage.professional_approval_id, null);

  const deliverableDraft = await post("/deliverables/draft", { tenant_id: formwork.tenant_id, firm_id: formwork.id, project_id: projectOpen.project.id, relationship_id: handoff.relationship.id, title: "OP-H3 controlled Formwork delivery report", document_type: "FORMWORK_PRELIMINARY_REPORT", hash: `op-h3-deliverable-hash-${stamp}` }, h);
  const requiredEvidence = ["formwork_intake_completeness", "document_revision_consistency", "unit_consistency", "geometry_positive_value_check", "risk_classification_completeness", "approval_presence_before_issue", "manufacturer_source_provenance_presence", "calculation_input_schema_validity"];
  const evidence = await post("/evidence-bundles", { tenant_id: formwork.tenant_id, firm_id: formwork.id, project_id: projectOpen.project.id, subject_type: "Project", subject_id: projectOpen.project.id, input_refs: requiredEvidence, source_document_refs: [register.document.id, revision.revision.id], calculation_refs: [validCalc.id], qa_check_refs: [drawingReview.id, resolvedFinding.id], review_notes_ref: readyPackage.id }, h);

  const issueBeforeApproval = await request("/deliverables/issue", { method: "POST", headers: h, body: { tenant_id: formwork.tenant_id, firm_id: formwork.id, project_id: projectOpen.project.id, document_version_id: deliverableDraft.document_version.id, evidence_bundle_id: evidence.id, approval_id: "missing-approval", subject_version_or_hash: deliverableDraft.document_version.hash } });
  assert(issueBeforeApproval.response.status >= 400, "Deliverable issue must be blocked before valid human approval exists.");
  const aiReviewDenied = await request("/deliverables/review", { method: "POST", headers: h, body: { tenant_id: formwork.tenant_id, firm_id: formwork.id, project_id: projectOpen.project.id, document_version_id: deliverableDraft.document_version.id, evidence_bundle_id: evidence.id, actor: aiActor } });
  assert(aiReviewDenied.response.status >= 400, "AI worker must not grant deliverable review approval.");

  const humanReview = await post("/deliverables/review", { tenant_id: formwork.tenant_id, firm_id: formwork.id, project_id: projectOpen.project.id, document_version_id: deliverableDraft.document_version.id, evidence_bundle_id: evidence.id }, h);
  assert.equal(humanReview.approval.decision, "APPROVED");
  assert(humanReview.approval.authority_id, "Human approval must reference professional authority.");
  const issuedDeliverable = await post("/deliverables/issue", { tenant_id: formwork.tenant_id, firm_id: formwork.id, project_id: projectOpen.project.id, document_version_id: deliverableDraft.document_version.id, evidence_bundle_id: evidence.id, approval_id: humanReview.approval.id, subject_version_or_hash: deliverableDraft.document_version.hash }, h);
  assert.equal(issuedDeliverable.document_version.status, "ISSUED");

  const today = await get(`/operations/today?tenant_id=${formwork.tenant_id}&firm_id=${formwork.id}`, h);
  assert(today.counts.ready_delivery_packages >= 1, "Today view must show ready Formwork delivery package.");
  assert(today.counts.audit_events >= 1, "Today view must include audit count.");
  assert(today.rehearsal_checks.some((check) => check.key === "technical_delivery" && check.status === "PASS"), "Today rehearsal checks must pass technical delivery visibility.");

  const events = await get(`/event-log?tenant_id=${formwork.tenant_id}&firm_id=${formwork.id}`, h);
  const types = eventTypes(events);
  for (const eventType of ["front_desk.enquiry_captured", "proposal.accepted", "technical.drawing_revisions_checked", "technical.qa_finding_raised", "technical.delivery_package_blocked", "technical.qa_finding_resolved", "technical.delivery_package_ready_for_principal_review", "deliverable.review_approved", "deliverable.issued"]) {
    assert(types.has(eventType), `Missing Formwork pilot-day event: ${eventType}`);
  }
  const audit = await get(`/audit-events?tenant_id=${formwork.tenant_id}&firm_id=${formwork.id}`, h);
  assert(audit.length >= events.length, "Audit records should reconstruct material Formwork actions.");
  const exported = await get(`/data-protection/export-package?tenant_id=${formwork.tenant_id}&firm_id=${formwork.id}`, h);
  for (const key of ["clients", "projects", "documents", "document_versions", "evidence_bundles", "drawing_review_records", "technical_qa_findings", "delivery_package_records", "event_log", "audit_events"]) {
    assert(exported.counts[key] >= 1, `Formwork export missing ${key}.`);
  }
  assert.equal(exported.tenant_id, formwork.tenant_id, "Export tenant scope mismatch.");
  assert.equal(exported.firm_id, formwork.id, "Export firm scope mismatch.");

  const nhlHeaders = authHeaders(initialStore, nhl);
  const nhlTechnicalAttempt = await request("/technical/delivery-packages", { method: "POST", headers: nhlHeaders, body: { tenant_id: nhl.tenant_id, firm_id: nhl.id, project_id: projectOpen.project.id, drawing_revision_refs: [revision.revision.id], calculation_input_set_id: validCalc.id, evidence_refs: [drawingReview.id] } });
  assert(nhlTechnicalAttempt.response.status >= 400, "NHL must not access Formwork pilot technical delivery records.");

  console.log(JSON.stringify({
    smoke: "op-h3-formwork-pilot-day-rehearsal",
    result: "passed",
    firm: formwork.name,
    tenant: formworkSummary.tenant.name,
    fixture: "Formwork pilot-day fixture",
    scenario: ["client_enquiry_intake", "project_opened", "drawing_review", "qa_issue", "blocked_delivery_package", "human_professional_review", "controlled_issue", "audit_reconstruction", "firm_scoped_export"],
    denials: ["ai_qa_resolution_denied", "issue_before_approval_denied", "ai_deliverable_review_denied", "nhl_cross_firm_technical_access_denied"],
    evidence: { events: events.length, audit_events: audit.length, export_counts: exported.counts },
    next_active_sprint: "OP-H4 - NHL Global Solution Pilot Day Rehearsal"
  }, null, 2));
} finally {
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill();
  }
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await rm(tmp, { recursive: true, force: true });
}