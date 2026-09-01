---
id: PD-H1-PRIVATE-DIRECTORY-PRODUCT-HARDENING-AND-OPERATOR-WALKTHROUGH-CHECKLIST
title: "PD-H1 Private Directory Product Hardening and Operator Walkthrough Checklist"
version: "1.0"
status: "Planned - Awaiting Implementation Authorization"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# PD-H1 Private Directory Product Hardening and Operator Walkthrough Checklist v1.0

## 1. Scope lock

- [ ] Confirm PD-H1 is product hardening only.
- [ ] Confirm no public marketplace implementation.
- [ ] Confirm no live matching implementation.
- [ ] Confirm no ranking implementation.
- [ ] Confirm no capacity allocation implementation.
- [ ] Confirm no VF-24 observatory publication implementation.
- [ ] Confirm no pricing intelligence implementation.
- [ ] Confirm no autonomous award implementation.
- [ ] Confirm no autonomous regulated approval implementation.

## 2. Pre-implementation checks

- [ ] `git status --short` is clean before coding.
- [ ] Existing `npm run check:me:s5` passes.
- [ ] Existing `npm run check:me:s6` passes.
- [ ] Existing `npm run check:me:s7` passes.
- [ ] Current Network page behavior is inspected before modification.

## 3. UI hardening checklist

- [ ] Network page has a clear private directory operator heading.
- [ ] Action forms are visually separated from evidence/readiness panels.
- [ ] Qualified listing publication form explains PASS gate requirement.
- [ ] Review Board form explains that decisions do not grant professional authority.
- [ ] Private enquiry form explains that enquiry is not matching and not award.
- [ ] Collaboration request form explains manual request only.
- [ ] Renewal review form explains expiry/renewal monitoring only.
- [ ] Pending actions are shown in a human-readable section.
- [ ] Renewal risks are shown in a human-readable section.
- [ ] Audit readiness is visible.
- [ ] Empty states are helpful and not blank.
- [ ] Disabled states explain what prerequisite is missing.
- [ ] Old capacity-offer creation form is not exposed.
- [ ] Old observatory-publication form is not exposed.

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

- [ ] Runbook starts from launching/opening the workspace.
- [ ] Runbook tells operator what page to open.
- [ ] Runbook explains what the readiness summary means.
- [ ] Runbook explains how to inspect qualified listings.
- [ ] Runbook explains how to inspect pending Review Board action.
- [ ] Runbook explains how to inspect private enquiry follow-up.
- [ ] Runbook explains how to inspect renewal risk.
- [ ] Runbook explains how to inspect audit/evidence output.
- [ ] Runbook clearly lists forbidden actions.
- [ ] Runbook includes expected successful observations.
- [ ] Runbook includes likely troubleshooting notes for blank page/API unavailable cases.

## 6. Verification checklist

- [ ] `node --check apps/web/public/app.js` passes.
- [ ] New PD-H1 smoke script passes, if added.
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

- [ ] PD-H1 sprint plan exists.
- [ ] PD-H1 checklist exists.
- [ ] PD-H1 operator walkthrough/runbook exists after implementation.
- [ ] PD-H1 completion note exists after implementation.
- [ ] Technical design README links PD-H1 documents.
- [ ] Decision register records PD-H1 planning decision.
- [ ] Decision register records PD-H1 completion decision after implementation.

## 8. Completion checklist

- [ ] All acceptance criteria from the sprint plan are satisfied.
- [ ] Remaining limitations are listed.
- [ ] Evidence commands and results are recorded.
- [ ] Changes are committed.
- [ ] Changes are pushed to GitHub.
- [ ] Working tree is clean after push.

## 9. Product-owner checkpoint

Implementation should begin only after the product owner confirms this plan/checklist or authorizes amendments.