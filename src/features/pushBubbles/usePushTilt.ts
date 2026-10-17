/**
 * Press tilt for one large card: the point under the cursor sinks away (the card tilts about its centre
 * toward the cursor) and the card shrinks a touch, as if pressed. A damped spring follows the cursor
 * and eases back to flat when it leaves. Only reacts inside `bounds()` (the visible card, which may be
 * inset inside the element). Writes `transform` on the element; rAF runs only while moving.
 * Respects `prefers-reduced-motion`; passive listeners, so scrolling is never blocked.
 */
import { useEffect, type RefObject } from 'react'

export type PushTiltConfig = {
  enabled: boolean
  /** Max degrees of tilt at the card's edge. */
  tilt: number
  /** Scale while pressed (1 = none). */
  press: number
  /** Spring stiffness toward the target. */
  stiffness: number
  /** Spring damping (higher = less bounce). */
  damping: number
  /** CSS perspective in px; smaller = stronger depth. */
  perspective: number
}

const REST_EPS = 0.002
const DT_MAX = 0.05

export function usePushTilt(ref: RefObject<HTMLElement | null>, bounds: (el: HTMLElement) => DOMRect, config: PushTiltConfig) {
  const { enabled, tilt, press, stiffness, damping, perspective } = config

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!enabled || reduce) {
      el.style.transform = ''
      el.style.willChange = ''
      return
    }
    // Its own compositor layer: the card is painted once and the GPU tilts the finished bitmap. Without
    // it, every frame re-paints the tilted card and text glyphs snap to new pixel positions (jitter).
    el.style.willChange = 'transform'
    // x/y: tilt in degrees around the X and Y axes; s: press amount 0..1.
    const pos = { x: 0, y: 0, s: 0 }
    const vel = { x: 0, y: 0, s: 0 }
    const target = { x: 0, y: 0, s: 0 }
    let frame = 0
    let last = 0

    // Never exactly flat: at an identity 3D transform Chrome draws the layer pixel-snapped, and the moment
    // it tilts it switches to unsnapped sampling, so every hover start/stop nudged the text by a fraction
    // of a pixel (the "jitter"). A 0.001° floor keeps the card in the tilted path at rest; invisible.
    const deg = (v: number) => (Math.abs(v) < 0.001 ? 0.001 : v).toFixed(3)
    const write = () => {
      const scale = 1 - (1 - press) * pos.s
      el.style.transform = `perspective(${perspective}px) rotateX(${deg(pos.x)}deg) rotateY(${deg(pos.y)}deg) scale(${scale.toFixed(4)})`
    }
    write()
    const step = (now: number) => {
      const dt = Math.min(DT_MAX, (now - last) / 1000 || 1 / 60)
      last = now
      let moving = false
      for (const k of ['x', 'y', 's'] as const) {
        const a = stiffness * (target[k] - pos[k]) - damping * vel[k]
        vel[k] += a * dt
        pos[k] += vel[k] * dt
        if (Math.abs(target[k] - pos[k]) > REST_EPS || Math.abs(vel[k]) > REST_EPS) moving = true
      }
      if (!moving) Object.assign(pos, target), (vel.x = vel.y = vel.s = 0)
      write()
      frame = moving ? requestAnimationFrame(step) : 0
    }
    const kick = () => {
      if (frame) return
      last = performance.now()
      frame = requestAnimationFrame(step)
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const r = bounds(el)
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1
      const inside = Math.abs(nx) <= 1 && Math.abs(ny) <= 1
      // The pressed point sinks: rotateY > 0 pushes the right side back, rotateX > 0 pushes the top back.
      target.x = inside ? -ny * tilt : 0
      target.y = inside ? nx * tilt : 0
      target.s = inside ? 1 : 0
      kick()
    }
    const onLeave = () => {
      target.x = target.y = target.s = 0
      kick()
    }

    el.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('pointerleave', onLeave, { passive: true })
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(frame)
      el.style.transform = ''
      el.style.willChange = ''
    }
  }, [ref, bounds, enabled, tilt, press, stiffness, damping, perspective])
}
