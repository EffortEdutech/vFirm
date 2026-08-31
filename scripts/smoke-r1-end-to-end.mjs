import { once } from "node:events";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
await loadLocalEnv(join(root, ".env.local"));
const mode = process.argv.includes("--postgres") ? "postgres" : "json";
const portArg = process.argv.find((arg) => arg.startsWith("--port="));
const port = portArg ? Number(portArg.split("=")[1]) : await findFreeSmokePort(mode === "postgres" ? [3096, 3094, 3092] : [3097, 3095, 3093]);
const base = `http://127.0.0.1:${port}`;
const tmp = await mkdtemp(join(tmpdir(), `vfirm-r1-${mode}-`));

const env = {
  ...process.env,
  VFIRM_API_PORT: String(port),
  VFIRM_RELEASE_CHANNEL: "r1-stabilization"
};

if (mode === "json") {
  env.DATABASE_URL = "";
  env.VFIRM_STORE_PATH = join(tmp, "store.json");
  env.VFIRM_STORE_BACKEND = "json";
} else {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is required for --postgres Release 1 smoke mode.");
  env.VFIRM_STORE_BACKEND = "postgres";
}

const api = spawn(process.execPath, ["apps/api/src/server.mjs"], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
let logs = "";
api.stdout.on("data", (chunk) => { logs += chunk.toString(); });
api.stderr.on("data", (chunk) => { logs += chunk.toString(); });

async function waitForHealth() {
  const started = Date.now();
  while (Date.now() - started < 12000) {
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const formworkInputs = {
  project_name: "R1 Pilot Basement Wall Formwork",
  site_location: "Kuala Lumpur",
  client_organization: "R1 Pilot Contractor Sdn Bhd",
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
  const health = await waitForHealth();
  assert(health.backend === mode, `Expected ${mode} backend on port ${port}, got ${health.backend}: ${JSON.stringify(health)} Logs: ${logs}`);

  const pilotPackage = await get("/pilot/formwork");
  assert(pilotPackage.code === "VF-PILOT-001", "Formwork pilot package metadata is missing.");

  const tenant = await post("/tenants", { name: `R1 ${mode.toUpperCase()} Tenant`, default_region: "MY" });
  const firm = await post("/firms", { tenant_id: tenant.id, name: `R1 ${mode.toUpperCase()} Formwork Firm`, principal_name: "Ir. R1 Principal" });
  const headers = authHeaders(firm);

  const client = await post("/clients", { tenant_id: tenant.id, firm_id: firm.firm.id, name: "R1 Pilot Contractor Sdn Bhd", actor: firm.principal_actor }, headers);
  const intake = await post("/intake-sessions", { tenant_id: tenant.id, firm_id: firm.firm.id, relationship_id: client.relationship.id, provided_inputs: formworkInputs, actor: firm.principal_actor }, headers);
  assert(intake.intake.intake_status === "COMPLETE", "Intake should be complete for R1 pilot inputs.");

  const proposal = await post("/proposals", { tenant_id: tenant.id, firm_id: firm.firm.id, relationship_id: client.relationship.id, intake_session_id: intake.intake.id, scope_summary: "R1 preliminary formwork design support package", final_price: 3500, actor: firm.principal_actor }, headers);
  const approval = await post("/proposals/approve", { tenant_id: tenant.id, firm_id: firm.firm.id, proposal_id: proposal.proposal.id, actor: firm.principal_actor }, headers);
  const project = await post("/proposals/accept", { tenant_id: tenant.id, firm_id: firm.firm.id, proposal_id: approval.proposal.id, project_name: formworkInputs.project_name, actor: firm.principal_actor }, headers);

  const worker = await post("/worker-instances", { tenant_id: tenant.id, firm_id: firm.firm.id, worker_template_code: "formwork-intake-agent", name: "R1 Formwork Intake AI", actor: firm.principal_actor }, headers);
  await post("/worker-instances/activate", { tenant_id: tenant.id, firm_id: firm.firm.id, worker_instance_id: worker.worker_instance.id, actor: firm.principal_actor }, headers);
  await post("/runtime/tasks/assign-ai", { tenant_id: tenant.id, firm_id: firm.firm.id, task_id: project.task.id, worker_instance_id: worker.worker_instance.id, actor: firm.principal_actor }, headers);
  await post("/tasks/start", { tenant_id: tenant.id, firm_id: firm.firm.id, task_id: project.task.id, actor: firm.principal_actor }, headers);
  await post("/tasks/complete", { tenant_id: tenant.id, firm_id: firm.firm.id, task_id: project.task.id, output_ref: "r1-formwork-intake-summary", actor: firm.principal_actor }, headers);
  await post("/runtime/tasks/output", { tenant_id: tenant.id, firm_id: firm.firm.id, task_id: project.task.id, worker_instance_id: worker.worker_instance.id, output_ref: "r1-ai-intake-summary", requires_human_review: true, actor: firm.principal_actor }, headers);

  const evidence = await post("/evidence-bundles", { tenant_id: tenant.id, firm_id: firm.firm.id, project_id: project.project.id, subject_type: "Project", subject_id: project.project.id, input_refs: ["formwork_intake_completeness", "document_revision_consistency", "unit_consistency", "geometry_positive_value_check", "risk_classification_completeness", "approval_presence_before_issue", "manufacturer_source_provenance_presence", "calculation_input_schema_validity"], actor: firm.principal_actor }, headers);
  const draft = await post("/deliverables/draft", { tenant_id: tenant.id, firm_id: firm.firm.id, project_id: project.project.id, relationship_id: client.relationship.id, title: "R1 Formwork Preliminary Support Report", actor: firm.principal_actor }, headers);
  const review = await post("/deliverables/review", { tenant_id: tenant.id, firm_id: firm.firm.id, project_id: project.project.id, document_version_id: draft.document_version.id, evidence_bundle_id: evidence.id, actor: firm.principal_actor }, headers);
  await post("/deliverables/issue", { tenant_id: tenant.id, firm_id: firm.firm.id, project_id: project.project.id, document_version_id: draft.document_version.id, evidence_bundle_id: evidence.id, approval_id: review.approval.id, subject_version_or_hash: draft.document_version.hash, actor: firm.principal_actor }, headers);

  const invoice = await post("/invoices", { tenant_id: tenant.id, firm_id: firm.firm.id, relationship_id: client.relationship.id, engagement_id: project.engagement.id, project_id: project.project.id, currency: "MYR", line_items: [{ description: "R1 Formwork Preliminary Support", amount: 3500 }], actor: firm.principal_actor }, headers);
  await post("/invoices/issue", { tenant_id: tenant.id, firm_id: firm.firm.id, invoice_id: invoice.id, actor: firm.principal_actor }, headers);
  await post("/payments/record", { tenant_id: tenant.id, firm_id: firm.firm.id, invoice_id: invoice.id, payment_status: "PAID", amount: 3500, currency: "MYR", actor: firm.principal_actor }, headers);

  const pilotUser = await post("/pilot/users/invite", { tenant_id: tenant.id, firm_id: firm.firm.id, email: `r1.${mode}.pilot@example.com`, display_name: "R1 Pilot User", role: "pilot_operator", actor: firm.principal_actor }, headers);
  await post("/pilot/users/activate", { tenant_id: tenant.id, firm_id: firm.firm.id, pilot_user_id: pilotUser.id, external_subject: `external-r1-${mode}`, actor: firm.principal_actor }, headers);
  const support = await post("/support/cases", { tenant_id: tenant.id, firm_id: firm.firm.id, related_pilot_user_id: pilotUser.id, subject: "R1 pilot support rehearsal", severity: "LOW", actor: firm.principal_actor }, headers);
  await post("/support/cases/update", { tenant_id: tenant.id, firm_id: firm.firm.id, support_case_id: support.id, status: "CLOSED", resolution_summary: "Resolved during R1 smoke.", actor: firm.principal_actor }, headers);
  const incident = await post("/ops/incidents", { tenant_id: tenant.id, firm_id: firm.firm.id, project_id: project.project.id, incident_type: "OPERATIONAL", severity: "LOW", title: "R1 incident rehearsal", summary: "R1 incident rehearsal", actor: firm.principal_actor }, headers);
  await post("/ops/incidents/update", { tenant_id: tenant.id, firm_id: firm.firm.id, incident_id: incident.id, status: "RESOLVED", mitigation_summary: "R1 mitigation recorded.", actor: firm.principal_actor }, headers);

  const feedback = await post("/pilot/feedback", { tenant_id: tenant.id, firm_id: firm.firm.id, project_id: project.project.id, subject: "R1 pilot feedback", feedback_type: "OPERATOR", rating: 5, feedback_text: "R1 pilot flow is operable.", actor: firm.principal_actor }, headers);
  const acceptance = await post("/pilot/acceptance-reviews", { tenant_id: tenant.id, firm_id: firm.firm.id, review_scope: "FORMWORK_PILOT", decision: "ACCEPTED", decision_summary: "R1 smoke acceptance review recorded.", actor: firm.principal_actor }, headers);
  const improvement = await post("/pilot/improvement-items", { tenant_id: tenant.id, firm_id: firm.firm.id, feedback_id: feedback.id, acceptance_review_id: acceptance.id, title: "R1 polish follow-up", priority: "LOW", actor: firm.principal_actor }, headers);
  await post("/pilot/improvement-items/update", { tenant_id: tenant.id, firm_id: firm.firm.id, improvement_item_id: improvement.id, status: "DONE", actor: firm.principal_actor }, headers);
  await post("/pilot/report-packs", { tenant_id: tenant.id, firm_id: firm.firm.id, report_scope: "R1_SMOKE", actor: firm.principal_actor }, headers);

  const board = await post("/stakeholder-review/boards", { tenant_id: tenant.id, firm_id: firm.firm.id, board_name: "R1 Smoke Review Board", review_scope: "RELEASE_1", actor: firm.principal_actor }, headers);
  const decision = await post("/stakeholder-review/decisions", { tenant_id: tenant.id, firm_id: firm.firm.id, board_id: board.id, decision: "APPROVED", decision_summary: "R1 smoke board approved.", actor: firm.principal_actor }, headers);
  const cohort = await post("/pilot/expansion-cohorts", { tenant_id: tenant.id, firm_id: firm.firm.id, stakeholder_decision_id: decision.id, cohort_name: "R1 Controlled Pilot Cohort", max_tenants: 1, max_pilot_users: 3, actor: firm.principal_actor }, headers);
  await post("/pilot/expansion-cohorts/update", { tenant_id: tenant.id, firm_id: firm.firm.id, expansion_cohort_id: cohort.id, expansion_status: "APPROVED", actor: firm.principal_actor }, headers);
  const onboarding = await post("/tenant-onboarding/plans", { tenant_id: tenant.id, firm_id: firm.firm.id, expansion_cohort_id: cohort.id, actor: firm.principal_actor }, headers);
  await post("/tenant-onboarding/plans/update", { tenant_id: tenant.id, firm_id: firm.firm.id, onboarding_plan_id: onboarding.id, onboarding_status: "COMPLETE", actor: firm.principal_actor }, headers);

  const usageControl = await post("/tenant-pilot/controls", { tenant_id: tenant.id, firm_id: firm.firm.id, plan_code: "R1_CONTROLLED", limits: { projects: 2, pilot_users: 3, ai_tool_invocations: 10, storage_mb: 500 }, actor: firm.principal_actor }, headers);
  assert(usageControl.control_status === "ACTIVE", "Tenant usage control was not activated.");
  await post("/tenant-usage/events", { tenant_id: tenant.id, firm_id: firm.firm.id, usage_type: "projects", quantity: 1, unit: "project", source_ref: "r1-smoke", actor: firm.principal_actor }, headers);
  await post("/tenant-usage/events", { tenant_id: tenant.id, firm_id: firm.firm.id, usage_type: "ai_tool_invocations", quantity: 2, unit: "call", source_ref: "r1-smoke", actor: firm.principal_actor }, headers);
  await post("/billing/readiness-reviews", { tenant_id: tenant.id, firm_id: firm.firm.id, readiness_status: "READY", pricing_model: "R1_PILOT_REVIEW", decision_summary: "Billing readiness prepared without live capture.", actor: firm.principal_actor }, headers);
  const provider = await post("/payments/provider-configs", { tenant_id: tenant.id, firm_id: firm.firm.id, provider_name: "stripe", provider_mode: "test", config_status: "READY_FOR_TEST", actor: firm.principal_actor }, headers);
  const pack = await post("/subscriptions/packages", { tenant_id: tenant.id, firm_id: firm.firm.id, package_code: "VF-R1-PILOT", package_name: "vFirm R1 Pilot", base_price: 0, currency: "MYR", actor: firm.principal_actor }, headers);
  await post("/commercial-launch/controls", { tenant_id: tenant.id, firm_id: firm.firm.id, payment_provider_config_id: provider.id, subscription_package_id: pack.id, launch_status: "APPROVED_TEST_MODE", decision_summary: "R1 commercial launch remains test-mode only; no live payment capture.", actor: firm.principal_actor }, headers);

  await post("/marketplace/listings", { tenant_id: tenant.id, firm_id: firm.firm.id, title: "R1 Trusted Formwork Support", description: "Private pilot listing only", actor: firm.principal_actor }, headers);
  await post("/capacity/offers", { tenant_id: tenant.id, firm_id: firm.firm.id, capacity_type: "R1_FORMWORK_REVIEW_CAPACITY", pce_units: 1.5, actor: firm.principal_actor }, headers);
  await post("/observatory/snapshots", { tenant_id: tenant.id, firm_id: firm.firm.id, snapshot_scope: "R1_PILOT_INTERNAL", actor: firm.principal_actor }, headers);

  const dashboard = await get(`/dashboard/summary?tenant_id=${tenant.id}`, headers);
  const usageSummary = await get(`/tenant-usage/summary?tenant_id=${tenant.id}`, headers);
  const launchSummary = await get(`/commercial-launch/summary?tenant_id=${tenant.id}`, headers);
  const auditEvents = await get(`/audit-events?tenant_id=${tenant.id}`, headers);
  const policyDecisions = await get(`/policy-decisions?tenant_id=${tenant.id}`, headers);

  assert(dashboard.counts.projects >= 1, "Dashboard did not count the R1 project.");
  assert(dashboard.counts.invoices >= 1, "Dashboard did not count the R1 invoice.");
  assert(usageSummary.status === "BILLING_READY", `Expected billing ready summary: ${JSON.stringify(usageSummary)}`);
  assert(launchSummary.status === "TEST_MODE_APPROVED", `Expected test-mode approved launch: ${JSON.stringify(launchSummary)}`);
  assert(launchSummary.boundary === "payment_provider_preparation_only_no_live_payment_capture", "Commercial boundary changed unexpectedly.");
  assert(auditEvents.length >= 10, "Expected audit trail for R1 flow.");
  assert(policyDecisions.length >= 1, "Expected at least one policy decision in R1 flow.");

  console.log(`Release 1 end-to-end smoke passed (${mode} backend).`);
} finally {
  if (api.exitCode === null && !api.killed) {
    api.kill();
    await once(api, "exit").catch(() => {});
  }
  await rm(tmp, { recursive: true, force: true });
}







async function loadLocalEnv(path) {
  if (!existsSync(path)) return;
  const body = await readFile(path, "utf8");
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

async function findFreeSmokePort(candidates) {
  for (const candidate of candidates) {
    try {
      await fetch(`http://127.0.0.1:${candidate}/health`, { signal: AbortSignal.timeout(250) });
    } catch {
      return candidate;
    }
  }
  throw new Error(`No free vFirm 309# smoke port found. Checked: ${candidates.join(", ")}`);
}



