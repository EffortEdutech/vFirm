---
id: VFIRM-RELEASE-5-PRODUCT-TARGET-SPRINT-PLAN
title: "Virtual Firm Release 5 Product Target and Sprint Plan"
version: "1.0"
status: "Release 5 Acceptance Decision Ready"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Virtual Firm Release 5 Product Target and Sprint Plan v1.0

## 1. Purpose

Release 5 introduces a trusted specialist network and controlled firm-to-firm collaboration. This comes before any open marketplace. The aim is to prove collaboration, qualification, conflict checks, responsibility boundaries, scoped data sharing, and auditability with known participants.

## 2. Release 5 product target

Release 5 is:

> A trusted specialist network release that allows a Virtual Principal to request, qualify, engage, supervise, review, and audit specialist or partner-firm contribution through credential gates, jurisdiction checks, conflict checks, scoped data sharing, responsibility matrix, and human approval boundaries.

## 3. Release 5 is not

Release 5 is not an open public marketplace, price-first work allocation system, public ratings substitute for credentials, uncontrolled tenant data sharing, automated award of regulated work, or ecosystem benchmark publication.

## 4. Governing sources

| Area | Source |
|---|---|
| Marketplace/network principles | `VF-14_Marketplace_and_Network_Engine_v1.0.md` |
| Network collaboration and federation | `VF-22_Network_Collaboration_and_Enterprise_Federation_Engine_v1.0.md` |
| Capacity economy signals | `VF-23_Global_Capacity_Supply_Demand_and_Workforce_Economy_Engine_v1.0.md` |
| Governance and trust | `VF-11_Professional_Governance_Compliance_and_Trust_v1.0.md` |
| Security and data isolation | `VF-17_Security_Identity_and_Trust_Infrastructure_v1.0.md` |
| Service delivery | `VF-19_Service_Delivery_and_Professional_Practice_Engine_v1.0.md` |

## 5. Release 5 entry criteria

- [x] Release 4 evidence pack accepted.
- [x] Product owner approves trusted specialist network scope.
- [ ] Credential verification minimums defined.
- [ ] Jurisdiction check minimums defined.
- [ ] Conflict check minimums defined.
- [ ] Collaboration agreement model approved.
- [ ] Responsibility matrix model approved.
- [ ] Data-sharing and revocation policy approved.

## 6. Core objects

| Object | Purpose |
|---|---|
| `ProfessionalProfile` | Verified professional identity and credential summary. |
| `FirmProfile` | Trusted firm identity and capability summary. |
| `Capability` | Service capability, practice area, risk class, jurisdiction, and evidence requirements. |
| `TrustSignal` | Non-credential trust information such as history, quality, responsiveness, and platform review. |
| `ConflictCheck` | Records conflict screening result before collaboration. |
| `SpecialistInvitation` | Invitation to join a controlled collaboration. |
| `CollaborationAgreement` | Scope, confidentiality, responsibility, commercial, and authority terms. |
| `ResponsibilityMatrix` | Accountable firm, responsible professional, reviewer, approver, and permitted worker actions. |
| `SharedEvidenceSpace` | Scoped project data/evidence sharing boundary. |
| `SpecialistAssignment` | Work request, acceptance, performance, review, and closeout lifecycle. |

## 7. Fixed Release 5 sprint plan

| Sprint | Name | Outcome |
|---|---|---|
| R5-S1 | Trusted Network Profiles | ProfessionalProfile, FirmProfile, Capability, Credential, and TrustSignal records are implemented. |
| R5-S2 | Qualification and Conflict Gate | Matching and invitations are denied unless credential, jurisdiction, insurance, conflict, capacity, and policy gates pass. |
| R5-S3 | Collaboration Workspace | Scoped shared evidence/project workspace supports controlled specialist participation and revocation. |
| R5-S4 | Responsibility and Approval Matrix | Each collaboration records accountable firm, responsible professional, reviewer, approver, and permitted worker actions. |
| R5-S5 | Assignment and Delivery Loop | Specialist work can be requested, accepted, performed, reviewed, approved, closed, and audited. |
| R5-S6 | Network Evidence Pack and Go/No-Go | Evidence proves qualification-first collaboration, data isolation, and responsibility boundaries. |

## 8. Sprint acceptance summaries

- R5-S1 passes when professional and firm profiles distinguish identity, credentials, capabilities, and trust signals.
- R5-S2 passes when unqualified, conflicted, invalid-jurisdiction, or policy-failing participants are denied before matching or invitation.
- R5-S3 passes when shared evidence spaces are scoped, auditable, and revocable.
- R5-S4 passes when accountable firm, responsible professional, reviewer, approver, and permitted worker actions are explicit.
- R5-S5 passes when specialist assignment can be requested, accepted, performed, reviewed, closed, and audited.
- R5-S6 passes when evidence proves qualification-first collaboration and tenant isolation.

## 9. Release 5 acceptance criteria

