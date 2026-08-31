---
id: VFIRM-RELEASE-3-IMPLEMENTATION-CHECKLIST
title: "Virtual Firm Release 3 Implementation Checklist"
version: "1.0"
status: "Release 3 Accepted - Release 4 Authorized"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Virtual Firm Release 3 Implementation Checklist v1.0

## 1. Purpose

This checklist tracks Release 3 execution separately from the Release 3 product target and sprint plan.

Release 3 builds the Virtual Firm Factory for repeatable firm provisioning.

## 2. Release 3 entry gate

- [x] Release 2 completion decision recorded.
- [x] Release 2 handoff package accepted with explicit R3 blockers.
- [x] Release 2 carry-over blockers listed with affected R3 sprint.
- [x] Product owner approves Release 3 as Virtual Firm Factory scope.
- [x] No staging, public marketplace, or ecosystem intelligence scope added to Release 3 by default.

## 3. R3-S1 - Blueprint Contract Lock

- [x] Define `FirmBlueprint` schema.
- [x] Define `WorkforceBlueprint` schema.
- [x] Define `PracticePackManifest` schema.
- [x] Define `ServiceDeliveryPackManifest` schema.
- [x] Define `GovernancePackManifest` schema.
- [x] Define `JurisdictionPackManifest` schema.
- [x] Define validation error and warning model.
- [x] Add valid Formwork firm blueprint fixture.
- [x] Add second-firm blueprint fixture draft.
- [x] Add invalid missing-principal fixture.
- [x] Add invalid missing-responsible-professional fixture.
- [x] Add invalid jurisdiction fixture.
- [x] Add invalid unsafe-worker-authority fixture.
- [x] Add invalid approval-bypass pack fixture.
- [x] Add deterministic validation tests.
- [x] Add R3-S1 completion record.

## 4. R3-S2 - Provisioning Kernel

- [x] Add blueprint persistence.
- [x] Add provisioning run persistence.
- [x] Add `ProvisionedFirmInstance` record model.
- [x] Add validation command/API.
- [x] Add product-owner approval command/API.
- [x] Add provisioning run command/API.
- [x] Provision tenant-scoped firm identity.
- [x] Provision six starter modules.
- [x] Provision service catalogue.
- [x] Provision default client/project/document/task settings.
- [x] Provision worker bindings.
- [x] Provision worker audit identities.
- [x] Prove unapproved blueprint cannot provision.
- [x] Prove duplicate provisioning is safe.
- [x] Prove non-human/system actor cannot approve a blueprint.
- [x] Prove cross-tenant provisioning records are denied.
- [x] Prove provisioning records are included in legally permissible export.
- [x] Add R3-S2 completion record.

## 5. R3-S3 - Pack Binding and Certification Gates

- [x] Add pack compatibility check.
- [x] Bind Formwork Engineering Practice Pack #001.
- [x] Bind Service Delivery Pack to service catalogue.
- [x] Bind Governance Pack to approval and denial rules.
- [x] Bind Jurisdiction Pack to credential and service eligibility.
- [x] Bind delivery states to front desk, admin, sales, accounts, technical delivery, and daily operations modules.
- [x] Add factory readiness gate model.
- [x] Deny incompatible pack activation.
- [x] Deny service activation without responsible professional.
- [x] Deny service activation without valid responsible human professional authority.
- [x] Record pack compatibility checks.
- [x] Record pack binding certification decisions.
- [x] Record service activation records.
- [x] Add R3-S3 completion record.

## 6. R3-S4 - Second-Firm Rehearsal

- [x] Finalize second-firm blueprint fixture.
- [x] Provision second controlled local firm.
- [x] Certify second firm pack binding before operational rehearsal.
- [x] Run front desk enquiry capture.
- [x] Run intake handoff.
- [x] Run client, project, task, deadline, document, and correspondence records.
- [x] Run proposal preparation, approval, dispatch, and acceptance.
- [x] Run invoice issue and receivable monitoring.
- [x] Run technical drawing register, QA findings, evidence bundle, and professional approval block.
- [x] Run daily operations cockpit.
- [x] Run audit reconstruction.
- [x] Run legally permissible export.
- [x] Prove first firm regression still passes.
- [x] Prove cross-tenant export denial for the second firm.
- [x] Add R3-S4 completion record.

## 7. R3-S5 - Factory Hardening Gate

- [x] Deny missing Virtual Principal.
- [x] Deny missing responsible professional.
- [x] Deny invalid credential.
- [x] Deny invalid jurisdiction pack.
- [x] Deny unsafe worker authority.
- [x] Deny approval-bypass workflow.
- [x] Deny incompatible pack binding.
- [x] Deny unapproved blueprint provisioning.
- [x] Deny duplicate provisioning without version/new blueprint.
- [x] Deny cross-tenant blueprint, provisioning, worker-binding, audit, and export access.
- [x] Add denial evidence summaries.
- [x] Add R3-S5 completion record.

## 8. R3-S6 - Evidence Pack and Go/No-Go

- [x] Create Release 3 evidence pack from template.
- [x] Attach schema validation, provisioning, pack compatibility, second-firm rehearsal, negative-test, audit, export, and command evidence.
- [x] Update technical design index.
- [x] Update decision register.
- [x] Classify remaining backlog.
- [x] Record Release 3 go/no-go recommendation.

## 9. Verification checklist

- [x] `npm run check:r3:s1` passes.
- [x] `npm run check:r3:s2` passes.
- [x] `npm run check:r3:s3` passes.
- [x] `npm run check:r3:s4` passes.
- [x] `npm run check:r3:s5` passes.
- [x] `npm run check:r3` passes for current R3-S1 through R3-S5 scope.
- [x] `npm run check:r3:postgres` passes.
- [x] `node --check apps/api/src/server.mjs` passes.
- [x] `node --check apps/api/src/store.mjs` passes.
- [x] `node --check packages/core-domain/src/factory-blueprints.mjs` passes.
- [x] `node --check packages/core-domain/src/pack-certification.mjs` passes.
- [x] `node --check packages/core-domain/src/api-contracts.mjs` passes.
- [x] `node --check scripts/smoke-r3-blueprint-contract-lock.mjs` passes.
- [x] `node --check scripts/smoke-r3-provisioning-kernel.mjs` passes.
- [x] `node --check scripts/smoke-r3-pack-binding-certification.mjs` passes.
- [x] `node --check scripts/smoke-r3-second-firm-rehearsal.mjs` passes.
- [x] `node --check scripts/smoke-r3-factory-hardening-gate.mjs` passes.
- [x] `npm run check` passes after R3-S6 documentation update.
- [x] `npm run check:docs` passes after R3-S6 documentation update.
- [x] `git diff --check` passes after R3-S6 documentation update.

## 10. Release 4 handoff readiness

- [x] Release 3 evidence pack accepted by product owner.
- [x] Product owner approves Release 4 staging/private pilot scope.
- [x] Auth provider, deployment environment, pilot cohort owner, support owner, data protection owner, and incident owner are named or explicitly bounded for R4-S1 entry setup.