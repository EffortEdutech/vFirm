-- Closes a schema-drift gap discovered by diffing every `from <table>` in apps/api/src/store.mjs's
-- readRelationalStore() against every `create table` in migrations 0001_mvp_schema.sql,
-- 0024_awia_virtual_staff_persistence.sql and 0025_firm_factory_persistence.sql: 64 tables that the
-- application already reads and writes on the Postgres backend have never had a CREATE TABLE
-- committed anywhere in this repository. Production works today only because these tables were
-- created directly against the live database out-of-band; a fresh database built from what is
-- checked into git is missing all 64 of them and the app crashes the first time any of this code
-- path runs (front desk intake, commercial operations, technical delivery, the private/trusted
-- network domain, pilot operations, and worker/task execution).
--
-- Every column list below was read directly out of apps/api/src/store.mjs: primarily the relevant
-- `select ... from <table>` in readRelationalStore() (authoritative for column names/order), cross
-- checked against the matching `insert into <table>` in whichever persistXFromStore()/createXRecord()
-- function writes it, which is also how jsonb casts, uuidOrNull()-wrapped nullable foreign keys, and
-- "on conflict (id) do update set ..." mutability were determined. Two tables (service_packs,
-- service_skus) have no insert or object-construction call anywhere in store.mjs -- they are
-- populated out-of-band today -- so their schema is taken from the SELECT list alone; this is called
-- out in a comment above each of those two tables specifically.
--
-- Foreign keys point at another table in this migration, or at a table from 0001/0024/0025, wherever
-- the referenced table exists; a handful of polymorphic/ambiguous reference columns
-- (network_conflict_checks.subject_profile_id, network_trust_signals.subject_id,
-- technical_qa_findings.subject_id, administrative_deadlines/document_revision_records
-- .assigned_actor_or_worker_ref-style refs) are left as plain uuid columns with a one-line comment,
-- matching how tasks.assigned_actor_or_worker_ref is already handled, unreferenced, in 0001. One real
-- circular reference exists: document_register_entries.current_revision_id points at a
-- document_revision_records row, while document_revision_records.document_register_entry_id points
-- back at document_register_entries; store.mjs itself inserts document_register_entries with
-- current_revision_id forced to null and only backfills it with a later `update`, so that column is
-- created here as a plain uuid (no FK) rather than force a table-creation-order deadlock.
--
-- Tables are ordered so that every foreign key points only at a table created earlier in this file
-- (or already created by 0001/0024/0025).

-- Global AI worker template catalog. Seeded by seedWorkerTemplates() (apps/api/src/store.mjs); read
-- by readRelationalStore() `select id::text, code, name, version, default_tools, default_budget,
-- risk_envelope, status, created_at, updated_at from worker_templates`. version is a free-text label
-- (seed data uses "1.0"), not an integer.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- worker_templates was already created by 0006_ai_workforce_runtime.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries worker_templates using the OLD,
-- bespoke named-column schema from 0006_ai_workforce_runtime.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for worker_templates removed here -- it never took effect; the live
-- table is the one from 0006_ai_workforce_runtime.sql. Indexes below are real and kept.)

-- Global service pack catalog. No insert or object-construction call for this table exists anywhere
-- in store.mjs (it is populated out-of-band); schema inferred from readRelationalStore()'s
-- `select id::text, code, name, discipline, status, version, description, configuration, created_at,
-- updated_at from service_packs`.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- service_packs was already created by 0003_service_catalogue.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries service_packs using the OLD,
-- bespoke named-column schema from 0003_service_catalogue.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for service_packs removed here -- it never took effect; the live
-- table is the one from 0003_service_catalogue.sql. Indexes below are real and kept.)

-- Global service SKU catalog under a service pack. Like service_packs, no insert or
-- object-construction call exists in store.mjs; schema inferred from readRelationalStore()'s
-- `select id::text, service_pack_id::text, code, name, status, pricing_model, created_at,
-- updated_at from service_skus`. pricing_model is a free-text label (see subscription_packages
-- and other pricing_model columns below, all populated with plain strings, never JSON).
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- service_skus was already created by 0003_service_catalogue.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries service_skus using the OLD,
-- bespoke named-column schema from 0003_service_catalogue.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for service_skus removed here -- it never took effect; the live
-- table is the one from 0003_service_catalogue.sql. Indexes below are real and kept.)

-- AI worker (agent) instances. Written by provisionWorkerInstanceRecord() with a plain
-- `insert into worker_instances (id, tenant_id, firm_id, worker_template_id, actor_id, name,
-- assigned_services, tool_allowlist, budget_envelope, risk_limits, runtime_status, created_at,
-- updated_at) values (...)`; all foreign keys are passed unwrapped (never uuidOrNull), so tenant_id,
-- firm_id, worker_template_id and actor_id are all required.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- worker_instances was already created by 0006_ai_workforce_runtime.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries worker_instances using the OLD,
-- bespoke named-column schema from 0006_ai_workforce_runtime.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for worker_instances removed here -- it never took effect; the live
-- table is the one from 0006_ai_workforce_runtime.sql. Indexes below are real and kept.)

create index if not exists idx_worker_instances_tenant_firm on worker_instances(tenant_id, firm_id);

-- Outputs an AI worker produces against a task. Written by produceTaskOutputRecord()'s
-- `insert into task_outputs (id, tenant_id, firm_id, project_id, task_id, worker_instance_id,
-- output_ref, output_schema_ref, evidence_refs, quality_flags, requires_human_review, status,
-- created_at) values (...)`; tenant_id/firm_id/task_id/worker_instance_id are all passed unwrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- task_outputs was already created by 0006_ai_workforce_runtime.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries task_outputs using the OLD,
-- bespoke named-column schema from 0006_ai_workforce_runtime.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for task_outputs removed here -- it never took effect; the live
-- table is the one from 0006_ai_workforce_runtime.sql. Indexes below are real and kept.)

create index if not exists idx_task_outputs_tenant_firm on task_outputs(tenant_id, firm_id);

-- Tool invocation requests made by an AI worker. Written by requestToolInvocationRecord()'s
-- `insert into tool_invocations (id, tenant_id, firm_id, worker_instance_id, task_id, tool_name,
-- invocation_status, input_summary, output_ref, cost_estimate, created_at, completed_at)
-- values (...)`; task_id is the only foreign key wrapped in uuidOrNull().
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- tool_invocations was already created by 0006_ai_workforce_runtime.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries tool_invocations using the OLD,
-- bespoke named-column schema from 0006_ai_workforce_runtime.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for tool_invocations removed here -- it never took effect; the live
-- table is the one from 0006_ai_workforce_runtime.sql. Indexes below are real and kept.)

