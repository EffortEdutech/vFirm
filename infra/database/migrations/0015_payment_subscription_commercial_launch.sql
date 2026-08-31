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
create index if not exists idx_payment_provider_configs_tenant on payment_provider_configs(tenant_id, config_status);

create table if not exists subscription_packages (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  created_by_actor_id uuid references actors(id),
  package_code text not null,
  package_name text not null,
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
create index if not exists idx_subscription_packages_tenant on subscription_packages(tenant_id, package_status);

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
create index if not exists idx_commercial_launch_controls_tenant on commercial_launch_controls(tenant_id, launch_status);
