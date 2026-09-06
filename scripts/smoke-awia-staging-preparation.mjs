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
  // TD-009 (AWIA Postgres schema + backend-aware id generation) closed live 2026-09-06: migration
  // 0024_awia_virtual_staff_persistence.sql exists and store.mjs's AWIA id-generation call sites are
  // now isPostgresStore()-aware, so both readiness blockers this test used to expect are fixed and
  // findings is correctly empty here. See TECHNICAL_DEBT_REGISTER_v1.0.md (TD-009) for the closure evidence.
  if (!Array.isArray(readiness.findings)) throw new Error("readiness.findings must be an array.");
  if (readiness.findings.some((finding) => finding.code === "AWIA_RECORD_IDS_NOT_BACKEND_AWARE")) throw new Error("AWIA_RECORD_IDS_NOT_BACKEND_AWARE should no longer be reported: TD-009 is closed.");
  if (readiness.findings.some((finding) => finding.code === "AWIA_POSTGRES_SCHEMA_MISSING")) throw new Error("AWIA_POSTGRES_SCHEMA_MISSING should no longer be reported: migration 0024 defines the awia_* tables.");
  if (readiness.postgres_schema_has_awia_tables !== true) throw new Error("postgres_schema_has_awia_tables should be true now that migration 0024 exists.");
  if (readiness.awia_record_ids_backend_aware !== true) throw new Error("awia_record_ids_backend_aware should be true now that TD-009 is closed.");
  if (!Array.isArray(readiness.required_before_staging) || readiness.required_before_staging.length < 1) throw new Error("Expected a required_before_staging checklist (standard staging env vars) even with no AWIA-specific blockers.");
  if (readiness.recommendation !== "READY_FOR_STAGING_CUTOVER_REHEARSAL") throw new Error(`Expected READY_FOR_STAGING_CUTOVER_REHEARSAL now that TD-009 is closed, got ${readiness.recommendation}.`);
  if (readiness.boundary !== "staging_preparation_only_no_production_launch_authorization") throw new Error("Staging readiness response did not carry the expected boundary marker.");

  console.log("AWIA staging preparation smoke passed.");
} finally {
  api.kill();
  await rm(tmp, { recursive: true, force: true });
}
