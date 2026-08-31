---
id: VF-STAGE-11-EXTERNAL-AUTH-PILOT-USERS-STAGING-EXIT-REVIEW
title: "Stage 11 - External Auth, Pilot User Management, and Staging Deployment Exit Review"
version: "1.0"
status: "Exit Review"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Stage 11 - External Auth, Pilot User Management, and Staging Deployment Exit Review v1.0

## Outcome

Stage 11 introduces the first external-user management layer for vFirm pilots.

The platform now has a pilot-user registry, invite/activation commands, a staging auth bridge, a Users workspace tab, and validation scripts. It is ready for a real auth-provider adapter decision.

## Implemented artifacts

| Area | Artifact |
|---|---|
| Database | `infra/database/migrations/0008_pilot_user_management.sql` |
| Database | `pilot_users` table |
| API | `GET /pilot-users` |
| API | `POST /pilot/users/invite` |
| API | `POST /pilot/users/activate` |
| API | `GET /auth/staging-context` |
| Web | `Users` workspace tab |
| Script | `scripts/smoke-stage11-external-auth-pilot-users.mjs` |
| Docs | Stage 11 plan, staging auth runbook, exit review |

## Validation evidence

Required commands:

```text
npm run check:stage11
npm run check
npm run db:migrate:docker
npm run check:db:postgres
```

## Remaining external launch decisions

- choose real auth provider;
- implement signed token/session verification;
- add production invitation email flow;
- add firm/tenant admin role management;
- add user revocation/offboarding commands;
- deploy staging environment with managed PostgreSQL.

## Stage 12 recommendation

The next stage should be `Stage 12 - Real Auth Provider Integration and Tenant Admin Controls`.
