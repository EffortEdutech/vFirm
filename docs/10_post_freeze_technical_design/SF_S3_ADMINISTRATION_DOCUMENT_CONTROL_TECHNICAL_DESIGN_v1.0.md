---
id: VFIRM-SF-S3-ADMINISTRATION-DOCUMENT-CONTROL
title: "SF-S3 Administration and Document Control Technical Design"
version: "1.0"
status: "Active Sprint Design"
---

# SF-S3 Administration and Document Control

## Outcome

Give the Virtual Principal a reliable administration workspace for correspondence, document/revision control, deadlines, and transmittal preparation without relying on raw JSON or manual folder tracking.

## Authority boundary

The Administration Clerk may capture, classify, register, compare metadata, draft, and follow up. It may not approve documents, issue formal instructions, issue transmittals, change professional conclusions, or treat extracted content as verified fact. Transmittals remain `DRAFT_REVIEW_REQUIRED`; external issue is outside SF-S3.

## Records and states

- Correspondence: `RECEIVED | DRAFT_REVIEW_REQUIRED -> ACTIONED | CLOSED`.
- Document register entry: `ACTIVE -> ARCHIVED`.
- Revision: new immutable revision becomes `CURRENT`; prior current revision becomes `SUPERSEDED`.
- Deadline: `OPEN -> COMPLETED | CANCELLED`.
- Transmittal: `DRAFT_REVIEW_REQUIRED` only in SF-S3.
- Skill binding: versioned Administration Clerk role/worker skill references, schemas, permissions, forbidden actions, supervisor, and audit identity.

All records are tenant/firm scoped. Project/client references are checked inside the same scope.

## Deterministic controls

Duplicate document numbers or revisions are rejected. A transmittal may reference only registered revisions in the same firm. Missing document references, overdue deadlines, and draft items remain visible exceptions. No parser, retrieval system, or LLM can approve, issue, supersede, or close authoritative records directly.

## External tools

Marker and Chunky remain deferred until representative pilot PDFs prove native capture insufficient. The current sprint stores metadata and storage references; it does not embed documents or introduce RAG as a compliance control.

## Exit gate

A principal can bind the Administration Clerk, register incoming correspondence and a document revision, add a superseding revision, create/complete a deadline, prepare a review-only transmittal, see exceptions in the workspace, and reconstruct all actions from events and audit records.
