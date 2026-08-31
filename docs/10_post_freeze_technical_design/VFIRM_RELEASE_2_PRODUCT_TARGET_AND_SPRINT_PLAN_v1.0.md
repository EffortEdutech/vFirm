---
id: VFIRM-RELEASE-2-PRODUCT-TARGET-SPRINT-PLAN
title: "Virtual Firm Release 2 Product Target and Sprint Plan"
version: "1.0"
status: "Post-Freeze Technical Design"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Virtual Firm Release 2 Product Target and Sprint Plan v1.0

## 1. Purpose

Release 2 formalizes the bridge between authored role/worker skills and the operational Virtual Firm Platform. Release 1 proved the controlled local solopreneur Formwork Engineering firm. Release 2 must make the skill compiler, governance, authority envelope, and Firm Runtime binding explicit enough that Release 3 can safely provision new firms from blueprints.

This document is the active Release 2 product target and sprint plan. It does not reopen Architecture Baseline v1.0.

## 2. Release 2 product target

Release 2 is:

> A bounded runtime-binding release that validates role and worker skills, compiles them into governed worker definitions, binds them to the Firm Runtime, enforces authority boundaries, records auditable worker identity, and preserves the Release 1 solopreneur operating loop.

Release 2 proves:

```text
Role Skill + Worker Skill + Authority Envelope + Governance Rules + Runtime Binding
  -> Governed Virtual Employee
```

## 3. Release 2 is not

Release 2 is not a Virtual Firm Factory release, public marketplace release, staging/private pilot expansion release, autonomous professional approval release, multi-practice-pack expansion release, or live payment movement release unless separately approved.

## 4. Governing sources

| Area | Source |
|---|---|
| Workforce model | `VF-02_Workforce_Catalogue_and_Provisioning_v1.0.md` |
| Firm Runtime | `VF-09_Virtual_Workforce_Runtime_Architecture_v1.0.md` |
| Governance and approval | `VF-11_Professional_Governance_Compliance_and_Trust_v1.0.md` |
| Security, identity, trust | `VF-17_Security_Identity_and_Trust_Infrastructure_v1.0.md` |
| AI governance and autonomous operations | `VF-18_AI_Governance_Agent_Safety_and_Autonomous_Operations_v1.0.md` |
| First solopreneur loop | `VFIRM_SOLOPRENEUR_FIRM_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md` |
| Acceptance rehearsal | `SF_S6_SOLOPRENEUR_ACCEPTANCE_REHEARSAL_RESULT_v1.0.md` |

## 5. Release 2 entry criteria

1. Release 1 local pilot acceptance is recorded.
2. SF-S1 through SF-S6 remain complete.
3. The 10-point solopreneur acceptance rehearsal is passing.
4. Role and worker skill sources exist in the local skills workspace.
5. Worker authority boundaries from Release 1 are preserved.
6. No public marketplace, staging expansion, or Release 3 factory build is started inside Release 2.

## 6. Core objects

| Object | Purpose |
|---|---|
| `RoleSkillManifest` | Describes role intent, responsibilities, authority boundary, escalation, required knowledge, and allowed worker types. |
| `WorkerSkillManifest` | Describes executable worker capability, tools, inputs, outputs, forbidden actions, and validation requirements. |
| `SkillCompileRun` | Records deterministic validation and compilation of skills into runtime-bindable worker definitions. |
| `AuthorityEnvelope` | Defines permitted actions, forbidden actions, approval requirements, risk class, supervisor, and escalation route. |
| `RuntimeWorkerBinding` | Binds compiled worker skill to tenant, firm, module, workflow states, tools, memory boundary, budget, and audit identity. |
| `SkillGovernanceFinding` | Records validation findings, denials, warnings, and required human review. |
| `WorkerExecutionPolicy` | Defines what the worker may do at runtime under specific workflow states. |

## 7. Required state machines

### 7.1 Skill compile state