create index if not exists idx_tool_invocations_tenant_firm on tool_invocations(tenant_id, firm_id);

-- Firm staff membership records. Written near the top of store.mjs's persistence path with
-- `insert into firm_memberships (id, tenant_id, firm_id, actor_id, person_id, role, permissions,
-- status, created_at, updated_at) values (...)`.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- firm_memberships was already created by 0005_trust_identity_governance.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries firm_memberships using the OLD,
-- bespoke named-column schema from 0005_trust_identity_governance.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for firm_memberships removed here -- it never took effect; the live
-- table is the one from 0005_trust_identity_governance.sql. Indexes below are real and kept.)

create index if not exists idx_firm_memberships_tenant_firm on firm_memberships(tenant_id, firm_id);

-- Front desk enquiry intake records. Written by persistFrontDeskFromStore()'s
-- `insert into front_desk_enquiries (...) on conflict (id) do update set status=..., ...`; every
-- foreign key (assigned_actor_id, client_id, relationship_id, lead_id, intake_session_id) is wrapped
-- in uuidOrNull() and therefore nullable.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- front_desk_enquiries was already created by 0016_sf_s2_front_desk_hardening.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries front_desk_enquiries using the OLD,
-- bespoke named-column schema from 0016_sf_s2_front_desk_hardening.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for front_desk_enquiries removed here -- it never took effect; the live
-- table is the one from 0016_sf_s2_front_desk_hardening.sql. Indexes below are real and kept.)

create index if not exists idx_front_desk_enquiries_tenant_firm on front_desk_enquiries(tenant_id, firm_id);

-- Drafted client communications from front desk enquiries. Written by persistFrontDeskFromStore()'s
-- `insert into client_communication_drafts (...) on conflict (id) do update set ...`; enquiry_id is
-- passed unwrapped (not null), requires_human_review is always inserted as the literal `true`.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- client_communication_drafts was already created by 0016_sf_s2_front_desk_hardening.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries client_communication_drafts using the OLD,
-- bespoke named-column schema from 0016_sf_s2_front_desk_hardening.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for client_communication_drafts removed here -- it never took effect; the live
-- table is the one from 0016_sf_s2_front_desk_hardening.sql. Indexes below are real and kept.)

create index if not exists idx_client_communication_drafts_tenant_firm on client_communication_drafts(tenant_id, firm_id);

-- Administration-domain AI worker skill bindings. Written by persistAdministrationFromStore()'s
-- `insert into administration_skill_bindings (...) on conflict (id) do update set status=...,
-- metadata=...`; supervisor_actor_id is passed unwrapped in this insert (left nullable here anyway
-- since the column is not required by the rest of the schema).
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- administration_skill_bindings was already created by 0017_sf_s3_administration_document_control.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries administration_skill_bindings using the OLD,
-- bespoke named-column schema from 0017_sf_s3_administration_document_control.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for administration_skill_bindings removed here -- it never took effect; the live
-- table is the one from 0017_sf_s3_administration_document_control.sql. Indexes below are real and kept.)

create index if not exists idx_administration_skill_bindings_tenant_firm on administration_skill_bindings(tenant_id, firm_id);

-- Correspondence log entries. Written by persistAdministrationFromStore()'s
-- `insert into correspondence_records (...) on conflict (id) do update set status=..., ...`;
-- relationship_id, project_id and owner_actor_id are all uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- correspondence_records was already created by 0017_sf_s3_administration_document_control.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries correspondence_records using the OLD,
-- bespoke named-column schema from 0017_sf_s3_administration_document_control.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for correspondence_records removed here -- it never took effect; the live
-- table is the one from 0017_sf_s3_administration_document_control.sql. Indexes below are real and kept.)

create index if not exists idx_correspondence_records_tenant_firm on correspondence_records(tenant_id, firm_id);

