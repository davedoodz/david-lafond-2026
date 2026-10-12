/**
 * The creature's DialKit panel. Shared by the About page's contribution graph and the studio page
 * (studio/grass-pokemon.html); both read and save "GrassCreature" in src/data/tuning.json, so
 * whatever is tuned in one shows in the other and ships as-is.
 */
import type { ResolvedValues } from 'dialkit'
import type { CreatureLook } from './creature'

type Tuple = [number, number, number, number]
const color = (hex: string) => ({ type: 'color' as const, default: hex })

export const CREATURE_CONFIG = {
  replay: { type: 'action' as const, label: 'Replay' },
  pause: { type: 'action' as const, label: 'Pause / Play' },
  appear: {
    preset: {
      type: 'select' as const,
      options: [
        { value: 'pop', label: 'Pop (hop out)' },
        { value: 'peek', label: 'Peek, then hop out' },
        { value: 'burst', label: 'Burst (big leap)' },
        { value: 'rise', label: 'Rise (slow, no jump)' },
      ],
      default: 'pop',
    },
    /** Multiplies the preset's timings: lower is snappier. */
    time: [1, 0.4, 2.5, 0.05] as Tuple,
  },
  exclaim: {
    style: {
      type: 'select' as const,
      options: [
        { value: 'bubble', label: 'Speech bubble' },
        { value: 'classic', label: 'Game box' },
        { value: 'comic', label: 'Comic' },
        { value: 'burst', label: 'Starburst' },
        { value: 'emoji', label: 'Emoji' },
        { value: 'none', label: 'None' },
      ],
      default: 'bubble',
    },
    /** How the Game box style enters (other styles ignore it). */
    boxMotion: {
      type: 'select' as const,
      options: [
        { value: 'step', label: 'Step up' },
        { value: 'jump', label: 'Double jump' },
        { value: 'drop', label: 'Drop + bounce' },
        { value: 'blink', label: 'Blink in' },
        { value: 'grow', label: 'Pixel grow' },
        { value: 'stretch', label: 'Stretch up' },
        { value: 'rattle', label: 'Rattle' },
        { value: 'wipe', label: 'Wipe up' },
      ],
      default: 'step',
    },
    size: [1, 0.5, 2.5, 0.05] as Tuple,
    /** Extra height above the head (px). */
    lift: [0, -60, 80, 1] as Tuple,
  },
  motion: {
    size: [1.15, 0.4, 2, 0.01] as Tuple,
    speed: [1, 0.3, 2, 0.05] as Tuple,
    /** Patches it darts through before diving back in. */
    hops: [3, 0, 6, 1] as Tuple,
  },
  body: {
    color: color('#f6cf3c'),
    width: [1, 0.6, 1.5, 0.01] as Tuple,
    height: [1, 0.6, 1.5, 0.01] as Tuple,
    headSize: [1, 0.7, 1.4, 0.01] as Tuple,
    _collapsed: true,
  },
  ears: {
    length: [1, 0.5, 1.6, 0.01] as Tuple,
    width: [1, 0.5, 1.6, 0.01] as Tuple,
    /** Resting outward angle (rad). */
    spread: [0.42, 0, 1.2, 0.01] as Tuple,
    tipColor: color('#1a1714'),
    /** Where the dark tip starts: lower paints more of the ear. */
    tip: [0.42, -1, 1, 0.01] as Tuple,
    _collapsed: true,
  },
  face: {
    eyeColor: color('#1a1714'),
    eyeSize: [1, 0.5, 1.8, 0.01] as Tuple,
    eyeSpacing: [1, 0.6, 1.5, 0.01] as Tuple,
    highlight: true,
    cheekColor: color('#e2432e'),
    /** 0 hides the cheeks. */
    cheekSize: [1, 0, 2, 0.01] as Tuple,
    _collapsed: true,
  },
  tail: {
    show: true,
    size: [1, 0.4, 1.8, 0.01] as Tuple,
    _collapsed: true,
  },
  stripes: {
    show: true,
    color: color('#7c4a1e'),
    _collapsed: true,
  },
  shading: {
    gloss: [0.12, 0, 1, 0.01] as Tuple,
    rim: [0.22, 0, 1, 0.01] as Tuple,
    /** Brightness at the roots, so it sits in the patch's shade (1 = none). */
    groundShade: [0.55, 0, 1, 0.01] as Tuple,
    _collapsed: true,
  },
}

export type CreatureValues = ResolvedValues<typeof CREATURE_CONFIG>
export type CreatureAction = 'replay' | 'pause'

export function lookFrom({ body, ears, face, tail, stripes, shading }: CreatureValues): CreatureLook {
  return {
    bodyColor: body.color,
    bodyWidth: body.width,
    bodyHeight: body.height,
    headSize: body.headSize,
    earLength: ears.length,
    earWidth: ears.width,
    earSpread: ears.spread,
    earTipColor: ears.tipColor,
    earTip: ears.tip,
    eyeColor: face.eyeColor,
    eyeSize: face.eyeSize,
    eyeSpacing: face.eyeSpacing,
    eyeHighlight: face.highlight,
    cheekColor: face.cheekColor,
    cheekSize: face.cheekSize,
    tail: tail.show,
    tailSize: tail.size,
    stripes: stripes.show,
    stripeColor: stripes.color,
    gloss: shading.gloss,
    rim: shading.rim,
    groundShade: shading.groundShade,
  }
}
