---
id: VFIRM-RELEASE-3-PRODUCT-TARGET-SPRINT-PLAN
title: "Virtual Firm Release 3 Product Target and Sprint Plan"
version: "1.0"
status: "Post-Freeze Technical Design"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Virtual Firm Release 3 Product Target and Sprint Plan v1.0

## 1. Why this document exists

Release 1 proved the first controlled solopreneur Formwork Engineering Virtual Firm operating loop.

Release 2 is expected to close the skill compiler, governance, and runtime binding layer between role/worker skills and the Firm Runtime.

Release 3 turns that capability into a repeatable Virtual Firm Factory. The team must be able to create a second controlled firm from declarative blueprints and packs, not by hand-building another one-off pilot.

This document is the executable Release 3 product target and sprint plan. It does not reopen Architecture Baseline v1.0.

## 2. Release 3 product target

Release 3 is:

> A controlled Virtual Firm Factory release that provisions a second local Virtual Firm instance from Firm Blueprint, Workforce Blueprint, Governance Pack, Jurisdiction Pack, Practice Pack, and Service Delivery Pack inputs, with deterministic validation, authority enforcement, tenant isolation, auditability, export, and repeatable acceptance rehearsal.

Release 3 proves the factory equation:

```text
Firm Blueprint
  + Workforce Blueprint
  + Governance Pack
  + Jurisdiction Pack
  + Practice Pack
  + Service Delivery Pack
  + Firm Runtime Binding
  = Provisioned Virtual Firm
```

## 3. Release 3 is not

Release 3 is not a public marketplace release.

Release 3 does not attempt to deliver:

- open public professional onboarding;
- open client marketplace acquisition;
- uncontrolled third-party specialist matching;
- autonomous professional approval;
- direct AI-to-final regulated output;
- live payment movement unless explicitly approved in a separate commercial decision;
- broad multi-jurisdiction support beyond configured jurisdiction packs;
- ecosystem benchmarking or VF-24 observatory dashboards;
- enterprise federation at scale.

Those belong to Release 4, Release 5, or later marketplace/ecosystem releases.

## 4. Governing architecture sources

Release 3 is implemented under the frozen baseline and the post-Release-2 roadmap.

| Area | Source |
|---|---|
| Foundation and firm identity | `VF-01_Virtual_Firm_Foundation_v1.0.md` |
| Workforce catalogue and Workforce Blueprint | `VF-02_Workforce_Catalogue_and_Provisioning_v1.0.md` |
| Firm Runtime | `VF-09_Virtual_Workforce_Runtime_Architecture_v1.0.md` |
| Control Plane and platform infrastructure | `VF-10_Control_Plane_and_Platform_Infrastructure_v1.0.md` |
| Professional governance and trust | `VF-11_Professional_Governance_Compliance_and_Trust_v1.0.md` |
| Security, identity, and trust | `VF-17_Security_Identity_and_Trust_Infrastructure_v1.0.md` |
| AI governance and worker safety | `VF-18_AI_Governance_Agent_Safety_and_Autonomous_Operations_v1.0.md` |
| Service delivery and Practice Packs | `VF-19_Service_Delivery_and_Professional_Practice_Engine_v1.0.md` |
| Productization and Service Delivery Packs | `VF-20_Productization_Service_Pack_and_Industry_Expansion_Engine_v1.0.md` |
| Firm Factory and launch engine | `VF-21_Onboarding_Certification_and_Firm_Launch_Engine_v1.0.md` |
| Post-Release-2 roadmap | `VFIRM_RELEASE_3_TO_MARKETPLACE_ROADMAP_v1.0.md` |

## 5. Release 3 entry criteria

Release 3 may begin only when the product owner records that Release 2 is closed or explicitly accepts any remaining Release 2 gaps as Release 3 blockers.

Minimum entry expectations:

1. Role and worker skill manifests have a validated compiler path.
2. Worker authority envelopes can be bound and enforced at runtime.
3. Governance checks block unauthorized and regulated actions.
4. Human, AI worker, system, and external-service actions are attributable.
5. The first solopreneur Formwork Engineering firm still passes the acceptance rehearsal.
6. No uncontrolled staging, marketplace, or multi-tenant expansion is active by default.

