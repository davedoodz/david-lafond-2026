/**
 * Load-in animation for the hero copy (Work) and the story (About).
 *
 * Mark elements with `data-enter={n}`; element n starts `delay + n × stagger` after mount and
 * rises/fades/unblurs in (opacity, translate, filter only). It plays every time the page mounts:
 * on load/refresh and when switching between Work and About (it runs inside the page wipe).
 * Tuned in the DialKit "Entrance" panel; "Replay" re-runs it in place.
 */
import { useState, type CSSProperties } from 'react'
import { useTuningController } from '../tuning/useTuning'
import { usePrefersReducedMotion } from './viewport'

type Tuple = [number, number, number, number]

const CONFIG = {
  durationMs: [900, 100, 2500, 10] as Tuple,
  delayMs: [150, 0, 1500, 10] as Tuple,
  staggerMs: [110, 0, 600, 5] as Tuple,
  distance: [18, 0, 80, 1] as Tuple,
  blur: [8, 0, 24, 0.5] as Tuple,
  ease: {
    type: 'select' as const,
    options: ['expo-out', 'quart-out', 'back-out', 'linear-ish'],
    default: 'expo-out',
  },
  replay: { type: 'action' as const, label: 'Replay' },
}

const EASES: Record<string, string> = {
  'expo-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
  'quart-out': 'cubic-bezier(0.25, 1, 0.5, 1)',
  'back-out': 'cubic-bezier(0.34, 1.4, 0.64, 1)',
  'linear-ish': 'cubic-bezier(0.4, 0.2, 0.6, 0.8)',
}

export function useEntrance(): { className: string; style: CSSProperties } {
  const reducedMotion = usePrefersReducedMotion()
  const [playing, setPlaying] = useState(true)
  const { values } = useTuningController('Entrance', CONFIG, {
    onAction: (action) => {
      if (action !== 'replay') return
      // Drop the class for one frame so the CSS animations restart from their first keyframe.
      setPlaying(false)
      requestAnimationFrame(() => requestAnimationFrame(() => setPlaying(true)))
    },
  })

  return {
    className: playing && !reducedMotion ? 'entrance' : '',
    style: {
      '--enter-ms': `${values.durationMs}ms`,
      '--enter-delay': `${values.delayMs}ms`,
      '--enter-stagger': `${values.staggerMs}ms`,
      '--enter-y': `${values.distance}px`,
      '--enter-blur': `${values.blur}px`,
      '--enter-ease': EASES[values.ease] ?? EASES['expo-out'],
    } as CSSProperties,
  }
}
