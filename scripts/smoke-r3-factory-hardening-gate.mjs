import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const postgres = process.argv.includes("--postgres");
const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-r3-s5-"));
const port = postgres ? 3136 : 3135;
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
function expectFinding(record, code) {
  const findings = record.validation_findings ?? record.findings ?? record.denial_reasons ?? [];
  assert(findings.some((finding) => finding.code === code), `Expected finding ${code}, got ${JSON.stringify(findings)}`);
}

try {
  await wait();
  await post("/mvp/reset", {});
  const stamp = Date.now();
  const tenant = await post("/tenants", { name: `R3-S5 Tenant ${stamp}` });
  const controlFirm = await post("/firms", { tenant_id: tenant.id, name: `R3-S5 Factory Control ${stamp}`, principal_name: "Factory Product Owner" });
  const h = { "x-vfirm-actor-id": controlFirm.principal_actor.id, "x-vfirm-tenant-id": tenant.id, "x-vfirm-role": "principal" };

  const invalidCases = [
    ["invalid-missing-principal.fixture.json", "VIRTUAL_PRINCIPAL_REQUIRED"],
    ["invalid-missing-responsible-professional.fixture.json", "RESPONSIBLE_PROFESSIONAL_REQUIRED"],
    ["invalid-jurisdiction.fixture.json", "SERVICE_JURISDICTION_NOT_ACTIVE"],
    ["invalid-unsafe-worker-authority.fixture.json", "UNSAFE_WORKER_AUTHORITY"],
    ["invalid-approval-bypass-pack.fixture.json", "APPROVAL_BYPASS_STATE_DENIED"]
  ];
  for (const [name, code] of invalidCases) {
    const draft = await post("/factory/blueprints/firms", { tenant_id: tenant.id, blueprint_code: `r3-s5-${name}-${stamp}`, bundle: await fixture(name) }, h);
    const validation = await post("/factory/blueprints/firms/validate", { tenant_id: tenant.id, firm_blueprint_id: draft.id }, h);
    assert.equal(validation.blueprint_state, "VALIDATION_FAILED", name);
    expectFinding(validation, code);
    const approval = await req("/factory/blueprints/firms/approve", { method: "POST", headers: h, body: { tenant_id: tenant.id, firm_blueprint_id: draft.id } });
    assert(approval.response.status >= 400, `${name} should not approve`);
    const provision = await req("/factory/provisioning-runs", { method: "POST", headers: h, body: { tenant_id: tenant.id, firm_blueprint_id: draft.id } });
    assert(provision.response.status >= 400, `${name} should not provision`);
  }

  const validBundle = await fixture("second-formwork-firm.fixture.json");
  const validDraft = await post("/factory/blueprints/firms", { tenant_id: tenant.id, blueprint_code: `r3-s5-valid-${stamp}`, bundle: validBundle }, h);
  const unapprovedProvision = await req("/factory/provisioning-runs", { method: "POST", headers: h, body: { tenant_id: tenant.id, firm_blueprint_id: validDraft.id } });
  assert(unapprovedProvision.response.status >= 400, "unapproved blueprint should not provision");

  await post("/factory/blueprints/firms/validate", { tenant_id: tenant.id, firm_blueprint_id: validDraft.id }, h);
  const systemActor = { actor_id: "00000000-0000-0000-0000-000000000000", actor_type: "SYSTEM", tenant_id: tenant.id, role: "system" };
  const systemApproval = await req("/factory/blueprints/firms/approve", { method: "POST", headers: h, body: { tenant_id: tenant.id, firm_blueprint_id: validDraft.id, actor: systemActor } });
  assert(systemApproval.response.status >= 400, "system actor should not approve blueprint");
  await post("/factory/blueprints/firms/approve", { tenant_id: tenant.id, firm_blueprint_id: validDraft.id }, h);
  const provisioned = await post("/factory/provisioning-runs", { tenant_id: tenant.id, firm_blueprint_id: validDraft.id }, h);
  const duplicate = await req("/factory/provisioning-runs", { method: "POST", headers: h, body: { tenant_id: tenant.id, firm_blueprint_id: validDraft.id } });
  assert(duplicate.response.status >= 400, "duplicate provisioning should be denied");

  const provisionedHeaders = { "x-vfirm-actor-id": provisioned.principal_actor.id, "x-vfirm-tenant-id": tenant.id, "x-vfirm-firm-id": provisioned.firm.id, "x-vfirm-role": "principal" };
  const controlAsProvisionedFirm = { "x-vfirm-actor-id": controlFirm.principal_actor.id, "x-vfirm-tenant-id": tenant.id, "x-vfirm-firm-id": provisioned.firm.id, "x-vfirm-role": "principal" };
  const noAuthority = await post("/factory/provisioning-runs/certify-pack-binding", { tenant_id: tenant.id, firm_id: provisioned.firm.id, provisioning_run_id: provisioned.provisioning_run.id }, controlAsProvisionedFirm);
  assert.equal(noAuthority.pack_binding_certification.certification_state, "DENIED");
  expectFinding(noAuthority.pack_binding_certification, "VALID_PROFESSIONAL_AUTHORITY_REQUIRED");

  const incompatible = clone(validBundle);
  incompatible.service_delivery_pack_manifest.practice_pack_ref = "practice-pack-not-compatible-v1";
  const badPack = await post("/factory/provisioning-runs/certify-pack-binding", { tenant_id: tenant.id, firm_id: provisioned.firm.id, provisioning_run_id: provisioned.provisioning_run.id, candidate_bundle: incompatible }, provisionedHeaders);
  assert.equal(badPack.pack_binding_certification.certification_state, "DENIED");
  assert(badPack.service_activation_records.every((item) => item.activation_state === "BLOCKED"));
  assert(badPack.pack_compatibility_check.findings.some((finding) => ["PRACTICE_PACK_REF_MISMATCH", "PACK_PRACTICE_REF_MISMATCH"].includes(finding.code)));

  const missingCredentialRule = clone(validBundle);
  missingCredentialRule.jurisdiction_pack_manifest.credential_rules = [];
  const badCredential = await post("/factory/provisioning-runs/certify-pack-binding", { tenant_id: tenant.id, firm_id: provisioned.firm.id, provisioning_run_id: provisioned.provisioning_run.id, candidate_bundle: missingCredentialRule }, provisionedHeaders);
  assert.equal(badCredential.pack_binding_certification.certification_state, "DENIED");
  expectFinding(badCredential.pack_binding_certification, "CREDENTIAL_RULE_REQUIRED");

  const certified = await post("/factory/provisioning-runs/certify-pack-binding", { tenant_id: tenant.id, firm_id: provisioned.firm.id, provisioning_run_id: provisioned.provisioning_run.id }, provisionedHeaders);
  assert.equal(certified.pack_binding_certification.certification_state, "CERTIFIED");
  assert(certified.service_activation_records.some((item) => item.activation_state === "ACTIVE"));

  const otherTenant = await post("/tenants", { name: `R3-S5 Other ${stamp}` });
  const otherFirm = await post("/firms", { tenant_id: otherTenant.id, name: `R3-S5 Other Firm ${stamp}`, principal_name: "Other Principal" });
  const oh = { "x-vfirm-actor-id": otherFirm.principal_actor.id, "x-vfirm-tenant-id": otherTenant.id, "x-vfirm-firm-id": otherFirm.firm.id, "x-vfirm-role": "principal" };
  const blueprintLeak = await req(`/factory-firm-blueprints?tenant_id=${tenant.id}`, { headers: oh });
  assert(blueprintLeak.response.status >= 400, "cross-tenant blueprint read should be denied");
  const provisioningLeak = await req(`/factory-provisioning-runs?tenant_id=${tenant.id}`, { headers: oh });
  assert(provisioningLeak.response.status >= 400, "cross-tenant provisioning read should be denied");
  const workerLeak = await req(`/factory-worker-bindings?tenant_id=${tenant.id}&firm_id=${provisioned.firm.id}`, { headers: oh });
  assert(workerLeak.response.status >= 400, "cross-tenant worker binding read should be denied");
  const auditLeak = await req(`/audit-events?tenant_id=${tenant.id}&firm_id=${provisioned.firm.id}`, { headers: oh });
  assert(auditLeak.response.status >= 400, "cross-tenant audit read should be denied");
  const exportLeak = await req(`/data-protection/export-package?tenant_id=${tenant.id}&firm_id=${provisioned.firm.id}`, { headers: oh });
  assert(exportLeak.response.status >= 400, "cross-tenant export should be denied");

  const exportPackage = (await req(`/data-protection/export-package?tenant_id=${tenant.id}&firm_id=${provisioned.firm.id}`, { headers: provisionedHeaders })).json.data;
  assert(exportPackage.counts.pack_binding_certifications >= 4);
  assert(exportPackage.counts.service_activation_records >= 4);
  const events = (await req(`/event-log?tenant_id=${tenant.id}&firm_id=${provisioned.firm.id}`, { headers: provisionedHeaders })).json.data;
  assert(events.some((event) => event.event_type === "pack.binding_denied"));
  assert(events.some((event) => event.event_type === "pack.binding_certified"));
  assert(events.some((event) => event.event_type === "service.activation_blocked"));
  assert(events.some((event) => event.event_type === "service.activation_enabled"));
  const audits = (await req(`/audit-events?tenant_id=${tenant.id}&firm_id=${provisioned.firm.id}`, { headers: provisionedHeaders })).json.data;
  assert(audits.some((audit) => audit.action === "pack.binding_denied"));
  assert(audits.some((audit) => audit.action === "pack.binding_certified"));

  console.log(`R3-S5 Factory Hardening Gate smoke passed (${postgres ? "postgres" : "json"}).`);
} finally {
  if (child.exitCode === null) {
    child.kill();
    await once(child, "exit").catch(() => {});
  }
  await rm(tmp, { recursive: true, force: true });
}