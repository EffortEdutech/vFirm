---
title: "MT-H2 Backend Active Workspace Summary Completion"
version: "1.0"
status: "complete"
date: "2026-09-02"
scope: "Multi-tenant firm workspace runtime binding"
---

# MT-H2 Backend Active Workspace Summary Completion v1.0

## Sprint result

MT-H2 is complete.

The backend now exposes an active workspace summary contract for a selected tenant and firm. This resolves the firm into its workspace profile, subscription package, service lines, modules, worker bindings, authority boundaries, record scope, audit requirements, and locked product boundaries.

## Implemented capability

### New endpoint

`GET /workspace/active-summary?tenant_id={tenant_id}&firm_id={firm_id}`

The endpoint returns:

- tenant identity;
- firm identity;
- resolved workspace profile;
- active or fallback subscription package;
- service-pack/subscription health shape;
- subscribed modules;
- worker bindings;
- service lines;
- authority boundaries;
- tenant/firm record scope;
- audit requirements;
- prohibited marketplace/payment/autonomy boundaries.

### Dashboard binding

`GET /dashboard/summary?tenant_id={tenant_id}&firm_id={firm_id}` now uses the active workspace resolver for service-pack/subscription health when a tenant and firm are selected.

This removes the previous Formwork-only assumption for scoped dashboard health.

## Resolution strategy

MT-H2 uses the metadata-first strategy authorized by MT-H1:

- `firms.metadata.workspace_profile`;
- `firms.metadata.workspace_classification`;
- `subscription_packages.features`;
- `subscription_packages.metadata.service_lines`;
- `subscription_packages.metadata.modules`;
- `subscription_packages.metadata.worker_templates`;
- `worker_instances`;
- deterministic fallback profiles.

A dedicated table can still be added later if the metadata approach becomes too limited.

## Reference behavior proved

| Selected firm | Resolved firm type | Subscription/service health |
| --- | --- | --- |
| Formwork pilot firm | `FORMWORK_ENGINEERING` | `VF-FORMWORK-PILOT` |
| NHL Global Solution | `ORGANIZATION_SUPPORT` | `VF-ORG-SUPPORT-PILOT` |
| PD-H2 rehearsal firm | `DIRECTORY_REHEARSAL` | `VF-DIRECTORY-REHEARSAL` |

## Negative control

Wrong tenant/firm combinations are denied by actor tenant/firm scope. This preserves strict tenant boundary behavior before workspace resolution.

## Boundary confirmation

MT-H2 does not authorize:

- public marketplace;
- live matching;
- ranking;
- capacity allocation;
- VF-24 observatory publication;
- pricing intelligence;
- autonomous award;
- autonomous regulated approval;
- live payment movement.

## Evidence

- `scripts/smoke-mt-h2-active-workspace-summary.mjs`
- `npm run check:mt:h2`
- `npm run check`

## Next sprint

Proceed next to `MT-H3 - Local Seed and Pilot Workspace Data Repair`.

