---
id: VF-09-15-EXPANSION
title: "VF-09 to VF-15 Development Expansion Pack"
version: "1.0"
status: "Architecture Baseline"
source_status: "EXPANDED FROM RECOVERED DISCUSSION AND EXISTING BASELINE"
---

# VF-09 to VF-15 Development Expansion Pack

## Purpose

This document strengthens VF-09 through VF-15 for development use. The original files remain valid baseline summaries; this expansion adds implementation boundaries, required objects, workflows, controls, and first-build priorities.

## Shared rule for VF-09 to VF-15

These modules must preserve the core vFirm doctrine:

```text
Client buys from the Virtual Firm.
AI works inside bounded workflows.
Human professional authority remains human only.
Every material action is tenant-scoped, attributable, policy-checked, and auditable.
```

---

# VF-09 - Virtual Workforce Runtime Expansion

## Development mission

VF-09 is the execution machinery for AI workers. It turns events into controlled tasks, assigns those tasks to worker instances, grants only the necessary context/tools, validates the output, escalates when needed, records audit, and emits the next event.

## Runtime boundary

VF-09 owns:

- event intake and task creation;
- task queue and assignment;
- worker execution sessions;
- context loading;
- tool invocation orchestration;
- approval request handoff;
- escalation;
- audit traces;
- runtime cost records;
- worker execution status.

VF-09 does not own CRM rules, pricing rules, contract rules, project domain rules, credential verification, or professional authority grants.

## Required runtime objects

```text
Event
Task
TaskAttempt
WorkerInstanceRuntime
ExecutionContext
ToolInvocation
ToolResult
RuntimeValidation
Escalation
ApprovalRequest
AuditEvent
CostRecord
WorkerMessage
```

## Task state machine

```text
CREATED -> QUEUED -> ASSIGNED -> RUNNING -> VALIDATING -> COMPLETED
```

Exceptional states:

```text
WAITING_FOR_INPUT
WAITING_FOR_APPROVAL
ESCALATED
BLOCKED
FAILED
CANCELLED
EXPIRED
```

Every transition must be deterministic and audit-backed.

## Execution contract

Each execution receives a typed input envelope:

```text
task_id
tenant_id
firm_id
worker_instance_id
actor_context
resource_context
allowed_data_refs
allowed_tools
authority_envelope
risk_class
budget_limit
time_limit
output_schema
escalation_rules
```

Each execution returns:

```text
status
structured_output
evidence_refs
tool_invocations
validation_result
policy_result
next_event_request
audit_summary
cost_record
```

## First-build priority

Build a small runtime first: event -> task -> worker execution -> validation -> approval request -> audit. Do not build a swarm. Do not build open-ended agent chat as the runtime.

---

# VF-10 - Control Plane Expansion

## Development mission

VF-10 provisions and controls the platform resources that make each Firm operational. It is the administrative and infrastructure brain of the platform, separate from worker execution.

## Control-plane boundary

VF-10 owns:

- tenant provisioning;
- Firm provisioning;
- environment and resource allocation;
- identity provider configuration;
- model gateway configuration;
- tool and integration gateway;
- secrets references;
- object storage configuration;
- workflow infrastructure configuration;
- observability and metering;
- backup and disaster recovery posture;
- platform administration.

## Required control objects

```text
TenantProvisioningPlan
FirmProvisioningPlan
FirmBlueprint
ResourceAllocation
ModelRoute
ToolConnection
SecretReference
StorageBucketPolicy
IntegrationConnection
UsageMeter
PlatformSubscription
NotificationRoute
OperationalHealth
```

## Provisioning flow

```text
FirmBlueprint approved
  -> tenant resources allocated
  -> identity scopes created
  -> storage boundaries created
  -> workflow queues/topics created
  -> default tools connected
  -> workforce runtime registered
  -> policies attached
  -> observability enabled
  -> readiness test started
```

## First-build priority

Implement a single-tenant-development mode with tenant boundaries preserved in data. Do not skip tenant_id just because the first version has one customer.

---

# VF-11 - Governance, Compliance & Trust Expansion

## Development mission

VF-11 makes professional authority and compliance machine-readable. It tells the rest of the platform when work is regulated, who can approve it, what evidence is required, and what must be blocked or escalated.

## Governance boundary

VF-11 owns:

- governance requirements;
- professional authority rules;
- scope-of-practice checks;
- jurisdiction rule references;
- evidence requirements;
- approval requirements;
- compliance review workflows;
- quality system requirements;
- incident and non-conformance workflows.

VF-17 owns security enforcement and identity trust mechanics. VF-18 owns AI safety and autonomy controls.

## Required governance objects

```text
GovernancePack
JurisdictionRuleSet
PracticeRuleSet
ServiceRiskProfile
AuthorityRequirement
EvidenceRequirement
ApprovalRequirement
ComplianceCheck
QualityCheck
Incident
NonConformance
DisputeRecord
TrustProfile
```

## Regulated-work gate

```text
service classified
  -> jurisdiction identified
  -> required credentials loaded
  -> professional authority checked
  -> insurance/engagement constraints checked
  -> evidence requirements attached
  -> approval workflow created
  -> final issue blocked until approval passes
```

## First-build priority

Implement classification, evidence requirement, and approval requirement first. Full regulatory reporting can come later.

