/** Placement uses one continuous eased trajectory, not separately eased impacts.
 * Animate the mount only; leave hover, zoom and the page engine independent. */
export const BOOK_ENTRANCES = ['place', 'silk', 'float', 'cinematic', 'soft drop', 'corner first', 'slide in', 'none'] as const
export type BookEntranceValues = {
  preset: string; duration: number; strength: number
  bounceHeight: number; bounceTilt: number; settlePercent: number
  lift: number; approachScale: number; tilt: number; revealMs: number; feel: string
}

// Count from the thumbnail click, not the route mount or the end of its slide.
let thumbnailPlacementAt = 0
export function scheduleThumbnailPlacement() {
  thumbnailPlacementAt = performance.now()
}
export const thumbnailPlacementDelay = (delayMs: number) =>
  thumbnailPlacementAt ? Math.max(0, thumbnailPlacementAt + delayMs - performance.now()) : 0

export function playBookEntrance(host: HTMLElement, look: BookEntranceValues, delay = 0): Animation[] {
  if (look.preset === 'none' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return []
  const mount = host.querySelector<HTMLElement>('.book__mount')
  if (!mount) return []
  // Narrow stages need less lift/tilt so the approaching cover stays in view.
  const s = look.strength * Math.min(1, host.clientWidth / 800)
  const presets: Record<string, { x: number; y: number; rx: number; rz: number; scale: number; rebound: number }> = {
    place: { x: 0, y: -1, rx: 1, rz: -3, scale: 1, rebound: 0.35 },
    silk: { x: 0, y: -0.4, rx: 0.3, rz: 0, scale: 0.4, rebound: 0 },
    float: { x: -16, y: -1.4, rx: 0.65, rz: -2, scale: 0.8, rebound: 0.6 },
    cinematic: { x: 0, y: 0.6, rx: -0.7, rz: 0, scale: -0.6, rebound: 0 },
    'soft drop': { x: 0, y: -1.8, rx: 0.4, rz: 2, scale: 1.3, rebound: 1 },
    'corner first': { x: -30, y: -1.2, rx: 1.4, rz: -9, scale: 0.9, rebound: 0.7 },
    'slide in': { x: 100, y: -0.3, rx: 0.2, rz: 7, scale: 0.25, rebound: 0.2 },
  }
  const preset = presets[look.preset] ?? presets.place
  const spread = host.querySelector<HTMLElement>('.book__shift')?.dataset.spread
  const origin = spread === 'front' ? '75% 50%' : spread === 'back' ? '25% 50%' : '50% 50%'
  const easing = {
    fluid: 'cubic-bezier(0.22, 1, 0.36, 1)',
    gentle: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    deliberate: 'cubic-bezier(0.4, 0, 0.2, 1)',
  }[look.feel] ?? 'cubic-bezier(0.22, 1, 0.36, 1)'
  // Sample a continuous path once. The final position AND velocity are zero;
  // rebound blends into the approach rather than restarting easing at contact.
  const frames: Keyframe[] = Array.from({ length: 61 }, (_, i) => {
    const t = i / 60
    const remaining = (1 - t) ** (1.5 + look.settlePercent / 30)
    const rebound = Math.sin(2 * Math.PI * t) * Math.sin(Math.PI * t) ** 2 * preset.rebound
    const x = preset.x * remaining * s
    const y = (preset.y * look.lift * remaining - look.bounceHeight * rebound) * s
    const rx = (preset.rx * look.tilt * remaining + look.bounceTilt * rebound) * s
    const rz = preset.rz * remaining * s
    const scale = 1 + (look.approachScale - 1) * preset.scale * remaining * s
    return {
      offset: t,
      transform: `perspective(1800px) translate(${x}px, ${y}px) rotateX(${rx}deg) rotateZ(${rz}deg) scale(${scale})`,
      transformOrigin: origin,
    }
  })
  const animations = [mount.animate(frames, {
    duration: look.duration, delay, easing, fill: 'backwards',
  })]
  // Fade through the start of the approach instead of exposing the full cover
  // in a single frame after the thumbnail delay. Never outlast the placement.
  const revealDuration = Math.min(look.revealMs, look.duration)
  if (delay > 0 || revealDuration > 0) {
    animations.push(mount.animate([{ opacity: 0 }, { opacity: 1 }], {
      delay, duration: Math.max(1, revealDuration), easing: 'ease-out', fill: 'backwards',
    }))
  }
  return animations
}
