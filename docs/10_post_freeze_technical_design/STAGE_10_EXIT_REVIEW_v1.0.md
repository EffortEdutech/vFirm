---
id: VF-STAGE-10-PILOT-DEPLOYMENT-FORMWORK-PACKAGING-EXIT-REVIEW
title: "Stage 10 - Pilot Deployment and Formwork Service Pilot Packaging Exit Review"
version: "1.0"
status: "Exit Review"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Stage 10 - Pilot Deployment and Formwork Service Pilot Packaging Exit Review v1.0

## Outcome

Stage 10 packages the Formwork Engineering MVP into a controlled private pilot package.

The platform now exposes pilot package metadata, shows pilot scope and onboarding criteria in the web workspace, and includes a smoke script that proves the full Formwork pilot journey through the real command APIs.

## Implemented artifacts

| Area | Artifact |
|---|---|
| API | `GET /pilot/formwork` |
| Web | `Pilot` workspace tab |
| Script | `scripts/smoke-stage10-formwork-pilot.mjs` |
| Package scripts | `check:stage10`, `pilot:formwork:smoke` |
| Docs | Stage 10 plan, Formwork pilot operating handbook, exit review |

## Pilot journey covered by smoke test

- tenant and firm creation;
- principal authority seeding;
- client and relationship creation;
- Formwork intake;
- proposal creation and approval;
- project opening;
- task start/complete;
- evidence bundle creation;
- deliverable draft/review/issue;
- invoice issue and payment status;
- AI worker provision/activation;
- private network listing and capacity offer;
- observatory snapshot.

## Validation evidence

Required commands:

```text
npm run check
npm run check:stage10
npm run check:db:postgres
```

## Remaining before real external pilot

- choose hosting provider;
- configure external authentication;
- configure managed PostgreSQL and backups;
- add real user onboarding process;
- decide professional seal/signature handling;
- define pilot client consent and data handling terms.

## Stage 11 recommendation

The next stage should be `Stage 11 - External Auth, Pilot User Management, and Staging Deployment`, because a real external pilot should not rely on dev-header authentication.
