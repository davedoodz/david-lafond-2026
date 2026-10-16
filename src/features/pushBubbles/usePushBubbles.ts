/**
 * Makes a set of floating cards feel like bubbles the cursor can nudge. Contact is measured from the
 * card's edge, not its center, so a card reacts as soon as the cursor comes within `reach` of any side.
 * The push points away from the cursor (from the nearest edge point) and, while the cursor is moving
 * toward the card, bends toward the cursor's direction of travel (`carry`), so sliding past an edge
 * drags the card along with it. Offsets are clamped to `maxOffset`; a damped spring eases each card
 * to its target and back to rest. Applied as `transform` on a dedicated wrapper element per card
 * (see `setRef`), so it composes with any CSS animation already running on the card itself.
 *
 * rAF-driven; the loop only runs while something is moving and stops once every card is at rest.
 * Respects `prefers-reduced-motion`. Passive pointer listeners, so touch scrolling is never blocked.
 */
import { useEffect, useMemo, useRef } from 'react'

export type PushBubblesConfig = {
  enabled: boolean
  /** Px outside a card's edge where the cursor starts to touch it. */
  reach: number
  /** Multiplier on the push magnitude (final offset is still clamped to `maxOffset`). */
  strength: number
  /** 0–1: how much the cursor's direction of travel steers the push (0 = straight away from the cursor). */
  carry: number
  /** Max px a card can be pushed from its resting position. */
  maxOffset: number
  /** Spring stiffness: how hard the card pulls back toward rest. */
  stiffness: number
  /** Spring damping: how quickly the pull-back settles (higher = less bounce). */
  damping: number
  /** Max rotation (deg) applied while pushed, proportional to the horizontal offset. */
  tilt: number
}

const REST_EPS = 0.02
const DT_MAX = 0.05 // seconds; clamps huge gaps (tab switches, slow frames)
/** Cursor speed (px/s) at which its direction of travel fully counts. */
const FULL_SPEED = 700
/** How fast the remembered cursor velocity fades once the cursor stops (per second). */
const VELOCITY_DECAY = 10

