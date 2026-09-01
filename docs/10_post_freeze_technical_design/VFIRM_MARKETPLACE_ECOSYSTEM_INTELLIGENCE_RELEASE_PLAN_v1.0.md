---
id: VFIRM-MARKETPLACE-ECOSYSTEM-INTELLIGENCE-RELEASE-PLAN
title: "Virtual Firm Marketplace and Ecosystem Intelligence Release Plan"
version: "1.0"
status: "ME-S7 Complete - Later Marketplace Widening Decision Required"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Virtual Firm Marketplace and Ecosystem Intelligence Release Plan v1.0

## 1. Purpose

This document bounds the later marketplace, capacity economy, and ecosystem intelligence release so it does not leak into Release 3, Release 4, or Release 5.

Marketplace and ecosystem intelligence are powerful, but they are only safe after the Virtual Firm Factory, controlled staging/private pilot, and trusted specialist network are proven.

## 2. Release position

This is a later release after:

1. Release 3 - Virtual Firm Factory accepted;
2. Release 4 - controlled staging/private pilot accepted;
3. Release 5 - trusted specialist network accepted.

## 3. Product target

The later marketplace/ecosystem release is:

> A governed marketplace and ecosystem intelligence release that supports qualified firm/service discovery, qualification-first matching, collaboration contracts, capacity signals, and privacy-preserving observatory insights without exposing confidential firm/client data or weakening professional authority.

## 4. Governing architecture sources

| Area | Source |
|---|---|
| Firm intelligence | `VF-13_Intelligence_and_Decision_Engine_v1.0.md` |
| Marketplace/network | `VF-14_Marketplace_and_Network_Engine_v1.0.md` |
| Network collaboration | `VF-22_Network_Collaboration_and_Enterprise_Federation_Engine_v1.0.md` |
| Capacity economy | `VF-23_Global_Capacity_Supply_Demand_and_Workforce_Economy_Engine_v1.0.md` |
| Ecosystem observatory | `VF-24_Global_Intelligence_Benchmarking_and_Market_Observatory_v1.0.md` |
| Marketplace policy | `CANONICAL_POLICY_MODEL_v1.0.md` |
| Dependency order | `VF_DEPENDENCY_MAP.md` |

## 5. Non-negotiable boundaries

- Marketplace qualification gates outrank price.
- Credentials are separate from ratings.
- AI capacity is not professional authority.
- Regulated deliverables require responsible authorized professionals.
- Client and tenant data remain confidential by default.
- Benchmarking requires aggregation, anonymization, cohort thresholds, and provenance.
- VF-13 firm intelligence must not be confused with VF-24 ecosystem intelligence.
- Private chain-of-thought is not exposed.

## 6. Marketplace scope

Potential scope:

- Virtual Firm directory;
- service marketplace;
- project request intake;
- professional and firm matching;
- qualification policy engine;
- credential and capability graph;
- collaboration contracts;
- marketplace notifications;
- marketplace governance review;
- marketplace analytics.

Explicitly out of scope unless separately approved:

- automated regulated-service award;
- price-first ranking for regulated services;
- public publication of unverified professional claims;
- uncontrolled client data sharing;
- replacing contracts with informal chat agreement;
- using ratings as credentials.

## 7. Ecosystem intelligence scope

Potential scope:

- service benchmarking;
- firm benchmarking under privacy thresholds;
- demand/capacity indicators;
- pricing bands;
- productivity and AI utilization metrics;
- long-tail opportunity radar;
- geographic/industry observatory;
- insight confidence scoring;
- intelligence provenance;
- platform strategy observatory.

Explicitly out of scope unless separately approved:

- named competitor disclosure from private data;
- small-cohort benchmark leakage;
- raw tenant operational data views;
- confidential client/project detail;
- unverifiable market claims.

## 8. Candidate sprint plan

| Sprint | Name | Outcome |
|---|---|---|
| ME-S1 | Marketplace Governance Lock | Publication, qualification, matching, privacy, conflict, credential, and data-sharing policies are locked. |
| ME-S2 | Qualified Directory and Service Publication | Firms and services can be published only through approved, verified, and revocable records. |
| ME-S3 | Private Directory Governance, Enquiry, and Renewal Controls | Directory Review Board decisions, manual private enquiries, enquiry-to-collaboration requests, and qualification renewal/expiry monitoring operate without public marketplace, live matching, ranking, capacity allocation, or autonomous award. |
| ME-S4 | SQL Persistence Hardening for ME-S2/ME-S3 Records | Private directory publication, review board, enquiry, collaboration-origin metadata, and renewal records have SQL-backed persistence and Postgres smoke evidence. |
| ME-S5 | Private Directory Operator UI | The main workspace exposes controlled private directory publication, review board, manual enquiry, collaboration request, and renewal controls without public marketplace behavior. |
| ME-S6 | Private Directory Intelligence and Readiness View | Internal directory governance metrics, pending actions, expiry risks, enquiry/collaboration status, and audit readiness are visible without public marketplace or ecosystem observatory behavior. |
| ME-S7 | Marketplace/Ecosystem Release Gate | Governance review proves marketplace widening is safe. |

