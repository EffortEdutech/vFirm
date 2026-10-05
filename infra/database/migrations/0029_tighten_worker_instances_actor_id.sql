-- 0029_tighten_worker_instances_actor_id.sql
-- RECONSTRUCTED 2026-10-05 for repo parity with production.
--
-- The original 0029 was delivered by chat before the repo was linked and was
-- never saved into infra/database/migrations/. This file is a functionally
-- equivalent, idempotent rebuild from the recorded description (see
-- claude/hm-s6-database-audit-phase1.md, Item 3). Its bytes (and therefore its
-- sha256) are NOT the originals. If the original file turns up, replace this.
--
-- worker_instances.actor_id was nullable, but the only insert site always
-- supplies one. Guarded: refuses to run if any null rows exist.

do $$
begin
  if exists (select 1 from worker_instances where actor_id is null) then
    raise exception '0029: worker_instances has rows with null actor_id; fix them before tightening';
  end if;
  alter table worker_instances alter column actor_id set not null;
end
$$;
