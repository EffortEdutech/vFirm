# HM-S6 Handler Data Contract Inventory

**Scope:** `apps/api/src/server.mjs` (~3,284 lines) and `apps/api/src/store.mjs` (~5,276 lines), as of the uploaded snapshot.

**Purpose:** a precise, per-handler map of which `store.<collection>` arrays each route actually reads and writes today (via the whole-store `readStore()`/`withStore()` pattern), so the upcoming per-domain repository layer can be built to query only what each handler needs.

## Methodology

- Every route registration was enumerated directly from `server.mjs`: the `routes` Map (143 `POST` entries), 2 inline `POST` routes (`/mvp/reset`, `/policy/evaluate`), 49 explicit `GET` routes, and one generic catch-all `GET` resource reader (`readResource()` at line 480) that serves `GET /<slug>` and `GET /<slug>/<id>` for every entry in the `readCollections` Map (119 collections -> 238 effective read routes).
- There are **no `PUT`, `PATCH`, or `DELETE`** routes anywhere in this API -- every mutation is a `POST`, including status transitions, approvals, and revocations (e.g. `POST /marketplace/directory-publications/revoke`).
- For each named handler, its function body in `server.mjs` was traced; where it delegates to a `store.mjs` export (e.g. `hireAwiaFirmWorkerRecord`, `updateAwiaVirtualStaffLifecycleRecord`), that function's body was read in turn (and, for a handful of dashboard/summary aggregators, one more hop into a local, non-exported builder such as `buildDailyOperationsSummary` or `buildQuotationOperationsSummary`) to find every `store.<collection>` it touches.
- A collection counts as **written** if the handler/helper `.push()`es or `.splice()`s it, reassigns it, upserts into it (`upsertById`), or looks up a record by id (`store.X.find(...)`, `assertScopedReference(store, "X", ...)`, `requireRecord(...)`) and then mutates a field on that record (directly or via `Object.assign`) before the transaction ends.
- **Nearly every mutating handler also writes `event_log` and `audit_events`** via the shared `appendEventAndAudit(store, {...})` helper (`store.mjs:4546`). Rather than repeat this on every row, it is folded into each handler's `Writes` column, and called out once here: **if you see `event_log`/`audit_events` in a Writes column, that is this universal side effect, not a domain-specific write.**
- Scoping was read from each handler's own validation (`requireFields([..."tenant_id"...])`, `assertScopedReference(store, collection, id, body)` which matches `tenant_id`+`firm_id` on the found record, `assertActorScope(actor, ...)` on reads). The overwhelming majority of handlers already require and filter by `tenant_id`(+`firm_id`) -- they just do it **after** loading the entire store into memory, which is exactly the inefficiency this migration is meant to fix.

## Summary

- **49 explicit `GET` routes**, **143 `POST` routes registered in the `routes` Map**, **2 inline `POST` routes** handled ahead of the map (`/mvp/reset`, `/policy/evaluate`) = **194 explicitly-coded routes**.
- **119 collections** are additionally served by the generic `readResource()` pass-through as `GET /<slug>` and `GET /<slug>/<id>` = **238 more effective read routes**.
- **Total effective routes: 194 + 238 = 432.**
- **119 distinct `store.<collection>` names** exist in the default/JSON store shape (`initialStore()`, `store.mjs:29`) and, separately verified, in `readRelationalStore()`/`readAwiaVirtualStaffRelational()`'s Postgres projection, and in the `readCollections` Map in `server.mjs`. **All three lists are identical -- there are no orphaned collections** (every collection the store can hold has at least a generic read route, and every collection a generic read route serves actually exists in the store).
- **3 routes are genuinely cross-tenant / whole-store by design** (not just "scoped inefficiently"): `GET /auth/me`, `GET /mvp/store`, `POST /mvp/reset`. Two more (`GET /data-protection/export-manifest`, `GET /data-protection/export-package`) iterate essentially all 91 tenant-scoped business collections but remain tenant_id/firm_id filtered throughout, so they are noted separately rather than flagged as cross-tenant.

## Directory & Firm Setup

| Method+Path | Handler | Reads | Writes | Scoping | Notes |
|---|---|---|---|---|---|
| `GET /auth/context` | `readAuthContext` | `firm_memberships`, `professional_authorities`, `professional_profiles` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `GET /auth/me` | `readAuthMe` | `firms`, `tenants` | — | **NO -- cross-tenant** (see note) | Boot-time identity resolution: looks up the caller's tenant/firm purely from the Supabase JWT subject, before any tenant_id is known -- must scan tenants/firms without a tenant filter. |
| `GET /auth/provider-context` | `readProviderAuthContext` | `pilot_users` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `GET /auth/provider/config` | `authProviderConfig` | — | — | N/A (no store access) | no store access, pure computation/static config |
| `GET /auth/staging-context` | `readStagingAuthContext` | `pilot_users` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `GET /service-packs/formwork` | `(inline; no store access)` | — | — | N/A (no store access) | no store access, pure computation/static config |
| `POST /auth/invite` | `inviteFirmMember` | `firms`, `pilot_users` | `actors`, `audit_events`, `event_log`, `firm_memberships`, `persons`, `pilot_users` | Yes -- tenant_id (+firm_id) required/filtered | writes to 6 collections in one request |
| `POST /auth/signup-firm` | `signupFirm` | `pilot_users`, `tenants` | `actors`, `audit_events`, `event_log`, `firm_memberships`, `firms`, `persons`, `pilot_users`, `professional_authorities`, `professional_profiles`, `tenants` | Yes -- tenant_id (+firm_id) required/filtered | writes to 10 collections in one request |
| `POST /firms` | `createFirm` | `tenants` | `actors`, `audit_events`, `event_log`, `firm_memberships`, `firms`, `persons`, `professional_authorities`, `professional_profiles` | Yes -- tenant_id (+firm_id) required/filtered | writes to 8 collections in one request |
| `POST /internal/purge-test-firm` | `purgeTestFirm` | `actors`, `audit_events`, `event_log`, `firm_memberships`, `firms`, `persons`, `pilot_users`, `professional_authorities`, `professional_profiles`, `tenants` | `actors`, `audit_events`, `event_log`, `firm_memberships`, `firms`, `persons`, `pilot_users`, `professional_authorities`, `professional_profiles`, `tenants` | Yes -- tenant_id (+firm_id) required/filtered | writes to 10 collections in one request |
| `POST /tenants` | `createTenant` | — | `audit_events`, `event_log`, `tenants` | Yes -- tenant_id (+firm_id) required/filtered |  |

**Generic read-only pass-through** (`GET /<slug>` and `GET /<slug>/<id>`, served by the shared `readResource()` handler at `server.mjs:480`; each reads exactly its one collection, writes nothing, and is scoped by `tenant_id`/`firm_id` query params via `applyReadFilters()`/`applyActorScope()` when an actor is present):

| Slug | Collection |
|---|---|
| `GET /actors` (+ `/:id`) | `actors` |
| `GET /firm-memberships` (+ `/:id`) | `firm_memberships` |
| `GET /firms` (+ `/:id`) | `firms` |
| `GET /persons` (+ `/:id`) | `persons` |
| `GET /professional-authorities` (+ `/:id`) | `professional_authorities` |
| `GET /professional-profiles` (+ `/:id`) | `professional_profiles` |
| `GET /service-packs` (+ `/:id`) | `service_packs` |
| `GET /service-skus` (+ `/:id`) | `service_skus` |
| `GET /tenants` (+ `/:id`) | `tenants` |

## My Team & HR (AI Workforce)

