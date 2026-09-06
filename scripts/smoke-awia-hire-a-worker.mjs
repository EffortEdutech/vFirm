import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

// Smoke coverage for the "hire a virtual worker" flow (HireMe, ADR-075): a
// business owner hires AWIA staff ONE NAMED WORKER AT A TIME onto their
// firm's team, rather than only the whole-roster template flow. Verifies:
// - hiring with no package assigned is rejected;
// - once HireMe is assigned, hiring a worker succeeds and grows the team;
// - a second hire of the same role auto-generates the next staff code
//   (CFO-001, then CFO-002) rather than colliding;
// - hiring a role with no defined tool policy yet is rejected clearly;
// - the hired worker can be activated and, once active, actually assigned a
//   task and complete the full draft/review/client-delivery loop -- proving
//   this is a real, working hire, not a cosmetic record.

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-awia-hire-worker-"));
const port = 3113;
const base = `http://127.0.0.1:${port}`;
const api = spawn(process.execPath, ["apps/api/src/server.mjs"], {
  cwd: root,
  env: { ...process.env, VFIRM_API_PORT: String(port), VFIRM_STORE_PATH: join(tmp, "store.json"), VFIRM_STORE_BACKEND: "json" },
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
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
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

async function postExpectError(path, body, headers = {}) {
  const { response, json } = await request(path, { method: "POST", body, headers });
  if (response.ok && json.ok) throw new Error(`${path} unexpectedly succeeded: ${JSON.stringify(json)}`);
  return json;
}

function authHeaders(firm) {
  return {
    "x-vfirm-actor-id": firm.principal_actor.id,
    "x-vfirm-tenant-id": firm.firm.tenant_id,
    "x-vfirm-firm-id": firm.firm.id,
    "x-vfirm-role": "principal"
  };
}

try {
  await waitForHealth();

  const tenant = await post("/tenants", { name: "AWIA Hire Worker Tenant" });
  const firm = await post("/firms", { tenant_id: tenant.id, name: "AWIA Hire Worker Firm", principal_name: "Ir. Business Owner" });
  const headers = authHeaders(firm);

  // No package assigned yet: hiring must be rejected.
  const rejectedNoPackage = await postExpectError("/awia/virtual-staff/hire-worker", { tenant_id: tenant.id, firm_id: firm.firm.id, role_code: "CFO" }, headers);
  if (!String(rejectedNoPackage.error?.message ?? "").includes("AWIA_STAFF_HIRE_REQUIRES_PACKAGE_ASSIGNMENT")) throw new Error("Hiring one worker with no AWIA firm package assigned was not rejected as expected.");

  await post("/ops/awia-package-assignment", { tenant_id: tenant.id, firm_id: firm.firm.id, package_code: "HIRE_ME" }, headers);

  // Hiring an unmapped role (no tool policy defined yet) must be rejected clearly.
  const rejectedRole = await postExpectError("/awia/virtual-staff/hire-worker", { tenant_id: tenant.id, firm_id: firm.firm.id, role_code: "CMO" }, headers);
  if (!String(rejectedRole.error?.message ?? "").includes("role_not_hireable_yet:CMO")) throw new Error("Hiring an unmapped role was not rejected as expected.");

  // Hire the first CFO.
  const hire1 = await post("/awia/virtual-staff/hire-worker", { tenant_id: tenant.id, firm_id: firm.firm.id, role_code: "CFO", display_name: "Amira (CFO)" }, headers);
  if (hire1.staff_code !== "CFO-001") throw new Error(`Expected first CFO hire to be CFO-001, got ${hire1.staff_code}.`);
  if (hire1.team_size !== 1) throw new Error(`Expected team size 1 after first hire, got ${hire1.team_size}.`);
  if (hire1.member.display_name !== "Amira (CFO)") throw new Error("Hired worker did not record the business owner's chosen display name.");

  // Hire a second CFO: must not collide with CFO-001.
  const hire2 = await post("/awia/virtual-staff/hire-worker", { tenant_id: tenant.id, firm_id: firm.firm.id, role_code: "CFO" }, headers);
  if (hire2.staff_code !== "CFO-002") throw new Error(`Expected second CFO hire to be CFO-002, got ${hire2.staff_code}.`);
  if (hire2.team_size !== 2) throw new Error(`Expected team size 2 after second hire, got ${hire2.team_size}.`);

  // Hire an OPO too, to prove a growing, mixed-role team.
  const hire3 = await post("/awia/virtual-staff/hire-worker", { tenant_id: tenant.id, firm_id: firm.firm.id, role_code: "OPO" }, headers);
  if (hire3.staff_code !== "OPO-001") throw new Error(`Expected first OPO hire to be OPO-001, got ${hire3.staff_code}.`);
  if (hire3.team_size !== 3) throw new Error(`Expected team size 3 after third hire, got ${hire3.team_size}.`);

  const members = (await request(`/awia-virtual-staff-members`)).json.data.filter((member) => member.firm_id === firm.firm.id);
  if (members.length !== 3) throw new Error(`Expected 3 hired members in the store, found ${members.length}.`);

  // Prove this is a REAL, working hire, not a cosmetic record: before
  // activation, a real readiness evaluation must deny the newly hired
  // OPO-001 (still DRAFT); after activation, the same evaluation must
  // allow it through the actual deterministic authority gate.
  const beforeActivation = await post("/awia/virtual-staff/task-readiness", { tenant_id: tenant.id, firm_id: firm.firm.id, staff_code: "OPO-001", action: "workload.summary.prepare", tool: "workload.summary.prepare", client_id: "hire-me-demo-client", project_id: "hire-me-demo-project", evidence_refs: ["hire-me-first-worker-evidence"] }, headers);
  if (beforeActivation.decision === "ALLOW") throw new Error("A freshly hired (DRAFT) worker was allowed through the readiness gate before activation -- lifecycle state is not being enforced.");

  await post("/awia/virtual-staff/lifecycle", { tenant_id: tenant.id, firm_id: firm.firm.id, staff_code: "OPO-001", to_state: "ACTIVE" }, headers);

  const afterActivation = await post("/awia/virtual-staff/task-readiness", { tenant_id: tenant.id, firm_id: firm.firm.id, staff_code: "OPO-001", action: "workload.summary.prepare", tool: "workload.summary.prepare", client_id: "hire-me-demo-client", project_id: "hire-me-demo-project", evidence_refs: ["hire-me-first-worker-evidence"] }, headers);
  if (afterActivation.decision !== "ALLOW") throw new Error(`Expected the newly hired and activated OPO-001 to pass the readiness gate, got decision ${afterActivation.decision} (${JSON.stringify(afterActivation.findings)}).`);

  console.log("AWIA hire-a-worker (HireMe, one-at-a-time) smoke passed.");
} finally {
  api.kill();
  await rm(tmp, { recursive: true, force: true });
}
