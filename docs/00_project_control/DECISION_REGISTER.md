# Virtual Firm Platform ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Architecture Decision Register

## ADR-001 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â The Virtual Firm is the product
AI agents, CRM, accounting, marketplace, knowledge and tools are supporting infrastructure.

## ADR-002 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Human professional remains accountable authority
AI can assist, prepare, execute routine work and recommend. Professional judgement/sign-off remains human where law, profession, money or safety requires it.

## ADR-003 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Hybrid/neuro-symbolic execution for high-risk work
LLMs interpret, extract, route and draft. Deterministic engines calculate and enforce high-risk rules where feasible.

## ADR-004 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â RAG is retrieval, not compliance
Codes/rules should become versioned machine-readable deterministic rules where possible. Vector search must not silently decide compliance.

## ADR-005 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â No private chain-of-thought exposure
Use evidence summaries: inputs, sources, rules, calculations, QA, exceptions, decisions and approvals.

## ADR-006 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Strict multi-tenant isolation
Firm/client/project data must be tenant-scoped and access-controlled at the data layer.

## ADR-007 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â AI workers have identities
Every AI worker has an identity, permissions, tools, authority limits, budget and audit history.

## ADR-008 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Workflow state is deterministic
LLMs operate within workflow/state-machine boundaries; they do not arbitrarily mutate lifecycle state.

## ADR-009 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Runtime and business logic are separate
VF-09 executes tasks safely. Domain modules own billing, contracts, projects, service logic, etc.

## ADR-010 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Common kernel + specialist packs
One platform serves many professions through Practice Packs, Service Delivery Packs, Governance Packs and Jurisdiction Packs.

## ADR-011 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Productized Professional Service is the commercial unit
Skills become practices; practices become services; services become measurable Service Products/SKUs.

## ADR-012 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Platform marketplace is capability-first
Mandatory credentials, jurisdiction and authority requirements are hard gates. Price cannot override eligibility.

## ADR-013 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Firm data portability
Professionals should be able to export client/project/business/financial/knowledge records where legally permissible. Compete by value, not lock-in.

## ADR-014 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â White-label firm identity
The professionalÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢s firm/brand is client-facing. AI remains workforce behind the firm.

## ADR-015 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Network collaboration does not blur responsibility
Cross-firm delivery must preserve who produced, reviewed, approved and signed each regulated deliverable.

## ADR-016 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Benchmarking must protect confidentiality
Ecosystem intelligence uses aggregation, anonymization, privacy thresholds and provenance.

## ADR-017 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Avoid ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œOperating SystemÃƒÂ¢Ã¢â€šÂ¬Ã‚Â positioning
Preferred product language: Virtual Firm Platform, Professional Practice Infrastructure, Virtual Firm Business Infrastructure.

## ADR-018 - Architecture baseline freeze before implementation
Formalize VF-01/VF-02, normalize terminology and create dependency mapping before extending the numbered series.
## ADR-019 - Release 2 closes with explicit R3 blockers; Release 3 begins
Date: 2026-08-29

Decision: Release 2 is closed as `GO_WITH_R3_BLOCKERS`, and Release 3 begins with `R3-S1 - Blueprint Contract Lock`.

Rationale: Existing SF-S3, SF-S4, and SF-S5 work proves bounded worker skill binding patterns, and SF-S6 proves the first solopreneur operating loop. However, the generic Release 2 compiler/runtime-binding implementation is not complete as a standalone track. The gaps are accepted only because they are now explicit R3 blockers, not hidden assumptions.

Accepted R3 blockers:
- Generic RoleSkillManifest and WorkerSkillManifest compiler is not yet fully implemented.
- Generic RuntimeWorkerBinding persistence/state machine is not yet fully implemented.
- Dedicated Release 2 smoke scripts are not present and must be covered or backfilled during R3 evidence collection.

Boundary: This decision does not approve staging/private pilot expansion, trusted specialist network, public marketplace, ecosystem intelligence, autonomous regulated approval, or live payment movement.


## ADR-020 - Release 3 evidence pack recommends Factory acceptance
Date: 2026-08-29

Decision: R3-S6 records `GO_FOR_RELEASE_3_ACCEPTANCE` as the technical recommendation for Release 3, pending product-owner acceptance.

Rationale: R3-S1 through R3-S5 provide executable evidence for deterministic blueprint validation, provisioning, pack binding certification, second-firm rehearsal, Factory hardening denials, tenant isolation, audit reconstruction, and legally permissible export.

