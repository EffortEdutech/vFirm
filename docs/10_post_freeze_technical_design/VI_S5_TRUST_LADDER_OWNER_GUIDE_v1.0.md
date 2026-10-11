# Trust Ladder: owner guide (VI-S5)

Plain steps for the firm owner. Decision record: ADR-113 (this is decision D5).

## What it is

- Each virtual worker earns authority for each skill, one step at a time. Nothing is assumed.
- There are three stages for every worker and skill:
  - **Shadow**: the worker runs beside you. Its work is compared with yours and is never delivered.
  - **Supervised**: you review every draft one by one. This is how every worker starts, and how it works today.
  - **Proven**: you promoted the worker on the evidence. Its routine drafts can be approved together as a batch.
- Only you can see or change any of it (owner only).
- Find it on **My Team**, in the **Trust Ladder** panel under your team list.

## Move a worker up

1. **Supervised to Proven.**
   - vFirm counts the jobs reviewed since the worker became Supervised.
   - When there are enough jobs, a high enough share approved first time, and no rejection in that run, the row shows **Eligible**.
   - Eligible only means "you may". Nothing changes until you press **Promote to Proven**.
   - Default: at least 10 reviewed jobs, at least 90% approved first time, no rejection in that run.
2. **Class A and regulated work can never be Proven.** The row says why and the button stays off.
3. **Thresholds.** Open **Thresholds** on a row to make the rules stricter. The lowest allowed is 5 jobs, 80%, 3 shadow drafts and 60%.

## Use Shadow

1. On a Supervised row press **Start shadow**.
2. When a request is given to that worker and you press Run, the worker does the job but nothing is delivered. The job stays yours to do.
3. The result appears under **Shadow drafts to mark**. It is not a draft: it never reaches Approval or the Outbox.
4. Compare it with what you did. Press **Matches**, **Differs** or **Worse**, and add a note if you like.
5. Once enough are marked (default 5, at least 80% matching, none marked worse), the row shows Eligible. Press **Move to Supervised**.

## Approve a batch (Proven workers only)

1. Under **Batch approval**, tick the drafts. Only routine drafts from Proven workers are listed.
2. Write why you approve them (required).
3. Press **Check batch**. If any draft fails, you are told why and **nothing** is approved.
4. Press **Approve batch**.
5. Each draft still gets its own review record that names the batch, and the batch itself is in the audit log.
6. At most 25 drafts per batch. Your delegation rules (CE-S5) still apply to every draft.

## When a worker is moved back

- A Proven worker goes back to Supervised **automatically** if you reject any draft, or send back 2 drafts within its last 10 reviews.
- The Morning Brief says so under **Moved back to Supervised**, and the row on My Team shows why.
- To be Proven again it must earn it again from fresh reviewed jobs.

## Good to know

- Every stage change, threshold change, shadow run and shadow mark is in the audit log.
- Shadow only applies when you press Run on a request. Work you attach by hand is your own work.
- A worker with no record is Supervised.

## One-time setup (owner)

1. In Supabase, apply migration `0060_trust_ladder.sql` (SQL editor, paste, run).
2. After Vercel redeploys, open **My Team**.
