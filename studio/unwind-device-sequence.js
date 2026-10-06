const ASSETS = '/work/unwind';
const DEV = `${ASSETS}/devices`;
const SAVE_FILE = '/studio/unwind-device-sequence.json';

const WATCH_SCREENS = {
  face: 'Watch face (time)',
  notification: 'Notification (Talk / Not now)',
  pressed: 'Talk tapped',
  handoff: 'Opening on iPhone',
  continuing: 'Continuing on iPhone',
  listening: 'Listening (braided wave)',
  faceMomo: 'Watch face with Momo complication',
  faceHeart: 'Watch face with heart rate',
  aod: 'Always-on (dimmed face)',
  shortLook: 'Short look (Momo + Unwind)',
  haptic: 'Haptic tap rings',
  heartChart: 'Notification with HR / HRV chart',
  momoPeek: 'Momo peeks with a speech bubble',
  breatheAsk: 'Breathe first, then talk?',
  sent: 'Sent to iPhone ✓',
  pickUp: 'Pick up your iPhone (pulse)',
  momoListen: 'Momo listening (animated)',
  countdown: '30-second ring countdown',
  captions: 'Live captions on watch',
  saved: 'Entry saved ✓',
  off: 'Screen off',
};
const FACE_STYLES = {
  digital: 'Digital (current)',
  modular: 'Modular with complications',
  analog: 'Analog, minute ticks',
  california: 'California (mixed numerals)',
  rings: 'Activity rings',
  utility: 'Utility: date + weather',
  numerals: 'Numerals Duo (giant hour)',
  solar: 'Solar arc',
  momo: 'Momo companion',
  calm: 'Calm gradient + breath',
};
const TAP_STYLES = {
  cursor: 'Finger tap + press',
  press: 'Press + glow ring',
  ripple: 'Ripple from touch',
  confirm: 'Morphs to “Starting…”',
  focus: 'Dim the rest, button glows',
};
const PHONE_SCREENS = {
  off: 'Screen off',
  lock: 'Lock screen',
  lockNotif: 'Lock screen + notification',
  lockNotifTap: 'Lock screen + notification tapped',
  connecting: 'App connecting',
  voicePrompt: 'Voice: Momo asks (prompt only)',
  voice: 'Voice: person talking',
  'video:voice': 'Recording: voice',
  'video:dynamic': 'Recording: dynamic mode',
  'video:entries': 'Recording: entries',
  'video:guided-cards': 'Recording: guided models',
  'video:guided-woop': 'Recording: guided WOOP',
  'video:freeform-evening': 'Recording: freeform evening',
  'video:welcome-park': 'Recording: welcome',
  aod: 'Always-on lock screen (dim)',
  lockActivity: 'Lock screen + Momo Live Activity',
  notifExpanded: 'Notification expanded (actions)',
  homeBanner: 'Home screen + banner',
  homeTap: 'Home screen, Unwind icon tapped',
  splash: 'App launch splash (Momo)',
  island: 'Dynamic Island: watch handoff',
  permission: 'Microphone ready check',
  voiceCaptions: 'Voice: chat bubbles',
  voiceTimer: 'Voice: with timer',
  voicePaused: 'Voice: paused',
  thinking: 'Momo is reflecting…',
  reflection: 'Reflection summary card',
  moodTags: 'Mood + trigger tags',
  breathe: 'Breathing exercise',
  savedEntry: 'Entry saved',
  entryList: 'Journal list with new entry',
  pattern: 'Pattern noticed (3rd time this week)',
};
const CONNECT_STYLES = {
  momo: 'Momo + “Connecting…” dots',
  braid: 'Momo over the braided wave',
  halo: 'Momo inside pulsing halo',
  handoff: 'Watch ··· phone link',
  sheet: 'Handoff sheet over lock screen',
};
const TRANSITIONS = {
  fade: 'Crossfade',
  rise: 'Rise up',
  zoom: 'Zoom in',
  blur: 'Blur through',
  sheet: 'Sheet slides up',
  iris: 'Iris opens from Momo',
  notif: 'Opens from the notification',
  cut: 'Hard cut',
};
const COLOR_PRESETS = {
  Starlight: { tint: '#e3d9cc', amount: 0, shade: 1 },
  Midnight: { tint: '#2e3a4f', amount: 0.75, shade: 0.42 },
  Silver: { tint: '#d4d7dc', amount: 1, shade: 1.06 },
  'Sky blue': { tint: '#8fb3d9', amount: 0.52, shade: 1 },
  Pink: { tint: '#e9b4b0', amount: 0.7, shade: 1.02 },
  Red: { tint: '#c4282e', amount: 0.85, shade: 0.72 },
  'Jet black': { tint: '#202022', amount: 1, shade: 0.3 },
};
const EASES = {
  'cubic-bezier(.16,1,.3,1)': 'Expo out (soft land)',
  'cubic-bezier(.2,.8,.2,1)': 'Smooth out',
  'cubic-bezier(.34,1.4,.64,1)': 'Slight overshoot',
  'cubic-bezier(.65,0,.35,1)': 'In-out',
  linear: 'Linear',
};
const NOTE = 'It seems like you had a pretty stressful day. Want to talk about it?';
const STEP = { label: '', caption: '', duration: 3, watch: 'off', phone: 'off', title: '', body: '', primary: '', secondary: '', phoneTitle: '', phoneBody: '', tapStyle: 'cursor', faceStyle: 'digital', connectStyle: 'momo', transition: 'fade', transitionMs: 600, prompt: 'So what’s on your mind?', transcript: '' };
const TRANSCRIPT = 'Honestly, today was a lot. My manager moved the deadline up again and I just froze in that meeting. And then on the way home I kept replaying';
const DEFAULT = {
  version: 3,
  font: 'apple',
  colors: { ...COLOR_PRESETS['Sky blue'], accent: '#4f9cf9' },
  context: { view: 'page', scale: 0.72, fold: 0.05, gap: 76, riseMs: 1200, riseDelay: 200, riseStagger: 150, riseEase: 'cubic-bezier(.16,1,.3,1)', riseOnPlay: true }, layout: {},
  steps: [
    { ...STEP, label: 'Notification arrives', caption: 'The watch notices a stressful day and gently checks in.', duration: 3.5,
      watch: 'notification', title: 'Rough day?', body: NOTE, primary: 'Talk', secondary: 'Not now' },
    { ...STEP, label: 'Taps “Talk”', caption: 'One tap says yes. No typing, no app hunting.', duration: 2.2,
      watch: 'pressed', title: 'Rough day?', body: NOTE, primary: 'Talk', secondary: 'Not now' },
    { ...STEP, label: 'Watch hands off', caption: 'The watch passes the moment to the phone.', duration: 1.8,
      watch: 'handoff', phone: 'lock', title: 'Opening on iPhone', body: 'Pick up your phone to keep talking.' },
    { ...STEP, label: 'Taps the notification', caption: 'The phone is already waiting. One tap opens Unwind.', duration: 2.6,
      watch: 'handoff', phone: 'lockNotifTap', transition: 'cut', title: 'Opening on iPhone', body: 'Pick up your phone to keep talking.', phoneTitle: 'Unwind', phoneBody: 'Ready when you are. Tap to start talking.' },
    { ...STEP, label: 'Momo asks', caption: 'A single open question, then space to answer.', duration: 2.6,
      watch: 'listening', phone: 'voicePrompt', transition: 'notif', transitionMs: 800, title: 'Listening', body: 'On iPhone', transcript: TRANSCRIPT },
    { ...STEP, label: 'Voice journaling', caption: 'They talk it through, for as long as they need.', duration: 8,
      watch: 'listening', phone: 'voice', transition: 'blur', title: 'Listening', body: 'On iPhone', transcript: TRANSCRIPT },
  ],
};

