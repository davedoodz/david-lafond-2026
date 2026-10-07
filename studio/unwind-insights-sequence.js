const DEV = '/work/unwind/devices';
const MOMO = `${DEV}/momo-open.webp`;
const STORE = 'momo-checkin-sequence:v2';
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Lucide icons (inline, so the studio needs no bundler) ---------- */
const PATHS = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  activity: '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
  bell: '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
  smartphone: '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
  footprints: '<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/><path d="M16 17h4"/><path d="M4 13h4"/>',
};
const icon = (name, size = 14, stroke = 1.9) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]}</svg>`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/* Smooth line through points (Catmull–Rom → Bézier). */
function smooth(pts) {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1] || pts[i], pts[i], pts[i + 1], pts[i + 2] || pts[i + 1]];
    d += ` C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6}, ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

/* ---------- Watch directions: each one owns all three steps on the Watch ---------- */
const HR = [0.4, 0.45, 0.55, 0.85, 0.62, 0.42, 0.34];
function hrLine(w = 160, h = 34) {
  const pts = HR.map((b, i) => [(i / 6) * w, h - b * h]);
  return `<svg class="w-hr" viewBox="-4 -4 ${w + 8} ${h + 8}"><path d="${smooth(pts)}"/><circle cx="${pts[3][0]}" cy="${pts[3][1]}" r="3.5"/></svg>`;
}
const head = (time) => `<span class="w-time left">Momo</span><span class="w-time">${time}</span>`;
const braid = (level) => `<canvas class="braid" data-level="${level}"></canvas>`;
const stats = '<div class="w-stats"><div><b>96</b><small>BPM</small></div><div><b>38</b><small>HRV · ms</small></div></div>';
const rings = (mode, center) => `<div class="wc-rings" data-mode="${mode}"><i></i><i></i><i></i><b>${center}</b></div>`;

