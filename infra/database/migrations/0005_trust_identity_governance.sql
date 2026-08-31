create table if not exists firm_memberships (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  actor_id uuid not null references actors(id),
  person_id uuid references persons(id),
  role text not null,
  permissions jsonb not null default '[]'::jsonb,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, firm_id, actor_id, role)
);

create index if not exists idx_firm_memberships_actor on firm_memberships(actor_id);
create index if not exists idx_firm_memberships_tenant_firm on firm_memberships(tenant_id, firm_id);
create index if not exists idx_professional_authorities_actor_lookup on professional_authorities(tenant_id, firm_id, status);
