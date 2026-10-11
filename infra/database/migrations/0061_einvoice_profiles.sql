-- VI-S6 (ADR-114, 2026-10-11): e-Invoice readiness profiles -- one table, two kinds of row (record.kind).
--
-- Same generic shape and write-side tenant backstop as 0050-0060:
--
--   einvoice_profiles  SUPPLIER one per firm (natural_key supplier): the firm's own e-Invoice identifiers (SST, MSIC, address parts...)
--                      BUYER    one per buyer (natural_key buyer:<client:<id>|name:<name>>): TIN, ID, address, contact, public-buyer flag
--
-- vFirm only CHECKS invoices against these; nothing is submitted to MyInvois.

create table if not exists einvoice_profiles (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table einvoice_profiles
  add column if not exists kind_c text generated always as (record->>'kind') stored;

create unique index if not exists idx_einvoice_profiles_natural_key on einvoice_profiles(tenant_id, firm_id, natural_key);
create index if not exists idx_einvoice_profiles_scope on einvoice_profiles(tenant_id, firm_id, created_at);

do $$
declare
  t text;
begin
  foreach t in array array['einvoice_profiles'] loop
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

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'vfirm_app') then
    execute 'grant select, insert, update, delete on einvoice_profiles to vfirm_app';
  end if;
end $$;
