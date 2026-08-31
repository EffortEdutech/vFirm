create table if not exists collaboration_workspaces (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  requesting_firm_id uuid not null references firms(id),
  provider_firm_id uuid not null references firms(id),
  specialist_invitation_id uuid not null references specialist_invitations(id),
  qualification_gate_id uuid references network_qualification_gates(id),
  workspace_status text not null default 'ACTIVE',
  data_room_policy jsonb not null default '{}',
  permitted_evidence_refs jsonb not null default '[]',
  created_by_actor_id uuid references actors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create table if not exists collaboration_workspace_participants (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  workspace_id uuid not null references collaboration_workspaces(id),
  firm_id uuid not null references firms(id),
  actor_id uuid references actors(id),
  participant_role text not null default 'SPECIALIST',
  access_status text not null default 'ACTIVE',
  permissions jsonb not null default '[]',
  granted_by_actor_id uuid references actors(id),
  granted_at timestamptz not null default now(),
  revoked_by_actor_id uuid references actors(id),
  revoked_at timestamptz,
  metadata jsonb not null default '{}'
);

create table if not exists collaboration_workspace_evidence (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  workspace_id uuid not null references collaboration_workspaces(id),
  participant_id uuid not null references collaboration_workspace_participants(id),
  evidence_ref text not null,
  evidence_type text not null default 'CONTROLLED_EVIDENCE_REF',
  access_scope text not null default 'WORKSPACE_ONLY',
  added_by_actor_id uuid references actors(id),
  added_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  constraint chk_collaboration_workspace_evidence_scope check (access_scope = 'WORKSPACE_ONLY')
);

create index if not exists idx_collaboration_workspaces_scope on collaboration_workspaces(tenant_id, requesting_firm_id, provider_firm_id, workspace_status);
create index if not exists idx_collaboration_participants_status on collaboration_workspace_participants(tenant_id, workspace_id, access_status);
create index if not exists idx_collaboration_evidence_scope on collaboration_workspace_evidence(tenant_id, workspace_id, access_scope);