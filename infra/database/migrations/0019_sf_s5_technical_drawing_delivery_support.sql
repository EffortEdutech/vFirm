create table if not exists technical_skill_bindings (
  id uuid primary key, tenant_id uuid not null references tenants(id), firm_id uuid not null references firms(id),
  worker_template_code text not null, role_skill_ref text not null, worker_skill_ref text not null,
  input_schema_ref text not null, output_schema_ref text not null, supervisor_actor_id uuid not null references actors(id),
  permissions jsonb not null default '[]', forbidden_actions jsonb not null default '[]',
  status text not null default 'ACTIVE', version text not null default '1.0', created_at timestamptz not null default now(),
  metadata jsonb not null default '{}', unique(tenant_id, firm_id, worker_template_code, version)
);
create index if not exists idx_technical_skill_bindings_scope on technical_skill_bindings(tenant_id, firm_id, status);

create table if not exists drawing_review_records (
  id uuid primary key, tenant_id uuid not null references tenants(id), firm_id uuid not null references firms(id),
  project_id uuid not null references projects(id), document_register_entry_id uuid not null references document_register_entries(id),
  base_revision_id uuid not null references document_revision_records(id), compared_revision_id uuid not null references document_revision_records(id),
  check_results jsonb not null default '[]', status text not null, prepared_by_actor_id uuid references actors(id),
  requires_professional_review boolean not null default true, created_at timestamptz not null default now(), metadata jsonb not null default '{}',
  check (requires_professional_review = true)
);
create index if not exists idx_drawing_reviews_scope on drawing_review_records(tenant_id, firm_id, project_id, status);

create table if not exists calculation_input_sets (
  id uuid primary key, tenant_id uuid not null references tenants(id), firm_id uuid not null references firms(id),
  project_id uuid not null references projects(id), intake_session_id uuid references intake_sessions(id),
  source_revision_refs jsonb not null default '[]', input_values jsonb not null default '{}',
  unit_system text not null default 'SI', validation_results jsonb not null default '[]',
  validation_status text not null, deterministic_engine_ref text not null,
  prepared_by_actor_id uuid references actors(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);
create index if not exists idx_calculation_inputs_scope on calculation_input_sets(tenant_id, firm_id, project_id, validation_status);

create table if not exists technical_qa_findings (
  id uuid primary key, tenant_id uuid not null references tenants(id), firm_id uuid not null references firms(id),
  project_id uuid not null references projects(id), subject_type text not null, subject_id uuid not null,
  finding_code text not null, severity text not null, description text not null, status text not null default 'OPEN',
  raised_by_actor_id uuid references actors(id), resolved_by_actor_id uuid references actors(id),
  resolution_summary text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), resolved_at timestamptz,
  metadata jsonb not null default '{}'
);
create index if not exists idx_technical_qa_scope on technical_qa_findings(tenant_id, firm_id, project_id, status, severity);

create table if not exists delivery_package_records (
  id uuid primary key, tenant_id uuid not null references tenants(id), firm_id uuid not null references firms(id),
  project_id uuid not null references projects(id), drawing_revision_refs jsonb not null default '[]',
  calculation_input_set_id uuid not null references calculation_input_sets(id), qa_finding_refs jsonb not null default '[]',
  evidence_refs jsonb not null default '[]', readiness_checks jsonb not null default '[]',
  package_status text not null, requires_professional_review boolean not null default true,
  prepared_by_actor_id uuid references actors(id), professional_approval_id uuid references approvals(id),
  issued_document_version_id uuid references document_versions(id), created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), metadata jsonb not null default '{}',
  check (requires_professional_review = true), check (package_status <> 'ISSUED')
);
create index if not exists idx_delivery_packages_scope on delivery_package_records(tenant_id, firm_id, project_id, package_status);
