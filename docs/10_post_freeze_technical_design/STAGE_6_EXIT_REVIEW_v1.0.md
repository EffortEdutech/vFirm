# Stage 6 Exit Review — Commercial Operations

Version: v1.0  
Status: COMPLETE for local MVP baseline  
Date: 2026-08-26

## 1. Objective

Stage 6 established the first commercial operations layer for vFirm: invoice issue control, payment status recording, and auditable commercial state.

## 2. Completed Scope

| Area | Result |
|---|---|
| Invoice issue control | Added `POST /invoices/issue`; invoice issue requires linked project state `DELIVERABLE_ISSUED`. |
| Payment status | Added `POST /payments/record`; records manual/local-dev payment status and updates invoice status. |
| Payment read model | Added `GET /payment-statuses`. |
| Store support | PostgreSQL and JSON fallback both preserve `payment_statuses`. |
| UI | Invoices tab now supports issue and payment actions plus commercial summary. |
| Contracts | API contract catalogue updated with Stage 6 routes. |
| Test | Added `scripts/smoke-stage6-commercial-operations.mjs`. |

## 3. Validation Evidence

The Stage 6 smoke test proves:

- invoice issue fails before deliverable issue;
- deliverable issue enables invoice issue;
- payment recording requires issued invoice;
- payment status updates invoice to `PAID`;
- payment status records are queryable.

## 4. Boundary

No real payment provider is integrated yet. Stage 6 records local/manual payment references so the commercial state machine exists before payment-provider coupling.

## 5. Exit Decision

Stage 6 is closed as the local MVP Commercial Operations baseline.

Next planned stage: Stage 7 — AI Workforce Runtime.
