# Connected EDCS Integration Contract v1.0

Status: Draft for owner review (CE-S0). Decision record: ADR-094 in `docs/00_project_control/DECISION_REGISTER.md`.
Owner: NHL Global Solution. Product pair: vFirm (governed record) and BizKick EDCS (source).
Fixtures: `scripts/fixtures/bizkick/` (synthetic client Nexa Office Supplies, company code NEX).
Check: `npm run check:ce:s0-contract-and-fixtures`.

## 1. Purpose and golden rule

BizKick is the source, the Bridge is the contract, vFirm is the governed record.

- BizKick (the Smart Transaction Register and the files it organises) is where the client works.
- This contract is the only agreed way data crosses from BizKick to vFirm.
- vFirm keeps a governed, auditable record of what it received. It never edits an existing
  BizKick file. vFirm never writes into the register. The only write-back (D1) is a new working
  copy placed beside the source, never over it.
- There are never two masters. For a field, either BizKick or vFirm decides it. Section 5 says which.

## 2. Decisions this contract implements (ADR-094)

| ID | Decision |
|---|---|
| D1 | Boundary as above. Write-back only as new working copies. |
| D2 | Start with register upload (no install) before any connector. |
| D3 | vFirm is the number authority for Connected customers (BizKick v1.1 change). BizKick's own number detection stays for rows not reserved through vFirm. |
| D6 | Three packages under NHL Global Solution: BizKick EDCS, BizKick Connected, BizKick + Virtual Staff. |
| D7 | Content policy per module (section 9). |
| D8 | The console gets a new navigation group "BizKick" (Transactions, Sync history, Number Desk, Rules). |

(D4 and D5 belong to other tracks and are not decided here.)

## 3. Source format: BK-SYS-005 Smart Transaction Register

- Workbook sheets: START HERE, NUMBER DESK, TRANSACTION REGISTER, SEARCH, DASHBOARD, LISTS, REGISTER CONTROL LOG.
- The importer reads only TRANSACTION REGISTER (table `BizKickTransactions`, A6:X506).
- Header on row 6. Data on rows 7 to 506 (500 rows). Columns A to X.
- The header must match section 3.1 exactly (trimmed, case-sensitive). Any difference rejects the
  whole file with STRUCTURE_CHANGED and no rows are processed.
- Every one of the 500 rows is pre-seeded with the company code, revision R0 and currency MYR.
  A row with no Document Type, Year and Sequence is empty and is ignored. It is not an error.
- Dates are accepted as Excel date serials, ISO text (`YYYY-MM-DD`), or day-month-year text (`DD-MM-YYYY`, `DD/MM/YYYY`, `DD.MM.YYYY`, and the two-digit-year forms such as `01-09-26`). Day-month-year is always read day first, a two-digit year means 20YY, and the date must be real (ADR-105). Any other text is INVALID_DATE.
- Amount must be a number (zero or more). Text such as "RM 1,200" is INVALID_AMOUNT. Blank is allowed.

### 3.1 The 24 columns

| Col | Header | Kind | Class (section 6) | Canonical field |
|---|---|---|---|---|
| A | Company Code | input | identity | `company_code` |
| B | Document Type | input | identity | `document_type` |
| C | Year | input | identity | `year` |
| D | Sequence | input | identity | `sequence` |
| E | Transaction ID | formula | identity (derived) | `transaction_id` |
| F | Revision | input | revision | `revision` |
| G | Date Reserved | input | commercial | `date_reserved` |
| H | Date Issued | input | tracking | `date_issued` |
| I | Counterparty Type | input | commercial | `counterparty_type` |
| J | Counterparty Name | input | commercial | `counterparty_name` |
| K | Subject / Description | input | commercial | `subject` |
| L | Amount | input | commercial | `amount` |
| M | Currency | input | commercial | `currency` |
| N | Status | input | tracking | `status` |
| O | Owner | input | tracking | `owner` |
| P | Expiry / Due Date | input | tracking | `due_date` |
| Q | Days to Expiry | formula | ignored | not stored (vFirm recomputes) |
| R | Alert | formula | ignored | not stored (vFirm recomputes) |
| S | Related Transaction ID | input | tracking | `related_transaction_id` |
| T | Original External Ref | input | commercial | `external_ref` |
| U | File Link / Path | input | tracking | `file_link` |
| V | Last Updated | input | tracking | `last_updated` |
| W | Remarks | input | tracking | `remarks` |
| X | Duplicate Check | formula | ignored | not stored (vFirm recomputes) |

Formula columns E, Q, R and X. BizKick ships workbooks with no cached values in these cells, so a
file straight from the shipped template can have them empty. Therefore:

