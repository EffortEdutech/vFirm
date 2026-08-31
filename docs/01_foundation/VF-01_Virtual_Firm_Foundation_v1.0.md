---
id: VF-01
title: "Virtual Firm Foundation & Core Domain Model"
version: "1.0"
status: "Architecture Baseline"
source_status: "FORMALIZED FOR ARCHITECTURE BASELINE V1.0"
---

# VF-01 - Virtual Firm Foundation & Core Domain Model

## Purpose

VF-01 defines the canonical identity, ownership, tenancy, professional-authority, practice, jurisdiction, membership, client-relationship, and lifecycle model for the Virtual Firm Platform. Other VF modules MUST reference these foundation objects rather than create competing definitions.

The words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative.

## Foundation principles

1. The client buys from the Virtual Firm, not from an AI worker.
2. A human Professional Principal owns or controls the practice and client-facing brand and remains the human authority.
3. AI capability does not create professional authority.
4. Every regulated deliverable MUST trace to a responsible, currently authorized human professional.
5. Approval MUST be explicit, attributable, and recorded; absence of objection is not approval.
6. Every material object and action MUST be tenant-scoped and attributable.
7. A Firm, Business Entity, Brand, and human Professional remain distinct even when one person controls all four.
8. Credential verification, jurisdiction, scope of practice, engagement, and policy jointly constrain authority.
9. Firm and client data MUST be portable where legally and contractually permissible.
10. Liability MUST reflect law, engagement, insurance, and entity structure; the model MUST NOT assume 100 percent personal liability.

## Scope and module boundary

VF-01 owns canonical identifiers and semantics for Tenant, Firm, Person, Principal, Professional, BusinessEntity, Brand, Practice, Jurisdiction, Credential references, ProfessionalAuthority, FirmMembership, Client, FirmClientRelationship, and the Firm lifecycle.

It does not own workforce composition (VF-02); task, agent, event, and approval execution (VF-09); credential verification, authentication, authorization, signatures, or security enforcement (VF-11/VF-17); agent autonomy (VF-18); service-delivery workflows (VF-19); or onboarding, provisioning, testing, certification, and launch orchestration (VF-21).

## Tenancy and isolation

A `Tenant` is the primary logical isolation boundary for data, configuration, identities, policies, encryption context, metering, and audit. Every tenant-owned record MUST contain `tenant_id`. Cross-tenant operations MUST be explicit, authorized, purpose-bound, and audited. Federation does not merge tenants.

A `Firm` is the client-facing professional service business configured on the platform. It is not merely an account, Tenant, Business Entity, Brand, or AI workforce. The normal relationship is one primary Tenant to one Firm. An approved enterprise Tenant MAY contain multiple Firms, but every resource retains an unambiguous `firm_id` and policy boundary.

Canonical resource scope is:

`platform -> tenant -> firm -> client/project/resource`

Identifiers never grant access. Authorization evaluates actor, tenant, firm, role, resource, action, context, jurisdiction, credential, and risk as applicable.

## Canonical domain model

```text
Person --< PrincipalAssignment >-- Firm --< FirmMembership >-- Person/Organization
  |                                  |-- Brand
  |                                  |-- Tenant
  |                                  |-- BusinessEntity
  |                                  |-- FirmPractice --> Practice
  |                                  +-- FirmClientRelationship --> Client
  +-- ProfessionalProfile
         |-- Credential reference
         +-- ProfessionalAuthority --> Jurisdiction + Practice/Service
```

