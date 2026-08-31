import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-r4-s3-"));
const port = 3103;
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
      const res = await fetch(`${base}/health`);
      const json = await res.json();
      if (res.ok && json.ok) return json;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`API did not become healthy. Logs:\n${logs}`);
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
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

async function postRaw(path, body, headers = {}) {
  return request(path, { method: "POST", body, headers });
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
    actor_id: "r4-s3-ai-worker",
    actor_type: "AI_AGENT",
    tenant_id: tenantId,
    firm_id: firmId,
    display_name: "R4 S3 AI Worker"
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  await waitForHealth();

  const contracts = await get("/contracts");
  assert(contracts.some((contract) => contract.path === "/support/r4-incident-policy"), "R4-S3 support/incident policy contract is missing.");

  const tenant = await post("/tenants", { name: "R4 S3 Tenant" });
  const firm = await post("/firms", { tenant_id: tenant.id, name: "R4 S3 Firm", principal_name: "Ir. Support Principal" });
  const headers = authHeaders(firm);

  const policy = await get("/support/r4-incident-policy", headers);
  assert(policy.support_case_states.includes("ESCALATED"), "Support escalation state is missing.");
  assert(policy.incident_states.includes("MITIGATING"), "Incident mitigation state is missing.");
  assert(policy.authority_boundary.denied_actor_types.includes("AI_AGENT"), "AI support authority denial is missing.");
  assert(policy.suspension_path.includes("pilot_user.suspended"), "Suspension path is missing pilot_user.suspended.");

  const invited = await post("/pilot/users/invite", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    email: "r4s3.operator@example.com",
    display_name: "R4 S3 Operator",
    pilot_role: "PILOT_OPERATOR",
    auth_provider: "clerk",
    actor: firm.principal_actor
  }, headers);
  const activeUser = await post("/pilot/users/activate", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    pilot_user_id: invited.id,
    external_subject: "r4-s3-operator",
    actor: firm.principal_actor
  }, headers);
  assert(activeUser.invite_status === "ACTIVE", "Pilot user did not activate for support flow.");

  const deniedAiSupport = await postRaw("/support/cases", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    case_type: "ACCESS_SUPPORT",
    severity: "HIGH",
    subject: "AI should not open operational support",
    actor: aiActor(tenant.id, firm.firm.id)
  }, headers);
  assert(deniedAiSupport.res.status === 403, `AI support case should be denied, got ${deniedAiSupport.res.status}.`);

  const supportCase = await post("/support/cases", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    related_pilot_user_id: activeUser.id,
    case_type: "ACCESS_SUPPORT",
    severity: "CRITICAL",
    subject: "Pilot user cannot access workspace",
    description: "R4-S3 support triage rehearsal.",
    actor: firm.principal_actor
  }, headers);
  assert(supportCase.status === "OPEN", "Support case did not open.");

  const triaged = await post("/support/cases/update", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    support_case_id: supportCase.id,
    status: "TRIAGED",
    actor: firm.principal_actor
  }, headers);
  assert(triaged.status === "TRIAGED", "Support case did not triage.");

  const escalated = await post("/support/cases/update", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    support_case_id: supportCase.id,
    status: "ESCALATED",
    actor: firm.principal_actor
  }, headers);
  assert(escalated.status === "ESCALATED", "Support case did not escalate.");

  const invalidSupportTransition = await postRaw("/support/cases/update", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    support_case_id: supportCase.id,
    status: "OPEN",
    actor: firm.principal_actor
  }, headers);
  assert(invalidSupportTransition.res.status === 409, `Invalid support transition should be denied, got ${invalidSupportTransition.res.status}.`);

  const incident = await post("/ops/incidents", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    support_case_id: supportCase.id,
    incident_type: "PILOT_ACCESS_CONTROL",
    severity: "SEV2",
    title: "Pilot access incident",
    description: "Escalated access support case requires incident control.",
    impact_summary: "Pilot operator blocked from workspace.",
    detection_source: "support_escalation",
    actor: firm.principal_actor
  }, headers);
  assert(incident.status === "OPEN", "Incident did not open.");

  const mitigating = await post("/ops/incidents/update", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    incident_id: incident.id,
    status: "MITIGATING",
    mitigation_summary: "Suspending pilot identity while access control is investigated.",
    actor: firm.principal_actor
  }, headers);
  assert(mitigating.status === "MITIGATING", "Incident did not enter mitigation.");

  const suspended = await post("/pilot/users/suspend", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    pilot_user_id: activeUser.id,
    suspension_reason: "R4-S3 active incident mitigation",
    actor: firm.principal_actor
  }, headers);
  assert(suspended.invite_status === "SUSPENDED", "Incident suspension path did not suspend pilot user.");

  const resolvedIncident = await post("/ops/incidents/update", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    incident_id: incident.id,
    status: "RESOLVED",
    mitigation_summary: "Access path isolated and pilot identity remains suspended pending owner review.",
    root_cause_summary: "R4-S3 rehearsal root cause summary.",
    actor: firm.principal_actor
  }, headers);
  assert(resolvedIncident.status === "RESOLVED" && resolvedIncident.resolved_at, "Incident did not resolve with timestamp.");

  const closedSupport = await post("/support/cases/update", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    support_case_id: supportCase.id,
    status: "RESOLVED",
    resolution_summary: "Incident resolved; support case ready for closure.",
    actor: firm.principal_actor
  }, headers);
  assert(closedSupport.status === "RESOLVED", "Support case did not resolve.");

  const deniedAiIncidentUpdate = await postRaw("/ops/incidents/update", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    incident_id: incident.id,
    status: "CLOSED",
    actor: aiActor(tenant.id, firm.firm.id)
  }, headers);
  assert(deniedAiIncidentUpdate.res.status === 403, `AI incident update should be denied, got ${deniedAiIncidentUpdate.res.status}.`);

  const summary = await get(`/support/summary?tenant_id=${tenant.id}`, headers);
  assert(summary.counts.support_cases === 1, "Support summary missing support case.");
  assert(summary.counts.critical_cases === 1, "Support summary missing critical case.");

  const metrics = await get(`/ops/operator-metrics?tenant_id=${tenant.id}`, headers);
  assert(metrics.counts.incidents === 1, "Operator metrics missing incident.");
  assert(metrics.counts.active_incidents === 0, "Resolved incident should not remain active.");

  const auditEvents = await get("/audit-events", headers);
  for (const action of ["support_case.opened", "support_case.updated", "pilot_incident.opened", "pilot_incident.updated", "pilot_user.suspended"]) {
    assert(auditEvents.some((event) => event.action === action), `Missing audit action: ${action}`);
  }

  console.log(JSON.stringify({
    smoke: "r4-s3-pilot-support-incident-controls",
    result: "passed",
    support_states: ["OPEN", "TRIAGED", "ESCALATED", "RESOLVED"],
    incident_states: ["OPEN", "MITIGATING", "RESOLVED"],
    denials: ["ai_support_case", "invalid_support_transition", "ai_incident_update"],
    suspension_path: "pilot_user.suspended",
    audit_events_checked: ["support_case.opened", "support_case.updated", "pilot_incident.opened", "pilot_incident.updated", "pilot_user.suspended"]
  }, null, 2));
} finally {
  if (api.exitCode === null && !api.killed) {
    api.kill();
    await once(api, "exit").catch(() => {});
  }
  await rm(tmp, { recursive: true, force: true });
}
