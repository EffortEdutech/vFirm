---
title: "Stage 15 - Pilot Observability and Incident Response Runbook"
version: "1.0"
status: "implemented"
---

# Stage 15 - Pilot Observability and Incident Response Runbook v1.0

## Normal operator rhythm

1. Open the Ops tab.
2. Review Pilot Control Tower status.
3. Check active incidents, critical incidents, open support cases, events, and open tasks.
4. Open an incident when a pilot event may affect access, workflow continuity, auditability, data protection, professional approval, or client-facing delivery.
5. Record mitigation before closing the incident.
6. Record root-cause summary when known.
7. Review audit/event records after incident closure.

## Severity guidance

| Severity | Meaning |
|---|---|
| `SEV1` | Pilot access, data, professional authority, or regulated workflow may be unsafe. Immediate operator attention. |
| `SEV2` | Pilot workflow materially degraded or support queue contains critical signal. Prompt review. |
| `SEV3` | Operational issue requiring tracking, but pilot can continue. |

## Closure rule

Do not close an incident silently. Closure requires mitigation or root-cause notes where possible, and the event/audit trail must preserve the update.
