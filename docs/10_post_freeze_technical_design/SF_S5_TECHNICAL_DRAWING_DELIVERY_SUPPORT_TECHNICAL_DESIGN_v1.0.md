---
id: VFIRM-SF-S5-TECHNICAL-DRAWING-DELIVERY-SUPPORT
title: "SF-S5 Technical Drawing and Delivery Support Technical Design"
version: "1.0"
status: "Active Sprint Design"
---

# SF-S5 Technical Drawing and Delivery Support

## Outcome

Prepare traceable Formwork drawing and calculation inputs, QA findings, evidence references, and a delivery package that can reach `READY_FOR_PRINCIPAL_REVIEW` but never autonomous professional approval or issue.

## Authority boundary

Technical Drawing Assistant and Formwork QA workers may read registered drawings, compare revision metadata/hashes, prepare deterministic input sets, run schema/unit/positive-geometry checks, raise findings, and assemble evidence references.

They may not make engineering conclusions, approve drawings or calculations, certify compliance, close material QA findings without an attributable human command, or issue deliverables. Existing professional authority, evidence, approval, and issue controls remain authoritative.

## Deterministic states

- Drawing review: `CHECKED_REVIEW_REQUIRED`.
- Calculation inputs: `VALID | INVALID`; no engineering result is produced.
- QA finding: `OPEN -> RESOLVED` through explicit human action.
- Delivery package: `BLOCKED | READY_FOR_PRINCIPAL_REVIEW`; no `ISSUED` state exists here.

Readiness requires valid calculation inputs, current drawing revisions, at least one evidence reference, and no open HIGH or CRITICAL finding.

## Required Formwork validation

Required values are project name, site location, structure type, formwork element type, height, length/area, concrete grade, and available drawing references. Height and length/area must be finite and positive. Units must be declared as SI. Every source revision must exist in the same tenant/firm/project context.

These checks validate inputs only. A future deterministic engineering engine must have a separate typed contract, test evidence, and professional review gate.

## External tools

Marker and Chunky remain optional document-ingestion candidates. They are not required for revision metadata checks and cannot become approval authorities. No RAG/vector store is introduced as a compliance mechanism.

## Exit gate

A principal can bind technical workers, compare registered revisions, prepare and validate Formwork inputs, raise/resolve QA findings, assemble a blocked or review-ready package, and then use the existing evidence/professional approval/controlled issue workflow.
