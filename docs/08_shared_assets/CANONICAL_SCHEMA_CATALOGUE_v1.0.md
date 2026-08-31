---
id: VF-SCHEMAS
title: "Canonical Schema Catalogue"
version: "1.0"
status: "Architecture Baseline"
source_status: "DEFINED FOR DEVELOPMENT READINESS"
---

# Canonical Schema Catalogue v1.0

## Purpose

This catalogue defines the canonical objects that vFirm implementation must use. It is not a physical database schema yet. It is the shared object contract for application services, APIs, workflows, events, and policy checks.

## Common record envelope

Every tenant-owned record must include:

```text
id
tenant_id
firm_id where applicable
status
version
created_at
created_by_actor_id
updated_at
updated_by_actor_id
data_classification
provenance
metadata
```

Material records should also include effective dates, retention class, audit event references, and soft-retirement state where needed.

## Actor model

### Actor

```text
actor_id
actor_type: HUMAN | AI_AGENT | SYSTEM | EXTERNAL_SERVICE
person_id nullable
worker_instance_id nullable
system_id nullable
external_service_id nullable
tenant_id nullable
firm_id nullable
display_name
status
```

Rules:

- AI workers never reuse human actor IDs.
- Professional approval must use a human actor.
- System and external service actions must be attributable.

## Foundation schemas

### Tenant

```text
tenant_id
name
status
isolation_policy_id
default_region
data_residency_policy
billing_account_ref
created_at
```

### Firm

```text
firm_id
tenant_id
name
brand_id
business_entity_id
primary_principal_assignment_id
lifecycle_state
lifecycle_state_reason
active_practices
configuration_version
```

### Person

```text
person_id
identity_provider_subject
legal_name
preferred_name
contact_refs
status
```

### ProfessionalProfile

```text
professional_id
person_id
disciplines
specializations
jurisdictions
credential_refs
professional_status
```

### PrincipalAssignment

```text
principal_assignment_id
firm_id
person_id
role
control_scope
start_at
end_at
status
```

### BusinessEntity

```text
business_entity_id
tenant_id
legal_name
entity_type
registration_refs
tax_refs
insurance_refs
status
```

### Brand

```text
brand_id
firm_id
name
public_description
logo_ref
communication_style
claim_restrictions
status
```

### Practice

```text
practice_id
name
category
regulatory_classification
required_governance_pack_refs
status
```

### FirmPractice

```text
firm_practice_id
firm_id
practice_id
jurisdiction_ids
service_ids
eligibility_status
approved_at
status
```

### Jurisdiction

```text
jurisdiction_id
code
name
level
parent_jurisdiction_id
rule_pack_ref
effective_from
effective_to
```

### CredentialReference

```text
credential_id
professional_id
issuer
credential_type
credential_number_hash_or_ref
jurisdiction_id
scope
verification_status
verified_at
expires_at
evidence_ref
```

### ProfessionalAuthority

```text
authority_id
firm_id
professional_id
practice_id
service_scope
jurisdiction_id
permitted_actions
risk_limits
credential_refs
valid_from
valid_to
status
policy_basis_ref
```

## Client and business infrastructure schemas

### Client

```text
client_id
tenant_id
client_type: ORGANIZATION | INDIVIDUAL
name
primary_contact_id
status
confidentiality_class
```

### FirmClientRelationship

```text
relationship_id
firm_id
client_id
relationship_type
status
origin
responsible_owner_actor_id
contracting_business_entity_id
consent_or_legal_basis_ref
conflict_check_ref
```

### Lead

```text
lead_id
firm_id
relationship_id nullable
source_channel
requested_service_hint
urgency
qualification_status
assigned_actor_id
created_from_conversation_ref
```

### IntakeSession

```text
intake_session_id
lead_id
service_id nullable
required_inputs
provided_inputs
missing_information_items
intake_status
```

### Proposal

```text
proposal_id
firm_id
relationship_id
service_id
scope_summary
price_build_up_id
commercial_approval_id
status
valid_until
issued_document_ref
```

