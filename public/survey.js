/* Survey page logic — vanilla JS, no build step. */

const FEATURES = [
  {
    key: 'modules',
    name: 'Modules & sequenced content',
    desc: 'Organizing a unit into ordered, gated steps students move through in order.',
  },
  {
    key: 'masterypaths',
    name: 'MasteryPaths / conditional release',
    desc: 'Auto-routing students to different content based on how they score.',
  },
  {
    key: 'pages',
    name: 'Rich Pages & embedded media',
    desc: 'Building lesson pages with embedded videos, widgets, or interactive tools (not just links).',
  },
  {
    key: 'discussions',
    name: 'Discussions, groups & peer review',
    desc: 'Student-to-student academic discussion, group spaces, peer feedback.',
  },
  {
    key: 'speedgrader',
    name: 'SpeedGrader',
    desc: 'Inline annotation, rubrics on submissions, audio/video feedback, comment banks.',
  },
  {
    key: 'gradebook',
    name: 'Weighted gradebook & grade transparency',
    desc: 'Clear weighted letter/point grade calculation you can explain to families.',
  },
  {
    key: 'integrations_feat',
    name: 'Third-party app integrations (LTI)',
    desc: 'External tools that plug directly into your course.',
  },
  {
    key: 'blueprint',
    name: 'Blueprint / Commons content sharing',
    desc: 'Pushing one standard course shell across sections; sharing content with colleagues.',
  },
  {
    key: 'calendar',
    name: 'Calendar, Syllabus & Conferences',
    desc: 'Integrated scheduling, a living syllabus, built-in video conferencing.',
  },
  {
    key: 'mobile',
    name: 'Mobile apps',
    desc: 'The Student / Teacher / Parent apps you rely on day to day.',
  },
];

const SCALE = [
  { v: 0, label: "Don't use", sub: 'Never touch it' },
  { v: 1, label: 'Occasionally', sub: 'Now and then' },
  { v: 2, label: 'Regularly', sub: 'Part of my routine' },
  { v: 3, label: 'Critical', sub: "Can't teach without it" },
];

const SENTI = [
  { v: 1, face: '😟', label: 'Opposed' },
  { v: 2, face: '🙁', label: 'Wary' },
  { v: 3, face: '😐', label: 'Neutral' },
  { v: 4, face: '🙂', label: 'Open' },
  { v: 5, face: '😄', label: 'Support' },
];

const DIVISIONS = ['Lower School', 'Middle School', 'Both'];

const state = {
  division: null,
  sentiment: null,
  features: Object.fromEntries(FEATURES.map((f) => [f.key, 0])),
};

/* ---------- render division pills ---------- */
const divEl = document.getElementById('division');
DIVISIONS.forEach((d) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'pill';
  b.textContent = d;
  b.addEventListener('click', () => {
    state.division = d;
    [...divEl.children].forEach((c) => c.classList.toggle('active', c === b));
  });
  divEl.appendChild(b);
});

/* ---------- render feature rows ---------- */
const featEl = document.getElementById('features');
FEATURES.forEach((f) => {
  const row = document.createElement('div');
  row.className = 'feature';
  row.innerHTML = `
    <p class="feature-name">${f.name}</p>
    <p class="feature-desc">${f.desc}</p>
    <div class="scale" data-key="${f.key}"></div>`;
  const scale = row.querySelector('.scale');
  SCALE.forEach((s) => {
    const opt = document.createElement('div');
    opt.className = 'scale-opt';
    opt.dataset.v = s.v;
    opt.innerHTML = `${s.label}<small>${s.sub}</small>`;
    opt.addEventListener('click', () => {
      state.features[f.key] = s.v;
      [...scale.children].forEach((c) => c.classList.toggle('sel', c === opt));
    });
    scale.appendChild(opt);
  });
  featEl.appendChild(row);
});

/* ---------- render sentiment ---------- */
const sentiEl = document.getElementById('sentiment');
SENTI.forEach((s) => {
  const o = document.createElement('button');
  o.type = 'button';
  o.className = 'senti-opt';
  o.innerHTML = `${s.face}<span>${s.label}</span>`;
  o.addEventListener('click', () => {
    state.sentiment = s.v;
    [...sentiEl.children].forEach((c) => c.classList.toggle('sel', c === o));
  });
  sentiEl.appendChild(o);
});

/* ---------- storage-mode banner ---------- */
fetch('/api/meta')
  .then((r) => r.json())
  .then((m) => {
    if (m.storage === 'memory') {
      document.getElementById('memory-banner').innerHTML =
        '<div class="banner banner-warn"><b>Demo mode:</b> no database is connected, so responses ' +
        'will be lost when the server restarts. Add a Postgres database on Railway to keep data.</div>';
    }
  })
  .catch(() => {});

/* ---------- submit ---------- */
const form = document.getElementById('survey');
const errEl = document.getElementById('form-error');
const btn = document.getElementById('submit-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errEl.innerHTML = '';

  if (!state.division) {
    errEl.innerHTML = '<div class="banner banner-err">Please choose which division you teach (Section 1).</div>';
    errEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const payload = {
    name: document.getElementById('name').value,
    subjects: document.getElementById('subjects').value,
    division: state.division,
    features: state.features,
    integrations: document.getElementById('integrations').value,
    concerns: document.getElementById('concerns').value,
    sentiment: state.sentiment,
  };

  btn.disabled = true;
  btn.textContent = 'Submitting…';
  try {
    const res = await fetch('/api/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || 'Something went wrong.');
    }
    showThanks();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Submit my input';
    errEl.innerHTML = `<div class="banner banner-err">${err.message}</div>`;
  }
});

function showThanks() {
  form.style.display = 'none';
  const t = document.getElementById('thanks');
  t.style.display = 'block';
  t.innerHTML = `
    <div class="card thanks fade">
      <div class="mark">✓</div>
      <h2>Thank you — that's logged.</h2>
      <p class="section-sub" style="margin-bottom:22px">
        Your input goes straight into the review. The more teachers respond, the more confident
        the decision will be.
      </p>
      <div class="actions" style="justify-content:center">
        <a class="btn-ghost btn" href="/results">See the live results</a>
      </div>
    </div>`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
