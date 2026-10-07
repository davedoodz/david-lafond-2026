/**
 * Shared kit for the Momo intro studio pages: the braid band (same palette and constants as
 * introEngine.js BANDS.braid), a per-frame drawing API, and a gallery that plays each film in
 * Inter and Test Family. A film is { title, idea, beats, draw(api) }; api.t is seconds.
 */
export const W = 960, H = 540, DUR = 7.5, TAU = Math.PI * 2
export const C = { paper: '#f5f5f5', ink: '#0b0a09', ink9: '#171717', s6: '#6f6b68', s4: '#a6a09c', s2: '#dcd9d6', blue: '#53BFFE', deep: '#1E7FB8' }
// The braid: same palette and band constants as the live intro (introEngine.js, BANDS.braid).
export const PAL = [C.blue, '#00D0FF', '#B9A7F5', '#FFB3C7']
export const FONTS = {
  inter: { label: 'Inter', family: 'Inter', ls: -0.015 },
  test: { label: 'Test Family', family: "'Test Family'", ls: 0 },
}

/**
 * The real Momo hero (1440×810 capture of /work/momo, scaled to the 960×540 film) as
 * separate layers, so a film can end by assembling the page itself. Boxes are film px.
 * The braid's place in the hero (the eyebrow slot) is HERO_BRAID; films move their braid there.
 */
