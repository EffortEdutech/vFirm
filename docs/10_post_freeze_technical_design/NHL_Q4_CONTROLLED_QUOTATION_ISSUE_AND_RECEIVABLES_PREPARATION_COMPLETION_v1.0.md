# NHL-Q4 Controlled Quotation Issue and Receivables Preparation Completion v1.0

Date: 2026-09-04  
Sprint: NHL-Q4 — Controlled Quotation Issue and Receivables Preparation  
Status: Completed for controlled local/private pilot readiness

## 1. Completion summary

NHL-Q4 extends the NHL Global Solution BOQ quotation workflow from reviewed draft/correspondence preparation into controlled issue evidence and receivables preparation.

The sprint deliberately does not convert quotation issue into automated sending or payment collection. It records that the Virtual Principal, acting as the responsible human authority for the firm workspace, issued the quotation outside or beside the platform and supplied the document/evidence references required for audit reconstruction.

## 2. Product capability added

NHL Global Solution can now:

- record a reviewed quotation draft pack as issued to a client only through an explicit human principal action;
- link the issue record to the quotation case, draft pack, correspondence record, issued document reference, and submitted evidence reference;
- transition the quotation case, draft pack, and correspondence record into human-issued states;
- prepare a receivable/invoice-readiness record linked to the human-issued quotation;
- keep receivables preparation separate from invoice issue, payment capture, payment links, and bank instructions;
- export quotation issue and receivable preparation records as tenant-scoped business records;
- reconstruct Q4 actions from `event_log` and `audit_events`.

## 3. Runtime objects

Added app-state backed records:

- `quotation_issue_records`
- `quotation_receivable_preparations`

Added read endpoints:

- `GET /quotation-issue-records`
- `GET /quotation-receivable-preparations`

Added command endpoints:

- `POST /quotation-draft-packs/issue`
- `POST /quotation-receivable-preparations`

Added package script:

- `npm run check:nhl:q4`

## 4. State and authority rules

Controlled quotation issue requires:

- selected tenant and firm scope;
- a `quotation_draft_pack_id` belonging to the selected firm;
- draft pack status `HUMAN_REVIEWED`;
- prepared correspondence linked to the draft pack;
- correspondence status `DRAFT_REVIEW_REQUIRED`;
- authenticated human principal actor;
- issued document reference;
- submitted evidence reference.

Denied states include:

- AI worker attempts to issue the quotation;
- issue before correspondence is prepared;
- duplicate issue of the same draft pack;
- receivable preparation before a valid human-issued quotation record exists;
- duplicate receivable preparation for the same quotation issue.

## 5. Receivables and payment boundary

Receivable preparation is not a payment action.

Every Q4 receivable preparation records:

- `payment_boundary: NO_LIVE_PAYMENT_MOVEMENT`
- `payment_action_taken: false`
- `bank_instruction_ref: null`
- `receivable_status: RECEIVABLE_PREPARED_REVIEW_REQUIRED`

This keeps Q4 aligned with the current commercial boundary: no live payment movement, no autonomous payment action, and no payment-provider capture.

## 6. UI implementation

The Sales & Accounts module now shows:

- Controlled Quotation Issue and Receivables form;
- Controlled Quotation Issue Register;
- Receivables Preparation Register.

The development UI remains fully visible across tenant workspaces, while business meaning and runtime records remain tenant/firm scoped.

## 7. Evidence

Implemented smoke test:

- `scripts/smoke-nhl-q4-controlled-issue-receivables.mjs`

The smoke verifies:

- active workspace seed contains Amanah Formwork Pilot Firm and NHL Global Solution;
- issue before correspondence is denied;
- AI-controlled issue is denied;
- human-controlled issue is recorded;
- quotation case, draft pack, and correspondence transition to issued state;
- receivable preparation is recorded without payment action;
- duplicate issue and duplicate receivable preparation are denied;
- audit events are recorded;
- tenant export contains Q4 records.

## 8. Boundaries preserved

NHL-Q4 does not authorize:

- autonomous quotation issue;
- autonomous measurement, pricing, certification, or commercial approval;
- external email sending from the platform;
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

## 9. Next in plan

Proceed to:

`NHL-Q5 — Quotation Operations Dashboard and Exception Handling`

Q5 should make the quotation pipeline easier to operate by surfacing issue readiness, review blockers, stale quotation cases, receivable readiness, and audit/export gaps for NHL Global Solution.
