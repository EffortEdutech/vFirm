import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-nhl-q2-"));
const apiPort = 3132;
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
  assert.equal(code, 0, `NHL-Q2 seed failed.\nstdout:\n${seedOut}\nstderr:\n${seedErr}`);
}

try {
  const app = await readFile("apps/web/public/app.js", "utf8");
  const server = await readFile("apps/api/src/server.mjs", "utf8");
  const store = await readFile("apps/api/src/store.mjs", "utf8");
  const completion = await readFile("docs/10_post_freeze_technical_design/NHL_Q2_QUOTATION_DOCUMENT_CONTROL_AND_BOQ_EXTRACTION_AID_COMPLETION_v1.0.md", "utf8");
  const pkg = JSON.parse(await readFile("package.json", "utf8"));

  for (const marker of ["boq_extraction_aids", "/boq-extraction-aids", "BOQ Extraction Aid", "Review aid only"]) {
    assert(app.includes(marker), `UI missing NHL-Q2 marker: ${marker}`);
  }
  for (const marker of ["createBoqExtractionAidRecord", "reviewBoqExtractionAidRecord", "authoritative: false", "requires_human_review: true"]) {
    assert(store.includes(marker), `Store missing NHL-Q2 marker: ${marker}`);
  }
  assert(server.includes("[\"boq-extraction-aids\", \"boq_extraction_aids\"]"), "BOQ extraction aid read collection missing.");
  assert(pkg.scripts["check:nhl:q2"] === "node scripts/smoke-nhl-q2-boq-extraction-aid.mjs", "check:nhl:q2 package script missing.");
  assert(completion.includes("NHL-Q2") && completion.includes("non-authoritative") && completion.includes("human review"), "NHL-Q2 completion doc missing required markers.");

  start("api", ["apps/api/src/server.mjs"], { VFIRM_API_PORT: String(apiPort), VFIRM_STORE_PATH: storePath, DATABASE_URL: "", VFIRM_STORE_BACKEND: "json" });
  await waitForJson(`${apiBase}/health`);
  await seedPilotWorkspaces();
  const initial = await get("/mvp/store");
  const nhl = initial.firms.find((firm) => firm.name === "NHL Global Solution");
  assert(nhl, "NHL Global Solution missing.");
  const headers = authHeaders(initial, nhl);

  const client = await post("/clients", { tenant_id: nhl.tenant_id, firm_id: nhl.id, name: "NHL-Q2 BOQ Client" }, headers);
  const noDocsCase = await post("/quotation-cases", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    relationship_id: client.relationship.id,
    case_number: "NHL-QT-2026-0002-NODOC",
    title: "BOQ extraction without document control",
    client_request_summary: "Negative case: no registered source document."
  }, headers);
  const noDocsDenied = await request("/boq-extraction-aids", {
    method: "POST",
    headers,
    body: { tenant_id: nhl.tenant_id, firm_id: nhl.id, quotation_case_id: noDocsCase.id }
  });
  assert(noDocsDenied.response.status >= 400, "Extraction aid must require registered source documents.");

  const docs = [];
  for (let i = 1; i <= 4; i += 1) {
    const registered = await post("/administration/documents", {
      tenant_id: nhl.tenant_id,
      firm_id: nhl.id,
      relationship_id: client.relationship.id,
      document_number: `NHL-Q2-BOQ-IN-${String(i).padStart(3, "0")}`,
      title: `NHL-Q2 client BOQ image ${i}`,
      document_type: "CLIENT_BOQ_IMAGE",
      classification: "CLIENT_CONFIDENTIAL",
      revision: "0",
      storage_ref: `local://nhl/quotation/in/IMG-20260819-WA000${i + 6}.jpg`,
      content_hash: `nhl-q2-local-evidence-${i}`
    }, headers);
    docs.push(registered.document);
  }

  const quotationCase = await post("/quotation-cases", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    relationship_id: client.relationship.id,
    case_number: "NHL-QT-2026-0002",
    title: "BOQ extraction aid quotation support",
    quotation_type: "BOQ_IMAGE_QUOTATION",
    service_lines: ["technical_writing", "clerical_work", "bizkick_edcs"],
    client_request_summary: "Client BOQ photos need structured quotation review aid.",
    intake_evidence_refs: docs.map((doc) => `document://${doc.document_number}`),
    document_register_entry_ids: docs.map((doc) => doc.id)
  }, headers);

  const aid = await post("/boq-extraction-aids", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    quotation_case_id: quotationCase.id,
    extracted_items: [
      { item_ref: "BOQ-001", description: "Client BOQ line to verify", quantity: "TBC", unit: "TBC", review_flag: "VERIFY_AGAINST_SOURCE" },
      { item_ref: "BOQ-002", description: "Client BOQ line requiring clarification", quantity: "TBC", unit: "TBC", review_flag: "CLIENT_CLARIFICATION" }
    ],
    metadata: { sprint: "NHL-Q2", raw_file_content_extracted: false }
  }, headers);
  assert.equal(aid.extraction_status, "DRAFT_REVIEW_REQUIRED");
  assert.equal(aid.authoritative, false);
  assert.equal(aid.requires_human_review, true);
  assert.equal(aid.source_document_ids.length, 4);

  const aiDenied = await request("/boq-extraction-aids/review", {
    method: "POST",
    body: {
      tenant_id: nhl.tenant_id,
      firm_id: nhl.id,
      boq_extraction_aid_id: aid.id,
      actor: { actor_id: "ai-worker", actor_type: "AI_WORKER", tenant_id: nhl.tenant_id, firm_id: nhl.id, role: "technical-writing-assistant" }
    }
  });
  assert(aiDenied.response.status >= 400, "AI worker must not review/accept BOQ extraction aid.");

  const reviewed = await post("/boq-extraction-aids/review", {
    tenant_id: nhl.tenant_id,
    firm_id: nhl.id,
    boq_extraction_aid_id: aid.id,
    review_decision: "ACCEPT_FOR_QUOTATION_SUPPORT",
    review_notes: "Human principal reviewed against source images for quotation support only."
  }, headers);
  assert.equal(reviewed.extraction_status, "HUMAN_REVIEWED");
  assert.equal(reviewed.authoritative, false);

  const finalStore = await get("/mvp/store");
  const events = new Set(finalStore.event_log.filter((event) => event.tenant_id === nhl.tenant_id && event.firm_id === nhl.id).map((event) => event.event_type));
  assert(events.has("boq_extraction_aid.prepared"), "Missing prepared audit event.");
  assert(events.has("boq_extraction_aid.human_reviewed"), "Missing human reviewed audit event.");
  const aids = await get("/boq-extraction-aids", headers);
  assert(aids.some((item) => item.id === aid.id), "Read collection should return BOQ extraction aid.");
  const exported = await get(`/data-protection/export-manifest?tenant_id=${nhl.tenant_id}&firm_id=${nhl.id}`, headers);
  assert(exported.integrity.audit_trail_included, "Export manifest must include audit trail.");

  console.log(JSON.stringify({
    sprint: "NHL-Q2",
    status: "PASS",
    checks: [
      "source_documents_required",
      "boq_extraction_aid_prepared",
      "non_authoritative_review_aid",
      "ai_review_denied",
      "human_review_recorded",
      "audit_reconstruction",
      "read_endpoint_available",
      "tenant_export_manifest"
    ],
    extraction_status: reviewed.extraction_status,
    source_documents: reviewed.source_document_ids.length
  }, null, 2));
} finally {
  for (const child of children) child.kill();
  await rm(tmp, { recursive: true, force: true });
}
