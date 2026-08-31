---
id: VF-05
title: "Contract & Commercial"
version: "1.0"
status: "Architecture Baseline"
source_status: "RECOVERED FROM COMBINED VF-03 TO VF-08 BASELINE"
---

# VF-05 - Contract & Commercial

VF-05 converts accepted commercial intent into controlled engagement terms. It links proposal, scope, price, obligations, liability position, payment terms, change rules, deliverables, and client acceptance.

## Scope

VF-05 owns contract templates, engagement records, scope of work, commercial terms, revision/change rules, acceptance criteria, payment milestones, risk and liability metadata, and contract approval workflow.

Legal advice is not created by AI unless governed by a legal Practice Pack and approved by an authorized legal professional where required.

## Contract chain

```text
AcceptedProposal
  -> EngagementDraft
  -> CommercialReview
  -> RiskReview
  -> ClientAcceptance
  -> ContractedEngagement
  -> ProjectOpening
```

## Core objects

```text
Engagement
Contract
StatementOfWork
CommercialTerm
PaymentMilestone
ChangeOrder
RevisionPolicy
AcceptanceCriteria
RiskDisclosure
ContractApproval
```

## Commercial invariants

Every engagement MUST reference a Firm, Client relationship, service, scope, responsible BusinessEntity or lawful contracting arrangement, price or pricing method, payment terms, acceptance criteria, and governing policy.

Contract records MUST distinguish the client-facing Firm from the platform operator, unless the engagement explicitly defines another arrangement.

## AI workforce support

Proposal Agent, Legal Operations Agent, Finance Manager Agent, Billing Agent, and Compliance Monitor Agent may prepare contract artifacts and identify missing terms. They cannot approve unusual risk, waive major protections, provide ungoverned legal advice, or bind the Firm outside policy.

## Conformance

1. No project should open without a valid engagement or documented exception.
2. Contract approvals are explicit, attributable, versioned, and audited.
3. Material changes require change-order workflow.
4. Contract data feeds VF-06 project operations and VF-07 finance.

