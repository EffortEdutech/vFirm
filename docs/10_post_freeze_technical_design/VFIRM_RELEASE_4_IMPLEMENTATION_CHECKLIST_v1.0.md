---
id: VFIRM-RELEASE-4-IMPLEMENTATION-CHECKLIST
title: "Virtual Firm Release 4 Implementation Checklist"
version: "1.0"
status: "Technical Recommendation Ready"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Virtual Firm Release 4 Implementation Checklist v1.0

## 1. Purpose

This checklist tracks Release 4 controlled staging/private pilot execution separately from the Release 4 product target and sprint plan.

Release 4 turns the accepted Virtual Firm Factory into controlled staging/private pilot operations without opening public marketplace, trusted specialist network, VF-24 ecosystem intelligence, autonomous regulated approval, uncontrolled production launch, or live payment movement.

## 2. Entry setup gate

- [x] Release 3 evidence pack accepted by product owner.
- [x] Release 4 controlled staging/private pilot scope authorized by product owner.
- [x] Authentication provider decision recorded as provider-neutral adapter first, with physical provider selection required before external pilot activation.
- [x] Deployment environment decision recorded as controlled staging-first, with external staging deployment required before private pilot invitation.
- [x] Product owner named as interim pilot cohort owner.
- [x] Product owner named as interim support owner.
- [x] Product owner named as interim data protection owner.
- [x] Product owner named as interim incident owner.
- [x] Release 3 carry-over risks promoted into R4 gates.
- [x] Marketplace, trusted specialist network, VF-24 ecosystem intelligence, autonomous regulated approval, and live payment movement remain excluded.

## 3. R4-S1 - Staging Identity and Tenant Admin

- [x] Define external identity provider configuration contract.
- [x] Define provider-neutral authenticated principal model.
- [x] Bind authenticated principal to tenant membership.
- [x] Implement tenant invitation states.
- [x] Implement activation, suspension, revocation, and expiry states.
- [x] Implement tenant role assignment and role removal states.
- [x] Deny missing identity.
- [x] Deny invalid provider configuration.
- [x] Deny suspended identity.
- [x] Deny revoked identity.
- [x] Deny cross-tenant membership and role assignment.
- [x] Record identity, membership, invitation, suspension, revocation, and role audit events.
- [x] Add R4-S1 smoke test.
- [x] Add R4-S1 completion record.

## 4. R4-S2 - Staging Deployment and Data Protection

- [x] Select external staging deployment environment.
- [x] Define staging environment variables and secret handling.
- [x] Define allowed origins and callback URLs.
- [x] Rehearse staging deployment.
- [x] Rehearse backup.
- [x] Rehearse restore.
- [x] Rehearse legally permissible export from staging.
- [x] Verify tenant/data isolation in staging.
- [x] Record data protection review.
- [x] Add R4-S2 smoke test.
- [x] Add R4-S2 completion record.

## 5. R4-S3 - Pilot Support and Incident Controls

- [x] Define support case states.
- [x] Define support triage categories.
- [x] Define support authority boundaries.
- [x] Define incident states.
- [x] Define escalation and recovery runbook.
- [x] Define account/tenant suspension path for safety incidents.
- [x] Deny support action outside support authority.
- [x] Record support and incident audit events.
- [x] Add R4-S3 smoke test.
- [x] Add R4-S3 completion record.

## 6. R4-S4 - Observability and Audit Review

- [x] Define runtime trace summary model.
- [x] Define application log summary model.
- [x] Define worker action review model.
- [x] Define business audit review model.
- [x] Define policy decision review model.
- [x] Ensure private chain-of-thought is never exposed.
- [x] Ensure evidence summaries are reviewable.
- [x] Add R4-S4 smoke test.
- [x] Add R4-S4 completion record.

## 7. R4-S5 - Private Pilot Cohort

- [x] Define pilot cohort record.
- [x] Define pilot invitation gate.
- [x] Define pilot activation gate.
- [x] Define pilot offboarding gate.
- [x] Define pilot expansion gate.
- [x] Name or reaffirm pilot cohort owner.
- [x] Name or reaffirm support owner.
- [x] Name or reaffirm data protection owner.
- [x] Name or reaffirm incident owner.
- [x] Deny private pilot activation before R4-S1 through R4-S4 evidence is accepted.
- [x] Add R4-S5 smoke test.
- [x] Add R4-S5 completion record.

## 8. R4-S6 - Pilot Learning Loop and R4 Evidence

- [x] Define feedback intake model.
- [x] Define feedback classification.
- [x] Convert accepted feedback into governed backlog.
- [x] Reject feedback that violates Release 4 scope boundaries.
- [x] Assemble Release 4 evidence pack.
- [x] Record Release 4 go/no-go recommendation.
- [ ] Record Release 4 product-owner decision.
- [x] Add R4-S6 completion record.

## 9. Verification checklist

- [x] `npm run check:r4` passes for entry setup.
- [x] `npm run check:r4:s1` passes.
- [x] `npm run check:r4:s2` passes.
- [x] `npm run check:r4:s3` passes.
- [x] `npm run check:r4:s4` passes.
- [x] `npm run check:r4:s5` passes.
- [x] `npm run check:r4:s6` passes.
- [x] `npm run check:r4:staging` passes.
- [x] `npm run check:r4:postgres` passes.
- [x] `npm run check` passes after Release 4 implementation updates.
- [x] `npm run check:docs` passes after Release 4 documentation updates.
- [x] `git diff --check` passes after Release 4 documentation updates.

## 10. Release 5 handoff readiness

- [ ] Release 4 evidence pack accepted by product owner.
- [ ] Product owner approves Release 5 trusted specialist network scope.
- [ ] Private pilot risks are closed, accepted, or converted into Release 5 blockers.
