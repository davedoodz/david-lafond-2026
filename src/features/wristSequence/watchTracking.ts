export type Point = [number, number]
export type Quad = [Point, Point, Point, Point]
export type TrackingKeyframe = { frame: number; corners: Quad; opacity: number }

/** Source pixels (1980×1044), 1-based frames, clockwise TL/TR/BR/BL.
 * Corners describe the rectangular display before its rounded clipping, not the case.
 * Edit these measured seed poses via ?watchTracking=1 and export the refined data.
 */
export const watchTracking: TrackingKeyframe[] = [
  { frame: 1, corners: [[834, 534], [932, 500], [945, 511], [846, 546]], opacity: 0 },
  { frame: 16, corners: [[857, 407], [937, 376], [981, 415], [900, 448]], opacity: 0 },
  { frame: 20, corners: [[871, 375], [972, 344], [1018, 416], [920, 447]], opacity: 1 },
  { frame: 24, corners: [[906, 363], [1007, 339], [1047, 435], [947, 470]], opacity: 1 },
  { frame: 28, corners: [[929, 378], [1047, 351], [1083, 477], [965, 510]], opacity: 1 },
  { frame: 32, corners: [[947, 386], [1073, 362], [1113, 509], [985, 537]], opacity: 1 },
  { frame: 40, corners: [[955, 397], [1088, 375], [1123, 529], [987, 557]], opacity: 1 },
  { frame: 48, corners: [[956, 397], [1089, 376], [1125, 529], [989, 557]], opacity: 1 },
  { frame: 57, corners: [[958, 398], [1091, 376], [1127, 528], [992, 558]], opacity: 1 },
]

export function sampleTracking(keys: TrackingKeyframe[], frame: number) {
  const last = keys[keys.length - 1]
  if (frame <= keys[0].frame) return keys[0]
  if (frame >= last.frame) return last
  const right = keys.findIndex(key => key.frame >= frame)
  const a = keys[right - 1], b = keys[right]
  const t = (frame - a.frame) / (b.frame - a.frame)
  return {
    corners: a.corners.map(([x, y], i) => [x + (b.corners[i][0] - x) * t, y + (b.corners[i][1] - y) * t]) as Quad,
    opacity: a.opacity + (b.opacity - a.opacity) * t,
  }
}

/** Solve the 8 projective coefficients; reject crossed/degenerate display quads. */
export function homography(width: number, height: number, quad: Quad): string | null {
  if (width <= 0 || height <= 0 || quad.flat().some(n => !Number.isFinite(n))) return null
  const crosses = quad.map((p, i) => {
    const q = quad[(i + 1) % 4], r = quad[(i + 2) % 4]
    return (q[0] - p[0]) * (r[1] - q[1]) - (q[1] - p[1]) * (r[0] - q[0])
  })
  if (!crosses.every(c => c > 1e-6)) return null
  const source: Quad = [[0, 0], [width, 0], [width, height], [0, height]]
  const rows = source.flatMap(([x, y], i) => {
    const [u, v] = quad[i]
    return [[x, y, 1, 0, 0, 0, -u * x, -u * y, u], [0, 0, 0, x, y, 1, -v * x, -v * y, v]]
  })
  for (let col = 0; col < 8; col++) {
    let pivot = col
    for (let r = col + 1; r < 8; r++) if (Math.abs(rows[r][col]) > Math.abs(rows[pivot][col])) pivot = r
    if (Math.abs(rows[pivot][col]) < 1e-10) return null
    ;[rows[col], rows[pivot]] = [rows[pivot], rows[col]]
    const divisor = rows[col][col]
    for (let j = col; j <= 8; j++) rows[col][j] /= divisor
    for (let r = 0; r < 8; r++) {
      if (r === col) continue
      const factor = rows[r][col]
      for (let j = col; j <= 8; j++) rows[r][j] -= factor * rows[col][j]
    }
  }
  const [a, b, c, d, e, f, g, h] = rows.map(row => row[8])
  // Scientific notation avoids CSS parsers truncating tiny perspective coefficients.
  return `matrix3d(${[a, d, 0, g, b, e, 0, h, 0, 0, 1, 0, c, f, 0, 1].map(n => n.toExponential(14)).join(',')})`
}
