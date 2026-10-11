# Standing Instructions: owner guide (VI-S1)

Plain steps for the firm owner. Decision record: ADR-109.

## What it is

- A standing instruction is a job that repeats: "every month on the 5th, reconcile the bank account".
- vFirm raises the work request for your team by itself, once for each period, with the files it needs already attached.
- It is the same work request you would create by hand. Assignment, review and approval do not change.
- Times are Malaysia time.

## One-time setup

1. Open **BizKick > Standing instructions**.
2. At the bottom, open **Your calendar**.
3. Type your public holidays, one per line, as `YYYY-MM-DD` (for example `2026-12-25`).
4. Pick your weekend (Saturday and Sunday, or Friday and Saturday, or Sunday only).
5. Press **Save calendar**.
6. Holidays change by announcement. vFirm does not guess them. Update this list when new ones are announced.

## Add one

1. In **Templates**, press **Add (starts paused)** next to the one you want:
   - Monthly bank reconciliation (the 5th, uses your latest bank statement in Documents)
   - Weekly receivables follow-up (every Monday, uses last week's invoices from BizKick)
   - Quarterly supplier evaluation (the 10th of Jan, Apr, Jul, Oct)
   - Monthly management summary (the 7th)
2. It starts **Paused**. Nothing is raised yet.
3. Press **Preview**. You see the next five run dates, the title of each request, and whether the input would be found today.
4. If the input says **Missing**, that is fine. On the day, the request is still raised and it asks you for the file.
5. Press **Turn on**. (The button works only after a preview.)

## Day to day

- **Skip next**: the next run does not happen. It shows in History as "Skipped by you".
- **Run now**: raises one request straight away. Once a day at most. The scheduled run is not used up.
- **Pause**: stops all runs. When you turn it on again it does not catch up the time it was off.
- **History**: every period, the request number, what was attached, and who it was assigned to.
- **Archive**: retires it. The history stays.
- To edit one, pause it first, change it, then preview again.

## Things to know

- A run that falls on a weekend or holiday moves to the next working day (you can change this to the day before).
- If vFirm was not running on the day, it still raises the request for up to 7 days afterwards. After that the period is not raised.
- Requests raised this way show "Standing instruction: <name>" in your Inbox.
- To assign it to a worker automatically, the instruction needs a staff code. This is set through the API in this sprint; the console adds templates only. If the worker is not allowed that kind of work, the request waits in your Inbox, as always.

## If something looks wrong

1. Open History for that instruction. Failed runs show the reason.
2. Check the calendar: a missing holiday only moves a run by a day.
3. Check that **Preview** shows the input you expect.
4. Tell your engineering contact the instruction name and the period (for example `2026-10`).
