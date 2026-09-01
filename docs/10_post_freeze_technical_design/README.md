---
id: VF-POST-FREEZE-TECHNICAL-DESIGN-INDEX
title: "Post-Freeze Technical Design Index"
version: "1.0"
status: "Post-Freeze Technical Design"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Post-Freeze Technical Design Index v1.0

## Purpose

This folder contains build-facing technical design and implementation control documents created after Architecture Baseline v1.0 was frozen.

These documents may evolve during implementation. They must not rewrite Architecture Baseline v1.0 unless the user explicitly opens a baseline change request.

## Read order
3. `VFIRM_SOLOPRENEUR_SUPPORTING_TECHNICAL_DESIGN_v1.0.md`
4. `VFIRM_SOLOPRENEUR_IMPLEMENTATION_CHECKLIST_v1.0.md`

5. `SF_S2_FRONT_DESK_HARDENING_COMPLETION_v1.0.md`
6. `SF_S3_ADMINISTRATION_DOCUMENT_CONTROL_TECHNICAL_DESIGN_v1.0.md`
7. `SF_S3_ADMINISTRATION_DOCUMENT_CONTROL_COMPLETION_v1.0.md`
8. `SF_S4_SALES_PROPOSALS_ACCOUNTS_TECHNICAL_DESIGN_v1.0.md`
9. `SF_S4_SALES_PROPOSALS_ACCOUNTS_COMPLETION_v1.0.md`
1. `VFIRM_RELEASE_1_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md`
2. `R1_S1_PRODUCT_TARGET_BACKLOG_LOCK_AUDIT_v1.0.md`
2. `VFIRM_SOLOPRENEUR_FIRM_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md`
3. `R1_S2_EXISTING_WORKFLOW_STABILIZATION_COMPLETION_v1.0.md`
4. `R1_S3_TENANT_AUTH_POLICY_DATA_HARDENING_COMPLETION_v1.0.md`
5. `R1_S4_PILOT_OPERATIONS_DRESS_REHEARSAL_RUNBOOK_v1.0.md`
6. `R1_S4_OPERATOR_DEMO_SCRIPT_v1.0.md`
7. `R1_RELEASE_CANDIDATE_EVIDENCE_PACK_TEMPLATE_v1.0.md`
8. `R1_S4_PILOT_OPERATIONS_DRESS_REHEARSAL_COMPLETION_v1.0.md`
9. `R1_RELEASE_CANDIDATE_EVIDENCE_PACK_COMPLETED_v1.0.md`
10. `R1_S5_RELEASE_CANDIDATE_ACCEPTANCE_REVIEW_v1.0.md`
11. `STAGE_2_IMPLEMENTATION_STRATEGY_v1.0.md`
3. `IMPLEMENTATION_STAGE_ROADMAP_v1.0.md`
4. `STAGE_2_SPRINT_PLAN_v1.0.md`
4. `STAGE_2_EXIT_REVIEW_v1.0.md`
5. `STAGE_3_PRODUCTIZED_WORKSPACE_PLAN_v1.0.md`
6. `STAGE_3_EXIT_REVIEW_v1.0.md`
7. `STAGE_4_TRUST_IDENTITY_GOVERNANCE_PLAN_v1.0.md`
8. `STAGE_4_SPRINT_4_1_DEV_AUTH_MEMBERSHIP_NOTE_v0.1.md`
9. `IMPLEMENTATION_CHECKLIST_v1.0.md`
10. `TECHNICAL_DEBT_REGISTER_v1.0.md`
11. `TECHNICAL_DESIGN_MVP_v1.0.md`
12. `DATABASE_SCHEMA_PLAN_v1.0.md`
13. `API_CONTRACT_PLAN_v1.0.md`
14. `EVENT_PAYLOAD_SCHEMA_PLAN_v1.0.md`
15. `POLICY_TEST_PLAN_v1.0.md`
16. `FORMWORK_SERVICE_PACK_SPEC_v1.0.md`
17. `STACK_AND_DATABASE_DECISION_v1.0.md`

