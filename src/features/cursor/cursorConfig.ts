export const CURSOR_PANEL = 'Cursor'

const colorField = (value: string) => ({ type: 'color' as const, default: value })

export const CURSOR_CONFIG = {
  dot: {
    size: [10, 4, 24, 0.5] as [number, number, number, number],
    pressedScale: [0.55, 0.2, 1, 0.01] as [number, number, number, number],
    smoothing: [0.35, 0, 0.9, 0.01] as [number, number, number, number],
    colorDark: colorField('#f5f5f5'),
    colorLight: colorField('#171717'),
    _collapsed: false,
  },
  hover: {
    scale: [2, 1, 4, 0.05] as [number, number, number, number],
    opacity: [0.5, 0.05, 1, 0.01] as [number, number, number, number],
    durationMs: [220, 0, 800, 10] as [number, number, number, number],
    _collapsed: false,
  },
}
