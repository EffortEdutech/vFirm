---
id: VFIRM-SOLOPRENEUR-FIRM-PRODUCT-TARGET-SPRINT-PLAN
title: "vFirm First Solopreneur Firm Product Target and Sprint Plan"
version: "1.0"
status: "Approved Scope Expansion - Active"
source_status: "CREATED AFTER RELEASE 1 LOCAL PILOT ACCEPTANCE"
---

# vFirm First Solopreneur Firm Product Target and Sprint Plan v1.0

## 1. Decision

Release 1 remains accepted for controlled local Formwork Engineering pilot readiness. This plan is an explicit, bounded scope expansion approved by the user on 2026-08-27.

The next product target is not a generic skill platform or a collection of external AI tools. It is one operable solopreneur Formwork Engineering Virtual Firm.

## 2. Product promise

A qualified Virtual Principal can run a small client-facing professional firm with modular virtual support for front desk, administration, accounts, marketing and sales, project coordination, and technical drawing support while retaining all professional and consequential commercial authority.

```text
Virtual Principal
  + Modular Virtual Workforce
  + Formwork Practice Pack
  + Shared Business Infrastructure
  + Human Authority and Audit Controls
  = Operable Solopreneur Virtual Firm
```

## 3. Initial firm configuration

| Module | Virtual worker | Initial outcome |
|---|---|---|
| Front Desk | Front Desk Coordinator | Capture, acknowledge, qualify, and route enquiries. |
| Administration | Administration Clerk | Maintain records, correspondence, documents, and follow-ups. |
| Accounts | Accounts Clerk | Prepare invoices, receivables, expenses, and finance schedules. |
| Marketing and Sales | Marketing & Sales Coordinator | Maintain leads and draft campaigns, scopes, and proposals. |
| Technical Drawing Support | Technical Drawing Assistant | Check drawing inputs, registers, revisions, and package completeness. |
| Project Coordination | Project Coordination Assistant | Coordinate tasks, evidence, deadlines, and delivery status. |
| Professional Authority | Virtual Principal | Approve scope, fees, engineering conclusions, issue, and commitments. |

Workers assist, draft, extract, check, coordinate, and recommend. They do not silently approve, certify, issue regulated work, commit price or scope, or instruct payments.

## 4. Operating loop

```text
Enquiry
  -> qualification and intake
  -> principal service-fit decision
  -> scope and proposal draft
  -> principal commercial approval
  -> engagement and project setup
  -> drawing/document control
  -> technical preparation and QA
  -> evidence bundle
  -> principal professional approval
  -> controlled issue
  -> invoice and receivables follow-up
  -> management dashboard and audit
```

## 5. Fixed sprint plan

| Sprint | Outcome | Exit gate |
|---|---|---|
| SF-S1 Firm Shape and Workspace | Replace build-stage orientation with a solopreneur operating view and define the six starter modules. | Virtual Principal can see firm readiness and activate bounded workers. |
| SF-S2 Front Desk and Client Pipeline | Enquiry inbox, lead qualification, communication drafts, consent/conflict prompts, and intake handoff. | A real enquiry progresses to completed intake with attribution and missing-information control. |
| SF-S3 Administration and Document Control | Correspondence register, document intake, revision control, deadlines, tasks, and transmittals. | Principal can operate a project without raw JSON or manual folder tracking. |
| SF-S4 Sales, Proposals, and Accounts | Pipeline, proposal preparation, approval, invoice issue, receivables, expenses, and cash snapshot. | Client-to-cash loop works from the solopreneur workspace with segregation of duties. |
| SF-S5 Technical Drawing and Delivery Support | Drawing register, revision comparison contract, calculation-input preparation, QA findings, evidence, review, and issue. | Formwork package can be prepared and issued only through professional approval. |
| SF-S6 Daily Operations and Pilot Handoff | Today view, exceptions, workload, deadlines, management summary, rehearsal, and pilot handbook. | Virtual Principal can run a representative working week locally. |

No additional sprint is created until SF-S6 acceptance or a recorded scope decision.

## 6. Build priorities

1. Design from the Virtual Principal's daily work, not from available tools.
2. Reuse the existing Node.js, PostgreSQL, policy, event, approval, and audit foundations.
3. Add external tools only when a measured acceptance criterion cannot be met economically with the existing stack.
4. Bind role skills only after the worker, workflow, authority, evidence, and output contract is explicit.
5. Keep every record tenant- and firm-scoped and every material action attributable.
6. Use deterministic validators for required fields, amounts, states, revisions, and engineering inputs.
7. Treat retrieval as evidence discovery, never as professional or compliance authority.

## 7. Acceptance criteria

The target is accepted when the Virtual Principal can:

1. configure the six modules and understand each worker's authority boundary;
2. receive and progress a client enquiry without leaving the main workspace;
3. maintain client, project, task, document, and correspondence records;
4. prepare, approve, send, and accept a proposal through explicit states;
5. prepare a Formwork delivery package with controlled drawings, QA, and evidence;
6. block technical issue until valid human professional approval exists;
7. prepare and issue an invoice and monitor receivables without autonomous payment action;
8. see today's priorities, exceptions, approvals, deadlines, pipeline, projects, and cash position;
9. reconstruct the material business and AI-worker actions from audit records;
10. export the firm's legally permissible business records.

## 8. External-tool rule

Graphify, document parsers, retrieval databases, LLM gateways, tracing systems, and optimization frameworks are candidates, not dependencies. A candidate enters a sprint only when it solves a named product gap, passes licensing and data-isolation review, and remains replaceable behind a vFirm-owned interface.

## 9. Current implementation status

Status update (2026-08-28): SF-S1 through SF-S6 are complete for controlled local operation. The first solopreneur Formwork Engineering Virtual Firm now supports representative working-week operation and local pilot handoff acceptance. No additional sprint is created until a recorded product-owner scope decision defines the next bounded step.
