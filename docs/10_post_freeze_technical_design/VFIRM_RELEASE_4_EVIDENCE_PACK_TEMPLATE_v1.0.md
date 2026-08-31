---
id: VFIRM-RELEASE-4-EVIDENCE-PACK-TEMPLATE
title: "Virtual Firm Release 4 Evidence Pack Template"
version: "1.0"
status: "Post-Freeze Technical Design"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Virtual Firm Release 4 Evidence Pack Template v1.0

## 1. Purpose

This template defines the evidence required to close Release 4. Release 4 is accepted only if controlled staging/private pilot operations prove identity, tenant administration, deployment/data protection, support, observability, incident response, pilot cohort control, auditability, and governed learning.

## 2. Release candidate identity

| Field | Value |
|---|---|
| Release | Release 4 |
| Candidate ID | `R4-RC-PENDING` |
| Candidate date | Pending |
| Prepared by | Pending |
| Reviewed by | Pending |
| Decision | Pending |

## 3. Scope statement

Release 4 candidate scope:

```text
Controlled staging/private pilot operations.
```

Out of scope:

```text
Public marketplace, trusted specialist network release, VF-24 ecosystem intelligence, autonomous regulated approval, uncontrolled production launch, live payment movement.
```

## 4. Architecture conformance

| Principle | Evidence | Result |
|---|---|---|
| Client buys from Virtual Firm, not AI | Firm-facing pilot identity and service records | Pending |
| Human professional authority preserved | Approval and responsible professional records | Pending |
| No orphan regulated work | Responsible professional and jurisdiction checks | Pending |
| No silent approval | Approval state and event checks | Pending |
| No direct LLM-to-regulated-final output | Regulated delivery denial checks | Pending |
| Tenant isolation | Cross-tenant staging denial checks | Pending |
| Attributable actions | Human, AI worker, system, and external service audit records | Pending |
| Deterministic workflow state | State-machine tests | Pending |
| Export portability | Staging export package check | Pending |
| Private chain-of-thought not exposed | Observability/evidence summary review | Pending |

## 5. Identity and tenant admin evidence

| Evidence item | Location/output | Result |
|---|---|---|
| Provider configuration contract | Pending | Pending |
| Authenticated principal model | Pending | Pending |
| Tenant membership binding | Pending | Pending |
| Invitation states | Pending | Pending |
| Activation/suspension/revocation states | Pending | Pending |
| Role assignment/removal states | Pending | Pending |
| Missing/invalid identity denials | Pending | Pending |
| Cross-tenant membership denials | Pending | Pending |
| Identity audit records | Pending | Pending |

## 6. Deployment and data protection evidence

| Evidence item | Location/output | Result |
|---|---|---|
| External staging deployment decision | Pending | Pending |
| Environment/secrets handling | Pending | Pending |
| Allowed origins/callbacks | Pending | Pending |
| Deployment rehearsal | Pending | Pending |
| Backup rehearsal | Pending | Pending |
| Restore rehearsal | Pending | Pending |
| Data export rehearsal | Pending | Pending |
| Tenant isolation checks | Pending | Pending |

## 7. Support and incident evidence

| Evidence item | Location/output | Result |
|---|---|---|
| Support case states | Pending | Pending |
| Triage categories | Pending | Pending |
| Support authority denials | Pending | Pending |
| Incident states | Pending | Pending |
| Escalation and recovery runbook | Pending | Pending |
| Suspension/recovery evidence | Pending | Pending |
| Support and incident audit records | Pending | Pending |

## 8. Observability and audit review evidence

| Evidence item | Location/output | Result |
|---|---|---|
| Runtime trace summaries | Pending | Pending |
| Application log summaries | Pending | Pending |
| Worker action records | Pending | Pending |
| Business event review | Pending | Pending |
| Policy decision review | Pending | Pending |
| Evidence summaries without private chain-of-thought | Pending | Pending |

## 9. Private pilot cohort evidence

| Evidence item | Location/output | Result |
|---|---|---|
| Cohort record | `GET /pilot/r4-private-cohort-gate`; `pilot_expansion_cohorts` | Pending |
| Pilot invitation gate | R4-S5 gate check `pilot_invitation_gate` | Pending |
| Pilot activation gate | R4-S5 gate check `pilot_activation_gate`; `POST /pilot/private-cohort/activate` | Pending |
| Pilot offboarding gate | R4-S5 gate check `pilot_offboarding_gate`; revoked user/resolved support evidence | Pending |
| Pilot expansion gate | R4-S5 gate check `pilot_expansion_gate`; completed onboarding and approved RC gate | Pending |
| Named/reaffirmed pilot owners | R4 entry decisions reaffirmed in R4-S5 completion record | Pending |
| Denial before evidence acceptance | `npm run check:r4:s5` denial coverage | Pending |

## 10. Pilot learning evidence

| Evidence item | Location/output | Result |
|---|---|---|
| Feedback intake | `POST /pilot/feedback`; `GET /pilot/learning-loop` | Pending |
| Feedback classification | R4-S6 evidence check `feedback_classification` | Pending |
| Governed backlog conversion | `POST /pilot/improvement-items`; `POST /pilot/improvement-items/update` | Pending |
| Out-of-scope feedback rejection | Denial code `R4_LEARNING_SCOPE_BOUNDARY_DENIED`; `npm run check:r4:s6` | Pending |
| Release 4 evidence pack completion | `GET /pilot/r4-evidence-go-no-go`; completed evidence pack document | Pending |

## 11. Verification command record

| Command | Result | Notes |
|---|---|---|
| `npm run check` | Pending |  |
| `npm run check:r4` | Pending |  |
| `npm run check:r4:staging` | Pending |  |
| `npm run check:r4:postgres` | Pending |  |
| `git diff --check` | Pending |  |

## 12. Remaining risks

| Risk | Classification | Owner | Disposition |
|---|---|---|---|
| Pending | Pending | Pending | Pending |

Classifications: Release 4 blocker, Release 5 candidate, later marketplace/ecosystem candidate, or accepted limitation.

## 13. Go/no-go recommendation

Recommendation:

```text
PENDING
```

Allowed recommendations:

```text
GO_FOR_RELEASE_4_ACCEPTANCE
GO_WITH_LIMITATIONS
NO_GO
```

## 14. Product-owner decision

Decision:

```text
PENDING
```

Decision date:

```text
PENDING
```

Approved by:

```text
PENDING
```