const OLD_KEY = 'unwind-device-sequence-v1';
const KEY = 'unwind-device-sequence-v3';
let state, index = 0, timer = null, openStep = 0, saveTimer = null;

async function load() {
  try {
    const r = await fetch(SAVE_FILE, { cache: 'no-store' });
    if (r.ok) { const s = await r.json(); if (s?.steps?.length) return upgrade(s); }
  } catch {}
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s?.steps?.length) return normalise(s); } catch {}
  // First run of v2: keep colour + font from the v1 browser save, take the new steps.
  const next = structuredClone(DEFAULT);
  try {
    const old = JSON.parse(localStorage.getItem(OLD_KEY));
    if (old?.colors && 'tint' in old.colors) next.colors = { ...next.colors, ...old.colors };
    if (old?.font) next.font = old.font;
    if (old) { state = next; persist(); }
  } catch {}
  return next;
}
const normalise = (s) => ({ ...structuredClone(DEFAULT), ...s, colors: { ...DEFAULT.colors, ...s.colors }, context: { ...DEFAULT.context, ...s.context }, layout: { ...s.layout }, steps: s.steps.map((st) => ({ ...STEP, ...st })) });
// v2 had 5 steps. Move to the 8-step default but keep colour, font, and the copy that was edited.
function upgrade(s) {
  if ((s.version ?? 2) >= 3) return normalise(s);
  const next = normalise({ ...s, version: 3, steps: DEFAULT.steps });
  const old = (w) => s.steps.find((st) => st.watch === w) ?? {};
  next.steps.forEach((st) => {
    const o = old(st.watch);
    for (const k of ['title', 'body', 'primary', 'secondary']) if (o[k] !== undefined) st[k] = o[k];
    const v = s.steps.find((x) => x.phone === 'voice');
    if (v && st.phone.startsWith('voice')) { st.prompt = v.prompt; st.transcript = v.transcript; }
  });
  state = next; persist();
  return next;
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify(state));
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const out = document.getElementById('saveState');
    try {
      const r = await fetch('/__dev/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ file: 'deviceSequence', data: state }) });
      out.textContent = r.ok ? `Saved to studio/unwind-device-sequence.json · ${new Date().toLocaleTimeString()}` : 'File save failed — kept in this browser.';
    } catch { out.textContent = 'File save unavailable — kept in this browser.'; }
  }, 250);
}
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- Braided wave: port of the intro video's "braid" voice band ---------- */
const PALETTE = ['#53BFFE', '#00D0FF', '#B9A7F5', '#FFB3C7'];
const BRAID = { thick: 9, thickReact: 20, amp: 18, ampReact: 44, freq: 0.02, speed: 0.9, phase: 2.4, blur: 2.5 };
const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
function voiceEnv(t, talking) {
  if (!talking) return 0.12 + 0.06 * Math.sin(t * 1.3);
  return 0.35 + 0.35 * Math.abs(Math.sin(t * 4.2)) * Math.abs(Math.sin(t * 2.9 + 1)) + 0.25 * Math.max(0, Math.sin(t * 0.9));
}
// Voice level eases 0 → 1 when talking starts; before that the band barely drifts (no voice yet).
let lastNow = 0, phaseT = 0, level = 0;
function drawBraids(now) {
  const dt = Math.min(0.05, (now - lastNow) / 1000 || 0); lastNow = now;
  level += ((voiceTalking ? 1 : 0) - level) * Math.min(1, dt * 2.5);
  const t = now / 1000;
  phaseT += dt * (0.25 + 0.75 * level);
  document.querySelectorAll('canvas.braid').forEach((cv) => {
    const dpr = devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    if (!w) return;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    // Intro band is 640px long on a 960px stage; scale every length to this canvas.
    const s = w / 700, talking = cv.hasAttribute('data-voice') || cv.closest('.watch') ? voiceTalking : false;
    // Voice-linked bands follow the voice; decorative ones (hero, connecting) keep a gentle idle motion.
    const live = cv.hasAttribute('data-voice') || cv.closest('.watch') ? level : 0.5;
    const env = voiceEnv(t, true) * live + 0.03 * (1 - live), gx = w / 2, gy = h / 2, half = w * 0.46;
    PALETTE.forEach((col, k) => {
      const loud = env * (0.6 + 0.4 * Math.abs(Math.sin(k * 5.9 + t * 3)));
      const alpha = k === 0 ? 0.78 : 0.62;
      const th = (BRAID.thick * (0.6 + 0.4 * live) + BRAID.thickReact * loud) * s * 2 + 2;
      // Keep the whole band inside the canvas: swing + band + blur never pass the edges.
      const pad = Math.max(0.6, BRAID.blur * s * 2) * 2 + 1;
      const amp = Math.max(0, Math.min((BRAID.amp * (0.18 + 0.82 * live) + BRAID.ampReact * env) * s * 2, h / 2 - th * 0.65 - pad));
      const lg = g.createLinearGradient(gx - half, 0, gx + half, 0);
      lg.addColorStop(0, hexA(col, 0)); lg.addColorStop(0.5, hexA(col, alpha)); lg.addColorStop(1, hexA(col, 0));
      const f = BRAID.freq / (s * 2);
      const yAt = (x, o) => gy + o + amp * Math.exp(-(((x - gx) / (half * 0.55)) ** 2)) * Math.sin(x * f * (1 + k * 0.25) + phaseT * BRAID.speed * (1 + k * 0.35) + k * BRAID.phase);
      g.filter = `blur(${Math.max(0.6, BRAID.blur * s * 2)}px)`; g.fillStyle = lg; g.beginPath();
      const step = 3;
      for (let x = gx - half; x <= gx + half; x += step) x === gx - half ? g.moveTo(x, yAt(x, -th / 2)) : g.lineTo(x, yAt(x, -th / 2));
      for (let x = gx + half; x >= gx - half; x -= step) g.lineTo(x, yAt(x, th / 2) + th * 0.3 * Math.sin(x * 0.05 / (s * 2) - phaseT * 1.5 * BRAID.speed));
      g.closePath(); g.fill();
    });
    g.filter = 'none';
  });
  requestAnimationFrame(drawBraids);
}

