/**
 * Loop motion for the Harvard & MIT thumbnail: the 15 pieces hold one mark, travel to the
 * other, hold, and travel back. Everything is a pure function of the loop phase (0..1), so
 * the loop is seamless and a recording can start on any frame.
 *
 * Loop: [hold first][first → second][hold second][second → first]
 */
import { harvardPieces, mitPieces, type Rect } from './logos'

export const PRESETS = [
  'morph',
  'scatter',
  'pop',
  'rise',
  'grow',
  'flip',
  'drop',
  // Construction: blocks built and stacked.
  'stack',
  'crane',
  'bricklay',
  'floors',
  'blueprint',
  'topple',
] as const
/** `auto` lets each preset pick: construction presets build from the ground up, the rest sweep left to right. */
export const ORDERS = ['auto', 'build', 'bottom → top', 'left → right', 'right → left', 'centre out', 'top → bottom', 'random'] as const
const BUILDS = new Set(['stack', 'crane', 'bricklay', 'floors', 'blueprint', 'topple'])
export const EASES = ['smooth', 'expo', 'back', 'spring', 'linear'] as const
export const IDLES = ['still', 'breathe', 'wave'] as const

export type MotionValues = {
  preset: string
  loopSec: number
  hold: number
  stagger: number
  order: string
  ease: string
  distance: number
  rotation: number
  overshoot: number
  seed: number
  idle: string
  idleAmount: number
  idleCycles: number
  /** Floors: how many levels each piece rises in. */
  floors: number
  lead: string
}

export type ShapeValues = {
  color: string
  background: string
  harvardScale: number
  mitScale: number
  harvardGap: number
  mitGap: number
  harvardRadius: number
  mitRadius: number
  /** Blueprint outline width, as a share of the logo height. */
  line: number
}

export type FrameValues = { size: number; x: number; y: number }

/** `fill` (0..1) fills the box from the bottom; `outline` (0..1) strokes it (blueprint). */
type Piece = { x: number; y: number; w: number; h: number; rot: number; alpha: number; fill?: number; outline?: number }

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function easeFn(name: string, overshoot: number): (t: number) => number {
  switch (name) {
    case 'linear':
      return (t) => t
    case 'expo':
      return (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2)
    case 'back': {
      const c = 1.2 + overshoot * 2.4
      const c2 = c * 1.525
      return (t) => (t < 0.5 ? ((2 * t) ** 2 * ((c2 + 1) * 2 * t - c2)) / 2 : ((2 * t - 2) ** 2 * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2)
    }
    case 'spring': {
      // Damped spring settling exactly at 1 by t = 1; overshoot sets the bounce.
      const zeta = 0.85 - overshoot * 0.6
      const w = 11
      return (t) => {
        if (t >= 1) return 1
        const wd = w * Math.sqrt(1 - zeta * zeta)
        const v = 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t))
        return lerp(v, 1, t ** 8)
      }
    }
    default:
      return (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
  }
}

/** Seeded 0..1 noise per piece (stable across frames). */
function rand(seed: number, i: number, salt: number) {
  const s = Math.sin(seed * 127.1 + i * 311.7 + salt * 74.7) * 43758.5453
  return s - Math.floor(s)
}

/** Stagger rank 0..1 per piece, from where the pieces start. */
function ranks(from: Rect[], order: string, seed: number): number[] {
  const cx = from.map((r) => r.x + r.w / 2)
  const cy = from.map((r) => r.y + r.h / 2)
  let key: number[]
  switch (order) {
    case 'right → left':
      key = cx.map((x) => -x)
      break
    case 'centre out':
      key = cx.map((x, i) => Math.hypot(x, cy[i]))
      break
    case 'top → bottom':
      key = cy.map((y, i) => y + cx[i] * 0.05)
      break
    case 'bottom → top':
      key = cy.map((y, i) => -y + cx[i] * 0.05)
      break
    case 'build': {
      // Course by course from the ground: lowest bottoms first, left to right within a course.
      const bottom = from.map((r) => r.y + r.h)
      key = bottom.map((b, i) => -Math.round(b * 20) * 10 + cx[i])
      break
    }
    case 'random':
      key = from.map((_, i) => rand(seed, i, 9))
      break
    default:
      key = cx.map((x, i) => x + cy[i] * 0.05)
  }
  const min = Math.min(...key)
  const max = Math.max(...key)
  return key.map((k) => (max > min ? (k - min) / (max - min) : 0))
}

