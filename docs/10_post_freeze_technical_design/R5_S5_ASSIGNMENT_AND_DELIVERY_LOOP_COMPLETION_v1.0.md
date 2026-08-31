---
id: R5-S5-ASSIGNMENT-AND-DELIVERY-LOOP-COMPLETION
title: "R5-S5 Assignment and Delivery Loop Completion"
version: 1.0
status: "Completed"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
created: "2026-08-30"
---

# R5-S5 Assignment and Delivery Loop Completion v1.0

## 1. Sprint objective

Implement a trusted specialist assignment and delivery loop under the R5-S4 ResponsibilityMatrix so specialist work can be requested, accepted, performed, delivered with evidence, reviewed, approved, closed, and audited.

## 2. Implemented record

- SpecialistAssignment

## 3. State machine

The deterministic state machine is:

```text
REQUESTED -> ACCEPTED -> IN_PROGRESS -> DELIVERED -> REVIEWED -> APPROVED -> CLOSED
```

## 4. Governance rules

- Specialist assignments require an active ResponsibilityMatrix.
- The responsible professional must accept, start, and deliver assignment evidence.
- Delivery requires explicit evidence references.
- The recorded reviewer reviews delivered work where a reviewer is configured.
- The recorded approver approves and closes the specialist assignment.
- Approval cannot occur before review.
- Closure cannot occur before approval.
- Provider-side responsible professional cannot approve the requester approval step unless they are the recorded approver.
- No autonomous regulated approval is introduced.

## 5. API surface

- GET /specialist-assignments
- GET /network/r5-assignment-delivery-summary
- POST /network/specialist-assignments
- POST /network/specialist-assignments/accept
- POST /network/specialist-assignments/start
- POST /network/specialist-assignments/deliver
- POST /network/specialist-assignments/review
- POST /network/specialist-assignments/approve
- POST /network/specialist-assignments/close

## 6. Database and contract evidence

- infra/database/migrations/0022_specialist_assignment_delivery_loop.sql defines specialist_assignments and allowed lifecycle states.
- infra/database/schema.sql includes the R5-S5 table for full schema rebuild.
- packages/core-domain/src/api-contracts.mjs and packages/core-domain/src/api-contracts.ts include R5-S5 read and command contracts.
- apps/api/src/store.mjs contains JSON/PostgreSQL persistence and state transition checks.
- apps/api/src/server.mjs exposes command routes, read scoping, and the R5-S5 readiness summary.

## 7. Executable evidence

Command:

```powershell
npm run check:r5:s5
```

Observed result:

```text
R5-S5 assignment and delivery loop smoke passed.
```

## 8. Smoke-test coverage

scripts/smoke-r5-assignment-delivery-loop.mjs proves:

- R5-S5 API contracts are present.
- Assignment without active responsibility matrix is denied.
- Delivery before acceptance/start is denied.
- Unauthorized provider-side approval is denied.
- Delivery without evidence references is denied.
- Valid assignment progresses through REQUESTED, ACCEPTED, IN_PROGRESS, DELIVERED, REVIEWED, APPROVED, and CLOSED.
- The read endpoint exposes the closed assignment within firm scope.
- The R5-S5 summary reaches R5_S5_ASSIGNMENT_DELIVERY_READY.
- Assignment lifecycle audit events are reconstructable.

## 9. Sprint result

R5-S5 - Assignment and Delivery Loop is complete.

Next sprint: R5-S6 - Network Evidence Pack and Go/No-Go.