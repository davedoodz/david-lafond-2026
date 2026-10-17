/* eslint-disable */
/** Approved phone-only cut from studio/momo-intro-phone.html; saved settings baked in. */
import { drawBraid, setRT } from './braid.js'
import { LOCK_FONT } from './lockGlyphs.js'
const W = 960, TAU = Math.PI * 2
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const lerp = (a,b,t) => a+(b-a)*t
const seg = (t,a,b) => clamp((t-a)/(b-a))
const UI = 'Inter, system-ui, sans-serif'
const PHONE = { w:874,h:1780,sx:46,sy:39,sw:784,sh:1702,r:113 }, SH = PHONE.sh / PHONE.sw * 390
const BRAID_W = 2 * 320 * .87
const braidOff = Object.assign(document.createElement('canvas'), {width:600,height:260})
const D = {"island":{"pad":4,"dur":1.1,"bounce":0.2,"close":0.9,"w":366,"hgt":196,"r":44,"zoom":0.45},"status":{"sigX":0,"sigY":0,"wifiX":3,"wifiY":0,"batX":0,"batY":0},"notif":{"y":3,"x":0,"size":38},"seq":{"meet":0.4,"meetToLuck":1.2,"luckHold":1.8,"fade":0.6,"hold3":0.9,"hold5":0.2,"toIsland":0.3,"nudgeRead":2.4,"toRecord":3.4,"recordToTalk":1.9,"word":0.32,"afterTalk":0.4,"handoff":2.2,"endHold":1.4},"signal":{"rise":1.85,"gap":0.6,"row":0.85,"hold":1.8},"momo":{"grow":1.1,"eyesAt":0,"eyes":0.8,"settle":1.1,"openY":383,"openS":230,"talkY":250,"talkS":150},"braid":{"x":0,"y":-16,"scale":1.3,"len":1},"cursor":{"size":23,"press":0.18,"fill":0.42}}
const OPT = {pause:'bars',bg:'paper',copy:'nudge',handoff:'dissolve',eyes:'fade',mease:'smooth'}
/** App-launch dials (Momo intro › App launch), pushed in by MomoIntro every frame. Film seconds:
 *  `duration` of the window growing out of the notification, `spring` its stiffness (higher = more of
 *  the move up front), `face` the notification → app cross-fade, `press` the tap dip, and how far the
 *  lock screen behind `zoom`s, `blur`s (px) and `dim`s. */
let LAUNCH = { duration: 0.7, spring: 9, face: 0.15, press: 0.05, zoom: 0.05, blur: 6, dim: 0.22 }
export function setAppLaunch(dials) { LAUNCH = dials }
/** Momo intro › Momo asleep: size and centre of asleep Momo when the app opens, until the record tap (screen units). */
export function setMomoAsleep({ size, y }) { D.momo.talkS = size; D.momo.talkY = y }
/** Freeform pill dials (Momo intro › Freeform pill), in screen px: label letter-spacing (the pill grows
 *  with it, so the chevron keeps its gap), an x/y nudge of the text, and the pill's corner radius. */
let PILL_TEXT = { letterSpacing: 0, x: 0, y: 0, radius: 23 }
export function setPillText(dials) { PILL_TEXT = dials }
/** Pause icon dials (Momo intro › Pause icon): corner radius of the two 3×14 bars, in screen px (1.5 = capsule). */
let PAUSE_ICON = { radius: 0 }
export function setPauseIcon(dials) { PAUSE_ICON = dials }
/** Status icon gaps (Momo intro › Status icons), in pt: signal → Wi-Fi and Wi-Fi → battery fill. */
let STATUS_GAPS = { wifi: 4.2, battery: 5.8 }
export function setStatusGaps(dials) { STATUS_GAPS = dials }
const COPY = {"luck":{"title":"Good luck with the presentation 🍀","body":"Deep breaths before you walk in.\nYou totally got this! 😌"},"nudge":{"title":"Wanna debrief? ☁️","body":"I noticed your body’s still a little stressed from that presentation. I'm here if you wanna yap about it 👀"}}
const MEET = {"title":"Design Pitch - Internal Team","now":"2:00 – 2:45 PM · now","ended":"Ended 2:45 PM"}
const CHECKS = [{"kind":"hr","text":"Heart rate up ~30 BPM in 2 min","state":"ok"},{"kind":"base","text":"Unusual for you at this hour","state":"ok"}]
const shownChecks = () => CHECKS
/** Height the heart-rate card grows by to hold the check rows (and the meter, if shown). */
const extraOf = (V) => CHECKS.length * 24.5 + 9.5 + (V?.style === 'meter' ? 30 : 0)
/** When check row `i` arrives, and how far it has (0–1). */
const checkAt = (T, i) => T.risen + D.signal.gap + i * D.signal.row
const checkIn = (t, T, i) => S(t, checkAt(T, i), checkAt(T, i) + Math.min(0.35, D.signal.row * 0.6))
/** The pending rows (dim, with spinners) fade in together just before the first check. The island grows
 *  to hold them just ahead of that fade, so it never waits with an empty band and rows never overhang it. */
