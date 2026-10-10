# vFirm EDCS Connector

A small background program that runs on the PC (or server) that can see your **BizKick** folder. It watches the
BizKick register and your controlled document folders and sends vFirm only **what changed**.

> BizKick is the source, the Bridge is the contract, vFirm is the governed record.
> The connector **reads** BizKick. It never edits, moves, renames or deletes a BizKick file.

## What it does

- Reads the register workbook (the `TRANSACTION REGISTER` sheet, or a CSV export of it) and works out which rows
  changed since the last time. Change one row: one sync event in vFirm, with the same outcome (created, updated,
  revised, conflict, ...) you would get by uploading the register by hand.
- Looks at your controlled folders. A file named with a Transaction ID (for example `NEX-QT-2026-0007_R1.pdf`) is
  filed against that transaction. Whether vFirm keeps the file's **content** or only its **name, size and
  fingerprint** follows your content policy: HR and other sensitive documents are metadata only by default, and
  for those the file's bytes never leave the PC.
- Keeps an on-disk queue. If the network drops, changes wait on disk and are delivered, in order, when it
  returns, with no duplicates (every delivery carries a key, so a delivery whose acknowledgement was lost is
  recognised and applied once).
- Sends a heartbeat so the vFirm console (BizKick > Connector) shows when it was last seen, its last sync, how
  many deliveries are waiting, and any error.

## What it never does

- Write inside the BizKick folder. The one exception is an optional `_vFirm_Outbox` folder (off by default; a
  later sprint uses it to hand files back). Even then every path is checked to stay inside that folder.
- Keep its own files inside BizKick. `state_dir` must be outside it (the program refuses otherwise).
- Send an HR file's content, or any file whose policy is metadata only.
- Keep sending after you revoke it.

## Install (Windows)

1. In the vFirm console go to **BizKick > Connector**, register a connector, and copy its token (it is shown
   once; if you lose it, issue a new one).
2. Install **Node.js 20 or newer** on the PC.
3. Copy this folder to the PC, for example `C:\Program Files\vFirmConnector`.
4. Copy `config.example.json` to `C:\ProgramData\vFirmConnector\connector.config.json` and fill it in
   (`vfirm_url`, `bizkick_root`, `register_path`, your controlled folders). Put the token in the file, or set the
   `VFIRM_CONNECTOR_TOKEN` environment variable for the account that runs the task.
5. Try it once, by hand: `node bin\edcs-connector.mjs once --config C:\ProgramData\vFirmConnector\connector.config.json`
   (exit code 0 = fine, 2 = a problem this round, 3 = revoked).
6. Install it as a scheduled task that starts with Windows and restarts if it stops:
   `powershell -ExecutionPolicy Bypass -File .\packaging\install-windows-task.ps1 -ConfigPath C:\ProgramData\vFirmConnector\connector.config.json`

## Topologies

- **A: BizKick on the connector's own PC.** `bizkick_root` is a normal path such as `C:\BizKick`. The task runs
  as SYSTEM (the default).
- **C: BizKick on a shared folder.** `bizkick_root` is a UNC path such as `\\server\BizKick`. Windows does not
  let SYSTEM reach a network share, so create a **service account** (for example `svc-vfirm`) with **Read-only**
  access to the share and its folders, and install with `-RunAs "DOMAIN\svc-vfirm" -Password (Read-Host -AsSecureString)`.
  Give that account Modify rights only on `state_dir`, never on BizKick. Same build, same configuration; only
  the path and the account differ. File-change notifications are unreliable on shares, so the connector also
  checks on a timer (`poll_interval_seconds`); that is what guarantees nothing is missed.

## Outbox (CE-S8, off by default)

- Set `"outbox_enabled": true` in the config to let the connector collect documents the owner has approved in vFirm (BizKick > Drafting).
- Each approved file is written into `_vFirm_Outbox` inside the BizKick folder, using the Transaction ID in the file name.
- It is the only place the connector writes. It never overwrites: if a file with that name exists, it is left alone and the difference is reported.
- Move the file into the right BizKick folder yourself and add its row to the register; the next sync links it.

## Commands

    node bin\edcs-connector.mjs run    --config <file>   keep running (what the scheduled task runs)
    node bin\edcs-connector.mjs once   --config <file>   one round, then exit
    node bin\edcs-connector.mjs status --config <file>   show the local status

## Tokens

The token identifies this connector to vFirm and to exactly one firm. vFirm stores only a hash of it. The owner
can issue a new token (the old one stops working at once) or revoke the connector in the console. A revoked
connector is refused, stops sending, and shows as **Revoked** in the console; its queue stays on disk.

## Building the package

From the repository: `npm --prefix apps/edcs-connector run package` writes a self-contained folder to
`apps/edcs-connector/dist/vfirm-edcs-connector` (the shared reader files are copied in and the imports
rewritten), ready to zip and copy to the PC.

## Trying it on your own PC first

`scripts/local-test-kit.mjs` (in the repository, not in the packaged folder) builds a throw-away test firm, a sample
BizKick folder and a ready configuration against a vFirm API running on the same PC, and refuses any other address.
The step-by-step test is `docs/10_post_freeze_technical_design/CE_S6_WINDOWS_MANUAL_TEST_v1.0.md`.
Going live (API host, service token, schedule) is `CE_PRODUCTION_SETUP_GUIDE_v1.0.md` in the same folder.
