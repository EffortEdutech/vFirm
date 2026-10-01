// ADR-090 W2 (B5, 2026-10-01): plain-English "request types" the firm owner picks from when giving
// the firm work (POST /work-requests). Each type maps a client-facing request label onto the
// machinery that already governs execution:
//   - position_id / role_code: which hired worker may take it (position first; role_code is the
//     fallback for workers hired before positions existed, e.g. CFO);
//   - tool: the runtime action checked by the authority gate (defaultToolPolicyByRole in
//     awia-virtual-staff-authority-gate.mjs -- every tool below is on that list);
//   - skill_id (optional): the position-catalogue skill, which turns on skill-scoped assignment and
//     the Class A approval gate (resolveClassAApprovalRequirement) exactly as HM-S4 wired it.
// This file adds no authority: it is a menu. The server re-checks every assignment against the
// authority gate and the position catalogue. Labels/hints are guidance for the owner only.

import { resolveClassAApprovalRequirement } from "./awia-virtual-staff-class-a-approval-routing.mjs";
import { describeSkillInputs } from "./awia-skill-runner.mjs";

export const workRequestTypes = Object.freeze([
  // General Clerk (ARO)
  { id: "admin_request_triage", label: "Sort out an admin request", description: "Classify an incoming admin request, set its priority and route it to the right person.", position_id: "general_clerk", role_code: "ARO", tool: "administration.request.triage", skill_id: "ARO-01", input_hint: "Paste or attach the request (email, memo)." },
  { id: "document_register", label: "Register and file documents", description: "Log incoming documents in the firm's register with numbering and revisions.", position_id: "general_clerk", role_code: "ARO", tool: "administration.document.register", input_hint: "Attach the documents to register." },
  { id: "deadline_prepare", label: "Set up a deadline or reminder", description: "Prepare a tracked deadline for a filing, renewal or follow-up.", position_id: "general_clerk", role_code: "ARO", tool: "administration.deadline.prepare", input_hint: "Say what is due and when." },
  // Bookkeeper (FAO)
  { id: "bank_reconciliation", label: "Reconcile bank vs books", description: "Match bank statement lines to ledger entries and list the differences.", position_id: "bookkeeper", role_code: "FAO", tool: "accounts.reconciliation.prepare", skill_id: "FAO-11", input_hint: "Attach the bank statement and the ledger/book entries (CSV or Excel)." },
  { id: "payables_prepare", label: "Prepare bills to pay", description: "Prepare supplier bills/payables for your approval. Never releases payment.", position_id: "bookkeeper", role_code: "FAO", tool: "accounts.ap.prepare", input_hint: "Attach the supplier invoices." },
  { id: "receivables_prepare", label: "Prepare invoices / collections follow-up", description: "Prepare receivables and follow-up drafts for unpaid invoices.", position_id: "bookkeeper", role_code: "FAO", tool: "accounts.receivable.prepare", input_hint: "Attach the aging list or invoices." },
  // Sales Coordinator (SAO)
  { id: "lead_qualification", label: "Qualify and score a lead", description: "Score a new lead against fit, budget and urgency, with a recommended next step.", position_id: "sales_coordinator", role_code: "SAO", tool: "sales.lead.qualify.prepare", skill_id: "SAO-03", input_hint: "Paste the enquiry or attach the lead details." },
  { id: "proposal_draft", label: "Draft a proposal", description: "Draft a proposal for your review before anything goes to the client.", position_id: "sales_coordinator", role_code: "SAO", tool: "proposal.draft.prepare", input_hint: "Attach the brief, scope notes or BOQ." },
  { id: "client_message_draft", label: "Draft a client message", description: "Draft an email or letter to a client. You send it yourself.", position_id: "sales_coordinator", role_code: "SAO", tool: "customer.communication.draft", input_hint: "Say what the message should achieve." },
  // Ops Coordinator (OPO)
  { id: "capacity_assignment", label: "Plan who does what (capacity)", description: "Recommend how to assign a task across available capacity/queues.", position_id: "ops_coordinator", role_code: "OPO", tool: "workload.assignment.prepare", skill_id: "OPO-09", input_hint: "Describe the task and any deadline." },
  { id: "delivery_coordination", label: "Coordinate a project delivery", description: "Prepare a delivery plan/checklist and track what's outstanding.", position_id: "ops_coordinator", role_code: "OPO", tool: "project.delivery.coordinate", input_hint: "Attach the project plan or schedule." },
  { id: "workload_summary", label: "Summarise the team's workload", description: "Prepare a workload/status summary.", position_id: "ops_coordinator", role_code: "OPO", tool: "workload.summary.prepare", input_hint: "Optional: attach current trackers." },
  // HR Administrator (ARO, position-scoped)
  { id: "employee_onboarding", label: "Prepare a new-hire onboarding", description: "Prepare onboarding paperwork and a missing-documents checklist. Class A: needs your owner approval.", position_id: "hr_administrator", role_code: "ARO", tool: "administration.employee.onboarding", skill_id: "ARO-10", input_hint: "Attach the offer letter and any documents received." },
  // CFO (role-level, no position in the starter catalogue)
  { id: "finance_analysis", label: "Prepare a finance analysis", description: "Prepare a financial analysis or management summary.", role_code: "CFO", tool: "finance.analysis.prepare", input_hint: "Attach the accounts, P&L or data to analyse." },
  { id: "finance_governance_review", label: "Review finance governance", description: "Review finance controls or a finance pack for issues.", role_code: "CFO", tool: "finance.governance.review", input_hint: "Attach the pack to review." }
]);

export function resolveWorkRequestType(id) {
  const type = workRequestTypes.find((item) => item.id === id);
  if (!type) return { found: false, type: null };
  const classA = type.skill_id && type.position_id ? resolveClassAApprovalRequirement({ position_id: type.position_id, skill_id: type.skill_id }) : null;
  // ADR-092 W3: runnable types carry the form fields and file slots the skill runner needs.
  const inputs = describeSkillInputs(type.skill_id);
  return { found: true, type: { ...type, class_a: classA?.requires_approval === true, runnable: inputs.runnable, run_label: inputs.run_label, input_fields: inputs.input_fields, file_slots: inputs.file_slots } };
}

export function listWorkRequestTypes() {
  return workRequestTypes.map((type) => resolveWorkRequestType(type.id).type);
}

// Can this hired worker take this type of request? Position match first; a worker hired before
// positions existed (no position_id) falls back to role_code, and then runs without skill scope
// (skill-scoped assignment requires a position -- see assignAwiaVirtualStaffTaskRecord).
export function workerFitsRequestType(member, roleAssignment, type) {
  if (!member || !type) return false;
  if (type.position_id && member.position_id) return member.position_id === type.position_id;
  return (roleAssignment?.role_code ?? null) === type.role_code;
}

// ARO-01 triage routing queues (awia-virtual-staff-aro01-request-triage.mjs) mapped to the
// position that works that queue -- used only to SUGGEST a worker for an unassigned request.
export const positionForTriageQueue = Object.freeze({
  HR_ADMINISTRATOR_QUEUE: "hr_administrator",
  BOOKKEEPER_QUEUE: "bookkeeper",
  OPS_COORDINATOR_QUEUE: "ops_coordinator",
  IT_SUPPORT_QUEUE: "general_clerk",
  FACILITIES_QUEUE: "general_clerk",
  FIRM_OWNER_REVIEW_QUEUE: null
});
