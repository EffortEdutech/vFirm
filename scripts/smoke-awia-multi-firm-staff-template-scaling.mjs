import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-awia-templates-"));
const port = 3111;
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

  const templates = (await request("/awia/virtual-staff/templates")).json.data;
  if (templates.templates.length !== 3) throw new Error(`Expected 3 catalogued AWIA staff templates, got ${templates.templates.length}.`);

  const tenantA = await post("/tenants", { name: "AWIA Template Firm A Tenant" });
  const firmA = await post("/firms", { tenant_id: tenantA.id, name: "AWIA Template Firm A", principal_name: "Ir. Principal A" });
  const headersA = authHeaders(firmA);
  const actorA = firmA.principal_actor;

  const tenantB = await post("/tenants", { name: "AWIA Template Firm B Tenant" });
  const firmB = await post("/firms", { tenant_id: tenantB.id, name: "AWIA Template Firm B", principal_name: "Ir. Principal B" });
  const headersB = authHeaders(firmB);
  const actorB = firmB.principal_actor;

  const runA = await post("/awia/virtual-staff/provision-from-template", { tenant_id: tenantA.id, firm_id: firmA.firm.id, template_id: "lean_advisory_practice_v1", actor: actorA }, headersA);
  if (runA.provisioning_run.summary.member_count !== 3) throw new Error(`Expected Firm A lean_advisory_practice_v1 to provision 3 staff, got ${runA.provisioning_run.summary.member_count}.`);
  if (runA.provisioning_run.template_id !== "lean_advisory_practice_v1") throw new Error("Firm A provisioning run did not record its template_id.");

  const runB = await post("/awia/virtual-staff/provision-from-template", { tenant_id: tenantB.id, firm_id: firmB.firm.id, template_id: "finance_back_office_v1", actor: actorB }, headersB);
  if (runB.provisioning_run.summary.member_count !== 4) throw new Error(`Expected Firm B finance_back_office_v1 to provision 4 staff, got ${runB.provisioning_run.summary.member_count}.`);

  // Rejected: unknown template id.
  const tenantC = await post("/tenants", { name: "AWIA Template Firm C Tenant" });
  const firmC = await post("/firms", { tenant_id: tenantC.id, name: "AWIA Template Firm C", principal_name: "Ir. Principal C" });
  const headersC = authHeaders(firmC);
  const rejectedTemplate = await postExpectError("/awia/virtual-staff/provision-from-template", { tenant_id: tenantC.id, firm_id: firmC.firm.id, template_id: "nonexistent_template_v1", actor: firmC.principal_actor }, headersC);
  if (!String(rejectedTemplate.error?.message ?? "").includes("awia_staff_template_not_recognized")) throw new Error("Unknown AWIA staff template was not rejected as expected.");

  // Rejected: re-provisioning an already-provisioned firm.
  const rejectedDuplicate = await postExpectError("/awia/virtual-staff/provision-from-template", { tenant_id: tenantA.id, firm_id: firmA.firm.id, template_id: "finance_back_office_v1", actor: actorA }, headersA);
  if (!String(rejectedDuplicate.error?.message ?? "").includes("already provisioned")) throw new Error("Duplicate provisioning of an already-provisioned firm was not rejected as expected.");

  // Tenant/firm isolation: each firm only sees its own members.
  const membersA = (await request(`/awia-virtual-staff-members`)).json.data.filter((member) => member.firm_id === firmA.firm.id);
  const membersB = (await request(`/awia-virtual-staff-members`)).json.data.filter((member) => member.firm_id === firmB.firm.id);
  if (membersA.length !== 3) throw new Error(`Expected 3 persisted members for Firm A, got ${membersA.length}.`);
  if (membersB.length !== 4) throw new Error(`Expected 4 persisted members for Firm B, got ${membersB.length}.`);
  if (membersA.some((member) => member.firm_id === firmB.firm.id) || membersB.some((member) => member.firm_id === firmA.firm.id)) throw new Error("AWIA staff template scaling leaked members across firms.");

  const seatsA = (await request(`/awia-virtual-staff-seats`)).json.data.filter((seat) => seat.firm_id === firmA.firm.id);
  if (!seatsA.every((seat) => seat.template_id === "lean_advisory_practice_v1")) throw new Error("Firm A seats were not tagged with their provisioning template_id.");

  console.log("AWIA multi-firm staff template scaling smoke passed.");
} finally {
  api.kill();
  await rm(tmp, { recursive: true, force: true });
}
