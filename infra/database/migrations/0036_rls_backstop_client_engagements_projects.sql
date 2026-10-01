-- Phase 4d, slice 3 (2026-09-29): RLS backstop for engagements, projects, work_packages, tasks.
--
-- Scope of this slice, confirmed by reading every call site in store.mjs:
--   - INSERT: acceptProposalRecord() creates engagements; openProjectDeliveryRecord() creates
--     projects + work_packages + tasks -- both dedicated, single-tenant per-request
--     transactions (same shape as Phase 4d slice 1's createFirmRecord/createClientRecord), so
--     setTenantContext() can be (and has been) wired cleanly into both.
--   - UPDATE: unlike slice 1/2's tables, tasks and projects are each updated from several
--     separate call sites (startTaskRecord, completeTaskRecord, assignTaskToWorkerRecord,
--     produceTaskOutputRecord, issueProjectDeliverableRecord and others), some of which run a
--     single UPDATE with no explicit transaction at all today. Turning on a real tenant-check
--     UPDATE policy without first wiring setTenantContext into every one of those call sites
--     would break task/project state transitions outright -- exactly the kind of production
--     outage this phase is trying to avoid, not cause. So this slice deliberately leaves
--     UPDATE permissive (`using (true)`, no check) for all 4 tables, same as SELECT/DELETE --
--     unchanged from today's actual behavior. Wiring UPDATE call sites for tasks/projects one
--     by one is its own future slice.
--   - engagements and work_packages have no UPDATE call sites in the code at all today, so
--     their permissive UPDATE policy is currently inert; it's still added now for consistency
--     and so a future write added without RLS in mind fails closed once a real check is added
--     here later, not silently unprotected forever.
--
-- Out of scope for this slice, deliberately: technical_skill_bindings, drawing_review_records,
-- calculation_input_sets, technical_qa_findings, delivery_package_records. These 5 tables are
-- written through persistTechnicalDeliveryFromStore()'s bulk loop inside the generic,
-- multi-tenant savePostgresStore() transaction (one `insert ... on conflict (id) do update`
-- per row, looping over every tenant's rows in a single transaction) -- a real tenant check
-- here needs setTenantContext() called per-row inside that loop (legal, since set_config(...,
-- true) can be changed repeatedly within one transaction), not once per transaction. That is a
-- distinct, more invasive change and is its own future slice, not bundled into this one.

do $$
declare
  t text;
begin
  foreach t in array array['engagements', 'projects', 'work_packages', 'tasks']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists %I on %I', t || '_select_all', t);
    execute format('create policy %I on %I for select using (true)', t || '_select_all', t);
    execute format('drop policy if exists %I on %I', t || '_delete_all', t);
    execute format('create policy %I on %I for delete using (true)', t || '_delete_all', t);
    execute format('drop policy if exists %I on %I', t || '_update_all', t);
    execute format('create policy %I on %I for update using (true)', t || '_update_all', t);
    execute format('drop policy if exists %I on %I', t || '_insert_tenant_check', t);
    execute format(
      'create policy %I on %I for insert with check (tenant_id::text = current_setting(''app.current_tenant_id'', true))',
      t || '_insert_tenant_check', t
    );
  end loop;
end $$;
