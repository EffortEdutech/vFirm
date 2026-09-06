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
