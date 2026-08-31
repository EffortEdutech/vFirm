---
id: VF-STAGE-3-PRODUCTIZED-WORKSPACE-PLAN
title: "Stage 3 Productized Workspace Plan"
version: "1.0"
status: "Complete"
source_status: "CREATED AFTER STAGE 2 EXIT"
---

# Stage 3 Productized Workspace Plan v1.0

## 1. Stage Mission

Stage 3 turns the working MVP loop into an operator-ready workspace for a Virtual Firm principal and early internal team.

The goal is not yet production SaaS. The goal is to make the product understandable, navigable, reviewable, and safe enough for repeated internal use.

## 2. Product Principle

The UI must show the Virtual Firm as the business system of record:

```text
Client -> Intake -> Proposal -> Approval -> Engagement -> Project -> Evidence -> Invoice -> Audit
```

Raw JSON remains available only as a diagnostic detail, not the primary experience.

## 3. Sprint 3.1 — Workspace Shell Productization

Goals:

- clearer operator header and stage status;
- better navigation grouping;
- loading/error/empty states;
- dashboard health and next-action cards;
- consistent record table behavior.

Exit criteria:

- an operator can understand what to do next without reading source code or asking what the demo means.

## 4. Sprint 3.2 — Detail Pages and Record Context

Goals:

- structured client detail;
- structured intake detail;
- structured proposal detail;
- structured project detail;
- structured invoice detail;
- related-record context panels.

Exit criteria:

- every major record view answers: what is it, where did it come from, what is its state, what can happen next?

## 5. Sprint 3.3 — Form and Command UX Hardening

Goals:

- inline validation;
- user-friendly command errors;
- disabled-state explanations;
- success toasts/activity updates;
- safer reset/export affordances.

Exit criteria:

- normal command failures are understandable without opening DevTools.

## 6. Sprint 3.4 — Audit and Governance Workspace

Goals:

- event timeline;
- audit detail viewer;
- policy decision viewer;
- correlation/causation display;
- approval trace display.

Exit criteria:

- the MVP can demonstrate traceability of regulated workflow actions.

## 7. Sprint 3.5 — Formwork Practice Pack UX

Goals:

- Formwork service pack summary page/section;
- evidence requirements display;
- intake completeness checklist;
- project evidence bundle status;
- first operator-friendly deliverable/evidence placeholders.

Exit criteria:

- Formwork Template #001 feels like a real service delivery pack, not just a sample payload.

## 8. Stage 3 Exit Criteria

Stage 3 may close when:

- principal/operator can run the MVP without raw JSON as the main guide;
- each workspace tab has list, detail, actions, and clear empty states;
- audit trail is human-readable;
- Formwork service pack is visible in the workspace;
- all Stage 3 smoke checks pass.

## 9. Stage 3 Completion Note — 2026-08-25

Stage 3 has been completed and closed by `STAGE_3_EXIT_REVIEW_v1.0.md`.

The workspace now includes operator health cards, next-action guidance, command feedback, structured detail/context panels, audit/governance timeline, and Formwork service pack UX.
