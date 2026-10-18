import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type SyntheticEvent } from 'react'
import { ContactCta } from '../components/ContactCta'
import { EditableText } from '../components/EditableText'
import { Footer } from '../components/Footer'
import { BackLink, Nav } from '../components/Nav'
import type { Work } from '../data/works'
import { MOMO_BRAID_LAYOUT_EVENT, MomoIntro } from '../features/momoIntro/MomoIntro'
import { MomoWelcome } from '../features/momoIntro/MomoWelcome'
import { ReselfFigure } from '../features/reselfDiagrams/ReselfFigure'
import { ArxivPaper } from '../features/arxivPaper/ArxivPaper'
import { FiloMilestones } from '../features/filoCase/FiloMilestones'
import { FiloPersonaLoop } from '../features/filoCase/FiloPersonaLoop'
import { FiloQuoteArt } from '../features/filoCase/FiloQuoteArt'
import { MomoSystemFigure } from '../features/momoSystem/MomoSystemFigure'
import { WristSequence, type WristFrame } from '../features/wristSequence/WristSequence'
import { useTuningController } from '../tuning/useTuning'
import type { DialConfig } from 'dialkit'
import { FILO_CONFIG, PROTO_VIDEOS, RECRUITER_COPY, MOMO_CONFIG, type ProtoVideo, type SectionSpacing, type TextReveal } from './caseStudyContent'
import { CoreFlows, GuidedPair, StoryRow, type Flows, type Guided, type Story } from './caseStudyFlows'
import { PersonaSection, QuoteMarquee, type Persona } from './casePersona'
import { DeviceInsights } from './DeviceInsights'
import { FiloStory, type FiloStorySettings } from './filoStoryArt'
import { FiloFilms } from '../features/filoCase/FiloFilms'
import { FiloSourceSteps } from '../features/filoCase/FiloSourceSteps'
import type { FilmGroup } from '../features/filoCase/filoFilmPlan'
import { FiloNext } from '../features/filoCase/FiloNext'
import { FiloResearchFigure, type FiloResearchSettings } from '../features/filoCase/FiloResearch'
import './CaseStudyPage.css'


type Id = Extract<Work['id'], 'momo' | 'filo'>
type Props = { id: Id }

const PANELS = {
  momo: { name: 'Momo case study', config: MOMO_CONFIG },
  filo: { name: 'Filo case study', config: FILO_CONFIG },
} as const

type Media = { video: string; placeholder?: string; figure: string; layout: string; size: number; x: number; y: number; radius: number }
type Logos = { show: boolean; placement: string; height: number; gap: number; offset: number; x: number; opacity: number; hoverColor: string; hoverOpacity: number; harvardScale: number }

/** `scale` evens out optical size between marks; Harvard's follows the harvardScale dial. */
const LOGOS: Record<Id, { src: string; alt: string; href: string; harvard?: boolean; scale?: number }[]> = {
  momo: [
    { src: '/work/momo/logos/media-lab.svg', alt: 'MIT Media Lab', href: 'https://www.media.mit.edu/' },
    { src: '/work/momo/logos/fluid-interfaces.svg', alt: 'Fluid Interfaces', href: 'https://www.media.mit.edu/groups/fluid-interfaces/overview/' },
    { src: '/work/momo/logos/multisensory-intelligence.svg', alt: 'Multisensory Intelligence', href: 'https://www.media.mit.edu/groups/multisensory-intelligence/overview/' },
    { src: '/work/momo/logos/harvard-medical-school.svg', alt: 'Harvard Medical School', href: 'https://hms.harvard.edu/', harvard: true },
  ],
  filo: [
    { src: '/work/filo/logos/mit-designx.svg', alt: 'MIT DesignX', href: 'https://designx.mit.edu/', scale: 1.2 },
    { src: '/work/filo/logos/polimi.svg', alt: 'Politecnico di Milano', href: 'https://www.polimi.it/', scale: 0.8 },
    { src: '/work/filo/logos/arts-at-mit.svg', alt: 'Arts at MIT', href: 'https://arts.mit.edu/', scale: 1.05 },
  ],
}

