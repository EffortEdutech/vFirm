# Rate limiting: owner guide (RA-RL)

Plain steps for the firm owner. Decision record: ADR-116. One database change: migration 0062.

## What changed

- Before: nothing limited how often a person or a script could call vFirm.
- Now: each caller gets a number of calls per minute. Go over and vFirm answers "Too many requests. Try again in N seconds." (HTTP 429). Normal use never reaches the limits.

## The limits (Balanced)

- **Normal calls**: 240 a minute per signed-in person.
- **Heavy actions**: 20 a minute per signed-in person.
  - Running a skill, uploading a file, importing a register, building or downloading an Evidence Passport, exporting data, "run now", graph sync.
- **Sign-in and invitations**: 10 a minute per internet address.
  - Sign up a firm, invite people, activate / suspend / revoke pilot users.
- Before sign-in, calls are counted per internet address instead.
- Never counted: health check, the scheduled tick, the BizKick connector routes.

## Steps (in order)

1. Open the Supabase SQL editor for the vFirm project.
2. Paste the whole file `infra/database/migrations/0062_rate_limits.sql` and run it. Expect "Success".
3. Run `npm run check:ra:rate-limit` in your repo folder. Expect `"status":"pass"`.
4. Commit and push (the commit text is in the hand-off message).
5. After Vercel finishes deploying, use the live site normally for a few minutes. Expect no "Too many requests" message.

## If something goes wrong

- A counter fault never blocks work. If the database cannot answer, vFirm counts in memory on that server copy with the same limit.
- Someone is limited in daily use: raise the limit in Vercel settings (Environment Variables), then redeploy.
  - `VFIRM_RATE_NORMAL` (default 240), `VFIRM_RATE_EXPENSIVE` (default 20), `VFIRM_RATE_AUTH` (default 10).
- Turn it off completely: set `VFIRM_RATE_LIMIT` to `off` and redeploy. Set it to `on` to force it on in a test setup.
- A whole office behind one internet address shares the sign-in / invite count. Raise `VFIRM_RATE_AUTH` if you invite many people at once.

## What it does not do

- It is not a firewall. A paid Vercel plan and Vercel's own firewall rules are still the stronger layer against a large attack.
- Counting uses one-minute blocks, so a short burst around a block edge can briefly reach up to twice the limit.

## Check it yourself

1. Open the live site, sign in, click around for a minute. Expect no limit message.
2. Optional: repeat the same upload more than 20 times in a minute. Expect "Too many requests" on the 21st, then normal again within a minute.
