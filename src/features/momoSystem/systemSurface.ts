/**
 * Card surfaces for Momo: the mesh gradient, the frosted-glass treatment, and the
 * system card's fill + gradient shared with other panels (the story art cards), so
 * they keep the same colours while tuning their own glass to their own size.
 * MomoSystemFigure publishes; readers subscribe with useSystemBase().
 */
import { useSyncExternalStore } from 'react'

/** Mesh-style card gradient (after Craftwork's Prism Gradients): a deep corner, a blue body, a glow edge, fading to a light field. */
export const GRADIENT_PALETTES = {
  prism: { deep: '#1B1F2A', mid: '#3D8DBF', glow: '#73CBDD', light: '#EEF0F8' },
  momo: { deep: '#0B3A5C', mid: '#2FA6EA', glow: '#9BDCFF', light: '#F4F8FC' },
  dusk: { deep: '#221B3A', mid: '#5B6FD8', glow: '#B59CF0', light: '#F3F0FA' },
  lagoon: { deep: '#0E2E2E', mid: '#2E9C9A', glow: '#8FE3D4', light: '#EEF7F4' },
  ember: { deep: '#2A1714', mid: '#D8664A', glow: '#F6B48A', light: '#FBF3EE' },
} as const
export type GradientPalette = keyof typeof GRADIENT_PALETTES | 'custom'
export type GradientDials = { show: boolean; opacity: number; palette: GradientPalette; deep: string; mid: string; glow: string; light: string; spread: number; x: number; y: number }

/** Glass dials. Sizes are px; `edgeWidth`/`highlight` default to the system card's 1px rim and 1.5px top light. */
export type GlassDials = { tint: number; blur: number; saturate: number; edge: number; sheen: number; sheenAngle: number; glow: number; edgeWidth?: number; highlight?: number }

export type Surface = { fill: string; gradient: string; backdrop: string; edge: string; glow: string }

function paletteColors(g: GradientDials) {
  return g.palette === 'custom' ? g : GRADIENT_PALETTES[g.palette] ?? GRADIENT_PALETTES.prism
}

/** Layered radial gradients over a light field; `opacity` fades the whole gradient over the solid card fill. */
function cardGradient(g: GradientDials) {
  if (!g.show || g.opacity <= 0) return 'none'
  const c = paletteColors(g)
  const a = (color: string, strength = 1) => `color-mix(in srgb, ${color} ${Math.round(g.opacity * strength * 100)}%, transparent)`
  const s = g.spread
  const at = (x: number, y: number) => `${x + g.x}% ${y + g.y}%`
  return [
    `radial-gradient(${70 * s}% ${60 * s}% at ${at(0, 100)}, ${a(c.deep)} 0%, ${a(c.deep, 0)} 100%)`,
    `radial-gradient(${85 * s}% ${95 * s}% at ${at(0, 55)}, ${a(c.mid)} 0%, ${a(c.mid, 0.6)} 40%, ${a(c.mid, 0)} 100%)`,
    `radial-gradient(${75 * s}% ${65 * s}% at ${at(0, 0)}, ${a(c.glow)} 0%, ${a(c.glow, 0)} 100%)`,
    `linear-gradient(${a(c.light)}, ${a(c.light)})`,
  ].join(', ')
}

/** Soft palette blooms behind a glass card, so the backdrop blur has colour to refract. */
function glassGlow(g: GradientDials, strength: number) {
  const c = paletteColors(g)
  const a = (color: string, k = 1) => `color-mix(in srgb, ${color} ${Math.round(Math.min(1, strength * k) * 100)}%, transparent)`
  return [
    `radial-gradient(30% 28% at 24% 74%, ${a(c.mid)} 0%, ${a(c.mid, 0)} 100%)`,
    `radial-gradient(26% 26% at 76% 24%, ${a(c.glow)} 0%, ${a(c.glow, 0)} 100%)`,
    `radial-gradient(22% 20% at 60% 78%, ${a(c.deep, 0.5)} 0%, ${a(c.deep, 0)} 100%)`,
  ].join(', ')
}

