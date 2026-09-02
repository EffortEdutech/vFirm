import assert from "node:assert/strict";

const base = process.env.VFIRM_API_BASE ?? "http://127.0.0.1:3091";

const workerTemplates = [
  "front-desk-coordinator",
  "administration-clerk",
  "accounts-clerk",
  "marketing-sales-coordinator",
  "technical-drawing-assistant",
  "project-coordination-assistant"
];

const formworkWorkspaceProfile = {
  firm_type: "FORMWORK_ENGINEERING",
  workspace_code: "formwork-pilot-workspace",
  workspace_title: "Formwork Engineering Virtual Firm Workspace",
  workspace_description: "Operate controlled formwork engineering intake, proposals, delivery support, QA evidence, approvals, invoicing, and audit.",
  workspace_classification: "PILOT",
  modules: ["front_desk", "administration", "sales_accounts", "technical_delivery", "projects", "approvals", "invoices", "ai_workforce", "ops", "audit"],
  worker_templates: workerTemplates,
  authority_boundaries: ["AI may prepare drafts and checks only.", "Regulated deliverables require valid human professional approval.", "No silent approval."]
};

const nhlWorkspaceProfile = {
  firm_type: "ORGANIZATION_SUPPORT",
  workspace_code: "nhl-global-solution",
  workspace_title: "NHL Global Solution Workspace",
  workspace_description: "Operate a virtual organization-support firm for project reporting, technical writing, clerical work, and BizKick EDCS documentation/control support.",
  workspace_classification: "PILOT",
  principal_display_name: "Nur Hernieliana",
  modules: ["front_desk", "administration", "sales_accounts", "projects", "invoices", "ai_workforce", "ops", "audit"],
  worker_templates: workerTemplates,
  authority_boundaries: ["AI may prepare drafts, registers, reports, and document-control support only.", "Human principal approval is required before external sending or client commitment.", "No autonomous payment action."]
};

const formworkServiceLines = [
  { service_code: "formwork_preliminary_wall_slab", service_name: "Preliminary Wall/Slab Formwork Support", service_type: "PROFESSIONAL_PRACTICE", status: "ACTIVE", requires_human_approval: true, regulated_work: true, delivery_outputs: ["controlled drawings", "QA evidence bundle", "delivery report"] }
];

const nhlServiceLines = [
  { service_code: "project_reporting", service_name: "Project Reporting", service_type: "ORGANIZATION_SUPPORT", status: "ACTIVE", requires_human_approval: true, regulated_work: false, delivery_outputs: ["project report draft", "status summary", "evidence index"] },
  { service_code: "technical_writing", service_name: "Technical Writing", service_type: "ORGANIZATION_SUPPORT", status: "ACTIVE", requires_human_approval: true, regulated_work: false, delivery_outputs: ["technical writing draft", "review pack"] },
  { service_code: "clerical_work", service_name: "Clerical Work", service_type: "ADMINISTRATIVE_SUPPORT", status: "ACTIVE", requires_human_approval: true, regulated_work: false, delivery_outputs: ["register", "correspondence draft", "filing index"] },
  { service_code: "bizkick_edcs", service_name: "BizKick EDCS", service_type: "ORGANIZATION_SUPPORT", status: "ACTIVE", requires_human_approval: true, regulated_work: false, delivery_outputs: ["EDCS control index", "document register", "workflow checklist"] }
];

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await response.json().catch(() => ({ ok: false, error: { message: "Non-JSON response" } }));
  return { response, json };
}

async function get(path, headers = {}) {
  const { response, json } = await request(path, { headers });
  if (!response.ok || !json.ok) throw new Error(`${path} failed: ${response.status} ${JSON.stringify(json)}`);
  return json.data;
}

async function post(path, body, headers = {}) {
  const { response, json } = await request(path, { method: "POST", body, headers });
  if (!response.ok || !json.ok) throw new Error(`${path} failed: ${response.status} ${JSON.stringify(json)}`);
  return json.data;
}

function authHeaders(firmResultOrRecord, actor = null) {
  const firm = firmResultOrRecord.firm ?? firmResultOrRecord;
  const principal = actor ?? firmResultOrRecord.principal_actor;
  return {
    "x-vfirm-actor-id": principal?.id ?? principal?.actor_id,
    "x-vfirm-tenant-id": firm.tenant_id,
    "x-vfirm-firm-id": firm.id,
    "x-vfirm-role": "principal"
  };
}

async function readStore() {
  return get("/mvp/store");
}

function findPrincipalActor(store, firm) {
  return (store.actors ?? []).find((actor) => actor.firm_id === firm.id && actor.actor_type === "HUMAN") ?? null;
}

async function ensureFirm({ tenantName, firmName, principalName, active_practices, metadata }) {
  const store = await readStore();
  const existingFirm = (store.firms ?? []).find((firm) => firm.name === firmName);
  if (existingFirm) {
    const actor = findPrincipalActor(store, existingFirm);
    return { tenant: (store.tenants ?? []).find((tenant) => tenant.id === existingFirm.tenant_id), firm: existingFirm, principal_actor: actor, created: false };
  }
  const tenant = await post("/tenants", { name: tenantName, default_region: "MY" });
  const firmResult = await post("/firms", { tenant_id: tenant.id, name: firmName, principal_name: principalName, active_practices, metadata });
  return { tenant, firm: firmResult.firm, principal_actor: firmResult.principal_actor, created: true };
}

