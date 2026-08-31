import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-stage13-"));
const port = 3095;
const base = `http://127.0.0.1:${port}`;
const api = spawn(process.execPath, ["apps/api/src/server.mjs"], {
  cwd: root,
  env: { ...process.env, VFIRM_API_PORT: String(port), VFIRM_STORE_PATH: join(tmp, "store.json"), VFIRM_DATABASE_URL: "", VFIRM_AUTH_PROVIDER: "clerk", VFIRM_AUTH_MODE: "staging", VFIRM_AUTH_ISSUER: "https://auth.example.test", VFIRM_AUTH_AUDIENCE: "vfirm-staging", VFIRM_AUTH_JWKS_URL: "https://auth.example.test/.well-known/jwks.json", VFIRM_ALLOWED_ORIGINS: "http://127.0.0.1:3090", VFIRM_BACKUP_POLICY: "pilot-daily", VFIRM_RELEASE_CHANNEL: "staging-pilot", VFIRM_DATA_CLASSIFICATION_DEFAULT: "CONFIDENTIAL", VFIRM_EXPORT_POLICY: "tenant-scoped-json-with-provenance" },
  stdio: ["ignore", "pipe", "pipe"]
});
let logs = "";
api.stdout.on("data", (chunk) => { logs += chunk.toString(); });
api.stderr.on("data", (chunk) => { logs += chunk.toString(); });
async function waitForHealth() { const started = Date.now(); while (Date.now() - started < 10000) { try { const res = await fetch(`${base}/health`); const json = await res.json(); if (res.ok && json.ok) return json; } catch {} await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error(`API did not become healthy. Logs:\n${logs}`); }
async function request(path, { method = "GET", body, headers = {} } = {}) { const res = await fetch(`${base}${path}`, { method, headers: { "content-type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined }); const json = await res.json(); return { res, json }; }
async function get(path, headers = {}) { const { res, json } = await request(path, { headers }); if (!res.ok || !json.ok) throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`); return json.data; }
async function post(path, body, headers = {}) { const { res, json } = await request(path, { method: "POST", body, headers }); if (!res.ok || !json.ok) throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`); return json.data; }
function authHeaders(firm) { return { "x-vfirm-actor-id": firm.principal_actor.id, "x-vfirm-tenant-id": firm.firm.tenant_id, "x-vfirm-firm-id": firm.firm.id, "x-vfirm-role": "principal" }; }
try {
  await waitForHealth();
  const staging = await get("/ops/staging-package");
  if (staging.code !== "VF-STAGING-PACKAGE-001" || !staging.preflight_commands?.includes("npm run check:stage13")) throw new Error(`Bad staging package: ${JSON.stringify(staging)}`);
  const policy = await get("/data-protection/policy");
  if (!policy.export_policy?.requires_tenant_scope || !policy.external_pilot_requirements?.includes("no secrets in repository or export packages")) throw new Error(`Bad data policy: ${JSON.stringify(policy)}`);
  const tenant = await post("/tenants", { name: "Stage 13 Tenant" });
  const firm = await post("/firms", { tenant_id: tenant.id, name: "Stage 13 Firm", principal_name: "Ir. Protection" });
  const headers = authHeaders(firm);
  await post("/pilot/users/invite", { tenant_id: tenant.id, firm_id: firm.firm.id, email: "stage13@example.com", display_name: "Stage 13 Pilot", pilot_role: "TENANT_ADMIN", actor: firm.principal_actor }, headers);
  const manifest = await get(`/data-protection/export-manifest?tenant_id=${tenant.id}`, headers);
  if (manifest.tenant_id !== tenant.id || !manifest.integrity?.audit_trail_included || manifest.counts.tenants !== 1 || manifest.counts.pilot_users !== 1) throw new Error(`Bad export manifest: ${JSON.stringify(manifest)}`);
  const readiness = await get("/ops/readiness");
  if (!["DEV_READY_WITH_WARNINGS", "PRODUCTION_READY_CANDIDATE"].includes(readiness.status)) throw new Error(`Unexpected readiness: ${readiness.status}`);
  console.log("Stage 13 staging deployment and data protection smoke test passed.");
} finally {
  if (api.exitCode === null && !api.killed) { api.kill(); await once(api, "exit").catch(() => {}); }
  await rm(tmp, { recursive: true, force: true });
}
