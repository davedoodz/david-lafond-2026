/**
 * Live crane loop (MIT ↔ Harvard GSD blocks) filling the Harvard & MIT card.
 *
 * Same renderer and dials as the studio page (studio/harvard-mit-thumbnail.html), so what
 * was tuned there is what plays here: desktop framing above 640px, mobile framing below.
 * Draws only while the card is on screen; reduced motion shows the first mark, still.
 */
import { useEffect, useRef } from 'react'
import { THUMB_CONFIG } from '../features/thumbStudio/config'
import { drawFrame, type FrameValues, type MotionValues, type ShapeValues } from '../features/thumbStudio/motion'
import { SETTLE_EVENT } from '../features/projectOpen/projectOpen'
import { useTuning } from '../tuning/useTuning'

export function HarvardMitCard() {
  const v = useTuning('Thumbnail studio', THUMB_CONFIG)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const valuesRef = useRef(v)
  valuesRef.current = v

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const mobile = window.matchMedia('(max-width: 640px)')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    // The loop's phase (0..1) advances each frame by the time passed over the loop's current
    // length (Loop Sec ÷ Speed), so changing either dial changes the pace without a jump.
    let clock = 0
    let last = performance.now()
    let frame = 0
    let visible = false
    // Opening the project: finish the move in progress (on to the next held mark) within the
    // given time, then hold there, so the card never lands on the page mid-move.
    let settle: { from: number; to: number; at: number; ms: number; clock: number } | null = null

    const loopMs = () => (valuesRef.current.motion.loopSec * 1000) / valuesRef.current.motion.speed
    const advance = (now: number) => {
      // Off screen the loop pauses where it was rather than skipping ahead.
      clock += Math.min(now - last, 100) / loopMs()
      last = now
    }
    const phase = (now: number) => {
      if (!settle) return ((clock % 1) + 1) % 1
      const natural = settle.from + (clock - settle.clock)
      const forced = settle.from + (settle.to - settle.from) * Math.min(1, (now - settle.at) / settle.ms)
      return Math.min(settle.to, Math.max(natural, forced)) % 1
    }

    const draw = (now: number) => {
      const cur = valuesRef.current
      const t = reduced.matches ? 0 : phase(now)
      const framing = (mobile.matches ? cur.mobile : cur.desktop) as FrameValues
      drawFrame(ctx, canvas.width, canvas.height, t, cur.motion as MotionValues, cur.shapes as ShapeValues, framing)
    }
    const tick = (now: number) => {
      advance(now)
      draw(now)
      frame = visible && !reduced.matches ? requestAnimationFrame(tick) : 0
    }
    const play = () => {
      if (!frame) {
        last = performance.now()
        frame = requestAnimationFrame(tick)
      }
    }

    const onSettle = (event: Event) => {
      if (reduced.matches || settle) return
      const now = performance.now()
      const t = phase(now)
      const hold = Math.min(valuesRef.current.motion.hold, 0.49)
      // Loop: [hold A][A → B][hold B][B → A]; a held mark stays, a move runs to the next hold.
      const to = t < hold ? t : t < 0.5 ? 0.5 : t < 0.5 + hold ? t : 1
      settle = { from: t, to, at: now, ms: Math.max(1, (event as CustomEvent<{ ms: number }>).detail.ms), clock }
    }
    const card = canvas.closest('[data-work]')
    card?.addEventListener(SETTLE_EVENT, onSettle)

    const resize = new ResizeObserver(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(canvas.clientWidth * dpr)
      canvas.height = Math.round(canvas.clientHeight * dpr)
      draw(performance.now())
    })
    resize.observe(canvas)
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) play()
    })
    seen.observe(canvas)
    return () => {
      cancelAnimationFrame(frame)
      card?.removeEventListener(SETTLE_EVENT, onSettle)
      resize.disconnect()
      seen.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="works__mesh" aria-hidden="true" />
}
