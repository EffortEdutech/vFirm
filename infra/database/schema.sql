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


create table if not exists marketplace_listings (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  service_pack_id uuid not null references service_packs(id),
  listing_scope text not null default 'PRIVATE_NETWORK',
  title text not null,
  description text,
  qualification_requirements jsonb not null default '[]',
  commercial_model jsonb not null default '{}',
  visibility text not null default 'TRUSTED_NETWORK',
  status text not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists capacity_offers (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  service_pack_id uuid references service_packs(id),
  capacity_type text not null,
  pce_units numeric not null default 0,
  available_from timestamptz not null,
  available_until timestamptz,
  jurisdiction_refs jsonb not null default '[]',
  constraints jsonb not null default '{}',
  status text not null default 'OPEN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists collaboration_requests (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  requesting_firm_id uuid not null references firms(id),
  provider_firm_id uuid references firms(id),
  service_pack_id uuid references service_packs(id),
  project_id uuid references projects(id),
  capacity_offer_id uuid references capacity_offers(id),
  request_summary text not null,
  data_room_policy jsonb not null default '{}',
  status text not null default 'REQUESTED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists observatory_snapshots (
  id uuid primary key,
  tenant_id uuid references tenants(id),
  firm_id uuid references firms(id),
  snapshot_scope text not null,
  metrics jsonb not null default '{}',
  privacy_class text not null default 'AGGREGATED_INTERNAL',
  generated_at timestamptz not null default now()
);

create index if not exists idx_marketplace_listings_status on marketplace_listings(status, visibility);
create index if not exists idx_capacity_offers_status on capacity_offers(status, capacity_type);
create index if not exists idx_collaboration_requests_status on collaboration_requests(status);
create index if not exists idx_observatory_snapshots_scope on observatory_snapshots(snapshot_scope, generated_at);


create table if not exists pilot_users (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  person_id uuid references persons(id),
  actor_id uuid references actors(id),
  email text not null,
  display_name text not null,
  pilot_role text not null default 'PILOT_OPERATOR',
  invite_status text not null default 'INVITED',
  auth_provider text,
  external_subject text,
  invited_at timestamptz not null default now(),
  activated_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'
);

create unique index if not exists idx_pilot_users_tenant_email on pilot_users(tenant_id, lower(email));
create index if not exists idx_pilot_users_status on pilot_users(invite_status, pilot_role);

create table if not exists support_cases (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  opened_by_actor_id uuid references actors(id),
  related_pilot_user_id uuid references pilot_users(id),
  case_type text not null default 'GENERAL_SUPPORT',
  severity text not null default 'NORMAL',
  status text not null default 'OPEN',
  subject text not null,
  description text,
  resolution_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  metadata jsonb not null default '{}'
);

create index if not exists idx_support_cases_tenant_status on support_cases(tenant_id, status, severity);
create index if not exists idx_support_cases_pilot_user on support_cases(related_pilot_user_id);

create table if not exists pilot_incidents (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  support_case_id uuid references support_cases(id),
  project_id uuid references projects(id),
  opened_by_actor_id uuid references actors(id),
  incident_type text not null default 'OPERATIONAL',
  severity text not null default 'SEV3',
  status text not null default 'OPEN',
  title text not null,
  description text,
  detection_source text not null default 'operator',
  impact_summary text,
  mitigation_summary text,
  root_cause_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata jsonb not null default '{}'
);
create index if not exists idx_pilot_incidents_tenant_status on pilot_incidents(tenant_id, status, severity);
create index if not exists idx_pilot_incidents_support_case on pilot_incidents(support_case_id);
create index if not exists idx_pilot_incidents_project on pilot_incidents(project_id);


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


create table if not exists tenant_pilot_controls (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  created_by_actor_id uuid references actors(id),
  control_status text not null default 'ACTIVE',
  plan_code text not null default 'PILOT_FREE_CONTROLLED',
  limits jsonb not null default '{}',
  billing_readiness text not null default 'NOT_READY',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);
create index if not exists idx_tenant_pilot_controls_tenant on tenant_pilot_controls(tenant_id, control_status);

create table if not exists tenant_usage_events (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  actor_id uuid references actors(id),
  usage_type text not null,
  quantity numeric not null default 1,
  unit text not null default 'event',
  source_ref text,
  recorded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);
create index if not exists idx_tenant_usage_events_tenant on tenant_usage_events(tenant_id, recorded_at);

create table if not exists billing_readiness_reviews (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  reviewed_by_actor_id uuid references actors(id),
  readiness_status text not null default 'NOT_READY',
  pricing_model text not null default 'PILOT_USAGE_REVIEW',
  checks jsonb not null default '[]',
  decision_summary text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);
create index if not exists idx_billing_readiness_reviews_tenant on billing_readiness_reviews(tenant_id, readiness_status);


create table if not exists payment_provider_configs (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  configured_by_actor_id uuid references actors(id),
  provider_name text not null default 'stripe',
  provider_mode text not null default 'test',
  config_status text not null default 'DRAFT',
  capabilities jsonb not null default '[]',
  required_env jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);
create index if not exists idx_payment_provider_configs_tenant on payment_provider_configs(tenant_id, config_status);

create table if not exists subscription_packages (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  created_by_actor_id uuid references actors(id),
  package_code text not null,
  package_name text not null,
  package_status text not null default 'DRAFT',
  pricing_model text not null default 'SUBSCRIPTION_PLUS_USAGE',
  base_price numeric not null default 0,
  currency text not null default 'MYR',
  usage_limits jsonb not null default '{}',
  features jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);
create index if not exists idx_subscription_packages_tenant on subscription_packages(tenant_id, package_status);

create table if not exists commercial_launch_controls (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid references firms(id),
  payment_provider_config_id uuid references payment_provider_configs(id),
  subscription_package_id uuid references subscription_packages(id),
  reviewed_by_actor_id uuid references actors(id),
  launch_status text not null default 'BLOCKED',
  required_controls jsonb not null default '[]',
  decision_summary text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  metadata jsonb not null default '{}'
);
create index if not exists idx_commercial_launch_controls_tenant on commercial_launch_controls(tenant_id, launch_status);


-- SF-S2 Front Desk relational persistence
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

-- SF-S3 Administration and Document Control
create table if not exists administration_skill_bindings (
  id uuid primary key, tenant_id uuid not null references tenants(id), firm_id uuid not null references firms(id),
  worker_template_code text not null, role_skill_ref text not null, worker_skill_ref text not null,
  input_schema_ref text not null, output_schema_ref text not null, supervisor_actor_id uuid not null references actors(id),
  permissions jsonb not null default '[]', forbidden_actions jsonb not null default '[]',
  status text not null default 'ACTIVE', version text not null default '1.0', created_at timestamptz not null default now(), metadata jsonb not null default '{}'
);
create index if not exists idx_admin_skill_bindings_scope on administration_skill_bindings(tenant_id, firm_id, status);

create table if not exists correspondence_records (
  id uuid primary key, tenant_id uuid not null references tenants(id), firm_id uuid not null references firms(id),
  relationship_id uuid references firm_client_relationships(id), project_id uuid references projects(id),
  direction text not null, channel text not null, subject text not null, correspondent text not null,
  received_or_drafted_at timestamptz not null, status text not null, owner_actor_id uuid references actors(id),
  response_due_at timestamptz, source_ref text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), metadata jsonb not null default '{}'
);
create index if not exists idx_correspondence_scope on correspondence_records(tenant_id, firm_id, status);