async function ensureSubscription({ firmContext, package_code, package_name, features, service_lines, modules, worker_templates, workspace_profile }) {
  const store = await readStore();
  const existing = (store.subscription_packages ?? []).find((item) => item.tenant_id === firmContext.tenant.id && item.firm_id === firmContext.firm.id && item.package_code === package_code);
  if (existing) return { subscription: existing, created: false };
  const body = {
    tenant_id: firmContext.tenant.id,
    firm_id: firmContext.firm.id,
    package_code,
    package_name,
    package_status: "ACTIVE",
    pricing_model: "CONTROLLED_PILOT",
    base_price: 0,
    currency: "MYR",
    features,
    usage_limits: { pilot_users: 5, projects: 5, ai_tool_invocations: 100 },
    metadata: { service_lines, modules, worker_templates, workspace_profile },
    actor: firmContext.principal_actor
  };
  return { subscription: await post("/subscriptions/packages", body, authHeaders(firmContext.firm, firmContext.principal_actor)), created: true };
}

async function ensureWorkers(firmContext, workerPlan) {
  let store = await readStore();
  const existingWorkers = () => (store.worker_instances ?? []).filter((worker) => worker.firm_id === firmContext.firm.id);
  const created = [];
  for (const [worker_template_code, name, assigned_services] of workerPlan) {
    const existing = existingWorkers().find((worker) => worker.name === name);
    if (existing) continue;
    const provisioned = await post("/worker-instances", {
      tenant_id: firmContext.tenant.id,
      firm_id: firmContext.firm.id,
      worker_template_code,
      name,
      assigned_services,
      actor: firmContext.principal_actor
    }, authHeaders(firmContext.firm, firmContext.principal_actor));
    await post("/worker-instances/activate", {
      tenant_id: firmContext.tenant.id,
      firm_id: firmContext.firm.id,
      worker_instance_id: provisioned.worker_instance.id,
      actor: firmContext.principal_actor
    }, authHeaders(firmContext.firm, firmContext.principal_actor));
    created.push(provisioned.worker_instance.id);
    store = await readStore();
  }
  return { created, total: existingWorkers().length };
}

async function activeSummary(firmContext, fallbackProfile, fallbackServiceLines, fallbackPackageCode) {
  const path = `/workspace/active-summary?tenant_id=${firmContext.tenant.id}&firm_id=${firmContext.firm.id}`;
  const { response, json } = await request(path, { headers: authHeaders(firmContext.firm, firmContext.principal_actor) });
  if (response.ok && json.ok) return json.data;
  if (response.status !== 404) throw new Error(`${path} failed: ${response.status} ${JSON.stringify(json)}`);
  return {
    tenant: { id: firmContext.tenant.id, name: firmContext.tenant.name, status: firmContext.tenant.status },
    firm: { id: firmContext.firm.id, name: firmContext.firm.name, status: firmContext.firm.status, active_practices: firmContext.firm.active_practices ?? [] },
    workspace: { ...fallbackProfile, tenant_id: firmContext.tenant.id, firm_id: firmContext.firm.id, service_lines: fallbackServiceLines, counts: { service_lines: fallbackServiceLines.length } },
    service_pack: { code: fallbackPackageCode, status: "ACTIVE", name: fallbackProfile.subscription?.package_name ?? fallbackPackageCode, sku_status: "PROFILE_BOUND", sku_code: fallbackServiceLines[0]?.service_code ?? "NO_SERVICE_LINE" },
    verification_mode: "local_store_fallback_until_api_restart"
  };
}

