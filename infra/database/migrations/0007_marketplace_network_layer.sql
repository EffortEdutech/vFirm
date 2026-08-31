create table if not exists marketplace_listings (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  service_pack_id uuid not null references service_packs(id),
  listing_scope text not null default 'PRIVATE_NETWORK',
  title text not null,
  description text,
  qualification_requirements jsonb not null default '[]',
  commercial_model jsonb not null default '{}',
  visibility text not null default 'TRUSTED_NETWORK',
  status text not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists capacity_offers (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  service_pack_id uuid references service_packs(id),
  capacity_type text not null,
  pce_units numeric not null default 0,
  available_from timestamptz not null,
  available_until timestamptz,
  jurisdiction_refs jsonb not null default '[]',
  constraints jsonb not null default '{}',
  status text not null default 'OPEN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists collaboration_requests (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  requesting_firm_id uuid not null references firms(id),
  provider_firm_id uuid references firms(id),
  service_pack_id uuid references service_packs(id),
  project_id uuid references projects(id),
  capacity_offer_id uuid references capacity_offers(id),
  request_summary text not null,
  data_room_policy jsonb not null default '{}',
  status text not null default 'REQUESTED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists observatory_snapshots (
  id uuid primary key,
  tenant_id uuid references tenants(id),
  firm_id uuid references firms(id),
  snapshot_scope text not null,
  metrics jsonb not null default '{}',
  privacy_class text not null default 'AGGREGATED_INTERNAL',
  generated_at timestamptz not null default now()
);

create index if not exists idx_marketplace_listings_status on marketplace_listings(status, visibility);
create index if not exists idx_capacity_offers_status on capacity_offers(status, capacity_type);
create index if not exists idx_collaboration_requests_status on collaboration_requests(status);
create index if not exists idx_observatory_snapshots_scope on observatory_snapshots(snapshot_scope, generated_at);
