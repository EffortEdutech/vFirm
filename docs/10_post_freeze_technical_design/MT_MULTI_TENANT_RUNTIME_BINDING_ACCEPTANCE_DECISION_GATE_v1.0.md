---
id: MT-RUNTIME-BINDING-ACCEPTANCE-DECISION-GATE
title: "Multi-Tenant Runtime Binding Acceptance Decision Gate"
version: 1.0
status: "Pending Product-Owner Decision"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
created: "2026-09-03"
scope: "Controlled local/private pilot multi-tenant workspace runtime binding"
---

# Multi-Tenant Runtime Binding Acceptance Decision Gate v1.0

## 1. Decision purpose

This gate lets the product owner explicitly accept, hold, or reject the MT-H1 through MT-H6 multi-tenant workspace runtime binding hardening pass.

The executable evidence supports acceptance of the current multi-tenant pilot readiness scope for two controlled pilot firms:

- Amanah Formwork Pilot Firm;
- NHL Global Solution.

This gate does not authorize production multi-tenant onboarding, public marketplace widening, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, or live payment movement.

## 2. Evidence basis

Primary plan and checklist:

- `MT_MULTI_TENANT_WORKSPACE_RUNTIME_BINDING_SPRINT_PLAN_v1.0.md`
- `MT_MULTI_TENANT_WORKSPACE_RUNTIME_BINDING_CHECKLIST_v1.0.md`

Sprint completion files:

- `MT_H1_WORKSPACE_PROFILE_AND_SUBSCRIPTION_CONTRACT_LOCK_COMPLETION_v1.0.md`
- `MT_H2_BACKEND_ACTIVE_WORKSPACE_SUMMARY_COMPLETION_v1.0.md`
- `MT_H3_LOCAL_SEED_AND_PILOT_WORKSPACE_DATA_REPAIR_COMPLETION_v1.0.md`
- `MT_H4_FRONTEND_WORKSPACE_SHELL_BINDING_COMPLETION_v1.0.md`
- `MT_H5_MODULE_AND_WORKER_RUNTIME_BINDING_COMPLETION_v1.0.md`
- `MT_H6_MULTI_TENANT_PILOT_REHEARSAL_AND_EVIDENCE_PACK_COMPLETION_v1.0.md`

Executable commands:

```bash
npm run check:mt:h6
npm run check
```

Technical recommendation:

```text
GO_FOR_CONTROLLED_MULTI_TENANT_PILOT_READINESS_ACCEPTANCE
```

## 3. Accepted capability if approved

If accepted, the Virtual Firm Platform may be treated as ready for controlled local/private pilot operation of multiple firm workspaces where:

- the operator can select an active firm workspace;
- selected firm identity drives visible workspace copy;
- selected firm subscription controls module availability;
- selected firm service lines drive business/service context;
- selected firm worker bindings drive AI Workforce cards and defaults;
- tenant/firm headers scope backend active workspace summaries;
- cross-tenant active workspace access is denied;
- non-subscribed modules show bounded subscription-boundary pages rather than inappropriate active workflows.

## 4. Current verified pilot workspaces

### Amanah Formwork Pilot Firm

- Firm type: `FORMWORK_ENGINEERING`.
- Subscription/service pack: `VF-FORMWORK-PILOT`.
- Modules include technical delivery and approvals.
- Workers: six Formwork-oriented AI worker bindings.
- Technical Delivery remains bounded by controlled drawings, QA, evidence, and explicit human professional approval.

### NHL Global Solution

- Principal: Nur Hernieliana.
- Firm type: `ORGANIZATION_SUPPORT`.
- Subscription/service pack: `VF-ORG-SUPPORT-PILOT`.
- Services: project reporting, technical writing, clerical work, and BizKick EDCS.
- Modules: front desk, administration, sales/accounts, projects, invoices, AI workforce, ops, and audit.
- Workers: six organization-support AI worker bindings.
- Formwork Technical Delivery is not subscribed and is not presented as an active NHL module.

## 5. Known limitations

Acceptance of this gate should not be read as production SaaS readiness.

Known limitations:

- the current pilot is controlled local/private pilot readiness, not open public onboarding;
- authentication and organization administration are still bounded by previous controlled-pilot assumptions;
- tenant isolation has executable smoke coverage, but broader adversarial and production security testing remains future work;
- subscription billing display exists, but no live payment movement is authorized;
- export and audit evidence are pilot-level and should be hardened further before broad regulated/commercial rollout;
- historical rehearsal/test firms can remain in local data but must stay distinguishable from active pilot firms;
- some legacy documentation encoding issues predate this gate and should be cleaned in a separate documentation hygiene pass if desired.

## 6. Boundary controls

The following remain out of scope unless a later explicit decision authorizes them:

- production multi-tenant onboarding;
- public marketplace;
- live matching;
- ranking;
- capacity allocation;
- VF-24 observatory publication;
- pricing intelligence;
- autonomous award;
- autonomous regulated approval;
- live payment movement.

Human authority remains required for governed business decisions and all regulated approvals. AI workers remain assistive, attributable, scoped to the selected firm, and constrained by the selected workspace subscription and module profile.

## 7. Decision option A - Accept multi-tenant pilot readiness

Use this if the product owner accepts the evidence and limitations.

Recommended wording:

```text
Bismillah... I accept MT-H1 through MT-H6 multi-tenant runtime binding with the listed limitations. I authorize controlled local/private pilot operation of the Formwork pilot firm and NHL Global Solution as separate active firm workspaces. I do not authorize production multi-tenant onboarding, public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, or live payment movement.
```

Effect:

- MT-H1 through MT-H6 closes as accepted.
- Multi-tenant runtime binding becomes the accepted baseline for the next scoped plan.
- Controlled local/private pilot operation may use both verified pilot workspaces.
- Production widening remains blocked.

## 8. Decision option B - Hold acceptance

Use this if the evidence is mostly acceptable but named blockers must be addressed first.

Recommended wording:

```text
Bismillah... Hold MT multi-tenant runtime binding acceptance. The blockers are: [name blockers].
```

Effect:

- MT remains open.
- Named blockers become the next active work.
- No next-scope implementation should start until blockers are resolved or explicitly accepted as limitations.

## 9. Decision option C - Reject acceptance

Use this if the multi-tenant evidence is not acceptable.

Recommended wording:

```text
Bismillah... Reject MT multi-tenant runtime binding acceptance. Rework the multi-tenant workspace runtime evidence before any next-scope planning.
```

Effect:

- MT remains unaccepted.
- Next-scope planning is blocked.
- Rework must target the named failure areas.

## 10. Recommended product-owner decision

The technical recommendation is Option A: accept MT-H1 through MT-H6 as controlled local/private pilot multi-tenant runtime binding readiness with the listed limitations.

The careful path is to accept the current bounded pilot readiness, then prepare a separate next-scope sprint plan before writing more code.
