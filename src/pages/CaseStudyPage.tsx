import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { ContactCta } from '../components/ContactCta'
import { EditableText } from '../components/EditableText'
import { Footer } from '../components/Footer'
import { BackLink, Nav } from '../components/Nav'
import type { Work } from '../data/works'
import { UnwindIntro } from '../features/unwindIntro/UnwindIntro'
import { ReselfFigure } from '../features/reselfDiagrams/ReselfFigure'
import { WristSequence, type WristFrame } from '../features/wristSequence/WristSequence'
import { useTuningController } from '../tuning/useTuning'
import { ECOFABRIQ_CONFIG, PROTO_VIDEOS, UNWIND_CONFIG, type ProtoVideo } from './caseStudyContent'
import { CoreFlows, GuidedPair, StoryRow, type Flows, type Guided, type Story } from './caseStudyFlows'
import { PrototypeMomo, type PrototypeMomoValues } from './PrototypeMomo'
import './CaseStudyPage.css'

type Id = Extract<Work['id'], 'unwind' | 'ecofabriq'>
type Props = { id: Id }

const PANELS = {
  unwind: { name: 'Unwind case study', config: UNWIND_CONFIG },
  ecofabriq: { name: 'EcoFabriq case study', config: ECOFABRIQ_CONFIG },
} as const

type Media = { video: string; figure: string; layout: string; size: number; gap: number; x: number; y: number; radius: number }
type Logos = { show: boolean; placement: string; height: number; gap: number; offset: number; x: number; y: number; opacity: number; harvardScale: number }

const LOGOS = [
  { src: '/work/unwind/logos/media-lab.svg', alt: 'MIT Media Lab', harvard: false },
  { src: '/work/unwind/logos/fluid-interfaces.svg', alt: 'Fluid Interfaces', harvard: false },
  { src: '/work/unwind/logos/multisensory-intelligence.svg', alt: 'Multisensory Intelligence', harvard: false },
  { src: '/work/unwind/logos/harvard-medical-school.svg', alt: 'Harvard Medical School', harvard: true },
]

/** Partner logo row for the hero; placement and size come from the "logos" dials. */
function LogoRow({ l }: { l: Logos }) {
  return (
    <div
      className="case__logos"
      data-placement={l.placement}
      style={{ '--logo-h': `${l.height}px`, '--logo-gap': `${l.gap}px`, '--logo-offset': `${l.offset}px`, '--logo-x': `${l.x}px`, '--logo-y': `${l.y}px`, opacity: l.opacity } as CSSProperties}
    >
      {LOGOS.map((logo) => (
        <img key={logo.src} src={logo.src} alt={logo.alt} style={{ height: logo.harvard ? `calc(var(--logo-h) * ${l.harvardScale})` : 'var(--logo-h)' }} />
      ))}
    </div>
  )
}
type Section = { eyebrow: string; title: string; body: string; media: Media }
type Moment = { eyebrow: string; captionDetect: string; captionNotify: string; captionFocus: string; height: number; zoom: number; drift: number; showScreen: boolean }

/** Full-resolution source frames; display tracking is kept separately in watchTracking.ts. */
const WRIST_FRAMES: WristFrame[] = Array.from({ length: 57 }, (_, k) => ({
  src: `/work/unwind/watch/sequence/frame-${String(k + 1).padStart(4, '0')}.webp`,
  width: 1980,
  height: 1044,
}))
type Hero = Section & { role: string; timeline: string; team: string }

