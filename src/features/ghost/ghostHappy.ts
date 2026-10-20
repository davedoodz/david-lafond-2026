/**
 * Happy hover for the centred Davebot: pointer on the body → the cheeks blush.
 * The eyes are holes and never change.
 *
 * One critically damped value drives the blush, so reversing mid-way never
 * snaps or overshoots. The rAF loop only runs while it is still moving.
 */

export type HappyLook = {
  inTime: number
  outTime: number
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
  blush: [SVGEllipseElement, SVGEllipseElement]
  blushCore: SVGStopElement
}

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

/** Static geometry from the dials: blush size and placement. */
export function shapeHappy(parts: HappyParts, look: HappyLook) {
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
  const blush: Damped = { x: 0, v: 0 }
  let happy = false
  let frame = 0
  let last = 0
  let touchTimer = 0

  const paint = () => {
    const b = (smoothstep(Math.min(1, Math.max(0, blush.x))) * getLook().blushAmount).toFixed(3)
    for (const cheek of parts.blush) cheek.setAttribute('opacity', b)
  }

  const tick = (now: number) => {
    const look = getLook()
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const target = happy ? 1 : 0
    smoothDamp(blush, target, (happy ? look.inTime : look.outTime) + look.blushLag, dt)
    if (Math.abs(blush.x - target) < 0.001 && Math.abs(blush.v) < 0.001) {
      blush.x = target
      blush.v = 0
      frame = 0
    } else frame = requestAnimationFrame(tick)
    paint()
  }

  const set = (next: boolean) => {
    if (next === happy) return
    happy = next
    if (reduced) {
      blush.x = next ? 1 : 0
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
  // Touch has no hover: a tap on the body makes him blush for a moment.
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
  }
}
