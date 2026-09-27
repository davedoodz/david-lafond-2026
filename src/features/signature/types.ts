/**
 * Recorded-signature data contract, shared by the hero renderer and the dev-only studio.
 *
 * `strokes[].points` are `[x, y, pressure, tMs]`:
 *  - x/y are in the capture box's own coordinate space (`width`/`height`), not screen pixels.
 *  - pressure is 0..1 (real pen pressure, or a flat default for mouse/touch input).
 *  - tMs is milliseconds elapsed since the first point of the very first stroke — a single
 *    global clock, so the gap between two strokes is just the delta between their timestamps.
 */
export type StrokePoint = [x: number, y: number, pressure: number, tMs: number]

export type SignatureStroke = {
  points: StrokePoint[]
  /** True when this stroke was captured with a real pressure-sensitive pointer (Apple Pencil etc.). */
  pen: boolean
}

/** Pen settings active when the signature was captured — informational only; live rendering always
 * uses the current DialKit values (or the frozen tuning.json snapshot in production). */
export type PenSnapshot = {
  size: number
  thinning: number
  smoothing: number
  streamline: number
  taperStart: number
  taperEnd: number
  simulatePressure: boolean
}

export type SignatureData = {
  version: 1
  /** Capture box the strokes were recorded in; the renderer fits this into the layout box,
   * preserving aspect ratio. */
  width: number
  height: number
  pen?: PenSnapshot
  strokes: SignatureStroke[]
}
