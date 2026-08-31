---
id: VF-03-to-VF-08
title: "Business Operating Infrastructure"
version: "1.0"
status: "Architecture Baseline"
source_status: "CONSOLIDATED/RECONSTRUCTED FROM PRIOR CHAT SUMMARY"
---

# VF-03 → VF-08 — Business Operating Infrastructure

## VF-03 — Client & CRM

Client 360 should connect:
- clients
- contacts
- organizations
- opportunities
- projects
- contracts
- invoices
- documents
- communications
- preferences

Core goal: every interaction belongs to a structured client relationship, not fragmented email/WhatsApp history.

## VF-04 — Sales, Intake & Proposal

Lifecycle:

`Enquiry → Identification → Requirements → Documents → Triage → Scope → Pricing → Proposal → Negotiation → Accepted`

Key components:
- ServiceCatalog
- Client intake
- Scope Engine
- Price calculation
- Proposal Generator
- qualification
- missing-information detection

## VF-05 — Contract & Commercial

Covers:
- proposals
- engagement letters
- contracts
- variations
- purchase orders
- payment terms
- claims/disputes
- renewals

Must include:
- commercial authority matrix
- contract states
- variation lifecycle
- auditable acceptance
- scope-to-contract traceability

## VF-06 — Project Operations

Project object connects:
- contract
- scope
- deliverables
- WBS
- tasks
- schedule
- resources
- documents
- communications
- QA
- risks
- variations
- milestones
- timesheets
- costs

Principles:
- WBS should be machine-readable.
- QA gates are first-class.
- Risks and scope changes must be structured.
- Project state should be deterministic.

## VF-07 — Finance, Accounting, Billing & Payments

Capabilities:
- chart of accounts
- general ledger
- AR/AP
- expenses
- invoicing
- reconciliation
- tax support
- cash flow
- reporting
- profitability

Project profitability should allocate:
- AI costs
- software
- payment fees
- specialist costs
- professional costs
- platform costs

## VF-08 — Documents, Knowledge & Client Portal

Capabilities:
- file classification
- extraction
- indexing
- version control
- document linking
- document controller
- structured knowledge
- knowledge graph
- client portal

Client portal supports:
- upload
- approvals
- comments
- signatures
- payment
- project workspace

Documents and structured knowledge must be distinct.
