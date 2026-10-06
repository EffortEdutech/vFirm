-- vFirm database structure audit -- READ-ONLY.
-- This script only SELECTs and counts rows into a session-local TEMP TABLE. It never
-- touches any real table's data or structure (no insert/update/delete/alter/drop on any
-- table other than the temp one this script itself creates and drops at the end).
-- Every table is checked with to_regclass() first, so a table that doesn't exist in your
-- database yet (e.g. one from a migration you haven't applied) is skipped, not an error.
-- Run this against your own DATABASE_URL (e.g. `psql $DATABASE_URL -f this_file.sql`) and
-- paste the output back.

create temporary table audit_table_stats (table_name text, row_count bigint, last_activity text);

do $$
declare
  rc bigint;
  la text;
begin
  if to_regclass('public.actors') is not null then
    execute 'select count(*), max(created_at)::text from actors' into rc, la;
    insert into audit_table_stats values ('actors', rc, la);
  end if;
  if to_regclass('public.administration_skill_bindings') is not null then
    execute 'select count(*), max(created_at)::text from administration_skill_bindings' into rc, la;
    insert into audit_table_stats values ('administration_skill_bindings', rc, la);
  end if;
  if to_regclass('public.administrative_deadlines') is not null then
    execute 'select count(*), max(updated_at)::text from administrative_deadlines' into rc, la;
    insert into audit_table_stats values ('administrative_deadlines', rc, la);
  end if;
  if to_regclass('public.app_state') is not null then
    execute 'select count(*), max(updated_at)::text from app_state' into rc, la;
    insert into audit_table_stats values ('app_state', rc, la);
  end if;
  if to_regclass('public.approvals') is not null then
    execute 'select count(*), max(created_at)::text from approvals' into rc, la;
    insert into audit_table_stats values ('approvals', rc, la);
  end if;
  if to_regclass('public.audit_events') is not null then
    execute 'select count(*), null from audit_events' into rc, la;
    insert into audit_table_stats values ('audit_events', rc, la);
  end if;
  if to_regclass('public.awia_client_delivery_drafts') is not null then
    execute 'select count(*), max(updated_at)::text from awia_client_delivery_drafts' into rc, la;
    insert into audit_table_stats values ('awia_client_delivery_drafts', rc, la);
  end if;
  if to_regclass('public.awia_firm_package_assignments') is not null then
    execute 'select count(*), max(updated_at)::text from awia_firm_package_assignments' into rc, la;
    insert into audit_table_stats values ('awia_firm_package_assignments', rc, la);
  end if;
  if to_regclass('public.awia_staff_authority_decisions') is not null then
    execute 'select count(*), max(updated_at)::text from awia_staff_authority_decisions' into rc, la;
    insert into audit_table_stats values ('awia_staff_authority_decisions', rc, la);
  end if;
  if to_regclass('public.awia_staff_conversation_messages') is not null then
    execute 'select count(*), max(updated_at)::text from awia_staff_conversation_messages' into rc, la;
    insert into audit_table_stats values ('awia_staff_conversation_messages', rc, la);
  end if;
  if to_regclass('public.awia_staff_conversation_threads') is not null then
    execute 'select count(*), max(updated_at)::text from awia_staff_conversation_threads' into rc, la;
    insert into audit_table_stats values ('awia_staff_conversation_threads', rc, la);
  end if;
  if to_regclass('public.awia_staff_evidence_packs') is not null then
    execute 'select count(*), max(updated_at)::text from awia_staff_evidence_packs' into rc, la;
    insert into audit_table_stats values ('awia_staff_evidence_packs', rc, la);
  end if;
  if to_regclass('public.awia_staff_lifecycle_events') is not null then
    execute 'select count(*), max(updated_at)::text from awia_staff_lifecycle_events' into rc, la;
    insert into audit_table_stats values ('awia_staff_lifecycle_events', rc, la);
  end if;
  if to_regclass('public.awia_staff_memory_entries') is not null then
    execute 'select count(*), max(updated_at)::text from awia_staff_memory_entries' into rc, la;
    insert into audit_table_stats values ('awia_staff_memory_entries', rc, la);
  end if;
  if to_regclass('public.awia_staff_output_drafts') is not null then
    execute 'select count(*), max(updated_at)::text from awia_staff_output_drafts' into rc, la;
    insert into audit_table_stats values ('awia_staff_output_drafts', rc, la);
  end if;
  if to_regclass('public.awia_staff_output_reviews') is not null then
    execute 'select count(*), max(updated_at)::text from awia_staff_output_reviews' into rc, la;
    insert into audit_table_stats values ('awia_staff_output_reviews', rc, la);
  end if;
  if to_regclass('public.awia_staff_package_bindings') is not null then
    execute 'select count(*), max(updated_at)::text from awia_staff_package_bindings' into rc, la;
    insert into audit_table_stats values ('awia_staff_package_bindings', rc, la);
  end if;
  if to_regclass('public.awia_staff_role_assignments') is not null then
    execute 'select count(*), max(updated_at)::text from awia_staff_role_assignments' into rc, la;
    insert into audit_table_stats values ('awia_staff_role_assignments', rc, la);
  end if;
  if to_regclass('public.awia_staff_seat_billing_events') is not null then
    execute 'select count(*), max(updated_at)::text from awia_staff_seat_billing_events' into rc, la;
    insert into audit_table_stats values ('awia_staff_seat_billing_events', rc, la);
  end if;
  if to_regclass('public.awia_staff_task_readiness_records') is not null then
    execute 'select count(*), max(updated_at)::text from awia_staff_task_readiness_records' into rc, la;
    insert into audit_table_stats values ('awia_staff_task_readiness_records', rc, la);
  end if;
  if to_regclass('public.awia_staff_workdesk_items') is not null then
    execute 'select count(*), max(updated_at)::text from awia_staff_workdesk_items' into rc, la;
    insert into audit_table_stats values ('awia_staff_workdesk_items', rc, la);
  end if;
  if to_regclass('public.awia_virtual_staff_members') is not null then
    execute 'select count(*), max(updated_at)::text from awia_virtual_staff_members' into rc, la;
    insert into audit_table_stats values ('awia_virtual_staff_members', rc, la);
  end if;
  if to_regclass('public.awia_virtual_staff_provisioning_runs') is not null then
    execute 'select count(*), max(updated_at)::text from awia_virtual_staff_provisioning_runs' into rc, la;
    insert into audit_table_stats values ('awia_virtual_staff_provisioning_runs', rc, la);
  end if;
  if to_regclass('public.awia_virtual_staff_seats') is not null then
    execute 'select count(*), max(updated_at)::text from awia_virtual_staff_seats' into rc, la;
    insert into audit_table_stats values ('awia_virtual_staff_seats', rc, la);
  end if;
  if to_regclass('public.billing_readiness_reviews') is not null then
    execute 'select count(*), max(created_at)::text from billing_readiness_reviews' into rc, la;
    insert into audit_table_stats values ('billing_readiness_reviews', rc, la);
  end if;
  if to_regclass('public.boq_extraction_aids') is not null then
    execute 'select count(*), max(updated_at)::text from boq_extraction_aids' into rc, la;
    insert into audit_table_stats values ('boq_extraction_aids', rc, la);
  end if;
  if to_regclass('public.calculation_input_sets') is not null then
    execute 'select count(*), max(updated_at)::text from calculation_input_sets' into rc, la;
    insert into audit_table_stats values ('calculation_input_sets', rc, la);
  end if;
  if to_regclass('public.capacity_offers') is not null then
    execute 'select count(*), max(updated_at)::text from capacity_offers' into rc, la;
    insert into audit_table_stats values ('capacity_offers', rc, la);
  end if;
  if to_regclass('public.client_communication_drafts') is not null then
    execute 'select count(*), max(updated_at)::text from client_communication_drafts' into rc, la;
    insert into audit_table_stats values ('client_communication_drafts', rc, la);
  end if;
  if to_regclass('public.clients') is not null then
    execute 'select count(*), max(updated_at)::text from clients' into rc, la;
    insert into audit_table_stats values ('clients', rc, la);
  end if;
  if to_regclass('public.collaboration_requests') is not null then
    execute 'select count(*), max(updated_at)::text from collaboration_requests' into rc, la;
    insert into audit_table_stats values ('collaboration_requests', rc, la);
  end if;
  if to_regclass('public.collaboration_workspace_evidence') is not null then
    execute 'select count(*), null from collaboration_workspace_evidence' into rc, la;
    insert into audit_table_stats values ('collaboration_workspace_evidence', rc, la);
  end if;
  if to_regclass('public.collaboration_workspace_participants') is not null then
    execute 'select count(*), null from collaboration_workspace_participants' into rc, la;
    insert into audit_table_stats values ('collaboration_workspace_participants', rc, la);
  end if;
  if to_regclass('public.collaboration_workspaces') is not null then
    execute 'select count(*), max(updated_at)::text from collaboration_workspaces' into rc, la;
    insert into audit_table_stats values ('collaboration_workspaces', rc, la);
  end if;
  if to_regclass('public.commercial_launch_controls') is not null then
    execute 'select count(*), max(created_at)::text from commercial_launch_controls' into rc, la;
    insert into audit_table_stats values ('commercial_launch_controls', rc, la);
  end if;
  if to_regclass('public.commercial_skill_bindings') is not null then
    execute 'select count(*), max(created_at)::text from commercial_skill_bindings' into rc, la;
    insert into audit_table_stats values ('commercial_skill_bindings', rc, la);
  end if;
  if to_regclass('public.correspondence_records') is not null then
    execute 'select count(*), max(updated_at)::text from correspondence_records' into rc, la;
    insert into audit_table_stats values ('correspondence_records', rc, la);
  end if;
  if to_regclass('public.delivery_package_records') is not null then
    execute 'select count(*), max(updated_at)::text from delivery_package_records' into rc, la;
    insert into audit_table_stats values ('delivery_package_records', rc, la);
  end if;
  if to_regclass('public.directory_private_enquiries') is not null then
    execute 'select count(*), max(updated_at)::text from directory_private_enquiries' into rc, la;
    insert into audit_table_stats values ('directory_private_enquiries', rc, la);
  end if;
  if to_regclass('public.directory_review_board_decisions') is not null then
    execute 'select count(*), max(created_at)::text from directory_review_board_decisions' into rc, la;
    insert into audit_table_stats values ('directory_review_board_decisions', rc, la);
  end if;
  if to_regclass('public.document_register_entries') is not null then
    execute 'select count(*), max(updated_at)::text from document_register_entries' into rc, la;
    insert into audit_table_stats values ('document_register_entries', rc, la);
  end if;
  if to_regclass('public.document_revision_records') is not null then
    execute 'select count(*), max(created_at)::text from document_revision_records' into rc, la;
    insert into audit_table_stats values ('document_revision_records', rc, la);
  end if;
  if to_regclass('public.document_versions') is not null then
    execute 'select count(*), max(created_at)::text from document_versions' into rc, la;
    insert into audit_table_stats values ('document_versions', rc, la);
  end if;
  if to_regclass('public.documents') is not null then
    execute 'select count(*), max(created_at)::text from documents' into rc, la;
    insert into audit_table_stats values ('documents', rc, la);
  end if;
  if to_regclass('public.drawing_review_records') is not null then
    execute 'select count(*), max(created_at)::text from drawing_review_records' into rc, la;
    insert into audit_table_stats values ('drawing_review_records', rc, la);
  end if;
  if to_regclass('public.engagements') is not null then
    execute 'select count(*), max(updated_at)::text from engagements' into rc, la;
    insert into audit_table_stats values ('engagements', rc, la);
  end if;
  if to_regclass('public.event_log') is not null then
    execute 'select count(*), null from event_log' into rc, la;
    insert into audit_table_stats values ('event_log', rc, la);
  end if;
  if to_regclass('public.evidence_bundles') is not null then
    execute 'select count(*), max(created_at)::text from evidence_bundles' into rc, la;
    insert into audit_table_stats values ('evidence_bundles', rc, la);
  end if;
  if to_regclass('public.expense_records') is not null then
    execute 'select count(*), max(updated_at)::text from expense_records' into rc, la;
    insert into audit_table_stats values ('expense_records', rc, la);
  end if;
  if to_regclass('public.factory_firm_blueprints') is not null then
    execute 'select count(*), max(updated_at)::text from factory_firm_blueprints' into rc, la;
    insert into audit_table_stats values ('factory_firm_blueprints', rc, la);
  end if;
  if to_regclass('public.factory_provisioning_runs') is not null then
    execute 'select count(*), max(updated_at)::text from factory_provisioning_runs' into rc, la;
    insert into audit_table_stats values ('factory_provisioning_runs', rc, la);
  end if;
  if to_regclass('public.factory_worker_bindings') is not null then
    execute 'select count(*), max(updated_at)::text from factory_worker_bindings' into rc, la;
    insert into audit_table_stats values ('factory_worker_bindings', rc, la);
  end if;
  if to_regclass('public.firm_client_relationships') is not null then
    execute 'select count(*), max(updated_at)::text from firm_client_relationships' into rc, la;
    insert into audit_table_stats values ('firm_client_relationships', rc, la);
  end if;
  if to_regclass('public.firm_memberships') is not null then
    execute 'select count(*), max(updated_at)::text from firm_memberships' into rc, la;
    insert into audit_table_stats values ('firm_memberships', rc, la);
  end if;
  if to_regclass('public.firms') is not null then
    execute 'select count(*), max(updated_at)::text from firms' into rc, la;
    insert into audit_table_stats values ('firms', rc, la);
  end if;
  if to_regclass('public.front_desk_enquiries') is not null then
    execute 'select count(*), max(updated_at)::text from front_desk_enquiries' into rc, la;
    insert into audit_table_stats values ('front_desk_enquiries', rc, la);
  end if;
  if to_regclass('public.intake_sessions') is not null then
    execute 'select count(*), max(updated_at)::text from intake_sessions' into rc, la;
    insert into audit_table_stats values ('intake_sessions', rc, la);
  end if;
  if to_regclass('public.invoices') is not null then
    execute 'select count(*), max(updated_at)::text from invoices' into rc, la;
    insert into audit_table_stats values ('invoices', rc, la);
  end if;
  if to_regclass('public.leads') is not null then
    execute 'select count(*), max(created_at)::text from leads' into rc, la;
    insert into audit_table_stats values ('leads', rc, la);
  end if;
  if to_regclass('public.marketplace_listings') is not null then
    execute 'select count(*), max(updated_at)::text from marketplace_listings' into rc, la;
    insert into audit_table_stats values ('marketplace_listings', rc, la);
  end if;
  if to_regclass('public.network_capabilities') is not null then
    execute 'select count(*), max(updated_at)::text from network_capabilities' into rc, la;
    insert into audit_table_stats values ('network_capabilities', rc, la);
  end if;
  if to_regclass('public.network_conflict_checks') is not null then
    execute 'select count(*), max(created_at)::text from network_conflict_checks' into rc, la;
    insert into audit_table_stats values ('network_conflict_checks', rc, la);
  end if;
  if to_regclass('public.network_credentials') is not null then
    execute 'select count(*), max(updated_at)::text from network_credentials' into rc, la;
    insert into audit_table_stats values ('network_credentials', rc, la);
  end if;
  if to_regclass('public.network_firm_profiles') is not null then
    execute 'select count(*), max(updated_at)::text from network_firm_profiles' into rc, la;
    insert into audit_table_stats values ('network_firm_profiles', rc, la);
  end if;
  if to_regclass('public.network_professional_profiles') is not null then
    execute 'select count(*), max(updated_at)::text from network_professional_profiles' into rc, la;
    insert into audit_table_stats values ('network_professional_profiles', rc, la);
  end if;
  if to_regclass('public.network_qualification_gates') is not null then
    execute 'select count(*), max(updated_at)::text from network_qualification_gates' into rc, la;
    insert into audit_table_stats values ('network_qualification_gates', rc, la);
  end if;
  if to_regclass('public.network_trust_signals') is not null then
    execute 'select count(*), max(updated_at)::text from network_trust_signals' into rc, la;
    insert into audit_table_stats values ('network_trust_signals', rc, la);
  end if;
  if to_regclass('public.observatory_snapshots') is not null then
    execute 'select count(*), null from observatory_snapshots' into rc, la;
    insert into audit_table_stats values ('observatory_snapshots', rc, la);
  end if;
  if to_regclass('public.pack_binding_certifications') is not null then
    execute 'select count(*), max(updated_at)::text from pack_binding_certifications' into rc, la;
    insert into audit_table_stats values ('pack_binding_certifications', rc, la);
  end if;
  if to_regclass('public.pack_compatibility_checks') is not null then
    execute 'select count(*), max(updated_at)::text from pack_compatibility_checks' into rc, la;
    insert into audit_table_stats values ('pack_compatibility_checks', rc, la);
  end if;
  if to_regclass('public.payment_provider_configs') is not null then
    execute 'select count(*), max(updated_at)::text from payment_provider_configs' into rc, la;
    insert into audit_table_stats values ('payment_provider_configs', rc, la);
  end if;
  if to_regclass('public.payment_statuses') is not null then
    execute 'select count(*), max(updated_at)::text from payment_statuses' into rc, la;
    insert into audit_table_stats values ('payment_statuses', rc, la);
  end if;
  if to_regclass('public.persons') is not null then
    execute 'select count(*), max(updated_at)::text from persons' into rc, la;
    insert into audit_table_stats values ('persons', rc, la);
  end if;
  if to_regclass('public.pilot_acceptance_reviews') is not null then
    execute 'select count(*), max(updated_at)::text from pilot_acceptance_reviews' into rc, la;
    insert into audit_table_stats values ('pilot_acceptance_reviews', rc, la);
  end if;
  if to_regclass('public.pilot_expansion_cohorts') is not null then
    execute 'select count(*), max(updated_at)::text from pilot_expansion_cohorts' into rc, la;
    insert into audit_table_stats values ('pilot_expansion_cohorts', rc, la);
  end if;
  if to_regclass('public.pilot_feedback') is not null then
    execute 'select count(*), max(created_at)::text from pilot_feedback' into rc, la;
    insert into audit_table_stats values ('pilot_feedback', rc, la);
  end if;
  if to_regclass('public.pilot_handoff_records') is not null then
    execute 'select count(*), max(created_at)::text from pilot_handoff_records' into rc, la;
    insert into audit_table_stats values ('pilot_handoff_records', rc, la);
  end if;
  if to_regclass('public.pilot_improvement_items') is not null then
    execute 'select count(*), max(updated_at)::text from pilot_improvement_items' into rc, la;
    insert into audit_table_stats values ('pilot_improvement_items', rc, la);
  end if;
  if to_regclass('public.pilot_incidents') is not null then
    execute 'select count(*), max(updated_at)::text from pilot_incidents' into rc, la;
    insert into audit_table_stats values ('pilot_incidents', rc, la);
  end if;
  if to_regclass('public.pilot_report_packs') is not null then
    execute 'select count(*), max(created_at)::text from pilot_report_packs' into rc, la;
    insert into audit_table_stats values ('pilot_report_packs', rc, la);
  end if;
  if to_regclass('public.pilot_users') is not null then
    execute 'select count(*), null from pilot_users' into rc, la;
    insert into audit_table_stats values ('pilot_users', rc, la);
  end if;
  if to_regclass('public.policy_decisions') is not null then
    execute 'select count(*), max(created_at)::text from policy_decisions' into rc, la;
    insert into audit_table_stats values ('policy_decisions', rc, la);
  end if;
  if to_regclass('public.price_build_ups') is not null then
    execute 'select count(*), max(created_at)::text from price_build_ups' into rc, la;
    insert into audit_table_stats values ('price_build_ups', rc, la);
  end if;
  if to_regclass('public.professional_authorities') is not null then
    execute 'select count(*), max(updated_at)::text from professional_authorities' into rc, la;
    insert into audit_table_stats values ('professional_authorities', rc, la);
  end if;
  if to_regclass('public.professional_profiles') is not null then
    execute 'select count(*), max(updated_at)::text from professional_profiles' into rc, la;
    insert into audit_table_stats values ('professional_profiles', rc, la);
  end if;
  if to_regclass('public.projects') is not null then
    execute 'select count(*), max(updated_at)::text from projects' into rc, la;
    insert into audit_table_stats values ('projects', rc, la);
  end if;
  if to_regclass('public.proposal_dispatch_records') is not null then
    execute 'select count(*), max(created_at)::text from proposal_dispatch_records' into rc, la;
    insert into audit_table_stats values ('proposal_dispatch_records', rc, la);
  end if;
  if to_regclass('public.proposals') is not null then
    execute 'select count(*), max(updated_at)::text from proposals' into rc, la;
    insert into audit_table_stats values ('proposals', rc, la);
  end if;
  if to_regclass('public.provisioned_firm_instances') is not null then
    execute 'select count(*), max(updated_at)::text from provisioned_firm_instances' into rc, la;
    insert into audit_table_stats values ('provisioned_firm_instances', rc, la);
  end if;
  if to_regclass('public.qualification_renewal_reviews') is not null then
    execute 'select count(*), max(created_at)::text from qualification_renewal_reviews' into rc, la;
    insert into audit_table_stats values ('qualification_renewal_reviews', rc, la);
  end if;
  if to_regclass('public.quotation_cases') is not null then
    execute 'select count(*), max(updated_at)::text from quotation_cases' into rc, la;
    insert into audit_table_stats values ('quotation_cases', rc, la);
  end if;
  if to_regclass('public.quotation_draft_packs') is not null then
    execute 'select count(*), max(updated_at)::text from quotation_draft_packs' into rc, la;
    insert into audit_table_stats values ('quotation_draft_packs', rc, la);
  end if;
  if to_regclass('public.quotation_issue_records') is not null then
    execute 'select count(*), max(updated_at)::text from quotation_issue_records' into rc, la;
    insert into audit_table_stats values ('quotation_issue_records', rc, la);
  end if;
  if to_regclass('public.quotation_receivable_preparations') is not null then
    execute 'select count(*), max(updated_at)::text from quotation_receivable_preparations' into rc, la;
    insert into audit_table_stats values ('quotation_receivable_preparations', rc, la);
  end if;
  if to_regclass('public.receivable_follow_ups') is not null then
    execute 'select count(*), max(updated_at)::text from receivable_follow_ups' into rc, la;
    insert into audit_table_stats values ('receivable_follow_ups', rc, la);
  end if;
  if to_regclass('public.release_candidate_gates') is not null then
    execute 'select count(*), max(created_at)::text from release_candidate_gates' into rc, la;
    insert into audit_table_stats values ('release_candidate_gates', rc, la);
  end if;
  if to_regclass('public.responsibility_matrices') is not null then
    execute 'select count(*), max(updated_at)::text from responsibility_matrices' into rc, la;
    insert into audit_table_stats values ('responsibility_matrices', rc, la);
  end if;
  if to_regclass('public.sales_pipeline_records') is not null then
    execute 'select count(*), max(updated_at)::text from sales_pipeline_records' into rc, la;
    insert into audit_table_stats values ('sales_pipeline_records', rc, la);
  end if;
  if to_regclass('public.schema_migrations') is not null then
    execute 'select count(*), null from schema_migrations' into rc, la;
    insert into audit_table_stats values ('schema_migrations', rc, la);
  end if;
  if to_regclass('public.service_activation_records') is not null then
    execute 'select count(*), max(updated_at)::text from service_activation_records' into rc, la;
    insert into audit_table_stats values ('service_activation_records', rc, la);
  end if;
  if to_regclass('public.service_packs') is not null then
    execute 'select count(*), max(updated_at)::text from service_packs' into rc, la;
    insert into audit_table_stats values ('service_packs', rc, la);
  end if;
  if to_regclass('public.service_skus') is not null then
    execute 'select count(*), max(updated_at)::text from service_skus' into rc, la;
    insert into audit_table_stats values ('service_skus', rc, la);
  end if;
  if to_regclass('public.specialist_assignments') is not null then
    execute 'select count(*), max(updated_at)::text from specialist_assignments' into rc, la;
    insert into audit_table_stats values ('specialist_assignments', rc, la);
  end if;
  if to_regclass('public.specialist_invitations') is not null then
    execute 'select count(*), max(updated_at)::text from specialist_invitations' into rc, la;
    insert into audit_table_stats values ('specialist_invitations', rc, la);
  end if;
  if to_regclass('public.stakeholder_review_boards') is not null then
    execute 'select count(*), max(updated_at)::text from stakeholder_review_boards' into rc, la;
    insert into audit_table_stats values ('stakeholder_review_boards', rc, la);
  end if;
  if to_regclass('public.stakeholder_review_decisions') is not null then
    execute 'select count(*), null from stakeholder_review_decisions' into rc, la;
    insert into audit_table_stats values ('stakeholder_review_decisions', rc, la);
  end if;
  if to_regclass('public.subscription_packages') is not null then
    execute 'select count(*), max(updated_at)::text from subscription_packages' into rc, la;
    insert into audit_table_stats values ('subscription_packages', rc, la);
  end if;
  if to_regclass('public.support_cases') is not null then
    execute 'select count(*), max(updated_at)::text from support_cases' into rc, la;
    insert into audit_table_stats values ('support_cases', rc, la);
  end if;
  if to_regclass('public.task_outputs') is not null then
    execute 'select count(*), max(created_at)::text from task_outputs' into rc, la;
    insert into audit_table_stats values ('task_outputs', rc, la);
  end if;
  if to_regclass('public.tasks') is not null then
    execute 'select count(*), max(updated_at)::text from tasks' into rc, la;
    insert into audit_table_stats values ('tasks', rc, la);
  end if;
  if to_regclass('public.technical_qa_findings') is not null then
    execute 'select count(*), max(updated_at)::text from technical_qa_findings' into rc, la;
    insert into audit_table_stats values ('technical_qa_findings', rc, la);
  end if;
  if to_regclass('public.technical_skill_bindings') is not null then
    execute 'select count(*), max(created_at)::text from technical_skill_bindings' into rc, la;
    insert into audit_table_stats values ('technical_skill_bindings', rc, la);
  end if;
  if to_regclass('public.tenant_onboarding_plans') is not null then
    execute 'select count(*), max(updated_at)::text from tenant_onboarding_plans' into rc, la;
    insert into audit_table_stats values ('tenant_onboarding_plans', rc, la);
  end if;
  if to_regclass('public.tenant_pilot_controls') is not null then
    execute 'select count(*), max(updated_at)::text from tenant_pilot_controls' into rc, la;
    insert into audit_table_stats values ('tenant_pilot_controls', rc, la);
  end if;
  if to_regclass('public.tenant_usage_events') is not null then
    execute 'select count(*), null from tenant_usage_events' into rc, la;
    insert into audit_table_stats values ('tenant_usage_events', rc, la);
  end if;
  if to_regclass('public.tenants') is not null then
    execute 'select count(*), max(created_at)::text from tenants' into rc, la;
    insert into audit_table_stats values ('tenants', rc, la);
  end if;
  if to_regclass('public.tool_invocations') is not null then
    execute 'select count(*), max(created_at)::text from tool_invocations' into rc, la;
    insert into audit_table_stats values ('tool_invocations', rc, la);
  end if;
  if to_regclass('public.transmittal_drafts') is not null then
    execute 'select count(*), max(updated_at)::text from transmittal_drafts' into rc, la;
    insert into audit_table_stats values ('transmittal_drafts', rc, la);
  end if;
  if to_regclass('public.work_packages') is not null then
    execute 'select count(*), max(updated_at)::text from work_packages' into rc, la;
    insert into audit_table_stats values ('work_packages', rc, la);
  end if;
  if to_regclass('public.worker_instances') is not null then
    execute 'select count(*), max(updated_at)::text from worker_instances' into rc, la;
    insert into audit_table_stats values ('worker_instances', rc, la);
  end if;
  if to_regclass('public.worker_templates') is not null then
    execute 'select count(*), max(updated_at)::text from worker_templates' into rc, la;
    insert into audit_table_stats values ('worker_templates', rc, la);
  end if;
end $$;

select * from audit_table_stats order by row_count asc, table_name;

-- Which migrations has this database actually recorded as applied (by filename)?
select filename, applied_at from schema_migrations order by filename;

-- Do any of the 7 firm-factory _legacy_v1 tables exist here (created by this session's
-- 0024_zzz fix, only if your database still had the old bespoke shape), and if so, how many rows?
create temporary table audit_legacy_stats (table_name text, row_count bigint);
do $$
declare
  rc bigint;
begin
  if to_regclass('public.factory_firm_blueprints_legacy_v1') is not null then
    execute 'select count(*) from factory_firm_blueprints_legacy_v1' into rc;
    insert into audit_legacy_stats values ('factory_firm_blueprints_legacy_v1', rc);
  end if;
  if to_regclass('public.factory_provisioning_runs_legacy_v1') is not null then
    execute 'select count(*) from factory_provisioning_runs_legacy_v1' into rc;
    insert into audit_legacy_stats values ('factory_provisioning_runs_legacy_v1', rc);
  end if;
  if to_regclass('public.factory_worker_bindings_legacy_v1') is not null then
    execute 'select count(*) from factory_worker_bindings_legacy_v1' into rc;
    insert into audit_legacy_stats values ('factory_worker_bindings_legacy_v1', rc);
  end if;
  if to_regclass('public.provisioned_firm_instances_legacy_v1') is not null then
    execute 'select count(*) from provisioned_firm_instances_legacy_v1' into rc;
    insert into audit_legacy_stats values ('provisioned_firm_instances_legacy_v1', rc);
  end if;
  if to_regclass('public.service_activation_records_legacy_v1') is not null then
    execute 'select count(*) from service_activation_records_legacy_v1' into rc;
    insert into audit_legacy_stats values ('service_activation_records_legacy_v1', rc);
  end if;
  if to_regclass('public.pack_compatibility_checks_legacy_v1') is not null then
    execute 'select count(*) from pack_compatibility_checks_legacy_v1' into rc;
    insert into audit_legacy_stats values ('pack_compatibility_checks_legacy_v1', rc);
  end if;
  if to_regclass('public.pack_binding_certifications_legacy_v1') is not null then
    execute 'select count(*) from pack_binding_certifications_legacy_v1' into rc;
    insert into audit_legacy_stats values ('pack_binding_certifications_legacy_v1', rc);
  end if;
end $$;
select * from audit_legacy_stats order by table_name;

drop table audit_table_stats;
drop table audit_legacy_stats;