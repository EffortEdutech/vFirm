---
id: VF-STAGE-8-MARKETPLACE-NETWORK-LAYER-EXIT-REVIEW
title: "Stage 8 - Marketplace and Network Layer Exit Review"
version: "1.0"
status: "Exit Review"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Stage 8 - Marketplace and Network Layer Exit Review v1.0

## Outcome

Stage 8 establishes the first trusted/private network layer for vFirm.

The platform can now publish service-pack listings, declare professional capacity, request controlled collaboration, and capture aggregated observatory metrics without opening a public marketplace or leaking private operational data.

## Implemented artifacts

| Area | Artifact |
|---|---|
| Database | `infra/database/migrations/0007_marketplace_network_layer.sql` |
| Database | `marketplace_listings`, `capacity_offers`, `collaboration_requests`, `observatory_snapshots` |
| API | Stage 8 command endpoints and protected read endpoints |
| Contracts | Stage 8 entries in core API contract catalogues |
| Web | `Network` workspace tab in MVP shell |
| Test | `scripts/smoke-stage8-marketplace-network.mjs` |

## Guardrails preserved

- Stage 8 remains private/trusted-network-first.
- Tenant-scoped reads remain enforced.
- Collaboration requests carry explicit data-room policy.
- Observatory snapshots use aggregated internal metrics.
- JSON store fallback remains available for local/dev mode.

## Validation evidence

Required validation commands:

```text
npm run check
npm run db:migrate:docker
npm run check:db:postgres
```

The Stage 8 smoke test validates:

- listing publication;
- capacity offer creation;
- collaboration request creation;
- observatory snapshot metric generation;
- cross-tenant network read denial.

## Stage 9 recommendation

The next roadmap stage should focus on production readiness around observability, deployment discipline, external auth replacement, backup/recovery, and operational hardening.

