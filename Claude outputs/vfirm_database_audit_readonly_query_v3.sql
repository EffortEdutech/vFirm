-- vFirm database structure audit -- READ-ONLY. (v3: no longer predicts which timestamp
-- column a table has -- v1 assumed the newest migration-file shape, v2 tried looking it
-- up via information_schema.columns first, but that still errored the same way on
-- Supabase's SQL editor. v3 just TRIES 'updated_at', catches the undefined_column error
-- if it doesn't exist, tries 'created_at', catches again, and falls back to a null
-- last-activity value -- so it cannot fail on a column-name mismatch, and a catch-all
-- per table means one unexpected error can't halt the rest of the audit either.)
-- This script only SELECTs and counts rows into a session-local TEMP TABLE. It never
-- touches any real table's data or structure (no insert/update/delete/alter/drop on any
-- table other than the temp ones this script itself creates and drops at the end).
-- Every table is checked with to_regclass() first, so a table that doesn't exist in your
-- database yet is skipped, not an error.
-- Run this against your own DATABASE_URL (e.g. `psql $DATABASE_URL -f this_file.sql`,
-- or paste it into the Supabase SQL editor) and paste the output back.

create temporary table audit_table_stats (table_name text, row_count bigint, last_activity text, ts_column_used text, note text);

