import type { TransitionConfig } from 'dialkit'
import type { Transition } from 'motion/react'

/**
 * DialKit's `spring` type already matches Motion's spring transition shape
 * (`type: 'spring'`, `visualDuration`, `bounce`) and passes through as-is.
 * DialKit's `easing` type must be remapped to Motion's `tween`.
 */
export function toMotionTransition(value: TransitionConfig): Transition {
  if (value.type === 'easing') {
    return { type: 'tween', duration: value.duration, ease: value.ease }
  }
  return value as Transition
}
