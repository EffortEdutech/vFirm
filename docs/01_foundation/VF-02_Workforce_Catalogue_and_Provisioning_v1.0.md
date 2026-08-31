---
id: VF-02
title: "Workforce Catalogue, Composition & Provisioning"
version: "1.0"
status: "Architecture Baseline"
source_status: "FORMALIZED FOR ARCHITECTURE BASELINE V1.0"
---

# VF-02 - Workforce Catalogue, Composition & Provisioning

## Purpose

VF-02 defines how the Virtual Firm Platform describes, selects, configures, provisions, and retires virtual workers for a Firm. It formalizes the catalogue and provisioning layer between VF-01 foundation objects and the VF-09 runtime.

VF-02 does not execute workers. VF-09 owns runtime execution, task handling, event handling, approval execution, audit mechanics, and operational scheduling. VF-02 owns templates, composition rules, workforce blueprints, provisioning requirements, and lifecycle semantics.

## Core principle

Every Virtual Firm receives a workforce, but no AI worker receives professional authority.

The customer-facing metaphor may be "virtual employee." The architecture term is `WorkerTemplate` and `WorkerInstance`. A worker can assist, prepare, draft, route, check, monitor, and execute bounded actions, but regulated judgment, professional sign-off, and controlled approvals remain with authorized humans under VF-01, VF-11, VF-17, VF-18, and VF-19.

## Workforce classes

| Class | Name | Meaning |
|---|---|---|
| `WF-C` | Common Workforce | Workers used by most firms regardless of practice. |
| `WF-S` | Specialist Workforce | Practice-specific or service-specific workers supplied by Practice Packs and Service Delivery Packs. |
| `WF-X` | Executive Workforce | Workers that support the Principal with firm intelligence, planning, reporting, and business management. |
| `WF-G` | Governance Workforce | Workers focused on QA, compliance checks, audit preparation, escalation, and control monitoring. |
| `WF-CU` | Custom Workforce | Firm-configured workers created within platform limits and policy review. |

## Standard worker definition

Every `WorkerTemplate` MUST define:

```text
worker_template_id
name
version
workforce_class
department
mission
responsibilities
inputs
outputs
skills
knowledge_sources
tools
permissions
authority_envelope_template
supervisor_model
escalation_rules
workflow_triggers
kpis
cost_profile
operating_policy
risk_classification
audit_requirements
```

Every `WorkerInstance` MUST bind a template to:

```text
tenant_id
firm_id
worker_instance_id
worker_template_id
version
assigned_practice_or_service
enabled_tools
enabled_knowledge
authority_envelope
budget_limits
runtime_policy
status
provisioned_by
provisioned_at
```

Templates are global or pack-owned. Instances are tenant and firm scoped. A template never contains private firm data.

## Common workforce baseline

The baseline common workforce SHOULD include:

| ID | Worker | Department | Baseline authority |
|---|---|---|---|
| `VF-WF-001` | Receptionist Agent | Front Office | Intake and routing only. |
| `VF-WF-002` | Client Intake Agent | Front Office | Structured data collection; no professional advice. |
| `VF-WF-003` | CRM Agent | Front Office | Maintain relationship records. |
| `VF-WF-004` | Sales Agent | Sales | Follow-up and qualification inside approved scripts/rules. |
| `VF-WF-005` | Research Agent | Knowledge | Source-backed research and summaries. |
| `VF-WF-006` | Proposal Agent | Sales | Draft scopes and proposals for approval. |
| `VF-WF-007` | Project Manager Agent | Operations | Coordinate tasks, deadlines, and dependencies. |
| `VF-WF-008` | Document Controller Agent | Operations | Document registers, versions, issue states. |
| `VF-WF-009` | QA Agent | Governance | Completeness and consistency checks. |
| `VF-WF-010` | Finance Manager Agent | Commercial | Revenue, cost, margin, and cash-flow tracking. |
| `VF-WF-011` | Accounting Agent | Commercial | Bookkeeping preparation and accountant-ready outputs. |
| `VF-WF-012` | Billing Agent | Commercial | Invoice preparation, reminders, and payment status. |
| `VF-WF-013` | Collections Agent | Commercial | Polite collection workflow under firm policy. |
| `VF-WF-014` | Marketing Agent | Growth | Content and campaign support inside brand policy. |
| `VF-WF-015` | Legal Operations Agent | Commercial | Contract/NDA workflow support; no legal advice unless governed by a legal pack. |
| `VF-WF-016` | Administration Agent | Operations | Internal coordination and records. |
| `VF-WF-017` | Compliance Monitor Agent | Governance | Policy, evidence, and exception monitoring. |

## Specialist workforce

Specialist workers are introduced by Practice Packs and Service Delivery Packs. Examples include Formwork Designer Agent, Load Calculation Agent, CAD/BIM Agent, Technical Writer Agent, Energy Analyst Agent, Fire Safety Review Agent, Data Analyst Agent, Accounting Review Agent, and Legal Research Agent.

