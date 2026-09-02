---
title: "MT-H3 Local Seed and Pilot Workspace Data Repair Completion"
version: "1.0"
status: "complete"
date: "2026-09-02"
scope: "Multi-tenant firm workspace runtime binding"
---

# MT-H3 Local Seed and Pilot Workspace Data Repair Completion v1.0

## Sprint result

MT-H3 is complete.

The local pilot seed now creates or preserves both reference pilot workspaces:

- Amanah Formwork Pilot Firm;
- NHL Global Solution.

This addresses the prior operator issue where the live local store could contain only PD-H2 rehearsal firms after private-directory rehearsal runs.

## Implemented capability

### New seed command

`npm run seed:pilot-workspaces`

This runs:

`node scripts/seed-multi-tenant-pilot-workspaces-local.mjs`

The seed is designed to be idempotent for existing firm names:

- if a pilot firm already exists, it is preserved;
- if its subscription package is missing, the package is added;
- if expected AI workers are missing, they are provisioned and activated;
- existing PD-H2 rehearsal firms are not deleted.

### New smoke gate

`npm run check:mt:h3`

This runs:

`node scripts/smoke-mt-h3-pilot-workspace-seed.mjs`

The smoke starts an isolated temporary API/store, runs the combined seed, and verifies the resulting active workspace summaries.

## Formwork pilot workspace

The seed ensures:

- firm: `Amanah Formwork Pilot Firm`;
- firm type: `FORMWORK_ENGINEERING`;
- subscription: `VF-FORMWORK-PILOT`;
- service line: `formwork_preliminary_wall_slab`;
- six pilot AI workers.

## NHL Global Solution workspace

The seed ensures:

- firm: `NHL Global Solution`;
- owner/principal: `Nur Hernieliana`;
- firm type: `ORGANIZATION_SUPPORT`;
- subscription: `VF-ORG-SUPPORT-PILOT`;
- services:
  - project reporting;
  - technical writing;
  - clerical work;
  - BizKick EDCS;
- six pilot AI workers.

## Rehearsal data handling

PD-H2 private-directory firms are preserved as rehearsal/test data. They are not deleted by MT-H3 and are classified by the active workspace resolver as rehearsal workspaces when selected.

This prevents test/rehearsal firms from hiding the intended Formwork and NHL pilot workspaces.

## Boundary confirmation

MT-H3 does not authorize:

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

- `scripts/seed-multi-tenant-pilot-workspaces-local.mjs`
- `scripts/smoke-mt-h3-pilot-workspace-seed.mjs`
- `npm run check:mt:h3`
- `npm run check`

## Operator note

For the currently running local app, run:

`npm run seed:pilot-workspaces`

Then open:

`http://localhost:3090/`

The active firm selector should include both `Amanah Formwork Pilot Firm` and `NHL Global Solution`.

## Next sprint

Proceed next to `MT-H4 - Frontend Workspace Shell Binding`.

