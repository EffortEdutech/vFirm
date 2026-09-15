# vFirm — Admin Console / Owner Workspace Split — Sprint Plan and Checklist v1.0

Status: Phase 1 Accepted (ADR-080) — Phase 2 pending
Depends on: ADR-077, ADR-078, ADR-079 (My Team / Work / Approvals)
Related: `VFIRM_AWIA_HIRE_A_VIRTUAL_WORKER_UNIFIED_SPRINT_PLAN_AND_CHECKLIST_v1.0.md` (Phase E status update names this line of work as next roadmap work, scope confirmed separately per this document)

## 0. Why this exists

The current web app (`apps/web/public/`) has one 27-item nav mixing two audiences: platform operators/engineers (Ops, Audit, Service Pack, Pilot, Network, Review Board, Expansion, Usage/Billing, Commercial Launch, Administration, Sales & Accounts, Technical Delivery, the legacy "AI Workforce" panel) and business owners running their firm day-to-day (My Team, Work, Approvals, My Firm, Clients, Front Desk, Intake, Proposals, Projects, Invoices). The product owner's direction: split this into two distinct surfaces, and rebuild the business-owner's task-handling screens (Work + Approvals) around a simpler, physical-office-inspired mental model — Inbox, Pending, Outbox, Approval, Archived — rather than the current ad-hoc split.

## 1. Terminology (locked)

"Client" is already a taken term in this codebase — it means the business owner's own customer (`firm_client_relationships`, e.g. "Demo Contractor Sdn Bhd"). To avoid collision:

- **Admin console** — the platform operator/engineering surface (what was informally "for development/admin after deployment" in the product owner's request).
- **Owner workspace** — the business-owner-facing surface (what was informally "for client" in the product owner's request — meaning the business owner who hired virtual workers, not their own clients).

## 2. Scope decisions (confirmed by product owner in discussion)

1. **One codebase, role-gated views** — not two separately deployed apps. Same `apps/web` build; the nav rendered differs by which workspace is active.
2. **Office metaphor is organizational/naming only** — Inbox/Pending/Outbox/Approval/Archived as labeled views and a Team roster list. No illustrated desks/avatars/floor-plan graphics. Ships faster, stays "simple but complete" rather than decorative.
3. **Inbox/Pending/Outbox/Approval/Archived replaces Work + Approvals** — not an additional layer on top. My Team (hiring + roster) stays a separate screen since hiring is a distinct action from working a queue.
4. **"Archived" requires new backend state** — confirmed by reading `apps/api/src/store.mjs`: today there is no terminal "sent to client" or "closed out" status anywhere in the AWIA output-draft / client-delivery-draft lifecycle. `awia_client_delivery_drafts` has exactly one status (`CLIENT_DELIVERY_DRAFT_PREPARED`) and no endpoint ever moves it further — this is consistent with `final_issue_allowed: false` always and Phase E (payment/final issue) being deferred per ADR-073. Two backend additions are needed (detailed in section 4).
5. **Nav switch is a dev-mode toggle, not real access control** — there is no login/auth system yet. A `firm_memberships.role` field and an `x-vfirm-role` request header already exist and default to `"principal"`, with other role strings (`ADMIN`, `PILOT_OPERATOR`, etc.) used elsewhere in the data model, but the web app does not currently read or enforce any of this — it always renders full visibility (`development_mode_full_feature_visibility`, confirmed in `smoke-web-multitenant-workspace.mjs`). This sprint builds a clearly-labeled workspace switch (e.g. a topbar control: "Admin console" / "Owner workspace") that changes which nav renders, using the existing role field as a sensible default only. It explicitly does **not** restrict API access — that is flagged as a separate future sprint (real authentication/authorization), so nothing here is allowed to look or be described as a security boundary that isn't one.
6. **AI Workforce panel stays in Admin console** as a technical debugging tool (its hardcoded `AWIA_STAFF_ROLE_CODE` role map gap, noted in ADR-077, remains a known limitation of that debugging tool specifically, not something this sprint fixes).

## 3. Screen inventory: which workspace each view belongs to

**Admin console** (unchanged screens, just regrouped under a different nav):
Ops, Audit, Service Pack, Pilot, Network, Review Board, Expansion, Usage/Billing, Commercial Launch, Administration, Sales & Accounts, Technical Delivery, AI Workforce, and the old raw `store.approvals` audit table (currently unwired from any nav per ADR-079 — re-wired here into Admin instead of staying orphaned).

**Owner workspace** (business-facing screens):
Dashboard, My Firm, My Team, Workdesk (new — replaces Work + Approvals, see section 4), Clients, Front Desk, Intake, Proposals, Projects, Invoices.

## 4. Workdesk: the Inbox/Pending/Approval/Outbox/Archived model

Replaces today's separate Work and Approvals screens with one frame, five tabs, mapped onto real data (no new concepts invented beyond what section 4.1 adds):

| Tab | Meaning | Data source (today) |
|---|---|---|
| Inbox | Real tasks from the intake→proposal→accept pipeline not yet assigned to a worker | `tasks` not referenced by any `awia_staff_workdesk_items` |
| Pending | Assigned to a worker, work in progress | `awia_staff_workdesk_items.workdesk_status` in (`ASSIGNED`, `OUTPUT_DRAFTED` while `awia_staff_output_drafts.status` is not yet `DRAFT_REVIEW_REQUIRED`... in practice: `ASSIGNED`) |
| Approval | Draft output waiting on the owner's decision | `awia_staff_output_drafts.status === "DRAFT_REVIEW_REQUIRED"` (today's Approvals "Needs Your Review") |
| Outbox | Approved, prepared, waiting to actually reach the client | `awia_client_delivery_drafts.status === "CLIENT_DELIVERY_DRAFT_PREPARED"` (today's Approvals "Ready to Send") |
| Archived | Closed out — either delivered (owner confirmed) or ended without delivery | New states, see 4.1 |

### 4.1 Required backend additions

Two small, clearly-bounded additions to `apps/api/src/store.mjs` / `apps/api/src/server.mjs`:

**a) Owner-confirmed delivery record (Outbox → Archived)**
A new endpoint, e.g. `POST /awia/virtual-staff/client-delivery-draft/mark-sent`, moving `awia_client_delivery_drafts.status` from `CLIENT_DELIVERY_DRAFT_PREPARED` to a new `OWNER_MARKED_SENT` state, stamped with `marked_sent_by_actor_id` and `marked_sent_at`. This is explicitly **not** a client transmission, payment, or final-issue action — it is the owner telling the system "I delivered this myself (email/call/portal outside vFirm)". Boundary tag: `"owner_recordkeeping_only_not_a_client_transmission_or_final_issue"`. `final_issue_allowed` stays `false` always, unchanged from ADR-078/079. This does not touch Phase E (deferred payment/final-issue authority) — it only lets the owner's own tracking move a card to Archived.

**b) Terminal-negative archive (dead-end items → Archived)**
Today, `REJECTED` output drafts and workdesk items stuck at `REVIEW_ACTION_REQUIRED` (the known re-draft gap from ADR-078 — no endpoint currently lets a worker redraft after revision) have no resting state; they'd otherwise clutter Pending/Approval forever. Add an `archived_at` / `archived_by_actor_id` pair to `awia_staff_workdesk_items`, settable via a new endpoint, e.g. `POST /awia/virtual-staff/workdesk-item/archive`, usable only when `workdesk_status` is `REJECTED`-equivalent or the owner explicitly dismisses a stuck revision item. This does not solve the re-draft gap (still a separate future backend item) — it only stops dead items from staying visible as if they were actionable.

