---
id: VFIRM-RELEASE-1-PRODUCT-TARGET-SPRINT-PLAN
title: "vFirm Release 1 Product Target and Sprint Plan"
version: "1.0"
status: "Release 1 Accepted for Local Pilot"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# vFirm Release 1 Product Target and Sprint Plan v1.0

## 1. Why this document exists

The vFirm roadmap must not grow forever stage by stage.

The Architecture Baseline defines the long-term platform. The implementation plan must define a bounded release target so the development team knows what to build, when to stop adding new scope, and what must be true before pilot use.

This document is the active product target for Release 1.

## 2. Release 1 product target

Release 1 is:

> A controlled professional-practice MVP that lets a verified professional operate a Formwork Engineering / Temporary Works Virtual Firm through the full client-to-delivery-to-commercial loop, with tenant isolation, governed AI assistance, human authority gates, auditability, pilot operations, support controls, observability, and commercial-launch preparation.

Release 1 proves the core vFirm equation:

```text
Professional Expertise
  + Virtual Workforce
  + Shared Business Infrastructure
  + Governance / Audit / Commercial Controls
  = Operable Virtual Firm
```

## 3. Release 1 is not

Release 1 is not an endless feature programme.

Release 1 does not attempt to deliver:

- a public open marketplace;
- unrestricted autonomous AI delivery;
- direct AI approval of regulated deliverables;
- global observatory intelligence as a live commercial product;
- multi-industry service-pack scale;
- live payment capture without explicit payment-provider activation approval;
- enterprise-grade compliance for every jurisdiction;
- a fully automated firm factory for public self-serve launch.

Those belong to later releases after Release 1 acceptance.

## 4. Release 1 target user and vertical

Primary release user:

- a qualified professional / Virtual Principal operating a controlled pilot Virtual Firm.

Primary service vertical:

- `VF-SP-001 Formwork Engineering / Temporary Works`.

Primary operating loop:

```text
Tenant setup
  -> firm setup
  -> client record
  -> intake
  -> proposal
  -> approval
  -> acceptance / engagement
  -> project
  -> work package
  -> task
  -> evidence bundle
  -> invoice
  -> audit / reporting
  -> pilot feedback
  -> release review
```

## 5. Release 1 stage status

The implementation has already completed the feature-build track through Stage 20.

| Track | Stages | Status | Meaning |
|---|---:|---|---|
| Architecture Baseline | Stage 0 | Complete | VF-00 through VF-24 are frozen as Architecture Baseline v1.0. |
| MVP Build Foundation | Stages 1-3 | Complete | Local app shell, persistent PostgreSQL loop, and operator workspace exist. |
| Governance and Delivery | Stages 4-8 | Complete | Auth seams, governance, service delivery, commercial operations, AI runtime, and network preparation exist. |
| Pilot Readiness | Stages 9-18 | Complete | Production readiness, pilot packaging, staging/auth preparation, tenant ops, observability, feedback, reporting, and controlled expansion exist. |
| Commercial Launch Preparation | Stages 19-20 | Complete | Usage limits, billing readiness, provider configuration, subscription packages, and commercial-launch controls exist. |

Stage 20 closes the Release 1 feature-build track.

After Stage 20, the default next step is not another feature stage. The default next step is Release 1 stabilization, verification, and acceptance.

## 6. Fixed Release 1 sprint plan

The remaining Release 1 work is capped to the following sprints unless the user approves a formal scope change.

| Sprint | Name | Outcome |
|---|---|---|
| R1-S1 | Product Target and Backlog Lock | Complete. See `R1_S1_PRODUCT_TARGET_BACKLOG_LOCK_AUDIT_v1.0.md`. |
| R1-S2 | Existing Workflow Stabilization | Complete. See `R1_S2_EXISTING_WORKFLOW_STABILIZATION_COMPLETION_v1.0.md`. |
| R1-S3 | Tenant, Auth, Policy, and Data Protection Hardening | Complete. See `R1_S3_TENANT_AUTH_POLICY_DATA_HARDENING_COMPLETION_v1.0.md`. |
| R1-S4 | Pilot Operations Dress Rehearsal | Complete. See `R1_S4_PILOT_OPERATIONS_DRESS_REHEARSAL_COMPLETION_v1.0.md`. |
| R1-S5 | Release Candidate Acceptance Review | Complete. GO for Release 1 local pilot acceptance. See `R1_S5_RELEASE_CANDIDATE_ACCEPTANCE_REVIEW_v1.0.md`. |

No new Stage 21+ feature stage should be created by default.

If a later feature is genuinely needed, it must be classified as one of:

- Release 1 stabilization item;
- Release 1 blocker;
- Release 2 candidate;
- explicit user-approved scope expansion.

## 7. Release 1 acceptance criteria

Release 1 can be marked ready only when all of the following are true:

1. The full Formwork pilot loop can run without raw JSON inspection.
2. PostgreSQL is the primary persistent store, with JSON fallback preserved for development mode.
3. All material workflow actions are tenant-scoped and attributable.
4. Human authority gates prevent silent approval and direct AI-to-final regulated output.
5. Audit, event, and policy decision records are visible enough for operator review.
6. Pilot tenant onboarding, membership, suspension, revocation, and support controls are documented and tested.
7. Observability, incident response, and operator metrics have a working pilot process.
8. Billing readiness and commercial-launch controls exist without accidental live payment capture.
9. The development team has a known backlog with Release 1 blockers separated from Release 2 candidates.
10. The release candidate passes the agreed validation checks.

## 8. Development stop rule

The team must stop adding broad new platform scope when Release 1 acceptance is the active goal.

Allowed work:

- bug fixes;
- missing pieces required by Release 1 acceptance criteria;
- UX polish for existing Release 1 workflows;
- tests, documentation, runbooks, and deployment hardening;
- small implementation gaps directly tied to the Formwork pilot.

Deferred work:

- public marketplace growth;
- real payment-provider activation;
- multi-service-pack expansion beyond Formwork pilot needs;
- autonomous AI delivery depth beyond governed assistance;
- global benchmarking / observatory productization;
- advanced analytics not required for pilot acceptance.

## 9. Release 2 direction

Release 2 should begin only after Release 1 acceptance.

Likely Release 2 themes:

- live payment provider integration and webhook processing;
- stronger subscription lifecycle management;
- client portal expansion;
- richer Formwork engineering service-pack functionality;
- additional professional-service packs;
- controlled marketplace onboarding;
- production deployment scaling.

Release 2 must receive its own target and sprint plan before implementation begins.

## 10. Governance rule

This document governs implementation planning after Stage 20.

Architecture Baseline v1.0 remains frozen. If implementation reveals a true baseline issue, it must be handled as a baseline change request, not as an informal sprint addition.





## 11. Release 1 acceptance status

R1-S5 accepted Release 1 for controlled local pilot readiness.

Decision:

```text
GO FOR RELEASE 1 LOCAL PILOT ACCEPTANCE
```

Boundary:

```text
Not approved for public launch, live payment capture, external production users, or autonomous regulated delivery.
```
