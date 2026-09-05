---
id: VFIRM-AWIA-VIRTUAL-STAFF-MODEL-IMPLEMENTATION-PLAN
title: "vFirm AWIA Virtual Staff Model and Implementation Plan"
version: "1.0"
status: "Post-Freeze Technical Design"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
scope_classification: "Explicit User-Approved Scope Expansion Candidate"
---

# vFirm AWIA Virtual Staff Model and Implementation Plan v1.0

## 1. Purpose

This document defines how the Virtual Firm Platform can absorb the AWIA concept without breaking the frozen Architecture Baseline v1.0.

The product direction is:

> A firm hires named virtual staff through monthly staff plans, similar to human staffing, from junior operational workers through top management roles such as CFO. Each virtual staff member has persistent identity, role, package binding, skills, authority, supervisor, workload, budget, evidence, and audit ledger.

This is not Release 1 stabilization work. It is a bounded post-Release-1 scope expansion candidate that should feed Release 2 and Release 3 implementation decisions only after explicit product-owner authorization.

## 2. Governing Sources

This design is governed by:

- `AGENTS.md`
- `CLAUDE.md`
- `docs/AI_WORKSPACE_CONTEXT.md`
- `docs/00_project_control/AI_DEVELOPMENT_WORKSPACE_GRAPHIFY_OBSIDIAN_PROTOCOL_v1.0.md`
- `docs/10_post_freeze_technical_design/README.md`
- `docs/10_post_freeze_technical_design/VFIRM_RELEASE_2_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md`
- `docs/10_post_freeze_technical_design/VFIRM_RELEASE_3_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md`
- `C:\Users\user\Documents\00 Agent Skills\AWIA`
- `C:\Users\user\Documents\00 Agent Skills`
- `C:\Users\user\Documents\00 Agent Skills\ECC-main`

This document does not reopen VF-00 through VF-24. It maps AWIA into post-freeze technical design, runtime contracts, and future implementation gates.

## 3. Product Definition

An AWIA-backed virtual staff member is a persistent firm-owned AI Worker identity attached to a paid staff seat.

The staff member is not a prompt, model, package, skill, session, or chat. The staff member is an accountable organizational actor that can be assigned work only through governed platform workflows.

The product may describe this commercially as a monthly salary, staff plan, or staff subscription. The legal and platform meaning is a subscribed virtual staff seat. The salary metaphor must not imply human employment, professional licensure, legal personhood, or unlimited authority.

## 4. Canonical Relationship

```text
Firm Subscription
  -> Virtual Staff Seat
  -> AWIA Worker Identity
  -> Role Assignment
  -> Professional / Workforce Package Binding
  -> Skill Binding
  -> Authority Envelope
  -> Task / Delegation
  -> Controlled Runtime
  -> Evidence
  -> Agent Ledger
  -> AFCC Supervision / Audit
```

## 5. Core Terms

| Term | Meaning |
| --- | --- |
| Virtual Staff Seat | Commercial subscription slot purchased by a firm. |
| Virtual Staff Member | Named AWIA Worker Identity occupying a staff seat. |
| AWIA Worker Identity | Persistent agent identity with immutable `agent_id`, lifecycle, lineage, and audit identity. |
| Staff Grade | Business-facing level such as Assistant, Worker, Specialist, Manager, Executive, or Service. |
| Staff Role | Role assignment such as CFO, FAO, SAO, OPO, ARO, CMO, CTO, CIO, or CHRO. |
| Package Binding | Version-pinned connection between the worker and a professional/workforce package. |
| Salary Plan | Commercial billing metadata for the virtual staff seat. |
| Authority Envelope | Deterministic permission boundary for actions, modes, risk, scope, tools, budget, and approvals. |
| AFCC | AI Firm Command Centre supervision, roster, approval, audit, and operations surface. |

## 6. Reference Staff Catalogue

The local Agent Skills folder provides the first candidate staff catalogue:

