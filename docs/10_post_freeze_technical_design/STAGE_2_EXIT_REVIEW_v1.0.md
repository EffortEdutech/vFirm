---
id: VF-STAGE-2-EXIT-REVIEW
title: "Stage 2.6 Exit Review"
version: "1.0"
status: "Complete"
source_status: "CREATED DURING POST-FREEZE IMPLEMENTATION"
review_date: "2026-08-25"
---

# Stage 2.6 Exit Review v1.0

## 1. Exit Decision

Stage 2 is approved for closure.

The MVP has moved from local JSON demo persistence into a PostgreSQL-backed relational service loop while preserving JSON fallback for development. The command loop, read APIs, web shell, migration runner, service catalogue seed, policy tests, and smoke tests are green.

## 2. Scope Completed

- tenant, person, actor, and firm persistence converted to relational tables;
- clients, firm-client relationships, leads, and intake sessions converted;
- price build-ups, proposals, approvals, and engagements converted;
- projects, work packages, tasks, evidence bundles, and invoices converted;
- policy decisions, event log, and audit events converted;
- service catalogue and Formwork `VF-SP-001` relational records added;
- migration history/checksum tracking added through `schema_migrations`;
- API list/detail endpoints added for MVP records;
- dashboard summary endpoint added;
- web workspace reads resource APIs before falling back to `/mvp/store`;
- contract catalogue updated for implemented MVP endpoints;
- PostgreSQL smoke validation added.

## 3. Validation Evidence

Latest validation commands:

```text
npm run check
npm run db:migrate:docker
npm run check:db:postgres
```

Latest observed result:

```text
Baseline validation passed.
Implementation artifact validation passed.
Migration validation passed.
Policy tests passed.
API smoke test passed.
API read endpoint smoke test passed.
Web smoke test passed.
Web/API integration smoke test passed.
PostgreSQL smoke test passed.
Migration run complete. Applied 0, skipped 4 on Docker container vfirm-postgres.
```

## 4. Remaining Watch Items

These are not blockers for Stage 2 closure, but must remain visible:

- production authentication is not implemented;
- professional authority checks are not yet database-backed;
- runtime validation is MVP-level, not generated-schema enforced;
- event payload schemas are not yet enforced at runtime;
- UI is still early operator-console quality;
- database reset remains a development action and needs an explicit safe script before wider team use.

## 5. Stage 3 Entry Condition

Stage 3 may begin because:

- the local MVP workflow is runnable;
- PostgreSQL relational mode is green;
- JSON fallback is green;
- web/API integration is green;
- known debt is documented;
- the next stage is productization, not architecture reopening.
