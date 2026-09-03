import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-op-h2-"));
const apiPort = 3116;
const apiBase = `http://127.0.0.1:${apiPort}`;
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

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

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

function assertTodaySummary(summary, expected) {
  assert.equal(summary.tenant_id, expected.tenant_id, "Today summary tenant scope mismatch.");
  assert.equal(summary.firm_id, expected.id, "Today summary firm scope mismatch.");
  assert(summary.counts && typeof summary.counts.pending_approvals === "number", "Today counts must include pending approvals.");
  assert(summary.deadlines && typeof summary.deadlines.overdue === "number", "Today summary must include deadlines.");
  assert(Array.isArray(summary.approvals), "Today summary must include approvals array.");
  assert(Array.isArray(summary.exceptions), "Today summary must include exceptions array.");
  assert(summary.pipeline && typeof summary.pipeline.open_opportunities === "number", "Today summary must include pipeline.");
  assert(summary.cash && typeof summary.cash.outstanding === "number", "Today summary must include receivables/cash.");
  assert(summary.workload && typeof summary.workload.active_workers === "number", "Today summary must include workload/project status.");
  assert(Array.isArray(summary.rehearsal_checks), "Today summary must include pilot-day checklist/rehearsal checks.");
}

try {
  assert(await exists("docs/10_post_freeze_technical_design/OP_H2_OPERATOR_DASHBOARD_AND_TODAY_VIEW_COMPLETION_v1.0.md"), "OP-H2 completion document missing.");

  const app = await readFile("apps/web/public/app.js", "utf8");
  const css = await readFile("apps/web/public/styles.css", "utf8");
  const checklist = await readFile("docs/10_post_freeze_technical_design/OP_H1_TO_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_CHECKLIST_v1.0.md", "utf8");
  const decisionRegister = await readFile("docs/00_project_control/DECISION_REGISTER.md", "utf8");
  const readme = await readFile("docs/10_post_freeze_technical_design/README.md", "utf8");
  const completion = await readFile("docs/10_post_freeze_technical_design/OP_H2_OPERATOR_DASHBOARD_AND_TODAY_VIEW_COMPLETION_v1.0.md", "utf8");
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));

  for (const marker of [
    "renderOperatorTodayView",
    "buildClientDailyOperationsFallback",
    "op-h2-today-view",
    "Selected-firm readiness",
    "Today priorities",
    "Formwork technical approval exposure",
    "NHL organization-support service exposure",
    "Technical Delivery not subscribed",
    "No live payment movement",
    "No autonomous regulated approval",
    "No cross-firm dashboard leakage"
  ]) {
    assert(app.includes(marker) || css.includes(marker), `OP-H2 frontend marker missing: ${marker}`);
  }

  for (const item of [
    "- [x] Add selected-firm readiness card.",
    "- [x] Add today priorities view.",
    "- [x] Add approvals summary.",
    "- [x] Add exceptions summary.",
    "- [x] Add deadlines, project status, pipeline, and receivables summary.",
    "- [x] Bind dashboard data and copy to selected firm.",
    "- [x] Verify Formwork readiness reflects technical delivery exposure.",
    "- [x] Verify NHL readiness reflects organization-support service exposure.",
    "- [x] Add cross-firm dashboard leakage negative checks.",
    "- [x] Update evidence and decision register."
  ]) {
    assert(checklist.includes(item), `OP-H2 checklist item not checked: ${item}`);
  }

  assert(decisionRegister.includes("ADR-056 - OP-H2 operator dashboard and today view completed"), "ADR-056 missing from decision register.");
  assert(readme.includes("OP_H2_OPERATOR_DASHBOARD_AND_TODAY_VIEW_COMPLETION_v1.0.md"), "README missing OP-H2 completion doc.");
  assert(completion.includes("OP-H3 - Formwork Pilot Day Rehearsal"), "OP-H2 completion must hand off to OP-H3.");
  assert(packageJson.scripts["check:op:h2"] === "node scripts/smoke-op-h2-operator-dashboard-today-view.mjs", "check:op:h2 package script missing.");
  assert(packageJson.scripts.check.includes("smoke-op-h2-operator-dashboard-today-view.mjs"), "Full check chain must include OP-H2 smoke.");

  start("api", ["apps/api/src/server.mjs"], { VFIRM_API_PORT: String(apiPort), VFIRM_STORE_PATH: storePath, DATABASE_URL: "", VFIRM_STORE_BACKEND: "json" });
  await waitForJson(`${apiBase}/health`);

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
  assert.equal(seedCode, 0, `OP-H2 seed failed.\nstdout:\n${seedOut}\nstderr:\n${seedErr}`);

  const store = await get("/mvp/store");
  const formwork = (store.firms ?? []).find((firm) => firm.name === "Amanah Formwork Pilot Firm");
  const nhl = (store.firms ?? []).find((firm) => firm.name === "NHL Global Solution");
  assert(formwork, "Amanah Formwork Pilot Firm missing.");
  assert(nhl, "NHL Global Solution missing.");
  assert.notEqual(formwork.tenant_id, nhl.tenant_id, "Pilot firms must remain separate tenants.");

  const formworkWorkspace = await get(`/workspace/active-summary?tenant_id=${formwork.tenant_id}&firm_id=${formwork.id}`, authHeaders(store, formwork));
  const nhlWorkspace = await get(`/workspace/active-summary?tenant_id=${nhl.tenant_id}&firm_id=${nhl.id}`, authHeaders(store, nhl));
  assert(moduleCodes(formworkWorkspace).has("technical_delivery"), "Formwork dashboard must expose technical delivery readiness.");
  assert(!moduleCodes(nhlWorkspace).has("technical_delivery"), "NHL dashboard must not expose Formwork Technical Delivery as subscribed.");
  assert.equal(nhlWorkspace.workspace.firm_type, "ORGANIZATION_SUPPORT", "NHL must render organization-support workspace type.");

  const formworkToday = await get(`/operations/today?tenant_id=${formwork.tenant_id}&firm_id=${formwork.id}`, authHeaders(store, formwork));
  const nhlToday = await get(`/operations/today?tenant_id=${nhl.tenant_id}&firm_id=${nhl.id}`, authHeaders(store, nhl));
  assertTodaySummary(formworkToday, formwork);
  assertTodaySummary(nhlToday, nhl);
  assert.notEqual(formworkToday.firm_id, nhlToday.firm_id, "Today summaries must not collapse across firms.");

  const crossTenantToday = await request(`/operations/today?tenant_id=${formwork.tenant_id}&firm_id=${nhl.id}`, authHeaders(store, formwork));
  assert.equal(crossTenantToday.response.status, 403, "Cross-tenant Today summary access must be denied.");

  console.log(JSON.stringify({
    smoke: "op-h2-operator-dashboard-today-view",
    result: "passed",
    frontend: ["selected_firm_readiness", "today_priorities", "approvals", "exceptions", "deadlines_projects_pipeline_receivables"],
    workspaces: {
      formwork: { firm: formwork.name, firm_type: formworkWorkspace.workspace.firm_type, technical_delivery: moduleCodes(formworkWorkspace).has("technical_delivery"), today_status: formworkToday.status },
      nhl: { firm: nhl.name, firm_type: nhlWorkspace.workspace.firm_type, technical_delivery: moduleCodes(nhlWorkspace).has("technical_delivery"), today_status: nhlToday.status }
    },
    negative_checks: ["cross_tenant_today_denied", "nhl_no_formwork_technical_delivery_subscription"],
    next_active_sprint: "OP-H3 - Formwork Pilot Day Rehearsal"
  }, null, 2));
} finally {
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill();
  }
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await rm(tmp, { recursive: true, force: true });
}