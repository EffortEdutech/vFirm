# AWIA Department Dashboards Completion v1.0

Status: completed
Authorization: AUTHORIZE_AWIA_DEPARTMENT_DASHBOARDS
Date: 2026-09-05
Classification: explicit user-approved scope expansion (optional bundle 2 of 5 from AWIA_CONTROLLED_LOCAL_PILOT_ACCEPTANCE_LOCK_v1.0.md)

## Purpose

Give a human supervisor a single read-only view of AWIA virtual staff workload and exception status grouped by department (role code: CFO, FAO, SAO, OPO, ARO, CMO, CTO, CIO, CHRO), without introducing ranking, capacity allocation, or any new authority.

## Scope Completed

- New core-domain module `packages/core-domain/src/awia-virtual-staff-department-dashboard.mjs` exporting a pure function `buildAwiaStaffDepartmentDashboard(...)` that aggregates, per department:
  - staff totals and active-staff counts, broken down by lifecycle status;
  - open workdesk items vs. items with a client delivery draft prepared;
  - output drafts pending human review vs. reviewed, and client delivery drafts prepared;
  - task-readiness allow/deny counts;
  - last-activity timestamp.
- New read-only endpoint `GET /awia/virtual-staff/department-dashboard?tenant_id=...&firm_id=...` in `apps/api/src/server.mjs`, following the same read-model pattern as the existing `/dashboard/summary` and `/quotation-operations-summary` endpoints. It computes on read from the persisted AWIA collections; it does not persist a new snapshot record.
- Tenant/firm scoping is enforced on every underlying collection filter, so a dashboard request cannot see another tenant's or firm's staff data.
- Smoke coverage: `scripts/smoke-awia-department-dashboards.mjs`, covering an empty-activity baseline (8 provisioned, 0 active), a populated CFO department bucket (1 active staff, 1 pending-review output draft, 1 denied high-risk readiness check), dashboard-wide deny-count rollup, and a cross-tenant isolation check confirming a second tenant/firm sees zero staff.

## Why This Does Not Reopen Locked Boundaries

The dashboard performs no ranking or comparative scoring between staff or departments, allocates no capacity, and takes no action — it only counts existing persisted records that were already created through the existing gated commands (provisioning, lifecycle, task-readiness, output draft/review). It is explicitly excluded from the boundaries the platform locks out for the marketplace/network layer (VF-14/VF-23/VF-24): this is internal AFCC supervision reporting for one firm's own staff, not cross-firm benchmarking or a public observatory.

## Boundary Still Locked

This bundle does not authorize:
- ranking or comparative scoring of staff/departments;
- capacity allocation or workload rebalancing;
- cross-tenant or cross-firm visibility (explicitly tested and rejected);
- autonomous regulated approval, live payment release, public marketplace operation, or production launch.

## Verification

Passed:
- `node --check packages/core-domain/src/awia-virtual-staff-department-dashboard.mjs`
- `node --check apps/api/src/server.mjs`
- `npm run check:awia:department-dashboards`
- `npm run check:awia:staff-memory` (no regression)
- `npm run check:awia:next-bundle` (no regression)
- `npm run check:awia:acceptance-lock` (no regression)

## Handoff

Recommended next action: proceed to bundle 3, `AUTHORIZE_AWIA_PAYROLL_AND_SEAT_BILLING_POLISH`.
