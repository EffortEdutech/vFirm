---
id: VFIRM-RELEASE-3-TO-MARKETPLACE-ROADMAP
title: "Virtual Firm Release 3 to Marketplace Roadmap"
version: "1.0"
status: "Post-Freeze Technical Design"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Virtual Firm Release 3 to Marketplace Roadmap v1.0

## 1. Purpose

This document defines the recommended post-Release-2 delivery path for the Virtual Firm Platform:

- Release 3 - Virtual Firm Factory and repeatable firm provisioning;
- Release 4 - controlled staging and private pilot operations;
- Release 5 - trusted specialist network and firm-to-firm collaboration;
- Later Release - marketplace and ecosystem intelligence.

This is a build-facing roadmap. It does not reopen Architecture Baseline v1.0.

## 2. Architecture status

The architecture basis already exists in the frozen baseline. The later-release roadmap should be treated as implementation sequencing, not new architecture invention.

| Area | Existing architecture source | Release use |
|---|---|---|
| Firm Factory, launch, certification, Firm Blueprint | `VF-21_Onboarding_Certification_and_Firm_Launch_Engine_v1.0.md` | Release 3 |
| Workforce Blueprint and worker provisioning | `VF-02_Workforce_Catalogue_and_Provisioning_v1.0.md`, `VF-09_Virtual_Workforce_Runtime_Architecture_v1.0.md` | Release 3 |
| Practice Pack and Service Delivery Pack productization | `VF-19_Service_Delivery_and_Professional_Practice_Engine_v1.0.md`, `VF-20_Productization_Service_Pack_and_Industry_Expansion_Engine_v1.0.md` | Release 3 |
| Governance, credential, jurisdiction, approval, and trust controls | `VF-11_Professional_Governance_Compliance_and_Trust_v1.0.md`, `VF-17_Security_Identity_and_Trust_Infrastructure_v1.0.md`, `VF-18_AI_Governance_Agent_Safety_and_Autonomous_Operations_v1.0.md` | Release 3 and 4 |
| Staging, tenant administration, support, observability, incident response, pilot expansion | Stage 11 through Stage 18 post-freeze plans | Release 4 |
| Commercial launch controls, billing readiness, subscriptions | Stage 19 and Stage 20 post-freeze plans | Release 4 or Release 5 depending on product-owner scope |
| Marketplace and trusted network | `VF-14_Marketplace_and_Network_Engine_v1.0.md`, `VF-22_Network_Collaboration_and_Enterprise_Federation_Engine_v1.0.md` | Release 5 |
| Capacity economy | `VF-23_Global_Capacity_Supply_Demand_and_Workforce_Economy_Engine_v1.0.md` | Release 5 and later |
| Firm intelligence vs ecosystem intelligence | `VF-13_Intelligence_and_Decision_Engine_v1.0.md`, `VF-24_Global_Intelligence_Benchmarking_and_Market_Observatory_v1.0.md` | Release 4 and later |

## 3. Non-negotiable roadmap principles

1. Client buys from the Virtual Firm, not from AI.
2. Professional practice authority remains with the authorized human professional.
3. AI capability does not create professional authority.
4. Regulated work must always trace to a responsible authorized professional.
5. No silent approval.
6. No direct LLM-to-regulated-final output for high-risk services.
7. Deterministic engines own high-risk calculations, rules, and workflow state.
8. Retrieval, vector search, and RAG are support mechanisms, not compliance mechanisms.
9. Strict tenant and data isolation must be proven before staging, pilot expansion, or network collaboration.
10. Marketplace qualification gates must outrank price.
11. VF-13 remains firm-level intelligence. VF-24 remains ecosystem-level intelligence.

## 4. Assumed Release 2 exit condition

This roadmap assumes Release 2 closes with:

- skill compiler and runtime binding validated for role and worker skills;
- authority envelopes enforced at runtime;
- governance checks blocking unauthorized or regulated actions;
- audit identity attached to human, AI worker, system, and external-service actions;
- Formwork Engineering pilot pack still passing the solopreneur acceptance rehearsal;
- no uncontrolled staging, marketplace, or multi-tenant expansion.

