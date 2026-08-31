create table if not exists support_cases (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  opened_by_actor_id uuid references actors(id),
  related_pilot_user_id uuid references pilot_users(id),
  case_type text not null default 'GENERAL_SUPPORT',
  severity text not null default 'NORMAL',
  status text not null default 'OPEN',
  subject text not null,
  description text,
  resolution_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  metadata jsonb not null default '{}'
);

create index if not exists idx_support_cases_tenant_status on support_cases(tenant_id, status, severity);
create index if not exists idx_support_cases_pilot_user on support_cases(related_pilot_user_id);
