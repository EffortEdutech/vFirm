import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const postgres = process.argv.includes("--postgres");
const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-r3-s3-"));
const port = postgres ? 3130 : 3129;
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
async function fixture(name) {
  return JSON.parse(await readFile(join(root, "tests", "factory-blueprints", name), "utf8"));
}
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

try {
  await wait();
  await post("/mvp/reset", {});
  const stamp = Date.now();
  const tenant = await post("/tenants", { name: `R3-S3 Tenant ${stamp}` });
  const controlFirm = await post("/firms", { tenant_id: tenant.id, name: `R3-S3 Control Firm ${stamp}`, principal_name: "Factory Product Owner" });
  const h = { "x-vfirm-actor-id": controlFirm.principal_actor.id, "x-vfirm-tenant-id": tenant.id, "x-vfirm-role": "principal" };

  const bundle = await fixture("second-formwork-firm.fixture.json");
  const draft = await post("/factory/blueprints/firms", { tenant_id: tenant.id, bundle }, h);
  const validated = await post("/factory/blueprints/firms/validate", { tenant_id: tenant.id, firm_blueprint_id: draft.id }, h);
  assert.equal(validated.blueprint_state, "VALIDATED");
  const approved = await post("/factory/blueprints/firms/approve", { tenant_id: tenant.id, firm_blueprint_id: draft.id }, h);
  assert.equal(approved.blueprint_state, "APPROVED_FOR_PROVISIONING");
  const provisioned = await post("/factory/provisioning-runs", { tenant_id: tenant.id, firm_blueprint_id: draft.id }, h);
  const firmHeaders = { "x-vfirm-actor-id": provisioned.principal_actor.id, "x-vfirm-tenant-id": tenant.id, "x-vfirm-firm-id": provisioned.firm.id, "x-vfirm-role": "principal" };

  const fakeHumanHeaders = { "x-vfirm-actor-id": controlFirm.principal_actor.id, "x-vfirm-tenant-id": tenant.id, "x-vfirm-firm-id": provisioned.firm.id, "x-vfirm-role": "principal" };
  const noAuthority = await post("/factory/provisioning-runs/certify-pack-binding", { tenant_id: tenant.id, firm_id: provisioned.firm.id, provisioning_run_id: provisioned.provisioning_run.id }, fakeHumanHeaders);
  assert.equal(noAuthority.pack_binding_certification.certification_state, "DENIED");
  assert(noAuthority.pack_binding_certification.denial_reasons.some((finding) => finding.code === "VALID_PROFESSIONAL_AUTHORITY_REQUIRED"));
  assert(noAuthority.service_activation_records.every((record) => record.activation_state === "BLOCKED"));

  const incompatible = clone(bundle);
  incompatible.service_delivery_pack_manifest.practice_pack_ref = "practice-pack-unrelated-v1";
  const denied = await post("/factory/provisioning-runs/certify-pack-binding", { tenant_id: tenant.id, firm_id: provisioned.firm.id, provisioning_run_id: provisioned.provisioning_run.id, candidate_bundle: incompatible }, firmHeaders);
  assert.equal(denied.pack_binding_certification.certification_state, "DENIED");
  assert(denied.pack_compatibility_check.findings.some((finding) => finding.code === "PRACTICE_PACK_REF_MISMATCH" || finding.code === "PACK_PRACTICE_REF_MISMATCH"));
  assert(denied.service_activation_records.every((record) => record.activation_state === "BLOCKED"));

  const certified = await post("/factory/provisioning-runs/certify-pack-binding", { tenant_id: tenant.id, firm_id: provisioned.firm.id, provisioning_run_id: provisioned.provisioning_run.id }, firmHeaders);
  assert.equal(certified.pack_compatibility_check.compatibility_status, "PASS");
  assert.equal(certified.pack_binding_certification.certification_state, "CERTIFIED");
  assert(certified.service_activation_records.some((record) => record.service_id === "svc-formwork-delivery-support" && record.activation_state === "ACTIVE"));
  assert.equal(certified.provisioned_firm_instance.service_activation_state, "ACTIVE");

  const readiness = await post("/factory/provisioning-runs/readiness-test", { tenant_id: tenant.id, firm_id: provisioned.firm.id, provisioning_run_id: provisioned.provisioning_run.id }, firmHeaders);
  assert(readiness.readiness_checks.every((check) => check.status === "PASS"));

  const certs = (await req(`/pack-binding-certifications?tenant_id=${tenant.id}&firm_id=${provisioned.firm.id}`, { headers: firmHeaders })).json.data;
  assert(certs.some((item) => item.id === certified.pack_binding_certification.id));
  const activations = (await req(`/service-activation-records?tenant_id=${tenant.id}&firm_id=${provisioned.firm.id}`, { headers: firmHeaders })).json.data;
  assert(activations.some((item) => item.activation_state === "ACTIVE"));
  const exported = (await req(`/data-protection/export-package?tenant_id=${tenant.id}&firm_id=${provisioned.firm.id}`, { headers: firmHeaders })).json.data;
  assert(exported.counts.pack_compatibility_checks >= 3);
  assert(exported.counts.pack_binding_certifications >= 3);
  assert(exported.counts.service_activation_records >= 3);
  const events = (await req(`/event-log?tenant_id=${tenant.id}&firm_id=${provisioned.firm.id}`, { headers: firmHeaders })).json.data;
  for (const eventType of ["pack.compatibility_checked", "pack.binding_denied", "pack.binding_certified", "service.activation_enabled", "service.activation_blocked"]) {
    assert(events.some((event) => event.event_type === eventType), `Missing event ${eventType}`);
  }
  console.log(`R3-S3 Pack Binding and Certification Gates smoke passed (${postgres ? "postgres" : "json"}).`);
} finally {
  if (child.exitCode === null) {
    child.kill();
    await once(child, "exit").catch(() => {});
  }
  await rm(tmp, { recursive: true, force: true });
}