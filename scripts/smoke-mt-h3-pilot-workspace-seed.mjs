import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-mt-h3-"));
const port = 3103;
const base = `http://127.0.0.1:${port}`;
const storePath = join(tmp, "store.json");
const api = spawn(process.execPath, ["apps/api/src/server.mjs"], {
  cwd: root,
  env: { ...process.env, VFIRM_API_PORT: String(port), VFIRM_STORE_PATH: storePath, DATABASE_URL: "", VFIRM_STORE_BACKEND: "json" },
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
      if (response.ok && json.ok) return json;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`MT-H3 API did not become healthy. Logs:\n${logs}`);
}

async function get(path, headers = {}) {
  const response = await fetch(`${base}${path}`, { headers });
  const json = await response.json();
  assert.equal(response.ok, true, `${path} HTTP ${response.status}: ${JSON.stringify(json)}`);
  assert.equal(json.ok, true, `${path} failed: ${JSON.stringify(json)}`);
  return json.data;
}

function authHeaders(store, firm) {
  const actor = (store.actors ?? []).find((item) => item.firm_id === firm.id && item.actor_type === "HUMAN");
  assert(actor, `No principal actor found for ${firm.name}`);
  return {
    "x-vfirm-actor-id": actor.id,
    "x-vfirm-tenant-id": firm.tenant_id,
    "x-vfirm-firm-id": firm.id,
    "x-vfirm-role": "principal"
  };
}

try {
  await waitForHealth();

  const seed = spawn(process.execPath, ["scripts/seed-multi-tenant-pilot-workspaces-local.mjs"], {
    cwd: root,
    env: { ...process.env, VFIRM_API_BASE: base },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let seedOut = "";
  let seedErr = "";
  seed.stdout.on("data", (chunk) => { seedOut += chunk.toString(); });
  seed.stderr.on("data", (chunk) => { seedErr += chunk.toString(); });
  const [code] = await once(seed, "exit");
  assert.equal(code, 0, `Seed failed.\nstdout:\n${seedOut}\nstderr:\n${seedErr}`);
  const seedJson = JSON.parse(seedOut);
  assert.equal(seedJson.result, "ready");

  const store = await get("/mvp/store");
  const formwork = store.firms.find((firm) => firm.name === "Amanah Formwork Pilot Firm");
  const nhl = store.firms.find((firm) => firm.name === "NHL Global Solution");
  assert(formwork, "Formwork pilot firm should be present after MT-H3 seed.");
  assert(nhl, "NHL Global Solution should be present after MT-H3 seed.");
  assert.equal(nhl.name, "NHL Global Solution");
  assert(!store.firms.some((firm) => firm.name === "NHL Global Solutions"), "Plural NHL Global Solutions must not be created.");

  const formworkSummary = await get(`/workspace/active-summary?tenant_id=${formwork.tenant_id}&firm_id=${formwork.id}`, authHeaders(store, formwork));
  const nhlSummary = await get(`/workspace/active-summary?tenant_id=${nhl.tenant_id}&firm_id=${nhl.id}`, authHeaders(store, nhl));
  assert.equal(formworkSummary.workspace.firm_type, "FORMWORK_ENGINEERING");
  assert.equal(formworkSummary.service_pack.code, "VF-FORMWORK-PILOT");
  assert.equal(nhlSummary.workspace.firm_type, "ORGANIZATION_SUPPORT");
  assert.equal(nhlSummary.workspace.principal_display_name, "Nur Hernieliana");
  assert.equal(nhlSummary.service_pack.code, "VF-ORG-SUPPORT-PILOT");
  assert(nhlSummary.workspace.service_lines.some((line) => line.service_code === "project_reporting"));
  assert(nhlSummary.workspace.service_lines.some((line) => line.service_code === "technical_writing"));
  assert(nhlSummary.workspace.service_lines.some((line) => line.service_code === "clerical_work"));
  assert(nhlSummary.workspace.service_lines.some((line) => line.service_code === "bizkick_edcs"));
  assert.equal((store.worker_instances ?? []).filter((worker) => worker.firm_id === nhl.id).length, 6);
  assert.equal((store.worker_instances ?? []).filter((worker) => worker.firm_id === formwork.id).length, 6);

  console.log(JSON.stringify({
    smoke: "mt-h3-pilot-workspace-seed",
    result: "passed",
    firms: [formwork.name, nhl.name],
    subscriptions: [formworkSummary.service_pack.code, nhlSummary.service_pack.code],
    nhl_services: nhlSummary.workspace.service_lines.map((line) => line.service_code),
    workers: {
      formwork: formworkSummary.workspace.counts.active_workers,
      nhl: nhlSummary.workspace.counts.active_workers
    }
  }, null, 2));
} finally {
  if (api.exitCode === null && !api.killed) {
    api.kill();
    await once(api, "exit").catch(() => {});
  }
  await rm(tmp, { recursive: true, force: true });
}