| Method+Path | Handler | Reads | Writes | Scoping | Notes |
|---|---|---|---|---|---|
| `GET /awia/virtual-staff/department-dashboard` | `readAwiaStaffDepartmentDashboard` | `awia_staff_output_drafts`, `awia_staff_output_reviews`, `awia_staff_task_readiness_records`, `awia_staff_workdesk_items`, `awia_virtual_staff_members` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `GET /awia/virtual-staff/payroll-summary` | `readAwiaStaffPayrollSummary` | `awia_virtual_staff_members`, `awia_virtual_staff_seats` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `GET /awia/virtual-staff/staging-readiness` | `readAwiaStagingReadiness` | — | — | N/A (no store access) | no store access, pure computation/static config |
| `GET /awia/virtual-staff/templates` | `readAwiaStaffTemplateCatalogueRecord` | — | — | N/A (no store access) | no store access, pure computation/static config |
| `GET /ops/awia-package-assignment` | `readAwiaFirmPackageAssignment` | `awia_firm_package_assignments` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /awia/virtual-staff/assign-task` | `assignAwiaVirtualStaffTask` | `awia_virtual_staff_members`, `tasks` | `audit_events`, `awia_staff_authority_decisions`, `awia_staff_task_readiness_records`, `awia_staff_workdesk_items`, `event_log`, `tasks` | Yes -- tenant_id (+firm_id) required/filtered | writes to 6 collections in one request |
| `POST /awia/virtual-staff/client-delivery-draft` | `prepareAwiaClientDeliveryDraft` | `awia_staff_output_drafts`, `awia_staff_output_reviews`, `awia_staff_workdesk_items` | `audit_events`, `awia_client_delivery_drafts`, `awia_staff_workdesk_items`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /awia/virtual-staff/client-delivery-draft/mark-sent` | `markAwiaClientDeliveryDraftSent` | `awia_client_delivery_drafts`, `awia_staff_workdesk_items` | `audit_events`, `awia_client_delivery_drafts`, `awia_staff_workdesk_items`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /awia/virtual-staff/conversation/message` | `postAwiaStaffConversationMessage` | `awia_staff_conversation_threads` | `audit_events`, `awia_staff_conversation_messages`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /awia/virtual-staff/conversation/open` | `openAwiaStaffConversationThread` | `awia_virtual_staff_members` | `audit_events`, `awia_staff_conversation_threads`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /awia/virtual-staff/hire-worker` | `hireAwiaFirmWorker` | `awia_firm_package_assignments`, `awia_staff_role_assignments`, `awia_virtual_staff_members`, `firms` | `audit_events`, `awia_staff_evidence_packs`, `awia_staff_lifecycle_events`, `awia_staff_package_bindings`, `awia_staff_role_assignments`, `awia_virtual_staff_members`, `awia_virtual_staff_provisioning_runs`, `awia_virtual_staff_seats`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered | writes to 9 collections in one request |
| `POST /awia/virtual-staff/lifecycle` | `updateAwiaVirtualStaffLifecycle` | `awia_staff_lifecycle_events`, `awia_virtual_staff_members` | `audit_events`, `awia_staff_lifecycle_events`, `awia_virtual_staff_members`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /awia/virtual-staff/memory/append` | `appendAwiaStaffMemoryEntry` | `awia_virtual_staff_members` | `audit_events`, `awia_staff_memory_entries`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /awia/virtual-staff/output-class-a-approval` | `decideAwiaStaffClassAApproval` | `awia_staff_output_drafts` | `audit_events`, `awia_staff_output_drafts`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /awia/virtual-staff/output-draft` | `produceAwiaStaffOutputDraft` | `awia_staff_workdesk_items`, `awia_virtual_staff_members`, `tasks` | `audit_events`, `awia_staff_output_drafts`, `awia_staff_workdesk_items`, `event_log`, `tasks` | Yes -- tenant_id (+firm_id) required/filtered | writes to 5 collections in one request |
| `POST /awia/virtual-staff/output-review` | `reviewAwiaStaffOutputDraft` | `awia_staff_output_drafts`, `awia_staff_workdesk_items` | `audit_events`, `awia_staff_output_drafts`, `awia_staff_output_reviews`, `awia_staff_workdesk_items`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered | writes to 5 collections in one request |
| `POST /awia/virtual-staff/provision-from-template` | `provisionAwiaVirtualStaffFromTemplate` | `awia_firm_package_assignments`, `awia_virtual_staff_provisioning_runs`, `firms` | `audit_events`, `awia_staff_evidence_packs`, `awia_staff_lifecycle_events`, `awia_staff_package_bindings`, `awia_staff_role_assignments`, `awia_virtual_staff_members`, `awia_virtual_staff_provisioning_runs`, `awia_virtual_staff_seats`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered | writes to 9 collections in one request |
| `POST /awia/virtual-staff/provision-pilot` | `provisionAwiaVirtualStaffPilot` | `firms` | `audit_events`, `awia_staff_evidence_packs`, `awia_staff_lifecycle_events`, `awia_staff_package_bindings`, `awia_staff_role_assignments`, `awia_virtual_staff_members`, `awia_virtual_staff_provisioning_runs`, `awia_virtual_staff_seats`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered | writes to 9 collections in one request |
| `POST /awia/virtual-staff/seat-billing-status` | `updateAwiaStaffSeatBillingStatus` | `awia_virtual_staff_seats` | `audit_events`, `awia_staff_seat_billing_events`, `awia_virtual_staff_seats`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /awia/virtual-staff/task-readiness` | `evaluateAwiaVirtualStaffTaskReadiness` | — | `audit_events`, `awia_staff_authority_decisions`, `awia_staff_task_readiness_records`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /awia/virtual-staff/workdesk-item/archive` | `archiveAwiaStaffWorkdeskItem` | `awia_staff_output_drafts`, `awia_staff_workdesk_items` | `audit_events`, `awia_staff_workdesk_items`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /ops/awia-package-assignment` | `assignAwiaFirmPackage` | `awia_firm_package_assignments`, `firms` | `audit_events`, `awia_firm_package_assignments`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /runtime/tasks/assign-ai` | `assignTaskToWorker` | `tasks`, `worker_instances` | `audit_events`, `event_log`, `tasks` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /runtime/tasks/output` | `produceTaskOutput` | `tasks`, `worker_instances` | `audit_events`, `event_log`, `policy_decisions`, `task_outputs`, `tasks` | Yes -- tenant_id (+firm_id) required/filtered | writes to 5 collections in one request |
| `POST /runtime/tool-invocations` | `requestToolInvocation` | `worker_instances` | `audit_events`, `event_log`, `policy_decisions`, `tool_invocations` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /worker-instances` | `provisionWorkerInstance` | `firms` | `actors`, `audit_events`, `event_log`, `worker_instances` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /worker-instances/activate` | `activateWorkerInstance` | `worker_instances` | `audit_events`, `event_log`, `worker_instances` | Yes -- tenant_id (+firm_id) required/filtered |  |

**Generic read-only pass-through** (`GET /<slug>` and `GET /<slug>/<id>`, served by the shared `readResource()` handler at `server.mjs:480`; each reads exactly its one collection, writes nothing, and is scoped by `tenant_id`/`firm_id` query params via `applyReadFilters()`/`applyActorScope()` when an actor is present):

| Slug | Collection |
|---|---|
| `GET /awia-client-delivery-drafts` (+ `/:id`) | `awia_client_delivery_drafts` |
| `GET /awia-firm-package-assignments` (+ `/:id`) | `awia_firm_package_assignments` |
| `GET /awia-staff-authority-decisions` (+ `/:id`) | `awia_staff_authority_decisions` |
| `GET /awia-staff-conversation-messages` (+ `/:id`) | `awia_staff_conversation_messages` |
| `GET /awia-staff-conversation-threads` (+ `/:id`) | `awia_staff_conversation_threads` |
| `GET /awia-staff-evidence-packs` (+ `/:id`) | `awia_staff_evidence_packs` |
| `GET /awia-staff-lifecycle-events` (+ `/:id`) | `awia_staff_lifecycle_events` |
| `GET /awia-staff-memory-entries` (+ `/:id`) | `awia_staff_memory_entries` |
| `GET /awia-staff-output-drafts` (+ `/:id`) | `awia_staff_output_drafts` |
| `GET /awia-staff-output-reviews` (+ `/:id`) | `awia_staff_output_reviews` |
| `GET /awia-staff-package-bindings` (+ `/:id`) | `awia_staff_package_bindings` |
| `GET /awia-staff-role-assignments` (+ `/:id`) | `awia_staff_role_assignments` |
| `GET /awia-staff-seat-billing-events` (+ `/:id`) | `awia_staff_seat_billing_events` |
| `GET /awia-staff-task-readiness-records` (+ `/:id`) | `awia_staff_task_readiness_records` |
| `GET /awia-staff-workdesk-items` (+ `/:id`) | `awia_staff_workdesk_items` |
| `GET /awia-virtual-staff-members` (+ `/:id`) | `awia_virtual_staff_members` |
| `GET /awia-virtual-staff-provisioning-runs` (+ `/:id`) | `awia_virtual_staff_provisioning_runs` |
| `GET /awia-virtual-staff-seats` (+ `/:id`) | `awia_virtual_staff_seats` |
| `GET /task-outputs` (+ `/:id`) | `task_outputs` |
| `GET /tool-invocations` (+ `/:id`) | `tool_invocations` |
| `GET /worker-instances` (+ `/:id`) | `worker_instances` |
| `GET /worker-templates` (+ `/:id`) | `worker_templates` |

## Sales & Intake

| Method+Path | Handler | Reads | Writes | Scoping | Notes |
|---|---|---|---|---|---|
| `GET /quotation-operations-summary` | `readQuotationOperationsSummary` | `audit_events`, `boq_extraction_aids`, `correspondence_records`, `event_log`, `quotation_cases`, `quotation_draft_packs`, `quotation_issue_records`, `quotation_receivable_preparations` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /boq-extraction-aids` | `createBoqExtractionAid` | `boq_extraction_aids`, `quotation_cases` | `audit_events`, `boq_extraction_aids`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /boq-extraction-aids/review` | `reviewBoqExtractionAid` | `boq_extraction_aids` | `audit_events`, `boq_extraction_aids`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /clients` | `createClient` | `firms` | `audit_events`, `clients`, `event_log`, `firm_client_relationships` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /commercial/skill-bindings` | `bindCommercialSkills` | `commercial_skill_bindings`, `firms` | `audit_events`, `commercial_skill_bindings`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /front-desk/communication-drafts` | `createClientCommunicationDraft` | `front_desk_enquiries` | `audit_events`, `client_communication_drafts`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /front-desk/enquiries` | `createFrontDeskEnquiry` | `firms` | `audit_events`, `event_log`, `front_desk_enquiries` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /front-desk/enquiries/handoff` | `handoffFrontDeskEnquiry` | `firm_client_relationships`, `firms`, `front_desk_enquiries` | `audit_events`, `clients`, `event_log`, `firm_client_relationships`, `front_desk_enquiries`, `intake_sessions`, `leads` | Yes -- tenant_id (+firm_id) required/filtered | writes to 7 collections in one request |
| `POST /front-desk/enquiries/qualify` | `qualifyFrontDeskEnquiry` | `front_desk_enquiries` | `audit_events`, `event_log`, `front_desk_enquiries` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /intake-sessions` | `createIntakeSession` | `firm_client_relationships` | `audit_events`, `event_log`, `intake_sessions`, `leads` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /proposals` | `createProposal` | `intake_sessions` | `audit_events`, `event_log`, `price_build_ups`, `proposals` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /proposals/accept` | `acceptProposal` | `proposals` | `audit_events`, `engagements`, `event_log`, `projects`, `proposals`, `tasks`, `work_packages` | Yes -- tenant_id (+firm_id) required/filtered | writes to 7 collections in one request |
| `POST /proposals/approve` | `approveProposal` | `firm_memberships`, `professional_authorities`, `professional_profiles`, `proposals` | `approvals`, `audit_events`, `event_log`, `policy_decisions`, `proposals` | Yes -- tenant_id (+firm_id) required/filtered | writes to 5 collections in one request |
| `POST /proposals/dispatch` | `dispatchProposal` | `proposal_dispatch_records`, `sales_pipeline_records` | `audit_events`, `event_log`, `proposal_dispatch_records`, `proposals` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /quotation-cases` | `createQuotationCase` | `quotation_cases` | `audit_events`, `event_log`, `quotation_cases` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /quotation-cases/approve` | `approveQuotationCase` | `proposals`, `quotation_cases` | `audit_events`, `event_log`, `quotation_cases` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /quotation-cases/issue` | `issueQuotationCase` | `quotation_cases` | `audit_events`, `event_log`, `quotation_cases` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /quotation-cases/link-proposal` | `linkQuotationCaseProposal` | `proposals`, `quotation_cases` | `audit_events`, `event_log`, `quotation_cases` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /quotation-draft-packs` | `createQuotationDraftPack` | `boq_extraction_aids`, `quotation_cases`, `quotation_draft_packs` | `audit_events`, `event_log`, `quotation_draft_packs` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /quotation-draft-packs/client-correspondence` | `prepareQuotationClientCorrespondence` | `quotation_cases`, `quotation_draft_packs` | `audit_events`, `correspondence_records`, `event_log`, `quotation_draft_packs` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /quotation-draft-packs/issue` | `issueQuotationDraftPack` | `correspondence_records`, `quotation_draft_packs`, `quotation_issue_records` | `audit_events`, `correspondence_records`, `event_log`, `quotation_cases`, `quotation_draft_packs`, `quotation_issue_records` | Yes -- tenant_id (+firm_id) required/filtered | writes to 6 collections in one request |
| `POST /quotation-draft-packs/review` | `reviewQuotationDraftPack` | `quotation_draft_packs` | `audit_events`, `event_log`, `quotation_draft_packs` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /quotation-receivable-preparations` | `prepareQuotationReceivable` | `quotation_issue_records`, `quotation_receivable_preparations` | `audit_events`, `event_log`, `quotation_receivable_preparations` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /sales/opportunities` | `createSalesOpportunity` | — | `audit_events`, `event_log`, `sales_pipeline_records` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /sales/opportunities/update` | `updateSalesOpportunity` | — | `audit_events`, `event_log`, `sales_pipeline_records` | Yes -- tenant_id (+firm_id) required/filtered |  |

**Generic read-only pass-through** (`GET /<slug>` and `GET /<slug>/<id>`, served by the shared `readResource()` handler at `server.mjs:480`; each reads exactly its one collection, writes nothing, and is scoped by `tenant_id`/`firm_id` query params via `applyReadFilters()`/`applyActorScope()` when an actor is present):

| Slug | Collection |
|---|---|
| `GET /boq-extraction-aids` (+ `/:id`) | `boq_extraction_aids` |
| `GET /client-communication-drafts` (+ `/:id`) | `client_communication_drafts` |
| `GET /clients` (+ `/:id`) | `clients` |
| `GET /commercial-skill-bindings` (+ `/:id`) | `commercial_skill_bindings` |
| `GET /firm-client-relationships` (+ `/:id`) | `firm_client_relationships` |
| `GET /front-desk-enquiries` (+ `/:id`) | `front_desk_enquiries` |
| `GET /intake-sessions` (+ `/:id`) | `intake_sessions` |
| `GET /leads` (+ `/:id`) | `leads` |
| `GET /price-build-ups` (+ `/:id`) | `price_build_ups` |
| `GET /proposal-dispatch-records` (+ `/:id`) | `proposal_dispatch_records` |
| `GET /proposals` (+ `/:id`) | `proposals` |
| `GET /quotation-cases` (+ `/:id`) | `quotation_cases` |
| `GET /quotation-draft-packs` (+ `/:id`) | `quotation_draft_packs` |
| `GET /quotation-issue-records` (+ `/:id`) | `quotation_issue_records` |
| `GET /quotation-receivable-preparations` (+ `/:id`) | `quotation_receivable_preparations` |
| `GET /sales-pipeline-records` (+ `/:id`) | `sales_pipeline_records` |

## Client Engagements & Projects (incl. Technical Delivery)

| Method+Path | Handler | Reads | Writes | Scoping | Notes |
|---|---|---|---|---|---|
| `POST /evidence-bundles` | `createEvidenceBundle` | `projects` | `audit_events`, `event_log`, `evidence_bundles` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /pilot/handoff` | `acceptPilotHandoff` | — | `audit_events`, `event_log`, `pilot_handoff_records` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /tasks/complete` | `completeTask` | `tasks` | `audit_events`, `event_log`, `tasks` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /tasks/start` | `startTask` | `tasks` | `audit_events`, `event_log`, `tasks` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /technical/calculation-input-sets` | `createCalculationInputSet` | `document_register_entries`, `document_revision_records`, `projects` | `audit_events`, `calculation_input_sets`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /technical/delivery-packages` | `createDeliveryPackage` | `calculation_input_sets`, `document_register_entries`, `document_revision_records`, `projects`, `technical_qa_findings` | `audit_events`, `delivery_package_records`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /technical/drawing-reviews` | `createDrawingReview` | `document_register_entries`, `document_revision_records`, `projects` | `audit_events`, `drawing_review_records`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /technical/qa-findings` | `createTechnicalQaFinding` | — | `audit_events`, `event_log`, `technical_qa_findings` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /technical/qa-findings/resolve` | `resolveTechnicalQaFinding` | — | `audit_events`, `event_log`, `technical_qa_findings` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /technical/skill-bindings` | `bindTechnicalSkills` | `firms`, `technical_skill_bindings` | `audit_events`, `event_log`, `technical_skill_bindings` | Yes -- tenant_id (+firm_id) required/filtered |  |

