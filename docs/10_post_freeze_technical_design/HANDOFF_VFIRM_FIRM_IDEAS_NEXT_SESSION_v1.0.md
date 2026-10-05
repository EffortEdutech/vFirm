# Handoff: vFirm new ideas (Track 2, VI-S1 to VI-S6), next session

Date: 2026-10-05
From: Claude, the Cowork session that delivered W1–W4, the proposal and the sprint plan
To: Codex, or a new Cowork/Claude session
Product owner: eff (NHL Global Solution / myeffort.studio)
Status: **Planned, not started.** The owner chose to build Connected EDCS (Track 1) **first**. Track 2 starts after CE-S3, and only when the owner says "Proceed VI-Sx". He usually adds "Bismillah".
Companion handoff: `HANDOFF_CONNECTED_EDCS_BIZKICK_NEXT_SESSION_v1.0.md`. It holds the shared working rules, pitfalls and regression list in full; read §4 and §9 there too.

---

## 1. Mission

Make vFirm feel like a real firm that runs itself under the owner's authority. It should:
- do recurring work on time;
- tell the owner each morning what matters;
- prove its work to outsiders;
- show which hired workers are good at what;
- let a worker earn more trust only through evidence.

None of these ideas weakens the core principles:
- human authority;
- no silent approval;
- deterministic engines, with no LLM in these sprints;
- tenant isolation;
- data portability.

## 2. Read these first

| # | Document | Where |
|---|---|---|
| 1 | `AGENTS.md`, `CLAUDE.md`, `docs/AI_WORKSPACE_CONTEXT.md` | repo root / `docs/` |
| 2 | **Sprint plan**, §3 "Track 2", §4 "Definition of Done", **§6 "Track 2 — detailed sprint plan"**, §7 "Master checklist", §8 "Risks" | `docs/10_post_freeze_technical_design/VFIRM_CONNECTED_EDCS_AND_FIRM_IDEAS_SPRINT_PLAN_AND_CHECKLIST_v1.0.md` (project doc `claude/connected-edcs-and-firm-ideas-sprint-plan.md`) |
| 3 | Proposal, section B: ideas B1–B6 and their rationale | project doc `claude/vfirm-next-upgrades-and-bizkick-integration-proposal.md` |
| 4 | ADR-089 to ADR-093 (W1–W4) | `docs/00_project_control/DECISION_REGISTER.md` (CRLF) |
| 5 | CE-S3 section of the sprint plan (the rule engine VI-S1 builds on) and the ADR that CE-S3 will add | same plan, §5 |

## 3. The six sprints at a glance

| Sprint | Proposal ref | Builds on | Planned tables | Check script |
|---|---|---|---|---|
| **VI-S1 Standing Instructions** | B1 | **CE-S3** rule engine (`automation_rules`, `/automation/tick`); W2 work requests; W4 NEEDS_INFO; W4 Documents | `SCHEDULE` trigger on `automation_rules`; no new table expected | `check:vi:s1-standing-instructions` |
| **VI-S2 Owner Morning Brief** | B3 | W4 "Needs you" tray; work requests; workdesk; EDCS transactions (CE-S1) for cash signals; CE-S3 rule runs | `firm_briefs` | `check:vi:s2-morning-brief` |
| **VI-S3 Evidence Passport** | B4 | W1 file storage (SHA-256); W4 document register and revisions; approvals and review records; audit events; EDCS sync events | `evidence_passports` | `check:vi:s3-evidence-passport` |
| **VI-S4 Worker Scorecards and cost-to-serve** | B6 | Workdesk item history (assign → draft → review → REWORK → approve), NEEDS_INFO events, invoices | none planned (computed); add a snapshot only if needed | `check:vi:s4-scorecards` |
| **VI-S5 Trust Ladder** | B2 | VI-S4 metrics; review/approval path; Class A/B rules | `trust_ladder_states` | `check:vi:s5-trust-ladder` |
| **VI-S6 e-Invoice readiness** | B5 | EDCS INV transactions; vFirm invoices; tabular reader | none planned (validator plus results on the run) | `check:vi:s6-einvoice-readiness` |

### Migration numbering

