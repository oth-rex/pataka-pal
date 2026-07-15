# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Start here

Before doing anything else, read the 4 planning docs in `docs/` (this folder is **git-ignored** — it doesn't sync via Git, only via OneDrive, so always check for a newer copy). Each doc is versioned as `_v1`, `_v2`, etc.; **the highest `_vN` suffix is current** — an un-suffixed filename (e.g. `PROGRESS_TRACKER.md`) is an old, stale copy, not the latest.

1. **`INSTANT_ONBOARD_vN.md`** — project context, current architecture/deploy status, the CORS-on-Flex gotcha, and Rex's communication preferences (Rex is not a coder — read this before writing any instructions for him).
2. **`PROGRESS_TRACKER_vN.md`** — session-by-session log, most recent first. The actual current status and next action.
3. **`TESTING_LOG_vN.md`** — what's already been tried and failed. Check before re-suggesting an approach.
4. **`future_features_backlog_vN.md`** — planned/backlog features not yet built.

If any of these is missing, stop and ask Rex rather than guessing.

## Project overview

**Pātaka Pal** — a Progressive Web App for the Pātaka Kai Movement (community food-sharing boxes), built for the NZ charity **On The House (OTH)**. Tracks food donations/collections at physical pātaka (cupboards) via QR code or map selection, uses AI to identify and count donated/taken food items from photos, and lets people report issues with a pātaka.

Currently in **Beta push**; production is live. See `docs/PROGRESS_TRACKER_vN.md` for current status.

## Tech stack

- **Frontend:** Vanilla JS (ES6 modules), no framework, no build step, no bundler. Leaflet/OpenStreetMap for the map, `qr-scanner` for QR codes.
- **Backend:** Azure Functions, Node 22, **v4 programming model** (`functions-v4/`), Flex Consumption plan.
- **Database:** Azure SQL, serverless tier (auto-pauses when idle).
- **Storage:** Azure Blob Storage (donation/taking/issue photos).
- **AI:** Azure OpenAI, vision model, called from `analyzeFood`.
- **Email:** Azure Communication Services (issue notifications).

## Repo structure

```
index.html, css/styles.css
js/               config.js (API_BASE_URL) · app-core.js · qr-scanner.js · map-functions.js ·
                  photo-utils.js · donate-workflow.js · take-workflow.js · report-workflow.js
functions-v4/     LIVE backend — v4 model, deploys to Azure Function App oth-pataka-api-v4
docs/             git-ignored planning docs (see "Start here")
.github/workflows/  CI/CD (see Deploys below)
```

`js/config.js` holds the single `API_BASE_URL` constant that every frontend call goes through — check `docs/INSTANT_ONBOARD_vN.md` for which backend it currently points at before assuming.

## Commands

There is no build step, linter, or test suite configured anywhere in this repo.

**Frontend:** static files, open `index.html` directly or serve via any static file server. No `npm install` needed at the repo root.

**Backend (`functions-v4/`):**
```
cd functions-v4
npm install
npm start          # runs `func start` — requires Azure Functions Core Tools installed locally
```
Local dev needs a `local.settings.json` in `functions-v4/` (not committed) with `SQL_CONN_STRING`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`, `AZURE_OPENAI_KEY`, `BLOB_CONN_STRING`, `ACS_CONNECTION_STRING`, etc.

## Deploys

Both are automatic on push to `main` — **merging to `main` deploys to production directly**, there is no manual approval step:

- **Frontend** — `.github/workflows/azure-static-web-apps-*.yml`, triggers on any push to `main`, deploys the whole repo to the Azure Static Web App. A PR (not yet merged) also gets its own preview deployment with its own URL, found in the PR's "Azure Static Web Apps CI/CD" check log.
- **Backend** — `.github/workflows/deploy-functions-v4.yml`, triggers only on pushes to `main` that touch `functions-v4/**`, deploys to Function App `oth-pataka-api-v4` (Flex Consumption) via publish-profile secret `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`.

**To test a backend or frontend change on a real phone without touching production:** push to a branch, open a PR (don't merge), and use the PR's preview URL. This is the documented, working way to validate — see `docs/INSTANT_ONBOARD_vN.md` for the exact steps.

## Architecture notes that matter

- **v3 and v4 Azure Functions programming models cannot coexist in one Function App** — one v4 function makes the host ignore all v3 (`function.json`-based) functions. This is why the whole backend had to move together into a new `functions-v4/` app rather than being migrated in place. The old v3 app (`oth-pataka-api`) and its `azure-functions/` code have since been decommissioned and deleted.
- **CORS on Flex Consumption is handled in code, not the platform.** Setting allowed origins via the Azure portal or `az functionapp cors` does nothing — Flex intercepts the browser's preflight `OPTIONS` request and returns a bare 204 before our code runs. CORS headers are set in `functions-v4/src/shared/cors.js`; don't remove them. Consequently, **every frontend→backend request must stay "simple"** (no CORS preflight): GET, or POST with `Content-Type: text/plain` or `multipart/form-data`, no custom headers. A preflighted request will silently fail on this app.
- SQL resume-retry logic lives in `functions-v4/src/shared/db.js` to absorb the serverless database's auto-pause/resume delay.

## Safety rules

- **Never modify the live database directly.** Any schema or data change goes into a `.sql` file for Rex to review and run himself — do not connect and execute against `PatakaPalDB` directly.
- **Never push or merge to `main`** for a backend or frontend change without first validating it via a PR preview (see Deploys above) — a merge to `main` ships straight to production users.
- **Don't create, delete, or reconfigure Azure resources** — Rex manages those in the Azure portal himself.
