# Connected EDCS: step-by-step guide to run the pilot and sign the gate (CE-S9)

Version 1.0, 2026-10-12. Plain steps for the product owner. Companion to `CE_S9_PILOT_PLAN_AND_LOG_v1.0.md` (what to prove) and `CE_ACCEPTANCE_GATE_v1.0.md` (the decision). This guide is the how.

All PowerShell blocks start in the repo folder:

```powershell
cd "C:\Users\user\Documents\00 Agent Skills\virtual-firm"
```

Rules for the whole pilot:

- The pilot uses made-up data only (the Nexa Office Supplies fixture, company code NEX).
- Never paste a token or password into chat, into the log, or into a screenshot you share.
- If something looks lost, doubled or wrong, stop for the day and write it in the log (Part 5).

Contents:

- Part 1. Set up the pilot (Day 0, about 1 hour)
- Part 2. The 14-day schedule
- Part 3. The daily routine (15 minutes)
- Part 4. The weekly tests (week 1 and week 2)
- Part 5. Keeping the log
- Part 6. Open a generated quotation in Excel (step 5)
- Part 7. Pick the friendly customer and topology (step 6)
- Part 8. Finish: evidence pack, sign the gate (step 7)

---

## Part 1. Set up the pilot (Day 0)

### 1.1 Make a separate pilot firm

Why: the pilot must never mix with a firm that holds real data. On the live site, each new account creates its own firm.

1. Open a private (incognito) browser window. Go to `https://vfirm-web-console.vercel.app`.
2. Click **Create account**.
3. Use a second email address that you can read. Tip: if your main email is a Gmail address, `yourname+pilot@gmail.com` lands in the same inbox but counts as a separate account.
4. If an email arrives asking you to confirm, click the link, then come back and sign in.
5. On the firm screen, enter:
   - Firm name: `NHL Pilot (test data only)`
   - Your name: your name
6. You land in the console. Check the firm name at the top. This is the **pilot firm**. Use the private window (or a second browser profile) whenever you work on it, so you never mix it up with your main firm.

### 1.2 Connect the pilot firm to a BizKick company

1. Menu **BizKick > Connection**.
2. Company code: `NEX`. Fill the other fields as shown on the page. Click **Connect**.
3. On the same page, check the content policy. The pilot defaults are: Inventory full content; Legal and HR metadata only. Leave the defaults.
4. Done when the page says **Saved** and shows code NEX.

The company code cannot change once transactions exist. NEX is only for the pilot.

### 1.3 Register the connector and keep its token

1. Menu **BizKick > Connector**.
2. Under **Register a connector**: Name `Pilot PC`. Where is BizKick: **On the PC the connector runs on**. Click **Register connector**.
3. A token starting with `vfc_` is shown **once**. Copy it into Notepad right now. Do not paste it in chat.
4. Done when "Pilot PC" appears in the list.

### 1.4 Make the pilot BizKick folder on your PC

This is a small made-up BizKick folder. Copy and paste this whole block into PowerShell:

```powershell
$repo = "C:\Users\user\Documents\00 Agent Skills\virtual-firm"
$fx   = "$repo\scripts\fixtures\bizkick"
$root = "C:\vfirm-pilot\BizKick"
New-Item -ItemType Directory -Force "$root\EDCS","$root\Sales","$root\Finance","$root\Procurement","$root\HR","C:\vfirm-pilot\connector-state" | Out-Null
Copy-Item "$fx\register_01_baseline.xlsx" "$root\EDCS\NEX_BK-SYS-005_Smart_Transaction_Register.xlsx"
Get-ChildItem "$root" -Recurse | Select-Object FullName
```

Important: `connector-state` is outside the BizKick folder on purpose. The connector never writes inside BizKick.

### 1.5 Write the connector config

1. Open Notepad and paste this. Replace `vfc_PASTE_YOUR_TOKEN` with the token from step 1.3:

```json
{
  "vfirm_url": "https://vfirm-web-console.vercel.app/api",
  "connector_token": "vfc_PASTE_YOUR_TOKEN",
  "topology": "A",
  "bizkick_root": "C:\\vfirm-pilot\\BizKick",
  "register_path": "EDCS\\NEX_BK-SYS-005_Smart_Transaction_Register.xlsx",
  "controlled_folders": ["Sales", "Finance", "Procurement", "HR"],
  "state_dir": "C:\\vfirm-pilot\\connector-state",
  "poll_interval_seconds": 60,
  "heartbeat_interval_seconds": 60,
  "watch": true,
  "outbox_enabled": false
}
```

