# CE-S7 Microsoft 365 setup guide (Entra app, Sites.Selected)

Version 1.0, 2026-10-08. Plain-language, copy-and-paste. ADR-106.

**What this does:** vFirm reads ONE folder of ONE SharePoint/OneDrive library, read-only. It never edits BizKick files. Your IT admin can withdraw the access at any time and vFirm shows "Microsoft stopped the access".

**Who does what**
- Person A = Microsoft 365 admin (Global Admin, or Application Admin plus SharePoint Admin).
- Person B = vFirm firm owner (types the values into vFirm).

Never send the secret by email or chat. Person A types it into vFirm, or shares it through a password manager.

---

## Part 0 - Before you start (Person B)

- [ ] Migration `0055_connected_edcs_graph.sql` applied in Supabase (SQL Editor: paste the file, Run).
- [ ] `VFIRM_SECRET_KEY` added in Vercel (Settings > Environment Variables, Production). Make a 32-byte key. In PowerShell run:
  `[Convert]::ToBase64String([byte[]](1..32 | ForEach-Object { Get-Random -Maximum 256 }))`
  Save it in your password vault. If you lose it, stored Microsoft secrets cannot be read and must be typed in again.
- [ ] Redeploy in Vercel.
- [ ] The BizKick folder is inside a SharePoint document library (or OneDrive for Business). Example: library "Documents", folder `BizKick`, register at `BizKick/EDCS/register.xlsx`.

## Part 1 - Register the app (Person A)

1. Go to https://entra.microsoft.com > Identity > Applications > App registrations > New registration.
2. Name: `vFirm BizKick Reader`. Supported account types: **Single tenant**. No redirect URI. Register.
3. On the Overview page copy to a safe note:
   - Application (client) ID
   - Directory (tenant) ID

## Part 2 - Give it the one permission (Person A)

1. In the app: API permissions > Add a permission > Microsoft Graph > **Application permissions**.
2. Search `Sites.Selected`, tick it, Add permissions.
3. Press **Grant admin consent for your organisation**. Status must show a green tick.
4. Do NOT add any other permission. Sites.Selected alone gives access to nothing until Part 4.

## Part 3 - Create the secret (Person A)

1. Certificates & secrets > Client secrets > New client secret. Description `vFirm`, expiry 12 months (calendar reminder at 11 months).
2. Copy the **Value** straight away (not the Secret ID). It is shown once.

## Part 4 - Grant the app read access to ONE site (Person A)

Sites.Selected does nothing until a site is granted. Easiest way, PnP PowerShell (run once):

```powershell
Install-Module PnP.PowerShell -Scope CurrentUser
Connect-PnPOnline -Url https://YOURTENANT-admin.sharepoint.com -Interactive
Grant-PnPAzureADAppSitePermission -AppId "<Application (client) ID>" -DisplayName "vFirm BizKick Reader" -Site "https://YOURTENANT.sharepoint.com/sites/YOURSITE" -Permissions Read
```

Check: `Get-PnPAzureADAppSitePermission -Site "https://YOURTENANT.sharepoint.com/sites/YOURSITE"` shows the app with role `read`.

Use **Read**, never Write. vFirm never writes.

## Part 5 - Find the library (drive) ID

In Microsoft Graph Explorer (https://developer.microsoft.com/graph/graph-explorer), signed in as the admin:

1. `GET https://graph.microsoft.com/v1.0/sites/YOURTENANT.sharepoint.com:/sites/YOURSITE` - copy `id`.
2. `GET https://graph.microsoft.com/v1.0/sites/<that id>/drives` - find the library (usually "Documents") and copy its `id` (starts with `b!`). This is the **Document library (drive) ID**.

## Part 6 - Connect in vFirm (Person B)

1. vFirm > BizKick > **Microsoft 365**.
2. Fill in:
   - Directory (tenant) ID
   - Application (client) ID
   - Client secret value
   - Document library (drive) ID
   - The one folder vFirm may read: `BizKick`
   - Register file inside that folder: `EDCS/register.xlsx`
   - Controlled folders inside it, one per line: `Sales`, `Purchases`, `HR`, ...
3. Press **Save and check access**. vFirm signs in and opens exactly that folder before saving anything.
4. Press **Read now**. In BizKick > Sync history the newest run shows source "Microsoft 365".
5. From now on the daily 06:00 job reads it automatically.

## If something goes wrong

| What you see | Meaning | Fix |
|---|---|---|
| "Microsoft did not accept the app id or secret" | Wrong value, or the Secret ID was copied | Make a new secret, copy the Value |
| "Microsoft says the app has no access" | Part 4 not done, or wrong site | Redo Part 4 for the site that holds the library |
| "Not found ... open the folder" | Folder path wrong | Path is inside the library, e.g. `BizKick`, no leading slash |
| "Microsoft stopped the access" | Admin removed the grant, secret expired, or app deleted | Fix in Entra, then press Save and check access (no need to retype the secret unless it changed) |
| "This server has no VFIRM_SECRET_KEY" | Part 0 not done | Add the key in Vercel and redeploy |

## Taking access away

- vFirm side: BizKick > Microsoft 365 > **Disconnect**. This erases the stored secret.
- Microsoft side: remove the grant (`Revoke-PnPAzureADAppSitePermission`) or delete the app in Entra. vFirm then shows "Microsoft stopped the access" and stops.
- Do both when you leave vFirm.

## Real-tenant test checklist (when you have a tenant)

- [ ] Parts 1-6 done with a test site and a copy of the register.
- [ ] Read now: a register run appears with source "Microsoft 365"; counts equal an upload of the same file.
- [ ] Edit the register in Excel for the web, save, Read now: only the changed row is an event.
- [ ] Put a file outside the BizKick folder: it is not filed.
- [ ] Put a file in `HR`: filed as metadata only.
- [ ] Remove the grant in Part 4: Read now shows "Microsoft stopped the access".
- [ ] Disconnect: secret erased, status Disconnected.

## Need a test tenant?

Microsoft's free developer sandbox is no longer given to everyone (many people see "You don't currently qualify for a sandbox subscription"). Options: a small paid Microsoft 365 Business Basic tenant for one month, or your firm's real tenant with a test site.