/* ---------- Status bar with real iOS glyphs ---------- */
const SIGNAL = '<svg width="16" height="11" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx=".8"/><rect x="5" y="5.5" width="3" height="6.5" rx=".8"/><rect x="10" y="3" width="3" height="9" rx=".8"/><rect x="15" y="0" width="3" height="12" rx=".8"/></svg>';
// iOS Wi-Fi glyph: a wedge and two arcs sharing one centre, 90° wide, rounded ends.
const WIFI = (() => {
  const cx = 8.5, cy = 11.6, a0 = -Math.PI * 0.75, a1 = -Math.PI * 0.25;
  const pt = (r, a) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  const ring = (r, w) => `<path d="M${pt(r, a0)} A${r} ${r} 0 0 1 ${pt(r, a1)}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round"/>`;
  const wedge = `<path d="M${cx} ${cy + .2} L${pt(3.9, a0)} A3.9 3.9 0 0 1 ${pt(3.9, a1)} Z" stroke="currentColor" stroke-width=".9" stroke-linejoin="round"/>`;
  return `<svg width="16" height="11.5" viewBox="0 0 17 12.5">${wedge}${ring(6.7, 1.9)}${ring(10.2, 1.9)}</svg>`;
})();
const BATTERY = '<svg width="24" height="12" viewBox="0 0 27 13"><rect x=".5" y=".5" width="22" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="19" height="9" rx="2"/><path d="M24 4.5v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2Z" opacity=".4"/></svg>';
// Lock screen shows the carrier where apps show the time (the big clock already tells it).
const statusBar = (light, lock) => `<div class="sb ${light ? 'light' : ''}"><span>${lock ? 'AT&amp;T' : '9:41'}</span><span class="sb__icons">${SIGNAL}${WIFI}${BATTERY}</span></div>`;

/* ---------- Rendering ---------- */
function applyLook() {
  const c = state.colors, r = document.documentElement.style;
  r.setProperty('--tint', c.tint); r.setProperty('--tint-amt', c.amount);
  r.setProperty('--shade', c.shade); r.setProperty('--blue', c.accent);
  document.documentElement.dataset.screenFont = state.font;
  document.querySelectorAll('[data-font]').forEach((b) => b.classList.toggle('primary', b.dataset.font === state.font));
  document.querySelectorAll('[data-color]').forEach((i) => (i.value = c[i.dataset.color]));
}

const momoImg = (cls = 'w-momo') => `<img class="${cls}" src="${DEV}/momo-open.webp" alt="">`;
const momoVideo = (kind = 'listening') => `<video class="momo" src="${DEV}/momo-${kind}.webm" autoplay muted loop playsinline></video>`;

