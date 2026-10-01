# vFirm Web Console (new front end, additive)

This is a **new, separate** front end for the Owner workspace and Admin
console — the redesigned categorized-sidebar / tabbed-page UI validated in
the "Firm Console" prototype. It does **not** touch `apps/web/public/app.js`
(the existing ~365KB hand-rolled shell) or any frozen baseline document.
Nothing about the existing `apps/web` app changes: it keeps running exactly
as it does today, on its own port, and this console is a second, independent
static site talking to the same API.

## Why a new folder instead of editing app.js

Per the redesign conversation: the existing `app.js` is a single large file
mixing routing, rendering and API calls for ~26 views. Editing it in place
risked breaking the accepted Release 1 / controlled-pilot build. This app is
built from scratch, split into small modules, and can be run side by side
with the existing shell during evaluation. Nothing here is wired into
`npm run check` or the smoke-test suite, so it cannot regress an accepted
release gate.

## Structure

```
apps/web-console/
  src/server.mjs        static file server + /api proxy (same pattern as apps/web/src/server.mjs)
  public/index.html     shell skeleton (sidebar mount + topbar + page mount)
  public/styles.css     design tokens + components (light/dark aware)
  public/js/api.js       fetch helpers, GET /mvp/store, GET /workspace/active-summary, GET /auth/context
  public/js/ui.js        pill/status/table/tab-bar render helpers, generic object-to-rows inspector
  public/js/nav.js       categorized sidebar config (Owner + Admin) and navigation state
  public/js/pages-owner.js   Dashboard / My Team / Workdesk / Clients & Sales / Projects / Finance / Firm Settings
  public/js/pages-admin.js   Firms & Tenants / Users & Access / Ops Console / Technical Delivery /
                              Audit & Compliance / Sales & Accounts / Service Packs & Billing / Growth /
                              Engineering Console
  public/js/main.js      boot sequence, router, event wiring
```

## Run it

```powershell
node apps/web-console/src/server.mjs
```

