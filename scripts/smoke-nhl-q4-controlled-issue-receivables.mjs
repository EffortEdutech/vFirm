import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-nhl-q4-"));
const apiPort = 3134;
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
  return {
    "x-vfirm-actor-id": actor.id,
    "x-vfirm-tenant-id": firm.tenant_id,
    "x-vfirm-firm-id": firm.id,
    "x-vfirm-role": "principal"
  };
}

async function seedPilotWorkspaces() {
  const seed = spawn(process.execPath, ["scripts/seed-multi-tenant-pilot-workspaces-local.mjs"], { cwd: root, env: { ...process.env, VFIRM_API_BASE: apiBase }, stdio: ["ignore", "pipe", "pipe"] });
  let seedOut = "";
  let seedErr = "";
  seed.stdout.on("data", (chunk) => { seedOut += chunk.toString(); });
  seed.stderr.on("data", (chunk) => { seedErr += chunk.toString(); });
  const [code] = await once(seed, "exit");
  assert.equal(code, 0, `NHL-Q4 seed failed.\nstdout:\n${seedOut}\nstderr:\n${seedErr}`);
}

async function prepareReviewedDraftWithoutCorrespondence(nhl, headers, suffix) {
  const client = await post("/clients", { tenant_id: nhl.tenant_id, firm_id: nhl.id, name: `NHL-Q4 Client ${suffix}` }, headers);
  const registered = await post("/administration/documents", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    relationship_id: client.relationship.id,
    document_number: `NHL-Q4-BOQ-IN-${suffix}`,
    title: `NHL-Q4 client BOQ source ${suffix}`,
    document_type: "CLIENT_BOQ_IMAGE",
    classification: "CLIENT_CONFIDENTIAL",
    revision: "0",
    storage_ref: `local://nhl/quotation/in/NHL-Q4-${suffix}.jpg`,
    content_hash: `nhl-q4-local-evidence-${suffix}`
  }, headers);
  const quotationCase = await post("/quotation-cases", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    relationship_id: client.relationship.id,
    case_number: `NHL-QT-2026-${suffix}`,
    title: `Controlled quotation issue ${suffix}`,
    quotation_type: "BOQ_IMAGE_QUOTATION",
    service_lines: ["project_reporting", "technical_writing", "clerical_work", "bizkick_edcs"],
    client_request_summary: "Client BOQ needs controlled quotation issue and receivable preparation.",
    intake_evidence_refs: [`document://${registered.document.document_number}`],
    document_register_entry_ids: [registered.document.id]
  }, headers);
  const aid = await post("/boq-extraction-aids", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    quotation_case_id: quotationCase.id,
    extracted_items: [{ item_ref: "BOQ-001", description: "Reviewed quotation line", quantity: "10", unit: "item", review_flag: "HUMAN_VERIFY_RATE" }]
  }, headers);
  await post("/boq-extraction-aids/review", { tenant_id: nhl.tenant_id, firm_id: nhl.id, boq_extraction_aid_id: aid.id, review_decision: "ACCEPT_FOR_QUOTATION_SUPPORT", review_notes: "Human reviewed BOQ aid." }, headers);
  const draftPack = await post("/quotation-draft-packs", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    quotation_case_id: quotationCase.id,
    boq_extraction_aid_id: aid.id,
    line_items: [{ item_ref: "BOQ-001", description: "Reviewed quotation line", quantity: "10", unit: "item", rate: "TBC_BY_HUMAN", amount: "TBC_BY_HUMAN" }],
    commercial_summary: "Draft quotation amount pending human commercial confirmation."
  }, headers);
  const reviewedDraft = await post("/quotation-draft-packs/review", { tenant_id: nhl.tenant_id, firm_id: nhl.id, quotation_draft_pack_id: draftPack.id, review_decision: "ACCEPT_FOR_CLIENT_CORRESPONDENCE_DRAFT", review_notes: "Human principal reviewed Q4 draft pack." }, headers);
  return { quotationCase, draftPack: reviewedDraft };
}

