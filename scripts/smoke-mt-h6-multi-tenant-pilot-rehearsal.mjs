import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-mt-h6-"));
const apiPort = 3106;
const webPort = 3107;
const apiBase = `http://127.0.0.1:${apiPort}`;
const webBase = `http://127.0.0.1:${webPort}`;
const storePath = join(tmp, "store.json");
const children = [];
let logs = "";

function start(name, args, env) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"]
  });
  children.push(child);
  child.stdout.on("data", (chunk) => { logs += `[${name}] ${chunk}`; });
  child.stderr.on("data", (chunk) => { logs += `[${name}] ${chunk}`; });
  return child;
}

start("api", ["apps/api/src/server.mjs"], { VFIRM_API_PORT: String(apiPort), VFIRM_STORE_PATH: storePath, DATABASE_URL: "", VFIRM_STORE_BACKEND: "json" });
start("web", ["apps/web/src/server.mjs"], { VFIRM_WEB_PORT: String(webPort), VFIRM_API_BASE: apiBase });

async function waitForJson(url) {
  const started = Date.now();
  while (Date.now() - started < 10000) {
    try {
      const response = await fetch(url);
      const json = await response.json();
      if (response.ok && json.ok !== false) return { response, json };
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}. Logs:\n${logs}`);
}

async function get(path, headers = {}) {
  const response = await fetch(`${apiBase}${path}`, { headers });
  const json = await response.json();
  assert.equal(response.ok, true, `${path} HTTP ${response.status}: ${JSON.stringify(json)}`);
  assert.equal(json.ok, true, `${path} failed: ${JSON.stringify(json)}`);
  return json.data;
}

async function request(path, headers = {}) {
  const response = await fetch(`${apiBase}${path}`, { headers });
  const json = await response.json();
  return { response, json };
}

function authHeaders(store, firm) {
  const actor = (store.actors ?? []).find((item) => item.firm_id === firm.id && item.actor_type === "HUMAN");
  assert(actor, `No human principal actor found for ${firm.name}`);
  return {
    "x-vfirm-actor-id": actor.id,
    "x-vfirm-tenant-id": firm.tenant_id,
    "x-vfirm-firm-id": firm.id,
    "x-vfirm-role": "principal"
  };
}

function moduleCodes(summary) {
  return new Set((summary.workspace.modules ?? []).map((module) => module.module_code));
}

try {
  await waitForJson(`${apiBase}/health`);
  await waitForJson(`${webBase}/api/health`);

  const seed = spawn(process.execPath, ["scripts/seed-multi-tenant-pilot-workspaces-local.mjs"], {
    cwd: root,
    env: { ...process.env, VFIRM_API_BASE: apiBase },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let seedOut = "";
  let seedErr = "";
  seed.stdout.on("data", (chunk) => { seedOut += chunk.toString(); });
  seed.stderr.on("data", (chunk) => { seedErr += chunk.toString(); });
  const [seedCode] = await once(seed, "exit");
  assert.equal(seedCode, 0, `MT-H6 seed failed.\nstdout:\n${seedOut}\nstderr:\n${seedErr}`);
  const seedJson = JSON.parse(seedOut);
  assert.equal(seedJson.result, "ready");

  const store = await get("/mvp/store");
  const formwork = (store.firms ?? []).find((firm) => firm.name === "Amanah Formwork Pilot Firm");
  const nhl = (store.firms ?? []).find((firm) => firm.name === "NHL Global Solution");
  assert(formwork, "Amanah Formwork Pilot Firm missing from rehearsal store.");
  assert(nhl, "NHL Global Solution missing from rehearsal store.");
  assert.notEqual(formwork.tenant_id, nhl.tenant_id, "Pilot firms must remain in separate tenant boundaries.");

  const formworkSummary = await get(`/workspace/active-summary?tenant_id=${formwork.tenant_id}&firm_id=${formwork.id}`, authHeaders(store, formwork));
  const nhlSummary = await get(`/workspace/active-summary?tenant_id=${nhl.tenant_id}&firm_id=${nhl.id}`, authHeaders(store, nhl));
  assert.equal(formworkSummary.workspace.firm_type, "FORMWORK_ENGINEERING");
  assert.equal(formworkSummary.service_pack.code, "VF-FORMWORK-PILOT");
  assert(moduleCodes(formworkSummary).has("technical_delivery"), "Formwork workspace should include technical_delivery.");
  assert(moduleCodes(formworkSummary).has("approvals"), "Formwork workspace should include approvals.");
  assert.equal(nhlSummary.workspace.firm_type, "ORGANIZATION_SUPPORT");
  assert.equal(nhlSummary.service_pack.code, "VF-ORG-SUPPORT-PILOT");
  assert.equal(nhlSummary.workspace.principal_display_name, "Nur Hernieliana");
  assert(!moduleCodes(nhlSummary).has("technical_delivery"), "NHL workspace must not subscribe to Formwork Technical Delivery.");
  assert(!moduleCodes(nhlSummary).has("approvals"), "NHL organization-support profile should not inherit Formwork approval module by default.");
  for (const code of ["project_reporting", "technical_writing", "clerical_work", "bizkick_edcs"]) {
    assert(nhlSummary.workspace.service_lines.some((line) => line.service_code === code), `NHL service line missing: ${code}`);
  }

  const wrongTenant = await request(`/workspace/active-summary?tenant_id=${formwork.tenant_id}&firm_id=${nhl.id}`, authHeaders(store, formwork));
  assert.equal(wrongTenant.response.status, 403, "Cross-tenant active-summary access must be denied.");

  const webHtml = await (await fetch(webBase)).text();
  const app = await (await fetch(`${webBase}/app.js`)).text();
  assert(webHtml.includes('id="activeWorkspace"'), "Active workspace selector missing from web shell.");
  assert(webHtml.includes('id="workspaceShellTitle"'), "Dynamic shell title missing from web shell.");
  assert(app.includes("renderWorkspaceNavigation(scopedStore);"), "Navigation must re-render from selected workspace.");
  assert(app.includes("renderIfSubscribed"), "Module pages must use subscription gates.");
  assert(app.includes("renderModuleBoundary"), "Unsubscribed modules must show boundary evidence.");
  assert(app.includes("defaultServiceHint(contract)"), "Front Desk must bind to selected service lines.");
  assert(app.includes("workerTemplateCodesForContract(contract)"), "AI Workforce must bind worker templates to selected contract.");
  assert(!app.includes('requested_service_hint:"Formwork Engineering support"'), "Formwork service hint must not be hard-coded in Front Desk submit path.");

  const formworkWorkers = (store.worker_instances ?? []).filter((worker) => worker.firm_id === formwork.id);
  const nhlWorkers = (store.worker_instances ?? []).filter((worker) => worker.firm_id === nhl.id);
  assert.equal(formworkWorkers.length, 6, "Formwork should have six pilot workers.");
  assert.equal(nhlWorkers.length, 6, "NHL should have six pilot workers.");
  assert(nhlWorkers.some((worker) => worker.name.includes("NHL Technical Writing") || worker.name.includes("EDCS")), "NHL should have organization-support/EDCS worker naming.");
  assert(formworkWorkers.some((worker) => worker.name.includes("Formwork Technical")), "Formwork should have Formwork technical worker naming.");

  console.log(JSON.stringify({
    smoke: "mt-h6-multi-tenant-pilot-rehearsal",
    result: "passed",
    workspaces: {
      formwork: {
        firm: formwork.name,
        tenant: formworkSummary.tenant.name,
        firm_type: formworkSummary.workspace.firm_type,
        subscription: formworkSummary.service_pack.code,
        modules: [...moduleCodes(formworkSummary)].sort(),
        workers: formworkWorkers.length
      },
      nhl: {
        firm: nhl.name,
        tenant: nhlSummary.tenant.name,
        firm_type: nhlSummary.workspace.firm_type,
        subscription: nhlSummary.service_pack.code,
        services: nhlSummary.workspace.service_lines.map((line) => line.service_code),
        modules: [...moduleCodes(nhlSummary)].sort(),
        workers: nhlWorkers.length
      }
    },
    negative_checks: ["cross_tenant_active_summary_denied", "nhl_no_formwork_technical_delivery_subscription"],
    frontend_evidence: ["dynamic_shell", "active_workspace_selector", "subscribed_navigation", "module_boundary_pages", "worker_template_contract_binding"]
  }, null, 2));
} finally {
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill();
  }
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await rm(tmp, { recursive: true, force: true });
}