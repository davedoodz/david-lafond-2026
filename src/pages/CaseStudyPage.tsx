import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type SyntheticEvent } from 'react'
import { ContactCta } from '../components/ContactCta'
import { EditableText } from '../components/EditableText'
import { Footer } from '../components/Footer'
import { BackLink, Nav } from '../components/Nav'
import type { Work } from '../data/works'
import { UnwindIntro } from '../features/unwindIntro/UnwindIntro'
import { ReselfFigure } from '../features/reselfDiagrams/ReselfFigure'
import { WristSequence, type WristFrame } from '../features/wristSequence/WristSequence'
import { useTuningController } from '../tuning/useTuning'
import type { DialConfig } from 'dialkit'
import { ECOFABRIQ_CONFIG, PROTO_VIDEOS, RECRUITER_COPY, UNWIND_CONFIG, type ProtoVideo } from './caseStudyContent'
import { CoreFlows, GuidedPair, StoryRow, type Flows, type Guided, type Story } from './caseStudyFlows'
import { PersonaSection, type Persona } from './casePersona'
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

/** Live watch-notification prototype (built from reself-voice-prototypes into public/work/unwind/notification). */
function NotificationDemo({ media }: { media: Media }) {
  // Same origin: hide the prototype's own DialKit panel and pull the explainer rail in so it fits beside the watch.
  const hidePanel = (e: SyntheticEvent<HTMLIFrameElement>) => {
    const doc = e.currentTarget.contentDocument
    if (!doc) return
    const style = doc.createElement('style')
    style.textContent = '.dialkit-panel,[class*="dialkit"]{display:none!important}html,body{background:transparent!important}.nx{width:300px}.nx[data-side=left]{right:calc(100% + 24px)}'
    doc.head.append(style)
  }
  return (
    <iframe
      className="case__notification"
      src="/work/unwind/notification/notification.html"
      title="Unwind watch notification prototype"
      loading="lazy"
      onLoad={hidePanel}
      style={{ '--media-h': `${media.size}svh`, '--media-x': `${media.x}%`, '--media-y': `${media.y}%`, '--media-radius': `${media.radius}px` } as CSSProperties}
    />
  )
}

/**
 * Hero Apple Watch: the notification prototype's watch screen (`?embed=watch`) in the Starlight
 * frame. Frame PNG is 540×860 with the screen cut-out at x 72, y 193, 396×479.
 */
function HeroWatch() {
  const hidePanel = (e: SyntheticEvent<HTMLIFrameElement>) => {
    const doc = e.currentTarget.contentDocument
    if (!doc) return
    const style = doc.createElement('style')
    style.textContent = '.dialkit-panel,[class*="dialkit"]{display:none!important}'
    doc.head.append(style)
  }
  return (
    <div className="case__watch" aria-hidden="true">
      <iframe src="/work/unwind/notification/notification.html?embed=watch" title="Unwind watch notification" tabIndex={-1} onLoad={hidePanel} />
      <img src="/work/unwind/watch/starlight.png" alt="" width={540} height={860} draggable={false} />
    </div>
  )
}

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

/**
 * Wrist sequence: 57 frames extracted from the watch video (1980×1044), scrubbed by scroll.
 * The display quad is marked on the first and last frames and interpolated between them.
 */
const WRIST_COUNT = 57
const SCREEN_FIRST: WristFrame['screen'] = [[830, 470], [960, 460], [990, 640], [860, 650]]
const SCREEN_LAST: WristFrame['screen'] = [[956, 379], [1073, 360], [1111, 530], [998, 549]]
const WRIST_FRAMES: WristFrame[] = Array.from({ length: WRIST_COUNT }, (_, k) => {
  const t = k / (WRIST_COUNT - 1)
  return {
    src: `/work/unwind/watch/sequence/frame-${String(k + 1).padStart(4, '0')}.webp`,
    width: 1980,
    height: 1044,
    screen: SCREEN_FIRST.map((p, i) => [p[0] + (SCREEN_LAST[i][0] - p[0]) * t, p[1] + (SCREEN_LAST[i][1] - p[1]) * t]) as WristFrame['screen'],
  }
})
type Hero = Section & { role: string; timeline: string; team: string }

/** Story sections (everything except page-level folders and the hero), in config order. */
const NON_SECTIONS = new Set(['page', 'hero', 'logos', 'heroSpacing', 'recruiter'])
const SECTION_KEYS = Object.fromEntries(
  Object.entries(PANELS).map(([k, p]) => [k, Object.keys(p.config).filter((s) => !NON_SECTIONS.has(s))]),
) as Record<keyof typeof PANELS, string[]>

