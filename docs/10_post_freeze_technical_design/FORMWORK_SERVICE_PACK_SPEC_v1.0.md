---
id: VF-FORMWORK-SERVICE-PACK-SPEC
title: "VF-SP-001 Formwork Engineering Service Pack Specification"
version: "1.0"
status: "Post-Freeze Technical Design"
source_status: "DERIVED FROM FORMWORK REFERENCE BACKLOG V1.0"
---

# VF-SP-001 Formwork Engineering Service Pack Specification v1.0

## Purpose

This specification converts the Formwork Engineering reference backlog into an MVP service pack that can be configured, tested, and implemented without changing the vFirm foundation architecture.

## Service pack identity

```text
service_pack_id: VF-SP-001
name: Formwork Engineering / Temporary Works
mvp_service: Formwork Design Support - Preliminary Wall/Slab Package
risk_profile: CONTROLLED by default, REGULATED where jurisdiction/client scope requires
professional_authority_required: true for final/client-facing technical deliverables
```

## MVP service definition

The MVP service helps a professional formwork or temporary works engineer manage preliminary formwork design support work.

It includes:

- structured enquiry intake;
- document requirement checking;
- missing information detection;
- scope and proposal drafting;
- document register setup;
- geometry/input preparation;
- deterministic validation placeholders;
- QA checklist;
- evidence bundle;
- professional approval;
- deliverable issue;
- invoice record.

It does not include fully automated final engineering design.

## Intake schema

Required fields:

```text
project_name
site_location
client_organization
client_contact_name
client_contact_email
structure_type
formwork_element_type
height
length_or_area
concrete_grade
pour_height
pour_rate nullable
available_drawings
required_standard_or_submission_basis nullable
manufacturer_or_system_preference nullable
deadline
required_deliverables
approval_or_submission_authority nullable
special_site_constraints nullable
```

Allowed `formwork_element_type` values:

```text
wall
slab
column
beam
core
stair
foundation
other
```

## Required document checklist

| Document | Required for MVP | Notes |
|---|---|---|
| Structural drawings | Yes | Latest available revision. |
| Architectural drawings | Conditional | Required when geometry/coordination depends on them. |
| Revision register | Yes | May be generated from uploaded docs if absent. |
| Client scope/Purchase request | Conditional | Required if commercial basis unclear. |
| Site constraints/photos | Conditional | Required where access/temporary works constraints affect design. |
| Manufacturer system data | Conditional | Must include source/provenance/licensing reference. |
| Method statement requirements | Conditional | Required if client asks for method-linked output. |

## Workflow

```text
lead.created
  -> intake.started
  -> intake.missing_information_detected when incomplete
  -> intake.completed
  -> scope.drafted
  -> price_build_up.created
  -> proposal.created
  -> approval.requested where required
  -> approval.granted
  -> proposal.sent
  -> proposal.accepted
  -> engagement.created
  -> project.opened
  -> document.created / document_version.created
  -> work_package.created
  -> task.created / task.assigned / task.output_produced
  -> evidence_bundle.created
  -> deliverable.ready_for_approval
  -> approval.requested
  -> approval.granted
  -> deliverable.issued
  -> invoice.created
```

## MVP worker configuration

| Worker | Template responsibility | Allowed outputs | Forbidden outputs |
|---|---|---|---|
| Receptionist Agent | Capture enquiry and route. | Lead draft, contact summary. | Technical advice, quote approval. |
| Formwork Intake Agent | Structure requirements. | Intake fields, missing info list. | Final service fit decision. |
| Document Controller Agent | Maintain document register. | Revision register, missing doc flags. | Approve drawings. |
| Geometry Agent | Extract/prepare dimensions. | Structured geometry inputs. | Engineering adequacy statement. |
| Calculation Preparation Agent | Prepare deterministic input set. | Calculation input sheet. | Final calculation result unless deterministic engine validates. |
| QA Agent | Run checklist. | QA findings, inconsistencies. | Professional approval. |
| Proposal Agent | Draft scope/quote content. | Proposal draft. | Send proposal without approval. |
| Billing Agent | Prepare invoice draft. | Invoice draft/status. | Payment confirmation without provider/source record. |

## Deterministic validators for MVP

Implement validators before real engineering calculation engines:

```text
required field completeness
required document completeness
revision consistency
unit consistency
geometry positive-value checks
height/dimension sanity ranges
risk classification completeness
approval presence before issue
manufacturer source/provenance presence
calculation input schema validity
```

## Output templates

MVP output templates:

1. Formwork intake summary.
2. Missing information request.
3. Scope and proposal draft.
4. Document register.
5. Calculation input sheet.
6. QA checklist.
7. Draft formwork design support report.
8. Professional review record.
9. Issued deliverable package metadata.
10. Invoice draft.

## Approval gates

Professional approval is required before issuing any output that may be interpreted as:

- engineering recommendation;
- formwork design advice;
- safety confirmation;
- compliance statement;
- final deliverable;
- submission-ready document.

Commercial approval is required when:

- quote exceeds threshold;
- discount exceeds threshold;
- scope exception is included;
- payment terms depart from template;
- deliverable responsibility is unusual.

## Evidence bundle requirements

For Formwork MVP, the evidence bundle should include:

```text
client enquiry/intake summary
source drawing/document references
revision register
missing information resolution record
calculation input sheet
validator results
QA checklist
AI worker output refs
professional review notes
approval decision
final issued document hash/version
```

## Service pack seed data

Seed records:

```text
Practice: Temporary Works / Formwork Engineering
ServiceDefinition: Formwork Design Support
ServiceSKU: Preliminary Wall/Slab Package
Required worker templates: Receptionist, Intake, Document Controller, Geometry, Calculation Preparation, QA, Proposal, Billing
Required policies: ProfessionalApprovalPolicy, EvidencePolicy, ClientCommunicationPolicy, CommercialAuthorityPolicy
Required validators: formwork_intake_completeness, document_revision_consistency, formwork_input_schema_validity
```

## Acceptance tests

The service pack is MVP-ready when:

1. A Firm can enable the service.
2. A client enquiry creates Formwork intake.
3. Missing required drawings/dimensions are detected.
4. Proposal draft requires approval when threshold applies.
5. Accepted proposal opens project and work package.
6. AI workers produce only structured draft outputs.
7. QA checklist blocks incomplete deliverable.
8. Evidence bundle is assembled.
9. Human professional approval is required and recorded.
10. Deliverable issue and invoice create audit events.

## Out of scope

- Final automated formwork engineering design.
- Professional seal automation.
- CAD/BIM automation.
- Manufacturer-specific engineering claims without governed source data.
- Public marketplace matching.
- Multi-firm collaboration.
