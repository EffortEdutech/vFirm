# vFirm — Firm Operating Workflow Upgrade Proposal

**Date:** 2026-09-30
**Scope:** How a firm owner gets work *into* the firm (instructions + files), how virtual staff act on it, and how results come back out.
**Classification (per CLAUDE.md):** Release 2 candidate / explicit user-approved scope expansion. No frozen baseline document is reopened.
**Basis:** Read directly from `apps/api/src/server.mjs`, `store.mjs`, `apps/web-console/public/js/*`, `apps/web/public/app.js`, `packages/core-domain/src/awia-*`. Every gap below cites the code that proves it.

---

## 1. The problem in one line

- The platform has a strong **governed back half** (authority gate → draft → human review → Class A approval → client delivery draft → archive), but **no front door**: nothing lets the owner hand the firm a piece of work with files, and nothing makes a worker actually read those inputs.

---

## 2. What the code shows today (gap diagnosis)

### G1 — No way for the owner to "give work"
- Workdesk items are only created by `POST /awia/virtual-staff/assign-task`, which **requires an existing `task_id`** (`store.mjs` `assignAwiaVirtualStaffTaskRecord`).
- Tasks are only created in one place: `openProjectDeliveryRecord` → one task per project, after a proposal is **accepted**.
- Result: to give a worker anything, the owner must run enquiry → intake → proposal → accept → project first — and still gets only one task per project.
- `assign-task` also **requires `client_id`** (`server.mjs` `requireFields`), so internal firm work (payroll prep, a reconciliation, onboarding a hire) is impossible.

### G2 — Inbox tab is structurally always empty
- Workdesk items are born with `workdesk_status: "ASSIGNED"` → bucket `pending` (`computeWorkdeskItemStatus`).
- There is no "received but not yet assigned" state, so nothing can ever land in Inbox.

### G3 — No file handling anywhere
- `readJson()` is the only body parser — JSON only, no multipart, no binary storage, no download route.
- Document register (`POST /administration/documents`) takes `storage_ref` and `content_hash` as **plain strings**; `app.js` fakes the hash as `manual:<doc>:<rev>`.
- `evidence_refs` on assign-task is a **free-text string** the owner types.

### G4 — Workers don't actually process inputs
- `POST /awia/virtual-staff/output-draft` just stores whatever `output_payload` the **caller** sends; with none, it saves a placeholder (`"<staff_code> draft output"`, `output_ref: awia://draft-output/<id>`).
- The five real skill modules (ARO-01 triage, FAO-11 reconciliation, SAO-03 lead scoring, OPO-09 capacity assignment, ARO-10 onboarding) are **not imported by the API at all** — only smoke scripts compute payloads and post them.
- So the "Get their draft" button produces an empty draft in real use.

### G5 — web-console Workdesk is read-only
- `pages-owner.js` `mountWorkdesk` renders tabs and a table only — **no buttons**.
- `api.assignTask`, `produceOutputDraft`, `reviewOutputDraft`, `prepareClientDeliveryDraft`, `markClientDeliverySent`, `archiveWorkdeskItem` are defined in `api.js` and **never called**.
- Note: the architecture review's Slice 6c parity table marks Workdesk as "Parity" — that holds for reading only; only `app.js` can drive the loop today.

### G6 — Revision is a dead end
- Review decision `REVISION_REQUIRED` sets the item to `REVIEW_ACTION_REQUIRED`.
- Output drafts can only be produced from `ASSIGNED` → the worker can never redo the work. The only exit is archive.

### G7 — No channel between owner and worker
- `conversation/open`, `conversation/message`, `memory/append` exist server-side (threads can already link to `workdesk_item_id` since migration 0033) but have **no UI** in either front end.
- A worker can't ask "which bank statement month?", and the owner can't add a missing file mid-task.

### G8 — Outputs have no real artifact
- No generated file, no download, no automatic registration of the output in the document register. "Mark sent" is a manual flag.

---

## 3. Target workflow — "Brief → Route → Work → Review → Deliver → File"

