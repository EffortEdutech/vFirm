-- 0030_awia_ai_actor_identity.sql
-- RECONSTRUCTED 2026-10-05 for repo parity with production.
--
-- The original 0030 was delivered by chat before the repo was linked and was
-- never saved into infra/database/migrations/. This file is a functionally
-- equivalent, idempotent rebuild from the recorded description (see
-- claude/vfirm-architecture-review.md, Phase 2). Its bytes (and therefore its
-- sha256) are NOT the originals. If the original file turns up, replace this.
--
-- Adds a nullable ai_actor_id alongside the accountable human actor_id on the
-- audit trail, so AI-worker actions can be attributed without replacing the
-- human. Existing rows and callers are unaffected.

alter table event_log
  add column if not exists ai_actor_id uuid references actors(id);

alter table audit_events
  add column if not exists ai_actor_id uuid references actors(id);