Boundaries: This recommendation does not approve Release 4 staging/private pilot operations, trusted specialist network, public marketplace, VF-24 ecosystem intelligence, autonomous regulated approval, live payment movement, or production client-facing deployment.

Carry-over risks: standalone generic skill compiler hardening, direct relational persistence for Factory certification tables, and productized Factory UI are accepted as Release 4 candidates rather than Release 3 blockers.


## ADR-021 - Release 3 accepted and Release 4 controlled staging/private pilot scope authorized
Date: 2026-08-29

Decision: Product owner accepts Release 3 and authorizes Release 4 controlled staging/private pilot scope.

Rationale: Release 3 evidence pack proves controlled local Virtual Firm Factory capability through blueprint validation, provisioning, pack certification, second-firm rehearsal, Factory hardening denials, tenant isolation, audit reconstruction, and legally permissible export.

Authorized Release 4 scope: staging identity and tenant administration; staging deployment and data protection; support and incident controls; observability and audit review; private pilot cohort controls; pilot learning loop and Release 4 evidence.

Boundaries: This decision does not authorize public marketplace, trusted specialist network release, VF-24 ecosystem intelligence, autonomous regulated approval, live payment movement, uncontrolled production launch, or broad multi-practice expansion beyond approved pilot scope.

Entry setup still required: authentication provider decision, deployment environment, pilot cohort owner, support owner, data protection owner, incident owner, and disposition of accepted Release 3 carry-over risks.


## ADR-022 - Release 4 entry setup accepted and R4-S1 authorized
Date: 2026-08-29

Decision: Release 4 entry setup is accepted and `R4-S1 - Staging Identity and Tenant Admin` may begin.

Rationale: Release 4 has been authorized for controlled staging/private pilot scope, and the entry setup now records safe bounded defaults for identity, environment, owner, and carry-over risk handling without prematurely choosing a public launch posture.

Entry setup decisions:
- Authentication provider: provider-neutral external identity adapter contract first; physical provider selection remains a R4-S1 configuration gate before external pilot activation.
- Deployment environment: controlled staging-first posture; local controlled staging is the initial executable environment, with external staging promoted to R4-S2 before private pilot invitation.
- Pilot cohort owner: product owner is interim owner until a named pilot operations owner is appointed.
- Support owner: product owner is interim owner until a named support operator is appointed.
- Data protection owner: product owner is interim owner until a named data protection owner is appointed.
- Incident owner: product owner is interim owner until a named incident commander/operator is appointed.
- Release 3 carry-over risks: promoted into R4 implementation gates and must not become hidden assumptions.

Boundaries: This decision does not authorize external pilot invitation, public marketplace, trusted specialist network release, VF-24 ecosystem intelligence, autonomous regulated approval, uncontrolled production launch, or live payment movement.


## ADR-023 - R4-S5 private pilot cohort gate completed
Date: 2026-08-30

Decision: `R4-S5 - Private Pilot Cohort` is completed and `R4-S6 - Pilot Learning Loop and R4 Evidence` may proceed.

Rationale: R4-S5 adds a deterministic private pilot cohort activation gate that requires accepted R4-S1 through R4-S4 evidence, a controlled cohort record, pilot invitation and activation evidence, offboarding evidence, completed onboarding, approved release-candidate gate, support/incident readiness, observability/audit readiness, and attributable audit/event trace before cohort activation.

Implemented gate: `GET /pilot/r4-private-cohort-gate` and `POST /pilot/private-cohort/activate`.

Verification: `npm run check:r4:s5` passes, including early activation denial and AI actor activation denial.

Boundaries: This decision does not authorize public marketplace, trusted specialist network release, VF-24 ecosystem intelligence, autonomous regulated approval, live payment movement, uncontrolled production launch, or expansion beyond the bounded private pilot cohort.

## ADR-024 - Release 4 evidence pack recommends private pilot acceptance
Date: 2026-08-30

Decision: R4-S6 records `GO_FOR_RELEASE_4_ACCEPTANCE` as the technical recommendation for Release 4, pending product-owner acceptance.

Rationale: R4-S1 through R4-S6 provide executable evidence for controlled staging/private pilot identity, tenant administration, data protection, support, incident response, observability, audit review, private cohort activation, pilot learning, governed backlog conversion, tenant export evidence, and out-of-scope backlog denial.

Verification: `npm run check:r4:s6` passes and reports `EVIDENCE_READY` with recommendation `GO_FOR_RELEASE_4_ACCEPTANCE`.