## 9. Sprint acceptance summaries

- ME-S1 passes when publication, qualification, matching, benchmark privacy, consent, and revocation policies are locked.
- ME-S2 passes when firm/service publication requires approval and verified status and can be suspended or revoked.
- ME-S3 passes when review board decisions, manual private enquiries, enquiry-to-collaboration requests, renewal/expiry reviews, private-directory boundaries, and audit records are all present and forbidden marketplace behaviors remain denied.
- ME-S4 passes when ME-S2/ME-S3 private directory records are backed by SQL migrations, hydrated from Postgres, reset safely, and verified by Postgres smoke evidence.
- ME-S5 passes when the private directory operator UI exposes ME-S2/ME-S3 controls while hiding unauthorized capacity-offer creation and VF-24 observatory-publication actions from the active workspace.
- ME-S6 passes when private internal directory readiness metrics, pending actions, expiry risks, enquiry/collaboration status, and audit readiness are visible without public marketplace, live matching, ranking, capacity allocation, VF-24 publication, pricing intelligence, or autonomous award.
- ME-S7 passes when marketplace governance, privacy, security, and professional authority reviews support go/no-go.

## 10. Acceptance criteria

1. Marketplace publication is governed and revocable.
2. Qualification gates outrank price.
3. Credentials, capabilities, trust signals, and ratings remain distinct.
4. Project matching is auditable.
5. Marketplace-origin work creates contracts and responsibility records.
6. Capacity intelligence does not become automated regulated-work allocation.
7. Ecosystem intelligence uses aggregation, anonymization, privacy thresholds, and provenance.
8. VF-13 and VF-24 boundaries remain clear.
9. Confidential tenant/client data is not exposed.
10. Release evidence supports go/no-go decision.

## 11. Tool posture

Possible tool categories include graph tooling for credential/capability/conflict networks, vector search for retrieval support only, observability tooling for traces and evaluations, structured output validators for publication and matching records, and crawling/document tools for public market intelligence ingestion.

No tool may become the source of professional authority, compliance truth, or marketplace qualification by itself.

## 12. Start condition

This release may start only after Release 5 closes and the product owner records explicit approval for marketplace/ecosystem scope.
## 13. Current authorization status

Date: 2026-08-31

Release 5 has been accepted with limitations. The product owner has authorized preparation of the later Marketplace / Ecosystem Intelligence scope decision gate only.

Marketplace/ecosystem implementation is not authorized.

Prepared decision gate:

- `MARKETPLACE_ECOSYSTEM_INTELLIGENCE_SCOPE_DECISION_GATE_v1.0.md`

Recommended next implementation step, if later authorized:

- `ME-S1 â€” Marketplace Governance Lock`

ME-S1 should remain policy/schema/test-first and must not implement public directory, matching, capacity economy, or VF-24 observatory publication unless separately approved.
## 14. ME-S1 completion record

Status: COMPLETED

Date: 2026-08-31

ME-S1 locks marketplace governance without opening marketplace implementation:

- GET /marketplace/governance-lock exposes publication, matching, privacy, revocation, and implementation boundary policy.
- Existing private trusted-network marketplace primitives remain allowed only within governed boundaries.
- Public/open marketplace publication is denied.
- Price-first capacity allocation is denied.
- Autonomous marketplace award is denied.
- Unsafe data-room collaboration is denied.
- VF-24/public observatory publication is denied.
- Raw tenant/client data publication is denied.
- Human marketplace governance operator is required.

Executable gate:

```text
npm run check:me:s1
```

Next active step: product-owner decision for ME-S5. ME-S5 must be separately scoped before implementation begins.

## 15. ME-S2 completion record

Status: Completed for controlled/private qualified directory and service publication only.

ME-S2 implemented a private qualified directory publication path with these controls:

