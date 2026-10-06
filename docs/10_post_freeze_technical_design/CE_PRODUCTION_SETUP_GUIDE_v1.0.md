# vFirm production setup guide (v1.0, 2026-10-06)

For the owner. Plain steps, no prior hosting knowledge assumed. Do the parts in order.

## What you are setting up, and why

- **An API host.** Today the vFirm API only runs on your PC. Connectors on other PCs, the daily BizKick rules run
  and other people's browsers all need a copy that is always on and has a public HTTPS address.
- **A service token (`VFIRM_SERVICE_TOKEN`).** A long random password that only the scheduler (and you) know.
  It lets the daily schedule call the API without a signed-in user. Without it the daily rules run is refused.
- **A schedule (`pg_cron`).** A small timer inside Supabase that calls the API once a day to run the BizKick rules.

Never paste any secret (database password, service token, service-role key) into a chat. Paste it only into the
host's "environment variables" screen or the Supabase SQL editor.

## Part 0. Before you start

- You can sign in to GitHub (the repository `EffortEdutech/vFirm`) and to Supabase (project `gvjjljgzguimpybpgjsf`).
- The `vfirm_app` database password has been reset (done on 2026-10-06). Keep the new one in your password manager.
- Migrations up to 0054 are applied in Supabase (done).

## Part 1. Make the service token

1. In PowerShell run (works in Windows PowerShell and PowerShell 7):
   ```powershell
   $b = New-Object byte[] 32; [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
   ```
2. Copy the result into your password manager as "vFirm service token". You will use it twice: on the API host
   (Part 2) and in Supabase (Part 4).

## Part 2. Host the API

The API is a plain Node.js program: no build step and no extra packages beyond `npm install`.

### Choosing a host (your decision)

Any service that can run a Node.js 20+ program from a GitHub repository and give it a public HTTPS address works
(for example Render, Railway, Fly.io, or Azure App Service). Pick one you are comfortable paying for.

- Choose a **region close to your database**. Your Supabase pooler is in Seoul (`ap-northeast-2`), so choose
  Seoul or Singapore for the host. Every page load talks to the database, so distance matters.
- Choose a plan that **does not sleep** when idle (connectors and the daily schedule must reach it any time).
- Start with one small instance. The scale tests (CE-H1) ran comfortably on a small machine.

### Settings on the host

