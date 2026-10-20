/**
 * Thumbnail dials shared by the studio page and the live card on the site
 * (DialKit folder "Thumbnail studio"; saved values in tuning.json apply to both).
 */
import { EASES, ORDERS, PRESETS } from './motion'

type Tuple = [number, number, number, number]

export const THUMB_CONFIG = {
  motion: {
    /** Crane variant: how each block is lifted, carried and set down. */
    preset: { type: 'select' as const, options: [...PRESETS], default: 'straight' },
    loopSec: [6, 2, 20, 0.1] as Tuple,
    /** Playback speed on top of the loop length: 2 plays the whole loop twice as fast. */
    speed: [1, 0.25, 4, 0.05] as Tuple,
    /** Share of each half-loop spent holding a finished mark (0..0.45). */
    hold: [0.24, 0, 0.45, 0.01] as Tuple,
    /** 0 = all pieces move together, higher = a longer wave through them. */
    stagger: [0.45, 0, 0.9, 0.01] as Tuple,
    /** Which block the crane moves first. */
    order: { type: 'select' as const, options: [...ORDERS], default: 'course by course' },
    ease: { type: 'select' as const, options: [...EASES], default: 'expo' },
    /** Carry height (logo heights); lanes also uses it as the lane spacing. */
    distance: [0.45, 0, 2, 0.01] as Tuple,
    /** Touchdown squash (settle / release); also the back / spring ease bounce. */
    overshoot: [0.4, 0, 1, 0.01] as Tuple,
    /** Which mark the loop starts on. */
    lead: { type: 'select' as const, options: ['harvard', 'mit'], default: 'harvard' },
  },
  shapes: {
    color: { type: 'color' as const, default: '#FFFFFF' },
    /** Matches the card (Selected works → colors.harvard-mit). */
    background: { type: 'color' as const, default: '#171717' },
    harvardScale: [1, 0.3, 2, 0.01] as Tuple,
    mitScale: [0.72, 0.3, 2, 0.01] as Tuple,
    /** Gap between squares, relative to a square (the GSD mark ≈ 0.23). */
    harvardGap: [0.23, 0, 1, 0.01] as Tuple,
    /** Gap between bars, in half bar widths (the MIT mark = 1). */
    mitGap: [1, 0.2, 3, 0.05] as Tuple,
    /** Corner radius, as a share of each piece's short side. */
    harvardRadius: [0, 0, 0.5, 0.01] as Tuple,
    mitRadius: [0, 0, 0.5, 0.01] as Tuple,
  },
  /** Mark size (share of card height) and position (share of card width/height from centre). */
  desktop: {
    size: [0.42, 0.1, 1, 0.005] as Tuple,
    x: [0, -0.5, 0.5, 0.005] as Tuple,
    y: [-0.06, -0.5, 0.5, 0.005] as Tuple,
    exportWidth: [1734, 600, 3840, 2] as Tuple,
  },
  mobile: {
    size: [0.3, 0.1, 1, 0.005] as Tuple,
    x: [0, -0.5, 0.5, 0.005] as Tuple,
    y: [-0.06, -0.5, 0.5, 0.005] as Tuple,
    exportWidth: [900, 300, 2160, 2] as Tuple,
  },
}