| Staff Role | Package Source | Current Status | Platform Use |
| --- | --- | --- | --- |
| CFO | `CFO` | Zip package referenced by AWIA; pinned to CFO v1.7.0 in AWIA mapping. | Executive finance supervision, recommendations, finance governance. |
| FAO | `FAO` | Zip package referenced by AWIA; pinned to FAO v1.2.0 in AWIA mapping. | Finance administration operations such as AP and revenue support. |
| SAO | `SAO` | Candidate package; Phase 7 automatable validation complete, human commercial review pending. | Sales and customer operations. |
| OPO | `OPO` | Candidate package; authored, validation pending. | Operations and project delivery. |
| ARO | `ARO` | Candidate package; lifecycle draft pending validation. | Administration and resource operations. |
| CMO | `CMO` | Candidate package; human review pending. | Marketing governance and campaign support. |
| CTO | `CTO` | Foundation frozen, roster proposed, skills not authored. | Product/service technology strategy. |
| CIO | `CIO` | Foundation authored, partial candidate skills. | Enterprise IT and internal systems governance. |
| CHRO | `CHRO` | Roster proposal only. | Human-resource operations candidate, not implementation-ready. |

Candidate, draft, or unreviewed packages must be shown as such in product surfaces. Package existence is not authority.

## 7. Staff Seat and Monthly Salary Model

The staff seat is the billable commercial object.

Suggested starting grades:

| Grade | Default Runtime Class | Example Roles | Default Boundary |
| --- | --- | --- | --- |
| Assistant | TASK_AGENT | Data clerk, document assistant, AP clerk | Narrow tasks, no approvals. |
| Worker | TASK_AGENT | FAO operator, sales coordinator | Operational execution under policy. |
| Specialist | REVIEW_AGENT or TASK_AGENT | QS assistant, finance analyst, technical checker | Domain outputs with review gates. |
| Manager | ORCHESTRATING_AGENT | OPO manager, SAO manager | Task coordination, escalation, workload supervision. |
| Executive | ORCHESTRATING_AGENT | CFO, CMO, CTO, CIO, CHRO | Recommendations and governance supervision, no professional authority by default. |
| Service | SYSTEM_AGENT | Background sync, evidence collector | Bounded infrastructure functions. |

The salary plan may include monthly price, currency, included workload, tool budget, evidence retention policy, support level, package version eligibility, and environment access. It must not grant authority by itself.

## 8. Worker Identity Model

Each virtual staff member requires:

- `agent_id`
- `agent_code`
- `display_name`
- `organization_id`
- `firm_id`
- `staff_seat_id`
- `staff_grade`
- `role_assignment_ref`
- `package_binding_refs`
- `skill_binding_refs`
- `authority_envelope_ref`
- `manager_actor_ref`
- `lifecycle_status`
- `current_agent_version_ref`
- `salary_plan_ref`
- `audit_identity`

Identity rules:

- The opaque `agent_id` is permanent.
- `agent_code` is unique within the firm.
- Display name is cosmetic and never authorization.
- Model, prompt, package, and tool changes create version lineage, not a new identity by default.
- Cross-firm transfer creates a new firm-owned identity with lineage references where legally permissible.

## 9. Hiring and Lifecycle Flow

The hiring flow is:

1. Firm selects staff seat and salary plan.
2. Firm selects role and grade.
3. Platform creates draft AWIA Worker Identity.
4. Operator chooses package binding mode.
5. Platform pins package and skill versions.
6. Governance Pack applies authority envelope.
7. Supervisor, tool access, memory scope, evidence requirements, and budget are configured.
8. Readiness validation runs.
9. Human operator approves activation.
10. Staff member becomes active and may receive tasks through workflow boundaries.

Lifecycle states:

```text
DRAFT -> PROVISIONING -> ACTIVE -> PAUSED -> SUSPENDED -> RETIRED -> ARCHIVED
```

No suspended, retired, archived, or unprovisioned worker may execute tasks.

## 10. Package Binding Rules

The platform must preserve AWIA separation:

- Package definition is not a worker.
- Skill definition is not a worker.
- Package binding is not authority.
- Authority is determined only by the authority envelope and trusted runtime checks.
- Version pinning is mandatory.
- Candidate and draft package status must be visible.
- Organization overlays may narrow package behavior but must not mutate upstream package definitions.
- Segregation of duties, protected data rules, deterministic engines, and human approval requirements override package preference.

Supported binding modes:

- `WHOLE_PACKAGE`
- `PACKAGE_PROFILE`
- `EXPLICIT_SKILL_SET`
- `COMPOSITE`

