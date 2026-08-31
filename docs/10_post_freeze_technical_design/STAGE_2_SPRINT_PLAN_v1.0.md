---
id: VF-STAGE-2-SPRINT-PLAN
title: "Stage 2 Sprint Plan"
version: "1.0"
status: "Active Implementation Control"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Stage 2 Sprint Plan v1.0

## Sprint Rule

Each sprint must leave the MVP loop runnable. If a change breaks the loop, fixing it takes priority over new scope.

## Sprint 2.0 â€” Stabilization and Documentation Control

Status: complete.

Goals:

- formalize Stage 2 strategy;
- document future stages;
- create implementation checklist and debt register;
- preserve known decisions and risks.

Checklist:

- [x] Stage 2 implementation strategy created.
- [x] Stage roadmap created.
- [x] Sprint plan created.
- [x] Implementation checklist created.
- [x] Technical debt register created.
- [x] README/index updated.

Exit criteria:

- team knows what to build next and why.

## Sprint 2.1 â€” Relational Read/List/Detail API

Goals:

- stop depending on `/mvp/store` for normal UI reads;
- expose clean read APIs.

Endpoints:

- [x] `GET /tenants`
- [x] `GET /tenants/:id`
- [x] `GET /firms`
- [x] `GET /firms/:id`
- [x] `GET /clients`
- [x] `GET /clients/:id`
- [x] `GET /intake-sessions`
- [x] `GET /intake-sessions/:id`
- [x] `GET /proposals`
- [x] `GET /proposals/:id`
- [x] `GET /projects`
- [x] `GET /projects/:id`
- [x] `GET /invoices`
- [x] `GET /invoices/:id`
- [x] `GET /audit-events`
- [x] `GET /event-log`

Exit criteria:

- web screens can read from entity endpoints instead of store dumps.

## Sprint 2.2 â€” Web Workspace Relational Integration

Goals:

- connect workspace tabs to read/list/detail endpoints;
- reduce raw JSON dependency;
- improve operator clarity.

Checklist:

- [x] Dashboard reads summary endpoint.
- [x] Clients tab has list/detail.
- [x] Intake tab has list/detail.
- [x] Proposals tab has list/detail/actions.
- [x] Projects tab has list/detail/actions.
- [x] Approvals tab reads approvals.
- [x] Invoices tab reads invoices.
- [x] Audit tab reads audit/events.

Exit criteria:

- an early tester can operate the MVP through the UI.

## Sprint 2.3 â€” Service Catalogue and Formwork Service Pack Records

Goals:

- replace temporary UUID service references;
- make `VF-SP-001` a proper relational service-pack record.

Checklist:

- [x] Add service catalogue migration.
- [x] Add service pack table or equivalent.
- [x] Seed Formwork service pack.
- [x] Link intake/proposals/projects to service record.
- [x] Update API and tests.

Exit criteria:

- no temporary service UUID workaround remains in normal MVP flow.

## Sprint 2.4 â€” Migration and Store Cleanup

Goals:

- reduce `app_state` to legacy compatibility or remove from normal PostgreSQL path.

Checklist:

- [x] Add migration history/version table.
- [x] Review `app_state` use.
- [x] Keep JSON fallback as explicit dev mode.
- [x] Ensure relational mode does not depend on app_state.
- [x] Add database smoke test script.

Exit criteria:

- PostgreSQL mode is cleanly relational.

## Sprint 2.5 â€” API Contract Hardening

Goals:

- make command/read contracts clearer for frontend and future generated clients.

Checklist:

- [x] Formalize request/response schemas.
- [x] Add endpoint validation.
- [x] Add consistent error codes.
- [x] Add API fixture tests.
- [x] Add command idempotency plan.

Exit criteria:

- API is ready for serious UI expansion.

## Sprint 2.6 â€” Stage 2 Exit Review

Goals:

- confirm Stage 2 is ready to close;
- prepare Stage 3 backlog.

Checklist:

- [ ] Full MVP workflow green.
- [ ] PostgreSQL relational mode green.
- [ ] JSON fallback green.
- [ ] Web/API smoke green.
- [ ] Known technical debt documented.
- [ ] Stage 3 backlog approved.

Exit criteria:

- Stage 2 marked complete.


## Sprint 2.1-2.5 Completion Note — 2026-08-25

Sprint 2.1 through Sprint 2.5 have been implemented through the local MVP codebase:

- entity list/detail endpoints are available for the main MVP resources and ledgers;
- dashboard summary endpoint is available at `GET /dashboard/summary`;
- web workspace now reads resource endpoints first and falls back to `/mvp/store` only for local compatibility;
- Formwork `VF-SP-001` is seeded as a relational service pack with a service SKU;
- `schema_migrations` records migration filename/checksum history;
- API contracts now include implemented MVP command/read endpoints, response envelope, and idempotency plan;
- validation covers API workflow, read endpoints, web shell, web/API integration, and PostgreSQL schema/seed smoke.