type Arrangement = { order: string; max: number; keep: Record<string, string> }
type OrderDials = Arrangement & { section: string; swapWith: string; structure?: string; recruiter?: Arrangement }

/**
 * Alternative page structures. Each keeps its own order / max / keep (a `recruiter` subfolder), so
 * switching `structure` back to `current` restores the current page untouched. The copy for the
 * alternative lives in the Unwind panel's `recruiter` folder (RECRUITER_COPY) and overrides
 * the section copy only while that structure is active.
 */
const RECRUITER_ORDER = 'story, overview, persona, howItWorks, moment, notification, dynamic, flows, guided, tracking, context, system, outcomes'
const STRUCTURE_OPTIONS = [
  { value: 'current', label: 'current' },
  { value: 'recruiter', label: '8-part recruiter story' },
]
/** At most this many sections get their own screen; extra kept ones are hidden. */
const MAX_SECTIONS = 8
const mergeLabel = (k: string) => `add to ${k}`

/** What each section is called on the page (its eyebrow), so the panel names match what you see. */
const SPECIAL_LABELS: Record<string, string> = { story: 'Problem · Opportunity · Solution', persona: 'Persona' }
const SECTION_LABELS = Object.fromEntries(
  Object.entries(PANELS).map(([k, p]) => [
    k,
    Object.fromEntries(
      SECTION_KEYS[k as keyof typeof PANELS].map((s) => {
        const eyebrow = (p.config as Record<string, { eyebrow?: { default?: string } | string }>)[s]?.eyebrow
        const text = typeof eyebrow === 'string' ? eyebrow : eyebrow?.default
        // DialKit uses '.' as a path separator, so labels used as keys must not contain one.
        return [s, (SPECIAL_LABELS[s] ?? text ?? s).replace(/\./g, '')]
      }),
    ),
  ]),
) as Record<keyof typeof PANELS, Record<string, string>>

/** Section order panel: the order text is the source of truth; actions rewrite it. */
const ORDER_CONFIGS = Object.fromEntries(
  Object.entries(SECTION_KEYS).map(([k, keys]) => {
    const label = SECTION_LABELS[k as keyof typeof PANELS]
    const options = keys.map((s) => ({ value: s, label: label[s] }))
    const arrangement = (order: string, max: number) => ({
      /** Comma list of section keys, top to bottom. Missing keys are appended; unknown ones ignored. */
      order: { type: 'text' as const, default: order },
      max: [max, 1, keys.length, 1] as [number, number, number, number],
      /** Per section (named as on the page): keep, hide, or add its content to the end of another section. */
      keep: Object.fromEntries(
        keys.map((s) => [
          label[s],
          {
            type: 'select' as const,
            options: [
              { value: 'keep', label: 'keep' },
              { value: 'hide', label: 'hide' },
              ...keys.filter((o) => o !== s).map((o) => ({ value: mergeLabel(o), label: `add to ${label[o]}` })),
            ],
            default: 'keep',
          },
        ]),
      ),
    })
    return [
      k,
      {
        /** Which page structure to show; the move/swap/reset actions edit the active one. */
        ...(k === 'unwind' ? { structure: { type: 'select' as const, options: STRUCTURE_OPTIONS, default: 'current' } } : {}),
        section: { type: 'select' as const, options, default: keys[0] },
        up: { type: 'action' as const, label: 'Move up' },
        down: { type: 'action' as const, label: 'Move down' },
        top: { type: 'action' as const, label: 'Move to top' },
        bottom: { type: 'action' as const, label: 'Move to bottom' },
        swapWith: { type: 'select' as const, options, default: keys[1] ?? keys[0] },
        swap: { type: 'action' as const, label: 'Swap' },
        reset: { type: 'action' as const, label: 'Reset order' },
        ...arrangement(keys.join(', '), MAX_SECTIONS),
        ...(k === 'unwind' ? { recruiter: { ...arrangement(RECRUITER_ORDER, keys.length), _collapsed: true } } : {}),
      },
    ]
  }),
) as unknown as Record<keyof typeof PANELS, DialConfig>

/** Deep-merge copy overrides onto the section values (plain objects only). */
function mergeCopy<T extends object>(base: T, over: object | undefined): T {
  if (!over) return base
  const out = { ...base } as Record<string, unknown>
  for (const [k, v] of Object.entries(over)) {
    const b = out[k]
    out[k] = v && typeof v === 'object' && b && typeof b === 'object' ? mergeCopy(b as object, v) : v
  }
  return out as T
}
const hasPath = (cfg: object, path: string) =>
  path.split('.').reduce<unknown>((node, key) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined), cfg) !== undefined