create table if not exists document_register_entries (
  id uuid primary key, tenant_id uuid not null references tenants(id), firm_id uuid not null references firms(id),
  relationship_id uuid references firm_client_relationships(id), project_id uuid references projects(id),
  document_number text not null, title text not null, document_type text not null, discipline text,
  classification text not null default 'CLIENT_CONFIDENTIAL', status text not null default 'ACTIVE',
  current_revision_id uuid, owner_actor_id uuid references actors(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}', unique(tenant_id, firm_id, document_number)
);
create index if not exists idx_document_register_scope on document_register_entries(tenant_id, firm_id, status);

create table if not exists document_revision_records (
  id uuid primary key, tenant_id uuid not null references tenants(id), firm_id uuid not null references firms(id),
  document_register_entry_id uuid not null references document_register_entries(id),
  revision text not null, version_label text not null, storage_ref text not null, content_hash text not null,
  status text not null default 'CURRENT', supersedes_revision_id uuid references document_revision_records(id),
  created_by_actor_id uuid references actors(id), created_at timestamptz not null default now(),
  metadata jsonb not null default '{}', unique(document_register_entry_id, revision)
);
alter table document_register_entries drop constraint if exists document_register_entries_current_revision_id_fkey;
alter table document_register_entries add constraint document_register_entries_current_revision_id_fkey foreign key (current_revision_id) references document_revision_records(id);

