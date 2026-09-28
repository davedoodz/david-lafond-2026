/** Damped oscillation sampled into a CSS `linear()` easing; `bounce` 0–1 sets the overshoot. Ends exactly at 1. */
export function springEasing(bounce: number) {
  const damping = 9 - 6 * bounce
  const freq = 9 + 6 * bounce
  const points: string[] = []
  for (let i = 0; i <= 40; i++) {
    const t = i / 40
    points.push((i === 40 ? 1 : 1 - Math.exp(-damping * t) * Math.cos(freq * t)).toFixed(4))
  }
  return `linear(${points.join(', ')})`
}
