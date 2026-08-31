create table if not exists pilot_feedback (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  pilot_user_id uuid references pilot_users(id),
  project_id uuid references projects(id),
  submitted_by_actor_id uuid references actors(id),
  feedback_type text not null default 'GENERAL',
  sentiment text not null default 'NEUTRAL',
  rating integer,
  subject text not null,
  feedback_text text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);
create index if not exists idx_pilot_feedback_tenant on pilot_feedback(tenant_id, created_at);
create index if not exists idx_pilot_feedback_project on pilot_feedback(project_id);

create table if not exists pilot_acceptance_reviews (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  reviewed_by_actor_id uuid references actors(id),
  review_scope text not null default 'FORMWORK_PILOT',
  criteria jsonb not null default '[]',
  decision text not null default 'PENDING',
  evidence_refs jsonb not null default '[]',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);
create index if not exists idx_pilot_acceptance_reviews_tenant on pilot_acceptance_reviews(tenant_id, decision);

create table if not exists pilot_improvement_items (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  feedback_id uuid references pilot_feedback(id),
  acceptance_review_id uuid references pilot_acceptance_reviews(id),
  owner_actor_id uuid references actors(id),
  item_type text not null default 'PRODUCT_IMPROVEMENT',
  priority text not null default 'P2',
  status text not null default 'OPEN',
  title text not null,
  description text,
  target_stage text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  metadata jsonb not null default '{}'
);
create index if not exists idx_pilot_improvement_items_tenant on pilot_improvement_items(tenant_id, status, priority);
create index if not exists idx_pilot_improvement_items_feedback on pilot_improvement_items(feedback_id);
