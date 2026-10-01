-- Phase 4d, slice 10 (2026-09-29): RLS backstop for My Team/HR's 3 real tables:
-- worker_instances, task_outputs, tool_invocations. Per Phase 4c's eighth slice, these are
-- the ONLY 3 of this domain's 22 tables with an individually viable write call site -- the
-- other 19 write exclusively through the generic bulk upsert-sync loop already confirmed
-- non-viable for RLS wiring (same as Firm Factory Provisioning), and worker_templates is
-- seed-only. Those 19 tables plus worker_templates are explicitly NOT covered by this
-- migration.
--
-- Call sites traced (confirmed by reading, not assumed):
--   - worker_instances INSERT: provisionWorkerInstanceRecord() -- already had begin/commit and
--     setTenantContext from slice 2 (it inserts actors and worker_instances in the same
--     transaction), so no store.mjs change needed for this INSERT.
--   - worker_instances UPDATE: activateWorkerInstanceRecord() -- had no explicit transaction at
--     all; now wrapped in begin/commit/rollback with setTenantContext.
--   - task_outputs INSERT: produceTaskOutputRecord() -- already had begin/commit and
--     setTenantContext (it also updates tasks in the same transaction), so no store.mjs change
--     needed. No UPDATE call site exists anywhere for task_outputs.
--   - tool_invocations INSERT: requestToolInvocationRecord() -- had no explicit transaction at
--     all; now wrapped in begin/commit/rollback with setTenantContext. No UPDATE call site
--     exists anywhere for tool_invocations.
--
-- All 3 tables have tenant_id NOT NULL (confirmed locally), so no null-tenant exception is
-- needed. All 3 get real INSERT and UPDATE checks (UPDATE is a no-op safety net for the 2
-- tables with no UPDATE call site today).

do $$
declare
  t text;
begin
  foreach t in array array['worker_instances', 'task_outputs', 'tool_invocations']
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
