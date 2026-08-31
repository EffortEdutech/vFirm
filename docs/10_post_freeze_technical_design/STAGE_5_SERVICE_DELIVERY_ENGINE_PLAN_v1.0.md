# Stage 5 — Service Delivery Engine Plan

Version: v1.0  
Status: Active implementation baseline  
Date: 2026-08-26

## 1. Purpose

Stage 5 turns delivery from a demo project screen into a controlled service delivery engine.

The delivery engine must make the following explicit:

```text
Project opened
  -> Work package exists
  -> Task starts
  -> Task completes
  -> Evidence bundle is complete
  -> Deliverable draft/version is created
  -> Professional review approves version
  -> Deliverable is issued
```

## 2. Scope

Stage 5 focuses on the Formwork MVP service pack, but the pattern must remain service-pack reusable.

| Capability | MVP decision |
|---|---|
| Task lifecycle | Start and complete the active project task. |
| Evidence completeness | Evidence must satisfy the work package required evidence list. |
| Document lifecycle | Create `documents` and `document_versions` records for deliverable drafts. |
| Review gate | Professional review requires a valid Stage 4 authority. |
| Issue gate | Deliverable issue requires evidence and approved review. |
| Audit | Task, review, document version, and issue actions emit events/audit records. |
| UI | Project screen becomes the operational delivery console. |

## 3. New/Activated API Commands

| Method | Path | Purpose |
|---|---|---|
| POST | `/tasks/start` | Mark the current task as `IN_PROGRESS`. |
| POST | `/tasks/complete` | Mark the task as `COMPLETE` and record output reference. |
| POST | `/deliverables/draft` | Create deliverable document and document version. |
| POST | `/deliverables/review` | Approve deliverable version after complete evidence check. |
| POST | `/deliverables/issue` | Issue approved deliverable version. |

## 4. Evidence Rule

The required evidence list comes from the project work package, not from a loose UI checklist.

For the current Formwork service pack, this includes validator/evidence controls such as:

- formwork intake completeness;
- document revision consistency;
- unit consistency;
- geometry positive value check;
- risk classification completeness;
- approval presence before issue;
- manufacturer source provenance presence;
- calculation input schema validity.

## 5. Exit Criteria

Stage 5 can be considered complete when:

1. delivery has task state beyond `CREATED`;
2. deliverable drafts create document/version records;
3. review cannot approve incomplete evidence;
4. issue cannot bypass professional approval;
5. issued output updates document/version/project state;
6. smoke tests prove the controlled path.
