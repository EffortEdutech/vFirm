---
id: VF-16-24-EXPANSION
title: "VF-16 to VF-24 Development Expansion Pack"
version: "1.0"
status: "Architecture Baseline"
source_status: "EXPANDED FROM VF-16 TO VF-24 BASELINE REVIEW"
---

# VF-16 to VF-24 Development Expansion Pack

## Purpose

This document strengthens VF-16 through VF-24 for development readiness. The original module files remain valid architecture summaries; this expansion defines implementation boundaries, required objects, lifecycle flows, controls, and first-build priorities.

## Shared rule for VF-16 to VF-24

These modules are powerful because they compound platform learning, productization, network effects, and intelligence. They must never weaken the earlier foundation:

```text
Tenant isolation remains mandatory.
Client confidential data remains protected.
AI autonomy never becomes professional authority.
Marketplace/network intelligence never exposes private Firm or Client information.
Global intelligence depends on trusted operational records, not scraped guesses.
```

---

# VF-16 - Data, Knowledge & Memory Expansion

## Development mission

VF-16 is the memory and knowledge infrastructure of each Virtual Firm and the platform. It stores authoritative business records, document metadata, knowledge objects, retrieval indexes, graph relationships, evidence, decisions, and lessons learned.

## Module boundary

VF-16 owns:

- data registry;
- document metadata integration;
- object references;
- knowledge records;
- memory classes;
- context assembly;
- provenance;
- retention and legal hold;
- knowledge promotion;
- export and deletion workflows;
- memory audit.

VF-16 does not own authentication, authorization enforcement, service delivery workflow, or professional approval. It provides the data and memory substrate those modules use.

## Required objects

```text
DataRecordRef
ObjectRef
KnowledgeItem
KnowledgeSource
KnowledgeAuthorityRank
MemoryItem
ContextBundle
ProvenanceRecord
RetentionRule
LegalHold
KnowledgePromotionRequest
LessonLearned
DecisionMemoryRecord
DataExportRequest
DeletionRequest
MemoryAuditRecord
```

## Context bundle contract

Every AI task should receive a bounded `ContextBundle`:

```text
context_bundle_id
tenant_id
firm_id
project_id nullable
client_id nullable
task_id
included_record_refs
included_document_refs
included_knowledge_refs
excluded_reason_refs
classification
policy_decision_id
assembled_at
expires_at
```

The bundle must be minimal, relevant, and policy-approved.

## Knowledge promotion state

```text
CANDIDATE -> REVIEW_REQUIRED -> APPROVED -> ACTIVE_KNOWLEDGE
```

Exceptional states:

```text
REJECTED
ARCHIVED
EXPIRED
RESTRICTED
LEGAL_HOLD
```

No AI may promote project experience into reusable Firm or platform knowledge without policy and human review where confidentiality or professional judgment is involved.

## First-build priority

Build document metadata, evidence references, context bundles, provenance, and retention class before building advanced knowledge graph or long-term AI memory.

---

# VF-19 - Service Delivery & Professional Practice Expansion

## Development mission

VF-19 turns an accepted engagement into controlled professional service delivery. It defines the common kernel for service lifecycles and lets Practice Packs configure specialist workflows.

## Module boundary

VF-19 owns:

- service lifecycle state;
- service definition requirements;
- scope, assumptions, dependencies;
- work packages;
- quality gates;
- professional review gates;
- deliverable management;
- acceptance and closeout;
- lessons learned handoff.

It consumes clients/contracts/projects from VF-03 to VF-06, workers from VF-02/VF-09, governance from VF-11/VF-17/VF-18, pricing from VF-12, and documents/memory from VF-08/VF-16.

## Required objects

```text
ServiceLifecycle
ServiceDefinition
ScopeOfWork
AssumptionRegister
DependencyRegister
WorkBreakdownStructure
WorkPackage
QualityGate
ReviewPackage
Deliverable
AcceptanceRecord
ChangeRequest
ServiceCloseout
LessonCapture
```

## Delivery state machine

```text
DISCOVER -> QUALIFY -> SCOPE -> PROPOSE -> CONTRACT -> PLAN -> EXECUTE -> REVIEW -> APPROVE -> DELIVER -> ACCEPT -> BILL -> CLOSE -> LEARN
```

