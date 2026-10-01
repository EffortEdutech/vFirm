-- Phase 4d, slice 2 (2026-09-29): RLS backstop for the `actors` table.
--
-- `actors` has exactly 2 real insert call sites in store.mjs (confirmed by reading, not
-- assumed):
--   1. ensureSystemActor() -- inserts the single fixed SYSTEM actor row (id
--      00000000-0000-0000-0000-000000000000, tenant_id left NULL) with
--      `on conflict (id) do nothing`. This runs inside savePostgresStore()'s generic,
--      multi-domain transaction on every store save app-wide -- NOT scoped to one tenant,
--      so setTenantContext() cannot be (and must not be) called around it.
--   2. provisionWorkerInstanceRecord() -- inserts a real AI_AGENT actor row scoped to
--      body.tenant_id, inside its own dedicated per-request transaction.
-- There is no `update actors` anywhere in store.mjs today.
--
-- Because of call site 1, a plain `tenant_id::text = current_setting(...)` check would
-- reject the SYSTEM actor's insert (NULL never equals the GUC) and break every single
-- store save in the app. So this slice's insert/update policies explicitly allow
-- `tenant_id is null` in addition to the normal tenant match -- a deliberate, narrow
-- exception for this table only, not a general pattern. The 2 call sites above are the
-- only code that can insert into this table, so this does not open a real gap: an
-- attacker would need code-level access to insert with a forged NULL tenant_id in the
-- first place, same as today.

alter table actors enable row level security;
alter table actors force row level security;

drop policy if exists actors_select_all on actors;
create policy actors_select_all on actors for select using (true);

drop policy if exists actors_delete_all on actors;
create policy actors_delete_all on actors for delete using (true);

drop policy if exists actors_insert_tenant_check on actors;
create policy actors_insert_tenant_check on actors for insert
  with check (tenant_id is null or tenant_id::text = current_setting('app.current_tenant_id', true));

drop policy if exists actors_update_tenant_check on actors;
create policy actors_update_tenant_check on actors for update
  using (true)
  with check (tenant_id is null or tenant_id::text = current_setting('app.current_tenant_id', true));
