-- CE-S3 (ADR-097, 2026-10-05): Connected EDCS -- rule engine and register-driven work.
--
-- Two tables, same generic shape and write-side tenant backstop as 0050 (and written directly by
-- apps/api/src/edcs-repository.mjs, not through the whole-store sync):
--
--   automation_rules       one row per rule the owner created from a template or by hand: trigger
--                          (EDCS_EVENT now, SCHEDULE later), condition, action, enabled flag, owner.
--                          Every rule is created disabled; the owner turns it on after a dry run.
--   automation_rule_runs   two kinds of rows:
--                            kind OCCURRENCE  one per (rule, transaction, occurrence key): the dedupe
--                                             record. The unique natural_key is what stops the same
--                                             condition creating a second request, even if two
--                                             evaluations race. status CLAIMED / CREATED / ERROR, the
--                                             created work request id, the assignment outcome.
--                            kind EVALUATION  one per evaluation (import, file upload, tick, manual,
--                                             dry run): trigger, counts, per-rule matches.
--
-- Natural keys inside (tenant, firm): rules -> the rule id; occurrences -> rule id | transaction id |
-- occurrence key; evaluations -> the evaluation id.

create table if not exists automation_rules (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists automation_rule_runs (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_automation_rules_natural_key on automation_rules(tenant_id, firm_id, natural_key);
create unique index if not exists idx_automation_rule_runs_natural_key on automation_rule_runs(tenant_id, firm_id, natural_key);
create index if not exists idx_automation_rules_scope on automation_rules(tenant_id, firm_id);
create index if not exists idx_automation_rule_runs_scope on automation_rule_runs(tenant_id, firm_id);

alter table automation_rules
  add column if not exists enabled_c boolean generated always as ((record->>'enabled')::boolean) stored;

alter table automation_rule_runs
  add column if not exists kind_c text generated always as (record->>'kind') stored,
  add column if not exists rule_id_c text generated always as (record->>'rule_id') stored,
  add column if not exists status_c text generated always as (record->>'status') stored,
  add column if not exists transaction_id_c text generated always as (record->>'transaction_id') stored;

create index if not exists idx_automation_rules_enabled_c on automation_rules(tenant_id, firm_id, enabled_c);
create index if not exists idx_automation_rule_runs_rule_c on automation_rule_runs(tenant_id, firm_id, rule_id_c);
create index if not exists idx_automation_rule_runs_tx_c on automation_rule_runs(tenant_id, firm_id, transaction_id_c);

-- Write-side tenant backstop (same design as 0034 and 0050).
do $$
declare
  t text;
begin
  foreach t in array array['automation_rules', 'automation_rule_runs']
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

-- The app role needs the same privileges it has on the 0050 tables. (Granted explicitly because
-- production tables created in the SQL editor do not inherit default privileges for vfirm_app.)
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'vfirm_app') then
    execute 'grant select, insert, update, delete on automation_rules, automation_rule_runs to vfirm_app';
  end if;
end $$;
