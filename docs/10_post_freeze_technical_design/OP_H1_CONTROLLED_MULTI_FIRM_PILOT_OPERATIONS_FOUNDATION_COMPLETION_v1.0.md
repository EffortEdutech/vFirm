---
title: "OP-H1 Controlled Multi-Firm Pilot Operations Foundation Completion"
version: "1.0"
status: "complete"
date: "2026-09-03"
scope: "Controlled local/private pilot operations foundation"
---

# OP-H1 Controlled Multi-Firm Pilot Operations Foundation Completion v1.0

## Status

OP-H1 is complete.

The Virtual Firm Platform now has a locked controlled multi-firm pilot operations foundation for running later pilot-day rehearsals across Amanah Formwork Pilot Firm and NHL Global Solution.

## What OP-H1 locked

OP-H1 defines:

- pilot operation scope contract;
- pilot operator roles and responsibilities;
- active-firm readiness model;
- pilot-day checklist model;
- firm-scoped pilot activity log model;
- issue, incident, and support log model;
- manual approval categories;
- exception categories;
- firm-specific operating boundaries for Formwork and NHL;
- next sprint handoff to OP-H2.

## Tenant and firm scoping

Every OP foundation record must include tenant and firm scope. Pilot-day and activity records must also link to a pilot day where applicable.

Minimum required scoping fields:

- `tenant_id`;
- `firm_id`;
- `pilot_day_id` where relevant;
- `actor_id`;
- `actor_type`;
- timestamp;
- evidence summary where relevant.

## Human authority controls

OP-H1 preserves the governing Virtual Firm Platform principles:

- no silent approval;
- no autonomous regulated approval;
- no live payment movement;
- no direct AI worker authority to approve regulated final output;
- no uncontrolled tenant/client data sharing;
- regulated Formwork technical approval remains tied to a responsible human professional.

## Evidence

Primary contract:

- `OP_H1_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_FOUNDATION_v1.0.md`

Executable validation:

```bash
npm run check:op:h1
```

Expected result:

```json
{
  "smoke": "op-h1-controlled-multi-firm-pilot-operations-foundation",
  "result": "passed",
  "status": "foundation_locked",
  "next_active_sprint": "OP-H2 - Operator Dashboard and Today View"
}
```

## Boundary controls preserved

OP-H1 does not implement or authorize:

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
- uncontrolled tenant or client data sharing.

## Next sprint

Proceed to `OP-H2 - Operator Dashboard and Today View` after product-owner authorization.
