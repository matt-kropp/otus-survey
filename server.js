/**
 * Canvas -> Otus LMS migration survey
 * Single-file Express server: serves the static frontend and a small JSON API.
 *
 * Storage:
 *   - If DATABASE_URL is set (Railway Postgres), responses persist in Postgres.
 *   - Otherwise it falls back to an in-memory store so the app boots locally,
 *     but data is lost on restart. A warning is logged and surfaced in the UI.
 *
 * Results protection (optional):
 *   - Set RESULTS_PASSCODE to require a passcode to view aggregated results.
 *   - If unset, the results dashboard is open to anyone with the link.
 */

const path = require('path');
const express = require('express');

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const RESULTS_PASSCODE = process.env.RESULTS_PASSCODE || '';

const app = express();
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, 'public')));

/* ---------------------------------------------------------------- storage */

const FEATURE_KEYS = [
  'modules',
  'masterypaths',
  'pages',
  'discussions',
  'speedgrader',
  'gradebook',
  'integrations_feat',
  'blueprint',
  'calendar',
  'mobile',
];

let storageMode = 'memory';
let pool = null;
const memoryRows = [];
let memoryId = 1;

async function initStorage() {
  if (!DATABASE_URL) {
    console.warn(
      '\n[storage] No DATABASE_URL found — using IN-MEMORY storage.\n' +
        '[storage] Responses will be lost on restart/redeploy.\n' +
        '[storage] On Railway: add a Postgres database and reference its DATABASE_URL.\n'
    );
    storageMode = 'memory';
    return;
  }

  const { Pool } = require('pg');
  // Railway internal hostnames and localhost do not use SSL; the public proxy does.
  const needsSSL = !/localhost|127\.0\.0\.1|railway\.internal/.test(DATABASE_URL);
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: needsSSL ? { rejectUnauthorized: false } : false,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS responses (
      id          SERIAL PRIMARY KEY,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      name        TEXT,
      division    TEXT NOT NULL,
      subjects    TEXT,
      features    JSONB NOT NULL DEFAULT '{}'::jsonb,
      integrations TEXT,
      concerns    TEXT,
      sentiment   INTEGER
    );
  `);
  storageMode = 'postgres';
  console.log('[storage] Connected to Postgres.');
}

async function insertResponse(r) {
  if (storageMode === 'postgres') {
    const q = `
      INSERT INTO responses (name, division, subjects, features, integrations, concerns, sentiment)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING id, created_at;`;
    const vals = [
      r.name || null,
      r.division,
      r.subjects || null,
      JSON.stringify(r.features || {}),
      r.integrations || null,
      r.concerns || null,
      Number.isFinite(r.sentiment) ? r.sentiment : null,
    ];
    const { rows } = await pool.query(q, vals);
    return rows[0];
  }
  const row = {
    id: memoryId++,
    created_at: new Date().toISOString(),
    ...r,
  };
  memoryRows.push(row);
  return { id: row.id, created_at: row.created_at };
}

async function getResponses() {
  if (storageMode === 'postgres') {
    const { rows } = await pool.query(
      'SELECT id, created_at, name, division, subjects, features, integrations, concerns, sentiment FROM responses ORDER BY created_at ASC;'
    );
    return rows;
  }
  return memoryRows.slice();
}

/* ------------------------------------------------------------ validation */

function sanitizeResponse(body) {
  const out = {};
  const divisions = ['Lower School', 'Middle School', 'Both'];
  out.division = divisions.includes(body.division) ? body.division : null;

  out.name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
  out.subjects = typeof body.subjects === 'string' ? body.subjects.trim().slice(0, 200) : '';
  out.integrations =
    typeof body.integrations === 'string' ? body.integrations.trim().slice(0, 1000) : '';
  out.concerns =
    typeof body.concerns === 'string' ? body.concerns.trim().slice(0, 2000) : '';

  const s = parseInt(body.sentiment, 10);
  out.sentiment = s >= 1 && s <= 5 ? s : null;

  const features = {};
  const incoming = body.features && typeof body.features === 'object' ? body.features : {};
  for (const key of FEATURE_KEYS) {
    const v = parseInt(incoming[key], 10);
    // 0..3 = reliance level; 4 = "didn't know it existed but would have used it"
    features[key] = v >= 0 && v <= 4 ? v : 0;
  }
  out.features = features;
  return out;
}

/* ------------------------------------------------------------------ api */

app.get('/api/meta', (req, res) => {
  res.json({ storage: storageMode, resultsProtected: Boolean(RESULTS_PASSCODE) });
});

app.post('/api/responses', async (req, res) => {
  try {
    const clean = sanitizeResponse(req.body || {});
    if (!clean.division) {
      return res.status(400).json({ error: 'Please select which division you teach.' });
    }
    const saved = await insertResponse(clean);
    res.status(201).json({ ok: true, id: saved.id });
  } catch (err) {
    console.error('POST /api/responses failed:', err);
    res.status(500).json({ error: 'Could not save your response. Please try again.' });
  }
});

function checkResultsAuth(req, res) {
  if (!RESULTS_PASSCODE) return true;
  const provided = req.get('x-results-passcode') || '';
  if (provided === RESULTS_PASSCODE) return true;
  res.status(401).json({ error: 'A passcode is required to view results.' });
  return false;
}

app.get('/api/responses', async (req, res) => {
  if (!checkResultsAuth(req, res)) return;
  try {
    const rows = await getResponses();
    res.json({ responses: rows });
  } catch (err) {
    console.error('GET /api/responses failed:', err);
    res.status(500).json({ error: 'Could not load responses.' });
  }
});

/* ------------------------------------------------------------- fallbacks */

app.get('/results', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'results.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initStorage()
  .then(() => {
    app.listen(PORT, () => console.log(`Survey app listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to initialize storage:', err);
    process.exit(1);
  });