const WATCH = {
  pulse: {
    name: 'A · Pulse line',
    blurb: 'Clinical calm: the live heart line leads, slides off toward the phone when sent, then a quiet confirmation.',
    sense: () => `<div class="w">${head('9:41')}<div class="w-title" style="margin-top:18px">A tense stretch</div><div class="w-body">Heart rate up while you sit still. No workout.</div>${hrLine()}${stats}</div>`,
    send: () => `<div class="w">${head('9:41')}<div class="w-title" style="margin-top:18px">Sending to iPhone</div><div class="w-body">Heart rate · HRV · 40 min</div><div class="wa-slip">${hrLine()}</div><div class="wa-bar"><i></i></div></div>`,
    nudge: () => `<div class="w w-center">${head('9:41')}<span class="wa-done">${icon('smartphone', 22)}<i>${icon('check', 11, 3)}</i></span><div class="w-title">Sent to iPhone</div><div class="w-body">Momo will ask how you’re doing.</div></div>`,
  },
  companion: {
    name: 'B · Momo companion',
    blurb: 'Momo is the messenger: notices with you, floats over to the phone, and waits there for you.',
    /* A fast heart alone could be a run or a presentation. Momo only speaks up when the signals agree:
       heart rate up, no movement or workout to explain it, and HRV below this person's usual. */
    sense: () => `<div class="w w-center">${head('9:41')}<div class="wb-momo wb-momo--sm"><img src="${MOMO}" alt=""><span class="wb-heart">${icon('heart', 9, 2.4)}</span></div><div class="w-title">Momo noticed</div>
      <div class="wb-signals">${[['heart', 'Heart rate up · 40 min'], ['footprints', 'Sitting still, no workout'], ['activity', 'HRV below your usual']].map(([ic, t], i) => `<div style="--i:${i}">${icon(ic, 10, 2.2)}${t}</div>`).join('')}</div></div>`,
    send: () => `<div class="w w-center">${head('9:41')}<div class="wb-momo wb-fly"><img src="${MOMO}" alt=""></div><div class="wb-trail"><i></i><i></i><i></i></div><div class="w-title">Off to your iPhone</div><div class="w-body">Taking this moment with me.</div></div>`,
    nudge: () => `<div class="w w-center">${head('9:41')}<div class="wb-bubble">I’m on your iPhone when you want to talk.</div><img class="wb-small" src="${MOMO}" alt=""></div>`,
  },
  rings: {
    name: 'C · Breath rings',
    blurb: 'Rings beat at your heart rate, ripple out toward the phone, then slow to a breath.',
    sense: () => `<div class="w w-center">${head('9:41')}${rings('beat', '96<small>BPM</small>')}<div class="w-body">Fast while you’re still · 40 min</div></div>`,
    send: () => `<div class="w w-center">${head('9:41')}${rings('out', icon('smartphone', 24))}<div class="w-title">Sending to iPhone</div></div>`,
    nudge: () => `<div class="w w-center">${head('9:41')}${rings('breathe', `<img src="${MOMO}" alt="">`)}<div class="w-title">Ready on iPhone</div><div class="w-body">Talk when you want.</div></div>`,
  },
  braid: {
    name: 'D · Braided wave',
    blurb: 'The intro’s braided wave reads your body: tangled when tense, flowing out when sent, settled after.',
    sense: () => `<div class="w w-center">${head('9:41')}<div class="wd-braid">${braid(1)}</div>${stats}<div class="w-body">Still, but tense · 40 min</div></div>`,
    send: () => `<div class="w w-center">${head('9:41')}<div class="wd-braid">${braid(0.55)}</div><div class="w-title">Sending to iPhone</div><div class="w-body">Heart rate · HRV · 40 min</div></div>`,
    nudge: () => `<div class="w w-center">${head('9:41')}<div class="wd-braid">${braid(0.06)}</div><div class="w-title">Momo is ready</div><div class="w-body">Pick it up on your iPhone.</div></div>`,
  },
  note: {
    name: 'E · Serif note',
    blurb: 'Editorial and quiet: Momo speaks in the journal serif, ending on the same words as the phone notification.',
    sense: () => `<div class="w we">${head('9:41')}<p>Your heart’s been busy, but you haven’t moved.</p><div class="we-meta">${icon('heart', 10, 2.4)}96 BPM · HRV 38 · no workout</div></div>`,
    send: () => `<div class="w we">${head('9:41')}<p>I’ll check in on your iPhone.</p><div class="we-dots"><i></i><i></i><i></i></div></div>`,
    nudge: () => `<div class="w we">${head('9:41')}<p>Something on your mind?</p><div class="w-chip">${icon('smartphone', 11)}Answer on iPhone</div></div>`,
  },
};

/* ---------- Connection styles between the Watch and the phone ---------- */
const LINKS = {
  packets: { name: '1 · Data chips', blurb: 'Labelled chips ride the dashed arc one at a time: heart rate, HRV, check-in.' },
  braid: { name: '2 · Braided wave', blurb: 'The intro’s braided band spans the gap and surges toward the phone while sending.' },
  comet: { name: '3 · Signal comet', blurb: 'Glowing pulses travel the dashed arc; no labels, just motion.' },
  trace: { name: '4 · Heartbeat trace', blurb: 'An ECG line draws itself from Watch to phone, carrying the beat across.' },
  ripples: { name: '5 · Ripples', blurb: 'Handoff-style arcs radiate from the Watch toward the phone.' },
};
const LINK_LEVEL = { sense: 0.18, send: 1, nudge: 0.08 };

