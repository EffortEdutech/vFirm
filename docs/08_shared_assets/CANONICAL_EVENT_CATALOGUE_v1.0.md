---
id: VF-EVENTS
title: "Canonical Event Catalogue"
version: "1.0"
status: "Architecture Baseline"
source_status: "DEFINED FOR DEVELOPMENT READINESS"
---

# Canonical Event Catalogue v1.0

## Purpose

This catalogue defines the baseline event language for vFirm. Events connect business modules, workforce runtime, policies, audit, and future analytics.

## Event principles

1. Events describe facts that happened, not commands we hope will happen.
2. Every material event must be tenant-scoped and attributable.
3. Events must preserve correlation and causation.
4. Events must carry schema versions.
5. Events should not contain large private payloads when a governed reference is safer.
6. Regulated approvals and final deliverables must be explicit events.

## Event envelope

```text
event_id
event_type
event_version
occurred_at
recorded_at
actor_id
actor_type
tenant_id
firm_id nullable
aggregate_type
aggregate_id
aggregate_version nullable
correlation_id
causation_id nullable
idempotency_key nullable
payload_ref nullable
payload_summary
policy_decision_id nullable
audit_event_id nullable
provenance
```

## Naming convention

Use lowercase dot notation:

```text
aggregate.action_past_tense
```

Examples:

```text
firm.activated
proposal.sent
approval.granted
invoice.created
```

## Foundation events

| Event | Meaning |
|---|---|
| `tenant.created` | Tenant isolation boundary created. |
| `firm.application_submitted` | Firm application started. |
| `firm.state_changed` | Firm lifecycle state changed. |
| `firm.activated` | Firm is operational for approved scope. |
| `firm.suspended` | Firm operations restricted. |
| `firm.retired` | Firm retired from new work. |
| `principal.assigned` | Human Principal assigned to Firm. |
| `professional.profile_created` | Professional profile created. |
| `professional.authority_granted` | Authority grant became active. |
| `professional.authority_suspended` | Authority grant suspended. |
| `professional.authority_revoked` | Authority grant revoked. |

## Workforce and runtime events

| Event | Meaning |
|---|---|
| `workforce_blueprint.created` | Workforce plan created for Firm. |
| `worker_instance.provisioned` | Worker instance provisioned. |
| `worker_instance.activated` | Worker allowed to execute tasks. |
| `task.created` | Runtime task created. |
| `task.assigned` | Task assigned to human or worker. |
| `task.started` | Execution started. |
| `task.output_produced` | Worker produced structured output. |
| `task.validation_failed` | Runtime validation failed. |
| `task.completed` | Task completed. |
| `task.escalated` | Task escalated to another actor. |
| `tool.invocation_requested` | Worker requested tool use. |
| `tool.invocation_completed` | Tool returned result. |

## Client and CRM events

| Event | Meaning |
|---|---|
| `client.created` | Client record created. |
| `contact.created` | Client contact created. |
| `firm_client_relationship.created` | Relationship opened. |
| `firm_client_relationship.activated` | Relationship became active. |
| `lead.created` | Lead captured. |
| `lead.qualified` | Lead qualified. |
| `lead.disqualified` | Lead disqualified with reason. |
| `client.communication_recorded` | Communication recorded. |

## Intake and proposal events

| Event | Meaning |
|---|---|
| `intake.started` | Intake session started. |
| `intake.missing_information_detected` | Required data missing. |
| `intake.completed` | Intake enough to proceed. |
| `scope.drafted` | Scope draft created. |
| `quote.created` | Quote object created. |
| `price_build_up.created` | Price build-up calculated. |
| `proposal.created` | Proposal draft created. |
| `proposal.approval_requested` | Proposal requires approval. |
| `proposal.approved` | Proposal approved for issue. |
| `proposal.sent` | Proposal sent to client. |
| `proposal.accepted` | Client accepted proposal. |
| `proposal.rejected` | Client rejected proposal. |

## Contract and project events

| Event | Meaning |
|---|---|
| `engagement.created` | Engagement created from accepted work. |
| `contract.generated` | Contract artifact generated. |
| `contract.accepted` | Contract accepted. |
| `change_order.created` | Change order created. |
| `project.opened` | Project opened. |
| `project.state_changed` | Project state changed. |
| `milestone.created` | Milestone created. |
| `work_package.created` | Work package created. |
| `work_package.ready_for_review` | Work package ready for review. |
| `work_package.accepted` | Work package accepted internally. |
| `project.closed` | Project closed. |

## Document and delivery events

| Event | Meaning |
|---|---|
| `document.created` | Document record created. |
| `document_version.created` | New version uploaded/generated. |
| `document_version.superseded` | Version superseded. |
| `submission_package.created` | Package assembled for issue. |
| `deliverable.ready_for_approval` | Deliverable ready for professional approval. |
| `deliverable.issued` | Deliverable issued to client. |
| `client_document.requested` | Client asked to provide document. |
| `client_document.received` | Client document received. |

## Approval and governance events

| Event | Meaning |
|---|---|
| `approval.requested` | Approval requested. |
| `approval.granted` | Explicit approval granted. |
| `approval.rejected` | Approval rejected. |
| `approval.conditions_added` | Approval includes conditions. |
| `evidence_bundle.created` | Evidence bundle created. |
| `policy.evaluated` | Policy decision produced. |
| `compliance_check.completed` | Compliance check completed. |
| `non_conformance.created` | NCR opened. |
| `incident.created` | Incident opened. |

## Finance events

| Event | Meaning |
|---|---|
| `invoice.created` | Invoice created. |
| `invoice.sent` | Invoice sent to client. |
| `invoice.overdue` | Invoice overdue. |
| `payment.received` | Payment received. |
| `payment.failed` | Payment failed. |
| `payout.calculated` | Payout calculated. |
| `payout.released` | Payout released. |
| `expense.recorded` | Expense recorded. |
| `margin.calculated` | Project/service margin calculated. |

## Intelligence and marketplace events

| Event | Meaning |
|---|---|
| `metric.snapshot_recorded` | Metric snapshot stored. |
| `signal.detected` | Signal detected. |
| `recommendation.created` | Recommendation created. |
| `decision.recorded` | Human decision recorded. |
| `match.requested` | Marketplace match requested. |
| `match.candidate_found` | Candidate found. |
| `specialist_assignment.created` | Specialist assignment created. |
| `capacity_offer.created` | Capacity offer created. |

## Required event payload fields by category

Foundation events must include lifecycle state and reason where applicable.

Task events must include task state, worker/human assignment, risk class, and output/evidence refs when applicable.

Approval events must include subject, subject version/hash, approver actor, authority reference where applicable, decision, evidence bundle, and authentication strength.

Deliverable issue events must include document version, approval reference where required, recipient, and issue channel.

Finance events must include currency, amount, invoice/payment refs, and status.

## Build rule

Do not create new event names casually. Add them here first, define their payload contract, and map them to an owning module.

