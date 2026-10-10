# Connected EDCS: pilot plan and log (CE-S9)

Version 1.0, 2026-10-12. Owner: the product owner (eff, NHL Global Solution).

Purpose: prove Connected EDCS on real use before it is offered to a customer. Phase A is mandatory. Phase B needs a friendly customer who has agreed.

Golden rule for the whole pilot: BizKick is the source, the Bridge is the contract, vFirm is the governed record. vFirm never edits a BizKick file.

---

## 1. Rules of the pilot

- Use a separate pilot firm in vFirm. Never the firm that holds real client data.
- Phase A uses the test company code (NEX). A real code is used only in Phase B, chosen with the customer. It cannot be changed once transactions exist.
- Minimum length: 14 days in a row, with at least one working session each working day.
- Nothing is "fixed by hand" in the database. Write the problem in the log first, then decide the fix.
- Never paste a token, password or key into chat or into this log.

## 2. What counts as a data-integrity issue

Any case where vFirm's record and BizKick's register disagree and nobody chose that, or a number or file is lost or doubled. Examples:

- Two documents with the same transaction number.
- A register row that disappeared after a sync.
- A file attached to the wrong transaction.
- A drafted document released before approval.
- A BizKick file changed or overwritten by vFirm or the connector.
- One firm seeing another firm's data.

Severity:

- **S1 Stop:** any data-integrity issue. Stop that day, record it, tell the product owner. The 14-day count restarts after the fix is verified.
- **S2 Fix soon:** wrong wording, slow page, confusing message. The pilot continues.
- **S3 Idea:** nice to have.

"Unresolved" means the issue has no recorded cause and no verified fix.

## 3. Phase A: internal pilot (NHL Global Solution, Nexa fixture)

### 3.1 Set up (day 0)

Follow `CE_S6_WINDOWS_MANUAL_TEST_v1.0.md` for the connector and the local test kit. Then:

- [ ] Pilot firm exists in vFirm; the owner can sign in.
- [ ] BizKick > Connection: company code NEX; content policy as agreed (Inventory full content, Legal and HR metadata only).
- [ ] Connector installed on the pilot PC; heartbeat shows on BizKick > Connector.
- [ ] Import the Nexa register once. Count rows in BizKick and in vFirm: they match.
- [ ] Approval limits imported from the Master Control Workbook; every mapping confirmed.
- [ ] Company details typed once on BizKick > Drafting.
- [ ] Optional: `outbox_enabled: true` in the connector config, to pilot the outbox.

### 3.2 Daily routine (about 15 minutes)

Do these in order. They follow the support diagnosis order: BizKick source, then connector, then vFirm record.

1. **BizKick source:** add or change one or two rows in the register (a new quotation, a status change). Save.
2. **Connector:** BizKick > Connector shows a recent heartbeat; the queue is empty or draining; no error line.
3. **vFirm record:** BizKick > Sync history shows the new run; the changed row shows on Transactions; Conflicts is empty or each conflict has been decided.
4. **Number Desk:** reserve one number; the next one is different; after import it turns REGISTERED.
5. **Files:** drop one file named with a Transaction ID into a controlled folder; it links to the right transaction.
6. **Log it** (section 5). One line per item is enough.

### 3.3 Weekly tests (once in week 1, again in week 2)

- [ ] **Offline test:** cut the PC's network, change two rows, reconnect. Each change arrives once, no duplicates.
- [ ] **Conflict test:** change the same row's amount in BizKick and in vFirm. A conflict is raised; decide it; the audit shows who decided.
- [ ] **Drafting test:** prepare a Quotation. It cannot be downloaded before approval. Approve it as owner and download it. **Open it in Excel on the pilot PC:** logo, layout, formulas and totals look right, no error cells. Move it into the BizKick folder, add its row to the register, sync: the number turns REGISTERED.
- [ ] **Approval limit test:** prepare a Purchase Order above the Tier 1 limit. A non-owner without the right role is refused; the refusal shows in the audit.
- [ ] **Reject test:** reject a draft with a reason. The number is voided and is not issued again.
- [ ] **Rules test:** turn on one rule after a dry run. It raises each piece of work once. Turn it off again.
- [ ] **Revoke test:** rotate a connector token; the old one is refused; the new one works.
- [ ] **Export test:** export the firm's data. It opens, holds the records, and holds no file bytes.
- [ ] **Isolation test:** sign in to a second firm. It sees none of the pilot firm's transactions, files, drafts or numbers.

### 3.4 Exit criteria for Phase A

- [ ] 14 working days logged.
- [ ] Every weekly test done at least once, with a result.
- [ ] No unresolved S1 issue.
- [ ] The evidence pack (`npm run ce:evidence-pack`) was run on the final commit and every check passes.
- [ ] One generated document was opened in Excel by a person and judged usable.

## 4. Phase B: one friendly customer

Do not start until Phase A has passed.

### 4.1 Choosing the customer

- A business already using BizKick (or willing to start), friendly, tolerant of small hiccups.
- Agrees in writing to the content policy, the pilot length (minimum 14 days) and that this is a pilot.
- Has one person who will act as Product Champion.

### 4.2 Choosing the topology (Video 10 onboarding checklist)

- **A. BizKick on one PC:** connector on that PC. Simple and offline-tolerant. Choose when the folder is local.
- **B. BizKick in OneDrive or SharePoint:** the Microsoft 365 adapter (read-only, one folder, Sites.Selected). Needs the customer's IT admin. Follow `CE_S7_MICROSOFT_365_ENTRA_SETUP_GUIDE_v1.0.md`. The real-tenant test has not been done yet: do it first on a test folder.
- **C. BizKick on a NAS or file server:** connector on a PC that can reach the share. Check the network path works before installing.

Choice: Customer ____________________  Topology ____  Date ____________

### 4.3 Customer checklist

- [ ] Customer firm created in vFirm; real company code chosen with the customer (three capital letters, same code in BizKick).
- [ ] Content policy agreed and set before the first sync.
- [ ] Paid Vercel plan in place before real client data. Per-route role audit and rate limiting either done or accepted as limitations in the gate.
- [ ] Champion trained with `CE_PRODUCT_CHAMPION_TRAINING_ADDENDUM_v1.0.md`.
- [ ] Support contacts agreed (`CE_SUPPORT_PLAYBOOK_v1.0.md`).
- [ ] Same daily routine and weekly tests as Phase A, for 14 days.

## 5. Pilot log

One row per entry. Keep it short. Copy the table into a spreadsheet if easier.

| Date | Phase (A/B) | Who | What was done | Result (OK / issue) | Issue ID | Severity (S1/S2/S3) | Status (open / fixed / verified) |
|---|---|---|---|---|---|---|---|
| | | | | | | | |
| | | | | | | | |
| | | | | | | | |

### Issue sheet (one per S1 or S2)

- Issue ID:
- Date and who found it:
- What happened (steps):
- What was expected:
- Which layer: BizKick source / connector or bridge / vFirm record
- Transaction ID(s):
- Cause (once known):
- Fix, and who verified it:
- Date closed:

## 6. Pilot sign-off (feeds the acceptance gate)

| Item | Phase A | Phase B |
|---|---|---|
| Days run | | |
| Weekly tests passed | | |
| S1 issues (total / unresolved) | | |
| S2 issues (total / open) | | |
| Excel open-test done by | | |
| Evidence pack commit | | |
| Product owner initials and date | | |
