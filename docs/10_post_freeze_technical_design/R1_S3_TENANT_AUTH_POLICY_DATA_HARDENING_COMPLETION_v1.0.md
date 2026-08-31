---
id: VFIRM-R1-S3-TENANT-AUTH-POLICY-DATA-HARDENING
title: "vFirm R1-S3 Tenant, Auth, Policy, and Data Protection Hardening Completion Note"
version: "1.0"
status: "Sprint Complete"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# vFirm R1-S3 Tenant, Auth, Policy, and Data Protection Hardening Completion Note v1.0

## 1. Sprint purpose

R1-S3 hardens Release 1 boundaries without adding new product scope.

The sprint focused on:

- negative tenant-isolation checks;
- command-level actor scope enforcement;
- authority-denial checks for regulated delivery actions;
- support/revocation boundary checks;
- special data-protection and summary endpoint scope checks;
- commercial no-live-capture guard verification.

## 2. Delivered

| Area | Result |
|---|---|
| Hardening smoke | Added `scripts/smoke-r1-hardening.mjs`. |
| npm script | Added `npm run check:r1:hardening`. |
| Release 1 aggregate check | Updated `npm run check:r1` to run R1 end-to-end smoke plus hardening smoke. |
| Command tenant scope | Central `actorFromBody` now enforces actor tenant/firm scope against command tenant/firm. |
| Core command wrappers | Client, intake, proposal, evidence bundle, and invoice commands now resolve scoped actor context before store writes. |
| Special read scope | Data export manifest, support summary, operator metrics, pilot learning loop, review board summary, expansion summary, usage summary, and commercial launch summary now enforce actor scope when actor headers are present. |
| Commercial guard | Release 1 explicitly rejects live payment capture activation statuses. |

## 3. Hardening smoke coverage

The R1-S3 smoke verifies:

```text
tenant A / firm A setup
  -> tenant B / firm B setup
  -> tenant A pilot workflow seed
  -> deny tenant A actor reading tenant B clients
  -> deny tenant A actor reading tenant B export manifest
  -> deny tenant A actor reading tenant B commercial summary
  -> deny tenant A actor writing client into tenant B
  -> deny unauthorized human deliverable review
  -> deny deliverable issue without approved review gate
  -> invite / activate pilot user
  -> verify staging identity resolves active
  -> revoke pilot user
  -> verify staging identity no longer resolves active
  -> deny cross-tenant support case creation
  -> deny live payment capture activation
  -> allow test-mode commercial launch control
  -> verify commercial boundary remains no-live-capture
```

## 4. Validation evidence

Commands run:

```powershell
npm run check:r1:hardening
npm run check
npm run check:r1:json
npm run check:r1:postgres
```

Results:

```text
R1-S3 tenant/auth/policy/data protection hardening smoke test passed.
Baseline validation passed.
Implementation artifact validation passed.
Migration validation passed (15 migration files).
Policy tests passed (5 fixtures).
API smoke test passed.
API read endpoint smoke test passed.
Web smoke test passed.
Web/API integration smoke test passed.
Stage 4-20 smoke tests passed.
Release 1 end-to-end smoke passed (json backend).
Release 1 end-to-end smoke passed (postgres backend).
```

## 5. R1-S3 backlog movement

| Backlog item | Status |
|---|---|
| R1-BLOCKER-CHECK-002 Tenant isolation negative checks | Passed for protected reads, special summaries/export, and core command write. |
| R1-BLOCKER-CHECK-003 Professional authority gate verification | Passed for unauthorized deliverable review and ungated deliverable issue. |
| R1-BLOCKER-CHECK-004 Commercial-launch no-live-capture verification | Passed; live capture activation status is rejected and test-mode boundary remains explicit. |
| Support/revocation boundary | Passed; revoked pilot user no longer resolves to active staging auth context. |

## 6. R1-S3 conclusion

R1-S3 is complete.

The project is ready for:

> R1-S4 - Pilot Operations Dress Rehearsal.
