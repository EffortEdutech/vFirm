import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-awia-payroll-"));
const port = 3110;
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
  const tenant = await post("/tenants", { name: "AWIA Payroll Bundle Tenant" });
  const firm = await post("/firms", { tenant_id: tenant.id, name: "AWIA Payroll Bundle Firm", principal_name: "Ir. AWIA Principal" });
  const headers = authHeaders(firm);
  const actor = firm.principal_actor;

  const provisioned = await post("/awia/virtual-staff/provision-pilot", { tenant_id: tenant.id, firm_id: firm.firm.id, actor }, headers);
  if (provisioned.provisioning_run.summary.member_count !== 8) throw new Error("AWIA pilot roster did not provision 8 virtual staff.");

  const baselinePayroll = (await request(`/awia/virtual-staff/payroll-summary?tenant_id=${tenant.id}&firm_id=${firm.firm.id}`)).json.data;
  if (baselinePayroll.seat_count !== 8) throw new Error(`Expected 8 seats, got ${baselinePayroll.seat_count}.`);
  if ((baselinePayroll.seats_by_billing_status.DRAFT ?? 0) !== 8) throw new Error("All seats should start in DRAFT billing status.");
  if (baselinePayroll.monthly_totals_by_currency.length !== 0) throw new Error("No monthly total should accrue before any seat is billing-active.");

  // Illegal transition: DRAFT cannot jump straight to BILLING_ACTIVE.
  const illegal = await postExpectError("/awia/virtual-staff/seat-billing-status", { tenant_id: tenant.id, firm_id: firm.firm.id, staff_code: "CFO-001", to_status: "BILLING_ACTIVE", actor }, headers);
  if (!String(illegal.error?.message ?? "").includes("seat_billing_transition_not_allowed")) throw new Error("Illegal DRAFT->BILLING_ACTIVE transition was not rejected as expected.");

  await post("/awia/virtual-staff/seat-billing-status", { tenant_id: tenant.id, firm_id: firm.firm.id, staff_code: "CFO-001", to_status: "PENDING_ACTIVATION", actor }, headers);
  const activated = await post("/awia/virtual-staff/seat-billing-status", { tenant_id: tenant.id, firm_id: firm.firm.id, staff_code: "CFO-001", to_status: "BILLING_ACTIVE", note: "Pilot invoice settled manually outside the platform.", actor }, headers);
  if (activated.seat.billing_status !== "BILLING_ACTIVE") throw new Error("CFO-001 seat did not reach BILLING_ACTIVE.");
  if (!("monthly_amount" in {}) && activated.billing_event.boundary !== "billing_bookkeeping_only_no_live_payment_release") throw new Error("Seat billing event did not carry the no-live-payment boundary marker.");

  const payrollAfterActivation = (await request(`/awia/virtual-staff/payroll-summary?tenant_id=${tenant.id}&firm_id=${firm.firm.id}`)).json.data;
  if ((payrollAfterActivation.seats_by_billing_status.BILLING_ACTIVE ?? 0) !== 1) throw new Error("Expected exactly 1 BILLING_ACTIVE seat.");
  const myrTotal = payrollAfterActivation.monthly_totals_by_currency.find((row) => row.currency === "MYR");
  if (!myrTotal || myrTotal.monthly_total_amount !== 1200) throw new Error(`Expected CFO Executive-grade monthly total of 1200 MYR, got ${JSON.stringify(myrTotal)}.`);

  const billingEvents = (await request("/awia-staff-seat-billing-events")).json.data;
  if (billingEvents.length !== 2) throw new Error(`Expected 2 recorded billing events, got ${billingEvents.length}.`);

  const auditEvents = (await request("/audit-events")).json.data.filter((event) => event.action === "awia.virtual_staff.seat_billing_status_updated");
  if (auditEvents.length !== 2) throw new Error("Seat billing status updates were not audit-recorded.");

  console.log("AWIA payroll and seat billing polish smoke passed.");
} finally {
  api.kill();
  await rm(tmp, { recursive: true, force: true });
}