| Entity | Canonical meaning | Required invariant |
|---|---|---|
| `Person` | A unique human identity. | MUST NOT represent an AI worker or shared login. |
| `PrincipalAssignment` | Effective-dated ownership/control and governance relationship between a Person and Firm. | An Active Firm requires an active human Principal; professional authority is not inferred. |
| `ProfessionalProfile` | A Person acting professionally with discipline, credential, and authority references. | Professional status alone never grants sign-off. |
| `BusinessEntity` | Legal person/organization used for contract, tax, insurance, and liability. | Remains distinct from Firm and Brand. |
| `Firm` | Professional service business engaged by clients. | Belongs to a Tenant and references Principal assignment(s) and a contracting Business Entity or documented lawful alternative. |
| `Brand` | Client-facing trading identity and presentation assets. | MUST NOT imply unheld licence, certification, or legal status. |
| `Practice` | Governed area of professional or business activity. | Declares regulatory classification and applicable packs. |
| `FirmPractice` | Firm configuration of a Practice in stated jurisdictions. | Practice approval and service eligibility are separate. |
| `Jurisdiction` | Legal, regulatory, contractual, or operational rule context. | Uses stable codes and effective-dated rules. |
| `Credential` | Reference to licence, registration, qualification, certification, or insurance evidence. | Verification is owned by VF-17; presence alone grants no authority. |
| `ProfessionalAuthority` | Explicit grant of what a Professional may review, approve, issue, or sign. | Bounded by practice, action, jurisdiction, credentials, risk, firm, and time; sign-off is human only. |
| `FirmMembership` | Person/organization relationship to a Firm. | Membership MUST NOT silently confer authority. |
| `Client` | Party receiving, commissioning, or paying for service. | Tenant-scoped; cross-tenant deduplication MUST NOT expose data. |
| `FirmClientRelationship` | Governed commercial relationship between Firm and Client. | Records owner, status, confidentiality basis, and engagement references; it is not itself a contract. |

### Terms that remain distinct

- `Principal`: a human governance and ownership/control role in relation to a Firm.
- `Professional`: a human acting under verified qualifications and bounded authority.
- `Firm`: the operating professional service business presented to clients.
- `BusinessEntity`: the legal contracting, tax, insurance, and liability vehicle.

A sole practitioner may occupy all relationships, but the records remain separate. A Principal need not be authorized for every service. A Professional may be a member, contractor, or specialist without ownership.

Actor types are `HUMAN`, `AI_AGENT`, `SYSTEM`, and `EXTERNAL_SERVICE`. A Professional and Principal MUST be `HUMAN`. AI workers MUST use their own identities and MUST NOT reuse a Principal's credentials, session, signature, or professional authority.

## Practice, regulation, and eligibility

Every Practice and Service MUST declare a jurisdiction-specific, effective-dated classification:

- `REGULATED`: law or professional rules restrict performance, approval, issuance, or representation.
- `CONTROLLED`: material safety, financial, contractual, or fiduciary risk requires defined human control.
- `NON_REGULATED`: no identified regulated sign-off, while ordinary quality, contract, privacy, and consumer duties remain.
- `UNDETERMINED`: incomplete classification; production offering and issuance MUST be blocked.

Marketing a Service and approving its deliverable are separate permissions. VF-01 supplies identity and authority references to VF-21's eligibility rule:

`Service + Practice + Credentials + Jurisdiction + Risk + Insurance + Firm Policy + Platform Requirements -> Eligible / Not Eligible`

Eligibility permits configuration or assignment; it is not deliverable approval.

## Professional authority

Effective authority is the intersection of:

`Human identity + Professional profile + Verified credential + Scope of practice + Jurisdiction + Firm role + Engagement role + Risk policy + Effective time`

If a mandatory term is absent, incompatible, expired, suspended, or revoked, the regulated action MUST be denied or escalated.

A `ProfessionalAuthority` MUST include `authority_id`, `tenant_id`, `firm_id`, `professional_id`, practice/service scope, permitted actions, jurisdiction, required credentials, risk/technical/financial limits, validity period, grantor, policy basis, status, revocation reason, and audit metadata. Status is `PROPOSED`, `ACTIVE`, `SUSPENDED`, `EXPIRED`, or `REVOKED`; only `ACTIVE` grants authority.

An `Approval` is a VF-09/VF-11 execution object, not a boolean attribute. Regulated approval MUST reference the human Professional, authority grant, credential evidence, jurisdiction, subject version/hash, decision, timestamp, and EvidenceBundle. It cannot be delegated to AI.

## Ownership, control, and membership