1. Trusted profiles distinguish identity, credentials, capabilities, and trust signals.
2. Specialist matching is qualification-first, not price-first.
3. Conflict checks are mandatory before collaboration.
4. Shared data is scoped, auditable, and revocable.
5. Responsibility matrix is explicit.
6. Regulated work remains tied to authorized human professionals.
7. Specialist assignment lifecycle works end-to-end.
8. Cross-tenant leakage is denied.
9. Collaboration records can be exported where legally permissible.
10. Release 5 evidence pack is accepted.

## 10. Verification commands

```text
npm run check:r5:s1
npm run check:r5:s2
npm run check:r5:s3
npm run check:r5:s4
npm run check:r5:s5
npm run check:r5:s6
npm run check:r5
npm run check
git diff --check
```

## 11. Marketplace handoff condition

Marketplace/ecosystem work may begin only after Release 5 evidence is accepted and the product owner approves marketplace governance, publication, matching, privacy, and benchmark thresholds.
## 12. R5-S1 completion record

Status: COMPLETED

Date: 2026-08-30

R5-S1 implements the trusted-network profile foundation:

- NetworkProfessionalProfile records separate discoverability from professional authority.
- NetworkFirmProfile records firm participation in trusted-network scope.
- NetworkCapability records are qualification-required and trusted-network-only.
- NetworkCredential records evidence without granting authority.
- NetworkTrustSignal records reputation or performance signals that cannot substitute for credentials.
- GET /network/r5-profile-summary reports deterministic readiness checks.
- 
npm run check:r5:s1 is the executable sprint gate.

Next active sprint: R5-S2 - Qualification and Conflict Gate.
## 13. R5-S2 completion record

Status: COMPLETED

Date: 2026-08-30

R5-S2 implements the qualification and conflict gate foundation:

- NetworkConflictCheck records conflict screening before invitation.
- NetworkQualificationGate evaluates credential, jurisdiction, insurance, conflict, capacity, and policy status.
- SpecialistInvitation is denied unless linked to a PASS gate.
- GET /network/r5-qualification-summary reports deterministic readiness checks.
- 
npm run check:r5:s2 is the executable sprint gate.

Next active sprint: R5-S3 - Collaboration Workspace.

## 14. R5-S3 completion record

Status: COMPLETED

Date: 2026-08-30

R5-S3 implements the controlled collaboration workspace foundation:

- CollaborationWorkspace opens only from a READY specialist invitation.
- Data-room policy requires minimum-necessary access, client confidentiality, and audit.
- CollaborationWorkspaceParticipant grants and revokes explicit participant access.
- CollaborationWorkspaceEvidence remains workspace-scoped with WORKSPACE_ONLY access.
- Revoked participants are denied further evidence contribution.
- GET /network/r5-collaboration-workspace-summary reports deterministic readiness checks.

npm run check:r5:s3 is the executable sprint gate.

Next active sprint: R5-S4 - Responsibility and Approval Matrix.

## 15. R5-S4 completion record

Status: COMPLETED

Date: 2026-08-30

R5-S4 implements the responsibility and approval matrix foundation:

- ResponsibilityMatrix records accountable firm, responsible professional, reviewer, approver, regulated scope, and permitted worker actions.
- Responsible professional and approver must be active workspace participant actors.
- Reviewer and approver are separately recorded where reviewer exists.
- approval_required=false is denied for regulated collaboration.
- Worker actions cannot include approval, certification, seal, regulated issue, or final regulated output.
- GET /network/r5-responsibility-matrix-summary reports deterministic readiness checks.

npm run check:r5:s4 is the executable sprint gate.

Next active sprint: R5-S5 - Assignment and Delivery Loop.

## 16. R5-S5 completion record

Status: COMPLETED

Date: 2026-08-30

R5-S5 implements the specialist assignment and delivery loop foundation:

- SpecialistAssignment records request, acceptance, work start, delivery, review, approval, and closure.
- Assignment creation requires an active ResponsibilityMatrix.
- Delivery requires explicit evidence references.
- Review and approval states are deterministic and ordered.
- Recorded approver controls approval and closure.
- GET /network/r5-assignment-delivery-summary reports deterministic readiness checks.

npm run check:r5:s5 is the executable sprint gate.

Next active sprint: R5-S6 - Network Evidence Pack and Go/No-Go.
## 17. R5-S6 completion record

Status: COMPLETED

Date: 2026-08-31

R5-S6 implements the Release 5 network evidence pack and go/no-go closure gate:

- GET /network/r5-network-evidence-go-no-go aggregates R5-S1 through R5-S5 readiness.
- The gate verifies qualification-first collaboration, trusted-network-only boundaries, explicit responsibility, evidence-backed delivery, tenant-scoped evidence, and reconstructable audit records.
- The gate returns GO_FOR_RELEASE_5_ACCEPTANCE only when every required check passes.
- Release 5 acceptance remains a product-owner decision; no silent acceptance is created.
- R5_RELEASE_CANDIDATE_EVIDENCE_PACK_COMPLETED_v1.0.md records the release evidence pack.
- R5_ACCEPTANCE_DECISION_GATE_v1.0.md prepares the explicit product-owner acceptance decision.

npm run check:r5:s6 is the executable sprint gate.

Next active step: product-owner Release 5 acceptance decision.
