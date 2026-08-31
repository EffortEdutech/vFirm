---
id: VF-STAGE-12-REAL-AUTH-PROVIDER-TENANT-ADMIN-PLAN
title: "Stage 12 - Real Auth Provider Integration and Tenant Admin Controls Plan"
version: "1.0"
status: "Implementation Plan"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Stage 12 - Real Auth Provider Integration and Tenant Admin Controls Plan v1.0

## Purpose

Stage 12 creates the real authentication provider seam and tenant-admin control surface needed before external pilot users can operate vFirm safely.

Because the project is currently a lightweight Node API/web shell, this stage does not install a provider-specific Next.js SDK. Instead, it defines and tests the provider adapter boundary that a real Clerk, Auth0, Supabase Auth, or Microsoft Entra integration must satisfy.

## Scope

Stage 12 implements:

1. provider-neutral auth configuration endpoint;
2. provider-context resolution endpoint;
3. tenant-admin policy surface;
4. Users workspace provider/admin panels;
5. environment variables for issuer, audience, and JWKS URL;
6. smoke test for verified provider identity mapping.

## API surface

| Endpoint | Purpose |
|---|---|
| `GET /auth/provider/config` | Read configured auth provider adapter status. |
| `GET /auth/provider-context` | Resolve verified provider identity claims to active vFirm actor context. |
| `GET /tenant-admin/policy` | Read tenant-admin role/action policy surface. |

## Provider adapter contract

A real provider adapter must verify signed identity claims and map them into:

- provider;
- external subject;
- email;
- display name;
- verification status;
- tenant/firm pilot user;
- actor context.

The adapter must fail closed when identity is missing, unverified, inactive, revoked, or not mapped to the tenant/firm.

## Tenant admin roles

| Role | Purpose |
|---|---|
| `TENANT_ADMIN` | Manage pilot users and tenant-level access. |
| `FIRM_ADMIN` | Manage firm-level pilot access. |
| `PILOT_PRINCIPAL` | Operate pilot with professional approval authority where separately granted. |
| `PILOT_OPERATOR` | Operate workflow without professional sign-off authority. |
| `PILOT_OBSERVER` | Read-only pilot observation. |

## Exit criteria

Stage 12 can close when:

- provider config endpoint works;
- provider context endpoint resolves active verified identity;
- wrong identity subject fails closed;
- tenant-admin policy is visible;
- Users workspace shows provider/admin controls;
- full validation passes.