## 6. Primary Release 3 user

Primary user:

- product owner / platform operator configuring a new controlled firm;
- Virtual Principal receiving the provisioned firm;
- development team validating factory output.

Primary reference vertical:

- `VF-SP-001 Formwork Engineering / Temporary Works` remains Practice Pack #001.

Secondary proof point:

- a second controlled local firm, created from blueprint inputs, must run through the same representative operating loop as the first solopreneur firm.

## 7. Canonical Release 3 flow

```text
Scope decision
  -> Blueprint authoring
  -> Blueprint validation
  -> Pack compatibility validation
  -> Authority and jurisdiction validation
  -> Tenant-scoped firm provisioning
  -> Worker and skill binding
  -> Module and service activation
  -> Readiness simulation
  -> Acceptance rehearsal
  -> Evidence pack
  -> Release 3 go/no-go decision
```

## 8. Core objects to implement or formalize

Release 3 should formalize these objects as typed schemas and persistent records where needed.

| Object | Purpose |
|---|---|
| `FirmBlueprint` | Declarative definition of firm identity, modules, services, policies, packs, client experience, and launch settings. |
| `WorkforceBlueprint` | Declarative definition of worker roles, skill bindings, supervisors, permissions, budgets, memory boundaries, and audit identities. |
| `PracticePackManifest` | Domain bundle definition containing workflows, templates, deterministic checks, evidence rules, and professional approval requirements. |
| `ServiceDeliveryPackManifest` | Productized service package definition containing service scope, inputs, outputs, states, pricing hooks, delivery workflow, and acceptance rules. |
| `GovernancePackManifest` | Governance rules for professional authority, approvals, risk classes, review obligations, and forbidden autonomous actions. |
| `JurisdictionPackManifest` | Jurisdiction-specific rules for credentials, permitted services, required notices, data handling, and professional restrictions. |
| `ProvisioningRun` | Deterministic record of a firm provisioning attempt, validation results, created resources, failures, and audit references. |
| `ProvisionedFirmInstance` | Tenant-scoped operational firm created from an accepted blueprint and pack set. |
| `FactoryReadinessGate` | Machine-checkable gate proving provisioned firm readiness before pilot handoff. |
| `FactoryEvidencePack` | Exportable evidence bundle proving Release 3 acceptance results. |

## 9. Required state machines

### 9.1 Firm Blueprint state

```text
DRAFT
  -> SUBMITTED_FOR_VALIDATION
  -> VALIDATION_FAILED / VALIDATED
  -> APPROVED_FOR_PROVISIONING
  -> PROVISIONED
  -> RETIRED
```

Rules:

- `APPROVED_FOR_PROVISIONING` requires human product-owner approval.
- `PROVISIONED` requires successful deterministic validation and provisioning run.
- Invalid credentials, missing jurisdiction rules, missing responsible professional, or unsafe worker authority must block approval.

### 9.2 Provisioning run state

```text
CREATED
  -> VALIDATING_INPUTS
  -> VALIDATION_FAILED / READY_TO_PROVISION
  -> PROVISIONING
  -> PROVISIONING_FAILED / PROVISIONED
  -> READINESS_TESTING
  -> READINESS_FAILED / READY_FOR_HANDOFF
  -> ACCEPTED_FOR_LOCAL_PILOT
```

Rules:

- No firm is pilot-ready merely because provisioning completes.
- Readiness testing and handoff acceptance are explicit states.
- All failures must produce auditable reasons.

### 9.3 Pack compatibility state

```text
UNTESTED
  -> COMPATIBILITY_CHECKING
  -> INCOMPATIBLE / COMPATIBLE
  -> APPROVED_FOR_BINDING
```

Rules:

- A Practice Pack may not bind to a firm without compatible Governance Pack and Jurisdiction Pack constraints.
- A Service Delivery Pack may not expose delivery states that bypass approval or evidence gates.

## 10. Worker and skill binding rules

Each provisioned worker must have:

