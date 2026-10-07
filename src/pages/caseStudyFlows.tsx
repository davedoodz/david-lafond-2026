import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { EditableText } from '../components/EditableText'
import { OpportunityArt, ProblemArt, SolutionArt, type StoryArtText } from './storyArt'
import { cardSurface, useSystemBase, type GlassDials } from '../features/unwindSystem/systemSurface'

/** Phone-only recordings (public/work/unwind/flows): 530×1080, the phone cropped to its own frame. */
const flow = (name: string) => ({ src: `/work/unwind/flows/${name}.mp4`, poster: `/work/unwind/flows/${name}.webp` })

/** A phone recording that plays only while on screen (and not for reduced motion); each return starts it from the beginning. */
export function PhoneVideo({ name, className = '' }: { name: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const video = ref.current
    if (!video || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // Core flows owns one shared replay clock for its three recordings.
    if (video.closest('.case__flows')) return
    const observer = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return video.pause()
        video.currentTime = 0
        void video.play().catch(() => {})
      },
      { threshold: 0.3 },
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [])
  const { src, poster } = flow(name)
  // The wrapper carries size and shadow; the video is clipped to the phone outline (see .case__phone-video).
  return (
    <span className={`case__phone ${className}`.trim()} aria-hidden="true">
      <video ref={ref} className="case__phone-video" src={src} poster={poster} muted loop playsInline preload="metadata" />
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
  rowGap: number
  titleScale: number
  textWidth: number
  /** Unwind art captions; other case studies pass their own `arts`. */
  artText?: StoryArtText
  /** Unwind glass art cards (art: 'glass'). */
  glass?: StoryGlass
  /** Unwind: art and text share a left edge, are centred, or the art spans the text width. */
  align?: 'left' | 'center' | 'stretch'
  /** Text alignment independent of the art/column alignment. */
  textAlign?: 'left' | 'center'
  /** Unwind: icon on the Problem curve's peak (see PEAK_ICONS). */
  peakIcon?: string
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

/** `arts` replaces the Unwind graphics (problem, opportunity, solution) for another case study. */
export function StoryRow({ s, edit, arts }: { s: Story; edit: Edit; arts?: [ReactNode, ReactNode, ReactNode] }) {
  const look = { ...(STORY_PRESETS[s.preset] ?? s), layout: s.layout }
  const glassVars = useStoryGlass(s.glass)
  const rows = [
    ['problem', s.problemLabel, s.problemTitle, s.problemBody, arts?.[0] ?? <ProblemArt key="p" text={s.artText} peakIcon={s.peakIcon} />],
    ['opportunity', s.opportunityLabel, s.opportunityTitle, s.opportunityBody, arts?.[1] ?? <OpportunityArt key="o" variant={look.opportunityArt} text={s.artText} />],
    ['solution', s.solutionLabel, s.solutionTitle, s.solutionBody, arts?.[2] ?? <SolutionArt key="s" text={s.artText} />],
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
      aria-label="Problem, opportunity and solution"
      style={{ ...glassVars, '--story-art-w': `${s.artWidth}px`, '--story-gap': `${s.rowGap}px`, '--story-title': s.titleScale, '--story-text-w': `${s.textWidth}px` } as CSSProperties}
    >
      <ol className="case__story-cols">
        {rows.map(([k, label, title, body, art], i) => (
          <StoryItem key={k} row={k}>
            {look.art !== 'none' && <div className="story-art">{art}</div>}
            <div className="case__story-text">
              <span className="case__story-step">{String(i + 1).padStart(2, '0')}</span>
              <p className="eyebrow">{label}</p>
              <EditableText as="h2" className="case__story-title" label={`${label} title`} value={title} onChange={edit(`story.${k}Title`)} />
              <EditableText className="case__story-body" label={`${label} body`} value={body} onChange={edit(`story.${k}Body`)} />
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
 * `data-live` is set directly (not React state) so the restart lands in the same frame.
 */
function StoryItem({ row, children }: { row: string; children: ReactNode }) {
  const ref = useRef<HTMLLIElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !('live' in el.dataset)) {
        el.dataset.live = ''
        // Restart the row's CSS animations (entrance, draws, reveals) from their first frame.
        el.getAnimations({ subtree: true }).forEach((a) => { a.cancel(); a.play() })
      } else if (!e.isIntersecting && 'live' in el.dataset) {
        // Animations restarted from script no longer follow the CSS pause, so pause them here too.
        delete el.dataset.live
        el.getAnimations({ subtree: true }).forEach((a) => a.pause())
      }
    }, { threshold: 0.35 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return <li ref={ref} data-row={row}>{children}</li>
}

/**
 * Phones slide into a section once most of it is visible: from below when it is
 * reached scrolling down, from above when reached scrolling up. On the way out they
 * hold in place and fade. Every entry first snaps the cards (already invisible) to
 * the start position on the entry side, so a return always slides, never just fades,
 * even if a fast scroll skips the observer's 0% crossing.
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
    // Latest scroll direction; the observer reads it when the section enters.
    let lastY = window.scrollY
    let scrollingUp = false
    const onScroll = () => {
      const y = window.scrollY
      if (y !== lastY) scrollingUp = y < lastY
      lastY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.6) {
          if ('seen' in el.dataset) return
          // Scrolling down means the section arrived from below; up means from above.
          el.dataset.from = scrollingUp ? 'above' : 'below'
          el.dataset.resetting = ''
          delete el.dataset.exiting
          void el.offsetWidth
          delete el.dataset.resetting
          el.dataset.seen = ''
        } else if ('seen' in el.dataset) {
          delete el.dataset.seen
          el.dataset.exiting = ''
        }
      },
      { threshold: [0, 0.6] },
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [])
  return ref
}

/* ---------- Core flows: three phone films, composed as one hero image ---------- */
export type Flows = { eyebrow: string; title: string; body: string; align: 'left' | 'center'; phoneScale: number; entriesLabel: string; voiceLabel: string; trackerLabel: string }
export function CoreFlows({ f, edit }: { f: Flows; edit: Edit }) {
  const ref = useRiseOnView()
  useEffect(() => {
    const section = ref.current
    if (!section || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
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
      aria-labelledby="case-flows"
      style={{ '--flows-scale': f.phoneScale } as CSSProperties}
    >
      <div className="case__flows-head case__section-copy">
        <EditableText className="case__eyebrow eyebrow" label="flows eyebrow" value={f.eyebrow} onChange={edit('flows.eyebrow')} />
        <EditableText as="h2" id="case-flows" className="case__title" label="flows title" value={f.title} onChange={edit('flows.title')} />
        <EditableText className="case__body" label="flows body" value={f.body} onChange={edit('flows.body')} />
      </div>
      <ol className="case__flows-row">
        {phones.map(([name, label, position], i) => (
          <li key={name} className="case__flow-card case__rise" data-position={position} style={{ '--i': i } as CSSProperties}>
            <div className="case__flow-device"><PhoneVideo name={name} /></div>
            <EditableText as="p" className="case__phone-label" label={`${name} label`} value={label} onChange={edit(`flows.${name}Label`)} />
          </li>
        ))}
      </ol>
    </section>
  )
}

/* ---------- Guided: WOOP and the Gross model side by side ---------- */
export type GuidedReveal = 'rise' | 'cascade' | 'focus' | 'from sides' | 'wipe' | 'still'
export type Guided = { eyebrow: string; title: string; body: string; align: 'left' | 'center'; reveal: GuidedReveal; woopLabel: string; modelsLabel: string }
export function GuidedPair({ g, edit }: { g: Guided; edit: Edit }) {
  const ref = useRiseOnView()
  return (
    <section ref={ref} className="case__section case__guided" data-section="guided" data-layout="guided" data-copy-align={g.align} data-guided-reveal={g.reveal} aria-labelledby="case-guided">
      <div className="case__flows-head case__section-copy">
        <EditableText className="case__eyebrow eyebrow" label="guided eyebrow" value={g.eyebrow} onChange={edit('guided.eyebrow')} />
        <EditableText as="h2" id="case-guided" className="case__title" label="guided title" value={g.title} onChange={edit('guided.title')} />
        <EditableText className="case__body" label="guided body" value={g.body} onChange={edit('guided.body')} />
      </div>
      <ol className="case__guided-row">
        {(
          [
            ['guided-woop-pick', g.modelsLabel, 'modelsLabel'],
            ['guided-woop', g.woopLabel, 'woopLabel'],
          ] as const
        ).map(([name, label, field], i) => (
          <li key={name} className="case__rise" style={{ '--i': i } as CSSProperties}>
            <PhoneVideo name={name} className={name === 'guided-woop-pick' ? 'case__phone--bare' : ''} />
            <EditableText as="p" className="case__phone-label" label={field} value={label} onChange={edit(`guided.${field}`)} />
          </li>
        ))}
      </ol>
    </section>
  )
}
