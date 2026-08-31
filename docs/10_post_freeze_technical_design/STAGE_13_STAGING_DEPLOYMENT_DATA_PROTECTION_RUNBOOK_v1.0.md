---
id: VF-STAGE-13-STAGING-DEPLOYMENT-RUNBOOK
title: "Stage 13 - Staging Deployment and Data Protection Runbook"
version: "1.0"
status: "Runbook"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Stage 13 - Staging Deployment and Data Protection Runbook v1.0

## Staging preflight

Run before staging handoff:

```text
npm run check
npm run db:migrate:docker
npm run check:db:postgres
npm run check:stage13
```

## Staging package checklist

1. Provision managed PostgreSQL.
2. Configure `DATABASE_URL` outside the repo.
3. Configure auth provider issuer, audience, and JWKS URL.
4. Set explicit allowed origins.
5. Set release channel to staging/pilot.
6. Apply migrations before traffic.
7. Run smoke checks.
8. Invite only approved pilot users.
9. Confirm backup and restore process.

## Data protection checklist

- [ ] Tenant isolation confirmed.
- [ ] Pilot consent/data terms confirmed.
- [ ] Backup policy active.
- [ ] Restore test scheduled or completed.
- [ ] Export manifest preserves relationships and provenance.
- [ ] Secrets excluded from exports.
- [ ] Provider tokens excluded from exports.
- [ ] Unlicensed third-party data excluded.
- [ ] Audit/event records retained for pilot review.

## Rollback posture

If staging is unsafe:

1. disable access;
2. revoke pilot users;
3. rollback app version;
4. preserve audit/event records;
5. restore data only after impact review.