Boundaries: This recommendation does not approve public marketplace, trusted specialist network release, VF-24 ecosystem intelligence, autonomous regulated approval, live payment movement, uncontrolled production launch, or Release 5 scope. Release 5 requires separate product-owner acceptance of Release 4 and explicit trusted specialist network authorization.
## ADR-025 - Release 4 accepted and Release 5 trusted specialist network scope authorized

Date: 2026-08-30

Decision: Product owner accepts Release 4 with the listed limitations and authorizes Release 5 trusted specialist network scope. R5-S1 - Trusted Network Profiles may proceed.

Recorded wording: "Bismillah... I accept Release 4 with the listed limitations and authorize Release 5 trusted specialist network scope. Proceed to R5-S1 - Trusted Network Profiles."

Rationale: Release 4 evidence pack and acceptance gate were completed, and the product owner explicitly approved moving from controlled staging/private pilot operations into trusted specialist network scope.

Boundaries: This authorization does not approve public marketplace, VF-24 ecosystem intelligence publication, price-first specialist allocation, uncontrolled tenant data sharing, autonomous award of regulated work, autonomous regulated approval, live payment movement, or uncontrolled production launch.

Follow-up: R5-S1 must establish profile, credential, capability, and trust-signal records without granting professional authority. R5-S2 must implement qualification, jurisdiction, insurance, conflict, capacity, and policy gates before matching or invitation.
## ADR-026 - R5-S2 qualification and conflict gate completed

Date: 2026-08-30

Decision: R5-S2 - Qualification and Conflict Gate is completed and R5-S3 - Collaboration Workspace may proceed.

Rationale: R5-S2 adds deterministic gate records for credential verification, jurisdiction eligibility, insurance evidence, conflict clearance, capacity availability, and policy approval before any specialist invitation can become ready.

Boundaries: Matching and invitation remain qualification-first, not price-first. Denied gate and denied invitation attempts are auditable evidence, not accepted collaboration. This does not authorize public marketplace, VF-24 ecosystem intelligence, autonomous regulated award, autonomous regulated approval, uncontrolled tenant data sharing, or live payment movement.

Executable evidence: 
npm run check:r5:s2 passes.
## ADR-027 - Release 5 accepted and marketplace ecosystem scope decision preparation authorized

Date: 2026-08-31

Decision: Product owner accepts Release 5 with the listed limitations and authorizes preparation of the later Marketplace / Ecosystem Intelligence scope decision gate. Marketplace/ecosystem implementation is not authorized.

Recorded wording: "Bismillah... I accept Release 5 with the listed limitations. I authorize preparation of the later Marketplace / Ecosystem Intelligence scope decision gate, but I do not yet authorize marketplace/ecosystem implementation."

Rationale: R5-S1 through R5-S6 are complete. The Release 5 evidence pack records trusted specialist network readiness, including profile records, qualification/conflict gates, collaboration workspace controls, responsibility and approval matrix, assignment and delivery lifecycle, tenant-scoped evidence, and audit reconstruction.

Boundaries: This acceptance does not authorize public marketplace launch, marketplace/ecosystem implementation, VF-24 ecosystem intelligence publication, price-first allocation, autonomous regulated award, autonomous regulated approval, direct LLM-to-final regulated output, uncontrolled tenant data sharing, live payment movement, or uncontrolled production expansion.

Follow-up: Prepare the later Marketplace / Ecosystem Intelligence scope decision gate only. Implementation may begin only after a separate explicit product-owner authorization.

Executable evidence: npm run check:r5 and npm run check passed after R5-S6.
## ADR-028 - ME-S1 marketplace governance lock completed

Date: 2026-08-31

Decision: ME-S1 - Marketplace Governance Lock is completed. Marketplace/ecosystem implementation remains limited to governance lock only, and ME-S2 is not automatically authorized.

Rationale: ME-S1 adds a deterministic marketplace governance policy surface and executable smoke gate that locks publication, matching, privacy, revocation, data-sharing, human governance, and VF-13/VF-24 separation boundaries before any public directory, matching engine, capacity economy, or VF-24 observatory work begins.

Boundaries: This decision does not authorize public directory, live marketplace matching, capacity economy allocation, VF-24 observatory publication, autonomous regulated award, autonomous regulated approval, direct LLM-to-final regulated output, live payment movement, or uncontrolled tenant data sharing.

