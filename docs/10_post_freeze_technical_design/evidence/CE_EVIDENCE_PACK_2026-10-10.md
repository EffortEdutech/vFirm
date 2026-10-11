# Connected EDCS: evidence pack

- Generated: 2026-10-10T22:44:49.692Z
- Commit: 72b3212
- Machine: win32, Node v22.14.0
- Migrations in the repo: 62 (last: 0056_connected_edcs_drafting.sql)
- Database used by the checks: none (JSON store only; nothing touched a database)

## Result

**All 13 check runs passed.**

| Sprint | What it proves | Store | Result | Time |
|---|---|---|---|---|
| CE-S0 | Integration contract and the Nexa fixture pack | JSON | PASS | 0.6 s |
| ADR-105 | Day-month-year register dates | JSON | PASS | 0.5 s |
| CE-S1 | Register import and sync ledger | JSON | PASS | 12.8 s |
| CE-S2 | File linking and document history | JSON | PASS | 2.0 s |
| CE-S3 | Rule engine and register-driven work | JSON | PASS | 2.7 s |
| CE-S4 | Number Authority (no duplicate numbers) | JSON | PASS | 2.3 s |
| CE-S5 | Delegation of Authority (who may approve) | JSON | PASS | 2.1 s |
| CE-S6 | Connector agent (offline, retry, revoke, outbox guard) | JSON | PASS | 3.6 s |
| CE-S7 | Microsoft 365 read-only adapter (simulated Microsoft) | JSON | PASS | 2.0 s |
| CE-S8 | Governed drafting into BizKick masters | JSON | PASS | 2.2 s |
| CE-H1 | Store read guard | JSON | PASS | 0.9 s |
| Production auth | Request gate: no anonymous or fake-header calls | JSON | PASS | 0.9 s |
| ADR-104 | Vercel adapter | JSON | PASS | 1.4 s |

## What these checks cover

- Import and re-import of the BizKick register give one row per transaction, with changes, conflicts and warnings recorded (S1, dates).
- Files match their transaction by ID, keep every revision, and HR/Legal files keep metadata only (S2).
- Rules start off, need a dry run, and never raise the same work twice (S3).
- Two people can never get the same transaction number; voided numbers are never reused (S4).
- A person can approve only what the approval limits allow, and every refusal is audited (S5).
- The connector sends only what changed, survives offline, stops when revoked, writes only to the outbox (S6).
- The Microsoft 365 adapter reads one folder, read-only, and keeps no secret in the clear (S7).
- A drafted document is a new numbered copy of the master, cannot be released before approval, and never overwrites a file (S8).
- Another firm can never see this firm's data, and the tenant export holds no file bytes (isolation and export tests inside S1 to S8, the request gate and the store guard).

## What these checks do NOT cover

- A real Microsoft 365 tenant (the adapter is tested against a simulated Microsoft).
- A real client's BizKick data, or two weeks of real use: that is the pilot (see the pilot log).
- Opening a generated document in Excel on a person's own PC (the pilot log has the step).
- Per-route role audit and rate limiting (open since the production-auth sprint).

Signed off by the product owner on the acceptance gate document, not here.
