/**
 * Shared case-study persona: identity, traits, then the key contexts. With `float` dials
 * (Momo) the contexts become cards that appear around the portrait; otherwise they render
 * as a list (Filo). Icons follow the Re:Self language: ink line work, Momo blue accents.
 * Only `.pa-b` moves.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Brain, Briefcase, Building2, CalendarDays, CalendarCheck, MessageCircle, RefreshCw, RotateCcw, Sparkles, Watch, type LucideIcon } from 'lucide-react'
import { EditableText } from '../components/EditableText'
import type { SectionSpacing } from './caseStudyContent'

type Tuple = [number, number, number, number]
type Edit = (path: string) => (next: string) => void
const text = (d: string) => ({ type: 'text' as const, default: d })

const PROFILE_TAG_ICONS: LucideIcon[] = [CalendarDays, Briefcase, Watch, Brain, Sparkles, Building2]
const FLOAT_TAG_ICONS: LucideIcon[] = [MessageCircle, RotateCcw, RefreshCw, CalendarCheck]

export const PERSONA_DIALS = {
  eyebrow: text('User persona'),
  title: text('The high-functioning overthinker.'),
  body: text(
    'Generally independent and capable, but prone to stress, rumination and replaying difficult moments. They want a private, low-friction outlet when no one is immediately available to talk to.',
  ),
  align: { type: 'select' as const, options: ['left', 'center'], default: 'left' },
  /** Comma-separated. */
  tags: text('20s – 30s, Works or studies, Uses a smartwatch, Values mental fitness, Open to AI tools, Urban lifestyle'),
  /** Look presets set traits, contexts and motion; Image stays independently adjustable. */
  preset: { type: 'select' as const, options: ['reading', 'portrait first', 'compact', 'poster', 'scenario', 'custom'], default: 'reading' },
  /** Where the portrait sits relative to the intro. */
  image: { type: 'select' as const, options: ['bottom', 'top', 'right', 'left', 'none'], default: 'top' },
  /** Driven by / Challenges: two lists side by side, or one after the other. */
  traits: { type: 'select' as const, options: ['side by side', 'stacked'], default: 'side by side' },
  /** Key contexts: one row each (top to bottom), a 2×2 grid, four cards across, or just the one scenario card. */
  contexts: { type: 'select' as const, options: ['rows', 'grid', 'cards', 'scenario'], default: 'rows' },
  /** Only the blue marks move. */
  motion: { type: 'select' as const, options: ['draw', 'pulse', 'off'], default: 'draw' },
  showTags: { type: 'boolean' as const, default: true },
  showQuotes: { type: 'boolean' as const, default: true },
  imageWidth: [480, 280, 720, 5] as Tuple,
  imageRadius: [28, 0, 60, 1] as Tuple,
  titleScale: [1, 0.6, 1.6, 0.01] as Tuple,
  blockGap: [96, 32, 200, 1] as Tuple,
  driven: {
    title: text('Driven by'),
    d1: text('Performs well and cares about doing their best'),
    d2: text('Wants to feel calmer, clearer and more in control'),
    d3: text('Interested in personal growth and self-awareness'),
    _collapsed: true,
  },
  challenges: {
    title: text('Challenges'),
    c1: text('Tends to overthink and replay situations'),
    c2: text('Often processes things internally'),
    c3: text('Doesn’t always have someone to talk to in the moment'),
    _collapsed: true,
  },
  moments: {
    eyebrow: text('Key contexts'),
    title: text('Support for the moments that matter.'),
    body: text('The same person. Different moments. A more timely kind of support.'),
    m1Title: text('After a challenging moment.'),
    m1Body: text('A difficult conversation, piece of feedback or high-pressure situation.'),
    m1Quote: text('“That meeting was rough…”'),
    m1Tag: text('Process in the moment'),
    m2Title: text('When thoughts keep looping.'),
    m2Body: text('Later on, when you’re alone and still replaying what happened.'),
    m2Quote: text('“Why did I say that? I can’t stop thinking about it.”'),
    m2Tag: text('Break the loop'),
    m3Title: text('During everyday stress.'),
    m3Body: text('When things start to feel overwhelming or mentally heavy.'),
    m3Quote: text('“There’s just so much right now…”'),
    m3Tag: text('Reset and refocus'),
    m4Title: text('Before it happens again.'),
    m4Body: text('Get a nudge or revisit past insights to feel more prepared next time.'),
    m4Quote: text('“I have a similar meeting tomorrow. Let’s prep.”'),
    m4Tag: text('Be more prepared'),
    _collapsed: true,
  },
  _collapsed: true,
}
/** Key-context cards floating around the portrait. Text stays in `moments`. */
/** Persona entrance presets: transform and opacity only. */
const ENTRANCES = ['rise', 'fade', 'scale', 'pop', 'slide', 'focus', 'wipe', 'none'] as const
export const FLOAT_DIALS = {
  /** Portrait entrance, replayed whenever the Persona section re-enters the viewport. */
  imageReveal: { type: 'select' as const, options: [...ENTRANCES], default: 'scale' },
  /** one/two at a time: cards fade in and out in turn · pop: springy entrance · drift: all stay up · still: no motion (easiest to edit). */
  preset: { type: 'select' as const, options: ['one at a time', 'two at a time', 'pop', 'drift', 'still'], default: 'one at a time' },
  content: { type: 'select' as const, options: ['quote + tag', 'quote', 'title + quote', 'full'], default: 'quote + tag' },
  /** Seconds between one card and the next. */
  pace: [3.2, 1.5, 8, 0.1] as Tuple,
  cardWidth: [250, 160, 360, 5] as Tuple,
  /** How far cards reach past the portrait's edges (px). */
  spread: [56, -40, 200, 1] as Tuple,
  /** Float height (px). */
  bob: [6, 0, 20, 1] as Tuple,
  /** Profile chip arrangement. */
  profileLayout: { type: 'select' as const, options: ['wrapped', '3 top / 3 bottom'], default: 'wrapped' },
  /** Vertical distance between the eyebrow and title (px). */
  eyebrowGap: [14, 0, 80, 1] as Tuple,
  /** Vertical distance between the title and body (px). */
  titleGap: [14, 0, 120, 1] as Tuple,
  /** Vertical distance between the body and profile chips (px). */
  bodyGap: [14, 0, 120, 1] as Tuple,
  /** Extra distance after the profile chips before the portrait (px). */
  tagsGap: [10, 0, 100, 1] as Tuple,
  /**
   * Entrance, replayed each time the section comes into view. Scrolling down: text block, profile
   * pills, portrait, then floating cards. Scrolling up: portrait, floating cards, text block,
   * then profile pills. Seconds; distance in px.
   */
  entrance: {
    text: { type: 'select' as const, options: [...ENTRANCES], default: 'rise' },
    pills: { type: 'select' as const, options: [...ENTRANCES], default: 'pop' },
    duration: [0.5, 0.2, 2, 0.05] as Tuple,
    distance: [24, 0, 120, 1] as Tuple,
    /** Between eyebrow, title and body. */
    textStagger: [0.05, 0, 0.6, 0.01] as Tuple,
    /** Between one pill and the next. */
    pillStagger: [0.02, 0, 0.4, 0.01] as Tuple,
    /** Pause after the text block before the first pill. */
    pillsGap: [0.02, 0, 1.5, 0.01] as Tuple,
    /** Pause after the last pill before the portrait. */
    imageGap: [0.02, 0, 1.5, 0.01] as Tuple,
    /** From the portrait starting to appear to the first floating bubble (either scroll direction). */
    floatsDelay: [0.35, 0, 4, 0.05] as Tuple,
    /** Between one floating bubble and the next (drift). */
    floatStagger: [0.18, 0, 1.5, 0.01] as Tuple,
    _collapsed: false,
  },
  _collapsed: false,
}
type Entrance = {
  text: string
  pills: string
  duration: number
  distance: number
  textStagger: number
  pillStagger: number
  pillsGap: number
  imageGap: number
  floatsDelay: number
  floatStagger: number
}
export type Float = {
  imageReveal: (typeof ENTRANCES)[number]
  preset: string
  content: string
  pace: number
  cardWidth: number
  spread: number
  bob: number
  profileLayout: string
  eyebrowGap: number
  titleGap: number
  bodyGap: number
  tagsGap: number
  entrance?: Entrance
}