| `VFIRM_SOLOPRENEUR_SUPPORTING_TECHNICAL_DESIGN_v1.0.md` | Defines module, worker/skill binding, runtime, authority, and SF-S2 Front Desk contracts. |
| `VFIRM_SOLOPRENEUR_IMPLEMENTATION_CHECKLIST_v1.0.md` | Active delivery checklist for SF-S1 through SF-S6 and cross-cutting compiler/runtime controls. |
## Document map
| `SF_S2_FRONT_DESK_HARDENING_COMPLETION_v1.0.md` | Records SF-S2 PostgreSQL hardening and acceptance evidence. |
| `SF_S3_ADMINISTRATION_DOCUMENT_CONTROL_TECHNICAL_DESIGN_v1.0.md` | Defines SF-S3 records, states, skill binding, deterministic controls, and authority boundary. |
| `SF_S3_ADMINISTRATION_DOCUMENT_CONTROL_COMPLETION_v1.0.md` | Records SF-S3 delivery and JSON/PostgreSQL validation evidence. |

| `SF_S4_SALES_PROPOSALS_ACCOUNTS_TECHNICAL_DESIGN_v1.0.md` | Defines SF-S4 pipeline, dispatch, expense, receivable, cash, skill binding, and authority controls. |
| `SF_S4_SALES_PROPOSALS_ACCOUNTS_COMPLETION_v1.0.md` | Records SF-S4 delivery and JSON/PostgreSQL validation evidence. |
| `SF_S5_TECHNICAL_DRAWING_DELIVERY_SUPPORT_TECHNICAL_DESIGN_v1.0.md` | Defines SF-S5 skill bindings, drawing checks, Formwork input validation, QA findings, readiness gates, and authority boundaries. |
| `SF_S5_TECHNICAL_DRAWING_DELIVERY_SUPPORT_COMPLETION_v1.0.md` | Records SF-S5 delivery and JSON/PostgreSQL validation evidence. |
| `SF_S6_DAILY_OPERATIONS_AND_PILOT_HANDOFF_TECHNICAL_DESIGN_v1.0.md` | Defines SF-S6 daily operations summary, exception/readiness logic, handoff acceptance, and authority boundaries. |
| `SF_S6_PILOT_OPERATOR_HANDBOOK_v1.0.md` | Operator handbook for controlled local pilot routine and handoff. |
| `SF_S6_DAILY_OPERATIONS_AND_PILOT_HANDOFF_COMPLETION_v1.0.md` | Records SF-S6 delivery and JSON/PostgreSQL validation evidence. |
| `SF_S6_SOLOPRENEUR_ACCEPTANCE_REHEARSAL_RESULT_v1.0.md` | Records the 10-point solopreneur acceptance rehearsal result. |
| `VFIRM_RELEASE_3_TO_MARKETPLACE_ROADMAP_v1.0.md` | Defines the post-Release-2 roadmap for Release 3 Virtual Firm Factory, Release 4 controlled staging/private pilot, Release 5 trusted specialist network, and later marketplace/ecosystem intelligence. |
| `VFIRM_RELEASE_3_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md` | Defines the executable Release 3 product target, sprint plan, checklist, acceptance criteria, and handoff gate for Virtual Firm Factory implementation. |
| `VFIRM_RELEASE_2_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md` | Defines the bounded Release 2 compiler, governance, authority envelope, and Firm Runtime binding sprint plan. |
| `VFIRM_RELEASE_2_COMPLETION_AND_HANDOFF_TO_R3_v1.0.md` | Defines the evidence gate for closing Release 2 and starting Release 3. |
| `VFIRM_RELEASE_3_IMPLEMENTATION_CHECKLIST_v1.0.md` | Tracks Release 3 Virtual Firm Factory implementation separately from the sprint plan. |
| `VFIRM_RELEASE_3_EVIDENCE_PACK_TEMPLATE_v1.0.md` | Defines evidence required to close Release 3. |
| `R3_S1_BLUEPRINT_CONTRACT_LOCK_COMPLETION_v1.0.md` | Records R3-S1 Blueprint Contract Lock completion, factory blueprint validator, fixtures, denial cases, and smoke evidence. |
| `R3_S2_PROVISIONING_KERNEL_COMPLETION_v1.0.md` | Records R3-S2 Provisioning Kernel completion, Factory APIs, provisioning records, human approval gates, readiness checks, JSON/PostgreSQL smoke evidence, and R3-S3 handoff. |
| `R3_S3_PACK_BINDING_AND_CERTIFICATION_GATES_COMPLETION_v1.0.md` | Records R3-S3 pack compatibility, binding certification, service activation gates, authority denials, JSON/PostgreSQL smoke evidence, and R3-S4 handoff. |
| `R3_S4_SECOND_FIRM_REHEARSAL_COMPLETION_v1.0.md` | Records R3-S4 second-firm rehearsal through Factory provisioning, pack certification, solopreneur operations, audit, export, and R3-S5 handoff. |
| `R3_S5_FACTORY_HARDENING_GATE_COMPLETION_v1.0.md` | Records R3-S5 negative Factory hardening, denial evidence, cross-tenant protections, JSON/PostgreSQL smoke evidence, and R3-S6 handoff. |
| `R3_RELEASE_CANDIDATE_EVIDENCE_PACK_COMPLETED_v1.0.md` | Completed Release 3 evidence pack with conformance, blueprint, provisioning, certification, rehearsal, hardening, verification, risk, and go/no-go evidence. |
| `R3_S6_EVIDENCE_PACK_AND_GO_NO_GO_COMPLETION_v1.0.md` | Records R3-S6 closeout, evidence pack assembly, remaining risk classification, go/no-go recommendation, and Release 4 entry boundary. |
| `R3_ACCEPTANCE_AND_R4_SCOPE_AUTHORIZATION_v1.0.md` | Records product-owner acceptance of Release 3 and authorization of Release 4 controlled staging/private pilot scope. |
| `R4_ENTRY_SETUP_DECISION_v1.0.md` | Records Release 4 entry decisions for identity, deployment, interim owners, R3 carry-over disposition, and R4-S1 authorization. |
| `VFIRM_RELEASE_4_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md` | Defines controlled staging and private pilot operations scope and sprints. |
| `VFIRM_RELEASE_4_IMPLEMENTATION_CHECKLIST_v1.0.md` | Tracks Release 4 controlled staging/private pilot implementation through R4-S1 to R4-S6. |
| `VFIRM_RELEASE_4_EVIDENCE_PACK_TEMPLATE_v1.0.md` | Defines evidence required to close Release 4. |
| `R4_S1_STAGING_IDENTITY_AND_TENANT_ADMIN_COMPLETION_v1.0.md` | Records R4-S1 provider-neutral identity, tenant admin, suspension/revocation, denial, audit, and smoke evidence. |
| `R4_S2_STAGING_DEPLOYMENT_AND_DATA_PROTECTION_COMPLETION_v1.0.md` | Records R4-S2 staging deployment profile, data protection, backup/restore, export, tenant isolation, and smoke evidence. |
| `R4_S3_PILOT_SUPPORT_AND_INCIDENT_CONTROLS_COMPLETION_v1.0.md` | Records R4-S3 support case states, triage, incident controls, human authority denials, suspension path, recovery, audit, and smoke evidence. |
| `R4_S4_OBSERVABILITY_AND_AUDIT_REVIEW_COMPLETION_v1.0.md` | Records R4-S4 runtime trace, application log, worker action, business audit, policy decision, redaction, evidence summary, and smoke evidence. |
| `R4_S5_PRIVATE_PILOT_COHORT_COMPLETION_v1.0.md` | Records R4-S5 private pilot cohort gate completion, activation controls, denial cases, and handoff to R4-S6. |
| `R4_S6_PILOT_LEARNING_LOOP_AND_EVIDENCE_COMPLETION_v1.0.md` | Records R4-S6 pilot learning loop, governed backlog, scope-boundary denial, evidence readiness, and go/no-go recommendation. |
| `R4_RELEASE_CANDIDATE_EVIDENCE_PACK_COMPLETED_v1.0.md` | Completed Release 4 evidence pack with conformance, sprint evidence, remaining risks, and technical go/no-go recommendation. |
| `R4_ACCEPTANCE_DECISION_GATE_v1.0.md` | Product-owner decision gate for accepting, holding, or rejecting Release 4 and deciding whether to authorize Release 5 scope. |
| `VFIRM_RELEASE_5_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md` | Defines trusted specialist network and firm-to-firm collaboration scope and sprints. |
| `VFIRM_MARKETPLACE_ECOSYSTEM_INTELLIGENCE_RELEASE_PLAN_v1.0.md` | Defines later marketplace, capacity economy, and VF-24 ecosystem intelligence release boundaries. |
| `ME_S5_PRIVATE_DIRECTORY_OPERATOR_UI_COMPLETION_v1.0.md` | Records ME-S5 private directory operator UI completion, workspace controls, forbidden behavior removal from active UI, and smoke evidence. |
| `ME_S6_PRIVATE_DIRECTORY_INTELLIGENCE_READINESS_VIEW_COMPLETION_v1.0.md` | Records ME-S6 private directory intelligence/readiness endpoint, workspace binding, pending action visibility, and JSON/PostgreSQL smoke evidence. |
| `ME_S7_MARKETPLACE_ECOSYSTEM_RELEASE_GATE_COMPLETION_v1.0.md` | Records ME-S7 release gate outcome for controlled private directory operation and blocked marketplace widening. |
| `PD_H1_PRIVATE_DIRECTORY_PRODUCT_HARDENING_AND_OPERATOR_WALKTHROUGH_SPRINT_PLAN_v1.0.md` | Defines the private directory product-hardening sprint before any further marketplace widening. |
| `PD_H1_PRIVATE_DIRECTORY_PRODUCT_HARDENING_AND_OPERATOR_WALKTHROUGH_CHECKLIST_v1.0.md` | Tracks PD-H1 scope lock, UI hardening, rehearsal fixture, walkthrough, verification, documentation, and completion criteria. |
| `PD_H1_PRIVATE_DIRECTORY_OPERATOR_WALKTHROUGH_RUNBOOK_v1.0.md` | Provides a plain-language operator walkthrough for the controlled private directory cockpit. |
| `PD_H1_PRIVATE_DIRECTORY_PRODUCT_HARDENING_COMPLETION_v1.0.md` | Records PD-H1 completed work, ad hoc work, evidence commands, limitations, and next plan. |
| `PD_H2_PRIVATE_DIRECTORY_PILOT_REHEARSAL_EVIDENCE_PACK_v1.0.md` | Records PD-H2 private directory pilot rehearsal evidence pack structure and proof points. |
| `PD_H2_PRIVATE_DIRECTORY_PILOT_REHEARSAL_COMPLETION_v1.0.md` | Records PD-H2 completed work, ad hoc work, verification evidence, limitations, and next plan. |
| `PD_H3_PRIVATE_DIRECTORY_PILOT_ACCEPTANCE_GATE_v1.0.md` | Product-owner decision gate for accepting, holding, or rejecting controlled private directory pilot readiness. |
| `PD_H3_PRIVATE_DIRECTORY_PILOT_ACCEPTANCE_DECISION_v1.0.md` | Records product-owner acceptance of controlled private directory pilot readiness and locked boundaries. |
| Document | Purpose |
|---|---|
| `VFIRM_SOLOPRENEUR_FIRM_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md` | Governs the approved bounded build of the first operable solopreneur Formwork Engineering Virtual Firm. |
| `VFIRM_RELEASE_1_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md` | Defines the bounded Release 1 product target, non-goals, sprint gates, acceptance criteria, and stop rule after Stage 20. |
| `R1_S1_PRODUCT_TARGET_BACKLOG_LOCK_AUDIT_v1.0.md` | Completes R1-S1 by auditing Stage 1-20 against the Release 1 target and classifying the backlog into blockers, stabilization, polish, Release 2 candidates, and not-now items. |
| `R1_S2_EXISTING_WORKFLOW_STABILIZATION_COMPLETION_v1.0.md` | Completes R1-S2 with the Release 1 end-to-end smoke, PostgreSQL primary verification, JSON fallback parity, and scoped UX polish evidence. |
| `R1_S3_TENANT_AUTH_POLICY_DATA_HARDENING_COMPLETION_v1.0.md` | Completes R1-S3 with negative tenant-isolation, authority-denial, revocation, data-protection, and no-live-capture guard evidence. |
| `R1_S4_PILOT_OPERATIONS_DRESS_REHEARSAL_RUNBOOK_v1.0.md` | Defines the repeatable Release 1 pilot operations rehearsal runbook. |
| `R1_S4_OPERATOR_DEMO_SCRIPT_v1.0.md` | Gives the team a consistent operator-facing Release 1 pilot demonstration script. |
| `R1_RELEASE_CANDIDATE_EVIDENCE_PACK_TEMPLATE_v1.0.md` | Provides the Release 1 evidence pack structure for acceptance review. |
| `R1_S4_PILOT_OPERATIONS_DRESS_REHEARSAL_COMPLETION_v1.0.md` | Completes R1-S4 with dress rehearsal validation evidence and R1-S5 handoff. |
| `R1_RELEASE_CANDIDATE_EVIDENCE_PACK_COMPLETED_v1.0.md` | Completed Release 1 evidence pack for RC local pilot acceptance. |
| `R1_S5_RELEASE_CANDIDATE_ACCEPTANCE_REVIEW_v1.0.md` | Final R1-S5 acceptance review, findings classification, and go/no-go recommendation. |
| `STAGE_2_IMPLEMENTATION_STRATEGY_v1.0.md` | Defines Stage 2 purpose, scope, principles, technical direction, and exit criteria. |
| `IMPLEMENTATION_STAGE_ROADMAP_v1.0.md` | Defines Stage 0 through Stage 9 so the team can see the full product build path. |
| `STAGE_2_SPRINT_PLAN_v1.0.md` | Breaks Stage 2 into implementation sprints and exit criteria. |
| `STAGE_2_EXIT_REVIEW_v1.0.md` | Closes Stage 2.6 with validation evidence, remaining watch items, and Stage 3 entry condition. |
| `STAGE_3_PRODUCTIZED_WORKSPACE_PLAN_v1.0.md` | Defines Stage 3 mission, sprints, and exit criteria for productized workspace screens. |
| `STAGE_3_SPRINT_3_1_WORKSPACE_SHELL_NOTE_v0.1.md` | Records the first Stage 3 workspace shell productization implementation slice. |
| `STAGE_3_EXIT_REVIEW_v1.0.md` | Closes Stage 3 and records validation evidence, exit criteria, and Stage 4 entry recommendation. |
| `STAGE_4_TRUST_IDENTITY_GOVERNANCE_PLAN_v1.0.md` | Defines Stage 4 trust, identity, membership, authority, and policy enforcement scope. |
| `STAGE_4_SPRINT_4_1_DEV_AUTH_MEMBERSHIP_NOTE_v0.1.md` | Records Stage 4 dev-auth, membership, and authority enforcement implementation progress. |
| `IMPLEMENTATION_CHECKLIST_v1.0.md` | Working checklist for database, API, web, policy, events, service packs, tests, and readiness. |
| `TECHNICAL_DEBT_REGISTER_v1.0.md` | Tracks known implementation debt and target resolution stages/sprints. |
| `TECHNICAL_DESIGN_MVP_v1.0.md` | First build slice, service boundaries, user roles, states, screens, milestones. |
| `DATABASE_SCHEMA_PLAN_v1.0.md` | MVP persistence model derived from canonical schema catalogue. |
| `API_CONTRACT_PLAN_v1.0.md` | MVP API groups, endpoint intentions, command patterns, policy-sensitive endpoints. |
| `EVENT_PAYLOAD_SCHEMA_PLAN_v1.0.md` | MVP event envelope and payload contracts. |
| `POLICY_TEST_PLAN_v1.0.md` | First executable policy test groups and deny/allow expectations. |
| `FORMWORK_SERVICE_PACK_SPEC_v1.0.md` | Buildable specification for the first Formwork Engineering service pack. |
| `STACK_AND_DATABASE_DECISION_v1.0.md` | MVP stack and database path decision. |
| `STAGE_1_MVP_OPERATING_LOOP_COMPLETION_v1.0.md` | Stage 1 local MVP loop completion note. |

