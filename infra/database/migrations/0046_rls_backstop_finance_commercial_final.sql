-- Phase 4d, slice 13 (2026-09-29): RLS backstop for the last remaining domain -- Finance &
-- Commercial's 7 tables that were migrated to the repository-layer pattern in Phase 4c but
-- never given RLS: invoices, payment_statuses, payment_provider_configs, subscription_packages,
-- commercial_launch_controls, billing_readiness_reviews, tenant_usage_events. (Slice 7's
-- "Finance & Commercial (5 tables)" migration, 0040, covered a different 5-table group written
-- only through the bulk upsert loop -- commercial_skill_bindings, sales_pipeline_records,
-- proposal_dispatch_records, expense_records, receivable_follow_ups -- and explicitly does not
-- touch these 7.)
--
-- Call sites traced (confirmed by reading, not assumed):
--   - invoices INSERT: createInvoiceRecord() -- already had begin/commit; had no
--     setTenantContext -- now added right after begin.
--   - invoices UPDATE (status -> ISSUED): issueInvoiceRecord() -- had NO explicit transaction
--     at all (single autocommitted UPDATE) -- now wrapped in begin/commit/rollback with
--     setTenantContext.
--   - payment_statuses INSERT + invoices UPDATE (status -> PAID/PAYMENT_PENDING):
--     recordPaymentStatusRecord() -- already had begin/commit; had no setTenantContext -- now
--     added right after begin.
--   - payment_provider_configs INSERT: createPaymentProviderConfigRecord() -- had no explicit
--     transaction at all -- now wrapped.
--   - subscription_packages INSERT: createSubscriptionPackageRecord() -- had no explicit
--     transaction at all -- now wrapped.
--   - commercial_launch_controls INSERT: createCommercialLaunchControlRecord() -- had no
--     explicit transaction at all -- now wrapped.
--   - tenant_usage_events INSERT: recordTenantUsageEventRecord() -- had no explicit
--     transaction at all -- now wrapped.
--   - billing_readiness_reviews INSERT: createBillingReadinessReviewRecord() -- had no
--     explicit transaction at all -- now wrapped.
--   - No UPDATE call site exists anywhere for payment_provider_configs, subscription_packages,
--     commercial_launch_controls, tenant_usage_events, or billing_readiness_reviews -- those
--     get a real UPDATE check as a no-op safety net, consistent with every other slice.
--
-- All 7 tables have tenant_id NOT NULL (confirmed locally), so no null-tenant exception is
-- needed. This is the final slice of Phase 4d's write-side RLS backstop rollout -- every
-- domain identified in Phase 4c now has RLS coverage on its individually-viable write call
-- sites.

do $$
declare
  t text;
begin
  foreach t in array array[
    'invoices', 'payment_statuses', 'payment_provider_configs', 'subscription_packages',
    'commercial_launch_controls', 'billing_readiness_reviews', 'tenant_usage_events'
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
