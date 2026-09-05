# AWIA Payroll and Seat Billing Polish Completion v1.0

Status: completed
Authorization: AUTHORIZE_AWIA_PAYROLL_AND_SEAT_BILLING_POLISH
Date: 2026-09-05
Classification: explicit user-approved scope expansion (optional bundle 3 of 5 from AWIA_CONTROLLED_LOCAL_PILOT_ACCEPTANCE_LOCK_v1.0.md)

## Purpose

Give each AWIA virtual staff seat a deterministic billing status lifecycle and a default salary plan by grade, per section 7 of `VFIRM_AWIA_VIRTUAL_STAFF_MODEL_AND_IMPLEMENTATION_PLAN_v1.0.md`, without moving or releasing any live payment.

## Scope Completed

- New core-domain module `packages/core-domain/src/awia-virtual-staff-payroll.mjs`:
  - `defaultSalaryPlansByGrade`: suggested default monthly price, currency (MYR), included workload hours, and tool budget units for each of the six staff grades (Assistant, Worker, Specialist, Manager, Executive, Service).
  - `seatBillingStatuses` and a deterministic allowed-transition map (`DRAFT -> PENDING_ACTIVATION -> BILLING_ACTIVE -> {PAUSED, SUSPENDED_NONPAYMENT} -> ... -> RETIRED`); illegal transitions (e.g. `DRAFT` straight to `BILLING_ACTIVE`) are denied.
  - `buildAwiaFirmPayrollSummary(...)`: aggregates a firm's seats by billing status and computes monthly totals per currency, counting only seats in `BILLING_ACTIVE` status and resolving each seat's grade to its default plan.
- New controlled command `POST /awia/virtual-staff/seat-billing-status` in `apps/api/src/store.mjs` / `apps/api/src/server.mjs`, which records a billing-status transition on the seat, appends an immutable ledger event to the new `awia_staff_seat_billing_events` collection, and is audit/event recorded. Every event and seat record explicitly carries the boundary marker `billing_bookkeeping_only_no_live_payment_release`.
- New read-only endpoint `GET /awia/virtual-staff/payroll-summary?tenant_id=...&firm_id=...` computing the firm's current seat billing mix and monthly totals on read.
- New GET collection route `GET /awia-staff-seat-billing-events` for the ledger.
- Smoke coverage: `scripts/smoke-awia-payroll-and-seat-billing-polish.mjs`, covering: 8 provisioned seats starting `DRAFT`; a rejected illegal transition straight to `BILLING_ACTIVE`; a legal `DRAFT -> PENDING_ACTIVATION -> BILLING_ACTIVE` path; a correct MYR 1,200/month total for one Executive-grade (CFO) seat; ledger and audit-trail persistence.

## Why This Does Not Reopen the Live-Payment Boundary

`seat-billing-status` only records what a human operator says is true about a seat's billing state (e.g. "invoice settled manually outside the platform," carried in the optional `note` field of the smoke test). No payment provider is called, no funds move, and no autonomous transition is possible — every transition requires an explicit human-issued command and is restricted to the deterministic allowed-transition table. This is bookkeeping metadata layered on top of the existing seat record, matching the pattern already used for `subscription_packages` / `billing_readiness_reviews` in Stage 19/20, but scoped to AWIA seats specifically instead of the platform-wide commercial launch controls.

## Boundary Still Locked

This bundle does not authorize:
- live payment release or any payment-provider integration;
- salary/billing status implying professional or execution authority (a `BILLING_ACTIVE` seat is not thereby authorized for any additional runtime action; the existing authority gate is unchanged and unconsulted by this module);
- autonomous seat billing transitions (every transition requires an explicit actor-attributed command).

## Verification

Passed:
- `node --check packages/core-domain/src/awia-virtual-staff-payroll.mjs`
- `node --check apps/api/src/store.mjs`
- `node --check apps/api/src/server.mjs`
- `npm run check:awia:payroll-billing`
- `npm run check:awia:staff-memory` (no regression)
- `npm run check:awia:department-dashboards` (no regression)
- `npm run check:awia:next-bundle` (no regression)
- `npm run check:awia:acceptance-lock` (no regression)

## Handoff

Recommended next action: proceed to bundle 4, `AUTHORIZE_AWIA_MULTI_FIRM_STAFF_TEMPLATE_SCALING`.
