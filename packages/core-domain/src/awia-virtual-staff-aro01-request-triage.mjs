// HM-S2 pilot skill: General Clerk (ARO) / ARO-01 Administrative Request
// Triage. Deterministic, keyword-based classification of an incoming
// administrative request into a category, a routing queue, and a priority --
// no PII, no SOD, Class B per the position catalogue
// (awia-virtual-staff-position-catalogue.mjs). This module is pure
// classification logic only: it produces a structured recommendation for a
// human (or a downstream workdesk item) to act on -- it does not itself
// dispatch, notify, or commit anything. Wired into the runtime authority gate
// via the "administration.request.triage" action/tool allowed for role ARO
// in awia-virtual-staff-authority-gate.mjs, and into the output-draft/review
// pipeline (apps/api/src/store.mjs) via the output_payload field.

export const aro01TriageBoundary = "deterministic_classification_only_no_autonomous_dispatch_or_final_routing_commitment";

export const aro01TriageCategories = [
  "IT_SUPPORT",
  "FACILITIES",
  "HR_GENERAL",
  "FINANCE_GENERAL",
  "EXTERNAL_VENDOR",
  "GENERAL_UNCLASSIFIED"
];

export const aro01TriagePriorityLevels = ["LOW", "NORMAL", "HIGH"];

export const aro01RoutingByCategory = {
  IT_SUPPORT: { routed_to: "IT_SUPPORT_QUEUE", default_priority: "NORMAL" },
  FACILITIES: { routed_to: "FACILITIES_QUEUE", default_priority: "NORMAL" },
  HR_GENERAL: { routed_to: "HR_ADMINISTRATOR_QUEUE", default_priority: "NORMAL" },
  FINANCE_GENERAL: { routed_to: "BOOKKEEPER_QUEUE", default_priority: "NORMAL" },
  EXTERNAL_VENDOR: { routed_to: "OPS_COORDINATOR_QUEUE", default_priority: "NORMAL" },
  GENERAL_UNCLASSIFIED: { routed_to: "FIRM_OWNER_REVIEW_QUEUE", default_priority: "LOW" }
};

const keywordsByCategory = {
  IT_SUPPORT: ["password", "login", "vpn", "laptop", "printer", "software", "email access", "wifi", "network"],
  FACILITIES: ["aircond", "air conditioning", "cleaning", "parking", "office key", "lightbulb", "leak", "maintenance"],
  HR_GENERAL: ["leave", "payslip", "onboarding", "offboarding", "attendance", "personnel", "employee id"],
  FINANCE_GENERAL: ["invoice", "reimbursement", "petty cash", "expense claim", "payment", "receipt"],
  EXTERNAL_VENDOR: ["vendor", "supplier", "courier", "delivery", "quotation from", "purchase order"]
};

const urgentKeywords = ["urgent", "asap", "immediately", "emergency", "down", "cannot access", "blocked"];

export function triageAdministrativeRequest({ request_subject = "", request_body = "", sender_type = "internal", category_hint = null } = {}) {
  const haystack = `${request_subject} ${request_body}`.toLowerCase();
  let category = null;
  let matched_keywords = [];

  if (category_hint && aro01TriageCategories.includes(category_hint)) {
    category = category_hint;
  } else {
    for (const [candidateCategory, keywords] of Object.entries(keywordsByCategory)) {
      const hits = keywords.filter((keyword) => haystack.includes(keyword));
      if (hits.length > 0) {
        category = candidateCategory;
        matched_keywords = hits;
        break;
      }
    }
  }

  if (!category) category = "GENERAL_UNCLASSIFIED";

  const routing = aro01RoutingByCategory[category] ?? aro01RoutingByCategory.GENERAL_UNCLASSIFIED;
  const isUrgent = urgentKeywords.some((keyword) => haystack.includes(keyword));
  const priority = isUrgent ? "HIGH" : routing.default_priority;

  return {
    category,
    routed_to: routing.routed_to,
    priority,
    matched_keywords,
    sender_type,
    rationale: matched_keywords.length > 0
      ? `Matched keyword(s) [${matched_keywords.join(", ")}] to category ${category}.`
      : category_hint
        ? `Used caller-supplied category hint "${category_hint}".`
        : "No keyword match found; routed to general unclassified queue for human triage.",
    boundary: aro01TriageBoundary
  };
}

export function validateAro01TriageOutput(output) {
  const findings = [];
  if (!output || typeof output !== "object") return { ok: false, findings: [{ code: "OUTPUT_REQUIRED", severity: "ERROR" }] };
  if (!aro01TriageCategories.includes(output.category)) findings.push({ code: "UNKNOWN_CATEGORY", severity: "ERROR", category: output.category });
  if (!output.routed_to) findings.push({ code: "ROUTED_TO_REQUIRED", severity: "ERROR" });
  if (!aro01TriagePriorityLevels.includes(output.priority)) findings.push({ code: "UNKNOWN_PRIORITY", severity: "ERROR", priority: output.priority });
  if (!output.rationale) findings.push({ code: "RATIONALE_REQUIRED", severity: "ERROR" });
  return { ok: findings.length === 0, findings };
}

export function verifyAro01TriageFixtures() {
  const fixtures = [
    { input: { request_subject: "Cannot login to VPN, urgent", request_body: "" }, expectedCategory: "IT_SUPPORT", expectedPriority: "HIGH" },
    { input: { request_subject: "Aircond in meeting room not working", request_body: "" }, expectedCategory: "FACILITIES", expectedPriority: "NORMAL" },
    { input: { request_subject: "Question about my leave balance", request_body: "" }, expectedCategory: "HR_GENERAL", expectedPriority: "NORMAL" },
    { input: { request_subject: "Reimbursement for taxi receipt", request_body: "" }, expectedCategory: "FINANCE_GENERAL", expectedPriority: "NORMAL" },
    { input: { request_subject: "Vendor quotation follow up", request_body: "" }, expectedCategory: "EXTERNAL_VENDOR", expectedPriority: "NORMAL" },
    { input: { request_subject: "General question with no clear category", request_body: "" }, expectedCategory: "GENERAL_UNCLASSIFIED", expectedPriority: "LOW" }
  ];
  const failures = [];
  for (const fixture of fixtures) {
    const result = triageAdministrativeRequest(fixture.input);
    const validation = validateAro01TriageOutput(result);
    if (!validation.ok) {
      failures.push({ fixture: fixture.input, reason: "invalid_output", findings: validation.findings });
    } else if (result.category !== fixture.expectedCategory) {
      failures.push({ fixture: fixture.input, reason: "category_mismatch", expected: fixture.expectedCategory, got: result.category });
    } else if (result.priority !== fixture.expectedPriority) {
      failures.push({ fixture: fixture.input, reason: "priority_mismatch", expected: fixture.expectedPriority, got: result.priority });
    }
  }
  return { ok: failures.length === 0, fixtures_checked: fixtures.length, failures };
}
