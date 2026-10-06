# vFirm Connected EDCS (BizKick) and Firm Ideas — Sprint Plan and Checklist v1.0

Date: 2026-10-05
Scope: Track 1 — BizKick EDCS ↔ vFirm integration ("Connected EDCS"); Track 2 — new vFirm capabilities (Standing Instructions, Morning Brief, Evidence Passport, Scorecards, Trust Ladder, e-Invoice readiness)
Status: Planned — product owner chose Track 1 first, then Track 2 (2026-10-05). Each sprint still needs its own go-ahead.
Classification (CLAUDE.md): Release 2 candidate / explicit user-approved scope expansion. No frozen baseline document is reopened.
Basis: `claude/vfirm-next-upgrades-and-bizkick-integration-proposal.md`; vFirm after W1–W4 (ADR-089–093); BizKick EDCS v1.01 Product Master (BK-SYS-002 Numbering Standard, BK-SYS-003 Master Control Workbook, BK-SYS-005 Smart Transaction Register, BK-SYS-006 Register User Guide, BK-QA-002); BizKick + vFirm Product Champion training Videos 03–10.

---

## 1. Product target

**Track 1 — Connected EDCS.** A BizKick customer keeps working in Word/Excel exactly as today, and vFirm:

1. reads the Smart Transaction Register (upload first, connector later) into governed, tenant-scoped transaction records keyed by the BizKick Transaction ID;
2. keeps every revision, file fingerprint and sync outcome in a visible sync ledger, with conflicts held for the owner;
3. files the linked documents into the W4 document register as revisions;
4. turns register events into work requests for hired virtual staff (follow-ups, reconciliations, triage, onboarding) under owner-enabled rules;
5. becomes the number authority so two users can never reserve the same number;
6. applies the client's own approval limits (BK-SYS-003) to drafts;
7. can prepare new BizKick working copies from controlled masters for owner approval — never editing an existing BizKick file.

**Track 2 — Firm ideas.** The firm runs between the owner's decisions (Standing Instructions), the owner sees the firm's state in two minutes (Morning Brief), records become usable proof (Evidence Passport), workers earn visible trust (Scorecards → Trust Ladder), and invoices are checked for e-invoice readiness (draft only).

## 2. Governing boundaries (both tracks)

Not authorized by this plan:

- vFirm editing, overwriting, renaming or deleting any existing BizKick source file or register row (golden rule: BizKick = source, Bridge = contract, vFirm = governed record; no two masters);
- silent conflict resolution or last-write-wins;
- deleting vFirm transaction history because a register row disappeared;
- automatic assignment, approval or issue triggered by a rule or schedule (rules only *create* requests; assignment uses the governed path; approval stays human);
- any accounting posting, payment, payroll, tax submission or LHDN/MyInvois submission;
- batch or reduced review for Class A or regulated work, or any silent approval;
- moving personal data (HR files) off the client's storage without the module's explicit policy;
- LLM generation (still W5 — separate authorization);
- cross-tenant visibility of any EDCS data.

## 3. Sprint map

### Track 1 — Connected EDCS

| Sprint | Name | Size | Main outcome | Proposal ref |
|---|---|---:|---|---|
| CE-S0 | Contract lock, decisions and fixtures | S | ADR-094, integration contract v1.0, mapping tables, synthetic "Nexa Office Supplies" BizKick fixture set | D1–D6 |
| CE-S1 | Register import and sync ledger | M | Upload BK-SYS-005 → validated, idempotent transaction records; sync ledger; conflict hold | K1 |
| CE-S2 | File linking and document history | M | Linked files fingerprinted and filed as document-register revisions; transaction chains (QT→SO→DO→INV→RC) | K2 |
| CE-S3 | Rule engine and register-driven work | M | Owner-enabled rules turn register events into work requests; daily evaluation tick; dashboard signals | K3 (+ engine reused by VI-S1) |
| CE-S4 | Number Authority | M | Atomic reservation service + Number Desk page; unreserved/duplicate detection; BizKick v1.1 "Connected" note | K5 (part 1) |
| CE-S5 | Delegation of Authority import | M | BK-SYS-003 Approval Limits + Responsibility Matrix → enforced approval policy on EDCS-linked drafts | K5 (part 2) |
| CE-H1 | Scale hardening (prerequisite for connectors) | M–L | Firm-scoped reads/writes for hot paths; load test at connector volumes | Proposal risk list |
| CE-S6 | Connector agent — local PC and NAS (Topology A/C) | L | Windows connector watches the BizKick folder, syncs deltas with a firm-scoped token, offline queue, health | K4 (part 1) |
| CE-S7 | Cloud adapter — OneDrive/SharePoint (Topology B) | L | Microsoft Graph delta sync for a consented folder | K4 (part 2) |
| CE-S8 | Governed drafting into BizKick masters | M | Worker fills a controlled template (start: BK-SAL-001 Quotation) as a new working copy; owner-approved; delivered to an outbox folder | K6 |
| CE-S9 | Pilot, evidence pack and acceptance gate | M | NHL Global Solution pilot on the Nexa fixture + one friendly customer; evidence pack; product-owner decision; training/support updates | — |

### Track 2 — Firm ideas (after CE-S3; may interleave after CE-S5)

