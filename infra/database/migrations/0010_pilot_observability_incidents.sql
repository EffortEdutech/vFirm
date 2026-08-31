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
