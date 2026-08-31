---
id: VF-STAGE-2-IMPLEMENTATION-STRATEGY
title: "Stage 2 Implementation Strategy"
version: "1.0"
status: "Active Implementation Control"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Stage 2 Implementation Strategy v1.0

## 1. Purpose

Stage 2 turns the Stage 1 local MVP workflow into a proper persistent MVP service foundation.

The goal is not to build every Virtual Firm capability yet. The goal is to make the first complete business loop real, testable, persistent, and safe enough for continued product development.

```text
Tenant
→ Firm
→ Client
→ Intake
→ Proposal
→ Approval
→ Engagement
→ Project
→ Evidence Bundle
→ Invoice
→ Event / Audit / Policy Ledger
```

## 2. Stage 2 Product Boundary

Stage 2 includes:

- local Docker PostgreSQL
- relational persistence for the full MVP workflow
- JSON fallback for local/dev compatibility only
- API command endpoints for the MVP loop
- web shell and workflow UI connected to the API
- event, audit, and policy decision capture
- testable Formwork Engineering service-pack flow

Stage 2 does not include:

- production authentication
- payment provider integration
- multi-tenant production hardening
- document storage backend
- AI worker orchestration
- marketplace/network economy features
- deployment automation beyond local readiness

## 3. Current Stage 2 Status

As of this document:

- Architecture Baseline v1.0 is frozen.
- Stage 1 MVP operating loop is complete.
- Local Docker PostgreSQL is configured.
- The MVP workflow is PostgreSQL-backed end to end.
- `app_state` remains as a compatibility table, not the primary data model.
- JSON store remains available as a fallback when explicitly selected.

## 4. Implementation Principles

1. Build vertically, not abstractly.
2. Keep one complete workflow working at all times.
3. Preserve JSON fallback until relational mode is stable.
4. Prefer command endpoints before complex UI behavior.
5. Every regulated or material action must create an event/audit trail.
6. Policy decisions must be explicit, persisted, and explainable.
7. Do not silently bypass professional approval boundaries.

## 5. Stage 2 Technical Direction

The Stage 2 runtime path is:

```text
Web UI
  ↓
API command/read endpoints
  ↓
Policy checks where required
  ↓
PostgreSQL relational tables
  ↓
Event / audit / policy ledger
```

The Stage 2 development path is:

```text
Schema
→ Store layer
→ Command endpoints
→ Read/list/detail endpoints
→ Web screens
→ Tests
→ Stabilization
```

## 6. Stage 2 Completion Definition

Stage 2 is complete when:

- the full MVP loop can run on PostgreSQL without `app_state` as primary persistence;
- all major entities have list/detail API endpoints;
- the web workspace reads from relational API endpoints;
- policy/audit/event data is queryable from API endpoints;
- service catalogue placeholders are replaced by explicit records;
- `npm run check` remains green;
- a developer can start the stack locally using documented commands.

