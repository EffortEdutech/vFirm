create table if not exists front_desk_enquiries (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  source_channel text not null,
  contact_name text not null,
  organization_name text,
  contact_email text,
  contact_phone text,
  enquiry_summary text not null,
  requested_service_hint text,
  urgency text not null default 'STANDARD',
  status text not null default 'NEW',
  qualification_reason text,
  consent_or_legal_basis_ref text,
  conflict_check_status text not null default 'NOT_CHECKED',
  conflict_check_ref text,
  assigned_actor_id uuid references actors(id),
  client_id uuid references clients(id),
  relationship_id uuid references firm_client_relationships(id),
  lead_id uuid references leads(id),
  intake_session_id uuid references intake_sessions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);
create index if not exists idx_front_desk_enquiries_scope on front_desk_enquiries(tenant_id, firm_id, status);

create table if not exists client_communication_drafts (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  enquiry_id uuid not null references front_desk_enquiries(id),
  channel text not null,
  subject text not null,
  body text not null,
  status text not null default 'DRAFT_REVIEW_REQUIRED',
  requires_human_review boolean not null default true,
  prepared_by_actor_id uuid references actors(id),
  approved_by_actor_id uuid references actors(id),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  check (requires_human_review = true),
  check (status <> 'SENT')
);
create index if not exists idx_client_communication_drafts_scope on client_communication_drafts(tenant_id, firm_id, status);
