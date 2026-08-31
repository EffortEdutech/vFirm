---
id: VF-STAGE-12-TENANT-ADMIN-RUNBOOK
title: "Stage 12 - Tenant Admin Controls Runbook"
version: "1.0"
status: "Runbook"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Stage 12 - Tenant Admin Controls Runbook v1.0

## Tenant admin sequence

1. Confirm tenant exists.
2. Confirm firm exists where firm-scoped access is required.
3. Invite pilot user.
4. Activate pilot user only after provider identity is verified.
5. Resolve provider context.
6. Confirm role/action policy.
7. Revoke or suspend users before removing project access in a real provider.

## Provider-context test headers

```text
x-vfirm-auth-provider: clerk
x-vfirm-user-email: tenant.admin@example.com
x-vfirm-user-subject: clerk-user-001
x-vfirm-auth-verified: true
```

## Production warning

Headers are only a local/staging adapter simulation. Real production must verify signed tokens or sessions server-side.

## Validation

```text
npm run check:stage12
npm run check
```
