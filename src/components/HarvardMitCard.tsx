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
    const start = performance.now()
    let frame = 0
    let visible = false

    const draw = (now: number) => {
      const cur = valuesRef.current
      const t = reduced.matches ? 0 : (((now - start) / (cur.motion.loopSec * 1000)) % 1 + 1) % 1
      const framing = (mobile.matches ? cur.mobile : cur.desktop) as FrameValues
      drawFrame(ctx, canvas.width, canvas.height, t, cur.motion as MotionValues, cur.shapes as ShapeValues, framing)
    }
    const tick = (now: number) => {
      draw(now)
      frame = visible && !reduced.matches ? requestAnimationFrame(tick) : 0
    }
    const play = () => {
      if (!frame) frame = requestAnimationFrame(tick)
    }

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
      resize.disconnect()
      seen.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="works__mesh" aria-hidden="true" />
}
