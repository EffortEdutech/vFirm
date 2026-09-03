---
title: "OP-H1 to OP-H6 Controlled Multi-Firm Pilot Operations Sprint Plan"
version: "1.0"
status: "draft-for-product-owner-execution"
date: "2026-09-03"
scope: "Controlled local/private pilot operation for verified active firm workspaces"
---

# OP-H1 to OP-H6 Controlled Multi-Firm Pilot Operations Sprint Plan v1.0

## 1. Purpose

This plan turns accepted multi-tenant runtime binding into a controlled operating pilot for more than one firm workspace.

The goal is not to add a public marketplace or production onboarding. The goal is to prove that a human operator can run day-to-day Virtual Firm Platform operations for two verified active firm workspaces without confusing firm identity, subscription scope, records, workers, approvals, issues, evidence, or audit trails.

Reference pilot firms:

- Amanah Formwork Pilot Firm, a Formwork Engineering workspace;
- NHL Global Solution, an Organization Support workspace owned by Nur Hernieliana.

## 2. Governing acceptance

This OP plan is governed by:

- `MT_MULTI_TENANT_RUNTIME_BINDING_ACCEPTANCE_DECISION_v1.0.md`;
- `MT_H6_MULTI_TENANT_PILOT_REHEARSAL_AND_EVIDENCE_PACK_COMPLETION_v1.0.md`;
- `MT_MULTI_TENANT_WORKSPACE_RUNTIME_BINDING_CHECKLIST_v1.0.md`.

The accepted MT scope authorizes controlled local/private pilot operation of the Formwork pilot firm and NHL Global Solution as separate active firm workspaces.

## 3. Product boundary

This OP plan remains controlled local/private pilot operations hardening only.

It does not authorize:

- production multi-tenant onboarding;
- public marketplace;
- live matching;
- ranking;
- capacity allocation;
- VF-24 observatory publication;
- pricing intelligence;
- autonomous award;
- autonomous regulated approval;
- live payment movement;
- uncontrolled tenant or client data sharing;
- production legal, regulatory, insurance, or liability determination.

## 4. Pilot operating model

The pilot operator should be able to open the Virtual Firm Platform, select an active firm workspace, and run a bounded day-in-the-life operating loop:

`Select Firm -> Review Today -> Triage Work -> Progress Records -> Capture Evidence -> Request/Record Human Approval -> Handle Exceptions -> Export/Audit -> Close Pilot Day`

The loop must remain firm-scoped:

- every record belongs to a tenant and firm;
- every worker action is attributable;
- every approval is explicit and human-bound;
- every exception has an owner, status, and evidence trail;
- every pilot day can be reconstructed from logs and audit records.

## 5. Target operator outcomes

By the end of OP-H6, the controlled pilot operator should be able to:

1. select either verified pilot firm workspace;
2. see firm-specific readiness, priorities, exceptions, approvals, deadlines, pipeline, projects, and receivables;
3. run a pilot-day checklist for each firm;
4. progress front desk, administration, sales/accounts, project, invoice, ops, audit, and AI workforce activities inside the selected firm boundary;
5. run Formwork-specific technical delivery only in the Formwork pilot workspace;
6. run NHL organization-support work without presenting it as a Formwork Engineering workspace;
7. record human approvals and manual decisions explicitly;
8. log issues, incidents, support needs, and pilot observations;
9. collect evidence per firm and per pilot day;
10. export legally permissible pilot records and produce a closeout review.

## 6. Sprint sequence

### OP-H1 — Controlled Multi-Firm Pilot Operations Foundation

Prepare the operating foundation for a controlled multi-firm pilot day.

Deliverables:

- pilot operation scope contract;
- pilot operator roles and responsibilities;
- active-firm readiness model;
- pilot-day checklist data model;
- firm-scoped pilot activity log model;
- issue/incident/support log model;
- manual approval and exception categories;
- OP smoke/static validation.

Acceptance:

- OP scope is documented and bounded by MT acceptance;
- both pilot firms are named and classified correctly;
- pilot-day and activity-log records are explicitly tenant/firm scoped;
- no autonomous regulated approval or live payment movement is introduced.