| Sprint | Name | Size | Main outcome | Proposal ref |
|---|---|---:|---|---|
| VI-S1 | Standing Instructions | M | Recurring work requests with pre-attached inputs, on the CE-S3 engine | B1 |
| VI-S2 | Owner Morning Brief | S–M | Deterministic daily brief (console first) with links to every record | B3 |
| VI-S3 | Evidence Passport | M | Sealed, verifiable bundle (manifest + SHA-256 + approvals + audit extract) with offline verifier | B4 |
| VI-S4 | Worker Scorecards and cost-to-serve | M | Per worker/skill quality metrics; per client effort vs. revenue | B6 |
| VI-S5 | Trust Ladder | M | Shadow → Supervised → Proven per worker-skill; explicit batch approval for Proven Class B only | B2 (own ADR) |
| VI-S6 | e-Invoice readiness check | M | Deterministic MyInvois field-readiness validator, draft only | B5 (gated on current LHDN rules) |

Recommended order: CE-S0 → CE-S1 → CE-S2 → CE-S3 → **VI-S1, VI-S2** (cheap wins on the new engine) → CE-S4 → CE-S5 → CE-H1 → CE-S6 → CE-S7 → CE-S8 → CE-S9 → VI-S3 → VI-S4 → VI-S5 → VI-S6.

---

## 4. Definition of Done (every sprint)

- [ ] Owner go-ahead recorded ("Proceed <sprint>").
- [ ] ADR entry in `docs/00_project_control/DECISION_REGISTER.md` (CRLF).
- [ ] New smoke script `scripts/smoke-<sprint>.mjs` + `npm run check:<sprint>`; passes on JSON **and** on a fresh fully migrated Postgres.
- [ ] Regression set passes (W1–W4, hiring, AWIA VS-S3/S4/S6, HM-S4 items 2–7, work-assignment, workdesk-archive; legacy-roster smokes with `VFIRM_ALLOW_LEGACY_PILOT_PROVISION=true`).
- [ ] Cross-firm isolation test included for every new route.
- [ ] Audit events for every state change; new collections included in the tenant export package.
- [ ] Browser click-through of the new UI with zero console errors.
- [ ] README / user-facing help updated; project status log updated.
- [ ] Migration (if any) listed; owner applies it to production before enabling.
- [ ] Graphify refresh on the owner's machine.

---

## 5. Track 1 — detailed sprint plan

### CE-S0 — Contract lock, decisions and fixtures

Objective: freeze the integration contract before any code, and create safe test data.

Decisions to record in ADR-094 (owner):

| ID | Decision | Recommended |
|---|---|---|
| D1 | Boundary: BizKick = source, Bridge = contract, vFirm = governed record; write-back only as new working copies | Accept (chosen) |
| D2 | Start with register upload (no install) before any connector | Accept (chosen) |
| D3 | vFirm becomes the number authority for Connected customers (BizKick v1.1 change) — or detection only | vFirm authority; detection kept for unconnected rows |
| D6 | Packaging: BizKick EDCS / BizKick Connected / BizKick + Virtual Staff under NHL Global Solution | Accept |
| D7 | Which modules may send file **content** (not only metadata) to vFirm by default | Sales, Procurement, Finance (except payroll), Management: content; HR: metadata only unless the owner opts in |
| D8 | Where Connected EDCS lives in the console | New nav group "BizKick" (Transactions, Sync history, Number Desk, Rules) |
| D5 | Trust Ladder batch approval acceptable in principle (Track 2) | Decide before VI-S5 |

Deliverables:

- `docs/10_post_freeze_technical_design/CONNECTED_EDCS_INTEGRATION_CONTRACT_v1.0.md` containing:
  - canonical transaction schema and register column mapping (24 columns of BK-SYS-005 `TRANSACTION REGISTER`, header row 6, data rows 7–506);
  - document-type mapping (codes in the `LISTS` sheet: QT, SO, DO, INV, RC, CN, CMP, PR, RFQ, QC, PO, GRN, SE, PV, EC, PCV, BR, JV, EMP, LV, TS, OT, EXIT, SI, ST, SA, SCV, NDA, AGR, MIN, DEC, INC) → vFirm object, module, classification, default worker position;
  - status mapping (BizKick: Reserved, Draft, Under Review, Approved, Issued, Accepted, Rejected, Expired, Completed, Cancelled, Superseded, On Hold);
  - identity rules from BK-SYS-002: Transaction ID `[CLIENT]-[TYPE]-[YEAR]-[SEQUENCE]` (e.g. `NEX-QT-2026-0001`); never reused; cancelled rows retained;
  - revision rules from BK-SYS-006: same offer revised → same ID, R0→R1…; replacement → new ID with Related Transaction ID and the earlier row marked Superseded;
  - outcome codes for every sync row: `CREATED`, `UPDATED`, `REVISED`, `UNCHANGED`, `REJECTED` (with reason), `CONFLICT` (held), `ROW_MISSING` (row disappeared — flagged, never deleted);
  - conflict rules: same ID + same revision + different content → CONFLICT; revision going backwards → CONFLICT; type or company code changed for an existing ID → REJECTED; duplicate ID within one file → both REJECTED + DUPLICATE flag.
- Synthetic fixture pack `scripts/fixtures/bizkick/` generated from the BizKick Product Master with the training company **Nexa Office Supplies (NEX)**: a filled register (~60 rows across QT/SO/DO/INV/RC/PO/GRN/BR/CMP/EMP, with revisions, a superseded quotation, a cancelled row, an overdue invoice, an expiring quotation and a duplicate) and matching sample files. Never real client data.
- Data-handling note: which columns/files are personal data; retention; export.

Acceptance checks:

