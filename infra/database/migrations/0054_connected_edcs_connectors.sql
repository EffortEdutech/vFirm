-- CE-S6 (ADR-101, 2026-10-06): Connected EDCS -- the connector agent's identity and health.
--
-- One table. Each row is one connector registered by a firm owner: its firm scope, the SHA-256 of its
-- token (the token itself is shown once and never stored), its status (ACTIVE or REVOKED) and the last
-- heartbeat snapshot it reported (last seen, last run, queue length, errors). A token is rotated or revoked
-- by changing this row; every sync a connector sends is attributed to its id in the sync run's record.
--
-- Same generic shape and write-side tenant backstop as 0050-0053 (written directly by
-- apps/api/src/edcs-repository.mjs; every write transaction first sets app.current_tenant_id). The token
-- hash lookup at authentication time reads across tenants (select is open, as on the other EDCS tables),
-- which is why the hash index is global and unique.

create table if not exists edcs_connectors (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table edcs_connectors
  add column if not exists token_hash_c text generated always as (record->>'token_hash') stored,
  add column if not exists status_c text generated always as (record->>'status') stored;

create unique index if not exists idx_edcs_connectors_natural_key on edcs_connectors(tenant_id, firm_id, natural_key);
create unique index if not exists idx_edcs_connectors_token_hash on edcs_connectors(token_hash_c) where token_hash_c is not null;
create index if not exists idx_edcs_connectors_scope on edcs_connectors(tenant_id, firm_id);

-- Write-side tenant backstop (same design as 0034, 0050, 0051, 0052 and 0053).
do $$
declare
  t text := 'edcs_connectors';
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

-- The app role needs the same privileges it has on the 0050-0053 tables (tables created in the SQL
-- editor do not inherit default privileges for vfirm_app).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'vfirm_app') then
    execute 'grant select, insert, update, delete on edcs_connectors to vfirm_app';
  end if;
end $$;
