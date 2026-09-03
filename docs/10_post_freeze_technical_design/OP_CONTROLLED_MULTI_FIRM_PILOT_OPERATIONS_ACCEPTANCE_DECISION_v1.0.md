---
id: OP-CONTROLLED-MULTI-FIRM-PILOT-OPERATIONS-ACCEPTANCE-DECISION
title: "OP Controlled Multi-Firm Pilot Operations Acceptance Decision"
version: "1.0"
status: "Accepted"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
accepted: "2026-09-03"
scope: "Controlled local/private pilot operation for Amanah Formwork Pilot Firm and NHL Global Solution"
---

# OP Controlled Multi-Firm Pilot Operations Acceptance Decision v1.0

## 1. Product-owner decision

The product owner accepts OP-H1 through OP-H6 controlled multi-firm pilot operations readiness with the listed limitations.

Recorded wording:

```text
Bismillah... I accept OP-H1 through OP-H6 controlled multi-firm pilot operations readiness with the listed limitations. I authorize controlled local/private pilot operation of Amanah Formwork Pilot Firm and NHL Global Solution as separate active firm workspaces. I do not authorize production multi-tenant onboarding, public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, live payment movement, or uncontrolled tenant/client data sharing.
```

## 2. Accepted scope

The accepted scope is controlled local/private pilot operation of two separate active firm workspaces inside the Virtual Firm Platform:

- Amanah Formwork Pilot Firm as a Formwork Engineering pilot workspace;
- NHL Global Solution as an Organization Support pilot workspace.

Accepted capability includes:

- controlled pilot-day operation setup;
- selected-firm operator dashboard and Today View;
- separate Formwork and NHL pilot-day rehearsal evidence;
- firm-scoped operational records;
- firm-scoped audit reconstruction;
- firm-scoped export evidence;
- explicit human approval boundary checks;
- cross-tenant denial evidence;
- pilot evidence closeout review;
- OP-H6 acceptance gate and executable verification.

## 3. Accepted pilot workspaces

### Amanah Formwork Pilot Firm

- Tenant: Formwork Pilot Tenant.
- Firm type: `FORMWORK_ENGINEERING`.
- Subscription/service pack: `VF-FORMWORK-PILOT`.
- Controlled pilot scope includes front desk, administration, sales/accounts, projects, invoices, AI workforce, ops, audit, approvals, and Formwork technical delivery support.
- Technical delivery remains bounded by controlled drawings, QA evidence, and explicit human professional approval.

### NHL Global Solution

- Tenant: NHL Global Solution Tenant.
- Principal: Nur Hernieliana.
- Firm type: `ORGANIZATION_SUPPORT`.
- Subscription/service pack: `VF-ORG-SUPPORT-PILOT`.
- Controlled pilot scope includes project reporting, technical writing, clerical work, and BizKick EDCS support.
- Formwork Technical Delivery and regulated Formwork approval modules are not included in the subscribed workspace profile.

## 4. Evidence basis

This decision relies on:

- `OP_H1_TO_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_SPRINT_PLAN_v1.0.md`;
- `OP_H1_TO_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_CHECKLIST_v1.0.md`;
- `OP_H1_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_FOUNDATION_v1.0.md`;
- `OP_H2_OPERATOR_DASHBOARD_AND_TODAY_VIEW_COMPLETION_v1.0.md`;
- `OP_H3_FORMWORK_PILOT_DAY_REHEARSAL_COMPLETION_v1.0.md`;
- `OP_H4_NHL_GLOBAL_SOLUTION_PILOT_DAY_REHEARSAL_COMPLETION_v1.0.md`;
- `OP_H5_PILOT_EVIDENCE_AUDIT_EXPORT_CLOSEOUT_REVIEW_v1.0.md`;
- `OP_EVIDENCE_PACK_COMPLETION_v1.0.md`;
- `OP_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE_GATE_v1.0.md`.

Executable evidence:

```bash
npm run check:op:h1
npm run check:op:h2
npm run check:op:h3
npm run check:op:h4
npm run check:op:h5
npm run check:op:h6
npm run check:op:acceptance:decision
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
- uncontrolled tenant/client data sharing;
- production legal, regulatory, insurance, or liability determination.

## 6. Operating condition

Controlled local/private pilot operation may proceed only for Amanah Formwork Pilot Firm and NHL Global Solution as separate active firm workspaces.

Every material business action must remain attributable to a tenant, firm, actor, and event. AI workers may support bounded tasks only inside their assigned authority envelope. Human approval remains required for regulated or client-facing decisions according to the relevant firm workspace rules.

Any future widening into production onboarding, public marketplace, matching, ranking, capacity allocation, VF-24 publication, pricing intelligence, autonomous award, autonomous regulated approval, or live payment movement requires a new explicit product-owner authorization and a bounded sprint plan before implementation.

## 7. Next scope decision required

OP-H1 through OP-H6 are accepted. The next development step should be selected through a new bounded scope decision.

Recommended next candidates:

1. Service-specific evidence validator split for non-Formwork service packs.
2. Controlled pilot operator improvements from the OP evidence closeout.
3. Production-readiness preparation, without production onboarding authorization.