```
 Owner                      Firm (governed)                           Owner / Client
 ─────                      ───────────────                           ──────────────
 [+ New Request] ──► Work Request (UNASSIGNED) ──► INBOX
   instructions          │  optional ARO-01 triage suggests
   files                 │  category / queue / worker
   client/project?       ▼
   due / priority    Assign (owner confirms) ──► Task + Workdesk item ──► PENDING
                         │  existing authority gate (skill-in-position,
                         │  Class A flag, lifecycle, SOD)
                         ▼
                     Skill Runner reads inputs + files
                         │   ├─ needs info? ──► NEEDS INFO (thread) ──► owner replies/uploads ─┐
                         │   ◄─────────────────────────────────────────────────────────────────┘
                         ▼
                     Output draft + generated file ──► APPROVAL
                         │  Class A? → owner Class-A approval first
                         ▼
                     Review: approve / revise (→ rework, back to PENDING) / reject
                         ▼
                     Client delivery draft + attachment ──► OUTBOX ──► download / mark sent
                         ▼
                     Auto-register output in Documents (real hash) ──► ARCHIVED
```

- Owner's mental model: **"Send a request to my team, answer their questions, approve what comes back."**
- Nothing in the governed back half changes — the upgrade feeds it real inputs and gives it real outputs.

---

## 4. Backend upgrades (API + store)

### B1 — File storage service *(foundation)*
- New collection `file_objects`: `id, tenant_id, firm_id, filename, mime_type, size_bytes, sha256, storage_key, classification, uploaded_by_actor_id, linked_to {type,id}, scan_status, created_at`.
- `POST /files/upload-url` → returns a signed upload URL (Supabase Storage bucket, path `tenant/<tenant_id>/firm/<firm_id>/<file_id>`); `POST /files/complete` → server verifies object, computes SHA-256, writes `file_objects` + audit event.
- `GET /files/:id/download` → scope-checked, short-lived signed URL; every download audited.
- Local-dev fallback: disk under `data/files/` with the same record shape.
- Guardrails: MIME/extension allowlist (pdf, docx, xlsx, csv, png, jpg), size cap, tenant-prefixed keys only, `scan_status` field ready for AV scanning later.
- Wire document register to it: `storage_ref = file_id`, `content_hash = sha256` (no more `manual:` hashes).
- Include `file_objects` + binaries in the tenant export package (AGENTS principle 13, data portability).

### B2 — Work Request entity *(the front door)*
- New collection `work_requests`: `id, tenant_id, firm_id, title, instructions, request_type (skill_id), position_id?, requested_staff_code?, client_id?, project_id?, priority, due_at, form_inputs {}, file_ids [], status, triage_suggestion {}, workdesk_item_id?, created_by_actor_id, timestamps`.
- Statuses: `SUBMITTED → TRIAGED → ASSIGNED → CANCELLED`.
- Routes: `POST /work-requests`, `/work-requests/triage`, `/work-requests/assign`, `/work-requests/cancel`, `/work-requests/add-files`.
- `assign` does, in one transaction: create an **ad-hoc task** (`project_id` nullable, `task_type` from skill) → call existing `assignAwiaVirtualStaffTaskRecord` with `skill_id` and `evidence_refs = file_ids` → link back. The existing authority gate runs unchanged.
- Relax `client_id` on assign-task to optional when `risk_class` is `INTERNAL` (needs a matching check in the authority gate — verify before building).

### B3 — Workdesk states for the missing edges
- Add `NEEDS_INFO` (worker waiting on owner) and `REWORK` (after `REVISION_REQUIRED`).
- `computeWorkdeskItemStatus`: Inbox = unassigned work requests + `NEEDS_INFO` items; Pending = `ASSIGNED` / `REWORK`.
- Allow `produceAwiaStaffOutputDraftRecord` from `ASSIGNED` **or** `REWORK`; keep prior drafts as version history (`supersedes_output_draft_id`). Fixes G6.

