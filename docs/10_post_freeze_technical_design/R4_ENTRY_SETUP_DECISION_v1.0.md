---
id: R4-ENTRY-SETUP-DECISION
title: "Release 4 Entry Setup Decision"
version: "1.0"
status: "Accepted - R4-S1 Ready"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Release 4 Entry Setup Decision v1.0

## 1. Purpose

This document records the minimum entry setup decisions needed to begin Release 4 controlled staging/private pilot work after Release 3 acceptance.

Release 4 remains bounded to controlled staging/private pilot operations. This decision does not authorize public marketplace launch, trusted specialist network release, VF-24 ecosystem intelligence, autonomous regulated approval, uncontrolled production launch, or live payment movement.

## 2. Entry decision summary

| Decision area | Release 4 entry decision | Status |
|---|---|---|
| Authentication provider | Use a provider-neutral external identity adapter contract for R4-S1. Physical provider selection remains a named R4-S1 implementation/configuration gate before any external pilot account is activated. | Accepted for R4-S1 start |
| Deployment environment | Use controlled staging-first deployment posture. Local controlled staging remains the initial executable environment; external staging deployment is promoted to R4-S2 before any private pilot user invitation. | Accepted for R4-S1 start |
| Pilot cohort owner | Product owner is interim pilot cohort owner until a named pilot operations owner is appointed. | Accepted for R4-S1 start |
| Support owner | Product owner is interim support owner until a named support operator is appointed. | Accepted for R4-S1 start |
| Data protection owner | Product owner is interim data protection owner until a named data protection owner is appointed. | Accepted for R4-S1 start |
| Incident owner | Product owner is interim incident owner until a named incident commander/operator is appointed. | Accepted for R4-S1 start |
| Release 3 carry-over risks | Promote accepted R3 carry-over risks into R4 implementation gates, not hidden assumptions. | Accepted |

## 3. Auth provider boundary

R4-S1 may begin by implementing and testing:

- external identity provider configuration contract;
- tenant membership binding;
- invitation and activation states;
- suspension and revocation states;
- attributable identity audit events;
- denial behavior for missing, invalid, suspended, or revoked identity;
- tenant isolation for membership and role assignment.

R4-S1 must not invite external pilot users until either:

1. a real provider is selected and configured; or
2. the product owner explicitly authorizes a narrower private test using a controlled staging identity simulator.

## 4. Deployment boundary

R4-S1 may continue in local controlled staging while identity and tenant administration are hardened.

R4-S2 must select and rehearse the external staging deployment path before private pilot use. At minimum R4-S2 must cover:

- environment/secrets handling;
- allowed origins;
- backup and restore rehearsal;
- export integrity;
- operational runbook;
- data protection review.

## 5. Owner boundary

The product owner may act as interim owner for entry setup only. Before private pilot invitations are sent, Release 4 must either name or explicitly reaffirm:

- pilot cohort owner;
- support owner;
- data protection owner;
- incident owner.

## 6. R3 carry-over disposition

| R3 carry-over item | R4 disposition |
|---|---|
| Standalone generic role/worker skill compiler hardening | R4 candidate. Must not block R4-S1 identity work, but must remain visible before broader pilot expansion. |
| Direct relational persistence for Factory certification tables | R4 candidate. Should be assessed during R4-S2 staging/data hardening before multi-tenant staging scale. |
| Productized Factory UI | R4 optional candidate. Build only if it materially improves controlled pilot operations; do not force it into R4-S1. |

## 7. R4-S1 authorization

R4-S1 - Staging Identity and Tenant Admin may begin under the following constraints:

- provider-neutral adapter first;
- no silent approval;
- no orphan regulated work;
- no public marketplace;
- no live payment movement;
- no external pilot invitation until identity, tenant membership, suspension, revocation, audit, and data protection checks pass.

## 8. Verification

Required entry verification:

```text
npm run check:r4
npm run check:docs
git diff --check
```
