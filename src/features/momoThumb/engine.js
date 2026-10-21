/**
 * Momo thumbnail: "Close crop", inputs → outputs. Runs the Selected Works card on the site and the
 * desktop (867 × 493) and mobile (100 : 134) cards in the studio (studio/momo-thumbnail.html) on
 * one shared timeline per mount.
 *
 * Loop: Momo → Watch + iPhone (input screens) → heartbeat lines draw from the card edges,
 * behind the devices, into Momo → Momo closes its eyes while eight inputs orbit it → Momo opens
 * its eyes, the lines go, the inputs turn into eight outputs, the iPhone switches to the tracker
 * prototype and the Watch ties the calm from the voice note to the data → exit.
 *
 * Parts come from the case study: the DeviceInsights Watch (blue strap #96b6d4) and its bubble
 * screen, the voice reflection and tracker recordings (flows/*.mp4, clipped by flows/phone-mask.png),
 * and the listening (awake) and floating (asleep) Momo clips. Icons are Lucide.
 *
 * Every value comes from MOMO_THUMB_CONFIG (config.ts) through `apply(values)`.
 */
import {
  ShaderFitOptions,
  ShaderMount,
  getShaderColorFromString,
  meshGradientFragmentShader,
} from '@paper-design/shaders'
import { createElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { stackedAlpha } from '../../lib/stackedAlpha'
import { MomoMark } from '../momoIntro/MomoMark'
import { WATCH_LINES, watchLogoVars } from './config'
import './momoThumb.css'

const DEV = '/work/momo/devices'
const MOMO_IMG = `${DEV}/momo-open.webp`
const TITLE = 'Momo – Novel Multimodal AI Reflection System for Behavioral Change'
const STRAP = '#96b6d4' // case study tuning: dynamic.watch.strapColor
// Both recordings are 530 × 1080: the phone cropped to its own frame (flows/phone-mask.png fits both).
const VOICE = '/work/momo/flows/voice.mp4'
// The tracker variant taps "One free hour every morning" (reself-voice-prototypes tracker.html?tap=hour).
const TRACKER = '/work/momo/flows/tracker-hour.mp4'
// First frames (the tracker's at TRACKER_FROM), shown until each recording can play.
const VOICE_POSTER = '/work/momo/flows/voice.webp'
const TRACKER_POSTER = '/work/momo/flows/tracker-hour.webp'
const VOICE_RATIO = 1080 / 530
const VOICE_STILL = 6 // s: a frame with the transcript on screen, held when motion is off
// s: the tracker starts at its top — "Your Tracker", the September calendar with the 24th ringed —
// just before the tap. The phone stays where the voice recording was.
const TRACKER_FROM = 1
const WATCH = { w: 260, h: 414 }

/* Timeline (ms from loop start). p-sig, p-in, p-out and p-exit come from the timing values (applyTiming). */
const STEP_DEFAULTS = [
  ['p-momo', 150],
  ['p-dev', 950],
  ['p-sig', 1650],
  ['p-in', 3050], // inputs orbit
  ['p-out', 7200], // lines go, inputs become outputs, screens switch
  ['p-exit', 11400], // outputs start + their length
]
const EXIT_MS = 1200 // the devices leave and the pills go before the loop restarts
const PHASES = STEP_DEFAULTS.map(([c]) => c)
const STILL_STEP = PHASES.indexOf('p-in')
const OUT = PHASES.indexOf('p-out')
const STILL_HOLD = 2600 // ms after the pills arrive: orbit position held when motion is off
const ORBIT_MS = 30000 // one revolution
const DRAW_DELAY = 100 // ms; the .mt-hb-base transition delay
const MESH_SPEED = 1

/* ---------- Icons (Lucide) ---------- */

const ICONS = {
  heart: '<path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/>',
  footprints: '<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/><path d="M16 17h4"/><path d="M4 13h4"/>',
  activity: '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
  wind: '<path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/><path d="M9.8 4.4A2 2 0 1 1 11 8H2"/>',
  moon: '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>',
  thermometer: '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
  mic: '<path d="M12 19v3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><rect x="9" y="2" width="6" height="13" rx="3"/>',
  bookOpen: '<path d="M12 5v16"/><path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z"/>',
  bell: '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
  messageCircleHeart: '<path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/><path d="M7.828 13.07A3 3 0 0 1 12 8.764a3 3 0 0 1 5.004 2.224 3 3 0 0 1-.832 2.083l-3.447 3.62a1 1 0 0 1-1.45-.001z"/>',
  notebookPen: '<path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"/><path d="M2 6h4"/><path d="M2 10h4"/><path d="M2 14h4"/><path d="M2 18h4"/><path d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"/>',
  lightbulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  chartLine: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/>',
  listChecks: '<path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  calendarCheck: '<path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="m9 15 2 2 4-4"/>',
}
const icon = (name) => `<svg class="mt-ico" viewBox="0 0 24 24">${ICONS[name]}</svg>`

// What Momo takes in (Watch sensors, voice, journal) and what it gives back (case study system:
// timely nudges, check-ins, guided reflection, insights, patterns, if-then plans, weekly goals,
// the daily tracker). Paired by orbit slot.
const PAIRS = [
  [['heart', 'Heart rate'], ['bell', 'Nudge']],
  [['footprints', 'Movement'], ['messageCircleHeart', 'Check-in']],
  [['activity', 'HRV'], ['notebookPen', 'Reflection']],
  [['wind', 'Breathing'], ['lightbulb', 'Insights']],
  [['moon', 'Sleep'], ['chartLine', 'Patterns']],
  [['thermometer', 'Temperature'], ['listChecks', 'Plans']],
  [['mic', 'Voice'], ['target', 'Goals']],
  [['bookOpen', 'Journal'], ['calendarCheck', 'Tracking']],
]

/* ---------- Screens (DeviceInsights) ---------- */

// The Momo logo replaces the "Momo" app label: the case study's lockup (MomoWelcome) — its
// MomoMark (stroke widths tunable via --logo-outline / --logo-smile) and its wordmark image
// (hero/momo-type.png, used as a mask so it takes the colour). Scale, position, colour and
// strokes come from watchLogo.
// Rendered once, when this module loads (outside any React render), with react-dom/client — the
// page already ships it, unlike react-dom/server.
const MARK = (() => {
  const host = document.createElement('div')
  const root = createRoot(host)
  flushSync(() => root.render(createElement(MomoMark, { className: 'mc-logo__mark', color: 'currentColor' })))
  const html = host.innerHTML
  root.unmount()
  return html
})()
const head = `<span class="mc-logo" role="img" aria-label="Momo">${MARK}<span class="mc-logo__word"></span></span><span class="mc-time">9:41</span>`
// Input: "Momo noticed" (the signal list orbits Momo as pills).
const watchIn = `<div class="mc-w mc-w--center">${head}
  <div class="mc-momo"><img src="${MOMO_IMG}" alt="" /><span class="mc-heart">${icon('heart')}</span></div>
  <div class="mc-title">Momo noticed</div><div class="mt-ws-note">Checking in with you</div></div>`
// Output: a DeviceInsights bubble tying the calm from the voice note to the tracker's body data.
const watchOut = (line) => `<div class="mc-w mc-w--center">${head}<div class="mc-bubble">${line}</div><img class="mc-small" src="${MOMO_IMG}" alt="" /></div>`

/* ---------- Layouts (card px) ---------- */

// Base geometry per card. Positions, sizes and per-state offsets come from the values (setLayout);
// the heartbeat lines are derived from them (see `routes`).
// Phone: `w` drawn width, `top` its top edge (the same for both recordings).
// `route`: 'flat' runs one horizontal line edge to edge at Momo's height (desktop); 'corner'
// drops each line from the device's card edge, turns once, and runs horizontally into Momo.
// Momo's `states`: offset (card px) and scale per state, relative to `momo` x/y/s. Lines and pills
// stay anchored to the base position.
const momoStates = () => ({ awake: { x: 0, y: 0, s: 1 }, asleep: { x: 0, y: 0, s: 1 }, out: { x: 0, y: 0, s: 1 } })
const layouts = () => ({
  d: {
    W: 867, H: 493, k: 1.1, route: 'flat',
    momo: { x: 433.5, y: 246, s: 202, states: momoStates() },
    watch: { x: 84, y: 246, ds: 0.95 },
    phone: { x: 760, w: 255, top: -227 },
    orbit: { rx: 172, ry: 150, cs: 1, d: 1 }, // d: pill distance multiplier
    // dy: offset from Momo's centre (+ is down); left / right: where each line stops, from Momo's centre (× size)
    line: { dy: 0, left: 0.34, right: 0.34 },
  },
  // Phone top left, Watch bottom right, so the "Momo" title has its corner free.
  m: {
    W: 360, H: 482, k: 0.6, route: 'corner',
    momo: { x: 180, y: 236, s: 116, states: momoStates() },
    watch: { x: 320, y: 410, ds: 0.55 }, // top edge ≈ 296, so the line's corner at y 236 shows above it
    phone: { x: 55, w: 150, top: -160 },
    orbit: { rx: 104, ry: 124, cs: 0.78, d: 1 },
    line: { dy: 0, left: 0.34, right: 0.34 },
  },
})

// Values → a layout (card px). State keys: value `output` is the `out` state.
const setLayout = (L, v) => {
  Object.assign(L.watch, { x: v.watch.x, y: v.watch.y, ds: v.watch.scale })
  Object.assign(L.phone, { x: v.phone.x, top: v.phone.top, w: v.phone.width })
  Object.assign(L.momo, { y: v.momo.y, s: v.momo.size })
  Object.assign(L.line, { dy: v.momo.lineY, left: v.momo.lineEndLeft, right: v.momo.lineEndRight })
  L.orbit.d = v.momo.pillDistance
  for (const [dial, key] of [['awake', 'awake'], ['asleep', 'asleep'], ['output', 'out']]) {
    const st = v.states[dial]
    Object.assign(L.momo.states[key], { x: st.x, y: st.y, s: st.scale })
  }
}

/* ---------- Heartbeat lines ---------- */

// The case study's ECG beat (DeviceInsights TRACE), centred on cx. SVG y grows downward.
const BEAT = [[0, 0], [5, -26], [12, 28], [18, -10], [23, 0]]
const R = 16 // corner radius

// Two polylines that run into Momo, each with one heartbeat in the gap before it. They stop at
// Momo's edge (line.left / line.right × size from its centre), since Momo is translucent and a
// line through it would show. `role` says which device the line comes from; the two are timed so
// their tips reach Momo together.
const routes = (L) => {
  const { W, H, momo: Mo, watch: w, phone: p } = L
  const y = Mo.y + L.line.dy
  const momoL = Mo.x - Mo.s * L.line.left
  const momoR = Mo.x + Mo.s * L.line.right
  if (L.route === 'flat') {
    const watchR = w.x + (WATCH.w * w.ds) / 2
    const phoneL = p.x - p.w / 2
    return [
      { role: 'watch', pts: [[0, y], [momoL, y]], beat: (watchR + momoL) / 2 },
      { role: 'phone', pts: [[W, y], [momoR, y]], beat: (phoneL + momoR) / 2 },
    ]
  }
  return [
    { role: 'phone', pts: [[p.x, 0], [p.x, y], [momoL, y]], beat: (p.x + R + momoL) / 2 },
    { role: 'watch', pts: [[w.x, H], [w.x, y], [momoR, y]], beat: (w.x - R + momoR) / 2 },
  ]
}

const f = (n) => n.toFixed(1)
const linePath = ({ pts, beat }, k) => {
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i]
    const [px, py] = pts[i - 1]
    if (i < pts.length - 1) {
      // Round the corner: stop R short, curve through the vertex, carry on R past it.
      const [nx, ny] = pts[i + 1]
      const ux = Math.sign(x - px), uy = Math.sign(y - py)
      const vx = Math.sign(nx - x), vy = Math.sign(ny - y)
      d += ` L${f(x - ux * R)} ${f(y - uy * R)} Q${f(x)} ${f(y)} ${f(x + vx * R)} ${f(y + vy * R)}`
      continue
    }
    // Last (horizontal) segment carries the beat, in travel order.
    const b = BEAT.map(([dx, dy]) => [beat + (dx - 11.5) * k, y + dy * k])
    for (const [bx, by] of x > px ? b : b.reverse()) d += ` L${f(bx)} ${f(by)}`
    d += ` L${f(x)} ${f(y)}`
  }
  return d
}

