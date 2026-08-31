---
id: VFIRM-SF-S6-DAILY-OPERATIONS-PILOT-HANDOFF
title: "SF-S6 Daily Operations and Pilot Handoff Technical Design"
version: "1.0"
status: "Implemented"
---

# SF-S6 Daily Operations and Pilot Handoff

## 1. Purpose

SF-S6 turns the first solopreneur Formwork Engineering Virtual Firm from module-by-module capability into a daily operating surface for the Virtual Principal.

The sprint remains bounded to controlled local pilot operation. It does not create a public marketplace, live payment capture, autonomous professional approval, or external production rollout.

## 2. Product outcome

The Virtual Principal can inspect one daily operations view covering:

- front desk enquiries and communication drafts;
- administration deadlines and document-control work;
- proposal, expense, receivable, and invoice attention items;
- project and task workload;
- technical delivery readiness and blocked packages;
- HIGH/CRITICAL QA exceptions;
- pilot incidents/support exceptions;
- cash snapshot and outstanding position;
- rehearsal checks and handoff acceptance evidence.

## 3. Data model

`pilot_handoff_records` records the human pilot handoff acceptance.

Each record is tenant- and firm-scoped and stores:

- accepting human actor;
- rehearsal reference;
- handoff status;
- deterministic checklist snapshot;
- evidence references;
- decision summary;
- accepted timestamp;
- metadata including operations summary status and exception count.

Daily operations itself is a derived read model from existing SF-S1 through SF-S5 records, not a new source of truth.

## 4. API contract

| Method | Path | Purpose |
|---|---|---|
| GET | `/operations/today` | Read derived SF-S6 daily cockpit summary. |
| POST | `/pilot/handoff` | Record human principal pilot handoff acceptance. |
| GET | `/pilot-handoff-records` | Read tenant/firm-scoped handoff register. |
| GET | `/data-protection/export-package` | Export tenant/firm-scoped legally permissible business records with audit trail. |

`/operations/today` supports optional `tenant_id` and `firm_id` query filters. Dev-header actor scope blocks cross-tenant and cross-firm access.

## 5. Deterministic daily operations checks

The cockpit calculates:

- overdue and due-soon administrative deadlines;
- proposal validity due/expired buckets;
- pending principal approvals/reviews;
- blocked technical delivery packages;
- open HIGH/CRITICAL QA findings;
- active pilot incidents and critical support cases;
- active worker count, open tasks, unassigned tasks, and task states;
- open pipeline, proposal, project, cash, and outstanding values.

The summary status is:

- `READY_FOR_HANDOFF_ACCEPTANCE` when rehearsal checks pass and there are no HIGH/CRITICAL exceptions;
- `OPERATOR_ATTENTION_REQUIRED` when exceptions exist;
- `REHEARSAL_IN_PROGRESS` when activity exists but checks are incomplete.

## 6. Authority boundary

Only a human actor can record `/pilot/handoff`.

SF-S6 does not approve, certify, issue, or conclude technical deliverables. SF-S5 delivery packages remain `READY_FOR_PRINCIPAL_REVIEW` or `BLOCKED` in this surface.

## 7. Verification

Acceptance is covered by `scripts/smoke-sf-s6-daily-operations.mjs` in both JSON fallback and PostgreSQL modes. The smoke performs a representative working-week rehearsal across front desk, administration, sales/accounts, technical delivery, operations summary, human-only handoff acceptance, event/audit evidence, and tenant isolation denial.