---
id: VFIRM-R1-S2-EXISTING-WORKFLOW-STABILIZATION
title: "vFirm R1-S2 Existing Workflow Stabilization Completion Note"
version: "1.0"
status: "Sprint Complete"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# vFirm R1-S2 Existing Workflow Stabilization Completion Note v1.0

## 1. Sprint purpose

R1-S2 stabilizes the existing Stage 1-20 Release 1 workflow without adding new product scope.

The sprint focused on:

- one Release 1 end-to-end smoke script;
- PostgreSQL primary-mode verification;
- JSON fallback parity verification;
- scoped operator UX polish for existing workflow surfaces.

## 2. Delivered

| Area | Result |
|---|---|
| Release 1 smoke | Added `scripts/smoke-r1-end-to-end.mjs`. |
| JSON fallback parity | Added `npm run check:r1:json`; passed. |
| PostgreSQL primary mode | Added `npm run check:r1:postgres`; passed against local Docker PostgreSQL. |
| Package scripts | Added `check:r1`, `check:r1:json`, and `check:r1:postgres`. |
| Store parity fix | Fixed PostgreSQL `createPilotIncidentRecord` audit/event path by replacing an undefined helper with the existing `withAppState(...appendEventAndAudit...)` pattern. |
| UX polish | Added Release 1 stabilization banner and clearer commercial no-live-capture boundary notice. |

## 3. Release 1 smoke coverage

The R1 smoke covers the controlled Formwork pilot path:

```text
health / persistence check
  -> Formwork pilot package check
  -> tenant
  -> firm / principal actor
  -> client / relationship
  -> intake
  -> proposal
  -> approval
  -> acceptance / engagement / project
  -> AI worker provision / activate / assign
  -> task start / completion / AI output capture
  -> evidence bundle
  -> deliverable draft / review / issue
  -> invoice / issue / payment status
  -> pilot user invite / activate
  -> support case / close
  -> incident / resolve
  -> feedback / acceptance review / improvement item
  -> report pack
  -> stakeholder review board / decision
  -> controlled expansion / onboarding plan
  -> usage limits / usage events / billing readiness
  -> payment provider prep / subscription package / commercial launch control
  -> marketplace listing / capacity offer / observatory snapshot
  -> dashboard / usage / commercial / audit / policy assertions
```

## 4. Validation evidence

Commands run:

```powershell
npm run db:migrate:docker
npm run check:r1:json
npm run check:r1:postgres -- --port=3098
npm run check:web
```

Results:

```text
Migration run complete. Applied 0, skipped 15 on Docker container vfirm-postgres.
Release 1 end-to-end smoke passed (json backend).
Release 1 end-to-end smoke passed (postgres backend).
Web smoke test passed.
```

## 5. R1-S2 backlog movement

| Backlog item | Status |
|---|---|
| R1-STAB-001 Create a single Release 1 end-to-end smoke script | Complete. |
| R1-STAB-004 Review UI disabled states and command feedback | Partially complete; Release 1 banner and commercial boundary notice added. Further friction pass can continue in R1-S4 if needed. |
| R1-STAB-006 Verify PostgreSQL and JSON fallback parity for core Release 1 actions | Complete for end-to-end smoke path. |
| R1-BLOCKER-CHECK-005 PostgreSQL primary mode rehearsal | Passed. |

## 6. Known follow-up for R1-S3

R1-S3 should focus on hardening checks, not new product scope:

- negative tenant-isolation smoke checks;
- authority-denial checks for regulated delivery actions;
- support override / revocation boundary checks;
- commercial no-live-capture guard verification.

## 7. R1-S2 conclusion

R1-S2 is complete.

The existing Release 1 workflow now has a single end-to-end smoke path that passes in both JSON fallback mode and PostgreSQL primary mode.

The next correct sprint is:

> R1-S3 - Tenant, Auth, Policy, and Data Protection Hardening.
