create table if not exists pack_compatibility_checks (
  id text primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  provisioning_run_id text not null,
  firm_blueprint_id text not null,
  practice_pack_id text,
  service_delivery_pack_id text,
  governance_pack_id text,
  jurisdiction_pack_id text,
  compatibility_status text not null,
  findings jsonb not null default '[]'::jsonb,
  checked_by_actor_id uuid references actors(id),
  checked_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists idx_pack_compatibility_checks_scope on pack_compatibility_checks(tenant_id, firm_id, compatibility_status);

create table if not exists pack_binding_certifications (
  id text primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  provisioning_run_id text not null,
  pack_compatibility_check_id text not null,
  certification_state text not null,
  authority_summary jsonb not null default '{}'::jsonb,
  denial_reasons jsonb not null default '[]'::jsonb,
  certified_by_actor_id uuid references actors(id),
  certified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists idx_pack_binding_certifications_scope on pack_binding_certifications(tenant_id, firm_id, certification_state);

create table if not exists service_activation_records (
  id text primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  provisioning_run_id text not null,
  pack_binding_certification_id text not null,
  service_id text not null,
  activation_state text not null,
  risk_class text not null,
  responsible_professional_id text,
  jurisdiction text,
  failure_reasons jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_service_activation_records_scope on service_activation_records(tenant_id, firm_id, activation_state);