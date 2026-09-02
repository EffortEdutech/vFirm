---
id: MULTI-TENANT-WORKSPACE-POLISH-RESULT
title: "Multi-Tenant Workspace Polish Result"
version: "1.0"
status: "Completed Test Evidence"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
created: "2026-09-02"
---

# Multi-Tenant Workspace Polish Result v1.0

## 1. Purpose

This note records the first UI/runtime polish pass for operating multiple local Virtual Firm Platform tenants and firms in the same workspace.

The immediate driver is that the local workspace now contains the Formwork pilot context and NHL Global Solution, a solopreneur organization-support firm owned by Nur Hernieliana.

## 2. Completed changes

- Added an active tenant/firm workspace selector to the web shell.
- Persisted the selected active firm in browser local storage under `vfirm.activeFirmId`.
- Added active-scope derivation so normal pages render against the selected firm instead of the latest-created firm.
- Scoped dashboard counts, latest activity, record views, firm-client relationships, clients, projects, invoices, workers, audit, and operational records to the active firm where applicable.
- Updated the release banner to show the selected firm and tenant boundary.
- Added a static smoke gate for the multi-tenant workspace selector and scoped rendering contract.

## 3. Evidence

Validated commands:

```bash
npm run check:web:multitenant
npm run check:web:navigation
npm run check:onboarding:nhl
```

Local HTTP verification:

- `http://127.0.0.1:3090/` returned 200.
- `http://127.0.0.1:3090/app.js` returned 200.
- `#activeWorkspace` is present in the page.
- `renderActiveWorkspaceSelector` is present in the served app JavaScript.
- `http://127.0.0.1:3090/api/firms` includes `NHL Global Solution`.

## 4. Operating boundary

This polish improves local controlled pilot usability. It does not change production authorization, tenant onboarding policy, billing, external identity provider enforcement, public marketplace scope, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, or live payment movement.

## 5. Recommended next hardening

Recommended next work:

1. add explicit tenant/firm query parameters to all dashboard summary endpoints;
2. add a backend read endpoint for active workspace context;
3. add a Playwright/browser regression test once the browser verifier is available on the host;
4. separate Formwork-specific labels from generic organization-support firm labels in the remaining UI forms.