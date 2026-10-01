-- ADR-091 follow-up (2026-10-01) -- READ-ONLY. Identifies the firms involved in the 21 overwritten
-- rows found by 2026-10-01_awia_cross_firm_overwrite_check.sql, so the repair can be written for the
-- real situation. Changes nothing. Please send back all three result sets.

-- 1) Who are the three firms?
select f.id as firm_id, f.name as firm_name, t.name as tenant_name, f.tenant_id, f.created_at
from firms f join tenants t on t.id = f.tenant_id
where f.id in ('add98e4c-67f1-47d9-9561-26501f9fd801', '0e068cf2-cc60-4e06-b1ff-5d5f447efec4', '58e54f95-47ec-4792-9456-aa1cecc36881')
order by f.created_at;

-- 2) Their hired workers (member rows were not affected), with status
select firm_id, record->>'agent_code' as staff_code, record->>'display_name' as display_name,
       record->>'position_id' as position_id, record->>'lifecycle_status' as lifecycle_status,
       record->>'staff_seat_id' as seat_ref, created_at, updated_at
from awia_virtual_staff_members
where firm_id in ('add98e4c-67f1-47d9-9561-26501f9fd801', '0e068cf2-cc60-4e06-b1ff-5d5f447efec4', '58e54f95-47ec-4792-9456-aa1cecc36881')
order by firm_id, staff_code;

-- 3) Does the "other" firm (0e068cf2) own ANY rows of its own, and any real work?
--    Tells us whether it is a live firm or a leftover test firm.
select 'seats' as what, count(*) from awia_virtual_staff_seats where firm_id = '0e068cf2-cc60-4e06-b1ff-5d5f447efec4'
union all select 'role_assignments', count(*) from awia_staff_role_assignments where firm_id = '0e068cf2-cc60-4e06-b1ff-5d5f447efec4'
union all select 'package_bindings', count(*) from awia_staff_package_bindings where firm_id = '0e068cf2-cc60-4e06-b1ff-5d5f447efec4'
union all select 'evidence_packs', count(*) from awia_staff_evidence_packs where firm_id = '0e068cf2-cc60-4e06-b1ff-5d5f447efec4'
union all select 'workdesk_items', count(*) from awia_staff_workdesk_items where firm_id = '0e068cf2-cc60-4e06-b1ff-5d5f447efec4'
union all select 'work_requests', count(*) from work_requests where firm_id = '0e068cf2-cc60-4e06-b1ff-5d5f447efec4'
union all select 'clients', count(*) from clients where firm_id = '0e068cf2-cc60-4e06-b1ff-5d5f447efec4';