Executable evidence: npm run check:me:s1 passes.

Follow-up: Product owner must explicitly authorize ME-S2 - Qualified Directory and Service Publication before implementation begins.

## ADR-029 - ME-S2 qualified directory and service publication completed

Date: 2026-08-31

Decision: ME-S2 is completed only as a controlled/private qualified directory and service publication capability.

Rationale: The Virtual Firm Platform can now publish trusted-network service listings only when human governance approval, passed qualification gate, verified credential evidence, jurisdiction scope, revocation/suspension controls, tenant confidentiality, and auditability are present.

Constraints: This decision does not authorize public marketplace, live matching, price-first ranking, capacity economy allocation, VF-24 observatory publication, autonomous regulated award, or autonomous professional approval.

Evidence: `npm run check:me:s2`; `docs/10_post_freeze_technical_design/ME_S2_QUALIFIED_DIRECTORY_AND_SERVICE_PUBLICATION_COMPLETION_v1.0.md`.

Follow-up: Product owner must explicitly authorize and bound ME-S3 before implementation begins.
## ADR-030 - ME-S3 private directory governance enquiry renewal completed

Date: 2026-08-31

Decision: ME-S3 is completed as private Directory Review Board operations, manual private enquiry-to-collaboration request workflow, and qualification renewal/expiry monitoring.

Rationale: The Virtual Firm Platform now has a governed operating surface around the private qualified directory without opening public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, autonomous award, or autonomous regulated approval.

Constraints: Directory Review Board decisions do not grant professional authority. Private enquiries do not create appointments or awards. Collaboration requests remain manual and do not move client data by default. Renewal review can suspend publication but cannot approve regulated deliverables.

Evidence: `npm run check:me:s3`; `docs/10_post_freeze_technical_design/ME_S3_PRIVATE_DIRECTORY_GOVERNANCE_ENQUIRY_RENEWAL_COMPLETION_v1.0.md`.

Follow-up: Product owner must explicitly authorize and bound ME-S4 before implementation begins.
## ADR-031 - ME-S4 SQL persistence hardening completed

Date: 2026-08-31

Decision: ME-S4 is completed as SQL persistence hardening for ME-S2/ME-S3 private directory records.

Rationale: Private directory governance records now have Postgres-backed tables, migration coverage, reset behavior, read hydration, and executable Postgres smoke evidence.

Constraints: This decision does not authorize public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, autonomous award, or autonomous regulated approval.

Evidence: `npm run db:migrate:docker`; `npm run check:me:s4`; `docs/10_post_freeze_technical_design/ME_S4_SQL_PERSISTENCE_HARDENING_COMPLETION_v1.0.md`.

Follow-up: Product owner must explicitly authorize and bound ME-S5 before implementation begins.
## ADR-032 - ME-S5 private directory operator UI completed

Date: 2026-08-31

Decision: ME-S5 is completed as the Private Directory Operator UI for the controlled private qualified directory.

Rationale: The Virtual Firm Platform now exposes ME-S2/ME-S3 directory publication, review board, private enquiry, manual enquiry-to-collaboration, and renewal/expiry controls in the main workspace so an operator can run the private directory without leaving the Firm Runtime workspace.

Constraints: This decision does not authorize public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, autonomous award, or autonomous regulated approval. The active Network UI no longer exposes capacity-offer creation or observatory-publication forms.

Evidence: `node --check apps/web/public/app.js`; `npm run check:me:s5`; `docs/10_post_freeze_technical_design/ME_S5_PRIVATE_DIRECTORY_OPERATOR_UI_COMPLETION_v1.0.md`.

Follow-up: Product owner must explicitly authorize and bound ME-S6 before implementation begins.
## ADR-033 - ME-S6 private directory intelligence readiness view completed

Date: 2026-08-31

Decision: ME-S6 is completed as Private Directory Intelligence and Readiness View only.

Rationale: The Virtual Firm Platform now provides a read-only internal summary of private directory governance metrics, pending review actions, private enquiry follow-ups, qualification renewal/expiry risks, manual collaboration request status, audit readiness, and forbidden behavior checks.

Constraints: This decision does not authorize public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, or autonomous regulated approval.

Evidence: `npm run check:me:s6`; `npm run check:me:s6:postgres`; `docs/10_post_freeze_technical_design/ME_S6_PRIVATE_DIRECTORY_INTELLIGENCE_READINESS_VIEW_COMPLETION_v1.0.md`.

