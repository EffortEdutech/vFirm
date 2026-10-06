-- vFirm database audit -- PART 2 of 3 -- checks the 7 firm-factory _legacy_v1 tables
-- (only created by the 0024_zzz fix, only if this database had the old bespoke shape
-- when that migration ran). READ-ONLY for data. Self-contained -- run alone.
drop function if exists public.__vfirm_audit_legacy_stats();

create function public.__vfirm_audit_legacy_stats()
returns table (table_name text, row_count bigint)
language plpgsql
as $fn2$
declare
  rc bigint;
begin
  if to_regclass('public.factory_firm_blueprints_legacy_v1') is not null then
    begin
      execute 'select count(*) from factory_firm_blueprints_legacy_v1' into rc;
      table_name := 'factory_firm_blueprints_legacy_v1'; row_count := rc;
      return next;
    exception when others then
      table_name := 'factory_firm_blueprints_legacy_v1'; row_count := null;
      return next;
    end;
  end if;
  if to_regclass('public.factory_provisioning_runs_legacy_v1') is not null then
    begin
      execute 'select count(*) from factory_provisioning_runs_legacy_v1' into rc;
      table_name := 'factory_provisioning_runs_legacy_v1'; row_count := rc;
      return next;
    exception when others then
      table_name := 'factory_provisioning_runs_legacy_v1'; row_count := null;
      return next;
    end;
  end if;
  if to_regclass('public.factory_worker_bindings_legacy_v1') is not null then
    begin
      execute 'select count(*) from factory_worker_bindings_legacy_v1' into rc;
      table_name := 'factory_worker_bindings_legacy_v1'; row_count := rc;
      return next;
    exception when others then
      table_name := 'factory_worker_bindings_legacy_v1'; row_count := null;
      return next;
    end;
  end if;
  if to_regclass('public.provisioned_firm_instances_legacy_v1') is not null then
    begin
      execute 'select count(*) from provisioned_firm_instances_legacy_v1' into rc;
      table_name := 'provisioned_firm_instances_legacy_v1'; row_count := rc;
      return next;
    exception when others then
      table_name := 'provisioned_firm_instances_legacy_v1'; row_count := null;
      return next;
    end;
  end if;
  if to_regclass('public.service_activation_records_legacy_v1') is not null then
    begin
      execute 'select count(*) from service_activation_records_legacy_v1' into rc;
      table_name := 'service_activation_records_legacy_v1'; row_count := rc;
      return next;
    exception when others then
      table_name := 'service_activation_records_legacy_v1'; row_count := null;
      return next;
    end;
  end if;
  if to_regclass('public.pack_compatibility_checks_legacy_v1') is not null then
    begin
      execute 'select count(*) from pack_compatibility_checks_legacy_v1' into rc;
      table_name := 'pack_compatibility_checks_legacy_v1'; row_count := rc;
      return next;
    exception when others then
      table_name := 'pack_compatibility_checks_legacy_v1'; row_count := null;
      return next;
    end;
  end if;
  if to_regclass('public.pack_binding_certifications_legacy_v1') is not null then
    begin
      execute 'select count(*) from pack_binding_certifications_legacy_v1' into rc;
      table_name := 'pack_binding_certifications_legacy_v1'; row_count := rc;
      return next;
    exception when others then
      table_name := 'pack_binding_certifications_legacy_v1'; row_count := null;
      return next;
    end;
  end if;
  return;
end;
$fn2$;

select * from public.__vfirm_audit_legacy_stats() order by table_name;

drop function public.__vfirm_audit_legacy_stats();