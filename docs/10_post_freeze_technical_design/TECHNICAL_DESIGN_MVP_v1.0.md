---
id: VF-MVP-TECHNICAL-DESIGN
title: "vFirm MVP Technical Design"
version: "1.0"
status: "Post-Freeze Technical Design"
source_status: "DERIVED FROM ARCHITECTURE BASELINE V1.0"
---

# vFirm MVP Technical Design v1.0

## Purpose

This document translates frozen Architecture Baseline v1.0 into the first buildable product slice. It does not reopen the architecture baseline.

## MVP objective

Prove one safe professional operating loop:

```text
Professional -> Firm -> Client -> Intake -> Proposal -> Engagement -> Project
-> Work Package -> AI-assisted output -> QA -> Evidence -> Human Approval
-> Deliverable Issue -> Invoice -> Audit -> Knowledge Capture
```

## Product boundary

Included in MVP:

- Tenant and Firm foundation.
- Human Principal onboarding placeholder.
- Professional profile and authority grant records.
- Client and relationship records.
- Formwork service enablement.
- Intake and missing information workflow.
- Proposal draft and approval before issue.
- Engagement creation from accepted proposal.
- Project and work package management.
- Bounded AI worker task execution placeholder.
- Document register and document version metadata.
- Evidence bundle assembly.
- Human professional approval gate.
- Deliverable issue record.
- Invoice and payment status placeholder.
- Audit event log.

Excluded from MVP:

- Future architecture expansion modules.
- Public marketplace.
- Global observatory UI.
- Multi-firm federation.
- Fully automated regulated engineering design.
- Professional signature automation.
- Payment provider integration beyond status placeholders.
- Manufacturer-specific formwork claims without licensed source governance.

## Bounded services for first build

| Service | Build form | Owns |
|---|---|---|
| Identity/Foundation | Modular app service | Tenant, Firm, Person, Principal, ProfessionalProfile, ProfessionalAuthority |
| Client/CRM | Modular app service | Client, Contact, FirmClientRelationship, Lead |
| Sales/Intake | Modular app service | IntakeSession, MissingInformationItem, ScopeDraft, Proposal |
| Project Delivery | Modular app service | Engagement, Project, WorkPackage, Task |
| Workforce Runtime | Modular app service | WorkerTemplate, WorkerInstance, TaskExecution, ToolInvocation placeholder |
| Document/Evidence | Modular app service | Document, DocumentVersion, EvidenceBundle, DeliverableIssue |
| Policy/Audit | Shared core service | PolicyDecision, Approval, AuditEvent |
| Finance | Modular app service | Invoice, PaymentStatus |
| Formwork Pack | Configuration/service pack | ServiceDefinition, intake requirements, QA checklist, output templates |

These can ship in one deployable application initially, but the ownership boundaries must remain explicit.

## Primary user roles

| Role | Actor type | MVP permissions |
|---|---|---|
| Platform Admin | HUMAN | Configure baseline seed data and tenants. |
| Principal | HUMAN | Own Firm, approve controlled outputs, approve proposals, view audit. |
| Firm Staff | HUMAN | Assist intake, project, document, finance workflows where assigned. |
| Client Contact | EXTERNAL_SERVICE/HUMAN placeholder | Submit enquiry, provide documents, view issued deliverables. |
| AI Worker | AI_AGENT | Execute assigned bounded tasks only. |
| System | SYSTEM | Emit system events, run validation, maintain derived states. |

## MVP state machines

### Firm lifecycle

```text
DRAFT -> SUBMITTED -> READY_FOR_ACTIVATION -> ACTIVE -> SUSPENDED -> RETIRED
```

MVP may seed the Firm directly to `ACTIVE` only in development fixtures, but production flow must preserve the lifecycle.

### Intake lifecycle

```text
STARTED -> NEEDS_INFORMATION -> COMPLETE -> CONVERTED_TO_PROPOSAL -> CLOSED
```

### Proposal lifecycle

```text
DRAFT -> APPROVAL_REQUIRED -> APPROVED -> SENT -> ACCEPTED -> REJECTED -> EXPIRED
```

### Project lifecycle

```text
OPEN -> IN_PROGRESS -> READY_FOR_REVIEW -> APPROVED_FOR_DELIVERY -> DELIVERED -> CLOSED
```

### Work package lifecycle

```text
CREATED -> ASSIGNED -> IN_PROGRESS -> OUTPUT_READY -> QA_FAILED -> QA_PASSED -> APPROVAL_REQUESTED -> ACCEPTED -> REWORK_REQUIRED
```

### Document version lifecycle

```text
DRAFT -> UNDER_REVIEW -> APPROVED -> ISSUED -> SUPERSEDED -> RETIRED
```

## First vertical service

MVP service:

```text
VF-SP-001 Formwork Design Support - Preliminary Wall/Slab Package
```

The service produces structured support outputs for professional review. It must not automatically issue final engineering design or safety confirmation.

## AI worker execution rule

AI worker output may create draft artifacts, structured extraction, checklist findings, recommendations, and missing information requests.

AI worker output must not:

- approve proposals or deliverables;
- issue regulated client-facing conclusions;
- sign documents;
- mutate high-risk workflow state without policy permission;
- bypass deterministic validation for engineering-sensitive checks.

## MVP screens

1. Builder/admin seed setup.
2. Principal/Firm dashboard.
3. Firm setup and service enablement.
4. Client/lead list.
5. Intake workspace.
6. Proposal workspace.
7. Project workspace.
8. Work package/task panel.
9. Document register.
10. Evidence bundle view.
11. Approval queue.
12. Deliverable issue record.
13. Invoice/payment status.
14. Audit trail viewer.

## MVP milestones

| Milestone | Exit criteria |
|---|---|
| M1 Foundation | Tenant, Firm, Person, Principal, ProfessionalAuthority, AuditEvent records exist. |
| M2 Service enablement | Firm can enable Formwork service with eligibility state. |
| M3 Client intake | Client enquiry creates Lead and IntakeSession; missing info detected. |
| M4 Proposal | Proposal draft created, policy checked, approved, and sent. |
| M5 Project delivery | Accepted proposal creates Engagement, Project, WorkPackage, Task. |
| M6 Worker assistance | AI worker placeholder produces structured draft output with audit trail. |
| M7 QA/evidence/approval | EvidenceBundle assembled; human approval required before issue. |
| M8 Delivery/finance | Deliverable issue and invoice records created with audit events. |
| M9 Formwork vertical | Formwork intake, checklist, and service pack outputs prove vertical readiness. |

## Technical design dependencies

This document should be implemented with:

- `DATABASE_SCHEMA_PLAN_v1.0.md`
- `API_CONTRACT_PLAN_v1.0.md`
- `EVENT_PAYLOAD_SCHEMA_PLAN_v1.0.md`
- `POLICY_TEST_PLAN_v1.0.md`
- `FORMWORK_SERVICE_PACK_SPEC_v1.0.md`

## Done definition

The MVP technical design is ready for coding when every milestone has:

1. database tables or persistence model;
2. API contracts;
3. emitted events;
4. policy checks;
5. audit events;
6. basic tests;
7. Formwork-specific fixture where applicable.