## Build rule

Implementation should proceed through the sprint plan. New feature work should not be treated as the next step unless it maps to an active sprint item or an explicitly approved change.

After Stage 20, the governing sprint plan is `VFIRM_RELEASE_1_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md`. Do not create additional open-ended Stage 21+ feature stages by default.








- [Stage 4 Trust, Identity & Governance Plan](STAGE_4_TRUST_IDENTITY_GOVERNANCE_PLAN_v1.0.md)
- [Stage 4 Sprint 4.1 Dev Auth & Membership Note](STAGE_4_SPRINT_4_1_DEV_AUTH_MEMBERSHIP_NOTE_v0.1.md)
- [Stage 4 Auth Provider Decision Note](STAGE_4_AUTH_PROVIDER_DECISION_v0.1.md)
- [Stage 4 Exit Review](STAGE_4_EXIT_REVIEW_v1.0.md)


- [Stage 5 Service Delivery Engine Plan](STAGE_5_SERVICE_DELIVERY_ENGINE_PLAN_v1.0.md)
- [Stage 5 Exit Review](STAGE_5_EXIT_REVIEW_v1.0.md)


- [Stage 6 Commercial Operations Plan](STAGE_6_COMMERCIAL_OPERATIONS_PLAN_v1.0.md)
- [Stage 6 Exit Review](STAGE_6_EXIT_REVIEW_v1.0.md)