- [x] ADR-094 recorded with D1–D3, D6–D8 decided. (2026-10-05)
- [x] Contract document reviewed by the owner. (2026-10-05)
- [x] Fixture register opens in Excel/LibreOffice with no formula errors and passes BizKick's own branding test (`test_branding_contamination.py --client`). (Checked in LibreOffice; not yet opened in Excel. `register_07` has a deliberate `#VALUE!` on row 70.)

### CE-S1 — Register import and sync ledger

Objective: upload the Smart Transaction Register and get correct, idempotent, governed transaction records.

Data model (migration 0050; generic shape + generated columns; firm-scoped natural keys):

- `edcs_connections` — one per firm: company code, BizKick version, topology (`UPLOAD` now), status, content policy (D7).
- `edcs_transactions` — natural key `(tenant, firm, transaction_id)`; type, year, sequence, current revision, status, dates, counterparty type/name, subject, amount, currency, owner, expiry/due, related transaction ID, external ref, file link, `row_fingerprint`, `first_seen_at`, `last_synced_at`, flags (`DUPLICATE`, `ROW_MISSING`, later `UNRESERVED`), owner-confirmed client/supplier link.
- `edcs_transaction_revisions` — every accepted revision with its row snapshot and fingerprint (history, never overwritten).
- `edcs_sync_runs` — one per import: source file id + SHA-256, counts per outcome, actor, started/finished.
- `edcs_sync_events` — one per row per run: transaction ID, outcome, reasons, before/after fingerprints.

Design rule: EDCS reads and writes go through a small repository module (`apps/api/src/edcs-repository.mjs`) with a JSON implementation and a direct, firm-scoped Postgres implementation, so register volume does not add to the whole-store load/save cost.

API:

- `POST /edcs/connection` (create/update company code and content policy).
- `POST /edcs/register-imports` `{ file_id }` → validation + sync; returns the run with per-row outcomes.
- `GET /edcs/transactions` (filters: type, status, alert, search), `GET /edcs/transactions/<id>` (revisions and events), `GET /edcs/sync-runs`, `GET /edcs/sync-runs/<id>`.
- `POST /edcs/conflicts/resolve` `{ transaction_id, choose: "KEEP_CURRENT" | "ACCEPT_INCOMING", note }` — owner only, audited.
- `POST /edcs/transactions/link-counterparty` (owner confirms the client/supplier match; suggestions only, never auto-create).

Parsing and validation:

- Reuse the W3 XLSX/CSV reader; read sheet `TRANSACTION REGISTER`, header row 6; formula cells use the cached values Excel/LibreOffice saved (if computed IDs are missing, the UI tells the user to save the file in Excel/LibreOffice first).
- Validate: ID format and that it equals Company Code-Type-Year-Sequence; company code matches the connection; type and status in the controlled lists; dates; amount numeric; currency code.
- Blank rows and formula-only rows (no Transaction ID) are ignored.

UI ("BizKick" nav group):

- Connection setup (company code, content policy).
- Import register (upload + summary: created / updated / revised / unchanged / rejected / conflicts).
- Transactions list (type, status, counterparty, amount, expiry, alert) and transaction detail (revisions, sync events).
- Sync history (ledger) and Conflicts queue (resolve with a note).

Acceptance checks (`npm run check:ce:s1-register-import`):

- [x] Fixture import creates the expected transactions; counts match the register.
- [x] Re-importing the same file → every row `UNCHANGED`; no duplicates.
- [x] Changing a row's status → `UPDATED`; incrementing revision → `REVISED` with history kept.
- [x] Same revision, different content → `CONFLICT`, held, not applied; owner resolution audited.
- [x] Duplicate ID in the file → both rows `REJECTED` with `DUPLICATE`.
- [x] Wrong company code / bad ID format / unknown type → `REJECTED` with reason.
- [x] Row removed from the register → `ROW_MISSING` flag; vFirm record and history kept.
- [x] Another firm cannot import into, read or resolve this firm's EDCS data.
- [x] Audit events: `edcs.register_imported`, `edcs.transaction_created/updated/revised`, `edcs.conflict_held/resolved`.
- [x] Export package includes all EDCS collections.

CE-S1 evidence (2026-10-05): `npm run check:ce:s1-register-import` passes on the JSON store and on a fresh, fully migrated Postgres (migration 0050); regression set (W1-W4, hiring, AWIA VS-S3/S4/S6, HM-S4 items 2-7, work-assignment, workdesk-archive) passes; browser click-through of the five BizKick pages shows zero console errors. Details and the known limitations are in ADR-095.

### CE-S2 — File linking and document history

Objective: connect each transaction to its real files and make its history reconstructable.

Scope:

- File matching: owner uploads files (bulk); a file matches a transaction when its name contains the Transaction ID (BK-SYS-006: "use the Transaction ID in the quotation form and file name") or when the owner picks it; the register's File Link / Path is kept as the source reference.
- Each matched file → `file_objects` (SHA-256) → document register entry numbered with the Transaction ID; a new file for the same transaction → new document revision mirroring the BizKick revision; identical hash → no new revision.
- Content policy (D7): HR-module transactions store metadata and fingerprint only unless the owner opts in.
- Transaction chain view using Related Transaction ID (QT → SO → DO → INV → RC; PR → RFQ → QC → PO → GRN) with missing-link flags (e.g. GRN with no PO).

Acceptance checks (`npm run check:ce:s2-file-linking`):

