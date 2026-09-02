---
title: "MT-H4 Frontend Workspace Shell Binding Completion"
version: "1.0"
status: "complete"
date: "2026-09-02"
scope: "Controlled local/private pilot multi-tenant UI hardening"
---

# MT-H4 Frontend Workspace Shell Binding Completion v1.0

## Status

MT-H4 is complete.

The web workspace shell no longer presents Formwork Engineering as the universal workspace identity. The selected active firm now drives the visible shell title, lede, release/workspace banner, dashboard subscription/service summary, My Firm module contract, and Service Subscription / Delivery Pack view.

## User-reported issue fixed

The previous page shell contained static copy:

- `Solopreneur Firm Workspace`
- `Operate a Formwork Engineering Virtual Firm with modular front desk, administration, accounts, sales, project, and technical support.`

This was incorrect once the platform supported both:

- `Amanah Formwork Pilot Firm`; and
- `NHL Global Solution`.

The static shell has been replaced with dynamic elements:

- `#workspaceShellTitle`; and
- `#workspaceShellLede`.

After data load and active firm selection, those elements render from the selected firm's workspace profile and active subscription package.

## Implementation evidence

Changed files:

- `apps/web/public/index.html`
- `apps/web/public/app.js`
- `scripts/smoke-mt-h4-workspace-shell-binding.mjs`
- `scripts/smoke-web.mjs`
- `scripts/smoke-web-api.mjs`
- `package.json`
- `docs/10_post_freeze_technical_design/MT_MULTI_TENANT_WORKSPACE_RUNTIME_BINDING_CHECKLIST_v1.0.md`

Frontend behavior added:

- active workspace contract resolver;
- active subscription package resolver;
- service-line summary renderer;
- dynamic shell title and lede renderer;
- active firm selector card showing tenant, firm, principal, firm type, subscription, and services;
- dashboard card showing active subscription and subscribed services;
- My Firm page driven by the selected firm's workspace profile modules;
- generalized `Service Subscription / Delivery Pack` page;
- Formwork-specific Practice Pack detail shown only for Formwork Engineering workspaces.

## Acceptance evidence

Focused smoke gate:

```bash
npm run check:mt:h4
```

Result:

```json
{
  "smoke": "mt-h4-workspace-shell-binding",
  "result": "passed",
  "checks": [
    "dynamic_shell_title_and_lede",
    "no_static_formwork_lede",
    "active_workspace_contract_resolver",
    "active_subscription_summary",
    "nhl_organization_support_copy",
    "generalized_service_subscription_page"
  ]
}
```

Syntax checks:

```bash
node --check apps/web/public/app.js
node --check scripts/smoke-mt-h4-workspace-shell-binding.mjs
```

Both passed.

## Boundaries preserved

MT-H4 does not implement:

- public marketplace;
- live matching;
- ranking;
- capacity allocation;
- VF-24 observatory publication;
- pricing intelligence;
- autonomous award;
- autonomous regulated approval;
- live payment movement.

Workers remain assistive. Human principal/professional approval remains explicit.

## Operator note

If the browser is already open at `http://localhost:3090/`, hard refresh after pulling this change. If the dev server was started before MT-H2/MT-H4, restart it and run:

```bash
npm run seed:pilot-workspaces
```

Then select either:

- `Amanah Formwork Pilot Firm`; or
- `NHL Global Solution`.

The shell title and description should change with the selected firm.

## Next sprint

Proceed to `MT-H5 — Module and Worker Runtime Binding`.