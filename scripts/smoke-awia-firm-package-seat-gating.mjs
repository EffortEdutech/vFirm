import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

// Smoke coverage for ADR-073's operator-driven AWIA firm package assignment
// and seat/role gating (pre-billing: labels and limits only, no live payment,
// no runtime authority change). Verifies:
// - an operator can assign a package to a firm;
// - hiring within the package's seat/role limits succeeds;
// - hiring beyond the seat limit is rejected;
// - hiring a role the package disallows is rejected;
// - hiring with no package assigned at all is rejected;
// - cross-firm isolation: firm B's package assignment does not leak to firm A.

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-awia-package-gate-"));
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

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await response.json();
  return { response, json };
}

async function post(path, body, headers = {}) {
  const { response, json } = await request(path, { method: "POST", body, headers });
  if (!response.ok || !json.ok) throw new Error(`${path} failed: ${response.status} ${JSON.stringify(json)}`);
  return json.data;
}

async function postExpectError(path, body, headers = {}) {
  const { response, json } = await request(path, { method: "POST", body, headers });
  if (response.ok && json.ok) throw new Error(`${path} unexpectedly succeeded: ${JSON.stringify(json)}`);
  return json;
}

function authHeaders(firm) {
  return {
    "x-vfirm-actor-id": firm.principal_actor.id,
    "x-vfirm-tenant-id": firm.firm.tenant_id,
    "x-vfirm-firm-id": firm.firm.id,
    "x-vfirm-role": "principal"
  };
}