Follow-up: Product owner must explicitly authorize ME-S7 or a revised later-release gate before implementation begins.
## ADR-034 - ME-S7 marketplace ecosystem release gate completed

Date: 2026-09-01

Decision: ME-S7 is completed as the Marketplace/Ecosystem release gate for the currently authorized controlled private directory slice.

Rationale: ME-S1 through ME-S6 have completed governance lock, qualified private publication, private directory governance, SQL persistence, operator UI, and private readiness intelligence. The release gate accepts controlled private directory operation and rejects marketplace widening until a future explicit authorization.

Constraints: This decision does not authorize public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, or uncontrolled tenant/client data sharing.

Evidence: `npm run check:me:s7`; `docs/10_post_freeze_technical_design/ME_S7_MARKETPLACE_ECOSYSTEM_RELEASE_GATE_COMPLETION_v1.0.md`.

Follow-up: Any later public marketplace, ecosystem observatory, capacity economy, or pricing intelligence work requires a new bounded product-owner authorization.
## ADR-035 - PD-H1 planning before implementation

Date: 2026-09-01

Decision: Before writing PD-H1 product code, create a full sprint plan and checklist for Private Directory Product Hardening and Operator Walkthrough, then update the GitHub repository.

Rationale: ME-S7 closed the controlled private directory release gate. The next safe step is operator-focused hardening and rehearsal planning, not public marketplace widening. A plan/checklist first keeps implementation aligned with the Virtual Firm Platform boundaries and gives the product owner a clear checkpoint before code changes.

Constraints: This decision does not authorize public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, or uncontrolled tenant/client data sharing.

Evidence: `docs/10_post_freeze_technical_design/PD_H1_PRIVATE_DIRECTORY_PRODUCT_HARDENING_AND_OPERATOR_WALKTHROUGH_SPRINT_PLAN_v1.0.md`; `docs/10_post_freeze_technical_design/PD_H1_PRIVATE_DIRECTORY_PRODUCT_HARDENING_AND_OPERATOR_WALKTHROUGH_CHECKLIST_v1.0.md`.

Follow-up: Product owner should review/accept the PD-H1 plan and checklist before implementation begins.
## ADR-036 - PD-H1 private directory product hardening completed

Date: 2026-09-01

Decision: PD-H1 is completed as Private Directory Product Hardening and Operator Walkthrough.

Rationale: The Virtual Firm Platform private directory now has clearer operator next-action visibility, forbidden-boundary reminders, walkthrough documentation, and executable hardening smoke evidence before any further marketplace widening is considered.

Constraints: This decision does not authorize public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, or uncontrolled tenant/client data sharing.

Evidence: `npm run check:pd:h1`; `docs/10_post_freeze_technical_design/PD_H1_PRIVATE_DIRECTORY_OPERATOR_WALKTHROUGH_RUNBOOK_v1.0.md`; `docs/10_post_freeze_technical_design/PD_H1_PRIVATE_DIRECTORY_PRODUCT_HARDENING_COMPLETION_v1.0.md`.

Follow-up: Recommended next step is PD-H2 - Private Directory Pilot Rehearsal and Evidence Pack.

## ADR-037 - PD-H2 private directory pilot rehearsal completed

Date: 2026-09-01

Decision: PD-H2 is completed as Private Directory Pilot Rehearsal and Evidence Pack.

Rationale: The Virtual Firm Platform private directory now has an executable rehearsal that proves the PD-H1 operator walkthrough against a realistic private pilot scenario, including qualification evidence, private listing, Review Board decision, private enquiry, manual collaboration request, renewal risk, readiness summaries, and audit evidence.

Constraints: This decision does not authorize public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, external sending, live payment movement, or uncontrolled tenant/client data sharing.

Evidence: `npm run check:pd:h2`; `npm run check:pd:h2:postgres`; `docs/10_post_freeze_technical_design/PD_H2_PRIVATE_DIRECTORY_PILOT_REHEARSAL_EVIDENCE_PACK_v1.0.md`; `docs/10_post_freeze_technical_design/PD_H2_PRIVATE_DIRECTORY_PILOT_REHEARSAL_COMPLETION_v1.0.md`.

Follow-up: Recommended next step is PD-H3 - Private Directory Pilot Acceptance Gate.
## ADR-038 - PD-H3 private directory pilot acceptance gate prepared

Date: 2026-09-01

Decision: PD-H3 is prepared as the Private Directory Pilot Acceptance Gate. The gate is pending explicit product-owner acceptance, hold, or rejection.

