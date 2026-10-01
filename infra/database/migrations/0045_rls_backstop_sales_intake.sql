-- Phase 4d, slice 12 (2026-09-29): RLS backstop for Sales & Intake's 4 remaining tables:
-- leads, intake_sessions, proposals, price_build_ups. Per Phase 4c's second and tenth slices,
-- these are the domain's only tables not already covered by an earlier Phase 4d slice
-- (clients/firm_client_relationships were done in slice 1).
--
-- Call sites traced (confirmed by reading, not assumed):
--   - leads + intake_sessions INSERT: createIntakeSessionRecord() -- already had begin/commit;
--     had no setTenantContext -- now added right after begin.
--   - price_build_ups + proposals INSERT: createProposalRecord() -- already had begin/commit;
--     had no setTenantContext -- now added right after begin.
--   - proposals UPDATE (status -> APPROVED, + approvals insert): approveProposalRecord() --
--     already had begin/commit; had no setTenantContext -- now added right after begin.
--   - proposals UPDATE (status -> ACCEPTED, + engagements insert): acceptProposalRecord() --
--     already had setTenantContext from earlier engagements-domain work. No change needed.
--   - proposals UPDATE (status -> SENT): persistCommercialOperationsFromStore()'s
--     proposal_dispatch_records sync loop -- already had setTenantContext from slice 7 (noted
--     there at the time even though proposals had no RLS policy yet). No change needed.
--   - No individual write call site exists for price_build_ups or leads beyond the INSERTs
--     above; no UPDATE call site exists for intake_sessions or price_build_ups anywhere --
--     those tables get a real UPDATE check as a no-op safety net, consistent with every other
--     slice.
--
-- All 4 tables have tenant_id NOT NULL (confirmed locally), so no null-tenant exception is
-- needed.

do $$
declare
  t text;
begin
  foreach t in array array['leads', 'intake_sessions', 'proposals', 'price_build_ups']
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
