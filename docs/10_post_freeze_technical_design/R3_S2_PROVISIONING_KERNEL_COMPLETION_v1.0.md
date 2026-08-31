---
id: VFIRM-R3-S2-PROVISIONING-KERNEL-COMPLETION
title: "R3-S2 Provisioning Kernel Completion"
version: "1.0"
status: "COMPLETED"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
release: "Release 3"
sprint: "R3-S2 — Provisioning Kernel"
completed_on: "2026-08-29"
---

# R3-S2 Provisioning Kernel Completion v1.0

## 1. Completion decision

R3-S2 is completed for controlled local Virtual Firm Factory development.

The sprint creates the first executable provisioning kernel that turns an approved Firm Blueprint bundle into a tenant-scoped provisioned firm instance with worker bindings, readiness checks, audit events, and exportable business records.

This is not a staging, marketplace, autonomous professional, or public deployment approval.

## 2. Scope completed

R3-S2 adds the following bounded Factory capabilities:

- Firm Blueprint draft creation and deterministic validation.
- Human principal approval for provisioning.
- Denial of non-human/system approval.
- Denial of provisioning before approval.
- Duplicate provisioning protection for an active or completed provisioning run.
- Tenant-scoped firm identity provisioning through the existing firm/principal path.
- Provisioned Firm Instance record creation.
- Six starter module configuration capture from the Firm Blueprint.
- Service catalogue configuration capture from the Firm Blueprint.
- Worker binding creation from the Workforce Blueprint.
- Worker authority envelope, memory boundary, budget boundary, supervisor, and escalation route preservation.
- Factory readiness check before handoff.
- Human handoff acceptance for controlled local pilot use.
- Export-package inclusion for factory business records.
- Event and audit attribution for material provisioning actions.

## 3. API surface added

The following controlled endpoints were added:

- `POST /factory/blueprints/firms`
- `POST /factory/blueprints/firms/validate`
- `POST /factory/blueprints/firms/approve`
- `POST /factory/provisioning-runs`
- `POST /factory/provisioning-runs/readiness-test`
- `POST /factory/provisioning-runs/accept-handoff`

The following read/export collections were added:

- `factory-firm-blueprints`
- `factory-provisioning-runs`
- `provisioned-firm-instances`
- `factory-worker-bindings`

## 4. Data model artifacts

Runtime store collections added:

- `factory_firm_blueprints`
- `factory_provisioning_runs`
- `provisioned_firm_instances`
- `factory_worker_bindings`

Database migration added:

- `infra/database/migrations/0021_r3_s2_virtual_firm_factory_provisioning.sql`

The current runtime persists Factory records through the shared store path for both JSON and Postgres-backed execution. The migration reserves the relational table shape for the next hardening step, without making R3-S2 dependent on a partial relational write path.

## 5. Governance and authority controls proven

R3-S2 preserves the frozen architecture principles:

- Client-facing business records belong to the Virtual Firm, not to an AI worker.
- A Firm Blueprint cannot be approved by a system actor.
- Provisioning requires explicit human principal approval.
- Worker bindings carry authority envelopes and remain bounded by supervisor, escalation, memory, and budget controls.
- Readiness and handoff are explicit state transitions.
- Factory records are tenant-scoped and cross-tenant reads are denied.
- Factory events and audit records are reconstructable through the existing event/audit surfaces.

## 6. Verification evidence

Commands executed successfully:

- `node --check apps/api/src/server.mjs`
- `node --check apps/api/src/store.mjs`
- `node --check packages/core-domain/src/api-contracts.mjs`
- `node --check scripts/smoke-r3-provisioning-kernel.mjs`
- `npm run check:r3`
- `npm run check:r3:postgres`

Observed smoke results:

- `R3-S1 Blueprint Contract Lock smoke passed.`
- `R3-S2 Provisioning Kernel smoke passed (json).`
- `R3-S2 Provisioning Kernel smoke passed (postgres).`

## 7. Negative tests covered

The R3-S2 smoke verifies:

- invalid Firm Blueprint validation fails;
- invalid blueprint approval is denied;
- system/non-human approval is denied;
- duplicate provisioning is denied;
- readiness is required before handoff acceptance;
- cross-tenant access is denied;
- export includes legally permissible Factory records.

## 8. Carry-over to R3-S3

R3-S2 does not close pack certification. The next sprint, R3-S3 — Pack Binding and Certification Gates, must add deterministic compatibility gates for:

- Practice Pack binding;
- Service Delivery Pack binding;
- Governance Pack binding;
- Jurisdiction Pack binding;
- responsible professional eligibility;
- service activation denial when pack compatibility or professional authority is missing.

## 9. Decision

R3-S2 may hand off to R3-S3.

R3-S3 must not weaken the R3-S2 provisioning rules. Pack binding should extend the Factory readiness gate rather than bypass it.