- [x] Fixture files match by ID; unmatched files listed for manual linking.
- [x] Document register shows the Transaction ID number, correct revision, real SHA-256.
- [x] Same file uploaded twice → no new revision; changed file → new revision, prior superseded.
- [x] HR transaction file content not stored under the default policy; fingerprint kept.
- [x] Chain view shows QT→…→RC for the fixture and flags the GRN without a PO.
- [x] Download of a linked file re-verifies SHA-256; cross-firm access refused.

CE-S2 evidence (2026-10-05): `npm run check:ce:s2-file-linking` passes on the JSON store and on a fresh, fully migrated scratch Postgres (migrations 0001-0050; CE-S2 adds no migration). Regression set (W1, W2, W4, hiring, work-assignment, workdesk-archive, HM-S4 items 2, 3 and 7, CE-S0, CE-S1) passes. Browser click-through (Files, Chains, transaction detail, download, HR metadata-only) ran with no console errors. Not verified: `check:awia:hire-a-worker` (its script file is missing from the working copy used this sprint).

### CE-S3 — Rule engine and register-driven work

Objective: register events create the right work request for the right worker, under rules the owner turns on.

Data model (migration 0051): `automation_rules` (trigger `EDCS_EVENT` now, `SCHEDULE` in VI-S1; condition; action; enabled; owner), `automation_rule_runs` (evaluations, matches, created request ids, dedupe keys).

Scope:

- Conditions: transaction type; status; days to expiry ≤ N; overdue; new revision; new transaction; missing chain link.
- Action: create a W2 work request of a given request type, with the transaction and its linked files attached; optional `assign_to_staff_code` (unchanged governed assignment path); priority; due date.
- Dedupe key per rule + transaction + occurrence, so the same condition never creates a second request.
- Dry-run preview ("this rule would create 4 requests now") before enabling.
- Evaluation on every import/sync and on a daily tick: `POST /automation/tick` with a service token (production scheduler — Supabase cron or an external cron — decided in this sprint); local dev uses an in-process interval.
- Rule templates (all off by default): quotation expiring in 3 days → Sales Coordinator follow-up draft; invoice overdue → Bookkeeper collections draft; new BR with statement → Bookkeeper reconcile (FAO-11); new CMP → General Clerk triage (ARO-01); new EMP/offer → HR Administrator onboarding (ARO-10, Class A); GRN without PO → Bookkeeper exception.
- Dashboard "Needs you" tray gains BizKick signals: expiring quotations, overdue invoices, conflicts, missing links, duplicates.
- Work requests show "From BizKick: NEX-QT-2026-0007" linked to the transaction.

Acceptance checks (`npm run check:ce:s3-register-rules`):

- [x] Disabled rule creates nothing; dry-run shows the would-be requests.
- [x] Enabled rule creates one request per occurrence; re-import / repeated tick creates no duplicate.
- [x] Request carries the transaction reference and linked files; the W3 runner can use them (e.g. BR statement → FAO-11 slot).
- [x] Rule with assign-to uses the governed assignment; wrong-position worker refused and the request stays in the Inbox.
- [x] Class A request still requires owner Class A approval.
- [x] Tick endpoint refuses calls without the service token; rules never see other firms' transactions.
- [x] Tray counts match the fixture.

CE-S3 evidence (2026-10-05): `npm run check:ce:s3-register-rules` passes on the JSON store and on a fresh, fully migrated scratch Postgres (migrations 0001-0051). Regression set (W1, W2, W4, hiring, work-assignment, workdesk-archive, HM-S4 items 2 to 7, CE-S0, CE-S1, CE-S2) passes. Browser click-through (Rules page: add from template, refused enable without preview, preview, enable, Run rules now, no duplicate on second run, activity; dashboard BizKick tray; supporting-document tickbox and transaction detail) ran with no unexpected console errors. Decisions taken: supporting files carry a PRIMARY/SUPPORTING role and never replace the primary revision; File Link/Path matching is left to the folder connector. Production scheduler recommendation: Supabase `pg_cron` + `pg_net` calling `POST /automation/tick` with `VFIRM_SERVICE_TOKEN` (not applied; owner to confirm). Not verified: `check:awia:hire-a-worker` was not re-run in the cloud copy (its script file is absent there); RLS is not re-proved by the Postgres smoke because it connects as the database owner.

### CE-S4 — Number Authority

Objective: remove BizKick's documented multi-user reservation weakness (BK-QA-002) for Connected customers.

Scope:

- `edcs_number_reservations` (migration 0052) with a unique constraint on `(tenant, firm, company code, type, year, sequence)`; `POST /edcs/numbers/reserve` `{ type, year, purpose, counterparty?, subject? }` returns the next ID atomically (Postgres: unique constraint + retry; JSON: inside the store lock); states `RESERVED → REGISTERED` (matched to an imported row) / `VOID` (owner cancels; number never reused).
- Seeding: on first enable, the sequence starts after the highest ID already in the imported register.
- Number Desk page (type, year → reserve → copy ID); recent reservations; "reserved but not registered after N days" list.
- Import cross-check: register rows whose ID was never reserved → `UNRESERVED` warning (not rejected, for gradual adoption); reserved ID used for a different type/counterparty → warning.
- BizKick side (BizKick release work, not vFirm code): "Connected edition" note on NUMBER DESK ("reserve in vFirm Number Desk"), release notes and QA entry; product-master changes only via BizKick build tools.

Acceptance checks (`npm run check:ce:s4-number-authority`):