try {
  await waitForHealth();

  const tenantA = await post("/tenants", { name: "AWIA Package Gate Firm A Tenant" });
  const firmA = await post("/firms", { tenant_id: tenantA.id, name: "AWIA Package Gate Firm A", principal_name: "Ir. Principal A" });
  const headersA = authHeaders(firmA);

  const tenantB = await post("/tenants", { name: "AWIA Package Gate Firm B Tenant" });
  const firmB = await post("/firms", { tenant_id: tenantB.id, name: "AWIA Package Gate Firm B", principal_name: "Ir. Principal B" });
  const headersB = authHeaders(firmB);

  // No package assigned yet: hiring must be rejected.
  const rejectedNoPackage = await postExpectError("/awia/virtual-staff/provision-from-template", { tenant_id: tenantA.id, firm_id: firmA.firm.id, template_id: "lean_advisory_practice_v1", actor: firmA.principal_actor }, headersA);
  if (!String(rejectedNoPackage.error?.message ?? "").includes("AWIA_STAFF_HIRE_REQUIRES_PACKAGE_ASSIGNMENT")) throw new Error("Hiring with no AWIA firm package assigned was not rejected as expected.");

  // Assign SOLO_STAND (max 1 seat) to Firm A, then try a 3-seat template: seat limit exceeded.
  const assignmentA = await post("/ops/awia-package-assignment", { tenant_id: tenantA.id, firm_id: firmA.firm.id, package_code: "SOLO_STAND" }, headersA);
  if (assignmentA.package_code !== "SOLO_STAND") throw new Error("Firm A package assignment did not record SOLO_STAND.");

  const rejectedSeatLimit = await postExpectError("/awia/virtual-staff/provision-from-template", { tenant_id: tenantA.id, firm_id: firmA.firm.id, template_id: "lean_advisory_practice_v1", actor: firmA.principal_actor }, headersA);
  if (!String(rejectedSeatLimit.error?.message ?? "").includes("AWIA_FIRM_PACKAGE_SEAT_LIMIT_EXCEEDED")) throw new Error("Hiring beyond SOLO_STAND's 1-seat limit was not rejected as expected.");

  // Re-assign Firm A to ENT_GROW (3 seats, no CFO role) and try the same
  // template, which includes a CFO seat: role not allowed, even though the
  // seat count (3) would fit.
  await post("/ops/awia-package-assignment", { tenant_id: tenantA.id, firm_id: firmA.firm.id, package_code: "ENT_GROW" }, headersA);
  const rejectedRole = await postExpectError("/awia/virtual-staff/provision-from-template", { tenant_id: tenantA.id, firm_id: firmA.firm.id, template_id: "lean_advisory_practice_v1", actor: firmA.principal_actor }, headersA);
  if (!String(rejectedRole.error?.message ?? "").includes("AWIA_FIRM_PACKAGE_ROLE_NOT_ALLOWED:CFO")) throw new Error("Hiring a CFO seat under ENT_GROW (which excludes CFO) was not rejected as expected.");

  // Re-assign Firm A to CORPO_EXT (6 seats, all roles): the same template now succeeds.
  await post("/ops/awia-package-assignment", { tenant_id: tenantA.id, firm_id: firmA.firm.id, package_code: "CORPO_EXT" }, headersA);
  const runA = await post("/awia/virtual-staff/provision-from-template", { tenant_id: tenantA.id, firm_id: firmA.firm.id, template_id: "lean_advisory_practice_v1", actor: firmA.principal_actor }, headersA);
  if (runA.provisioning_run.summary.member_count !== 3) throw new Error(`Expected Firm A to hire 3 staff once assigned CORPO_EXT, got ${runA.provisioning_run.summary.member_count}.`);

  // Firm B: assign ENT_GROW and hire finance_back_office_v1 (no CFO-exclusive
  // problem here would be wrong -- that template DOES include a CFO seat, so
  // it must also be rejected for role, proving package assignment is firm-scoped
  // and does not leak from Firm A's now-CORPO_EXT assignment.
  await post("/ops/awia-package-assignment", { tenant_id: tenantB.id, firm_id: firmB.firm.id, package_code: "ENT_GROW" }, headersB);
  const rejectedBRole = await postExpectError("/awia/virtual-staff/provision-from-template", { tenant_id: tenantB.id, firm_id: firmB.firm.id, template_id: "finance_back_office_v1", actor: firmB.principal_actor }, headersB);
  if (!String(rejectedBRole.error?.message ?? "").includes("AWIA_FIRM_PACKAGE_ROLE_NOT_ALLOWED:CFO")) throw new Error("Firm B's independent ENT_GROW assignment did not correctly reject the CFO role (package assignment leaked across firms?).");

  // Confirm Firm B's rejected assignment record is genuinely isolated from Firm A's.
  const readA = (await request(`/ops/awia-package-assignment?tenant_id=${tenantA.id}&firm_id=${firmA.firm.id}`)).json.data;
  const readB = (await request(`/ops/awia-package-assignment?tenant_id=${tenantB.id}&firm_id=${firmB.firm.id}`)).json.data;
  if (readA.assignment.package_code !== "CORPO_EXT") throw new Error("Firm A package assignment read-back did not return CORPO_EXT.");
  if (readB.assignment.package_code !== "ENT_GROW") throw new Error("Firm B package assignment read-back did not return ENT_GROW.");
  if (readA.assignment.firm_id === readB.assignment.firm_id) throw new Error("Firm A and Firm B package assignments were not firm-scoped.");
  if (readA.catalogue.length !== 4) throw new Error(`Expected 4 catalogued AWIA firm packages, got ${readA.catalogue.length}.`);

  // Cross-firm export isolation: the new collection must be tenant/firm scoped
  // in the export manifest exactly like every other AWIA collection.
  const manifestA = (await request(`/data-protection/export-manifest?tenant_id=${tenantA.id}&firm_id=${firmA.firm.id}`, { headers: headersA })).json.data;
  if (!(manifestA.counts?.awia_firm_package_assignments >= 1)) throw new Error("Firm A export manifest did not include its awia_firm_package_assignments count.");

  console.log("AWIA firm package assignment and seat/role gating smoke passed.");
} finally {
  api.kill();
  await rm(tmp, { recursive: true, force: true });
}
