import assert from "node:assert/strict";
import {
  buildAwiaVirtualStaffEvidencePack,
  evidenceGateBoundary,
  evaluateAwiaVirtualStaffPilotGate
} from "../packages/core-domain/src/awia-virtual-staff-evidence-gate.mjs";

const pack = buildAwiaVirtualStaffEvidencePack();
assert.equal(pack.boundary, evidenceGateBoundary);
assert.equal(pack.pilot_gate.ok, true, JSON.stringify(pack.pilot_gate.findings, null, 2));
assert.equal(pack.pilot_gate.recommendation, "GO_FOR_CONTROLLED_HUMAN_GOVERNED_PILOT_REHEARSAL");
assert.equal(pack.pilot_gate.readiness.registry_mapped, true);
assert.equal(pack.pilot_gate.readiness.draft_staff_provisioned, true);
assert.equal(pack.pilot_gate.readiness.runtime_execution_disabled, true);
assert.equal(pack.pilot_gate.readiness.controlled_allowed_decision_present, true);
assert.equal(pack.pilot_gate.readiness.denial_evidence_count, 6);
assert.equal(pack.evidence_objects.length, 9);
assert.equal(pack.ledger_projection.length, 9);
assert(pack.evidence_objects.every((item) => item.evidence_boundary === "first_class_reference_not_generated_narrative_only"));
assert(pack.ledger_projection.every((event) => event.mutation_mode === "APPEND_ONLY_PROJECTION"));

const denialCodes = new Set(pack.denial_decisions.flatMap((decision) => decision.findings.map((finding) => finding.code)));
for (const code of ["STAFF_LIFECYCLE_NOT_EXECUTABLE", "SALARY_PLAN_AUTHORITY_DENIED", "PACKAGE_BINDING_AUTHORITY_DENIED", "PROMPT_AUTHORITY_DENIED", "PAYMENT_RELEASE_DENIED", "DIRECT_LLM_TO_REGULATED_FINAL_OUTPUT_DENIED"]) {
  assert(denialCodes.has(code), `Missing denial evidence for ${code}`);
}

const unsafeNarrative = evaluateAwiaVirtualStaffPilotGate({
  registry: { entries: [{}] },
  provisioningRun: { ok: true, runtime_execution_enabled: false },
  allowedDecision: { decision: "ALLOW" },
  denialDecisions: pack.denial_decisions,
  evidenceObjects: [{ evidence_type: "GENERATED_NARRATIVE_ONLY" }],
  ledgerProjection: pack.ledger_projection
});
assert.equal(unsafeNarrative.ok, false);
assert(unsafeNarrative.findings.some((finding) => finding.code === "GENERATED_NARRATIVE_IS_NOT_EVIDENCE"));

const mutableLedger = evaluateAwiaVirtualStaffPilotGate({
  registry: { entries: [{}] },
  provisioningRun: { ok: true, runtime_execution_enabled: false },
  allowedDecision: { decision: "ALLOW" },
  denialDecisions: pack.denial_decisions,
  evidenceObjects: pack.evidence_objects,
  ledgerProjection: [{ mutation_mode: "MUTATE_IN_PLACE" }]
});
assert.equal(mutableLedger.ok, false);
assert(mutableLedger.findings.some((finding) => finding.code === "LEDGER_MUST_BE_APPEND_ONLY_PROJECTION"));

console.log(JSON.stringify({
  smoke: "awia-vs-s6-evidence-pilot-gate",
  result: "passed",
  recommendation: pack.pilot_gate.recommendation,
  readiness: pack.pilot_gate.readiness,
  boundary: pack.boundary
}, null, 2));
