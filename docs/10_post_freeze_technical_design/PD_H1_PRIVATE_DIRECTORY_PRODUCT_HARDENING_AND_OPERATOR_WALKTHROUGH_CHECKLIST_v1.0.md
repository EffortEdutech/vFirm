---
id: PD-H1-PRIVATE-DIRECTORY-PRODUCT-HARDENING-AND-OPERATOR-WALKTHROUGH-CHECKLIST
title: "PD-H1 Private Directory Product Hardening and Operator Walkthrough Checklist"
version: "1.0"
status: "Planned - Awaiting Implementation Authorization"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# PD-H1 Private Directory Product Hardening and Operator Walkthrough Checklist v1.0

## 1. Scope lock

- [x] Confirm PD-H1 is product hardening only.
- [x] Confirm no public marketplace implementation.
- [x] Confirm no live matching implementation.
- [x] Confirm no ranking implementation.
- [x] Confirm no capacity allocation implementation.
- [x] Confirm no VF-24 observatory publication implementation.
- [x] Confirm no pricing intelligence implementation.
- [x] Confirm no autonomous award implementation.
- [x] Confirm no autonomous regulated approval implementation.

## 2. Pre-implementation checks

- [x] `git status --short` is clean before coding.
- [x] Existing `npm run check:me:s5` passes.
- [x] Existing `npm run check:me:s6` passes.
- [x] Existing `npm run check:me:s7` passes.
- [x] Current Network page behavior is inspected before modification.

## 3. UI hardening checklist

- [x] Network page has a clear private directory operator heading.
- [x] Action forms are visually separated from evidence/readiness panels.
- [x] Qualified listing publication form explains PASS gate requirement.
- [x] Review Board form explains that decisions do not grant professional authority.
- [x] Private enquiry form explains that enquiry is not matching and not award.
- [x] Collaboration request form explains manual request only.
- [x] Renewal review form explains expiry/renewal monitoring only.
- [x] Pending actions are shown in a human-readable section.
- [x] Renewal risks are shown in a human-readable section.
- [x] Audit readiness is visible.
- [x] Empty states are helpful and not blank.
- [x] Disabled states explain what prerequisite is missing.
- [x] Old capacity-offer creation form is not exposed.
- [x] Old observatory-publication form is not exposed.

## 4. Demo/rehearsal fixture checklist

- [ ] Fixture creates one tenant.
- [ ] Fixture creates one requesting firm.
- [ ] Fixture creates one provider firm.
- [ ] Fixture creates human principal actors.
- [ ] Fixture creates a professional profile.
- [ ] Fixture creates a firm profile.
- [ ] Fixture creates verified credential evidence.
- [ ] Fixture creates qualification-required capability.
- [ ] Fixture creates cleared conflict check.
- [ ] Fixture creates PASS qualification gate.
- [ ] Fixture creates qualified private directory listing.
- [ ] Fixture creates one listing pending Review Board action.
- [ ] Fixture creates one Review Board decision.
- [ ] Fixture creates one private enquiry.
- [ ] Fixture creates one manual collaboration request.
- [ ] Fixture creates one renewal/expiry risk.
- [ ] Fixture records auditable events.
- [ ] Fixture language says controlled private directory only.

## 5. Operator walkthrough checklist

- [x] Runbook starts from launching/opening the workspace.
- [x] Runbook tells operator what page to open.
- [x] Runbook explains what the readiness summary means.
- [x] Runbook explains how to inspect qualified listings.
- [x] Runbook explains how to inspect pending Review Board action.
- [x] Runbook explains how to inspect private enquiry follow-up.
- [x] Runbook explains how to inspect renewal risk.
- [x] Runbook explains how to inspect audit/evidence output.
- [x] Runbook clearly lists forbidden actions.
- [x] Runbook includes expected successful observations.
- [x] Runbook includes likely troubleshooting notes for blank page/API unavailable cases.

## 6. Verification checklist

- [ ] `node --check apps/web/public/app.js` passes.
- [x] New PD-H1 smoke script passes, if added.
- [ ] `npm run check:me:s5` passes.
- [ ] `npm run check:me:s6` passes.
- [ ] `npm run check:me:s6:postgres` passes.
- [ ] `npm run check:me:s7` passes.
- [ ] `npm run check:me` passes.
- [ ] `npm run check:docs` passes.
- [ ] `npm run check:artifacts` passes.
- [ ] `npm run check` passes.
- [ ] `git diff --check` passes.

## 7. Documentation checklist

- [x] PD-H1 sprint plan exists.
- [x] PD-H1 checklist exists.
- [x] PD-H1 operator walkthrough/runbook exists after implementation.
- [x] PD-H1 completion note exists after implementation.
- [x] Technical design README links PD-H1 documents.
- [x] Decision register records PD-H1 planning decision.
- [x] Decision register records PD-H1 completion decision after implementation.

## 8. Completion checklist

- [ ] All acceptance criteria from the sprint plan are satisfied.
- [ ] Remaining limitations are listed.
- [ ] Evidence commands and results are recorded.
- [ ] Changes are committed.
- [ ] Changes are pushed to GitHub.
- [ ] Working tree is clean after push.

## 9. Product-owner checkpoint

Implementation should begin only after the product owner confirms this plan/checklist or authorizes amendments.