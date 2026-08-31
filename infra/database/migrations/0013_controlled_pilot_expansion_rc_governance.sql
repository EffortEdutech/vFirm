create table if not exists pilot_expansion_cohorts (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  stakeholder_decision_id uuid references stakeholder_review_decisions(id),
  created_by_actor_id uuid references actors(id),
  cohort_name text not null,
  expansion_status text not null default 'PROPOSED',
  max_tenants integer not null default 1,
  max_pilot_users integer not null default 5,
  entry_criteria jsonb not null default '[]',
  risk_controls jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);
create index if not exists idx_pilot_expansion_cohorts_tenant on pilot_expansion_cohorts(tenant_id, expansion_status);

create table if not exists tenant_onboarding_plans (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  expansion_cohort_id uuid references pilot_expansion_cohorts(id),
  assigned_operator_actor_id uuid references actors(id),
  onboarding_status text not null default 'DRAFT',
  onboarding_steps jsonb not null default '[]',
  readiness_checks jsonb not null default '[]',
  target_start_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb not null default '{}'
);
create index if not exists idx_tenant_onboarding_plans_tenant on tenant_onboarding_plans(tenant_id, onboarding_status);
create index if not exists idx_tenant_onboarding_plans_cohort on tenant_onboarding_plans(expansion_cohort_id);

create table if not exists release_candidate_gates (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  expansion_cohort_id uuid references pilot_expansion_cohorts(id),
  reviewed_by_actor_id uuid references actors(id),
  release_candidate text not null default 'RC-LOCAL-PILOT',
  gate_status text not null default 'PENDING',
  required_checks jsonb not null default '[]',
  evidence_refs jsonb not null default '[]',
  decision_summary text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  metadata jsonb not null default '{}'
);
create index if not exists idx_release_candidate_gates_tenant on release_candidate_gates(tenant_id, gate_status);
create index if not exists idx_release_candidate_gates_cohort on release_candidate_gates(expansion_cohort_id);