```text
DRAFT
  -> SUBMITTED_FOR_COMPILE
  -> COMPILE_FAILED / COMPILED
  -> GOVERNANCE_REVIEW_REQUIRED / APPROVED_FOR_BINDING
  -> BOUND_TO_RUNTIME
  -> RETIRED
```

Rules:

- Skills with unclear authority fail or require governance review.
- No skill may silently gain approval authority.
- Compiled skill output is not enough to bind to runtime; governance and authority checks must pass.

### 7.2 Runtime binding state

```text
CREATED
  -> VALIDATING_AUTHORITY
  -> DENIED / READY_TO_BIND
  -> BOUND
  -> SUSPENDED
  -> REVOKED
```

Rules:

- Suspended or revoked bindings cannot execute worker actions.
- Bindings must be tenant-scoped and firm-scoped.
- Every worker action must carry audit identity.

## 8. Fixed Release 2 sprint plan

| Sprint | Name | Outcome |
|---|---|---|
| R2-S1 | Skill Manifest Contract Lock | RoleSkillManifest, WorkerSkillManifest, AuthorityEnvelope, and validation error contracts are documented and tested. |
| R2-S2 | Compiler Validation Kernel | Skill compile runs validate required fields, authority boundaries, forbidden actions, risk classes, tool scopes, and escalation routes. |
| R2-S3 | Governance and Authority Binding | Compiled skills bind to authority envelopes, workflow states, supervisors, and approval requirements. |
| R2-S4 | Runtime Worker Binding | RuntimeWorkerBinding records connect compiled workers to tenant, firm, module, tools, memory boundary, budget, and audit identity. |
| R2-S5 | Solopreneur Regression and Denial Gate | SF-S1 through SF-S6 still pass; unsafe skills, unauthorized actions, and regulated final-output attempts are denied. |
| R2-S6 | Release 2 Evidence and R3 Handoff | Evidence proves compiler/governance/runtime binding is ready for Release 3 factory work. |

## 9. Sprint acceptance summaries

### R2-S1 - Skill Manifest Contract Lock

Valid manifests pass; missing authority, missing supervisor/escalation, hidden approval authority, and unclear forbidden actions fail.

### R2-S2 - Compiler Validation Kernel

Compile runs are reproducible, invalid skills do not bind, findings are auditable, and private chain-of-thought is not exposed.

### R2-S3 - Governance and Authority Binding

AI workers cannot approve regulated final output, human approval remains explicit, and workers cannot act outside authorized states.

### R2-S4 - Runtime Worker Binding

Bound workers can perform permitted support actions, cannot use unassigned tools, and suspended/revoked bindings cannot execute.

### R2-S5 - Solopreneur Regression and Denial Gate

SF-S1 through SF-S6 still pass; unauthorized actions, cross-tenant binding/read/export, and regulated final-output attempts are denied.

### R2-S6 - Release 2 Evidence and R3 Handoff

Release 2 completion and handoff evidence is complete enough for product-owner go/no-go.

## 10. Release 2 acceptance criteria

1. Role and worker skill manifests are formally defined.
2. Skill compile runs produce deterministic validation results.
3. Authority envelopes are required and enforceable.
4. Runtime worker bindings are tenant-scoped and firm-scoped.
5. Worker tool, memory, budget, supervisor, and workflow boundaries are explicit.
6. Regulated approval remains human-only.
7. Unsafe skills and unauthorized actions are denied.
8. Worker actions are auditable.
9. SF-S1 through SF-S6 remain passing.
10. Release 2 completion and handoff to R3 is recorded.

## 11. Verification commands

```text
npm run check
npm run check:sf-s6
npm run check:r2
npm run check:r2:postgres
node --check apps/api/src/server.mjs
node --check scripts/smoke-r2-skill-runtime-binding.mjs
git diff --check
```

Exact scripts are created during implementation.

## 12. Stop rule

When Release 2 acceptance criteria pass, stop adding compiler/runtime features and hand off to Release 3. Release 2 must not grow into Firm Factory, staging, marketplace, or ecosystem intelligence work.