- vFirm composes the Transaction ID itself from A to D and ignores E when E is empty.
- If E is present and differs from the composed ID, the row is REJECTED with ID_MISMATCH_CACHED_VS_PARTS.
- Q, R and X are never trusted. vFirm recomputes days to expiry, alerts and duplicates (section 8).

## 4. Identity rules (BK-SYS-002)

- Transaction ID is `[CLIENT]-[TYPE]-[YEAR]-[SEQUENCE]`, for example `NEX-QT-2026-0001`.
  Year is 4 digits. Sequence is 4 digits, zero-padded.
- The joining key in vFirm is `(tenant, firm, transaction_id)`.
- IDs are never reused. A cancelled row stays in the register and stays in vFirm.
- The company code must equal the firm's configured BizKick company code, else COMPANY_CODE_MISMATCH.
- Document Type must be one of the 32 codes in section 4.1, else UNKNOWN_DOCUMENT_TYPE.
- Missing Year or Sequence on a row that has a type gives INCOMPLETE_ID.
- The same ID twice in one file: both rows are REJECTED with DUPLICATE_ID_IN_FILE (and a duplicate flag).
- For an existing ID, a changed company code or document type is REJECTED (IDENTITY_CHANGED).
  The ID has been rebuilt on different parts, so it is a different transaction.
- Number authority (D3): for Connected customers, vFirm reserves the next sequence per
  `(firm, type, year)`. A reservation arrives in BizKick as a normal row. Rows reserved inside
  BizKick are still accepted. They are checked for collisions the same way.

### 4.1 Document types (32), module, vFirm object and defaults

Classification is the default sensitivity label. "Default worker position" is the proposed owner
role for tasks raised from the row. It is mapped to the live position catalogue in CE-S3.
Content policy is the D7 default (section 9).

| Code | Document type | Module | vFirm object | Classification | Default worker position | Content |
|---|---|---|---|---|---|---|
| QT | Quotation | Sales | Sales document | Confidential | Sales Coordinator | content |
| SO | Sales Order | Sales | Sales document | Confidential | Sales Coordinator | content |
| DO | Delivery Order | Sales | Sales document | Confidential | Sales Coordinator | content |
| INV | Invoice | Sales / Finance | Finance document | Confidential | Accounts Officer | content |
| RC | Receipt | Sales / Finance | Finance document | Confidential | Accounts Officer | content |
| CN | Credit Note | Sales / Finance | Finance document | Confidential | Accounts Officer | content |
| CMP | Customer Complaint | Sales | Sales document | Confidential | Sales Coordinator | content |
| PR | Purchase Requisition | Procurement | Procurement document | Confidential | Procurement Officer | content |
| RFQ | Request for Quotation | Procurement | Procurement document | Confidential | Procurement Officer | content |
| QC | Quotation Comparison | Procurement | Procurement document | Confidential | Procurement Officer | content |
| PO | Purchase Order | Procurement | Procurement document | Confidential | Procurement Officer | content |
| GRN | Goods Received Note | Procurement / Inventory | Procurement document | Confidential | Procurement Officer | content |
| SE | Supplier Evaluation | Procurement | Procurement document | Confidential | Procurement Officer | content |
| PV | Payment Voucher | Finance | Finance document | Confidential | Accounts Officer | content |
| EC | Expense Claim | Finance | Finance document | Confidential | Accounts Officer | content |
| PCV | Petty Cash Voucher | Finance | Finance document | Confidential | Accounts Officer | content |
| BR | Bank Reconciliation | Finance | Finance document | Confidential | Accounts Officer | content |
| JV | Journal Voucher | Finance | Finance document | Confidential | Accounts Officer | content |
| EMP | Employee Record | HR | HR record | Restricted | HR Officer | metadata only |
| LV | Leave Application | HR | HR record | Restricted | HR Officer | metadata only |
| TS | Timesheet | HR | HR record | Restricted | HR Officer | metadata only |
| OT | Overtime Request | HR | HR record | Restricted | HR Officer | metadata only |
| EXIT | Exit Checklist | HR | HR record | Restricted | HR Officer | metadata only |
| SI | Stock Issue | Inventory | Inventory document | Internal | Inventory Clerk | content |
| ST | Stock Transfer | Inventory | Inventory document | Internal | Inventory Clerk | content |
| SA | Stock Adjustment | Inventory | Inventory document | Internal | Inventory Clerk | content |
| SCV | Stock Count Variance | Inventory | Inventory document | Internal | Inventory Clerk | content |
| NDA | Non-Disclosure Agreement | Legal | Legal record | Confidential | Contracts Officer | metadata only |
| AGR | Service Agreement | Legal | Legal record | Confidential | Contracts Officer | metadata only |
| MIN | Meeting Minutes | Management | Management record | Internal | Operations Manager | content |
| DEC | Decision Record | Management | Management record | Internal | Operations Manager | content |
| INC | Incident Report | Management | Management record | Confidential | Operations Manager | content |

