import type { Transition } from 'motion/react'

type DialTransition = { type: 'spring'; stiffness?: number; damping?: number; mass?: number; visualDuration?: number; bounce?: number } | { type: 'easing'; duration: number; ease: [number, number, number, number] }

/** DialKit's `spring`/`easing` controls resolve to a union; Motion wants `tween` instead of `easing`. */
export function toMotionTransition(value: DialTransition): Transition {
  if (value.type === 'easing') {
    return { type: 'tween', duration: value.duration, ease: value.ease }
  }
  return value
}

/** Rough wall-clock duration (seconds) a spring/easing control will take to settle, for scheduling. */
export function estimateSeconds(value: DialTransition): number {
  return value.type === 'easing' ? value.duration : (value.visualDuration ?? 0.4)
}