- [x] 50 concurrent reservations for the same type/year produce 50 distinct consecutive numbers (Postgres).
- [x] Sequence starts after the highest imported ID.
- [x] Voided numbers are never reissued.
- [x] Import flags unreserved IDs and marks matched reservations `REGISTERED`.
- [x] Another firm cannot reserve in or read this firm's sequences.

CE-S4 evidence (2026-10-06): `npm run check:ce:s4-number-authority` passes on the JSON store and on a fresh, fully migrated scratch Postgres (migrations 0001-0052), including 50 concurrent reservations (distinct and consecutive) and a direct test that the database unique index refuses a duplicate number. The regression set (W1, W2, W3, W4, hiring, work-assignment, workdesk-archive, HM-S4 items 2 to 7, CE-S0 to CE-S3) passes. Browser click-through (reserve, second reserve, void with reason, number not reused, validation message, import page note for unreserved numbers) ran with no unexpected console errors. Decisions taken: the cross-check only starts once the firm has reserved at least one number (gradual adoption; a firm that never uses the Number Desk is never warned); any signed-in member may reserve, only the owner may void; seeding is derived (highest of reserved and imported), with no set-up step. Side change: the development JSON store now runs read-modify-write cycles one at a time and queues reads behind writes (it previously could lose an update or read a half-written file under concurrency; production Postgres is unchanged). Not done here (BizKick release work, outside vFirm code): the "Connected edition" note on BizKick's NUMBER DESK, release notes and QA entry.

### CE-S5 — Delegation of Authority import

Objective: the client's own approval limits decide who may approve EDCS-linked drafts.

Scope:

- Import BK-SYS-003 sheets `Approval Limits` (transaction type, tier limits, approvers) and `Responsibility Matrix` (process, prepare/review/approve roles) → `approval_policies` (migration 0053; versioned; owner confirms each import; changes audited).
- Map BizKick approver labels (e.g. "Authorised Manager", "Owner / Board") to vFirm actor roles in the firm (owner confirms the mapping).
- Enforcement: when a draft comes from an EDCS-linked request with an amount, the required tier is recorded on the draft; `APPROVED_FOR_CLIENT_DRAFT` is refused unless the reviewer holds the tier's role, and the message names the required approver. Class A rules still apply on top.
- Single-owner firms: "Owner / Board" maps to the owner, so the owner is never blocked.

Acceptance checks (`npm run check:ce:s5-delegation-of-authority`):

- [x] Import of the fixture workbook creates the policy; re-import with changes creates a new version.
- [x] Draft above Tier 1 refused for a Tier-1-only reviewer and allowed for the Tier 2 role; both audited.
- [x] Non-EDCS work unaffected.
- [x] Class A still requires Class A approval regardless of tier.

CE-S5 evidence (2026-10-06): `npm run check:ce:s5-delegation-of-authority` passes on the JSON store and on a scratch Postgres (migrations 0001-0053). It proves: first import creates policy v1, the same workbook and mapping adds nothing, a changed workbook creates v2 (v1 SUPERSEDED, exactly one ACTIVE, the Purchases limit change listed); a RM 5,400 purchase order is refused for a Procurement-Manager-only reviewer with a message naming Finance Manager and Tier 2, and allowed for the Finance Manager role and the owner; both outcomes are audited (`edcs.delegation_denied`, `edcs.delegation_allowed`); a USD purchase order goes to the top tier; work that is not EDCS-linked or whose document type has no limit is unaffected; a Class A draft is still refused without Class A approval even within tier. The regression set (W1 to W4, hiring, work-assignment, workdesk-archive, HM-S4 items 2 to 7, CE-S0 to CE-S4) passes; a browser click-through (preview, incomplete-mapping message, import v1, update to v2, view old version, bad-rows list, missing-sheet message) ran with no unexpected console errors. Decisions taken: limits are inclusive (RM 5,000 is Tier 1); foreign-currency amounts go to the top tier (vFirm does not convert); percentage rows are recorded but not enforced; a higher-tier approver also covers lower tiers; the firm owner always passes; the owner confirms each label-to-role and document-type-to-limit mapping on every import; a bare number below 1 in a limit cell is rejected as ambiguous. Side change: the shared owner-role check now accepts the production role `OWNER` (the earlier EDCS lists did not), and API errors may carry a `details` object.

### CE-H1 — Scale hardening (prerequisite for connectors)

Objective: continuous sync must not slow every page. Addresses the open whole-store load/save follow-up in the decision register.

Scope (finalised at sprint start after measuring):

- Measure with fixture volumes (e.g. 5 firms × 2,000 transactions × 3 revisions) using `scripts/measure-hm-s5-store-load-save-baseline.mjs`.
- Move the console's hot read paths (Workdesk, Documents, BizKick pages) to firm-scoped queries; EDCS stays on its repository (CE-S1).
- Set and meet budgets for page loads and for syncing a 500-row register.

Acceptance checks:

- [x] Before/after measurements recorded against the agreed budgets.
- [x] No functional regression (full regression set).

CE-H1 evidence (2026-10-06): scratch Postgres, 5 firms x 2,000 rows x 3 revisions. Median ms before to after: scoped store read 3841 to 25, work request create 1580 to 19, transaction detail 932 to 107, slowest 500-row import 3348 to 1578; all budgets met. Regression set passes on JSON and Postgres 0001-0054 (ADR-100). Follow-up (ADR-102, 2026-10-06): GET /mvp/store is guarded on a production server; `npm run check:ce:h1-store-read-guard` passes.


