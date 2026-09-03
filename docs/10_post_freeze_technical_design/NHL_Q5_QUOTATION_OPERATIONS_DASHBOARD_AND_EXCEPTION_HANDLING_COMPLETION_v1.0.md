# NHL-Q5 Quotation Operations Dashboard and Exception Handling Completion v1.0

Date: 2026-09-04
Sprint: NHL-Q5 — Quotation Operations Dashboard and Exception Handling
Status: Completed for controlled local/private pilot readiness

## 1. Completion summary

NHL-Q5 adds an operations/readiness view for NHL Global Solution's BOQ quotation workflow.

The sprint does not add new authority or autonomous actions. It reads the existing NHL-Q1 through NHL-Q4 records and surfaces the current quotation pipeline, human review queue, exception list, receivable readiness, audit posture, and locked business boundaries.

## 2. Product capability added

NHL Global Solution can now see:

- quotation case counts;
- BOQ extraction aid counts and review blockers;
- quotation draft pack counts and review blockers;
- issue-ready quotations where a reviewed draft pack and correspondence exist but human issue has not been recorded;
- human-issued quotations that still need receivable/invoice-readiness preparation;
- receivable preparation records waiting for review;
- audit/event posture for quotation records;
- boundary reminders for advisory BOQ extraction, human-controlled issue, tenant-scoped audit/export, and no live payment movement.

## 3. Runtime surface

Added read endpoint:

- `GET /quotation-operations-summary`

Added frontend summary surface:

- Dashboard: `Quotation Operations Today`
- Sales & Accounts: `NHL-Q5 Quotation Operations`

Added package script:

- `npm run check:nhl:q5`

## 4. Exception categories

The Q5 summary surfaces these exception/action keys:

- `source_documents_missing`
- `boq_extraction_review_pending`
- `quotation_draft_review_pending`
- `quotation_issue_ready`
- `issued_without_receivable_preparation`
- `receivable_review_required`
- `quotation_audit_gap`

Exception severity is informational for operator triage. It does not approve, reject, certify, price, measure, issue, invoice, or collect payment.

## 5. Boundaries preserved

NHL-Q5 does not authorize:

- autonomous measurement, pricing, certification, or approval;
- autonomous quotation issue;
- external email sending;
- invoice issue for undelivered work;
- payment links, payment capture, bank instruction creation, or live payment movement;
- public marketplace;
- live matching;
- ranking;
- capacity allocation;
- VF-24 observatory publication;
- pricing intelligence;
- autonomous award;
- autonomous regulated approval.

## 6. Evidence

Implemented smoke test:

- `scripts/smoke-nhl-q5-quotation-operations-dashboard.mjs`

The smoke verifies:

- quotation operations summary endpoint is available;
- dashboard/UI markers are present;
- missing source document exception is surfaced;
- BOQ extraction review exception is surfaced;
- quotation draft review exception is surfaced;
- issue-ready exception is surfaced;
- issued-without-receivable exception is surfaced;
- receivable review exception is surfaced;
- human authority and no-live-payment boundaries remain visible.

## 7. Next in plan

Proceed to:

`NHL-Q6 — NHL Quotation Evidence Pack and Acceptance Gate`

Q6 should assemble the end-to-end NHL-Q evidence pack, summarize accepted limitations, verify export/audit evidence, and prepare the product-owner acceptance decision gate for this quotation workflow.
