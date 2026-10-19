/** DialKit config for the 'Signature' panel — shared by the hero and the dev-only studio so
 * pen/playback tuning applies live to both. Must stay a module-level constant. */
import type { DialConfig } from 'dialkit'

export const SIGNATURE_CONFIG = {
  pen: {
    _collapsed: true,
    size: [5.5, 1, 30, 0.5],
    thinning: [0.39, -1, 1, 0.01],
    smoothing: [1, 0, 1, 0.01],
    streamline: [0.64, 0, 1, 0.01],
    taperStart: [0, 0, 150, 1],
    taperEnd: [0, 0, 300, 1],
    color: { type: 'color', default: '#ffffff' },
    opacity: [1, 0, 1, 0.01],
    grain: [0.75, 0, 1, 0.01],
    simulatePressure: true,
  },
  playback: {
    _collapsed: true,
    speed: [2.35, 0.1, 4, 0.05],
    startDelayMs: [250, 0, 2000, 10],
    maxGapMs: [350, 0, 2000, 10],
    replay: { type: 'action', label: 'Replay' },
  },
  /** Size of the drawing box, and its position and scale, separately for desktop and phones (≤ 640px).
      X/Y move it without moving anything around it; scale grows it from the point that sits on the
      hero text's left edge, so the signature stays lined up with the text. */
  layout: {
    _collapsed: true,
    desktopWidth: [311, 100, 500, 1],
    desktopHeight: [76, 20, 150, 1],
    desktopX: [-81, -200, 200, 1],
    desktopY: [-6, -150, 150, 1],
    desktopScale: [1, 0.3, 2, 0.01],
    mobileWidth: [292, 100, 500, 1],
    mobileHeight: [70, 20, 150, 1],
    mobileX: [-81, -200, 200, 1],
    mobileY: [-6, -150, 150, 1],
    mobileScale: [1, 0.3, 2, 0.01],
  },
  openStudio: { type: 'action', label: 'Open signature studio' },
} satisfies DialConfig
