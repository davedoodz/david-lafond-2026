/** Project opening mirrors the Back sheet: rounded leading corners, trailing-page drift,
 * and corners that square only over the final 20%. CSS reuses Back's keyframes. */
import { flushSync } from 'react-dom'
import { toCssTiming, type Easing, type Spring } from '../pageTransition/cssTiming'
import { pinIfVisible } from '../pageTransition/PageTransitions'

export type SlideFeel = {
  motion: Easing | Spring
  delay: number
  oldDuration: number
  oldDrift: number
  oldOpacity: number
  radius: number
}

const feel = (duration: number, delay: number): SlideFeel => ({
  motion: { type: 'easing', duration, ease: [0.65, 0, 0.35, 1] },
  delay, oldDuration: duration, oldDrift: 180, oldOpacity: 0.55, radius: 48,
})

export const SLIDE_FEELS: Record<string, SlideFeel> = {
  snappy: feel(0.5, -0.09),
  quick: feel(0.38, -0.07),
  smooth: feel(0.7, -0.12),
  'match back': feel(1.1, -0.2),
}

/** `finished`, not a timer, releases the slide state even when the browser skips the transition. */
export async function slideIn(feel: SlideFeel, pageReady: Promise<unknown>, commit: () => void) {
  const root = document.documentElement
  const { duration, easing } = toCssTiming(feel.motion)
  const properties = {
    '--po-slide-dur': duration,
    '--po-slide-ease': easing,
    '--po-slide-delay': `${feel.delay}s`,
    '--po-slide-out-delay': `${Math.min(0, feel.delay)}s`,
    '--po-slide-out-dur': `${feel.oldDuration}s`,
    '--po-slide-drift': `${feel.oldDrift}px`,
    '--po-slide-opacity': String(feel.oldOpacity),
    '--po-slide-radius': `${feel.radius}px`,
  }
  for (const [name, value] of Object.entries(properties)) root.style.setProperty(name, value)
  root.dataset.po = 'slide'
  // Nav is a single persistent instance (App.tsx): pin it so it crossfades its own
  // look (dark ↔ light) in place instead of riding along with the page drift.
  pinIfVisible('.nav', 'data-vt-pin-nav')
  try {
    const transition = document.startViewTransition(async () => {
      await pageReady
      flushSync(commit)
    })
    await transition.finished
  } finally {
    root.removeAttribute('data-vt-pin-nav')
    delete root.dataset.po
    for (const name of Object.keys(properties)) root.style.removeProperty(name)
  }
}