**Generic read-only pass-through** (`GET /<slug>` and `GET /<slug>/<id>`, served by the shared `readResource()` handler at `server.mjs:480`; each reads exactly its one collection, writes nothing, and is scoped by `tenant_id`/`firm_id` query params via `applyReadFilters()`/`applyActorScope()` when an actor is present):

| Slug | Collection |
|---|---|
| `GET /calculation-input-sets` (+ `/:id`) | `calculation_input_sets` |
| `GET /delivery-package-records` (+ `/:id`) | `delivery_package_records` |
| `GET /drawing-review-records` (+ `/:id`) | `drawing_review_records` |
| `GET /engagements` (+ `/:id`) | `engagements` |
| `GET /pilot-handoff-records` (+ `/:id`) | `pilot_handoff_records` |
| `GET /projects` (+ `/:id`) | `projects` |
| `GET /tasks` (+ `/:id`) | `tasks` |
| `GET /technical-qa-findings` (+ `/:id`) | `technical_qa_findings` |
| `GET /technical-skill-bindings` (+ `/:id`) | `technical_skill_bindings` |
| `GET /work-packages` (+ `/:id`) | `work_packages` |

## Documents & Correspondence (Administration)

| Method+Path | Handler | Reads | Writes | Scoping | Notes |
|---|---|---|---|---|---|
| `POST /administration/correspondence` | `createCorrespondence` | — | `audit_events`, `correspondence_records`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /administration/deadlines` | `createAdministrationDeadline` | — | `administrative_deadlines`, `audit_events`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /administration/deadlines/complete` | `completeAdministrationDeadline` | — | `administrative_deadlines`, `audit_events`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /administration/document-revisions` | `addAdministrationRevision` | `document_revision_records` | `audit_events`, `document_register_entries`, `document_revision_records`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /administration/documents` | `registerAdministrationDocument` | `document_register_entries` | `audit_events`, `document_register_entries`, `document_revision_records`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /administration/skill-bindings` | `bindAdministrationSkills` | `administration_skill_bindings`, `firms` | `administration_skill_bindings`, `audit_events`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /administration/transmittal-drafts` | `createTransmittalDraft` | — | `audit_events`, `event_log`, `transmittal_drafts` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /deliverables/draft` | `createDeliverableDraft` | `projects` | `audit_events`, `document_versions`, `documents`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /deliverables/issue` | `issueDeliverable` | `approvals`, `document_versions`, `documents`, `projects` | `audit_events`, `document_versions`, `documents`, `event_log`, `policy_decisions`, `projects` | Yes -- tenant_id (+firm_id) required/filtered | writes to 6 collections in one request |
| `POST /deliverables/review` | `reviewDeliverable` | `document_versions`, `evidence_bundles`, `firm_memberships`, `professional_authorities`, `professional_profiles`, `work_packages` | `approvals`, `audit_events`, `document_versions`, `event_log`, `evidence_bundles`, `policy_decisions` | Yes -- tenant_id (+firm_id) required/filtered | writes to 6 collections in one request |

**Generic read-only pass-through** (`GET /<slug>` and `GET /<slug>/<id>`, served by the shared `readResource()` handler at `server.mjs:480`; each reads exactly its one collection, writes nothing, and is scoped by `tenant_id`/`firm_id` query params via `applyReadFilters()`/`applyActorScope()` when an actor is present):

| Slug | Collection |
|---|---|
| `GET /administration-skill-bindings` (+ `/:id`) | `administration_skill_bindings` |
| `GET /administrative-deadlines` (+ `/:id`) | `administrative_deadlines` |
| `GET /correspondence-records` (+ `/:id`) | `correspondence_records` |
| `GET /document-register-entries` (+ `/:id`) | `document_register_entries` |
| `GET /document-revision-records` (+ `/:id`) | `document_revision_records` |
| `GET /document-versions` (+ `/:id`) | `document_versions` |
| `GET /documents` (+ `/:id`) | `documents` |
| `GET /evidence-bundles` (+ `/:id`) | `evidence_bundles` |
| `GET /transmittal-drafts` (+ `/:id`) | `transmittal_drafts` |

## Finance & Commercial