Rationale: PD-H1 and PD-H2 provide operator hardening, walkthrough, JSON rehearsal evidence, PostgreSQL rehearsal evidence, readiness summaries, and audit evidence for controlled private directory pilot operation. The acceptance gate makes the product-owner decision explicit before the private directory moves from rehearsal to controlled human pilot operation.

Constraints: This decision does not accept pilot operation by itself and does not authorize public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, external sending, live payment movement, or uncontrolled tenant/client data sharing.

Evidence: `npm run check:pd:h3`; `docs/10_post_freeze_technical_design/PD_H3_PRIVATE_DIRECTORY_PILOT_ACCEPTANCE_GATE_v1.0.md`.

Follow-up: Product owner should choose accept, hold, or reject using the PD-H3 decision gate wording.
## ADR-039 - PD-H3 private directory pilot readiness accepted

Date: 2026-09-01

Decision: Product owner accepts PD-H3 private directory pilot readiness with the listed limitations and authorizes controlled human pilot operation for the private directory only.

Recorded wording: "Bismillah... I accept PD-H3 private directory pilot readiness with the listed limitations. I authorize controlled human pilot operation for the private directory only, and I do not authorize public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, or autonomous regulated approval."

Rationale: PD-H1 and PD-H2 evidence proves the private directory operator walkthrough, pilot rehearsal, JSON and PostgreSQL evidence paths, readiness summaries, pending actions, renewal risk, and audit evidence. PD-H3 made acceptance explicit before moving from rehearsal to controlled human pilot operation.

Constraints: This acceptance does not authorize public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, external sending, live payment movement, uncontrolled tenant/client data sharing, or production legal/regulatory/insurance/liability determination.

Evidence: `npm run check:pd:h3`; `npm run check:pd:h3:acceptance`; `docs/10_post_freeze_technical_design/PD_H3_PRIVATE_DIRECTORY_PILOT_ACCEPTANCE_DECISION_v1.0.md`.

Follow-up: Recommended next step is PD-H4 - Controlled Private Directory Pilot Operation Runbook and Pilot Log.
## ADR-040 - PD-H4 controlled private directory pilot operation runbook completed

Date: 2026-09-01

Decision: PD-H4 is completed as the Controlled Private Directory Pilot Operation Runbook and Pilot Log.

Rationale: PD-H3 accepted private directory pilot readiness. PD-H4 converts that acceptance into an operating routine with pilot roles, responsibility boundaries, daily steps, pilot log fields, issue/incident path, evidence capture routine, closeout checklist, and sample log rows.

Constraints: This decision authorizes only controlled private directory pilot operation under the accepted PD-H3 boundary. It does not authorize public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, external sending, live payment movement, uncontrolled tenant/client data sharing, or production legal/regulatory/insurance/liability determination.

Evidence: `npm run check:pd:h4`; `docs/10_post_freeze_technical_design/PD_H4_CONTROLLED_PRIVATE_DIRECTORY_PILOT_OPERATION_RUNBOOK_AND_LOG_v1.0.md`.

Follow-up: Recommended next step is PD-H5 - Controlled Private Directory Pilot Closeout Review.
## ADR-041 - PD-H5 controlled private directory pilot closeout review completed

Date: 2026-09-02

Decision: PD-H5 is completed as the Controlled Private Directory Pilot Closeout Review.

Rationale: PD-H4 prepared the operating runbook and pilot log. PD-H5 defines the closeout evidence pack, issue and incident classifications, accept/hold/reject decision options, human sign-off requirement, simulated closeout result, and next governed backlog decision path without claiming that a real external production pilot closeout has already occurred.

Constraints: This decision does not authorize public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, external sending, live payment movement, uncontrolled tenant/client data sharing, or production legal/regulatory/insurance/liability determination.

Evidence: `npm run check:pd:h5`; `docs/10_post_freeze_technical_design/PD_H5_CONTROLLED_PRIVATE_DIRECTORY_PILOT_CLOSEOUT_REVIEW_v1.0.md`.

Follow-up: Recommended next step is PD-H6 - Private Directory Pilot Learning Backlog and Next Scope Decision.
## ADR-042 - PD-H6 private directory pilot learning backlog and next scope decision prepared

Date: 2026-09-02

Decision: PD-H6 is completed as the Private Directory Pilot Learning Backlog and Next Scope Decision preparation. Product-owner next-scope decision is required before PD-H7 implementation or any marketplace-widening work begins.

