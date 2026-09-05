---
id: VFIRM-AWIA-VS-S3-STAFF-PROVISIONING-KERNEL-COMPLETION
title: "AWIA Virtual Staff Sprint 3 Staff Provisioning Kernel Completion"
version: "1.0"
status: "AWIA-VS-S3 Complete"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
scope_classification: "Explicit User-Approved Scope Expansion"
authorization: "AUTHORIZE_AWIA_VS_S3_STAFF_PROVISIONING_KERNEL"
---

# AWIA-VS-S3 Staff Provisioning Kernel Completion v1.0

## 1. Sprint outcome

AWIA-VS-S3 is complete for the first staff provisioning kernel slice.

The repository now has deterministic provisioning contracts for virtual staff seats, AWIA-style worker identities, role assignments, package bindings, and lifecycle events. The kernel provisions the first pilot staff set into draft records only.

This sprint does not activate autonomous staff operation, create database persistence, expose UI screens, or authorize runtime tool execution.

## 2. Implemented artifacts

| Artifact | Purpose |
| --- | --- |
| `packages/core-domain/src/awia-virtual-staff-provisioning.mjs` | Deterministic provisioning kernel and validator for draft virtual staff records. |
| `packages/core-domain/src/awia-virtual-staff-provisioning.ts` | TypeScript contract declarations for seats, members, package bindings, role assignments, lifecycle events, and provisioning runs. |
| `scripts/smoke-awia-vs-s3-staff-provisioning.mjs` | Smoke validation for draft provisioning, runtime-disabled boundary, salary authority denial, lifecycle denial, and package-binding authority denial. |
| `packages/core-domain/src/index.ts` | Exports the AWIA virtual staff provisioning contracts. |
| `package.json` | Adds `check:awia:vs:s3` validation command. |

## 3. Provisioned draft staff set

The S3 kernel provisions draft records for:

| Staff code | Provisioned records |
| --- | --- |
| `CFO-001` | seat, member, role assignment, package binding, lifecycle event |
| `FA-001` | seat, member, role assignment, package binding, lifecycle event |
| `FAO-AP-001` | seat, member, role assignment, package binding, lifecycle event |
| `FAO-REV-001` | seat, member, role assignment, package binding, lifecycle event |
| `SAO-001` | seat, member, role assignment, package binding, lifecycle event |
| `OPO-001` | seat, member, role assignment, package binding, lifecycle event |
| `ARO-001` | seat, member, role assignment, package binding, lifecycle event |
| `DATA-001` | seat, member, role assignment, package binding, lifecycle event |

All records remain tenant-scoped and firm-scoped.

## 4. Runtime boundary

The provisioning run is locked to:

```text
provisioning_only_no_autonomous_execution
```

Runtime execution is explicitly disabled:

```json
{
  "runtime_execution_enabled": false
}
```

Only `ACTIVE` staff may accept executable tasks in future runtime logic, and S3 creates only `DRAFT` staff members.

## 5. Denial controls

The S3 smoke validates denial for:

- runtime execution enabled during provisioning
- salary or staff plan treated as authority
- initial member lifecycle set to `ACTIVE`
- package binding treated as authority

These controls preserve AWIA separation between commercial seat, worker identity, package binding, lifecycle state, and authority envelope.

## 6. Verification evidence

| Command | Result |
| --- | --- |
| `node --check packages/core-domain/src/awia-virtual-staff-provisioning.mjs` | PASS |
| `node --check scripts/smoke-awia-vs-s3-staff-provisioning.mjs` | PASS |
| `node scripts/smoke-awia-vs-s2-package-registry.mjs` | PASS |
| `node scripts/smoke-awia-vs-s3-staff-provisioning.mjs` | PASS |
| `git diff --check` | PASS |

Smoke result:

```json
{
  "smoke": "awia-vs-s3-staff-provisioning",
  "result": "passed",
  "summary": {
    "seat_count": 8,
    "member_count": 8,
    "role_assignment_count": 8,
    "package_binding_count": 8,
    "lifecycle_event_count": 8,
    "runtime_execution_enabled": false
  },
  "boundary": "provisioning_only_no_autonomous_execution",
  "denied_controls": [
    "runtime_execution_enabled",
    "salary_plan_grants_authority",
    "initial_active_state",
    "package_binding_grants_authority"
  ]
}
```

## 7. Known carry-over items

| Item | Target |
| --- | --- |
| Authority-envelope runtime enforcement | AWIA-VS-S4 |
| Approval and SOD denial fixtures | AWIA-VS-S4 |
| Persistence/API wiring | Later approved sprint |
| AFCC staff management UI | AWIA-VS-S5 |
| Ledger/evidence projection | AWIA-VS-S6 |

## 8. Next sprint gate

Recommended next authorization:

```text
AUTHORIZE_AWIA_VS_S4_AUTHORITY_AND_RUNTIME_GATE
```

AWIA-VS-S4 should add deterministic authority and runtime gate validation for staff lifecycle, package status, task scope, tool policy, salary non-authority, package-binding non-authority, SOD, and approval requirements. It must still avoid direct LLM-to-final regulated output and autonomous regulated approval.
