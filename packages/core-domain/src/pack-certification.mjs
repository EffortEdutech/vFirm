import { forbiddenAiAuthorityActions, validateFactoryBlueprintBundle } from "./factory-blueprints.mjs";

const has = (value) => value !== undefined && value !== null && value !== "";

function addFinding(findings, code, message, path = "$.", severity = "ERROR") {
  findings.push({ code, message, path, severity });
}

export function evaluatePackBindingCertification({ bundle, professionalAuthority, workerBindings = [] } = {}) {
  const findings = [];
  const blueprintValidation = validateFactoryBlueprintBundle(bundle);
  for (const finding of blueprintValidation.findings ?? []) findings.push({ ...finding, source: "blueprint_validation" });
  if (!blueprintValidation.ok) return buildResult(bundle, findings, professionalAuthority, workerBindings);

  const firm = bundle.firm_blueprint;
  const practice = bundle.practice_pack_manifest;
  const servicePack = bundle.service_delivery_pack_manifest;
  const governance = bundle.governance_pack_manifest;
  const jurisdiction = bundle.jurisdiction_pack_manifest;

  if (servicePack.practice_pack_ref !== practice.practice_pack_id) addFinding(findings, "PACK_PRACTICE_REF_MISMATCH", "Service Delivery Pack must bind to the selected Practice Pack.", "$.service_delivery_pack_manifest.practice_pack_ref");

  const deliveryStates = servicePack.delivery_states ?? [];
  const issueState = deliveryStates.find((state) => state.code === "ISSUED" || state.allows_external_issue === true);
  if (!issueState) addFinding(findings, "ISSUE_STATE_REQUIRED", "Service Delivery Pack must declare a controlled issue/final state.", "$.service_delivery_pack_manifest.delivery_states");
  if (issueState && issueState.requires_human_professional_approval !== true) addFinding(findings, "ISSUE_STATE_REQUIRES_HUMAN_APPROVAL", "Issue/final state must require authorized human professional approval.", "$.service_delivery_pack_manifest.delivery_states");

  const activeJurisdictions = new Set((jurisdiction.jurisdictions ?? []).filter((item) => item.status === "ACTIVE").map((item) => item.code));
  const credentialJurisdictions = new Set((jurisdiction.credential_rules ?? []).map((item) => item.jurisdiction));
  const approvalRules = governance.approval_rules ?? [];
  const services = firm.services ?? [];
  for (const [index, service] of services.entries()) {
    if (service.risk_class === "REGULATED") {
      if (!has(service.responsible_professional_id)) addFinding(findings, "RESPONSIBLE_PROFESSIONAL_REQUIRED", "Regulated service must name a responsible professional before activation.", `$.firm_blueprint.services[${index}].responsible_professional_id`);
      if (!activeJurisdictions.has(service.jurisdiction)) addFinding(findings, "SERVICE_JURISDICTION_NOT_ACTIVE", `Service jurisdiction is not active: ${service.jurisdiction}.`, `$.firm_blueprint.services[${index}].jurisdiction`);
      if (!credentialJurisdictions.has(service.jurisdiction)) addFinding(findings, "CREDENTIAL_RULE_REQUIRED", `Jurisdiction Pack must include a credential rule for service jurisdiction: ${service.jurisdiction}.`, "$.jurisdiction_pack_manifest.credential_rules");
      const rule = approvalRules.find((item) => item.service_id === service.service_id);
      if (!rule) addFinding(findings, "GOVERNANCE_APPROVAL_RULE_REQUIRED", `Governance Pack must declare an approval rule for regulated service: ${service.service_id}.`, "$.governance_pack_manifest.approval_rules");
      if (rule && rule.approver_type !== "AUTHORIZED_HUMAN_PROFESSIONAL") addFinding(findings, "GOVERNANCE_APPROVER_TYPE_INVALID", "Regulated service approval must be by an authorized human professional.", "$.governance_pack_manifest.approval_rules");
      if (rule && rule.silent_approval_allowed !== false) addFinding(findings, "SILENT_APPROVAL_DENIED", "Governance Pack must explicitly deny silent approval for regulated services.", "$.governance_pack_manifest.approval_rules");
    }
  }

  if (!professionalAuthority?.valid) addFinding(findings, "VALID_PROFESSIONAL_AUTHORITY_REQUIRED", "A current responsible human professional authority is required before service activation.", "$.professional_authority");
  const authority = professionalAuthority?.professional_authority;
  if (authority && !(authority.permitted_actions ?? []).includes("deliverable.review")) addFinding(findings, "DELIVERABLE_REVIEW_AUTHORITY_REQUIRED", "Responsible professional authority must permit deliverable.review.", "$.professional_authority.permitted_actions");
  if (authority && !(authority.credential_refs ?? []).length) addFinding(findings, "PROFESSIONAL_CREDENTIAL_EVIDENCE_REQUIRED", "Responsible professional authority must include credential evidence references.", "$.professional_authority.credential_refs");

  if (!workerBindings.length) addFinding(findings, "WORKER_BINDINGS_REQUIRED", "Provisioned worker bindings are required before pack activation.", "$.factory_worker_bindings");
  for (const [index, binding] of workerBindings.entries()) {
    if (binding.binding_state !== "BOUND") addFinding(findings, "WORKER_BINDING_NOT_BOUND", `Worker binding is not BOUND: ${binding.worker_code}.`, `$.factory_worker_bindings[${index}].binding_state`);
    if (!binding.supervisor_actor_id) addFinding(findings, "WORKER_SUPERVISOR_REQUIRED", `Worker binding lacks supervisor: ${binding.worker_code}.`, `$.factory_worker_bindings[${index}].supervisor_actor_id`);
    const permitted = binding.authority_envelope?.permitted_actions ?? [];
    for (const action of permitted) {
      if (forbiddenAiAuthorityActions.includes(action) && binding.actor_type !== "HUMAN") addFinding(findings, "WORKER_AUTHORITY_EXCEEDS_ENVELOPE", `Non-human worker binding cannot activate forbidden authority: ${action}.`, `$.factory_worker_bindings[${index}].authority_envelope.permitted_actions`);
    }
  }

  return buildResult(bundle, findings, professionalAuthority, workerBindings);
}

function buildResult(bundle, findings, professionalAuthority, workerBindings) {
  const ok = findings.every((finding) => finding.severity !== "ERROR");
  const services = bundle?.firm_blueprint?.services ?? [];
  return {
    ok,
    certification_state: ok ? "CERTIFIED" : "DENIED",
    compatibility_status: ok ? "PASS" : "FAIL",
    findings,
    activated_services: services.map((service) => ({
      service_id: service.service_id,
      status: ok ? "ACTIVE" : "BLOCKED",
      risk_class: service.risk_class ?? "STANDARD",
      responsible_professional_id: service.responsible_professional_id ?? null,
      jurisdiction: service.jurisdiction ?? null
    })),
    authority_summary: {
      valid: Boolean(professionalAuthority?.valid),
      professional_authority_id: professionalAuthority?.professional_authority?.id ?? null,
      professional_profile_id: professionalAuthority?.professional_profile?.id ?? null,
      membership_id: professionalAuthority?.membership?.id ?? null
    },
    worker_binding_count: workerBindings.length
  };
}