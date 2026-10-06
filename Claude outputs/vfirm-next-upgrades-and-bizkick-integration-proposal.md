# vFirm — Next Upgrades & BizKick EDCS Integration Proposal

**Date:** 2026-10-01
**Classification (CLAUDE.md):** Release 2 candidate / scope expansion — needs explicit owner go-ahead per item. Nothing here reopens the frozen baseline.
**Basis:** vFirm codebase after W1–W4 (ADR-089–093); BizKick EDCS v1.01 Product Master (`P02-BizKick`): release notes, QA report, manifest, BK-SYS-003 Master Control Workbook, BK-SYS-005 Smart Transaction Register, build tools; BizKick + vFirm Product Champion training scripts (Videos 02–10).

---

## 1. Where we stand

- **vFirm** = *professional expertise + governed virtual workforce + shared business infrastructure*. After W1–W4 the owner can give work with files, workers run deterministic skills or ask for what is missing, the owner approves, and the output is filed in Documents — all under human authority, audit and tenant isolation.
- **BizKick EDCS v1.01** = a file-centric control environment for SME operations: 37 controlled Word/Excel templates across 8 functions (sales, procurement, finance, HR, inventory, legal, management), a Master Control Workbook (responsibility matrix, **approval limits**, process map, integration mapping) and the **Smart Transaction Register** (stable IDs like `NEX-QT-2026-0001`, revision, status, counterparty, amount, expiry, file link — 24 columns, 500 rows).
- **The integration is already defined on paper, not in code.** The training (Videos 04–08) sets the boundary: *BizKick owns source files and the transaction trail; an Integration Bridge owns detection, identity, validation, mapping, queueing and the sync ledger; vFirm owns structured governed records, workflow, evidence, audit, memory and AWIA context. No two masters; no silent write-back.* In the vFirm codebase BizKick appears only as a service name in the NHL Global Solution firm profile — **there is no bridge yet.**
- **BizKick's own QA report names its biggest limitation:** the workbook *"cannot guarantee database-style reservation when multiple users reserve the same document type at exactly the same time."* vFirm can fix exactly that.

---

## 2. Part A — "Connected EDCS": integrating BizKick with vFirm

### A1. The idea in one line

> **BizKick stays the place where SME staff create and keep documents. vFirm becomes the place where those transactions are watched, worked on by virtual staff, approved, and remembered.** The Smart Transaction Register is the spine that joins them.

### A2. Canonical mapping (register → vFirm)

Every register row becomes one **external transaction** in vFirm, keyed by its Transaction ID (the idempotency key). Each BizKick revision (R0, R1…) becomes a revision of that transaction, and the linked file goes into the **document register built in W4** (same number, real SHA-256, revisions superseding).

| BizKick register column | vFirm field |
|---|---|
| Transaction ID (`CODE-TYPE-YEAR-SEQ`) | `external_ref` (unique per firm) + document number |
| Document Type (QT, INV, PO…) | `transaction_type` → mapping table below |
| Revision | revision label (R0 → R1 supersedes) |
| Date Reserved / Issued / Expiry-Due | dates; drive alerts and work rules |
| Counterparty Type / Name | client or supplier record (matched, never silently created twice) |
| Subject, Amount, Currency, Status, Owner | structured fields; status history kept |
| Related Transaction ID | links (QT → SO → DO → INV → RC chain) |
| Original External Ref | preserved verbatim |
| File Link / Path | `file_objects` + `document_revision_records` (hash-fingerprinted) |

| BizKick type | Becomes in vFirm | Who works on it (existing skills) |
|---|---|---|
| QT, CC-002 Proposal | quotation / proposal record (NHL Q1–Q6 quotation cases already exist) | Sales Coordinator — follow-up drafts, SAO-03 lead scoring |
| SO, DO, INV, RC, CN | sales chain + receivables | Bookkeeper — receivables follow-up; aging |
| PR, RFQ, QC, PO, GRN, SE | procurement chain + payables | Bookkeeper — payables prep; 3-way match (PO ↔ GRN ↔ invoice) |
| BR (BK-FIN-004), PV, EC, PCV, JV | finance records | Bookkeeper — **FAO-11 reconciliation runs directly on the bank-rec workbook** |
| EMP, Offer (HR-002), LV, TS, OT, EXIT | HR records (HR_RESTRICTED) | HR Administrator — **ARO-10 onboarding** (Class A) |
| CMP (complaint) | admin request | General Clerk — **ARO-01 triage** |
| MIN, DEC, INC | management decision / incident log | Owner; business memory |

### A3. What the integration makes possible (the payoff)

