/* Survey page logic — vanilla JS, no build step. */

const FEATURES = [
  {
    key: 'modules',
    name: 'Modules & sequenced content',
    desc:
      'A way to lay out a unit as a numbered, step-by-step path. Students finish one item ' +
      'before the next unlocks, so the whole class moves through your readings, videos, and ' +
      'assignments in the order you intend.',
  },
  {
    key: 'masterypaths',
    name: 'MasteryPaths / conditional release',
    desc:
      'The course automatically sends students down different paths based on their scores. ' +
      'Students who are struggling get extra practice or review, while those who have already ' +
      'mastered it move ahead — without you having to sort them by hand.',
  },
  {
    key: 'pages',
    name: 'Rich Pages & embedded media',
    desc:
      'Lesson pages you build right inside the course with videos, images, slideshows, and ' +
      'interactive activities placed on the page itself — not just a list of links students ' +
      'have to click out to.',
  },
  {
    key: 'discussions',
    name: 'Discussions, groups & peer review',
    desc:
      'Online spaces where students talk to each other about the work: class discussion boards, ' +
      'small-group work areas, and having students read and give feedback on one another’s ' +
      'assignments.',
  },
  {
    key: 'speedgrader',
    name: 'SpeedGrader',
    desc:
      'A grading screen where you mark up a student’s submission directly — highlight and comment ' +
      'on their work, score it against a rubric, leave a voice or video note, and reuse saved ' +
      'comments — all in one place.',
  },
  {
    key: 'gradebook',
    name: 'Weighted gradebook & grade transparency',
    desc:
      'A gradebook that automatically figures out final grades when categories are weighted ' +
      '(say, tests 50%, homework 20%), and shows students and families a clear, up-to-date ' +
      'picture of where the grade stands and why.',
  },
  {
    key: 'integrations_feat',
    name: 'Third-party app integrations (LTI)',
    desc:
      'Outside programs and websites you teach with — reading, math, or video tools — that open ' +
      'and work inside your course and send scores back to your gradebook automatically, instead ' +
      'of being separate logins students juggle.',
  },
  {
    key: 'blueprint',
    name: 'Blueprint / Commons content sharing',
    desc:
      'Build one master version of a course and push it out to every section or teacher at once, ' +
      'so updates stay consistent everywhere — plus a shared library for swapping ready-made ' +
      'lessons with colleagues.',
  },
  {
    key: 'calendar',
    name: 'Calendar, Syllabus & Conferences',
    desc:
      'The built-in calendar that shows students all their due dates in one place, an ' +
      'auto-updating syllabus/course outline, and the ability to hold live video class meetings ' +
      'from inside the course.',
  },
  {
    key: 'mobile',
    name: 'Mobile apps',
    desc:
      'The phone and tablet apps that let you, your students, and their parents check ' +
      'assignments, grades, and announcements on the go.',
  },
];

const SCALE = [
  { v: 0, label: "Don't use", sub: 'Never touch it' },
  { v: 1, label: 'Occasionally', sub: 'Now and then' },
  { v: 2, label: 'Regularly', sub: 'Part of my routine' },
  { v: 3, label: 'Critical', sub: "Can't teach without it" },
];

// Captures latent demand: teachers who never knew the feature was there.
const UNAWARE = { v: 4, label: "Didn't know it existed", sub: 'but I’d have used it' };

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
    <div class="scale" data-key="${f.key}"></div>
    <div class="scale-extra" data-key="${f.key}"></div>`;
  const scale = row.querySelector('.scale');
  const extra = row.querySelector('.scale-extra');

  const allOpts = [];
  const select = (opt, v) => {
    state.features[f.key] = v;
    allOpts.forEach((c) => c.classList.toggle('sel', c === opt));
  };

  SCALE.forEach((s) => {
    const opt = document.createElement('div');
    opt.className = 'scale-opt';
    opt.dataset.v = s.v;
    opt.innerHTML = `${s.label}<small>${s.sub}</small>`;
    opt.addEventListener('click', () => select(opt, s.v));
    scale.appendChild(opt);
    allOpts.push(opt);
  });

  const unaware = document.createElement('div');
  unaware.className = 'scale-opt scale-opt-wide';
  unaware.dataset.v = UNAWARE.v;
  unaware.innerHTML = `${UNAWARE.label}<small>${UNAWARE.sub}</small>`;
  unaware.addEventListener('click', () => select(unaware, UNAWARE.v));
  extra.appendChild(unaware);
  allOpts.push(unaware);

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
