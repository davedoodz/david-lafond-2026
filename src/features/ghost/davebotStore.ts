/**
 * Open/closed state shared between `GhostButton` (the nav trigger) and
 * `DavebotLayer` (the palette), which are mounted independently at the app
 * root. A tiny module-level store avoids threading props or context through
 * the integrator's shell for a single boolean.
 */
import { useSyncExternalStore } from 'react'

let open = false
let triggerEl: HTMLElement | null = null
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useDavebotOpen(): boolean {
  return useSyncExternalStore(subscribe, () => open)
}

export function setDavebotTrigger(el: HTMLElement | null) {
  triggerEl = el
}

export function getDavebotTrigger(): HTMLElement | null {
  return triggerEl
}

export function openDavebot() {
  if (open) return
  open = true
  for (const listener of listeners) listener()
}

export function closeDavebot() {
  if (!open) return
  open = false
  for (const listener of listeners) listener()
}

export function toggleDavebot() {
  if (open) closeDavebot()
  else openDavebot()
}
