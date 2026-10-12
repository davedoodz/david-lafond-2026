/**
 * Work page ⇄ project page. A project page is a card laid over a strip of the Work page
 * (the rail, see Nav). Opening a project, the card slides in from the right over the Work
 * page; going back, it slides off to the right and uncovers it. The rail is its own
 * transition layer, so it moves separately from the card.
 *
 * Runs on a View Transition: the card and the Work page are snapshots, animated with the
 * Web Animations API on their pseudo-elements, so neither page re-lays out mid-slide.
 * The feel (timing, drift, dim, corners, rail) comes from "Page transition → projectSlide".
 */
import { toCssTiming, type Easing, type Spring } from './cssTiming'

export const RAIL_MOTIONS = ['slide', 'fade'] as const
export type RailMotion = (typeof RAIL_MOTIONS)[number]

export type SlideFeel = {
  motion: Easing | Spring
  /** How far the Work page drifts left under the incoming card (px). */
  drift: number
  /** How much the Work page darkens under the card (0 = not at all). */
  dim: number
  /** Leading corners of the moving card (px); the bottom one squares off as it lands. */
  radius: number
  /** How the strip beside the card arrives and leaves. */
  rail: RailMotion
}

const bezier = (duration: number, ease: [number, number, number, number]): Easing => ({ type: 'easing', duration, ease })

export const SLIDE_FEELS: Record<string, SlideFeel> = {
  /** Quick start, long soft landing. */
  smooth: { motion: bezier(0.7, [0.22, 1, 0.36, 1]), drift: 60, dim: 0.12, radius: 24, rail: 'slide' },
  /** Both pages travel together on one long, even curve (David's tuned back wipe). */
  glide: { motion: bezier(1.1, [0.65, 0, 0.35, 1]), drift: 180, dim: 0.18, radius: 48, rail: 'slide' },
  /** Short and decisive. */
  snappy: { motion: bezier(0.45, [0.2, 0.9, 0.1, 1]), drift: 36, dim: 0.08, radius: 20, rail: 'slide' },
  /** A light spring: the card settles with a small overshoot. */
  spring: { motion: { type: 'spring', visualDuration: 0.55, bounce: 0.15 }, drift: 80, dim: 0.12, radius: 28, rail: 'slide' },
  /** Gentle landing, big soft corners, the Work page barely moves; the strip fades. */
  soft: { motion: bezier(0.85, [0.16, 1, 0.3, 1]), drift: 24, dim: 0.06, radius: 48, rail: 'fade' },
  /** Unhurried: a long ease-in-out with a wide drift. */
  slow: { motion: bezier(1.4, [0.45, 0, 0.15, 1]), drift: 160, dim: 0.22, radius: 40, rail: 'slide' },
}

let feel: SlideFeel = SLIDE_FEELS.smooth

/** Set by PageTransitions from its dials. */
export function setProjectSlide(next: SlideFeel) {
  feel = next
}

/** The rail's width and the project card's resting top-left radius, from the project page on screen. */
function measure() {
  const rail = document.querySelector('.project-rail')
  const card = document.querySelector('.site[data-rail]')
  return {
    rail: rail?.getBoundingClientRect().width ?? 0,
    corner: card ? parseFloat(getComputedStyle(card).borderTopLeftRadius) || 0 : 0,
  }
}

/**
 * Animates `transition`. Call it right after `startViewTransition`, before the update runs:
 * going 'out', the project page is measured before it leaves.
 */
let current: ViewTransition | null = null

export async function playProjectSlide(transition: ViewTransition, direction: 'in' | 'out') {
  const root = document.documentElement
  current = transition
  root.dataset.projectSlide = direction
  let page = direction === 'out' ? measure() : { rail: 0, corner: 0 }
  // Animations on the root's pseudo-elements outlive the transition; cancel them after, or
  // their filled end state would carry into the next transition's snapshots.
  const animations: Animation[] = []
  try {
    await transition.ready
    if (direction === 'in') page = measure()
    const { rail, corner } = page
    const travel = root.clientWidth - rail
    const { duration, easing } = toCssTiming(feel.motion)
    const timing = { duration: parseFloat(duration) * 1000, easing, fill: 'both' as const }
    const side = direction === 'in' ? 'new' : 'old'
    const under = direction === 'in' ? 'old' : 'new'
    // Keyframes are written for 'in'; 'out' plays the same path backwards.
    const path = <T>(from: T, to: T) => (direction === 'in' ? [from, to] : [to, from])
    const r = feel.radius
    // The card is the page minus the strip under the rail; clip that strip away while it moves.
    // Moving, both leading corners are rounded; at rest, only the card's own top-left corner.
    animations.push(
      root.animate(
        path(
          { transform: `translateX(${travel}px)`, clipPath: `inset(0 0 0 ${rail}px round ${r}px 0 0 ${r}px)` },
          { transform: 'translateX(0)', clipPath: `inset(0 0 0 ${rail}px round ${corner}px 0 0 0)` },
        ),
        { ...timing, pseudoElement: `::view-transition-${side}(root)` },
      ),
      root.animate(
        path(
          { transform: 'translateX(0)', filter: 'brightness(1)' },
          { transform: `translateX(${-feel.drift}px)`, filter: `brightness(${1 - feel.dim})` },
        ),
        { ...timing, pseudoElement: `::view-transition-${under}(root)` },
      ),
    )
    if (rail) {
      animations.push(
        root.animate(
          feel.rail === 'slide'
            ? path({ transform: 'translateX(-100%)' }, { transform: 'translateX(0)' })
            : path({ opacity: 0 }, { opacity: 1 }),
          { ...timing, pseudoElement: `::view-transition-${side}(project-rail)` },
        ),
      )
    }
    await transition.finished
  } finally {
    for (const animation of animations) animation.cancel()
    // A newer slide may have started; only clean up our own state.
    if (current === transition) {
      current = null
      delete root.dataset.projectSlide
    }
  }
}
