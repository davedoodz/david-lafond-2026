/** Felt-tip outline generation: recorded/live points -> perfect-freehand polygon -> smooth SVG path. */
import { getStroke } from 'perfect-freehand'
import type { StrokePoint } from './types'

export type PenOptions = {
  size: number
  thinning: number
  smoothing: number
  streamline: number
  taperStart: number
  taperEnd: number
  simulatePressure: boolean
}

/** A tap/period — perfect-freehand's outline for near-zero-length input degenerates to a sliver
 * rather than a visible dot, so draw a small filled circle instead. */
function dotPath(points: StrokePoint[], radius: number): string {
  let cx = 0
  let cy = 0
  for (const [x, y] of points) {
    cx += x
    cy += y
  }
  cx /= points.length
  cy /= points.length
  return `M${(cx - radius).toFixed(2)},${cy.toFixed(2)} a${radius.toFixed(2)},${radius.toFixed(2)} 0 1,0 ${(radius * 2).toFixed(2)},0 a${radius.toFixed(2)},${radius.toFixed(2)} 0 1,0 ${(-radius * 2).toFixed(2)},0 Z`
}

/** Classic midpoint-quadratic path builder for perfect-freehand outlines (smooths the polygon
 * into a single continuous curve instead of a faceted line-to-line path). */
function svgPathFromOutline(points: number[][]): string {
  if (points.length < 4) return ''
  let a = points[0]
  let b = points[1]
  const c = points[2]
  let d = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(2)},${b[1].toFixed(2)} ${((b[0] + c[0]) / 2).toFixed(2)},${((b[1] + c[1]) / 2).toFixed(2)} T`
  for (let i = 2, max = points.length - 1; i < max; i++) {
    a = points[i]
    b = points[i + 1]
    d += `${((a[0] + b[0]) / 2).toFixed(2)},${((a[1] + b[1]) / 2).toFixed(2)} `
  }
  return d + 'Z'
}

/** Outline path for one stroke. `isPenInput` true keeps recorded pressure even when the
 * "simulate pressure" dial is on — that toggle only stands in for pointers that never had
 * real pressure to begin with. */
export function strokeOutlinePath(points: StrokePoint[], pen: PenOptions, isPenInput: boolean): string {
  if (points.length === 0) return ''
  const outline = getStroke(
    points.map(([x, y, pressure]) => [x, y, pressure]),
    {
      size: pen.size,
      thinning: pen.thinning,
      smoothing: pen.smoothing,
      streamline: pen.streamline,
      simulatePressure: pen.simulatePressure && !isPenInput,
      start: { taper: pen.taperStart, cap: true },
      end: { taper: pen.taperEnd, cap: true },
    },
  )
  return outline.length < 4 ? dotPath(points, pen.size / 2) : svgPathFromOutline(outline)
}
