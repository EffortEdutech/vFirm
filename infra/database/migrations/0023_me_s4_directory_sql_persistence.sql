create table if not exists directory_review_board_decisions (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  provider_firm_id uuid not null references firms(id),
  listing_id uuid not null references marketplace_listings(id),
  qualification_gate_id uuid references network_qualification_gates(id),
  board_ref text not null,
  decision text not null,
  decision_summary text not null,
  evidence_refs jsonb not null default '[]',
  decided_by_actor_id uuid references actors(id),
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create table if not exists directory_private_enquiries (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  requesting_firm_id uuid not null references firms(id),
  provider_firm_id uuid not null references firms(id),
  listing_id uuid not null references marketplace_listings(id),
  enquiry_summary text not null,
  status text not null default 'ENQUIRY_RECORDED',
  matching_mode text not null default 'MANUAL_REVIEW_ONLY',
  no_live_matching boolean not null default true,
  no_ranking boolean not null default true,
  no_award boolean not null default true,
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create table if not exists qualification_renewal_reviews (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  provider_firm_id uuid not null references firms(id),
  qualification_gate_id uuid not null references network_qualification_gates(id),
  listing_id uuid not null references marketplace_listings(id),
  credential_id uuid references network_credentials(id),
  jurisdiction_ref text,
  review_status text not null,
  expires_at timestamptz,
  next_review_due_at timestamptz,
  evidence_refs jsonb not null default '[]',
  reviewed_by_actor_id uuid references actors(id),
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

alter table collaboration_requests add column if not exists metadata jsonb not null default '{}';

create index if not exists idx_directory_review_board_decisions_scope on directory_review_board_decisions(tenant_id, provider_firm_id, listing_id, decision);
create index if not exists idx_directory_private_enquiries_scope on directory_private_enquiries(tenant_id, requesting_firm_id, provider_firm_id, listing_id, status);
create index if not exists idx_qualification_renewal_reviews_scope on qualification_renewal_reviews(tenant_id, provider_firm_id, qualification_gate_id, listing_id, review_status);
create index if not exists idx_collaboration_requests_directory_metadata on collaboration_requests using gin (metadata);