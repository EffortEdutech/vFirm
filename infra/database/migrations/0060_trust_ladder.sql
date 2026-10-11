-- VI-S5 (ADR-113, 2026-10-11): Trust Ladder -- one table, three kinds of row (record.kind).
--
-- Same generic shape and write-side tenant backstop as 0050-0059:
--
--   trust_ladder  PAIR   one per worker-skill (natural_key pair:<staff_code>|<skill_id>): stage, owner thresholds, history
--                 SHADOW one per shadow run (natural_key shadow:<id>): the worker's output kept OUT of Approval and Outbox,
--                        plus the owner's verdict (MATCHES / DIFFERS / WORSE)
--                 BATCH  one per batch approval (natural_key batch:<id>): the one attributable decision and the draft list

create table if not exists trust_ladder (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table trust_ladder
  add column if not exists kind_c text generated always as (record->>'kind') stored;

create unique index if not exists idx_trust_ladder_natural_key on trust_ladder(tenant_id, firm_id, natural_key);
create index if not exists idx_trust_ladder_scope on trust_ladder(tenant_id, firm_id, created_at);

do $$
declare
  t text;
begin
  foreach t in array array['trust_ladder'] loop
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
    execute 'grant select, insert, update, delete on trust_ladder to vfirm_app';
  end if;
end $$;