Implementation may map these to project/work-package states, but the semantic lifecycle must remain traceable.

## Quality gate rule

No deliverable proceeds to professional review unless required inputs, scope, assumptions, document versions, QA checks, and evidence requirements are complete or explicitly waived by authorized policy.

## First-build priority

Build scope, assumptions, dependency register, work package, QA checklist, review package, evidence bundle, and deliverable issue for the Formwork MVP.

---

# VF-20 - Productization, Service Pack & Industry Expansion Expansion

## Development mission

VF-20 packages professional services into repeatable, configurable products that can be sold, provisioned, delivered, measured, improved, and eventually published across the network.

## Module boundary

VF-20 owns:

- service product canvas;
- ServiceSKU registry;
- Practice Pack definition;
- Service Delivery Pack definition;
- service tiers and bundles;
- service dependencies;
- pack versioning;
- pack certification;
- service retirement.

It does not execute services; VF-19 executes delivery and VF-09 executes tasks.

## Required objects

```text
PracticePack
ServiceDeliveryPack
ServiceProductCanvas
ServiceSKU
ServiceTier
ServiceBundle
ServiceDependency
ServicePackVersion
ServicePackCertification
ServiceEligibilityRule
ServiceRetirementPlan
```

## Service pack minimum contract

Every Service Delivery Pack must define:

```text
service_id
service_sku_ids
intake_schema
required_documents
workflow_steps
work_package_templates
worker_requirements
tool_requirements
knowledge_requirements
quality_gates
approval_requirements
pricing_template
sla_template
deliverable_templates
change_policy
acceptance_criteria
risk_class
```

## Pack lifecycle

```text
DRAFT -> REVIEW -> APPROVED -> PILOT -> ACTIVE -> DEPRECATED -> RETIRED
```

## First-build priority

Create one Formwork Service Delivery Pack spec before adding broad industry pack marketplace features.

---

# VF-21 - Onboarding, Certification & Firm Launch Expansion

## Development mission

VF-21 is the Firm Factory. It converts a verified person into an operational Firm with services, workforce, tools, governance, readiness evidence, and launch status.

## Module boundary

VF-21 owns:

- onboarding workflow;
- readiness tests;
- FirmBlueprint assembly;
- launch gates;
- certification status;
- suspension/reactivation/retirement orchestration.

It consumes identity and authority from VF-01/VF-17, workforce from VF-02, provisioning from VF-10, governance from VF-11/VF-18, and services from VF-20.

## Required objects

```text
FirmApplication
OnboardingChecklist
FirmBlueprint
ReadinessTest
ReadinessTestResult
CertificationRecord
LaunchGate
LaunchDecision
SuspensionRecord
ReactivationPlan
RetirementPlan
```

## Launch gate checklist

A Firm may become active only when:

```text
identity verified
human Principal active
business entity/contracting model configured
practice eligibility approved
service eligibility approved
workforce blueprint ready
policy set attached
tool/licence status acceptable
client portal configured
approval/escalation tested
audit/event pipeline tested
readiness test passed
```

## Certification warning

Platform certification is readiness certification only. It must not be represented as a professional licence, government approval, or regulatory credential.

## First-build priority

Build one deterministic onboarding path for a single professional launching the Formwork reference Firm.

---

# VF-22 - Network, Collaboration & Enterprise Federation Expansion

## Development mission

VF-22 lets Firms and professionals collaborate without leaking data, blurring responsibility, or hiding authority. It is the collaboration and federation layer, not the open marketplace itself.

## Module boundary

VF-22 owns:

- capability registry;
- collaboration request/offer lifecycle;
- project data room;
- cross-firm permissions;
- conflict checks;
- collaboration agreements;
- federation audit.

VF-14 owns marketplace discovery and matching. VF-12 owns commercial calculation/settlement rules. VF-17 owns security enforcement.

## Required objects

```text
CapabilityProfile
CollaborationRequest
CollaborationOffer
CollaborationAgreement
ProjectDataRoom
DataRoomAccessGrant
ConflictCheck
ResponsibilityMatrix
FederationAuditEvent
EnterpriseFederation
ApprovedSupplierNetwork
```