---

# VF-12 - Commercial & Economic Engine Expansion

## Development mission

VF-12 ensures the Firm and platform can price, bill, collect, pay, and understand profitability.

## Commercial boundary

VF-12 owns:

- service SKU economics;
- price build-up;
- cost profiles;
- quotation calculation;
- discount authority;
- milestone billing rules;
- platform fee logic;
- payout logic;
- contribution margin;
- commercial dashboards.

VF-07 owns finance/accounting operational records. VF-12 owns economic logic and pricing intelligence.

## Required commercial objects

```text
ServiceSKU
PriceBook
PriceBuildUp
CostProfile
Quote
QuoteLine
DiscountRule
CommercialApproval
BillingMilestone
RevenueSplit
PlatformFee
SpecialistPayout
MarginReport
```

## Price build-up

```text
scope
  -> service SKU
  -> work breakdown
  -> human effort
  -> AI/runtime cost
  -> tool/software cost
  -> specialist cost
  -> risk contingency
  -> platform fee
  -> margin target
  -> price
  -> approval threshold
```

## First-build priority

Start with transparent quote build-up and approval thresholds. Do not hide economics inside free-text proposal generation.

---

# VF-13 - Firm Intelligence & Decision Engine Expansion

## Development mission

VF-13 gives one Principal an executive cockpit and decision-support layer. It helps the Firm understand operations, risks, clients, finance, capacity, and next actions.

## Intelligence boundary

VF-13 owns:

- firm-level metrics;
- signals;
- alerts;
- recommendations;
- scenarios;
- decision memory;
- operational briefings;
- executive cockpit.

VF-24 owns ecosystem benchmarking and global market observatory intelligence.

## Required intelligence objects

```text
MetricDefinition
MetricSnapshot
Signal
Alert
Insight
Recommendation
Scenario
DecisionRecord
ActionPlan
OutcomeRecord
ExecutiveBrief
```

## Recommendation contract

A recommendation must include:

```text
problem
supporting signals
evidence refs
options
expected impact
risk
required authority
action proposal
human decision
outcome tracking
```

## First-build priority

Build daily brief and approval/action queue intelligence first. Avoid a single autonomous CEO agent.

---

# VF-14 - Marketplace & Network Engine Expansion

## Development mission

VF-14 connects clients, Firms, professionals, specialists, and capacity without turning vFirm into a low-trust gig marketplace.

## Marketplace boundary

VF-14 owns:

- Firm directory;
- service discovery;
- capability graph;
- matching;
- specialist assignments;
- collaboration requests;
- network trust signals;
- capacity offers;
- marketplace governance.

VF-23 owns capacity economy analytics. VF-22 owns federation/collaboration infrastructure.

## Required marketplace objects

```text
FirmProfile
ProfessionalListing
CapabilityProfile
ServiceListing
ProjectRequest
MatchRequest
MatchCandidate
MatchDecision
SpecialistAssignment
CollaborationAgreement
CapacityOffer
ReputationSignal
ConflictCheck
```

## Matching hierarchy

Match by:

```text
eligibility
  -> credential/jurisdiction fit
  -> service capability
  -> capacity
  -> conflict status
  -> quality/trust
  -> price
  -> availability
```

Price must never outrank eligibility for controlled or regulated work.

## First-build priority

Start with a private trusted specialist network for the first reference vertical. Do not build a public open marketplace first.

---

# VF-15 - Client Experience & Relationship Engine Expansion

## Development mission

VF-15 makes the Virtual Firm feel like a real professional firm: always reachable, structured, trustworthy, and coherent across channels.

## Client-experience boundary

VF-15 owns:

- digital front desk;
- omnichannel conversation context;
- client portal experience;
- client-facing project status;
- document exchange UX;
- proposal presentation;
- billing/payment presentation;
- client notifications;
- relationship health;
- white-label experience.

VF-03 owns CRM system-of-record. VF-04 owns intake/proposal workflows. VF-08 owns document records and portal access controls.

## Required client-experience objects

```text
ClientSession
ChannelConversation
PortalUser
ClientActionItem
ClientStatusView
DocumentRequest
PortalMessage
ProposalView
InvoiceView
ClientNotification
FeedbackRecord
RelationshipHealthSignal
```

## Client status rule

Client-facing status must come from authoritative system records. AI may explain status, but cannot invent status, promises, technical conclusions, delivery dates, or commercial commitments.

## First-build priority

Build the client enquiry, missing information, project status, document exchange, and invoice views first. Keep the first experience operational, not marketing-heavy.

---

# Cross-module build sequence

1. VF-10 provisions Firm resources.
2. VF-02 provisions workforce blueprint.
3. VF-15 receives client enquiry.
4. VF-03 records client relationship.
5. VF-04 structures intake and proposal.
6. VF-12 prices and checks commercial authority.
7. VF-05/VF-06 open engagement and project.
8. VF-09 executes bounded worker tasks.
9. VF-11/VF-17/VF-18 enforce governance and trust.
10. VF-13 presents operational intelligence.
11. VF-14 remains private-network only until the first Firm loop is proven.

## Baseline decision

VF-09 through VF-15 are strengthened for implementation planning by this expansion pack. The original module files remain compact canonical summaries; this document provides the development detail until each module is rewritten as a full standalone specification.