const still = (r: Rect): Piece => ({ ...r, rot: 0, alpha: 1 })

/** A rect scaled about an anchor (0..1 of its box). */
function scaled(r: Rect, sx: number, sy: number, ax = 0.5, ay = 0.5): Piece {
  const w = r.w * sx
  const h = r.h * sy
  return { x: r.x + (r.w - w) * ax, y: r.y + (r.h - h) * ay, w, h, rot: 0, alpha: 1 }
}

/** One piece between its two homes at raw progress p (0..1). */
function travel(a: Rect, b: Rect, p: number, i: number, m: MotionValues, ease: (t: number) => number): Piece {
  if (p <= 0) return still(a)
  if (p >= 1) return still(b)
  const out = (q: number) => ease(clamp01(q * 2)) // first half: leave a
  const inn = (q: number) => ease(clamp01(q * 2 - 1)) // second half: arrive at b
  const d = m.distance
  switch (m.preset) {
    case 'scatter': {
      const e = ease(p)
      const bump = Math.sin(Math.PI * p)
      const angle = rand(m.seed, i, 1) * Math.PI * 2
      const spin = (rand(m.seed, i, 2) * 2 - 1) * m.rotation
      const shrink = 1 - 0.35 * bump
      const w = lerp(a.w, b.w, e) * shrink
      const h = lerp(a.h, b.h, e) * shrink
      const cx = lerp(a.x + a.w / 2, b.x + b.w / 2, e) + Math.cos(angle) * d * bump
      const cy = lerp(a.y + a.h / 2, b.y + b.h / 2, e) + Math.sin(angle) * d * bump
      return { x: cx - w / 2, y: cy - h / 2, w, h, rot: spin * bump, alpha: 1 }
    }
    case 'pop':
      return p < 0.5 ? scaled(a, 1 - out(p), 1 - out(p)) : scaled(b, inn(p), inn(p))
    case 'rise': {
      if (p < 0.5) {
        const e = out(p)
        return { ...a, y: a.y - d * e, rot: 0, alpha: 1 - e }
      }
      const e = inn(p)
      return { ...b, y: b.y + d * (1 - e), rot: 0, alpha: e }
    }
    case 'grow':
      return p < 0.5 ? scaled(a, 1, 1 - out(p), 0.5, 0) : scaled(b, 1, inn(p), 0.5, 1)
    case 'flip': {
      if (p < 0.5) return scaled(a, Math.cos((out(p) * Math.PI) / 2), 1)
      return scaled(b, Math.sin((inn(p) * Math.PI) / 2), 1)
    }
    case 'drop': {
      if (p < 0.5) {
        const q = clamp01(p * 2)
        return { ...a, y: a.y + d * 1.6 * q * q, rot: (rand(m.seed, i, 3) * 2 - 1) * m.rotation * 0.25 * q, alpha: 1 - q ** 3 }
      }
      const e = inn(p)
      return { ...b, y: b.y - d * 1.6 * (1 - e), rot: 0, alpha: clamp01(e * 3) }
    }
    case 'stack': {
      // Old block is craned straight up and away; new block falls into place and settles with a small squash.
      if (p < 0.5) {
        const e = out(p)
        return { ...a, y: a.y - d * 1.5 * e, rot: 0, alpha: 1 - e * e }
      }
      const q = clamp01(p * 2 - 1)
      const fall = 0.72
      if (q < fall) {
        const k = q / fall
        return { ...b, y: b.y - d * 1.5 * (1 - k * k), rot: 0, alpha: clamp01(k * 5) }
      }
      const bump = Math.sin((Math.PI * (q - fall)) / (1 - fall)) * (0.35 + m.overshoot)
      return { ...scaled(b, 1 + 0.06 * bump, 1 - 0.1 * bump, 0.5, 1) }
    }
    case 'crane': {
      // Hook up, carry across at height with a little sway, lower into the new slot.
      const top = Math.min(a.y, b.y) - d
      const lift = clamp01(p / 0.3)
      const carry = clamp01((p - 0.3) / 0.4)
      const lower = clamp01((p - 0.7) / 0.3)
      const e = ease(carry)
      const w = lerp(a.w, b.w, e)
      const h = lerp(a.h, b.h, e)
      const x = lerp(a.x, b.x, e)
      let y: number
      if (p < 0.3) y = lerp(a.y, top, ease(lift))
      else if (p < 0.7) y = top
      else y = lerp(top, b.y, ease(lower))
      const sway = Math.sin(Math.PI * carry) * Math.sin(carry * Math.PI * 3) * m.rotation * 0.06
      return { x, y, w, h, rot: sway, alpha: 1 }
    }
    case 'bricklay': {
      // Slid along its course from the left and tapped home; the old one slides off to the right.
      if (p < 0.5) {
        const e = out(p)
        return { ...a, x: a.x + d * e, rot: 0, alpha: 1 - e }
      }
      const e = inn(p)
      const tap = Math.max(0, Math.sin(Math.PI * clamp01((p * 2 - 1 - 0.8) / 0.2))) * 0.12 * (0.3 + m.overshoot)
      return { ...scaled(b, 1 + tap * 0.4, 1 - tap, 0.5, 1), x: b.x - d * (1 - e) - (b.w * tap * 0.4) / 2, alpha: clamp01(e * 4) }
    }
    case 'floors': {
      // Rises level by level from its base; the old one is taken down level by level.
      const n = Math.max(2, Math.round(m.floors))
      if (p < 0.5) {
        const left = Math.ceil((1 - out(p)) * n) / n
        return scaled(a, 1, left, 0.5, 1)
      }
      const built = Math.floor(inn(p) * n + 1e-6) / n
      return scaled(b, 1, built, 0.5, 1)
    }
    case 'blueprint': {
      // Outline drawn first, then poured solid from the bottom; the old one drains and its outline fades.
      if (p < 0.5) {
        const q = clamp01(p * 2)
        return { ...a, rot: 0, alpha: 1, fill: 1 - ease(clamp01(q / 0.7)), outline: 1 - clamp01((q - 0.7) / 0.3) }
      }
      const q = clamp01(p * 2 - 1)
      return { ...b, rot: 0, alpha: 1, outline: clamp01(q / 0.3), fill: ease(clamp01((q - 0.25) / 0.75)) }
    }
    case 'topple': {
      // Old block tips over its bottom-right corner and falls; the new one drops in like `stack`.
      if (p < 0.5) {
        const q = clamp01(p * 2)
        const angle = (Math.PI / 2) * q * q
        const px = a.x + a.w
        const py = a.y + a.h
        const ox = -a.w / 2
        const oy = -a.h / 2
        const cx = px + ox * Math.cos(angle) - oy * Math.sin(angle)
        const cy = py + ox * Math.sin(angle) + oy * Math.cos(angle) + d * q ** 3
        return { x: cx - a.w / 2, y: cy - a.h / 2, w: a.w, h: a.h, rot: (angle * 180) / Math.PI, alpha: 1 - q ** 4 }
      }
      return travel(a, b, p, i, { ...m, preset: 'stack' }, ease)
    }
    default: {
      const e = ease(p)
      return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), w: lerp(a.w, b.w, e), h: lerp(a.h, b.h, e), rot: 0, alpha: 1 }
    }
  }
}