| Method+Path | Handler | Reads | Writes | Scoping | Notes |
|---|---|---|---|---|---|
| `GET /accounts/cash-snapshot` | `readAccountsCashSnapshot` | `expense_records`, `invoices`, `payment_statuses`, `receivable_follow_ups`, `sales_pipeline_records` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `GET /commercial-launch/summary` | `readCommercialLaunchSummary` | `billing_readiness_reviews`, `commercial_launch_controls`, `payment_provider_configs`, `subscription_packages` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `GET /tenant-usage/summary` | `readTenantUsageBillingSummary` | `billing_readiness_reviews`, `tenant_pilot_controls`, `tenant_usage_events` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /accounts/expenses` | `createExpense` | — | `audit_events`, `event_log`, `expense_records` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /accounts/expenses/approve` | `approveExpense` | — | `audit_events`, `event_log`, `expense_records` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /accounts/receivable-follow-ups` | `createReceivableFollowUp` | `invoices` | `audit_events`, `event_log`, `receivable_follow_ups` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /billing/readiness-reviews` | `reviewBillingReadiness` | — | `audit_events`, `billing_readiness_reviews`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /commercial-launch/controls` | `createCommercialLaunchControl` | — | `audit_events`, `commercial_launch_controls`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /invoices` | `createInvoice` | — | `audit_events`, `event_log`, `invoices` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /invoices/issue` | `issueInvoice` | `invoices`, `projects` | `audit_events`, `event_log`, `invoices` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /payments/provider-configs` | `createPaymentProviderConfig` | — | `audit_events`, `event_log`, `payment_provider_configs` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /payments/record` | `recordPaymentStatus` | `invoices` | `audit_events`, `event_log`, `invoices`, `payment_statuses` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /subscriptions/packages` | `createSubscriptionPackage` | — | `audit_events`, `event_log`, `subscription_packages` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /tenant-usage/events` | `recordTenantUsage` | — | `audit_events`, `event_log`, `tenant_usage_events` | Yes -- tenant_id (+firm_id) required/filtered |  |

**Generic read-only pass-through** (`GET /<slug>` and `GET /<slug>/<id>`, served by the shared `readResource()` handler at `server.mjs:480`; each reads exactly its one collection, writes nothing, and is scoped by `tenant_id`/`firm_id` query params via `applyReadFilters()`/`applyActorScope()` when an actor is present):

| Slug | Collection |
|---|---|
| `GET /approvals` (+ `/:id`) | `approvals` |
| `GET /billing-readiness-reviews` (+ `/:id`) | `billing_readiness_reviews` |
| `GET /commercial-launch-controls` (+ `/:id`) | `commercial_launch_controls` |
| `GET /expense-records` (+ `/:id`) | `expense_records` |
| `GET /invoices` (+ `/:id`) | `invoices` |
| `GET /payment-provider-configs` (+ `/:id`) | `payment_provider_configs` |
| `GET /payment-statuses` (+ `/:id`) | `payment_statuses` |
| `GET /receivable-follow-ups` (+ `/:id`) | `receivable_follow_ups` |
| `GET /subscription-packages` (+ `/:id`) | `subscription_packages` |
| `GET /tenant-usage-events` (+ `/:id`) | `tenant_usage_events` |

## Network & Marketplace

| Method+Path | Handler | Reads | Writes | Scoping | Notes |
|---|---|---|---|---|---|
| `GET /marketplace/governance-lock` | `readMEGovernanceLock` | — | — | N/A (no store access) | no store access, pure computation/static config |
| `GET /marketplace/private-directory-governance-summary` | `readMEPrivateDirectoryGovernanceSummary` | `audit_events`, `collaboration_requests`, `directory_private_enquiries`, `directory_review_board_decisions`, `marketplace_listings`, `qualification_renewal_reviews` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `GET /marketplace/private-directory-intelligence-summary` | `readMEPrivateDirectoryIntelligenceSummary` | `audit_events`, `collaboration_requests`, `directory_private_enquiries`, `directory_review_board_decisions`, `marketplace_listings`, `observatory_snapshots`, `qualification_renewal_reviews` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `GET /marketplace/qualified-directory-summary` | `readMEQualifiedDirectorySummary` | `audit_events`, `marketplace_listings` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `GET /network/r5-assignment-delivery-summary` | `readR5AssignmentDeliverySummary` | `audit_events`, `responsibility_matrices`, `specialist_assignments` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `GET /network/r5-collaboration-workspace-summary` | `readR5CollaborationWorkspaceSummary` | `audit_events`, `collaboration_workspace_evidence`, `collaboration_workspace_participants`, `collaboration_workspaces`, `specialist_invitations` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `GET /network/r5-network-evidence-go-no-go` | `readR5NetworkEvidenceGoNoGo` | `audit_events`, `capacity_offers`, `collaboration_workspace_evidence`, `collaboration_workspace_participants`, `collaboration_workspaces`, `marketplace_listings`, `network_capabilities`, `network_conflict_checks`, `network_credentials`, `network_firm_profiles`, `network_professional_profiles`, `network_qualification_gates`, `network_trust_signals`, `observatory_snapshots`, `responsibility_matrices`, `specialist_assignments`, `specialist_invitations` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `GET /network/r5-profile-summary` | `readR5TrustedNetworkProfiles` | `audit_events`, `network_capabilities`, `network_credentials`, `network_firm_profiles`, `network_professional_profiles`, `network_trust_signals` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `GET /network/r5-qualification-summary` | `readR5QualificationGateSummary` | `audit_events`, `network_conflict_checks`, `network_qualification_gates`, `specialist_invitations` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `GET /network/r5-responsibility-matrix-summary` | `readR5ResponsibilityMatrixSummary` | `audit_events`, `collaboration_workspace_participants`, `collaboration_workspaces`, `responsibility_matrices` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /capacity/offers` | `createCapacityOffer` | — | `audit_events`, `capacity_offers`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /collaboration/requests` | `requestCollaboration` | `capacity_offers` | `audit_events`, `collaboration_requests`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /marketplace/directory-publications` | `publishQualifiedDirectoryListing` | — | `audit_events`, `event_log`, `marketplace_listings` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /marketplace/directory-publications/revoke` | `revokeQualifiedDirectoryListing` | `marketplace_listings` | `audit_events`, `event_log`, `marketplace_listings` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /marketplace/directory-publications/suspend` | `suspendQualifiedDirectoryListing` | `marketplace_listings` | `audit_events`, `event_log`, `marketplace_listings` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /marketplace/directory-review-board/decisions` | `recordDirectoryReviewBoardDecision` | `directory_review_board_decisions`, `marketplace_listings` | `audit_events`, `directory_review_board_decisions`, `event_log`, `marketplace_listings` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /marketplace/listings` | `publishMarketplaceListing` | — | `audit_events`, `event_log`, `marketplace_listings` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /marketplace/private-directory/enquiries` | `recordPrivateDirectoryEnquiry` | `directory_private_enquiries`, `marketplace_listings` | `audit_events`, `directory_private_enquiries`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /marketplace/private-directory/enquiries/request-collaboration` | `requestPrivateDirectoryCollaboration` | `directory_private_enquiries` | `audit_events`, `collaboration_requests`, `directory_private_enquiries`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /marketplace/qualification-renewal-reviews` | `recordQualificationRenewalReview` | `marketplace_listings`, `network_qualification_gates`, `qualification_renewal_reviews` | `audit_events`, `event_log`, `marketplace_listings`, `qualification_renewal_reviews` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /network/capabilities` | `createNetworkCapability` | — | `audit_events`, `event_log`, `network_capabilities` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /network/collaboration-workspaces` | `createCollaborationWorkspace` | `specialist_invitations` | `audit_events`, `collaboration_workspaces`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /network/collaboration-workspaces/evidence` | `addCollaborationWorkspaceEvidence` | `collaboration_workspace_participants`, `collaboration_workspaces` | `audit_events`, `collaboration_workspace_evidence`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /network/collaboration-workspaces/participants` | `grantCollaborationWorkspaceParticipant` | `collaboration_workspaces` | `audit_events`, `collaboration_workspace_participants`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /network/collaboration-workspaces/participants/revoke` | `revokeCollaborationWorkspaceParticipant` | `collaboration_workspace_participants`, `collaboration_workspaces` | `audit_events`, `collaboration_workspace_participants`, `event_log` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /network/conflict-checks` | `createNetworkConflictCheck` | — | `audit_events`, `event_log`, `network_conflict_checks` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /network/credentials` | `createNetworkCredential` | — | `audit_events`, `event_log`, `network_credentials` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /network/firm-profiles` | `createNetworkFirmProfile` | — | `audit_events`, `event_log`, `network_firm_profiles` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /network/professional-profiles` | `createNetworkProfessionalProfile` | — | `audit_events`, `event_log`, `network_professional_profiles` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /network/qualification-gates` | `createNetworkQualificationGate` | — | `audit_events`, `event_log`, `network_qualification_gates` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /network/responsibility-matrices` | `createResponsibilityMatrix` | `collaboration_workspace_participants`, `collaboration_workspaces` | `audit_events`, `event_log`, `responsibility_matrices` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /network/specialist-assignments` | `createSpecialistAssignment` | — | `audit_events`, `event_log`, `specialist_assignments` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /network/specialist-assignments/accept` | `transitionSpecialistAssignment(action="accept")` | `responsibility_matrices`, `specialist_assignments` | `audit_events`, `event_log`, `responsibility_matrices`, `specialist_assignments` | Yes -- tenant_id (+firm_id) required/filtered | shares one handler body across 6 lifecycle-transition routes (accept/start/deliver/review/approve/close) |
| `POST /network/specialist-assignments/approve` | `transitionSpecialistAssignment(action="approve")` | `responsibility_matrices`, `specialist_assignments` | `audit_events`, `event_log`, `responsibility_matrices`, `specialist_assignments` | Yes -- tenant_id (+firm_id) required/filtered | shares one handler body across 6 lifecycle-transition routes (accept/start/deliver/review/approve/close) |
| `POST /network/specialist-assignments/close` | `transitionSpecialistAssignment(action="close")` | `responsibility_matrices`, `specialist_assignments` | `audit_events`, `event_log`, `responsibility_matrices`, `specialist_assignments` | Yes -- tenant_id (+firm_id) required/filtered | shares one handler body across 6 lifecycle-transition routes (accept/start/deliver/review/approve/close) |
| `POST /network/specialist-assignments/deliver` | `transitionSpecialistAssignment(action="deliver")` | `responsibility_matrices`, `specialist_assignments` | `audit_events`, `event_log`, `responsibility_matrices`, `specialist_assignments` | Yes -- tenant_id (+firm_id) required/filtered | shares one handler body across 6 lifecycle-transition routes (accept/start/deliver/review/approve/close) |
| `POST /network/specialist-assignments/review` | `transitionSpecialistAssignment(action="review")` | `responsibility_matrices`, `specialist_assignments` | `audit_events`, `event_log`, `responsibility_matrices`, `specialist_assignments` | Yes -- tenant_id (+firm_id) required/filtered | shares one handler body across 6 lifecycle-transition routes (accept/start/deliver/review/approve/close) |
| `POST /network/specialist-assignments/start` | `transitionSpecialistAssignment(action="start")` | `responsibility_matrices`, `specialist_assignments` | `audit_events`, `event_log`, `responsibility_matrices`, `specialist_assignments` | Yes -- tenant_id (+firm_id) required/filtered | shares one handler body across 6 lifecycle-transition routes (accept/start/deliver/review/approve/close) |
| `POST /network/specialist-invitations` | `createSpecialistInvitation` | `network_qualification_gates` | `audit_events`, `event_log`, `specialist_invitations` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /network/trust-signals` | `createNetworkTrustSignal` | — | `audit_events`, `event_log`, `network_trust_signals` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /observatory/snapshots` | `createObservatorySnapshot` | `capacity_offers`, `collaboration_requests`, `firms`, `invoices`, `marketplace_listings`, `projects`, `service_packs`, `task_outputs` | `audit_events`, `event_log`, `observatory_snapshots` | Yes -- tenant_id (+firm_id) required/filtered |  |

**Generic read-only pass-through** (`GET /<slug>` and `GET /<slug>/<id>`, served by the shared `readResource()` handler at `server.mjs:480`; each reads exactly its one collection, writes nothing, and is scoped by `tenant_id`/`firm_id` query params via `applyReadFilters()`/`applyActorScope()` when an actor is present):

