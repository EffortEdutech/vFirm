import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-r4-s2-"));
const port = 3102;
const base = `http://127.0.0.1:${port}`;
const stagingOrigin = "https://staging.vfirm.example";
const api = spawn(process.execPath, ["apps/api/src/server.mjs"], {
  cwd: root,
  env: {
    ...process.env,
    VFIRM_API_PORT: String(port),
    VFIRM_STORE_PATH: join(tmp, "store.json"),
    DATABASE_URL: "",
    VFIRM_DATABASE_URL: "postgres://staging.example.invalid/vfirm",
    VFIRM_STORE_BACKEND: "json",
    VFIRM_AUTH_PROVIDER: "clerk",
    VFIRM_AUTH_MODE: "staging",
    VFIRM_AUTH_ISSUER: "https://auth.example.test",
    VFIRM_AUTH_AUDIENCE: "vfirm-staging",
    VFIRM_AUTH_JWKS_URL: "https://auth.example.test/.well-known/jwks.json",
    VFIRM_ALLOWED_ORIGINS: `${stagingOrigin},http://127.0.0.1:3090`,
    VFIRM_BACKUP_POLICY: "r4-staging-daily-backup-restore-rehearsal",
    VFIRM_RELEASE_CHANNEL: "release-4-controlled-staging",
    VFIRM_STAGING_ENVIRONMENT: "provider-neutral-managed-staging",
    VFIRM_DATA_CLASSIFICATION_DEFAULT: "CONFIDENTIAL",
    VFIRM_EXPORT_POLICY: "tenant-scoped-json-with-provenance",
    VFIRM_FAKE_SECRET_FOR_EXPORT_TEST: "must-not-appear-in-export"
  },
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

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = res.status === 204 ? null : await res.json();
  return { res, json };
}

async function get(path, headers = {}) {
  const { res, json } = await request(path, { headers });
  if (!res.ok || !json?.ok) throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`);
  return json.data;
}

async function post(path, body, headers = {}) {
  const { res, json } = await request(path, { method: "POST", body, headers });
  if (!res.ok || !json?.ok) throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`);
  return json.data;
}

