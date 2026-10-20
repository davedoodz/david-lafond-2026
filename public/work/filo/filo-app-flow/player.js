/* Shared by the Filo prototypes (the portal windows and the phone): fitting the stage, the scripted
   cursor, the address bar, and playback. Opened on its own, a prototype plays and loops. Embedded (the
   Filo case study), the host page drives it, Momo-style: it posts { filoAppFlow: 'play' | 'pause' | 'restart' }
   and gets { filoAppFlow: 'ready' } once the type has loaded, so it can send its current state. */
export const $ = (s, r = document) => r.querySelector(s)
export const $$ = (s, r = document) => [...r.querySelectorAll(s)]
export const k = name => $(`[data-k="${name}"]`)
export const stage = $('#stage'), cursor = $('#cursor')
/* The stage's CSS size is the prototype's source size: 1536 × 1024 for the portal (app.css), the phone's own on its page. */
export const W = stage.offsetWidth, H = stage.offsetHeight
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

/* Fill the frame with the stage. A stage marked data-fit="height" fills the frame's height instead and
   centres across it, so a wide scene keeps its middle and crops its sides in a narrow frame. */
let scale = 1
const byHeight = stage.dataset.fit === 'height'
function fit() {
  scale = byHeight ? innerHeight / H : Math.min(innerWidth / W, innerHeight / H)
  stage.style.scale = scale
  if (byHeight) stage.style.left = `${(innerWidth - W * scale) / 2}px`
}
addEventListener('resize', fit); fit()

/* ── Timing: every wait checks the run token, so a jump or pause stops the script cleanly. ── */
let token = 0, paused = false
/* Speed (the host's { filoAppFlow: 'speed', rate }): waits count down at `rate`, and every animation in the
   document, scripted or CSS, plays at it. New animations are caught on the next frame. */
let rate = 1
const keepRate = () => {
  document.getAnimations().forEach(a => { if (a.playbackRate !== rate) a.playbackRate = rate })
  if (rate !== 1) requestAnimationFrame(keepRate)
}
function setRate(next) {
  const was = rate
  rate = Number.isFinite(next) && next > 0 ? next : 1
  // Back to 1: one pass resets everything and the loop ends. Away from 1: start the loop once.
  if (rate === 1 || was === 1) keepRate()
}
export class Stop extends Error {}
/** How fast scripted time runs right now: 0 while paused, else the host's rate. Frame loops multiply their
    elapsed ms by it, so tweens keep pace with sleeps and animations at any speed. */
