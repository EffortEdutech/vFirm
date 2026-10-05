# Handoff: vFirm Connected EDCS (BizKick integration), next session

Date: 2026-10-05
From: Claude, the Cowork session that delivered W1–W4, the BizKick proposal and the sprint plan
To: Codex, or a new Cowork/Claude session
Product owner: eff (NHL Global Solution / myeffort.studio)
Status: **Planned, not started.** The next sprint is **CE-S0**. Don't write code until the owner says "Proceed CE-S0". He usually adds "Bismillah".
Companion handoff for the separate track: `HANDOFF_VFIRM_FIRM_IDEAS_NEXT_SESSION_v1.0.md`

---

## 1. Mission

**Two products:**
- **BizKick EDCS v1.01** is the owner's file-based document-control product for SMEs, built on Word and Excel.
- **vFirm** is the Virtual Firm Platform in this repo.

**The aim:** connect them.
- BizKick stays the source of documents and of the transaction trail.
- vFirm becomes the governed layer. There, those transactions are synced, worked on by hired virtual staff, approved by the human owner, filed and remembered.

**The joining key** is the BizKick **Smart Transaction Register** Transaction ID, for example `NEX-QT-2026-0001`.

**Golden rule:**
- **BizKick is the source, the Bridge is the contract, and vFirm is the governed record.**
- There are never two masters.
- vFirm never edits an existing BizKick file.

## 2. Read these first, in this order

