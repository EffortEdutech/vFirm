-- CE-S5 (ADR-099, 2026-10-06): Connected EDCS -- Delegation of Authority.
--
-- One table. Each row is one immutable version of a firm's approval policy imported from the BizKick
-- Master Control Workbook (BK-SYS-003): the Approval Limits and Responsibility Matrix sheets, plus the
-- owner's confirmed approver-label -> role mapping and document-type -> limit mapping. A new import never
-- edits a row; it adds the next version and marks the previous one SUPERSEDED.
--
-- Same generic shape and write-side tenant backstop as 0050/0051/0052 (written directly by
-- apps/api/src/edcs-repository.mjs; every write transaction first sets app.current_tenant_id).
--
-- Exactly one version per firm can be ACTIVE: the partial unique index below is the backstop for the
-- application's own advisory lock.

create table if not exists approval_policies (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table approval_policies
  add column if not exists version_c integer generated always as ((record->>'version')::integer) stored,
  add column if not exists status_c text generated always as (record->>'status') stored,
  add column if not exists content_hash_c text generated always as (record->>'content_hash') stored;

create unique index if not exists idx_approval_policies_natural_key on approval_policies(tenant_id, firm_id, natural_key);
create unique index if not exists idx_approval_policies_version on approval_policies(tenant_id, firm_id, version_c);
create unique index if not exists idx_approval_policies_one_active on approval_policies(tenant_id, firm_id) where status_c = 'ACTIVE';
create index if not exists idx_approval_policies_scope on approval_policies(tenant_id, firm_id);

-- Write-side tenant backstop (same design as 0034, 0050, 0051 and 0052).
do $$
declare
  t text := 'approval_policies';
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

-- The app role needs the same privileges it has on the 0050-0052 tables (tables created in the SQL
-- editor do not inherit default privileges for vfirm_app).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'vfirm_app') then
    execute 'grant select, insert, update, delete on approval_policies to vfirm_app';
  end if;
end $$;