| Slug | Collection |
|---|---|
| `GET /capacity-offers` (+ `/:id`) | `capacity_offers` |
| `GET /collaboration-requests` (+ `/:id`) | `collaboration_requests` |
| `GET /collaboration-workspace-evidence` (+ `/:id`) | `collaboration_workspace_evidence` |
| `GET /collaboration-workspace-participants` (+ `/:id`) | `collaboration_workspace_participants` |
| `GET /collaboration-workspaces` (+ `/:id`) | `collaboration_workspaces` |
| `GET /directory-private-enquiries` (+ `/:id`) | `directory_private_enquiries` |
| `GET /directory-review-board-decisions` (+ `/:id`) | `directory_review_board_decisions` |
| `GET /marketplace-listings` (+ `/:id`) | `marketplace_listings` |
| `GET /network-capabilities` (+ `/:id`) | `network_capabilities` |
| `GET /network-conflict-checks` (+ `/:id`) | `network_conflict_checks` |
| `GET /network-credentials` (+ `/:id`) | `network_credentials` |
| `GET /network-firm-profiles` (+ `/:id`) | `network_firm_profiles` |
| `GET /network-professional-profiles` (+ `/:id`) | `network_professional_profiles` |
| `GET /network-qualification-gates` (+ `/:id`) | `network_qualification_gates` |
| `GET /network-trust-signals` (+ `/:id`) | `network_trust_signals` |
| `GET /observatory-snapshots` (+ `/:id`) | `observatory_snapshots` |
| `GET /qualification-renewal-reviews` (+ `/:id`) | `qualification_renewal_reviews` |
| `GET /responsibility-matrices` (+ `/:id`) | `responsibility_matrices` |
| `GET /specialist-assignments` (+ `/:id`) | `specialist_assignments` |
| `GET /specialist-invitations` (+ `/:id`) | `specialist_invitations` |

## Pilot & Observatory

| Method+Path | Handler | Reads | Writes | Scoping | Notes |
|---|---|---|---|---|---|
| `GET /pilot/expansion-summary` | `readPilotExpansionSummary` | `pilot_expansion_cohorts`, `release_candidate_gates`, `stakeholder_review_decisions`, `tenant_onboarding_plans` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `GET /pilot/learning-loop` | `readPilotLearningLoop` | `pilot_acceptance_reviews`, `pilot_feedback`, `pilot_improvement_items` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `GET /pilot/r4-evidence-go-no-go` | `readR4EvidenceGoNoGo` | `audit_events`, `event_log`, `factory_worker_bindings`, `pilot_acceptance_reviews`, `pilot_expansion_cohorts`, `pilot_feedback`, `pilot_improvement_items`, `pilot_incidents`, `pilot_report_packs`, `pilot_users`, `policy_decisions`, `release_candidate_gates`, `stakeholder_review_boards`, `stakeholder_review_decisions`, `support_cases`, `tenant_onboarding_plans`, `worker_instances` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `GET /pilot/r4-private-cohort-gate` | `readR4PrivatePilotCohortGate` | `audit_events`, `event_log`, `factory_worker_bindings`, `pilot_expansion_cohorts`, `pilot_incidents`, `pilot_users`, `policy_decisions`, `release_candidate_gates`, `support_cases`, `tenant_onboarding_plans`, `worker_instances` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `GET /stakeholder-review/summary` | `readPilotReviewBoardSummary` | `pilot_improvement_items`, `pilot_incidents`, `pilot_report_packs`, `stakeholder_review_boards`, `stakeholder_review_decisions` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `GET /support/r4-incident-policy` | `readR4SupportIncidentPolicy` | — | — | N/A (no store access) | no store access, pure computation/static config |
| `GET /support/summary` | `readSupportDeskSummary` | `pilot_users`, `support_cases` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /ops/incidents` | `createPilotIncident` | — | `audit_events`, `event_log`, `pilot_incidents` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /ops/incidents/update` | `updatePilotIncident` | `pilot_incidents` | `audit_events`, `event_log`, `pilot_incidents` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /pilot/acceptance-reviews` | `reviewPilotAcceptance` | — | `audit_events`, `event_log`, `pilot_acceptance_reviews` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /pilot/expansion-cohorts` | `createPilotExpansionCohort` | — | `audit_events`, `event_log`, `pilot_expansion_cohorts` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /pilot/expansion-cohorts/update` | `updatePilotExpansionCohort` | `pilot_expansion_cohorts` | `audit_events`, `event_log`, `pilot_expansion_cohorts` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /pilot/feedback` | `submitPilotFeedback` | — | `audit_events`, `event_log`, `pilot_feedback` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /pilot/improvement-items` | `createPilotImprovement` | — | `audit_events`, `event_log`, `pilot_improvement_items` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /pilot/improvement-items/update` | `updatePilotImprovement` | `pilot_improvement_items` | `audit_events`, `event_log`, `pilot_improvement_items` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /pilot/private-cohort/activate` | `activatePrivatePilotCohort` | `audit_events`, `event_log`, `factory_worker_bindings`, `pilot_expansion_cohorts`, `pilot_incidents`, `pilot_users`, `policy_decisions`, `release_candidate_gates`, `support_cases`, `tenant_onboarding_plans`, `worker_instances` | `audit_events`, `event_log`, `pilot_expansion_cohorts` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /pilot/report-packs` | `generatePilotReportPack` | — | `audit_events`, `event_log`, `pilot_report_packs` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /pilot/users/activate` | `activatePilotUser` | `pilot_users` | `audit_events`, `event_log`, `pilot_users` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /pilot/users/invite` | `invitePilotUser` | `pilot_users` | `audit_events`, `event_log`, `pilot_users` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /pilot/users/revoke` | `revokePilotUser` | `pilot_users` | `audit_events`, `event_log`, `pilot_users` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /pilot/users/suspend` | `suspendPilotUser` | `pilot_users` | `audit_events`, `event_log`, `pilot_users` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /release-candidate/gates` | `createReleaseCandidateGate` | — | `audit_events`, `event_log`, `release_candidate_gates` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /stakeholder-review/boards` | `openStakeholderReviewBoard` | — | `audit_events`, `event_log`, `stakeholder_review_boards` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /stakeholder-review/decisions` | `recordStakeholderReviewDecision` | `stakeholder_review_boards` | `audit_events`, `event_log`, `stakeholder_review_boards`, `stakeholder_review_decisions` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /support/cases` | `createSupportCase` | — | `audit_events`, `event_log`, `support_cases` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /support/cases/update` | `updateSupportCase` | `support_cases` | `audit_events`, `event_log`, `support_cases` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /tenant-onboarding/plans` | `createTenantOnboardingPlan` | — | `audit_events`, `event_log`, `tenant_onboarding_plans` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /tenant-onboarding/plans/update` | `updateTenantOnboardingPlan` | `tenant_onboarding_plans` | `audit_events`, `event_log`, `tenant_onboarding_plans` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /tenant-pilot/controls` | `createTenantPilotControl` | — | `audit_events`, `event_log`, `tenant_pilot_controls` | Yes -- tenant_id (+firm_id) required/filtered |  |

**Generic read-only pass-through** (`GET /<slug>` and `GET /<slug>/<id>`, served by the shared `readResource()` handler at `server.mjs:480`; each reads exactly its one collection, writes nothing, and is scoped by `tenant_id`/`firm_id` query params via `applyReadFilters()`/`applyActorScope()` when an actor is present):

| Slug | Collection |
|---|---|
| `GET /pilot-acceptance-reviews` (+ `/:id`) | `pilot_acceptance_reviews` |
| `GET /pilot-expansion-cohorts` (+ `/:id`) | `pilot_expansion_cohorts` |
| `GET /pilot-feedback` (+ `/:id`) | `pilot_feedback` |
| `GET /pilot-improvement-items` (+ `/:id`) | `pilot_improvement_items` |
| `GET /pilot-incidents` (+ `/:id`) | `pilot_incidents` |
| `GET /pilot-report-packs` (+ `/:id`) | `pilot_report_packs` |
| `GET /pilot-users` (+ `/:id`) | `pilot_users` |
| `GET /release-candidate-gates` (+ `/:id`) | `release_candidate_gates` |
| `GET /stakeholder-review-boards` (+ `/:id`) | `stakeholder_review_boards` |
| `GET /stakeholder-review-decisions` (+ `/:id`) | `stakeholder_review_decisions` |
| `GET /support-cases` (+ `/:id`) | `support_cases` |
| `GET /tenant-onboarding-plans` (+ `/:id`) | `tenant_onboarding_plans` |
| `GET /tenant-pilot-controls` (+ `/:id`) | `tenant_pilot_controls` |

## Firm Factory / Provisioning

| Method+Path | Handler | Reads | Writes | Scoping | Notes |
|---|---|---|---|---|---|
| `POST /factory/blueprints/firms` | `createFactoryFirmBlueprint` | `tenants` | `audit_events`, `event_log`, `factory_firm_blueprints` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /factory/blueprints/firms/approve` | `approveFactoryFirmBlueprint` | `factory_firm_blueprints` | `factory_firm_blueprints`, `event_log`, `audit_events` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /factory/blueprints/firms/validate` | `validateFactoryFirmBlueprint` | `factory_firm_blueprints` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /factory/provisioning-runs` | `createFactoryProvisioningRun` | `factory_firm_blueprints`, `factory_provisioning_runs`, `tenants` | `actors`, `audit_events`, `event_log`, `factory_firm_blueprints`, `factory_provisioning_runs`, `factory_worker_bindings`, `firm_memberships`, `firms`, `persons`, `professional_authorities`, `professional_profiles`, `provisioned_firm_instances` | Yes -- tenant_id (+firm_id) required/filtered | writes to 12 collections in one request |
| `POST /factory/provisioning-runs/accept-handoff` | `acceptFactoryHandoff` | `factory_provisioning_runs`, `provisioned_firm_instances` | `audit_events`, `event_log`, `factory_provisioning_runs`, `provisioned_firm_instances` | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /factory/provisioning-runs/certify-pack-binding` | `certifyFactoryPackBinding` | `factory_firm_blueprints`, `factory_provisioning_runs`, `factory_worker_bindings`, `provisioned_firm_instances` | `audit_events`, `event_log`, `factory_provisioning_runs`, `pack_binding_certifications`, `pack_compatibility_checks`, `provisioned_firm_instances`, `service_activation_records` | Yes -- tenant_id (+firm_id) required/filtered | writes to 7 collections in one request |
| `POST /factory/provisioning-runs/readiness-test` | `runFactoryReadinessTest` | `factory_provisioning_runs`, `factory_worker_bindings`, `provisioned_firm_instances` | `audit_events`, `event_log`, `factory_provisioning_runs`, `provisioned_firm_instances` | Yes -- tenant_id (+firm_id) required/filtered |  |

**Generic read-only pass-through** (`GET /<slug>` and `GET /<slug>/<id>`, served by the shared `readResource()` handler at `server.mjs:480`; each reads exactly its one collection, writes nothing, and is scoped by `tenant_id`/`firm_id` query params via `applyReadFilters()`/`applyActorScope()` when an actor is present):

