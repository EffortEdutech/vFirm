import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const postgres = process.argv.includes("--postgres");
const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-r3-s2-"));
const port = postgres ? 3128 : 3127;
const base = `http://127.0.0.1:${port}`;
const env = { ...process.env, VFIRM_API_PORT: String(port) };
if (!postgres) {
  env.VFIRM_STORE_BACKEND = "json";
  env.VFIRM_STORE_PATH = join(tmp, "store.json");
  env.DATABASE_URL = "";
} else {
  env.VFIRM_STORE_BACKEND = "postgres";
  delete env.VFIRM_STORE_PATH;
}

const child = spawn(process.execPath, ["apps/api/src/server.mjs"], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
let logs = "";
child.stdout.on("data", (x) => logs += x);
child.stderr.on("data", (x) => logs += x);

async function wait() {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(base + "/health")).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(logs);
}
async function req(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(base + path, { method, headers: { "content-type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined });
  return { response, json: await response.json() };
}
async function post(path, body, headers = {}) {
  const { response, json } = await req(path, { method: "POST", body, headers });
  if (!response.ok || !json.ok) throw new Error(`${path}: ${response.status} ${JSON.stringify(json)}`);
  return json.data;
}
const fixture = async (name) => JSON.parse(await readFile(join(root, "tests", "factory-blueprints", name), "utf8"));

try {
  await wait();
  await post("/mvp/reset", {});
  const stamp = Date.now();
  const tenant = await post("/tenants", { name: `R3-S2 Tenant ${stamp}` });
  const firm = await post("/firms", { tenant_id: tenant.id, name: `R3-S2 Control Firm ${stamp}`, principal_name: "Factory Product Owner" });
  const h = { "x-vfirm-actor-id": firm.principal_actor.id, "x-vfirm-tenant-id": tenant.id, "x-vfirm-role": "principal" };

  const invalid = await post("/factory/blueprints/firms", { tenant_id: tenant.id, bundle: await fixture("invalid-missing-principal.fixture.json") }, h);
  assert.equal(invalid.blueprint_state, "DRAFT");
  const invalidValidation = await post("/factory/blueprints/firms/validate", { tenant_id: tenant.id, firm_blueprint_id: invalid.id }, h);
  assert.equal(invalidValidation.blueprint_state, "VALIDATION_FAILED");
  assert(invalidValidation.validation_findings.some((finding) => finding.code === "VIRTUAL_PRINCIPAL_REQUIRED"));
  const invalidApproval = await req("/factory/blueprints/firms/approve", { method: "POST", headers: h, body: { tenant_id: tenant.id, firm_blueprint_id: invalid.id } });
  assert(invalidApproval.response.status >= 400);

  const draft = await post("/factory/blueprints/firms", { tenant_id: tenant.id, bundle: await fixture("second-formwork-firm.fixture.json") }, h);
  assert.equal(draft.blueprint_state, "DRAFT");
  const validated = await post("/factory/blueprints/firms/validate", { tenant_id: tenant.id, firm_blueprint_id: draft.id }, h);
  assert.equal(validated.blueprint_state, "VALIDATED");
  const systemActor = { actor_id: "00000000-0000-0000-0000-000000000000", actor_type: "SYSTEM", tenant_id: tenant.id, role: "system" };
  const systemApproval = await req("/factory/blueprints/firms/approve", { method: "POST", body: { tenant_id: tenant.id, firm_blueprint_id: draft.id, actor: systemActor }, headers: h });
  assert(systemApproval.response.status >= 400);
  const approved = await post("/factory/blueprints/firms/approve", { tenant_id: tenant.id, firm_blueprint_id: draft.id }, h);
  assert.equal(approved.blueprint_state, "APPROVED_FOR_PROVISIONING");
  const provisioned = await post("/factory/provisioning-runs", { tenant_id: tenant.id, firm_blueprint_id: draft.id }, h);
  assert.equal(provisioned.provisioning_run.provisioning_state, "PROVISIONED");
  assert.equal(provisioned.provisioned_firm_instance.instance_status, "PROVISIONED");
  assert(provisioned.worker_bindings.length >= 2);
  assert(provisioned.worker_bindings.every((binding) => binding.binding_state === "BOUND" && binding.authority_envelope && binding.supervisor_actor_id));
  const duplicate = await req("/factory/provisioning-runs", { method: "POST", body: { tenant_id: tenant.id, firm_blueprint_id: draft.id }, headers: h });
  assert(duplicate.response.status >= 400);
  const provisionedHeaders = { ...h, "x-vfirm-firm-id": provisioned.firm.id };
  const readiness = await post("/factory/provisioning-runs/readiness-test", { tenant_id: tenant.id, firm_id: provisioned.firm.id, provisioning_run_id: provisioned.provisioning_run.id }, provisionedHeaders);
  assert.equal(readiness.provisioning_run.provisioning_state, "READY_FOR_HANDOFF");
  assert(readiness.readiness_checks.every((check) => check.status === "PASS"));
  const handoff = await post("/factory/provisioning-runs/accept-handoff", { tenant_id: tenant.id, firm_id: provisioned.firm.id, provisioning_run_id: provisioned.provisioning_run.id, decision_summary: "R3-S2 provisioning kernel accepted for controlled local pilot." }, provisionedHeaders);
  assert.equal(handoff.provisioning_run.provisioning_state, "ACCEPTED_FOR_LOCAL_PILOT");

  const list = (await req(`/factory-provisioning-runs?tenant_id=${tenant.id}`, { headers: h })).json.data;
  assert(list.some((item) => item.id === provisioned.provisioning_run.id));
  const exported = (await req(`/data-protection/export-package?tenant_id=${tenant.id}`, { headers: h })).json.data;
  assert(exported.counts.factory_firm_blueprints >= 2);
  assert(exported.counts.factory_provisioning_runs >= 1);
  assert(exported.counts.provisioned_firm_instances >= 1);
  assert(exported.counts.factory_worker_bindings >= 2);
  const otherTenant = await post("/tenants", { name: `R3-S2 Other ${stamp}` });
  const otherFirm = await post("/firms", { tenant_id: otherTenant.id, name: `R3-S2 Other Firm ${stamp}`, principal_name: "Other Principal" });
  const oh = { "x-vfirm-actor-id": otherFirm.principal_actor.id, "x-vfirm-tenant-id": otherTenant.id, "x-vfirm-role": "principal" };
  const isolated = await req(`/factory-provisioning-runs?tenant_id=${tenant.id}`, { headers: oh });
  assert(isolated.response.status >= 400);
  const events = (await req(`/event-log?tenant_id=${tenant.id}`, { headers: h })).json.data;
  for (const eventType of ["firm_blueprint.created", "firm_blueprint.validated", "firm_blueprint.approved_for_provisioning", "firm_instance.provisioned", "worker_binding.created", "factory_readiness.checked", "factory_handoff.accepted"]) {
    assert(events.some((event) => event.event_type === eventType), `Missing event ${eventType}`);
  }
  console.log(`R3-S2 Provisioning Kernel smoke passed (${postgres ? "postgres" : "json"}).`);
} finally {
  if (child.exitCode === null) {
    child.kill();
    await once(child, "exit").catch(() => {});
  }
  await rm(tmp, { recursive: true, force: true });
}