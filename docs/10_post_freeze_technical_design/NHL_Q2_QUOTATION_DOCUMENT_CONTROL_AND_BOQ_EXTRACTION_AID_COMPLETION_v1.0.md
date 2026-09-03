# NHL-Q2 Quotation Document Control and BOQ Extraction Aid Completion v1.0

Status: Completed for controlled local/private pilot  
Sprint: NHL-Q2 — Quotation Document Control and BOQ Extraction Aid  
Firm: NHL Global Solution  
Virtual Principal: Nur Hernieliana  
Date: 2026-09-03

## 1. Scope completed

NHL-Q2 adds a controlled BOQ extraction aid layer on top of the NHL-Q1 quotation case workflow.

The sprint supports:

- registered BOQ source documents before extraction aid creation;
- quotation-case-linked extraction aid worksheets;
- draft extracted line items for human checking;
- explicit human review before the aid is accepted for quotation support;
- audit reconstruction for aid preparation and review;
- read endpoint and UI visibility for development/pilot use.

## 2. Boundary

The BOQ extraction aid is deliberately non-authoritative.

It may help organize client-supplied BOQ images, scans, PDFs, and manually prepared extraction notes, but it must not be treated as:

- final quantity measurement;
- final pricing;
- regulated technical certification;
- commercial approval;
- client commitment;
- autonomous quotation issue authority.

## 3. API added

| Endpoint | Purpose |
| --- | --- |
| `GET /boq-extraction-aids` | Read controlled BOQ extraction aids. |
| `POST /boq-extraction-aids` | Prepare a non-authoritative BOQ extraction review worksheet from registered quotation evidence. |
| `POST /boq-extraction-aids/review` | Record human principal review or rejection of the extraction aid. |

## 4. Data record added

`boq_extraction_aids`

Key fields:

- `tenant_id`
- `firm_id`
- `quotation_case_id`
- `source_document_ids`
- `source_evidence_refs`
- `extraction_method`
- `extraction_status`
- `extracted_items`
- `assumptions`
- `exclusions`
- `confidence_level`
- `requires_human_review`
- `authoritative`
- `reviewed_by_actor_id`
- `reviewed_at`
- `review_notes`

## 5. Workflow states

| State | Meaning |
| --- | --- |
| `DRAFT_REVIEW_REQUIRED` | Aid prepared but not accepted for quotation support. |
| `HUMAN_REVIEWED` | Human principal reviewed the aid for quotation support only. |
| `REJECTED` | Human principal rejected the aid. |

## 6. UI added

Sales & Accounts now includes:

- BOQ Extraction Aid form;
- draft extracted items JSON field;
- human review action;
- BOQ Extraction Aid Register.

## 7. Acceptance evidence

Smoke test:

`npm run check:nhl:q2`

The smoke test proves:

- extraction aid is denied without source document records;
- aid can be prepared from controlled source documents;
- aid is non-authoritative and review-required;
- AI worker review is denied;
- human principal review succeeds;
- audit events reconstruct preparation and review;
- read endpoint returns the aid;
- export manifest remains tenant/audit aligned.

## 8. Next recommended step

Proceed to:

`NHL-Q3 — Quotation Draft Assembly and Client Correspondence`

Recommended purpose:

Use the reviewed BOQ extraction aid to assemble a quotation draft pack with assumptions, exclusions, document references, and controlled client correspondence, still requiring human approval before sending.
