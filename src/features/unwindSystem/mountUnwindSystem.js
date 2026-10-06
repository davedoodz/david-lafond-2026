/**
 * Unwind system diagram: the animated walkthrough of how you, the watch, the phone, Momo and the
 * experts exchange data. One runtime for two surfaces:
 *   - studio (studio/unwind-system-design.html): every tuning control, settings saved to
 *     localStorage and, in dev, to ./settings.json; plus the static treatment options below it.
 *   - embed (the Unwind case study): no controls, plays the baked ./settings.json.
 */
import './unwindSystem.css'
import { __iconData as activity } from 'lucide-react/dist/esm/icons/activity.mjs'
import { __iconData as footprints } from 'lucide-react/dist/esm/icons/footprints.mjs'
import { __iconData as shield } from 'lucide-react/dist/esm/icons/shield-check.mjs'
import { __iconData as bell } from 'lucide-react/dist/esm/icons/bell-ring.mjs'
import { __iconData as mic } from 'lucide-react/dist/esm/icons/mic.mjs'
import { __iconData as layers } from 'lucide-react/dist/esm/icons/layers.mjs'
import { __iconData as notebook } from 'lucide-react/dist/esm/icons/notebook-pen.mjs'
import { __iconData as chart } from 'lucide-react/dist/esm/icons/chart-spline.mjs'
import { __iconData as target } from 'lucide-react/dist/esm/icons/target.mjs'
import { __iconData as scanHeart } from 'lucide-react/dist/esm/icons/scan-heart.mjs'
import { __iconData as timer } from 'lucide-react/dist/esm/icons/timer.mjs'
import { __iconData as lightbulb } from 'lucide-react/dist/esm/icons/lightbulb.mjs'
import userPng from './assets/blue-user.png'
import cloudPng from './assets/blue-cloud.png'
import phonePng from './assets/blue-phone.png'
import watchPng from './assets/blue-watch.png'
import therapistPng from './assets/blue-therapist.png'
import baked from './settings.json'

export const SETTINGS_KEY = 'unwind-system-design:settings'
const obj = (v) => (v && typeof v === 'object' ? v : {})
const normalize = (s) => ({ feel: s.feel, layout: s.layout, order: s.order, arrowOpacity: s.arrowOpacity, timings: obj(s.timings), arrows: obj(s.arrows), look: obj(s.look), labels: obj(s.labels), reveal: obj(s.reveal), waves: obj(s.waves), stepDur: obj(s.stepDur), edgeTime: obj(s.edgeTime), iconMotion: obj(s.iconMotion), iconScale: obj(s.iconScale), spacing: obj(s.spacing) })

/** Studio settings: this browser's saved tuning, else the committed ./settings.json. */
function loadStudioSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY))
    return normalize(saved ?? structuredClone(baked))
  } catch {
    return normalize(structuredClone(baked))
  }
}

const toDataUrl = (url) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`Unable to load ${url}`)
  return r.blob()
}).then((blob) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = reject
  reader.readAsDataURL(blob)
}))

/**
 * Mounts the diagram into `root`. Embed mode shows only the caption, the figure and the step pills,
 * and plays once `start()` is called (the host decides when it is in view).
 * Returns { start, destroy }.
 */
