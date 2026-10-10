# Connected edition: Product Champion training addendum (CE-S9)

Version 1.0, 2026-10-12. Adds to the BizKick and vFirm training scripts (Videos 03 to 10). Use with the Video 06 product boundary and the Video 10 onboarding.

## 1. The idea in three lines

- BizKick is where the work is done and the files live. Nothing in vFirm changes that.
- The connector tells vFirm what changed. It only reads BizKick.
- vFirm keeps the governed record: the history, the numbers, who approved what.

## 2. What changes for the Product Champion

| Before (BizKick alone) | Connected edition |
|---|---|
| Number Desk sheet inside BizKick | Reserve numbers in vFirm (BizKick > Number Desk). Two people can never get the same number |
| Check the register by eye | Sync history shows every change; Conflicts shows disagreements |
| Approval limits in a workbook | Imported once; vFirm applies them when work or a draft needs approval |
| Fill a quotation by hand | BizKick > Drafting fills a copy of the master with the next number; the owner approves; you download it |

## 3. The five skills to practise

### 3.1 Reserve a number
- BizKick > Number Desk > choose the document type > reserve.
- Use the ID in the file name and the register row.
- Do not reserve "just in case". If a number is not used, void it with a reason. It is never reused.

### 3.2 Read the Sync history
- Each run shows what was added, changed, unchanged, held for conflict, and any warnings.
- A warning about an unreserved number means a row was typed without the Number Desk.

### 3.3 Decide a conflict
- A conflict means BizKick and vFirm hold different values for the same field and neither is obviously newer.
- Choose: keep BizKick's value, keep vFirm's, or keep the current one. The decision is recorded with your name.
- If BizKick still differs, a "keep current" choice is raised again at the next sync. Fix the source if BizKick is wrong.

### 3.4 Use the rules
- Rules raise work from the register (for example "invoice overdue"). Every rule starts off.
- Do a dry run first. Turn on one rule at a time. Check the work it raised.

### 3.5 Draft a document
- BizKick > Drafting. Company details are typed once by the owner.
- Fill the form: customer or supplier, issue date, item lines, notes. Press Prepare draft.
- It waits for approval. The owner, or the role the approval limits name, approves. You cannot approve your own draft unless you are the owner.
- After approval: Download. Open it in Excel. Move it into the right BizKick folder. Add its row to the register. The next sync links it and the number shows REGISTERED.
- If the connector outbox is on, the approved file also appears in `_vFirm_Outbox`. Move it from there.
- To stop a draft: Reject (approver) or Cancel (creator or owner). Type a reason. The number is voided.

## 4. Things that are by design

- Legal and HR files keep metadata only in vFirm. The file itself stays in BizKick.
- A draft never replaces a master and never overwrites an existing file.
- Money in drafts is Malaysian ringgit.
- Excel recalculates a drafted document when you open it. A previewer may show empty formula cells until then.

## 5. Practice exercise (30 minutes)

1. Reserve a quotation number.
2. Prepare a quotation draft for a fictional customer with three lines.
3. Try to download it before approval (it should be refused). Approve it. Download it.
4. Open it in Excel and check the totals.
5. Add its row to the register, sync, and watch the number turn REGISTERED.
6. Change the same row's amount in BizKick and in vFirm; decide the conflict.
7. Prepare a second draft and reject it with a reason. Look at the Number Desk: the number is voided.

## 6. Who to call

See `CE_SUPPORT_PLAYBOOK_v1.0.md`: diagnose in the order BizKick source, connector, vFirm record.

## 7. Selling it honestly (do not over-promise)

- It does not replace BizKick; it governs a record of it.
- It is a pilot-stage product: the Microsoft 365 route has not yet run against a real tenant, and drafts are Malaysian ringgit only.
- Limitations are listed in the acceptance gate.
