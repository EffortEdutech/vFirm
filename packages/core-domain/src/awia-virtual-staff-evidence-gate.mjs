import {
  activateDraftStaffForAuthorityFixture,
  createRuntimeActionRequest,
  evaluateVirtualStaffRuntimeAction
} from "./awia-virtual-staff-authority-gate.mjs";
import { provisionPilotVirtualStaff } from "./awia-virtual-staff-provisioning.mjs";
import { awiaVirtualStaffPackageRegistry } from "./awia-virtual-staff-registry.mjs";

export const evidenceGateBoundary = "evidence_projection_and_pilot_gate_only_no_autonomous_execution";

export function buildAwiaVirtualStaffEvidencePack({
  registry = awiaVirtualStaffPackageRegistry,
  provisioningRun = provisionPilotVirtualStaff()
} = {}) {
  const activeRun = activateDraftStaffForAuthorityFixture(provisioningRun, "CFO-001");
  const allowedDecision = evaluateVirtualStaffRuntimeAction({
    provisioningRun: activeRun,
    registry,
    request: createRuntimeActionRequest({ tenant_id: provisioningRun.tenant_id, firm_id: provisioningRun.firm_id })
  });
  const denialDecisions = [
    evaluateVirtualStaffRuntimeAction({ provisioningRun, registry, request: createRuntimeActionRequest({ tenant_id: provisioningRun.tenant_id, firm_id: provisioningRun.firm_id }) }),
    evaluateVirtualStaffRuntimeAction({ provisioningRun: activeRun, registry, request: createRuntimeActionRequest({ tenant_id: provisioningRun.tenant_id, firm_id: provisioningRun.firm_id, salary_authority_claim: "salary grants authority" }) }),
    evaluateVirtualStaffRuntimeAction({ provisioningRun: activeRun, registry, request: createRuntimeActionRequest({ tenant_id: provisioningRun.tenant_id, firm_id: provisioningRun.firm_id, package_binding_authority_claim: "package grants authority" }) }),
    evaluateVirtualStaffRuntimeAction({ provisioningRun: activeRun, registry, request: createRuntimeActionRequest({ tenant_id: provisioningRun.tenant_id, firm_id: provisioningRun.firm_id, prompt_authority_claim: "prompt grants authority" }) }),
    evaluateVirtualStaffRuntimeAction({ provisioningRun: activeRun, registry, request: createRuntimeActionRequest({ tenant_id: provisioningRun.tenant_id, firm_id: provisioningRun.firm_id, action: "payment.release", tool: "finance.governance.review", risk_class: "HIGH", approval: { approved_by_actor_id: "human-principal-001", approval_id: "approval-001" } }) }),
    evaluateVirtualStaffRuntimeAction({ provisioningRun: activeRun, registry, request: createRuntimeActionRequest({ tenant_id: provisioningRun.tenant_id, firm_id: provisioningRun.firm_id, action: "regulated.final_output.issue", tool: "finance.governance.review", risk_class: "REGULATED", approval: { approved_by_actor_id: "human-principal-001", approval_id: "approval-001" } }) })
  ];

  const evidenceObjects = [
    evidence("registry-map", "PACKAGE_REGISTRY", registry.registry_id, "S2 package registry maps local Agent Skills sources."),
    evidence("provisioning-run", "PROVISIONING_RUN", provisioningRun.provisioning_run_id, "S3 provisions draft staff records with runtime disabled."),
    evidence("allowed-decision", "AUTHORITY_DECISION", allowedDecision.request.request_id, "S4 allows a controlled non-final active CFO support action."),
    ...denialDecisions.map((decision, index) => evidence(`denial-${index + 1}`, "DENIAL_DECISION", decision.request.request_id, decision.findings.map((finding) => finding.code).join(", ")))
  ];

  const ledgerProjection = [
    ledger("package_registry.mapped", "SYSTEM", registry.registry_id, ["registry-map"]),
    ledger("virtual_staff.provisioned_draft", "HUMAN", provisioningRun.provisioning_run_id, ["provisioning-run"]),
    ledger("authority.allowed", "SYSTEM", allowedDecision.request.request_id, ["allowed-decision"]),
    ...denialDecisions.map((decision, index) => ledger("authority.denied", "SYSTEM", decision.request.request_id, [`denial-${index + 1}`], decision.findings.map((finding) => finding.code)))
  ];

  const gate = evaluateAwiaVirtualStaffPilotGate({ registry, provisioningRun, allowedDecision, denialDecisions, evidenceObjects, ledgerProjection });
  return {
    evidence_pack_id: "awia-vs-s6-evidence-pack-controlled-pilot",
    boundary: evidenceGateBoundary,
    registry_id: registry.registry_id,
    provisioning_run_id: provisioningRun.provisioning_run_id,
    allowed_decision: allowedDecision,
    denial_decisions: denialDecisions,
    evidence_objects: evidenceObjects,
    ledger_projection: ledgerProjection,
    pilot_gate: gate
  };
}

