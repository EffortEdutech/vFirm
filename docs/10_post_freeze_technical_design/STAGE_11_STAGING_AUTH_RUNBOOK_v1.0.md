---
id: VF-STAGE-11-STAGING-AUTH-RUNBOOK
title: "Stage 11 - Staging Auth and Pilot User Runbook"
version: "1.0"
status: "Runbook"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Stage 11 - Staging Auth and Pilot User Runbook v1.0

## Local staging variables

Example values are documented in `.env.local.example`:

```text
VFIRM_AUTH_PROVIDER=staging-header
VFIRM_ALLOWED_ORIGINS=http://127.0.0.1:3090
VFIRM_BACKUP_POLICY=pilot-daily
VFIRM_RELEASE_CHANNEL=local-pilot
```

## Pilot user sequence

1. Create tenant and firm.
2. Invite pilot user with `POST /pilot/users/invite`.
3. Activate pilot user with `POST /pilot/users/activate` after identity verification.
4. Resolve staged identity with `GET /auth/staging-context`.
5. Confirm active user is mapped to the expected tenant and firm.

## Staging-header test request

```text
GET /auth/staging-context
x-vfirm-user-email: pilot.operator@example.com
x-vfirm-user-subject: staging-user-001
x-vfirm-auth-provider: staging-header
```

## Before real external pilot

Replace staging-header auth with a real identity provider adapter. The adapter must verify signed claims before resolving the actor.

Required decisions:

- provider;
- callback/domain setup;
- tenant/firm invitation model;
- role mapping;
- session/token validation;
- account recovery process;
- offboarding/revocation process.

## Validation commands

```text
npm run check:stage11
npm run check
npm run db:migrate:docker
npm run check:db:postgres
```
