# Worker Scorecards and cost-to-serve: owner guide (VI-S4)

Plain steps for the firm owner. Decision record: ADR-112. No database change is needed for this sprint.

## What it is

- Facts about how your virtual workers are doing, and what each client costs in effort against what you invoiced.
- Built only from your own records. Nothing is guessed, ranked or sent anywhere.
- Only virtual workers are measured. No person (you, your staff or a reviewer) is scored.
- Only the firm owner can see it.

## Where to find it

- **My Team**: the "Worker scorecards" panel under your team list.
- **Clients & Sales**: the "Cost to serve, by client" panel at the top.
- Both use the same period. Pick **Last 30 days**, **Last 90 days** (default), **This year** or **Custom dates**. Dates are Malaysia time.

## Worker scorecards

One row per worker, with a row under it for each skill it ran.

- **Jobs**: work assigned to the worker in the period.
- **Drafts**: jobs where the worker produced a draft.
- **Approved first time / Sent back / Rejected**: what you decided on the worker's first draft of each job. Each shows the count next to the percentage, for example "50% (2 of 4)".
  - Only the first draft's first decision counts. A draft that was sent back and then approved later is counted as sent back, not as approved.
  - Drafts you have not decided yet are left out of these rates.
- **Needed info**: jobs where the worker had to ask you for something before it could work.
- **Median time to draft**: from assignment to the first draft. It includes any time the worker waited for you to supply what it asked for.
- **Most often missing**: what the worker asked for most, for example a missing file or a field to fill in. This shows where your requests are incomplete.

**Low sample.** With fewer than 5 reviewed jobs the row is marked "low sample". Read the counts, not the percentage. It is not coloured good or bad.

## Cost to serve, by client

One row per client that had requests or invoices in the period.

- **Requests**, **Worker jobs**, **Drafts**: the effort spent on that client.
- **Draft waited for you (median)**: how long that client's drafts sat between being ready and being decided. This is a wait, not the time you spent. Your own review time is not recorded.
- **Invoiced**: BizKick invoices you have tied to the client, plus invoices recorded in vFirm (issued, paid or overdue), by issue date. Each currency is shown on its own and never added to another.

## Make the invoiced figure complete

- A BizKick invoice only counts for a client once you confirm its counterparty as that client (Transactions page, "link counterparty").
- The note under the table says how many invoices in the period are not tied to a client yet, and how many BizKick invoices have no issue date and are left out.
- Cancelled, rejected, superseded, draft, reserved and under-review invoices are not counted.

## Good to know

- Scorecards are read-only. Opening them changes nothing and writes nothing.
- They are evidence for the future Trust Ladder (VI-S5). They do not change what any worker is allowed to do.
- vFirm invoices are dated by when they were created, because they have no separate issue date.

## One-time setup

- None. After Vercel redeploys, open **My Team** and **Clients & Sales**.
