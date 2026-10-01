-- HM-S7 Phase 3c (2026-09-26): promote the 7 remaining AWIA "Tier 2" tables from finding B.2's
-- 30-table inventory (role assignments, package bindings, lifecycle events, task-readiness
-- records, authority decisions, conversation threads, seat billing events) using the same
-- generated-stored-column technique verified in Phase 3a (0031) and Phase 3b (0032). Zero
-- application code changes; every new column is computed by Postgres from the existing
-- `record` jsonb on every write.
--
-- New wrinkle this group has that 3a/3b didn't: these 7 tables identify "which staff member"
-- by a plain `staff_code` field (e.g. "CFO-001"), not the member's full text id
-- (`agent-<firm_id>-<staff_code>`) that 0032's workdesk-item FK linked against via
-- `natural_key`. `staff_code` is exactly the same value as the member's own `agent_code`
-- field (confirmed directly: packages/core-domain/src/awia-virtual-staff-provisioning.mjs's
-- createVirtualStaffMember sets `agent_code: staff_code` from the same input each of these
-- sibling records is built from). So this migration adds one new unique index on
-- awia_virtual_staff_members(tenant_id, firm_id, agent_code_c) -- agent_code_c already exists
-- as of 0032 -- and every staff_code-based FK below points at that.
--
-- All 7 of these tables' rows are created in the exact same code path as their member row,
-- in the same request (apps/api/src/store.mjs: hireAwiaFirmWorkerRecord and the two other
-- callers of provisionPilotVirtualStaff, all confirmed read directly), so unlike 0032's seat
-- FK, there is no known reason a role_assignment/package_binding/lifecycle_event/
-- task_readiness_record/authority_decision/conversation_thread/seat_billing_event row would
-- exist for a staff_code with no matching member -- that would require a member to have been
-- deleted or renamed after the fact, which nothing in this codebase does. Flagging this
-- explicitly rather than asserting it as fact: run the check below in the Supabase SQL editor
-- before applying this migration, exactly like the actors.firm_id check before 0031 -- this is
-- the one thing only a query against the real database can settle, and 0032 already showed
-- this table group can carry real historical data gaps.
--
--   select 'awia_staff_role_assignments' as tbl, count(*) from awia_staff_role_assignments r
--     where not exists (select 1 from awia_virtual_staff_members m where m.tenant_id = r.tenant_id and m.firm_id = r.firm_id and m.record->>'agent_code' = r.record->>'staff_code')
--   union all select 'awia_staff_package_bindings', count(*) from awia_staff_package_bindings r
--     where not exists (select 1 from awia_virtual_staff_members m where m.tenant_id = r.tenant_id and m.firm_id = r.firm_id and m.record->>'agent_code' = r.record->>'staff_code')
--   union all select 'awia_staff_lifecycle_events', count(*) from awia_staff_lifecycle_events r
--     where not exists (select 1 from awia_virtual_staff_members m where m.tenant_id = r.tenant_id and m.firm_id = r.firm_id and m.record->>'agent_code' = r.record->>'staff_code')
--   union all select 'awia_staff_task_readiness_records', count(*) from awia_staff_task_readiness_records r
--     where not exists (select 1 from awia_virtual_staff_members m where m.tenant_id = r.tenant_id and m.firm_id = r.firm_id and m.record->>'agent_code' = r.record->>'staff_code')
--   union all select 'awia_staff_authority_decisions', count(*) from awia_staff_authority_decisions r
--     where not exists (select 1 from awia_virtual_staff_members m where m.tenant_id = r.tenant_id and m.firm_id = r.firm_id and m.record->>'agent_code' = r.record->'request'->>'staff_code')
--   union all select 'awia_staff_seat_billing_events', count(*) from awia_staff_seat_billing_events r
--     where not exists (select 1 from awia_virtual_staff_members m where m.tenant_id = r.tenant_id and m.firm_id = r.firm_id and m.record->>'agent_code' = r.record->>'staff_code');
--
-- If every count is 0, this migration applies cleanly. If any is non-zero, stop and report
-- the exact rows back before applying -- same protocol as 0032's seat orphans -- so the fix
-- can be folded into this file the same way, rather than guessed at in advance.

