import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-awia-dashboard-"));
const port = 3109;
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
  const tenant = await post("/tenants", { name: "AWIA Dashboard Bundle Tenant" });
  const firm = await post("/firms", { tenant_id: tenant.id, name: "AWIA Dashboard Bundle Firm", principal_name: "Ir. AWIA Principal" });
  const headers = authHeaders(firm);
  const actor = firm.principal_actor;
  const client = await post("/clients", { tenant_id: tenant.id, firm_id: firm.firm.id, name: "AWIA Dashboard Client", actor }, headers);
  const intake = await post("/intake-sessions", { tenant_id: tenant.id, firm_id: firm.firm.id, relationship_id: client.relationship.id, actor, provided_inputs: { project_name: "AWIA Dashboard Pilot", site_location: "Kuala Lumpur", client_organization: "AWIA Dashboard Client", client_contact_name: "PM", client_contact_email: "pm@example.com", structure_type: "basement", formwork_element_type: "wall", height: 3.5, length_or_area: 120, concrete_grade: "C30", available_drawings: ["S-100"], deadline: new Date(Date.now() + 14 * 86400000).toISOString(), required_deliverables: ["preliminary_support_report"] } }, headers);
  const proposal = await post("/proposals", { tenant_id: tenant.id, firm_id: firm.firm.id, relationship_id: client.relationship.id, intake_session_id: intake.intake.id, scope_summary: "AWIA department dashboard pilot", final_price: 2500, actor }, headers);
  const approved = await post("/proposals/approve", { tenant_id: tenant.id, firm_id: firm.firm.id, proposal_id: proposal.proposal.id, actor }, headers);
  const delivery = await post("/proposals/accept", { tenant_id: tenant.id, firm_id: firm.firm.id, proposal_id: approved.proposal.id, project_name: "AWIA Dashboard Pilot", actor }, headers);

  const provisioned = await post("/awia/virtual-staff/provision-pilot", { tenant_id: tenant.id, firm_id: firm.firm.id, actor }, headers);
  if (provisioned.provisioning_run.summary.member_count !== 8) throw new Error("AWIA pilot roster did not provision 8 virtual staff.");

  const emptyDashboard = await request(`/awia/virtual-staff/department-dashboard?tenant_id=${tenant.id}&firm_id=${firm.firm.id}`);
  if (!emptyDashboard.response.ok) throw new Error("AWIA department dashboard request failed before any activity.");
  if (emptyDashboard.json.data.total_staff !== 8) throw new Error(`Expected dashboard to see 8 provisioned staff, got ${emptyDashboard.json.data.total_staff}.`);
  if (emptyDashboard.json.data.total_active_staff !== 0) throw new Error("No staff should be active before lifecycle transition.");

  await post("/awia/virtual-staff/lifecycle", { tenant_id: tenant.id, firm_id: firm.firm.id, staff_code: "CFO-001", to_state: "ACTIVE", actor }, headers);
  const assigned = await post("/awia/virtual-staff/assign-task", { tenant_id: tenant.id, firm_id: firm.firm.id, staff_code: "CFO-001", task_id: delivery.task.id, action: "finance.analysis.prepare", tool: "finance.analysis.prepare", client_id: client.client.id, project_id: delivery.project.id, evidence_refs: ["evidence-controlled-source"], actor }, headers);
  const outputDraft = await post("/awia/virtual-staff/output-draft", { tenant_id: tenant.id, firm_id: firm.firm.id, workdesk_item_id: assigned.workdesk_item.id, output_title: "AWIA dashboard draft", output_summary: "Draft for dashboard coverage.", actor }, headers);
  await post("/awia/virtual-staff/task-readiness", { tenant_id: tenant.id, firm_id: firm.firm.id, staff_code: "CFO-001", action: "payment.release", tool: "finance.governance.review", risk_class: "HIGH", client_id: client.client.id, project_id: delivery.project.id, evidence_refs: ["evidence-controlled-source"], approval: { approved_by_actor_id: actor.id, approval_id: "human-approval-001" }, actor }, headers);

  const dashboard = (await request(`/awia/virtual-staff/department-dashboard?tenant_id=${tenant.id}&firm_id=${firm.firm.id}`)).json.data;
  if (dashboard.total_staff !== 8) throw new Error(`Expected 8 total staff, got ${dashboard.total_staff}.`);
  if (dashboard.total_active_staff !== 1) throw new Error(`Expected 1 active staff after CFO-001 activation, got ${dashboard.total_active_staff}.`);
  const cfoBucket = dashboard.departments.find((department) => department.department === "CFO");
  if (!cfoBucket) throw new Error("CFO department bucket missing from dashboard.");
  if (cfoBucket.staff_active !== 1) throw new Error("CFO department did not report 1 active staff member.");
  if (cfoBucket.output_drafts_pending_review !== 1) throw new Error("CFO department did not report 1 pending-review output draft.");
  if (cfoBucket.task_readiness_deny_count !== 1) throw new Error("CFO department did not report the denied payment-release readiness check.");
  if (!outputDraft.output_draft.requires_human_review) throw new Error("Output draft used for dashboard coverage should require human review.");
  if (dashboard.total_task_readiness_deny_count !== 1) throw new Error("Dashboard-wide deny count did not reflect the denied readiness check.");

  const secondTenant = await post("/tenants", { name: "AWIA Dashboard Isolation Tenant" });
  const secondFirm = await post("/firms", { tenant_id: secondTenant.id, name: "AWIA Dashboard Isolation Firm", principal_name: "Ir. AWIA Second Principal" });
  const scopedOut = (await request(`/awia/virtual-staff/department-dashboard?tenant_id=${secondTenant.id}&firm_id=${secondFirm.firm.id}`)).json.data;
  if (scopedOut.total_staff !== 0) throw new Error("AWIA department dashboard leaked data across tenant/firm scope.");

  console.log("AWIA department dashboards smoke passed.");
} finally {
  api.kill();
  await rm(tmp, { recursive: true, force: true });
}
