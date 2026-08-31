# Stage 7 — AI Workforce Runtime Plan

Version: v1.0  
Status: Active implementation baseline  
Date: 2026-08-26

## 1. Purpose

Stage 7 introduces governed AI worker participation without weakening human professional authority.

The principle is simple:

```text
AI may assist, draft, extract, check, and produce reviewable output.
AI must not silently approve, issue, or make controlled professional commitments.
```

## 2. MVP Scope

| Area | Stage 7 decision |
|---|---|
| Worker templates | Add reusable worker definitions with allowed tools, budgets, and risk envelope. |
| Worker instances | Provision firm-scoped AI worker instances and AI actor identities. |
| Task assignment | Assign active delivery tasks to active workers. |
| Tool control | Tool invocation must be in the worker allowlist. |
| Output capture | Worker output is stored as `task_outputs` and marked as requiring human review. |
| Policy boundary | AI actors cannot approve or issue controlled client-facing outputs. |
| Audit | Worker provisioning, assignment, tool invocation, and output production are auditable. |

## 3. Stage 7 Commands

| Method | Path | Purpose |
|---|---|---|
| POST | `/worker-instances` | Provision AI worker. |
| POST | `/worker-instances/activate` | Activate worker. |
| POST | `/runtime/tasks/assign-ai` | Assign task to worker. |
| POST | `/runtime/tool-invocations` | Request allowed tool invocation. |
| POST | `/runtime/tasks/output` | Capture reviewable AI output. |

## 4. Exit Criteria

1. AI worker identities are explicit actors.
2. Workers are tenant and firm scoped.
3. Tasks can be assigned to AI workers.
4. Tool use is allowlist bounded.
5. Output is attributable and requires human review.
6. AI cannot approve or issue controlled deliverables.
