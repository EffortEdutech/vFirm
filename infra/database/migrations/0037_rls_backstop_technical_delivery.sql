-- Phase 4d, slice 4 (2026-09-29): RLS backstop for the 5 remaining Client Engagements &
-- Projects (Technical Delivery) tables: technical_skill_bindings, drawing_review_records,
-- calculation_input_sets, technical_qa_findings, delivery_package_records.
--
-- Unlike every table in slices 1-3, these 5 have exactly ONE write path each -- store.mjs's
-- persistTechnicalDeliveryFromStore(), an `insert ... on conflict (id) do update` per row,
-- looping over every tenant's rows in the store inside savePostgresStore()'s shared,
-- multi-tenant transaction. Both create and update for these tables go through that same
-- statement, so store.mjs now calls setTenantContext(client, x.tenant_id) fresh before each
-- row's upsert (legal: set_config(..., true) can be changed repeatedly within one
-- transaction). Because every write -- not just insert -- is covered by that one statement,
-- this slice can safely give all 5 tables a REAL tenant check on both INSERT and UPDATE, not
-- just insert like the tables in slice 3 that still have unwired update call sites elsewhere.
--
-- All 5 tables have tenant_id NOT NULL (confirmed locally), so no null-tenant exception is
-- needed here (unlike slice 2's actors table).

do $$
declare
  t text;
begin
  foreach t in array array['technical_skill_bindings', 'drawing_review_records', 'calculation_input_sets', 'technical_qa_findings', 'delivery_package_records']
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
