-- ADR-091 (2026-10-01) -- READ-ONLY diagnostic. Run in the Supabase SQL editor and send back the result.
--
-- Before the hiring-bug fix, AWIA provisioning records whose ids were not firm-scoped
-- (seat-<code>, role-assignment-<code>, package-binding-<code>, staff-lifecycle-<code>-<state>, and
-- the constant evidence-pack id) shared one primary key across firms, and "on conflict (id) do
-- update set record = ..." could overwrite one firm's row with ANOTHER firm's record. Since
-- migration 0032 added fk_awia_virtual_staff_members_seat, colliding hires fail instead (the
-- reported bug), but rows written before that -- and evidence packs, which have no such FK -- may
-- already carry another firm's record.
--
-- This query changes nothing. Each row it returns is a stored row whose tenant/firm columns say
-- one firm while its record says another. Zero rows = nothing to repair.

select 'awia_virtual_staff_seats' as table_name, id, natural_key, firm_id as row_firm_id, record->>'firm_id' as record_firm_id, updated_at from awia_virtual_staff_seats where coalesce(record->>'firm_id', '') <> firm_id::text
union all
select 'awia_virtual_staff_members', id, natural_key, firm_id, record->>'firm_id', updated_at from awia_virtual_staff_members where coalesce(record->>'firm_id', '') <> firm_id::text
union all
select 'awia_staff_role_assignments', id, natural_key, firm_id, record->>'firm_id', updated_at from awia_staff_role_assignments where coalesce(record->>'firm_id', '') <> firm_id::text
union all
select 'awia_staff_package_bindings', id, natural_key, firm_id, record->>'firm_id', updated_at from awia_staff_package_bindings where coalesce(record->>'firm_id', '') <> firm_id::text
union all
select 'awia_staff_lifecycle_events', id, natural_key, firm_id, record->>'firm_id', updated_at from awia_staff_lifecycle_events where coalesce(record->>'firm_id', '') <> firm_id::text
union all
select 'awia_staff_evidence_packs', id, natural_key, firm_id, record->>'firm_id', updated_at from awia_staff_evidence_packs where coalesce(record->>'firm_id', '') <> firm_id::text
union all
select 'awia_virtual_staff_provisioning_runs', id, natural_key, firm_id, record->>'firm_id', updated_at from awia_virtual_staff_provisioning_runs where coalesce(record->>'firm_id', '') <> firm_id::text
order by table_name, natural_key;
