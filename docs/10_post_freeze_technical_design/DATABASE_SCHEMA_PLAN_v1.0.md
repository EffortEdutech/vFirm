---
id: VF-DATABASE-SCHEMA-PLAN
title: "vFirm Database Schema Plan"
version: "1.0"
status: "Post-Freeze Technical Design"
source_status: "DERIVED FROM CANONICAL SCHEMA CATALOGUE V1.0"
---

# vFirm Database Schema Plan v1.0

## Purpose

This plan converts the canonical schema catalogue into an MVP persistence model. It preserves canonical meanings while allowing pragmatic physical tables.

## Database principles

1. Every tenant-owned table includes `tenant_id`.
2. Operational Firm records include `firm_id` unless they are platform-level reference records.
3. Material records include actor attribution and timestamps.
4. State changes emit events and audit records.
5. Soft retirement is preferred over destructive deletion for material records.
6. AI actors and human actors are separate identities.
7. Approval, evidence, and document versions are first-class records.

## Common columns

Use this common envelope where applicable:

```text
id uuid primary key
tenant_id uuid not null
firm_id uuid null
status text not null
version integer not null default 1
created_at timestamptz not null
created_by_actor_id uuid null
updated_at timestamptz not null
updated_by_actor_id uuid null
data_classification text not null default 'INTERNAL'
provenance jsonb not null default '{}'
metadata jsonb not null default '{}'
```

## MVP table groups

### Foundation

| Table | Purpose | Key relationships |
|---|---|---|
| tenants | Tenant isolation boundary. | Root tenant scope. |
| actors | Unified actor identity for humans, AI, system, external service. | Links to person/worker/system. |
| persons | Human person identity. | Used by professionals and firm members. |
| firms | Virtual Firm record. | tenant, principal assignment, brand, business entity. |
| business_entities | Legal/commercial entity. | firm contracting basis. |
| brands | Client-facing firm brand. | firm. |
| professional_profiles | Professional identity and disciplines. | person. |
| principal_assignments | Principal/control assignment. | firm, person. |
| practices | Platform reference practices. | service definitions. |
| firm_practices | Firm enabled practices. | firm, practice. |
| jurisdictions | Jurisdiction reference data. | authority, credential. |
| credential_references | Credential evidence refs. | professional, jurisdiction. |
| professional_authorities | Human authority grants. | firm, professional, practice, jurisdiction. |

### Client and sales

| Table | Purpose |
|---|---|
| clients | Client organization or individual. |
| contacts | Client contact records. |
| firm_client_relationships | Relationship between Firm and Client. |
| leads | Captured enquiries. |
| intake_sessions | Structured intake workflow. |
| missing_information_items | Missing/uncertain required data. |
| scope_drafts | Structured service scope draft. |
| price_build_ups | Pricing calculation record. |
| proposals | Client proposal package. |

### Contract, project, and delivery

| Table | Purpose |
|---|---|
| engagements | Accepted commercial work. |
| projects | Delivery container. |
| milestones | Optional project milestones. |
| work_packages | Work units inside project. |
| tasks | Runtime assignable units. |
| task_executions | Execution attempt records. |
| qa_checks | QA checklist result records. |

### Workforce runtime

| Table | Purpose |
|---|---|
| worker_templates | Versioned worker definitions. |
| worker_instances | Firm-provisioned workers. |
| workforce_blueprints | Firm/service workforce plans. |
| authority_envelopes | AI worker allowed action/tool/data envelope. |
| tool_registrations | Registered tools. |
| tool_invocations | Audited tool calls. |

### Documents, evidence, approvals

| Table | Purpose |
|---|---|
| documents | Logical document record. |
| document_versions | Immutable document version metadata. |
| storage_objects | File/object storage metadata. |
| evidence_bundles | Evidence package for approval/delivery. |
| approvals | Explicit approval decisions. |
| deliverable_issues | Issued deliverable records. |

### Finance

| Table | Purpose |
|---|---|
| invoices | Invoice records. |
| invoice_lines | Invoice line items. |
| payment_statuses | Payment status placeholder/provider references. |
| expenses | Optional MVP expense tracking placeholder. |
| margin_snapshots | Derived commercial snapshot. |

### Policy, events, and audit

| Table | Purpose |
|---|---|
| policy_definitions | Versioned policy definitions/config. |
| policy_decisions | Policy evaluation results. |
| event_log | Canonical events. |
| audit_events | Human-readable/material audit records. |

### Service packs and Formwork

| Table | Purpose |
|---|---|
| service_definitions | Platform service definitions. |
| service_skus | Scope/pricing variants. |
| firm_services | Firm-enabled services. |
| service_pack_versions | Versioned service pack metadata. |
| service_pack_requirements | Intake/document/output requirements. |
| formwork_intake_profiles | Formwork-specific structured intake. |
| formwork_calculation_inputs | Calculation input preparation records. |
| formwork_qa_checklists | Formwork-specific QA checklist results. |

## Required constraints

- Foreign keys should preserve tenant/firm ownership; application policy must also verify tenant boundary.
- Unique constraints should include tenant/firm scope where records are tenant-owned.
- Document version hashes should be immutable once approved or issued.
- Approval subject hash/version must match the approved object version.
- `event_log.idempotency_key` should be unique where provided.
- `audit_events.correlation_id` should be indexed.

## Recommended indexes

```text
(tenant_id)
(tenant_id, firm_id)
(tenant_id, firm_id, status)
(tenant_id, firm_id, created_at)
(actor_id)
(correlation_id)
(aggregate_type, aggregate_id)
(resource_type, resource_id)
(project_id)
(relationship_id)
(document_id, revision)
```

## Row-level security target

If using PostgreSQL/Supabase or similar, implement row-level security around:

```text
tenant_id = current tenant context
firm_id in actor allowed firm scope
client portal actors restricted to their relationship/project/document scope
AI workers restricted to assigned task/work package/service scope
```

## Migration order

1. Foundation and actors.
2. Practices/services/firm service enablement.
3. Client/intake/proposal.
4. Engagement/project/work package/task.
5. Documents/evidence/approval.
6. Policy/event/audit.
7. Finance.
8. Formwork service pack tables.

## Open implementation choices

- Exact database provider.
- ORM/query builder.
- JSON schema validation library.
- Object storage provider.
- Full text/vector search provider for future knowledge memory.

These choices should be made in implementation planning without changing canonical meanings.
