-- HM-S7 Phase 3b (2026-09-25): promote the remaining Tier 1 tables from B.2's 30-table
-- inventory -- the 7 AWIA staff-lifecycle tables and the 6 Quotation tables -- using the same
-- generated-stored-column technique verified in Phase 3a (0031, applied to production
-- 2026-09-25). Zero application code changes; Postgres computes every new column from the
-- existing `record` jsonb on every write.
--
-- One wrinkle not present in the Firm Factory group: several AWIA tables use a text-based
-- natural id (e.g. `agent-<firm_id>-<staff_code>`, `seat-<staff_code>`) as their real
-- application-level identifier, not a UUID -- store.mjs's own `deterministicUuid()` hashes
-- that text into the table's UUID primary key, and other tables' jsonb fields that reference
-- these rows store the ORIGINAL TEXT id, not the hashed UUID (confirmed by reading
-- awiaRecord()/awiaProvisioningSnapshot() and every call site directly). Reproducing that
-- SHA-256-based hash in SQL would be exact but needlessly fragile; instead, those FKs are
-- built against the already-unique `(tenant_id, firm_id, natural_key)` index every one of
-- these generic tables already has (`natural_key` holds that same original text id) -- exact,
-- and zero risk of a hashing mismatch. Tables whose ids were already real UUIDs at the
-- application level (workdesk items, output drafts/reviews, client delivery drafts, all 6
-- Quotation tables) are linked directly by `id`, the simpler and equally exact path.
--
-- Field names below are taken directly from where these records are built: apps/api/src/
-- store.mjs (workdesk items, output drafts/reviews, client delivery drafts, all 6 Quotation
-- record builders, assignAwiaFirmPackageRecord) and packages/core-domain/src/
-- awia-virtual-staff-provisioning.mjs (createVirtualStaffSeat, createVirtualStaffMember) plus
-- store.mjs's own awiaProvisioningSnapshot()/awiaRunFromStore() for the provisioning run shape.

-- ===== AWIA group =====

-- 1. awia_virtual_staff_provisioning_runs (id = text provisioning_run_id, hashed)
alter table awia_virtual_staff_provisioning_runs
  add column if not exists status_c text generated always as (record->>'status') stored,
  add column if not exists salary_plan_id_c text generated always as (record->>'salary_plan_id') stored;

create index if not exists idx_awia_provisioning_runs_status_c on awia_virtual_staff_provisioning_runs(status_c);

-- 2. awia_virtual_staff_seats (id = text staff_seat_id, hashed)
alter table awia_virtual_staff_seats
  add column if not exists seat_status_c text generated always as (record->>'seat_status') stored,
  add column if not exists staff_code_c text generated always as (record->>'staff_code') stored;

create index if not exists idx_awia_virtual_staff_seats_status_c on awia_virtual_staff_seats(seat_status_c);

-- 3. awia_virtual_staff_members (id = text agent_id, hashed)
alter table awia_virtual_staff_members
  add column if not exists lifecycle_status_c text generated always as (record->>'lifecycle_status') stored,
  add column if not exists agent_code_c text generated always as (record->>'agent_code') stored,
  add column if not exists agent_actor_id_c uuid generated always as (nullif(record->>'agent_actor_id', '')::uuid) stored,
  add column if not exists staff_seat_id_c text generated always as (record->>'staff_seat_id') stored;

create index if not exists idx_awia_virtual_staff_members_status_c on awia_virtual_staff_members(lifecycle_status_c);
create index if not exists idx_awia_virtual_staff_members_actor_c on awia_virtual_staff_members(agent_actor_id_c);

alter table awia_virtual_staff_members
  add constraint fk_awia_virtual_staff_members_agent_actor
  foreign key (agent_actor_id_c) references actors(id);

