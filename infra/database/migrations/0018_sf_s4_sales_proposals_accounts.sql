create table if not exists commercial_skill_bindings (
  id uuid primary key, tenant_id uuid not null references tenants(id), firm_id uuid not null references firms(id),
  worker_template_code text not null, role_skill_ref text not null, worker_skill_ref text not null,
  input_schema_ref text not null, output_schema_ref text not null, supervisor_actor_id uuid not null references actors(id),
  permissions jsonb not null default '[]', forbidden_actions jsonb not null default '[]',
  status text not null default 'ACTIVE', version text not null default '1.0', created_at timestamptz not null default now(),
  metadata jsonb not null default '{}', unique(tenant_id, firm_id, worker_template_code, version)
);
create index if not exists idx_commercial_skill_bindings_scope on commercial_skill_bindings(tenant_id, firm_id, status);

create table if not exists sales_pipeline_records (
  id uuid primary key, tenant_id uuid not null references tenants(id), firm_id uuid not null references firms(id),
  enquiry_id uuid references front_desk_enquiries(id), relationship_id uuid references firm_client_relationships(id),
  intake_session_id uuid references intake_sessions(id), proposal_id uuid references proposals(id),
  opportunity_name text not null, stage text not null default 'NEW', estimated_value numeric not null default 0,
  currency text not null default 'MYR', probability_percent integer not null default 10,
  owner_actor_id uuid references actors(id), next_action text, next_action_due_at timestamptz,
  lost_reason text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), metadata jsonb not null default '{}',
  check (probability_percent between 0 and 100)
);
create index if not exists idx_sales_pipeline_scope on sales_pipeline_records(tenant_id, firm_id, stage);

create table if not exists proposal_dispatch_records (
  id uuid primary key, tenant_id uuid not null references tenants(id), firm_id uuid not null references firms(id),
  proposal_id uuid not null references proposals(id), recipient text not null, channel text not null,
  dispatch_status text not null default 'SENT', dispatched_by_actor_id uuid not null references actors(id),
  commercial_approval_id uuid not null references approvals(id), document_ref text not null,
  dispatched_at timestamptz not null, created_at timestamptz not null default now(), metadata jsonb not null default '{}'
);
create index if not exists idx_proposal_dispatch_scope on proposal_dispatch_records(tenant_id, firm_id, proposal_id);

create table if not exists expense_records (
  id uuid primary key, tenant_id uuid not null references tenants(id), firm_id uuid not null references firms(id),
  project_id uuid references projects(id), supplier text not null, description text not null,
  category text not null, amount numeric not null check (amount >= 0), currency text not null default 'MYR',
  expense_date date not null, receipt_ref text, status text not null default 'DRAFT_REVIEW_REQUIRED',
  prepared_by_actor_id uuid references actors(id), approved_by_actor_id uuid references actors(id),
  approved_at timestamptz, payment_instruction_ref text, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), metadata jsonb not null default '{}'
);
create index if not exists idx_expense_records_scope on expense_records(tenant_id, firm_id, status);

create table if not exists receivable_follow_ups (
  id uuid primary key, tenant_id uuid not null references tenants(id), firm_id uuid not null references firms(id),
  invoice_id uuid not null references invoices(id), channel text not null, subject text not null, message_body text not null,
  status text not null default 'DRAFT_REVIEW_REQUIRED', requires_human_review boolean not null default true,
  prepared_by_actor_id uuid references actors(id), approved_by_actor_id uuid references actors(id),
  sent_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), metadata jsonb not null default '{}',
  check (requires_human_review = true), check (status <> 'SENT')
);
create index if not exists idx_receivable_follow_ups_scope on receivable_follow_ups(tenant_id, firm_id, status);
