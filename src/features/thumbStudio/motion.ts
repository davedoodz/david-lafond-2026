/**
 * Crane loop for the Harvard & MIT thumbnail: the 15 blocks hold one mark, travel to the
 * other, hold, and travel back. Everything is a pure function of the loop phase (0..1), so
 * the loop is seamless and a recording can start on any frame.
 *
 * Loop: [hold first][first → second][hold second][second → first]
 */
import { harvardPieces, mitPieces, type Rect } from './logos'

/**
 * Crane variants: every block is hooked, lifted, carried across and set down in its new slot.
 * straight = up, across, down.
 */
export const PRESETS = ['straight', 'high', 'low', 'arc', 'rounded', 'lanes', 'settle', 'release'] as const
export const ORDERS = ['course by course', 'bottom → top', 'left → right', 'right → left', 'centre out'] as const
export const EASES = ['smooth', 'expo', 'back', 'spring', 'linear'] as const

export type MotionValues = {
  preset: string
  loopSec: number
  hold: number
  stagger: number
  order: string
  ease: string
  /** Carry height above the higher of the two slots, in logo heights. */
  distance: number
  /** Landing squash (settle / release) and back / spring ease bounce. */
  overshoot: number
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
}

export type FrameValues = { size: number; x: number; y: number }

type Piece = { x: number; y: number; w: number; h: number; rot: number; alpha: number }

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

/** Stagger rank 0..1 per piece, from where the pieces start. */
function ranks(from: Rect[], order: string): number[] {
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
    case 'bottom → top':
      key = cy.map((y, i) => -y + cx[i] * 0.05)
      break
    case 'course by course': {
      // Course by course from the ground: lowest bottoms first, left to right within a course.
      const bottom = from.map((r) => r.y + r.h)
      key = bottom.map((b, i) => -Math.round(b * 20) * 10 + cx[i])
      break
    }
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

/** Squash on touchdown: q 0..1 over the landing moment. */
function touchdown(b: Rect, q: number, impact: number): Piece {
  const bump = Math.sin(Math.PI * clamp01(q)) * impact
  return scaled(b, 1 + 0.06 * bump, 1 - 0.1 * bump, 0.5, 1)
}

/** One block carried from slot a to slot b at progress p (0..1). `rank` 0..1 = its place in the build order. */
function travel(a: Rect, b: Rect, p: number, rank: number, m: MotionValues, ease: (t: number) => number): Piece {
  if (p <= 0) return still(a)
  if (p >= 1) return still(b)
  const v = m.preset
  const scale = v === 'high' ? 2 : v === 'low' ? 0.35 : 1
  // Lanes: later blocks travel on higher lanes, so loads never cross paths.
  const lane = v === 'lanes' ? rank * m.distance * 0.9 : 0
  const top = Math.min(a.y, b.y) - m.distance * scale - lane
  const impact = 0.35 + m.overshoot

  if (v === 'arc') {
    // One continuous swing from slot to slot.
    const e = ease(p)
    const rise = top - Math.min(a.y, b.y)
    return {
      x: lerp(a.x, b.x, e),
      y: lerp(a.y, b.y, e) + 4 * e * (1 - e) * rise,
      w: lerp(a.w, b.w, e),
      h: lerp(a.h, b.h, e),
      rot: 0,
      alpha: 1,
    }
  }

  // Phases: lift [0, liftEnd], carry [carryStart, carryEnd], lower [lowerStart, 1].
  const rounded = v === 'rounded'
  const liftEnd = rounded ? 0.4 : 0.3
  const carryStart = rounded ? 0.15 : 0.3
  const carryEnd = rounded ? 0.85 : 0.7
  const lowerStart = rounded ? 0.6 : 0.7
  const landing = v === 'settle' || v === 'release' ? 0.12 : 0
  const lowerEnd = 1 - landing

  const carry = ease(clamp01((p - carryStart) / (carryEnd - carryStart)))
  const up = ease(clamp01(p / liftEnd))
  const k = clamp01((p - lowerStart) / (lowerEnd - lowerStart))
  // Release: let go at the top and it free-falls instead of being lowered.
  const down = v === 'release' ? k * k : ease(k)
  const y = a.y + (top - a.y) * up + (b.y - top) * down
  if (landing && p > lowerEnd) return touchdown(b, (p - lowerEnd) / landing, v === 'release' ? impact * 1.6 : impact)
  return { x: lerp(a.x, b.x, carry), y, w: lerp(a.w, b.w, carry), h: lerp(a.h, b.h, carry), rot: 0, alpha: 1 }
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
  const order = m.order
  // Build orders follow where blocks land, the rest follow where they start.
  const rank = ranks(order === 'course by course' || order === 'bottom → top' ? to : from, order)
  const radii: number[] = []
  const pieces = from.map((a, i) => {
    const p = clamp01((T - rank[i] * stagger) / (1 - stagger))
    radii.push(lerp(rFrom[i], rTo[i], clamp01(p)))
    return travel(a, to[i], p, rank[i], m, ease)
  })
  return { pieces, radii }
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
    ctx.beginPath()
    if (r > 0.01) ctx.roundRect(-w / 2, -h / 2, w, h, r)
    else ctx.rect(-w / 2, -h / 2, w, h)
    ctx.fill()
  })
  ctx.globalAlpha = 1
  ctx.setTransform(1, 0, 0, 1, 0, 0)
}
