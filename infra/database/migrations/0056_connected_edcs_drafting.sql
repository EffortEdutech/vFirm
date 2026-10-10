-- CE-S8 (ADR-107, 2026-10-10): Connected EDCS -- governed drafting into BizKick masters.
--
-- Two tables, same generic shape and write-side tenant backstop as 0050-0055:
--
--   edcs_company_profiles  at most one row per firm (natural_key 'company'): the company details the owner
--                          types once (legal name, registration no., TIN, address, bank) and the defaults
--                          (tax rate, payment days...). They fill the Setup sheet of every working copy.
--   edcs_template_drafts   one row per drafted document: the values entered, the Number-Authority ID it was
--                          given, the generated .xlsx (base64, hash recorded) and its approval / delivery
--                          state. States: PENDING_APPROVAL -> APPROVED -> DELIVERED, or REJECTED / CANCELLED.
--                          A row is never deleted by the application.
--
-- The BizKick master files are not stored or changed here; the filler copies an embedded read-only master.

create table if not exists edcs_company_profiles (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_edcs_company_profiles_natural_key on edcs_company_profiles(tenant_id, firm_id, natural_key);
create index if not exists idx_edcs_company_profiles_scope on edcs_company_profiles(tenant_id, firm_id);

create table if not exists edcs_template_drafts (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table edcs_template_drafts
  add column if not exists status_c text generated always as (record->>'status') stored,
  add column if not exists transaction_id_c text generated always as (record->>'transaction_id') stored,
  add column if not exists template_id_c text generated always as (record->>'template_id') stored;

create unique index if not exists idx_edcs_template_drafts_natural_key on edcs_template_drafts(tenant_id, firm_id, natural_key);
-- One draft per Transaction ID: a number can only ever carry one document.
create unique index if not exists idx_edcs_template_drafts_tx on edcs_template_drafts(tenant_id, firm_id, transaction_id_c);
create index if not exists idx_edcs_template_drafts_scope on edcs_template_drafts(tenant_id, firm_id);
create index if not exists idx_edcs_template_drafts_status on edcs_template_drafts(tenant_id, firm_id, status_c);

do $$
declare
  t text;
begin
  foreach t in array array['edcs_company_profiles', 'edcs_template_drafts'] loop
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
    execute 'grant select, insert, update, delete on edcs_company_profiles to vfirm_app';
    execute 'grant select, insert, update, delete on edcs_template_drafts to vfirm_app';
  end if;
end $$;
