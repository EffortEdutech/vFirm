# AWIA Staging Preparation Completion v1.0

Status: completed (readiness assessment; staging cutover itself remains NOT_READY, by design)
Authorization: AUTHORIZE_AWIA_STAGING_PREPARATION
Date: 2026-09-05
Classification: explicit user-approved scope expansion (optional bundle 5 of 5 from AWIA_CONTROLLED_LOCAL_PILOT_ACCEPTANCE_LOCK_v1.0.md)

## Purpose

Assess, honestly and verifiably, what stands between the current controlled local/private AWIA pilot and a staging deployment on the platform's recommended stack (managed PostgreSQL, per `readStagingDeploymentPackage()` / Stage 13), and surface any gaps as a concrete checklist rather than declaring staging readiness that has not been verified.

## Scope Completed

- New read-only endpoint `GET /awia/virtual-staff/staging-readiness` in `apps/api/src/server.mjs`, mirroring the existing `readStagingDeploymentPackage()` pattern. On each call it:
  - reads `infra/database/schema.sql` and every file in `infra/database/migrations/` at runtime and checks for any `awia` table reference (so this is a live check, not a hardcoded claim, and will flip automatically once a real migration is added);
  - reports the known id-generation gap (`AWIA_RECORD_IDS_NOT_BACKEND_AWARE`): every AWIA store.mjs function generates ids via an unconditional `newId(prefix)` rather than the existing `isPostgresStore()`-aware id scheme used elsewhere in the file, so even a correct schema would reject these ids under a uuid-typed primary key;
  - returns a concrete `required_before_staging` checklist and the full `preflight_commands` list (all five new `check:awia:*` smoke scripts plus `check:db:postgres`);
  - returns a deterministic `recommendation`: `NOT_READY_FOR_STAGING_BACKEND_MIGRATION_REQUIRED` while blockers exist, `READY_FOR_STAGING_CUTOVER_REHEARSAL` once they are closed.
- New technical debt entry `TD-009 — AWIA Virtual Staff Not Yet Postgres/Staging Ready` in `TECHNICAL_DEBT_REGISTER_v1.0.md`, so this gap is tracked as backlog rather than lost.
- Smoke coverage: `scripts/smoke-awia-staging-preparation.mjs`, asserting the endpoint reports the current backend, the known finding, a non-trivial checklist, the correct boundary marker, and today's correct `NOT_READY_FOR_STAGING_BACKEND_MIGRATION_REQUIRED` recommendation.

## Why This Bundle Does Not Claim Staging Is Ready

This sandbox has no Docker/Postgres available to actually provision and verify a schema migration against a live database. Writing an unverified Postgres migration and declaring staging "prepared" would be exactly the kind of false completion this project's evidence-and-verification discipline exists to prevent (see AGENTS.md principle 5, "no silent approval," and the repeated pattern of every other stage requiring passing smoke checks before a completion doc is written). Instead, this bundle delivers a verifiable, self-updating readiness check and a precise remediation checklist, which is the honest and useful version of "staging preparation" given what could actually be confirmed in this session.

## Boundary Still Locked

This bundle does not authorize:
- staging or production deployment of any kind;
- any claim that AWIA is ready for a non-local/private-pilot environment;
- any change to the runtime authority gate, provisioning, or persistence behavior of existing controlled local/private pilot operation (JSON store backend is untouched and remains the supported backend for the current pilot lock).

## Verification

Passed:
- `node --check apps/api/src/server.mjs`
- `npm run check:awia:staging-prep`
- `npm run check:awia:staff-memory` (no regression)
- `npm run check:awia:department-dashboards` (no regression)
- `npm run check:awia:payroll-billing` (no regression)
- `npm run check:awia:template-scaling` (no regression)
- `npm run check:awia:next-bundle` (no regression)
- `npm run check:awia:pilot-rehearsal` (no regression)
- `npm run check:awia:acceptance-lock` (no regression)
- `npm run check:awia:vs:s6` (no regression)

## Handoff

All 5 optional AWIA expansion bundles from `AWIA_CONTROLLED_LOCAL_PILOT_ACCEPTANCE_LOCK_v1.0.md` are now complete. Recommended next action: either (a) resolve TD-009 to move toward an actual staging cutover, or (b) run a fresh controlled local pilot rehearsal exercising the 5 new capabilities (staff memory/conversation, department dashboards, seat billing, multi-firm templates, staging-readiness reporting) before deciding on TD-009's priority.
