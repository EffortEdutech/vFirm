create table if not exists responsibility_matrices (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  workspace_id uuid not null references collaboration_workspaces(id),
  requesting_firm_id uuid not null references firms(id),
  provider_firm_id uuid not null references firms(id),
  accountable_firm_id uuid not null references firms(id),
  responsible_professional_actor_id uuid not null references actors(id),
  reviewer_actor_id uuid references actors(id),
  approver_actor_id uuid not null references actors(id),
  permitted_worker_actions jsonb not null default '[]',
  regulated_scope text not null default 'CONTROLLED_SPECIALIST_CONTRIBUTION',
  approval_required boolean not null default true,
  matrix_status text not null default 'ACTIVE',
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  constraint chk_responsibility_matrix_approval_required check (approval_required = true),
  constraint chk_responsibility_matrix_worker_actions_array check (jsonb_typeof(permitted_worker_actions) = 'array')
);

create index if not exists idx_responsibility_matrices_workspace on responsibility_matrices(tenant_id, workspace_id, matrix_status);
create index if not exists idx_responsibility_matrices_firms on responsibility_matrices(tenant_id, requesting_firm_id, provider_firm_id, accountable_firm_id);