- listing requires human governance approval;
- listing requires a passed qualification gate;
- qualification gate must reference verified credential evidence;
- qualification, credential, and capability must share jurisdiction scope;
- publication is forced to trusted-network visibility and private-network scope;
- listing metadata records gate, credential, capability, governance approver, tenant confidentiality, and disabled public/matching flags;
- suspension and revocation are explicit human-governed state transitions;
- directory publication, suspension, and revocation are auditable.

ME-S2 explicitly does not implement public marketplace, live matching, price-first ranking, capacity economy allocation, VF-24 observatory publication, or autonomous regulated award.

Evidence command:

```bash
npm run check:me:s2
```

Next active step: product-owner decision for ME-S5. ME-S5 must be separately scoped before implementation begins.
## 16. ME-S3 completion record

Status: Completed for private directory governance, manual private enquiry, and qualification renewal/expiry monitoring.

ME-S3 added:

- Directory Review Board decision records;
- private directory enquiries against qualified listings;
- manual enquiry-to-collaboration request transition without matching, ranking, award, or capacity allocation;
- qualification renewal and expiry review records;
- ME-S3 readiness summary across review, enquiry, renewal, boundary, and audit evidence.

ME-S3 explicitly does not implement public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, autonomous award, or autonomous regulated approval.

Evidence command:

```bash
npm run check:me:s3
```

Next active step: product-owner decision for ME-S5. ME-S5 must be separately scoped before implementation begins.
## 17. ME-S4 completion record

Status: Completed for SQL persistence hardening of ME-S2/ME-S3 records.

ME-S4 added SQL-backed persistence for:

- Directory Review Board decisions;
- private directory enquiries;
- qualification renewal and expiry reviews;
- enquiry-origin metadata on manual collaboration requests.

Evidence command:

```bash
npm run check:me:s4
```

ME-S4 explicitly does not implement public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, autonomous award, or autonomous regulated approval.

Next active step: product-owner decision for ME-S5. ME-S5 must be separately scoped before implementation begins.
## 18. ME-S5 completion record

Status: Completed for Private Directory Operator UI.

ME-S5 added the operator-facing Network page for the controlled private qualified directory:

- qualified directory publication against PASS qualification gates;
- Directory Review Board decision recording;
- private directory enquiry recording;
- manual enquiry-to-collaboration request progression;
- qualification renewal and expiry review recording;
- ME-S2/ME-S3 summary visibility in the main workspace;
- static UI smoke coverage for the authorized controls and forbidden old controls.

Evidence command:

```bash
npm run check:me:s5
```

ME-S5 explicitly does not implement public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, autonomous award, or autonomous regulated approval.

Next active step: product-owner decision for ME-S6. ME-S6 must be separately scoped before implementation begins.
## 19. ME-S6 completion record

Status: Completed for Private Directory Intelligence and Readiness View only.

ME-S6 added:

- read-only private directory intelligence summary endpoint;
- pending Directory Review Board action visibility;
- private enquiry follow-up visibility;
- qualification renewal and expiry risk visibility;
- manual enquiry-to-collaboration status visibility;
- private directory audit readiness visibility;
- Network page readiness binding;
- JSON and PostgreSQL smoke evidence.

Evidence commands:

```bash
npm run check:me:s6
npm run check:me:s6:postgres
```

ME-S6 explicitly does not implement public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, or autonomous regulated approval.

Next active step: product-owner decision for ME-S7 or revised later-release gate. Any widening beyond private directory readiness requires separate explicit authorization.
## 20. ME-S7 completion record

Status: Completed as Marketplace/Ecosystem Release Gate for the currently authorized controlled private directory slice.

ME-S7 closes the authorized ME-S1 through ME-S6 work as a private directory release gate:

- ME-S1 governance lock completed;
- ME-S2 qualified private directory publication completed;
- ME-S3 review board, private enquiry, manual collaboration request, and renewal controls completed;
- ME-S4 SQL persistence hardening completed;
- ME-S5 private directory operator UI completed;
- ME-S6 private directory intelligence and readiness view completed;
- ME-S7 gate evidence completed.

Gate result:

- GO for controlled private directory operation and continued private operator rehearsal.
- NO-GO for public marketplace widening without a later explicit product-owner authorization.
- NO-GO for live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, or autonomous regulated approval.

Evidence command:

```bash
npm run check:me:s7
```

Next active step: later marketplace widening decision, if and when the product owner wants to consider public marketplace, ecosystem observatory, capacity economy, or pricing intelligence scope. No such widening is authorized by ME-S7.
