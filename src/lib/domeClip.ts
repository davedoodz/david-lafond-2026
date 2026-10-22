/**
 * Dome sheet clip shared by Selected works (white sheet) and the About
 * playground (dark sheet). A sheet arrives as a dome (inset sides, arched top)
 * and flattens as it scrolls up; Selected works also domes out at the bottom.
 */
export const DOME_CURVES: Record<string, (x: number) => number> = {
  smooth: (x) => x * x * (3 - 2 * x),
  linear: (x) => x,
  'expo-out': (x) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x)),
  smoother: (x) => x * x * x * (x * (x * 6 - 15) + 10),
}

export type DomeEdge = { radius: number; arch: number }

/**
 * Each edge: corner radius plus an arch (% of viewport height), scaled by `k`
 * (1 = full dome, 0 = flat). With an arch the horizontal radius stays 50% so
 * the corners always meet in one continuous curve (no flat middle).
 */
function edge({ radius, arch }: DomeEdge, k: number, vh: number) {
  const r = radius * k
  return {
    x: arch > 0 ? '50%' : `${r.toFixed(2)}px`,
    y: `${Math.max(r, (arch / 100) * vh * k).toFixed(2)}px`,
  }
}

/** `sidePx` insets both sides; `topK` / `bottomK` are how domed each edge is (0–1). */
export function domeClip(sidePx: number, top: DomeEdge, topK: number, bottom: DomeEdge, bottomK: number, vh: number) {
  const t = edge(top, topK, vh)
  const b = edge(bottom, bottomK, vh)
  return `inset(0 ${sidePx.toFixed(2)}px round ${t.x} ${t.x} ${b.x} ${b.x} / ${t.y} ${t.y} ${b.y} ${b.y})`
}

/**
 * Full-width sheet whose top and bottom edges are circular arcs (a true circle segment, not the
 * ellipse of `domeClip`, whose sides turn vertical and read as stretched). `topSag` / `bottomSag`
 * are each arc's height in px at its middle; 0 is a flat edge. `w` × `h` is the clipped box.
 * A flat bottom edge sits 1px below `h`: callers pass `offsetHeight`, which rounds, and an edge at the
 * rounded height trims up to half a pixel off the box. On About that cut the footer at the page end and
 * showed the light page behind it as a white line on phones.
 */
export function arcClip(w: number, h: number, topSag: number, bottomSag: number) {
  const r = (s: number) => n(((w * w) / 4 + s * s) / (2 * s))
  const n = (v: number) => v.toFixed(2)
  const yb = h - bottomSag
  const top = topSag > 0.5 ? `M0 ${n(topSag)} A${r(topSag)} ${r(topSag)} 0 0 1 ${n(w)} ${n(topSag)}` : `M0 0 L${n(w)} 0`
  const bottom = bottomSag > 0.5 ? `L${n(w)} ${n(yb)} A${r(bottomSag)} ${r(bottomSag)} 0 0 1 0 ${n(yb)}` : `L${n(w)} ${n(h + 1)} L0 ${n(h + 1)}`
  return `path('${top} ${bottom} Z')`
}
