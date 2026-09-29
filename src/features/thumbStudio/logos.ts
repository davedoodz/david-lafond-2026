/**
 * The two marks, rebuilt as plain rectangles in logo units (height = 1, centred on 0,0).
 * Both are split into the same 15 pieces so any piece can travel from one mark to the other.
 *
 * MIT: five 2-unit bars on a (2 + gap) pitch, 9 units tall. M = three bars (the middle one
 * stops 2 units short), i = dot + stem, T = a (4 + gap)-wide top bar over the fifth stem.
 * Pieces of the same bar overlap by a hair so they read as one bar (no anti-alias seam).
 *
 * Harvard GSD H: 1-unit squares on a (1 + gap) pitch; two columns of six, and three
 * crossbar squares centred on the middle gap.
 */
export type Rect = { x: number; y: number; w: number; h: number }

const SEAM = 0.02

/** Splits a rect into n pieces along its long axis, each overlapping the next by SEAM. */
function split(r: Rect, n: number, axis: 'x' | 'y'): Rect[] {
  const len = axis === 'x' ? r.w : r.h
  const step = len / n
  return Array.from({ length: n }, (_, i) => {
    const extra = i < n - 1 ? SEAM : 0
    return axis === 'x'
      ? { x: r.x + i * step, y: r.y, w: step + extra, h: r.h }
      : { x: r.x, y: r.y + i * step, w: r.w, h: step + extra }
  })
}

function normalise(rects: Rect[], width: number, height: number): Rect[] {
  return rects.map((r) => ({
    x: (r.x - width / 2) / height,
    y: (r.y - height / 2) / height,
    w: r.w / height,
    h: r.h / height,
  }))
}

/** 15 pieces, left to right: M (3 + 2 + 3), i (dot + 2), T (bar 2 + stem 2). `gap` in bar-width halves (1 = the real logo). */
export function mitPieces(gap: number): Rect[] {
  const col = (k: number) => k * (2 + gap)
  const H = 9
  const stemTop = 2 + gap
  const rects = [
    ...split({ x: col(0), y: 0, w: 2, h: H }, 3, 'y'),
    ...split({ x: col(1), y: 0, w: 2, h: H - 2 }, 2, 'y'),
    ...split({ x: col(2), y: 0, w: 2, h: H }, 3, 'y'),
    { x: col(3), y: 0, w: 2, h: 2 },
    ...split({ x: col(3), y: stemTop, w: 2, h: H - stemTop }, 2, 'y'),
    ...split({ x: col(4), y: 0, w: 4 + gap, h: 2 }, 2, 'x'),
    ...split({ x: col(4), y: stemTop, w: 2, h: H - stemTop }, 2, 'y'),
  ]
  return normalise(rects, col(4) + 4 + gap, H)
}

/** 15 pieces: left column top to bottom, crossbar left to right, right column top to bottom. `gap` relative to a square. */
export function harvardPieces(gap: number): Rect[] {
  const pitch = 1 + gap
  const height = 6 + 5 * gap
  const width = 5 + 4 * gap
  const rects: Rect[] = []
  for (let r = 0; r < 6; r++) rects.push({ x: 0, y: r * pitch, w: 1, h: 1 })
  for (let c = 1; c <= 3; c++) rects.push({ x: c * pitch, y: 2.5 * pitch, w: 1, h: 1 })
  for (let r = 0; r < 6; r++) rects.push({ x: 4 * pitch, y: r * pitch, w: 1, h: 1 })
  return normalise(rects, width, height)
}
