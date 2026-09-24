-- HM-S6 -- reconciles a pre-existing migration collision found while stress-testing HM-S6 item 4
-- against the FULL migration history (0001 -> 0027), not just the item-3/item-4 test subset.
--
-- Migrations 0021/0022 (R3-S2/S3 Virtual Firm Factory Provisioning, bespoke schema: id text primary
-- key, blueprint_code/blueprint_state/... columns) and migration 0025 (firm_factory_persistence,
-- generic schema: id uuid, natural_key, tenant_id, firm_id, record jsonb -- the shape
-- apps/api/src/store.mjs's FIRM_FACTORY_RELATIONAL_TABLES / persistFirmFactoryFromStore /
-- readFirmFactoryRelational actually read and write) both declare
-- `create table if not exists <name>` for the same 7 table names:
--   factory_firm_blueprints, factory_provisioning_runs, factory_worker_bindings,
--   provisioned_firm_instances, service_activation_records, pack_compatibility_checks,
--   pack_binding_certifications
-- On any database where 0021/0022 ran before 0025 (the normal, filename-sorted migration order),
-- 0025's declaration for these 7 names is a silent no-op -- the table keeps the OLD bespoke shape --
-- and 0025 then immediately crashes on its very next statement, `create unique index ...
-- (tenant_id, firm_id, natural_key)`, with "column natural_key does not exist" (confirmed by
-- actually running the full 0001->0027 chain against a disposable database).
--
-- This file is named to run in the gap between 0024 and 0025 (0024_zzz_... sorts after
-- 0024_awia_virtual_staff_persistence.sql and before 0025_firm_factory_persistence.sql -- verified
-- character by character), rather than as a later-numbered migration, precisely because 0025's own
-- crash means nothing after it in the sort order ever gets a chance to run. It was deliberately NOT
-- written as an edit to 0025 itself, to avoid touching a migration file that may already be recorded
-- (by checksum, in schema_migrations) in some environment.
--
-- Fix, applied per table: if the table exists and does NOT have a `natural_key` column (i.e. it is
-- still the old 0021/0022 shape), rename it to `<table>_legacy_v1` -- every row preserved verbatim,
-- zero data loss, nothing dropped -- then let migration 0025 (which runs right after this file)
-- create the generic-shape table fresh under the now-free original name. No data is copied or
-- converted from the legacy table automatically: mapping bespoke columns like
-- blueprint_code/validation_status into a `record jsonb` shape is a business decision this migration
-- does not guess at. If a table already has the generic shape (a fresh database that never ran
-- 0021/0022, or this migration re-run), this is a no-op for it -- safe to apply more than once.
--
-- Found and fixed 2026-09-23, product owner authorized ("fix any findings along the way").

do $$
declare
  t text;
  affected_tables text[] := array[
    'factory_firm_blueprints',
    'factory_provisioning_runs',
    'factory_worker_bindings',
    'provisioned_firm_instances',
    'service_activation_records',
    'pack_compatibility_checks',
    'pack_binding_certifications'
  ];
  legacy_name text;
  suffix int;
begin
  foreach t in array affected_tables loop
    if to_regclass('public.' || t) is not null
       and not exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = t and column_name = 'natural_key'
       )
    then
      legacy_name := t || '_legacy_v1';
      suffix := 1;
      while to_regclass('public.' || legacy_name) is not null loop
        suffix := suffix + 1;
        legacy_name := t || '_legacy_v' || suffix;
      end loop;
      execute format('alter table %I rename to %I', t, legacy_name);
      raise notice 'HM-S6 0024_zzz: renamed pre-existing bespoke table % to % (old-shape data preserved, not auto-migrated)', t, legacy_name;
    end if;
  end loop;
end $$;