- The plan places Track 2 tables in **0055**.
- The **real** number is whatever is next free when the sprint starts. Check `infra/database/migrations/` first; today the latest is `0049_work_requests.sql`.
- If VI-S2 runs before CE-S4 (see the order below), its table will get an earlier number.
- Give each sprint its own migration file. Don't bundle everything into 0055.

### Recommended order

1. **Track 1, first part:** CE-S0 → CE-S1 → CE-S2 → CE-S3.
2. **VI-S1 and VI-S2:** cheap wins on the new engine.
3. **Track 1, second part:** CE-S4 → CE-S5 → CE-H1 → CE-S6 → CE-S7 → CE-S8 → CE-S9.
4. **The rest of Track 2:** VI-S3 → VI-S4 → VI-S5 → VI-S6.

The owner may reorder.
- **VI-S3 and VI-S4 have no hard dependency on BizKick.** They could run earlier if he asks; the EDCS parts would then be added later.
- **VI-S1 cannot start before CE-S3.** It extends the CE-S3 rule engine. If the owner wants VI-S1 first, the engine must be built inside VI-S1 under the CE-S3 design, so it doesn't get built twice.

## 4. Sprint essentials (full scope and acceptance in plan §6)

### VI-S1: Standing Instructions

**Trigger:** a `SCHEDULE` trigger on the CE-S3 engine.
- Frequencies: daily, weekly, monthly or quarterly, plus day-of-month.
- Business-day handling, using a configurable Malaysian public-holiday list.
- Time zone `Asia/Kuala_Lumpur`.

**Action:** create a W2 work request with a title template that includes the period.

**Input resolvers:**
- the latest document of a type or tag;
- BizKick transactions of a type in the period;
- none.

**Behaviour:**
- When an input is missing, the request is still created, and the worker's run raises W4 NEEDS_INFO.
- Pause/resume, skip next and run now are available.
- A history of generated requests is kept.

**Idempotent:** exactly one request per period, using the CE-S3 dedupe key.

**Templates:**
- monthly bank reconciliation (FAO-11);
- weekly receivables follow-up;
- quarterly supplier evaluation;
- monthly management summary.

### VI-S2: Owner Morning Brief

**Sections:**
- Needs you;
- due and overdue (requests plus BizKick);
- cash signals: aging from INV/RC, and unreconciled months from BR;
- yesterday's throughput;
- exceptions: conflicts, duplicates, missing links;
- standing instructions due today.

**Delivery:**
- A console page "Today", plus a daily snapshot stored in `firm_briefs`.
- Every line links to its record.
- **Deterministic:** the same data always produces the same brief.
- Email and WhatsApp delivery are **deferred**; they need a provider decision and consent.

### VI-S3: Evidence Passport

**Gathering:**
- The owner picks the scope (client, project, period, transaction chain or document list) and the purpose.
- A preview is shown before anything is bundled.
- HR and finance-restricted items need explicit inclusion, which is audited.

**The zip contains:**
- the documents;
- `manifest.json`: files, SHA-256, revisions, approvals with approver and time, and sync events;
- an audit extract;
- a cover page;
- an offline `verify.html` that recomputes the hashes with WebCrypto, so no account is needed.

**After bundling:**
- The bundle is stored as a file object, and a passport record and audit event are written.
- Re-downloading the bundle verifies it again.

### VI-S4: Worker Scorecards and cost-to-serve

**Per worker and skill, for a chosen period:**
- jobs;
- median time to draft;
- first-pass approval rate, revision rate and rejection rate;
- needs-info rate, and the inputs most often missing.

**Per client:** effort against invoiced amount.

**Where it shows:** on My Team and on Clients.

**Limits:**
- Only virtual workers are measured. **No performance profiling of human staff.**
- Use only the firm's own data.

### VI-S5: Trust Ladder

**Gate:** start only after decision **D5** and its **own ADR**.

**Stages per worker-skill:**
- **Shadow:** outputs are compared with the human's and never delivered.
- **Supervised:** today's model.
- **Proven:** reached by meeting owner-set thresholds over N jobs, taken from VI-S4.

