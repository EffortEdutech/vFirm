---
id: VFIRM-R1-RELEASE-CANDIDATE-EVIDENCE-PACK-TEMPLATE
title: "vFirm Release 1 Evidence Pack Template"
version: "1.0"
status: "Release Candidate Template"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# vFirm Release 1 Evidence Pack Template v1.0

## 1. Evidence pack metadata

| Field | Value |
|---|---|
| Release candidate | `RC-LOCAL-PILOT` |
| Release target | Controlled Formwork Engineering Virtual Firm pilot readiness |
| Rehearsal date |  |
| Operator |  |
| Environment | Local / Staging |
| Persistence mode | PostgreSQL / JSON fallback |
| API URL | `http://127.0.0.1:3091` |
| Web URL | `http://127.0.0.1:3090` |

## 2. Validation command evidence

| Command | Result | Evidence reference |
|---|---|---|
| `npm run db:migrate:docker` |  |  |
| `npm run check` |  |  |
| `npm run check:r1` |  |  |
| `npm run check:r1:json` |  |  |
| `npm run check:r1:postgres` |  |  |
| `npm run check:r1:hardening` |  |  |

## 3. Core workflow evidence

| Item | ID / status | Evidence reference |
|---|---|---|
| Tenant |  |  |
| Firm |  |  |
| Principal actor |  |  |
| Client |  |  |
| Intake session |  |  |
| Proposal |  |  |
| Proposal approval |  |  |
| Engagement |  |  |
| Project |  |  |
| Work package |  |  |
| Task |  |  |
| Evidence bundle |  |  |
| Deliverable draft |  |  |
| Deliverable review approval |  |  |
| Issued deliverable |  |  |
| Invoice |  |  |
| Payment status record |  |  |

## 4. Pilot operations evidence

| Control | ID / status | Evidence reference |
|---|---|---|
| Pilot user invite |  |  |
| Pilot user activation |  |  |
| Pilot user revocation check if applicable |  |  |
| Support case |  |  |
| Support case closure |  |  |
| Incident |  |  |
| Incident resolution |  |  |
| Pilot feedback |  |  |
| Acceptance review |  |  |
| Improvement item |  |  |
| Pilot report pack |  |  |

## 5. Governance and expansion evidence

| Control | ID / status | Evidence reference |
|---|---|---|
| Stakeholder review board |  |  |
| Stakeholder decision |  |  |
| Controlled expansion cohort |  |  |
| Onboarding plan |  |  |
| Release candidate gate |  |  |

## 6. Usage, billing, and commercial evidence

| Control | ID / status | Evidence reference |
|---|---|---|
| Tenant pilot controls |  |  |
| Usage events |  |  |
| Usage summary |  |  |
| Billing readiness review |  |  |
| Payment provider configuration |  |  |
| Subscription package |  |  |
| Commercial launch control |  |  |
| No-live-capture boundary confirmed |  |  |

## 7. Audit and policy evidence

| Evidence | Count / status | Evidence reference |
|---|---|---|
| Event log records |  |  |
| Audit event records |  |  |
| Policy decision records |  |  |
| Tenant isolation negative checks |  |  |
| Authority denial checks |  |  |
| Commercial live-capture denial check |  |  |

## 8. Open findings

| Finding | Classification | Owner | Decision |
|---|---|---|---|
|  | Release 1 blocker / stabilization / polish / Release 2 candidate |  |  |

## 9. Go/no-go recommendation

| Decision area | Status | Notes |
|---|---|---|
| Workflow operability |  |  |
| Tenant/data protection |  |  |
| Professional authority |  |  |
| Pilot operations |  |  |
| Commercial safety |  |  |
| Evidence completeness |  |  |

Recommendation:

```text
GO / NO-GO / HOLD
```
