-- VI-S1 (ADR-109, 2026-10-11): Standing Instructions -- recurring work that raises itself once per period.
--
-- One table, same generic shape and write-side tenant backstop as 0050-0056:
--
--   standing_instructions  two kinds of row per firm:
--     kind INSTRUCTION  one row per standing instruction (schedule, input resolver, the work it raises,
--                       status ACTIVE / PAUSED / ARCHIVED, skipped periods)
--     kind SETTINGS     at most one row per firm (natural_key 'settings'): the firm's public holidays and weekend days
--
-- Each raised period is recorded in automation_rule_runs (kind SI_OCCURRENCE, key si|<id>|<period>), the CE-S3
-- table whose unique natural key already guarantees one claim per key. No change to that table is needed.

create table if not exists standing_instructions (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table standing_instructions
  add column if not exists kind_c text generated always as (record->>'kind') stored,
  add column if not exists status_c text generated always as (record->>'status') stored;

create unique index if not exists idx_standing_instructions_natural_key on standing_instructions(tenant_id, firm_id, natural_key);
create index if not exists idx_standing_instructions_scope on standing_instructions(tenant_id, firm_id);
create index if not exists idx_standing_instructions_active on standing_instructions(status_c) where kind_c = 'INSTRUCTION';

do $$
declare
  t text;
begin
  foreach t in array array['standing_instructions'] loop
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
    execute 'grant select, insert, update, delete on standing_instructions to vfirm_app';
  end if;
end $$;