// The line's draw easing is cubic-bezier(0.45, 0, 0.25, 1); returns the time fraction at which the
// drawn length reaches `p`.
const drawTime = (p) => {
  let lo = 0
  let hi = 1
  for (let i = 0; i < 30; i++) {
    const u = (lo + hi) / 2
    if (3 * (1 - u) * u * u + u ** 3 < p) lo = u
    else hi = u
  }
  const u = (lo + hi) / 2
  return 3 * (1 - u) ** 2 * u * 0.45 + 3 * (1 - u) * u * u * 0.25 + u ** 3
}

/* ---------- Scene ---------- */

/**
 * One card's markup. `chrome` adds the card's own mesh, shade and title (the studio); the site's
 * Selected Works card brings its own.
 */
export function sceneHTML(key, { chrome = true } = {}) {
  const { W, H, momo: Mo, watch: w, phone: p, orbit: o } = layouts()[key]
  const ww = WATCH.w * w.ds
  const wh = WATCH.h * w.ds
  const ph = p.w * VOICE_RATIO
  const pill = ([i, t]) => `${icon(i)}<span data-ty="${t}">${t}</span>`

  // Device and line positions are filled in by place().
  return `<div class="mt-card mt-card--${key}" data-layout="${key}" data-w="${W}">
    ${chrome ? '<div class="mt-mesh"></div>' : ''}
    <div class="mt-stage" style="width:${W}px;height:${H}px">
      <svg class="mt-hb" viewBox="0 0 ${W} ${H}" style="width:${W}px;height:${H}px">${'<path class="mt-hb-base" pathLength="100"/><path class="mt-hb-live" pathLength="100"/>'.repeat(2)}</svg>
      <div class="mt-el" data-el="phone">
        <div class="mt-phone" style="left:${-p.w / 2}px;top:${-ph / 2}px;width:${p.w}px;height:${ph}px">
          <video class="mt-pv mt-scr-in" src="${VOICE}" poster="${VOICE_POSTER}" muted loop playsinline preload="auto" aria-hidden="true"></video>
          <video class="mt-pv mt-pv--out mt-scr-out" src="${TRACKER}" poster="${TRACKER_POSTER}" muted playsinline preload="auto" aria-hidden="true"></video>
        </div>
      </div>
      <div class="mt-el" data-el="watch">
        <div class="mt-dev" style="left:${-ww / 2}px;top:${-wh / 2}px;scale:${w.ds}">
          <div class="mc-watch" style="--mc-watch-strap:${STRAP}"><div class="mc-watch__screen"><div class="mt-scr-in">${watchIn}</div><div class="mt-out mt-scr-out" data-out="watch"></div></div><img class="mc-watch__img" src="${DEV}/watch-starlight.png" alt="" /></div>
        </div>
      </div>
      <div class="mt-el" data-el="momo" style="left:${Mo.x}px;top:${Mo.y}px">
        <div class="mt-momo" style="left:${-Mo.s / 2}px;top:${-Mo.s / 2}px;width:${Mo.s}px;height:${Mo.s}px"><canvas class="mt-face mt-face--awake"></canvas><canvas class="mt-face mt-face--asleep"></canvas></div>
      </div>
      <div class="mt-orbit" style="left:${Mo.x}px;top:${Mo.y}px;--cs:${o.cs}">${PAIRS.map(
        ([a, b], n) => `<span class="mt-pill" style="--i:${n}"><span class="mt-pill__in">${pill(a)}</span><span class="mt-pill__out">${pill(b)}</span></span>`,
      ).join('')}</div>
      ${chrome ? `<div class="mt-shade"></div><p class="mt-title">${key === 'd' ? TITLE : 'Momo'}</p>` : ''}
    </div>
  </div>`
}