Both additions get their own end-to-end smoke test in the style of `scripts/smoke-awia-work-assignment.mjs`, not just UI marker checks — this is the same discipline that caught the real `evidence_refs` bug in ADR-078 and the real nav id collision in ADR-079.

## 5. Phases

**Phase 1 — Backend: Archived state**
- Add `OWNER_MARKED_SENT` status + `mark-sent` endpoint for `awia_client_delivery_drafts`.
- Add `archived_at`/`archived_by_actor_id` + `archive` endpoint for `awia_staff_workdesk_items`.
- New smoke test proving both transitions end-to-end against a live API server (not just marker checks).
- Update `docs/00_project_control/DECISION_REGISTER.md` with an ADR once built and verified.

**Phase 2 — Frontend: workspace switch**
- Add a clearly-labeled Admin console / Owner workspace toggle to the topbar (not a login — explicitly documented as UI-only, per section 2.5).
- Regroup existing nav buttons/sections into the two lists from section 3, rendered conditionally based on the toggle.
- Update `scripts/smoke-web-navigation-renderers.mjs` with markers proving both nav sets render correctly and no view is orphaned or duplicated (same discipline as ADR-079's duplicate-id catch).

**Phase 3 — Frontend: Workdesk screen**
- Retire the current Work and Approvals screens (`renderWorkModule`, `renderApprovalsModule`) in favor of one `renderWorkdeskModule` with five tabs per section 4's table.
- Reuse the existing endpoints for Inbox/Pending/Approval (assign-task, output-draft, output-review — all already proven by `smoke-awia-work-assignment.mjs`) plus the two new Phase 1 endpoints for Outbox → Archived.
- New or extended smoke test covering the full Inbox → Pending → Approval → Outbox → Archived path end-to-end.

**Phase 4 — Verification and documentation**
- Full `npm run check:web`, `check:web-api`, `check:web:navigation`, `check:web:multitenant`, plus the new smoke tests, run and confirmed (product owner in PowerShell, per the current device-shell-bridge limitation).
- ADR(s) written for the accepted decisions (workspace split, Workdesk restructuring, Archived state additions).
- This document's status updated from DRAFT to Accepted.

## 6. Explicit non-goals (to prevent scope creep)

- No real authentication/authorization in this sprint (flagged as a future sprint item).
- No real client transmission, email delivery, or payment capture — Phase E (deferred per ADR-073) is untouched.
- No fix for the ADR-078 re-draft-after-revision gap — Archived only stops dead items from looking actionable, it doesn't add the missing redraft capability.
- No illustrated/graphical office metaphor — naming and organization only, per section 2.2.
- AI Workforce panel's hardcoded staff-role-map limitation is not fixed — it stays a known-limited debugging tool in Admin console.

## 7. Checklist

- [x] Phase 1: `OWNER_MARKED_SENT` status + `mark-sent` endpoint implemented and tested
- [x] Phase 1: `archived_at`/`archive` endpoint for workdesk items implemented and tested
- [x] Phase 1: new backend smoke test passing, ADR drafted (ADR-080; `npm run check:awia:workdesk-archive`)
- [ ] Phase 2: Admin console / Owner workspace toggle built (UI-only, clearly labeled)
- [ ] Phase 2: nav regrouped per section 3, navigation smoke test updated and passing
- [ ] Phase 3: Workdesk screen (5 tabs) built, Work/Approvals screens retired
- [ ] Phase 3: end-to-end Workdesk smoke test passing
- [ ] Phase 4: all `check:web*` smoke tests re-confirmed passing
- [ ] Phase 4: ADR(s) written, this document marked Accepted
