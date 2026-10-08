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
## ADR-050 - MT-H5 module and worker runtime binding completed
Date: 2026-09-03

Decision: Main workspace module availability and AI worker provisioning must be driven by the selected firm's workspace profile and active subscription package.

Rationale: Multi-tenant workspace selection is misleading if every firm can still see and operate Formwork-specific module actions. NHL Global Solution requires an organization-support workspace while the Formwork pilot requires a technical delivery workspace. Module and worker bindings must therefore follow the selected firm's profile rather than the original reference vertical.

Implementation: MT-H5 adds view-to-module mapping, subscribed/not-subscribed navigation state, subscription-boundary pages for modules outside the active profile, selected-firm worker template filtering, firm-specific worker defaults, Front Desk service hints from active service lines, and technical delivery gating for non-Formwork workspaces.

Boundary: This decision does not approve public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, or live payment movement.

Follow-up: MT-H6 must rehearse the multi-tenant pilot flow and collect evidence proving Formwork and NHL can be operated from the same local platform without workspace copy, module, worker, or record leakage.

## ADR-051 - MT-H6 multi-tenant pilot rehearsal and evidence pack completed

Date: 2026-09-03

Decision: MT-H6 is complete. The controlled local workspace runtime can rehearse the Formwork pilot firm and NHL Global Solution from the same Virtual Firm Platform while preserving selected-firm identity, subscription display, service lines, module availability, AI worker binding, and tenant-scoped backend access.

Rationale: Multi-tenant readiness requires more than a selector. The platform must prove that switching active firm workspaces changes the runtime behavior and does not leak Formwork-specific copy, workers, technical modules, or tenant-scoped backend data into NHL Global Solution.

Implementation: MT-H6 adds an end-to-end smoke rehearsal that seeds isolated pilot workspaces, validates Formwork and NHL active summaries, verifies module and worker differences, checks frontend runtime binding markers, and confirms a cross-tenant active-summary request is denied.

Boundary: This decision does not approve public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, or live payment movement.

Evidence: `scripts/smoke-mt-h6-multi-tenant-pilot-rehearsal.mjs`; `docs/10_post_freeze_technical_design/MT_H6_MULTI_TENANT_PILOT_REHEARSAL_AND_EVIDENCE_PACK_COMPLETION_v1.0.md`; `docs/10_post_freeze_technical_design/MT_MULTI_TENANT_WORKSPACE_RUNTIME_BINDING_CHECKLIST_v1.0.md`; `npm run check:mt:h6`; `npm run check`.

Follow-up: Present the MT-H1 through MT-H6 multi-tenant workspace runtime binding pass for product-owner acceptance before starting the next scoped development plan.

## ADR-052 - MT multi-tenant runtime binding acceptance gate prepared

Date: 2026-09-03

Decision: The product-owner acceptance decision gate for MT-H1 through MT-H6 has been prepared and remains pending product-owner decision.

Rationale: MT-H6 completed the technical rehearsal, but acceptance must be explicit. The gate separates technical readiness evidence from product-owner authorization and keeps the next scope blocked until the owner chooses accept, hold, or reject.

Implementation: Added `MT_MULTI_TENANT_RUNTIME_BINDING_ACCEPTANCE_DECISION_GATE_v1.0.md` and executable smoke validation in `scripts/smoke-mt-acceptance-decision-gate.mjs`. The full regression chain now includes the acceptance-gate smoke.

Boundary: This decision does not accept MT on behalf of the product owner and does not approve production multi-tenant onboarding, public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, or live payment movement.

Evidence: `docs/10_post_freeze_technical_design/MT_MULTI_TENANT_RUNTIME_BINDING_ACCEPTANCE_DECISION_GATE_v1.0.md`; `scripts/smoke-mt-acceptance-decision-gate.mjs`; `npm run check:mt:acceptance`.

Follow-up: Product owner should choose Option A accept, Option B hold, or Option C reject using the MT acceptance decision gate wording.

## ADR-053 - MT multi-tenant runtime binding accepted

Date: 2026-09-03

Decision: The product owner accepts MT-H1 through MT-H6 multi-tenant runtime binding with the listed limitations and authorizes controlled local/private pilot operation of the Formwork pilot firm and NHL Global Solution as separate active firm workspaces.

Recorded wording: "Bismillah... I accept MT-H1 through MT-H6 multi-tenant runtime binding with the listed limitations. I authorize controlled local/private pilot operation of the Formwork pilot firm and NHL Global Solution as separate active firm workspaces. I do not authorize production multi-tenant onboarding, public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, or live payment movement."

Rationale: MT-H6 evidence proves the selected active firm controls workspace identity, subscription display, service lines, module availability, AI worker binding, and tenant-scoped active workspace access for both verified pilot firms.

Implementation: Added `MT_MULTI_TENANT_RUNTIME_BINDING_ACCEPTANCE_DECISION_v1.0.md` and executable smoke validation in `scripts/smoke-mt-acceptance-decision.mjs`. The full regression chain now includes the acceptance-decision smoke.

Boundary: This decision does not approve production multi-tenant onboarding, public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, or live payment movement.

Evidence: `docs/10_post_freeze_technical_design/MT_MULTI_TENANT_RUNTIME_BINDING_ACCEPTANCE_DECISION_v1.0.md`; `docs/10_post_freeze_technical_design/MT_MULTI_TENANT_RUNTIME_BINDING_ACCEPTANCE_DECISION_GATE_v1.0.md`; `scripts/smoke-mt-acceptance-decision.mjs`; `npm run check:mt:acceptance:decision`.

Follow-up: Recommended next development scope is `OP-H1 - Controlled Multi-Firm Pilot Operations Foundation`, to be planned before writing implementation code.

## ADR-054 - OP controlled multi-firm pilot operations plan created

Date: 2026-09-03

Decision: The next bounded development scope is OP-H1 through OP-H6, controlled multi-firm pilot operations for the verified active Formwork and NHL Global Solution workspaces.

Rationale: MT acceptance proves selected-firm runtime binding. The next risk is operational: proving a human operator can run day-to-day pilot activity, issue handling, approval capture, evidence collection, audit reconstruction, and closeout separately for each firm without tenant leakage or inappropriate module behavior.

Implementation: Added `OP_H1_TO_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_SPRINT_PLAN_v1.0.md`, `OP_H1_TO_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_CHECKLIST_v1.0.md`, and executable static validation in `scripts/smoke-op-plan-checklist.mjs`. The full regression chain now includes the OP plan smoke.

Boundary: OP planning does not approve production multi-tenant onboarding, public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, live payment movement, or uncontrolled tenant/client data sharing.

Evidence: `docs/10_post_freeze_technical_design/OP_H1_TO_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_SPRINT_PLAN_v1.0.md`; `docs/10_post_freeze_technical_design/OP_H1_TO_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_CHECKLIST_v1.0.md`; `scripts/smoke-op-plan-checklist.mjs`; `npm run check:op:plan`.

Follow-up: Product owner may authorize `OP-H1 - Controlled Multi-Firm Pilot Operations Foundation` as the next active sprint.

## ADR-055 - OP-H1 controlled multi-firm pilot operations foundation completed

Date: 2026-09-03

Decision: OP-H1 is complete. The controlled multi-firm pilot operations foundation is locked for the Formwork pilot firm and NHL Global Solution.

Rationale: After MT acceptance, the next implementation risk is not whether a firm can be selected, but whether day-to-day pilot operation can be run with firm-scoped readiness, pilot-day checklists, activity logs, issue/support records, manual approvals, exception categories, evidence summaries, and clear human authority boundaries.

Implementation: Added `OP_H1_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_FOUNDATION_v1.0.md`, `OP_H1_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_FOUNDATION_COMPLETION_v1.0.md`, and executable validation in `scripts/smoke-op-h1-controlled-multi-firm-pilot-operations-foundation.mjs`. OP-H1 checklist items are marked complete and the full regression chain now includes the OP-H1 smoke.

Boundary: OP-H1 does not approve production multi-tenant onboarding, public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, live payment movement, or uncontrolled tenant/client data sharing.

Evidence: `docs/10_post_freeze_technical_design/OP_H1_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_FOUNDATION_v1.0.md`; `docs/10_post_freeze_technical_design/OP_H1_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_FOUNDATION_COMPLETION_v1.0.md`; `scripts/smoke-op-h1-controlled-multi-firm-pilot-operations-foundation.mjs`; `npm run check:op:h1`.

Follow-up: Proceed to `OP-H2 - Operator Dashboard and Today View` after product-owner authorization.
## ADR-056 - OP-H2 operator dashboard and today view completed

Date: 2026-09-03

Decision: OP-H2 is complete. The Virtual Firm Platform dashboard now shows a selected-firm Today view for controlled multi-firm pilot operation.

Rationale: MT acceptance proved active workspace binding, and OP-H1 locked the pilot operations foundation. OP-H2 makes the operator's daily starting point practical by showing firm-specific readiness, priorities, approvals, exceptions, deadlines, project/task status, pipeline, receivables, service exposure, and authority boundaries in the active firm workspace.

Implementation: Added `OP_H2_OPERATOR_DASHBOARD_AND_TODAY_VIEW_COMPLETION_v1.0.md`, `renderOperatorTodayView`, deterministic browser-side Today fallback logic, dashboard styling, and executable validation in `scripts/smoke-op-h2-operator-dashboard-today-view.mjs`. OP-H2 checklist items are marked complete and the full regression chain now includes the OP-H2 smoke.

Boundary: OP-H2 does not approve production multi-tenant onboarding, public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, live payment movement, or uncontrolled tenant/client data sharing.

Evidence: `docs/10_post_freeze_technical_design/OP_H2_OPERATOR_DASHBOARD_AND_TODAY_VIEW_COMPLETION_v1.0.md`; `scripts/smoke-op-h2-operator-dashboard-today-view.mjs`; `npm run check:op:h2`.

Follow-up: Proceed to `OP-H3 - Formwork Pilot Day Rehearsal` after product-owner authorization.
## ADR-057 - OP-H3 Formwork pilot day rehearsal completed

Date: 2026-09-03

Decision: OP-H3 is complete. Amanah Formwork Pilot Firm now has an executable controlled Formwork pilot-day rehearsal.

Rationale: OP-H2 made the selected-firm Today view operational. OP-H3 proves the Formwork workspace can run a realistic pilot-day path through enquiry, proposal, project, drawing review, QA finding, blocked delivery package, human professional review, controlled issue, audit reconstruction, and firm-scoped export.

Implementation: Added `OP_H3_FORMWORK_PILOT_DAY_REHEARSAL_COMPLETION_v1.0.md` and executable validation in `scripts/smoke-op-h3-formwork-pilot-day-rehearsal.mjs`. OP-H3 checklist items are marked complete and the full regression chain now includes the OP-H3 smoke.

Boundary: OP-H3 does not approve OP-H4 NHL rehearsal, OP-H5 evidence closeout, OP-H6 acceptance, production multi-tenant onboarding, public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, live payment movement, or uncontrolled tenant/client data sharing.

Evidence: `docs/10_post_freeze_technical_design/OP_H3_FORMWORK_PILOT_DAY_REHEARSAL_COMPLETION_v1.0.md`; `scripts/smoke-op-h3-formwork-pilot-day-rehearsal.mjs`; `npm run check:op:h3`.

Follow-up: Proceed to `OP-H4 - NHL Global Solution Pilot Day Rehearsal` after product-owner authorization.
## ADR-058 - OP-H4 NHL Global Solution pilot day rehearsal completed

Date: 2026-09-03

Decision: OP-H4 is complete. NHL Global Solution now has an executable controlled organization-support pilot-day rehearsal.

Rationale: OP-H3 proved the Formwork pilot day. OP-H4 proves the second active firm workspace can run a separate day-in-the-life workflow for project reporting, technical writing, clerical work, and BizKick EDCS while preserving its own subscription, records, workers, approvals, evidence, audit, and export boundary.

Implementation: Added `OP_H4_NHL_GLOBAL_SOLUTION_PILOT_DAY_REHEARSAL_COMPLETION_v1.0.md` and executable validation in `scripts/smoke-op-h4-nhl-global-solution-pilot-day-rehearsal.mjs`. OP-H4 checklist items are marked complete and the full regression chain now includes the OP-H4 smoke.

Boundary: OP-H4 does not approve OP-H5 evidence closeout, OP-H6 acceptance, production multi-tenant onboarding, public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, live payment movement, or uncontrolled tenant/client data sharing.

Evidence: `docs/10_post_freeze_technical_design/OP_H4_NHL_GLOBAL_SOLUTION_PILOT_DAY_REHEARSAL_COMPLETION_v1.0.md`; `scripts/smoke-op-h4-nhl-global-solution-pilot-day-rehearsal.mjs`; `npm run check:op:h4`.

Follow-up: Proceed to `OP-H5 - Pilot Evidence, Audit, Export, and Closeout Review` after product-owner authorization.
## ADR-059 - OP-H5 pilot evidence audit export and closeout review completed

Date: 2026-09-03

Decision: OP-H5 is complete. The controlled multi-firm pilot now has a firm-scoped evidence pack template, closeout review template, audit reconstruction checklist, legally permissible export checklist, unresolved finding classification model, and privacy/redaction notes.

Rationale: OP-H3 and OP-H4 proved separate pilot-day rehearsals for Amanah Formwork Pilot Firm and NHL Global Solution. OP-H5 assembles those results into a closeout review structure so OP-H6 can make a product-owner acceptance decision using explicit evidence rather than scattered sprint notes.

Implementation: Added `OP_H5_PILOT_EVIDENCE_AUDIT_EXPORT_CLOSEOUT_REVIEW_v1.0.md` and executable validation in `scripts/smoke-op-h5-pilot-evidence-audit-export-closeout.mjs`. OP-H5 checklist items are marked complete and the full regression chain now includes the OP-H5 smoke.

Boundary: OP-H5 does not approve OP-H6 acceptance by itself, production multi-tenant onboarding, public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, live payment movement, or uncontrolled tenant/client data sharing.

Evidence: `docs/10_post_freeze_technical_design/OP_H5_PILOT_EVIDENCE_AUDIT_EXPORT_CLOSEOUT_REVIEW_v1.0.md`; `scripts/smoke-op-h5-pilot-evidence-audit-export-closeout.mjs`; `npm run check:op:h5`.

Follow-up: Proceed to `OP-H6 - Controlled Multi-Firm Pilot Operations Acceptance Gate` after product-owner authorization.
## ADR-060 - OP-H6 controlled multi-firm pilot operations acceptance gate prepared

Date: 2026-09-03

Decision: OP-H6 acceptance gate is prepared and remains pending product-owner decision. The technical recommendation is `GO_FOR_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE`.

Rationale: OP-H1 through OP-H5 now provide evidence for controlled multi-firm pilot operations: foundation, selected-firm Today view, Formwork pilot-day rehearsal, NHL Global Solution pilot-day rehearsal, evidence/audit/export closeout, and zero current blockers. Acceptance must remain explicit because the next decision controls whether this readiness becomes accepted controlled local/private pilot operation scope.

Implementation: Added `OP_EVIDENCE_PACK_COMPLETION_v1.0.md`, `OP_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE_GATE_v1.0.md`, and executable validation in `scripts/smoke-op-h6-controlled-multi-firm-pilot-operations-acceptance-gate.mjs`. OP-H6 checklist items are marked complete and the full regression chain now includes the OP-H6 smoke.

Boundary: OP-H6 gate preparation does not itself authorize production multi-tenant onboarding, public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, live payment movement, or uncontrolled tenant/client data sharing.

Evidence: `docs/10_post_freeze_technical_design/OP_EVIDENCE_PACK_COMPLETION_v1.0.md`; `docs/10_post_freeze_technical_design/OP_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE_GATE_v1.0.md`; `scripts/smoke-op-h6-controlled-multi-firm-pilot-operations-acceptance-gate.mjs`; `npm run check:op:h6`.

Follow-up: Product owner must accept, hold, reject, or defer OP readiness before any next scope begins.

## ADR-061 - OP controlled multi-firm pilot operations accepted

Date: 2026-09-03
Status: accepted
Decision: The product owner accepts OP-H1 through OP-H6 controlled multi-firm pilot operations readiness with the listed limitations. Controlled local/private pilot operation is authorized for Amanah Formwork Pilot Firm and NHL Global Solution as separate active firm workspaces.

Rationale: OP-H1 through OP-H6 established controlled multi-firm pilot operations foundation, operator dashboard/Today View, separate Formwork and NHL pilot-day rehearsals, evidence/audit/export closeout, and a formal acceptance gate. Validation confirms zero blockers and preserved tenant, human authority, export, and audit boundaries.

Implementation: Added `OP_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE_DECISION_v1.0.md` and executable validation in `scripts/smoke-op-acceptance-decision.mjs`. The full regression chain now includes the OP acceptance-decision smoke.

Boundary: This acceptance does not authorize production multi-tenant onboarding, public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, live payment movement, or uncontrolled tenant/client data sharing.

Evidence: `docs/10_post_freeze_technical_design/OP_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE_DECISION_v1.0.md`; `docs/10_post_freeze_technical_design/OP_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE_GATE_v1.0.md`; `docs/10_post_freeze_technical_design/OP_EVIDENCE_PACK_COMPLETION_v1.0.md`; `scripts/smoke-op-acceptance-decision.mjs`; `npm run check:op:acceptance:decision`.

Follow-up: Product owner should choose the next bounded development scope before implementation continues beyond controlled local/private pilot operation.

## ADR-062 - Corporate workspace shell polish completed

Date: 2026-09-03
Status: accepted
Decision: The web workspace shell is polished into a more corporate future user UI with a left sidebar menu, hamburger sidebar behavior, structured active workspace context, concise workspace banner, and development-mode full feature visibility.

Rationale: The previous page felt like a noticeboard because the hero area carried too much metadata and the top navigation was a long button strip. Controlled pilot development also needs all feature areas visible for review even when a selected firm's subscription does not include a module.

Implementation: Updated `apps/web/public/index.html`, `apps/web/public/styles.css`, and `apps/web/public/app.js`. Updated focused UI smoke contracts to verify corporate sidebar navigation, dynamic workspace shell, development-mode full feature visibility, and continued active-firm/subscription binding.

Boundary: This polish does not authorize production multi-tenant onboarding, public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, live payment movement, or uncontrolled tenant/client data sharing. Subscription metadata and tenant boundary evidence remain intact.

Evidence: `docs/10_post_freeze_technical_design/UI_CORPORATE_WORKSPACE_SHELL_POLISH_RESULT_v1.0.md`; `npm run check:web:navigation`; `npm run check:web:multitenant`; `npm run check:mt:h5`; `npm run check:mt:h6`; `npm run check`.

Follow-up correction: The menu is hamburger-only rather than a permanent desktop sidebar, and the repeated workspace context is compact so page content appears without a large noticeboard-style header.

## ADR-064 - NHL-Q1 BOQ quotation intake and issue workflow completed

Date: 2026-09-03

Decision: NHL Global Solution BOQ-image quotation work is represented as a controlled quotation case linked to intake, document evidence, proposal approval, submitted quotation evidence, audit, and tenant export. Raw client files remain local/private and are not committed. No autonomous approval, pricing intelligence, live payment movement, public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, autonomous award, or autonomous regulated approval is authorized.

## ADR-065 - NHL-Q2 BOQ extraction aid completed

Date: 2026-09-03

Decision: NHL BOQ extraction aids are controlled, non-authoritative, tenant-scoped review worksheets linked to quotation cases and document-control evidence. Human principal review is required before they can support quotation drafting. No autonomous measurement, pricing, approval, regulated certification, client commitment, live payment, public marketplace, live matching, ranking, capacity allocation, VF-24 publication, pricing intelligence, autonomous award, or autonomous regulated approval is authorized.

Evidence:
- `docs/10_post_freeze_technical_design/NHL_Q2_QUOTATION_DOCUMENT_CONTROL_AND_BOQ_EXTRACTION_AID_COMPLETION_v1.0.md`
- `scripts/smoke-nhl-q2-boq-extraction-aid.mjs`
- API routes `/api/boq-extraction-aids` and `/api/boq-extraction-aids/review`

## ADR-066 - NHL-Q3 quotation draft assembly and client correspondence completed

Date: 2026-09-04

Decision: NHL-Q3 adds controlled quotation draft packs assembled from human-reviewed BOQ extraction aids and draft-only client correspondence records. The active local Postgres workspace was repaired by reseeding the approved pilot workspaces so Amanah Formwork Pilot Firm and NHL Global Solution appear alongside PD-H2 in the active workspace selector. Quotation draft packs remain non-authoritative and not client-facing until explicit later human-controlled issue steps.

Evidence:
- `docs/10_post_freeze_technical_design/NHL_Q3_QUOTATION_DRAFT_ASSEMBLY_AND_CLIENT_CORRESPONDENCE_COMPLETION_v1.0.md`
- `scripts/smoke-nhl-q3-quotation-draft-correspondence.mjs`
- API routes `/api/quotation-draft-packs`, `/api/quotation-draft-packs/review`, and `/api/quotation-draft-packs/client-correspondence`
- Operational repair command: `npm run seed:pilot-workspaces` against local Postgres-backed API on 3091

Boundaries: No autonomous measurement, pricing, approval, regulated certification, client-facing issue, external send, live payment movement, public marketplace, live matching, ranking, capacity allocation, VF-24 publication, pricing intelligence, autonomous award, or autonomous regulated approval is authorized.

## ADR-067 - NHL-Q4 controlled quotation issue and receivables preparation completed

Date: 2026-09-04
Status: Accepted for controlled local/private pilot readiness

Decision: NHL-Q4 adds explicit human-principal controlled quotation issue records and receivable-preparation records for NHL Global Solution's BOQ quotation workflow. The platform records issued document/evidence references, transitions quotation case/draft/correspondence state, and prepares invoice-readiness records without live payment movement.