const rowsIn = (t, T) => S(t, checkAt(T, 0) - 0.35, checkAt(T, 0))
const islandGrow = (t, T) => S(t, checkAt(T, 0) - 0.8, checkAt(T, 0) - 0.3)
// The full take keeps going under the handoff; the cut lands just after "shit…" (see `timeline`).
const words = () => "Sarah kept pushing back on my concept in front of everyone, and I just… froze. I knew what to say but shit… I don't know why I just kept my opinions to myself…".trim().split(/\s+/)
const CUT_AFTER = 'shit…', CUT_LEAD = 0
const THEMES = {paper:{lockInk:'#9CF6FF',dateInk:'#9CF6FF',glass:'rgba(255,255,255,0.62)',statusInk:'#ffffff',rounded:true,buttons:true}}
const IMG = Object.fromEntries(Object.entries({lockwall:'lockwall',phone:'iphone',momo:'momo',momoOpen:'momo-open',recDot:'rec-dot',recSquare:'rec-square'}).map(([key,file]) => { const image = new Image(); image.src = '/work/momo/intro/'+file+'.webp'; return [key,image] }))
let loaded
export function loadPhoneFilm() {
  return loaded ??= Promise.all([ ...Object.values(IMG).map(image => image.decode()), new FontFace('Inter', 'url(/fonts/Inter-var-latin.woff2)', {weight:'100 900'}).load().then(font => document.fonts.add(font)) ]).then(() => {})
}
const glyphs = Object.fromEntries(Object.entries(LOCK_FONT.glyphs).map(([char,[advance,path]]) => [char,{advance,path:new Path2D(path)}]))
function rounded(c,text,x,y,size) {
  const scale = size / LOCK_FONT.upm
  let width = 0; for (const char of text) width += glyphs[char].advance
  c.save(); c.translate(x-width*scale/2,y+(LOCK_FONT.ascent+LOCK_FONT.descent)*scale/2); c.scale(scale,-scale)
  for (const char of text) { const glyph = glyphs[char]; c.fill(glyph.path); c.translate(glyph.advance,0) }
  c.restore()
}
/** Width of `text` set in the lock-screen rounded face at `size`. */
const roundedW = (text, size) => [...text].reduce((w, ch) => w + glyphs[ch].advance, 0) * size / LOCK_FONT.upm
// In-app screens are the prototypes' flat #fafafa; the voice glow is the real VoiceBeam, layered
// over the film by MomoIntro (see drawPhoneFilm's return value).
function screenBg(c,t,app) {
  if (app < .999) { const k = Math.max(390/IMG.lockwall.naturalWidth,SH/IMG.lockwall.naturalHeight); c.drawImage(IMG.lockwall,(390-IMG.lockwall.naturalWidth*k)/2,(SH-IMG.lockwall.naturalHeight*k)/2,IMG.lockwall.naturalWidth*k,IMG.lockwall.naturalHeight*k) }
  if (app > .001) { c.save(); c.globalAlpha *= app; c.fillStyle='#fafafa'; c.fillRect(-40,-40,470,SH+80); c.restore() }
}
const S = (t, a, b) => 0.5 - 0.5 * Math.cos(Math.PI * seg(t, a, b))
const bump = (t, a, b) => Math.sin(Math.PI * seg(t, a, b))
// Integrate once, not from frame zero on every animation frame.
function clockTable(duration, speed) {
  const values = new Float64Array(Math.ceil(duration * 60) + 2)
  for (let i = 1; i < values.length; i++) values[i] = values[i - 1] + speed((i - 1) / 60) / 60
  return (t) => values[Math.min(values.length - 1, Math.max(0, Math.ceil(t * 60)))]
}
const pulse = (phase) => Math.exp(-(((phase % 1) + 1) % 1) * 7)
const mix = (p, q, k) => ({ x: lerp(p.x, q.x, k), y: lerp(p.y, q.y, k), len: lerp(p.len, q.len, k), sc: lerp(p.sc, q.sc, k) })
const rgb = (a, b, k) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], k))).join(',')})`
/** Springy pop for stickers and bubbles (overshoots a little, then settles). */
const pop = (t, a, d = 0.55) => { const x = seg(t, a, a + d); return x <= 0 ? 0 : 1 - Math.exp(-6 * x) * Math.cos(9 * x) }
/** CSS `cubic-bezier()` as a 0–1 easing, so canvas motion matches the prototype's transitions. */
function bezier(x1, y1, x2, y2) {
  const f = (a, b, s) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3
  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let lo = 0, hi = 1, s = x
    for (let i = 0; i < 20; i++) { s = (lo + hi) / 2; if (f(x1, x2, s) < x) lo = s; else hi = s }
    return f(y1, y2, s)
  }
}
const EASE = bezier(0.25, 0.1, 0.25, 1), OUT = bezier(0.22, 1, 0.36, 1), REVEAL = bezier(0.34, 1.45, 0.64, 1)
/** Canvas filters ignore the transform, so blur radii are scaled to device pixels. */
const blurPx = (c, px) => px * Math.hypot(c.getTransform().a, c.getTransform().b)

function tx(c, s, x, y, size, o = {}) {
  const { w = 400, color = '#1f1f1f', align = 'left', ls = 0 } = o
  c.font = `${w} ${size}px ${UI}`; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'middle'; c.letterSpacing = `${ls}px`
  c.fillText(s, x, y); c.letterSpacing = '0px'
}
function wrap(c, text, maxW, size, w = 400) {
  c.font = `${w} ${size}px ${UI}`
  const out = []; let cur = ''
  for (const word of text.split(' ')) { const n = cur ? `${cur} ${word}` : word; if (cur && c.measureText(n).width > maxW) { out.push(cur); cur = word } else cur = n }
  if (cur) out.push(cur)
  return out
}
/** Glass surface: white, a hairline and a soft blue-grey shadow (prompt card / controls). */
function glass(c, x, y, w, h, r, fill = 'rgba(255,255,255,0.72)', shadow = 30) {
  c.save()
  if (shadow) { c.shadowColor = 'rgba(0,50,70,0.10)'; c.shadowBlur = shadow; c.shadowOffsetY = shadow / 3 }
  c.fillStyle = fill; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill()
  c.shadowColor = 'transparent'; c.strokeStyle = 'rgba(0,0,0,0.05)'; c.lineWidth = 1; c.stroke()
  c.restore()
}
/** Glass looks for `frost`: the pale notification glass, and the heart-rate card, which is solid
 *  Dynamic Island black (opaque tint, no sheen, bevel or rim). */
const FROST = {
  light: { shadow: 'rgba(10,60,120,0.16)', base: 'rgba(205,232,252,0.5)', blur: 16, tint: [[0, 'rgba(226,243,255,0.80)'], [0.55, 'rgba(208,231,252,0.74)'], [1, 'rgba(214,240,255,0.80)']], sheen: 0.22, bevel: 1, rim: 1 },
  dark: { shadow: 'rgba(0,6,16,0.42)', base: '#000', blur: 22, tint: [[0, '#000'], [1, '#000']], sheen: 0, bevel: 0, rim: 0 },
}
/**
 * Lock-screen glass, as in the Momo app mocks: the wallpaper behind it blurred, a tint, a soft
 * diagonal sheen, a frosted inner bevel and a hairline rim whose brightness varies round the card
 * (brightest at the top-left and bottom-right corners, fainter along the long edges).
 * Drawn in screen units (390 wide).
 */
function frost(c, x, y, w, h, r, G = FROST.light) {
  c.save()
  c.shadowColor = G.shadow; c.shadowBlur = 22; c.shadowOffsetY = 6
  c.fillStyle = G.base; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill()
  c.shadowColor = 'transparent'
  c.save(); c.clip()
  const W = IMG.lockwall, k = Math.max(390 / W.naturalWidth, SH / W.naturalHeight)
  c.filter = `blur(${blurPx(c, G.blur)}px)`
  c.drawImage(W, (390 - W.naturalWidth * k) / 2, (SH - W.naturalHeight * k) / 2, W.naturalWidth * k, W.naturalHeight * k)
  c.filter = 'none'
  const tint = c.createLinearGradient(x, y, x + w, y + h)
  G.tint.forEach(([at, col]) => tint.addColorStop(at, col))
  c.fillStyle = tint; c.fillRect(x, y, w, h)
  const sheen = c.createLinearGradient(x + w * 0.35, y, x + w * 0.75, y + h)
  sheen.addColorStop(0, 'rgba(255,255,255,0)'); sheen.addColorStop(0.5, `rgba(255,255,255,${G.sheen})`); sheen.addColorStop(1, 'rgba(255,255,255,0)')
  c.fillStyle = sheen; c.fillRect(x, y, w, h)
  // Frosted bevel: a faint blurred white band just inside the edge, mostly on the left and lower right.
  const bevel = c.createLinearGradient(x, y, x + w, y + h), b = G.bevel
  bevel.addColorStop(0, `rgba(255,255,255,${0.32 * b})`); bevel.addColorStop(0.35, `rgba(255,255,255,${0.06 * b})`); bevel.addColorStop(0.7, `rgba(255,255,255,${0.04 * b})`); bevel.addColorStop(1, `rgba(255,255,255,${0.24 * b})`)
  c.filter = `blur(${blurPx(c, 3)}px)`; c.strokeStyle = bevel; c.lineWidth = 7
  c.beginPath(); c.roundRect(x, y, w, h, r); c.stroke(); c.filter = 'none'
  c.restore()
  // Rim: a conic gradient round the card's centre, so the hairline only really catches light at the
  // top-left and bottom-right corners and all but disappears along the long edges.
  const a = Math.atan2(h / 2, w / 2) / TAU, rim = c.createConicGradient(0, x + w / 2, y + h / 2)
  ;[[0, 0.06], [a * 0.6, 0.12], [a, 0.42], [a * 1.6, 0.14], [0.25, 0.04], [0.5 - a * 1.5, 0.06], [0.5 - a, 0.2], [0.5, 0.16], [0.5 + a * 0.5, 0.2], [0.5 + a, 0.55], [0.5 + a * 1.7, 0.18], [0.75, 0.05], [1 - a * 1.4, 0.06], [1 - a, 0.26], [1 - a * 0.4, 0.08], [1, 0.06]]
    .forEach(([at, al]) => rim.addColorStop(at, `rgba(255,255,255,${al * G.rim})`))
  c.strokeStyle = rim; c.lineWidth = 1; c.beginPath(); c.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, r - 0.5); c.stroke()
  c.restore()
}
/** App-icon tile on a notification: white fading to pale blue, with a faint rim. */
function tile(c, x, y, s) {
  const g = c.createLinearGradient(x, y, x, y + s); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e2eefa')
  c.save(); c.shadowColor = 'rgba(20,70,130,0.10)'; c.shadowBlur = 6; c.shadowOffsetY = 1
  c.fillStyle = g; c.beginPath(); c.roundRect(x, y, s, s, s * 0.27); c.fill(); c.restore()
}
/** Notification ink: navy title, slate-blue app name and body. */
const NINK = { title: '#10243a', app: '#4d6a88', time: '#6d87a3', body: '#41617f' }
function momo(c, x, y, size, t, listen = 0, img = IMG.momo) {
  const sq = 1 + 0.02 * listen * Math.sin(t * 2.6), bob = Math.sin(t * 1.3) * 3
  c.drawImage(img, x - (size * sq) / 2, y - size / 2 + bob - size * 0.03, size * sq, size / sq)
}
/** Asleep Momo's body is framed ~7% larger than awake Momo's (clips and stills alike: 0.644 vs 0.601
 *  of the frame height), so it is drawn at this scale to stay the same size. */
const ASLEEP_K = 0.933
const probe = Object.assign(document.createElement('canvas'), { width: 96, height: 96 }), probeCtx = probe.getContext('2d', { willReadFrequently: true })
/** Vertical centre of Momo's body in a frame, as a fraction of the frame height (alpha bounds on a 96px probe). */
function bodyY(img) {
  probeCtx.clearRect(0, 0, 96, 96); probeCtx.drawImage(img, 0, 0, 96, 96)
  const d = probeCtx.getImageData(0, 0, 96, 96).data
  let y0 = -1, y1 = -1
  for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) if (d[(y * 96 + x) * 4 + 3] > 128) { if (y0 < 0) y0 = y; y1 = y; break }
  return y0 < 0 ? 0.5 : (y0 + y1 + 1) / 192
}

/**
 * Transcript, as the voice prototype draws it (reself-voice-prototypes `Transcript`): 21px Inter 450,
 * centred in a 302px column whose bottom sits 210px above the screen's bottom edge. Each word blurs
 * in blue and settles to grey; a new line slides the text up; the four-line box fades out toward its top.
 */
const TR = { size: 21, lh: 21 * 1.38, maxW: 302, lines: 4, bottom: 210, wordIn: 0.62, blur: 16.5, scroll: 0.86, fresh: [97, 168, 253], ink: [161, 172, 176] }
function transcript(c, tokens, t) {
  const shown = tokens.filter((k) => k.at <= t)
  if (!shown.length) return
  c.save()
  c.font = `450 ${TR.size}px ${UI}`; c.letterSpacing = `${-0.005 * TR.size}px`; c.textAlign = 'left'; c.textBaseline = 'middle'
  const width = (ws) => c.measureText(ws.map((k) => k.text).join(' ')).width
  const lines = [[]]
  for (const k of shown) {
    const cur = lines[lines.length - 1]
    if (cur.length && width([...cur, k]) > TR.maxW) lines.push([k])
    else cur.push(k)
  }
  // Every new line (the first included) starts one line low and eases up, as the prototype's FLIP does.
  const rise = lines.reduce((s, l) => s + TR.lh * (1 - OUT(seg(t, l[0].at, l[0].at + TR.scroll))), 0)
  const bottom = SH - TR.bottom, top = bottom - TR.lines * TR.lh, space = c.measureText(' ').width
  c.beginPath(); c.rect(0, top, 390, bottom - top); c.clip()
  const base = c.globalAlpha
  lines.forEach((line, li) => {
    const y = bottom - TR.lh / 2 - (lines.length - 1 - li) * TR.lh + rise
    if (y < top - TR.lh || y > bottom + TR.lh) return
    let x = 195 - width(line) / 2
    for (const k of line) {
      const age = t - k.at, w = c.measureText(k.text).width
      const col = TR.fresh.map((v, i) => Math.round(lerp(v, TR.ink[i], OUT(seg(age, 0.45 * TR.wordIn, TR.wordIn))))).join(',')
      // The mask: transparent at the box's top edge, solid at its bottom.
      const g = c.createLinearGradient(0, top, 0, bottom); g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgb(${col})`)
      const blur = TR.blur * (1 - OUT(seg(age, 0, 0.45 * TR.wordIn)))
      c.filter = blur > 0.2 ? `blur(${blurPx(c, blur)}px)` : 'none'
      // 0.75: the transcript sits back a quarter from the prototype's full ink.
      c.globalAlpha = base * 0.75 * OUT(seg(age, 0, TR.wordIn)); c.fillStyle = g
      c.fillText(k.text, x, y)
      x += w + space
    }
  })
  c.restore()
}
/**
 * Bottom bar of the voice prototype: Freeform and the record button with its blue orb. The tap at
 * `recAt` morphs the orb into the stop square (320ms), and pause then restart grow out of the record
 * button: from 28px right, 60% scale and 6px blur, 460ms each, 70ms apart.
 */
