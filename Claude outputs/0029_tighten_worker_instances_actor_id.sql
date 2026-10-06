-- HM-S6 Phase 2 item 3 (constraint/data-integrity review, 2026-09-24): closes a real gap.
--
-- worker_instances.actor_id is nullable in the live table (0006_ai_workforce_runtime.sql), but
-- provisionWorkerInstanceRecord() (apps/api/src/store.mjs) -- the only code path that ever inserts a
-- row -- always supplies a real actor_id (it creates the paired actor row in the same operation).
-- Tightening this to NOT NULL matches what the application already guarantees; it does not change any
-- application behavior. Guarded with a pre-check so this migration fails loudly instead of silently
-- corrupting data if a null actor_id somehow exists when it runs.
do $$
begin
  if exists (select 1 from worker_instances where actor_id is null) then
    raise exception 'worker_instances has rows with a null actor_id -- do not apply this migration until those are investigated and resolved first.';
  end if;
end $$;

alter table worker_instances alter column actor_id set not null;