## 11. Authority and Governance

Authority must be computed from:

```text
Worker Identity
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
+ Lifecycle State
```

Rules:

- Default deny.
- Most restrictive rule wins.
- Delegation never expands authority.
- Task prompts never grant authority.
- Connector access never grants authority.
- Model confidence never grants authority.
- Human approval is explicit, scoped, and recorded.
- No silent approval.
- No orphan regulated work.
- No direct LLM to regulated final output for high-risk services.
- Candidate packages require additional review gates.

## 12. Task and Delegation Model

Every staff action must be attached to a task or controlled background event.

Task records should include tenant, firm, client, project, responsible human, assigned worker, role at time of work, package versions, authority decision, tools used, evidence, outputs, approvals, escalations, and ledger event references.

Delegation must preserve:

- delegator identity
- delegate identity
- task scope
- allowed output type
- evidence requirements
- approval requirements
- subdelegation permissions
- actual actor attribution

Example finance chain:

```text
Human Principal -> CFO-001 -> FA-001 -> DATA-001
```

Example commercial delivery chain:

```text
SAO-001 -> OPO-001 -> ARO-001 -> FAO-REV-001
```

## 13. Runtime Enforcement

The trusted runtime sequence is:

```text
Worker proposes action
  -> TrustedExecutionContext assembled
  -> Lifecycle check
  -> Tenant and firm scope check
  -> Role and package binding check
  -> Skill check
  -> Authority envelope check
  -> Segregation-of-duties check
  -> Approval check
  -> Tool gateway execution
  -> Deterministic validation where required
  -> Evidence capture
  -> Ledger event append
  -> Output or escalation
```

The LLM may propose, summarize, draft, classify, and explain within boundaries. The trusted runtime authorizes, executes, records, and denies.

## 14. Ledger and Evidence

The ledger must allow reconstruction of:

- who acted
- which role and package version were active
- what task was being performed
- which authority rule applied
- which tool or deterministic engine executed
- what evidence was used
- what output was produced
- who approved or denied
- what correction superseded an earlier event

Generated narrative is not evidence. Evidence must be referenced as first-class evidence objects with source, provenance, retention, integrity, and access controls.

## 15. AFCC Product Surface

The AFCC should expose:

- Staff Roster
- Org Chart
- Staff Profile
- Task Board
- Approval Queue
- Authority Matrix
- Ledger Timeline
- Salary and Subscription Console
- Package Registry

Important UI distinction:

```text
Skill Available != Action Authorized
```

The product must make package status, lifecycle status, authority limits, review gates, and supervisor identity visible before a staff member performs meaningful work.

## 15A. Client and Operator Experience Model

The virtual staff experience must feel like operating a governed firm team, not opening a generic AI chat window.

The client or firm operator should experience five primary journeys:

1. Hire virtual staff
2. Assign work
3. Supervise execution
4. Approve or reject controlled outputs
5. Manage staff performance, cost, and lifecycle

### 15A.1 Hiring Experience

The hiring flow should begin from a Staff Catalogue or Firm Blueprint recommendation.

The operator sees:

- role name and staff grade
- package source and review status
- monthly salary or staff plan
- included workload and budget limits
- required supervisor
- authority class summary
- tools and integrations required
- evidence and approval requirements
- readiness warnings

The activation action must be explicit. A staff member can be drafted and configured before activation, but cannot execute firm work until the human operator approves activation.

The UI must clearly separate:

```text
This staff member has the skill
This staff member is allowed to perform this action
This output is approved by a responsible human
```

### 15A.2 Staff Profile Experience

Each virtual staff member should have a profile that looks and behaves like a firm staff record.

Minimum profile sections:

- identity and display name
- role, grade, department, and reporting line
- package bindings and version pins
- skill list with package source
- authority envelope summary
- active assignments
- workload and monthly usage
- tool access
- evidence obligations
- ledger timeline
- approval and escalation history
- lifecycle controls

The profile must never imply professional licensure or human professional authority unless a responsible authorized professional is separately recorded.

### 15A.3 Work Assignment Experience

Work assignment should happen through structured task intake, not free-form uncontrolled chat.

The operator selects or creates:

- client
- project
- work type
- requested deliverable
- risk class
- due date
- responsible human
- assigned virtual staff member
- evidence sources
- approval path

