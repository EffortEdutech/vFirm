---
id: VF-STAGE-9-PRODUCTION-READINESS-EXIT-REVIEW
title: "Stage 9 - Production Readiness Exit Review"
version: "1.0"
status: "Exit Review"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Stage 9 - Production Readiness Exit Review v1.0

## Outcome

Stage 9 adds the first operational readiness layer for vFirm.

The MVP now exposes readiness checks through the API, shows them in the web workspace, and includes a dedicated production-readiness smoke test. The stage makes deployment risk visible without pretending local MVP settings are production-grade.

## Implemented artifacts

| Area | Artifact |
|---|---|
| API | `GET /ops/readiness` |
| Web | `Ops` workspace tab |
| Script | `scripts/smoke-stage9-production-readiness.mjs` |
| Package scripts | `check:stage9`, `check:production-readiness` |
| Docs | Stage 9 plan, release runbook, exit review |

## Readiness checks covered

- API port-family compliance for local development.
- Persistence mode visibility.
- Production database configuration warning.
- External auth provider warning.
- Explicit allowed origins warning.
- Backup policy warning.
- Release channel visibility.

## Validation evidence

Required commands:

```text
npm run check
npm run db:migrate:docker
npm run check:db:postgres
npm run check:production-readiness
```

## Remaining production decisions

These remain business/ops decisions before real launch:

- hosting provider;
- managed PostgreSQL provider;
- external authentication provider activation;
- secrets manager;
- backup provider and restore schedule;
- staging/production domain strategy;
- monitoring/log retention policy.

## Stage 10 recommendation

The next stage should move from platform readiness into pilot packaging: staging deployment, seeded demo data, Formwork pilot operating handbook, onboarding checklist, and first external-user trial controls.
