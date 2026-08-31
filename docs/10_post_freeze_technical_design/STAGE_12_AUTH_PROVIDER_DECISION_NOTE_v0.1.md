---
id: VF-STAGE-12-AUTH-PROVIDER-DECISION-NOTE
title: "Stage 12 - Auth Provider Decision Note"
version: "0.1"
status: "Decision Pending"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Stage 12 - Auth Provider Decision Note v0.1

## Current recommendation

For fastest pilot execution, Clerk is the leading candidate if the project later moves to a Next.js/Vercel deployment path because it provides strong hosted auth UI and a native Vercel Marketplace integration.

However, vFirm should remain provider-neutral at the domain/API layer.

## Candidate providers

| Provider | Best fit |
|---|---|
| Clerk | Fast SaaS-style pilot auth, hosted UI, Vercel-friendly setup. |
| Auth0 | Enterprise SSO/SAML and complex identity federation. |
| Supabase Auth | Tight pairing if Supabase becomes the managed PostgreSQL/app backend. |
| Microsoft Entra | Enterprise Microsoft organization identity. |

## Decision rule

Choose the provider based on the first real pilot environment:

- use Clerk for speed and SaaS onboarding;
- use Auth0/Entra if enterprise SSO is required;
- use Supabase Auth if Supabase becomes the chosen backend platform.

## Non-negotiable adapter requirements

- signed token/session verification;
- tenant/firm mapping;
- pilot user active/revoked checks;
- role mapping;
- auditability;
- fail-closed behavior.
