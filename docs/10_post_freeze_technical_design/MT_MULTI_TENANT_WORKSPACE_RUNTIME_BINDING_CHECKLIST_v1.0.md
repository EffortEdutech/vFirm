---
title: "MT Multi-Tenant Workspace Runtime Binding Checklist"
version: "1.0"
status: "draft-for-execution"
date: "2026-09-02"
scope: "Controlled local/private pilot hardening"
---

# MT Multi-Tenant Workspace Runtime Binding Checklist v1.0

## MT-H1 — Workspace Profile and Subscription Contract Lock

- [x] Define firm workspace profile fields.
- [x] Define firm type vocabulary.
- [x] Define subscription package to workspace behavior mapping.
- [x] Define service-line mapping.
- [x] Define module catalogue mapping.
- [x] Define worker-template mapping.
- [x] Define rehearsal/test workspace classification.
- [x] Define selected-firm active workspace summary response.
- [x] Add documentation evidence.
- [x] Add H1 smoke/static checks.

## MT-H2 — Backend Active Workspace Summary

- [x] Add active workspace summary resolver.
- [x] Add endpoint for selected tenant/firm summary.
- [x] Resolve active subscription package by selected firm.
- [x] Resolve service pack/service lines by selected firm.
- [x] Resolve module list by selected firm.
- [x] Resolve worker list by selected firm.
- [x] Remove Formwork-only dashboard health assumption.
- [x] Add cross-tenant negative checks.
- [x] Add backend smoke test.

## MT-H3 — Local Seed and Pilot Workspace Data Repair

- [x] Add/repair combined local pilot seed.
- [x] Preserve or create Formwork pilot firm.
- [x] Preserve or create NHL Global Solution.
- [x] Add NHL subscription package.
- [x] Add NHL service lines.
- [x] Add NHL module profile.
- [x] Add NHL worker bindings.
- [x] Add Formwork subscription/package profile.
- [x] Mark PD-H2 records as rehearsal/test where applicable.
- [x] Add seed verification smoke test.

## MT-H4 — Frontend Workspace Shell Binding

- [ ] Replace hard-coded Formwork page lede with active workspace copy.
- [ ] Update release/workspace banner from active workspace summary.
- [ ] Update dashboard subscription/service summary.
- [ ] Update My Firm page to show selected firm's workspace profile.
- [ ] Generalize Service Pack page.
- [ ] Update empty states to mention selected firm.
- [ ] Ensure selected firm is visible on every main module.
- [ ] Add frontend smoke test for Formwork copy.
- [ ] Add frontend smoke test for NHL copy.

## MT-H5 — Module and Worker Runtime Binding

- [ ] Drive modules from selected workspace profile.
- [ ] Show subscribed/not-subscribed module status.
- [ ] Bind worker cards to selected firm.
- [ ] Apply firm-specific worker defaults.
- [ ] Ensure action forms use selected tenant/firm/principal.
- [ ] Preserve human authority gates.
- [ ] Preserve no autonomous regulated approval.
- [ ] Add AI workforce smoke test for both firms.

## MT-H6 — End-to-End Multi-Firm Rehearsal and Evidence Pack

- [ ] Run Formwork workspace rehearsal.
- [ ] Run NHL workspace rehearsal.
- [ ] Switch active workspace between firms.
- [ ] Verify dashboard, My Firm, Service Subscription, AI Workforce, Front Desk, Sales/Accounts, Projects, Ops, Audit.
- [ ] Verify no cross-tenant leakage.
- [ ] Verify legal/commercial boundaries remain visible.
- [ ] Create completion evidence document.
- [ ] Update decision register.
- [ ] Run `npm run check`.
- [ ] Commit and push to GitHub.

## Final acceptance gate

- [ ] Formwork pilot firm is accessible.
- [ ] NHL Global Solution is accessible.
- [ ] Each firm shows correct business identity.
- [ ] Each firm shows what it subscribes to.
- [ ] Each firm shows correct service lines.
- [ ] Each firm shows correct AI workers.
- [ ] Each firm has scoped records.
- [ ] Each firm has scoped audit.
- [ ] No public marketplace widening occurred.
- [ ] No live payment movement occurred.
- [ ] No autonomous regulated approval occurred.