The platform then previews whether the selected staff member can accept the task. If not, it must show a denial or escalation reason such as lifecycle mismatch, missing package binding, missing tool permission, budget limit, SOD conflict, professional approval requirement, or package review status.

### 15A.4 Supervision and Approval Experience

The operator should supervise through queues and evidence panels.

Core views:

- Active Work Queue
- Waiting for Evidence
- Needs Human Review
- Needs Professional Approval
- Blocked by Authority
- Completed With Evidence
- Denied or Escalated

Approvals must show:

- what the staff member did
- what evidence was used
- what rule or workflow required approval
- what output is being approved
- who is responsible after approval
- what ledger event will be recorded

The approval button must not be available when evidence is missing, authority is denied, lifecycle is invalid, or the approving human is not eligible.

### 15A.5 Operating Dashboard Experience

The AFCC operating dashboard should answer:

- who is working now
- what each staff member is allowed to do
- what is waiting on humans
- what is blocked
- what was completed
- what evidence exists
- what costs and budgets are consumed
- which staff members are underused or overloaded
- which package or authority problems are recurring

Dashboard metrics should be operational and auditable, not model-confidence theatre.

Suggested metrics:

- active tasks by staff member
- tasks completed this month
- approval wait time
- denied actions by reason
- escalations by risk class
- evidence completeness rate
- monthly salary or staff plan cost
- tool budget consumed
- human review workload

### 15A.6 Staff Lifecycle Experience

The operator must be able to:

- draft
- activate
- pause
- suspend
- retire
- archive
- replace
- upgrade package version
- narrow authority
- change supervisor
- transfer workload

Pause, suspend, retire, and archive actions must preserve task history and ledger continuity. Replacement creates a new or updated staff identity according to AWIA lineage rules and must not erase prior accountability.

### 15A.7 Conversation Boundary

The product may include conversation with a virtual staff member, but chat is only an interaction surface.

Chat cannot:

- grant authority
- bypass task intake
- bypass evidence requirements
- bypass deterministic validation
- approve regulated work
- mutate the ledger
- perform side-effecting tool actions without runtime authorization

Where chat is available, it should be anchored to a staff member, task, client, project, and permitted action set.

## 16. Data Contract Candidates

Future implementation should introduce or align these contracts:

- `VirtualStaffSeat`
- `VirtualStaffSalaryPlan`
- `VirtualStaffMember`
- `StaffRoleDefinition`
- `StaffPackageBinding`
- `StaffAuthorityEnvelope`
- `StaffTaskAssignment`
- `StaffWorkloadSnapshot`
- `StaffLedgerProjection`
- `StaffLifecycleEvent`

These contracts should map cleanly to AWIA `AgentIdentity`, `RoleAssignment`, `PackageBinding`, `SkillBinding`, `AuthorityRule`, `AuthorityDecision`, `Task`, `Delegation`, `TrustedExecutionContext`, `RuntimeActionRequest`, `RuntimeActionResult`, `LedgerEvent`, and `Evidence` schemas.

## 17. Implementation Fit With Existing Releases

### Release 1

Do not reopen Release 1. The accepted local Formwork Engineering pilot readiness scope remains intact. No autonomous regulated approval, live payment release, public marketplace, or uncontrolled external sharing is introduced by this design.

### Release 2

Release 2 is the nearest technical fit:

- refresh `RuntimeWorkerBinding` to align with AWIA Worker Identity
- make `AuthorityEnvelope` AWIA-compatible
- add virtual staff seat and salary metadata as commercial layer, not authority
- produce package-binding-ready compiler outputs
- add denial fixtures for identity spoofing, self-approval, package-status mismatch, and lifecycle mismatch

### Release 3

Release 3 should use this design as Factory input:

- Firm Blueprint includes staff roster
- Workforce Blueprint provisions AWIA identities and staff seats
- Governance Pack compiles authority envelopes
- Service Delivery Pack assigns task workflows
- Factory readiness checks package status, professional review status, salary plan, authority envelope, supervisor, and audit identity

### Release 4 and Later

Later releases may add controlled staging, pilot workforce operations, staff monitoring, hiring and replacement flows, package registry maturity, and private marketplace preparation.

## 18. Initial Implementation Sprints