Rationale: PD-H5 prepared closeout evidence and made clear that real production pilot closeout requires filled human pilot logs. PD-H6 classifies learning backlog items, separates operator usability, evidence quality, data protection, governance control, integration readiness, blockers, accepted limitations, and scope-widening requests, then prepares explicit next-scope options.

Constraints: This decision does not authorize PD-H7 implementation by itself and does not authorize public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, external sending, live payment movement, uncontrolled tenant/client data sharing, or production legal/regulatory/insurance/liability determination.

Evidence: `npm run check:pd:h6`; `docs/10_post_freeze_technical_design/PD_H6_PRIVATE_DIRECTORY_PILOT_LEARNING_BACKLOG_AND_NEXT_SCOPE_DECISION_v1.0.md`.

Follow-up: Product owner should choose the next scope option: continue private directory pilot hardening, run a real controlled human pilot day first, hold for named blockers, or prepare a separate marketplace-widening decision gate for discussion only.
## ADR-043 - NHL Global Solution controlled onboarding rehearsal completed

Date: 2026-09-02

Decision: NHL Global Solution onboarding rehearsal is completed as controlled local test evidence for a solopreneur virtual-service firm owned by Nur Hernieliana.

Rationale: The rehearsal proves the current Virtual Firm Platform can model a non-Formwork virtual-service firm profile covering project reporting, technical writing, clerical work, and BizKick EDCS. It provisions six bounded AI workers, progresses a client enquiry through qualification, intake, proposal approval, dispatch, acceptance, project work, EDCS document control, AI-drafted project reporting output requiring human review, controlled delivery/evidence/review/issue, invoice issue, receivable follow-up draft, operations summary, audit reconstruction, export counts, and tenant-isolation denial.

Constraints: This decision does not create a legal company registration, production tenant activation, external email sending, live payment movement, public marketplace listing, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, or uncontrolled tenant/client data sharing.

Evidence: `npm run check:onboarding:nhl`; `docs/10_post_freeze_technical_design/NHL_GLOBAL_SOLUTION_ONBOARDING_REHEARSAL_RESULT_v1.0.md`; `scripts/smoke-nhl-global-solution-onboarding.mjs`.

Follow-up: If NHL Global Solution is intended to become a real pilot firm, prepare a controlled pilot setup checklist covering owner confirmation, service package names, document templates, data handling, worker authority envelopes, approval rules, pilot success criteria, export/backup routine, and incident path.
## ADR-044 - Multi-tenant workspace selector and scoped UI polish completed

Date: 2026-09-02

Decision: The web workspace now supports an explicit active tenant/firm selector and selected-firm scoped rendering for local controlled pilot operation.

Rationale: The local workspace contains more than one firm context, including the Formwork pilot context and NHL Global Solution. Relying on the latest-created firm as the implicit workspace can cause operator confusion and unsafe cross-firm mental models. The active workspace selector makes the operator's tenant/firm context visible and persists the selected firm locally.

Constraints: This polish does not replace backend tenant isolation controls and does not authorize production multi-tenant onboarding, public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, external sending, or live payment movement.

Evidence: `npm run check:web:multitenant`; `npm run check:web:navigation`; `npm run check:onboarding:nhl`; `docs/10_post_freeze_technical_design/MULTI_TENANT_WORKSPACE_POLISH_RESULT_v1.0.md`.

Follow-up: Add backend active-workspace context endpoints, query-parameter scoped summaries, browser regression testing, and firm-type-specific UI labels in the next hardening pass.

## ADR-045 - Multi-tenant workspace runtime binding plan created

Date: 2026-09-02

Decision: The next bounded hardening effort is the MT multi-tenant workspace runtime binding plan, sequenced as MT-H1 through MT-H6.

Rationale: The current UI selector is insufficient because the selected firm must load the correct workspace identity, subscription package, service lines, modules, workers, records, copy, operating boundaries, and audit context. The immediate driver is the coexistence of the Formwork pilot firm, NHL Global Solution, and private-directory rehearsal firms in local controlled pilot development.

Constraints: This plan remains controlled local/private pilot hardening. It does not authorize public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, or live payment movement.

Evidence: docs/10_post_freeze_technical_design/MT_MULTI_TENANT_WORKSPACE_RUNTIME_BINDING_SPRINT_PLAN_v1.0.md; docs/10_post_freeze_technical_design/MT_MULTI_TENANT_WORKSPACE_RUNTIME_BINDING_CHECKLIST_v1.0.md.