3. Connect the host to the GitHub repository (branch `main`).
4. Build command: `npm install`.
5. Start command: `node apps/api/src/server.mjs`. (The program reads the `PORT` the host provides.)
6. Health check path (if the host asks): `/health`.
7. Environment variables (type each one into the host's environment screen):

   | Name | Value |
   |---|---|
   | `VFIRM_STORE_BACKEND` | `postgres` |
   | `DATABASE_URL` | the `vfirm_app` pooler address with the **new** password. A password with special characters must be URL-encoded (for example `#` becomes `%23`). |
   | `VFIRM_SUPABASE_URL` | `https://gvjjljgzguimpybpgjsf.supabase.co` |
   | `VFIRM_SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard, Project Settings, API, the **service_role** key. Secret. Needed for invite emails and file storage. |
   | `VFIRM_SERVICE_TOKEN` | the token from Part 1 |
   | `DATABASE_POOL_MAX` | `5` (keeps the connection count small for the pooler) |

   **Do not set** any of these on the production host: `VFIRM_STORE_PATH`, `VFIRM_AUTOMATION_TICK_MS`,
   `VFIRM_ALLOW_FULL_STORE_RESET`, `VFIRM_ALLOW_LEGACY_PILOT_PROVISION`, `VFIRM_ALLOW_TEST_FIRM_PURGE`,
   `VFIRM_STORE_AUTH` (it switches itself on when Postgres and Supabase sign-in are both configured).

8. Deploy. Note the public address the host gives you, for example `https://vfirm-api.example.com`.

### Check the API (from PowerShell)

9. Health:
   ```powershell
   Invoke-RestMethod https://YOUR-API-ADDRESS/health | Select-Object backend, persistence
   ```
   Expect `backend: postgres`.
10. The store guard (ADR-102). Both of these must be **refused**:
    ```powershell
    try { Invoke-RestMethod https://YOUR-API-ADDRESS/mvp/store } catch { $_.Exception.Response.StatusCode.value__ }
    try { Invoke-RestMethod "https://YOUR-API-ADDRESS/mvp/store?tenant_id=x" } catch { $_.Exception.Response.StatusCode.value__ }
    ```
    Expect `403` for the first (whole-database dump locked) and `401` for the second (sign-in required).
    If either returns data, **stop and take the host offline**, then tell me.
10b. The production-auth gate (ADR-103). Both of these must be **refused** with `401`:
    ```powershell
    try { Invoke-RestMethod -Method Post -Uri https://YOUR-API-ADDRESS/clients -ContentType 'application/json' -Body '{"tenant_id":"x","firm_id":"y","name":"t"}' } catch { $_.Exception.Response.StatusCode.value__ }
    try { Invoke-RestMethod https://YOUR-API-ADDRESS/dashboard/summary -Headers @{ 'x-vfirm-actor-id'='x'; 'x-vfirm-tenant-id'='x'; 'x-vfirm-role'='principal' } } catch { $_.Exception.Response.StatusCode.value__ }
    ```
    Then sign in on the console and confirm the pages still load (this is the real-token check).
11. The daily run, by hand:
    ```powershell
    Invoke-RestMethod -Method Post -Uri https://YOUR-API-ADDRESS/automation/tick -Headers @{ 'x-vfirm-service-token' = 'PASTE-THE-TOKEN' }
    ```
    Expect a normal answer (HTTP 200). With a wrong token you get `401`; with no token set on the host, `503`.

## Part 3. Host the console (the screen people use)

The console is a second small program that serves the pages and passes `/api` calls to the API.

12. Create a second service from the same repository.
13. Build command `npm install`. Start command `node apps/web-console/src/server.mjs`.
14. Environment variable: `VFIRM_API_BASE` = the API address from Part 2 (no trailing slash).
15. Deploy, open its address, sign in with your Supabase account. The BizKick pages should load.

## Part 4. The daily schedule (`pg_cron`) in Supabase

Do this only after steps 9 to 11 work.

16. Supabase dashboard, Database, Extensions: switch on **pg_cron** and **pg_net**.
17. In the SQL editor, store the token safely (it stays out of the job text):
    ```sql
    select vault.create_secret('PASTE-THE-TOKEN', 'vfirm_service_token');
    ```
18. Create the daily job (06:00 Malaysia time is 22:00 UTC the day before):
    ```sql
    select cron.schedule(
      'vfirm-automation-tick',
      '0 22 * * *',
      $$
      select net.http_post(
        url := 'https://YOUR-API-ADDRESS/automation/tick',
        headers := jsonb_build_object(
          'content-type', 'application/json',
          'x-vfirm-service-token', (select decrypted_secret from vault.decrypted_secrets where name = 'vfirm_service_token')
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 30000
      );
      $$
    );
    ```
19. Check it ran (after the scheduled time, or temporarily change the time to a few minutes ahead):
    ```sql
    select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;
    select status_code, created from net._http_response order by created desc limit 5;
    ```
    Expect `status_code 200`. To stop the schedule: `select cron.unschedule('vfirm-automation-tick');`.
    Supabase's screen names can differ a little from the above; the SQL is what matters.

## Part 5. Point connectors at the real API

20. In the console, BizKick, Connector: register a connector, copy the token (shown once).
21. On the connector PC, `vfirm_url` in `connector.config.json` is the API address from Part 2.
22. Run the Windows manual test first (`CE_S6_WINDOWS_MANUAL_TEST_v1.0.md`), then install the scheduled task.

## What this guide solves and what it does NOT (read before inviting real users)

- **Production-auth gate (ADR-103, added 2026-10-06).** On a production server (the same switch as ADR-102) one gate now
  sits in front of every route. A request needs a verified Supabase sign-in of an onboarded user, except `/health`,
  `/auth/me`, `/auth/provider/config`, sign-up (verified session only), the daily tick and `/mvp/store` (service token) and
  the three connector routes (connector token). A request body or query may only name the signed-in user's own tenant and
  firm. `POST /tenants`, `POST /firms` and `POST /mvp/reset` are closed. Client-set `x-vfirm-*` headers and the system-actor
  fallback can no longer be reached on a production server. Proved by `npm run check:pa:request-gate` (no database) and the
  pure rule; **not yet proved with a real Supabase token end to end**: do the sign-in check below on the real host.
- **Still not covered:** which role may do what on each route (the per-route role rules are unchanged and have not been
  audited one by one), and the gate has no rate limiting.
- Audit events are written after the data commit, not in the same transaction.
- No backups or alerts are configured by this guide. Check Supabase's backup settings for your plan.

## Decisions for you

- Decided 2026-10-06: Vercel, Singapore region (ADR-103). Vercel runs functions, not a long-running server, so the API
  needs a thin Vercel entry point before Part 2 can be followed on Vercel; Parts 1, 4 and 5 and the environment variables
  stay the same. Until that is built, Part 2 steps 3 to 8 describe a generic Node host.
- Decided 2026-10-06: run the production-auth sprint (gate delivered; see above).