- [Stage 7 AI Workforce Runtime Plan](STAGE_7_AI_WORKFORCE_RUNTIME_PLAN_v1.0.md)
- [Stage 7 Exit Review](STAGE_7_EXIT_REVIEW_v1.0.md)


- [Stage 8 Marketplace and Network Layer Plan](STAGE_8_MARKETPLACE_NETWORK_LAYER_PLAN_v1.0.md)
- [Stage 8 Exit Review](STAGE_8_EXIT_REVIEW_v1.0.md)


- [Stage 9 Production Readiness Plan](STAGE_9_PRODUCTION_READINESS_PLAN_v1.0.md)
- [Stage 9 Release Operations Runbook](STAGE_9_RELEASE_OPERATIONS_RUNBOOK_v1.0.md)
- [Stage 9 Exit Review](STAGE_9_EXIT_REVIEW_v1.0.md)


- [Stage 10 Pilot Deployment and Formwork Packaging Plan](STAGE_10_PILOT_DEPLOYMENT_FORMWORK_PACKAGING_PLAN_v1.0.md)
- [Stage 10 Formwork Pilot Operating Handbook](STAGE_10_FORMWORK_PILOT_OPERATING_HANDBOOK_v1.0.md)
- [Stage 10 Exit Review](STAGE_10_EXIT_REVIEW_v1.0.md)


