# AI Workspace Context - virtual-firm

This file is the local fallback bridge for Codex or Claude sessions that cannot access the central Obsidian vault. It is intentionally compact so future sessions can recover quickly without rereading the full frozen architecture baseline.

## Central Obsidian Vault

```text
C:\Users\user\Documents\00 AI agent\AI-Knowledge
```

Use the live vault when accessible. If not accessible, treat this file as the local snapshot of relevant AI workspace context.

## Project Identity

virtual-firm is the Virtual Firm Platform: professional practice infrastructure for client-facing firms with governed AI workers, shared business systems, Service Delivery Packs, Practice Packs, finance, documents, audit, and professional approval controls.

## Current Durable State - 2026-09-05

Architecture Baseline v1.0 is frozen.

Accepted controlled local/private pilot scopes:

- Multi-tenant runtime binding for separate active firm workspaces.
- Controlled multi-firm pilot operations for Amanah Formwork Pilot Firm and NHL Global Solution.
- Controlled private directory operation only, with public marketplace/ecosystem widening still locked out.

Current NHL quotation state:

- NHL-Q1 through NHL-Q6 are ACCEPTED for controlled local/private pilot operation for NHL Global Solution BOQ/image quotation workflow. Decision code `ACCEPT_NHL_Q_CONTROLLED_LOCAL_PRIVATE_PILOT`, recorded 2026-09-05 in `docs/10_post_freeze_technical_design/NHL_Q_WORKFLOW_ACCEPTANCE_DECISION_GATE_v1.0.md`.

Current AWIA virtual staff state:

- AWIA Virtual Staff (named virtual workers occupying paid staff seats, mapped to local Agent Skills packages such as CFO/FAO/SAO/OPO/ARO/CMO/CTO/CIO/CHRO) reached `AWIA_CONTROLLED_LOCAL_PILOT_READY`.
- Locked in `docs/10_post_freeze_technical_design/AWIA_CONTROLLED_LOCAL_PILOT_ACCEPTANCE_LOCK_v1.0.md` on 2026-09-05. Mandatory authorizations remaining: 0. Verify with `npm run check:awia:acceptance-lock`.
- All 5 optional expansion bundles are COMPLETED on 2026-09-05 (none lift locked boundaries): staff memory & conversation workspace, department dashboards, payroll & seat billing polish, multi-firm staff template scaling, staging preparation. Staging preparation concluded `NOT_READY_FOR_STAGING_BACKEND_MIGRATION_REQUIRED` (tracked as TD-009 in TECHNICAL_DEBT_REGISTER_v1.0.md); the JSON-store-backed local/private pilot is unaffected.
- Reference: `docs/10_post_freeze_technical_design/VFIRM_AWIA_VIRTUAL_STAFF_MODEL_AND_IMPLEMENTATION_PLAN_v1.0.md` for the canonical staff/seat/authority model.

Repository hygiene note:

- The working tree currently shows widespread modified-file status across nearly the whole repo. This is CRLF/LF line-ending churn only (confirmed via `git diff --stat` on sampled files, no content change) mixed with genuinely new, uncommitted AWIA source/doc files. Diff before assuming any given "M" file has real content changes.
- Unified roadmap to a real paying client hiring an AWIA virtual worker is recorded in `VFIRM_AWIA_HIRE_A_VIRTUAL_WORKER_UNIFIED_SPRINT_PLAN_AND_CHECKLIST_v1.0.md` (Phase A through Phase G). Phase A (AWIA pilot-day client walkthrough) completed live 2026-09-05: GO_FOR_AWIA_CONTROLLED_LOCAL_PILOT_ACCEPTANCE_LOCK, three real frontend/backend defects found and fixed in-session (commit `6909dd8`: lost AFCC click handlers, Postgres save stripping all awia_* collections, Assign/Prepare-Client-Draft forms sending wrong fields), one finding carried into Phase B (AWIA audit_events/event_log entries are silently dropped on Postgres because AWIA aggregate ids are not backend-aware UUIDs yet - see `AWIA_PILOT_DAY_PHASE_A_AUTHORIZATION_AND_DRY_RUN_RESULT_v1.0.md` v1.1). Phase B (close TD-009: Postgres schema + backend-aware id generation) is next and requires its own authorization.

