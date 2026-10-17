/**
 * Every value the Momo thumbnail runs on. The Selected Works card and the studio page
 * (studio/momo-thumbnail.html) both read it through useTuning('MomoThumbnail', …), so what is
 * tuned and saved in the studio's DialKit panel (src/data/tuning.json) is what the site plays.
 */
import type { ResolvedValues } from 'dialkit'

type Tuple = [number, number, number, number]
const select = <V extends string>(options: readonly (readonly [V, string])[], def: V) => ({
  type: 'select' as const,
  options: options.map(([value, label]) => ({ value, label })),
  default: def,
})

export const WATCH_LINES = [
  'That calm you noticed? HRV is up 6 since Aug.',
  'You felt calmer. Your HRV agrees: +6 since Aug.',
  'Calm after your river walk. Resting HR down 3.',
  'Slower mornings suit you. HRV +6 since August.',
  'Your walks are showing. HRV up 6 since August.',
  'Morning walk, calmer day. Make it a habit?',
  'Calm days follow your walks. Walk again tomorrow?',
  'River walk logged. That’s the calm you named.',
  'Walks + better sleep: +25 min since August.',
  'You said the walk helped. Your body says so too.',
] as const

const INPUT_LABELS = ['Heart rate', 'Movement', 'HRV', 'Breathing', 'Sleep', 'Temperature', 'Voice', 'Journal'] as const
const OUTPUT_LABELS = ['Nudge', 'Check-in', 'Reflection', 'Insights', 'Patterns', 'Plans', 'Goals', 'Tracking'] as const
/** Each label sits 1px low in its pill by default, so it reads optically centred (+ is down). */
const nudges = <L extends string>(labels: readonly L[]) =>
  Object.fromEntries(labels.map((l) => [l, [1, -4, 4, 0.25] as Tuple])) as Record<L, Tuple>

/** Momo's offset (card px) and scale in one state, relative to its base position and size. */
const state = (xy: number) => ({ x: [0, -xy, xy, 1] as Tuple, y: [0, -xy, xy, 1] as Tuple, scale: [1, 0.6, 1.5, 0.01] as Tuple })