/* ---------- Braided wave: port of the intro video's "braid" voice band ---------- */
const PALETTE = ['#53BFFE', '#00D0FF', '#B9A7F5', '#FFB3C7'];
const BRAID = { thick: 9, thickReact: 20, amp: 18, ampReact: 44, freq: 0.02, speed: 0.9, phase: 2.4, blur: 2.5 };
const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const braidState = new WeakMap();
let lastNow = 0;
function drawBraids(now) {
  const dt = Math.min(0.05, (now - lastNow) / 1000 || 0); lastNow = now;
  const t = still ? 1 : now / 1000;
  document.querySelectorAll('canvas.braid').forEach((cv) => {
    const dpr = devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    if (!w) return;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const target = +cv.dataset.level || 0;
    const st = braidState.get(cv) || { level: target, phase: 0 };
    st.level = still ? target : st.level + (target - st.level) * Math.min(1, dt * 2.5);
    if (!still) st.phase += dt * (0.25 + 1.4 * st.level);
    braidState.set(cv, st);
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const s = Math.max(w, 220) / 700, live = st.level;
    const env = (0.35 + 0.35 * Math.abs(Math.sin(t * 4.2)) * Math.abs(Math.sin(t * 2.9 + 1)) + 0.25 * Math.max(0, Math.sin(t * 0.9))) * live + 0.03 * (1 - live);
    const gx = w / 2, gy = h / 2, half = w * 0.46;
    PALETTE.forEach((col, k) => {
      const loud = env * (0.6 + 0.4 * Math.abs(Math.sin(k * 5.9 + t * 3)));
      const th = (BRAID.thick * (0.6 + 0.4 * live) + BRAID.thickReact * loud) * s * 2 + 2;
      const pad = Math.max(0.6, BRAID.blur * s * 2) * 2 + 1;
      const amp = Math.max(0, Math.min((BRAID.amp * (0.18 + 0.82 * live) + BRAID.ampReact * env) * s * 2, h / 2 - th * 0.65 - pad));
      const lg = g.createLinearGradient(gx - half, 0, gx + half, 0);
      const alpha = k === 0 ? 0.78 : 0.62;
      lg.addColorStop(0, hexA(col, 0)); lg.addColorStop(0.5, hexA(col, alpha)); lg.addColorStop(1, hexA(col, 0));
      const f = BRAID.freq / (s * 2);
      // Minus phase: the band travels left to right, Watch toward phone.
      const yAt = (x, o) => gy + o + amp * Math.exp(-(((x - gx) / (half * 0.55)) ** 2)) * Math.sin(x * f * (1 + k * 0.25) - st.phase * BRAID.speed * (1 + k * 0.35) + k * BRAID.phase);
      g.filter = `blur(${Math.max(0.6, BRAID.blur * s * 2)}px)`; g.fillStyle = lg; g.beginPath();
      for (let x = gx - half; x <= gx + half; x += 3) x === gx - half ? g.moveTo(x, yAt(x, -th / 2)) : g.lineTo(x, yAt(x, -th / 2));
      for (let x = gx + half; x >= gx - half; x -= 3) g.lineTo(x, yAt(x, th / 2) + th * 0.3 * Math.sin(x * 0.05 / (s * 2) - st.phase * 1.5 * BRAID.speed));
      g.closePath(); g.fill();
    });
    g.filter = 'none';
  });
  requestAnimationFrame(drawBraids);
}

/* ---------- Phone: the case study's "gentle nudge" lock screen, pixel for pixel ----------
   flows/lockscreen.webp uses the same 874×1780 mockup as the studio phone, so it is laid over the
   whole device and the screen clips it. The notification copies the case study's .lock__note. */
const NUDGE = {
  title: 'Something on your mind?',
  body: 'Things seem a little more tense than usual. Want to talk it out?',
  yes: 'Yes, let’s talk it out',
  no: 'Not now',
};
const lockScreen = ({ dim = false, note = false } = {}) => `<div class="p-lock" ${dim ? 'data-dim' : ''}>
  <img class="p-lock__bg" src="/work/unwind/flows/lockscreen.webp" alt="">
  ${note ? `<div class="lock__note"><span class="lock__icon"></span><div class="lock__copy"><div class="lock__row"><span class="lock__app">Momo</span><span class="lock__time">now</span></div>
    <p class="lock__title">${esc(NUDGE.title)}</p><p class="lock__text">${esc(NUDGE.body)}</p></div>
    <div class="lock__actions"><span>${esc(NUDGE.yes)}<i class="lock__cursor" aria-hidden="true"></i></span><span>${esc(NUDGE.no)}</span></div></div>` : ''}
</div>`;
const phoneScreen = (step) => lockScreen(step.id === 'nudge' ? { note: true } : { dim: true });
const watchScreen = (step, watch) => (WATCH[watch] || WATCH.braid)[step.id]();

