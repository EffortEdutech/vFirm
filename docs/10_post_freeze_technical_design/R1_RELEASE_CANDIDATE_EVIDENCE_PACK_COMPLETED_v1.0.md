---
id: VFIRM-R1-RELEASE-CANDIDATE-EVIDENCE-PACK-COMPLETED
title: "vFirm Release 1 Completed Evidence Pack"
version: "1.0"
status: "Completed Evidence Pack"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# vFirm Release 1 Completed Evidence Pack v1.0

## 1. Evidence pack metadata

| Field | Value |
|---|---|
| Release candidate | `RC-LOCAL-PILOT` |
| Release target | Controlled Formwork Engineering Virtual Firm pilot readiness |
| Rehearsal date | 2026-08-27 |
| Operator | Codex local release gate |
| Environment | Local development with Docker PostgreSQL and JSON fallback checks |
| Persistence mode | PostgreSQL primary verified; JSON fallback verified |
| API URL | `http://127.0.0.1:3091` for normal dev; smoke scripts use isolated 309# ports |
| Web URL | `http://127.0.0.1:3090` |

## 2. Validation command evidence

| Command | Result | Evidence reference |
|---|---|---|
| `npm run db:migrate:docker` | Passed | Applied 0, skipped 15 on Docker container `vfirm-postgres`; migrations already current. |
| `npm run check` | Passed | Baseline, implementation artifacts, migrations, policy, API, web, and Stage 4-20 smoke tests passed. |
| `npm run check:r1` | Passed | Release 1 JSON end-to-end smoke and R1 hardening smoke passed. |
| `npm run check:r1:json` | Passed | Release 1 end-to-end smoke passed on JSON backend. |
| `npm run check:r1:postgres` | Passed | Release 1 end-to-end smoke passed on PostgreSQL backend. |
| `npm run check:r1:hardening` | Passed | R1-S3 tenant/auth/policy/data-protection hardening smoke passed. |
| `npm run check:r1:dress-rehearsal` | Passed | JSON, PostgreSQL, and hardening rehearsal checks passed as one pilot operations rehearsal. |

## 3. Core workflow evidence

| Item | ID / status | Evidence reference |
|---|---|---|
| Tenant | Created during R1 smoke | `scripts/smoke-r1-end-to-end.mjs` |
| Firm | Created during R1 smoke | `scripts/smoke-r1-end-to-end.mjs` |
| Principal actor | Created during firm setup | `scripts/smoke-r1-end-to-end.mjs` |
| Client | Created with firm-client relationship | `scripts/smoke-r1-end-to-end.mjs` |
| Intake session | Complete with Formwork pilot inputs | `scripts/smoke-r1-end-to-end.mjs` |
| Proposal | Created from intake | `scripts/smoke-r1-end-to-end.mjs` |
| Proposal approval | Approved by Principal authority | `scripts/smoke-r1-end-to-end.mjs` |
| Engagement | Created from accepted proposal | `scripts/smoke-r1-end-to-end.mjs` |
| Project | Opened from accepted proposal | `scripts/smoke-r1-end-to-end.mjs` |
| Work package | Created during project opening | `scripts/smoke-r1-end-to-end.mjs` |
| Task | Assigned, started, and completed | `scripts/smoke-r1-end-to-end.mjs` |
| Evidence bundle | Created before deliverable review/issue | `scripts/smoke-r1-end-to-end.mjs` |
| Deliverable draft | Created as document/version record | `scripts/smoke-r1-end-to-end.mjs` |
| Deliverable review approval | Approved by professional authority | `scripts/smoke-r1-end-to-end.mjs` |
| Issued deliverable | Issued only after evidence and approval | `scripts/smoke-r1-end-to-end.mjs` |
| Invoice | Created and issued | `scripts/smoke-r1-end-to-end.mjs` |
| Payment status record | Status recorded; no live payment capture | `scripts/smoke-r1-end-to-end.mjs` |

## 4. Pilot operations evidence

| Control | ID / status | Evidence reference |
|---|---|---|
| Pilot user invite | Created | `scripts/smoke-r1-end-to-end.mjs` |
| Pilot user activation | Activated | `scripts/smoke-r1-end-to-end.mjs` |
| Pilot user revocation check | Verified in hardening smoke | `scripts/smoke-r1-hardening.mjs` |
| Support case | Created | `scripts/smoke-r1-end-to-end.mjs` |
| Support case closure | Closed | `scripts/smoke-r1-end-to-end.mjs` |
| Incident | Created | `scripts/smoke-r1-end-to-end.mjs` |
| Incident resolution | Resolved | `scripts/smoke-r1-end-to-end.mjs` |
| Pilot feedback | Submitted | `scripts/smoke-r1-end-to-end.mjs` |
| Acceptance review | Accepted | `scripts/smoke-r1-end-to-end.mjs` |
| Improvement item | Created and closed | `scripts/smoke-r1-end-to-end.mjs` |
| Pilot report pack | Generated | `scripts/smoke-r1-end-to-end.mjs` |