1. **Register-driven work (BizKick becomes a front door).** Owner-configured rules turn register events into W2 work requests automatically — e.g. *quotation Issued and expiring in 3 days → Sales Coordinator: draft follow-up*; *invoice past due → Bookkeeper: collections draft*; *GRN with no matching PO → Bookkeeper: exception*; *new BR row with statement attached → Bookkeeper: reconcile*. Every rule only *creates a request*; assignment, review and approval stay human.
2. **Number Authority — fixes BizKick's known limitation.** vFirm offers an atomic "reserve next number" service (per firm, per type, per year, database-backed). BizKick users reserve from a small vFirm page (or via the bridge) instead of guessing in NUMBER DESK; the bridge then flags any register row whose ID was never reserved or is duplicated. This is the natural "BizKick v1.1 Connected edition".
3. **Delegation of Authority from the Master Control Workbook.** Import BK-SYS-003 *Approval Limits* and *Responsibility Matrix* into vFirm as the firm's approval policy: a PO above Tier 1 needs the Tier 2 approver before a worker's draft can be approved; the right reviewer is chosen automatically. The rules come from the client's own controlled workbook — no re-keying.
4. **Governed drafting back into BizKick, as new files only.** A worker can prepare a *new working copy* from a BizKick controlled master (e.g. fill BK-SAL-001 Quotation with a reserved ID), the owner approves it in vFirm, and it is delivered as a file to the BizKick folder. vFirm never edits an existing BizKick source file — this matches the training's "no unrestricted write-back" rule.
5. **One owner view.** The Dashboard "Needs you" tray gains BizKick signals (expiring quotations, overdue invoices, unmatched GRNs, duplicates), and every transaction has a full history in Documents and in business memory.

### A4. The bridge — built in steps, cheapest first

| Step | What | Why first |
|---|---|---|
| **K1 Register import (no install)** | Owner uploads `BK-SYS-005_Smart_Transaction_Register.xlsx` in vFirm; the W3 XLSX reader parses the 24 columns; idempotent upsert by Transaction ID; a **sync ledger** shows created / updated / unchanged / rejected rows with reasons. | Zero infrastructure; proves the mapping on real client data; reuses W3 + W4. |
| **K2 File linking** | Upload or link the files referenced in "File Link / Path"; fingerprint; file into the document register as revisions. | Turns the register into a reconstructable history. |
| **K3 Register-driven work rules** | Rule editor (type + status + date condition → request type + worker). Runs on each import/sync. | The visible value for the owner. |
| **K4 Connector agent** | Small Node agent for **Topology A (single PC)** and **C (NAS/server)**: watches the BizKick folder, sends changed register rows + file fingerprints to vFirm with a firm-scoped token; queue + retry; nothing leaves except what the mapping allows. **Topology B (OneDrive/SharePoint)** via a Microsoft Graph adapter. | Same contract as K1, now continuous. |
| **K5 Number Authority + DoA import** | Atomic reservation API + page; import of Approval Limits / Responsibility Matrix as policy. | Fixes BizKick's documented weakness; enforces the client's own rules. |
| **K6 Governed drafting into masters** | Worker fills BizKick controlled templates as new working copies; owner-approved; delivered as files. | Closes the loop without two masters. |

**Bridge rules (from the training, made enforceable):** stable ID decides create vs update; a changed fingerprint with the same ID = revision, not a new transaction; conflicting/ambiguous changes are **held for the owner**, never last-write-wins; every sync event is in the ledger and the audit trail; everything stays inside the client's own tenant/firm.

### A5. Packaging (for NHL Global Solution as the delivering firm)

| Tier | Customer gets |
|---|---|
| **BizKick EDCS** (today) | Controlled templates + Smart Register, files only |
| **BizKick Connected** | + vFirm register sync, Number Authority, dashboards, document history, audit |
| **BizKick + Virtual Staff** | + hired workers acting on BizKick transactions (follow-ups, reconciliations, onboarding checklists, triage) under the client's own approval limits |

NHL Global Solution already exists in vFirm as an organisation-support firm offering "BizKick EDCS" as a service — Connected EDCS becomes its productised delivery.

---

## 3. Part B — Fresh vFirm improvements (aligned with the purpose)

Each idea strengthens one leg of *expertise + virtual workforce + shared infrastructure* without weakening human authority.

### B1. Standing Instructions — the firm's operating rhythm
The owner sets recurring work once: *"1st of each month: Bookkeeper reconciles last month (bank statement from BizKick BR)"*, *"every Monday: receivables follow-up list"*, *"quarterly: supplier evaluation"*. vFirm creates the work request on schedule with the inputs pre-attached (from the BizKick sync or the Documents page), and asks for anything missing via W4 "needs info". **Why:** a virtual firm should run between the owner's decisions, not only when the owner remembers to ask. **Builds on:** W2 requests, W3 runner, W4 needs-info; the scheduler only creates requests.

