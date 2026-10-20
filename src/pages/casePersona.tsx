/**
 * Shared case-study persona: identity, traits, then the key contexts. With `float` dials
 * (Momo) the contexts become cards that appear around the portrait; otherwise they render
 * as a list (Filo). Icons follow the Re:Self language: ink line work, Momo blue accents.
 * Only `.pa-b` moves.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Brain, Briefcase, Building2, CalendarDays, CalendarCheck, MessageCircle, RefreshCw, RotateCcw, Sparkles, Watch, type LucideIcon } from 'lucide-react'
import { EditableText } from '../components/EditableText'
import { usePushBubbles } from '../features/pushBubbles/usePushBubbles'
import type { SectionSpacing } from './caseStudyContent'

type Tuple = [number, number, number, number]
type Edit = (path: string) => (next: string) => void
const text = (d: string) => ({ type: 'text' as const, default: d })

const PROFILE_TAG_ICONS: LucideIcon[] = [CalendarDays, Briefcase, Watch, Brain, Sparkles, Building2]
const FLOAT_TAG_ICONS: LucideIcon[] = [MessageCircle, RotateCcw, RefreshCw, CalendarCheck]
/** Hover loop per pill icon (see .persona__tag-icon[data-motion] in CaseStudyPage.css). */
const FLOAT_TAG_MOTION = ['talk', 'loop', 'reset', 'plan'] as const

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
  /** Corners of the portrait image (inside the sticker card when Float → Sticker is on). */
  imageRadius: [28, 0, 60, 1] as Tuple,
  /** Sticker card (Float → Sticker on): outer corners, and the white margin between card edge and image. */
  cardRadius: [6, 0, 80, 1] as Tuple,
  cardGap: [10, 0, 60, 1] as Tuple,
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
/** Persona entrance presets: transform, opacity and blur only. `jitter`: a nervous, shaky arrival (the overthinker). */
const ENTRANCES = ['rise', 'fade', 'scale', 'pop', 'slide', 'focus', 'wipe', 'jitter', 'none'] as const
/** Portrait swap presets (float › swap); each is a CSS transition keyed on data-swap. */
const SWAP_TRANSITIONS = ['crossfade', 'blur', 'zoom', 'wipe', 'iris', 'rise', 'none'] as const
export const FLOAT_DIALS = {
  /** Portrait entrance, replayed whenever the Persona section re-enters the viewport. */
  imageReveal: { type: 'select' as const, options: [...ENTRANCES], default: 'scale' },
  /** one/two at a time: cards fade in and out in turn · pop: springy entrance · drift: all stay up · still: no motion (easiest to edit). */
  preset: { type: 'select' as const, options: ['one at a time', 'two at a time', 'pop', 'drift', 'still'], default: 'one at a time' },
  content: { type: 'select' as const, options: ['quote + tag', 'quote + role', 'quote', 'title + quote', 'full'], default: 'quote + tag' },
  /**
   * How the quotes are shown. floating: cards around the portrait (preset sets their motion) ·
   * transcript: call-notes rows under it · wall: 2×2 cards under it · spotlight: one large quote at a
   * time, cycling every `pace` seconds · marquee: a slow sliding row under it.
   */
  quotes: { type: 'select' as const, options: ['floating', 'transcript', 'wall', 'spotlight', 'marquee'], default: 'floating' },
  /** Seconds between one card and the next. */
  pace: [3.2, 1.5, 8, 0.1] as Tuple,
  cardWidth: [250, 160, 360, 5] as Tuple,
  /** How far cards reach past the portrait's edges (px). */
  spread: [56, -40, 200, 1] as Tuple,
  /** Float height (px). */
  bob: [6, 0, 20, 1] as Tuple,
  /** Profile chip arrangement. */
  profileLayout: { type: 'select' as const, options: ['wrapped', '3 top / 3 bottom'], default: 'wrapped' },
  /** Where the profile pills sit: between the text and the portrait, or under the portrait. */
  pillsPosition: { type: 'select' as const, options: ['under text', 'under image'], default: 'under text' },
  /** Vertical distance between the eyebrow and title (px). */
  eyebrowGap: [14, 0, 80, 1] as Tuple,
  /** Vertical distance between the title and body (px). */
  titleGap: [14, 0, 120, 1] as Tuple,
  /** Below the text block to the next section: the pills, or the portrait when the pills sit under it (px). */
  bodyGap: [16, 0, 200, 1] as Tuple,
  /** Between the pills and the portrait, above or below it (px). */
  tagsGap: [72, 0, 300, 1] as Tuple,
  /**
   * Entrance, replayed each time the section comes into view. `order` 'image first': portrait, floating
   * cards, then the text block top to bottom and the pills. 'text first': the text block, then the portrait,
   * the pills under it, and the cards around it. Seconds; distance in px.
   */
  entrance: {
    order: { type: 'select' as const, options: ['image first', 'text first'], default: 'image first' },
    /** `cascade`: the other sections' text reveal (text-reveal-rise on its expo ease), so the persona copy arrives like theirs. */
    text: { type: 'select' as const, options: [...ENTRANCES, 'cascade'], default: 'rise' },
    pills: { type: 'select' as const, options: [...ENTRANCES], default: 'pop' },
    duration: [0.5, 0.2, 2, 0.05] as Tuple,
    /** The text block's own duration (eyebrow, title, body); `duration` covers the pills and portrait. */
    textDuration: [0.5, 0.2, 3, 0.05] as Tuple,
    distance: [24, 0, 120, 1] as Tuple,
    /** Between eyebrow, title and body. */
    textStagger: [0.05, 0, 0.6, 0.01] as Tuple,
    /** Between one pill and the next. */
    pillStagger: [0.02, 0, 0.4, 0.01] as Tuple,
    /** Image first: pause after the text block (see pillsAfter) before the first pill. Text first: pause after
     *  the portrait lands before the first pill. Below 0 the pills overlap. */
    pillsGap: [0.02, -3, 1.5, 0.01] as Tuple,
    /** Image first only: which text line the pills wait for, the title or the body. */
    pillsAfter: { type: 'select' as const, options: ['title', 'body'], default: 'body' },
    /** Image first: pause after the last bubble settles before the text block. Text first: pause after the
     *  body finishes before the portrait. Below 0 they overlap. */
    textGap: [0.1, -3, 4, 0.01] as Tuple,
    /** Seconds the floating bubbles wait before the first one appears, counted from their trigger (the
     *  profile pills settled and the title scrolled up to the Back link, or the pills arriving from below). */
    floatsDelay: [0.35, 0, 6, 0.05] as Tuple,
    /** Between one floating bubble and the next (drift). */
    floatStagger: [0.18, 0, 1.5, 0.01] as Tuple,
    _collapsed: false,
  },
  /** Pointer push: the cursor shoves floating cards the way it is moving, then they spring back to rest. */
  push: {
    enabled: { type: 'boolean' as const, default: true },
    /** Px outside a card's edge where the cursor starts to touch it. */
    reach: [36, 0, 160, 1] as Tuple,
    /** How hard the cursor pushes; the final offset is still clamped to maxOffset. */
    strength: [1, 0, 3, 0.05] as Tuple,
    /** How much the cursor's direction of travel steers the push (0 = straight away from the cursor). */
    carry: [0.7, 0, 1, 0.05] as Tuple,
    /** Max px a card can be pushed from its resting position. */
    maxOffset: [16, 0, 40, 1] as Tuple,
    /** How hard a pushed card pulls back toward rest. */
    stiffness: [140, 40, 400, 2] as Tuple,
    /** How quickly the pull-back settles; higher is less bouncy. */
    damping: [24, 4, 60, 0.5] as Tuple,
    /** Max rotation (deg) while pushed, proportional to the horizontal offset. */
    tilt: [3, 0, 20, 0.5] as Tuple,
    _collapsed: true,
  },
  /**
   * The portrait as a sticker: stamped onto the page from above (replaces Image Reveal), tilted, on a
   * white card (corners and margin: Persona → Image Radius, Card Radius, Card Gap).
   * Seconds; lift in px; scale is the size it starts at.
   */
  sticker: {
    show: true,
    tilt: [-3, -12, 12, 0.5] as Tuple,
    stamp: [0.6, 0.15, 2, 0.05] as Tuple,
    lift: [160, 0, 600, 5] as Tuple,
    scale: [1.35, 1, 3, 0.05] as Tuple,
    _collapsed: true,
  },
  /**
   * Floating bubbles. glass: white bubbles with glass tag pills, turned in perspective toward the
   * portrait · card: the flat white cards. Bubbles arrive once the sticker lands.
   * pills (glass look): frost: flat frosted glass · clear: barely-there glass, hairline edge ·
   * tint: flat light-blue fill · outline: hairline only · raised: glossy 3D (highlight, under-shade, drop shadow) ·
   * thumb: the Momo thumbnail's glass pill (white glass, navy sentence-case text, blue icon).
   * tint and blur tune the pills' glass; `frost` tunes the frost pill's two-colour gradient and glass.
   */
  bubbles: {
    look: { type: 'select' as const, options: ['glass', 'card'], default: 'glass' },
    pills: { type: 'select' as const, options: ['frost', 'clear', 'tint', 'outline', 'raised', 'thumb'], default: 'frost' },
    tint: [0.08, 0, 0.4, 0.01] as Tuple,
    blur: [16, 0, 40, 1] as Tuple,
    radius: [30, 8, 48, 1] as Tuple,
    /**
     * Frost pill: a two-colour gradient (from → to at `angle`, `strength` its opacity), under a white
     * `sheen` (milkiness). Glass: `saturate` (colour pulled through the blur), top `highlight`,
     * `edge` (hairline opacity). Defaults keep the original single-blue frost.
     */
    frost: {
      from: { type: 'color' as const, default: '#78AFFF' },
      to: { type: 'color' as const, default: '#78AFFF' },
      angle: [135, 0, 360, 1] as Tuple,
      strength: [0.13, 0, 1, 0.01] as Tuple,
      sheen: [0.35, 0, 1, 0.01] as Tuple,
      saturate: [1.5, 0, 3, 0.05] as Tuple,
      highlight: [0.7, 0, 1, 0.01] as Tuple,
      edge: [0.22, 0, 1, 0.01] as Tuple,
      _collapsed: true,
    },
    /** Turn toward the portrait (deg); the outer edge comes forward. */
    turn: [14, 0, 45, 0.5] as Tuple,
    /** In-plane tilt (deg): left bubbles rise to the right, right bubbles dip. */
    roll: [3, 0, 12, 0.5] as Tuple,
    perspective: [900, 200, 3000, 10] as Tuple,
    _collapsed: true,
  },
  /**
   * Clicking a bubble's pill swaps the portrait to the calm version (overthinker-calm.jpg). A clicked
   * pill stays pressed until the section scrolls fully off screen or the page reloads.
   * crossfade: plain fade · blur: fades in out of focus · zoom: settles from slightly larger ·
   * wipe: reveals left to right · iris: grows from the centre as a circle · rise: reveals bottom to top ·
   * none: instant.
   */
  swap: {
    transition: { type: 'select' as const, options: [...SWAP_TRANSITIONS], default: 'crossfade' },
    duration: [0.9, 0.1, 3, 0.05] as Tuple,
    _collapsed: true,
  },
  _collapsed: false,
}
type Push = {
  enabled: boolean
  reach: number
  strength: number
  carry: number
  maxOffset: number
  stiffness: number
  damping: number
  tilt: number
}
/** Falls back to the dial defaults for presets (Filo) that don't spread the `push` folder. */
const DEFAULT_PUSH: Push = { enabled: true, reach: 36, strength: 1, carry: 0.7, maxOffset: 16, stiffness: 140, damping: 24, tilt: 3 }
type Entrance = {
  /** 'image first' (default) or 'text first'; older presets omit it. */
  order?: string
  text: string
  pills: string
  duration: number
  textDuration: number
  distance: number
  textStagger: number
  pillStagger: number
  pillsGap: number
  pillsAfter?: string
  textGap: number
  floatsDelay: number
  floatStagger: number
}
export type Float = {
  imageReveal: (typeof ENTRANCES)[number]
  preset: string
  content: string
  quotes: string
  pace: number
  cardWidth: number
  spread: number
  bob: number
  profileLayout: string
  pillsPosition: string
  eyebrowGap: number
  titleGap: number
  bodyGap: number
  tagsGap: number
  entrance?: Entrance
  push?: Push
  sticker?: { show: boolean; tilt: number; stamp: number; lift: number; scale: number }
  bubbles?: {
    look: string; pills: string; tint: number; blur: number; radius: number; turn: number; roll: number; perspective: number
    frost?: { from: string; to: string; angle: number; strength: number; sheen: number; saturate: number; highlight: number; edge: number }
  }
  swap?: { transition: (typeof SWAP_TRANSITIONS)[number]; duration: number }
}

