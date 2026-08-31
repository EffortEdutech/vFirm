create table if not exists pilot_users (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  person_id uuid references persons(id),
  actor_id uuid references actors(id),
  email text not null,
  display_name text not null,
  pilot_role text not null default 'PILOT_OPERATOR',
  invite_status text not null default 'INVITED',
  auth_provider text,
  external_subject text,
  invited_at timestamptz not null default now(),
  activated_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'
);

create unique index if not exists idx_pilot_users_tenant_email on pilot_users(tenant_id, lower(email));
create index if not exists idx_pilot_users_status on pilot_users(invite_status, pilot_role);
