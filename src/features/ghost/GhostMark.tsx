import { useEffect, useId, useRef } from 'react'
import { getSharedGazeTracker } from './ghostGaze'
import './ghost.css'

/**
 * Davebot, drawn on a 32 grid — ported from ditto's DavebotGhost.tsx.
 *
 * The eyes sit inside a group clipped to the head dome. `ghostGaze` measures
 * that clip path every frame to cap how far the pupils may travel, so the
 * clip is load-bearing geometry rather than decoration.
 *
 * Every mounted mark self-registers with the single shared gaze tracker, so
 * the nav ghost and the opened palette ghost both track the pointer without
 * any coordination from their parents.
 */

const HEAD_CLIP = 'M4 14.2a12 12.2 0 1 0 24 0a12 12.2 0 1 0 -24 0Z'
const BODY =
  'M16 2c7 0 12 5.1 12 12.4 0 4-1 6.4-1 9.2 0 2.2-1.4 3.6-3.2 3.6-1.7 0-2.6-1.1-3.6-1.1s-1.9 1.2-4.2 1.2-3.2-1.2-4.2-1.2-1.9 1.1-3.6 1.1C6.4 27.2 5 25.8 5 23.6c0-2.8-1-5.2-1-9.2C4 7.1 9 2 16 2Z'
const EYES = [
  'M9.6 13.4a2.5 3.1 0 1 0 5 0a2.5 3.1 0 1 0 -5 0Z',
  'M17.8 13.4a2.5 3.1 0 1 0 5 0a2.5 3.1 0 1 0 -5 0Z',
] as const

/** Blink on a randomised beat: a metronomic interval reads mechanical, and a
 * double blink lands occasionally for the same reason. */
function useBlink(eyesRef: React.RefObject<SVGGElement | null>) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const eyes = eyesRef.current
    if (!eyes) return

    const timers = new Set<number>()
    const later = (fn: () => void, ms: number): void => {
      const id = window.setTimeout(() => {
        timers.delete(id)
        fn()
      }, ms)
      timers.add(id)
    }
    const blink = (hold: number): void => {
      eyes.classList.add('is-blinking')
      later(() => eyes.classList.remove('is-blinking'), hold)
    }
    const schedule = (): void => {
      later(() => {
        if (!document.hidden) {
          blink(120)
          if (Math.random() < 0.22) later(() => blink(110), 300)
        }
        schedule()
      }, 2200 + Math.random() * 4000)
    }
    schedule()

    return () => {
      for (const id of timers) window.clearTimeout(id)
      eyes.classList.remove('is-blinking')
    }
  }, [eyesRef])
}

export type GhostMarkProps = {
  /** Mark size in px. Defaults to CSS-driven sizing via `--ghost-size`. */
  size?: number
  className?: string
}

export function GhostMark({ size, className }: GhostMarkProps) {
  const clipId = `ghost-clip-${useId().replaceAll(':', '')}`
  const mountRef = useRef<HTMLSpanElement>(null)
  const eyesRef = useRef<SVGGElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const gaze = getSharedGazeTracker()
    gaze.track(mount)
    return () => gaze.untrack(mount)
  }, [])

  useBlink(eyesRef)

  return (
    <span
      ref={mountRef}
      className={`ghost-mark${className ? ` ${className}` : ''}`}
      style={size ? ({ '--ghost-size': `${size}px` } as React.CSSProperties) : undefined}
      aria-hidden="true"
    >
      <span className="ghost-mark__body">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <defs>
            <clipPath id={clipId}>
              <path d={HEAD_CLIP} />
            </clipPath>
          </defs>
          <path className="ghost-mark__shell" d={BODY} />
          <g ref={eyesRef} className="ghost-mark__eyes" clipPath={`url(#${clipId})`}>
            {EYES.map((d, index) => (
              <path key={index} className="ghost-mark__pupil" d={d} />
            ))}
          </g>
        </svg>
      </span>
    </span>
  )
}

