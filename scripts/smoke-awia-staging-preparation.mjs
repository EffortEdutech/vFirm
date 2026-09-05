import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-awia-staging-"));
const port = 3112;
const base = `http://127.0.0.1:${port}`;
const api = spawn(process.execPath, ["apps/api/src/server.mjs"], {
  cwd: root,
  env: { ...process.env, VFIRM_API_PORT: String(port), VFIRM_STORE_PATH: join(tmp, "store.json"), VFIRM_STORE_BACKEND: "json" },
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
      if (response.ok && json.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`API did not become healthy. Logs:\n${logs}`);
}

try {
  await waitForHealth();
  const response = await fetch(`${base}/awia/virtual-staff/staging-readiness`);
  const json = await response.json();
  if (!response.ok || !json.ok) throw new Error(`staging-readiness request failed: ${response.status} ${JSON.stringify(json)}`);
  const readiness = json.data;

  if (readiness.current_backend !== "json") throw new Error(`Expected current_backend to reflect VFIRM_STORE_BACKEND=json, got ${readiness.current_backend}.`);
  if (typeof readiness.postgres_schema_has_awia_tables !== "boolean") throw new Error("postgres_schema_has_awia_tables was not returned as a boolean.");
  if (!Array.isArray(readiness.findings) || readiness.findings.length === 0) throw new Error("Expected at least one readiness finding.");
  if (!readiness.findings.some((finding) => finding.code === "AWIA_RECORD_IDS_NOT_BACKEND_AWARE")) throw new Error("Expected the known id-generation gap to be reported as a finding.");
  if (!Array.isArray(readiness.required_before_staging) || readiness.required_before_staging.length < 3) throw new Error("Expected a non-trivial required_before_staging checklist.");
  if (readiness.recommendation !== "NOT_READY_FOR_STAGING_BACKEND_MIGRATION_REQUIRED") throw new Error(`Expected NOT_READY_FOR_STAGING_BACKEND_MIGRATION_REQUIRED given current known gaps, got ${readiness.recommendation}.`);
  if (readiness.boundary !== "staging_preparation_only_no_production_launch_authorization") throw new Error("Staging readiness response did not carry the expected boundary marker.");

  console.log("AWIA staging preparation smoke passed.");
} finally {
  api.kill();
  await rm(tmp, { recursive: true, force: true });
}
