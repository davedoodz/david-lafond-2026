import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { homography, sampleTracking, type Quad } from './watchTracking'
import { TrackingEditor, loadTracking } from './TrackingEditor'
import './wristSequence.css'

// Twice the prototype's logical 396×479 display; keep DOM/text at full resolution.
const UI_WIDTH = 792
const UI_HEIGHT = 958

export type WristFrame = {
  src: string
  /** Smaller file for narrow screens. */
  srcSmall?: string
  width: number
  height: number
  /** Display quad for the scroll-scrubbed watch screen, in source-image pixels. */
  screen?: [[number, number], [number, number], [number, number], [number, number]]
}

/** Scroll beats: progress (0–1) where each phase starts. Exposed as `data-phase` on the stage. */
export const WRIST_PHASES = [
  ['idle', 0],
  ['detect', 0.2],
  ['notify', 0.4],
  ['raise', 0.55],
  ['focus', 0.75],
  ['exit', 0.9],
] as const
export type WristPhase = (typeof WRIST_PHASES)[number][0]

type Props = {
  frames: WristFrame[]
  /** Section height in vh; the stage stays pinned for (height − 100)vh of scroll. */
  heightVh?: number
  /** Scale added over the whole scroll (0.04 = 1.00 → 1.04). */
  zoom?: number
  /** Upward parallax over the whole scroll (px). */
  drift?: number
  /** Also enable the temporary editor with ?watchTracking=1. */
  showScreen?: boolean
  /** Optional watch-glass / reflection layer drawn over the UI. */
  glass?: ReactNode
  className?: string
  id?: string
  'data-section'?: string
}


/**
 * A tall scroll section with a pinned, full-bleed stage. Scroll progress drives:
 * - adjacent photographic frames, crossfaded at the fractional source-frame index,
 * - a very small push-in and parallax on the whole picture,
 * - a live iframe mapped onto the tracked four corners with a projective matrix.
 *
 * Layer stack: 1 photo (+ wrist) · 2 live watch UI · 3 optional glass.
 * Scroll work: one passive listener, rAF-throttled; section offset and cover geometry are
 * measured on resize only, so no layout is read per frame.
 */
