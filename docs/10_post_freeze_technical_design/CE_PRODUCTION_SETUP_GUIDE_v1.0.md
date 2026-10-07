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

## Part 2. Host the API and the console on Vercel (one project, Singapore)

Decided 2026-10-06 (ADR-103); the adapter is ADR-104. One Vercel project serves the console pages and the API, so
there is one address and no cross-site setup. The API lives under `/api` on that address.

### Know these limits first

- **Plan.** Vercel's free Hobby plan is for non-commercial use. vFirm is a business product, so use a paid plan
  (Pro). Check the current terms on vercel.com/pricing before you deploy.
- **Request size.** Vercel refuses a request body over about 4.5 MB. A file travels inside JSON (about a third bigger), so
  the practical file limit is about 3 MB. The connector's `max_file_bytes` now defaults to 3 MiB (larger files are listed
  as skipped, not sent). A register workbook uploaded in the console has the same limit. Raise it only on a host
  without this limit.
- **Run time.** The function is set to a 60 second limit in `vercel.json`. Normal requests take well under a second;
  a 500-row register import takes about 1.5 seconds.
- **Not tested on the real platform yet.** `npm run check:vercel:adapter` simulates it. The first preview deploy is
  the real test (steps below).

### Settings in Vercel

3. Vercel dashboard, Add New, Project, import the GitHub repository `EffortEdutech/vFirm`. Framework preset: **Other**.
   Leave the root directory as the repository root. Leave the build and output settings alone: `vercel.json` sets
   them (build `node scripts/build-vercel-static.mjs`, output `dist`, region `sin1`, rewrite `/api/*` to the function).
4. Environment variables, **Production only** (type each one into the Vercel screen):

   | Name | Value |
   |---|---|
   | `VFIRM_STORE_BACKEND` | `postgres` |
   | `DATABASE_URL` | the `vfirm_app` address with the **new** password. Prefer Supabase's **Transaction** pooler (port 6543) for Vercel: many short-lived function instances share it better than the Session pooler. A password with special characters must be URL-encoded (`#` becomes `%23`). |
   | `VFIRM_SUPABASE_URL` | `https://gvjjljgzguimpybpgjsf.supabase.co` |
   | `VFIRM_SUPABASE_SERVICE_ROLE_KEY` | Supabase, Project Settings, API, the **service_role** key. Secret. |
   | `VFIRM_SERVICE_TOKEN` | the token from Part 1 |
   | `DATABASE_POOL_MAX` | `3` (each function instance keeps its own small pool) |
   | `VFIRM_FILE_STORAGE_BACKEND`, `VFIRM_FILE_BUCKET` | the same values the current production setup uses |

   **Do not set** `VFIRM_STORE_PATH`, `VFIRM_AUTOMATION_TICK_MS`, `VFIRM_ALLOW_FULL_STORE_RESET`,
   `VFIRM_ALLOW_LEGACY_PILOT_PROVISION`, `VFIRM_ALLOW_TEST_FIRM_PURGE`, `VFIRM_STORE_AUTH`, `VFIRM_API_BASE` or
   `VFIRM_WEB_CONSOLE_PORT`. Do not copy preview environments from production: previews should not touch the real database.
5. Deploy. Vercel gives an address like `https://your-project.vercel.app`. Below, **API address** means that address
   plus `/api`, for example `https://your-project.vercel.app/api`.
6. If a check below returns an HTML sign-in page instead of data, Vercel's Deployment Protection is blocking the
   address. Connectors and the daily schedule must reach the API without a Vercel login, so make sure protection does
   not cover the production address (Project Settings, Deployment Protection), then try again.

### Check the API (from PowerShell)

7. Health:
   ```powershell
   Invoke-RestMethod https://YOUR-PROJECT.vercel.app/api/health | Select-Object backend, persistence
   ```
   Expect `backend: postgres`.
8. The store guard (ADR-102). Both of these must be **refused**:
   ```powershell
   try { Invoke-RestMethod https://YOUR-PROJECT.vercel.app/api/mvp/store } catch { $_.Exception.Response.StatusCode.value__ }
   try { Invoke-RestMethod "https://YOUR-PROJECT.vercel.app/api/mvp/store?tenant_id=x" } catch { $_.Exception.Response.StatusCode.value__ }
   ```
   Expect `403` for the first and `401` for the second. If either returns data, **stop and take the project offline**.
9. The production-auth gate (ADR-103). Both must be refused with `401`:
   ```powershell
   try { Invoke-RestMethod -Method Post -Uri https://YOUR-PROJECT.vercel.app/api/clients -ContentType 'application/json' -Body '{"tenant_id":"x","firm_id":"y","name":"t"}' } catch { $_.Exception.Response.StatusCode.value__ }
   try { Invoke-RestMethod https://YOUR-PROJECT.vercel.app/api/dashboard/summary -Headers @{ 'x-vfirm-actor-id'='x'; 'x-vfirm-tenant-id'='x'; 'x-vfirm-role'='principal' } } catch { $_.Exception.Response.StatusCode.value__ }
   ```
10. The daily run, by hand:
    ```powershell
    Invoke-RestMethod -Method Post -Uri https://YOUR-PROJECT.vercel.app/api/automation/tick -Headers @{ 'x-vfirm-service-token' = 'PASTE-THE-TOKEN' }
    ```
    Expect a normal answer (HTTP 200). With a wrong token you get `401`; with no token set on the host, `503`.

## Part 3. The console

The console pages are part of the same Vercel project.

11. Open `https://YOUR-PROJECT.vercel.app/`, sign in with your Supabase account. The BizKick pages should load.
    This is also the **real sign-in test** of the production-auth gate: if pages load, a verified token passes the gate.

## Part 4. The daily schedule (`pg_cron`) in Supabase

Do this only after steps 7 to 10 work.

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
        url := 'https://YOUR-PROJECT.vercel.app/api/automation/tick',
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
21. On the connector PC, `vfirm_url` in `connector.config.json` is the API address from Part 2 (`https://YOUR-PROJECT.vercel.app/api`).
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

- Decided 2026-10-06: Vercel, Singapore region (ADR-103). The Vercel adapter is built (ADR-104); the first preview deploy is the real test.
- Decided 2026-10-06: run the production-auth sprint (gate delivered; see above).