## 5. Governance and expansion evidence

| Control | ID / status | Evidence reference |
|---|---|---|
| Stakeholder review board | Created | `scripts/smoke-r1-end-to-end.mjs` |
| Stakeholder decision | Approved | `scripts/smoke-r1-end-to-end.mjs` |
| Controlled expansion cohort | Created and approved | `scripts/smoke-r1-end-to-end.mjs` |
| Onboarding plan | Created and completed | `scripts/smoke-r1-end-to-end.mjs` |
| Release candidate gate | Template ready for R1 acceptance | `R1_RELEASE_CANDIDATE_EVIDENCE_PACK_TEMPLATE_v1.0.md` and this completed pack |

## 6. Usage, billing, and commercial evidence

| Control | ID / status | Evidence reference |
|---|---|---|
| Tenant pilot controls | Active | `scripts/smoke-r1-end-to-end.mjs` |
| Usage events | Recorded | `scripts/smoke-r1-end-to-end.mjs` |
| Usage summary | Billing ready | `scripts/smoke-r1-end-to-end.mjs` |
| Billing readiness review | Ready | `scripts/smoke-r1-end-to-end.mjs` |
| Payment provider configuration | Test provider metadata prepared | `scripts/smoke-r1-end-to-end.mjs` |
| Subscription package | Package definition created | `scripts/smoke-r1-end-to-end.mjs` |
| Commercial launch control | Test-mode approved | `scripts/smoke-r1-end-to-end.mjs` |
| No-live-capture boundary confirmed | Passed | `scripts/smoke-r1-end-to-end.mjs` and `scripts/smoke-r1-hardening.mjs` |

## 7. Audit and policy evidence

| Evidence | Count / status | Evidence reference |
|---|---|---|
| Event log records | Verified present during R1 smoke | `scripts/smoke-r1-end-to-end.mjs` |
| Audit event records | At least 10 expected and verified | `scripts/smoke-r1-end-to-end.mjs` |
| Policy decision records | At least 1 expected and verified | `scripts/smoke-r1-end-to-end.mjs` |
| Tenant isolation negative checks | Passed | `scripts/smoke-r1-hardening.mjs` |
| Authority denial checks | Passed | `scripts/smoke-r1-hardening.mjs` |
| Commercial live-capture denial check | Passed | `scripts/smoke-r1-hardening.mjs` |

## 8. Open findings

| Finding | Classification | Owner | Decision |
|---|---|---|---|
| Real external auth provider is not activated for production users. | Release 2 candidate / staging prerequisite | Product owner / engineering | Not a Release 1 local pilot blocker because provider seam and staging-header flow are present. |
| Live payment capture is intentionally disabled. | Release 2 candidate | Product owner / commercial | Not a Release 1 blocker; no-live-capture is a Release 1 safety requirement. |
| Manual browser-based operator rehearsal still should be performed by human pilot operator before external pilot. | Release 1 operational follow-up | Pilot operator | Does not block local RC acceptance; required before inviting external pilot users. |
| Production hosting, secrets, backups, and domain activation remain environment-specific. | Release 2 / staging deployment work | DevOps / product owner | Not a local RC blocker; must be closed before external production launch. |

## 9. Go/no-go recommendation

| Decision area | Status | Notes |
|---|---|---|
| Workflow operability | GO | Automated R1 end-to-end JSON and PostgreSQL flows passed. |
| Tenant/data protection | GO | Negative tenant-scope checks passed. |
| Professional authority | GO | Unauthorized review and ungated issue checks passed. |
| Pilot operations | GO | Support, incident, reporting, review-board, onboarding, usage, and launch controls are covered by rehearsal. |
| Commercial safety | GO | Test-mode preparation works and live-capture activation is rejected. |
| Evidence completeness | GO | Evidence pack, runbook, demo script, completion notes, and validation commands exist. |

Recommendation:

```text
GO FOR RELEASE 1 LOCAL PILOT ACCEPTANCE
```

Boundary:

```text
Not approved for public launch, live payment capture, or unbounded marketplace operation.
```
