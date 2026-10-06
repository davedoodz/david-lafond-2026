/**
 * Card surfaces for Unwind: the mesh gradient, the frosted-glass treatment, and the
 * system card's fill + gradient shared with other panels (the story art cards), so
 * they keep the same colours while tuning their own glass to their own size.
 * UnwindSystemFigure publishes; readers subscribe with useSystemBase().
 */
import { useSyncExternalStore } from 'react'

/** Mesh-style card gradient (after Craftwork's Prism Gradients): a deep corner, a blue body, a glow edge, fading to a light field. */
export const GRADIENT_PALETTES = {
  prism: { deep: '#1B1F2A', mid: '#3D8DBF', glow: '#73CBDD', light: '#EEF0F8' },
  unwind: { deep: '#0B3A5C', mid: '#2FA6EA', glow: '#9BDCFF', light: '#F4F8FC' },
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
