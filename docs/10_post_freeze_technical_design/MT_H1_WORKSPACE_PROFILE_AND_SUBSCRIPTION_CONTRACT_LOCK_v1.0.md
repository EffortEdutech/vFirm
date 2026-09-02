---
title: "MT-H1 Workspace Profile and Subscription Contract Lock"
version: "1.0"
status: "contract-locked"
date: "2026-09-02"
scope: "Multi-tenant firm workspace runtime binding"
---

# MT-H1 Workspace Profile and Subscription Contract Lock v1.0

## Purpose

MT-H1 locks the contract that will let the Virtual Firm Platform run more than one firm workspace from the same backend/frontend without pretending every firm is a Formwork Engineering firm.

The selected firm must resolve to a workspace profile and subscription contract before the UI renders firm-specific copy, modules, services, worker defaults, records, and operating boundaries.

## Canonical resolution chain

`Tenant -> Firm -> Workspace Profile -> Subscription Package -> Service Lines -> Modules -> Worker Templates -> Worker Instances -> Permissions -> Records -> Audit`

This chain is the contract for MT-H2 through MT-H6.

## Workspace profile contract

```json
{
  "tenant_id": "tenant-id",
  "firm_id": "firm-id",
  "workspace_code": "firm-workspace-code",
  "workspace_status": "ACTIVE",
  "workspace_classification": "PILOT | REHEARSAL | TEST | SUSPENDED",
  "firm_type": "FORMWORK_ENGINEERING | ORGANIZATION_SUPPORT | DIRECTORY_REHEARSAL",
  "workspace_title": "Human-readable workspace title",
  "workspace_description": "Business-specific landing copy",
  "principal_display_name": "Responsible human principal",
  "subscription": {
    "package_code": "package-code",
    "package_name": "package name",
    "package_status": "ACTIVE | DRAFT | SUSPENDED",
    "pricing_model": "CONTROLLED_PILOT | SUBSCRIPTION_PLUS_USAGE | READINESS_ONLY",
    "commercial_boundary": "NO_LIVE_PAYMENT_CAPTURE",
    "features": []
  },
  "service_lines": [],
  "modules": [],
  "worker_templates": [],
  "authority_boundaries": [],
  "record_scope": {
    "tenant_scoped": true,
    "firm_scoped": true,
    "cross_tenant_access": false
  },
  "audit_requirements": {
    "all_material_actions_attributable": true,
    "private_chain_of_thought_excluded": true,
    "evidence_summary_required": true
  }
}
```

## Firm type vocabulary

| Firm type | Meaning | Example |
| --- | --- | --- |
| `FORMWORK_ENGINEERING` | A technical/professional practice workspace where delivery may include controlled drawings, QA, evidence bundles, and professional approval gates. | Formwork pilot firm |
| `ORGANIZATION_SUPPORT` | A virtual service workspace for project reporting, technical writing, clerical work, and documentation/control support. | NHL Global Solution |
| `DIRECTORY_REHEARSAL` | A controlled test/rehearsal workspace used to prove private directory flows. It must not displace real pilot firms. | PD-H2 Requesting/Provider firms |

## Subscription package binding rules

1. A firm may have zero or more subscription package records, but the active workspace uses one active or latest approved package.
2. A subscription package describes workspace capabilities, not only payment preparation.
3. Package `features` must be usable by the UI to explain what the firm receives.
4. Package `metadata.workspace_profile` may be used as the first implementation path before a dedicated table exists.
5. A suspended package must not grant active workspace modules.
6. Commercial boundaries remain explicit; MT-H1 does not enable live payment capture.

## Module contract

Each module entry must contain:

```json
{
  "module_code": "front_desk",
  "module_name": "Front Desk",
  "status": "SUBSCRIBED | AVAILABLE | NOT_SUBSCRIBED | SUSPENDED",
  "description": "What this module does for the selected firm",
  "default_view": "front-desk",
  "worker_template_codes": [],
  "authority_note": "Human-readable authority boundary"
}
```

## Service line contract

Each service line must contain:

```json
{
  "service_code": "project_reporting",
  "service_name": "Project Reporting",
  "service_type": "PROFESSIONAL_PRACTICE | ORGANIZATION_SUPPORT | ADMINISTRATIVE_SUPPORT",
  "status": "ACTIVE | DRAFT | SUSPENDED",
  "requires_human_approval": true,
  "regulated_work": false,
  "delivery_outputs": []
}
```

## Worker binding contract

Each worker binding must resolve from the active workspace profile:

```json
{
  "worker_template_code": "front-desk-coordinator",
  "display_name": "Front Desk AI Worker",
  "module_code": "front_desk",
  "assigned_service_codes": [],
  "runtime_status": "AVAILABLE | PROVISIONED | ACTIVE | SUSPENDED",
  "authority_boundary": "Assistive only. No autonomous commitment.",
  "requires_supervisor": true
}
```

## Reference profile: Formwork pilot firm

