import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

// Smoke coverage for ADR-073/ADR-074's operator-driven AWIA firm package
// assignment, narrowed by ADR-075 to a single commercial package -- HireMe
// -- the business owner names the specific AWIA virtual worker(s) they want
// to hire, with human approval still required on every output. Pre-billing:
// labels and gating only, no live payment, no runtime authority change.
// Verifies:
// - an operator can assign HireMe to a firm;
// - hiring with no package assigned at all is rejected;
// - assigning an unrecognized package code is rejected;
// - once HireMe is assigned, hiring succeeds for any named roster (no seat
//   cap, no role restriction, matching ADR-075's "custom worker selection"
//   direction);
// - cross-firm isolation: Firm B's unassigned status is unaffected by Firm
//   A's assignment, and each firm's read-back is scoped to itself;
// - the catalogue now exposes exactly one package.

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

  // Assigning an unrecognized package code must be rejected.
  const rejectedUnknownPackage = await postExpectError("/ops/awia-package-assignment", { tenant_id: tenantA.id, firm_id: firmA.firm.id, package_code: "NOT_A_REAL_PACKAGE" }, headersA);
  if (!String(rejectedUnknownPackage.error?.message ?? "").includes("awia_firm_package_not_recognized")) throw new Error("Assigning an unrecognized AWIA firm package code was not rejected as expected.");

  // Assign HireMe to Firm A: hiring a roster with a CFO seat (finance_back_office_v1
  // has no CFO; use lean_advisory_practice_v1, which does have a CFO seat) now
  // succeeds -- no seat cap, no role restriction under HireMe.
  const assignmentA = await post("/ops/awia-package-assignment", { tenant_id: tenantA.id, firm_id: firmA.firm.id, package_code: "HIRE_ME" }, headersA);
  if (assignmentA.package_code !== "HIRE_ME") throw new Error("Firm A package assignment did not record HIRE_ME.");

  const runA = await post("/awia/virtual-staff/provision-from-template", { tenant_id: tenantA.id, firm_id: firmA.firm.id, template_id: "lean_advisory_practice_v1", actor: firmA.principal_actor }, headersA);
  if (runA.provisioning_run.summary.member_count !== 3) throw new Error(`Expected Firm A to hire 3 staff once assigned HireMe, got ${runA.provisioning_run.summary.member_count}.`);

  // Firm B remains unassigned: hiring must still be rejected there, proving
  // Firm A's assignment did not leak across firms.
  const rejectedBNoPackage = await postExpectError("/awia/virtual-staff/provision-from-template", { tenant_id: tenantB.id, firm_id: firmB.firm.id, template_id: "finance_back_office_v1", actor: firmB.principal_actor }, headersB);
  if (!String(rejectedBNoPackage.error?.message ?? "").includes("AWIA_STAFF_HIRE_REQUIRES_PACKAGE_ASSIGNMENT")) throw new Error("Firm B was unexpectedly able to hire without its own package assignment (Firm A's HireMe assignment leaked across firms?).");

  // Now assign Firm B its own HireMe package and confirm it can hire independently.
  await post("/ops/awia-package-assignment", { tenant_id: tenantB.id, firm_id: firmB.firm.id, package_code: "HIRE_ME" }, headersB);
  const runB = await post("/awia/virtual-staff/provision-from-template", { tenant_id: tenantB.id, firm_id: firmB.firm.id, template_id: "finance_back_office_v1", actor: firmB.principal_actor }, headersB);
  if (runB.provisioning_run.summary.member_count !== 4) throw new Error(`Expected Firm B to hire 4 staff once assigned HireMe, got ${runB.provisioning_run.summary.member_count}.`);

  // Read-back is firm-scoped, and the catalogue now exposes exactly one package.
  const readA = (await request(`/ops/awia-package-assignment?tenant_id=${tenantA.id}&firm_id=${firmA.firm.id}`)).json.data;
  const readB = (await request(`/ops/awia-package-assignment?tenant_id=${tenantB.id}&firm_id=${firmB.firm.id}`)).json.data;
  if (readA.assignment.package_code !== "HIRE_ME") throw new Error("Firm A package assignment read-back did not return HIRE_ME.");
  if (readB.assignment.package_code !== "HIRE_ME") throw new Error("Firm B package assignment read-back did not return HIRE_ME.");
  if (readA.assignment.firm_id === readB.assignment.firm_id) throw new Error("Firm A and Firm B package assignments were not firm-scoped.");
  if (readA.catalogue.length !== 1) throw new Error(`Expected exactly 1 catalogued AWIA firm package (HireMe only, per ADR-075), got ${readA.catalogue.length}.`);
  if (readA.catalogue[0].package_code !== "HIRE_ME") throw new Error("The sole catalogued AWIA firm package was not HIRE_ME.");

  // Cross-firm export isolation: the new collection must be tenant/firm scoped
  // in the export manifest exactly like every other AWIA collection.
  const manifestA = (await request(`/data-protection/export-manifest?tenant_id=${tenantA.id}&firm_id=${firmA.firm.id}`, { headers: headersA })).json.data;
  if (!(manifestA.counts?.awia_firm_package_assignments >= 1)) throw new Error("Firm A export manifest did not include its awia_firm_package_assignments count.");

  console.log("AWIA firm package assignment and seat/role gating smoke passed (HireMe-only, per ADR-075).");
} finally {
  api.kill();
  await rm(tmp, { recursive: true, force: true });
}
