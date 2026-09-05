---
id: VFIRM-AWIA-VS-S1-CONTRACT-LOCK-COMPLETION
title: "AWIA Virtual Staff Sprint 1 Contract Lock Completion"
version: "1.0"
status: "AWIA-VS-S1 Complete"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
scope_classification: "Explicit User-Approved Scope Expansion"
authorization: "AUTHORIZE_AWIA_VIRTUAL_STAFF_CONTRACT_LOCK"
---

# AWIA-VS-S1 Contract Lock Completion v1.0

## 1. Sprint outcome

AWIA-VS-S1 is complete as a contract-lock sprint.

The Virtual Firm Platform now has a bounded post-freeze contract baseline for AWIA virtual staff: named monthly staff seats, persistent worker identity, package registry mapping, lifecycle rules, authority invariants, staff operating experience, negative controls, and next-sprint implementation gate.

This sprint does not implement runtime execution, UI screens, database migrations, API endpoints, or autonomous staff operation. It authorizes the next implementation slice only after product-owner approval.

## 2. Scope classification

| Area | Decision |
| --- | --- |
| Request classification | Explicit user-approved scope expansion |
| Release 1 effect | No Release 1 scope is reopened |
| Primary fit | Release 2 runtime-binding refresh and Release 3 Factory input |
| Implementation status | Contract locked; implementation not started |
| Deployment boundary | Local/private controlled development only |
| Prohibited expansion | No live payment release, public marketplace, autonomous regulated approval, or uncontrolled external data sharing |

## 3. Governing documents

| Document | Role |
| --- | --- |
| `AGENTS.md` | Architecture principles, release state, Graphify/Obsidian protocol |
| `docs/AI_WORKSPACE_CONTEXT.md` | Current durable state |
| `docs/10_post_freeze_technical_design/VFIRM_AWIA_VIRTUAL_STAFF_MODEL_AND_IMPLEMENTATION_PLAN_v1.0.md` | Parent AWIA virtual staff model |
| `docs/10_post_freeze_technical_design/VFIRM_RELEASE_2_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md` | Runtime-binding and authority-envelope fit |
| `docs/10_post_freeze_technical_design/VFIRM_RELEASE_3_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md` | Firm Factory and Workforce Blueprint fit |
| `C:\Users\user\Documents\00 Agent Skills\AWIA` | AWIA identity, package binding, authority, task, ledger, runtime, schema, and pilot baseline |
| `C:\Users\user\Documents\00 Agent Skills` | Local staff package source catalogue |

## 4. Locked terminology

| Term | Locked meaning |
| --- | --- |
| Virtual Staff Seat | Commercial subscription slot purchased by a firm. |
| Virtual Staff Member | Named AWIA Worker Identity occupying a staff seat. |
| Monthly Salary | Product/commercial metaphor for the subscribed staff seat; not employment status, licensure, legal personhood, or authority. |
| AWIA Worker Identity | Persistent organizational actor with immutable `agent_id`, lifecycle, lineage, and audit identity. |
| Staff Grade | Business level such as Assistant, Worker, Specialist, Manager, Executive, or Service. |
| Staff Role | Firm role such as CFO, FAO, SAO, OPO, ARO, CMO, CTO, CIO, or CHRO. |
| Package Registry Entry | Versioned local skill package candidate with status, provenance, review state, domain, and authority profile. |
| Package Binding | Worker-specific, version-pinned binding to one or more package entries. Binding does not grant authority. |
| Authority Envelope | Deterministic runtime boundary for permitted actions, forbidden actions, risk, scope, tools, budget, supervisor, and approvals. |
| AFCC | AI Firm Command Centre surface for staff roster, supervision, approval, audit, and operating dashboard. |

## 5. Locked contract objects

The next implementation slice must model these objects explicitly.

| Object | Purpose | Authority effect |
| --- | --- | --- |
| `VirtualStaffSeat` | Commercial staff subscription slot attached to firm and plan. | None by itself. |
| `VirtualStaffSalaryPlan` | Price, currency, included workload, tool budget, support tier, retention, package eligibility. | None by itself. |
| `VirtualStaffMember` | Named AWIA Worker Identity occupying a staff seat. | Identity context only. |
| `StaffRoleDefinition` | Role intent, grade, department, supervisor expectations, default workflows. | Contributes to authority evaluation. |
| `StaffPackageRegistryEntry` | Local package catalogue entry with status, version, source, review state, and boundaries. | None by itself. |
| `StaffPackageBinding` | Version-pinned worker-to-package binding mode. | Eligibility input only. |
| `StaffSkillBinding` | Version-pinned worker-to-skill binding derived from package. | Eligibility input only. |
| `StaffAuthorityEnvelope` | Deterministic action, tool, budget, risk, SOD, approval, and escalation boundary. | Primary authority source. |
| `StaffTaskAssignment` | Structured task assignment to a staff member. | Task-scoped authority input. |
| `StaffLifecycleEvent` | Auditable transition such as draft, activate, pause, suspend, retire, replace. | Lifecycle gate input. |
| `StaffLedgerProjection` | Read model of ledger events relevant to the staff member. | Evidence and audit surface only. |
| `StaffWorkloadSnapshot` | Operational summary of workload, budget, approvals, and blocked work. | Monitoring only. |

