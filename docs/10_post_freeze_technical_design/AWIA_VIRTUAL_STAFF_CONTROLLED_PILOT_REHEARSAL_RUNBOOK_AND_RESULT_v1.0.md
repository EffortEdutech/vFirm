---
id: VFIRM-AWIA-VIRTUAL-STAFF-CONTROLLED-PILOT-REHEARSAL
title: "AWIA Virtual Staff Controlled Pilot Rehearsal Runbook and Result"
version: "1.0"
status: "Controlled Pilot Rehearsal Complete"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
scope_classification: "Explicit User-Approved Scope Expansion"
authorization: "AUTHORIZE_AWIA_VIRTUAL_STAFF_CONTROLLED_PILOT_REHEARSAL"
---

# AWIA Virtual Staff Controlled Pilot Rehearsal Runbook and Result v1.0

## 1. Rehearsal outcome

The AWIA virtual staff controlled pilot rehearsal is complete.

The rehearsal proves the end-to-end human-governed operating story:

```text
Package registry
  -> staff seat and salary review
  -> draft worker identity provisioning
  -> AFCC staff roster/profile review
  -> controlled work assignment readiness
  -> authority gate decision
  -> evidence pack review
  -> append-only ledger projection
  -> product-owner acceptance gate
```

This rehearsal does not authorize autonomous virtual staff execution, regulated final output, live payment release, public marketplace exposure, or uncontrolled external data sharing.

## 2. Rehearsal boundary

```text
controlled_human_governed_rehearsal_no_autonomous_execution
```

The rehearsal is a controlled local/private pilot readiness exercise. It uses deterministic S2-S6 contracts and smoke checks.

## 3. Rehearsal steps

| Step | Result | Evidence |
| --- | --- | --- |
| Select staff catalogue | PASS | Local Agent Skills package registry mapped and status-gated. |
| Review salary and seat | PASS | Staff seat and monthly salary are commercial metadata only. |
| Provision draft staff | PASS | 8 draft virtual staff members are provisioned as non-executing records. |
| Inspect AFCC roster | PASS | AFCC Staff Management shows roster, lifecycle, package status, workload, approval, and readiness semantics. |
| Assign controlled work | PASS | Controlled CFO analysis action has task scope, evidence, tool policy, and responsible human context. |
| Receive authority decision | PASS | Authority gate allows bounded support action and denies unsafe actions. |
| Review evidence pack | PASS | Evidence objects and append-only ledger projection are available. |
| Confirm human governance | PASS | Runtime execution remains disabled; human governance boundary remains explicit. |

## 4. Acceptance options

The product owner may now choose:

| Option | Meaning |
| --- | --- |
| `ACCEPT_CONTROLLED_REHEARSAL_READY` | Accept AWIA virtual staff controlled rehearsal readiness and move to a bounded next implementation decision. |
| `HOLD_FOR_OPERATOR_UX_REPAIR` | Hold for UI/experience repair before accepting rehearsal readiness. |
| `HOLD_FOR_GOVERNANCE_REPAIR` | Hold for authority, evidence, lifecycle, package, or approval control repair. |

## 5. Recommendation

The automated rehearsal recommendation is:

```text
GO_FOR_CONTROLLED_HUMAN_GOVERNED_PILOT_REHEARSAL
```

This means the AWIA virtual staff chain is ready for a human-governed pilot rehearsal acceptance decision. It does not mean production launch.

## 6. Verification evidence

| Command | Result |
| --- | --- |
| `npm run check:awia:vs:s2` | PASS |
| `npm run check:awia:vs:s3` | PASS |
| `npm run check:awia:vs:s4` | PASS |
| `npm run check:awia:vs:s5` | PASS |
| `npm run check:awia:vs:s6` | PASS |
| `node --check scripts/smoke-awia-virtual-staff-controlled-pilot-rehearsal.mjs` | PASS |
| `node scripts/smoke-awia-virtual-staff-controlled-pilot-rehearsal.mjs` | PASS |
| `git diff --check` | PASS |

## 7. Next decision gate

Recommended next product-owner decision:

```text
ACCEPT_CONTROLLED_REHEARSAL_READY
```

After acceptance, the next bounded build decision should be chosen deliberately. The likely candidates are persisted staff records, API lifecycle controls, deeper AFCC browser QA, or a human pilot script for a named firm.