/* ---------- State ---------- */
const DEFAULT = {
  watch: 'companion', link: 'trace', view: 'devices', accent: '#4f9cf9',
  momoX: 68, momoY: 258, momoScale: 97,
  transitionMs: 700, scale: 1.1, gap: 190, fold: 0, loop: true,
  steps: [
    { id: 'sense', title: 'The Watch senses', caption: 'Heart rate rises and HRV drops while you sit still. The Watch captures the tense stretch.', ms: 2800 },
    { id: 'send', title: 'Watch to iPhone', caption: 'The Watch passes the moment to your phone and asks it to check in.', ms: 2800 },
    { id: 'nudge', title: 'A gentle nudge', caption: 'Momo asks if something is on your mind. One tap starts a voice journal.', ms: 3600 },
  ],
};
const STEP_IDS = DEFAULT.steps.map((s) => s.id).join();
const clone = (v) => JSON.parse(JSON.stringify(v));
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE));
    if (saved?.steps?.map((s) => s.id).join() === STEP_IDS) return { ...clone(DEFAULT), ...saved };
  } catch { /* fall through to default */ }
  return clone(DEFAULT);
}
let state = load();
let current = 0, playing = false, timer = 0, startedAt = 0, raf = 0;
const $ = (id) => document.getElementById(id);
const saveState = $('saveState');
function persist() {
  localStorage.setItem(STORE, JSON.stringify(state));
  saveState.textContent = `Saved in this browser · ${new Date().toLocaleTimeString()}`;
}

/* ---------- Render ---------- */
function swap(host, html, key) {
  const prev = host.lastElementChild;
  if (prev && prev.dataset.key === key) return;
  const el = document.createElement('div');
  el.className = 'screen';
  el.dataset.key = key;
  el.innerHTML = html;
  if (prev) {
    host.querySelectorAll('.screen.leaving').forEach((n) => n.remove());
    prev.classList.remove('entering');
    prev.classList.add('leaving');
    el.classList.add('entering');
    setTimeout(() => prev.remove(), state.transitionMs + 50);
  }
  host.append(el);
}
function applyVars() {
  const root = document.documentElement.style;
  root.setProperty('--accent', state.accent);
  root.setProperty('--tt', `${state.transitionMs}ms`);
  root.setProperty('--momo-x', `${state.momoX}%`);
  root.setProperty('--momo-y', `${state.momoY}%`);
  root.setProperty('--momo-size', `${state.momoScale}%`);
  const page = $('pageFrame').style;
  page.setProperty('--dev-scale', state.scale);
  page.setProperty('--dev-gap', `${state.gap}px`);
  page.setProperty('--ripple-scale', state.gap / 18);
  page.setProperty('--fold', `${state.fold * 100}%`);
  const curve = `path('M 0 70 C ${state.gap / 3} 10, ${(state.gap * 2) / 3} 10, ${state.gap} 70')`;
  document.querySelectorAll('.packet, .comet').forEach((p) => (p.style.offsetPath = curve));
}
function render(force) {
  const step = state.steps[current];
  swap($('watchScreen'), watchScreen(step, state.watch), `w|${step.id}|${state.watch}|${force || ''}`);
  swap($('phoneScreen'), phoneScreen(step), `p|${step.id}|${force || ''}`);
  const link = $('link');
  link.dataset.style = state.link;
  link.querySelector('.braid').dataset.level = LINK_LEVEL[step.id];
  link.dataset.state = '';
  void link.offsetWidth; // restart the link animation on replay
  link.dataset.state = step.id;
  $('caption').innerHTML = `<b>${esc(step.title)}</b><span>${esc(step.caption)}</span>`;
  $('timeline').querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-current', String(i === current)));
  document.querySelectorAll('.step').forEach((el, i) => el.toggleAttribute('data-on', i === current));
}
/* Compare: every Watch direction, all three steps stacked. */
function renderCompare() {
  const watch = (html) => `<div class="face">${html}</div>`;
  $('compare').innerHTML = Object.entries(WATCH).map(([id, d]) => `<button class="compare__item" data-watch="${id}" aria-pressed="${id === state.watch}">
    <div class="compare__stack">${state.steps.map((s) => watch(d[s.id]())).join('')}</div><b>${esc(d.name)}</b><span>${esc(d.blurb)}</span></button>`).join('');
}
function fit() {
  const v = $('viewport');
  $('pageFrame').style.setProperty('--fit', Math.min(v.clientWidth / 1440, v.clientHeight / 800));
}

