---
id: VF-IMPLEMENTATION-CHECKLIST
title: "vFirm Implementation Checklist"
version: "1.0"
status: "Historical MVP Implementation Control"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# vFirm Implementation Checklist v1.0

## 1. Local Development

- [x] Use `309#` localhost port family.
- [x] Web defaults to `3090`.
- [x] API defaults to `3091`.
- [x] Docker PostgreSQL configured on `5439`.
- [x] Migration runner connected to local Docker PostgreSQL.
- [x] `npm run check` validates baseline, artifacts, migration, policy, API, web, and web/API integration.

## 2. Database

- [x] Foundation tables converted.
- [x] Front-door workflow tables converted.
- [x] Commercial workflow tables converted.
- [x] Delivery workflow tables converted.
- [x] Event/audit/policy ledger converted.
- [x] Service catalogue table added.
- [x] Migration version/history table added.
- [x] Database seed script added.
- [ ] Database reset script made explicit and safe.
- [x] Database smoke test added.

## 3. API

- [x] MVP command endpoints exist.
- [x] Command endpoints write to PostgreSQL in relational mode.
- [x] JSON fallback remains available.
- [x] Entity list endpoints added.
- [x] Entity detail endpoints added.
- [x] Summary/dashboard endpoint added.
- [x] Validation schema layer added.
- [x] Consistent error response catalogue added.
- [x] Idempotency key handling added.

## 4. Web

- [x] Web shell exists.
- [x] Workflow UI exists.
- [x] Web proxies API through `/api`.
- [x] Proxy handles API startup errors safely.
- [x] Dashboard reads relational summary endpoint.
- [x] Clients tab reads list/detail endpoint.
- [x] Intake tab reads list/detail endpoint.
- [x] Proposals tab reads list/detail endpoint.
- [x] Projects tab reads list/detail endpoint.
- [x] Invoices tab reads list/detail endpoint.
- [x] Audit tab reads event/audit endpoints.
- [ ] UI form validation improved.

## 5. Policy and Governance

- [x] Policy test fixtures exist.
- [x] Approval policy decision is persisted.
- [x] Policy decision table is relational.
- [ ] Policy middleware introduced for protected endpoints.
- [ ] Role/authority model connected to API.
- [ ] Professional authority validity checked from database.
- [ ] Deny cases visible in UI.

## 6. Events and Audit

- [x] Event log persists relationally.
- [x] Audit events persist relationally.
- [x] Full demo loop produces expected event types.
- [ ] Event payload schemas enforced at runtime.
- [x] Audit/event list endpoints added.
- [ ] Audit viewer improved in UI.
- [ ] Correlation/causation strategy hardened.

## 7. Service Pack

- [x] Formwork service pack spec exists.
- [x] Formwork workflow can run through MVP loop.
- [x] Service catalogue implemented.
- [x] `VF-SP-001` seeded as real record.
- [x] Service pack ID linked relationally.
- [ ] Formwork deliverable/evidence templates added.

## 8. Testing

- [x] Baseline validation.
- [x] Artifact validation.
- [x] Migration validation.
- [x] Policy tests.
- [x] API smoke.
- [x] Web smoke.
- [x] Web/API integration smoke.
- [x] PostgreSQL-mode workflow smoke script.
- [x] Relational read endpoint tests.
- [ ] UI interaction tests.
- [x] Migration apply/reset tests.

## 9. Production Readiness Later

- [ ] Auth provider selected.
- [ ] Deployment target selected.
- [ ] Secrets strategy documented.
- [ ] Backup/restore procedure documented.
- [ ] Observability added.
- [ ] Security review completed.


