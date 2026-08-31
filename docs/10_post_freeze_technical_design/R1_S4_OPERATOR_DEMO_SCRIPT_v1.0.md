---
id: VFIRM-R1-S4-OPERATOR-DEMO-SCRIPT
title: "vFirm R1-S4 Operator Demo Script"
version: "1.0"
status: "Active Release 1 Demo Script"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# vFirm R1-S4 Operator Demo Script v1.0

## Demo opening

"This is vFirm Release 1 stabilization. The target is a controlled Formwork Engineering / Temporary Works Virtual Firm pilot, not a public marketplace or live payment system. The purpose of this demo is to show that one professional can operate the controlled firm workflow end to end with audit, authority, support, and commercial-launch controls."

## Demo route

1. Dashboard
   - Show API online status.
   - Show Release 1 stabilization banner.
   - Show persistence mode.
   - Explain that PostgreSQL is primary and JSON fallback exists for development.

2. Workflow
   - Create tenant.
   - Create firm and principal actor.
   - Explain that the client buys from the Virtual Firm, not from AI.

3. Clients
   - Create or show pilot client.
   - Explain firm-client relationship.

4. Intake
   - Create Formwork intake.
   - Show required Formwork fields.
   - Explain missing-information gate.

5. Proposals
   - Create proposal and price build-up.
   - Approve proposal as human Principal.
   - Accept proposal and open project.

6. Projects
   - Show engagement, project, work package, task, and evidence bundle.
   - Start/complete task.
   - Draft, review, and issue deliverable.
   - Emphasize no silent approval and no direct AI-to-final regulated output.

7. Invoices
   - Create and issue invoice.
   - Record payment status as operational status only.

8. AI Workforce
   - Show AI worker identity and bounded support role.
   - Explain AI cannot approve or issue controlled deliverables.

9. Support
   - Create and close support case.
   - Explain operator support traceability.

10. Ops
    - Create and resolve incident.
    - Explain pilot incident response.

11. Pilot
    - Record feedback.
    - Record acceptance review.
    - Create and close improvement item.

12. Review Board
    - Open review board.
    - Record stakeholder decision.

13. Expansion
    - Create controlled cohort.
    - Complete onboarding plan.
    - Explain expansion is gated, not open-ended.

14. Usage/Billing
    - Create tenant pilot controls.
    - Record usage.
    - Record billing readiness.

15. Commercial Launch
    - Prepare payment provider metadata.
    - Create subscription package definition.
    - Record test-mode launch control.
    - Say clearly: "Release 1 does not enable live payment capture."

16. Audit
    - Show event and audit trail.
    - Show policy decision records.
    - Explain that every material action must be attributable.

## Demo close

"The Release 1 pilot is successful when the operator can complete this full loop, explain the controls, and produce the evidence pack without relying on raw JSON. Any missing release-critical item becomes a Release 1 blocker; new product features are deferred to Release 2."

## Demo anti-scope reminders

Do not promise:

- live payment capture;
- autonomous regulated engineering approval;
- public marketplace access;
- multi-service-pack scale;
- global observatory product readiness.
