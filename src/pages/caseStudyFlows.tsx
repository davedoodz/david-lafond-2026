import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { EditableText } from '../components/EditableText'
import { PlaybackToggle, RestartButton } from '../features/playback/VideoPlayback'
import { OpportunityArt, ProblemArt, SolutionArt, type StoryArtText, type StoryTiming } from './storyArt'
import type { SectionSpacing, TextReveal } from './caseStudyContent'
import { cardSurface, useSystemBase, type GlassDials } from '../features/momoSystem/systemSurface'
import { liteMedia } from '../lib/liteMedia'

/** Phone-only recordings (public/work/momo/flows): `<name>.mp4` is the 2x master (1060 wide for the phones),
 *  `<name>-<width>.mp4` the same recording scaled down (lanczos). The tilted phones are drawn in 3D, where the
 *  browser samples the video without smoothing: a video much larger than its on-screen pixels turns small text
 *  jagged, so each phone loads the smallest size that still covers its pixels. */
const FLOW_WIDTHS = [360, 540, 720]
const flow = (name: string, width: number | null) => ({ src: `/work/momo/flows/${name}${width ? `-${width}` : ''}.mp4`, poster: `/work/momo/flows/${name}.webp` })

/** The encoded width for a phone this size on this screen (null: the master). */
function flowWidth(host: HTMLElement) {
  const r = host.getBoundingClientRect()
  // A tilted phone's projected width runs short of its face; its height doesn't.
  const px = Math.max(r.width, r.height * (host.offsetWidth / (host.offsetHeight || 1))) * window.devicePixelRatio
  return FLOW_WIDTHS.find((w) => w >= px) ?? null
}

