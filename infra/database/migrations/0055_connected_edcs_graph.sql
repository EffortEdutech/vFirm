-- CE-S7 (ADR-106, 2026-10-08): Connected EDCS -- the Microsoft 365 (OneDrive / SharePoint) connection.
--
-- One table, at most one row per firm (natural_key 'graph'). The row holds the consent details the owner
-- entered (Microsoft tenant id, app id, the one document library and folder vFirm may read), the sync
-- state (delta link, last run, status) and the app secret ENCRYPTED with AES-256-GCM under the server key
-- VFIRM_SECRET_KEY. The key is never in the database. Disconnecting wipes the encrypted secret.
--
-- Same generic shape and write-side tenant backstop as 0050-0054.

create table if not exists edcs_graph_connections (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table edcs_graph_connections
  add column if not exists status_c text generated always as (record->>'status') stored;

create unique index if not exists idx_edcs_graph_connections_natural_key on edcs_graph_connections(tenant_id, firm_id, natural_key);
create index if not exists idx_edcs_graph_connections_scope on edcs_graph_connections(tenant_id, firm_id);
create index if not exists idx_edcs_graph_connections_status on edcs_graph_connections(status_c);

do $$
declare
  t text := 'edcs_graph_connections';
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

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'vfirm_app') then
    execute 'grant select, insert, update, delete on edcs_graph_connections to vfirm_app';
  end if;
end $$;