### CE-S6 — Connector agent: local PC and NAS (Topology A/C)

Objective: continuous sync without uploads, for single-PC and company-server deployments.

Scope:

- `apps/edcs-connector` (Node only): config (vFirm URL, connection token, BizKick root folder, topology), polling + file-system watch on the register and controlled folders, shared tabular reader, row and file fingerprints, deltas to `POST /edcs/sync` (same contract and outcomes as CE-S1); file content uploaded only where the content policy (D7) allows.
- Connector tokens (migration 0054): firm-scoped, hashed at rest, rotatable and revocable from the console; every sync attributed to the connector identity.
- Offline queue on disk with retry/backoff; heartbeat; console shows connection health (last seen, last run, queue length, errors).
- Packaging: Windows scheduled task/service for Topology A; same build pointed at a UNC path for Topology C (service-account guidance).
- Read-only on BizKick folders except an optional `_vFirm_Outbox` folder used by CE-S8.

Acceptance checks (`npm run check:ce:s6-connector` + manual Windows test):

- [x] Changing a register row produces exactly one sync event with the right outcome.
- [x] Network off → queued → delivered after reconnect, no duplicates.
- [x] Revoked token → refused; console shows the connector as revoked.
- [x] Connector never writes outside the outbox (file-system audit in the test).
- [x] HR files: metadata only under the default policy.

CE-S6 evidence (2026-10-06): `npm run check:ce:s6-connector` passes on the JSON store and on Postgres 0001-0054, including the packaged build. Manual Windows test: steps and a one-command local test kit are in `CE_S6_WINDOWS_MANUAL_TEST_v1.0.md` (ADR-101).