-- Document register (index of controlled documents per project). Written by
-- persistAdministrationFromStore()'s `insert into document_register_entries (..., current_revision_id,
-- ...) values (..., null, ...) on conflict (id) do update set status=..., ...` -- current_revision_id
-- is always inserted as literal null and only ever backfilled by a later `update ... set
-- current_revision_id=...`; kept here as a plain uuid (no FK) to avoid a circular reference with
-- document_revision_records, which points back at this table (see header comment).
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- document_register_entries was already created by 0017_sf_s3_administration_document_control.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries document_register_entries using the OLD,
-- bespoke named-column schema from 0017_sf_s3_administration_document_control.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for document_register_entries removed here -- it never took effect; the live
-- table is the one from 0017_sf_s3_administration_document_control.sql. Indexes below are real and kept.)

create index if not exists idx_document_register_entries_tenant_firm on document_register_entries(tenant_id, firm_id);

-- Individual revisions of a registered document. Written by persistAdministrationFromStore()'s
-- `insert into document_revision_records (...) on conflict (id) do update set status=...,
-- metadata=...`; document_register_entry_id is passed unwrapped (not null), supersedes_revision_id
-- and created_by_actor_id are uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- document_revision_records was already created by 0017_sf_s3_administration_document_control.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries document_revision_records using the OLD,
-- bespoke named-column schema from 0017_sf_s3_administration_document_control.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for document_revision_records removed here -- it never took effect; the live
-- table is the one from 0017_sf_s3_administration_document_control.sql. Indexes below are real and kept.)

create index if not exists idx_document_revision_records_tenant_firm on document_revision_records(tenant_id, firm_id);

-- Administrative follow-up deadlines. Written by persistAdministrationFromStore()'s
-- `insert into administrative_deadlines (...) on conflict (id) do update set status=..., ...`;
-- project_id, relationship_id and assigned_actor_or_worker_ref are uuidOrNull()-wrapped.
-- assigned_actor_or_worker_ref is polymorphic (an actor OR a worker instance id, mirroring
-- tasks.assigned_actor_or_worker_ref in 0001), so it is left as a plain uuid with no FK.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- administrative_deadlines was already created by 0017_sf_s3_administration_document_control.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries administrative_deadlines using the OLD,
-- bespoke named-column schema from 0017_sf_s3_administration_document_control.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for administrative_deadlines removed here -- it never took effect; the live
-- table is the one from 0017_sf_s3_administration_document_control.sql. Indexes below are real and kept.)

create index if not exists idx_administrative_deadlines_tenant_firm on administrative_deadlines(tenant_id, firm_id);

-- Drafted transmittals accompanying issued document revisions. Written by
-- persistAdministrationFromStore()'s `insert into transmittal_drafts (...) on conflict (id) do
-- update set subject=..., message_body=..., status=..., ...`; requires_principal_approval is always
-- inserted as the literal `true`; project_id, relationship_id, prepared_by_actor_id and
-- approved_by_actor_id are uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- transmittal_drafts was already created by 0017_sf_s3_administration_document_control.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries transmittal_drafts using the OLD,
-- bespoke named-column schema from 0017_sf_s3_administration_document_control.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for transmittal_drafts removed here -- it never took effect; the live
-- table is the one from 0017_sf_s3_administration_document_control.sql. Indexes below are real and kept.)

create index if not exists idx_transmittal_drafts_tenant_firm on transmittal_drafts(tenant_id, firm_id);

-- Private-network marketplace listings. Written by createMarketplaceListingRecord()'s
-- `insert into marketplace_listings (id, tenant_id, firm_id, service_pack_id, listing_scope, title,
-- description, qualification_requirements, commercial_model, visibility, status, created_at,
-- updated_at) values (...)`. Note: unlike most tables here, readRelationalStore()'s select list has
-- no metadata column for this table.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- marketplace_listings was already created by 0007_marketplace_network_layer.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries marketplace_listings using the OLD,
-- bespoke named-column schema from 0007_marketplace_network_layer.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for marketplace_listings removed here -- it never took effect; the live
-- table is the one from 0007_marketplace_network_layer.sql. Indexes below are real and kept.)

create index if not exists idx_marketplace_listings_tenant_firm on marketplace_listings(tenant_id, firm_id);

-- Trusted-network capacity offers. Written by createCapacityOfferRecord()'s
-- `insert into capacity_offers (id, tenant_id, firm_id, service_pack_id, capacity_type, pce_units,
-- available_from, available_until, jurisdiction_refs, constraints, status, created_at, updated_at)
-- values (...)`. Like marketplace_listings, readRelationalStore()'s select has no metadata column.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- capacity_offers was already created by 0007_marketplace_network_layer.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries capacity_offers using the OLD,
-- bespoke named-column schema from 0007_marketplace_network_layer.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for capacity_offers removed here -- it never took effect; the live
-- table is the one from 0007_marketplace_network_layer.sql. Indexes below are real and kept.)

create index if not exists idx_capacity_offers_tenant_firm on capacity_offers(tenant_id, firm_id);

-- Trusted-network collaboration requests between firms. Written by createCollaborationRequestRecord()
-- and, separately, by createDirectoryEnquiryCollaborationRequestRecord()'s
-- `insert into collaboration_requests (id, tenant_id, requesting_firm_id, provider_firm_id,
-- service_pack_id, project_id, capacity_offer_id, request_summary, data_room_policy, status,
-- created_at, updated_at, metadata) values (...)`. No single firm_id column: this table is scoped by
-- requesting_firm_id/provider_firm_id instead.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- collaboration_requests was already created by 0007_marketplace_network_layer.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries collaboration_requests using the OLD,
-- bespoke named-column schema from 0007_marketplace_network_layer.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for collaboration_requests removed here -- it never took effect; the live
-- table is the one from 0007_marketplace_network_layer.sql. Indexes below are real and kept.)

create index if not exists idx_collaboration_requests_tenant_requesting_firm on collaboration_requests(tenant_id, requesting_firm_id);

-- Trusted-network professional profiles. Written by createNetworkProfessionalProfileRecord()'s
-- `insert into network_professional_profiles (...) values (...)`; person_id, professional_profile_id
-- and created_by_actor_id are uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- network_professional_profiles was already created by 0018_trusted_network_profiles.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries network_professional_profiles using the OLD,
-- bespoke named-column schema from 0018_trusted_network_profiles.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for network_professional_profiles removed here -- it never took effect; the live
-- table is the one from 0018_trusted_network_profiles.sql. Indexes below are real and kept.)

create index if not exists idx_network_professional_profiles_tenant_firm on network_professional_profiles(tenant_id, firm_id);

-- Trusted-network firm profiles. Written by createNetworkFirmProfileRecord()'s
-- `insert into network_firm_profiles (...) values (...)`; created_by_actor_id is uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- network_firm_profiles was already created by 0018_trusted_network_profiles.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries network_firm_profiles using the OLD,
-- bespoke named-column schema from 0018_trusted_network_profiles.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for network_firm_profiles removed here -- it never took effect; the live
-- table is the one from 0018_trusted_network_profiles.sql. Indexes below are real and kept.)

create index if not exists idx_network_firm_profiles_tenant_firm on network_firm_profiles(tenant_id, firm_id);

-- Trusted-network capabilities offered by a professional or firm network profile. Written by
-- createNetworkCapabilityRecord()'s `insert into network_capabilities (...) values (...)`;
-- professional_network_profile_id, firm_network_profile_id and created_by_actor_id are
-- uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- network_capabilities was already created by 0018_trusted_network_profiles.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries network_capabilities using the OLD,
-- bespoke named-column schema from 0018_trusted_network_profiles.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for network_capabilities removed here -- it never took effect; the live
-- table is the one from 0018_trusted_network_profiles.sql. Indexes below are real and kept.)

create index if not exists idx_network_capabilities_tenant_firm on network_capabilities(tenant_id, firm_id);

-- Trusted-network credential evidence (never grants professional authority). Written by
-- createNetworkCredentialRecord()'s `insert into network_credentials (...) values (...)`;
-- professional_network_profile_id, verified_by_actor_id and created_by_actor_id are
-- uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- network_credentials was already created by 0018_trusted_network_profiles.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries network_credentials using the OLD,
-- bespoke named-column schema from 0018_trusted_network_profiles.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for network_credentials removed here -- it never took effect; the live
-- table is the one from 0018_trusted_network_profiles.sql. Indexes below are real and kept.)

create index if not exists idx_network_credentials_tenant_firm on network_credentials(tenant_id, firm_id);

-- Trusted-network conflict checks performed before an invitation. Written by
-- createNetworkConflictCheckRecord()'s `insert into network_conflict_checks (...) values (...)`;
-- subject_profile_id and checked_by_actor_id are uuidOrNull()-wrapped. subject_profile_id is
-- polymorphic (a network_professional_profiles or network_firm_profiles id) so it is left as a plain
-- uuid with no FK.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- network_conflict_checks was already created by 0019_network_qualification_conflict_gate.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries network_conflict_checks using the OLD,
-- bespoke named-column schema from 0019_network_qualification_conflict_gate.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for network_conflict_checks removed here -- it never took effect; the live
-- table is the one from 0019_network_qualification_conflict_gate.sql. Indexes below are real and kept.)

create index if not exists idx_network_conflict_checks_tenant_requesting_firm on network_conflict_checks(tenant_id, requesting_firm_id);

-- Trusted-network qualification gate evaluations, gating a specialist invitation. Written by
-- createNetworkQualificationGateRecord()'s `insert into network_qualification_gates (...)
-- values (...)`; professional_network_profile_id, firm_network_profile_id, capability_id,
-- credential_id, conflict_check_id and created_by_actor_id are all uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- network_qualification_gates was already created by 0019_network_qualification_conflict_gate.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries network_qualification_gates using the OLD,
-- bespoke named-column schema from 0019_network_qualification_conflict_gate.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for network_qualification_gates removed here -- it never took effect; the live
-- table is the one from 0019_network_qualification_conflict_gate.sql. Indexes below are real and kept.)

create index if not exists idx_network_qualification_gates_tenant_requesting_firm on network_qualification_gates(tenant_id, requesting_firm_id);

-- Trusted-network trust signals (never substitute for a credential). Written by
-- createNetworkTrustSignalRecord()'s `insert into network_trust_signals (...) values (...)`;
-- subject_id and created_by_actor_id are uuidOrNull()-wrapped. subject_id is polymorphic so left as
-- a plain uuid with no FK.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- network_trust_signals was already created by 0018_trusted_network_profiles.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries network_trust_signals using the OLD,
-- bespoke named-column schema from 0018_trusted_network_profiles.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for network_trust_signals removed here -- it never took effect; the live
-- table is the one from 0018_trusted_network_profiles.sql. Indexes below are real and kept.)

create index if not exists idx_network_trust_signals_tenant_firm on network_trust_signals(tenant_id, firm_id);

-- ME-S3 private qualified-directory review board decisions. Written by
-- createDirectoryReviewBoardDecisionRecord()'s `insert into directory_review_board_decisions (...)
-- values (...)`; qualification_gate_id and decided_by_actor_id are uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- directory_review_board_decisions was already created by 0023_me_s4_directory_sql_persistence.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries directory_review_board_decisions using the OLD,
-- bespoke named-column schema from 0023_me_s4_directory_sql_persistence.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for directory_review_board_decisions removed here -- it never took effect; the live
-- table is the one from 0023_me_s4_directory_sql_persistence.sql. Indexes below are real and kept.)

create index if not exists idx_directory_review_board_decisions_tenant_provider_firm on directory_review_board_decisions(tenant_id, provider_firm_id);

-- ME-S3 private directory enquiries (manual-review-only, never auto-matched). Written by
-- createPrivateDirectoryEnquiryRecord()'s `insert into directory_private_enquiries (...)
-- values (...)`; created_by_actor_id is uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- directory_private_enquiries was already created by 0023_me_s4_directory_sql_persistence.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries directory_private_enquiries using the OLD,
-- bespoke named-column schema from 0023_me_s4_directory_sql_persistence.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for directory_private_enquiries removed here -- it never took effect; the live
-- table is the one from 0023_me_s4_directory_sql_persistence.sql. Indexes below are real and kept.)

create index if not exists idx_directory_private_enquiries_tenant_requesting_firm on directory_private_enquiries(tenant_id, requesting_firm_id);

-- Qualification renewal / expiry reviews for a published private directory listing. Written by
-- createQualificationRenewalReviewRecord()'s `insert into qualification_renewal_reviews (...)
-- values (...)`; credential_id and reviewed_by_actor_id are uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- qualification_renewal_reviews was already created by 0023_me_s4_directory_sql_persistence.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries qualification_renewal_reviews using the OLD,
-- bespoke named-column schema from 0023_me_s4_directory_sql_persistence.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for qualification_renewal_reviews removed here -- it never took effect; the live
-- table is the one from 0023_me_s4_directory_sql_persistence.sql. Indexes below are real and kept.)

create index if not exists idx_qualification_renewal_reviews_tenant_provider_firm on qualification_renewal_reviews(tenant_id, provider_firm_id);

-- Specialist invitations, gated on a passed qualification gate. Written by
-- createSpecialistInvitationRecord()'s `insert into specialist_invitations (...) values (...)`;
-- qualification_gate_id, capability_id and invited_by_actor_id are uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- specialist_invitations was already created by 0019_network_qualification_conflict_gate.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries specialist_invitations using the OLD,
-- bespoke named-column schema from 0019_network_qualification_conflict_gate.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for specialist_invitations removed here -- it never took effect; the live
-- table is the one from 0019_network_qualification_conflict_gate.sql. Indexes below are real and kept.)

create index if not exists idx_specialist_invitations_tenant_requesting_firm on specialist_invitations(tenant_id, requesting_firm_id);

-- Scoped trusted collaboration workspaces opened from a qualified specialist invitation. Written by
-- createCollaborationWorkspaceRecord()'s `insert into collaboration_workspaces (...) values (...)`;
-- specialist_invitation_id, qualification_gate_id and created_by_actor_id are uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- collaboration_workspaces was already created by 0020_collaboration_workspace.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries collaboration_workspaces using the OLD,
-- bespoke named-column schema from 0020_collaboration_workspace.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for collaboration_workspaces removed here -- it never took effect; the live
-- table is the one from 0020_collaboration_workspace.sql. Indexes below are real and kept.)

create index if not exists idx_collaboration_workspaces_tenant_requesting_firm on collaboration_workspaces(tenant_id, requesting_firm_id);

-- Per-firm access grants into a collaboration workspace. Written by
-- grantCollaborationWorkspaceParticipantRecord()'s
-- `insert into collaboration_workspace_participants (...) values (...)`; workspace_id, actor_id,
-- granted_by_actor_id and revoked_by_actor_id are uuidOrNull()-wrapped; firm_id is passed unwrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- collaboration_workspace_participants was already created by 0020_collaboration_workspace.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries collaboration_workspace_participants using the OLD,
-- bespoke named-column schema from 0020_collaboration_workspace.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for collaboration_workspace_participants removed here -- it never took effect; the live
-- table is the one from 0020_collaboration_workspace.sql. Indexes below are real and kept.)

create index if not exists idx_collaboration_workspace_participants_tenant_firm on collaboration_workspace_participants(tenant_id, firm_id);

-- Workspace-scoped evidence references added by a participant. Written by
-- addCollaborationWorkspaceEvidenceRecord()'s `insert into collaboration_workspace_evidence (...)
-- values (...)`; workspace_id, participant_id and added_by_actor_id are uuidOrNull()-wrapped. No
-- firm_id column (scoped only via workspace_id/participant_id).
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- collaboration_workspace_evidence was already created by 0020_collaboration_workspace.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries collaboration_workspace_evidence using the OLD,
-- bespoke named-column schema from 0020_collaboration_workspace.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for collaboration_workspace_evidence removed here -- it never took effect; the live
-- table is the one from 0020_collaboration_workspace.sql. Indexes below are real and kept.)

create index if not exists idx_collaboration_workspace_evidence_tenant_workspace on collaboration_workspace_evidence(tenant_id, workspace_id);

-- Responsibility / approval matrices governing a collaboration workspace. Written by
-- createResponsibilityMatrixRecord()'s `insert into responsibility_matrices (...) values (...)`;
-- workspace_id, responsible_professional_actor_id, reviewer_actor_id, approver_actor_id and
-- created_by_actor_id are uuidOrNull()-wrapped; the three firm ids are passed unwrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- responsibility_matrices was already created by 0021_responsibility_matrix.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries responsibility_matrices using the OLD,
-- bespoke named-column schema from 0021_responsibility_matrix.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for responsibility_matrices removed here -- it never took effect; the live
-- table is the one from 0021_responsibility_matrix.sql. Indexes below are real and kept.)

create index if not exists idx_responsibility_matrices_tenant_requesting_firm on responsibility_matrices(tenant_id, requesting_firm_id);

-- Specialist work assignments delivered under an active responsibility matrix. Written by
-- persistSpecialistAssignmentPostgres()'s `insert into specialist_assignments (...) on conflict (id)
-- do update set assignment_status=..., ...`; workspace_id, responsibility_matrix_id and every
-- *_by_actor_id column are uuidOrNull()-wrapped. There is no created_at column here; requested_at is
-- the row's creation timestamp (matching the select's `order by requested_at, id`).
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- specialist_assignments was already created by 0022_specialist_assignment_delivery_loop.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries specialist_assignments using the OLD,
-- bespoke named-column schema from 0022_specialist_assignment_delivery_loop.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for specialist_assignments removed here -- it never took effect; the live
-- table is the one from 0022_specialist_assignment_delivery_loop.sql. Indexes below are real and kept.)

create index if not exists idx_specialist_assignments_tenant_requesting_firm on specialist_assignments(tenant_id, requesting_firm_id);

-- Privacy-safe cross-tenant/firm observatory metric snapshots. Written by
-- createObservatorySnapshotRecord()'s `insert into observatory_snapshots (id, tenant_id, firm_id,
-- snapshot_scope, metrics, privacy_class, generated_at) values (...)`; both tenant_id and firm_id are
-- uuidOrNull()-wrapped, so unlike most tables here tenant_id itself is nullable (a snapshot can be
-- platform-wide, scoped to no single tenant).
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- observatory_snapshots was already created by 0007_marketplace_network_layer.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries observatory_snapshots using the OLD,
-- bespoke named-column schema from 0007_marketplace_network_layer.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for observatory_snapshots removed here -- it never took effect; the live
-- table is the one from 0007_marketplace_network_layer.sql. Indexes below are real and kept.)

create index if not exists idx_observatory_snapshots_tenant_firm on observatory_snapshots(tenant_id, firm_id);

-- Pilot program user identities. Written by invitePilotUserRecord()'s
-- `insert into pilot_users (...) values (...)`; firm_id, person_id and actor_id are all
-- uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- pilot_users was already created by 0008_pilot_user_management.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries pilot_users using the OLD,
-- bespoke named-column schema from 0008_pilot_user_management.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for pilot_users removed here -- it never took effect; the live
-- table is the one from 0008_pilot_user_management.sql. Indexes below are real and kept.)

create index if not exists idx_pilot_users_tenant_firm on pilot_users(tenant_id, firm_id);

-- Commercial-domain AI worker skill bindings (same shape as administration_skill_bindings). Written
-- by persistCommercialOperationsFromStore()'s `insert into commercial_skill_bindings (...) on
-- conflict (id) do update set status=..., metadata=...`.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- commercial_skill_bindings was already created by 0018_sf_s4_sales_proposals_accounts.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries commercial_skill_bindings using the OLD,
-- bespoke named-column schema from 0018_sf_s4_sales_proposals_accounts.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for commercial_skill_bindings removed here -- it never took effect; the live
-- table is the one from 0018_sf_s4_sales_proposals_accounts.sql. Indexes below are real and kept.)

create index if not exists idx_commercial_skill_bindings_tenant_firm on commercial_skill_bindings(tenant_id, firm_id);

-- Sales/CRM pipeline opportunity records. Written by persistCommercialOperationsFromStore()'s
-- `insert into sales_pipeline_records (...) on conflict (id) do update set proposal_id=..., ...`;
-- enquiry_id, relationship_id, intake_session_id, proposal_id and owner_actor_id are all
-- uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- sales_pipeline_records was already created by 0018_sf_s4_sales_proposals_accounts.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries sales_pipeline_records using the OLD,
-- bespoke named-column schema from 0018_sf_s4_sales_proposals_accounts.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for sales_pipeline_records removed here -- it never took effect; the live
-- table is the one from 0018_sf_s4_sales_proposals_accounts.sql. Indexes below are real and kept.)

create index if not exists idx_sales_pipeline_records_tenant_firm on sales_pipeline_records(tenant_id, firm_id);

-- Proposal dispatch (send) log. Written by persistCommercialOperationsFromStore()'s
-- `insert into proposal_dispatch_records (...) on conflict (id) do nothing`; every column, including
-- the foreign keys, is passed unwrapped (no uuidOrNull calls at all in this particular insert).
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- proposal_dispatch_records was already created by 0018_sf_s4_sales_proposals_accounts.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries proposal_dispatch_records using the OLD,
-- bespoke named-column schema from 0018_sf_s4_sales_proposals_accounts.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for proposal_dispatch_records removed here -- it never took effect; the live
-- table is the one from 0018_sf_s4_sales_proposals_accounts.sql. Indexes below are real and kept.)

create index if not exists idx_proposal_dispatch_records_tenant_firm on proposal_dispatch_records(tenant_id, firm_id);

-- Firm expense records. Written by persistCommercialOperationsFromStore()'s
-- `insert into expense_records (...) on conflict (id) do update set status=..., ...`; project_id,
-- prepared_by_actor_id and approved_by_actor_id are uuidOrNull()-wrapped; payment_instruction_ref is
-- always inserted as literal null in this path (not yet wired to a payment instruction).
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- expense_records was already created by 0018_sf_s4_sales_proposals_accounts.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries expense_records using the OLD,
-- bespoke named-column schema from 0018_sf_s4_sales_proposals_accounts.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for expense_records removed here -- it never took effect; the live
-- table is the one from 0018_sf_s4_sales_proposals_accounts.sql. Indexes below are real and kept.)

create index if not exists idx_expense_records_tenant_firm on expense_records(tenant_id, firm_id);

-- Receivable (accounts receivable) chase/follow-up drafts. Written by
-- persistCommercialOperationsFromStore()'s `insert into receivable_follow_ups (...) on conflict (id)
-- do update set subject=..., message_body=..., status=..., ...`; invoice_id is passed unwrapped (not
-- null); requires_human_review is always inserted as literal `true`.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- receivable_follow_ups was already created by 0018_sf_s4_sales_proposals_accounts.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries receivable_follow_ups using the OLD,
-- bespoke named-column schema from 0018_sf_s4_sales_proposals_accounts.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for receivable_follow_ups removed here -- it never took effect; the live
-- table is the one from 0018_sf_s4_sales_proposals_accounts.sql. Indexes below are real and kept.)

create index if not exists idx_receivable_follow_ups_tenant_firm on receivable_follow_ups(tenant_id, firm_id);

-- Customer support cases. Written by createSupportCaseRecord()'s
-- `insert into support_cases (...) values (...)`; firm_id, opened_by_actor_id and
-- related_pilot_user_id are uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- support_cases was already created by 0009_support_desk_controls.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries support_cases using the OLD,
-- bespoke named-column schema from 0009_support_desk_controls.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for support_cases removed here -- it never took effect; the live
-- table is the one from 0009_support_desk_controls.sql. Indexes below are real and kept.)

create index if not exists idx_support_cases_tenant_firm on support_cases(tenant_id, firm_id);

-- Technical-domain AI worker skill bindings (same shape as administration_skill_bindings). Written
-- by persistTechnicalDeliveryFromStore()'s `insert into technical_skill_bindings (...) on conflict
-- (id) do update set status=..., metadata=...`.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- technical_skill_bindings was already created by 0019_sf_s5_technical_drawing_delivery_support.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries technical_skill_bindings using the OLD,
-- bespoke named-column schema from 0019_sf_s5_technical_drawing_delivery_support.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for technical_skill_bindings removed here -- it never took effect; the live
-- table is the one from 0019_sf_s5_technical_drawing_delivery_support.sql. Indexes below are real and kept.)

create index if not exists idx_technical_skill_bindings_tenant_firm on technical_skill_bindings(tenant_id, firm_id);

-- Drawing revision QA/comparison review records. Written by persistTechnicalDeliveryFromStore()'s
-- `insert into drawing_review_records (...) on conflict (id) do update set check_results=...,
-- status=..., metadata=...`; only prepared_by_actor_id is uuidOrNull()-wrapped in this insert;
-- requires_professional_review is always inserted as literal `true`.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- drawing_review_records was already created by 0019_sf_s5_technical_drawing_delivery_support.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries drawing_review_records using the OLD,
-- bespoke named-column schema from 0019_sf_s5_technical_drawing_delivery_support.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for drawing_review_records removed here -- it never took effect; the live
-- table is the one from 0019_sf_s5_technical_drawing_delivery_support.sql. Indexes below are real and kept.)

create index if not exists idx_drawing_review_records_tenant_firm on drawing_review_records(tenant_id, firm_id);

-- Engineering calculation input sets. Written by persistTechnicalDeliveryFromStore()'s
-- `insert into calculation_input_sets (...) on conflict (id) do update set input_values=...,
-- validation_results=..., validation_status=..., updated_at=..., metadata=...`; intake_session_id
-- and prepared_by_actor_id are uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- calculation_input_sets was already created by 0019_sf_s5_technical_drawing_delivery_support.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries calculation_input_sets using the OLD,
-- bespoke named-column schema from 0019_sf_s5_technical_drawing_delivery_support.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for calculation_input_sets removed here -- it never took effect; the live
-- table is the one from 0019_sf_s5_technical_drawing_delivery_support.sql. Indexes below are real and kept.)

create index if not exists idx_calculation_input_sets_tenant_firm on calculation_input_sets(tenant_id, firm_id);

-- Technical QA findings raised against a project deliverable. Written by
-- persistTechnicalDeliveryFromStore()'s `insert into technical_qa_findings (...) on conflict (id) do
-- update set status=..., resolved_by_actor_id=..., ...`; raised_by_actor_id and resolved_by_actor_id
-- are uuidOrNull()-wrapped. subject_id is polymorphic (the finding's subject varies by
-- subject_type), so it is left as a plain uuid with no FK.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- technical_qa_findings was already created by 0019_sf_s5_technical_drawing_delivery_support.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries technical_qa_findings using the OLD,
-- bespoke named-column schema from 0019_sf_s5_technical_drawing_delivery_support.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for technical_qa_findings removed here -- it never took effect; the live
-- table is the one from 0019_sf_s5_technical_drawing_delivery_support.sql. Indexes below are real and kept.)

create index if not exists idx_technical_qa_findings_tenant_firm on technical_qa_findings(tenant_id, firm_id);

-- Client delivery package records bundling drawings, calculations and QA sign-off. Written by
-- persistTechnicalDeliveryFromStore()'s `insert into delivery_package_records (...) on conflict (id)
-- do update set qa_finding_refs=..., readiness_checks=..., package_status=..., ...`;
-- prepared_by_actor_id, professional_approval_id and issued_document_version_id are
-- uuidOrNull()-wrapped; requires_professional_review is always inserted as literal `true`.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- delivery_package_records was already created by 0019_sf_s5_technical_drawing_delivery_support.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries delivery_package_records using the OLD,
-- bespoke named-column schema from 0019_sf_s5_technical_drawing_delivery_support.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for delivery_package_records removed here -- it never took effect; the live
-- table is the one from 0019_sf_s5_technical_drawing_delivery_support.sql. Indexes below are real and kept.)

create index if not exists idx_delivery_package_records_tenant_firm on delivery_package_records(tenant_id, firm_id);

-- Pilot program operational incidents. Written by createPilotIncidentRecord()'s
-- `insert into pilot_incidents (...) values (...)`; firm_id, support_case_id, project_id and
-- opened_by_actor_id are all uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- pilot_incidents was already created by 0010_pilot_observability_incidents.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries pilot_incidents using the OLD,
-- bespoke named-column schema from 0010_pilot_observability_incidents.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for pilot_incidents removed here -- it never took effect; the live
-- table is the one from 0010_pilot_observability_incidents.sql. Indexes below are real and kept.)

create index if not exists idx_pilot_incidents_tenant_firm on pilot_incidents(tenant_id, firm_id);

-- Pilot user feedback submissions. Written by createPilotFeedbackRecord()'s
-- `insert into pilot_feedback (...) values (...)`; firm_id, pilot_user_id, project_id and
-- submitted_by_actor_id are all uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- pilot_feedback was already created by 0011_pilot_feedback_improvement_loop.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries pilot_feedback using the OLD,
-- bespoke named-column schema from 0011_pilot_feedback_improvement_loop.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for pilot_feedback removed here -- it never took effect; the live
-- table is the one from 0011_pilot_feedback_improvement_loop.sql. Indexes below are real and kept.)

create index if not exists idx_pilot_feedback_tenant_firm on pilot_feedback(tenant_id, firm_id);

-- Pilot acceptance review decisions. Written by createPilotAcceptanceReviewRecord()'s
-- `insert into pilot_acceptance_reviews (...) values (...)`; firm_id and reviewed_by_actor_id are
-- uuidOrNull()-wrapped.
create table if not exists pilot_acceptance_reviews (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  reviewed_by_actor_id uuid references actors(id),
  review_scope text not null default 'FORMWORK_PILOT',
  criteria jsonb not null default '[]',
  decision text not null default 'PENDING',
  evidence_refs jsonb not null default '[]',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_pilot_acceptance_reviews_tenant_firm on pilot_acceptance_reviews(tenant_id, firm_id);

-- Pilot improvement backlog items. Written by createPilotImprovementItemRecord()'s
-- `insert into pilot_improvement_items (...) values (...)`; firm_id, feedback_id,
-- acceptance_review_id and owner_actor_id are all uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- pilot_improvement_items was already created by 0011_pilot_feedback_improvement_loop.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries pilot_improvement_items using the OLD,
-- bespoke named-column schema from 0011_pilot_feedback_improvement_loop.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for pilot_improvement_items removed here -- it never took effect; the live
-- table is the one from 0011_pilot_feedback_improvement_loop.sql. Indexes below are real and kept.)

create index if not exists idx_pilot_improvement_items_tenant_firm on pilot_improvement_items(tenant_id, firm_id);

-- Generated pilot report packs (feedback/incidents/support/reviews summary). Written by
-- createPilotReportPackRecord()'s `insert into pilot_report_packs (...) values (...)`; firm_id and
-- generated_by_actor_id are uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- pilot_report_packs was already created by 0012_pilot_reporting_review_board.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries pilot_report_packs using the OLD,
-- bespoke named-column schema from 0012_pilot_reporting_review_board.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for pilot_report_packs removed here -- it never took effect; the live
-- table is the one from 0012_pilot_reporting_review_board.sql. Indexes below are real and kept.)

create index if not exists idx_pilot_report_packs_tenant_firm on pilot_report_packs(tenant_id, firm_id);

-- Stakeholder review boards convened over a pilot report pack. Written by
-- createStakeholderReviewBoardRecord()'s `insert into stakeholder_review_boards (...) values (...)`;
-- firm_id, report_pack_id and chaired_by_actor_id are uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- stakeholder_review_boards was already created by 0012_pilot_reporting_review_board.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries stakeholder_review_boards using the OLD,
-- bespoke named-column schema from 0012_pilot_reporting_review_board.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for stakeholder_review_boards removed here -- it never took effect; the live
-- table is the one from 0012_pilot_reporting_review_board.sql. Indexes below are real and kept.)

create index if not exists idx_stakeholder_review_boards_tenant_firm on stakeholder_review_boards(tenant_id, firm_id);

-- Decisions recorded by a stakeholder review board. Written by
-- createStakeholderReviewDecisionRecord()'s `insert into stakeholder_review_decisions (...)
-- values (...)` (run inside an explicit transaction alongside closing the board); board_id is passed
-- unwrapped (not null); firm_id and decided_by_actor_id are uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- stakeholder_review_decisions was already created by 0012_pilot_reporting_review_board.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries stakeholder_review_decisions using the OLD,
-- bespoke named-column schema from 0012_pilot_reporting_review_board.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for stakeholder_review_decisions removed here -- it never took effect; the live
-- table is the one from 0012_pilot_reporting_review_board.sql. Indexes below are real and kept.)

create index if not exists idx_stakeholder_review_decisions_tenant_firm on stakeholder_review_decisions(tenant_id, firm_id);

-- Controlled pilot expansion cohorts approved by a stakeholder review decision. Written by
-- createPilotExpansionCohortRecord()'s `insert into pilot_expansion_cohorts (...) values (...)`;
-- firm_id, stakeholder_decision_id and created_by_actor_id are uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- pilot_expansion_cohorts was already created by 0013_controlled_pilot_expansion_rc_governance.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries pilot_expansion_cohorts using the OLD,
-- bespoke named-column schema from 0013_controlled_pilot_expansion_rc_governance.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for pilot_expansion_cohorts removed here -- it never took effect; the live
-- table is the one from 0013_controlled_pilot_expansion_rc_governance.sql. Indexes below are real and kept.)

create index if not exists idx_pilot_expansion_cohorts_tenant_firm on pilot_expansion_cohorts(tenant_id, firm_id);

-- Tenant onboarding plans tied to an expansion cohort. Written by
-- createTenantOnboardingPlanRecord()'s `insert into tenant_onboarding_plans (...) values (...)`;
-- firm_id, expansion_cohort_id and assigned_operator_actor_id are uuidOrNull()-wrapped.
create table if not exists tenant_onboarding_plans (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  expansion_cohort_id uuid references pilot_expansion_cohorts(id),
  assigned_operator_actor_id uuid references actors(id),
  onboarding_status text not null default 'DRAFT',
  onboarding_steps jsonb not null default '[]',
  readiness_checks jsonb not null default '[]',
  target_start_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb not null default '{}'
);

create index if not exists idx_tenant_onboarding_plans_tenant_firm on tenant_onboarding_plans(tenant_id, firm_id);

-- Release candidate governance gates for an expansion cohort. Written by
-- createReleaseCandidateGateRecord()'s `insert into release_candidate_gates (...) values (...)`;
-- firm_id, expansion_cohort_id and reviewed_by_actor_id are uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- release_candidate_gates was already created by 0013_controlled_pilot_expansion_rc_governance.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries release_candidate_gates using the OLD,
-- bespoke named-column schema from 0013_controlled_pilot_expansion_rc_governance.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for release_candidate_gates removed here -- it never took effect; the live
-- table is the one from 0013_controlled_pilot_expansion_rc_governance.sql. Indexes below are real and kept.)

create index if not exists idx_release_candidate_gates_tenant_firm on release_candidate_gates(tenant_id, firm_id);

-- Tenant-level pilot usage controls (limits, billing readiness). Written by
-- createTenantPilotControlRecord()'s `insert into tenant_pilot_controls (...) values (...)`; firm_id
-- and created_by_actor_id are uuidOrNull()-wrapped.
create table if not exists tenant_pilot_controls (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  created_by_actor_id uuid references actors(id),
  control_status text not null default 'ACTIVE',
  plan_code text not null default 'PILOT_FREE_CONTROLLED',
  limits jsonb not null default '{}',
  billing_readiness text not null default 'NOT_READY',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_tenant_pilot_controls_tenant_firm on tenant_pilot_controls(tenant_id, firm_id);

-- Tenant usage metering events. Written by recordTenantUsageEventRecord()'s
-- `insert into tenant_usage_events (...) values (...)`; firm_id and actor_id are
-- uuidOrNull()-wrapped.
create table if not exists tenant_usage_events (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  actor_id uuid references actors(id),
  usage_type text not null,
  quantity numeric not null default 1,
  unit text not null default 'event',
  source_ref text,
  recorded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_tenant_usage_events_tenant_firm on tenant_usage_events(tenant_id, firm_id);

-- Billing readiness review decisions. Written by createBillingReadinessReviewRecord()'s
-- `insert into billing_readiness_reviews (...) values (...)`; firm_id and reviewed_by_actor_id are
-- uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- billing_readiness_reviews was already created by 0014_multi_tenant_usage_billing_readiness.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries billing_readiness_reviews using the OLD,
-- bespoke named-column schema from 0014_multi_tenant_usage_billing_readiness.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for billing_readiness_reviews removed here -- it never took effect; the live
-- table is the one from 0014_multi_tenant_usage_billing_readiness.sql. Indexes below are real and kept.)

create index if not exists idx_billing_readiness_reviews_tenant_firm on billing_readiness_reviews(tenant_id, firm_id);

-- Payment provider configuration records. Written by createPaymentProviderConfigRecord()'s
-- `insert into payment_provider_configs (...) values (...)`; firm_id and configured_by_actor_id are
-- uuidOrNull()-wrapped.
create table if not exists payment_provider_configs (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  configured_by_actor_id uuid references actors(id),
  provider_name text not null default 'stripe',
  provider_mode text not null default 'test',
  config_status text not null default 'DRAFT',
  capabilities jsonb not null default '[]',
  required_env jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_payment_provider_configs_tenant_firm on payment_provider_configs(tenant_id, firm_id);

-- Subscription package definitions. Written by createSubscriptionPackageRecord()'s
-- `insert into subscription_packages (...) values (...)`; firm_id and created_by_actor_id are
-- uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- subscription_packages was already created by 0015_payment_subscription_commercial_launch.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries subscription_packages using the OLD,
-- bespoke named-column schema from 0015_payment_subscription_commercial_launch.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for subscription_packages removed here -- it never took effect; the live
-- table is the one from 0015_payment_subscription_commercial_launch.sql. Indexes below are real and kept.)

create index if not exists idx_subscription_packages_tenant_firm on subscription_packages(tenant_id, firm_id);

-- Commercial launch readiness controls, tying together a payment provider config and a subscription
-- package. Written by createCommercialLaunchControlRecord()'s
-- `insert into commercial_launch_controls (...) values (...)`; firm_id, payment_provider_config_id,
-- subscription_package_id and reviewed_by_actor_id are all uuidOrNull()-wrapped.
create table if not exists commercial_launch_controls (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  payment_provider_config_id uuid references payment_provider_configs(id),
  subscription_package_id uuid references subscription_packages(id),
  reviewed_by_actor_id uuid references actors(id),
  launch_status text not null default 'BLOCKED',
  required_controls jsonb not null default '[]',
  decision_summary text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  metadata jsonb not null default '{}'
);

create index if not exists idx_commercial_launch_controls_tenant_firm on commercial_launch_controls(tenant_id, firm_id);

-- Pilot-to-production handoff acceptance records. Written by persistPilotHandoffFromStore()'s
-- `insert into pilot_handoff_records (...) on conflict (id) do update set handoff_status=...,
-- checklist=..., evidence_refs=..., decision_summary=..., metadata=...`; firm_id is passed unwrapped
-- (not null) in this insert; accepted_by_actor_id is uuidOrNull()-wrapped.
-- NOTE (verified 2026-09-24): this declaration is INERT / dead code.
-- pilot_handoff_records was already created by 0020_sf_s6_daily_operations_pilot_handoff.sql, which runs earlier (alphabetical filename
-- order) and already exists by the time this migration runs, so this
-- 'create table if not exists' silently does nothing here -- the table below never
-- takes effect. Confirmed live: apps/api/src/store.mjs queries pilot_handoff_records using the OLD,
-- bespoke named-column schema from 0020_sf_s6_daily_operations_pilot_handoff.sql, not this generic shape. Do NOT
-- 'fix' this collision the way the firm-factory tables were fixed in 0024_zzz -- doing so
-- would replace the live, app-matching table with an empty one the app cannot read.
-- Left in place only for historical record; safe to delete in a future cleanup migration.
-- (create table statement for pilot_handoff_records removed here -- it never took effect; the live
-- table is the one from 0020_sf_s6_daily_operations_pilot_handoff.sql. Indexes below are real and kept.)

create index if not exists idx_pilot_handoff_records_tenant_firm on pilot_handoff_records(tenant_id, firm_id);
