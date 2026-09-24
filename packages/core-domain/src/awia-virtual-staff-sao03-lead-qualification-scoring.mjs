// HM-S4 item 4 pilot skill: Sales Coordinator (SAO) / SAO-03 Lead
// Qualification & Scoring. Deterministic, weighted-criteria scoring of an
// inbound lead into a 0-100 score, a qualification tier, and a recommended
// next action -- no PII, no SOD, Class B per the position catalogue
// (awia-virtual-staff-position-catalogue.mjs). This module is pure scoring
// logic only: it produces a structured recommendation for a human (or a
// downstream workdesk item) to act on -- it never contacts the lead,
// disposes of it, or writes back to any CRM. Mirrors the HM-S2 ARO-01 triage
// module's and the HM-S4 item 3 FAO-11 reconciliation module's shape and
// boundary discipline. Wired into the output-draft pipeline
// (apps/api/src/store.mjs) via the generic output_payload field, and into
// task assignment via skill_id "SAO-03" -- the position-scope check added in
// HM-S4 item 2 (assignAwiaVirtualStaffTaskRecord) is what authorizes this
// skill at runtime.

export const sao03QualificationBoundary = "deterministic_scoring_only_no_autonomous_lead_disposition_or_crm_write";

export const sao03QualificationTiers = ["HOT", "WARM", "COLD"];

const industryFitPoints = { HIGH: 15, MEDIUM: 8, LOW: 0 };

function timelinePoints(timeline_days) {
  if (typeof timeline_days !== "number" || !Number.isFinite(timeline_days)) return 0;
  if (timeline_days <= 30) return 20;
  if (timeline_days <= 90) return 10;
  return 0;
}

function companySizePoints(company_size_employees) {
  if (typeof company_size_employees !== "number" || !Number.isFinite(company_size_employees)) return 0;
  return company_size_employees >= 50 ? 10 : 5;
}

export function qualifyAndScoreLead({
  budget_confirmed = false,
  decision_maker_engaged = false,
  timeline_days = null,
  industry_fit = "LOW",
  company_size_employees = null
} = {}) {
  const scoreComponents = {
    budget_confirmed: budget_confirmed === true ? 30 : 0,
    decision_maker_engaged: decision_maker_engaged === true ? 25 : 0,
    timeline: timelinePoints(timeline_days),
    industry_fit: industryFitPoints[industry_fit] ?? 0,
    company_size: companySizePoints(company_size_employees)
  };

  const score = Object.values(scoreComponents).reduce((sum, value) => sum + value, 0);

  let tier;
  let recommended_next_action;
  if (score >= 70) {
    tier = "HOT";
    recommended_next_action = "Schedule a discovery call within 2 business days.";
  } else if (score >= 40) {
    tier = "WARM";
    recommended_next_action = "Send the standard nurture sequence and re-engage in 2 weeks.";
  } else {
    tier = "COLD";
    recommended_next_action = "Add to the long-term nurture list; no immediate follow-up required.";
  }

  return {
    score,
    tier,
    score_components: scoreComponents,
    recommended_next_action,
    rationale: `Score ${score}/100 (budget ${scoreComponents.budget_confirmed}, decision-maker ${scoreComponents.decision_maker_engaged}, timeline ${scoreComponents.timeline}, industry fit ${scoreComponents.industry_fit}, company size ${scoreComponents.company_size}) -> ${tier}.`,
    boundary: sao03QualificationBoundary
  };
}

export function validateSao03QualificationOutput(output) {
  const findings = [];
  if (!output || typeof output !== "object") return { ok: false, findings: [{ code: "OUTPUT_REQUIRED", severity: "ERROR" }] };
  if (typeof output.score !== "number" || output.score < 0 || output.score > 100) findings.push({ code: "SCORE_OUT_OF_RANGE", severity: "ERROR", score: output.score });
  if (!sao03QualificationTiers.includes(output.tier)) findings.push({ code: "UNKNOWN_TIER", severity: "ERROR", tier: output.tier });
  if (!output.score_components || typeof output.score_components !== "object") findings.push({ code: "SCORE_COMPONENTS_REQUIRED", severity: "ERROR" });
  if (!output.recommended_next_action) findings.push({ code: "NEXT_ACTION_REQUIRED", severity: "ERROR" });
  if (!output.rationale) findings.push({ code: "RATIONALE_REQUIRED", severity: "ERROR" });
  if (findings.length === 0) {
    const componentSum = Object.values(output.score_components).reduce((sum, value) => sum + value, 0);
    if (componentSum !== output.score) findings.push({ code: "SCORE_COMPONENTS_INCONSISTENT", severity: "ERROR", expected: componentSum, got: output.score });
    const expectedTier = output.score >= 70 ? "HOT" : output.score >= 40 ? "WARM" : "COLD";
    if (output.tier !== expectedTier) findings.push({ code: "TIER_INCONSISTENT_WITH_SCORE", severity: "ERROR", expected: expectedTier, got: output.tier });
  }
  return { ok: findings.length === 0, findings };
}

export function verifySao03QualificationFixtures() {
  const fixtures = [
    { name: "hot_lead", input: { budget_confirmed: true, decision_maker_engaged: true, timeline_days: 14, industry_fit: "HIGH", company_size_employees: 120 }, expectedTier: "HOT" },
    { name: "warm_lead", input: { budget_confirmed: true, decision_maker_engaged: false, timeline_days: 60, industry_fit: "MEDIUM", company_size_employees: 20 }, expectedTier: "WARM" },
    { name: "cold_lead", input: { budget_confirmed: false, decision_maker_engaged: false, timeline_days: 200, industry_fit: "LOW", company_size_employees: 5 }, expectedTier: "COLD" }
  ];
  const failures = [];
  for (const fixture of fixtures) {
    const result = qualifyAndScoreLead(fixture.input);
    const validation = validateSao03QualificationOutput(result);
    if (!validation.ok) {
      failures.push({ fixture: fixture.name, reason: "invalid_output", findings: validation.findings });
    } else if (result.tier !== fixture.expectedTier) {
      failures.push({ fixture: fixture.name, reason: "tier_mismatch", expected: fixture.expectedTier, got: result.tier });
    }
  }
  return { ok: failures.length === 0, fixtures_checked: fixtures.length, failures };
}