export const playRate = () => (paused ? 0 : rate)
export const sleep = (ms, t) => new Promise((ok, no) => {
  let left = ms, last = performance.now()
  // performance.now(), not rAF's timestamp: in an iframe Chrome's rAF time can trail it by seconds.
  const tick = () => {
    const now = performance.now()
    if (t !== token) return no(new Stop())
    if (!paused) left -= (now - last) * rate
    last = now
    left <= 0 ? ok() : requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})

/* ── Cursor: weightless ──
   Each move floats along a soft arc: it eases in and settles out with no momentum carried over, no
   overshoot, no correction. The arc bows a little to one side (usually the wrist's side) and its length
   and timing vary slightly, so no two moves look plotted. Between actions the cursor stays exactly where
   it is. While pressed (a drag) the path is straight, so the finger stays on the content it pulls. */
const HOME = [W / 2, H + 96]
let cx = HOME[0], cy = HOME[1]
export const place = (x, y) => { cx = x; cy = y; draw(x, y) }
function draw(x, y) { cursor.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px` }
place(cx, cy)
/** Centre of an element (or a point inside it, as fractions) in window px. */
export function at(el, fx = .5, fy = .5) {
  const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect()
  return [(r.left - s.left + r.width * fx) / scale, (r.top - s.top + r.height * fy) / scale]
}
/* Soft in, softer out: ease-in-out sine with its landing stretched a little, so it settles rather than stops. */
const floatEase = p => { const s = .5 - .5 * Math.cos(Math.PI * p); return .7 * s + .3 * (1 - (1 - p) ** 3) }
const dragEase = p => p < .5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2
const vary = (spread) => 1 + (Math.random() - .5) * 2 * spread
/** A move's natural duration over `d` px. */
const naturalMs = d => Math.min(1100, 380 + d * .55)
/** Where the cursor is now. */
export const here = () => [cx, cy]
/** Moves the cursor to `to`: a point, or a function returning one each frame (a target still settling). */
export async function move(t, to, ms) {
  const end = typeof to === 'function' ? to : () => to
  let [x, y] = end()
  const sx = cx, sy = cy, dx = x - sx, dy = y - sy, d = Math.hypot(dx, dy)
  ms ??= naturalMs(d) * vary(.08)
  const down = cursor.classList.contains('is-down')
  // Bow 4–9% of the distance (up to 60px), usually to the wrist's side; drags stay straight.
  const side = (dx >= 0 ? -1 : 1) * (Math.random() < .75 ? 1 : -1)
  const bow = down || d < 1 ? 0 : Math.min(60, d * (.04 + Math.random() * .05)) * side
  const nx = -dy / (d || 1) * bow, ny = dx / (d || 1) * bow
  const c1x = sx + dx * .33 + nx, c1y = sy + dy * .33 + ny
  const c2x = sx + dx * .72 + nx * .6, c2y = sy + dy * .72 + ny * .6
  const ease = down ? dragEase : floatEase
  let e = 0, last = performance.now()
  while (e < ms) {
    await sleep(0, t)
    const now = performance.now()
    e += Math.min(50, now - last) * playRate(); last = now
    ;[x, y] = end()
    const p = ease(Math.min(1, e / ms)), q = 1 - p
    cx = q * q * q * sx + 3 * q * q * p * c1x + 3 * q * p * p * c2x + p * p * p * x
    cy = q * q * q * sy + 3 * q * q * p * c1y + 3 * q * p * p * c2y + p * p * p * y
    draw(cx, cy)
  }
  place(x, y)
}
/**
 * Anticipation: instead of waiting `wait` ms and then setting off, the cursor drifts to `to` across
 * most of the wait (slower and longer than a plain move) and arrives as it ends, so it never sits
 * still for long and is already on the next target when it is time to act. Total time stays `wait`
 * (or the natural move time, if longer).
 */
export async function reach(t, to, wait) {
  const [x, y] = typeof to === 'function' ? to() : to
  const d = Math.hypot(x - cx, y - cy)
  if (d < 1) return sleep(wait, t)
  const ms = Math.min(2400, Math.max(naturalMs(d), wait * .8))
  await sleep(Math.max(0, wait - ms), t)
  await move(t, to, ms)
}
let hovered = []
export function hover(...els) { hovered.forEach(e => e.classList.remove('is-hover')); hovered = els.filter(Boolean); hovered.forEach(e => e.classList.add('is-hover')) }
export async function click(t, el) {
  cursor.classList.add('is-down'); el?.classList.add('is-press')
  await sleep(100, t)
  const ring = document.createElement('div'); ring.className = 'ring'; ring.style.translate = `${cx}px ${cy}px`
  stage.append(ring); ring.addEventListener('animationend', () => ring.remove())
  cursor.classList.remove('is-down'); el?.classList.remove('is-press')
  await sleep(50, t)
}
/** Types `text` into `el` one character at a time, with a blinking caret at the end. */
export async function type(t, el, text, ms = 38) {
  const caret = document.createElement('i'); caret.className = 'caret'
  el.textContent = ''; el.append(caret)
  for (const ch of text) { caret.before(ch); await sleep(ms, t) }
  return caret
}

/* ── Address bar: the domain in ink, the path in grey. A change fades the text and runs a load line. ── */
const urlText = $('.urlbar .url'), urlLoad = $('.urlbar .load')
let url = ''
export function setUrl(next, animate = true) {
  if (next === url) return
  url = next
  const show = () => { const i = next.indexOf('/'); urlText.innerHTML = i < 0 ? `<b>${next}</b>` : `<b>${next.slice(0, i)}</b>${next.slice(i)}` }
  if (!animate || reduce) { urlText.classList.remove('is-out'); return show() }
  urlLoad.getAnimations().forEach(a => a.cancel())
  urlLoad.animate([{ scale: '0 1', opacity: 1 }, { scale: '.85 1', opacity: 1, offset: .7 }, { scale: '1 1', opacity: 0 }], { duration: 520, easing: 'ease-out' })
  urlText.classList.add('is-out')
  setTimeout(() => { if (url === next) { show(); urlText.classList.remove('is-out') } }, 180 / rate)
}

/** Tells an embedding page which chapter of the flow is on screen (the studio page highlights its caption). */
export function chapter(index) {
  if (parent !== window) parent.postMessage({ filoAppFlow: 'chapter', index }, location.origin)
}

/* ── Playback ── */
/**
 * Runs `scenes` in a loop.
 * Each scene is `async t => …` and sets its screen from scratch, so a restart can begin anywhere;
 * `home()` shows the first screen at rest.
 */
export async function boot({ scenes, home }) {
  let started = false
  async function run() {
    const t = ++token
    try {
      cursor.classList.remove('is-hidden')
      for (let i = 0; ; i++) await scenes[i % scenes.length](t)
    } catch (e) { if (!(e instanceof Stop)) throw e }
  }
  function setPaused(p) {
    paused = p
    // Resume only what this pause stopped; finished animations (fill: forwards) stay put.
    stage.getAnimations({ subtree: true }).forEach(a => p ? a.playState === 'running' && a.pause() : a.playState === 'paused' && a.play())
  }
  function play() {
    if (reduce) return
    if (started) return setPaused(false)
    started = true; paused = false; run()
  }
  /** Back to the first screen with the cursor out of view; the next play starts the flow over. */
  function restart() {
    setPaused(false)
    token++; started = false
    home(); place(...HOME); cursor.classList.add('is-hidden')
  }

  await document.fonts.ready
  const embedded = parent !== window
  if (reduce) home()
  else if (!embedded) play()
  else {
    // The host's play/pause button covers the frame, so nothing in here takes focus.
    document.body.inert = true
    addEventListener('message', ({ source, origin, data }) => {
      if (source !== parent || origin !== location.origin) return
      if (data?.filoAppFlow === 'play') play()
      else if (data?.filoAppFlow === 'pause') setPaused(true)
      else if (data?.filoAppFlow === 'restart') restart()
      else if (data?.filoAppFlow === 'speed') setRate(Number(data.rate))
    })
    parent.postMessage({ filoAppFlow: 'ready' }, location.origin)
  }
}
