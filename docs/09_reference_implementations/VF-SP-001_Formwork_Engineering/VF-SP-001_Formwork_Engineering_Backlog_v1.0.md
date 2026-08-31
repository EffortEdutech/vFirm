---
id: VF-SP-001-BACKLOG
title: "Formwork Engineering Reference Vertical Backlog"
version: "1.0"
status: "Architecture Baseline"
source_status: "DEFINED FOR MVP DEVELOPMENT READINESS"
---

# Formwork Engineering Reference Vertical Backlog v1.0

## Purpose

This backlog defines the first reference vertical for vFirm. It keeps the first build narrow enough to implement while proving the core architecture: Firm setup, client intake, AI-assisted work, deterministic checks, professional approval, delivery, invoice, and audit.

## MVP service scope

Start with one controlled service:

```text
Formwork Design Support - Preliminary Wall/Slab Package
```

The service prepares structured intake, document register, preliminary engineering inputs, QA checklist, and draft deliverable package for professional review. It does not automatically issue final regulated engineering design.

## Target users

- Professional Principal: formwork or temporary works engineer.
- Client: contractor, subcontractor, developer, or construction manager.
- Internal workers: intake, document control, geometry, calculation preparation, QA, proposal, billing.

## Required intake data

```text
project name
site location
client organization and contacts
structure type
formwork element type: wall | slab | column | beam | core | stair | foundation
height and dimensions
concrete grade
pour height and pour rate where known
available drawings
required standard or submission basis
manufacturer/system preference where any
deadline
required deliverables
approval/submission authority where any
```

## Required documents

```text
structural drawings
architectural drawings where relevant
latest revision register
site constraints photos or notes where available
method statement requirements where available
manufacturer formwork system data where licensed/permitted
client scope document or purchase request where available
```

## MVP workflow

```text
client enquiry
  -> formwork intake
  -> missing information check
  -> service fit and risk classification
  -> quote draft
  -> professional/commercial approval if required
  -> proposal issue
  -> client acceptance
  -> project open
  -> document register setup
  -> geometry/input extraction
  -> calculation input preparation
  -> deterministic calculation placeholder/check
  -> QA checklist
  -> evidence bundle
  -> professional review
  -> approved deliverable issue
  -> invoice
  -> closeout and knowledge capture
```

## MVP worker set

| Worker | Purpose | Authority |
|---|---|---|
| Receptionist Agent | Capture enquiry and route to intake. | A1/A2 only. |
| Formwork Intake Agent | Collect and structure formwork requirements. | A2 only. |
| Document Controller Agent | Maintain drawing/document register. | A2/A3 bounded. |
| Geometry Agent | Extract/prepare dimensions from supplied data. | A1/A2. |
| Calculation Preparation Agent | Prepare inputs for deterministic checks. | A1/A2. |
| QA Agent | Run checklist and flag missing/inconsistent data. | A2. |
| Proposal Agent | Draft scope and quote package. | A1/A2. |
| Billing Agent | Prepare invoice after approved milestone. | A2/A3 bounded. |

No worker has professional authority.

## Deterministic checks for MVP

The MVP may start with simple deterministic validators before full engineering engines:

```text
required input completeness
revision consistency
unit consistency
geometry bounds sanity
risk classification
required approval presence
calculation input schema validation
```

Full structural/formwork calculations must be implemented later with validated engineering logic and professional review.

## Deliverables

MVP deliverables may include:

```text
intake summary
missing information report
scope and proposal
document register
calculation input sheet
QA checklist
draft formwork design support report
professional review record
issued deliverable package
invoice
```

## Approval gates

Professional approval is required before any client-facing output that could be interpreted as engineering recommendation, engineering design, safety confirmation, compliance statement, or final deliverable.

Commercial approval is required for quotes above threshold, discounts, unusual terms, or scope exceptions.

## Out of scope for MVP

- Fully automated final formwork design.
- Professional seal/signature automation.
- Manufacturer-specific design claims without licensed data.
- Public marketplace matching.
- Multi-firm collaboration.
- Full CAD/BIM automation.
- Final structural calculations without deterministic engine validation and human professional approval.

## Acceptance criteria

The reference vertical is MVP-ready when:

1. A Firm can enable the Formwork service.
2. A client can submit a formwork enquiry.
3. Missing information is detected and requested.
4. A quote/proposal can be drafted with price build-up.
5. A project can open from accepted proposal.
6. Documents and revisions are controlled.
7. AI workers can prepare structured work package outputs.
8. QA and evidence bundle are created.
9. Human professional review is required and recorded.
10. Deliverable issue and invoice are audited.

