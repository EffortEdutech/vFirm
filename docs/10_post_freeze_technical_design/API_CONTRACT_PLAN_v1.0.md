---
id: VF-API-CONTRACT-PLAN
title: "vFirm API Contract Plan"
version: "1.0"
status: "Post-Freeze Technical Design"
source_status: "DERIVED FROM MVP TECHNICAL DESIGN AND CANONICAL EVENTS"
---

# vFirm API Contract Plan v1.0

## Purpose

This plan defines the first API surface for the MVP build. It is provider/framework neutral and should later be converted into OpenAPI, route handlers, server actions, or typed RPC contracts.

## API principles

1. APIs operate within explicit tenant and firm context.
2. Every material command evaluates policy before mutation.
3. Every mutation emits an event and audit record.
4. AI worker APIs accept bounded task input, not open-ended business authority.
5. Client-facing APIs expose only approved or permitted records.
6. APIs use idempotency keys for externally triggered material commands.

## Common request context

Every authenticated request resolves:

```text
actor_id
actor_type
tenant_id
firm_id nullable
roles/scopes
authentication_strength
correlation_id
idempotency_key nullable
```

## Common response envelope

```json
{
  "ok": true,
  "data": {},
  "events": [],
  "policy_decision_id": "uuid-or-null",
  "audit_event_id": "uuid-or-null",
  "correlation_id": "uuid"
}
```

Error response:

```json
{
  "ok": false,
  "error": {
    "code": "POLICY_DENIED",
    "message": "Human-readable safe message",
    "reasons": []
  },
  "policy_decision_id": "uuid-or-null",
  "correlation_id": "uuid"
}
```

## API groups

### Foundation API

| Method | Path | Purpose | Events |
|---|---|---|---|
| POST | `/tenants` | Create tenant. | `tenant.created` |
| POST | `/firms` | Create Firm draft/application. | `firm.application_submitted` |
| PATCH | `/firms/{firm_id}/state` | Change Firm lifecycle state. | `firm.state_changed`, `firm.activated` |
| POST | `/firms/{firm_id}/principals` | Assign Principal. | `principal.assigned` |
| POST | `/professional-profiles` | Create professional profile. | `professional.profile_created` |
| POST | `/professional-authorities` | Grant professional authority. | `professional.authority_granted` |

### Service and workforce API

| Method | Path | Purpose | Events |
|---|---|---|---|
| GET | `/service-definitions` | List platform service definitions. | none |
| POST | `/firms/{firm_id}/services` | Enable service for Firm. | `firm_service.enabled` candidate event |
| GET | `/worker-templates` | List worker templates. | none |
| POST | `/firms/{firm_id}/workforce-blueprints` | Create workforce blueprint. | `workforce_blueprint.created` |
| POST | `/firms/{firm_id}/worker-instances` | Provision worker instance. | `worker_instance.provisioned` |
| PATCH | `/worker-instances/{worker_instance_id}/activate` | Activate worker. | `worker_instance.activated` |

Candidate event `firm_service.enabled` must be added to the event catalogue before implementation if retained.

### Client and intake API

| Method | Path | Purpose | Events |
|---|---|---|---|
| POST | `/clients` | Create client. | `client.created` |
| POST | `/contacts` | Create contact. | `contact.created` |
| POST | `/firm-client-relationships` | Open relationship. | `firm_client_relationship.created` |
| POST | `/leads` | Capture enquiry. | `lead.created` |
| POST | `/intake-sessions` | Start intake. | `intake.started` |
| PATCH | `/intake-sessions/{id}/inputs` | Update intake inputs. | `intake.missing_information_detected` or none |
| POST | `/intake-sessions/{id}/complete` | Complete intake. | `intake.completed` |

### Proposal and engagement API

