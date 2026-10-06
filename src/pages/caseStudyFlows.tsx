import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { EditableText } from '../components/EditableText'
import { OpportunityArt, ProblemArt, SolutionArt } from './storyArt'

/** Phone-only recordings (public/work/unwind/flows): 530×1080, the phone cropped to its own frame. */
const flow = (name: string) => ({ src: `/work/unwind/flows/${name}.mp4`, poster: `/work/unwind/flows/${name}.webp` })

/** A phone recording that plays only while on screen (and not for reduced motion). */
export function PhoneVideo({ name, className = '' }: { name: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const video = ref.current
    if (!video || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const observer = new IntersectionObserver(([e]) => (e.isIntersecting ? void video.play().catch(() => {}) : video.pause()), { threshold: 0.3 })
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
  const ref = useRef<HTMLElement>(null)
  const wasLive = useRef(false)
  const [live, setLive] = useState(false)
  const [revealCycle, setRevealCycle] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !wasLive.current) setRevealCycle((cycle) => cycle + 1)
      wasLive.current = e.isIntersecting
      setLive(e.isIntersecting)
    }, { threshold: 0.25 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const rows = [
    ['problem', s.problemLabel, s.problemTitle, s.problemBody, arts?.[0] ?? <ProblemArt key="p" />],
    ['opportunity', s.opportunityLabel, s.opportunityTitle, s.opportunityBody, arts?.[1] ?? <OpportunityArt key="o" variant={look.opportunityArt} />],
    ['solution', s.solutionLabel, s.solutionTitle, s.solutionBody, arts?.[2] ?? <SolutionArt key="s" />],
  ] as const
  return (
    <section
      ref={ref}
      className="case__section case__story"
      data-section="story"
      data-layout="story"
      data-story-layout={look.layout}
      data-story-art={look.art}
      data-story-motion={look.motion}
      data-story-reveal={look.reveal}
      data-live={live || undefined}
      aria-label="Problem, opportunity and solution"
      style={{ '--story-art-w': `${s.artWidth}px`, '--story-gap': `${s.rowGap}px`, '--story-title': s.titleScale, '--story-text-w': `${s.textWidth}px` } as CSSProperties}
    >
      <ol key={revealCycle} className="case__story-cols">
        {rows.map(([k, label, title, body, art], i) => (
          <li key={k} data-row={k} style={{ '--i': i } as CSSProperties}>
            {look.art !== 'none' && <div className="story-art">{art}</div>}
            <div className="case__story-text">
              <span className="case__story-step">{String(i + 1).padStart(2, '0')}</span>
              <p className="eyebrow">{label}</p>
              <EditableText as="h2" className="case__story-title" label={`${label} title`} value={title} onChange={edit(`story.${k}Title`)} />
              <EditableText className="case__story-body" label={`${label} body`} value={body} onChange={edit(`story.${k}Body`)} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

/* ---------- Core flows: three phone films, composed as one hero image ---------- */
export type Flows = { eyebrow: string; title: string; align: 'left' | 'center'; phoneScale: number; notificationLabel: string; voiceLabel: string; entriesLabel: string }
export function CoreFlows({ f, edit }: { f: Flows; edit: Edit }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      el.dataset.seen = ''
      return
    }
    // Enter by rising once most of the section is visible. On the way out,
    // hold the phones in place and fade them; reset the hidden rise position
    // only when the section starts entering again.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.6) {
          delete el.dataset.exiting
          el.dataset.seen = ''
        } else if ('seen' in el.dataset) {
          delete el.dataset.seen
          el.dataset.exiting = ''
        } else if (entry.isIntersecting && 'exiting' in el.dataset) {
          el.dataset.resetting = ''
          delete el.dataset.exiting
          void el.offsetWidth
          delete el.dataset.resetting
        }
      },
      { threshold: [0, 0.6] },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const phones = [
    ['notification', f.notificationLabel, 'left'],
    ['voice', f.voiceLabel, 'center'],
    ['entries', f.entriesLabel, 'right'],
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
      </div>
      <ol className="case__flows-row">
        {phones.map(([name, label, position], i) => (
          <li key={name} className="case__flow-card" data-position={position} style={{ '--i': i } as CSSProperties}>
            <div className="case__flow-device">{name === 'notification' ? <LockNotification /> : <PhoneVideo name={name} />}</div>
            <EditableText as="p" className="case__phone-label" label={`${name} label`} value={label} onChange={edit(`flows.${name}Label`)} />
          </li>
        ))}
      </ol>
    </section>
  )
}

/**
 * The notification flow on the Paper lock screen: the banner slides in, then
 * expands into its two actions. Loops while on screen (CSS only).
 */
function LockNotification() {
  return (
    <div className="case__phone lock" aria-hidden="true">
      <img className="lock__bg" src="/work/unwind/flows/lockscreen.webp" alt="" draggable={false} />
      <div className="lock__note">
        <span className="lock__icon" />
        <div className="lock__copy">
          <div className="lock__row">
            <span className="lock__app">Momo</span>
            <span className="lock__time">now</span>
          </div>
          <p className="lock__title">Something changed.</p>
          <p className="lock__text">Your heart rate rose while you were still. How are you feeling?</p>
        </div>
        <div className="lock__actions">
          <span>Talk for 30 seconds</span>
          <span>Not now</span>
        </div>
      </div>
    </div>
  )
}

/* ---------- Guided: WOOP and the Gross model side by side ---------- */
export type Guided = { eyebrow: string; title: string; body: string; align: 'left' | 'center'; woopLabel: string; modelsLabel: string }
export function GuidedPair({ g, edit }: { g: Guided; edit: Edit }) {
  return (
    <section className="case__section case__guided" data-section="guided" data-layout="guided" data-copy-align={g.align} aria-labelledby="case-guided">
      <div className="case__flows-head case__section-copy">
        <EditableText className="case__eyebrow eyebrow" label="guided eyebrow" value={g.eyebrow} onChange={edit('guided.eyebrow')} />
        <EditableText as="h2" id="case-guided" className="case__title" label="guided title" value={g.title} onChange={edit('guided.title')} />
        <EditableText className="case__body" label="guided body" value={g.body} onChange={edit('guided.body')} />
      </div>
      <ol className="case__guided-row">
        {(
          [
            ['guided-models', g.modelsLabel, 'modelsLabel'],
            ['guided-woop', g.woopLabel, 'woopLabel'],
          ] as const
        ).map(([name, label, field]) => (
          <li key={name}>
            <PhoneVideo name={name} />
            <EditableText as="p" className="case__phone-label" label={field} value={label} onChange={edit(`guided.${field}`)} />
          </li>
        ))}
      </ol>
    </section>
  )
}
