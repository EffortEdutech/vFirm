# vFirm Builder README v1.0

## What we are building

vFirm is a Virtual Firm Platform.

It lets a qualified professional create and operate a client-facing professional service firm with shared business infrastructure, AI workers, specialist practice packs, governance, client workflows, finance, documents, and audit.

The product is not "AI that does professional work." The product is governed professional firm infrastructure around a human professional.

## The original model

The first analogy was a specialist hospital.

The hospital provides the facility, equipment, nurses, records, administration, billing, and patient flow. The specialist doctor provides professional expertise, judgment, approval, and responsibility.

vFirm applies that model to professional services:

```text
Platform = infrastructure and workforce
Professional = expertise and authority
Virtual Firm = business that clients buy from
```

## The architectural sentence to protect

```text
Professional Expertise + Virtual Workforce + Shared Business Infrastructure = Virtual Firm
```

## Builder rule after freeze

Architecture Baseline v1.0 is frozen.

Do not rewrite the baseline during implementation unless the user explicitly opens a baseline change request. New build detail should go into post-freeze technical design documents, schemas, tests, and implementation plans.

## What developers should build first

Build one safe operating loop before expanding:

```text
Professional -> Firm -> Client -> Intake -> Proposal -> Project -> Work Package
-> QA -> Professional Approval -> Delivery -> Invoice -> Audit -> Knowledge
```

Do not start with the global marketplace. Do not start with future architecture expansion modules. Do not start with open-ended autonomous agents.

## Must-read documents

1. `docs/08_shared_assets/ARCHITECTURE_BASELINE_V1_DOCUMENTATION_INDEX.md`
2. `docs/01_foundation/VF_PLATFORM_DOCTRINE_v1.0.md`
3. `docs/01_foundation/VF-01_Virtual_Firm_Foundation_v1.0.md`
4. `docs/01_foundation/VF-02_Workforce_Catalogue_and_Provisioning_v1.0.md`
5. `docs/00_project_control/VF_IMPLEMENTATION_BLUEPRINT_v1.0.md`
6. `docs/08_shared_assets/CANONICAL_SCHEMA_CATALOGUE_v1.0.md`
7. `docs/08_shared_assets/CANONICAL_EVENT_CATALOGUE_v1.0.md`
8. `docs/08_shared_assets/CANONICAL_POLICY_MODEL_v1.0.md`
9. `docs/08_shared_assets/VF_DEPENDENCY_MAP.md`
10. `AGENTS.md`

## Non-negotiables

- Client buys from the Virtual Firm, not from AI.
- Professional authority is human only.
- AI workers have identities, limits, tools, budgets, and audit trails.
- No silent approval.
- No orphan regulated work.
- No direct LLM-to-final regulated output.
- Every material action is tenant-scoped and attributable.
- Workflow state is deterministic.
- Evidence and audit matter as much as output.

## First vertical

The first reference vertical is Formwork Engineering / Temporary Works.

Build it as a Practice Pack and Service Delivery Pack on top of the generic platform. Do not bake formwork assumptions into the foundation.

## Current baseline state

Architecture Baseline v1.0 is frozen. VF-00 through VF-24, shared schemas, canonical events, policy model, authority vocabulary, dependency map, and Formwork reference backlog are the active source of truth.

Future architecture expansion remains outside the MVP foundation loop.


