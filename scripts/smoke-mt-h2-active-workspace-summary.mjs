import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const tempDir = await mkdtemp(join(tmpdir(), "vfirm-mt-h2-"));
const storePath = join(tempDir, "store.json");
const port = 3102;
const baseUrl = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
  env: { ...process.env, VFIRM_API_PORT: String(port), VFIRM_STORE_PATH: storePath },
  stdio: ["ignore", "pipe", "pipe"]
});

const logs = [];
child.stdout.on("data", (chunk) => logs.push(chunk.toString()));
child.stderr.on("data", (chunk) => logs.push(chunk.toString()));

async function waitForHealth() {
  const started = Date.now();
  while (Date.now() - started < 6000) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return response.json();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`MT-H2 API health check timed out.\n${logs.join("")}`);
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await response.json().catch(() => ({ ok: false, error: { message: "Non-JSON response" } }));
  return { response, json };
}

async function post(path, body, headers = {}) {
  const { response, json } = await request(path, { method: "POST", body, headers });
  assert.equal(response.ok, true, `${path} HTTP ${response.status}: ${JSON.stringify(json)}`);
  assert.equal(json.ok, true, `${path} failed: ${JSON.stringify(json)}`);
  return json.data;
}

async function getOk(path, headers = {}) {
  const { response, json } = await request(path, { headers });
  assert.equal(response.ok, true, `${path} HTTP ${response.status}: ${JSON.stringify(json)}`);
  assert.equal(json.ok, true, `${path} failed: ${JSON.stringify(json)}`);
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

async function createFirmWorkspace({ tenantName, firmName, principalName, active_practices, metadata }) {
  const tenant = await post("/tenants", { name: tenantName });
  const firmResult = await post("/firms", { tenant_id: tenant.id, name: firmName, principal_name: principalName, active_practices, metadata });
  const headers = authHeaders(firmResult);
  return { tenant, firmResult, headers };
}

try {
  await waitForHealth();

  const formwork = await createFirmWorkspace({
    tenantName: "MT H2 Formwork Tenant",
    firmName: "MT H2 Formwork Engineering Firm",
    principalName: "Ir. MT H2 Formwork Principal",
    active_practices: ["temporary_works_formwork"]
  });

  const nhl = await createFirmWorkspace({
    tenantName: "NHL Global Solution Tenant",
    firmName: "NHL Global Solution",
    principalName: "Nur Hernieliana",
    active_practices: ["organization_support", "bizkick_edcs"],
    metadata: { workspace_profile: { workspace_code: "nhl-global-solution", principal_display_name: "Nur Hernieliana" } }
  });

  const rehearsal = await createFirmWorkspace({
    tenantName: "PD H2 Private Directory Pilot Tenant",
    firmName: "PD H2 Requesting Virtual Firm",
    principalName: "Pn. Pilot Requester",
    metadata: { workspace_classification: "REHEARSAL" }
  });

  await post("/subscriptions/packages", {
    tenant_id: nhl.tenant.id,
    firm_id: nhl.firmResult.firm.id,
    package_code: "VF-ORG-SUPPORT-PILOT",
    package_name: "Organization Support and EDCS Pilot Workspace",
    package_status: "ACTIVE",
    pricing_model: "CONTROLLED_PILOT",
    features: ["project reporting", "technical writing", "clerical work", "BizKick EDCS"],
    metadata: {
      service_lines: [
        { service_code: "project_reporting", service_name: "Project Reporting", service_type: "ORGANIZATION_SUPPORT", status: "ACTIVE", requires_human_approval: true, regulated_work: false },
        { service_code: "technical_writing", service_name: "Technical Writing", service_type: "ORGANIZATION_SUPPORT", status: "ACTIVE", requires_human_approval: true, regulated_work: false },
        { service_code: "clerical_work", service_name: "Clerical Work", service_type: "ADMINISTRATIVE_SUPPORT", status: "ACTIVE", requires_human_approval: true, regulated_work: false },
        { service_code: "bizkick_edcs", service_name: "BizKick EDCS", service_type: "ORGANIZATION_SUPPORT", status: "ACTIVE", requires_human_approval: true, regulated_work: false }
      ]
    },
    actor: nhl.firmResult.principal_actor
  }, nhl.headers);

  const formworkSummary = await getOk(`/workspace/active-summary?tenant_id=${formwork.tenant.id}&firm_id=${formwork.firmResult.firm.id}`, formwork.headers);
  assert.equal(formworkSummary.workspace.firm_type, "FORMWORK_ENGINEERING");
  assert.equal(formworkSummary.service_pack.code, "VF-FORMWORK-PILOT");
  assert(formworkSummary.workspace.modules.some((module) => module.module_code === "technical_delivery"), "Formwork workspace should include technical delivery.");

  const nhlSummary = await getOk(`/workspace/active-summary?tenant_id=${nhl.tenant.id}&firm_id=${nhl.firmResult.firm.id}`, nhl.headers);
  assert.equal(nhlSummary.workspace.firm_type, "ORGANIZATION_SUPPORT");
  assert.equal(nhlSummary.workspace.workspace_title, "NHL Global Solution Workspace");
  assert.equal(nhlSummary.workspace.principal_display_name, "Nur Hernieliana");
  assert.equal(nhlSummary.service_pack.code, "VF-ORG-SUPPORT-PILOT");
  assert(nhlSummary.workspace.service_lines.some((line) => line.service_code === "bizkick_edcs"), "NHL workspace should include BizKick EDCS.");
  assert(!nhlSummary.workspace.service_lines.some((line) => line.regulated_work === true), "NHL organization support profile should not classify service lines as regulated work.");

  const rehearsalSummary = await getOk(`/workspace/active-summary?tenant_id=${rehearsal.tenant.id}&firm_id=${rehearsal.firmResult.firm.id}`, rehearsal.headers);
  assert.equal(rehearsalSummary.workspace.firm_type, "DIRECTORY_REHEARSAL");
  assert.equal(rehearsalSummary.workspace.workspace_classification, "REHEARSAL");
  assert.equal(rehearsalSummary.service_pack.code, "VF-DIRECTORY-REHEARSAL");

  const dashboard = await getOk(`/dashboard/summary?tenant_id=${nhl.tenant.id}&firm_id=${nhl.firmResult.firm.id}`, nhl.headers);
  assert.equal(dashboard.health.service_pack.code, "VF-ORG-SUPPORT-PILOT");
  assert.equal(dashboard.health.active_workspace.firm_type, "ORGANIZATION_SUPPORT");

  const denied = await request(`/workspace/active-summary?tenant_id=${formwork.tenant.id}&firm_id=${nhl.firmResult.firm.id}`, { headers: formwork.headers });
  assert.equal(denied.response.status, 403, "Wrong tenant/firm pair must be denied by tenant/firm actor scope.");

  console.log(JSON.stringify({
    smoke: "mt-h2-active-workspace-summary",
    result: "passed",
    workspaces: {
      formwork: formworkSummary.workspace.firm_type,
      nhl: nhlSummary.workspace.firm_type,
      rehearsal: rehearsalSummary.workspace.workspace_classification
    },
    nhl_subscription: nhlSummary.service_pack.code,
    dashboard_service_pack: dashboard.health.service_pack.code,
    boundaries: nhlSummary.boundaries
  }, null, 2));
} finally {
  child.kill();
  await rm(tempDir, { recursive: true, force: true });
}
