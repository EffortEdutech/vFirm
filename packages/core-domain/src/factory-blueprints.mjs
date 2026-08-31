export const requiredStarterModules = [
  "front-desk",
  "administration",
  "accounts",
  "marketing-sales",
  "technical-drawing-support",
  "project-coordination"
];

export const forbiddenAiAuthorityActions = [
  "professional.approve",
  "professional.certify",
  "deliverable.issue.regulated",
  "engineering.conclusion.final",
  "payment.instruct"
];

export function validateFactoryBlueprintBundle(bundle) {
  const findings = [];
  const add = (code, message, path, severity = "ERROR") => findings.push({ code, message, path, severity });
  const has = (value) => value !== undefined && value !== null && value !== "";

  if (!bundle || typeof bundle !== "object") {
    add("BUNDLE_REQUIRED", "Blueprint bundle is required.", "$.");
    return { ok: false, findings };
  }

  const firm = bundle.firm_blueprint;
  const workforce = bundle.workforce_blueprint;
  const practice = bundle.practice_pack_manifest;
  const servicePack = bundle.service_delivery_pack_manifest;
  const governance = bundle.governance_pack_manifest;
  const jurisdiction = bundle.jurisdiction_pack_manifest;

  if (!firm) add("FIRM_BLUEPRINT_REQUIRED", "Firm Blueprint is required.", "$.firm_blueprint");
  if (!workforce) add("WORKFORCE_BLUEPRINT_REQUIRED", "Workforce Blueprint is required.", "$.workforce_blueprint");
  if (!practice) add("PRACTICE_PACK_REQUIRED", "Practice Pack manifest is required.", "$.practice_pack_manifest");
  if (!servicePack) add("SERVICE_DELIVERY_PACK_REQUIRED", "Service Delivery Pack manifest is required.", "$.service_delivery_pack_manifest");
  if (!governance) add("GOVERNANCE_PACK_REQUIRED", "Governance Pack manifest is required.", "$.governance_pack_manifest");
  if (!jurisdiction) add("JURISDICTION_PACK_REQUIRED", "Jurisdiction Pack manifest is required.", "$.jurisdiction_pack_manifest");
  if (findings.some((x) => x.severity === "ERROR")) return { ok: false, findings };

  if (!has(firm.firm_blueprint_id)) add("FIRM_BLUEPRINT_ID_REQUIRED", "Firm Blueprint id is required.", "$.firm_blueprint.firm_blueprint_id");
  if (!has(firm.firm_name)) add("FIRM_NAME_REQUIRED", "Firm name is required.", "$.firm_blueprint.firm_name");
  if (!firm.virtual_principal) add("VIRTUAL_PRINCIPAL_REQUIRED", "Virtual Principal is required.", "$.firm_blueprint.virtual_principal");
  if (firm.virtual_principal && !has(firm.virtual_principal.professional_id)) add("VIRTUAL_PRINCIPAL_PROFESSIONAL_REQUIRED", "Virtual Principal must reference a human professional identity.", "$.firm_blueprint.virtual_principal.professional_id");

  const modules = Array.isArray(firm.modules) ? firm.modules : [];
  for (const moduleCode of requiredStarterModules) {
    if (!modules.some((item) => item.code === moduleCode && item.enabled === true)) add("STARTER_MODULE_REQUIRED", `Required starter module is missing or disabled: ${moduleCode}.`, "$.firm_blueprint.modules");
  }

  const services = Array.isArray(firm.services) ? firm.services : [];
  if (services.length === 0) add("SERVICE_REQUIRED", "At least one service must be declared.", "$.firm_blueprint.services");
  for (const [index, service] of services.entries()) {
    if (!has(service.service_id)) add("SERVICE_ID_REQUIRED", "Service id is required.", `$.firm_blueprint.services[${index}].service_id`);
    if (service.risk_class === "REGULATED" && !has(service.responsible_professional_id)) add("RESPONSIBLE_PROFESSIONAL_REQUIRED", "Regulated service must identify a responsible authorized professional.", `$.firm_blueprint.services[${index}].responsible_professional_id`);
    if (service.jurisdiction && !jurisdiction.jurisdictions?.some((x) => x.code === service.jurisdiction && x.status === "ACTIVE")) add("SERVICE_JURISDICTION_NOT_ACTIVE", `Service jurisdiction is not active in Jurisdiction Pack: ${service.jurisdiction}.`, `$.firm_blueprint.services[${index}].jurisdiction`);
  }

  const workers = Array.isArray(workforce.workers) ? workforce.workers : [];
  if (workers.length === 0) add("WORKER_REQUIRED", "At least one worker binding must be declared.", "$.workforce_blueprint.workers");
  for (const [index, worker] of workers.entries()) {
    if (!has(worker.role_skill_ref)) add("ROLE_SKILL_REF_REQUIRED", "Worker must reference a role skill.", `$.workforce_blueprint.workers[${index}].role_skill_ref`);
    if (!has(worker.worker_skill_ref)) add("WORKER_SKILL_REF_REQUIRED", "Worker must reference a worker skill.", `$.workforce_blueprint.workers[${index}].worker_skill_ref`);
    if (!worker.authority_envelope) add("AUTHORITY_ENVELOPE_REQUIRED", "Worker must include an authority envelope.", `$.workforce_blueprint.workers[${index}].authority_envelope`);
    if (!has(worker.supervisor_actor_id)) add("SUPERVISOR_REQUIRED", "Worker must have a supervisor actor.", `$.workforce_blueprint.workers[${index}].supervisor_actor_id`);
    if (!has(worker.escalation_route)) add("ESCALATION_ROUTE_REQUIRED", "Worker must have an escalation route.", `$.workforce_blueprint.workers[${index}].escalation_route`);
    if (!worker.memory_boundary) add("MEMORY_BOUNDARY_REQUIRED", "Worker must declare memory boundary.", `$.workforce_blueprint.workers[${index}].memory_boundary`);
    if (!worker.budget_boundary) add("BUDGET_BOUNDARY_REQUIRED", "Worker must declare budget boundary.", `$.workforce_blueprint.workers[${index}].budget_boundary`);
    const permitted = worker.authority_envelope?.permitted_actions ?? [];
    for (const action of permitted) {
      if (forbiddenAiAuthorityActions.includes(action) && worker.actor_type !== "HUMAN") add("UNSAFE_WORKER_AUTHORITY", `Non-human worker cannot be granted authority action: ${action}.`, `$.workforce_blueprint.workers[${index}].authority_envelope.permitted_actions`);
    }
  }

  const approvalRules = governance.approval_rules ?? [];
  for (const service of services.filter((item) => item.risk_class === "REGULATED")) {
    const hasRule = approvalRules.some((rule) => rule.service_id === service.service_id && rule.approver_type === "AUTHORIZED_HUMAN_PROFESSIONAL" && rule.silent_approval_allowed === false);
    if (!hasRule) add("HUMAN_APPROVAL_RULE_REQUIRED", `Regulated service requires explicit authorized human professional approval rule: ${service.service_id}.`, "$.governance_pack_manifest.approval_rules");
  }

  const deliveryStates = servicePack.delivery_states ?? [];
  const issueState = deliveryStates.find((state) => state.code === "ISSUED" || state.allows_external_issue === true);
  if (issueState && issueState.requires_human_professional_approval !== true) add("APPROVAL_BYPASS_STATE_DENIED", "Service Delivery Pack cannot expose issue/final state without human professional approval.", "$.service_delivery_pack_manifest.delivery_states");

  const compatiblePractice = servicePack.practice_pack_ref === practice.practice_pack_id;
  if (!compatiblePractice) add("PRACTICE_PACK_REF_MISMATCH", "Service Delivery Pack must reference the selected Practice Pack.", "$.service_delivery_pack_manifest.practice_pack_ref");

  const allowedJurisdictions = new Set((jurisdiction.jurisdictions ?? []).filter((x) => x.status === "ACTIVE").map((x) => x.code));
  for (const credential of jurisdiction.credential_rules ?? []) {
    if (!allowedJurisdictions.has(credential.jurisdiction)) add("CREDENTIAL_JURISDICTION_INACTIVE", `Credential rule references inactive jurisdiction: ${credential.jurisdiction}.`, "$.jurisdiction_pack_manifest.credential_rules");
  }

  return { ok: findings.every((x) => x.severity !== "ERROR"), findings };
}