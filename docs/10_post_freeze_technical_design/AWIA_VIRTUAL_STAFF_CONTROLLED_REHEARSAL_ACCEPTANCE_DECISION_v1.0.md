---
id: VFIRM-AWIA-VIRTUAL-STAFF-CONTROLLED-REHEARSAL-ACCEPTANCE-DECISION
title: "AWIA Virtual Staff Controlled Rehearsal Acceptance Decision"
version: "1.0"
status: "Accepted"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
scope_classification: "Explicit User-Approved Scope Expansion"
decision: "ACCEPT_CONTROLLED_REHEARSAL_READY"
---

# AWIA Virtual Staff Controlled Rehearsal Acceptance Decision v1.0

## 1. Decision

The product owner accepts the AWIA virtual staff controlled rehearsal readiness state.

Decision:

```text
ACCEPT_CONTROLLED_REHEARSAL_READY
```

## 2. Accepted capability

The accepted capability is:

```text
AWIA virtual staff is ready for controlled, human-governed pilot rehearsal planning.
```

This acceptance covers the S1-S6 chain:

- contract lock
- local package registry mapping
- draft staff provisioning kernel
- deterministic authority and runtime gate
- AFCC staff management operating experience
- evidence pack and pilot gate projection
- controlled pilot rehearsal runbook/result

## 3. Boundary retained

This decision does not authorize:

- autonomous regulated approval
- direct LLM to regulated final output
- live payment release
- public marketplace exposure
- uncontrolled external data sharing
- production launch
- bypassing human professional authority

## 4. Current accepted status

| Area | Status |
| --- | --- |
| AWIA-VS-S1 through AWIA-VS-S6 | Accepted as controlled rehearsal baseline |
| Controlled rehearsal result | Accepted |
| Runtime execution | Still disabled |
| Pilot readiness | Ready for human-governed pilot rehearsal planning |
| Product-owner decision | Recorded |

## 5. Next bounded build options

The next implementation decision should choose one bounded path:

| Option | Purpose |
| --- | --- |
| `AUTHORIZE_AWIA_STAFF_PERSISTENCE_AND_API` | Persist staff seats, identities, bindings, lifecycle events, and expose controlled API commands. |
| `AUTHORIZE_AWIA_AFCC_BROWSER_QA_AND_UX_HARDENING` | Visually verify and harden the AFCC staff management experience before demos. |
| `AUTHORIZE_AWIA_NAMED_FIRM_PILOT_SCRIPT` | Create a human operator pilot script for Amanah, NHL, or a synthetic training firm. |
| `AUTHORIZE_AWIA_RELEASE_HANDOFF_PLAN` | Convert the AWIA virtual staff work into a formal Release 2/3 handoff plan. |

## 6. Recommendation

Recommended next move:

```text
AUTHORIZE_AWIA_AFCC_BROWSER_QA_AND_UX_HARDENING
```

Reason: the concept is now accepted at contract, runtime, evidence, and rehearsal levels. Before adding persistence or API side effects, the operator experience should be visually checked in browser and hardened so the client can feel how hiring and managing virtual staff works.
