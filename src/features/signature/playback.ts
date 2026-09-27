/** Turns recorded strokes + playback dials into a replay timeline, and samples a stroke's
 * points up to a given recorded timestamp (with linear interpolation for a smooth moving tip). */
import type { SignatureStroke, StrokePoint } from './types'

export type TimelineSegment = {
  strokeIndex: number
  /** Playback-space ms (post speed scaling, gaps capped) at which this stroke starts/ends drawing. */
  startMs: number
  endMs: number
}

export type Timeline = {
  totalMs: number
  segments: TimelineSegment[]
}

export function buildTimeline(strokes: SignatureStroke[], speed: number, maxGapMs: number): Timeline {
  const rate = speed > 0 ? speed : 1
  const segments: TimelineSegment[] = []
  let cursor = 0
  let prevRawEnd: number | null = null
  for (let i = 0; i < strokes.length; i++) {
    const points = strokes[i].points
    if (points.length === 0) continue
    const rawStart = points[0][3]
    const rawEnd = points[points.length - 1][3]
    const gap = prevRawEnd === null ? 0 : Math.min((rawStart - prevRawEnd) / rate, maxGapMs)
    cursor += gap
    const startMs = cursor
    cursor += Math.max(rawEnd - rawStart, 0) / rate
    segments.push({ strokeIndex: i, startMs, endMs: cursor })
    prevRawEnd = rawEnd
  }
  return { totalMs: cursor, segments }
}

/** Points of `points` recorded at or before `rawT`, plus one linearly interpolated point
 * exactly at `rawT` so the drawn tip moves smoothly between recorded samples. */
export function samplePrefix(points: StrokePoint[], rawT: number): StrokePoint[] {
  if (points.length === 0) return []
  if (rawT <= points[0][3]) return [points[0]]
  const out: StrokePoint[] = []
  for (let i = 0; i < points.length; i++) {
    const point = points[i]
    if (point[3] <= rawT) {
      out.push(point)
      continue
    }
    const prev = points[i - 1]
    if (prev) {
      const span = point[3] - prev[3] || 1
      const f = (rawT - prev[3]) / span
      out.push([prev[0] + (point[0] - prev[0]) * f, prev[1] + (point[1] - prev[1]) * f, prev[2] + (point[2] - prev[2]) * f, rawT])
    }
    return out
  }
  return out
}
