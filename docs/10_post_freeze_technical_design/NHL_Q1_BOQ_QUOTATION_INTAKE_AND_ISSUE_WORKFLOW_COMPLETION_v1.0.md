# NHL-Q1 BOQ Quotation Intake and Issue Workflow Completion v1.0

Status: Completed for controlled local/private pilot  
Sprint: NHL-Q1 — BOQ Quotation Intake and Issue Workflow  
Firm: NHL Global Solution  
Virtual Principal: Nur Hernieliana  
Date: 2026-09-03

## 1. Scope completed

NHL-Q1 converts the real NHL BOQ-image quotation sample into a first-class vFirm workflow.

The workflow now supports:

- controlled quotation case registration;
- incoming BOQ image evidence references;
- document register linkage;
- intake/proposal linkage;
- explicit proposal approval before quotation issue;
- submitted quotation evidence registration;
- audit reconstruction;
- tenant-scoped export manifest alignment.

Raw sample files remain local/private pilot evidence and are not committed to the repository.

## 2. Workflow states

| State | Meaning |
| --- | --- |
| `INTAKE_REGISTERED` | Client BOQ/request evidence is registered as a quotation case. |
| `PROPOSAL_DRAFTED` | A proposal draft is linked to the quotation case. |
| `APPROVAL_RECORDED` | Human approval is recorded through the linked approved proposal. |
| `ISSUED_TO_CLIENT` | The submitted quotation PDF/evidence ref is registered after approval. |

## 3. API added

| Endpoint | Purpose |
| --- | --- |
| `GET /quotation-cases` | Read tenant-scoped quotation cases through the existing read collection. |
| `POST /quotation-cases` | Create a controlled quotation case from client request/evidence refs. |
| `POST /quotation-cases/link-proposal` | Link a proposal draft to the quotation case. |
| `POST /quotation-cases/approve` | Record human quotation approval after the linked proposal is approved. |
| `POST /quotation-cases/issue` | Register issued/submitted quotation evidence after approval only. |

## 4. UI added

Sales & Accounts now shows an NHL BOQ Quotation Case panel for development/pilot use.

The panel can:

- register the BOQ quotation case;
- capture incoming evidence refs;
- link existing document register entries;
- link a proposal;
- record case approval;
- register the submitted quotation PDF/evidence ref.

## 5. Governance boundaries

NHL-Q1 preserves the current Virtual Firm Platform boundaries:

- no autonomous approval;
- no autonomous client commitment;
- no autonomous regulated approval;
- no live payment movement;
- no pricing intelligence or price-first ranking;
- no public marketplace, live matching, capacity allocation, or VF-24 observatory publication;
- no uncontrolled tenant/client data sharing.

## 6. Acceptance evidence

Smoke test:

`npm run check:nhl:q1`

The smoke test proves:

- BOQ image evidence refs can be registered;
- quotation case can be created;
- proposal can be linked;
- issue is denied before approval;
- linked proposal must be approved first;
- submitted PDF/evidence ref is recorded only after approval;
- quotation events are present in audit/event records;
- export manifest includes audit trail alignment.

## 7. Next recommended step

Proceed to:

`NHL-Q2 — Quotation Document Control and BOQ Extraction Aid`

Recommended purpose:

Turn the registered BOQ image/PDF evidence into a structured review worksheet for the human principal, without treating OCR/LLM extraction as authoritative pricing, measurement, or approval.