2. Save as `C:\vfirm-pilot\connector.config.json` (choose "All files", not .txt).
3. This file holds the token. Keep it on your PC only. Never commit it to git.

### 1.6 First sync (Day 1 baseline)

```powershell
node apps\edcs-connector\bin\edcs-connector.mjs once --config C:\vfirm-pilot\connector.config.json
```

Expect lines like `register: QUEUED` and `flush: delivered 1`.

Then in the console (private window):

1. **BizKick > Connector**: "Pilot PC" shows a recent heartbeat.
2. **BizKick > Sync history**: one run. The baseline has 57 rows: 55 valid and 2 deliberate duplicates. Duplicates and other problems are listed as warnings. This is expected.
3. **BizKick > Transactions**: rows are listed.

Done when the counts make sense. Write the first log line (Part 5).

### 1.7 Import the approval limits

1. **BizKick > Approval limits**.
2. Upload `scripts\fixtures\bizkick\NEX_BK-SYS-003_Master_Control_Workbook.xlsx`.
3. Map the approver labels to roles (or the owner), map the document types to limit rows, and confirm. For the pilot, map every approver label to **owner** unless you create test members.
4. Done when the page shows an active version 1.

### 1.8 Company details for drafting

1. **BizKick > Drafting**.
2. In **Company details**, fill the required fields (marked *). Use made-up details such as "Nexa Office Supplies Sdn Bhd". Default tax rate 0 or 6. Click **Save company details**.
3. Done when it says "Company details saved."

### 1.9 Day 0 check

- [ ] Pilot firm exists and you can sign in.
- [ ] Connection shows NEX.
- [ ] Connector heartbeat is recent.
- [ ] Baseline imported.
- [ ] Approval limits version 1 is active.
- [ ] Company details are saved.

---

## Part 2. The 14-day schedule

