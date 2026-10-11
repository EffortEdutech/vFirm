# e-Invoice Readiness: owner guide (VI-S6)

Plain steps for the firm owner. Decision record: ADR-114. Rules checked on 2026-10-11.

## What it is

- A check, not a sender. **vFirm never submits anything to MyInvois.** It tells you what each invoice still needs.
- Only you (owner) can see or change it.
- Find it under **Overview > e-Invoice Readiness**.

## Do this first

1. Pick your **annual turnover** band at the top.
   - Below RM3 million: shown as likely exempt, unless you tick that a related company, shareholder or joint venture has RM3 million or more.
   - Other bands: the page shows the date e-Invoice started for you and whether the interim relaxation period is still running.
2. Fill in **Your details (supplier)** and press **Save my details**.
   - Name, TIN, registration number, phone and address line come from Company Details if you already filled them in.
   - You add: SST number (or NA), tourism tax number (or NA), MSIC code (5 digits), business activity, city, state, country code (MYS), contact number.

## Read the invoice list

- Each invoice is **Ready**, **Needs fixes** or **Cannot confirm**.
- Open one to see its fix list. Each line says what is wrong, how to fix it and where.
  - **Missing**: add it.
  - **Not valid**: it is there but in the wrong format.
  - **Cannot tell**: vFirm does not hold it (for example BizKick line items). Check it in the source system.
- BizKick invoices will mostly say Cannot confirm. BizKick does not hold your buyer's TIN, address or line items, so vFirm will not pretend otherwise.

## Buyer details

1. Open a buyer under **Buyer details**.
2. Enter name, TIN, registration or ID number, SST (or NA), address and contact number. Save.
3. Tick **general public** for walk-in buyers who do not ask for an e-Invoice. Those sales go into the monthly draft.

## Monthly consolidated draft

- For sales of RM10,000 or less each to the general public, one consolidated e-Invoice a month, within 7 days after month end.
- Pick the month. The page lists the receipts, total, how many submissions of up to 100 lines, and anything left out with the reason (over RM10,000, not MYR, no total).
- **Download draft (CSV)** gives you a file for your records or your e-Invoice software. vFirm sends nothing.

## Good to know

- Classification and tax codes are checked for format only, not against the official lists.
- LHDN changes these rules often. The page shows the date they were checked and the sources. Confirm with LHDN or your tax agent before relying on it.
