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




<!-- AI-DEVELOPMENT-WORKSPACE-GRAPHIFY-OBSIDIAN -->

## AI Development Workspace: Graphify + Obsidian

This repository is connected to the Effort Studio AI development workspace.

Central Obsidian vault:

```text
C:\Users\user\Documents\00 AI agent\AI-Knowledge
```

If the live vault is outside the current sandbox, read this local fallback bridge instead:

```text
docs\AI_WORKSPACE_CONTEXT.md
```

Use Obsidian only for architecture rationale, ADRs, roadmap context, cross-project standards, meeting notes, and research. Do not use Obsidian as a replacement for this repository's docs, tests, source files, schemas, or package scripts.

### Graphify First

When `graphify-out/graph.json` exists, use Graphify before broad manual inspection:

```powershell
.\scripts\graphify.ps1 query "question" --graph "graphify-out\graph.json"
.\scripts\graphify.ps1 explain "symbol-or-file" --graph "graphify-out\graph.json"
.\scripts\graphify.ps1 path "A" "B" --graph "graphify-out\graph.json"
```

Then inspect the actual source, tests, docs, or schema files directly before editing.

Refresh the configured graph from the central workspace:

```powershell
& "C:\Users\user\Documents\00 AI agent\setup\build_multi_project_graphs.ps1" -Only virtual-firm
```

Linux/macOS or Claude sandbox wrapper:

```bash
./scripts/graphify.sh --version
```

The `.ps1` wrapper is for Windows. The `.sh` wrapper is for Linux/macOS and Claude sandboxes; it installs the PyPI package `graphifyy` on demand and then runs `graphify`.

### Token and Time Economy

To conserve Codex and Claude usage, start each session by summarizing only the relevant Graphify findings, governing docs, and Obsidian/fallback context. Avoid rereading the whole architecture baseline unless the task is architectural or touches frozen baseline rules.

For new work, classify the request before implementation as one of:

- Release 1 stabilization
- Release 1 blocker
- Release 2 candidate
- Explicit user-approved scope expansion

Keep changes small, use focused checks, and refresh Graphify after meaningful code, schema, or docs structure changes when possible.

## Current Durable State - 2026-09-04

The compact current-state bridge is `docs\AI_WORKSPACE_CONTEXT.md`.

As of this date:

- Multi-tenant runtime binding is accepted for controlled local/private pilot operation.
- Controlled multi-firm pilot operations are accepted for Amanah Formwork Pilot Firm and NHL Global Solution.
- Controlled private directory operation is accepted only within its private/human-governed boundary.
- NHL-Q1 through NHL-Q6 are technically complete for NHL Global Solution BOQ/image quotation workflow readiness.
- NHL-Q acceptance remains pending explicit product-owner decision; no silent acceptance is allowed.

Use `docs\00_project_control\AI_DEVELOPMENT_WORKSPACE_GRAPHIFY_OBSIDIAN_PROTOCOL_v1.0.md` to reduce repeated context loading and recover after forced stops.