/** Preset name → keyframes name in CaseStudyPage.css (`pe-*`). */
const kf = (preset: string) => (preset === 'none' ? 'none' : `pe-${preset}`)
const DRIFT_IN_DURATION = 0.65

/**
 * Entrance timeline (seconds). Scrolling down: text rows, pills, portrait, floating cards.
 * Scrolling up (`reverse`): portrait, all floating cards, text from eyebrow to body, then pills.
 * `floatsIn` is how long the cards take to finish arriving before the text follows.
 * Returns per-element delays (text in eyebrow/title/body order, pills in DOM order).
 */
function entranceTimeline(e: Entrance, pills: number, reverse: boolean, floatsIn: number) {
  const step = (start: number, n: number, stagger: number) => Array.from({ length: n }, (_, i) => start + i * stagger)
  if (!reverse) {
    const text = step(0, 3, e.textStagger)
    const pillsStart = text[2] + e.duration + e.pillsGap
    const pill = step(pillsStart, pills, e.pillStagger)
    const image = (pills ? pill[pills - 1] + e.duration : pillsStart) + e.imageGap
    return { text, pill, image, floats: image + e.floatsDelay }
  }
  const image = 0
  const floats = image + e.floatsDelay
  const textStart = floats + floatsIn + e.pillsGap
  const text = step(textStart, 3, e.textStagger)
  const pillsStart = text[2] + e.duration + e.pillsGap
  const pill = step(pillsStart, pills, e.pillStagger)
  return { text, pill, image, floats }
}
export type Persona = {
  eyebrow: string
  title: string
  body: string
  align: 'left' | 'center'
  tags: string
  preset: string
  image: string
  traits: string
  contexts: string
  motion: string
  showTags: boolean
  showQuotes: boolean
  imageWidth: number
  imageRadius: number
  titleScale: number
  blockGap: number
  spacing: SectionSpacing
  driven: Record<'title' | 'd1' | 'd2' | 'd3', string>
  challenges: Record<'title' | 'c1' | 'c2' | 'c3', string>
  moments: Record<string, string>
  /** Present only where the config adds FLOAT_DIALS. */
  float?: Float
}

