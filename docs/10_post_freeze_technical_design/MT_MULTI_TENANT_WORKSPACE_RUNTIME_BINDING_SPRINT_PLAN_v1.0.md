---
title: "MT Multi-Tenant Workspace Runtime Binding Sprint Plan"
version: "1.0"
status: "draft-for-execution"
date: "2026-09-02"
scope: "Controlled local/private pilot hardening"
---

# MT Multi-Tenant Workspace Runtime Binding Sprint Plan v1.0

## Purpose

This plan turns the current multi-firm record store into a true multi-tenant Virtual Firm workspace runtime.

The goal is not merely to select a firm from a dropdown. The selected firm must load the correct workspace identity, subscription package, service lines, modules, worker setup, records, dashboard copy, and operating boundaries.

The immediate reference firms are:

- the Formwork Engineering pilot firm;
- NHL Global Solution, owned by Nur Hernieliana, providing virtual services in project reporting, technical writing, clerical work, and BizKick EDCS;
- private-directory rehearsal firms, which must remain clearly marked as rehearsal/test records and must not hide pilot firms.

## Product boundary

This MT hardening plan is limited to controlled local/private pilot operation.

It does not authorize:

- public marketplace;
- live matching;
- ranking;
- capacity allocation;
- VF-24 observatory publication;
- pricing intelligence;
- autonomous award;
- autonomous regulated approval;
- live payment movement.

## Problem statement

The platform can currently create multiple tenants and firms, but the web workspace still behaves like the original Formwork MVP shell:

- page title and lede still say Formwork Engineering;
- backend dashboard health is hard-coded to `VF-SP-001`;
- all created firms default to `temporary_works_formwork` unless explicitly overridden;
- subscription packages exist, but they are not yet the runtime source of each firm's workspace behavior;
- local smoke/rehearsal data can replace pilot data, causing NHL Global Solution to disappear from the current store;
- the active workspace selector filters records but does not yet bind the selected firm to subscribed workspace capabilities.

## Target operating model

Each firm workspace must be resolved through:

`Tenant -> Firm -> Workspace Profile -> Subscription Package -> Service Lines -> Modules -> Worker Instances -> Permissions -> Records -> Audit`

The selected firm must answer:

1. Which tenant owns this firm?
2. What type of firm is this?
3. What has the firm subscribed to?
4. Which modules are active?
5. Which AI workers are provisioned and what are their authority boundaries?
6. Which services can be sold/delivered?
7. Which records belong to this firm?
8. Which actions are blocked or require human approval?
9. What should the UI say for this firm's business?
10. What can be exported for this firm?

## Sprint sequence

### MT-H1 — Workspace Profile and Subscription Contract Lock

Define the canonical data contract for a subscribed firm workspace.

Deliverables:

- firm workspace profile shape;
- subscription package binding rules;
- firm type vocabulary;
- module catalogue mapping;
- service-line mapping;
- worker-template mapping;
- selected-firm workspace summary contract;
- documentation and smoke-test plan.

Acceptance:

- Formwork and NHL workspace profiles are expressible without hard-coded UI assumptions.
- Subscription package data can describe business capabilities, not only payment readiness.
- Rehearsal firms can be flagged separately from pilot firms.

### MT-H2 — Backend Active Workspace Summary

Add backend support for active tenant/firm workspace summaries.

Deliverables:

- scoped summary endpoint, for example `/workspace/active-summary?tenant_id=...&firm_id=...`;
- dashboard summary service-pack/subscription resolution based on selected firm;
- firm profile fallback from metadata/subscription when no dedicated table exists yet;
- prevention of cross-tenant or cross-firm leakage;
- negative tests for wrong tenant/firm combinations.

Acceptance:

- Formwork selected returns Formwork workspace summary.
- NHL selected returns NHL organization-support workspace summary.
- PD-H2 rehearsal firms are identifiable as rehearsal/test workspaces.
- Backend no longer reports Formwork as the universal service pack.

### MT-H3 — Local Seed and Pilot Workspace Data Repair

Make the local development/pilot store reliably include the intended pilot firms.

Deliverables:

- seed command that creates or preserves Formwork pilot firm and NHL Global Solution together;
- NHL subscription package and service lines;
- Formwork subscription package and service lines;
- worker instances for each firm;
- local reset/seed guidance;
- rehearsal data classification.

Acceptance:

- after seeding, the UI selector shows both Formwork and NHL;
- NHL remains singular: `NHL Global Solution`;
- NHL shows owner/principal Nur Hernieliana;
- NHL services include project reporting, technical writing, clerical work, and BizKick EDCS;
- PD-H2 records do not become the only visible workspaces after test runs.

### MT-H4 — Frontend Workspace Shell Binding

Make the selected firm drive the visible workspace shell.

Deliverables:

- dynamic page title;
- dynamic lede;
- firm-specific active workspace card;
- subscription/service summary in the dashboard;
- My Firm module cards driven by selected workspace profile;
- Service Pack page generalized to Service Subscription / Practice Pack / Service Delivery Pack;
- empty states that mention the selected firm and subscribed services.

Acceptance:

- selecting Formwork shows Formwork language and technical delivery context;
- selecting NHL shows organization-support / documentation-control language;
- all main workspace pages visibly reflect selected firm context;
- no Formwork-only copy appears for NHL except where a historical record genuinely contains Formwork data.

### MT-H5 — Module and Worker Runtime Binding

Bind modules and AI workers to each firm's subscribed services.

Deliverables:

- subscribed module list per firm;
- worker card display filtered by selected firm;
- worker provisioning defaults per firm type;
- action forms use selected tenant/firm/principal;
- technical/regulatory authority warnings vary by firm type.

Acceptance:

- NHL does not present itself as a Formwork engineering firm.
- NHL has front desk, administration, accounts, marketing/sales, project reporting, technical writing/EDCS support.
- Formwork retains technical drawing/delivery support with human professional approval gates.
- AI worker authority boundaries remain explicit.

### MT-H6 — End-to-End Multi-Firm Rehearsal and Evidence Pack

Prove the multi-tenant workspace can operate two firm types in one local environment.

Deliverables:

- smoke test for Formwork workspace;
- smoke test for NHL workspace;
- smoke test for selector switching;
- negative cross-tenant visibility test;
- evidence document;
- decision register update.

Acceptance:

- full regression passes;
- both pilot firms can be accessed from `http://localhost:3090/`;
- selected firm controls records, copy, modules, workers, and subscription display;
- GitHub contains the completed evidence and tests.

## Recommended execution order

1. MT-H1 documentation and contract lock.
2. MT-H2 backend active workspace summary.
3. MT-H3 seed/data repair.
4. MT-H4 frontend shell binding.
5. MT-H5 module/worker binding.
6. MT-H6 rehearsal, evidence pack, and go/no-go.

## Completion definition

The MT hardening plan is complete when the operator can open the Virtual Firm Platform, select either the Formwork pilot firm or NHL Global Solution, and see a coherent workspace for that firm: correct business description, subscription, modules, workers, records, authority boundaries, and audit trail.

