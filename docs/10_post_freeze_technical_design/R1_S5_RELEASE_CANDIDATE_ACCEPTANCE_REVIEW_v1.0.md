---
id: VFIRM-R1-S5-RELEASE-CANDIDATE-ACCEPTANCE-REVIEW
title: "vFirm R1-S5 Release Candidate Acceptance Review"
version: "1.0"
status: "Release Candidate Accepted for Local Pilot"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# vFirm R1-S5 Release Candidate Acceptance Review v1.0

## 1. Review purpose

R1-S5 is the final Release 1 gate.

This review checks whether the bounded Release 1 target has been met and whether any remaining findings block local pilot acceptance.

## 2. Release candidate

| Field | Value |
|---|---|
| Release candidate | `RC-LOCAL-PILOT` |
| Release target | Controlled Formwork Engineering / Temporary Works Virtual Firm pilot readiness |
| Review date | 2026-08-27 |
| Review basis | R1-S1 through R1-S4 completion evidence plus R1-S5 validation commands |
| Recommendation | GO for Release 1 local pilot acceptance |

## 3. Acceptance criteria review

| # | Acceptance criterion | Status | Evidence |
|---:|---|---|---|
| 1 | Full Formwork pilot loop can run without raw JSON inspection. | PASS | Web workspace exists; R1 runbook and demo script define operator flow; R1 smoke proves backend flow. |
| 2 | PostgreSQL is primary persistent store, with JSON fallback preserved for development mode. | PASS | `npm run check:r1:postgres` and `npm run check:r1:json` passed. |
| 3 | All material workflow actions are tenant-scoped and attributable. | PASS | R1-S3 command scope hardening and negative tenant checks passed. |
| 4 | Human authority gates prevent silent approval and direct AI-to-final regulated output. | PASS | R1 hardening denies unauthorized deliverable review and ungated issue. |
| 5 | Audit, event, and policy decision records are visible enough for operator review. | PASS | R1 smoke verifies audit and policy records; Audit workspace exists. |
| 6 | Pilot tenant onboarding, membership, suspension, revocation, and support controls are documented and tested. | PASS | Pilot user activation/revocation, support case, expansion, and onboarding checks passed. |
| 7 | Observability, incident response, and operator metrics have a working pilot process. | PASS | Ops readiness, incidents, operator metrics, and R1-S4 runbook exist; Stage 15 and R1 checks passed. |
| 8 | Billing readiness and commercial-launch controls exist without accidental live payment capture. | PASS | Usage/billing and commercial launch smoke checks passed; live capture status is denied. |
| 9 | Development team has a known backlog with Release 1 blockers separated from Release 2 candidates. | PASS | R1-S1 backlog lock completed. |
| 10 | Release candidate passes agreed validation checks. | PASS | `npm run check`, `npm run check:r1`, and dress rehearsal passed. |

## 4. Validation evidence summary

| Command | R1-S5 result |
|---|---|
| `npm run db:migrate:docker` | Passed. 15 migrations already current on Docker PostgreSQL. |
| `npm run check` | Passed. Baseline, implementation, policy, API, web, and Stage 4-20 checks passed. |
| `npm run check:r1` | Passed. R1 end-to-end JSON and R1 hardening checks passed. |
| `npm run check:r1:json` | Passed. |
| `npm run check:r1:postgres` | Passed. |
| `npm run check:r1:hardening` | Passed. |
| `npm run check:r1:dress-rehearsal` | Passed. |

## 5. Findings classification

### Release 1 blockers

None found during R1-S5 automated acceptance review.

### Release 1 stabilization / operational follow-up

| Finding | Decision |
|---|---|
| Human pilot operator should still perform the browser-based demo using the R1-S4 operator script before inviting external users. | Keep as operational follow-up before external pilot. Not a local RC blocker. |
| Evidence pack uses smoke-script evidence references rather than a captured human demo recording/screenshots. | Accept for local RC; capture manual evidence during first human pilot rehearsal. |

### Release 1 polish

| Finding | Decision |
|---|---|
| Some record detail views still expose raw record sections. | Accept for local pilot; improve progressively if operators struggle. |
| Workspace navigation is broad because Stage 1-20 controls are all visible. | Accept for local pilot; consider grouping/navigation refinement in Release 2. |

### Release 2 candidates

| Candidate | Decision |
|---|---|
| Real external auth provider activation. | Defer to Release 2/staging deployment programme. |
| Live payment provider checkout/webhooks. | Defer; Release 1 intentionally blocks live capture. |
| Public marketplace onboarding. | Defer; Release 1 remains controlled pilot. |
| Multi-service-pack expansion beyond Formwork. | Defer until Formwork pilot is accepted. |
| Production deployment, domain, secrets, backups, and external user rollout. | Defer to post-local-pilot deployment track unless separately authorized. |

## 6. Release 1 boundary conditions

Release 1 acceptance means:

```text
Accepted for controlled local pilot operation and next human pilot rehearsal.
```

Release 1 acceptance does not mean:

```text
Approved for public launch, live payment capture, external production users, or autonomous regulated delivery.
```

## 7. Go/no-go decision

Decision:

```text
GO FOR RELEASE 1 LOCAL PILOT ACCEPTANCE
```

Conditions:

1. Keep live payment capture disabled.
2. Keep public marketplace disabled.
3. Keep AI workers bounded and human-reviewed.
4. Run the human browser-based operator rehearsal before inviting external pilot users.
5. Treat production deployment/auth/payment activation as a new bounded post-R1 plan, not as automatic stage expansion.

## 8. R1-S5 conclusion

R1-S5 is complete.

Release 1 is accepted for local pilot readiness.

The next planning step is not another open-ended numbered stage. The next step should be one of:

- Human Pilot Rehearsal;
- Release 1 local pilot handoff package;
- bounded Release 2 target definition;
- staging deployment plan if the user approves external pilot preparation.
