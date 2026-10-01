-- Phase 4d, slice 1 (2026-09-29): Postgres RLS as a database-level backstop for tenant
-- isolation (finding A.4: "Zero enable row level security / create policy statements
-- anywhere ... tenant isolation is enforced exclusively in application code").
--
-- Scope of this slice: the 7 tables written through exactly one transactional call site
-- each (createFirmRecord: firms/persons/professional_profiles/professional_authorities/
-- firm_memberships; createClientRecord: clients/firm_client_relationships) -- confirmed by
-- reading every insert/update call site in store.mjs, not assumed. `actors` is deliberately
-- NOT included here: it is written from multiple domains (Directory & Firm Setup, My
-- Team/HR's worker provisioning, the system-actor bootstrap) and needs every one of those
-- call sites updated together in its own slice, not partially covered here.
--
-- Design (see claude/vfirm-architecture-review.md, Phase 4d for the full reasoning):
--   - The app's own Postgres role owns these tables, so plain RLS would not apply to its
--     own connection at all (Postgres skips RLS for the table owner by default) --
--     `FORCE ROW LEVEL SECURITY` is required to make it bite on the app's own writes too.
--   - Reads and deletes currently flow entirely through store.mjs's loadPostgresStore(),
--     which intentionally loads all tenants' rows in one unscoped query and filters to the
--     actor's tenant in application memory (JS). A read/delete policy restricted by tenant
--     would silently break that path everywhere. So SELECT and DELETE get an explicit
--     permissive `using (true)` policy -- unchanged from today's actual behavior -- and
--     only INSERT/UPDATE (the write path already routed through this session's per-request
--     transactional `client`) get a real tenant check. This is deliberately a write-side
--     backstop only; read-side tenant enforcement at the database level is blocked on
--     Phase 4f (retiring the load-everything-then-filter-in-JS bridge) and is out of scope
--     here.
--   - The tenant check compares the row's tenant_id against the session GUC
--     `app.current_tenant_id`, set via `select set_config('app.current_tenant_id', $1,
--     true)` (transaction-local) immediately after `begin` in every write path this slice
--     touches (repositories/shared/db.mjs's new setTenantContext() helper, called from
--     store.mjs's createFirmRecord/createClientRecord). `current_setting(..., true)`
--     returns null when unset, and `tenant_id::text = null` is never true -- so a write
--     that forgets to set the GUC is rejected outright (fail-closed), not silently
--     unenforced.

do $$
declare
  t text;
begin
  foreach t in array array['firms', 'persons', 'professional_profiles', 'professional_authorities', 'firm_memberships', 'clients', 'firm_client_relationships']
  loop
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