| Sprint | Name | Outcome |
| --- | --- | --- |
| AWIA-VS-S1 | Contract Lock | Data contracts, terminology, package mapping, authority invariants, and negative controls are frozen for implementation. |
| AWIA-VS-S2 | Package Registry Mapping | Local skill packages become registry candidates with status, version, role, authority class, and review state. |
| AWIA-VS-S3 | Staff Provisioning Kernel | Virtual staff seats create AWIA Worker Identities, role assignments, package bindings, and lifecycle events. |
| AWIA-VS-S4 | Authority and Runtime Gate | Trusted runtime enforces authority, lifecycle, SOD, task scope, evidence, and approvals. |
| AWIA-VS-S5 | AFCC Staff Management and Operating Experience | Operator can hire, assign, supervise, approve, pause, suspend, retire, replace, and inspect virtual staff members through governed staff, task, evidence, approval, and dashboard views. |
| AWIA-VS-S6 | Evidence and Pilot Gate | Pilot fixtures prove denial cases, evidence capture, ledger projection, and supervised task execution. |

Do not start these sprints until the product owner explicitly authorizes the target release and first sprint.

## 19. First Pilot Staff Set

Recommended first bounded pilot staff set:

- `CFO-001`
- `FA-001`
- `FAO-AP-001`
- `FAO-REV-001`
- `SAO-001`
- `OPO-001`
- `ARO-001`
- `DATA-001`

This set tests executive supervision, finance operations, sales intake, project delivery, administration, data support, delegation, segregation of duties, and approval boundaries without requiring the CHRO, CTO, CIO, or CMO packages to be implementation-complete.

## 20. Required Negative Controls

Minimum denial tests:

- worker identity spoofing
- self-approval
- task prompt attempts to grant authority
- package binding treated as permission
- candidate package treated as stable package
- suspended worker attempts task execution
- cross-tenant data access
- unassigned tool access
- high-risk calculation bypasses deterministic engine
- generated narrative submitted as evidence
- ledger mutation attempt
- ambiguous side-effect retry without idempotency
- authority threshold evasion by task splitting

## 21. Verification Candidates

Future implementation should add checks similar to:

```powershell
npm run check:awia-virtual-staff
npm run check:awia-virtual-staff:postgres
```

Focused Node smoke checks should validate contracts, denial fixtures, staff lifecycle transitions, package registry status, authority decisions, and ledger/evidence projections.

## 22. Open Product Decisions

Before implementation, decide:

1. Should the public commercial term be salary, staff plan, staff retainer, or configurable by market?
2. Should first staff names be role-coded, for example `CFO-001`, or human-style names with hidden role codes?
3. Which local packages are allowed in the first controlled staff catalogue despite pending human review?
4. Should implementation land as Release 2 refresh, Release 3 input, or a dedicated AWIA Virtual Staff release?
5. Should the first pilot firm be Amanah Formwork Pilot Firm, NHL Global Solution, or a synthetic training firm?
6. Should AFCC be introduced as a separate module now or as a Staff Management view first?

## 23. Stop Rule

This design authorizes documentation and scope framing only.

Implementation requires explicit product-owner decision for:

- target release
- sprint scope
- package set
- pilot firm
- commercial wording
- verification gate
- deployment boundary

The default boundary remains: no autonomous regulated approval, no live payment release, no public marketplace, and no uncontrolled cross-tenant or external data sharing.

## 24. Acceptance Criteria

This design is acceptable when:

- AWIA virtual staff concepts are mapped into vFirm without changing frozen baseline architecture
- monthly salary or staff plan is modeled as commercial metadata, not authority
- persistent staff identity is separated from model, prompt, package, skill, session, and tool
- package status and human-review state are visible
- authority and lifecycle gates remain deterministic
- AFCC supervision and audit surfaces are defined
- Release 2 and Release 3 fit are explicit
- implementation is blocked behind a product-owner decision

## 25. Current Recommendation

Proceed next with:

```text
AUTHORIZE_AWIA_VIRTUAL_STAFF_CONTRACT_LOCK
```

This would start AWIA-VS-S1 only: contract lock, terminology, package registry mapping, authority invariants, and denial controls. It should not create open-ended new feature stages or disturb the accepted Release 1 pilot readiness state.
