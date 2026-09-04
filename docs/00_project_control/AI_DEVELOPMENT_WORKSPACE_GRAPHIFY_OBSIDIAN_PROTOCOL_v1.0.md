# AI Development Workspace Graphify + Obsidian Protocol v1.0

Date: 2026-09-04

Status: Active repo-local operating protocol

Purpose: reduce repeated context loading, conserve Codex/Claude usage, and make forced stops recoverable while continuing development of the Virtual Firm Platform.

## Tool roles

Graphify answers: how does this codebase work?

Use it before broad manual inspection when `graphify-out/graph.json` exists.

Obsidian answers: why did we decide this?

Use it for architecture rationale, roadmap direction, cross-project standards, review notes, and human knowledge. Do not use Obsidian as the authoritative store for implemented repository state.

The repository remains authoritative for source, tests, schemas, package scripts, sprint plans, decision gates, completion evidence, and acceptance records.

## Start-of-turn recovery protocol

When a session resumes after a forced stop:

1. Run `git status --short --branch`.
2. Run `git log --oneline -5`.
3. Identify whether the previous sprint commit exists locally and whether the branch is ahead of `origin/main`.
4. Inspect only uncommitted files before editing.
5. If `graphify-out/graph.json` exists, query Graphify for the current sprint surface before opening large files.
6. Read `docs/AI_WORKSPACE_CONTEXT.md` for the compact current-state bridge.
7. Read only the governing sprint/design/check files needed for the active task.
8. Run focused smoke checks first; run full `npm run check` before release/gate commits.
9. Commit and push completed work so GitHub becomes the durable recovery point.

## Graphify command recipes

Use these from the repository root:

```powershell
.\scripts\graphify.ps1 --version
.\scripts\graphify.ps1 query "Identify the files touched by the current sprint and their relationships." --graph "graphify-out\graph.json"
.\scripts\graphify.ps1 explain "apps/api/src/server.mjs" --graph "graphify-out\graph.json"
.\scripts\graphify.ps1 explain "apps/web/public/app.js" --graph "graphify-out\graph.json"
.\scripts\graphify.ps1 path "apps/api/src/store.mjs" "scripts/smoke-nhl-q6-quotation-evidence-acceptance-gate.mjs" --graph "graphify-out\graph.json"
```

Refresh the central multi-project graph after meaningful code, schema, route, frontend, script, or documentation-relationship changes:

```powershell
& "C:\Users\user\Documents\00 AI agent\setup\build_multi_project_graphs.ps1" -Only virtual-firm
```

Graph output remains local/generated and should not be committed:

```text
graphify-out/
.graphify-work/
```

## Compact current-state bridge

Use `docs/AI_WORKSPACE_CONTEXT.md` as the local bridge when the Obsidian vault is unavailable or when usage economy matters.

That bridge should be updated when:

- a release or hardening sequence is accepted;
- the active scope changes;
- a new recovery protocol is introduced;
- the next recommended decision changes;
- Graphify/Obsidian workflow rules change.

## Sprint execution pattern

For most future vFirm work:

1. Classify the request against the accepted scope.
2. Query Graphify for relevant code/docs/tests.
3. Read the compact context and the active sprint plan/checklist.
4. Make the smallest coherent implementation change.
5. Add or update one focused smoke script.
6. Update the governing checklist, README index, and decision register.
7. Run focused checks.
8. Run full regression when closing gates or changing shared runtime.
9. Commit and push.
10. End with next decision/action, not a long recap.

## Current durable state

As of 2026-09-04:

- Multi-tenant runtime binding is accepted for controlled local/private pilot operation.
- Controlled multi-firm pilot operations are accepted for Amanah Formwork Pilot Firm and NHL Global Solution.
- Marketplace/ecosystem work remains bounded to controlled private directory preparation and operation; no public marketplace widening is authorized.
- NHL-Q1 through NHL-Q6 are technically complete for NHL Global Solution BOQ/image quotation workflow readiness.
- NHL-Q acceptance still requires an explicit product-owner decision; no silent acceptance is allowed.

## Non-negotiable boundaries

This workflow does not alter the Virtual Firm Platform governance boundaries:

- no autonomous regulated approval;
- no silent approval;
- no orphan regulated work;
- no direct LLM to regulated final output for high-risk services;
- no live payment movement unless explicitly authorized in a later scope;
- no public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, or uncontrolled tenant/client data sharing.