function parseOrder(text: string | undefined, keys: string[]) {
  const seen = new Set<string>()
  for (const k of (text ?? '').split(/[\s,]+/)) if (keys.includes(k)) seen.add(k)
  for (const k of keys) seen.add(k)
  return [...seen]
}

/**
 * Resolve visibility: groups of [owner, ...merged] in page order. Merges into a hidden or
 * merged section fall back to hidden; only the first `max` kept sections get a screen.
 */
function resolveGroups(order: string[], keep: Record<string, string> | undefined, max: number, labels: Record<string, string>) {
  const mode = (k: string) => keep?.[labels[k]] ?? 'keep'
  const owners = order.filter((k) => mode(k) === 'keep').slice(0, max)
  return owners.map((owner) => [owner, ...order.filter((k) => mode(k) === mergeLabel(owner))])
}

/** One prototype recording: plays only while its section is on screen. */
function ProtoMedia({ media, eager = false }: { media: Media; eager?: boolean }) {
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
    // Hero: restart from the first frame the moment the intro hands over, so the welcome animation
    // begins exactly as the phone lands.
    const landed = new MutationObserver(() => {
      if (document.documentElement.dataset.introLanded === undefined || !video.closest('.case__section--hero')) return
      video.currentTime = 0
      void video.play().catch(() => {})
    })
    landed.observe(document.documentElement, { attributes: true, attributeFilter: ['data-intro-landed'] })
    return () => {
      observer.disconnect()
      landed.disconnect()
    }
  }, [name])
  const dims = PROTO_VIDEOS[name]
  if (!dims) return null
  return (
    <video
      ref={ref}
      key={name}
      className="case__media"
      src={`/work/unwind/${dims.dir}/${name}.mp4`}
      poster={`/work/unwind/${dims.dir}/${name}.webp`}
      muted
      loop
      playsInline
      preload={eager ? 'auto' : 'metadata'}
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
  const base = values as unknown as Record<string, Section> & { page: { snap: string; showSidebar: boolean; contentWidth: number; textWidth: number }; hero: Hero }
  const page = base.page
  const hero = base.hero
  // Unwind opens with the voice intro; the hero video stays hidden until it hands off.
  const [intro, setIntro] = useState(id === 'unwind')
  const allKeys = SECTION_KEYS[id]
  const orderPanel = useTuningController(`${panel.name} · order`, ORDER_CONFIGS[id], {
    onAction: (action) => {
      const o = orderPanel.values as unknown as OrderDials
      const rec = o.structure === 'recruiter'
      const at = rec ? 'recruiter.order' : 'order'
      const list = parseOrder(rec ? o.recruiter?.order : o.order, allKeys)
      const i = list.indexOf(o.section)
      if (action === 'reset') return orderPanel.setValue(at, rec ? RECRUITER_ORDER : allKeys.join(', '))
      if (i < 0) return
      const next = [...list]
      const move = (to: number) => {
        next.splice(i, 1)
        next.splice(Math.max(0, Math.min(next.length, to)), 0, o.section)
      }
      if (action === 'up') move(i - 1)
      else if (action === 'down') move(i + 1)
      else if (action === 'top') move(0)
      else if (action === 'bottom') move(next.length)
      else if (action === 'swap') {
        const j = list.indexOf(o.swapWith)
        if (j < 0) return
        ;[next[i], next[j]] = [next[j], next[i]]
      } else return
      followRef.current = o.section
      orderPanel.setValue(at, next.join(', '))
    },
  })
  const od = orderPanel.values as unknown as OrderDials
  const recruiter = id === 'unwind' && od.structure === 'recruiter'
  const arrangement: Arrangement = recruiter && od.recruiter ? od.recruiter : od
  const groups = resolveGroups(parseOrder(arrangement.order, allKeys), arrangement.keep, arrangement.max ?? MAX_SECTIONS, SECTION_LABELS[id])
  // Recruiter structure: its copy (Unwind panel › recruiter) overrides the section copy, and on-page edits save there.
  const all = (recruiter ? mergeCopy(base, (base as unknown as { recruiter: object }).recruiter) : base) as typeof base
  const keys = groups.map((g) => g[0])
  const orderSig = groups.map((g) => g.join('+')).join(',')
  // After a move/swap, bring the moved section on screen so the change is visible immediately.
  const followRef = useRef<string | null>(null)
  useLayoutEffect(() => {
    const key = followRef.current
    followRef.current = null
    if (!key) return
    document.querySelector<HTMLElement>(`[data-group="${key}"], [data-section="${key}"]`)?.scrollIntoView({ block: 'start' })
  }, [orderSig])
  const heroSpacing = (
    all as unknown as {
      heroSpacing?: { logosToTitle: number; titleToMeta: number; metaToPhone: number; phoneHeight: number; phoneScale: number; phoneY: number; devices: string; watchSize: number; devicesGap: number; devicesTop: number; watchY: number }
    }
  ).heroSpacing
  const logos = (all as unknown as { logos?: Logos }).logos

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
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const el = entry.target as HTMLElement
          setActive((el.closest('[data-group]') as HTMLElement | null)?.dataset.group ?? el.dataset.section!)
        }
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
  }, [orderSig])

  const jump = (key: string) => {
    const target = mainRef.current?.querySelector(`[data-section="${key}"]`)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  const edit = (path: string) => (next: string) => setValue(recruiter && hasPath(RECRUITER_COPY, path) ? `recruiter.${path}` : path, next)

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
    if (key === 'persona') return <PersonaSection key={key} p={s as unknown as Persona} edit={edit} />
    if (key === 'flows') return <CoreFlows key={key} f={s as unknown as Flows} edit={edit} />
    if (key === 'guided') return <GuidedPair key={key} g={s as unknown as Guided} edit={edit} />
    const hasDemo = s.media.figure === 'notification'
    const hasFigure = ['flow', 'system', 'vision', 'signals'].includes(s.media.figure)
    const hasVideo = !hasFigure && !hasDemo && s.media.video !== 'none'
    return (
      <section
        key={key}
        className={`case__section${isHero ? ' case__section--hero' : ''}`}
        data-section={key}
        data-layout={hasVideo || hasFigure || hasDemo ? s.media.layout : 'text'}
        style={
          {
            '--media-gap': `${s.media.gap}px`,
            ...(isHero && heroSpacing
              ? {
                  '--hero-logos-gap': `${heroSpacing.logosToTitle}px`,
                  '--hero-meta-gap': `${heroSpacing.titleToMeta}px`,
                  '--media-gap': `${heroSpacing.metaToPhone}px`,
                  '--hero-phone-h': `${heroSpacing.phoneHeight}svh`,
                  '--hero-phone-scale': heroSpacing.phoneScale,
                  '--hero-phone-y': `${heroSpacing.phoneY}px`,
                  '--hero-watch-size': heroSpacing.watchSize,
                  '--hero-devices-gap': `${heroSpacing.devicesGap}px`,
                  '--hero-watch-y': `${heroSpacing.watchY}svh`,
                  '--hero-devices-top': `${heroSpacing.devicesTop}svh`,
                }
              : {}),
          } as CSSProperties
        }
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
        {hasVideo &&
          (isHero && heroSpacing?.devices === 'watch + phone' ? (
            <div className="case__devices">
              <HeroWatch />
              <ProtoMedia media={s.media} eager />
            </div>
          ) : (
            <ProtoMedia media={s.media} eager={isHero} />
          ))}
        {isHero && logos?.show && (logos.placement === 'top right' || logos.placement === 'bottom') && <LogoRow l={logos} />}
        {hasDemo && <NotificationDemo media={s.media} />}
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
      {id === 'unwind' && <UnwindIntro onDone={() => setIntro(false)} onStart={() => setIntro(true)} />}
      <div className="case__light" data-surface="light">
        <Nav route={id} />
        {page.showSidebar && (
          <aside className="case__sidebar" data-hidden={onDark || active === 'moment' || undefined} aria-label="Sections">
            <BackLink className="case__back" />
            <ol className="case__toc">
              {keys.map((key) => (
                <li key={key}>
                  <button type="button" aria-current={active === key ? 'true' : undefined} onClick={() => jump(key)}>
                    {key === 'story' ? (recruiter ? 'Problem · Opportunity' : 'Problem · Solution') : key === 'persona' && !recruiter ? 'Persona' : all[key].eyebrow}
                  </button>
                </li>
              ))}
            </ol>
          </aside>
        )}
        {renderSection('hero', hero, true)}
        {groups.map((g) =>
          g.length === 1 ? (
            renderSection(g[0], all[g[0]])
          ) : (
            <div key={g[0]} className="case__group" data-group={g[0]}>
              {g.map((key) => renderSection(key, all[key]))}
            </div>
          ),
        )}
      </div>
      <div className="case__dark" data-surface="dark">
        <ContactCta />
        <Footer />
      </div>
    </main>
  )
}
