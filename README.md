# vFirm

vFirm is a Virtual Firm Platform: professional practice infrastructure that lets a qualified human professional launch and operate a client-facing firm with governed AI workers, shared business systems, service packs, finance, documents, audit, and professional approval controls.

The core equation:

```text
Professional Expertise + Virtual Workforce + Shared Business Infrastructure = Virtual Firm
```

## Current Status

Architecture Baseline v1.0 is frozen.

The Stage 1-20 feature-build track is complete. **Release 1 is accepted for controlled local Formwork Engineering Virtual Firm pilot readiness.**

Release 1 remains accepted for controlled local pilot readiness. The active approved scope expansion is the first solopreneur Formwork Engineering Virtual Firm, governed by `docs/10_post_freeze_technical_design/VFIRM_SOLOPRENEUR_FIRM_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md`.

## Read First

1. `docs/00_project_control/README_FOR_BUILDERS_v1.0.md`
2. `docs/08_shared_assets/ARCHITECTURE_BASELINE_V1_DOCUMENTATION_INDEX.md`
3. `docs/01_foundation/VF_PLATFORM_DOCTRINE_v1.0.md`
4. `docs/00_project_control/VF_IMPLEMENTATION_BLUEPRINT_v1.0.md`
5. `docs/10_post_freeze_technical_design/README.md`
6. `docs/10_post_freeze_technical_design/VFIRM_RELEASE_1_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md`
7. `AGENTS.md`

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