-- 0. Unique index needed for the staff_code-based FKs below. agent_code_c itself was added in
-- 0032; this index is new.
create unique index if not exists idx_awia_virtual_staff_members_agent_code_c
  on awia_virtual_staff_members(tenant_id, firm_id, agent_code_c);

-- 1. awia_staff_role_assignments (id = text role_assignment_id, hashed; identifies its member
-- by staff_code, per packages/core-domain/src/awia-virtual-staff-provisioning.mjs's
-- createStaffRoleAssignment)
alter table awia_staff_role_assignments
  add column if not exists staff_code_c text generated always as (record->>'staff_code') stored,
  add column if not exists role_code_c text generated always as (record->>'role_code') stored,
  add column if not exists assignment_status_c text generated always as (record->>'assignment_status') stored;

create index if not exists idx_awia_staff_role_assignments_status_c on awia_staff_role_assignments(assignment_status_c);

alter table awia_staff_role_assignments
  add constraint fk_awia_staff_role_assignments_member
  foreign key (tenant_id, firm_id, staff_code_c) references awia_virtual_staff_members(tenant_id, firm_id, agent_code_c);

-- 2. awia_staff_package_bindings (id = text package_binding_id, hashed; createStaffPackageBinding)
alter table awia_staff_package_bindings
  add column if not exists staff_code_c text generated always as (record->>'staff_code') stored,
  add column if not exists package_id_c text generated always as (record->>'package_id') stored,
  add column if not exists binding_status_c text generated always as (record->>'binding_status') stored;

create index if not exists idx_awia_staff_package_bindings_status_c on awia_staff_package_bindings(binding_status_c);

alter table awia_staff_package_bindings
  add constraint fk_awia_staff_package_bindings_member
  foreign key (tenant_id, firm_id, staff_code_c) references awia_virtual_staff_members(tenant_id, firm_id, agent_code_c);

-- 3. awia_staff_lifecycle_events (id = text lifecycle_event_id, hashed; createStaffLifecycleEvent)
alter table awia_staff_lifecycle_events
  add column if not exists staff_code_c text generated always as (record->>'staff_code') stored,
  add column if not exists from_state_c text generated always as (record->>'from_state') stored,
  add column if not exists to_state_c text generated always as (record->>'to_state') stored;

create index if not exists idx_awia_staff_lifecycle_events_to_state_c on awia_staff_lifecycle_events(to_state_c);

alter table awia_staff_lifecycle_events
  add constraint fk_awia_staff_lifecycle_events_member
  foreign key (tenant_id, firm_id, staff_code_c) references awia_virtual_staff_members(tenant_id, firm_id, agent_code_c);

-- 4. awia_staff_task_readiness_records (id = real uuid = the runtime action request_id;
-- evaluateAwiaVirtualStaffTaskReadinessRecord / assignAwiaVirtualStaffTaskRecord in store.mjs)
alter table awia_staff_task_readiness_records
  add column if not exists staff_code_c text generated always as (record->>'staff_code') stored,
  add column if not exists decision_c text generated always as (record->>'decision') stored,
  add column if not exists task_id_c uuid generated always as (nullif(record->>'task_id', '')::uuid) stored;

create index if not exists idx_awia_staff_task_readiness_records_decision_c on awia_staff_task_readiness_records(decision_c);
create index if not exists idx_awia_staff_task_readiness_records_task_c on awia_staff_task_readiness_records(task_id_c);

alter table awia_staff_task_readiness_records
  add constraint fk_awia_staff_task_readiness_records_member
  foreign key (tenant_id, firm_id, staff_code_c) references awia_virtual_staff_members(tenant_id, firm_id, agent_code_c);