try {
  const app = await readFile("apps/web/public/app.js", "utf8");
  const server = await readFile("apps/api/src/server.mjs", "utf8");
  const store = await readFile("apps/api/src/store.mjs", "utf8");
  const plan = await readFile("docs/10_post_freeze_technical_design/NHL_Q_SERIES_FULL_SPRINT_PLAN_AND_CHECKLIST_v1.0.md", "utf8");
  const pkg = JSON.parse(await readFile("package.json", "utf8"));

  for (const marker of ["NHL-Q4", "quotation_issue_records", "quotation_receivable_preparations", "Controlled Quotation Issue", "Receivables Preparation Register", "/quotation-draft-packs/issue", "/quotation-receivable-preparations"]) {
    assert(app.includes(marker) || server.includes(marker) || store.includes(marker) || plan.includes(marker), `Missing NHL-Q4 marker: ${marker}`);
  }
  assert.equal(pkg.scripts["check:nhl:q4"], "node scripts/smoke-nhl-q4-controlled-issue-receivables.mjs", "check:nhl:q4 package script missing.");

  start("api", ["apps/api/src/server.mjs"], { VFIRM_API_PORT: String(apiPort), VFIRM_STORE_PATH: storePath, DATABASE_URL: "", VFIRM_STORE_BACKEND: "json" });
  await waitForJson(`${apiBase}/health`);
  await seedPilotWorkspaces();
  const initial = await get("/mvp/store");
  const formwork = initial.firms.find((firm) => firm.name === "Amanah Formwork Pilot Firm");
  const nhl = initial.firms.find((firm) => firm.name === "NHL Global Solution");
  assert(formwork, "Active workspace dropdown data must include Amanah Formwork Pilot Firm after seed.");
  assert(nhl, "Active workspace dropdown data must include NHL Global Solution after seed.");
  const headers = authHeaders(initial, nhl);

  const { draftPack: reviewedWithoutCorrespondence } = await prepareReviewedDraftWithoutCorrespondence(nhl, headers, "0004A");
  const missingCorrespondenceDenied = await request("/quotation-draft-packs/issue", {
    method: "POST",
    headers,
    body: { tenant_id: nhl.tenant_id, firm_id: nhl.id, quotation_draft_pack_id: reviewedWithoutCorrespondence.id, issued_document_ref: "local://nhl/quotation/Submit/NHL-QT-2026-0004A.pdf", submitted_evidence_ref: "evidence://nhl/NHL-QT-2026-0004A/issued-pdf" }
  });
  assert(missingCorrespondenceDenied.response.status >= 400, "Controlled issue must require prepared correspondence.");

  const { quotationCase, draftPack } = await prepareReviewedDraftWithoutCorrespondence(nhl, headers, "0004");
  const correspondenceResult = await post("/quotation-draft-packs/client-correspondence", { tenant_id: nhl.tenant_id, firm_id: nhl.id, quotation_draft_pack_id: draftPack.id, correspondent: "Client Representative", subject: "Quotation ready for issue" }, headers);
  assert.equal(correspondenceResult.correspondence.status, "DRAFT_REVIEW_REQUIRED");

  const aiIssueDenied = await request("/quotation-draft-packs/issue", {
    method: "POST",
    body: {
      tenant_id: nhl.tenant_id,
      firm_id: nhl.id,
      quotation_draft_pack_id: draftPack.id,
      issued_document_ref: "local://nhl/quotation/Submit/NHL-QT-2026-0004.pdf",
      submitted_evidence_ref: "evidence://nhl/NHL-QT-2026-0004/issued-pdf",
      actor: { actor_id: "ai-worker", actor_type: "AI_WORKER", tenant_id: nhl.tenant_id, firm_id: nhl.id, role: "marketing-sales-coordinator" }
    }
  });
  assert(aiIssueDenied.response.status >= 400, "AI worker must not record controlled quotation issue.");

  const issueResult = await post("/quotation-draft-packs/issue", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    quotation_draft_pack_id: draftPack.id,
    issued_document_ref: "local://nhl/quotation/Submit/NHL-QT-2026-0004.pdf",
    submitted_evidence_ref: "evidence://nhl/NHL-QT-2026-0004/issued-pdf",
    issued_to: "Client Representative",
    amount_summary: "Human-issued quotation amount pending client acceptance."
  }, headers);
  assert.equal(issueResult.quotation_issue_record.issue_status, "ISSUED_TO_CLIENT_BY_HUMAN");
  assert.equal(issueResult.quotation_issue_record.payment_action_taken, false);
  assert.equal(issueResult.quotation_issue_record.ai_issued, false);
  assert.equal(issueResult.quotation_draft_pack.draft_status, "ISSUED_TO_CLIENT_BY_HUMAN");
  assert.equal(issueResult.quotation_case.status, "ISSUED_TO_CLIENT");
  assert.equal(issueResult.correspondence.status, "ISSUED_BY_HUMAN");

  const duplicateIssueDenied = await request("/quotation-draft-packs/issue", {
    method: "POST",
    headers,
    body: { tenant_id: nhl.tenant_id, firm_id: nhl.id, quotation_draft_pack_id: draftPack.id, issued_document_ref: "local://duplicate.pdf", submitted_evidence_ref: "evidence://duplicate" }
  });
  assert(duplicateIssueDenied.response.status >= 400, "Controlled issue must not be duplicated.");

  const receivablePrep = await post("/quotation-receivable-preparations", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    quotation_issue_record_id: issueResult.quotation_issue_record.id,
    amount_summary: "Prepare invoice draft after client acceptance confirmation.",
    invoice_draft_ref: "draft://nhl/invoice/NHL-INV-2026-TBC"
  }, headers);
  assert.equal(receivablePrep.receivable_status, "RECEIVABLE_PREPARED_REVIEW_REQUIRED");
  assert.equal(receivablePrep.payment_boundary, "NO_LIVE_PAYMENT_MOVEMENT");
  assert.equal(receivablePrep.payment_action_taken, false);
  assert.equal(receivablePrep.bank_instruction_ref, null);

  const duplicateReceivableDenied = await request("/quotation-receivable-preparations", {
    method: "POST",
    headers,
    body: { tenant_id: nhl.tenant_id, firm_id: nhl.id, quotation_issue_record_id: issueResult.quotation_issue_record.id }
  });
  assert(duplicateReceivableDenied.response.status >= 400, "Receivable preparation must not be duplicated for one quotation issue.");

  const finalStore = await get("/mvp/store");
  const events = new Set(finalStore.event_log.filter((event) => event.tenant_id === nhl.tenant_id && event.firm_id === nhl.id).map((event) => event.event_type));
  for (const eventType of ["quotation_issue.controlled_issue_recorded", "quotation_receivable.prepared"]) assert(events.has(eventType), `Missing ${eventType} audit event.`);
  const issues = await get("/quotation-issue-records", headers);
  const receivables = await get("/quotation-receivable-preparations", headers);
  assert(issues.some((item) => item.id === issueResult.quotation_issue_record.id), "Read collection should return quotation issue record.");
  assert(receivables.some((item) => item.id === receivablePrep.id), "Read collection should return receivable preparation record.");
  const exportPackage = await get(`/data-protection/export-package?tenant_id=${nhl.tenant_id}&firm_id=${nhl.id}`, headers);
  assert(exportPackage.counts.quotation_issue_records >= 1, "Tenant export must include quotation issue records.");
  assert(exportPackage.counts.quotation_receivable_preparations >= 1, "Tenant export must include quotation receivable preparations.");
  assert.equal(exportPackage.records.quotation_receivable_preparations.some((item) => item.payment_boundary === "NO_LIVE_PAYMENT_MOVEMENT" && item.payment_action_taken === false), true, "Export package must retain no-live-payment boundary inside Q4 receivable records.");
  assert(quotationCase.id, "Quotation case prepared for audit reconstruction.");

  console.log(JSON.stringify({
    sprint: "NHL-Q4",
    status: "PASS",
    checks: [
      "active_workspace_seed_contains_formwork_and_nhl",
      "issue_without_correspondence_denied",
      "ai_controlled_issue_denied",
      "human_controlled_issue_recorded",
      "quotation_case_and_correspondence_transitioned",
      "receivable_preparation_without_payment_action",
      "duplicate_issue_and_receivable_denied",
      "audit_events_recorded",
      "tenant_export_contains_q4_records"
    ],
    quotation_issue_status: issueResult.quotation_issue_record.issue_status,
    receivable_status: receivablePrep.receivable_status
  }, null, 2));
} finally {
  for (const child of children) child.kill();
  await rm(tmp, { recursive: true, force: true });
}
