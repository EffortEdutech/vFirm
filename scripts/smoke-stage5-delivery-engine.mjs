import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-stage5-"));
const port = 3097;
const base = `http://127.0.0.1:${port}`;
const requiredEvidence = ["formwork_intake_completeness", "document_revision_consistency", "unit_consistency", "geometry_positive_value_check", "risk_classification_completeness", "approval_presence_before_issue", "manufacturer_source_provenance_presence", "calculation_input_schema_validity"];

const api = spawn(process.execPath, ["apps/api/src/server.mjs"], {
  cwd: root,
  env: { ...process.env, VFIRM_API_PORT: String(port), VFIRM_STORE_PATH: join(tmp, "store.json"), VFIRM_DATABASE_URL: "" },
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
      if (res.ok && json.ok) return;
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
async function post(path, body, headers = {}) {
  const { res, json } = await request(path, { method: "POST", body, headers });
  if (!res.ok || !json.ok) throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`);
  return json.data;
}
function authHeaders(firmResult) {
  return { "x-vfirm-actor-id": firmResult.principal_actor.id, "x-vfirm-tenant-id": firmResult.firm.tenant_id, "x-vfirm-firm-id": firmResult.firm.id, "x-vfirm-role": "principal" };
}

try {
  await waitForHealth();
  const tenant = await post("/tenants", { name: "Stage 5 Tenant" });
  const firmResult = await post("/firms", { tenant_id: tenant.id, name: "Stage 5 Firm", principal_name: "Ir. Stage Five" });
  const headers = authHeaders(firmResult);
  const client = await post("/clients", { tenant_id: tenant.id, firm_id: firmResult.firm.id, name: "Stage 5 Contractor", actor: firmResult.principal_actor }, headers);
  const intake = await post("/intake-sessions", { tenant_id: tenant.id, firm_id: firmResult.firm.id, relationship_id: client.relationship.id, actor: firmResult.principal_actor, provided_inputs: { project_name: "Stage 5 Formwork", site_location: "Kuala Lumpur", structure_type: "basement", formwork_element_type: "wall", height: 3.5, length_or_area: 120, concrete_grade: "C30", available_drawings: ["S-100"], required_deliverables: ["preliminary_support_report"] } }, headers);
  const proposal = await post("/proposals", { tenant_id: tenant.id, firm_id: firmResult.firm.id, relationship_id: client.relationship.id, intake_session_id: intake.intake.id, scope_summary: "Stage 5 formwork delivery", final_price: 2500, actor: firmResult.principal_actor }, headers);
  const approved = await post("/proposals/approve", { tenant_id: tenant.id, firm_id: firmResult.firm.id, proposal_id: proposal.proposal.id }, headers);
  const delivery = await post("/proposals/accept", { tenant_id: tenant.id, firm_id: firmResult.firm.id, proposal_id: approved.proposal.id, project_name: "Stage 5 Formwork", actor: firmResult.principal_actor }, headers);

  const started = await post("/tasks/start", { tenant_id: tenant.id, firm_id: firmResult.firm.id, task_id: delivery.task.id }, headers);
  if (started.state !== "IN_PROGRESS") throw new Error("Task did not start.");
  const completed = await post("/tasks/complete", { tenant_id: tenant.id, firm_id: firmResult.firm.id, task_id: delivery.task.id, output_ref: "intake_summary" }, headers);
  if (completed.state !== "COMPLETE") throw new Error("Task did not complete.");

  const draft = await post("/deliverables/draft", { tenant_id: tenant.id, firm_id: firmResult.firm.id, project_id: delivery.project.id, relationship_id: client.relationship.id, title: "Stage 5 Formwork Preliminary Report" }, headers);
  const incompleteEvidence = await post("/evidence-bundles", { tenant_id: tenant.id, firm_id: firmResult.firm.id, project_id: delivery.project.id, subject_type: "Project", subject_id: delivery.project.id, input_refs: ["intake_summary"], actor: firmResult.principal_actor }, headers);
  const deniedReview = await request("/deliverables/review", { method: "POST", headers, body: { tenant_id: tenant.id, firm_id: firmResult.firm.id, project_id: delivery.project.id, document_version_id: draft.document_version.id, evidence_bundle_id: incompleteEvidence.id } });
  if (deniedReview.res.status !== 409 && deniedReview.res.status !== 500) throw new Error(`Incomplete evidence review should fail, got ${deniedReview.res.status}: ${JSON.stringify(deniedReview.json)}`);

  const completeEvidence = await post("/evidence-bundles", { tenant_id: tenant.id, firm_id: firmResult.firm.id, project_id: delivery.project.id, subject_type: "Project", subject_id: delivery.project.id, input_refs: requiredEvidence, actor: firmResult.principal_actor }, headers);
  const review = await post("/deliverables/review", { tenant_id: tenant.id, firm_id: firmResult.firm.id, project_id: delivery.project.id, document_version_id: draft.document_version.id, evidence_bundle_id: completeEvidence.id }, headers);
  if (review.document_version.status !== "APPROVED" || review.evidence_bundle.status !== "APPROVED") throw new Error("Deliverable review did not approve version/evidence.");

  const issueDenied = await request("/deliverables/issue", { method: "POST", headers, body: { tenant_id: tenant.id, firm_id: firmResult.firm.id, project_id: delivery.project.id, document_version_id: draft.document_version.id, evidence_bundle_id: completeEvidence.id, approval_id: "approval_missing", subject_version_or_hash: draft.document_version.hash } });
  if (issueDenied.res.status < 400) throw new Error("Deliverable issue without valid approval should fail.");

  const issued = await post("/deliverables/issue", { tenant_id: tenant.id, firm_id: firmResult.firm.id, project_id: delivery.project.id, document_version_id: draft.document_version.id, evidence_bundle_id: completeEvidence.id, approval_id: review.approval.id, subject_version_or_hash: draft.document_version.hash }, headers);
  if (issued.document.status !== "ISSUED" || issued.document_version.status !== "ISSUED" || issued.project.project_state !== "DELIVERABLE_ISSUED") throw new Error(`Deliverable was not issued correctly: ${JSON.stringify(issued)}`);

  const versions = await request("/document-versions", { headers });
  if (!versions.res.ok || versions.json.data.length !== 1) throw new Error("Document versions read endpoint failed.");

  console.log("Stage 5 delivery engine smoke test passed.");
} finally {
  api.kill();
  await once(api, "exit").catch(() => {});
  await rm(tmp, { recursive: true, force: true });
}

