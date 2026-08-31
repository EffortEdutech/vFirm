import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const postgres = process.argv.includes("--postgres");
const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-sf-s6-"));
const port = 3116;
const base = `http://127.0.0.1:${port}`;
const env = { ...process.env, VFIRM_API_PORT: String(port) };
if (!postgres) {
  env.VFIRM_STORE_BACKEND = "json";
  env.VFIRM_STORE_PATH = join(tmp, "store.json");
  env.DATABASE_URL = "";
} else {
  env.VFIRM_STORE_BACKEND = "postgres";
  delete env.VFIRM_STORE_PATH;
}

const child = spawn(process.execPath, ["apps/api/src/server.mjs"], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
let logs = "";
child.stdout.on("data", (x) => logs += x);
child.stderr.on("data", (x) => logs += x);

async function wait() {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(base + "/health")).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(logs);
}
async function req(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(base + path, { method, headers: { "content-type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined });
  return { response, json: await response.json() };
}
async function post(path, body, headers = {}) {
  const { response, json } = await req(path, { method: "POST", body, headers });
  if (!response.ok || !json.ok) throw new Error(`${path}: ${response.status} ${JSON.stringify(json)}`);
  return json.data;
}

try {
  await wait();
  const stamp = Date.now();
  const tenant = await post("/tenants", { name: `SF-S6 Tenant ${stamp}` });
  const firm = await post("/firms", { tenant_id: tenant.id, name: `SF-S6 Firm ${stamp}`, principal_name: "Ir. Principal" });
  const h = { "x-vfirm-actor-id": firm.principal_actor.id, "x-vfirm-tenant-id": tenant.id, "x-vfirm-firm-id": firm.firm.id, "x-vfirm-role": "principal" };
  const enquiry = await post("/front-desk/enquiries", { tenant_id: tenant.id, firm_id: firm.firm.id, contact_name: "Pilot Client", organization_name: "Pilot Contractor", contact_email: "pilot@example.com", enquiry_summary: "Representative working-week Formwork support enquiry." }, h);
  await post("/front-desk/enquiries/qualify", { tenant_id: tenant.id, firm_id: firm.firm.id, enquiry_id: enquiry.id, decision: "QUALIFIED", consent_or_legal_basis_ref: "CONSENT-S6", conflict_check_status: "CLEARED", conflict_check_ref: "CONFLICT-S6" }, h);
  await post("/front-desk/communication-drafts", { tenant_id: tenant.id, firm_id: firm.firm.id, enquiry_id: enquiry.id, subject: "Acknowledgement", message_body: "Thank you. Principal review will follow." }, h);
  const handoff = await post("/front-desk/enquiries/handoff", { tenant_id: tenant.id, firm_id: firm.firm.id, enquiry_id: enquiry.id, provided_inputs: {} }, h);
  const input = { project_name: "SF-S6 Working Week", site_location: "Kuala Lumpur", client_organization: "Pilot Contractor", client_contact_name: "Pilot Client", client_contact_email: "pilot@example.com", structure_type: "podium", formwork_element_type: "slab", height: 3.2, length_or_area: 250, concrete_grade: "C35", available_drawings: ["S6-001"], deadline: new Date(Date.now() + 14 * 86400000).toISOString(), required_deliverables: ["drawing_support_pack"] };
  const intake = await post("/intake-sessions", { tenant_id: tenant.id, firm_id: firm.firm.id, relationship_id: handoff.relationship.id, provided_inputs: input }, h);
  const proposal = await post("/proposals", { tenant_id: tenant.id, firm_id: firm.firm.id, relationship_id: handoff.relationship.id, intake_session_id: intake.intake.id, scope_summary: "SF-S6 working-week proposal", final_price: 4300 }, h);
  const approved = await post("/proposals/approve", { tenant_id: tenant.id, firm_id: firm.firm.id, proposal_id: proposal.proposal.id }, h);
  const project = await post("/proposals/accept", { tenant_id: tenant.id, firm_id: firm.firm.id, proposal_id: approved.proposal.id, project_name: "SF-S6 Working Week" }, h);
  await post("/administration/correspondence", { tenant_id: tenant.id, firm_id: firm.firm.id, relationship_id: handoff.relationship.id, project_id: project.project.id, subject: "Drawing package received", correspondent: "Pilot Contractor", direction: "INCOMING", channel: "EMAIL" }, h);
  await post("/administration/deadlines", { tenant_id: tenant.id, firm_id: firm.firm.id, project_id: project.project.id, title: "Principal review of technical package", due_at: new Date(Date.now() + 3 * 86400000).toISOString(), priority: "HIGH" }, h);
  const doc = await post("/administration/documents", { tenant_id: tenant.id, firm_id: firm.firm.id, relationship_id: handoff.relationship.id, project_id: project.project.id, document_number: `S6-${stamp}`, title: "Working week drawing", document_type: "TECHNICAL_DRAWING", discipline: "TEMPORARY_WORKS", classification: "CONFIDENTIAL", revision: "P01", storage_ref: "doc://s6-p01", content_hash: "hash-s6-p01" }, h);
  const rev = await post("/administration/document-revisions", { tenant_id: tenant.id, firm_id: firm.firm.id, document_register_entry_id: doc.document.id, revision: "P02", storage_ref: "doc://s6-p02", content_hash: "hash-s6-p02" }, h);
  const review = await post("/technical/drawing-reviews", { tenant_id: tenant.id, firm_id: firm.firm.id, project_id: project.project.id, document_register_entry_id: doc.document.id, base_revision_id: doc.revision.id, compared_revision_id: rev.revision.id }, h);
  const calc = await post("/technical/calculation-input-sets", { tenant_id: tenant.id, firm_id: firm.firm.id, project_id: project.project.id, intake_session_id: intake.intake.id, source_revision_refs: [rev.revision.id], input_values: input }, h);
  assert.equal(calc.validation_status, "VALID");
  const pkg = await post("/technical/delivery-packages", { tenant_id: tenant.id, firm_id: firm.firm.id, project_id: project.project.id, drawing_revision_refs: [rev.revision.id], calculation_input_set_id: calc.id, evidence_refs: [review.id] }, h);
  assert.equal(pkg.package_status, "READY_FOR_PRINCIPAL_REVIEW");
  const expense = await post("/accounts/expenses", { tenant_id: tenant.id, firm_id: firm.firm.id, project_id: project.project.id, supplier: "Printing Supplier", description: "Pilot document print pack", amount: 120, currency: "MYR" }, h);
  assert.equal(expense.status, "DRAFT_REVIEW_REQUIRED");
  const invoice = await post("/invoices", { tenant_id: tenant.id, firm_id: firm.firm.id, relationship_id: handoff.relationship.id, engagement_id: project.engagement.id, project_id: project.project.id, line_items: [{ description: "SF-S6 Pilot Service", amount: 4300 }], currency: "MYR" }, h);
  assert.equal(invoice.status, "DRAFT");
  const { response: todayResponse, json: todayJson } = await req(`/operations/today?tenant_id=${tenant.id}&firm_id=${firm.firm.id}`, { headers: h });
  assert.equal(todayResponse.status, 200);
  const today = todayJson.data;
  assert.equal(today.status, "READY_FOR_HANDOFF_ACCEPTANCE");
  assert(today.counts.pending_approvals >= 3);
  assert.equal(today.counts.blocked_delivery_packages, 0);
  assert.equal(today.exceptions.length, 0);
  assert(today.cash.outstanding >= 4300);
  assert(today.rehearsal_checks.every((item) => item.status === "PASS"));
  const systemActor = { actor_id: "00000000-0000-0000-0000-000000000000", actor_type: "SYSTEM", tenant_id: tenant.id, firm_id: firm.firm.id, role: "system" };
  const denied = await req("/pilot/handoff", { method: "POST", headers: h, body: { tenant_id: tenant.id, firm_id: firm.firm.id, actor: systemActor } });
  assert(denied.response.status >= 400);
  const acceptance = await post("/pilot/handoff", { tenant_id: tenant.id, firm_id: firm.firm.id, evidence_refs: [pkg.id, invoice.id], decision_summary: "Representative SF-S6 working-week rehearsal accepted." }, h);
  assert.equal(acceptance.handoff_status, "ACCEPTED_FOR_CONTROLLED_LOCAL_PILOT");
  const otherTenant = await post("/tenants", { name: `SF-S6 Other ${stamp}` });
  const otherFirm = await post("/firms", { tenant_id: otherTenant.id, name: `SF-S6 Other Firm ${stamp}`, principal_name: "Other Principal" });
  const oh = { "x-vfirm-actor-id": otherFirm.principal_actor.id, "x-vfirm-tenant-id": otherTenant.id, "x-vfirm-firm-id": otherFirm.firm.id, "x-vfirm-role": "principal" };
  const isolated = await req(`/operations/today?tenant_id=${tenant.id}&firm_id=${firm.firm.id}`, { headers: oh });
  assert(isolated.response.status >= 400);
  const events = (await req(`/event-log?tenant_id=${tenant.id}&firm_id=${firm.firm.id}`, { headers: h })).json.data;
  assert(events.some((item) => item.event_type === "pilot_handoff.accepted"));
  console.log(`SF-S6 Daily Operations and Pilot Handoff smoke passed (${postgres ? "postgres" : "json"}).`);
} finally {
  if (child.exitCode === null) {
    child.kill();
    await once(child, "exit").catch(() => {});
  }
  await rm(tmp, { recursive: true, force: true });
}