---
id: VFIRM-R1-S4-PILOT-OPERATIONS-DRESS-REHEARSAL-RUNBOOK
title: "vFirm R1-S4 Pilot Operations Dress Rehearsal Runbook"
version: "1.0"
status: "Active Release 1 Runbook"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# vFirm R1-S4 Pilot Operations Dress Rehearsal Runbook v1.0

## 1. Purpose

This runbook turns the Release 1 implementation into a repeatable pilot operations rehearsal.

The rehearsal proves that the controlled Formwork Engineering Virtual Firm pilot can be operated as one coherent workflow, not as disconnected stage demos.

## 2. Scope

In scope:

- Formwork pilot setup;
- full client-to-delivery-to-commercial loop;
- support case handling;
- incident handling;
- pilot feedback and improvement loop;
- pilot reporting;
- stakeholder review board;
- controlled expansion and onboarding;
- usage/billing readiness;
- commercial launch control in test/prep mode only;
- audit and policy evidence collection.

Out of scope:

- live payment capture;
- public marketplace launch;
- real regulated engineering issue for external use;
- adding new product modules;
- broad Release 2 features.

## 3. Preconditions

Before the rehearsal:

1. Local PostgreSQL container is available if testing primary mode.
2. `.env.local` has `DATABASE_URL` for PostgreSQL mode.
3. `npm run db:migrate:docker` has been run successfully.
4. `npm run check:r1` passes.
5. Operator understands that Release 1 commercial launch is test/preparation only.

## 4. Automated rehearsal commands

Run JSON fallback rehearsal:

```powershell
npm run check:r1:json
```

Run PostgreSQL primary rehearsal:

```powershell
npm run check:r1:postgres
```

Run hardening guard rehearsal:

```powershell
npm run check:r1:hardening
```

Run combined Release 1 rehearsal smoke:

```powershell
npm run check:r1
```

Run full project validation:

```powershell
npm run check
```

## 5. Manual operator rehearsal sequence

Open the local workspace:

```powershell
npm run dev
```

Then use the web workspace at:

```text
http://127.0.0.1:3090
```

Operator sequence:

1. Confirm API status is online and Release 1 stabilization banner is visible.
2. Open Dashboard and confirm persistence status.
3. Open Workflow and create tenant.
4. Create firm and principal actor.
5. Open Clients and create pilot client.
6. Open Intake and create Formwork intake with complete inputs.
7. Open Proposals and create proposal.
8. Approve proposal as the Principal.
9. Accept proposal and open project.
10. Open Projects and run delivery task actions.
11. Create evidence bundle.
12. Draft, review, and issue deliverable.
13. Create and issue invoice.
14. Record payment status only as status recording, not live capture.
15. Open AI Workforce and verify bounded AI worker participation if present.
16. Open Support and create/close one support case.
17. Open Ops and create/resolve one incident.
18. Open Pilot and record feedback, acceptance review, and improvement item.
19. Open Review Board and record stakeholder review decision.
20. Open Expansion and record controlled pilot cohort plus onboarding plan.
21. Open Usage/Billing and record usage controls, usage events, and billing readiness review.
22. Open Commercial Launch and prepare provider/package metadata only.
23. Record test-mode launch control only.
24. Open Audit and confirm material actions are visible.
25. Export or record evidence references in the Release 1 evidence pack template.

## 6. Pass/fail criteria

The rehearsal passes only if:

- the automated R1 JSON smoke passes;
- the automated R1 PostgreSQL smoke passes;
- the R1 hardening smoke passes;
- the operator can explain the current workflow state from the UI;
- support, incident, reporting, review board, onboarding, usage, and commercial launch controls are traceable;
- commercial launch remains no-live-payment-capture;
- no cross-tenant or unauthorized approval gap is found.

## 7. Evidence to capture

Capture the following into the Release 1 evidence pack:

- command outputs from validation checks;
- API health/persistence status;
- dashboard summary;
- created tenant/firm/client/project/invoice IDs;
- support case ID and closure status;
- incident ID and resolution status;
- pilot feedback and improvement item IDs;
- report pack ID;
- stakeholder review decision ID;
- onboarding plan ID and completion status;
- usage/billing summary;
- commercial launch control ID and no-live-capture boundary;
- audit event count and selected event references;
- policy decision count and selected policy references.

## 8. Escalation rules

If a failure occurs:

- classify it as Release 1 blocker if it affects tenant isolation, professional authority, data protection, auditability, or commercial live-capture safety;
- classify it as Release 1 stabilization if it affects repeatability, operator clarity, or PostgreSQL/JSON parity;
- classify it as Release 1 polish if it affects wording or minor UX only;
- classify it as Release 2 candidate if it requires new product capability.

## 9. Completion condition

R1-S4 is complete when this runbook, the operator demo script, the evidence pack template, and the completion note exist and the validation commands pass.