function controls(c, t, mode, recAt) {
  c.save()
  const y = 790
  const P = PILL_TEXT
  c.font = `500 15px ${UI}`; c.letterSpacing = `${P.letterSpacing}px`; const pw = 22 + c.measureText(mode).width + 8 + 12 + 19; c.letterSpacing = '0px'
  glass(c, 22, y - 23, pw, 46, P.radius, 'rgba(255,255,255,0.55)', 6)
  tx(c, mode, 44 + P.x, y + P.y, 15, { w: 500, ls: P.letterSpacing })
  c.strokeStyle = '#666'; c.lineWidth = 1.4; c.beginPath(); const cx = 22 + pw - 25; c.moveTo(cx - 3.5, y - 1.5); c.lineTo(cx, y + 2); c.lineTo(cx + 3.5, y - 1.5); c.stroke()
  const btn = (x, fill) => { glass(c, x - 23, y - 23, 46, 46, 23, fill, fill === '#292931' ? 14 : 6) }
  // Lucide icons (24-grid, stroke 2) at 20 px: rotate-ccw and pause.
  const lucide = (x, d) => { c.save(); c.translate(x - 10, y - 10); c.scale(20 / 24, 20 / 24); c.strokeStyle = '#1f1f1f'; c.lineWidth = 2; c.lineCap = 'round'; c.lineJoin = 'round'; d.forEach((p) => c.stroke(new Path2D(p))); c.restore() }
  const pause = () => {
    const P = OPT.pause
    c.fillStyle = '#1f1f1f'
    if (P === 'bars') { c.beginPath(); c.roundRect(282.5, y - 7, 3, 14, PAUSE_ICON.radius); c.roundRect(288.5, y - 7, 3, 14, PAUSE_ICON.radius); c.fill() }
    else if (P === 'rounded') { c.beginPath(); c.roundRect(281.5, y - 7.5, 4, 15, 2); c.roundRect(288.5, y - 7.5, 4, 15, 2); c.fill() }
    else if (P === 'filled') { c.save(); c.translate(277, y - 10); c.scale(20 / 24, 20 / 24); c.beginPath(); c.roundRect(6, 4, 4, 16, 1); c.roundRect(14, 4, 4, 16, 1); c.fill(); c.restore() }
    else if (P === 'circle') lucide(287, ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M10 15V9', 'M14 15V9'])
    else lucide(287, ['M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z', 'M6 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z'])
  }
  const reveal = (i, x, icon) => {
    const k = seg(t, recAt + i * 0.07, recAt + i * 0.07 + 0.46)
    if (k <= 0) return
    const e = REVEAL(k), blur = 6 * (1 - clamp(e))
    c.save(); c.globalAlpha *= clamp(e)
    if (blur > 0.2) c.filter = `blur(${blurPx(c, blur)}px)`
    c.translate(x + 28 * (1 - e), y); c.scale(lerp(0.6, 1, e), lerp(0.6, 1, e)); c.translate(-x, -y)
    btn(x, 'rgba(255,255,255,0.55)'); icon()
    c.restore()
  }
  reveal(1, 229, () => lucide(229, ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5']))
  reveal(0, 287, pause)
  const press = 1 - 0.16 * bump(t, recAt - 0.05, recAt + 0.3)
  c.translate(345, y); c.scale(press, press); c.translate(-345, -y)
  btn(345, '#292931')
  // Orb → square: the orb shrinks to 40% and fades, the square grows from 30% (prototype .rec-glyph).
  const m = seg(t, recAt, recAt + 0.32), glyph = (img, size, from, show) => {
    const s = lerp(from, 1, OUT(show)) * size
    c.save(); c.globalAlpha *= EASE(show); c.drawImage(img, 345 - s / 2, y - s / 2, s, s); c.restore()
  }
  if (m < 1) glyph(IMG.recDot, 22, 0.4, 1 - m)
  if (m > 0) glyph(IMG.recSquare, 16.5, 0.3, m)
  c.restore()
}
/** `lock` 1 = lock screen (carrier at top left, as on iOS), 0 = in app (time). */
function statusBar(c, ink = '#1f1f1f', lock = 0) {
  if (lock < 0.99) { c.save(); c.globalAlpha *= 1 - lock; tx(c, '9:41', 52, 30, 16, { w: 600, color: ink }); c.restore() }
  if (lock > 0.01) { c.save(); c.globalAlpha *= lock; tx(c, 'AT&T', 40, 30, 15, { w: 600, color: ink }); c.restore() }
  const B = D.status
  // iOS status icons, measured from David's reference (pt, bars' bottom at y 34). Signal: four 3.3-wide
  // rounded bars, 4.93 apart. Wi-Fi: two round-capped arcs and a rounded wedge, 17 wide. Battery:
  // 20×11 outline, 17.3×8.4 fill, side nub. Gaps (Momo intro › Status icons, pt): `wifi` signal → Wi-Fi
  // (4.2 measured) and `battery` Wi-Fi → battery fill (5.8). The battery stays put; wider gaps push the
  // icons to its left outward. Wi-Fi's base x leaves room for the saved `D.status.wifiX` (3) nudge.
  const dB = STATUS_GAPS.battery - 5.8, dW = dB + STATUS_GAPS.wifi - 4.2
  c.fillStyle = ink; c.beginPath()
  ;[4.3, 5.9, 8.4, 10.7].forEach((h, i) => c.roundRect(281.7 - dW + B.sigX + i * 4.93, 34 + B.sigY - h, 3.3, h, 1.1))
  c.fill()
  const wx = 309.3 - dB + B.wifiX, wy = 34.5 + B.wifiY, A = 0.233 * Math.PI
  c.save(); c.strokeStyle = ink; c.lineCap = 'round'; c.lineWidth = 2.35
  for (const r of [11.1, 6.95]) { c.beginPath(); c.arc(wx, wy, r, -Math.PI / 2 - A, -Math.PI / 2 + A); c.stroke() }
  c.lineWidth = 1.3; c.lineJoin = 'round'; c.beginPath(); c.moveTo(wx, wy - 0.7); c.arc(wx, wy - 0.7, 2.7, -Math.PI / 2 - A, -Math.PI / 2 + A); c.closePath(); c.fill(); c.stroke()
  c.restore()
  const bx = 325.05 + B.batX, by = 23.7 + B.batY
  c.save(); c.globalAlpha *= 0.4; c.strokeStyle = ink; c.lineWidth = 1; c.beginPath(); c.roundRect(bx, by, 20, 11, 4); c.stroke()
  c.beginPath(); c.roundRect(bx + 21.2, by + 3.75, 1.4, 3.5, [0, 0.7, 0.7, 0]); c.fill(); c.restore()
  c.beginPath(); c.roundRect(bx + 1.35, by + 1.3, 17.3, 8.4, 2.5); c.fill()
}
/** The app's glass back button, top left. */
function backButton(c) {
  glass(c, 22, 62, 44, 44, 22, 'rgba(255,255,255,0.55)', 4)
  c.strokeStyle = '#1f1f1f'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(47, 77); c.lineTo(40, 84); c.lineTo(47, 91); c.stroke()
}

const NOTE = { x: 16, y: 300, w: 358, r: 26, cx: 195, cy: 340 }
const noticeLines = (c, n) => n.body.split('\n').flatMap((para) => wrap(c, para, 262, 14))
const noticeH = (c, n) => 70 + noticeLines(c, n).length * 19
/**
 * The launching app window, iOS-style: at `k` 0 it is the (pressed, scaled by `press`) notification,
 * at 1 the full screen with corner radius `rFull`. The app's frame sits inside it at aspect-fill
 * scale `s`, centred, so it grows with the window rather than being revealed by it.
 */
function launchWin(k, nh, press, rFull) {
  const nx = NOTE.cx + (NOTE.x - NOTE.cx) * press, ny = NOTE.cy + (NOTE.y - NOTE.cy) * press
  const x = lerp(nx, 0, k), y = lerp(ny, 0, k), w = lerp(NOTE.w * press, 390, k), h = lerp(nh * press, SH, k), r = lerp(NOTE.r * press, rFull, k)
  const s = Math.max(w / 390, h / SH)
  return { x, y, w, h, r, s, ox: x + w / 2 - 195 * s, oy: y + h / 2 - (SH / 2) * s }
}
/** Clip to the launch window and map the full-screen app frame into it. */
const enterWin = (c, W) => { c.beginPath(); c.roundRect(W.x, W.y, W.w, W.h, W.r); c.clip(); c.translate(W.ox, W.oy); c.scale(W.s, W.s) }

function notice(c, y, al, n) {
  if (al <= 0.01) return
  const lines = noticeLines(c, n), h = 70 + lines.length * 19
  c.save(); c.globalAlpha *= al
  frost(c, NOTE.x, y, NOTE.w, h, NOTE.r)
  tile(c, 28, y + 14, 44)
  { const N = D.notif; c.drawImage(IMG.momoOpen, 50 - N.size / 2 + N.x, y + 36 - N.size / 2 + N.y, N.size, N.size) }
  tx(c, 'Momo', 84, y + 24, 13, { w: 600, color: NINK.app }); tx(c, 'now', 356, y + 24, 13, { color: NINK.time, align: 'right' })
  tx(c, n.title, 84, y + 45, 15, { w: 700, color: NINK.title })
  lines.forEach((l, i) => tx(c, l, 84, y + 66 + i * 19, 14, { color: NINK.body }))
  c.restore()
  return h
}

const HRC = '#ff6b81', MOVEC = '#34c7a3', HRVC = '#a78bfa'
/** Story clock: minutes after midnight, 12-hour display without AM/PM. */
const fmt = (min) => { const h = Math.floor(min / 60), m = Math.floor(min % 60); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}` }
/** Story clock while the island is open: runs from the scenario's start to the nudge. */
const EVE = 234 // display offset: the detection happens in the evening (2:44 → 6:38)
const RISE_END = 886.2 // story minute the heart-rate jump has finished (Signal check scenario)
const mNow = (t, T, V) => (t < T.risen ? lerp(V.m0, RISE_END, seg(t, T.det + 0.3, T.risen)) : lerp(RISE_END, V.m1, seg(t, T.risen, T.buzz - 0.6)))
const noise = (m) => Math.sin(m * 3.1) * 1.2 + Math.sin(m * 7.7) * 0.7
/** Spring 0 → 1 over x in [0, 1]; bounce 0 is a plain ease-out, 1 overshoots a few times. */
const springy = (x, b) => { if (x <= 0) return 0; if (x >= 1) return 1; const w = b * 16; return (1 - Math.exp(-6 * x) * Math.cos(w * x)) / (1 - Math.exp(-6) * Math.cos(w)) }

// Metric icons: one shape and one colour per signal, so they never read as the same thing.
/** SF Symbols-style glyphs (24-unit grid), drawn as vectors: heart.fill, figure.walk, figure.seated.side,
 *  waveform.path.ecg, clock, lungs.fill. No emoji inside the Dynamic Island. */
function sf(c, name, x, y, size, color, t = 0) {
  c.save(); c.translate(x - size / 2, y - size / 2); c.scale(size / 24, size / 24)
  c.fillStyle = color; c.strokeStyle = color; c.lineCap = 'round'; c.lineJoin = 'round'
  const line = (pts, w = 2.4) => { c.lineWidth = w; c.beginPath(); pts.forEach(([a, b], i) => (i ? c.lineTo(a, b) : c.moveTo(a, b))); c.stroke() }
  const dot = (a, b, r) => { c.beginPath(); c.arc(a, b, r, 0, TAU); c.fill() }
  if (name === 'heart') c.fill(new Path2D('M12 21.2c-.3 0-.6-.1-.9-.3C6.6 17.8 2.5 14.2 2.5 9.4 2.5 6.3 4.8 4 7.7 4c1.8 0 3.3.9 4.3 2.4C13 4.9 14.5 4 16.3 4c2.9 0 5.2 2.3 5.2 5.4 0 4.8-4.1 8.4-8.6 11.5-.3.2-.6.3-.9.3z'))
  else if (name === 'walk') { const k = Math.sin(t * 9) * 2.2; dot(13.2, 3.4, 2.1); line([[12.6, 7], [11.2, 13.4]]); line([[12.4, 8.2], [9.2 - k * 0.4, 11.4]]); line([[12.4, 8.2], [15.6 + k * 0.4, 10.6]]); line([[11.2, 13.4], [8.4 - k, 20.6]]); line([[11.2, 13.4], [14 + k * 0.5, 16.8], [14.6 + k, 21]]) }
  else if (name === 'seated') { dot(9.6, 3.4, 2.1); line([[9.4, 7], [9.8, 13.2], [15.6, 13.2], [16, 20.4]]); line([[9.6, 8.6], [13.6, 11]]); line([[6.2, 9], [6.2, 20.4]], 2); line([[6.2, 15.6], [12.4, 15.6]], 2) }
  else if (name === 'ecg') line([[1.8, 12.4], [6, 12.4], [8, 7.4], [11, 17.8], [14, 4.4], [16.6, 13.4], [18.2, 12.4], [22.2, 12.4]], 2.1)
  else if (name === 'clock') { c.lineWidth = 2.1; c.beginPath(); c.arc(12, 12, 9.2, 0, TAU); c.stroke(); line([[12, 6.6], [12, 12.4], [15.6, 14.4]], 2.1) }
  else if (name === 'lungs') { line([[12, 2.6], [12, 11], [9.8, 13]], 2); line([[12, 11], [14.2, 13]], 2); c.fill(new Path2D('M9.4 6.6c-3 0-6.2 5.4-6.2 10.3 0 2.2 1.1 3.5 2.8 3.5 2.2 0 4.4-1.2 4.8-2.8V8.2c0-.9-.5-1.6-1.4-1.6zM14.6 6.6c3 0 6.2 5.4 6.2 10.3 0 2.2-1.1 3.5-2.8 3.5-2.2 0-4.4-1.2-4.8-2.8V8.2c0-.9.5-1.6 1.4-1.6z')) }
  c.restore()
}
const motionIcon = (c, x, y, walking, t, color = MOVEC) => sf(c, walking ? 'walk' : 'seated', x, y, 18, color, t)
const hrvIcon = (c, x, y, color = HRVC) => sf(c, 'ecg', x, y, 18, color)
const baseIcon = (c, x, y) => sf(c, 'clock', x, y, 16, '#9fb0b6')
const respIcon = (c, x, y) => sf(c, 'lungs', x, y, 16, '#6b7280')


/** Today's heart rate, 12:00 → now, as evenly spaced readings (the last point is live). Meeting spike, partial recovery, smaller bumps, then the evening rise. */
const DAY = [72, 68, 71, 70, 79, 101, 94, 84, 77, 82, 75, 79, 73, 81, 84]
/** Heart-rate card ink: slate labels, pale values, the mock's softer pink and blue. */
const HINK = { label: '#b3c4d6', dim: '#8a9db3', value: '#eef3f8', row: '#e6edf5', pink: '#f4889a', line: '#7eaee3', chev: '#7d90a6' }
const chevron = (c, x, y) => { c.save(); c.strokeStyle = HINK.chev; c.lineWidth = 1.6; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(x - 2.4, y - 4.8); c.lineTo(x + 2.4, y); c.lineTo(x - 2.4, y + 4.8); c.stroke(); c.restore() }
/** Today's chart: dotted 60/90/120 grid, the "usual" band, blue line turning pink where it runs high, pink wash under the high stretches. */
function hrDay(c, x0, x1, top, bottom, m, V) {
  const lo = 60, hi = 120, Y = (v) => bottom - clamp((v - lo) / (hi - lo)) * (bottom - top)
  const vals = [...DAY, V.hr(m)], n = vals.length, X = (i) => x0 + (i / (n - 1)) * (x1 - x0)
  c.save()
  c.setLineDash([1.2, 3.2]); c.lineWidth = 1; c.strokeStyle = 'rgba(255,255,255,0.2)'
  ;[[hi, top], [90, (top + bottom) / 2], [lo, bottom]].forEach(([v, y]) => { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); tx(c, String(v), x0 - 8, y, 9, { w: 500, color: HINK.dim, align: 'right' }) })
  c.setLineDash([])
  c.fillStyle = 'rgba(255,255,255,0.05)'; c.beginPath(); c.roundRect(x0, Y(V.base[1]), x1 - x0, Y(V.base[0]) - Y(V.base[1]), 3); c.fill()
  const high = (i) => Math.max(vals[i - 1], vals[i]) > V.base[1] + 6
  for (let i = 1; i < n; i++) if (high(i)) {
    const g = c.createLinearGradient(0, Math.min(Y(vals[i - 1]), Y(vals[i])), 0, bottom); g.addColorStop(0, 'rgba(244,136,154,0.32)'); g.addColorStop(1, 'rgba(244,136,154,0)')
    c.fillStyle = g; c.beginPath(); c.moveTo(X(i - 1), bottom); c.lineTo(X(i - 1), Y(vals[i - 1])); c.lineTo(X(i), Y(vals[i])); c.lineTo(X(i), bottom); c.fill()
  }
  c.lineWidth = 1.7; c.lineCap = 'round'; c.lineJoin = 'round'
  for (let i = 1; i < n; i++) { c.strokeStyle = high(i) ? HINK.pink : HINK.line; c.beginPath(); c.moveTo(X(i - 1), Y(vals[i - 1])); c.lineTo(X(i), Y(vals[i])); c.stroke() }
  const lx = X(n - 1), ly = Y(vals[n - 1])
  c.fillStyle = 'rgba(244,136,154,0.3)'; c.beginPath(); c.arc(lx, ly, 5.6, 0, TAU); c.fill()
  c.fillStyle = HINK.pink; c.beginPath(); c.arc(lx, ly, 3.3, 0, TAU); c.fill()
  tx(c, '12 PM', x0, bottom + 12.5, 9, { w: 500, color: HINK.dim }); tx(c, 'Now', x1, bottom + 12.5, 9, { w: 500, color: HINK.dim, align: 'right' })
  c.restore()
}
/** One metric tile under the chart: soft glass well, icon, value (optional second line), chevron. */
function metricTile(c, x, w, icon, line1, line2) {
  const y = 124, h = 42
  c.fillStyle = 'rgba(255,255,255,0.055)'; c.beginPath(); c.roundRect(x, y, w, h, 12); c.fill()
  c.strokeStyle = 'rgba(255,255,255,0.05)'; c.lineWidth = 1; c.beginPath(); c.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 11.5); c.stroke()
  icon(x + 21, y + h / 2)
  if (line2) { tx(c, line1, x + 43.5, y + 14.5, 13, { w: 450, color: HINK.value }); tx(c, line2, x + 43.5, y + 28.5, 12.5, { color: HINK.dim }) }
  else tx(c, line1, x + 44, y + h / 2, 13, { w: 450, color: HINK.value })
  chevron(c, x + w - 16, y + h / 2)
}
const CHECK_ICON = { hr: (c, x, y) => sf(c, 'heart', x, y, 16, HRC), move: (c, x, y, t) => motionIcon(c, x, y, false, t), base: (c, x, y) => sf(c, 'clock', x, y, 16, HINK.dim), hrv: (c, x, y) => hrvIcon(c, x, y), resp: (c, x, y) => respIcon(c, x, y), ask: (c, x, y) => c.drawImage(IMG.momoOpen, x - 9, y - 9, 18, 18) }
/** The heart-rate card under the Dynamic Island (Momo app mock): dark glass, one number to read, today's
 *  chart, Still and HRV tiles, then the detection rows. Card-local units, `CARD.w` wide. */
const CARD_HR = { y: 55, w: 362, r: 30, h0: 182 }
function readout(c, t, T, V) {
  const m = mNow(t, T, V), hr = V.hr(m), hrv = Math.round(V.hrv(m)), mv = V.move(m), still = mv < 20
  const mid = (V.base[0] + V.base[1]) / 2, high = hr > V.base[1] + 6
  sf(c, 'heart', 27, 26.5, 16 * (1 + 0.14 * pulse(t * hr / 60)), HRC); tx(c, 'Heart rate', 45, 26.5, 13, { w: 450, color: HINK.label })
  const [label, ink] = V.status?.(m, hr, still) ?? (!still ? ['Moving · expected', MOVEC] : high ? [`+${Math.round(hr - mid)} vs your usual`, HINK.pink] : ['Your usual range', HINK.dim])
  tx(c, label, 331, 26.5, 13, { w: 450, color: ink, align: 'right' }); chevron(c, 341, 26.5)
  // The number is set in the lock-screen clock's rounded face, so the card and the clock match.
  const v = String(Math.round(hr)), nw = roundedW(v, 50)
  c.fillStyle = rgb([238, 243, 248], [245, 139, 153], clamp((hr - V.base[1]) / 14)); rounded(c, v, 19 + nw / 2, 71.5, 50)
  tx(c, 'BPM', 19 + nw + 8, 85.5, 12, { w: 450, color: HINK.dim })
  hrDay(c, 168, 341, 51, 91, m, V)
  c.fillStyle = 'rgba(255,255,255,0.09)'; c.fillRect(16, 116.5, 330, 1)
  metricTile(c, 16, 159, (x, y) => motionIcon(c, x, y, !still, t), still ? 'Still' : 'Walking', still ? `${Math.max(1, Math.round(m - V.stillSince))} min` : 'now')
  metricTile(c, 186.5, 159.5, (x, y) => sf(c, 'ecg', x, y, 20, HRVC), `HRV ${hrv} ms${hrv <= Math.round(V.hrv(V.m0)) - 8 ? ' ↓' : ''}`)
  // The detection logic, row by row (editable rows; hidden rows collapse).
  if (!V.checks) return
  const rows = shownChecks(), n = rows.length, st = V.style ?? 'list'
  const at = (i) => checkAt(T, i)
  const K = rows.map((_, i) => checkIn(t, T, i))
  const latest = K.reduce((m, k, i) => (k > 0.5 ? i : m), -1)
  const pa = rowsIn(t, T)
  c.save(); c.globalAlpha *= pa; c.fillStyle = 'rgba(255,255,255,0.09)'; c.fillRect(16, 175.5, 330, 1); c.restore()
  rows.forEach((r, i) => {
    const k = K[i], y = 193 + i * 24.5, { kind, text, state } = r
    const vis = st === 'pending' ? pa * lerp(0.32, 1, k) : k
    if (vis <= 0.01) return
    c.save(); c.globalAlpha *= vis * (state === 'off' ? 0.55 : 1) * (st === 'focus' && latest > i ? 0.6 : 1)
    if (st === 'focus' && i === latest) { c.fillStyle = 'rgba(255,255,255,0.08)'; c.beginPath(); c.roundRect(14, y - 12, 334, 24, 8); c.fill() }
    CHECK_ICON[kind](c, 31, y, t)
    tx(c, text, 53, y, 12.5, { w: state === 'go' ? 600 : 450, color: state === 'go' ? '#8fc3ff' : state === 'off' ? HINK.dim : HINK.row })
    if (state === 'ok' || state === 'weak') {
      if (st === 'pending' && k < 0.5) { c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath(); c.arc(321, y, 6.5, t * 7, t * 7 + 4.2); c.stroke() }
      else { const sk = st === 'pending' ? clamp(pop(t, at(i), 0.4)) : 1; c.save(); c.translate(321, y); c.scale(sk, sk); c.fillStyle = state === 'ok' ? '#34c759' : 'rgba(52,199,89,0.45)'; c.beginPath(); c.arc(0, 0, 7.5, 0, TAU); c.fill(); c.strokeStyle = '#0f2a1a'; c.lineWidth = 1.7; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(-3.6, 0.2); c.lineTo(-1.1, 2.7); c.lineTo(3.6, -2.4); c.stroke(); c.restore() }
    }
    if (state === 'off') tx(c, 'not used', 331, y, 10.5, { color: HINK.dim, align: 'right' })
    else chevron(c, 340, y)
    c.restore()
  })
  if (st === 'meter') {
    const wt = (r) => (r.state === 'ok' ? 1 : r.state === 'weak' ? 0.5 : 0), tot = rows.reduce((a, r) => a + wt(r), 0) || 1
    const v = rows.reduce((a, r, i) => a + wt(r) * K[i], 0) / tot, y = 193 + n * 24.5
    c.save(); c.globalAlpha *= pa
    tx(c, 'Stress signal', 16, y, 11, { w: 500, color: HINK.dim }); tx(c, `${Math.round(v * 100)}%`, 346, y, 11, { w: 600, color: rgb([143, 195, 255], [255, 154, 171], v), align: 'right' })
    c.fillStyle = 'rgba(255,255,255,0.1)'; c.beginPath(); c.roundRect(16, y + 10, 330, 6, 3); c.fill()
    const g = c.createLinearGradient(16, 0, 346, 0); g.addColorStop(0, '#8fc3ff'); g.addColorStop(1, '#ff9aab'); c.fillStyle = g; c.beginPath(); c.roundRect(16, y + 10, Math.max(6, 330 * v), 6, 3); c.fill()
    c.restore()
  }
}
/** The Dynamic Island pill in screen units (drawn by the phone frame, on top of the screen). */
const PILL = { y: 11, w: 124, h: 36 }
const smoothstep = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k) }
/**
 * The liquid bridge between the island pill and the card's black blob (card rect `by`, `bw`, `br`,
 * centred). Each side leaves the pill along its outline, narrows to a waist and flares back out along
 * the blob's outline, so the two read as one drop of ink. `n` 1 = fully joined; as it falls the waist
 * pinches, and below 0.3 the neck has snapped and both tips draw back into their shapes.
 */
function neck(c, n, by, bw, br) {
  if (n <= 0.002) return
  const cx = 195, pr = PILL.h / 2, py = PILL.y + pr, pb = PILL.y + PILL.h, ps = PILL.w / 2 - pr, bs = Math.max(0, bw / 2 - br)
  // Point on the pill's lower-left outline at half-width a, and the outline's direction there (heading inward).
  const onPill = (a) => { if (a <= ps) return [cx - a, pb, 1, 0]; const co = (a - ps) / pr, si = Math.sqrt(1 - co * co); return [cx - ps - pr * co, py + pr * si, si, co] }
  // Point on the blob's upper-left outline at half-width a, and the outline's direction there (heading outward).
  const onBlob = (a) => { if (a <= bs) return [cx - a, by, -1, 0]; const co = Math.min(1, (a - bs) / br), si = Math.sqrt(1 - co * co); return [cx - bs - br * co, by + br - br * si, -si, co] }
  // Attachments slide in from each shape's edge as the neck thins. On the blob it lands at most a fillet's
  // width past the island, on the top edge, so a wide card meets the island in a curve, not a corner.
  const reach = Math.sqrt(n), FILLET = 22
  const [x0, y0, dx0, dy0] = onPill((PILL.w / 2) * reach), [x3, y3, dx3, dy3] = onBlob(Math.min(bw / 2, PILL.w / 2 + FILLET) * reach)
  const ym = (y0 + y3) / 2, snap = 1 - clamp(n / 0.3)
  const wn = Math.min(cx - x0, cx - x3) * smoothstep(0.3, 1, n)
  const yt = lerp(ym, pb - 3, snap), yb = lerp(ym, by + 3, snap)
  // Handles: vertical at the waist, along the outline at each attachment, sized like a round fillet.
  const vT = Math.max(0, yt - y0), vB = Math.max(0, y3 - yb)
  const hT = 0.55 * Math.max(vT, Math.abs(cx - wn - x0)), hB = 0.55 * Math.max(vB, Math.abs(cx - wn - x3)), wT = 0.55 * vT, wB = 0.55 * vB
  const down = (sx) => { c.moveTo(cx + sx * (cx - x0), y0); c.bezierCurveTo(cx + sx * (cx - x0 - dx0 * hT), y0 + dy0 * hT, cx + sx * wn, yt - wT, cx + sx * wn, yt) }
  const up = (sx) => { c.bezierCurveTo(cx + sx * wn, yt - wT, cx + sx * (cx - x0 - dx0 * hT), y0 + dy0 * hT, cx + sx * (cx - x0), y0) }
  const toBlob = (sx) => c.bezierCurveTo(cx + sx * wn, yb + wB, cx + sx * (cx - x3 + dx3 * hB), y3 - dy3 * hB, cx + sx * (cx - x3), y3)
  const fromBlob = (sx) => c.bezierCurveTo(cx + sx * (cx - x3 + dx3 * hB), y3 - dy3 * hB, cx + sx * wn, yb + wB, cx + sx * wn, yb)
  c.beginPath()
  if (snap <= 0) {
    // Joined: one outline, pill → waist → blob on the left, back up on the right; the chords run inside both shapes.
    down(-1); toBlob(-1); c.lineTo(cx + (cx - x3), y3); fromBlob(1); up(1); c.closePath()
  } else {
    // Snapped: a drip hanging from the pill and a bead rising from the blob, both drawing back in.
    down(-1); c.lineTo(cx + wn, yt); up(1); c.closePath()
    c.moveTo(cx - wn, yb); toBlob(-1); c.lineTo(cx + (cx - x3), y3); fromBlob(1); c.closePath()
  }
  c.fill()
}
/** The heart-rate card pours out of the Dynamic Island like ink: a black drop the size of the island
 *  slides down out of it, joined by a liquid neck while it widens into the card, the neck pinches and
 *  snaps, and only then does the drop clear into dark glass and show the readout. It grows as the
 *  check rows arrive. Before the nudge it plays the same morph in reverse: the readout fades, the glass
 *  turns back to ink, and the drop rises, rejoins the island and is drawn back into it. */
function island(c, t, T, V) {
  const d = D.island, C = CARD_HR, H = C.h0 + extraOf(V) * (V.checks ? islandGrow(t, T) : 1)
  // Open: a spring with a slow start (x^1.6), so the drop hangs a moment before it falls.
  const open = springy(seg(t, T.det, T.det + d.dur) ** 1.6, d.bounce)
  // Close: one even ease over `close` seconds, ending as the nudge arrives.
  const c1 = T.buzz + 0.1, c0 = c1 - d.close, shut = S(t, c0, c1)
  const e = open * (1 - shut)
  if (e <= 0.003) return
  // The neck: pinches once the drop has nearly arrived, and rejoins early in the close, as the drop nears the island.
  const pinch = T.det + d.dur * 0.68
  const n = t < c0 ? 1 - S(t, T.det + d.dur * 0.42, pinch) : S(t, c0 + d.close * 0.08, c0 + d.close * 0.32)
  // Ink → dark glass after the snap; glass → ink before the close. The readout follows the glass.
  const g = Math.min(S(t, pinch - 0.1, pinch + 0.3), 1 - S(t, c0 - 0.3, c0 + 0.02))
  const full = Math.min(S(t, pinch, pinch + 0.3), 1 - S(t, c0 - 0.5, c0 - 0.28))
  // The drop keeps the island's width for its first moments, then widens; the spring's overshoot is
  // mostly in the height, so the card never runs off the screen.
  const ew = e > 1 ? 1 + (e - 1) * 0.25 : smoothstep(0.2, 1, e)
  const w = lerp(PILL.w, C.w, ew), h = lerp(PILL.h, H, e), x = 195 - w / 2, y = lerp(PILL.y, C.y, Math.min(e, 1)), r = Math.min(lerp(PILL.h / 2, C.r, e), h / 2)
  // The glass is opaque (it paints its own blurred wallpaper), so it goes down first at full strength
  // and the ink fades off it; cross-fading the two would let the lock screen show through mid-way.
  // Only the glass's shadow fades in with it.
  if (g > 0) frost(c, x, y, w, h, r, g < 1 ? { ...FROST.dark, shadow: `rgba(0,6,16,${(0.42 * g).toFixed(3)})` } : FROST.dark)
  if (g < 1) {
    c.save(); c.globalAlpha *= 1 - g; c.fillStyle = '#000'
    c.beginPath(); c.roundRect(x, y, w, h, r); c.fill()
    neck(c, n, y, w, r)
    c.restore()
  }
  if (full <= 0.01) return
  const k = Math.min(1, w / C.w)
  c.save(); c.beginPath(); c.roundRect(x, y, w, h, r); c.clip(); c.globalAlpha *= full
  c.translate(195 - (C.w * k) / 2, y); c.scale(k, k); readout(c, t, T, V); c.restore()
}

      function timeline(rate, win) {
  const Q = D.seq, G = D.signal, T = { phoneIn: 0.05, meet: Q.meet }
  T.luck = T.meet + Q.meetToLuck; T.luckOut = T.luck + Q.luckHold; T.skip = T.luckOut + 0.1
  // Hour steps: fade to 3:00, hold, fade to 5:00, hold, fade to the evening reading.
  T.k = [T.skip, T.skip + Q.fade + Q.hold3, T.skip + 2 * Q.fade + Q.hold3 + Q.hold5]
  T.passEnd = T.k[2] + Q.fade; T.det = T.passEnd + Q.toIsland
  T.risen = T.det + 0.3 + G.rise
  T.buzz = T.risen + G.gap + shownChecks().length * G.row + G.hold
  T.press = T.buzz + Q.nudgeRead; T.unlock = T.press + 0.1
  // Tapping the nudge opens Momo straight on Freeform: Momo and the record orb.
  T.voice = T.unlock + 0.15
  // Freeform opens with only the mode pill and the record orb; the tap starts the take and the
  // flat voice line; the first word follows.
  T.rec = T.voice + Q.toRecord; T.talk = T.rec + Q.recordToTalk
  // Cut while they're still talking: the handoff starts right after "shit…", mid-sentence.
  let t = T.talk + (words().indexOf(CUT_AFTER) + 1 + CUT_LEAD) * Q.word
  // No stop tap, no reflection: the recording keeps going while the film settles into the hero.
  T.stop = T.proc = T.cards = T.check = 1e9
  T.calm = t; T.hero = T.calm + Q.handoff; T.dur = +(T.hero + Q.endHold).toFixed(1)
  return T
}

function film(V) {
  const T = timeline(), tokens = words().map((w,i) => ({text:w,at:T.talk+i*D.seq.word}))
  const live = (x) => S(x, T.talk - .1, T.talk + .6)
  const speakEnd = T.talk + tokens.length * D.seq.word
  /** The prototype's simulated voice (recorder.jsx useRecorder): each word swells like a syllable. The
   *  jitter is a slow, shallow drift rather than the prototype's 170 ms flicker, so the take reads calm and even. */
  const voiceLevel = (x) => {
    const i = Math.floor((x - T.talk) / D.seq.word)
    if (i < 0 || i >= tokens.length) return 0
    const syllable = Math.pow(Math.sin(Math.PI * ((x - tokens[i].at) / D.seq.word)), 0.7)
    return (0.45 + 0.4 * syllable) * (0.9 + 0.1 * Math.sin(x * 2.1))
  }
  // The band's phase clock: slow before the take, quick while they talk, easing back to real time (rate 1,
  // the page band's clock) by the hero, so the page band can pick the phase up without a jump.
  const voiceClock = clockTable(T.dur, x => lerp(.25, lerp(lerp(1.4, .45, S(x, T.talk, T.calm + .6)), 1, S(x, T.calm, T.hero)), live(x)))
  const heartClock = clockTable(T.dur, x => lerp(1.9, .9, S(x, T.talk, T.calm)))
  const meta = V.meta
  const F = {
    ...meta, dur: T.dur,
    draw(a) {
      const t = a.t
      const calm = S(t, T.talk + 0.6, T.calm + 0.5)
      const talking = Math.min(S(t, T.talk - 0.2, T.talk + 0.2), 1 - S(t, T.stop - 0.2, T.stop + 0.3))
      // Tapping the nudge launches Momo the iOS way: the app window springs out of the pressed
      // notification to fill the screen, with the app's first frame scaled inside it, while the lock
      // screen behind zooms in a touch, blurs and dims. `launch` drives the window, `app` the cross-fade
      // from the notification's glass face to the app's frame inside it.
      // The window follows a critically damped spring (no overshoot), normalised to land exactly at
      // `duration`. All of it is tuned live from Momo intro › App launch (see setAppLaunch).
      const L = LAUNCH, crit = (x) => 1 - (1 + L.spring * x) * Math.exp(-L.spring * x)
      const launch = clamp(crit(clamp(t - T.unlock, 0, L.duration)) / crit(L.duration)), launched = t >= T.unlock + L.duration, launching = t >= T.unlock && !launched
      const app = S(t, T.unlock, T.unlock + L.face)
      const down = bump(t, T.press - 0.08, T.press + 0.3), pressK = 1 - L.press * down
      const recede = (c) => {
        if (!launching) return
        const z = 1 + L.zoom * launch, b = blurPx(c, L.blur * launch)
        c.translate(195, SH / 2); c.scale(z, z); c.translate(-195, -SH / 2)
        if (b > 0.3) c.filter = `blur(${b}px)`
      }

      // Warm flush from the moment the body reacts, cooling as they talk.
      a.under((c) => {
        const g = c.createRadialGradient(480, 280, 0, 480, 280, 600), k = 1 - S(t, T.hero - 0.6, T.hero + 0.2)
        g.addColorStop(0, `rgba(${Math.round(lerp(255, 120, calm))},${Math.round(lerp(176, 200, calm))},${Math.round(lerp(196, 250, calm))},${lerp(0.22, 0.12, calm) * k * S(t, T.det + 0.4, T.det + 1.6)})`); g.addColorStop(1, 'rgba(245,245,245,0)')
        c.fillStyle = g; c.fillRect(0, 0, W, 540)
      })

      // Phone → hero hand-off (Phone → hero transition dropdown).
      const HO = OPT.handoff, hk = S(t, T.calm - 0.2, T.hero + 0.2)
      const outA = { fade: 1 - S(t, T.calm, T.calm + 0.7), settle: 1 - S(t, T.hero + 0.1, T.hero + 0.6), rise: 1 - S(t, T.calm - 0.1, T.calm + 0.7), dissolve: 1 - S(t, T.calm + 0.1, T.calm + 1.0), pull: 1 - S(t, T.calm + 0.4, T.hero) }[HO] ?? 1
      const ph = Math.min(S(t, T.phoneIn, T.phoneIn + 0.7), outA)
      // Extra phone transform about the phone centre: [dx, dy, scale], and blur px.
      const ht = [0, 0, 1]
      // No canvas blur on the dissolve: a 14px Canvas2D blur cost up to 44ms per Retina frame
      // and made the braid handoff stutter. The phone already fades out over the same span.
      const blur = 0
      const pk = 500 / PHONE.h, pw = PHONE.w * pk
      const py = 280 + (1 - S(t, 0.05, 0.7)) * 50
      const handT = (c) => { c.translate(480 + ht[0], py + ht[1]); c.scale(ht[2], ht[2]); c.translate(-480, -py); if (blur > 0.3) c.filter = `blur(${blur}px)` }
      const scr = { x: 480 - pw / 2 + PHONE.sx * pk, y: py - 250 + PHONE.sy * pk, w: PHONE.sw * pk, h: PHONE.sh * pk, r: PHONE.r * pk }
      const u = scr.w / 390

      // Camera: lean in on the lock screen (to the island for that variant), the transcript, then the reflection.
      const inLock = S(t, 0.5, 1.3) * (1 - S(t, T.unlock - 0.2, T.unlock + 0.7 * LAUNCH.duration))
      // The lock-screen zoom eases out as Momo opens and the talk zoom eases in before the first word,
      // so the record tap reads on the whole screen and the shot never snaps.
      const inTalk = S(t, T.talk - 0.9, T.talk + 1.0) * (1 - S(t, T.calm - 0.4, T.hero))
      const inCards = S(t, T.cards - 0.2, T.cards + 0.8) * (1 - S(t, T.calm - 0.5, T.calm + 0.5))
      const IH = CARD_HR.y - 11 + CARD_HR.h0 + extraOf(V), atIsland = S(t, T.det - 0.2, T.det + 0.4) * (1 - S(t, T.buzz - 0.4, T.buzz + 0.2)), lockY = lerp(300, 11 + IH / 2 + 24, atIsland)
      const z = 1 + lerp(0.6, 0.6 + D.island.zoom * Math.min(1, 196 / (IH - 30)), atIsland) * inLock + 0.42 * inTalk + 0.36 * inCards
      const wsum = inLock + inTalk + inCards, focus = (scr.y + lockY * u) * inLock + (scr.y + 560 * u) * inTalk + (scr.y + 330 * u) * inCards
      const fx = 480, fy = lerp(280, focus / Math.max(1e-6, wsum), clamp(wsum))
      // One camera offset moves bezel, screen, voice band and taps together. Blend by the
      // existing camera weights, so repeated lock-screen sequences share one framing dial.
      const pos = a.phonePosition
      const offsetY = lerp(pos.lockScreenY, pos.signalCheckY, atIsland) * inLock + pos.voiceReflectionY * inTalk
      const view = (c) => { c.translate(480, 270 + offsetY); c.scale(z, z); c.translate(-fx, -fy) }
      const cx = (x) => (x - fx) * z + 480, cy = (y) => (y - fy) * z + 270 + offsetY

      // The braid is their voice: it appears only once they talk, then opens into the calm line.
      const rt = voiceClock(t)
      const hb = pulse(heartClock(t)) * (1 - calm)
      const B = D.braid
      let p = { x: 480 + B.x * u, y: scr.y + scr.h * 0.9 + B.y * u, len: scr.w * 0.8 * B.len * B.scale, sc: 0.3 * B.scale }
      const target = a.braidTarget ?? { x: 480, y: 45.3, width: 187 }
      // Straight from the phone to its place at the top of the page as soon as the handoff begins: no
      // detour through a big centred band, and no stall before it moves. It never dips below its slot,
      // so as the page scrolls the title up it rides above the title instead of crossing it.
      const rest = { x: (target.x - 480) / z + fx, y: (target.y - 270 - offsetY) / z + fy, len: target.width / z, sc: .336 }
      p = mix(p, rest, S(t, T.calm, T.hero)); p.y = Math.min(p.y, rest.y)
      // The band swells with the same voice level that drives the glow, as in the prototype; on the way
      // up it settles to the page band's idle energy, so the cross-fade at the end swaps like for like.
      const speech = Math.min(1.4, voiceLevel(t)), settleUp = S(t, T.calm, T.hero - 0.4)
      const bAlpha = S(t, T.rec - 0.1, T.rec + 0.5) * (1-S(t,T.hero-.35,T.hero)), flat = lerp(0.1, 1, live(t))
      const env = lerp(lerp(0, lerp(lerp(0.85 + 0.15 * hb, 0.12, calm), speech, talking * 0.8), live(t)), target.env ?? 0.15, settleUp)
      a.draw((c) => {
        if (bAlpha <= 0.01) return
        // Compose the film transform (canvas px per film px) with the band's own scene transform.
        const sc = (p.len * z) / BRAID_W, bx = cx(p.x), by = cy(p.y)
        setRT(rt)
        const o = braidOff.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, 600, 260)
        drawBraid(o, [1, -180, -115], { env, alpha: 1 })
        c.save(); c.globalAlpha *= bAlpha; c.drawImage(braidOff, bx - 300 * sc, by - 130 * sc * flat, 600 * sc, 260 * sc * flat); c.restore()
      })

      a.under((c) => {
        if (ph <= 0.01) return
        c.save(); view(c); handT(c); c.globalAlpha = ph; c.beginPath(); c.roundRect(scr.x - 3, scr.y - 3, scr.w + 6, scr.h + 6, scr.r + 6); c.clip()
        c.translate(scr.x, scr.y); c.scale(u, u); recede(c); screenBg(c, t, launched ? 1 : 0)
        c.restore()
      })
      a.draw((c) => {
        if (ph <= 0.01) return
        const th = THEMES[OPT.bg], lift = 1 - 0.03 * S(t, T.calm, T.calm + 0.7)
        c.save(); view(c); handT(c); c.globalAlpha = ph
        c.translate(480, py); c.scale(lift, lift); c.translate(-480, -py)
        c.save(); c.beginPath(); c.roundRect(scr.x, scr.y, scr.w, scr.h, scr.r); c.clip(); c.translate(scr.x, scr.y); c.scale(u, u)
        const winAt = () => launchWin(launch, noticeH(c, COPY[OPT.copy]), pressK, scr.r / u)

        // Lock screen: the good-luck note, the afternoon passing, the Watch noticing, Momo's nudge.
        if (!launched) {
          c.save(); recede(c)
          const RND = "'SF Pro Rounded', ui-rounded, Inter, system-ui, sans-serif"
          c.font = `500 17px ${th.rounded ? RND : UI}`; c.fillStyle = th.dateInk; c.textAlign = 'center'; c.textBaseline = 'middle'; rounded(c, 'Wednesday, October 1', 195, 104, 17)
          c.font = th.rounded ? `500 88px ${RND}` : `300 84px ${UI}`; c.letterSpacing = th.rounded ? '0px' : '-2px'; c.fillStyle = th.lockInk; c.textAlign = 'center'
          if (t < T.skip || t >= T.passEnd) rounded(c, fmt(t < T.skip ? 838 : mNow(t, T, V) + EVE), 195, 170, 88)
          else {
            // Hours ease by: each time holds, then soft cross-fades upward into the next (blur + drift, no ticking).
            const STEPS = [838, 900, 1020, V.m0 + EVE], F = D.seq.fade
            const j = T.k.findIndex((k) => t >= k && t < k + F), held = STEPS[T.k.filter((k) => t >= k + F).length]
            const pairs = j < 0 ? [[held, 1, 0]] : (() => { const k = S(t, T.k[j], T.k[j] + F); return [[STEPS[j], 1 - k, -14 * k], [STEPS[j + 1], k, 14 * (1 - k)]] })()
            const base = c.globalAlpha
            pairs.forEach(([m, al, dy]) => {
              if (al <= 0.01) return
              c.save(); c.globalAlpha = base * al; const b = 6 * (1 - al); if (b > 0.3) c.filter = `blur(${b}px)`; rounded(c, fmt(m), 195, 170 + dy, 88); c.restore()
            })
          }
          // Time passing: the 1:1 ticks by as a calendar card, and the wallpaper dims toward evening.
          // Meeting card first; Momo's note then stacks on top (newest first) and pushes it down; it returns as "Ended" at 3:00.
          const pa = Math.min(S(t, T.meet, T.meet + 0.5), 1 - S(t, T.k[1] - 0.5, T.k[1] + D.seq.fade * 0.5)), done = S(t, T.k[0] + D.seq.fade * 0.4, T.k[0] + D.seq.fade)
          const stacked = S(t, T.luck, T.luck + 0.5) * (1 - S(t, T.luckOut, T.luckOut + 0.5)), my = 300 + stacked * 116 + (1 - S(t, T.meet, T.meet + 0.5)) * 24
          if (pa > 0.01) { c.save(); c.globalAlpha *= pa
            frost(c, 16, my, 358, 66, 24)
            tile(c, 28, my + 11, 44)
            sf(c, 'clock', 50, my + 33, 24, done > 0.5 ? '#34c759' : '#4a8fe8')
            tx(c, MEET.title, 84, my + 23, 15, { w: 700, color: NINK.title }); tx(c, done > 0.5 ? MEET.ended : MEET.now, 84, my + 44, 13.5, { color: NINK.body })
            c.restore() }; c.letterSpacing = '0px'
          if (th.buttons) {
            ;[[71, 'M0 2.4H10.38V1.91C10.38.62 9.74 0 8.51 0H1.87C.64 0 0 .62 0 1.91ZM3.96 22.96H6.42C7.65 22.96 8.28 22.34 8.28 21.05V10.16C8.28 9.09 8.53 8.31 8.92 7.71L9.59 6.73C10.06 6 10.38 5.31 10.38 4.44V3.6H0V4.44C0 5.31.32 6 .79 6.73L1.45 7.71C1.85 8.31 2.09 9.09 2.09 10.16V21.05C2.09 22.34 2.73 22.96 3.96 22.96Z', 10.38, 22.96], [319, 'M3.29 20H22.47C24.65 20 25.76 18.91 25.76 16.75V5.77C25.76 3.61 24.65 2.53 22.47 2.53H19.47C18.64 2.53 18.39 2.36 17.91 1.84L17.07.89C16.55.32 16.02 0 14.93 0H10.75C9.67 0 9.14.32 8.61.89L7.77 1.84C7.3 2.35 7.04 2.53 6.22 2.53H3.29C1.1 2.53 0 3.61 0 5.77V16.75C0 18.91 1.1 20 3.29 20ZM12.88 16.91C9.7 16.91 7.15 14.37 7.15 11.17 7.15 7.98 9.7 5.44 12.88 5.44 16.06 5.44 18.6 7.98 18.6 11.17 18.6 14.37 16.05 16.91 12.88 16.91ZM12.88 15.31C15.17 15.31 17.01 13.48 17.01 11.17 17.01 8.87 15.17 7.03 12.88 7.03 10.59 7.03 8.74 8.87 8.74 11.17 8.74 13.48 10.6 15.31 12.88 15.31Z', 25.76, 20]].forEach(([x, d, w, h]) => {
              const y = SH - 50 - 25 - 34 * (SH / 852) + 34
              c.fillStyle = 'rgba(21,21,21,0.35)'; c.beginPath(); c.arc(x, y, 25, 0, TAU); c.fill()
              c.save(); c.translate(x - w / 2, y - h / 2); c.fillStyle = '#fff'; c.fill(new Path2D(d), 'evenodd'); c.restore()
            })
          }
          notice(c, 300 - (1 - S(t, T.luck, T.luck + 0.5)) * 24, Math.min(S(t, T.luck, T.luck + 0.5), 1 - S(t, T.luckOut, T.luckOut + 0.4)), COPY.luck)
          const nk = S(t, T.buzz, T.buzz + 0.45)
          if (t < T.unlock) {
            c.save(); c.translate(NOTE.cx, NOTE.cy); c.scale(pressK, pressK); c.translate(-NOTE.cx, -NOTE.cy)
            const nh = notice(c, NOTE.y - (1 - nk) * 24, nk, COPY[OPT.copy])
            if (nh && down > 0.01) { c.fillStyle = `rgba(20,40,60,${0.1 * down})`; c.beginPath(); c.roundRect(NOTE.x, NOTE.y, NOTE.w, nh, NOTE.r); c.fill() }
            c.restore()
          }
          c.restore()
        }
        island(c, t, T, V)

        // The app window: dim the lock screen, then the notification's face gives way to the app's
        // flat background inside the growing window.
        const W = winAt()
        if (launching) {
          c.save(); c.fillStyle = `rgba(0,0,0,${L.dim * launch})`; c.fillRect(0, 0, 390, SH)
          c.beginPath(); c.roundRect(W.x, W.y, W.w, W.h, W.r); c.clip()
          if (app < 0.99) {
            c.save(); c.globalAlpha *= 1 - app; frost(c, W.x, W.y, W.w, W.h, W.r)
            const k = W.w / NOTE.w; c.translate(W.x, W.y); c.scale(k, k); c.translate(-NOTE.x, -NOTE.y); notice(c, NOTE.y, 1, COPY[OPT.copy])
            c.restore()
          }
          c.globalAlpha *= app; c.fillStyle = '#fafafa'; c.fillRect(W.x, W.y, W.w, W.h)
          c.restore()
        }
        const voiceIn = S(t, T.voice - 0.05, T.voice + 0.7)

        // Inside Momo, drawn into the launch window until it fills the screen.
        c.save(); if (launching) enterWin(c, W)
        if (app > 0.01) { c.save(); c.globalAlpha *= app; backButton(c); c.restore() }

        // Inside Momo: the voice screen, the question, the reflection.
        // One Momo across the cut: asleep and small near the top when the app opens; the record tap wakes
        // it, and it glides down to the centre and grows while its eyes open, staying awake as they talk.
        const M = D.momo, EZ = { smooth: (x) => x * x * (3 - 2 * x), spring: (x) => springy(x, 0.25), float: (x) => (x < 0.5 ? 16 * x ** 5 : 1 - (-2 * x + 2) ** 5 / 2) }[OPT.mease]
        const w0 = T.rec + 0.1 + M.eyesAt
        const grow = EZ(seg(t, T.voice - 0.2, T.voice - 0.2 + M.grow)), wake = EZ(seg(t, w0, w0 + M.settle))
        const shut = 1 - (OPT.eyes === 'blink' ? S(t, w0 + M.eyes * 0.45, w0 + M.eyes * 0.55) : OPT.eyes === 'dissolve' ? S(t, w0, w0 + M.eyes * 2.2) : S(t, w0, w0 + M.eyes))
        const squint = OPT.eyes === 'blink' ? 1 - 0.1 * bump(t, w0, w0 + M.eyes) : 1
        const mx = 195, my = lerp(M.talkY, M.openY, wake), ms = lerp(M.talkS * lerp(0.88, 1, grow), M.openS, wake)
        const mA = ph * app * S(t, T.voice - 0.2, T.voice + 0.4) * (1 - S(t, T.cards - 0.4, T.cards))
        c.save(); c.translate(mx, my); c.scale(1, squint); c.translate(-mx, -my)
        // Asleep → awake: the asleep clip is drawn at awake Momo's body size, and through the cross-fade
        // both frames glide between the two bodies' positions, under a soft blur, so the body never jumps.
        const awake = a.momoFrames.awake ?? IMG.momoOpen, asleep = a.momoFrames.asleep ?? IMG.momo
        const dy = shut > 0.001 && shut < 0.999 && mA > 0.01 ? (bodyY(awake) - 0.5) * ms - (bodyY(asleep) - 0.5) * ms * ASLEEP_K : 0
        const soft = OPT.eyes === 'blink' ? 0 : 1.6 * Math.sin(Math.PI * shut)
        if (soft > 0.2) c.filter = `blur(${blurPx(c, soft)}px)`
        c.globalAlpha = mA * (1 - shut); momo(c, mx, my - dy * shut, ms, t, talking, awake)
        c.globalAlpha = mA * shut; momo(c, mx, my + dy * (1 - shut), ms * ASLEEP_K, t, 0, asleep)
        c.restore()
        c.globalAlpha = ph * voiceIn
        transcript(c, tokens, t)
        c.restore()
        c.globalAlpha = ph; statusBar(c, launch > 0.5 ? '#1f1f1f' : th.statusInk ?? '#1f1f1f', 1 - launch)
        c.restore()
        c.globalAlpha = ph; c.drawImage(IMG.phone, 480 - pw / 2, py - 250, pw, 500)

        c.restore()
      })
      // The bottom controls go on the top layer, above the VoiceBeam: the glow stays under the buttons.
      a.top((c) => {
        if (ph <= 0.01) return
        const voiceIn = S(t, T.voice - 0.05, T.voice + 0.7), lift = 1 - 0.03 * S(t, T.calm, T.calm + 0.7)
        if (voiceIn <= 0.01) return
        view(c); handT(c); c.globalAlpha = ph * voiceIn
        c.translate(480, py); c.scale(lift, lift); c.translate(-480, -py)
        c.beginPath(); c.roundRect(scr.x, scr.y, scr.w, scr.h, scr.r); c.clip(); c.translate(scr.x, scr.y); c.scale(u, u)
        if (launching) enterWin(c, launchWin(launch, noticeH(c, COPY[OPT.copy]), pressK, scr.r / u))
        // The bar slides up from below the screen's bottom edge as the app window finishes filling the screen.
        c.translate(0, 110 * (1 - OUT(seg(t, T.unlock + 0.45, T.unlock + 1.3))))
        controls(c, t, 'Freeform', T.rec)
      })
      const sx = (x) => cx(scr.x + x * u), sy = (y) => cy(scr.y + y * u)
      // Glass cursor (prototype .nx-cursor): glides in, presses (shrinks, darkens), lifts away.
      // `lead`: how long before the press the cursor appears; the record button gets a slower, longer approach.
      // `ox`/`oy`: where it lifts to; the record button sits in the corner, so that cursor lifts back up.
      const TAPS = [[T.press, 195, 340, 250, 520, 1.1, 40, 60], [T.rec, 345, 790, 250, 680, 1.6, -40, -60]]
      for (const [at, x, y, x0, y0, lead, ox, oy] of TAPS) {
        const vis = Math.min(S(t, at - lead, at - lead + 0.3), 1 - S(t, at + 0.45, at + 0.8))
        if (vis <= 0.01) continue
        const go = S(t, at - lead + 0.1, at - 0.12), off = S(t, at + 0.3, at + 0.8), down = bump(t, at - 0.08, at + 0.3)
        const px = sx(lerp(lerp(x0, x, go), x + ox, off)), py2 = sy(lerp(lerp(y0, y, go), y + oy, off)), r = D.cursor.size * u * z * (1 - D.cursor.press * down)
        a.top((c) => {
          c.save(); c.globalAlpha = vis * ph
          c.shadowColor = 'rgba(0,0,0,0.18)'; c.shadowBlur = 18; c.shadowOffsetY = 4
          c.fillStyle = `rgba(210,214,222,${D.cursor.fill + 0.2 * down})`; c.beginPath(); c.arc(px, py2, r, 0, TAU); c.fill()
          c.shadowColor = 'transparent'; c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1; c.stroke()
          c.restore()
        })
      }
      // The VoiceBeam host: the screen's rect after the camera, in film px. It glows from the first
      // word until the last one ends (the prototype's `active`), then fades out on its own.
      a.beam = { x: cx(scr.x), y: cy(scr.y), w: scr.w * z, h: scr.h * z, active: ph > 0.5 && t >= T.talk && t < speakEnd + 0.25, level: voiceLevel(t), rt }
    },
  }
  return F
}

const V = {m0:884,m1:887,base:[64,78],stillSince:879,day:true,checks:true,style:'pending',hr:m=>79+24*S(m,885,886)+noise(m),hrv:m=>lerp(52,28,S(m,885.3,886.5)),move:()=>3}
export const PHONE_TIMELINE = timeline()
const cut = film(V)
/**
 * Draws the film into `ctx`, and the bottom controls and tap cursor into `topCtx` (the layer above
 * the VoiceBeam; without one they land on `ctx`). Returns the VoiceBeam host rect (film px) with its
 * `active` gate and voice `level`.
 */
export function drawPhoneFilm(ctx,t,m,braidTarget,phonePosition,momoFrames,topCtx=ctx,topM=m) {
  const under=[], ink=[], top=[], a={t,braidTarget,phonePosition,momoFrames,under:fn=>under.push(fn),draw:fn=>ink.push(fn),top:fn=>top.push(fn)}
  cut.draw(a)
  const layer = (c, mm, fns) => { c.save(); c.setTransform(mm[0],0,0,mm[0],mm[1],mm[2]); for (const fn of fns) { c.save(); fn(c); c.restore() } c.restore() }
  layer(ctx, m, [...under, ...ink])
  layer(topCtx, topM, top)
  return a.beam
}
