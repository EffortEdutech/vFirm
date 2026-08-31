---
title: "Stage 18 - Controlled Expansion and RC Governance Runbook"
version: "1.0"
status: "implemented"
---

# Stage 18 - Controlled Expansion and RC Governance Runbook v1.0

## Expansion rhythm

1. Confirm stakeholder review decision approved expansion.
2. Create a named expansion cohort.
3. Set tenant and pilot-user limits.
4. Approve the cohort only when risk controls are acceptable.
5. Create tenant onboarding plan.
6. Complete onboarding only after readiness checks are reviewed.
7. Record release-candidate gate decision.
8. Expand only if RC gate is approved.

## Gate statuses

| Gate status | Meaning |
|---|---|
| `PENDING` | Gate exists but decision is not made. |
| `APPROVED` | Release candidate may proceed under controlled expansion. |
| `HOLD` | Expansion pauses until conditions are resolved. |
| `REJECTED` | Release candidate cannot proceed. |

## Non-negotiable rule

No uncontrolled pilot expansion. Every expansion needs a stakeholder decision, cohort, onboarding plan, and release-candidate gate.
