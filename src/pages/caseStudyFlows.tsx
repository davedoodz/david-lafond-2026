import { useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react'
import { EditableText } from '../components/EditableText'
import { PrototypeMomo, type PrototypeMomoValues } from './PrototypeMomo'

/** Phone-only recordings (public/work/unwind/flows): 530×1080, the phone cropped to its own frame. */
const flow = (name: string) => ({ src: `/work/unwind/flows/${name}.mp4`, poster: `/work/unwind/flows/${name}.webp` })

/** A phone recording that plays only while on screen (and not for reduced motion). */
export function PhoneVideo({
  name,
  className = '',
  momoId,
  momo,
}: {
  name: string
  className?: string
  momoId?: string
  momo?: PrototypeMomoValues
}) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const video = ref.current
    if (!video || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const observer = new IntersectionObserver(([e]) => (e.isIntersecting ? void video.play().catch(() => {}) : video.pause()), { threshold: 0.3 })
    observer.observe(video)
    return () => observer.disconnect()
  }, [])
  const { src, poster } = flow(name)
  return (
    <>
      <video ref={ref} className={`case__phone ${className}`.trim()} src={src} poster={poster} muted loop playsInline preload="metadata" aria-hidden="true" />
      {momoId && momo && <PrototypeMomo id={momoId} values={momo} mode={momoId === 'voice' ? 'awake' : 'asleep'} />}
    </>
  )
}

type Edit = (path: string) => (next: string) => void

/* ---------- Problem · Opportunity · Solution in one snap view ---------- */
export type Story = {
  problemTitle: string
  problemBody: string
  opportunityTitle: string
  opportunityBody: string
  solutionTitle: string
  solutionBody: string
}
export function StoryRow({ s, edit }: { s: Story; edit: Edit }) {
  const cols = [
    ['problem', 'Problem', s.problemTitle, s.problemBody],
    ['opportunity', 'Opportunity', s.opportunityTitle, s.opportunityBody],
    ['solution', 'Solution', s.solutionTitle, s.solutionBody],
  ] as const
  return (
    <section className="case__section case__story" data-section="story" data-layout="story" aria-label="Problem, opportunity and solution">
      <ol className="case__story-cols">
        {cols.map(([k, label, title, body], i) => (
          <li key={k} style={{ '--i': i } as CSSProperties}>
            <span className="case__story-step">{String(i + 1).padStart(2, '0')}</span>
            <p className="eyebrow">{label}</p>
            <EditableText as="h2" className="case__story-title" label={`${label} title`} value={title} onChange={edit(`story.${k}Title`)} />
            <EditableText className="case__story-body" label={`${label} body`} value={body} onChange={edit(`story.${k}Body`)} />
          </li>
        ))}
      </ol>
    </section>
  )
}

/* ---------- Core flows: three phones, staggered, sliding with scroll ---------- */
export type Flows = { eyebrow: string; title: string; notificationLabel: string; voiceLabel: string; entriesLabel: string; stagger: number; parallax: number }
export function CoreFlows({ f, edit, momo }: { f: Flows; edit: Edit; momo?: Record<string, PrototypeMomoValues> }) {
  const ref = useRef<HTMLElement>(null)
  // Scroll drives a --flow progress (-1 → 1 as the row crosses the screen); phones offset from it.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let top = 0, h = 0, frame = 0, seen = false
    const measure = () => {
      const r = el.getBoundingClientRect()
      top = r.top + window.scrollY
      h = r.height
    }
    const update = () => {
      frame = 0
      const vh = window.innerHeight
      const center = top + h / 2 - window.scrollY
      const p = Math.max(-1, Math.min(1, (center - vh / 2) / vh))
      el.style.setProperty('--flow', reduced ? '0' : p.toFixed(4))
      if (!seen && center < vh * 0.95) {
        seen = true
        el.dataset.seen = ''
      }
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const ro = new ResizeObserver(() => {
      measure()
      schedule()
    })
    ro.observe(el)
    measure()
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      window.removeEventListener('scroll', schedule)
    }
  }, [])
  const phones = [
    ['notification', f.notificationLabel],
    ['voice', f.voiceLabel],
    ['entries', f.entriesLabel],
  ] as const
  return (
    <section
      ref={ref}
      className="case__section case__flows"
      data-section="flows"
      data-layout="flows"
      style={{ '--stagger': `${f.stagger}px`, '--parallax': `${f.parallax}px` } as CSSProperties}
      aria-labelledby="case-flows"
    >
      <div className="case__flows-head">
        <EditableText className="case__eyebrow eyebrow" label="flows eyebrow" value={f.eyebrow} onChange={edit('flows.eyebrow')} />
        <EditableText as="h2" id="case-flows" className="case__title" label="flows title" value={f.title} onChange={edit('flows.title')} />
      </div>
      <ol className="case__flows-row">
        {phones.map(([name, label], i) => (
          <li key={name} style={{ '--i': i, '--k': i - 1 } as CSSProperties}>
            {name === 'notification' ? (
              <LockNotification />
            ) : (
              <PhoneVideo name={name} momoId={name === 'entries' ? 'entriesFlow' : name} momo={momo?.[name === 'entries' ? 'entriesFlow' : name]} />
            )}
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
        <div className="lock__row">
          <img className="lock__icon" src="/work/unwind/flows/unwind-icon.svg" alt="" />
          <span className="lock__app">UNWIND</span>
          <span className="lock__time">now</span>
        </div>
        <p className="lock__title">Something changed.</p>
        <p className="lock__text">Your heart rate rose while you were still. How are you feeling?</p>
        <div className="lock__actions">
          <span>Talk for 30 seconds</span>
          <span>Not now</span>
        </div>
      </div>
    </div>
  )
}

/* ---------- Guided: WOOP and the Gross model side by side ---------- */
export type Guided = { eyebrow: string; title: string; body: string; woopLabel: string; modelsLabel: string }
export function GuidedPair({ g, edit, momo }: { g: Guided; edit: Edit; momo?: Record<string, PrototypeMomoValues> }) {
  return (
    <section className="case__section case__guided" data-section="guided" data-layout="guided" aria-labelledby="case-guided">
      <div className="case__flows-head">
        <EditableText className="case__eyebrow eyebrow" label="guided eyebrow" value={g.eyebrow} onChange={edit('guided.eyebrow')} />
        <EditableText as="h2" id="case-guided" className="case__title" label="guided title" value={g.title} onChange={edit('guided.title')} />
        <EditableText className="case__body" label="guided body" value={g.body} onChange={edit('guided.body')} />
      </div>
      <ol className="case__guided-row">
        {(
          [
            ['guided-woop', g.woopLabel, 'woopLabel'],
            ['guided-models', g.modelsLabel, 'modelsLabel'],
          ] as const
        ).map(([name, label, field]) => (
          <li key={name}>
            <PhoneVideo
              name={name}
              momoId={name === 'guided-woop' ? 'guidedWoop' : 'guidedModels'}
              momo={momo?.[name === 'guided-woop' ? 'guidedWoop' : 'guidedModels']}
            />
            <EditableText as="p" className="case__phone-label" label={field} value={label} onChange={edit(`guided.${field}`)} />
          </li>
        ))}
      </ol>
    </section>
  )
}