/**
 * Fill + gradient, optionally as glass: the fill and gradient turn see-through (tint), the backdrop
 * blurs, and a white rim and sheen sit on top. The glow paints palette blooms behind the card.
 */
export function cardSurface(fill: string, gradient: GradientDials, glass: GlassDials | null): Surface {
  const rim = glass?.edgeWidth ?? 1
  const top = glass?.highlight ?? 1.5
  return {
    fill: glass ? `color-mix(in srgb, ${fill} ${Math.round(glass.tint * 100)}%, transparent)` : fill,
    gradient: [
      ...(glass && glass.sheen > 0 ? [`linear-gradient(${glass.sheenAngle}deg, rgb(255 255 255 / ${glass.sheen}) 0%, rgb(255 255 255 / 0) 42%, rgb(255 255 255 / 0) 68%, rgb(255 255 255 / ${glass.sheen * 0.5}) 100%)`] : []),
      cardGradient({ ...gradient, opacity: gradient.opacity * (glass ? glass.tint : 1) }),
    ].join(', '),
    backdrop: glass ? `blur(${glass.blur}px) saturate(${glass.saturate})` : 'none',
    edge: glass && glass.edge > 0
      ? `inset 0 0 0 ${rim}px rgb(255 255 255 / ${glass.edge}), inset 0 ${top}px 0 rgb(255 255 255 / ${Math.min(1, glass.edge * 1.5)})`
      : '0 0 #0000',
    glow: glass && glass.glow > 0 ? glassGlow(gradient, glass.glow) : 'none',
  }
}

/**
 * Card-only material finishes, matched to the seal artwork (an embossed, matte, cool-white stock).
 * The photo finishes are photographed stock with the seal (and, for `-logo`, the Momo lockup) already
 * embossed in; the card hides its own seal / lockup for them (MomoSystemFigure).
 */
export const MATERIAL_FINISHES = ['paper', 'satin', 'pewter', 'metal', 'paper-photo', 'paper-photo-logo', 'satin-photo-logo', 'white-photo-logo', 'blue-photo-logo'] as const
export type MaterialFinish = (typeof MATERIAL_FINISHES)[number]
/** `tone`: the paper's own colour (median of the artwork's centre), used as the card fill so the node discs match it. */
export type PhotoFinish = { src: string; /** width / height of the artwork */ aspect: number; logo: boolean; tone: string }
/** Artwork in public/work/momo/seal. The card takes the artwork's shape so it shows whole, never squashed. */
export const PHOTO_FINISHES: Partial<Record<MaterialFinish, PhotoFinish>> = {
  'paper-photo': { src: '/work/momo/seal/card-seal.webp', aspect: 1315 / 1197, logo: false, tone: '#F7F6F5' },
  'paper-photo-logo': { src: '/work/momo/seal/card-logo.webp', aspect: 1315 / 1197, logo: true, tone: '#F0F0EF' },
  'satin-photo-logo': { src: '/work/momo/seal/card-satin-logo.webp', aspect: 1315 / 1197, logo: true, tone: '#EBECED' },
  'white-photo-logo': { src: '/work/momo/seal/card-white-logo.webp', aspect: 1315 / 1197, logo: true, tone: '#F2F4F5' },
  'blue-photo-logo': { src: '/work/momo/seal/card-blue-logo.webp', aspect: 1315 / 1196, logo: true, tone: '#F2F6FB' },
}

// Fine paper tooth: monochrome fractal noise, tiled, kept faint so it reads as texture, not dirt.
const PAPER_GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.16 0 0 0 0 0.18 0 0 0 0 0.22 0 0 0 0.09 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>',
)}")`

/**
 * paper: matte cotton stock like the seal itself, fine tooth and a soft light, no shine.
 * satin: smooth pearl coating, a wide soft sheen and no grain.
 * pewter: a darker matte metal so the bright seal reads as a pressed medallion.
 * metal: brushed grey plate with a diagonal sheen band and horizontal brushing.
 * Photo finishes fill the card exactly (the card is shaped to the artwork). With `crop` (phone layout,
 * where the card can't take that shape) the artwork covers the card from its right edge, keeping the seal.
 */
