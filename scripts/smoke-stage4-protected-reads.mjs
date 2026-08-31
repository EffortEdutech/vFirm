import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-stage4-reads-"));
const port = 3096;
const base = `http://127.0.0.1:${port}`;

const api = spawn(process.execPath, ["apps/api/src/server.mjs"], {
  cwd: root,
  env: { ...process.env, VFIRM_API_PORT: String(port), VFIRM_STORE_PATH: join(tmp, "store.json"), VFIRM_DATABASE_URL: "" },
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
      if (res.ok && json.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`API did not become healthy. Logs:\n${logs}`);
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json();
  return { res, json };
}

async function post(path, body, headers = {}) {
  const { res, json } = await request(path, { method: "POST", body, headers });
  if (!res.ok || !json.ok) throw new Error(`${path} failed: ${JSON.stringify(json)}`);
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

try {
  await waitForHealth();

  const tenantA = await post("/tenants", { name: "Stage 4 Tenant A" });
  const firmA = await post("/firms", { tenant_id: tenantA.id, name: "Amanah Stage 4", principal_name: "Ir. Principal A" });
  const tenantB = await post("/tenants", { name: "Stage 4 Tenant B" });
  const firmB = await post("/firms", { tenant_id: tenantB.id, name: "Barakah Stage 4", principal_name: "Ir. Principal B" });

  const headersA = authHeaders(firmA);
  const ownRead = await request(`/firms?tenant_id=${tenantA.id}`, { headers: headersA });
  if (!ownRead.res.ok || ownRead.json.data.length !== 1 || ownRead.json.data[0].id !== firmA.firm.id) throw new Error("Actor A could not read own tenant firm list.");

  const crossTenantRead = await request(`/firms?tenant_id=${tenantB.id}`, { headers: headersA });
  if (crossTenantRead.res.status !== 403 || crossTenantRead.json.error?.code !== "TENANT_ACCESS_DENIED") throw new Error(`Cross-tenant read should be denied, got ${crossTenantRead.res.status}: ${JSON.stringify(crossTenantRead.json)}`);

  const crossTenantDetail = await request(`/firms/${firmB.firm.id}`, { headers: headersA });
  if (crossTenantDetail.res.status !== 403 || crossTenantDetail.json.error?.code !== "TENANT_ACCESS_DENIED") throw new Error(`Cross-tenant detail read should be denied, got ${crossTenantDetail.res.status}: ${JSON.stringify(crossTenantDetail.json)}`);

  const authContext = await request("/auth/context", { headers: headersA });
  if (!authContext.res.ok || !authContext.json.data.authority_valid || authContext.json.data.membership?.role !== "PRINCIPAL") throw new Error(`Auth context did not resolve authority and membership: ${JSON.stringify(authContext.json)}`);

  console.log("Stage 4 protected read smoke test passed.");
} finally {
  api.kill();
  await once(api, "exit").catch(() => {});
  await rm(tmp, { recursive: true, force: true });
}