Count only working days. One session per day. Each day uses the next register file from the fixture folder. Each file replaces the register in `C:\vfirm-pilot\BizKick\EDCS\`.

How to load a day's register (example for Day 2):

```powershell
$fx = "C:\Users\user\Documents\00 Agent Skills\virtual-firm\scripts\fixtures\bizkick"
Copy-Item "$fx\register_02_status_update.xlsx" "C:\vfirm-pilot\BizKick\EDCS\NEX_BK-SYS-005_Smart_Transaction_Register.xlsx" -Force
node apps\edcs-connector\bin\edcs-connector.mjs once --config C:\vfirm-pilot\connector.config.json
```

| Day | Load | What you should see in vFirm |
|---|---|---|
| 1 | `register_01_baseline` (done in 1.6) | 55 valid rows created; 2 duplicate-ID rows flagged |
| 2 | `register_02_status_update` | Tracking changes only: UPDATED |
| 3 | `register_03_revision` | A new revision R1: REVISED |
| 4 | `register_04_conflict_same_revision` | A money field changed without a revision: CONFLICT. Decide it |
| 5 | `register_05_conflict_backwards_and_reopen` | Revision goes backwards and a finished item is reopened: CONFLICTs. Decide them. **Do the week 1 tests (Part 4)** |
| 6 | `register_06_row_missing` | A row has gone: ROW_MISSING |
| 7 | `register_07_rejects` | 8 deliberately bad rows are REJECTED with reasons; good rows still load |
| 8 | `register_08_no_cached_values` | Same data as baseline; nothing breaks, IDs are still built right |
| 9 | `register_09_header_changed` | A renamed header: the whole file is refused with a clear message, nothing is half-loaded |
| 10 | `register_01_baseline` again | Back to normal. **Do the week 2 tests (Part 4)** |
| 11 to 14 | Your own edits | Add or change two or three rows by hand in Excel each day (new quotation, status change). Use the rules, drafts and numbers as in Part 3 |

If any day shows something different from the table, that is not automatically a failure. Write it in the log, then decide using the severity table in the pilot plan (S1, S2, S3).

Add 2 or 3 sample documents to the folders each day, for example:

```powershell
$s = "C:\Users\user\Documents\00 Agent Skills\virtual-firm\scripts\fixtures\bizkick\sample_files"
Copy-Item "$s\NEX-QT-2026-0001_R0_Alpha-Tech-Resources.xlsx" "C:\vfirm-pilot\BizKick\Sales\"
Copy-Item "$s\NEX-PO-2026-0001_PaperPlus-Trading.xlsx"        "C:\vfirm-pilot\BizKick\Procurement\"
Copy-Item "$s\NEX-EMP-2026-0001_Offer_Letter.docx"            "C:\vfirm-pilot\BizKick\HR\"
```

Folder rule: quotations, orders, deliveries, invoices and receipts go to `Sales`; purchase orders and goods-received notes to `Procurement`; bank reconciliations to `Finance`; employee documents to `HR`.

---

## Part 3. The daily routine (15 minutes)

Do these in order. They follow the support order: BizKick source, then connector, then vFirm record.

1. **BizKick source.** Load the day's register (Part 2) and add sample files. This is the "BizKick side".
2. **Connector.** Run:
   ```powershell
   node apps\edcs-connector\bin\edcs-connector.mjs once --config C:\vfirm-pilot\connector.config.json
   ```
   Then in the console, **BizKick > Connector**: heartbeat is recent; no error line; queue is empty.
3. **vFirm record.**
   - **Sync history:** the new run is there with the counts from the table in Part 2.
   - **Conflicts:** decide each conflict (keep BizKick, keep vFirm, or keep current). Your name is recorded.
   - **Transactions:** open one changed row and look at its history.
   - **Files:** each sample file is linked to the transaction with the same ID in its name. HR files show metadata only.
4. **Number Desk.** Reserve one number. Check it is different from the last one. (On the days a drafted document is made, its number is reserved for you.)
5. **Write the log line** (Part 5).

The connector can also run by itself. If you prefer, leave this running in a second PowerShell window instead of running `once`:

```powershell
node apps\edcs-connector\bin\edcs-connector.mjs run --config C:\vfirm-pilot\connector.config.json
```

---

## Part 4. The weekly tests

Do the full list on Day 5 and again on Day 10. Tick each one in the log.

### T1. Offline test
1. Turn off Wi-Fi or unplug the network.
2. Change two rows in the register and save. Run the connector `once`. It should say there was a problem this round and keep the changes waiting.
3. Turn the network back on. Run `once` again.
4. Pass: each change appears in Sync history **once**. Run it a third time: nothing new to send.

### T2. Conflict test
1. In vFirm, open a transaction and note its amount.
2. In the register, change the amount of that same transaction and save. Run `once`.
3. Pass: a conflict is raised. Decide it. The audit shows who decided.

### T3. Drafting test (also the Excel check, Part 6)
1. **BizKick > Drafting > Prepare a document**: Quotation. Fill customer `Test Customer Sdn Bhd`, today's date, two item lines, a note. Click **Prepare draft**.
2. The draft shows **Waiting for approval**. There is no Download button yet. Pass: you cannot get the file before approval.
3. Click **Approve** (as the owner). Click **Download**.
4. Open it in Excel (Part 6).
5. Move the file into `C:\vfirm-pilot\BizKick\Sales\`, add a row for it in the register (same transaction ID), run `once`.
6. Pass: the number shows **In the register** (REGISTERED) on the Drafting page and Number Desk.

### T4. Approval limit test
1. Prepare a Purchase Order whose total is above the Tier 1 limit (RM 5,000 in the fixture workbook).
2. Pass if the page tells you which tier and approver it needs. (As owner you can approve; to see a refusal, sign in as a second member without the role. If you do not have a second member, record "owner only, refusal not tried" in the log. Do not skip the rest.)

### T5. Reject test
1. Prepare any draft. In the **Reason** box type a reason. Click **Reject**.
2. Pass: the draft shows Rejected with the reason. In **Number Desk** the number is **Voided**. Prepare another draft: it gets a **new** number, not the voided one.

### T6. Rules test
1. **BizKick > Rules**. Pick one rule. Click the dry run and read what it would raise.
2. Turn the rule on. Click **Run rules now**. Check the work it raised. Run again: nothing is raised twice.
3. Turn the rule off again.

### T7. Revoke test
1. **BizKick > Connector**. Click **New token** on "Pilot PC". Copy the new token.
2. Run `once` with the old config: pass if it is refused and the console shows the connector revoked or the old token refused.
3. Put the new token in `connector.config.json`. Run `once`: it works again.

### T8. Export test
The console has no export button. The export is an API route for signed-in users, so this test is done two ways:

1. Automatic: the evidence pack (Part 8) checks the export on every run. It holds the records and no file contents. Pass: the pack says all checks passed.
2. By hand (optional, with the engineering session): ask for a one-off export of the pilot firm and open it. Pass: it opens, holds your transactions, holds no file contents.

Write "T8 covered by the evidence pack" in the log. Add the hand check only if you asked for it.

### T9. Isolation test
1. In your main browser window, sign in to your **other** firm.
2. Pass: it shows none of the pilot firm's transactions, files, drafts or numbers.

---

## Part 5. Keeping the log

Use the table in section 5 of `CE_S9_PILOT_PLAN_AND_LOG_v1.0.md`. Copy it into an Excel sheet called `CE_pilot_log.xlsx` and keep it in `C:\vfirm-pilot\`.

One line per day, minimum:

- Date
- Phase: A
- Day number (1 to 14)
- What you did
- Result: OK or issue
- If an issue: ID (P-001, P-002 ...), severity S1/S2/S3, status

When something is wrong:

1. Do not fix it by hand in the database.
2. Fill in the **Issue sheet** from the pilot plan.
3. Work out the layer: BizKick source, connector, or vFirm record (use `CE_SUPPORT_PLAYBOOK_v1.0.md`).
4. S1 (data integrity): stop for the day, tell me or the engineering session with the Issue sheet. After a verified fix the 14-day count restarts.
5. S2 and S3: carry on.

---

## Part 6. Open a generated quotation in Excel (step 5)

Do this on a PC with Microsoft Excel installed. This is the one check nobody has done yet.

1. Prepare and approve a Quotation (T3 steps 1 to 3) and click **Download**. The file is named like `NEX-QT-2026-0007_test-customer-sdn-bhd_Quotation.xlsx`. Notice the Transaction ID is in the name.
2. Double-click the file in Downloads. If Excel shows a yellow bar "Protected View", click **Enable Editing**. Excel will recalculate when it opens.
3. Check each point and tick it:
   - [ ] Opens without an error message or a "repair" prompt.
   - [ ] The Nexa/BizKick branding and logo are in place.
   - [ ] The quotation number (top right) equals the number in the file name.
   - [ ] The date is the issue date you typed, not today's date changing.
   - [ ] Customer name and address are filled.
   - [ ] Each item line shows description, quantity, unit, unit price and line total.
   - [ ] The subtotal, tax and grand total match a calculator.
   - [ ] No cell shows `#REF!`, `#NAME?`, `#VALUE!` or `#DIV/0!`.
   - [ ] The status cell and the notes are filled.
   - [ ] The company details you typed appear where the master expects them.
   - [ ] Fonts, colours, column widths and borders look like the BizKick master.