/* ---------- Playback ---------- */
function tick() {
  const ms = state.steps[current].ms;
  $('progress').style.width = `${Math.min(1, (performance.now() - startedAt) / ms) * 100}%`;
  if (playing) raf = requestAnimationFrame(tick);
}
function schedule() {
  clearTimeout(timer);
  cancelAnimationFrame(raf);
  startedAt = performance.now();
  if (!playing) { $('progress').style.width = '0%'; return; }
  tick();
  timer = setTimeout(() => {
    if (current === state.steps.length - 1 && !state.loop) return setPlaying(false);
    go((current + 1) % state.steps.length);
  }, state.steps[current].ms);
}
function go(i, force) {
  current = (i + state.steps.length) % state.steps.length;
  render(force);
  schedule();
}
function setPlaying(on) {
  playing = on;
  $('play').textContent = on ? 'Pause' : 'Play';
  schedule();
}

/* ---------- Panel ---------- */
const choices = (map, key) => Object.entries(map).map(([id, d]) => `<button data-${key}="${id}" aria-pressed="${id === state[key]}"><b style="font-weight:500">${esc(d.name)}</b><span>${esc(d.blurb)}</span></button>`).join('');
function buildPanel() {
  $('designs').innerHTML = choices(WATCH, 'watch');
  $('links').innerHTML = choices(LINKS, 'link');
  $('timeline').innerHTML = state.steps.map((s, i) => `<button data-i="${i}"><i>${i + 1}</i>${esc(s.title)}</button>`).join('');
  $('steps').innerHTML = state.steps.map((s, i) => `<div class="step" data-i="${i}">
    <header><span>${i + 1} · ${s.id}</span><label>ms <input type="number" min="800" step="100" data-step="ms" value="${s.ms}" style="width:76px"></label></header>
    <input data-step="title" value="${esc(s.title)}" aria-label="Step title">
    <textarea data-step="caption" aria-label="Step caption">${esc(s.caption)}</textarea></div>`).join('');
  document.querySelectorAll('#viewPick button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === state.view)));
  document.querySelectorAll('[data-set]').forEach((el) => (el.type === 'checkbox' ? (el.checked = state[el.dataset.set]) : (el.value = state[el.dataset.set])));
  $('stage').dataset.view = state.view;
}
function refresh() {
  applyVars();
  buildPanel();
  if (state.view === 'compare') renderCompare();
  render('refresh');
}

$('designs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-watch]'); if (!b) return;
  state.watch = b.dataset.watch; persist(); refresh();
});
$('links').addEventListener('click', (e) => {
  const b = e.target.closest('[data-link]'); if (!b) return;
  state.link = b.dataset.link; persist(); refresh(); go(current, Date.now());
});
$('compare').addEventListener('click', (e) => {
  const b = e.target.closest('[data-watch]'); if (!b) return;
  state.watch = b.dataset.watch; state.view = 'devices'; persist(); refresh(); go(0); setPlaying(true);
});
$('viewPick').addEventListener('click', (e) => {
  const b = e.target.closest('[data-view]'); if (!b) return;
  state.view = b.dataset.view; persist(); refresh();
});
document.querySelectorAll('[data-set]').forEach((el) => el.addEventListener('input', () => {
  const k = el.dataset.set;
  state[k] = el.type === 'checkbox' ? el.checked : el.type === 'range' || el.type === 'number' ? +el.value : el.value;
  persist();
  applyVars();
}));
$('steps').addEventListener('input', (e) => {
  const el = e.target.closest('[data-step]'); if (!el) return;
  const i = +el.closest('.step').dataset.i, k = el.dataset.step;
  state.steps[i][k] = k === 'ms' ? Math.max(800, +el.value) : el.value;
  persist();
  $('timeline').querySelectorAll('button')[i].innerHTML = `<i>${i + 1}</i>${esc(state.steps[i].title)}`;
  if (i === current) $('caption').innerHTML = `<b>${esc(state.steps[i].title)}</b><span>${esc(state.steps[i].caption)}</span>`;
});
$('steps').addEventListener('focusin', (e) => {
  const st = e.target.closest('.step'); if (st && +st.dataset.i !== current) go(+st.dataset.i);
});
$('timeline').addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) go(+b.dataset.i); });
$('prev').onclick = () => go(current - 1);
$('next').onclick = () => go(current + 1);
$('replay').onclick = () => go(current, Date.now());
$('play').onclick = () => { if (!playing && current === state.steps.length - 1) go(0); setPlaying(!playing); };
$('export').onclick = async () => { await navigator.clipboard.writeText(JSON.stringify(state, null, 2)); saveState.textContent = 'Copied settings JSON.'; };
$('import').onclick = () => {
  const raw = prompt('Paste settings JSON');
  if (!raw) return;
  try { const next = JSON.parse(raw); if (next.steps?.map((s) => s.id).join() !== STEP_IDS) throw new Error(`Needs steps ${STEP_IDS}`); state = { ...clone(DEFAULT), ...next }; persist(); refresh(); }
  catch (err) { saveState.textContent = `Could not import: ${err.message}`; }
};
$('reset').onclick = () => { if (!confirm('Reset every setting to default?')) return; state = clone(DEFAULT); persist(); refresh(); go(0); };
addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select')) return;
  if (e.key === 'ArrowRight') go(current + 1);
  if (e.key === 'ArrowLeft') go(current - 1);
  if (e.key === ' ') { e.preventDefault(); $('play').click(); }
});
new ResizeObserver(fit).observe($('viewport'));

$('link').innerHTML = `
  <svg class="path" viewBox="0 0 150 120" preserveAspectRatio="none"><path class="track" d="M 0 70 C 50 10, 100 10, 150 70" /><path class="flow" d="M 0 70 C 50 10, 100 10, 150 70" /></svg>
  <svg class="trace" viewBox="0 0 150 120" preserveAspectRatio="none"><path class="trace__base" pathLength="100" d="M 0 60 H 56 L 62 60 L 67 34 L 74 88 L 80 50 L 85 60 H 150" /><path class="trace__live" pathLength="100" d="M 0 60 H 56 L 62 60 L 67 34 L 74 88 L 80 50 L 85 60 H 150" /></svg>
  <canvas class="braid link-braid" data-level="0.18"></canvas>
  <span class="packet">${icon('heart', 12)}Heart rate</span><span class="packet">${icon('activity', 12)}HRV</span><span class="packet">${icon('bell', 12)}Check-in</span>
  <b class="comet"></b><b class="comet"></b><b class="comet"></b>
  <i class="ripple"></i><i class="ripple"></i><i class="ripple"></i>`;
refresh();
fit();
requestAnimationFrame(drawBraids);
if (still) go(2); else { go(0); setPlaying(true); }