| Method | Path | Purpose | Events |
|---|---|---|---|
| POST | `/scope-drafts` | Create scope draft. | `scope.drafted` |
| POST | `/price-build-ups` | Create price build-up. | `price_build_up.created` |
| POST | `/proposals` | Create proposal draft. | `proposal.created` |
| POST | `/proposals/{id}/request-approval` | Request proposal approval. | `proposal.approval_requested`, `approval.requested` |
| POST | `/proposals/{id}/send` | Send approved proposal. | `proposal.sent` |
| POST | `/proposals/{id}/accept` | Record client acceptance. | `proposal.accepted`, `engagement.created` |
| POST | `/proposals/{id}/reject` | Record rejection. | `proposal.rejected` |

### Project delivery API

| Method | Path | Purpose | Events |
|---|---|---|---|
| POST | `/projects` | Open project. | `project.opened` |
| PATCH | `/projects/{id}/state` | Change project state. | `project.state_changed` |
| POST | `/work-packages` | Create work package. | `work_package.created` |
| PATCH | `/work-packages/{id}/ready-for-review` | Mark ready for review. | `work_package.ready_for_review` |
| POST | `/tasks` | Create runtime task. | `task.created` |
| POST | `/tasks/{id}/assign` | Assign task. | `task.assigned` |
| POST | `/tasks/{id}/complete` | Complete task. | `task.completed` |

### Worker runtime API

| Method | Path | Purpose | Events |
|---|---|---|---|
| POST | `/runtime/tasks/{id}/start` | Start task execution. | `task.started` |
| POST | `/runtime/tasks/{id}/outputs` | Store structured worker output. | `task.output_produced` |
| POST | `/runtime/tool-invocations` | Request tool invocation. | `tool.invocation_requested` |
| PATCH | `/runtime/tool-invocations/{id}/complete` | Complete tool invocation. | `tool.invocation_completed` |
| POST | `/runtime/tasks/{id}/escalate` | Escalate task. | `task.escalated` |

### Documents, evidence, approvals, delivery

| Method | Path | Purpose | Events |
|---|---|---|---|
| POST | `/documents` | Create document. | `document.created` |
| POST | `/documents/{id}/versions` | Create document version. | `document_version.created` |
| POST | `/evidence-bundles` | Create evidence bundle. | `evidence_bundle.created` |
| POST | `/approvals/request` | Request approval. | `approval.requested` |
| POST | `/approvals/{id}/decide` | Grant/reject approval. | `approval.granted` or `approval.rejected` |
| POST | `/deliverables/{document_version_id}/issue` | Issue approved deliverable. | `deliverable.issued` |

### Finance API

| Method | Path | Purpose | Events |
|---|---|---|---|
| POST | `/invoices` | Create invoice. | `invoice.created` |
| POST | `/invoices/{id}/send` | Send invoice. | `invoice.sent` |
| PATCH | `/payments/{id}/status` | Update payment status. | `payment.received` or `payment.failed` |

### Policy and audit API

| Method | Path | Purpose |
|---|---|---|
| POST | `/policy/evaluate` | Evaluate policy decision. |
| GET | `/audit-events` | Query audit trail by allowed scope. |
| GET | `/events` | Query event log by allowed scope. |

## MVP command contract pattern

Commands should follow this shape:

```json
{
  "command_id": "uuid",
  "idempotency_key": "string",
  "actor_context": "resolved-by-server",
  "resource": {},
  "expected_version": 1,
  "reason": "human-readable reason",
  "metadata": {}
}
```

## Approval-sensitive endpoint rules

The following must call policy before mutation:

- proposal send;
- proposal approval request;
- approval decision;
- worker task start;
- tool invocation;
- work package ready for review;
- deliverable issue;
- invoice creation/send;
- firm activation;
- professional authority grant.

## API done definition

Before coding, convert this plan into typed contracts with:

1. request schema;
2. response schema;
3. policy checks;
4. emitted events;
5. audit event requirement;
6. idempotency behavior;
7. authorization scope.
