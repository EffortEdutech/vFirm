---
id: VF-STAGE-4-TRUST-IDENTITY-GOVERNANCE-PLAN
title: "Stage 4 Trust, Identity, and Governance Plan"
version: "1.0"
status: "Active Implementation Control"
source_status: "CREATED AFTER STAGE 3 EXIT"
---

# Stage 4 Trust, Identity, and Governance Plan v1.0

## 1. Stage Mission

Stage 4 turns the internal MVP workspace into a governed platform runtime. The focus is identity, tenant membership, roles, professional authority, protected endpoints, and policy-backed approvals.

## 2. Non-Negotiables

- No anonymous privileged workflow actions.
- Tenant boundaries must be enforced before business logic.
- AI autonomy must never become professional authority.
- Regulated/professional approval must require an active human professional authority record.
- Every material action remains attributable and auditable.

## 3. Sprint 4.1 — Dev Auth and Tenant Membership Foundation

Goals:

- add development authentication headers;
- introduce firm membership records;
- resolve request actor from membership/actor records;
- protect read endpoints with tenant/firm scope where possible.

Exit criteria:

- API can identify the acting user/actor in development mode;
- cross-tenant reads can be denied by policy guard.

## 4. Sprint 4.2 — Professional Authority Foundation

Goals:

- expose professional profiles and authorities in store/read APIs;
- seed/grant principal professional authority for the Formwork MVP flow;
- show authority status in workspace governance.

Exit criteria:

- professional authority is a real record, not only a request flag.

## 5. Sprint 4.3 — Approval Policy Enforcement

Goals:

- approval command checks actor identity;
- approval command requires valid authority for professional approval;
- policy decision records denial/allow result;
- smoke tests prove deny-without-authority and allow-with-authority paths.

Exit criteria:

- proposal approval cannot succeed without valid authority context.

## 6. Sprint 4.4 — Governance Workspace Surface

Goals:

- display actor, membership, role, and authority status;
- show denied policy decisions;
- provide operator-facing explanation for authority failure.

Exit criteria:

- the operator can see why an approval is allowed or denied.

## 7. Stage 4 Exit Criteria

Stage 4 can close when:

- dev-auth identity and memberships are implemented;
- protected API guard exists for tenant-scoped reads;
- professional authority is database-backed;
- approval enforcement uses authority records;
- tests cover cross-tenant deny and authority deny/allow;
- workspace shows governance identity and authority context.