Firm ownership and operational control MUST be explicit, effective-dated, and auditable. They MUST NOT be inferred from administrator access, billing contact, or title. A change of owner or controlling Principal triggers governance review and MAY trigger credential, insurance, contract, certification, and client-notification checks.

Membership types MAY include `PRINCIPAL`, `PROFESSIONAL`, `EMPLOYEE`, `CONTRACTOR`, `EXTERNAL_SPECIALIST`, `CLIENT_USER`, and `ADMINISTRATOR`. Status is `INVITED`, `ACTIVE`, `SUSPENDED`, `ENDED`, or `REVOKED`. Membership and authorization remain separate.

## Firm-client relationship

The Virtual Firm is client-facing unless an engagement explicitly defines another lawful contracting arrangement. AI workers and platform services operate behind the Firm and MUST NOT be represented as licensed professionals.

A `FirmClientRelationship` records `relationship_id`, tenant, firm, client, type, status, responsible owner, origin, consent/legal-basis references, confidentiality/conflict-check references, contracting Business Entity, engagements, effective dates, retention class, and audit metadata. Status is `PROSPECT`, `QUALIFYING`, `ACTIVE`, `DORMANT`, `RESTRICTED`, or `CLOSED`.

Projects and engagements MUST reference a relationship. Closure MUST NOT erase retention, audit, payment, dispute, or legal-hold obligations.

## Identifiers and common record envelope

Canonical objects use opaque, globally unique, immutable IDs:

| Object | ID |
|---|---|
| Tenant / Firm | `tenant_id` / `firm_id` |
| Person / Professional | `person_id` / `professional_id` |
| PrincipalAssignment | `principal_assignment_id` |
| BusinessEntity / Brand | `business_entity_id` / `brand_id` |
| Practice / FirmPractice | `practice_id` / `firm_practice_id` |
| Jurisdiction | `jurisdiction_id` |
| Credential / Authority | `credential_id` / `authority_id` |
| FirmMembership | `membership_id` |
| Client / Relationship | `client_id` / `relationship_id` |

Names and human-readable codes are mutable aliases and MUST NOT be foreign keys. External IDs record issuer, namespace, value, verification status, and jurisdiction; they do not replace internal IDs.

Tenant records MUST carry `id`, `tenant_id`, applicable `firm_id`, `version`, explicit `status`, effective dates, created/updated timestamps and actor IDs, `data_classification`, and provenance. Effective dating or soft retirement SHOULD preserve audit and authority history.

## Firm lifecycle

Canonical progression is:

`APPLICATION -> IDENTITY_PENDING -> PROFESSIONAL_VERIFICATION -> PRACTICE_REVIEW -> BUSINESS_CONFIGURATION -> PROVISIONING -> TESTING -> CERTIFICATION -> ACTIVE`

Exceptional or terminal states are `SUSPENDED`, `REACTIVATION`, `RETIRED`, and `REJECTED`. VF-21 owns orchestration and readiness evidence; VF-01 owns meanings and invariants.

| State | Minimum meaning |
|---|---|
| `APPLICATION` | Application exists; no production authority. |
| `IDENTITY_PENDING` | Human/organization identity checks incomplete. |
| `PROFESSIONAL_VERIFICATION` | Credentials and authority under review. |
| `PRACTICE_REVIEW` | Practice, jurisdiction, service, governance, and insurance fit under review. |
| `BUSINESS_CONFIGURATION` | Brand, legal, commercial, finance, privacy, and policies being configured. |
| `PROVISIONING` | Tenant, workforce, tools, knowledge, and controls being provisioned. |
| `TESTING` | Operational and failure/readiness tests underway. |
| `CERTIFICATION` | Platform readiness evidence under review; not a government licence. |
| `ACTIVE` | Operations allowed only for enabled services and effective authority. |
| `SUSPENDED` | Specified operations blocked; preservation/remediation obligations continue. |
| `REACTIVATION` | Suspension conditions being remediated and retested. |
| `RETIRED` | No new work; retention, export, audit, and legal duties continue. |
| `REJECTED` | Application closed with reason and appeal/reapplication policy. |