## 6. Locked lifecycle states

```text
DRAFT -> PROVISIONING -> ACTIVE -> PAUSED -> SUSPENDED -> RETIRED -> ARCHIVED
```

Rules:

- Only `ACTIVE` staff may accept new executable task assignments.
- `PAUSED` staff may retain identity and history but may not start new work.
- `SUSPENDED` staff may not execute, delegate, invoke tools, or approve anything.
- `RETIRED` staff may not execute new work; open work must be reassigned or closed.
- `ARCHIVED` staff remains queryable for audit only.
- Lifecycle transitions require attributable human or system policy actor.

## 7. Locked staff grades

| Grade | Runtime classification | Default boundary |
| --- | --- | --- |
| Assistant | `TASK_AGENT` | Narrow tasks, no approvals. |
| Worker | `TASK_AGENT` | Operational execution under policy. |
| Specialist | `TASK_AGENT` or `REVIEW_AGENT` | Domain support with review gates. |
| Manager | `ORCHESTRATING_AGENT` | Task coordination and escalation. |
| Executive | `ORCHESTRATING_AGENT` | Governance recommendation and supervision, no professional authority by default. |
| Service | `SYSTEM_AGENT` | Bounded background or infrastructure function. |

## 8. Locked package registry status model

Every local skill package must enter the registry with a status.

| Status | Meaning | Runtime eligibility |
| --- | --- | --- |
| `REFERENCE_PINNED` | Version is referenced by AWIA baseline or existing vFirm mapping. | Eligible for controlled fixtures after contract checks. |
| `VALIDATED_CANDIDATE` | Automatable validation completed; human review may still be pending. | Eligible only with candidate warning and review gate. |
| `CANDIDATE` | Authored or partially authored package exists. | Not eligible for production-like autonomous operation. |
| `DRAFT` | Foundation, roster, or scaffold exists but package is incomplete. | Catalogue only. |
| `PLANNED` | Role is planned but no usable package exists. | Catalogue only. |
| `RETIRED` | Package version is superseded or withdrawn. | Not eligible. |

Initial registry mapping:

| Role | Source | Locked registry status | Notes |
| --- | --- | --- | --- |
| CFO | `CFO` | `REFERENCE_PINNED` | AWIA maps CFO v1.7.0; executive recommendations only by default. |
| FAO | `FAO` | `REFERENCE_PINNED` | AWIA maps FAO v1.2.0; AP/revenue support, no payment release. |
| SAO | `SAO` | `VALIDATED_CANDIDATE` | Automatable validation complete; commercial human review pending. |
| OPO | `OPO` | `CANDIDATE` | Authored candidate; validation pending. |
| ARO | `ARO` | `CANDIDATE` | Draft/candidate lifecycle; validation pending. |
| CMO | `CMO` | `CANDIDATE` | Human marketing/commercial review pending. |
| CTO | `CTO` | `DRAFT` | Foundation and roster only. |
| CIO | `CIO` | `DRAFT` | Partial candidate skill set only. |
| CHRO | `CHRO` | `PLANNED` | Roster proposal only. |
| ECC-main | `ECC-main` | `REFERENCE_TOOLING` | Engineering workflow package, not a virtual staff business role. |

## 9. Locked package binding rules

Supported binding modes:

- `WHOLE_PACKAGE`
- `PACKAGE_PROFILE`
- `EXPLICIT_SKILL_SET`
- `COMPOSITE`

Rules:

- Package binding is version-pinned.
- Binding does not grant authority.
- Skill availability does not grant action permission.
- Package status must be visible in staff catalogue, profile, and task assignment.
- Candidate or draft packages require warning and review gates.
- A worker may not bind, upgrade, or narrow its own authority.
- Package overlays may narrow behavior but must not mutate upstream package definitions.

## 10. Locked authority invariants

The authority envelope is the runtime source of permission.

Authority must be evaluated from:

```text
Worker Identity
+ Lifecycle State
+ Role Assignment
+ Package Binding
+ Skill Binding
+ Governance Pack
+ Jurisdiction Pack
+ Firm Policy
+ Client / Project / Contract Scope
+ Task Context
+ Tool Policy
+ Budget Policy
+ Segregation-of-Duties Policy
+ Approval State
```

Invariants:

- Default deny.
- Most restrictive rule wins.
- Task prompts never grant authority.
- Monthly salary or staff plan never grants authority.
- Package binding never grants authority.
- Model confidence never grants authority.
- Connector access never grants authority.
- Delegation never expands authority.
- Suspended or retired staff cannot execute.
- Human approval must be explicit, scoped, attributable, and ledgered.
- Regulated final output requires responsible authorized professional identity and evidence.
- No silent approval.
- No orphan regulated work.

