# Stage 4 Exit Review — Trust, Identity & Governance

Version: v1.0  
Status: COMPLETE for local MVP baseline  
Date: 2026-08-26

## 1. Stage 4 Objective

Stage 4 established the first runnable trust, identity, professional authority, and governance layer for the vFirm MVP.

The goal was not to integrate a production identity provider yet. The goal was to create the product and technical seam that makes every privileged workflow action attributable to an actor, tenant, firm membership, and professional authority record.

## 2. Completed Scope

| Area | Result |
|---|---|
| Firm membership | `firm_memberships` table and store collection added. Firm creation now seeds principal membership. |
| Professional profile | Firm creation now seeds the principal professional profile. |
| Professional authority | Firm creation now seeds principal authority for Formwork MVP approval actions. |
| Proposal approval control | Proposal approval no longer trusts client-supplied authority flags. The API resolves authority from stored membership/profile/authority records. |
| Dev-auth context | API accepts local development headers: `x-vfirm-actor-id`, `x-vfirm-tenant-id`, `x-vfirm-firm-id`, `x-vfirm-role`. |
| Auth context endpoint | `GET /auth/context` returns current actor, membership, profile, authority, and validity. |
| Tenant read guard | Resource read endpoints deny actor-scoped cross-tenant and cross-firm reads when dev-auth headers are present. |
| Web app integration | The web shell automatically sends current principal actor context after a firm exists. |
| Governance workspace | Audit screen now shows governance counts, current actor context, memberships, authorities, approvals, policy decisions, and denied decisions. |
| Test coverage | Stage 4 smoke tests cover authority allow/deny and protected read deny behavior. |

## 3. Deliberate Boundary

Production authentication provider selection is intentionally deferred.

The MVP now has a provider-agnostic auth seam. A future provider can map authenticated users into the same actor, person, membership, and authority model without changing core workflow semantics.

Candidate provider choices remain a Stage 5/Stage 6 or pre-pilot decision, depending on whether the next milestone prioritizes real users, internal operator hardening, or external deployment.

## 4. Validation Evidence

The following checks were added or updated:

- `node scripts/smoke-stage4-governance.mjs`
- `node scripts/smoke-stage4-protected-reads.mjs`
- `npm run check` includes both Stage 4 smoke tests.

## 5. Exit Decision

Stage 4 is closed as the vFirm local MVP trust and governance baseline.

The platform can now proceed to Stage 5 with a clearer separation between:

- identity and membership,
- professional authority,
- policy decisions,
- tenant-scoped data access,
- operator-visible audit trace.

## 6. Known Follow-up Items

These are not blockers to Stage 4 closure:

1. Replace dev-auth headers with a production auth provider adapter before external pilot.
2. Add mutating endpoint idempotency keys before payment/document side effects.
3. Add row-level security or database-level tenant isolation before multi-user production deployment.
4. Add admin screens for manually managing membership and authority records.
5. Expand policy tests for authority expiry, suspended memberships, and risk-limit thresholds.
