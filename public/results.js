/* Results dashboard logic — fetches all responses, aggregates client-side. */

const FEATURE_META = [
  { key: 'modules', name: 'Modules & sequenced content' },
  { key: 'masterypaths', name: 'MasteryPaths / conditional release' },
  { key: 'pages', name: 'Rich Pages & embedded media' },
  { key: 'discussions', name: 'Discussions, groups & peer review' },
  { key: 'speedgrader', name: 'SpeedGrader (annotation, rubrics, feedback)' },
  { key: 'gradebook', name: 'Weighted gradebook & grade transparency' },
  { key: 'integrations_feat', name: 'Third-party integrations (LTI)' },
  { key: 'blueprint', name: 'Blueprint / Commons content sharing' },
  { key: 'calendar', name: 'Calendar, Syllabus & Conferences' },
  { key: 'mobile', name: 'Mobile apps' },
];

let ALL = [];
let filter = 'all';
let passcode = '';

const gate = document.getElementById('gate');
const dash = document.getElementById('dash');

function load() {
  const headers = {};
  if (passcode) headers['x-results-passcode'] = passcode;
  fetch('/api/responses', { headers })
    .then((r) => {
      if (r.status === 401) {
        gate.style.display = 'block';
        dash.style.display = 'none';
        if (passcode) document.getElementById('gate-err').textContent = 'Incorrect passcode.';
        throw new Error('locked');
      }
      return r.json();
    })
    .then((j) => {
      ALL = j.responses || [];
      gate.style.display = 'none';
      dash.style.display = 'block';
      checkMemory();
      render();
    })
    .catch((e) => {
      if (e.message !== 'locked') console.error(e);
    });
}

document.getElementById('gate-btn').addEventListener('click', () => {
  passcode = document.getElementById('passcode').value.trim();
  load();
});
document.getElementById('passcode').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('gate-btn').click();
});

function checkMemory() {
  fetch('/api/meta')
    .then((r) => r.json())
    .then((m) => {
      if (m.storage === 'memory') {
        document.getElementById('memory-banner').innerHTML =
          '<div class="banner banner-warn"><b>Demo mode:</b> no database connected — these numbers ' +
          'reset when the server restarts. Add Postgres on Railway to persist responses.</div>';
      }
    })
    .catch(() => {});
}

/* ---------- filter pills ---------- */
document.querySelectorAll('.filterbar .pill').forEach((p) => {
  p.addEventListener('click', () => {
    document.querySelectorAll('.filterbar .pill').forEach((x) => x.classList.remove('active'));
    p.classList.add('active');
    filter = p.dataset.f;
    render();
  });
});

function filtered() {
  if (filter === 'all') return ALL;
  // "Both" teachers count toward whichever division is being viewed
  return ALL.filter((r) => r.division === filter || r.division === 'Both');
}

function render() {
  const rows = filtered();
  renderStats(rows);
  renderRanks(rows);
  renderIntegrations(rows);
  renderConcerns(rows);
}

/* ---------- stat cards ---------- */
function renderStats(rows) {
  const n = rows.length;
  const senti = rows.map((r) => r.sentiment).filter((s) => s >= 1 && s <= 5);
  const avgSenti = senti.length ? (senti.reduce((a, b) => a + b, 0) / senti.length).toFixed(1) : '—';

  // highest-risk feature = most "critical" votes
  let topName = '—';
  let topCrit = -1;
  FEATURE_META.forEach((f) => {
    const crit = rows.filter((r) => (r.features || {})[f.key] === 3).length;
    if (crit > topCrit) { topCrit = crit; topName = f.name; }
  });
  if (n === 0) topName = '—';

  const ms = ALL.filter((r) => r.division === 'Middle School' || r.division === 'Both').length;

  const stats = [
    { n, l: 'Responses' + (filter === 'all' ? '' : ' (filtered)') },
    { n: avgSenti, l: 'Avg. sentiment / 5' },
    { n: ms, l: 'Touch Middle School' },
    { n: topName, l: 'Highest-risk feature', small: true },
  ];
  document.getElementById('stats').innerHTML = stats
    .map(
      (s) =>
        `<div class="stat fade"><div class="n" style="${s.small ? 'font-size:17px;line-height:1.2' : ''}">${s.n}</div><div class="l">${s.l}</div></div>`
    )
    .join('');
}

