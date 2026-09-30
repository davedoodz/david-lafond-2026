import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import './wristSequence.css'

/** A point in the frame image's own pixels. */
type Pt = [number, number]
/** The blank watch display in one frame, clockwise from top-left, in image pixels. */
export type ScreenQuad = [Pt, Pt, Pt, Pt]

export type WristFrame = {
  src: string
  /** Smaller file for narrow screens. */
  srcSmall?: string
  width: number
  height: number
  screen: ScreenQuad
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
  /** Outline the tracked watch display (for lining up the future UI layer). */
  showScreen?: boolean
  /** Live watch interface, positioned over the blank display. Reads `data-phase` / `--p` from its layer. */
  ui?: ReactNode
  /** Optional watch-glass / reflection layer drawn over the UI. */
  glass?: ReactNode
  className?: string
  id?: string
  'data-section'?: string
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerpQuad = (a: ScreenQuad, b: ScreenQuad, t: number) => a.map((p, i) => [lerp(p[0], b[i][0], t), lerp(p[1], b[i][1], t)]) as ScreenQuad

/**
 * A tall scroll section with a pinned, full-bleed stage. Scroll progress drives:
 * - which wrist frame shows (adjacent frames crossfade, so 6–8 keyframes read as one continuous motion),
 * - a very small push-in and parallax on the whole picture,
 * - `data-phase` + `--p` on the watch-UI layer, which is anchored to the watch display
 *   (the display quad is interpolated between frames, so the UI follows the wrist).
 *
 * Layer stack: 1 photo (+ wrist) · 2 live watch UI · 3 optional glass.
 * Scroll work: one passive listener, rAF-throttled; section offset and cover geometry are
 * measured on resize only, so no layout is read per frame.
 */
export function WristSequence({ frames, heightVh = 360, zoom = 0.04, drift = 12, showScreen = false, ui, glass, className = '', ...rest }: Props) {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const pictureRef = useRef<HTMLDivElement>(null)
  const imgRefs = useRef<(HTMLImageElement | null)[]>([])
  const screenRef = useRef<HTMLDivElement>(null)
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
      // Watch display: interpolated quad → cover coordinates (inside the moving picture, so it inherits its motion).
      const a = frames[i], b = frames[Math.min(frames.length - 1, i + 1)]
      const q = lerpQuad(a.screen, b.screen, t)
      const cover = Math.max(sw / a.width, sh / a.height)
      const ox = (sw - a.width * cover) * posX, oy = (sh - a.height * cover) * posY
      const P = q.map(([x, y]) => [ox + x * cover, oy + y * cover])
      const cx = (P[0][0] + P[1][0] + P[2][0] + P[3][0]) / 4, cy = (P[0][1] + P[1][1] + P[2][1] + P[3][1]) / 4
      const w = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]), h = Math.hypot(P[3][0] - P[0][0], P[3][1] - P[0][1])
      const angle = Math.atan2(P[1][1] - P[0][1], P[1][0] - P[0][0])
      screen.style.width = `${w.toFixed(1)}px`
      screen.style.height = `${h.toFixed(1)}px`
      screen.style.transform = `translate(${(cx - w / 2).toFixed(1)}px, ${(cy - h / 2).toFixed(1)}px) rotate(${angle.toFixed(4)}rad)`
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
  }, [frames])

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
          <div ref={screenRef} className="wrist-seq__screen" data-guide={showScreen || undefined}>
            {ui}
          </div>
          {glass && <div className="wrist-seq__glass">{glass}</div>}
        </div>
      </div>
    </section>
  )
}
