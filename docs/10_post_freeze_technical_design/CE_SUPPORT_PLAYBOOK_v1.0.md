# Connected EDCS: support playbook (CE-S9)

Version 1.0, 2026-10-12.

## 1. The one rule: diagnose in this order

Always check the layers from the bottom up. Do not touch vFirm until the two layers below it are cleared.

1. **BizKick source:** is the register or file correct in BizKick itself?
2. **Connector or bridge:** did the change leave the PC (or the Microsoft 365 folder) and reach vFirm?
3. **vFirm record:** is the governed record right, and was any difference decided by a person?

Golden rule: BizKick is the source, the Bridge is the contract, vFirm is the governed record. A fix is almost always made in BizKick or by deciding a conflict, never by editing vFirm data by hand.

## 2. Who does what

| Level | Who | Handles | Hands up when |
|---|---|---|---|
| L1 | The customer's Product Champion | How-to questions, the daily check, deciding conflicts, reserving numbers, approving drafts within their limit | They cannot clear it with the table in section 3, or any data looks lost, doubled or wrong |
| L2 | NHL Global Solution support (the product owner until a support person is named) | Connector install and tokens, content policy, approval limits, folder paths, Microsoft 365 setup, reading Sync history and the audit | Cause is in vFirm code, a database problem, or a suspected data-integrity issue |
| L3 | Engineering (Claude sessions on the repo, with the product owner) | Bugs, migrations, production fixes, hot fixes | Always writes the cause and a regression check |

Any suspected data-integrity issue goes straight to L2 and is logged as S1 (see the pilot plan, section 2).

## 3. Symptom table

| What the user sees | Layer | Check | Usual fix | Owner |
|---|---|---|---|---|
| A new row is not in vFirm | 1 then 2 | Row saved in BizKick? BizKick > Connector heartbeat recent? Queue length? | Wait one cycle; if the queue grows, see "Connector offline" | L1, then L2 |
| Connector offline or red | 2 | PC on? Network? Error line on the Connector page | Restart the connector; rotate the token if revoked (Connector page) | L2 |
| "Revoked" on the connector | 2 | Was the token rotated or revoked on purpose? | Issue a new token, update the connector config, restart | L2 |
| Whole register rejected, `INVALID_DATE` | 1 | Dates in the register. Excel may have rewritten them | Use day-month-year consistently (ADR-105); do not mix month-first | L1 |
| Conflict raised | 3 | Conflicts page: BizKick value vs vFirm value | Decide: keep BizKick, keep vFirm, or keep current. The audit records who | L1 |
| "Number already reserved" or a gap in numbers | 3 | Number Desk: reserved, voided, registered | Voided numbers are never reused; gaps are normal | L1 |
| Number turned REGISTERED late | 1 then 2 | Row added to the register? Synced since? | Add the row, sync | L1 |
| Warning: number not reserved (UNRESERVED) | 1 | Row was typed in BizKick without reserving | Reserve through the Number Desk next time | L1 |
| File did not link | 1 | File name carries the Transaction ID exactly? In a controlled folder? | Rename to the standard (BK-SYS-006); sync | L1 |
| HR or Legal file shows "metadata only" | 3 | Content policy on the Connection page | This is by design | L1 |
| Draft cannot be downloaded | 3 | Status: still waiting for approval? | Approve (owner, or the role the limit names) | L1 |
| "Approval needs Tier N" refusal | 3 | Approval limits page, and the amount | Ask the right approver; the refusal is audited | L1 |
| Document has blank formula cells in a previewer | none | Open in Excel | Excel recalculates on open | L1 |
| Document file already exists in the outbox | 2 | Outbox folder | The connector never overwrites; rename or remove the old file yourself | L2 |
| Microsoft 365 sync "access denied" | 2 | Entra app permission, site grant, secret expiry | Follow the Entra guide; renew the secret | L2 |
| Page shows an error or will not load | 3 | Sign in again; try another browser; check the host status | If it persists, L2 reads the Vercel runtime logs | L2 then L3 |
| Seen another firm's data | 3 | Stop. Do not browse further | S1: L2 and L3 immediately | L2, L3 |

## 4. What L1 must never do

- Edit the BizKick master documents (the controlled masters).
- Delete or rename files in the outbox to "make a sync work".
- Share a connector token. Tokens are shown once; if lost, rotate.
- Ask vFirm staff to change data in the database.

## 5. What L2 reads first

- **BizKick > Connector:** heartbeat time, queue length, last error, version.
- **BizKick > Sync history:** each run, its source (connector, upload, Microsoft 365), counts, warnings.
- **BizKick > Conflicts and Number Desk.**
- **Audit trail:** who approved, refused, voided, delivered.
- **Connector local status file** (`status.json` in the connector's state folder) and its log.

## 6. Response targets (pilot)

| Severity | First reply | Target fix or workaround |
|---|---|---|
| S1 (data integrity) | Same working day | Stop use of the affected feature until cause is known |
| S2 | Within 2 working days | Next release |
| S3 | Logged | Backlog |

## 7. Escalation note (copy this when handing up)

- Customer and firm:
- What the user did and saw:
- Layer checked so far (1, 2, 3) and result:
- Transaction ID(s):
- Time it started:
- Screenshot or error text (no tokens or passwords):