-- Data-quality backfill, found running this migration against real production data
-- (2026-09-26): 10 awia_virtual_staff_members rows across 2 firms reference a
-- staff_seat_id that has no matching awia_virtual_staff_seats row -- these members
-- pre-date this table's introduction, or were created through a path that never wrote a
-- seat row. Rather than weaken the FK below, backfill the missing seat from what the
-- member record already knows about itself (same approach as the Phase 2 actor
-- backfill): salary_plan_id from the member's own salary_plan_ref, staff_code from
-- agent_code, seat_status mirrored from the member's lifecycle_status (the closest real
-- signal available for whether the seat should read as active). package_id and
-- created_by_actor_id are not recoverable from the member record and are left null --
-- neither is read by any handler or generated column added in this migration, so this
-- is a safe, honest gap-fill rather than an invented value. This insert itself is
-- idempotent (only inserts a seat when one is genuinely missing for that (tenant_id,
-- firm_id, natural_key)) -- though, like every other migration in this repo, the file as
-- a whole is not meant to be re-run once its `add constraint`/`add column` statements
-- have succeeded, since Postgres has no `add constraint if not exists`.
insert into awia_virtual_staff_seats (id, natural_key, tenant_id, firm_id, record)
select
  gen_random_uuid(),
  m.record->>'staff_seat_id',
  m.tenant_id,
  m.firm_id,
  jsonb_build_object(
    'staff_seat_id', m.record->>'staff_seat_id',
    'tenant_id', m.tenant_id,
    'firm_id', m.firm_id,
    'salary_plan_id', m.record->>'salary_plan_ref',
    'package_id', null,
    'staff_code', m.record->>'agent_code',
    'seat_status', coalesce(m.record->>'lifecycle_status', 'ACTIVE'),
    'commercial_boundary', 'staff_seat_and_salary_plan_do_not_grant_authority',
    'created_by_actor_id', null,
    'backfilled_by_migration', '0032_promote_awia_and_quotation_relational_columns'
  )
from awia_virtual_staff_members m
where m.record->>'staff_seat_id' is not null
  and not exists (
    select 1 from awia_virtual_staff_seats s
    where s.tenant_id = m.tenant_id and s.firm_id = m.firm_id
      and s.natural_key = m.record->>'staff_seat_id'
  );

alter table awia_virtual_staff_members
  add constraint fk_awia_virtual_staff_members_seat
  foreign key (tenant_id, firm_id, staff_seat_id_c) references awia_virtual_staff_seats(tenant_id, firm_id, natural_key);

-- 4. awia_staff_workdesk_items (id = real uuid; staff_member_id field holds the MEMBER's
-- text agent_id, not a uuid -- linked via natural_key, per the header note above)
alter table awia_staff_workdesk_items
  add column if not exists workdesk_status_c text generated always as (record->>'workdesk_status') stored,
  add column if not exists staff_member_id_c text generated always as (record->>'staff_member_id') stored;

create index if not exists idx_awia_staff_workdesk_items_status_c on awia_staff_workdesk_items(workdesk_status_c);

alter table awia_staff_workdesk_items
  add constraint fk_awia_staff_workdesk_items_member
  foreign key (tenant_id, firm_id, staff_member_id_c) references awia_virtual_staff_members(tenant_id, firm_id, natural_key);

-- 5. awia_staff_output_drafts (id = real uuid; workdesk_item_id = the workdesk item's own
-- real uuid, so this one links directly by id, not natural_key)
alter table awia_staff_output_drafts
  add column if not exists status_c text generated always as (record->>'status') stored,
  add column if not exists workdesk_item_id_c uuid generated always as (nullif(record->>'workdesk_item_id', '')::uuid) stored;

create index if not exists idx_awia_staff_output_drafts_status_c on awia_staff_output_drafts(status_c);
create index if not exists idx_awia_staff_output_drafts_workdesk_c on awia_staff_output_drafts(workdesk_item_id_c);

alter table awia_staff_output_drafts
  add constraint fk_awia_staff_output_drafts_workdesk
  foreign key (workdesk_item_id_c) references awia_staff_workdesk_items(id);

