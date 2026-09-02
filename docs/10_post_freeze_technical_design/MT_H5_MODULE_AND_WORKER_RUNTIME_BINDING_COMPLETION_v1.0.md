---
title: "MT-H5 Module and Worker Runtime Binding Completion"
version: "1.0"
status: "complete"
date: "2026-09-03"
scope: "Controlled local/private pilot multi-tenant runtime UI hardening"
---

# MT-H5 Module and Worker Runtime Binding Completion v1.0

## Status

MT-H5 is complete.

The selected firm workspace now controls module availability and AI worker provisioning behavior in the frontend. The UI no longer treats every firm as if it has the Formwork Engineering module set.

## What changed

MT-H5 adds selected-firm runtime binding across the workspace shell:

- view-to-module mapping for main work areas;
- subscribed/not-subscribed navigation state;
- subscription boundary pages for modules not included in the selected firm's workspace profile;
- selected-firm worker template filtering;
- firm-specific worker default names;
- Front Desk service hints driven by active service lines;
- AI tool/output default hints driven by active workspace type;
- Technical Delivery gating for firms that do not subscribe to `technical_delivery`.

## Firm behavior now expected

### Amanah Formwork Pilot Firm

- Shows Formwork Engineering subscription/profile.
- Includes `technical_delivery` and `approvals` modules.
- Technical Delivery page shows Formwork drawing/QA/delivery-support controls.
- AI Workforce defaults include Formwork-oriented worker names and tool hints.

### NHL Global Solution

- Shows Organization Support subscription/profile.
- Services include project reporting, technical writing, clerical work, and BizKick EDCS.
- Technical Delivery is marked as not subscribed and shows a subscription-boundary card instead of Formwork controls.
- Front Desk enquiry service hint comes from NHL service lines, not Formwork.
- AI Workforce provisioning uses selected workspace worker bindings and organization-support defaults.

## Implementation evidence

Changed files:

- `apps/web/public/app.js`
- `apps/web/public/styles.css`
- `scripts/smoke-mt-h5-module-worker-binding.mjs`
- `package.json`
- `docs/10_post_freeze_technical_design/MT_MULTI_TENANT_WORKSPACE_RUNTIME_BINDING_CHECKLIST_v1.0.md`

New smoke command:

```bash
npm run check:mt:h5
```

Result:

```json
{
  "smoke": "mt-h5-module-worker-binding",
  "result": "passed",
  "checks": [
    "view_to_module_binding",
    "subscribed_not_subscribed_nav_state",
    "subscription_boundary_pages",
    "technical_delivery_gated_for_non_formwork",
    "worker_templates_from_active_contract",
    "firm_specific_worker_defaults",
    "frontdesk_service_hint_from_active_services",
    "firm_specific_ai_tool_and_output_defaults"
  ]
}
```

## Boundary controls preserved

MT-H5 does not implement:

- public marketplace;
- live matching;
- ranking;
- capacity allocation;
- VF-24 observatory publication;
- pricing intelligence;
- autonomous award;
- autonomous regulated approval;
- live payment movement.

Workers remain assistive and attributable. Human principal/professional approval remains explicit. Modules outside a firm's selected subscription/profile are visible only as bounded, non-actionable subscription-boundary pages.

## Next sprint

Proceed to `MT-H6 — Multi-Tenant Pilot Rehearsal and Evidence Pack`.