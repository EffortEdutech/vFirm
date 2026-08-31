---
id: VF-STAGE-14-PILOT-TENANT-OPERATIONS-SUPPORT-CONTROLS-EXIT-REVIEW
title: "Stage 14 - Pilot Tenant Operations, Revocation, and Support Desk Controls Exit Review"
version: "1.0"
status: "Exit Review"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Stage 14 - Pilot Tenant Operations, Revocation, and Support Desk Controls Exit Review v1.0

## Outcome

Stage 14 adds the first pilot operations/support desk control layer.

The platform can now open and close support cases, revoke pilot users, deny provider-context resolution for revoked users, and display support status in the workspace.

## Implemented artifacts

| Area | Artifact |
|---|---|
| Database | `infra/database/migrations/0009_support_desk_controls.sql` |
| Database | `support_cases` table |
| API | `GET /support/summary` |
| API | `GET /support-cases` |
| API | `POST /support/cases` |
| API | `POST /support/cases/update` |
| API | `POST /pilot/users/revoke` |
| Web | `Support` workspace tab |
| Script | `scripts/smoke-stage14-support-controls.mjs` |
| Docs | Stage 14 plan, support desk runbook, exit review |

## Validation evidence

```text
npm run check:stage14
npm run check
npm run db:migrate:docker
npm run check:db:postgres
```

## Stage 15 recommendation

The next stage should be `Stage 15 - Pilot Observability, Incident Response, and Operator Metrics`.
