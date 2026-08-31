# vFirm Web App Shell

The web app is the first internal operator console for the vFirm MVP loop. It is intentionally not a marketing landing page.

## Port

```text
http://127.0.0.1:3090
```

The web shell expects the API at:

```text
http://127.0.0.1:3091
```

## Run

From the project root:

```powershell
npm run dev
```

Or run only the web server:

```powershell
npm run dev:web
```

## Current screens

- API health status.
- MVP loop creation form.
- Created record summary.
- Local store counts.
- Event log viewer.
- Audit trail viewer.

## Checks

```powershell
npm run check:web
npm run check
```
