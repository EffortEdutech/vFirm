-- Phase 4d, slice 11 (2026-09-29): RLS backstop for Audit Ledger & Platform's 1 real table:
-- policy_decisions. Per Phase 4c's ninth slice, this is the only 1 of this domain's 3 tables
-- with an individually viable write call site -- event_log and audit_events write exclusively
-- through the generic bulk resync loop already confirmed non-viable for RLS wiring (same as
-- Firm Factory Provisioning / most of My Team/HR). Those 2 tables are explicitly NOT covered
-- by this migration.
--
-- Call site traced (confirmed by reading, not assumed): createPolicyDecisionRecord() -- the
-- only individual write path, called from produceTaskOutputRecord() and
-- requestToolInvocationRecord() (each of which already runs its OWN transaction for its own
-- tables) -- gets its own separate connection with no explicit transaction at all today (a
-- single insert, plus an ensureSystemActor() upsert of the fixed SYSTEM actors row beforehand).
-- Now wrapped in begin/commit/rollback with setTenantContext called once right after begin.
-- ensureSystemActor()'s insert has tenant_id omitted (defaults to null) and is unaffected by
-- this change: actors' insert policy (slice 2) already allows tenant_id is null regardless of
-- the session's tenant GUC.
--
-- tenant_id is NOT NULL on policy_decisions (confirmed locally), so no null-tenant exception
-- is needed. Gets a real INSERT check; no UPDATE call site exists anywhere for this table, so
-- UPDATE gets the same real check as a no-op safety net (consistent with every other slice).

alter table policy_decisions enable row level security;
alter table policy_decisions force row level security;

drop policy if exists policy_decisions_select_all on policy_decisions;
create policy policy_decisions_select_all on policy_decisions for select using (true);

drop policy if exists policy_decisions_delete_all on policy_decisions;
create policy policy_decisions_delete_all on policy_decisions for delete using (true);

drop policy if exists policy_decisions_insert_tenant_check on policy_decisions;
create policy policy_decisions_insert_tenant_check on policy_decisions for insert
  with check (tenant_id::text = current_setting('app.current_tenant_id', true));

drop policy if exists policy_decisions_update_tenant_check on policy_decisions;
create policy policy_decisions_update_tenant_check on policy_decisions for update
  using (true)
  with check (tenant_id::text = current_setting('app.current_tenant_id', true));
