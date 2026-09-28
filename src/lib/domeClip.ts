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
