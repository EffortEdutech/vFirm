import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-r4-s4-"));
const port = 3104;
const base = `http://127.0.0.1:${port}`;
const api = spawn(process.execPath, ["apps/api/src/server.mjs"], {
  cwd: root,
  env: {
    ...process.env,
    VFIRM_API_PORT: String(port),
    VFIRM_STORE_PATH: join(tmp, "store.json"),
    DATABASE_URL: "",
    VFIRM_STORE_BACKEND: "json",
    VFIRM_AUTH_PROVIDER: "staging-header",
    VFIRM_AUTH_MODE: "staging",
    VFIRM_AUTH_ISSUER: "https://auth.example.test",
    VFIRM_AUTH_AUDIENCE: "vfirm-staging",
    VFIRM_AUTH_JWKS_URL: "https://auth.example.test/.well-known/jwks.json",
    VFIRM_ALLOWED_ORIGINS: "http://127.0.0.1:3090",
    VFIRM_BACKUP_POLICY: "pilot-daily",
    VFIRM_RELEASE_CHANNEL: "staging-pilot"
  },
  stdio: ["ignore", "pipe", "pipe"]
});
let logs = "";
api.stdout.on("data", (chunk) => logs += chunk.toString());
api.stderr.on("data", (chunk) => logs += chunk.toString());

async function waitForHealth() {
  const started = Date.now();
  while (Date.now() - started < 10000) {
    try {
      const response = await fetch(`${base}/health`);
      const json = await response.json();
      if (response.ok && json.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`API did not become healthy. Logs:\n${logs}`);
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await response.json();
  return { response, json };
}

async function post(path, body, headers = {}) {
  const { response, json } = await request(path, { method: "POST", body, headers });
  if (!response.ok || !json.ok) throw new Error(`${path} failed: ${response.status} ${JSON.stringify(json)}`);
  return json.data;
}

async function get(path, headers = {}) {
  const { response, json } = await request(path, { headers });
  if (!response.ok || !json.ok) throw new Error(`${path} failed: ${response.status} ${JSON.stringify(json)}`);
  return json.data;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function authHeaders(firm) {
  return {
    "x-vfirm-actor-id": firm.principal_actor.id,
    "x-vfirm-tenant-id": firm.firm.tenant_id,
    "x-vfirm-firm-id": firm.firm.id,
    "x-vfirm-role": "principal"
  };
}

function containsForbiddenReasoning(value) {
  const text = JSON.stringify(value).toLowerCase();
  return ["chain_of_thought", "private_chain_of_thought", "reasoning_trace", "hidden_reasoning", "raw_prompt", "raw_completion"].some((needle) => text.includes(needle) && !text.includes(`\"${needle}\"`));
}

try {
  await waitForHealth();
  const contracts = await get("/contracts");
  assert(contracts.some((contract) => contract.method === "GET" && contract.path === "/ops/r4-observability-audit-review"), "R4-S4 observability contract missing.");

  const tenant = await post("/tenants", { name: "R4-S4 Observability Tenant" });
  const firm = await post("/firms", { tenant_id: tenant.id, name: "R4-S4 Audit Review Firm", principal_name: "Ir. Review Principal" });
  const headers = authHeaders(firm);

  const worker = await post("/worker-instances", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    worker_template_code: "front-desk-coordinator",
    name: "R4-S4 Review Worker",
    actor: firm.principal_actor
  }, headers);
  const activeWorker = await post("/worker-instances/activate", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    worker_instance_id: worker.worker_instance.id,
    actor: firm.principal_actor
  }, headers);
  assert(activeWorker.runtime_status === "ACTIVE", "Worker activation did not create reviewable worker action evidence.");

  const policy = await post("/policy/evaluate", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    actor_id: firm.principal_actor.id,
    actor_type: "HUMAN",
    action: "support.review",
    resource_type: "PilotSupport",
    resource_id: "r4-s4-policy-probe",
    risk_class: "LOW",
    reasons: ["R4-S4 policy review probe"]
  }, headers);
  assert(policy.result === "ALLOW" || policy.decision === "ALLOW" || policy.policy_decision_id, "Policy evaluation did not create a reviewable decision.");

  const supportCase = await post("/support/cases", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    case_type: "PILOT_OBSERVABILITY",
    severity: "HIGH",
    subject: "Audit review evidence case",
    description: "Support case creates business audit evidence for R4-S4.",
    actor: firm.principal_actor
  }, headers);

  const incident = await post("/ops/incidents", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    support_case_id: supportCase.id,
    incident_type: "OBSERVABILITY_REVIEW",
    severity: "SEV3",
    title: "Observability review incident",
    description: "Incident creates runtime trace and audit review evidence.",
    impact_summary: "Controlled pilot review evidence only.",
    detection_source: "r4-s4-smoke",
    actor: firm.principal_actor
  }, headers);

  await post("/ops/incidents/update", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    incident_id: incident.id,
    status: "RESOLVED",
    mitigation_summary: "Review evidence confirmed.",
    root_cause_summary: "Smoke test generated controlled observability data.",
    actor: firm.principal_actor
  }, headers);

  await post("/support/cases/update", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    support_case_id: supportCase.id,
    status: "RESOLVED",
    resolution_summary: "Audit review evidence confirmed.",
    actor: firm.principal_actor
  }, headers);

  const review = await get(`/ops/r4-observability-audit-review?tenant_id=${tenant.id}&firm_id=${firm.firm.id}`, headers);
  assert(review.code === "R4-S4-OBSERVABILITY-AUDIT-REVIEW", "Wrong R4-S4 review code.");
  assert(review.status === "REVIEW_READY", `Review should be ready: ${JSON.stringify(review.review_completeness)}`);
  assert(review.counts.runtime_events >= 4, "Expected runtime events in review.");
  assert(review.counts.audit_records >= 4, "Expected audit records in review.");
  assert(review.counts.policy_decisions >= 1, "Expected policy decision count in review.");
  assert(review.runtime_trace_summaries.length > 0, "Runtime trace summaries missing.");
  assert(review.application_log_summary.status === "REVIEWABLE", "Application log summary should be reviewable after resolution.");
  assert(review.business_audit_review.length > 0, "Business audit review missing.");
  assert(review.policy_decision_review.decisions.length > 0, "Policy decision review missing.");
  assert(review.evidence_summary.latest_audit_refs.length > 0, "Evidence audit refs missing.");
  assert(review.evidence_summary.latest_event_refs.length > 0, "Evidence event refs missing.");
  assert(review.redaction_policy.private_chain_of_thought_excluded, "Private chain-of-thought exclusion not confirmed.");
  assert(review.review_completeness.every((check) => check.status === "PASS"), `Completeness checks not all pass: ${JSON.stringify(review.review_completeness)}`);
  assert(!containsForbiddenReasoning(review), "Review output appears to expose forbidden private reasoning content.");

  console.log(JSON.stringify({
    smoke: "r4-s4-observability-audit-review",
    result: "passed",
    status: review.status,
    counts: review.counts,
    checks: review.review_completeness.map((check) => `${check.key}:${check.status}`),
    redaction_policy: review.redaction_policy
  }, null, 2));
} finally {
  if (api.exitCode === null && !api.killed) {
    api.kill();
    await once(api, "exit").catch(() => {});
  }
  await rm(tmp, { recursive: true, force: true });
}