export const MOMO_THUMB_CONFIG = {
  replay: { type: 'action' as const, label: 'Replay' },
  pause: { type: 'action' as const, label: 'Pause / Play (Space)' },
  /** Off holds one designed still frame (eyes closed, inputs on the ring). */
  motion: true,
  copy: {
    watchText: select(WATCH_LINES.map((l) => [l, l] as const), WATCH_LINES[0]),
    /** One family for the pills and the Watch screens. Inter matches the phone transcript. */
    font: select(
      [
        ['inter', 'Inter (phone transcript)'],
        ['sf', 'SF Pro'],
        ['beatrice', 'Beatrice (site)'],
        ['avenir', 'Avenir Next'],
        ['helvetica', 'Helvetica Neue'],
        ['serif', 'New York (tracker serif)'],
      ] as const,
      'inter',
    ),
  },
  /** Loop times in ms. Phases stay in order: devices (950) → Watch line → pills → outputs → exit. */
  timing: {
    /** The phone line is timed so both lines reach Momo at the same moment (≈1.95 s by default). */
    watchLineStart: [1050, 950, 4000, 10] as Tuple,
    pillsArrive: [2200, 950, 6000, 10] as Tuple,
    lineDraw: [1300, 500, 3000, 10] as Tuple,
    /** When Momo closes its eyes (loop ms; the lines touch it at ≈1950). */
    sleepStart: [1950, 950, 9000, 10] as Tuple,
    /** When Momo opens them again (loop ms; awake by the exit at the latest). */
    wakeStart: [7200, 1000, 15000, 10] as Tuple,
    outputsStart: [7200, 2000, 12000, 10] as Tuple,
    /** How long the outputs hold before the devices leave (ms). The tracker clip runs ≈10.9 s from where it starts. */
    outputsLength: [4200, 1500, 9000, 10] as Tuple,
    closeDuration: [700, 0, 1600, 10] as Tuple,
    openDuration: [700, 0, 1600, 10] as Tuple,
    transition: select(
      [
        ['bounce', 'Crossfade + bounce'],
        ['fade', 'Crossfade'],
        ['blur', 'Soft blur'],
        ['blink', 'Blink (squash)'],
        ['dip', 'Dip'],
        ['cut', 'Cut'],
      ] as const,
      'bounce',
    ),
  },
  /** Card px (867 × 493). */
  desktop: {
    watch: { x: [84, -80, 300, 1] as Tuple, y: [246, 100, 400, 1] as Tuple, scale: [0.95, 0.5, 1.4, 0.01] as Tuple },
    phone: { x: [760, 560, 920, 1] as Tuple, top: [-227, -420, 0, 1] as Tuple, width: [255, 160, 360, 1] as Tuple },
    momo: {
      y: [246, 100, 400, 1] as Tuple,
      size: [202, 120, 320, 1] as Tuple,
      /** Heartbeat line offset from Momo's centre (+ is down). */
      lineY: [0, -120, 120, 1] as Tuple,
      /** Where the left and right heartbeat lines stop, from Momo's centre (× its size): lower reaches
       *  further into Momo, higher stops further out. */
      lineEndLeft: [0.34, 0, 0.6, 0.005] as Tuple,
      lineEndRight: [0.34, 0, 0.6, 0.005] as Tuple,
      pillDistance: [1, 0.6, 1.6, 0.01] as Tuple,
    },
    states: { awake: state(160), asleep: state(160), output: state(160) },
  },
  /** Card px (360 × 482). */
  mobile: {
    watch: { x: [320, 220, 420, 1] as Tuple, y: [410, 270, 560, 1] as Tuple, scale: [0.55, 0.3, 0.9, 0.01] as Tuple },
    phone: { x: [55, -40, 140, 1] as Tuple, top: [-160, -300, 0, 1] as Tuple, width: [150, 90, 230, 1] as Tuple },
    momo: {
      y: [236, 100, 380, 1] as Tuple,
      size: [116, 70, 190, 1] as Tuple,
      lineY: [0, -100, 100, 1] as Tuple,
      lineEndLeft: [0.34, 0, 0.6, 0.005] as Tuple,
      lineEndRight: [0.34, 0, 0.6, 0.005] as Tuple,
      pillDistance: [1, 0.6, 1.6, 0.01] as Tuple,
    },
    states: { awake: state(90), asleep: state(90), output: state(90) },
  },
  /** Vertical nudge of each label inside its pill (px, + is down). "Pill text" shifts every label
   * (and, with "Icon y", every icon) on top of each label's own nudge below; both default to 0 so
   * nothing moves until dragged. */
  pillText: {
    textY: [0, -6, 6, 0.25] as Tuple,
    iconY: [0, -6, 6, 0.25] as Tuple,
    inputs: nudges(INPUT_LABELS),
    outputs: nudges(OUTPUT_LABELS),
  },
  /** The Momo logo at the top left of the Watch screen (Watch px, before the card's Watch scale). */
  watchLogo: {
    scale: [1, 0.5, 2.5, 0.01] as Tuple,
    x: [22, 0, 120, 0.5] as Tuple,
    y: [13, 0, 80, 0.5] as Tuple,
    color: { type: 'color' as const, default: '#FFFFFF' },
    /** Mark stroke widths in mark units (they scale with the logo); case study defaults. */
    outlineStroke: [4.5, 0.5, 12, 0.1] as Tuple,
    smileStroke: [3.4, 0.5, 8, 0.1] as Tuple,
    /** Space between the mark and the wordmark (Watch px; case study ratio ≈ 2.3). */
    textGapX: [2.3, -10, 24, 0.1] as Tuple,
    /** Wordmark offset from the mark's centre line (Watch px, + is down). */
    textY: [0, -10, 10, 0.1] as Tuple,
  },
}

export type MomoThumbValues = ResolvedValues<typeof MOMO_THUMB_CONFIG>

/** The Watch logo's CSS variables (read by .mc-logo in DeviceInsights.css). The thumbnail and the case
 *  study's Watch both apply these, so the two lockups stay identical. */
export const watchLogoVars = (l: MomoThumbValues['watchLogo']) => ({
  '--logo-scale': String(l.scale),
  '--logo-x': `${l.x}px`,
  '--logo-y': `${l.y}px`,
  '--logo-color': l.color,
  '--logo-outline': String(l.outlineStroke),
  '--logo-smile': String(l.smileStroke),
  '--logo-gap': `${l.textGapX}px`,
  '--logo-text-y': `${l.textY}px`,
})
