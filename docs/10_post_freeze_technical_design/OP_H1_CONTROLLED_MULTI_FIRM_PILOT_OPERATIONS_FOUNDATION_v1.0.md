---
title: "OP-H1 Controlled Multi-Firm Pilot Operations Foundation"
version: "1.0"
status: "locked-for-implementation"
date: "2026-09-03"
scope: "Controlled local/private pilot operations foundation"
---

# OP-H1 Controlled Multi-Firm Pilot Operations Foundation v1.0

## 1. Purpose

OP-H1 defines the foundation required to run controlled day-to-day pilot operations for multiple active firm workspaces inside the Virtual Firm Platform.

The foundation is intentionally operational, not marketplace-oriented. It prepares pilot operators to run, log, review, and evidence work for:

- Amanah Formwork Pilot Firm;
- NHL Global Solution.

## 2. Scope contract

OP-H1 authorizes foundation design and bounded implementation for controlled local/private pilot operation only.


OP-H1 does not authorize:

- production multi-tenant onboarding;
- public marketplace;
- live matching;
- ranking;
- capacity allocation;
- VF-24 observatory publication;
- pricing intelligence;
- autonomous award;
- autonomous regulated approval;
- live payment movement;
- uncontrolled tenant or client data sharing.

The operating loop is:

`Select Firm -> Review Today -> Triage Work -> Progress Records -> Capture Evidence -> Request/Record Human Approval -> Handle Exceptions -> Export/Audit -> Close Pilot Day`

Every OP-H1 record must be scoped by:

- `tenant_id`;
- `firm_id`;
- `pilot_day_id` where the record belongs to a specific pilot-day run;
- `actor_id` and `actor_type` for material actions;
- timestamp;
- evidence summary where applicable.

## 3. Pilot operator roles and responsibilities

### Product Owner

- Accepts, holds, or rejects sprint readiness gates.
- Decides whether limitations are acceptable.
- Does not silently authorize widened scope.

### Pilot Operator

- Selects the active firm workspace.
- Starts and closes pilot-day runs.
- Triage priorities, exceptions, and support issues.
- Records manual business decisions.
- Ensures evidence is captured before closeout.

### Virtual Principal

- Owns the firm workspace and business authority.
- Approves client-facing business actions where required.
- Confirms firm-specific service and subscription boundaries.

### Responsible Professional

- Required for regulated professional approval in the Formwork workspace.
- Must have identity, credential, jurisdiction, and evidence recorded.
- Cannot be replaced by AI-worker capability.

### AI Worker

- Performs assistive tasks inside the selected firm workspace boundary.
- Must operate within assigned module, permission, and authority envelope.
- Cannot approve regulated work, release live payment, award work autonomously, or bypass human review.

### Support / Review Board

- Reviews pilot issues, incidents, exceptions, and acceptance evidence.
- Records review outcomes with accountable human actors.

## 4. Active-firm readiness model

An active firm readiness record summarizes whether a selected firm can safely run a pilot day.

Required fields:

```json
{
  "readiness_id": "string",
  "tenant_id": "string",
  "firm_id": "string",
  "firm_name": "string",
  "firm_type": "FORMWORK_ENGINEERING | ORGANIZATION_SUPPORT | REHEARSAL",
  "subscription_code": "string",
  "readiness_status": "READY | ATTENTION_REQUIRED | BLOCKED",
  "active_modules": ["string"],
  "active_service_lines": ["string"],
  "worker_count": 0,
  "open_approval_count": 0,
  "open_exception_count": 0,
  "open_issue_count": 0,
  "blocked_reason": "string | null",
  "last_checked_at": "ISO-8601 timestamp",
  "evidence_summary": "string"
}
```

Readiness rules:

- `READY` means the firm can enter a controlled pilot-day run.
- `ATTENTION_REQUIRED` means the pilot can continue with visible issues or approvals.
- `BLOCKED` means the pilot day cannot progress until the blocker is resolved or explicitly accepted by a human authority.
- Non-subscribed modules must not be counted as active readiness capability.

## 5. Pilot-day checklist model

A pilot-day checklist records the expected operating steps for a single firm on a single pilot day.

Required fields:

```json
{
  "pilot_day_id": "string",
  "tenant_id": "string",
  "firm_id": "string",
  "pilot_date": "YYYY-MM-DD",
  "status": "PLANNED | ACTIVE | PAUSED | CLOSED | BLOCKED",
  "opened_by": "human actor id",
  "closed_by": "human actor id | null",
  "steps": [
    {
      "step_code": "string",
      "label": "string",
      "status": "PENDING | IN_PROGRESS | DONE | BLOCKED | NOT_APPLICABLE",
      "owner_actor_id": "string",
      "required_evidence": ["string"],
      "completed_at": "ISO-8601 timestamp | null"
    }
  ],
  "closeout_summary": "string | null"
}
```