/** A phone recording that plays only while on screen (and not for reduced motion). It rewinds once fully off screen, so each return starts from the beginning without a visible jump. `controls`: clicking the phone pauses and plays it (the shared playback toggle), and hovering it shows the replay circle, which plays the recording again from the start. Lite media starts it paused on its poster, as if clicked; phones hide the controls, so there it stays on the poster. */
export function PhoneVideo({ name, className = '', controls = true, rate = 1 }: { name: string; className?: string; controls?: boolean; rate?: number }) {
  const host = useRef<HTMLSpanElement>(null)
  const ref = useRef<HTMLVideoElement>(null)
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  // A click pause holds until the phone leaves the screen, so scrolling a little never restarts it.
  const userPaused = useRef(liteMedia)
  useEffect(() => {
    const video = ref.current
    if (!video || reduced) return
    // Core flows owns one shared replay clock for its three recordings.
    if (video.closest('.case__flows')) return
    const observer = new IntersectionObserver(
      ([e]) => {
        if (e.intersectionRatio >= 0.3) {
          if (!userPaused.current) void video.play().catch(() => {})
        } else if (!e.isIntersecting) {
          userPaused.current = liteMedia
          video.pause()
          video.currentTime = 0
        }
      },
      { threshold: [0, 0.3] },
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [reduced])
  const replay = () => {
    const video = ref.current
    if (!video) return
    userPaused.current = false
    video.currentTime = 0
    void video.play().catch(() => {})
  }
  const [width, setWidth] = useState<number | null | undefined>(undefined)
  useLayoutEffect(() => {
    const el = host.current
    if (!el) return
    const update = () => setWidth(flowWidth(el))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  // Playback speed: the default rate too, which a source swap (resize) resets the live rate to.
  useEffect(() => {
    const video = ref.current
    if (!video) return
    video.defaultPlaybackRate = rate
    video.playbackRate = rate
  }, [rate, width])
  const { src, poster } = flow(name, width ?? null)
  // The wrapper carries size and shadow; the video is clipped to the phone outline (see .case__phone-video).
  return (
    <span ref={host} className={`case__phone ${className}`.trim()}>
      <video ref={ref} className="case__phone-video" src={width === undefined ? undefined : src} poster={poster} muted loop playsInline preload={liteMedia ? 'none' : 'metadata'} aria-hidden="true" />
      {controls && (
        <>
          <PlaybackToggle host={host} videoSelector="video" reducedMotion={reduced} feedbackOnMediaEvents={false} onUserToggle={(paused) => { userPaused.current = paused }} />
          <RestartButton onRestart={replay} label="Replay prototype" />
        </>
      )}
    </span>
  )
}

type Edit = (path: string) => (next: string) => void

/* ---------- Problem · Opportunity · Solution in one snap view ---------- */
export type Story = {
  problemLabel: string
  opportunityLabel: string
  solutionLabel: string
  problemTitle: string
  problemBody: string
  opportunityTitle: string
  opportunityBody: string
  solutionTitle: string
  solutionBody: string
  preset: string
  layout: string
  art: string
  opportunityArt: string
  motion: string
  reveal: string
  artWidth: number
  /** Playback speed per row (1 = as designed). */
  speed: Record<'problem' | 'opportunity' | 'solution', number>
  /** Momo: seconds per diagram step at speed 1 (see STORY_TIMING). */
  timing?: StoryTiming
  titleScale: number
  textWidth: number
  spacing: SectionSpacing
  /** Momo art captions. */
  artText?: StoryArtText
  /** Momo glass art cards (art: 'glass'). */
  glass?: StoryGlass
  /** Momo: art and text share a left edge, are centred, or the art spans the text width. */
  align?: 'left' | 'center' | 'stretch'
  /** Text alignment independent of the art/column alignment. */
  textAlign?: 'left' | 'center'
  /** Momo: icon on the Problem curve's peak (see PEAK_ICONS). */
  peakIcon?: string
  /** Momo: colour of that peak icon. */
  peakColor?: string
  /** Momo: peak icon offset (art units) and size. */
  peakX?: number
  peakY?: number
  peakScale?: number
  /** Momo: urgent entrance for the peak icon, and the octagon outline's stroke width. */
  peakEntrance?: string
  peakOutline?: number
  /** Momo: heartbeat placement inside the watch, and the animated context icon in the Opportunity art. */
  icons?: StoryIcons
}

type StoryIcons = {
  heartX: number
  heartY: number
  heartScale: number
  contextIcon: string
  contextSpeed: number
}
/** Icon dials as CSS variables on the story root (consumed by storyArt Watch and the context build keyframes). */
function iconVars(i: StoryIcons | undefined): CSSProperties | undefined {
  if (!i) return undefined
  return {
    '--hb-x': i.heartX,
    '--hb-y': i.heartY,
    '--hb-s': i.heartScale,
    '--ctx-speed': i.contextSpeed,
  } as CSSProperties
}

type StoryGlass = Required<GlassDials> & { glowBlur: number; radius: number; padding: number }
/** Without the system card on the page, glass sits on a plain light fill. */
const FALLBACK_BASE = { fill: '#F5F5F5', gradient: { show: false, opacity: 0, palette: 'prism', deep: '', mid: '', glow: '', light: '', spread: 1, x: 0, y: 0 } } as const

/** The art cards' glass: the system card's fill + gradient, with the story's own (size-scaled) glass dials. */
function useStoryGlass(glass: StoryGlass | undefined): CSSProperties | undefined {
  const base = useSystemBase() ?? FALLBACK_BASE
  if (!glass) return undefined
  const s = cardSurface(base.fill, base.gradient, glass)
  return {
    '--glass-fill': s.fill,
    '--glass-gradient': s.gradient,
    '--glass-backdrop': s.backdrop,
    '--glass-edge': s.edge,
    '--glass-glow': s.glow,
    '--glass-glow-blur': `${glass.glowBlur}px`,
    '--glass-radius': `${glass.radius}px`,
    '--glass-pad': `${glass.padding}px`,
  } as CSSProperties
}

type Look = Pick<Story, 'art' | 'opportunityArt' | 'motion' | 'reveal'>
/** Named art, motion, and entrance combinations; layout remains independently adjustable. */
const STORY_PRESETS: Record<string, Look> = {
  'calm cards': { art: 'card', opportunityArt: 'three', motion: 'draw', reveal: 'soft rise' },
  editorial: { art: 'line', opportunityArt: 'three', motion: 'draw', reveal: 'cascade' },
  converge: { art: 'card', opportunityArt: 'converge', motion: 'pulse', reveal: 'from sides' },
  outline: { art: 'outline', opportunityArt: 'single', motion: 'pulse', reveal: 'scale in' },
  minimal: { art: 'none', opportunityArt: 'three', motion: 'off', reveal: 'still' },
  columns: { art: 'card', opportunityArt: 'three', motion: 'draw', reveal: 'soft rise' },
}

export function StoryRow({ s, edit, selectable = false }: { s: Story; edit: Edit; selectable?: boolean }) {
  const look = { ...(STORY_PRESETS[s.preset] ?? s), layout: s.layout }
  const glassVars = useStoryGlass(s.glass)
  const rows = [
    ['problem', s.problemLabel, s.problemTitle, s.problemBody, <ProblemArt key="p" text={s.artText} peakIcon={s.peakIcon} peakColor={s.peakColor} peak={{ x: s.peakX ?? 0, y: s.peakY ?? 0, scale: s.peakScale ?? 1 }} timing={s.timing?.problem} />],
    ['opportunity', s.opportunityLabel, s.opportunityTitle, s.opportunityBody, <OpportunityArt key="o" variant={look.opportunityArt} contextIcon={s.icons?.contextIcon} text={s.artText} timing={s.timing?.opportunity} />],
    ['solution', s.solutionLabel, s.solutionTitle, s.solutionBody, <SolutionArt key="s" text={s.artText} timing={s.timing?.solution} />],
  ] as const
  return (
    <section
      className="case__section case__story"
      data-section="story"
      data-layout="story"
      data-story-layout={look.layout}
      data-story-align={s.align}
      data-story-text-align={s.textAlign}
      data-story-art={look.art}
      data-story-motion={look.motion}
      data-story-reveal={look.reveal}
      data-peak-entrance={s.peakEntrance}
      aria-label="Problem, opportunity and solution"
      style={{ ...glassVars, ...iconVars(s.icons), ...(s.peakOutline != null && { '--peak-outline': s.peakOutline }), '--story-art-w': `${s.artWidth}px`, '--section-pad-top': `${s.spacing.top}px`, '--section-pad-bottom': `${s.spacing.bottom}px`, '--section-content-gap': `${s.spacing.contentGap}px`, '--story-title': s.titleScale, '--story-text-w': `${s.textWidth}px` } as CSSProperties}
    >
      <ol className="case__story-cols">
        {rows.map(([k, label, title, body, art]) => (
          <StoryItem key={k} row={k} speed={s.speed[k]}>
            {look.art !== 'none' && <div className="story-art">{art}</div>}
            <div className="case__story-text">
              <p className="eyebrow">{label}</p>
              <EditableText as="h2" className="case__story-title" label={`${label} title`} value={title} onChange={edit(`story.${k}Title`)} selectable={selectable} />
              <EditableText className="case__story-body" label={`${label} body`} value={body} onChange={edit(`story.${k}Body`)} selectable={selectable} />
            </div>
          </StoryItem>
        ))}
      </ol>
    </section>
  )
}

/**
 * One story row, triggered on its own: its entrance and art sequence replay from the start
 * each time the row comes back into view, and its loops pause while it is off screen.
 * The rewind happens once the row is fully off screen, so it scrolls back in already on its
 * first frame (blank) instead of showing the finished art and then snapping back to replay.
 * `speed` sets every animation's playbackRate, so durations, delays and loops scale together.
 * `data-live` is set directly (not React state) so the restart lands in the same frame.
 */
function StoryItem({ row, speed, children }: { row: string; speed: number; children: ReactNode }) {
  const ref = useRef<HTMLLIElement>(null)
  const speedRef = useRef(speed)
  useEffect(() => {
    speedRef.current = speed
    ref.current?.getAnimations({ subtree: true }).forEach((a) => { a.playbackRate = speed })
  }, [speed])
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([e]) => {
      if (e.intersectionRatio >= 0.35 && !('live' in el.dataset)) {
        el.dataset.live = ''
        el.getAnimations({ subtree: true }).forEach((a) => { a.playbackRate = speedRef.current; a.currentTime = 0; a.play() })
      } else if (!e.isIntersecting && 'live' in el.dataset) {
        // Animations played from script no longer follow the CSS pause, so hold them on frame one here.
        delete el.dataset.live
        el.getAnimations({ subtree: true }).forEach((a) => { a.pause(); a.currentTime = 0 })
      }
    }, { threshold: [0, 0.35] })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return <li ref={ref} data-row={row}>{children}</li>
}

/**
 * Phones slide into a section once most of it is visible, or, for a section taller than the screen
 * (the stacked phone layout), once it fills most of the screen. Once the section has fully left the
 * screen, the cards snap (unseen) to the start position on the side it will come back from, so a
 * return never shows them in place first and never fades them out while they are still in view.
 * Cards opt in with `.case__rise` and a `--i` stagger index.
 */
function useRiseOnView() {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.dataset.seen = ''
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        const screen = entry.rootBounds?.height ?? window.innerHeight
        if (entry.intersectionRatio >= 0.6 || entry.intersectionRect.height >= 0.6 * screen) {
          el.dataset.seen = ''
        } else if (!entry.isIntersecting) {
          // Above the viewport now means the return comes scrolling up, from above.
          el.dataset.from = entry.boundingClientRect.top < 0 ? 'above' : 'below'
          el.dataset.resetting = ''
          delete el.dataset.seen
          void el.offsetWidth
          delete el.dataset.resetting
        }
      },
      { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6] },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}

/* ---------- Core flows: three phone films, composed as one hero image ---------- */
export type Flows = { eyebrow: string; title: string; body: string; align: 'left' | 'center'; phoneScale: number; speed?: Record<'entries' | 'voice' | 'tracker', number>; entriesLabel: string; voiceLabel: string; trackerLabel: string; spacing: SectionSpacing; textReveal: TextReveal }
export function CoreFlows({ f, edit, selectable = false }: { f: Flows; edit: Edit; selectable?: boolean }) {
  const ref = useRiseOnView()
  useEffect(() => {
    const section = ref.current
    if (!section || liteMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const videos = Array.from(section.querySelectorAll('video'))
    let armed = true
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        armed = true
        videos.forEach(video => {
          video.pause()
          video.currentTime = 0
        })
      } else if (armed && entry.intersectionRatio >= 0.3) {
        armed = false
        videos.forEach(video => {
          video.currentTime = 0
          void video.play().catch(() => {})
        })
      }
    }, { threshold: [0, 0.3] })
    observer.observe(section)
    return () => {
      observer.disconnect()
      videos.forEach(video => video.pause())
    }
  }, [ref])
  const phones = [
    ['entries', f.entriesLabel, 'left'],
    ['voice', f.voiceLabel, 'center'],
    ['tracker', f.trackerLabel, 'right'],
  ] as const
  return (
    <section
      ref={ref}
      className="case__section case__flows"
      data-section="flows"
      data-layout="flows"
      data-copy-align={f.align}
      data-text-reveal={f.textReveal.preset}
      aria-labelledby="case-flows"
      style={{ '--flows-scale': f.phoneScale, '--section-pad-top': `${f.spacing.top}px`, '--section-pad-bottom': `${f.spacing.bottom}px`, '--section-content-gap': `${f.spacing.contentGap}px`, '--text-reveal-duration': `${f.textReveal.duration}s`, '--text-reveal-stagger': `${f.textReveal.stagger}s` } as CSSProperties}
    >
      <div className="case__flows-head case__section-copy">
        <EditableText className="case__eyebrow eyebrow" label="flows eyebrow" value={f.eyebrow} onChange={edit('flows.eyebrow')} />
        <EditableText as="h2" id="case-flows" className="case__title" label="flows title" value={f.title} onChange={edit('flows.title')} selectable={selectable} />
        <EditableText className="case__body" label="flows body" value={f.body} onChange={edit('flows.body')} selectable={selectable} />
      </div>
      <ol className="case__flows-row">
        {phones.map(([name, label, position], i) => (
          <li key={name} className="case__flow-card case__rise" data-position={position} style={{ '--i': i } as CSSProperties}>
            <div className="case__flow-device"><PhoneVideo name={name} rate={f.speed?.[name] ?? 1} /></div>
            <EditableText as="p" className="case__phone-label" label={`${name} label`} value={label} onChange={edit(`flows.${name}Label`)} />
          </li>
        ))}
      </ol>
    </section>
  )
}

