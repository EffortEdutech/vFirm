-- VI-S3 (ADR-111, 2026-10-11): Evidence Passport -- one row per issued passport.
--
-- Same generic shape and write-side tenant backstop as 0050-0057:
--
--   evidence_passports  one row per issued Evidence Passport (natural_key = the passport id). The row holds the
--                       purpose, selection, seal, hashes and what was included or left out; the sealed zip itself is a
--                       file_objects row. Passports are never edited after issue except for the download counter.

create table if not exists evidence_passports (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table evidence_passports
  add column if not exists status_c text generated always as (record->>'status') stored;

create unique index if not exists idx_evidence_passports_natural_key on evidence_passports(tenant_id, firm_id, natural_key);
create index if not exists idx_evidence_passports_scope on evidence_passports(tenant_id, firm_id, created_at);

do $$
declare
  t text;
begin
  foreach t in array array['evidence_passports'] loop
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
    execute 'grant select, insert, update, delete on evidence_passports to vfirm_app';
  end if;
end $$;