| Slug | Collection |
|---|---|
| `GET /factory-firm-blueprints` (+ `/:id`) | `factory_firm_blueprints` |
| `GET /factory-provisioning-runs` (+ `/:id`) | `factory_provisioning_runs` |
| `GET /factory-worker-bindings` (+ `/:id`) | `factory_worker_bindings` |
| `GET /pack-binding-certifications` (+ `/:id`) | `pack_binding_certifications` |
| `GET /pack-compatibility-checks` (+ `/:id`) | `pack_compatibility_checks` |
| `GET /provisioned-firm-instances` (+ `/:id`) | `provisioned_firm_instances` |
| `GET /service-activation-records` (+ `/:id`) | `service_activation_records` |

## Audit / Ledger / Platform & Ops

| Method+Path | Handler | Reads | Writes | Scoping | Notes |
|---|---|---|---|---|---|
| `GET /contracts` | `(inline; no store access)` | — | — | N/A (no store access) | no store access, pure computation/static config |
| `GET /dashboard/summary` | `readDashboardSummary` | `firms`, `tenants` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `GET /data-protection/export-manifest` | `readDataExportManifest` | `(ALL 91 tenant-scoped collections - see tenantExportCollections)` | — | N/A / whole-store | iterates essentially every tenant-scoped collection (~91) via a fixed export list, but each is still tenant_id/firm_id filtered |
| `GET /data-protection/export-package` | `readTenantExportPackage` | `(ALL 91 tenant-scoped collections - see tenantExportCollections)` | — | N/A / whole-store | iterates essentially every tenant-scoped collection (~91) via a fixed export list, but each is still tenant_id/firm_id filtered |
| `GET /data-protection/policy` | `readDataProtectionPolicy` | — | — | N/A (no store access) | no store access, pure computation/static config |
| `GET /database/schema` | `(inline; no store access)` | — | — | N/A (no store access) | no store access, pure computation/static config |
| `GET /health` | `(inline; no store access)` | — | — | N/A (no store access) | no store access, pure computation/static config |
| `GET /mvp/store` | `readStore` | — | — | **NO -- cross-tenant** (see note) | Dev-only endpoint that dumps the ENTIRE in-memory/relational store (every tenant, every collection) as one JSON blob. No tenant/firm filter at all. |
| `GET /operations/today` | `readDailyOperations` | `firms` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `GET /ops/operator-metrics` | `readOperatorMetrics` | `event_log`, `invoices`, `pilot_incidents`, `support_cases`, `tasks` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `GET /ops/r4-observability-audit-review` | `readR4ObservabilityAuditReview` | `audit_events`, `event_log`, `factory_worker_bindings`, `pilot_incidents`, `policy_decisions`, `support_cases`, `worker_instances` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `GET /ops/r4-staging-readiness` | `readR4StagingDataProtectionReadiness` | — | — | N/A (no store access) | no store access, pure computation/static config |
| `GET /ops/readiness` | `readOpsReadiness` | — | — | N/A (no store access) | no store access, pure computation/static config |
| `GET /ops/staging-package` | `readStagingDeploymentPackage` | — | — | N/A (no store access) | no store access, pure computation/static config |
| `GET /pilot/formwork` | `readFormworkPilotPackage` | — | — | N/A (no store access) | no store access, pure computation/static config |
| `GET /tenant-admin/policy` | `readTenantAdminPolicy` | — | — | N/A (no store access) | no store access, pure computation/static config |
| `GET /workspace/active-summary` | `readActiveWorkspaceSummary` | `firms`, `tenants` | — | Yes -- tenant_id (+firm_id) required/filtered |  |
| `POST /mvp/demo-loop` | `createDemoLoop` | `firm_client_relationships`, `firm_memberships`, `firms`, `intake_sessions`, `professional_authorities`, `professional_profiles`, `projects`, `proposals`, `tenants` | `actors`, `approvals`, `audit_events`, `clients`, `engagements`, `event_log`, `evidence_bundles`, `firm_client_relationships`, `firm_memberships`, `firms`, `intake_sessions`, `invoices`, `leads`, `persons`, `policy_decisions`, `price_build_ups`, `professional_authorities`, `professional_profiles`, `projects`, `proposals`, `tasks`, `tenants`, `work_packages` | Yes -- tenant_id (+firm_id) required/filtered | writes to 23 collections in one request; orchestrates 8 other handlers in sequence to seed an entire demo tenant end-to-end |
| `POST /mvp/reset` | `resetStore (dynamic import from store.mjs)` | `ALL 119 collections` | `ALL 119 collections (wipes and reseeds)` | **NO -- cross-tenant** (see note) | Dev/test-only endpoint (env-var gated) that wipes and reseeds the ENTIRE store across every tenant. No tenant/firm scoping -- by design, it destroys everything. |
| `POST /policy/evaluate` | `createPolicyDecisionRecord` | — | `policy_decisions` | Yes -- scoped via input.actor/resource tenant_id |  |

**Generic read-only pass-through** (`GET /<slug>` and `GET /<slug>/<id>`, served by the shared `readResource()` handler at `server.mjs:480`; each reads exactly its one collection, writes nothing, and is scoped by `tenant_id`/`firm_id` query params via `applyReadFilters()`/`applyActorScope()` when an actor is present):

| Slug | Collection |
|---|---|
| `GET /audit-events` (+ `/:id`) | `audit_events` |
| `GET /event-log` (+ `/:id`) | `event_log` |
| `GET /policy-decisions` (+ `/:id`) | `policy_decisions` |

## `store.mjs` Business-Logic Helper Exports

These are the 142 non-trivial exports from `store.mjs` (i.e. excluding pure utilities like `newId`, `now`, `systemActor`, `readStore`/`withStore`, `requireFields`, `getStoreInfo`). Each is called by one or more `server.mjs` handlers above (several, like `appendEventAndAudit`, are called by nearly all of them). Reads/writes below are the helper's own direct store access plus one hop into any further store.mjs helper it calls; a small number of dashboard/summary aggregators that go one hop deeper into a local, non-exported builder function are annotated in the domain tables above instead.