alter table awia_staff_task_readiness_records
  add constraint fk_awia_staff_task_readiness_records_task
  foreign key (task_id_c) references tasks(id);

-- 5. awia_staff_authority_decisions (id = real uuid, same request_id as its readiness record;
-- built as `{id, tenant_id, firm_id, ...decision, created_at}` where `decision` is
-- evaluateVirtualStaffRuntimeAction()'s return value -- staff_code lives one level down, at
-- `decision.request.staff_code` (confirmed reading packages/core-domain/src/
-- awia-virtual-staff-authority-gate.mjs directly), not at the top level like every other
-- table here.
alter table awia_staff_authority_decisions
  add column if not exists staff_code_c text generated always as (record->'request'->>'staff_code') stored,
  add column if not exists decision_c text generated always as (record->>'decision') stored;

create index if not exists idx_awia_staff_authority_decisions_decision_c on awia_staff_authority_decisions(decision_c);

alter table awia_staff_authority_decisions
  add constraint fk_awia_staff_authority_decisions_member
  foreign key (tenant_id, firm_id, staff_code_c) references awia_virtual_staff_members(tenant_id, firm_id, agent_code_c);

-- 6. awia_staff_conversation_threads (id = real uuid = thread_id; buildConversationThread in
-- packages/core-domain/src/awia-virtual-staff-memory.mjs). workdesk_item_id/task_id are both
-- optional (nullable in the source object) and, when present, real uuids -- linked directly.
alter table awia_staff_conversation_threads
  add column if not exists staff_code_c text generated always as (record->>'staff_code') stored,
  add column if not exists status_c text generated always as (record->>'status') stored,
  add column if not exists workdesk_item_id_c uuid generated always as (nullif(record->>'workdesk_item_id', '')::uuid) stored,
  add column if not exists task_id_c uuid generated always as (nullif(record->>'task_id', '')::uuid) stored;

create index if not exists idx_awia_staff_conversation_threads_status_c on awia_staff_conversation_threads(status_c);

alter table awia_staff_conversation_threads
  add constraint fk_awia_staff_conversation_threads_member
  foreign key (tenant_id, firm_id, staff_code_c) references awia_virtual_staff_members(tenant_id, firm_id, agent_code_c);
alter table awia_staff_conversation_threads
  add constraint fk_awia_staff_conversation_threads_workdesk
  foreign key (workdesk_item_id_c) references awia_staff_workdesk_items(id);
alter table awia_staff_conversation_threads
  add constraint fk_awia_staff_conversation_threads_task
  foreign key (task_id_c) references tasks(id);

-- 7. awia_staff_seat_billing_events (id = real uuid; updateAwiaStaffSeatBillingStatusRecord)
alter table awia_staff_seat_billing_events
  add column if not exists staff_code_c text generated always as (record->>'staff_code') stored,
  add column if not exists to_status_c text generated always as (record->>'to_status') stored;

create index if not exists idx_awia_staff_seat_billing_events_status_c on awia_staff_seat_billing_events(to_status_c);

alter table awia_staff_seat_billing_events
  add constraint fk_awia_staff_seat_billing_events_member
  foreign key (tenant_id, firm_id, staff_code_c) references awia_virtual_staff_members(tenant_id, firm_id, agent_code_c);

-- Not promoted here, intentionally (finding B.2): awia_staff_memory_entries,
-- awia_staff_conversation_messages, awia_staff_evidence_packs remain free-form jsonb -- they
-- are genuinely unstructured content (memory summaries, message bodies, evidence bundles),
-- not relational join points, so promoting them would add FK/index overhead with no real
-- integrity benefit. This closes Phase 3 for the AWIA table group: all 17 AWIA_RELATIONAL_TABLES
-- are now either promoted (14) or intentionally left as jsonb (3).