const btnsOnly = (s) => `<div class="w-btns">${s.primary ? `<div class="w-btn blue"><span>${esc(s.primary)}</span></div>` : ''}${s.secondary ? `<div class="w-btn">${esc(s.secondary)}</div>` : ''}</div>`;
const TICKS = Array.from({ length: 60 }, (_, k) => `<line x1="50" y1="${k % 5 ? 4 : 3}" x2="50" y2="${k % 5 ? 7 : 11}" transform="rotate(${k * 6} 50 50)" stroke="${k % 5 ? '#555' : '#fff'}" stroke-width="${k % 5 ? .8 : 1.8}"/>`).join('');
const hands = `<line x1="50" y1="50" x2="50" y2="24" stroke="#fff" stroke-width="3.2" stroke-linecap="round" transform="rotate(${9 * 30 + 20.5} 50 50)"/><line x1="50" y1="50" x2="50" y2="12" stroke="#fff" stroke-width="2.2" stroke-linecap="round" transform="rotate(246 50 50)"/><line x1="50" y1="58" x2="50" y2="10" stroke="#ff9f0a" stroke-width="1" class="w-sec"/><circle cx="50" cy="50" r="2.4" fill="#ff9f0a"/>`;
const ring = (r, c, p) => `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${c}" stroke-opacity=".25" stroke-width="8"/><circle cx="50" cy="50" r="${r}" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${2 * Math.PI * r * p} 999" transform="rotate(-90 50 50)"/>`;
function faceHTML(style) {
  switch (style) {
    case 'modular':
      return `<div class="wf wf-mod"><div class="row"><span style="color:#ff9f0a">THU 2</span><b>9:41</b></div><div class="big"><small style="color:#30d158">ACTIVITY</small>420 / 600 CAL<div class="bar"><i style="width:70%"></i></div></div><div class="row3"><div style="color:#ff375f">♥ 68</div><div style="color:#64d2ff">☁ 18°</div><div style="color:var(--blue)">${momoImg('w-mini')}</div></div></div>`;
    case 'analog':
      return `<svg class="wf-svg" viewBox="0 0 100 100">${TICKS}${hands}</svg>`;
    case 'california':
      return `<svg class="wf-svg" viewBox="0 0 100 100">${['XII', '1', '2', 'III', '4', '5', 'VI', '7', '8', 'IX', '10', '11'].map((n, k) => { const a = (k * 30 - 90) * Math.PI / 180; return `<text x="${50 + 38 * Math.cos(a)}" y="${53 + 38 * Math.sin(a)}" fill="${k % 3 ? '#e8e3d6' : '#ff9f0a'}" font-size="${k % 3 ? 10 : 12}" text-anchor="middle" font-family="Georgia, serif">${n}</text>`; }).join('')}${hands}</svg>`;
    case 'rings':
      return `<div class="wf"><svg class="wf-svg" viewBox="0 0 100 100" style="width:70%;margin:6px auto 0">${ring(40, '#ff375f', .72)}${ring(30, '#a2ff00', .55)}${ring(20, '#00e5ff', .9)}</svg><b style="font-size:22px;text-align:center">9:41</b></div>`;
    case 'utility':
      return `<div class="wf wf-util"><div style="color:#64d2ff">☁ 18° · Light rain later</div><b>9:41</b><div style="color:#ff9f0a">Thursday, October 2</div><div class="chip">Next: Design review · 10:00</div></div>`;
    case 'numerals':
      return `<div class="wf wf-num"><b>9</b><span>41</span></div>`;
    case 'solar':
      return `<div class="wf"><svg viewBox="0 0 100 60" style="width:100%;margin-top:14px"><path d="M4 50 Q50 -10 96 50" fill="none" stroke="#444" stroke-dasharray="2 3"/><line x1="0" y1="50" x2="100" y2="50" stroke="#333"/><circle cx="77" cy="30" r="5" fill="#ffd60a" style="filter:drop-shadow(0 0 4px #ffd60a)"/></svg><b style="font-size:30px;text-align:center">9:41</b><small style="text-align:center;color:#ffd60a;font-size:10px">SUNSET 6:48 PM</small></div>`;
    case 'momo':
      return `<div class="wf" style="justify-content:center;align-items:center;gap:4px"><img src="${DEV}/momo-open.webp" class="wf-momo" alt=""><b style="font-size:30px">9:41</b><small style="color:#9ad0ff;font-size:10px">Calm streak · 4 days</small></div>`;
    case 'calm':
      return `<div class="wf wf-calm"><div class="orb"></div><b>9:41</b><small>THU 2</small></div>`;
    default:
      return `<div class="w-face"><span>Thu 2</span><b>9:41</b></div>`;
  }
}
function watchHTML(s) {
  const btns = `<div class="w-btns">${s.watch === 'pressed' && s.tapStyle === 'cursor' ? '<div class="w-finger"></div>' : ''}${s.primary ? `<div class="w-btn blue"><span>${esc(s.primary)}</span></div>` : ''}${s.secondary ? `<div class="w-btn">${esc(s.secondary)}</div>` : ''}</div>`;
  switch (s.watch) {
    case 'notification':
    case 'pressed':
      return `${momoImg()}<div class="w-title">${esc(s.title)}</div><div class="w-body">${esc(s.body)}</div>${btns}`;
    case 'handoff':
      return `<div class="w-center"><div class="w-ring">${momoImg('')}</div><div class="w-title">${esc(s.title)}</div><div class="w-body">${esc(s.body)}</div></div>`;
    case 'continuing':
      return `<div class="w-center"><div class="w-phone-glyph"></div><div class="w-title">${esc(s.title)}</div><div class="w-body">${esc(s.body)}</div></div>`;
    case 'listening':
      return `<div class="w-center" style="width:100%"><canvas class="braid" style="height:46px"></canvas><div class="w-title">${esc(s.title)}</div><div class="w-body">${esc(s.body)}</div></div>`;
    case 'faceMomo':
      return `<div class="w-face"><span>Thu 2</span><b>9:41</b><div style="display:flex;gap:6px;justify-content:center;align-items:center;margin-top:8px;color:#9ad0ff;font-size:10px">${momoImg('w-mini')}Calm · 2h ago</div></div>`;
    case 'faceHeart':
      return `<div class="w-face"><span>Thu 2</span><b>9:41</b><div style="color:#ff375f;font-size:11px;font-weight:600;margin-top:8px">♥ 112 BPM <span style="color:#8e8e93;font-weight:400;text-transform:none">↑ from 68</span></div></div>`;
    case 'aod':
      return `<div class="w-face" style="opacity:.45"><span style="color:#8e8e93">Thu 2</span><b style="font-weight:400">9:41</b></div>`;
    case 'shortLook':
      return `<div class="w-center">${momoImg('w-big')}<div class="w-title" style="margin:0">Unwind</div><div class="w-body">Checking in</div></div>`;
    case 'haptic':
      return `<div class="w-center"><div class="w-rings">${momoImg('')}<i></i><i></i><i></i></div></div>`;
    case 'heartChart':
      return `${momoImg()}<div class="w-title">${esc(s.title)}</div><svg viewBox="0 0 160 34" style="width:100%;height:30px;margin:4px 0"><polyline fill="none" stroke="#ff375f" stroke-width="2" points="0,26 20,25 40,24 60,22 75,12 90,8 105,10 120,9 140,11 160,10"/><polyline fill="none" stroke="var(--blue)" stroke-width="2" stroke-dasharray="3 3" points="0,8 30,9 60,12 80,22 100,27 130,26 160,27"/></svg><div class="w-body" style="margin-top:0">HR ↑ · HRV ↓</div>${btnsOnly(s)}`;
    case 'momoPeek':
      return `<div class="w-bubble">${esc(s.body)}</div>${btnsOnly(s)}<img class="w-peek" src="${DEV}/momo-open.webp" alt="">`;
    case 'breatheAsk':
      return `<div class="w-center"><div class="w-breathe"></div><div class="w-title" style="margin:0">One breath first</div><div class="w-body">Then talk for 30 seconds?</div></div>`;
    case 'sent':
      return `<div class="w-center"><div class="w-check">✓</div><div class="w-title" style="margin:0">${esc(s.title || 'Sent to iPhone')}</div></div>`;
    case 'pickUp':
      return `<div class="w-center"><div class="w-rings">${'<div class="w-phone-glyph"></div>'}<i></i><i></i></div><div class="w-title" style="margin:0">Pick up your iPhone</div></div>`;
    case 'momoListen':
      return `<div class="w-center"><video class="momo" style="width:90px;height:90px" src="${DEV}/momo-listening.webm" autoplay muted loop playsinline></video><div class="w-title" style="margin:0">${esc(s.title)}</div></div>`;
    case 'countdown':
      return `<div class="w-center"><div class="w-count"><svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="26"/><circle cx="30" cy="30" r="26" class="run"/></svg><b>30</b></div><div class="w-title" style="margin:0">${esc(s.title)}</div></div>`;
    case 'captions':
      return `<canvas class="braid" style="height:30px;margin-top:6px"></canvas><div class="w-caps">${esc(s.transcript || 'Honestly, today was a lot. My manager moved the deadline up again…')}</div>`;
    case 'saved':
      return `<div class="w-center">${momoImg('w-big')}<div class="w-title" style="margin:0">Saved</div><div class="w-body">Momo will reflect on it tonight.</div></div>`;
    case 'face': return faceHTML(s.faceStyle);
    default: return '';
  }
}