### OP-H2 — Operator Dashboard and Today View

Make the selected firm show a practical pilot operations view.

Deliverables:

- selected-firm pilot readiness card;
- today priorities view;
- approvals and exceptions summary;
- deadlines, project status, pipeline, and receivables summary;
- per-firm pilot-day checklist UI or API contract;
- negative checks for cross-firm dashboard leakage.

Acceptance:

- selecting Formwork shows Formwork pilot readiness and technical approval exposure;
- selecting NHL shows organization-support readiness and service delivery exposure;
- dashboard data and copy are selected-firm scoped;
- not-subscribed modules do not appear as active operational work.

### OP-H3 — Formwork Pilot Day Rehearsal

Run a controlled Formwork Engineering pilot-day rehearsal.

Deliverables:

- Formwork pilot-day fixture;
- enquiry/project/drawing/QA/approval scenario;
- technical issue blocked until valid human professional approval exists;
- evidence trail and export sample;
- smoke test for Formwork pilot-day reconstruction.

Acceptance:

- Formwork Technical Delivery is available only in the Formwork workspace;
- regulated output remains blocked without explicit human professional approval;
- drawing/QA/evidence records can be reconstructed from audit;
- no AI worker silently approves regulated work.

### OP-H4 — NHL Global Solution Pilot Day Rehearsal

Run a controlled NHL organization-support pilot-day rehearsal.

Deliverables:

- NHL pilot-day fixture;
- project reporting, technical writing, clerical work, and BizKick EDCS scenario;
- proposal/task/document/correspondence flow;
- human review gate for AI-generated client-facing output;
- invoice/receivable monitoring without live payment movement;
- smoke test for NHL pilot-day reconstruction.

Acceptance:

- NHL workspace does not present Formwork Technical Delivery as subscribed;
- NHL services, copy, workers, and records follow the organization-support profile;
- client-facing output requires human review before issue;
- invoice status can be monitored, but payment action remains manual/non-autonomous.

### OP-H5 — Pilot Evidence, Audit, Export, and Closeout Review

Prepare the pilot evidence pack and closeout review mechanism.

Deliverables:

- firm-scoped evidence pack template;
- pilot-day closeout review template;
- audit reconstruction checklist;
- legally permissible export checklist;
- unresolved issue/backlog classification;
- privacy and redaction notes for pilot evidence.

Acceptance:

- each pilot firm has separate evidence and closeout records;
- audit can reconstruct material business and AI-worker actions;
- exports are scoped to the selected tenant/firm;
- unresolved findings are classified into backlog, blocker, accepted limitation, or out-of-scope.

### OP-H6 — Controlled Multi-Firm Pilot Operations Acceptance Gate

Prepare the product-owner acceptance gate for OP pilot operations readiness.

Deliverables:

- OP evidence pack completion document;
- OP acceptance decision gate;
- full regression update;
- decision register update;
- next-scope recommendation.

Acceptance:

- OP-H1 through OP-H5 evidence is complete;
- both pilot firms can complete a controlled pilot-day rehearsal;
- no cross-tenant leakage is observed in the OP evidence;
- locked boundaries remain visible;
- product owner can choose accept, hold, or reject OP readiness.

## 7. Recommended execution order

1. OP-H1 — Controlled Multi-Firm Pilot Operations Foundation.
2. OP-H2 — Operator Dashboard and Today View.
3. OP-H3 — Formwork Pilot Day Rehearsal.
4. OP-H4 — NHL Global Solution Pilot Day Rehearsal.
5. OP-H5 — Pilot Evidence, Audit, Export, and Closeout Review.
6. OP-H6 — Controlled Multi-Firm Pilot Operations Acceptance Gate.

## 8. Completion definition

The OP hardening pass is complete when a human operator can run a controlled pilot day for both Amanah Formwork Pilot Firm and NHL Global Solution, keep their records and evidence separate, preserve human approval boundaries, export permissible records, and present a closeout pack suitable for product-owner acceptance.

## 9. Next active sprint after this plan

After product-owner acceptance of this plan and checklist, the next active sprint is:

`OP-H1 — Controlled Multi-Firm Pilot Operations Foundation`