/** Every piece at loop phase t (0..1), in logo units (1 = logo height), centred on 0,0. */
export function piecesAt(t: number, m: MotionValues, s: ShapeValues): { pieces: Piece[]; radii: number[] } {
  const scale = (rs: Rect[], k: number) => rs.map((r) => ({ x: r.x * k, y: r.y * k, w: r.w * k, h: r.h * k }))
  const H = scale(harvardPieces(s.harvardGap), s.harvardScale)
  const M = scale(mitPieces(s.mitGap), s.mitScale)
  const [first, second] = m.lead === 'mit' ? [M, H] : [H, M]
  const radiusOf = (rs: Rect[], k: number) => rs.map((r) => Math.min(r.w, r.h) * k)
  const [rFirst, rSecond] = m.lead === 'mit'
    ? [radiusOf(M, s.mitRadius), radiusOf(H, s.harvardRadius)]
    : [radiusOf(H, s.harvardRadius), radiusOf(M, s.mitRadius)]

  const hold = Math.min(m.hold, 0.49)
  const span = 0.5 - hold
  const ease = easeFn(m.ease, m.overshoot)
  const stagger = Math.min(m.stagger, 0.95)

  let from = first
  let to = second
  let rFrom = rFirst
  let rTo = rSecond
  let T = 0
  if (t < hold) T = 0
  else if (t < 0.5) T = (t - hold) / span
  else if (t < 0.5 + hold) T = 1
  else {
    from = second
    to = first
    rFrom = rSecond
    rTo = rFirst
    T = (t - 0.5 - hold) / span
  }
  const order = m.order === 'auto' ? (BUILDS.has(m.preset) ? 'build' : 'left → right') : m.order
  // Build orders follow where blocks land, the rest follow where they start.
  const rank = ranks(order === 'build' || order === 'bottom → top' ? to : from, order, m.seed)
  const radii: number[] = []
  const pieces = from.map((a, i) => {
    const p = clamp01((T - rank[i] * stagger) / (1 - stagger))
    radii.push(lerp(rFrom[i], rTo[i], clamp01(p)))
    const piece = travel(a, to[i], p, i, m, ease)
    return idle(piece, t, m)
  })
  return { pieces, radii }
}

