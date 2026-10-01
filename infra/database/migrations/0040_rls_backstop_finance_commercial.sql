-- Phase 4d, slice 7 (2026-09-29): RLS backstop for the 5 Finance & Commercial tables written
-- via persistCommercialOperationsFromStore()'s per-row bulk upsert (same shape as slice 4's
-- persistTechnicalDeliveryFromStore and slice 6's persistAdministrationFromStore):
-- commercial_skill_bindings, sales_pipeline_records, proposal_dispatch_records,
-- expense_records, receivable_follow_ups.
--
-- All 5 tables have tenant_id NOT NULL (confirmed locally), so no null-tenant exception is
-- needed. Every write for all 5 goes through that one function, which now calls
-- setTenantContext fresh before each row's statement (including the standalone
-- `update proposals set proposal_status='SENT'...` statement in the same loop, even though
-- `proposals` itself is out of scope here -- see store.mjs comment). So all 5 get a REAL
-- tenant check on both INSERT and UPDATE directly, no interim permissive step needed.
--
-- NOT included here: `proposals` (Sales & Intake domain, not yet RLS'd -- a separate future
-- slice), and `invoices`/`payment_statuses`/`payment_provider_configs`/
-- `subscription_packages`/`commercial_launch_controls`/`billing_readiness_reviews`/
-- `tenant_usage_events` (already migrated to the repositories/*.repo.mjs pattern in Phase 4c,
-- but that is a data-access-layer change, not an RLS one -- those tables' RLS coverage is
-- still open and out of scope for this slice).

do $$
declare
  t text;
begin
  foreach t in array array[
    'commercial_skill_bindings', 'sales_pipeline_records', 'proposal_dispatch_records',
    'expense_records', 'receivable_follow_ups'
  ]
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
