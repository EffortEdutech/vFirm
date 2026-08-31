import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-stage9-"));
const port = 3093;
const base = `http://127.0.0.1:${port}`;
const api = spawn(process.execPath, ["apps/api/src/server.mjs"], {
  cwd: root,
  env: { ...process.env, VFIRM_API_PORT: String(port), VFIRM_STORE_PATH: join(tmp, "store.json"), VFIRM_DATABASE_URL: "", VFIRM_RELEASE_CHANNEL: "local-stage9" },
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
  throw new Error(`API did not become healthy. Logs:\n${logs}`);
}

async function get(path) {
  const res = await fetch(`${base}${path}`, { headers: { "content-type": "application/json" } });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`);
  return json.data;
}

try {
  const health = await waitForHealth();
  if (health.port_family !== "309#" || health.api_port !== port) throw new Error(`Health port family mismatch: ${JSON.stringify(health)}`);
  const readiness = await get("/ops/readiness");
  const checkKeys = new Set((readiness.checks ?? []).map((check) => check.key));
  for (const key of ["port_family", "persistence", "database_url", "auth_provider", "allowed_origins", "backup_policy", "release_channel"]) {
    if (!checkKeys.has(key)) throw new Error(`Missing readiness check: ${key}`);
  }
  if (readiness.environment?.api_port !== port) throw new Error("Readiness did not report API port.");
  if (!readiness.release_gate?.required_before_real_production?.includes("VFIRM_DATABASE_URL")) throw new Error("Readiness release gate does not require database URL.");
  if (!/WARNINGS|CANDIDATE|NOT_READY/.test(readiness.status)) throw new Error(`Unexpected readiness status: ${readiness.status}`);
  console.log("Stage 9 production readiness smoke test passed.");
} finally {
  api.kill();
  await once(api, "exit").catch(() => {});
  await rm(tmp, { recursive: true, force: true });
}
