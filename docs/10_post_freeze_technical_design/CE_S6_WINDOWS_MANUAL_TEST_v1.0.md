# CE-S6 Windows manual test (v1.0, 2026-10-06)

This is the last open acceptance item for CE-S6 (ADR-101). It proves the connector works on a real Windows PC.
It needs **no hosting and no production access**: you run a throw-away vFirm API on your own PC.

Everything below is PowerShell. Use two windows. **Window 1** runs the API and stays open. **Window 2** is where you work.

## Before you start

- Node.js 20 or newer is installed (`node --version`).
- You are in the virtual-firm folder in both windows:
  `cd "C:\Users\user\Documents\00 Agent Skills\virtual-firm"`
- Nothing in this test touches production. Window 1 uses a temporary JSON file, and the test firm exists only there.

## Part A. Start the throw-away API (Window 1)

1. Clear anything that could point at a real database:
   ```powershell
   Remove-Item Env:VFIRM_SMOKE_DATABASE_URL -ErrorAction SilentlyContinue
   Remove-Item Env:VFIRM_SUPABASE_URL -ErrorAction SilentlyContinue
   Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
   ```
2. Start the API on a temporary store:
   ```powershell
   $env:VFIRM_STORE_BACKEND = "json"
   $env:VFIRM_STORE_PATH = "$env:TEMP\vfirm-connector-test-store.json"
   $env:VFIRM_API_PORT = "3091"
   node apps\api\src\server.mjs
   ```
3. In Window 2, check it is the throw-away store:
   ```powershell
   Invoke-RestMethod http://127.0.0.1:3091/health | Select-Object backend, persistence
   ```
   **You must see `backend: json` and `persistence: local-json`.** If you see `postgres`, stop and close Window 1.

## Part B. Build the test kit (Window 2)

4. Create the test firm, the connector, a sample BizKick folder and the config file:
   ```powershell
   node apps\edcs-connector\scripts\local-test-kit.mjs --api http://127.0.0.1:3091 --out C:\vfirm-connector-test
   ```
   It refuses any address that is not this PC. It writes, under `C:\vfirm-connector-test`:
   the sample `BizKick` folder (a register of 6 rows, one Sales file, one HR file), `connector.config.json`
   (token already filled in), `read-api.ps1` (look at results) and `post-api.ps1` (revoke).
   The two `.ps1` helpers were written but could not be run in PowerShell by the author (no PowerShell in the
   build environment). If one fails, the same call works with `Invoke-RestMethod` and the headers inside the file.

## Part C. The five acceptance checks (Window 2)

**About exit codes (checks 2 and 3).** Read the code straight after the command, in the same PowerShell window: `$LASTEXITCODE`. It must be read from a direct `node ...` call. If the connector is started through `npm run`, a wrapper or a test runner, any non-zero code is reported as `1`. The connector itself returns 0 (fine), 2 (a problem this round, work kept) or 3 (revoked). The printed `waiting: true` and `fatal: CONNECTOR_REVOKED` lines are the reliable signs either way.

**Check 1. One changed row gives exactly one sync event, with the right outcome**

5. First delivery:
   ```powershell
   node apps\edcs-connector\bin\edcs-connector.mjs once --config C:\vfirm-connector-test\connector.config.json
   ```
   Expect: `register: QUEUED`, `files: queued 2, metadata_only 1, with_content 1`, `flush: delivered 3, duplicates 0, dead 0`.
6. Look at the sync runs:
   ```powershell
   cd C:\vfirm-connector-test
   .\read-api.ps1 /edcs/sync-runs
   ```
   Expect one run with `CREATED: 6`.
7. Open `C:\vfirm-connector-test\BizKick\EDCS\register.csv` in **Notepad** (run `notepad C:\vfirm-connector-test\BizKick\EDCS\register.csv`). Change the amount of **one** row
   (the first quotation: `1000` to `1500`) and save. Do not change the revision (`R0`). Change nothing else. (Excel also works since ADR-105: it rewrites the dates as `01-09-26`, which vFirm now reads day first. Before ADR-105 such a save made every row INVALID_DATE.)