4. Do the same for one **Invoice** and one **Purchase Order** (a quick look is enough).
5. Take one screenshot of the quotation (no real data) and save it in `C:\vfirm-pilot\evidence\`.
6. Result:
   - All ticked: write "Excel open-test passed" in the log with the date and your name.
   - Anything wrong: write it as an issue. A wrong total or a broken master is S1. A small look-and-feel difference is S2. Send the file (made-up data only) to the engineering session.

If you see a blank total in a preview (for example in a mail preview or a browser viewer) but it is right in Excel, that is the known limitation, not a failure.

---

## Part 7. Pick the friendly customer and topology (step 6)

Do this only after Day 10 looks healthy.

### 7.1 Choose the customer (answer yes to all)

- [ ] They already use BizKick, or will start now.
- [ ] They are friendly and will tell you about problems.
- [ ] They agree in writing to: the pilot length (at least 14 days), the content policy (Legal and HR files keep details only), and "this is a pilot".
- [ ] One person will act as their Product Champion.
- [ ] You are happy for their register to be held in vFirm (Singapore region).

### 7.2 Choose the topology

| Where is their BizKick folder? | Topology | What you need |
|---|---|---|
| On one PC | A | Connector on that PC. The simplest. Choose this if you can |
| On a shared folder or NAS | C | Connector on a PC that can open the shared folder; test the network path first |
| In OneDrive or SharePoint | B (Microsoft 365) | Their IT admin; the Entra setup guide; do the real-tenant test on a test folder first |

In the connector config, use `"topology": "A"` for A and `"C"` for C. B does not use a connector.

### 7.3 Before you touch their data

1. Real company code: three capital letters, chosen with the customer and the same in their BizKick. It cannot change later.
2. Hosting: move off the Hobby Vercel plan to a paid plan first.
3. Decide with me whether the per-route role audit and rate limiting must be done before real client data, or are accepted as limitations on the gate.
4. Create their firm (they sign up themselves or you invite them), then repeat Part 1 with their real code and their real folder.
5. Train their Champion with `CE_PRODUCT_CHAMPION_TRAINING_ADDENDUM_v1.0.md`.
6. Give them `CE_SUPPORT_PLAYBOOK_v1.0.md` section 3 (the symptom table).
7. Run the daily routine and the weekly tests for 14 days. Use the same log with Phase: B.

Write the choice at section 4.2 of the pilot plan: Customer, Topology, Date.

---

## Part 8. Finish: evidence pack and sign the gate (step 7)

### 8.1 Final evidence pack

1. Make sure everything is committed:
   ```powershell
   git status --short
   ```
   It should be empty. If not, commit and push first.
2. Run the pack:
   ```powershell
   npm run ce:evidence-pack
   ```
3. Expect `"status":"pass"` and a file in `docs\10_post_freeze_technical_design\evidence\` named `CE_EVIDENCE_PACK_<date>.md`. Open it: the line "All 13 check runs passed" must be there and the commit must be a real commit number.
4. Commit that file:
   ```powershell
   git add -A
   git commit -m "CE-S9: evidence pack for the acceptance gate" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_018vV7obk1ibXPH23SnEZYzb"
   git push
   ```

### 8.2 Fill in the pilot sign-off

In `CE_S9_PILOT_PLAN_AND_LOG_v1.0.md` section 6 write: days run, weekly tests passed, S1 and S2 counts, who did the Excel test, the evidence pack commit, your initials and the date. Do it for Phase A (and Phase B if done).

### 8.3 Sign the acceptance gate

Open `CE_ACCEPTANCE_GATE_v1.0.md`. Work top to bottom.

1. **Section 2, entry conditions.** For each of the 9 rows write yes, no, or the date. Row 1 needs the evidence pack. Rows 2 to 5 need the pilot log. If any row is "no", you cannot choose Accept.
2. **Section 3, evidence summary.** Copy the figures from the evidence pack and the pilot sign-off.
3. **Section 4, limitations.** Read the 12 items. For each one decide: fixed, or accepted for now.
4. **Section 5, decision.** Tick exactly one:

   | If | Choose |
   |---|---|
   | Everything in section 2 is yes and you have no open limitation you worry about | Accept |
   | Section 2 is yes, but some limitations remain (for example the Microsoft 365 real-tenant test, no rate limiting, Hobby plan) | Accept with limitations. Fill the table: why acceptable now, owner, close-by date. Tell each customer the limitations in writing |
   | An S1 issue is open, the pilot is under 14 days, or the Excel test failed | Hold. Write what must be true to reconsider |
   | The approach itself does not work | Reject. Write the reason |

5. Write the reason in your own words, your name and the date.
6. Save, commit and push:
   ```powershell
   git add -A
   git commit -m "CE-S9: acceptance gate decision" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_018vV7obk1ibXPH23SnEZYzb"
   git push
   ```
7. Tell the engineering session your decision. It will add a Decision Register entry (a new ADR number) and update the status log. Nothing is accepted until this is recorded.

### 8.4 After the decision

- Accept or Accept with limitations: Connected EDCS may be offered to customers, with the limitations told to each in writing.
- Hold: fix, verify, restart the 14-day count if an S1 was found, then come back to 8.3.
- Reject: stop; the reason goes in the Decision Register.

### Clean up when the pilot ends

```powershell
Remove-Item -Recurse -Force C:\vfirm-pilot
```

Keep `CE_pilot_log.xlsx` and the evidence screenshot first: copy them to your documents folder. In the console, revoke the "Pilot PC" connector (BizKick > Connector > Revoke).
