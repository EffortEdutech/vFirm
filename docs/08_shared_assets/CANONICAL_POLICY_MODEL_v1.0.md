---
id: VF-POLICY
title: "Canonical Policy Model"
version: "1.0"
status: "Architecture Baseline"
source_status: "DEFINED FOR DEVELOPMENT READINESS"
---

# Canonical Policy Model v1.0

## Purpose

The policy model defines how vFirm decides whether an actor may perform an action on a resource in a specific context. It protects tenant isolation, professional authority, AI autonomy boundaries, regulated work, financial actions, tool access, data access, and client-facing commitments.

## Policy decision outcomes

```text
ALLOW
DENY
REQUIRE_APPROVAL
ESCALATE
REQUIRE_MORE_INFORMATION
```

## Policy decision input

Every policy evaluation should receive:

```text
actor_id
actor_type
tenant_id
firm_id nullable
action
resource_type
resource_id
resource_state
risk_class
practice_id nullable
service_id nullable
jurisdiction_id nullable
credential_refs nullable
authority_refs nullable
worker_instance_id nullable
authority_envelope_id nullable
tool_id nullable
data_classification
engagement_context nullable
client_context nullable
amount_and_currency nullable
requested_output_status nullable
```

## Policy decision output

```text
policy_decision_id
result
reasons
required_approver_role nullable
required_professional_authority nullable
required_evidence nullable
allowed_actions nullable
constraints nullable
expires_at nullable
policy_version
```

## Policy layers

Policies evaluate in layers:

```text
1. Tenant isolation
2. Actor identity and authentication
3. Firm membership and role
4. Data classification and resource access
5. Worker authority envelope where actor is AI
6. Tool permission
7. Business workflow state
8. Service/practice eligibility
9. Jurisdiction and credential rules
10. Risk classification
11. Commercial/financial thresholds
12. Approval and evidence requirements
13. Audit and retention requirements
```

A deny at a higher layer normally stops evaluation. A require-approval outcome may continue only to gather required approval/evidence metadata.

## Core policy types

| Policy | Purpose |
|---|---|
| TenantAccessPolicy | Prevent cross-tenant access and leakage. |
| FirmMembershipPolicy | Check actor relation to Firm. |
| DataAccessPolicy | Govern read/write by data classification. |
| WorkerAuthorityPolicy | Bound AI worker actions. |
| ToolUsePolicy | Control tool invocation. |
| WorkflowStatePolicy | Prevent illegal state transitions. |
| ProfessionalAuthorityPolicy | Check human authority for regulated action. |
| ServiceEligibilityPolicy | Check Firm/service eligibility. |
| ApprovalPolicy | Decide whether approval is required. |
| CommercialAuthorityPolicy | Govern price, discount, quote, invoice, payout. |
| ClientCommunicationPolicy | Govern client-facing statements and commitments. |
| EvidencePolicy | Require evidence bundle content. |
| RetentionPolicy | Govern deletion/export/retention. |
| MarketplaceQualificationPolicy | Gate matching by credential, jurisdiction, conflict, trust, capacity. |

## AI worker policy rules

AI workers may act only within their provisioned authority envelope.

Every AI worker action must check:

```text
worker identity
firm scope
task assignment
allowed tools
allowed data
allowed action
risk class
autonomy level
budget
time limit
output status
escalation rules
```

AI workers must not:

- use a human session or credential;
- approve regulated work;
- sign documents;
- change professional conclusions;
- access unrelated tenant or Firm data;
- send high-risk client commitments without approval;
- mutate workflow state outside policy;
- bypass deterministic tools for high-risk calculations.

## Human professional authority rules

Professional authority requires:

```text
human actor
professional profile
active authority grant
verified credential where required
jurisdiction fit
practice/service scope
engagement role
risk limit
valid time window
not suspended/revoked/expired
```

If any required term fails, the result is `DENY` or `ESCALATE`.

## Approval policy

Approval is required when:

- regulated deliverable is ready for issue;
- controlled deliverable crosses risk threshold;
- proposal exceeds price/discount authority;
- contract terms depart from approved template;
- AI output will be client-facing in a controlled context;
- financial payout or adjustment exceeds threshold;
- project state transition has material client/commercial/professional consequence;
- data export includes sensitive or regulated records.

Approval must be explicit and attributable. Silence, time passage, or AI recommendation is not approval.

## Risk classes

```text
LOW
STANDARD
CONTROLLED
HIGH
REGULATED
CRITICAL
UNDETERMINED
```

`UNDETERMINED` blocks final external action until classified.

## Data classification

```text
PUBLIC
INTERNAL
CLIENT_CONFIDENTIAL
FIRM_CONFIDENTIAL
PROFESSIONAL_CONFIDENTIAL
REGULATED
LEGAL_PRIVILEGED
FINANCIAL_SENSITIVE
PERSONAL_DATA
SECRET
```

Data policy must evaluate classification, actor, purpose, tenant, firm, project, client, and channel.

## Tool use policy

A tool invocation is allowed only when:

```text
tool is registered
tool version is allowed
actor or worker may use it
data scope is permitted
action is within authority
tool output is validated
cost/budget allows it
result is auditable
```

External tools must not receive unnecessary client or professional confidential data.

## Workflow state policy

State transitions must be explicit. Examples:

```text
proposal.created -> proposal.sent requires commercial approval when threshold applies
work_package.ready_for_review -> deliverable.issued requires approval when controlled/regulated
project.opened -> project.closed requires closeout checks
firm.certification -> firm.active requires readiness evidence
```

LLM output may recommend a state change but must not directly perform high-risk state mutation.

## Commercial authority policy

Commercial controls include:

```text
quote value threshold
discount threshold
margin floor
payment term deviation
refund/credit threshold
write-off threshold
payout threshold
specialist assignment value
```

Actions above threshold require human approval by the responsible commercial authority or Principal.

## Client communication policy

Client-facing AI communication must be grounded in authoritative records.

AI may say:

```text
Your project is awaiting professional review.
We still need the latest structural drawing.
The invoice is due on the recorded due date.
```

AI must not invent:

```text
technical approval
legal interpretation
unapproved discount
delivery promise
professional conclusion
regulatory compliance statement
```

## Marketplace policy

Matching and marketplace routing evaluate:

```text
service fit
jurisdiction fit
credential fit
practice eligibility
conflict status
capacity
trust signals
quality signals
commercial fit
```

Qualification gates outrank price.

## Evidence policy

Evidence requirements depend on service, risk, jurisdiction, and deliverable type. A regulated deliverable may require:

```text
client brief
source documents
input assumptions
calculation records
deterministic tool outputs
QA checklist
review notes
professional approval
final document hash
issue record
```

## Policy versioning

Every policy decision records `policy_id` and `policy_version`. When a policy changes, old decisions remain interpretable.

## Baseline implementation approach

Start with a simple policy engine that supports:

1. Tenant access checks.
2. Worker authority checks.
3. Professional authority checks.
4. Approval requirement checks.
5. Commercial threshold checks.
6. Workflow transition checks.
7. Audit event creation.

More complex rule authoring, jurisdiction packs, and marketplace policies can expand after the first operating loop works.