- [Stage 11 External Auth, Pilot Users, and Staging Plan](STAGE_11_EXTERNAL_AUTH_PILOT_USERS_STAGING_PLAN_v1.0.md)
- [Stage 11 Staging Auth Runbook](STAGE_11_STAGING_AUTH_RUNBOOK_v1.0.md)
- [Stage 11 Exit Review](STAGE_11_EXIT_REVIEW_v1.0.md)


- [Stage 12 Real Auth Provider and Tenant Admin Plan](STAGE_12_REAL_AUTH_PROVIDER_TENANT_ADMIN_PLAN_v1.0.md)
- [Stage 12 Auth Provider Decision Note](STAGE_12_AUTH_PROVIDER_DECISION_NOTE_v0.1.md)
- [Stage 12 Tenant Admin Controls Runbook](STAGE_12_TENANT_ADMIN_CONTROLS_RUNBOOK_v1.0.md)
- [Stage 12 Exit Review](STAGE_12_EXIT_REVIEW_v1.0.md)


- [Stage 13 Staging Deployment and Data Protection Plan](STAGE_13_STAGING_DEPLOYMENT_DATA_PROTECTION_PLAN_v1.0.md)
- [Stage 13 Staging Deployment and Data Protection Runbook](STAGE_13_STAGING_DEPLOYMENT_DATA_PROTECTION_RUNBOOK_v1.0.md)
- [Stage 13 Exit Review](STAGE_13_EXIT_REVIEW_v1.0.md)