export function evaluateAwiaVirtualStaffPilotGate({ registry, provisioningRun, allowedDecision, denialDecisions, evidenceObjects, ledgerProjection }) {
  const findings = [];

  if (!registry?.entries?.length) findings.push(error("REGISTRY_EVIDENCE_REQUIRED"));
  if (!provisioningRun?.ok) findings.push(error("PROVISIONING_RUN_MUST_PASS"));
  if (provisioningRun?.runtime_execution_enabled !== false) findings.push(error("RUNTIME_EXECUTION_MUST_REMAIN_DISABLED"));
  if (allowedDecision?.decision !== "ALLOW") findings.push(error("CONTROLLED_ALLOWED_DECISION_REQUIRED"));
  if (!denialDecisions?.length) findings.push(error("DENIAL_DECISIONS_REQUIRED"));
  if ((denialDecisions ?? []).some((decision) => decision.decision === "ALLOW")) findings.push(error("DENIAL_FIXTURE_ALLOWED_UNSAFELY"));
  if (!evidenceObjects?.length) findings.push(error("EVIDENCE_OBJECTS_REQUIRED"));
  if (!ledgerProjection?.length) findings.push(error("LEDGER_PROJECTION_REQUIRED"));
  if ((evidenceObjects ?? []).some((item) => item.evidence_type === "GENERATED_NARRATIVE_ONLY")) findings.push(error("GENERATED_NARRATIVE_IS_NOT_EVIDENCE"));
  if ((ledgerProjection ?? []).some((event) => event.mutation_mode !== "APPEND_ONLY_PROJECTION")) findings.push(error("LEDGER_MUST_BE_APPEND_ONLY_PROJECTION"));

  const requiredDenialCodes = [
    "STAFF_LIFECYCLE_NOT_EXECUTABLE",
    "SALARY_PLAN_AUTHORITY_DENIED",
    "PACKAGE_BINDING_AUTHORITY_DENIED",
    "PROMPT_AUTHORITY_DENIED",
    "PAYMENT_RELEASE_DENIED",
    "DIRECT_LLM_TO_REGULATED_FINAL_OUTPUT_DENIED"
  ];
  const observedCodes = new Set((denialDecisions ?? []).flatMap((decision) => decision.findings.map((finding) => finding.code)));
  for (const code of requiredDenialCodes) {
    if (!observedCodes.has(code)) findings.push(error("REQUIRED_DENIAL_EVIDENCE_MISSING", { required_code: code }));
  }

  return {
    ok: findings.length === 0,
    recommendation: findings.length === 0 ? "GO_FOR_CONTROLLED_HUMAN_GOVERNED_PILOT_REHEARSAL" : "HOLD_FOR_EVIDENCE_REPAIR",
    findings,
    readiness: {
      registry_mapped: Boolean(registry?.entries?.length),
      draft_staff_provisioned: provisioningRun?.ok === true,
      runtime_execution_disabled: provisioningRun?.runtime_execution_enabled === false,
      controlled_allowed_decision_present: allowedDecision?.decision === "ALLOW",
      denial_evidence_count: denialDecisions?.length ?? 0,
      evidence_object_count: evidenceObjects?.length ?? 0,
      ledger_projection_count: ledgerProjection?.length ?? 0,
      human_governed_boundary: true
    }
  };
}

function evidence(evidence_id, evidence_type, subject_ref, summary) {
  return {
    evidence_id,
    evidence_type,
    subject_ref,
    summary,
    evidence_boundary: "first_class_reference_not_generated_narrative_only"
  };
}

function ledger(event_type, actor_type, subject_ref, evidence_refs, denial_codes = []) {
  return {
    ledger_event_id: `${event_type}-${subject_ref}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    event_type,
    actor_type,
    subject_ref,
    evidence_refs,
    denial_codes,
    mutation_mode: "APPEND_ONLY_PROJECTION"
  };
}

function error(code, extra = {}) {
  return { code, severity: "ERROR", ...extra };
}