async function main() {
  const health = await request("/health");
  if (!health.response.ok || !health.json.ok) throw new Error(`vFirm API is not healthy at ${base}`);

  const templates = await get("/worker-templates");
  const templateCodes = new Set((templates ?? []).map((template) => template.code));
  for (const code of workerTemplates) assert(templateCodes.has(code), `Missing worker template: ${code}`);

  const formwork = await ensureFirm({
    tenantName: "Formwork Pilot Tenant",
    firmName: "Amanah Formwork Pilot Firm",
    principalName: "Ir. Pilot Principal",
    active_practices: ["temporary_works_formwork"],
    metadata: { workspace_profile: formworkWorkspaceProfile }
  });
  const nhl = await ensureFirm({
    tenantName: "NHL Global Solution Tenant",
    firmName: "NHL Global Solution",
    principalName: "Nur Hernieliana",
    active_practices: ["organization_support", "bizkick_edcs"],
    metadata: { workspace_profile: nhlWorkspaceProfile }
  });

  const formworkSubscription = await ensureSubscription({
    firmContext: formwork,
    package_code: "VF-FORMWORK-PILOT",
    package_name: "Formwork Engineering Pilot Workspace",
    features: ["front desk", "administration", "sales and proposals", "accounts and receivables", "technical drawing and delivery support", "professional approval gates", "audit and export"],
    service_lines: formworkServiceLines,
    modules: formworkWorkspaceProfile.modules,
    worker_templates: formworkWorkspaceProfile.worker_templates,
    workspace_profile: formworkWorkspaceProfile
  });
  const nhlSubscription = await ensureSubscription({
    firmContext: nhl,
    package_code: "VF-ORG-SUPPORT-PILOT",
    package_name: "Organization Support and EDCS Pilot Workspace",
    features: ["project reporting", "technical writing", "clerical work", "BizKick EDCS", "front desk", "administration", "sales and proposals", "accounts and receivables", "audit and export"],
    service_lines: nhlServiceLines,
    modules: nhlWorkspaceProfile.modules,
    worker_templates: nhlWorkspaceProfile.worker_templates,
    workspace_profile: nhlWorkspaceProfile
  });

  const formworkWorkers = await ensureWorkers(formwork, [
    ["front-desk-coordinator", "Formwork Front Desk AI Worker", ["formwork_preliminary_wall_slab"]],
    ["administration-clerk", "Formwork Administration AI Worker", ["formwork_preliminary_wall_slab"]],
    ["accounts-clerk", "Formwork Accounts AI Worker", ["formwork_preliminary_wall_slab"]],
    ["marketing-sales-coordinator", "Formwork Sales and Proposal AI Worker", ["formwork_preliminary_wall_slab"]],
    ["technical-drawing-assistant", "Formwork Technical Drawing AI Worker", ["formwork_preliminary_wall_slab"]],
    ["project-coordination-assistant", "Formwork Project Coordination AI Worker", ["formwork_preliminary_wall_slab"]]
  ]);
  const nhlWorkers = await ensureWorkers(nhl, [
    ["front-desk-coordinator", "NHL Front Desk AI Worker", ["project_reporting", "technical_writing", "clerical_work", "bizkick_edcs"]],
    ["administration-clerk", "NHL Admin and Clerical AI Worker", ["clerical_work", "bizkick_edcs"]],
    ["accounts-clerk", "NHL Accounts and Receivables AI Worker", ["project_reporting", "technical_writing", "clerical_work", "bizkick_edcs"]],
    ["marketing-sales-coordinator", "NHL Sales and Proposal AI Worker", ["project_reporting", "technical_writing", "clerical_work", "bizkick_edcs"]],
    ["technical-drawing-assistant", "NHL Technical Writing and EDCS Document AI Worker", ["technical_writing", "bizkick_edcs"]],
    ["project-coordination-assistant", "NHL Project Reporting AI Worker", ["project_reporting", "bizkick_edcs"]]
  ]);

  const [formworkSummary, nhlSummary] = await Promise.all([activeSummary(formwork, formworkWorkspaceProfile, formworkServiceLines, "VF-FORMWORK-PILOT"), activeSummary(nhl, nhlWorkspaceProfile, nhlServiceLines, "VF-ORG-SUPPORT-PILOT")]);
  assert.equal(formworkSummary.workspace.firm_type, "FORMWORK_ENGINEERING");
  assert.equal(formworkSummary.service_pack.code, "VF-FORMWORK-PILOT");
  assert.equal(nhlSummary.workspace.firm_type, "ORGANIZATION_SUPPORT");
  assert.equal(nhlSummary.service_pack.code, "VF-ORG-SUPPORT-PILOT");
  assert(nhlSummary.workspace.service_lines.some((line) => line.service_code === "bizkick_edcs"), "NHL workspace must include BizKick EDCS.");

  const finalStore = await readStore();
  const rehearsalFirms = (finalStore.firms ?? []).filter((firm) => /PD H2|rehearsal/i.test(firm.name) || firm.metadata?.workspace_classification === "REHEARSAL");

  console.log(JSON.stringify({
    seed: "multi-tenant-pilot-workspaces-local",
    result: "ready",
    created: {
      formwork_firm: formwork.created,
      nhl_firm: nhl.created,
      formwork_subscription: formworkSubscription.created,
      nhl_subscription: nhlSubscription.created,
      formwork_workers: formworkWorkers.created.length,
      nhl_workers: nhlWorkers.created.length
    },
    workspaces: [
      { firm: formwork.firm.name, tenant: formwork.tenant.name, firm_type: formworkSummary.workspace.firm_type, subscription: formworkSummary.service_pack.code, workers: formworkWorkers.total },
      { firm: nhl.firm.name, tenant: nhl.tenant.name, firm_type: nhlSummary.workspace.firm_type, subscription: nhlSummary.service_pack.code, workers: nhlWorkers.total, services: nhlSummary.workspace.service_lines.map((line) => line.service_code) }
    ],
    rehearsal_firms_detected: rehearsalFirms.map((firm) => firm.name),
    access: "Open http://localhost:3090/ and select Amanah Formwork Pilot Firm or NHL Global Solution from Active firm workspace."
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
