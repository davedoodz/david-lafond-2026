/* eslint-disable */
/** Approved phone-only cut from studio/unwind-intro-phone.html; saved settings baked in. */
import { drawBraid, setRT } from './braid.js'
import { LOCK_FONT } from './lockGlyphs.js'
const W = 960, TAU = Math.PI * 2
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const lerp = (a,b,t) => a+(b-a)*t
const seg = (t,a,b) => clamp((t-a)/(b-a))
const UI = 'Inter, system-ui, sans-serif', EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", sans-serif', BLUE = '#61A8FD'
const PHONE = { w:874,h:1780,sx:46,sy:39,sw:784,sh:1702,r:113 }, SH = PHONE.sh / PHONE.sw * 390
const BRAID_W = 2 * 320 * .87
const braidOff = Object.assign(document.createElement('canvas'), {width:600,height:260})
const D = {"island":{"pad":4,"dur":0.6,"bounce":0.35,"w":366,"hgt":196,"r":44,"zoom":0.45},"status":{"sigX":0,"sigY":0,"wifiX":3,"wifiY":0,"batX":0,"batY":0},"notif":{"y":3,"x":0,"size":38},"seq":{"meet":0.4,"meetToLuck":1.2,"luckHold":1.8,"fade":0.6,"hold3":0.9,"hold5":0.2,"toIsland":0.3,"nudgeRead":2.4,"askRead":2,"toVoice":0.15,"word":0.17,"afterTalk":0.4,"handoff":1.6,"endHold":1.4},"signal":{"rise":1.85,"gap":0.6,"row":0.85,"hold":1.2},"momo":{"grow":0.8,"wait":1.3,"eyesAt":0,"eyes":0.35,"settle":0.6,"openY":383,"openS":230,"talkY":333,"talkS":160},"braid":{"x":0,"y":0,"scale":1.3,"len":1},"cards":{"size":26,"ix":0,"iy":0},"cursor":{"size":23,"press":0.18,"fill":0.42}}
const OPT = {pause:'bars',bg:'paper',copy:'nudge',sub:'saved',emoji:'saved',align:'left',handoff:'dissolve',eyes:'fade',mease:'smooth'}
const COPY = {"luck":{"title":"Good luck with the presentation 🍀","body":"Deep breaths before you walk in.\nYou totally got this! 😌"},"nudge":{"title":"Wanna debrief? ☁️","body":"I noticed your body’s still a little stressed from that presentation. I'm here if you wanna yap about it 👀"}}
const MEET = {"title":"Design Pitch - Internal Team","now":"2:00 – 2:45 PM · now","ended":"Ended 2:45 PM"}, CARD = {"titles":["Just listen","Help me think"],"subs":["Need to vent","Need guidance"],"icons":["☁️","🌱"]}
const CARD_SUB = {saved:CARD.subs}, CARD_ICON = {saved:CARD.icons}
const CHECKS = [{"kind":"hr","text":"Heart rate up ~30 BPM in 2 min","state":"ok"},{"kind":"base","text":"Unusual for you at this hour","state":"ok"}]
const shownChecks = () => CHECKS
const extraOf = () => CHECKS.length * 23 + 12
const words = () => "Sarah kept pushing back on my concept in front of everyone, and I just… froze. I knew what to say but damn... I don't know why I just kept my opinions to myself...".trim().split(/\s+/)
const THEMES = {paper:{lockInk:'#9CF6FF',dateInk:'#9CF6FF',glass:'rgba(255,255,255,0.62)',statusInk:'#ffffff',rounded:true,buttons:true}}
const IMG = Object.fromEntries(Object.entries({lockwall:'lockwall',phone:'iphone',momo:'momo',momoOpen:'momo-open'}).map(([key,file]) => { const image = new Image(); image.src = '/work/unwind/intro/'+file+'.webp'; return [key,image] }))
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
function screenBg(c,t,app,talking) {
  if (app < .999) { const k = Math.max(390/IMG.lockwall.naturalWidth,SH/IMG.lockwall.naturalHeight); c.drawImage(IMG.lockwall,(390-IMG.lockwall.naturalWidth*k)/2,(SH-IMG.lockwall.naturalHeight*k)/2,IMG.lockwall.naturalWidth*k,IMG.lockwall.naturalHeight*k) }
  if (app > .001) { c.save(); c.globalAlpha *= app; const g=c.createLinearGradient(0,0,0,SH); g.addColorStop(0,'#fbfdff'); g.addColorStop(.55,'#f1f6fb'); g.addColorStop(1,'#d6eafa'); c.fillStyle=g; c.fillRect(-40,-40,470,SH+80); c.restore() }
  if (talking > .01) { const g=c.createRadialGradient(195,SH+40,0,195,SH+40,420); g.addColorStop(0,`rgba(120,190,252,${.55*talking})`);g.addColorStop(1,'rgba(120,190,252,0)');c.fillStyle=g;c.fillRect(0,0,390,SH) }
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
function momo(c, x, y, size, t, listen = 0, img = IMG.momo) {
  const sq = 1 + 0.02 * listen * Math.sin(t * 2.6), bob = Math.sin(t * 1.3) * 3
  c.drawImage(img, x - (size * sq) / 2, y - size / 2 + bob - size * 0.03, size * sq, size / sq)
}

/** Transcript: words appear on their time, newest in blue, older lines fade toward the top. */
function transcript(c, tokens, t, al) {
  const shown = tokens.filter((k) => k.at <= t)
  if (!shown.length || al <= 0.01) return
  const size = 19, maxW = 300, lines = [[]]
  c.font = `400 ${size}px ${UI}`
  const width = (ws) => c.measureText(ws.map((k) => k.text).join(' ')).width
  for (const k of shown) {
    if (k.q) { lines.push([k], []); continue }
    const cur = lines[lines.length - 1]
    if (cur.length && !cur[0].q && width([...cur, k]) > maxW) lines.push([k])
    else if (cur.length && cur[0].q) lines.push([k])
    else cur.push(k)
  }
  const vis = lines.filter((l) => l.length).slice(-4)
  const fades = [0.22, 0.45, 0.8, 1].slice(-vis.length)
  vis.forEach((line, li) => {
    const y = 600 - (vis.length - 1 - li) * 29
    if (line[0].q) { c.globalAlpha = al * fades[li]; tx(c, line[0].text, 195, y, 13.5, { w: 500, color: BLUE, align: 'center', ls: 0.2 }); return }
    c.font = `400 ${size}px ${UI}`
    let x = 195 - width(line) / 2
    for (const k of line) {
      const age = t - k.at, e = clamp(age / 0.5)
      c.globalAlpha = al * fades[li] * e
      c.fillStyle = rgb([97, 168, 253], [92, 108, 115], clamp((age - 0.25) / 0.6))
      c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(k.text, x, y + (1 - e) * 4)
      x += c.measureText(`${k.text} `).width
    }
  })
  c.globalAlpha = 1
}
function controls(c, t, al, mode, stopAt) {
  if (al <= 0.01) return
  c.save(); c.globalAlpha = al
  const y = 790
  c.font = `500 15px ${UI}`; const pw = 22 + c.measureText(mode).width + 8 + 12 + 19
  glass(c, 22, y - 23, pw, 46, 23, 'rgba(255,255,255,0.55)', 6)
  tx(c, mode, 44, y, 15, { w: 500 })
  c.strokeStyle = '#666'; c.lineWidth = 1.4; c.beginPath(); const cx = 22 + pw - 25; c.moveTo(cx - 3.5, y - 1.5); c.lineTo(cx, y + 2); c.lineTo(cx + 3.5, y - 1.5); c.stroke()
  const btn = (x, fill) => { glass(c, x - 23, y - 23, 46, 46, 23, fill, fill === '#1c1c1e' ? 14 : 6) }
  btn(229, 'rgba(255,255,255,0.55)'); btn(287, 'rgba(255,255,255,0.55)')
  c.strokeStyle = '#1f1f1f'; c.lineWidth = 2; c.lineCap = 'round'
  // Lucide icons (24-grid, stroke 2) at 20 px: rotate-ccw and pause.
  const lucide = (x, d) => { c.save(); c.translate(x - 10, y - 10); c.scale(20 / 24, 20 / 24); c.lineWidth = 2; c.lineJoin = 'round'; d.forEach((p) => c.stroke(new Path2D(p))); c.restore() }
  lucide(229, ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5'])
  const P = OPT.pause
  if (P === 'bars') { c.fillStyle = '#1f1f1f'; c.fillRect(282.5, y - 7, 3, 14); c.fillRect(288.5, y - 7, 3, 14) }
  else if (P === 'rounded') { c.fillStyle = '#1f1f1f'; c.beginPath(); c.roundRect(281.5, y - 7.5, 4, 15, 2); c.roundRect(288.5, y - 7.5, 4, 15, 2); c.fill() }
  else if (P === 'filled') { c.save(); c.translate(277, y - 10); c.scale(20 / 24, 20 / 24); c.fillStyle = '#1f1f1f'; c.beginPath(); c.roundRect(6, 4, 4, 16, 1); c.roundRect(14, 4, 4, 16, 1); c.fill(); c.restore() }
  else if (P === 'circle') lucide(287, ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M10 15V9', 'M14 15V9'])
  else lucide(287, ['M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z', 'M6 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z'])
  const press = 1 - 0.16 * bump(t, stopAt - 0.05, stopAt + 0.3)
  c.save(); c.translate(345, y); c.scale(press, press); c.translate(-345, -y)
  btn(345, '#1c1c1e')
  const g = c.createLinearGradient(337, y - 8, 353, y + 8); g.addColorStop(0, '#CDEBFF'); g.addColorStop(1, '#3E8EF7')
  c.fillStyle = g; c.beginPath(); c.roundRect(337, y - 8, 16, 16, 3.5); c.fill()
  c.restore(); c.restore()
}
/** `lock` 1 = lock screen (carrier at top left, as on iOS), 0 = in app (time). */
function statusBar(c, back = 1, ink = '#1f1f1f', lock = 0) {
  if (lock < 0.99) { c.save(); c.globalAlpha *= 1 - lock; tx(c, '9:41', 52, 30, 16, { w: 600, color: ink }); c.restore() }
  if (lock > 0.01) { c.save(); c.globalAlpha *= lock; tx(c, 'AT&T', 40, 30, 15, { w: 600, color: ink }); c.restore() }
  const B = D.status
  c.fillStyle = ink; [0, 1, 2, 3].forEach((i) => c.fillRect(278 + B.sigX + i * 5, 34 + B.sigY - (i + 1) * 2.6, 3, (i + 1) * 2.6))
  const wx = 306 + B.wifiX, wy = 35 + B.wifiY
  for (const [r0, r1] of [[9.6, 12.6], [5.6, 8.6]]) { c.beginPath(); c.arc(wx, wy, r1, -Math.PI * 0.75, -Math.PI * 0.25); c.arc(wx, wy, r0, -Math.PI * 0.25, -Math.PI * 0.75, true); c.closePath(); c.fill() }
  c.beginPath(); c.moveTo(wx, wy); c.arc(wx, wy, 4.6, -Math.PI * 0.75, -Math.PI * 0.25); c.closePath(); c.fill()
  c.beginPath(); c.roundRect(323 + B.batX, 24 + B.batY, 23, 12, 3.5); c.lineWidth = 1; c.strokeStyle = 'rgba(31,31,31,0.4)'; c.stroke(); c.beginPath(); c.roundRect(325 + B.batX, 26 + B.batY, 19, 8, 2); c.fill()
  if (back <= 0.01) return
  c.save(); c.globalAlpha *= back
  glass(c, 22, 62, 44, 44, 22, 'rgba(255,255,255,0.55)', 4)
  c.strokeStyle = '#1f1f1f'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(47, 77); c.lineTo(40, 84); c.lineTo(47, 91); c.stroke()
  c.restore()
}

function em(c, ch, x, y, size) { c.font = `${size}px ${EMOJI}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, x, y) }

function notice(c, y, al, n) {
  if (al <= 0.01) return
  const lines = n.body.split('\n').flatMap((para) => wrap(c, para, 262, 14)), h = 64 + lines.length * 19
  c.save(); c.globalAlpha *= al
  glass(c, 16, y, 358, h, 24, THEMES[OPT.bg].glass, 24)
  c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect(30, y + 14, 40, 40, 11); c.fill()
  c.fillStyle = '#EAF5FF'; c.beginPath(); c.roundRect(30, y + 14, 40, 40, 11); c.fill()
  { const N = D.notif; c.drawImage(IMG.momoOpen, 50 - N.size / 2 + N.x, y + 35 - N.size / 2 + N.y, N.size, N.size) }
  tx(c, 'Momo', 82, y + 23, 13, { w: 600, color: '#5d6b70' }); tx(c, 'now', 356, y + 23, 13, { color: '#8a979b', align: 'right' })
  tx(c, n.title, 82, y + 44, 15, { w: 600, color: '#1f2a2e' })
  lines.forEach((l, i) => tx(c, l, 82, y + 64 + i * 19, 14, { color: '#3b484c' }))
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
function hrDay(c, x0, y0, w, h, m, V) {
  const lo = 60, hi = 108, Y = (v) => y0 + h - clamp((v - lo) / (hi - lo)) * h
  const vals = [...DAY, V.hr(m)], n = vals.length, X = (i) => x0 + (i / (n - 1)) * w
  c.fillStyle = 'rgba(255,255,255,0.06)'; c.beginPath(); c.roundRect(x0, Y(V.base[1]), w, Y(V.base[0]) - Y(V.base[1]), 3); c.fill()
  const col = (v) => (v > V.base[1] + 6 ? HRC : '#8fb8e8')
  c.lineWidth = 1.8; c.lineCap = 'round'; c.lineJoin = 'round'
  for (let i = 1; i < n; i++) { c.strokeStyle = col(Math.max(vals[i - 1], vals[i])); c.beginPath(); c.moveTo(X(i - 1), Y(vals[i - 1])); c.lineTo(X(i), Y(vals[i])); c.stroke() }
  vals.forEach((v, i) => { c.fillStyle = col(v); c.beginPath(); c.arc(X(i), Y(v), i === n - 1 ? 3.2 : 1.6, 0, TAU); c.fill() })
  tx(c, '12 PM', x0, y0 + h + 9, 8.5, { color: '#6f6f6f' }); tx(c, 'now', x0 + w, y0 + h + 9, 8.5, { color: '#6f6f6f', align: 'right' })
}
const CHECK_ICON = { hr: (c, x, y) => sf(c, 'heart', x, y, 15, HRC), move: (c, x, y, t) => motionIcon(c, x, y, false, t), base: (c, x, y) => baseIcon(c, x, y), hrv: (c, x, y) => hrvIcon(c, x, y), resp: (c, x, y) => respIcon(c, x, y), ask: (c, x, y) => c.drawImage(IMG.momoOpen, x - 9, y - 9, 18, 18) }
/** The expanded island content, 358 × (176 + V.extra), dark. One number to read; motion and HRV quiet underneath. */
function readout(c, t, T, V) {
  const m = mNow(t, T, V), hr = V.hr(m), hrv = Math.round(V.hrv(m)), mv = V.move(m), still = mv < 20
  const mid = (V.base[0] + V.base[1]) / 2, high = hr > V.base[1] + 6
  // Heart rate: label, one big number, one line against a faint "usual" band.
  sf(c, 'heart', 24, 20, 15 * (1 + 0.14 * pulse(t * hr / 60)), HRC); tx(c, 'Heart rate', 38, 20, 12.5, { w: 500, color: '#9a9a9a' })
  const [label, ink] = V.status?.(m, hr, still) ?? (!still ? ['Moving · expected', MOVEC] : high ? [`+${Math.round(hr - mid)} vs your usual`, '#ff9aab'] : ['Your usual range', '#7a7a7a'])
  tx(c, label, 342, 20, 12, { w: 500, color: ink, align: 'right' })
  const v = String(Math.round(hr)); tx(c, v, 16, 72, 46, { w: 500, color: rgb([255, 255, 255], [255, 140, 158], clamp((hr - V.base[1]) / 14)), ls: -1.5 }); c.font = `500 46px ${UI}`; tx(c, 'BPM', 16 + c.measureText(v).width + 6, 84, 11, { w: 600, color: '#7a7a7a' })
  hrDay(c, 150, 48, 192, 44, m, V)
  c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(16, 114, 326, 1)
  // Motion and HRV: one quiet line each, own icon and colour.
  motionIcon(c, 26, 140, !still, t); tx(c, still ? `Still · ${Math.max(1, Math.round(m - V.stillSince))} min` : 'Walking', 44, 140, 13, { w: 500, color: '#d6d6d6' })
  hrvIcon(c, 196, 140); tx(c, `HRV ${hrv} ms${hrv <= Math.round(V.hrv(V.m0)) - 8 ? ' ↓' : ''}`, 214, 140, 13, { w: 500, color: '#d6d6d6' })
  // The detection logic, row by row (editable rows; hidden rows collapse).
  if (!V.checks) return
  const rows = shownChecks(), n = rows.length, st = V.style ?? 'list'
  const start = T.risen + D.signal.gap
  const at = (i) => start + i * D.signal.row
  const K = rows.map((_, i) => S(t, at(i), at(i) + Math.min(0.35, D.signal.row * 0.6)))
  const latest = K.reduce((m, k, i) => (k > 0.5 ? i : m), -1)
  const pa = S(t, start - 0.35, start)
  rows.forEach((r, i) => {
    const k = K[i], y = 170 + i * 23, { kind, text, state } = r
    const vis = st === 'pending' ? pa * lerp(0.32, 1, k) : k
    if (vis <= 0.01) return
    c.save(); c.globalAlpha *= vis * (state === 'off' ? 0.55 : 1) * (st === 'focus' && latest > i ? 0.6 : 1)
    if (st === 'focus' && i === latest) { c.save(); c.globalAlpha = c.globalAlpha * 1; c.fillStyle = 'rgba(255,255,255,0.09)'; c.beginPath(); c.roundRect(14, y - 11.5, 334, 23, 8); c.fill(); c.restore() }
    CHECK_ICON[kind](c, 28, y, t)
    tx(c, text, 46, y, 12, { w: state === 'go' ? 600 : 500, color: state === 'go' ? '#8fc3ff' : state === 'off' ? '#8a8a8a' : '#e5e5e5' })
    if (state === 'ok' || state === 'weak') {
      if (st === 'pending' && k < 0.5) { c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath(); c.arc(332, y, 6, t * 7, t * 7 + 4.2); c.stroke() }
      else { const sk = st === 'pending' ? clamp(pop(t, at(i), 0.4)) : 1; c.save(); c.translate(332, y); c.scale(sk, sk); c.fillStyle = state === 'ok' ? '#34c759' : 'rgba(52,199,89,0.45)'; c.beginPath(); c.arc(0, 0, 7, 0, TAU); c.fill(); c.strokeStyle = '#000'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-3.5, 0); c.lineTo(-1, 2.5); c.lineTo(3.5, -2.5); c.stroke(); c.restore() }
    }
    if (state === 'off') tx(c, 'not used', 342, y, 10.5, { color: '#8a8a8a', align: 'right' })
    c.restore()
  })
  if (st === 'meter') {
    const wt = (r) => (r.state === 'ok' ? 1 : r.state === 'weak' ? 0.5 : 0), tot = rows.reduce((a, r) => a + wt(r), 0) || 1
    const v = rows.reduce((a, r, i) => a + wt(r) * K[i], 0) / tot, y = 170 + n * 23 + 8
    c.save(); c.globalAlpha *= pa
    tx(c, 'Stress signal', 16, y, 11, { w: 500, color: '#9a9a9a' }); tx(c, `${Math.round(v * 100)}%`, 342, y, 11, { w: 600, color: rgb([143, 195, 255], [255, 154, 171], v), align: 'right' })
    c.fillStyle = 'rgba(255,255,255,0.1)'; c.beginPath(); c.roundRect(16, y + 10, 326, 6, 3); c.fill()
    const g = c.createLinearGradient(16, 0, 342, 0); g.addColorStop(0, '#8fc3ff'); g.addColorStop(1, '#ff9aab'); c.fillStyle = g; c.beginPath(); c.roundRect(16, y + 10, Math.max(6, 326 * v), 6, 3); c.fill()
    c.restore()
  }
}
/** Spring-open Dynamic Island. Content fades before the pill closes, so it never sits empty. */
function island(c, t, T, V) {
  const d = D.island, H = d.hgt + extraOf(V) + d.pad
  const open = springy(seg(t, T.det, T.det + d.dur), d.bounce), fade = 1 - S(t, T.buzz - 0.5, T.buzz - 0.32), shut = S(t, T.buzz - 0.4, T.buzz - 0.05)
  const e = open * (1 - shut)
  if (e <= 0.003) return
  const w = lerp(124, d.w, e), h = lerp(36, H, e), r = Math.min(lerp(18, d.r, e), h / 2), top = 11
  c.fillStyle = '#000'; c.beginPath(); c.roundRect(195 - w / 2, top, w, h, r); c.fill()
  const full = clamp((open - 0.6) / 0.4) * fade
  if (full <= 0.01) return
  const CH = 160 + extraOf(V) + 36, k = Math.min(1, w / 358, h / CH)
  c.save(); c.beginPath(); c.roundRect(195 - w / 2, 11, w, h, r); c.clip(); c.globalAlpha *= full
  c.translate(195 - (358 * k) / 2, 11 + (h - d.pad * (h / H) - CH * k) / 2); c.scale(k, k); c.translate(0, 36); readout(c, t, T, V); c.restore()
}

/** Card height for the current options (content stack + padding). */
const cardH = () => 44 + (CARD_ICON[OPT.emoji] ? 14 + D.cards.size : 0) + 18 + (CARD_SUB[OPT.sub] ? 22 : 0)
/** One choice card (Just listen = 0, Help me think = 1) at (x, y), 166 wide. `on` 0–1 = selected. */
function choiceCard(c, x, y, i, on) {
  const h = cardH(), center = OPT.align === 'center', tx0 = center ? x + 83 : x + 18, al = center ? 'center' : 'left'
  glass(c, x, y, 166, h, 22, on > 0.5 ? '#EAF6FF' : '#ffffff', 14)
  if (on > 0.01) { c.save(); c.globalAlpha *= on; c.strokeStyle = BLUE; c.lineWidth = 2; c.beginPath(); c.roundRect(x, y, 166, h, 22); c.stroke(); c.restore() }
  let yy = y + 22
  const icon = CARD_ICON[OPT.emoji], sub = CARD_SUB[OPT.sub]
  if (icon) { const sz = D.cards.size; em(c, icon[i], (center ? x + 83 : x + 18 + sz / 2) + D.cards.ix, yy + sz / 2 + D.cards.iy, sz); yy += 14 + sz }
  tx(c, CARD.titles[i], tx0, yy + 9, 15.5, { w: 600, color: '#1f2a2e', align: al }); yy += 18
  if (sub) tx(c, sub[i], tx0, yy + 13, 12, { color: '#7d8b90', align: al })
  return h
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
  T.ask = T.unlock + 0.15; T.pick = T.ask + Q.askRead; T.voice = T.pick + Q.toVoice
  let t = T.voice + D.momo.wait // Momo grows, eyes open, wave flat; the first word starts it all
  T.talk = t; t += words().length * Q.word + Q.afterTalk
  // No stop tap, no reflection: the recording keeps going while the film settles into the hero.
  T.stop = T.proc = T.cards = T.check = 1e9
  T.calm = t; T.hero = T.calm + Q.handoff; T.dur = +(T.hero + Q.endHold).toFixed(1)
  return T
}

function film(V) {
  const T = timeline(), tokens = words().map((w,i) => ({text:w,at:T.talk+i*D.seq.word}))
  const live = (x) => S(x, T.talk - .1, T.talk + .6)
  const voiceClock = clockTable(T.dur, x => lerp(.25, lerp(2.3, .45, S(x, T.talk, T.calm + .6)), live(x)))
  const heartClock = clockTable(T.dur, x => lerp(1.9, .9, S(x, T.talk, T.calm)))
  const meta = V.meta
  const F = {
    ...meta, dur: T.dur,
    draw(a) {
      const t = a.t
      const calm = S(t, T.talk + 0.6, T.calm + 0.5)
      const talking = Math.min(S(t, T.talk - 0.2, T.talk + 0.2), 1 - S(t, T.stop - 0.2, T.stop + 0.3))
      const app = S(t, T.unlock, T.unlock + 0.45)

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
      const blur = HO === 'dissolve' ? 14 * S(t, T.calm - 0.1, T.calm + 0.9) : 0
      const pk = 500 / PHONE.h, pw = PHONE.w * pk
      const py = 280 + (1 - S(t, 0.05, 0.7)) * 50
      const handT = (c) => { c.translate(480 + ht[0], py + ht[1]); c.scale(ht[2], ht[2]); c.translate(-480, -py); if (blur > 0.3) c.filter = `blur(${blur}px)` }
      const scr = { x: 480 - pw / 2 + PHONE.sx * pk, y: py - 250 + PHONE.sy * pk, w: PHONE.sw * pk, h: PHONE.sh * pk, r: PHONE.r * pk }
      const u = scr.w / 390

      // Camera: lean in on the lock screen (to the island for that variant), the transcript, then the reflection.
      const inLock = S(t, 0.5, 1.3) * (1 - S(t, T.unlock - 0.2, T.unlock + 0.5))
      const inTalk = S(t, T.talk - 0.3, T.talk + 0.9) * (1 - S(t, T.calm - 0.4, T.hero)), inAsk = S(t, T.ask, T.ask + 0.7) * (1 - S(t, T.voice, T.voice + 0.6))
      const inCards = S(t, T.cards - 0.2, T.cards + 0.8) * (1 - S(t, T.calm - 0.5, T.calm + 0.5))
      const IH = D.island.hgt + extraOf(V), atIsland = S(t, T.det - 0.2, T.det + 0.4) * (1 - S(t, T.buzz - 0.4, T.buzz + 0.2)), lockY = lerp(300, 11 + IH / 2 + 24, atIsland)
      const z = 1 + lerp(0.6, 0.6 + D.island.zoom * Math.min(1, 196 / IH), atIsland) * inLock + 0.42 * inTalk + 0.36 * inCards + 0.4 * inAsk
      const wsum = inLock + inTalk + inCards + inAsk, focus = (scr.y + lockY * u) * inLock + (scr.y + 560 * u) * inTalk + (scr.y + 330 * u) * inCards + (scr.y + 400 * u) * inAsk
      const fx = 480, fy = lerp(280, focus / Math.max(1e-6, wsum), clamp(wsum))
      // One camera offset moves bezel, screen, voice band and taps together. Blend by the
      // existing camera weights, so repeated lock-screen sequences share one framing dial.
      const pos = a.phonePosition
      const offsetY = lerp(pos.lockScreenY, pos.signalCheckY, atIsland) * inLock + pos.reflectionChoiceY * inAsk + pos.voiceReflectionY * inTalk
      const view = (c) => { c.translate(480, 270 + offsetY); c.scale(z, z); c.translate(-fx, -fy) }
      const cx = (x) => (x - fx) * z + 480, cy = (y) => (y - fy) * z + 270 + offsetY

      // The braid is their voice: it appears only once they talk, then opens into the calm line.
      const rt = voiceClock(t)
      const hb = pulse(heartClock(t)) * (1 - calm)
      const B = D.braid
      let p = { x: 480 + B.x * u, y: scr.y + scr.h * 0.9 + B.y * u, len: scr.w * 0.8 * B.len * B.scale, sc: 0.3 * B.scale }
      if (HO === 'fade' || HO === 'dissolve') p = mix(p, { x: 480, y: 290, len: 640, sc: 1 }, S(t, T.calm, T.calm + 0.9))
      const target = a.braidTarget ?? { x: 480, y: 45.3, width: 187 }
      p = mix(p, { x: (target.x - 480) / z + fx, y: (target.y - 270 - offsetY) / z + fy, len: target.width / z, sc: .336 }, S(t, T.calm + 0.6, T.hero))
      const speech = 0.45 + 0.4 * Math.abs(Math.sin(t * 7.3) * Math.sin(t * 2.9 + 1))
      const bAlpha = S(t, T.voice - 0.1, T.voice + 0.5) * (1-S(t,T.hero-.35,T.hero)), flat = lerp(0.1, 1, live(t)), env = lerp(0, lerp(lerp(0.85 + 0.15 * hb, 0.12, calm), speech, talking * 0.8), live(t))
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
        c.translate(scr.x, scr.y); c.scale(u, u); screenBg(c, t, app, talking, calm)
        c.restore()
      })
      a.draw((c) => {
        if (ph <= 0.01) return
        const th = THEMES[OPT.bg], lift = 1 - 0.03 * S(t, T.calm, T.calm + 0.7)
        c.save(); view(c); handT(c); c.globalAlpha = ph
        c.translate(480, py); c.scale(lift, lift); c.translate(-480, -py)
        c.save(); c.beginPath(); c.roundRect(scr.x, scr.y, scr.w, scr.h, scr.r); c.clip(); c.translate(scr.x, scr.y); c.scale(u, u)
        statusBar(c, app, app > 0.5 ? '#1f1f1f' : th.statusInk ?? '#1f1f1f', 1 - app)

        // Lock screen: the good-luck note, the afternoon passing, the Watch noticing, Momo's nudge.
        const lock = 1 - app
        if (lock > 0.01) {
          c.save(); c.globalAlpha *= lock
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
          const stacked = S(t, T.luck, T.luck + 0.5) * (1 - S(t, T.luckOut, T.luckOut + 0.5)), my = 300 + stacked * 112 + (1 - S(t, T.meet, T.meet + 0.5)) * 24
          if (pa > 0.01) { c.save(); c.globalAlpha *= pa
            glass(c, 16, my, 358, 64, 22, th.glass, 24)
            sf(c, 'clock', 44, my + 32, 20, done > 0.5 ? '#34c759' : '#61A8FD')
            tx(c, MEET.title, 66, my + 22, 15, { w: 600, color: '#1f2a2e' }); tx(c, done > 0.5 ? MEET.ended : MEET.now, 66, my + 43, 13, { color: '#3b484c' })
            c.restore() }; c.letterSpacing = '0px'
          if (th.buttons) {
            ;[[71, 'M0 2.4H10.38V1.91C10.38.62 9.74 0 8.51 0H1.87C.64 0 0 .62 0 1.91ZM3.96 22.96H6.42C7.65 22.96 8.28 22.34 8.28 21.05V10.16C8.28 9.09 8.53 8.31 8.92 7.71L9.59 6.73C10.06 6 10.38 5.31 10.38 4.44V3.6H0V4.44C0 5.31.32 6 .79 6.73L1.45 7.71C1.85 8.31 2.09 9.09 2.09 10.16V21.05C2.09 22.34 2.73 22.96 3.96 22.96Z', 10.38, 22.96], [319, 'M3.29 20H22.47C24.65 20 25.76 18.91 25.76 16.75V5.77C25.76 3.61 24.65 2.53 22.47 2.53H19.47C18.64 2.53 18.39 2.36 17.91 1.84L17.07.89C16.55.32 16.02 0 14.93 0H10.75C9.67 0 9.14.32 8.61.89L7.77 1.84C7.3 2.35 7.04 2.53 6.22 2.53H3.29C1.1 2.53 0 3.61 0 5.77V16.75C0 18.91 1.1 20 3.29 20ZM12.88 16.91C9.7 16.91 7.15 14.37 7.15 11.17 7.15 7.98 9.7 5.44 12.88 5.44 16.06 5.44 18.6 7.98 18.6 11.17 18.6 14.37 16.05 16.91 12.88 16.91ZM12.88 15.31C15.17 15.31 17.01 13.48 17.01 11.17 17.01 8.87 15.17 7.03 12.88 7.03 10.59 7.03 8.74 8.87 8.74 11.17 8.74 13.48 10.6 15.31 12.88 15.31Z', 25.76, 20]].forEach(([x, d, w, h]) => {
              const y = SH - 50 - 25 - 34 * (SH / 852) + 34
              c.fillStyle = 'rgba(21,21,21,0.35)'; c.beginPath(); c.arc(x, y, 25, 0, TAU); c.fill()
              c.save(); c.translate(x - w / 2, y - h / 2); c.fillStyle = '#fff'; c.fill(new Path2D(d), 'evenodd'); c.restore()
            })
          }
          notice(c, 300 - (1 - S(t, T.luck, T.luck + 0.5)) * 24, Math.min(S(t, T.luck, T.luck + 0.5), 1 - S(t, T.luckOut, T.luckOut + 0.4)), COPY.luck)
          const nk = S(t, T.buzz, T.buzz + 0.45), down = bump(t, T.press - 0.08, T.press + 0.3), press = 1 - 0.05 * down
          c.save(); c.translate(195, 340); c.scale(press, press); c.translate(-195, -340)
          const nh = notice(c, 300 - (1 - nk) * 24, nk, COPY[OPT.copy])
          if (nh && down > 0.01) { c.fillStyle = `rgba(20,40,60,${0.1 * down})`; c.beginPath(); c.roundRect(16, 300, 358, nh, 24); c.fill() }
          c.restore()
          c.restore()
        }
        island(c, t, T, V)

        // First screen in Momo: what would help? They pick "Just listen", which opens Freeform.
        const ask = app * (1 - S(t, T.voice - 0.15, T.voice + 0.3)), voiceIn = S(t, T.voice - 0.1, T.voice + 0.4)
        if (ask > 0.01) {
          c.save(); c.globalAlpha = ph * ask
          const e0 = S(t, T.ask, T.ask + 0.5)
          c.save(); c.globalAlpha *= e0; c.translate(0, (1 - e0) * 12)
          tx(c, 'What would help most', 195, 322, 22, { w: 600, color: '#1f2a2e', align: 'center' })
          tx(c, 'right now?', 195, 350, 22, { w: 600, color: '#1f2a2e', align: 'center' })
          c.restore()
          const ch = cardH()
          ;[[22, true], [202, false]].forEach(([x, pick], i) => {
            const k = S(t, T.ask + 0.35 + i * 0.12, T.ask + 0.8 + i * 0.12)
            const sel = pick ? S(t, T.pick - 0.05, T.pick + 0.2) : 0, down = pick ? bump(t, T.pick - 0.08, T.pick + 0.3) : 0, sc = 1 - 0.06 * down
            c.save(); c.globalAlpha *= k * (pick ? 1 : 1 - 0.5 * S(t, T.pick, T.pick + 0.3)); c.translate(x + 83, 410 + ch / 2 + (1 - k) * 14); c.scale(sc, sc); c.translate(-(x + 83), -(410 + ch / 2))
            choiceCard(c, x, 410, i, sel)
            c.restore()
          })
          c.restore()
        }

        // Inside Momo: the voice screen, the question, the reflection.
        // One Momo across the cut: grows to the centre with eyes open, then settles and closes its eyes at the first word.
        const M = D.momo, EZ = { smooth: (x) => x * x * (3 - 2 * x), spring: (x) => springy(x, 0.25), float: (x) => (x < 0.5 ? 16 * x ** 5 : 1 - (-2 * x + 2) ** 5 / 2) }[OPT.mease]
        const grow = EZ(seg(t, T.pick + 0.15, T.pick + 0.15 + M.grow)), settle = EZ(seg(t, T.talk + M.eyesAt, T.talk + M.eyesAt + M.settle))
        const e0 = T.talk + M.eyesAt
        const shut = OPT.eyes === 'blink' ? S(t, e0 + M.eyes * 0.45, e0 + M.eyes * 0.55) : OPT.eyes === 'dissolve' ? S(t, e0, e0 + M.eyes * 2.2) : S(t, e0, e0 + M.eyes)
        const squint = OPT.eyes === 'blink' ? 1 - 0.1 * bump(t, e0, e0 + M.eyes) : 1
        const mx = 195, my = lerp(lerp(240, M.openY, grow), M.talkY, settle), ms = lerp(lerp(100, M.openS, grow), M.talkS, settle)
        const mA = ph * app * S(t, T.ask, T.ask + 0.5) * (1 - S(t, T.cards - 0.4, T.cards))
        c.save(); c.translate(mx, my); c.scale(1, squint); c.translate(-mx, -my)
        const soft = OPT.eyes === 'dissolve' ? 3 * Math.sin(Math.PI * shut) : 0
        if (soft > 0.2) c.filter = `blur(${soft}px)`
        c.globalAlpha = mA * (1 - shut); momo(c, mx, my, ms, t, 0, IMG.momoOpen)
        c.globalAlpha = mA * shut; momo(c, mx, my, ms, t, talking)
        c.restore()
        c.globalAlpha = ph * voiceIn
        transcript(c, tokens, t, 1 - S(t, T.proc - 0.1, T.proc + 0.3))
        controls(c, t, voiceIn * (1 - S(t, T.stop + 0.15, T.stop + 0.55)), 'Freeform', T.stop)
        c.restore()
        c.globalAlpha = ph; c.drawImage(IMG.phone, 480 - pw / 2, py - 250, pw, 500)

        c.restore()
      })
      const sx = (x) => cx(scr.x + x * u), sy = (y) => cy(scr.y + y * u)
      // Glass cursor (prototype .nx-cursor): glides in, presses (shrinks, darkens), lifts away.
      const TAPS = [[T.press, 195, 340, 250, 520], [T.pick, 105, 410 + cardH() / 2, 230, 640]]
      for (const [at, x, y, x0, y0] of TAPS) {
        const vis = Math.min(S(t, at - 1.1, at - 0.8), 1 - S(t, at + 0.45, at + 0.8))
        if (vis <= 0.01) continue
        const go = S(t, at - 1.0, at - 0.12), off = S(t, at + 0.3, at + 0.8), down = bump(t, at - 0.08, at + 0.3)
        const px = sx(lerp(lerp(x0, x, go), x + 40, off)), py2 = sy(lerp(lerp(y0, y, go), y + 60, off)), r = D.cursor.size * u * z * (1 - D.cursor.press * down)
        a.draw((c) => {
          c.save(); c.globalAlpha = vis * ph
          c.shadowColor = 'rgba(0,0,0,0.18)'; c.shadowBlur = 18; c.shadowOffsetY = 4
          c.fillStyle = `rgba(210,214,222,${D.cursor.fill + 0.2 * down})`; c.beginPath(); c.arc(px, py2, r, 0, TAU); c.fill()
          c.shadowColor = 'transparent'; c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1; c.stroke()
          c.restore()
        })
      }
    },
  }
  return F
}

const V = {m0:884,m1:887,base:[64,78],stillSince:879,day:true,checks:true,style:'pending',hr:m=>79+24*S(m,885,886)+noise(m),hrv:m=>lerp(52,28,S(m,885.3,886.5)),move:()=>3}
export const PHONE_TIMELINE = timeline()
const cut = film(V)
export function drawPhoneFilm(ctx,t,m,braidTarget,phonePosition) {
  const under=[], ink=[]
  cut.draw({t,braidTarget,phonePosition,under:fn=>under.push(fn),draw:fn=>ink.push(fn)})
  ctx.save();ctx.setTransform(m[0],0,0,m[0],m[1],m[2])
  for (const fn of under) {ctx.save();fn(ctx);ctx.restore()}
  for (const fn of ink) {ctx.save();fn(ctx);ctx.restore()}
  ctx.restore()
}
