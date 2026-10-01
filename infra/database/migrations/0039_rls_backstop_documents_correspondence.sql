-- Phase 4d, slice 6 (2026-09-29): RLS backstop for the 9 Documents & Correspondence tables:
-- documents, document_versions, evidence_bundles, administration_skill_bindings,
-- correspondence_records, document_register_entries, document_revision_records,
-- administrative_deadlines, transmittal_drafts.
--
-- documents / document_versions / evidence_bundles: every write call site traced in
-- apps/api/src/store.mjs (createDeliverableDraftRecord, createEvidenceBundleRecord,
-- reviewDeliverableRecord, issueDeliverableRecord -- the last already wired in slice 5) is a
-- dedicated single-tenant transaction and now calls setTenantContext once per transaction.
--
-- administration_skill_bindings / correspondence_records / document_register_entries /
-- document_revision_records / administrative_deadlines / transmittal_drafts: all written only
-- through persistAdministrationFromStore()'s per-row upserts inside savePostgresStore()'s
-- shared multi-tenant transaction (same shape as slice 4's persistTechnicalDeliveryFromStore),
-- now calling setTenantContext fresh before each row's statement, including the standalone
-- document_register_entries.current_revision_id update.
--
-- All 9 tables have tenant_id NOT NULL (confirmed locally), so no null-tenant exception is
-- needed (unlike slice 2's actors table). Every write path for all 9 tables is now covered by
-- setTenantContext, so all get a REAL tenant check on both INSERT and UPDATE directly, no
-- interim permissive UPDATE step needed (unlike slice 3's tasks/projects, which had unwired
-- update call sites at the time).

do $$
declare
  t text;
begin
  foreach t in array array[
    'documents', 'document_versions', 'evidence_bundles',
    'administration_skill_bindings', 'correspondence_records', 'document_register_entries',
    'document_revision_records', 'administrative_deadlines', 'transmittal_drafts'
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
