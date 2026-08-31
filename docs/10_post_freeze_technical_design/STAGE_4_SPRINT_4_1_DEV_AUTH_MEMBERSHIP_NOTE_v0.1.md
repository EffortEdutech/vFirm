---
id: VF-STAGE-4-SPRINT-4-1-NOTE
title: "Stage 4 Sprint 4.1 Dev Auth and Membership Note"
version: "0.1"
status: "In Progress"
source_status: "CREATED DURING STAGE 4 IMPLEMENTATION"
review_date: "2026-08-26"
---

# Stage 4 Sprint 4.1 Dev Auth and Membership Note

## 1. Purpose

This note records the first Stage 4 implementation slice: development-mode identity, membership, and authority enforcement scaffolding.

## 2. Implementation Intent

The MVP remains local-first, but actions should no longer rely only on anonymous/system actor assumptions. Development headers and seeded principal authority provide a safe bridge before production authentication is selected.

## 3. Work Completed in First Stage 4 Slice

- added `firm_memberships` relational migration;
- added membership/profile/authority collections to the store read model;
- firm creation now seeds principal membership, professional profile, and active professional authority;
- proposal approval now checks database/store-backed professional authority instead of trusting a request flag;
- approval records now carry `authority_id` and `approver_professional_id`;
- added Stage 4 governance smoke test covering deny-without-authority and allow-with-authority paths;
- exposed membership/profile/authority resources in API contracts and web workspace read model;
- governance summary now shows membership and active authority counts.

## 4. Validation

Latest validation:

```text
npm run check
npm run check:db:postgres
```

Result:

```text
Baseline validation passed.
Implementation artifact validation passed.
Migration validation passed.
Policy tests passed.
API smoke test passed.
API read endpoint smoke test passed.
Web smoke test passed.
Web/API integration smoke test passed.
Stage 4 governance smoke test passed.
PostgreSQL smoke test passed.
```

## 5. Remaining Stage 4 Work

- introduce explicit dev-auth header actor resolution instead of relying on request body actor objects;
- add tenant-scoped protected read guards;
- add richer governance UI for memberships and authorities;
- prepare production auth provider decision.