function authHeaders(firm) {
  return {
    "x-vfirm-actor-id": firm.principal_actor.id,
    "x-vfirm-tenant-id": firm.firm.tenant_id,
    "x-vfirm-firm-id": firm.firm.id,
    "x-vfirm-role": "principal"
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  await waitForHealth();

  const options = await fetch(`${base}/health`, {
    method: "OPTIONS",
    headers: { origin: stagingOrigin }
  });
  assert(options.headers.get("access-control-allow-origin") === stagingOrigin, "Configured staging origin was not allowed by CORS.");

  const contracts = await get("/contracts");
  assert(contracts.some((contract) => contract.path === "/ops/r4-staging-readiness"), "R4-S2 readiness contract is missing.");

  const staging = await get("/ops/staging-package");
  assert(staging.required_environment.includes("VFIRM_ALLOWED_ORIGINS"), "Staging package missing allowed origins requirement.");
  assert(staging.deployment_steps.some((step) => /backup\/restore/i.test(step)), "Staging package missing backup/restore deployment step.");

  const readiness = await get("/ops/r4-staging-readiness");
  assert(readiness.status === "R4_S2_READY_FOR_SUPPORT_INCIDENT_CONTROLS", `R4 staging readiness failed: ${JSON.stringify(readiness)}`);
  assert(readiness.selected_environment === "provider-neutral-managed-staging", "Selected staging environment was not recorded.");
  assert(readiness.allowed_origins.includes(stagingOrigin), "Configured staging origin not reported in R4 readiness.");
  assert(readiness.private_pilot_invitation_gate === "READY_FOR_R4_S3_SUPPORT_AND_INCIDENT_CONTROLS", "Private pilot gate was not advanced to R4-S3 readiness.");
  assert(readiness.backup_restore_rehearsal.backup_status === "DECLARED", "Backup policy was not declared.");
  assert(readiness.backup_restore_rehearsal.destructive_restore_allowed === false, "Destructive restore must not be implicitly allowed.");
  assert(readiness.data_protection_review.secrets_excluded, "Secrets exclusion was not confirmed.");
  assert(readiness.data_protection_review.provider_tokens_excluded, "Provider token exclusion was not confirmed.");
  assert(readiness.data_protection_review.private_chain_of_thought_excluded, "Private chain-of-thought exclusion was not confirmed.");

  const policy = await get("/data-protection/policy");
  assert(policy.export_policy.requires_tenant_scope, "Export policy must require tenant scope.");
  assert(policy.export_policy.excludes.includes("secrets"), "Export policy must exclude secrets.");
  assert(policy.export_policy.excludes.includes("provider tokens"), "Export policy must exclude provider tokens.");
  assert(policy.external_pilot_requirements.includes("managed database backup active"), "External pilot requirements must include managed backup.");

  const tenantA = await post("/tenants", { name: "R4 S2 Tenant A" });
  const firmA = await post("/firms", { tenant_id: tenantA.id, name: "R4 S2 Firm A", principal_name: "Ir. Data Protection" });
  const headersA = authHeaders(firmA);
  await post("/pilot/users/invite", {
    tenant_id: tenantA.id,
    firm_id: firmA.firm.id,
    email: "r4s2.dp@example.com",
    display_name: "R4 S2 Data Protection",
    pilot_role: "TENANT_ADMIN",
    actor: firmA.principal_actor
  }, headersA);

  const tenantB = await post("/tenants", { name: "R4 S2 Tenant B" });
  const firmB = await post("/firms", { tenant_id: tenantB.id, name: "R4 S2 Firm B", principal_name: "Ir. Other" });
  const headersB = authHeaders(firmB);

  const manifest = await get(`/data-protection/export-manifest?tenant_id=${tenantA.id}`, headersA);
  assert(manifest.tenant_id === tenantA.id, "Export manifest must be tenant scoped.");
  assert(manifest.integrity.audit_trail_included, "Export manifest must include audit integrity.");
  assert(manifest.integrity.secrets_excluded, "Export manifest must confirm secret exclusion.");
  assert(manifest.counts.tenants === 1, "Export manifest should include only one tenant.");
  assert(manifest.counts.pilot_users === 1, "Export manifest should include the invited pilot user.");

  const exportPackage = await get(`/data-protection/export-package?tenant_id=${tenantA.id}&firm_id=${firmA.firm.id}`, headersA);
  assert(exportPackage.integrity.provider_tokens_excluded, "Export package must exclude provider tokens.");
  assert(exportPackage.integrity.professional_authority_preserved, "Export package must preserve professional authority records.");
  const serializedExport = JSON.stringify(exportPackage);
  assert(!serializedExport.includes("must-not-appear-in-export"), "Environment secret leaked into export package.");
  assert(!serializedExport.includes("VFIRM_FAKE_SECRET_FOR_EXPORT_TEST"), "Secret environment key leaked into export package.");
  assert(!serializedExport.includes("JWKS"), "Provider token/JWKS material should not appear in export package.");

  const crossTenant = await request(`/data-protection/export-package?tenant_id=${tenantA.id}&firm_id=${firmA.firm.id}`, { headers: headersB });
  assert(crossTenant.res.status === 403, `Cross-tenant export should be denied, got ${crossTenant.res.status}.`);

  console.log(JSON.stringify({
    smoke: "r4-s2-staging-deployment-data-protection",
    mode: process.argv.includes("--postgres") ? "postgres-contract" : process.argv.includes("--staging") ? "staging-contract" : "json-contract",
    result: "passed",
    selected_environment: readiness.selected_environment,
    private_pilot_invitation_gate: readiness.private_pilot_invitation_gate,
    checks: readiness.checks.map((check) => `${check.key}:${check.status}`)
  }, null, 2));
} finally {
  if (api.exitCode === null && !api.killed) {
    api.kill();
    await once(api, "exit").catch(() => {});
  }
  await rm(tmp, { recursive: true, force: true });
}
