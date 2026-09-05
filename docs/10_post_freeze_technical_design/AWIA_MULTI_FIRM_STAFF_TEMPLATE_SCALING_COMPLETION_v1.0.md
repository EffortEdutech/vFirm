# AWIA Multi-Firm Staff Template Scaling Completion v1.0

Status: completed
Authorization: AUTHORIZE_AWIA_MULTI_FIRM_STAFF_TEMPLATE_SCALING
Date: 2026-09-05
Classification: explicit user-approved scope expansion (optional bundle 4 of 5 from AWIA_CONTROLLED_LOCAL_PILOT_ACCEPTANCE_LOCK_v1.0.md)

## Purpose

Let more than one firm provision its own independent AWIA virtual staff roster from a named, reusable template, instead of every firm being hard-pinned to the single original 8-role pilot roster (`firstPilotStaffSet`).

## Scope Completed

- New core-domain module `packages/core-domain/src/awia-virtual-staff-templates.mjs` defining a small named template catalogue:
  - `formwork_engineering_standard_v1` — the original 8-role pilot roster, unchanged, wrapping the existing `firstPilotStaffSet` so the original pilot firms (Amanah Formwork, NHL Global Solution) are unaffected.
  - `lean_advisory_practice_v1` — a 3-role roster (CFO Executive, OPO Manager, ARO Worker) for a small advisory firm.
  - `finance_back_office_v1` — a 4-role finance-operations roster (CFO Executive plus 3 FAO grades).
  - `resolveAwiaStaffTemplate(template_id)` and `listAwiaStaffTemplates()` for lookup and catalogue listing.
- New controlled command `POST /awia/virtual-staff/provision-from-template` in `apps/api/src/store.mjs` / `apps/api/src/server.mjs`, reusing the existing, unmodified `provisionPilotVirtualStaff(...)` core-domain function (it already accepted a `pilotStaff` parameter) with the resolved template's staff set. Every provisioned seat, provisioning run, and evidence pack now also records which `template_id` produced it.
- A duplicate-provisioning guard: a firm that has already been provisioned (by either the original `/awia/virtual-staff/provision-pilot` command or the new template command) is rejected from provisioning again, so re-running this command cannot silently overwrite an existing staff roster.
- New read-only endpoint `GET /awia/virtual-staff/templates` listing the catalogue.
- Smoke coverage: `scripts/smoke-awia-multi-firm-staff-template-scaling.mjs`, covering: the 3-template catalogue; Firm A provisioning 3 staff from `lean_advisory_practice_v1`; Firm B independently provisioning 4 staff from `finance_back_office_v1`; a rejected unknown `template_id`; a rejected duplicate provisioning attempt on an already-provisioned firm; and cross-firm member/seat isolation (Firm A and Firm B never see each other's records, and seats carry their originating `template_id`).

## Why This Does Not Reopen Locked Boundaries

Every provisioning run remains tenant/firm scoped exactly as before — templates only change which staff codes/grades get provisioned, not the tenant isolation model, the authority gate, or the runtime execution boundary (`runtime_execution_enabled` remains `false` regardless of template). No template can grant authority: role, grade, and package binding are still only eligibility inputs, consistent with the existing runtime authority gate, which this bundle does not touch. This is explicitly "more firms, same controlled model" rather than any widening toward a public marketplace or cross-firm data sharing.

## Boundary Still Locked

This bundle does not authorize:
- cross-firm or cross-tenant staff/data visibility (tested and rejected);
- autonomous runtime execution for any template-provisioned staff member;
- production onboarding beyond the existing controlled local/private pilot boundary;
- authoring new package registry entries or changing registry status (templates only select from the existing, already-reviewed registry).

## Verification

Passed:
- `node --check packages/core-domain/src/awia-virtual-staff-templates.mjs`
- `node --check apps/api/src/store.mjs`
- `node --check apps/api/src/server.mjs`
- `npm run check:awia:template-scaling`
- `npm run check:awia:staff-memory` (no regression)
- `npm run check:awia:department-dashboards` (no regression)
- `npm run check:awia:payroll-billing` (no regression)
- `npm run check:awia:next-bundle` (no regression)
- `npm run check:awia:acceptance-lock` (no regression)

## Handoff

Recommended next action: proceed to bundle 5, `AUTHORIZE_AWIA_STAGING_PREPARATION`.