If Release 2 closes with a narrower scope, Release 3 entry criteria must be reduced or the remaining Release 2 gaps must be carried as Release 3 blockers.

## 5. Release 3 - Virtual Firm Factory and repeatable firm provisioning

### 5.1 Mission

Turn the first working solopreneur Formwork Engineering Virtual Firm into a repeatable Virtual Firm Factory.

Release 3 should prove that a new controlled firm instance can be generated from:

`Firm Blueprint + Workforce Blueprint + Governance Pack + Jurisdiction Pack + Practice Pack + Service Delivery Pack`

### 5.2 Product outcome

A product owner can define a second controlled local firm and provision its modules, workers, records, service pack, governance controls, and acceptance rehearsal without hand-editing application logic.

### 5.3 Scope

Release 3 includes:

- Firm Blueprint schema and validator;
- Workforce Blueprint schema and validator;
- Practice Pack manifest and package contract;
- Governance Pack and Jurisdiction Pack binding contract;
- provisioning engine for firm identity, modules, services, workers, permissions, audit identities, and default records;
- certification/readiness gate for the provisioned firm;
- repeatable acceptance rehearsal for provisioned firms;
- export and portability check for provisioned firm data;
- first repeatable Formwork Engineering Practice Pack template.

Release 3 excludes:

- open public marketplace;
- uncontrolled third-party specialist matching;
- autonomous professional approval;
- live payment movement unless explicitly approved;
- broad multi-jurisdiction claims beyond configured jurisdiction packs;
- VF-24 ecosystem dashboards.

### 5.4 Candidate sprints

| Sprint | Name | Outcome |
|---|---|---|
| R3-S1 | Blueprint contract lock | Firm Blueprint, Workforce Blueprint, Practice Pack, Governance Pack, and Jurisdiction Pack schemas are documented and tested. |
| R3-S2 | Provisioning kernel | A blueprint can create a tenant-scoped firm shell, modules, service catalogue, worker bindings, and audit identities. |
| R3-S3 | Pack binding and certification gates | Practice Pack and governance rules bind to services, workflows, authority envelopes, and readiness tests. |
| R3-S4 | Second-firm rehearsal | A second controlled local firm is provisioned and run through the acceptance rehearsal. |
| R3-S5 | Factory hardening | Negative tests prove invalid credentials, invalid jurisdictions, missing approvals, orphan regulated work, and cross-tenant leakage are blocked. |
| R3-S6 | Release 3 evidence pack | Evidence pack records architecture conformance, test output, scope limits, risks, and go/no-go recommendation. |

### 5.5 Exit gate

Release 3 can close only when:

- one new firm instance is provisioned from blueprints;
- its six starter modules work under tenant isolation;
- its workers are bound from role/worker skill manifests with authority boundaries;
- its Practice Pack runs through at least one representative delivery loop;
- regulated work remains blocked until valid human professional approval exists;
- audit reconstruction and legally permissible export pass;
- invalid blueprint and invalid authority cases are denied.

## 6. Release 4 - Controlled staging and private pilot operations

### 6.1 Mission

Move from local controlled operation to controlled staging/private pilot readiness without weakening authority, data protection, or operational support.

### 6.2 Product outcome

Selected pilot users can access a staging/private pilot environment under controlled onboarding, real authentication, tenant administration, backups, observability, incident handling, and revocation controls.

### 6.3 Scope

Release 4 includes:

- external authentication provider activation;
- tenant administration and membership controls;
- staging deployment data-protection runbook;
- backups, restore rehearsal, secrets handling, and allowed-origin controls;
- support desk, user suspension, tenant suspension, and revocation workflows;
- observability, tracing, incident response, and audit review;
- pilot feedback and improvement loop;
- stakeholder review board and release-candidate gate;
- controlled pilot expansion cohort management.

Release 4 excludes:

- public marketplace onboarding;
- anonymous self-serve professional onboarding;
- open client acquisition marketplace;
- external payment capture unless explicitly promoted into Release 4;
- ecosystem benchmarking beyond internal pilot learning summaries.

### 6.4 Candidate sprints

