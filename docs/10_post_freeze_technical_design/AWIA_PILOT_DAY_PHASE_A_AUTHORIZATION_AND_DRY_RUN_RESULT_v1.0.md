---
id: AWIA-PILOT-DAY-PHASE-A-AUTHORIZATION-AND-DRY-RUN-RESULT
title: "AWIA Pilot-Day Phase A Authorization and Live Session Result"
version: "1.1"
status: "Authorized - Live Session Run - GO_FOR_AWIA_CONTROLLED_LOCAL_PILOT_ACCEPTANCE_LOCK with one carried finding"
date: "2026-09-05"
classification: "explicit user-approved scope expansion"
---

# AWIA Pilot-Day Phase A Authorization and Live Session Result v1.1

## 1. Authorization

Phase A of `VFIRM_AWIA_HIRE_A_VIRTUAL_WORKER_UNIFIED_SPRINT_PLAN_AND_CHECKLIST_v1.0.md` was authorized by the product owner on 2026-09-05 ("Proceed Phase A ... Bismillah"). This authorizes running the existing `AWIA_PILOT_DAY_CLIENT_WALKTHROUGH_AND_OPERATOR_SCRIPT_v1.0.md` with a real client.

## 2. What was done before the live session

A technical dry-run of the AWIA regression suite was run first (11 of 13 checks passed clean; the two exceptions were environment/stale-test artifacts, not functional breaks — see v1.0 of this document for detail, superseded here by an actual live run).

## 3. Live session actually run (this is not a rehearsal)

The 16-step operator script was run against a real workspace (Amanah Formwork Pilot Firm / Formwork Pilot Tenant) with real client, intake, proposal, approval, project, and task records created live through the UI (client "New Contractor Sdn Bhd", project "Basement Wall Formwork Package", task `formwork_intake_summary`).

Three real defects were found and fixed live, in-session, before the walkthrough could complete (see `apps/web/public/app.js` and `apps/api/src/store.mjs`, commit `6909dd8`):

1. AFCC panel click/submit handlers were rebuilt-and-lost on every app refresh (any UI action anywhere in the app), so "Assign to Workdesk" silently fell through to native form submission. Fixed with event delegation on the stable `#aiWorkforceView` container.
2. The Postgres backend's save path stripped all 13 `awia_*` collections before every save (on the incorrect assumption they had real relational tables — they don't yet; that is exactly TD-009). Every AWIA provision/lifecycle/assign write looked successful but vanished on the next read. Stopped stripping them.
3. The Assign Work form defaulted "tool" to a CFO-only action regardless of which staff member was selected, and never collected an evidence reference — so any real assignment was always denied (`EVIDENCE_REQUIRED`, usually also `ACTION_NOT_ALLOWED_FOR_ROLE`). Added a role-filtered tool selector and a required evidence-reference field. A fourth, related defect was found and fixed the same way: "Prepare Client Draft" sent `output_review_id` when the backend requires `output_draft_id` (the server derives the review itself).

After these fixes, steps 7-13 of the operator script were completed live, through the real UI, with no manual workarounds:

- Activated CFO-001 and OPO-001 (lifecycle DRAFT to ACTIVE), persisted and confirmed across reload.
- Assigned the formwork intake-summary task to OPO-001 (`workload.summary.prepare`, evidence ref `pilot-day-intake-summary-evidence-001`) — workdesk item created, task moved to `ASSIGNED_TO_AWIA_STAFF`.
- Produced a draft-only output for that workdesk item.
- Recorded a human review (`APPROVED_FOR_CLIENT_DRAFT`).
- Prepared a client delivery draft from the reviewed output (`final_issue_allowed: false`, `requires_human_issue_approval: true`).
- Repeated the full Assign to Workdesk to Prepare Client Draft cycle a second time with CFO-001 (`finance.governance.review`) purely by clicking the fixed UI buttons, to confirm the fixes work standalone rather than only through the manual API calls used to first diagnose them.

End-of-session AI Workforce panel state: 8 virtual staff (2 active), 5 workdesk items, 2 staff output drafts, 2 client delivery drafts, 0 items in the human approval queue, "Final Issue: Still blocked" visible throughout.

## 4. Carried finding: AWIA audit/event trail is not persisted on the Postgres backend

While gathering evidence for step 15 (show evidence/audit records), `/api/audit-events` and `/api/event-log` for this firm showed only the pre-existing front-desk/commercial records (client, intake, proposal, approval, project) from earlier in the session — zero entries for any of today's AWIA actions, despite every AWIA store function correctly calling `appendEventAndAudit`.

Root cause (traced, not yet fixed): `upsertAuditEvent` and `upsertEventLog` (`apps/api/src/store.mjs`) both silently `return` (no-op, no error) when `resource_id` / `aggregate_id` fails `uuidOrNull(...)`. Every AWIA aggregate id (`awia_workdesk_...`, `awia_output_draft_...`, `agent-<firm>-cfo-001`, etc.) is a prefixed string, not a bare UUID, because AWIA record id generation is not yet backend-aware the way the rest of the platform's ids are (`storeBackend === "postgres" ? newUuid() : newId(...)`). This is the same gap named in `TECHNICAL_DEBT_REGISTER_v1.0.md` TD-009 ("AWIA has no Postgres schema or backend-aware id generation yet") and in this sprint plan's Phase B checklist ("wire backend-aware id generation into every AWIA store function") — not a new, separate defect.

This was deliberately **not** fixed in this session: closing it properly means id-generation work across every AWIA store function, which is explicitly Phase B scope, not a pilot-day blocker fix. The AWIA governance records themselves (provisioning runs, lifecycle events, workdesk items, output drafts, reviews, client delivery drafts) are all real, persisted, and cross-referenced by id and timestamp — so the substance of "what happened and who approved it" is fully inspectable via the AWIA collections directly. What is missing is only the generic cross-cutting `audit_events` / `event_log` view of those same actions.

## 5. Client Experience Checklist — result

Of the 8 items, all that depend on data actually existing were confirmed observed in this session: named staff with role/grade/salary/package/lifecycle/tools/authority visible, workdesk assignment visible, draft-only output, human review recorded before the client draft existed, and final issue still human-controlled (`final_issue_allowed: false` on every client delivery draft). Payment release denial and "no autonomous regulated approval" were not separately exercised this session (no payment or regulated-approval action was attempted) — carry forward to the OP-H1-H6 (Phase C) or Release 4 (Phase D) rehearsals, which do exercise those paths.

## 6. Result recording

- Session result: **GO_FOR_AWIA_CONTROLLED_LOCAL_PILOT_ACCEPTANCE_LOCK**, with the audit/event-trail gap in section 4 carried forward into Phase B rather than blocking Phase A acceptance.
- Follow-ups: (1) Phase B must include backend-aware id generation for AWIA aggregates, not just the Postgres schema/tables, or the audit trail gap in section 4 persists even after the schema exists. (2) Payment-release and regulated-approval denial paths still need a live exercise, deferred to Phase C/D.

## 7. Next step

Phase A is complete. Phase B (close TD-009: AWIA Postgres schema *and* the backend-aware id generation needed for both the schema and the audit trail) is next in the unified plan and still needs its own "Proceed Phase B ... Bismillah".