Rationale: NHL's real quotation work needs a controlled bridge between reviewed draft packages and client/business follow-up. The issue step must remain human-authorized and auditable, while receivables must remain preparation-only until later payment and invoicing scopes are explicitly authorized.

Boundaries: No autonomous quotation issue, external send, autonomous pricing/measurement/certification/approval, live payment movement, payment capture, bank instruction, public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, or autonomous regulated approval.

Evidence: `scripts/smoke-nhl-q4-controlled-issue-receivables.mjs`; `npm run check:nhl:q4`; `docs/10_post_freeze_technical_design/NHL_Q4_CONTROLLED_QUOTATION_ISSUE_AND_RECEIVABLES_PREPARATION_COMPLETION_v1.0.md`.

## ADR-068 - NHL-Q5 quotation operations dashboard and exception handling completed

Date: 2026-09-04
Status: Accepted for controlled local/private pilot readiness

Decision: NHL-Q5 adds a tenant-scoped quotation operations summary endpoint and Dashboard/Sales & Accounts UI panels for NHL Global Solution. The summary surfaces quotation counts, review queues, issue readiness, receivable readiness, exception categories, and boundary reminders from existing NHL-Q1 through NHL-Q4 records.

Rationale: The NHL quotation workflow needed an operator-facing view so a solo business owner can see what requires attention without opening every record. The view is read-only and does not create new authority or autonomous commercial action.

Boundaries: No autonomous measurement, pricing, certification, approval, quotation issue, external send, live payment movement, payment capture, bank instruction, public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, or autonomous regulated approval.

Evidence: `scripts/smoke-nhl-q5-quotation-operations-dashboard.mjs`; `npm run check:nhl:q5`; `docs/10_post_freeze_technical_design/NHL_Q5_QUOTATION_OPERATIONS_DASHBOARD_AND_EXCEPTION_HANDLING_COMPLETION_v1.0.md`.

## ADR-069 - NHL-Q6 quotation evidence pack and acceptance gate completed

Date: 2026-09-04
Status: Product-owner acceptance decision required

Decision: NHL-Q6 is complete as a technical evidence and acceptance-gate sprint. The NHL Global Solution quotation workflow now has an evidence pack covering intake, document control, BOQ extraction aid, human extraction review, quotation draft assembly, human draft review, draft-only correspondence, human-controlled issue, receivable preparation without live payment movement, quotation operations visibility, audit reconstruction, and tenant/firm-scoped export.

Rationale: The NHL-Q series represents a realistic solo business quotation path for BOQ/image-based client enquiries. Closing the series requires a formal evidence pack and explicit product-owner decision gate so pilot readiness is not treated as silent acceptance.

Implementation: Added `NHL_Q6_QUOTATION_EVIDENCE_PACK_AND_ACCEPTANCE_GATE_v1.0.md`, `NHL_Q_WORKFLOW_ACCEPTANCE_DECISION_GATE_v1.0.md`, and executable validation in `scripts/smoke-nhl-q6-quotation-evidence-acceptance-gate.mjs`. The full regression chain now includes the NHL-Q6 smoke gate.

Boundaries: This decision does not authorize autonomous measurement, pricing, certification, approval, quotation issue, external send, live payment movement, payment capture, bank instruction, production multi-tenant onboarding, public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, or autonomous regulated approval.

Evidence: `docs/10_post_freeze_technical_design/NHL_Q6_QUOTATION_EVIDENCE_PACK_AND_ACCEPTANCE_GATE_v1.0.md`; `docs/10_post_freeze_technical_design/NHL_Q_WORKFLOW_ACCEPTANCE_DECISION_GATE_v1.0.md`; `scripts/smoke-nhl-q6-quotation-evidence-acceptance-gate.mjs`; `npm run check:nhl:q6`.

Follow-up: Product owner must explicitly accept, accept with limitations, hold, or reject the NHL-Q workflow before it is treated as accepted controlled local/private pilot operation scope.
## ADR-070 - Phase C AWIA-in-daily-workload extension of OP-H3/OP-H4/OP-H5 completed

Date: 2026-09-06
Status: Accepted for controlled local/private pilot readiness (OP-H6 acceptance decision remains a separate, still-pending product-owner decision)

Decision: The OP-H1 through OP-H6 controlled multi-firm pilot operations rehearsal (originally completed 2026-09-03) was verified to predate AWIA virtual staff and therefore covered only a human-only pilot day, even though the unified AWIA sprint plan's Phase C objective requires day-to-day operation "including AWIA virtual staff in the daily workload." OP-H3 (Formwork) and OP-H4 (NHL) were extended so each firm's controlled pilot-day rehearsal now assigns a real task to an AWIA virtual staff member, produces a draft-only output, routes it through explicit human review, and prepares a client delivery draft without final-issue authority. The tenant/firm-scoped evidence/export package (`/data-protection/export-package`) was extended to include all 17 `awia_*` collections, and its tenant-scope filter was corrected to also honor `organization_id` (the field `awia_virtual_staff_members` uses instead of `tenant_id`) so AWIA records are neither silently excluded nor leaked across tenants. A stale AWIA staging-readiness smoke test (`scripts/smoke-awia-staging-preparation.mjs`) left asserting the pre-TD-009-closure state was also corrected to match the now-closed TD-009 (see ADR entries for Phase B / TECHNICAL_DEBT_REGISTER_v1.0.md).

Rationale: Presenting an OP-H6 acceptance decision to the product owner on a pilot day that silently excluded AWIA virtual staff would misrepresent what "controlled multi-firm pilot operations" actually covers, given AWIA staff are now a real part of daily firm operation. Fixing the gap before the OP-H6 decision, rather than after, keeps the acceptance decision honest.

Boundaries: No production multi-tenant onboarding, public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, or live payment movement. AWIA staff output remains draft-only with explicit human review required before any client-facing delivery; `final_issue_allowed` remains `false` at every stage rehearsed.

Evidence: `scripts/smoke-op-h3-formwork-pilot-day-rehearsal.mjs`, `scripts/smoke-op-h4-nhl-global-solution-pilot-day-rehearsal.mjs`, `scripts/smoke-op-h5-pilot-evidence-audit-export-closeout.mjs`, `scripts/smoke-op-h6-controlled-multi-firm-pilot-operations-acceptance-gate.mjs`, `scripts/smoke-awia-staging-preparation.mjs`; `npm run check:op:h3`, `check:op:h4`, `check:op:h5`, `check:op:h6`, `check:awia:staging-prep`; addenda in `OP_H3_FORMWORK_PILOT_DAY_REHEARSAL_COMPLETION_v1.0.md`, `OP_H4_NHL_GLOBAL_SOLUTION_PILOT_DAY_REHEARSAL_COMPLETION_v1.0.md`, `OP_H5_PILOT_EVIDENCE_AUDIT_EXPORT_CLOSEOUT_REVIEW_v1.0.md`, `OP_EVIDENCE_PACK_COMPLETION_v1.0.md`, `OP_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE_GATE_v1.0.md`.

Known unrelated findings surfaced but not fixed in this pass (pre-existing, unrelated to this ADR): `scripts/smoke-awia-vs-s2-package-registry.mjs` depends on Windows-absolute skill-folder paths and can only be verified by running `npm run check` directly on the developer's machine, not inside a Linux sandbox; `scripts/smoke-awia-vs-s5-afcc-staff-management.mjs` asserts a UI marker (`bindAfccStaffProfileButtons`) that does not match the actual function name in `apps/web/public/app.js` (`bindAfccStaffControls`), introduced in commit `e99dc27` (2026-09-05) and unrelated to Phase C.

Follow-up: Product owner still needs to explicitly accept, hold, reject, or defer OP-H6 controlled multi-firm pilot operations readiness (Option A/B/C/D in `OP_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE_GATE_v1.0.md`), now on a pilot day that genuinely includes AWIA virtual staff in the daily workload.

## ADR-071 - Product owner accepted OP-H6 controlled multi-firm pilot operations readiness

Date: 2026-09-06
Status: Accepted

Decision: The product owner reviewed a direct summary of the OP-H6 acceptance gate (technical recommendation `GO_FOR_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE`, the Phase C AWIA-in-daily-workload extension recorded in ADR-070, and the unrelated pre-existing gaps surfaced but not fixed - `smoke-awia-vs-s2-package-registry.mjs`, `smoke-awia-vs-s5-afcc-staff-management.mjs`, `smoke-mt-h5-module-worker-binding.mjs`, `smoke-web-navigation-renderers.mjs`) and selected Option A - Accept OP readiness for both Amanah Formwork Pilot Firm and NHL Global Solution.

Rationale: OP-H1 through OP-H6 evidence is complete, the controlled pilot day for both firms (now including AWIA virtual staff in the daily workload) can be reconstructed from audit/event records, records stay tenant/firm separated, human approval boundaries hold, and the current blocker count is `0`.

Boundaries: This acceptance authorizes controlled local/private pilot operation only. It does not authorize production multi-tenant onboarding, public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, autonomous regulated approval, live payment movement, or uncontrolled tenant/client data sharing.

Evidence: `docs/10_post_freeze_technical_design/OP_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE_GATE_v1.0.md` section 9; `docs/10_post_freeze_technical_design/OP_H1_TO_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_CHECKLIST_v1.0.md` (Final OP acceptance readiness gate, all items checked); ADR-070.

Follow-up: Phase C is closed in `VFIRM_AWIA_HIRE_A_VIRTUAL_WORKER_UNIFIED_SPRINT_PLAN_AND_CHECKLIST_v1.0.md`. Phase D (Release 4: staging and private pilot operations) is the next scope and still requires its own separate "Proceed Phase D ... Bismillah" authorization before any work begins.

## ADR-072 - Phase D verified AWIA virtual staff under Release 4 staging controls

Date: 2026-09-06
Status: Accepted for controlled local/private pilot readiness (supplements the existing Release 4 acceptance, ADR dated 2026-08-30 in `R4_ACCEPTANCE_AND_R5_SCOPE_AUTHORIZATION_v1.0.md`; does not reopen it)

Decision: Release 4 (R4-S1 through R4-S6: staging identity/tenant admin, staging deployment/data protection, pilot support/incident controls, observability/audit review, private pilot cohort, pilot learning loop) was built and accepted by the product owner on 2026-08-30, before AWIA virtual staff existed. None of the seven R4 smoke tests referenced AWIA at all. Rather than re-running the already-accepted R4-S1 through R4-S6 sequence verbatim (which would only re-verify non-AWIA staging plumbing that already passed and was already accepted), R4-S2, R4-S4, and R4-S5 were extended to specifically rehearse AWIA virtual staff operating under Release 4's real staging controls:

- R4-S2 (staging deployment/data protection): AWIA staff provisioned inside a staging-simulated tenant/firm are correctly counted in the tenant-scoped export manifest and export package, no environment secret leaks through the AWIA export path, and a second tenant cannot read the first tenant's AWIA records.
- R4-S4 (observability/audit review): an AWIA provisioning and lifecycle-activation action produces reviewable runtime events picked up by `/ops/r4-observability-audit-review` like any other business action, with review status remaining `REVIEW_READY` and no private chain-of-thought/raw-prompt/raw-completion leakage.
- R4-S5 (private pilot cohort): once a tenant's private pilot cohort is fully onboarded and activated (`PRIVATE_PILOT_ACTIVE`), AWIA virtual staff can be provisioned for that same tenant/firm and produce a real `awia.virtual_staff.provisioned` audit/event record.

Rationale: The unified AWIA sprint plan's Phase D objective is for AWIA to operate correctly once real staging identity, tenant administration, data protection, observability, and private-pilot-cohort controls are active - not merely for the generic Release 4 staging plumbing (already accepted, unrelated to AWIA) to still pass in isolation.

Boundaries: This decision does not reopen or re-litigate the original Release 4 acceptance (`R4_ACCEPTANCE_AND_R5_SCOPE_AUTHORIZATION_v1.0.md`, 2026-08-30) or any Release 5+ work built since. It does not authorize production multi-tenant onboarding, public marketplace, live matching, autonomous regulated approval, or live payment movement.

Evidence: `scripts/smoke-r4-staging-deployment-data-protection.mjs`, `scripts/smoke-r4-observability-audit-review.mjs`, `scripts/smoke-r4-private-pilot-cohort.mjs`; `npm run check:r4:s2`, `check:r4:s4`, `check:r4:s5` (and `check:r4:s0`, `check:r4:s1`, `check:r4:s3`, `check:r4:s6` re-confirmed unaffected); addenda in `R4_S2_STAGING_DEPLOYMENT_AND_DATA_PROTECTION_COMPLETION_v1.0.md`, `R4_S4_OBSERVABILITY_AND_AUDIT_REVIEW_COMPLETION_v1.0.md`, `R4_S5_PRIVATE_PILOT_COHORT_COMPLETION_v1.0.md`.

Follow-up: Phase D is closed in `VFIRM_AWIA_HIRE_A_VIRTUAL_WORKER_UNIFIED_SPRINT_PLAN_AND_CHECKLIST_v1.0.md`. Phase E (commercial activation for AWIA staff seats) is next and still requires its own separate "Proceed Phase E ... Bismillah" authorization before any work begins; it explicitly requires a product-owner commercial decision (payment provider selection) that this ADR does not make.

## ADR-073 - Phase E (commercial activation) deferred to end of roadmap; platform/operations work proceeds first on mock billing

Date: 2026-09-06
Status: Accepted

Decision: The product owner directed that live payment integration (Phase E) be deferred to the end of the AWIA hire-a-virtual-worker roadmap. Amanah Formwork Pilot Firm and NHL Global Solution will next select a subscription package and hire an AWIA virtual staff member and run real business operations using the existing config-only seat-billing state machine (`packages/core-domain/src/awia-virtual-staff-payroll.mjs`, `PENDING_ACTIVATION` etc., no live payment capture), rather than pausing platform work to build commercial activation now.

Rationale: investigation into Phase E surfaced that vFirm has no real cryptographically-verifiable auth provider yet (only trusted dev-header/staging-header identity - see `authProviderConfig()` in `apps/api/src/server.mjs`, `adapter_status` of `DEV_HEADER_ONLY` or `STAGING_HEADER_ADAPTER`). The Central Payment Hub's preferred Stage 4 authentication pattern (`docs/MULTI_APP_ONBOARDING_RUNBOOK.md`, Central Payment Hub repo) requires the app to send its own real signed user JWT for the Hub to verify server-side. Building that properly means standing up a genuine identity provider for vFirm first - real new work beyond Phase E's original scope, and not something to build as a rushed prerequisite. The product owner judged it sounder to mature the operating platform (package selection, hire-a-worker, day-to-day business operations for the two pilot firms) before committing to an auth/billing architecture, rather than force live payment integration ahead of a platform that is not yet ready to carry it.

Boundaries: This decision does not authorize any live payment capture, live credential use, or production launch. It does not change or reopen ADR-070, ADR-071, or ADR-072. The seat-billing state machine remains config-only/no-live-capture exactly as already built. Real payment integration (the original Phase E scope) is not cancelled - it is resequenced to run later in the roadmap, informed by whatever real auth provider vFirm eventually adopts.

Evidence: this session's investigation of `C:\Users\user\Documents\00 Payment Gateway\docs\MULTI_APP_ONBOARDING_RUNBOOK.md` (Stage 0-8) and `C:\Users\user\Documents\00 Payment Gateway\AGENTS.md` (Rule 14: no live credential use, catalog mutation, deployment, or production transaction is authorized merely by editing that repository); `apps/api/src/server.mjs` `authProviderConfig()`, `devActorFromHeaders()`, `verifiedExternalIdentityFromHeaders()`.

Follow-up: next work is scoping and building the package-selection / hire-a-worker / business-operations flow for the two existing pilot firms on top of the existing mock seat-billing state machine. Its own "Proceed Phase ... Bismillah" authorization and scope will be confirmed with the product owner before implementation starts. Phase E remains open, deferred, and still requires its own future "Proceed Phase E ... Bismillah" plus the commercial decisions already partially captured in this session (provider = existing NHL Global Solution Stripe account via the Central Payment Hub, `user_ref` = vFirm `firm_id`, entitlement keys `awia_seat_solostand`/`awia_seat_entgrow`/`awia_seat_corpoext`/`awia_seat_hireme_custom`) so that work is not lost when Phase E resumes.

## ADR-074 - Operator-driven AWIA package assignment and seat/role gating built (pre-billing, following ADR-073's reordering)

Date: 2026-09-06
Status: Accepted

Decision: Following ADR-073's decision to defer Phase E and mature the operating platform first, an operator-driven package/seat gating capability was built and verified for Amanah Formwork Pilot Firm and NHL Global Solution: an operator assigns one of four named commercial packages (SoloStand: 1 seat, any role; EntGrow: 3 seats, no CFO; CorpoExt: 6 seats, all roles; HireMe: no seat cap, all roles, client names the specific worker) to a firm, and hiring AWIA virtual staff through the template-based hire flow is rejected if it exceeds the assigned package's seat count or includes a disallowed role.

Rationale: the product owner asked for NHL and Formwork to be able to select a package and hire a worker and run business operations now, without waiting for live billing. Building this on top of the existing config-only seat-billing state machine (no live payment capture) lets the platform mature commercially in shape (packages, limits, hire-a-worker) while genuinely deferring money movement to whenever Phase E resumes.

Boundaries: this decision authorizes no live payment capture, no live credential use, and no change to runtime authority (the existing role tool-policy authority gate in `awia-virtual-staff-authority-gate.mjs` is untouched and still separately enforced). It does not reopen ADR-070 through ADR-073. The already-accepted OP-H1 through OP-H6 fixed-roster pilot flow (`provision-pilot`) does not go through this new gate and its prior acceptance evidence is unaffected.

Evidence: `packages/core-domain/src/awia-firm-package-catalogue.mjs`; `apps/api/src/store.mjs` (`assignAwiaFirmPackageRecord`, `readAwiaFirmPackageAssignmentRecord`, and the new gate inside `provisionAwiaVirtualStaffFromTemplateRecord`); `apps/api/src/server.mjs` (`POST /ops/awia-package-assignment`, `GET /ops/awia-package-assignment`); `scripts/smoke-awia-firm-package-seat-gating.mjs` (`npm run check:awia:package-gating`); `scripts/smoke-awia-multi-firm-staff-template-scaling.mjs` re-verified passing under the new gate; `npm run check:op:h3`, `check:op:h4`, `check:r4:s2`, `check:r4:s4`, `check:r4:s5`, `check:awia:staging-prep` re-confirmed unaffected; addendum in `OP_H2_OPERATOR_DASHBOARD_AND_TODAY_VIEW_COMPLETION_v1.0.md`.

Follow-up: this covers package/seat gating only. It does not implement per-seat incremental hiring after a firm's first roster (the existing "already provisioned" restriction on `provision-from-template` is unchanged), and it does not implement the HireMe custom-worker-selection UI - both remain open follow-ups if the product owner wants them before Phase E resumes. Phase E (live payment) remains deferred per ADR-073 and still needs its own future "Proceed Phase E ... Bismillah."

## ADR-075 - Narrowed to HireMe as the sole AWIA commercial package

Date: 2026-09-06
Status: Accepted

Decision: The product owner reviewed ADR-074's four-package catalogue (SoloStand, EntGrow, CorpoExt, HireMe) and directed a narrower direction: drop SoloStand, EntGrow, and CorpoExt entirely and offer only HireMe for now. The concept going forward is: AWIA workers are set up and made available (following the AIWA/AWIA staff roster and roles), and a business owner hires the specific worker(s) they want to run their business, with human approval still required on every output exactly as before. `packages/core-domain/src/awia-firm-package-catalogue.mjs` now defines exactly one package (`HIRE_ME`): no seat cap, no role restriction, the business owner names the worker(s) to hire.

Rationale: SoloStand/EntGrow/CorpoExt were a guessed commercial tiering the product owner had not actually asked for as separate offers; the real direction is a single hire-a-named-worker offer, matching AWIA's own template-based hire flow (which already always names specific roles/workers) rather than an artificial seat-count/role-tier ladder.

Boundaries: this decision authorizes no live payment capture and no change to runtime authority - the existing role tool-policy authority gate remains untouched and human approval remains required on every AWIA output. It does not reopen ADR-070 through ADR-074's other findings.

Evidence: `packages/core-domain/src/awia-firm-package-catalogue.mjs` (rewritten to a single `HIRE_ME` entry); `scripts/smoke-awia-firm-package-seat-gating.mjs` (rewritten for the HireMe-only direction: no-package rejection, unrecognized-package rejection, successful hire once assigned, cross-firm isolation, single-entry catalogue); `scripts/smoke-awia-multi-firm-staff-template-scaling.mjs` re-verified passing with `HIRE_ME` in place of the removed `CORPO_EXT`; `npm run check:awia:package-gating`, `check:awia:template-scaling`, `check:op:h3`, `check:op:h4`, `check:r4:s2`, `check:r4:s4`, `check:r4:s5`, `check:awia:staging-prep` all re-confirmed passing.

Follow-up: the product owner also raised that the current web UI (`apps/web/public/index.html`/`app.js`) is an internal operator/engineering console (25+ nav sections named after sprints and subsystems), not the intended business-owner-facing "hire a virtual worker and run your business" workspace. That UI direction is a separate, larger piece of work to be scoped and authorized on its own before building.

## ADR-076 - Real "hire a virtual worker" one-at-a-time flow (closes ADR-074's incremental-hire follow-up)

Date: 2026-09-06
Status: Accepted

Decision: Added `POST /awia/virtual-staff/hire-worker` so a business owner can hire ONE named AWIA virtual staff member into their firm's team at a time, instead of only the whole-roster, one-shot template flow (`provision-from-template`). Repeated hires of the same role auto-generate the next staff code (`CFO-001`, then `CFO-002`, ...) using a deterministic per-item id scheme, so the team grows safely without colliding with previously hired staff. The firm's provisioning-run summary is always recomputed from its full current roster, never just the latest hire's delta.

