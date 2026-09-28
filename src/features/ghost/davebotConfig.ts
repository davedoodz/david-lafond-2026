/**
 * DialKit config for the 'Davebot' panel. Imported by both `GhostButton`
 * (nav size) and `DavebotLayer` (everything else) so the two share one
 * live-tunable source of truth under a single panel name.
 */

export const DAVEBOT_PANEL = 'Davebot'

const springField = (visualDuration: number, bounce: number) => ({ type: 'spring' as const, visualDuration, bounce })
const colorField = (value: string) => ({ type: 'color' as const, default: value })
const textField = (value: string) => ({ type: 'text' as const, default: value })

/** Chat box looks, switchable from the DialKit 'Davebot → box → style' select. */
export const DAVEBOT_STYLES = ['classic', 'glass', 'minimal', 'soft', 'paper'] as const

export const DAVEBOT_CONFIG = {
  box: {
    style: { type: 'select' as const, options: [...DAVEBOT_STYLES], default: 'classic' },
    _collapsed: false,
  },
  ghost: {
    navSize: [28, 20, 40, 1] as [number, number, number, number],
    zoomSize: [160, 96, 240, 2] as [number, number, number, number],
    offsetX: [0, -300, 300, 1] as [number, number, number, number],
    offsetY: [0, -200, 200, 1] as [number, number, number, number],
    paletteWidth: [560, 360, 720, 4] as [number, number, number, number],
    morph: springField(0.4, 0.15),
    _collapsed: false,
  },
  highlight: {
    show: true,
    color: colorField('#f2b544'),
    _collapsed: false,
  },
  text: {
    placeholder: textField('Ask Davebot anything…'),
    suggestedLabel: textField('Suggested'),
    suggestion1: textField('What work is here?'),
    suggestion2: textField('Tell me about Unwind'),
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
