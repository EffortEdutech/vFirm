-- HM-S6 item 3 (repository layer scaffolding): a second round of the same gap already fixed once
-- for Firm Factory in migration 0025.
--
-- While building the repository modules for HM-S6 item 3, mapping every one of the 119 store
-- collections to a real Postgres table surfaced 6 more collections with NO dedicated table anywhere
-- in infra/database/migrations/ -- confirmed by reading apps/api/src/store.mjs: every read/write for
-- these 6 goes through withStore()/readStore() only, so today they persist solely inside the generic
-- JSONB app_state blob. Same situation as Firm Factory before 0025 (round-tripping correctly, not a
-- data-loss bug), just never caught by the HM-S6 item 1 audit or the 0026 migration-coverage fix,
-- because neither of those was scoped to collections outside readRelationalStore()'s expected table
-- list -- these 6 were never on that list at all.
--
-- Product owner authorized Option A (2026-09-23): add real Postgres tables now, same generic shape
-- as migrations 0024/0025 (id uuid pk, natural_key = the original app-level id, tenant/firm scoping
-- columns, full record kept as `record jsonb`), so every domain's repository module in this sprint
-- has a genuine table to issue targeted SQL against. See QUOTATION_AWIA_RELATIONAL_TABLES /
-- persistQuotationAwiaFromStore / readQuotationAwiaRelational in apps/api/src/store.mjs.
--
-- Collections covered, and which domain repository they belong to (docs/hm-s6-handler-data-contract.md):
--   Sales & Intake:   quotation_cases, boq_extraction_aids, quotation_draft_packs,
--                     quotation_issue_records, quotation_receivable_preparations
--   My Team & HR:     awia_firm_package_assignments
-- All 6 already use genuinely random (or postgres-uuid) ids at the application level (confirmed by
-- reading store.mjs's builder functions), so the surrogate key and natural key are the same value,
-- exactly like migration 0025's Firm Factory tables.

create table if not exists quotation_cases (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_quotation_cases_natural_key on quotation_cases(tenant_id, firm_id, natural_key);
create index if not exists idx_quotation_cases_scope on quotation_cases(tenant_id, firm_id);

create table if not exists boq_extraction_aids (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_boq_extraction_aids_natural_key on boq_extraction_aids(tenant_id, firm_id, natural_key);
create index if not exists idx_boq_extraction_aids_scope on boq_extraction_aids(tenant_id, firm_id);

create table if not exists quotation_draft_packs (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_quotation_draft_packs_natural_key on quotation_draft_packs(tenant_id, firm_id, natural_key);
create index if not exists idx_quotation_draft_packs_scope on quotation_draft_packs(tenant_id, firm_id);

create table if not exists quotation_issue_records (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_quotation_issue_records_natural_key on quotation_issue_records(tenant_id, firm_id, natural_key);
create index if not exists idx_quotation_issue_records_scope on quotation_issue_records(tenant_id, firm_id);

create table if not exists quotation_receivable_preparations (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_quotation_receivable_preparations_natural_key on quotation_receivable_preparations(tenant_id, firm_id, natural_key);
create index if not exists idx_quotation_receivable_preparations_scope on quotation_receivable_preparations(tenant_id, firm_id);

create table if not exists awia_firm_package_assignments (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_awia_firm_package_assignments_natural_key on awia_firm_package_assignments(tenant_id, firm_id, natural_key);
create index if not exists idx_awia_firm_package_assignments_scope on awia_firm_package_assignments(tenant_id, firm_id);
