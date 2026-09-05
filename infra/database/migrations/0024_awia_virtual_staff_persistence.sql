-- Phase B (TD-009): AWIA Virtual Staff Postgres persistence.
--
-- Closes the gap logged in TECHNICAL_DEBT_REGISTER_v1.0.md TD-009 and the Phase A pilot-day carried
-- finding (AWIA_PILOT_DAY_PHASE_A_AUTHORIZATION_AND_DRY_RUN_RESULT_v1.0.md v1.1, section 4): the
-- awia_* collections previously had no real relational tables and only round-tripped through the
-- JSONB app_state blob (a Phase A stopgap so Postgres saves stopped silently discarding AWIA data).
--
-- All 17 tables share one shape: a uuid primary key, the original application-level id preserved
-- verbatim in `natural_key`, tenant/firm scoping columns for real foreign-key integrity and indexed
-- filtering, and the full application record kept as `record jsonb` so apps/api/src/store.mjs can
-- read rows back into the exact JS shape the rest of the codebase already expects -- see
-- AWIA_RELATIONAL_TABLES / persistAwiaVirtualStaffFromStore / readAwiaVirtualStaffRelational there.
--
-- Six of the seventeen (provisioning runs, seats, members, role assignments, package bindings,
-- lifecycle events) use deterministic natural-key ids by design, e.g. `agent-<firm_id>-cfo-001`
-- (packages/core-domain/src/awia-virtual-staff-provisioning.mjs), so that re-provisioning the same
-- firm/staff_code stays idempotent; those ids are never converted to random UUIDs on either backend.
-- Because this table's `id` column is `uuid`, such rows get a stable surrogate key derived from the
-- natural key with deterministicUuid() (apps/api/src/store.mjs) -- the natural key itself is kept
-- verbatim in `natural_key` and inside `record`, so nothing about the application-level identity of
-- these entities changes. The remaining eleven (runtime workdesk/output/review/delivery/memory/
-- conversation/billing records) already carry genuinely random, backend-aware ids
-- (storeBackend === "postgres" ? newUuid() : newId(...)), so for those the surrogate key and the
-- natural key are simply the same value.


create table if not exists awia_virtual_staff_provisioning_runs (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_awia_virtual_staff_provisioning_runs_natural_key on awia_virtual_staff_provisioning_runs(tenant_id, firm_id, natural_key);
create index if not exists idx_awia_virtual_staff_provisioning_runs_scope on awia_virtual_staff_provisioning_runs(tenant_id, firm_id);

create table if not exists awia_virtual_staff_seats (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_awia_virtual_staff_seats_natural_key on awia_virtual_staff_seats(tenant_id, firm_id, natural_key);
create index if not exists idx_awia_virtual_staff_seats_scope on awia_virtual_staff_seats(tenant_id, firm_id);

create table if not exists awia_virtual_staff_members (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_awia_virtual_staff_members_natural_key on awia_virtual_staff_members(tenant_id, firm_id, natural_key);
create index if not exists idx_awia_virtual_staff_members_scope on awia_virtual_staff_members(tenant_id, firm_id);

create table if not exists awia_staff_role_assignments (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_awia_staff_role_assignments_natural_key on awia_staff_role_assignments(tenant_id, firm_id, natural_key);
create index if not exists idx_awia_staff_role_assignments_scope on awia_staff_role_assignments(tenant_id, firm_id);

create table if not exists awia_staff_package_bindings (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_awia_staff_package_bindings_natural_key on awia_staff_package_bindings(tenant_id, firm_id, natural_key);
create index if not exists idx_awia_staff_package_bindings_scope on awia_staff_package_bindings(tenant_id, firm_id);

create table if not exists awia_staff_lifecycle_events (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_awia_staff_lifecycle_events_natural_key on awia_staff_lifecycle_events(tenant_id, firm_id, natural_key);
create index if not exists idx_awia_staff_lifecycle_events_scope on awia_staff_lifecycle_events(tenant_id, firm_id);

create table if not exists awia_staff_authority_decisions (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_awia_staff_authority_decisions_natural_key on awia_staff_authority_decisions(tenant_id, firm_id, natural_key);
create index if not exists idx_awia_staff_authority_decisions_scope on awia_staff_authority_decisions(tenant_id, firm_id);

create table if not exists awia_staff_evidence_packs (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_awia_staff_evidence_packs_natural_key on awia_staff_evidence_packs(tenant_id, firm_id, natural_key);
create index if not exists idx_awia_staff_evidence_packs_scope on awia_staff_evidence_packs(tenant_id, firm_id);

create table if not exists awia_staff_task_readiness_records (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_awia_staff_task_readiness_records_natural_key on awia_staff_task_readiness_records(tenant_id, firm_id, natural_key);
create index if not exists idx_awia_staff_task_readiness_records_scope on awia_staff_task_readiness_records(tenant_id, firm_id);

create table if not exists awia_staff_workdesk_items (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_awia_staff_workdesk_items_natural_key on awia_staff_workdesk_items(tenant_id, firm_id, natural_key);
create index if not exists idx_awia_staff_workdesk_items_scope on awia_staff_workdesk_items(tenant_id, firm_id);

create table if not exists awia_staff_output_drafts (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_awia_staff_output_drafts_natural_key on awia_staff_output_drafts(tenant_id, firm_id, natural_key);
create index if not exists idx_awia_staff_output_drafts_scope on awia_staff_output_drafts(tenant_id, firm_id);

create table if not exists awia_staff_output_reviews (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_awia_staff_output_reviews_natural_key on awia_staff_output_reviews(tenant_id, firm_id, natural_key);
create index if not exists idx_awia_staff_output_reviews_scope on awia_staff_output_reviews(tenant_id, firm_id);

create table if not exists awia_client_delivery_drafts (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_awia_client_delivery_drafts_natural_key on awia_client_delivery_drafts(tenant_id, firm_id, natural_key);
create index if not exists idx_awia_client_delivery_drafts_scope on awia_client_delivery_drafts(tenant_id, firm_id);

create table if not exists awia_staff_memory_entries (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_awia_staff_memory_entries_natural_key on awia_staff_memory_entries(tenant_id, firm_id, natural_key);
create index if not exists idx_awia_staff_memory_entries_scope on awia_staff_memory_entries(tenant_id, firm_id);

create table if not exists awia_staff_conversation_threads (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_awia_staff_conversation_threads_natural_key on awia_staff_conversation_threads(tenant_id, firm_id, natural_key);
create index if not exists idx_awia_staff_conversation_threads_scope on awia_staff_conversation_threads(tenant_id, firm_id);

create table if not exists awia_staff_conversation_messages (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_awia_staff_conversation_messages_natural_key on awia_staff_conversation_messages(tenant_id, firm_id, natural_key);
create index if not exists idx_awia_staff_conversation_messages_scope on awia_staff_conversation_messages(tenant_id, firm_id);

create table if not exists awia_staff_seat_billing_events (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_awia_staff_seat_billing_events_natural_key on awia_staff_seat_billing_events(tenant_id, firm_id, natural_key);
create index if not exists idx_awia_staff_seat_billing_events_scope on awia_staff_seat_billing_events(tenant_id, firm_id);