/** One prototype recording: plays only while its section is on screen. */
function ProtoMedia({ media, momoId, momo }: { media: Media; momoId?: string; momo?: PrototypeMomoValues }) {
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
    <div
      className="case__media-stage"
      style={
        {
          '--media-h': `${media.size}svh`,
          '--media-ratio': `${dims.w} / ${dims.h}`,
          '--media-x': `${media.x}%`,
          '--media-y': `${media.y}%`,
          '--media-radius': `${media.radius}px`,
        } as CSSProperties
      }
    >
      <video
        ref={ref}
        key={name}
        className="case__media"
        src={`/work/unwind/${dims.dir}/${name}.mp4`}
        poster={`/work/unwind/${dims.dir}/${name}.webp`}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />
      {momoId && momo && <PrototypeMomo id={momoId} values={momo} mode={momoId === 'voice' || momoId === 'dynamic' ? 'awake' : 'asleep'} />}
    </div>
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
  const all = values as unknown as Record<string, Section> & {
    page: { snap: string; showSidebar: boolean; contentWidth: number; textWidth: number }
    hero: Hero
    logos?: Logos
    prototypeMomo?: Record<string, PrototypeMomoValues>
  }
  const page = all.page
  const hero = all.hero
  const prototypeMomo = all.prototypeMomo
  // Unwind opens with the voice intro; the hero video stays hidden until it hands off.
  const [intro, setIntro] = useState(id === 'unwind')
  const keys = Object.keys(panel.config).filter((k) => !['page', 'hero', 'logos', 'prototypeMomo'].includes(k))
  const logos = all.logos

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

  const renderMoment = (key: string, m: Moment) => (
    <WristSequence
      key={key}
      data-section={key}
      className="case__moment"
      frames={WRIST_FRAMES}
      heightVh={m.height}
      zoom={m.zoom}
      drift={m.drift}
      showScreen={m.showScreen}
      glass={
        <div className="case__moment-captions" aria-live="off">
          <p className="case__moment-eyebrow eyebrow">{m.eyebrow}</p>
          <p data-at="detect">{m.captionDetect}</p>
          <p data-at="notify">{m.captionNotify}</p>
          <p data-at="focus">{m.captionFocus}</p>
        </div>
      }
    />
  )

  const renderSection = (key: string, s: Section, isHero = false) => {
    if (key === 'moment') return renderMoment(key, s as unknown as Moment)
    if (key === 'story') return <StoryRow key={key} s={s as unknown as Story} edit={edit} />
    if (key === 'flows') return <CoreFlows key={key} f={s as unknown as Flows} edit={edit} momo={prototypeMomo} />
    if (key === 'guided') return <GuidedPair key={key} g={s as unknown as Guided} edit={edit} momo={prototypeMomo} />
    const hasFigure = ['flow', 'system', 'vision', 'signals'].includes(s.media.figure)
    const hasVideo = !hasFigure && s.media.video !== 'none'
    return (
      <section
        key={key}
        className={`case__section${isHero ? ' case__section--hero' : ''}`}
        data-section={key}
        data-layout={hasVideo || hasFigure ? s.media.layout : 'text'}
        style={{ '--media-gap': `${s.media.gap}px` } as CSSProperties}
        aria-labelledby={`case-${key}`}
      >
        <div className="case__text">
          {isHero && <BackLink className="case__back case__back--inline" />}
          {isHero && logos?.show && logos.placement === 'above title' && <LogoRow l={logos} />}
          {isHero && logos?.show && logos.placement === 'eyebrow' ? (
            <LogoRow l={logos} />
          ) : (
            <EditableText className="case__eyebrow eyebrow" label={`${key} eyebrow`} value={s.eyebrow} onChange={edit(`${key}.eyebrow`)} />
          )}
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
          {isHero && logos?.show && logos.placement === 'below meta' && <LogoRow l={logos} />}
        </div>
        {hasVideo && (
          <ProtoMedia
            media={s.media}
            momoId={id === 'unwind' ? (isHero ? 'hero' : key === 'dynamic' || key === 'tracking' ? key : undefined) : undefined}
            momo={id === 'unwind' ? prototypeMomo?.[isHero ? 'hero' : key] : undefined}
          />
        )}
        {isHero && logos?.show && (logos.placement === 'top right' || logos.placement === 'bottom') && <LogoRow l={logos} />}
        {hasFigure && <ReselfFigure kind={s.media.figure as 'flow' | 'system' | 'vision' | 'signals'} />}
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
          <aside className="case__sidebar" data-hidden={onDark || active === 'moment' || undefined} aria-label="Sections">
            <BackLink className="case__back" />
            <ol className="case__toc">
              {keys.map((key) => (
                <li key={key}>
                  <button type="button" aria-current={active === key ? 'true' : undefined} onClick={() => jump(key)}>
                    {key === 'story' ? 'Problem · Solution' : all[key].eyebrow}
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