function connectingHTML(s) {
  const text = `<b>${esc(s.phoneTitle)}</b><span>${esc(s.phoneBody)}</span>`;
  switch (s.connectStyle) {
    case 'braid':
      return `${statusBar()}<div class="p-app"><div style="width:100%">${momoVideo('floating')}<canvas class="braid" style="height:44px;margin:-8px 0 14px"></canvas>${text}</div></div>`;
    case 'halo':
      return `${statusBar()}<div class="p-app"><div><div class="halo"><i></i><i></i><i></i>${momoVideo('floating')}</div>${text}</div></div>`;
    case 'handoff':
      return `${statusBar()}<div class="p-app"><div>${momoVideo('floating')}<div class="link"><div class="link__dev"></div><div class="link__dots"><i></i><i></i><i></i><i></i></div><div class="link__dev ph"></div></div>${text}</div></div>`;
    case 'sheet':
      return `${statusBar(true)}<div class="sheetbg"></div><div class="sheet"><small>Continuing from Apple Watch</small>${momoVideo('floating')}<b>${esc(s.phoneTitle)}</b><span style="color:#6e6e73;font-size:13px">${esc(s.phoneBody)}</span><div class="cta">Start talking</div></div>`;
    default:
      return `${statusBar()}<div class="p-app"><div>${momoVideo('floating')}${text}<div class="p-dots"><i></i><i></i><i></i></div></div></div>`;
  }
}

// Words appear as spoken; the transcript stops mid-thought so it reads as a long entry.
const TALK_AT = 1.9, WORD_MS = 210;
function voiceHTML(s) {
  const words = s.transcript.split(/\s+/).filter(Boolean);
  return `${statusBar()}<div class="p-voice">
    <div class="p-back">‹</div>
    <div class="p-prompt">${esc(s.prompt)}</div>
    ${momoVideo('listening')}
    <div class="p-transcript"><p style="margin:0">${words.map((w) => `<i>${esc(w)} </i>`).join('')}</p></div>
    <canvas class="braid" data-voice></canvas>
    <div class="p-bar"><span class="p-pill">Freeform ⌄</span><span class="p-round">↺</span><span class="p-round">❙❙</span><span class="p-round stop"></span></div>
    <div class="p-home"></div>
  </div>`;
}
let wordTimer = null, phaseTimer = null, voiceTalking = false;
// prompt → talking happens in place, so Momo, the wave and the screen never re-mount between the two steps.
function setVoicePhase(root, phase, wait = 0) {
  clearTimeout(phaseTimer); clearInterval(wordTimer);
  const voice = root.querySelector('.p-voice');
  const words = [...root.querySelectorAll('.p-transcript i')];
  if (phase !== 'voice') { voice?.classList.remove('talking'); words.forEach((w) => w.classList.remove('on', 'last')); voiceTalking = false; return; }
  phaseTimer = setTimeout(() => {
    voice?.classList.add('talking'); voiceTalking = true;
    let n = words.findIndex((w) => !w.classList.contains('on')); if (n < 0) return;
    setTimeout(() => {
      wordTimer = setInterval(() => {
        words[n - 1]?.classList.remove('last');
        if (n >= words.length) return clearInterval(wordTimer);
        // Unspoken words take no space, so the newest line sits at the bottom and older lines scroll up.
        const p = words[n].parentElement, h0 = p.offsetHeight;
        words[n].classList.add('on', 'last'); n++;
        const dy = p.offsetHeight - h0;
        if (dy > 0) p.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.3,.7,.3,1)' });
      }, WORD_MS);
    }, 400);
  }, wait);
}