## Collaboration lifecycle

```text
DISCOVER -> REQUEST -> OFFER -> ACCEPT -> CONTRACT -> PROVISION_DATA_ROOM -> EXECUTE -> REVIEW -> DELIVER -> ACCEPT -> SETTLE -> CLOSE
```

## Responsibility rule

Every collaborative deliverable must record who prepared, reviewed, approved, issued, and accepted each material part.

## First-build priority

Defer VF-22 from MVP except for future-proofing `CapabilityProfile`, `ResponsibilityMatrix`, and specialist assignment references.

---

# VF-23 - Capacity, Supply-Demand & Workforce Economy Expansion

## Development mission

VF-23 measures verified professional capability, demand, availability, capacity gaps, and economic signals. It helps the platform grow capacity intelligently.

## Module boundary

VF-23 owns:

- demand signal registry;
- effective capacity calculation;
- capacity gap classification;
- price band intelligence inputs;
- shortage/surplus signals;
- capacity activation triggers;
- workforce economy analytics.

VF-12 executes pricing. VF-14/VF-22 route marketplace and collaboration. VF-24 performs broader observatory intelligence.

## Required objects

```text
DemandSignal
DemandScore
CapacityProfile
AvailabilityWindow
EffectiveCapacitySnapshot
CapacityGap
MarketState
CapacityActivationTrigger
PriceBandSignal
CapabilityOpportunity
ReservedCapacityBlock
```

## Demand signal hierarchy

```text
PAID_PROJECT
ACCEPTED_PROPOSAL
QUALIFIED_CLIENT_REQUEST
ENTERPRISE_PROCUREMENT_REQUEST
REPEATED_MARKETPLACE_SEARCH
CAPABILITY_ENQUIRY
LAWFUL_EXTERNAL_MARKET_SIGNAL
```

Paid/accepted demand outranks curiosity/search signals.

## Capacity rule

Capacity is not headcount. Capacity must include qualification, jurisdiction, availability, workload, reliability, and professional review constraints.

## First-build priority

Defer global capacity economy. Capture demand/capacity data in MVP events so VF-23 can be built later without retrofitting records.

---

# VF-24 - Global Intelligence, Benchmarking & Market Observatory Expansion

## Development mission

VF-24 converts aggregated, privacy-protected operational data into ecosystem intelligence, benchmarks, market observatory views, and strategic insights.

## Module boundary

VF-24 owns:

- aggregation;
- anonymization;
- benchmark cohort definitions;
- market observatory metrics;
- trend detection;
- opportunity signals;
- digital twin scenario models;
- insight provenance/confidence.

VF-13 owns individual Firm intelligence. VF-24 must not expose confidential Firm/client data.

## Required objects

```text
ObservatoryDataset
BenchmarkCohort
BenchmarkMetric
BenchmarkResult
AnonymizationRule
PrivacyThreshold
MarketIndicator
TrendSignal
OpportunitySignal
InsightConfidence
DigitalTwinScenario
StrategicInsight
```

## Benchmark privacy rule

No benchmark should be shown unless cohort size, anonymization, aggregation, and confidentiality rules pass policy. Avoid naming competitors unless data is public/lawful and explicitly permitted.

## Productivity rule

AI productivity must be quality-adjusted. Measure speed, human review effort, revision rate, error rate, cost, acceptance, and client satisfaction. Raw AI completion speed alone is not productivity.

## First-build priority

Do not build VF-24 in MVP. Capture clean events, metrics, and evidence now so future observatory intelligence is trustworthy.

---

# Cross-module late-stage sequence

```text
VF-16 records trusted memory and evidence.
VF-19 delivers services using that evidence.
VF-20 packages repeatable services.
VF-21 launches Firms with selected services and workers.
VF-22 later federates collaboration.
VF-23 later analyzes capacity economy.
VF-24 later benchmarks and observes the ecosystem.
```

## Baseline decision

VF-16 through VF-24 are accepted as baseline modules with this expansion pack providing development-readiness detail. Full implementation should initially use VF-16, VF-19, VF-20, and VF-21 for the first operating loop, while VF-22 through VF-24 remain future-facing but data-informed.

