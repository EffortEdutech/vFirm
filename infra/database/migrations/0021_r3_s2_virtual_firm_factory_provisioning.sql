create table if not exists factory_firm_blueprints (
  id text primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  blueprint_code text not null,
  blueprint_name text not null,
  blueprint_version text not null,
  blueprint_state text not null,
  validation_status text not null,
  validation_findings jsonb not null default '[]'::jsonb,
  approved_by_actor_id uuid references actors(id),
  approved_at timestamptz,
  provisioned_firm_id uuid references firms(id),
  bundle jsonb not null,
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists idx_factory_firm_blueprints_scope on factory_firm_blueprints(tenant_id, firm_id, blueprint_state);

create table if not exists factory_provisioning_runs (
  id text primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  firm_blueprint_id text not null,
  provisioning_state text not null,
  validation_snapshot jsonb not null default '{}'::jsonb,
  created_resource_refs jsonb not null default '{}'::jsonb,
  failure_reasons jsonb not null default '[]'::jsonb,
  readiness_checks jsonb not null default '[]'::jsonb,
  started_by_actor_id uuid references actors(id),
  accepted_by_actor_id uuid references actors(id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  accepted_at timestamptz,
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists idx_factory_provisioning_runs_scope on factory_provisioning_runs(tenant_id, firm_id, provisioning_state);
create unique index if not exists idx_factory_provisioning_runs_one_active on factory_provisioning_runs(firm_blueprint_id) where provisioning_state not in ('PROVISIONING_FAILED','READINESS_FAILED');

create table if not exists provisioned_firm_instances (
  id text primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  firm_blueprint_id text not null,
  provisioning_run_id text not null,
  instance_status text not null,
  module_configuration jsonb not null default '[]'::jsonb,
  service_catalogue jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists idx_provisioned_firm_instances_scope on provisioned_firm_instances(tenant_id, firm_id, instance_status);

create table if not exists factory_worker_bindings (
  id text primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  provisioning_run_id text not null,
  worker_code text not null,
  actor_type text not null,
  role_skill_ref text not null,
  worker_skill_ref text not null,
  authority_envelope jsonb not null default '{}'::jsonb,
  supervisor_actor_id uuid references actors(id),
  escalation_route text not null,
  memory_boundary jsonb not null default '{}'::jsonb,
  budget_boundary jsonb not null default '{}'::jsonb,
  binding_state text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists idx_factory_worker_bindings_scope on factory_worker_bindings(tenant_id, firm_id, binding_state);