Locked boundaries still in force:

- no production multi-tenant onboarding without explicit authorization;
- no public marketplace;
- no live matching;
- no ranking;
- no capacity allocation;
- no VF-24 observatory publication;
- no pricing intelligence;
- no autonomous award;
- no autonomous regulated approval;
- no live payment movement;
- no uncontrolled tenant/client data sharing.

## Read First

Use the repository README and AGENTS.md current phase rules. For compact recovery, read:

```text
AGENTS.md
docs\AI_WORKSPACE_CONTEXT.md
docs\00_project_control\AI_DEVELOPMENT_WORKSPACE_GRAPHIFY_OBSIDIAN_PROTOCOL_v1.0.md
docs\10_post_freeze_technical_design\README.md
```

For deeper architecture only when needed:

```text
docs\00_project_control\README_FOR_BUILDERS_v1.0.md
docs\08_shared_assets\ARCHITECTURE_BASELINE_V1_DOCUMENTATION_INDEX.md
docs\01_foundation\VF_PLATFORM_DOCTRINE_v1.0.md
docs\00_project_control\VF_IMPLEMENTATION_BLUEPRINT_v1.0.md
```

For the current NHL-Q acceptance decision:

```text
docs\10_post_freeze_technical_design\NHL_Q6_QUOTATION_EVIDENCE_PACK_AND_ACCEPTANCE_GATE_v1.0.md
docs\10_post_freeze_technical_design\NHL_Q_WORKFLOW_ACCEPTANCE_DECISION_GATE_v1.0.md
docs\10_post_freeze_technical_design\NHL_Q_SERIES_FULL_SPRINT_PLAN_AND_CHECKLIST_v1.0.md
```

## Graphify Workflow

When `graphify-out/graph.json` exists, query it before broad source browsing.

Useful commands:

```powershell
.\scripts\graphify.ps1 --version
.\scripts\graphify.ps1 query "Identify files relevant to the active sprint." --graph "graphify-out\graph.json"
.\scripts\graphify.ps1 explain "apps/api/src/server.mjs" --graph "graphify-out\graph.json"
.\scripts\graphify.ps1 explain "apps/web/public/app.js" --graph "graphify-out\graph.json"
```

Refresh from Windows with:

```powershell
& "C:\Users\user\Documents\00 AI agent\setup\build_multi_project_graphs.ps1" -Only virtual-firm
```

Configured graph scope:

- apps\api\src
- apps\web\src
- apps\web\public
- packages\core-domain\src
- packages\policy-engine\src
- packages\service-packs\src
- infra\database\migrations
- scripts
- tests\api-contracts
- tests\events
- tests\factory-blueprints
- tests\policy
- docs\00_project_control
- docs\01_foundation
- docs\02_business_infrastructure
- docs\03_runtime_platform
- docs\04_governance_trust_ai
- docs\05_commercial_intelligence_marketplace
- docs\06_data_service_delivery_launch
- docs\07_network_economy_observatory
- docs\08_shared_assets
- docs\10_post_freeze_technical_design

## Obsidian Workflow

Graphify answers: how does this code work?

Obsidian answers: why did we decide this?

Relevant Obsidian notes:

```text
C:\Users\user\Documents\00 AI agent\AI-Knowledge\Projects\virtual-firm\Overview.md
C:\Users\user\Documents\00 AI agent\AI-Knowledge\Architecture\Graphify + Obsidian Workflow.md
C:\Users\user\Documents\00 AI agent\AI-Knowledge\Architecture\Codex + Claude Code Workflow.md
```

Use Obsidian for rationale, roadmap direction, standards, and review notes. Do not use Obsidian as a replacement for repo docs, tests, source, schemas, package scripts, or sprint evidence.

## Usage-Economy Rule

Start with:

1. `git status --short --branch`
2. `git log --oneline -5`
3. Graphify query for the active sprint surface
4. this compact context bridge
5. only the active sprint/checklist docs

Avoid rereading every frozen architecture document unless the task specifically requires architecture review or baseline changes. Prefer focused smoke checks while building, and full `npm run check` only for release/gate/shared-runtime closeout.