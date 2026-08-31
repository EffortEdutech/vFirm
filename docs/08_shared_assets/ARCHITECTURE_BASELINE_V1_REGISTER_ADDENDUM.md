# Architecture Baseline v1.0 - Register Resolution

## Status

Resolved for Architecture Baseline v1.0.

## What happened

During the original zip recovery, the root `DOCUMENT_REGISTER.md`, `NEXT_STEPS.md`, `CHANGELOG.md`, and `MANIFEST.json` came from the old exported scaffold. Those files could not be safely edited in place at first because the extracted files triggered a Windows sandbox ACL read/update failure.

Later, the project was reorganized into the current development folder structure. The old root register files were moved to:

```text
archive/original_scaffold/project_control_legacy/
```

They are retained only for traceability and are not active development documents.

## Active replacement

The active documentation register is now:

```text
docs/08_shared_assets/ARCHITECTURE_BASELINE_V1_DOCUMENTATION_INDEX.md
```

The active freeze checklist is:

```text
docs/08_shared_assets/ARCHITECTURE_BASELINE_V1_FREEZE_CHECKLIST.md
```

The active source/completeness record is:

```text
docs/08_shared_assets/ARCHITECTURE_BASELINE_V1_SOURCE_COMPLETENESS_AUDIT.md
```

## Decision

Do not restore the old root register. It is superseded by the active documentation index.

## Conformance note

Any future documentation change should update the active documentation index and validation script, not the archived scaffold register.

