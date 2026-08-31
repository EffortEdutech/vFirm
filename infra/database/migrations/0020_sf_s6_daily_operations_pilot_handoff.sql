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