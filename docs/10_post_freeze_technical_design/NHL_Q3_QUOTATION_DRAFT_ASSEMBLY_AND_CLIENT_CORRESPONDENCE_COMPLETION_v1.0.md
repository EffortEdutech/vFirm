# NHL-Q3 Quotation Draft Assembly and Client Correspondence Completion v1.0

Date: 2026-09-04  
Sprint: NHL-Q3 — Quotation Draft Assembly and Client Correspondence  
Status: Complete

## Outcome

NHL-Q3 is complete for controlled local/private pilot use.

The Virtual Firm Platform can now assemble an NHL Global Solution quotation draft pack from a human-reviewed BOQ extraction aid and prepare client correspondence as a draft-only record. The workflow remains bounded by explicit human review and does not send, approve, price-rank, certify, or commit to the client autonomously.

## Active workspace repair

Before Q3 implementation, the live local Postgres-backed API on port 3091 only contained the PD-H2 private directory pilot tenant. That is why the web active workspace dropdown only showed PD-H2 workspaces.

The local pilot workspace data was repaired by running:

```bash
npm run seed:pilot-workspaces
```

The seed added/preserved:

- Amanah Formwork Pilot Firm under Formwork Pilot Tenant;
- NHL Global Solution under NHL Global Solution Tenant;
- their active pilot subscription packages;
- six worker instances per pilot firm;
- PD-H2 rehearsal firms as separate rehearsal context.

No destructive reset was performed.

## Capability added

Q3 adds controlled quotation draft pack records:

- `quotation_draft_packs`;
- `POST /api/quotation-draft-packs`;
- `POST /api/quotation-draft-packs/review`;
- `POST /api/quotation-draft-packs/client-correspondence`;
- `GET /api/quotation-draft-packs`.

The Sales & Accounts workspace now exposes:

- Quotation Draft Assembly form;
- Quotation Draft Review form;
- Client Correspondence Draft form;
- Quotation Draft Pack Register.

## State controls

Quotation draft pack flow:

1. BOQ extraction aid must exist.
2. BOQ extraction aid must be `HUMAN_REVIEWED`.
3. Quotation draft pack is created as `DRAFT_REVIEW_REQUIRED`.
4. AI worker review is denied.
5. Human principal can mark the draft pack `HUMAN_REVIEWED` or `REJECTED`.
6. Client correspondence can only be prepared after human review.
7. Client correspondence remains `DRAFT_REVIEW_REQUIRED`.
8. No external send or client-facing issue occurs in Q3.

## Business boundary

The quotation draft pack is:

- tenant-scoped;
- firm-scoped;
- linked to the quotation case;
- linked to the BOQ extraction aid;
- linked to source document/evidence references;
- non-authoritative;
- not client-facing;
- human-review-required.

It may support quotation preparation, but it does not become a final quotation and does not replace the Virtual Principal.

## Audit and export

Q3 emits audit/event records for:

- `quotation_draft_pack.prepared`;
- `quotation_draft_pack.human_reviewed`;
- `quotation_draft_pack.rejected`;
- `quotation_draft_pack.client_correspondence_prepared`.

Tenant export continues to include the legally permissible business records and audit trail for NHL Global Solution.

## Evidence

Executable evidence:

```bash
npm run check:nhl:q3
```

The smoke test verifies:

- active workspace seed contains both Amanah Formwork Pilot Firm and NHL Global Solution;
- draft pack creation is blocked until BOQ extraction aid is human-reviewed;
- quotation draft pack is prepared as non-authoritative and not client-facing;
- AI worker cannot review the draft pack;
- human principal review is recorded;
- client correspondence is prepared as draft-only;
- audit reconstruction is possible;
- tenant export includes audit integrity.

## Locked exclusions

NHL-Q3 does not authorize:

- autonomous measurement;
- autonomous pricing;
- autonomous approval;
- regulated certification;
- client-facing issue;
- external sending;
- live payment movement;
- public marketplace;
- live matching;
- ranking;
- capacity allocation;
- VF-24 publication;
- pricing intelligence;
- autonomous award;
- autonomous regulated approval.

## Next recommended sprint

`NHL-Q4 — Controlled Quotation Issue and Receivables Preparation`

Suggested Q4 objective:

Prepare the explicit human-controlled issue path for reviewed quotation draft packs, register the issued PDF/evidence, connect accepted quotation to invoice preparation, and keep receivables monitoring separate from live payment movement.
