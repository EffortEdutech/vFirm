-- ADR-091 data repair (2026-10-01). REVIEW, THEN RUN ONCE in the Supabase SQL editor.
-- Everything happens in ONE transaction: if any step fails, nothing changes.
--
-- What the diagnostics showed (2026-10-01):
--   * 21 rows hold a record belonging to firm 0e068cf2-cc60-4e06-b1ff-5d5f447efec4, a smoke-test firm
--     that has since been deleted (it no longer exists in `firms` and owns no rows of its own).
--     Its hires on 2026-09-21 23:58 UTC (CFO-001, FAO-001..004) were written over other firms' rows
--     because of the non-firm-scoped ids fixed in ADR-091.
--   * 20 of those rows belong to "HM-S3 Smoke Test Firm 1789812107818" (add98e4c-...): 5 seats,
--     5 role assignments, 5 package bindings, 5 lifecycle events -- for its own CFO-001, FAO-001..004
--     (all still DRAFT). The content is the same shape for the same staff codes; only the
--     tenant/firm ids and the creating actor differ.
--   * 1 row is NHL Global Solution's evidence pack (58e54f95-...): its own pack was replaced by the
--     deleted test firm's pack. NHL's own content cannot be recovered from the database.
--
-- What this script does:
--   1. Copies all 21 rows, unchanged, into a backup table (nothing is lost).
--   2. For the 20 test-firm rows: points the record back at its own firm/tenant (the row's own
--      columns) and clears the foreign actor reference, marking each record as repaired.
--   3. For NHL's evidence pack: removes the deleted test firm's pack from NHL's data. NHL gets a fresh
--      pack automatically the next time it hires (no evidence is invented).
--   4. Re-runs the diagnostic inside the transaction and aborts if anything is still mismatched.

begin;

create table if not exists awia_cross_firm_overwrite_backup_20261001 (
  table_name text not null,
  id uuid not null,
  natural_key text not null,
  tenant_id uuid not null,
  firm_id uuid not null,
  record jsonb not null,
  created_at timestamptz,
  updated_at timestamptz,
  backed_up_at timestamptz not null default now(),
  primary key (table_name, id)
);

-- 1. Backup
insert into awia_cross_firm_overwrite_backup_20261001 (table_name, id, natural_key, tenant_id, firm_id, record, created_at, updated_at)
select 'awia_virtual_staff_seats', id, natural_key, tenant_id, firm_id, record, created_at, updated_at from awia_virtual_staff_seats where record->>'firm_id' = '0e068cf2-cc60-4e06-b1ff-5d5f447efec4' and firm_id <> '0e068cf2-cc60-4e06-b1ff-5d5f447efec4'
union all select 'awia_staff_role_assignments', id, natural_key, tenant_id, firm_id, record, created_at, updated_at from awia_staff_role_assignments where record->>'firm_id' = '0e068cf2-cc60-4e06-b1ff-5d5f447efec4' and firm_id <> '0e068cf2-cc60-4e06-b1ff-5d5f447efec4'
union all select 'awia_staff_package_bindings', id, natural_key, tenant_id, firm_id, record, created_at, updated_at from awia_staff_package_bindings where record->>'firm_id' = '0e068cf2-cc60-4e06-b1ff-5d5f447efec4' and firm_id <> '0e068cf2-cc60-4e06-b1ff-5d5f447efec4'
union all select 'awia_staff_lifecycle_events', id, natural_key, tenant_id, firm_id, record, created_at, updated_at from awia_staff_lifecycle_events where record->>'firm_id' = '0e068cf2-cc60-4e06-b1ff-5d5f447efec4' and firm_id <> '0e068cf2-cc60-4e06-b1ff-5d5f447efec4'
union all select 'awia_staff_evidence_packs', id, natural_key, tenant_id, firm_id, record, created_at, updated_at from awia_staff_evidence_packs where record->>'firm_id' = '0e068cf2-cc60-4e06-b1ff-5d5f447efec4' and firm_id <> '0e068cf2-cc60-4e06-b1ff-5d5f447efec4'
on conflict (table_name, id) do nothing;

