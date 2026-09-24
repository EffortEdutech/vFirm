// HM-S4 item 6 pilot skill: HR Administrator (ARO) / ARO-10 Employee
// Onboarding Administration. Deterministic preparation of a new-hire
// onboarding checklist -- which required onboarding documents are present,
// which are outstanding, and whether the responsible administrator and the
// hiring manager are the same person (a segregation-of-duties conflict for
// this specific administrative act) -- Class A, PII- and SOD-scoped per the
// position catalogue (awia-virtual-staff-position-catalogue.mjs), the first
// real Class A pilot (HM-S4 item 1's decision). This module never receives
// or echoes the new hire's name, identity-document contents, or bank
// details: it takes only which named checklist items have been supplied
// (booleans by document label), never the documents themselves, so its
// output is PII-safe by construction -- no PII disclosure is possible even
// if the output_payload were read by someone without a need to know. Pure
// checklist preparation only: it never onboards anyone, never grants system
// access, never notifies the hiring manager, and never itself decides
// whether an SOD conflict is acceptable -- it only surfaces the conflict for
// a human (the firm owner, via the live Class-A approval gate wired in
// HM-S4 item 2) to decide. Wired into the output-draft/review pipeline
// (apps/api/src/store.mjs) via the generic output_payload field, exactly as
// ARO-01/FAO-11/SAO-03/OPO-09 are; the Class A approval routing itself is
// entirely item 2's evaluateClassAApprovalGate() machinery -- this module
// supplies only the real content of the output a human then approves.

export const aro10OnboardingBoundary = "deterministic_checklist_preparation_only_no_autonomous_hr_action_no_pii_disclosure";

export const aro10OnboardingStatuses = ["READY_TO_ONBOARD", "DOCUMENTS_OUTSTANDING", "SOD_CONFLICT_BLOCKED"];

export const requiredOnboardingDocuments = [
  "employment_contract_signed",
  "identity_document_verified",
  "bank_details_provided",
  "tax_form_submitted",
  "emergency_contact_provided"
];

export function prepareOnboardingChecklist({
  new_hire_role = "",
  start_date = "",
  documents_received = [],
  responsible_administrator_id = "",
  hiring_manager_id = ""
} = {}) {
  const receivedSet = new Set(documents_received);
  const missing_documents = requiredOnboardingDocuments.filter((doc) => !receivedSet.has(doc));
  const sod_conflict = Boolean(responsible_administrator_id) && responsible_administrator_id === hiring_manager_id;

  let status;
  let rationale;
  if (sod_conflict) {
    status = "SOD_CONFLICT_BLOCKED";
    rationale = "The responsible administrator and the hiring manager are the same person; this onboarding administration act requires a distinct administrator and must not proceed without firm-owner review of the conflict.";
  } else if (missing_documents.length > 0) {
    status = "DOCUMENTS_OUTSTANDING";
    rationale = `${missing_documents.length} of ${requiredOnboardingDocuments.length} required onboarding document(s) outstanding: ${missing_documents.join(", ")}.`;
  } else {
    status = "READY_TO_ONBOARD";
    rationale = `All ${requiredOnboardingDocuments.length} required onboarding documents are present and the responsible administrator is distinct from the hiring manager; ready for a human to proceed with onboarding.`;
  }

  return {
    status,
    new_hire_role,
    start_date,
    missing_documents,
    documents_received_count: requiredOnboardingDocuments.length - missing_documents.length,
    sod_conflict,
    rationale,
    boundary: aro10OnboardingBoundary
  };
}

export function validateAro10OnboardingOutput(output) {
  const findings = [];
  if (!output || typeof output !== "object") return { ok: false, findings: [{ code: "OUTPUT_REQUIRED", severity: "ERROR" }] };
  if (!aro10OnboardingStatuses.includes(output.status)) findings.push({ code: "UNKNOWN_STATUS", severity: "ERROR", status: output.status });
  if (!Array.isArray(output.missing_documents)) findings.push({ code: "MISSING_DOCUMENTS_MUST_BE_ARRAY", severity: "ERROR" });
  if (typeof output.documents_received_count !== "number") findings.push({ code: "DOCUMENTS_RECEIVED_COUNT_REQUIRED", severity: "ERROR" });
  if (typeof output.sod_conflict !== "boolean") findings.push({ code: "SOD_CONFLICT_MUST_BE_BOOLEAN", severity: "ERROR" });
  if (!output.rationale) findings.push({ code: "RATIONALE_REQUIRED", severity: "ERROR" });
  if (findings.length === 0) {
    if (output.sod_conflict && output.status !== "SOD_CONFLICT_BLOCKED") findings.push({ code: "SOD_CONFLICT_MUST_BLOCK_STATUS", severity: "ERROR" });
    if (!output.sod_conflict && Array.isArray(output.missing_documents) && output.missing_documents.length > 0 && output.status !== "DOCUMENTS_OUTSTANDING") findings.push({ code: "OUTSTANDING_DOCUMENTS_MUST_SET_STATUS", severity: "ERROR" });
    if (!output.sod_conflict && Array.isArray(output.missing_documents) && output.missing_documents.length === 0 && output.status !== "READY_TO_ONBOARD") findings.push({ code: "COMPLETE_DOCUMENTS_MUST_BE_READY", severity: "ERROR" });
  }
  return { ok: findings.length === 0, findings };
}

export function verifyAro10OnboardingFixtures() {
  const fixtures = [
    {
      name: "ready_to_onboard",
      input: { new_hire_role: "Bookkeeper", start_date: "2026-10-01", documents_received: [...requiredOnboardingDocuments], responsible_administrator_id: "admin-001", hiring_manager_id: "owner-001" },
      expectedStatus: "READY_TO_ONBOARD",
      expectedMissingCount: 0
    },
    {
      name: "documents_outstanding",
      input: { new_hire_role: "Sales Coordinator", start_date: "2026-10-15", documents_received: ["employment_contract_signed", "identity_document_verified"], responsible_administrator_id: "admin-001", hiring_manager_id: "owner-001" },
      expectedStatus: "DOCUMENTS_OUTSTANDING",
      expectedMissingCount: 3
    },
    {
      name: "sod_conflict_blocked",
      input: { new_hire_role: "Ops Coordinator", start_date: "2026-11-01", documents_received: [...requiredOnboardingDocuments], responsible_administrator_id: "owner-001", hiring_manager_id: "owner-001" },
      expectedStatus: "SOD_CONFLICT_BLOCKED",
      expectedMissingCount: 0
    }
  ];
  const failures = [];
  for (const fixture of fixtures) {
    const result = prepareOnboardingChecklist(fixture.input);
    const validation = validateAro10OnboardingOutput(result);
    if (!validation.ok) {
      failures.push({ fixture: fixture.name, reason: "invalid_output", findings: validation.findings });
    } else if (result.status !== fixture.expectedStatus || result.missing_documents.length !== fixture.expectedMissingCount) {
      failures.push({ fixture: fixture.name, reason: "result_mismatch", expected: { status: fixture.expectedStatus, missingCount: fixture.expectedMissingCount }, got: { status: result.status, missingCount: result.missing_documents.length } });
    }
  }
  return { ok: failures.length === 0, fixtures_checked: fixtures.length, failures };
}
