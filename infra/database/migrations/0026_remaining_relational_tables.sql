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
create table if not exists worker_templates (
  id uuid primary key,
  code text not null unique,
  name text not null,
  version text not null default '1.0',
  default_tools jsonb not null default '[]',
  default_budget jsonb not null default '{}',
  risk_envelope jsonb not null default '{}',
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Global service pack catalog. No insert or object-construction call for this table exists anywhere
-- in store.mjs (it is populated out-of-band); schema inferred from readRelationalStore()'s
-- `select id::text, code, name, discipline, status, version, description, configuration, created_at,
-- updated_at from service_packs`.
create table if not exists service_packs (
  id uuid primary key,
  code text not null unique,
  name text not null,
  discipline text,
  status text not null default 'ACTIVE',
  version integer not null default 1,
  description text,
  configuration jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Global service SKU catalog under a service pack. Like service_packs, no insert or
-- object-construction call exists in store.mjs; schema inferred from readRelationalStore()'s
-- `select id::text, service_pack_id::text, code, name, status, pricing_model, created_at,
-- updated_at from service_skus`. pricing_model is a free-text label (see subscription_packages
-- and other pricing_model columns below, all populated with plain strings, never JSON).
create table if not exists service_skus (
  id uuid primary key,
  service_pack_id uuid references service_packs(id),
  code text not null,
  name text not null,
  status text not null default 'ACTIVE',
  pricing_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- AI worker (agent) instances. Written by provisionWorkerInstanceRecord() with a plain
-- `insert into worker_instances (id, tenant_id, firm_id, worker_template_id, actor_id, name,
-- assigned_services, tool_allowlist, budget_envelope, risk_limits, runtime_status, created_at,
-- updated_at) values (...)`; all foreign keys are passed unwrapped (never uuidOrNull), so tenant_id,
-- firm_id, worker_template_id and actor_id are all required.
create table if not exists worker_instances (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  worker_template_id uuid not null references worker_templates(id),
  actor_id uuid not null references actors(id),
  name text not null,
  assigned_services jsonb not null default '[]',
  tool_allowlist jsonb not null default '[]',
  budget_envelope jsonb not null default '{}',
  risk_limits jsonb not null default '{}',
  runtime_status text not null default 'PROVISIONED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_worker_instances_tenant_firm on worker_instances(tenant_id, firm_id);

-- Outputs an AI worker produces against a task. Written by produceTaskOutputRecord()'s
-- `insert into task_outputs (id, tenant_id, firm_id, project_id, task_id, worker_instance_id,
-- output_ref, output_schema_ref, evidence_refs, quality_flags, requires_human_review, status,
-- created_at) values (...)`; tenant_id/firm_id/task_id/worker_instance_id are all passed unwrapped.
create table if not exists task_outputs (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  project_id uuid references projects(id),
  task_id uuid not null references tasks(id),
  worker_instance_id uuid not null references worker_instances(id),
  output_ref text,
  output_schema_ref text,
  evidence_refs jsonb not null default '[]',
  quality_flags jsonb not null default '[]',
  requires_human_review boolean not null default true,
  status text not null default 'PRODUCED',
  created_at timestamptz not null default now()
);

create index if not exists idx_task_outputs_tenant_firm on task_outputs(tenant_id, firm_id);

-- Tool invocation requests made by an AI worker. Written by requestToolInvocationRecord()'s
-- `insert into tool_invocations (id, tenant_id, firm_id, worker_instance_id, task_id, tool_name,
-- invocation_status, input_summary, output_ref, cost_estimate, created_at, completed_at)
-- values (...)`; task_id is the only foreign key wrapped in uuidOrNull().
create table if not exists tool_invocations (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  worker_instance_id uuid not null references worker_instances(id),
  task_id uuid references tasks(id),
  tool_name text not null,
  invocation_status text not null default 'REQUESTED',
  input_summary text,
  output_ref text,
  cost_estimate numeric not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_tool_invocations_tenant_firm on tool_invocations(tenant_id, firm_id);

-- Firm staff membership records. Written near the top of store.mjs's persistence path with
-- `insert into firm_memberships (id, tenant_id, firm_id, actor_id, person_id, role, permissions,
-- status, created_at, updated_at) values (...)`.
create table if not exists firm_memberships (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  actor_id uuid references actors(id),
  person_id uuid references persons(id),
  role text not null,
  permissions jsonb not null default '[]',
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_firm_memberships_tenant_firm on firm_memberships(tenant_id, firm_id);

-- Front desk enquiry intake records. Written by persistFrontDeskFromStore()'s
-- `insert into front_desk_enquiries (...) on conflict (id) do update set status=..., ...`; every
-- foreign key (assigned_actor_id, client_id, relationship_id, lead_id, intake_session_id) is wrapped
-- in uuidOrNull() and therefore nullable.
create table if not exists front_desk_enquiries (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  source_channel text,
  contact_name text,
  organization_name text,
  contact_email text,
  contact_phone text,
  enquiry_summary text,
  requested_service_hint text,
  urgency text,
  status text not null default 'NEW',
  qualification_reason text,
  consent_or_legal_basis_ref text,
  conflict_check_status text,
  conflict_check_ref text,
  assigned_actor_id uuid references actors(id),
  client_id uuid references clients(id),
  relationship_id uuid references firm_client_relationships(id),
  lead_id uuid references leads(id),
  intake_session_id uuid references intake_sessions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_front_desk_enquiries_tenant_firm on front_desk_enquiries(tenant_id, firm_id);

-- Drafted client communications from front desk enquiries. Written by persistFrontDeskFromStore()'s
-- `insert into client_communication_drafts (...) on conflict (id) do update set ...`; enquiry_id is
-- passed unwrapped (not null), requires_human_review is always inserted as the literal `true`.
create table if not exists client_communication_drafts (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  enquiry_id uuid not null references front_desk_enquiries(id),
  channel text,
  subject text,
  body text,
  status text not null default 'DRAFT',
  requires_human_review boolean not null default true,
  prepared_by_actor_id uuid references actors(id),
  approved_by_actor_id uuid references actors(id),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_client_communication_drafts_tenant_firm on client_communication_drafts(tenant_id, firm_id);

-- Administration-domain AI worker skill bindings. Written by persistAdministrationFromStore()'s
-- `insert into administration_skill_bindings (...) on conflict (id) do update set status=...,
-- metadata=...`; supervisor_actor_id is passed unwrapped in this insert (left nullable here anyway
-- since the column is not required by the rest of the schema).
create table if not exists administration_skill_bindings (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  worker_template_code text,
  role_skill_ref text,
  worker_skill_ref text,
  input_schema_ref text,
  output_schema_ref text,
  supervisor_actor_id uuid references actors(id),
  permissions jsonb not null default '[]',
  forbidden_actions jsonb not null default '[]',
  status text not null default 'ACTIVE',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_administration_skill_bindings_tenant_firm on administration_skill_bindings(tenant_id, firm_id);

-- Correspondence log entries. Written by persistAdministrationFromStore()'s
-- `insert into correspondence_records (...) on conflict (id) do update set status=..., ...`;
-- relationship_id, project_id and owner_actor_id are all uuidOrNull()-wrapped.
create table if not exists correspondence_records (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  relationship_id uuid references firm_client_relationships(id),
  project_id uuid references projects(id),
  direction text,
  channel text,
  subject text,
  correspondent text,
  received_or_drafted_at timestamptz,
  status text not null default 'OPEN',
  owner_actor_id uuid references actors(id),
  response_due_at timestamptz,
  source_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_correspondence_records_tenant_firm on correspondence_records(tenant_id, firm_id);

-- Document register (index of controlled documents per project). Written by
-- persistAdministrationFromStore()'s `insert into document_register_entries (..., current_revision_id,
-- ...) values (..., null, ...) on conflict (id) do update set status=..., ...` -- current_revision_id
-- is always inserted as literal null and only ever backfilled by a later `update ... set
-- current_revision_id=...`; kept here as a plain uuid (no FK) to avoid a circular reference with
-- document_revision_records, which points back at this table (see header comment).
create table if not exists document_register_entries (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  relationship_id uuid references firm_client_relationships(id),
  project_id uuid references projects(id),
  document_number text,
  title text,
  document_type text,
  discipline text,
  classification text,
  status text not null default 'DRAFT',
  current_revision_id uuid, -- circular FK to document_revision_records.id; see header comment, not enforced
  owner_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_document_register_entries_tenant_firm on document_register_entries(tenant_id, firm_id);

-- Individual revisions of a registered document. Written by persistAdministrationFromStore()'s
-- `insert into document_revision_records (...) on conflict (id) do update set status=...,
-- metadata=...`; document_register_entry_id is passed unwrapped (not null), supersedes_revision_id
-- and created_by_actor_id are uuidOrNull()-wrapped.
create table if not exists document_revision_records (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  document_register_entry_id uuid not null references document_register_entries(id),
  revision text,
  version_label text,
  storage_ref text,
  content_hash text,
  status text not null default 'DRAFT',
  supersedes_revision_id uuid references document_revision_records(id),
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_document_revision_records_tenant_firm on document_revision_records(tenant_id, firm_id);

-- Administrative follow-up deadlines. Written by persistAdministrationFromStore()'s
-- `insert into administrative_deadlines (...) on conflict (id) do update set status=..., ...`;
-- project_id, relationship_id and assigned_actor_or_worker_ref are uuidOrNull()-wrapped.
-- assigned_actor_or_worker_ref is polymorphic (an actor OR a worker instance id, mirroring
-- tasks.assigned_actor_or_worker_ref in 0001), so it is left as a plain uuid with no FK.
create table if not exists administrative_deadlines (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  project_id uuid references projects(id),
  relationship_id uuid references firm_client_relationships(id),
  title text,
  due_at timestamptz,
  priority text,
  status text not null default 'OPEN',
  assigned_actor_or_worker_ref uuid, -- polymorphic: actors.id or worker_instances.id, not FK-constrained
  source_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb not null default '{}'
);

create index if not exists idx_administrative_deadlines_tenant_firm on administrative_deadlines(tenant_id, firm_id);

-- Drafted transmittals accompanying issued document revisions. Written by
-- persistAdministrationFromStore()'s `insert into transmittal_drafts (...) on conflict (id) do
-- update set subject=..., message_body=..., status=..., ...`; requires_principal_approval is always
-- inserted as the literal `true`; project_id, relationship_id, prepared_by_actor_id and
-- approved_by_actor_id are uuidOrNull()-wrapped.
create table if not exists transmittal_drafts (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  project_id uuid references projects(id),
  relationship_id uuid references firm_client_relationships(id),
  recipient text,
  subject text,
  document_revision_refs jsonb not null default '[]',
  message_body text,
  status text not null default 'DRAFT',
  requires_principal_approval boolean not null default true,
  prepared_by_actor_id uuid references actors(id),
  approved_by_actor_id uuid references actors(id),
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_transmittal_drafts_tenant_firm on transmittal_drafts(tenant_id, firm_id);

-- Private-network marketplace listings. Written by createMarketplaceListingRecord()'s
-- `insert into marketplace_listings (id, tenant_id, firm_id, service_pack_id, listing_scope, title,
-- description, qualification_requirements, commercial_model, visibility, status, created_at,
-- updated_at) values (...)`. Note: unlike most tables here, readRelationalStore()'s select list has
-- no metadata column for this table.
create table if not exists marketplace_listings (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  service_pack_id uuid references service_packs(id),
  listing_scope text,
  title text,
  description text,
  qualification_requirements jsonb not null default '[]',
  commercial_model jsonb not null default '{}',
  visibility text,
  status text not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_marketplace_listings_tenant_firm on marketplace_listings(tenant_id, firm_id);

-- Trusted-network capacity offers. Written by createCapacityOfferRecord()'s
-- `insert into capacity_offers (id, tenant_id, firm_id, service_pack_id, capacity_type, pce_units,
-- available_from, available_until, jurisdiction_refs, constraints, status, created_at, updated_at)
-- values (...)`. Like marketplace_listings, readRelationalStore()'s select has no metadata column.
create table if not exists capacity_offers (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  service_pack_id uuid references service_packs(id),
  capacity_type text,
  pce_units numeric,
  available_from timestamptz,
  available_until timestamptz,
  jurisdiction_refs jsonb not null default '[]',
  constraints jsonb not null default '{}',
  status text not null default 'OPEN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_capacity_offers_tenant_firm on capacity_offers(tenant_id, firm_id);

-- Trusted-network collaboration requests between firms. Written by createCollaborationRequestRecord()
-- and, separately, by createDirectoryEnquiryCollaborationRequestRecord()'s
-- `insert into collaboration_requests (id, tenant_id, requesting_firm_id, provider_firm_id,
-- service_pack_id, project_id, capacity_offer_id, request_summary, data_room_policy, status,
-- created_at, updated_at, metadata) values (...)`. No single firm_id column: this table is scoped by
-- requesting_firm_id/provider_firm_id instead.
create table if not exists collaboration_requests (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  requesting_firm_id uuid not null references firms(id),
  provider_firm_id uuid references firms(id),
  service_pack_id uuid references service_packs(id),
  project_id uuid references projects(id),
  capacity_offer_id uuid references capacity_offers(id),
  request_summary text,
  data_room_policy jsonb not null default '{}',
  status text not null default 'REQUESTED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_collaboration_requests_tenant_requesting_firm on collaboration_requests(tenant_id, requesting_firm_id);

-- Trusted-network professional profiles. Written by createNetworkProfessionalProfileRecord()'s
-- `insert into network_professional_profiles (...) values (...)`; person_id, professional_profile_id
-- and created_by_actor_id are uuidOrNull()-wrapped.
create table if not exists network_professional_profiles (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  person_id uuid references persons(id),
  professional_profile_id uuid references professional_profiles(id),
  display_name text,
  profile_scope text,
  network_status text not null default 'ACTIVE',
  authority_grant boolean not null default false,
  jurisdiction_refs jsonb not null default '[]',
  credential_refs jsonb not null default '[]',
  capability_refs jsonb not null default '[]',
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_network_professional_profiles_tenant_firm on network_professional_profiles(tenant_id, firm_id);

-- Trusted-network firm profiles. Written by createNetworkFirmProfileRecord()'s
-- `insert into network_firm_profiles (...) values (...)`; created_by_actor_id is uuidOrNull()-wrapped.
create table if not exists network_firm_profiles (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  display_name text,
  profile_scope text,
  network_status text not null default 'ACTIVE',
  jurisdiction_refs jsonb not null default '[]',
  capability_refs jsonb not null default '[]',
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_network_firm_profiles_tenant_firm on network_firm_profiles(tenant_id, firm_id);

-- Trusted-network capabilities offered by a professional or firm network profile. Written by
-- createNetworkCapabilityRecord()'s `insert into network_capabilities (...) values (...)`;
-- professional_network_profile_id, firm_network_profile_id and created_by_actor_id are
-- uuidOrNull()-wrapped.
create table if not exists network_capabilities (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  professional_network_profile_id uuid references network_professional_profiles(id),
  firm_network_profile_id uuid references network_firm_profiles(id),
  capability_code text,
  service_pack_ref text,
  jurisdiction_refs jsonb not null default '[]',
  visibility text,
  qualification_required boolean not null default true,
  status text not null default 'ACTIVE',
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_network_capabilities_tenant_firm on network_capabilities(tenant_id, firm_id);

-- Trusted-network credential evidence (never grants professional authority). Written by
-- createNetworkCredentialRecord()'s `insert into network_credentials (...) values (...)`;
-- professional_network_profile_id, verified_by_actor_id and created_by_actor_id are
-- uuidOrNull()-wrapped.
create table if not exists network_credentials (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  professional_network_profile_id uuid references network_professional_profiles(id),
  credential_type text,
  credential_name text,
  issuer text,
  jurisdiction_refs jsonb not null default '[]',
  verification_status text not null default 'PENDING',
  verified_by_actor_id uuid references actors(id),
  verified_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  evidence_refs jsonb not null default '[]',
  authority_grant boolean not null default false,
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_network_credentials_tenant_firm on network_credentials(tenant_id, firm_id);

-- Trusted-network conflict checks performed before an invitation. Written by
-- createNetworkConflictCheckRecord()'s `insert into network_conflict_checks (...) values (...)`;
-- subject_profile_id and checked_by_actor_id are uuidOrNull()-wrapped. subject_profile_id is
-- polymorphic (a network_professional_profiles or network_firm_profiles id) so it is left as a plain
-- uuid with no FK.
create table if not exists network_conflict_checks (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  requesting_firm_id uuid not null references firms(id),
  provider_firm_id uuid references firms(id),
  subject_profile_id uuid, -- polymorphic: network_professional_profiles.id or network_firm_profiles.id, not FK-constrained
  check_status text not null default 'PENDING',
  conflict_summary text,
  evidence_refs jsonb not null default '[]',
  checked_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_network_conflict_checks_tenant_requesting_firm on network_conflict_checks(tenant_id, requesting_firm_id);

-- Trusted-network qualification gate evaluations, gating a specialist invitation. Written by
-- createNetworkQualificationGateRecord()'s `insert into network_qualification_gates (...)
-- values (...)`; professional_network_profile_id, firm_network_profile_id, capability_id,
-- credential_id, conflict_check_id and created_by_actor_id are all uuidOrNull()-wrapped.
create table if not exists network_qualification_gates (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  requesting_firm_id uuid not null references firms(id),
  provider_firm_id uuid references firms(id),
  professional_network_profile_id uuid references network_professional_profiles(id),
  firm_network_profile_id uuid references network_firm_profiles(id),
  capability_id uuid references network_capabilities(id),
  credential_id uuid references network_credentials(id),
  conflict_check_id uuid references network_conflict_checks(id),
  jurisdiction_ref text,
  credential_status text,
  jurisdiction_status text,
  insurance_status text,
  conflict_status text,
  capacity_status text,
  policy_status text,
  gate_status text not null default 'PENDING',
  denial_reasons jsonb not null default '[]',
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_network_qualification_gates_tenant_requesting_firm on network_qualification_gates(tenant_id, requesting_firm_id);

-- Trusted-network trust signals (never substitute for a credential). Written by
-- createNetworkTrustSignalRecord()'s `insert into network_trust_signals (...) values (...)`;
-- subject_id and created_by_actor_id are uuidOrNull()-wrapped. subject_id is polymorphic so left as
-- a plain uuid with no FK.
create table if not exists network_trust_signals (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  subject_type text,
  subject_id uuid, -- polymorphic subject reference, not FK-constrained
  signal_type text,
  signal_summary text,
  evidence_refs jsonb not null default '[]',
  trust_weight numeric,
  substitutes_for_credential boolean not null default false,
  status text not null default 'ACTIVE',
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_network_trust_signals_tenant_firm on network_trust_signals(tenant_id, firm_id);

-- ME-S3 private qualified-directory review board decisions. Written by
-- createDirectoryReviewBoardDecisionRecord()'s `insert into directory_review_board_decisions (...)
-- values (...)`; qualification_gate_id and decided_by_actor_id are uuidOrNull()-wrapped.
create table if not exists directory_review_board_decisions (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  provider_firm_id uuid not null references firms(id),
  listing_id uuid references marketplace_listings(id),
  qualification_gate_id uuid references network_qualification_gates(id),
  board_ref text,
  decision text not null,
  decision_summary text,
  evidence_refs jsonb not null default '[]',
  decided_by_actor_id uuid references actors(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_directory_review_board_decisions_tenant_provider_firm on directory_review_board_decisions(tenant_id, provider_firm_id);

-- ME-S3 private directory enquiries (manual-review-only, never auto-matched). Written by
-- createPrivateDirectoryEnquiryRecord()'s `insert into directory_private_enquiries (...)
-- values (...)`; created_by_actor_id is uuidOrNull()-wrapped.
create table if not exists directory_private_enquiries (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  requesting_firm_id uuid not null references firms(id),
  provider_firm_id uuid not null references firms(id),
  listing_id uuid references marketplace_listings(id),
  enquiry_summary text,
  status text not null default 'ENQUIRY_RECORDED',
  matching_mode text not null default 'MANUAL_REVIEW_ONLY',
  no_live_matching boolean not null default true,
  no_ranking boolean not null default true,
  no_award boolean not null default true,
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_directory_private_enquiries_tenant_requesting_firm on directory_private_enquiries(tenant_id, requesting_firm_id);

-- Qualification renewal / expiry reviews for a published private directory listing. Written by
-- createQualificationRenewalReviewRecord()'s `insert into qualification_renewal_reviews (...)
-- values (...)`; credential_id and reviewed_by_actor_id are uuidOrNull()-wrapped.
create table if not exists qualification_renewal_reviews (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  provider_firm_id uuid not null references firms(id),
  qualification_gate_id uuid not null references network_qualification_gates(id),
  listing_id uuid not null references marketplace_listings(id),
  credential_id uuid references network_credentials(id),
  jurisdiction_ref text,
  review_status text not null,
  expires_at timestamptz,
  next_review_due_at timestamptz,
  evidence_refs jsonb not null default '[]',
  reviewed_by_actor_id uuid references actors(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_qualification_renewal_reviews_tenant_provider_firm on qualification_renewal_reviews(tenant_id, provider_firm_id);

-- Specialist invitations, gated on a passed qualification gate. Written by
-- createSpecialistInvitationRecord()'s `insert into specialist_invitations (...) values (...)`;
-- qualification_gate_id, capability_id and invited_by_actor_id are uuidOrNull()-wrapped.
create table if not exists specialist_invitations (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  requesting_firm_id uuid not null references firms(id),
  provider_firm_id uuid not null references firms(id),
  qualification_gate_id uuid references network_qualification_gates(id),
  capability_id uuid references network_capabilities(id),
  invitation_status text not null default 'PENDING',
  denial_reasons jsonb not null default '[]',
  invited_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_specialist_invitations_tenant_requesting_firm on specialist_invitations(tenant_id, requesting_firm_id);

-- Scoped trusted collaboration workspaces opened from a qualified specialist invitation. Written by
-- createCollaborationWorkspaceRecord()'s `insert into collaboration_workspaces (...) values (...)`;
-- specialist_invitation_id, qualification_gate_id and created_by_actor_id are uuidOrNull()-wrapped.
create table if not exists collaboration_workspaces (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  requesting_firm_id uuid not null references firms(id),
  provider_firm_id uuid not null references firms(id),
  specialist_invitation_id uuid references specialist_invitations(id),
  qualification_gate_id uuid references network_qualification_gates(id),
  workspace_status text not null default 'ACTIVE',
  data_room_policy jsonb not null default '{}',
  permitted_evidence_refs jsonb not null default '[]',
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_collaboration_workspaces_tenant_requesting_firm on collaboration_workspaces(tenant_id, requesting_firm_id);

-- Per-firm access grants into a collaboration workspace. Written by
-- grantCollaborationWorkspaceParticipantRecord()'s
-- `insert into collaboration_workspace_participants (...) values (...)`; workspace_id, actor_id,
-- granted_by_actor_id and revoked_by_actor_id are uuidOrNull()-wrapped; firm_id is passed unwrapped.
create table if not exists collaboration_workspace_participants (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  workspace_id uuid references collaboration_workspaces(id),
  firm_id uuid not null references firms(id),
  actor_id uuid references actors(id),
  participant_role text,
  access_status text not null default 'ACTIVE',
  permissions jsonb not null default '[]',
  granted_by_actor_id uuid references actors(id),
  granted_at timestamptz,
  revoked_by_actor_id uuid references actors(id),
  revoked_at timestamptz,
  metadata jsonb not null default '{}'
);

create index if not exists idx_collaboration_workspace_participants_tenant_firm on collaboration_workspace_participants(tenant_id, firm_id);

-- Workspace-scoped evidence references added by a participant. Written by
-- addCollaborationWorkspaceEvidenceRecord()'s `insert into collaboration_workspace_evidence (...)
-- values (...)`; workspace_id, participant_id and added_by_actor_id are uuidOrNull()-wrapped. No
-- firm_id column (scoped only via workspace_id/participant_id).
create table if not exists collaboration_workspace_evidence (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  workspace_id uuid references collaboration_workspaces(id),
  participant_id uuid references collaboration_workspace_participants(id),
  evidence_ref text,
  evidence_type text,
  access_scope text not null default 'WORKSPACE_ONLY',
  added_by_actor_id uuid references actors(id),
  added_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_collaboration_workspace_evidence_tenant_workspace on collaboration_workspace_evidence(tenant_id, workspace_id);

-- Responsibility / approval matrices governing a collaboration workspace. Written by
-- createResponsibilityMatrixRecord()'s `insert into responsibility_matrices (...) values (...)`;
-- workspace_id, responsible_professional_actor_id, reviewer_actor_id, approver_actor_id and
-- created_by_actor_id are uuidOrNull()-wrapped; the three firm ids are passed unwrapped.
create table if not exists responsibility_matrices (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  workspace_id uuid references collaboration_workspaces(id),
  requesting_firm_id uuid not null references firms(id),
  provider_firm_id uuid not null references firms(id),
  accountable_firm_id uuid not null references firms(id),
  responsible_professional_actor_id uuid references actors(id),
  reviewer_actor_id uuid references actors(id),
  approver_actor_id uuid references actors(id),
  permitted_worker_actions jsonb not null default '[]',
  regulated_scope text,
  approval_required boolean not null default true,
  matrix_status text not null default 'ACTIVE',
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_responsibility_matrices_tenant_requesting_firm on responsibility_matrices(tenant_id, requesting_firm_id);

-- Specialist work assignments delivered under an active responsibility matrix. Written by
-- persistSpecialistAssignmentPostgres()'s `insert into specialist_assignments (...) on conflict (id)
-- do update set assignment_status=..., ...`; workspace_id, responsibility_matrix_id and every
-- *_by_actor_id column are uuidOrNull()-wrapped. There is no created_at column here; requested_at is
-- the row's creation timestamp (matching the select's `order by requested_at, id`).
create table if not exists specialist_assignments (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  workspace_id uuid references collaboration_workspaces(id),
  responsibility_matrix_id uuid references responsibility_matrices(id),
  requesting_firm_id uuid not null references firms(id),
  provider_firm_id uuid not null references firms(id),
  assignment_title text,
  assignment_scope text,
  assignment_status text not null default 'REQUESTED',
  requested_by_actor_id uuid references actors(id),
  accepted_by_actor_id uuid references actors(id),
  started_by_actor_id uuid references actors(id),
  delivered_by_actor_id uuid references actors(id),
  reviewed_by_actor_id uuid references actors(id),
  approved_by_actor_id uuid references actors(id),
  closed_by_actor_id uuid references actors(id),
  evidence_refs jsonb not null default '[]',
  review_summary text,
  approval_summary text,
  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  started_at timestamptz,
  delivered_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  closed_at timestamptz,
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_specialist_assignments_tenant_requesting_firm on specialist_assignments(tenant_id, requesting_firm_id);

-- Privacy-safe cross-tenant/firm observatory metric snapshots. Written by
-- createObservatorySnapshotRecord()'s `insert into observatory_snapshots (id, tenant_id, firm_id,
-- snapshot_scope, metrics, privacy_class, generated_at) values (...)`; both tenant_id and firm_id are
-- uuidOrNull()-wrapped, so unlike most tables here tenant_id itself is nullable (a snapshot can be
-- platform-wide, scoped to no single tenant).
create table if not exists observatory_snapshots (
  id uuid primary key,
  tenant_id uuid references tenants(id),
  firm_id uuid references firms(id),
  snapshot_scope text,
  metrics jsonb not null default '{}',
  privacy_class text not null default 'PRIVACY_SAFE_AGGREGATE',
  generated_at timestamptz not null default now()
);

create index if not exists idx_observatory_snapshots_tenant_firm on observatory_snapshots(tenant_id, firm_id);

-- Pilot program user identities. Written by invitePilotUserRecord()'s
-- `insert into pilot_users (...) values (...)`; firm_id, person_id and actor_id are all
-- uuidOrNull()-wrapped.
create table if not exists pilot_users (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  person_id uuid references persons(id),
  actor_id uuid references actors(id),
  email text not null,
  display_name text,
  pilot_role text not null default 'PILOT_OPERATOR',
  invite_status text not null default 'INVITED',
  auth_provider text,
  external_subject text,
  invited_at timestamptz not null default now(),
  activated_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'
);

create index if not exists idx_pilot_users_tenant_firm on pilot_users(tenant_id, firm_id);

-- Commercial-domain AI worker skill bindings (same shape as administration_skill_bindings). Written
-- by persistCommercialOperationsFromStore()'s `insert into commercial_skill_bindings (...) on
-- conflict (id) do update set status=..., metadata=...`.
create table if not exists commercial_skill_bindings (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  worker_template_code text,
  role_skill_ref text,
  worker_skill_ref text,
  input_schema_ref text,
  output_schema_ref text,
  supervisor_actor_id uuid references actors(id),
  permissions jsonb not null default '[]',
  forbidden_actions jsonb not null default '[]',
  status text not null default 'ACTIVE',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_commercial_skill_bindings_tenant_firm on commercial_skill_bindings(tenant_id, firm_id);

-- Sales/CRM pipeline opportunity records. Written by persistCommercialOperationsFromStore()'s
-- `insert into sales_pipeline_records (...) on conflict (id) do update set proposal_id=..., ...`;
-- enquiry_id, relationship_id, intake_session_id, proposal_id and owner_actor_id are all
-- uuidOrNull()-wrapped.
create table if not exists sales_pipeline_records (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  enquiry_id uuid references front_desk_enquiries(id),
  relationship_id uuid references firm_client_relationships(id),
  intake_session_id uuid references intake_sessions(id),
  proposal_id uuid references proposals(id),
  opportunity_name text,
  stage text not null default 'OPEN',
  estimated_value numeric,
  currency text,
  probability_percent integer,
  owner_actor_id uuid references actors(id),
  next_action text,
  next_action_due_at timestamptz,
  lost_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_sales_pipeline_records_tenant_firm on sales_pipeline_records(tenant_id, firm_id);

-- Proposal dispatch (send) log. Written by persistCommercialOperationsFromStore()'s
-- `insert into proposal_dispatch_records (...) on conflict (id) do nothing`; every column, including
-- the foreign keys, is passed unwrapped (no uuidOrNull calls at all in this particular insert).
create table if not exists proposal_dispatch_records (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  proposal_id uuid not null references proposals(id),
  recipient text,
  channel text,
  dispatch_status text not null default 'DISPATCHED',
  dispatched_by_actor_id uuid references actors(id),
  commercial_approval_id uuid references approvals(id),
  document_ref text,
  dispatched_at timestamptz,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_proposal_dispatch_records_tenant_firm on proposal_dispatch_records(tenant_id, firm_id);

-- Firm expense records. Written by persistCommercialOperationsFromStore()'s
-- `insert into expense_records (...) on conflict (id) do update set status=..., ...`; project_id,
-- prepared_by_actor_id and approved_by_actor_id are uuidOrNull()-wrapped; payment_instruction_ref is
-- always inserted as literal null in this path (not yet wired to a payment instruction).
create table if not exists expense_records (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  project_id uuid references projects(id),
  supplier text,
  description text,
  category text,
  amount numeric not null default 0,
  currency text,
  expense_date timestamptz,
  receipt_ref text,
  status text not null default 'DRAFT',
  prepared_by_actor_id uuid references actors(id),
  approved_by_actor_id uuid references actors(id),
  approved_at timestamptz,
  payment_instruction_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_expense_records_tenant_firm on expense_records(tenant_id, firm_id);

-- Receivable (accounts receivable) chase/follow-up drafts. Written by
-- persistCommercialOperationsFromStore()'s `insert into receivable_follow_ups (...) on conflict (id)
-- do update set subject=..., message_body=..., status=..., ...`; invoice_id is passed unwrapped (not
-- null); requires_human_review is always inserted as literal `true`.
create table if not exists receivable_follow_ups (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  invoice_id uuid not null references invoices(id),
  channel text,
  subject text,
  message_body text,
  status text not null default 'DRAFT',
  requires_human_review boolean not null default true,
  prepared_by_actor_id uuid references actors(id),
  approved_by_actor_id uuid references actors(id),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_receivable_follow_ups_tenant_firm on receivable_follow_ups(tenant_id, firm_id);

-- Customer support cases. Written by createSupportCaseRecord()'s
-- `insert into support_cases (...) values (...)`; firm_id, opened_by_actor_id and
-- related_pilot_user_id are uuidOrNull()-wrapped.
create table if not exists support_cases (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  opened_by_actor_id uuid references actors(id),
  related_pilot_user_id uuid references pilot_users(id),
  case_type text not null default 'GENERAL_SUPPORT',
  severity text not null default 'NORMAL',
  status text not null default 'OPEN',
  subject text,
  description text,
  resolution_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  metadata jsonb not null default '{}'
);

create index if not exists idx_support_cases_tenant_firm on support_cases(tenant_id, firm_id);

-- Technical-domain AI worker skill bindings (same shape as administration_skill_bindings). Written
-- by persistTechnicalDeliveryFromStore()'s `insert into technical_skill_bindings (...) on conflict
-- (id) do update set status=..., metadata=...`.
create table if not exists technical_skill_bindings (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  worker_template_code text,
  role_skill_ref text,
  worker_skill_ref text,
  input_schema_ref text,
  output_schema_ref text,
  supervisor_actor_id uuid references actors(id),
  permissions jsonb not null default '[]',
  forbidden_actions jsonb not null default '[]',
  status text not null default 'ACTIVE',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_technical_skill_bindings_tenant_firm on technical_skill_bindings(tenant_id, firm_id);

-- Drawing revision QA/comparison review records. Written by persistTechnicalDeliveryFromStore()'s
-- `insert into drawing_review_records (...) on conflict (id) do update set check_results=...,
-- status=..., metadata=...`; only prepared_by_actor_id is uuidOrNull()-wrapped in this insert;
-- requires_professional_review is always inserted as literal `true`.
create table if not exists drawing_review_records (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  project_id uuid not null references projects(id),
  document_register_entry_id uuid references document_register_entries(id),
  base_revision_id uuid references document_revision_records(id),
  compared_revision_id uuid references document_revision_records(id),
  check_results jsonb not null default '[]',
  status text not null default 'PENDING',
  prepared_by_actor_id uuid references actors(id),
  requires_professional_review boolean not null default true,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_drawing_review_records_tenant_firm on drawing_review_records(tenant_id, firm_id);

-- Engineering calculation input sets. Written by persistTechnicalDeliveryFromStore()'s
-- `insert into calculation_input_sets (...) on conflict (id) do update set input_values=...,
-- validation_results=..., validation_status=..., updated_at=..., metadata=...`; intake_session_id
-- and prepared_by_actor_id are uuidOrNull()-wrapped.
create table if not exists calculation_input_sets (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  project_id uuid not null references projects(id),
  intake_session_id uuid references intake_sessions(id),
  source_revision_refs jsonb not null default '[]',
  input_values jsonb not null default '{}',
  unit_system text,
  validation_results jsonb not null default '[]',
  validation_status text,
  deterministic_engine_ref text,
  prepared_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_calculation_input_sets_tenant_firm on calculation_input_sets(tenant_id, firm_id);

-- Technical QA findings raised against a project deliverable. Written by
-- persistTechnicalDeliveryFromStore()'s `insert into technical_qa_findings (...) on conflict (id) do
-- update set status=..., resolved_by_actor_id=..., ...`; raised_by_actor_id and resolved_by_actor_id
-- are uuidOrNull()-wrapped. subject_id is polymorphic (the finding's subject varies by
-- subject_type), so it is left as a plain uuid with no FK.
create table if not exists technical_qa_findings (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  project_id uuid not null references projects(id),
  subject_type text,
  subject_id uuid, -- polymorphic subject reference, not FK-constrained
  finding_code text,
  severity text,
  description text,
  status text not null default 'OPEN',
  raised_by_actor_id uuid references actors(id),
  resolved_by_actor_id uuid references actors(id),
  resolution_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata jsonb not null default '{}'
);

create index if not exists idx_technical_qa_findings_tenant_firm on technical_qa_findings(tenant_id, firm_id);

-- Client delivery package records bundling drawings, calculations and QA sign-off. Written by
-- persistTechnicalDeliveryFromStore()'s `insert into delivery_package_records (...) on conflict (id)
-- do update set qa_finding_refs=..., readiness_checks=..., package_status=..., ...`;
-- prepared_by_actor_id, professional_approval_id and issued_document_version_id are
-- uuidOrNull()-wrapped; requires_professional_review is always inserted as literal `true`.
create table if not exists delivery_package_records (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  project_id uuid not null references projects(id),
  drawing_revision_refs jsonb not null default '[]',
  calculation_input_set_id uuid references calculation_input_sets(id),
  qa_finding_refs jsonb not null default '[]',
  evidence_refs jsonb not null default '[]',
  readiness_checks jsonb not null default '[]',
  package_status text not null default 'DRAFT',
  requires_professional_review boolean not null default true,
  prepared_by_actor_id uuid references actors(id),
  professional_approval_id uuid references approvals(id),
  issued_document_version_id uuid references document_versions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_delivery_package_records_tenant_firm on delivery_package_records(tenant_id, firm_id);

-- Pilot program operational incidents. Written by createPilotIncidentRecord()'s
-- `insert into pilot_incidents (...) values (...)`; firm_id, support_case_id, project_id and
-- opened_by_actor_id are all uuidOrNull()-wrapped.
create table if not exists pilot_incidents (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  support_case_id uuid references support_cases(id),
  project_id uuid references projects(id),
  opened_by_actor_id uuid references actors(id),
  incident_type text not null default 'OPERATIONAL',
  severity text not null default 'SEV3',
  status text not null default 'OPEN',
  title text,
  description text,
  detection_source text,
  impact_summary text,
  mitigation_summary text,
  root_cause_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata jsonb not null default '{}'
);

create index if not exists idx_pilot_incidents_tenant_firm on pilot_incidents(tenant_id, firm_id);

-- Pilot user feedback submissions. Written by createPilotFeedbackRecord()'s
-- `insert into pilot_feedback (...) values (...)`; firm_id, pilot_user_id, project_id and
-- submitted_by_actor_id are all uuidOrNull()-wrapped.
create table if not exists pilot_feedback (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  pilot_user_id uuid references pilot_users(id),
  project_id uuid references projects(id),
  submitted_by_actor_id uuid references actors(id),
  feedback_type text,
  sentiment text,
  rating integer,
  subject text,
  feedback_text text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

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
create table if not exists pilot_improvement_items (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  feedback_id uuid references pilot_feedback(id),
  acceptance_review_id uuid references pilot_acceptance_reviews(id),
  owner_actor_id uuid references actors(id),
  item_type text not null default 'PRODUCT_IMPROVEMENT',
  priority text not null default 'P2',
  status text not null default 'OPEN',
  title text,
  description text,
  target_stage text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  metadata jsonb not null default '{}'
);

create index if not exists idx_pilot_improvement_items_tenant_firm on pilot_improvement_items(tenant_id, firm_id);

-- Generated pilot report packs (feedback/incidents/support/reviews summary). Written by
-- createPilotReportPackRecord()'s `insert into pilot_report_packs (...) values (...)`; firm_id and
-- generated_by_actor_id are uuidOrNull()-wrapped.
create table if not exists pilot_report_packs (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  generated_by_actor_id uuid references actors(id),
  report_scope text,
  report_status text not null default 'DRAFT',
  summary jsonb not null default '{}',
  export_manifest jsonb not null default '{}',
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_pilot_report_packs_tenant_firm on pilot_report_packs(tenant_id, firm_id);

-- Stakeholder review boards convened over a pilot report pack. Written by
-- createStakeholderReviewBoardRecord()'s `insert into stakeholder_review_boards (...) values (...)`;
-- firm_id, report_pack_id and chaired_by_actor_id are uuidOrNull()-wrapped.
create table if not exists stakeholder_review_boards (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  report_pack_id uuid references pilot_report_packs(id),
  chaired_by_actor_id uuid references actors(id),
  board_name text,
  review_status text not null default 'OPEN',
  agenda jsonb not null default '[]',
  attendees jsonb not null default '[]',
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  metadata jsonb not null default '{}'
);

create index if not exists idx_stakeholder_review_boards_tenant_firm on stakeholder_review_boards(tenant_id, firm_id);

-- Decisions recorded by a stakeholder review board. Written by
-- createStakeholderReviewDecisionRecord()'s `insert into stakeholder_review_decisions (...)
-- values (...)` (run inside an explicit transaction alongside closing the board); board_id is passed
-- unwrapped (not null); firm_id and decided_by_actor_id are uuidOrNull()-wrapped.
create table if not exists stakeholder_review_decisions (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  board_id uuid not null references stakeholder_review_boards(id),
  decided_by_actor_id uuid references actors(id),
  decision text not null,
  decision_summary text,
  conditions jsonb not null default '[]',
  next_stage text,
  decided_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_stakeholder_review_decisions_tenant_firm on stakeholder_review_decisions(tenant_id, firm_id);

-- Controlled pilot expansion cohorts approved by a stakeholder review decision. Written by
-- createPilotExpansionCohortRecord()'s `insert into pilot_expansion_cohorts (...) values (...)`;
-- firm_id, stakeholder_decision_id and created_by_actor_id are uuidOrNull()-wrapped.
create table if not exists pilot_expansion_cohorts (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  stakeholder_decision_id uuid references stakeholder_review_decisions(id),
  created_by_actor_id uuid references actors(id),
  cohort_name text,
  expansion_status text not null default 'PROPOSED',
  max_tenants integer,
  max_pilot_users integer,
  entry_criteria jsonb not null default '[]',
  risk_controls jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

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
create table if not exists release_candidate_gates (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  expansion_cohort_id uuid references pilot_expansion_cohorts(id),
  reviewed_by_actor_id uuid references actors(id),
  release_candidate text,
  gate_status text not null default 'PENDING',
  required_checks jsonb not null default '[]',
  evidence_refs jsonb not null default '[]',
  decision_summary text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  metadata jsonb not null default '{}'
);

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
create table if not exists billing_readiness_reviews (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  reviewed_by_actor_id uuid references actors(id),
  readiness_status text not null default 'NOT_READY',
  pricing_model text,
  checks jsonb not null default '[]',
  decision_summary text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

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
create table if not exists subscription_packages (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  created_by_actor_id uuid references actors(id),
  package_code text not null default 'VF-PILOT-PRO',
  package_name text not null default 'vFirm Pilot Pro',
  package_status text not null default 'DRAFT',
  pricing_model text not null default 'SUBSCRIPTION_PLUS_USAGE',
  base_price numeric not null default 0,
  currency text not null default 'MYR',
  usage_limits jsonb not null default '{}',
  features jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

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
create table if not exists pilot_handoff_records (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  accepted_by_actor_id uuid references actors(id),
  rehearsal_ref text,
  handoff_status text not null default 'PENDING',
  checklist jsonb not null default '[]',
  evidence_refs jsonb not null default '[]',
  decision_summary text,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_pilot_handoff_records_tenant_firm on pilot_handoff_records(tenant_id, firm_id);
