---
title: "Stage 19 - Usage Limits and Billing Readiness Runbook"
version: "1.0"
status: "implemented"
---

# Stage 19 - Usage Limits and Billing Readiness Runbook v1.0

## Operator rhythm

1. Create tenant pilot controls.
2. Confirm limits for users, projects, AI tool calls, and storage.
3. Record usage events during pilot operation.
4. Review limit warnings.
5. Record billing readiness review.
6. Do not enable live billing until commercial policy, invoices, taxes, and payment provider controls are approved.

## Readiness statuses

| Status | Meaning |
|---|---|
| `NOT_READY` | Billing design or controls are incomplete. |
| `CONDITIONAL` | Billing may be prepared with conditions. |
| `READY` | Billing model is ready for next implementation stage, but payment capture is still not active. |
