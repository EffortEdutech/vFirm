---
id: VFIRM-R3-S5-FACTORY-HARDENING-GATE-COMPLETION
title: "R3-S5 Factory Hardening Gate Completion"
version: "1.0"
status: "COMPLETED"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
release: "Release 3"
sprint: "R3-S5 — Factory Hardening Gate"
completed_on: "2026-08-29"
---

# R3-S5 Factory Hardening Gate Completion v1.0

## 1. Completion decision

R3-S5 is completed for controlled local Virtual Firm Factory development.

The sprint concentrates Release 3 negative cases into one executable hardening gate. The Factory refuses unsafe blueprints, unsafe pack activation, unauthorized approval, duplicate provisioning, and cross-tenant access, while preserving denial evidence through records, events, audit, and export.

This is not a staging deployment, public marketplace, Release 4 approval, or autonomous professional work approval.

## 2. Scope completed

R3-S5 adds the executable hardening gate:

- `scripts/smoke-r3-factory-hardening-gate.mjs`

Package scripts added/updated:

- `npm run check:r3:s5`
- `npm run check:r3`
- `npm run check:r3:postgres`
- `npm run check`

## 3. Negative cases proven

The hardening gate proves denial for:

- missing Virtual Principal;
- missing responsible professional;
- invalid/inactive service jurisdiction;
- unsafe AI worker authority;
- approval-bypass issue/final workflow;
- unapproved blueprint provisioning;
- system/non-human blueprint approval;
- duplicate provisioning without new version/new blueprint;
- service activation without valid responsible human professional authority;
- incompatible Practice Pack / Service Delivery Pack binding;
- missing credential rule for regulated service jurisdiction;
- cross-tenant blueprint reads;
- cross-tenant provisioning reads;
- cross-tenant worker-binding reads;
- cross-tenant audit reads;
- cross-tenant legally permissible export access.

## 4. Evidence surfaces proven

The hardening gate verifies that denial and certification evidence is visible through:

- Firm Blueprint validation findings;
- pack compatibility check findings;
- pack binding certification denial reasons;
- service activation blocked/enabled records;
- event log entries;
- audit event entries;
- legally permissible export package counts.

## 5. Architecture principles preserved

R3-S5 confirms these non-negotiable controls remain enforceable:

- AI capability does not create professional authority.
- No orphan regulated work.
- No silent approval.
- No direct LLM to regulated final output.
- Deterministic workflow state and deterministic hardening checks.
- Tenant isolation across Factory records, worker bindings, audit, and export.
- Human professional authority remains explicit and attributable.

## 6. Verification evidence

Commands executed successfully:

- `node --check scripts/smoke-r3-factory-hardening-gate.mjs`
- `npm run check:artifacts`
- `npm run check:r3:s5`
- `npm run check:r3:postgres`

Observed smoke results:

- `R3-S5 Factory Hardening Gate smoke passed (json).`
- `R3-S5 Factory Hardening Gate smoke passed (postgres).`

## 7. Carry-over to R3-S6

R3-S5 does not close Release 3. R3-S6 must assemble the Release 3 evidence pack and go/no-go recommendation using evidence from:

- R3-S1 Blueprint Contract Lock;
- R3-S2 Provisioning Kernel;
- R3-S3 Pack Binding and Certification Gates;
- R3-S4 Second-Firm Rehearsal;
- R3-S5 Factory Hardening Gate.

## 8. Decision

R3-S5 may hand off to R3-S6.

R3-S6 must not introduce new feature scope. It should package evidence, classify remaining risk, update the decision register, and record the Release 3 go/no-go recommendation.