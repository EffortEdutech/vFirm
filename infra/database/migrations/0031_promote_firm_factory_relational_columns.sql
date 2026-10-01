-- HM-S7 Phase 3a (2026-09-25): promote the 7 Firm Factory tables' key fields from opaque
-- `record jsonb` to real, indexed, foreign-keyed columns -- WITHOUT changing any application
-- code. Every column added here is a Postgres GENERATED ALWAYS ... STORED column: it is
-- computed automatically from the existing `record` jsonb on every insert/update, so
-- store.mjs keeps writing exactly what it writes today and these columns just appear,
-- populated, for free. This directly fixes finding B.2 ("no real FKs between related
-- tables... never joined") for this table group, and the actors.firm_id gap from finding B.3,
-- without touching the god-file (that rewrite is Phase 4's job).
--
-- Field names below are taken directly from where these records are constructed
-- (apps/api/src/store.mjs: createFactoryFirmBlueprintRecord, createFactoryProvisioningRunRecord,
-- certifyFactoryPackBindingRecord, runFactoryReadinessTestRecord, acceptFactoryHandoffRecord),
-- not guessed from the old bespoke migration -- confirmed to be the exact keys written into
-- `record` today.
--
-- Safety: every ADD COLUMN is IF NOT EXISTS (safe to re-run). Each FK constraint is added
-- after its target table's generated column exists (ordered below). If any FK fails because
-- production already has a row whose jsonb points at a non-existent parent id, the whole
-- migration fails atomically and nothing is left half-applied -- that would mean real
-- orphaned-reference data exists and needs a decision before this can proceed, which is
-- exactly the kind of thing this migration is designed to surface.

-- 1. factory_firm_blueprints
alter table factory_firm_blueprints
  add column if not exists blueprint_code_c text generated always as (record->>'blueprint_code') stored,
  add column if not exists blueprint_state_c text generated always as (record->>'blueprint_state') stored,
  add column if not exists provisioned_firm_id_c uuid generated always as (nullif(record->>'provisioned_firm_id', '')::uuid) stored;

create index if not exists idx_factory_firm_blueprints_state_c on factory_firm_blueprints(blueprint_state_c);

alter table factory_firm_blueprints
  add constraint fk_factory_firm_blueprints_provisioned_firm
  foreign key (provisioned_firm_id_c) references firms(id);

-- 2. factory_provisioning_runs
alter table factory_provisioning_runs
  add column if not exists firm_blueprint_id_c uuid generated always as (nullif(record->>'firm_blueprint_id', '')::uuid) stored,
  add column if not exists provisioning_state_c text generated always as (record->>'provisioning_state') stored;

create index if not exists idx_factory_provisioning_runs_state_c on factory_provisioning_runs(provisioning_state_c);
create index if not exists idx_factory_provisioning_runs_blueprint_c on factory_provisioning_runs(firm_blueprint_id_c);

alter table factory_provisioning_runs
  add constraint fk_factory_provisioning_runs_blueprint
  foreign key (firm_blueprint_id_c) references factory_firm_blueprints(id);

-- 3. provisioned_firm_instances
alter table provisioned_firm_instances
  add column if not exists firm_blueprint_id_c uuid generated always as (nullif(record->>'firm_blueprint_id', '')::uuid) stored,
  add column if not exists provisioning_run_id_c uuid generated always as (nullif(record->>'provisioning_run_id', '')::uuid) stored,
  add column if not exists instance_status_c text generated always as (record->>'instance_status') stored;

create index if not exists idx_provisioned_firm_instances_run_c on provisioned_firm_instances(provisioning_run_id_c);
create index if not exists idx_provisioned_firm_instances_status_c on provisioned_firm_instances(instance_status_c);

alter table provisioned_firm_instances
  add constraint fk_provisioned_firm_instances_blueprint
  foreign key (firm_blueprint_id_c) references factory_firm_blueprints(id);
alter table provisioned_firm_instances
  add constraint fk_provisioned_firm_instances_run
  foreign key (provisioning_run_id_c) references factory_provisioning_runs(id);

-- 4. factory_worker_bindings
alter table factory_worker_bindings
  add column if not exists provisioning_run_id_c uuid generated always as (nullif(record->>'provisioning_run_id', '')::uuid) stored,
  add column if not exists worker_code_c text generated always as (record->>'worker_code') stored,
  add column if not exists binding_state_c text generated always as (record->>'binding_state') stored;

create index if not exists idx_factory_worker_bindings_run_c on factory_worker_bindings(provisioning_run_id_c);
create index if not exists idx_factory_worker_bindings_state_c on factory_worker_bindings(binding_state_c);

alter table factory_worker_bindings
  add constraint fk_factory_worker_bindings_run
  foreign key (provisioning_run_id_c) references factory_provisioning_runs(id);

-- 5. pack_compatibility_checks
alter table pack_compatibility_checks
  add column if not exists provisioning_run_id_c uuid generated always as (nullif(record->>'provisioning_run_id', '')::uuid) stored,
  add column if not exists firm_blueprint_id_c uuid generated always as (nullif(record->>'firm_blueprint_id', '')::uuid) stored,
  add column if not exists compatibility_status_c text generated always as (record->>'compatibility_status') stored;

create index if not exists idx_pack_compatibility_checks_run_c on pack_compatibility_checks(provisioning_run_id_c);

alter table pack_compatibility_checks
  add constraint fk_pack_compatibility_checks_run
  foreign key (provisioning_run_id_c) references factory_provisioning_runs(id);
alter table pack_compatibility_checks
  add constraint fk_pack_compatibility_checks_blueprint
  foreign key (firm_blueprint_id_c) references factory_firm_blueprints(id);

-- 6. pack_binding_certifications
alter table pack_binding_certifications
  add column if not exists provisioning_run_id_c uuid generated always as (nullif(record->>'provisioning_run_id', '')::uuid) stored,
  add column if not exists pack_compatibility_check_id_c uuid generated always as (nullif(record->>'pack_compatibility_check_id', '')::uuid) stored,
  add column if not exists certification_state_c text generated always as (record->>'certification_state') stored;

create index if not exists idx_pack_binding_certifications_run_c on pack_binding_certifications(provisioning_run_id_c);

alter table pack_binding_certifications
  add constraint fk_pack_binding_certifications_run
  foreign key (provisioning_run_id_c) references factory_provisioning_runs(id);
alter table pack_binding_certifications
  add constraint fk_pack_binding_certifications_check
  foreign key (pack_compatibility_check_id_c) references pack_compatibility_checks(id);

-- 7. service_activation_records
alter table service_activation_records
  add column if not exists provisioning_run_id_c uuid generated always as (nullif(record->>'provisioning_run_id', '')::uuid) stored,
  add column if not exists pack_binding_certification_id_c uuid generated always as (nullif(record->>'pack_binding_certification_id', '')::uuid) stored,
  add column if not exists activation_state_c text generated always as (record->>'activation_state') stored;

create index if not exists idx_service_activation_records_run_c on service_activation_records(provisioning_run_id_c);

alter table service_activation_records
  add constraint fk_service_activation_records_run
  foreign key (provisioning_run_id_c) references factory_provisioning_runs(id);
alter table service_activation_records
  add constraint fk_service_activation_records_certification
  foreign key (pack_binding_certification_id_c) references pack_binding_certifications(id);

-- 8. actors.firm_id FK gap (finding B.3) -- unrelated to the above but the same kind of
-- one-line fix, bundled here rather than making the user apply a second tiny migration.
alter table actors
  add constraint fk_actors_firm
  foreign key (firm_id) references firms(id);
