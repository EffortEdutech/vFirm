-- HM-S7 Phase 2 (2026-09-24): give AWIA virtual staff a real actors identity.
--
-- Before this migration, AWIA virtual staff members (awia_virtual_staff_members, populated by
-- packages/core-domain/src/awia-virtual-staff-provisioning.mjs) were identified only by a synthetic
-- string (`agent_id: "agent-<firm_id>-<staff_code>"`) that never corresponded to a real row in the
-- `actors` table. This is a different, disconnected identity model from the older, correct one used
-- by `worker_instances` (migration 0006_ai_workforce_runtime.sql), where every AI worker has a real
-- `actors` row (actor_type = 'AI_AGENT') linked via `worker_instances.actor_id`. Because AWIA staff
-- never had a real actor, every event/audit/policy record touching AWIA work had to be attributed to
-- the *human* who happened to be supervising (policy_decisions/event_log/audit_events.actor_id is
-- `uuid not null references actors(id)`, so it can never be null or a synthetic string) -- there was
-- no way, even in principle, to record which AI worker actually did something, once AWIA runtime
-- execution (currently disabled: provisioningBoundary = "provisioning_only_no_autonomous_execution")
-- is eventually turned on.
--
-- This migration does not change who is accountable: by explicit product decision, the human actor
-- stays as event_log.actor_id / audit_events.actor_id (attribution/accountability is unchanged). It
-- adds a new, separate, nullable `ai_actor_id` column to event_log and audit_events so the AWIA
-- worker's own real actor identity can be recorded *alongside* the accountable human, once
-- apps/api/src/store.mjs creates a real actors row for each AWIA staff member (see
-- ensureAwiaAgentActor() and awia_virtual_staff_members.agent_actor_id, populated at provisioning/
-- hire time). No backfill is performed here: this only adds the column and its FK; existing rows get
-- ai_actor_id = null, which is correct since no AWIA worker has ever autonomously acted in this
-- system to date.

alter table event_log add column if not exists ai_actor_id uuid references actors(id);
alter table audit_events add column if not exists ai_actor_id uuid references actors(id);

create index if not exists idx_event_log_ai_actor on event_log(ai_actor_id) where ai_actor_id is not null;
create index if not exists idx_audit_events_ai_actor on audit_events(ai_actor_id) where ai_actor_id is not null;
