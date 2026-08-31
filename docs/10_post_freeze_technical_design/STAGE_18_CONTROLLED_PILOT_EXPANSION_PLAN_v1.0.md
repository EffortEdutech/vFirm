---
title: "Stage 18 - Controlled Pilot Expansion, Tenant Onboarding, and Release Candidate Governance Plan"
version: "1.0"
status: "implemented"
---

# Stage 18 - Controlled Pilot Expansion, Tenant Onboarding, and Release Candidate Governance Plan v1.0

Stage 18 converts stakeholder approval into a controlled expansion process.

It introduces:

- limited pilot expansion cohorts;
- tenant onboarding plans;
- release-candidate governance gates;
- explicit expansion summary status.

## API surface

| Endpoint | Purpose |
|---|---|
| `GET /pilot/expansion-summary` | Read expansion, onboarding, and RC gate status. |
| `GET /pilot-expansion-cohorts` | List controlled expansion cohorts. |
| `GET /tenant-onboarding-plans` | List tenant onboarding plans. |
| `GET /release-candidate-gates` | List release candidate gates. |
| `POST /pilot/expansion-cohorts` | Create expansion cohort. |
| `POST /pilot/expansion-cohorts/update` | Update/approve expansion cohort. |
| `POST /tenant-onboarding/plans` | Create tenant onboarding plan. |
| `POST /tenant-onboarding/plans/update` | Update/complete onboarding plan. |
| `POST /release-candidate/gates` | Record RC governance gate. |

## Expansion guardrails

- Stakeholder approval is required before expansion is meaningful.
- Expansion must happen through a named cohort.
- Cohort size must be bounded.
- Tenant onboarding must be explicit.
- Release-candidate approval must be recorded before wider pilot use.

## Exit criteria

Stage 18 can close when cohort creation/update, onboarding plan creation/completion, RC gate approval, expansion summary, JSON fallback, PostgreSQL migration, and full smoke validation pass.