create table if not exists administrative_deadlines (
  id uuid primary key, tenant_id uuid not null references tenants(id), firm_id uuid not null references firms(id),
  project_id uuid references projects(id), relationship_id uuid references firm_client_relationships(id),
  title text not null, due_at timestamptz not null, priority text not null default 'NORMAL',
  status text not null default 'OPEN', assigned_actor_or_worker_ref uuid, source_ref text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), completed_at timestamptz, metadata jsonb not null default '{}'
);
create index if not exists idx_admin_deadlines_scope on administrative_deadlines(tenant_id, firm_id, status, due_at);

create table if not exists transmittal_drafts (
  id uuid primary key, tenant_id uuid not null references tenants(id), firm_id uuid not null references firms(id),
  project_id uuid references projects(id), relationship_id uuid references firm_client_relationships(id),
  recipient text not null, subject text not null, document_revision_refs jsonb not null default '[]',
  message_body text not null, status text not null default 'DRAFT_REVIEW_REQUIRED',
  requires_principal_approval boolean not null default true, prepared_by_actor_id uuid references actors(id),
  approved_by_actor_id uuid references actors(id), issued_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), metadata jsonb not null default '{}',
  check (requires_principal_approval = true), check (status <> 'ISSUED')
);
create index if not exists idx_transmittal_drafts_scope on transmittal_drafts(tenant_id, firm_id, status);

-- SF-S4 Sales, Proposals, and Accounts
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

-- SF-S5 Technical Drawing and Delivery Support
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

