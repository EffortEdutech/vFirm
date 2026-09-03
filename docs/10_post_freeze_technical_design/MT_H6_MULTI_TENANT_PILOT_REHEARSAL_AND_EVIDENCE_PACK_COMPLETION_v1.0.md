---
title: "MT-H6 Multi-Tenant Pilot Rehearsal and Evidence Pack Completion"
version: "1.0"
status: "complete"
date: "2026-09-03"
scope: "Controlled local/private pilot multi-tenant rehearsal and evidence pack"
---

# MT-H6 Multi-Tenant Pilot Rehearsal and Evidence Pack Completion v1.0

## Status

MT-H6 is complete.

The Virtual Firm Platform has rehearsed two different pilot firms from the same local workspace runtime: the Formwork Engineering pilot firm and NHL Global Solution. The rehearsal confirms that the selected active firm controls workspace identity, subscription display, service lines, module availability, worker binding, and tenant-scoped backend access.

## Rehearsed pilot firms

### Amanah Formwork Pilot Firm

- Tenant: Formwork Pilot Tenant.
- Firm type: `FORMWORK_ENGINEERING`.
- Subscription/service pack: `VF-FORMWORK-PILOT`.
- Modules include technical delivery and approvals.
- Worker binding includes six Formwork-oriented workers.
- Technical Delivery remains available for controlled drawing, QA, evidence, and professional approval workflows.

### NHL Global Solution

- Tenant: NHL Global Solution Tenant.
- Principal: Nur Hernieliana.
- Firm type: `ORGANIZATION_SUPPORT`.
- Subscription/service pack: `VF-ORG-SUPPORT-PILOT`.
- Services include project reporting, technical writing, clerical work, and BizKick EDCS.
- Modules include front desk, administration, sales/accounts, projects, invoices, AI workforce, ops, and audit.
- Technical Delivery and regulated Formwork approval modules are not included in the subscribed organization-support workspace profile.
- Worker binding includes six organization-support workers.

## Evidence collected

New smoke command:

```bash
npm run check:mt:h6
```

Focused rehearsal result:

```json
{
  "smoke": "mt-h6-multi-tenant-pilot-rehearsal",
  "result": "passed",
  "workspaces": {
    "formwork": {
      "firm": "Amanah Formwork Pilot Firm",
      "tenant": "Formwork Pilot Tenant",
      "firm_type": "FORMWORK_ENGINEERING",
      "subscription": "VF-FORMWORK-PILOT",
      "modules": [
        "administration",
        "ai_workforce",
        "approvals",
        "audit",
        "front_desk",
        "invoices",
        "ops",
        "projects",
        "sales_accounts",
        "technical_delivery"
      ],
      "workers": 6
    },
    "nhl": {
      "firm": "NHL Global Solution",
      "tenant": "NHL Global Solution Tenant",
      "firm_type": "ORGANIZATION_SUPPORT",
      "subscription": "VF-ORG-SUPPORT-PILOT",
      "services": [
        "project_reporting",
        "technical_writing",
        "clerical_work",
        "bizkick_edcs"
      ],
      "modules": [
        "administration",
        "ai_workforce",
        "audit",
        "front_desk",
        "invoices",
        "ops",
        "projects",
        "sales_accounts"
      ],
      "workers": 6
    }
  },
  "negative_checks": [
    "cross_tenant_active_summary_denied",
    "nhl_no_formwork_technical_delivery_subscription"
  ],
  "frontend_evidence": [
    "dynamic_shell",
    "active_workspace_selector",
    "subscribed_navigation",
    "module_boundary_pages",
    "worker_template_contract_binding"
  ]
}
```

## Coverage

The MT-H6 rehearsal verifies:

- Formwork pilot workspace access;
- NHL Global Solution workspace access;
- active workspace switching;
- dynamic workspace title, lede, and selected-firm copy;
- dashboard subscription and service display;
- My Firm selected-firm profile display;
- Service Subscription / Delivery Pack selected-firm binding;
- AI Workforce selected-firm worker template binding;
- Front Desk selected-firm service hint binding;
- Technical Delivery gating for NHL as a non-Formwork workspace;
- cross-tenant active-summary denial;
- preservation of human authority and commercial boundaries.

## Boundary controls preserved

MT-H6 does not implement or authorize:

- public marketplace;
- live matching;
- ranking;
- capacity allocation;
- VF-24 observatory publication;
- pricing intelligence;
- autonomous award;
- autonomous regulated approval;
- live payment movement.

The selected firm controls the workspace runtime view, but professional responsibility and governed approval remain human-bound. AI workers remain assistive, attributable, scoped to the selected firm, and constrained by module/subscription availability.

## Completion artefacts

Changed or added artefacts:

- `scripts/smoke-mt-h6-multi-tenant-pilot-rehearsal.mjs`
- `package.json`
- `docs/10_post_freeze_technical_design/MT_MULTI_TENANT_WORKSPACE_RUNTIME_BINDING_CHECKLIST_v1.0.md`
- `docs/10_post_freeze_technical_design/MT_H6_MULTI_TENANT_PILOT_REHEARSAL_AND_EVIDENCE_PACK_COMPLETION_v1.0.md`
- `docs/10_post_freeze_technical_design/README.md`
- `docs/00_project_control/DECISION_REGISTER.md`

## Next decision

MT-H6 completes the planned MT-H1 through MT-H6 multi-tenant workspace runtime binding hardening pass. The next recommended step is a product-owner acceptance decision for multi-tenant pilot readiness, including any listed limitations, before authorizing the next scoped development plan.
