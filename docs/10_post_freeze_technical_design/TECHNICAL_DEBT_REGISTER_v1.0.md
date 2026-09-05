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

Status: OPEN

AWIA virtual staff (provisioning, lifecycle, memory, conversation, seat billing, department dashboards, multi-firm templates) currently only persists correctly under `VFIRM_STORE_BACKEND=json`. Two concrete gaps block staging cutover:

- No `awia_*` table is defined in `infra/database/schema.sql` or `infra/database/migrations/*.sql`.
- Every AWIA store.mjs function generates record ids via an unconditional `newId(prefix)` (a prefixed non-uuid string), instead of the `isPostgresStore()`-aware id scheme already used elsewhere in the file. These ids would not satisfy uuid-typed Postgres columns even once a schema exists.

Current mitigation:

- controlled local/private pilot operation is unaffected (JSON store backend only, matching the AWIA_CONTROLLED_LOCAL_PILOT_ACCEPTANCE_LOCK_v1.0.md scope);
- a live readiness check is available at `GET /awia/virtual-staff/staging-readiness` (see `AWIA_STAGING_PREPARATION_COMPLETION_v1.0.md`) that reports this gap and returns `NOT_READY_FOR_STAGING_BACKEND_MIGRATION_REQUIRED` until it is closed.

Required resolution:

- add a Postgres migration covering all 16 `awia_*` collections with uuid-typed primary keys and tenant/firm foreign keys matching the existing schema convention;
- switch every AWIA store.mjs id generation call to the existing backend-aware pattern;
- re-run `npm run check:db:postgres` and the full `check:awia:*` suite against a live staging Postgres instance before any staging cutover.

Target sprint: next AWIA staging cutover sprint (post-bundle-5).
