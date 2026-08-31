---
id: VF-AUTHORITY-AUTONOMY-MAP
title: "Authority and Autonomy Vocabulary Map"
version: "1.0"
status: "Architecture Baseline"
source_status: "DEFINED FOR DEVELOPMENT READINESS"
---

# Authority and Autonomy Vocabulary Map v1.0

## Purpose

This document prevents the most dangerous terminology confusion in vFirm: mixing AI autonomy with human professional authority.

## Core distinction

```text
AI autonomy = what an AI worker may do operationally.
Professional authority = what a qualified human professional may approve, issue, certify, or sign.
```

These are separate dimensions. A highly autonomous AI worker can still have zero professional authority.

## Canonical terms

| Term | Meaning | Can belong to AI? | Can belong to human? |
|---|---|---:|---:|
| Actor | Any human, AI, system, or external service that performs an action. | Yes | Yes |
| Principal | Human owner/control role for a Firm. | No | Yes |
| Professional | Human acting under qualifications and bounded authority. | No | Yes |
| Worker | AI or non-human operational role provisioned for a Firm. | Yes | No |
| Autonomy Level | Operational freedom for an AI worker. | Yes | No |
| Authority Envelope | Runtime boundary for a worker's tools/data/actions. | Yes | Sometimes as access limits |
| ProfessionalAuthority | Explicit human authority grant for professional acts. | No | Yes |
| Approval | Explicit decision event. | AI may request/prepare | Human may grant where authorized |
| Signature/Seal | Professional or document authenticity act. | No for professional seals | Yes where authorized |

## AI autonomy ladder

Use these values for AI worker autonomy:

| Level | Label | Meaning |
|---|---|---|
| A0 | OBSERVER | Read, monitor, classify, summarize. |
| A1 | ASSISTANT | Draft, prepare, organize, recommend. Human executes. |
| A2 | SUPERVISED_EXECUTOR | Execute predefined actions with approval for material consequences. |
| A3 | CONDITIONAL_AUTONOMOUS | Execute bounded workflow actions under explicit policy. |
| A4 | AUTONOMOUS_OPERATOR | Manage an entire bounded workflow with escalation at authority boundaries. |
| A5 | STRATEGIC_AUTONOMOUS | Highly restricted. Strategic decisions remain human-controlled by default. |

Do not use A5 to mean professional authority. That older phrase is superseded.

## Human professional authority statuses

Use these values for `ProfessionalAuthority.status`:

```text
PROPOSED
ACTIVE
SUSPENDED
EXPIRED
REVOKED
```

Only `ACTIVE` can support regulated approval.

## Approval decisions

Use these values for `Approval.decision`:

```text
APPROVED
REJECTED
APPROVED_WITH_CONDITIONS
NEEDS_MORE_INFORMATION
```

Approval is never implied by task completion, silence, recommendation, or elapsed time.

## Output status terms

AI-generated outputs should use status labels that avoid client-facing confusion:

```text
DRAFT
PREPARED_FOR_REVIEW
QA_CHECKED
READY_FOR_PROFESSIONAL_REVIEW
APPROVED_FOR_ISSUE
ISSUED
SUPERSEDED
REJECTED
```

Only an approved process can move a regulated deliverable to `APPROVED_FOR_ISSUE` or `ISSUED`.

## Forbidden substitutions

Do not say:

- AI approved the engineering design.
- AI signed the document.
- Worker has professional authority.
- The system certified the regulated deliverable.
- The AI engineer is responsible professional.

Use instead:

- AI prepared a draft.
- AI completed a QA check.
- AI requested professional review.
- Human professional approved the deliverable.
- Firm issued the approved deliverable with evidence and audit trail.

## Conformance rule

Any implementation, schema, UI, prompt, API, or event that blurs AI autonomy and human professional authority fails the architecture baseline.