- [Stage 14 Pilot Tenant Operations and Support Controls Plan](STAGE_14_PILOT_TENANT_OPERATIONS_SUPPORT_CONTROLS_PLAN_v1.0.md)
- [Stage 14 Support Desk and Revocation Runbook](STAGE_14_SUPPORT_DESK_REVOCATION_RUNBOOK_v1.0.md)
- [Stage 14 Exit Review](STAGE_14_EXIT_REVIEW_v1.0.md)


- [Stage 15 Pilot Observability and Incident Response Plan](STAGE_15_PILOT_OBSERVABILITY_INCIDENT_RESPONSE_PLAN_v1.0.md)
- [Stage 15 Observability and Incident Runbook](STAGE_15_OBSERVABILITY_INCIDENT_RUNBOOK_v1.0.md)
- [Stage 15 Exit Review](STAGE_15_EXIT_REVIEW_v1.0.md)

- [Stage 16 Pilot Feedback and Improvement Loop Plan](STAGE_16_PILOT_FEEDBACK_IMPROVEMENT_LOOP_PLAN_v1.0.md)
- [Stage 16 Pilot Learning Loop Runbook](STAGE_16_PILOT_LEARNING_LOOP_RUNBOOK_v1.0.md)
- [Stage 16 Exit Review](STAGE_16_EXIT_REVIEW_v1.0.md)

