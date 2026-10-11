# Morning Brief: owner guide (VI-S2)

Plain steps for the firm owner. Decision record: ADR-110.

## What it is

- One page that tells you the state of the firm in about two minutes.
- Open **Overview > Morning Brief**.
- It is built only from your own records. Nothing is guessed, estimated or sent anywhere.
- The same data on the same day always gives the same brief.
- Times are Malaysia time.
- Only the firm owner can open it.

## What you see

1. **Six numbers at the top.**
   - Waiting on you.
   - Overdue (requests and BizKick).
   - Invoices past due.
   - Months without a bank reconciliation.
   - Exceptions in the register.
   - Standing instructions needing info.
2. **Needs you.** Questions from your team, new requests to assign, drafts to review, Class A approvals, things ready to send or file, and assigned work past its due date.
3. **Due and overdue.** Requests at or past their due date, and BizKick documents the register marks OVERDUE or DUE SOON.
4. **Cash signals.**
   - Money owed to you, by age: not yet due, 1-30, 31-60, 61-90, over 90 days late. Each currency is shown on its own and never added to another.
   - Months in the last six that have no completed bank reconciliation.
5. **Your team yesterday.** Requests in, items assigned, drafts produced, items finished, and a line per worker.
6. **Exceptions.** Held conflicts, duplicate numbers, documents missing the one they should follow, and documents that did not take their number from the Number Desk.
7. **Standing instructions.** Due today, raised today, raised but an input is missing, and failed in the last 7 days.

Each list shows the first 8 lines. The count next to it is the full count.

## Open a record

- Click any line. It takes you to the page that holds that record (for example a Workdesk tab or the Transactions page).
- It opens the page, not the exact row. Use the number on the line to find it.

## Saved copy and history

- The first brief of each day is saved. The daily 06:00 job saves it, or your first open of the day does, whichever comes first.
- The line under the title says whether the brief matches today's saved copy or things have changed since.
- Press **Refresh** to read the latest data.
- Press **Earlier briefs** to see past days. Press **Open** on one to read it exactly as it was saved.

## Good to know

- Money owed uses the due date (or the issue date if there is none). An invoice counts as paid only when the register marks it Completed. The register has no payments, so a part-paid invoice shows its full amount.
- Months are checked against completed bank reconciliations (BR) only, and not before your first transaction.
- Email and WhatsApp delivery of the brief is not built. It needs a provider and consent decision first.

## One-time setup (owner)

1. In Supabase, apply migration `0058_firm_briefs.sql` (SQL editor, paste, run).
2. After Vercel redeploys, open **Overview > Morning Brief**.
3. From tomorrow, the 06:00 job saves each day's brief for you.
