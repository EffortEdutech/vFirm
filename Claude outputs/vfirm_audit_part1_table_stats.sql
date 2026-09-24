-- vFirm database audit -- PART 1 of 3 -- table row counts + last activity. READ-ONLY
-- for data (creates and drops one function, touches no table data). Self-contained --
-- run this file alone, in a fresh SQL editor tab, and it produces exactly ONE result.
drop function if exists public.__vfirm_audit_stats();

create function public.__vfirm_audit_stats()
returns table (table_name text, row_count bigint, last_activity text, ts_column_used text, note text)
language plpgsql
as $fn$
declare
  rc bigint;
  la text;
  used text;
  errnote text;
begin
  if to_regclass('public.actors') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from actors' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from actors' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from actors' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from actors' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'actors'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.administration_skill_bindings') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from administration_skill_bindings' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from administration_skill_bindings' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from administration_skill_bindings' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from administration_skill_bindings' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'administration_skill_bindings'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.administrative_deadlines') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from administrative_deadlines' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from administrative_deadlines' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from administrative_deadlines' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from administrative_deadlines' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'administrative_deadlines'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.app_state') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from app_state' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from app_state' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from app_state' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from app_state' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'app_state'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.approvals') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from approvals' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from approvals' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from approvals' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from approvals' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'approvals'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.audit_events') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from audit_events' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from audit_events' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from audit_events' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from audit_events' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'audit_events'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.awia_client_delivery_drafts') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from awia_client_delivery_drafts' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from awia_client_delivery_drafts' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from awia_client_delivery_drafts' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from awia_client_delivery_drafts' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'awia_client_delivery_drafts'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.awia_firm_package_assignments') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from awia_firm_package_assignments' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from awia_firm_package_assignments' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from awia_firm_package_assignments' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from awia_firm_package_assignments' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'awia_firm_package_assignments'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.awia_staff_authority_decisions') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from awia_staff_authority_decisions' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from awia_staff_authority_decisions' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from awia_staff_authority_decisions' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from awia_staff_authority_decisions' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'awia_staff_authority_decisions'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.awia_staff_conversation_messages') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from awia_staff_conversation_messages' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from awia_staff_conversation_messages' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from awia_staff_conversation_messages' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from awia_staff_conversation_messages' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'awia_staff_conversation_messages'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.awia_staff_conversation_threads') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from awia_staff_conversation_threads' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from awia_staff_conversation_threads' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from awia_staff_conversation_threads' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from awia_staff_conversation_threads' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'awia_staff_conversation_threads'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.awia_staff_evidence_packs') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from awia_staff_evidence_packs' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from awia_staff_evidence_packs' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from awia_staff_evidence_packs' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from awia_staff_evidence_packs' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'awia_staff_evidence_packs'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.awia_staff_lifecycle_events') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from awia_staff_lifecycle_events' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from awia_staff_lifecycle_events' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from awia_staff_lifecycle_events' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from awia_staff_lifecycle_events' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'awia_staff_lifecycle_events'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.awia_staff_memory_entries') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from awia_staff_memory_entries' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from awia_staff_memory_entries' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from awia_staff_memory_entries' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from awia_staff_memory_entries' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'awia_staff_memory_entries'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.awia_staff_output_drafts') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from awia_staff_output_drafts' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from awia_staff_output_drafts' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from awia_staff_output_drafts' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from awia_staff_output_drafts' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'awia_staff_output_drafts'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.awia_staff_output_reviews') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from awia_staff_output_reviews' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from awia_staff_output_reviews' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from awia_staff_output_reviews' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from awia_staff_output_reviews' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'awia_staff_output_reviews'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.awia_staff_package_bindings') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from awia_staff_package_bindings' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from awia_staff_package_bindings' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from awia_staff_package_bindings' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from awia_staff_package_bindings' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'awia_staff_package_bindings'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.awia_staff_role_assignments') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from awia_staff_role_assignments' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from awia_staff_role_assignments' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from awia_staff_role_assignments' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from awia_staff_role_assignments' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'awia_staff_role_assignments'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.awia_staff_seat_billing_events') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from awia_staff_seat_billing_events' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from awia_staff_seat_billing_events' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from awia_staff_seat_billing_events' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from awia_staff_seat_billing_events' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'awia_staff_seat_billing_events'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.awia_staff_task_readiness_records') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from awia_staff_task_readiness_records' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from awia_staff_task_readiness_records' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from awia_staff_task_readiness_records' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from awia_staff_task_readiness_records' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'awia_staff_task_readiness_records'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.awia_staff_workdesk_items') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from awia_staff_workdesk_items' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from awia_staff_workdesk_items' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from awia_staff_workdesk_items' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from awia_staff_workdesk_items' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'awia_staff_workdesk_items'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.awia_virtual_staff_members') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from awia_virtual_staff_members' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from awia_virtual_staff_members' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from awia_virtual_staff_members' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from awia_virtual_staff_members' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'awia_virtual_staff_members'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.awia_virtual_staff_provisioning_runs') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from awia_virtual_staff_provisioning_runs' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from awia_virtual_staff_provisioning_runs' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from awia_virtual_staff_provisioning_runs' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from awia_virtual_staff_provisioning_runs' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'awia_virtual_staff_provisioning_runs'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.awia_virtual_staff_seats') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from awia_virtual_staff_seats' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from awia_virtual_staff_seats' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from awia_virtual_staff_seats' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from awia_virtual_staff_seats' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'awia_virtual_staff_seats'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.billing_readiness_reviews') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from billing_readiness_reviews' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from billing_readiness_reviews' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from billing_readiness_reviews' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from billing_readiness_reviews' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'billing_readiness_reviews'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.boq_extraction_aids') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from boq_extraction_aids' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from boq_extraction_aids' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from boq_extraction_aids' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from boq_extraction_aids' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'boq_extraction_aids'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.calculation_input_sets') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from calculation_input_sets' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from calculation_input_sets' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from calculation_input_sets' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from calculation_input_sets' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'calculation_input_sets'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.capacity_offers') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from capacity_offers' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from capacity_offers' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from capacity_offers' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from capacity_offers' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'capacity_offers'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.client_communication_drafts') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from client_communication_drafts' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from client_communication_drafts' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from client_communication_drafts' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from client_communication_drafts' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'client_communication_drafts'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.clients') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from clients' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from clients' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from clients' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from clients' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'clients'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.collaboration_requests') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from collaboration_requests' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from collaboration_requests' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from collaboration_requests' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from collaboration_requests' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'collaboration_requests'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.collaboration_workspace_evidence') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from collaboration_workspace_evidence' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from collaboration_workspace_evidence' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from collaboration_workspace_evidence' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from collaboration_workspace_evidence' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'collaboration_workspace_evidence'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.collaboration_workspace_participants') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from collaboration_workspace_participants' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from collaboration_workspace_participants' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from collaboration_workspace_participants' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from collaboration_workspace_participants' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'collaboration_workspace_participants'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.collaboration_workspaces') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from collaboration_workspaces' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from collaboration_workspaces' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from collaboration_workspaces' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from collaboration_workspaces' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'collaboration_workspaces'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.commercial_launch_controls') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from commercial_launch_controls' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from commercial_launch_controls' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from commercial_launch_controls' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from commercial_launch_controls' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'commercial_launch_controls'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.commercial_skill_bindings') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from commercial_skill_bindings' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from commercial_skill_bindings' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from commercial_skill_bindings' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from commercial_skill_bindings' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'commercial_skill_bindings'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.correspondence_records') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from correspondence_records' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from correspondence_records' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from correspondence_records' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from correspondence_records' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'correspondence_records'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.delivery_package_records') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from delivery_package_records' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from delivery_package_records' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from delivery_package_records' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from delivery_package_records' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'delivery_package_records'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.directory_private_enquiries') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from directory_private_enquiries' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from directory_private_enquiries' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from directory_private_enquiries' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from directory_private_enquiries' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'directory_private_enquiries'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.directory_review_board_decisions') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from directory_review_board_decisions' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from directory_review_board_decisions' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from directory_review_board_decisions' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from directory_review_board_decisions' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'directory_review_board_decisions'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.document_register_entries') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from document_register_entries' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from document_register_entries' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from document_register_entries' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from document_register_entries' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'document_register_entries'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.document_revision_records') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from document_revision_records' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from document_revision_records' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from document_revision_records' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from document_revision_records' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'document_revision_records'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.document_versions') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from document_versions' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from document_versions' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from document_versions' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from document_versions' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'document_versions'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.documents') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from documents' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from documents' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from documents' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from documents' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'documents'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.drawing_review_records') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from drawing_review_records' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from drawing_review_records' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from drawing_review_records' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from drawing_review_records' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'drawing_review_records'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.engagements') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from engagements' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from engagements' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from engagements' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from engagements' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'engagements'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.event_log') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from event_log' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from event_log' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from event_log' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from event_log' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'event_log'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.evidence_bundles') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from evidence_bundles' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from evidence_bundles' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from evidence_bundles' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from evidence_bundles' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'evidence_bundles'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.expense_records') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from expense_records' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from expense_records' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from expense_records' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from expense_records' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'expense_records'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.factory_firm_blueprints') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from factory_firm_blueprints' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from factory_firm_blueprints' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from factory_firm_blueprints' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from factory_firm_blueprints' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'factory_firm_blueprints'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.factory_provisioning_runs') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from factory_provisioning_runs' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from factory_provisioning_runs' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from factory_provisioning_runs' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from factory_provisioning_runs' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'factory_provisioning_runs'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.factory_worker_bindings') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from factory_worker_bindings' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from factory_worker_bindings' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from factory_worker_bindings' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from factory_worker_bindings' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'factory_worker_bindings'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.firm_client_relationships') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from firm_client_relationships' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from firm_client_relationships' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from firm_client_relationships' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from firm_client_relationships' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'firm_client_relationships'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.firm_memberships') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from firm_memberships' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from firm_memberships' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from firm_memberships' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from firm_memberships' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'firm_memberships'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.firms') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from firms' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from firms' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from firms' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from firms' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'firms'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.front_desk_enquiries') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from front_desk_enquiries' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from front_desk_enquiries' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from front_desk_enquiries' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from front_desk_enquiries' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'front_desk_enquiries'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.intake_sessions') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from intake_sessions' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from intake_sessions' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from intake_sessions' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from intake_sessions' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'intake_sessions'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.invoices') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from invoices' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from invoices' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from invoices' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from invoices' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'invoices'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.leads') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from leads' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from leads' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from leads' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from leads' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'leads'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.marketplace_listings') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from marketplace_listings' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from marketplace_listings' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from marketplace_listings' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from marketplace_listings' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'marketplace_listings'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.network_capabilities') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from network_capabilities' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from network_capabilities' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from network_capabilities' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from network_capabilities' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'network_capabilities'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.network_conflict_checks') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from network_conflict_checks' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from network_conflict_checks' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from network_conflict_checks' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from network_conflict_checks' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'network_conflict_checks'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.network_credentials') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from network_credentials' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from network_credentials' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from network_credentials' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from network_credentials' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'network_credentials'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.network_firm_profiles') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from network_firm_profiles' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from network_firm_profiles' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from network_firm_profiles' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from network_firm_profiles' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'network_firm_profiles'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.network_professional_profiles') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from network_professional_profiles' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from network_professional_profiles' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from network_professional_profiles' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from network_professional_profiles' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'network_professional_profiles'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.network_qualification_gates') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from network_qualification_gates' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from network_qualification_gates' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from network_qualification_gates' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from network_qualification_gates' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'network_qualification_gates'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.network_trust_signals') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from network_trust_signals' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from network_trust_signals' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from network_trust_signals' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from network_trust_signals' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'network_trust_signals'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.observatory_snapshots') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from observatory_snapshots' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from observatory_snapshots' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from observatory_snapshots' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from observatory_snapshots' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'observatory_snapshots'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.pack_binding_certifications') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from pack_binding_certifications' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from pack_binding_certifications' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from pack_binding_certifications' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from pack_binding_certifications' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'pack_binding_certifications'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.pack_compatibility_checks') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from pack_compatibility_checks' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from pack_compatibility_checks' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from pack_compatibility_checks' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from pack_compatibility_checks' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'pack_compatibility_checks'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.payment_provider_configs') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from payment_provider_configs' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from payment_provider_configs' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from payment_provider_configs' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from payment_provider_configs' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'payment_provider_configs'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.payment_statuses') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from payment_statuses' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from payment_statuses' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from payment_statuses' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from payment_statuses' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'payment_statuses'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.persons') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from persons' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from persons' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from persons' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from persons' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'persons'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.pilot_acceptance_reviews') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from pilot_acceptance_reviews' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from pilot_acceptance_reviews' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from pilot_acceptance_reviews' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from pilot_acceptance_reviews' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'pilot_acceptance_reviews'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.pilot_expansion_cohorts') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from pilot_expansion_cohorts' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from pilot_expansion_cohorts' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from pilot_expansion_cohorts' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from pilot_expansion_cohorts' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'pilot_expansion_cohorts'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.pilot_feedback') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from pilot_feedback' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from pilot_feedback' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from pilot_feedback' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from pilot_feedback' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'pilot_feedback'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.pilot_handoff_records') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from pilot_handoff_records' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from pilot_handoff_records' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from pilot_handoff_records' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from pilot_handoff_records' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'pilot_handoff_records'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.pilot_improvement_items') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from pilot_improvement_items' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from pilot_improvement_items' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from pilot_improvement_items' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from pilot_improvement_items' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'pilot_improvement_items'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.pilot_incidents') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from pilot_incidents' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from pilot_incidents' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from pilot_incidents' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from pilot_incidents' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'pilot_incidents'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.pilot_report_packs') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from pilot_report_packs' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from pilot_report_packs' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from pilot_report_packs' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from pilot_report_packs' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'pilot_report_packs'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.pilot_users') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from pilot_users' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from pilot_users' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from pilot_users' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from pilot_users' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'pilot_users'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.policy_decisions') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from policy_decisions' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from policy_decisions' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from policy_decisions' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from policy_decisions' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'policy_decisions'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.price_build_ups') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from price_build_ups' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from price_build_ups' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from price_build_ups' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from price_build_ups' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'price_build_ups'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.professional_authorities') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from professional_authorities' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from professional_authorities' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from professional_authorities' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from professional_authorities' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'professional_authorities'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.professional_profiles') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from professional_profiles' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from professional_profiles' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from professional_profiles' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from professional_profiles' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'professional_profiles'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.projects') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from projects' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from projects' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from projects' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from projects' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'projects'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.proposal_dispatch_records') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from proposal_dispatch_records' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from proposal_dispatch_records' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from proposal_dispatch_records' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from proposal_dispatch_records' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'proposal_dispatch_records'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.proposals') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from proposals' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from proposals' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from proposals' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from proposals' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'proposals'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.provisioned_firm_instances') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from provisioned_firm_instances' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from provisioned_firm_instances' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from provisioned_firm_instances' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from provisioned_firm_instances' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'provisioned_firm_instances'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.qualification_renewal_reviews') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from qualification_renewal_reviews' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from qualification_renewal_reviews' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from qualification_renewal_reviews' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from qualification_renewal_reviews' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'qualification_renewal_reviews'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.quotation_cases') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from quotation_cases' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from quotation_cases' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from quotation_cases' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from quotation_cases' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'quotation_cases'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.quotation_draft_packs') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from quotation_draft_packs' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from quotation_draft_packs' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from quotation_draft_packs' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from quotation_draft_packs' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'quotation_draft_packs'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.quotation_issue_records') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from quotation_issue_records' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from quotation_issue_records' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from quotation_issue_records' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from quotation_issue_records' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'quotation_issue_records'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.quotation_receivable_preparations') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from quotation_receivable_preparations' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from quotation_receivable_preparations' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from quotation_receivable_preparations' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from quotation_receivable_preparations' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'quotation_receivable_preparations'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.receivable_follow_ups') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from receivable_follow_ups' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from receivable_follow_ups' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from receivable_follow_ups' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from receivable_follow_ups' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'receivable_follow_ups'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.release_candidate_gates') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from release_candidate_gates' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from release_candidate_gates' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from release_candidate_gates' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from release_candidate_gates' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'release_candidate_gates'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.responsibility_matrices') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from responsibility_matrices' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from responsibility_matrices' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from responsibility_matrices' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from responsibility_matrices' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'responsibility_matrices'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.sales_pipeline_records') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from sales_pipeline_records' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from sales_pipeline_records' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from sales_pipeline_records' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from sales_pipeline_records' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'sales_pipeline_records'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.schema_migrations') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from schema_migrations' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from schema_migrations' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from schema_migrations' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from schema_migrations' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'schema_migrations'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.service_activation_records') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from service_activation_records' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from service_activation_records' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from service_activation_records' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from service_activation_records' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'service_activation_records'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.service_packs') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from service_packs' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from service_packs' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from service_packs' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from service_packs' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'service_packs'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.service_skus') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from service_skus' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from service_skus' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from service_skus' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from service_skus' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'service_skus'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.specialist_assignments') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from specialist_assignments' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from specialist_assignments' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from specialist_assignments' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from specialist_assignments' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'specialist_assignments'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.specialist_invitations') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from specialist_invitations' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from specialist_invitations' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from specialist_invitations' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from specialist_invitations' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'specialist_invitations'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.stakeholder_review_boards') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from stakeholder_review_boards' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from stakeholder_review_boards' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from stakeholder_review_boards' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from stakeholder_review_boards' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'stakeholder_review_boards'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.stakeholder_review_decisions') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from stakeholder_review_decisions' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from stakeholder_review_decisions' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from stakeholder_review_decisions' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from stakeholder_review_decisions' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'stakeholder_review_decisions'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.subscription_packages') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from subscription_packages' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from subscription_packages' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from subscription_packages' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from subscription_packages' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'subscription_packages'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.support_cases') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from support_cases' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from support_cases' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from support_cases' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from support_cases' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'support_cases'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.task_outputs') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from task_outputs' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from task_outputs' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from task_outputs' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from task_outputs' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'task_outputs'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.tasks') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from tasks' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from tasks' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from tasks' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from tasks' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'tasks'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.technical_qa_findings') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from technical_qa_findings' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from technical_qa_findings' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from technical_qa_findings' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from technical_qa_findings' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'technical_qa_findings'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.technical_skill_bindings') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from technical_skill_bindings' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from technical_skill_bindings' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from technical_skill_bindings' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from technical_skill_bindings' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'technical_skill_bindings'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.tenant_onboarding_plans') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from tenant_onboarding_plans' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from tenant_onboarding_plans' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from tenant_onboarding_plans' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from tenant_onboarding_plans' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'tenant_onboarding_plans'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.tenant_pilot_controls') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from tenant_pilot_controls' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from tenant_pilot_controls' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from tenant_pilot_controls' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from tenant_pilot_controls' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'tenant_pilot_controls'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.tenant_usage_events') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from tenant_usage_events' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from tenant_usage_events' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from tenant_usage_events' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from tenant_usage_events' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'tenant_usage_events'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.tenants') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from tenants' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from tenants' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from tenants' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from tenants' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'tenants'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.tool_invocations') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from tool_invocations' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from tool_invocations' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from tool_invocations' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from tool_invocations' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'tool_invocations'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.transmittal_drafts') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from transmittal_drafts' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from transmittal_drafts' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from transmittal_drafts' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from transmittal_drafts' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'transmittal_drafts'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.work_packages') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from work_packages' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from work_packages' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from work_packages' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from work_packages' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'work_packages'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.worker_instances') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from worker_instances' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from worker_instances' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from worker_instances' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from worker_instances' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'worker_instances'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  if to_regclass('public.worker_templates') is not null then
    used := null; errnote := null;
    begin
      execute 'select count(*), max(updated_at)::text from worker_templates' into rc, la;
      used := 'updated_at';
    exception when undefined_column then
      begin
        execute 'select count(*), max(created_at)::text from worker_templates' into rc, la;
        used := 'created_at';
      exception when undefined_column then
        begin
          execute 'select count(*), null from worker_templates' into rc, la;
          used := null;
        exception when others then
          rc := null; la := null; used := null; errnote := sqlerrm;
        end;
      when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    when others then
      begin
        execute 'select count(*) from worker_templates' into rc;
        la := null; used := null; errnote := 'timestamp column raised non-undefined_column error, row count only';
      exception when others then
        rc := null; la := null; used := null; errnote := sqlerrm;
      end;
    end;
    table_name := 'worker_templates'; row_count := rc; last_activity := la; ts_column_used := used; note := errnote;
    return next;
  end if;
  return;
end;
$fn$;

select * from public.__vfirm_audit_stats() order by row_count asc nulls last, table_name;

drop function public.__vfirm_audit_stats();