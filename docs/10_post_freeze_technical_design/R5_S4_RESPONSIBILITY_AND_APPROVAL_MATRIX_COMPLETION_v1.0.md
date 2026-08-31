---
id: R5-S4-RESPONSIBILITY-AND-APPROVAL-MATRIX-COMPLETION
title: "R5-S4 Responsibility and Approval Matrix Completion"
version: 1.0
status: "Completed"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
created: "2026-08-30"
---

# R5-S4 Responsibility and Approval Matrix Completion v1.0

## 1. Sprint objective

Implement a responsibility and approval matrix for trusted specialist collaboration so every controlled collaboration has explicit accountable firm, responsible professional, reviewer, approver, and permitted worker action boundaries.

## 2. Implemented record

- ResponsibilityMatrix

## 3. Governance rules

- Accountable firm must be one of the firms in the scoped collaboration workspace.
- Responsible professional actor is mandatory and must be an active workspace participant.
- Approver actor is mandatory and must be an active workspace participant.
- Reviewer is recorded separately where present and cannot be the same actor as approver.
- Approval is required for regulated collaboration; approval_required=false is denied.
- Permitted worker actions must be explicit.
- Worker actions cannot include approval, certification, seal, regulated issue, or final regulated output.
- The matrix does not grant professional authority by itself.

## 4. API surface

- GET /responsibility-matrices
- GET /network/r5-responsibility-matrix-summary
- POST /network/responsibility-matrices

## 5. Database and contract evidence

- infra/database/migrations/0021_responsibility_matrix.sql defines the responsibility_matrices table and approval/worker-action constraints.
- infra/database/schema.sql includes the R5-S4 table for full schema rebuild.
- packages/core-domain/src/api-contracts.mjs and packages/core-domain/src/api-contracts.ts include R5-S4 read and command contracts.
- apps/api/src/store.mjs contains JSON/PostgreSQL persistence builders and governance checks.
- apps/api/src/server.mjs exposes command routes, read scoping, and R5-S4 readiness summary.

## 6. Executable evidence

Command:

```powershell
npm run check:r5:s4
```

Observed result:

```text
R5-S4 responsibility and approval matrix smoke passed.
```

## 7. Smoke-test coverage

scripts/smoke-r5-responsibility-matrix.mjs proves:

- R5-S4 API contracts are present.
- A responsibility matrix can be recorded only inside an active R5-S3 collaboration workspace.
- A non-active responsible professional is denied.
- approval_required=false is denied.
- Worker approval/certification authority is denied.
- Reviewer and approver cannot be collapsed when reviewer is present.
- A valid matrix records accountable firm, responsible professional, reviewer, approver, regulated scope, and permitted worker actions.
- The R5-S4 summary reaches R5_S4_RESPONSIBILITY_MATRIX_READY.
- Responsibility matrix audit events are reconstructable.

## 8. Sprint result

R5-S4 - Responsibility and Approval Matrix is complete.

Next sprint: R5-S5 - Assignment and Delivery Loop.