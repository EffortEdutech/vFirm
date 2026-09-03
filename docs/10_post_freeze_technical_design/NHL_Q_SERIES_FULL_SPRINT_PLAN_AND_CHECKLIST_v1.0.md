# NHL-Q Series Full Sprint Plan and Checklist v1.0

Date: 2026-09-04
Scope: NHL Global Solution BOQ/image-to-quotation workflow for controlled local/private pilot operation
Status: Q1-Q3 complete, Q4 active

## Product target

The NHL-Q series makes the Virtual Firm Platform able to handle a realistic NHL Global Solution quotation job:

1. receive a client BOQ/image quotation request;
2. control source documents and evidence;
3. prepare a BOQ extraction aid;
4. assemble a quotation draft pack;
5. prepare client correspondence;
6. record explicit human-controlled quotation issue;
7. prepare receivables/invoice readiness without live payment movement;
8. reconstruct the whole job from tenant-scoped audit records;
9. export legally permissible business records.

This is an organization-support firm workflow, not an autonomous QS/certification workflow. BOQ quantities, rates, amounts, terms, and outgoing communication remain subject to human principal review.

## Governing boundaries

The NHL-Q series does not authorize:

- autonomous measurement;
- autonomous pricing;
- autonomous approval;
- regulated certification;
- autonomous client-facing issue;
- external sending without human control;
- live payment movement;
- public marketplace;
- live matching;
- ranking;
- capacity allocation;
- VF-24 publication;
- pricing intelligence;
- autonomous award;
- autonomous regulated approval.

## Sprint map

| Sprint | Name | Status | Main outcome |
|---|---|---:|---|
| NHL-Q1 | BOQ Quotation Intake and Issue Workflow | Complete | Register BOQ quotation case, link proposal approval, and record submitted quotation evidence. |
| NHL-Q2 | Quotation Document Control and BOQ Extraction Aid | Complete | Register source documents and prepare/review non-authoritative BOQ extraction aids. |
| NHL-Q3 | Quotation Draft Assembly and Client Correspondence | Complete | Assemble human-reviewed quotation draft pack and prepare correspondence as draft-only. |
| NHL-Q4 | Controlled Quotation Issue and Receivables Preparation | Complete | Record human-controlled quotation issue, create issue evidence, and prepare receivable/invoice readiness without payment action. |
| NHL-Q5 | Quotation Operations Dashboard and Exception Handling | Complete | Show quotation pipeline, blockers, overdue reviews, issue readiness, receivable readiness, and audit gaps for the active NHL workspace. |
| NHL-Q6 | NHL Quotation Evidence Pack and Acceptance Gate | Active next | Assemble evidence pack, export test, limitations, and product-owner acceptance gate for the NHL-Q workflow. |

## Detailed sprint plan

### NHL-Q1 â€” BOQ Quotation Intake and Issue Workflow

Objective: represent the client BOQ quotation request as a controlled quotation case.

Completed outcomes:

- BOQ image/PDF quotation case record.
- Client/intake/proposal linkage.
- Human approval required before issue.
- Submitted quotation evidence registered.
- Tenant export and audit reconstruction verified.

Evidence:

```bash
npm run check:nhl:q1
```

### NHL-Q2 â€” Quotation Document Control and BOQ Extraction Aid

Objective: turn raw client BOQ inputs into controlled document/evidence references and a review-only extraction aid.

Completed outcomes:

- Source documents required before extraction aid.
- Extraction aid remains non-authoritative.
- Human principal review required.
- AI review denied.
- Audit and export verified.

Evidence:

```bash
npm run check:nhl:q2
```

### NHL-Q3 â€” Quotation Draft Assembly and Client Correspondence

Objective: assemble a quotation draft pack from a reviewed BOQ extraction aid and prepare client correspondence as draft-only.

Completed outcomes:

- Draft pack requires human-reviewed BOQ extraction aid.
- Draft pack is non-authoritative and not client-facing.
- AI review denied.
- Human principal review required.
- Client correspondence prepared as `DRAFT_REVIEW_REQUIRED`.

Evidence:

```bash
npm run check:nhl:q3
```

### NHL-Q4 â€” Controlled Quotation Issue and Receivables Preparation

