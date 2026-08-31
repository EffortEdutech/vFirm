# Stage 4 Auth Provider Decision Note

Version: v0.1  
Status: MVP decision recorded  
Date: 2026-08-26

## Decision

For the local MVP baseline, vFirm will not bind itself to a production authentication vendor yet.

Instead, Stage 4 introduces a provider-agnostic actor context contract using local development headers:

- `x-vfirm-actor-id`
- `x-vfirm-tenant-id`
- `x-vfirm-firm-id`
- `x-vfirm-role`

These headers are a development substitute for a future verified auth session. They are not a production security mechanism.

## Rationale

The important architectural decision is the internal trust model, not the vendor:

1. Every privileged action must resolve to an actor.
2. Every actor must be tenant and firm scoped.
3. Professional approvals must resolve stored membership, professional profile, and professional authority records.
4. Policy decisions and approvals must retain audit trace.

A future provider should only be responsible for authenticating the human and delivering verified identity claims. vFirm remains responsible for authorization, professional authority, tenant scope, and audit.

## Future Provider Integration Contract

A production auth adapter must map provider claims into:

```text
provider subject -> person -> actor -> firm_membership -> professional_profile -> professional_authority
```

Before any external pilot, the provider adapter must replace dev-auth headers at the API boundary.
