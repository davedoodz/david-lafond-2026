/**
 * Happy hover for the centred Davebot: pointer on the body → the eyes squint
 * shut, ^ ^ arcs draw out from their centres, and the cheeks blush a beat later.
 *
 * One critically damped value (`joy`, 0 → 1) drives the eyes and a lagged copy
 * drives the blush, so reversing mid-way never snaps or overshoots. The rAF
 * loop only runs while a value is still moving.
 *
 * The gaze tracker owns the pupils' SVG `transform` attribute and the blink owns
 * the eye group's CSS `transform`, so the squint uses the separate CSS `scale`
 * property on the eye group, and the new shapes live outside the clipped group
 * the tracker queries.
 */

export type HappyLook = {
  inTime: number
  outTime: number
  arcCurve: number
  arcWidth: number
  arcStroke: number
  arcRaise: number
  squint: number
  blushAmount: number
  blushWidth: number
  blushHeight: number
  blushSoftness: number
  blushSpread: number
  blushY: number
  blushLag: number
}

export type HappyParts = {
  shell: SVGPathElement
  eyes: SVGGElement
  arcs: [SVGPathElement, SVGPathElement]
  blush: [SVGEllipseElement, SVGEllipseElement]
  blushCore: SVGStopElement
}

/** Eye centres on the 32 grid, matching the pupil paths in GhostMark. */
const EYE_X = [12.1, 20.3] as const
const TOUCH_HOLD_MS = 2200

type Damped = { x: number; v: number }

/** Critically damped smoothing toward `target` with time constant `time` (s). */
function smoothDamp(s: Damped, target: number, time: number, dt: number) {
  const omega = 2 / Math.max(0.0001, time)
  const x = omega * dt
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)
  const change = s.x - target
  const temp = (s.v + omega * change) * dt
  s.v = (s.v - omega * temp) * exp
  s.x = target + (change + temp) * exp
}

const smoothstep = (t: number) => t * t * (3 - 2 * t)
const band = (x: number, a: number, b: number) => smoothstep(Math.min(1, Math.max(0, (x - a) / (b - a))))

/** Static geometry from the dials: arc shapes, blush size and placement. */
export function shapeHappy(parts: HappyParts, look: HappyLook) {
  parts.arcs.forEach((arc, i) => {
    const cx = EYE_X[i]
    const y = 13.9 - look.arcRaise
    const half = look.arcWidth / 2
    arc.setAttribute(
      'd',
      `M${cx - half} ${y + look.arcCurve * 0.45} Q${cx} ${y - look.arcCurve * 1.1} ${cx + half} ${y + look.arcCurve * 0.45}`,
    )
    arc.setAttribute('stroke-width', String(look.arcStroke))
  })
  parts.blush.forEach((cheek, i) => {
    cheek.setAttribute('cx', String(16 + (i === 0 ? -1 : 1) * look.blushSpread))
    cheek.setAttribute('cy', String(look.blushY))
    cheek.setAttribute('rx', String(look.blushWidth))
    cheek.setAttribute('ry', String(look.blushHeight))
  })
  // Softness pulls the solid core inward so the edge fades over a wider band.
  parts.blushCore.setAttribute('offset', String(1 - look.blushSoftness))
}

export function attachHappy(parts: HappyParts, getLook: () => HappyLook): () => void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const joy: Damped = { x: 0, v: 0 }
  const blush: Damped = { x: 0, v: 0 }
  let happy = false
  let frame = 0
  let last = 0
  let touchTimer = 0

  const paint = () => {
    const look = getLook()
    const j = Math.min(1, Math.max(0, joy.x))
    // Ovals squint shut, then fade as the arcs take over; the two overlap by `squint`.
    const close = band(j, 0, 0.55 + look.squint * 0.4)
    parts.eyes.style.scale = `1 ${Math.max(0.04, 1 - close).toFixed(4)}`
    parts.eyes.style.opacity = (1 - band(j, 0.35 + look.squint * 0.3, 0.6 + look.squint * 0.4)).toFixed(3)
    const draw = band(j, 0.45 - look.squint * 0.4, 1)
    for (const arc of parts.arcs) {
      // Dash centred on the path, widening both ways.
      arc.style.strokeDasharray = `${draw.toFixed(4)} 1`
      arc.style.strokeDashoffset = (-(1 - draw) / 2).toFixed(4)
      // Round caps paint a dot even for a zero-length dash.
      arc.style.opacity = draw > 0.005 ? Math.min(1, draw * 3).toFixed(3) : '0'
      arc.style.translate = `0 ${((1 - draw) * 0.6).toFixed(3)}px`
    }
    const b = (smoothstep(Math.min(1, Math.max(0, blush.x))) * look.blushAmount).toFixed(3)
    for (const cheek of parts.blush) cheek.setAttribute('opacity', b)
  }

  const tick = (now: number) => {
    const look = getLook()
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const target = happy ? 1 : 0
    const time = happy ? look.inTime : look.outTime
    smoothDamp(joy, target, time, dt)
    smoothDamp(blush, target, time + look.blushLag, dt)
    const settled = (s: Damped) => Math.abs(s.x - target) < 0.001 && Math.abs(s.v) < 0.001
    if (settled(joy) && settled(blush)) {
      joy.x = blush.x = target
      joy.v = blush.v = 0
      frame = 0
    } else frame = requestAnimationFrame(tick)
    paint()
  }

  const set = (next: boolean) => {
    if (next === happy) return
    happy = next
    if (reduced) {
      joy.x = blush.x = next ? 1 : 0
      paint()
      return
    }
    if (!frame) {
      last = performance.now()
      frame = requestAnimationFrame(tick)
    }
  }

  const onEnter = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') set(true)
  }
  const onLeave = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') set(false)
  }
  // Touch has no hover: a tap on the body makes him happy for a moment.
  const onDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') return
    set(true)
    window.clearTimeout(touchTimer)
    touchTimer = window.setTimeout(() => set(false), TOUCH_HOLD_MS)
  }

  parts.shell.addEventListener('pointerenter', onEnter)
  parts.shell.addEventListener('pointerleave', onLeave)
  parts.shell.addEventListener('pointerdown', onDown)
  paint()

  return () => {
    cancelAnimationFrame(frame)
    window.clearTimeout(touchTimer)
    parts.shell.removeEventListener('pointerenter', onEnter)
    parts.shell.removeEventListener('pointerleave', onLeave)
    parts.shell.removeEventListener('pointerdown', onDown)
    parts.eyes.style.scale = ''
    parts.eyes.style.opacity = ''
  }
}
