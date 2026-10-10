# BizKick v1.1 (Connected edition): release notes and QA checklist, DRAFT

Version 1.0 draft, 2026-10-12. For the product owner to review. This file lives in the vFirm repo; copy it into the BizKick release folder when approved. Nothing here changes a BizKick file.

## 1. What is new in v1.1

- **Connected edition (optional).** BizKick works exactly as before without vFirm. When connected, a small program reads the register and controlled folders and tells vFirm what changed.
- **Number Desk:** BizKick's NUMBER DESK sheet carries a note that, in the Connected edition, numbers are reserved in vFirm so two people never get the same one. Standalone BizKick keeps using the sheet.
- **Register tolerance:** day-month-year dates such as 01-09-26 and 01/09/2026 are read as day first.
- **Outbox:** new documents prepared in vFirm can be delivered to a `_vFirm_Outbox` folder next to BizKick. It is the only place the connector writes.

## 2. What did not change

- All controlled masters (Quotation, Invoice, Purchase Order and the rest). vFirm fills copies; it never edits them.
- Folder structure, numbering standard (BK-SYS-006) and the register layout.
- Standalone use. No setting is needed to keep BizKick standalone.

## 3. Known limitations

- Draft documents: Quotation, Invoice and Purchase Order only; Malaysian ringgit only.
- Microsoft 365 route: read-only and tested against a simulated Microsoft; real-tenant test pending.
- Mixing day-first and month-first dates in one register gives wrong dates. Use one convention.
- Previewers may show blank formula cells in drafted documents until opened in Excel.

## 4. QA checklist (tick when done on the release candidate)

Standalone (no vFirm):

- [ ] BizKick opens, all sheets calculate, no error cells.
- [ ] Number Desk sheet still issues numbers; the Connected-edition note is present and does not break formulas.
- [ ] Register accepts a row with a day-month-year date.
- [ ] All controlled masters are unchanged (compare file hashes to v1.01).

Connected:

- [ ] Connector installed on a clean PC from the package; heartbeat shows in vFirm.
- [ ] First sync: row counts match; HR and Legal files are metadata only.
- [ ] A changed row reaches vFirm once; offline then reconnect gives no duplicates.
- [ ] A drafted Quotation opens in Excel with the logo, layout and correct totals, and its number turns REGISTERED after the register row is added.
- [ ] The connector never wrote outside `_vFirm_Outbox` (check folder timestamps).
- [ ] The evidence pack passes on the release commit.

Sign-off: ____________________  Date: ____________
