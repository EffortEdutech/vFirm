import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-r4-s5-"));
const port = 3105;
const base = `http://127.0.0.1:${port}`;
const api = spawn(process.execPath, ["apps/api/src/server.mjs"], {
  cwd: root,
  env: {
    ...process.env,
    VFIRM_API_PORT: String(port),
    VFIRM_STORE_PATH: join(tmp, "store.json"),
    DATABASE_URL: "",
    VFIRM_STORE_BACKEND: "json",
    VFIRM_AUTH_PROVIDER: "clerk",
    VFIRM_AUTH_MODE: "staging",
    VFIRM_AUTH_ISSUER: "https://auth.example.test",
    VFIRM_AUTH_AUDIENCE: "vfirm-staging",
    VFIRM_AUTH_JWKS_URL: "https://auth.example.test/.well-known/jwks.json",
    VFIRM_ALLOWED_ORIGINS: "https://staging.vfirm.example,http://127.0.0.1:3090",
    VFIRM_BACKUP_POLICY: "r4-staging-daily-backup-restore-rehearsal",
    VFIRM_RELEASE_CHANNEL: "release-4-controlled-staging",
    VFIRM_STAGING_ENVIRONMENT: "provider-neutral-managed-staging"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let logs = "";
api.stdout.on("data", (chunk) => { logs += chunk.toString(); });
api.stderr.on("data", (chunk) => { logs += chunk.toString(); });

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

async function get(path, headers = {}) {
  const { response, json } = await request(path, { headers });
  if (!response.ok || !json.ok) throw new Error(`${path} failed: ${response.status} ${JSON.stringify(json)}`);
  return json.data;
}

async function post(path, body, headers = {}) {
  const { response, json } = await request(path, { method: "POST", body, headers });
  if (!response.ok || !json.ok) throw new Error(`${path} failed: ${response.status} ${JSON.stringify(json)}`);
  return json.data;
}

async function postRaw(path, body, headers = {}) {
  return request(path, { method: "POST", body, headers });
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

function aiActor(tenantId, firmId) {
  return {
    actor_id: "r4-s5-ai-worker",
    actor_type: "AI_AGENT",
    tenant_id: tenantId,
    firm_id: firmId,
    display_name: "R4 S5 AI Worker"
  };
}

try {
  await waitForHealth();

  const contracts = await get("/contracts");
  assert(contracts.some((contract) => contract.method === "GET" && contract.path === "/pilot/r4-private-cohort-gate"), "R4-S5 gate contract missing.");
  assert(contracts.some((contract) => contract.method === "POST" && contract.path === "/pilot/private-cohort/activate"), "R4-S5 activation contract missing.");

  const tenant = await post("/tenants", { name: "R4 S5 Private Pilot Tenant" });
  const firm = await post("/firms", { tenant_id: tenant.id, name: "R4 S5 Private Pilot Firm", principal_name: "Ir. Private Pilot Principal" });
  const headers = authHeaders(firm);

  const worker = await post("/worker-instances", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    worker_template_code: "front-desk-coordinator",
    name: "R4-S5 Cohort Support Worker",
    actor: firm.principal_actor
  }, headers);
  await post("/worker-instances/activate", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    worker_instance_id: worker.worker_instance.id,
    actor: firm.principal_actor
  }, headers);
  await post("/policy/evaluate", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    actor_id: firm.principal_actor.id,
    actor_type: "HUMAN",
    action: "pilot.private_cohort.review",
    resource_type: "PilotExpansionCohort",
    resource_id: "r4-s5-private-pilot-readiness",
    risk_class: "CONTROLLED",
    reasons: ["R4-S5 private pilot cohort activation gate rehearsal"]
  }, headers);

  const earlyGate = await get(`/pilot/r4-private-cohort-gate?tenant_id=${tenant.id}&firm_id=${firm.firm.id}`, headers);
  assert(earlyGate.status === "BLOCKED", "Private pilot gate should block before cohort evidence exists.");
  assert(earlyGate.blocked_reasons.some((reason) => reason.includes("pilot_cohort_record")), "Early gate should report missing cohort.");

  const earlyActivation = await postRaw("/pilot/private-cohort/activate", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    expansion_cohort_id: "missing-cohort",
    actor: firm.principal_actor
  }, headers);
  assert(earlyActivation.response.status === 409, `Early activation should be blocked, got ${earlyActivation.response.status}.`);

  const report = await post("/pilot/report-packs", { tenant_id: tenant.id, firm_id: firm.firm.id, report_scope: "R4_S5_PRIVATE_PILOT", actor: firm.principal_actor }, headers);
  const board = await post("/stakeholder-review/boards", { tenant_id: tenant.id, firm_id: firm.firm.id, report_pack_id: report.id, board_name: "R4-S5 Private Pilot Review", actor: firm.principal_actor }, headers);
  const decision = await post("/stakeholder-review/decisions", { tenant_id: tenant.id, firm_id: firm.firm.id, board_id: board.id, decision: "APPROVE_EXPANSION", decision_summary: "Approve bounded private pilot cohort only.", next_stage: "R4-S5", actor: firm.principal_actor }, headers);

  const cohort = await post("/pilot/expansion-cohorts", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    stakeholder_decision_id: decision.id,
    cohort_name: "R4-S5 Private Pilot Cohort 01",
    max_tenants: 1,
    max_pilot_users: 3,
    entry_criteria: ["R4-S1 accepted", "R4-S2 accepted", "R4-S3 accepted", "R4-S4 accepted", "private pilot owner reaffirmed"],
    risk_controls: ["tenant scoped access", "support desk monitored", "incident suspension path", "audit review", "no marketplace exposure"],
    actor: firm.principal_actor
  }, headers);
  assert(cohort.expansion_status === "PROPOSED", "Cohort should begin as PROPOSED.");

  await post("/pilot/expansion-cohorts/update", { tenant_id: tenant.id, firm_id: firm.firm.id, expansion_cohort_id: cohort.id, expansion_status: "APPROVED", actor: firm.principal_actor }, headers);
  const plan = await post("/tenant-onboarding/plans", { tenant_id: tenant.id, firm_id: firm.firm.id, expansion_cohort_id: cohort.id, actor: firm.principal_actor }, headers);
  await post("/tenant-onboarding/plans/update", { tenant_id: tenant.id, firm_id: firm.firm.id, onboarding_plan_id: plan.id, onboarding_status: "COMPLETE", actor: firm.principal_actor }, headers);
  await post("/release-candidate/gates", { tenant_id: tenant.id, firm_id: firm.firm.id, expansion_cohort_id: cohort.id, release_candidate: "R4-S5-PRIVATE-PILOT-RC", gate_status: "APPROVED", evidence_refs: ["R4-S1", "R4-S2", "R4-S3", "R4-S4"], decision_summary: "Private pilot activation approved after accepted R4 evidence.", actor: firm.principal_actor }, headers);

  const invitedActive = await post("/pilot/users/invite", { tenant_id: tenant.id, firm_id: firm.firm.id, email: "pilot.operator@example.com", display_name: "Pilot Operator", pilot_role: "PILOT_OPERATOR", auth_provider: "clerk", actor: firm.principal_actor }, headers);
  const activeUser = await post("/pilot/users/activate", { tenant_id: tenant.id, firm_id: firm.firm.id, pilot_user_id: invitedActive.id, external_subject: "clerk-pilot-operator", actor: firm.principal_actor }, headers);
  assert(activeUser.invite_status === "ACTIVE", "Pilot activation evidence missing.");

  const invitedOffboard = await post("/pilot/users/invite", { tenant_id: tenant.id, firm_id: firm.firm.id, email: "pilot.offboard@example.com", display_name: "Pilot Offboard", pilot_role: "PILOT_OBSERVER", auth_provider: "clerk", actor: firm.principal_actor }, headers);
  const revokedUser = await post("/pilot/users/revoke", { tenant_id: tenant.id, firm_id: firm.firm.id, pilot_user_id: invitedOffboard.id, revocation_reason: "R4-S5 offboarding gate rehearsal", actor: firm.principal_actor }, headers);
  assert(revokedUser.invite_status === "REVOKED", "Pilot offboarding gate evidence missing.");

  const supportCase = await post("/support/cases", { tenant_id: tenant.id, firm_id: firm.firm.id, related_pilot_user_id: activeUser.id, case_type: "WORKFLOW_BLOCKER", severity: "NORMAL", subject: "R4-S5 support readiness probe", description: "Support case opened for private pilot cohort readiness evidence.", actor: firm.principal_actor }, headers);
  await post("/support/cases/update", { tenant_id: tenant.id, firm_id: firm.firm.id, support_case_id: supportCase.id, status: "RESOLVED", resolution_summary: "Support readiness confirmed.", actor: firm.principal_actor }, headers);

  const incident = await post("/ops/incidents", { tenant_id: tenant.id, firm_id: firm.firm.id, incident_type: "PRIVATE_PILOT_READINESS", severity: "SEV4", title: "R4-S5 readiness incident rehearsal", description: "Incident path rehearsed for private pilot cohort.", impact_summary: "No external pilot impact.", detection_source: "r4-s5-smoke", actor: firm.principal_actor }, headers);
  await post("/ops/incidents/update", { tenant_id: tenant.id, firm_id: firm.firm.id, incident_id: incident.id, status: "RESOLVED", mitigation_summary: "Incident workflow confirmed.", root_cause_summary: "R4-S5 smoke rehearsal.", actor: firm.principal_actor }, headers);

  const aiActivation = await postRaw("/pilot/private-cohort/activate", { tenant_id: tenant.id, firm_id: firm.firm.id, expansion_cohort_id: cohort.id, actor: aiActor(tenant.id, firm.firm.id) }, headers);
  assert(aiActivation.response.status === 403, `AI actor must not activate private pilot cohort, got ${aiActivation.response.status}.`);

  const readyGate = await get(`/pilot/r4-private-cohort-gate?tenant_id=${tenant.id}&firm_id=${firm.firm.id}&cohort_id=${cohort.id}`, headers);
  assert(readyGate.status === "READY_FOR_PRIVATE_PILOT", `Gate should be ready: ${JSON.stringify(readyGate.blocked_reasons)}`);
  assert(readyGate.checks.every((check) => check.status === "PASS"), `Not all R4-S5 checks passed: ${JSON.stringify(readyGate.checks)}`);
  assert(readyGate.boundaries.includes("no_public_marketplace"), "R4-S5 boundary should exclude public marketplace.");
  assert(readyGate.accepted_prior_evidence_required.join(",") === "R4-S1,R4-S2,R4-S3,R4-S4", "R4 prior evidence list mismatch.");

  const activated = await post("/pilot/private-cohort/activate", { tenant_id: tenant.id, firm_id: firm.firm.id, expansion_cohort_id: cohort.id, actor: firm.principal_actor }, headers);
  assert(activated.expansion_status === "PRIVATE_PILOT_ACTIVE", "Private pilot cohort was not activated.");
  assert(activated.metadata?.private_pilot_activation?.activation_status === "READY_FOR_PRIVATE_PILOT", "Activation evidence was not attached to cohort metadata.");

  const auditEvents = await get("/audit-events", headers);
  assert(auditEvents.some((event) => event.action === "pilot_private_cohort.activated"), "Private pilot activation audit event missing.");

  console.log(JSON.stringify({
    smoke: "r4-s5-private-pilot-cohort",
    result: "passed",
    gate_status: readyGate.status,
    activated_status: activated.expansion_status,
    counts: readyGate.counts,
    checks: readyGate.checks.map((check) => `${check.key}:${check.status}`),
    denials: ["early_activation_without_evidence", "ai_private_cohort_activation"],
    boundaries: readyGate.boundaries
  }, null, 2));
} finally {
  if (api.exitCode === null && !api.killed) {
    api.kill();
    await once(api, "exit").catch(() => {});
  }
  await rm(tmp, { recursive: true, force: true });
}