- [Stage 17 Pilot Reporting and Review Board Plan](STAGE_17_PILOT_REPORTING_REVIEW_BOARD_PLAN_v1.0.md)
- [Stage 17 Stakeholder Review Board Runbook](STAGE_17_STAKEHOLDER_REVIEW_BOARD_RUNBOOK_v1.0.md)
- [Stage 17 Exit Review](STAGE_17_EXIT_REVIEW_v1.0.md)

- [Stage 18 Controlled Pilot Expansion Plan](STAGE_18_CONTROLLED_PILOT_EXPANSION_PLAN_v1.0.md)
- [Stage 18 Controlled Expansion Runbook](STAGE_18_CONTROLLED_EXPANSION_RUNBOOK_v1.0.md)
- [Stage 18 Exit Review](STAGE_18_EXIT_REVIEW_v1.0.md)

- [Stage 19 Usage Limits and Billing Readiness Plan](STAGE_19_USAGE_LIMITS_BILLING_READINESS_PLAN_v1.0.md)
- [Stage 19 Usage Limits and Billing Readiness Runbook](STAGE_19_USAGE_LIMITS_BILLING_READINESS_RUNBOOK_v1.0.md)
- [Stage 19 Exit Review](STAGE_19_EXIT_REVIEW_v1.0.md)

