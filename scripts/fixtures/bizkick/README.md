# BizKick fixture pack - Nexa Office Supplies (NEX)

**All data here is synthetic.** Nexa Office Supplies is a made-up client. Names, amounts and
documents are invented for testing the Connected EDCS importer (ADR-094, sprint CE-S0). No real
client data may be added to this folder.

## What is in the pack

| File | Purpose |
|---|---|
| `register_01_baseline.xlsx` | 57 rows. 55 valid transactions plus 2 deliberate duplicate-ID rows. First import. |
| `register_02_status_update.xlsx` | Tracking-field changes only. Expect UPDATED. |
| `register_03_revision.xlsx` | A new revision (R1) of an existing transaction. Expect REVISED. |
| `register_04_conflict_same_revision.xlsx` | Commercial field changed without a revision bump. Expect CONFLICT. |
| `register_05_conflict_backwards_and_reopen.xlsx` | Revision goes backwards; a terminal status is reopened. Expect CONFLICT. |
| `register_06_row_missing.xlsx` | A previously imported row is gone. Expect ROW_MISSING. |
| `register_07_rejects.xlsx` | 8 deliberately bad rows (wrong company code, unknown type, bad status, text amount, overtyped ID, missing sequence, text date, bad currency). Expect REJECTED. Q70/R70 show `#VALUE!` on purpose. |
| `register_08_no_cached_values.xlsx` | Same data as the baseline with no cached formula values, exactly as BizKick ships. The importer must compose the ID from columns A-D. |
| `register_09_header_changed.xlsx` | Amount header renamed to Total. Expect a structure-changed rejection of the whole file. |
| `NEX_BK-SYS-003_Master_Control_Workbook.xlsx` | Master Control Workbook for CE-S5 (Approval Limits, Responsibility Matrix). |
| `sample_files/` | 14 synthetic source documents with `manifest.json` (SHA-256 per file). |
| `expected_outcomes.json` | The outcome and reason code expected for every changed row, per file. |

## Regenerating

1. Generate a fresh NEX client instance with BizKick's own build tools (company code `NEX`, MYR,
   Nexa branding). Run BizKick's branding test on it and confirm it is clean.
2. Run the builder against that instance:

   ```
   python build_nexa_fixture.py --instance <path to generated NEX instance> --as-of 2026-10-05
   ```

   Only the TRANSACTION REGISTER sheet XML is edited. Every other part of the workbook is
   untouched.
3. Verify: `npm run check:ce:s0-contract-and-fixtures`

The `--as-of` date matters. Alerts (OVERDUE, DUE SOON) and Days to Expiry are calculated against
it. Do not change it without regenerating `expected_outcomes.json`.

## Quirks the importer must handle

- **No cached values.** Shipped registers have no cached values in the formula columns (E, Q, R,
  X). Compose the Transaction ID from columns A-D and cross-check any cached E value.
- **500 pre-seeded rows.** Every row already carries company code, R0 and MYR. A row with no
  Document Type or no ID parts is empty and must be ignored.
- **Deliberate duplicate.** The baseline contains one duplicate ID on purpose. Both rows are
  REJECTED. Re-importing the baseline gives UNCHANGED for the 55 valid rows and REJECTED again
  for the 2 duplicates.
- **Accepted quotations past validity.** NEX-QT-2026-0001 and -0002 are Accepted with a past
  validity date. The workbook Alert reads OVERDUE, but expiry rules act only on Issued and
  Under Review.
- **Warnings (not rejections).** NEX-DO-2026-0003 has RELATED_NOT_FOUND (NEX-SO-2026-0003).
  NEX-GRN-2026-0002 has CHAIN_MISSING_PREDECESSOR (PO).
- **`_xlfn` finding.** BizKick writes `MAXIFS` and `FILTER` without the `_xlfn.` prefix. In
  LibreOffice 24.2 the NUMBER DESK suggested sequence evaluates to 1. Excel was not verified. This
  is why vFirm is the number authority (D3).
- **32 type codes.** LISTS holds 32 document type codes, not 34.