/** Live watch-notification prototype (built from reself-voice-prototypes into public/work/momo/notification). */
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
      src="/work/momo/notification/notification.html"
      title="Momo watch notification prototype"
      loading="lazy"
      onLoad={hidePanel}
      style={{ '--media-h': `${media.size}svh`, '--media-x': `${media.x}%`, '--media-y': `${media.y}%`, '--media-radius': `${media.radius}px` } as CSSProperties}
    />
  )
}

/** feColorMatrix that maps black to `hex` and white to white, keeping alpha, so antialiased edges tint too. */
function tintMatrix(hex: string) {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16)
  return [n >> 16, (n >> 8) & 255, n & 255]
    .map((v) => { const c = v / 255, k = 1 - c; return `${k * 0.2126} ${k * 0.7152} ${k * 0.0722} 0 ${c}` })
    .concat('0 0 0 1 0')
    .join(' ')
}

/** Partner logo row for the hero; placement and size come from the "logos" dials. */
function LogoRow({ l, id }: { l: Logos; id: Id }) {
  const tint = `case-logo-tint-${id}`
  return (
    <div
      className="case__logos"
      data-placement={l.placement}
      style={{ '--logo-h': `${l.height}px`, '--logo-gap': `${l.gap}px`, '--logo-offset': `${l.offset}px`, '--logo-x': `${l.x}px`, '--logo-hover-color': l.hoverColor, '--logo-hover-opacity': l.hoverOpacity, '--logo-opacity': l.opacity, '--logo-tint': `url(#${tint})` } as CSSProperties}
    >
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
        <filter id={tint} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={tintMatrix(l.hoverColor)} />
        </filter>
      </svg>
      {LOGOS[id].map((logo) => (
        <a
          key={logo.src}
          href={logo.href}
          target="_blank"
          rel="noreferrer"
          aria-label={`Visit ${logo.alt} website (opens in a new tab)`}
          style={{ '--logo-src': `url("${logo.src}")` } as CSSProperties}
        >
          <img src={logo.src} alt="" style={{ height: `calc(var(--logo-h) * ${logo.harvard ? l.harvardScale : (logo.scale ?? 1)})` }} />
        </a>
      ))}
    </div>
  )
}
type Section = { eyebrow: string; title: string; body: string; align: 'left' | 'center'; spacing: SectionSpacing; media: Media; textReveal?: TextReveal }
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
    src: `/work/momo/watch/sequence/frame-${String(k + 1).padStart(4, '0')}.webp`,
    width: 1980,
    height: 1044,
    screen: SCREEN_FIRST.map((p, i) => [p[0] + (SCREEN_LAST[i][0] - p[0]) * t, p[1] + (SCREEN_LAST[i][1] - p[1]) * t]) as WristFrame['screen'],
  }
})
type HeroField = 'role' | 'timeline' | 'extra' | 'team'
type Hero = Section & Record<HeroField | `${HeroField}Label`, string>
/** Filo's hero hang-tag dials (FILO_CONFIG.heroTag); Momo has none. */
type HeroTag = { scale: number; x: number; y: number }
const isHeroTag = (v: unknown): v is HeroTag =>
  !!v && typeof v === 'object' &&
  'scale' in v && typeof v.scale === 'number' &&
  'x' in v && typeof v.x === 'number' &&
  'y' in v && typeof v.y === 'number'

/** The persona's interview quotes (`persona.moments.m{n}Quote` / `m{n}Role`) and its float pace. */
type QuoteCopy = { moments: Record<string, string>; float?: { pace: number } }
const isQuoteCopy = (v: unknown): v is QuoteCopy =>
  !!v && typeof v === 'object' && 'moments' in v && !!v.moments && typeof v.moments === 'object'

/** Story sections (everything except page-level folders and the hero), in config order. */
const NON_SECTIONS = new Set(['page', 'hero', 'logos', 'heroSpacing', 'heroTag', 'recruiter', 'mark'])
const SECTION_KEYS = Object.fromEntries(
  Object.entries(PANELS).map(([k, p]) => [k, Object.keys(p.config).filter((s) => !NON_SECTIONS.has(s))]),
) as Record<keyof typeof PANELS, string[]>