-- SF-S6 Daily Operations and Pilot Handoff
create table if not exists pilot_handoff_records (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  accepted_by_actor_id uuid not null references actors(id),
  rehearsal_ref text not null,
  handoff_status text not null,
  checklist jsonb not null default '[]'::jsonb,
  evidence_refs jsonb not null default '[]'::jsonb,
  decision_summary text,
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists idx_pilot_handoff_records_scope on pilot_handoff_records(tenant_id, firm_id, handoff_status);

create table if not exists network_firm_profiles (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  display_name text not null,
  profile_scope text not null default 'TRUSTED_NETWORK_ONLY',
  network_status text not null default 'DRAFT',
  jurisdiction_refs jsonb not null default '[]',
  capability_refs jsonb not null default '[]',
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  constraint chk_network_firm_profile_scope check (profile_scope <> 'PUBLIC_MARKETPLACE')
);

create table if not exists network_professional_profiles (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  person_id uuid references persons(id),
  professional_profile_id uuid references professional_profiles(id),
  display_name text not null,
  profile_scope text not null default 'TRUSTED_NETWORK_ONLY',
  network_status text not null default 'DRAFT',
  authority_grant boolean not null default false,
  jurisdiction_refs jsonb not null default '[]',
  credential_refs jsonb not null default '[]',
  capability_refs jsonb not null default '[]',
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  constraint chk_network_professional_no_authority_grant check (authority_grant = false),
  constraint chk_network_professional_profile_scope check (profile_scope <> 'PUBLIC_MARKETPLACE')
);

create table if not exists network_capabilities (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  professional_network_profile_id uuid references network_professional_profiles(id),
  firm_network_profile_id uuid references network_firm_profiles(id),
  capability_code text not null,
  service_pack_ref text,
  jurisdiction_refs jsonb not null default '[]',
  visibility text not null default 'TRUSTED_NETWORK_ONLY',
  qualification_required boolean not null default true,
  status text not null default 'DRAFT',
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  constraint chk_network_capability_visibility check (visibility <> 'PUBLIC_MARKETPLACE' and visibility <> 'OPEN_MARKETPLACE'),
  constraint chk_network_capability_qualification_required check (qualification_required = true)
);

create table if not exists network_credentials (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  professional_network_profile_id uuid references network_professional_profiles(id),
  credential_type text not null,
  credential_name text not null,
  issuer text,
  jurisdiction_refs jsonb not null default '[]',
  verification_status text not null default 'RECORDED_UNVERIFIED',
  verified_by_actor_id uuid references actors(id),
  verified_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  evidence_refs jsonb not null default '[]',
  authority_grant boolean not null default false,
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  constraint chk_network_credential_no_authority_grant check (authority_grant = false)
);

create table if not exists network_trust_signals (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  subject_type text not null,
  subject_id uuid not null,
  signal_type text not null,
  signal_summary text not null,
  evidence_refs jsonb not null default '[]',
  trust_weight text not null default 'LOW',
  substitutes_for_credential boolean not null default false,
  status text not null default 'RECORDED',
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  constraint chk_network_trust_not_credential_substitute check (substitutes_for_credential = false)
);

create index if not exists idx_network_professional_profiles_scope on network_professional_profiles(tenant_id, firm_id, network_status);
create index if not exists idx_network_firm_profiles_scope on network_firm_profiles(tenant_id, firm_id, network_status);
create index if not exists idx_network_capabilities_scope on network_capabilities(tenant_id, firm_id, capability_code, status);
create index if not exists idx_network_credentials_scope on network_credentials(tenant_id, firm_id, verification_status);
create index if not exists idx_network_trust_signals_scope on network_trust_signals(tenant_id, firm_id, subject_type, subject_id);

create table if not exists network_conflict_checks (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  requesting_firm_id uuid not null references firms(id),
  provider_firm_id uuid not null references firms(id),
  subject_profile_id uuid references network_professional_profiles(id),
  check_status text not null default 'PENDING',
  conflict_summary text,
  evidence_refs jsonb not null default '[]',
  checked_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create table if not exists network_qualification_gates (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  requesting_firm_id uuid not null references firms(id),
  provider_firm_id uuid not null references firms(id),
  professional_network_profile_id uuid references network_professional_profiles(id),
  firm_network_profile_id uuid references network_firm_profiles(id),
  capability_id uuid references network_capabilities(id),
  credential_id uuid references network_credentials(id),
  conflict_check_id uuid references network_conflict_checks(id),
  jurisdiction_ref text not null,
  credential_status text not null default 'MISSING',
  jurisdiction_status text not null default 'NOT_CHECKED',
  insurance_status text not null default 'NOT_CHECKED',
  conflict_status text not null default 'NOT_CHECKED',
  capacity_status text not null default 'NOT_CHECKED',
  policy_status text not null default 'NOT_CHECKED',
  gate_status text not null default 'PENDING',
  denial_reasons jsonb not null default '[]',
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create table if not exists specialist_invitations (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  requesting_firm_id uuid not null references firms(id),
  provider_firm_id uuid not null references firms(id),
  qualification_gate_id uuid not null references network_qualification_gates(id),
  capability_id uuid references network_capabilities(id),
  invitation_status text not null default 'READY_TO_SEND',
  denial_reasons jsonb not null default '[]',
  invited_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_network_conflict_checks_scope on network_conflict_checks(tenant_id, requesting_firm_id, provider_firm_id, check_status);
create index if not exists idx_network_qualification_gates_status on network_qualification_gates(tenant_id, requesting_firm_id, provider_firm_id, gate_status);
create index if not exists idx_specialist_invitations_status on specialist_invitations(tenant_id, requesting_firm_id, provider_firm_id, invitation_status);

create table if not exists collaboration_workspaces (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  requesting_firm_id uuid not null references firms(id),
  provider_firm_id uuid not null references firms(id),
  specialist_invitation_id uuid not null references specialist_invitations(id),
  qualification_gate_id uuid references network_qualification_gates(id),
  workspace_status text not null default 'ACTIVE',
  data_room_policy jsonb not null default '{}',
  permitted_evidence_refs jsonb not null default '[]',
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create table if not exists collaboration_workspace_participants (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  workspace_id uuid not null references collaboration_workspaces(id),
  firm_id uuid not null references firms(id),
  actor_id uuid references actors(id),
  participant_role text not null default 'SPECIALIST',
  access_status text not null default 'ACTIVE',
  permissions jsonb not null default '[]',
  granted_by_actor_id uuid references actors(id),
  granted_at timestamptz not null default now(),
  revoked_by_actor_id uuid references actors(id),
  revoked_at timestamptz,
  metadata jsonb not null default '{}'
);

create table if not exists collaboration_workspace_evidence (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  workspace_id uuid not null references collaboration_workspaces(id),
  participant_id uuid not null references collaboration_workspace_participants(id),
  evidence_ref text not null,
  evidence_type text not null default 'CONTROLLED_EVIDENCE_REF',
  access_scope text not null default 'WORKSPACE_ONLY',
  added_by_actor_id uuid references actors(id),
  added_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  constraint chk_collaboration_workspace_evidence_scope check (access_scope = 'WORKSPACE_ONLY')
);

create index if not exists idx_collaboration_workspaces_scope on collaboration_workspaces(tenant_id, requesting_firm_id, provider_firm_id, workspace_status);
create index if not exists idx_collaboration_participants_status on collaboration_workspace_participants(tenant_id, workspace_id, access_status);
create index if not exists idx_collaboration_evidence_scope on collaboration_workspace_evidence(tenant_id, workspace_id, access_scope);

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

create table if not exists specialist_assignments (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  workspace_id uuid not null references collaboration_workspaces(id),
  responsibility_matrix_id uuid not null references responsibility_matrices(id),
  requesting_firm_id uuid not null references firms(id),
  provider_firm_id uuid not null references firms(id),
  assignment_title text not null,
  assignment_scope text not null,
  assignment_status text not null default 'REQUESTED',
  requested_by_actor_id uuid references actors(id),
  accepted_by_actor_id uuid references actors(id),
  started_by_actor_id uuid references actors(id),
  delivered_by_actor_id uuid references actors(id),
  reviewed_by_actor_id uuid references actors(id),
  approved_by_actor_id uuid references actors(id),
  closed_by_actor_id uuid references actors(id),
  evidence_refs jsonb not null default '[]',
  review_summary text,
  approval_summary text,
  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  started_at timestamptz,
  delivered_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  closed_at timestamptz,
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  constraint chk_specialist_assignment_status check (assignment_status in ('REQUESTED','ACCEPTED','IN_PROGRESS','DELIVERED','REVIEWED','APPROVED','CLOSED')),
  constraint chk_specialist_assignment_evidence_array check (jsonb_typeof(evidence_refs) = 'array')
);

create index if not exists idx_specialist_assignments_matrix on specialist_assignments(tenant_id, responsibility_matrix_id, assignment_status);
create index if not exists idx_specialist_assignments_firms on specialist_assignments(tenant_id, requesting_firm_id, provider_firm_id, assignment_status);