Items for the owner to confirm: Inventory and Legal are not named in D7. This table proposes
Inventory = content and Legal = metadata only (the cautious default). Worker position names are
placeholders until CE-S3.

### 4.2 Counterparty types and currencies

Counterparty Type must be one of: Customer, Supplier, Employee, Bank, Government, Internal,
External Party, Other. Blank is allowed.

Currency must be an ISO-style code from the LISTS sheet (the shipped list has MYR, USD, SGD, EUR,
GBP, AUD, JPY, CNY; MYR is the default). A value such as "RM" is INVALID_CURRENCY. Blank is allowed.

## 5. Status mapping

Status must be one of the 12 BizKick statuses. Anything else (for example "Pending") is INVALID_STATUS.
vFirm stores the BizKick value and a normalised lifecycle state.

| BizKick status | vFirm state | Terminal | Workbook Alert shows "Closed" |
|---|---|---|---|
| Reserved | reserved | no | no |
| Draft | draft | no | no |
| Under Review | in_review | no | no |
| Approved | approved | no | no |
| Issued | issued | no | no |
| Accepted | accepted | no | no |
| Rejected | rejected | no | yes |
| Expired | expired | no | no |
| Completed | completed | no | yes |
| Cancelled | cancelled | yes | yes |
| Superseded | superseded | yes | yes |
| On Hold | on_hold | no | no |

Cancelled and Superseded are terminal. A later import that moves such a row to any other status is
a CONFLICT (TERMINAL_STATUS_REOPENED). Corrections go through a new ID.

## 6. Revision rules (BK-SYS-006) and field classes

- The same offer revised keeps the same ID and moves the Revision R0, R1, R2, and so on.
- A replacement document gets a new ID with Related Transaction ID pointing to the earlier one, and
  the earlier row is marked Superseded.
- Revision is `R` followed by a whole number. Anything else is INVALID_REVISION.

Field classes decide what may change under the same ID:

| Class | Fields | Rule |
|---|---|---|
| identity | company code, document type, year, sequence, transaction ID | Never change. A change is REJECTED (IDENTITY_CHANGED). |
| revision | revision | May only stay or go up. Down is CONFLICT (REVISION_BACKWARDS). |
| commercial | date reserved, counterparty type and name, subject, amount, currency, external ref | Immutable within a revision. A change without a revision bump is CONFLICT (SAME_REVISION_COMMERCIAL_CHANGE). With a higher revision it is accepted as REVISED. |
| tracking | date issued, status, owner, due date, related ID, file link, last updated, remarks | May change at any time within a revision. Gives UPDATED. |
| ignored | Days to Expiry, Alert, Duplicate Check | Never stored. |

## 7. Outcome codes

Every row of every import gets exactly one outcome. The ledger keeps them all.

| Outcome | Meaning | Record changes? |
|---|---|---|
| CREATED | New ID, accepted. | Yes, new record at the stated revision. |
| UPDATED | Known ID, same revision, only tracking fields changed. | Yes, tracking fields. |
| REVISED | Known ID, higher revision, commercial and tracking fields accepted. | Yes, new revision kept, earlier revision retained in history. |
| UNCHANGED | Known ID, nothing differs. | No. |
| REJECTED | Row is invalid. Reason code required. | No. |
| CONFLICT | Row is valid but contradicts the governed record. Held for a person to resolve. | No. Held. |
| ROW_MISSING | An ID imported before is absent from this file. | No. Flagged. Never deleted. |

### 7.1 Reason codes

REJECTED reasons:

| Reason | Trigger |
|---|---|
| STRUCTURE_CHANGED | Header row differs from section 3.1. Whole file rejected, zero rows processed. |
| COMPANY_CODE_MISMATCH | Column A differs from the firm's company code. |
| UNKNOWN_DOCUMENT_TYPE | Column B not one of the 32 codes. |
| INCOMPLETE_ID | Type present but year or sequence missing or not numeric. |
| ID_MISMATCH_CACHED_VS_PARTS | Cached Transaction ID differs from the ID composed from A to D. |
| DUPLICATE_ID_IN_FILE | Same composed ID on more than one row of the file. All such rows rejected. |
| IDENTITY_CHANGED | Existing ID arrives with a different company code or type. |
| INVALID_STATUS | Status not in the 12. |
| INVALID_AMOUNT | Amount is not a number or is negative. |
| INVALID_DATE | A date cell is not an Excel date, ISO text or day-month-year text, or is not a real calendar date. |
| INVALID_CURRENCY | Currency not in the LISTS currencies. |
| INVALID_COUNTERPARTY_TYPE | Counterparty type (column I) is not one of the LISTS counterparty types. Blank is allowed. |
| INVALID_REVISION | Revision is not `R` plus a whole number. |

