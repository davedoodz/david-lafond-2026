/**
 * User persona for the Unwind case study, rebuilt from the one-page persona sheet so it reads
 * top to bottom: who she is, what drives her and gets in her way, then the four moments.
 * Icons follow the Re:Self language: ink line work, Unwind blue accents. Only `.pa-b` moves.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { EditableText } from '../components/EditableText'

type Tuple = [number, number, number, number]
type Edit = (path: string) => (next: string) => void
const text = (d: string) => ({ type: 'text' as const, default: d })

export const PERSONA_DIALS = {
  eyebrow: text('User persona'),
  title: text('The high-functioning overthinker.'),
  body: text(
    'Generally independent and capable, but prone to stress, rumination and replaying difficult moments. They want a private, low-friction outlet when no one is immediately available to talk to.',
  ),
  /** Comma-separated. */
  tags: text('20s – 30s, Works or studies, Uses a smartwatch, Values mental fitness, Open to AI tools, Urban lifestyle'),
  /** Look presets set the layout dials together; 'custom' uses the dials below. */
  preset: { type: 'select' as const, options: ['reading', 'portrait first', 'compact', 'poster', 'custom'], default: 'reading' },
  /** Where the portrait sits next to the intro. */
  image: { type: 'select' as const, options: ['right', 'left', 'top', 'none'], default: 'right' },
  /** Driven by / Challenges: two lists side by side, or one after the other. */
  traits: { type: 'select' as const, options: ['side by side', 'stacked'], default: 'side by side' },
  /** Key contexts: one row each (top to bottom), a 2×2 grid, or four cards across. */
  contexts: { type: 'select' as const, options: ['rows', 'grid', 'cards'], default: 'rows' },
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

export type Persona = {
  eyebrow: string
  title: string
  body: string
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
  driven: Record<'title' | 'd1' | 'd2' | 'd3', string>
  challenges: Record<'title' | 'c1' | 'c2' | 'c3', string>
  moments: Record<string, string>
}

type Look = Pick<Persona, 'image' | 'traits' | 'contexts' | 'motion'>
const PERSONA_PRESETS: Record<string, Look> = {
  reading: { image: 'right', traits: 'side by side', contexts: 'rows', motion: 'draw' },
  'portrait first': { image: 'top', traits: 'stacked', contexts: 'rows', motion: 'draw' },
  compact: { image: 'left', traits: 'side by side', contexts: 'grid', motion: 'pulse' },
  poster: { image: 'right', traits: 'stacked', contexts: 'cards', motion: 'off' },
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
  const look = PERSONA_PRESETS[p.preset] ?? p
  const ref = useRef<HTMLElement>(null)
  const [live, setLive] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const tags = p.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  const m = p.moments
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
      data-persona-image={look.image}
      data-persona-traits={look.traits}
      data-persona-contexts={look.contexts}
      data-persona-motion={look.motion}
      data-live={live || undefined}
      style={
        {
          '--persona-img-w': `${p.imageWidth}px`,
          '--persona-img-r': `${p.imageRadius}px`,
          '--persona-title': p.titleScale,
          '--persona-gap': `${p.blockGap}px`,
        } as CSSProperties
      }
    >
      <div className="persona__intro">
        <div className="persona__who">
          <EditableText as="p" className="eyebrow" label="Persona eyebrow" value={p.eyebrow} onChange={edit('persona.eyebrow')} />
          <EditableText as="h2" className="persona__title" label="Persona title" value={p.title} onChange={edit('persona.title')} />
          <EditableText className="persona__body" label="Persona body" value={p.body} onChange={edit('persona.body')} />
          {p.showTags && tags.length > 0 && (
            <ul className="persona__tags" aria-label="Profile">
              {tags.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
        </div>
        {look.image !== 'none' && (
          <img
            className="persona__photo"
            src="/work/unwind/persona/overthinker.jpg"
            alt="Illustration: a young woman at her desk, chin on hand, wearing a smartwatch, with a small worried cloud beside her"
            width={1374}
            height={1145}
            loading="lazy"
            decoding="async"
          />
        )}
      </div>

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

      <div className="persona__moments">
        <header>
          <EditableText as="p" className="eyebrow" label="Contexts eyebrow" value={m.eyebrow} onChange={edit('persona.moments.eyebrow')} />
          <EditableText as="h2" className="persona__title persona__title--sub" label="Contexts title" value={m.title} onChange={edit('persona.moments.title')} />
          <EditableText className="persona__body" label="Contexts body" value={m.body} onChange={edit('persona.moments.body')} />
        </header>
        <ol>
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
    </section>
  )
}