/* ---------- ranked feature bars ---------- */
function renderRanks(rows) {
  const n = rows.length;
  const data = FEATURE_META.map((f) => {
    const counts = [0, 0, 0, 0, 0]; // index 4 = "didn't know it existed"
    rows.forEach((r) => {
      const v = (r.features || {})[f.key];
      if (v >= 0 && v <= 4) counts[v]++;
    });
    const heavy = counts[2] + counts[3]; // regular + critical
    const unaware = counts[4];
    const riskPct = n ? Math.round((heavy / n) * 100) : 0;
    return { ...f, counts, heavy, crit: counts[3], unaware, riskPct };
  });
  data.sort((a, b) => b.riskPct - a.riskPct || b.crit - a.crit);

  const ranksEl = document.getElementById('ranks');
  if (n === 0) {
    ranksEl.innerHTML = '<p class="empty">No responses yet.</p>';
    return;
  }
  ranksEl.innerHTML = data
    .map((f) => {
      const pct = (c) => (n ? (c / n) * 100 : 0);
      const segs = [0, 1, 2, 3, 4]
        .map((i) =>
          f.counts[i] ? `<div class="seg seg${i}" style="width:${pct(f.counts[i])}%" title="${SCALE_LABEL[i]}: ${f.counts[i]}"></div>` : ''
        )
        .join('');
      const unawareNote = f.unaware
        ? ` &middot; <span class="unaware-note">${f.unaware} didn’t know</span>`
        : '';
      return `
      <div class="rankrow">
        <div class="top">
          <span class="fname">${f.name}</span>
          <span class="fscore"><b>${f.riskPct}%</b> rely on it &middot; ${f.crit} critical${unawareNote}</span>
        </div>
        <div class="stackbar">${segs}</div>
      </div>`;
    })
    .join('');
}
const SCALE_LABEL = ["Don't use", 'Occasionally', 'Regularly', 'Critical', "Didn't know it existed"];

/* ---------- integrations ---------- */
function renderIntegrations(rows) {
  const raw = rows.map((r) => (r.integrations || '').trim()).filter(Boolean);
  const el = document.getElementById('integrations');
  if (!raw.length) {
    el.innerHTML = '<p class="empty">No integrations mentioned yet.</p>';
    return;
  }
  // split on commas / semicolons / newlines, tally case-insensitively
  const tally = {};
  raw.forEach((line) => {
    line.split(/[,;\n]/).forEach((tok) => {
      const t = tok.trim();
      if (!t) return;
      const k = t.toLowerCase();
      if (!tally[k]) tally[k] = { label: t, count: 0 };
      tally[k].count++;
    });
  });
  const items = Object.values(tally).sort((a, b) => b.count - a.count);
  el.innerHTML = items
    .map((i) => `<span class="tag">${escapeHtml(i.label)}${i.count > 1 ? ` &times;${i.count}` : ''}</span>`)
    .join('');
}

/* ---------- concerns ---------- */
function renderConcerns(rows) {
  const items = rows
    .map((r) => ({ text: (r.concerns || '').trim(), who: r.name, div: r.division }))
    .filter((x) => x.text);
  const el = document.getElementById('concerns');
  if (!items.length) {
    el.innerHTML = '<p class="empty">No written concerns yet.</p>';
    return;
  }
  el.innerHTML = items
    .map(
      (x) =>
        `<blockquote class="quote">${escapeHtml(x.text)}<span class="who">— ${
          x.who ? escapeHtml(x.who) + ', ' : ''
        }${escapeHtml(x.div || '')}</span></blockquote>`
    )
    .join('');
}

/* ---------- CSV export ---------- */
document.getElementById('csv-link').addEventListener('click', (e) => {
  e.preventDefault();
  const rows = filtered();
  if (!rows.length) return alert('No responses to export yet.');
  const headers = [
    'id', 'created_at', 'name', 'division', 'subjects',
    ...FEATURE_META.map((f) => f.key),
    'integrations', 'concerns', 'sentiment',
  ];
  const lines = [headers.join(',')];
  rows.forEach((r) => {
    const f = r.features || {};
    const cells = [
      r.id, r.created_at, r.name || '', r.division || '', r.subjects || '',
      ...FEATURE_META.map((m) => (f[m.key] != null ? f[m.key] : '')),
      r.integrations || '', r.concerns || '', r.sentiment != null ? r.sentiment : '',
    ];
    lines.push(cells.map(csvCell).join(','));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lms-survey-results.csv';
  a.click();
});

function csvCell(v) {
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

load();
