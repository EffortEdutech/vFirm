---
id: VF-STAGE-9-RELEASE-OPERATIONS-RUNBOOK
title: "Stage 9 - Release Operations Runbook"
version: "1.0"
status: "Runbook"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Stage 9 - Release Operations Runbook v1.0

## Local verification

Run before every handoff:

```text
npm run check
npm run db:migrate:docker
npm run check:db:postgres
npm run check:production-readiness
```

## Production-readiness endpoint

Use:

```text
GET /ops/readiness
```

Expected local MVP result may be `DEV_READY_WITH_WARNINGS` because local development intentionally uses dev auth and may use JSON fallback in some smoke tests.

Expected production-candidate result is `PRODUCTION_READY_CANDIDATE` only after production database, external auth, allowed origins, backup policy, and release channel are configured.

## Migration discipline

1. Never edit an already-applied migration casually.
2. Add a new numbered migration for schema changes.
3. Run dry migration validation through `npm run check`.
4. Apply locally using `npm run db:migrate:docker`.
5. Verify with `npm run check:db:postgres`.
6. Promote only after migration and app versions are aligned.

## Backup and restore discipline

Minimum pilot expectation:

- automated daily production database backup;
- manual pre-release backup before every schema migration;
- restore test before accepting production pilot users;
- retention period documented by environment;
- backup access limited to authorized operators.

## Incident posture

For early pilot operation:

1. freeze writes if data integrity is suspected;
2. preserve logs and audit events;
3. identify tenant/firm/project scope;
4. rollback application release if code caused the issue;
5. restore database only after confirming restore point and business impact;
6. write an incident note into the implementation docs.

## Release checklist

- [ ] Full checks pass.
- [ ] Database migration applied and verified.
- [ ] External auth configured.
- [ ] Production secrets stored outside repo.
- [ ] Allowed origins configured.
- [ ] Backup policy active.
- [ ] Restore tested.
- [ ] Release channel set.
- [ ] Operator can access Ops readiness view.
- [ ] Rollback path documented for the release.