Windows manual test result (2026-10-06, owner's Windows PC, throw-away local JSON API on 127.0.0.1:3091, run for the owner; temp kit and store deleted afterwards): **PASS on behaviour, all five checks.**

| Check | Result |
|---|---|
| 1. One changed row gives one sync event with the right outcome | Pass: first sync created 6 rows; one changed amount produced exactly one new run, `CONFLICT: 1` |
| 2. Network off, queued, delivered once after reconnect | Pass: change queued locally while the API was off, delivered once after restart, third run delivered nothing |
| 3. Revoked token refused, shown as revoked | Pass: refused, connector showed `REVOKED`, refused attempt counted |
| 4. No write inside BizKick | Pass: folder unchanged apart from the owner's own `register.csv` edits |
| 5. HR file metadata only | Pass: `HR_RESTRICTED`, `METADATA_ONLY`, `content_stored: false` |

Note: the run reported exit code 1 where the doc says 2 (offline) and 3 (revoked). The connector code returns 2 and 3 (reproduced: offline gives 2); a wrapper such as `npm run` or a test runner reports any non-zero code as 1. The doc now says to read `$LASTEXITCODE` from a direct `node` call. Optional: confirm once on Windows. The structured results (`waiting: true`, `fatal: CONNECTOR_REVOKED`) were correct. Production hosting steps (API host, service token, pg_cron): `CE_PRODUCTION_SETUP_GUIDE_v1.0.md`.


### CE-S7 — Cloud adapter: OneDrive/SharePoint (Topology B)

Objective: Connected EDCS for customers who keep BizKick in Microsoft 365 (BK-IMP-001 setup).

Scope:

- Microsoft Entra app registration (admin consent), least-privilege access to the selected site/folder only.
- Server-side Graph delta query on the BizKick library; same `/edcs/sync` contract; tokens stored encrypted; disconnect/revoke.
- Co-authoring: only saved versions are read; version history used as revision evidence where available.

Acceptance checks:

- [ ] Sync from a test tenant folder matches the upload result for the same register.
- [ ] Revoking consent stops sync and shows the state in the console.
- [ ] Access limited to the consented folder.

### CE-S8 — Governed drafting into BizKick masters

Objective: workers prepare new BizKick documents; the owner approves; BizKick stays the source.

Scope:

- Template manifest per controlled master (start with BK-SAL-001 Quotation; then BK-PRO-004 Purchase Order and BK-SAL-004 Invoice): field → cell map, required fields, numbering field.
- XLSX template filler (cell-level edit of a copy of the master, formatting preserved) producing a **new working copy** named per BK-SYS-006 with a Number-Authority ID.
- Flow: request → worker drafts the working copy → owner review/approval (DoA applies) → delivered as a download and, if a connector exists, written to `_vFirm_Outbox`; the user moves it into BizKick and registers it; the next sync links it.
- Never overwrites a master or an existing working file.

Acceptance checks (`npm run check:ce:s8-template-drafting`):

- [ ] Generated quotation opens in Excel with no formula errors; values in the right cells; branding intact.
- [ ] File name and ID follow the numbering standard; reservation marked used.
- [ ] Unapproved draft cannot be delivered; approval audited.
- [ ] Connector writes only to the outbox.

### CE-S9 — Pilot, evidence pack and acceptance gate

Objective: prove Connected EDCS end to end and let the owner decide.

Scope:

- NHL Global Solution internal pilot on the Nexa fixture, then one friendly customer (topology chosen with the Video 10 onboarding checklist).
- Evidence pack: smoke summary CE-S1…S8, pilot log, known limitations, export test, isolation test.
- Support playbook by layer (Videos 06/07 diagnosis order: BizKick source → connector/bridge → vFirm record), with L1/L2/L3 owners.
- Product Champion training addendum (Connected edition, Number Desk, rules, conflicts); BizKick v1.1 release notes and QA.
- Acceptance gate document: accept / accept with limitations / hold / reject. No silent acceptance.

Acceptance checks:

- [ ] All CE checks pass; pilot ran at least 2 weeks with no unresolved data-integrity issue.
- [ ] Product-owner decision recorded.

---

## 6. Track 2 — detailed sprint plan

### VI-S1 — Standing Instructions

Objective: recurring work happens on schedule with its inputs ready.

Scope:

- `SCHEDULE` trigger on the CE-S3 engine: daily/weekly/monthly/quarterly, day-of-month, business-day handling (configurable Malaysian public-holiday list), time zone Asia/Kuala_Lumpur.
- Action: create a work request (type, title template with period, instructions, optional worker) with **input resolvers**: latest file from Documents by type/tag; BizKick transactions of a type in the period (e.g. BR for last month); or none.
- Missing input → the request is still created and the worker's run raises W4 "needs info".
- Pause/resume, skip next, run now; history of generated requests.
- Templates: monthly bank reconciliation; weekly receivables follow-up; quarterly supplier evaluation; monthly management summary.

Acceptance checks (`npm run check:vi:s1-standing-instructions`):

- [ ] Tick on the due date creates exactly one request per period; repeated ticks don't duplicate.
- [ ] Inputs pre-attached when available; "needs info" raised when not.
- [ ] Paused instruction creates nothing; run-now works and is audited.
- [ ] Assignment, review and approval unchanged.

### VI-S2 — Owner Morning Brief

Objective: the firm's state in two minutes, deterministic and linked.

Scope:

- Sections: Needs you (W4 tray); due/overdue (requests + BizKick); cash signals (receivables aging from INV/RC, unreconciled months from BR); worker throughput yesterday; exceptions (conflicts, duplicates, missing links, unreserved IDs); standing instructions due today.
- Console page "Today" + daily snapshot (`firm_briefs`) for history; every line links to its record.
- Email/WhatsApp delivery deferred (needs a provider decision and consent).

Acceptance checks (`npm run check:vi:s2-morning-brief`):

- [ ] Fixture produces the expected numbers in each section.
- [ ] Every item links to an existing record; no cross-firm data.
- [ ] Deterministic: same data → same brief.

### VI-S3 — Evidence Passport

Objective: give a bank, tender board or auditor a dossier they can verify.

Scope:

- Owner selects scope (client, project, period, transaction chain or document list) and purpose; preview; classification gate (HR/finance-restricted items need explicit inclusion).
- Bundle (zip): documents (current or all revisions), `manifest.json` (files, SHA-256, revisions, approvals with approver and time, sync events for EDCS items), audit extract, cover page, and an offline `verify.html` that recomputes hashes in the browser (WebCrypto) — no account needed.
- Passport record + audit event; bundle stored as a file object; re-download re-verifies.

Acceptance checks (`npm run check:vi:s3-evidence-passport`):

- [ ] Manifest hashes match the files; tampering with any file makes the verifier fail.
- [ ] Restricted items excluded unless explicitly included; inclusion audited.
- [ ] Cross-firm content impossible.

### VI-S4 — Worker Scorecards and cost-to-serve

Objective: practice economics, and the evidence the Trust Ladder needs.

Scope:

- Per worker and skill (period): jobs, median time to draft, first-pass approval rate, revision rate, rejection rate, needs-info rate and the most frequently missing inputs.
- Per client: requests, worker jobs, owner review time (where recorded) vs. invoiced amount.
- Scorecard view on My Team; client view on Clients.

Acceptance checks (`npm run check:vi:s4-scorecards`):

- [ ] Metrics match hand-computed values on a fixture history.
- [ ] Only the firm's own data; no performance profiling of human staff.

### VI-S5 — Trust Ladder (requires its own ADR and decision D5)

Objective: authority earned per worker-skill, never assumed.

Scope:

- Stages per worker-skill: **Shadow** (worker runs on requests the human also completes; outputs compared; never delivered) → **Supervised** (current model) → **Proven** (owner-set thresholds over N jobs from VI-S4).
- Proven + Class B only: **explicit batch approval** — the owner approves a listed set of drafts in one attributable decision; each draft still gets its own review record referencing the batch.
- Automatic demotion to Supervised on any rejection or revision beyond threshold; Class A and regulated work excluded by rule.
- Ladder visible on My Team; every stage change audited.

Acceptance checks (`npm run check:vi:s5-trust-ladder`):

- [ ] Shadow outputs never reach Approval/Outbox.
- [ ] Batch approval refused for Class A, non-Proven pairs and regulated types.
- [ ] Each draft in a batch has its own review record; the batch is audited.
- [ ] A rejection demotes automatically.

### VI-S6 — e-Invoice readiness check (gated)

Gate before starting: confirm the current LHDN e-Invoice Guideline and MyInvois field specification, the phase/threshold that applies to target customers, and the relaxation-period rules (recent sources disagree on the exemption threshold — RM1m vs RM3m). Record the confirmed source in the ADR.

Scope:

- Deterministic validator on invoices (BizKick INV transactions + linked files where parsable, and vFirm invoices): required supplier/buyer identifiers and fields per the confirmed spec; flags and a fix list; optional monthly consolidated-summary draft.
- Draft only: vFirm does not submit to MyInvois.

Acceptance checks (`npm run check:vi:s6-einvoice-readiness`):

- [ ] Fixture invoices produce the expected pass/fail per field.
- [ ] No submission capability exists in code.

---

## 7. Master checklist

### Decisions and governance

- [x] ADR-094 Connected EDCS (D1, D2, D3, D6, D7, D8)
- [x] Integration contract v1.0 approved (2026-10-05; Inventory = full content, Legal = metadata only, recorded in ADR-095)
- [x] Production scheduler for ticks chosen (CE-S3): recommendation is Supabase `pg_cron` + `pg_net` to `POST /automation/tick`; owner to apply
- [ ] BizKick v1.1 "Connected edition" release decision (CE-S4)
- [ ] D5 Trust Ladder decision + its ADR (before VI-S5)
- [ ] Current LHDN spec confirmed (before VI-S6)

### Data model (planned migrations)

- [ ] 0050 `edcs_connections`, `edcs_transactions`, `edcs_transaction_revisions`, `edcs_sync_runs`, `edcs_sync_events`
- [ ] 0051 `automation_rules`, `automation_rule_runs`
- [x] 0052 `edcs_number_reservations` (unique per firm/code/type/year/sequence) (CE-S4)
- [x] 0053 `approval_policies` (CE-S5)
- [ ] 0054 `edcs_connector_tokens`, `edcs_connector_heartbeats`
- [ ] 0055 `firm_briefs`, `evidence_passports`, `trust_ladder_states`

### API

- [ ] `/edcs/connection`, `/edcs/register-imports`, `/edcs/transactions`, `/edcs/sync-runs`, `/edcs/conflicts/resolve`, `/edcs/transactions/link-counterparty`
- [x] File matching / linking endpoints (CE-S2): `POST /edcs/files/upload`, `GET /edcs/chains`, `GET /edcs/documents/<id>`
- [x] `/automation/rules` CRUD + dry-run; `/automation/tick` (service token) (CE-S3)
- [x] `/edcs/numbers/reserve`, void, list (CE-S4)
- [x] `/edcs/delegation` read, preview, import (label and document-type mapping), check (CE-S5; the plan's name was `/edcs/approval-policy/import`)
- [ ] `/edcs/sync` (connector); token issue/rotate/revoke; heartbeat
- [ ] Graph adapter connect/disconnect
- [ ] Template drafting endpoints (CE-S8)
- [ ] Brief, passport, scorecard, ladder and e-invoice endpoints (Track 2)

### UI

- [ ] "BizKick" nav group: Transactions, Sync history, Conflicts, Number Desk, Rules, Connection
- [ ] Transaction detail with revisions, files, chain, sync events
- [ ] Dashboard tray BizKick signals
- [ ] Work request "From BizKick" link
- [ ] Standing Instructions page
- [ ] Today (Morning Brief) page
- [ ] Evidence Passport builder
- [ ] Scorecards on My Team / Clients; Trust Ladder badges

### Connector and BizKick side

- [ ] `apps/edcs-connector` (Topology A/C) + Windows install guide
- [ ] Graph adapter (Topology B) + Entra app registration guide
- [ ] `_vFirm_Outbox` convention documented
- [ ] BizKick v1.1 Connected edition notes + QA
- [ ] Product Champion training addendum; layered support playbook

### Tests

- [ ] `check:ce:s1-register-import`
- [ ] `check:ce:s2-file-linking`
- [ ] `check:ce:s3-register-rules`
- [x] `check:ce:s4-number-authority` (CE-S4)
- [x] `check:ce:s5-delegation-of-authority` (CE-S5)
- [x] CE-H1 measurements (CE-H1)
- [x] `check:ce:s6-connector` (CE-S6)
- [ ] CE-S7 Graph test
- [ ] `check:ce:s8-template-drafting`
- [ ] CE-S9 evidence pack + acceptance gate
- [ ] `check:vi:s1-standing-instructions`
- [ ] `check:vi:s2-morning-brief`
- [ ] `check:vi:s3-evidence-passport`
- [ ] `check:vi:s4-scorecards`
- [ ] `check:vi:s5-trust-ladder`
- [ ] `check:vi:s6-einvoice-readiness`

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Two masters by accident | Contract + tests that vFirm never writes BizKick sources; conflicts held |
| Register saved without cached formula values | Detect missing computed IDs; tell the user to save in Excel/LibreOffice |
| Customers change the register structure | Header/column check at import; clear rejection; BizKick change control (Register Control Log) |
| Personal data leaving client storage | Content policy D7; HR metadata-only default; restricted classifications |
| Volume slows the console | EDCS repository from CE-S1; CE-H1 before connectors |
| Scheduler reliability in production | Idempotent ticks with dedupe keys; scheduler decided in CE-S3 |
| Microsoft 365 consent friction | Topology A/C first; Graph adapter as its own sprint |
| Regulation drift (e-invoice) | VI-S6 gated on a confirmed LHDN spec |
| Over-selling to customers | Training addendum; acceptance gate lists limitations |

## 9. Current next action

Product owner: review this plan and the CE-S0 decisions, then say "Proceed CE-S0" to lock the contract, record ADR-094 and build the Nexa fixture pack.

### Production-auth sprint (ADR-103, 2026-10-06)

Owner decisions: host on Vercel (Singapore); run the production-auth sprint before real client data.
Step 1 delivered: one request gate in front of every route on a production server (`request-auth-gate.mjs`), body scope check, dev-only routes closed. `npm run check:pa:request-gate` passes.
Next steps (not started): (a) Vercel entry point for the API and the console, with pool settings for short-lived functions; (b) a real-token end-to-end check on the live host; (c) per-route role audit; (d) rate limiting.