| Sprint | Name | Outcome |
|---|---|---|
| R4-S1 | Staging identity and tenant admin | Real auth, tenant admin, membership, role assignment, and revocation are operational. |
| R4-S2 | Staging deployment and data protection | Deployment, secrets, allowed origins, backups, restore checks, and data export are rehearsed. |
| R4-S3 | Pilot support and incident controls | Support desk, issue triage, incident response, suspension, and escalation runbooks are operational. |
| R4-S4 | Observability and audit review | Runtime traces, application logs, business audit records, and worker action records are reviewable without exposing private chain-of-thought. |
| R4-S5 | Private pilot cohort | Pilot users/firms are onboarded through explicit cohort and release-candidate gates. |
| R4-S6 | Pilot learning loop | Feedback is captured, classified, prioritized, and turned into approved backlog items. |

### 6.5 Exit gate

Release 4 can close only when:

- staging/private pilot access is controlled by real identity and tenant admin controls;
- pilot users can be onboarded and revoked;
- secrets, backups, restore, logs, incident response, and support controls pass rehearsal;
- tenant isolation and data export pass in staging;
- pilot expansion has explicit stakeholder approval;
- no pilot workflow creates silent professional approval or orphan regulated work.

## 7. Release 5 - Trusted specialist network and firm-to-firm collaboration

### 7.1 Mission

Introduce controlled collaboration between Virtual Firms, authorized professionals, and trusted specialists before any open marketplace liquidity.

### 7.2 Product outcome

A Virtual Principal can request help from a trusted specialist or partner firm through qualification gates, conflict checks, scoped data sharing, collaboration agreement, task assignment, approval boundary, and audit trail.

### 7.3 Scope

Release 5 includes:

- private specialist network;
- professional and firm profiles;
- capability and credential graph;
- conflict-of-interest checks;
- specialist invitation and acceptance workflow;
- scoped project data room or shared evidence bundle;
- collaboration agreement and responsibility matrix;
- specialist assignment lifecycle;
- firm-to-firm collaboration records;
- trusted network analytics;
- capacity signal capture for later capacity economy work.

Release 5 excludes:

- open public marketplace;
- automated award based on price;
- public ratings as a substitute for credentials;
- uncontrolled data sharing between tenants;
- cross-jurisdiction regulated work without a valid jurisdiction pack and responsible professional.

### 7.4 Candidate sprints

| Sprint | Name | Outcome |
|---|---|---|
| R5-S1 | Trusted network profiles | ProfessionalProfile, FirmProfile, Capability, Credential, and TrustSignal records are implemented. |
| R5-S2 | Qualification and conflict gate | Matching is blocked unless credential, jurisdiction, insurance, conflict, capacity, and policy gates pass. |
| R5-S3 | Collaboration workspace | Scoped shared project/evidence workspace supports controlled specialist participation. |
| R5-S4 | Responsibility and approval matrix | Each collaboration records accountable firm, responsible professional, reviewer, approver, and permitted worker actions. |
| R5-S5 | Assignment and delivery loop | Specialist work can be requested, accepted, performed, reviewed, approved, and audited. |
| R5-S6 | Network evidence pack | Release evidence proves trust gates outrank price and data isolation remains intact. |

### 7.5 Exit gate

Release 5 can close only when:

- a trusted specialist collaboration completes end-to-end;
- qualification gates deny unqualified or conflicted participants;
- shared data is scoped and revocable;
- responsibility and approval boundaries are explicit;
- all specialist, worker, firm, and system actions are attributable;
- collaboration records can be exported where legally permissible.

## 8. Later Release - Marketplace and ecosystem intelligence

### 8.1 Mission

Only after trusted network operations are proven, introduce marketplace and ecosystem intelligence in a controlled, privacy-preserving way.

### 8.2 Product outcome

The platform can support discoverable services, professional/firm matching, marketplace qualification, capacity intelligence, and ecosystem observatory insights without exposing confidential firm or client data.

### 8.3 Marketplace scope

Marketplace release candidates may include:

- Virtual Firm directory;
- service marketplace;
- project request intake;
- professional and specialist matching;
- marketplace qualification policy;
- collaboration contracts;
- marketplace notifications;
- marketplace analytics;
- marketplace governance review.

Marketplace release candidates must not include:

- price-first ranking for regulated services;
- public claims of professional status without verification;
- AI capacity as a substitute for professional authority;
- uncontrolled client data sharing;
- automatic regulated-service award without human/business approval.