Specialist workers MUST declare:

- practice and service scope;
- jurisdiction assumptions;
- source knowledge and deterministic tools;
- quality gates;
- escalation triggers;
- required human reviewer role;
- prohibited representations;
- output status before human approval.

For regulated or controlled work, the output of a specialist worker is preparatory unless a qualified human professional explicitly approves it.

## Workforce Blueprint

A `WorkforceBlueprint` is the planned organization chart for a Firm.

```text
FirmBlueprint
  -> Practice selection
  -> Service selection
  -> WorkforceBlueprint
  -> WorkerInstance provisioning
  -> Runtime registration
  -> Readiness testing
```

The blueprint MUST include tenant, firm, Principal, practice, services, selected worker templates, required tools, knowledge packs, default supervisors, authority envelopes, budget limits, and readiness tests.

The blueprint MUST be deterministic. An LLM MAY recommend a workforce, but the actual provisioning plan MUST be validated by policy and explicit configuration rules.

## Provisioning lifecycle

Worker instance states are:

```text
DRAFT -> APPROVED -> PROVISIONING -> READY_FOR_TEST -> ACTIVE
```

Exceptional states are:

```text
DISABLED
SUSPENDED
REQUIRES_REVIEW
RETIRED
FAILED_PROVISIONING
```

Activation requires:

1. Active Firm or authorized pre-launch test Firm state.
2. Valid `tenant_id` and `firm_id`.
3. Approved worker template version.
4. Valid authority envelope.
5. Bound tools and permissions.
6. Bound knowledge sources and data scopes.
7. Supervisor and escalation routes.
8. Budget and cost controls.
9. Audit identity.
10. Readiness checks for regulated or controlled workflows.

## Authority and autonomy

VF-02 adopts the VF-18 autonomy ladder but stores it as a provisioning constraint:

| Level | Meaning |
|---|---|
| `A0_OBSERVER` | Read, monitor, classify, summarize. |
| `A1_ASSISTANT` | Draft, prepare, recommend; human executes. |
| `A2_SUPERVISED_EXECUTOR` | Execute predefined actions with approval for material consequence. |
| `A3_CONDITIONAL_AUTONOMOUS` | Execute bounded workflow actions under explicit rules. |
| `A4_AUTONOMOUS_OPERATOR` | Manage a bounded workflow with escalation at authority boundaries. |
| `A5_STRATEGIC_AUTONOMOUS` | Reserved/highly restricted; strategic decisions remain human-controlled by default. |

The older catalogue language that called A5 "Professional Authority" is superseded for AI workers. Professional authority belongs only to humans under VF-01. AI autonomy and human professional authority are separate dimensions.

## Departments

Baseline departments are:

```text
FRONT_OFFICE
SALES
PROJECT_OPERATIONS
PROFESSIONAL_PRODUCTION
DOCUMENTS
KNOWLEDGE
FINANCE
ACCOUNTING
ADMINISTRATION
GOVERNANCE
SECURITY
MANAGEMENT
```

Departments organize workforce composition. They do not create authorization.

## Cross-module contracts

| Module | VF-02 provides | Module owns |
|---|---|---|
| VF-01 | Workforce references to Firm, Practice, Principal, membership, authority context | Identity, firm, authority, tenancy |
| VF-09 | Worker templates, worker instances, workforce blueprint | Runtime execution and event/task handling |
| VF-10 | Provisioning requirements | Infrastructure orchestration |
| VF-11/VF-17 | Required role, credential, trust, and access references | Verification, IAM, authorization enforcement |
| VF-18 | Declared autonomy ceilings and safety boundaries | AI governance, policy evaluation, runtime safety |
| VF-19 | Specialist worker requirements by service | Service lifecycle and delivery kernel |
| VF-20 | Service Delivery Pack worker requirements | Productized service packaging |
| VF-21 | Workforce readiness criteria | Firm launch orchestration and certification |

## Conformance rules

1. No worker instance without `tenant_id`, `firm_id`, template version, audit identity, and authority envelope.
2. No worker may inherit a human session, credential, signature, or professional authority.
3. No custom worker may bypass template registration, policy review, permissions, budget, and audit.
4. No specialist worker may be activated for a service unless the Firm is eligible for that service.
5. No regulated output may become final solely through worker execution.
6. No worker may access unrelated tenants, firms, clients, projects, or documents.
7. No runtime action may exceed the provisioned authority envelope.
8. No workforce blueprint may be treated as active until readiness checks pass.

## Baseline decision

VF-02 freezes the workforce catalogue and provisioning semantics for Architecture Baseline v1.0. Detailed executable schemas, manifests, event payloads, runtime orchestration, and policy files remain shared asset and implementation work, but they MUST preserve the separation between AI autonomy and human professional authority.