export function materialSurface(finish: MaterialFinish, tone: string, crop = false): Surface {
  const lift = (k: number) => `color-mix(in srgb, ${tone}, white ${k}%)`
  const sink = (k: number) => `color-mix(in srgb, ${tone}, #2a2f38 ${k}%)`
  const lip = (top: number, bottom: number) =>
    `inset 0 1.5px 0 rgb(255 255 255 / ${top}), inset 0 0 0 1px rgb(255 255 255 / 0.5), inset 0 -1.5px 0 rgb(40 46 56 / ${bottom})`
  const layers: Record<'paper' | 'satin' | 'pewter' | 'metal', { fill: string; gradient: string[]; edge: string }> = {
    paper: {
      fill: lift(25),
      gradient: [
        PAPER_GRAIN,
        `radial-gradient(130% 100% at 20% 0%, ${lift(70)} 0%, ${lift(25)} 60%)`,
        `linear-gradient(180deg, ${lift(35)} 0%, ${lift(20)} 55%, ${tone} 100%)`,
      ],
      edge: lip(0.9, 0.06),
    },
    satin: {
      fill: lift(15),
      gradient: [
        'linear-gradient(160deg, rgb(255 255 255 / 0) 18%, rgb(255 255 255 / 0.5) 42%, rgb(255 255 255 / 0) 70%)',
        `radial-gradient(90% 70% at 85% 100%, ${sink(5)} 0%, ${lift(15)} 70%)`,
        `linear-gradient(180deg, ${lift(45)} 0%, ${lift(15)} 50%, ${tone} 100%)`,
      ],
      edge: lip(0.95, 0.08),
    },
    pewter: {
      fill: sink(14),
      gradient: [
        PAPER_GRAIN,
        `radial-gradient(120% 90% at 18% 0%, ${sink(2)} 0%, ${sink(14)} 70%)`,
        `linear-gradient(180deg, ${sink(6)} 0%, ${sink(14)} 50%, ${sink(22)} 100%)`,
      ],
      edge: lip(0.7, 0.14),
    },
    metal: {
      fill: tone,
      gradient: [
        'repeating-linear-gradient(0deg, rgb(255 255 255 / 0.05) 0 1px, rgb(0 0 0 / 0.018) 1px 2px, rgb(255 255 255 / 0) 2px 3px)',
        'linear-gradient(118deg, rgb(255 255 255 / 0) 22%, rgb(255 255 255 / 0.42) 38%, rgb(255 255 255 / 0) 54%, rgb(255 255 255 / 0.22) 72%, rgb(255 255 255 / 0) 86%)',
        `radial-gradient(120% 90% at 18% 0%, ${lift(55)} 0%, ${lift(0)} 70%)`,
        `linear-gradient(180deg, ${lift(20)} 0%, ${tone} 45%, ${sink(8)} 100%)`,
      ],
      edge: lip(0.95, 0.1),
    },
  }
  const photo = PHOTO_FINISHES[finish]
  if (photo) {
    const fit = crop ? 'right center / cover' : 'center / 100% 100%'
    return { fill: photo.tone, gradient: `url("${photo.src}") ${fit} no-repeat`, backdrop: 'none', edge: lip(0.6, 0.05), glow: 'none' }
  }
  const l = layers[finish as keyof typeof layers] ?? layers.paper
  return { fill: l.fill, gradient: l.gradient.join(', '), backdrop: 'none', edge: l.edge, glow: 'none' }
}

/** The system card's colour base (fill + gradient), shared with the story art cards. */
export type SystemBase = { fill: string; gradient: GradientDials }
let base: SystemBase | null = null
let baseKey = ''
const listeners = new Set<() => void>()

export function publishSystemBase(next: SystemBase) {
  const key = JSON.stringify(next)
  if (key === baseKey) return
  baseKey = key
  base = next
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const get = () => base

/** The system card's fill + gradient, or null until it has published. */
export function useSystemBase(): SystemBase | null {
  return useSyncExternalStore(subscribe, get, get)
}
