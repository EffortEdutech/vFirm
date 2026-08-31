---
id: VFIRM-R3-RELEASE-CANDIDATE-EVIDENCE-PACK-COMPLETED
title: "Release 3 Release Candidate Evidence Pack Completed"
version: "1.0"
status: "COMPLETED"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
release: "Release 3"
candidate_id: "R3-RC-2026-08-29"
candidate_date: "2026-08-29"
recommendation: "GO_FOR_RELEASE_3_ACCEPTANCE"
---

# Release 3 Release Candidate Evidence Pack Completed v1.0

## 1. Release candidate identity

| Field | Value |
|---|---|
| Release | Release 3 |
| Candidate ID | `R3-RC-2026-08-29` |
| Candidate date | 2026-08-29 |
| Prepared by | Codex working session for Virtual Firm Platform |
| Reviewed by | Product owner |
| Recommendation | `GO_FOR_RELEASE_3_ACCEPTANCE` |

## 2. Scope statement

Release 3 candidate scope:

```text
Virtual Firm Factory and repeatable controlled local firm provisioning.
```

Out of scope:

```text
Public marketplace, uncontrolled staging expansion, autonomous professional approval, broad multi-practice expansion, ecosystem observatory dashboards, live payment movement, and client-facing production deployment.
```

## 3. Architecture conformance

| Principle | Evidence | Result |
|---|---|---|
| Client buys from Virtual Firm, not AI | R3-S4 second-firm rehearsal runs client, proposal, project, delivery, invoice, and export records under the provisioned firm identity. | PASS |
| Human professional authority preserved | R3-S3 and R3-S5 require the provisioned firm's Virtual Principal/professional authority for pack certification and professional review. | PASS |
| No orphan regulated work | R3-S1, R3-S3, and R3-S5 deny missing responsible professional and missing authority. | PASS |
| No silent approval | R3-S1 denies approval-bypass final/issue state; R3-S2 denies system blueprint approval; R3-S4 denies silent QA resolution. | PASS |
| No direct LLM-to-regulated-final output | R3-S4 regulated deliverable issue requires evidence bundle and human professional review approval. | PASS |
| Tenant isolation | R3-S2, R3-S4, and R3-S5 deny cross-tenant provisioning, worker-binding, audit, and export access. | PASS |
| Attributable actions | R3-S2 through R3-S5 verify event and audit records for material Factory and business actions. | PASS |
| Deterministic workflow state | R3-S1 validator, R3-S2 provisioning states, R3-S3 certification states, and R3-S5 denial matrix are deterministic. | PASS |
| Export portability | R3-S2 through R3-S5 verify legally permissible export package counts include Factory and business records. | PASS |

## 4. Blueprint evidence

| Evidence item | Location/output | Result |
|---|---|---|
| Valid Firm Blueprint fixture | `tests/factory-blueprints/valid-formwork-firm.fixture.json` | PASS |
| Second-firm blueprint fixture | `tests/factory-blueprints/second-formwork-firm.fixture.json` | PASS |
| Firm/Workforce/Packs schema | `packages/core-domain/src/factory-blueprints.ts` and `.mjs` | PASS |
| Practice Pack manifest | `practice_pack_manifest` in valid fixtures | PASS |
| Service Delivery Pack manifest | `service_delivery_pack_manifest` in valid fixtures | PASS |
| Governance Pack manifest | `governance_pack_manifest` in valid fixtures | PASS |
| Jurisdiction Pack manifest | `jurisdiction_pack_manifest` in valid fixtures | PASS |
| Invalid fixture results | `scripts/smoke-r3-blueprint-contract-lock.mjs` | PASS |
| Validation error model | `validateFactoryBlueprintBundle()` findings model | PASS |

## 5. Provisioning evidence

| Evidence item | Location/output | Result |
|---|---|---|
| Approved blueprint record | `scripts/smoke-r3-provisioning-kernel.mjs` | PASS |
| Provisioning run record | `factory_provisioning_runs` collection/API/export | PASS |
| Provisioned firm identity | `provisioned_firm_instances` and created firm/principal records | PASS |
| Provisioned modules | `module_configuration` from Firm Blueprint | PASS |
| Provisioned service catalogue | `service_catalogue` from Firm Blueprint | PASS |
| Provisioned worker bindings | `factory_worker_bindings` | PASS |
| Provisioned audit identities | `worker_binding.created` event/audit evidence | PASS |
| Duplicate provisioning safety | R3-S2 and R3-S5 duplicate provisioning denial | PASS |

## 6. Pack binding evidence

| Evidence item | Location/output | Result |
|---|---|---|
| Practice Pack binding | `evaluatePackBindingCertification()` and R3-S3 smoke | PASS |
| Service Delivery Pack binding | `service_delivery_pack_manifest.practice_pack_ref` compatibility check | PASS |
| Governance Pack binding | approval rule and silent-approval denial checks | PASS |
| Jurisdiction Pack binding | active jurisdiction and credential rule checks | PASS |
| Pack compatibility pass | `pack_compatibility_checks` PASS record | PASS |
| Pack compatibility denial | incompatible candidate pack denied in R3-S3/R3-S5 | PASS |
| Service activation gate | `service_activation_records` ACTIVE/BLOCKED records | PASS |

