import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-stage10-"));
const port = 3092;
const base = `http://127.0.0.1:${port}`;
const api = spawn(process.execPath, ["apps/api/src/server.mjs"], {
  cwd: root,
  env: { ...process.env, VFIRM_API_PORT: String(port), VFIRM_STORE_PATH: join(tmp, "store.json"), VFIRM_DATABASE_URL: "", VFIRM_RELEASE_CHANNEL: "local-pilot" },
  stdio: ["ignore", "pipe", "pipe"]
});
let logs = "";
api.stdout.on("data", (chunk) => { logs += chunk.toString(); });
api.stderr.on("data", (chunk) => { logs += chunk.toString(); });

async function waitForHealth() {
  const started = Date.now();
  while (Date.now() - started < 10000) {
    try {
      const res = await fetch(`${base}/health`);
      const json = await res.json();
      if (res.ok && json.ok) return json;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`API did not become healthy. Logs:\n${logs}`);
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${base}${path}`, { method, headers: { "content-type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json();
  return { res, json };
}

async function get(path, headers = {}) {
  const { res, json } = await request(path, { headers });
  if (!res.ok || !json.ok) throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`);
  return json.data;
}

async function post(path, body, headers = {}) {
  const { res, json } = await request(path, { method: "POST", body, headers });
  if (!res.ok || !json.ok) throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`);
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

const formworkInputs = {
  project_name: "Stage 10 Pilot Basement Wall Formwork",
  site_location: "Kuala Lumpur",
  client_organization: "Pilot Contractor Sdn Bhd",
  client_contact_name: "Pilot QS",
  client_contact_email: "pilot.qs@example.com",
  structure_type: "basement",
  formwork_element_type: "wall",
  height: 3.6,
  length_or_area: 150,
  concrete_grade: "C30/37",
  available_drawings: ["S-100", "S-101"],
  deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
  required_deliverables: ["preliminary_support_report"]
};

try {
  await waitForHealth();
  const pilotPackage = await get("/pilot/formwork");
  if (pilotPackage.code !== "VF-PILOT-001" || !pilotPackage.acceptance_criteria?.length) throw new Error("Pilot package metadata is incomplete.");

  const tenant = await post("/tenants", { name: "Stage 10 Pilot Tenant", default_region: "MY" });
  const firm = await post("/firms", { tenant_id: tenant.id, name: "Amanah Formwork Pilot Firm", principal_name: "Ir. Pilot Principal" });
  const headers = authHeaders(firm);
  const client = await post("/clients", { tenant_id: tenant.id, firm_id: firm.firm.id, name: "Pilot Contractor Sdn Bhd", actor: firm.principal_actor }, headers);
  const intake = await post("/intake-sessions", { tenant_id: tenant.id, firm_id: firm.firm.id, relationship_id: client.relationship.id, provided_inputs: formworkInputs, actor: firm.principal_actor }, headers);
  const proposal = await post("/proposals", { tenant_id: tenant.id, firm_id: firm.firm.id, relationship_id: client.relationship.id, intake_session_id: intake.intake.id, scope_summary: "Pilot preliminary formwork design support package", final_price: 3500, actor: firm.principal_actor }, headers);
  const approval = await post("/proposals/approve", { tenant_id: tenant.id, firm_id: firm.firm.id, proposal_id: proposal.proposal.id, actor: firm.principal_actor }, headers);
  const project = await post("/proposals/accept", { tenant_id: tenant.id, firm_id: firm.firm.id, proposal_id: approval.proposal.id, project_name: formworkInputs.project_name, actor: firm.principal_actor }, headers);
  await post("/tasks/start", { tenant_id: tenant.id, firm_id: firm.firm.id, task_id: project.task.id, actor: firm.principal_actor }, headers);
  await post("/tasks/complete", { tenant_id: tenant.id, firm_id: firm.firm.id, task_id: project.task.id, output_ref: "pilot-formwork-intake-summary", actor: firm.principal_actor }, headers);
  const evidence = await post("/evidence-bundles", { tenant_id: tenant.id, firm_id: firm.firm.id, project_id: project.project.id, subject_type: "Project", subject_id: project.project.id, input_refs: ["formwork_intake_completeness", "document_revision_consistency", "unit_consistency", "geometry_positive_value_check", "risk_classification_completeness", "approval_presence_before_issue", "manufacturer_source_provenance_presence", "calculation_input_schema_validity"], actor: firm.principal_actor }, headers);
  const draft = await post("/deliverables/draft", { tenant_id: tenant.id, firm_id: firm.firm.id, project_id: project.project.id, relationship_id: client.relationship.id, title: "Pilot Formwork Preliminary Support Report", actor: firm.principal_actor }, headers);
  const review = await post("/deliverables/review", { tenant_id: tenant.id, firm_id: firm.firm.id, project_id: project.project.id, document_version_id: draft.document_version.id, evidence_bundle_id: evidence.id, actor: firm.principal_actor }, headers);
  await post("/deliverables/issue", { tenant_id: tenant.id, firm_id: firm.firm.id, project_id: project.project.id, document_version_id: draft.document_version.id, evidence_bundle_id: evidence.id, approval_id: review.approval.id, subject_version_or_hash: draft.document_version.hash, actor: firm.principal_actor }, headers);
  const invoice = await post("/invoices", { tenant_id: tenant.id, firm_id: firm.firm.id, relationship_id: client.relationship.id, engagement_id: project.engagement.id, project_id: project.project.id, currency: "MYR", line_items: [{ description: "Pilot Formwork Preliminary Support", amount: 3500 }], actor: firm.principal_actor }, headers);
  await post("/invoices/issue", { tenant_id: tenant.id, firm_id: firm.firm.id, invoice_id: invoice.id, actor: firm.principal_actor }, headers);
  await post("/payments/record", { tenant_id: tenant.id, firm_id: firm.firm.id, invoice_id: invoice.id, payment_status: "PAID", amount: 3500, currency: "MYR", actor: firm.principal_actor }, headers);
  const worker = await post("/worker-instances", { tenant_id: tenant.id, firm_id: firm.firm.id, worker_template_code: "formwork-intake-agent", name: "Pilot Formwork Intake AI", actor: firm.principal_actor }, headers);
  await post("/worker-instances/activate", { tenant_id: tenant.id, firm_id: firm.firm.id, worker_instance_id: worker.worker_instance.id, actor: firm.principal_actor }, headers);
  await post("/marketplace/listings", { tenant_id: tenant.id, firm_id: firm.firm.id, title: "Pilot Trusted Formwork Support", description: "Private pilot listing for Formwork preliminary support", actor: firm.principal_actor }, headers);
  await post("/capacity/offers", { tenant_id: tenant.id, firm_id: firm.firm.id, capacity_type: "PILOT_FORMWORK_REVIEW_CAPACITY", pce_units: 1.5, actor: firm.principal_actor }, headers);
  const snapshot = await post("/observatory/snapshots", { tenant_id: tenant.id, firm_id: firm.firm.id, snapshot_scope: "PILOT_INTERNAL", actor: firm.principal_actor }, headers);
  const summary = await get("/dashboard/summary", headers);
  if (summary.counts.projects < 1 || summary.counts.invoices < 1 || summary.counts.marketplace_listings < 1 || snapshot.metrics.paid_invoices < 1) throw new Error(`Pilot seed incomplete: ${JSON.stringify({ counts: summary.counts, snapshot })}`);
  console.log("Stage 10 Formwork pilot package smoke test passed.");
} finally {
  api.kill();
  await once(api, "exit").catch(() => {});
  await rm(tmp, { recursive: true, force: true });
}
