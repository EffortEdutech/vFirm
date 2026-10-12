-- RA rate limiting (ADR-116, 2026-10-12): shared request counters.
--
--   rate_limits  one row per (caller key, one-minute window). key looks like 'u:<user id>|NORMAL' or 'ip:<address>|AUTH'.
--
-- Infrastructure table, not firm data: no tenant column. It is not readable or writable through Supabase's public REST API
-- (anon and authenticated lose all access); only the app role touches it. Old rows are swept by the API.

create table if not exists rate_limits (
  key text not null,
  window_start bigint not null,
  count integer not null default 0,
  primary key (key, window_start)
);

create index if not exists idx_rate_limits_window on rate_limits(window_start);

alter table rate_limits enable row level security;
alter table rate_limits force row level security;

drop policy if exists rate_limits_app_all on rate_limits;
create policy rate_limits_app_all on rate_limits for all using (true) with check (true);

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on rate_limits from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on rate_limits from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'vfirm_app') then
    grant select, insert, update, delete on rate_limits to vfirm_app;
  end if;
end
$$;