/**
 * One CSS `rotate` (axis + angle) that turns a bubble `turn`° about Y, then rolls it `roll`° in
 * plane. The individual `rotate` property keeps clear of the entrance `transform`, the bob
 * `translate` and the pointer push, so all four compose.
 */
function bubbleRotate(turn: number, roll: number) {
  const y = (turn * Math.PI) / 360
  const z = (roll * Math.PI) / 360
  // Quaternion product (roll ∘ turn).
  const w = Math.cos(z) * Math.cos(y)
  const v = [-Math.sin(z) * Math.sin(y), Math.cos(z) * Math.sin(y), Math.sin(z) * Math.cos(y)]
  const s = Math.sqrt(Math.max(0, 1 - w * w))
  if (s < 1e-6) return 'none'
  return `${v.map((c) => (c / s).toFixed(4)).join(' ')} ${((2 * Math.acos(w) * 180) / Math.PI).toFixed(3)}deg`
}
/** Bubble slots 0/2 sit left of the portrait, 1/3 right; the lower pair rolls a little less. */
const SLOT_SIDE = [1, -1, 1, -1]
const SLOT_ROLL = [1, 1, 0.7, 1]

/** Preset name → keyframes name in CaseStudyPage.css (`pe-*`). */
const kf = (preset: string) => (preset === 'none' ? 'none' : preset === 'cascade' ? 'text-reveal-rise' : `pe-${preset}`)
/** The sections' text-reveal ease (CaseStudyPage.css `cascade`), else the persona's own. */
const SECTION_TEXT_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'
const DRIFT_IN_DURATION = 0.65

