# NHL Quotation Workflow Acceptance Decision Gate v1.0

Date: 2026-09-04
Status: Accepted
Decision Date: 2026-09-05
Scope: NHL-Q1 through NHL-Q6 controlled BOQ/image quotation workflow for NHL Global Solution

## 1. Decision purpose

This gate asks whether the NHL-Q workflow should be accepted for controlled local/private pilot use.

Acceptance means the Virtual Firm Platform may be used in a controlled pilot to help NHL Global Solution operate BOQ/image quotation work with bounded AI workers, deterministic state, human authority, auditability, and tenant-scoped records.

Acceptance does not authorize production onboarding, public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, live payment movement, autonomous external sending, or autonomous quotation approval.

## 2. Evidence reviewed

- `NHL_Q_SERIES_FULL_SPRINT_PLAN_AND_CHECKLIST_v1.0.md`
- `NHL_Q1_BOQ_QUOTATION_INTAKE_AND_ISSUE_WORKFLOW_COMPLETION_v1.0.md`
- `NHL_Q2_QUOTATION_DOCUMENT_CONTROL_AND_BOQ_EXTRACTION_AID_COMPLETION_v1.0.md`
- `NHL_Q3_QUOTATION_DRAFT_ASSEMBLY_AND_CLIENT_CORRESPONDENCE_COMPLETION_v1.0.md`
- `NHL_Q4_CONTROLLED_QUOTATION_ISSUE_AND_RECEIVABLES_PREPARATION_COMPLETION_v1.0.md`
- `NHL_Q5_QUOTATION_OPERATIONS_DASHBOARD_AND_EXCEPTION_HANDLING_COMPLETION_v1.0.md`
- `NHL_Q6_QUOTATION_EVIDENCE_PACK_AND_ACCEPTANCE_GATE_v1.0.md`

## 3. Decision option A - Accept

Decision code:

`ACCEPT_NHL_Q_CONTROLLED_LOCAL_PRIVATE_PILOT`

Effect:

- NHL-Q workflow may be used for controlled local/private pilot operation.
- Human principal remains responsible for quotation issue and commercial decisions.
- Known limitations are accepted into backlog.

## 4. Decision option B - Accept with limitations

Decision code:

`ACCEPT_NHL_Q_WITH_LIMITATIONS`

Effect:

- NHL-Q workflow may be used in controlled pilot, but named limitations must be tracked before widening scope.
- No additional automation authority is granted.

## 5. Decision option C - Hold

Decision code:

`HOLD_NHL_Q_ACCEPTANCE`

Effect:

- Q workflow remains development-only.
- Product owner identifies the blocker(s) to fix before acceptance.

## 6. Decision option D - Reject

Decision code:

`REJECT_NHL_Q_ACCEPTANCE`

Effect:

- Q workflow is not accepted for pilot use.
- Sprint series must be reopened or redesigned.

## 7. Default boundary if no decision is made

If no product-owner decision is recorded, the workflow remains development-ready only.

No silent acceptance is allowed.


## 8. Recorded Decision

Decision code: `ACCEPT_NHL_Q_CONTROLLED_LOCAL_PRIVATE_PILOT`

Decision date: 2026-09-05

Decided by: Product owner (explicit authorization, "Bismillah...")

Effect:

- NHL-Q workflow (Q1 through Q6) is accepted for controlled local/private pilot operation for NHL Global Solution.
- Human principal remains responsible for quotation issue and commercial decisions.
- Known limitations from the Q6 evidence pack are accepted into backlog rather than blocking pilot use.
- This acceptance does not authorize production onboarding, public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, live payment movement, autonomous external sending, or autonomous quotation approval.

No further product-owner action is required to operate the NHL-Q workflow within this controlled local/private pilot boundary.
