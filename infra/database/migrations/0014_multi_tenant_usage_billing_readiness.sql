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
create index if not exists idx_tenant_pilot_controls_tenant on tenant_pilot_controls(tenant_id, control_status);

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
create index if not exists idx_tenant_usage_events_tenant on tenant_usage_events(tenant_id, recorded_at);

create table if not exists billing_readiness_reviews (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  reviewed_by_actor_id uuid references actors(id),
  readiness_status text not null default 'NOT_READY',
  pricing_model text not null default 'PILOT_USAGE_REVIEW',
  checks jsonb not null default '[]',
  decision_summary text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);
create index if not exists idx_billing_readiness_reviews_tenant on billing_readiness_reviews(tenant_id, readiness_status);
