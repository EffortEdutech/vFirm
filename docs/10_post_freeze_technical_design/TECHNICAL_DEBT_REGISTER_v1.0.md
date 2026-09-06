---
id: VF-TECHNICAL-DEBT-REGISTER
title: "vFirm Technical Debt Register"
version: "1.0"
status: "Active Implementation Control"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# vFirm Technical Debt Register v1.0

## Debt Status Legend

- OPEN â€” not yet resolved.
- ACTIVE â€” currently being worked.
- WATCH â€” acceptable for now, monitor.
- CLOSED â€” resolved.

## TD-001 â€” Temporary Service UUIDs

Status: CLOSED

The architecture uses service pack codes like `VF-SP-001`, but some current SQL columns use UUID references for `service_id` and `service_sku_id`.

Current mitigation:

- relational code uses UUID/null where required;
- Formwork business code remains in service-pack configuration.

Required resolution:

- add service catalogue/service pack relational tables;
- seed `VF-SP-001`;
- link intake/proposal/project records to real service catalogue IDs.

Target sprint: 2.3

## TD-002 â€” `app_state` Compatibility Table

Status: WATCH

`app_state` was introduced as a transitional JSONB store while relational conversion was underway.

Current state:

- primary MVP entities are relational;
- event/audit/policy ledger is relational;
- `app_state` should no longer be primary persistence in PostgreSQL mode.

Required resolution:

- audit remaining runtime dependency;
- keep only as explicit compatibility/dev support or remove from normal PostgreSQL flow.

Target sprint: 2.4

## TD-003 â€” No Migration Version Table

Status: CLOSED

The migration runner applies SQL files but does not record migration history in the database.

Required resolution:

- add migration version table;
- record applied migration filename/checksum/timestamp;
- avoid reapplying all migrations blindly.

Target sprint: 2.4

## TD-004 â€” Limited Read API

Status: CLOSED

The API has command endpoints and `/mvp/store`, but does not yet expose proper list/detail endpoints for all entities.

Required resolution:

- add entity read endpoints;
- update web UI to use them;
- reduce dependence on store-shaped response.

Target sprint: 2.1 and 2.2

## TD-005 â€” Weak Runtime Validation

Status: WATCH

API handlers currently use simple required-field checks.

Required resolution:

- add schema validation for command bodies;
- align validation with API contract fixtures;
- standardize validation error responses.

Target sprint: 2.5

## TD-006 â€” No Production Auth

Status: OPEN

The MVP uses system/body actors and has no production authentication layer.

Required resolution:

- select auth provider;
- implement tenant membership;
- enforce actor identity and authority;
- connect approvals to real professional authority.

Target stage: 4

## TD-007 â€” Policy Authority Not Database-Backed

Status: OPEN

Approval policy currently accepts a provided context flag for professional authority validity.

Required resolution:

- store professional authority records;
- query authority during approval;
- deny approval if authority is missing/expired/out of scope.

Target stage: 4

## TD-008 â€” UI Still Prototype-Level

Status: OPEN

The web shell demonstrates workflow, but it is not yet a polished operator workspace.

Required resolution:

- add list/detail routes;
- improve forms and validation;
- add status empty/error/loading states;
- improve audit and project views.

Target stage: 3


## Resolution Notes — 2026-08-25

- TD-001 closed by `0003_service_catalogue.sql`, seeded Formwork `VF-SP-001`, and fixed UUID service references in the MVP flow.
- TD-003 closed by `schema_migrations` and the history-aware migration runner.
- TD-004 closed by entity list/detail endpoints and web resource-endpoint integration.
- TD-005 moved to WATCH: Sprint 2.5 now has consistent response envelopes, contract catalogue, required-field validation, and API fixture smoke tests. Full generated schema validation remains a later hardening improvement before external API exposure.

## TD-009 — AWIA Virtual Staff Not Yet Postgres/Staging Ready

Status: CLOSED (Phase B, 2026-09-06 -- verified live against a real Postgres backend)

AWIA virtual staff (provisioning, lifecycle, memory, conversation, seat billing, department dashboards, multi-firm templates) previously only persisted correctly under `VFIRM_STORE_BACKEND=json`. Two concrete gaps blocked staging cutover:

- No `awia_*` table was defined in `infra/database/schema.sql` or `infra/database/migrations/*.sql`.
- Every AWIA store.mjs function generated record ids via an unconditional `newId(prefix)` (a prefixed non-uuid string), instead of the `isPostgresStore()`-aware id scheme already used elsewhere in the file. These ids did not satisfy uuid-typed Postgres columns even where a schema existed, which was also why AWIA's audit_events/event_log entries were silently dropped (found during the Phase A pilot day, see `AWIA_PILOT_DAY_PHASE_A_AUTHORIZATION_AND_DRY_RUN_RESULT_v1.0.md` v1.1 section 4).

Resolution implemented (Phase B):

- `infra/database/migrations/0024_awia_virtual_staff_persistence.sql` adds real Postgres tables for all 17 `awia_*` collections (uuid primary key, tenant/firm foreign keys, the full application record kept as `record jsonb` for exact round-tripping) — validated by `npm run db:migrate` (schema-shape check passed, 29 migration files).
- `apps/api/src/store.mjs`: the 10 AWIA record-id call sites that used an unconditional `newId(prefix)` now follow the existing backend-aware pattern (`storeBackend === "postgres" ? newUuid() : newId(prefix)`).
- Six provisioning-identity collections (seats, members, role assignments, package bindings, lifecycle events, provisioning runs) keep their deterministic natural-key ids on both backends by design (idempotent re-provisioning depends on it, e.g. `agent-<firm_id>-cfo-001`) — a new `deterministicUuid(seed)` helper gives these a stable Postgres surrogate key and a stable audit/event `aggregate_id`, without changing the natural key the rest of the codebase already reads and writes.
- `stripRelationalCollections` now strips the 17 `awia_*` collections from the JSONB `app_state` blob (superseding the Phase A stopgap that kept them there), and `savePostgresStore`/`loadPostgresStore` write/read them through the new tables via `persistAwiaVirtualStaffFromStore` / `readAwiaVirtualStaffRelational`.
- Full `check:awia:*` smoke suite re-run against the JSON backend: 11 of 13 pass; the 2 failures (`check:awia:vs:s2`, `check:awia:vs:s5`) reproduce identically on the pre-Phase-B commit (verified via `git stash`), so they are pre-existing and unrelated to this change, not regressions.

Live verification (2026-09-06): the developer applied migration 0024 with `npm run db:migrate:docker` (17 tables + 34 indexes created) and restarted the dev server onto the Postgres backend. Live-driven through the running API (not a script) against the Amanah Formwork Pilot Firm:

- `GET /awia/virtual-staff/staging-readiness` now returns `current_backend: "postgres"`, `postgres_schema_has_awia_tables: true`, `awia_record_ids_backend_aware: true`, zero findings, and `recommendation: "READY_FOR_STAGING_CUTOVER_REHEARSAL"` — flipped from `NOT_READY_FOR_STAGING_BACKEND_MIGRATION_REQUIRED` as required. (This readiness check itself had a second, separate bug found and fixed in the same pass: it previously reported a hardcoded `AWIA_RECORD_IDS_NOT_BACKEND_AWARE` finding unconditionally and read `current_backend` from an unset env var instead of the resolved store backend — both replaced with real checks in `apps/api/src/server.mjs`.)
- A full provision -> activate -> assign -> produce -> review -> prepare-client-draft cycle run against Postgres produced real relational rows in the new `awia_*` tables (e.g. a workdesk item and output draft both landed with genuine random UUIDs, not prefixed strings) and, critically, real `audit_events`/`event_log` rows for all 5 runtime event types (`lifecycle_updated`, `task_assigned`, `output_drafted`, `output_reviewed`, `client_delivery_draft_prepared`) — the exact entries Phase A found silently missing. `final_issue_allowed: false` held throughout, as required.
- One caveat surfaced during this verification, worth recording: the audit/event write also requires the calling actor's `actor_id` to be a real UUID from the `actors` table (`actor_id uuid not null references actors(id)`) — an initial verification pass using a placeholder dev actor id correctly produced zero AWIA audit rows for that reason, not because of an AWIA-specific defect. The real pilot-day UI already resolves a real actor (`contract.principal`) via `afccContext()` in `apps/web/public/app.js`, so this does not affect the actual application flow; it only affects hand-written API calls that skip the UI's actor resolution.

Target sprint: closed. Superseded by Phase C (`OP_H1_TO_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_SPRINT_PLAN_v1.0.md`) and Phase D (`VFIRM_RELEASE_4_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md`) in `VFIRM_AWIA_HIRE_A_VIRTUAL_WORKER_UNIFIED_SPRINT_PLAN_AND_CHECKLIST_v1.0.md`.