## 11. Locked staff operating journeys

AFCC must support these journeys in later implementation:

| Journey | Required result |
| --- | --- |
| Hire staff | Draft, configure, validate, and explicitly activate a staff member. |
| Assign work | Create structured staff task assignment with client, project, risk, evidence, and approval path. |
| Supervise work | Show active, blocked, waiting-for-evidence, and approval-required work. |
| Approve output | Show action, evidence, authority basis, responsible human, and ledger effect before approval. |
| Manage lifecycle | Pause, suspend, retire, replace, upgrade package, narrow authority, change supervisor, and transfer workload. |
| Monitor operations | Show workload, cost, budget, approvals, denials, escalations, evidence completeness, and human review load. |

Conversation with staff is allowed only as an anchored interaction surface. Chat cannot bypass task intake, authority, evidence, deterministic validation, approval, side-effect controls, or ledger append rules.

## 12. Locked first pilot staff set

The first bounded pilot catalogue is:

| Staff code | Role | Grade | Package status | Default boundary |
| --- | --- | --- | --- | --- |
| `CFO-001` | CFO | Executive | `REFERENCE_PINNED` | Finance governance recommendation and supervision only. |
| `FA-001` | Finance Analyst | Specialist | `REFERENCE_PINNED` | Analysis and evidence preparation under CFO/FAO boundaries. |
| `FAO-AP-001` | FAO AP Operator | Worker | `REFERENCE_PINNED` | AP preparation and review support; no payment release. |
| `FAO-REV-001` | FAO Revenue Operator | Worker | `REFERENCE_PINNED` | Revenue and receivables support; no external send without approval. |
| `SAO-001` | SAO | Worker or Manager | `VALIDATED_CANDIDATE` | Sales and customer operations with commercial review gate. |
| `OPO-001` | OPO | Manager | `CANDIDATE` | Project delivery coordination with validation gate. |
| `ARO-001` | ARO | Worker | `CANDIDATE` | Administration and resources support with validation gate. |
| `DATA-001` | Data Support | Assistant | `REFERENCE_PINNED` or `EXPLICIT_SKILL_SET` | Evidence/data preparation only. |

## 13. Locked negative controls

The next implementation slice must include denial fixtures for:

- worker identity spoofing
- self-approval
- task prompt attempts to grant authority
- monthly salary plan treated as permission
- package binding treated as permission
- candidate package treated as stable package
- suspended worker attempts task execution
- retired worker attempts task execution
- cross-tenant data access
- cross-firm task assignment
- unassigned tool access
- high-risk deterministic-engine bypass
- generated narrative submitted as evidence
- ledger mutation attempt
- ambiguous side-effect retry without idempotency
- authority threshold evasion by task splitting

## 14. Contract fit with existing code

Existing vFirm concepts should be extended rather than replaced:

| Existing concept | AWIA-VS-S1 fit |
| --- | --- |
| `Actor` | Staff actions remain attributable through AI worker actor identity. |
| `WorkPackage.assigned_worker_instance_id` | Can align to `VirtualStaffMember` or future AWIA worker identity binding. |
| `PolicyDecision` | Can record authority envelope decision outcomes. |
| `Approval` | Remains human/professional approval record; virtual staff cannot silently approve regulated outputs. |
| `RuntimeWorkerBinding` | Should evolve into AWIA-compatible worker identity, package binding, authority, lifecycle, and task scope binding. |
| Existing worker APIs | Should be preserved until a compatibility migration is explicitly planned. |

## 15. Data contract acceptance criteria

AWIA-VS-S2 may start only if the implementation plan preserves:

- tenant and firm scoping for every object
- stable worker identity separate from package, skill, model, prompt, session, and tool
- commercial staff seat separate from authority
- package registry status visibility
- deterministic lifecycle state machine
- deterministic authority envelope evaluation
- explicit responsible human/professional approval requirements
- append-only ledger behavior through events
- evidence object references instead of generated text as evidence
- denial fixtures for every negative control in this document

## 16. Verification evidence

| Check | Result |
| --- | --- |
| Parent AWIA design exists | PASS |
| Client/operator experience added | PASS |
| Release 1 non-reopening boundary preserved | PASS |
| Contract objects defined | PASS |
| Package registry status model defined | PASS |
| First pilot staff set defined | PASS |
| Negative controls defined | PASS |
| Implementation remains gated | PASS |

## 17. Next sprint gate

Recommended next authorization:

```text
AUTHORIZE_AWIA_VS_S2_PACKAGE_REGISTRY_MAPPING
```

AWIA-VS-S2 should implement the package registry mapping for the local `C:\Users\user\Documents\00 Agent Skills` folder and produce machine-readable package metadata, validation fixtures, and smoke checks. It must not yet activate autonomous virtual staff operation.
