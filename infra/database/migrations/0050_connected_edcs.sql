-- CE-S1 (ADR-095, 2026-10-05): Connected EDCS -- register import and sync ledger.
--
-- BizKick is the source, the Bridge (integration contract v1.0) is the contract, vFirm is the
-- governed record. These five tables hold what vFirm has received from a firm's BizKick Smart
-- Transaction Register and a complete, append-only account of every import:
--
--   edcs_connections               one per firm: company code, BizKick version, topology, content policy (D7)
--   edcs_transactions              one per (tenant, firm, transaction_id): the governed current record
--   edcs_transaction_revisions     every accepted revision / correction with its row snapshot (history, never overwritten)
--   edcs_sync_runs                 one per register import: source file id + SHA-256, counts per outcome, actor, times
--   edcs_sync_events               one per row per run (plus owner conflict resolutions): outcome, reasons, fingerprints
--
-- Same generic shape as 0027/0048/0049 (id uuid pk, natural_key, tenant/firm scope, record jsonb) with
-- generated columns for the fields the API filters on. Unlike 0048/0049 (written only through the bulk
-- whole-store sync), these tables are written DIRECTLY by apps/api/src/edcs-repository.mjs so register
-- volume never adds to the whole-store load/save cost. Every write transaction first sets the
-- `app.current_tenant_id` session GUC (repositories/shared/db.mjs setTenantContext), so -- like the
-- 0034..0046 backstops -- insert/update carry a database-level tenant check that fails closed; select
-- and delete stay permissive (reads are scoped by tenant_id + firm_id in every repository query, and
-- the test-firm purge deletes tenant-wide).

create table if not exists edcs_connections (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists edcs_transactions (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists edcs_transaction_revisions (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists edcs_sync_runs (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists edcs_sync_events (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One connection per firm; the joining key of a transaction is (tenant, firm, transaction_id).
create unique index if not exists idx_edcs_connections_natural_key on edcs_connections(tenant_id, firm_id, natural_key);
create unique index if not exists idx_edcs_transactions_natural_key on edcs_transactions(tenant_id, firm_id, natural_key);
create unique index if not exists idx_edcs_transaction_revisions_natural_key on edcs_transaction_revisions(tenant_id, firm_id, natural_key);
create unique index if not exists idx_edcs_sync_runs_natural_key on edcs_sync_runs(tenant_id, firm_id, natural_key);
create unique index if not exists idx_edcs_sync_events_natural_key on edcs_sync_events(tenant_id, firm_id, natural_key);

create index if not exists idx_edcs_connections_scope on edcs_connections(tenant_id, firm_id);
create index if not exists idx_edcs_transactions_scope on edcs_transactions(tenant_id, firm_id);
create index if not exists idx_edcs_transaction_revisions_scope on edcs_transaction_revisions(tenant_id, firm_id);
create index if not exists idx_edcs_sync_runs_scope on edcs_sync_runs(tenant_id, firm_id);
create index if not exists idx_edcs_sync_events_scope on edcs_sync_events(tenant_id, firm_id);

alter table edcs_connections
  add column if not exists company_code_c text generated always as (record->>'company_code') stored;

alter table edcs_transactions
  add column if not exists document_type_c text generated always as (record->>'document_type') stored,
  add column if not exists status_c text generated always as (record->>'status') stored,
  add column if not exists has_conflict_c boolean generated always as (jsonb_typeof(record->'held_conflict') = 'object') stored;

alter table edcs_transaction_revisions
  add column if not exists transaction_id_c text generated always as (record->>'transaction_id') stored;

alter table edcs_sync_runs
  add column if not exists status_c text generated always as (record->>'status') stored,
  add column if not exists source_sha256_c text generated always as (record->>'source_sha256') stored;

alter table edcs_sync_events
  add column if not exists run_id_c text generated always as (record->>'run_id') stored,
  add column if not exists transaction_id_c text generated always as (record->>'transaction_id') stored,
  add column if not exists outcome_c text generated always as (record->>'outcome') stored;

create index if not exists idx_edcs_transactions_status_c on edcs_transactions(tenant_id, firm_id, status_c);
create index if not exists idx_edcs_transactions_type_c on edcs_transactions(tenant_id, firm_id, document_type_c);
create index if not exists idx_edcs_transaction_revisions_tx_c on edcs_transaction_revisions(tenant_id, firm_id, transaction_id_c);
create index if not exists idx_edcs_sync_events_run_c on edcs_sync_events(tenant_id, firm_id, run_id_c);
create index if not exists idx_edcs_sync_events_tx_c on edcs_sync_events(tenant_id, firm_id, transaction_id_c);

-- Write-side tenant backstop (same design as 0034).
do $$
declare
  t text;
begin
  foreach t in array array['edcs_connections', 'edcs_transactions', 'edcs_transaction_revisions', 'edcs_sync_runs', 'edcs_sync_events']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists %I on %I', t || '_select_all', t);
    execute format('create policy %I on %I for select using (true)', t || '_select_all', t);
    execute format('drop policy if exists %I on %I', t || '_delete_all', t);
    execute format('create policy %I on %I for delete using (true)', t || '_delete_all', t);
    execute format('drop policy if exists %I on %I', t || '_insert_tenant_check', t);
    execute format(
      'create policy %I on %I for insert with check (tenant_id::text = current_setting(''app.current_tenant_id'', true))',
      t || '_insert_tenant_check', t
    );
    execute format('drop policy if exists %I on %I', t || '_update_tenant_check', t);
    execute format(
      'create policy %I on %I for update using (true) with check (tenant_id::text = current_setting(''app.current_tenant_id'', true))',
      t || '_update_tenant_check', t
    );
  end loop;
end $$;
