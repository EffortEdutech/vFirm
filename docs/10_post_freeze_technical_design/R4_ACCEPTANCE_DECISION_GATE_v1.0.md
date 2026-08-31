---
id: VFIRM-R4-ACCEPTANCE-DECISION-GATE
title: "Release 4 Acceptance Decision Gate"
version: "1.0"
status: "ACCEPTED_WITH_LIMITATIONS"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
decision_date: "PENDING"
---

# Release 4 Acceptance Decision Gate v1.0

## 1. Purpose

This document prepares the product-owner decision gate for Release 4.

Release 4 is technically recommended for acceptance as a controlled staging/private pilot release. This gate does not itself accept Release 4 and does not authorize Release 5. It gives the product owner a clear decision surface, evidence basis, boundary statement, risk disposition, and exact acceptance wording.

## 2. Candidate under decision

| Field | Value |
|---|---|
| Release | Release 4 |
| Candidate ID | `R4-RC-PRIVATE-PILOT` |
| Candidate scope | Controlled staging/private pilot operations |
| Technical recommendation | `GO_FOR_RELEASE_4_ACCEPTANCE` |
| Evidence status | `EVIDENCE_READY` |
| Product-owner decision | Pending |

## 3. Evidence basis

The decision should be based on the completed Release 4 evidence pack:

```text
docs/10_post_freeze_technical_design/R4_RELEASE_CANDIDATE_EVIDENCE_PACK_COMPLETED_v1.0.md
```

Executable evidence reports:

```text
npm run check:r4:s6
npm run check:r4
npm run check
```

Observed R4-S6 evidence output:

```text
EVIDENCE_READY
GO_FOR_RELEASE_4_ACCEPTANCE
```

## 4. Release 4 accepted capability

If accepted, Release 4 means the Virtual Firm Platform has demonstrated controlled staging/private pilot operations with:

- provider-neutral staging identity and tenant administration;
- pilot invitation, activation, suspension, and revocation controls;
- staging deployment and data-protection readiness;
- tenant-scoped export integrity and secret exclusion;
- support desk and incident controls;
- human-only operational authority for support, incident, and private cohort activation;
- runtime trace, application log, business audit, policy decision, and worker-action review summaries;
- no private chain-of-thought exposure;
- private pilot cohort gate and activation;
- feedback intake, classification, acceptance review, and governed backlog conversion;
- out-of-scope learning backlog denial;
- Release 4 evidence/go-no-go recommendation.

## 5. Release 4 does not authorize

Acceptance of Release 4 must not be interpreted as approval for:

- public marketplace;
- trusted specialist network release;
- VF-24 ecosystem intelligence;
- autonomous regulated approval;
- direct LLM-to-regulated-final output;
- live payment movement or payment capture;
- uncontrolled production launch;
- broad multi-practice expansion beyond approved pilot scope;
- unlimited tenant or user onboarding.

## 6. Decision options

The product owner may choose one of the following.

### Option A - Accept Release 4

Decision code:

```text
ACCEPT_RELEASE_4
```

Meaning:

Release 4 is accepted as a controlled staging/private pilot capability. The project may proceed to a separate Release 5 scope authorization decision, but Release 5 does not start automatically.

### Option B - Accept Release 4 with limitations

Decision code:

```text
ACCEPT_RELEASE_4_WITH_LIMITATIONS
```

Meaning:

Release 4 is accepted, but named risks or limitations must remain as active constraints before Release 5 or wider pilot work begins.

### Option C - Hold Release 4

Decision code:

```text
HOLD_RELEASE_4
```

Meaning:

Release 4 is not accepted yet. The product owner must name blockers or missing evidence before another acceptance review.

### Option D - Reject Release 4

Decision code:

```text
REJECT_RELEASE_4
```

Meaning:

Release 4 is not accepted and must be reworked before any Release 5 scope discussion.

## 7. Recommended decision

Recommended product-owner decision:

```text
ACCEPT_RELEASE_4_WITH_LIMITATIONS
```

Reason:

The executable evidence supports acceptance, but several limitations should stay visible before Release 5 begins: physical external staging provider selection is still provider-neutral, pilot owner roles are interim, the R4 UI is lighter than the API/control-plane capability, and marketplace/network/VF-24 feedback must remain excluded from Release 4 backlog.

If the product owner is comfortable treating those as accepted limitations rather than blockers, Option A is also technically supportable.

## 8. Remaining limitations to accept or convert into blockers

| Limitation | Proposed classification | Proposed disposition |
|---|---|---|
| External production-grade staging provider remains provider-neutral in local executable evidence | Accepted limitation / Release 5 candidate | Keep provider-neutral adapter until physical provider is selected |
| Private pilot owner roles are interim product-owner roles | Accepted limitation | Replace with named operational owners before wider pilot |
| Full productized R4 UI is lighter than API/control-plane capability | Release 5 candidate | Improve during network/private operations hardening |
| Marketplace, trusted specialist network, and VF-24 requests may appear in pilot feedback | Later release candidate | R4 learning backlog rejects these from Release 4 scope |

## 9. Acceptance consequences

If Release 4 is accepted:

1. Release 4 closes as controlled staging/private pilot capability.
2. Release 5 remains blocked until the product owner explicitly authorizes trusted specialist network scope.
3. The Release 5 entry criteria become active:
   - Release 4 evidence pack accepted;
   - product owner approves trusted specialist network scope;
   - credential verification minimums defined;
   - jurisdiction check minimums defined;
   - conflict check minimums defined;
   - collaboration agreement model approved;
   - responsibility matrix model approved;
   - data-sharing and revocation policy approved.
4. Marketplace and ecosystem intelligence remain later-release work.

## 10. Exact decision wording

To accept Release 4 and authorize only Release 5 planning, use:

```text
Bismillah... I accept Release 4 with the listed limitations and authorize preparation of the Release 5 trusted specialist network scope decision gate. I do not yet authorize Release 5 implementation.
```

To accept Release 4 and authorize Release 5 scope implementation, use:

```text
Bismillah... I accept Release 4 with the listed limitations and authorize Release 5 trusted specialist network scope. Proceed to R5-S1 - Trusted Network Profiles.
```

To hold Release 4, use:

```text
Bismillah... Hold Release 4 acceptance. The blockers are: [name blockers].
```

## 11. Recorded product-owner decision

Decision:

```text
ACCEPT_RELEASE_4_WITH_LIMITATIONS_AND_AUTHORIZE_RELEASE_5_TRUSTED_NETWORK_SCOPE
```

Decision date:

```text
2026-08-30
```

Approved by:

```text
PENDING
```
## 12. Recorded acceptance

Product-owner decision was received on 2026-08-30.

Recorded wording:

> Bismillah... I accept Release 4 with the listed limitations and authorize Release 5 trusted specialist network scope. Proceed to R5-S1 - Trusted Network Profiles.

Decision result:

- Release 4 is accepted with the listed limitations.
- Release 5 trusted specialist network scope is authorized.
- R5-S1 - Trusted Network Profiles may proceed.
- The authorization remains bounded by trusted-network scope only; it does not authorize public marketplace, VF-24 ecosystem intelligence, autonomous regulated award, autonomous regulated approval, or live payment movement.