create table if not exists administration_skill_bindings (
  id uuid primary key, tenant_id uuid not null references tenants(id), firm_id uuid not null references firms(id),
  worker_template_code text not null, role_skill_ref text not null, worker_skill_ref text not null,
  input_schema_ref text not null, output_schema_ref text not null, supervisor_actor_id uuid not null references actors(id),
  permissions jsonb not null default '[]', forbidden_actions jsonb not null default '[]',
  status text not null default 'ACTIVE', version text not null default '1.0', created_at timestamptz not null default now(), metadata jsonb not null default '{}'
);
create index if not exists idx_admin_skill_bindings_scope on administration_skill_bindings(tenant_id, firm_id, status);

create table if not exists correspondence_records (
  id uuid primary key, tenant_id uuid not null references tenants(id), firm_id uuid not null references firms(id),
  relationship_id uuid references firm_client_relationships(id), project_id uuid references projects(id),
  direction text not null, channel text not null, subject text not null, correspondent text not null,
  received_or_drafted_at timestamptz not null, status text not null, owner_actor_id uuid references actors(id),
  response_due_at timestamptz, source_ref text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), metadata jsonb not null default '{}'
);
create index if not exists idx_correspondence_scope on correspondence_records(tenant_id, firm_id, status);

create table if not exists document_register_entries (
  id uuid primary key, tenant_id uuid not null references tenants(id), firm_id uuid not null references firms(id),
  relationship_id uuid references firm_client_relationships(id), project_id uuid references projects(id),
  document_number text not null, title text not null, document_type text not null, discipline text,
  classification text not null default 'CLIENT_CONFIDENTIAL', status text not null default 'ACTIVE',
  current_revision_id uuid, owner_actor_id uuid references actors(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}', unique(tenant_id, firm_id, document_number)
);
create index if not exists idx_document_register_scope on document_register_entries(tenant_id, firm_id, status);

create table if not exists document_revision_records (
  id uuid primary key, tenant_id uuid not null references tenants(id), firm_id uuid not null references firms(id),
  document_register_entry_id uuid not null references document_register_entries(id),
  revision text not null, version_label text not null, storage_ref text not null, content_hash text not null,
  status text not null default 'CURRENT', supersedes_revision_id uuid references document_revision_records(id),
  created_by_actor_id uuid references actors(id), created_at timestamptz not null default now(),
  metadata jsonb not null default '{}', unique(document_register_entry_id, revision)
);
alter table document_register_entries drop constraint if exists document_register_entries_current_revision_id_fkey;
alter table document_register_entries add constraint document_register_entries_current_revision_id_fkey foreign key (current_revision_id) references document_revision_records(id);

create table if not exists administrative_deadlines (
  id uuid primary key, tenant_id uuid not null references tenants(id), firm_id uuid not null references firms(id),
  project_id uuid references projects(id), relationship_id uuid references firm_client_relationships(id),
  title text not null, due_at timestamptz not null, priority text not null default 'NORMAL',
  status text not null default 'OPEN', assigned_actor_or_worker_ref uuid, source_ref text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), completed_at timestamptz, metadata jsonb not null default '{}'
);
create index if not exists idx_admin_deadlines_scope on administrative_deadlines(tenant_id, firm_id, status, due_at);

create table if not exists transmittal_drafts (
  id uuid primary key, tenant_id uuid not null references tenants(id), firm_id uuid not null references firms(id),
  project_id uuid references projects(id), relationship_id uuid references firm_client_relationships(id),
  recipient text not null, subject text not null, document_revision_refs jsonb not null default '[]',
  message_body text not null, status text not null default 'DRAFT_REVIEW_REQUIRED',
  requires_principal_approval boolean not null default true, prepared_by_actor_id uuid references actors(id),
  approved_by_actor_id uuid references actors(id), issued_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), metadata jsonb not null default '{}',
  check (requires_principal_approval = true), check (status <> 'ISSUED')
);
create index if not exists idx_transmittal_drafts_scope on transmittal_drafts(tenant_id, firm_id, status);
