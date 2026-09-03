---
id: MT-RUNTIME-BINDING-ACCEPTANCE-DECISION
title: "Multi-Tenant Runtime Binding Acceptance Decision"
version: "1.0"
status: "Accepted"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
accepted: "2026-09-03"
scope: "Controlled local/private pilot operation for verified active firm workspaces"
---

# Multi-Tenant Runtime Binding Acceptance Decision v1.0

## 1. Product-owner decision

The product owner accepts MT-H1 through MT-H6 multi-tenant runtime binding with the listed limitations.

Recorded wording:

```text
Bismillah... I accept MT-H1 through MT-H6 multi-tenant runtime binding with the listed limitations. I authorize controlled local/private pilot operation of the Formwork pilot firm and NHL Global Solution as separate active firm workspaces. I do not authorize production multi-tenant onboarding, public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, or live payment movement.
```

## 2. Accepted scope

The accepted scope is controlled local/private pilot operation of multiple verified firm workspaces inside the Virtual Firm Platform.

Accepted capability includes:

- active firm workspace selection;
- selected-firm workspace identity and visible copy;
- selected-firm subscription and service-line display;
- selected-firm module availability;
- selected-firm AI worker bindings and defaults;
- Formwork pilot workspace operation as a Formwork Engineering firm;
- NHL Global Solution workspace operation as an Organization Support firm;
- tenant-scoped active workspace summaries;
- cross-tenant active workspace denial;
- subscription-boundary pages for modules outside a firm's subscribed profile;
- controlled local/private pilot evidence, audit, and export rehearsal.

## 3. Accepted pilot workspaces

### Amanah Formwork Pilot Firm

- Firm type: `FORMWORK_ENGINEERING`.
- Subscription/service pack: `VF-FORMWORK-PILOT`.
- Modules include technical delivery and approvals.
- AI workers are bound to Formwork-oriented operational support.
- Technical Delivery remains subject to controlled drawings, QA evidence, and explicit human professional approval.

### NHL Global Solution

- Principal: Nur Hernieliana.
- Firm type: `ORGANIZATION_SUPPORT`.
- Subscription/service pack: `VF-ORG-SUPPORT-PILOT`.
- Services include project reporting, technical writing, clerical work, and BizKick EDCS.
- Modules include front desk, administration, sales/accounts, projects, invoices, AI workforce, ops, and audit.
- Formwork Technical Delivery and regulated Formwork approval modules are not included in the subscribed workspace profile.

## 4. Evidence basis

This decision relies on:

- `MT_MULTI_TENANT_RUNTIME_BINDING_ACCEPTANCE_DECISION_GATE_v1.0.md`;
- `MT_MULTI_TENANT_WORKSPACE_RUNTIME_BINDING_SPRINT_PLAN_v1.0.md`;
- `MT_MULTI_TENANT_WORKSPACE_RUNTIME_BINDING_CHECKLIST_v1.0.md`;
- `MT_H1_WORKSPACE_PROFILE_AND_SUBSCRIPTION_CONTRACT_LOCK_COMPLETION_v1.0.md`;
- `MT_H2_BACKEND_ACTIVE_WORKSPACE_SUMMARY_COMPLETION_v1.0.md`;
- `MT_H3_LOCAL_SEED_AND_PILOT_WORKSPACE_DATA_REPAIR_COMPLETION_v1.0.md`;
- `MT_H4_FRONTEND_WORKSPACE_SHELL_BINDING_COMPLETION_v1.0.md`;
- `MT_H5_MODULE_AND_WORKER_RUNTIME_BINDING_COMPLETION_v1.0.md`;
- `MT_H6_MULTI_TENANT_PILOT_REHEARSAL_AND_EVIDENCE_PACK_COMPLETION_v1.0.md`.

Executable evidence:

```bash
npm run check:mt:h6
npm run check:mt:acceptance
npm run check:mt:acceptance:decision
npm run check
```

## 5. Boundaries still locked

This acceptance does not authorize:

- production multi-tenant onboarding;
- public marketplace;
- live matching;
- ranking;
- capacity allocation;
- VF-24 observatory publication;
- pricing intelligence;
- autonomous award;
- autonomous regulated approval;
- live payment movement;
- uncontrolled tenant or client data sharing;
- production legal, regulatory, insurance, or liability determination.

## 6. Operating condition

Controlled local/private pilot operation may proceed only for verified active firm workspaces and bounded rehearsal/test workspaces.

Any future widening into production onboarding, public marketplace, matching, ranking, capacity allocation, VF-24 publication, pricing intelligence, autonomous award, autonomous regulated approval, or live payment movement requires a new explicit product-owner authorization and a bounded sprint plan before implementation.

## 7. Recommended next development scope

Recommended next scope:

`OP-H1 - Controlled Multi-Firm Pilot Operations Foundation`

This should prepare the Virtual Firm Platform to operate a real controlled day-in-the-life pilot for both Amanah Formwork Pilot Firm and NHL Global Solution. The scope should focus on operator workflow, pilot logs, selected-firm operational readiness, manual approvals, issue handling, evidence capture, and pilot closeout.

It should not widen into production onboarding, public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, or live payment movement.
