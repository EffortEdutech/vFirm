-- ADR-090 W2 (B2, 2026-10-01): owner work requests -- the firm's front door.
--
-- A work request is the owner's brief (title, instructions, request type, optional client/project,
-- priority, due date, input file ids, triage suggestion) written by createWorkRequestRecord() in
-- apps/api/src/store.mjs. It waits in the Workdesk Inbox until the owner assigns it; assignment
-- creates an ad-hoc row in the existing `tasks` table (project_id may be null for INTERNAL firm work,
-- decision D2) and a workdesk item through the unchanged governed assignment path.
--
-- Same generic shape as 0027/0048 (id uuid pk, natural_key, tenant/firm scope, record jsonb),
-- written and read via WORK_INTAKE_RELATIONAL_TABLES / persistWorkIntakeFromStore /
-- readWorkIntakeRelational. Written only through the bulk upsert-sync loop, so -- like 0027/0048 --
-- no per-row RLS backstop; scope is enforced in the API on every command.

create table if not exists work_requests (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_work_requests_natural_key on work_requests(tenant_id, firm_id, natural_key);
create index if not exists idx_work_requests_scope on work_requests(tenant_id, firm_id);

alter table work_requests
  add column if not exists status_c text generated always as (record->>'status') stored,
  add column if not exists request_type_id_c text generated always as (record->>'request_type_id') stored,
  add column if not exists risk_class_c text generated always as (record->>'risk_class') stored;

create index if not exists idx_work_requests_status_c on work_requests(status_c);
