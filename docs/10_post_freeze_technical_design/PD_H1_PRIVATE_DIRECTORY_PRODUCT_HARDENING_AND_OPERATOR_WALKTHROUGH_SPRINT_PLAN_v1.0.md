---
id: PD-H1-PRIVATE-DIRECTORY-PRODUCT-HARDENING-AND-OPERATOR-WALKTHROUGH-SPRINT-PLAN
title: "PD-H1 Private Directory Product Hardening and Operator Walkthrough Sprint Plan"
version: "1.0"
status: "Planned - Awaiting Implementation Authorization"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# PD-H1 Private Directory Product Hardening and Operator Walkthrough Sprint Plan v1.0

## 1. Purpose

PD-H1 is a product-hardening sprint after ME-S7. It prepares the controlled private directory for realistic operator rehearsal before any wider marketplace or ecosystem work is considered.

The sprint is intentionally not a marketplace-widening sprint. It improves usability, evidence clarity, seed/demo readiness, and operator walkthrough quality for the private directory capability already accepted through ME-S7.

## 2. Governing context

ME-S7 accepted:

- controlled private directory operation;
- qualified private listings;
- Directory Review Board decisions;
- private enquiries;
- manual enquiry-to-collaboration requests;
- qualification renewal and expiry monitoring;
- private readiness intelligence;
- auditability and tenant confidentiality.

ME-S7 did not authorize public marketplace widening.

## 3. Sprint objective

Deliver a rehearsal-ready private directory operator experience where a human operator can understand, demonstrate, and verify the end-to-end private directory flow without needing developer knowledge.

The operator should be able to answer:

1. What is qualified and visible in the private directory?
2. Which listing needs review board attention?
3. Which enquiry needs manual follow-up?
4. Which qualification is expiring or needs renewal?
5. What evidence proves the action was controlled and auditable?
6. What remains explicitly not allowed?

## 4. Product scope

PD-H1 includes:

- Network page usability hardening for the private directory operator cockpit;
- clearer labels, helper text, empty states, and pending-action presentation;
- seeded private-directory demo/rehearsal data;
- an operator walkthrough script/runbook;
- browser or UI smoke coverage where practical;
- regression checks for blank-page and missing-renderer failures;
- evidence pack updates for private directory rehearsal;
- documentation of what a pilot operator should do and not do.

## 5. Explicit non-goals

PD-H1 does not implement:

- public marketplace;
- live matching;
- ranking;
- capacity allocation;
- VF-24 observatory publication;
- pricing intelligence;
- autonomous award;
- autonomous regulated approval;
- external email sending;
- live payment movement;
- production legal/regulatory certification.

## 6. Primary user story

As a Virtual Firm operator, I want a clear private directory workspace so that I can publish qualified listings, record review decisions, handle private enquiries, monitor renewals, and reconstruct audit evidence without accidentally triggering unauthorized marketplace behavior.

## 7. Operator workflow to support

1. Open the Virtual Firm workspace.
2. Select the Network page.
3. Review private directory readiness summary.
4. Confirm qualified listings and PASS qualification gates.
5. Record or inspect Directory Review Board decisions.
6. Record a private enquiry.
7. Progress a private enquiry to a manual collaboration request.
8. Record or inspect renewal/expiry reviews.
9. Confirm pending actions and audit readiness.
10. Export or point to evidence records where legally permissible.

## 8. Technical workstreams

### 8.1 UI hardening

- Improve Network page sections for operator comprehension.
- Separate action forms from evidence/readiness panels.
- Make pending actions more legible.
- Preserve disabled states and safe empty states.
- Ensure old capacity/observatory action forms remain absent from the active private-directory UI.

### 8.2 Demo/rehearsal data

- Add a deterministic private-directory seed/rehearsal fixture.
- Include at least:
  - one provider firm;
  - one requesting firm;
  - one verified credential;
  - one qualification-required capability;
  - one passed qualification gate;
  - one qualified private listing;
  - one pending review case;
  - one private enquiry;
  - one manual collaboration request;
  - one renewal/expiry risk;
  - audit events.

### 8.3 Operator walkthrough

- Create a runbook that explains the private directory journey step by step.
- Include expected screen observations, allowed actions, blocked actions, and evidence references.
- Use plain operator language, not internal architecture jargon only.

### 8.4 Verification and regression coverage

- Keep `npm run check:me:s5` as the UI renderer guard.
- Keep `npm run check:me:s6` and `npm run check:me:s6:postgres` as private readiness summary proof.
- Add or extend browser/UI smoke where practical to detect blank views and missing operator elements.
- Full `npm run check` must pass before sprint completion.

## 9. Data and governance requirements

Every added fixture or UI action must preserve:

- tenant scoping;
- firm scoping where applicable;
- attributable human actor identity;
- no silent approval;
- no AI-created professional authority;
- explicit status and state records;
- audit reconstruction;
- tenant confidentiality;
- data portability principles.

## 10. Acceptance criteria

PD-H1 can close only when:

1. Network page private-directory operator cockpit is usable without developer explanation.
2. Demo/rehearsal data can create a representative private directory scenario.
3. Operator walkthrough can be followed step by step.
4. Pending actions, renewal risks, private enquiries, and audit readiness are visible.
5. UI guardrails still block or hide unauthorized public marketplace behaviors.
6. Existing ME-S1 through ME-S7 checks remain green.
7. Full repository check passes.
8. Sprint completion document records evidence and remaining limitations.

## 11. Evidence commands planned

```bash
node --check apps/web/public/app.js
node --check scripts/<pd-h1-smoke-script>.mjs
npm run check:me:s5
npm run check:me:s6
npm run check:me:s6:postgres
npm run check:me:s7
npm run check:me
npm run check
```

The final smoke script name will be decided during implementation and added to `package.json`.

## 12. Deliverables

- hardened private directory Network page;
- deterministic private directory rehearsal fixture or smoke;
- operator walkthrough/runbook;
- updated technical design index;
- PD-H1 completion note;
- updated decision register;
- GitHub commit and push.

## 13. Risks and controls

| Risk | Control |
|---|---|
| UI hardening accidentally exposes old marketplace actions | Static and browser smoke must assert old capacity/observatory creation forms remain absent. |
| Demo data creates false public-marketplace impression | Fixture language must say controlled private directory only. |
| Operator mistakes private enquiry for automatic award | UI copy and runbook must distinguish enquiry, collaboration request, and award. |
| Renewal review looks like professional approval | UI and docs must state renewal governance does not approve regulated deliverables. |
| Evidence is too technical for pilot operator | Walkthrough must include plain-language expected observations. |

## 14. Implementation stop rule

If implementation reveals that a requested hardening item requires public marketplace, live matching, ranking, capacity allocation, VF-24 publication, pricing intelligence, autonomous award, or autonomous regulated approval, stop and ask for a new product-owner decision before coding that item.

## 15. Next step after this planning document

After this plan and checklist are accepted, implementation may proceed as:

`PD-H1 - Private Directory Product Hardening and Operator Walkthrough`