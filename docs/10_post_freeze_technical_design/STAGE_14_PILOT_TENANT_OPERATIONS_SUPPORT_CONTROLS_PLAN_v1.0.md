---
id: VF-STAGE-14-PILOT-TENANT-OPERATIONS-SUPPORT-CONTROLS-PLAN
title: "Stage 14 - Pilot Tenant Operations, Revocation, and Support Desk Controls Plan"
version: "1.0"
status: "Implementation Plan"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Stage 14 - Pilot Tenant Operations, Revocation, and Support Desk Controls Plan v1.0

## Purpose

Stage 14 gives the pilot a small but serious operating control room: revoke access, open/close support cases, and inspect tenant-scoped support status.

## Scope

Stage 14 implements:

- `support_cases` persistence;
- pilot user revocation;
- support case open/update flow;
- support queue summary;
- Support workspace tab;
- smoke test for revoke/support flow.

## API surface

| Endpoint | Purpose |
|---|---|
| `GET /support/summary` | Read tenant-scoped support queue and access status. |
| `GET /support-cases` | List support cases. |
| `POST /support/cases` | Open a pilot support case. |
| `POST /support/cases/update` | Update or close a support case. |
| `POST /pilot/users/revoke` | Revoke pilot user access. |

## Guardrails

- Revoked users must not resolve to active provider context.
- Support cases are tenant-scoped.
- Revocation retains audit metadata.
- Support desk actions are operational controls, not hidden authority escalation.

## Exit criteria

Stage 14 can close when support case create/update, pilot-user revoke, auth-context denial after revoke, and support summary all pass smoke validation.
