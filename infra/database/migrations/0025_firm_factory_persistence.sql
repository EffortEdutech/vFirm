-- HM-S6 item 1/flag 2: Firm Factory / Provisioning Postgres persistence.
--
-- These 7 collections (factory_firm_blueprints, factory_provisioning_runs,
-- provisioned_firm_instances, factory_worker_bindings, pack_compatibility_checks,
-- pack_binding_certifications, service_activation_records) were previously stored ONLY inside the
-- generic JSONB app_state blob (apps/api/src/store.mjs, savePostgresStore()/loadPostgresStore()) --
-- this was correctly working (confirmed by direct code reading: the blob is read back on every
-- load), NOT a data-loss bug as first suspected. This migration is a deliberate consistency
-- upgrade, authorized by the product owner (2026-09-22) as part of HM-S6, so this domain follows
-- the same real-relational-table pattern as every other domain in the new repository layer,
-- rather than being the one domain still round-tripping through the catch-all blob.
--
-- Same proven shape as migration 0024 (AWIA virtual staff): a uuid primary key, the original
-- application-level id preserved verbatim in `natural_key`, tenant/firm scoping columns for real
-- foreign-key integrity and indexed filtering, and the full application record kept as
-- `record jsonb` so apps/api/src/store.mjs can read rows back into the exact JS shape the rest of
-- the codebase already expects -- see FIRM_FACTORY_RELATIONAL_TABLES /
-- persistFirmFactoryFromStore / readFirmFactoryRelational there. All 7 collections here use
-- genuinely random ids already, so the surrogate key and the natural key are simply the same value
-- (no deterministic-natural-key case like AWIA's provisioning/seats/members tables).

create table if not exists factory_firm_blueprints (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_factory_firm_blueprints_natural_key on factory_firm_blueprints(tenant_id, firm_id, natural_key);
create index if not exists idx_factory_firm_blueprints_scope on factory_firm_blueprints(tenant_id, firm_id);

create table if not exists factory_provisioning_runs (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_factory_provisioning_runs_natural_key on factory_provisioning_runs(tenant_id, firm_id, natural_key);
create index if not exists idx_factory_provisioning_runs_scope on factory_provisioning_runs(tenant_id, firm_id);

create table if not exists provisioned_firm_instances (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_provisioned_firm_instances_natural_key on provisioned_firm_instances(tenant_id, firm_id, natural_key);
create index if not exists idx_provisioned_firm_instances_scope on provisioned_firm_instances(tenant_id, firm_id);

create table if not exists factory_worker_bindings (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_factory_worker_bindings_natural_key on factory_worker_bindings(tenant_id, firm_id, natural_key);
create index if not exists idx_factory_worker_bindings_scope on factory_worker_bindings(tenant_id, firm_id);

create table if not exists pack_compatibility_checks (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_pack_compatibility_checks_natural_key on pack_compatibility_checks(tenant_id, firm_id, natural_key);
create index if not exists idx_pack_compatibility_checks_scope on pack_compatibility_checks(tenant_id, firm_id);

create table if not exists pack_binding_certifications (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_pack_binding_certifications_natural_key on pack_binding_certifications(tenant_id, firm_id, natural_key);
create index if not exists idx_pack_binding_certifications_scope on pack_binding_certifications(tenant_id, firm_id);

create table if not exists service_activation_records (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_service_activation_records_natural_key on service_activation_records(tenant_id, firm_id, natural_key);
create index if not exists idx_service_activation_records_scope on service_activation_records(tenant_id, firm_id);