| Export | Reads | Writes |
|---|---|---|
| `148` | — | — |
| `acceptFactoryHandoffRecord` | `factory_provisioning_runs`, `provisioned_firm_instances` | `factory_provisioning_runs`, `provisioned_firm_instances` |
| `acceptProposalRecord` | `proposals` | `engagements`, `proposals` |
| `activatePilotUserRecord` | `pilot_users` | `pilot_users` |
| `activatePrivatePilotCohortRecord` | `pilot_expansion_cohorts` | `pilot_expansion_cohorts` |
| `activateWorkerInstanceRecord` | `worker_instances` | `worker_instances` |
| `addCollaborationWorkspaceEvidenceRecord` | `collaboration_workspace_participants`, `collaboration_workspaces` | `collaboration_workspace_evidence` |
| `addDocumentRevisionRecord` | `document_revision_records` | `document_register_entries`, `document_revision_records` |
| `addFirmMemberRecord` | `firms` | `actors`, `firm_memberships`, `persons` |
| `appendAwiaStaffMemoryEntryRecord` | `awia_virtual_staff_members` | `awia_staff_memory_entries` |
| `approveExpenseRecord` | — | `expense_records` |
| `approveFactoryFirmBlueprintRecord` | — | — |
| `approveProposalRecord` | `proposals` | `approvals`, `proposals` |
| `approveQuotationCaseRecord` | `proposals`, `quotation_cases` | `quotation_cases` |
| `archiveAwiaStaffWorkdeskItemRecord` | `awia_staff_output_drafts`, `awia_staff_workdesk_items` | `awia_staff_workdesk_items` |
| `assignAwiaFirmPackageRecord` | `awia_firm_package_assignments`, `firms` | `awia_firm_package_assignments` |
| `assignAwiaVirtualStaffTaskRecord` | `awia_virtual_staff_members`, `tasks` | `awia_staff_authority_decisions`, `awia_staff_task_readiness_records`, `awia_staff_workdesk_items`, `tasks` |
| `assignTaskToWorkerRecord` | `tasks`, `worker_instances` | `tasks` |
| `bindAdministrationSkillsRecord` | `administration_skill_bindings`, `firms` | `administration_skill_bindings` |
| `bindCommercialSkillsRecord` | `commercial_skill_bindings`, `firms` | `commercial_skill_bindings` |
| `bindTechnicalSkillsRecord` | `firms`, `technical_skill_bindings` | `technical_skill_bindings` |
| `certifyFactoryPackBindingRecord` | `factory_firm_blueprints`, `factory_provisioning_runs`, `factory_worker_bindings`, `provisioned_firm_instances` | `factory_provisioning_runs`, `pack_binding_certifications`, `pack_compatibility_checks`, `provisioned_firm_instances`, `service_activation_records` |
| `completeAdministrativeDeadlineRecord` | — | `administrative_deadlines` |
| `completeTaskRecord` | `tasks` | `tasks` |
| `createAdministrativeDeadlineRecord` | — | `administrative_deadlines` |
| `createBillingReadinessReviewRecord` | — | `billing_readiness_reviews` |
| `createBoqExtractionAidRecord` | `boq_extraction_aids`, `quotation_cases` | `boq_extraction_aids` |
| `createCalculationInputSetRecord` | `document_register_entries`, `document_revision_records`, `projects` | `calculation_input_sets` |
| `createCapacityOfferRecord` | — | `capacity_offers` |
| `createClientCommunicationDraftRecord` | `front_desk_enquiries` | `client_communication_drafts` |
| `createClientRecord` | `firms` | `clients`, `firm_client_relationships` |
| `createCollaborationRequestRecord` | `capacity_offers` | `collaboration_requests` |
| `createCollaborationWorkspaceRecord` | `specialist_invitations` | `collaboration_workspaces` |
| `createCommercialLaunchControlRecord` | — | `commercial_launch_controls` |
| `createCorrespondenceRecord` | — | `correspondence_records` |
| `createDeliverableDraftRecord` | `projects` | `document_versions`, `documents` |
| `createDeliveryPackageRecord` | `calculation_input_sets`, `document_register_entries`, `document_revision_records`, `projects`, `technical_qa_findings` | `delivery_package_records` |
| `createDirectoryEnquiryCollaborationRequestRecord` | `directory_private_enquiries` | `collaboration_requests`, `directory_private_enquiries` |
| `createDirectoryReviewBoardDecisionRecord` | `directory_review_board_decisions`, `marketplace_listings` | `directory_review_board_decisions`, `marketplace_listings` |
| `createDrawingReviewRecord` | `document_register_entries`, `document_revision_records`, `projects` | `drawing_review_records` |
| `createEvidenceBundleRecord` | `projects` | `evidence_bundles` |
| `createExpenseRecord` | — | `expense_records` |
| `createFactoryFirmBlueprintRecord` | `tenants` | `factory_firm_blueprints` |
| `createFactoryProvisioningRunRecord` | `factory_firm_blueprints`, `factory_provisioning_runs` | `factory_firm_blueprints`, `factory_provisioning_runs`, `factory_worker_bindings`, `provisioned_firm_instances` |
| `createFirmRecord` | `tenants` | `actors`, `firm_memberships`, `firms`, `persons`, `professional_authorities`, `professional_profiles` |
| `createFrontDeskEnquiryRecord` | `firms` | `front_desk_enquiries` |
| `createIntakeSessionRecord` | `firm_client_relationships` | `intake_sessions`, `leads` |
| `createInvoiceRecord` | — | `invoices` |
| `createMarketplaceListingRecord` | — | `marketplace_listings` |
| `createNetworkCapabilityRecord` | — | `network_capabilities` |
| `createNetworkConflictCheckRecord` | — | `network_conflict_checks` |
| `createNetworkCredentialRecord` | — | `network_credentials` |
| `createNetworkFirmProfileRecord` | — | `network_firm_profiles` |
| `createNetworkProfessionalProfileRecord` | — | `network_professional_profiles` |
| `createNetworkQualificationGateRecord` | — | `network_qualification_gates` |
| `createNetworkTrustSignalRecord` | — | `network_trust_signals` |
| `createObservatorySnapshotRecord` | `capacity_offers`, `collaboration_requests`, `firms`, `invoices`, `marketplace_listings`, `projects`, `service_packs`, `task_outputs` | `observatory_snapshots` |
| `createPaymentProviderConfigRecord` | — | `payment_provider_configs` |
| `createPilotAcceptanceReviewRecord` | — | `pilot_acceptance_reviews` |
| `createPilotExpansionCohortRecord` | — | `pilot_expansion_cohorts` |
| `createPilotFeedbackRecord` | — | `pilot_feedback` |
| `createPilotHandoffRecord` | — | `pilot_handoff_records` |
| `createPilotImprovementItemRecord` | — | `pilot_improvement_items` |
| `createPilotIncidentRecord` | — | `pilot_incidents` |
| `createPilotReportPackRecord` | — | `pilot_report_packs` |
| `createPolicyDecisionRecord` | — | `policy_decisions` |
| `createPrivateDirectoryEnquiryRecord` | `directory_private_enquiries`, `marketplace_listings` | `directory_private_enquiries` |
| `createProposalRecord` | `intake_sessions` | `price_build_ups`, `proposals` |
| `createQualificationRenewalReviewRecord` | `marketplace_listings`, `network_qualification_gates`, `qualification_renewal_reviews` | `marketplace_listings`, `qualification_renewal_reviews` |
| `createQuotationCaseRecord` | `quotation_cases` | `quotation_cases` |
| `createQuotationDraftPackRecord` | `boq_extraction_aids`, `quotation_cases`, `quotation_draft_packs` | `quotation_draft_packs` |
| `createReceivableFollowUpRecord` | `invoices` | `receivable_follow_ups` |
| `createReleaseCandidateGateRecord` | — | `release_candidate_gates` |
| `createResponsibilityMatrixRecord` | `collaboration_workspace_participants`, `collaboration_workspaces` | `responsibility_matrices` |
| `createSalesPipelineRecord` | — | `sales_pipeline_records` |
| `createSpecialistAssignmentRecord` | — | `specialist_assignments` |
| `createSpecialistInvitationRecord` | `network_qualification_gates` | `specialist_invitations` |
| `createStakeholderReviewBoardRecord` | — | `stakeholder_review_boards` |
| `createStakeholderReviewDecisionRecord` | `stakeholder_review_boards` | `stakeholder_review_boards`, `stakeholder_review_decisions` |
| `createSubscriptionPackageRecord` | — | `subscription_packages` |
| `createSupportCaseRecord` | — | `support_cases` |
| `createTechnicalQaFindingRecord` | — | `technical_qa_findings` |
| `createTenantOnboardingPlanRecord` | — | `tenant_onboarding_plans` |
| `createTenantPilotControlRecord` | — | `tenant_pilot_controls` |
| `createTenantRecord` | — | `tenants` |
| `createTransmittalDraftRecord` | — | `transmittal_drafts` |
| `decideAwiaStaffClassAApprovalRecord` | `awia_staff_output_drafts` | `awia_staff_output_drafts` |
| `dispatchProposalRecord` | `proposal_dispatch_records`, `sales_pipeline_records` | `proposal_dispatch_records`, `proposals` |
| `evaluateAwiaVirtualStaffTaskReadinessRecord` | — | `awia_staff_authority_decisions`, `awia_staff_task_readiness_records` |
| `findValidProfessionalAuthority` | `firm_memberships`, `professional_authorities`, `professional_profiles` | — |
| `grantCollaborationWorkspaceParticipantRecord` | `collaboration_workspaces` | `collaboration_workspace_participants` |
| `handoffFrontDeskEnquiryRecord` | `front_desk_enquiries` | `front_desk_enquiries` |
| `hireAwiaFirmWorkerRecord` | `awia_firm_package_assignments`, `awia_staff_role_assignments`, `awia_virtual_staff_members`, `firms` | `awia_staff_evidence_packs`, `awia_staff_lifecycle_events`, `awia_staff_package_bindings`, `awia_staff_role_assignments`, `awia_virtual_staff_members`, `awia_virtual_staff_provisioning_runs`, `awia_virtual_staff_seats` |
| `invitePilotUserRecord` | `pilot_users` | `pilot_users` |
| `issueDeliverableRecord` | `approvals`, `document_versions`, `documents`, `projects` | `document_versions`, `documents`, `projects` |
| `issueInvoiceRecord` | `invoices`, `projects` | `invoices` |
| `issueQuotationCaseRecord` | `quotation_cases` | `quotation_cases` |
| `issueQuotationDraftPackRecord` | `correspondence_records`, `quotation_draft_packs`, `quotation_issue_records` | `correspondence_records`, `quotation_cases`, `quotation_draft_packs`, `quotation_issue_records` |
| `linkQuotationCaseProposalRecord` | `proposals`, `quotation_cases` | `quotation_cases` |
| `markAwiaClientDeliveryDraftSentRecord` | `awia_client_delivery_drafts`, `awia_staff_workdesk_items` | `awia_client_delivery_drafts`, `awia_staff_workdesk_items` |
| `openAwiaStaffConversationThreadRecord` | `awia_virtual_staff_members` | `awia_staff_conversation_threads` |
| `openProjectDeliveryRecord` | — | `projects`, `tasks`, `work_packages` |
| `postAwiaStaffConversationMessageRecord` | `awia_staff_conversation_threads` | `awia_staff_conversation_messages` |
| `prepareAwiaClientDeliveryDraftRecord` | `awia_staff_output_drafts`, `awia_staff_output_reviews`, `awia_staff_workdesk_items` | `awia_client_delivery_drafts`, `awia_staff_workdesk_items` |
| `prepareQuotationClientCorrespondenceRecord` | `quotation_cases`, `quotation_draft_packs` | `correspondence_records`, `quotation_draft_packs` |
| `prepareQuotationReceivableRecord` | `quotation_issue_records`, `quotation_receivable_preparations` | `quotation_receivable_preparations` |
| `produceAwiaStaffOutputDraftRecord` | `awia_staff_workdesk_items`, `awia_virtual_staff_members`, `tasks` | `awia_staff_output_drafts`, `awia_staff_workdesk_items`, `tasks` |
| `produceTaskOutputRecord` | `tasks`, `worker_instances` | `task_outputs`, `tasks` |
| `provisionAwiaVirtualStaffFromTemplateRecord` | `awia_firm_package_assignments`, `awia_virtual_staff_provisioning_runs`, `firms` | `awia_staff_evidence_packs`, `awia_staff_lifecycle_events`, `awia_staff_package_bindings`, `awia_staff_role_assignments`, `awia_virtual_staff_members`, `awia_virtual_staff_provisioning_runs`, `awia_virtual_staff_seats` |
| `provisionAwiaVirtualStaffPilotRecord` | `firms` | `awia_staff_evidence_packs`, `awia_staff_lifecycle_events`, `awia_staff_package_bindings`, `awia_staff_role_assignments`, `awia_virtual_staff_members`, `awia_virtual_staff_provisioning_runs`, `awia_virtual_staff_seats` |
| `provisionWorkerInstanceRecord` | `firms` | `actors`, `worker_instances` |
| `purgeTestFirmRecord` | `actors`, `audit_events`, `event_log`, `firm_memberships`, `firms`, `persons`, `pilot_users`, `professional_authorities`, `professional_profiles`, `tenants` | `actors`, `audit_events`, `event_log`, `firm_memberships`, `firms`, `persons`, `pilot_users`, `professional_authorities`, `professional_profiles`, `tenants` |
| `qualifyFrontDeskEnquiryRecord` | `front_desk_enquiries` | `front_desk_enquiries` |
| `readAwiaFirmPackageAssignmentRecord` | `awia_firm_package_assignments` | — |
| `readAwiaStaffTemplateCatalogueRecord` | — | — |
| `readCashSnapshot` | `expense_records`, `invoices`, `payment_statuses`, `receivable_follow_ups`, `sales_pipeline_records` | — |
| `readDailyOperationsSummary` | — | — |
| `recordPaymentStatusRecord` | `invoices` | `invoices`, `payment_statuses` |
| `recordTenantUsageEventRecord` | — | `tenant_usage_events` |
| `registerDocumentRecord` | `document_register_entries` | `document_register_entries`, `document_revision_records` |
| `requestToolInvocationRecord` | `worker_instances` | `tool_invocations` |
| `resolveTechnicalQaFindingRecord` | — | `technical_qa_findings` |
| `reviewAwiaStaffOutputDraftRecord` | `awia_staff_output_drafts`, `awia_staff_workdesk_items` | `awia_staff_output_drafts`, `awia_staff_output_reviews`, `awia_staff_workdesk_items` |
| `reviewBoqExtractionAidRecord` | `boq_extraction_aids` | `boq_extraction_aids` |
| `reviewDeliverableRecord` | `document_versions`, `evidence_bundles`, `work_packages` | `approvals`, `document_versions`, `evidence_bundles` |
| `reviewQuotationDraftPackRecord` | `quotation_draft_packs` | `quotation_draft_packs` |
| `revokeCollaborationWorkspaceParticipantRecord` | `collaboration_workspace_participants`, `collaboration_workspaces` | `collaboration_workspace_participants` |
| `revokePilotUserRecord` | `pilot_users` | `pilot_users` |
| `runFactoryReadinessTestRecord` | `factory_provisioning_runs`, `factory_worker_bindings`, `provisioned_firm_instances` | `factory_provisioning_runs`, `provisioned_firm_instances` |
| `startTaskRecord` | `tasks` | `tasks` |
| `suspendPilotUserRecord` | `pilot_users` | `pilot_users` |
| `transitionSpecialistAssignmentRecord` | `responsibility_matrices`, `specialist_assignments` | — |
| `updateAwiaStaffSeatBillingStatusRecord` | `awia_virtual_staff_seats` | `awia_staff_seat_billing_events`, `awia_virtual_staff_seats` |
| `updateAwiaVirtualStaffLifecycleRecord` | `awia_staff_lifecycle_events`, `awia_virtual_staff_members` | `awia_staff_lifecycle_events`, `awia_virtual_staff_members` |
| `updateMarketplaceListingStatusRecord` | `marketplace_listings` | `marketplace_listings` |
| `updatePilotExpansionCohortRecord` | `pilot_expansion_cohorts` | `pilot_expansion_cohorts` |
| `updatePilotImprovementItemRecord` | `pilot_improvement_items` | `pilot_improvement_items` |
| `updatePilotIncidentRecord` | `pilot_incidents` | `pilot_incidents` |
| `updateSalesPipelineRecord` | — | `sales_pipeline_records` |
| `updateSupportCaseRecord` | `support_cases` | `support_cases` |
| `updateTenantOnboardingPlanRecord` | `tenant_onboarding_plans` | `tenant_onboarding_plans` |
| `validateFactoryFirmBlueprintRecord` | — | — |

