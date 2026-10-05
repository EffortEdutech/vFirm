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
- Unified roadmap to a real paying client hiring an AWIA virtual worker is recorded in `VFIRM_AWIA_HIRE_A_VIRTUAL_WORKER_UNIFIED_SPRINT_PLAN_AND_CHECKLIST_v1.0.md` (Phase A through Phase G). Phase A (AWIA pilot-day client walkthrough) completed live 2026-09-05: GO_FOR_AWIA_CONTROLLED_LOCAL_PILOT_ACCEPTANCE_LOCK, four real frontend/backend defects found and fixed in-session (lost AFCC click handlers and Postgres save stripping all awia_* collections and an ungated Assign Work form in commit `6909dd8`; the Prepare Client Draft field-name mismatch in commit `8948259`), one finding carried into Phase B (AWIA audit_events/event_log entries were silently dropped on Postgres because AWIA aggregate ids were not backend-aware UUIDs yet - see `AWIA_PILOT_DAY_PHASE_A_AUTHORIZATION_AND_DRY_RUN_RESULT_v1.0.md` v1.1). Phase B (close TD-009: Postgres schema + backend-aware id generation) completed live 2026-09-06: migration `0024_awia_virtual_staff_persistence.sql` applied to the developer's Postgres, and a full provision/activate/assign/produce/review/prepare-client-draft cycle run live against it produced real relational AWIA rows and, for the first time, real audit_events/event_log entries for every AWIA action - TD-009 is CLOSED, see `TECHNICAL_DEBT_REGISTER_v1.0.md`. Phase C (OP-H1 to OP-H6 controlled multi-firm pilot operations) authorized and executed 2026-09-06: OP-H1 through OP-H5 existed from 2026-09-03 but predated AWIA virtual staff, so OP-H3 (Formwork) and OP-H4 (NHL) were extended to genuinely rehearse an AWIA virtual staff member inside each firm's controlled pilot day (task assignment, draft-only output, human review, client delivery draft, final_issue_allowed false throughout), and the tenant/firm-scoped evidence/export package now includes all 17 awia_* collections for both firms - see ADR-070 in `DECISION_REGISTER.md`. OP-H6's technical recommendation is GO_FOR_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE, and the product owner accepted OP readiness 2026-09-06 (ADR-071 in DECISION_REGISTER.md) - Phase C is CLOSED. Phase D (Release 4 staging/private pilot) completed 2026-09-06: Release 4 (R4-S1 through R4-S6) was already built and accepted 2026-08-30, before AWIA existed, so rather than re-running that already-accepted sequence, R4-S2/S4/S5 were extended to verify AWIA virtual staff actually works under real Release 4 staging controls (tenant-scoped export/backup, observability/audit review without reasoning leaks, provisioning inside an activated private pilot cohort) - see ADR-072. Phase D is CLOSED. Phase E (commercial activation for AWIA staff seats) is next and requires its own authorization plus an explicit product-owner payment-provider decision.

## Update - 2026-09-20

The "My Team" employee-for-hire hiring model sprint sequence (HM-S1 through HM-S3) is now CLOSED, superseding the "Phase E next" framing above as the most recent accepted scope:

- HM-S1 (position-to-skill catalogue, job-title relabel, Class-A approval-routing gate) is ACCEPTED - ADR-084 in `DECISION_REGISTER.md`.
- HM-S2 (real skill execution pilot: General Clerk / ARO-01 Administrative Request Triage, authority-gate extension, Workdesk UI correctness fix, full regression pass) is ACCEPTED - ADR-085 in `DECISION_REGISTER.md`.
- HM-S3 (live database wiring pivot from JSON store to real Supabase Postgres, legacy pilot-provisioning lockdown behind `VFIRM_ALLOW_LEGACY_PILOT_PROVISION`, template-catalogue and staff-code hardening, full nine-command regression pass) is ACCEPTED, sprint CLOSED - ADR-086 in `DECISION_REGISTER.md`.
- The governing sprint checklist for this sequence is the "vFirm Position-to-Skill Mapping v1.0" Claude Doc (owner-gated, one item at a time); it now shows all items Done and HM-S3 closed.
- Known residual items carried forward (not blockers): OP-H3 through OP-H6 legacy pilot-provisioning smoke scripts spawn their own disposable API server per script and therefore need `VFIRM_ALLOW_LEGACY_PILOT_PROVISION=true` set in the same terminal window that runs `npm run check:op:*`, not in the persistent dev-server window; `resetStore()` and `purgeTestFirmRecord` both have a 17-AWIA-table gap tracked for follow-up; OP-H6 carries its own independent `pending_product_owner_decision` status unrelated to HM-S3.
- Repository hygiene note: as of 2026-09-20, no git commit had been made across the entire HM-S1/S2/S3 sequence; this update accompanies a single retroactive commit covering that work, and Graphify has been refreshed to reflect it.

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

## Current Durable State - 2026-10-05 (supersedes the JSON-store/Docker framing above)

Read this section first; older sections above are history.

Database and infrastructure:

- Production database is Supabase (project `gvjjljgzguimpybpgjsf`). The JSON store and the old Docker Postgres setup are legacy and must not be suggested. `infra/docker/docker-compose.postgres.yml` and `.env.local.example` are kept only for historical reference and are labelled legacy.
- The app connects as the dedicated `vfirm_app` role (nosuperuser, nobypassrls), so row-level security is enforced. The Supabase pooler is in Session Mode with a cap of 15; the app pool default `max` is 10 (`DATABASE_POOL_MAX` may override but must stay under the cap).
- The owner applies migrations himself in the Supabase SQL editor. Migrations 0001-0050 are applied in production. Always list the real migrations folder before naming a new migration.
- Migrations 0028, 0029 and 0030 were delivered by chat before the repo was linked. The files in the repo were reconstructed on 2026-10-05 from their recorded descriptions; they are idempotent but are not byte-identical to what was applied, so do not run `scripts/db-migrate.mjs` against production without checking `schema_migrations` checksums first.
- Smoke tests must never point at production. Use a disposable local Postgres, or the JSON backend where a script supports it.

Architecture review status (see Project doc `claude/vfirm-architecture-review.md`):

- Phases 0-6 and 4h/4i slice 1 are done: fail-closed scoping, AWIA identity unification, relational column promotion (0031-0033), transaction standardisation, repository layer wiring (Phase 4c), write-side RLS backstop on every viable write path (0034-0046), bulk load/save dedup (Phase 4f), AWIA lifecycle state machine and budget caps (Phase 5), shared identity-resolution module and client cache (Phase 6).
- Still open: tenant-scoped reads across the ~230 `withStore` call sites, splitting `assertActorScope` (4e), retiring the JSON store (4f), and `apps/web/public/app.js` retirement (only when web-console reaches write/action parity).
- Write path rule: every Postgres write runs in one transaction and calls `setTenantContext(client, tenantId)` right after `begin`.

Connected EDCS (BizKick integration), governed by `docs/10_post_freeze_technical_design/VFIRM_CONNECTED_EDCS_AND_FIRM_IDEAS_SPRINT_PLAN_AND_CHECKLIST_v1.0.md` and ADR-095:

- Golden rule: BizKick is the source, the Bridge is the contract, vFirm is the governed record. vFirm never edits BizKick files.
- CE-S0 (contract v1.0 and fixtures) and CE-S1 (register import and sync ledger, migration 0050) are done. CE-S2 (file linking and document history) starts only when the owner says "Proceed CE-S2".
- Content policy (D7): HR and Legal are metadata-only unless the owner opts in per firm; Inventory and everything else are full content.
- Verify with `npm run check:ce:s0-contract-and-fixtures` and `npm run check:ce:s1-register-import`.

Repository hygiene:

- `apps/api/src/store-1.mjs` is dead code (nothing imports it) and is scheduled for removal.
- Commit CE-S0/CE-S1 work with explicit `git add` paths; the working tree may still show CRLF/LF churn.
