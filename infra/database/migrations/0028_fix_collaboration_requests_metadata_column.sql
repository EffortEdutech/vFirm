-- 0028_fix_collaboration_requests_metadata_column.sql
-- RECONSTRUCTED 2026-10-05 for repo parity with production.
--
-- The original 0028 was delivered by chat before the repo was linked and was
-- never saved into infra/database/migrations/. This file is a functionally
-- equivalent, idempotent rebuild from the recorded description (see
-- claude/hm-s6-database-audit-phase1.md, Item 3). Its bytes (and therefore its
-- sha256) are NOT the originals. If the original file turns up, replace this.
--
-- Note: 0023_me_s4_directory_sql_persistence.sql already adds this column, so
-- this migration is a no-op on a full chain. It was never a needed fix.

alter table collaboration_requests
  add column if not exists metadata jsonb not null default '{}';
