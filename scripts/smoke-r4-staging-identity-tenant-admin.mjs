import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-r4-s1-"));
const port = 3101;
const base = `http://127.0.0.1:${port}`;
const api = spawn(process.execPath, ["apps/api/src/server.mjs"], {
  cwd: root,
  env: {
    ...process.env,
    VFIRM_API_PORT: String(port),
    VFIRM_STORE_PATH: join(tmp, "store.json"),
    VFIRM_DATABASE_URL: "",
    VFIRM_AUTH_PROVIDER: "clerk",
    VFIRM_AUTH_MODE: "staging",
    VFIRM_AUTH_ISSUER: "https://auth.example.test",
    VFIRM_AUTH_AUDIENCE: "vfirm-staging",
    VFIRM_AUTH_JWKS_URL: "https://auth.example.test/.well-known/jwks.json",
    VFIRM_ALLOWED_ORIGINS: "http://127.0.0.1:3090",
    VFIRM_BACKUP_POLICY: "pilot-daily",
    VFIRM_RELEASE_CHANNEL: "release-4-controlled-staging"
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
  const json = await res.json();
  return { res, json };
}

async function get(path, headers = {}) {
  const { res, json } = await request(path, { headers });
  if (!res.ok || !json.ok) throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`);
  return json.data;
}

async function post(path, body, headers = {}) {
  const { res, json } = await request(path, { method: "POST", body, headers });
  if (!res.ok || !json.ok) throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`);
  return json.data;
}

async function postRaw(path, body, headers = {}) {
  return request(path, { method: "POST", body, headers });
}

function authHeaders(firm) {
  return {
    "x-vfirm-actor-id": firm.principal_actor.id,
    "x-vfirm-tenant-id": firm.firm.tenant_id,
    "x-vfirm-firm-id": firm.firm.id,
    "x-vfirm-role": "principal"
  };
}

function providerHeaders({ email, subject, verified = true }) {
  return {
    "x-vfirm-auth-provider": "clerk",
    "x-vfirm-user-email": email,
    "x-vfirm-user-subject": subject,
    "x-vfirm-auth-verified": verified ? "true" : "false"
  };
}

try {
  await waitForHealth();

  const contracts = await get("/contracts");
  if (!contracts.some((contract) => contract.path === "/pilot/users/suspend")) {
    throw new Error("R4-S1 contract for pilot user suspension is missing.");
  }

  const config = await get("/auth/provider/config");
  if (config.provider !== "clerk" || config.adapter_status !== "PROVIDER_CONFIG_DECLARED") {
    throw new Error(`Provider-neutral adapter config was not declared: ${JSON.stringify(config)}`);
  }

  const tenant = await post("/tenants", { name: "R4 S1 Tenant" });
  const firm = await post("/firms", { tenant_id: tenant.id, name: "R4 S1 Firm", principal_name: "Ir. R4 Principal" });
  const headers = authHeaders(firm);

  const invited = await post("/pilot/users/invite", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    email: "r4.admin@example.com",
    display_name: "R4 Tenant Admin",
    pilot_role: "TENANT_ADMIN",
    auth_provider: "clerk",
    actor: firm.principal_actor
  }, headers);
  if (invited.invite_status !== "INVITED") throw new Error("Pilot user was not invited.");

  const duplicateInvite = await postRaw("/pilot/users/invite", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    email: "r4.admin@example.com",
    display_name: "Duplicate Admin",
    pilot_role: "TENANT_ADMIN",
    auth_provider: "clerk",
    actor: firm.principal_actor
  }, headers);
  if (duplicateInvite.res.ok) throw new Error("Duplicate pilot identity invite should be denied.");

  const unverified = await get("/auth/provider-context", providerHeaders({ email: "r4.admin@example.com", subject: "clerk-r4-admin", verified: false }));
  if (unverified.active || !unverified.reasons.some((reason) => /not marked verified/i.test(reason))) {
    throw new Error(`Unverified provider identity should be inactive: ${JSON.stringify(unverified)}`);
  }

  const activated = await post("/pilot/users/activate", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    pilot_user_id: invited.id,
    external_subject: "clerk-r4-admin",
    actor: firm.principal_actor
  }, headers);
  if (activated.invite_status !== "ACTIVE" || activated.external_subject !== "clerk-r4-admin") {
    throw new Error("Pilot user activation failed.");
  }

  const activeContext = await get("/auth/provider-context", providerHeaders({ email: "r4.admin@example.com", subject: "clerk-r4-admin" }));
  if (!activeContext.active || activeContext.actor?.role !== "TENANT_ADMIN") {
    throw new Error(`Provider context did not resolve active tenant admin: ${JSON.stringify(activeContext)}`);
  }

  const suspended = await post("/pilot/users/suspend", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    pilot_user_id: invited.id,
    suspension_reason: "R4-S1 suspension gate rehearsal",
    actor: firm.principal_actor
  }, headers);
  if (suspended.invite_status !== "SUSPENDED") throw new Error("Pilot user was not suspended.");

  const suspendedContext = await get("/auth/provider-context", providerHeaders({ email: "r4.admin@example.com", subject: "clerk-r4-admin" }));
  if (suspendedContext.active) throw new Error("Suspended pilot user should not resolve as active.");

  const activateSuspended = await postRaw("/pilot/users/activate", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    pilot_user_id: invited.id,
    external_subject: "clerk-r4-admin",
    actor: firm.principal_actor
  }, headers);
  if (activateSuspended.res.ok) throw new Error("Suspended pilot user should not reactivate without new invitation.");

  const revoked = await post("/pilot/users/revoke", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    pilot_user_id: invited.id,
    revocation_reason: "R4-S1 revocation gate rehearsal",
    actor: firm.principal_actor
  }, headers);
  if (revoked.invite_status !== "REVOKED" || !revoked.revoked_at) throw new Error("Pilot user was not revoked.");

  const activateRevoked = await postRaw("/pilot/users/activate", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    pilot_user_id: invited.id,
    external_subject: "clerk-r4-admin",
    actor: firm.principal_actor
  }, headers);
  if (activateRevoked.res.ok) throw new Error("Revoked pilot user should not reactivate without new invitation.");

  const tenantB = await post("/tenants", { name: "R4 S1 Tenant B" });
  const firmB = await post("/firms", { tenant_id: tenantB.id, name: "R4 S1 Firm B", principal_name: "Ir. Other Principal" });
  const crossTenantRevoke = await postRaw("/pilot/users/revoke", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    pilot_user_id: invited.id,
    actor: firmB.principal_actor
  }, authHeaders(firmB));
  if (crossTenantRevoke.res.status !== 403) {
    throw new Error(`Cross-tenant pilot user revoke should be denied, got ${crossTenantRevoke.res.status}.`);
  }

  const policy = await get("/tenant-admin/policy", headers);
  if (policy.enforcement_status !== "R4_S1_PROVIDER_NEUTRAL_IDENTITY_ADMIN_DEFINED") {
    throw new Error(`Tenant admin policy not upgraded for R4-S1: ${JSON.stringify(policy)}`);
  }

  const auditEvents = await get("/audit-events", headers);
  for (const eventType of ["pilot_user.invited", "pilot_user.activated", "pilot_user.suspended", "pilot_user.revoked"]) {
    if (!auditEvents.some((event) => event.action === eventType)) throw new Error(`Missing audit action: ${eventType}`);
  }

  console.log(JSON.stringify({
    smoke: "r4-s1-staging-identity-tenant-admin",
    result: "passed",
    provider_contract: config.adapter_status,
    denials: ["duplicate_invite", "unverified_identity", "suspended_activation", "revoked_activation", "cross_tenant_revoke"],
    audit_events_checked: ["pilot_user.invited", "pilot_user.activated", "pilot_user.suspended", "pilot_user.revoked"]
  }, null, 2));
} finally {
  if (api.exitCode === null && !api.killed) {
    api.kill();
    await once(api, "exit").catch(() => {});
  }
  await rm(tmp, { recursive: true, force: true });
}
