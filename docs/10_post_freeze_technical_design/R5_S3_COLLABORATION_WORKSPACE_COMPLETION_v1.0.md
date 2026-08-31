---
id: R5-S3-COLLABORATION-WORKSPACE-COMPLETION
title: "R5-S3 Collaboration Workspace Completion"
version: 1.0
status: "Completed"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
created: "2026-08-30"
---

# R5-S3 Collaboration Workspace Completion v1.0

## 1. Sprint objective

Implement a controlled collaboration workspace for trusted specialist participation after R5-S2 qualification and conflict gates pass.

The workspace is not an open marketplace. It is a scoped, auditable, revocable data-room and evidence boundary for approved firm-to-firm collaboration.

## 2. Implemented records

- CollaborationWorkspace
- CollaborationWorkspaceParticipant
- CollaborationWorkspaceEvidence

## 3. Gate and boundary rules

- A collaboration workspace can open only from a SpecialistInvitation with status READY_TO_SEND.
- The data-room policy must require minimum_necessary_access, client_confidential, and audit_required.
- Participant access must be explicitly granted.
- Evidence references must remain workspace-scoped with access_scope WORKSPACE_ONLY.
- Revoked participants cannot add workspace evidence.
- Workspace, participant, revocation, and evidence actions are attributable and auditable.
- Trusted-network scope remains bounded; no public marketplace discovery, bidding, or autonomous specialist appointment is introduced.

## 4. API surface

- GET /collaboration-workspaces
- GET /collaboration-workspace-participants
- GET /collaboration-workspace-evidence
- GET /network/r5-collaboration-workspace-summary
- POST /network/collaboration-workspaces
- POST /network/collaboration-workspaces/participants
- POST /network/collaboration-workspaces/participants/revoke
- POST /network/collaboration-workspaces/evidence

## 5. Database and contract evidence

- infra/database/migrations/0020_collaboration_workspace.sql defines the collaboration workspace tables and workspace-only evidence constraint.
- infra/database/schema.sql includes the R5-S3 tables for full schema rebuild.
- packages/core-domain/src/api-contracts.mjs and packages/core-domain/src/api-contracts.ts include the R5-S3 read and command contracts.
- apps/api/src/store.mjs contains JSON/PostgreSQL persistence builders and policy checks.
- apps/api/src/server.mjs exposes command routes and the R5-S3 readiness summary.

## 6. Executable evidence

Command:

```powershell
npm run check:r5:s3
```

Observed result:

```text
R5-S3 collaboration workspace smoke passed.
```

## 7. Smoke-test coverage

scripts/smoke-r5-collaboration-workspace.mjs proves:

- R5-S3 API contracts are present.
- A qualified provider can receive a READY specialist invitation after R5-S2 gates pass.
- A workspace with incomplete data-room controls is denied.
- A workspace with complete controls opens successfully.
- Requesting-firm and specialist participants are explicitly granted access.
- Workspace evidence is accepted only as WORKSPACE_ONLY.
- Revoked specialist participation blocks later evidence contribution.
- The R5-S3 summary reaches R5_S3_COLLABORATION_WORKSPACE_READY.
- Collaboration workspace audit events are reconstructable.

## 8. Sprint result

R5-S3 - Collaboration Workspace is complete.

Next sprint: R5-S4 - Responsibility and Approval Matrix.