Defaults to `http://127.0.0.1:3092` (the API stays on `3091`, the existing
web shell on `3090` — this follows the repo's `309#` port convention). Set
`VFIRM_WEB_CONSOLE_PORT` to change it, and `VFIRM_API_BASE` if the API isn't
on the default address. The API must already be running
(`npm run dev:api` or `npm run dev`).

No `package.json` script was added for this — I didn't want to hand-edit a
20KB+ generated `package.json` blind without having read it in full. If you
want `npm run dev:web-console`, add:

```json
"dev:web-console": "node apps/web-console/src/server.mjs"
```

## Identity / tenant scoping

Several GET endpoints (`/workspace/active-summary`, `/accounts/cash-snapshot`,
`/ops/operator-metrics`, `/commercial-launch/summary`,
`/tenant-usage/summary`, `/pilot/expansion-summary`,
`/stakeholder-review/summary`, `/support/summary`,
`/awia/virtual-staff/department-dashboard`,
`/awia/virtual-staff/payroll-summary`, `/operations/today`) call
`requireFields({tenant_id, firm_id})` server-side and 400 without them —
this was caught from the browser console after wiring up navigation. Fixed
by replicating `apps/web/public/app.js`'s own identity resolution
(`activeFirmInStore()` / `activeTenantInStore()` / `latestPrincipalActor()`
/ `devAuthHeaders()`, all read directly from that file): `main.js` fetches
`GET /mvp/store` once at boot, `api.js`'s `resolveIdentityFromStore()` picks
the active firm/tenant/actor the same way the old app does, and every
subsequent request attaches `?tenant_id=&firm_id=` where required plus
`x-vfirm-actor-id` / `x-vfirm-tenant-id` / `x-vfirm-firm-id` / `x-vfirm-role`
headers (the same dev-header auth scheme `devActorFromHeaders()` reads
server-side). If a page still 400s after this, it's most likely a stale
page — this app is a single-page load, so a browser tab left open across a
file update is still running the old `main.js`; hard-refresh
(Ctrl+Shift+R / Cmd+Shift+R) and retry before assuming the identity logic
is wrong. To actually inspect what got resolved, open devtools and run
`__vfirm.getIdentity()` (not `api.getIdentity()` — `api` is a module-scoped
import, not a global; `main.js` exposes `window.__vfirm = { api,
getIdentity }` for exactly this).

## What's real vs. what still needs field-shape verification

I read the real API route table (`apps/api/src/server.mjs`) directly, so
every endpoint this app calls **exists** — nothing here is invented. Two
modules I could verify end-to-end because I read their exact original
rendering logic in `app.js`:

**Fully wired, bespoke layout, verified field names:**
- **My Team** — reads `awia_virtual_staff_members` / `awia_staff_role_assignments`
  from `GET /mvp/store`; hire/pause/activate call
  `POST /awia/virtual-staff/hire-worker` and
  `POST /awia/virtual-staff/lifecycle`.
- **Workdesk** — reads `tasks` / `awia_staff_workdesk_items` /
  `awia_staff_output_drafts` / `awia_client_delivery_drafts` from the same
  store; the five tabs (Inbox → Archived) call
  `POST /awia/virtual-staff/assign-task`, `output-draft`, `output-review`,
  `client-delivery-draft`, `client-delivery-draft/mark-sent` and
  `workdesk-item/archive` — all confirmed real routes.

**Wired to real endpoints, generic layout (a live key/value inspector,
not a guess at field names):**
Dashboard, Clients & Sales, Projects, Finance, Firm Settings, and every
Admin console page. These call real GET endpoints
(`/dashboard/summary`, `/workspace/active-summary`, `/ops/readiness`,
`/operations/today`, `/ops/operator-metrics`, `/accounts/cash-snapshot`,
`/commercial-launch/summary`, `/pilot/expansion-summary`,
`/stakeholder-review/summary`, `/support/summary`, `/tenant-usage/summary`,
`/service-packs/formwork`, `/awia/virtual-staff/templates`,
`/awia/virtual-staff/department-dashboard`,
`/awia/virtual-staff/payroll-summary`) and render whatever JSON comes back
as labeled rows, rather than hard-coding field names I never confirmed
against a running server. Once you run this against your API, tell me
which fields matter on each page and I'll swap in the same polished,
table/list layout the prototype used for My Team and Workdesk.

**Engineering Console → AI Workforce (raw)** intentionally keeps the
low-level, unstyled diagnostic buttons from the old AI Workforce panel
(`provision-pilot`, `task-readiness`, `output-draft`, `output-review`) —
this is the same escape hatch the original app exposed, now clearly
separated from the governed Owner-facing flow instead of living on the
Owner's flat nav.

**The `actor` object** every POST needs: I read `actorFromBody()` directly —
it falls back to `devActorFromHeaders()` (the same headers every request
already sends, see "Identity / tenant scoping" above) when a request body
has no `actor` field, so this app doesn't need to send one explicitly.
`fallbackActor()` in `api.js` is kept as an opt-in for any caller that wants
to pass `actor` in the body anyway.

## Workdesk is actionable, with real files (ADR-089 W1, 2026-09-30)

The Workdesk now drives the whole governed loop from this console (previously read-only here):

- **Inbox** -- open tasks nobody has been given yet. *Assign…* opens an inline form: worker,
  what they should do (per-role list mirroring the server's authority-gate tool policy), written
  instructions, **input files** (uploaded to firm storage, attached as `file:<id>` evidence refs),
  file sensitivity, optional free-text reference. At least one file or reference is required
  (the authority gate refuses work with no evidence).
- **Pending** -- *Get their draft*, or *Attach output file…* for work the worker cannot produce
  automatically yet (decision D4: owner-completable). Items the owner sent back show as `REWORK`
  with the revision note.
- **Approval** -- inputs and output side by side; *Approve* / *Request revision* (note required) /
  *Reject*; *Grant Class A approval* first where the skill requires it; rejected items can be
  dismissed to the archive.
- **Outbox** -- *Prepare for client* (the approved output file carries into the delivery draft)
  and *Mark sent* (owner record-keeping only; vFirm never transmits to the client).
- **Archived** -- delivered or dismissed.

Every file chip downloads through `GET /api/files/<id>/download` with the signed-in identity
(fetch -> Blob, since anonymous downloads are refused). Uploads go to `POST /api/files/upload`
as the raw file body. Server side: `apps/api/src/file-storage.mjs`, `file_objects` collection
(migration `0048_work_intake_file_objects.sql`), smoke test `npm run check:w1:file-storage-and-rework`.

## "+ New request" and work requests (ADR-090 W2, 2026-10-01)

- **+ New request** (topbar, every Owner page) opens a drawer: *what do you need* (15 plain-English
  request types grouped by position, Class A flagged), *the brief* (title, instructions, input
  files, sensitivity, reference), *for whom* (the firm's own internal work, or one of a client's
  projects), priority and due date, and *who does it* (leave it in the Inbox, or assign now to an
  eligible active worker).
- **Workdesk Inbox** lists submitted requests by priority with the Clerk's (ARO-01, deterministic)
  suggestion, *Assign* (eligible workers only), *Add files* and *Cancel*. Project tasks from
  accepted proposals still appear below.
- **Internal work** (no client) is approved like any other work and then *Mark complete* in the
  Outbox -- it can never be prepared for a client.
- API: `POST /work-requests`, `/work-requests/assign`, `/work-requests/cancel`,
  `/work-requests/add-files`, `GET /work-requests/request-types`,
  `POST /awia/virtual-staff/workdesk-item/complete-internal`. Smoke test: `npm run check:w2:work-requests`.

## Workers run their skill on your files (ADR-092 W3, 2026-10-01)

- Five request types are **runnable**: *Sort out an admin request* (ARO-01), *Reconcile bank vs
  books* (FAO-11), *Qualify and score a lead* (SAO-03), *Plan who does what* (OPO-09) and
  *Prepare a new-hire onboarding* (ARO-10, Class A). The New Request drawer shows their fields and
  labelled file slots (e.g. bank statement + book entries, CSV or Excel .xlsx).
- In **Pending**, press the worker's button (e.g. *Reconcile*). The worker reads the files, runs
  its deterministic skill and hands you a draft plus a downloadable CSV. If something is missing the
  row says **Needs input** (what to add); fix it with *Edit inputs* or *Add files* (pick which
  file it is -- a new file replaces the old one in that slot) and press the button again.
- **Approval** shows how each draft was made ("Worked out by FAO-11 from ..."). Review, Class A
  approval and the draft-only rule are unchanged. Other request types: attach the finished file.
- API: `POST /awia/virtual-staff/workdesk-item/run-skill`, `POST /work-requests/update-inputs`;
  `form_inputs` / `file_roles` on `POST /work-requests`, `file_role` on `/work-requests/add-files`.
  Smoke test: `npm run check:w3:skill-runner`.

## Conversations, filing, Documents and shortcuts (ADR-093 W4, 2026-10-01)

- **Questions from your team** (Workdesk Inbox): when a worker can't run because something is
  missing, the item moves to the Inbox with what they need. Reply on its **Conversation** (attach
  files there too), *Edit inputs* or *Add files* -- the work goes back to the worker -- then
  *Try again*. Every request's item keeps a conversation: hand-over, questions, your notes and
  files, drafts and review decisions, and where it was filed.
- **Filing**: marking client work sent, or internal work complete, files the approved output in
  **Documents** as `WR-xxxx-OUT` (linked to the client project when there is one).
- **Documents** (Firm > Documents): search and filter the register, download any revision, add a
  new revision, or *Add a document* yourself (numbered DOC-0001...).
- **Shortcuts**: *Give work* on each active worker in My Team, a *What your team can do* panel,
  *Request work* on each project, and the Dashboard's **Needs you** tray.
- API: `POST /awia/virtual-staff/workdesk-item/message`, `POST /documents`, `POST /documents/revise`;
  workdesk status `NEEDS_INFO`. Smoke test: `npm run check:w4:collaboration-and-filing`.