type Arrangement = { order: string; max: number; keep: Record<string, string> }
type OrderDials = Arrangement & { section: string; swapWith: string; structure?: string; recruiter?: Arrangement }

/**
 * Alternative page structures. Each keeps its own order / max / keep (a `recruiter` subfolder), so
 * switching `structure` back to `current` restores the current page untouched. The copy for the
 * alternative lives in the Momo panel's `recruiter` folder (RECRUITER_COPY) and overrides
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
        return [s, (k === 'filo' && s === 'story' ? 'Market gap · Opportunity · Solution' : SPECIAL_LABELS[s] ?? text ?? s).replace(/\./g, '')]
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
        ...(k === 'momo' ? { structure: { type: 'select' as const, options: STRUCTURE_OPTIONS, default: 'current' } } : {}),
        section: { type: 'select' as const, options, default: keys[0] },
        up: { type: 'action' as const, label: 'Move up' },
        down: { type: 'action' as const, label: 'Move down' },
        top: { type: 'action' as const, label: 'Move to top' },
        bottom: { type: 'action' as const, label: 'Move to bottom' },
        swapWith: { type: 'select' as const, options, default: keys[1] ?? keys[0] },
        swap: { type: 'action' as const, label: 'Swap' },
        reset: { type: 'action' as const, label: 'Reset order' },
        // Momo caps at 8 screens; Filo shows every section.
        ...arrangement(keys.join(', '), k === 'momo' ? MAX_SECTIONS : keys.length),
        ...(k === 'momo' ? { recruiter: { ...arrangement(RECRUITER_ORDER, keys.length), _collapsed: true } } : {}),
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
    return () => observer.disconnect()
  }, [name])
  const dims = PROTO_VIDEOS[name]
  if (!dims) return null
  return (
    <video
      ref={ref}
      key={name}
      className="case__media"
      src={`/work/momo/${dims.dir}/${name}.mp4`}
      poster={`/work/momo/${dims.dir}/${name}.webp`}
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
 * Case-study page (Momo, Filo): Apple-style storytelling. Each section is
 * one full-screen mandatory snap stop pairing a few lines of copy with a
 * prototype recording. A sticky sidebar lists the sections (their eyebrows) and
 * tracks the one in view. All copy is editable on the page in dev.
 */
