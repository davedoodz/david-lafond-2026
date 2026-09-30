import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { ContactCta } from '../components/ContactCta'
import { EditableText } from '../components/EditableText'
import { Footer } from '../components/Footer'
import { BackLink, Nav } from '../components/Nav'
import type { Work } from '../data/works'
import { UnwindIntro } from '../features/unwindIntro/UnwindIntro'
import { useTuningController } from '../tuning/useTuning'
import { ECOFABRIQ_CONFIG, PROTO_VIDEOS, UNWIND_CONFIG, type ProtoVideo } from './caseStudyContent'
import './CaseStudyPage.css'

type Id = Extract<Work['id'], 'unwind' | 'ecofabriq'>
type Props = { id: Id }

const PANELS = {
  unwind: { name: 'Unwind case study', config: UNWIND_CONFIG },
  ecofabriq: { name: 'EcoFabriq case study', config: ECOFABRIQ_CONFIG },
} as const

type Media = { video: string; layout: string; size: number; gap: number; x: number; y: number; radius: number }
type Section = { eyebrow: string; title: string; body: string; media: Media }
type Hero = Section & { role: string; timeline: string; team: string }

/** One prototype recording: plays only while its section is on screen. */
function ProtoMedia({ media }: { media: Media }) {
  const ref = useRef<HTMLVideoElement>(null)
  const name = media.video as ProtoVideo
  useEffect(() => {
    const video = ref.current
    if (!video) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void video.play().catch(() => {})
        else video.pause()
      },
      { threshold: 0.35 },
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [name])
  const dims = PROTO_VIDEOS[name]
  if (!dims) return null
  return (
    <video
      ref={ref}
      key={name}
      className="case__media"
      src={`/work/unwind/proto/${name}.mp4`}
      poster={`/work/unwind/proto/${name}.webp`}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      style={
        {
          '--media-h': `${media.size}svh`,
          '--media-ratio': `${dims.w} / ${dims.h}`,
          '--media-x': `${media.x}%`,
          '--media-y': `${media.y}%`,
          '--media-radius': `${media.radius}px`,
        } as CSSProperties
      }
    />
  )
}

/**
 * Case-study page (Unwind, EcoFabriq): Apple-style storytelling. Each section is
 * one full-screen mandatory snap stop pairing a few lines of copy with a
 * prototype recording. A sticky sidebar lists the sections (their eyebrows) and
 * tracks the one in view. All copy is editable on the page in dev.
 */
export function CaseStudyPage({ id }: Props) {
  const panel = PANELS[id]
  const { values, setValue } = useTuningController(panel.name, panel.config)
  const all = values as unknown as Record<string, Section> & { page: { snap: string; showSidebar: boolean; contentWidth: number; textWidth: number }; hero: Hero }
  const page = all.page
  const hero = all.hero
  // Unwind opens with the voice intro; the hero video stays hidden until it hands off.
  const [intro, setIntro] = useState(id === 'unwind')
  const keys = Object.keys(panel.config).filter((k) => k !== 'page' && k !== 'hero')

  // Snap lives on <html>; layout effect so it is gone in the same commit that swaps pages.
  useLayoutEffect(() => {
    if (page.snap === 'off') return
    const root = document.documentElement
    root.dataset.caseSnap = page.snap
    return () => {
      delete root.dataset.caseSnap
    }
  }, [page.snap])

  // Sidebar: highlight the section crossing the middle of the screen; hide over the dark footer sheet.
  const mainRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState<string>('hero')
  const [onDark, setOnDark] = useState(false)
  useEffect(() => {
    const main = mainRef.current
    if (!main) return
    const sections = main.querySelectorAll<HTMLElement>('[data-section]')
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive((entry.target as HTMLElement).dataset.section!)
      },
      { rootMargin: '-50% 0px -50% 0px' },
    )
    sections.forEach((s) => observer.observe(s))
    const dark = main.querySelector('.case__dark')
    const darkObserver = new IntersectionObserver(([entry]) => setOnDark(entry.isIntersecting), { rootMargin: '0px 0px -60% 0px' })
    if (dark) darkObserver.observe(dark)
    return () => {
      observer.disconnect()
      darkObserver.disconnect()
    }
  }, [keys.length])

  const jump = (key: string) => {
    const target = mainRef.current?.querySelector(`[data-section="${key}"]`)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  const edit = (path: string) => (next: string) => setValue(path, next)

  const renderSection = (key: string, s: Section, isHero = false) => {
    const hasVideo = s.media.video !== 'none'
    return (
      <section
        key={key}
        className={`case__section${isHero ? ' case__section--hero' : ''}`}
        data-section={key}
        data-layout={hasVideo ? s.media.layout : 'text'}
        style={{ '--media-gap': `${s.media.gap}px` } as CSSProperties}
        aria-labelledby={`case-${key}`}
      >
        <div className="case__text">
          {isHero && <BackLink className="case__back case__back--inline" />}
          <EditableText className="case__eyebrow eyebrow" label={`${key} eyebrow`} value={s.eyebrow} onChange={edit(`${key}.eyebrow`)} />
          <EditableText
            as={isHero ? 'h1' : 'h2'}
            id={`case-${key}`}
            className={isHero ? 'case__title case__title--hero' : 'case__title'}
            label={`${key} title`}
            value={s.title}
            onChange={edit(`${key}.title`)}
          />
          {(s.body || import.meta.env.DEV) && (
            <EditableText className="case__body" label={`${key} body`} value={s.body} onChange={edit(`${key}.body`)} />
          )}
          {isHero && (
            <dl className="case__meta">
              {(['role', 'timeline', 'team'] as const).map((field) => (
                <div key={field}>
                  <dt className="eyebrow">{field}</dt>
                  <EditableText as="p" className="case__meta-value" label={field} value={hero[field]} onChange={edit(`hero.${field}`)} />
                </div>
              ))}
            </dl>
          )}
        </div>
        {hasVideo && <ProtoMedia media={s.media} />}
      </section>
    )
  }

  return (
    <main
      ref={mainRef}
      className="case"
      data-work={id}
      data-intro={intro || undefined}
      style={{ '--case-content': `${page.contentWidth}px`, '--case-text': `${page.textWidth}px` } as CSSProperties}
    >
      {id === 'unwind' && <UnwindIntro onDone={() => setIntro(false)} />}
      <div className="case__light" data-surface="light">
        <Nav route={id} />
        {page.showSidebar && (
          <aside className="case__sidebar" data-hidden={onDark || undefined} aria-label="Sections">
            <BackLink className="case__back" />
            <ol className="case__toc">
              {keys.map((key) => (
                <li key={key}>
                  <button type="button" aria-current={active === key ? 'true' : undefined} onClick={() => jump(key)}>
                    {all[key].eyebrow}
                  </button>
                </li>
              ))}
            </ol>
          </aside>
        )}
        {renderSection('hero', hero, true)}
        {keys.map((key) => renderSection(key, all[key]))}
      </div>
      <div className="case__dark" data-surface="dark">
        <ContactCta />
        <Footer />
      </div>
    </main>
  )
}