-- 6. awia_staff_output_reviews (id = real uuid; output_draft_id/workdesk_item_id are real uuids)
alter table awia_staff_output_reviews
  add column if not exists review_decision_c text generated always as (record->>'review_decision') stored,
  add column if not exists output_draft_id_c uuid generated always as (nullif(record->>'output_draft_id', '')::uuid) stored,
  add column if not exists workdesk_item_id_c uuid generated always as (nullif(record->>'workdesk_item_id', '')::uuid) stored;

create index if not exists idx_awia_staff_output_reviews_draft_c on awia_staff_output_reviews(output_draft_id_c);

alter table awia_staff_output_reviews
  add constraint fk_awia_staff_output_reviews_draft
  foreign key (output_draft_id_c) references awia_staff_output_drafts(id);
alter table awia_staff_output_reviews
  add constraint fk_awia_staff_output_reviews_workdesk
  foreign key (workdesk_item_id_c) references awia_staff_workdesk_items(id);

-- 7. awia_client_delivery_drafts (id = real uuid; all three references are real uuids)
alter table awia_client_delivery_drafts
  add column if not exists status_c text generated always as (record->>'status') stored,
  add column if not exists output_draft_id_c uuid generated always as (nullif(record->>'output_draft_id', '')::uuid) stored,
  add column if not exists output_review_id_c uuid generated always as (nullif(record->>'output_review_id', '')::uuid) stored,
  add column if not exists workdesk_item_id_c uuid generated always as (nullif(record->>'workdesk_item_id', '')::uuid) stored;

create index if not exists idx_awia_client_delivery_drafts_status_c on awia_client_delivery_drafts(status_c);

alter table awia_client_delivery_drafts
  add constraint fk_awia_client_delivery_drafts_output
  foreign key (output_draft_id_c) references awia_staff_output_drafts(id);
alter table awia_client_delivery_drafts
  add constraint fk_awia_client_delivery_drafts_review
  foreign key (output_review_id_c) references awia_staff_output_reviews(id);
alter table awia_client_delivery_drafts
  add constraint fk_awia_client_delivery_drafts_workdesk
  foreign key (workdesk_item_id_c) references awia_staff_workdesk_items(id);

-- ===== Quotation group (all ids and cross-references are real uuids already) =====

-- 8. quotation_cases
alter table quotation_cases
  add column if not exists status_c text generated always as (record->>'status') stored,
  add column if not exists relationship_id_c uuid generated always as (nullif(record->>'relationship_id', '')::uuid) stored,
  add column if not exists intake_session_id_c uuid generated always as (nullif(record->>'intake_session_id', '')::uuid) stored,
  add column if not exists proposal_id_c uuid generated always as (nullif(record->>'proposal_id', '')::uuid) stored;

create index if not exists idx_quotation_cases_status_c on quotation_cases(status_c);

alter table quotation_cases
  add constraint fk_quotation_cases_relationship
  foreign key (relationship_id_c) references firm_client_relationships(id);
alter table quotation_cases
  add constraint fk_quotation_cases_intake_session
  foreign key (intake_session_id_c) references intake_sessions(id);
alter table quotation_cases
  add constraint fk_quotation_cases_proposal
  foreign key (proposal_id_c) references proposals(id);

-- 9. boq_extraction_aids
alter table boq_extraction_aids
  add column if not exists extraction_status_c text generated always as (record->>'extraction_status') stored,
  add column if not exists quotation_case_id_c uuid generated always as (nullif(record->>'quotation_case_id', '')::uuid) stored;

create index if not exists idx_boq_extraction_aids_status_c on boq_extraction_aids(extraction_status_c);
create index if not exists idx_boq_extraction_aids_case_c on boq_extraction_aids(quotation_case_id_c);

alter table boq_extraction_aids
  add constraint fk_boq_extraction_aids_case
  foreign key (quotation_case_id_c) references quotation_cases(id);

-- 10. quotation_draft_packs
alter table quotation_draft_packs
  add column if not exists draft_status_c text generated always as (record->>'draft_status') stored,
  add column if not exists quotation_case_id_c uuid generated always as (nullif(record->>'quotation_case_id', '')::uuid) stored,
  add column if not exists boq_extraction_aid_id_c uuid generated always as (nullif(record->>'boq_extraction_aid_id', '')::uuid) stored,
  add column if not exists proposal_id_c uuid generated always as (nullif(record->>'proposal_id', '')::uuid) stored,
  add column if not exists correspondence_record_id_c uuid generated always as (nullif(record->>'correspondence_record_id', '')::uuid) stored;

