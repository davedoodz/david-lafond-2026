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
  layout: {
    _collapsed: true,
    desktopWidth: [311, 100, 500, 1],
    desktopHeight: [76, 20, 150, 1],
    mobileWidth: [292, 100, 500, 1],
    mobileHeight: [70, 20, 150, 1],
    offsetX: [-81, -120, 120, 1],
    offsetY: [-6, -60, 150, 1],
  },
  openStudio: { type: 'action', label: 'Open signature studio' },
} satisfies DialConfig
