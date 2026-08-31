# AGENTS.md â€” Codex Working Instructions

## Mission

Continue development of the **Virtual Firm Platform** without breaking the architectural principles established in VF-00 â†’ VF-24.

## Mandatory terminology

Prefer:
- Virtual Firm Platform
- Professional Practice Infrastructure
- Virtual Firm Business Infrastructure
- Firm Runtime
- Control Plane
- Virtual Firm Factory
- Practice Pack
- Service Delivery Pack
- Firm Blueprint
- Workforce Blueprint
- Governance Pack
- Jurisdiction Pack
- Virtual Principal

Avoid public-facing use of **Operating System**.

## Non-negotiable architecture principles

1. **Client buys from the Virtual Firm, not from AI.**
2. **Professional owns professional practice/brand and remains human authority.**
3. **AI capability does not create professional authority.**
4. **No orphan regulated work:** every regulated deliverable must trace to a responsible authorized professional.
5. **No silent approval.**
6. **No direct LLM â†’ regulated final output for high-risk services.**
7. Use deterministic engines for high-risk calculations and rules.
8. RAG/vector search is retrieval, not the primary compliance mechanism.
9. Do not expose private chain-of-thought. Expose auditable evidence summaries.
10. Strict tenant/data isolation is mandatory.
11. Every human, AI worker, system and external service action must be attributable.
12. Business workflow state must be deterministic; LLMs operate inside workflow boundaries.
13. Data portability is a principle: professionals should be able to export business/client/project records where legally permissible.
14. Keep VF-09 runtime generic; business modules own domain logic.
15. Preserve the separation:
   - VF-13 = firm operational/executive intelligence.
   - VF-24 = ecosystem/global market intelligence.
16. Marketplace qualification gates must outrank price.
17. Do not claim professionals always carry â€œ100% liabilityâ€; liability depends on law, engagement, insurance and entity structure.
18. Software licensing must be contractually valid for multi-tenant/MSP/enterprise usage.

## Current project phase

Architecture Baseline v1.0 is frozen.

Current priority:
1. Release 1 is accepted for controlled local Formwork Engineering Virtual Firm pilot readiness. Next work must be human pilot rehearsal, local pilot handoff, bounded Release 2 definition, or explicitly approved staging deployment preparation.
2. Use `docs/10_post_freeze_technical_design/VFIRM_RELEASE_1_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md` as the governing post-Stage-20 sprint plan.
3. Do not create open-ended Stage 21+ feature stages by default.
4. Classify new requests as Release 1 stabilization, Release 1 blocker, Release 2 candidate, or explicit user-approved scope expansion.
5. Keep new build detail in technical design, schemas, contracts, tests, and code.
6. Do not reopen frozen architecture baseline documents unless the user explicitly requests a baseline change.

## Suggested implementation sequence

### Phase 1 â€” Reference vertical
Use **Formwork Engineering / Temporary Works** as Firm Template #001.

### Phase 2 â€” Core platform
Implement:
- tenant/firm identity
- clients/CRM
- sales/proposals
- contracts
- projects
- documents
- finance
- AI runtime
- approvals
- audit
- client portal

### Phase 3 â€” Specialist pack
Build Formwork Engineering Practice Pack with deterministic calculations and QA.

### Phase 4 â€” Firm Factory
Implement FirmBlueprint â†’ provisioning â†’ launch.

### Phase 5 â€” Network
Add trusted specialist network before any open global marketplace.

## Coding expectations

- Prefer typed schemas.
- Prefer explicit state machines.
- Prefer event-driven integration.
- Every tool has typed I/O, risk classification and permissions.
- Every important object is tenant-scoped.
- Every regulated approval records professional identity, credential, jurisdiction and evidence bundle.
- Every agent has a manifest, version, authority envelope, budget and audit identity.
- Do not hard-code around one LLM provider or one agent framework.

## Canonical execution chain

`Event â†’ Task â†’ Worker â†’ Context â†’ Permission â†’ Tools â†’ Execution â†’ Validation â†’ Escalation/Approval â†’ Output â†’ Audit â†’ Next Event`

## Canonical Virtual Employee

`Role + Skills + Knowledge + Tools + Memory + Permissions + Authority + Supervisor + Workflow + Budget + Audit`



