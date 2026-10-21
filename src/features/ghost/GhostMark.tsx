import { useEffect, useId, useRef } from 'react'
import { getSharedGazeTracker } from './ghostGaze'
import { attachHappy, shapeHappy, type HappyLook, type HappyParts } from './ghostHappy'
import './ghost.css'

/**
 * Davebot, drawn on a 32 grid — ported from ditto's DavebotGhost.tsx.
 *
 * The eyes are plain black ovals on every surface. With a pointer they follow it and never blink;
 * on touch screens they look around and blink on their own (`ghostGaze`).
 *
 * They sit inside a group clipped to the head dome. `ghostGaze` measures that clip path every
 * frame to cap how far the eyes may travel, so the clip is load-bearing geometry rather than
 * decoration.
 *
 * Every mounted mark self-registers with the single shared gaze tracker, so the nav ghost and
 * the opened palette ghost both track the pointer without any coordination from their parents.
 */

const HEAD_CLIP = 'M4 14.2a12 12.2 0 1 0 24 0a12 12.2 0 1 0 -24 0Z'
const BODY =
  'M16 2c7 0 12 5.1 12 12.4 0 4-1 6.4-1 9.2 0 2.2-1.4 3.6-3.2 3.6-1.7 0-2.6-1.1-3.6-1.1s-1.9 1.2-4.2 1.2-3.2-1.2-4.2-1.2-1.9 1.1-3.6 1.1C6.4 27.2 5 25.8 5 23.6c0-2.8-1-5.2-1-9.2C4 7.1 9 2 16 2Z'
const EYES = [
  'M9.6 13.4a2.5 3.1 0 1 0 5 0a2.5 3.1 0 1 0 -5 0Z',
  'M17.8 13.4a2.5 3.1 0 1 0 5 0a2.5 3.1 0 1 0 -5 0Z',
] as const

export type GhostMarkProps = {
  /** Mark size in px. Defaults to CSS-driven sizing via `--ghost-size`. */
  size?: number
  className?: string
  /** Hovering the body makes him blush. Only the centred Davebot opts in. */
  happy?: HappyLook & { blushColor: string }
  /** Body colour override (any CSS colour, incl. var()). Unset keeps the stylesheet default. */
  fill?: string
}

export function GhostMark({ size, className, happy, fill }: GhostMarkProps) {
  const id = `ghost-${useId().replaceAll(':', '')}`
  const mountRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const gaze = getSharedGazeTracker()
    gaze.track(mount)
    return () => gaze.untrack(mount)
  }, [])

  const shellRef = useRef<SVGPathElement>(null)
  const blushLRef = useRef<SVGEllipseElement>(null)
  const blushRRef = useRef<SVGEllipseElement>(null)
  const blushCoreRef = useRef<SVGStopElement>(null)
  const happyRef = useRef(happy)
  happyRef.current = happy
  const isHappy = happy !== undefined

  const parts = (): HappyParts | null => {
    const [shell, blushL, blushR, blushCore] = [shellRef.current, blushLRef.current, blushRRef.current, blushCoreRef.current]
    if (!shell || !blushL || !blushR || !blushCore) return null
    return { shell, blush: [blushL, blushR], blushCore }
  }

  useEffect(() => {
    const found = isHappy ? parts() : null
    if (!found) return
    return attachHappy(found, () => happyRef.current!)
  }, [isHappy])

  // Geometry follows the dials without restarting the hover state.
  useEffect(() => {
    const found = happy ? parts() : null
    if (found && happy) shapeHappy(found, happy)
  })

  return (
    <span
      ref={mountRef}
      className={`ghost-mark${happy ? ' ghost-mark--happy' : ''}${className ? ` ${className}` : ''}`}
      style={{ ...(size && { '--ghost-size': `${size}px` }), ...(fill && { '--ghost-fill': fill }) } as React.CSSProperties}
      aria-hidden="true"
    >
      <span className="ghost-mark__body">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <defs>
            <clipPath id={`${id}-head`}>
              <path d={HEAD_CLIP} />
            </clipPath>
            {happy && (
              <radialGradient id={`${id}-blush`}>
                <stop ref={blushCoreRef} offset="0" stopColor={happy.blushColor} />
                <stop offset="1" stopColor={happy.blushColor} stopOpacity="0" />
              </radialGradient>
            )}
          </defs>
          <path ref={shellRef} className="ghost-mark__shell" d={BODY} />
          {happy && (
            <>
              <ellipse ref={blushLRef} className="ghost-mark__blush" fill={`url(#${id}-blush)`} opacity="0" />
              <ellipse ref={blushRRef} className="ghost-mark__blush" fill={`url(#${id}-blush)`} opacity="0" />
            </>
          )}
          {/* The gaze tracker moves exactly these two paths (g[clip-path] > path). */}
          <g className="ghost-mark__eyes" clipPath={`url(#${id}-head)`}>
            {EYES.map((d, index) => (
              <path key={index} className="ghost-mark__eye" d={d} />
            ))}
          </g>
        </svg>
      </span>
    </span>
  )
}