```json
{
  "firm_type": "FORMWORK_ENGINEERING",
  "workspace_title": "Formwork Engineering Virtual Firm Workspace",
  "workspace_description": "Operate controlled formwork engineering intake, proposals, delivery support, QA evidence, approvals, invoicing, and audit.",
  "subscription": {
    "package_code": "VF-FORMWORK-PILOT",
    "package_name": "Formwork Engineering Pilot Workspace",
    "package_status": "ACTIVE",
    "pricing_model": "CONTROLLED_PILOT",
    "commercial_boundary": "NO_LIVE_PAYMENT_CAPTURE",
    "features": [
      "front desk",
      "administration",
      "sales and proposals",
      "accounts and receivables",
      "technical drawing and delivery support",
      "professional approval gates",
      "audit and export"
    ]
  },
  "service_lines": [
    {
      "service_code": "formwork_preliminary_wall_slab",
      "service_name": "Preliminary Wall/Slab Formwork Support",
      "service_type": "PROFESSIONAL_PRACTICE",
      "status": "ACTIVE",
      "requires_human_approval": true,
      "regulated_work": true,
      "delivery_outputs": ["controlled drawings", "QA evidence bundle", "delivery report"]
    }
  ],
  "modules": [
    "front_desk",
    "administration",
    "sales_accounts",
    "technical_delivery",
    "projects",
    "approvals",
    "invoices",
    "ai_workforce",
    "ops",
    "audit"
  ],
  "authority_boundaries": [
    "AI may prepare drafts and checks only.",
    "Regulated deliverables require valid human professional approval.",
    "No silent approval."
  ]
}
```

## Reference profile: NHL Global Solution

```json
{
  "firm_type": "ORGANIZATION_SUPPORT",
  "workspace_title": "NHL Global Solution Workspace",
  "workspace_description": "Operate a virtual organization-support firm for project reporting, technical writing, clerical work, and BizKick EDCS documentation/control support.",
  "principal_display_name": "Nur Hernieliana",
  "subscription": {
    "package_code": "VF-ORG-SUPPORT-PILOT",
    "package_name": "Organization Support and EDCS Pilot Workspace",
    "package_status": "ACTIVE",
    "pricing_model": "CONTROLLED_PILOT",
    "commercial_boundary": "NO_LIVE_PAYMENT_CAPTURE",
    "features": [
      "front desk",
      "administration and clerical records",
      "project reporting",
      "technical writing",
      "BizKick EDCS document/control support",
      "sales and proposals",
      "accounts and receivables",
      "audit and export"
    ]
  },
  "service_lines": [
    {
      "service_code": "project_reporting",
      "service_name": "Project Reporting",
      "service_type": "ORGANIZATION_SUPPORT",
      "status": "ACTIVE",
      "requires_human_approval": true,
      "regulated_work": false,
      "delivery_outputs": ["project report draft", "status summary", "evidence index"]
    },
    {
      "service_code": "technical_writing",
      "service_name": "Technical Writing",
      "service_type": "ORGANIZATION_SUPPORT",
      "status": "ACTIVE",
      "requires_human_approval": true,
      "regulated_work": false,
      "delivery_outputs": ["technical writing draft", "review pack"]
    },
    {
      "service_code": "clerical_work",
      "service_name": "Clerical Work",
      "service_type": "ADMINISTRATIVE_SUPPORT",
      "status": "ACTIVE",
      "requires_human_approval": true,
      "regulated_work": false,
      "delivery_outputs": ["register", "correspondence draft", "filing index"]
    },
    {
      "service_code": "bizkick_edcs",
      "service_name": "BizKick EDCS",
      "service_type": "ORGANIZATION_SUPPORT",
      "status": "ACTIVE",
      "requires_human_approval": true,
      "regulated_work": false,
      "delivery_outputs": ["EDCS control index", "document register", "workflow checklist"]
    }
  ],
  "modules": [
    "front_desk",
    "administration",
    "sales_accounts",
    "projects",
    "invoices",
    "ai_workforce",
    "ops",
    "audit"
  ],
  "worker_templates": [
    "front-desk-coordinator",
    "administration-clerk",
    "accounts-clerk",
    "marketing-sales-coordinator",
    "technical-drawing-assistant",
    "project-coordination-assistant"
  ],
  "authority_boundaries": [
    "AI may prepare drafts, registers, reports, and document-control support only.",
    "Human principal approval is required before external sending or client commitment.",
    "No autonomous payment action."
  ]
}
```

## Rehearsal/test workspace classification

PD-H2 and similar private-directory rehearsal firms must be classified as `DIRECTORY_REHEARSAL` or `TEST`.

They may appear in operator tools when useful, but they must not:

- replace seeded pilot firms;
- become the default workspace after smoke tests;
- present themselves as production/pilot subscribed firms;
- contaminate NHL or Formwork records;
- hide the active pilot firm list.

## MT-H2 implementation guidance

The first implementation may use existing fields:

- `firms.active_practices`;
- `firms.metadata.workspace_profile`;
- `subscription_packages.features`;
- `subscription_packages.metadata.workspace_profile`;
- `worker_instances.assigned_services`;
- `worker_templates.code`.

A dedicated database table can be added later if the metadata path becomes too limited.

## Locked acceptance rules

- The workspace shell must not assume Formwork for every firm.
- NHL Global Solution must be expressible as an organization-support firm.
- Subscription packages must describe workspace behavior and business capabilities.
- Rehearsal/test firms must be distinguishable from pilot firms.
- Every selected workspace must preserve tenant and firm scoping.
- Human authority and audit requirements remain visible.