Rationale: this closes the gap ADR-074 explicitly flagged as an open follow-up ("does not implement per-seat incremental hiring after a firm's first roster"). It is a precondition for a genuine "My Team / Hire a Worker" UI (raised directly by the product owner as a UI-vision concern) - a hire button that only works once per firm would be cosmetic, not real.

Boundaries: this decision authorizes no live payment capture and no change to runtime authority. Hiring is currently limited to the five roles with a defined tool policy (`CFO`, `FAO`, `SAO`, `OPO`, `ARO` - see `defaultToolPolicyByRole` in `awia-virtual-staff-authority-gate.mjs`); hiring `CMO`/`CTO`/`CIO`/`CHRO`/`COO` (registered in the package registry but with no tool policy yet) is rejected with a clear `role_not_hireable_yet` message rather than silently creating a worker that can never pass a task-readiness gate. A hired worker still starts `DRAFT` and must be explicitly activated by a human operator before it can pass the readiness gate - proven directly in the new smoke test (readiness denied before activation, allowed after).

Evidence: `apps/api/src/store.mjs` (`hireAwiaFirmWorkerRecord`, `nextAwiaStaffCodeForRole`); `apps/api/src/server.mjs` (`POST /awia/virtual-staff/hire-worker`; `awia-firm-package-assignments` added to the generic list-collection map); `scripts/smoke-awia-hire-a-worker.mjs` (`npm run check:awia:hire-a-worker`) - covers: no-package rejection, unmapped-role rejection, sequential staff-code generation across repeat hires of the same role, a mixed-role team, and the full before/after-activation readiness proof; `npm run check:awia:package-gating`, `check:awia:template-scaling`, `check:op:h3`, `check:op:h4`, `check:r4:s2`, `check:r4:s4`, `check:r4:s5`, `check:awia:staging-prep` all re-confirmed unaffected.

