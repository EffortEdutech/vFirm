-- MINIMAL isolated test -- proves whether exception-based fallback works in your
-- Supabase SQL editor, for just the one table that's been failing. Read-only.
-- Run ONLY this (paste into a brand-new SQL editor tab, not a reused one).

do $$
declare
  rc bigint;
  la text;
  used text;
begin
  begin
    execute 'select count(*), max(updated_at)::text from pack_compatibility_checks' into rc, la;
    used := 'updated_at';
  exception when undefined_column then
    begin
      execute 'select count(*), max(created_at)::text from pack_compatibility_checks' into rc, la;
      used := 'created_at';
    exception when undefined_column then
      execute 'select count(*), null from pack_compatibility_checks' into rc, la;
      used := 'none';
    end;
  end;
  raise notice 'pack_compatibility_checks: row_count=%, last_activity=%, ts_column_used=%', rc, la, used;
end $$;
