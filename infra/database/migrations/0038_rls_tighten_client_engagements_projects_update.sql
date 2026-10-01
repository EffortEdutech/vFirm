-- Phase 4d, slice 5 (2026-09-29): tighten UPDATE on engagements, projects, work_packages,
-- tasks from permissive (slice 3) to a real tenant check, now that every update call site for
-- these 4 tables has been found and wired with setTenantContext:
--   - tasks: startTaskRecord, completeTaskRecord, assignTaskToWorkerRecord,
--     produceTaskOutputRecord (all in apps/api/src/store.mjs).
--   - projects: issueDeliverableRecord.
--   - engagements, work_packages: still no update call site in the code at all -- this
--     policy stays inert for them, same as slice 3, but is now a real check rather than a
--     placeholder so a future write added without RLS in mind fails closed immediately.
--
-- This supersedes the permissive `<table>_update_all` policy slice 3 created -- drop it and
-- replace with a real check, rather than leaving both in place (multiple permissive policies
-- for the same command are OR'd together, which would silently defeat the real check).

do $$
declare
  t text;
begin
  foreach t in array array['engagements', 'projects', 'work_packages', 'tasks']
  loop
    execute format('drop policy if exists %I on %I', t || '_update_all', t);
    execute format('drop policy if exists %I on %I', t || '_update_tenant_check', t);
    execute format(
      'create policy %I on %I for update using (true) with check (tenant_id::text = current_setting(''app.current_tenant_id'', true))',
      t || '_update_tenant_check', t
    );
  end loop;
end $$;
