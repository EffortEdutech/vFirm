---
title: "MT-H1 Workspace Profile and Subscription Contract Lock Completion"
version: "1.0"
status: "complete"
date: "2026-09-02"
scope: "Multi-tenant firm workspace runtime binding"
---

# MT-H1 Workspace Profile and Subscription Contract Lock Completion v1.0

## Sprint result

MT-H1 is complete.

The sprint locked the contract for resolving a selected firm into its actual workspace profile, subscription package, service lines, modules, worker bindings, authority boundaries, and audit requirements.

## Completed deliverables

- Firm workspace profile fields defined.
- Firm type vocabulary defined.
- Subscription package to workspace behavior mapping defined.
- Service-line contract defined.
- Module contract defined.
- Worker binding contract defined.
- Rehearsal/test workspace classification defined.
- Formwork reference workspace profile defined.
- NHL Global Solution reference workspace profile defined.
- MT-H2 backend implementation guidance defined.
- MT-H1 static smoke gate added.

## Key product decision

The active firm selector is not the product boundary by itself.

The selected firm must drive:

- workspace title;
- workspace description;
- subscription package;
- subscribed features;
- service lines;
- module availability;
- AI worker defaults;
- authority boundaries;
- record scope;
- audit context.

## Reference profiles locked

### Formwork pilot firm

The Formwork pilot firm is a `FORMWORK_ENGINEERING` workspace. It keeps technical drawing and delivery support, QA evidence, professional approval gates, proposals, invoices, operations, and audit.

### NHL Global Solution

NHL Global Solution is an `ORGANIZATION_SUPPORT` workspace owned by Nur Hernieliana. Its subscribed services are:

- project reporting;
- technical writing;
- clerical work;
- BizKick EDCS documentation/control support.

NHL must not be rendered as a Formwork Engineering firm.

### PD-H2 firms

PD-H2 private-directory firms are rehearsal/test workspaces. They must not replace pilot firms or become the only visible default after smoke tests.

## Boundary confirmation

MT-H1 does not authorize:

- public marketplace;
- live matching;
- ranking;
- capacity allocation;
- VF-24 observatory publication;
- pricing intelligence;
- autonomous award;
- autonomous regulated approval;
- live payment movement.

## Evidence

- `docs/10_post_freeze_technical_design/MT_H1_WORKSPACE_PROFILE_AND_SUBSCRIPTION_CONTRACT_LOCK_v1.0.md`
- `scripts/smoke-mt-h1-workspace-profile-contract.mjs`
- `npm run check:mt:h1`

## Next sprint

Proceed next to `MT-H2 - Backend Active Workspace Summary`.