### 8.4 Ecosystem intelligence scope

Ecosystem intelligence release candidates may include:

- aggregated service benchmarking;
- market demand and capacity indicators;
- pricing bands, not single "correct" prices;
- productivity and AI utilization metrics;
- long-tail opportunity radar;
- geographic and industry observatory views;
- insight confidence and provenance;
- executive observatory.

Ecosystem intelligence must not expose:

- confidential client data;
- named competitor data unless public, lawful, and explicitly permitted;
- small-cohort benchmark results that fail privacy thresholds;
- private worker reasoning traces;
- raw tenant operational data.

### 8.5 Candidate sprints

| Sprint | Name | Outcome |
|---|---|---|
| LR-S1 | Marketplace doctrine and gate lock | Marketplace policy, eligibility, trust, conflict, credential, jurisdiction, and data-sharing rules are locked. |
| LR-S2 | Service and firm directory | Qualified firms and services can be discovered under controlled publication rules. |
| LR-S3 | Project request and matching | Project requests can be routed through qualification-first matching. |
| LR-S4 | Marketplace collaboration contracts | Marketplace-origin work creates contracts, responsibility matrices, approvals, and audit records. |
| LR-S5 | Capacity economy pilot | Capacity signals and bands are captured without creating price-only automated allocation. |
| LR-S6 | Ecosystem observatory alpha | Aggregated, anonymized, provenance-backed observatory views are available under privacy thresholds. |
| LR-S7 | Marketplace release gate | Governance review proves the marketplace is safe to widen beyond the trusted network. |

### 8.6 Exit gate

The later marketplace/ecosystem release can close only when:

- qualification gates outrank price in matching;
- every regulated deliverable has a responsible authorized professional;
- marketplace actions are attributable and auditable;
- data-sharing consent, scope, revocation, and export are implemented;
- benchmark privacy thresholds are enforced;
- ecosystem intelligence clearly separates VF-13 firm intelligence from VF-24 ecosystem intelligence.

## 9. Tool adoption posture

External tools remain candidates, not assumptions. A tool enters a release only if it solves a named acceptance gap and passes licensing, tenant isolation, security, portability, cost, operational support, and deterministic fallback review.

Likely fit by release:

| Tool family | Potential release | Use boundary |
|---|---|---|
| Marker, Chunky, Crawl4AI | Release 3 or 4 | Document/web ingestion support only; not approval authority. |
| Instructor, Outlines | Release 2 or 3 | Structured outputs behind schema validation; not workflow truth. |
| LiteLLM | Release 2 or 4 | Provider gateway behind vFirm-owned runtime interface. |
| Langfuse or equivalent tracing | Release 4 | Observability and evaluation without exposing private chain-of-thought. |
| Qdrant or equivalent vector store | Release 4 or later | Retrieval support only; not compliance mechanism. |
| DSPy or optimization framework | Later | Pipeline optimization after stable traces and evaluation sets exist. |
| Graphify or graph tooling | Release 3 or 5 | Blueprint, authority, capability, credential, and collaboration graph analysis. |

## 10. Decision register items required before each release

Before Release 3:

- approve Release 3 as Virtual Firm Factory and repeatable firm provisioning;
- confirm Release 2 exit evidence is accepted;
- define whether Release 3 stays local-only or includes staging preparation.

Before Release 4:

- approve staging/private pilot scope;
- choose authentication provider and deployment environment;
- define pilot cohort, support owner, data protection owner, and incident owner.

Before Release 5:

- approve trusted specialist network scope;
- define credential and conflict-check minimums;
- define collaboration agreement and responsibility model.

Before Marketplace / Ecosystem Intelligence:

- approve marketplace governance model;
- define publication, matching, privacy, and benchmark thresholds;
- decide which marketplace surfaces are private, controlled, or public.

## 11. Recommended next action

After Release 2 closes, create a Release 3 product target and sprint plan:

`VFIRM_RELEASE_3_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md`

That document should decompose Release 3 into executable sprints and checklists. This roadmap should remain the higher-level sequence for Release 3, Release 4, Release 5, and the later marketplace/ecosystem release.