function phoneHTML(s) {
  if (s.phone.startsWith('video:')) {
    const name = s.phone.slice(6), dir = ['freeform-evening', 'welcome-park'].includes(name) ? 'proto' : 'flows';
    return `<video class="rec" src="${ASSETS}/${dir}/${name}.mp4" poster="${ASSETS}/${dir}/${name}.webp" autoplay muted loop playsinline></video>`;
  }
  switch (s.phone) {
    case 'lock':
    case 'lockNotif':
    case 'lockNotifTap':
      return `${statusBar(true, true)}<div class="p-lock"><div class="p-date">Thursday, October 2</div><div class="p-time">9:41</div>${s.phone.startsWith('lockNotif') ? `<div class="p-notif ${s.phone === 'lockNotifTap' ? 'tapped' : ''}">${s.phone === 'lockNotifTap' ? '<div class="p-finger"></div>' : ''}<img src="${DEV}/momo-open.webp" alt=""><b>${esc(s.phoneTitle)}</b><span>${esc(s.phoneBody)}</span></div>` : ''}</div>`;
    case 'connecting': return connectingHTML(s);
    case 'aod':
      return `<div class="p-lock" style="background:#000;color:#666"><div class="p-date" style="padding-top:22px">Thursday, October 2</div><div class="p-time" style="font-weight:300">9:41</div></div>`;
    case 'lockActivity':
      return `${statusBar(true, true)}<div class="p-lock"><div class="p-date">Thursday, October 2</div><div class="p-time">9:41</div><div class="p-live"><img src="${DEV}/momo-open.webp" alt=""><div><b>Momo is listening</b><span>Talking from Apple Watch · 0:12</span></div><canvas class="braid" style="width:60px;height:24px"></canvas></div></div>`;
    case 'notifExpanded':
      return `${statusBar(true, true)}<div class="p-lock" style="backdrop-filter:blur(8px)"><div class="p-date" style="opacity:.4">Thursday, October 2</div><div class="p-time" style="opacity:.4">9:41</div><div class="p-notif"><img src="${DEV}/momo-open.webp" alt=""><b>${esc(s.phoneTitle || 'Unwind')}</b><span>${esc(s.phoneBody || 'Ready when you are.')}</span></div><div class="p-actions"><div>Start talking</div><div>Remind me later</div></div></div>`;
    case 'homeBanner':
    case 'homeTap':
      return `${statusBar(true)}<div class="p-home-s">${s.phone === 'homeBanner' ? `<div class="p-notif" style="margin:0 0 18px"><img src="${DEV}/momo-open.webp" alt=""><b>${esc(s.phoneTitle || 'Unwind')}</b><span>${esc(s.phoneBody || 'Continue on iPhone')}</span></div>` : ''}<div class="p-grid">${Array.from({ length: 16 }, (_, k) => k === 5 ? `<i class="u ${s.phone === 'homeTap' ? 'tap' : ''}"><img src="${DEV}/momo-open.webp" alt=""></i>` : '<i></i>').join('')}</div></div>`;
    case 'splash':
      return `<div class="p-app"><div><img src="${DEV}/momo-open.webp" style="width:96px;animation:fadeIn .6s both" alt=""><b style="margin-top:10px">Unwind</b></div></div>`;
    case 'island':
      return `${statusBar()}<div class="p-isl"><img src="${DEV}/momo-open.webp" alt=""><span>From Apple Watch</span><canvas class="braid" style="width:46px;height:18px"></canvas></div><div class="p-app"><div>${momoVideo('floating')}<b>${esc(s.phoneTitle || 'Picking up where you left off')}</b></div></div>`;
    case 'permission':
      return `${statusBar()}<div class="p-app"><div><div class="p-mic">🎙</div><b>Ready to listen</b><span>Talk freely. Only you can read this.</span><div class="p-cta">Start talking</div></div></div>`;
    case 'voiceCaptions':
      return `${statusBar()}<div class="p-voice">${momoVideo('listening')}<div class="p-chat"><p class="m">${esc(s.prompt)}</p><p class="u">Honestly, today was a lot.</p><p class="u">My manager moved the deadline up again and I just froze…</p></div><canvas class="braid" data-voice></canvas></div>`;
    case 'voiceTimer':
    case 'voicePaused':
      return `${statusBar()}<div class="p-voice"><div class="p-timer">${s.phone === 'voicePaused' ? 'Paused · ' : '● '}0:24</div>${momoVideo(s.phone === 'voicePaused' ? 'floating' : 'listening')}<canvas class="braid" ${s.phone === 'voicePaused' ? '' : 'data-voice'}></canvas><div class="p-bar"><span class="p-pill">Freeform ⌄</span><span class="p-round">↺</span><span class="p-round">${s.phone === 'voicePaused' ? '▶' : '❙❙'}</span><span class="p-round stop"></span></div></div>`;
    case 'thinking':
      return `${statusBar()}<div class="p-app"><div>${momoVideo('floating')}<b>Momo is reflecting…</b><div class="p-dots"><i></i><i></i><i></i></div></div></div>`;
    case 'reflection':
      return `${statusBar()}<div class="p-app" style="place-items:start center;padding-top:70px"><div class="p-card"><small>WHAT I HEARD</small><p>A deadline moved, you froze in the meeting, and it followed you home.</p><small>A GENTLE QUESTION</small><p>What would “enough” look like for today?</p></div></div>`;
    case 'moodTags':
      return `${statusBar()}<div class="p-app" style="place-items:start center;padding-top:80px"><div style="width:100%"><b>How it felt</b><div class="p-tags"><i>Overwhelmed</i><i>Tired</i><i>Frozen</i></div><b style="margin-top:18px">What set it off</b><div class="p-tags"><i>Deadline</i><i>Meeting</i><i>Commute</i></div></div></div>`;
    case 'breathe':
      return `${statusBar()}<div class="p-app"><div><div class="p-breath"></div><b>Breathe in</b><span>4 · 7 · 8</span></div></div>`;
    case 'savedEntry':
      return `${statusBar()}<div class="p-app"><div><img src="${DEV}/momo-open.webp" style="width:90px" alt=""><b>Saved</b><span>Entry 42 · 2 min 14 s</span></div></div>`;
    case 'entryList':
      return `${statusBar()}<div class="p-app" style="place-items:start stretch;padding-top:64px;text-align:left"><div><b style="font-size:24px">Journal</b>${[['Today · 6:42 PM', 'Deadline moved again, froze in the meeting…', 1], ['Tue · 9:10 PM', 'Snapped at dinner. So tired.', 0], ['Sun · 8:03 PM', 'Good walk in the park.', 0]].map(([d, t, n]) => `<div class="p-entry ${n ? 'new' : ''}"><small>${d}</small>${t}</div>`).join('')}</div></div>`;
    case 'pattern':
      return `${statusBar()}<div class="p-app"><div class="p-card"><small>PATTERN NOTICED</small><p>Third evening this week where work deadlines followed you home.</p><div class="p-dotsrow"><i class="on"></i><i></i><i class="on"></i><i></i><i class="on"></i></div></div></div>`;
    case 'voicePrompt':
    case 'voice': return voiceHTML(s);
    default: return `<div style="height:100%;background:#000"></div>`;
  }
}

function swapPhone(host, html, s) {
  const t = s.transition, old = [...host.querySelectorAll('.screen')];
  const el = document.createElement('div');
  el.className = `screen entering t-${t}`;
  el.style.setProperty('--tt', `${s.transitionMs}ms`);
  el.innerHTML = html;
  old.forEach((o) => { o.className = `screen leaving t-${t}`; o.style.setProperty('--tt', `${s.transitionMs}ms`); setTimeout(() => o.remove(), s.transitionMs + 400); });
  host.append(el);
  setVoicePhase(el, 'off');
}

function show(i, force = false) {
  index = (i + state.steps.length) % state.steps.length;
  const s = state.steps[index];
  const w = document.getElementById('watchScreen'), p = document.getElementById('phoneScreen');
  const wKey = JSON.stringify([s.watch, s.title, s.body, s.primary, s.secondary, s.watch === 'pressed' && s.tapStyle, s.watch === 'face' && s.faceStyle]);
  const isVoice = s.phone === 'voice' || s.phone === 'voicePrompt';
  const pKey = JSON.stringify([isVoice ? 'voice' : s.phone, s.phoneTitle, s.phoneBody, s.phone === 'connecting' && s.connectStyle, isVoice && [s.prompt, s.transcript]]);
  // Only re-mount a device when its content changes, so videos keep playing across steps.
  if (force || w.dataset.key !== wKey) {
    w.dataset.key = wKey;
    w.innerHTML = `<div class="screen ${s.watch === 'pressed' ? `tap-${s.tapStyle}` : ''} ${s.watch === 'notification' ? 'w-enter' : ''}">${watchHTML(s)}</div>`;
  }
  const mounted = !(force || p.dataset.key !== pKey);
  if (!mounted) { p.dataset.key = pKey; swapPhone(p, phoneHTML(s), s); }
  // Straight into "talking" still shows the prompt first; from "Momo asks" it starts at once.
  if (isVoice) setVoicePhase(p.querySelector('.screen:last-child'), s.phone === 'voice' ? 'voice' : 'prompt', mounted ? 0 : TALK_AT * 1000);
  document.getElementById('phone').classList.toggle('is-video', s.phone.startsWith('video:'));
  document.getElementById('caption').innerHTML = `<b>${esc(s.label)}</b><span>${esc(s.caption)}</span>`;
  document.getElementById('timeline').innerHTML = state.steps.map((st, k) => `<button data-go="${k}" aria-current="${k === index}">${k + 1}. ${esc(st.label)}</button>`).join('');
  document.querySelectorAll('.step').forEach((el, k) => (el.dataset.active = k === index));
}

function play() {
  const btn = document.getElementById('play');
  if (timer) { clearTimeout(timer); timer = null; btn.textContent = 'Play'; return; }
  btn.textContent = 'Pause';
  if (index === state.steps.length - 1) show(0);
  if (state.context.riseOnPlay && state.context.view === 'page') { show(0, true); rise(); }
  const tick = () => { timer = setTimeout(() => { show(index + 1); tick(); }, state.steps[index].duration * 1000); };
  tick();
}

