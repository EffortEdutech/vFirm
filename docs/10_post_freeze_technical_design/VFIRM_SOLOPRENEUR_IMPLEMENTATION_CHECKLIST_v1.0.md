---
id: VFIRM-SOLOPRENEUR-IMPLEMENTATION-CHECKLIST
title: "vFirm Solopreneur Implementation Checklist"
version: "1.0"
status: "Active Implementation Control"
---

# vFirm Solopreneur Implementation Checklist v1.0

This checklist governs the approved solopreneur scope expansion. The older implementation checklist is historical evidence for the original MVP build.

## Cross-cutting controls

- [x] Architecture Baseline v1.0 remains frozen.
- [x] Virtual Principal retains professional, issue, price, scope, and consequential commercial authority.
- [x] Starter workers have manifests, tool allowlists, budgets, risk limits, and forbidden actions.
- [x] New records and commands are tenant- and firm-scoped and attributable.
- [x] Workflow state changes are deterministic and audited.
- [x] External tools remain optional behind vFirm-owned interfaces.
- [ ] Define versioned Skill Binding schema and compiler validation.
- [ ] Bind authored role/worker skills only after schema and authority validation.
- [ ] Add runtime model/provider binding with replaceable adapters.
- [x] Add tenant data export coverage for all solopreneur records.

## SF-S1 — Firm Shape and Workspace

- [x] Define one operable Formwork Engineering solopreneur firm.
- [x] Define Front Desk, Administration, Accounts, Marketing/Sales, Technical Drawing, and Project Coordination modules.
- [x] Add bounded worker templates.
- [x] Add My Firm workspace and module provisioning controls.
- [x] Preserve worker review and authority boundaries.

## SF-S2 — Front Desk and Client Pipeline

- [x] Add pre-client enquiry record and inbox.
- [x] Add source, contact, organization, service hint, urgency, and summary capture.
- [x] Add deterministic qualification states.
- [x] Require consent/legal basis before qualification.
- [x] Require cleared conflict prompt before qualification and handoff.
- [x] Add human-review-required communication drafts.
- [x] Prevent any implication that a draft was sent.
- [x] Handoff qualified enquiries into Client, Relationship, Lead, and Intake records.
- [x] Preserve Formwork missing-information controls.
- [x] Emit attributable Front Desk events and audit records.
- [x] Add tenant-filtered read endpoints and Front Desk workspace.
- [x] Add dedicated PostgreSQL enquiry and communication tables before staging/multi-instance use.
- [ ] Add explicit human approval/send command when a real communication provider is introduced.
- [x] Complete SF-S2 acceptance smoke and full regression.

## SF-S3 — Administration and Document Control

- [x] Bind versioned Administration Clerk role/worker skills to schemas, permissions, supervisor, and forbidden actions.
- [x] Add correspondence register with optional client/project filing references.
- [x] Add document intake, classification, and unique firm document numbers.
- [x] Add immutable revision register with deterministic supersession.
- [x] Add deadlines, assignment references, follow-up visibility, and explicit completion.
- [x] Add principal-review-required transmittal drafts with no issue command.
- [x] Add tenant/firm-scoped PostgreSQL persistence and migrations.
- [x] Add Administration workspace controls and registers.
- [x] Keep formal instruction, approval, and external issue outside Administration Clerk authority.
- [x] Evaluate Marker/Chunky against current scope: deferred until representative pilot documents prove a conversion/chunking gap.
- [x] Complete SF-S3 acceptance smoke, full regression, and completion record.

## SF-S4 — Sales, Proposals, and Accounts

- [x] Bind Marketing/Sales and Accounts Clerk skills to typed schemas and authority envelopes.
- [x] Add unified opportunity pipeline and deterministic stages.
- [x] Reuse existing proposal and pricing preparation.
- [x] Require existing principal commercial approval before proposal dispatch.
- [x] Add attributable human proposal dispatch and duplicate-dispatch denial.
- [x] Preserve client acceptance for approved legacy and sent proposals.
- [x] Add expense preparation and human principal approval without payment execution.
- [x] Add review-only receivable follow-up drafts without sending.
- [x] Add deterministic invoice, receipt, expense, outstanding, and projected cash snapshot.
- [x] Keep invoice issue, payment approval, and bank instructions human-controlled.
- [x] Add tenant/firm-scoped PostgreSQL persistence and migration 0018.
- [x] Complete SF-S4 full regression and completion record.

## SF-S5 — Technical Drawing and Delivery Support

- [x] Bind Technical Drawing Assistant and Formwork QA skills to schemas and non-authoritative envelopes.
- [x] Add same-document drawing revision comparison contract with immutable revision references.
- [x] Add deterministic Formwork input validation without producing engineering conclusions.
- [x] Add attributable QA findings and human-principal-only resolution.
- [x] Block delivery readiness on invalid inputs, stale drawings, missing evidence, or open HIGH/CRITICAL findings.
- [x] Limit assembly to `READY_FOR_PRINCIPAL_REVIEW`; do not expose approval or issue in the SF-S5 surface.
- [x] Add tenant/firm-scoped PostgreSQL persistence and migration 0019.
- [x] Verify JSON/PostgreSQL flows, authority denial, tenant isolation, and audit events.
- [x] Complete SF-S5 regression and completion record; retain no direct LLM-to-regulated-final path.

## SF-S6 — Daily Operations and Pilot Handoff

- [x] Today view, exceptions, workload, deadlines, approvals, pipeline, projects, and cash.
- [x] Representative working-week rehearsal.
- [x] Operator handbook and controlled pilot handoff.
- [x] Record SF-S6 acceptance before defining another sprint.
