create table if not exists network_conflict_checks (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  requesting_firm_id uuid not null references firms(id),
  provider_firm_id uuid not null references firms(id),
  subject_profile_id uuid references network_professional_profiles(id),
  check_status text not null default 'PENDING',
  conflict_summary text,
  evidence_refs jsonb not null default '[]',
  checked_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create table if not exists network_qualification_gates (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  requesting_firm_id uuid not null references firms(id),
  provider_firm_id uuid not null references firms(id),
  professional_network_profile_id uuid references network_professional_profiles(id),
  firm_network_profile_id uuid references network_firm_profiles(id),
  capability_id uuid references network_capabilities(id),
  credential_id uuid references network_credentials(id),
  conflict_check_id uuid references network_conflict_checks(id),
  jurisdiction_ref text not null,
  credential_status text not null default 'MISSING',
  jurisdiction_status text not null default 'NOT_CHECKED',
  insurance_status text not null default 'NOT_CHECKED',
  conflict_status text not null default 'NOT_CHECKED',
  capacity_status text not null default 'NOT_CHECKED',
  policy_status text not null default 'NOT_CHECKED',
  gate_status text not null default 'PENDING',
  denial_reasons jsonb not null default '[]',
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create table if not exists specialist_invitations (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  requesting_firm_id uuid not null references firms(id),
  provider_firm_id uuid not null references firms(id),
  qualification_gate_id uuid not null references network_qualification_gates(id),
  capability_id uuid references network_capabilities(id),
  invitation_status text not null default 'READY_TO_SEND',
  denial_reasons jsonb not null default '[]',
  invited_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_network_conflict_checks_scope on network_conflict_checks(tenant_id, requesting_firm_id, provider_firm_id, check_status);
create index if not exists idx_network_qualification_gates_status on network_qualification_gates(tenant_id, requesting_firm_id, provider_firm_id, gate_status);
create index if not exists idx_specialist_invitations_status on specialist_invitations(tenant_id, requesting_firm_id, provider_firm_id, invitation_status);