---
id: VFIRM-RELEASE-4-PRODUCT-TARGET-SPRINT-PLAN
title: "Virtual Firm Release 4 Product Target and Sprint Plan"
version: "1.0"
status: "Technical Recommendation Ready"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Virtual Firm Release 4 Product Target and Sprint Plan v1.0

## 1. Purpose

Release 4 moves the Virtual Firm Platform from controlled local/factory operation to controlled staging and private pilot operations. It does not open the marketplace. It makes identity, tenant administration, deployment, support, observability, incident response, feedback, and pilot governance operational.

## 2. Release 4 product target

Release 4 is:

> A controlled staging/private pilot release that allows selected pilot users and firms to operate under real identity, tenant administration, support, data protection, observability, incident response, revocation, and stakeholder review controls.

## 3. Release 4 is not

Release 4 is not public self-serve launch, open marketplace onboarding, trusted specialist network release, ecosystem observatory release, autonomous regulated delivery release, or live payment movement unless explicitly promoted by product-owner decision.

## 4. Governing sources

| Area | Source |
|---|---|
| Security and identity | `VF-17_Security_Identity_and_Trust_Infrastructure_v1.0.md` |
| Governance and approvals | `VF-11_Professional_Governance_Compliance_and_Trust_v1.0.md` |
| AI governance | `VF-18_AI_Governance_Agent_Safety_and_Autonomous_Operations_v1.0.md` |
| Data, knowledge, memory | `VF-16_Data_Knowledge_and_Memory_Architecture_v1.0.md` |
| Staging/auth preparation | Stage 11 and Stage 12 post-freeze plans |
| Deployment and data protection | Stage 13 post-freeze plan |
| Tenant operations and support | Stage 14 post-freeze plan |
| Observability and incident response | Stage 15 post-freeze plan |
| Feedback and stakeholder review | Stage 16 and Stage 17 post-freeze plans |
| Controlled expansion | Stage 18 post-freeze plan |

## 5. Release 4 entry criteria

- [x] Release 3 evidence pack accepted.
- [x] Product owner approves staging/private pilot scope.
- [x] Authentication provider decision recorded.
- [x] Deployment environment selected.
- [x] Pilot cohort owner named.
- [x] Support owner named.
- [x] Data protection owner named.
- [x] Incident owner named.
- [x] Any Release 3 carry-over blockers accepted or closed for Release 4 planning.

Entry setup is recorded in `R4_ENTRY_SETUP_DECISION_v1.0.md`. The decisions are sufficient to begin R4-S1, but external pilot user invitation remains blocked until identity, tenant administration, staging deployment, support, incident, observability, and data protection evidence are accepted.

## 6. Fixed Release 4 sprint plan

| Sprint | Name | Outcome |
|---|---|---|
| R4-S1 | Staging Identity and Tenant Admin | Real auth, tenant membership, roles, invitations, suspension, and revocation are operational. |
| R4-S2 | Staging Deployment and Data Protection | Deployment, secrets, allowed origins, backups, restore rehearsal, and export checks are operational. |
| R4-S3 | Pilot Support and Incident Controls | Support desk, triage, incident response, escalation, suspension, and recovery runbooks are operational. |
| R4-S4 | Observability and Audit Review | Runtime traces, application logs, business audit, worker actions, and evaluation summaries are reviewable without private chain-of-thought. |
| R4-S5 | Private Pilot Cohort | Selected pilot users/firms are onboarded through cohort gates and controlled release-candidate approval. |
| R4-S6 | Pilot Learning Loop and R4 Evidence | Feedback is collected, classified, converted into backlog, and packaged into Release 4 evidence. |

## 6.1 Next active sprint

The next active sprint is:

```text
R4-S6 - Pilot Learning Loop and R4 Evidence
```

R4-S1 through R4-S6 are technically complete. Release 4 is ready for product-owner acceptance review. Release 5 must not begin until Release 4 evidence is accepted and trusted specialist network scope is explicitly authorized.
## 7. Sprint acceptance summaries

- R4-S1 passes when real identity, tenant admin, membership, suspension, revocation, and audit are operational.
- R4-S2 passes when staging deployment, secrets, allowed origins, backup, restore, and export are rehearsed.
- R4-S3 passes when support cases, triage, incident response, suspension, and recovery are operational.
- R4-S4 passes when traces, logs, worker action records, policy decisions, and business events can be reviewed without private chain-of-thought.
- R4-S5 passes when pilot cohort onboarding, offboarding, and expansion gates work.
- R4-S6 passes when feedback is classified into governed backlog and evidence supports go/no-go.

## 8. Release 4 acceptance criteria

1. Staging/private pilot access uses real identity controls.
2. Tenant administration and revocation are operational.
3. Deployment, secrets, backup, restore, and data export are rehearsed.
4. Support and incident workflows are operational.
5. Observability and audit review are sufficient for pilot operations.
6. Pilot cohort onboarding and offboarding are controlled.
7. Feedback becomes governed backlog.
8. No pilot workflow creates silent approval or orphan regulated work.
9. Marketplace and network scope remain deferred.
10. Release 4 evidence pack is accepted.

## 9. Verification commands

```text
npm run check
npm run check:r4
npm run check:r4:staging
npm run check:r4:postgres
node --check scripts/smoke-r4-entry-setup.mjs
git diff --check
```

## 10. Release 5 handoff condition

Release 5 may begin only after Release 4 evidence is accepted and the product owner approves trusted specialist network scope.