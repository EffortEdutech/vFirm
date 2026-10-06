-- CE-S4 (ADR-098, 2026-10-05): Connected EDCS -- Number Authority.
--
-- One table. Each row is one reservation of a Transaction ID (company code, document type, year,
-- sequence) handed out by vFirm so two people can never receive the same number (BizKick QA BK-QA-002).
-- States RESERVED -> REGISTERED (an imported register row carries the ID) or VOID. Rows are never
-- deleted by the application, which is what keeps a voided number from being issued again.
--
-- Same generic shape and write-side tenant backstop as 0050/0051 (written directly by
-- apps/api/src/edcs-repository.mjs; every write transaction first sets app.current_tenant_id).
--
-- The real guarantee against duplicate numbers is the unique index on
-- (tenant_id, firm_id, company_code_c, document_type_c, year_c, sequence_c). The API also takes a
-- transaction-scoped advisory lock per (firm, company, type, year) so concurrent reservations queue
-- instead of colliding, and retries on a unique violation as a backstop.

create table if not exists edcs_number_reservations (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table edcs_number_reservations
  add column if not exists company_code_c text generated always as (record->>'company_code') stored,
  add column if not exists document_type_c text generated always as (record->>'document_type') stored,
  add column if not exists year_c integer generated always as ((record->>'year')::integer) stored,
  add column if not exists sequence_c integer generated always as ((record->>'sequence')::integer) stored,
  add column if not exists status_c text generated always as (record->>'status') stored,
  add column if not exists transaction_id_c text generated always as (record->>'transaction_id') stored;

create unique index if not exists idx_edcs_number_reservations_natural_key on edcs_number_reservations(tenant_id, firm_id, natural_key);
create unique index if not exists idx_edcs_number_reservations_sequence on edcs_number_reservations(tenant_id, firm_id, company_code_c, document_type_c, year_c, sequence_c);
create index if not exists idx_edcs_number_reservations_scope on edcs_number_reservations(tenant_id, firm_id);
create index if not exists idx_edcs_number_reservations_status_c on edcs_number_reservations(tenant_id, firm_id, status_c);
create index if not exists idx_edcs_number_reservations_tx_c on edcs_number_reservations(tenant_id, firm_id, transaction_id_c);

-- Write-side tenant backstop (same design as 0034, 0050 and 0051).
do $$
declare
  t text := 'edcs_number_reservations';
begin
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
end $$;

-- The app role needs the same privileges it has on the 0050/0051 tables (tables created in the SQL
-- editor do not inherit default privileges for vfirm_app).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'vfirm_app') then
    execute 'grant select, insert, update, delete on edcs_number_reservations to vfirm_app';
  end if;
end $$;
