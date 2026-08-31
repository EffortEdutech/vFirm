---
id: VFIRM-SF-S4-SALES-PROPOSALS-ACCOUNTS-COMPLETION
title: "SF-S4 Sales, Proposals, and Accounts Completion"
version: "1.0"
status: "Completed"
---

# SF-S4 Sales, Proposals, and Accounts Completion

## Result

SF-S4 is complete for controlled local operation in JSON fallback and PostgreSQL modes.

Delivered:

- versioned Marketing/Sales Coordinator and Accounts Clerk skill bindings;
- deterministic firm opportunity pipeline;
- existing scope, price build-up, proposal, and principal approval reuse;
- human-principal proposal dispatch with approval and document references;
- duplicate and pre-approval dispatch denial;
- expense preparation and explicit human approval without payment execution;
- review-only receivable follow-up drafts with no sending;
- deterministic client-to-cash snapshot from invoice, payment, and approved-expense records;
- unified Sales and Accounts workspace;
- tenant/firm-scoped relational persistence and protected reads;
- attributable events and audit summaries.

## Authority evidence

Sales workers cannot commit price/scope or dispatch proposals. Accounts workers cannot approve expenses, issue invoices, approve payments, or instruct banks. No receivable follow-up can be sent in SF-S4. Cash snapshot values are record projections and never represented as bank balances.

## Validation evidence

Completed on 2026-08-28:

- migration catalogue: 18 files valid;
- migration 0018 applied to local Docker PostgreSQL;
- full `npm run check`: passed;
- SF-S3 JSON/PostgreSQL regression: passed;
- `npm run check:sf-s4`: passed;
- `npm run check:sf-s4:postgres`: passed;
- pre-approval and duplicate dispatch denial, proposal SENT acceptance, opportunity transitions, expense segregation, receivable draft boundary, and cash calculation verified.

## Next controlled scope

SF-S5 — Technical Drawing and Delivery Support is next in the approved sprint plan. It has not started.
