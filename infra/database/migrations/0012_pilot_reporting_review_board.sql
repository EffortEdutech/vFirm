create table if not exists pilot_report_packs (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  generated_by_actor_id uuid references actors(id),
  report_scope text not null default 'FORMWORK_PILOT',
  report_status text not null default 'GENERATED',
  summary jsonb not null default '{}',
  export_manifest jsonb not null default '{}',
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);
create index if not exists idx_pilot_report_packs_tenant on pilot_report_packs(tenant_id, created_at);

create table if not exists stakeholder_review_boards (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  report_pack_id uuid references pilot_report_packs(id),
  chaired_by_actor_id uuid references actors(id),
  board_name text not null default 'Pilot Stakeholder Review Board',
  review_status text not null default 'OPEN',
  agenda jsonb not null default '[]',
  attendees jsonb not null default '[]',
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  metadata jsonb not null default '{}'
);
create index if not exists idx_stakeholder_review_boards_tenant on stakeholder_review_boards(tenant_id, review_status);

create table if not exists stakeholder_review_decisions (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  board_id uuid not null references stakeholder_review_boards(id),
  decided_by_actor_id uuid references actors(id),
  decision text not null default 'PENDING',
  decision_summary text,
  conditions jsonb not null default '[]',
  next_stage text,
  decided_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);
create index if not exists idx_stakeholder_review_decisions_board on stakeholder_review_decisions(board_id, decided_at);
