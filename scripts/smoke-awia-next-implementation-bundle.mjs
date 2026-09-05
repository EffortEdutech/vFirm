import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-awia-next-"));
const port = 3107;
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
  const tenant = await post("/tenants", { name: "AWIA Next Bundle Tenant" });
  const firm = await post("/firms", { tenant_id: tenant.id, name: "AWIA Next Bundle Firm", principal_name: "Ir. AWIA Principal" });
  const headers = authHeaders(firm);
  const actor = firm.principal_actor;
  const client = await post("/clients", { tenant_id: tenant.id, firm_id: firm.firm.id, name: "AWIA Pilot Client", actor }, headers);
  const intake = await post("/intake-sessions", { tenant_id: tenant.id, firm_id: firm.firm.id, relationship_id: client.relationship.id, actor, provided_inputs: { project_name: "AWIA Staff Pilot", site_location: "Kuala Lumpur", client_organization: "AWIA Pilot Client", client_contact_name: "PM", client_contact_email: "pm@example.com", structure_type: "basement", formwork_element_type: "wall", height: 3.5, length_or_area: 120, concrete_grade: "C30", available_drawings: ["S-100"], deadline: new Date(Date.now() + 14 * 86400000).toISOString(), required_deliverables: ["preliminary_support_report"] } }, headers);
  const proposal = await post("/proposals", { tenant_id: tenant.id, firm_id: firm.firm.id, relationship_id: client.relationship.id, intake_session_id: intake.intake.id, scope_summary: "AWIA staff operating experience pilot", final_price: 2500, actor }, headers);
  const approved = await post("/proposals/approve", { tenant_id: tenant.id, firm_id: firm.firm.id, proposal_id: proposal.proposal.id, actor }, headers);
  const delivery = await post("/proposals/accept", { tenant_id: tenant.id, firm_id: firm.firm.id, proposal_id: approved.proposal.id, project_name: "AWIA Staff Pilot", actor }, headers);
  const provisioned = await post("/awia/virtual-staff/provision-pilot", { tenant_id: tenant.id, firm_id: firm.firm.id, actor }, headers);
  if (provisioned.provisioning_run.summary.member_count !== 8) throw new Error("AWIA pilot roster did not provision 8 virtual staff.");
  if (provisioned.provisioning_run.runtime_execution_enabled !== false) throw new Error("AWIA provisioning must not enable autonomous runtime execution.");

  const members = (await request("/awia-virtual-staff-members")).json.data;
  if (members.length !== 8) throw new Error(`Expected 8 persisted AWIA members, got ${members.length}.`);

  const active = await post("/awia/virtual-staff/lifecycle", { tenant_id: tenant.id, firm_id: firm.firm.id, staff_code: "CFO-001", to_state: "ACTIVE", actor }, headers);
  if (active.member.lifecycle_status !== "ACTIVE") throw new Error("CFO-001 did not activate.");

  const allowed = await post("/awia/virtual-staff/task-readiness", { tenant_id: tenant.id, firm_id: firm.firm.id, staff_code: "CFO-001", action: "finance.analysis.prepare", tool: "finance.analysis.prepare", client_id: client.client.id, project_id: delivery.project.id, evidence_refs: ["evidence-controlled-source"], actor }, headers);
  if (allowed.decision !== "ALLOW") throw new Error(`Expected controlled CFO readiness to allow, got ${allowed.decision}.`);

  const assigned = await post("/awia/virtual-staff/assign-task", { tenant_id: tenant.id, firm_id: firm.firm.id, staff_code: "CFO-001", task_id: delivery.task.id, action: "finance.analysis.prepare", tool: "finance.analysis.prepare", client_id: client.client.id, project_id: delivery.project.id, evidence_refs: ["evidence-controlled-source"], actor }, headers);
  if (assigned.workdesk_item.workdesk_status !== "ASSIGNED" || assigned.task.state !== "ASSIGNED_TO_AWIA_STAFF") throw new Error("AWIA task was not assigned to the staff workdesk.");
  const outputDraft = await post("/awia/virtual-staff/output-draft", { tenant_id: tenant.id, firm_id: firm.firm.id, workdesk_item_id: assigned.workdesk_item.id, output_title: "AWIA controlled staff draft", output_summary: "Draft-only output for human review.", actor }, headers);
  if (!outputDraft.output_draft.requires_human_review || outputDraft.output_draft.final_issue_allowed !== false) throw new Error("AWIA output draft must require human review and block final issue.");
  const reviewed = await post("/awia/virtual-staff/output-review", { tenant_id: tenant.id, firm_id: firm.firm.id, output_draft_id: outputDraft.output_draft.id, review_decision: "APPROVED_FOR_CLIENT_DRAFT", review_notes: "Human review passed for client draft preparation.", actor }, headers);
  if (reviewed.output_review.review_decision !== "APPROVED_FOR_CLIENT_DRAFT") throw new Error("AWIA output review did not approve client draft preparation.");
  const clientDraft = await post("/awia/virtual-staff/client-delivery-draft", { tenant_id: tenant.id, firm_id: firm.firm.id, output_draft_id: outputDraft.output_draft.id, client_id: client.client.id, actor }, headers);
  if (clientDraft.client_delivery_draft.final_issue_allowed !== false || !clientDraft.client_delivery_draft.requires_human_issue_approval) throw new Error("Client delivery draft must remain non-final and require human issue approval.");
  const denied = await post("/awia/virtual-staff/task-readiness", { tenant_id: tenant.id, firm_id: firm.firm.id, staff_code: "CFO-001", action: "payment.release", tool: "finance.governance.review", risk_class: "HIGH", client_id: client.client.id, project_id: delivery.project.id, evidence_refs: ["evidence-controlled-source"], approval: { approved_by_actor_id: actor.id, approval_id: "human-approval-001" }, actor }, headers);
  if (denied.decision !== "DENY" || !denied.findings.some((finding) => finding.code === "PAYMENT_RELEASE_DENIED")) throw new Error("Payment release must remain denied.");

  const evidencePacks = (await request("/awia-staff-evidence-packs")).json.data;
  if (evidencePacks.length !== 1 || evidencePacks[0].pilot_gate.recommendation !== "GO_FOR_CONTROLLED_HUMAN_GOVERNED_PILOT_REHEARSAL") throw new Error("AWIA evidence pack did not persist pilot gate recommendation.");

  const auditEvents = (await request("/audit-events")).json.data.filter((event) => event.action?.startsWith("awia.virtual_staff."));
  if (auditEvents.length < 7) throw new Error("AWIA commands were not audit-recorded.");

  console.log("AWIA next implementation bundle smoke passed.");
} finally {
  api.kill();
  await rm(tmp, { recursive: true, force: true });
}


