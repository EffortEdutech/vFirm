---
id: VF-STAGE-9-PRODUCTION-READINESS-PLAN
title: "Stage 9 - Production Readiness and Deployment Hardening Plan"
version: "1.0"
status: "Implementation Plan"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Stage 9 - Production Readiness and Deployment Hardening Plan v1.0

## Purpose

Stage 9 turns the working MVP into a release-controlled system that can be operated responsibly. The goal is not to rush public production. The goal is to make deployment, security, environment configuration, observability, backups, migration discipline, and release gates explicit.

## Scope

Stage 9 adds:

1. operational readiness endpoint;
2. operator-facing Ops workspace view;
3. production-readiness smoke script;
4. release checklist and runbook documentation;
5. database schema smoke coverage for all implemented tables;
6. explicit warning state for local/dev-only configuration.

## Operational readiness checks

The API exposes `GET /ops/readiness`.

It reports:

- API port and port-family compliance;
- persistence mode;
- database URL presence;
- external authentication provider presence;
- explicit allowed origin configuration;
- backup policy declaration;
- release channel declaration.

Local development may pass with warnings. Real production must resolve every warning intentionally.

## Production release gates

Before real production launch, the following environment/configuration decisions must be complete:

| Gate | Required item |
|---|---|
| Database | `VFIRM_DATABASE_URL` points to managed production PostgreSQL. |
| Authentication | `VFIRM_AUTH_PROVIDER` replaces dev-header auth. |
| CORS | `VFIRM_ALLOWED_ORIGINS` is explicit and environment-specific. |
| Backups | `VFIRM_BACKUP_POLICY` is documented and active. |
| Release | `VFIRM_RELEASE_CHANNEL` identifies local, staging, pilot, or production. |
| Migration | migrations apply cleanly before app release. |
| Smoke | full `npm run check` passes. |

## Deployment posture

Stage 9 does not force a hosting provider. It prepares the repo so the team can choose one safely.

Recommended deployment path:

1. keep Docker PostgreSQL for local development;
2. use managed PostgreSQL for staging/production;
3. deploy API and web as separate services or a single reverse-proxied app;
4. configure 309# only for local development, not as a public production port requirement;
5. run migration and smoke checks before promotion.

## Exit criteria

Stage 9 can close when:

- `/ops/readiness` is available;
- web `Ops` view shows readiness state;
- `npm run check:production-readiness` passes;
- full validation passes;
- runbook and exit review are documented;
- remaining production risks are visible rather than hidden.
