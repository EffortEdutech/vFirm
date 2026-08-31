---
id: VF-IMPLEMENTATION-BLUEPRINT
title: "vFirm Implementation Blueprint"
version: "1.0"
status: "Architecture Baseline"
source_status: "SYNTHESIZED FROM VF-00 TO VF-24 AND FULL DISCUSSION"
---

# vFirm Implementation Blueprint v1.0

## Purpose

This document translates the Virtual Firm architecture into an implementation-ready blueprint. It does not choose a final framework or vendor. It defines the product shape, core services, bounded contexts, data model priorities, workflow order, and first build sequence.

## Implementation goal

The first implementation must prove:

```text
A verified professional can launch a Virtual Firm, receive a client enquiry,
convert it into a scoped service, deliver controlled work with AI assistance,
approve the required output, invoice the client, and retain an auditable record.
```

Everything else is secondary until that loop works.

## MVP reference loop

```text
Professional onboarding
  -> Firm setup
  -> Service selection
  -> Workforce provisioning
  -> Client enquiry
  -> Intake
  -> Quote
  -> Contract/acceptance
  -> Project
  -> AI-assisted work package
  -> QA
  -> Professional review
  -> Delivery
  -> Invoice
  -> Payment status
  -> Closeout
  -> Knowledge capture
```

## First vertical

The first vertical is `VF-SP-001 Formwork Engineering / Temporary Works`.

The first vertical should include a narrow service set:

- formwork design intake;
- drawing/document upload;
- formwork scope classification;
- missing information detection;
- preliminary layout workflow;
- calculation input preparation;
- deterministic calculation hooks;
- QA checklist;
- professional review;
- deliverable package;
- quote and invoice workflow.

Manufacturer-specific data such as PERI, Doka, ULMA, or others must be governed by licensing, source provenance, and permitted-use policy.

## Bounded contexts

### Foundation

Owns Tenant, Firm, Person, Professional, Principal, BusinessEntity, Brand, Practice, Jurisdiction, Credential references, FirmMembership, Client identity, and Firm lifecycle meanings.

Primary docs: VF-01.

### Workforce

Owns WorkerTemplate, WorkerInstance, WorkforceBlueprint, worker departments, template versioning, provisioning requirements, and authority envelope defaults.

Primary docs: VF-02, VF-WF, VF-09, VF-18.

### Business Infrastructure

Owns CRM, sales, intake, proposal, contract, project operations, finance, billing, payments, document control, knowledge handoff, and client portal workflows.

Primary docs: VF-03 through VF-08.

### Runtime

Owns Event, Task, worker execution, tool invocation, validation, escalation, approval runtime, audit event recording, cost control, and scheduler.

Primary docs: VF-09.

### Governance and Trust

Owns identity provider integration, authorization, credential verification, policy enforcement, approval requirements, auditability, signatures, security, and regulated-work controls.

Primary docs: VF-11, VF-17, VF-18.

### Service Delivery

Owns professional service lifecycle, work packages, evidence bundles, deliverables, service QA, and human approval gates.

Primary docs: VF-19, VF-20.

### Firm Factory

Owns onboarding, certification, readiness tests, firm blueprint generation, provisioning orchestration, and launch.

Primary docs: VF-21.

### Network and Intelligence

Owns marketplace, federation, capacity economy, benchmarking, observatory, and ecosystem intelligence.

Primary docs: VF-14, VF-22, VF-23, VF-24.

## Core services

| Service | Responsibility |
|---|---|
| Identity Service | Human, firm, tenant, actor, and membership records. |
| Firm Service | Firm lifecycle, brand, business entity, practice configuration. |
| Credential Service | Credential evidence references and verification workflow integration. |
| Workforce Service | Worker templates, instances, blueprints, provisioning state. |
| Runtime Service | Events, tasks, worker execution, tool orchestration, audit. |
| Policy Service | Authority, autonomy, risk, approvals, and access policy decisions. |
| CRM Service | Clients, contacts, relationships, leads, communications. |
| Sales Service | Intake, scoping, quote, proposal, acceptance. |
| Contract Service | Engagements, terms, change orders, acceptance criteria. |
| Project Service | Projects, milestones, work packages, status, issues. |
| Document Service | Files, document records, versions, transmittals, deliverables. |
| Finance Service | Invoices, payments, payouts, expenses, margin, exports. |
| Knowledge Service | Knowledge records, source provenance, retrieval, memory handoff. |
| Portal Service | Client-facing status, messages, documents, payments, requests. |
| Audit Service | Immutable material event log and evidence record. |

These can start as modular application services in one deployable system, but the boundaries should remain clear.

## Canonical data priorities

Implement these first:

```text
Tenant
Firm
Person
ProfessionalProfile
PrincipalAssignment
BusinessEntity
Brand
Practice
FirmPractice
Jurisdiction
CredentialReference
ProfessionalAuthority
FirmMembership
Client
FirmClientRelationship
WorkerTemplate
WorkerInstance
WorkforceBlueprint
ServiceDefinition
Lead
Opportunity
Proposal
Engagement
Project
WorkPackage
Task
Document
DocumentVersion
Approval
EvidenceBundle
Invoice
Payment
AuditEvent
```

Every tenant-owned record must include `tenant_id`. Most operational records also include `firm_id`.

## Event-first integration

Business workflows should communicate through events, even if implemented in one database at first.

Baseline event examples:

```text
firm.application_submitted
firm.activated
worker.provisioned
client.created
lead.created
intake.completed
proposal.created
proposal.approved
proposal.sent
proposal.accepted
engagement.created
project.opened
task.created
work_package.ready_for_review
approval.requested
approval.granted
deliverable.issued
invoice.created
payment.received
project.closed
knowledge.captured
```

Events must carry actor, tenant, firm, aggregate, version, time, correlation, causation, and provenance.

## Policy-first execution

Any material action should follow:

```text
Request
  -> identify actor
  -> load tenant and firm context
  -> classify resource and risk
  -> evaluate authority/autonomy policy
  -> validate data
  -> execute
  -> record audit event
  -> emit next event
```

This is especially important for AI worker actions.

## AI worker runtime contract

Every AI worker execution should receive:

```text
task
worker_instance
firm context
allowed data
allowed tools
authority envelope
budget
deadline
required output schema
escalation rules
audit policy
```

Every execution should produce:

```text
structured output
evidence references
confidence or quality indicators where useful
policy result
tool traces
next recommended action
audit event
```

Do not let free-form AI output directly mutate business state.

## Approval model

Approval is not a boolean. It is an event-backed decision object.

An approval must record:

```text
approval_id
tenant_id
firm_id
subject_type
subject_id
subject_version_or_hash
requested_by
approver_actor_id
approver_professional_id where applicable
authority_id where applicable
decision
conditions
evidence_bundle_id
timestamp
authentication_strength
audit_event_id
```

Regulated approval requires an authorized human professional.

## First product screens

Build the product around the operational loop:

1. Principal onboarding.
2. Firm setup.
3. Service catalogue selection.
4. Workforce blueprint preview.
5. Client enquiries.
6. Intake workspace.
7. Proposal workspace.
8. Project workspace.
9. Document register.
10. Review and approval queue.
11. Invoice and payment status.
12. Client portal.
13. Audit/evidence view.

Avoid a landing-page-first build. The first useful screen should help operate a Firm.

## First engineering milestones

### Milestone 1 - Foundation skeleton

Implement tenant, firm, person, professional profile, Principal assignment, practice, client, membership, and audit event records.

### Milestone 2 - Firm setup

Implement a deterministic Firm setup flow with practice selection and basic service eligibility.

### Milestone 3 - Workforce provisioning

Implement WorkerTemplate, WorkerInstance, WorkforceBlueprint, and basic worker activation states.

### Milestone 4 - Intake to proposal

Implement client enquiry, intake session, missing information, scope draft, quote/proposal, and approval before sending.

### Milestone 5 - Project delivery

Implement project, work package, task, document versioning, QA, professional review, and deliverable issue.

### Milestone 6 - Finance loop

Implement invoice, payment status, basic expense and margin tracking, and accountant-ready export placeholder.

### Milestone 7 - Formwork reference pack

Implement a narrow Formwork Engineering pack with controlled intake, document requirements, calculation input structures, QA checklist, and professional approval gate.

## Technical preferences

Use:

- typed schemas;
- explicit state machines;
- event-driven integration;
- row-level tenant isolation or equivalent;
- immutable audit records for material actions;
- object storage for files;
- structured document metadata;
- deterministic validators for high-risk rules;
- AI output schemas;
- policy checks before tool execution;
- provider-agnostic AI abstractions.

Avoid:

- one giant agent;
- agent actions without authority envelopes;
- hidden state mutations from LLM responses;
- mixing tenants;
- using human credentials from AI workers;
- relying on prompts as compliance controls;
- unversioned templates or policies;
- final regulated output without human approval.

## MVP success criteria

The first version is successful when:

1. A Firm can be created with a human Principal.
2. A client can submit a structured enquiry.
3. The system can detect missing information.
4. A proposal can be drafted and approved.
5. A project can be opened from accepted work.
6. AI can assist inside a bounded work package.
7. QA and evidence can be assembled.
8. A professional can explicitly approve or reject.
9. A deliverable can be issued with audit trail.
10. An invoice can be generated.
11. The complete record can be inspected and exported.