### B4 — Skill Runner *(workers actually do the work)*
- New module `packages/core-domain/src/awia-skill-runner.mjs`: registry `skill_id → { inputSchema, requiredFileTypes, run(inputs, files), validate(output), renderFile(output) }`.
- Register the 5 existing deterministic modules first (ARO-01, FAO-11, SAO-03, OPO-09, ARO-10).
- File parsers for inputs: CSV/XLSX → rows (e.g. FAO-11's `book_entries` / `bank_entries` from two uploaded statements).
- `output-draft`: when no `output_payload` is supplied, the runner executes the skill from the work request's `form_inputs` + files, validates, renders an output file (CSV/XLSX/PDF) via B1, and sets `output_ref = file_id`.
- Skills without a deterministic module return `SKILL_NOT_YET_EXECUTABLE` and the item stays owner-completable (owner can attach their own output) — no silent fake drafts.
- Boundaries preserved: draft-only, `final_issue_allowed: false`, no LLM → regulated final output (AGENTS principles 6 & 7).

### B5 — Per-skill input definitions
- Extend the position catalogue skills with `request_label` (plain-English, e.g. "Reconcile bank vs books"), `input_fields`, `required_files`, `output_kind`.
- This single source drives the New Request form (F1), validation (B2) and the runner (B4).

### B6 — Owner ↔ worker thread per item
- Auto-open a conversation thread on assign (`workdesk_item_id` link already supported).
- Runner can post a structured "needs info" message and set `NEEDS_INFO`; an owner reply or new file flips it back to `ASSIGNED`.

### B7 — Output filing
- On mark-sent / archive: register the output file in `document_register_entries` (with client/project links) so it shows in the Documents page and the evidence/export packs.

---

## 5. Frontend upgrades (apps/web-console)

### F1 — "+ New request" (global, top bar)
- Drawer, 4 steps: **Who** (worker or "let the Clerk route it") → **What** (skills of that position as plain-language request types, Class A badge where applicable) → **Details** (dynamic fields from B5 + drag-and-drop files with required-file checklist) → **Context** (client/project optional, due date, priority).
- Submit → lands in Inbox (or directly Pending if a worker was chosen and owner ticks "assign now").

### F2 — Workdesk becomes actionable (fixes G5)
- **Inbox:** triage suggestion chip, Assign / Reassign / Cancel; Needs-info items with reply box.
- **Pending:** Run now / progress, message worker, add files.
- **Approval:** side-by-side **Inputs (files + instructions) vs Output (payload preview + file)**; Approve / Request revision (notes) / Reject; Class-A approve button when pending.
- **Outbox:** Prepare client delivery (attach output file), Download, Mark sent.
- **Archived:** read-only with full history.
- **Item detail drawer:** timeline from audit events, files in/out, thread, draft versions.

### F3 — Documents page (new nav item, Firm or Delivery group)
- Document register with upload, revisions (real hashes), filters by client/project/request, download.

### F4 — Entry points where the owner already is
- My Team worker card: "Give work" (prefills worker) + "What can they do?" (skills and required inputs).
- Client / Project pages: "Request work for this client/project" (prefills context).

### F5 — Dashboard "Needs you" tray
- Counts + links: new in Inbox, Needs info, Awaiting approval, Class A pending, Ready to send.

---

## 6. Suggested phasing

| Phase | Delivers | Unblocks |
|---|---|---|
| **W1 — Foundations** | B1 file storage, B3 rework state, F2 Workdesk action buttons (wire the unused `api.js` methods) | Real files exist; web-console can drive the existing loop; revisions stop dead-ending |
| **W2 — Front door** | B2 Work Requests + ad-hoc tasks, B5 skill input definitions, F1 New Request drawer, Inbox | Owner can give any work with files, no proposal needed |
| **W3 — Real execution** | B4 Skill Runner for the 5 deterministic skills + CSV/XLSX parsers, output files | Workers actually process the inputs |
| **W4 — Collaboration & filing** | B6 threads/needs-info, B7 output filing, F3 Documents page, F4 entry points, F5 dashboard tray | Full day-to-day operating loop |
| **W5 — Later (separate authorization)** | Client portal / email-in intake (VF-08), LLM-assisted drafting for non-deterministic skills under governance | Clients submit directly; broader skill coverage |

- Each phase ends with a smoke script in the existing style (`smoke-*.mjs`) covering request → assign → run → review → deliver → file.

---

## 7. Decisions needed from you

- **D1 — File storage:** Supabase Storage (matches the HM-S3 Supabase Postgres pivot) with local-disk fallback for dev? *Recommended.*
- **D2 — Internal work:** allow requests with no client (relax `client_id` on assign for `INTERNAL` risk class)?
- **D3 — Routing default:** new requests always go to Inbox for the owner to assign, or allow "assign now" directly? *Recommend: both, owner's choice per request.*
- **D4 — Non-deterministic skills:** keep them owner-completable for now (W3), and treat LLM drafting as its own later authorization (W5)? *Recommended.*
- **D5 — Start point:** begin with W1, and record this as a Release 2 candidate / scope expansion ADR in `DECISION_REGISTER.md`?

---

## 8. Risks and guardrails

- **Tenant isolation for files:** storage keys always tenant/firm-prefixed; download route re-checks scope; no public buckets.
- **Audit:** upload, download, assign, run, needs-info, review, deliver all emit `appendEventAndAudit` events.
- **No silent approval / no orphan regulated work:** unchanged — runner only produces drafts; Class A gate and human review still required.
- **Sensitive files (HR onboarding, bank statements):** classification field + restricted download for ARO-10 / FAO inputs.
- **Doc accuracy:** update the Slice 6c parity table — Workdesk parity covers reading only, not actions.
