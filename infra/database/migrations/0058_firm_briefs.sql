-- VI-S2 (ADR-110, 2026-10-11): Owner Morning Brief -- one saved snapshot per firm per day.
--
-- Same generic shape and write-side tenant backstop as 0050-0057:
--
--   firm_briefs  one row per firm per day (natural_key = the Malaysia date, YYYY-MM-DD). The first brief saved
--                that day stays (insert-if-absent); the record holds the whole brief so history can be re-read
--                exactly as the owner saw it. Written by the 06:00 tick or by the owner's first open of the day.

create table if not exists firm_briefs (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table firm_briefs
  add column if not exists as_of_c text generated always as (record->>'as_of') stored;

create unique index if not exists idx_firm_briefs_natural_key on firm_briefs(tenant_id, firm_id, natural_key);
create index if not exists idx_firm_briefs_scope on firm_briefs(tenant_id, firm_id, as_of_c);

do $$
declare
  t text;
begin
  foreach t in array array['firm_briefs'] loop
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
    execute 'grant select, insert, update, delete on firm_briefs to vfirm_app';
  end if;
end $$;
