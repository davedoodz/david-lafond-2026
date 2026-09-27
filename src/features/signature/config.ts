/** DialKit config for the 'Signature' panel — shared by the hero and the dev-only studio so
 * pen/playback tuning applies live to both. Must stay a module-level constant. */
import type { DialConfig } from 'dialkit'

export const SIGNATURE_CONFIG = {
  pen: {
    _collapsed: true,
    size: [7, 1, 30, 0.5],
    thinning: [0.55, -1, 1, 0.01],
    smoothing: [0.45, 0, 1, 0.01],
    streamline: [0.4, 0, 1, 0.01],
    taperStart: [8, 0, 150, 1],
    taperEnd: [60, 0, 300, 1],
    color: { type: 'color', default: '#ffffff' },
    opacity: [1, 0, 1, 0.01],
    grain: [0.12, 0, 1, 0.01],
    simulatePressure: true,
  },
  playback: {
    _collapsed: true,
    speed: [1, 0.1, 4, 0.05],
    startDelayMs: [250, 0, 2000, 10],
    maxGapMs: [350, 0, 2000, 10],
    replay: { type: 'action', label: 'Replay' },
  },
  layout: {
    _collapsed: true,
    desktopWidth: [277, 100, 500, 1],
    desktopHeight: [67, 20, 150, 1],
    mobileWidth: [290, 100, 500, 1],
    mobileHeight: [70, 20, 150, 1],
    offsetX: [-16, -120, 120, 1],
    offsetY: [0, -60, 150, 1],
  },
  openStudio: { type: 'action', label: 'Open signature studio' },
} satisfies DialConfig
