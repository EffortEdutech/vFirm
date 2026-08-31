import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-stage12-"));
const port = 3096;
const base = `http://127.0.0.1:${port}`;
const api = spawn(process.execPath, ["apps/api/src/server.mjs"], {
  cwd: root,
  env: { ...process.env, VFIRM_API_PORT: String(port), VFIRM_STORE_PATH: join(tmp, "store.json"), VFIRM_DATABASE_URL: "", VFIRM_AUTH_PROVIDER: "clerk", VFIRM_AUTH_MODE: "staging", VFIRM_AUTH_ISSUER: "https://auth.example.test", VFIRM_AUTH_AUDIENCE: "vfirm-staging", VFIRM_AUTH_JWKS_URL: "https://auth.example.test/.well-known/jwks.json", VFIRM_ALLOWED_ORIGINS: "http://127.0.0.1:3090", VFIRM_BACKUP_POLICY: "pilot-daily", VFIRM_RELEASE_CHANNEL: "staging-pilot" },
  stdio: ["ignore", "pipe", "pipe"]
});
let logs = "";
api.stdout.on("data", (chunk) => { logs += chunk.toString(); });
api.stderr.on("data", (chunk) => { logs += chunk.toString(); });

async function waitForHealth() {
  const started = Date.now();
  while (Date.now() - started < 10000) {
    try { const res = await fetch(`${base}/health`); const json = await res.json(); if (res.ok && json.ok) return json; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`API did not become healthy. Logs:\n${logs}`);
}
async function request(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${base}${path}`, { method, headers: { "content-type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json();
  return { res, json };
}
async function get(path, headers = {}) { const { res, json } = await request(path, { headers }); if (!res.ok || !json.ok) throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`); return json.data; }
async function post(path, body, headers = {}) { const { res, json } = await request(path, { method: "POST", body, headers }); if (!res.ok || !json.ok) throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`); return json.data; }
function authHeaders(firm) { return { "x-vfirm-actor-id": firm.principal_actor.id, "x-vfirm-tenant-id": firm.firm.tenant_id, "x-vfirm-firm-id": firm.firm.id, "x-vfirm-role": "principal" }; }

try {
  await waitForHealth();
  const config = await get("/auth/provider/config");
  if (config.provider !== "clerk" || !config.issuer_configured || !config.jwks_configured || !config.audience_configured) throw new Error(`Provider config incomplete: ${JSON.stringify(config)}`);
  const tenant = await post("/tenants", { name: "Stage 12 Tenant" });
  const firm = await post("/firms", { tenant_id: tenant.id, name: "Stage 12 Tenant Admin Firm", principal_name: "Ir. Admin" });
  const headers = authHeaders(firm);
  const invited = await post("/pilot/users/invite", { tenant_id: tenant.id, firm_id: firm.firm.id, email: "tenant.admin@example.com", display_name: "Tenant Admin", pilot_role: "TENANT_ADMIN", auth_provider: "clerk", actor: firm.principal_actor }, headers);
  await post("/pilot/users/activate", { tenant_id: tenant.id, firm_id: firm.firm.id, pilot_user_id: invited.id, external_subject: "clerk-user-001", actor: firm.principal_actor }, headers);
  const context = await get("/auth/provider-context", { "x-vfirm-auth-provider": "clerk", "x-vfirm-user-email": "tenant.admin@example.com", "x-vfirm-user-subject": "clerk-user-001", "x-vfirm-auth-verified": "true" });
  if (!context.active || context.actor?.role !== "TENANT_ADMIN") throw new Error(`Provider context failed: ${JSON.stringify(context)}`);
  const denied = await get("/auth/provider-context", { "x-vfirm-auth-provider": "clerk", "x-vfirm-user-email": "tenant.admin@example.com", "x-vfirm-user-subject": "wrong-subject", "x-vfirm-auth-verified": "true" });
  if (denied.active) throw new Error("Provider context should not activate wrong subject.");
  const policy = await get("/tenant-admin/policy", headers);
  if (!policy.roles?.TENANT_ADMIN?.includes("pilot.users.invite")) throw new Error("Tenant admin policy missing pilot invite permission.");
  console.log("Stage 12 real auth provider and tenant admin smoke test passed.");
} finally {
  if (api.exitCode === null && !api.killed) { api.kill(); await once(api, "exit").catch(() => {}); }
  await rm(tmp, { recursive: true, force: true });
}