-- Safety: expect exactly the 21 rows reported by the diagnostic.
do $$
declare n int;
begin
  select count(*) into n from awia_cross_firm_overwrite_backup_20261001;
  if n <> 21 then raise exception 'Expected 21 backed-up rows, found % -- data differs from the diagnostic; nothing changed.', n; end if;
end $$;

-- 2. Re-point the 20 test-firm records at their own firm (helper repeated per table).
update awia_virtual_staff_seats set
  record = (record - 'created_by_actor_id') || jsonb_build_object('tenant_id', tenant_id::text, 'firm_id', firm_id::text, 'created_by_actor_id', null, 'repaired_from_cross_firm_overwrite', '2026-10-01 ADR-091'),
  updated_at = now()
where firm_id = 'add98e4c-67f1-47d9-9561-26501f9fd801' and record->>'firm_id' = '0e068cf2-cc60-4e06-b1ff-5d5f447efec4';

update awia_staff_role_assignments set
  record = record || jsonb_build_object('tenant_id', tenant_id::text, 'firm_id', firm_id::text, 'repaired_from_cross_firm_overwrite', '2026-10-01 ADR-091'),
  updated_at = now()
where firm_id = 'add98e4c-67f1-47d9-9561-26501f9fd801' and record->>'firm_id' = '0e068cf2-cc60-4e06-b1ff-5d5f447efec4';

update awia_staff_package_bindings set
  record = record || jsonb_build_object('tenant_id', tenant_id::text, 'firm_id', firm_id::text, 'repaired_from_cross_firm_overwrite', '2026-10-01 ADR-091'),
  updated_at = now()
where firm_id = 'add98e4c-67f1-47d9-9561-26501f9fd801' and record->>'firm_id' = '0e068cf2-cc60-4e06-b1ff-5d5f447efec4';

update awia_staff_lifecycle_events set
  record = (record - 'actor_id') || jsonb_build_object('tenant_id', tenant_id::text, 'firm_id', firm_id::text, 'actor_id', null, 'repaired_from_cross_firm_overwrite', '2026-10-01 ADR-091'),
  updated_at = now()
where firm_id = 'add98e4c-67f1-47d9-9561-26501f9fd801' and record->>'firm_id' = '0e068cf2-cc60-4e06-b1ff-5d5f447efec4';

-- 3. Remove the deleted test firm's evidence pack from NHL Global Solution (backed up in step 1).
delete from awia_staff_evidence_packs
where firm_id = '58e54f95-47ec-4792-9456-aa1cecc36881' and record->>'firm_id' = '0e068cf2-cc60-4e06-b1ff-5d5f447efec4';

-- 4. Verify inside the transaction: no AWIA row may still carry another firm's record.
do $$
declare n int;
begin
  select
    (select count(*) from awia_virtual_staff_seats where coalesce(record->>'firm_id','') <> firm_id::text)
  + (select count(*) from awia_virtual_staff_members where coalesce(record->>'firm_id','') <> firm_id::text)
  + (select count(*) from awia_staff_role_assignments where coalesce(record->>'firm_id','') <> firm_id::text)
  + (select count(*) from awia_staff_package_bindings where coalesce(record->>'firm_id','') <> firm_id::text)
  + (select count(*) from awia_staff_lifecycle_events where coalesce(record->>'firm_id','') <> firm_id::text)
  + (select count(*) from awia_staff_evidence_packs where coalesce(record->>'firm_id','') <> firm_id::text)
  + (select count(*) from awia_virtual_staff_provisioning_runs where coalesce(record->>'firm_id','') <> firm_id::text)
  into n;
  if n <> 0 then raise exception 'Still % mismatched row(s) after repair -- rolling back.', n; end if;
end $$;

commit;

-- Afterwards: re-run 2026-10-01_awia_cross_firm_overwrite_check.sql -- it should return 0 rows.
