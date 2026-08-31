---
id: VF-STAGE-12-REAL-AUTH-PROVIDER-TENANT-ADMIN-EXIT-REVIEW
title: "Stage 12 - Real Auth Provider Integration and Tenant Admin Controls Exit Review"
version: "1.0"
status: "Exit Review"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Stage 12 - Real Auth Provider Integration and Tenant Admin Controls Exit Review v1.0

## Outcome

Stage 12 adds the provider-neutral auth adapter seam and tenant-admin policy surface.

The system can now simulate a real provider such as Clerk/Auth0/Supabase/Entra by resolving verified external identity claims to an active pilot user and vFirm actor context. Wrong subjects fail closed.

## Implemented artifacts

| Area | Artifact |
|---|---|
| API | `GET /auth/provider/config` |
| API | `GET /auth/provider-context` |
| API | `GET /tenant-admin/policy` |
| Web | Users tab provider/admin panels |
| Script | `scripts/smoke-stage12-auth-provider-admin.mjs` |
| Docs | Stage 12 plan, auth provider decision note, tenant admin runbook, exit review |

## Validation evidence

Required commands:

```text
npm run check:stage12
npm run check
npm run check:db:postgres
```

## Remaining before real external launch

- select real auth provider;
- install provider SDK or middleware if the web stack changes;
- verify signed tokens/sessions server-side;
- implement user revocation command;
- implement tenant admin UI permissions enforcement;
- configure staging deployment and callback URLs.

## Stage 13 recommendation

The next stage should be `Stage 13 - Staging Deployment Package and Production Data Protection`.
