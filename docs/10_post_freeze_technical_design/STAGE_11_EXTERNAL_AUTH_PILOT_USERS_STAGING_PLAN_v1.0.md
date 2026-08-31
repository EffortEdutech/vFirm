---
id: VF-STAGE-11-EXTERNAL-AUTH-PILOT-USERS-STAGING-PLAN
title: "Stage 11 - External Auth, Pilot User Management, and Staging Deployment Plan"
version: "1.0"
status: "Implementation Plan"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Stage 11 - External Auth, Pilot User Management, and Staging Deployment Plan v1.0

## Purpose

Stage 11 prepares vFirm for real external pilot users without pretending dev-header authentication is production authentication.

The stage introduces a pilot-user registry, a staging auth adapter seam, staging environment variables, and validation checks. The implementation remains provider-neutral until the team chooses Clerk, Supabase Auth, Auth0, Microsoft Entra, or another identity provider.

## Scope

Stage 11 implements:

1. `pilot_users` relational table;
2. pilot user invite and activation commands;
3. staging-header auth context endpoint;
4. Users workspace tab;
5. staging/pilot environment example values;
6. smoke test for pilot-user and staging-auth flow.

## API surface

| Endpoint | Purpose |
|---|---|
| `GET /pilot-users` | List controlled pilot users. |
| `POST /pilot/users/invite` | Invite a pilot user into a tenant/firm pilot. |
| `POST /pilot/users/activate` | Activate a pilot user after identity verification. |
| `GET /auth/staging-context` | Resolve staging external identity headers to an active pilot user. |

## Staging auth bridge

The staging bridge accepts these headers:

- `x-vfirm-user-email`
- `x-vfirm-user-subject`
- `x-vfirm-user-name`
- `x-vfirm-auth-provider`

This is a test adapter, not final authentication. It proves the application shape needed for external auth while keeping the real provider decision separate.

## Provider-neutral rule

Stage 11 must not lock the platform into one auth vendor. It creates the seam where a real provider adapter can later map verified identity claims into:

- tenant;
- firm;
- pilot user;
- person;
- actor;
- membership;
- authority context.

## Exit criteria

Stage 11 can close when:

- pilot users are persisted in PostgreSQL and JSON fallback;
- pilot invite/activation commands work;
- staging auth context resolves active pilot users;
- web Users tab supports pilot user invite/activation;
- full checks pass;
- PostgreSQL migration applies and schema smoke passes.