- [Stage 20 Payment, Subscription, and Commercial Launch Plan](STAGE_20_PAYMENT_SUBSCRIPTION_COMMERCIAL_LAUNCH_PLAN_v1.0.md)
- [Stage 20 Commercial Launch Controls Runbook](STAGE_20_COMMERCIAL_LAUNCH_CONTROLS_RUNBOOK_v1.0.md)
- [Stage 20 Exit Review](STAGE_20_EXIT_REVIEW_v1.0.md)
| R4_ACCEPTANCE_AND_R5_SCOPE_AUTHORIZATION_v1.0.md | Records product-owner acceptance of Release 4 with limitations and authorization of Release 5 trusted specialist network scope. |
| VFIRM_RELEASE_5_IMPLEMENTATION_CHECKLIST_v1.0.md | Tracks Release 5 implementation gates from trusted network profiles through evidence pack closure. |
| R5_S1_TRUSTED_NETWORK_PROFILES_COMPLETION_v1.0.md | Completion evidence for R5-S1 trusted network profile primitives and executable gate. |
| `R5_S2_QUALIFICATION_AND_CONFLICT_GATE_COMPLETION_v1.0.md` | Completion evidence for R5-S2 deterministic qualification, conflict, capacity, insurance, policy, and invitation gates. |
| R5_S3_COLLABORATION_WORKSPACE_COMPLETION_v1.0.md | Completion evidence for R5-S3 controlled collaboration workspace, data-room policy, participant access, revocation, and workspace-scoped evidence. |
| R5_S4_RESPONSIBILITY_AND_APPROVAL_MATRIX_COMPLETION_v1.0.md | Completion evidence for R5-S4 accountable firm, responsible professional, reviewer, approver, permitted worker actions, and no-silent-approval controls. |
| R5_S5_ASSIGNMENT_AND_DELIVERY_LOOP_COMPLETION_v1.0.md | Completion evidence for R5-S5 specialist assignment request, acceptance, delivery evidence, review, approval, closure, and audit controls. |
| R5_S6_NETWORK_EVIDENCE_PACK_AND_GO_NO_GO_COMPLETION_v1.0.md | Completion evidence for R5-S6 network evidence pack and go/no-go recommendation. |
| R5_RELEASE_CANDIDATE_EVIDENCE_PACK_COMPLETED_v1.0.md | Release 5 evidence pack proving trusted specialist network readiness and limitations. |
| R5_ACCEPTANCE_DECISION_GATE_v1.0.md | Product-owner decision gate for accepting, holding, or rejecting Release 5 and deciding whether to authorize later marketplace/ecosystem scope. |
| R5_ACCEPTANCE_AND_MARKETPLACE_SCOPE_DECISION_PREPARATION_AUTHORIZATION_v1.0.md | Records product-owner acceptance of Release 5 and authorization to prepare, but not implement, later marketplace/ecosystem scope. |
| MARKETPLACE_ECOSYSTEM_INTELLIGENCE_SCOPE_DECISION_GATE_v1.0.md | Prepared decision gate for later marketplace/ecosystem scope authorization. |
| ME_S1_MARKETPLACE_GOVERNANCE_LOCK_COMPLETION_v1.0.md | Completion evidence for ME-S1 marketplace governance lock policy, contract, and smoke gate. |

| `ME_S2_QUALIFIED_DIRECTORY_AND_SERVICE_PUBLICATION_COMPLETION_v1.0.md` | Completion evidence for ME-S2 controlled private qualified directory publication, suspension, revocation, and smoke gate. |
| `ME_S3_PRIVATE_DIRECTORY_GOVERNANCE_ENQUIRY_RENEWAL_COMPLETION_v1.0.md` | Completion evidence for ME-S3 private directory review board, enquiry-to-collaboration request, renewal/expiry monitoring, boundaries, and smoke gate. |
| `ME_S4_SQL_PERSISTENCE_HARDENING_COMPLETION_v1.0.md` | Completion evidence for ME-S4 SQL persistence hardening of ME-S2/ME-S3 private directory records and Postgres smoke gate. |
