import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-nhl-q6-"));
const apiPort = 3136;
const apiBase = `http://127.0.0.1:${apiPort}`;
const storePath = join(tmp, "store.json");
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
      if (response.ok && json.ok !== false) return { response, json };
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
  return { "x-vfirm-actor-id": actor.id, "x-vfirm-tenant-id": firm.tenant_id, "x-vfirm-firm-id": firm.id, "x-vfirm-role": "principal" };
}

async function seedPilotWorkspaces() {
  const seed = spawn(process.execPath, ["scripts/seed-multi-tenant-pilot-workspaces-local.mjs"], { cwd: root, env: { ...process.env, VFIRM_API_BASE: apiBase }, stdio: ["ignore", "pipe", "pipe"] });
  let seedOut = "";
  let seedErr = "";
  seed.stdout.on("data", (chunk) => { seedOut += chunk.toString(); });
  seed.stderr.on("data", (chunk) => { seedErr += chunk.toString(); });
  const [code] = await once(seed, "exit");
  assert.equal(code, 0, `NHL-Q6 seed failed.\nstdout:\n${seedOut}\nstderr:\n${seedErr}`);
}

function hasException(summary, key) {
  return (summary.exceptions ?? []).some((item) => item.key === key);
}

try {
  const plan = await readFile("docs/10_post_freeze_technical_design/NHL_Q_SERIES_FULL_SPRINT_PLAN_AND_CHECKLIST_v1.0.md", "utf8");
  const evidencePack = await readFile("docs/10_post_freeze_technical_design/NHL_Q6_QUOTATION_EVIDENCE_PACK_AND_ACCEPTANCE_GATE_v1.0.md", "utf8");
  const decisionGate = await readFile("docs/10_post_freeze_technical_design/NHL_Q_WORKFLOW_ACCEPTANCE_DECISION_GATE_v1.0.md", "utf8");
  const decisions = await readFile("docs/00_project_control/DECISION_REGISTER.md", "utf8");
  const pkg = JSON.parse(await readFile("package.json", "utf8"));

  for (const marker of ["NHL-Q1", "NHL-Q2", "NHL-Q3", "NHL-Q4", "NHL-Q5", "NHL-Q6", "GO_FOR_PRODUCT_OWNER_ACCEPTANCE_REVIEW", "No silent acceptance", "no live payment movement"]) {
    assert(evidencePack.includes(marker) || decisionGate.includes(marker) || plan.includes(marker), `Missing NHL-Q6 evidence marker: ${marker}`);
  }
  for (const marker of ["ACCEPT_NHL_Q_CONTROLLED_LOCAL_PRIVATE_PILOT", "ACCEPT_NHL_Q_WITH_LIMITATIONS", "HOLD_NHL_Q_ACCEPTANCE", "REJECT_NHL_Q_ACCEPTANCE"]) {
    assert(decisionGate.includes(marker), `Missing NHL-Q acceptance decision option: ${marker}`);
  }
  assert(decisions.includes("ADR-069 - NHL-Q6 quotation evidence pack and acceptance gate completed"), "ADR-069 missing from decision register.");
  assert.equal(pkg.scripts["check:nhl:q6"], "node scripts/smoke-nhl-q6-quotation-evidence-acceptance-gate.mjs", "check:nhl:q6 package script missing.");
  assert(pkg.scripts.check.includes("smoke-nhl-q6-quotation-evidence-acceptance-gate.mjs"), "Full check chain must include NHL-Q6 smoke.");

  start("api", ["apps/api/src/server.mjs"], { VFIRM_API_PORT: String(apiPort), VFIRM_STORE_PATH: storePath, DATABASE_URL: "", VFIRM_STORE_BACKEND: "json" });
  await waitForJson(`${apiBase}/health`);
  await seedPilotWorkspaces();

  const initial = await get("/mvp/store");
  const formwork = initial.firms.find((firm) => firm.name === "Amanah Formwork Pilot Firm");
  const nhl = initial.firms.find((firm) => firm.name === "NHL Global Solution");
  assert(formwork, "Amanah Formwork Pilot Firm must remain available.");
  assert(nhl, "NHL Global Solution must remain available.");
  const headers = authHeaders(initial, nhl);

  const client = await post("/clients", { tenant_id: nhl.tenant_id, firm_id: nhl.id, name: "NHL-Q6 Acceptance Client" }, headers);
  const source = await post("/administration/documents", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    relationship_id: client.relationship.id,
    document_number: "NHL-Q6-BOQ-IN-001",
    title: "NHL-Q6 client BOQ source",
    document_type: "CLIENT_BOQ_IMAGE",
    classification: "CLIENT_CONFIDENTIAL",
    revision: "0",
    storage_ref: "local://nhl/quotation/in/NHL-Q6.jpg",
    content_hash: "nhl-q6-local-evidence-1"
  }, headers);
  const quotationCase = await post("/quotation-cases", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    relationship_id: client.relationship.id,
    case_number: "NHL-QT-2026-0006",
    title: "NHL quotation workflow acceptance rehearsal",
    quotation_type: "BOQ_IMAGE_QUOTATION",
    service_lines: ["project_reporting", "technical_writing", "clerical_work", "bizkick_edcs"],
    client_request_summary: "Client BOQ needs controlled quotation, evidence, issue record, and receivable preparation.",
    intake_evidence_refs: [`document://${source.document.document_number}`],
    document_register_entry_ids: [source.document.id]
  }, headers);
  const aid = await post("/boq-extraction-aids", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    quotation_case_id: quotationCase.id,
    extracted_items: [{ item_ref: "BOQ-001", description: "Q6 quotation line", quantity: "12", unit: "item", review_flag: "HUMAN_VERIFY_RATE" }]
  }, headers);
  await post("/boq-extraction-aids/review", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    boq_extraction_aid_id: aid.id,
    review_decision: "ACCEPT_FOR_QUOTATION_SUPPORT",
    review_notes: "Human reviewed Q6 BOQ extraction aid."
  }, headers);
  const draftPack = await post("/quotation-draft-packs", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    quotation_case_id: quotationCase.id,
    boq_extraction_aid_id: aid.id,
    line_items: [{ item_ref: "BOQ-001", description: "Q6 quotation line", quantity: "12", unit: "item", rate: "TBC_BY_HUMAN", amount: "TBC_BY_HUMAN" }],
    commercial_summary: "Draft quotation amount pending human commercial confirmation."
  }, headers);
  await post("/quotation-draft-packs/review", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    quotation_draft_pack_id: draftPack.id,
    review_decision: "ACCEPT_FOR_CLIENT_CORRESPONDENCE_DRAFT",
    review_notes: "Human principal reviewed Q6 quotation draft pack."
  }, headers);
  await post("/quotation-draft-packs/client-correspondence", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    quotation_draft_pack_id: draftPack.id,
    correspondent: "Client Representative",
    subject: "Q6 quotation ready for controlled issue"
  }, headers);
  const aiIssueDenied = await request("/quotation-draft-packs/issue", {
    method: "POST",
    body: {
      tenant_id: nhl.tenant_id,
      firm_id: nhl.id,
      quotation_draft_pack_id: draftPack.id,
      issued_document_ref: "local://nhl/quotation/Submit/NHL-QT-2026-0006.pdf",
      submitted_evidence_ref: "evidence://nhl/NHL-QT-2026-0006/issued-pdf",
      actor: { actor_id: "ai-worker", actor_type: "AI_WORKER", tenant_id: nhl.tenant_id, firm_id: nhl.id, role: "marketing-sales-coordinator" }
    }
  });
  assert(aiIssueDenied.response.status >= 400, "AI worker must not issue client quotation.");

  const issueResult = await post("/quotation-draft-packs/issue", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    quotation_draft_pack_id: draftPack.id,
    issued_document_ref: "local://nhl/quotation/Submit/NHL-QT-2026-0006.pdf",
    submitted_evidence_ref: "evidence://nhl/NHL-QT-2026-0006/issued-pdf",
    issued_to: "Client Representative",
    amount_summary: "Human-issued quotation amount pending client acceptance."
  }, headers);
  const receivablePrep = await post("/quotation-receivable-preparations", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    quotation_issue_record_id: issueResult.quotation_issue_record.id,
    amount_summary: "Prepare invoice draft after client acceptance confirmation.",
    invoice_draft_ref: "draft://nhl/invoice/NHL-INV-2026-Q6-TBC"
  }, headers);
  assert.equal(receivablePrep.payment_boundary, "NO_LIVE_PAYMENT_MOVEMENT");
  assert.equal(receivablePrep.payment_action_taken, false);

  const summary = await get("/quotation-operations-summary", headers);
  assert(summary.boundaries.includes("no_live_payment_movement"), "Q6 summary must preserve payment boundary.");
  assert(summary.boundaries.includes("human_controlled_quotation_issue"), "Q6 summary must preserve human issue boundary.");
  assert(hasException(summary, "receivable_review_required"), "Q6 summary should surface receivable review queue.");

  const finalStore = await get("/mvp/store");
  const eventTypes = new Set(finalStore.event_log.filter((event) => event.tenant_id === nhl.tenant_id && event.firm_id === nhl.id).map((event) => event.event_type));
  for (const eventType of ["quotation_case.intake_registered", "boq_extraction_aid.prepared", "boq_extraction_aid.human_reviewed", "quotation_draft_pack.prepared", "quotation_draft_pack.human_reviewed", "quotation_draft_pack.client_correspondence_prepared", "quotation_issue.controlled_issue_recorded", "quotation_receivable.prepared"]) {
    assert(eventTypes.has(eventType), `Missing audit/event reconstruction marker: ${eventType}`);
  }

  const exportPackage = await get(`/data-protection/export-package?tenant_id=${nhl.tenant_id}&firm_id=${nhl.id}`, headers);
  for (const key of ["clients", "document_register_entries", "quotation_cases", "boq_extraction_aids", "quotation_draft_packs", "quotation_issue_records", "quotation_receivable_preparations", "event_log", "audit_events"]) {
    assert(exportPackage.counts[key] >= 1, `NHL-Q6 export missing ${key}.`);
  }
  assert.equal(exportPackage.tenant_id, nhl.tenant_id, "NHL-Q6 export tenant scope mismatch.");
  assert.equal(exportPackage.firm_id, nhl.id, "NHL-Q6 export firm scope mismatch.");
  assert(exportPackage.integrity.audit_trail_included, "NHL-Q6 export must include audit trail.");
  assert(exportPackage.integrity.secrets_excluded, "NHL-Q6 export must exclude secrets.");

  console.log(JSON.stringify({
    sprint: "NHL-Q6",
    status: "PASS",
    recommendation: "GO_FOR_PRODUCT_OWNER_ACCEPTANCE_REVIEW",
    decision_gate: "PENDING_PRODUCT_OWNER_DECISION",
    checks: [
      "q1_to_q6_evidence_pack_markers",
      "acceptance_decision_options_present",
      "active_workspace_seed_contains_formwork_and_nhl",
      "full_quotation_workflow_reconstructed",
      "ai_quotation_issue_denied",
      "human_issue_and_receivable_preparation_recorded",
      "quotation_operations_summary_boundary_checked",
      "audit_event_reconstruction_checked",
      "tenant_firm_scoped_export_checked",
      "no_silent_acceptance_preserved"
    ],
    final_status: summary.status,
    export_counts: {
      quotation_cases: exportPackage.counts.quotation_cases,
      boq_extraction_aids: exportPackage.counts.boq_extraction_aids,
      quotation_draft_packs: exportPackage.counts.quotation_draft_packs,
      quotation_issue_records: exportPackage.counts.quotation_issue_records,
      quotation_receivable_preparations: exportPackage.counts.quotation_receivable_preparations,
      event_log: exportPackage.counts.event_log,
      audit_events: exportPackage.counts.audit_events
    }
  }, null, 2));
} finally {
  for (const child of children) child.kill();
  await rm(tmp, { recursive: true, force: true });
}
