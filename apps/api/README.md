# vFirm API Scaffold

This is the first runnable API scaffold for the vFirm MVP foundation loop.

It is intentionally minimal and dependency-light. It proves that the project can load API contracts, evaluate policy fixtures, expose service pack configuration, persist the first MVP command loop, and run a health check before we choose a larger application framework.

## Port convention

vFirm uses the `309#` localhost family to avoid confusion with other local apps.

| Service | Port |
|---|---:|
| Web/main app target | 3090 |
| API default | 3091 |
| API smoke test | 3099 |

## Run

```powershell
npm run dev
```

Default API URL:

```text
http://127.0.0.1:3091
```

Override port:

```powershell
$env:VFIRM_API_PORT=3092
npm run dev
```

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | API scaffold health check. |
| GET | `/contracts` | Returns current MVP API contract list. |
| POST | `/policy/evaluate` | Evaluates a policy input using the current policy engine skeleton. |
| GET | `/service-packs/formwork` | Returns VF-SP-001 Formwork service pack config. |
| GET | `/database/schema` | Confirms database schema artifact is available. |
| POST | `/tenants` | Create tenant. |
| POST | `/firms` | Create Firm and Principal actor/person. |
| POST | `/clients` | Create client and Firm-client relationship. |
| POST | `/intake-sessions` | Create lead and intake session. |
| POST | `/proposals` | Create price build-up and proposal. |
| POST | `/proposals/approve` | Approve proposal. |
| POST | `/proposals/accept` | Accept proposal and open engagement/project/work package/task. |
| POST | `/evidence-bundles` | Create evidence bundle. |
| POST | `/invoices` | Create invoice. |
| POST | `/mvp/demo-loop` | Convenience endpoint that runs the full command sequence. |
| GET | `/mvp/store` | Returns the local JSON development store. |

## Checks

```powershell
npm run check
npm run check:api
npm run check:policy
npm run db:migrate
```

`npm run db:migrate` validates migration files only. Use `npm run db:migrate:apply` with `DATABASE_URL` configured to apply migrations through `psql`.

## Current boundary

This scaffold is not yet the production API. It is the runnable foundation for converting the frozen architecture and post-freeze technical design into services, migrations, tests, and eventually UI workflows.