/* ---------- Mount ---------- */

/**
 * Runs the thumbnail on `cards` (built from sceneHTML, inside `root`). `root` carries the shared
 * state attributes (data-motion, data-paused, data-momo-fx, data-font) and CSS variables.
 * `mesh` mounts each card's own mesh (studio); `keys` adds Space to pause (studio).
 */
export function mountMomoThumb({ root, cards, mesh = false, keys = false }) {
  const LAYOUTS = layouts()
  const STEPS = STEP_DEFAULTS.map(([c, t]) => [c, t])
  let LOOP = 12600
  const at = (phase) => STEPS.find(([c]) => c === phase)[1]

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  let motion = !reduced
  // Pause freezes the loop where it is (timeline, videos, mesh, CSS animations); motion off instead
  // holds a designed still frame.
  let paused = false
  let pausedAt = 0
  const visible = new Set()
  const running = () => motion && !paused && visible.size > 0 && !document.hidden
  // The timeline clock: stops while paused.
  const clock = (now) => (paused ? pausedAt : now)
  let watchLine = WATCH_LINES[0]

  /* ---------- Momo timing: both lines land together; Momo sleeps and wakes on its own cues ---------- */

  // lines: when the Watch line starts drawing (the phone line is timed to reach Momo at the same
  // moment); pills: when the input pills arrive; sleep / wake: when Momo closes and reopens its
  // eyes; out / outLen: when the outputs start and how long they hold (all loop ms).
  // draw/close/open are durations (ms); fx is the preset.
  const timing = { lines: 1050, pills: 2200, sleep: 1950, wake: 7200, out: 7200, outLen: 4200, draw: 1300, close: 700, open: 700, fx: 'bounce' }
  const applyTiming = () => {
    const s = root.style
    // Keep the phases in order: devices → lines → pills → outputs → exit.
    const step = (c) => STEPS.find(([p]) => p === c)
    step('p-out')[1] = Math.max(timing.out, at('p-dev') + 300)
    step('p-exit')[1] = at('p-out') + timing.outLen
    LOOP = at('p-exit') + EXIT_MS
    step('p-sig')[1] = Math.min(Math.max(timing.lines, at('p-dev')), at('p-out') - 200)
    step('p-in')[1] = Math.min(Math.max(timing.pills, at('p-sig')), at('p-out') - 100)
    s.setProperty('--draw', `${timing.draw}ms`)
    s.setProperty('--t-close', `${timing.close}ms`)
    s.setProperty('--t-open', `${timing.open}ms`)
    root.dataset.momoFx = timing.fx
  }
  applyTiming()

  // Per card: loop time (ms) at which each line starts drawing, and at which both reach Momo.
  const lineAt = new Map()
  const landAt = new Map()
  const measureTouch = (card) => {
    const { momo: Mo } = LAYOUTS[card.dataset.layout]
    // Momo's cloud outline, roughly (an ellipse inside its square frame).
    const rx = Mo.s * 0.42
    const ry = Mo.s * 0.32
    // Time from a line's start until its tip first enters Momo.
    const reach = (role) => {
      const path = card.querySelector(`.mt-hb-base[data-role="${role}"]`)
      const len = path.getTotalLength()
      let first = 1
      for (let d = 0; d <= len; d += 1) {
        const { x, y } = path.getPointAtLength(d)
        if (((x - Mo.x) / rx) ** 2 + ((y - Mo.y) / ry) ** 2 <= 1) {
          first = d / len
          break
        }
      }
      return DRAW_DELAY + timing.draw * drawTime(first)
    }
    const watch = reach('watch')
    const phone = reach('phone')
    // Both tips reach Momo together: when the Watch line, started on cue, gets there — unless the
    // phone line, which can't start before the phone arrives, needs longer.
    const land = Math.max(at('p-sig') + watch, at('p-dev') + phone)
    lineAt.set(card, { watch: land - watch, phone: land - phone })
    landAt.set(card, land)
  }
  const retime = () => {
    applyTiming()
    cards.forEach(measureTouch)
  }

  // Applies the layout's current positions and sizes, redraws the lines to match, and re-measures
  // when they first touch Momo.
  const place = (card) => {
    const L = LAYOUTS[card.dataset.layout]
    const { phone: p, watch: w, momo: Mo } = L
    const ph = p.w * VOICE_RATIO
    Object.assign(card.querySelector('[data-el="phone"]').style, { left: `${p.x}px`, top: `${p.top + ph / 2}px` })
    Object.assign(card.querySelector('.mt-phone').style, { left: `${-p.w / 2}px`, top: `${-ph / 2}px`, width: `${p.w}px`, height: `${ph}px` })
    Object.assign(card.querySelector('[data-el="watch"]').style, { left: `${w.x}px`, top: `${w.y}px` })
    Object.assign(card.querySelector('.mt-dev').style, { left: `${(-WATCH.w * w.ds) / 2}px`, top: `${(-WATCH.h * w.ds) / 2}px`, scale: String(w.ds) })
    Object.assign(card.querySelector('.mt-momo').style, { left: `${-Mo.s / 2}px`, top: `${-Mo.s / 2}px`, width: `${Mo.s}px`, height: `${Mo.s}px` })
    // Momo and its pill orbit share one centre.
    for (const el of card.querySelectorAll('[data-el="momo"], .mt-orbit')) Object.assign(el.style, { left: `${Mo.x}px`, top: `${Mo.y}px` })
    const paths = card.querySelectorAll('.mt-hb path')
    routes(L).forEach((r, i) => {
      const d = linePath(r, L.k)
      for (const path of [paths[i * 2], paths[i * 2 + 1]]) {
        path.setAttribute('d', d)
        path.dataset.role = r.role
      }
    })
    for (const [k, pre] of [['awake', 'aw'], ['asleep', 'sl'], ['out', 'ou']]) {
      const st = Mo.states[k]
      card.style.setProperty(`--${pre}-x`, `${st.x}px`)
      card.style.setProperty(`--${pre}-y`, `${st.y}px`)
      card.style.setProperty(`--${pre}-s`, String(st.s))
    }
    measureTouch(card)
  }
  cards.forEach(place)

  /* ---------- Pill text: per-label vertical nudge inside its pill ---------- */

  const applyPillText = (nudges, textY) => {
    for (const [label, y] of Object.entries(nudges))
      for (const el of root.querySelectorAll(`span[data-ty="${CSS.escape(label)}"]`)) el.style.top = `${y + textY}px`
  }

  const play = (video) => void video.play().catch(() => {})
  const pause = (video) => video.pause()

  /* ---------- Mesh: the live card's shader, mounted only while on screen (studio) ---------- */

  const meshUniforms = {
    u_colors: ['#E9EEF8', '#CBEFFE', '#53BFFE', '#00D0FF'].map((col) => getShaderColorFromString(col)),
    u_colorsCount: 4,
    u_distortion: 0.8,
    u_swirl: 0.1,
    u_grainMixer: 0,
    u_grainOverlay: 0,
    u_fit: ShaderFitOptions.contain,
    u_scale: 1,
    u_rotation: 0,
    u_offsetX: 0,
    u_offsetY: 0,
    u_originX: 0.5,
    u_originY: 0.5,
    u_worldWidth: 0,
    u_worldHeight: 0,
  }
  const meshes = new Map()
  const mountMesh = (card) => {
    if (!mesh || meshes.has(card)) return
    meshes.set(card, new ShaderMount(card.querySelector('.mt-mesh'), meshGradientFragmentShader, meshUniforms, undefined, running() ? MESH_SPEED : 0, 2_738_590, 1))
  }
  const unmountMesh = (card) => {
    const m = meshes.get(card)
    if (!m) return
    m.dispose()
    card.querySelector('.mt-mesh').replaceChildren()
    meshes.delete(card)
  }

  /* ---------- Momo: awake (listening) and asleep (floating) clips ---------- */

  const clip = (name) => {
    const video = Object.assign(document.createElement('video'), { src: `/work/momo/${name}.mp4`, muted: true, loop: true, playsInline: true, preload: 'auto' })
    video.setAttribute('aria-hidden', 'true')
    video.className = 'mt-src'
    root.append(video)
    const canvas = document.createElement('canvas')
    const stop = stackedAlpha(video, canvas)
    return { video, canvas, stop }
  }
  const awake = clip('momo-listening')
  const asleep = clip('momo-floating')
  const momos = cards.map((card) => ({
    card,
    pairs: [
      [card.querySelector('.mt-face--awake'), awake.canvas, awake.video],
      [card.querySelector('.mt-face--asleep'), asleep.canvas, asleep.video],
    ].map(([el, src, video]) => ({ el, ctx: el.getContext('2d'), src, video, lastFrame: -1, width: 0, height: 0 })),
  }))
  const drawMomo = () => {
    for (const { card, pairs } of momos) {
      if (!visible.has(card)) continue
      for (const pair of pairs) {
        const { el, ctx, src, video } = pair
        if (!src.width || video.readyState < 2) continue
        // A 120Hz display need not copy the same decoded video frame twice.
        const decodedFrame = video.getVideoPlaybackQuality?.().totalVideoFrames ?? video.currentTime
        if (pair.lastFrame === decodedFrame && pair.width === el.width && pair.height === el.height) continue
        pair.lastFrame = decodedFrame
        pair.width = el.width
        pair.height = el.height
        ctx.clearRect(0, 0, el.width, el.height)
        ctx.drawImage(src, 0, 0, el.width, el.height)
      }
    }
  }

  /* ---------- Devices: the voice recording and the output screens ---------- */

  const parts = new Map(
    cards.map((card) => [card, { video: card.querySelector('.mt-pv'), tracker: card.querySelector('.mt-pv--out'), watch: card.querySelector('[data-out="watch"]') }]),
  )
  for (const { video, tracker } of parts.values()) video.muted = tracker.muted = true
  const media = () => {
    for (const { video } of [awake, asleep]) (running() && visible.size ? play : pause)(video)
    for (const [card, { video, tracker }] of parts) {
      const on = running() && visible.has(card)
      ;(on ? play : pause)(video)
      ;(on && card.classList.contains('p-out') ? play : pause)(tracker)
    }
  }
  const mountOutputs = (card, on) => {
    const { watch, tracker } = parts.get(card)
    watch.innerHTML = on ? watchOut(watchLine) : ''
    tracker.currentTime = TRACKER_FROM
    if (on && running() && visible.has(card)) play(tracker)
    else tracker.pause()
  }

  /* ---------- Orbit ---------- */

  const ease = (x) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3
  // Radii are read every frame so the pill-distance value applies immediately.
  const orbits = cards.map((card) => ({ card, o: LAYOUTS[card.dataset.layout].orbit, pills: [...card.querySelectorAll('.mt-pill')] }))
  // Each pill is only as wide as the label it shows; the width animates when the label swaps.
  const sizePills = () => {
    for (const el of root.querySelectorAll('.mt-pill')) {
      el.style.removeProperty('--w-in')
      el.style.removeProperty('--w-out')
      const [a, b] = el.children
      const pad = el.offsetWidth - Math.max(a.offsetWidth, b.offsetWidth)
      el.style.setProperty('--w-in', `${a.offsetWidth + pad}px`)
      el.style.setProperty('--w-out', `${b.offsetWidth + pad}px`)
    }
  }
  sizePills()
  document.fonts.ready.then(() => !destroyed && sizePills())
  // t: ms since loop start. Inputs arrive from further out and settle on the ring.
  const drawOrbit = (t) => {
    const spin = (t / ORBIT_MS) * Math.PI * 2
    const reach = 1 + 0.45 * (1 - ease((t - at('p-in')) / 1400))
    for (const { card, o, pills } of orbits) {
      if (!visible.has(card)) continue
      const rx = o.rx * o.d * reach
      const ry = o.ry * o.d * reach
      pills.forEach((el, i) => {
        const a = spin + (i / pills.length) * Math.PI * 2 - Math.PI / 2
        el.style.transform = `translate(${(Math.cos(a) * rx).toFixed(1)}px, ${(Math.sin(a) * ry).toFixed(1)}px) translate(-50%, -50%)`
      })
    }
  }

  /* ---------- Timeline: shared by every card in this mount ---------- */

  const row = { start: 0, step: -2 }
  const apply = (step) => {
    row.step = step
    for (const card of cards) {
      card.classList.remove(...PHASES)
      if (step === PHASES.length - 1) card.classList.add('p-exit')
      else if (step >= 0) card.classList.add(...PHASES.slice(0, step + 1))
      // The recording starts as the phone arrives, so its transcript always opens at the top.
      if (PHASES[step] === 'p-dev') parts.get(card).video.currentTime = 0
      if (PHASES[step] === 'p-out') mountOutputs(card, true)
      if (step < 0) mountOutputs(card, false)
    }
  }
  const restart = (now) => {
    row.start = clock(now)
    apply(-1)
    for (const card of cards) card.classList.remove('p-line-watch', 'p-line-phone', 'p-lines-in', 'p-sleep')
  }
  const advance = (now) => {
    if (!visible.size) return
    const t = (now - row.start) % LOOP
    let step = -1
    for (let i = 0; i < STEPS.length; i++) if (t >= STEPS[i][1]) step = i
    if (step !== row.step) apply(step)
    // Each line draws from its own start so both reach Momo together. Momo sleeps from Sleep Start
    // until Wake Start (and is awake again by the exit at the latest).
    for (const card of cards) {
      const l = lineAt.get(card)
      card.classList.toggle('p-line-watch', t >= l.watch)
      card.classList.toggle('p-line-phone', t >= l.phone)
      card.classList.toggle('p-lines-in', t >= landAt.get(card))
      card.classList.toggle('p-sleep', t >= timing.sleep && t < Math.min(timing.wake, at('p-exit')))
    }
  }
  // Motion off / reduced motion: hold the input frame (eyes closed, inputs on the ring).
  const still = () => {
    row.step = STILL_STEP
    for (const card of cards) {
      card.classList.remove(...PHASES)
      card.classList.add(...PHASES.slice(0, STILL_STEP + 1), 'p-sleep', 'p-line-watch', 'p-line-phone', 'p-lines-in')
      mountOutputs(card, false)
      const { video } = parts.get(card)
      video.pause()
      video.currentTime = VOICE_STILL
    }
  }

  /* ---------- Sizing ---------- */

  const sizeAll = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2)
    for (const card of cards) {
      const z = card.clientWidth / +card.dataset.w
      card.style.setProperty('--z', String(z))
      for (const el of card.querySelectorAll('canvas.mt-face')) {
        const w = Math.round(el.offsetWidth * z * dpr)
        const h = Math.round(el.offsetHeight * z * dpr)
        if (el.width !== w || el.height !== h) Object.assign(el, { width: w, height: h })
      }
    }
  }

  /* ---------- Loop ---------- */

  // While paused, CSS animations and transitions on the cards are held mid-flight too.
  const freezeCss = () => cards.forEach((c) => c.getAnimations({ subtree: true }).forEach((a) => a.pause()))
  const render = (now) => {
    const n = clock(now)
    if (motion && !paused) advance(n)
    drawOrbit(motion ? (n - row.start) % LOOP : at('p-in') + STILL_HOLD)
    drawMomo()
    if (paused) freezeCss()
  }
  let frame = 0
  let destroyed = false
  const loop = (now) => {
    render(now)
    frame = running() && !destroyed ? requestAnimationFrame(loop) : 0
  }
  const start = () => {
    if (!frame && running() && !destroyed) frame = requestAnimationFrame(loop)
  }

  const io = new IntersectionObserver(
    (entries) => {
      const now = performance.now()
      const wasOn = visible.size > 0
      for (const e of entries) {
        if (e.isIntersecting) {
          visible.add(e.target)
          mountMesh(e.target)
        } else {
          visible.delete(e.target)
          unmountMesh(e.target)
        }
      }
      // Start from the top whenever the thumbnail scrolls back into view.
      if (!wasOn && visible.size) motion ? restart(now) : still()
      media()
      render(now)
      start()
    },
    { rootMargin: '120px 0px' },
  )
  cards.forEach((c) => io.observe(c))
  const onVisibility = () => {
    media()
    meshes.forEach((m) => m.setSpeed(running() ? MESH_SPEED : 0))
    if (running()) start()
    else { cancelAnimationFrame(frame); frame = 0 }
  }
  document.addEventListener('visibilitychange', onVisibility)
  const onClip = () => render(performance.now())
  for (const { video } of [awake, asleep]) video.addEventListener('loadeddata', onClip)
  const ro = new ResizeObserver(() => {
    sizeAll()
    render(performance.now())
  })
  cards.forEach((c) => ro.observe(c))

  /* ---------- Controls ---------- */

  const setPaused = (on) => {
    const now = performance.now()
    if (on === paused || (on && !motion)) return
    if (on) pausedAt = now
    else row.start += now - pausedAt // resume where it stopped
    paused = on
    root.dataset.paused = String(on)
    meshes.forEach((m) => m.setSpeed(running() ? MESH_SPEED : 0))
    if (on) {
      cancelAnimationFrame(frame)
      frame = 0
      freezeCss()
    } else cards.forEach((c) => c.getAnimations({ subtree: true }).forEach((a) => a.play()))
    media()
    render(now)
    start()
  }
  // Space toggles pause (except while typing in a control).
  const onKey = (e) => {
    if (e.code !== 'Space' || (e.target instanceof Element && e.target.closest('input, select, button, textarea, [contenteditable]'))) return
    e.preventDefault()
    setPaused(!paused)
  }
  if (keys) addEventListener('keydown', onKey)
  const replay = () => {
    setPaused(false)
    motion ? restart(performance.now()) : still()
  }
  const syncMotion = () => {
    setPaused(false)
    root.dataset.motion = motion ? 'on' : 'off'
    meshes.forEach((m) => m.setSpeed(motion ? MESH_SPEED : 0))
    const now = performance.now()
    motion ? restart(now) : still()
    media()
    render(now)
    start()
  }
  syncMotion()

  // The pills and Watch screens share one family; pills are re-measured for the new labels.
  const applyFont = (font) => {
    root.dataset.font = font
    // Wait a frame so the new family is requested before fonts.ready settles.
    requestAnimationFrame(() => document.fonts.ready.then(() => !destroyed && sizePills()))
  }

  // A new Watch line is shown straight away by jumping to the output phase.
  const showWatchLine = (line) => {
    watchLine = line
    for (const { watch } of parts.values()) {
      const bubble = watch.querySelector('.mc-bubble')
      if (bubble) bubble.textContent = line
    }
    if (row.step === OUT) return
    if (motion) {
      row.start = clock(performance.now()) - at('p-out')
      if (paused) render(performance.now()) // show the output frame while held
    } else apply(OUT) // motion off: hold the output frame instead of the input frame
  }

  // Each Momo state, and the heartbeat lines, are only on screen for part of the loop, so moving one
  // of their values jumps the loop to a moment that shows it (awake: the loop's start; asleep: just
  // after Sleep Start; lines: just after both lines are in; out: the outputs).
  const showState = (key) => {
    const linesIn = Math.min(Math.max(...landAt.values()) + 600, at('p-out') - 300)
    const t = { awake: at('p-momo'), asleep: timing.sleep + 900, lines: linesIn, out: at('p-out') + 900 }[key]
    const now = performance.now()
    if (motion) {
      row.start = clock(now) - t
      if (paused) advance(clock(now)) // render() doesn't advance while held
    } else if (key === 'asleep' || key === 'lines') still()
    else {
      apply(key === 'out' ? OUT : PHASES.indexOf('p-dev'))
      for (const card of cards) card.classList.remove('p-sleep', 'p-line-watch', 'p-line-phone', 'p-lines-in')
    }
    render(now)
  }

  let prev = null
  const applyValues = (v) => {
    const first = !prev
    const changed = (pick) => first || JSON.stringify(pick(v)) !== JSON.stringify(pick(prev))
    // Reduced-motion users start still, whatever the saved value says; the toggle still works after.
    const wantMotion = first ? v.motion && !reduced : v.motion
    if (wantMotion !== motion) {
      motion = wantMotion
      syncMotion()
    }
    if (changed((d) => d.copy.font)) applyFont(v.copy.font)
    if (changed((d) => d.copy.watchText)) {
      if (first) watchLine = v.copy.watchText
      else showWatchLine(v.copy.watchText)
    }
    if (changed((d) => [d.desktop, d.mobile])) {
      setLayout(LAYOUTS.d, v.desktop)
      setLayout(LAYOUTS.m, v.mobile)
      cards.forEach(place)
      sizeAll()
      render(performance.now())
      if (!first) {
        const states = (d) => [d.desktop.states, d.mobile.states]
        const hit = ['awake', 'asleep', 'output'].find((k) => JSON.stringify(states(v).map((s) => s[k])) !== JSON.stringify(states(prev).map((s) => s[k])))
        const line = (d) => [d.desktop, d.mobile].map((l) => [l.momo.lineY, l.momo.lineEndLeft, l.momo.lineEndRight])
        if (hit) showState(hit === 'output' ? 'out' : hit)
        else if (JSON.stringify(line(v)) !== JSON.stringify(line(prev))) showState('lines')
      }
    }
    if (changed((d) => d.timing)) {
      const t = v.timing
      Object.assign(timing, {
        lines: t.watchLineStart, pills: t.pillsArrive, sleep: t.sleepStart, wake: t.wakeStart,
        out: t.outputsStart, outLen: t.outputsLength,
        draw: t.lineDraw, close: t.closeDuration, open: t.openDuration, fx: t.transition,
      })
      retime()
      // Play the new timing from the top (not on load: syncMotion already started the loop).
      if (!first && motion) restart(performance.now())
    }
    if (changed((d) => d.pillText)) {
      applyPillText({ ...v.pillText.inputs, ...v.pillText.outputs }, v.pillText.textY)
      root.style.setProperty('--pill-icon-y', `${v.pillText.iconY}px`)
    }
    if (changed((d) => d.watchLogo)) {
      for (const [name, value] of Object.entries(watchLogoVars(v.watchLogo))) root.style.setProperty(name, value)
    }
    prev = v
  }

  return {
    apply: applyValues,
    replay,
    togglePause: () => setPaused(!paused),
    destroy() {
      destroyed = true
      cancelAnimationFrame(frame)
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      ro.disconnect()
      if (keys) removeEventListener('keydown', onKey)
      cards.forEach(unmountMesh)
      for (const { video, stop } of [awake, asleep]) {
        video.removeEventListener('loadeddata', onClip)
        stop?.()
        video.pause()
        video.removeAttribute('src')
        video.load()
        video.remove()
      }
      for (const { video, tracker } of parts.values()) for (const v of [video, tracker]) v.pause()
    },
  }
}