export async function mountUnwindSystem(root, { mode = 'embed', narrow = false } = {}) {
  const studio = mode === 'studio'
  const settings = studio ? loadStudioSettings() : normalize(structuredClone(baked))
  let saveTimer
  // Only user changes save: mounting applies the loaded settings without writing them back, so a
  // studio tab opened on another origin (empty storage) can't overwrite ./settings.json.
  let ready = false
  const saveSettings = () => {
    if (!studio || !ready) return
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)) } catch { /* storage blocked: settings stay for this session */ }
    // In dev, the tuning is also written to ./settings.json, which the case study plays.
    if (import.meta.env.DEV) {
      clearTimeout(saveTimer)
      saveTimer = setTimeout(() => fetch('/__dev/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ file: 'unwindSystem', data: settings }) }).catch(() => {}), 400)
    }
  }
  let destroyed = false
  const POINT_ICONS = {
    'physiological signals': activity, 'movement + activity': footprints, 'gentle nudge': bell,
    'voice reflection': mic, patterns: chart, 'action plans': target,
    'key moments': scanHeart, 'nudge timing': timer,
    'voice journal': notebook, 'user context': layers, 'personal insights': lightbulb,
    'evidence-based framework': shield,
  }
  const urls = { user: userPng, cloud: cloudPng, phone: phonePng, watch: watchPng, therapist: therapistPng, momoStill: '/work/unwind/intro/momo-open.webp' }
  // The studio embeds images as data URLs so its SVG downloads stand alone; the embed links them.
  const assets = studio
    ? Object.fromEntries(await Promise.all(Object.entries(urls).map(async ([k, u]) => [k, await toDataUrl(u)])))
    : urls
  const ARROWS = {
    original: { name: 'Original treatment' },
    solid: { name: 'Solid · open tip', dash: '', arrow: 'chevron', animate: false },
    dotted: { name: 'Dotted · open tip', dash: '0.1 10', arrow: 'chevron', animate: false },
    dashed: { name: 'Dashed · filled tip', dash: '8 7', arrow: 'triangle', animate: false },
    fine: { name: 'Fine · filled tip', dash: '', stroke: 1.2, arrow: 'triangle', animate: false },
    flowing: { name: 'Flowing · dotted', dash: '0.1 12', arrow: 'chevron', animate: true },
  }
  const INK = '#171717'
  const STONE = '#6f6b68'
  const STONE_LIGHT = '#a6a09c'
  const BLUE = '#53BFFE'
  // ---------- Content (one source for every option) ----------
  const NODE_INFO = {
    user: { title: ['USER'], icon: 'user' },
    watch: { title: ['WATCH'], sub: 'Detect + nudge', icon: 'watch' },
    ai: { title: ['PERSONALIZED AI'], sub: 'Connect the dots', icon: 'momo' },
    experts: { title: ['CLINICAL EXPERTS'], icon: 'therapist' },
    phone: { title: ['PHONE'], sub: 'Reflect + understand', icon: 'phone' },
  }
  // Every pair talks both ways: outbound (data, ink) and return (AI output, blue), drawn as two
  // parallel lanes 32 apart. Every label line is a Lucide-icon bullet.
  const EDGE_INFO = [
    /* 0 */ { from: 'user', to: 'watch', kind: 'data', items: ['physiological signals', 'movement + activity'] },
    /* 1 */ { from: 'watch', to: 'user', kind: 'ai', items: ['gentle nudge'] },
    /* 2 */ { from: 'user', to: 'phone', kind: 'data', items: ['voice reflection'] },
    /* 3 */ { from: 'phone', to: 'user', kind: 'ai', items: ['patterns', 'action plans'] },
    /* 4 */ { from: 'watch', to: 'ai', kind: 'data', items: ['key moments'] },
    /* 5 */ { from: 'ai', to: 'watch', kind: 'ai', items: ['nudge timing'] },
    /* 6 */ { from: 'phone', to: 'ai', kind: 'data', items: ['voice journal', 'user context'] },
    /* 7 */ { from: 'ai', to: 'phone', kind: 'ai', items: ['personal insights'] },
    /* 8 */ { from: 'experts', to: 'ai', kind: 'training', items: ['evidence-based framework'] },
  ]
  // Symmetric compositions: the watch mirrors the phone around the user ↔ AI axis, and every
  // paired lane mirrors its partner. Points are rough routes; both ends are trimmed to the
  // halo/title gap. Outer lanes carry data in, inner lanes carry the answer back, so pairs never cross.
  const LAYOUTS = {
    // User, watch and phone in one row (the person and their two devices); the AI above, experts on top.
    aiAbove: {
      name: 'Symmetric · AI above',
      W: 1240, H: 960, type: {},
      nodes: { experts: [620, 110], ai: [620, 420], watch: [220, 780], user: [620, 780], phone: [1020, 780] },
      edges: [
        { points: [[540, 764], [300, 764]], label: { x: 330, y: 722, anchor: 'start' } },
        { points: [[300, 796], [540, 796]], label: { x: 330, y: 830, anchor: 'start' } },
        { points: [[700, 764], [940, 764]], label: { x: 910, y: 743, anchor: 'end' } },
        { points: [[940, 796], [700, 796]], label: { x: 910, y: 830, anchor: 'end' } },
        { points: [[204, 700], [204, 404], [540, 404]], label: { x: 260, y: 384, anchor: 'start' } },
        { points: [[540, 436], [236, 436], [236, 700]], label: { x: 260, y: 470, anchor: 'start' } },
        { points: [[1036, 700], [1036, 404], [700, 404]], label: { x: 980, y: 360, anchor: 'end' } },
        { points: [[700, 436], [1004, 436], [1004, 700]], label: { x: 980, y: 470, anchor: 'end' } },
        { points: [[620, 240], [620, 330]], label: { x: 644, y: 290, anchor: 'start' } },
      ],
    },
    // The same row on top, so reading starts at the user; the AI and experts sit below.
    userTop: {
      name: 'Symmetric · user on top',
      W: 1240, H: 1040, type: {},
      nodes: { watch: [220, 150], user: [620, 150], phone: [1020, 150], ai: [620, 560], experts: [620, 880] },
      edges: [
        { points: [[540, 134], [300, 134]], label: { x: 330, y: 99, anchor: 'start' } },
        { points: [[300, 166], [540, 166]], label: { x: 330, y: 196, anchor: 'start' } },
        { points: [[700, 134], [940, 134]], label: { x: 910, y: 114, anchor: 'end' } },
        { points: [[940, 166], [700, 166]], label: { x: 910, y: 196, anchor: 'end' } },
        { points: [[204, 240], [204, 576], [540, 576]], label: { x: 260, y: 606, anchor: 'start' } },
        { points: [[540, 544], [236, 544], [236, 240]], label: { x: 260, y: 524, anchor: 'start' } },
        { points: [[1036, 240], [1036, 576], [700, 576]], label: { x: 980, y: 606, anchor: 'end' } },
        { points: [[700, 544], [1004, 544], [1004, 240]], label: { x: 980, y: 524, anchor: 'end' } },
        { points: [[620, 800], [620, 700]], label: { x: 644, y: 750, anchor: 'start' } },
      ],
    },
    // Portrait: user on top, watch and phone on either side, the AI below, experts at the base.
    // Narrow enough that labels stay ≈10px on a 390px phone.
    diamond: {
      name: 'Symmetric · diamond (phone)',
      W: 760, H: 1240, type: { labelSize: 20, titleSize: 17 },
      nodes: { user: [380, 120], watch: [130, 440], phone: [630, 440], ai: [380, 780], experts: [380, 1100] },
      edges: [
        { points: [[302, 104], [114, 104], [114, 362]], label: { x: 36, y: 56, anchor: 'start' } },
        { points: [[146, 362], [146, 136], [302, 136]], label: { x: 160, y: 210, anchor: 'start' } },
        { points: [[458, 104], [646, 104], [646, 362]], label: { x: 724, y: 80, anchor: 'end' } },
        { points: [[614, 362], [614, 136], [458, 136]], label: { x: 600, y: 210, anchor: 'end' } },
        { points: [[114, 520], [114, 796], [302, 796]], label: { x: 120, y: 830, anchor: 'start' } },
        { points: [[302, 764], [146, 764], [146, 520]], label: { x: 160, y: 690, anchor: 'start' } },
        { points: [[646, 520], [646, 796], [458, 796]], label: { x: 640, y: 830, anchor: 'end' } },
        { points: [[458, 764], [614, 764], [614, 520]], label: { x: 600, y: 690, anchor: 'end' } },
        { points: [[380, 1020], [380, 925]], label: { x: 404, y: 975, anchor: 'start' } },
      ],
    },
  }
  // Saved choice, or 'auto': wide frames get "user on top", narrow ones (phones) get the diamond.
  // The studio follows screen orientation (and reloads when it flips); the embed's host passes `narrow`.
  const LAYOUT_CHOICE = LAYOUTS[settings.layout] ? settings.layout : 'auto'
  const portrait = matchMedia('(orientation: portrait)')
  const LAYOUT_KEY = LAYOUT_CHOICE === 'auto' ? ((studio ? portrait.matches : narrow) ? 'diamond' : 'userTop') : LAYOUT_CHOICE
  if (studio && LAYOUT_CHOICE === 'auto') portrait.addEventListener('change', () => location.reload())
  const LAYOUT = LAYOUTS[LAYOUT_KEY]
  // Spacing: shrink the gap between the devices row and Momo, and between Momo and the experts
  // (settings.spacing, px in viewBox units). Only the open space between rows compresses; a band
  // around each row (its node, title and nearby labels) moves rigidly, so nothing distorts.
  const SPACING = { devices: Math.max(0, +settings.spacing.devices || 0), experts: Math.max(0, +settings.spacing.experts || 0) }
  const mapY = (() => {
    // Rigid bands: below a row its node and title (115), above a row its halo (80). Momo → experts
    // keeps 80 more below Momo, so the framework arrow stays at least ~50 long (shorter, it flips).
    const BELOW = 115, ABOVE = 80
    const aiY = LAYOUT.nodes.ai[1], exY = LAYOUT.nodes.experts[1]
    // The device row next to Momo, on the side away from the experts.
    const devY = LAYOUT.nodes[['watch', 'phone', 'user'].find((k) => (LAYOUT.nodes[k][1] - aiY) * (exY - aiY) < 0) ?? 'watch'][1]
    const gaps = [[devY, aiY, SPACING.devices, 0], [aiY, exY, SPACING.experts, 80]]
      .map(([a, b, d, extra]) => [Math.min(a, b) + BELOW + extra, Math.max(a, b) - ABOVE, d])
      .map(([lo, hi, d]) => [lo, hi, Math.min(d, Math.max(0, hi - lo - 5))])
    SPACING.room = gaps.map(([lo, hi]) => Math.max(0, Math.floor((hi - lo - 5) / 5) * 5))
    SPACING.devices = gaps[0][2]
    SPACING.experts = gaps[1][2]
    return (y) => y - gaps.reduce((s, [lo, hi, d]) => s + (y <= lo ? 0 : y >= hi ? d : ((y - lo) / (hi - lo)) * d), 0)
  })()
  const W = LAYOUT.W
  const H = Math.round(mapY(LAYOUT.H))
  const NODES = Object.fromEntries(Object.entries(NODE_INFO).map(([k, n]) => [k, { ...n, x: LAYOUT.nodes[k][0], y: mapY(LAYOUT.nodes[k][1]) }]))
  const EDGES = EDGE_INFO.map((e, i) => {
    const l = LAYOUT.edges[i]
    return { ...e, points: l.points.map(([x, y]) => [x, mapY(y)]), label: { ...l.label, y: mapY(l.label.y), items: e.items } }
  })

  // ---------- Options ----------
  const OPTIONS = [
    {
      id: 'outline',
      name: 'Outline',
      note: 'Closest to the original: same layout, ink strokes on paper.',
      stroke: 2.5,
      radius: 22,
      icon: 2.5,
      label: INK,
      labelSize: 15,
      titleSize: 14,
      titleWeight: 500,
      arrow: 'chevron',
    },
    {
      id: 'hairline',
      name: 'Hairline',
      note: 'Lighter and more editorial: thin strokes, grey labels, small tracked titles.',
      stroke: 1.25,
      radius: 28,
      icon: 1.5,
      label: STONE,
      labelSize: 14,
      titleSize: 12,
      titleWeight: 500,
      titleTrack: 0.08,
      arrow: 'triangle',
    },
    {
      id: 'discs',
      name: 'Discs',
      note: 'Each actor sits on a white disc with the site’s soft card shadow; lines are quieter.',
      stroke: 1.5,
      radius: 24,
      icon: 2,
      line: STONE_LIGHT,
      arrowColor: INK,
      label: INK,
      labelSize: 14,
      titleSize: 13,
      titleWeight: 500,
      arrow: 'triangle',
      disc: 64,
      dots: true,
    },
    {
      id: 'accent',
      name: 'Accent',
      note: 'Colour-coded flows: ink for user data, Unwind blue for AI output, dashed for training data.',
      stroke: 2,
      radius: 22,
      icon: 2,
      label: INK,
      labelSize: 14,
      titleSize: 13,
      titleWeight: 500,
      arrow: 'chevron',
      kinds: { data: { color: INK }, ai: { color: BLUE }, training: { color: STONE, dash: '6 7' } },
      legend: true,
    },
    {
      id: 'live',
      name: 'Live flow',
      note: 'Dotted lines that move in the direction data travels. Good for a scrolling case study.',
      stroke: 2.5,
      radius: 22,
      icon: 2,
      label: INK,
      labelSize: 14,
      titleSize: 13,
      titleWeight: 500,
      arrow: 'chevron',
      dash: '0.1 12',
      animate: true,
      kinds: { ai: { color: BLUE } },
    },
  ]

  // ---------- Drawing ----------
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

  /** Orthogonal polyline with rounded corners. */
  function path(points, r) {
    let d = `M${points[0][0]} ${points[0][1]}`
    for (let i = 1; i < points.length; i++) {
      const [x, y] = points[i]
      const next = points[i + 1]
      if (!next) {
        d += ` L${x} ${y}`
        break
      }
      const [px, py] = points[i - 1]
      const k = Math.min(r, Math.hypot(x - px, y - py) / 2, Math.hypot(next[0] - x, next[1] - y) / 2)
      const inX = x - Math.sign(x - px) * k
      const inY = y - Math.sign(y - py) * k
      const outX = x + Math.sign(next[0] - x) * k
      const outY = y + Math.sign(next[1] - y) * k
      d += ` L${inX} ${inY} Q${x} ${y} ${outX} ${outY}`
    }
    return d
  }

  // Story geometry: titles hang `titleGap` below the halo, and every arrow end (start or tip)
  // keeps `gap` from whatever it meets first — the halo, or the title when it leaves downward.
  const CAP = 0.72 // cap height of the title face, as a share of font size
  const titleBaseline = (node, o, R, titleGap, i) => node.y + R + titleGap + CAP * o.titleSize + i * o.titleSize * 1.35
  const nearestNode = (x, y) => Object.values(NODES).reduce((a, n) => (Math.hypot(n.x - x, n.y - y) < Math.hypot(a.x - x, a.y - y) ? n : a))
  /** Distance from a node's centre, along unit direction (ux, uy) at perpendicular offset `off`, to its edge. */
  function clearance(node, o, R, titleGap, ux, uy, off) {
    // `shown` counts title lines still on screen (lines can be removed in edit mode).
    const lines = node.shown ?? (node.title ? node.title.length + (node.sub ? 1 : 0) : 0)
    if (uy > 0.5 && lines > 0) return titleBaseline(node, o, R, titleGap, lines - 1) - node.y
    return Math.sqrt(Math.max(0, R * R - off * off))
  }
  /** Moves one end of an edge along its straight run so it sits `gap` outside its node. */
  function fitPoint([x, y], [px, py], o, R, gap, titleGap) {
    const node = nearestNode(x, y)
    const len = Math.hypot(x - px, y - py) || 1
    const ux = (x - px) / len, uy = (y - py) / len // pointing into the node
    const off = Math.abs((node.x - x) * uy - (node.y - y) * ux)
    const along = clearance(node, o, R, titleGap, -ux, -uy, off) + gap
    const t = (node.x - x) * ux + (node.y - y) * uy - along
    return [x + ux * t, y + uy * t]
  }
  function fitEdge(e, o, R = 78, gap = 14, titleGap = 14) {
    const p = e.points, n = p.length
    return [fitPoint(p[0], p[1], o, R, gap, titleGap), ...p.slice(1, -1), fitPoint(p[n - 1], p[n - 2], o, R, gap, titleGap)]
  }

  /** Arrowhead size (side length); its depth along the line is size × cos(0.6). */
  const headSize = (o, width, scale = 1) => (o.arrow === 'triangle' ? 7 + width * 1.5 : 7 + width * 2) * scale
  function arrowHead(points, o, color, width, scale = 1) {
    const [x, y] = points[points.length - 1]
    const [px, py] = points[points.length - 2]
    const a = Math.atan2(y - py, x - px)
    const s = headSize(o, width, scale)
    const p1 = [x - s * Math.cos(a - 0.6), y - s * Math.sin(a - 0.6)]
    const p2 = [x - s * Math.cos(a + 0.6), y - s * Math.sin(a + 0.6)]
    if (o.arrow === 'triangle') {
      return `<path d="M${x} ${y} L${p1} L${p2} Z" fill="${color}" />`
    }
    return `<path d="M${p1} L${x} ${y} L${p2}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" />`
  }

  function label(l, o) {
    const lh = o.labelSize * 1.3 // base; the story's Line spacing slider shifts rows from here
    const out = []
    let y = l.y
    const text = (content, x, anchor, y) =>
      `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${o.labelSize}" fill="${o.label}">${content}</text>`
    const row = (inner, cls = '') => `<g class="lbl-row${cls}"><g class="lbl-shift">${inner}</g></g>`
    if (l.lines) for (const line of l.lines) (out.push(row(text(esc(line), l.x, l.anchor, y))), (y += lh))
    if (l.items) {
      if (l.head) {
        out.push(row(text(esc(l.head), l.x, l.anchor, y), ' lbl-head'))
        y += lh
      }
      // Bullets hang from a shared left edge. Right-aligned blocks start at a rough width guess and are
      // wrapped in .lbl-end so alignEndLabels() can measure the real text and pin the right edge to x.
      const width = Math.max(...[l.head ?? '', ...l.items].map((s) => s.length)) * o.labelSize * 0.5 + (l.head ? 0 : o.labelSize + 16)
      const left = l.anchor === 'end' ? l.x - width : l.x
      if (l.anchor === 'end') out.push(`<g class="lbl-end" data-x="${l.x}">`)
      for (const item of l.items) {
        const size = o.labelSize
        const glyph = POINT_ICONS[item].node.map(([tag, attrs]) =>
          `<${tag} ${Object.entries(attrs).filter(([key]) => key !== 'key').map(([key, value]) => `${key}="${value}"`).join(' ')}/>`
        ).join('')
        out.push(row(
          `<g class="lbl-icon" aria-label="${esc(item)}" transform="translate(${left + 8} ${y - size + 2}) scale(${size / 24})" fill="none" stroke="${o.label}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g class="lbl-glyph">${glyph}</g></g>` +
          text(esc(item), left + size + 16, 'start', y),
          ` lbl-item" data-item="${esc(item)}`,
        ))
        y += lh
      }
      if (l.anchor === 'end') out.push('</g>')
    }
    return out.join('')
  }

  /** Pins every right-aligned bullet block's measured right edge to its anchor x. Call after insert. */
  function alignEndLabels(root) {
    root.querySelectorAll('.lbl-end').forEach((g) => {
      g.removeAttribute('transform')
      const b = g.getBBox()
      if (b.width) g.setAttribute('transform', `translate(${(+g.dataset.x - (b.x + b.width)).toFixed(2)} 0)`)
    })
  }


  function titleText(node, o) {
    const title = node.title.map((line, i) =>
      `<text x="${node.x}" y="${titleBaseline(node, o, 78, 14, i)}" text-anchor="middle" font-size="${o.titleSize}" font-weight="${o.titleWeight}" letter-spacing="${o.titleTrack ?? 0.04}em" fill="${INK}">${esc(line)}</text>`)
    if (node.sub) title.push(`<text x="${node.x}" y="${titleBaseline(node, o, 78, 14, node.title.length)}" text-anchor="middle" font-size="${o.titleSize + 1}" fill="${STONE}">${esc(node.sub)}</text>`)
    return title.join('')
  }

  function render(o) {
    const parts = []
    parts.push(`<defs><filter id="shadow-${o.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000" flood-opacity="0.08"/></filter></defs>`)
    parts.push(`<rect width="${W}" height="${H}" fill="#f5f5f5" />`)
    if (o.animate) parts.push('<style>.flow{animation:flow 1.6s linear infinite}@keyframes flow{to{stroke-dashoffset:-24}}@media(prefers-reduced-motion:reduce){.flow{animation:none}}</style>')

    EDGES.forEach((e, index) => {
      const kind = o.kinds?.[e.kind] ?? {}
      const color = kind.color ?? o.line ?? INK
      const dash = o.presetDash ?? kind.dash ?? o.dash
      const cls = o.animate ? ' class="flow"' : ''
      parts.push(`<g class="edge" data-edge="${index}">`)
      const pts = fitEdge(e, o)
      parts.push(
        `<path class="edge__line" d="${path(pts, o.radius)}" fill="none" stroke="${color}" stroke-width="${o.stroke}" stroke-linecap="round" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ''}${cls} />`,
      )
      parts.push(arrowHead(pts, o, kind.color ?? o.arrowColor ?? color, o.stroke))
      if (o.dots) parts.push(`<circle cx="${e.points[0][0]}" cy="${e.points[0][1]}" r="3.5" fill="${o.arrowColor ?? INK}" />`)
      parts.push(`<g class="edge__label">${e.label ? label(e.label, o) : ''}</g></g>`)
    })

    for (const [key, node] of Object.entries(NODES)) {
      parts.push(`<g class="node" data-node="${key}">`)
      if (o.story) parts.push(`<circle class="node__halo" cx="${node.x}" cy="${node.y}" r="78" fill="${BLUE}" />`)
      if (o.disc) parts.push(`<circle cx="${node.x}" cy="${node.y}" r="${o.disc}" fill="#fff" filter="url(#shadow-${o.id})" />`)
      const size = o.disc ? 112 : 142
      if (node.icon === 'momo') {
        // Momo, open eyes (still). Studio controls nudge and scale it inside its halo.
        const still = size * 1.18
        parts.push(`<image class="momo-still" href="${assets.momoStill}" x="${node.x - still / 2}" y="${node.y - still * 0.4125}" width="${still}" height="${still}" preserveAspectRatio="xMidYMid meet"/>`)
      } else {
        parts.push(`<image href="${assets[node.icon]}" x="${node.x - size / 2}" y="${node.y - size / 2}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>`)
      }
      parts.push(titleText(node, o), '</g>')
    }
    if (o.story) parts.push('<g class="story-flow"></g>')

    if (o.legend) {
      const items = [
        ['User data', INK, ''],
        ['AI output', BLUE, ''],
        ['Training data', STONE, '6 7'],
      ]
      items.forEach(([name, color, dash], i) => {
        const x = W - 440 + i * 140
        parts.push(`<path d="M${x} ${H - 34} h28" stroke="${color}" stroke-width="${o.stroke}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''} />`)
        parts.push(`<text x="${x + 38}" y="${H - 29}" font-size="13" fill="${STONE}">${name}</text>`)
      })
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="--ar: ${(W / H).toFixed(4)}" font-family="Beatrice, system-ui, sans-serif" letter-spacing="-0.01em" role="img" aria-label="Unwind system design — ${o.name}">${parts.join('')}</svg>`
  }

  // ---------- Animated walkthrough (Hairline treatment) ----------
  // Story orders: different logics for which arrows appear in which step; all end on the full loop.
  // Within a step, arrows enter in the listed order. Edge indices follow EDGE_INFO:
  // 0 user→watch, 1 watch→user, 2 user→phone, 3 phone→user, 4 watch→ai, 5 ai→watch, 6 phone→ai, 7 ai→phone, 8 experts→ai.
  const FULL = { title: 'The full loop', text: 'Every exchange runs both ways, so each nudge fits you a little better.', edges: [0, 1, 2, 3, 4, 5, 6, 7, 8], nodes: Object.keys(NODES) }
  const ORDERS = {
    device: {
      name: 'By device (pairs)',
      waves: [0, 2],
      steps: [
        { title: 'You and your watch', text: 'The watch senses physiological signals and movement, and answers with a gentle nudge.', edges: [0, 1], nodes: ['user', 'watch'] },
        { title: 'Watch and AI', text: 'The watch shares key moments with the AI, guided by the experts’ framework; the AI learns the right time to nudge.', edges: [4, 8, 5], nodes: ['watch', 'ai', 'experts'] },
        { title: 'AI, phone and you', text: 'The AI sends personal insights to your phone; you reflect, and your journal and context flow back.', edges: [7, 3, 2, 6], nodes: ['ai', 'phone', 'user'] },
      ],
    },
    moment: {
      name: 'Follow one moment',
      waves: [0, 2],
      steps: [
        { title: 'Notice', text: 'Your watch picks up a change in your body and passes the key moment to the AI, read through the experts’ framework.', edges: [0, 4, 8], nodes: ['user', 'watch', 'ai', 'experts'] },
        { title: 'Nudge', text: 'The AI picks the right time, and the watch gives you a gentle nudge.', edges: [5, 1], nodes: ['ai', 'watch', 'user'] },
        { title: 'Reflect', text: 'You talk it through on your phone; your journal and context reach the AI.', edges: [2, 6], nodes: ['user', 'phone', 'ai'] },
        { title: 'Understand', text: 'The AI sends personal insights back, and your phone shows you patterns and action plans.', edges: [7, 3], nodes: ['ai', 'phone', 'user'] },
      ],
    },
    inout: {
      name: 'Data in, answers out',
      // Each step's arrows are one move (all data in, all answers out), so they draw together.
      together: true,
      waves: [1, 2],
      steps: [
        { title: 'You share', text: 'Your body signals reach the watch and your voice reaches the phone; the experts set the framework.', edges: [0, 2, 8], nodes: ['user', 'watch', 'phone', 'experts', 'ai'] },
        { title: 'Data in', text: 'Both devices pass what they learned to the AI: key moments, your journal and context.', edges: [4, 6], nodes: ['watch', 'phone', 'ai'] },
        { title: 'Answers out', text: 'The AI answers each device: when to nudge, and what insights to share.', edges: [5, 7], nodes: ['ai', 'watch', 'phone'] },
        { title: 'Back to you', text: 'A gentle nudge on your wrist, patterns and plans on your phone.', edges: [1, 3], nodes: ['watch', 'phone', 'user'] },
      ],
    },
    loops: {
      name: 'Watch loop, then phone loop',
      waves: [0, 1],
      steps: [
        { title: 'The watch loop', text: 'Signals go from you to the watch and on to the AI, guided by the experts; the right nudge comes back.', edges: [0, 4, 8, 5, 1], nodes: ['user', 'watch', 'ai', 'experts'] },
        { title: 'The phone loop', text: 'Your reflection goes from the phone to the AI; insights, patterns and plans come back.', edges: [2, 6, 7, 3], nodes: ['user', 'phone', 'ai'] },
      ],
    },
  }
  const ORDER_KEY = ORDERS[settings.order] ? settings.order : 'inout'
  const STORY = [...ORDERS[ORDER_KEY].steps, FULL]
  // Per-step settings (reveal, waves, step time) are kept per order; 'device' keeps its original plain keys.
  const stepKey = (i) => (ORDER_KEY === 'device' ? i : `${ORDER_KEY}:${i}`)
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  const ease = (x) => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, x))) / 2
  // Flow feels. All follow the case study's rule: ink stays still, only Unwind blue moves.
  // Same strand palette as the voice band (src/features/unwindIntro/braid.js).
  const BRAID_PAL = ['#53BFFE', '#00D0FF', '#B9A7F5', '#FFB3C7']
  const FEELS = {
    breathe: { name: 'Breathe', note: 'Lines draw in slowly, then glow in and out like a breath.', step: 5600, draw: 1600 },
    ripple: { name: 'Ripple', note: 'One soft dot crosses each line; a ring spreads where it lands.', step: 5000, draw: 1200 },
    tide: { name: 'Tide', note: 'Fine blue dots drift slowly along the line, like the Live flow option.', step: 5400, draw: 1400 },
    comet: { name: 'Braided comet', note: 'A short braided wave: four soft strands twist around each other as they glide along the line.', step: 4800, draw: 1000,
      braid: { mode: 'comet', strands: 4, win: 170, thick: 2.6, amp: 7, wave: 0.075, spin: 0.006, phase: 2.4, travel: 2400, blur: 1.4, alpha: 0.85 } },
    ribbon: { name: 'Braided ribbon', note: 'The whole line becomes the braid: strands roll gently along it, end to end.', step: 5600, draw: 1400,
      braid: { mode: 'ribbon', strands: 4, thick: 1.5, amp: 4.5, wave: 0.045, spin: 0.0035, phase: 2.4, blur: 1, alpha: 0.75 } },
    wake: { name: 'Braided wake', note: 'The braid draws the line: wavy at the moving tip, settling into a calm thread behind it.', step: 5400, draw: 600,
      braid: { mode: 'wake', strands: 4, thick: 2.2, amp: 8, wave: 0.06, spin: 0.005, phase: 2.4, travel: 2600, blur: 1.2, alpha: 0.85 } },
    thread: { name: 'Braided thread', note: 'Two blue strands, tight and fine, spiral quickly along each line.', step: 4600, draw: 900,
      braid: { mode: 'comet', strands: 2, win: 120, thick: 1.4, amp: 4.5, wave: 0.12, spin: 0.009, phase: Math.PI, travel: 1800, blur: 0.6, alpha: 0.95 } },
    ink: { name: 'Ink in', note: 'The line draws once and holds. Stillest; the caption does the work.', step: 5200, draw: 2000 },
    pulse: { name: 'Pulse dots', note: 'Three dots chase along each line. The first version.', step: 4200, draw: 900 },
  }

  // [key, label, min, max, step] — seconds, except speed (×).
  const TIMING_FIELDS = [
    ['step', 'Step', 2.5, 12, 0.1],
    ['draw', 'Line draw', 0.2, 4, 0.05],
    ['text', 'Text start', 0, 3, 0.05],
    ['stagger', 'Text stagger', 0.04, 0.8, 0.01],
    ['spot', 'Icon motion', 0.3, 2.5, 0.05],
    ['gap', 'Next arrow', 0, 3, 0.05],
    ['bullet', 'Next bullet', 0, 3, 0.05],
    ['speed', 'Flow speed', 0.25, 2, 0.05],
  ]
  // Small motion per bullet icon, played when the bullet takes the spotlight (icon units, 24-grid).
  const ICON_MOTION = {
    // 'drawbeat': the trace draws left to right, then pulses like a heartbeat (handled by playIcon).
    'physiological signals': 'drawbeat',
    'movement + activity': [{ transform: 'rotate(0)' }, { transform: 'rotate(-12deg)' }, { transform: 'rotate(10deg)' }, { transform: 'rotate(-5deg)' }, { transform: 'rotate(0)' }],
    'evidence-based framework': [{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1)' }],
    'gentle nudge': [{ transform: 'rotate(0)' }, { transform: 'rotate(-14deg)' }, { transform: 'rotate(12deg)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(0)' }],
    // 'voice': waves are captured at the top of the mic (handled by playIcon).
    'voice reflection': 'voice',
    // 'stack': the layers drop in one after another, bottom to top (handled by playIcon).
    'user context': 'stack',
    'voice journal': [{ transform: 'rotate(0)' }, { transform: 'rotate(-10deg)' }, { transform: 'rotate(6deg)' }, { transform: 'rotate(0)' }],
    // 'draw': the chart line draws itself (handled by playIcon).
    patterns: 'draw',
    'action plans': [{ transform: 'scale(1)' }, { transform: 'scale(0.75)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }],
    'key moments': [{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(0.95)' }, { transform: 'scale(1)' }],
    'nudge timing': [{ transform: 'rotate(0)' }, { transform: 'rotate(20deg)' }, { transform: 'rotate(-8deg)' }, { transform: 'rotate(0)' }],
    // 'shine': the bulb grows, then rays flash from its top (handled by playIcon).
    'personal insights': 'shine',
  }
  // Motion presets any bullet icon can use instead of its own (chosen in the Icon motion row).
  const MOTIONS = {
    original: { name: 'Original' },
    pulse: { name: 'Pulse', frames: [{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }] },
    pop: { name: 'Pop in', frames: [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.25)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)', opacity: 1 }] },
    wiggle: { name: 'Wiggle', frames: [{ transform: 'rotate(0)' }, { transform: 'rotate(-14deg)' }, { transform: 'rotate(12deg)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(0)' }] },
    bounce: { name: 'Bounce', frames: [{ transform: 'translateY(0)' }, { transform: 'translateY(-5px)' }, { transform: 'translateY(0)' }, { transform: 'translateY(-2px)' }, { transform: 'translateY(0)' }] },
    shake: { name: 'Shake', frames: [{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(-2px)' }, { transform: 'translateX(0)' }] },
    spin: { name: 'Spin', frames: [{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }] },
    flip: { name: 'Flip', frames: [{ transform: 'scaleX(1)' }, { transform: 'scaleX(-1)' }, { transform: 'scaleX(1)' }] },
    heartbeat: { name: 'Heartbeat', frames: [{ transform: 'scale(1)' }, { transform: 'scale(1.25)', offset: 0.15 }, { transform: 'scale(1)', offset: 0.3 }, { transform: 'scale(1.18)', offset: 0.45 }, { transform: 'scale(1)' }] },
    draw: { name: 'Draw line', frames: 'draw' },
    drawbeat: { name: 'Draw + heartbeat', frames: 'drawbeat' },
    stack: { name: 'Stack up', frames: 'stack' },
    voice: { name: 'Voice waves', frames: 'voice' },
    shine: { name: 'Grow + shine', frames: 'shine' },
    none: { name: 'None', frames: null },
  }

  // [key, name, min, max, step, default, css var]; line spacing has no var, it shifts label rows.
  const LOOK_FIELDS = [
    ['pastOp', 'Past steps', 0, 1, 0.05, 0.25, '--past-op'],
    ['idleOp', 'Idle icons', 0, 1, 0.05, 1, '--idle-op'],
    ['waveOp', 'Wave', 0, 1, 0.05, 1, '--wave-op'],
    ['haloOp', 'Halo opacity', 0, 0.4, 0.01, 0.1, '--halo-op'],
    ['haloScale', 'Halo size', 0.2, 1.6, 0.05, 1, '--halo-scale'],
    ['iconScale', 'Icon size', 0.5, 1.6, 0.05, 1, '--icon-scale'],
    ['lineSp', 'Line spacing', 1, 2.4, 0.05, 1.3, null],
    ['arrowGap', 'Arrow gap', 0, 48, 1, 14, null],
    ['titleGap', 'Title gap', 0, 48, 1, 14, null],
    ['momoX', 'Momo x', -80, 80, 1, 0, '--momo-x'],
    ['momoY', 'Momo y', -80, 80, 1, 0, '--momo-y'],
    ['momoScale', 'Momo size', 0.4, 2, 0.05, 1, '--momo-scale'],
    ['tipScale', 'Arrow tip', 0.5, 2.5, 0.05, 1],
    ['labelGap', 'Label gap', 4, 40, 1, 16],
  ]
  // How label rows enter, chosen per step.
  const REVEALS = {
    rise: { name: 'Rise', frames: [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }] },
    fade: { name: 'Fade', duration: 700, frames: [{ opacity: 0 }, { opacity: 1 }] },
    slide: { name: 'Slide in', frames: [{ opacity: 0, transform: 'translateX(-14px)' }, { opacity: 1, transform: 'none' }] },
    drop: { name: 'Drop', frames: [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }] },
    blur: { name: 'Focus', duration: 700, frames: [{ opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0)' }] },
    pop: { name: 'Pop', duration: 420, frames: [{ opacity: 0, transform: 'scale(0.9)' }, { opacity: 1, transform: 'none' }] },
    wipe: { name: 'Wipe', duration: 650, frames: [{ opacity: 1, clipPath: 'inset(-20% 100% -20% 0)' }, { opacity: 1, clipPath: 'inset(-20% 0 -20% 0)' }] },
  }

  function mountStory() {
    const base = OPTIONS.find((o) => o.id === 'hairline')
    const o = { ...base, ...LAYOUT.type, id: 'story', story: true }
    const section = document.createElement('section')
    section.className = 'option story'
    section.id = 'story'
    section.innerHTML = `
      <div class="option__head"${studio ? '' : ' hidden'}>
        <h2>Animated — how it works</h2>
        <p class="story__feelnote"></p>
        <label>Layout <select data-act="layout" aria-label="Composition">${[['auto', `Auto (now ${LAYOUTS[LAYOUT_KEY].name})`], ...Object.entries(LAYOUTS).map(([k, l]) => [k, l.name])].map(([k, name]) => `<option value="${k}"${k === LAYOUT_CHOICE ? ' selected' : ''}>${name}</option>`).join('')}</select></label>
        <label>Order <select data-act="order" aria-label="Story order">${Object.entries(ORDERS).map(([k, r]) => `<option value="${k}"${k === ORDER_KEY ? ' selected' : ''}>${r.name}</option>`).join('')}</select></label>
        <label>Devices ↔ Momo <input type="range" data-spacing="devices" min="0" max="${SPACING.room[0]}" step="5" value="${SPACING.devices}" /><output>−${SPACING.devices}px</output></label>
        <label>Momo ↔ experts <input type="range" data-spacing="experts" min="0" max="${SPACING.room[1]}" step="5" value="${SPACING.experts}" /><output>−${SPACING.experts}px</output></label>
        <label>Feel <select data-act="feel" aria-label="Flow feel">${Object.entries(FEELS).map(([k, f]) => `<option value="${k}">${f.name}</option>`).join('')}</select></label>
        <button type="button" data-act="play">Pause</button>
      </div>
      <div class="story__caption" aria-live="polite">
        <span class="story__num"></span>
        <div><strong class="story__title"></strong><p class="story__text"></p></div>
      </div>
      <div class="story__timing" aria-label="Timing"${studio ? '' : ' hidden'}>
        ${TIMING_FIELDS.map(([k, name, min, max, stepv]) => `<label>${name} <input type="range" data-t="${k}" min="${min}" max="${max}" step="${stepv}" /><output></output></label>`).join('')}
        <button type="button" data-act="reset">Reset timing</button>
        <label>Arrow opacity <input type="range" data-act="arrow-op" min="0" max="1" step="0.05" /><output></output></label>
      </div>
      <div class="story__timing" aria-label="Look"${studio ? '' : ' hidden'}>
        ${LOOK_FIELDS.map(([k, name, min, max, stepv]) => `<label>${name} <input type="range" data-look="${k}" min="${min}" max="${max}" step="${stepv}" /><output></output></label>`).join('')}
        <label><input type="checkbox" data-act="halo" /> Show halo</label>
        <label><input type="checkbox" data-act="waves-all" /> Braided waves</label>
        <button type="button" data-act="reset-look">Reset look</button>
      </div>
      <div class="story__timing" aria-label="Text"${studio ? '' : ' hidden'}>
        <label>Text in (this step) <select data-act="reveal">${Object.entries(REVEALS).map(([k, r]) => `<option value="${k}">${r.name}</option>`).join('')}</select></label>
        <label><input type="checkbox" data-act="wave" /> Wave this step</label>
        <label>This step lasts <input type="range" data-act="step-dur" min="1" max="20" step="0.1" /><output></output></label>
        <button type="button" data-act="step-dur-reset">Use default</button>
        <button type="button" data-act="prev">← Prev</button>
        <button type="button" data-act="next">Next →</button>
        <button type="button" data-act="preview">Preview transition into this step</button>
        <button type="button" data-act="edit">Edit text</button>
        <button type="button" data-act="reset-text">Reset text</button>
      </div>
      <div class="story__timing" aria-label="Arrows" data-act="arrow-times"${studio ? '' : ' hidden'}></div>
      <div class="story__timing" aria-label="Icon motion" data-act="icon-motions"${studio ? '' : ' hidden'}></div>
      ${render(o)}
      <nav class="story__steps">${STORY.map((s, i) => `<button type="button" data-step="${i}"><span>${String(i + 1).padStart(2, '0')}</span>${s.title}</button>`).join('')}</nav>`
    root.append(section)

    const svg = section.querySelector('svg')
    const layer = svg.querySelector('.story-flow')
    const revealSelect = section.querySelector('[data-act="reveal"]')
    const waveToggle = section.querySelector('[data-act="wave"]')
    // The flow (braid, pulse, …) plays only on chosen steps; each order names its default wave steps.
    const WAVE_STEPS = ORDERS[ORDER_KEY].waves
    const waveFor = (i) => (typeof settings.waves[stepKey(i)] === 'boolean' ? settings.waves[stepKey(i)] : WAVE_STEPS.includes(i))
    let waveOn = true
    // Arrows row: start and draw time for each arrow this step draws. Saved per arrow (edge index),
    // so a time set here applies wherever that arrow first appears.
    const arrowTimes = section.querySelector('[data-act="arrow-times"]')
    const sec = (ms) => `${(ms / 1000).toFixed(2)}s`
    function renderArrowTimes() {
      const fresh = flows.filter((f) => f.fresh)
      if (!fresh.length) { arrowTimes.innerHTML = '<span>Arrows: all already drawn in this step</span>'; return }
      arrowTimes.innerHTML = fresh.map((f) => {
        const { from, to } = EDGE_INFO[f.e]
        const own = settings.edgeTime[f.e] ?? {}
        return `<span class="arrow-time" data-edge="${f.e}"><b>${from} → ${to}</b>
          <label>Starts <input type="range" data-k="start" min="0" max="10" step="0.05" value="${f.delay / 1000}" /><output>${sec(f.delay)}${own.start == null ? ' (auto)' : ''}</output></label>
          <label>Draw <input type="range" data-k="draw" min="0.2" max="4" step="0.05" value="${f.draw / 1000}" /><output>${sec(f.draw)}${own.draw == null ? ' (default)' : ''}</output></label>
          <button type="button" data-k="reset">Use default</button></span>`
      }).join('')
    }
    arrowTimes.addEventListener('input', (ev) => {
      const inp = ev.target.closest('input[data-k]')
      if (!inp) return
      const e = +inp.closest('[data-edge]').dataset.edge
      settings.edgeTime[e] = { ...settings.edgeTime[e], [inp.dataset.k]: +inp.value * 1000 }
      saveSettings()
      inp.nextElementSibling.textContent = sec(+inp.value * 1000)
    })
    // Replay the step once a slider settles, so the new timing is visible.
    arrowTimes.addEventListener('change', () => show(step))
    arrowTimes.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-k="reset"]')
      if (!btn) return
      delete settings.edgeTime[+btn.closest('[data-edge]').dataset.edge]
      saveSettings()
      show(step)
    })
    // Icon motion row: a motion menu and a size slider per bullet icon in this step. Saved per bullet
    // (settings.iconMotion, settings.iconScale), so a choice applies wherever that bullet appears.
    // 'Original' keeps the icon's own motion.
    // Returns keyframes, or 'draw' for the line-drawing motion (the icon's last stroke draws itself).
    const motionFor = (item) => {
      const k = settings.iconMotion[item]
      return MOTIONS[k] && k !== 'original' ? MOTIONS[k].frames : ICON_MOTION[item]
    }
    function playIcon(glyph, motion, delay = 0) {
      glyph.getAnimations({ subtree: true }).forEach((a) => a.cancel())
      if (!motion || reduceMotion) return
      const duration = timing.spot * 0.85
      if (motion === 'stack') {
        // Lowest layer first: each drops a little and fades in, then the next lands on top.
        const layers = [...glyph.querySelectorAll('path, polyline, rect, circle')].sort((a, b) => b.getBBox().y - a.getBBox().y)
        const each = duration / Math.max(1, layers.length) * 1.2
        layers.forEach((p, i) => p.animate(
          [{ transform: 'translateY(-5px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
          { duration: each * 1.4, delay: delay + i * each, easing: 'cubic-bezier(.2,.8,.3,1.2)', fill: 'backwards' },
        ))
        return
      }
      if (motion === 'voice') {
        // Sound waves above the mic travel down into it one after another, then are removed.
        const ns = 'http://www.w3.org/2000/svg'
        for (let i = 0; i < 3; i++) {
          const w = document.createElementNS(ns, 'path')
          w.setAttribute('d', 'M7 -1.5 Q12 -5.5 17 -1.5')
          w.setAttribute('class', 'mic-wave')
          glyph.append(w)
          w.animate(
            [{ transform: 'translateY(-7px) scale(1.3)', opacity: 0 }, { opacity: 1, offset: 0.35 }, { transform: 'translateY(1px) scale(0.6)', opacity: 0 }],
            { duration: duration * 0.9, delay: delay + i * duration * 0.3, easing: 'ease-in', fill: 'both' },
          ).finished.then(() => w.remove(), () => w.remove())
        }
        return
      }
      if (motion === 'shine') {
        // The bulb grows, then three rays flash out from its top and fade; rays are temporary paths.
        glyph.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)', offset: 0.5 }, { transform: 'scale(1)' }], { duration, delay, easing: 'ease-in-out' })
        const ns = 'http://www.w3.org/2000/svg'
        for (const d of ['M12 -2.6 V-5.4', 'M5.6 -0.4 L3.8 -2.2', 'M18.4 -0.4 L20.2 -2.2']) {
          const ray = document.createElementNS(ns, 'path')
          ray.setAttribute('d', d)
          ray.setAttribute('class', 'bulb-ray')
          glyph.append(ray)
          ray.animate(
            [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.15)', opacity: 1, offset: 0.3 }, { transform: 'scale(1)', opacity: 1, offset: 0.75 }, { transform: 'scale(1)', opacity: 0 }],
            { duration: duration * 1.4, delay: delay + duration * 0.45, easing: 'ease-out', fill: 'both' },
          ).finished.then(() => ray.remove(), () => ray.remove())
        }
        return
      }
      if (motion !== 'draw' && motion !== 'drawbeat') {
        // Ring lines (the bell's side arcs) are visible only while the icon moves.
        glyph.querySelectorAll('.ring-line').forEach((p) => p.animate(
          [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }],
          { duration, delay, easing: 'linear' },
        ))
        return glyph.animate(motion, { duration, delay, easing: 'ease-in-out' })
      }
      const line = [...glyph.querySelectorAll('path, polyline')].pop()
      if (!line) return
      line.setAttribute('pathLength', '1')
      // Draw left to right whatever direction the path was authored in (a negative offset reveals from its end).
      const total = line.getTotalLength()
      const from = line.getPointAtLength(0).x > line.getPointAtLength(total).x ? -1 : 1
      line.animate([{ strokeDasharray: 1, strokeDashoffset: from }, { strokeDasharray: 1, strokeDashoffset: 0 }], { duration: duration * 1.3, delay, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'backwards' })
      // Then a heartbeat: two quick pulses once the line is drawn.
      if (motion === 'drawbeat') glyph.animate(MOTIONS.heartbeat.frames, { duration: duration * 1.1, delay: delay + duration * 1.3, easing: 'ease-in-out' })
    }
    // Size uses the CSS `scale` property, so it stacks with the motion's `transform` keyframes.
    const applyIconScales = () => svg.querySelectorAll('.lbl-item').forEach((r) => {
      const v = Number(settings.iconScale[r.dataset.item])
      r.querySelector('.lbl-glyph').style.scale = v > 0 && v !== 1 ? String(v) : ''
    })
    applyIconScales()
    // Mark the bell's two side arcs (lucide bell-ring) so they can stay hidden at rest.
    svg.querySelectorAll('.lbl-glyph path[d^="M22 8c"], .lbl-glyph path[d^="M4 2C"]').forEach((p) => p.classList.add('ring-line'))
    const iconMotions = section.querySelector('[data-act="icon-motions"]')
    function renderIconMotions() {
      const items = [...new Set(STORY[step].edges.flatMap((e) =>
        [...svg.querySelectorAll(`.edge[data-edge="${e}"] .lbl-item:not(.is-gone)`)].map((r) => r.dataset.item)))]
      iconMotions.innerHTML = `<span>Icon motion</span>${items.map((item) => {
        const cur = MOTIONS[settings.iconMotion[item]] ? settings.iconMotion[item] : 'original'
        const size = Number(settings.iconScale[item]) || 1
        return `<label>${item} <select data-item="${item}">${Object.entries(MOTIONS).map(([k, m]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${m.name}</option>`).join('')}</select>` +
          `<input type="range" data-scale="${item}" min="0.5" max="2" step="0.05" value="${size}" aria-label="${item} size" /><output>${size.toFixed(2)}×</output></label>`
      }).join('')}<button type="button" data-act="preview-icons">Preview</button>`
    }
    // Play every icon in this step once, so a choice can be judged without replaying the step.
    const previewIcons = () => STORY[step].edges.forEach((e) =>
      svg.querySelectorAll(`.edge[data-edge="${e}"] .lbl-item:not(.is-gone)`).forEach((r) => {
        const glyph = r.querySelector('.lbl-glyph')
        if (glyph) playIcon(glyph, motionFor(r.dataset.item))
      }))
    iconMotions.addEventListener('change', (ev) => {
      const sel = ev.target.closest('select[data-item]')
      if (!sel) return
      if (sel.value === 'original') delete settings.iconMotion[sel.dataset.item]
      else settings.iconMotion[sel.dataset.item] = sel.value
      saveSettings()
      previewIcons()
    })
    iconMotions.addEventListener('input', (ev) => {
      const inp = ev.target.closest('input[data-scale]')
      if (!inp) return
      if (+inp.value === 1) delete settings.iconScale[inp.dataset.scale]
      else settings.iconScale[inp.dataset.scale] = +inp.value
      saveSettings()
      inp.nextElementSibling.textContent = `${(+inp.value).toFixed(2)}×`
      applyIconScales()
    })
    iconMotions.addEventListener('click', (ev) => { if (ev.target.closest('[data-act="preview-icons"]')) previewIcons() })
    // Each step can hold for its own time; otherwise it uses the Step slider.
    const stepDurInput = section.querySelector('[data-act="step-dur"]')
    const stepDuration = () => {
      const v = Number(settings.stepDur[stepKey(step)])
      return Number.isFinite(v) && v > 0 ? Math.min(20000, Math.max(1000, v)) : timing.step
    }
    const syncStepDur = () => {
      const custom = settings.stepDur[stepKey(step)] != null
      stepDurInput.value = stepDuration() / 1000
      stepDurInput.nextElementSibling.textContent = `${(stepDuration() / 1000).toFixed(1)}s${custom ? '' : ' (default)'}`
    }
    const lines = [...svg.querySelectorAll('.edge__line')]
    // Braided strands, ported from the case-study voice band (braid.js): same palette, a phase
    // offset per strand, and a soft blur. Each strand is a filled ribbon offset along the edge normal.
    function drawBraid(f, B, after, live) {
      f.g.style.opacity = live ? String(B.alpha * Math.min(1, after / 500)) : '0'
      if (!live) return
      let a, b, env
      if (B.mode === 'comet') {
        const pos = (after / B.travel) % 1
        const head = pos * (f.len + B.win)
        a = head - B.win; b = head
        if (after / B.travel >= f.len / (f.len + B.win)) f.arrived = true
        env = (u) => Math.pow(Math.sin(Math.PI * u), 0.8) * (0.3 + 0.7 * u)
      } else if (B.mode === 'ribbon') {
        a = 0; b = f.len
        f.arrived = true
        const breath = 0.75 + 0.25 * Math.cos(after / 1400)
        const fade = Math.min(1, 40 / f.len)
        env = (u) => Math.min(1, u / fade, (1 - u) / fade) * breath
      } else {
        // wake: the tip travels the edge once per cycle, leaving a thinning calm thread.
        const cyc = (after % (B.travel + 900)) / B.travel
        a = 0; b = Math.min(1, cyc) * f.len
        if (after / B.travel >= 1) f.arrived = true
        const hold = cyc > 1 ? 1 - (cyc - 1) * (B.travel / 900) : 1
        env = (u) => (0.12 + 0.88 * u * u) * Math.min(1, (1 - u) * 14 + 0.15) * hold
      }
      const lo = Math.max(0, a), hi = Math.min(f.len, b)
      const span = b - a || 1
      const win = f.pts.filter((p) => p.s >= lo && p.s <= hi)
      f.strands.forEach((path, k) => {
        if (win.length < 2) return path.setAttribute('d', '')
        const up = [], dn = []
        for (const p of win) {
          const e = env((p.s - a) / span)
          const o = B.amp * e * Math.sin(p.s * B.wave * (1 + k * 0.18) - after * B.spin * (1 + k * 0.35) + k * B.phase)
          const h = Math.max(0.35, B.thick * (0.35 + 0.65 * e) * (0.85 + 0.15 * Math.sin(p.s * 0.09 - after * 0.004 + k)))
          up.push(`${(p.x + p.nx * (o - h)).toFixed(1)} ${(p.y + p.ny * (o - h)).toFixed(1)}`)
          dn.push(`${(p.x + p.nx * (o + h)).toFixed(1)} ${(p.y + p.ny * (o + h)).toFixed(1)}`)
        }
        path.setAttribute('d', `M${up.join('L')}L${dn.reverse().join('L')}Z`)
      })
    }

    const SVGNS = 'http://www.w3.org/2000/svg'
    svg.insertAdjacentHTML('afterbegin', '<defs><filter id="story-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter><filter id="story-braid" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.2"/></filter></defs>')
    // The embed waits for start() (its host calls it once the figure is in view).
    let step = 0, playing = studio && !reduceMotion, started = 0, flows = [], labels = [], feel = FEELS.breathe
    const timing = {}
    const el = (tag, attrs) => {
      const n = document.createElementNS(SVGNS, tag)
      for (const k in attrs) n.setAttribute(k, attrs[k])
      layer.append(n)
      return n
    }

    function show(i) {
      step = (i + STORY.length) % STORY.length
      const s = STORY[step]
      section.querySelector('.story__num').textContent = String(step + 1).padStart(2, '0')
      section.querySelector('.story__title').textContent = s.title
      section.querySelector('.story__text').textContent = s.text
      section.querySelectorAll('[data-step]').forEach((b) => b.setAttribute('aria-current', String(+b.dataset.step === step)))
      // Earlier steps stay on screen, dimmed; later ones stay hidden. Labels already on screen
      // (current or dimmed) don't replay their entrance; step 1 restarts the loop, so it replays all.
      const shown = new Set(step === 0 ? [] : [...svg.querySelectorAll('.edge.is-on, .edge.is-past')].map((g) => +g.dataset.edge))
      const past = new Set(STORY.slice(0, step).flatMap((p) => p.edges))
      svg.querySelectorAll('.edge').forEach((g) => {
        const on = s.edges.includes(+g.dataset.edge)
        g.classList.toggle('is-on', on)
        g.classList.toggle('is-past', !on && past.has(+g.dataset.edge))
      })
      svg.querySelectorAll('.node').forEach((g) => g.classList.toggle('is-on', s.nodes.includes(g.dataset.node)))
      layer.innerHTML = ''
      lines.forEach((line) => {
        line.style.opacity = ''
        line.parentNode.classList.remove('is-live', 'is-blue')
      })
      // Arrows in a step enter one after another, in STORY order (send, then reply), `gap` apart,
      // unless an arrow has its own start/draw time (settings.edgeTime, set in the Arrows row).
      let order = 0
      flows = s.edges.map((e, k) => {
        lines[e].parentNode.classList.add('is-blue')
        const fresh = !reduceMotion && !shown.has(e)
        const own = settings.edgeTime[e] ?? {}
        const auto = fresh && !ORDERS[ORDER_KEY].together ? order++ * timing.gap : 0
        const delay = fresh ? (own.start ?? auto) : 0
        const draw = own.draw ?? timing.draw
        const d = lines[e].getAttribute('d')
        const trace = el('path', { class: 'trace', d, pathLength: 1 })
        const len = trace.getTotalLength()
        const f = { trace, len, k, e, fresh, delay, draw, auto, base: lines[e], end: trace.getPointAtLength(len) }
        // Newly shown arrows grow from start to end; the head appears as the line reaches it.
        if (!reduceMotion && !shown.has(e)) {
          const full = lines[e].getTotalLength()
          lines[e].getAnimations().forEach((a) => a.cancel())
          lines[e].animate(
            [{ strokeDasharray: `${full} ${full}`, strokeDashoffset: full, stroke: BLUE }, { strokeDasharray: `${full} ${full}`, strokeDashoffset: 0, stroke: BLUE }],
            { duration: draw, delay, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'backwards' },
          )
          // Line and head grow in blue and stay blue (CSS .is-blue) for the step and after it.
          lines[e].parentNode.querySelectorAll(':scope > path:not(.edge__line)').forEach((head) => {
            const paint = head.getAttribute('fill') === 'none' ? 'stroke' : 'fill'
            const op = getComputedStyle(head).opacity
            head.animate(
              [{ opacity: 0, [paint]: BLUE }, { opacity: 0, [paint]: BLUE, offset: 0.85 }, { opacity: op, [paint]: BLUE }],
              { duration: draw, delay, fill: 'backwards' },
            )
          })
        }
        if (feel === FEELS.pulse) f.dots = [0, 1, 2].map(() => el('circle', { r: 4.5, class: 'pulse' }))
        if (feel === FEELS.ripple) {
          f.ring = el('circle', { class: 'ring', cx: f.end.x, cy: f.end.y, r: 4 })
          f.dot = el('circle', { r: 5, class: 'pulse' })
        }
        if (feel === FEELS.tide) f.tide = el('path', { class: 'tide', d })
        if (feel.braid) {
          // Sample the edge every 3 units with unit normals, so strands can be offset sideways.
          const pts = []
          for (let s = 0; s <= len; s += 3) {
            const p = trace.getPointAtLength(s), q = trace.getPointAtLength(Math.min(len, s + 1)), r = trace.getPointAtLength(Math.max(0, s - 1))
            const dx = q.x - r.x, dy = q.y - r.y, m = Math.hypot(dx, dy) || 1
            pts.push({ s, x: p.x, y: p.y, nx: -dy / m, ny: dx / m })
          }
          const g = el('g', { filter: 'url(#story-braid)' })
          f.pts = pts
          f.strands = BRAID_PAL.slice(0, feel.braid.strands).map((col) => {
            const p = document.createElementNS(SVGNS, 'path')
            p.setAttribute('class', 'braid-strand')
            p.setAttribute('fill', col)
            g.append(p)
            return p
          })
          f.g = g
        }
        return f
      })
      // Text: rows of each active label enter one after another in this step's reveal style.
      const reveal = REVEALS[settings.reveal[stepKey(step)]] ? settings.reveal[stepKey(step)] : 'rise'
      revealSelect.value = reveal
      waveToggle.checked = waveFor(step)
      waveToggle.disabled = settings.look.waves === false
      waveOn = waveToggle.checked && !waveToggle.disabled
      layer.style.display = waveOn ? '' : 'none'
      syncStepDur()
      renderArrowTimes()
      renderIconMotions()
      labels = s.edges.map((e, k) => {
        const delay = flows[k].delay
        const g = svg.querySelector(`.edge[data-edge="${e}"]`)
        const rows = [...g.querySelectorAll('.lbl-row')]
        const items = rows.filter((r) => r.classList.contains('lbl-item') && !r.classList.contains('is-gone'))
        const intro = !reduceMotion && !shown.has(e)
        const revealDur = REVEALS[reveal].duration ?? 520
        // One bullet at a time: its text and icon appear, its icon gets the blue spotlight,
        // and only after that spotlight does the next bullet appear.
        const sched = []
        let cursor = delay + timing.text
        rows.forEach((r) => {
          r.getAnimations().forEach((a) => a.cancel())
          r.classList.remove('is-spot')
          // Already on screen (no entrance): its icon has had its turn, so it is blue.
          if (!intro) return r.classList.add('is-lit')
          r.classList.remove('is-lit')
          r.animate(REVEALS[reveal].frames, { duration: revealDur, delay: cursor, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' })
          const glyph = r.querySelector('.lbl-glyph')
          if (glyph) playIcon(glyph, motionFor(r.dataset.item), cursor)
          if (items.includes(r)) {
            sched.push(cursor)
            cursor += timing.bullet
          } else cursor += timing.stagger
        })
        // The intro ends once the last bullet has lit, even if the next-bullet gap is shorter than a reveal.
        return { items, sched, cycleFrom: intro && sched.length ? Math.max(cursor, sched[sched.length - 1] + 1) : 0, last: -1 }
      })
      svg.querySelectorAll('.edge:not(.is-on) .lbl-row.is-spot').forEach((r) => r.classList.remove('is-spot'))
      // Earlier steps' bullets count as done, even if a step was skipped to get here.
      svg.querySelectorAll('.edge.is-past .lbl-item').forEach((r) => r.classList.add('is-lit'))
      started = performance.now()
    }

    function frame(now) {
      const t = now - started
      for (const f of flows) {
        // Each flow runs on its own clock, starting when its arrow starts drawing.
        const tf = t - f.delay
        const drawn = ease(tf / f.draw)
        const after = (tf - f.draw) * timing.speed
        const live = !reduceMotion && after > 0
        // Steps without a wave keep the plain ink line and ink head (at the arrow opacity).
        if (!waveOn) continue
        f.trace.style.strokeDashoffset = String(1 - drawn)
        if (feel === FEELS.breathe) {
          f.trace.style.opacity = live ? String(0.55 + 0.45 * Math.cos((after / 2600) * 2 * Math.PI)) : '1'
        } else if (feel === FEELS.pulse) {
          f.dots.forEach((dot, k) => {
            const phase = (after - k * 500) / 1500
            const on = live && phase >= 0
            dot.style.opacity = on ? String(Math.sin(Math.PI * (phase % 1))) : '0'
            if (on) { const p = f.trace.getPointAtLength((phase % 1) * f.len); dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y) }
          })
        } else if (feel === FEELS.ripple) {
          // 2.4s cycle: 1.6s glide (eased), then the ring spreads at the arrow.
          const c = live ? ((after - f.k * 300) / 2400) : -1
          const glide = c >= 0 ? (c % 1) / (1.6 / 2.4) : -1
          const on = glide >= 0 && glide <= 1
          f.dot.style.opacity = on ? String(Math.min(1, glide * 6, (1 - glide) * 6)) : '0'
          if (on) { const p = f.trace.getPointAtLength(ease(glide) * f.len); f.dot.setAttribute('cx', p.x); f.dot.setAttribute('cy', p.y) }
          const r = glide > 1 ? (glide - 1) / 0.5 : 0
          f.ring.setAttribute('r', String(4 + 22 * ease(r)))
          f.ring.style.opacity = r > 0 ? String(0.6 * (1 - r)) : '0'
        } else if (feel === FEELS.tide) {
          f.trace.style.opacity = live ? '0.25' : '1'
          f.tide.style.opacity = live ? String(Math.min(1, after / 600)) : '0'
          f.tide.style.strokeDashoffset = String(-after * 0.014)
        } else if (feel.braid) {
          drawBraid(f, feel.braid, after, live)
          // No blue before the braid: the ink line holds until the strands arrive. Ribbon and wake
          // become the line themselves, so the ink fades under them.
          const own = feel.braid.mode !== 'comet'
          f.trace.style.opacity = '0'
          f.base.style.opacity = live && own ? 'calc(var(--arrow-op, 1) * 0.12)' : ''
        }
        // Arrowheads turn blue only once the flow reaches them.
        f.base.parentNode.classList.toggle('is-live', feel.braid ? !!f.arrived : live)
      }
      // Each bullet's icon turns blue the moment the bullet starts to appear (its motion is scheduled
      // with the reveal), and stays blue. Every due bullet is lit, so none is skipped if two start together.
      for (const l of labels) {
        if (t >= l.cycleFrom) continue
        l.items.forEach((r, i) => { if (t >= l.sched[i]) r.classList.add('is-lit') })
      }
      // A step never ends mid-spotlight: the intro round, or one full round for labels already shown.
      const spotEnd = Math.max(0, ...labels.map((l) => l.cycleFrom))
      const dur = Math.max(stepDuration(), spotEnd)
      section.style.setProperty('--progress', String(Math.min(1, t / dur)))
      if (playing && t > dur) show(step + 1)
      if (!destroyed) requestAnimationFrame(frame)
    }

    const timingInputs = [...section.querySelectorAll('[data-t]')]
    const syncTiming = () => timingInputs.forEach((inp) => {
      const k = inp.dataset.t
      inp.value = k === 'speed' ? timing[k] : timing[k] / 1000
      inp.nextElementSibling.textContent = k === 'speed' ? `${(+timing[k]).toFixed(2)}×` : `${(timing[k] / 1000).toFixed(2)}s`
    })
    const defaults = () => ({ step: feel.step, draw: feel.draw, text: Math.round(feel.draw * 0.5), stagger: 180, spot: 900, gap: 700, bullet: 1420, speed: 1 })
    // Saved values are clamped to the slider ranges, so stale or edited storage can't break playback.
    const clampTiming = (saved = {}) => Object.fromEntries(TIMING_FIELDS.map(([k, , min, max]) => {
      const scale = k === 'speed' ? 1 : 1000
      const v = Number(saved[k])
      return [k, Number.isFinite(v) ? Math.min(max * scale, Math.max(min * scale, v)) : defaults()[k]]
    }))
    const loadTiming = () => {
      Object.assign(timing, clampTiming(settings.timings[feelKey] ?? defaults()))
      syncTiming()
    }
    const resetTiming = () => {
      delete settings.timings[feelKey]
      saveSettings()
      loadTiming()
    }
    timingInputs.forEach((inp) => inp.addEventListener('input', () => {
      timing[inp.dataset.t] = inp.dataset.t === 'speed' ? +inp.value : +inp.value * 1000
      settings.timings[feelKey] = { ...timing }
      saveSettings()
      syncTiming()
    }))
    // Re-run the step so new text/draw timings are visible right away.
    timingInputs.forEach((inp) => inp.addEventListener('change', () => show(step)))
    section.querySelector('[data-act="reset"]').addEventListener('click', () => { resetTiming(); show(step) })

    const feelSelect = section.querySelector('[data-act="feel"]')
    let feelKey = 'breathe'
    const setFeel = (key) => {
      feelKey = FEELS[key] ? key : 'breathe'
      feel = FEELS[feelKey]
      feelSelect.value = feelKey
      settings.feel = feelKey
      saveSettings()
      section.dataset.feel = feelKey
      if (feel.braid) svg.querySelector('#story-braid feGaussianBlur').setAttribute('stdDeviation', String(feel.braid.blur))
      section.querySelector('.story__feelnote').textContent = feel.note
      loadTiming()
      show(step)
    }
    feelSelect.addEventListener('change', () => setFeel(feelSelect.value))

    const arrowOp = section.querySelector('[data-act="arrow-op"]')
    const setArrowOp = (v) => {
      const n = Number(v)
      const op = Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 1
      arrowOp.value = op
      arrowOp.nextElementSibling.textContent = `${Math.round(op * 100)}%`
      section.style.setProperty('--arrow-op', String(op))
      return op
    }
    arrowOp.addEventListener('input', () => {
      settings.arrowOpacity = setArrowOp(arrowOp.value)
      saveSettings()
    })
    setArrowOp(settings.arrowOpacity ?? 1)

    // Look: opacity of earlier steps, idle icons, wave and halo, halo size, and label line spacing.
    const BASE_LH = 1.3
    // Rows sit at their rendered y (base 1.3 line height); shift each to its place at the chosen
    // spacing, skipping removed rows unless edit mode shows them.
    const applyLineSpacing = (v) => svg.querySelectorAll('.edge__label').forEach((lbl) => {
      let slot = 0
      lbl.querySelectorAll('.lbl-row').forEach((row, i) => {
        const dy = (slot * v - i * BASE_LH) * o.labelSize
        row.querySelector('.lbl-shift').setAttribute('transform', `translate(0 ${dy.toFixed(2)})`)
        if (!row.classList.contains('is-gone') || section.dataset.edit === 'on') slot++
      })
    })
    const lookInputs = [...section.querySelectorAll('[data-look]')]
    const setLook = (k, raw) => {
      const [, , min, max, , def, cssVar] = LOOK_FIELDS.find((f) => f[0] === k)
      const n = Number(raw)
      const v = Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def
      const inp = lookInputs.find((x) => x.dataset.look === k)
      inp.value = v
      inp.nextElementSibling.textContent = ['arrowGap', 'titleGap', 'momoX', 'momoY', 'labelGap'].includes(k) ? `${v}px` : ['lineSp', 'haloScale', 'iconScale', 'momoScale', 'tipScale'].includes(k) ? `${v.toFixed(2)}×` : `${Math.round(v * 100)}%`
      if (cssVar) section.style.setProperty(cssVar, String(v))
      else if (k === 'lineSp') { applyLineSpacing(v); centerLabels() }
      return v
    }
    // Arrow tips keep the same gap to every halo edge; they follow Halo size and Arrow gap live.
    const look = {}
    const retarget = () => {
      const R = 78 * look.haloScale
      svg.querySelectorAll('.edge').forEach((g) => {
        const pts = fitEdge(EDGES[+g.dataset.edge], o, R, look.arrowGap, look.titleGap)
        edgePts.set(g, pts)
        // A filled tip sits on the line's end, not over it: the line stops at the tip's base,
        // so translucent arrows show no darker overlap.
        const line = pts.map((p) => [...p])
        if (o.arrow === 'triangle') {
          const [x, y] = line[line.length - 1], [px, py] = line[line.length - 2]
          const m = Math.hypot(x - px, y - py) || 1
          const cut = Math.min(m - 1, headSize(o, o.stroke, look.tipScale) * Math.cos(0.6) + o.stroke / 2 - 0.5)
          line[line.length - 1] = [x - ((x - px) / m) * cut, y - ((y - py) / m) * cut]
        }
        g.querySelector('.edge__line').setAttribute('d', path(line, o.radius))
        const head = g.querySelector(':scope > path:not(.edge__line)')
        head.outerHTML = arrowHead(pts, o, head.getAttribute(o.arrow === 'triangle' ? 'fill' : 'stroke'), o.stroke, look.tipScale)
      })
      // Titles hang a fixed gap below the halo, whatever its size.
      svg.querySelectorAll('.node').forEach((g) => {
        const node = NODES[g.dataset.node]
        // Removed lines leave no gap (edit mode keeps their slot so they can be clicked back).
        let slot = 0
        g.querySelectorAll('text').forEach((t) => {
          t.setAttribute('y', titleBaseline(node, o, R, look.titleGap, slot).toFixed(2))
          if (!t.classList.contains('is-gone') || section.dataset.edit === 'on') slot++
        })
      })
      centerLabels()
    }
    // Each label block (icons + text) is centred on the run of its arrow it sits beside:
    // horizontally on a horizontal run, vertically on a vertical one. Runs span start to tip.
    const edgePts = new Map()
    function centerLabels() {
      svg.querySelectorAll('.edge').forEach((g) => {
        const pts = edgePts.get(g)
        const lbl = g.querySelector('.edge__label')
        if (!pts || !lbl.childElementCount) return
        lbl.removeAttribute('transform')
        const b = lbl.getBBox()
        if (!b.width) return
        // Vertical centre is optical: from the first line's cap height to the last line's baseline,
        // not the font's ascender/descender box (which sits the text visibly high).
        const rows = [...lbl.querySelectorAll('.lbl-row')].filter((r) => getComputedStyle(r).display !== 'none')
        const baselines = rows.map((r) => {
          const t = [...r.querySelectorAll('text')].pop()
          const dy = Number(/translate\(\s*[-\d.]+[ ,]+([-\d.]+)/.exec(r.querySelector('.lbl-shift')?.getAttribute('transform') ?? '')?.[1] ?? 0)
          return { base: +t.getAttribute('y') + dy, cap: CAP * +t.getAttribute('font-size') }
        })
        const cx = b.x + b.width / 2
        const cy = baselines.length ? (Math.min(...baselines.map((r) => r.base - r.cap)) + Math.max(...baselines.map((r) => r.base))) / 2 : b.y + b.height / 2
        let best = null
        for (let i = 1; i < pts.length; i++) {
          const [x1, y1] = pts[i - 1], [x2, y2] = pts[i]
          const horiz = Math.abs(y2 - y1) < Math.abs(x2 - x1)
          const along = horiz ? Math.min(Math.max(cx, Math.min(x1, x2)), Math.max(x1, x2)) : Math.min(Math.max(cy, Math.min(y1, y2)), Math.max(y1, y2))
          const d = horiz ? Math.hypot(cx - along, cy - y1) : Math.hypot(cx - x1, cy - along)
          if (!best || d < best.d) best = { d, horiz, mid: horiz ? (x1 + x2) / 2 : (y1 + y2) / 2, lineY: y1 }
        }
        if (!best.horiz) return lbl.setAttribute('transform', `translate(0 ${(best.mid - cy).toFixed(2)})`)
        // Beside a horizontal run, every block keeps the same gap to its line, whatever its line count:
        // above, the last baseline sits `labelGap` over the line; below, the first cap top sits `labelGap` under it.
        let dy = 0
        if (baselines.length) {
          const top = Math.min(...baselines.map((r) => r.base - r.cap)), bottom = Math.max(...baselines.map((r) => r.base))
          dy = cy < best.lineY ? best.lineY - look.labelGap - bottom : best.lineY + look.labelGap - top
        }
        lbl.setAttribute('transform', `translate(${(best.mid - cx).toFixed(2)} ${dy.toFixed(2)})`)
      })
    }
    document.fonts.ready.then(() => { alignEndLabels(svg); centerLabels() })
    const geometry = ['haloScale', 'arrowGap', 'titleGap', 'tipScale', 'labelGap']
    lookInputs.forEach((inp) => {
      const k = inp.dataset.look
      look[k] = setLook(k, settings.look[k])
      inp.addEventListener('input', () => {
        settings.look[k] = look[k] = setLook(k, inp.value)
        saveSettings()
        if (geometry.includes(k)) retarget()
      })
      // Flows sample the line path, so rebuild them once the slider settles.
      if (geometry.includes(k)) inp.addEventListener('change', () => show(step))
    })
    retarget()
    const haloToggle = section.querySelector('[data-act="halo"]')
    const setHalo = (on) => { haloToggle.checked = on; section.dataset.halo = on ? 'on' : 'off' }
    setHalo(settings.look.halo !== false)
    haloToggle.addEventListener('change', () => { settings.look.halo = haloToggle.checked; saveSettings(); setHalo(haloToggle.checked) })
    // Master switch for the braided flow; per-step "Wave this step" choices are kept and apply again when it is back on.
    const wavesAllToggle = section.querySelector('[data-act="waves-all"]')
    wavesAllToggle.checked = settings.look.waves !== false
    wavesAllToggle.addEventListener('change', () => { settings.look.waves = wavesAllToggle.checked; saveSettings(); show(step) })
    section.querySelector('[data-act="reset-look"]').addEventListener('click', () => {
      settings.look = {}
      saveSettings()
      lookInputs.forEach((inp) => { look[inp.dataset.look] = setLook(inp.dataset.look) })
      setHalo(true)
      wavesAllToggle.checked = true
      retarget()
      show(step)
    })

    // Label text: in edit mode, click a label line to rewrite it. Overrides key on edge + row index,
    // so bullet icons and their motions stay tied to the original item.
    const rowText = (r) => [...r.querySelectorAll('text')].pop()
    const labelRows = [...svg.querySelectorAll('.edge')].flatMap((g) =>
      [...g.querySelectorAll('.lbl-row')].map((r) => ({ key: `${g.dataset.edge}:${rowText(r).textContent}`, r, original: rowText(r).textContent })))
    // Node titles and subtitles (WATCH / Detect + nudge …) edit the same way, keyed node:<key>:<line>.
    const nodeLines = [...svg.querySelectorAll('.node')].flatMap((g) =>
      [...g.querySelectorAll('text')].map((t, i) => ({ key: `node:${g.dataset.node}:${i}`, t, original: t.textContent })))
    // An empty override removes the line; the rows below close the gap (edit mode shows it faded).
    const applyLabels = () => {
      labelRows.forEach(({ key, r, original }) => {
        const v = settings.labels[key]
        r.classList.toggle('is-gone', v === '')
        rowText(r).textContent = v ? v : original
      })
      nodeLines.forEach(({ key, t, original }) => {
        const v = settings.labels[key]
        t.classList.toggle('is-gone', v === '')
        t.textContent = v ? v : original
      })
      // Arrows leaving a node downward stop below its last remaining line.
      svg.querySelectorAll('.node').forEach((g) => {
        NODES[g.dataset.node].shown = section.dataset.edit === 'on' ? undefined : g.querySelectorAll('text:not(.is-gone)').length
      })
      retarget()
      applyLineSpacing(look.lineSp)
      alignEndLabels(svg)
      centerLabels()
    }
    applyLabels()
    const editBtn = section.querySelector('[data-act="edit"]')
    editBtn.addEventListener('click', () => {
      const on = section.dataset.edit !== 'on'
      section.dataset.edit = on ? 'on' : 'off'
      editBtn.textContent = on ? 'Done editing' : 'Edit text'
      if (on) setPlaying(false)
      applyLabels()
      show(step)
    })
    svg.addEventListener('click', (e) => {
      if (section.dataset.edit !== 'on') return
      const hit = labelRows.find(({ r }) => r.contains(e.target)) ?? nodeLines.find(({ t }) => t === e.target)
      if (!hit) return
      const el = hit.r ?? hit.t
      const current = hit.r ? rowText(hit.r).textContent : hit.t.textContent
      const next = window.prompt('Text (leave empty to remove this line)', el.classList.contains('is-gone') ? hit.original : current)
      if (next === null) return
      if (next === hit.original) delete settings.labels[hit.key]
      else settings.labels[hit.key] = next.trim() === '' ? '' : next
      saveSettings()
      applyLabels()
      show(step)
    })
    section.querySelector('[data-act="reset-text"]').addEventListener('click', () => { settings.labels = {}; saveSettings(); applyLabels(); show(step) })

    revealSelect.addEventListener('change', () => { settings.reveal[stepKey(step)] = revealSelect.value; saveSettings(); show(step) })
    waveToggle.addEventListener('change', () => { settings.waves[stepKey(step)] = waveToggle.checked; saveSettings(); show(step) })

    const playBtn = section.querySelector('[data-act="play"]')
    const setPlaying = (v) => { playing = v; playBtn.textContent = v ? 'Pause' : 'Play' }
    playBtn.addEventListener('click', () => { setPlaying(!playing); if (playing) started = performance.now() })
    // Transitions: step back/forward from the current state, or replay "previous → this step".
    let previewTimer
    const go = (i) => { clearTimeout(previewTimer); setPlaying(false); show(i) }
    section.querySelector('[data-act="prev"]').addEventListener('click', () => go(step - 1))
    section.querySelector('[data-act="next"]').addEventListener('click', () => go(step + 1))
    section.querySelector('[data-act="preview"]').addEventListener('click', () => {
      const target = step
      go(target - 1)
      // Hold the previous step until its lines are drawn, then advance so the change is visible.
      previewTimer = setTimeout(() => show(target), timing.draw + 700)
    })
    stepDurInput.addEventListener('input', () => {
      settings.stepDur[stepKey(step)] = +stepDurInput.value * 1000
      saveSettings()
      syncStepDur()
    })
    section.querySelector('[data-act="step-dur-reset"]').addEventListener('click', () => { delete settings.stepDur[stepKey(step)]; saveSettings(); syncStepDur() })
    section.querySelector('.story__steps').addEventListener('click', (e) => {
      const b = e.target.closest('[data-step]')
      if (b) go(+b.dataset.step)
    })
    setPlaying(playing)
    setFeel(settings.feel)
    // Layout swaps the node/edge geometry every option is built from, so it applies on reload.
    // Order changes the step list (buttons, per-step settings), so it also applies on reload.
    // Spacing sliders rebuild the geometry, so they apply on reload once the slider is released.
    section.querySelectorAll('[data-spacing]').forEach((inp) => {
      inp.addEventListener('input', () => { inp.nextElementSibling.textContent = `−${inp.value}px` })
      inp.addEventListener('change', () => {
        settings.spacing = { ...settings.spacing, [inp.dataset.spacing]: +inp.value }
        saveSettings()
        location.reload()
      })
    })
    section.querySelector('[data-act="order"]').addEventListener('change', (e) => {
      settings.order = e.target.value
      saveSettings()
      location.reload()
    })
    section.querySelector('[data-act="layout"]').addEventListener('change', (e) => {
      settings.layout = e.target.value
      saveSettings()
      location.reload()
    })
    requestAnimationFrame(frame)
    return {
      // Reduced motion: the full loop, still; the step pills still walk through it.
      start() {
        if (reduceMotion) { show(STORY.length - 1); return }
        setPlaying(true)
        show(0)
      },
    }
  }

  const story = mountStory()
  ready = true
  if (studio) OPTIONS.forEach((o, i) => {
    const section = document.createElement('section')
    section.className = 'option'
    section.id = o.id
    section.innerHTML = `
      <div class="option__head">
        <h2>${String(i + 1).padStart(2, '0')} — ${o.name}</h2>
        <p>${o.note}</p>
        <label>Arrows <select aria-label="Arrow style for ${o.name}">${Object.entries(ARROWS).map(([value, preset]) => `<option value="${value}">${preset.name}</option>`).join('')}</select></label>
        <button type="button">Download SVG</button>
      </div>
      ${render(o)}`
    const select = section.querySelector('select')
    const applyArrows = (value) => {
      const key = ARROWS[value] ? value : 'original'
      select.value = key
      const preset = ARROWS[key]
      section.querySelector('svg').outerHTML = render({ ...o, ...preset, name: o.name, presetDash: preset.dash })
      alignEndLabels(section)
    }
    select.addEventListener('change', () => {
      settings.arrows[o.id] = select.value
      saveSettings()
      applyArrows(select.value)
    })
    if (settings.arrows[o.id]) applyArrows(settings.arrows[o.id])
    section.querySelector('button').addEventListener('click', () => {
      const blob = new Blob([section.querySelector('svg').outerHTML], { type: 'image/svg+xml' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `unwind-system-design-${o.id}-${section.querySelector('select').value}.svg`
      a.click()
      URL.revokeObjectURL(a.href)
    })
    root.append(section)
  })
  // Right-aligned blocks are measured; measure again once Beatrice has loaded.
  alignEndLabels(root)
  document.fonts.ready.then(() => { if (!destroyed) alignEndLabels(root) })
  return {
    start: story.start,
    destroy() {
      destroyed = true
      clearTimeout(saveTimer)
      root.replaceChildren()
    },
  }
}
