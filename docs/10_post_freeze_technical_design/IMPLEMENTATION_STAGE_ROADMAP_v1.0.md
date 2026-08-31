---
id: VF-IMPLEMENTATION-STAGE-ROADMAP
title: "vFirm Implementation Stage Roadmap"
version: "1.0"
status: "Active Implementation Control"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# vFirm Implementation Stage Roadmap v1.0

## Stage Overview

| Stage | Name | Outcome |
|---|---|---|
| Stage 0 | Architecture Baseline | Frozen v1.0 documentation and doctrine. |
| Stage 1 | Local MVP Operating Loop | Runnable web/API shell with complete demo workflow. |
| Stage 2 | Persistent MVP Service Foundation | PostgreSQL-backed MVP workflow and development control. |
| Stage 3 | Productized MVP Workspace | Real list/detail screens, service catalogue, and operator-ready workflow. |
| Stage 4 | Trust, Identity, and Governance | Authentication, tenant membership, roles, authority, and policy enforcement. |
| Stage 5 | Service Delivery Engine | Work packages, evidence, document lifecycle, review, and professional approval depth. |
| Stage 6 | Commercial Operations | Proposal, engagement, billing, invoice, payment, and commercial controls. |
| Stage 7 | AI Workforce Runtime | Governed AI worker identities, assignments, budgets, tools, and audit. |
| Stage 8 | Marketplace and Network Layer | Service-pack marketplace, capacity, collaboration, federation, and observatory preparation. |
| Stage 9 | Production Readiness | Deployment, security, observability, backups, migration discipline, and release operations. |

## Stage 0 — Architecture Baseline

Status: complete.

Purpose:

- freeze Virtual Firm Master Architecture v1.0;
- clarify VF-00 through VF-24;
- establish doctrine, governance, schemas, events, and policy foundation.

Exit criteria:

- baseline frozen;
- document register clean;
- canonical schema, event, and policy catalogues created.

## Stage 1 — Local MVP Operating Loop

Status: complete.

Purpose:

- prove the first vertical business loop;
- provide a web/API shell;
- use local persistence while the workflow shape is tested.

Exit criteria:

- local web and API run on `309#` ports;
- demo loop creates tenant, firm, client, intake, proposal, approval, project, evidence, invoice;
- smoke tests pass.

## Stage 2 — Persistent MVP Service Foundation

Status: active.

Purpose:

- convert MVP persistence to PostgreSQL;
- establish implementation strategy, sprint plan, checklist, and technical debt control;
- prepare for real product screens and read endpoints.

Major work:

- PostgreSQL Docker setup;
- migration runner;
- relational store conversion;
- event/audit/policy ledger;
- API and web smoke tests;
- implementation control documentation.

Exit criteria:

- full MVP loop persists relationally;
- `app_state` is compatibility-only;
- read/list/detail endpoint plan is ready;
- Stage 3 backlog is clear.

## Stage 3 — Productized MVP Workspace

Purpose:

- turn the current workflow shell into a usable workspace;
- replace store dumps with proper entity views;
- make the MVP understandable to operators and early testers.

Major work:

- dashboard metrics from relational endpoints;
- Clients list/detail;
- Intake list/detail;
- Proposals list/detail/actions;
- Projects list/detail/actions;
- Approvals list;
- Invoices list/detail;
- Audit event viewer;
- service catalogue table and Formwork service pack records.

Exit criteria:

- user can operate the MVP without relying on raw JSON;
- every major screen reads from API endpoints;
- Formwork service pack is selectable and traceable.

## Stage 4 — Trust, Identity, and Governance

Purpose:

- introduce real users, memberships, roles, authority, and tenant boundaries.

Major work:

- authentication provider decision;
- tenant membership model;
- role/permission model;
- professional authority model;
- policy middleware;
- protected API endpoints;
- user-aware audit trail.

Exit criteria:

- no anonymous privileged workflow actions;
- policy denies unauthorized cross-tenant access;
- approvals require valid authority context.

## Stage 5 — Service Delivery Engine

Purpose:

- deepen the project/work package/task/evidence lifecycle.

Major work:

- task assignment lifecycle;
- evidence bundle completeness checks;
- document version lifecycle;
- review and approval gates;
- Formwork-specific deliverable structure;
- professional issue/revision flow.

Exit criteria:

- service delivery is more than a demo task;
- evidence, review, and approval states are explicit;
- issued output cannot bypass required gates.

## Stage 6 — Commercial Operations

Purpose:

- mature proposals, pricing, engagement, billing, invoice, and payment states.

Major work:

- price build-up model;
- proposal versioning;
- engagement terms;
- invoice numbering rules;
- payment status;
- commercial audit and reporting.

Exit criteria:

- commercial workflow can support real pilot transactions;
- invoices and proposal states are auditable and queryable.

## Stage 7 — AI Workforce Runtime

Purpose:

- introduce governed AI worker participation without weakening human professional authority.

Major work:

- AI worker identities;
- task assignment to AI workers;
- tool/budget/risk limits;
- AI output evidence capture;
- human review gates;
- AI action audit.

Exit criteria:

- AI workers can assist but not silently approve;
- all AI activity is attributable, bounded, and reviewable.

## Stage 8 — Marketplace and Network Layer

Purpose:

- prepare the platform for multiple service packs, firms, capacity, collaboration, and observatory data.

Major work:

- service-pack catalogue;
- service-pack publishing workflow;
- provider/federation model;
- capacity and demand signals;
- benchmarking event model;
- observatory-ready analytics.

Exit criteria:

- platform can host more than one service pack;
- network data can be collected safely from operational events.

## Stage 9 — Production Readiness

Purpose:

- make vFirm deployable, observable, secure, and recoverable.

Major work:

- deployment target;
- environment strategy;
- secrets management;
- database migration discipline;
- backups and restore tests;
- observability;
- rate limiting;
- security review;
- release checklist.

Exit criteria:

- production deployment can be operated responsibly;
- rollback and recovery paths are documented and tested.