export function usePushBubbles(count: number, config: PushBubblesConfig): Array<(el: HTMLElement | null) => void> {
  const cardsRef = useRef<(HTMLElement | null)[]>([])
  const { enabled, reach, strength, carry, maxOffset, stiffness, damping, tilt } = config

  const setRef = useMemo(
    () => Array.from({ length: count }, (_, i) => (el: HTMLElement | null) => { cardsRef.current[i] = el }),
    [count],
  )

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const cards = cardsRef.current
    const n = cards.length
    const x = new Float64Array(n)
    const y = new Float64Array(n)
    const vx = new Float64Array(n)
    const vy = new Float64Array(n)
    let pointerX = 0
    let pointerY = 0
    let pointerVX = 0
    let pointerVY = 0
    let lastMove = 0
    let hasPointer = false
    let frame = 0
    let last = 0
    const wake = () => {
      if (frame) return
      last = performance.now()
      frame = requestAnimationFrame(step)
    }

    const step = (now: number) => {
      const dt = Math.min(DT_MAX, Math.max(0, (now - last) / 1000))
      last = now
      const decay = Math.exp(-VELOCITY_DECAY * dt)
      pointerVX *= decay
      pointerVY *= decay
      const speed = Math.hypot(pointerVX, pointerVY)
      let active = speed > 1
      for (let i = 0; i < n; i++) {
        const el = cards[i]
        let tx = 0
        let ty = 0
        if (hasPointer && el) {
          // Measure the untransformed (layout + ancestor-animation) position: `getBoundingClientRect`
          // reflects this element's own transform too, and leaving it in would feed the previous
          // frame's push back into the next distance calc, making the card orbit instead of settle.
          const prev = el.style.transform
          if (prev) el.style.transform = ''
          const r = el.getBoundingClientRect()
          if (prev) el.style.transform = prev
          // Nearest point of the card to the cursor; (nx, ny) points from the cursor into the card.
          const qx = Math.min(r.right, Math.max(r.left, pointerX))
          const qy = Math.min(r.bottom, Math.max(r.top, pointerY))
          let nx = qx - pointerX
          let ny = qy - pointerY
          const dist = Math.hypot(nx, ny)
          if (dist < reach || dist === 0) {
            if (dist > 0.001) {
              nx /= dist
              ny /= dist
            } else {
              // Cursor is over the card: push away from the cursor, toward the card's center.
              nx = r.left + r.width / 2 - pointerX
              ny = r.top + r.height / 2 - pointerY
              const len = Math.hypot(nx, ny) || 1
              nx /= len
              ny /= len
            }
            const t = reach > 0 ? Math.max(0, 1 - dist / reach) : 1
            const contact = t * t * (3 - 2 * t) // smoothstep: soft at the edge of reach, full at the card
            // While the cursor moves toward or along the card, its direction of travel steers the push,
            // so sliding past an edge drags the card sideways. Moving away never pulls the card.
            let dirX = nx
            let dirY = ny
            if (speed > 1) {
              const mx = pointerVX / speed
              const my = pointerVY / speed
              const approach = mx * nx + my * ny
              if (approach > -0.3) {
                const w = carry * Math.min(1, speed / FULL_SPEED)
                dirX = nx + (mx - nx) * w
                dirY = ny + (my - ny) * w
                const len = Math.hypot(dirX, dirY) || 1
                dirX /= len
                dirY /= len
              }
            }
            const mag = Math.min(maxOffset, maxOffset * strength * contact)
            tx = dirX * mag
            ty = dirY * mag
          }
        }
        // Damped spring toward (tx, ty); semi-implicit Euler.
        const ax = stiffness * (tx - x[i]) - damping * vx[i]
        const ay = stiffness * (ty - y[i]) - damping * vy[i]
        vx[i] += ax * dt
        vy[i] += ay * dt
        x[i] += vx[i] * dt
        y[i] += vy[i] * dt
        const atRest = tx === 0 && ty === 0 && Math.abs(x[i]) < REST_EPS && Math.abs(y[i]) < REST_EPS && Math.abs(vx[i]) < REST_EPS && Math.abs(vy[i]) < REST_EPS
        if (atRest) {
          x[i] = 0
          y[i] = 0
          vx[i] = 0
          vy[i] = 0
        } else {
          active = true
        }
        if (el) {
          if (x[i] === 0 && y[i] === 0) {
            el.style.transform = ''
          } else {
            const rot = tilt ? Math.max(-tilt, Math.min(tilt, (x[i] / maxOffset) * tilt)) : 0
            el.style.transform = `translate3d(${x[i].toFixed(2)}px, ${y[i].toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg)`
          }
        }
      }
      frame = active ? requestAnimationFrame(step) : 0
    }

    const onPointerMove = (e: PointerEvent) => {
      const t = e.timeStamp
      const dt = (t - lastMove) / 1000
      if (hasPointer && dt > 0 && dt < 0.1) {
        // Smoothed cursor velocity (px/s), so one jittery event can't flip the push direction.
        const k = Math.min(1, dt * 20)
        pointerVX += ((e.clientX - pointerX) / dt - pointerVX) * k
        pointerVY += ((e.clientY - pointerY) / dt - pointerVY) * k
      }
      lastMove = t
      pointerX = e.clientX
      pointerY = e.clientY
      hasPointer = true
      wake()
    }
    const onPointerLeave = () => {
      hasPointer = false
      wake()
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerleave', onPointerLeave, { passive: true })
    window.addEventListener('blur', onPointerLeave)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
      window.removeEventListener('blur', onPointerLeave)
      if (frame) cancelAnimationFrame(frame)
      for (const el of cards) {
        if (el) el.style.transform = ''
      }
    }
  }, [enabled, reach, strength, carry, maxOffset, stiffness, damping, tilt])

  return setRef
}