/* ---------- Guided: WOOP and the Gross model side by side ---------- */
export type GuidedReveal = 'rise' | 'cascade' | 'focus' | 'from sides' | 'wipe' | 'still'
export type Guided = { eyebrow: string; title: string; body: string; align: 'left' | 'center'; reveal: GuidedReveal; woopLabel: string; modelsLabel: string; pickScale: number; speed: { models: number; woop: number }; spacing: SectionSpacing; textReveal: TextReveal }
export function GuidedPair({ g, edit, selectable = false }: { g: Guided; edit: Edit; selectable?: boolean }) {
  const ref = useRiseOnView()
  return (
    <section ref={ref} className="case__section case__guided" data-section="guided" data-layout="guided" data-copy-align={g.align} data-guided-reveal={g.reveal} data-text-reveal={g.textReveal.preset} aria-labelledby="case-guided" style={{ '--pick-scale': g.pickScale, '--section-pad-top': `${g.spacing.top}px`, '--section-pad-bottom': `${g.spacing.bottom}px`, '--section-content-gap': `${g.spacing.contentGap}px`, '--text-reveal-duration': `${g.textReveal.duration}s`, '--text-reveal-stagger': `${g.textReveal.stagger}s` } as CSSProperties}>
      <div className="case__flows-head case__section-copy">
        <EditableText className="case__eyebrow eyebrow" label="guided eyebrow" value={g.eyebrow} onChange={edit('guided.eyebrow')} />
        <EditableText as="h2" id="case-guided" className="case__title" label="guided title" value={g.title} onChange={edit('guided.title')} selectable={selectable} />
        <EditableText className="case__body" label="guided body" value={g.body} onChange={edit('guided.body')} selectable={selectable} />
      </div>
      <ol className="case__guided-row">
        {(
          [
            ['guided-woop-pick', g.modelsLabel, 'modelsLabel'],
            ['guided-woop', g.woopLabel, 'woopLabel'],
          ] as const
        ).map(([name, label, field], i) => (
          <li key={name} className="case__rise" style={{ '--i': i } as CSSProperties}>
            <PhoneVideo name={name} className={name === 'guided-woop-pick' ? 'case__phone--bare' : ''} controls={name !== 'guided-woop-pick'} rate={name === 'guided-woop-pick' ? g.speed.models : g.speed.woop} />
            <EditableText as="p" className="case__phone-label" label={field} value={label} onChange={edit(`guided.${field}`)} />
          </li>
        ))}
      </ol>
    </section>
  )
}