Minimum checklist steps:

1. confirm active firm workspace;
2. review dashboard priorities;
3. review approvals and exceptions;
4. progress front desk or client pipeline items;
5. progress administration/document/project tasks;
6. progress sales/accounts or receivable monitoring;
7. progress firm-specific delivery activity;
8. record human approvals and manual decisions;
9. review audit/evidence/export readiness;
10. close pilot day with unresolved items classified.

## 6. Firm-scoped pilot activity log model

Pilot activity logs record material business, AI-worker, operator, and system actions during a pilot day.

Required fields:

```json
{
  "activity_id": "string",
  "tenant_id": "string",
  "firm_id": "string",
  "pilot_day_id": "string",
  "actor_id": "string",
  "actor_type": "HUMAN_OPERATOR | VIRTUAL_PRINCIPAL | RESPONSIBLE_PROFESSIONAL | AI_WORKER | SYSTEM | SUPPORT_REVIEW_BOARD",
  "activity_type": "WORKFLOW_ACTION | AI_WORKER_ACTION | HUMAN_APPROVAL | MANUAL_DECISION | ISSUE_UPDATE | EXPORT_ACTION | AUDIT_REVIEW",
  "resource_type": "string",
  "resource_id": "string",
  "state_before": "string | null",
  "state_after": "string | null",
  "evidence_summary": "string",
  "created_at": "ISO-8601 timestamp"
}
```

Activity rules:

- AI-worker actions must identify the worker instance.
- Human approvals must identify the approving human actor.
- Regulated professional approvals must identify credential, jurisdiction, and evidence bundle.
- Activity logs expose evidence summaries, not private chain-of-thought.

## 7. Issue, incident, and support log model

Pilot issues and support records track exceptions without hiding risk.

Required fields:

```json
{
  "issue_id": "string",
  "tenant_id": "string",
  "firm_id": "string",
  "pilot_day_id": "string | null",
  "issue_type": "OPERATING_ISSUE | DATA_ISSUE | APPROVAL_BLOCKER | TECHNICAL_BLOCKER | SUPPORT_REQUEST | INCIDENT | ACCEPTED_LIMITATION",
  "severity": "LOW | MEDIUM | HIGH | CRITICAL",
  "status": "OPEN | TRIAGED | ESCALATED | RESOLVED | ACCEPTED_LIMITATION | CLOSED",
  "owner_actor_id": "string",
  "description": "string",
  "resolution_summary": "string | null",
  "evidence_refs": ["string"],
  "created_at": "ISO-8601 timestamp",
  "updated_at": "ISO-8601 timestamp"
}
```

Issue rules:

- critical incidents must be escalated to a human support/review actor;
- approval blockers must not be bypassed by AI workers;
- accepted limitations must record the accepting human authority;
- cross-tenant leakage must be treated as at least `HIGH` severity.

## 8. Manual approval and exception categories

Manual approval categories:

- `CLIENT_FACING_OUTPUT_APPROVAL`;
- `PROPOSAL_SEND_APPROVAL`;
- `INVOICE_ISSUE_APPROVAL`;
- `REGULATED_TECHNICAL_APPROVAL`;
- `EXPORT_APPROVAL`;
- `PILOT_CLOSEOUT_ACCEPTANCE`.

Exception categories:

- `MISSING_EVIDENCE`;
- `MISSING_HUMAN_APPROVAL`;
- `SUBSCRIPTION_BOUNDARY`;
- `CROSS_TENANT_SCOPE_RISK`;
- `WORKER_AUTHORITY_LIMIT`;
- `DATA_QUALITY_ISSUE`;
- `INCIDENT_OR_SUPPORT_REQUIRED`.

## 9. Firm-specific operating boundaries

### Amanah Formwork Pilot Firm

- Technical Delivery may be active.
- Regulated Formwork output remains blocked until valid human professional approval exists.
- AI workers may assist with drawing, QA, evidence preparation, and issue triage only inside their authority envelopes.

### NHL Global Solution

- Organization Support services are active: project reporting, technical writing, clerical work, and BizKick EDCS.
- Technical Delivery is not a subscribed active module.
- Client-facing output requires human review before issue.
- Invoice and receivable status can be monitored, but payment movement remains manual/non-autonomous.

## 10. OP-H1 implementation expectation

OP-H1 may add fixtures, contracts, frontend/API placeholders, or static validation necessary to support later OP sprints.

OP-H1 should not yet implement the full operator dashboard, day-specific rehearsals, export closeout, or acceptance gate. Those belong to OP-H2 through OP-H6.

## 11. Next sprint handoff

After OP-H1 is complete, the next active sprint is:

`OP-H2 - Operator Dashboard and Today View`
