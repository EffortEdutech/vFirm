create table if not exists worker_templates (
  id uuid primary key,
  code text not null unique,
  name text not null,
  version text not null,
  default_tools jsonb not null default '[]',
  default_budget jsonb not null default '{}',
  risk_envelope jsonb not null default '{}',
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists worker_instances (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  worker_template_id uuid not null references worker_templates(id),
  actor_id uuid references actors(id),
  name text not null,
  assigned_services jsonb not null default '[]',
  tool_allowlist jsonb not null default '[]',
  budget_envelope jsonb not null default '{}',
  risk_limits jsonb not null default '{}',
  runtime_status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists task_outputs (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  project_id uuid references projects(id),
  task_id uuid not null references tasks(id),
  worker_instance_id uuid not null references worker_instances(id),
  output_ref text not null,
  output_schema_ref text not null,
  evidence_refs jsonb not null default '[]',
  quality_flags jsonb not null default '[]',
  requires_human_review boolean not null default true,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists tool_invocations (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  worker_instance_id uuid not null references worker_instances(id),
  task_id uuid references tasks(id),
  tool_name text not null,
  invocation_status text not null,
  input_summary text,
  output_ref text,
  cost_estimate numeric not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_worker_instances_tenant_firm on worker_instances(tenant_id, firm_id);
create index if not exists idx_task_outputs_task on task_outputs(task_id);
create index if not exists idx_tool_invocations_worker_task on tool_invocations(worker_instance_id, task_id);
