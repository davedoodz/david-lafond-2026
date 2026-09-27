type Easing = { type: 'easing'; duration: number; ease: readonly number[] }
type Spring = { type: 'spring'; stiffness?: number; damping?: number; mass?: number; visualDuration?: number; bounce?: number }

/**
 * DialKit's transition control can be switched between a bezier easing and a
 * spring. CSS animations have no springs, so a spring is simulated once and
 * sampled into a `linear()` easing over its settle time.
 */
export function toCssTiming(value: Easing | Spring): { duration: string; easing: string } {
  if (value.type === 'easing') {
    return { duration: `${value.duration}s`, easing: `cubic-bezier(${value.ease.join(', ')})` }
  }

  let stiffness = value.stiffness ?? 100
  let damping = value.damping ?? 10
  const mass = value.mass ?? 1
  if (value.visualDuration !== undefined) {
    // Same mapping Motion uses for visualDuration/bounce springs.
    const bounce = Math.min(Math.max(value.bounce ?? 0.25, 0), 1)
    stiffness = ((2 * Math.PI) / (value.visualDuration * 1.2)) ** 2
    damping = 2 * (1 - bounce) * Math.sqrt(stiffness)
  }

  const dt = 1 / 240
  const samples: number[] = [0]
  let x = 0
  let v = 0
  let t = 0
  let settledFor = 0
  while (t < 4) {
    v += ((-stiffness * (x - 1) - damping * v) / mass) * dt
    x += v * dt
    t += dt
    samples.push(x)
    settledFor = Math.abs(x - 1) < 0.001 && Math.abs(v) < 0.01 ? settledFor + dt : 0
    if (settledFor > 0.05) break
  }

  const points = 48
  const stops = Array.from({ length: points + 1 }, (_, i) => {
    const sample = samples[Math.round((i / points) * (samples.length - 1))]
    return Number(sample.toFixed(4))
  })
  stops[points] = 1
  return { duration: `${t.toFixed(3)}s`, easing: `linear(${stops.join(', ')})` }
}
