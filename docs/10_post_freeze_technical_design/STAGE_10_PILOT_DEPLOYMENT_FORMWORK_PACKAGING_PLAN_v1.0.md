---
id: VF-STAGE-10-PILOT-DEPLOYMENT-FORMWORK-PACKAGING-PLAN
title: "Stage 10 - Pilot Deployment and Formwork Service Pilot Packaging Plan"
version: "1.0"
status: "Implementation Plan"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Stage 10 - Pilot Deployment and Formwork Service Pilot Packaging Plan v1.0

## Purpose

Stage 10 packages the working vFirm MVP into a controlled Formwork Engineering pilot. The stage is about making the first external-facing trial understandable, repeatable, bounded, and auditable.

This is still not unrestricted public production. The pilot is a controlled private trial for VF-SP-001 Formwork Engineering.

## Scope

Stage 10 adds:

1. Formwork pilot package endpoint;
2. pilot workspace view;
3. pilot smoke script that seeds and proves the full workflow;
4. pilot operating handbook;
5. onboarding checklist;
6. explicit pilot exclusions and acceptance criteria.

## Pilot package

Pilot code: `VF-PILOT-001`

Service pack: `VF-SP-001`

Mode: `controlled_private_pilot`

Included capabilities:

- client intake;
- proposal and approval;
- project opening;
- task/evidence workflow;
- deliverable draft/review/issue gates;
- invoice issue/payment status;
- AI worker assistance with human review;
- trusted-network listing and capacity signal;
- ops readiness visibility.

Excluded capabilities:

- final automated engineering design;
- professional seal/signature automation;
- manufacturer-specific claims without licensed data;
- public marketplace discovery;
- external production users without production auth.

## Acceptance criteria

The pilot is acceptable when:

- the workflow can be seeded repeatedly;
- every regulated gate preserves human professional authority;
- every command creates traceable event/audit records;
- Ops readiness shows pilot risks honestly;
- operator documentation explains what to do and what not to do.

## Exit criteria

Stage 10 can close when:

- `GET /pilot/formwork` is available;
- web `Pilot` tab displays scope/checklist/criteria;
- pilot smoke script passes;
- full validation passes;
- pilot handbook and onboarding checklist are documented.
