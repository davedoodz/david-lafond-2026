/**
 * Shared felt-tip renderer: draws recorded strokes as smooth SVG paths, optionally replaying
 * them stroke-by-stroke on a rAF loop. Used by both the hero signature and the dev-only studio
 * (edit preview + "Replay preview"), so pen/playback tuning always looks identical in both.
 *
 * Perf: only the in-progress stroke's path is touched every frame, and it's written straight to
 * the DOM via a ref — no React re-render on the hot path. Re-renders only happen when a stroke
 * finishes or the pen/playback dials change. The rAF loop stops as soon as playback completes.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react'
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
  const [doneCount, setDoneCount] = useState(mode === 'instant' ? strokes.length : 0)
  const activePathRef = useRef<SVGPathElement | null>(null)
  const elapsedRef = useRef(-startDelayMs)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const finished = doneCount >= strokes.length
  const filterId = useId().replace(/:/g, '')

  useEffect(() => {
    setDoneCount(mode === 'instant' ? strokes.length : 0)
    elapsedRef.current = -startDelayMs
    activePathRef.current?.setAttribute('d', '')
  }, [strokes, mode, startDelayMs])

  useEffect(() => {
    if (mode !== 'live' || !play || finished) return
    let raf = 0
    let last = performance.now()
    let cancelled = false

    function tick(now: number) {
      if (cancelled) return
      elapsedRef.current += now - last
      last = now
      const elapsed = elapsedRef.current

      if (elapsed >= 0) {
        const timeline = buildTimeline(strokes, speed, maxGapMs)
        let completed = 0
        let active: (typeof timeline.segments)[number] | undefined
        for (const segment of timeline.segments) {
          if (elapsed >= segment.endMs) completed = segment.strokeIndex + 1
          else if (elapsed >= segment.startMs) {
            active = segment
            break
          } else break
        }
        setDoneCount((prev) => (prev === completed ? prev : completed))

        if (active) {
          const points = strokes[active.strokeIndex].points
          const span = active.endMs - active.startMs || 1
          const rawStart = points[0][3]
          const rawEnd = points[points.length - 1][3]
          const rawT = rawStart + ((elapsed - active.startMs) / span) * (rawEnd - rawStart)
          const path = strokeOutlinePath(samplePrefix(points, rawT), pen, strokes[active.strokeIndex].pen)
          activePathRef.current?.setAttribute('d', path)
        } else {
          activePathRef.current?.setAttribute('d', '')
        }

        if (elapsed >= timeline.totalMs) {
          setDoneCount(strokes.length)
          onDoneRef.current?.()
          return
        }
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [mode, play, finished, strokes, speed, maxGapMs, pen])

  const finishedPaths = useMemo(
    () => strokes.slice(0, doneCount).map((stroke) => strokeOutlinePath(stroke.points, pen, stroke.pen)),
    [strokes, doneCount, pen],
  )
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
        {finishedPaths.map((d, i) => (
          <path key={i} d={d} />
        ))}
        <path ref={activePathRef} d="" />
        {liveStrokePath && <path d={liveStrokePath} />}
      </g>
    </svg>
  )
}
