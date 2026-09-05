import { awiaVirtualStaffPackageRegistry } from "./awia-virtual-staff-registry.mjs";
import { canAcceptExecutableTask, provisionPilotVirtualStaff } from "./awia-virtual-staff-provisioning.mjs";

export const runtimeGateBoundary = "deterministic_authority_gate_no_autonomous_regulated_approval";

export const defaultToolPolicyByRole = {
  CFO: ["finance.analysis.prepare", "finance.governance.review", "evidence.bundle.review"],
  FAO: ["accounts.ap.prepare", "accounts.receivable.prepare", "evidence.bundle.prepare"],
  SAO: ["sales.opportunity.prepare", "proposal.draft.prepare", "customer.communication.draft"],
  OPO: ["project.delivery.coordinate", "workload.summary.prepare", "evidence.bundle.review"],
  ARO: ["administration.document.register", "administration.deadline.prepare", "evidence.bundle.prepare"]
};

export const highRiskActions = [
  "regulated.final_output.issue",
  "payment.release",
  "professional.approval.grant",
  "contract.execute",
  "external.communication.send"
];

export function createRuntimeActionRequest({
  request_id = "runtime-request-001",
  tenant_id = "tenant-amanah-controlled-pilot",
  firm_id = "firm-amanah-formwork-pilot",
  staff_code = "CFO-001",
  action = "finance.analysis.prepare",
  tool = "finance.analysis.prepare",
  risk_class = "CONTROLLED",
  client_id = "client-controlled-pilot",
  project_id = "project-controlled-pilot",
  evidence_refs = ["evidence-controlled-source"],
  approval = null,
  requested_by_actor_id = "human-principal-001",
  responsible_professional_id = "professional-principal-001",
  sod = { actor_has_conflicting_role: false },
  prompt_authority_claim = null,
  salary_authority_claim = null,
  package_binding_authority_claim = null
} = {}) {
  return {
    request_id,
    tenant_id,
    firm_id,
    staff_code,
    action,
    tool,
    risk_class,
    client_id,
    project_id,
    evidence_refs,
    approval,
    requested_by_actor_id,
    responsible_professional_id,
    sod,
    prompt_authority_claim,
    salary_authority_claim,
    package_binding_authority_claim
  };
}

export function evaluateVirtualStaffRuntimeAction({ provisioningRun = provisionPilotVirtualStaff(), request = createRuntimeActionRequest(), registry = awiaVirtualStaffPackageRegistry } = {}) {
  const findings = [];
  const member = provisioningRun.members.find((item) => item.agent_code === request.staff_code);
  const binding = provisioningRun.package_bindings.find((item) => item.staff_code === request.staff_code);
  const roleAssignment = provisioningRun.role_assignments.find((item) => item.staff_code === request.staff_code);
  const packageEntry = binding ? registry.entries.find((entry) => entry.package_id === binding.package_id) : null;

  if (provisioningRun.boundary !== "provisioning_only_no_autonomous_execution") findings.push(error("PROVISIONING_BOUNDARY_UNKNOWN"));
  if (!member) findings.push(error("STAFF_MEMBER_REQUIRED"));
  if (!binding) findings.push(error("PACKAGE_BINDING_REQUIRED"));
  if (!roleAssignment) findings.push(error("ROLE_ASSIGNMENT_REQUIRED"));
  if (!request.tenant_id || request.tenant_id !== provisioningRun.tenant_id) findings.push(error("REQUEST_TENANT_SCOPE_MISMATCH"));
  if (!request.firm_id || request.firm_id !== provisioningRun.firm_id) findings.push(error("REQUEST_FIRM_SCOPE_MISMATCH"));
  if (!request.client_id || !request.project_id) findings.push(error("TASK_SCOPE_REQUIRED"));
  if (!Array.isArray(request.evidence_refs) || request.evidence_refs.length === 0) findings.push(error("EVIDENCE_REQUIRED"));
  if (request.prompt_authority_claim) findings.push(error("PROMPT_AUTHORITY_DENIED"));
  if (request.salary_authority_claim) findings.push(error("SALARY_PLAN_AUTHORITY_DENIED"));
  if (request.package_binding_authority_claim) findings.push(error("PACKAGE_BINDING_AUTHORITY_DENIED"));
  if (binding?.authority_effect !== "eligibility_input_only_not_authority") findings.push(error("PACKAGE_BINDING_MUST_NOT_GRANT_AUTHORITY"));
  if (member && !canAcceptExecutableTask(member)) findings.push(error("STAFF_LIFECYCLE_NOT_EXECUTABLE"));
  if (packageEntry && ["DRAFT", "PLANNED", "ARCHIVE", "SUPPORT", "RETIRED"].includes(packageEntry.registry_status)) findings.push(error("PACKAGE_STATUS_NOT_RUNTIME_ELIGIBLE"));

  const allowedTools = defaultToolPolicyByRole[roleAssignment?.role_code] ?? [];
  if (!allowedTools.includes(request.tool)) findings.push(error("TOOL_NOT_ALLOWED_FOR_ROLE"));
  if (roleAssignment && request.action && !allowedTools.includes(request.action) && !highRiskActions.includes(request.action)) findings.push(error("ACTION_NOT_ALLOWED_FOR_ROLE"));

  if (request.sod?.actor_has_conflicting_role) findings.push(error("SEGREGATION_OF_DUTIES_CONFLICT"));

  const highRisk = highRiskActions.includes(request.action) || ["HIGH", "REGULATED", "CRITICAL"].includes(request.risk_class);
  if (highRisk && !request.responsible_professional_id) findings.push(error("RESPONSIBLE_PROFESSIONAL_REQUIRED"));
  if (highRisk && !request.approval?.approved_by_actor_id) findings.push(error("HUMAN_APPROVAL_REQUIRED"));
  if (request.action === "regulated.final_output.issue") findings.push(error("DIRECT_LLM_TO_REGULATED_FINAL_OUTPUT_DENIED"));
  if (request.action === "payment.release") findings.push(error("PAYMENT_RELEASE_DENIED"));
  if (request.action === "professional.approval.grant") findings.push(error("AI_PROFESSIONAL_APPROVAL_DENIED"));

  const hasErrors = findings.some((finding) => finding.severity === "ERROR");
  return {
    ok: !hasErrors,
    decision: hasErrors ? (findings.some((finding) => finding.code === "HUMAN_APPROVAL_REQUIRED") ? "REQUIRE_APPROVAL" : "DENY") : "ALLOW",
    boundary: runtimeGateBoundary,
    request,
    staff_context: member && binding && roleAssignment ? {
      agent_id: member.agent_id,
      agent_code: member.agent_code,
      lifecycle_status: member.lifecycle_status,
      role_code: roleAssignment.role_code,
      package_id: binding.package_id,
      registry_status: binding.registry_status,
      authority_effect: binding.authority_effect
    } : null,
    findings
  };
}

export function activateDraftStaffForAuthorityFixture(provisioningRun, staffCode) {
  return {
    ...provisioningRun,
    members: provisioningRun.members.map((member) => member.agent_code === staffCode ? { ...member, lifecycle_status: "ACTIVE" } : member)
  };
}

function error(code) {
  return { code, severity: "ERROR" };
}