- role name;
- skill manifest reference and version;
- authority envelope;
- permitted tasks;
- forbidden actions;
- supervisor;
- tool permissions;
- memory boundary;
- budget boundary;
- audit identity;
- escalation route;
- deterministic workflow states in which it may act.

Release 3 must preserve the canonical Virtual Employee model:

```text
Role + Skills + Knowledge + Tools + Memory + Permissions + Authority + Supervisor + Workflow + Budget + Audit
```

## 11. Minimum API contract candidates

Release 3 implementation should expose or prepare these contracts.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/factory/blueprints/firms` | Create or draft a Firm Blueprint. |
| `GET` | `/factory/blueprints/firms` | List Firm Blueprints for a tenant/platform operator scope. |
| `GET` | `/factory/blueprints/firms/{firm_blueprint_id}` | Read a Firm Blueprint and validation state. |
| `POST` | `/factory/blueprints/firms/{firm_blueprint_id}/validate` | Run deterministic validation. |
| `POST` | `/factory/blueprints/firms/{firm_blueprint_id}/approve` | Human approval for provisioning. |
| `POST` | `/factory/provisioning-runs` | Start a provisioning run from an approved blueprint. |
| `GET` | `/factory/provisioning-runs/{provisioning_run_id}` | Read provisioning status, outputs, and failures. |
| `POST` | `/factory/provisioning-runs/{provisioning_run_id}/readiness-test` | Run factory readiness tests. |
| `POST` | `/factory/provisioning-runs/{provisioning_run_id}/accept-handoff` | Human acceptance for controlled local pilot handoff. |
| `GET` | `/factory/evidence-packs/{provisioning_run_id}` | Export Release 3 provisioning evidence. |

These are candidates until implemented. Any final endpoint must remain tenant-scoped and auditable.

## 12. Required event candidates

Release 3 should emit auditable business/system events for:

| Event | Meaning |
|---|---|
| `firm_blueprint.created` | Blueprint draft created. |
| `firm_blueprint.validation_requested` | Deterministic validation started. |
| `firm_blueprint.validation_failed` | Validation denied with reasons. |
| `firm_blueprint.validated` | Blueprint passed deterministic validation. |
| `firm_blueprint.approved_for_provisioning` | Human product-owner approval recorded. |
| `pack.compatibility_checked` | Pack compatibility result recorded. |
| `provisioning_run.started` | Provisioning run started. |
| `provisioning_run.failed` | Provisioning failed with auditable cause. |
| `firm_instance.provisioned` | Tenant-scoped firm instance created. |
| `worker_binding.created` | Worker bound to role, skill, authority, tools, and audit identity. |
| `factory_readiness.checked` | Readiness result recorded. |
| `factory_handoff.accepted` | Human acceptance for controlled local pilot handoff recorded. |
| `factory_evidence_pack.exported` | Evidence pack export generated. |

## 13. Fixed Release 3 sprint plan

Release 3 is capped to the following sprints unless the product owner approves a formal scope change.

| Sprint | Name | Outcome |
|---|---|---|
| R3-S1 | Blueprint Contract Lock | Schemas, validation rules, fixture blueprints, and invalid-case tests are created for Firm Blueprint, Workforce Blueprint, Practice Pack, Governance Pack, and Jurisdiction Pack. |
| R3-S2 | Provisioning Kernel | Approved blueprint provisions tenant-scoped firm shell, modules, service catalogue, worker bindings, audit identities, and default operating records. |
| R3-S3 | Pack Binding and Certification Gates | Practice Pack and Service Delivery Pack bind to workflows, evidence rules, deterministic checks, and authority gates without bypassing human approval. |
| R3-S4 | Second-Firm Rehearsal | A second controlled local firm is provisioned and run through front desk, admin, proposal, accounts, technical delivery package, daily operations, audit, and export. |
| R3-S5 | Factory Hardening Gate | Negative tests deny invalid credentials, invalid jurisdictions, missing responsible professional, unsafe authority, invalid pack compatibility, and cross-tenant leakage. |
| R3-S6 | Release 3 Evidence Pack and Go/No-Go | Evidence pack, checklist, completion record, remaining-risk register, and product-owner go/no-go recommendation are produced. |

No additional Release 3 sprint is created unless a scope decision records why it is necessary.

## 14. Sprint R3-S1 - Blueprint Contract Lock

### Goal

Create the executable contract for blueprint-driven firm provisioning.

### Build tasks

- Define `FirmBlueprint` schema.
- Define `WorkforceBlueprint` schema.
- Define `PracticePackManifest` schema.
- Define `ServiceDeliveryPackManifest` schema.
- Define `GovernancePackManifest` schema.
- Define `JurisdictionPackManifest` schema.
- Add fixtures for valid Formwork firm and intentionally invalid firm definitions.
- Add validation error model with machine-readable denial reasons.
- Add documentation mapping each schema to VF architecture sources.

### Acceptance checks

- Valid Formwork firm blueprint passes validation.
- Missing Virtual Principal fails validation.
- Missing responsible professional for regulated work fails validation.
- Missing jurisdiction pack fails validation.
- Worker with approval authority but no human professional identity fails validation.
- Pack with workflow state that bypasses approval fails validation.
- Validation output is deterministic and auditable.

### Completion artifact

`R3_S1_BLUEPRINT_CONTRACT_LOCK_COMPLETION_v1.0.md`

## 15. Sprint R3-S2 - Provisioning Kernel

### Goal

Provision a tenant-scoped firm instance from an approved blueprint.

### Build tasks

- Add persistent records for blueprints and provisioning runs.
- Implement blueprint validation endpoint or command.
- Implement product-owner approval for provisioning.
- Implement provisioning run creation.
- Create firm identity, module configuration, service catalogue, worker bindings, audit identities, and default records from blueprint input.
- Ensure provisioning is idempotent or safely rejects duplicate runs.
- Ensure provisioning failure leaves auditable partial-state evidence without silently creating an active firm.

### Acceptance checks

- Approved blueprint creates a firm instance.
- Unapproved blueprint cannot provision.
- Failed provisioning cannot become active.
- Duplicate provisioning cannot create duplicate operational firms without explicit new blueprint/version.
- All provisioned records are tenant-scoped.
- Provisioned worker bindings include authority, tools, memory boundary, supervisor, budget, and audit identity.

### Completion artifact

`R3_S2_PROVISIONING_KERNEL_COMPLETION_v1.0.md`

## 16. Sprint R3-S3 - Pack Binding and Certification Gates

### Goal

Bind Practice Pack, Service Delivery Pack, Governance Pack, and Jurisdiction Pack to the provisioned firm safely.

### Build tasks

- Implement pack compatibility checks.
- Bind Formwork Engineering Practice Pack #001 to a provisioned firm.
- Bind service delivery states to existing front desk, admin, sales, accounts, technical delivery, and daily operations modules.
- Bind governance rules to approval gates.
- Bind jurisdiction rules to credential and service eligibility checks.
- Add certification/readiness gate records.
- Prevent service activation when pack compatibility fails.

### Acceptance checks

- Compatible Formwork pack set activates for the provisioned firm.
- Incompatible pack set is denied with reasons.
- Regulated service activation requires responsible professional evidence.
- Technical package issue remains blocked without human professional approval.
- No pack can grant authority beyond worker envelope and governance rules.

### Completion artifact

`R3_S3_PACK_BINDING_CERTIFICATION_GATES_COMPLETION_v1.0.md`

## 17. Sprint R3-S4 - Second-Firm Rehearsal

### Goal

Prove the Virtual Firm Factory by running a second controlled local firm through the representative operating week.

### Build tasks

- Create a second-firm blueprint fixture.
- Provision the second firm from blueprint.
- Run front desk enquiry capture and intake.
- Run client, project, task, document, correspondence, and deadline records.
- Run proposal approval, dispatch, acceptance, invoice issue, receivables, and cash snapshot.
- Run Formwork delivery package preparation, controlled drawings, QA findings, and evidence readiness.
- Run daily operations cockpit summary.
- Run audit reconstruction and legally permissible export.
- Produce human-readable rehearsal result.

### Acceptance checks

- Second firm can operate without hand-edited application logic.
- First firm still passes regression after second firm provisioning.
- Cross-tenant records do not leak between first and second firm.
- Audit trail reconstructs business and worker actions for both firms.
- Export package contains only legally permissible tenant records.

### Completion artifact

`R3_S4_SECOND_FIRM_REHEARSAL_COMPLETION_v1.0.md`

## 18. Sprint R3-S5 - Factory Hardening Gate

### Goal

Prove the factory denies unsafe, incomplete, incompatible, and cross-tenant cases.

### Build tasks

- Add invalid-blueprint negative tests.
- Add unsafe-worker-authority negative tests.
- Add missing-professional-approval negative tests.
- Add invalid-jurisdiction negative tests.
- Add incompatible-pack negative tests.
- Add cross-tenant provisioning, read, update, audit, and export denial tests.
- Add failure-mode evidence to readiness report.

### Acceptance checks

- Invalid authority cannot be compiled, approved, or provisioned.
- Invalid jurisdiction cannot activate regulated service.
- Missing responsible professional blocks regulated work.
- Pack incompatibility blocks service activation.
- Cross-tenant access attempts fail for operational records, worker bindings, audit, and export.
- Denials produce evidence summaries without private chain-of-thought.

### Completion artifact

`R3_S5_FACTORY_HARDENING_GATE_COMPLETION_v1.0.md`

## 19. Sprint R3-S6 - Release 3 Evidence Pack and Go/No-Go

### Goal

Close Release 3 with evidence, not vibes. The little machine must earn its certificate.

### Build tasks

- Create Release 3 evidence pack template.
- Fill evidence pack with validation output, smoke results, regression results, denial cases, export results, and known risks.
- Update technical design index.
- Update decision register with Release 3 go/no-go recommendation.
- Produce operator-facing summary of what the Virtual Firm Factory can and cannot do.
- Classify remaining work into Release 3 blocker, Release 4 candidate, Release 5 candidate, or later marketplace/ecosystem candidate.

### Acceptance checks

- Evidence pack is complete.
- Full repository check passes.
- Release 3 exit criteria pass.
- Product owner can decide go/no-go from the evidence without inspecting raw JSON.

### Completion artifact

`R3_RELEASE_CANDIDATE_EVIDENCE_PACK_COMPLETED_v1.0.md`

## 20. Release 3 acceptance criteria

Release 3 can be accepted only when all are true:

1. A valid Firm Blueprint can be created, validated, approved, and provisioned.
2. A valid Workforce Blueprint binds workers with authority, tools, memory boundary, budget, supervisor, workflow states, and audit identity.
3. Practice Pack, Service Delivery Pack, Governance Pack, and Jurisdiction Pack compatibility is checked before activation.
4. A second controlled local firm is provisioned without hand-editing application logic.
5. The second firm can run the representative solopreneur operating loop.
6. The first firm still passes regression after second-firm provisioning.
7. Regulated work remains blocked until valid human professional approval exists.
8. Invalid credentials, jurisdictions, responsible-professional gaps, unsafe worker authority, and incompatible packs are denied.
9. Cross-tenant operational, audit, worker-binding, and export isolation are proven.
10. Material business and worker actions can be reconstructed from audit records.
11. Legally permissible export works for the provisioned firm.
12. Release 3 evidence pack and go/no-go recommendation are produced.

## 21. Release 3 implementation checklist

### R3-S1 Blueprint Contract Lock

- [ ] Define Firm Blueprint schema.
- [ ] Define Workforce Blueprint schema.
- [ ] Define Practice Pack manifest schema.
- [ ] Define Service Delivery Pack manifest schema.
- [ ] Define Governance Pack manifest schema.
- [ ] Define Jurisdiction Pack manifest schema.
- [ ] Add valid Formwork blueprint fixture.
- [ ] Add invalid blueprint fixtures.
- [ ] Add deterministic validation error model.
- [ ] Add R3-S1 completion record.

### R3-S2 Provisioning Kernel

- [ ] Add blueprint persistence.
- [ ] Add provisioning run persistence.
- [ ] Add blueprint validation command/API.
- [ ] Add human approval for provisioning.
- [ ] Add provisioning run command/API.
- [ ] Provision tenant-scoped firm identity and modules.
- [ ] Provision service catalogue.
- [ ] Provision worker bindings and audit identities.
- [ ] Prove duplicate provisioning is safe.
- [ ] Add R3-S2 completion record.

### R3-S3 Pack Binding and Certification Gates

- [ ] Add pack compatibility checks.
- [ ] Bind Formwork Practice Pack #001.
- [ ] Bind service delivery states.
- [ ] Bind governance gates.
- [ ] Bind jurisdiction eligibility checks.
- [ ] Add factory readiness gate records.
- [ ] Deny incompatible pack activation.
- [ ] Add R3-S3 completion record.

### R3-S4 Second-Firm Rehearsal

- [ ] Create second-firm blueprint fixture.
- [ ] Provision second controlled local firm.
- [ ] Run front desk and intake loop.
- [ ] Run admin and document-control loop.
- [ ] Run proposal, accounts, receivables, and cash snapshot loop.
- [ ] Run technical drawing and delivery package loop.
- [ ] Run daily operations cockpit.
- [ ] Run audit reconstruction.
- [ ] Run legally permissible export.
- [ ] Add R3-S4 completion record.

### R3-S5 Factory Hardening Gate

- [ ] Deny missing Virtual Principal.
- [ ] Deny missing responsible professional for regulated work.
- [ ] Deny invalid credential.
- [ ] Deny invalid jurisdiction pack.
- [ ] Deny unsafe worker authority.
- [ ] Deny incompatible pack binding.
- [ ] Deny cross-tenant operational access.
- [ ] Deny cross-tenant audit access.
- [ ] Deny cross-tenant export access.
- [ ] Add R3-S5 completion record.

### R3-S6 Evidence Pack and Go/No-Go

- [ ] Create Release 3 evidence pack template.
- [ ] Complete Release 3 evidence pack.
- [ ] Update technical design index.
- [ ] Update decision register.
- [ ] Produce operator-facing factory summary.
- [ ] Classify remaining backlog.
- [ ] Record Release 3 go/no-go recommendation.

## 22. Verification commands

Recommended Release 3 checks should include:

```text
npm run check
npm run check:sf-s6
npm run check:r3
npm run check:r3:postgres
node --check apps/api/src/server.mjs
node --check scripts/smoke-r3-virtual-firm-factory.mjs
git diff --check
```

The exact check scripts should be added during implementation. Release 3 is not accepted until both JSON fallback and PostgreSQL-backed paths pass where applicable.

## 23. Tool adoption boundary

Release 3 may evaluate external tools only when they solve a named Release 3 acceptance gap.

Candidate fit:

- Graphify or graph tooling: useful for blueprint, authority, credential, capability, and pack dependency graph analysis.
- Instructor or Outlines: useful for structured output validation behind deterministic schemas.
- Marker, Chunky, or Crawl4AI: possible pack/document ingestion aids, but not required for factory acceptance.
- LiteLLM: provider gateway candidate only if Release 2 runtime binding needs provider abstraction hardening.
- Langfuse: better suited for Release 4 observability unless Release 3 factory testing needs trace capture.
- Qdrant: retrieval support only; not a compliance or approval mechanism.
- DSPy: defer until stable traces and evaluation sets exist.

A tool must remain replaceable behind a vFirm-owned interface and must pass licensing, tenant isolation, security, portability, cost, operational support, and deterministic fallback review.

## 24. Stop rule

When Release 3 acceptance criteria pass, stop adding factory features.

Allowed after acceptance:

- bug fixes;
- evidence pack completion;
- operator documentation;
- Release 4 scope decision preparation.

Deferred after acceptance:

- staging/private pilot expansion;
- trusted specialist network;
- public marketplace;
- ecosystem intelligence dashboards;
- broad multi-practice expansion.

## 25. Release 4 handoff condition

Release 4 may start only after:

- Release 3 evidence pack is accepted;
- product owner approves controlled staging/private pilot scope;
- authentication provider, deployment environment, pilot cohort, support owner, data protection owner, and incident owner are named;
- any Release 3 blockers are closed or explicitly accepted as Release 4 blockers.