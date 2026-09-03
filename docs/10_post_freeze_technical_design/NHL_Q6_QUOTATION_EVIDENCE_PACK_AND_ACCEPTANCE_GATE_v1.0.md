# NHL-Q6 Quotation Evidence Pack and Acceptance Gate v1.0

Date: 2026-09-04
Sprint: NHL-Q6 — NHL Quotation Evidence Pack and Acceptance Gate
Status: Completed - Product-owner acceptance decision required

## 1. Evidence pack purpose

This evidence pack closes the NHL-Q quotation workflow sprint series for controlled local/private pilot readiness.

It proves that NHL Global Solution can handle a BOQ/image-to-quotation job inside the Virtual Firm Platform with controlled intake, document control, extraction aid, draft assembly, client correspondence preparation, human-controlled quotation issue, receivable preparation, operations visibility, audit reconstruction, and tenant export.

This pack does not grant production launch, public marketplace capability, autonomous pricing, autonomous approval, autonomous quotation issue, or live payment movement.

## 2. Workflow proven

| Step | Evidence | Status |
|---|---|---|
| BOQ quotation case intake | `quotation_cases` with client request summary and evidence refs | Proven |
| Source document control | `document_register_entries` and `document_revision_records` | Proven |
| BOQ extraction aid | `boq_extraction_aids` with non-authoritative review status | Proven |
| Human extraction review | extraction status `HUMAN_REVIEWED`; AI review denied | Proven |
| Quotation draft pack | `quotation_draft_packs` assembled from reviewed BOQ aid | Proven |
| Human draft review | draft status `HUMAN_REVIEWED`; AI review denied | Proven |
| Client correspondence draft | `correspondence_records` created as draft-only | Proven |
| Human-controlled issue | `quotation_issue_records` with issued document and evidence refs | Proven |
| Receivable preparation | `quotation_receivable_preparations` with no payment action | Proven |
| Operations dashboard | `GET /quotation-operations-summary` and UI summary panels | Proven |
| Audit reconstruction | `event_log` and `audit_events` include material Q events | Proven |
| Tenant export | `GET /data-protection/export-package` includes Q records | Proven |

## 3. Acceptance criteria

| Criterion | Result |
|---|---|
| NHL Global Solution workspace exists as separate tenant/firm | Pass |
| Workflow is tenant and firm scoped | Pass |
| BOQ/source evidence can be controlled | Pass |
| Extraction aid is non-authoritative and human-reviewed | Pass |
| Quotation draft pack is human-reviewed before correspondence | Pass |
| Client correspondence remains draft-only until controlled issue | Pass |
| Human principal controls quotation issue | Pass |
| AI worker cannot issue or approve quotation | Pass |
| Receivable preparation does not create payment action | Pass |
| Operations dashboard surfaces review queues and exceptions | Pass |
| Audit/event records reconstruct material actions | Pass |
| Export includes legally permissible quotation records | Pass |
| Locked marketplace/payment/regulatory boundaries remain visible | Pass |

## 4. Evidence commands

Q6 evidence is verified by:

- `npm run check:nhl:q1`
- `npm run check:nhl:q2`
- `npm run check:nhl:q3`
- `npm run check:nhl:q4`
- `npm run check:nhl:q5`
- `npm run check:nhl:q6`
- `npm run check:web:navigation`
- `npm run check`

## 5. Known limitations accepted for decision review

The following remain limitations, not blockers for controlled local/private pilot use:

1. BOQ extraction is an aid only; it is not an OCR-certified, measurement-certified, or pricing-certified result.
2. Quotation line quantities/rates/amounts can be prepared as structured placeholders, but human commercial review remains required.
3. The platform records human issue evidence but does not send email externally in this sprint.
4. Receivable preparation does not issue a live invoice, payment link, bank instruction, or payment capture.
5. The quotation operations dashboard is an internal operator view, not client portal workflow.
6. Source images/PDFs are referenced by controlled evidence refs; full document ingestion/OCR automation remains a later scoped enhancement.

## 6. Boundary statement

NHL-Q6 preserves these boundaries:

- no autonomous measurement;
- no autonomous pricing;
- no autonomous certification;
- no autonomous commercial approval;
- no autonomous quotation issue;
- no external email sending from the platform;
- no live invoice payment capture;
- no bank instruction creation;
- no live payment movement;
- no public marketplace;
- no live matching;
- no ranking;
- no capacity allocation;
- no VF-24 observatory publication;
- no pricing intelligence;
- no autonomous award;
- no autonomous regulated approval.

## 7. Acceptance gate recommendation

Technical recommendation: `GO_FOR_PRODUCT_OWNER_ACCEPTANCE_REVIEW`

The NHL-Q workflow is ready for product-owner decision as a controlled local/private pilot capability for NHL Global Solution.

## 8. Required product-owner decision

The product owner should choose one of:

1. Accept NHL-Q workflow for controlled local/private pilot use.
2. Accept with limitations and move accepted limitations into backlog.
3. Hold acceptance pending specific fixes.
4. Reject acceptance and reopen the sprint series.

No silent acceptance is recorded by this evidence pack.
