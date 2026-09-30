/**
 * Dials for the card → project expansion. Pick a named preset, or `custom` to
 * drive every value from the dials below it. "Preview" plays the expansion on
 * the Harvard & MIT card.
 */
import { useCallback, useRef } from 'react'
import type { Route } from '../../lib/router'
import { useTuning } from '../../tuning/useTuning'
import type { Easing, Spring } from '../pageTransition/cssTiming'
import { CONTENT_FEELS, OPEN_EFFECTS, openProject, type ContentFeel, type Edges, type OpenEffect, type OpenSpec } from './projectOpen'

type Tuple = [number, number, number, number]
type Look = Pick<OpenSpec, 'endRadius' | 'cornerZone' | 'titleFade' | 'dim' | 'revealMs' | 'momoFlight' | 'momoHoldSeconds' | 'contentStrength' | 'contentFade'> & {
  effect: OpenEffect
  contentFeel: ContentFeel
}

const even: Edges = { top: 0, right: 0, bottom: 0, left: 0 }
const bezier = (duration: number, ease: [number, number, number, number]): Easing => ({ type: 'easing', duration, ease })

/** Named presets: timing and per-edge delays. Look dials (radius, title, dim, reveal) apply to all of them. */
export const OPEN_PRESETS: Record<string, { timing: Easing | Spring; delay: Edges }> = {
  /** Even, symmetric ease-in-out: calm and predictable. */
  glide: { timing: bezier(0.8, [0.65, 0, 0.35, 1]), delay: even },
  /** Fast start, long soft landing. */
  swift: { timing: bezier(0.7, [0.16, 1, 0.3, 1]), delay: even },
  /** Critically-damped-ish spring with a hint of settle in the corners. */
  spring: { timing: { type: 'spring', visualDuration: 0.6, bounce: 0.12 }, delay: even },
  /** Top edge leads, sides follow, bottom arrives last: the card unfolds downward. */
  unfold: { timing: bezier(0.95, [0.76, 0, 0.24, 1]), delay: { top: 0, right: 0.08, bottom: 0.16, left: 0.08 } },
  /** Top-left corner reaches its viewport corner first, bottom-right last: a diagonal sweep. */
  cascade: { timing: bezier(0.95, [0.65, 0, 0.35, 1]), delay: { top: 0, right: 0.14, bottom: 0.14, left: 0 } },
}

const CONFIG = {
  /** How the card becomes the page (see OPEN_EFFECTS); the preset below sets its timing. */
  effect: { type: 'select' as const, options: [...OPEN_EFFECTS], default: 'expand' },
  /** Unwind: Momo flies from the card into the nav's Momo. */
  momoFlight: false,
  /** Unwind: seconds Momo keeps animating after the click before it flies into the nav (a tap or key skips it). */
  momoHoldSeconds: [1, 0, 5, 0.05] as Tuple,
  preset: { type: 'select' as const, options: [...Object.keys(OPEN_PRESETS), 'custom'], default: 'glide' },
  preview: { type: 'action' as const, label: 'Preview (open Harvard & MIT)' },
  previewUnwind: { type: 'action' as const, label: 'Preview (open Unwind)' },
  previewEcofabriq: { type: 'action' as const, label: 'Preview (open EcoFabriq)' },
  /** EcoFabriq / Harvard & MIT: how the card's artwork moves while the card grows. */
  content: {
    feel: { type: 'select' as const, options: [...CONTENT_FEELS], default: 'grow' },
    strength: [1, 0, 2, 0.05] as Tuple,
    /** Share of the run, at its end, over which the artwork fades out (0 = stays to the end). */
    fade: [0, 0, 1, 0.01] as Tuple,
  },
  look: {
    /** expand: corners square off as the card's edges come within this many px of the screen edge. */
    cornerZone: [140, 0, 600, 1] as Tuple,
    endRadius: [0, 0, 60, 1] as Tuple,
    titleFade: [0.45, 0, 1, 0.01] as Tuple,
    dim: [0.35, 0, 0.9, 0.01] as Tuple,
    revealMs: [420, 0, 1200, 10] as Tuple,
  },
  custom: {
    timing: { type: 'easing' as const, duration: 0.85, ease: [0.65, 0, 0.35, 1] as [number, number, number, number] },
    delayTop: [0, 0, 0.5, 0.01] as Tuple,
    delayRight: [0, 0, 0.5, 0.01] as Tuple,
    delayBottom: [0, 0, 0.5, 0.01] as Tuple,
    delayLeft: [0, 0, 0.5, 0.01] as Tuple,
    _collapsed: true,
  },
}

export function useProjectOpen(): (card: HTMLElement, route: Route) => void {
  const specRef = useRef<OpenSpec | null>(null)
  const t = useTuning('Project open', CONFIG, {
    onAction: (action) => {
      const route =
        action === 'preview' ? 'harvard-mit' : action === 'previewUnwind' ? 'unwind' : action === 'previewEcofabriq' ? 'ecofabriq' : null
      if (!route) return
      const card = document.querySelector<HTMLElement>(`[data-work="${route}"]`)
      if (!card || !specRef.current) return
      card.scrollIntoView({ block: 'center' })
      requestAnimationFrame(() => openProject(card, route, specRef.current!))
    },
  })

  const look: Look = {
    ...t.look,
    effect: t.effect as OpenEffect,
    momoFlight: t.momoFlight,
    momoHoldSeconds: t.momoHoldSeconds,
    contentFeel: t.content.feel as ContentFeel,
    contentStrength: t.content.strength,
    contentFade: t.content.fade,
  }
  const named = OPEN_PRESETS[t.preset]
  specRef.current = named
    ? { ...look, ...named }
    : {
        ...look,
        timing: t.custom.timing as Easing | Spring,
        delay: {
          top: t.custom.delayTop,
          right: t.custom.delayRight,
          bottom: t.custom.delayBottom,
          left: t.custom.delayLeft,
        },
      }

  return useCallback((card, route) => openProject(card, route, specRef.current!), [])
}