### Engagement

```text
engagement_id
firm_id
relationship_id
proposal_id
contract_ref
scope_ref
commercial_terms_ref
acceptance_criteria_ref
status
```

### Project

```text
project_id
firm_id
relationship_id
engagement_id
service_id
project_name
project_state
risk_class
responsible_professional_id nullable
```

### WorkPackage

```text
work_package_id
project_id
service_step
assigned_worker_instance_id nullable
assigned_human_actor_id nullable
state
required_evidence
approval_requirement_id nullable
```

### Task

```text
task_id
work_package_id nullable
tenant_id
firm_id
task_type
input_ref
output_ref
assigned_actor_or_worker_ref
state
risk_class
due_at
```

## Workforce schemas

### WorkerTemplate

```text
worker_template_id
name
version
workforce_class
department
mission
responsibilities
input_schema_ref
output_schema_ref
default_tools
default_authority_envelope_ref
risk_classification
status
```

### WorkerInstance

```text
worker_instance_id
tenant_id
firm_id
worker_template_id
template_version
assigned_services
authority_envelope_id
enabled_tool_refs
enabled_knowledge_refs
runtime_status
```

### WorkforceBlueprint

```text
workforce_blueprint_id
firm_id
practice_ids
service_ids
worker_template_refs
required_tool_refs
required_knowledge_refs
readiness_test_refs
status
```

## Governance and approval schemas

### Approval

```text
approval_id
tenant_id
firm_id
subject_type
subject_id
subject_version_or_hash
requested_by_actor_id
approver_actor_id
approver_professional_id nullable
authority_id nullable
decision: APPROVED | REJECTED | APPROVED_WITH_CONDITIONS | NEEDS_MORE_INFORMATION
conditions
evidence_bundle_id
authentication_strength
decided_at
audit_event_id
```

### EvidenceBundle

```text
evidence_bundle_id
tenant_id
firm_id
project_id nullable
subject_type
subject_id
source_document_refs
input_refs
calculation_refs
qa_check_refs
policy_check_refs
review_notes_ref
final_output_ref
bundle_hash
status
```

### PolicyDecision

```text
policy_decision_id
tenant_id
firm_id nullable
policy_id
policy_version
actor_id
action
resource_type
resource_id
context_ref
result: ALLOW | DENY | REQUIRE_APPROVAL | ESCALATE
reasons
created_at
```

## Commercial schemas

### ServiceDefinition

```text
service_id
practice_id
name
description
input_requirements
deliverables
workflow_ref
governance_requirements
pricing_model_ref
status
```

### ServiceSKU

```text
service_sku_id
service_id
name
scope_variant
pricing_unit
baseline_price_rules
baseline_cost_profile_id
risk_class
status
```

### PriceBuildUp

```text
price_build_up_id
service_sku_id
scope_inputs
human_effort_estimate
ai_runtime_estimate
specialist_cost_estimate
tool_cost_estimate
risk_contingency
platform_fee
margin_target
final_price
approval_required
```

### Invoice

```text
invoice_id
firm_id
relationship_id
engagement_id nullable
project_id nullable
invoice_number
currency
line_items
tax_summary
status
due_at
```

### Payment

```text
payment_id
invoice_id
amount
currency
provider_ref
payment_status
received_at
```

## Document schemas

### Document

```text
document_id
tenant_id
firm_id
project_id nullable
relationship_id nullable
document_type
title
current_version_id
status
classification
```

### DocumentVersion

```text
document_version_id
document_id
version_label
revision
storage_ref
hash
created_by_actor_id
approved_by_approval_id nullable
supersedes_version_id nullable
status
```

## Audit schema

### AuditEvent

```text
audit_event_id
tenant_id
firm_id nullable
actor_id
action
resource_type
resource_id
resource_version nullable
policy_decision_id nullable
correlation_id
causation_id
occurred_at
summary
evidence_ref nullable
```

## Implementation rule

Physical database schemas may split or optimize these objects, but APIs, events, policies, and workflows must preserve these canonical meanings.

