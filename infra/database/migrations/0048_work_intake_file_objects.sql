-- ADR-089 W1 (B1, 2026-09-30): Firm operating workflow -- uploaded file metadata.
--
-- The file BYTES live in Supabase Storage (private bucket, default name "vfirm-files", object key
-- tenant/<tenant_id>/firm/<firm_id>/<file_id>) or, in local development, on disk under data/files/.
-- This table holds only the metadata record written by registerFileObjectRecord() in
-- apps/api/src/store.mjs: filename, MIME type, size, SHA-256, storage backend/key, classification,
-- uploader. Same generic shape as migrations 0024/0025/0027 (id uuid pk, natural_key = the
-- app-level id, tenant/firm scoping columns, full record as `record jsonb`), written and read via
-- WORK_INTAKE_RELATIONAL_TABLES / persistWorkIntakeFromStore / readWorkIntakeRelational.
--
-- Like the 0027 tables, file_objects is written only through the bulk upsert-sync loop in
-- withStore(), which Phase 4c/4d confirmed is not viable for per-row RLS wiring -- so no RLS
-- backstop is added here, consistent with those tables. Scope is enforced in the API: every
-- upload/download requires a verified actor in the owning tenant/firm, and every
-- "file:<id>" evidence/output ref is checked against tenant_id/firm_id (assertScopedFileRefs).
--
-- Before first production upload: confirm the Supabase Storage bucket exists and is PRIVATE.
-- The API creates it as private on first use if missing, and refuses to use it if it is public.

create table if not exists file_objects (
  id uuid primary key,
  natural_key text not null,
  tenant_id uuid not null references tenants(id),
  firm_id uuid not null references firms(id),
  record jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_file_objects_natural_key on file_objects(tenant_id, firm_id, natural_key);
create index if not exists idx_file_objects_scope on file_objects(tenant_id, firm_id);

alter table file_objects
  add column if not exists sha256_c text generated always as (record->>'sha256') stored,
  add column if not exists purpose_c text generated always as (record->>'purpose') stored;

create index if not exists idx_file_objects_sha256_c on file_objects(sha256_c);