## 7. Second-firm rehearsal evidence

| Step | Evidence | Result |
|---|---|---|
| Enquiry and intake | R3-S4 front desk enquiry, qualification, communication draft, handoff, and intake records | PASS |
| Client/project/task records | R3-S4 client, relationship, project, work package, and task read checks | PASS |
| Document and correspondence records | R3-S4 correspondence, document register, and revision records | PASS |
| Proposal approval/dispatch/acceptance | R3-S4 proposal approval, dispatch, and acceptance checks; unapproved dispatch denied | PASS |
| Invoice and receivable monitoring | R3-S4 invoice issue and draft-only receivable follow-up | PASS |
| Technical delivery package | R3-S4 drawing review, calculation input validation, QA finding, blocked package, and ready package | PASS |
| Professional approval block | R3-S4 system/silent QA resolution denied and deliverable issue requires review approval | PASS |
| Daily operations cockpit | R3-S4 operations summary checks priorities, exceptions, approvals, cash, and audit counts | PASS |
| Audit reconstruction | R3-S4 event/audit reconstruction assertions | PASS |
| Legally permissible export | R3-S4 export package count assertions | PASS |

## 8. Negative-test evidence

| Denial case | Evidence | Result |
|---|---|---|
| Missing Virtual Principal | `invalid-missing-principal.fixture.json`, R3-S1/R3-S5 | PASS |
| Missing responsible professional | `invalid-missing-responsible-professional.fixture.json`, R3-S1/R3-S5 | PASS |
| Invalid credential | R3-S5 missing credential rule candidate pack denial | PASS |
| Invalid jurisdiction | `invalid-jurisdiction.fixture.json`, R3-S1/R3-S5 | PASS |
| Unsafe worker authority | `invalid-unsafe-worker-authority.fixture.json`, R3-S1/R3-S5 | PASS |
| Approval-bypass workflow | `invalid-approval-bypass-pack.fixture.json`, R3-S1/R3-S5 | PASS |
| Incompatible pack | R3-S3/R3-S5 incompatible Practice Pack / Service Delivery Pack candidate denial | PASS |
| Cross-tenant blueprint read | R3-S5 | PASS |
| Cross-tenant provisioning read | R3-S5 | PASS |
| Cross-tenant worker binding read | R3-S5 | PASS |
| Cross-tenant audit read | R3-S5 | PASS |
| Cross-tenant export | R3-S4/R3-S5 | PASS |

## 9. Verification command record

| Command | Result | Notes |
|---|---|---|
| `npm run check:r3:s1` | PASS | Blueprint contract lock |
| `npm run check:r3:s2` | PASS | Provisioning kernel JSON path |
| `npm run check:r3:s3` | PASS | Pack certification JSON path |
| `npm run check:r3:s4` | PASS | Second-firm rehearsal JSON path |
| `npm run check:r3:s5` | PASS | Factory hardening JSON path |
| `npm run check:r3` | PASS | R3-S1 through R3-S5 JSON aggregate |
| `npm run check:r3:postgres` | PASS | R3-S2 through R3-S5 PostgreSQL-backed aggregate |
| `npm run check` | PASS | Full repository validation through R3-S5 |
| `npm run check:docs` | PASS | Baseline documentation validation |
| `npm run db:migrate` | PASS | 22 migration files validated |
| `git diff --check` | PASS | No whitespace errors |

## 10. Remaining risks

| Risk | Classification | Owner | Disposition |
|---|---|---|---|
| Generic Release 2 role/worker skill compiler remains represented through R3 blueprint/workforce contracts rather than a standalone compiler product. | Release 4 candidate | Product owner / platform engineering | Accepted as non-blocking for R3; should be revisited before staging/private pilot expansion. |
| Factory pack certification records are executable and exportable, but relational tables are migration-shaped while runtime still uses the shared store path for these Factory records. | Release 4 candidate | Platform engineering | Accepted for local controlled R3; harden to direct relational persistence before multi-tenant staging scale. |
| UI surface for Factory provisioning/certification is not productized; R3 evidence is API/smoke based. | Release 4 candidate | Product/design | Accepted for R3; Release 4 can add operator UI if staging/private pilot requires it. |
| Multi-practice/multi-jurisdiction catalogs beyond Formwork Engineering #001 are not implemented. | Release 5 candidate | Product owner / domain specialists | Accepted limitation; not required for R3 controlled Factory proof. |
| Marketplace, capacity economy, and VF-24 observatory remain intentionally excluded. | Later marketplace/ecosystem candidate | Product owner | Keep out of Release 4 unless explicitly approved. |

## 11. Go/no-go recommendation

Recommendation:

```text
GO_FOR_RELEASE_3_ACCEPTANCE
```

Rationale:

Release 3 meets its controlled local Virtual Firm Factory objective. It proves blueprint validation, provisioning, pack certification, second-firm operation, hardening denials, tenant isolation, auditability, and export using executable JSON and PostgreSQL-backed evidence.

## 12. Product-owner decision

Decision:

```text
PENDING_PRODUCT_OWNER_ACCEPTANCE
```

Decision date:

```text
PENDING
```

Approved by:

```text
PENDING_PRODUCT_OWNER
```