do $$
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
    insert into audit_table_stats values ('actors', rc, la, used, errnote);
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
    insert into audit_table_stats values ('administration_skill_bindings', rc, la, used, errnote);
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
    insert into audit_table_stats values ('administrative_deadlines', rc, la, used, errnote);
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
    insert into audit_table_stats values ('app_state', rc, la, used, errnote);
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
    insert into audit_table_stats values ('approvals', rc, la, used, errnote);
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
    insert into audit_table_stats values ('audit_events', rc, la, used, errnote);
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
    insert into audit_table_stats values ('awia_client_delivery_drafts', rc, la, used, errnote);
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
    insert into audit_table_stats values ('awia_firm_package_assignments', rc, la, used, errnote);
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
    insert into audit_table_stats values ('awia_staff_authority_decisions', rc, la, used, errnote);
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
    insert into audit_table_stats values ('awia_staff_conversation_messages', rc, la, used, errnote);
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
    insert into audit_table_stats values ('awia_staff_conversation_threads', rc, la, used, errnote);
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
    insert into audit_table_stats values ('awia_staff_evidence_packs', rc, la, used, errnote);
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
    insert into audit_table_stats values ('awia_staff_lifecycle_events', rc, la, used, errnote);
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
    insert into audit_table_stats values ('awia_staff_memory_entries', rc, la, used, errnote);
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
    insert into audit_table_stats values ('awia_staff_output_drafts', rc, la, used, errnote);
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
    insert into audit_table_stats values ('awia_staff_output_reviews', rc, la, used, errnote);
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
    insert into audit_table_stats values ('awia_staff_package_bindings', rc, la, used, errnote);
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
    insert into audit_table_stats values ('awia_staff_role_assignments', rc, la, used, errnote);
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
    insert into audit_table_stats values ('awia_staff_seat_billing_events', rc, la, used, errnote);
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
    insert into audit_table_stats values ('awia_staff_task_readiness_records', rc, la, used, errnote);
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
    insert into audit_table_stats values ('awia_staff_workdesk_items', rc, la, used, errnote);
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
    insert into audit_table_stats values ('awia_virtual_staff_members', rc, la, used, errnote);
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
    insert into audit_table_stats values ('awia_virtual_staff_provisioning_runs', rc, la, used, errnote);
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
    insert into audit_table_stats values ('awia_virtual_staff_seats', rc, la, used, errnote);
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
    insert into audit_table_stats values ('billing_readiness_reviews', rc, la, used, errnote);
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
    insert into audit_table_stats values ('boq_extraction_aids', rc, la, used, errnote);
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
    insert into audit_table_stats values ('calculation_input_sets', rc, la, used, errnote);
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
    insert into audit_table_stats values ('capacity_offers', rc, la, used, errnote);
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
    insert into audit_table_stats values ('client_communication_drafts', rc, la, used, errnote);
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
    insert into audit_table_stats values ('clients', rc, la, used, errnote);
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
    insert into audit_table_stats values ('collaboration_requests', rc, la, used, errnote);
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
    insert into audit_table_stats values ('collaboration_workspace_evidence', rc, la, used, errnote);
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
    insert into audit_table_stats values ('collaboration_workspace_participants', rc, la, used, errnote);
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
    insert into audit_table_stats values ('collaboration_workspaces', rc, la, used, errnote);
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
    insert into audit_table_stats values ('commercial_launch_controls', rc, la, used, errnote);
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
    insert into audit_table_stats values ('commercial_skill_bindings', rc, la, used, errnote);
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
    insert into audit_table_stats values ('correspondence_records', rc, la, used, errnote);
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
    insert into audit_table_stats values ('delivery_package_records', rc, la, used, errnote);
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
    insert into audit_table_stats values ('directory_private_enquiries', rc, la, used, errnote);
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
    insert into audit_table_stats values ('directory_review_board_decisions', rc, la, used, errnote);
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
    insert into audit_table_stats values ('document_register_entries', rc, la, used, errnote);
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
    insert into audit_table_stats values ('document_revision_records', rc, la, used, errnote);
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
    insert into audit_table_stats values ('document_versions', rc, la, used, errnote);
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
    insert into audit_table_stats values ('documents', rc, la, used, errnote);
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
    insert into audit_table_stats values ('drawing_review_records', rc, la, used, errnote);
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
    insert into audit_table_stats values ('engagements', rc, la, used, errnote);
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
    insert into audit_table_stats values ('event_log', rc, la, used, errnote);
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
    insert into audit_table_stats values ('evidence_bundles', rc, la, used, errnote);
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
    insert into audit_table_stats values ('expense_records', rc, la, used, errnote);
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
    insert into audit_table_stats values ('factory_firm_blueprints', rc, la, used, errnote);
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
    insert into audit_table_stats values ('factory_provisioning_runs', rc, la, used, errnote);
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
    insert into audit_table_stats values ('factory_worker_bindings', rc, la, used, errnote);
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
    insert into audit_table_stats values ('firm_client_relationships', rc, la, used, errnote);
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
    insert into audit_table_stats values ('firm_memberships', rc, la, used, errnote);
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
    insert into audit_table_stats values ('firms', rc, la, used, errnote);
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
    insert into audit_table_stats values ('front_desk_enquiries', rc, la, used, errnote);
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
    insert into audit_table_stats values ('intake_sessions', rc, la, used, errnote);
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
    insert into audit_table_stats values ('invoices', rc, la, used, errnote);
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
    insert into audit_table_stats values ('leads', rc, la, used, errnote);
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
    insert into audit_table_stats values ('marketplace_listings', rc, la, used, errnote);
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
    insert into audit_table_stats values ('network_capabilities', rc, la, used, errnote);
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
    insert into audit_table_stats values ('network_conflict_checks', rc, la, used, errnote);
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
    insert into audit_table_stats values ('network_credentials', rc, la, used, errnote);
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
    insert into audit_table_stats values ('network_firm_profiles', rc, la, used, errnote);
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
    insert into audit_table_stats values ('network_professional_profiles', rc, la, used, errnote);
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
    insert into audit_table_stats values ('network_qualification_gates', rc, la, used, errnote);
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
    insert into audit_table_stats values ('network_trust_signals', rc, la, used, errnote);
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
    insert into audit_table_stats values ('observatory_snapshots', rc, la, used, errnote);
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
    insert into audit_table_stats values ('pack_binding_certifications', rc, la, used, errnote);
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
    insert into audit_table_stats values ('pack_compatibility_checks', rc, la, used, errnote);
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
    insert into audit_table_stats values ('payment_provider_configs', rc, la, used, errnote);
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
    insert into audit_table_stats values ('payment_statuses', rc, la, used, errnote);
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
    insert into audit_table_stats values ('persons', rc, la, used, errnote);
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
    insert into audit_table_stats values ('pilot_acceptance_reviews', rc, la, used, errnote);
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
    insert into audit_table_stats values ('pilot_expansion_cohorts', rc, la, used, errnote);
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
    insert into audit_table_stats values ('pilot_feedback', rc, la, used, errnote);
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
    insert into audit_table_stats values ('pilot_handoff_records', rc, la, used, errnote);
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
    insert into audit_table_stats values ('pilot_improvement_items', rc, la, used, errnote);
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
    insert into audit_table_stats values ('pilot_incidents', rc, la, used, errnote);
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
    insert into audit_table_stats values ('pilot_report_packs', rc, la, used, errnote);
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
    insert into audit_table_stats values ('pilot_users', rc, la, used, errnote);
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
    insert into audit_table_stats values ('policy_decisions', rc, la, used, errnote);
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
    insert into audit_table_stats values ('price_build_ups', rc, la, used, errnote);
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
    insert into audit_table_stats values ('professional_authorities', rc, la, used, errnote);
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
    insert into audit_table_stats values ('professional_profiles', rc, la, used, errnote);
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
    insert into audit_table_stats values ('projects', rc, la, used, errnote);
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
    insert into audit_table_stats values ('proposal_dispatch_records', rc, la, used, errnote);
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
    insert into audit_table_stats values ('proposals', rc, la, used, errnote);
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
    insert into audit_table_stats values ('provisioned_firm_instances', rc, la, used, errnote);
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
    insert into audit_table_stats values ('qualification_renewal_reviews', rc, la, used, errnote);
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
    insert into audit_table_stats values ('quotation_cases', rc, la, used, errnote);
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
    insert into audit_table_stats values ('quotation_draft_packs', rc, la, used, errnote);
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
    insert into audit_table_stats values ('quotation_issue_records', rc, la, used, errnote);
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
    insert into audit_table_stats values ('quotation_receivable_preparations', rc, la, used, errnote);
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
    insert into audit_table_stats values ('receivable_follow_ups', rc, la, used, errnote);
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
    insert into audit_table_stats values ('release_candidate_gates', rc, la, used, errnote);
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
    insert into audit_table_stats values ('responsibility_matrices', rc, la, used, errnote);
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
    insert into audit_table_stats values ('sales_pipeline_records', rc, la, used, errnote);
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
    insert into audit_table_stats values ('schema_migrations', rc, la, used, errnote);
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
    insert into audit_table_stats values ('service_activation_records', rc, la, used, errnote);
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
    insert into audit_table_stats values ('service_packs', rc, la, used, errnote);
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
    insert into audit_table_stats values ('service_skus', rc, la, used, errnote);
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
    insert into audit_table_stats values ('specialist_assignments', rc, la, used, errnote);
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
    insert into audit_table_stats values ('specialist_invitations', rc, la, used, errnote);
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
    insert into audit_table_stats values ('stakeholder_review_boards', rc, la, used, errnote);
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
    insert into audit_table_stats values ('stakeholder_review_decisions', rc, la, used, errnote);
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
    insert into audit_table_stats values ('subscription_packages', rc, la, used, errnote);
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
    insert into audit_table_stats values ('support_cases', rc, la, used, errnote);
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
    insert into audit_table_stats values ('task_outputs', rc, la, used, errnote);
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
    insert into audit_table_stats values ('tasks', rc, la, used, errnote);
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
    insert into audit_table_stats values ('technical_qa_findings', rc, la, used, errnote);
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
    insert into audit_table_stats values ('technical_skill_bindings', rc, la, used, errnote);
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
    insert into audit_table_stats values ('tenant_onboarding_plans', rc, la, used, errnote);
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
    insert into audit_table_stats values ('tenant_pilot_controls', rc, la, used, errnote);
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
    insert into audit_table_stats values ('tenant_usage_events', rc, la, used, errnote);
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
    insert into audit_table_stats values ('tenants', rc, la, used, errnote);
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
    insert into audit_table_stats values ('tool_invocations', rc, la, used, errnote);
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
    insert into audit_table_stats values ('transmittal_drafts', rc, la, used, errnote);
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
    insert into audit_table_stats values ('work_packages', rc, la, used, errnote);
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
    insert into audit_table_stats values ('worker_instances', rc, la, used, errnote);
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
    insert into audit_table_stats values ('worker_templates', rc, la, used, errnote);
  end if;