export const HERO_LAYERS = {
  nav: [29.33, 24.33, 903.33, 16.67],
  side: [29.33, 95.0, 80.0, 256.67],
  title: [219.0, 107.67, 520.67, 70.0],
  meta: [256.67, 199.0, 447.67, 26.67],
  logos: [318.0, 256.67, 323.33, 27.33],
  watch: [333.33, 353.0, 111.67, 187.0],
  phone: [485.67, 303.33, 147.67, 236.67],
}
/** Braid centre, strip length and scale matching the live hero band (hero.width 280 at 1440px). */
export const HERO_BRAID = { x: 480, y: 45.3, len: 187, sc: 0.336 }
const heroImg = Object.fromEntries(Object.keys(HERO_LAYERS).map((k) => { const i = new Image(); i.src = new URL(`./assets/hero/${k}.webp`, import.meta.url).href; return [k, i] }))

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
export const lerp = (a, b, t) => a + (b - a) * t
export const seg = (t, a, b) => clamp((t - a) / (b - a))
export const ease = {
  out: (t) => 1 - (1 - t) ** 3,
  inOut: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  in: (t) => t ** 3,
}
export const io = (t, a, b, f = 0.35) => Math.min(ease.out(seg(t, a, a + f)), 1 - ease.inOut(seg(t, b - f, b)))
export const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})` }

// ---------- Paths: a strip of length `len` bent with curvature c (0 straight, 1 closed ring) ----------
export function curl(cx, cy, len, c = 0, rot = 0, n = 160) {
  const ds = len / n, half = n / 2, fw = [[0, 0]], bw = []
  let x = 0, y = 0
  for (let i = 1; i <= half; i++) { const f = (c * TAU * (i - 0.5) * ds) / len; x += Math.cos(f) * ds; y += Math.sin(f) * ds; fw.push([x, y]) }
  x = 0; y = 0
  for (let i = 1; i <= half; i++) { const f = (-c * TAU * (i - 0.5) * ds) / len; x -= Math.cos(f) * ds; y -= Math.sin(f) * ds; bw.push([x, y]) }
  const raw = bw.reverse().concat(fw)
  let mx = 0, my = 0
  raw.forEach(([a, b]) => { mx += a; my += b })
  mx /= raw.length; my /= raw.length
  const cr = Math.cos(rot), sr = Math.sin(rot)
  return raw.map(([a, b]) => [cx + (a - mx) * cr - (b - my) * sr, cy + (a - mx) * sr + (b - my) * cr])
}
export function sample(raw) {
  let s = 0
  return raw.map((p, i) => {
    if (i) s += Math.hypot(p[0] - raw[i - 1][0], p[1] - raw[i - 1][1])
    const a = raw[Math.max(0, i - 1)], b = raw[Math.min(raw.length - 1, i + 1)]
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1
    return { x: p[0], y: p[1], nx: -dy / l, ny: dx / l, s, u: i / (raw.length - 1) }
  })
}
export const gauss = (u) => Math.exp(-(((u - 0.5) * 3.636) ** 2))
export const tri = (u) => 1 - Math.abs(2 * u - 1)

// ---------- Braid renderer (drawn unblurred on a half-res layer, blurred once when composited) ----------
export function braid(L, raw, o = {}) {
  const { env = 0.2, alpha = 1, closed = 0, strands = [0, 1, 2, 3], scale = 1, ampAt = () => 1, kAmp = () => 1, chaos = () => 0, weights = () => 1, rt = 0 } = o
  if (alpha <= 0.01) return
  const P = sample(raw)
  for (const k of strands) {
    const loud = env * (0.6 + 0.4 * Math.abs(Math.sin(k * 1.7 + rt * 3)))
    const th = (13 + 20 * loud) * scale
    const A = (18 + 44 * env) * scale * kAmp(k)
    const ch = chaos(k)
    const top = [], bot = []
    for (const p of P) {
      const ss = p.s / scale
      const e = lerp(gauss(p.u), 1, closed) * ampAt(p.u)
      const d = A * e * (Math.sin(ss * 0.02 * (1 + k * 0.25) + rt * 0.9 * (1 + k * 0.35) + k * 2.4) + ch * 0.9 * Math.sin(ss * 0.071 * (1 + k * 0.4) - rt * 2.3 * (1 + k * 0.2) + k))
      const bump = th * 0.3 * Math.sin(ss * 0.05 - rt * 1.35)
      top.push([p.x + p.nx * (d - th / 2), p.y + p.ny * (d - th / 2)])
      bot.push([p.x + p.nx * (d + th / 2 + bump), p.y + p.ny * (d + th / 2 + bump)])
    }
    const base = (k === 0 ? 0.78 : 0.62) * alpha * weights(k)
    for (let i = 0; i < P.length - 1; i += 4) {
      const j = Math.min(P.length - 1, i + 4)
      const a = base * lerp(tri(P[(i + j) >> 1].u), 1, closed)
      if (a <= 0.004) continue
      L.fillStyle = hexA(PAL[k], a)
      L.beginPath()
      for (let q = i; q <= j; q++) q === i ? L.moveTo(top[q][0], top[q][1]) : L.lineTo(top[q][0], top[q][1])
      for (let q = j; q >= i; q--) L.lineTo(bot[q][0], bot[q][1])
      L.closePath(); L.fill()
    }
  }
}

// ---------- Per-frame drawing API handed to each concept ----------
export function makeApi(ctx, L, F, t) {
  const ink = [], under = []
  const api = {
    t, F,
    braid: (raw, o = {}) => braid(L, raw, { rt: t, ...o }),
    text(str, x, y, o = {}) {
      const { size = 20, w = 400, it = false, color = C.ink, a = 1, align = 'center', ls = 0, upper = false } = o
      if (a <= 0.01) return
      ink.push((c) => {
        c.save(); c.globalAlpha = a
        c.font = `${it ? 'italic ' : ''}${w} ${size}px ${F.family}, system-ui, sans-serif`
        c.letterSpacing = `${(ls || F.ls) * size}px`
        c.fillStyle = color; c.textAlign = align; c.textBaseline = 'middle'
        c.fillText(upper ? str.toUpperCase() : str, x, y)
        c.restore()
      })
    },
    label: (str, x, y, a, o = {}) => api.text(str, x, y, { size: 11, color: C.s4, ls: 0.16, upper: true, a, ...o }),
    draw: (fn) => ink.push(fn),
    /** Draws behind the braid (device bodies, soft fields), in film coordinates. */
    under: (fn) => under.push(fn),
    flushUnder(c) { under.forEach((fn) => fn(c)) },
    ripple(x, y, t0, o = {}) {
      const { color = C.blue, r0 = 8, r1 = 120, n = 3, dur = 0.9, gap = 0.16, alpha = 0.7, lw = 1.5, squash = 1 } = o
      for (let i = 0; i < n; i++) {
        const e = seg(t, t0 + i * gap, t0 + i * gap + dur)
        if (e <= 0 || e >= 1) continue
        const r = lerp(r0, r1, ease.out(e))
        ink.push((c) => { c.save(); c.globalAlpha = (1 - e) * alpha; c.strokeStyle = color; c.lineWidth = lw; c.beginPath(); c.ellipse(x, y, r, r * squash, 0, 0, TAU); c.stroke(); c.restore() })
      }
    },
    dot(x, y, r, color, a = 1) { if (a > 0.01) ink.push((c) => { c.save(); c.globalAlpha = a; c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore() }) },
    frame(cx, cy, w, h, r, a, trim = 1) {
      if (a <= 0.01) return
      ink.push((c) => {
        c.save(); c.globalAlpha = a; c.strokeStyle = C.ink9; c.lineWidth = 2
        const per = 2 * (w + h) - (8 - 2 * Math.PI) * r
        c.setLineDash([per * trim, per]); c.beginPath(); c.roundRect(cx - w / 2, cy - h / 2, w, h, r); c.stroke(); c.restore()
      })
    },
    /** Rounded box: stroke and/or fill. `trim` draws the outline on (0-1). */
    box(cx, cy, w, h, r, o = {}) {
      const { a = 1, fill = null, stroke = C.ink9, lw = 2, trim = 1, shadow = 0 } = o
      if (a <= 0.01) return
      ink.push((c) => {
        c.save(); c.globalAlpha = a
        if (fill) { if (shadow) { c.shadowColor = 'rgba(30,60,90,0.12)'; c.shadowBlur = shadow; c.shadowOffsetY = shadow / 4 } c.fillStyle = fill; c.beginPath(); c.roundRect(cx - w / 2, cy - h / 2, w, h, r); c.fill(); c.shadowColor = 'transparent' }
        if (stroke) { const per = 2 * (w + h) - (8 - 2 * Math.PI) * r; c.setLineDash([per * trim, per]); c.strokeStyle = stroke; c.lineWidth = lw; c.beginPath(); c.roundRect(cx - w / 2, cy - h / 2, w, h, r); c.stroke() }
        c.restore()
      })
    },
    /** Small line icons: heart, cal, mail, mic, doc, spark. */
    icon(name, x, y, s, a = 1, color = C.ink9) {
      if (a <= 0.01) return
      ink.push((c) => {
        c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(s / 16, s / 16); c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 1.6; c.lineCap = 'round'; c.lineJoin = 'round'
        c.beginPath()
        if (name === 'heart') { c.moveTo(0, 6); c.bezierCurveTo(-9, 0, -7, -8, 0, -3.5); c.bezierCurveTo(7, -8, 9, 0, 0, 6) }
        else if (name === 'cal') { c.roundRect(-7, -6, 14, 13, 2.5); c.moveTo(-7, -2); c.lineTo(7, -2); c.moveTo(-3.5, -8); c.lineTo(-3.5, -4.5); c.moveTo(3.5, -8); c.lineTo(3.5, -4.5) }
        else if (name === 'mail') { c.roundRect(-7.5, -5.5, 15, 11, 2); c.moveTo(-7, -4.5); c.lineTo(0, 1); c.lineTo(7, -4.5) }
        else if (name === 'mic') { c.roundRect(-3, -8, 6, 10, 3); c.moveTo(-6, -1); c.quadraticCurveTo(-6, 5, 0, 5); c.quadraticCurveTo(6, 5, 6, -1); c.moveTo(0, 5); c.lineTo(0, 8) }
        else if (name === 'doc') { c.roundRect(-6, -8, 12, 16, 2); c.moveTo(-3, -3); c.lineTo(3, -3); c.moveTo(-3, 1); c.lineTo(3, 1); c.moveTo(-3, 5); c.lineTo(1, 5) }
        else if (name === 'check') { c.moveTo(-6, 0); c.lineTo(-2, 4.5); c.lineTo(6.5, -5) }
        else if (name === 'spark') { c.moveTo(0, -8); c.quadraticCurveTo(1, -1, 8, 0); c.quadraticCurveTo(1, 1, 0, 8); c.quadraticCurveTo(-1, 1, -8, 0); c.quadraticCurveTo(-1, -1, 0, -8); c.fill() }
        if (name !== 'spark') c.stroke()
        c.restore()
      })
    },
    /** Context chip: white pill with an icon, a label and an optional second line. */
    chip(label, x, y, o = {}) {
      const { a = 1, icon = null, size = 13, color = C.ink9, sub = null } = o
      if (a <= 0.01) return 0
      const m = document.createElement('canvas').getContext('2d')
      m.font = `400 ${size}px ${F.family}, system-ui, sans-serif`
      const tw = Math.max(m.measureText(label).width, sub ? m.measureText(sub).width * 0.85 : 0)
      const w = tw + (icon ? 44 : 26), h = sub ? 46 : 32
      api.box(x, y, w, h, sub ? 14 : 16, { a, fill: '#ffffff', stroke: null, shadow: 14 })
      if (icon) api.icon(icon, x - w / 2 + 20, y, 15, a, C.blue)
      const tx = x - w / 2 + (icon ? 34 : 13)
      api.text(label, tx, sub ? y - 8 : y, { size, align: 'left', color, a })
      if (sub) api.text(sub, tx, y + 10, { size: size * 0.85, align: 'left', color: C.s6, a })
      return w
    },
    /** Dashed connector, drawn on by `k` (0-1). */
    link(x1, y1, x2, y2, k, a = 1, color = C.blue) {
      if (k <= 0 || a <= 0.01) return
      ink.push((c) => { c.save(); c.globalAlpha = a * 0.7; c.strokeStyle = color; c.lineWidth = 1.2; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(x1, y1); c.lineTo(lerp(x1, x2, k), lerp(y1, y2, k)); c.stroke(); c.restore() })
    },
    /** Draws everything `fn` adds scaled by `s` around (cx, cy). Ink only; the braid is placed separately. */
    group(s, cx, cy, fn) {
      ink.push((c) => { c.save(); c.translate(cx, cy); c.scale(s, s); c.translate(-cx, -cy) })
      fn()
      ink.push((c) => c.restore())
    },
    /** Types `str` out over [t0, t1]. */
    typed: (str, t0, t1) => str.slice(0, Math.ceil(str.length * seg(t, t0, t1))),
    // "Momo" set as the brand does: "un" upright, "wind" italic.
    lockup(t0, tagline, o = {}) {
      const { y = 292, braidY = 214 } = o
      const k = ease.out(seg(t, t0, t0 + 0.7))
      if (k <= 0) return 0
      ink.push((c) => {
        c.save(); c.globalAlpha = k; c.fillStyle = C.ink; c.textBaseline = 'middle'
        const size = 60, f = (it) => `${it ? 'italic ' : ''}400 ${size}px ${F.family}, system-ui, sans-serif`
        c.letterSpacing = `${F.ls * size}px`
        c.font = f(false); const a = c.measureText('un').width
        c.font = f(true); const b = c.measureText('wind').width
        const x0 = W / 2 - (a + b) / 2, yy = y + (1 - k) * 10
        c.font = f(false); c.fillText('un', x0, yy)
        c.font = f(true); c.fillText('wind', x0 + a, yy)
        c.restore()
      })
      api.text(tagline, W / 2, y + 56, { size: 18, color: C.s6, a: ease.out(seg(t, t0 + 0.25, t0 + 0.9)) })
      return k
    },
    /**
     * Ends a film on the real case-study hero: nav, sidebar, title, meta, logos, then the Watch
     * and iPhone rise in, staggered from t0. Returns 0-1 for moving the braid into its hero slot.
     * `o.alpha[layer]` drives a layer's opacity directly (no rise), for films that morph into it.
     */
    hero(t0, o = {}) {
      const ORDER = [['nav', 0, 0], ['side', 0.05, 0], ['title', 0.1, 14], ['meta', 0.2, 12], ['logos', 0.28, 10], ['watch', 0.34, 40], ['phone', 0.42, 40]]
      for (const [k, d, dy] of ORDER) {
        const own = o.alpha?.[k]
        const e = own ?? ease.out(seg(t, t0 + d, t0 + d + 0.6))
        if (e <= 0.01) continue
        const [x, y, w, h] = HERO_LAYERS[k]
        ink.push((c) => { c.save(); c.globalAlpha = e; c.imageSmoothingQuality = 'high'; c.drawImage(heroImg[k], x, y + (own == null ? (1 - e) * dy : 0), w, h); c.restore() })
      }
      return ease.inOut(seg(t, t0 - 0.2, t0 + 0.6))
    },
    flush(c) { ink.forEach((fn) => fn(c)) },
  }
  return api
}

/** Mounts films into #list with play/scrub controls and the typeface switch. */
/** `fonts`: which typefaces to render each film in (one for films without captions). */
export async function mount(FILMS, { dur = 7.5, fonts = Object.keys(FONTS) } = {}) {
  if (fonts.length === 1) document.documentElement.style.setProperty('--cols', 1)
  const DUR = dur
  const list = document.getElementById('list')
  const rows = []
  FILMS.forEach((c, i) => {
    const sec = document.createElement('section')
    sec.innerHTML = `
      <div class="head"><span class="num">0${i + 1}</span><h2>${c.title}</h2><span class="num">${(c.dur ?? DUR).toFixed(1)} s</span></div>
      <p class="idea">${c.idea}</p>
      <ul class="beats">${c.beats.map((b) => `<li>${b}</li>`).join('')}</ul>
      ${c.keeps ? `<dl class="trade"><div><dt>Keeps</dt><dd>${c.keeps}</dd></div><div><dt>Cuts</dt><dd>${c.cuts}</dd></div><div><dt>Tradeoff</dt><dd>${c.tradeoff}</dd></div></dl>` : ''}
      <div class="films">${Object.entries(FONTS).filter(([k]) => fonts.includes(k)).map(([k, f]) => `<figure data-font="${k}"><canvas></canvas>${fonts.length > 1 ? `<figcaption>${f.label}</figcaption>` : ''}</figure>`).join('')}</div>
      <div class="bar"><button type="button" aria-label="Play or pause">❚❚</button><input type="range" min="0" max="${c.dur ?? DUR}" step="0.01" value="0" aria-label="Scrub" /><output>0.00 s</output></div>`
    list.append(sec)
    const films = [...sec.querySelectorAll('figure')].map((fig) => {
      const canvas = fig.querySelector('canvas')
      const layer = document.createElement('canvas'); layer.width = W / 2; layer.height = H / 2
      return { fig, canvas, ctx: canvas.getContext('2d'), layer, L: layer.getContext('2d'), F: FONTS[fig.dataset.font] }
    })
    const row = { c, sec, films, t: 0, playing: true, visible: false, btn: sec.querySelector('.bar button'), range: sec.querySelector('input'), out: sec.querySelector('output') }
    row.btn.onclick = () => { row.playing = !row.playing; sync(row) }
    row.range.oninput = () => { row.t = +row.range.value; row.playing = false; sync(row); render(row) }
    films.forEach((f) => (f.canvas.onclick = () => { row.t = 0; row.playing = true; sync(row) }))
    rows.push(row)
  })
  const sync = (row) => { row.btn.textContent = row.playing ? '❚❚' : '▶'; row.range.value = row.t; row.out.textContent = `${row.t.toFixed(2)} s` }

  function render(row) {
    for (const f of row.films) {
      if (f.fig.hidden) continue
      const dpr = Math.min(2, devicePixelRatio || 1)
      const cw = Math.round(f.canvas.clientWidth * dpr)
      if (f.canvas.width !== cw) { f.canvas.width = cw; f.canvas.height = Math.round((cw * H) / W) }
      const S = f.canvas.width / W
      const { ctx, L } = f
      L.setTransform(1, 0, 0, 1, 0, 0); L.clearRect(0, 0, W / 2, H / 2); L.setTransform(0.5, 0, 0, 0.5, 0, 0)
      const api = makeApi(ctx, L, f.F, row.t)
      row.c.draw(api)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = C.paper; ctx.fillRect(0, 0, f.canvas.width, f.canvas.height)
      ctx.setTransform(S, 0, 0, S, 0, 0); api.flushUnder(ctx); ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.filter = `blur(${5 * S}px)`; ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(f.layer, 0, 0, f.canvas.width, f.canvas.height)
      ctx.filter = 'none'
      ctx.setTransform(S, 0, 0, S, 0, 0)
      api.flush(ctx)
    }
  }

  const obs = new IntersectionObserver((es) => es.forEach((e) => { rows.find((r) => r.sec === e.target).visible = e.isIntersecting }), { threshold: 0.15 })
  rows.forEach((r) => obs.observe(r.sec))

  let last = performance.now()
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now
    for (const r of rows) {
      if (!r.visible) continue
      if (r.playing) { r.t += dt; if (r.t > (r.c.dur ?? DUR) + 0.5) r.t = 0; sync(r) }
      render(r)
    }
    requestAnimationFrame(tick)
  }

  document.querySelectorAll('[data-view]').forEach((b) => (b.onclick = () => {
    document.querySelectorAll('[data-view]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)))
    const v = b.dataset.view
    document.documentElement.style.setProperty('--cols', v === 'both' ? 2 : 1)
    rows.forEach((r) => r.films.forEach((f) => (f.fig.hidden = v !== 'both' && f.fig.dataset.font !== v)))
  }))

  // Seekable for checks: window.seek(conceptIndex, t), or a `seek` DOM event with detail [i, t], paints that frame and pauses the row.
  window.seek = (i, t) => { const r = rows[i]; r.t = t; r.playing = false; sync(r); render(r) }
  document.addEventListener('seek', (e) => window.seek(...e.detail))
  await Promise.all(['400 20px Inter', 'italic 400 20px Inter', '500 20px Inter', "400 20px 'Test Family'", "italic 400 20px 'Test Family'"].map((f) => document.fonts.load(f).catch(() => {})))
  await Promise.all(Object.values(heroImg).map((i) => i.decode().catch(() => {})))
  document.documentElement.dataset.ready = ''
  requestAnimationFrame(tick)
}
