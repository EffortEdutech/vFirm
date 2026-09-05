# AWIA Pilot-Day Client Walkthrough and Operator Script v1.0

Status: completed
Authorization: `AUTHORIZE_AWIA_PILOT_DAY_CLIENT_WALKTHROUGH_AND_OPERATOR_SCRIPT`
Date: 2026-09-05
Classification: explicit user-approved scope expansion

## Purpose

This script defines the controlled local pilot-day experience for showing a client how a Virtual Firm hires and operates named AWIA virtual staff.

The walkthrough demonstrates staff identity, salary plan, package binding, lifecycle control, task assignment, output drafting, human review, and client delivery draft preparation.

## Pilot-Day Story

Client-facing story:

> The client hires the Virtual Firm. The Virtual Firm operates named virtual staff as internal professional practice infrastructure. Each staff member has an identity, role, salary plan, package binding, tool boundary, supervisor, and audit trail. Staff can prepare work, but human authority remains explicit for approvals, client issue, regulated deliverables, and payment movement.

## Operator Script

1. Open the Virtual Firm Platform local pilot workspace.
2. Select the controlled AWIA pilot firm workspace.
3. Open `AI Workforce`.
4. Click `Provision Pilot Staff`.
5. Review the named virtual staff roster:
   - `CFO-001`
   - `FA-001`
   - `FAO-AP-001`
   - `FAO-REV-001`
   - `SAO-001`
   - `OPO-001`
   - `ARO-001`
   - `DATA-001`
6. Explain that monthly salary and package binding do not grant professional authority.
7. Activate one controlled staff member, normally `CFO-001`.
8. Open or confirm a project task exists.
9. Run readiness check.
10. Assign the task to the named staff workdesk.
11. Produce a draft-only staff output.
12. Perform human review.
13. Prepare client delivery draft.
14. Explain that final issue is still blocked by this pilot-day scope.
15. Show evidence/audit records for the staff actions.
16. Confirm locked boundaries remain visible.

## Client Experience Checklist

- [x] Client sees named virtual staff, not anonymous AI.
- [x] Client sees role, grade, salary plan, package status, lifecycle, tools, and authority boundary.
- [x] Client sees staff workdesk assignment.
- [x] Client sees output is draft-only.
- [x] Client sees human review before client delivery draft.
- [x] Client sees final issue remains human-controlled.
- [x] Client sees payment release remains denied.
- [x] Client sees no autonomous regulated approval.

## Operator Guardrails

Operators must not claim:

- virtual staff have professional authority because they have a role or salary;
- AI can approve regulated deliverables;
- AI can issue final client deliverables;
- AI can release payment;
- the pilot is production-ready;
- the private pilot is a public marketplace.

Operators should say:

- the client buys from the Virtual Firm;
- the Virtual Principal/human professional remains the authority holder;
- AWIA staff are controlled workers inside the Firm Runtime;
- every material staff action is attributable and auditable;
- draft outputs require human review before client-facing draft preparation.

## Evidence To Show

- AWIA package registry mapping
- AWIA staff provisioning run
- staff lifecycle event
- readiness decision
- staff workdesk item
- staff output draft
- human output review
- client delivery draft
- audit events

## Pilot-Day Success Result

Recommended result:

`GO_FOR_AWIA_CONTROLLED_LOCAL_PILOT_ACCEPTANCE_LOCK`

The result means AWIA is ready for a controlled local/private pilot experience only. It does not authorize production launch.