end $$;

select * from audit_table_stats order by row_count asc nulls last, table_name;

-- Which migrations has this database actually recorded as applied (by filename)?
select filename, applied_at from schema_migrations order by filename;

-- Do any of the 7 firm-factory _legacy_v1 tables exist here (created by the 0024_zzz fix,
-- only if this database still had the old bespoke shape when that migration ran), and if
-- so, how many rows do they hold?
create temporary table audit_legacy_stats (table_name text, row_count bigint);
do $$
declare
  rc bigint;
begin
  if to_regclass('public.factory_firm_blueprints_legacy_v1') is not null then
    begin
      execute 'select count(*) from factory_firm_blueprints_legacy_v1' into rc;
      insert into audit_legacy_stats values ('factory_firm_blueprints_legacy_v1', rc);
    exception when others then
      insert into audit_legacy_stats values ('factory_firm_blueprints_legacy_v1', null);
    end;
  end if;
  if to_regclass('public.factory_provisioning_runs_legacy_v1') is not null then
    begin
      execute 'select count(*) from factory_provisioning_runs_legacy_v1' into rc;
      insert into audit_legacy_stats values ('factory_provisioning_runs_legacy_v1', rc);
    exception when others then
      insert into audit_legacy_stats values ('factory_provisioning_runs_legacy_v1', null);
    end;
  end if;
  if to_regclass('public.factory_worker_bindings_legacy_v1') is not null then
    begin
      execute 'select count(*) from factory_worker_bindings_legacy_v1' into rc;
      insert into audit_legacy_stats values ('factory_worker_bindings_legacy_v1', rc);
    exception when others then
      insert into audit_legacy_stats values ('factory_worker_bindings_legacy_v1', null);
    end;
  end if;
  if to_regclass('public.provisioned_firm_instances_legacy_v1') is not null then
    begin
      execute 'select count(*) from provisioned_firm_instances_legacy_v1' into rc;
      insert into audit_legacy_stats values ('provisioned_firm_instances_legacy_v1', rc);
    exception when others then
      insert into audit_legacy_stats values ('provisioned_firm_instances_legacy_v1', null);
    end;
  end if;
  if to_regclass('public.service_activation_records_legacy_v1') is not null then
    begin
      execute 'select count(*) from service_activation_records_legacy_v1' into rc;
      insert into audit_legacy_stats values ('service_activation_records_legacy_v1', rc);
    exception when others then
      insert into audit_legacy_stats values ('service_activation_records_legacy_v1', null);
    end;
  end if;
  if to_regclass('public.pack_compatibility_checks_legacy_v1') is not null then
    begin
      execute 'select count(*) from pack_compatibility_checks_legacy_v1' into rc;
      insert into audit_legacy_stats values ('pack_compatibility_checks_legacy_v1', rc);
    exception when others then
      insert into audit_legacy_stats values ('pack_compatibility_checks_legacy_v1', null);
    end;
  end if;
  if to_regclass('public.pack_binding_certifications_legacy_v1') is not null then
    begin
      execute 'select count(*) from pack_binding_certifications_legacy_v1' into rc;
      insert into audit_legacy_stats values ('pack_binding_certifications_legacy_v1', rc);
    exception when others then
      insert into audit_legacy_stats values ('pack_binding_certifications_legacy_v1', null);
    end;
  end if;
end $$;
select * from audit_legacy_stats order by table_name;

drop table audit_table_stats;
drop table audit_legacy_stats;