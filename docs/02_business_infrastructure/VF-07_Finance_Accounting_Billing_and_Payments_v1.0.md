---
id: VF-07
title: "Finance, Accounting, Billing & Payments"
version: "1.0"
status: "Architecture Baseline"
source_status: "RECOVERED FROM COMBINED VF-03 TO VF-08 BASELINE"
---

# VF-07 - Finance, Accounting, Billing & Payments

VF-07 is first-class business infrastructure. A Virtual Firm must not only deliver work; it must quote, invoice, collect, understand margins, prepare records, and support tax/accounting workflows.

## Commercial lifecycle

```text
Client request
  -> quotation
  -> contract
  -> project
  -> milestone
  -> professional approval where required
  -> invoice
  -> payment
  -> platform distribution
  -> firm earnings
  -> accounting records
```

## Scope

VF-07 owns financial dashboards, invoices, receipts, payment status, expenses, revenue recognition support, project profitability, platform fees, payouts, accountant-ready exports, reconciliation preparation, and finance events.

Regulated accounting, tax, audit, or financial advice requires a governed Accounting or Finance Practice Pack and authorized professional review where applicable.

## Core objects

```text
PriceBasis
Invoice
InvoiceLine
Payment
Receipt
Expense
PlatformFee
Payout
LedgerExport
ReconciliationItem
ProjectMargin
FinancialReport
```

## AI workforce support

Finance Manager Agent tracks revenue, costs, margins, outstanding payments, and cash flow. Accounting Agent prepares bookkeeping and reconciliation support. Billing Agent prepares invoices and reminders. Collections Agent manages polite follow-up under policy.

## Controls

Financial actions require thresholds, segregation of duties for material changes, fraud checks, payment provider controls, audit trails, and explicit approval where needed.

## Conformance

1. No invoice without Firm, Client, engagement or approved exception, amount, currency, tax metadata, line basis, and responsible actor.
2. AI may prepare accounting records but cannot silently file regulated returns or issue professional accounting conclusions.
3. Payouts and platform fees must be transparent and auditable.
4. Financial data remains tenant-scoped and exportable where legally permissible.