**Batch approval:** **explicit** and for **Proven + Class B only**.
- It is one attributable owner decision.
- Each draft still gets its own review record that references the batch.

**Demotion:** automatic, on a rejection or on revisions beyond the threshold.

**Excluded by rule:** Class A and regulated work.

### VI-S6: e-Invoice readiness check

**Gate:** before starting, **confirm the current LHDN e-Invoice Guideline and the MyInvois field specification**.
- Check the phase or threshold that applies to target customers.
- Check the relaxation-period rules. Sources disagree on the exemption threshold (RM1m vs RM3m).
- Use web search for the official LHDN pages, and record the confirmed source in the ADR.

**The validator:**
- Deterministic.
- Checks BizKick INV transactions and vFirm invoices against the required fields.
- Produces flags and a fix list.
- Can optionally draft the monthly consolidated summary.

**Draft only:** **no submission to MyInvois exists in code.**

## 5. Decisions: status

| ID | Decision | Status |
|---|---|---|
| — | Track order: Connected EDCS first, then ideas | **Chosen** by the owner |
| — | Production scheduler for ticks | Decided in CE-S3; VI-S1 reuses it |
| D5 | Trust Ladder: stages, thresholds, batch approval for Proven Class B | **Open.** Needs owner decision and its own ADR before VI-S5. |
| — | Morning Brief external delivery (email/WhatsApp provider, consent) | **Open, deferred.** Console only until decided. |
| — | Current LHDN spec | **Open.** Must be confirmed before VI-S6. |

**ADR numbering:** ADR-094 is reserved for Connected EDCS. Take the next free ADR number for each VI sprint, and confirm it in the register first.

## 6. Current codebase you will use

See §3 of the companion handoff for the full table. The key pieces for Track 2 are:

**Work requests**
- Store functions: `createWorkRequestRecord`, `prepareWorkRequestAssignment`, `assignAwiaVirtualStaffTaskRecord`.
- Request types: `packages/core-domain/src/awia-work-request-types.mjs`.

**Skill runner and NEEDS_INFO**
- Skill runner: `packages/core-domain/src/awia-skill-runner.mjs`. Missing inputs give 422 `SKILL_INPUT_REQUIRED`, which becomes NEEDS_INFO.
- Threads: `postWorkdeskItemMessageRecord`, `ensureItemThread`, `resumeFromNeedsInfo`.

**Documents and files**
- Document register: `registerFileDocumentRecord`, `reviseFileDocumentRecord`, `fileWorkdeskOutputToRegister`, plus the `document_register_entries` and `document_revision_records` tables. This is the input for the Evidence Passport.
- File storage: `apps/api/src/file-storage.mjs`, with SHA-256 on every upload and `file:<id>` references.
- Tabular reader: `packages/core-domain/src/tabular-file-reader.mjs`, for CSV/XLSX and the `toCsv` export with formula neutralisation.

**Status helpers:** `effectiveWorkdeskStatus` and `WITH_WORKER_STATUSES` in store.mjs. The brief and the scorecards must use these rather than raw status strings.

**Console**
- Files: `apps/web-console/public/js/pages-owner.js` (Dashboard `needsYouTiles`, Team, Workdesk, Projects, Documents), `nav.js`, `main.js` (`vfirm:navigate`), `request-drawer.js`, `api.js`.
- Patterns to follow:
  - run `scopeStoreToCurrentFirm()`;
  - bind listeners once per mount;
  - call `clearCache()` after a failed POST.

**Persistence and audit**
- Postgres group pattern: `WORK_INTAKE_RELATIONAL_TABLES`, `persistWorkIntakeFromStore`, `readWorkIntakeRelational`.
- Exports: add new collections to `tenantExportCollections`.
- Audit: `appendEventAndAudit`.

**Check the actual current state** with `git log` and `git status`. Track 1 sprints will have added `edcs-repository.mjs` and the rule engine by the time Track 2 starts.

## 7. Working rules (summary; full list in the companion handoff §4)

**Process**
- One sprint at a time, with explicit "Proceed VI-Sx". Classify the work as a Release 2 candidate / user-approved scope expansion.
- Record an ADR in `DECISION_REGISTER.md` (CRLF). Never edit frozen baseline docs.

