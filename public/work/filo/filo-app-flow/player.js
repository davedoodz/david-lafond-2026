/* Shared by the Filo portal prototypes: fitting the 1536 × 1024 window, the scripted cursor, the
   address bar, and playback. Opened on its own, a prototype plays and loops. Embedded (the Filo case
   study), the host page drives it, Momo-style: it posts { filoAppFlow: 'play' | 'pause' | 'restart' }
   and gets { filoAppFlow: 'ready' } once the type has loaded, so it can send its current state. */
export const W = 1536, H = 1024
export const $ = (s, r = document) => r.querySelector(s)
export const $$ = (s, r = document) => [...r.querySelectorAll(s)]
export const k = name => $(`[data-k="${name}"]`)
export const stage = $('#stage'), cursor = $('#cursor')
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

/* Fill the frame with the window. */
let scale = 1
function fit() {
  scale = Math.min(innerWidth / W, innerHeight / H)
  stage.style.scale = scale
}
addEventListener('resize', fit); fit()

/* ── Timing: every wait checks the run token, so a jump or pause stops the script cleanly. ── */
let token = 0, paused = false
export class Stop extends Error {}
export const isPaused = () => paused
export const sleep = (ms, t) => new Promise((ok, no) => {
  let left = ms, last = performance.now()
  // performance.now(), not rAF's timestamp: in an iframe Chrome's rAF time can trail it by seconds.
  const tick = () => {
    const now = performance.now()
    if (t !== token) return no(new Stop())
    if (!paused) left -= now - last
    last = now
    left <= 0 ? ok() : requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})

/* ── Cursor ── */
const HOME = [760, 1120]
let cx = HOME[0], cy = HOME[1]
export const place = (x, y) => { cx = x; cy = y; cursor.style.translate = `${x}px ${y}px` }
place(cx, cy)
/** Centre of an element (or a point inside it, as fractions) in window px. */
export function at(el, fx = .5, fy = .5) {
  const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect()
  return [(r.left - s.left + r.width * fx) / scale, (r.top - s.top + r.height * fy) / scale]
}
export async function move(t, [x, y], ms) {
  const d = Math.hypot(x - cx, y - cy)
  ms ??= Math.min(1100, 380 + d * .75)
  const a = cursor.animate([{ translate: `${cx}px ${cy}px` }, { translate: `${x}px ${y}px` }], { duration: ms, easing: 'cubic-bezier(.65, 0, .35, 1)', fill: 'forwards' })
  const watch = setInterval(() => { if (t !== token) a.cancel(); else if (paused) a.pause(); else if (a.playState === 'paused') a.play() }, 50)
  try { await a.finished } catch { throw new Stop() } finally { clearInterval(watch) }
  if (t !== token) throw new Stop()
  place(x, y); a.cancel()
}
let hovered = []
export function hover(...els) { hovered.forEach(e => e.classList.remove('is-hover')); hovered = els.filter(Boolean); hovered.forEach(e => e.classList.add('is-hover')) }
export async function click(t, el) {
  cursor.classList.add('is-down'); el?.classList.add('is-press')
  await sleep(130, t)
  const ring = document.createElement('div'); ring.className = 'ring'; ring.style.translate = `${cx}px ${cy}px`
  stage.append(ring); ring.addEventListener('animationend', () => ring.remove())
  cursor.classList.remove('is-down'); el?.classList.remove('is-press')
  await sleep(90, t)
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
  setTimeout(() => { if (url === next) { show(); urlText.classList.remove('is-out') } }, 180)
}

/** Tells an embedding page which chapter of the flow is on screen (the studio page highlights its caption). */
export function chapter(index) {
  if (parent !== window) parent.postMessage({ filoAppFlow: 'chapter', index }, location.origin)
}

/* ── Playback ── */
/**
 * Runs `scenes` in a loop. Each scene is `async t => …` and sets its screen from scratch, so a restart
 * can begin anywhere; `home()` shows the first screen at rest.
 */
export async function boot({ scenes, home }) {
  let started = false
  async function run() {
    const t = ++token
    try {
      cursor.classList.remove('is-hidden')
      for (let i = 0; ; i = (i + 1) % scenes.length) await scenes[i](t)
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
    })
    parent.postMessage({ filoAppFlow: 'ready' }, location.origin)
  }
}
