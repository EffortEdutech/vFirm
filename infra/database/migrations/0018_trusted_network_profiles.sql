create table if not exists network_firm_profiles (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  display_name text not null,
  profile_scope text not null default 'TRUSTED_NETWORK_ONLY',
  network_status text not null default 'DRAFT',
  jurisdiction_refs jsonb not null default '[]',
  capability_refs jsonb not null default '[]',
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  constraint chk_network_firm_profile_scope check (profile_scope <> 'PUBLIC_MARKETPLACE')
);

create table if not exists network_professional_profiles (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  person_id uuid references persons(id),
  professional_profile_id uuid references professional_profiles(id),
  display_name text not null,
  profile_scope text not null default 'TRUSTED_NETWORK_ONLY',
  network_status text not null default 'DRAFT',
  authority_grant boolean not null default false,
  jurisdiction_refs jsonb not null default '[]',
  credential_refs jsonb not null default '[]',
  capability_refs jsonb not null default '[]',
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  constraint chk_network_professional_no_authority_grant check (authority_grant = false),
  constraint chk_network_professional_profile_scope check (profile_scope <> 'PUBLIC_MARKETPLACE')
);

create table if not exists network_capabilities (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  professional_network_profile_id uuid references network_professional_profiles(id),
  firm_network_profile_id uuid references network_firm_profiles(id),
  capability_code text not null,
  service_pack_ref text,
  jurisdiction_refs jsonb not null default '[]',
  visibility text not null default 'TRUSTED_NETWORK_ONLY',
  qualification_required boolean not null default true,
  status text not null default 'DRAFT',
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  constraint chk_network_capability_visibility check (visibility <> 'PUBLIC_MARKETPLACE' and visibility <> 'OPEN_MARKETPLACE'),
  constraint chk_network_capability_qualification_required check (qualification_required = true)
);

create table if not exists network_credentials (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  professional_network_profile_id uuid references network_professional_profiles(id),
  credential_type text not null,
  credential_name text not null,
  issuer text,
  jurisdiction_refs jsonb not null default '[]',
  verification_status text not null default 'RECORDED_UNVERIFIED',
  verified_by_actor_id uuid references actors(id),
  verified_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  evidence_refs jsonb not null default '[]',
  authority_grant boolean not null default false,
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  constraint chk_network_credential_no_authority_grant check (authority_grant = false)
);

create table if not exists network_trust_signals (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  subject_type text not null,
  subject_id uuid not null,
  signal_type text not null,
  signal_summary text not null,
  evidence_refs jsonb not null default '[]',
  trust_weight text not null default 'LOW',
  substitutes_for_credential boolean not null default false,
  status text not null default 'RECORDED',
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  constraint chk_network_trust_not_credential_substitute check (substitutes_for_credential = false)
);

create index if not exists idx_network_professional_profiles_scope on network_professional_profiles(tenant_id, firm_id, network_status);
create index if not exists idx_network_firm_profiles_scope on network_firm_profiles(tenant_id, firm_id, network_status);
create index if not exists idx_network_capabilities_scope on network_capabilities(tenant_id, firm_id, capability_code, status);
create index if not exists idx_network_credentials_scope on network_credentials(tenant_id, firm_id, verification_status);
create index if not exists idx_network_trust_signals_scope on network_trust_signals(tenant_id, firm_id, subject_type, subject_id);