| # | Document | Where | Why |
|---|---|---|---|
| 1 | `AGENTS.md`, `CLAUDE.md`, `docs/AI_WORKSPACE_CONTEXT.md` | repo root / `docs/` | <ul><li>Non-negotiable principles: human authority, no silent approval, tenant isolation, deterministic workflow, data portability.</li><li>How to classify a request.</li><li>Terminology.</li></ul> |
| 2 | **`VFIRM_CONNECTED_EDCS_AND_FIRM_IDEAS_SPRINT_PLAN_AND_CHECKLIST_v1.0.md`** | `docs/10_post_freeze_technical_design/`; also project doc `claude/connected-edcs-and-firm-ideas-sprint-plan.md` | **The governing plan:** <ul><li>sprints CE-S0…CE-S9 plus CE-H1;</li><li>decisions, scope and acceptance checks;</li><li>master checklist and Definition of Done.</li></ul> |
| 3 | `vfirm-next-upgrades-and-bizkick-integration-proposal.md` | project doc `claude/…` | The reasoning behind the plan: mapping tables, payoff, packaging. |
| 4 | `DECISION_REGISTER.md`, ADR-089 to ADR-093 | `docs/00_project_control/` | What W1–W4 built and the rules it follows. The file uses CRLF line endings. |
| 5 | `firm-operating-workflow-upgrade-proposal.md`, status log at the bottom | project doc `claude/…` | The story of W1–W4 and the hiring-bug fix (ADR-091). |
| 6 | BizKick Product Master v1.01 | `C:\Users\user\Documents\00-NHL Global Solution\P02-BizKick\BizKick_EDCS_v1.01_Product_Master\` | The source of truth for BizKick structure (see §5). |
| 7 | BizKick and vFirm training scripts, Videos 03–10 | `…\P02-BizKick\Training\…\01_Scripts\` | The agreed product boundary is defined across these scripts: <ul><li>Video 06: the product boundary;</li><li>Video 07: integration topologies A (PC), B (cloud) and C (NAS);</li><li>Video 08: lifecycle and conflict rules;</li><li>Video 10: onboarding.</li></ul> |

**Note for Cowork sessions:** the BizKick folder sits outside the repo. Request access to it with folder access (one prompt), or ask the owner to attach the files.

## 3. Current state of the vFirm codebase (after W1–W4, 2026-10-01)

### Stack

- **API:** Node ESM, in `apps/api/src/server.mjs`. Routes live in a route Map, plus some inline GET routes.
- **Store (`apps/api/src/store.mjs`):**
  - `withStore` loads the whole multi-tenant store (JSON file or Postgres), mutates it, then saves it.
  - Relational tables have the shape `(id uuid, natural_key, tenant_id, firm_id, record jsonb)`, plus generated `*_c` columns.
  - `changedRecords` deduplicates writes.
- **Domain modules:** `packages/core-domain/src/`.
- **Owner console:** `apps/web-console`, a vanilla JS SPA behind an `/api` proxy.
- **Legacy console:** `apps/web/public/app.js`. Do not extend it.
- **Database:** Postgres, which is Supabase in production.
- **Auth:** a Supabase JWT, or dev headers (`x-vfirm-actor-id`, `x-vfirm-tenant-id`, `x-vfirm-firm-id`, `x-vfirm-role`).

### Migrations

- The latest is `0049_work_requests.sql`. The owner confirmed 0048 and 0049 are applied in production.
- **The next free number is 0050.**
- The folder has some historical duplicate numbers and a gap at 0028–0030. Leave them alone.

### What Connected EDCS should reuse (do not rebuild)

| Capability | Where | Reuse in |
|---|---|---|
| File storage (Supabase private bucket or local disk): SHA-256, MIME allowlist, scope-checked download | <ul><li>`apps/api/src/file-storage.mjs`</li><li>routes `POST /files/upload`, `GET /files/<id>/download`</li><li>table `file_objects` (0048)</li></ul> | CE-S1 register upload; CE-S2 files |
| CSV and **XLSX reader with no dependency**; amount and date helpers; CSV writer with formula neutralisation | `packages/core-domain/src/tabular-file-reader.mjs` | CE-S1 register parsing; CE-S6 connector |
| Work requests (the front door); request types; ad-hoc tasks; governed assignment (authority gate, position and skill scope, Class A) | <ul><li>store.mjs: `createWorkRequestRecord`, `prepareWorkRequestAssignment`, `assignAwiaVirtualStaffTaskRecord`</li><li>`awia-work-request-types.mjs`</li><li>`POST /work-requests` (takes `assign_to_staff_code`)</li></ul> | CE-S3, where rules create requests |
| Deterministic skill runner (ARO-01, FAO-11, SAO-03, OPO-09, ARO-10): file slots, form inputs, 422 `SKILL_INPUT_REQUIRED` | <ul><li>`awia-skill-runner.mjs`</li><li>`POST /awia/virtual-staff/workdesk-item/run-skill`</li></ul> | CE-S3, e.g. a BizKick BR statement fed into the FAO-11 bank slot |
| Item conversation threads; `NEEDS_INFO` status; owner reply with files | ADR-093; `postWorkdeskItemMessageRecord`, `ensureItemThread`, `postItemThreadMessage` | CE-S3 missing inputs |
| Document register with revisions from real files; output filing | <ul><li>ADR-093</li><li>functions `registerFileDocumentRecord`, `reviseFileDocumentRecord`, `fileWorkdeskOutputToRegister`</li><li>routes `POST /documents`, `/documents/revise`</li><li>tables `document_register_entries`, `document_revision_records` (0017)</li></ul> | CE-S2: an entry numbered with the Transaction ID |
| Dashboard "Needs you" tray; `vfirm:navigate` event; Projects list; Documents page; New Request drawer presets | <ul><li>`apps/web-console/public/js/`</li><li>`pages-owner.js`, `main.js`, `request-drawer.js`, `nav.js`</li></ul> | CE-S1 "BizKick" nav group; CE-S3 tray signals |
| NHL quotation workflow (Q1–Q6) | `quotation_cases` and related tables; `NHL_Q_SERIES_FULL_SPRINT_PLAN_AND_CHECKLIST_v1.0.md` | How BizKick QT (quotation) maps across |
| The NHL Global Solution firm profile already lists "BizKick EDCS" as a service | `server.mjs`, around line 565 | Packaging (D6) |

**What the reused pieces do:**
- **Document register:** numbers documents DOC-0001 onward, records revisions R1→R2 (older ones become superseded), and files outputs as `WR-xxxx-OUT`.
- **Request drawer presets:** `presetWorker`, `presetProjectId` and `presetTypeId`.

**There is no BizKick bridge code yet.** The service name above is the only BizKick reference in the code.

## 4. Working rules (how this owner works)

1. **One sprint at a time, with explicit go-ahead.**
   - Explain the plan, then wait for "Proceed CE-Sx".
   - Classify the work as *Release 2 candidate / user-approved scope expansion*.
2. **Record an ADR for every sprint** in `docs/00_project_control/DECISION_REGISTER.md`.
   - The file uses **CRLF** line endings; keep them.
   - ADR-094 is reserved for Connected EDCS (CE-S0).
   - Never edit frozen baseline documents.
3. **Write a smoke test for every sprint**, in the existing style. Model it on `scripts/smoke-w4-collaboration-and-filing.mjs`.
   - Spawn the API with a temp JSON store (`VFIRM_STORE_PATH`).
   - Use local file storage: `VFIRM_FILE_STORAGE_BACKEND=local` and `VFIRM_FILE_LOCAL_DIR`.
   - Use the dev headers.
   - Add `npm run check:ce:sX-…` to `package.json`.
   - It must pass **on JSON and on a fresh, fully migrated Postgres** (`VFIRM_SMOKE_DATABASE_URL=<url>`). In Postgres mode, don't set `VFIRM_STORE_PATH`, because it forces JSON.
   - Use a free port. The W-series used 3149, 3151 and 3153.
4. **Run this regression set before handing back:**
   - `check:w1:file-storage-and-rework`, `check:w2:work-requests`, `check:w3:skill-runner`, `check:w4:collaboration-and-filing`
   - `check:hiring:cross-firm-staff-code`
   - `smoke-awia-hire-a-worker`, `smoke-awia-vs-s3/s4/s6`
   - `smoke-awia-work-assignment`, `smoke-awia-workdesk-archive`
   - `smoke-hm-s4-item2…item7`
   - `smoke-awia-firm-package-seat-gating`, `smoke-awia-hm-s2-aro01-triage-pilot`

   The legacy-roster smokes need `VFIRM_ALLOW_LEGACY_PILOT_PROVISION=true`:
   - `department-dashboards`
   - `next-implementation-bundle`
   - `staff-memory-and-conversation-workspace`
   - `r4-staging-deployment-data-protection`
   - `payroll-and-seat-billing-polish`

   **Known environmental failures** (not caused by your change):
   - `smoke-web-navigation-renderers`
   - `smoke-post-hm-s4-mvp-store-tenant-scoping-fix` (stale)
   - `sf-s3-administration` and `op-h5` (only when running from a partial copy of the repo)
5. **Every new route** needs:
   - a cross-firm isolation test;
   - an audit event via `appendEventAndAudit`;
   - its new collections added to `tenantExportCollections` in server.mjs;
   - on Postgres, a relational persistence group. Follow the `WORK_INTAKE_RELATIONAL_TABLES` pattern, with `persistWorkIntakeFromStore` and `readWorkIntakeRelational`.
6. **Click through any new UI in a browser** with zero console errors.
   - Use Playwright. In Cowork, Chromium is preinstalled under `/opt/pw-browsers`.
   - Mock `/js/auth.js` and `/api/auth/me`.
7. **At the end of each sprint, update these docs:**
   - the ADR;
   - `apps/web-console/README.md`;
   - the ticks in the sprint-plan checklist;
   - the status log in the project doc.
8. **The owner runs Windows (PowerShell).** Give him exact commands.
   - Graphify refresh is part of done, and the owner runs it:
     `& "C:\Users\user\Documents\00 AI agent\setup\build_multi_project_graphs.ps1" -Only virtual-firm`
   - It covers code only. The docs folders need an LLM API key, so warnings about them are expected.
9. **Production DB:**
   - The owner applies migrations himself in Supabase. Give him the file and the order.
   - Smoke tests must never point at production. Test firms were found in prod earlier (ADR-091 follow-up).
10. **Git:** W1–W4 changes may not be committed yet. Check `git status` and ask the owner before committing.

## 5. BizKick facts you need (verified from the Product Master)

### The register

The file is `02_Registers_and_Controls/BK-SYS-005_Smart_Transaction_Register.xlsx`.
- **Sheets:** START HERE, NUMBER DESK, TRANSACTION REGISTER, SEARCH, DASHBOARD, LISTS, REGISTER CONTROL LOG.
- **Layout of the TRANSACTION REGISTER sheet:** the header is on **row 6**, and data is on **rows 7–506**.
- **Its 24 columns:**
  1. Company Code
  2. Document Type
  3. Year
  4. Sequence
  5. **Transaction ID**
  6. Revision
  7. Date Reserved
  8. Date Issued
  9. Counterparty Type
  10. Counterparty Name
  11. Subject / Description
  12. Amount
  13. Currency
  14. Status
  15. Owner
  16. Expiry / Due Date
  17. Days to Expiry
  18. Alert
  19. Related Transaction ID
  20. Original External Ref
  21. File Link / Path
  22. Last Updated
  23. Remarks
  24. Duplicate Check
- **Formula columns:** Transaction ID, Days to Expiry, Alert and Duplicate Check are formulas.
  - The importer must read their cached values, so the file must have been saved in Excel or LibreOffice.
  - Recompute Days to Expiry and Alert in vFirm rather than trusting the cached values.

### LISTS sheet

- **Type codes:** 34, each with its module and typical counterparty. Examples: QT, SO, DO, INV, RC, CN, CMP, PR, RFQ, QC, PO, GRN, SE, PV, EC, PCV, BR, JV, EMP, LV, TS, OT, EXIT, SI, ST, SA, SCV, NDA, AGR, MIN, DEC, INC.
- **Statuses:** Reserved, Draft, Under Review, Approved, Issued, Accepted, Rejected, Expired, Completed, Cancelled, Superseded, On Hold.

### Numbering (BK-SYS-002)

- The Transaction ID format is `[CLIENT]-[TYPE]-[YEAR]-[SEQUENCE]`, with a 4-digit sequence.
- A retired number is never reused.
- A controlled master is never overwritten.
- Obsolete versions become SUPERSEDED.

### Revisions (BK-SYS-006)

- **Same offer revised:** it keeps the same ID, and the revision goes R0→R1 and onward.
- **Replacement:** it gets a new ID, with the Related Transaction ID pointing back, and the earlier row becomes Superseded.
- **Cancelled rows** are kept, and gaps are never renumbered.
- The Transaction ID is used in file names.

### Known limitation (BK-QA-002)

Two people reserving numbers at the same time can collide. That is why CE-S4 Number Authority exists.

### Master Control Workbook

The file is `BK-SYS-003_Master_Control_Workbook.xlsx`.
- **Sheets:** Document Register, Client Configuration, Responsibility Matrix, Process Map, **Approval Limits**, Access Structure, Integration Mapping, Version Log, QA Register.
- CE-S5 imports Approval Limits and Responsibility Matrix.

### Build tools

In `05_Build_Tools/`:
- `generate_client_edcs.py`
- `client_config.example.json`
- `test_branding_contamination.py`

Use them to generate the **Nexa Office Supplies (NEX)** fixture in CE-S0. Never edit the Product Master directly.

### Templates

There are 37 controlled Word and Excel files under `01_Controlled_Documents/`. Examples:
- `02_Sales_Customer/BK-SAL-001_Quotation.xlsx`, which is the first template for CE-S8;
- `04_Finance_Accounts/BK-FIN-004_Bank_Reconciliation.xlsx`.

## 6. Decisions: status

| ID | Decision | Status |
|---|---|---|
| D1 | The boundary above; write-back only as new working copies | Chosen by the owner (Track 1 first). Record it in ADR-094. |
| D2 | Start with register upload (no install) before connectors | Chosen. Record it in ADR-094. |
| D3 | vFirm as the number authority for Connected customers | **Open.** Recommended: yes. |
| D6 | Packaging under NHL Global Solution: BizKick EDCS / Connected / + Virtual Staff | **Open.** Recommended: yes. |
| D7 | Which modules send file content (HR is metadata-only by default) | **Open.** Recommended: as in the plan. |
| D8 | A "BizKick" nav group in the console | **Open.** Recommended: yes. |
| — | Production scheduler for `/automation/tick` | Decide in CE-S3. |
| — | A BizKick v1.1 "Connected edition" release | Decide in CE-S4. |

## 7. Sprint sequence (Track 1)

1. **CE-S0:** lock the contract (ADR-094).
2. **CE-S1:** register import and sync ledger (migration 0050).
3. **CE-S2:** file linking.
4. **CE-S3:** rule engine (migration 0051).
5. *Track 2's VI-S1 and VI-S2 may slot in here.*
6. **CE-S4:** Number Authority (0052).
7. **CE-S5:** Delegation of Authority (0053).
8. **CE-H1:** scale hardening.
9. **CE-S6:** connector agent (0054).
10. **CE-S7:** Graph adapter.
11. **CE-S8:** template drafting into masters.
12. **CE-S9:** pilot, evidence pack and acceptance gate.

Full scope, acceptance checks and checklists are in the sprint plan.

## 8. Your first task: CE-S0 (after the owner's go-ahead)

1. Present D3, D6, D7 and D8 to the owner and get his answers.
2. Write `docs/10_post_freeze_technical_design/CONNECTED_EDCS_INTEGRATION_CONTRACT_v1.0.md`. It should cover:
   - the canonical schema and the mapping of the 24 columns;
   - type and status mapping;
   - identity and revision rules;
   - outcome codes: CREATED, UPDATED, REVISED, UNCHANGED, REJECTED, CONFLICT, ROW_MISSING;
   - conflict rules;
   - content policy.
3. Generate the Nexa fixture pack into `scripts/fixtures/bizkick/` with BizKick's build tools.
   - Use synthetic data only.
   - Aim for about 60 rows, including: revisions, a superseded QT, a cancelled row, an overdue INV, an expiring QT and a duplicate.
   - Add sample files named with Transaction IDs.
   - Run BizKick's branding test.
4. Record ADR-094, tick the CE-S0 checklist, and report back with what the owner must review.

Then do CE-S1 (register import and sync ledger) exactly as the plan specifies. That includes the design rule to put EDCS reads and writes behind `apps/api/src/edcs-repository.mjs`, which handles JSON and direct firm-scoped Postgres. That way, register volume doesn't add to the whole-store load/save cost.

## 9. Pitfalls already learned (don't repeat them)

- **Postgres FK ordering:**
  - AWIA persistence writes tables in `AWIA_RELATIONAL_TABLES` order.
  - A conversation thread that references a workdesk item must be created in a later `withStore` than the item.
  - Take the same care with new foreign keys, e.g. `edcs_transaction_revisions` → `edcs_transactions`.
- **Firm-scoped identity:**
  - For multi-firm records, never use natural keys that aren't firm-scoped, and never use `upsertById`. Use firm-scoped keys and `upsertScopedById`.
  - The ADR-091 bug was firms overwriting each other's rows.
  - The EDCS natural key must be `(tenant, firm, transaction_id)`.
- **Whole-store load/save:** every request loads the entire database. Keep EDCS off that path by using the repository, and do CE-H1 before connectors.
- **Web console:**
  - Always run `scopeStoreToCurrentFirm()` on the `/mvp/store` response.
  - The `api.js` GET cache is cleared only on successful POSTs. Call `clearCache()` after a failed POST that changed state.
  - Bind page listeners only once per mount.
- **XLSX:**
  - Formula cells need cached values.
  - Legacy `.xls` files are refused with a clear message.
  - The reader takes the first sheet unless told otherwise. The register importer must select `TRANSACTION REGISTER` by name with header row 6, so extend `readTabularFile` with sheet-name and header-row options.
- **Smoke vs Postgres:**
  - `VFIRM_STORE_PATH` forces JSON.
  - Download routes must use `return await`.
- **Never point tests at production.**

## 10. Boundaries (don't cross these without a new owner decision)

- vFirm doesn't write to existing BizKick files or register rows.
- Conflicts are never resolved silently.
- History is never deleted when rows disappear.
- Rules and schedules only create requests. Assignment stays governed, and approval stays human.
- No accounting posting, payment, payroll, tax or MyInvois submission.
- No batch approval of Class A or regulated work.
- HR file content stays on client storage by default.
- No LLM generation; W5 needs separate authorization.
- Strict tenant isolation.

## 11. Hand-back format the owner expects

Keep it plain and concise. Cover:
- a short summary of what changed;
- smoke results on JSON and on Postgres;
- the regression list;
- the migration file(s) to apply;
- the PowerShell commands to run;
- the decisions needed;
- the next sprint.

---

## Kickoff prompt (paste into the new session)

> You are continuing the vFirm "Connected EDCS" (BizKick integration) track in the repo `C:\Users\user\Documents\00 Agent Skills\virtual-firm`. First read `docs/10_post_freeze_technical_design/HANDOFF_CONNECTED_EDCS_BIZKICK_NEXT_SESSION_v1.0.md`, then the documents it lists in §2. Do not write code yet. Summarise your understanding, confirm the current migration number and the W1–W4 state from the code, and present the CE-S0 plan and the open decisions D3, D6, D7 and D8 for my answer. I will reply "Proceed CE-S0" when ready.
