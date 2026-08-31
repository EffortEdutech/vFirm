-- vFirm MVP database schema plan artifact
-- Derived from docs/10_post_freeze_technical_design/DATABASE_SCHEMA_PLAN_v1.0.md
-- Provider target: PostgreSQL-compatible SQL. Review before applying to production.

create table if not exists tenants (
  id uuid primary key,
  name text not null,
  status text not null,
  isolation_policy_id uuid not null,
  default_region text not null,
  data_residency_policy text not null,
  billing_account_ref text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create table if not exists actors (
  id uuid primary key,
  actor_type text not null check (actor_type in ('HUMAN','AI_AGENT','SYSTEM','EXTERNAL_SERVICE')),
  person_id uuid,
  worker_instance_id uuid,
  system_id text,
  external_service_id text,
  tenant_id uuid references tenants(id),
  firm_id uuid,
  display_name text not null,
  status text not null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create table if not exists persons (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  identity_provider_subject text,
  legal_name text not null,
  preferred_name text,
  contact_refs jsonb not null default '[]',
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create table if not exists firms (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  name text not null,
  brand_id uuid,
  business_entity_id uuid,
  primary_principal_assignment_id uuid,
  lifecycle_state text not null,
  lifecycle_state_reason text,
  active_practices jsonb not null default '[]',
  configuration_version integer not null default 1,
  status text not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  created_by_actor_id uuid references actors(id),
  updated_at timestamptz not null default now(),
  updated_by_actor_id uuid references actors(id),
  data_classification text not null default 'INTERNAL',
  provenance jsonb not null default '{}',
  metadata jsonb not null default '{}'
);

create table if not exists professional_profiles (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  person_id uuid not null references persons(id),
  disciplines jsonb not null default '[]',
  specializations jsonb not null default '[]',
  jurisdictions jsonb not null default '[]',
  credential_refs jsonb not null default '[]',
  professional_status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists professional_authorities (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  professional_id uuid not null references professional_profiles(id),
  practice_id uuid not null,
  service_scope jsonb not null default '[]',
  jurisdiction_id uuid,
  permitted_actions jsonb not null default '[]',
  risk_limits jsonb not null default '[]',
  credential_refs jsonb not null default '[]',
  valid_from timestamptz not null,
  valid_to timestamptz,
  status text not null,
  policy_basis_ref text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists clients (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  client_type text not null check (client_type in ('ORGANIZATION','INDIVIDUAL')),
  name text not null,
  primary_contact_id uuid,
  confidentiality_class text not null default 'CLIENT_CONFIDENTIAL',
  status text not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create table if not exists leads (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  relationship_id uuid,
  source_channel text not null,
  requested_service_hint text,
  urgency text,
  qualification_status text not null,
  assigned_actor_id uuid references actors(id),
  created_from_conversation_ref text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create table if not exists intake_sessions (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  lead_id uuid not null references leads(id),
  service_id uuid,
  required_inputs jsonb not null default '[]',
  provided_inputs jsonb not null default '{}',
  missing_information_items jsonb not null default '[]',
  intake_status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists proposals (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  relationship_id uuid not null,
  service_id uuid not null,
  scope_summary text not null,
  price_build_up_id uuid,
  commercial_approval_id uuid,
  proposal_status text not null,
  valid_until timestamptz not null,
  issued_document_ref text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  relationship_id uuid not null,
  engagement_id uuid not null,
  service_id uuid not null,
  project_name text not null,
  project_state text not null,
  risk_class text not null,
  responsible_professional_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  project_id uuid references projects(id),
  work_package_id uuid,
  task_type text not null,
  input_ref text,
  output_ref text,
  assigned_actor_or_worker_ref uuid,
  state text not null,
  risk_class text not null,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  project_id uuid,
  relationship_id uuid,
  document_type text not null,
  title text not null,
  current_version_id uuid,
  status text not null,
  classification text not null,
  created_at timestamptz not null default now()
);

create table if not exists document_versions (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  document_id uuid not null references documents(id),
  version_label text not null,
  revision text not null,
  storage_ref text not null,
  hash text not null,
  created_by_actor_id uuid references actors(id),
  approved_by_approval_id uuid,
  supersedes_version_id uuid,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists evidence_bundles (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  project_id uuid,
  subject_type text not null,
  subject_id uuid not null,
  source_document_refs jsonb not null default '[]',
  input_refs jsonb not null default '[]',
  calculation_refs jsonb not null default '[]',
  qa_check_refs jsonb not null default '[]',
  policy_check_refs jsonb not null default '[]',
  review_notes_ref text,
  final_output_ref text,
  bundle_hash text not null,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists approvals (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  subject_type text not null,
  subject_id uuid not null,
  subject_version_or_hash text not null,
  requested_by_actor_id uuid not null references actors(id),
  approver_actor_id uuid references actors(id),
  approver_professional_id uuid,
  authority_id uuid references professional_authorities(id),
  decision text,
  conditions jsonb not null default '[]',
  evidence_bundle_id uuid references evidence_bundles(id),
  authentication_strength text,
  decided_at timestamptz,
  audit_event_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists policy_decisions (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid,
  policy_id text not null,
  policy_version text not null,
  actor_id uuid not null references actors(id),
  action text not null,
  resource_type text not null,
  resource_id uuid not null,
  context_ref text,
  result text not null,
  reasons jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists event_log (
  id uuid primary key,
  event_type text not null,
  event_version text not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  actor_id uuid not null references actors(id),
  actor_type text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid,
  aggregate_type text not null,
  aggregate_id uuid not null,
  aggregate_version integer,
  correlation_id uuid not null,
  causation_id uuid,
  idempotency_key text,
  payload jsonb not null default '{}',
  payload_ref text,
  payload_summary text not null,
  policy_decision_id uuid references policy_decisions(id),
  audit_event_id uuid,
  provenance jsonb not null default '{}'
);

create table if not exists audit_events (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid,
  actor_id uuid not null references actors(id),
  action text not null,
  resource_type text not null,
  resource_id uuid not null,
  resource_version integer,
  policy_decision_id uuid references policy_decisions(id),
  correlation_id uuid not null,
  causation_id uuid,
  occurred_at timestamptz not null default now(),
  summary text not null,
  evidence_ref text
);

create index if not exists idx_event_log_tenant_firm on event_log(tenant_id, firm_id);
create index if not exists idx_event_log_aggregate on event_log(aggregate_type, aggregate_id);
create index if not exists idx_event_log_correlation on event_log(correlation_id);
create unique index if not exists idx_event_log_idempotency on event_log(idempotency_key) where idempotency_key is not null;
create index if not exists idx_audit_events_tenant_firm on audit_events(tenant_id, firm_id);
create index if not exists idx_audit_events_correlation on audit_events(correlation_id);

create table if not exists firm_client_relationships (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  client_id uuid not null references clients(id),
  relationship_type text not null,
  status text not null,
  origin text,
  responsible_owner_actor_id uuid references actors(id),
  contracting_business_entity_id uuid,
  consent_or_legal_basis_ref text,
  conflict_check_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists price_build_ups (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  service_sku_id uuid,
  scope_inputs jsonb not null default '{}',
  human_effort_estimate numeric not null default 0,
  ai_runtime_estimate numeric not null default 0,
  specialist_cost_estimate numeric not null default 0,
  tool_cost_estimate numeric not null default 0,
  risk_contingency numeric not null default 0,
  platform_fee numeric not null default 0,
  margin_target numeric not null default 0,
  final_price numeric not null default 0,
  approval_required boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists engagements (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  relationship_id uuid not null references firm_client_relationships(id),
  proposal_id uuid not null references proposals(id),
  contract_ref text,
  scope_ref text,
  commercial_terms_ref text,
  acceptance_criteria_ref text,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists work_packages (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  project_id uuid not null references projects(id),
  service_step text not null,
  assigned_worker_instance_id uuid,
  assigned_human_actor_id uuid references actors(id),
  state text not null,
  required_evidence jsonb not null default '[]',
  approval_requirement_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists invoices (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  relationship_id uuid not null references firm_client_relationships(id),
  engagement_id uuid references engagements(id),
  project_id uuid references projects(id),
  invoice_number text not null,
  currency text not null,
  line_items jsonb not null default '[]',
  tax_summary jsonb not null default '{}',
  status text not null,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payment_statuses (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  invoice_id uuid not null references invoices(id),
  amount numeric not null default 0,
  currency text not null,
  provider_ref text,
  payment_status text not null,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
