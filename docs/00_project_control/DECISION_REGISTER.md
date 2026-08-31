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