export function WristSequence({ frames, heightVh = 360, zoom = 0.04, drift = 12, showScreen = false, glass, className = '', ...rest }: Props) {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const pictureRef = useRef<HTMLDivElement>(null)
  const imgRefs = useRef<(HTMLImageElement | null)[]>([])
  const screenRef = useRef<HTMLDivElement>(null)
  const outlineRef = useRef<SVGSVGElement>(null)
  const seekRef = useRef<(frame: number) => void>(() => {})
  const [tracking, setTracking] = useState(loadTracking)
  const [currentFrame, setCurrentFrame] = useState(1)
  const debug = showScreen || new URLSearchParams(window.location.search).get('watchTracking') === '1'
  const debugRef = useRef(debug)
  debugRef.current = debug
  const settings = useRef({ zoom, drift })
  settings.current = { zoom, drift }

  useLayoutEffect(() => {
    const section = sectionRef.current, stage = stageRef.current, picture = pictureRef.current, screen = screenRef.current
    if (!section || !stage || !picture || !screen || !frames.length) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let top = 0, travel = 1, sw = 0, sh = 0, posX = 0.5, posY = 0.5, frame = 0, phase = ''

    const measure = () => {
      const r = section.getBoundingClientRect()
      top = r.top + window.scrollY
      sw = stage.clientWidth
      sh = stage.clientHeight
      travel = Math.max(1, section.offsetHeight - sh)
      // object-position of the first frame (the CSS decides it per breakpoint).
      const [x, y] = getComputedStyle(imgRefs.current[0] ?? picture).objectPosition.split(' ')
      posX = (parseFloat(x) || 50) / 100
      posY = (parseFloat(y) || 50) / 100
    }

    const update = () => {
      frame = 0
      const p = Math.min(1, Math.max(0, (window.scrollY - top) / travel))
      // Frames: crossfade the two keyframes around p.
      const f = p * (frames.length - 1), i = Math.floor(f), t = f - i
      imgRefs.current.forEach((img, k) => {
        if (img) img.style.opacity = k === i ? '1' : k === i + 1 ? t.toFixed(3) : '0'
      })
      // Picture motion: a whisper of push-in and upward drift.
      const s = reduced ? 1 : 1 + settings.current.zoom * p
      const dy = reduced ? 0 : -settings.current.drift * p
      picture.style.transform = `translate3d(0, ${dy.toFixed(2)}px, 0) scale(${s.toFixed(4)})`
      // Same fractional frame as the photograph: never use a second scroll timeline.
      const sourceFrame = f + 1
      const pose = sampleTracking(tracking, sourceFrame)
      const a = frames[i]
      const cover = Math.max(sw / a.width, sh / a.height)
      const ox = (sw - a.width * cover) * posX, oy = (sh - a.height * cover) * posY
      const points = pose.corners.map(([x, y]) => [ox + x * cover, oy + y * cover]) as Quad
      const matrix = homography(UI_WIDTH, UI_HEIGHT, points)
      screen.style.opacity = matrix ? String(pose.opacity) : '0'
      screen.style.visibility = matrix && pose.opacity > 0 ? 'visible' : 'hidden'
      screen.inert = !matrix || pose.opacity <= 0
      if (matrix) screen.style.transform = matrix
      stage.dataset.frame = sourceFrame.toFixed(3)
      if (debugRef.current) {
        setCurrentFrame(sourceFrame)
        const outline = outlineRef.current
        if (outline) {
          outline.querySelector('polygon')?.setAttribute('points', points.map(p => p.join(',')).join(' '))
          outline.querySelectorAll('circle').forEach((dot, k) => {
            dot.setAttribute('cx', String(points[k][0]))
            dot.setAttribute('cy', String(points[k][1]))
          })
        }
      }
      screen.style.setProperty('--p', p.toFixed(4))
      const next = [...WRIST_PHASES].reverse().find(([, at]) => p >= at)![0]
      if (next !== phase) {
        phase = next
        stage.dataset.phase = next
      }
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const resize = new ResizeObserver(() => {
      measure()
      schedule()
    })
    seekRef.current = (target) => {
      measure()
      window.scrollTo({ top: top + (target - 1) / Math.max(1, frames.length - 1) * travel, behavior: 'instant' })
      schedule()
    }
    resize.observe(section)
    resize.observe(document.documentElement)
    measure()
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      window.removeEventListener('scroll', schedule)
    }
  }, [frames, tracking, debug])

  // Decode every keyframe up front so the crossfades never hitch on first view.
  useEffect(() => {
    imgRefs.current.forEach((img) => void img?.decode?.().catch(() => {}))
  }, [frames])

  return (
    <section
      ref={sectionRef}
      className={`wrist-seq ${className}`.trim()}
      style={{ '--wrist-h': `${heightVh}svh` } as CSSProperties}
      {...rest}
    >
      <div ref={stageRef} className="wrist-seq__stage" data-phase="idle">
        <div ref={pictureRef} className="wrist-seq__picture">
          {frames.map((f, k) => (
            <img
              key={f.src}
              ref={(el) => {
                imgRefs.current[k] = el
              }}
              className="wrist-seq__frame"
              src={f.src}
              srcSet={f.srcSmall ? `${f.srcSmall} 960w, ${f.src} ${f.width}w` : undefined}
              sizes="100vw"
              width={f.width}
              height={f.height}
              alt=""
              decoding="async"
              style={{ opacity: k === 0 ? 1 : 0 }}
            />
          ))}
          <div ref={screenRef} className="wrist-seq__screen" style={{ width: UI_WIDTH, height: UI_HEIGHT, opacity: 0 }}>
            <iframe
              className="wrist-seq__interface"
              src="/work/unwind/notification/notification.html?embed=watch"
              title="Live Unwind smartwatch notification"
              width={UI_WIDTH}
              height={UI_HEIGHT}
            />
          </div>
          {debug && <svg ref={outlineRef} className="wrist-seq__tracking" aria-hidden="true">
            <polygon />
            {[0, 1, 2, 3].map(k => <circle key={k} r="4" />)}
          </svg>}
          {glass && <div className="wrist-seq__glass">{glass}</div>}
        </div>
      </div>
      {debug && <TrackingEditor keys={tracking} onChange={setTracking} currentFrame={currentFrame} onSeek={frame => seekRef.current(frame)} />}
    </section>
  )
}
