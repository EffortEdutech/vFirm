---
id: PD-H6-PRIVATE-DIRECTORY-PILOT-LEARNING-BACKLOG-AND-NEXT-SCOPE-DECISION
title: "PD-H6 Private Directory Pilot Learning Backlog and Next Scope Decision"
version: "1.0"
status: "Completed - Product-Owner Next Scope Decision Required"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
created: "2026-09-02"
---

# PD-H6 Private Directory Pilot Learning Backlog and Next Scope Decision v1.0

## 1. Purpose

PD-H6 converts the controlled private directory pilot closeout structure into a governed learning backlog and prepares the next product-owner scope decision.

This sprint does not widen the Virtual Firm Platform into a public marketplace. It prepares a safe decision point after PD-H5 so the product owner can choose the next bounded step with evidence in hand.

## 2. Inputs reviewed

PD-H6 depends on:

- `PD_H3_PRIVATE_DIRECTORY_PILOT_ACCEPTANCE_DECISION_v1.0.md`;
- `PD_H4_CONTROLLED_PRIVATE_DIRECTORY_PILOT_OPERATION_RUNBOOK_AND_LOG_v1.0.md`;
- `PD_H5_CONTROLLED_PRIVATE_DIRECTORY_PILOT_CLOSEOUT_REVIEW_v1.0.md`;
- `PD_H2_PRIVATE_DIRECTORY_PILOT_REHEARSAL_EVIDENCE_PACK_v1.0.md`;
- `ME_S7_MARKETPLACE_ECOSYSTEM_RELEASE_GATE_COMPLETION_v1.0.md`.

## 3. Learning backlog policy

Every pilot learning item must be classified before implementation.

| Backlog class | Meaning | Implementation rule |
|---|---|---|
| Operator usability | Improves labels, empty states, forms, or workflow clarity. | May proceed in private-directory hardening if no scope widening is required. |
| Evidence quality | Improves logs, audit summaries, export references, or review pack clarity. | May proceed if it strengthens auditability without exposing private chain-of-thought. |
| Data protection | Improves tenant isolation, redaction, retention, or export controls. | Must be treated as high priority and verified before pilot expansion. |
| Governance control | Improves Review Board, approval, suspension, revocation, renewal, or authority controls. | Must preserve human authority and no-silent-approval. |
| Integration readiness | Prepares provider-neutral integration surfaces without activating external sending or live payment movement. | Requires explicit bounded implementation plan before external connection. |
| Scope widening request | Requests public marketplace, live matching, ranking, capacity allocation, VF-24 publication, pricing intelligence, autonomous award, or autonomous regulated approval. | Must be rejected from PD-H6 implementation and routed to a future explicit product-owner authorization gate. |
| Blocker | Prevents safe pilot operation or audit reconstruction. | Must be fixed before continuing affected pilot operation. |
| Accepted limitation | Known limitation accepted by the product owner under private-directory scope. | May remain open if recorded and visible. |

## 4. Seed learning backlog from PD-H5

The current repo-level closeout is simulated and ready for human pilot use. It produces the following seed backlog:

| Item | Class | Priority | Proposed disposition |
|---|---|---:|---|
| Replace simulated pilot log rows with filled human pilot log rows after a real controlled pilot day. | Evidence quality | High | Required before claiming real pilot closeout. |
| Add operator screenshots or screen references to the pilot evidence pack when available. | Evidence quality | Medium | Add during human pilot operation. |
| Improve private directory cockpit copy if operators confuse enquiry with automatic award. | Operator usability | Medium | Candidate for private-directory hardening only. |
| Track unresolved issue owners and due dates in a structured pilot backlog. | Governance control | High | Candidate for next implementation sprint. |
| Prepare export checklist for legally permissible private directory pilot records. | Data protection | Medium | Candidate for evidence/export hardening. |
| Any request for public marketplace, live matching, ranking, capacity allocation, VF-24 publication, pricing intelligence, autonomous award, or autonomous regulated approval. | Scope widening request | Blocked | Requires separate future authorization; not part of PD-H6. |

## 5. Next scope decision options

### Option A - Continue private directory pilot hardening

Recommended if the product owner wants to keep improving the controlled private directory based on PD-H5/PD-H6 evidence.

Effect:

- Next sprint may implement a structured private pilot learning backlog and evidence follow-up controls.
- Scope remains private-directory-only.
- No public marketplace or live matching work begins.

Suggested wording:

```text
Bismillah... I authorize PD-H7 as controlled private directory pilot learning backlog implementation only. Keep the scope private-directory-only and do not implement public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, or autonomous regulated approval.
```

### Option B - Run a real controlled human pilot day first

Recommended if the product owner wants real operator evidence before more implementation.

Effect:

- No new product code is required immediately.
- The team runs PD-H4 and PD-H5 with a real controlled pilot log.
- Implementation resumes only after real pilot evidence is reviewed.

Suggested wording:

```text
Bismillah... Hold new implementation. Run a real controlled private directory pilot day using PD-H4 and PD-H5, then bring the filled pilot log back for review.
```

### Option C - Hold and fix named blockers

Use this if the product owner identifies blockers from pilot operation or closeout evidence.

Effect:

- Named blockers become the next active work.
- Pilot operation narrows or pauses until blockers are resolved.

Suggested wording:

```text
Bismillah... Hold PD-H6 next scope decision. The blockers to fix first are: [name blockers].
```

### Option D - Prepare a new marketplace-widening decision gate

Use only if the product owner wants to discuss public marketplace, matching, ranking, capacity allocation, VF-24 publication, pricing intelligence, autonomous award, or autonomous regulated approval.

Effect:

- No widening implementation begins automatically.
- A separate decision gate and release plan must be prepared first.
- Existing private directory boundaries remain active until explicit authorization is recorded.

Suggested wording:

```text
Bismillah... Prepare a separate marketplace-widening decision gate for discussion only. Do not implement widening features yet.
```

## 6. Recommended decision

Technical recommendation: Option A or Option B.

- Choose Option A if we want to keep building the private directory pilot support system.
- Choose Option B if we want real human pilot evidence before more code.

The careful path is Option B before any broader scope, but Option A is also safe if it remains private-directory-only.

## 7. Boundaries still locked

PD-H6 does not authorize:

- public marketplace;
- live matching;
- ranking;
- capacity allocation;
- VF-24 observatory publication;
- pricing intelligence;
- autonomous award;
- autonomous regulated approval;
- external sending;
- live payment movement;
- uncontrolled tenant or client data sharing;
- production legal, regulatory, insurance, or liability determination.

## 8. Completion criteria

PD-H6 is complete when:

- the learning backlog policy is documented;
- seed learning backlog items are classified;
- next-scope decision options are documented;
- recommended decision options are explicit;
- scope-widening requests are routed to a separate future authorization gate;
- executable smoke evidence passes;
- full repository check passes;
- decision register and technical design index are updated.

## 9. Next step

Product-owner decision required.

No PD-H7 implementation or marketplace-widening work should begin until the product owner chooses the next scope option.