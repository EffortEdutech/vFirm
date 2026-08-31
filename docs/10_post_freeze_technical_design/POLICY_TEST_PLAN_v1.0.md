---
id: VF-POLICY-TEST-PLAN
title: "vFirm Policy Test Plan"
version: "1.0"
status: "Post-Freeze Technical Design"
source_status: "DERIVED FROM CANONICAL POLICY MODEL V1.0"
---

# vFirm Policy Test Plan v1.0

## Purpose

This plan defines the first executable policy test suite for vFirm. Policy tests protect tenant isolation, human professional authority, AI autonomy limits, approvals, data access, workflow state, commercial authority, and audit requirements.

## Test principles

1. Test deny cases before happy paths.
2. Every material mutation must have a policy test.
3. AI workers must fail closed outside their authority envelope.
4. Professional approval must require a human actor with valid authority.
5. Tenant isolation must be tested on every resource family.
6. Policy decisions must be persisted and auditable.

## Policy decision fixture shape

```json
{
  "actor": {
    "actor_id": "uuid",
    "actor_type": "HUMAN|AI_AGENT|SYSTEM|EXTERNAL_SERVICE",
    "tenant_id": "uuid",
    "firm_id": "uuid|null"
  },
  "action": "proposal.send",
  "resource": {
    "resource_type": "Proposal",
    "resource_id": "uuid",
    "tenant_id": "uuid",
    "firm_id": "uuid",
    "state": "APPROVED",
    "risk_class": "STANDARD"
  },
  "context": {}
}
```

## Required MVP test groups

### Tenant isolation

| Test | Expected |
|---|---|
| Actor reads same-tenant allowed resource with valid firm scope. | ALLOW |
| Actor reads other-tenant resource. | DENY |
| AI worker receives task with other-tenant input ref. | DENY |
| Client portal actor accesses unrelated relationship document. | DENY |
| System event missing tenant_id for tenant-owned resource. | DENY |

### Actor identity and role

| Test | Expected |
|---|---|
| Human Principal updates own Firm configuration. | ALLOW |
| Firm Staff updates proposal without assigned role. | DENY |
| System actor emits derived metric with valid service role. | ALLOW |
| External client actor mutates internal project state. | DENY |
| AI worker attempts to use human actor ID. | DENY |

### AI worker authority

| Test | Expected |
|---|---|
| Assigned worker starts assigned low-risk task with allowed tool. | ALLOW |
| Worker starts unassigned task. | DENY |
| Worker invokes unregistered tool. | DENY |
| Worker exceeds authority envelope action. | DENY |
| Worker produces draft output marked requires human review. | ALLOW |
| Worker attempts to approve deliverable. | DENY |
| Worker attempts to issue regulated client-facing output. | REQUIRE_APPROVAL or DENY |

### Professional authority

| Test | Expected |
|---|---|
| Authorized professional approves deliverable within scope. | ALLOW |
| Human without professional profile approves regulated deliverable. | DENY |
| Professional with expired credential approves deliverable. | DENY |
| Professional approves outside jurisdiction. | DENY or ESCALATE |
| Principal approves commercial proposal within role. | ALLOW |
| AI recommends approval. | ALLOW for recommendation only, DENY for approval action |

### Approval policy

| Test | Expected |
|---|---|
| Proposal above threshold requests approval. | REQUIRE_APPROVAL |
| Proposal below threshold with standard terms. | ALLOW |
| Deliverable ready for issue without evidence bundle. | REQUIRE_MORE_INFORMATION |
| Controlled deliverable with evidence requests professional approval. | REQUIRE_APPROVAL |
| Approved deliverable with matching subject hash is issued. | ALLOW |
| Changed document after approval is issued using old approval. | DENY |

### Workflow state

| Test | Expected |
|---|---|
| Intake STARTED to COMPLETE with missing required fields. | DENY |
| Proposal DRAFT to SENT without approval where required. | DENY |
| Proposal APPROVED to SENT. | ALLOW |
| Project OPEN to CLOSED with unresolved work packages. | DENY |
| Work package OUTPUT_READY to QA_PASSED with checklist pass. | ALLOW |
| Deliverable ISSUED to DRAFT. | DENY |

### Commercial authority

| Test | Expected |
|---|---|
| Quote below threshold and above margin floor. | ALLOW |
| Discount exceeds threshold. | REQUIRE_APPROVAL |
| Margin below floor. | REQUIRE_APPROVAL or DENY |
| Invoice created from delivered/approved work. | ALLOW |
| Invoice sent for unapproved deliverable. | DENY |
| Write-off over threshold by unauthorized actor. | DENY |

### Client communication

| Test | Expected |
|---|---|
| AI tells client project awaits professional review. | ALLOW |
| AI states engineering design is approved when no approval exists. | DENY |
| AI provides unapproved discount promise. | DENY |
| Client receives issued deliverable with approval reference. | ALLOW |
| Client sees internal QA notes not marked client-visible. | DENY |

### Evidence and audit

| Test | Expected |
|---|---|
| Approval decision missing evidence bundle for regulated deliverable. | DENY |
| Policy decision is created for material mutation. | PASS |
| Audit event is created after material mutation. | PASS |
| Audit event preserves actor, tenant, firm, correlation. | PASS |
| Event references policy decision where policy was evaluated. | PASS |

## Formwork-specific tests

| Test | Expected |
|---|---|
| Formwork intake missing structural drawings. | REQUIRE_MORE_INFORMATION |
| Formwork intake missing dimensions. | REQUIRE_MORE_INFORMATION |
| Calculation input uses inconsistent units. | DENY or REQUIRE_MORE_INFORMATION |
| Draft report marked as professional conclusion before approval. | DENY |
| Final deliverable issue without professional approval. | DENY |
| Manufacturer-specific claim without licensed source reference. | DENY |

## Test implementation recommendation

Create tests at three layers:

1. Pure policy unit tests with fixture objects.
2. API command tests verifying policy blocks mutation.
3. Event/audit tests verifying decisions are persisted and linked.

## Minimum CI gate

Before implementation is accepted, CI should run:

```text
policy tenant isolation tests
policy AI authority tests
policy professional approval tests
policy workflow transition tests
event/audit linkage tests
Formwork controlled output tests
```
