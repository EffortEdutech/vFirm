---
id: VFIRM-R1-S4-PILOT-OPERATIONS-DRESS-REHEARSAL-COMPLETION
title: "vFirm R1-S4 Pilot Operations Dress Rehearsal Completion Note"
version: "1.0"
status: "Sprint Complete"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# vFirm R1-S4 Pilot Operations Dress Rehearsal Completion Note v1.0

## 1. Sprint purpose

R1-S4 turns the stabilized Release 1 implementation into a repeatable pilot operations rehearsal.

This sprint verifies that support, incident response, reporting, review-board governance, onboarding, usage/billing readiness, and commercial-launch controls operate as one pilot runbook.

## 2. Delivered

| Area | Result |
|---|---|
| Pilot operations runbook | Added `R1_S4_PILOT_OPERATIONS_DRESS_REHEARSAL_RUNBOOK_v1.0.md`. |
| Operator demo script | Added `R1_S4_OPERATOR_DEMO_SCRIPT_v1.0.md`. |
| Evidence pack template | Added `R1_RELEASE_CANDIDATE_EVIDENCE_PACK_TEMPLATE_v1.0.md`. |
| Dress rehearsal smoke wrapper | Added `scripts/smoke-r1-dress-rehearsal.mjs`. |
| npm script | Added `npm run check:r1:dress-rehearsal`. |

## 3. Dress rehearsal coverage

The automated dress rehearsal runs:

```text
Release 1 JSON end-to-end smoke
  -> Release 1 PostgreSQL end-to-end smoke
  -> Release 1 hardening guard smoke
```

Together these verify:

- full Formwork pilot loop;
- PostgreSQL primary path;
- JSON fallback path;
- tenant isolation guards;
- professional authority denials;
- revoked pilot-user access behavior;
- data protection / special summary scope checks;
- commercial no-live-capture boundary.

## 4. Validation evidence

Command run:

```powershell
npm run check:r1:dress-rehearsal
```

Result:

```text
Release 1 end-to-end smoke passed (json backend).
Release 1 end-to-end smoke passed (postgres backend).
R1-S3 tenant/auth/policy/data protection hardening smoke test passed.
R1-S4 pilot operations dress rehearsal smoke passed.
```

## 5. Manual rehearsal package

The manual rehearsal package is now available:

1. `R1_S4_PILOT_OPERATIONS_DRESS_REHEARSAL_RUNBOOK_v1.0.md`
2. `R1_S4_OPERATOR_DEMO_SCRIPT_v1.0.md`
3. `R1_RELEASE_CANDIDATE_EVIDENCE_PACK_TEMPLATE_v1.0.md`

The team should use these documents during the Release 1 acceptance review.

## 6. R1-S4 conclusion

R1-S4 is complete.

The project is ready for:

> R1-S5 - Release Candidate Acceptance Review.