Follow-up: Begin MT-H1 only after product-owner acceptance of the full MT sprint plan and checklist.

## ADR-046 - MT-H1 workspace profile and subscription contract locked

Date: 2026-09-02

Decision: MT-H1 is complete. The Virtual Firm Platform now has a locked contract for resolving a selected firm into its workspace profile, subscription package, service lines, modules, worker bindings, authority boundaries, record scope, and audit requirements.

Rationale: The active firm selector alone is insufficient. Formwork and NHL Global Solution require different workspace identities, subscriptions, services, module behavior, worker defaults, and UI copy. Rehearsal firms also need clear classification so they do not replace pilot firms.

Constraints: MT-H1 is a contract/documentation and smoke-gate sprint only. It does not implement public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, or live payment movement.

Evidence: `docs/10_post_freeze_technical_design/MT_H1_WORKSPACE_PROFILE_AND_SUBSCRIPTION_CONTRACT_LOCK_v1.0.md`; `docs/10_post_freeze_technical_design/MT_H1_WORKSPACE_PROFILE_AND_SUBSCRIPTION_CONTRACT_LOCK_COMPLETION_v1.0.md`; `scripts/smoke-mt-h1-workspace-profile-contract.mjs`; `npm run check:mt:h1`.

Follow-up: Proceed to MT-H2 - Backend Active Workspace Summary.

## ADR-047 - MT-H2 backend active workspace summary completed

Date: 2026-09-02

Decision: MT-H2 is complete. The backend now exposes a selected tenant/firm active workspace summary and dashboard service-pack/subscription health now resolves from the selected firm workspace instead of assuming Formwork for every scoped dashboard.

Rationale: vFirm must run each subscribed firm workspace according to its business type. Formwork, NHL Global Solution, and PD-H2 rehearsal firms require different workspace profiles, service lines, modules, and subscription behavior.

Constraints: MT-H2 remains controlled local/private pilot hardening. It does not authorize public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, or live payment movement.

Evidence: `scripts/smoke-mt-h2-active-workspace-summary.mjs`; `docs/10_post_freeze_technical_design/MT_H2_BACKEND_ACTIVE_WORKSPACE_SUMMARY_COMPLETION_v1.0.md`; `npm run check:mt:h2`.

Follow-up: Proceed to MT-H3 - Local Seed and Pilot Workspace Data Repair.

## ADR-048 - MT-H3 local pilot workspace seed completed

Date: 2026-09-02

Decision: MT-H3 is complete. The local pilot seed now creates or preserves both the Formwork pilot workspace and NHL Global Solution with workspace subscriptions, service lines, module metadata, and six AI workers each.

Rationale: The local app could previously show only PD-H2 rehearsal firms after rehearsal smoke runs. Controlled pilot operation requires stable access to the intended pilot firms while keeping rehearsal/test workspaces clearly separate.

Constraints: MT-H3 is local/private pilot data repair only. It does not delete existing rehearsal firms and does not authorize public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, or live payment movement.

Evidence: `scripts/seed-multi-tenant-pilot-workspaces-local.mjs`; `scripts/smoke-mt-h3-pilot-workspace-seed.mjs`; `docs/10_post_freeze_technical_design/MT_H3_LOCAL_SEED_AND_PILOT_WORKSPACE_DATA_REPAIR_COMPLETION_v1.0.md`; `npm run check:mt:h3`.

Follow-up: Proceed to MT-H4 - Frontend Workspace Shell Binding.
## ADR-049 - MT-H4 frontend workspace shell binding completed
Date: 2026-09-02

Decision: The web workspace shell must render from the selected firm's workspace profile and active subscription package, not from the original Formwork-only MVP copy.

Rationale: The platform now supports at least two controlled pilot firms: Amanah Formwork Pilot Firm and NHL Global Solution. A static Formwork shell made the active firm selector misleading because the selected firm changed data scoping without changing visible workspace identity, subscription, or service context.

Implementation: MT-H4 adds a frontend active workspace contract resolver, dynamic shell title/lede, active workspace card with tenant/firm/principal/type/subscription/services, dashboard subscription/service cards, profile-driven My Firm module cards, and a generalized Service Subscription / Delivery Pack page.

Boundary: This decision does not approve public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, or live payment movement.

Follow-up: MT-H5 must deepen module and worker runtime binding so each selected firm's available actions, forms, and worker defaults fully follow its subscription/profile.
