import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-stage11-"));
const port = 3097;
const base = `http://127.0.0.1:${port}`;
const api = spawn(process.execPath, ["apps/api/src/server.mjs"], {
  cwd: root,
  env: { ...process.env, VFIRM_API_PORT: String(port), VFIRM_STORE_PATH: join(tmp, "store.json"), VFIRM_DATABASE_URL: "", VFIRM_AUTH_PROVIDER: "staging-header", VFIRM_ALLOWED_ORIGINS: "http://127.0.0.1:3090", VFIRM_BACKUP_POLICY: "pilot-daily", VFIRM_RELEASE_CHANNEL: "staging-pilot" },
  stdio: ["ignore", "pipe", "pipe"]
});
let logs = "";
api.stdout.on("data", (chunk) => { logs += chunk.toString(); });
api.stderr.on("data", (chunk) => { logs += chunk.toString(); });

async function waitForHealth() {
  const started = Date.now();
  while (Date.now() - started < 10000) {
    try {
      const res = await fetch(`${base}/health`);
      const json = await res.json();
      if (res.ok && json.ok) return json;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`API did not become healthy. Logs:
${logs}`);
}
async function request(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${base}${path}`, { method, headers: { "content-type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json();
  return { res, json };
}
async function post(path, body, headers = {}) { const { res, json } = await request(path, { method: "POST", body, headers }); if (!res.ok || !json.ok) throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`); return json.data; }
async function get(path, headers = {}) { const { res, json } = await request(path, { headers }); if (!res.ok || !json.ok) throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`); return json.data; }
function authHeaders(firm) { return { "x-vfirm-actor-id": firm.principal_actor.id, "x-vfirm-tenant-id": firm.firm.tenant_id, "x-vfirm-firm-id": firm.firm.id, "x-vfirm-role": "principal" }; }

try {
  await waitForHealth();
  const tenant = await post("/tenants", { name: "Stage 11 Pilot Tenant" });
  const firm = await post("/firms", { tenant_id: tenant.id, name: "Stage 11 Pilot Firm", principal_name: "Ir. Stage Eleven" });
  const headers = authHeaders(firm);
  const invited = await post("/pilot/users/invite", { tenant_id: tenant.id, firm_id: firm.firm.id, email: "pilot.operator@example.com", display_name: "Pilot Operator", pilot_role: "PILOT_OPERATOR", actor: firm.principal_actor }, headers);
  if (invited.invite_status !== "INVITED") throw new Error("Pilot user invite did not create invited user.");
  const activated = await post("/pilot/users/activate", { tenant_id: tenant.id, firm_id: firm.firm.id, pilot_user_id: invited.id, external_subject: "staging-user-001", actor: firm.principal_actor }, headers);
  if (activated.invite_status !== "ACTIVE" || activated.external_subject !== "staging-user-001") throw new Error("Pilot user activation failed.");
  const users = await get("/pilot-users", headers);
  if (users.length !== 1) throw new Error("Pilot users read endpoint failed.");
  const stagingContext = await get("/auth/staging-context", { "x-vfirm-user-email": "pilot.operator@example.com", "x-vfirm-user-subject": "staging-user-001", "x-vfirm-auth-provider": "staging-header" });
  if (!stagingContext.active || stagingContext.actor?.tenant_id !== tenant.id) throw new Error(`Staging auth context failed: ${JSON.stringify(stagingContext)}`);
  const readiness = await get("/ops/readiness");
  if (!["DEV_READY_WITH_WARNINGS", "PRODUCTION_READY_CANDIDATE"].includes(readiness.status)) throw new Error(`Unexpected staged readiness status: ${readiness.status}`);
  console.log("Stage 11 external auth and pilot user smoke test passed.");
} finally {
  if (api.exitCode === null && !api.killed) {
    api.kill();
    await once(api, "exit").catch(() => {});
  }
  await rm(tmp, { recursive: true, force: true });
}



