---
id: VFIRM-AWIA-VS-S2-PACKAGE-REGISTRY-MAPPING-COMPLETION
title: "AWIA Virtual Staff Sprint 2 Package Registry Mapping Completion"
version: "1.0"
status: "AWIA-VS-S2 Complete"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
scope_classification: "Explicit User-Approved Scope Expansion"
authorization: "AUTHORIZE_AWIA_VS_S2_PACKAGE_REGISTRY_MAPPING"
---

# AWIA-VS-S2 Package Registry Mapping Completion v1.0

## 1. Sprint outcome

AWIA-VS-S2 is complete for the first package registry mapping slice.

The repository now has a machine-readable AWIA virtual staff package registry, typed contract declarations, and smoke validation for the local `C:\Users\user\Documents\00 Agent Skills` folder.

This sprint does not activate autonomous virtual staff operation, create UI screens, create database migrations, or allow staff packages to grant authority. It maps package sources into governed registry metadata only.

## 2. Implemented artifacts

| Artifact | Purpose |
| --- | --- |
| `packages/core-domain/src/awia-virtual-staff-registry.mjs` | Machine-readable local package registry, runtime eligibility map, first pilot staff references, and deterministic validator. |
| `packages/core-domain/src/awia-virtual-staff-registry.ts` | TypeScript contract declarations for package registry entries and first pilot staff references. |
| `scripts/smoke-awia-vs-s2-package-registry.mjs` | Smoke validation for registry completeness, package status rules, pilot staff package eligibility, local source paths, and boundary wording. |
| `package.json` | Adds `check:awia:vs:s2` validation command. |
| `docs/10_post_freeze_technical_design/README.md` | Adds this completion document to the post-freeze technical design index. |

## 3. Local package mapping

The registry maps every top-level folder currently observed under the local Agent Skills root.

| Source | Package kind | Registry status | Runtime meaning |
| --- | --- | --- | --- |
| `ARO` | business staff package | `CANDIDATE` | Administration/resource staff candidate; validation gate required. |
| `AWIA` | architecture reference | `REFERENCE_ARCHITECTURE` | Contract source only, not staff runtime. |
| `CFO` | business staff package | `REFERENCE_PINNED` | Controlled finance executive reference package. |
| `CHRO` | business staff package | `PLANNED` | Catalogue only. |
| `CIO` | business staff package | `DRAFT` | Catalogue only until complete validation. |
| `CMO` | business staff package | `CANDIDATE` | Marketing executive candidate; human review gate required. |
| `Construction` | domain reference package | `REFERENCE_DOMAIN` | Domain reference only until decomposed into governed bindings. |
| `COO` | business staff package | `PLANNED` | Empty or not-yet-authored source folder; catalogue only. |
| `CTO` | business staff package | `DRAFT` | Foundation/roster only. |
| `ECC-main` | engineering tooling package | `REFERENCE_TOOLING` | Engineering workflow tooling, not client-facing staff. |
| `FAO` | business staff package | `REFERENCE_PINNED` | Controlled finance administration reference package. |
| `OPO` | business staff package | `CANDIDATE` | Operations/project delivery candidate; validation gate required. |
| `SAO` | business staff package | `VALIDATED_CANDIDATE` | Automatable validation complete; human commercial review pending. |
| `vFirm` | legacy architecture reference | `LEGACY_REFERENCE` | Zip-only baseline reference, not staff runtime. |
| `virtual-firm` | platform repository | `REFERENCE_TOOLING` | Active platform repository, not staff package. |
| `_archive` | archive | `ARCHIVE` | Not runtime eligible. |
| `_cowork-ready` | support workspace | `SUPPORT` | Support workspace only. |

## 4. Registry status enforcement

The validator enforces:

- registry ID is present
- implementation boundary is metadata and validation only
- package IDs are unique
- source names are unique
- source paths are present and exist locally
- every registry status has a runtime eligibility meaning
- every business staff package has a role code
- every package has a default boundary
- every top-level Agent Skills folder is mapped
- every first pilot staff member points to a mapped runtime-candidate package

## 5. First pilot staff coverage

The first pilot staff references remain:

| Staff code | Package | Status basis |
| --- | --- | --- |
| `CFO-001` | `cfo` | `REFERENCE_PINNED` |
| `FA-001` | `fao` | `REFERENCE_PINNED` |
| `FAO-AP-001` | `fao` | `REFERENCE_PINNED` |
| `FAO-REV-001` | `fao` | `REFERENCE_PINNED` |
| `SAO-001` | `sao` | `VALIDATED_CANDIDATE` |
| `OPO-001` | `opo` | `CANDIDATE` |
| `ARO-001` | `aro` | `CANDIDATE` |
| `DATA-001` | `fao` | `REFERENCE_PINNED` |

Candidate package usage remains controlled and warning-gated. Pilot staff references do not create active worker identities yet.

## 6. Boundary controls preserved

AWIA-VS-S2 preserves these boundaries:

- package registry entry is not a worker
- package binding is not authority
- salary/staff plan is not authority
- source folder existence is not runtime eligibility
- candidate package is not stable package
- tooling package is not client-facing business staff
- architecture package is not runtime staff
- no public marketplace
- no live payment release
- no autonomous regulated approval
- no direct LLM to regulated final output

## 7. Verification evidence

| Command | Result |
| --- | --- |
| `node --check packages/core-domain/src/awia-virtual-staff-registry.mjs` | PASS |
| `node --check scripts/smoke-awia-vs-s2-package-registry.mjs` | PASS |
| `node scripts/smoke-awia-vs-s2-package-registry.mjs` | PASS |
| `git diff --check` | PASS |

Smoke result:

```json
{
  "smoke": "awia-vs-s2-package-registry",
  "result": "passed",
  "summary": {
    "entry_count": 17,
    "business_staff_package_count": 10,
    "runtime_candidate_count": 6,
    "catalogue_only_count": 4,
    "reference_only_count": 7
  },
  "pilot_staff_count": 8,
  "boundary": "metadata_and_validation_only_no_autonomous_staff_activation"
}
```

## 8. Known carry-over items

| Item | Target |
| --- | --- |
| Staff seat persistence | AWIA-VS-S3 |
| AWIA Worker Identity provisioning | AWIA-VS-S3 |
| Role assignment and package binding records | AWIA-VS-S3 |
| Lifecycle event validation | AWIA-VS-S3 |
| Authority-envelope runtime enforcement | AWIA-VS-S4 |
| AFCC staff management UI | AWIA-VS-S5 |

## 9. Next sprint gate

Recommended next authorization:

```text
AUTHORIZE_AWIA_VS_S3_STAFF_PROVISIONING_KERNEL
```

AWIA-VS-S3 should provision virtual staff seats into draft AWIA Worker Identities, role assignments, package bindings, lifecycle events, and denial fixtures. It must still avoid autonomous virtual staff execution until the authority and runtime gate exists.
