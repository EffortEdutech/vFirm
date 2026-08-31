---
title: "Stage 17 - Pilot Reporting, Export Pack, and Stakeholder Review Board Plan"
version: "1.0"
status: "implemented"
---

# Stage 17 - Pilot Reporting, Export Pack, and Stakeholder Review Board Plan v1.0

Stage 17 turns pilot evidence into a stakeholder-ready review package.

It introduces:

- pilot report packs;
- tenant-scoped pilot export manifests;
- stakeholder review board sessions;
- explicit board decisions for hold, continue, stop, or expansion.

## API surface

| Endpoint | Purpose |
|---|---|
| `GET /stakeholder-review/summary` | Read report pack, board, and decision status. |
| `GET /pilot-report-packs` | List generated pilot report packs. |
| `GET /stakeholder-review-boards` | List stakeholder review boards. |
| `GET /stakeholder-review-decisions` | List board decisions. |
| `POST /pilot/report-packs` | Generate pilot reporting/export pack. |
| `POST /stakeholder-review/boards` | Open stakeholder review board. |
| `POST /stakeholder-review/decisions` | Record explicit board decision. |

## Exit criteria

Stage 17 can close when report pack generation, review board opening, explicit decision recording, board summary, JSON fallback, PostgreSQL migration, and full smoke validation pass.
