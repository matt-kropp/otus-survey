# CLAUDE.md

Project context for Claude Code. Read this before making changes.

## What this is

A teacher survey + results dashboard to assess what an LMS migration from **Canvas → Otus**
would cost an elementary/middle school. Teachers rate their reliance on the Canvas features
Otus does less well; the dashboard ranks those features by migration risk.

- `/` — teacher survey
- `/results` — aggregated dashboard (ranked feature bars, integrations tally, concerns, CSV export)

Deploy target: **Railway** (Node + Postgres).

## Run it

```bash
npm install
npm start            # http://localhost:3000 — IN-MEMORY storage, data NOT persisted
```

With persistence (Postgres):

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/survey" npm start
```

There is **no build step** and **no frontend framework** — the client is plain HTML/CSS/JS
served statically. Keep it that way unless explicitly asked; it's a deliberate choice to keep
Railway deploys frictionless. Do not introduce a bundler, React, or a CSS framework.

## Architecture

Single Express server (`server.js`) does two jobs: serves `public/` statically and exposes a
small JSON API. Storage is Postgres when `DATABASE_URL` is set, otherwise an in-memory array
(boots locally, logs a warning, surfaces a banner in the UI; data lost on restart).

```
server.js              Express app, API, storage layer (pg + in-memory fallback)
public/index.html      survey page (skeleton; controls rendered by survey.js)
public/survey.js       renders form controls, posts to /api/responses
public/results.html    dashboard skeleton
public/results.js      fetches responses, aggregates client-side, renders, CSV export
public/styles.css      shared styling (editorial/warm theme)
railway.json           Nixpacks build + npm start
```

### API
- `POST /api/responses` — submit (open).
- `GET /api/responses` — all rows for the dashboard; requires `x-results-passcode` header iff `RESULTS_PASSCODE` is set.
- `GET /api/meta` — `{ storage: 'postgres'|'memory', resultsProtected: bool }`.

### Env vars
- `DATABASE_URL` — Railway injects this when you reference the Postgres service. Required for persistence.
- `PORT` — injected by Railway; defaults to 3000.
- `RESULTS_PASSCODE` — optional; if set, gates the results dashboard.

## ⚠️ Critical convention: keep feature keys in sync

The list of surveyed features is defined in **three** places. When adding, removing, or
renaming a feature, update all three and keep the `key` strings identical:

1. `server.js` → `FEATURE_KEYS` (validation/storage allow-list)
2. `public/survey.js` → `FEATURES` (what teachers see — `key`, `name`, `desc`)
3. `public/results.js` → `FEATURE_META` (dashboard labels — `key`, `name`)

Current keys: `modules`, `masterypaths`, `pages`, `discussions`, `speedgrader`,
`gradebook`, `integrations_feat`, `blueprint`, `calendar`, `mobile`.

Reliance scale is `0..3` (Don't use / Occasionally / Regularly / Critical). Sentiment is `1..5`.
"Migration risk" on the dashboard = share of respondents at level 2 or 3.

## Other notes
- Don't use browser storage (localStorage/sessionStorage) — state is in memory / on the server.
- Postgres SSL is auto-disabled for localhost and `*.railway.internal`, enabled otherwise.
- The `responses` table is auto-created on boot; no migration tooling.

## Deploy (Railway)
1. Push to GitHub → Railway *New Project → Deploy from GitHub repo* (auto-detects Node).
2. *New → Database → Add PostgreSQL*.
3. App service → Variables → add a reference to the Postgres `DATABASE_URL`.
4. Settings → Networking → Generate Domain.
5. Optional: set `RESULTS_PASSCODE`.
