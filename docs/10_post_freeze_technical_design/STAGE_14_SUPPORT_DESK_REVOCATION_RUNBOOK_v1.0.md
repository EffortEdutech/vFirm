---
id: VF-STAGE-14-SUPPORT-DESK-RUNBOOK
title: "Stage 14 - Support Desk and Revocation Runbook"
version: "1.0"
status: "Runbook"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Stage 14 - Support Desk and Revocation Runbook v1.0

## Support sequence

1. Identify tenant and affected firm/user.
2. Open support case with severity and subject.
3. Resolve or escalate the case.
4. Close case with resolution summary.
5. Revoke pilot user if access should stop.
6. Verify revoked user no longer resolves active auth context.
7. Review audit/event trail.

## Revocation rules

- Use revocation instead of deletion during pilot.
- Preserve revoked user metadata and reason.
- Confirm external provider session/token is also revoked once real provider is connected.
- Re-open access only through a new activation decision.

## Validation

```text
npm run check:stage14
npm run check
npm run db:migrate:docker
npm run check:db:postgres
```
