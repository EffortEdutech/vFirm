# Role audit: owner guide (RA)

Plain steps for the firm owner. Decision record: ADR-115. No database change.

## What changed

- Before: anyone you invited could call almost any action in vFirm. Only some EDCS and Firm Ideas pages checked for the owner.
- Now: one list decides who can do what, in one place (`apps/api/src/route-role-policy.mjs`).

## Who can do what

- **Owner** (owner, principal, admin): everything.
- **Member** (MEMBER, PILOT_OPERATOR, FIRM_ADMIN): daily work.
  - Upload files, add clients, make work requests, run skills, write drafts.
  - Front desk, quotation preparation, documents, deadlines, technical reviews, support cases.
  - Approving a draft still follows your Approval limits. A member without the right limit is refused as before.
- **Observer** (PILOT_OBSERVER): can look, cannot change anything.
- Members and observers are refused:
  - invoices, payments, expense approval, billing and subscriptions;
  - inviting, activating or revoking people;
  - hiring workers, firm and BizKick settings, rules, standing instructions;
  - e-Invoice, Trust Ladder, Evidence Passport, Morning Brief, scorecards, cash snapshot, audit log and data export.
- Any new action added later is owner-only until it is opened on purpose.

## Inviting people

1. Only you can invite.
2. Roles allowed: OWNER, PILOT_PRINCIPAL, FIRM_ADMIN, MEMBER, PILOT_OPERATOR, PILOT_OBSERVER. Anything else is refused.
3. Give a new person MEMBER unless they must read only (use PILOT_OBSERVER).

## What a refused person sees

- A message such as "Only the firm owner can do this." The console does not hide owner pages from members yet, so they will see the refusal.

## Check it yourself

1. Invite a test email as MEMBER.
2. Sign in as that person and try Finance or Users. Expect a refusal.
3. Try Workdesk and Documents. Expect them to work.