8. Run the connector again (from the virtual-firm folder) and look at the runs:
   ```powershell
   cd "C:\Users\user\Documents\00 Agent Skills\virtual-firm"
   node apps\edcs-connector\bin\edcs-connector.mjs once --config C:\vfirm-connector-test\connector.config.json
   cd C:\vfirm-connector-test; .\read-api.ps1 /edcs/sync-runs
   ```
   Expect exactly **one new run** (runs are listed newest first) with **`CONFLICT: 1`** and nothing else changed.
   The revision did not change but a money field did, so it is a conflict, the same outcome as uploading the file
   by hand. The other 5 rows are not re-sent. (To see the other outcome, change the revision to `R1` as well:
   the engine then records the change as a new revision, **REVISED**.)

**Check 2. Network off, queued, delivered after reconnect, no duplicates**

9. In Window 1 press **Ctrl+C** to stop the API (this is "network off").
10. Change another row in `register.csv` (for example the amount of the second quotation) and save.
11. Run the connector once. Expect it to report a problem this round (exit code 2) and to keep the change
    waiting: it is queued on disk under `C:\vfirm-connector-test\connector-state`, nothing is lost.
12. In Window 1 start the API again with the same three `$env` lines and `node apps\api\src\server.mjs`
    (same store file, so the test firm is still there).
13. Run the connector once again. Expect `delivered: 1`, `duplicates: 0`. Run it a third time: nothing new to send.
    In `.\read-api.ps1 /edcs/sync-runs` there is **one** run for that change, not two.

**Check 3. A revoked token is refused, and the connector shows as revoked**

14. Get the connector id:
    ```powershell
    cd C:\vfirm-connector-test; .\read-api.ps1 /edcs/connectors
    ```
    Copy the `id` of "Manual test PC".
15. Revoke it:
    ```powershell
    .\post-api.ps1 /edcs/connectors/revoke '{"connector_id":"PASTE-THE-ID-HERE"}'
    ```
16. Change a row again and run the connector once. Expect it to stop with exit code **3** (revoked) and
    nothing delivered. `.\read-api.ps1 /edcs/connectors` now shows `status: REVOKED`.

**Check 4. The connector never writes inside BizKick**

17. Before step 5, and again at the end, list the BizKick folder with sizes and times:
    ```powershell
    Get-ChildItem C:\vfirm-connector-test\BizKick -Recurse -File | Select-Object FullName, Length, LastWriteTime
    ```
    The only differences allowed are the edits **you** made to `register.csv`. No new file, no renamed file,
    no `_vFirm_Outbox` folder (it is off by default). The connector's own files are all under
    `C:\vfirm-connector-test\connector-state`, which is outside BizKick.

**Check 5. HR files are metadata only**

18. In step 5 the report said `metadata_only: 1`. That is the leave file in the `HR` folder
    (`NEX-LV-2026-0001_R0.txt`; `LV` is an HR document type). To confirm:
    ```powershell
    .\read-api.ps1 /edcs/documents/NEX-LV-2026-0001
    ```
    Expect `classification: HR_RESTRICTED` and `content_policy: METADATA_ONLY`, with the revision recorded by its
    fingerprint (`content_hash`). The Sales file (`NEX-QT-2026-0001_R0.txt`) is filed with its content.

## Part D. Install as a Windows scheduled task (only on the PC that will really run it)

19. From an **elevated** PowerShell, with a real `connector.config.json` (the real API address and a real token
    from the console), in the unpacked package folder:
    ```powershell
    powershell -ExecutionPolicy Bypass -File .\packaging\install-windows-task.ps1 -ConfigPath "C:\ProgramData\vFirmConnector\connector.config.json"
    ```
    To remove it: `Unregister-ScheduledTask -TaskName 'vFirm EDCS Connector' -Confirm:$false`.
    This needs the real API to be hosted first: see `CE_PRODUCTION_SETUP_GUIDE_v1.0.md`.

## Clean up

20. Close Window 1 (Ctrl+C), then delete `C:\vfirm-connector-test` and `$env:TEMP\vfirm-connector-test-store.json`.
    The test firm lived only in that temporary file.

## Pass criteria

- Check 1: one run, one changed row, the expected outcome.
- Check 2: one delivery after reconnect, no duplicate.
- Check 3: exit code 3 and `REVOKED` in the connector list.
- Check 4: no change inside BizKick other than your own edits.
- Check 5: the HR file is filed as metadata only.

Record the result (date, who ran it, pass or fail per check) under CE-S6 in the sprint plan.
