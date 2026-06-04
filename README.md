# Canvas → Otus LMS Consolidation Survey

A small web app to gather teacher input on what an LMS migration from **Canvas** to **Otus**
would cost. It has two pages:

- **`/`** — the teacher survey (feature-by-feature reliance, integrations they use, concerns, overall sentiment).
- **`/results`** — a live dashboard that ranks Canvas features by *migration risk* (how many teachers rely on each), lists the integrations and concerns teachers raised, and exports everything to CSV.

It's a single Node/Express server with a no-build vanilla frontend. Data persists in
Postgres; if no database is connected it falls back to in-memory storage (handy for local
testing, but data is lost on restart).

---

## Deploy on Railway (≈5 minutes)

1. **Push this folder to a GitHub repo** (or use `railway up` from the Railway CLI).

2. **Create the project**: in Railway, *New Project → Deploy from GitHub repo* and pick the repo.
   Railway auto-detects Node, runs `npm install`, then `npm start`. No build config needed.

3. **Add the database**: in the same project, click *New → Database → Add PostgreSQL*.

4. **Connect the database to the app**: open your **app service → Variables → New Variable →
   Add Reference**, and select the Postgres service's **`DATABASE_URL`**. (Referencing it uses
   Railway's private network — no SSL fuss.) Redeploy if it doesn't restart on its own.
   The app creates its `responses` table automatically on first boot.

5. **Generate a public URL**: app service → *Settings → Networking → Generate Domain*.

6. *(Optional)* **Protect the results page**: add a variable `RESULTS_PASSCODE` with a value of
   your choice. The `/results` dashboard will then ask for it. Leave it unset to keep results open.

Share the root URL with teachers; share `/results` with the review team.

---

## Run locally

```bash
npm install
npm start          # http://localhost:3000  (in-memory storage, data not saved)
```

To test with persistence locally, set a Postgres connection string first:

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/survey" npm start
```

---

## Environment variables

| Variable           | Required | Notes                                                                 |
|--------------------|----------|-----------------------------------------------------------------------|
| `DATABASE_URL`     | for persistence | Provided by Railway when you reference the Postgres service. Without it, the app runs in memory-only demo mode. |
| `PORT`             | no       | Injected by Railway. Defaults to `3000` locally.                      |
| `RESULTS_PASSCODE` | no       | If set, the `/results` page requires this passcode.                   |

---

## API

| Method | Path              | Purpose                                                        |
|--------|-------------------|----------------------------------------------------------------|
| `POST` | `/api/responses`  | Submit a survey response (open).                               |
| `GET`  | `/api/responses`  | All responses for the dashboard. Requires `x-results-passcode` header if `RESULTS_PASSCODE` is set. |
| `GET`  | `/api/meta`       | Reports storage mode (`postgres`/`memory`) and whether results are protected. |

## Editing the survey

The feature list lives in two places that must stay in sync:

- **`public/survey.js`** — the `FEATURES` array (what teachers see).
- **`server.js`** — the `FEATURE_KEYS` array (what's validated/stored).
- **`public/results.js`** — the `FEATURE_META` array (labels on the dashboard).

Keep the `key` values identical across all three when you add or rename a feature.
