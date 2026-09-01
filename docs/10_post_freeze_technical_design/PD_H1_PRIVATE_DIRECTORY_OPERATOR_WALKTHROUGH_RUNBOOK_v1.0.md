---
id: PD-H1-PRIVATE-DIRECTORY-OPERATOR-WALKTHROUGH-RUNBOOK
title: "PD-H1 Private Directory Operator Walkthrough Runbook"
version: "1.0"
status: "Completed"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# PD-H1 Private Directory Operator Walkthrough Runbook v1.0

## 1. Purpose

This runbook helps a human operator rehearse the controlled private directory without developer explanation.

The walkthrough is for controlled private directory only. It is not public marketplace operation and it does not authorize live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, or autonomous regulated approval.

## 2. Before starting

Confirm:

- the API and web workspace are running;
- the tenant and firms exist;
- at least one provider has verified credential evidence;
- at least one PASS qualification gate exists;
- the operator is a human actor with the correct tenant/firm scope.

Useful checks:

```bash
npm run check:me:s5
npm run check:me:s6
npm run check:me:s7
npm run check:pd:h1
```

## 3. Walkthrough steps

### Step 1 - Open the workspace

Open the Virtual Firm workspace and select `Network`.

Expected observation:

- the page heading says `Private Directory Operator UI`;
- the page is not blank;
- the page shows action forms and a controlled directory summary.

### Step 2 - Read the readiness summary

Find the `Controlled Directory Summary` panel.

Expected observation:

- ME-S2, ME-S3, and ME-S6 status are visible;
- pending actions are visible;
- renewal risks are visible;
- audit readiness is visible.

### Step 3 - Review operator next actions

Find `Operator next actions`.

Expected observation:

- pending Review Board actions are shown as Review Board cards;
- private enquiry follow-ups are shown as Private Enquiry cards;
- renewal risks are shown as Renewal Risk cards;
- if there are no urgent actions, a safe empty state is shown.

### Step 4 - Inspect qualified listings

Use the `Qualified Directory Listings` table and click `View` on a listing.

Expected observation:

- listing status is visible;
- visibility remains trusted/private;
- qualification gate reference is visible;
- provider firm reference is visible.

### Step 5 - Record or inspect Review Board decision

Use `Record Review Board Decision` only when governance evidence exists.

Expected observation:

- Review Board decisions are auditable;
- the decision does not create professional authority;
- suspension/revocation remains explicit.

### Step 6 - Record Private Enquiry

Use `Record Private Enquiry` for a requesting firm asking about a qualified provider listing.

Expected observation:

- enquiry is recorded as a manual private enquiry;
- enquiry is not live matching;
- enquiry is not ranking;
- enquiry is not award.

### Step 7 - Request Collaboration

Use `Request Collaboration` only after a private enquiry exists.

Expected observation:

- the collaboration request is manual;
- it does not allocate capacity;
- it does not award regulated work;
- it should still require separate responsibility and approval controls downstream.

### Step 8 - Record Renewal Review

Use `Record Renewal Review` to record validity, expiry, renewal required, or suspension-publication risk.

Expected observation:

- renewal review updates governance readiness;
- renewal review does not approve regulated deliverables;
- renewal risk appears in readiness/pending actions.

### Step 9 - Check forbidden boundary reminders

Find `Forbidden boundary reminders`.

Expected observation:

- No public marketplace;
- No live matching;
- No ranking;
- No capacity allocation;
- No VF-24 publication;
- No pricing intelligence;
- No autonomous award;
- No autonomous regulated approval.

### Step 10 - Confirm audit/evidence posture

Inspect audit records or the readiness summary.

Expected observation:

- material directory actions are attributable;
- evidence summaries are visible;
- private chain-of-thought is not exposed;
- tenant confidentiality is preserved.

## 4. Troubleshooting

If the page is blank:

1. Run `npm run check:me:s5`.
2. Check the browser console for renderer errors.
3. Confirm `renderNetworkModule`, `safeRenderModule`, and `renderFailureCard` exist.
4. Confirm API is reachable.

If the readiness summary is empty:

1. Run `npm run check:me:s6`.
2. Confirm private directory records exist.
3. Confirm the operator has tenant/firm scope.

If a form is disabled:

1. Read the disabled-state message.
2. Create the missing prerequisite record.
3. Do not bypass the form by creating unauthorized public marketplace behavior.

## 5. Operator rule of thumb

If an action would decide who wins work, rank firms, publish marketplace intelligence, allocate capacity, move money, or approve regulated work, stop. That is outside PD-H1.