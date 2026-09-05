# AWIA Client Staff Operating Experience and Workdesk Completion v1.0

Status: completed
Date: 2026-09-05
Classification: explicit user-approved scope expansion

## Authorizations

- `AUTHORIZE_AWIA_CLIENT_STAFF_OPERATING_EXPERIENCE_HARDENING`
- `AUTHORIZE_AWIA_REAL_TASK_ASSIGNMENT_AND_STAFF_WORKDESK`

## Scope Completed

The AFCC client/operator experience now supports controlled operation of named virtual staff rather than a static staff preview.

Implemented:
- live staff roster rendering from persisted AWIA staff records
- staff lifecycle control from the AFCC UI
- task assignment to a named AWIA virtual staff member
- deterministic readiness gate before workdesk assignment
- persisted staff workdesk item collection
- workdesk table showing staff, task, status, tool, evidence, and assignment summary
- API command for controlled staff task assignment
- smoke coverage for client/project/task creation through AWIA workdesk assignment

## New API Collection

- `GET /awia-staff-workdesk-items`

## New API Command

- `POST /awia/virtual-staff/assign-task`

The command requires:
- tenant and firm scope
- staff code
- existing task ID
- client/project context
- tool/action
- evidence references
- actor attribution

The command denies assignment unless the AWIA deterministic readiness gate returns `ALLOW`.

## Boundary Still Locked

This does not authorize:
- autonomous regulated approval
- direct LLM to regulated final output
- live payment release
- public marketplace operation
- uncontrolled external data sharing
- production launch

Assigned workdesk items remain human-supervised and review-bound.

## Verification

Covered by:

- `npm run check:awia:next-bundle`
- `npm run check:awia:vs:s6`
- `npm run check:awia:pilot-rehearsal`
- `npm run check:web`
- `npm run check:web:navigation`

## Handoff

Recommended next action:

`AUTHORIZE_AWIA_STAFF_OUTPUT_REVIEW_AND_CLIENT_DELIVERY_DRAFT_LOOP`

Purpose: let assigned virtual staff produce draft-only work outputs into their workdesk, route them to human review, and prepare client-facing delivery drafts without final issue authority.
