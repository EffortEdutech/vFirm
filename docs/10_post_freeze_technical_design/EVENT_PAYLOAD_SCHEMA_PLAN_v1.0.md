---
id: VF-EVENT-PAYLOAD-SCHEMA-PLAN
title: "vFirm Event Payload Schema Plan"
version: "1.0"
status: "Post-Freeze Technical Design"
source_status: "DERIVED FROM CANONICAL EVENT CATALOGUE V1.0"
---

# vFirm Event Payload Schema Plan v1.0

## Purpose

This plan converts canonical event names into MVP payload contracts. It keeps events small, attributable, versioned, and safe for audit/integration.

## Event envelope

Every event uses this envelope:

```json
{
  "event_id": "uuid",
  "event_type": "proposal.created",
  "event_version": "1.0",
  "occurred_at": "iso-8601",
  "recorded_at": "iso-8601",
  "actor_id": "uuid",
  "actor_type": "HUMAN|AI_AGENT|SYSTEM|EXTERNAL_SERVICE",
  "tenant_id": "uuid",
  "firm_id": "uuid|null",
  "aggregate_type": "Proposal",
  "aggregate_id": "uuid",
  "aggregate_version": 1,
  "correlation_id": "uuid",
  "causation_id": "uuid|null",
  "idempotency_key": "string|null",
  "payload": {},
  "payload_ref": "string|null",
  "payload_summary": "safe short summary",
  "policy_decision_id": "uuid|null",
  "audit_event_id": "uuid|null",
  "provenance": {}
}
```

## Payload rules

- Payloads must not contain large documents or raw confidential files.
- Use references for documents, evidence bundles, and tool traces.
- Include old and new state for state transitions.
- Include subject type/id/version for approvals.
- Include amount/currency for commercial events.
- Include worker/task/output refs for AI worker events.

## MVP event payload contracts

### `tenant.created`

```json
{
  "tenant_id": "uuid",
  "name": "string",
  "default_region": "string",
  "data_residency_policy": "string"
}
```

### `firm.application_submitted`

```json
{
  "firm_id": "uuid",
  "tenant_id": "uuid",
  "principal_person_id": "uuid",
  "business_entity_id": "uuid|null",
  "requested_practices": ["uuid"],
  "submission_status": "SUBMITTED"
}
```

### `firm.activated`

```json
{
  "firm_id": "uuid",
  "previous_state": "string",
  "new_state": "ACTIVE",
  "activated_services": ["uuid"],
  "readiness_evidence_bundle_id": "uuid|null"
}
```

### `professional.authority_granted`

```json
{
  "authority_id": "uuid",
  "professional_id": "uuid",
  "firm_id": "uuid",
  "practice_id": "uuid",
  "jurisdiction_id": "uuid|null",
  "service_scope": ["uuid"],
  "risk_limits": ["LOW", "STANDARD", "CONTROLLED"],
  "valid_from": "iso-8601",
  "valid_to": "iso-8601|null"
}
```

### `worker_instance.provisioned`

```json
{
  "worker_instance_id": "uuid",
  "worker_template_id": "uuid",
  "template_version": "string",
  "firm_id": "uuid",
  "assigned_services": ["uuid"],
  "authority_envelope_id": "uuid",
  "runtime_status": "PROVISIONED"
}
```

### `lead.created`

```json
{
  "lead_id": "uuid",
  "firm_id": "uuid",
  "client_id": "uuid|null",
  "relationship_id": "uuid|null",
  "source_channel": "string",
  "requested_service_hint": "string|null",
  "urgency": "LOW|STANDARD|URGENT|null"
}
```

### `intake.completed`

```json
{
  "intake_session_id": "uuid",
  "lead_id": "uuid",
  "service_id": "uuid",
  "provided_input_refs": ["string"],
  "missing_information_count": 0,
  "risk_class": "LOW|STANDARD|CONTROLLED|HIGH|REGULATED|CRITICAL|UNDETERMINED"
}
```

### `proposal.created`

```json
{
  "proposal_id": "uuid",
  "relationship_id": "uuid",
  "service_id": "uuid",
  "scope_draft_id": "uuid",
  "price_build_up_id": "uuid",
  "status": "DRAFT",
  "approval_required": true
}
```

### `approval.requested`

```json
{
  "approval_id": "uuid",
  "subject_type": "Proposal|DocumentVersion|Deliverable|ProjectState|Invoice|ProfessionalAuthority",
  "subject_id": "uuid",
  "subject_version_or_hash": "string",
  "requested_by_actor_id": "uuid",
  "required_approver_role": "Principal|AuthorizedProfessional|CommercialApprover",
  "required_evidence_bundle_id": "uuid|null"
}
```

### `approval.granted`

```json
{
  "approval_id": "uuid",
  "subject_type": "string",
  "subject_id": "uuid",
  "subject_version_or_hash": "string",
  "approver_actor_id": "uuid",
  "approver_professional_id": "uuid|null",
  "authority_id": "uuid|null",
  "decision": "APPROVED|APPROVED_WITH_CONDITIONS",
  "conditions": [],
  "evidence_bundle_id": "uuid|null",
  "authentication_strength": "string"
}
```

### `project.opened`

```json
{
  "project_id": "uuid",
  "engagement_id": "uuid",
  "relationship_id": "uuid",
  "service_id": "uuid",
  "project_state": "OPEN",
  "risk_class": "string",
  "responsible_professional_id": "uuid|null"
}
```

### `task.output_produced`

```json
{
  "task_id": "uuid",
  "work_package_id": "uuid|null",
  "worker_instance_id": "uuid|null",
  "output_ref": "string",
  "output_schema_ref": "string",
  "evidence_refs": ["string"],
  "quality_flags": [],
  "requires_human_review": true
}
```

### `evidence_bundle.created`

```json
{
  "evidence_bundle_id": "uuid",
  "subject_type": "string",
  "subject_id": "uuid",
  "source_document_refs": ["uuid"],
  "calculation_refs": ["string"],
  "qa_check_refs": ["uuid"],
  "bundle_hash": "string",
  "status": "READY_FOR_REVIEW"
}
```

### `deliverable.issued`

```json
{
  "document_id": "uuid",
  "document_version_id": "uuid",
  "project_id": "uuid",
  "relationship_id": "uuid",
  "approval_id": "uuid",
  "evidence_bundle_id": "uuid",
  "recipient_contact_ids": ["uuid"],
  "issue_channel": "PORTAL|EMAIL|MANUAL",
  "issued_at": "iso-8601"
}
```

### `invoice.created`

```json
{
  "invoice_id": "uuid",
  "relationship_id": "uuid",
  "engagement_id": "uuid|null",
  "project_id": "uuid|null",
  "currency": "string",
  "total_amount": 0,
  "due_at": "iso-8601",
  "status": "DRAFT"
}
```

## Versioning rule

Payloads start at `event_version = "1.0"`. Breaking payload changes require a new event version and compatibility handling.

## Implementation output

Before coding, convert these contracts into machine-readable JSON Schema or TypeScript schema definitions and add tests for required fields, tenant scope, actor attribution, and approval references.
