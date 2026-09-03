import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-nhl-q3-"));
const apiPort = 3133;
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
  assert.equal(code, 0, `NHL-Q3 seed failed.\nstdout:\n${seedOut}\nstderr:\n${seedErr}`);
}

try {
  const app = await readFile("apps/web/public/app.js", "utf8");
  const server = await readFile("apps/api/src/server.mjs", "utf8");
  const store = await readFile("apps/api/src/store.mjs", "utf8");
  const pkg = JSON.parse(await readFile("package.json", "utf8"));

  for (const marker of ["quotation_draft_packs", "/quotation-draft-packs", "Quotation Draft Assembly", "Prepare Client Correspondence Draft", "Draft only"]) {
    assert(app.includes(marker), `UI missing NHL-Q3 marker: ${marker}`);
  }
  for (const marker of ["createQuotationDraftPackRecord", "reviewQuotationDraftPackRecord", "prepareQuotationClientCorrespondenceRecord", "client_facing: false"]) {
    assert(store.includes(marker), `Store missing NHL-Q3 marker: ${marker}`);
  }
  assert(server.includes("[\"quotation-draft-packs\", \"quotation_draft_packs\"]"), "Quotation draft pack read collection missing.");
  assert(pkg.scripts["check:nhl:q3"] === "node scripts/smoke-nhl-q3-quotation-draft-correspondence.mjs", "check:nhl:q3 package script missing.");

  start("api", ["apps/api/src/server.mjs"], { VFIRM_API_PORT: String(apiPort), VFIRM_STORE_PATH: storePath, DATABASE_URL: "", VFIRM_STORE_BACKEND: "json" });
  await waitForJson(`${apiBase}/health`);
  await seedPilotWorkspaces();
  const initial = await get("/mvp/store");
  const formwork = initial.firms.find((firm) => firm.name === "Amanah Formwork Pilot Firm");
  const nhl = initial.firms.find((firm) => firm.name === "NHL Global Solution");
  assert(formwork, "Active workspace dropdown data must include Amanah Formwork Pilot Firm after seed.");
  assert(nhl, "Active workspace dropdown data must include NHL Global Solution after seed.");
  const headers = authHeaders(initial, nhl);

  const client = await post("/clients", { tenant_id: nhl.tenant_id, firm_id: nhl.id, name: "NHL-Q3 Quotation Client" }, headers);
  const registered = await post("/administration/documents", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    relationship_id: client.relationship.id,
    document_number: "NHL-Q3-BOQ-IN-001",
    title: "NHL-Q3 client BOQ source",
    document_type: "CLIENT_BOQ_IMAGE",
    classification: "CLIENT_CONFIDENTIAL",
    revision: "0",
    storage_ref: "local://nhl/quotation/in/IMG-20260819-WA0007.jpg",
    content_hash: "nhl-q3-local-evidence-1"
  }, headers);
  const quotationCase = await post("/quotation-cases", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    relationship_id: client.relationship.id,
    case_number: "NHL-QT-2026-0003",
    title: "Quotation draft assembly",
    quotation_type: "BOQ_IMAGE_QUOTATION",
    service_lines: ["technical_writing", "clerical_work", "bizkick_edcs"],
    client_request_summary: "Client BOQ needs controlled quotation draft and correspondence.",
    intake_evidence_refs: [`document://${registered.document.document_number}`],
    document_register_entry_ids: [registered.document.id]
  }, headers);
  const aid = await post("/boq-extraction-aids", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    quotation_case_id: quotationCase.id,
    extracted_items: [{ item_ref: "BOQ-001", description: "Reviewed quotation line", quantity: "10", unit: "item", review_flag: "HUMAN_VERIFY_RATE" }]
  }, headers);

  const draftBeforeReviewDenied = await request("/quotation-draft-packs", {
    method: "POST",
    headers,
    body: { tenant_id: nhl.tenant_id, firm_id: nhl.id, quotation_case_id: quotationCase.id, boq_extraction_aid_id: aid.id }
  });
  assert(draftBeforeReviewDenied.response.status >= 400, "Draft pack must require a human-reviewed BOQ extraction aid.");

  const reviewedAid = await post("/boq-extraction-aids/review", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    boq_extraction_aid_id: aid.id,
    review_decision: "ACCEPT_FOR_QUOTATION_SUPPORT",
    review_notes: "Human principal reviewed BOQ aid before draft assembly."
  }, headers);
  assert.equal(reviewedAid.extraction_status, "HUMAN_REVIEWED");

  const draftPack = await post("/quotation-draft-packs", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    quotation_case_id: quotationCase.id,
    boq_extraction_aid_id: reviewedAid.id,
    line_items: [{ item_ref: "BOQ-001", description: "Reviewed quotation line", quantity: "10", unit: "item", rate: "TBC_BY_HUMAN", amount: "TBC_BY_HUMAN" }],
    commercial_summary: "Draft quotation assembled for human principal review."
  }, headers);
  assert.equal(draftPack.draft_status, "DRAFT_REVIEW_REQUIRED");
  assert.equal(draftPack.client_facing, false);
  assert.equal(draftPack.authoritative, false);
  assert.equal(draftPack.requires_human_approval, true);

  const correspondenceBeforeReviewDenied = await request("/quotation-draft-packs/client-correspondence", {
    method: "POST",
    headers,
    body: { tenant_id: nhl.tenant_id, firm_id: nhl.id, quotation_draft_pack_id: draftPack.id }
  });
  assert(correspondenceBeforeReviewDenied.response.status >= 400, "Client correspondence draft must require human-reviewed draft pack.");

  const aiReviewDenied = await request("/quotation-draft-packs/review", {
    method: "POST",
    body: {
      tenant_id: nhl.tenant_id,
      firm_id: nhl.id,
      quotation_draft_pack_id: draftPack.id,
      actor: { actor_id: "ai-worker", actor_type: "AI_WORKER", tenant_id: nhl.tenant_id, firm_id: nhl.id, role: "marketing-sales-coordinator" }
    }
  });
  assert(aiReviewDenied.response.status >= 400, "AI worker must not review quotation draft pack.");

  const reviewedDraft = await post("/quotation-draft-packs/review", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    quotation_draft_pack_id: draftPack.id,
    review_decision: "ACCEPT_FOR_CLIENT_CORRESPONDENCE_DRAFT",
    review_notes: "Human principal reviewed the draft pack before client correspondence preparation."
  }, headers);
  assert.equal(reviewedDraft.draft_status, "HUMAN_REVIEWED");

  const correspondenceResult = await post("/quotation-draft-packs/client-correspondence", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    quotation_draft_pack_id: draftPack.id,
    correspondent: "Client Representative",
    subject: "Quotation draft prepared for review"
  }, headers);
  assert.equal(correspondenceResult.correspondence.status, "DRAFT_REVIEW_REQUIRED");
  assert.equal(correspondenceResult.correspondence.direction, "OUTGOING");
  assert.equal(correspondenceResult.quotation_draft_pack.client_correspondence_status, "DRAFT_PREPARED_REVIEW_REQUIRED");

  const finalStore = await get("/mvp/store");
  const events = new Set(finalStore.event_log.filter((event) => event.tenant_id === nhl.tenant_id && event.firm_id === nhl.id).map((event) => event.event_type));
  for (const eventType of ["quotation_draft_pack.prepared", "quotation_draft_pack.human_reviewed", "quotation_draft_pack.client_correspondence_prepared"]) {
    assert(events.has(eventType), `Missing ${eventType} audit event.`);
  }
  const packs = await get("/quotation-draft-packs", headers);
  assert(packs.some((item) => item.id === draftPack.id), "Read collection should return quotation draft pack.");
  const exported = await get(`/data-protection/export-manifest?tenant_id=${nhl.tenant_id}&firm_id=${nhl.id}`, headers);
  assert(exported.integrity.audit_trail_included, "Export manifest must include audit trail.");

  console.log(JSON.stringify({
    sprint: "NHL-Q3",
    status: "PASS",
    checks: [
      "active_workspace_seed_contains_formwork_and_nhl",
      "draft_requires_human_reviewed_boq_aid",
      "quotation_draft_pack_prepared",
      "ai_draft_review_denied",
      "human_draft_review_recorded",
      "client_correspondence_draft_prepared_without_send",
      "audit_reconstruction",
      "tenant_export_manifest"
    ],
    draft_status: reviewedDraft.draft_status,
    correspondence_status: correspondenceResult.correspondence.status
  }, null, 2));
} finally {
  for (const child of children) child.kill();
  await rm(tmp, { recursive: true, force: true });
}