### B2. Trust Ladder — authority earned per worker and per skill
Each worker-skill pair moves through visible stages: **Shadow** (worker runs alongside the human, outputs compared, nothing used) → **Supervised** (today's model) → **Proven** (track record shown: approval rate, revision rate, needs-info rate over N jobs). "Proven" may unlock **explicit batch approval** for low-risk Class B skills (the owner approves 10 reconciliations in one attributable decision). It never removes approval, never applies to Class A or regulated work, and drops back automatically on a rejection. **Why:** AI capability does not create authority — evidence does, and the owner sees it. **Builds on:** drafts/reviews/audit data that already exist. *Needs its own ADR because it touches review UX.*

### B3. Owner Morning Brief (VF-13 firm intelligence)
A deterministic one-page brief each morning: what needs you, what is due or overdue (requests and BizKick transactions), cash signals (receivables aging, unreconciled months), worker throughput, and exceptions (duplicate numbers, unmatched GRNs). Delivered in the console (later email/WhatsApp). No LLM needed; every line links to the record. **Why:** the owner is the human authority — give them the firm's state in two minutes.

### B4. Evidence Passport — a verifiable dossier on demand
One click produces a sealed bundle for a bank loan, tender, auditor or due-diligence request: selected documents, their revision history, approvals and audit trail, with a SHA-256 manifest so the recipient can verify nothing changed. **Why:** it turns vFirm's evidence and audit discipline into something SMEs can *use* — financing and tenders are where weak records cost money. **Builds on:** W4 document register, file hashes, export package (data-portability principle).

### B5. e-Invoice readiness check (Malaysia, MyInvois) — draft only
Check BizKick/vFirm invoices for the fields LHDN e-invoicing requires and flag gaps before the owner submits through their own channel; optional monthly consolidated summary. vFirm does **not** submit to LHDN. **Why:** Phase 4 (businesses up to RM5m) started 1 Jan 2026, with relaxation periods and exemption thresholds that have been revised more than once (recent reports cite an exemption threshold raised to RM3m from 1 Sep 2026; earlier guidance said RM1m). **The rules are moving — confirm current LHDN guidance before building or selling this.** Deterministic validator, same pattern as the W3 skills.

### B6. Worker scorecards and cost-to-serve
Per worker and skill: jobs done, time to draft, approval/revision/needs-info rates, inputs most often missing; per client: work volume vs. what they pay. **Why:** tells the owner which skills need better inputs, which workers earn trust (feeds B2), and which clients are under-priced — practice economics, not just activity. **Builds on:** existing seat billing, drafts, reviews, threads.

---

## 4. Recommended sequence

| Order | Item | Size | Depends on |
|---|---|---|---|
| 1 | **K1 Register import + sync ledger** | M | W3 reader, W4 register |
| 2 | **K2 File linking** | S | K1 |
| 3 | **K3 Register-driven work rules** + **B1 Standing Instructions** (same rule/scheduler engine) | M | K1, W2–W4 |
| 4 | **B3 Owner Morning Brief** | S | K1 (for BizKick signals) |
| 5 | **K5 Number Authority + DoA import** | M | K1 |
| 6 | **K4 Connector agent** (local/NAS, then Graph for OneDrive/SharePoint) | L | K1–K3 contract stable |
| 7 | **B4 Evidence Passport** | M | W4 |
| 8 | **B6 Scorecards** → **B2 Trust Ladder** (ADR) | M + M | review data |
| 9 | **K6 Governed drafting into BizKick masters** | M | K5 |
| 10 | **B5 e-Invoice readiness** | M | current LHDN rules confirmed |

The first three steps need no installation at the customer and reuse what W1–W4 built.

---

## 5. Decisions needed

- **D1 — Integration model:** adopt the training's boundary (BizKick = source, Bridge = contract, vFirm = governed record; no two masters; write-back only as new working copies)? *Recommended.*
- **D2 — Start point:** begin with K1 (register upload, no install) before any connector agent? *Recommended.*
- **D3 — Number Authority:** make vFirm the reservation authority for Connected customers (BizKick v1.1 change), or keep NUMBER DESK and only detect duplicates?
- **D4 — Which fresh ideas to schedule:** B1–B6, and in what order.
- **D5 — Trust Ladder (B2):** acceptable in principle that "Proven" low-risk Class B skills may get explicit batch approval (never Class A, never regulated, never silent)?
- **D6 — Commercial:** package as BizKick Connected / BizKick + Virtual Staff under NHL Global Solution?

---

## 6. Risks and guardrails

- **Two masters by accident:** the bridge never edits BizKick sources; conflicts are held, not resolved silently.
- **Personal data:** HR and payroll files stay HR_RESTRICTED / FINANCE_RESTRICTED; the mapping decides which fields leave the client's storage.
- **Tenant isolation:** connector tokens are firm-scoped; every synced record is checked against tenant/firm.
- **Over-selling:** BizKick is not an ERP, accounting, payroll or tax engine; vFirm drafts, the human approves (training Videos 03 and 05).
- **Moving regulations:** B5 depends on current LHDN rules — verify first.
- **Scale:** the whole-store load/save performance issue (an open follow-up in the decision register) will matter once BizKick sync adds hundreds of rows per firm — schedule it before K4.

---

**Sources for B5:** [ClearTax — e-Invoice phases and relaxation period](https://www.cleartax.com/my/en/different-phases-implementation-timelines-einvoicing-malaysia) · [EasyInvoice — LHDN e-Invoice 2026 guide](https://www.easyinvoice.my/blog/en/lhdn-einvoice-malaysia-2026)