Transitions MUST be deterministic, policy-evaluated, attributable, and audited. No LLM may directly mutate Firm state. Activation requires verified identity, an active human Principal, lawful contracting configuration, approved Practices, required credential/insurance checks, tenant isolation, tested approvals/escalations, and readiness evidence.

Suspension records scope, reason, time, remediation permissions, client/project impact, and reinstatement authority. Retirement supports client notification, engagement closure/transfer, record retention, export, and access revocation.

## Data custody and portability

Legal ownership and controllership depend on law and contract and MUST be captured in policy and engagement metadata. The Firm is the primary business custodian of operational records; the platform acts only under documented roles. Professional identity/credential evidence remains distinguishable from Firm records. Client data and derived knowledge preserve provenance, confidentiality, tenant, and use restrictions.

The platform MUST export legally permissible business, client, project, financial, configuration, knowledge, approval, and audit records in documented machine-readable formats while preserving IDs, relationships, timestamps, provenance, versions, and integrity metadata. Portability does not override confidentiality, IP, retention, legal hold, security, or third-party licences.

## Cross-module contracts

| Consumer | VF-01 supplies | Consumer owns |
|---|---|---|
| VF-02 | Firm, Practice, eligibility and membership context | Workforce templates, composition, provisioning definitions |
| VF-03-VF-08 | Tenant/Firm/Client relationship and actor references | CRM, contract, project, finance, document, portal state |
| VF-09 | Actor, tenant, firm, membership, authority references | Event, Task, AgentInstance, Approval runtime, execution audit |
| VF-11/VF-17 | Person, Professional, Firm, Jurisdiction, credential references | Verification, authorization, signatures, trust, security |
| VF-18 | Firm and actor scope | AI risk, autonomy, safety, agent lifecycle |
| VF-19 | FirmPractice, eligibility, ProfessionalAuthority, client relationship | Scope, work packages, deliverables, evidence, QA, delivery |
| VF-21 | Firm state meanings and invariants | Onboarding, provisioning, testing, certification, launch commands |
| VF-22 | Stable tenant, firm, professional, authority references | Federation agreements and shared-work controls |

Consumers MAY extend objects through owned aggregates or references but MUST NOT redefine VF-01 identities or weaken invariants.

## Reserved events

VF-01 reserves `tenant.created`; `firm.application_submitted`, `firm.state_changed`, `firm.activated`, `firm.suspended`, `firm.reactivated`, `firm.retired`; `principal.assigned`, `principal.assignment_changed`, `principal.assignment_ended`; `professional.profile_created`, `professional.authority_granted`, `professional.authority_suspended`, `professional.authority_revoked`, `professional.authority_expired`; membership and practice lifecycle events; and `firm_client_relationship.created`, `.activated`, `.restricted`, `.closed`.

The future event catalogue owns payload schemas. Events MUST carry event ID/type/schema version/time, actor, tenant, applicable firm, aggregate ID/type/version, correlation/causation IDs, and provenance.

## Conformance rules

1. No Active Firm without an active human Principal.
2. No regulated sign-off without effective ProfessionalAuthority and credential/jurisdiction evidence.
3. No AI, system, shared account, or external service represented as a Professional or Principal.
4. No membership, ownership, admin role, badge, or credential silently treated as professional authority.
5. No tenant-owned record or material action without tenant scope and attribution.
6. No cross-tenant access without explicit authorization and audit.
7. No Firm lifecycle mutation by free-form LLM decision.
8. No client-facing confusion between Firm, platform, AI workforce, and authorized Professional.
9. No deletion that destroys required authority, engagement, deliverable, approval, audit, retention, or legal-hold history.
10. No export that strips relationships, provenance, integrity, or policy constraints.

## Deferred baseline work

This v1.0 freezes VF-01 semantics, boundaries, IDs, and invariants. Physical database/API schemas remain implementation work; credential mechanics remain VF-17; detailed Approval/EvidenceBundle schemas remain shared-schema work; payloads remain event-catalogue work; jurisdiction rules remain Jurisdiction Packs; and authority/autonomy terminology normalization across VF-WF, VF-09, VF-17, and VF-18 remains a later freeze task. Those tasks MUST preserve this specification.