## Full Collection Inventory (Orphan Check)

**119 collections** exist in `initialStore()` (`store.mjs:29`). The same 119 names, byte-for-byte, appear as the `collection` value in every entry of the `readCollections` Map in `server.mjs` (used by the generic `GET /<slug>` reader) and in the union of `readRelationalStore()` + `readAwiaVirtualStaffRelational()`'s Postgres projection (`store.mjs:429` / `store.mjs:336`, the latter driven by the `AWIA_RELATIONAL_TABLES` list at `store.mjs:296`). **Diffing all three sets produced zero orphans**: nothing exists only in the JSON default shape without a read route, and nothing is read that the store doesn't define. (Seven Firm-Factory collections -- `factory_firm_blueprints`, `factory_provisioning_runs`, `provisioned_firm_instances`, `factory_worker_bindings`, `pack_compatibility_checks`, `pack_binding_certifications`, `service_activation_records` -- are notable in that they are **not** part of either Postgres relational projection: on `VFIRM_STORE_BACKEND=postgres` they still exist and are read/written in memory via `withStore()`, but nothing persists them to a relational table, so a Postgres-backed deployment loses Firm Factory state on restart. Confirm this is intended before folding Firm Factory into the new repository layer.)

<details><summary>All 119 collection names</summary>

- `actors`
- `administration_skill_bindings`
- `administrative_deadlines`
- `approvals`
- `audit_events`
- `awia_client_delivery_drafts`
- `awia_firm_package_assignments`
- `awia_staff_authority_decisions`
- `awia_staff_conversation_messages`
- `awia_staff_conversation_threads`
- `awia_staff_evidence_packs`
- `awia_staff_lifecycle_events`
- `awia_staff_memory_entries`
- `awia_staff_output_drafts`
- `awia_staff_output_reviews`
- `awia_staff_package_bindings`
- `awia_staff_role_assignments`
- `awia_staff_seat_billing_events`
- `awia_staff_task_readiness_records`
- `awia_staff_workdesk_items`
- `awia_virtual_staff_members`
- `awia_virtual_staff_provisioning_runs`
- `awia_virtual_staff_seats`
- `billing_readiness_reviews`
- `boq_extraction_aids`
- `calculation_input_sets`
- `capacity_offers`
- `client_communication_drafts`
- `clients`
- `collaboration_requests`
- `collaboration_workspace_evidence`
- `collaboration_workspace_participants`
- `collaboration_workspaces`
- `commercial_launch_controls`
- `commercial_skill_bindings`
- `correspondence_records`
- `delivery_package_records`
- `directory_private_enquiries`
- `directory_review_board_decisions`
- `document_register_entries`
- `document_revision_records`
- `document_versions`
- `documents`
- `drawing_review_records`
- `engagements`
- `event_log`
- `evidence_bundles`
- `expense_records`
- `factory_firm_blueprints`
- `factory_provisioning_runs`
- `factory_worker_bindings`
- `firm_client_relationships`
- `firm_memberships`
- `firms`
- `front_desk_enquiries`
- `intake_sessions`
- `invoices`
- `leads`
- `marketplace_listings`
- `network_capabilities`
- `network_conflict_checks`
- `network_credentials`
- `network_firm_profiles`
- `network_professional_profiles`
- `network_qualification_gates`
- `network_trust_signals`
- `observatory_snapshots`
- `pack_binding_certifications`
- `pack_compatibility_checks`
- `payment_provider_configs`
- `payment_statuses`
- `persons`
- `pilot_acceptance_reviews`
- `pilot_expansion_cohorts`
- `pilot_feedback`
- `pilot_handoff_records`
- `pilot_improvement_items`
- `pilot_incidents`
- `pilot_report_packs`
- `pilot_users`
- `policy_decisions`
- `price_build_ups`
- `professional_authorities`
- `professional_profiles`
- `projects`
- `proposal_dispatch_records`
- `proposals`
- `provisioned_firm_instances`
- `qualification_renewal_reviews`
- `quotation_cases`
- `quotation_draft_packs`
- `quotation_issue_records`
- `quotation_receivable_preparations`
- `receivable_follow_ups`
- `release_candidate_gates`
- `responsibility_matrices`
- `sales_pipeline_records`
- `service_activation_records`
- `service_packs`
- `service_skus`
- `specialist_assignments`
- `specialist_invitations`
- `stakeholder_review_boards`
- `stakeholder_review_decisions`
- `subscription_packages`
- `support_cases`
- `task_outputs`
- `tasks`
- `technical_qa_findings`
- `technical_skill_bindings`
- `tenant_onboarding_plans`
- `tenant_pilot_controls`
- `tenant_usage_events`
- `tenants`
- `tool_invocations`
- `transmittal_drafts`
- `work_packages`
- `worker_instances`
- `worker_templates`

</details>

## Proposed Domain Grouping for the Repository Layer

Based on how collections actually cluster by path prefix and by which handlers/helpers touch them together, here is a proposed ~10-domain split for the new per-domain repositories:

### Directory & Firm Setup (9 collections)

`tenants`, `firms`, `firm_memberships`, `persons`, `actors`, `professional_profiles`, `professional_authorities`, `service_packs`, `service_skus`

### My Team & HR (AI Workforce) (22 collections)

`worker_templates`, `worker_instances`, `task_outputs`, `tool_invocations`, `awia_firm_package_assignments`, `awia_virtual_staff_provisioning_runs`, `awia_virtual_staff_seats`, `awia_virtual_staff_members`, `awia_staff_role_assignments`, `awia_staff_package_bindings`, `awia_staff_lifecycle_events`, `awia_staff_authority_decisions`, `awia_staff_evidence_packs`, `awia_staff_task_readiness_records`, `awia_staff_workdesk_items`, `awia_staff_output_drafts`, `awia_staff_output_reviews`, `awia_client_delivery_drafts`, `awia_staff_memory_entries`, `awia_staff_conversation_threads`, `awia_staff_conversation_messages`, `awia_staff_seat_billing_events`

### Sales & Intake (16 collections)

`clients`, `firm_client_relationships`, `front_desk_enquiries`, `client_communication_drafts`, `leads`, `intake_sessions`, `sales_pipeline_records`, `proposal_dispatch_records`, `proposals`, `price_build_ups`, `commercial_skill_bindings`, `quotation_cases`, `boq_extraction_aids`, `quotation_draft_packs`, `quotation_issue_records`, `quotation_receivable_preparations`

### Client Engagements & Projects (incl. Technical Delivery) (10 collections)

`engagements`, `projects`, `work_packages`, `tasks`, `technical_skill_bindings`, `drawing_review_records`, `calculation_input_sets`, `technical_qa_findings`, `delivery_package_records`, `pilot_handoff_records`

### Documents & Correspondence (Administration) (9 collections)

`documents`, `document_versions`, `document_register_entries`, `document_revision_records`, `correspondence_records`, `administrative_deadlines`, `transmittal_drafts`, `evidence_bundles`, `administration_skill_bindings`

### Finance & Commercial (10 collections)

`invoices`, `payment_statuses`, `expense_records`, `receivable_follow_ups`, `payment_provider_configs`, `subscription_packages`, `commercial_launch_controls`, `billing_readiness_reviews`, `tenant_usage_events`, `approvals`

### Network & Marketplace (20 collections)

`marketplace_listings`, `directory_review_board_decisions`, `directory_private_enquiries`, `qualification_renewal_reviews`, `capacity_offers`, `collaboration_requests`, `network_professional_profiles`, `network_firm_profiles`, `network_capabilities`, `network_credentials`, `network_trust_signals`, `network_conflict_checks`, `network_qualification_gates`, `specialist_invitations`, `collaboration_workspaces`, `collaboration_workspace_participants`, `collaboration_workspace_evidence`, `responsibility_matrices`, `specialist_assignments`, `observatory_snapshots`

### Pilot & Observatory (13 collections)

`pilot_users`, `support_cases`, `pilot_incidents`, `pilot_feedback`, `pilot_acceptance_reviews`, `pilot_improvement_items`, `pilot_report_packs`, `stakeholder_review_boards`, `stakeholder_review_decisions`, `pilot_expansion_cohorts`, `tenant_onboarding_plans`, `release_candidate_gates`, `tenant_pilot_controls`

### Firm Factory / Provisioning (7 collections)

`factory_firm_blueprints`, `factory_provisioning_runs`, `provisioned_firm_instances`, `factory_worker_bindings`, `pack_compatibility_checks`, `pack_binding_certifications`, `service_activation_records`

### Audit / Ledger / Platform & Ops (3 collections)

`policy_decisions`, `event_log`, `audit_events`

**Cross-cutting note:** `approvals` (grouped under Finance & Commercial above) is actually referenced by proposal approval, deliverable review, and quotation-case approval flows across three different domains -- it may deserve its own thin shared "approvals" repository rather than living inside Finance. `event_log` and `audit_events` (Audit/Ledger) are written by nearly every mutating handler in every other domain via `appendEventAndAudit`, so the new repository layer will need either a shared audit-write capability injected into every domain repository, or to keep audit writes centralized rather than domain-scoped.