type Look = Pick<Persona, 'traits' | 'contexts' | 'motion'>
const PERSONA_PRESETS: Record<string, Look> = {
  reading: { traits: 'side by side', contexts: 'rows', motion: 'draw' },
  'portrait first': { traits: 'stacked', contexts: 'rows', motion: 'draw' },
  compact: { traits: 'side by side', contexts: 'grid', motion: 'pulse' },
  poster: { traits: 'stacked', contexts: 'cards', motion: 'off' },
  scenario: { traits: 'side by side', contexts: 'scenario', motion: 'draw' },
}

/* ---------- Icons: 40×40 line icons, ink + blue ---------- */
const INK = '#171717'
const BLUE = '#53bffe'
const line = { fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

const ICONS: Record<string, ReactNode> = {
  bolt: <path className="pa-b pa-draw" pathLength={1} d="M22 6 11 22h9l-2 12 11-16h-9z" stroke={BLUE} {...line} />,
  heart: <path d="M20 31s-10-6-10-13a5.5 5.5 0 0 1 10-3 5.5 5.5 0 0 1 10 3c0 7-10 13-10 13z" stroke={INK} {...line} />,
  growth: (
    <g {...line}>
      <path d="M9 31h22" stroke={INK} />
      <path d="M12 31v-4M17 31v-8M22 31v-12" stroke={INK} />
      <path className="pa-b pa-draw" pathLength={1} d="M27 31V11" stroke={BLUE} />
    </g>
  ),
  loop: (
    <g {...line}>
      <path d="M29 20a9 9 0 1 1-3-6.7" stroke={INK} />
      <path className="pa-b" d="M27 8v6h-6" stroke={BLUE} />
    </g>
  ),
  inward: (
    <g {...line} stroke={INK}>
      <circle cx={20} cy={15} r={5} />
      <path d="M11 31c1-5 4.5-8 9-8s8 3 9 8" />
    </g>
  ),
  alone: (
    <g {...line}>
      <circle cx={20} cy={20} r={11} stroke={INK} />
      <path className="pa-b pa-hand" d="M20 13v7l4 3" stroke={BLUE} />
    </g>
  ),
}

/** Key-context illustrations, 120×80. */
const SCENES: ReactNode[] = [
  <g key="talk" {...line}>
    <path d="M22 18h36a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6H34l-8 7v-7h-4a6 6 0 0 1-6-6V24a6 6 0 0 1 6-6z" stroke={INK} />
    <path className="pa-b pa-pop" d="M56 32h36a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6h-4v7l-8-7H56a6 6 0 0 1-6-6V38a6 6 0 0 1 6-6z" stroke={BLUE} fill="#eef8ff" />
  </g>,
  <g key="loop" {...line}>
    <ellipse className="pa-b pa-spin" cx={60} cy={14} rx={16} ry={4} stroke={BLUE} />
    <ellipse className="pa-b pa-spin" cx={60} cy={22} rx={11} ry={3} stroke={BLUE} style={{ '--i': 1 } as CSSProperties} />
    <circle cx={60} cy={42} r={8} stroke={INK} />
    <path d="M44 70c2-9 8-14 16-14s14 5 16 14" stroke={INK} />
  </g>,
  <g key="stress" {...line}>
    <rect x={34} y={24} width={52} height={34} rx={4} stroke={INK} />
    <path d="M28 64h64" stroke={INK} />
    <path className="pa-b pa-pop" d="M92 18l5-7M96 26l8-3" stroke={BLUE} />
  </g>,
  <g key="prep" {...line}>
    <rect x={30} y={20} width={50} height={44} rx={5} stroke={INK} />
    <path d="M30 32h50M42 14v10M68 14v10" stroke={INK} />
    <path className="pa-b pa-ring" d="M84 52a8 8 0 0 1 16 0v6l3 4H81l3-4zM89 66h6" stroke={BLUE} fill="#eef8ff" />
  </g>,
]

function Icon({ name }: { name: string }) {
  return (
    <span className="persona__icon" aria-hidden="true">
      <svg viewBox="0 0 40 40">{ICONS[name]}</svg>
    </span>
  )
}

export function PersonaSection({ p, edit }: { p: Persona; edit: Edit }) {
  const look = { ...(PERSONA_PRESETS[p.preset] ?? p), image: p.image }
  const ref = useRef<HTMLElement>(null)
  const wasLive = useRef(false)
  const [live, setLive] = useState(false)
  const [floatCycle, setFloatCycle] = useState(0)
  // True when the section was last entered while scrolling up (it arrives bottom first).
  const [fromAbove, setFromAbove] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let lastY = window.scrollY
    let scrollingUp = false
    const onScroll = () => {
      const y = window.scrollY
      if (y !== lastY) scrollingUp = y < lastY
      lastY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !wasLive.current) {
        setFloatCycle((cycle) => cycle + 1)
        setFromAbove(scrollingUp)
        // Replay the intro entrance (text, pills, portrait) from its first frame on every entry.
        el.getAnimations({ subtree: true }).forEach((a) => {
          if (a instanceof CSSAnimation && a.animationName.startsWith('pe-')) { a.cancel(); a.play() }
        })
      }
      wasLive.current = e.isIntersecting
      setLive(e.isIntersecting)
    }, { threshold: 0.1 })
    observer.observe(el)
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [])
  const tags = p.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  const m = p.moments
  const float = p.float
  // Entrance order follows scroll direction (see entranceTimeline).
  const ent = float?.entrance
  // Wait for the last drift card to finish arriving; the looping presets show one card per beat.
  const floatsIn = float?.preset === 'drift' && ent ? ent.floatStagger * (SCENES.length - 1) + DRIFT_IN_DURATION : (ent?.duration ?? 0)
  const timeline = ent ? entranceTimeline(ent, p.showTags ? tags.length : 0, fromAbove, floatsIn) : null
  const shows = (...modes: string[]) => float !== undefined && modes.includes(float.content)
  const traitList = (group: 'driven' | 'challenges', items: [string, string][]) => (
    <div className="persona__traits-group">
      <EditableText as="h3" className="eyebrow" label={`${group} heading`} value={p[group].title} onChange={edit(`persona.${group}.title`)} />
      <ul>
        {items.map(([key, icon]) => (
          <li key={key}>
            <Icon name={icon} />
            <EditableText className="persona__trait" label={`${group} ${key}`} value={(p[group] as Record<string, string>)[key]} onChange={edit(`persona.${group}.${key}`)} />
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <section
      ref={ref}
      className="case__section case__persona"
      data-section="persona"
      data-layout="persona"
      data-copy-align={p.align}
      data-persona-image={look.image}
      data-persona-traits={look.traits}
      data-persona-contexts={look.contexts}
      data-persona-motion={look.motion}
      data-float={float?.preset}
      data-profile-layout={float?.profileLayout}
      data-live={live || undefined}
      style={
        {
          '--section-pad-top': `${p.spacing.top}px`,
          '--section-pad-bottom': `${p.spacing.bottom}px`,
          '--section-content-gap': `${p.spacing.contentGap}px`,
          ...(ent && timeline
            ? {
                '--pe-text-kf': kf(ent.text),
                '--pe-pills-kf': kf(ent.pills),
                '--pe-image-kf': kf(float.imageReveal),
                '--pe-dur': `${ent.duration}s`,
                '--pe-dist': `${ent.distance}px`,
                '--pe-text-0': `${timeline.text[0]}s`,
                '--pe-text-1': `${timeline.text[1]}s`,
                '--pe-text-2': `${timeline.text[2]}s`,
                '--pe-image': `${timeline.image}s`,
                '--pe-floats': `${timeline.floats}s`,
                '--pe-float-stagger': `${ent.floatStagger}s`,
                '--pe-float-duration': `${DRIFT_IN_DURATION}s`,
              }
            : {}),
          '--persona-img-w': `${p.imageWidth}px`,
          '--persona-img-r': `${p.imageRadius}px`,
          '--persona-title': p.titleScale,
          '--persona-gap': `${p.blockGap}px`,
          ...(float
            ? {
                '--persona-eyebrow-gap': `${float.eyebrowGap}px`,
                '--persona-title-gap': `${float.titleGap}px`,
                '--persona-body-gap': `${float.bodyGap}px`,
                '--persona-tags-gap': `${float.tagsGap}px`,
                '--float-pace': `${float.pace}s`,
                '--float-w': `${float.cardWidth}px`,
                '--float-spread': `${float.spread}px`,
                '--float-bob': `${float.bob}px`,
              }
            : {}),
        } as CSSProperties
      }
    >
      <div className="persona__intro">
        <div className="persona__who case__section-copy">
          <EditableText as="p" className="eyebrow" label="Persona eyebrow" value={p.eyebrow} onChange={edit('persona.eyebrow')} />
          <EditableText as="h2" className="persona__title" label="Persona title" value={p.title} onChange={edit('persona.title')} />
          <EditableText className="persona__body" label="Persona body" value={p.body} onChange={edit('persona.body')} />
          {p.showTags && tags.length > 0 && (
            <ul className="persona__tags" aria-label="Profile">
              {tags.map((t, i) => {
                const TagIcon = PROFILE_TAG_ICONS[i]
                return (
                  <li key={t} style={{ '--pe-delay': `${timeline?.pill[i] ?? 0}s` } as CSSProperties}>
                    {TagIcon && <TagIcon className="persona__tag-icon" size={14} strokeWidth={1.8} aria-hidden="true" />}
                    {t}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        {look.image !== 'none' && (
          <div className="persona__stage">
            <img
              className="persona__photo"
              src="/work/momo/persona/overthinker.jpg"
              alt="Illustration: a young woman at her desk, chin on hand, wearing a smartwatch, with a small worried cloud beside her"
              width={1374}
              height={1145}
              loading="lazy"
              decoding="async"
            />
            {float && (
              <ul key={floatCycle} className="persona__floats" aria-label={m.title}>
                {SCENES.map((scene, i) => {
                  const n = `m${i + 1}`
                  const TagIcon = FLOAT_TAG_ICONS[i]
                  return (
                    <li key={n} className="persona__float" data-slot={i} style={{ '--i': i } as CSSProperties}>
                      {shows('full') && (
                        <svg className="persona__float-scene" viewBox="0 0 120 80" aria-hidden="true">
                          {scene}
                        </svg>
                      )}
                      {shows('title + quote', 'full') && (
                        <EditableText as="h3" className="persona__moment-title" label={`Context ${i + 1} title`} value={m[`${n}Title`]} onChange={edit(`persona.moments.${n}Title`)} />
                      )}
                      <EditableText as="p" className="persona__quote" label={`Context ${i + 1} quote`} value={m[`${n}Quote`]} onChange={edit(`persona.moments.${n}Quote`)} />
                      {shows('quote + tag', 'full') && (
                        <p className="persona__tag">
                          <TagIcon size={14} strokeWidth={1.8} aria-hidden="true" />
                          <EditableText as="span" label={`Context ${i + 1} tag`} value={m[`${n}Tag`]} onChange={edit(`persona.moments.${n}Tag`)} />
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {!float && (
        <div className="persona__traits">
          {traitList('driven', [
            ['d1', 'bolt'],
            ['d2', 'heart'],
            ['d3', 'growth'],
          ])}
          {traitList('challenges', [
            ['c1', 'loop'],
            ['c2', 'inward'],
            ['c3', 'alone'],
          ])}
        </div>
      )}

      {!float && (
        <div className="persona__moments">
          <header>
            <EditableText as="p" className="eyebrow" label="Contexts eyebrow" value={m.eyebrow} onChange={edit('persona.moments.eyebrow')} />
            <EditableText as="h2" className="persona__title persona__title--sub" label="Contexts title" value={m.title} onChange={edit('persona.moments.title')} />
            <EditableText className="persona__body" label="Contexts body" value={m.body} onChange={edit('persona.moments.body')} />
          </header>
          <ol hidden={look.contexts === 'scenario'}>
            {SCENES.map((scene, i) => {
              const n = `m${i + 1}`
              return (
                <li key={n} style={{ '--i': i } as CSSProperties}>
                  <svg className="persona__scene" viewBox="0 0 120 80" aria-hidden="true">
                    {scene}
                  </svg>
                  <div className="persona__moment-text">
                    <span className="persona__step">{String(i + 1).padStart(2, '0')}</span>
                    <EditableText as="h3" className="persona__moment-title" label={`Context ${i + 1} title`} value={m[`${n}Title`]} onChange={edit(`persona.moments.${n}Title`)} />
                    <EditableText className="persona__moment-body" label={`Context ${i + 1} body`} value={m[`${n}Body`]} onChange={edit(`persona.moments.${n}Body`)} />
                  </div>
                  {p.showQuotes && (
                    <EditableText as="p" className="persona__quote" label={`Context ${i + 1} quote`} value={m[`${n}Quote`]} onChange={edit(`persona.moments.${n}Quote`)} />
                  )}
                  <EditableText as="p" className="persona__tag" label={`Context ${i + 1} tag`} value={m[`${n}Tag`]} onChange={edit(`persona.moments.${n}Tag`)} />
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </section>
  )
}
