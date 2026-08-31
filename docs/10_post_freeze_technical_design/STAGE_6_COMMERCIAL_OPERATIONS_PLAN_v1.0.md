# Stage 6 — Commercial Operations Plan

Version: v1.0  
Status: Active implementation baseline  
Date: 2026-08-26

## 1. Purpose

Stage 6 matures proposal, engagement, billing, invoice, payment, and commercial controls so the MVP can support pilot-style transactions with auditable state.

## 2. Stage 6 MVP Scope

| Area | Stage 6 decision |
|---|---|
| Invoice issue gate | Draft invoices cannot be issued until the linked project deliverable is issued. |
| Payment status | Payment records are created in `payment_statuses` and update invoice commercial state. |
| Commercial audit | Invoice issue and payment recording emit event/audit records. |
| UI | Invoices tab becomes a commercial operations screen with issue and payment actions. |
| External payments | Deferred; Stage 6 records manual/local-dev provider references. |

## 3. Commands

| Method | Path | Purpose |
|---|---|---|
| POST | `/invoices/issue` | Issue a draft invoice after delivery gate. |
| POST | `/payments/record` | Record payment status and update invoice state. |
| GET | `/payment-statuses` | Query payment records. |

## 4. Exit Criteria

1. Invoice issue cannot bypass delivery issue.
2. Payment cannot be recorded against unissued invoice.
3. Payment status is auditable and queryable.
4. Commercial UI shows draft, issued, paid, and payment counts.
5. Smoke test proves the controlled commercial path.
