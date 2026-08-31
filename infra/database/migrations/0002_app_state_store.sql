-- vFirm Stage 2 transitional API store
-- Keeps the Stage 1 command-loop data durable in PostgreSQL while endpoint tables are normalized incrementally.

create table if not exists app_state (
  id text primary key,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
