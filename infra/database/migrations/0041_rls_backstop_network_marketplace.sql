-- Phase 4d, slice 8 (2026-09-29): RLS backstop for the 19 Network & Marketplace tables:
-- marketplace_listings, directory_review_board_decisions, directory_private_enquiries,
-- qualification_renewal_reviews, capacity_offers, collaboration_requests,
-- network_professional_profiles, network_firm_profiles, network_capabilities,
-- network_credentials, network_trust_signals, network_conflict_checks,
-- network_qualification_gates, specialist_invitations, collaboration_workspaces,
-- collaboration_workspace_participants, collaboration_workspace_evidence,
-- responsibility_matrices, specialist_assignments.
--
-- Unlike every prior slice's domain, NONE of this domain's ~22 write call sites in store.mjs
-- had an explicit begin/commit transaction at all -- each was a single connect() + one or two
-- raw statements + release(), relying on Postgres's implicit per-statement autocommit. Since
-- setTenantContext()'s set_config(..., true) is transaction-local (SET LOCAL semantics), it
-- would not have survived from one autocommitted statement to the next. Every one of these
-- call sites now explicitly wraps its statement(s) in begin/commit/rollback, with
-- setTenantContext called once right after begin (three call sites already had a transaction
-- from earlier work and only needed the setTenantContext call added; the rest were newly
-- wrapped). This is the same fix already applied in slice 5 to tasks' scattered UPDATE call
-- sites, just needed across this whole domain's read-then-write handlers instead of just a
-- few.
--
-- All 19 tables have tenant_id NOT NULL (confirmed locally), so no null-tenant exception is
-- needed. Every write call site for all 19 was traced and wired, so all 19 get real INSERT and
-- UPDATE checks from the start.
--
-- NOT included here: observatory_snapshots (belongs to the separate Pilot & Observatory
-- domain, not yet done) even though its create function sits in the same block of store.mjs.

do $$
declare
  t text;
begin
  foreach t in array array[
    'marketplace_listings', 'directory_review_board_decisions', 'directory_private_enquiries',
    'qualification_renewal_reviews', 'capacity_offers', 'collaboration_requests',
    'network_professional_profiles', 'network_firm_profiles', 'network_capabilities',
    'network_credentials', 'network_trust_signals', 'network_conflict_checks',
    'network_qualification_gates', 'specialist_invitations', 'collaboration_workspaces',
    'collaboration_workspace_participants', 'collaboration_workspace_evidence',
    'responsibility_matrices', 'specialist_assignments'
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