CONFLICT reasons:

| Reason | Trigger |
|---|---|
| SAME_REVISION_COMMERCIAL_CHANGE | A commercial field changed with no revision bump. |
| REVISION_BACKWARDS | The file's revision is lower than the governed revision. |
| TERMINAL_STATUS_REOPENED | A Cancelled or Superseded row moved to another status. |

ROW_MISSING reason: ROW_NOT_IN_SOURCE.

Warnings never change the outcome. They are recorded on the row as advice for a person:

| Warning | Trigger |
|---|---|
| RELATED_NOT_FOUND | Related Transaction ID is not in the register (nor already in vFirm). |
| CHAIN_MISSING_PREDECESSOR | A chain document has no predecessor (for example a GRN with no PO). |

### 7.2 Idempotency and ordering

- Importing the same file twice gives no changes. Valid rows are UNCHANGED. Rows rejected before
  are REJECTED again with the same reason.
- A file is identified by its SHA-256. Every import is written to the sync ledger (CE-S1).
- Within a file, rows are checked in this order: structure, identity, value validity, duplicates,
  then comparison with the governed record. The first failing stage decides the reason; a stage
  that finds several problems in the same row lists all of them. A row can carry more than one warning.
- One bad row never blocks the good rows around it. Only STRUCTURE_CHANGED rejects a whole file.

## 8. Alert semantics

vFirm recomputes alerts so it never depends on cached workbook values. The rules follow the
workbook formula at the import date: duplicate means "STOP - DUPLICATE"; status Completed,
Cancelled, Rejected or Superseded means "Closed"; no due date means "No due date"; due before
today means "OVERDUE"; due within 7 days means "DUE SOON"; otherwise "Open".

Important: the workbook shows OVERDUE for an Accepted quotation that is past its validity date.
vFirm's quotation-expiry rules act only on quotations that are Issued or Under Review. An Accepted
quotation past its validity date is not an expiry problem.

## 9. Content policy (D7)

- Sales, Procurement, Finance, Management: vFirm may receive file content (not only metadata) by default.
- HR: metadata only unless the owner opts in for that firm.
- Inventory: content by default (proposed, not named in D7).
- Legal: metadata only until the owner opts in (proposed, not named in D7).
- Metadata means the register row, file name, size, SHA-256 and location. It never includes the
  document body.
- Payroll data is not a BizKick type. If it appears in a Finance file, the owner's opt-in applies.
- The policy is per firm and per module, stored as a rule, and changes are logged.

## 10. Data-handling note

Personal data in scope: Counterparty Name (individuals as customers or suppliers), Owner, Remarks,
and everything on the HR types (EMP, LV, TS, OT, EXIT). Subject / Description can also contain
names. Amounts and external references are commercial data.

- Purpose: keep a governed, searchable record of business transactions and their files.
- Minimisation: Q, R and X are not stored. HR content is not received without opt-in (section 9).
- Retention: the transaction record and its history follow the firm's retention rule. Cancelled
  and Superseded rows are kept (IDs are never reused). Deleting a firm removes its transactions,
  ledger and linked file fingerprints.
- Export: a firm can export its transactions, history and sync ledger as CSV or JSON at any time.
- No real client data in tests. Fixtures are synthetic (`scripts/fixtures/bizkick/`).
- The register file is uploaded by the firm. vFirm does not log in to the firm's drives in CE-S1.

## 11. Master Control Workbook (BK-SYS-003) - future import

CE-S5 imports Approval Limits and the Responsibility Matrix from the Master Control Workbook.
Sheets: Document Register, Client Configuration, Responsibility Matrix, Process Map, Approval
Limits, Access Structure, Integration Mapping, Version Log, QA Register. Approval limits can arrive
as text such as "5%" or "RM 10,000". The importer must parse percent text and money text, and reject
anything it cannot read, with a clear reason. Never guess. The rules are specified in CE-S5.

## 12. Change control

- This contract is versioned. A change to section 3.1, 4.1, 5, 6 or 7 needs a new version and a
  new ADR.
- Adding a document type or status in BizKick requires a contract update before the importer accepts it.
- The fixture pack is the executable form of this contract. Any rule change updates
  `expected_outcomes.json` in the same change.
- Owner approval of v1.0 is recorded in the sprint plan checklist, not in this file.
