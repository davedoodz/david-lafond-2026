export const CURSOR_PANEL = 'Cursor'

const colorField = (value: string) => ({ type: 'color' as const, default: value })

export const CURSOR_CONFIG = {
  dot: {
    size: [12.5, 4, 24, 0.5] as [number, number, number, number],
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
  /** Over readable text (not links/buttons): the dot morphs into a text caret. */
  text: {
    preset: {
      type: 'select' as const,
      options: ['morph', 'stretch', 'drop', 'fade', 'elastic'],
      default: 'morph',
    },
    durationMs: [260, 0, 900, 10] as [number, number, number, number],
    /** Caret width in px. */
    width: [2, 1, 6, 0.5] as [number, number, number, number],
    /** Caret height as a multiple of the hovered text's font size. */
    height: [1, 0.5, 1.6, 0.05] as [number, number, number, number],
    opacity: [1, 0.1, 1, 0.01] as [number, number, number, number],
    _collapsed: false,
  },
}
