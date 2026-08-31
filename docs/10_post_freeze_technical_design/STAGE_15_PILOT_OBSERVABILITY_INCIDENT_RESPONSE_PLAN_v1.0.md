---
title: "Stage 15 - Pilot Observability, Incident Response, and Operator Metrics Plan"
version: "1.0"
status: "implemented"
---

# Stage 15 - Pilot Observability, Incident Response, and Operator Metrics Plan v1.0

Stage 15 adds the first pilot operations control tower for vFirm.

It introduces:

- tenant-scoped pilot incidents;
- operator metrics summary;
- active incident and support queue visibility;
- incident open/update/resolve commands;
- pilot warnings derived from events, incidents, support cases, tasks, and invoices.

## API surface

| Endpoint | Purpose |
|---|---|
| `GET /ops/operator-metrics` | Read scoped pilot operational health and queues. |
| `GET /pilot-incidents` | List pilot incidents. |
| `POST /ops/incidents` | Open pilot incident. |
| `POST /ops/incidents/update` | Update or resolve pilot incident. |

## Persistence

Stage 15 adds `pilot_incidents` with tenant, optional firm, optional support case, optional project, severity, status, impact, mitigation, root-cause, and resolution timestamps.

## Exit criteria

Stage 15 can close when incident open/update, operator metrics, incident list, JSON fallback, PostgreSQL schema migration, and full project smoke validation all pass.
