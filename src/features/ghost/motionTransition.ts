import type { Transition } from 'motion/react'
import type { TransitionConfig } from 'dialkit'

/** DialKit's `spring` control resolves to either a spring or an easing curve,
 * depending on which mode the panel is in. Motion's `tween` type takes the
 * same duration/ease shape as DialKit's `easing`, so only the type tag needs
 * translating. */

export function toMotionTransition(config: TransitionConfig): Transition {
  if (config.type === 'easing') return { type: 'tween', duration: config.duration, ease: config.ease }
  return {
    type: 'spring',
    visualDuration: config.visualDuration,
    bounce: config.bounce,
    stiffness: config.stiffness,
    damping: config.damping,
    mass: config.mass,
  }
}