Objective: close the controlled issue step after Q3 and prepare receivables readiness without live payment action.

Implementation targets:

- Add quotation issue record linked to:
  - quotation case;
  - quotation draft pack;
  - client correspondence draft;
  - issued document reference;
  - submitted evidence reference.
- Require quotation draft pack to be `HUMAN_REVIEWED`.
- Require client correspondence draft to exist.
- Require human principal actor for issue.
- Mark quotation draft pack as `ISSUED_TO_CLIENT_BY_HUMAN`.
- Mark quotation case as `ISSUED_TO_CLIENT` or preserve existing issue state with explicit evidence.
- Add receivable preparation record linked to the issue record.
- Allow optional invoice draft reference but no live payment and no bank instruction.
- Add UI controls in Sales & Accounts for controlled issue and receivable preparation.
- Add audit events and export coverage.

Acceptance checks:

- Issue before reviewed draft is denied.
- Issue without correspondence draft is denied.
- AI issue is denied.
- Human issue records document/evidence refs.
- Receivable preparation can be created after issue only.
- Receivable preparation remains non-payment and review-ready.
- Active workspace seed contains Amanah Formwork Pilot Firm and NHL Global Solution.
- Audit reconstruction and export pass.

Evidence:

```bash
npm run check:nhl:q4
```

### NHL-Q5 â€” Quotation Operations Dashboard and Exception Handling

Objective: make the NHL quotation workflow operationally visible.

Planned targets:

- Quotation status cards for intake, document control, BOQ aid, draft pack, issue, and receivables.
- Exceptions for missing source documents, unreviewed BOQ aids, unreviewed draft packs, missing correspondence, missing issue evidence, and unprepared receivables.
- Active workspace scoped dashboard counts.
- No cross-tenant leakage.
- No autonomous issue/payment shortcuts.

Acceptance checks:

- Operator can see what is blocked and why.
- NHL workspace shows NHL quotation work only.
- Formwork workspace does not inherit NHL quotation records.
- Dashboard uses deterministic state, not free-text inference.

### NHL-Q6 â€” NHL Quotation Evidence Pack and Acceptance Gate

Objective: close the NHL-Q series with evidence and product-owner decision.

Planned targets:

- Evidence pack document.
- Smoke summary across Q1-Q5.
- Known limitations.
- Export evidence.
- Product-owner acceptance gate wording.

Acceptance checks:

- All Q1-Q5 checks pass.
- No blocker-level limitation remains.
- Product owner can accept, hold, reject, or defer.

## Master checklist

### Scope and boundaries

- [x] Keep NHL Global Solution singular naming.
- [x] Keep NHL as Organization Support workspace.
- [x] Keep raw client files local/private and out of Git.
- [x] Keep active firm workspace dropdown seeded with Formwork and NHL.
- [ ] Add Q4 controlled quotation issue records.
- [ ] Add Q4 receivable preparation records.
- [ ] Add Q5 operations dashboard visibility.
- [ ] Add Q6 evidence pack and acceptance gate.

### Data model

- [x] `quotation_cases`
- [x] `boq_extraction_aids`
- [x] `quotation_draft_packs`
- [ ] `quotation_issue_records`
- [ ] `quotation_receivable_preparations`

### API

- [x] Quotation case create/link/approve/issue.
- [x] BOQ extraction aid prepare/review/read.
- [x] Quotation draft pack prepare/review/correspondence/read.
- [ ] Controlled quotation issue endpoint.
- [ ] Receivable preparation endpoint.
- [ ] Q4 read endpoints.

### UI

- [x] Active workspace selector.
- [x] BOQ quotation case controls.
- [x] BOQ extraction aid controls.
- [x] Quotation draft assembly controls.
- [ ] Controlled quotation issue controls.
- [ ] Receivable preparation controls.
- [ ] Q5 dashboard/exception cards.

### Tests

- [x] `npm run check:nhl:q1`
- [x] `npm run check:nhl:q2`
- [x] `npm run check:nhl:q3`
- [ ] `npm run check:nhl:q4`
- [ ] `npm run check:nhl:q5`
- [ ] Q6 evidence/acceptance check
- [ ] Full `npm run check`

## Current next action

Proceed with:

`NHL-Q4 â€” Controlled Quotation Issue and Receivables Preparation`