/* ---------- Editor ---------- */
const opts = (map, v) => Object.entries(map).map(([k, l]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${l}</option>`).join('');
const txt = (k, label, s) => `<label class="field">${label}<input type="text" data-k="${k}" value="${esc(s[k])}"></label>`;
const area = (k, label, s) => `<label class="field">${label}<textarea data-k="${k}">${esc(s[k])}</textarea></label>`;
const sel = (k, label, map, s) => `<label class="field">${label}<select data-k="${k}">${opts(map, s[k])}</select></label>`;
function stepBody(s) {
  const watchText = ['notification', 'pressed'].includes(s.watch);
  return `
    ${txt('label', 'Step name', s)}
    ${area('caption', 'Caption', s)}
    <div class="grid2">${sel('watch', 'Watch screen', WATCH_SCREENS, s)}${sel('phone', 'Phone screen', PHONE_SCREENS, s)}</div>
    ${s.watch === 'face' ? sel('faceStyle', 'Watch face design', FACE_STYLES, s) : ''}
    ${s.watch === 'pressed' ? sel('tapStyle', 'Tap UI', TAP_STYLES, s) : ''}
    ${s.phone === 'connecting' ? sel('connectStyle', 'Connecting UI', CONNECT_STYLES, s) : ''}
    <div class="grid2">${sel('transition', 'Phone transition in', TRANSITIONS, s)}<label class="field">Transition (ms)<input type="number" min="0" step="50" data-k="transitionMs" value="${s.transitionMs}"></label></div>
    ${s.watch !== 'off' ? txt('title', 'Watch title', s) + area('body', 'Watch body', s) : ''}
    ${watchText ? `<div class="grid2">${txt('primary', 'Primary button', s)}${txt('secondary', 'Secondary button', s)}</div>` : ''}
    ${['lockNotif', 'connecting'].includes(s.phone) ? `<div class="grid2">${txt('phoneTitle', 'Phone title', s)}${txt('phoneBody', 'Phone text', s)}</div>` : ''}
    ${s.phone === 'voice' ? txt('prompt', 'Prompt above Momo', s) + area('transcript', 'Spoken entry (cut mid-thought)', s) : ''}
    <label class="field">Duration (s)<input type="number" min="0.5" step="0.1" data-k="duration" value="${s.duration}"></label>`;
}
function renderSteps() {
  document.getElementById('steps').innerHTML = state.steps.map((s, k) => `
    <div class="step" data-i="${k}" data-open="${k === openStep}" data-active="${k === index}">
      <div class="step__head">
        <strong data-act="toggle">${k + 1}. ${esc(s.label)}</strong>
        <button data-act="up" title="Move up">↑</button><button data-act="down" title="Move down">↓</button>
        <button data-act="dup" title="Duplicate">⧉</button><button data-act="del" title="Delete">✕</button>
      </div>
      <div class="step__body">${k === openStep ? stepBody(s) : ''}</div>
    </div>`).join('');
}

const NUM = new Set(['duration', 'transitionMs']);
const RERENDER = new Set(['watch', 'phone']);
const stepsBox = document.getElementById('steps');
stepsBox.addEventListener('input', (e) => {
  const k = e.target.dataset.k; if (!k) return;
  const i = +e.target.closest('.step').dataset.i;
  state.steps[i][k] = NUM.has(k) ? Math.max(k === 'duration' ? 0.5 : 0, +e.target.value || 0) : e.target.value;
  persist();
  if (RERENDER.has(k)) renderSteps();
  show(i, e.target.tagName === 'SELECT');
  if (k === 'label') e.target.closest('.step').querySelector('strong').textContent = `${i + 1}. ${e.target.value}`;
});
stepsBox.addEventListener('click', (e) => {
  const act = e.target.dataset.act; if (!act) return;
  const i = +e.target.closest('.step').dataset.i, st = state.steps;
  if (act === 'toggle') { openStep = openStep === i ? -1 : i; renderSteps(); show(i); return; }
  if (act === 'up' && i > 0) { [st[i - 1], st[i]] = [st[i], st[i - 1]]; openStep = i - 1; }
  if (act === 'down' && i < st.length - 1) { [st[i + 1], st[i]] = [st[i], st[i + 1]]; openStep = i + 1; }
  if (act === 'dup') { st.splice(i + 1, 0, structuredClone(st[i])); openStep = i + 1; }
  if (act === 'del' && st.length > 1) { st.splice(i, 1); openStep = Math.min(i, st.length - 1); }
  persist(); renderSteps(); show(Math.max(0, openStep));
});
document.getElementById('addStep').onclick = () => {
  state.steps.push({ ...STEP, label: 'New step', watch: 'listening', phone: 'voice', title: 'Listening', body: 'On iPhone', transcript: DEFAULT.steps[4].transcript });
  openStep = state.steps.length - 1; persist(); renderSteps(); show(openStep);
};
document.getElementById('reset').onclick = () => {
  if (!confirm('Reset sequence, colour and font to the default?')) return;
  state = structuredClone(DEFAULT); persist(); applyLook(); renderSteps(); show(0, true);
};
document.getElementById('export').onclick = async () => { await navigator.clipboard.writeText(JSON.stringify(state, null, 2)); alert('Sequence copied as JSON.'); };
document.getElementById('import').onclick = () => {
  const text = prompt('Paste sequence JSON'); if (!text) return;
  try { const s = JSON.parse(text); if (!s.steps?.length) throw 0; state = normalise(s); persist(); applyLook(); renderSteps(); show(0, true); } catch { alert('That JSON is not a valid sequence.'); }
};
document.querySelectorAll('[data-color]').forEach((inp) => inp.addEventListener('input', () => { state.colors[inp.dataset.color] = inp.type === 'range' ? +inp.value : inp.value; persist(); applyLook(); }));
document.getElementById('colorPresets').innerHTML = Object.entries(COLOR_PRESETS).map(([n, c]) => `<button data-preset="${n}"><i style="background:${c.amount ? c.tint : '#e3d9cc'}"></i>${n}</button>`).join('');
document.getElementById('colorPresets').addEventListener('click', (e) => {
  const b = e.target.closest('[data-preset]'); if (!b) return;
  Object.assign(state.colors, COLOR_PRESETS[b.dataset.preset]); persist(); applyLook();
});
document.getElementById('fontPick').addEventListener('click', (e) => { const b = e.target.closest('[data-font]'); if (!b) return; state.font = b.dataset.font; persist(); applyLook(); });
document.getElementById('timeline').addEventListener('click', (e) => { const g = e.target.closest('[data-go]'); if (g) { openStep = +g.dataset.go; renderSteps(); show(openStep); } });
document.getElementById('prev').onclick = () => show(index - 1);
document.getElementById('next').onclick = () => show(index + 1);
document.getElementById('replay').onclick = () => show(index, true);
document.getElementById('play').onclick = play;

/* ---------- Presentation: page context + slide-up ---------- */
function applyContext() {
  const c = state.context, st = document.getElementById('stage').style;
  document.getElementById('stage').dataset.view = c.view;
  st.setProperty('--dev-scale', c.scale); st.setProperty('--fold', `${c.fold * 100}%`); st.setProperty('--dev-gap', `${c.gap}px`);
  st.setProperty('--rise-ms', `${c.riseMs}ms`); st.setProperty('--rise-delay', `${c.riseDelay}ms`);
  st.setProperty('--rise-stagger', `${c.riseStagger}ms`); st.setProperty('--rise-ease', c.riseEase);
  document.querySelectorAll('[data-view]').forEach((b) => b.tagName === 'BUTTON' && b.classList.toggle('primary', b.dataset.view === c.view));
  document.querySelectorAll('[data-ctx]').forEach((i) => (i.type === 'checkbox' ? (i.checked = c[i.dataset.ctx]) : (i.value = c[i.dataset.ctx])));
  fit();
}
function fit() {
  const v = document.getElementById('viewport');
  document.getElementById('pageFrame').style.setProperty('--fit', Math.min(v.clientWidth / 1440, v.clientHeight / 800));
}
function rise() {
  const d = document.getElementById('devices');
  d.classList.remove('rising'); void d.offsetWidth; d.classList.add('rising');
}
document.querySelector('[data-ctx="riseEase"]').innerHTML = opts(EASES, '');
document.querySelectorAll('[data-ctx]').forEach((inp) => inp.addEventListener('input', () => {
  const k = inp.dataset.ctx;
  state.context[k] = inp.type === 'checkbox' ? inp.checked : inp.tagName === 'SELECT' ? inp.value : +inp.value;
  persist(); applyContext();
  if (k.startsWith('rise') && k !== 'riseOnPlay') rise();
}));
document.getElementById('viewPick').addEventListener('click', (e) => { const b = e.target.closest('[data-view]'); if (!b) return; state.context.view = b.dataset.view; persist(); applyContext(); });
document.getElementById('riseBtn').onclick = rise;
new ResizeObserver(fit).observe(document.getElementById('viewport'));

/* ---------- Layout: move + scale every element ---------- */
const EL_NAMES = { braid: 'Top wave', nav: 'Nav', avatar: 'Avatar', side: 'Side menu', title: 'Title', meta: 'Role / timeline / team', logos: 'Logos', watch: 'Watch', phone: 'Phone' };
let selected = null;
const lay = (k) => (state.layout[k] ??= { x: 0, y: 0, s: 1 });
function applyLayout() {
  document.querySelectorAll('[data-el]').forEach((el) => {
    const l = state.layout[el.dataset.el] ?? { x: 0, y: 0, s: 1 };
    el.style.setProperty('--ex', `${l.x}px`); el.style.setProperty('--ey', `${l.y}px`); el.style.setProperty('--es', l.s);
    el.classList.toggle('sel', el.dataset.el === selected);
  });
  const k = selected, box = document.getElementById('layoutFields');
  if (!k) { box.innerHTML = ''; return; }
  const l = lay(k);
  box.innerHTML = `<b style="grid-column:span 2;font-weight:500">${EL_NAMES[k]}</b>
    <label class="field">X (px)<input type="number" data-l="x" value="${l.x}"></label>
    <label class="field">Y (px)<input type="number" data-l="y" value="${l.y}"></label>
    <label class="field" style="grid-column:span 2">Scale ${l.s.toFixed(2)}<input type="range" min="0.3" max="2.5" step="0.01" data-l="s" value="${l.s}"></label>`;
}
document.getElementById('layoutFields').addEventListener('input', (e) => {
  const k = e.target.dataset.l; if (!k || !selected) return;
  lay(selected)[k] = +e.target.value; persist(); applyLayout();
});
const stageEl = document.getElementById('stage');
document.getElementById('editLayout').onclick = (e) => {
  const on = stageEl.classList.toggle('editing');
  e.target.classList.toggle('primary', on); e.target.textContent = on ? 'Done editing' : 'Edit layout';
  if (!on) { selected = null; applyLayout(); }
};
document.getElementById('resetLayout').onclick = () => { if (!confirm('Reset all element positions and sizes?')) return; state.layout = {}; persist(); applyLayout(); };
const fitScale = () => +getComputedStyle(document.getElementById('pageFrame')).getPropertyValue('--fit') || 1;
stageEl.addEventListener('pointerdown', (e) => {
  if (!stageEl.classList.contains('editing')) return;
  const el = e.target.closest('[data-el]'); if (!el) return;
  e.preventDefault(); selected = el.dataset.el; applyLayout();
  const l = lay(selected), x0 = e.clientX, y0 = e.clientY, lx = l.x, ly = l.y;
  // Devices sit inside the scaled .devices group, so drag distance divides by both scales.
  const k = fitScale() * (el.closest('.devices') ? (state.context.view === 'page' ? state.context.scale : 1.25) : 1);
  const move = (m) => { l.x = Math.round(lx + (m.clientX - x0) / k); l.y = Math.round(ly + (m.clientY - y0) / k); applyLayout(); };
  const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); persist(); };
  addEventListener('pointermove', move); addEventListener('pointerup', up);
});
stageEl.addEventListener('wheel', (e) => {
  if (!stageEl.classList.contains('editing')) return;
  const el = e.target.closest('[data-el]'); if (!el) return;
  e.preventDefault(); selected = el.dataset.el;
  const l = lay(selected); l.s = Math.min(2.5, Math.max(0.3, +(l.s * (e.deltaY < 0 ? 1.03 : 1 / 1.03)).toFixed(3)));
  applyLayout(); persist();
}, { passive: false });
addEventListener('keydown', (e) => {
  if (!selected || !stageEl.classList.contains('editing') || e.target.closest('input,textarea,select')) return;
  const d = e.shiftKey ? 10 : 1, l = lay(selected);
  const map = { ArrowLeft: ['x', -d], ArrowRight: ['x', d], ArrowUp: ['y', -d], ArrowDown: ['y', d] };
  if (!map[e.key]) return;
  e.preventDefault(); l[map[e.key][0]] += map[e.key][1]; applyLayout(); persist();
});

state = await load();
applyLook(); applyContext(); applyLayout(); renderSteps(); show(0, true); rise();
requestAnimationFrame(drawBraids);
