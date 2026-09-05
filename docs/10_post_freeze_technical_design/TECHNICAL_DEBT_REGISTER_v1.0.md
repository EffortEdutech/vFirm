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

Status: CODE COMPLETE, AWAITING LIVE POSTGRES VERIFICATION (Phase B, 2026-09-05)

AWIA virtual staff (provisioning, lifecycle, memory, conversation, seat billing, department dashboards, multi-firm templates) previously only persisted correctly under `VFIRM_STORE_BACKEND=json`. Two concrete gaps blocked staging cutover:

- No `awia_*` table was defined in `infra/database/schema.sql` or `infra/database/migrations/*.sql`.
- Every AWIA store.mjs function generated record ids via an unconditional `newId(prefix)` (a prefixed non-uuid string), instead of the `isPostgresStore()`-aware id scheme already used elsewhere in the file. These ids did not satisfy uuid-typed Postgres columns even where a schema existed, which was also why AWIA's audit_events/event_log entries were silently dropped (found during the Phase A pilot day, see `AWIA_PILOT_DAY_PHASE_A_AUTHORIZATION_AND_DRY_RUN_RESULT_v1.0.md` v1.1 section 4).

Resolution implemented (Phase B):

- `infra/database/migrations/0024_awia_virtual_staff_persistence.sql` adds real Postgres tables for all 17 `awia_*` collections (uuid primary key, tenant/firm foreign keys, the full application record kept as `record jsonb` for exact round-tripping) — validated by `npm run db:migrate` (schema-shape check passed, 29 migration files).
- `apps/api/src/store.mjs`: the 10 AWIA record-id call sites that used an unconditional `newId(prefix)` now follow the existing backend-aware pattern (`storeBackend === "postgres" ? newUuid() : newId(prefix)`).
- Six provisioning-identity collections (seats, members, role assignments, package bindings, lifecycle events, provisioning runs) keep their deterministic natural-key ids on both backends by design (idempotent re-provisioning depends on it, e.g. `agent-<firm_id>-cfo-001`) — a new `deterministicUuid(seed)` helper gives these a stable Postgres surrogate key and a stable audit/event `aggregate_id`, without changing the natural key the rest of the codebase already reads and writes.
- `stripRelationalCollections` now strips the 17 `awia_*` collections from the JSONB `app_state` blob (superseding the Phase A stopgap that kept them there), and `savePostgresStore`/`loadPostgresStore` write/read them through the new tables via `persistAwiaVirtualStaffFromStore` / `readAwiaVirtualStaffRelational`.
- Full `check:awia:*` smoke suite re-run against the JSON backend: 11 of 13 pass; the 2 failures (`check:awia:vs:s2`, `check:awia:vs:s5`) reproduce identically on the pre-Phase-B commit (verified via `git stash`), so they are pre-existing and unrelated to this change, not regressions.

Outstanding before this can close:

- Live verification against a running Postgres instance (`npm run db:migrate:docker` to apply migration 0024, then re-run `check:awia:*` and a pilot-day-style live UI pass with `VFIRM_STORE_BACKEND` resolved to `postgres`) has not yet been done — the coding agent's sandbox has no network path to the developer's local Postgres container, so this step needs to be run on the developer's machine.
- Once verified, flip `GET /awia/virtual-staff/staging-readiness` (`AWIA_STAGING_PREPARATION_COMPLETION_v1.0.md`) from `NOT_READY_FOR_STAGING_BACKEND_MIGRATION_REQUIRED` and close this entry.

Target sprint: AWIA staging cutover sprint (Phase B of `VFIRM_AWIA_HIRE_A_VIRTUAL_WORKER_UNIFIED_SPRINT_PLAN_AND_CHECKLIST_v1.0.md`).