/** Idle motion runs all loop long with a whole number of cycles, so it never breaks the loop. */
function idle(p: Piece, t: number, m: MotionValues): Piece {
  if (m.idle === 'still' || m.idleAmount === 0) return p
  const k = Math.max(1, Math.round(m.idleCycles))
  if (m.idle === 'breathe') {
    // Scales the whole mark about its centre, so split bars stay joined.
    const s = 1 + m.idleAmount * Math.sin(2 * Math.PI * k * t)
    return { ...p, x: p.x * s, y: p.y * s, w: p.w * s, h: p.h * s }
  }
  // Wave travels left to right; pieces of one bar share an x, so bars stay joined.
  const cx = p.x + p.w / 2
  return { ...p, y: p.y + m.idleAmount * 0.25 * Math.sin(2 * Math.PI * (k * t - cx * 0.6)) }
}

/** Draws one frame into a canvas of any size. */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
  m: MotionValues,
  s: ShapeValues,
  f: FrameValues,
) {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = s.background
  ctx.fillRect(0, 0, width, height)
  const unit = f.size * height
  const cx = width / 2 + f.x * width
  const cy = height / 2 + f.y * height
  const { pieces, radii } = piecesAt(t, m, s)
  ctx.fillStyle = s.color
  pieces.forEach((p, i) => {
    if (p.alpha <= 0 || p.w <= 0 || p.h <= 0) return
    // +0.75px hides anti-alias seams where pieces of one bar meet, at any export size.
    const w = p.w * unit + 0.75
    const h = p.h * unit + 0.75
    ctx.globalAlpha = clamp01(p.alpha)
    ctx.setTransform(1, 0, 0, 1, cx + (p.x + p.w / 2) * unit, cy + (p.y + p.h / 2) * unit)
    if (p.rot) ctx.rotate((p.rot * Math.PI) / 180)
    const r = Math.min(radii[i] * unit, w / 2, h / 2)
    const box = (y: number, bh: number) => {
      ctx.beginPath()
      if (r > 0.01) ctx.roundRect(-w / 2, y, w, bh, Math.min(r, bh / 2))
      else ctx.rect(-w / 2, y, w, bh)
    }
    const fill = p.fill ?? 1
    if (fill > 0) {
      box(h / 2 - h * fill, h * fill)
      ctx.fill()
    }
    if (p.outline) {
      const line = Math.max(1, s.line * unit)
      ctx.globalAlpha = clamp01(p.alpha) * p.outline
      ctx.strokeStyle = s.color
      ctx.lineWidth = line
      ctx.beginPath()
      if (r > 0.01) ctx.roundRect(-w / 2 + line / 2, -h / 2 + line / 2, w - line, h - line, r)
      else ctx.rect(-w / 2 + line / 2, -h / 2 + line / 2, w - line, h - line)
      ctx.stroke()
    }
  })
  ctx.globalAlpha = 1
  ctx.setTransform(1, 0, 0, 1, 0, 0)
}