Follow-up: `CMO`/`CTO`/`CIO`/`CHRO`/`COO` staying unmapped is a real scope boundary the product owner may want lifted later (their AIWA source packages already exist under `C:\Users\user\Documents\00 Agent Skills\`) - would need a `defaultToolPolicyByRole` entry per role before it becomes hireable. Next: a business-owner-facing "My Team" web UI wired to this endpoint (in progress, separately authorized by the product owner's UI-direction feedback).

## ADR-077 - "My Team / Hire a Worker" business-owner-facing web screen

Date: 2026-09-06
Status: Accepted

Decision: Added a new top-level "My Team" screen to the existing web app (`apps/web/public/index.html`, `app.js`, `styles.css`) as the first step of the "Restructure current app" UI direction the product owner confirmed. It is inserted as a nav button and workspace section alongside Dashboard, ahead of the existing operator-styled sections. It shows: a plain-language setup step ("Turn on hiring for this firm", calling `POST /ops/awia-package-assignment` with `HIRE_ME`) when no package is assigned yet; a card per hireable role (CFO/FAO/SAO/OPO/ARO) with a one-click "Hire a {ROLE}" button calling the real `POST /awia/virtual-staff/hire-worker` endpoint from ADR-076; and a team table (name, role, status, "N waiting on you" pending-approval count, activate/pause) driven entirely from live `awia_virtual_staff_members` / `awia_staff_role_assignments` / `awia_staff_lifecycle_events` data - no hardcoded role/staff-code map, unlike the pre-existing "AI Workforce" operator panel. Every action still requires the existing human activation/approval steps; nothing here grants a virtual worker output authority on its own.

Rationale: directly addresses the product owner's UI-direction concern ("I dont see any vFirm i dream of... where a business owner hire virtual worker... just like human run business operation") without a ground-up rebuild - the product owner confirmed "Restructure current app" plus "My Team / Hire a Worker" as the first screen to build, of a larger relocation of operator/engineering sections (Ops, Audit, Service Pack, Pilot, Expansion, Usage/Billing, Commercial Launch, Review Board, Network) into a separate Admin area still to come.

Boundaries: this decision authorizes no live payment capture and no change to runtime authority or approval requirements. It only adds a new business-owner-facing view and wires it to already-accepted endpoints (ADR-075/ADR-076); it does not remove, rename, or otherwise touch any existing operator view, and does not yet build the Admin-area relocation. Hiring remains limited to the five tool-policy-mapped roles per ADR-076.

Evidence: `apps/web/public/index.html` (`data-view="my-team"` nav button, `#view-my-team`/`#myTeamView` section); `apps/web/public/app.js` (`renderMyTeamModule`, `bindMyTeamControls`, `MY_TEAM_HIREABLE_ROLES`, wired into `renderRecordViews` via `safeRenderModule`); `apps/web/public/styles.css` (`.my-team-role-grid`/`.my-team-role-card`); `scripts/smoke-web-navigation-renderers.mjs` extended with a "My Team" marker block (nav/section/renderer/data-attribute/CSS markers) and a stale pre-existing Audit-guard assertion made whitespace-tolerant (it was failing identically on the prior commit, unrelated to this change - confirmed via `git stash`); `npm run check:web`, `check:web-api`, `check:web:navigation`, `check:web:multitenant` all re-confirmed passing.

Follow-up: the pre-existing "AI Workforce" operator panel's hardcoded `AWIA_STAFF_ROLE_CODE` map (keyed to fixed pilot staff codes) does not recognize incrementally-hired codes like `CFO-002` - a latent gap in that older panel, unaffected by and out of scope for this new screen. Next screens in the "Restructure current app" direction (Work/task board, Approvals inbox, Clients/Projects/Invoices as business-facing views, and relocating the remaining operator sections into an Admin area) should be scoped and confirmed with the product owner individually, per the established pattern in this sprint, before being built.

## ADR-078 - "Work" screen: give hired workers real tasks, review their drafts, approve for clients

Date: 2026-09-06
Status: Accepted

Decision: Added a "Work" screen next to My Team so a business owner can act on what they hired: assign a real task (from the ordinary front-desk/intake/proposal/accept pipeline, not a synthetic id) to an active hired worker, get the worker's draft, approve it or send it back for revision, and prepare an approved draft for client delivery - reusing the same assign-task/output-draft/output-review/client-delivery-draft endpoints already proven by the operator-facing AI Workforce panel, but computing each worker's role from live `awia_staff_role_assignments` data (works for any incrementally-hired staff code, e.g. `CFO-002`) instead of that older panel's hardcoded staff-code map, and resolving the client for a client-ready draft from the task's real project/relationship instead of a guessed fallback client id.

While building the end-to-end backend smoke proof for this screen, found and fixed a real defect in the screen itself before it shipped: the assign form was sending `evidence_refs: []`, but the runtime authority gate denies `CONTROLLED`-risk assignment with `EVIDENCE_REQUIRED` when no evidence reference is supplied - meaning the "Assign" button as first written would have failed on every real click. Added a required "Reference" field to the assign form (a document, file, or note the task relates to) and wired it into `evidence_refs`.

Rationale: this is the second half of "what each hired worker can DO," directly answering the product owner's "let's proceed to see what we can offer" - hiring alone does nothing without a way to actually give work to a hired worker and see it through the human-approval loop.

Boundaries: this decision authorizes no live payment capture and no change to runtime authority or the human-approval requirement. Every draft still requires explicit human review before a client delivery draft can be prepared, and every client delivery draft still carries `final_issue_allowed: false` (final client issue remains a separate, already-governed step). Hiring/assignment still limited to the five tool-policy-mapped roles per ADR-076.

Evidence: `apps/web/public/app.js` (`renderWorkModule`, `bindWorkControls`, `awiaRoleCodeForStaffCode`, `awiaToolOptionsForRoleCode`, `awiaClientIdForTask`, wired into `renderRecordViews` via `safeRenderModule`); `apps/web/public/index.html` (`data-view="work"` nav button, `#view-work`/`#workView` section); `scripts/smoke-web-navigation-renderers.mjs` extended with a Work screen marker block; `scripts/smoke-awia-work-assignment.mjs` (`npm run check:awia:work-assignment`) - a real end-to-end backend proof driving hire-worker -> activate -> front-desk enquiry -> qualify -> handoff -> intake -> proposal -> approve -> accept (real client/project/task) -> assign-task -> output-draft -> output-review (revision then approval) -> client-delivery-draft, including resolving the client id the same way the UI does and confirming it matches the real relationship (not a guessed id); `npm run check:web`, `check:web-api`, `check:web:navigation`, `check:web:multitenant` all re-confirmed passing after the evidence-ref fix.

Follow-up: the "Send back for revision" path leaves a workdesk item at `REVIEW_ACTION_REQUIRED` with no way to produce a new draft from the UI - `produceAwiaStaffOutputDraftRecord` only accepts items in `ASSIGNED` status, so a genuine re-draft-after-revision loop needs a backend change first; the current screen only shows this state as informational rather than offering an action that would fail. That is a real gap for a future sprint, not something papered over with a UI button that silently errors.

## ADR-079 - "Approvals" screen: dedicated business-owner review inbox (replaces old operator-only "Approvals" nav item)

Date: 2026-09-14
Status: Accepted

Decision: Added a dedicated "Approvals" inbox screen next to My Team/Work so a business owner has one place to see everything currently waiting on their decision, instead of only acting on it row-by-row inside the Work screen. It shows two sections built from the same live data Work already uses: "Needs Your Review" (every `awia_staff_output_draft` at `DRAFT_REVIEW_REQUIRED`, with the worker, the task, what they produced, an optional notes field, and Approve/Send-back buttons calling the same `POST /awia/virtual-staff/output-review` endpoint as Work) and "Ready to Send" (every `awia_client_delivery_draft`, shown as prepared and waiting - sending to the actual client remains a separate, already-governed step this screen does not perform).

While building this, discovered a genuine pre-existing naming/id collision: an operator-only "Approvals" nav button and section already existed in `index.html`/`app.js` (between Projects and Invoices), rendering a raw, read-only `store.approvals` audit table (subject/decision/authentication-strength/id) via the generic `renderRecordView` helper - functionally and purposefully distinct from this new draft-review inbox, but colliding on the same `data-view="approvals"` / `#view-approvals` / `#approvalsView` ids. This was caught by actually running `scripts/smoke-web-navigation-renderers.mjs`, which correctly failed with "Duplicate workspace-view section ids detected." Surfaced to the product owner rather than silently picking a resolution; the product owner asked to first confirm this work is not a diversion from the sprint plan. Checked `VFIRM_AWIA_HIRE_A_VIRTUAL_WORKER_UNIFIED_SPRINT_PLAN_AND_CHECKLIST_v1.0.md` in full and confirmed the Phase E status update explicitly names "package-selection / hire-a-worker / business-operations" (i.e. this My Team/Work/Approvals line of work) as the next roadmap work while payment itself stays deferred per ADR-073 - reported this back with the exact passage before proceeding. Product owner then confirmed: the new business-owner Approvals inbox replaces the old operator-only "Approvals" nav item as the top-level "Approvals" screen; the old view's code and its underlying data (`store.approvals`) are kept in the codebase, just removed from the main nav and from the `#approvalsView` render slot, consistent with the "move operator-only views out of the main nav" direction already set for My Team/Work (ADR-077 follow-up).

Rationale: completes the third leg of "what a hired worker can offer" - hire (My Team), assign and produce (Work), and now a single dedicated place to decide, rather than requiring the owner to already be on the Work screen to notice something needs a decision. Also resolves a real (not hypothetical) structural defect the smoke suite caught before it reached the user's device.

Boundaries: this decision authorizes no live payment capture, no change to runtime authority, and no change to the human-approval requirement itself - it only adds a second, focused way to reach the same already-governed `output-review` decision Work already exposes. The old operator-only raw-approvals audit table is not deleted; its rendering code and data remain in the codebase for a possible future Admin/Audit-only surface, per the product owner's explicit instruction, and is simply no longer wired to a nav button or workspace section.

Evidence: `apps/web/public/app.js` (`renderApprovalsModule`, `bindApprovalsControls`, `__approvalsDelegationBound`, wired into `renderRecordViews` via `safeRenderModule("#approvalsView", "Approvals", renderApprovalsModule, store)`; old inline `safeRenderModule("#approvalsView", "Approvals", () => renderIfSubscribed(..., renderRecordView({...store.approvals...})))` call removed and replaced with an explanatory comment pointing to this ADR); `apps/web/public/index.html` (single `data-view="approvals"` nav button positioned after Work, single `#view-approvals`/`#approvalsView` section positioned after Work's section; the old duplicate nav button and section between Projects and Invoices removed); `scripts/smoke-web-navigation-renderers.mjs` extended with an Approvals screen marker block (nav/section/renderer/data-attribute markers) - re-run directly and confirmed passing with no duplicate-id error (`nav_views: 27`, `workspace_sections: 27`, all markers found) after the fix, having first reproduced the duplicate-id failure before the fix.

Follow-up: `npm run check:web`, `check:web-api`, and `check:web:multitenant` still need to be run and confirmed by the product owner in PowerShell (the device shell bridge remains down as of this ADR, a tracked Anthropic-side issue unrelated to this project); the same "Restructure current app" relocation of remaining operator-only sections (Ops, Audit, Service Pack, Pilot, Expansion, Usage/Billing, Commercial Launch, Review Board, Network, and now this preserved raw-approvals table) into a separate Admin area remains unscoped and should be confirmed individually with the product owner before being built, per the established pattern.

## ADR-080 - Admin Console / Owner Workspace split, Phase 1: backend "Archived" state for the future Workdesk screen

Date: 2026-09-15
Status: Accepted (Phase 1 of `VFIRM_ADMIN_CONSOLE_AND_OWNER_WORKSPACE_SPRINT_PLAN_AND_CHECKLIST_v1.0.md`)

Decision: Following a product-owner discussion on splitting the app into an Admin console (operator/engineering) and an Owner workspace (business-owner-facing, with an Inbox/Pending/Approval/Outbox/Archived "Workdesk" model), this ADR covers Phase 1 only: the backend additions the discussion identified as a real prerequisite, not yet any UI change. Reading `apps/api/src/store.mjs` confirmed there was genuinely no terminal "sent" or "closed" state anywhere in the AWIA output-draft / client-delivery-draft lifecycle - `awia_client_delivery_drafts` had exactly one status (`CLIENT_DELIVERY_DRAFT_PREPARED`) with no endpoint ever advancing it further, and `REJECTED` output drafts or `REVIEW_ACTION_REQUIRED` workdesk items (the known ADR-078 re-draft gap) had no resting state either. Two additions close this gap: (a) `POST /awia/virtual-staff/client-delivery-draft/mark-sent`, moving a prepared client delivery draft to a new `OWNER_MARKED_SENT` status and its workdesk item to `ARCHIVED_SENT`, stamped with `marked_sent_by_actor_id`/`marked_sent_at` - explicitly an owner recordkeeping action only, never a real client transmission, payment, or final-issue action (`final_issue_allowed` stays `false`, unchanged); (b) `POST /awia/virtual-staff/workdesk-item/archive`, moving a dead-end workdesk item (stuck at `REVIEW_ACTION_REQUIRED`, or whose output draft was `REJECTED`) to `ARCHIVED_DISMISSED`, stamped with `archived_at`/`archived_by_actor_id`/`archived_reason`.

Rationale: without these two states, an "Archived" tab in the planned Workdesk screen would have nothing real to show - every item would stay forever in Pending/Approval/Outbox even after the owner had actually delivered it themselves or given up on a stuck revision. Building the states first, with their own end-to-end proof, keeps Phase 2/3 (nav split, Workdesk UI) from being built on top of an invented backend behavior that was never verified to work.

Boundaries: neither addition touches Phase E (payment/final-issue authority, still deferred per ADR-073) or authentication/authorization (still absent, tracked as a separate future sprint item per this sprint plan's section 2.5). `mark-sent` is refused if the delivery draft is not still `CLIENT_DELIVERY_DRAFT_PREPARED` (cannot be called twice). `archive` is refused for a workdesk item that is not actually at a dead end (e.g. still `ASSIGNED`) - both guards are proven failing correctly, not just the happy paths. This ADR does not fix the ADR-078 re-draft-after-revision gap; archiving only stops a stuck item from looking actionable forever, it does not add the missing redraft capability.

Evidence: `apps/api/src/store.mjs` (`markAwiaClientDeliveryDraftSentRecord`, `archiveAwiaStaffWorkdeskItemRecord`); `apps/api/src/server.mjs` (`markAwiaClientDeliveryDraftSent`, `archiveAwiaStaffWorkdeskItem` route handlers, registered as `POST /awia/virtual-staff/client-delivery-draft/mark-sent` and `POST /awia/virtual-staff/workdesk-item/archive`); `scripts/smoke-awia-workdesk-archive.mjs` (`npm run check:awia:workdesk-archive`) - a real end-to-end backend proof covering all four paths: full happy-path to `OWNER_MARKED_SENT` (readback verified via `GET /awia-client-delivery-drafts`), a `REVISION_REQUIRED` item archived as `review_action_dismissed_by_owner`, a `REJECTED` output archived as `output_rejected`, and both refusal guards (repeat mark-sent, archive of an in-progress item) confirmed to fail rather than silently succeed; `scripts/smoke-awia-work-assignment.mjs` re-run and confirmed still passing (no regression from the `store.mjs`/`server.mjs` changes); `package.json` (`check:awia:workdesk-archive` script registered).

Follow-up: Phase 2 (Admin console / Owner workspace nav split, dev-mode toggle) and Phase 3 (Workdesk screen replacing Work + Approvals) remain to be built per the sprint plan; `npm run check:web`, `check:web-api`, `check:web:navigation`, `check:web:multitenant`, and this ADR's new `check:awia:workdesk-archive` script still need to be run and confirmed by the product owner in PowerShell (device shell bridge remains down, tracked Anthropic-side issue).

## ADR-081 - Admin Console / Owner Workspace split, Phase 2: UI-only workspace switch, nav regrouped

Date: 2026-09-15
Status: Accepted (Phase 2 of `VFIRM_ADMIN_CONSOLE_AND_OWNER_WORKSPACE_SPRINT_PLAN_AND_CHECKLIST_v1.0.md`)

Decision: Added a topbar toggle ("Owner workspace" / "Admin console") that switches which of the app's 28 nav items and workspace sections are shown, and regrouped every existing nav button into one of the two lists from the sprint plan's section 3. Owner workspace: Dashboard, My Team, Work, Approvals, My Firm, Clients, Front Desk, Intake, Proposals, Projects, Invoices. Admin console: Workflow (the guided demo-loop screen), Administration, Sales & Accounts, Technical Delivery, AI Workforce, Network, Ops, Audit, Approval Records (see below), Service Pack, Pilot, Users, Support, Review Board, Expansion, Usage/Billing, Commercial Launch. "Workflow", "Users", and "Support" were not explicitly listed in the sprint plan's section 3 screen inventory; checked their actual content before classifying them - Workflow is the guided MVP demo-loop tool, Users manages `pilot_users`/`auth_provider_config`/`tenant_admin_policy` (pilot program access, not the owner's own team), and Support manages `support_cases`/`support_summary` (an ops tool) - all three are operator/engineering concerns, so all three went to Admin console.

The old raw `store.approvals` audit table - unwired from any nav item in ADR-079 to resolve its id collision with the new business-owner Approvals inbox, and left in the codebase per that ADR's explicit "keep the code, just don't wire it to a nav item" instruction - is now re-wired into the Admin console as its own distinct nav item, "Approval Records" (`data-view="approval-records"`, `#view-approval-records`/`#approvalRecordsView`), rather than staying permanently orphaned.

The switch itself (`applyWorkspaceMode()` in `app.js`) is explicitly UI-only: it shows/hides nav buttons by a `data-workspace="owner"|"admin"` attribute and persists the choice in `localStorage` (a per-device UI preference, the same pattern already used for the active-firm selector) - it does not gate, wrap, or alter any API call, and both workspaces still call the same backend with the same actor. This matches the product owner's explicit choice (a dev-mode toggle now, not real access control) from the discussion that produced the sprint plan; real authentication/authorization stays a separate, not-yet-scoped future sprint item.

Rationale: this is the structural half of the split the product owner asked for - separating "for development/admin after deployment" from "for client, self-explainable, simple but complete" - without inventing a fake security boundary that could mislead someone into thinking Admin console access is actually restricted today.

Boundaries: no login, password field, or access restriction was added or implied anywhere - a smoke-test assertion now explicitly checks for the absence of a password field or login form and for the presence of documentation stating the switch is UI-only. No existing screen's content or backend wiring changed other than the raw approvals table's re-wiring described above (same renderer logic, same `store.approvals` data, only its `target`/nav id changed to resolve the ADR-079 collision permanently instead of leaving it dangling). Work and Approvals stay in Owner workspace as-is; Phase 3 replaces them with the five-tab Workdesk screen.

Evidence: `apps/web/public/index.html` (`data-workspace` attribute on all 28 nav buttons, `#workspaceModeToggle`/`#workspaceModeOwner`/`#workspaceModeAdmin`, new `#view-approval-records`/`#approvalRecordsView` section); `apps/web/public/app.js` (`applyWorkspaceMode`, `WORKSPACE_MODE_STORAGE_KEY`, `WORKSPACE_MODE_DEFAULT_VIEW`, re-wired `safeRenderModule("#approvalRecordsView", ...)` reusing the exact `renderRecordView` shape ADR-079 preserved in a comment); `apps/web/public/styles.css` (`.workspace-mode-toggle`/`.workspace-mode-button`); `scripts/smoke-web-navigation-renderers.mjs` extended with: a workspace-mode marker block, an exhaustive per-nav-button `data-workspace` classification check (every one of the 28 views must appear in exactly one of an `OWNER_VIEWS`/`ADMIN_VIEWS` list, catching any future nav item added without a workspace assignment), an explicit "not a login" assertion, and Approval Records markers - re-run directly and confirmed passing (`nav_views: 28`, `workspace_sections: 28`, no duplicate ids). `npm run check:web` also re-run and confirmed still passing.

Follow-up: `npm run check:web-api` and `check:web:multitenant` still need to be run and confirmed by the product owner in PowerShell (their dependency scripts were not all staged into this session's sandbox, so they were not re-run here - unlike `check:web` and `check:web:navigation`, which were); Phase 3 (Workdesk screen replacing Work + Approvals with the Inbox/Pending/Approval/Outbox/Archived tabs, using the Phase 1 backend states from ADR-080) remains to be built.

## ADR-082 - Admin Console / Owner Workspace split, Phase 3: Work and Approvals retired in favor of one five-tab Workdesk screen

Date: 2026-09-15
Status: Accepted (Phase 3 of `VFIRM_ADMIN_CONSOLE_AND_OWNER_WORKSPACE_SPRINT_PLAN_AND_CHECKLIST_v1.0.md`)

Decision: Retired the separate Work and Approvals screens (`renderWorkModule`/`bindWorkControls`, `renderApprovalsModule`/`bindApprovalsControls`, their `#workView`/`#approvalsView` nav buttons and sections) in favor of one Owner-workspace screen, "Workdesk" (`data-view="workdesk"`, `#view-workdesk`/`#workdeskView`), with five tabs matching the sprint plan's section 4 model: Inbox, Pending, Approval, Outbox, Archived, switched client-side (`applyWorkdeskActiveTab`) without a full re-render. The five tabs are populated from the exact same data both retired screens already used, mapped onto the real workdesk-item/output-draft/client-delivery-draft lifecycle rather than the simplified two-status sketch in the sprint plan's table: Inbox = real tasks with no workdesk item yet; Pending = `workdesk_status: "ASSIGNED"`; Approval = output drafts at `"DRAFT_REVIEW_REQUIRED"` (Approve/Send back/Reject) plus items stuck at `"REVIEW_ACTION_REQUIRED"` (the ADR-078 re-draft gap - shown with an Archive/dismiss action, since no redraft path exists); Outbox = items at `"REVIEWED_FOR_CLIENT_DRAFT"` not yet prepared (Prepare for client) plus `awia_client_delivery_drafts` at `"CLIENT_DELIVERY_DRAFT_PREPARED"` (Mark sent, from ADR-080); Archived = delivery drafts at `"OWNER_MARKED_SENT"` and workdesk items at `"ARCHIVED_DISMISSED"` (both from ADR-080). Every action reuses an already-proven endpoint - `assign-task`, `output-draft`, `output-review` (now including the previously-unused `review_decision: "REJECTED"` path, proven by `smoke-awia-workdesk-archive.mjs`'s Path C), `client-delivery-draft` - plus the two Phase 1 endpoints, `client-delivery-draft/mark-sent` and `workdesk-item/archive`.

Rationale: this is the screen the product owner actually asked for in the original discussion - Inbox/Pending/Outbox/Approval/Archived as one mental model of "work moving through the office" - built only once the backend states it depends on (Phase 1/ADR-080) and the nav/workspace split it lives inside (Phase 2/ADR-081) were both already accepted and proven, so nothing here rests on an unverified assumption.

Boundaries: no new backend behavior, decision path, or authority is introduced - every tab and button is a different arrangement of the same governed steps Work and Approvals already exposed, calling the same endpoints with the same actor. Nothing reaches a client without the owner's approval at the same points as before. This does not fix the ADR-078 re-draft-after-revision gap; the Approval tab's Archive action only stops a stuck item from looking actionable forever. No real authentication/authorization was added; the Workdesk screen is gated by the same UI-only Owner-workspace/Admin-console toggle as everything else in Owner workspace (ADR-081). The old operator-only raw approvals audit table (Approval Records, in Admin console per ADR-081) is untouched.

Evidence: `apps/web/public/app.js` (`renderWorkdeskModule`, `bindWorkdeskControls`, `applyWorkdeskActiveTab`, `WORKDESK_TABS`, `__workdeskDelegationBound`; `awiaRoleCodeForStaffCode`/`awiaToolOptionsForRoleCode`/`awiaClientIdForTask` kept unchanged and reused; `renderRecordViews` now calls a single `safeRenderModule("#workdeskView", "Workdesk", renderWorkdeskModule, store)` in place of the two prior calls; `workspaceModuleDefinitions.approvals.default_view` and `viewModuleCodes` updated from `"approvals"`/`work` to `"workdesk"` so the My Firm module card's "Open work area" button and the subscription-visibility label still resolve to a real view); `apps/web/public/index.html` (single `data-view="workdesk"` nav button and `#view-workdesk"`/`#workdeskView` section replacing the two removed ones; topbar tooltip text updated); `apps/web/public/styles.css` (`.workdesk-tab-bar`/`.workdesk-tab-button`); `scripts/smoke-web-navigation-renderers.mjs` (`workMarkers`/`approvalsMarkers` blocks replaced with one `workdeskMarkers` block covering all five tabs, the two Phase 1 endpoints, and an explicit assertion that the retired renderers/nav buttons are actually gone, not left dangling alongside the new screen; `OWNER_VIEWS` updated to 10 entries; approval-records-vs-workdesk distinctness check updated) - re-run directly and confirmed passing (`nav_views: 27`, `workspace_sections: 27`, no duplicate ids, down from 28 as expected for a two-screens-into-one merge). `scripts/smoke-awia-work-assignment.mjs` and `scripts/smoke-awia-workdesk-archive.mjs` re-run directly against a live local API server and confirmed still passing with no regression (these already prove the full Inbox(assign)->Pending->Approval->Outbox->Archived path end to end at the backend level, satisfying the sprint plan's Phase 3 request for an end-to-end smoke test of that path; no new backend endpoint was added in this phase, so no new backend smoke test was needed). `node --check` passed on all three edited JS/HTML-adjacent files.

Follow-up: Phase 4 remains - run `npm run check:web`, `check:web-api`, `check:web:navigation` (all three re-run and passing as of this ADR), and `check:web:multitenant` (dependency scripts not staged into this session's sandbox; still needs the product owner's PowerShell confirmation per the established pattern), write this ADR (done), and mark `VFIRM_ADMIN_CONSOLE_AND_OWNER_WORKSPACE_SPRINT_PLAN_AND_CHECKLIST_v1.0.md`'s status Accepted.

## ADR-083 - Admin Console / Owner Workspace split, Phase 4: full verification, sprint plan closed

Date: 2026-09-15
Status: Accepted (Phase 4 of `VFIRM_ADMIN_CONSOLE_AND_OWNER_WORKSPACE_SPRINT_PLAN_AND_CHECKLIST_v1.0.md` - final phase)

Decision: The product owner ran all four `npm run check:web*` commands in PowerShell against the Phase 3 (ADR-082) code on the device, closing the one item ADR-082 could not confirm from this session's sandbox (`check:web:multitenant`'s dependency scripts were never staged here). All four passed with no regressions: `check:web` ("Web smoke test passed"), `check:web-api` ("Web/API integration smoke test passed"), `check:web:multitenant` (all 8 checks passed, including `development_mode_full_feature_visibility` and `firm_client_relationship_scoping`, confirming the Workdesk merge did not disturb multi-tenant scoping), and `check:web:navigation` (`nav_views: 27`, `workspace_sections: 27`, no duplicate ids - matching the count already confirmed in this session's own sandbox run in ADR-082). This closes out the sprint plan: `VFIRM_ADMIN_CONSOLE_AND_OWNER_WORKSPACE_SPRINT_PLAN_AND_CHECKLIST_v1.0.md` is marked Accepted with every checklist item checked.

Rationale: Phase 3's own ADR (ADR-082) already re-ran `check:web`, `check:web-api`, and `check:web:navigation` directly in this session's sandbox and confirmed them passing; `check:web:multitenant` could not be run there because its dependency chain (`seed-nhl-global-solution-local.mjs` -> `smoke-nhl-global-solution-onboarding.mjs` -> further scripts) was never staged into the sandbox this session, a known limitation carried over from ADR-079/ADR-081. Rather than chase that dependency tree further, the established pattern in this project is for the product owner to confirm remaining checks in PowerShell on the real device - which is what happened here, closing the gap honestly rather than assuming it would pass.

Boundaries: this ADR authorizes no new code change - it is a verification-and-closeout record only. No backend, frontend, or test file was touched between ADR-082 and this ADR. The whole `VFIRM_ADMIN_CONSOLE_AND_OWNER_WORKSPACE_SPRINT_PLAN_AND_CHECKLIST_v1.0.md` scope (Admin console / Owner workspace nav split, Workdesk five-tab screen) is now closed; any further change to Workdesk, the Admin/Owner split, or the still-open items this sprint plan explicitly deferred (real authentication/authorization, the ADR-078 re-draft-after-revision gap, AI Workforce's hardcoded role map) is out of scope for this document and needs its own separate authorization.

Evidence: product owner's PowerShell transcript, this turn, showing all four commands run against the live device checkout and their real output (`check:web` -> "Web smoke test passed."; `check:web-api` -> "Web/API integration smoke test passed."; `check:web:multitenant` -> `{"smoke":"web-multitenant-workspace","result":"passed","checks":[8 items]}`; `check:web:navigation` -> `{"smoke":"web-navigation-renderers","result":"passed","nav_views":27,"workspace_sections":27,"renderer_functions":22,...}`).

Follow-up: None outstanding for this sprint plan - it is closed. Future work on vFirm (real auth, the ADR-078 gap, further "Restructure current app" work, or Phase E commercial activation per ADR-073) each requires its own separate product-owner authorization before any work begins, per the established "Proceed Phase N ... Bismillah" pattern.

## ADR-084 - "My Team" hiring model, HM-S1: hiring UI/data model only (no execution engine), position-to-skill catalogue, job-title relabel, Class-A approval routing gate, full regression pass

Date: 2026-09-17

Status: Accepted (HM-S1 sprint plan, all 7 checklist items closed - see Section 8, "vFirm Position-to-Skill Mapping v1.0")

Decision: The product owner authorized and, one checklist item at a time under the established "Proceed Item N ... Bismillah" gating process, accepted all seven items of the HM-S1 sprint for the "My Team" employee-for-hire business model:
(1) HM-S1 ships the hiring UI and data model only - no skill-execution engine. Option (a) was chosen over building execution now; HM-S2+ is reserved, as its own future, separately-authorized sprint, for wiring real skill execution against the position catalogue.
(2) A position-to-skill-subset catalogue was built covering the five starter positions - General Clerk (ARO, 15 skills, 0 Class A), Bookkeeper (FAO, 13 skills, 2 Class A), Sales Coordinator (SAO, 28 skills, 6 Class A), Ops Coordinator (OPO, 44 skills, 5 Class A), and HR Administrator (ARO, 19 skills, 12 Class A) - totalling 119 skills and 25 Class A skills, matching the doc's own counts exactly and self-validated by a dedicated checker function.
(3) `HIREABLE_ROLES` in the web console's `api.js` was re-keyed so each entry carries a client-facing job title (`role_name`) alongside its underlying capability reference (`role_code`), covering all five new positions plus the existing CFO role.
(4) The My Team UI (hire cards and roster) was relabelled end-to-end to show job titles only; raw role-code text was removed from every client-facing surface. A `display_name` override is now passed through at hire time as a partial mitigation for a known gap: General Clerk and HR Administrator both currently map to `role_code:"ARO"`, so the hire-worker API cannot yet natively distinguish them by role code alone.
(5) A deterministic Class-A approval-routing gate was built: every Class A skill routes to the firm owner by default, with a structural guarantee that preparer and approver can never be the same actor (no self-approval path, even as a latent bug), verified exhaustively across all 25 Class A skills with zero failures. This gate is built and tested but not yet wired to any live HTTP path, since no skill-execution engine exists yet - wiring it is explicitly HM-S2 scope.
(6) A regression check confirmed the hiring-model changes (items 2-5) did not disturb the existing dev-header auth flow, the real external-auth-provider flow, or any other previously-passing behavior: the product owner ran all six targeted `npm run check:*` smoke commands in PowerShell against the live device checkout, and all six passed (`check:stage11`, `check:stage12`, `check:awia:vs:s2`, `check:awia:vs:s3`, `check:awia:vs:s4`, `check:awia:hire-a-worker`).
(7) This ADR-084 entry itself, recording the full HM-S1 decision, mirroring how `SF-Sx`/`ME-Sx` sprints are recorded in this register.

Rationale: The hiring model needed a first, tightly-scoped sprint that could ship and be verified end-to-end without taking on the much larger and riskier problem of live skill execution at the same time. Separating "can the firm owner hire named staff into job-title roles with correct approval routing" (HM-S1, data/UI only) from "can that hired staff actually execute skills" (HM-S2+, deferred) let each of the five build items be reviewed and accepted individually against a concrete, auditable artifact (the position catalogue's self-check, the approval gate's exhaustive no-self-approval verification) rather than as one large, harder-to-inspect change. Following the project's own "Proceed Item N ... Bismillah" pattern for each of the seven items - rather than batching them - kept the product owner in control of every step and let each item be validated (via `node --check`, the catalogue/gate self-checks, or live smoke-test runs) before the next began.

Boundaries: This ADR authorizes no new code beyond what items 2-6 already built and the product owner already accepted; it is a decision-and-closeout record for HM-S1, following the same pattern as ADR-083. HM-S1 explicitly does NOT include: a skill-execution engine (deferred to HM-S2+, requiring its own separate authorization); a live HTTP path wiring the Class-A approval-routing gate into request handling (also HM-S2+); or a full server-side fix for the General Clerk / HR Administrator role-code ambiguity (`display_name` is a client-side partial mitigation only - a complete fix needs a server-side position field, which is out of scope here). No smoke-test script covering the real Supabase-auth-provider flow specifically was found to exist in `scripts/`; the only regression evidence for that specific flow remains the product owner's own earlier manual confirmation ("The login is now green and clean") from a prior sprint, and this gap is recorded here rather than glossed over. Any future change to skill execution, approval-gate wiring, or the ARO role-code ambiguity requires its own separate product-owner authorization before work begins, per the established gating process.

Evidence: New files - `packages/core-domain/src/awia-virtual-staff-position-catalogue.mjs` and its `.ts` type companion (position catalogue, self-validated `{ok:true, summary:{position_count:5, total_skill_count:119, total_class_a_count:25}}`); `packages/core-domain/src/awia-virtual-staff-class-a-approval-routing.mjs` and its `.ts` type companion (approval-routing gate, self-verified `{ok:true, class_a_skills_checked:25, failures:[]}`). Edited files - `apps/web-console/public/js/api.js` (`HIREABLE_ROLES` re-keyed to job titles, verified with `node --check`); `apps/web-console/public/js/pages-owner.js` (My Team UI relabelled to job titles, `jobTitleForRoleAssignment()` helper added, `display_name` wired through at hire time, verified with `node --check`). Regression evidence - product owner's PowerShell transcript, this sprint, showing all six targeted smoke commands passing against the live device checkout: `check:stage11` ("Stage 11 external auth and pilot user smoke test passed."), `check:stage12` ("Stage 12 real auth provider and tenant admin smoke test passed."), `check:awia:vs:s2`/`s3`/`s4` (full JSON pass output), and `check:awia:hire-a-worker` ("AWIA hire-a-worker (HireMe, one-at-a-time) smoke passed.").

Follow-up: HM-S1 is now closed - all 7 checklist items in Section 8 of "vFirm Position-to-Skill Mapping v1.0" are complete. The next step, HM-S2 (real skill execution against the position catalogue, and wiring the Class-A approval-routing gate to a live HTTP path), is a separate future sprint requiring its own product-owner authorization before any work begins, per the established "Proceed Phase N ... Bismillah" pattern. The General Clerk / HR Administrator role-code ambiguity (both `ARO`) and the absence of a Supabase-real-auth-specific smoke script are both recorded here as residual items for whenever that area of work is next authorized.

## ADR-085 - "My Team" hiring model, HM-S2: real skill execution pilot (General Clerk / ARO-01 Administrative Request Triage), authority-gate extension, Workdesk UI correctness fix, full regression pass

Date: 2026-09-17

Status: Accepted (HM-S2 sprint plan, all 7 checklist items closed - see Section 9, "vFirm Position-to-Skill Mapping v1.0")

Decision: The product owner authorized and, one checklist item at a time under the established "Proceed Item N ... Bismillah" gating process, accepted all seven items of the HM-S2 sprint, the execution sprint reserved by HM-S1 item 1's decision:
(1) Execution-scope decision: the pilot is scoped to a single skill only, not a rollout - General Clerk (ARO) / ARO-01 Administrative Request Triage, chosen for being the simplest possible first real-execution case (deterministic, no PII, no SOD, no external system dependency).
(2) Output-draft & review data model audited directly against `apps/api/src/server.mjs`/`store.mjs`: a full generic pipeline (assign-task -> output-draft -> output-review -> client-delivery-draft -> mark-sent) already existed and needed no new schema, but two real gaps were found and closed in item 4 - the runtime authority gate was keyed by a hard-coded per-role tool list with no concept of individual catalogued skills, and the output-draft record had no field for actual generated content.
(3) N/A, correctly deferred - ARO-01 is Class B, so HM-S1's Class-A approval-routing gate does not apply to this pilot and remains unwired, ready for whichever future sprint first pilots a Class A skill.
(4) The pilot execution path was built for real, not cosmetically: a new deterministic ARO-01 triage classifier (self-verified against 6 fixtures across every category, 0 failures), one new allowed action (`administration.request.triage`) added to the ARO role's tool policy, an additive `output_payload` field on the output-draft record to carry the real classification result, and a full smoke test proving hire -> denied-pre-activation -> activate -> real client/task via the ordinary front-desk-intake-proposal-accept pipeline -> allowed-post-activation -> an out-of-role action still denied -> real triage on a real sample request -> output-draft carrying that exact result -> human review -> client-delivery-draft, with `final_issue_allowed: false` held throughout.
(5) My Team / Workdesk UI surfacing: while wiring the pilot's output into the existing Workdesk page, found that page had never actually worked for real AWIA data (it read field names and status values that do not exist on the real schema) - fixed it to classify and display on the real `workdesk_status` values and show the pilot's actual output, including a compact preview of `output_payload`.
(6) Regression check: the product owner ran nine targeted smoke commands in PowerShell against the live device checkout, and all nine passed - the new pilot test itself, the two existing tests most directly touched by this sprint's edits to `store.mjs` and the authority gate, and a re-run of HM-S1's original six smoke commands to confirm the further edits to those same shared files introduced no regression.
(7) This ADR-085 entry itself, recording the full HM-S2 decision, mirroring how HM-S1 was recorded as ADR-084.

Rationale: HM-S1 deliberately deferred all skill-execution work to a separately authorized sprint; HM-S2 was scoped to the smallest possible slice of that work - one skill, chosen for being the lowest-risk possible case - so that the first real execution path could be built and verified end-to-end without the much larger risk of a full rollout. Auditing what already existed (item 2) before building anything, rather than assuming a gap, avoided rebuilding a data model that was already correct and focused the actual build effort (item 4) on the two real, verified gaps. Following the "Proceed Item N ... Bismillah" pattern for each of the seven items, exactly as in HM-S1, kept the product owner in control of every step, including the owner's own choice of which specific skill (ARO-01) to pilot.

Boundaries: This ADR authorizes no new code beyond what items 1-6 already built and the product owner already accepted; it is a decision-and-closeout record for HM-S2, following the same pattern as ADR-084. HM-S2 explicitly does NOT include: executing any skill beyond the single ARO-01 pilot; rolling out execution across General Clerk's other 14 skills, the other four positions, or any of the remaining catalogued skills; wiring the Class-A approval-routing gate to a live path (no Class A skill has been piloted yet); COO as a hired/deployed position; or any change to the position catalogue's content or authority classes. Any future change extending execution to another skill, another position, or a Class A skill requires its own separate product-owner authorization before work begins, per the established gating process.

Evidence: New files - `packages/core-domain/src/awia-virtual-staff-aro01-request-triage.mjs` and its `.ts` type companion (deterministic ARO-01 classification logic, self-verified `{ok:true, fixtures_checked:6, failures:[]}`); `scripts/smoke-awia-hm-s2-aro01-triage-pilot.mjs` (new smoke test, aliased `npm run check:hm-s2:aro01-pilot`). Edited files - `packages/core-domain/src/awia-virtual-staff-authority-gate.mjs` (`administration.request.triage` added to the ARO role's allowed tool list); `apps/api/src/store.mjs` (`output_payload` field added to `produceAwiaStaffOutputDraftRecord`, additive and backward-compatible); `apps/web-console/public/js/pages-owner.js` (`classifyWorkdeskItem()` fixed to the real `workdesk_status` values including `ARCHIVED_DISMISSED`, Workdesk table rebuilt to show real assignment/output/status fields); `package.json` (new `check:hm-s2:aro01-pilot` script alias). All files verified with `node --check` before commit. Regression evidence - product owner's PowerShell transcript, this sprint, showing all nine targeted smoke commands passing against the live device checkout: `check:hm-s2:aro01-pilot` (real end-to-end pilot run, `staff_code: "ARO-001"`, triage result `IT_SUPPORT`/`HIGH`/`IT_SUPPORT_QUEUE`), `check:awia:work-assignment`, `check:awia:workdesk-archive`, `check:stage11`, `check:stage12`, `check:awia:vs:s2`/`s3`/`s4`, `check:awia:hire-a-worker`.

Follow-up: HM-S2 is now closed - all 7 checklist items in Section 9 of "vFirm Position-to-Skill Mapping v1.0" are complete. HM-S3 (clean onboarding and legacy pilot roster reconciliation, later rescoped to a database-wiring pivot plus template-scaling hardening) is a separate future sprint requiring its own product-owner authorization, per the established gating process.

## ADR-086 - "My Team" hiring model, HM-S3: live database wiring pivot, legacy pilot-provisioning lockdown, template-catalogue and staff-code hardening, full regression pass, sprint closed

Date: 2026-09-20

Status: Accepted (HM-S3 sprint plan, all 8 checklist items closed - see Section 10, "vFirm Position-to-Skill Mapping v1.0")

Decision: The product owner authorized and, one checklist item at a time under the established "Proceed Item N ... Bismillah" gating process, accepted HM-S3, originally scoped as legacy pilot-roster cleanup and rescoped mid-sprint following a database-wiring decision:
(0) Item 0, the sprint's actual first and highest-priority change: pointed `DATABASE_URL` at the real Supabase project's own Postgres and started it genuinely empty, with no migration of the old local Postgres's Amanah Formwork Pilot Firm or NHL Global Solution pilot data into it. Verified via the new `npm run check:hm-s3:empty-db-wiring` script: `persistence_backend: "postgres-relational-ledger"` with zero clients/proposals/projects/AWIA-staff/package-assignments, only one real tenant and firm belonging to the one genuine Supabase Auth signup (`nhl.global.solution@gmail.com`), created through the ordinary self-serve flow and kept by product-owner decision as the real starting company rather than wiped.
(1)-(3) Rescoped to moot on 2026-09-18: the legacy `firstPilotStaffSet` roster audit, retire-decision, and UI-separation items no longer applied, since that roster's records lived only in the old, now-abandoned local Postgres and do not exist in the new live database at all.
(4) Locked down `POST /awia/virtual-staff/provision-pilot` behind a default-deny gate (`VFIRM_ALLOW_LEGACY_PILOT_PROVISION`, 403 `LEGACY_PILOT_PROVISIONING_LOCKED` unless explicitly set to `"true"`) so it can no longer inject an ungated legacy-style roster into any firm in the live database, while leaving the capability available for a genuine future pilot exercise via deliberate opt-in. Verified via `npm run check:hm-s3:provision-pilot-locked`. A related finding surfaced during this item's verification - `POST /mvp/reset` wiped the entire database with no gate at all - was fixed the same way (`VFIRM_ALLOW_FULL_STORE_RESET`, verified via `npm run check:mvp-reset-locked`).
(5) Built and verified an end-to-end "clean onboarding" acceptance check (`npm run check:hm-s3:clean-onboarding`): signs up a brand-new firm through the real `POST /auth/signup-firm` flow with a real, disposable Supabase Auth test user and asserts it starts with zero clients/staff/proposals/projects/outbox items while the shared catalogues remain visible; cleans up fully afterward. Required building a prerequisite, a name-gated test-firm purge capability (`purgeTestFirmRecord` / `POST /internal/purge-test-firm`, default-deny via `VFIRM_ALLOW_TEST_FIRM_PURGE`, and independently refuses any firm whose name doesn't start with the literal `"HM-S3 Smoke Test Firm"` prefix so it can never reach a real firm even on a test-script bug). All 10 steps pass, `overall_pass: true`.
(6) Removed real pilot-firm names from shared AWIA staff-template catalogue copy: `formwork_engineering_standard_v1`'s description in `packages/core-domain/src/awia-virtual-staff-templates.mjs` no longer names "Amanah Formwork Pilot Firm" or "NHL Global Solution", preserving the factual roster composition without naming real firms; audited the other two templates and found no issue there. Verified via `npm run check:hm-s3:template-copy-clean`: `template_count: 3`, `findings: []`, `is_clean: true`.
(7) Aligned bulk-template hiring's staff-code generation with the per-firm incremental `ROLE-NNN` generator single hiring already used, closing a real gap: `finance_back_office_v1`'s hardcoded `staff_code` literals (`FAO-AP-001`, `FAO-REV-001`, `DATA-001`, all `role_code: "FAO"`) didn't match that shape, so the generator couldn't see them and would mint a colliding or non-sequential code on a later single hire of the same role. Presented to the product owner as a genuine design tradeoff (generate codes at hire time vs. patch the generator's matching regex vs. defer); the product owner chose to generate codes at hire time. Implemented in `apps/api/src/store.mjs` via a new `maxAwiaStaffCodeSuffixForRole` helper (shared with the existing single-hire generator) and `generateAwiaStaffCodesForRoster`, which mints sequential `ROLE-NNN` codes for an entire roster in one pass; `evaluateAwiaFirmPackageSeatGate` is unaffected since it only reads `role_code` and count, never `staff_code`. Verified via `npm run check:hm-s3:template-alignment`, all 10 steps pass. This verification run also surfaced a real, separate bug: `purgeTestFirmRecord`'s Postgres branch predated AWIA staff hiring and never deleted from the 17 relational tables migration `0024_awia_virtual_staff_persistence.sql` added, so purging a test firm that had hired any AWIA staff failed with a 23503 foreign-key violation on `firms`. Fixed by adding `delete ... where firm_id = $1` for all 17 tables before the `firms` row delete; re-verified passing. One orphaned test firm and Supabase Auth test user left behind by the first, pre-fix failed run were cleaned up afterward via a one-off script. `resetStore()` (behind the now-locked-down `/mvp/reset`) has this identical gap across the same 17 tables; not fixed here since that route is disabled by default and this was out of scope for item 7's gating work - recorded as a known issue for a future regression/hardening pass.
(8) Regression pass: the product owner ran nine targeted smoke commands in PowerShell against the live device checkout - the full OP-H1 through OP-H6 controlled multi-firm pilot operations suite, HM-S1's `check:awia:hire-a-worker`, HM-S2's `check:hm-s2:aro01-pilot`, and a re-run of `check:hm-s3:empty-db-wiring` - and all nine completed successfully. OP-H3 through OP-H6 initially failed against item 4's lockdown, since those rehearsal scripts spin up their own disposable API server per run and call the now-gated `provision-pilot` route directly for their controlled pilot-day setup; re-run with `VFIRM_ALLOW_LEGACY_PILOT_PROVISION=true` set in the same shell that invokes them, all four then passed cleanly - a deliberate, expected use of the item 4 override for a genuine pilot exercise, not a regression. `check:hm-s3:empty-db-wiring`'s re-run correctly reports the database is no longer empty (4 tenants, 4 firms, 17 AWIA virtual staff members, 6 firm package assignments) - real accumulated activity from this and prior sprints' live-database testing, not a defect. This ADR-086 entry itself, recording HM-S3's closure, restoring ADR-085 (found missing from this register - see Boundaries), and recording the Item 0 database-wiring pivot together with items 1-3's resulting mootness.

Rationale: The sprint's original premise - auditing and retiring a legacy pilot-firm roster - was overtaken mid-sprint by a more fundamental decision to point the app at a real, live Supabase database rather than continue building on the old local Postgres; the product owner made that call first and the remaining items were re-scoped around protecting the new clean database going forward, rather than continuing to plan around data that no longer exists anywhere the app reads from. Items 4-7 close real, verified gaps discovered by direct investigation rather than assumption (the provision-pilot escape hatch, the un-gated full-reset route, named real firms in shared copy, and a staff-code generator blind spot that only surfaced once bulk-template hiring was exercised against a firm that later single-hired the same role) - each fixed with a default-deny gate or a targeted code change, verified live against the real database, and following the "Proceed Item N ... Bismillah" pattern item by item exactly as HM-S1 and HM-S2 did. Item 8's regression pass exists precisely to catch cross-sprint breakage before closing the sprint, and it did: OP-H3 through OP-H6's initial failures were a direct, traceable consequence of item 4's own lockdown rather than an unrelated defect, and were resolved by using the lockdown's own documented override rather than by weakening the gate.

Boundaries: This ADR authorizes no new code beyond what items 0 and 4-8 already built and the product owner already accepted; it is a decision-and-closeout record for HM-S3, following the same pattern as ADR-084 and ADR-085. Also recorded here: ADR-085 itself (HM-S2's closure record) was found missing from this register when this entry was drafted, despite having been written and confirmed complete in an earlier session - almost certainly the same silent-write-failure pattern this sprint hit repeatedly with `device_commit_files` reporting success while the write did not take effect, except this time on a file with no smoke test to catch it. It has been restored verbatim above from the session record and is not a new decision. HM-S3 explicitly does NOT include: a fix for `resetStore()`'s identical 17-table AWIA-relational-table gap (recorded as a known issue, deferred since `/mvp/reset` is disabled by default); any change to `awia_firm_package_assignments`, which lives in the JSONB `app_state` blob rather than a dedicated table and was not touched by the purge fix; or the OP-H6 acceptance gate's own separate `pending_product_owner_decision` status on controlled multi-firm pilot operations, which is a distinct decision from HM-S3's closure and remains open on its own. Any future change to database-reset behavior, the AWIA relational-table purge/reset symmetry, or the OP-H6 acceptance gate requires its own separate product-owner authorization or decision, per the established gating process.

Evidence: New files - `scripts/verify-hm-s3-empty-database-wiring.mjs` (`check:hm-s3:empty-db-wiring`); `scripts/verify-hm-s3-provision-pilot-locked.mjs` (`check:hm-s3:provision-pilot-locked`); `scripts/verify-mvp-reset-locked.mjs` (`check:mvp-reset-locked`); `scripts/smoke-hm-s3-item5-clean-onboarding.mjs` (`check:hm-s3:clean-onboarding`); `scripts/verify-hm-s3-item6-template-copy-clean.mjs` (`check:hm-s3:template-copy-clean`); `scripts/verify-hm-s3-item7-template-staff-code-alignment.mjs` (`check:hm-s3:template-alignment`). Edited files - `apps/api/src/server.mjs` (`provisionAwiaVirtualStaffPilot` and the full-store-reset handler both gated default-deny; `purgeTestFirm` name-gated purge route); `apps/api/src/store.mjs` (`purgeTestFirmRecord` extended to delete all 17 AWIA relational tables before the `firms` row; `maxAwiaStaffCodeSuffixForRole` and `generateAwiaStaffCodesForRoster` added; `provisionAwiaVirtualStaffFromTemplateRecord` updated to use the new generator); `packages/core-domain/src/awia-virtual-staff-templates.mjs` (`formwork_engineering_standard_v1` description de-named); `package.json` (six new `check:hm-s3:*` script aliases). All files verified via re-stage-and-diff against the live device checkout after each commit, following the established mitigation for this sprint's repeated silent-write-failure issue. Regression evidence - product owner's PowerShell transcript, this sprint, showing all nine targeted smoke commands passing against the live device checkout: `check:op:h1` (`foundation_locked`), `check:op:h2`, `check:op:h3`, `check:op:h4`, `check:op:h5` (`GO_FOR_OP_H6_ACCEPTANCE_GATE_PREPARATION`), `check:op:h6` (`GO_FOR_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE`, gate itself still `pending_product_owner_decision`), `check:awia:hire-a-worker`, `check:hm-s2:aro01-pilot` (`staff_code: "ARO-001"`, triage `IT_SUPPORT`/`HIGH`), and `check:hm-s3:empty-db-wiring` (database no longer empty, expected).

Follow-up: HM-S3 is now closed - all 8 checklist items in Section 10 of "vFirm Position-to-Skill Mapping v1.0" are complete. Residual items for whenever next authorized: `resetStore()`'s 17-table AWIA gap (mirrors the now-fixed `purgeTestFirmRecord` gap); the OP-H6 controlled multi-firm pilot operations acceptance gate, which remains `pending_product_owner_decision` independent of HM-S3; and periodically re-verifying that ADRs recorded as complete in this register are actually present on disk, given the confirmed silent-write-failure recurrence found while drafting this entry.

## ADR-087 - "My Team" hiring model, HM-S4: four new pilots (Bookkeeper/FAO-11, Sales Coordinator/SAO-03, Ops Coordinator/OPO-09, HR Administrator/ARO-10), first live Class-A approval-gate exercise, Workdesk UI surfacing for all five pilot shapes, full regression pass, sprint closed

Date: 2026-09-21

Status: Accepted (HM-S4 sprint plan, all 8 checklist items closed - see Section 11, "vFirm Position-to-Skill Mapping v1.0")

Decision: The product owner authorized and, one checklist item at a time under the established "Proceed Item N ... Bismillah" gating process, accepted all eight items of the HM-S4 sprint, the natural next slice of execution rollout reserved by HM-S2's own boundary:
(1) Execution-scope decision: HM-S4 rolls execution out to four more pilots across four different positions rather than continuing to add skills to General Clerk alone - Bookkeeper/FAO-11 Account Reconciliation, Sales Coordinator/SAO-03 Lead Qualification & Scoring, Ops Coordinator/OPO-09 Task-to-Capacity Assignment, and, deliberately, HR Administrator/ARO-10 Employee Onboarding Administration as the sprint's first Class A skill - chosen specifically so HM-S1's Class-A approval-routing gate would finally be exercised live end-to-end rather than remaining built-but-unwired.
(2) The Class-A approval gate (`evaluateClassAApprovalGate()`, built in HM-S1) was wired to a live HTTP path for the first time: `output_draft.class_a_approval_required` / `class_a_approval_status` fields (`PENDING` -> `APPROVED`/`DENIED`), ordinary output-review refused with `CLASS_A_APPROVAL_REQUIRED_BEFORE_CLIENT_DRAFT` until a distinct actor grants approval via the new `POST /awia/virtual-staff/output-class-a-approval` route. Wiring this surfaced two real gaps, found and fixed in the same item rather than deferred: the route had no distinct-actor enforcement (a preparer could approve their own Class A output) until added, and `store.mjs`'s output-review handler did not yet check the new fields at all until the gate check was inserted ahead of the existing review logic.
(3) Built and verified the FAO-11 Bookkeeper pilot: a deterministic account-reconciliation classifier (`reconcileAccountEntries`) matching book entries against bank entries by reference, self-verified against fixtures covering matched/mismatched/partial cases, wired to a new finance-reconciliation action in the FAO role's tool policy, full smoke test proving hire -> activate -> real reconciliation on a real sample -> output-draft carrying the exact result -> ordinary review (Class B, no gate) -> client-delivery-draft.
(4) Built and verified the SAO-03 Sales Coordinator pilot: a deterministic lead-qualification-and-scoring function (`qualifyAndScoreLead`) producing a 0-100 score and a HOT/WARM/COLD tier from budget confirmation, decision-maker engagement, timeline, industry fit, and company size, self-verified against fixtures across all three tiers, wired to a new sales-qualification action in the SAO role's tool policy, full smoke test end-to-end.
(5) Built and verified the OPO-09 Ops Coordinator pilot: a deterministic task-to-capacity assignment function (`assignTaskToCapacity`) matching a task's required skill tag against a firm's queues by remaining capacity and urgency, self-verified against fixtures covering assigned/no-capacity/no-matching-queue branches, wired to a new task-assignment action in the OPO role's tool policy, full smoke test end-to-end.
(6) Built and verified the ARO-10 HR Administrator pilot - the sprint's first fully-exercised Class A pilot: a deterministic onboarding-checklist function (`prepareOnboardingChecklist`) evaluating five required document labels plus a segregation-of-duties check (the responsible administrator may not also be the hiring manager) and returning one of `READY_TO_ONBOARD` / `DOCUMENTS_OUTSTANDING` / `SOD_CONFLICT_BLOCKED`, self-verified against three fixtures, wired to a new `administration.employee.onboarding` action added to the ARO role's tool policy. Its smoke test is the sprint's proof that item 2's gate actually works live: both the documents-outstanding and ready-to-onboard cases are denied with `CLASS_A_APPROVAL_REQUIRED_BEFORE_CLIENT_DRAFT` before approval and reach `ALLOW` only after a distinct actor approves via the item 2 route, and the test asserts by direct property check that the new hire's name never appears anywhere in the module's output or checklist, by construction - the module never takes or emits it, only which named checklist items are present as booleans.
(7) My Team / Workdesk UI surfacing for all four new pilots: `pages-owner.js`'s `summarizeOutputPayload()` extended with a rendering branch for each of FAO-11, SAO-03, OPO-09, and ARO-10's two branches, alongside the existing ARO-01 branch, falling back to a generic first-3-keys preview for any unrecognized shape; a new `workdeskStatusLabel()` helper surfaces `CLASS_A_APPROVAL_PENDING` distinctly from an ordinary output review whenever an item's draft has `class_a_approval_required: true` and `class_a_approval_status: "PENDING"`, falling back to the item's real `workdesk_status` once approved, denied, or for any Class B item; `ui.js`'s `STATUS_TONE` map gained three entries (`class_a_approval_pending`: amber, `class_a_approved`: moss, `class_a_denied`: rose) so the new status renders with its own pill tone rather than falling through to the unstyled default. Verified against the real, exact shipped source (extracted from the live files and exercised as a real ES module against real output shapes produced by each pilot's own core-domain function), not a reimplementation of the same logic - deliberately avoiding importing `pages-owner.js` directly, which transitively pulls in a live Supabase client via `api.js` -> `auth.js` unrelated to what this item changed.
(8) Regression pass: the product owner ran a full 15-command PowerShell suite against the live device checkout - the nine-command HM-S1/S2/S3 baseline suite (`check:op:h1` through `check:op:h6`, `check:awia:hire-a-worker`, `check:hm-s2:aro01-pilot`, `check:hm-s3:empty-db-wiring`) plus all six of HM-S4's own new smoke tests (`check:hm-s4:item2` through `check:hm-s4:item6-aro10-hr-administrator-pilot`, plus `check:hm-s4:item7-workdesk-ui-surfacing`) - and all 15 passed with zero regressions. `check:hm-s3:empty-db-wiring`'s re-run continues to show accumulated real activity rather than an empty database, as expected and previously recorded in ADR-086.

Rationale: HM-S2 deliberately scoped execution to a single, lowest-risk skill so the first real execution path could be verified end-to-end before any rollout; HM-S4 was the sprint reserved for that rollout, and rather than adding more Class B skills to the same already-proven position, it was deliberately scoped to touch four different positions and, specifically, to finally exercise the Class-A approval-routing gate that HM-S1 built and left unwired since no Class A skill had yet been piloted. Auditing the live output-review path before wiring the gate (item 2) surfaced two real gaps - missing distinct-actor enforcement and a review handler with no gate check at all - that would otherwise have shipped as latent defects; fixing both before building any Class A pilot on top of the gate avoided building a pilot that exercised broken plumbing. Choosing ARO-10 specifically for its PII-sensitive subject matter (a new hire's documents and identity) made proving PII-safety by construction (never taking or emitting the new hire's name) a real, meaningful test rather than an incidental property. Following the "Proceed Item N ... Bismillah" pattern for each of the eight items, exactly as HM-S1 through HM-S3 did, kept the product owner in control of every step, including flagging - via a direct question rather than silent compliance or silent refusal - when the product owner's own request to jump to item 9 would have skipped items 7 and 8 while still undone; the product owner chose to complete 7 and 8 first, which this ADR now reflects as actually closed.

Boundaries: This ADR authorizes no new code beyond what items 1-8 already built and the product owner already accepted; it is a decision-and-closeout record for HM-S4, following the same pattern as ADR-084, ADR-085, and ADR-086. HM-S4 explicitly does NOT include: executing any skill beyond the five specific pilots now live (ARO-01 from HM-S2, plus FAO-11, SAO-03, OPO-09, and ARO-10 from this sprint); rolling out execution to any of the remaining catalogued skills across the five positions; wiring the Class-A approval-routing gate to any Class A skill beyond ARO-10 (the other 24 catalogued Class A skills remain unpiloted); a fix for the older, never-updated `apps/web/public/app.js` Workdesk implementation, which does not read `output_payload` at all and was left untouched in favor of the actively-maintained `apps/web-console/public/js/pages-owner.js`; or any change to the position catalogue's content or authority classes. Any future change extending execution to another skill, another Class A pilot, or the legacy `apps/web/public/app.js` surface requires its own separate product-owner authorization before work begins, per the established gating process.

Evidence: New files - `packages/core-domain/src/awia-virtual-staff-fao11-account-reconciliation.mjs`, `packages/core-domain/src/awia-virtual-staff-sao03-lead-qualification-scoring.mjs`, `packages/core-domain/src/awia-virtual-staff-opo09-task-capacity-assignment.mjs`, `packages/core-domain/src/awia-virtual-staff-aro10-employee-onboarding-administration.mjs` (each self-verified via its own `verify*Fixtures()`, zero failures); `scripts/smoke-hm-s4-item6-aro10-hr-administrator-pilot.mjs` (`check:hm-s4:item6-aro10-hr-administrator-pilot`, proves denial-before-approval and success-after-approval on two branches, asserts no `new_hire_name` field ever appears); `scripts/smoke-hm-s4-item7-workdesk-ui-surfacing.mjs` (`check:hm-s4:item7-workdesk-ui-surfacing`, extracts and exercises the real shipped `summarizeOutputPayload`/`workdeskStatusLabel`/`statusPill` source, not a reimplementation). Edited files - `packages/core-domain/src/awia-virtual-staff-authority-gate.mjs` (`administration.employee.onboarding` and the FAO-11/SAO-03/OPO-09 actions added to their respective role tool policies); `apps/api/src/store.mjs` (Class-A approval-gate check inserted into the output-review path, `class_a_approval_required`/`class_a_approval_status` fields added to the output-draft record); `apps/api/src/server.mjs` (`POST /awia/virtual-staff/output-class-a-approval` route added, distinct-actor enforced); `apps/web-console/public/js/pages-owner.js` (`summarizeOutputPayload()` extended with four new branches, `workdeskStatusLabel()` added); `apps/web-console/public/js/ui.js` (`STATUS_TONE` extended with three Class-A entries); `package.json` (new `check:hm-s4:*` script aliases for all six of this sprint's smoke tests). All files verified with `node --check` and, per this sprint's established mitigation for the confirmed silent-write-failure pattern in `device_commit_files`, by re-staging and checksum-comparing against the live device checkout after every commit before being reported as done. Regression evidence - product owner's PowerShell transcript, this sprint, showing all 15 targeted commands passing against the live device checkout: the nine-command HM-S1/S2/S3 baseline suite, plus `check:hm-s4:item2` through `check:hm-s4:item6-aro10-hr-administrator-pilot` and `check:hm-s4:item7-workdesk-ui-surfacing`, with zero regressions.

## ADR-088 - Post-HM-S4 hotfix set: cross-tenant My Team/Workdesk/Sales/Projects/Finance data leak, "Retire a worker" removal path, hire-into-occupied-position guardrail

Date: 2026-09-22

Status: Accepted (three off-plan fixes, each separately authorized by the product owner outside the sprint checklist process, discovered and built across two sessions while manually testing HM-S4's pilots against the real, live NHL Global Solution firm)

Decision: While walking through a live test of the ARO-10 pilot against the real database (post-HM-S4, not a sprint item), the product owner surfaced three real defects in quick succession; each was diagnosed, explained, and fixed only after the product owner's explicit go-ahead, per the established "fix it now ... Bismillah" pattern used for off-plan discoveries:
(1) Cross-tenant data leak: My Team showed 17 hired workers for NHL Global Solution (a firm that had genuinely hired only 2), with obvious triplication across firms. Root cause: `apps/web-console/public/js/api.js`'s `getStore()` calls `GET /mvp/store`, a deliberately unscoped whole-database read (documented in `packages/core-domain/src/api-contracts.mjs` as a "compatibility full-store read for local development fallback", needed by boot-time identity resolution and several dev/test scripts) - but every Owner-console content page (My Team, Workdesk, Sales, Projects, Finance) in `pages-owner.js` rendered that unfiltered whole-database result as if it were the current firm's own data. Invisible while only one real firm existed in the live database; became a real leak once HM-S3's live-database pivot put multiple real firms in one shared store. Fixed with a new `scopeStoreToCurrentFirm(store)` export in `api.js` that filters every array-valued collection carrying a `firm_id` field down to the current firm, leaves reference collections without `firm_id` (tenants, firms) untouched, and passes the store through unscoped before identity is resolved (protecting the boot-time bootstrap path); wired into all four affected `pages-owner.js` render paths (`mountTeam`, `mountWorkdesk`, `mountSales`/`mountProjects` via their shared `withStore()` helper, `mountFinance`). Does NOT touch `GET /mvp/store` itself, which legitimate whole-database consumers still need. Verified via new `scripts/smoke-post-hm-s4-mvp-store-tenant-scoping-fix.mjs` (`check:post-hm-s4:mvp-store-scoping-fix`) against a synthetic three-firm fixture with colliding auto-generated staff codes across firms (the exact shape of the real bug), and confirmed live by the product owner: NHL Global Solution now shows exactly its own 2 workers.
(2) No way to remove a hired worker: reported by the product owner immediately after fix (1), alongside discovering they had accidentally hired "General Clerk" twice with no guardrail stopping them (see item 3). There is no hard-delete path for a single AWIA staff record anywhere in this codebase; `RETIRED` already existed as an allowed lifecycle state (`updateAwiaVirtualStaffLifecycleRecord`, `store.mjs`) and was already reachable via `POST /awia/virtual-staff/lifecycle`, but no UI button ever called it. Added a "Retire" button to `pages-owner.js`'s `mountTeam()` roster table, guarded by a `window.confirm()` (one-way from this UI, matching that there is no "un-retire" button), calling the existing `updateStaffLifecycle({ to_state: "RETIRED" })` path. A retired worker keeps its full audit history (lifecycle events, past output drafts) but is filtered out of the active roster table and the "Total hired"/"Active"/"Paused" stat counts via a new `activeWorkers` filter, and surfaced instead in a new "Retired" stat - not deleted, just excluded from the active view, matching what "removed" should look like without losing any record. Verified via new `scripts/smoke-post-hm-s4-my-team-retire-worker.mjs` (`check:post-hm-s4:my-team-retire-worker`), which reproduces the exact reported scenario (2x General Clerk, retire one, confirm exactly one remains active and the stats update correctly) against the real shipped filtering expression, extracted verbatim.
(3) No guardrail against hiring into an already-occupied position: the product owner explicitly flagged this as a second, separate issue in the same report ("I accidently added 2 General Clerk since there were no guardrail") but it was deliberately deferred - only the Retire fix (item 2) was authorized in that session. Authorized and built the following session ("Please fix the hire-guardrail issue and ADR entry"). Root cause: `hireAwiaFirmWorkerRecord` (`store.mjs`) never checked whether a position was already occupied before minting a new hire; `nextAwiaStaffCodeForRole()` simply generates the next sequential `staff_code` (`GC-1`, then `GC-2`) and lets both hires through, which is exactly how the product owner ended up with two General Clerks. Fixed on both sides: server-side, a new occupancy check in `hireAwiaFirmWorkerRecord` rejects (`AWIA staff hire rejected: position_already_occupied:...`) a hire into a `position_id` (or, for a position-less role such as CFO, a `role_code` via its role assignment record, since `role_code` isn't stored on the member record itself) already held by a non-`RETIRED` worker in that firm; client-side, `pages-owner.js`'s `mountTeam()` computes the same occupancy (`occupiedPositionIds`, `occupiedRoleCodesWithoutPosition`) and disables/labels the Hire button for an already-occupied role before a request ever goes out, rather than the firm owner only finding out after an error alert. A `RETIRED` occupant does not block a re-hire - retiring (item 2) is the intended way to free a seat back up; two different positions sharing the same `role_code` (General Clerk and HR Administrator, both `ARO`) do not block each other, since the guard is per-position except for position-less roles. Verified via new `scripts/smoke-post-hm-s4-hire-duplicate-guardrail.mjs` (`check:post-hm-s4:hire-duplicate-guardrail`), covering the duplicate-General-Clerk rejection, the RETIRED-frees-the-seat case, the position-less CFO case, the shared-role_code-different-positions non-blocking case, and the client-side occupancy computation, all against the real shipped conditionals extracted verbatim.

Rationale: All three fixes were found by directly reading the affected code after a real, observed symptom in the live product - never by speculation - and each was scoped to exactly what the product owner reported, with an explicitly separate go-ahead sought and given per fix rather than bundling unrequested changes into an authorized one (item 3 was proposed at the same time as item 2 but deliberately left unbuilt until its own authorization arrived a session later). Item 1 is a genuine security-relevant defect (unscoped cross-tenant data exposure) rather than a cosmetic bug, and was fixed surgically at the display layer rather than by touching `GET /mvp/store` itself, preserving the legitimate whole-database consumers that route depends on. Items 2 and 3 both build on the existing `RETIRED` lifecycle state rather than introducing a new deletion capability, keeping this fix set consistent with the rest of the AWIA staff lifecycle model (soft-remove, full audit trail preserved) instead of adding a hard-delete path that does not otherwise exist anywhere in this codebase.

Boundaries: This ADR authorizes no new code beyond what items 1-3 already built and the product owner already confirmed (item 1) or accepted (items 2-3); it is a decision-and-closeout record for this off-plan hotfix set, not a new sprint, and does not reopen or amend HM-S4 (ADR-087). Explicitly NOT included: any change to `GET /mvp/store` itself or its other legitimate unscoped consumers; a hard-delete capability for a single AWIA staff record (still does not exist - RETIRED remains the only removal path); a fix for the two other symptoms the product owner separately raised in the same conversation as this ADR - (a) the My Team page appearing to hang with no processing/loading indicator while a Pause/Activate/Retire/Hire action's network call is in flight (the button gives no visual feedback between click and `mountTeam()` re-render completing), and (b) generally slow page loads across My Team/Workdesk/Sales/Projects/Finance, diagnosed as almost certainly caused by `GET /mvp/store` (and, on the Postgres backend, `savePostgresStore`'s write path) loading and re-persisting the ENTIRE database - every tenant, every firm, the full historical `audit_events`/`event_log`/`policy_decisions` tables accumulated across this entire multi-sprint engagement - on every single read and write, rather than scoping to the current firm at the query level. Diagnosed and explained to the product owner in this session but NOT fixed here: it is a materially larger architectural change (moving `readStore`/`saveStore` from whole-store load/save to firm-scoped queries) than the surgical display-layer fix in item 1, and requires its own separate product-owner authorization before any work begins, per the established gating process. Both (a) and (b) remain open, unauthorized follow-up items.

Evidence: New files - `scripts/smoke-post-hm-s4-mvp-store-tenant-scoping-fix.mjs` (`check:post-hm-s4:mvp-store-scoping-fix`); `scripts/smoke-post-hm-s4-my-team-retire-worker.mjs` (`check:post-hm-s4:my-team-retire-worker`); `scripts/smoke-post-hm-s4-hire-duplicate-guardrail.mjs` (`check:post-hm-s4:hire-duplicate-guardrail`). Edited files - `apps/web-console/public/js/api.js` (`scopeStoreToCurrentFirm()` added); `apps/web-console/public/js/pages-owner.js` (`scopeStoreToCurrentFirm` wired into `mountTeam`/`mountWorkdesk`/`withStore`/`mountFinance`; `mountTeam` extended with `activeWorkers`/`retiredCount` filtering, a Retire button and confirm-guarded click-handler branch, occupancy computation, and Hire-button disabling); `apps/api/src/store.mjs` (`hireAwiaFirmWorkerRecord` extended with the duplicate-occupancy guard); `package.json` (three new `check:post-hm-s4:*` script aliases). All files verified with `node --check`, each new smoke test passing, regression-checked against `check:hm-s4:item7-workdesk-ui-surfacing`, `check:post-hm-s4:mvp-store-scoping-fix`, `check:post-hm-s4:my-team-retire-worker`, and `check:hm-s4:item6-aro10-hr-administrator-pilot` with zero interference, and committed to the live device checkout with the established re-stage-and-checksum-compare verification after every commit. Item 1 additionally confirmed live by the product owner via the real browser against the real NHL Global Solution firm; the product owner's own regression transcript (four PowerShell commands, this engagement) also confirms no cross-sprint breakage from item 1's fix.

Follow-up: Two items raised by the product owner in the same conversation as this ADR remain open and unauthorized: (a) adding a processing/loading indicator to My Team's action buttons (Pause/Activate/Retire/Hire) so an in-flight request is visibly distinguishable from an unresponsive page; (b) the broader whole-database-load-and-save performance issue described in Boundaries above, affecting every database-backed page as the live store's historical record volume grows. Both require their own separate product-owner authorization before work begins, per the established gating process. Also still open from ADR-086: `resetStore()`'s 17-table AWIA relational-table gap, and the OP-H6 controlled multi-firm pilot operations acceptance gate's `pending_product_owner_decision` status.

Follow-up: HM-S4 is now closed - all 8 checklist items in Section 11 of "vFirm Position-to-Skill Mapping v1.0" are complete. Residual items carried forward for whenever next authorized: the remaining 24 catalogued Class A skills beyond ARO-10 are still unpiloted against the now-live approval gate; the legacy `apps/web/public/app.js` Workdesk implementation still does not read `output_payload` and was left untouched; the `resetStore()`/OP-H6 residual items recorded in ADR-086 remain open and are unrelated to HM-S4. The next step - which position(s) or skill(s) to execute next, and whether to retire or fix the legacy `apps/web/public/app.js` Workdesk surface - is a separate future sprint requiring its own product-owner authorization before any work begins, per the established "Proceed Item N ... Bismillah" pattern. Repository hygiene note: as with the HM-S1/S2/S3 sequence, all of HM-S4's new code should be git-committed and Graphify refreshed once the product owner is satisfied the sprint is fully closed.

## ADR-089 - Firm operating workflow (W1-W5): owner work intake, file storage, and actionable Workdesk authorized as a Release 2 candidate / scope expansion; W1 started

Date: 2026-09-30

Status: Accepted (product owner decisions D1-D5 recorded 2026-09-30 against `claude/firm-operating-workflow-upgrade-proposal.md`, also committed to `Claude outputs/firm-operating-workflow-upgrade-proposal.md`)

Decision: A code study of the platform found that the governed back half of the AWIA work loop (authority gate -> draft -> human review -> Class A approval -> client delivery draft -> archive) exists, but there is no front door: the owner cannot hand the firm work with instructions or files. Confirmed gaps: workdesk items require a pre-existing `task_id` (tasks are only created when an accepted proposal opens a project) and `assign-task` requires a `client_id`; the Workdesk Inbox tab is structurally always empty; the API has no file upload, storage or download path (`storage_ref`/`content_hash` are free-text strings); `output-draft` stores only caller-supplied payloads and the five executable skill modules are not imported by the API; the `apps/web-console` Workdesk is read-only; a `REVISION_REQUIRED` review is a dead end; conversation threads have no UI. The product owner approved a five-phase upgrade (W1 foundations, W2 work requests/front door, W3 skill runner, W4 collaboration and filing, W5 client portal and LLM drafting under separate authorization) and these decisions:
(D1) File storage uses Supabase Storage (private bucket, tenant/firm-prefixed keys) with a local-disk fallback for development.
(D2) Internal (no-client) work is allowed: `client_id` becomes optional on assignment for the `INTERNAL` risk class (built in W2).
(D3) New requests may go to the Inbox for owner assignment or be assigned immediately - the owner chooses per request (built in W2).
(D4) Skills without a deterministic module stay owner-completable; LLM-assisted drafting is a separate later authorization (W5).
(D5) Work starts with W1, classified as a Release 2 candidate / explicit user-approved scope expansion.

W1 scope: (B1) file storage service - `file_objects` collection with its own relational table (migration 0048), raw-binary upload route, scope-checked audited download route, SHA-256 content hashing, MIME allowlist and size cap, file references usable as `evidence_refs` (`file:<id>`) on assignment and as an owner-attached output file on a draft; (B3) a `REWORK` workdesk state so `REVISION_REQUIRED` sends the item back to the worker instead of dead-ending; (F2) action buttons on the `apps/web-console` Workdesk wiring the existing governed endpoints (assign with file attachments, get draft, approve / request revision / reject, Class A approval, prepare client delivery, mark sent, archive, file download).

Rationale: Every gap was found by reading the code directly, not assumed. W1 changes no authority rule: no silent approval, draft-only outputs, human review before client delivery and the Class A gate all remain exactly as before; W1 only supplies real inputs and an operable owner surface to the existing governed path.

Boundaries: No change to frozen baseline documents. Not in W1: work requests / ad-hoc tasks / Inbox intake (W2), skill execution against uploaded files (W3), threads/needs-info and output filing (W4), client portal and LLM drafting (W5). Locked boundaries in `AI_WORKSPACE_CONTEXT.md` (no public marketplace, no autonomous regulated approval, no live payment movement, no uncontrolled tenant/client data sharing) remain in force. Uploaded files are tenant-confidential and never served without a verified actor scoped to the owning tenant/firm.

Follow-up: Apply migration 0048 to production and create/confirm the private Supabase Storage bucket before enabling uploads there; W2 requires the product owner's go-ahead after W1 is verified.

## ADR-090 - Firm operating workflow W2: owner work requests (the firm's front door), request-type menu, internal (no-client) work, assign-now

Date: 2026-10-01

Status: Accepted (product owner go-ahead "proceed W2" on 2026-10-01, building on ADR-089 decisions D2 and D3)

Decision: W2 gives the firm owner a front door for work. (B2) A new `work_requests` collection (own relational table, migration 0049) holds the owner's brief - title, instructions, request type, optional client project, priority, due date, input files, free-text references - numbered per firm (WR-0001...). Routes: `POST /work-requests` (optionally with `assign_to_staff_code` - decision D3 "assign now"), `POST /work-requests/assign`, `POST /work-requests/cancel`, `POST /work-requests/add-files`, `GET /work-requests/request-types`. Assigning creates an ad-hoc row in the existing `tasks` table (`input_ref = work-request:<id>`, no proposal or project needed) and then calls the unchanged governed path `assignAwiaVirtualStaffTaskRecord` - authority gate, position/skill scope and Class A rules apply exactly as before; a refusal is recorded on the request, which stays in the Inbox. Each request carries a deterministic ARO-01 triage suggestion (category, priority, suggested position) - a suggestion only, never an assignment. (B5) `packages/core-domain/src/awia-work-request-types.mjs` defines 15 plain-English request types mapped to position, authority-gate tool and (for the five piloted skills ARO-01, FAO-11, SAO-03, OPO-09, ARO-10) the catalogue skill; it adds no authority. (D2) Requests with no client are INTERNAL firm work: the authority gate's TASK_SCOPE_REQUIRED check is skipped only for risk class INTERNAL; INTERNAL items can never be prepared for a client and are instead filed via `POST /awia/virtual-staff/workdesk-item/complete-internal` (REVIEWED_FOR_CLIENT_DRAFT -> ARCHIVED_COMPLETED) after the same human review. Client work must name one of the client's projects (the gate's client+project scope is unchanged); pre-sales work on a prospect is the firm's own (INTERNAL) work. (F1) `apps/web-console`: "+ New request" in the topbar opens a four-step drawer (what / brief + files / for whom / who); the Workdesk Inbox lists SUBMITTED requests by priority with assign (eligible workers only, Clerk's suggestion preselected), add files and cancel; Pending shows the request number, instructions and add-files; Outbox offers "Mark complete" for internal work; Archived includes completed internal work and cancelled requests.

Rationale: The owner could previously only give work through an accepted proposal's single project task. W2 lets any piece of firm work enter with its files and instructions while routing every assignment through the existing, tested authority path; the only rule relaxed is client/project scope for the firm's own internal work, which by construction cannot reach a client.

Boundaries: No change to human review, Class A approval, draft-only outputs, final-issue denial or evidence requirements (every assignment carries the request itself as evidence). No skill execution against the uploaded files yet (W3). No autonomous assignment: the triage suggestion is advisory. Frozen baseline documents untouched. Locked boundaries in `AI_WORKSPACE_CONTEXT.md` remain in force.

Follow-up: Apply migrations 0048 and 0049 to production. W3 (skill runner over uploaded files) requires the product owner's go-ahead. Pre-existing defect still open and unauthorized: Postgres seat natural key `seat-<staff_code>` is not firm-scoped, so a second firm hiring an already-used staff code fails on `fk_awia_virtual_staff_members_seat`.

## ADR-091 - Hiring bug fix: AWIA provisioning records collided across firms on shared staff codes; occupied-position guardrail was a silent no-op

Date: 2026-10-01

Status: Accepted (product owner instruction "We need to fix hiring bug first", 2026-10-01; found during W1 verification and reported in ADR-089/090 follow-ups)

Decision: (1) Root cause: four AWIA provisioning record ids are not firm-scoped - `seat-<code>`, `role-assignment-<code>`, `package-binding-<code>`, `staff-lifecycle-<code>-<state>` - and every evidence pack uses one constant id. Staff codes restart at 001 in every firm, so two firms hiring the same role produce identical ids. Two layers broke: (a) the whole multi-tenant store is loaded into one object and `upsertById()` matched on id alone, so firm B's hire merged its seat/role/binding/lifecycle/evidence records INTO firm A's (both backends; on JSON it silently corrupted firm A); (b) on Postgres the surrogate key was `deterministicUuid(natural_key)`, identical across firms, so `on conflict (id)` targeted firm A's row - since migration 0032 the member->seat foreign key then failed and the whole hire rolled back (the reported symptom), and evidence packs (no such FK) could be silently overwritten. Fix: provisioning upserts now match id AND firm (`upsertScopedById`); the AWIA persist computes a firm-scoped surrogate for new rows whose natural key does not already embed the firm id (members and provisioning runs keep their exact ids) and upserts on the existing unique index `(tenant_id, firm_id, natural_key)`, so rows stored under the old formula are still found and updated in place - no data migration and no id changes for existing rows. (2) The ADR-088 "position already occupied" guardrail filtered members on `tenant_id`, a field member records never carry (they use `organization_id`), so it never fired - a second Bookkeeper was accepted as FAO-002. It now matches `tenant_id ?? organization_id`.

Rationale: Code-only fix, verified on JSON and on Postgres (fresh database, re-run on a populated database, and a legacy database holding rows written under the old id formula - those rows were updated in place by lifecycle and seat-billing changes). New regression smoke `smoke-hiring-cross-firm-staff-code-collision.mjs` (three firms, two tenants, same staff codes) fails on the pre-fix code and passes after; it asserts firm A's records are byte-identical before/after other firms' hires and, on Postgres, that no row stores another firm's record.

Boundaries: No schema change. `smoke-awia-hire-a-worker.mjs` updated: it encoded the pre-ADR-088 behaviour (second CFO in the same firm accepted); it now asserts the refusal, retires CFO-001, and confirms the re-hire still gets CFO-002. Production data written before migration 0032 (or any evidence pack) may already hold another firm's record: `infra/database/diagnostics/2026-10-01_awia_cross_firm_overwrite_check.sql` is a read-only check; any repair needs its own go-ahead after the result is reviewed.

Follow-up (closed 2026-10-01): Diagnostic found 21 overwritten rows, all written 2026-09-21 23:58 UTC by deleted smoke-test firm 0e068cf2: 20 seat/role/binding/lifecycle rows of test firm "HM-S3 Smoke Test Firm 1789812107818" (add98e4c, CFO-001 and FAO-001..004, all DRAFT) and NHL Global Solution's (58e54f95) evidence pack. Product owner approved and ran `infra/database/diagnostics/2026-10-01_awia_cross_firm_overwrite_repair.sql` (single transaction; tested locally first): all 21 rows copied unchanged to `awia_cross_firm_overwrite_backup_20261001`, the 20 test-firm records re-pointed to their own tenant/firm with the foreign actor cleared and marked `repaired_from_cross_firm_overwrite`, and the foreign evidence pack removed from NHL (NHL's original pack is not recoverable; a fresh pack is generated on NHL's next hire). Re-running the diagnostic returns 0 rows. Smokes on the device: hire-duplicate-guardrail, my-team-retire-worker, multi-firm-staff-template-scaling and check:hiring:cross-firm-staff-code pass; payroll-and-seat-billing-polish is blocked only by the pre-existing LEGACY_PILOT_PROVISIONING_LOCKED lock (run with VFIRM_ALLOW_LEGACY_PILOT_PROVISION=true). Open, unauthorized: smoke/test firms exist in the production database (smoke runs appear to have targeted production), and test-firm purge historically skipped the AWIA tables; the backup table can be dropped once no longer needed. W3 resumes on the product owner's go-ahead.

## ADR-092 - Firm operating workflow W3: skill runner - hired workers process the owner's uploaded files

Date: 2026-10-01

Status: Accepted (product owner go-ahead "Proceed W3" on 2026-10-01, building on ADR-089 decision D4)

Decision: W3 makes the five piloted deterministic skills run on the owner's real inputs instead of an empty placeholder draft. (B4) `packages/core-domain/src/awia-skill-runner.mjs` registers ARO-01 (request triage, reads the brief plus any .txt file), FAO-11 (bank reconciliation over a bank-statement file and a book/ledger file), SAO-03 (lead scoring from form fields), OPO-09 (capacity assignment over a queues file) and ARO-10 (onboarding checklist from form fields, Class A); each declares its form fields (`input_fields`) and named file slots (`file_slots`), which `GET /work-requests/request-types` now returns with `runnable` and `run_label`. `packages/core-domain/src/tabular-file-reader.mjs` reads CSV (comma/semicolon/tab) and XLSX (first sheet; no third-party dependency) with header detection, Malaysian/English amount formats, debit/credit or withdrawal/deposit columns (bank = credit - debit, book = debit - credit), Excel serial dates, and writes CSV with a UTF-8 BOM and spreadsheet-formula neutralisation. Work requests gain `form_inputs` and `file_roles` (sanitised against the skill's definitions; unknown keys dropped); `POST /work-requests/update-inputs` lets the owner correct inputs until the draft is in review; `POST /work-requests/add-files` accepts a `file_role` and a new file replaces the previous one in that slot. New route `POST /awia/virtual-staff/workdesk-item/run-skill`: checks the item is Pending (ASSIGNED/REWORK), the worker ACTIVE, the request type runnable and every input file in scope; reads the bytes from firm storage and re-verifies SHA-256; runs the skill; stores the output CSV as a WORK_OUTPUT file (classification at least as sensitive as the inputs; FAO-11 FINANCE_RESTRICTED, ARO-10 HR_RESTRICTED); then creates the draft through the unchanged `produceAwiaStaffOutputDraftRecord` with the real `output_payload`, the output file and a `generation` record (skill, input files with SHA-256, input notes). Missing or unreadable inputs return 422 SKILL_INPUT_REQUIRED with a plain-English list; the reason is recorded on the item (`last_run_error`) and the item stays Pending. Work given through a request can no longer receive an empty placeholder draft: it is run by its skill or the owner attaches the finished output file (decision D4). (F) `apps/web-console`: the New Request drawer shows each runnable type's fields and labelled file slots (and defaults file sensitivity for finance/HR work); Pending shows the worker's button (e.g. "Reconcile"), the inputs in use, "Edit inputs", and a "Needs input" line when a run could not start; Approval shows how each draft was made ("Worked out by FAO-11 from ...") with the output file to download; request references display as their WR number.

Rationale: Until W3 the skill modules were exercised only by smoke scripts; in real use the owner's files were stored but never read. W3 closes that gap without adding authority: the runner is deterministic, every result is a draft for human review, and all governance (authority gate at assignment, Class A approval, draft-only, no final issue, no client transmission) is unchanged.

Boundaries: No LLM or non-deterministic generation (W5, separate authorisation). No posting, dispatch, CRM, HR or ledger write-back of any kind. Skills other than the five above are not runnable; their work is completed by the owner attaching the output file. Legacy binary .xls, PDF and image inputs are not parsed (owner is told to save as .xlsx/.csv). People's names entered for ARO-10's segregation-of-duties check are compared only and never printed on the output. No schema change (records are jsonb). Frozen baseline documents untouched. Locked boundaries in `AI_WORKSPACE_CONTEXT.md` remain in force.

Verification: new `npm run check:w3:skill-runner` (real XLSX + CSV reconciliation, revision with a replacement file, missing-input 422, unlabelled-file matching, SAO-03 input correction, OPO-09, ARO-01, ARO-10 Class A with SoD conflict, non-runnable type, cross-firm and formula-injection guards) passes on JSON and on a fresh fully migrated Postgres; W1, W2 (JSON and Postgres) and hiring smokes pass, W2 and hiring smokes updated to supply a payload where they previously relied on placeholder drafts; 18 further regression smokes pass (legacy-roster ones with VFIRM_ALLOW_LEGACY_PILOT_PROVISION=true as before); browser click-through of drawer -> needs input -> edit inputs -> run -> approval -> output download with zero console errors.

Follow-up: The legacy `apps/web/public/app.js` Workdesk still offers its "produce" button, which now returns the clear "run the worker or attach the output" message for request-originated work. W4 (owner-worker threads / needs-info, output filing into the document register, Documents page, entry points, dashboard tray) requires the product owner's go-ahead.

## ADR-093 - Firm operating workflow W4: item conversations and "needs info", output filing, Documents page, entry points, Dashboard "Needs you"

Date: 2026-10-01

Status: Accepted (product owner go-ahead "proceed W4" on 2026-10-01)

Decision: (B6) Every workdesk item given through a request gets a conversation thread (existing `awia_staff_conversation_threads` / `awia_staff_conversation_messages`, same boundary checks: participant roles, classification, bounded length, no reasoning traces), recording the hand-over, the worker's questions, the owner's replies and files, drafts and review decisions, and the closing/filing. A skill run that lacks input now moves the item to a new status NEEDS_INFO (bucketed in the Inbox), remembering the status to return to (ASSIGNED, or REWORK during a revision); the owner answers by replying on the thread (`POST /awia/virtual-staff/workdesk-item/message`, optionally with files, which are added to the request and the item's evidence), by adding files, or by correcting inputs, and the item returns to the worker. NEEDS_INFO items can still be run, given an owner-attached output, or dismissed. Notes on any item do not change its status; files can only be added while the work is with the worker. (B7) When client work is marked sent or internal work is completed, the approved output file is filed in the existing document register (`document_register_entries` / `document_revision_records`) as `WR-xxxx-OUT`, type WORK_OUTPUT, linked to the client project when there is one, with `storage_ref = file:<id>` and `content_hash` = the file's SHA-256; the item records `filed_document_id`. (F3) New Documents page (Firm > Documents) lists the register with search and filters (source, internal/project), current revision with download, revision history, "New revision" (`POST /documents/revise`: R2..., previous SUPERSEDED, identical file refused) and "Add a document" (`POST /documents`: from an uploaded file, auto-numbered DOC-0001... or a unique owner-given number, optional project). (F4) My Team: "Give work" per active worker (New Request form pre-set to that worker and one of their request types) and a "What your team can do" panel (request types per worker, "runs automatically" and Class A marked); Projects page is now a list with "Request work" per project (form pre-set to that client project). (F5) Dashboard "Needs you" tray: questions from your team, new requests to assign, drafts to review, Class A approvals, ready to send or file, past due date - each opens the matching Workdesk tab. Also fixed: My Team bound its click handler again on every re-render, so after one action a later click could run its action more than once.

Rationale: W3 let workers process inputs but a missing input only produced an error line, the owner had no way to talk to the work, and approved outputs ended in the Archive rather than in the firm's records. W4 closes the day-to-day loop - ask, answer, approve, file - using the existing conversation and document-register tables, and puts the owner's entry points where they already are.

Boundaries: No change to authority, review, Class A approval, draft-only outputs, final-issue denial or client transmission (marking sent remains a record of the owner's own action). Threads hold operational context only; workers are deterministic and do not reply on their own (no LLM - W5). Only real stored files are filed or registered (no placeholder hashes). Register entries are never deleted; revisions supersede. No schema change: NEEDS_INFO is a record status; messages, threads and register rows use existing tables. Frozen baseline documents untouched. Locked boundaries in `AI_WORKSPACE_CONTEXT.md` remain in force.

Verification: new `npm run check:w4:collaboration-and-filing` passes on JSON and on a fresh fully migrated Postgres; W1, W2 (JSON + Postgres), W3 (JSON + Postgres; updated for NEEDS_INFO) and hiring smokes pass, with 18 further regression smokes passing as before; browser click-through (Dashboard tray -> question -> reply with file -> run -> approve -> complete -> filed -> Documents add + revise + history -> My Team "Give work" pre-set -> Projects "Request work" pre-set) with zero console errors.

Follow-up: Graphify refresh on the product owner's machine. The legacy `apps/web/public/app.js` Workdesk does not show NEEDS_INFO items or threads. W5 (client portal / email-in intake, LLM-assisted drafting for non-deterministic skills under governance) requires its own product-owner authorisation.

## ADR-094 - Connected EDCS: BizKick as source, vFirm as governed record
Date: 2026-10-05
Status: Accepted (product owner go-ahead "Proceed CE-S0" on 2026-10-05, after choosing the recommended option for D3, D6, D7 and D8)
Decision: (D1) BizKick is the source, the Bridge is the contract, vFirm is the governed record. vFirm never edits an existing BizKick file. The only write-back is a new working copy beside the source. (D2) Start with register upload (no install) before any connector. (D3) vFirm is the number authority for Connected customers (a BizKick v1.1 change). BizKick's own number detection stays for rows not reserved through vFirm. (D6) Three packages under NHL Global Solution: BizKick EDCS, BizKick Connected, BizKick + Virtual Staff. (D7) File content (not only metadata) may be sent by default for Sales, Procurement, Finance, Management and Inventory. HR and Legal are metadata only unless the owner opts in per firm. (D8) The console gets a new navigation group "BizKick" with Transactions, Sync history, Number Desk and Rules.
Rationale: The Smart Transaction Register already gives every business document one stable ID ([CLIENT]-[TYPE]-[YEAR]-[SEQUENCE]). Joining on that ID gives vFirm a governed record without a second master. Fixtures showed that shipped registers carry no cached formula values, and that the NUMBER DESK suggested-sequence formula depends on MAXIFS and FILTER written without the _xlfn prefix (it evaluates to 1 in LibreOffice 24.2; Excel not verified). That supports vFirm, not the workbook, as number authority (D3).
Boundaries: Contract v1.0 (docs/10_post_freeze_technical_design/CONNECTED_EDCS_INTEGRATION_CONTRACT_v1.0.md) is the only agreed crossing. Outcomes per row are CREATED, UPDATED, REVISED, UNCHANGED, REJECTED, CONFLICT and ROW_MISSING, each with a reason code. A row is never deleted because it disappears from the source. Cancelled and Superseded are terminal. Q, R and X formula columns are never trusted or stored. D4 and D5 are not decided here. Inventory and Legal were not named in the original D7 and are proposed in the contract for owner confirmation. No migration, API or console change in CE-S0.
Verification: npm run check:ce:s0-contract-and-fixtures checks the contract coverage (24 columns, 32 type codes, 12 statuses, 7 outcomes), this ADR with CRLF intact, and the synthetic Nexa (NEX) fixture pack in scripts/fixtures/bizkick/ (register counts, ID composition, expected outcomes, sample file SHA-256). The fixture folder also passed BizKick's own branding test.
Follow-up: CE-S1 (register import and sync ledger, migration 0050) starts only on the owner's "Proceed CE-S1". The owner reviews and approves contract v1.0 before CE-S1 builds on it.

## ADR-095 - Connected EDCS CE-S1: register import and sync ledger
Date: 2026-10-05
Status: Accepted (product owner go-ahead "Proceed CE-S1" on 2026-10-05, after reviewing and approving integration contract v1.0 and accepting the D7 proposal for Inventory and Legal)
Decision: (D7 confirmed) Inventory transactions are kept as full content; Legal transactions are kept as metadata only, like HR, unless the owner opts in per firm. The owner uploads the BizKick Transaction Register (sheet TRANSACTION REGISTER, header row 6, data from row 7, or a CSV export of it). vFirm reads it with the shared tabular reader, never edits it, ignores the cached columns Q, R and X, and recomputes alerts itself. Every row gets one outcome (CREATED, UPDATED, REVISED, UNCHANGED, REJECTED, CONFLICT, ROW_MISSING) with a reason code; a changed header rejects the whole file (STRUCTURE_CHANGED) and the attempt is still ledgered. Same revision with changed commercial content, a revision going backwards, or a Cancelled or Superseded row reopened is held as a CONFLICT and not applied; only the owner (HUMAN principal) resolves it with a required note, choosing KEEP_CURRENT or ACCEPT_INCOMING. A held conflict closes by itself when a later import matches the governed record (SOURCE_CORRECTED) or moves forward (SUPERSEDED_BY_IMPORT). Choosing KEEP_CURRENT does not silence the source: the next import holds the row again while BizKick still differs. A row missing from a later register gets the ROW_MISSING flag, is never deleted, and the flag clears when the row returns. The company code is locked once transactions exist, because every ID carries it. Counterparty links are suggestions only; the owner confirms them, and nothing is auto-created. vFirm has no supplier master, so a supplier link records the confirmed supplier name. The contract gains the reason INVALID_COUNTERPARTY_TYPE and the wording "the first failing stage decides the reason".
Rationale: A governed record needs imports that are idempotent, explainable row by row, and safe against silent overwrite. Holding conflicts for the owner keeps vFirm from deciding which side is right. Direct, firm-scoped repository access keeps register volume off the whole-store load/save path.
Boundaries: Data is in five new tables (migration 0050): edcs_connections, edcs_transactions, edcs_transaction_revisions, edcs_sync_runs, edcs_sync_events, in the generic id/natural_key/tenant/firm/record-jsonb shape with generated filter columns and a write-side tenant row-level-security backstop. They are written directly by apps/api/src/edcs-repository.mjs (JSON implementation for dev and test, Postgres implementation with one transaction per import batch). Routes: POST /edcs/connection, POST /edcs/register-imports, GET /edcs/connection, /edcs/transactions, /edcs/transactions/<id>, /edcs/sync-runs, /edcs/sync-runs/<id>, /edcs/conflicts, POST /edcs/conflicts/resolve, POST /edcs/transactions/link-counterparty. All writes are owner-only and firm-scoped; another firm gets 403 or 404 on every route. Audit events: edcs.connection_created/updated, edcs.register_imported, edcs.transaction_created/updated/revised, edcs.transaction_flag_changed, edcs.conflict_held/resolved, edcs.counterparty_linked/unlinked. The tenant export package carries all five collections when a firm is given. The console gains a BizKick nav group (Connection, Import register, Transactions, Sync history, Conflicts).
Known limitations: (1) The audit event is written in a second step after the data commit, so it is not atomic with the data; a crash between the two would leave data without its audit event. Revisit before CE-H1. (2) The export package holds EDCS data only for a firm-scoped export. (3) The JSON-mode test-firm purge does not clear edcs_* collections (JSON is test-only). (4) Supplier links are names, not records. (5) db-migrate.mjs cannot be run unchanged on a cluster that has no tenant-validator target; migrations 0001 to 0050 were applied to the verification database with psql in order.
Verification: npm run check:ce:s1-register-import drives the real API with the Nexa (NEX) fixture pack and passes on the JSON store and on a fresh, fully migrated Postgres. It checks baseline counts, idempotent re-import, UPDATED and REVISED with history, conflict hold and both owner resolutions, the reject reasons, ROW_MISSING and its return, a register without cached values, a changed header, a CSV export, company code mismatch and lock, counterparty link, cross-firm isolation on every new route, non-owner refusal, audit events and the export package. The regression set (W1 to W4, hiring, AWIA VS-S3/S4/S6, HM-S4 items 2 to 7, work-assignment, workdesk-archive) passes. A browser click-through of the five BizKick pages shows zero console errors.
Follow-up: The owner applies migration 0050 to production before enabling the BizKick pages. CE-S2 (file linking and document history) starts only on the owner's "Proceed CE-S2".

## ADR-096 - Connected EDCS CE-S2: file linking and document history
Date: 2026-10-05
Status: Accepted (product owner go-ahead "Proceed CE-S2" on 2026-10-05)
Decision: The owner uploads BizKick documents (one or many). vFirm finds the Transaction ID in each file name (extractTransactionId in packages/core-domain/src/edcs-chains.mjs; the ID must carry this firm's company code and a contract document type) or takes an ID the owner types for a file that has none. A file whose transaction is in the imported register is fingerprinted (SHA-256 of the uploaded bytes) and filed in the firm's existing document register: one register entry per transaction, numbered with the Transaction ID, one document revision per distinct file. The same bytes again change nothing; different bytes become the next revision and the previous one is marked SUPERSEDED (kept, still downloadable). The revision label comes from the file name (R1), else the transaction's own revision, else the next free R number. A file with no ID, an ID for another company, an unknown type, or an ID not in the register (an orphan) is reported back and nothing is stored or created; the owner can link it by hand. Content policy (D7) decides storage: for HR and Legal types without the owner's opt-in, only the file record (name, size, SHA-256, classification) and the revision are kept; no bytes, no storage key, and download is refused with FILE_METADATA_ONLY. The chain view follows Related Transaction ID (QT, SO, DO, INV, RC, CN and PR, RFQ, QC, PO, GRN, PV) and flags a related ID that is not in the register, and a document that must follow another (SO, DO, RC, CN, RFQ, QC, GRN) with no suitable predecessor. Standalone invoices, purchase orders and quotations are never flagged.
Rationale: The document register and W1 file store already give numbered entries, revisions, hashing, scoped download and integrity checks; reusing them keeps one governed place for documents. Never creating a transaction from a file keeps the register (BizKick) the source and vFirm the governed record.
Boundaries: No new migration. Uses file_objects, document_register_entries and document_revision_records through one whole-store transaction (file, entry, revision, audit event together), then updates the transaction's documents summary through the EDCS repository. Owner-only writes; reads for any verified firm member. New routes: POST /edcs/files/upload (raw bytes, one file per call), GET /edcs/chains, GET /edcs/documents/<transaction id>. The generic file download now refuses METADATA_ONLY records.
Known limitations: (1) The bytes are stored before the register entry is written; a crash in between leaves an unreferenced stored file (same order as W1 upload). (2) The transaction summary update is a second commit after the register filing; the register entry is the source and the summary is rebuilt on the next filing. (3) The register's File Link / Path column is not yet used for matching (the owner uploads files; folder connectors come later). (4) A second, different file for the same transaction becomes the next revision even when it is a supporting document (for example a bank statement under a reconciliation); a separate attachment concept is not built. (5) Smoke run on Postgres as the database owner, so row-level security is covered by the write-side backstop tests of earlier sprints, not re-proved here.
Verification: npm run check:ce:s2-file-linking passes on the JSON store and a fresh scratch Postgres: match by ID, orphan and unmatched not stored, register entry with real SHA-256, identical file unchanged, changed file supersedes, HR metadata-only with download refused and opt-in storing later filings, chain view with the two missing-link flags, download integrity, cross-firm refusal, audit events.
Follow-up: CE-S3 (rule engine and register-driven work) starts only on the owner's "Proceed CE-S3".

## ADR-097 - Connected EDCS CE-S3: rule engine and register-driven work
Date: 2026-10-05
Status: Accepted (product owner go-ahead "Proceed CE-S3" on 2026-10-05)
Decision: Owners turn register events into work requests with rules (migration 0051: automation_rules, automation_rule_runs). A rule has a condition (document type, status, days to due, overdue, open, new transaction, new revision, chain flag, has supporting file), an action (a W2 work request type, priority, due date, optional assign_to_staff_code, attach linked files) and an enabled flag. Every rule is created off; enabling needs a dry run of the current definition (editing clears it and is only allowed while the rule is off). Each occurrence (rule, transaction, occurrence key NEW / REV / FLAG / STATE) is claimed atomically in automation_rule_runs BEFORE the request is created, so repeated imports, ticks or racing evaluations never create a second request; a failed occurrence may be retried up to 3 times. Event conditions act only on events after the rule was enabled. Requests are INTERNAL, carry the Transaction ID as a reference and a source of type BIZKICK_RULE ("From BizKick: <id>"), and assignment uses the unchanged governed assignment: a refused assignment is recorded on the occurrence and the request stays in the Inbox. Class A approval is unchanged. Rules run after a completed import and after a file is linked, revised or attached (a rules failure never fails the import or upload), on a manual "Run rules now", and on POST /automation/tick. The tick has no user: it is guarded by VFIRM_SERVICE_TOKEN in the x-vfirm-service-token header (constant-time compare; 503 if unset, 401 if missing or wrong) and runs each rule as its owner's principal actor. Supporting files (role SUPPORTING) are filed as attachments on the transaction and never become or supersede the primary revision. Signals for the dashboard tray come from GET /edcs/signals.
Rationale: Reusing W2 requests, the governed assignment and the document register keeps one audited path for work. Claiming before creating and a unique natural key make the dedupe safe under concurrency.
Boundaries: Migration 0051 only; the owner applies it in the Supabase SQL editor. Rules cannot create client-facing requests. No schedule triggers yet (VI-S1).
Known limitations: (1) On tick the rules run as the rule owner's principal actor (via automation_rule). (2) The production scheduler is a recommendation (Supabase pg_cron + pg_net, or any external cron calling the tick URL with the token), not applied. (3) VFIRM_AUTOMATION_AS_OF is a test-only hook; VFIRM_AUTOMATION_TICK_MS (min 60000) enables an in-process dev timer. (4) The Postgres smoke connects as the database owner, so RLS is not re-proved. (5) A request is created after its occurrence is claimed; a crash in between leaves a CLAIMED occurrence that is not retried.
Verification: npm run check:ce:s3-register-rules passes on the JSON store and a fresh scratch Postgres (0001-0051); regression set and browser click-through pass.
Follow-up: CE-S4 (Number Authority) starts only on the owner's "Proceed CE-S4".

## ADR-098 - Connected EDCS CE-S4: Number Authority
Date: 2026-10-06
Status: Accepted (product owner go-ahead "Proceed CE-S4" on 2026-10-06)
Decision: vFirm hands out Transaction IDs for a Connected firm so two people can never receive the same number (BizKick QA BK-QA-002). A reservation is one (company code, document type, year, sequence), stored in edcs_number_reservations (migration 0052) with states RESERVED, REGISTERED (an imported register row carries the ID) and VOID. The next sequence is 1 + the highest sequence among every reservation (any state) and every imported register row for that company, type and year, so seeding needs no set-up step and a voided number is never reissued. Postgres: a transaction-scoped advisory lock per firm, company, type and year queues concurrent reservations, the unique index on (tenant, firm, company, type, year, sequence) is the backstop, and a unique violation retries. Any signed-in human member of the firm may reserve; only the owner may void, and only a RESERVED number can be voided (REGISTERED and VOID are final). Import cross-check: once the firm has reserved at least one number, a newly created row whose ID was never reserved gets an UNRESERVED warning (never a rejection); a reserved ID found in the register is marked REGISTERED in the same commit as the import; a reserved ID used with a different counterparty gets RESERVED_FOR_DIFFERENT_COUNTERPARTY; a voided ID found in the register gets VOIDED_NUMBER_USED and stays VOID. Routes: POST /edcs/numbers/reserve, POST /edcs/numbers/void, GET /edcs/numbers (filters status, type, year, stale_days, as_of). Console: Number Desk page; import and sync-history rows now show their warnings.
Rationale: A single authority with a database-level uniqueness guarantee removes the multi-user collision without a counter that can drift. Gradual adoption keeps existing firms and the earlier smoke tests unchanged.
Boundaries: Migration 0052 only; the owner applies it in the Supabase SQL editor. Numbers are not reserved for years or types the contract does not define. A year holds at most 9999 numbers per type (the ID carries four digits); a 10000th request is refused with NUMBER_RANGE_EXHAUSTED.
Known limitations: (1) A reserved number is not tied to a particular BizKick file until an import carries it. (2) Reserve and void audit events are written after the data commit (not atomic), as in CE-S1. (3) The Postgres smoke connects as the database owner, so RLS is not re-proved. (4) The BizKick-side note on NUMBER DESK, release notes and QA entry are BizKick release work, not done here.
Side change: the development JSON store (apps/api/src/store.mjs) now serializes withStore cycles and queues readStore behind writes, and retries a read that lands on a half-written file. Before this the JSON store could lose an update or read a torn file under concurrent requests (this also makes the CE-S3 occurrence claim safe on JSON). Production Postgres behaviour is unchanged.
Verification: npm run check:ce:s4-number-authority passes on the JSON store and a fresh scratch Postgres (0001-0052), including 50 concurrent reservations and a direct duplicate-number test against the unique index; regression set and browser click-through pass.
Follow-up: CE-S5 (Delegation of Authority import) starts only on the owner's "Proceed CE-S5".

## ADR-099 - Connected EDCS CE-S5: Delegation of Authority
Date: 2026-10-06
Status: Accepted (product owner go-ahead "Proceed CE-S5" on 2026-10-06)
Decision: The client's own approval limits decide who may approve an EDCS-linked draft. vFirm imports the BizKick Master Control Workbook (BK-SYS-003) sheets Approval Limits and Responsibility Matrix as a versioned approval policy (table approval_policies, migration 0053; immutable versions, exactly one ACTIVE per firm, content-hash based so the same workbook and mapping adds no version). The owner confirms two mappings on every import: each approver label (for example "Authorised Manager", "Owner / Board") to vFirm role codes or the firm owner, and each EDCS document type (PO, PV, PCV, SA) to a money row in Approval Limits. Nothing is enforced that the owner did not confirm. When a draft is produced from a work request whose source is a BizKick transaction, the required tier is recorded on the draft. Approving it (APPROVED_FOR_CLIENT_DRAFT) is refused with 409 DELEGATION_APPROVER_REQUIRED unless the reviewer is the firm owner or holds a role mapped to that tier's approver or to a higher tier's approver; the message names the tier and the approver. Revision and rejection are never gated. Both outcomes are audited (edcs.delegation_denied, edcs.delegation_allowed), as are imports and the recorded tier. Class A approval stays a separate, earlier gate and still applies on top. Work that did not come from a BizKick transaction, or whose document type has no mapped limit, is not touched.
Rules fixed by this decision: a limit is inclusive (RM 5,000 is Tier 1 when the Tier 1 limit is 5,000); an amount in a currency other than MYR cannot be compared and goes to the top tier (no conversion); percentage limits (for example Discounts 5% / 10%) are imported and shown but cannot be mapped to a document type, because a register amount is money; a bare number below 1 in a limit cell is rejected as ambiguous (an Excel percent cell is stored as a fraction); a row whose Tier 2 is not above Tier 1, whose limits mix money and percent, or that repeats a transaction type is rejected with its reason and the rest still import; a missing sheet or a changed header rejects the whole file.
Rationale: The register already says what a transaction is worth; the client's workbook already says who may approve that. Joining them removes a manual check without letting vFirm invent authority, because the owner confirms every mapping and is never blocked herself. Enforcement sits in the route layer because the review itself is a store function that runs inside one store lock.
Boundaries: Migration 0053 only; the owner applies it in the Supabase SQL editor. vFirm never edits the workbook. The Responsibility Matrix is stored and shown with the policy; only Approval Limits is enforced in this sprint. The tier is also recomputed at review time against the active policy, so a policy updated after a draft was produced applies to the review.
Side changes: (1) One shared owner-role check (apps/api/src/edcs-owner.mjs) replaces the per-service lists in the EDCS and automation services; it is case-insensitive and now accepts the production role OWNER, which the old lists did not (a signed-up production owner would have been refused EDCS writes). apps/api/src/store.mjs requireHumanPrincipalActor has the same gap and was left untouched on purpose. (2) API error responses may carry a details object (used for import rejections).
Known limitations: (1) Role codes are free text, as the actor role is; a typo in a mapping means nobody but the owner can approve that tier. (2) The audit event is written after the data commit (not atomic), as in CE-S1 and CE-S4. (3) Two approvals by different roles on one draft are not modelled; one eligible reviewer approves. (4) The Postgres smoke connects as the database owner, so RLS is not re-proved. (5) Per-line or cumulative limits ("per approval limit" in the matrix) are not computed: the limit applies to the transaction amount.
Verification: npm run check:ce:s5-delegation-of-authority passes on the JSON store and on a scratch Postgres (0001-0053); regression set and browser click-through pass.
Follow-up: CE-H1 and CE-S6 start only on the owner's instruction.

## ADR-100 - Connected EDCS CE-H1: Scale Hardening
Date: 2026-10-06
Status: Accepted (product owner go-ahead "Proceed CE-H1 and CE-S6" on 2026-10-06)
Decision: Continuous connector sync must not slow every page, so the hot paths stop loading the whole database. (1) The store loaders and readStore/withStore take two options: tenantId (load only that tenant's rows) and ledger:false (skip the three ledgers event_log, audit_events, policy_decisions, which dominate cost). (2) The EDCS repository gains readWhere on indexed fields; transaction detail, revisions, events and run lookups read only their own rows. (3) Append-only writers (work request create, file revision register, EDCS services) use a tenant-scoped, ledger-less mutator and still append their events and audits. (4) GET /mvp/store accepts tenant_id; the console passes its scope. Without tenant_id the endpoint is unchanged.
Evidence: scripts/measure-ce-h1-scale.mjs on a fresh scratch Postgres at 5 firms x 2,000 rows x 3 revisions. Before to after (median ms): scoped store read 3841 to 25; work request create 1580 to 19; transaction detail 932 to 107; slowest 500-row import 3348 to 1578. All budgets met (import 5000, detail 300, scoped store 1500, work request 1000). Functional regression: scripts/smoke-ce-h1-scoped-reads.mjs and the full regression set pass on JSON and on Postgres 0001-0054.
Boundaries: No migration. The JSON dev store ignores tenantId and ledger options. A scoped read is not authentication: GET /mvp/store still trusts the caller and is flagged for the production API-host work.
Known limitations: (1) Unscoped whole-store reads (admin/export paths) still load everything. (2) The ledger-less mutators are safe only because the app_state blob holds no relational ledger rows; any new collection written this way must be checked against that rule.
Follow-up: CE-S7 starts only on the owner's instruction.

## ADR-101 - Connected EDCS CE-S6: Connector Agent
Date: 2026-10-06
Status: Accepted (product owner go-ahead "Proceed CE-H1 and CE-S6" on 2026-10-06)
Decision: A small Node-only program (apps/edcs-connector) runs on the PC or server that can see BizKick, reads the register and controlled folders, and sends vFirm only what changed. (1) Connector tokens (vfc_..., table edcs_connectors, migration 0054) are firm-scoped, stored as a SHA-256 hash, shown once, rotatable and revocable by the firm owner; a revoked token is refused and the console shows Revoked. (2) Deliveries are deltas (changed rows plus the full set of present identities) judged by the same engine as a manual upload (applyRegisterRun), each carrying an idempotency key so offline retries and lost acknowledgements apply once. (3) On-disk FIFO queue with backoff and dead-letter; a heartbeat reports last seen, last sync, queue length and errors to the console (BizKick > Connector). (4) File content follows the content policy: HR types, NDA and AGR are metadata only by default and their bytes never leave the PC. (5) The connector never writes inside BizKick; the optional _vFirm_Outbox is the only permitted write area, is off by default, and state_dir must be outside BizKick. (6) Packaging: Windows scheduled task for Topology A; same build on a UNC path with a read-only service account for Topology C.
Evidence: npm run check:ce:s6-connector passes on the JSON store and on Postgres 0001-0054, including the packaged build: one changed row gives exactly one event with the right outcome; offline then reconnect delivers once with no duplicates; revoked token refused and shown as revoked; file-system audit shows no write outside the outbox; HR files metadata only.
Boundaries: Migration 0054 only; the owner applies it in the Supabase SQL editor. vFirm never edits BizKick. Manual Windows test is still to be run by the owner.
Known limitations: (1) The token sits in the connector config or an environment variable on the PC. (2) File-change notifications are unreliable on shares, so the timer poll is the guarantee. (3) Production still needs an API host, VFIRM_SERVICE_TOKEN and pg_cron.
Follow-up: CE-S7 starts only on the owner's instruction.

## ADR-102 - Store Read Guard for GET /mvp/store (CE-H1 follow-up)
Date: 2026-10-06
Status: Accepted (product owner instruction "fix it" on 2026-10-06, in answer to the CE-H1 hand-back flag)
Decision: GET /mvp/store stops trusting its caller on a production server. The rule lives in apps/api/src/store-read-guard.mjs (pure functions) and is applied in the route. It is ENFORCED when the Postgres backend and real Supabase JWT verification are both configured, or when VFIRM_STORE_AUTH=required; VFIRM_STORE_AUTH=open forces it off. When enforced: (1) a tenant-scoped read (?tenant_id=) needs a request whose Bearer token was verified, and the verified actor must belong to that tenant (and that firm when firm_id is given); client-set x-vfirm-* headers do not count; (2) the whole-database dump (no tenant_id) needs the service token (x-vfirm-service-token, the same VFIRM_SERVICE_TOKEN the automation tick uses). The signed-in console is unaffected: it resolves identity through GET /auth/me and reads the store with its tenant and Bearer token. Local JSON development and the smoke scripts are unchanged.
Also in this change: the stale check:post-hm-s4:mvp-store-scoping-fix test is repaired (it still set the identity as { tenant_id, firm_id } after Slice 6a moved the filter into the shared scopeStoreToFirm, which needs identity.firm and identity.tenant and now narrows tenants and firms to the signed-in ones); both servers accept the host-provided PORT; production setup guide and Windows manual test written; connector local test kit added.
Verification: npm run check:ce:h1-store-read-guard (JSON only, never touches a database) proves the pure rule, when enforcement switches on, and over HTTP that an enforced server refuses no-token, header-only, bad-token and un-tokened-dump requests and that the service token opens the dump. check:post-hm-s4:mvp-store-scoping-fix passes.
Boundaries: No migration. The Bearer-verified path itself (a real Supabase JWT) is covered by the pure rule, not by an HTTP test, because the smoke has no Supabase issuer; check it once on the hosted API (setup guide step 10 and a signed-in console load).
Known limitations: (1) This closes /mvp/store only. devActorFromHeaders still trusts client-set x-vfirm-* headers when no Bearer token is sent, and actorFromBody falls back to a system actor, so most other routes remain open to an anonymous caller on a public address. Not audited route by route. A production-auth sprint is recommended before any real client data is hosted. (2) Anything that read the unscoped dump over HTTP with no credentials (legacy apps/web, ad-hoc scripts) is refused on an enforced server by design.
Follow-up: production-auth sprint (owner decision). CE-S7 starts only on the owner's instruction.

## ADR-103 - Hosting choice and production-auth sprint (owner decisions)
Date: 2026-10-06
Status: Accepted (product owner instructions on 2026-10-06)
Decision: (1) Host on Vercel, Singapore region, for the API and the console. (2) Run a production-auth sprint before any real client data is placed on a public address.
Why it matters: The API is currently a long-running Node program (`apps/api/src/server.mjs`) with a database connection pool and file-based dev paths. Vercel runs functions, not long-running servers, so the API needs a thin Vercel entry point and a check that the pool settings suit short-lived functions. The Supabase pooler is in Seoul; Singapore is the nearest Vercel region. The production-auth gap (client-set `x-vfirm-*` headers trusted; command routes fall back to a system actor) is recorded in ADR-102 and in `CE_PRODUCTION_SETUP_GUIDE_v1.0.md`.
Follow-up: the production-auth sprint starts with a route-by-route audit; the Vercel adaptation is planned inside that sprint. CE-S7 starts only on the owner's instruction.
Delivered (production-auth gate, 2026-10-06): apps/api/src/request-auth-gate.mjs plus a body scope check in readJson. On an enforced server every route needs a verified Bearer user of an onboarded firm unless it has its own credential (health, auth/me, provider config, sign-up with a verified session, service-token routes, connector routes). POST /tenants, /firms and /mvp/reset are closed. Verification: npm run check:pa:request-gate (JSON only); regression set passes on JSON and Postgres. Not done: a real-token end-to-end test, per-route role audit, rate limiting, the Vercel entry point.

## ADR-104 - Vercel adapter (API and console in one project, Singapore)
Date: 2026-10-06
Status: Accepted (product owner instruction "Vercel adapter first, Bismillah" on 2026-10-06, following ADR-103)
Decision: One Vercel project serves the console (static files built into dist/) and the API (one function, api/index.mjs, under /api). vercel.json sets region sin1, a 60 second function limit, the /api rewrite and bundles infra/database/** for the readiness route. server.mjs now exports its request handler and does not start a listener when VERCEL is set; local and other-host behaviour is unchanged. On Vercel the Postgres pool is attached to the platform with @vercel/functions (optional import, never blocks start-up).
Why this shape: one address and one region, no cross-site setup, and the console already calls /api. The API address for connectors and the daily schedule is https://<project>.vercel.app/api.
Evidence: npm run check:vercel:adapter (JSON only) proves the URL rebuilding for both rewrite behaviours, a JSON body, query string and 404 through the function, no listener on Vercel, vercel.json, and the console static build. Regression set passes on JSON and Postgres.
Boundaries: No migration. Not yet run on the real platform: the first preview deploy is the test. Vercel refuses request bodies over about 4.5 MB, so the connector default max_file_bytes drops from 15 MiB to 3 MiB (a file travels as base64 in JSON) and a console register upload is limited the same way. Vercel's free Hobby plan is for non-commercial use; a paid plan is needed. @vercel/functions was added to package.json; package-lock.json was not regenerated (npm install does it).
Known limitations: (1) Each function instance keeps its own small connection pool (DATABASE_POOL_MAX 3 recommended with the Transaction pooler). (2) Cold starts add a delay to the first request after idle time. (3) The rewrite behaviour (original URL kept or not) is handled both ways but only simulated. (4) Deployment Protection must not cover the production address, or connectors and pg_cron cannot reach the API.
Follow-up: first preview deploy and the real-token sign-in check (owner); per-route role audit and rate limiting stay open. CE-S7 starts only on the owner's instruction.

## ADR-105 - Register dates: day-month-year accepted, read day first
Date: 2026-10-08
Status: Accepted (product owner instruction "accept day-month-year dates" on 2026-10-08)
Decision: The register date reader (normalizeRegisterDate) now accepts, besides Excel serials and ISO text YYYY-MM-DD, day-month-year text: DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY and the two-digit-year forms DD-MM-YY, DD/MM/YY, DD.MM.YY, and YYYY/MM/DD. Day-month-year is always read DAY FIRST (Malaysian convention), so 01-09-26 is 1 September 2026. A two-digit year means 20YY. The date must be a real calendar date. Text such as "next Friday" or "01 Sep 2026" is still INVALID_DATE. Dates are stored as ISO in every case.
Why: The Windows manual test (2026-10-07) showed that opening and saving register.csv in Excel rewrites dates as 01-09-26, and vFirm then rejected every row. The rejection was safe but made normal Excel use fail.
Evidence: npm run check:ce:register-date-formats (pure check, 40-odd cases including leap days, day-first proof and rejects). CE-S0, CE-S1, CE-S2 and CE-S6 checks still pass; the contract's "Expiry date is text" reject row is unchanged.
Boundaries: No migration. No change to amounts, statuses or the ISO storage form. A register that mixes two spellings of the same date in different rows is read row by row.
Known limitations: (1) A date typed month-first (09-01-26 meaning 1 September) is read as 9 January, because the rule is day first; the owner must not mix conventions inside one register. (2) Other spellings such as 1 Sep 2026 stay invalid. (3) An Excel save can still pad rows with extra empty columns; that was harmless in the test.
Follow-up: Contract v1.0 sections on dates and INVALID_DATE updated in the same change.

## ADR-106 - Connected EDCS over Microsoft 365 (CE-S7): Sites.Selected, app-only, read-only
Date: 2026-10-08
Status: Accepted (product owner instruction "go to CE-S7" on 2026-10-08; permission model "Sites.Selected, app-only" and scope "build plus simulated Graph test, real-tenant test later" chosen by the owner)
Decision: When the BizKick folders live in OneDrive or SharePoint (Topology B), vFirm reads them server-side from Microsoft Graph instead of through a connector program. (1) Permission model: one Microsoft Entra app registration with ONLY the Sites.Selected application permission, granted by the firm's admin to ONE site; vFirm further restricts itself to ONE folder of ONE document library named by the owner, and ignores (never downloads) every change outside that folder. (2) Read-only: the Graph client issues only GET requests (plus the sign-in POST); there is no code path that writes to Microsoft 365. (3) Delta: the library's delta query (delta works on the library root, so the folder limit is applied by vFirm to each item's path; when Graph omits an item's path, the item is asked for it) gives only the changes since the last read; the change link is stored and used next time; an expired link (410) restarts from a full listing, which is safe because filing is idempotent. (4) Same contract: the register goes through the same applyRegisterRun as an upload and the files through linkEdcsFile, so outcomes, content policy (D7) and audit are CE-S1/CE-S2's; a run is marked source_kind CLOUD and carries source_ref (item id, eTag, saved version id, path) as revision evidence. Files with no transaction ID, lock files (~$), hidden files and files outside the controlled folders are not filed. (5) Secrets: the app secret is stored AES-256-GCM encrypted under a server key (VFIRM_SECRET_KEY, 32 bytes, never in the database); access tokens are fetched per read and never stored; the secret is never returned, listed or exported; Disconnect erases it. (6) Lost access: if Microsoft answers 401/403 or refuses the secret, the connection becomes ACCESS_LOST, polling stops at once, an audit event is written and the console shows "Microsoft stopped the access"; the owner presses "Save and check access" (without retyping the secret) after the admin fixes it. Passing errors (503, network, throttling) never disconnect; they are shown and retried. (7) When it runs: the owner's "Read now" button and the existing daily tick (POST /automation/tick with the service token), which now also visits every firm with an ACTIVE Microsoft 365 connection within a 40-second budget.
Why: Many firms keep BizKick in OneDrive or SharePoint, where a PC connector is the wrong shape. Sites.Selected gives the narrowest permission Microsoft offers and the admin can withdraw it at any time; the folder limit adds a second wall in vFirm's own code.
Evidence: npm run check:ce:s7-cloud-adapter, run against a simulated Microsoft (fake sign-in and Graph server inside the script) on the JSON store and on a fresh, fully migrated Postgres: sync equals upload for the same register (same counts and transactions); revoked consent stops sync, makes no further call to Microsoft and shows ACCESS_LOST; outside, sibling-named ("BizKickExtra"), archive and lock files are never downloaded or filed; every call to Microsoft is a GET; the bearer token is not sent to the download host; HR file is metadata only; expired change link restarts without duplicate runs; 503 does not disconnect; tick polls; disconnect erases the secret; owner-only; firm isolation; audit events; export carries the record without any secret. The earlier CE and regression checks still pass.
Boundaries: Migration 0055 (edcs_graph_connections, one row per firm, RLS backstop as 0050-0054) is listed for the owner to apply to production. The server needs VFIRM_SECRET_KEY before an owner can connect. No change to BizKick files or the register contract. LibreOffice or other desktop office suites cannot replace Microsoft 365 for this sprint; the CE-S6 connector already covers OneDrive-synced folders on a PC.
Known limitations: (1) Tested against a simulated Microsoft only; the real-tenant test follows the Entra guide and needs a Microsoft 365 tenant and an admin. (2) The first read of a very large library lists everything once; a first read that does not finish inside the 60 s function limit is retried next time and is safe, but a library of many thousands of controlled files may need a longer-running worker. (3) HR and Legal files that Microsoft gives no SHA-256 for are downloaded into memory once to fingerprint them and are never stored. (4) Files over 25 MB and registers over 12 MB are skipped and reported. (5) Version history is recorded as the latest saved version id at the time of reading; earlier versions are not back-filled. (6) Two overlapping reads of one firm are prevented only by a 5-minute lease, not a database lock. (7) The Hobby plan 60 s limit and non-commercial terms from ADR-104 still apply.
Follow-up: owner applies migration 0055, adds VFIRM_SECRET_KEY in Vercel, and runs the real-tenant test with the Entra guide; per-route role audit and rate limiting stay open.

