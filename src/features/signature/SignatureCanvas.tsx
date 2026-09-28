/**
 * Shared felt-tip renderer: draws recorded strokes as smooth SVG paths, optionally replaying
 * them stroke-by-stroke on a rAF loop. Used by both the hero signature and the dev-only studio
 * (edit preview + "Replay preview"), so pen/playback tuning always looks identical in both.
 *
 * Perf + smoothness: one <path> per stroke, all written straight to the DOM from a single rAF
 * pass — no React state on the hot path. A stroke's hand-off from "growing tip" to "finished" is
 * the same element in the same frame, so nothing can blink between two renders, and playback
 * never restarts mid-way. The rAF loop stops as soon as playback completes.
 */
import { useEffect, useId, useLayoutEffect, useMemo, useRef } from 'react'
import type { SignatureData, SignatureStroke } from './types'
import { strokeOutlinePath, type PenOptions } from './stroke'
import { buildTimeline, samplePrefix } from './playback'

export type SignatureCanvasProps = {
  data: SignatureData
  pen: PenOptions
  color: string
  opacity: number
  grain: number
  speed: number
  startDelayMs: number
  maxGapMs: number
  /** Whether the replay clock should be running (gated by viewport visibility upstream). */
  play: boolean
  /** 'instant' renders every stroke fully drawn immediately, no animation. */
  mode: 'live' | 'instant'
  onDone?: () => void
  className?: string
  /** An extra in-progress stroke drawn statically on top (the studio's live pointer stroke). */
  liveStroke?: SignatureStroke | null
}

export function SignatureCanvas({
  data,
  pen,
  color,
  opacity,
  grain,
  speed,
  startDelayMs,
  maxGapMs,
  play,
  mode,
  onDone,
  className,
  liveStroke,
}: SignatureCanvasProps) {
  const strokes = data.strokes
  const pathRefs = useRef<(SVGPathElement | null)[]>([])
  const elapsedRef = useRef(mode === 'instant' ? Infinity : -startDelayMs)
  const doneRef = useRef(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const filterId = useId().replace(/:/g, '')

  const timeline = useMemo(() => buildTimeline(strokes, speed, maxGapMs), [strokes, speed, maxGapMs])
  const fullPaths = useMemo(() => strokes.map((stroke) => strokeOutlinePath(stroke.points, pen, stroke.pen)), [strokes, pen])

  /** Writes every stroke's path for playback time `elapsed`: done → full, active → tip prefix, not yet → empty.
   * Empty strokes have no timeline segment; they only appear once everything is done. */
  const paintRef = useRef((_elapsed: number) => {})
  paintRef.current = (elapsed: number) => {
    const d = strokes.map((_, i) => (elapsed >= timeline.totalMs ? fullPaths[i] : ''))
    for (const segment of timeline.segments) {
      const i = segment.strokeIndex
      if (elapsed >= segment.endMs) d[i] = fullPaths[i]
      else if (elapsed >= segment.startMs) {
        const points = strokes[i].points
        const rawStart = points[0][3]
        const progress = (elapsed - segment.startMs) / (segment.endMs - segment.startMs || 1)
        const rawT = rawStart + progress * (points[points.length - 1][3] - rawStart)
        d[i] = strokeOutlinePath(samplePrefix(points, rawT), pen, strokes[i].pen)
      }
    }
    pathRefs.current.forEach((el, i) => {
      if (el && el.getAttribute('d') !== d[i]) el.setAttribute('d', d[i])
    })
  }

  // Restart on new data/mode/delay (and on a Replay, which remounts via key).
  useLayoutEffect(() => {
    elapsedRef.current = mode === 'instant' ? Infinity : -startDelayMs
    doneRef.current = mode === 'instant'
    paintRef.current(elapsedRef.current)
  }, [strokes, mode, startDelayMs])

  // Dial changes (pen, speed) repaint in place at the current playback time — no restart, no blank frame.
  useLayoutEffect(() => {
    paintRef.current(elapsedRef.current)
  }, [fullPaths, timeline])

  useEffect(() => {
    if (mode !== 'live' || !play || doneRef.current) return
    let raf = 0
    let last = performance.now()

    function tick(now: number) {
      elapsedRef.current += now - last
      last = now
      const elapsed = elapsedRef.current
      if (elapsed >= timeline.totalMs) {
        elapsedRef.current = Infinity
        doneRef.current = true
        paintRef.current(Infinity)
        onDoneRef.current?.()
        return
      }
      if (elapsed >= 0) paintRef.current(elapsed)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [mode, play, timeline])

  const liveStrokePath = useMemo(
    () => (liveStroke ? strokeOutlinePath(liveStroke.points, pen, liveStroke.pen) : ''),
    [liveStroke, pen],
  )

  return (
    <svg className={className} viewBox={`0 0 ${data.width} ${data.height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {grain > 0 && (
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency={0.75} numOctaves={2} seed={7} result="grainNoise" />
            <feComponentTransfer in="grainNoise" result="grainAlpha">
              <feFuncA type="linear" slope={grain} intercept={1 - grain} />
            </feComponentTransfer>
            <feComposite in="SourceGraphic" in2="grainAlpha" operator="in" />
          </filter>
        </defs>
      )}
      <g fill={color} fillOpacity={opacity} filter={grain > 0 ? `url(#${filterId})` : undefined}>
        {strokes.map((_, i) => (
          <path
            key={i}
            ref={(el) => {
              pathRefs.current[i] = el
            }}
          />
        ))}
        {liveStrokePath && <path d={liveStrokePath} />}
      </g>
    </svg>
  )
}
