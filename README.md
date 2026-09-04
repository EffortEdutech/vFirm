# vFirm

vFirm is a Virtual Firm Platform: professional practice infrastructure that lets a qualified human professional launch and operate a client-facing firm with governed AI workers, shared business systems, service packs, finance, documents, audit, and professional approval controls.

The core equation:

```text
Professional Expertise + Virtual Workforce + Shared Business Infrastructure = Virtual Firm
```

## Current Status

Architecture Baseline v1.0 is frozen.

Current durable state is summarized in `docs/AI_WORKSPACE_CONTEXT.md`.

As of 2026-09-04:

- Stage 1-20 and Release 1 are complete.
- Multi-tenant runtime binding is accepted for controlled local/private pilot operation.
- Controlled multi-firm pilot operations are accepted for Amanah Formwork Pilot Firm and NHL Global Solution.
- Controlled private directory operation remains bounded to human-governed/private use only.
- NHL-Q1 through NHL-Q6 are technically complete for NHL Global Solution BOQ/image quotation workflow readiness.
- NHL-Q workflow acceptance still requires an explicit product-owner decision; no silent acceptance is allowed.

## Read First

For efficient recovery and low-token work, start here:

1. `AGENTS.md`
2. `docs/AI_WORKSPACE_CONTEXT.md`
3. `docs/00_project_control/AI_DEVELOPMENT_WORKSPACE_GRAPHIFY_OBSIDIAN_PROTOCOL_v1.0.md`
4. `docs/10_post_freeze_technical_design/README.md`

For deeper architecture only when needed:

1. `docs/00_project_control/README_FOR_BUILDERS_v1.0.md`
2. `docs/08_shared_assets/ARCHITECTURE_BASELINE_V1_DOCUMENTATION_INDEX.md`
3. `docs/01_foundation/VF_PLATFORM_DOCTRINE_v1.0.md`
4. `docs/00_project_control/VF_IMPLEMENTATION_BLUEPRINT_v1.0.md`

## Project Layout

```text
apps/                 Product applications
packages/             Shared implementation packages
infra/                Database, deployment, and local development infrastructure
docs/                 Frozen architecture baseline and development documentation
tests/                Architecture, policy, and integration tests
archive/              Drafts and original scaffold material
```

## Port Convention

vFirm uses the `309#` localhost family:

- Web/main app target: `http://127.0.0.1:3090`
- API default: `http://127.0.0.1:3091`
- API smoke test: `http://127.0.0.1:3099`

## Development Commands

```powershell
npm run dev
npm run check
npm run check:api
npm run check:policy
npm run db:migrate
```

`npm run dev` starts the API on `http://127.0.0.1:3091` by default.

## Non-Negotiables

- Client buys from the Virtual Firm, not AI.
- Professional authority is human only.
- AI workers must have identities, limits, tools, budgets, and audit trails.
- No silent approval.
- No orphan regulated work.
- No direct LLM-to-final regulated output.
- Every material action is tenant-scoped and attributable.
