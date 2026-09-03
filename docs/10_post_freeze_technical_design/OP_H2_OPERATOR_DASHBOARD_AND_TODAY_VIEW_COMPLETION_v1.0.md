---
id: OP-H2-OPERATOR-DASHBOARD-TODAY-VIEW-COMPLETION
title: "OP-H2 Operator Dashboard and Today View Completion"
version: "1.0"
status: "Completed"
date: "2026-09-03"
scope: "Controlled local/private pilot operation for selected active firm workspaces"
---

# OP-H2 Operator Dashboard and Today View Completion v1.0

## Completion statement

OP-H2 is complete.

The Virtual Firm Platform dashboard now exposes a selected-firm Today view for controlled multi-firm pilot operation. The view is bound to the active firm workspace and shows readiness, priorities, approvals, exceptions, deadlines, projects/tasks, pipeline, receivables, service exposure, and locked authority boundaries.

## What changed

### 1. Selected-firm readiness card

The dashboard summary area now includes an `op-h2-today-view` section with:

- selected firm name;
- firm type;
- subscription/service-line summary;
- daily operations status;
- tenant/firm-scoped operational counts.

### 2. Today priorities view

The dashboard now summarizes the operator's immediate pilot-day view:

- open enquiries;
- human review approvals;
- active exceptions;
- administrative deadlines;
- open projects and tasks;
- sales pipeline and proposal state;
- receivables outstanding.

### 3. Firm-specific service exposure

The Today view changes by active firm:

- Amanah Formwork Pilot Firm shows Formwork technical approval exposure: drawing, QA, evidence, and delivery package work remains blocked until valid human professional approval exists.
- NHL Global Solution shows organization-support service exposure: project reporting, technical writing, clerical work, and BizKick EDCS/document-control support.

NHL does not show Formwork Technical Delivery as an active subscribed operational module.

### 4. Dashboard runtime binding

The dashboard uses the scoped active-firm store. It also includes a deterministic browser-side fallback for daily operations so switching active firm workspaces updates the Today view immediately, even before the next `/operations/today` refresh.

The `/operations/today` API remains tenant/firm scoped and is verified for both pilot firms.

### 5. Locked boundaries remain visible

The dashboard explicitly preserves the pilot boundaries:

- no live payment movement;
- no autonomous regulated approval;
- no cross-firm dashboard leakage.

## Verification evidence

Executable evidence:

```bash
npm run check:op:h2
```

Smoke coverage:

- frontend contains `renderOperatorTodayView` and `buildClientDailyOperationsFallback`;
- dashboard contains selected-firm readiness and Today priorities markers;
- Formwork Today view exposes technical approval exposure;
- NHL Today view exposes organization-support service exposure;
- NHL does not inherit Formwork Technical Delivery as an active subscription;
- `/operations/today` returns firm-scoped readiness, approvals, exceptions, deadlines, workload, pipeline, and receivables;
- cross-tenant Today access is denied;
- checklist, README, decision register, package script, and full check chain are updated.

## Limitations

OP-H2 does not implement:

- OP-H3 Formwork pilot-day rehearsal;
- OP-H4 NHL pilot-day rehearsal;
- OP-H5 pilot evidence/export/closeout review;
- OP-H6 OP acceptance gate;
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

## Handoff

The next active sprint is:

`OP-H3 - Formwork Pilot Day Rehearsal`