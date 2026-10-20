/**
 * DialKit config for the 'Davebot' panel. Imported by both `GhostButton`
 * (nav size) and `DavebotLayer` (everything else) so the two share one
 * live-tunable source of truth under a single panel name.
 */

export const DAVEBOT_PANEL = 'Davebot'

/** Graphite: dark warm grey body (#3A3836), on dark and light pages alike. The eyes are always paper (ghost.css). */
const GRAPHITE = '#3a3836'

/** CSS fill for the ghost body from the 'ghost → color' dial; undefined keeps the stylesheet default. */
export function ghostFill(ghost: { color: string; customColor: string }): string | undefined {
  if (ghost.color === 'graphite') return GRAPHITE
  // The idle nav links' colour on this page (e.g. RESUME at the top), fixed per page: it does not
  // follow the links' tone changes while scrolling (ghost.css).
  if (ghost.color === 'nav link') return 'var(--ghost-link-body)'
  if (ghost.color === 'gray text') return 'var(--text-muted)'
  if (ghost.color === 'custom') return ghost.customColor
  return undefined
}

const springField = (visualDuration: number, bounce: number) => ({ type: 'spring' as const, visualDuration, bounce })
const colorField = (value: string) => ({ type: 'color' as const, default: value })
const textField = (value: string) => ({ type: 'text' as const, default: value })

/** Chat box looks, switchable from the DialKit 'Davebot → box → style' select. */
export const DAVEBOT_STYLES = ['classic', 'glass', 'minimal', 'soft', 'paper'] as const

export const DAVEBOT_CONFIG = {
  box: {
    style: { type: 'select' as const, options: [...DAVEBOT_STYLES], default: 'classic' },
    backdropOpacity: [0.66, 0, 1, 0.01] as [number, number, number, number],
    _collapsed: false,
  },
  ghost: {
    navSize: [28, 20, 40, 1] as [number, number, number, number],
    zoomSize: [160, 96, 240, 2] as [number, number, number, number],
    offsetX: [0, -300, 300, 1] as [number, number, number, number],
    offsetY: [0, -200, 200, 1] as [number, number, number, number],
    paletteWidth: [560, 360, 720, 4] as [number, number, number, number],
    /** Body colour (the eyes are always paper). default: light gray (darker on light pages);
     *  graphite: dark warm grey; nav link: the idle nav links' colour (RESUME); gray text: the site's
     *  muted text gray (--text-muted, e.g. "a product designer."); custom: the colour below. */
    color: { type: 'select' as const, options: ['default', 'graphite', 'nav link', 'gray text', 'custom'], default: 'default' },
    customColor: colorField('#a6a09c'),
    morph: springField(0.4, 0.15),
    _collapsed: false,
  },
  /** Hovering the centred Davebot's body: eyes squint into ^ ^ arcs and the cheeks blush. */
  happy: {
    inTime: [0.1, 0.05, 1.5, 0.01] as [number, number, number, number],
    outTime: [0.1, 0.05, 2, 0.01] as [number, number, number, number],
    arcCurve: [2.2, 0.4, 4, 0.05] as [number, number, number, number],
    arcWidth: [3.85, 2.5, 5.5, 0.05] as [number, number, number, number],
    arcStroke: [2, 0.8, 2.4, 0.05] as [number, number, number, number],
    arcRaise: [0.2, -1.5, 1.5, 0.05] as [number, number, number, number],
    squint: [0.31, 0, 0.6, 0.01] as [number, number, number, number],
    blushColor: colorField('#e9b4c0'),
    blushAmount: [1, 0, 1, 0.01] as [number, number, number, number],
    blushWidth: [2.2, 0.8, 4, 0.05] as [number, number, number, number],
    blushHeight: [1.2, 0.4, 2.5, 0.05] as [number, number, number, number],
    blushSoftness: [1, 0, 1, 0.01] as [number, number, number, number],
    blushSpread: [6.2, 4, 9, 0.05] as [number, number, number, number],
    blushY: [17.8, 15, 21, 0.05] as [number, number, number, number],
    blushLag: [0.2, 0, 0.6, 0.01] as [number, number, number, number],
    _collapsed: true,
  },
  highlight: {
    show: true,
    color: colorField('#f2b544'),
    _collapsed: false,
  },
  /** Highlighting text: Davebot hops and a pill offers to answer about it. */
  selection: {
    enabled: true,
    pill: textField('Ask me about this'),
    /** Question sent with the highlighted text when the reader clicks. */
    prompt: textField('Tell me more about'),
    /** Ignore tiny selections (characters). */
    minChars: [3, 1, 40, 1] as [number, number, number, number],
    hopMs: [620, 200, 1400, 10] as [number, number, number, number],
    hopHeight: [7, 0, 16, 0.5] as [number, number, number, number],
    _collapsed: false,
  },
  text: {
    placeholder: textField('Ask Davebot anything…'),
    suggestedLabel: textField('Suggested'),
    suggestion1: textField('What work is here?'),
    suggestion2: textField('Tell me about Momo'),
    suggestion3: textField('Can I hire David?'),
    askRowLabel: textField('ask'),
    footerLeft: textField("Davebot · don't share secrets"),
    footerHintMove: textField('\u2191\u2193 move'),
    footerHintSelect: textField('\u21B5 select'),
    footerHintClose: textField('esc close'),
    _collapsed: true,
  },
  visible: {
    suggestedLabel: true,
    suggestion1: true,
    suggestion2: true,
    suggestion3: true,
    askLabel: true,
    footer: true,
    footerLeftText: true,
    footerHintMove: true,
    footerHintSelect: true,
    footerHintClose: true,
    _collapsed: true,
  },
}
