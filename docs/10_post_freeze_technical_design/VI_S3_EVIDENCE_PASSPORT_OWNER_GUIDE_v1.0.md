# Evidence Passport: owner guide (VI-S3)

Plain steps for the firm owner. Decision record: ADR-111.

## What it is

- A sealed zip you give to a bank, tender board or auditor.
- It holds the documents you choose, a list of every file with its fingerprint, who approved what and when, the BizKick sync history, and a short audit extract.
- The other side opens `verify.html` inside the zip. No account, no internet. It says PASS or FAIL.
- Open **Overview > Evidence Passport**. Only the firm owner can use it.

## Build one

1. **Choose what goes in.**
   - Tick documents.
   - Tick BizKick transactions. Leave "Include the whole chain" ticked to bring the related quotation, delivery order, invoice and so on.
   - Pick **Current only** or **All revisions**.
   - Optionally set a From and To date (Malaysia time) to keep only revisions filed in that window.
   - Write the purpose (3 to 300 characters). Add who it is for if you like.
2. **Press Preview.** Nothing is built yet. You see every document, whether it is in or left out, and why.
3. **Restricted items.**
   - HR and finance restricted documents are left out by default.
   - To include one, tick its box in the preview table and press Preview again.
   - Each one you include is recorded in the audit log and printed on the cover page.
4. **Press Create passport.** It only enables after a preview of the same choices. If you change anything, preview again.
5. **Download** the zip from **Issued passports**.

## Give it to the other side

1. Send the zip.
2. Tell them the **seal** by a different route (a phone call or a separate message). The seal is the long code shown next to the passport. Hover it to see the full code.
3. They open `verify.html`, choose the zip (or the extracted folder), paste the seal in the box, and read the result.

Why a different route: the seal is what proves nobody swapped the whole bundle. If it travels in the same zip, it proves less.

## What the checks mean

- **PASS**: every file is there, nothing was added, every fingerprint matches, and the manifest matches its seal.
- **FAIL**: something changed or is missing. The page says which check failed.
- **Verify now** (in vFirm) runs the same check on the stored copy. Every download also re-checks, and vFirm refuses to hand out a bundle that no longer verifies.

## Good to know

- Content vFirm never stored (for example HR files kept as record only) goes in as a fingerprint, not the file.
- The audit extract lists event type, time, who and a short summary. It never carries the details inside an event.
- The bundle is classified as the strictest class inside it.
- `verify.html` is not covered by the seal. Its fingerprint is saved in the passport record.
- Limit: 25 MB per passport. If it is too big, take fewer documents or current revisions only.
- vFirm does not send the passport anywhere and does not sign it with a certificate.

## One-time setup (owner)

1. In Supabase, apply migration `0059_evidence_passports.sql` (SQL editor, paste, run).
2. After Vercel redeploys, open **Overview > Evidence Passport**.
