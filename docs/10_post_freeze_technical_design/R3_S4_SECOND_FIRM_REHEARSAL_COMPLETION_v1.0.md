---
id: VFIRM-R3-S4-SECOND-FIRM-REHEARSAL-COMPLETION
title: "R3-S4 Second-Firm Rehearsal Completion"
version: "1.0"
status: "COMPLETED"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
release: "Release 3"
sprint: "R3-S4 — Second-Firm Rehearsal"
completed_on: "2026-08-29"
---

# R3-S4 Second-Firm Rehearsal Completion v1.0

## 1. Completion decision

R3-S4 is completed for controlled local Virtual Firm Factory development.

The sprint proves that a second Virtual Firm can be provisioned from a Firm Blueprint, certified through pack binding gates, and operated through the existing solopreneur firm modules without hand-building a one-off firm.

This is not a staging deployment, public marketplace, autonomous professional service, or Release 4 approval.

## 2. Scope completed

R3-S4 adds an executable second-firm rehearsal that proves:

- a first direct firm still runs a minimal regression path;
- a second firm is provisioned through the Virtual Firm Factory;
- the second firm receives certified pack/service activation before operations;
- the second firm runs front desk enquiry capture, qualification, communication draft, and handoff;
- the second firm maintains client, project, task, document, revision, correspondence, and deadline records;
- the second firm prepares, approves, dispatches, and accepts a proposal through explicit states;
- unapproved proposal dispatch is denied;
- technical drawing review, deterministic calculation input validation, QA finding, and delivery package readiness are exercised;
- unresolved high QA findings block technical delivery package readiness;
- system/silent QA resolution is denied;
- human professional resolution enables a separate ready-for-principal-review package;
- deliverable issue requires evidence and professional review approval;
- invoice issue happens only after deliverable issue;
- receivable follow-up remains a draft requiring human review and does not send or trigger payment action;
- daily operations exposes priorities, exceptions, approvals, deadlines, pipeline/cash state, and audit counts;
- event and audit records reconstruct material business and AI-worker-boundary actions;
- legally permissible export includes business records, Factory records, pack certification records, event log, and audit records;
- cross-tenant export access is denied.

## 3. Executable artifact

R3-S4 adds:

- `scripts/smoke-r3-second-firm-rehearsal.mjs`

Package scripts added/updated:

- `npm run check:r3:s4`
- `npm run check:r3`
- `npm run check:r3:postgres`
- `npm run check`

## 4. Evidence checked by the smoke

The R3-S4 smoke checks these business surfaces:

- Factory blueprint and provisioning records;
- pack binding certification and service activation records;
- front desk enquiry and communication records;
- client and firm-client relationship records;
- intake, proposal, approval, dispatch, engagement, project, work package, and task records;
- correspondence, document register, and revision records;
- calculation input set and drawing review records;
- QA finding and delivery package records;
- deliverable draft, review approval, and issue records;
- invoice and receivable follow-up records;
- daily operations cockpit summary;
- event log and audit events;
- legally permissible export package.

## 5. Authority and governance controls proven

R3-S4 preserves the frozen architecture principles:

- The client-facing service runs through the Virtual Firm, not through an AI worker.
- The provisioned firm's Virtual Principal is the human authority for certification and professional review.
- AI worker bindings do not grant professional certification, regulated issue, payment instruction, or silent approval authority.
- Regulated technical delivery remains blocked until deterministic checks and valid human professional actions exist.
- Receivable monitoring drafts communication only; it does not perform autonomous payment action.
- Tenant isolation is verified by denying another tenant's export attempt.

## 6. Verification evidence

Commands executed successfully:

- `node --check scripts/smoke-r3-second-firm-rehearsal.mjs`
- `npm run check:r3:s4`
- `npm run check:r3:postgres`

Observed smoke results:

- `R3-S4 Second-Firm Rehearsal smoke passed (json).`
- `R3-S4 Second-Firm Rehearsal smoke passed (postgres).`

## 7. Carry-over to R3-S5

R3-S4 does not close the Factory hardening gate. R3-S5 must concentrate the negative cases into a hardened denial suite:

- missing Virtual Principal;
- missing responsible professional;
- invalid credential;
- invalid jurisdiction pack;
- unsafe worker authority;
- approval-bypass workflow;
- incompatible pack binding;
- unapproved blueprint provisioning;
- duplicate provisioning without new version/new blueprint;
- cross-tenant leakage across blueprint, provisioning, worker-binding, audit, and export access.

## 8. Decision

R3-S4 may hand off to R3-S5.

R3-S5 must treat R3-S4's successful second-firm rehearsal as the positive baseline and then prove the Factory refuses unsafe or unauthorized variants.