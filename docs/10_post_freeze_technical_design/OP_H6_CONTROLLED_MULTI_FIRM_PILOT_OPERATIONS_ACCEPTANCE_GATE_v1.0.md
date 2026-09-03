---
title: "OP-H6 Controlled Multi-Firm Pilot Operations Acceptance Gate"
version: "1.0"
status: "pending-product-owner-decision"
date: "2026-09-03"
scope: "Product-owner acceptance gate for controlled multi-firm pilot operations readiness"
---

# OP-H6 Controlled Multi-Firm Pilot Operations Acceptance Gate v1.0

## 1. Gate status

Gate status: `Pending Product-Owner Decision`.

Technical recommendation: `GO_FOR_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE`.

This gate prepares the acceptance decision. It does not record acceptance until the product owner explicitly says accept, hold, or reject.

## 2. Scope eligible for acceptance

The product owner may accept only this bounded scope:

> Controlled local/private pilot operation of Amanah Formwork Pilot Firm and NHL Global Solution as separate active firm workspaces in the Virtual Firm Platform.

This includes:

- selected-firm workspace operation;
- operator Today view;
- Formwork pilot-day rehearsal;
- NHL organization-support pilot-day rehearsal;
- firm-scoped evidence, audit, export, and closeout structure;
- human approval gates; and
- AI-worker authority boundaries.

## 3. Evidence basis

Acceptance should be based on:

- `OP_H1_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_FOUNDATION_COMPLETION_v1.0.md`;
- `OP_H2_OPERATOR_DASHBOARD_AND_TODAY_VIEW_COMPLETION_v1.0.md`;
- `OP_H3_FORMWORK_PILOT_DAY_REHEARSAL_COMPLETION_v1.0.md`;
- `OP_H4_NHL_GLOBAL_SOLUTION_PILOT_DAY_REHEARSAL_COMPLETION_v1.0.md`;
- `OP_H5_PILOT_EVIDENCE_AUDIT_EXPORT_CLOSEOUT_REVIEW_v1.0.md`; and
- `OP_EVIDENCE_PACK_COMPLETION_v1.0.md`.

## 4. Acceptance criteria

| Criterion | Required result | Current evidence result |
| --- | --- | --- |
| OP-H1 through OP-H5 evidence is complete | Pass | Pass |
| Amanah Formwork Pilot Firm controlled pilot day can be completed | Pass | Pass |
| NHL Global Solution controlled pilot day can be completed | Pass | Pass |
| No cross-tenant leakage in OP evidence | Pass | Pass |
| Human approval boundaries are explicit | Pass | Pass |
| AI worker actions are attributable | Pass | Pass |
| Material business actions can be reconstructed | Pass | Pass |
| Exports are tenant/firm scoped | Pass | Pass |
| Locked boundaries remain visible | Pass | Pass |
| Full regression passes | Pass | Pending final run in this sprint until recorded by commit notes |

## 5. Current limitations to accept or hold

The product owner should explicitly accept, hold, or reject the following limitations:

1. The core deliverable-review gate still carries inherited reference-vertical evidence validator keys.
2. NHL organization-support worker template still reuses `technical-drawing-assistant` for technical writing/document support.
3. Real human pilot logs are not yet filled from external production use.
4. Production multi-tenant onboarding remains outside this acceptance gate.

The technical recommendation is that these do not block controlled local/private pilot operations readiness, provided they remain visible as limitations.

## 6. Decision options

### Option A - Accept OP readiness

Use this if the product owner accepts controlled multi-firm pilot operations readiness with the listed limitations.

Acceptance wording:

> Bismillah... I accept OP-H1 through OP-H6 controlled multi-firm pilot operations readiness with the listed limitations. I authorize controlled local/private pilot operation of Amanah Formwork Pilot Firm and NHL Global Solution as separate active firm workspaces. I do not authorize production multi-tenant onboarding, public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, live payment movement, or uncontrolled tenant/client data sharing.

### Option B - Hold OP readiness

Use this if the evidence is mostly acceptable but additional proof, UI polish, operator walkthrough, real pilot log rows, or specific fixes are required before acceptance.

Hold wording:

> Bismillah... I hold OP acceptance pending the following closure items: [list items]. Do not widen scope.

### Option C - Reject OP readiness

Use this if evidence is unreliable, tenant boundaries fail, approval controls fail, or a prohibited capability was introduced.

Reject wording:

> Bismillah... I reject OP readiness because [reason]. Prepare a blocker correction plan only.

### Option D - Defer next scope decision

Use this if OP readiness can be reviewed later and no new implementation should start yet.

Deferral wording:

> Bismillah... Defer OP acceptance decision. Keep current scope frozen and prepare no new implementation until I decide.

## 7. Locked boundaries

This acceptance gate does not authorize:

- production multi-tenant onboarding;
- public marketplace;
- live matching;
- ranking;
- capacity allocation;
- VF-24 observatory publication;
- pricing intelligence;
- autonomous award;
- autonomous regulated approval;
- live payment movement; or
- uncontrolled tenant/client data sharing.

## 8. If accepted, recommended next scope

If OP-H6 is accepted, the recommended next development scope is not automatic implementation. The next step should be a product-owner scope decision between:

1. controlled human pilot operating support and real pilot log capture;
2. service-specific evidence validator split for non-Formwork organization-support services;
3. worker-template refinement for NHL organization-support workers;
4. UI polish for pilot operator walkthrough and evidence viewing; or
5. pause implementation and run the controlled pilot manually.

The safest next technical improvement is service-specific evidence validator split, because OP-H4/OP-H5 recorded that the current deliverable-review gate still carries inherited reference-vertical evidence validator keys.
