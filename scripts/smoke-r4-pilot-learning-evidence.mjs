import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-r4-s6-"));
const port = 3106;
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
    try { const res = await fetch(`${base}/health`); const json = await res.json(); if (res.ok && json.ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`API did not become healthy. Logs:\n${logs}`);
}
async function request(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, { method, headers: { "content-type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined });
  const json = await response.json();
  return { response, json };
}
async function get(path, headers = {}) { const { response, json } = await request(path, { headers }); if (!response.ok || !json.ok) throw new Error(`${path} failed: ${response.status} ${JSON.stringify(json)}`); return json.data; }
async function post(path, body, headers = {}) { const { response, json } = await request(path, { method: "POST", body, headers }); if (!response.ok || !json.ok) throw new Error(`${path} failed: ${response.status} ${JSON.stringify(json)}`); return json.data; }
async function postRaw(path, body, headers = {}) { return request(path, { method: "POST", body, headers }); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function authHeaders(firm) { return { "x-vfirm-actor-id": firm.principal_actor.id, "x-vfirm-tenant-id": firm.firm.tenant_id, "x-vfirm-firm-id": firm.firm.id, "x-vfirm-role": "principal" }; }

try {
  await waitForHealth();
  const contracts = await get("/contracts");
  assert(contracts.some((contract) => contract.path === "/pilot/r4-evidence-go-no-go"), "R4-S6 evidence/go-no-go contract missing.");

  const tenant = await post("/tenants", { name: "R4 S6 Evidence Tenant" });
  const firm = await post("/firms", { tenant_id: tenant.id, name: "R4 S6 Evidence Firm", principal_name: "Ir. Evidence Principal" });
  const headers = authHeaders(firm);

  const worker = await post("/worker-instances", { tenant_id: tenant.id, firm_id: firm.firm.id, worker_template_code: "front-desk-coordinator", name: "R4-S6 Learning Worker", actor: firm.principal_actor }, headers);
  await post("/worker-instances/activate", { tenant_id: tenant.id, firm_id: firm.firm.id, worker_instance_id: worker.worker_instance.id, actor: firm.principal_actor }, headers);
  await post("/policy/evaluate", { tenant_id: tenant.id, firm_id: firm.firm.id, actor_id: firm.principal_actor.id, actor_type: "HUMAN", action: "pilot.learning.review", resource_type: "Release4Evidence", resource_id: "r4-s6", risk_class: "CONTROLLED", reasons: ["R4-S6 evidence pack review"] }, headers);

  const firstReport = await post("/pilot/report-packs", { tenant_id: tenant.id, firm_id: firm.firm.id, report_scope: "R4_S6_PRIVATE_PILOT_SETUP", actor: firm.principal_actor }, headers);
  const board = await post("/stakeholder-review/boards", { tenant_id: tenant.id, firm_id: firm.firm.id, report_pack_id: firstReport.id, board_name: "R4-S6 Evidence Review Board", actor: firm.principal_actor }, headers);
  const decision = await post("/stakeholder-review/decisions", { tenant_id: tenant.id, firm_id: firm.firm.id, board_id: board.id, decision: "APPROVE_EXPANSION", decision_summary: "Approve bounded private pilot cohort and proceed to Release 4 evidence review.", next_stage: "R4-S6", actor: firm.principal_actor }, headers);

  const cohort = await post("/pilot/expansion-cohorts", { tenant_id: tenant.id, firm_id: firm.firm.id, stakeholder_decision_id: decision.id, cohort_name: "R4-S6 Evidence Cohort", max_tenants: 1, max_pilot_users: 3, actor: firm.principal_actor }, headers);
  await post("/pilot/expansion-cohorts/update", { tenant_id: tenant.id, firm_id: firm.firm.id, expansion_cohort_id: cohort.id, expansion_status: "APPROVED", actor: firm.principal_actor }, headers);
  const plan = await post("/tenant-onboarding/plans", { tenant_id: tenant.id, firm_id: firm.firm.id, expansion_cohort_id: cohort.id, actor: firm.principal_actor }, headers);
  await post("/tenant-onboarding/plans/update", { tenant_id: tenant.id, firm_id: firm.firm.id, onboarding_plan_id: plan.id, onboarding_status: "COMPLETE", actor: firm.principal_actor }, headers);
  await post("/release-candidate/gates", { tenant_id: tenant.id, firm_id: firm.firm.id, expansion_cohort_id: cohort.id, release_candidate: "R4-S6-RC", gate_status: "APPROVED", evidence_refs: ["R4-S1", "R4-S2", "R4-S3", "R4-S4", "R4-S5"], decision_summary: "Release 4 private pilot evidence may proceed.", actor: firm.principal_actor }, headers);

  const activeInvite = await post("/pilot/users/invite", { tenant_id: tenant.id, firm_id: firm.firm.id, email: "r4s6.operator@example.com", display_name: "R4 S6 Operator", pilot_role: "PILOT_OPERATOR", auth_provider: "clerk", actor: firm.principal_actor }, headers);
  await post("/pilot/users/activate", { tenant_id: tenant.id, firm_id: firm.firm.id, pilot_user_id: activeInvite.id, external_subject: "clerk-r4s6-operator", actor: firm.principal_actor }, headers);
  const revokeInvite = await post("/pilot/users/invite", { tenant_id: tenant.id, firm_id: firm.firm.id, email: "r4s6.offboard@example.com", display_name: "R4 S6 Offboard", pilot_role: "PILOT_OBSERVER", auth_provider: "clerk", actor: firm.principal_actor }, headers);
  await post("/pilot/users/revoke", { tenant_id: tenant.id, firm_id: firm.firm.id, pilot_user_id: revokeInvite.id, revocation_reason: "R4-S6 offboarding evidence", actor: firm.principal_actor }, headers);

  const supportCase = await post("/support/cases", { tenant_id: tenant.id, firm_id: firm.firm.id, case_type: "WORKFLOW_BLOCKER", severity: "NORMAL", subject: "R4-S6 support evidence", description: "Support path reviewed for R4-S6 evidence pack.", actor: firm.principal_actor }, headers);
  await post("/support/cases/update", { tenant_id: tenant.id, firm_id: firm.firm.id, support_case_id: supportCase.id, status: "RESOLVED", resolution_summary: "Support evidence ready.", actor: firm.principal_actor }, headers);
  const incident = await post("/ops/incidents", { tenant_id: tenant.id, firm_id: firm.firm.id, incident_type: "R4_EVIDENCE_REHEARSAL", severity: "SEV4", title: "R4-S6 incident evidence", description: "Incident path reviewed for R4-S6 evidence pack.", impact_summary: "No active pilot impact.", detection_source: "r4-s6-smoke", actor: firm.principal_actor }, headers);
  await post("/ops/incidents/update", { tenant_id: tenant.id, firm_id: firm.firm.id, incident_id: incident.id, status: "RESOLVED", mitigation_summary: "Resolved for evidence pack.", root_cause_summary: "R4-S6 rehearsal.", actor: firm.principal_actor }, headers);

  await post("/pilot/private-cohort/activate", { tenant_id: tenant.id, firm_id: firm.firm.id, expansion_cohort_id: cohort.id, actor: firm.principal_actor }, headers);

  const positiveFeedback = await post("/pilot/feedback", { tenant_id: tenant.id, firm_id: firm.firm.id, feedback_type: "PILOT_ACCEPTANCE", sentiment: "POSITIVE", rating: 5, subject: "Private pilot workflow acceptable", feedback_text: "The controlled private pilot flow is ready for Release 4 acceptance review.", actor: firm.principal_actor }, headers);
  const negativeFeedback = await post("/pilot/feedback", { tenant_id: tenant.id, firm_id: firm.firm.id, feedback_type: "USABILITY", sentiment: "NEGATIVE", rating: 3, subject: "Evidence labels need clearer names", feedback_text: "Operator wants clearer labels on evidence checks before wider pilot use.", actor: firm.principal_actor }, headers);
  const review = await post("/pilot/acceptance-reviews", { tenant_id: tenant.id, firm_id: firm.firm.id, decision: "PASS", criteria: [{ criterion: "Private pilot cohort activation controlled", result: "PASS" }, { criterion: "Learning loop converts feedback to backlog", result: "PASS" }], notes: "Release 4 evidence is acceptable for product-owner decision.", actor: firm.principal_actor }, headers);
  const improvement = await post("/pilot/improvement-items", { tenant_id: tenant.id, firm_id: firm.firm.id, feedback_id: negativeFeedback.id, acceptance_review_id: review.id, priority: "P1", title: "Clarify Release 4 evidence labels", description: "Improve operator-facing labels in the evidence pack before the next pilot cycle.", target_stage: "R4 evidence polish", actor: firm.principal_actor }, headers);
  await post("/pilot/improvement-items/update", { tenant_id: tenant.id, firm_id: firm.firm.id, improvement_item_id: improvement.id, status: "DONE", actor: firm.principal_actor }, headers);

  const outOfScope = await postRaw("/pilot/improvement-items", { tenant_id: tenant.id, firm_id: firm.firm.id, feedback_id: positiveFeedback.id, priority: "P2", title: "Open public marketplace with live payment capture", description: "This should not enter Release 4 backlog.", target_stage: "public marketplace and live payment capture", actor: firm.principal_actor }, headers);
  assert(outOfScope.response.status === 403, `Out-of-scope improvement should be denied, got ${outOfScope.response.status}.`);
  assert(outOfScope.json.error.code === "R4_LEARNING_SCOPE_BOUNDARY_DENIED", `Unexpected denial code: ${JSON.stringify(outOfScope.json)}`);

  const learningLoop = await get(`/pilot/learning-loop?tenant_id=${tenant.id}&firm_id=${firm.firm.id}`, headers);
  assert(learningLoop.counts.feedback === 2, "Feedback intake count mismatch.");
  assert(learningLoop.counts.positive_feedback === 1 && learningLoop.counts.negative_feedback === 1, "Feedback classification mismatch.");
  assert(learningLoop.counts.open_improvements === 0, "Governed backlog should have no open improvements after closure.");

  const evidence = await get(`/pilot/r4-evidence-go-no-go?tenant_id=${tenant.id}&firm_id=${firm.firm.id}&cohort_id=${cohort.id}`, headers);
  assert(evidence.status === "EVIDENCE_READY", `Release 4 evidence should be ready: ${JSON.stringify(evidence.blocked_reasons)}`);
  assert(evidence.recommendation === "GO_FOR_RELEASE_4_ACCEPTANCE", `Unexpected recommendation: ${evidence.recommendation}`);
  assert(evidence.checks.every((check) => check.status === "PASS"), `Not all R4-S6 checks pass: ${JSON.stringify(evidence.checks)}`);
  assert(evidence.boundaries.includes("no_public_marketplace") && evidence.boundaries.includes("no_live_payment_movement"), "Release 4 scope boundaries missing.");

  console.log(JSON.stringify({
    smoke: "r4-s6-pilot-learning-evidence",
    result: "passed",
    evidence_status: evidence.status,
    recommendation: evidence.recommendation,
    learning_counts: learningLoop.counts,
    evidence_counts: evidence.evidence_pack.counts,
    checks: evidence.checks.map((check) => `${check.key}:${check.status}`),
    denials: ["out_of_scope_learning_backlog"],
    boundaries: evidence.boundaries
  }, null, 2));
} finally {
  if (api.exitCode === null && !api.killed) {
    api.kill();
    await once(api, "exit").catch(() => {});
  }
  await rm(tmp, { recursive: true, force: true });
}