create index if not exists idx_quotation_draft_packs_status_c on quotation_draft_packs(draft_status_c);
create index if not exists idx_quotation_draft_packs_case_c on quotation_draft_packs(quotation_case_id_c);

alter table quotation_draft_packs
  add constraint fk_quotation_draft_packs_case
  foreign key (quotation_case_id_c) references quotation_cases(id);
alter table quotation_draft_packs
  add constraint fk_quotation_draft_packs_extraction_aid
  foreign key (boq_extraction_aid_id_c) references boq_extraction_aids(id);
alter table quotation_draft_packs
  add constraint fk_quotation_draft_packs_proposal
  foreign key (proposal_id_c) references proposals(id);
alter table quotation_draft_packs
  add constraint fk_quotation_draft_packs_correspondence
  foreign key (correspondence_record_id_c) references correspondence_records(id);

-- 11. quotation_issue_records
alter table quotation_issue_records
  add column if not exists issue_status_c text generated always as (record->>'issue_status') stored,
  add column if not exists quotation_case_id_c uuid generated always as (nullif(record->>'quotation_case_id', '')::uuid) stored,
  add column if not exists quotation_draft_pack_id_c uuid generated always as (nullif(record->>'quotation_draft_pack_id', '')::uuid) stored,
  add column if not exists correspondence_record_id_c uuid generated always as (nullif(record->>'correspondence_record_id', '')::uuid) stored;

create index if not exists idx_quotation_issue_records_status_c on quotation_issue_records(issue_status_c);

alter table quotation_issue_records
  add constraint fk_quotation_issue_records_case
  foreign key (quotation_case_id_c) references quotation_cases(id);
alter table quotation_issue_records
  add constraint fk_quotation_issue_records_draft_pack
  foreign key (quotation_draft_pack_id_c) references quotation_draft_packs(id);
alter table quotation_issue_records
  add constraint fk_quotation_issue_records_correspondence
  foreign key (correspondence_record_id_c) references correspondence_records(id);

-- 12. quotation_receivable_preparations
alter table quotation_receivable_preparations
  add column if not exists receivable_status_c text generated always as (record->>'receivable_status') stored,
  add column if not exists quotation_issue_record_id_c uuid generated always as (nullif(record->>'quotation_issue_record_id', '')::uuid) stored,
  add column if not exists quotation_case_id_c uuid generated always as (nullif(record->>'quotation_case_id', '')::uuid) stored,
  add column if not exists quotation_draft_pack_id_c uuid generated always as (nullif(record->>'quotation_draft_pack_id', '')::uuid) stored;

create index if not exists idx_quotation_receivable_prep_status_c on quotation_receivable_preparations(receivable_status_c);

alter table quotation_receivable_preparations
  add constraint fk_quotation_receivable_prep_issue
  foreign key (quotation_issue_record_id_c) references quotation_issue_records(id);
alter table quotation_receivable_preparations
  add constraint fk_quotation_receivable_prep_case
  foreign key (quotation_case_id_c) references quotation_cases(id);
alter table quotation_receivable_preparations
  add constraint fk_quotation_receivable_prep_draft_pack
  foreign key (quotation_draft_pack_id_c) references quotation_draft_packs(id);

-- 13. awia_firm_package_assignments
alter table awia_firm_package_assignments
  add column if not exists package_code_c text generated always as (record->>'package_code') stored,
  add column if not exists assigned_by_actor_id_c uuid generated always as (nullif(record->>'assigned_by_actor_id', '')::uuid) stored;

create index if not exists idx_awia_firm_package_assignments_code_c on awia_firm_package_assignments(package_code_c);

alter table awia_firm_package_assignments
  add constraint fk_awia_firm_package_assignments_actor
  foreign key (assigned_by_actor_id_c) references actors(id);
