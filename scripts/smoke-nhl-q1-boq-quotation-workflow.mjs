import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-nhl-q1-"));
const apiPort = 3131;
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
  assert.equal(code, 0, `NHL-Q1 seed failed.\nstdout:\n${seedOut}\nstderr:\n${seedErr}`);
  return JSON.parse(seedOut);
}

try {
  const design = await readFile("docs/10_post_freeze_technical_design/NHL_Q1_BOQ_QUOTATION_INTAKE_AND_ISSUE_WORKFLOW_COMPLETION_v1.0.md", "utf8");
  const sample = await readFile("docs/10_post_freeze_technical_design/NHL_BOQ_QUOTATION_WORKFLOW_SAMPLE_v1.0.md", "utf8");
  const app = await readFile("apps/web/public/app.js", "utf8");
  const server = await readFile("apps/api/src/server.mjs", "utf8");
  const store = await readFile("apps/api/src/store.mjs", "utf8");
  const pkg = JSON.parse(await readFile("package.json", "utf8"));

  for (const marker of ["BOQ image quotation request", "Register Quotation Case", "Quotation Case Register", "/quotation-cases/issue"]) {
    assert(app.includes(marker), `UI missing NHL-Q1 marker: ${marker}`);
  }
  for (const marker of ["createQuotationCaseRecord", "linkQuotationCaseProposalRecord", "approveQuotationCaseRecord", "issueQuotationCaseRecord"]) {
    assert(store.includes(marker), `Store missing NHL-Q1 marker: ${marker}`);
  }
  assert(server.includes("[\"quotation-cases\", \"quotation_cases\"]"), "Read collection for quotation cases missing.");
  assert(pkg.scripts["check:nhl:q1"] === "node scripts/smoke-nhl-q1-boq-quotation-workflow.mjs", "check:nhl:q1 package script missing.");
  assert(design.includes("NHL-Q1") && design.includes("no autonomous approval") && design.includes("submitted quotation evidence"), "NHL-Q1 completion doc missing required markers.");
  assert(sample.includes("NHL-Q1 — BOQ Quotation Intake and Issue Workflow"), "Sample workflow must recommend NHL-Q1.");

  start("api", ["apps/api/src/server.mjs"], { VFIRM_API_PORT: String(apiPort), VFIRM_STORE_PATH: storePath, DATABASE_URL: "", VFIRM_STORE_BACKEND: "json" });
  await waitForJson(`${apiBase}/health`);
  await seedPilotWorkspaces();

  const initialStore = await get("/mvp/store");
  const nhl = (initialStore.firms ?? []).find((firm) => firm.name === "NHL Global Solution");
  assert(nhl, "NHL Global Solution missing from seeded pilot workspaces.");
  const headers = authHeaders(initialStore, nhl);

  const enquiry = await post("/front-desk/enquiries", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    contact_name: "NHL-Q1 BOQ Client",
    organization_name: "NHL-Q1 Contractor Client",
    contact_email: "nhl-q1-client@example.com",
    enquiry_summary: "Client supplied BOQ images and requested price quotation.",
    requested_service_hint: "boq_image_quotation_support"
  }, headers);
  await post("/front-desk/enquiries/qualify", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    enquiry_id: enquiry.id,
    decision: "QUALIFIED",
    consent_or_legal_basis_ref: "NHL-Q1-CONSENT",
    conflict_check_status: "CLEARED",
    conflict_check_ref: "NHL-Q1-CONFLICT-CLEARED"
  }, headers);
  const handoff = await post("/front-desk/enquiries/handoff", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    enquiry_id: enquiry.id,
    provided_inputs: { requested_services: ["BOQ image quotation support"], evidence_count: 4 }
  }, headers);
  const intake = await post("/intake-sessions", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    relationship_id: handoff.relationship.id,
    provided_inputs: {
      project_name: "NHL-Q1 BOQ Quotation Case",
      client_organization: "NHL-Q1 Contractor Client",
      client_contact_name: "NHL-Q1 BOQ Client",
      client_contact_email: "nhl-q1-client@example.com",
      requested_services: ["quotation preparation", "technical writing", "clerical document control"],
      required_deliverables: ["priced quotation PDF"],
      deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      site_location: "Client supplied BOQ images",
      structure_type: "not_applicable_organization_support",
      formwork_element_type: "not_applicable_organization_support",
      height: 1,
      length_or_area: 1,
      concrete_grade: "not_applicable_organization_support",
      available_drawings: ["BOQ image set"]
    }
  }, headers);
  assert.equal(intake.intake.intake_status, "COMPLETE");

  const incomingRefs = [
    "local://nhl/quotation/in/IMG-20260819-WA0007.jpg",
    "local://nhl/quotation/in/IMG-20260819-WA0008.jpg",
    "local://nhl/quotation/in/IMG-20260819-WA0009.jpg",
    "local://nhl/quotation/in/IMG-20260819-WA0010.jpg"
  ];
  const docs = [];
  for (const [index, ref] of incomingRefs.entries()) {
    const result = await post("/administration/documents", {
      tenant_id: nhl.tenant_id,
      firm_id: nhl.id,
      relationship_id: handoff.relationship.id,
      document_number: `NHL-BOQ-IN-${String(index + 1).padStart(3, "0")}`,
      title: `Client BOQ image ${index + 1}`,
      document_type: "CLIENT_BOQ_IMAGE",
      classification: "CLIENT_CONFIDENTIAL",
      revision: "0",
      storage_ref: ref,
      content_hash: `sample-local-hash-${index + 1}`
    }, headers);
    docs.push(result.document);
  }

  const caseRecord = await post("/quotation-cases", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    relationship_id: handoff.relationship.id,
    intake_session_id: intake.intake.id,
    case_number: "NHL-QT-2026-0001",
    title: "BOQ image quotation request",
    quotation_type: "BOQ_IMAGE_QUOTATION",
    service_lines: ["project_reporting", "technical_writing", "clerical_work", "bizkick_edcs"],
    client_request_summary: "Client supplied BOQ images and requested NHL Global Solution to quote the price.",
    intake_evidence_refs: incomingRefs,
    document_register_entry_ids: docs.map((doc) => doc.id),
    metadata: { sample_ref: "NHL-QT-2026-0001", raw_files_committed: false }
  }, headers);
  assert.equal(caseRecord.status, "INTAKE_REGISTERED");
  assert.equal(caseRecord.intake_evidence_refs.length, 4);

  const proposal = await post("/proposals", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    relationship_id: handoff.relationship.id,
    intake_session_id: intake.intake.id,
    scope_summary: "Prepare price quotation from client BOQ image set with technical writing and clerical document-control support.",
    final_price: 3500
  }, headers);
  const linked = await post("/quotation-cases/link-proposal", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    quotation_case_id: caseRecord.id,
    proposal_id: proposal.proposal.id
  }, headers);
  assert.equal(linked.status, "PROPOSAL_DRAFTED");

  const issueDenied = await request("/quotation-cases/issue", {
    method: "POST",
    headers,
    body: {
      tenant_id: nhl.tenant_id,
      firm_id: nhl.id,
      quotation_case_id: caseRecord.id,
      issued_document_ref: "local://nhl/quotation/Submit/NHL-QT-2026-0001.pdf",
      submitted_evidence_ref: "evidence://nhl/NHL-QT-2026-0001/submitted-pdf"
    }
  });
  assert(issueDenied.response.status >= 400, "Quotation issue must be denied before approval.");

  const approvedProposal = await post("/proposals/approve", { tenant_id: nhl.tenant_id, firm_id: nhl.id, proposal_id: proposal.proposal.id }, headers);
  assert.equal(approvedProposal.proposal.proposal_status, "APPROVED");
  const approvedCase = await post("/quotation-cases/approve", { tenant_id: nhl.tenant_id, firm_id: nhl.id, quotation_case_id: caseRecord.id }, headers);
  assert.equal(approvedCase.status, "APPROVAL_RECORDED");
  assert(approvedCase.approval_id, "Quotation case approval should link commercial approval.");

  const issuedCase = await post("/quotation-cases/issue", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    quotation_case_id: caseRecord.id,
    issued_document_ref: "local://nhl/quotation/Submit/NHL-QT-2026-0001.pdf",
    submitted_evidence_ref: "evidence://nhl/NHL-QT-2026-0001/submitted-pdf"
  }, headers);
  assert.equal(issuedCase.status, "ISSUED_TO_CLIENT");

  const finalStore = await get("/mvp/store");
  const scopedCases = finalStore.quotation_cases.filter((item) => item.tenant_id === nhl.tenant_id && item.firm_id === nhl.id);
  assert.equal(scopedCases.length, 1);
  const events = new Set(finalStore.event_log.filter((event) => event.tenant_id === nhl.tenant_id && event.firm_id === nhl.id).map((event) => event.event_type));
  for (const eventType of ["quotation_case.intake_registered", "quotation_case.proposal_linked", "quotation_case.approval_recorded", "quotation_case.issued_to_client"]) {
    assert(events.has(eventType), `Missing quotation audit event: ${eventType}`);
  }
  const exported = await get(`/data-protection/export-manifest?tenant_id=${nhl.tenant_id}&firm_id=${nhl.id}`, headers);
  assert(exported.integrity.audit_trail_included, "Export manifest must include audit trail.");

  console.log(JSON.stringify({
    sprint: "NHL-Q1",
    status: "PASS",
    checks: [
      "boq_image_evidence_registered",
      "quotation_case_created",
      "proposal_linked",
      "premature_issue_denied",
      "human_approval_required",
      "submitted_pdf_evidence_registered",
      "audit_reconstruction",
      "tenant_export_manifest"
    ],
    quotation_case: issuedCase.case_number,
    final_status: issuedCase.status
  }, null, 2));
} finally {
  for (const child of children) child.kill();
  await rm(tmp, { recursive: true, force: true });
}
