// AWIA Virtual Staff Payroll and Seat Billing Polish
//
// Boundary: deterministic seat billing status bookkeeping and default
// salary-plan lookup by staff grade. This module never moves money and
// never releases a live payment; it only classifies a staff seat's billing
// state and computes what a firm's current seat mix would owe under its
// default salary plans, matching AGENTS.md principle "no live payment
// movement" and the AWIA acceptance lock's "no_live_payment_release"
// boundary.

export const payrollBoundary = "billing_bookkeeping_only_no_live_payment_release";

// Suggested default monthly salary plans by staff grade, per
// VFIRM_AWIA_VIRTUAL_STAFF_MODEL_AND_IMPLEMENTATION_PLAN_v1.0.md section 7.
// These are commercial defaults a firm can override per seat; they never
// grant authority on their own.
export const defaultSalaryPlansByGrade = {
  Assistant: { salary_plan_id: "awia-salary-plan-assistant-v1", monthly_amount: 150, currency: "MYR", included_workload_hours: 40, tool_budget_units: 200 },
  Worker: { salary_plan_id: "awia-salary-plan-worker-v1", monthly_amount: 280, currency: "MYR", included_workload_hours: 80, tool_budget_units: 400 },
  Specialist: { salary_plan_id: "awia-salary-plan-specialist-v1", monthly_amount: 480, currency: "MYR", included_workload_hours: 100, tool_budget_units: 700 },
  Manager: { salary_plan_id: "awia-salary-plan-manager-v1", monthly_amount: 780, currency: "MYR", included_workload_hours: 120, tool_budget_units: 1000 },
  Executive: { salary_plan_id: "awia-salary-plan-executive-v1", monthly_amount: 1200, currency: "MYR", included_workload_hours: 120, tool_budget_units: 1400 },
  Service: { salary_plan_id: "awia-salary-plan-service-v1", monthly_amount: 90, currency: "MYR", included_workload_hours: 0, tool_budget_units: 150 }
};

export const seatBillingStatuses = [
  "DRAFT",
  "PENDING_ACTIVATION",
  "BILLING_ACTIVE",
  "PAUSED",
  "SUSPENDED_NONPAYMENT",
  "RETIRED"
];

// Allowed manual seat-billing status transitions. Every transition is a
// human-recorded bookkeeping event, not a payment instruction.
const allowedTransitions = {
  DRAFT: ["PENDING_ACTIVATION", "RETIRED"],
  PENDING_ACTIVATION: ["BILLING_ACTIVE", "DRAFT", "RETIRED"],
  BILLING_ACTIVE: ["PAUSED", "SUSPENDED_NONPAYMENT", "RETIRED"],
  PAUSED: ["BILLING_ACTIVE", "RETIRED"],
  SUSPENDED_NONPAYMENT: ["BILLING_ACTIVE", "RETIRED"],
  RETIRED: []
};

export function resolveSalaryPlanForGrade(staffGrade) {
  const plan = defaultSalaryPlansByGrade[staffGrade];
  if (!plan) {
    return { found: false, findings: [`salary_plan_grade_not_recognized:${staffGrade}`] };
  }
  return { found: true, findings: [], plan };
}

export function evaluateSeatBillingTransition({ from_status, to_status } = {}) {
  const findings = [];
  if (!seatBillingStatuses.includes(from_status)) findings.push(`seat_billing_status_not_recognized:${from_status}`);
  if (!seatBillingStatuses.includes(to_status)) findings.push(`seat_billing_status_not_recognized:${to_status}`);
  if (findings.length === 0 && !(allowedTransitions[from_status] ?? []).includes(to_status)) {
    findings.push(`seat_billing_transition_not_allowed:${from_status}->${to_status}`);
  }
  return {
    decision: findings.length === 0 ? "ALLOW" : "DENY",
    boundary: payrollBoundary,
    findings
  };
}

export function buildAwiaFirmPayrollSummary({ seats = [], members = [] } = {}) {
  const memberByStaffCode = new Map(members.map((member) => [member.agent_code, member]));
  const byBillingStatus = {};
  const byCurrency = {};
  let seatsWithUnresolvedGrade = 0;

  for (const seat of seats) {
    const status = seat.billing_status ?? "DRAFT";
    byBillingStatus[status] = (byBillingStatus[status] ?? 0) + 1;

    const member = memberByStaffCode.get(seat.staff_code);
    const resolved = member ? resolveSalaryPlanForGrade(member.staff_grade) : { found: false };
    if (!resolved.found) {
      seatsWithUnresolvedGrade += 1;
      continue;
    }
    if (status !== "BILLING_ACTIVE") continue;

    const currency = resolved.plan.currency;
    if (!byCurrency[currency]) byCurrency[currency] = { currency, billing_active_seat_count: 0, monthly_total_amount: 0 };
    byCurrency[currency].billing_active_seat_count += 1;
    byCurrency[currency].monthly_total_amount += resolved.plan.monthly_amount;
  }

  return {
    boundary: payrollBoundary,
    generated_at: new Date().toISOString(),
    seat_count: seats.length,
    seats_with_unresolved_grade: seatsWithUnresolvedGrade,
    seats_by_billing_status: byBillingStatus,
    monthly_totals_by_currency: Object.values(byCurrency)
  };
}
