---
id: VF-STACK-DATABASE-DECISION
title: "MVP Stack and Database Path Decision"
version: "1.0"
status: "Post-Freeze Technical Design"
source_status: "CREATED DURING MVP SCAFFOLD IMPLEMENTATION"
---

# MVP Stack and Database Path Decision v1.0

## Decision

The vFirm MVP implementation path is:

```text
Node.js API scaffold
  -> PostgreSQL-compatible canonical schema
  -> local JSON persistence adapter for immediate development
  -> psql migration runner when DATABASE_URL is configured
  -> future replacement with a real PostgreSQL repository adapter
```

## Why this path

This keeps the first build runnable without waiting for provider setup, while preserving the real database target through SQL migrations and canonical schema ownership.

## Current runtime

- API server: Node.js built-in HTTP server.
- Local development persistence: `data/dev-store.json` through `apps/api/src/store.mjs`.
- Database target: PostgreSQL-compatible SQL in `infra/database/schema.sql` and `infra/database/migrations/0001_mvp_schema.sql`.
- Migration runner: `scripts/db-migrate.mjs`.
- Policy runner: `scripts/run-policy-tests.mjs`.
- API smoke test: `scripts/smoke-api.mjs`.

## Replacement point

Replace local JSON persistence when one of these is true:

1. A real database is selected and `DATABASE_URL` is available.
2. Concurrent users need safe writes.
3. Query/filter behavior becomes important.
4. Authentication and tenant enforcement move beyond fixture mode.
5. UI workflows need stable persisted state across team machines.

## Near-term build path

1. Keep API contracts and policy checks stable.
2. Add repository interface boundaries around persistence calls.
3. Implement PostgreSQL repository adapter.
4. Add database-backed integration tests.
5. Add authentication/actor context resolution.
6. Build the first UI against the API.

## Guardrail

Local JSON persistence is a development adapter, not the production database architecture.
