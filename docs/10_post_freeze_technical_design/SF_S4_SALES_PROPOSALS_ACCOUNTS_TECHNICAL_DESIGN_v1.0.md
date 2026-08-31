---
id: VFIRM-SF-S4-SALES-PROPOSALS-ACCOUNTS
title: "SF-S4 Sales, Proposals, and Accounts Technical Design"
version: "1.0"
status: "Active Sprint Design"
---

# SF-S4 Sales, Proposals, and Accounts

## Outcome

Provide one client-to-cash workspace for opportunity tracking, proposal preparation and controlled dispatch, invoicing, expenses, receivables follow-up, and a deterministic cash snapshot.

## Authority

Marketing/Sales Coordinator may maintain opportunities and prepare proposal material. Accounts Clerk may prepare expenses, invoice support, and receivable reminders. Neither may commit price or scope, dispatch a proposal, issue an invoice, approve payment, instruct a bank, or represent payment as received.

The Virtual Principal remains the human commercial authority for proposal approval/dispatch, expense approval, and invoice issue. Payment records describe externally observed status; they are not payment instructions.

## States

- Opportunity: `NEW -> QUALIFIED -> PROPOSAL_DRAFT -> PROPOSAL_APPROVED -> PROPOSAL_SENT -> WON | LOST`.
- Proposal: existing preparation and explicit approval, then `SENT` only through a human dispatch command with approval reference and document reference.
- Expense: `DRAFT_REVIEW_REQUIRED -> APPROVED | REJECTED`; no payment execution state.
- Receivable follow-up: `DRAFT_REVIEW_REQUIRED` only in SF-S4.
- Cash snapshot: deterministic projection from invoices, payment records, and approved expenses.

Invalid stage jumps, cross-tenant references, proposal dispatch without approval, duplicate dispatch, negative expenses, and reminder sending are denied.

## Skill bindings

Marketing/Sales and Accounts Clerk bindings identify versioned role/worker skill references, typed schemas, supervisor, permissions, budgets inherited from worker templates, and explicit forbidden actions.

## External tools

No new external tool is required. LiteLLM, Instructor, Outlines, Langfuse, and DSPy remain candidates for later runtime optimization and validation, not dependencies for commercial authority or accounting truth.

## Exit gate

The principal can track an opportunity, prepare/approve/dispatch a proposal through explicit gates, issue and monitor an invoice, prepare and approve an expense without payment execution, draft a receivable reminder without sending, and read a reproducible cash snapshot with audit attribution.
