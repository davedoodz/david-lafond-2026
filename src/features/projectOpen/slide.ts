/**
 * Project card → project page, "slide": the project page arrives as a card from the right,
 * sliding right to left over the Work page, and squares its corners as it lands.
 *
 * Runs on a View Transition: both pages are snapshots, animated with the Web Animations API
 * on their pseudo-elements, so neither page re-lays out mid-slide. (Snapshots ignore
 * border-radius and box-shadow, so the corners are a clip-path and depth comes from the
 * Work page dimming and shrinking.)
 */
import { flushSync } from 'react-dom'
import { toCssTiming, type Easing, type Spring } from '../pageTransition/cssTiming'

export type SlideFeel = {
  motion: Easing | Spring
  /** How far the Work page drifts left under the incoming card (px). */
  drift: number
  /** How far the Work page shrinks back (1 = not at all); the site's dark backdrop shows around it. */
  scale: number
  /** How much the Work page darkens under the card (0 = not at all). */
  dim: number
  /** Leading corners of the moving card (px); they square off as it lands. */
  radius: number
}

const bezier = (duration: number, ease: [number, number, number, number]): Easing => ({ type: 'easing', duration, ease })

export const SLIDE_FEELS: Record<string, SlideFeel> = {
  /** Quick start, long soft landing. */
  smooth: { motion: bezier(0.7, [0.22, 1, 0.36, 1]), drift: 60, scale: 1, dim: 0.12, radius: 24 },
  /** Both pages travel together on one long, even curve. */
  glide: { motion: bezier(1.1, [0.65, 0, 0.35, 1]), drift: 180, scale: 1, dim: 0.18, radius: 48 },
  /** Short and decisive. */
  snappy: { motion: bezier(0.45, [0.2, 0.9, 0.1, 1]), drift: 36, scale: 1, dim: 0.08, radius: 20 },
  /** A light spring: the card settles with a small overshoot. */
  spring: { motion: { type: 'spring', visualDuration: 0.55, bounce: 0.15 }, drift: 80, scale: 1, dim: 0.12, radius: 28 },
  /** Like an iOS push: the Work page trails a third of the way behind the card. */
  parallax: { motion: bezier(0.8, [0.32, 0.72, 0, 1]), drift: 420, scale: 1, dim: 0.2, radius: 16 },
  /** The Work page sinks back and darkens, like a sheet stacking on top of it. */
  stack: { motion: bezier(0.8, [0.32, 0.72, 0, 1]), drift: 0, scale: 0.94, dim: 0.3, radius: 32 },
  /** Unhurried: a long ease-in-out with a wide drift. */
  slow: { motion: bezier(1.4, [0.45, 0, 0.15, 1]), drift: 160, scale: 1, dim: 0.22, radius: 40 },
}

/** Plays the slide; `commit` mounts the project page (inside the transition's update). */
export async function slideIn(feel: SlideFeel, pageReady: Promise<unknown>, commit: () => void) {
  const root = document.documentElement
  root.dataset.po = 'slide'
  const transition = document.startViewTransition(async () => {
    await pageReady.catch(() => {})
    flushSync(commit)
  })
  // Animations on the root's pseudo-elements outlive the transition; cancel them after, or
  // their filled end state would carry into the next transition.
  const animations: Animation[] = []
  try {
    await transition.ready
    const { duration, easing } = toCssTiming(feel.motion)
    const timing = { duration: parseFloat(duration) * 1000, easing, fill: 'both' as const }
    const r = feel.radius
    animations.push(
      root.animate(
        [
          { transform: `translateX(${root.clientWidth}px)`, clipPath: `inset(0 round ${r}px 0 0 ${r}px)` },
          { transform: 'translateX(0)', clipPath: 'inset(0 round 0)' },
        ],
        { ...timing, pseudoElement: '::view-transition-new(root)' },
      ),
      root.animate(
        [
          { transform: 'translateX(0) scale(1)', filter: 'brightness(1)' },
          { transform: `translateX(${-feel.drift}px) scale(${feel.scale})`, filter: `brightness(${1 - feel.dim})` },
        ],
        { ...timing, pseudoElement: '::view-transition-old(root)' },
      ),
    )
    await transition.finished
  } finally {
    for (const animation of animations) animation.cancel()
    delete root.dataset.po
  }
}