/**
 * Entrance timeline (seconds). 'image first': portrait, floating cards, then text from eyebrow to body,
 * then pills (once the title or body, per pillsAfter, has arrived). 'text first': text from eyebrow to
 * body, then the portrait, the pills once it has landed, and the cards once the last pill has landed.
 * `imageIn` is how long the portrait takes to settle (the sticker stamp);
 * `floatsIn` is how long the cards take to finish arriving.
 * Returns per-element delays (text in eyebrow/title/body order, pills in DOM order).
 */
function entranceTimeline(e: Entrance, pills: number, floatsIn: number, imageIn = 0) {
  const step = (start: number, n: number, stagger: number) => Array.from({ length: n }, (_, i) => start + i * stagger)
  if (e.order === 'text first') {
    const text = step(0, 3, e.textStagger)
    const image = Math.max(0, text[2] + e.textDuration + e.textGap)
    const pill = step(Math.max(0, image + imageIn + e.pillsGap), pills, e.pillStagger)
    const pillsIn = pill.length ? pill[pill.length - 1] + e.duration : image + imageIn
    return { text, image, pill, floats: pillsIn + e.floatsDelay }
  }
  const image = 0
  const floats = image + imageIn + e.floatsDelay
  const text = step(floats + floatsIn + e.textGap, 3, e.textStagger)
  const pillsStart = text[e.pillsAfter === 'title' ? 1 : 2] + e.textDuration + e.pillsGap
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
  cardRadius: number
  cardGap: number
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

/**
 * One large quote at a time under the portrait. Advances every `pace` seconds while the section is on
 * screen (not under reduced motion); the dots jump to a quote and stop the auto-advance.
 */
function QuoteSpotlight({ count, pace, live, label, render }: { count: number; pace: number; live: boolean; label: string; render: (i: number) => ReactNode }) {
  const [active, setActive] = useState(0)
  const [held, setHeld] = useState(false)
  useEffect(() => {
    if (!live || held || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setActive((i) => (i + 1) % count), pace * 1000)
    return () => window.clearInterval(timer)
  }, [live, held, pace, count])
  return (
    <div className="persona__quotes" role="group" aria-roledescription="carousel" aria-label={label}>
      <div className="persona__spotlight-stage">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="persona__quote-item" data-active={i === active || undefined} aria-hidden={i !== active}>
            {render(i)}
          </div>
        ))}
      </div>
      <div className="persona__spotlight-dots">
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Quote ${i + 1} of ${count}`}
            aria-current={i === active || undefined}
            onClick={() => {
              setActive(i)
              setHeld(true)
            }}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Sliding row of quote cards (float › quotes: marquee). `loop` is one full pass in seconds; `render(i, copy)`
 * draws card `i`, with `copy` true for the second, hidden pass that makes the -50% slide seamless.
 * Also placed under Filo's primary-research video.
 */
export function QuoteMarquee({ count, loop, label, render }: { count: number; loop: number; label: string; render: (i: number, copy: boolean) => ReactNode }) {
  const items = Array.from({ length: count }, (_, i) => i)
  return (
    <div className="persona__quotes" style={{ '--quote-loop': `${loop}s` } as CSSProperties}>
      <div className="persona__marquee-track">
        <ul aria-label={label}>
          {items.map((i) => (
            <li key={i} className="persona__quote-item">
              {render(i, false)}
            </li>
          ))}
        </ul>
        <ul aria-hidden="true">
          {items.map((i) => (
            <li key={i} className="persona__quote-item">
              {render(i, true)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/**
 * `visual` replaces the Momo portrait (Filo's desk loop, FiloPersonaLoop); it fills the `.persona__photo` box.
 * `quoteArt` adds an illustration behind quote card `i` (Filo's FiloQuoteArt); it renders nothing for cards without one.
 */
export function PersonaSection({
  p,
  edit,
  selectable = false,
  visual,
  quoteArt,
}: {
  p: Persona
  edit: Edit
  selectable?: boolean
  visual?: ReactNode
  quoteArt?: (i: number) => ReactNode
}) {
  const look = { ...(PERSONA_PRESETS[p.preset] ?? p), image: p.image }
  const ref = useRef<HTMLElement>(null)
  const wasLive = useRef(false)
  const [live, setLive] = useState(false)
  // The floating bubbles wait for the title to scroll up past the page's Back link (see `crossed`).
  const floatsLive = useRef(false)
  const [bubblesIn, setBubblesIn] = useState(false)
  const [floatCycle, setFloatCycle] = useState(0)
  // Bubble pills clicked this visit (float › swap). Any press swaps the portrait to the calm version;
  // presses hold until the section leaves the viewport (or the page reloads).
  const [pressed, setPressed] = useState<ReadonlySet<number>>(() => new Set())
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // The intro entrance (text, pills, portrait) is played from script, so the CSS pause no longer
    // holds it; pause it here. It starts as soon as its anchor is wholly on screen (top and bottom edges
    // inside the view), or if a fast scroll carries it past the middle between frames, and is rewound to
    // frame one only once the section is fully off screen, so a return shows the start of the entrance,
    // never the settled section snapping back. The anchor is the portrait, or the title when the text
    // leads (order › text first), so the copy plays as it arrives, like the other sections' text.
    const entrance = () =>
      el.getAnimations({ subtree: true }).filter((a) => a instanceof CSSAnimation && (a.animationName.startsWith('pe-') || a.animationName === 'text-reveal-rise') && !isFloat(a))
    const anchorOf = () =>
      (el.dataset.peOrder === 'text first' ? el.querySelector<HTMLElement>('.persona__title') : null) ??
      el.querySelector<HTMLElement>('.persona__portrait, .persona__sticker') ?? el
    let lastSide = 0
    let frame = 0
    // The bubbles (and the quotes layout) run on their own clock, so the entrance never plays them.
    const isFloat = (a: Animation) => a instanceof CSSAnimation && a.effect instanceof KeyframeEffect && !!(a.effect.target as Element | null)?.closest('.persona__floats, .persona__quotes')
    const floatAnims = () => el.getAnimations({ subtree: true }).filter(isFloat)
    // Floating bubbles enter once the profile pills under the portrait have settled (`pillsSettled`) and the
    // title's middle has scrolled up to the Back link's (the fixed one at the top left). The quotes layouts
    // (transcript, wall, spotlight, marquee) sit below the portrait and enter as soon as they are in frame.
    let pillsSettled = false
    let entranceRun = 0
    // Entered from below (scrolling back up): the title only moves down, away from the Back link, so
    // the bubbles follow the pills instead of waiting for it.
    let fromBelow = false
    const crossed = () => {
      if (floatsLive.current) return
      const strip = el.querySelector<HTMLElement>('.persona__quotes')
      if (strip) {
        const r = strip.getBoundingClientRect()
        if (r.top >= innerHeight || r.bottom <= 0) return
      } else {
        if (!pillsSettled) return
        const title = el.querySelector<HTMLElement>('.persona__title')
        const back = document.querySelector<HTMLElement>('.case__back:not(.case__back--inline)')
        if (!title) return
        if (!fromBelow) {
          const t = title.getBoundingClientRect(), b = back?.getBoundingClientRect()
          const line = b && b.height > 0 ? b.top + b.height / 2 : 90
          if (t.top + t.height / 2 > line) return
        }
      }
      floatsLive.current = true
      floatAnims().forEach((a) => { a.currentTime = 0; a.play() })
      setBubblesIn(true)
    }
    const check = () => {
      frame = 0
      crossed()
      if (wasLive.current) return
      // Settled layout box from the offset chain, not the animated one: the paused first frame of the
      // stamp is scaled and lifted, which would fire the trigger early.
      const box = (node: HTMLElement) => {
        let top = -scrollY
        for (let n: HTMLElement | null = node; n; n = n.offsetParent as HTMLElement | null) top += n.offsetTop
        return { top, bottom: top + node.offsetHeight }
      }
      const inView = (b: { top: number; bottom: number }) => b.top >= 0 && b.bottom <= innerHeight
      const { top, bottom } = box(anchorOf())
      const side = Math.sign((top + bottom) / 2 - innerHeight / 2)
      // Coming back up from below, the profile pills (the section's last row) arrive first: the whole
      // entrance, and then the bubbles, play once they are wholly on screen.
      const tagRow = el.querySelector<HTMLElement>('.persona__tags')
      if (inView({ top, bottom }) || (tagRow && inView(box(tagRow))) || (lastSide !== 0 && side !== lastSide)) {
        wasLive.current = true
        entrance().forEach((a) => { a.currentTime = 0; a.play() })
        const run = ++entranceRun
        const pills = entrance().filter((a) => !!((a.effect as KeyframeEffect | null)?.target as Element | null)?.closest('.persona__tags'))
        void Promise.all(pills.map((a) => a.finished)).then(() => {
          if (run !== entranceRun) return
          pillsSettled = true
          crossed()
        }, () => {})
        setLive(true)
      }
      lastSide = side
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(check) }
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        lastSide = 0
        fromBelow = e.boundingClientRect.top < 0
        addEventListener('scroll', onScroll, { passive: true })
        addEventListener('resize', onScroll)
        check()
        return
      }
      removeEventListener('scroll', onScroll)
      removeEventListener('resize', onScroll)
      if (floatsLive.current) {
        floatsLive.current = false
        floatAnims().forEach((a) => { a.pause(); a.currentTime = 0 })
        setBubblesIn(false)
      }
      if (!wasLive.current) return
      wasLive.current = false
      pillsSettled = false
      entranceRun++
      entrance().forEach((a) => { a.pause(); a.currentTime = 0 })
      setFloatCycle((cycle) => cycle + 1)
      setPressed(new Set())
      setLive(false)
    })
    observer.observe(el)
    return () => {
      observer.disconnect()
      removeEventListener('scroll', onScroll)
      removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])
  const tags = p.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  const m = p.moments
  const float = p.float
  // Portrait, then bubbles, then text (see entranceTimeline).
  const ent = float?.entrance
  // Wait for the last drift card to finish arriving; the looping presets show one card per beat.
  const floatsIn = float?.preset === 'drift' && ent ? ent.floatStagger * (SCENES.length - 1) + DRIFT_IN_DURATION : (ent?.duration ?? 0)
  // The sticker stamps down; the bubbles wait for it to land.
  const sticker = float?.sticker?.show ? float.sticker : null
  const glass = float?.bubbles?.look === 'glass' ? float.bubbles : null
  const imageIn = sticker?.stamp ?? 0
  const timeline = ent ? entranceTimeline(ent, p.showTags ? tags.length : 0, floatsIn, imageIn) : null
  // Profile pills: inside the text block (under the body) or as their own row under the portrait.
  const pillsUnderImage = float?.pillsPosition === 'under image' && look.image !== 'none'
  const tagList = p.showTags && tags.length > 0 && (
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
  )
  const shows = (...modes: string[]) => float !== undefined && modes.includes(float.content)
  const quotesLayout = float?.quotes ?? 'floating'
  // Only the built-in Momo portrait has a calm version to swap to; a custom `visual` (Filo) does not.
  const swap = !visual && quotesLayout === 'floating' && float?.swap ? float.swap : null
  const press = (i: number) => setPressed((prev) => (prev.has(i) ? prev : new Set(prev).add(i)))
  const setFloatPushRef = usePushBubbles(SCENES.length, float?.push ?? DEFAULT_PUSH)
  /** One quote's content, shared by every quote layout; `copy` renders plain text (marquee's repeat). */
  const quoteParts = (i: number, copy = false) => {
    const n = `m${i + 1}`
    const TagIcon = FLOAT_TAG_ICONS[i]
    const field = (as: 'p' | 'h3' | 'span', className: string | undefined, label: string, key: string) =>
      copy ? (
        as === 'span' ? <span className={className}>{m[key]}</span> : as === 'h3' ? <h3 className={className}>{m[key]}</h3> : <p className={className}>{m[key]}</p>
      ) : (
        <EditableText as={as} className={className} label={label} value={m[key]} onChange={edit(`persona.moments.${key}`)} />
      )
    return (
      <>
        {quoteArt?.(i)}
        {shows('full') && (
          <svg className="persona__float-scene" viewBox="0 0 120 80" aria-hidden="true">
            {SCENES[i]}
          </svg>
        )}
        {shows('title + quote', 'full') && field('h3', 'persona__moment-title', `Context ${i + 1} title`, `${n}Title`)}
        {field('p', 'persona__quote', `Context ${i + 1} quote`, `${n}Quote`)}
        {shows('quote + role') && field('p', 'persona__role', `Context ${i + 1} role`, `${n}Role`)}
        {shows('quote + tag', 'full') &&
          (swap && !copy ? (
            <p
              className="persona__tag"
              role="button"
              tabIndex={0}
              aria-pressed={pressed.has(i)}
              onClick={() => press(i)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                press(i)
              }}
            >
              <TagIcon className="persona__tag-icon" data-motion={FLOAT_TAG_MOTION[i]} size={14} strokeWidth={1.8} aria-hidden="true" />
              {field('span', undefined, `Context ${i + 1} tag`, `${n}Tag`)}
            </p>
          ) : (
            <p className="persona__tag">
              <TagIcon className="persona__tag-icon" data-motion={FLOAT_TAG_MOTION[i]} size={14} strokeWidth={1.8} aria-hidden="true" />
              {field('span', undefined, `Context ${i + 1} tag`, `${n}Tag`)}
            </p>
          ))}
      </>
    )
  }
  const quoteIndexes = SCENES.map((_, i) => i)
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
      data-quotes={float ? quotesLayout : undefined}
      data-profile-layout={float?.profileLayout}
      data-pills-position={float ? (pillsUnderImage ? 'under image' : 'under text') : undefined}
      data-bubbles={float?.bubbles?.look}
      data-pills={float?.bubbles?.pills}
      data-live={live || undefined}
      data-floats-in={bubblesIn || undefined}
      data-pe-order={ent?.order}
      data-swap={swap?.transition}
      data-swapped={pressed.size > 0 || undefined}
      style={
        {
          '--section-pad-top': `${p.spacing.top}px`,
          ...(swap ? { '--swap-dur': `${swap.duration}s` } : {}),
          '--section-pad-bottom': `${p.spacing.bottom}px`,
          '--section-content-gap': `${p.spacing.contentGap}px`,
          ...(ent && timeline
            ? {
                '--pe-text-kf': kf(ent.text),
                ...(ent.text === 'cascade' ? { '--pe-text-ease': SECTION_TEXT_EASE } : {}),
                '--pe-pills-kf': kf(ent.pills),
                '--pe-image-kf': kf(float.imageReveal),
                '--pe-dur': `${ent.duration}s`,
                '--pe-text-dur': `${ent.textDuration}s`,
                '--pe-dist': `${ent.distance}px`,
                '--pe-text-0': `${timeline.text[0]}s`,
                '--pe-text-1': `${timeline.text[1]}s`,
                '--pe-text-2': `${timeline.text[2]}s`,
                '--pe-image': `${timeline.image}s`,
                '--pe-floats': `${timeline.floats}s`,
                '--pe-floats-delay': `${ent.floatsDelay}s`,
                '--pe-float-stagger': `${ent.floatStagger}s`,
                '--pe-float-duration': `${DRIFT_IN_DURATION}s`,
              }
            : {}),
          '--persona-img-w': `${p.imageWidth}px`,
          '--persona-img-r': `${p.imageRadius}px`,
          '--sticker-r': `${p.cardRadius}px`,
          '--sticker-border': `${p.cardGap}px`,
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
          ...(sticker
            ? {
                '--sticker-tilt': `${sticker.tilt}deg`,
                '--sticker-dur': `${sticker.stamp}s`,
                '--sticker-lift': `${sticker.lift}px`,
                '--sticker-scale': sticker.scale,
              }
            : {}),
          ...(glass
            ? {
                '--bubble-tint': glass.tint,
                '--bubble-blur': `${glass.blur}px`,
                '--bubble-r': `${glass.radius}px`,
                '--bubble-perspective': `${glass.perspective}px`,
                ...(glass.frost
                  ? {
                      '--frost-from': glass.frost.from,
                      '--frost-to': glass.frost.to,
                      '--frost-angle': `${glass.frost.angle}deg`,
                      '--frost-strength': `${glass.frost.strength * 100}%`,
                      '--frost-sheen': glass.frost.sheen,
                      '--frost-saturate': glass.frost.saturate,
                      '--frost-highlight': glass.frost.highlight,
                      '--frost-edge': glass.frost.edge,
                    }
                  : {}),
              }
            : {}),
        } as CSSProperties
      }
    >
      <div className="persona__intro">
        <div className="persona__who case__section-copy">
          <EditableText as="p" className="eyebrow" label="Persona eyebrow" value={p.eyebrow} onChange={edit('persona.eyebrow')} />
          <EditableText as="h2" className="persona__title" label="Persona title" value={p.title} onChange={edit('persona.title')} selectable={selectable} />
          <EditableText className="persona__body" label="Persona body" value={p.body} onChange={edit('persona.body')} selectable={selectable} />
          {!pillsUnderImage && tagList}
        </div>
        {look.image !== 'none' && (
          <div className="persona__stage">
            <div className={sticker ? 'persona__sticker' : 'persona__portrait'}>
              {visual ?? (
                <>
                  <img
                    className="persona__photo"
                    src="/work/momo/persona/overthinker.jpg"
                    alt="Illustration: a young woman at her desk, chin on hand, wearing a smartwatch, with a small worried cloud beside her"
                    width={1374}
                    height={1144}
                    loading="lazy"
                    decoding="async"
                  />
                  {swap && (
                    <img
                      className="persona__photo-alt"
                      src="/work/momo/persona/overthinker-calm.jpg"
                      alt={pressed.size > 0 ? 'Illustration: the same young woman, now smiling and at ease, with a confident cloud beside her' : ''}
                      aria-hidden={pressed.size === 0}
                      width={1374}
                      height={1144}
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                </>
              )}
            </div>
            {float && quotesLayout === 'floating' && (
              <ul key={floatCycle} className="persona__floats" aria-label={m.title}>
                {quoteIndexes.map((i) => (
                  <li
                    key={i}
                    className="persona__float"
                    data-slot={i}
                    style={{
                      '--i': i,
                      ...(glass ? { rotate: bubbleRotate(glass.turn * SLOT_SIDE[i], -glass.roll * SLOT_SIDE[i] * SLOT_ROLL[i]) } : {}),
                    } as CSSProperties}
                  >
                    <div className="persona__float-push" ref={setFloatPushRef[i]}>
                      {quoteParts(i)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {pillsUnderImage && <div className="persona__pills case__section-copy">{tagList}</div>}
        {float && quotesLayout === 'spotlight' && (
          <QuoteSpotlight key={floatCycle} count={quoteIndexes.length} pace={float.pace} live={live} label={m.title} render={quoteParts} />
        )}
        {float && (quotesLayout === 'transcript' || quotesLayout === 'wall') && (
          <ul key={floatCycle} className="persona__quotes" aria-label={m.title}>
            {quoteIndexes.map((i) => (
              <li key={i} className="persona__quote-item" style={{ '--i': i } as CSSProperties}>
                {quoteParts(i)}
              </li>
            ))}
          </ul>
        )}
        {float && quotesLayout === 'marquee' && (
          <QuoteMarquee key={floatCycle} count={quoteIndexes.length} loop={float.pace * quoteIndexes.length * 2.5} label={m.title} render={quoteParts} />
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