**Testing**
- Write a smoke test in the W-series style and add `npm run check:vi:sX-…`. It must pass on **JSON and fresh Postgres** (`VFIRM_SMOKE_DATABASE_URL`).
- Run the full regression list from the companion handoff before handing back.
- Every new route needs a cross-firm isolation test, an audit event, export coverage and Postgres persistence.
- Click through the UI in a browser with zero console errors.

**Docs and delivery**
- At the end of each sprint, update the ADR, the console README, the plan checklist ticks and the project doc status log.
- The owner is on Windows (PowerShell). Give him exact commands and the migration files to apply in Supabase himself.
- Graphify refresh is part of done:
  `& "C:\Users\user\Documents\00 AI agent\setup\build_multi_project_graphs.ps1" -Only virtual-firm`
- Never point tests at production.

## 8. Pitfalls specific to Track 2

- **Idempotency of scheduled work:**
  - Use the dedupe key per instruction and period. Test repeated ticks and catch-up after downtime: missed periods create one request each, never a flood.
  - Pick a clear rule for backfill, for example "create only the most recent missed period". Put that rule in the ADR.
- **Time zone and business days:**
  - Compute periods in `Asia/Kuala_Lumpur`, not UTC. Month-end and public-holiday shifts must be covered by tests.
  - The holiday list is configuration data. Never fetch it at runtime.
- **Determinism of the brief and scorecards:**
  - Avoid `Date.now()` inside calculations. Pass "as of" in, so fixtures give fixed numbers.
  - Sort output with stable ordering.
- **Passport integrity:**
  - Hash the exact bytes stored in file storage, not re-encoded copies.
  - `verify.html` must work offline with no external scripts.
  - Neutralise any CSV in the bundle with `toCsv`.
  - Restricted items must be excluded by default.
- **Scorecard ethics:** report on virtual workers only. Don't build anything that ranks human employees, and don't produce personality inferences.
- **Trust Ladder safety:**
  - Batch approval must still write one review record per draft.
  - The Class A and regulated exclusions must be enforced on the server, not just hidden in the UI.
- **Whole-store load/save:** brief and scorecard queries over long histories can get heavy. Compute from firm-scoped data, and prefer snapshot tables over recomputing on every page load.
- **e-Invoice regulation drift:**
  - Don't hard-code thresholds without a dated source in the ADR.
  - Never add any submission or transmission code.

## 9. Boundaries

**Rules and schedules**
- They create requests only.
- Assignment stays governed and approval stays human.
- Class A always needs the owner.

**Batch approval**
- Only under VI-S5, after D5, and only for Proven + Class B.
- Never implicit.

**Other boundaries**
- No accounting posting, payment, payroll, tax filing or MyInvois submission.
- No external messaging (email/WhatsApp) without a provider decision and consent.
- No LLM generation; W5 needs separate authorization.
- No human-staff performance profiling.
- Strict tenant isolation everywhere, including passports and briefs.

## 10. Hand-back format the owner expects

Keep it plain and concise. Cover:
- a short summary;
- smoke results on JSON and Postgres;
- the regression list;
- the migrations to apply;
- the PowerShell commands;
- the decisions needed;
- the next sprint.

---

## Kickoff prompt (paste into the new session)

> You are continuing the vFirm "Firm ideas" track (Track 2: VI-S1 Standing Instructions, VI-S2 Morning Brief, VI-S3 Evidence Passport, VI-S4 Scorecards, VI-S5 Trust Ladder, VI-S6 e-Invoice readiness) in the repo `C:\Users\user\Documents\00 Agent Skills\virtual-firm`. First read `docs/10_post_freeze_technical_design/HANDOFF_VFIRM_FIRM_IDEAS_NEXT_SESSION_v1.0.md` and the companion `HANDOFF_CONNECTED_EDCS_BIZKICK_NEXT_SESSION_v1.0.md`, then the documents they list. Do not write code yet. Check from the code and the Decision Register how far Connected EDCS has progressed (especially whether the CE-S3 rule engine exists), confirm the next free migration and ADR numbers, and propose which VI sprint to start and its plan. I will reply "Proceed VI-Sx" when ready.