export function CaseStudyPage({ id }: Props) {
  const panel = PANELS[id]
  const { values, setValue } = useTuningController(panel.name, panel.config)
  const base = values as unknown as Record<string, Section> & {
    page: {
      snap: string
      showSidebar: boolean
      showSections: boolean
      textSize: 'compact' | 'balanced' | 'display'
      sectionReveal: 'float up' | 'drift in' | 'float from sides' | 'soft bloom' | 'still'
      contentWidth: number
      textWidth: number
    }
    hero: Hero
  }
  const page = base.page
  const hero = base.hero
  const metaFields: HeroField[] = hero.extra || hero.extraLabel ? ['role', 'timeline', 'extra', 'team'] : ['role', 'timeline', 'team']
  // True while the Momo voice story plays on the stage above the hero.
  const [intro, setIntro] = useState(id === 'momo')
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
  const recruiter = id === 'momo' && od.structure === 'recruiter'
  const arrangement: Arrangement = recruiter && od.recruiter ? od.recruiter : od
  const groups = resolveGroups(parseOrder(arrangement.order, allKeys), arrangement.keep, arrangement.max ?? MAX_SECTIONS, SECTION_LABELS[id])
  // Recruiter structure: its copy (Momo panel › recruiter) overrides the section copy, and on-page edits save there.
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
      heroSpacing?: { logosToTitle: number; titleToMeta: number; metaToPhone: number; y: { braid: number; title: number; meta: number; logos: number; phone: number } }
    }
  ).heroSpacing
  const logos = (all as unknown as { logos?: Logos }).logos
  const mark = (all as unknown as { mark?: { show: boolean; logo: 'Loop f' | 'Tall l'; x: number; y: number; scale: number } }).mark
  const rawTag: unknown = all.heroTag
  const heroTag = isHeroTag(rawTag) ? rawTag : undefined
  // The intro draws the braid on a fixed canvas and caches the slot coordinates.
  // A translated slot does not trigger ResizeObserver, so tell it to remeasure after this dial moves.
  useLayoutEffect(() => {
    if (id === 'momo') window.dispatchEvent(new Event(MOMO_BRAID_LAYOUT_EVENT))
  }, [id, heroSpacing?.y.braid])

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
    // Reveal: play once 18% of a section (or half the screen, for very tall ones) is in view. Once a
    // section is fully off screen, rebuild its reveal paused on frame one ('armed'), so a return
    // never shows the settled section before it replays. Reduced motion never arms (CSS shows it still).
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement
          const state = el.dataset.revealLive
          const shown = entry.intersectionRatio >= 0.18 || entry.intersectionRect.height >= (entry.rootBounds?.height ?? Infinity) / 2
          // First report for a section already partly on screen: play now rather than hide it.
          if (state !== 'true' && (shown || (state === undefined && entry.isIntersecting))) el.dataset.revealLive = 'true'
          else if (!entry.isIntersecting && !reduce && state !== 'armed') {
            delete el.dataset.revealLive
            void el.offsetWidth
            el.dataset.revealLive = 'armed'
          }
        }
      },
      { threshold: [0, 0.05, 0.1, 0.18] },
    )
    sections.forEach((s) => {
      observer.observe(s)
      revealObserver.observe(s)
    })
    // Text blocks inside tall sections (Filo story chapters, primary research) reveal on their own entry.
    main.querySelectorAll<HTMLElement>('[data-text-block]').forEach((b) => revealObserver.observe(b))
    const dark = main.querySelector('.case__dark')
    const darkObserver = new IntersectionObserver(([entry]) => setOnDark(entry.isIntersecting), { rootMargin: '0px 0px -60% 0px' })
    if (dark) darkObserver.observe(dark)
    return () => {
      observer.disconnect()
      revealObserver.disconnect()
      darkObserver.disconnect()
    }
  }, [orderSig])

  const jump = (key: string) => {
    const target = mainRef.current?.querySelector(`[data-section="${key}"]`)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  const edit = (path: string) => (next: string) => setValue(recruiter && hasPath(RECRUITER_COPY, path) ? `recruiter.${path}` : path, next)

  /** Filo: the persona's four interview quotes as a sliding carousel under the primary-research video.
      Same copy and illustrations as the persona cards; on-page edits save to `persona.moments`. */
  const researchQuotes = () => {
    const raw: unknown = all.persona
    if (!isQuoteCopy(raw)) return undefined
    const m = raw.moments
    const count = Object.keys(m).filter((k) => /^m\d+Quote$/.test(k)).length
    const line = (i: number, field: 'Quote' | 'Role', copy: boolean) => {
      const key = `m${i + 1}${field}`
      const className = field === 'Quote' ? 'persona__quote' : 'persona__role'
      return copy ? (
        <p className={className}>{m[key]}</p>
      ) : (
        <EditableText as="p" className={className} label={`Interview quote ${i + 1}${field === 'Role' ? ' role' : ''}`} value={m[key]} onChange={edit(`persona.moments.${key}`)} />
      )
    }
    return (
      <QuoteMarquee
        count={count}
        loop={(raw.float?.pace ?? 4.9) * count * 2.5}
        label="What industry experts told us"
        render={(i, copy) => (
          <>
            <FiloQuoteArt index={i} />
            {line(i, 'Quote', copy)}
            {line(i, 'Role', copy)}
          </>
        )}
      />
    )
  }

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
    if (key === 'dynamic') return <DeviceInsights key={key} copy={s} edit={edit} />
    if (key === 'story')
      return id === 'filo'
        ? <FiloStory key={key} s={s as unknown as FiloStorySettings} edit={edit} />
        : <StoryRow key={key} s={s as unknown as Story} edit={edit} selectable />
    const filo = id === 'filo'
    if (key === 'persona')
      return (
        <PersonaSection
          key={key}
          p={s as unknown as Persona}
          edit={edit}
          selectable={!filo}
          visual={filo ? <FiloPersonaLoop alt="A technical designer at her desk calls a supplier, sketches, sews a sample, checks a swatch and types up the result" /> : undefined}
          quoteArt={filo ? (i) => <FiloQuoteArt index={i} /> : undefined}
        />
      )
    if (filo && key === 'source') return <FiloSourceSteps key={key} spacing={s.spacing} />
    const hasFilms = filo && ['evidence', 'scale', 'handoff'].includes(key)
    if (key === 'flows') return <CoreFlows key={key} f={s as unknown as Flows} edit={edit} selectable />
    if (key === 'guided') return <GuidedPair key={key} g={s as unknown as Guided} edit={edit} selectable />
    const hasDemo = s.media.figure === 'notification'
    const hasFigure = ['flow', 'system', 'vision', 'signals', 'paper', 'research', 'next'].includes(s.media.figure)
    const hasVideo = !hasFilms && !hasFigure && !hasDemo && s.media.video !== 'none'
    return (
      <section
        key={key}
        className={`case__section${isHero ? ' case__section--hero' : hasFilms ? ' filo-film-section' : ''}`}
        data-section={key}
        data-layout={isHero || hasFilms || hasVideo || hasFigure || hasDemo ? s.media.layout : 'text'}
        data-copy-align={s.align}
        data-text-reveal={s.textReveal?.preset}
        style={
          {
            '--section-pad-top': `${s.spacing.top}px`,
            '--section-pad-bottom': `${s.spacing.bottom}px`,
            '--section-content-gap': `${s.spacing.contentGap}px`,
            ...(s.textReveal
              ? {
                  '--text-reveal-duration': `${s.textReveal.duration}s`,
                  '--text-reveal-stagger': `${s.textReveal.stagger}s`,
                }
              : {}),
            ...(isHero && heroSpacing
              ? {
                  '--hero-logos-gap': `${heroSpacing.logosToTitle}px`,
                  '--hero-meta-gap': `${heroSpacing.titleToMeta}px`,
                  '--section-content-gap': `${heroSpacing.metaToPhone}px`,
                  '--hero-braid-y': `${heroSpacing.y.braid}px`,
                  '--hero-title-y': `${heroSpacing.y.title}px`,
                  '--hero-meta-y': `${heroSpacing.y.meta}px`,
                  '--hero-phone-y': `${heroSpacing.y.phone ?? 0}px`,
                  '--logo-y': `${heroSpacing.y.logos}px`,
                }
              : {}),
          } as CSSProperties
        }
        aria-labelledby={`case-${key}`}
      >
        <div className={`case__text${isHero ? '' : ' case__section-copy'}`}>
          {isHero && <BackLink className="case__back case__back--inline" />}
          {isHero && logos?.show && logos.placement === 'above title' && <LogoRow l={logos} id={id} />}
          {isHero && mark?.show && (
            <img
              className="case__hero-mark"
              src={mark.logo === 'Tall l' ? '/work/filo/filo-mark-2.webp' : '/work/filo/filo-mark.webp'}
              alt=""
              width={mark.logo === 'Tall l' ? 1090 : 990}
              height={mark.logo === 'Tall l' ? 564 : 466}
              style={{ '--mark-x': `${mark.x}px`, '--mark-y': `${mark.y}px`, '--mark-scale': mark.scale } as CSSProperties}
            />
          )}
          {isHero && logos?.show && logos.placement === 'eyebrow' ? (
            <LogoRow l={logos} id={id} />
          ) : isHero && id === 'momo' ? (
            // The intro's braided voice band is drawn here (by MomoIntro's canvas) in place of the eyebrow.
            // MomoIntro enables it once the film can replay: hovering swells the band and shows the pill.
            <button type="button" className="case__braid-slot" aria-label="Replay intro" aria-hidden="true" disabled>
              <span className="case__braid-hint" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                Replay intro
              </span>
            </button>
          ) : isHero && mark?.show && !s.eyebrow ? null : (
            // Under the Filo mark an empty eyebrow renders nothing: in dev an empty editable still takes a
            // line (production collapses it), which made dev and the live hero space differently.
            <EditableText className="case__eyebrow eyebrow" label={`${key} eyebrow`} value={s.eyebrow} onChange={edit(`${key}.eyebrow`)} />
          )}
          <EditableText
            as={isHero ? 'h1' : 'h2'}
            id={`case-${key}`}
            className={isHero ? 'case__title case__title--hero' : 'case__title'}
            label={`${key} title`}
            value={s.title}
            onChange={edit(`${key}.title`)}
            selectable={id === 'momo' && key === 'outcomes'}
          />
          {(s.body || import.meta.env.DEV) && (
            <EditableText className="case__body" label={`${key} body`} value={s.body} onChange={edit(`${key}.body`)} selectable={id === 'momo' && key === 'outcomes'} />
          )}
          {isHero && (
            <dl className="case__meta" style={{ '--meta-cols': metaFields.length } as CSSProperties}>
              {metaFields.map((field) => (
                <div key={field}>
                  <dt className="eyebrow">
                    <EditableText as="span" label={`${field} eyebrow`} value={hero[`${field}Label`]} onChange={edit(`hero.${field}Label`)} />
                  </dt>
                  <EditableText as="p" className="case__meta-value" label={field} value={hero[field]} onChange={edit(`hero.${field}`)} />
                </div>
              ))}
            </dl>
          )}
          {isHero && logos?.show && logos.placement === 'below meta' && <LogoRow l={logos} id={id} />}
        </div>
        {isHero ? (
          <div className="case__devices">
            {id === 'momo' ? (
              <MomoWelcome active={!intro} />
            ) : (
              <img
                className="filo-hero-tag"
                style={heroTag && ({ '--tag-scale': heroTag.scale, '--tag-x': `${heroTag.x}px`, '--tag-y': `${heroTag.y}px` } as CSSProperties)}
                src="/work/filo/hero-tag.webp"
                width={1024}
                height={1536}
                alt="A recycled-paper Filo hang tag embossed with an infinity mark, on a copper cord."
                fetchPriority="high"
              />
            )}
          </div>
        ) : hasFilms ? <FiloFilms group={key as FilmGroup} /> : hasVideo ? <ProtoMedia media={s.media} eager={isHero} /> : null}
        {isHero && logos?.show && (logos.placement === 'top right' || logos.placement === 'bottom') && <LogoRow l={logos} id={id} />}
        {hasDemo && <NotificationDemo media={s.media} />}
        {hasFigure &&
          (s.media.figure === 'system' ? (
            <MomoSystemFigure />
          ) : s.media.figure === 'research' ? (
            <FiloResearchFigure
              settings={s as unknown as FiloResearchSettings}
              quotes={id === 'filo' ? researchQuotes() : undefined}
            />
          ) : s.media.figure === 'next' ? (
            <FiloNext />
          ) : s.media.figure === 'paper' ? (
            <ArxivPaper />
          ) : (
            <ReselfFigure kind={s.media.figure as 'flow' | 'vision' | 'signals'} />
          ))}
      </section>
    )
  }

  return (
    <main
      ref={mainRef}
      className="case"
      data-work={id}
      data-intro={intro || undefined}
      data-text-size={page.textSize}
      data-section-reveal={page.sectionReveal}
      style={{ '--case-content': `${page.contentWidth}px`, '--case-text': `${page.textWidth}px` } as CSSProperties}
    >
      {id === 'momo' && <MomoIntro onDone={() => setIntro(false)} onStart={() => setIntro(true)} />}
      <div className="case__light" data-surface="light">
        <Nav route={id} />
        {page.showSidebar && (
          <aside className="case__sidebar" data-hidden={onDark || active === 'moment' || undefined} aria-label="Sections">
            <BackLink className="case__back" />
            {page.showSections && (
              <ol className="case__toc">
                {keys.map((key) => (
                  <li key={key}>
                    <button type="button" aria-current={active === key ? 'true' : undefined} onClick={() => jump(key)}>
                      {key === 'story' ? (id === 'filo' ? 'Problem · Proposal' : recruiter ? 'Problem · Opportunity' : 'Problem · Solution') : key === 'persona' && !recruiter ? 'Persona' : all[key].eyebrow}
                    </button>
                  </li>
                ))}
              </ol>
            )}
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
        {id === 'filo' && <FiloMilestones />}
      </div>
      <div className="case__dark" data-surface="dark">
        <ContactCta />
        <Footer />
      </div>
    </main>
  )
}
