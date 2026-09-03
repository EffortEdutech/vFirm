import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-nhl-q5-"));
const apiPort = 3135;
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
  assert.equal(code, 0, `NHL-Q5 seed failed.\nstdout:\n${seedOut}\nstderr:\n${seedErr}`);
}

function hasException(summary, key) {
  return (summary.exceptions ?? []).some((item) => item.key === key);
}

try {
  const app = await readFile("apps/web/public/app.js", "utf8");
  const server = await readFile("apps/api/src/server.mjs", "utf8");
  const plan = await readFile("docs/10_post_freeze_technical_design/NHL_Q_SERIES_FULL_SPRINT_PLAN_AND_CHECKLIST_v1.0.md", "utf8");
  const pkg = JSON.parse(await readFile("package.json", "utf8"));

  for (const marker of ["quotation_operations_summary", "/quotation-operations-summary", "NHL-Q5 Quotation Operations", "Quotation Operations Today", "nhl-q5-quotation-operations", "issue_ready", "issued_without_receivable_preparation"]) {
    assert(app.includes(marker) || server.includes(marker) || plan.includes(marker), `Missing NHL-Q5 marker: ${marker}`);
  }
  assert.equal(pkg.scripts["check:nhl:q5"], "node scripts/smoke-nhl-q5-quotation-operations-dashboard.mjs", "check:nhl:q5 package script missing.");

  start("api", ["apps/api/src/server.mjs"], { VFIRM_API_PORT: String(apiPort), VFIRM_STORE_PATH: storePath, DATABASE_URL: "", VFIRM_STORE_BACKEND: "json" });
  await waitForJson(`${apiBase}/health`);
  await seedPilotWorkspaces();
  const initial = await get("/mvp/store");
  const nhl = initial.firms.find((firm) => firm.name === "NHL Global Solution");
  assert(nhl, "NHL Global Solution must exist after seed.");
  const headers = authHeaders(initial, nhl);

  let summary = await get("/quotation-operations-summary", headers);
  assert.equal(summary.status, "NO_QUOTATION_ACTIVITY");
  assert(summary.boundaries.includes("no_live_payment_movement"), "Q5 summary must retain payment boundary.");

  const client = await post("/clients", { tenant_id: nhl.tenant_id, firm_id: nhl.id, name: "NHL-Q5 Operations Client" }, headers);
  await post("/quotation-cases", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    relationship_id: client.relationship.id,
    case_number: "NHL-QT-2026-0005-MISSING-DOC",
    title: "Missing document exception",
    quotation_type: "BOQ_IMAGE_QUOTATION",
    service_lines: ["technical_writing", "clerical_work"],
    client_request_summary: "Case intentionally missing source document records for Q5 exception rehearsal.",
    intake_evidence_refs: []
  }, headers);
  summary = await get("/quotation-operations-summary", headers);
  assert.equal(summary.status, "OPERATOR_ATTENTION_REQUIRED");
  assert(hasException(summary, "source_documents_missing"), "Q5 summary should surface missing source documents.");

  const registered = await post("/administration/documents", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    relationship_id: client.relationship.id,
    document_number: "NHL-Q5-BOQ-IN-001",
    title: "NHL-Q5 client BOQ source",
    document_type: "CLIENT_BOQ_IMAGE",
    classification: "CLIENT_CONFIDENTIAL",
    revision: "0",
    storage_ref: "local://nhl/quotation/in/NHL-Q5.jpg",
    content_hash: "nhl-q5-local-evidence-1"
  }, headers);
  const quotationCase = await post("/quotation-cases", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    relationship_id: client.relationship.id,
    case_number: "NHL-QT-2026-0005",
    title: "Quotation operations dashboard rehearsal",
    quotation_type: "BOQ_IMAGE_QUOTATION",
    service_lines: ["project_reporting", "technical_writing", "clerical_work", "bizkick_edcs"],
    client_request_summary: "Client BOQ needs operations dashboard tracking.",
    intake_evidence_refs: [`document://${registered.document.document_number}`],
    document_register_entry_ids: [registered.document.id]
  }, headers);
  const aid = await post("/boq-extraction-aids", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    quotation_case_id: quotationCase.id,
    extracted_items: [{ item_ref: "BOQ-001", description: "Q5 reviewed quotation line", quantity: "10", unit: "item", review_flag: "HUMAN_VERIFY_RATE" }]
  }, headers);
  summary = await get("/quotation-operations-summary", headers);
  assert(hasException(summary, "boq_extraction_review_pending"), "Q5 summary should surface BOQ extraction review queue.");

  await post("/boq-extraction-aids/review", { tenant_id: nhl.tenant_id, firm_id: nhl.id, boq_extraction_aid_id: aid.id, review_decision: "ACCEPT_FOR_QUOTATION_SUPPORT", review_notes: "Human reviewed Q5 BOQ aid." }, headers);
  const draftPack = await post("/quotation-draft-packs", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    quotation_case_id: quotationCase.id,
    boq_extraction_aid_id: aid.id,
    line_items: [{ item_ref: "BOQ-001", description: "Q5 quotation line", quantity: "10", unit: "item", rate: "TBC_BY_HUMAN", amount: "TBC_BY_HUMAN" }],
    commercial_summary: "Draft quotation amount pending human confirmation."
  }, headers);
  summary = await get("/quotation-operations-summary", headers);
  assert(hasException(summary, "quotation_draft_review_pending"), "Q5 summary should surface draft review queue.");

  await post("/quotation-draft-packs/review", { tenant_id: nhl.tenant_id, firm_id: nhl.id, quotation_draft_pack_id: draftPack.id, review_decision: "ACCEPT_FOR_CLIENT_CORRESPONDENCE_DRAFT", review_notes: "Human reviewed Q5 draft." }, headers);
  await post("/quotation-draft-packs/client-correspondence", { tenant_id: nhl.tenant_id, firm_id: nhl.id, quotation_draft_pack_id: draftPack.id, correspondent: "Client Representative", subject: "Q5 quotation ready for controlled issue" }, headers);
  summary = await get("/quotation-operations-summary", headers);
  assert(hasException(summary, "quotation_issue_ready"), "Q5 summary should surface issue-ready quotation.");
  assert(summary.counts.issue_ready >= 1, "Issue-ready count should be visible.");

  const issueResult = await post("/quotation-draft-packs/issue", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    quotation_draft_pack_id: draftPack.id,
    issued_document_ref: "local://nhl/quotation/Submit/NHL-QT-2026-0005.pdf",
    submitted_evidence_ref: "evidence://nhl/NHL-QT-2026-0005/issued-pdf",
    issued_to: "Client Representative",
    amount_summary: "Human-issued quotation amount pending client acceptance."
  }, headers);
  summary = await get("/quotation-operations-summary", headers);
  assert(hasException(summary, "issued_without_receivable_preparation"), "Q5 summary should surface issued quotation without receivable prep.");

  await post("/quotation-receivable-preparations", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    quotation_issue_record_id: issueResult.quotation_issue_record.id,
    amount_summary: "Prepare invoice readiness after acceptance confirmation.",
    invoice_draft_ref: "draft://nhl/invoice/NHL-Q5-TBC"
  }, headers);
  summary = await get("/quotation-operations-summary", headers);
  assert(hasException(summary, "receivable_review_required"), "Q5 summary should surface receivable review queue.");
  assert.equal(summary.counts.receivable_preparations >= 1, true, "Receivable preparation count should be visible.");
  assert.equal(summary.boundaries.includes("human_controlled_quotation_issue"), true, "Q5 summary must retain human issue boundary.");
  assert.equal(summary.boundaries.includes("tenant_scoped_audit_export"), true, "Q5 summary must retain audit/export boundary.");

  console.log(JSON.stringify({
    sprint: "NHL-Q5",
    status: "PASS",
    checks: [
      "quotation_operations_summary_endpoint",
      "dashboard_ui_markers",
      "missing_source_document_exception",
      "boq_extraction_review_exception",
      "quotation_draft_review_exception",
      "issue_ready_exception",
      "issued_without_receivable_exception",
      "receivable_review_exception",
      "authority_and_payment_boundaries_retained"
    ],
    final_status: summary.status,
    counts: summary.counts,
    exception_keys: summary.exceptions.map((item) => item.key)
  }, null, 2));
} finally {
  for (const child of children) child.kill();
  await rm(tmp, { recursive: true, force: true });
}
