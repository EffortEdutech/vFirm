-- Phase 4d, slice 9 (2026-09-29): RLS backstop for the Pilot & Observatory domain's 15
-- tables: the 13 tables already wired onto the repository layer in Phase 4c
-- (pilot_users, support_cases, pilot_incidents, pilot_feedback, pilot_acceptance_reviews,
-- pilot_improvement_items, pilot_report_packs, stakeholder_review_boards,
-- stakeholder_review_decisions, pilot_expansion_cohorts, tenant_onboarding_plans,
-- release_candidate_gates, tenant_pilot_controls), plus observatory_snapshots (deliberately
-- excluded from slice 8) and pilot_handoff_records (its own dedicated write path).
--
-- Same finding as slice 8: most of this domain's ~23 write call sites in store.mjs had no
-- explicit begin/commit transaction at all (two already did -- createPilotIncidentRecord and
-- createStakeholderReviewDecisionRecord -- and only needed setTenantContext added). Every
-- other call site is now wrapped in begin/commit/rollback with setTenantContext called once
-- right after begin, same fix as slice 8.
--
-- observatory_snapshots.tenant_id is NULLABLE (confirmed locally) -- unlike every other table
-- in this slice -- because it can hold a platform-wide, cross-tenant snapshot. Its
-- insert/update checks use the null-tenant exception pattern from slice 2's `actors` table:
-- `tenant_id is null or tenant_id::text = current_setting(...)`. All 14 other tables have
-- tenant_id NOT NULL (confirmed locally), so they get the standard real check with no
-- exception.
--
-- Separately noted, not fixed here (out of scope for RLS): persistPilotHandoffFromStore()
-- (store.mjs) is defined but never called from savePostgresStore()'s persist sequence --
-- apparently dead code, distinct from the real, reachable createPilotHandoffRecord() write
-- path that this migration's pilot_handoff_records policies do cover. Flagged for cleanup,
-- not an RLS gap since dead code never executes.

do $$
declare
  t text;
begin
  foreach t in array array[
    'pilot_users', 'support_cases', 'pilot_incidents', 'pilot_feedback',
    'pilot_acceptance_reviews', 'pilot_improvement_items', 'pilot_report_packs',
    'stakeholder_review_boards', 'stakeholder_review_decisions', 'pilot_expansion_cohorts',
    'tenant_onboarding_plans', 'release_candidate_gates', 'tenant_pilot_controls',
    'pilot_handoff_records'
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

-- observatory_snapshots: nullable tenant_id, so INSERT/UPDATE allow a null tenant_id through
-- unconditionally (platform-wide snapshot) in addition to the normal tenant match.
alter table observatory_snapshots enable row level security;
alter table observatory_snapshots force row level security;

drop policy if exists observatory_snapshots_select_all on observatory_snapshots;
create policy observatory_snapshots_select_all on observatory_snapshots for select using (true);

drop policy if exists observatory_snapshots_delete_all on observatory_snapshots;
create policy observatory_snapshots_delete_all on observatory_snapshots for delete using (true);

drop policy if exists observatory_snapshots_insert_tenant_check on observatory_snapshots;
create policy observatory_snapshots_insert_tenant_check on observatory_snapshots for insert
  with check (tenant_id is null or tenant_id::text = current_setting('app.current_tenant_id', true));

drop policy if exists observatory_snapshots_update_tenant_check on observatory_snapshots;
create policy observatory_snapshots_update_tenant_check on observatory_snapshots for update
  using (true)
  with check (tenant_id is null or tenant_id::text = current_setting('app.current_tenant_id', true));
