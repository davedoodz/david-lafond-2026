/**
 * The system card's tuned surface (fill, gradient, glass), shared so other Unwind
 * panels (the story art cards) wear the exact same glass and follow its dials live.
 * UnwindSystemFigure publishes; readers subscribe with useSystemSurface().
 */
import { useSyncExternalStore, type CSSProperties } from 'react'

export type SystemSurface = {
  fill: string
  gradient: string
  backdrop: string
  edge: string
  glow: string
}

let surface: SystemSurface | null = null
const listeners = new Set<() => void>()

export function publishSystemSurface(next: SystemSurface) {
  if (surface && Object.entries(next).every(([k, v]) => surface![k as keyof SystemSurface] === v)) return
  surface = next
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const get = () => surface

/** CSS variables for a glass panel (`--glass-*`), or undefined until the system card has published. */
export function useSystemSurface(): CSSProperties | undefined {
  const s = useSyncExternalStore(subscribe, get, get)
  if (!s) return undefined
  return {
    '--glass-fill': s.fill,
    '--glass-gradient': s.gradient,
    '--glass-backdrop': s.backdrop,
    '--glass-edge': s.edge,
    '--glass-glow': s.glow,
  } as CSSProperties
}
